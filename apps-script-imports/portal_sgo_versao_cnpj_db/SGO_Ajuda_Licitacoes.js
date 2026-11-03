/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, ETAPA 1 (01/11/2026), ETAPA 2 (02/11/2026: arquivos do edital e nota pela IA)
 * E ETAPA 3 (02/11/2026: agenda de prazos, alertas com ciência e escalonamento, regras dos alertas) E ETAPA 4 (02/11/2026: Kanban,
 * Gantt e Painel)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md.
 * Telas: licitacoes (Hoje em Licitações), licitacoes_oportunidades (lista e ficha), licitacoes_agenda (Agenda e prazos),
 * licitacoes_alertas (Central de alertas), licitacoes_portais (Portais e configurações), licitacoes_kanban (Kanban),
 * licitacoes_gantt (Gantt) e licitacoes_painel (Painel). Texto conferido com JS_Licitacoes.html, SGO_Licitacoes.js e SGO_Licitacoes_Config.js e com o coletor
 * do servidor (sgo_servidor/src/servicos/licitacoes). Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_Licitacoes_() {
  var quem = [
    { perfil: "DIRETORIA,ADMIN", pode: "Tudo: ver o radar, enviar para análise, descartar com motivo, reabrir, buscar e abrir os arquivos do edital, pedir e refazer a análise por IA (com motivo), ver a agenda e confirmar datas, receber os alertas de licitação e dar ciência, mudar a etapa no Kanban (com motivo), ver o Gantt e o Painel, mudar as regras dos alertas (com motivo), parametrizar os portais, testar a conexão e ligar o coletor." },
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
          "Ordenar por: prioridade da UF e prazo (padrão), nota (maior primeiro; depois as sem nota; as de descarte, com nota 0 ou abaixo de 30, por último) ou prazo (mais perto primeiro)."
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
          "A aba Análise mostra a nota de 0 a 100, a classe, o resumo, os critérios (capacidade técnica, margem, documentação, localização, prazo, valor e riscos) e quem pontuou cada um: o sistema (dados reais), a IA conferida, ou, na capacidade técnica, a IA classifica cada item e o sistema calcula os pontos. Com documento no cadastro de habilitação, a documentação é do sistema (cadastro de habilitação): atende conta inteiro, a conferir metade, falta e vence antes da sessão zero; com qualquer falta, vencimento ou \"não atende\", ou sem o checklist da leitura, no máximo metade. Fato repetido (mesma fonte e mesmo trecho) aparece uma vez só.",
          "Fatos vêm com o trecho entre aspas e a fonte (arquivo A1, A2... com o nome e o SHA-256, ou o campo do PNCP). Inferências são conclusões a partir dos fatos. Pendências são o que falta conferir para decidir.",
          "Trava encontrada pela IA (por exemplo, exige laboratório acreditado RBC sem aceitar rastreabilidade) não zera a nota sozinha: fica \"trava a confirmar\", com o selo na lista e no Hoje. Leia o trecho e toque em \"Confirmar trava\" (a nota vai a 0) ou \"Não é trava\", com o motivo; a decisão fica no histórico e vale quando a análise for refeita (se o parágrafo do trecho mudar no edital, a trava volta a pedir confirmação). Só o prazo vencido zera direto.",
          "\"Analisar agora\" faz a primeira análise; \"Refazer análise\" pede o motivo (pelo menos 10 letras). Cada análise é uma versão nova: a anterior continua guardada em \"Todas as versões da análise\".",
          "A análise roda sozinha quando chegam arquivos novos ou a fonte muda; se nada mudou, ela não é refeita.",
          "Fila da análise automática: a oportunidade cuja base mudou entra na fila e a aba Análise mostra \"Na fila de análise (posição N de M)\". A rotina analisa até 2 por vez, a UF prioritária (GO, DF, vizinhos e RJ) e o prazo mais próximo primeiro. Se a IA não responder, tenta de novo em 1 hora e depois em 6 horas; na terceira falha aparece \"Análise automática falhou — use Analisar agora\". Sem a chave da IA, a fila fica parada. O Hoje e o Painel mostram quantas estão na fila.",
          "Edital grande: a IA recebe as páginas que mais importam (termo de referência, itens, habilitação, garantia, multa, prazos), até 140 mil caracteres; o que não foi enviado aparece para ela como \"página(s) não enviada(s) à IA\" e vira pendência. O verificador confere contra o texto inteiro."
        ] },
        { titulo: "Leitura do edital (especialista)", itens: [
          "A aba \"Leitura do edital\" tem as palavras-chave da Diretoria (as gerais e as desta oportunidade, em \"Editar as palavras desta oportunidade\"). A busca é do SISTEMA, linha por linha, em todas as páginas de todos os arquivos com texto: cada ocorrência com o arquivo, a página, a linha e a frase; palavra que não aparece mostra \"não encontrada em nenhuma das N páginas\".",
          "\"Ler edital inteiro\": a IA lê o edital INTEIRO, bloco por bloco (sem o corte de 140 mil caracteres da nota), e aponta o que realmente precisamos (habilitação jurídica, fiscal e econômica, qualificação técnica, atestado, equipe, visita técnica, amostra, prazos, garantia, multas, RBC e Inmetro, pagamento, subcontratação, consórcio, registro de preços). Cada item É O TRECHO DO EDITAL, conferido palavra por palavra, com o arquivo, a página e a linha do sistema: a IA só aponta o trecho e o tema, e o sistema mostra a FRASE INTEIRA do edital em volta dele (a exceção que vem depois da vírgula aparece junto), com o pedaço citado marcado. Não há rótulo nem resumo da exigência.",
          "A leitura segue em segundo plano (pode fechar a tela): \"Lendo bloco 7 de 23\" mostra o progresso. A Cobertura diz quantas páginas foram lidas de cada arquivo; bloco não lido aparece com o motivo e o botão \"Ler de novo os blocos não lidos\". Arquivo escaneado (sem texto) e página só com cabeçalho e rodapé (provável imagem) aparecem à parte, para ler à mão; arquivo não lido inteiro deixa a leitura \"com partes não lidas\".",
          "\"O que realmente precisamos\" é montado pelo sistema, por tema, sem trecho repetido e com todas as fontes. Leia a frase: é a exigência do edital, sem paráfrase. Item com negação ou exceção perto (\"não\", \"salvo\", \"podendo\", \"poderá ser substituída\", \"desde que\", \"caso\", \"quando\", \"ou declaração\", \"facultado\"...) vem como \"Pendência\": confirme no edital. Frase que não fala do tema escolhido pela IA vai para \"Tema a confirmar\".",
          "Depois vêm o resumo e a estratégia sugerida (o que fazer primeiro, riscos, documentos a providenciar e perguntas de esclarecimento ao órgão, com o prazo da agenda), sob o título \"Sugestão da IA — confira nos trechos\": cada frase cita os itens e mostra os trechos deles (toque em \"Trechos citados\"). Frase com o sentido contrário ao trecho é retirada e aparece em \"Frases retiradas pelo verificador\". A IA não decide participar nem descartar, não promete RBC e não cita fabricante.",
          "\"Refazer\" pede o motivo; os blocos com o mesmo texto não são lidos de novo, salvo marcando \"Ler de novo também os blocos já lidos\". Arquivos mudaram: \"Ler a versão nova\". Cada leitura é uma versão nova, no histórico."
        ] },
        { titulo: "Preço (simulador)", itens: [
          "A aba Preço simula o preço desta licitação com a tabela de Preços de licitação da Diretoria: os itens do edital (lidos do PNCP quando houver, ou digitados) recebem o serviço da tabela, a quantidade, os pontos (calibração por pontos) e o preço do edital e da proposta.",
          "Em \"Onde é executado\" ficam a UF, o município, o km do trecho (só a ida; o SGO+ sugere pela tabela de distâncias quando conhece), as viagens, a equipe, os dias e as noites, o pedágio e a passagem. RJ e ES saem da equipe do Rio; o resto, da equipe de Goiânia.",
          "\"Calcular\" mostra a conta inteira sem gravar: custo por item, deslocamento diluído no unitário, impostos, piso (sobra mínima de 35%) e alvo (40%), a sobra no preço do edital e na proposta, as premissas e as versões da política usadas. Item abaixo do piso fica em vermelho com o texto \"abaixo do piso\". Item com preço a confirmar (sem piso) não recebe deslocamento nem seguro: o rateio vai só aos itens com piso, com aviso.",
          "Edital que só traz o total do lote: escreva em \"Total do lote no edital\". Abaixo da soma dos pisos, vira pendência.",
          "Cores das faixas do resultado: vermelha só para problema (item abaixo do piso, rateio que não cobre a viagem); verde para informação (por exemplo, \"O total do lote no edital cobre a soma dos pisos\" ou lote só de parceiros). Valores em reais nunca quebram no meio.",
          "\"Salvar simulação\" pede o motivo e grava uma versão nova, que nunca muda. Para corrigir, escolha a versão em \"Ver\", toque em \"Começar uma versão nova a partir desta\" e salve outra. A nota da análise passa a usar a última versão no critério margem depois de \"Refazer análise\". Com muitos itens e pendências, a pendência repetida é gravada numa linha só; se ainda não couber, a mensagem diz o que fazer (resolver as pendências dos itens ou dividir a simulação)."
        ] },
        { titulo: "Habilitação (documentos do edital)", itens: [
          "A aba Habilitação lista cada exigência de habilitação do edital: as do checklist \"O que realmente precisamos\" da Leitura do edital (temas jurídica, fiscal, econômica, técnica, atestados, equipe, RBC e Inmetro, visita) e as exigências de documentação da Análise, com a frase do edital e a página.",
          "Para cada uma, o sistema sugere o documento do cadastro de habilitação pela regra de palavras (não é a IA): \"Atende\", \"Vence antes da sessão\" (a validade acaba antes da data da sessão), \"Falta\" (não há documento em uso, ou está sem arquivo) ou \"A conferir\" (atestado, escopo de acreditação ou do Inmetro, declaração por certame, ou o sistema não reconheceu o documento).",
          "A Diretoria confere e toca em \"Marcar atende\" (escolhendo o documento, se houver) ou \"Marcar não atende\", sempre com o motivo. Cada decisão fica no histórico da exigência; marcar de novo cria outra versão.",
          "Falta, vence antes da sessão e não atende viram pendência no Hoje e no Painel. \"Gerar relação para conferência (A4)\" abre a lista dos documentos desta licitação com a validade e o SHA-256 de cada arquivo; cada relação gerada é uma versão que não muda. Nada é enviado a portal."
        ] },
        { titulo: "Proposta (A4)", itens: [
          "A aba Proposta monta o rascunho da proposta técnica e comercial: itens do edital, serviços do catálogo com a descrição técnica, os pontos ou condições, as normas citadas no catálogo e os entregáveis, os prazos e o pagamento com a frase do edital (leitura) e a planilha de preços, que é sempre a simulação salva da aba Preço, com a versão e o hash. Sem simulação salva não há proposta comercial.",
          "Com a chave da IA, a apresentação e a metodologia são redigidas pela IA e cada frase é conferida nas fontes (número, trecho literal, negação, sem RBC, sem fabricante, sem superlativo). Frase que não passa é retirada e aparece na lista com o motivo. A frase que passa só entra no documento quando a Diretoria marca \"Aceitar\" nela; sem frase aceita (ou sem a IA), vale o texto do catálogo e do edital.",
          "Item do edital fora do catálogo, sem preço da proposta ou fora da simulação sai como \"não cotado\", com o motivo. A proposta sai só com a logomarca oficial: o SGO+ não tem fotos dos serviços.",
          "\"Editar este trecho\" pede o motivo e grava o de → para; texto que o verificador recusa só grava com \"Assumo este texto\" (fica marcado na aprovação), e RBC fora da forma fixa ou acreditação nunca passam. \"Aprovar\" (Diretoria, com motivo) vale para o texto daquele momento: editar depois tira a aprovação. \"Emitir\" congela o documento A4 (guardado com o SHA-256, e o PDF ao lado quando o servidor gera); ele não muda nunca. Para mudar, \"Nova versão\". Nada é enviado a portal."
        ] },
        { titulo: "Disputa (modo assistido)", itens: [
          "A aba Disputa abre a disputa a partir da proposta emitida e da simulação de preço que ela usou: valor inicial de cada item (o da proposta), piso (o da simulação), custo mais os impostos e o intervalo mínimo entre lances. O SGO+ não envia lance nem acessa o portal.",
          "Durante a sessão, digite o melhor lance do concorrente e o nosso lance (o que você deu no portal). O SGO+ mostra a sobra, a distância ao piso e a sugestão do próximo lance (melhor lance menos o intervalo, nunca abaixo do piso; a IA não sugere valor) e recusa lance abaixo do piso, com o porquê.",
          "\"Piso do item\" muda o piso com o motivo (abaixo do custo mais os impostos, só com \"Assumo o prejuízo\"); \"Desistir do item\" e \"Parar sugestões\" ficam no registro. Cada lance e decisão fica gravado para sempre, com a hora de Brasília, quem e o hash.",
          "Depois da sessão, registre o resultado de cada item com a fonte; recurso cria os prazos de razões e contrarrazões na agenda como pendentes de confirmação. \"Concluir o resultado\" leva a licitação para Resultado no Kanban. Mais detalhes na ajuda da Central de disputas."
        ] },
        { titulo: "Contrato", itens: [
          "A aba Contrato registra o contrato a partir do resultado homologado (itens ganhos e valor final vêm da disputa) ou manualmente, com o motivo e a fonte do resultado. Ao gravar, a licitação vai para Contrato no Kanban.",
          "Mudanças são versões novas (correção, termo aditivo, apostilamento, encerramento), com o motivo; o arquivo assinado fica restrito, com o SHA-256. Os prazos do contrato entram na agenda com os alertas da Diretoria.",
          "Cliente, Comercial, Minhas atividades e o planejamento da execução só recebem algo quando você toca no botão e confirma. Mais detalhes na ajuda da tela Contratos."
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
        { situacao: "Aparece \"Trava a confirmar\"", oQueFazer: "A IA achou um impeditivo, mas quem decide é a Diretoria: a nota calculada continua até alguém decidir. Abra a aba Análise, leia o trecho (se houver o aviso de negação ou exceção perto, leia o parágrafo no arquivo) e toque em \"Confirmar trava\" ou \"Não é trava\", com o motivo. Confirmar não descarta: para descartar, use \"Descartar\"." },
        { situacao: "Aparece a pendência \"Confirmar no edital: há negação ou exceção perto do trecho\"", oQueFazer: "A IA achou uma exigência impeditiva (RBC, acreditação, registro, atestado), mas há uma negação ou exceção perto do trecho no edital (\"não\", \"exceto\", \"opcional\", \"subcontratar\"...). Ela não conta como exigência. Abra o arquivo (aba Arquivos), leia o parágrafo e decida." },
        { situacao: "A aba Análise diz \"Na fila de análise (posição N de M)\"", oQueFazer: "Nada a fazer: a rotina analisa sozinha, até 2 por vez, na ordem mostrada. Se tiver pressa, toque em \"Analisar agora\" (roda na hora)." },
        { situacao: "Aparece \"Análise automática falhou — use Analisar agora\"", oQueFazer: "A IA não respondeu em 3 tentativas para esta versão dos arquivos. Toque em \"Analisar agora\" (ou \"Refazer análise\", com o motivo). Quando os arquivos ou a fonte mudarem, a fila tenta de novo sozinha." },
        { situacao: "A última análise foi \"recusada pelo verificador\"", oQueFazer: "Leia a faixa: ela diz o que faltou (em geral, os arquivos do edital ainda não chegaram). A nota anterior continua valendo. Depois que os arquivos chegarem (aba Arquivos), toque em \"Refazer análise\" com o motivo. O detalhe técnico e as respostas da IA ficam em \"Ver o motivo técnico\" e \"Ver respostas da IA\"." },
        { situacao: "Na aba Leitura do edital, um bloco aparece como \"não lido\"", oQueFazer: "A IA não respondeu (tempo, limite ou fora do ar) ou a resposta dela foi recusada pelo verificador 3 vezes (trecho que não está no edital, número trocado). A cobertura mostra as páginas e o motivo. Toque em \"Ler de novo os blocos não lidos\"; se continuar, leia aquelas páginas à mão (aba Arquivos)." },
        { situacao: "A leitura do edital está parada em \"Lendo bloco N de M\"", oQueFazer: "A rotina do servidor continua sozinha a cada minuto. Se não andar, toque em \"Continuar agora\" (lê os próximos blocos na hora)." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Uma licitação pode aparecer duas vezes?", r: "Não. O número de controle do PNCP é a chave; a mesma compra vinda do Compras.gov.br é reconhecida pelo mesmo número." },
        { p: "A regra pode desfazer o que eu decidi?", r: "Não. A regra só muda a situação enquanto ninguém mexeu (no radar, ou descartada pela regra). O que a Diretoria enviou para análise ou descartou com motivo fica como está." },
        { p: "Por que uma licitação travada por RBC aparece?", r: "Para a Diretoria decidir: às vezes o edital aceita calibração rastreável ou subcontratação de laboratório acreditado. A pendência fica escrita no cartão." },
        { p: "A IA pode descartar ou mandar participar?", r: "Não. A IA lê, classifica e aponta fatos, inferências e pendências com a fonte. Descartar, analisar e participar são decisões da Diretoria, registradas com o nome e a data." },
        { p: "Como sei que o fato citado está mesmo no edital?", r: "O verificador procura cada trecho, palavra por palavra e na mesma ordem, no texto inteiro do arquivo citado (sem acento, sem caixa, sem contar quebra de linha e o hífen de fim de linha do PDF). Número vale inteiro, com vírgula, ponto e sinal (1,5% não é 15%; -20 °C não é 20 °C), e trecho que corta uma negação da fonte (\"não será exigida\") é recusado. No texto que foi enviado à IA, vale também (...) entre dois pedaços da mesma frase, a quebra de página no meio da frase e a numeração de cláusula que a IA tirou; o que fica gravado é sempre o texto do edital. Se não achar, a resposta da IA é recusada e refeita com o pedaço mais parecido do edital; o trecho fica na tela com o arquivo e o SHA-256." },
        { p: "Por que a margem vale 5 e a distância vale metade?", r: "A margem vale 5, como pendência, enquanto a oportunidade não tem simulação de preço salva na aba Preço; com a simulação, ela compara o piso por item com o preço de referência do edital (depois de salvar, toque em \"Refazer análise\"). A distância vale metade até a distância rodoviária ser confirmada. São pendências: a nota não finge certeza." }
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
          "Quem recebe: por padrão, Diretoria e Administrador ativos com a área Diretoria no cadastro. Marcando \"Na lista de destinatários\", vale só a lista. Os tetos limitam as mensagens por pessoa em cada alerta (padrão 3) e no dia (padrão 30). O crítico não entra no teto do dia; normal e importante além dele vão num resumo por e-mail e ficam pendentes de ciência.",
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
        { titulo: "Leitura do edital", itens: [
          "Palavras-chave gerais da Diretoria: valem para todas as oportunidades, na aba \"Leitura do edital\" da ficha. Uma por linha; acento e maiúscula não contam; o plural simples entra sozinho; \"*\" no fim procura o começo da palavra (ex.: calibr*). Motivo obrigatório; cada salvamento vira versão nova e, se outra pessoa salvou antes, as duas mudanças são juntadas.",
          "\"Ler sozinho o edital das candidatas\" (desligado no padrão): a rotina do servidor põe na fila a leitura do edital inteiro das candidatas no prazo quando os arquivos chegam ou mudam. Gasta IA em cada uma; com motivo e versão."
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
          "Escolha o período: Hoje, 7 dias, 30 dias ou Tudo. Os filtros escolhem a prioridade, a situação da data, onde é a sessão e o tipo de prazo (a barra \"por tipo\" do Painel já abre com ele).",
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
          "Toque em \"Ciente\" no alerta (aqui, no Hoje, na Agenda ou na aba Prazos da ficha). Também vale o botão \"Confirmar ciência\" do WhatsApp, o link do e-mail ou responder só a palavra CIENTE à mensagem (\"ok\" não vale).",
          "A ciência de um integrante encerra a cobrança daquele alerta para os dois. Ciência não conclui a tarefa: a ação continua no portal e no SGO+.",
          "Mensagem com vários prazos: o link \"Confirmar ciência\" do e-mail, o botão do WhatsApp e a resposta CIENTE valem para todos os prazos daquela mensagem. Aqui na Central, \"Ciente\" vale só para o alerta em que você tocou."
        ] },
        { titulo: "Vários prazos numa mensagem só", itens: [
          "Na mesma rodada, os alertas da mesma licitação para a mesma pessoa saem num e-mail só e numa mensagem só de WhatsApp. O assunto diz quantos são (por exemplo: \"Licitação LIC-2026-0131: 3 prazos nos próximos 7 dias\") e o e-mail começa pelo mais urgente; cada prazo vem com a data e a hora, o limite interno, a natureza, a fonte e a ação.",
          "No WhatsApp, o campo do prazo traz o resumo (\"3 prazos: impugnação, esclarecimento e fim das propostas\"), a data e o tempo do mais próximo; os outros ficam no e-mail e no SGO+.",
          "Cada alerta continua com a sua linha nesta tela, com a situação e o histórico próprios. A mensagem sai no nível do mais grave: com um crítico no grupo, ela sai na hora e fora do teto do dia.",
          "O lembrete sem ciência também é um só por licitação e por pessoa. O teto do dia conta cada mensagem uma vez, com quantos prazos ela tiver; o teto por alerta continua contando cada alerta. Avisos de documento de habilitação continuam um por mensagem."
        ] },
        { titulo: "Entender os estados", itens: [
          "1 Criado, 2 Enviado ao provedor, 3 Aceito pelo provedor, 4 Entregue, 5 Lido, 6 Ciência, 7 Em atendimento (abriu pelo link), 8 Concluído (o prazo passou com ciência), 9 Falha, 10 Escalonado.",
          "Entregue e Lido só aparecem quando a Meta manda o retorno de status. Sem retorno, o último estado garantido é \"Aceito pela Meta\".",
          "Sem ciência no tempo do nível (padrão 60, 15 e 5 minutos; ajustável nas regras), o alerta vai para o outro integrante e é reenviado por outro canal. Os prazos de uma mesma mensagem escalonam juntos, no tempo do mais grave. Falha nos dois canais escalona na hora."
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
        { p: "Por que recebi um e-mail com 3 prazos e não 3 e-mails?", r: "Desde 03/11/2026 os alertas da mesma licitação que vencem na mesma rodada vão juntos, para não encher a caixa com mensagens quase iguais. Nenhum alerta some: cada um tem a sua linha aqui na Central." },
        { p: "O valor estimado vai no WhatsApp?", r: "Não. A mensagem leva o órgão, o processo, o objeto resumido, o prazo, o tempo restante e a ação; o valor fica só no SGO+." }
      ]
    },
    "licitacoes_kanban": {
      titulo: "Kanban das licitações",
      paraQueServe: "Mostra cada licitação numa etapa, do Radar ao Contrato: Radar, Em análise, Decisão, Proposta, Disputa, Resultado e Contrato. Mudar de etapa pede o motivo e fica no histórico com quem e quando.",
      antesDeComecar: [
        "Só as passagens que já existem no SGO+ estão liberadas: Radar para Em análise (enviar para análise), Radar ou Em análise para Decisão (descartar) e Decisão para Radar (reabrir uma descartada).",
        "Proposta aparece vazia e diz em que etapa do módulo chega; Disputa, Resultado e Contrato explicam onde a passagem acontece (aba Disputa e aba Contrato da ficha). \"Participar\" (na coluna Decisão) chega com a etapa de preços e proposta, porque exige o preço mínimo aprovado pela Diretoria.",
        "As descartadas só pela regra do radar não entram no quadro: ficam em Oportunidades › Descartadas (o quadro diz quantas são)."
      ],
      passos: [
        { titulo: "Ler o quadro", itens: [
          "Cada cartão mostra o órgão, o objeto resumido, o código, a cidade e a UF, o fim das propostas com o selo de tempo, a nota da IA com a classe, o responsável e os selos (\"Trava a confirmar\", \"Travada\", \"Suspensa na fonte\").",
          "Borda vermelha: menos de 2 dias para o fim das propostas ou trava a confirmar. Borda amarela: menos de 5 dias ou travada. Borda cinza: descartada pela Diretoria.",
          "No computador, role o quadro para os lados. No celular, toque no nome da etapa (as abas do alto) para ver as licitações dela.",
          "Filtros: UF (ou só a prioridade: GO, DF, vizinhos e RJ), nota, prazo das propostas (7 ou 30 dias por dia de calendário, como a Agenda; encerrado; sem data), responsável, situação (só em andamento esconde as descartadas), análise por IA e busca por órgão, objeto ou número. \"Limpar filtros\" volta ao quadro inteiro."
        ] },
        { titulo: "Mudar de etapa", itens: [
          "No computador, arraste o cartão para a coluna. Em qualquer aparelho, toque em \"Mover para\": a lista mostra todas as etapas, as liberadas com a ação e as travadas com o porquê.",
          "Escreva o motivo (pelo menos 10 letras) e confirme. O histórico da ficha guarda quem, quando, de onde para onde, o motivo e a fonte \"Kanban\".",
          "Soltar numa etapa que ainda não existe abre uma janela com o porquê e \"Nada foi alterado\". Soltar na mesma coluna não faz nada.",
          "\"Abrir ficha\" leva à ficha completa (prazos, arquivos, análise e histórico)."
        ] }
      ],
      cores: [
        { nome: "Borda vermelha", significado: "Menos de 2 dias para o fim das propostas, ou trava a confirmar." },
        { nome: "Borda amarela", significado: "Menos de 5 dias para o fim das propostas, ou travada pela triagem." },
        { nome: "Borda cinza", significado: "Descartada pela Diretoria (coluna Decisão), com o motivo." },
        { nome: "Coluna tracejada", significado: "Etapa futura: o texto diz em que etapa do módulo ela chega." }
      ],
      problemas: [
        { situacao: "Aparece \"alguém mudou agora há pouco\"", oQueFazer: "A oportunidade mudou de situação enquanto o quadro estava aberto (por outra pessoa ou na ficha). Toque em \"Atualizar\" e confira. Nada foi alterado." },
        { situacao: "O botão de uma etapa está apagado", oQueFazer: "Leia o texto logo abaixo dele: diz o que falta ou em que etapa do módulo a passagem chega." },
        { situacao: "Uma oportunidade sumiu do quadro", oQueFazer: "Confira os filtros (a linha \"Filtros ligados\" mostra quantas estão no quadro) ou se ela foi descartada pela regra do radar (Oportunidades › Descartadas)." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Por que a coluna Decisão tem descartadas?", r: "Descartar é a decisão da Diretoria que já existe no SGO+ (com o motivo). \"Participar\" entra na mesma coluna quando a etapa de preços e proposta chegar." },
        { p: "Mover no Kanban é diferente de usar os botões da lista?", r: "Não. É a mesma ação (enviar para análise, descartar, reabrir), com o mesmo histórico. A diferença é que no Kanban o motivo é obrigatório em todas." }
      ]
    },
    "licitacoes_gantt": {
      titulo: "Gantt dos prazos",
      paraQueServe: "Mostra os prazos das licitações no tempo: início e fim das propostas, sessão pública, impugnação, esclarecimento e recurso, com a natureza de cada data e o momento atual marcado.",
      antesDeComecar: [
        "Os prazos vêm da Agenda e prazos (nascem da fonte quando a oportunidade entra no radar). As descartadas não aparecem; as travadas aparecem com a marca \"travada\".",
        "Prazo sem data (pendente de confirmação) não tem lugar no tempo: fica na lista \"prazos sem data\" acima do gráfico até alguém confirmar a data."
      ],
      passos: [
        { titulo: "Ler o Gantt", itens: [
          "Cada linha é uma licitação. A barra azul clara é o recebimento das propostas (do início ao fim). Os símbolos são os prazos: círculo = fim das propostas, quadrado = sessão pública, losango = impugnação, triângulo = esclarecimento, triângulo invertido = recurso, traço = início das propostas.",
          "Natureza: símbolo cheio = Confirmado (veio da fonte ou foi conferido por pessoa); vazado = Calculado pela regra legal; tracejado = Pendente de confirmação. Riscado = suspenso na fonte. Apagado = já passou.",
          "A linha azul escura marca agora. Fim de semana fica cinza claro e feriado nacional, amarelado.",
          "Passe o mouse (ou toque e segure) num símbolo para ver o prazo com dia, hora e fuso. Toque na linha para abrir a ficha na aba Prazos."
        ] },
        { titulo: "Zoom, janela e filtros", itens: [
          "\"Semana\" mostra 9 dias a partir de ontem; \"Mês\", 35 dias a partir de 3 dias atrás. \"Anterior\" e \"Próximo\" andam a janela; \"Hoje\" volta.",
          "Filtros: UF (ou a prioridade), etapa (Radar, só as travadas, Em análise, Decisão) e natureza da data.",
          "No celular, o gráfico vira uma linha do tempo vertical, dia a dia, com a marca \"agora\". No computador, a mesma lista fica em \"Ver os mesmos prazos em lista\"."
        ] }
      ],
      cores: [
        { nome: "Símbolo cheio, vazado ou tracejado", significado: "Confirmado, Calculado (regra legal) ou Pendente de confirmação." },
        { nome: "Vermelho, roxo, laranja, azul, cinza e verde", significado: "Fim das propostas, sessão, impugnação, esclarecimento, recurso e início das propostas." },
        { nome: "Linha azul escura", significado: "Agora (horário de Brasília)." }
      ],
      problemas: [
        { situacao: "Aparece \"Nenhuma licitação com prazo nesta janela\"", oQueFazer: "Mude o zoom para \"Mês\", use \"Próximo\" ou limpe os filtros. Se a Agenda também estiver vazia, o radar ainda não trouxe candidatas." },
        { situacao: "Um prazo calculado está diferente do edital", oQueFazer: "Abra a ficha (toque na linha), aba Prazos, e use \"Confirmar data\" com o que está no edital. A versão nova passa a valer no Gantt e nos alertas." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Por que a hora mostra \"Brasília, presumido\"?", r: "O PNCP não informa o fuso. O SGO+ trata o horário como de Brasília e avisa; em UF com outro fuso, confira no edital." }
      ]
    },
    "licitacoes_painel": {
      titulo: "Painel de Licitações (Dashboard)",
      paraQueServe: "Reúne os indicadores do módulo com números reais: oportunidades por etapa, por UF e por nota, prazos dos próximos 7 e 30 dias, alertas sem ciência, travas a confirmar, saúde do coletor e dos portais e as análises por IA.",
      antesDeComecar: [
        "Tudo é contado na hora em que a tela abre, a partir das abas do módulo (LIC_OPORTUNIDADES, LIC_EVENTOS, LIC_ALERTAS, LIC_ANALISES, LIC_PORTAIS) e do coletor do servidor.",
        "Cada caixa termina com \"Fonte\": de onde vem o número e a regra da contagem. Nos números do alto, passe o mouse para ver a fonte."
      ],
      passos: [
        { titulo: "Ler e abrir", itens: [
          "Toque num número ou numa barra para abrir a lista que o compõe: o Kanban já filtrado (etapa; UF, nota e travas só com as em andamento; situação da análise por IA), Oportunidades › Descartadas só da regra do radar, a Agenda no período (a barra \"por tipo\" abre só aquele tipo de prazo), a Central de alertas em \"Sem ciência\" ou Portais e configurações (a barra de situação abre a lista de portais filtrada por ela).",
          "Os prazos de 7 e 30 dias seguem a mesma regra da Agenda (sem descartadas e sem travadas), por isso o número bate com a lista que abre.",
          "\"Em andamento por UF\" mostra primeiro a prioridade da pontuação: GO e DF, os vizinhos de GO e o RJ (filial), mesmo quando estão em zero.",
          "\"Análises por IA\" conta as oportunidades pela situação da última análise (concluída, recusada pelo verificador ou erro da IA); as tentativas registradas aparecem à parte. O tempo médio vale para as análises feitas desde a etapa 4 (antes a duração não era gravada)."
        ] }
      ],
      cores: [
        { nome: "Número vermelho", significado: "Pede ação: alerta sem ciência, prazo crítico em 7 dias ou portal com falha." },
        { nome: "Número amarelo", significado: "Atenção: trava a confirmar ou prazo pendente de confirmação." },
        { nome: "Barra cinza", significado: "UF fora da prioridade da pontuação." }
      ],
      problemas: [
        { situacao: "A saúde do coletor diz que ele roda só no servidor próprio", oQueFazer: "Neste ambiente não há coleta. No SGO+ do servidor (sgo.metrolabs.com.br) os números do coletor aparecem." },
        { situacao: "O tempo médio da IA aparece \"sem medida ainda\"", oQueFazer: "Nenhuma análise foi feita desde que a duração passou a ser gravada. A próxima análise já entra na conta." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "O painel atualiza sozinho?", r: "Não. Toque em \"Atualizar\" para contar de novo. Nenhuma tela de Licitações redesenha sozinha." }
      ]
    }
  };
}
