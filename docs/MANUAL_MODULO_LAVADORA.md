# Manual do Operador — Módulo Lavadoras (termodesinfectora e lavadora ultrassônica)

## O que mudou em 21/10/2026

O módulo foi revisto no mesmo molde da autoclave a vapor, com as regras próprias da lavadora.

- **O ensaio começa pelo cadastro.** Nas duas abas, o técnico busca o cliente e escolhe a unidade e a lavadora (quadro "Cliente e equipamento"). Cliente, CNPJ, endereço, TAG, número de série e local vêm do cadastro e ficam travados; marca e modelo não entram nos documentos. Equipamento de outro cliente ou de outra unidade é recusado. Sem cadastro, os botões "Cadastrar cliente", "Cadastrar unidade" e "Cadastrar equipamento" abrem o cadastro em outra aba; ao voltar, "Atualizar listas".
- **Falta no cadastro do equipamento (21/10/2026).** Se a TAG, o número de série ou o setor estiverem vazios no cadastro, o quadro "Cliente e equipamento" mostra "Falta no cadastro do equipamento: TAG, Nº de série, Setor" com os campos para preencher ali mesmo. Preencha pela placa ou pela etiqueta e toque em **Gravar no cadastro**: o valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. **Buscar nos ensaios anteriores** traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Valor já gravado não muda por aqui: a correção é em Cadastros › Equipamentos › Editar. Patrimônio, capacidade, câmaras e ano de fabricação, quando preenchidos no cadastro, também saem no relatório.
- **Pasta do equipamento.** Relatório de ensaio, planilha de dados e relatório de qualificação ficam em `Lavadora - Laudos/<CNPJ>/<TAG - tipo>/Qualificação`, dentro da pasta do cliente.
- **Temperatura programada obrigatória.** É a temperatura da receita no equipamento. Antes, sem ela, o sistema usava 20 °C e tratava o ciclo inteiro como desinfecção.
- **Fase de desinfecção pelo primeiro trecho quente.** A fase de desinfecção (ou o patamar do banho, na ultrassônica) é o primeiro trecho em que todos os sensores atingem e mantêm a temperatura programada. Antes era o trecho em volta do pico, que podia ser a secagem com ar quente.
- **A0 pela regra dos trapézios.** O A0 de cada sensor soma os intervalos reais entre leituras (antes somava um intervalo a mais: 10 min a 90 °C davam 6.100 s em vez de 6.000 s). Só conta a partir de 65 °C, do aquecimento da fase de desinfecção até o fim do patamar; a descida e a secagem não entram.
- **A "correção de letalidade" deixou de existir.** O A0 e o tempo do banho saem só das temperaturas medidas. A correção de temperatura do certificado do registrador continua nos ajustes avançados.
- **Fases do ciclo pelo perfil de temperatura.** Cada queda brusca da temperatura (água nova) abre uma etapa: pré-lavagem, lavagem, enxágue final e aquecimento, desinfecção, secagem. Antes os horários das fases eram inventados por proporção fixa.
- **Critérios decisivos e informativos**, cada um com a referência (seção 4).
- **Dados com problema não viram documento**: o sistema lista o que corrigir (o que aconteceu, por quê e como corrigir).
- **Aprovação do responsável técnico** para emitir o relatório de ensaio e a planilha de dados, com revisões.
- **Planilha de dados nova** em A4 paisagem (a antiga do Google Planilhas foi guardada e está desligada).
- **Relatório oficial novo** (aba "Relatório oficial", antes "Preencher modelo"): o relatório de qualificação do equipamento, que consolida os relatórios de ensaio emitidos. O formulário antigo foi guardado e desativado; só o Administrador o reativa.
- **Analisar pressão**: desligado por padrão (seção 3).
- **Um arquivo por sensor** (registradores individuais), alinhados pelo horário.

## 1. Para que serve

Para UM ciclo de uma lavadora, gera dois documentos com os mesmos números:

1. **Planilha de dados (A4 paisagem, HTML e PDF)** — capa, sumário, quadro-resumo dos critérios, condições e escopo, resultados por sensor e por fase, gráficos, memória de cálculo e todas as leituras.
2. **Relatório de ensaio de ciclo (A4 retrato)** — identificação, instrumentação, metodologia, critérios com o tipo e a fonte, escopo e limitações, fases do ciclo, resultados por sensor, gráficos, verificação dos critérios, análise, conclusão, responsabilidade técnica e anexos (memória do A0 na termodesinfectora, alinhamento dos registradores individuais, fotos).

