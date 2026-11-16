# Verificação dos nove instrumentos — 08/10/2026

A lista da imagem pertence ao Relatório de Calibração (`SGO_RelCal`), que interpreta certificados anexados. O Certificado de Calibração (`SGO_CertCal`) calcula e emite resultados por blocos genéricos de grandeza; não possui catálogo próprio de instrumentos. Foram verificados os dois caminhos sem publicar alterações.

| Instrumento | Grandezas exercitadas no motor e documentos |
|---|---|
| Termômetro | Temperatura (°C) |
| Banho-maria de bancada | Temperatura (°C) |
| Termo-higrômetro | Temperatura (°C), umidade relativa (%UR) |
| Incubadora de testes biológicos | Temperatura (°C) |
| Estufa de incubação de bancada | Temperatura (°C) |
| Balança | Massa (g) |
| Centrífuga sem refrigeração | Tempo (s), rotação (rpm) |
| Centrífuga refrigerada | Tempo (s), rotação (rpm), temperatura (°C) |
| Esfigmomanômetro | Pressão (mmHg) |

As faixas e unidades acima são cenários sintéticos de teste, não prescrição do método de calibração de cada equipamento. Cada grandeza utiliza padrão próprio no teste.

## Evidências

`node --test --test-isolation=none tests/certcal-instrumentos.test.cjs`: **11 testes passaram**. Os nove perfis exercitam cálculo real, renderização real, emissão pela API pública, persistência do snapshot e geração interpretativa pela API pública a partir desse snapshot. As dependências de Drive, planilha e conversão PDF são simuladas. Conferidos média e incerteza padrão contra referência analítica, precisão integral preservada no snapshot, resultados nas duas saídas, vírgula e duas casas, todas as grandezas e ausência de aprovado/reprovado.

Outros dois testes cobrem autodetecção dos nove códigos, rejeição de código desconhecido e formatação de células de medição do relatório externo preservando datas e número de certificado.

Também passaram `tests/relcal-vinculo-certificados.test.cjs` (mapeamento dos anexos nos nove perfis, códigos duplicados/desconhecidos bloqueados antes da IA e contexto de escopo parcial) e `tests/relcal-deteccao-concorrente.test.cjs` (respostas atrasadas de arquivo, slot ou instrumento anterior não preenchem o formulário atual). As regressões de documentos e interface CertCal passaram.

## Falhas corrigidas

- A autodetecção do relatório externo oferecia apenas quatro códigos; os cinco perfis restantes não podiam ser identificados corretamente. Agora usa o catálogo completo e valida o código retornado.
- O prompt exigia repetir aprovação do emissor e manter as casas da origem. Foi alinhado à decisão de uso do cliente e à apresentação de resultados com duas casas.
- Células numéricas de colunas reconhecidas de medição passam a ser formatadas no HTML com duas casas. Identificação, códigos e datas permanecem intactos.
- O documento mostra aviso determinístico de escopo parcial quando faltam certificados de componentes, inclusive em centrífugas. Não depende da narrativa da IA para tornar essa ausência visível.
- O backend rejeita anexos com peça desconhecida, sem identificação ou duplicada, evitando associação silenciosa ao componente errado.
- A interface descarta respostas de autodetecção quando o instrumento, o campo de upload ou o arquivo já mudou.

## Limites

O relatório externo ainda extrai dados de imagens/PDFs por IA. Os testes não comprovam fidelidade de OCR nos certificados reais nem asseguram que toda menção numérica em prosa terá duas casas: a normalização determinística se restringe a colunas de medição reconhecidas para preservar identificadores. Essa origem deve ser conferida pelo responsável técnico antes da emissão. O caminho nativo CertCal utiliza snapshot estruturado e narrativa determinística.

Não houve validação visual ou conversão PDF nativa no Google Apps Script, implantação ou alteração de certificados históricos. Também permanecem as limitações do orçamento de incerteza descritas na auditoria anterior: resolução, correções do padrão, correlações e contribuições específicas de cada método precisam de definição técnica; testes de software não certificam adequação metrológica de uma faixa ou padrão.

## Tentativa de validação Google e próximo passo concreto

A consulta autenticada de deployments e o download de uma cópia isolada do código remoto foram concluídos em 08/10/2026. O deployment principal está na versão 298 (descrição de 01/10/2026); os 13 arquivos CertCal/RelCal locais diferem do HEAD remoto. Nenhum push ou deploy foi feito.

A execução `clasp run RelCal_apiPing` foi recusada com `Unable to run script function. Please make sure you have permission to run the script function.` Não há navegador conectado e o navegador in-app retornou `Browser is not available: iab`. Portanto não foi possível executar nem inspecionar PDFs no ambiente Google nesta sessão.

Preparação reproduzível: `node _tools/preparar_certcal_qa_google.cjs` gera `tmp/certcal-validacao-google-20261008/isolado/QA_CertCal_Isolado.gs`, manifesto e instruções `LEIA-ME.txt`. O bundle deve ser usado em um projeto de teste separado, pois contém funções com os mesmos nomes do SGO+. A função `executarCertCalQaPdfGoogle` gera 18 PDFs com dados sintéticos, marcados como TESTE/SEM VALIDADE, em uma pasta privada. Não acessa cadastros, planilhas, numeração oficial ou Auvo. A lógica do bundle passou localmente com serviços simulados; a conversão Google continua pendente. Não amplia permissões automaticamente nem publica os documentos.
