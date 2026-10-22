# Manual do Operador — Módulo Lavadoras (termodesinfectora e lavadora ultrassônica)

## O que mudou em 21/10/2026

O módulo foi revisto no mesmo molde da autoclave a vapor, com as regras próprias da lavadora.

- **O ensaio começa pelo cadastro.** Nas duas abas, o técnico busca o cliente e escolhe a unidade e a lavadora (quadro "Cliente e equipamento"). Cliente, CNPJ, endereço, TAG, número de série, local, fabricante (marca) e modelo vêm do cadastro, ficam travados e saem nos documentos. Equipamento de outro cliente ou de outra unidade é recusado. Sem cadastro, os botões "Cadastrar cliente", "Cadastrar unidade" e "Cadastrar equipamento" abrem o cadastro em outra aba; ao voltar, "Atualizar listas".
- **Falta no cadastro do equipamento (21/10/2026).** Se a TAG, o número de série ou o setor estiverem vazios no cadastro, o quadro "Cliente e equipamento" mostra "Falta no cadastro do equipamento: TAG, Nº de série, Setor" com os campos para preencher ali mesmo. Preencha pela placa ou pela etiqueta e toque em **Gravar no cadastro**: o valor vai para o cadastro do equipamento (só o que está vazio, com registro de quem gravou) e o ensaio continua. **Buscar nos ensaios anteriores** traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Valor já gravado não muda por aqui: a correção é em Cadastros › Equipamentos › Editar. Patrimônio, capacidade, câmaras e ano de fabricação, quando preenchidos no cadastro, também saem no relatório de qualificação. Patrimônio, capacidade, câmaras e ano de fabricação, quando preenchidos no cadastro, também saem no relatório. Os campos marcados **do cadastro** nas outras seções (por exemplo, TAG, número de série e setor em "2. Equipamento") têm fundo cinza e um cadeado: ao clicar, a tela explica de onde vem o dado e oferece **Escolher o equipamento** (quando nenhum foi escolhido), **Preencher no cadastro** (quando o dado está vazio no cadastro) ou **Abrir o cadastro de equipamentos** (para corrigir um valor já gravado). Sem equipamento escolhido, a seção avisa no topo; os demais campos da seção são do ensaio e continuam editáveis.
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

## O que mudou em 22/10/2026 (identificação completa e vários padrões)

- **Identificação do equipamento completa.** Escolhido o equipamento, tudo o que está preenchido em Cadastros › Equipamentos sai no documento: tipo, fabricante (marca), modelo, nº de série, TAG, patrimônio, setor, capacidade, câmaras ou portas e ano de fabricação. Campo preenchido no cadastro fica travado na tela, com a explicação de onde corrigir (Cadastros › Equipamentos › Editar); campo vazio no cadastro pode ser completado no quadro "Cliente e equipamento", em "Gravar no cadastro" (só grava o que está vazio). Linha vazia não aparece no documento.
- **Vários padrões de referência.** Abaixo de "Identificação do registrador", toque em "Escolher padrões" e marque todos os registradores e padrões usados (busca por TAG, descrição, fabricante ou certificado; sem limite, 1 ou 20). A identificação é preenchida sozinha, separada por vírgula (também pode ser digitada). O relatório de ensaio, a planilha de dados e o relatório de qualificação trazem uma tabela com cada padrão: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade, incerteza e a situação na data do ensaio. Um padrão vencido na data do ensaio impede a emissão e a trava diz qual é.
- Documentos e rascunhos antigos, com um padrão só, continuam abrindo e gerando igual.

## Relatório de qualificação: corrigir ou usar como base (21/10/2026)

Na lista de relatórios de qualificação do equipamento, "Abrir para corrigir" carrega um relatório emitido com tudo o que foi usado (etapas, lista de verificação, relatórios de ensaio marcados e textos). Ajuste, gere o rascunho, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres) e envie: a revisão volta para a aprovação do responsável técnico e, aprovada, sai com o mesmo número e a revisão seguinte; o registro de revisões do documento traz o motivo e a revisão anterior fica guardada como substituída.

"Usar como base" copia os dados de um relatório emitido para um relatório novo (por exemplo, a requalificação do ano seguinte): confira etapas, datas e relatórios de ensaio marcados, gere o rascunho e envie; o número novo é atribuído no envio e o relatório de origem não muda.

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
