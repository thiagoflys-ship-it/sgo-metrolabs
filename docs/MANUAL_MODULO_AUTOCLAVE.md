# Manual do Operador — Módulo Autoclave a vapor (qualificação térmica)

## O que mudou em 20/10/2026

- **O ensaio começa pelo cadastro.** Nas duas abas, o técnico busca o cliente e escolhe a unidade e a autoclave (quadro "Cliente e equipamento"). Cliente, CNPJ, endereço, TAG, número de série, local, fabricante (marca) e modelo vêm do cadastro, ficam travados e saem nos documentos. Equipamento de outro cliente ou de outra unidade é recusado. Sem cadastro, os botões "Cadastrar cliente", "Cadastrar unidade" e "Cadastrar equipamento" abrem o cadastro em outra aba; ao voltar, "Atualizar listas".
- **Falta no cadastro do equipamento (21/10/2026).** Se a TAG, o número de série ou o setor estiverem vazios no cadastro, o quadro "Cliente e equipamento" mostra "Falta no cadastro do equipamento: TAG, Nº de série, Setor" com os campos para preencher ali mesmo. Preencha pela placa ou pela etiqueta e toque em **Gravar no cadastro**: o valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. **Buscar nos ensaios anteriores** traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Valor já gravado não muda por aqui: a correção é em Cadastros › Equipamentos › Editar. Patrimônio, capacidade, câmaras e ano de fabricação, quando preenchidos no cadastro, também saem no relatório. Os campos marcados **do cadastro** nas outras seções (por exemplo, TAG, número de série e setor em "2. Equipamento") têm fundo cinza e um cadeado: ao clicar, a tela explica de onde vem o dado e oferece **Escolher o equipamento** (quando nenhum foi escolhido), **Preencher no cadastro** (quando o dado está vazio no cadastro) ou **Abrir o cadastro de equipamentos** (para corrigir um valor já gravado). Sem equipamento escolhido, a seção avisa no topo; os demais campos da seção são do ensaio e continuam editáveis.
- **Pasta do equipamento.** Relatório de ensaio, planilha de dados, memória do F0 e relatório de qualificação ficam em `Autoclave - Laudos/<CNPJ>/<TAG - tipo>/Qualificação`, dentro da pasta do cliente.
- **Relatório no modelo oficial novo** (aba "Relatório oficial", antes "Preencher modelo"): o relatório de qualificação do equipamento (seção 7.2). O modelo anterior (documento-modelo com nove campos digitados e o resultado escolhido pelo técnico) foi guardado e desativado; só o Administrador o reativa.
- **Planilha de dados nova** (modelo novo, padrão): documento A4 em paisagem com capa, sumário com páginas, quadro-resumo dos critérios, condições do ensaio, resultados por sensor e por fase, gráficos, memória de cálculo passo a passo e todas as leituras do registrador, salvo em HTML e PDF na pasta do cliente e emitido com a aprovação do responsável técnico (mesmo fluxo do relatório de ensaio). A planilha antiga do Google Planilhas foi guardada sem mudança e está desligada; só o responsável pelo sistema pode religá-la (seção 7.1). Planilhas já emitidas no modelo antigo continuam na pasta como estão.
- O envio da planilha do registrador voltou a funcionar no servidor próprio: a pasta fixa de envios do Google Drive antigo não existe mais; o arquivo vai para a pasta própria do módulo ("Autoclave - Planilhas enviadas"). A pasta de laudos segue a mesma regra.
- Nova opção em "Como enviar os dados": **Um arquivo por sensor (registradores individuais)**. Cada sensor marcado recebe o seu arquivo na grade "Sensores considerados na análise"; a pressão pode vir de um arquivo próprio.
- Novo seletor **Analisar pressão** (ligado por padrão). Desligado (autoclave de pequeno porte/cassete sem ponto para o transmissor de pressão), pede uma justificativa curta e o relatório considera somente a temperatura.
- Novo campo opcional **Sensor de referência da câmara** (o sensor junto ao dreno).
- O F0 passou a ser somado pela regra dos trapézios com o intervalo real entre leituras (antes contava um intervalo a mais por sensor e superestimava o F0, por exemplo em 1/6 num patamar de 3 min com leitura a cada 30 s).
- Novos critérios no relatório: tempo de patamar, faixa de esterilização, diferença entre sensores, tempo de equilíbrio e temperatura medida × vapor saturado (pela pressão).
- Dados com problema não viram documento: o sistema lista o que corrigir (o que aconteceu, por quê e como corrigir).
- A emissão do relatório de ensaio exige a aprovação do responsável técnico, registrada com nome, data e hora. Reemitir o mesmo número gera nova revisão.
- O texto redigido automaticamente é conferido: número que não está nos resultados, norma fora da lista, número de cláusula de norma, resultado diferente do calculado ou termo proibido trocam o texto pelo texto padrão.