Com os relatórios de ensaio emitidos, a aba "Relatório oficial" gera o **relatório de qualificação do equipamento** (QI, QO e QD), que vale para a ficha do equipamento, o QR code e a requalificação.

## 2. Quem decide o resultado

O resultado é calculado pelo sistema, sempre com as mesmas regras. A redação automática só explica os números; se citar um número que não está nos resultados, uma norma fora da lista, um número de cláusula, um resultado diferente do calculado, pressão num ensaio só de temperatura ou expressão proibida (como "aprovado com ressalvas"), é descartada e entra o texto padrão, montado só com os resultados.

## 3. Passo a passo (aba "Gerar relatório")

1. **Cliente e equipamento** — busque o cliente (nome ou CNPJ), escolha a unidade e a lavadora. O tipo do equipamento cadastrado já escolhe termodesinfectora ou ultrassônica.
2. **Seções 1 e 2** — programa, tipo de ensaio (QO sem carga, QD com carga, validação de limpeza, teste de cavitação, rotina), ciclo nº, lote e responsável técnico.
3. **Seção 3** — equipamento a validar, classificação do artigo (termodesinfectora), **temperatura programada** e quantidade de sensores. Desmarque só o sensor que falhou no ensaio e registre a falha.
   - **Analisar pressão (aspersão ou bomba)**: deixe desligado. O documento traz uma frase única no escopo: "Este ensaio considerou somente a temperatura; pressão de aspersão, dosagem de produtos químicos e qualidade da água não foram medidas nesta análise." Ligue só se o registrador gravou a pressão: ela aparece como informação, sem critério.
4. **Seção 4** — dados do registrador: arquivo único ou um arquivo por sensor (cada sensor marcado recebe o seu arquivo na grade da seção 3).
5. **Pré-visualizar dados** e confira datas, horas e temperaturas.
6. **Seção 5** — número do ensaio e identificação do registrador (TAG do cadastro de Padrões de referência).
7. **Gerar planilha de dados**. Responsável técnico: confirme a aprovação; a planilha abre em nova aba e fica salva na pasta do equipamento ("Abrir PDF da planilha de dados", "Abrir pasta do equipamento", "Enviar ao cliente"). Técnico: a minuta abre em outra aba e a planilha vai para **6. Aguardando aprovação**.
8. Fotos (opcional) e **Gerar rascunho da interpretação**. Se os dados tiverem problema, aparece a lista do que corrigir e nada é redigido.
9. Revise os textos.
   - **Técnico**: "Enviar para aprovação do responsável técnico".
   - **Responsável técnico** (Administrador, Diretoria, Gestor e Metrologia): marque "Conferi os dados, os critérios e os textos e aprovo a emissão" e "Aprovar e emitir"; ou, em **6. Aguardando aprovação**, "Ver prévia" (minuta, não entregar), "Aprovar e emitir" ou "Devolver" com o motivo.
10. Reemitir o mesmo número gera nova revisão; a anterior fica na pasta, marcada como substituída.

## 4. Critérios

| Critério | Requisito | Tipo | Referência |
|---|---|---|---|
| Fase de desinfecção (termodesinfectora) | Todos os sensores atingem e mantêm a temperatura programada | Decisivo | ABNT NBR ISO 15883-1 |
| A0 no pior sensor | ≥ 600 s (artigo semicrítico ou não crítico) ou ≥ 3.000 s (artigo crítico) | Decisivo | ABNT NBR ISO 15883-1 (conceito de A0, 80 °C, z = 10 °C) |
| Temperatura de desinfecção mantida | ≥ temperatura programada em todos os sensores na fase | Decisivo | ABNT NBR ISO 15883-1 |
| Faixa de referência superior | ≤ programada + 5 °C no patamar | Informativo | ABNT NBR ISO 15883-1 (valor a confirmar pelo responsável técnico) |
| Tempo de patamar | Medido | Informativo (decide só se o responsável técnico configurar o mínimo) | — |
| Diferença entre sensores, tempo de equilíbrio | Medidos | Informativos | Limite a definir pelo responsável técnico |
| Tempo e taxa de aquecimento | Medidos | Informativo | ABNT NBR 17130-1:2024 (informar e registrar) |
| Pré-lavagem (termodesinfectora) | ≤ 45 °C | Informativo | ABNT NBR ISO 15883-1 (valor a confirmar pelo responsável técnico) |
| Patamar do banho (ultrassônica) | Todos os sensores na programada − 3 °C | Decisivo | ABNT NBR 17130-1:2024 |
| Tempo no patamar do banho | ≥ 10 min | Decisivo | Protocolo do fabricante do equipamento |
| Temperatura do banho | Programada ± 3 °C | Decisivo | ABNT NBR 17130-1:2024 |
| Pré-enxágue (ultrassônica) | < 35 °C | Informativo | ABNT NBR 17130-1:2024 |

