/**
 * Ajuda "Como usar esta tela" — grupo Qualificacao (frente B).
 * Telas: Autoclaves, Lavadoras, Cadeia de frio, Estufa/banho-maria/secadora,
 * Relatório QI/QO/QD e Laudo NR-13.
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_AutoRel/LavRel/CadeiaFrioRel/EstufaBanhoRel/
 * DeclaracaoExecQIQO/NR13_ConteudoModulo.js, JS_TemplateAutoclave/Lavadora.html)
 * em 17/10/2026.
 */
function SGO_ajudaTelas_Qualificacao_() {
  var CELULAR_TELA_COMPLETA = "No celular, a tela abre primeiro com uma apresentação curta. Toque em \"Abrir a tela completa\" para usar o formulário. Para enviar arquivo de registrador, prefira o computador.";
  var DETALHES = { nome: "Quadro \"Detalhes técnicos da operação\" (no fim da tela)", significado: "Lista cada ação com a hora. Linha verde: deu certo. Linha amarela: aviso, confira. Linha vermelha: erro, leia a mensagem e corrija." };
  var FAIXA_VERMELHA = { nome: "Faixa vermelha no topo da tela", significado: "Algo falhou. A própria faixa diz o que falhou e o que fazer. Corrija e tente de novo." };

  return {
    // ================================================================
    "autoclave": {
      titulo: "Autoclaves",
      paraQueServe: "Gera o relatório de qualificação térmica de uma autoclave a partir do arquivo do registrador de temperatura e pressão. O sistema calcula o F0 de cada sensor, diz se o ciclo foi aprovado ou reprovado e monta a planilha de dados (A4 deitado, com todas as leituras, gráficos e cálculos) e o relatório de ensaio (A4 em pé).",
      antesDeComecar: [
        "Tenha o arquivo exportado pelo registrador (planilha, CSV ou texto) com as leituras do ciclo.",
        "Saiba quantos sensores foram usados e qual ciclo foi rodado (121 °C, 127 °C, 134 °C ou baixa temperatura).",
        "Cadastre antes o cliente, a unidade e a autoclave (Cadastros: Clientes, depois Unidades, depois Equipamentos). O ensaio começa pela escolha deles; se faltar algum, os botões \"Cadastrar cliente\", \"Cadastrar unidade\" e \"Cadastrar equipamento\" abrem o cadastro em outra aba.",
        "Confira se os registradores usados estão cadastrados e com o certificado em dia em \"Padrões de referência\". O relatório informa o certificado e a validade de cada um.",
        "F0 é a quantidade de esterilização que o ciclo entregou, contada em minutos equivalentes a 121,1 °C. O sistema calcula sozinho; você não faz conta.",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Gerar o relatório de dados (planilha)", itens: [
          "Toque em \"Autoclaves\" no menu.",
          "Toque na aba \"Gerar relatório\".",
          "No quadro \"Cliente e equipamento (do cadastro)\", digite o nome ou o CNPJ do cliente e toque em \"Buscar cliente\". Escolha o cliente, a unidade e a autoclave.",
          "Cliente, CNPJ, endereço, TAG, número de série e local são preenchidos pelo cadastro e ficam travados. Equipamento de outro cliente ou de outra unidade é recusado. Para corrigir um dado, edite o cadastro e escolha o equipamento de novo.",
          "Se aparecer \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\" (ou parte deles), preencha os campos ali mesmo pela placa ou pela etiqueta e toque em \"Gravar no cadastro\". O valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. \"Buscar nos ensaios anteriores\" traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Patrimônio, capacidade, câmaras e ano de fabricação preenchidos no cadastro também saem no relatório de qualificação.",
          "Se algo não aparecer, toque em \"Cadastrar cliente\", \"Cadastrar unidade\" ou \"Cadastrar equipamento\" (abre em outra aba), salve lá, volte para esta aba e toque em \"Atualizar listas\". O que já foi preenchido continua.",
          "Preencha \"Receita / Programa\", \"Tipo de Ensaio\" e \"Ciclo Nº\".",
          "Em \"2. Equipamento\", preencha o lote e o responsável técnico. TAG, número de série, local, fabricante (marca) e modelo vêm do cadastro e saem no documento. O que estiver vazio no cadastro pode ser completado no quadro \"Cliente e equipamento\", em \"Gravar no cadastro\". O campo \"Operador\" já vem com o seu nome.",
          "Em \"3. Parâmetros de processo e norma\", escolha a \"Norma / ciclo alvo\" e a \"Temperatura programada\".",
          "Informe a \"Quantidade de sensores\".",
          "Em \"Sensores considerados na análise\", desmarque só o sensor que falhou durante o ensaio.",
          "Escolha a \"Remoção de ar do ciclo\" que foi usada.",
          "\"Analisar pressão\" vem ligado. Desligue só se não foi possível instalar o transmissor de pressão (autoclave de pequeno porte/cassete) e escreva a justificativa no campo que aparece. O relatório passa a considerar só a temperatura.",
          "Se um sensor ficou junto ao dreno (ponto de referência da câmara), informe o número dele em \"Sensor de referência da câmara\". É opcional.",
          "Em \"4. Dados do registrador\", escolha como os dados chegaram: \"Enviar arquivo ou informar o link\" (um arquivo com todos os sensores) ou \"Um arquivo por sensor (registradores individuais)\".",
          "Arquivo único: toque em \"Escolher arquivo\" e escolha o arquivo do registrador. O link é preenchido sozinho.",
          "Um arquivo por sensor: na grade \"Sensores considerados na análise\" (seção 3), escolha o arquivo de cada sensor marcado. Se a pressão estiver num registrador separado, envie o arquivo dele em \"Arquivo do registrador de pressão\".",
          "Toque em \"Pré-visualizar dados\".",
          "Confira na \"Prévia dos dados lidos\" se as datas, horas e temperaturas estão certas.",
          "Em \"5. Interpretação técnica do ensaio\", preencha \"Nº do ensaio (referência)\" e \"Identificação do registrador\" (TAG do cadastro de padrões, exemplo: DTL-01). Logo abaixo, toque em \"Escolher padrões\" e marque todos os registradores e padrões usados no ensaio (busca por TAG, descrição, fabricante ou certificado; sem limite). A identificação é preenchida sozinha, separada por vírgula, e o relatório traz uma tabela com cada um: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza. A validade de cada um é conferida na data do ensaio. A planilha usa esses dois campos: sem o registrador cadastrado e válido, ela não é gerada.",
          "Toque em \"Gerar relatório de dados (planilha)\".",
          "Responsável técnico: confirme a mensagem de aprovação. A planilha abre em nova aba e fica salva em HTML e PDF na pasta do cliente (subpasta do CNPJ), com o nome \"Planilha de dados Autoclave ...\" e o seu nome como aprovador.",
          "Técnico: a planilha vai para aprovação do responsável técnico. A minuta abre em outra aba com a faixa \"MINUTA PARA CONFERÊNCIA\" (não entregue ao cliente) e o pedido aparece em \"6. Aguardando aprovação\", com a coluna \"Documento\" = \"Planilha de dados\".",
          "Depois de emitida, use os botões \"Abrir PDF da planilha de dados\", \"Abrir pasta do cliente\" e \"Enviar ao cliente\" que aparecem abaixo do botão. Emitir de novo o mesmo número gera a revisão seguinte da planilha; as anteriores continuam na pasta.",
          "Se os dados tiverem problema (sensor com leitura impossível, sensor parado, leitura faltando, registrador sem cadastro ou vencido), a faixa vermelha diz o que corrigir e a planilha não é gerada."
        ] },
        { titulo: "Ler a planilha de dados", itens: [
          "Capa: cliente, equipamento, ciclo, data, responsáveis, registrador com certificado, validade e incerteza, e o resultado do ensaio.",
          "Sumário com o número da página de cada seção.",
          "1. Quadro-resumo: cada critério com o valor medido, o critério de aceitação, a fonte e a situação.",
          "2. Condições do ensaio, escopo, limitações e normas. 3. Resultados por sensor (mínima, máxima, média, desvio-padrão, tempo na faixa, horário em que atingiu a temperatura, F0) e por fase do ciclo.",
          "4. Gráficos: perfil térmico com as fases, detalhe da exposição com a faixa de esterilização, F0 acumulado, pressão e vapor saturado (só com \"Analisar pressão\" ligado) e o mapa do sensor mais frio ao mais quente.",
          "5. Memória de cálculo passo a passo: F0, vapor saturado, tempo de equilíbrio e incerteza. 6. Não conformidades e observações. 7. Assinaturas.",
          "8. Leituras da fase de exposição, folha a folha, com o cabeçalho em todas as folhas. Com mais de 12 sensores, a tabela vem em blocos de sensores. Anexo A: as demais leituras, em formato compacto. Anexo B: alinhamento dos registradores (um arquivo por sensor)."
        ] },
        { titulo: "Gerar o relatório de ensaio (interpretação técnica, A4)", itens: [
          "Gere antes o relatório de dados (tarefa acima) com os mesmos dados.",
          "Em \"5. Interpretação técnica do ensaio\", preencha \"Nº do ensaio (referência)\" e \"Revisão\".",
          "Em \"Identificação do registrador\", digite a TAG do registrador como está no cadastro de padrões (exemplo: DTL-01, DTL-06). Logo abaixo, toque em \"Escolher padrões\" e marque todos os registradores e padrões usados no ensaio (busca por TAG, descrição, fabricante ou certificado; sem limite). A identificação é preenchida sozinha, separada por vírgula, e o relatório traz uma tabela com cada um: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza. A validade de cada um é conferida na data do ensaio.",
          "Se quiser, anexe até 4 fotos com legenda.",
          "Toque em \"Gerar rascunho da interpretação\". Pode levar até um minuto e meio.",
          "Se aparecer a caixa vermelha \"O relatório não pode ser emitido\", leia cada item: o que aconteceu, por quê e como corrigir. Corrija e gere o rascunho de novo. Nada é redigido enquanto houver problema nos dados.",
          "Leia os textos que apareceram em \"Revise os textos antes de confirmar\". Corrija o que precisar. O resultado (aprovado ou reprovado) é o calculado: texto que diga outra coisa é recusado.",
          "Técnico: toque em \"Enviar para aprovação do responsável técnico\". O pedido aparece em \"6. Aguardando aprovação\".",
          "Responsável técnico: marque \"Conferi os dados, os critérios e os textos e aprovo a emissão\" e toque em \"Aprovar e emitir\". Ou, em \"6. Aguardando aprovação\", toque em \"Ver prévia\", confira e toque em \"Aprovar e emitir\" (ou \"Devolver\", com o motivo).",
          "O documento abre em nova aba e fica salvo em HTML e PDF na pasta do cliente, com o nome de quem aprovou. Para enviar ao cliente, use \"Enviar ao cliente\" na faixa verde do documento.",
          "Emitir de novo o mesmo número gera a revisão seguinte (Revisão 1, 2...). As revisões anteriores continuam na pasta."
        ] },
        { titulo: "Gerar a memória de cálculo do F0", itens: [
          "Gere o rascunho da interpretação (tarefa acima).",
          "Toque em \"Gerar a memória do F0\".",
          "O documento mostra, leitura a leitura, a temperatura e o F0 somado de cada sensor. Ele não usa IA e fica salvo na pasta do cliente."
        ] },
        { titulo: "Avaliar um teste de estanqueidade (vazamento da câmara)", itens: [
          "Preencha as seções 1 a 4 como no relatório de dados.",
          "Marque \"Este relatório é um teste de estanqueidade (pressão/vácuo da câmara)\".",
          "Informe o início e o fim do teste e a unidade de pressão do registrador.",
          "Toque em \"Gerar relatório de dados (planilha)\". O sistema calcula a taxa de vazamento em mbar/min e a planilha mostra a conta passo a passo e as leituras da janela do teste. O limite aceito é 1,3 mbar/min, numa janela de pelo menos 10 min.",
          "Se a pressão cair na janela, o sistema avisa: a janela informada não é a fase de espera (câmara isolada). Corrija os horários.",
          "O teste de estanqueidade não aparece com \"Analisar pressão\" desligado."
        ] },
        { titulo: "Fazer o relatório de qualificação (aba \"Relatório oficial\")", itens: [
          "Emita antes, na aba \"Gerar relatório\", o relatório de ensaio de cada ciclo (câmara vazia, com carga e teste de estanqueidade) com o mesmo cliente e equipamento.",
          "Toque na aba \"Relatório oficial\". Em \"Cliente e equipamento\", busque o cliente e escolha a unidade e a autoclave.",
          "Em \"Situação do equipamento\", confira se ele está qualificado, vencendo ou vencido.",
          "Em \"Relatórios de ensaio do equipamento\", marque os relatórios dos ciclos desta qualificação. Revisões substituídas não aparecem para escolha.",
          "Relatório emitido antes do vínculo com o cadastro aparece em \"Relatórios de ensaio sem vínculo\": confira o número e a TAG e toque em \"Vincular a este equipamento\". Só o vínculo é gravado; o documento não muda. Se a TAG do relatório for diferente da do cadastro, marque \"É o mesmo equipamento\" antes.",
          "Em \"Qualificação\", marque as etapas (instalação, operação, desempenho), escolha o motivo, confira a periodicidade da requalificação (padrão 12 meses) e informe quem acompanhou pelo cliente.",
          "Com a instalação marcada, responda cada item da lista (Conforme, Não conforme ou Não aplicável) e a data da verificação. Item não conforme precisa da descrição e reprova a qualificação.",
          "Se houver, registre os indicadores (ensaio de Bowie-Dick, químico, biológico) com o resultado. Indicador não conforme reprova.",
          "Toque em \"Gerar rascunho\". O sistema calcula o resultado: aprovado só se todos os ciclos e verificações atenderem aos critérios. Se aparecer a lista vermelha, cada item diz o que corrigir.",
          "Revise a conclusão e o texto em linguagem simples. Para o assistente redigir a conclusão, marque a opção antes de gerar: o texto é conferido e, se não passar, vale o texto padrão.",
          "Toque em \"Prévia do documento\" para ver a minuta e em \"Enviar para aprovação\". O número (RQA-ano-sequência) é dado no envio.",
          "Responsável técnico: em \"Aguardando aprovação\", toque em \"Prévia\", marque \"Conferi os dados, os critérios e a conclusão e aprovo a emissão\" e toque em \"Aprovar e emitir\"; ou escreva o motivo e toque em \"Devolver ao técnico\".",
          "O relatório fica em HTML e PDF na pasta do equipamento, dentro da pasta do cliente, entra no Arquivo de documentos com a validade e aparece na ficha do equipamento (aba Qualificações) e no QR Code. Use \"Enviar ao cliente\" para mandar por e-mail ou WhatsApp.",
          "Para corrigir um relatório emitido, toque em \"Nova revisão\" em \"Relatórios de qualificação deste equipamento\", ajuste, gere o rascunho, escreva o motivo da revisão e envie. A revisão anterior fica guardada como substituída.",
          "Envio devolvido: toque em \"Abrir para corrigir\", corrija e envie de novo."
        ] },
        { titulo: "Modelo anterior do relatório oficial (Administrador)", itens: [
          "O formulário antigo (campos digitados e resultado escolhido pelo técnico) foi desativado e guardado.",
          "Só o Administrador o reativa, em \"Modelo do relatório (administração)\", no topo da aba \"Relatório oficial\". Para voltar, escolha \"Modelo novo\".",
          "Documentos já emitidos nos dois modelos continuam abrindo na pasta do cliente."
        ] },
        { titulo: "Reabrir documentos e arquivos", itens: [
          "Toque em \"Relatórios emitidos\" para abrir a pasta dos relatórios.",
          "Toque em \"Arquivos dos registradores\" para abrir a pasta com os arquivos enviados."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Último ciclo: aprovado\"", significado: "Todos os critérios foram atendidos. Nos ciclos a vapor, o menor F0 entre os sensores ficou igual ou acima de 15,00 min." },
        { nome: "Selo vermelho \"Último ciclo: reprovado\"", significado: "Algum critério não foi atendido, por exemplo F0 abaixo de 15,00 min ou exposição não identificada. O motivo aparece no relatório e em \"Detalhes técnicos da operação\"." },
        { nome: "Selo vermelho \"Falha na geração\"", significado: "O relatório não foi gerado. Leia a faixa vermelha no topo, corrija e gere de novo." },
        { nome: "Selo verde \"Pronto\"", significado: "A tela está carregada e pronta para uso." },
        { nome: "Selo laranja \"Relatório interno\"", significado: "O modo de dados reconstituídos está ligado. Só o administrador usa. O documento sai com a faixa \"uso interno\" e não vai para a pasta do cliente." },
        { nome: "Observação \"próximo do limite\" no relatório", significado: "O F0 passou do mínimo, mas por menos de 10%. O ciclo é aprovado e o relatório registra a observação." },
        { nome: "Caixa vermelha \"O relatório não pode ser emitido\"", significado: "Os dados têm problema (sensor com leitura impossível, sensor parado, pico na exposição, leitura faltando, poucas leituras, registrador sem cadastro ou vencido). Cada item diz como corrigir." },
        { nome: "Critério \"Não avaliado\" no relatório", significado: "Os dados não permitiram avaliar aquele critério (por exemplo, tempo de equilíbrio com leitura a cada 30 s). Não aprova nem reprova; o motivo está escrito." },
        { nome: "Cores nas leituras da planilha de dados", significado: "Fundo azul: menor temperatura da linha. Fundo laranja: maior temperatura da linha. Número vermelho: leitura do patamar fora da faixa de esterilização. Linha cinza: leitura depois do patamar (descida final), que entra no F0 mas fica fora dos critérios de tempo e de faixa." },
        { nome: "Faixa \"MINUTA PARA CONFERÊNCIA\" na planilha", significado: "A planilha ainda não foi aprovada pelo responsável técnico. Não entregue ao cliente." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "Clico num campo marcado \"do cadastro\" (TAG, número de série, setor) e ele não deixa digitar.", oQueFazer: "Esses dados vêm do cadastro do equipamento. Ao clicar, a tela explica e mostra o botão: \"Escolher o equipamento\" (nenhum escolhido em Cliente e equipamento), \"Preencher no cadastro\" (o dado está vazio no cadastro) ou \"Abrir o cadastro de equipamentos\" (para corrigir um valor já gravado)." },
        { situacao: "Aparece \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\".", oQueFazer: "O relatório usa esses dados e eles estão vazios no cadastro. Preencha no próprio quadro, pela placa ou pela etiqueta, e toque em \"Gravar no cadastro\" (ou use \"Buscar nos ensaios anteriores\" e confira). Só o que está vazio é gravado. Para trocar um valor já gravado, use Cadastros › Equipamentos › Editar." },
        { situacao: "A prévia mostra datas trocadas (dia no lugar do mês).", oQueFazer: "Em \"Formato da data no arquivo\", escolha \"Brasil (DD/MM/AAAA)\" ou \"Americano (MM/DD/AAAA)\" e toque de novo em \"Pré-visualizar dados\"." },
        { situacao: "A prévia mostra as colunas misturadas.", oQueFazer: "Em \"Separador das colunas\", escolha o separador do arquivo (tabulação, ponto e vírgula, vírgula ou espaços) e pré-visualize de novo." },
        { situacao: "Um sensor mostra temperatura absurda (por exemplo, abaixo de zero) no início.", oQueFazer: "É leitura de sensor desconectado. O gráfico já deixa essa leitura de fora da escala e avisa na legenda. Se o sensor falhou o ciclo inteiro, desmarque-o em \"Sensores considerados na análise\" e registre o motivo." },
        { situacao: "Reprovado com \"exposição não identificada\".", oQueFazer: "Algum sensor não chegou à temperatura de exposição. Confira se a \"Temperatura programada\" está certa e se o arquivo é do ciclo certo. Não altere os \"Ajustes avançados da análise\" sem orientação do responsável técnico." },
        { situacao: "O relatório diz que o certificado do registrador está vencido ou que o registrador não está cadastrado.", oQueFazer: "Atualize o padrão em \"Padrões de referência\" e gere de novo. Confira se a TAG em \"Identificação do registrador\" está escrita igual ao cadastro." },
        { situacao: "O rascunho abriu com aviso de que a IA não está disponível ou de que o texto não passou na conferência.", oQueFazer: "O rascunho vem com o texto padrão, montado só com os resultados calculados. Revise, complete se quiser e siga para a aprovação. A chave da IA é configurada pelo administrador em \"Chaves e senhas\"." },
        { situacao: "Ao emitir, aparece \"Os textos revisados não podem ser emitidos\".", oQueFazer: "O texto diz um resultado diferente do calculado, cita norma fora da lista ou cita pressão num ensaio só de temperatura. Corrija o trecho indicado e emita de novo." },
        { situacao: "Um arquivo por sensor: aviso de leitura faltando na exposição.", oQueFazer: "O arquivo daquele sensor não cobre todo o ciclo ou o relógio do registrador estava fora de hora. Confira o arquivo; se o sensor falhou, desmarque-o e registre a falha." },
        { situacao: "Aviso \"Pressão incompatível com a temperatura\".", oQueFazer: "A coluna de pressão provavelmente está em bar relativo, kPa ou mbar. O ciclo usa bar absoluto: converta a coluna e envie de novo." },
        { situacao: "A planilha de dados não gera e diz que o registrador não foi informado ou não está no cadastro.", oQueFazer: "Preencha \"Identificação do registrador\" na seção 5 com a TAG do cadastro de padrões e gere de novo. Se o certificado venceu, atualize em \"Padrões de referência\"." },
        { situacao: "A planilha não abriu em outra aba.", oQueFazer: "O navegador bloqueou a nova aba. Permita janelas do SGO+ no navegador e gere de novo; a planilha emitida também fica na pasta do cliente (botão \"Abrir PDF da planilha de dados\")." },
        { situacao: "Apareceu a janela \"Tela sem uso\".", oQueFazer: "Toque em \"Continuar\". O que você preencheu continua na tela." },
        { situacao: "Aparece \"Escolha o cliente, a unidade e o equipamento\" ao gerar.", oQueFazer: "Escolha os três no quadro \"Cliente e equipamento (do cadastro)\", no início da tela. Se faltar cadastro, use os botões de cadastrar (abrem em outra aba) e depois \"Atualizar listas\"." },
        { situacao: "Aparece que o equipamento pertence a outro cliente ou está em outra unidade.", oQueFazer: "Escolha o equipamento na lista do cliente certo. Se o cadastro estiver errado, a gestão corrige em Cadastros › Vínculos." },
        { situacao: "Relatório oficial: \"foi emitido sem o registro dos dados\" ou \"os dados mudaram desde a aprovação\".", oQueFazer: "Emita de novo o relatório daquele ciclo na aba \"Gerar relatório\" (sai uma nova revisão) e marque a revisão nova." },
        { situacao: "Relatório oficial: \"a qualificação de desempenho foi marcada, mas nenhum relatório escolhido é de ciclo com carga\".", oQueFazer: "Marque o relatório do ciclo com carga (tipo de ensaio QD) ou desmarque a etapa de desempenho." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar planilha, rascunho do relatório de ensaio, memória do F0 e rascunho do relatório de qualificação (aba Relatório oficial)." },
        { perfil: "ADMIN", pode: "Escolher o modelo do relatório oficial (novo, padrão, ou anterior, desativado)." },
        { perfil: "ADMIN,DIRETORIA,GESTOR,METROLOGIA", pode: "Aprovar e emitir o relatório de ensaio e a planilha de dados (responsável técnico), ver a prévia dos pedidos e devolver com o motivo." },
        { perfil: "TECNICO", pode: "Envia o relatório de ensaio e a planilha de dados para aprovação do responsável técnico." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (dados reconstituídos, com senha administrativa)." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "A tela abre, mas a emissão é tarefa da equipe técnica." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Recebe o relatório pela Metrolabs ou consulta em \"Arquivo de documentos\"." }
      ],
      perguntas: [
        { p: "Qual a diferença entre o relatório de dados e o relatório de ensaio?", r: "O relatório de dados é a planilha de dados (A4 deitado) com todas as leituras, estatísticas, gráficos e a memória de cálculo. O relatório de ensaio (interpretação técnica) é o documento A4 em pé para o cliente, com identificação, critérios, resultados, análise, conclusão e assinaturas. Os números dos dois são os mesmos; gere sempre os dois com os mesmos dados e o mesmo número." },
        { p: "E a planilha antiga do Google Planilhas?", r: "Foi guardada sem mudança e está desligada. Só o responsável pelo sistema pode voltar a usá-la, em \"Chaves e senhas\", grupo \"Relatórios técnicos\", item \"Autoclave: modelo da planilha de dados\". Planilhas já emitidas no modelo antigo continuam na pasta do cliente como estão." },
        { p: "Existe \"aprovado com alerta\"?", r: "Não. Abaixo do mínimo da norma o ciclo é reprovado. Acima do mínimo, mas perto dele, o ciclo é aprovado e o relatório registra a observação \"próximo do limite\"." },
        { p: "Numa campanha com vários ciclos, como faço?", r: "Gere uma planilha e uma interpretação para cada ciclo, mudando o \"Ciclo Nº\" e o \"Nº do ensaio (referência)\". Depois, na aba \"Relatório oficial\", consolide os relatórios de ensaio no relatório de qualificação do equipamento." },
        { p: "Onde o cliente vê o relatório?", r: "No Arquivo de documentos, na ficha do equipamento (aba Qualificações) e na seção Qualificação do QR Code da etiqueta. Só aparecem documentos emitidos e aprovados; o cliente vê apenas os equipamentos dele." },
        { p: "Os ciclos de baixa temperatura usam F0?", r: "Não. Nos ciclos de 55 °C e 60 °C o resultado é avaliado pela temperatura na faixa do ciclo. O F0 vale para os ciclos a vapor de 121 °C, 127 °C e 134 °C." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "Registrador (datalogger): aparelho que grava a temperatura e a pressão de cada sensor ao longo do ciclo.",
          "Exposição: parte do ciclo em que a câmara fica na temperatura de esterilização. O sistema identifica o início e o fim sozinho.",
          "F0: quantidade de esterilização entregue, em minutos equivalentes a 121,1 °C. Cada leitura soma uma parcela; quanto mais quente, maior a parcela. O mínimo exigido nos ciclos a vapor é 15,00 min no pior sensor.",
          "Teste de estanqueidade: verifica se a câmara segura o vácuo. O resultado é a taxa de vazamento, em mbar por minuto.",
          "QI, QO e QD: qualificação de instalação (o local e as ligações estão certos), de operação (o equipamento funciona vazio como especificado) e de desempenho (o equipamento entrega o resultado com carga)."
        ] }
      ]
    },

    // ================================================================
    "lavadora": {
      titulo: "Lavadoras",
      paraQueServe: "Qualificação térmica de termodesinfectoras e lavadoras ultrassônicas. A partir do arquivo do registrador, o sistema identifica as fases do ciclo, calcula o A0 de cada sensor (termodesinfectora) ou o tempo e a temperatura do banho (ultrassônica), confere os dados e gera a planilha de dados, o relatório de ensaio e, na aba \"Relatório oficial\", o relatório de qualificação do equipamento, sempre com a aprovação do responsável técnico.",
      antesDeComecar: [
        "O cliente, a unidade e a lavadora precisam estar no cadastro. Se faltar, use os atalhos \"Cadastrar cliente\", \"Cadastrar unidade\" e \"Cadastrar equipamento\" do quadro \"Cliente e equipamento\".",
        "Tenha o arquivo exportado pelo registrador (um arquivo com todos os sensores ou um arquivo por sensor).",
        "Saiba a temperatura programada da receita e, na termodesinfectora, se o artigo processado é crítico ou semicrítico/não crítico. Isso muda o mínimo de A0.",
        "A0 é a quantidade de desinfecção térmica que o ciclo entregou, contada em segundos equivalentes a 80 °C. O sistema calcula sozinho, a partir de 65 °C.",
        "Confira se os registradores usados estão com o certificado em dia em \"Padrões de referência\".",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Gerar a planilha de dados", itens: [
          "Toque em \"Lavadoras\" no menu e na aba \"Gerar relatório\".",
          "Em \"Cliente e equipamento (do cadastro)\", busque o cliente, escolha a unidade e a lavadora. Cliente, CNPJ, endereço, TAG, número de série e local ficam travados.",
          "Se aparecer \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\" (ou parte deles), preencha os campos ali mesmo pela placa ou pela etiqueta e toque em \"Gravar no cadastro\". O valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. \"Buscar nos ensaios anteriores\" traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Patrimônio, capacidade, câmaras e ano de fabricação preenchidos no cadastro também saem no relatório de qualificação.",
          "Em \"1. Cliente e ensaio\" e \"2. Equipamento\", preencha programa, tipo de ensaio, número do ciclo, lote e responsável técnico.",
          "Em \"3. Parâmetros de processo e receita\", confira o \"Equipamento a validar\", escolha a classificação do artigo (termodesinfectora) e informe a \"Temperatura programada (°C)\", que é obrigatória.",
          "Em \"Sensores considerados na análise\", desmarque só o sensor que falhou e registre a falha.",
          "Deixe \"Analisar pressão (aspersão ou bomba)\" desligado, a menos que o registrador tenha gravado a pressão.",
          "Em \"4. Dados do registrador\", envie o arquivo ou, em \"Um arquivo por sensor\", um arquivo para cada sensor.",
          "Toque em \"Pré-visualizar dados\" e confira as leituras.",
          "Em \"5.\", informe o número do ensaio e a \"Identificação do registrador\" (a TAG do cadastro de padrões). Logo abaixo, toque em \"Escolher padrões\" e marque todos os registradores e padrões usados no ensaio (busca por TAG, descrição, fabricante ou certificado; sem limite). A identificação é preenchida sozinha, separada por vírgula, e o relatório traz uma tabela com cada um: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza. A validade de cada um é conferida na data do ensaio.",
          "Toque em \"Gerar planilha de dados\". Responsável técnico: confirme e a planilha é emitida na pasta do equipamento. Técnico: a minuta abre em outra aba e a planilha vai para \"6. Aguardando aprovação\"."
        ] },
        { titulo: "Gerar o relatório de ensaio (A4)", itens: [
          "Com os mesmos dados, toque em \"Gerar rascunho da interpretação\".",
          "Se aparecer a lista vermelha de problemas dos dados, corrija o que ela diz e gere de novo: nada é redigido com dado ruim.",
          "Revise os textos. O resultado é o calculado; texto que contradiga o resultado é recusado.",
          "Técnico: toque em \"Enviar para aprovação do responsável técnico\".",
          "Responsável técnico: marque \"Conferi os dados, os critérios e os textos e aprovo a emissão\" e toque em \"Aprovar e emitir\". O documento abre em nova aba e fica na pasta do equipamento.",
          "Em \"6. Aguardando aprovação\", o responsável técnico usa \"Ver prévia\", \"Aprovar e emitir\" ou \"Devolver\" com o motivo."
        ] },
        { titulo: "Gerar o relatório de qualificação (aba \"Relatório oficial\")", itens: [
          "Toque na aba \"Relatório oficial\" e escolha cliente, unidade e lavadora.",
          "Marque os relatórios de ensaio emitidos que fundamentam a qualificação.",
          "Marque as etapas (instalação, operação, desempenho), o motivo e a periodicidade; responda a lista da instalação e, se houver, os ensaios complementares.",
          "Toque em \"Gerar rascunho\", revise a conclusão, veja a \"Prévia do documento\" e toque em \"Enviar para aprovação\".",
          "O responsável técnico confere a prévia em \"Aguardando aprovação\", marca a confirmação e toca em \"Aprovar e emitir\". O relatório entra na ficha do equipamento, no QR code e no Arquivo de documentos com o vencimento da requalificação."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Último ciclo: aprovado\"", significado: "Todos os critérios decisivos foram atendidos." },
        { nome: "Selo vermelho \"Último ciclo: reprovado\"", significado: "Algum critério decisivo não foi atendido. Exemplo: A0 de 2.400 s num artigo crítico, que exige 3.000 s." },
        { nome: "\"Informativo\" e \"Fora da referência (não decide)\"", significado: "Critério medido e registrado, que não aprova nem reprova (por exemplo, pré-lavagem, uniformidade, aquecimento)." },
        { nome: "Faixa \"MINUTA PARA CONFERÊNCIA\"", significado: "Documento ainda sem a aprovação do responsável técnico. Não entregue ao cliente." },
        { nome: "Selo laranja \"Relatório interno\"", significado: "Modo de dados reconstituídos, só do administrador. Não vai para a pasta do cliente." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "Clico num campo marcado \"do cadastro\" (TAG, número de série, setor) e ele não deixa digitar.", oQueFazer: "Esses dados vêm do cadastro do equipamento. Ao clicar, a tela explica e mostra o botão: \"Escolher o equipamento\" (nenhum escolhido em Cliente e equipamento), \"Preencher no cadastro\" (o dado está vazio no cadastro) ou \"Abrir o cadastro de equipamentos\" (para corrigir um valor já gravado)." },
        { situacao: "Aparece \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\".", oQueFazer: "O relatório usa esses dados e eles estão vazios no cadastro. Preencha no próprio quadro, pela placa ou pela etiqueta, e toque em \"Gravar no cadastro\" (ou use \"Buscar nos ensaios anteriores\" e confira). Só o que está vazio é gravado. Para trocar um valor já gravado, use Cadastros › Equipamentos › Editar." },
        { situacao: "Aparece \"Informe a temperatura programada do ciclo\".", oQueFazer: "Preencha \"Temperatura programada (°C)\" com a temperatura da receita no equipamento e gere de novo." },
        { situacao: "Aparece \"Escolha o cliente, a unidade e o equipamento\".", oQueFazer: "Use o quadro \"Cliente e equipamento (do cadastro)\" no início da tela. Se o equipamento não aparece, cadastre pelos atalhos (abre em outra aba) e toque em \"Atualizar listas\"." },
        { situacao: "O rascunho mostrou a lista de problemas dos dados.", oQueFazer: "Cada item diz o que aconteceu, por quê e como corrigir. Sensor que falhou: desmarque e registre a falha. Arquivo incompleto: exporte de novo do registrador." },
        { situacao: "Não sei qual classificação escolher.", oQueFazer: "Artigo crítico entra em tecido estéril ou na corrente sanguínea (A0 de 3.000 s). Semicrítico ou não crítico toca mucosa ou pele (A0 de 600 s). Na dúvida, pergunte ao responsável técnico do cliente." },
        { situacao: "A prévia mostra datas trocadas.", oQueFazer: "Em \"Padrão de Data\", escolha \"Brasil (DD/MM/AAAA)\" ou \"USA (MM/DD/AAAA)\" e pré-visualize de novo." },
        { situacao: "O rascunho abriu com aviso de que o texto automático não passou na conferência.", oQueFazer: "Revise o texto padrão, que usa só os resultados calculados, e siga com a emissão ou o envio." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,METROLOGIA", pode: "Gerar e emitir (responsável técnico): aprova planilhas, relatórios de ensaio e relatórios de qualificação." },
        { perfil: "TECNICO", pode: "Gerar e enviar para aprovação; corrigir o que foi devolvido." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" e escolhe o modelo do relatório oficial." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela; vê os relatórios de qualificação emitidos na ficha do equipamento e no QR code." }
      ],
      perguntas: [
        { p: "O A0 é calculado em todo o ciclo?", r: "Não. Só na fase de desinfecção: do aquecimento, a partir de 65 °C, até o fim do patamar. A descida e a secagem com ar quente não entram (resultado conservador)." },
        { p: "Existe \"aprovado com alerta\"?", r: "Não. Critério decisivo não atendido reprova; critério informativo fora da referência vira observação." },
        { p: "A lavadora ultrassônica tem a cavitação medida?", r: "Não. O registrador mede a temperatura do banho (tempo no patamar e tolerância de ±3 °C). A cavitação é verificada por teste próprio, que pode ser registrado no relatório oficial." },
        { p: "Como as fases são identificadas?", r: "Pelo perfil da temperatura média: cada queda brusca (água nova) abre uma etapa. Só a fase de desinfecção (ou do banho) decide; as demais têm horário estimado." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "A0: quantidade de desinfecção térmica entregue, em segundos equivalentes a 80 °C, somada pela regra dos trapézios com o intervalo real entre leituras, só a partir de 65 °C.",
          "Mínimo de A0: 600 s para artigo semicrítico ou não crítico; 3.000 s para artigo crítico (decisão de 17/10/2026, com base no conceito de A0 da ABNT NBR ISO 15883-1; valores para o responsável técnico confirmar).",
          "Critério decisivo: aprova ou reprova. Critério informativo: é medido e registrado, sem decidir.",
          "Patamar do banho (ultrassônica): trecho com todos os sensores na temperatura programada, dentro de ±3 °C."
        ] },
        { titulo: "Documentos", paragrafos: [
          "Planilha de dados (A4 paisagem), relatório de ensaio de ciclo (A4 retrato) e relatório de qualificação do equipamento (aba \"Relatório oficial\"). Todos ficam na pasta do equipamento, dentro da pasta do cliente, com revisões. Os modelos antigos foram guardados e estão desligados; documentos antigos continuam abrindo."
        ] }
      ]
    },

    // ================================================================
    "cadeia_frio": {
      titulo: "Cadeia de frio",
      paraQueServe: "Faz a qualificação térmica de refrigeradores, câmaras de conservação, câmaras frias, freezers, ultrafreezers e caixas térmicas (ABNT NBR 16328:2024, Anexo G). O sistema lê o arquivo do registrador, calcula cada estudo, impede o documento quando os dados têm problema e gera, com a aprovação do responsável técnico, a planilha de dados, o relatório de ensaio e o relatório de qualificação do equipamento.",
      antesDeComecar: [
        "O cliente, a unidade e o equipamento precisam estar no cadastro (Cadastros: Clientes, Unidades e Equipamentos).",
        "Tenha o arquivo do registrador com todo o período gravado (normalmente 24 horas ou mais).",
        "Anote os horários de início e fim de cada estudo feito: distribuição, abertura de porta, queda de energia ou autonomia.",
        "Confira se o registrador está cadastrado em \"Padrões de referência\", com o certificado de calibração e a validade.",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Escolher o cliente e o equipamento", itens: [
          "Toque em \"Cadeia de frio\" no menu.",
          "Em \"1. Cliente e equipamento\", busque o cliente pelo nome ou CNPJ e escolha a unidade e o equipamento.",
          "Cliente, CNPJ, endereço, TAG, número de série e local vêm do cadastro e ficam travados. Se faltar algo, use \"Cadastrar cliente\", \"Cadastrar unidade\" ou \"Cadastrar equipamento\" (abre em outra aba) e depois \"Atualizar listas\".",
          "Se aparecer \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\" (ou parte deles), preencha os campos ali mesmo pela placa ou pela etiqueta e toque em \"Gravar no cadastro\". O valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. \"Buscar nos ensaios anteriores\" traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Patrimônio, capacidade, câmaras e ano de fabricação preenchidos no cadastro também saem no relatório de qualificação.",
          "Preencha \"Técnico executor do ensaio\".",
          "Em \"2. Equipamento\", escolha o \"Perfil do equipamento\". A tela muda conforme o perfil.",
          "Informe o volume e marque \"Equipamento conjugado\" só se for um aparelho com duas partes (por exemplo, refrigerador com freezer).",
          "Confira a faixa mínima, a faixa máxima e a tolerância."
        ] },
        { titulo: "Marcar os estudos feitos", itens: [
          "Em \"3. Estudos do ensaio\", em \"Incluir estudo de distribuição?\", escolha \"Sim — em vazio\" ou \"Sim — com carga\" e digite início e fim (dd/MM/aaaa HH:mm:ss).",
          "Se o equipamento começou fora da faixa, toque em \"Detectar rampa automaticamente\" e confirme o horário sugerido.",
          "Abertura de porta e queda de energia: marque o estudo, informe o horário do evento e o \"Tempo-alvo mínimo\". Sem tempo-alvo, o estudo só registra os tempos.",
          "Na caixa térmica, marque a autonomia, informe o período gravado e, se houver, a \"Autonomia mínima exigida\".",
          "Em \"Grandezas e estudos não realizados\", diga se a umidade foi medida e, para o que não foi feito, escreva o motivo. Sem o motivo, o relatório não é emitido.",
          "Em \"Sensores\", desmarque só o sensor que falhou e escreva o motivo em \"Justificativa dos sensores desconsiderados\"."
        ] },
        { titulo: "Enviar os dados", itens: [
          "Em \"4. Dados do registrador\", digite a \"Identificação do registrador\" como está no cadastro de padrões (exemplo: DTL-04). Logo abaixo, toque em \"Escolher padrões\" e marque todos os registradores e padrões usados no ensaio (busca por TAG, descrição, fabricante ou certificado; sem limite). A identificação é preenchida sozinha, separada por vírgula, e o relatório traz uma tabela com cada um: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza. A validade de cada um é conferida na data do ensaio.",
          "Confira o \"Formato de data nos arquivos\" e, em \"Como enviar os dados\", escolha o arquivo do registrador ou \"Um arquivo por sensor\".",
          "Toque em \"Pré-visualizar dados\" e confira o período importado e os sensores.",
          "Arquivo com uma aba por estudo (24 horas, abertura de porta, queda de energia) é aceito: a prévia mostra o período de cada aba e cada estudo usa a aba que contém o seu horário. Abas com o mesmo horário são recusadas.",
          "A tela confere os dados enquanto você preenche: cada problema aparece em vermelho ao lado do campo e no quadro \"Conferência dos dados\", acima do resultado, antes de gerar.",
          "Horário do evento entre duas leituras usa a leitura mais próxima. Horário colado da planilha (data e hora em colunas separadas) é aceito."
        ] },
        { titulo: "Relatório de ensaio (seção 6)", itens: [
          "Preencha o \"Número do relatório\". A revisão seguinte é atribuída sozinha quando o mesmo número é emitido de novo.",
          "Se quiser, anexe até 4 fotos.",
          "Toque em \"Gerar rascunho\". Se aparecer a lista \"O documento não pode ser emitido\", corrija cada item (a lista diz o que fazer) e gere de novo.",
          "Leia a análise de cada estudo e as duas conclusões. O texto é conferido: número, norma ou resultado diferente do calculado é recusado.",
          "Técnico: toque em \"Enviar para aprovação\"; a minuta abre em outra aba.",
          "Responsável técnico: marque \"Conferi os dados, os critérios e os textos e aprovo a emissão\" e toque em \"Emitir relatório\".",
          "O documento fica salvo em HTML e PDF na pasta do equipamento, dentro da pasta do cliente. Use \"Enviar ao cliente\" para mandar o PDF."
        ] },
        { titulo: "Planilha de dados (seção 5)", itens: [
          "Com o mesmo número do relatório, toque em \"Gerar planilha de dados\" (A4 deitado, com leituras, cálculos e gráficos).",
          "O responsável técnico marca a confirmação e emite; o técnico envia para aprovação e recebe a minuta."
        ] },
        { titulo: "Aprovar (seção 7)", itens: [
          "O responsável técnico toca em \"Atualizar a lista\", abre a \"Prévia\", e toca em \"Aprovar e emitir\" ou em \"Devolver\" (com o motivo).",
          "O técnico vê na mesma lista o envio devolvido e o motivo."
        ] },
        { titulo: "Relatório de qualificação do equipamento (seção 8)", itens: [
          "Toque em \"Carregar o equipamento escolhido\".",
          "Marque as etapas (instalação, operação, desempenho), o motivo e a periodicidade.",
          "Marque os relatórios de ensaio emitidos que entram na qualificação e responda a lista da instalação.",
          "Toque em \"Gerar rascunho\", revise a conclusão e toque em \"Enviar para aprovação\".",
          "O responsável técnico aprova na lista do próprio quadro. A validade passa a aparecer na ficha do equipamento, no QR code e nas pendências de requalificação."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"APROVADO\"", significado: "Os estudos com critério atenderam aos critérios. Saída da faixa dentro da tolerância aparece em Observações; não existe \"aprovado com alerta\"." },
        { nome: "Selo vermelho \"REPROVADO\"", significado: "Saiu da faixa além da tolerância, ou saiu antes do tempo-alvo de porta, energia ou autonomia. Avise o responsável técnico." },
        { nome: "Selo cinza \"INFORMATIVO\"", significado: "Estudo sem critério de aprovação (porta ou energia sem tempo-alvo, autonomia sem mínimo). Só registra os tempos e não aprova nem reprova os outros estudos." },
        { nome: "\"Desvio do método\"", significado: "O ensaio não seguiu a forma do Anexo G (por exemplo, menos de 24 h, intervalo de leitura maior que 60 s ou 10 s, menos sensores que o mínimo). Fica registrado no documento e não muda o resultado." },
        { nome: "Lista \"O documento não pode ser emitido\"", significado: "Os dados têm problema (leitura impossível, sensor parado, lacuna, registrador sem calibração, evento começando fora da faixa, falta de justificativa). Corrija e gere de novo." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "Clico num campo marcado \"do cadastro\" (TAG, número de série, setor) e ele não deixa digitar.", oQueFazer: "Esses dados vêm do cadastro do equipamento. Ao clicar, a tela explica e mostra o botão: \"Escolher o equipamento\" (nenhum escolhido em Cliente e equipamento), \"Preencher no cadastro\" (o dado está vazio no cadastro) ou \"Abrir o cadastro de equipamentos\" (para corrigir um valor já gravado)." },
        { situacao: "Aparece \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\".", oQueFazer: "O relatório usa esses dados e eles estão vazios no cadastro. Preencha no próprio quadro, pela placa ou pela etiqueta, e toque em \"Gravar no cadastro\" (ou use \"Buscar nos ensaios anteriores\" e confira). Só o que está vazio é gravado. Para trocar um valor já gravado, use Cadastros › Equipamentos › Editar." },
        { situacao: "Aparece \"Escolha o cliente, a unidade e o equipamento\".", oQueFazer: "O documento só sai com o equipamento do cadastro. Escolha no quadro \"1. Cliente e equipamento\"." },
        { situacao: "\"O registrador não está no cadastro de padrões\" ou \"estava vencido\".", oQueFazer: "Corrija a identificação na seção 4 ou, se o certificado foi renovado antes do ensaio, no menu Calibração › Padrões de referência procure o registrador, toque em Editar e atualize o número do certificado, a validade e o PDF. Registrador vencido na data do ensaio exige repetir o ensaio." },
        { situacao: "\"O início do evento informado não está dentro das leituras do arquivo\".", oQueFazer: "A mensagem mostra o período importado (de cada aba, se o arquivo tiver várias) e a leitura mais próxima do horário digitado. Corrija o horário na seção 3 ou envie na seção 4 o arquivo que contém o evento (o estudo pode estar numa aba própria do mesmo arquivo)." },
        { situacao: "\"No início do evento havia sensor fora da faixa\".", oQueFazer: "O estudo de porta ou energia precisa começar com todos os sensores na faixa. Marque o início num horário em que todos já estavam na faixa (veja a prévia) ou repita o estudo." },
        { situacao: "\"Os dados mudaram desde o rascunho\".", oQueFazer: "Algo mudou no formulário ou no cadastro depois do rascunho. Toque em \"Gerar rascunho\" de novo." },
        { situacao: "O período importado está com dia e mês trocados.", oQueFazer: "Em \"Formato de data nos arquivos\", escolha o formato do registrador e pré-visualize de novo." },
        { situacao: "Cada sensor gravou um arquivo separado.", oQueFazer: "Em \"Como enviar os dados\", escolha \"Um arquivo por sensor (registrador individual)\". Cada sensor marcado ganha um campo de envio." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,METROLOGIA", pode: "Gerar, emitir e aprovar (responsável técnico)." },
        { perfil: "TECNICO", pode: "Gerar o rascunho e enviar para aprovação." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (dados reconstituídos, com senha administrativa) e pode religar os modelos anteriores dos documentos." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela; vê o relatório de qualificação emitido na ficha do equipamento e no QR code." }
      ],
      perguntas: [
        { p: "Quantos sensores preciso?", r: "A regra mantida pela empresa é 12 a partir de 60 L, 3 abaixo de 60 L e 12 no equipamento conjugado. Abaixo disso aparece \"Desvio do método\" no documento, sem reprovar." },
        { p: "O que é a rampa de estabilização?", r: "É o tempo inicial em que o equipamento ainda está esfriando. As leituras dessa fase aparecem no gráfico e nas leituras, mas não contam para o resultado." },
        { p: "O que é a MKT?", r: "A temperatura cinética média resume o efeito das temperaturas registradas sobre os produtos. É informativa, sem critério de aprovação." },
        { p: "Quais normas os documentos citam?", r: "A ABNT NBR 16328:2024 (Anexo G) e a RDC nº 430/2020 da Anvisa; na câmara de conservação de imunobiológicos, também o Manual de Rede de Frio do Ministério da Saúde." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "Faixa operacional: temperaturas mínima e máxima aceitas para o equipamento.",
          "Tolerância: margem declarada em volta da faixa. Uma saída dentro dela vira observação, não reprovação.",
          "Tempo-alvo mínimo: tempo que o equipamento precisa aguentar dentro da faixa depois de abrir a porta ou faltar energia. Sem esse valor, o estudo só registra os tempos.",
          "Autonomia: quanto tempo a caixa térmica mantém 2 °C a 8 °C sem energia.",
          "Desvio do método: o ensaio não seguiu a forma do Anexo G (duração, intervalo de leitura, quantidade de sensores, monitoramento depois do evento). Fica registrado e não muda o resultado."
        ] }
      ]
    },

    // ================================================================
    "estufa_banhomaria": {
      titulo: "Estufa, banho-maria e secadora",
      paraQueServe: "Faz a qualificação térmica de estufas de incubação, banhos-maria, estufas de esterilização ou despirogenização e secadoras de traqueias (ABNT NBR 16328). O ensaio começa pelo cadastro do equipamento; o sistema lê o arquivo do registrador, calcula cada estudo, mostra o que corrigir quando o dado tem problema e gera a planilha de dados, o relatório de ensaio e o relatório de qualificação do equipamento, emitidos com a aprovação do responsável técnico.",
      antesDeComecar: [
        "Confira se o cliente, a unidade e o equipamento estão no cadastro (se faltar, os atalhos da tela abrem o cadastro em outra aba).",
        "Confira se o registrador está em Cadastros › Padrões de referência, com o certificado de calibração, a validade e a incerteza.",
        "Tenha o arquivo do registrador com todo o período gravado e os horários de início e fim de cada estudo e de cada repetição.",
        "Tenha o protocolo do ensaio do cliente: faixa de aceitação, temperatura programada e os limites que ele define.",
        "Na estufa de esterilização ou despirogenização, tenha o resultado do indicador biológico ou do ensaio de endotoxina de cada repetição e o registro impresso do ciclo.",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Escolher o cliente e o equipamento", itens: [
          "Toque em \"Estufa, banho-maria e secadora\" no menu.",
          "Em \"Cliente e equipamento (do cadastro)\", busque o cliente pelo nome ou CNPJ e escolha a unidade e o equipamento.",
          "Cliente, CNPJ, endereço, TAG, número de série e local são preenchidos pelo cadastro e ficam travados. Se algo estiver errado, corrija o cadastro.",
          "Se aparecer \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\" (ou parte deles), preencha os campos ali mesmo pela placa ou pela etiqueta e toque em \"Gravar no cadastro\". O valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. \"Buscar nos ensaios anteriores\" traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Patrimônio, capacidade, câmaras e ano de fabricação preenchidos no cadastro também saem no relatório de qualificação.",
          "Preencha \"Responsável técnico (assinatura do laudo)\" com o nome do técnico que executou o ensaio."
        ] },
        { titulo: "Perfil, faixa e critérios", itens: [
          "Em \"2. Equipamento\", escolha o \"Perfil do equipamento\" e informe a faixa de aceitação do protocolo (na secadora, a temperatura de trabalho e a tolerância).",
          "Em \"Critérios e grandezas do ensaio\", informe a temperatura programada e os limites que o protocolo define (uniformidade, estabilidade, desvio, recuperação). O que ficar em branco sai como informativo.",
          "Informe a resolução do registrador.",
          "Umidade relativa: marque \"Avaliar a umidade relativa\" se ela faz parte do ensaio. Se o equipamento controla umidade ou o arquivo tem a coluna e ela não for avaliada, escreva o motivo.",
          "Se a duração ou o intervalo de registro forem diferentes da referência por decisão do protocolo do cliente, escreva a justificativa em \"Justificativa de desvio do protocolo\"."
        ] },
        { titulo: "Estudos, sensores e dados do registrador", itens: [
          "Em \"3. Estudos do ensaio\", inclua só os estudos realmente feitos, com início e fim (e as repetições na estufa de esterilização ou despirogenização).",
          "Em \"Sensores\", marque os sensores usados. O mínimo do anexo da norma é conferido na emissão.",
          "Em \"4. Dados do registrador\", envie o arquivo, confira o formato de data e toque em \"Pré-visualizar dados\"."
        ] },
        { titulo: "Planilha de dados (seção 5)", itens: [
          "Preencha \"Identificação do registrador\" como está no cadastro de padrões (ex.: DTL-01). Logo abaixo, toque em \"Escolher padrões\" e marque todos os registradores e padrões usados no ensaio (busca por TAG, descrição, fabricante ou certificado; sem limite). A identificação é preenchida sozinha, separada por vírgula, e o relatório traz uma tabela com cada um: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza. A validade de cada um é conferida na data do ensaio. Se quiser, preencha também o responsável pelo aceite e a tarefa de origem. O número do relatório é atribuído na emissão.",
          "Toque em \"Gerar a planilha de dados\". Se houver problema nos dados, aparece a lista com o que aconteceu, o porquê e como corrigir, e nada é gerado.",
          "Sem problema, a minuta abre em outra aba. O técnico toca em \"Enviar a planilha para aprovação\"; o responsável técnico marca a confirmação e gera de novo para emitir."
        ] },
        { titulo: "Relatório de ensaio (seção 6)", itens: [
          "Toque em \"Gerar rascunho\": aparecem o resultado, a tabela de critérios e os textos (análise de cada estudo e as duas conclusões).",
          "Leia e corrija os textos. O resultado é o calculado: texto que contradiz o resultado, cita número que não existe ou cita cláusula de norma é recusado.",
          "Toque em \"Ver a prévia\" para conferir o documento.",
          "Técnico: toque em \"Enviar para aprovação\". Responsável técnico: marque a confirmação e toque em \"Emitir o relatório\".",
          "Emitido, o relatório fica em HTML e PDF na pasta do equipamento, dentro da pasta do cliente, com os botões do PDF, da pasta e \"Enviar ao cliente\"."
        ] },
        { titulo: "Aprovação (seção 7)", itens: [
          "O responsável técnico abre a prévia, toca em \"Aprovar e emitir\" ou em \"Devolver\" com o motivo.",
          "Quem enviou vê aqui o motivo da devolução, corrige e envia de novo."
        ] },
        { titulo: "Relatório de qualificação do equipamento (seção 8)", itens: [
          "Marque as etapas (instalação, operação, desempenho), escolha o motivo e a periodicidade da requalificação.",
          "Marque os relatórios de ensaio emitidos que fundamentam a qualificação e, na instalação, responda cada item da lista.",
          "Toque em \"Gerar rascunho\", revise a conclusão, veja a prévia e envie para aprovação.",
          "Emitido, o relatório aparece na ficha do equipamento e no QR code, e a próxima requalificação entra nas pendências."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"RESULTADO: APROVADO\"", significado: "Todos os critérios avaliados foram atendidos." },
        { nome: "Selo vermelho \"RESULTADO: REPROVADO\"", significado: "Algum critério não foi atendido (uma não conformidade reprova). A tabela mostra qual. Avise o responsável técnico." },
        { nome: "Selo cinza \"RESULTADO: INFORMATIVO\"", significado: "Nenhum critério com limite foi avaliado (por exemplo, só estudos sem limite no protocolo)." },
        { nome: "Quadro vermelho \"O documento não pode ser gerado\"", significado: "Problema nos dados (registrador, sensores, leitura, duração, intervalo, umidade). Cada item diz como corrigir." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "Clico num campo marcado \"do cadastro\" (TAG, número de série, setor) e ele não deixa digitar.", oQueFazer: "Esses dados vêm do cadastro do equipamento. Ao clicar, a tela explica e mostra o botão: \"Escolher o equipamento\" (nenhum escolhido em Cliente e equipamento), \"Preencher no cadastro\" (o dado está vazio no cadastro) ou \"Abrir o cadastro de equipamentos\" (para corrigir um valor já gravado)." },
        { situacao: "Aparece \"Falta no cadastro do equipamento: TAG, Nº de série, Setor\".", oQueFazer: "O relatório usa esses dados e eles estão vazios no cadastro. Preencha no próprio quadro, pela placa ou pela etiqueta, e toque em \"Gravar no cadastro\" (ou use \"Buscar nos ensaios anteriores\" e confira). Só o que está vazio é gravado. Para trocar um valor já gravado, use Cadastros › Equipamentos › Editar." },
        { situacao: "Apareceu \"O registrador não está no cadastro de padrões\" ou \"vencido\".", oQueFazer: "Digite a identificação como está em Cadastros › Padrões de referência. Se o certificado foi renovado antes do ensaio, atualize a validade lá; se não, o ensaio precisa ser repetido com registrador calibrado." },
        { situacao: "Apareceu \"duração menor que 24 h\" ou \"intervalo de registro maior\".", oQueFazer: "Ajuste o período do estudo. Se o protocolo do cliente define outra duração ou outro intervalo, escreva a justificativa em \"Justificativa de desvio do protocolo\"." },
        { situacao: "Apareceu \"sensor parado\", \"pico\" ou \"leitura impossível\".", oQueFazer: "Confira o sensor no arquivo. Se ele falhou, desmarque-o em Sensores (fica registrado no documento) ou repita o ensaio." },
        { situacao: "A repetição tem FH ou FD acima do mínimo, mas saiu reprovada.", oQueFazer: "O resultado do laboratório (indicador biológico ou endotoxina) também é critério. Se o laboratório reprovou, a repetição é reprovada." },
        { situacao: "Mudei dados depois de gerar o rascunho.", oQueFazer: "Gere o rascunho de novo antes de emitir ou enviar: o sistema recusa texto feito sobre dados diferentes." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Preparar a planilha de dados, o relatório de ensaio e o relatório de qualificação e enviar para aprovação." },
        { perfil: "ADMIN,DIRETORIA,GESTOR,METROLOGIA", pode: "Aprovar e emitir (responsável técnico) e devolver com o motivo." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (dados reconstituídos, com senha administrativa)." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Vê os relatórios emitidos na ficha do equipamento e no QR code." }
      ],
      perguntas: [
        { p: "Por que um limite em branco não reprova?", r: "Uniformidade, estabilidade, desvio e recuperação só têm limite quando o protocolo do cliente define. Sem limite, o valor medido aparece no documento como informativo." },
        { p: "Existe aprovado com observação?", r: "Não. Uma leitura fora da faixa de aceitação reprova o estudo. Valores perto do limite continuam aprovados e podem ser comentados na análise." },
        { p: "O que são FH e FD?", r: "FH é o efeito esterilizante do calor seco, em minutos equivalentes. FD é o mesmo para a destruição de endotoxinas (despirogenização). Em branco, vale o mínimo da configuração (30 min), que o protocolo do cliente pode mudar." }
      ],
      secoesManual: [
        { titulo: "Perfis e estudos", paragrafos: [
          "Estufa de incubação (Anexo F): distribuição de temperatura por 24 horas a partir da estabilização, abertura de porta e queda de energia.",
          "Banho-maria (Anexo I): distribuição de temperatura pelo tempo do protocolo, com registro do uso de tampa e da quantidade de líquido.",
          "Estufa de esterilização ou despirogenização (Anexo E): distribuição em vazio e penetração com carga, cada uma com 3 repetições.",
          "Secadora de traqueias da CME: três estudos em vazio e três com carga; a faixa é a temperatura de trabalho ± a tolerância do protocolo."
        ] },
        { titulo: "Documentos", paragrafos: [
          "Planilha de dados (A4 deitado): critérios, resultados por sensor, gráficos, memória de cálculo e as leituras.",
          "Relatório de ensaio (A4 em pé): identificação, instrumentos e incerteza, critérios com a fonte, resultados, análise e conclusão.",
          "Relatório de qualificação do equipamento: junta os relatórios de ensaio emitidos e a verificação da instalação, com a data da próxima requalificação."
        ] }
      ]
    },

    // ================================================================
    "declaracao_qiqo": {
      titulo: "Relatório QI/QO/QD",
      paraQueServe: "Gera o relatório de qualificação de instalação (QI), de operação (QO) e de desempenho (QD) de um equipamento, com texto redigido pela IA a partir dos itens que você marcou, das fotos e dos certificados anexados.",
      antesDeComecar: [
        "QI confere se o local e as ligações estão certos (energia, água, dreno, espaço). QO confere se o equipamento funciona como especificado (ciclos, travas, alarmes). QD usa os certificados de calibração dos instrumentos do equipamento.",
        "Tenha o CNPJ do cliente e os dados do equipamento.",
        "Tenha as fotos e, se houver, os certificados de calibração dos instrumentos (PDF ou imagem)."
      ],
      passos: [
        { titulo: "Gerar o relatório", itens: [
          "Toque em \"Relatório QI/QO/QD\" no menu.",
          "Opcional: no quadro \"Buscar no cadastro\", acima de \"1. Cliente\", busque o cliente (nome ou CNPJ), escolha a unidade e o equipamento. Cliente, CNPJ, endereço, TAG, modelo e localização (unidade e setor) entram nos campos vazios; o que você digitou não muda. Desde 22/10/2026 o fabricante (marca) também vem do cadastro, e o nº de série do cadastro sai no documento. No quadro \"Padrões de referência utilizados (opcional)\", logo abaixo, toque em \"Escolher padrões\" e marque todos os padrões usados no serviço (sem limite): o documento traz uma tabela com cada um, e padrão vencido na data do serviço impede a geração, com a explicação.", "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Em \"2. Equipamento\", escolha o equipamento e preencha TAG, marca, modelo, localização, datas e técnico.",
          "Marque \"Realizado no laboratório da Metrolabs\" só se o equipamento foi levado ao laboratório.",
          "Em \"3. Qualificação de Instalação / Operação (QI/QO)\", marque os itens verificados no atendimento.",
          "Anexe as fotos de QI e de QO (até 6 de cada). A legenda é opcional.",
          "Na parte de QD, anexe o certificado de cada instrumento que tiver.",
          "Toque em \"Gerar Relatório de QI/QO com IA\".",
          "Em \"3.1 Revise os textos do QI/QO antes de confirmar\", leia e corrija objetivo, QI, QO, QD e conclusão.",
          "Toque em \"Confirmar e Gerar Relatório de QI/QO\".",
          "O documento abre em nova aba e é salvo sozinho na pasta do cliente. Espere a mensagem \"Salvo na pasta do cliente\"."
        ] },
        { titulo: "Reabrir um relatório já gerado", itens: [
          "Em \"Documentos já gerados\", digite o cliente, a TAG ou o nome do arquivo.",
          "Toque em \"Buscar\".",
          "Abra o documento na lista."
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "No fim da tela, em \"Documentos gerados: corrigir ou usar como base\", busque pelo número, cliente ou TAG.",
          "Na linha do documento, toque em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, textos, anexos e leituras), sem importar nada de novo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "Altere só o que precisa e toque em \"Confirmar e Gerar Relatório de QI/QO\". Sai a revisão seguinte (Rev. 01, 02...) com o mesmo número; o motivo, a data e o seu nome entram no histórico de revisões do documento.",
          "A revisão anterior continua guardada na pasta do cliente, com a revisão no nome do arquivo, e passa a constar como \"Substituído pela Rev. NN\" na lista.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma lista, toque em \"Usar como base\" (por exemplo, o mesmo equipamento no ano seguinte).",
          "O formulário volta preenchido. Confira datas, leituras e resultados, que são do serviço anterior.",
          "Toque em \"Confirmar e Gerar Relatório de QI/QO\": sai um documento novo, com número novo. O documento de origem não muda."
        ] }
      ],
      cores: [
        { nome: "Aviso acima dos campos de revisão", significado: "A IA não respondeu. Os campos vêm com texto padrão completo. Revise e confirme." },
        { nome: "Botão \"Tentar salvar de novo\"", significado: "O documento foi gerado, mas não chegou à pasta do cliente. Toque para salvar outra vez." },
        { nome: "Quadro no alto do relatório", significado: "Cinza: \"Executado sem achado técnico registrado\". Laranja: \"Executado com achado técnico registrado\"; o achado aparece ao lado do item, na tabela da etapa. Não é aprovação nem reprovação." },
        FAIXA_VERMELHA
      ],
      problemas: [
        { situacao: "Apareceu \"Tentar salvar de novo\".", oQueFazer: "Toque no botão. Se falhar de novo, confira a internet e avise o administrador." },
        { situacao: "Não tenho o certificado de algum instrumento.", oQueFazer: "Deixe o campo em branco. Na tabela de certificados do relatório, o instrumento aparece como \"Não anexado nesta visita\"." },
        { situacao: "A nova aba não abriu.", oQueFazer: "Libere janelas novas (pop-up) para o endereço do SGO+ e gere de novo." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Confirmar e Gerar Relatório de QI/QO\"." },
        { situacao: "Apareceu \"O número ... já é de um documento gerado\".", oQueFazer: "Para corrigir aquele documento, use \"Abrir para corrigir\" na lista de documentos gerados. Para um documento novo, apague o número ou use outro." },
        { situacao: "O documento não aparece na lista para corrigir.", oQueFazer: "Documentos gerados antes de 21/10/2026 não guardaram os dados do formulário e não entram nessa lista. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar e consultar relatórios." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Só consultam. O servidor recusa a geração e explica o motivo." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O relatório aprova ou reprova o equipamento?", r: "Não. Ele registra o que foi verificado e as evidências. A conclusão não faz juízo de conformidade." },
        { p: "Como o relatório é organizado?", r: "Em seções numeradas: identificação, introdução, objetivo, QI, QO, QD, referências normativas e conclusão com as assinaturas. Os itens verificados de cada etapa ficam numa tabela, e os certificados numa tabela que diz qual foi anexado. Acima de 3 páginas, o relatório ganha sumário." },
        { p: "Onde o relatório fica salvo?", r: "Na pasta do cliente, numa subpasta com o CNPJ (14 dígitos), com o nome \"Relatorio de qualificacao - número - TAG - data e hora\", em PDF e em HTML." }
      ]
    },

    // ================================================================
    "nr13": {
      titulo: "Laudo NR-13",
      paraQueServe: "Monta o laudo de inspeção de vasos de pressão conforme a NR-13. O sistema calcula a categoria do vaso, sugere a data da próxima inspeção e gera o laudo em A4 com o parecer do profissional legalmente habilitado.",
      antesDeComecar: [
        "Tenha os dados da plaqueta do vaso: PMTA, volume, ano de fabricação, fluido e código de construção. Ano de fabricação e capacidade gravados no cadastro do equipamento entram sozinhos.",
        "PMTA é a pressão máxima de trabalho admissível: a maior pressão em que o vaso pode operar com segurança, informada pelo fabricante.",
        "Tenha os dados das válvulas de segurança e dos manômetros inspecionados.",
        "Tenha as fotos do exame e, se houve, os dados do teste hidrostático.",
        "O laudo é assinado pelo Profissional Legalmente Habilitado (PLH)."
      ],
      passos: [
        { titulo: "Preencher e emitir o laudo", itens: [
          "Toque em \"Laudo NR-13\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar / Selecionar Cliente\".",
          "Se o cliente não existir, confira os dados que vieram da consulta e toque em \"Cadastrar Cliente\".",
          "Em \"2. Equipamento (vaso de pressão)\", escolha o vaso em \"Equipamento já cadastrado\" e toque em \"Usar este equipamento\".",
          "Se o vaso não estiver na lista, toque em \"+ Cadastrar equipamento novo\", preencha e toque em \"Cadastrar equipamento\".",
          "Em \"3. Dados técnicos do vaso\", escolha o \"Tipo de vaso\" e copie os valores da plaqueta, cada um com a sua unidade. Ano de fabricação e volume já vêm do cadastro do equipamento quando estão preenchidos lá e o campo está vazio (o volume só quando a capacidade do cadastro tem a unidade, L ou m³); confira com a plaqueta. A localização do laudo é a unidade e o setor do cadastro.",
          "Escolha a \"Classe do fluido\". A categoria do vaso aparece sozinha.",
          "Em \"4. Dados da inspeção\", escolha o tipo de inspeção e as datas. A próxima inspeção vem com 1 ano; mude se precisar.",
          "Escolha o PLH responsável.",
          "Toque em \"+ Adicionar válvula de segurança\" e em \"+ Adicionar manômetro\" para cada item inspecionado.",
          "Em \"5. Teste hidrostático (TH)\", responda se foi feito e preencha pressões e tempos.",
          "Em \"6. Registro fotográfico\", anexe as fotos, descreva cada uma e toque em \"Interpretar com IA\".",
          "Em \"7.\", escreva a descrição, o resultado e as recomendações. Use \"Revisar texto (IA)\" se quiser melhorar a redação.",
          "Em \"8. Veredito e parecer conclusivo\", escolha \"Aprovado\", \"Aprovado com Ressalvas\" ou \"Reprovado\".",
          "Escreva o parecer ou toque em \"Sugerir parecer com IA\" e revise.",
          "Em \"9. Salvar / Emitir\", toque em \"Salvar rascunho\" para guardar sem emitir.",
          "Quando estiver tudo conferido, toque em \"Emitir laudo final\"."
        ] },
        { titulo: "Continuar um rascunho ou reabrir um laudo", itens: [
          "No topo, em \"Consultar laudos já emitidos ou continuar rascunho salvo (por CNPJ)\", digite o CNPJ.",
          "Toque em \"Buscar rascunhos salvos\" para continuar de onde parou.",
          "Toque em \"Buscar laudos emitidos\" para reabrir um laudo pronto."
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "No topo da tela, digite o CNPJ do cliente e toque em Buscar laudos emitidos; a lista mostra os botões ao lado de Reabrir laudo.",
          "Na linha do documento, toque em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, textos, anexos e leituras), sem importar nada de novo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "Altere só o que precisa e toque em \"Emitir laudo final\". Sai a revisão seguinte (Rev. 01, 02...) com o mesmo número; o motivo, a data e o seu nome entram no histórico de revisões do documento.",
          "A revisão anterior continua guardada na pasta do cliente, com a revisão no nome do arquivo, e passa a constar como \"Substituído pela Rev. NN\" na lista.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma lista, toque em \"Usar como base\" (por exemplo, o mesmo equipamento no ano seguinte).",
          "O formulário volta preenchido. Confira datas, leituras e resultados, que são do serviço anterior.",
          "Toque em \"Emitir laudo final\": sai um documento novo, com número novo. O documento de origem não muda."
        ] }
      ],
      cores: [
        { nome: "Caixa verde \"Aprovado\"", significado: "O vaso pode continuar operando até a próxima inspeção." },
        { nome: "Caixa amarela \"Aprovado com Ressalvas\"", significado: "A integridade está mantida, mas depende das recomendações. Recomenda-se reinspeção." },
        { nome: "Caixa vermelha \"Reprovado\"", significado: "O vaso não deve permanecer em operação." },
        { nome: "Quadros da categoria (abaixo dos dados técnicos)", significado: "Mostram a categoria calculada, o grupo de risco e o valor P.V (MPa·m³). Mudam sozinhos quando você muda PMTA, volume ou fluido." }
      ],
      problemas: [
        { situacao: "A categoria não aparece.", oQueFazer: "Preencha PMTA, volume e classe do fluido, com as unidades certas." },
        { situacao: "Aparece \"Esta tela ainda aponta para um laudo já emitido\".", oQueFazer: "Laudo emitido não muda mais. Toque em \"Começar novo laudo com estes dados\" para salvar como laudo novo." },
        { situacao: "A página recarregou e perdi o que digitei.", oQueFazer: "Se você tinha tocado em \"Salvar rascunho\", use \"Buscar rascunhos salvos\". Salve o rascunho com frequência." },
        { situacao: "O perfil Comercial ou Financeiro não consegue salvar.", oQueFazer: "Esses perfis só consultam laudos. Peça a emissão a um técnico, à metrologia ou ao gestor." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Emitir laudo final\"." },
        { situacao: "Apareceu \"O número ... já é de um documento gerado\".", oQueFazer: "Para corrigir aquele documento, use \"Abrir para corrigir\" na lista de documentos gerados. Para um documento novo, apague o número ou use outro." },
        { situacao: "O documento não aparece na lista para corrigir.", oQueFazer: "Laudos já emitidos, inclusive os de antes de 21/10/2026, aparecem na busca por CNPJ do topo da tela com os botões Abrir para corrigir e Usar como base: a planilha do NR-13 guarda todos os campos. Laudo substituído por uma revisão não aparece na busca; ele fica no quadro do fim da tela, como substituído." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Preencher, salvar rascunho e emitir laudos." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Consultar laudos emitidos. Não preenchem nem emitem." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "Que pressão o sistema usa para a categoria?", r: "Usa a PMTA, que é o critério conservador. O laudo informa isso na seção 5 (Categorização e periodicidade), com a memória de cálculo na Tabela 1." },
        { p: "Como o laudo é organizado?", r: "Abre com o parecer do PLH (Aprovado, Aprovado com ressalvas ou Reprovado) e segue em seções numeradas: identificação, introdução, objetivo, referências normativas, categorização, inspeção executada (válvulas, manômetros, teste hidrostático com gráfico e fotos), resultados e recomendações e, no fim, o parecer conclusivo com as datas e a assinatura do PLH na mesma página. Acima de 3 páginas, o laudo ganha sumário." },
        { p: "Onde o laudo fica salvo?", r: "Na pasta do cliente, numa subpasta com o CNPJ (14 dígitos), com o nome \"Laudo NR-13 - número - TAG - data e hora\", em PDF e em HTML. As fotos do exame ficam na subpasta \"Fotos\" da mesma pasta." },
        { p: "Qual redação da NR-13 o laudo cita?", r: "A da Portaria MTP nº 1.846, de 1º de julho de 2022 (retificada em 20/10/2022), alterada pela Portaria MTP nº 4.219, de 20 de dezembro de 2022." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "PMTA: pressão máxima de trabalho admissível, da plaqueta do vaso.",
          "P·V: produto da pressão (em MPa) pelo volume (em m³). Junto com a classe do fluido, define o grupo e a categoria (I a V).",
          "Categoria: define os prazos máximos de inspeção. Sem serviço próprio de inspeção, o prazo do exame externo e do interno vai de 1 e 3 anos (categoria I) até 5 e 10 anos (categoria V).",
          "Teste hidrostático: o vaso é cheio de água e pressurizado acima da PMTA (sugestão de 1,5 vez) para verificar se resiste sem vazar ou deformar.",
          "PLH: Profissional Legalmente Habilitado, que assina o laudo."
        ] }
      ]
    }
  };
}
