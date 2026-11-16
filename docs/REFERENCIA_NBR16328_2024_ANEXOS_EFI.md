# Referência normativa — ABNT NBR 16328:2024 (Anexos E, F, I)

**Documento de consulta permanente.** Fonte: texto literal da norma (3ª edição, 29.02.2024, ISBN 978-85-07-10043-0, 62 páginas), enviado pelo usuário em 2026-07-21. Este documento existe para nunca mais precisarmos reconstruir de memória o que a norma diz — qualquer decisão de código sobre o módulo Estufa+Banho-maria deve ser conferida aqui primeiro.

**Como usar**: antes de implementar/alterar qualquer regra de negócio do módulo `gerador_estufa_banhomaria_relatorio`, ler a seção do anexo correspondente aqui. Se a resposta não estiver aqui, é porque a norma não especifica — não inventar, perguntar ao usuário.

---

## 0. Estrutura geral da norma

Escopo (seção 1): a norma cobre autoclaves, lavadoras e desinfetadoras, **estufas de esterilização e despirogenização**, **estufas de incubação**, refrigeradores, freezers, câmaras frias e ultrafreezers, câmaras climáticas, **banho-maria**, lavadoras ultrassônicas, liofilizadores, tanques e reatores, túnel de esterilização e despirogenização, estufa a vácuo.

Cada tipo de equipamento tem seu próprio anexo (C a N). **Status normativo/informativo de cada um** (importante — muda o peso jurídico/técnico do anexo):

| Anexo | Equipamento | Status |
|---|---|---|
| C | Autoclaves | normativo |
| D | Lavadoras e desinfetadoras | normativo |
| **E** | **Estufas de esterilização e despirogenização** | **normativo** |
| **F** | **Estufas de incubação** | **informativo** |
| G | Refrigeradores, freezers, câmaras frias, ultrafreezers | informativo |
| H | Câmaras climáticas | informativo |
| **I** | **Banho-maria** | **informativo** |
| J | Lavadoras ultrassônicas | informativo |
| K | Liofilizadores | normativo |
| L | Tanques e reatores | informativo |
| M | Túnel de esterilização e despirogenização | normativo |
| N | Estufa a vácuo | informativo |

**Implicação prática**: o Anexo E (o único com letalidade, no nosso módulo) é a única exigência **mandatória** dos três que implementamos — F e I são recomendação/boas práticas ("convém que"), não obrigação estrita ("deve"). Isso não muda o que o software faz, mas muda o peso da linguagem no laudo/certificado (E pode falar "exigido pela norma"; F/I é mais correto falar "recomendado pela norma").

---

## 1. Seções gerais (1 a 17) — aplicam a qualquer equipamento, inclusive os nossos 3 anexos

**Seção 15 — Medições termométricas** (a regra geral de sensores, ANTES de entrar nos anexos específicos):

> "Devem ser utilizados no mínimo 12 termopares para equipamento com volume interno maior ou igual 60 L. Em equipamentos com volume menor que 60 L, devem ser utilizados no mínimo 3 termopares ou 3 sensores sem fio. Para equipamentos conjugados (por exemplo, refrigerador com freezer), distribuir no mínimo 12 termopares no equipamento, contemplando as duas partes, quando aplicável, considerar o volume de cada compartimento, a fim de determinar uma quantidade maior que 12 termopares. **Ao término de cada estudo todos os sensores devem estar em funcionamento e todos os dados devem fazer parte do relatório final. Não é permitido desconsiderar qualquer sensor do relatório final.**"

Essa é a regra **geral** (volume-condicionada). **Mas cada anexo específico (E, F, I) declara seu próprio mínimo fixo**, sem condicionar a volume — ver seções 2-4 abaixo. Entendimento adotado: a instrução do anexo específico (mais específica) prevalece sobre a regra geral de volume. Isso **confirma que a decisão de remover a lógica de volume/conjugado do sistema estava certa** para os 3 anexos deste módulo — nenhum dos três (E, F, I) condiciona o mínimo a volume no texto do próprio anexo.

