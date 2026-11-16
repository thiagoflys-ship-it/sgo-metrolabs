# Geração da planilha de Cadeia Fria — 29/09/2026

Problema relatado: gerar relatório/planilha fica aguardando até o limite de execução. A correção anterior de datas introduziu chamadas a Utilities.parseDate/formatDate por célula e repetidas por leitura: serial Excel → data com fuso → texto → data → combinação data/hora → texto → nova formatação.

Corrigida essa regressão: serial Excel é convertido diretamente para texto civil; conversão de fuso usa um cache de deslocamento por dia, somente dentro da execução; formatação usa componentes numéricos; removida segunda formatação das mesmas linhas. Nas proximidades de mudança de horário de verão permanece o caminho original de validação do fuso. Nenhuma leitura é amostrada ou removida para acelerar o processamento.

Os seis arquivos reais usados na comparação somam 9.147 leituras. O resultado normalizado completo, incluindo instantes, texto de data, temperaturas e pressão, foi comparado antes/depois e ficou idêntico. A implementação antiga chamou Utilities.formatDate 64.029 vezes e Utilities.parseDate 27.441 vezes. As contagens novas estão em `backups/CADEIA_FRIO_PERFORMANCE_20260929/comparacao-desempenho.json`.

Os 23 testes de datas passaram, além de verificações de UTC, fuso com minutos, transições de horário de verão e 20.000 conversões adicionais. Esse teste mede chamadas de serviço em ambiente local; não representa um tempo cronometrado de emissão na conta Google. A montagem da planilha e dos gráficos foi preservada. Incluído registro de duração das etapas no log do Apps Script e identificação da etapa em erros capturáveis.

Publicação usa a mesma implantação, preserva a correção de abertura da versão 293 e verifica os 195 arquivos. Evidências e cópias antes/depois em `backups/CADEIA_FRIO_PERFORMANCE_20260929/`.
