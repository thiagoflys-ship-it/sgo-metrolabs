# Manual do Operador — Módulo Declaração de Execução de Serviço

## O que mudou em 21/10/2026 (busca no cadastro)

- **Buscar no cadastro (opcional).** Acima de "1. Cliente" há o quadro "Buscar no cadastro": busque o cliente pelo nome ou CNPJ, escolha a unidade e o equipamento. Cliente, CNPJ, endereço, TAG, modelo e localização (unidade e setor) entram nos campos que estão vazios ou que foram preenchidos automaticamente; o que você digitou não muda. A marca não vem do cadastro. O número de série do cadastro vai junto e sai no documento (enquanto a TAG da tela for a do equipamento escolhido).
- Se o equipamento não estiver no cadastro, use "Cadastrar equipamento" no próprio quadro (abre em outra aba) e depois "Atualizar listas". Sem escolher nada, a tela funciona como antes, com digitação livre.
- Se faltar TAG, número de série ou setor no cadastro, o quadro mostra "Falta no cadastro do equipamento" com os campos para preencher ali mesmo e "Gravar no cadastro" (só o que está vazio, com registro de quem gravou).

## O que mudou em 18/10/2026 (documento A4)

- A declaração sai em seções numeradas: identificação, introdução, metodologia, calibrações realizadas (Tabela 1 com itens, quantidades e observações), referências normativas e, no fim, a declaração com a data de emissão e as assinaturas na mesma página. As normas aparecem uma vez só.
- O documento é salvo na pasta do cliente, numa subpasta com o CNPJ (14 dígitos), com o nome "Declaracao de execucao - número - TAG - data e hora", em PDF e em HTML. As declarações antigas, na pasta com o nome do cliente, continuam aparecendo em "Documentos já gerados".

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- O documento é salvo sozinho na pasta do cliente ao ser gerado. Se falhar, aparece o botão "Tentar salvar de novo". Sem IA, os campos de revisão vêm com texto padrão e um aviso.


### Registro de que o serviço técnico foi executado — 15 tipos de equipamento, sem veredito de conformidade

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de engenharia ou metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também. Quando terminar a seção 13 (Passo a Passo), você já vai ter feito uma declaração inteira, do início ao fim.

Se em algum momento aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 15) — todo termo técnico do manual está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você preenche quem é o cliente, qual equipamento foi atendido, o que foi feito nele (metodologia, calibrações realizadas, fotos) e o sistema **escreve um documento inteiro, com texto técnico redigido por Inteligência Artificial**, pronto para você revisar e entregar ao cliente.

Este documento é uma **Declaração de Execução de Serviço** — ele registra que o técnico esteve lá e executou o atendimento, exatamente como foi conduzido. Ele **nunca diz se o equipamento está aprovado ou reprovado** — esse é sempre um documento diferente (o relatório técnico de qualificação/calibração), gerado à parte. Misturar os dois é proibido de propósito: a Declaração é sobre o que foi **feito**, não sobre o **resultado**.

---

## 2. Os 15 tipos de equipamento (perfis)

Antes de tudo, você escolhe **um** destes tipos na tela (campo "Equipamento", seção 2). Essa escolha muda automaticamente **quais itens de calibração aparecem** na seção 3 — cada tipo de equipamento tem sua própria lista de peças calibráveis.

| Perfil que você escolhe | Exemplo de itens calibráveis que aparecem |
|---|---|
| **Autoclave a Vapor** | Válvula de Segurança, Manômetro, Manovacuômetro, Sensor de Temperatura, Pressostato, Transdutor de Pressão |
| **Câmara de Conservação** | Sensores de temperatura da câmara |
| **Câmara Fria** | Sensores de temperatura da câmara |
| **Refrigerador** | Sensores de temperatura |
| **Freezer / Ultrafreezer** | Sensores de temperatura |
| **Centrífuga (sem refrigeração)** | Temporizador/Cronômetro do ciclo, Indicador de Rotação (RPM) |
| **Centrífuga Refrigerada** | Temporizador/Cronômetro do ciclo, Indicador de Rotação (RPM), Sensor de Temperatura |
| **Termodesinfectora / Lavadora Desinfetadora Automática** | Itens específicos do processo de termodesinfecção |
| **Lavadora Ultrassônica** | Itens específicos do processo de cavitação/limpeza |
| **Esterilizador a Peróxido de Hidrogênio (Gás Plasma)** | Itens específicos do processo |
| **Esterilizador a Óxido de Etileno (ETO)** | Itens específicos do processo |
| **Esterilizador a Vapor de Baixa Temperatura e Formaldeído (VBTF)** | Itens específicos do processo |
| **Capela de Fluxo Laminar** | Itens específicos da capela |
| **Seladora de Grau Cirúrgico** | Itens específicos da seladora |
| **Incubadora de Testes Biológicos** | Itens específicos da incubadora |