**Importante, achado novo**: "Não é permitido desconsiderar qualquer sensor do relatório final" — isso é uma regra explícita que o **sistema já cumpre** (o motor sempre inclui todos os sensores ativos nas estatísticas; não há mecanismo de "excluir sensor do relatório" em lugar nenhum do código). Confirmado, sem ação necessária.

**Seção 16 — Periodicidade**: qualificação térmica deve ocorrer anualmente, ou antes disso após manutenção que impacte funções do equipamento — isso é regra de processo do cliente (agenda de reensaio), não algo que o software valida.

**Anexo B.3 — Anexos que devem fazer parte do relatório final** (aplica a todos os equipamentos):
> a) fotos ou diagramas das cargas, com indicação do local dos sensores;
> b) gráficos dos estudos;
> c) certificados de calibração de todos os instrumentos;
> d) **resultados e certificados dos indicadores biológicos**, quando aplicável;
> e) resultados e especificação dos indicadores químicos, quando aplicável;
> f) **registro impresso dos ciclos do equipamento, para esterilizadoras, estufas de despirogenização e lavadora desinfetadora. Para os demais equipamentos, este registro é necessário somente quando eles possuírem impressora.**

**ACHADO NOVO — gap real no sistema**: item (f) exige, **de forma obrigatória** (não condicional a ter impressora), um registro impresso do próprio ciclo do equipamento para **estufas de despirogenização** (ou seja, quando o perfil `ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO` estiver no modo `DESPIROGENIZACAO`). O sistema hoje só tem upload do laudo do indicador biológico/endotoxina (item d) — **não tem campo para anexar o registro impresso do próprio ciclo do equipamento** (item f). Isso é uma pendência real a resolver (ver seção 5).

---

## 2. Anexo E — Estufas de esterilização e despirogenização (NORMATIVO)

### E.3 Instalação dos sensores
- Sensores por entrada apropriada (flange) no equipamento.
- Comprimento suficiente pra alcançar o carrinho na entrada do equipamento e fechar o flange.

### E.4 Estudo de distribuição de temperatura (ciclo em vazio)
- **Mínimo 12 sensores**, um obrigatoriamente adjacente ao sensor de controle do equipamento.
- Verificar que sensores não tocam a superfície da câmara interna; distância mínima 3cm das laterais.
- Quando aplicável: livre circulação de ar entre cargas; não usar base inferior salvo recomendação do fabricante.
- Documentar fotograficamente/graficamente a posição dos sensores.
- **Registrar a cada 30 s** durante todo o ciclo.
- Anexar: temp máx/mín/média; indicação máx-mín/média-mín/máx-média; tempo total; gráfico de temperatura.
- **Repetir todo o procedimento 3 vezes** (reprodutibilidade).

### E.5 Estudo de penetração de temperatura (ciclo com carga)
- **Mínimo 12 sensores**: 1 adjacente ao controle + **11 dentro da carga**.
- **Colocar um indicador biológico OU endotoxina, posicionado dentro da carga, em ao menos um ciclo de cada tipo de carga.** (nota: convém colocar o indicador junto a CADA sensor posicionado dentro da carga — não só um)
- Documentar; registrar a cada 30 s durante todo o ciclo.
- Anexar: temp máx/mín/média; indicações; tempo total; **cálculos de letalidade FH**; gráfico de temperatura E de letalidade.
- **Repetir todo o procedimento 3 vezes.**

**Confirmações do que já está certo no código:**
- `minSensores: 12` para `ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO` ✅
- 3 repetições obrigatórias em ambos os estudos (`ebAnalisarDistribuicaoVazioE_`/`ebAnalisarPenetracaoELetalidade_` exigem exatamente 3) ✅
- Indicador biológico OU endotoxina (nunca os dois ao mesmo tempo) — `tipoLetalidade: ESTERILIZACAO | DESPIROGENIZACAO` ✅
- Sem abertura de porta/queda de energia neste anexo (não mencionados em E.4/E.5) — `estudosDisponiveis` correto ✅
- Cálculo de letalidade FH (e FD, por analogia de despirogenização — ver ressalva na seção 4 abaixo) ✅

