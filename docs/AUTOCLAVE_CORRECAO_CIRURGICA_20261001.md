# Autoclave: correção de tempo, fases e coerência — 01/10/2026

## Proteção da versão anterior

Antes de qualquer alteração foram salvos os 196 arquivos remotos e a configuração do deployment da versão 297. Também foram copiados os 14 arquivos locais do módulo, com hashes SHA256 conferidos.

Backup: `backups/AUTOCLAVE_CIRURGICA_20261001/`. Contém remote-before.json, deployment-before.json, local-before/ e local-manifest.json. O publicador impede envio se encontrar mudança remota concorrente, modifica somente o módulo Autoclave e confere todos os arquivos após o envio.

Publicação concluída na **versão 298**, com 10 arquivos do módulo alterados e os 196 arquivos remotos conferidos. Backup empacotado: `Backup_Autoclave_V297_20261001.zip`.

## Alterações e limites

- Os gráficos principais deixam de usar a primeira leitura como cabeçalho. As fontes auxiliares contêm os nomes dos sensores e todas as leituras.
- Os cinco gráficos temporais de ciclo e Leak Test usam minutos decorridos numéricos. Início e fim absolutos continuam disponíveis em texto. Intervalos irregulares mantêm sua duração real e horários repetidos permitidos pelo parser ficam no mesmo instante, sem fabricação de tempo.
- O detector observacional identifica depressão e recuperação de pressão. Não exige pico positivo de 1,2 bar e não encerra a busca ao atingir 65 °C. Considera referência atmosférica, amplitude, histerese, duração, lacunas e aquisição incompleta.
- Exige queda e recuperação de amplitude suficiente, evitando fracionar uma recuperação por ruído. Quando a exposição não é identificada, mantém pré-vácuo indeterminado e não varre todo o arquivo para contar vácuo posterior como pré-vácuo.
- A interface permite informar o tipo de remoção de ar do ciclo: automático, pré-vácuo, gravitacional ou SFPP, além de referência atmosférica local opcional.
- O relatório térmico continua recebendo pressão em **bar absoluto**. Outras unidades permanecem no fluxo próprio de Leak Test; o backend rejeita uma configuração incompatível com os rótulos do ciclo. Conversões disponíveis no detector isolado não significam conversão de todo o relatório.
- Não detectar evacuação nos dados não comprova ausência de bomba. Gravitacional/SFPP informados distinguem não aplicabilidade do pré-vácuo; registros insuficientes têm resultado indeterminado.
- A contagem representa **evacuações observadas**, não uma validação de eficácia, classificação da qualidade da bomba ou comprovação de remoção de gases.
- A fase posterior à exposição não é chamada automaticamente de secagem. São descritos despressurização, vácuo pós-exposição e recuperação atmosférica quando observados. A curva sozinha não comprova secagem da carga ou liberação do equipamento.
- Gráficos, tabela de eventos e interpretação consomem os mesmos fatos. Eventos do índice antigo da rampa não são reinseridos sobre os segmentos observacionais atualizados.
- A IA recebe diagnóstico, pressão, fases e limitações. Respostas incompletas são rejeitadas. A emissão confere assinatura do contexto e das leituras para impedir combinação de dados novos com narrativa antiga.
- Simulações iguais produzem leituras iguais. A data de geração continua nos metadados, mas não muda os fatos assinados entre rascunho e emissão.
- A grade de dados cresce somente quando necessário para acomodar leituras ou sensores, incluindo 60 sensores e mais de 1.000 linhas.

## O que foi preservado

As fórmulas de F0, a memória de cálculo, a detecção da exposição, o índice legado da rampa e os critérios de aprovação térmica não foram alterados. A comparação integral com o motor anterior, removendo apenas o objeto fasesProcesso, passou em 180 combinações de temperatura, pressão mínima, quantidade de evacuações, temperatura inicial e intervalo amostral.

