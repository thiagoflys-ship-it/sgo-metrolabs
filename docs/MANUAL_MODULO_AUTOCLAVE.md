# Manual do Operador — Módulo Autoclave a vapor (qualificação térmica)

## O que mudou em 20/10/2026

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

1. **Relatório de dados (planilha, PDF em paisagem)** — todas as leituras, estatísticas e gráficos.
2. **Relatório de ensaio térmico (A4)** — capa, sumário, identificação, instrumentação, metodologia, critérios com a referência de cada um, escopo e limitações, resultados, gráficos, não conformidades, análise, conclusão, responsabilidade técnica e anexos.
3. **Memória de cálculo do F0 (A4)** — leitura a leitura, a conta do F0 de cada sensor.

Todos ficam salvos na pasta do cliente (subpasta do CNPJ), em PDF; o relatório de ensaio e a memória também em HTML A4. O botão "Enviar ao cliente" fica na faixa verde que aparece no topo do documento.

## 2. Quem decide o resultado

O resultado (aprovado, reprovado ou informativo) é calculado pelo sistema, sempre com as mesmas regras. A redação automática só explica os números; ela nunca decide. Se o texto redigido citar um número que não está nos resultados, uma norma fora da lista, um número de cláusula, um resultado diferente do calculado ou uma expressão proibida, ele é descartado e entra o texto padrão, montado só com os resultados.

## 3. Passo a passo

1. **Seção 1 e 2** — cliente (CNPJ e "Buscar"), ensaio e equipamento.
2. **Seção 3** — escolha o ciclo (121 °C, 127 °C ou 134 °C), a temperatura programada e a quantidade de sensores. Desmarque só o sensor que falhou no ensaio (e registre a falha). Informe a remoção de ar.
   - **Analisar pressão**: deixe ligado. Desligue apenas quando não foi possível instalar o transmissor de pressão e escreva a justificativa (exemplo: "equipamento sem ponto para instalar o transmissor de pressão").
   - **Sensor de referência da câmara** (opcional): o número do sensor junto ao dreno.
3. **Seção 4** — dados do registrador:
   - **Arquivo único**: "Enviar arquivo ou informar o link" e escolha o arquivo (CSV, planilha ou texto). O link é preenchido sozinho.
   - **Um arquivo por sensor**: escolha o arquivo de cada sensor na grade da seção 3. Se a pressão estiver em registrador separado, envie em "Arquivo do registrador de pressão". As leituras são alinhadas pelo horário; a prévia mostra quantas leituras de cada sensor ficaram sem par e a maior diferença de relógio.
4. **Pré-visualizar dados** e confira datas, horas e temperaturas.
5. **Gerar relatório de dados (planilha)**.
6. **Seção 5** — número do ensaio, identificação do registrador (TAG do cadastro de Padrões de referência), fotos (opcional) e **Gerar rascunho da interpretação**.
7. Revise os textos.
   - **Técnico**: "Enviar para aprovação do responsável técnico".
   - **Responsável técnico** (perfis Administrador, Diretoria, Gestor e Metrologia): marque "Conferi os dados, os critérios e os textos e aprovo a emissão" e "Aprovar e emitir"; ou, em **6. Aguardando aprovação**, "Ver prévia" (minuta, não entregar), "Aprovar e emitir" ou "Devolver" com o motivo.
8. **Gerar a memória do F0**, se precisar explicar o F0 ao cliente.

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

- Cada emissão grava um registro (tabela QUALIF_EMISSOES): número, revisão, resultado, quem enviou, quem aprovou, data e hora, arquivos.
- Emitir de novo o mesmo número gera a revisão seguinte; a anterior fica marcada como substituída e o arquivo continua na pasta do cliente.

## 8. Normas citadas

RDC ANVISA nº 15/2012; ABNT NBR ISO 17665-1; ISO/TS 17665-2; ABNT NBR 11816; EN 285 e EN 13060 (referência técnica de ensaios); ABNT NBR ISO 11140 (indicadores químicos, inclui o do Bowie-Dick); ABNT NBR ISO 11138 (indicadores biológicos). A ABNT NBR 16328, citada em versões anteriores, saiu do relatório: no SGO+ ela é a referência do módulo Cadeia de Frio (equipamentos de refrigeração) e aguarda a confirmação do responsável técnico.

## 9. Perguntas frequentes

- **Por que o F0 mudou um pouco em relação aos relatórios antigos?** A soma agora usa o intervalo real entre leituras (regra dos trapézios). O método antigo contava um intervalo a mais e dava F0 maior.
- **O ciclo de 121 °C por exatamente 15 min a 121,0 °C reprova?** O F0 desse ciclo é 14,66 min, abaixo do mínimo configurado de 15,00 min; por decisão de 17/10/2026, abaixo do mínimo reprova. O responsável técnico pode rever o mínimo na configuração.
- **Existe "aprovado com alerta"?** Não.
