# Auditoria de estufa, banho-maria e secadora de traqueias — 01/10/2026

## Escopo e resultado

Revisão realizada com três agentes dedicados à importação, ao motor de cálculo e à interface. Foram examinados o upload, a seleção de abas e sensores, as datas, as janelas de estudo, os critérios térmicos, os gráficos, a interpretação e o certificado. As correções preservam os demais módulos do portal, incluindo a biblioteca de Conduta publicada na versão 296.

## Correções

- Arquivos com extensão `.xls` e conteúdo XLSX passam a ser reconhecidos pelo conteúdo. A leitura direta preserva os horários originais.
- A seleção automática ignora abas de resumo e gráficos. Havendo várias abas com dados, o usuário informa o nome no campo opcional **Nome da aba de dados**.
- Cabeçalhos de temperatura não são confundidos com tempo. A leitura aceita os formatos de data, horário e números testados, preserva canais esparsos e rejeita valores inválidos.
- O upload bloqueia ações concorrentes e remove o identificador antigo. A interface mostra o erro original com segurança, preserva o formulário ao reabrir e mantém os segundos nas janelas da secadora.
- O erro de janela informa o período solicitado e o período importado. Períodos sem cobertura suficiente, datas fora do arquivo e repetições sobrepostas são bloqueados.
- A análise valida os sensores selecionados, a ordem dos horários e a faixa térmica. A letalidade usa os intervalos reais, sem acrescentar um intervalo após a última leitura ou arredondar antes de comparar com o limite.
- Estudos sem tempo suficiente são informativos; alertas chegam ao resultado consolidado. A simulação é identificada e reproduzível.
- A planilha de saída amplia sua grade para os dados e gráficos. Ausência de dados para gráficos gera erro explícito.
- O certificado distingue resultado aprovado, reprovado, informativo e com alerta. Expõe motivos calculados independentemente da narrativa. Não declara liberação automática ou conformidade integral com normas; avaliação térmica da secadora não demonstra sozinha a eficácia de secagem.
- Alterações nas leituras invalidam a interpretação anterior. Respostas incompletas da IA e fotografias com formato inválido são rejeitadas.

## Verificação

| Verificação | Resultado |
| --- | --- |
| Integração dos perfis e estudos | 73 cenários; 134 emissões simuladas; 194 gráficos |
| Regressão de datas | 23 casos aprovados |
| Motor térmico | 12 testes aprovados |
| Robustez adicional | 9 testes aprovados |
| Interface e carregamento | Dois testes DOM aprovados |
| Arquivos reais | 47.223 leituras conferidas linha a linha em quatro arquivos |
| Conferência independente | Cinco arquivos conferidos com openpyxl |

Os testes integrados reproduzem uma grade inicial de 1.000 linhas e 26 colunas e verificam expansão para 60 sensores e 1.441 leituras. Incluem secadora, estufa, banho-maria, diferentes quantidades de sensores, indicadores de letalidade, intervalos e integridade da interpretação.

Uma aba de `dtl corrigido.xlsx` contém um salto real de aproximadamente 24 horas entre leituras. Esse defeito de origem é bloqueado; não são fabricadas leituras para preencher a lacuna.

## Evidências e reprodução

As evidências ficam em `backups/ESTUFA_AUDITORIA_20261001/`, incluindo arquivos importacao-downloads.json, importacao-openpyxl.json, evidencias/resultado-testes.json e os snapshots de publicação. O arquivo importacao-abas-e-saltos.json também registra verificações exploratórias anteriores à correção da escolha automática de aba.

Scripts em `_tools/`: test_estufa_integrado_20261001.js, test_estufa_motor_20261001.js, test_estufa_robustez_20261001.js, test_estufa_importacao_20261001.js, test_estufa_downloads_20261001.js, test_estufa_abas_reais_20261001.js, test_estufa_openpyxl_20261001.py, test_estufa_ui_20261001.cjs e test_estufa_loader_20261001.cjs. O teste de robustez executa também a integração. Os serviços Google e a IA são simulados nesses testes.

## Limites da verificação

Não foi possível operar uma sessão autenticada do portal pelo navegador nesta execução. A conversão real de XLS binário antigo pelo Drive e uma chamada real de interpretação à IA não foram exercitadas; suas integrações foram verificadas por simulação. O arquivo exato que falhou com os colaboradores não foi identificado. Os arquivos reais disponíveis foram importados e conferidos, mas não substituem a repetição operacional com esse arquivo.

## Conferência no portal

1. Atualizar a página e abrir o módulo.
2. Selecionar o perfil e enviar a planilha; aguardar o upload.
3. Se houver várias abas de dados, preencher o nome exato da aba.
4. Conferir na prévia o primeiro e o último horário e os canais reconhecidos.
5. Selecionar somente os sensores usados. Informar períodos contidos no arquivo; na secadora, conferir separadamente as seis janelas.
6. Gerar a análise e conferir resultado, alertas, gráficos e certificado. Para arquivos com lacunas, corrigir a origem ou escolher um período válido.

## Publicação

Publicação concluída na versão **297**, com 13 arquivos do módulo alterados e os 196 arquivos remotos conferidos. Os demais arquivos foram preservados.

O publicador verifica concorrência, altera somente os arquivos deste módulo, compara todos os arquivos remotos após o envio e atualiza o mesmo deployment. A versão, a lista de arquivos alterados e a confirmação ficam em `backups/ESTUFA_AUDITORIA_20261001/publicacao.json`.