**Gaps/ações identificados:**
1. Registro impresso do ciclo do próprio equipamento (Anexo B.3.f) é **obrigatório** para estufa de despirogenização — falta campo de upload no formulário (ver seção 5).
2. Nota "convém colocar o indicador biológico/endotoxina **junto a cada sensor** posicionado dentro da carga" — hoje o sistema só coleta **um resultado de indicador por repetição** (não por sensor/posição dentro da carga). Isso é uma simplificação deliberada — a norma diz "convém" (recomendação, não "deve"), mas é uma limitação real a ter em mente se o cliente quiser granularidade por posição.

---

## 3. Anexo F — Estufas de incubação (INFORMATIVO)

### F.4 Estudo de distribuição de temperatura (em vazio)
> "As medições realizadas com o equipamento sem carga (em vazio) podem ocorrer somente na instalação do equipamento. Nas requalificações futuras, as medições podem ser realizadas com carga... Convém que o estudo de penetração seja realizado somente para aqueles processos que forem requeridos."

- **Mínimo 12 sensores**, um adjacente ao controle.
- Distância mínima 3cm; circulação de ar; base inferior (mesmas regras de E).
- **Registrar a cada 60 s, durante 24h CONSECUTIVAS**, a partir da estabilização do equipamento.
- Anexar: temp máx/mín/média; indicações; tempo total; gráfico.

*(Nota de curiosidade, não uma ação: o texto da norma neste ponto traz literalmente "Convém desligar o equipamento para instalação dos sensores de monitoramento, para evitar sobrecarga do compressor" — um resíduo copiado do Anexo G [refrigeradores], já que estufa de incubação não tem compressor. Aparentemente um artefato de cópia da própria norma, não do nosso software.)*

### F.5 Estudo de distribuição de temperatura (ciclo com carga)
- Mesma estrutura de F.4, mas 11 sensores dentro da carga + 1 adjacente ao controle.
- Mesma cadência de 60s / 24h consecutivas.

### F.6 Estudo de abertura de porta
- Mesma montagem de F.4/F.5. **Registrar a cada 10 s** (não 60s!) durante todo o estudo.
- Iniciar só quando todos os sensores estiverem dentro da faixa de trabalho.
- Abrir a porta, manter por tempo determinado, fechar, aguardar retorno de TODOS os sensores à faixa.
- Registrar: tempo até o primeiro sensor sair da faixa (se saiu); tempo até todos retornarem.
- NOTA: monitorar por no mínimo 5 min pra demonstrar estabilidade.

### F.7 Estudo de queda de energia
- Mesma montagem de F.5, porta fechada. **Registrar a cada 10 s.**
- Simular falha de energia; monitorar até algum sensor atingir o limite.
- Registrar: tempo total que o equipamento mantém as condições sem energia.
- NOTA: monitorar por no mínimo 5 min.

**Confirmações do que já está certo:**
- `minSensores: 12` para `ESTUFA_INCUBACAO`, **flat, sem condição de volume** — isso **responde definitivamente a pergunta que você fez sobre a estufa de 40-50L**: a norma exige 12 sensores independente do volume declarado, mesmo numa estufa pequena. Não existe uma exceção de volume para este anexo (a regra de volume da seção 15 é a regra geral que os anexos específicos substituem). ✅
- Abertura de porta e queda de energia fazem parte do anexo ✅
- Sem letalidade, sem indicador biológico ✅
- Rótulo dinâmico "24h" vs "protocolo" que corrigi ontem está certo — F realmente é 24h consecutivas (informativo = recomendado, mas é o valor que a norma dá) ✅

**Gap identificado:**
1. F.6/F.7 pedem registro a cada **10 s**, diferente dos 60s de F.4/F.5 — o sistema não valida/exige isso (aceita qualquer intervalo do datalogger), o que é aceitável já que é instrução de campo, não de software. Só registrar aqui para não esquecer que existe essa diferença.

---

## 4. Anexo I — Banho-maria (INFORMATIVO)

### I.2 Lista de verificação geral (específica deste anexo)
- Verificar se o equipamento possui **líquido em quantidade suficiente** para todo o estudo.
- Verificar **indicação da condição de operação quanto à utilização de tampa ou não**, durante o ensaio.
- "Caso o equipamento possua transmissor de ultrassom, conduzir os ensaios com parametrizadores físicos que demonstrem sua eficácia." (não aplicável ao nosso escopo atual — banho-maria com ultrassom é caso especial não modelado)