Foram preservados CSS da interface e do certificado, mesclas, bordas, dimensões de linhas e colunas, alinhamentos, tamanhos de fontes, posições e dimensões dos gráficos. A conferência automatizada comparou 9 abas visíveis, 588 operações de formatação e 4 gráficos com o backup. Textos, dados das curvas e cores das fases mudam conforme os fatos corrigidos.

## Verificações reproduzíveis

Scripts em `_tools/`:

- test_autoclave_fases_20261001.js — 23 verificações de detecção, qualidade dos dados e preservação das métricas.
- test_autoclave_posfases_20261001.js — oito casos de pós-exposição.
- test_autoclave_graficos_20261001.js — tempo, sensores, primeira/última leitura, duplicatas permitidas e fontes auxiliares.
- test_autoclave_integrado_20261001.js — 15 cenários com Parser, Main, Planilha, Gráficos e Memória F0 reais; serviços Google simulados.
- test_autoclave_regressao_20261001.js — 180 comparações completas do motor com o backup.
- test_autoclave_simulador_20261001.js — 27 verificações de reexecução, assinaturas e mudança de parâmetros nos geradores reais térmico e Leak Test.
- test_autoclave_capacidade_20261001.js — 1/3/6/12/60 sensores, 1.501 leituras e virada de dia.
- test_autoclave_layout_20261001.js — estrutura e operações visuais comparadas ao backup.
- test_autoclave_consistencia_20261001.js — 11 verificações de contexto, assinatura, resposta IA e status.
- test_autoclave_ui_20261001.cjs — CSS, perfil enviado e integração rascunho/emissão.

Evidências: `backups/AUTOCLAVE_CIRURGICA_20261001/evidencias/`.

O simulador legado pode gerar duas depressões por pulso configurado e mais uma durante a transição para a rampa. Seu parâmetro de quantidade não é equivalente à quantidade de evacuações da curva; a geração foi preservada e a análise descreve o que está nos dados. Essa diferença está registrada em simulador-resultados.json e simulador-exploratorio.json. Não se ajusta uma contagem para concordar artificialmente com o formulário.

## PDF de exemplo

`output/pdf/Autoclave_Simulacao_Validacao_20261001.pdf`: 10 páginas, 12 sensores, três evacuações e ciclo de 21/09/2026 23:45:00 a 22/09/2026 00:15:30. Todas as páginas indicam simulação sem ensaio real.

Os valores, textos e operações vieram dos geradores reais do módulo. A API Sheets estava desabilitada no projeto OAuth. Por isso, as operações foram reproduzidas em XLSX, convertidas para Google Sheets pelo Drive e exportadas usando os parâmetros de PDF do módulo. A amostra informa essa aproximação no rodapé; não comprova identidade de pixels com uma emissão autenticada do portal. Foram revisadas todas as páginas renderizadas e os quatro gráficos. Uma página vazia causada pela conversão foi removida somente do exemplo; nenhum conteúdo técnico foi retirado e a numeração foi ajustada.

## Verificação operacional recomendada

Atualizar o portal e repetir um arquivo real que já funcionava e um que retornava zero apesar de apresentar evacuação. Informar o tipo do ciclo executado, conferir unidade de pressão da fonte, horários, sensores, fases, contagens e textos. O arquivo exato que originou a reclamação não foi fornecido; as simulações não substituem essa comparação.

Uma chamada real à IA e uma emissão autenticada do portal não foram feitas nesta execução. O PDF passou pelo serviço real de conversão/exportação do Drive/Sheets, com as limitações descritas acima.

## Reversão

Após a publicação, o script `_tools/reverter_autoclave_cirurgica_20261001.js` confere se o remoto ainda corresponde exatamente ao estado publicado nesta correção. Sem `--execute`, apenas verifica. Com `--execute`, restaura o código remoto e o deployment anterior da versão 297. Se existir uma alteração posterior, bloqueia para não apagar trabalho novo.

As fontes locais anteriores permanecem em local-before/. A restauração local deve ser feita apenas após conferir mudanças posteriores; o script de reversão não sobrescreve automaticamente a área de trabalho.

A confirmação de publicação fica em publicacao.json e a conferência de reversibilidade em reversibilidade.json, dentro do backup.