## 1. Para que serve

Gera, para UM ciclo de uma autoclave a vapor, três documentos com os mesmos números:

1. **Planilha de dados (A4 em paisagem, HTML e PDF)** — capa, sumário, quadro-resumo dos critérios, resultados por sensor e por fase, gráficos, memória de cálculo e todas as leituras do registrador (seção 3.1).
2. **Relatório de ensaio térmico (A4)** — capa, sumário, identificação, instrumentação, metodologia, critérios com a referência de cada um, escopo e limitações, resultados, gráficos, não conformidades, análise, conclusão, responsabilidade técnica e anexos.
3. **Memória de cálculo do F0 (A4)** — leitura a leitura, a conta do F0 de cada sensor.

Todos ficam salvos na pasta do cliente (subpasta do CNPJ), em HTML A4 e PDF. O botão "Enviar ao cliente" fica na faixa verde que aparece no topo do documento.

## 2. Quem decide o resultado

O resultado (aprovado, reprovado ou informativo) é calculado pelo sistema, sempre com as mesmas regras. A redação automática só explica os números; ela nunca decide. Se o texto redigido citar um número que não está nos resultados, uma norma fora da lista, um número de cláusula, um resultado diferente do calculado ou uma expressão proibida, ele é descartado e entra o texto padrão, montado só com os resultados.

## 3. Passo a passo

1. **Cliente e equipamento** — busque o cliente (nome ou CNPJ), escolha a unidade e a autoclave. A identificação é preenchida pelo cadastro.
   **Seção 1 e 2** — programa, tipo de ensaio, ciclo nº, lote e responsável técnico.
2. **Seção 3** — escolha o ciclo (121 °C, 127 °C ou 134 °C), a temperatura programada e a quantidade de sensores. Desmarque só o sensor que falhou no ensaio (e registre a falha). Informe a remoção de ar.
   - **Analisar pressão**: deixe ligado. Desligue apenas quando não foi possível instalar o transmissor de pressão e escreva a justificativa (exemplo: "equipamento sem ponto para instalar o transmissor de pressão").
   - **Sensor de referência da câmara** (opcional): o número do sensor junto ao dreno.
3. **Seção 4** — dados do registrador:
   - **Arquivo único**: "Enviar arquivo ou informar o link" e escolha o arquivo (CSV, planilha ou texto). O link é preenchido sozinho.
   - **Um arquivo por sensor**: escolha o arquivo de cada sensor na grade da seção 3. Se a pressão estiver em registrador separado, envie em "Arquivo do registrador de pressão". As leituras são alinhadas pelo horário; a prévia mostra quantas leituras de cada sensor ficaram sem par e a maior diferença de relógio.