**Você não precisa decorar essa tabela.** Assim que você escolhe o equipamento na tela, o sistema já mostra sozinho a lista certa de itens calibráveis daquele perfil — você só marca os que foram realmente calibrados neste atendimento.

---

## 3. Mapa da tela — visão geral

A tela é dividida em blocos, de cima para baixo:

1. **Cliente** — quem é o dono do equipamento.
2. **Equipamento** — qual equipamento foi atendido, com quais dados.
3. **Declaração de Execução** — o que foi feito (metodologia, calibrações, fotos) e o botão que gera o rascunho com IA.
4. **Revisão dos textos** (só aparece depois de gerar o rascunho) — onde você lê e ajusta o que a IA escreveu, antes de confirmar.
5. **Documentos já gerados** — busca de declarações antigas, sem precisar gerar de novo.

---

## 4. Seção 1 — Cliente

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **CNPJ** | Número de identificação da empresa cliente | Preenche automaticamente nome e endereço do cliente | Digite o CNPJ e clique em "Buscar CNPJ" |
| **Buscar CNPJ** (botão) | Dispara a busca automática | Evita digitar nome/endereço manualmente | Clique depois de digitar o CNPJ |
| **Cliente / Razão Social** | Nome oficial da empresa | Aparece na capa do documento | Confira se veio certo depois da busca automática; se a busca falhar, digite manualmente |
| **Endereço** | Endereço da empresa | Aparece na capa do documento | Mesma lógica do campo acima |

**O que acontece se eu deixar em branco?** O documento é gerado do mesmo jeito, mas fica com campos vazios na capa. Preencha sempre antes de gerar o documento final.

---

## 5. Seção 2 — Equipamento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Equipamento** (dropdown) | O tipo de equipamento atendido (ver seção 2 deste manual) | Define quais itens calibráveis aparecem na seção 3 | Escolha o tipo certo **antes** de marcar as calibrações — trocar depois muda a lista de itens |
| **TAG / Identificação** | Código interno do equipamento no cliente | Identifica qual equipamento específico foi atendido | Copie do equipamento físico ou peça ao cliente |
| **Marca** | Fabricante do equipamento | Informação de identificação no documento | Digite o nome do fabricante |
| **Modelo** | Modelo do equipamento | Informação de identificação no documento | Digite o modelo |
| **Localização** | Onde o equipamento fica fisicamente (sala, setor) | Ajuda a rastrear o equipamento no cliente | Digite o local |
| **Data de início** | Data em que o atendimento começou | Aparece no documento | `dd/MM/aaaa` |
| **Data de fim** | Data em que o atendimento terminou | Aparece no documento | Deixe em branco se o atendimento foi feito em **um único dia** |
| **Técnico executor** | Nome de quem realizou o atendimento | Aparece como responsável pela execução no documento | Digite o nome completo |

### Local do atendimento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Realizado no laboratório da Metrolab's** (caixa de marcar) | Diz se o atendimento foi feito no laboratório ou nas instalações do cliente | Muda a redação do documento (menciona onde o serviço foi realizado) | **Deixe desmarcado** no caso mais comum (atendimento em campo, na casa do cliente). Marque só quando o equipamento foi trazido até o laboratório da Metrolab's |

---