### I.4 Estudo de distribuição de temperatura (em vazio)
- **Mínimo 6 sensores dentro da CUBA**, um adjacente ao controle.
- Distância mínima 3cm.
- **Registrar a cada 30 s**, durante o **TEMPO PREDETERMINADO** do estudo (não é 24h fixo), a partir da estabilização.
- **"Pode ser considerado estudo em TRIPLICATA, SE PERTINENTE"** — ou seja, ao contrário do Anexo E (onde a triplicata é mandatória, "repetir três vezes"), aqui é opcional/a critério técnico.
- Anexar: temp máx/mín/média; indicações; tempo total; gráfico.

### I.5 Estudo de distribuição de temperatura (com carga)
- Mesma estrutura, "convém que seja realizado somente para aqueles processos que forem requeridos".
- Quando aplicável: livre circulação de **líquido** entre as cargas (não "ar" — faz sentido, é líquido).
- Mesma cadência de 30s, mesma observação de triplicata opcional.

**Confirmações do que já está certo:**
- `minSensores: 6` para `BANHO_MARIA`, sem condição de volume ✅
- Sem abertura de porta/queda de energia (não mencionados) ✅
- Duração "tempo predeterminado", não 24h fixo — rótulo dinâmico que corrigi ontem está certo ✅
- Decisão de NÃO implementar um mecanismo de 3 repetições obrigatórias para Banho-maria (ao contrário do Anexo E) está certa, porque a norma diz "se pertinente", não "deve" — confirmado ✅

**Gaps/observações identificados:**
1. Não há campo no formulário para registrar **"utiliza tampa ou não durante o ensaio"** (I.2.f) — dado que a norma pede explicitamente que conste essa indicação. Vale um campo simples de texto/checkbox.
2. Não há campo para indicar **quantidade de líquido na cuba** (I.2.e, "quantidade suficiente para todo o estudo") — provavelmente é só uma verificação de checklist do técnico antes do ensaio, não precisa virar campo obrigatório no sistema, mas pode ser um item de checklist informativo.
3. Não há mecanismo de "consulta biológico/ultrassom" pra banho-maria com transdutor de ultrassom — fora do escopo atual, não é uma prioridade.

---

## 5. Ações resultantes desta leitura (o que muda no código)

| # | Achado | Ação | Prioridade |
|---|---|---|---|
| 1 | Estufa de 40-50L exige 12 sensores mesmo assim (norma não reduz por volume neste anexo) | Nenhuma — já implementado corretamente | — resolvido, só documentar |
| 2 | Registro impresso do ciclo do equipamento é obrigatório (não condicional) para Anexo E, modo despirogenização | Adicionar campo de upload "Registro impresso do ciclo (obrigatório para despirogenização)" no formulário da Penetração com Carga (Anexo E) | Alta |
| 3 | Banho-maria: falta campo "utilizou tampa durante o ensaio?" | Adicionar checkbox/campo no formulário do Anexo I | Média |
| 4 | Anexo F é INFORMATIVO, Anexo E é NORMATIVO — o texto do laudo/certificado não diferencia isso | Considerar ajustar a linguagem do laudo (E = "exigido pela norma", F/I = "conforme orientação da norma") | Baixa/estética |
| 5 | "Não é permitido desconsiderar sensor do relatório final" | Já cumprido, sem ação | — resolvido |

---

## 6. Perguntas que ESTA leitura não respondeu (ainda em aberto)

A norma não traz, em nenhum dos três anexos (E, F, I), os **valores de tBase/z** para o cálculo de letalidade FH/FD — isso confirma que o valor usado no sistema (170°C/z=20 para esterilização, 250°C/z=46,4 para despirogenização) **continua sendo o padrão internacional pesquisado**, não algo extraído desta norma. A NBR 16328 só pede "cálculos de letalidade, FH" (E.5.f) sem definir a fórmula/parâmetros — a fórmula em si vem de outra referência (ISO 20857 etc., já citada no plano). Nenhuma mudança necessária aqui, só reforça que a ressalva que já fazíamos sobre isso continua válida.