4. **Pré-visualizar dados** e confira datas, horas e temperaturas.
5. **Seção 5** — número do ensaio e identificação do registrador (TAG do cadastro de Padrões de referência). A planilha de dados usa esses dois campos.
6. **Gerar relatório de dados (planilha)**. Responsável técnico: confirme a aprovação; a planilha abre em nova aba e fica salva na pasta do cliente. Técnico: a planilha vai para **6. Aguardando aprovação** (coluna "Documento" = "Planilha de dados") e a minuta abre em outra aba, com a faixa "MINUTA PARA CONFERÊNCIA". Depois da emissão: "Abrir PDF da planilha de dados", "Abrir pasta do cliente" e "Enviar ao cliente".
7. Fotos (opcional) e **Gerar rascunho da interpretação**.
8. Revise os textos.
   - **Técnico**: "Enviar para aprovação do responsável técnico".
   - **Responsável técnico** (perfis Administrador, Diretoria, Gestor e Metrologia): marque "Conferi os dados, os critérios e os textos e aprovo a emissão" e "Aprovar e emitir"; ou, em **6. Aguardando aprovação**, "Ver prévia" (minuta, não entregar), "Aprovar e emitir" ou "Devolver" com o motivo.
9. **Gerar a memória do F0**, se precisar explicar o F0 ao cliente.

## 3.1 O que tem na planilha de dados

A4 em paisagem; cabeçalho com o título, a TAG, o ciclo e a data; rodapé com a empresa, o número da planilha, a revisão e "Página X de Y" em todas as folhas.

| Parte | Conteúdo |
|---|---|
| Capa | Cliente, CNPJ, unidade, equipamento (TAG, modelo, nº de série; sem fabricante), ensaio, ciclo, programa, data, lote, técnico executor, responsável técnico, número e revisão; resultado do ensaio; registrador com certificado, validade e incerteza (U95). |
| Sumário | Seções e anexos com o número da página. |
| 1. Quadro-resumo | Um critério por linha: critério de aceitação, valor medido, fonte do critério e situação. O resultado geral fica só na capa. |
| 2. Condições do ensaio | Parâmetros (temperatura programada, faixa, remoção de ar, intervalo, sensores, correção, origem dos dados, leituras), escopo e limitações, normas. |
| 3. Resultados | Por sensor na exposição: leituras, mínima, máxima, média, desvio-padrão, tempo na faixa no patamar, horário em que atingiu a temperatura, diferença para a referência, F0. Por fase: início, término, duração, leituras, temperaturas e pressões. |
| 4. Gráficos | Perfil térmico com as fases; detalhe da exposição com a faixa de esterilização; F0 acumulado por sensor; pressão da câmara e temperatura medida × vapor saturado (só com pressão); mapa dos sensores do mais frio ao mais quente. Teste de estanqueidade: pressão no registro e na janela. |
| 5. Memória de cálculo | F0 (fórmula, Tref 121,1 °C, z 10 °C, regra dos trapézios com o intervalo real, exemplo passo a passo do pior sensor, F0 de cada sensor), vapor saturado (IAPWS-IF97, exemplo na leitura de maior diferença), tempo de equilíbrio, incerteza (U(F0) e o resultado declarado com dois algarismos significativos). Estanqueidade: taxa = variação de pressão ÷ tempo, passo a passo. |
| 6 e 7 | Não conformidades e observações; responsabilidade técnica, aprovação registrada e assinaturas. |
| 8. Leituras da exposição | Todas as leituras da janela do F0, folha a folha, com o cabeçalho em todas as folhas; com mais de 12 sensores, em blocos de sensores. Fundo azul: menor temperatura da linha; laranja: maior; número vermelho: leitura do patamar fora da faixa; linha cinza: descida depois do patamar (entra no F0, fora dos critérios de tempo e faixa). |
| Anexos | A: demais leituras, compactas, com a fase de cada leitura. B: alinhamento dos registradores (um arquivo por sensor). |

Os números (F0, mínimas, médias, máximas, critérios) são os mesmos do relatório de ensaio. Com "Analisar pressão" desligado, nenhuma coluna, gráfico ou texto de pressão aparece; só a frase do escopo com a justificativa.

## 4. Critérios de aceitação (configurados e revisáveis pelo responsável técnico)

Os valores estão na configuração do módulo (SGO_AutoRel_Config.js, CICLOS e CRITERIOS_REFERENCIAS). O sistema não tem o texto integral das normas e não cita números de cláusula.