Critério informativo fora da referência não reprova: aparece como "Fora da referência (não decide)" e vira observação. Na ultrassônica, a tolerância de detecção do banho é a da configuração (3 °C), não a dos ajustes avançados.

## 5. Dados com problema (travas)

O documento não é emitido quando há: leitura impossível (fora de −5 °C a 150 °C), sensor parado enquanto os outros variam, pico isolado dentro da fase avaliada, menos de 5 leituras na fase, leitura faltando na fase, intervalo sem leitura maior que 3 vezes o normal, registrador sem cadastro, com certificado vencido ou sem validade. Cada aviso diz o que aconteceu, por quê e como corrigir (por exemplo, desmarcar o sensor que falhou e registrar a falha, ou exportar o arquivo de novo).

## 6. Relatório oficial (aba "Relatório oficial")

1. Escolha cliente, unidade e lavadora. Aparece a situação do equipamento e a lista dos relatórios de ensaio emitidos dele.
2. Marque os relatórios dos ciclos que fundamentam a qualificação (QO: sem carga ou teste de cavitação; QD: com carga ou validação de limpeza). Relatórios emitidos antes do vínculo aparecem em "Relatórios de ensaio sem vínculo" para ligar ao equipamento (só o vínculo é gravado).
3. Marque as etapas, o motivo e a periodicidade (padrão 12 meses). Na qualificação de instalação, responda todos os itens (os itens só de termodesinfectora ou só de ultrassônica aparecem conforme o tipo).
4. Ensaios complementares (opcional): limpeza, proteína residual, água do enxágue final, cavitação. Resultado não conforme reprova.
5. **Gerar rascunho**: o resultado é calculado por regra (uma não conformidade decisiva reprova). Revise a conclusão, veja a prévia e **Enviar para aprovação**.
6. O responsável técnico confere a prévia, marca a confirmação e **Aprovar e emitir**, ou devolve com o motivo. O documento (número RQL-aaaa-nnnnn) fica na pasta do equipamento, entra no Arquivo de documentos com o vencimento da requalificação, aparece na ficha do equipamento e no QR code, e gera a pendência de requalificação 30 dias antes do vencimento. "Enviar ao cliente" fica no próprio relatório emitido. "Nova revisão" reabre o relatório emitido.

## 7. Configuração (só o responsável pelo sistema)

- **LAVREL_PLANILHA_MODELO = ANTERIOR** em Chaves e senhas religa a planilha antiga do Google Planilhas.
- **LAVADORA_MODELO_OFICIAL** (o Administrador escolhe na própria aba "Relatório oficial") religa o formulário antigo.
- Os critérios ficam em `SGO_LavRel_Config.js` (CICLOS, CRITERIOS_REFERENCIAS, CONFIRMAR_RT).

## 8. Para o responsável técnico confirmar

- A0 mínimo de 600 s e 3.000 s pela classificação do artigo (decisão do dono de 17/10/2026).
- Limite de 65 °C e janela da soma do A0 (aquecimento até o fim do patamar, sem descida e secagem).
- Faixa de referência superior de programada + 5 °C (informativa) e pré-lavagem até 45 °C (informativa).
- Limites de uniformidade, equilíbrio e tempo mínimo de patamar da termodesinfecção (hoje só medidos).
- Ultrassônica: 10 min no patamar (protocolo do fabricante), ±3 °C e pré-enxágue abaixo de 35 °C (ABNT NBR 17130-1:2024).
- Edição da ABNT NBR ISO 15883-1 em vigor e adoção da Parte 2 pela ABNT (citada como ISO 15883-2, referência técnica).
- Periodicidade padrão de 12 meses.

## 9. Perguntas frequentes

- **O mesmo ensaio aprovou como semicrítico e reprovou como crítico.** Está correto: o mínimo de A0 muda com a classificação do artigo.
- **A secagem com ar quente entra no A0?** Não. Só o aquecimento e o patamar da fase de desinfecção.
- **A lavadora ultrassônica tem a cavitação medida?** Não. O registrador mede a temperatura do banho; a cavitação é verificada por teste próprio, que pode ser registrado no relatório oficial.
- **Existe "aprovado com alerta"?** Não. Critério decisivo não atendido reprova; informativo fora da referência vira observação.