## 6. Seção 3 — Declaração de Execução

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Metodologia** | Texto livre descrevendo como o atendimento foi conduzido | Vira a base para a IA escrever a seção "Metodologia" do documento | Descreva o procedimento seguido, instrumentos padrão usados, sequência de verificação. Quanto mais detalhe real você der aqui, mais rico e específico sai o texto da IA |
| **Calibrações realizadas** (lista de itens, muda por perfil) | Cada peça calibrável do equipamento escolhido (ver seção 2) | Registra o que foi de fato calibrado neste atendimento | Marque a caixa de cada item calibrado; ajuste a **quantidade** (padrão 1) se mais de uma peça igual foi calibrada; preencha o **achado técnico** só se algo estiver fora do padrão (ex.: vazamento, desgaste, corrosão) — deixe em branco se estava tudo normal |
| **Registros fotográficos** (até 4, opcional) | Fotos do atendimento, cada uma com legenda opcional | Ilustra o documento com evidência visual | Anexe as fotos relevantes; a legenda é livre, só um complemento |
| **Número do documento** (opcional) | Código de referência interno, se sua empresa usar um | Numeração/controle interno | Preencha só se tiver um código — a data já aparece sozinha no documento, não repita a data aqui |

**O que acontece se eu não marcar nenhuma calibração?** O documento é gerado do mesmo jeito — a seção "Calibrações Realizadas" simplesmente não aparece nele. Use isso quando o atendimento não envolveu calibração nenhuma (por exemplo, uma visita só de inspeção).

---

## 7. Gerar Declaração com IA — o que acontece

Depois de preencher as seções 1, 2 e 3, clique em **"Gerar Declaração com IA"**.

O sistema lê tudo o que você preencheu e pede para a Inteligência Artificial escrever, numa única chamada, os textos do documento: Introdução, Metodologia (redação formal em cima do que você escreveu), Calibrações Realizadas (só se houver alguma marcada) e Declaração Final. Isso pode levar alguns segundos — o botão fica desabilitado e uma mensagem de "Gerando textos com IA..." aparece até terminar.

Quando terminar, a caixa de **Revisão** (seção 8 deste manual) aparece na tela, logo abaixo, já com o cursor descendo até ela automaticamente.

---

## 8. Revisão dos textos antes de confirmar

| Campo | O que é |
|---|---|
| **Introdução** | Parágrafo de abertura do documento, apresentando o objetivo do atendimento |
| **Metodologia** | Versão formal, redigida pela IA, do que você escreveu no campo "Metodologia" da seção 3 |
| **Calibrações Realizadas** (só aparece se houve alguma marcada) | Texto explicando o que foi calibrado |
| **Declaração Final** | O parágrafo que efetivamente declara que o serviço foi executado |

> **Muito importante — leia com atenção:** estes textos vão **direto para o documento final, exatamente como estiverem na tela** quando você clicar em "Confirmar". A IA escreve com base no que você informou, mas **a revisão é sua responsabilidade** — leia cada campo, corrija qualquer coisa que pareça errada, incompleta ou que não reflita o que realmente aconteceu, antes de confirmar.

---

## 9. Confirmar e Gerar Documento

Depois de revisar (e, se necessário, corrigir) os textos, clique em **"Confirmar e Gerar Documento"**.

1. Uma nova aba do navegador abre imediatamente, mostrando "Gerando documento, aguarde...".
2. Quando o sistema termina de montar o documento, essa mesma aba é preenchida com o documento final completo, pronto para imprimir (`Ctrl+P`) ou salvar como PDF pelo próprio navegador.
3. Na tela original, aparece "Salvando na pasta do cliente…" e, em seguida, o link do arquivo salvo (PDF e HTML). Se a gravação falhar, use "Tentar salvar de novo".

**O documento é salvo automaticamente na pasta do cliente** (PDF e HTML) ao ser gerado. Fechar a aba não apaga a cópia salva.

---

## 10. Documentos já gerados

No fim da tela, você pode buscar declarações que já foram salvas no Drive anteriormente, sem precisar gerar tudo de novo.

| Campo | O que fazer |
|---|---|
| **Buscar por cliente, TAG ou nome do arquivo** | Digite qualquer parte do nome do cliente, da TAG do equipamento, ou do nome do arquivo, e clique em "Buscar" |

O resultado aparece como uma lista de links — clique em qualquer um para abrir o documento salvo direto no Drive.

---

## 11. O que este documento NÃO é

Este é o ponto mais importante deste manual, e vale repetir: a **Declaração de Execução de Serviço nunca diz se o equipamento passou ou não passou em algum teste.** Ela só registra que o serviço técnico foi realizado, como foi conduzido, e o que foi calibrado. O resultado técnico (conforme/não conforme, aprovado/reprovado) é sempre um documento **separado** — o Relatório de Qualificação (QI/QO/QD), quando aplicável, ou o relatório técnico específico do ensaio realizado.