| Critério | Valor configurado | Referência técnica | Obrigatório |
|---|---|---|---|
| Exposição identificada | todos os sensores ativos na temperatura mínima, com leituras consecutivas | ABNT NBR ISO 17665-1 | sim |
| Tempo de patamar | 134 °C: 3 min; 127 °C: 10 min; 121 °C: 15 min | ABNT NBR ISO 17665-1 e EN 285 | sim |
| Faixa de esterilização | da temperatura do ciclo até +3 °C | EN 285 | sim |
| Diferença entre sensores | ≤ 2,0 °C em cada leitura do patamar | EN 285 | sim |
| Tempo de equilíbrio | ≤ 15 s (precisa de leitura a cada 15 s ou menos) | EN 285 | não* |
| Temperatura × vapor saturado | diferença ≤ 2,0 °C (precisa da pressão absoluta) | EN 285 | não* |
| F0 no pior sensor | ≥ 15,00 min (Tref 121,1 °C, z 10 °C) | ABNT NBR ISO 17665-1 | sim |
| Taxa de vazamento (estanqueidade) | ≤ 1,3 mbar/min numa janela de ao menos 10 min | EN 285 | sim |

\* Avaliado quando os dados permitem; quando não permitem, aparece como "Não avaliado", com o motivo, e não aprova nem reprova.

Regra de decisão: aceitação simples (o valor medido é comparado ao limite); a incerteza do registrador é propagada ao F0 e informada no documento, sem banda de guarda.

## 5. O que impede a emissão (e como corrigir)

| Aviso | Como corrigir |
|---|---|
| Sensor com leitura impossível (fora de −10 °C a 160 °C) | Se o sensor falhou, desmarque-o e registre; se o arquivo saiu errado, exporte de novo. |
| Sensor parado (mesmo valor em 10 leituras enquanto os outros variam) | Idem. |
| Pico isolado dentro da exposição | Idem. |
| Leitura faltando dentro da exposição | Confira se o arquivo do sensor cobre todo o ciclo e o relógio do registrador. |
| Intervalo sem leituras dentro da exposição | Exporte o arquivo completo, sem filtros. |
| Poucas leituras na exposição (menos de 5) | Repita o ensaio com intervalo de leitura menor (5 ou 10 s). |
| Pressão incompatível com a temperatura | A coluna de pressão está em outra unidade; converta para bar absoluto. |
| Registrador não informado, fora do cadastro, sem validade ou vencido | Cadastre ou atualize em Cadastros › Padrões de referência. |
| Estanqueidade: pressão caindo ou janela menor que 10 min | Corrija os horários da fase de espera ou repita o teste. |

## 6. Ensaio só de temperatura (Analisar pressão desligado)

- A pressão sai dos dados antes da análise: as fases são identificadas só pela temperatura; F0 e critérios de temperatura continuam.
- Critérios que dependem de pressão (vapor saturado, estanqueidade, fases pela pressão) não entram no relatório nem na conclusão: nunca aprovam nem reprovam.
- O documento traz uma única frase em "Escopo e limitações" com a justificativa; fora dela, não há menção a pressão (nem campos em branco, gráfico, tabela ou coluna).
- O teste de estanqueidade não fica disponível.

## 7. Revisões e arquivo

- Cada emissão grava um registro (tabela QUALIF_EMISSOES): número, revisão, resultado, quem enviou, quem aprovou, data e hora, arquivos. A planilha de dados tem revisões próprias (módulo AUTOCLAVE_DADOS), independentes das do relatório de ensaio do mesmo número.
- Emitir de novo o mesmo número gera a revisão seguinte; a anterior fica marcada como substituída e o arquivo continua na pasta do cliente.

### 7.1 Modelo da planilha de dados

O modelo novo é o padrão. O modelo anterior (planilha do Google Planilhas exportada em PDF) está guardado sem mudança e desligado. Para religá-lo, o responsável pelo sistema abre **Chaves e senhas**, grupo **Relatórios técnicos**, item **Autoclave: modelo da planilha de dados**, e escolhe "Modelo anterior". Voltar para "Modelo novo" (ou deixar vazio) usa o novo. Documentos já emitidos em qualquer dos modelos não mudam.

