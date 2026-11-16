# Importação dos dataloggers com extensão XLS — 29/09/2026

Erro relatado na prévia: `GoogleJsonResponseException: drive.files.create — Bad Request`.

Foram localizados na pasta de uploads os arquivos DTL-01.xls, DTL-06.xls, DTL-07.xls, DTL-10.xls e DTL-12.xls enviados em 29/09/2026. Todos têm assinatura ZIP/OOXML apesar da extensão .xls e MIME application/vnd.ms-excel. O leitor antigo selecionava o conversor de Excel binário pelo nome/MIME.

O leitor agora verifica a assinatura do conteúdo antes de selecionar o caminho. OOXML usa o leitor XLSX original, preservando datas e dispensando a conversão do Drive. Esses arquivos também têm três abas: Resumo, Lista e Gráfico. A leitura anterior sempre abria a primeira; agora identifica a aba com cabeçalho de tempo e temperatura. Se mais de uma aba contiver leituras, pede um arquivo com a aba desejada em vez de escolher silenciosamente. Arquivos XLS binários continuam com conversão; falhas passam a informar nome do arquivo e posição do sensor. Arquivos originais no Drive não foram modificados.

Teste específico aprovado: reproduzir a seleção incorreta do conversor no código anterior; importar os cinco originais no código corrigido; normalizar 7.990 leituras de 22/09/2026 a 23/09/2026; executar a API de prévia com um arquivo por sensor (1.599 linhas alinhadas); assegurar zero chamadas de conversão para esses arquivos. Evidências em `backups/CADEIA_FRIO_XLS_20260929/testes-arquivos-reais.json`.

O teste usa os bytes reais e simula os serviços Google localmente; não equivale à emissão completa de um relatório na sessão de um colaborador. Publicação mantém a implantação existente e as correções de abertura e desempenho das versões 293/294.