Se um cliente perguntar "esse equipamento está aprovado?", a resposta não está neste documento — está no relatório técnico correspondente.

---

## 12. Passo a passo — gerando uma declaração do zero

1. Abra o módulo. Espere o selo de status virar "pronto" no topo.
2. **Seção 1 (Cliente):** digite o CNPJ, clique em "Buscar CNPJ", confira nome/endereço.
3. **Seção 2 (Equipamento):** escolha o tipo de equipamento correto. Preencha TAG, marca, modelo, localização, datas de início/fim, técnico executor. Marque "Realizado no laboratório" só se for o caso.
4. **Seção 3 (Declaração de Execução):** escreva a metodologia com o máximo de detalhe real possível. Marque as calibrações realizadas, ajuste quantidades e registre achados técnicos se houver algo fora do padrão. Anexe fotos se quiser. Preencha o número do documento se sua empresa usar um.
5. Clique em **"Gerar Declaração com IA"** e aguarde.
6. **Revise com atenção** cada texto gerado (Introdução, Metodologia, Calibrações, Declaração Final) — corrija o que precisar.
7. Clique em **"Confirmar e Gerar Documento"**. O documento abre em uma nova aba.
8. A cópia em PDF e HTML é salva sozinha na pasta do cliente; o link aparece na tela.

---

## 13. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| A lista de calibrações mudou depois que eu já tinha marcado algumas | Você trocou o tipo de Equipamento (seção 2) depois de já ter marcado itens | Marque as calibrações **depois** de escolher o equipamento certo, não antes |
| A seção "Calibrações Realizadas" não aparece no texto gerado | Nenhum item de calibração foi marcado na seção 3 | Comportamento esperado — marque ao menos um item se o atendimento envolveu calibração |
| Os textos da revisão saíram genéricos, sem detalhe do que realmente aconteceu | O campo "Metodologia" da seção 3 foi preenchido com pouco ou nenhum detalhe | Escreva mais detalhe real na Metodologia antes de gerar — a IA só escreve em cima do que você informou, nunca inventa |
| Fechei a aba do documento | A cópia já foi salva na pasta do cliente ao gerar | Abra o documento em "Documentos já gerados" |

---

## 14. Glossário

| Termo | Explicação simples |
|---|---|
| **Declaração de Execução de Serviço** | Documento que registra que um atendimento técnico foi realizado, como foi conduzido e o que foi calibrado — sem julgar se o equipamento está apto |
| **Perfil de equipamento** | O tipo de equipamento escolhido na seção 2 — define a lista de itens calibráveis que aparece na seção 3 |
| **Item calibrável** | Uma peça específica do equipamento que pode ser calibrada (ex.: manômetro, sensor de temperatura) |
| **Achado técnico** | Uma observação sobre algo fora do padrão encontrado durante a calibração de um item (ex.: vazamento, desgaste) |
| **Rascunho** | O texto gerado pela IA na primeira etapa, ainda sujeito a revisão antes de virar documento final |

---

*Este manual descreve o módulo Declaração de Execução de Serviço tal como implementado em 2026-07-27. Se a tela mudar no futuro (novos campos, novos perfis), este documento precisa ser atualizado junto — ele não se atualiza sozinho.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica:** no fim da tela do módulo, quadro "Documentos gerados: corrigir ou usar como base" (busca por número, cliente ou TAG e botão "Atualizar"). Cada linha mostra o número, a revisão (Rev. 00, Rev. 01...), a situação (Vigente ou Substituído pela Rev. NN), quem gerou e quando, e os botões "Abrir PDF", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Confirmar e Gerar Documento". Este gerador não tem etapa de aprovação: sai na hora a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Confirmar e Gerar Documento". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.

**Número repetido:** um documento novo com o número de um documento já gerado é recusado, com a explicação: para corrigir aquele documento use "Abrir para corrigir"; para um documento novo, apague o número ou use outro.

**Documentos gerados antes de 21/10/2026:** não guardaram os dados do formulário e não entram na lista para corrigir. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo.

Os textos revisados voltam para a seção 3.1, que já aparece aberta: altere o que precisar e confirme. Só toque em "Gerar Declaração com IA" se quiser que os textos sejam redigidos de novo. Sem número digitado, a declaração recebe um número automático (DEX-aaaammdd-hhmm), usado para as revisões.