## 7.2 Relatório de qualificação (aba "Relatório oficial")

O relatório de qualificação consolida, para um equipamento, os relatórios de ensaio de ciclo já emitidos (câmara vazia, com carga e teste de estanqueidade), a lista de verificação da instalação e os indicadores informados. Ele substitui o "Preencher modelo" antigo, cujo documento repetia um texto fixo (protocolo, conceito de eficiência, responsabilidades, instrumentação com marca do registrador, critérios genéricos, cálculo do F0, esquema de sensores, identificação com nove campos digitados e uma conclusão "aprovado" escolhida à mão).

1. Escolha o cliente, a unidade e a autoclave. A tela mostra a situação do equipamento (qualificado, vencendo, vencido, reprovado ou sem qualificação).
2. Marque os relatórios de ensaio do equipamento que fundamentam a qualificação. Relatório emitido antes do vínculo aparece em "Relatórios de ensaio sem vínculo"; "Vincular a este equipamento" só preenche o vínculo (nunca troca um vínculo existente; outro CNPJ é recusado; TAG diferente pede confirmação).
3. Marque as etapas (QI, QO, QD), o motivo, a periodicidade da requalificação (padrão 12 meses, de 1 a 24, contada do último ensaio) e quem acompanhou pelo cliente.
4. QI: responda a lista de verificação (conforme, não conforme com descrição, não aplicável) e a data. O item sobre vapor sai da lista quando nenhum ciclo analisou a pressão.
5. Indicadores (opcional): Bowie-Dick, químico ou biológico, com o resultado informado.
6. "Gerar rascunho": o sistema decide. Aprovado só se todos os ciclos estiverem aprovados e nenhum item da instalação ou indicador for não conforme. Travas (o que corrigir): sem etapa, sem motivo, periodicidade fora da faixa, relatório de ensaio de outro equipamento, sem vínculo, substituído, sem os dados registrados ou com dados mudados desde a aprovação, QO sem ciclo em câmara vazia ou estanqueidade, QD sem ciclo com carga, lista da instalação incompleta.
7. A conclusão sai em texto padrão (montado só com os resultados) ou, se marcado, redigida pelo assistente e conferida (números, normas da lista, veredito, fabricante do cadastro e, sem pressão, nenhum termo de pressão). Revise e envie para aprovação; o número é RQA-ano-sequência.
8. O responsável técnico confere a prévia (minuta), aprova e emite, ou devolve com o motivo. "Abrir para corrigir" (antes "Nova revisão") reabre um relatório emitido com todos os dados; o motivo entra no registro de revisões, a revisão volta para a aprovação do responsável técnico e a anterior fica guardada como substituída. "Usar como base" copia os dados para um relatório novo, com número novo no envio (por exemplo, a requalificação do ano seguinte).

**O documento** (A4 em pé, HTML e PDF): capa, sumário com páginas, objetivo, escopo e limitações, identificação (do cadastro, sem marca nem modelo), referências normativas (só as da lista configurada), definições, responsabilidades da executante e do contratante, metodologia (instalação, ensaios térmicos, cálculo do F0 pela regra dos trapézios, estanqueidade quando houver, regra de decisão), instrumentos com certificado, validade e incerteza, critérios de aceitação com a fonte, resultados (lista da instalação, resumo dos ensaios, critérios por ensaio, indicadores), não conformidades e observações, conclusão com o texto em linguagem simples, recomendações e data da requalificação, assinaturas (elaborado por, responsáveis técnicos, ciência do contratante), Anexo A (relatórios de ensaio com o código de conferência dos dados) e Anexo B (registro de revisões). Sem pressão analisada, nenhuma referência a pressão fora da frase do escopo.

**Depois de emitido**: fica na pasta do equipamento, entra no Arquivo de documentos (categoria "3. Relatórios de qualificação", com a validade), aparece na ficha do equipamento (aba Qualificações), na unidade, no cliente e na seção Qualificação do QR Code (só emitido e aprovado, só para o próprio cliente, com registro de cada acesso). A validade vira pendência de requalificação 30 dias antes e no vencimento, na central de pendências e na Caixa de decisões.

## 8. Normas citadas

RDC ANVISA nº 15/2012; ABNT NBR ISO 17665-1; ISO/TS 17665-2; ABNT NBR 11816; EN 285 e EN 13060 (referência técnica de ensaios); ABNT NBR ISO 11140 (indicadores químicos, inclui o do Bowie-Dick); ABNT NBR ISO 11138 (indicadores biológicos). A ABNT NBR 16328, citada em versões anteriores, saiu do relatório: no SGO+ ela é a referência do módulo Cadeia de Frio (equipamentos de refrigeração) e aguarda a confirmação do responsável técnico.

## 9. Perguntas frequentes

- **Por que o F0 mudou um pouco em relação aos relatórios antigos?** A soma agora usa o intervalo real entre leituras (regra dos trapézios). O método antigo contava um intervalo a mais e dava F0 maior.
- **O ciclo de 121 °C por exatamente 15 min a 121,0 °C reprova?** O F0 desse ciclo é 14,66 min, abaixo do mínimo configurado de 15,00 min; por decisão de 17/10/2026, abaixo do mínimo reprova. O responsável técnico pode rever o mínimo na configuração.
- **Existe "aprovado com alerta"?** Não.

## O que mudou em 22/10/2026 (identificação completa e vários padrões)

- **Identificação do equipamento completa.** Escolhido o equipamento, tudo o que está preenchido em Cadastros › Equipamentos sai no documento: tipo, fabricante (marca), modelo, nº de série, TAG, patrimônio, setor, capacidade, câmaras ou portas e ano de fabricação. Campo preenchido no cadastro fica travado na tela, com a explicação de onde corrigir (Cadastros › Equipamentos › Editar); campo vazio no cadastro pode ser completado no quadro "Cliente e equipamento", em "Gravar no cadastro" (só grava o que está vazio). Linha vazia não aparece no documento.
- **Vários padrões de referência.** Abaixo de "Identificação do registrador", toque em "Escolher padrões" e marque todos os registradores e padrões usados (busca por TAG, descrição, fabricante ou certificado; sem limite, 1 ou 20). A identificação é preenchida sozinha, separada por vírgula (também pode ser digitada). O relatório de ensaio, a planilha de dados e o relatório de qualificação trazem uma tabela com cada padrão: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade, incerteza e a situação na data do ensaio. Um padrão vencido na data do ensaio impede a emissão e a trava diz qual é.
- Documentos e rascunhos antigos, com um padrão só, continuam abrindo e gerando igual.

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica:** no fim da tela de relatório de ensaio, quadro "Relatórios de ensaio e planilhas de dados gerados: corrigir ou usar como base" (relatórios de ensaio e planilhas de dados emitidos). Cada linha mostra o número, a revisão (Rev. 00, Rev. 01...), a situação (Vigente ou Substituído pela Rev. NN), quem gerou e quando, e os botões "Abrir PDF", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Enviar para aprovação". A revisão passa pela aprovação do responsável técnico, como a primeira emissão; a revisão vigente continua valendo até a aprovação. Depois de aprovada, sai a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Enviar para aprovação". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.



Nestes documentos o número continua sendo o digitado no relatório (com o mesmo número, a emissão é a revisão seguinte, como antes); na correção pela lista o campo do número fica travado e o motivo entra no quadro "Histórico de revisões" do documento. Quem é responsável técnico pode emitir direto, marcando a conferência; quem não é envia para aprovação. As leituras e os arquivos do registrador voltam sem reimportar; as fotos do documento de origem voltam quando ele foi emitido direto, e precisam ser anexadas de novo quando ele passou pelo envio para aprovação (o quadro do alto avisa). Gere o rascunho de novo antes de emitir ou enviar. Relatórios de ensaio e planilhas emitidos antes de 21/10/2026 não guardaram os dados do formulário e não entram na lista: para corrigir um deles, preencha o formulário com o mesmo número (sai a revisão seguinte, agora com o histórico de revisões no documento).
