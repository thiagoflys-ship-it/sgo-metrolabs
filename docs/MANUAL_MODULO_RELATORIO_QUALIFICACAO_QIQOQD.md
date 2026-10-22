# Manual do Operador — Módulo Relatório de Qualificação (QI/QO/QD)

## O que mudou em 21/10/2026 (busca no cadastro)

- **Buscar no cadastro (opcional).** Acima de "1. Cliente" há o quadro "Buscar no cadastro": busque o cliente pelo nome ou CNPJ, escolha a unidade e o equipamento. Cliente, CNPJ, endereço, TAG, modelo e localização (unidade e setor) entram nos campos que estão vazios ou que foram preenchidos automaticamente; o que você digitou não muda. Desde 22/10/2026 o fabricante (marca) também vem do cadastro. O número de série do cadastro vai junto e sai no documento (enquanto a TAG da tela for a do equipamento escolhido).
- Se o equipamento não estiver no cadastro, use "Cadastrar equipamento" no próprio quadro (abre em outra aba) e depois "Atualizar listas". Sem escolher nada, a tela funciona como antes, com digitação livre.
- Se faltar TAG, número de série ou setor no cadastro, o quadro mostra "Falta no cadastro do equipamento" com os campos para preencher ali mesmo e "Gravar no cadastro" (só o que está vazio, com registro de quem gravou).

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- O relatório é salvo sozinho na pasta do cliente. Se falhar, aparece "Tentar salvar de novo". Os perfis Comercial e Financeiro só consultam.

## O que mudou em 18/10/2026 (documento A4)

- O documento segue o padrão A4 comum: seções numeradas (1. Identificação, 2. Introdução...), tabelas com "Tabela N —" e figuras com "Figura N —", cabeçalho e rodapé em todas as páginas com "Página X de Y". Passou de 3 páginas, ganha sumário com o número da página de cada seção.
- No alto da primeira página, um quadro mostra "Executado sem achado técnico registrado" ou "Executado com achado técnico registrado". O relatório continua sem aprovar nem reprovar o equipamento.
- Os itens verificados de QI e de QO aparecem uma vez só, numa tabela de cada etapa, com o achado técnico do item ao lado. As normas aparecem uma vez só, em "Referências normativas".
- Na QD, a "Tabela — Certificados de calibração dos instrumentos" mostra cada instrumento como "Anexado (Figura N)" ou "Não anexado nesta visita"; só os certificados anexados aparecem como figura, com altura limitada.
- Conclusão, data de emissão e assinaturas ficam juntas na mesma página.
- O arquivo é salvo na subpasta com o CNPJ do cliente, com o nome "Relatorio de qualificacao - <número> - <TAG> - <aaaa-MM-dd HHmm>" (.pdf e .html). Os relatórios antigos, salvos na pasta com o nome do cliente, continuam aparecendo em "Documentos já gerados".


### Qualificação de Instalação, Operação e Desempenho — documento técnico separado, com texto de IA dedicado a cada item verificado

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de engenharia ou metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também. Se em algum momento aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 16) — todo termo técnico do manual está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você preenche o cliente, o equipamento, e marca quais itens de **Qualificação de Instalação (QI)** e **Qualificação de Operação (QO)** foram verificados, ou anexa **certificados de calibração reais** para a **Qualificação de Desempenho (QD)** — e o sistema escreve, com Inteligência Artificial, um relatório técnico extenso e específico, seção por seção, pronto para você revisar e entregar ao cliente.

Este módulo é **separado** da Declaração de Execução de Serviço (mesmo que o cliente e o equipamento sejam os mesmos): a Declaração registra que o serviço foi executado, sem julgar nada; **este relatório de QI/QO/QD é o documento técnico** de qualificação, com o mesmo rigor de citação de norma ou protocolo do fabricante em cada afirmação.

---

## 2. Os 15 tipos de equipamento (perfis)

Você escolhe **um** tipo de equipamento na tela (campo "Equipamento", seção 2) — a mesma lista de 15 perfis usada na Declaração de Execução de Serviço (são o mesmo cadastro de equipamentos por trás dos dois módulos). Essa escolha define quais **itens de checklist de QI e de QO** aparecem, e quais **itens calibráveis** têm slot de upload de certificado na seção de QD.

| Perfil | Observação |
|---|---|
| Autoclave a Vapor | Itens calibráveis: Válvula de Segurança, Manômetro, Manovacuômetro, Sensor de Temperatura, Pressostato, Transdutor de Pressão |
| Câmara de Conservação | — |
| Câmara Fria | — |
| Refrigerador | — |
| Freezer / Ultrafreezer | — |
| Centrífuga (sem refrigeração) | Temporizador/Cronômetro do ciclo, Indicador de Rotação (RPM) |
| Centrífuga Refrigerada | Temporizador/Cronômetro do ciclo, Indicador de Rotação (RPM), Sensor de Temperatura |
| Termodesinfectora / Lavadora Desinfetadora Automática | — |
| Lavadora Ultrassônica | — |
| Esterilizador a Peróxido de Hidrogênio (Gás Plasma) | — |
| Esterilizador a Óxido de Etileno (ETO) | — |
| Esterilizador a Vapor de Baixa Temperatura e Formaldeído (VBTF) | — |
| Capela de Fluxo Laminar | — |
| Seladora de Grau Cirúrgico | — |
| Incubadora de Testes Biológicos | — |

Você não precisa decorar os itens — assim que escolhe o equipamento, o sistema já monta sozinho a lista certa de checklist e de certificados.

---

## 3. Mapa da tela — visão geral

1. **Cliente** — quem é o dono do equipamento.
2. **Equipamento** — qual equipamento foi atendido.
3. **Qualificação de Instalação/Operação (QI/QO)** — checklist de itens verificados, fotos, e a Qualificação de Desempenho (QD) por certificado de calibração — tudo no mesmo painel, seguido do botão de gerar com IA.
4. **Revisão dos textos** (só aparece depois de gerar) — onde você lê e ajusta o que a IA escreveu antes de confirmar.
5. **Documentos já gerados** — busca de relatórios antigos.

---

## 4. Seção 1 — Cliente

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **CNPJ** | Número de identificação da empresa cliente | Preenche automaticamente nome e endereço | Digite o CNPJ e clique em "Buscar CNPJ" |
| **Buscar CNPJ** (botão) | Dispara a busca automática | Evita digitar manualmente | Clique depois de digitar o CNPJ |
| **Cliente / Razão Social** | Nome oficial da empresa | Aparece na capa do documento | Confira depois da busca; corrija manualmente se necessário |
| **Endereço** | Endereço da empresa | Aparece na capa do documento | Mesma lógica |

---

## 5. Seção 2 — Equipamento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Equipamento** (dropdown) | Tipo de equipamento (seção 2 deste manual) | Define os checklists de QI/QO e os certificados de QD que aparecem | Escolha antes de marcar qualquer item — trocar depois reseta a seleção |
| **TAG / Identificação** | Código interno do equipamento | Identifica o equipamento específico | Copie do equipamento físico |
| **Marca** / **Modelo** | Fabricante e modelo | Identificação no documento | Digite conforme a placa |
| **Localização** | Onde o equipamento fica | Rastreabilidade | Digite o local |
| **Data de início** / **Data de fim** | Datas do atendimento | Aparecem no documento | `dd/MM/aaaa`; deixe fim em branco se foi 1 dia só |
| **Técnico executor** | Quem realizou o atendimento | Responsável no documento | Nome completo |

### Local do atendimento

| Campo | O que é | O que fazer |
|---|---|---|
| **Realizado no laboratório da Metrolab's** | Diz se foi no laboratório ou no cliente | Deixe desmarcado no caso mais comum (atendimento em campo) — marque só se o equipamento foi trazido ao laboratório |

---

## 6. Seção 3 — Qualificação de Instalação (QI)

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Checklist de QI** (itens variam por perfil) | Lista dos pontos de instalação verificados | Cada item marcado vira um parágrafo específico no relatório, escrito pela IA | Marque cada item verificado; preencha o "achado técnico" (livre) só se algo estiver fora do padrão |
| **Registros fotográficos — QI** (até 6, opcional) | Fotos da instalação | A IA analisa cada foto automaticamente e escreve uma legenda descritiva sozinha | Anexe as fotos relevantes — a legenda de texto é só um complemento opcional, não precisa escrever nada |
| **Como a Qualificação de Instalação foi conduzida** (opcional) | Texto livre de contexto geral | Enriquece o texto da IA sobre a QI | Descreva particularidades da instalação, se houver |

> **Sobre as fotos**: diferente de outros campos deste sistema, a IA aqui **analisa a imagem em si** (não só a legenda que você escrever) — ela identifica o que está na foto e gera uma descrição técnica sozinha. Escrever uma legenda é opcional e serve só como contexto adicional.

---

## 7. Qualificação de Operação (QO)

Este bloco só aparece se o perfil escolhido usa QO (todos os 15 perfis atuais usam).

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Checklist de QO** | Lista dos pontos de operação verificados | Mesmo mecanismo do QI — cada item vira parágrafo específico | Marque os itens verificados; achado técnico opcional |
| **Registros fotográficos — QO** (até 6, opcional) | Fotos da operação | Mesma análise automática por IA do QI | Anexe as fotos relevantes |
| **Como a Qualificação de Operação foi conduzida** (opcional) | Texto livre | Enriquece o texto da IA sobre a QO | Descreva particularidades da operação |

---

## 8. Qualificação de Desempenho (QD)

Esta é a parte que funciona **de forma diferente** de QI/QO: aqui não existe checklist de autoavaliação — você **anexa o certificado de calibração real** de cada peça calibrável do equipamento (a mesma lista de itens calibráveis da seção 2 deste manual).

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Certificado de Calibração — [item]** (um slot por item calibrável, PDF ou imagem) | O certificado real, emitido para aquela peça específica | A IA lê o certificado (não uma autoavaliação) e escreve o texto de QD com base nos dados reais dele | Anexe o certificado de cada item que já tiver disponível; deixe em branco os que ainda não têm |
| **Observações gerais sobre a Qualificação de Desempenho** (opcional) | Texto livre de contexto | Complementa o texto — nunca substitui os dados dos certificados | Use para contexto geral do atendimento |

> **Muito importante:** a Qualificação de Desempenho deste sistema **nunca é uma autoavaliação marcada em caixa de seleção** — ela sempre depende de um certificado de calibração real anexado. Se você não tiver o certificado de um item ainda, deixe o campo em branco; o relatório sai sem aquele item de QD, e você pode gerar de novo depois quando tiver o certificado.

---

## 9. Número do documento e o botão de gerar

| Campo | O que é | O que fazer |
|---|---|---|
| **Número do documento** (opcional) | Código de referência interno | Preencha só se sua empresa usar um — não é uma data |
| **Gerar Relatório de QI/QO com IA** (botão) | Processa tudo e pede à IA os textos | Clique depois de preencher tudo. Se houver certificado de calibração anexado, a leitura pode levar até 1 minuto |

---

## 10. Revisão dos textos antes de confirmar

| Campo | Aparece quando |
|---|---|
| **Introdução** | Sempre |
| **Objetivo** | Sempre |
| **Qualificação de Instalação (QI)** | Sempre |
| **Qualificação de Operação (QO)** | Só se o perfil usa QO (praticamente sempre) |
| **Qualificação de Desempenho (QD)** | Só se pelo menos um certificado foi anexado e lido com sucesso |
| **Conclusão** | Sempre |

> **Muito importante — leia com atenção:** estes textos vão **direto para o documento final, exatamente como estiverem na tela**. Revise cada seção com cuidado — principalmente a de QD, que cita números reais lidos do certificado — antes de clicar em "Confirmar".

---

## 11. Confirmar e Gerar Relatório de QI/QO

1. Clique em **"Confirmar e Gerar Relatório de QI/QO"**. Uma nova aba abre imediatamente, com uma mensagem avisando que a IA também está analisando as fotos, o que pode levar mais tempo que o normal.
2. Quando pronto, essa aba é preenchida com o documento final completo, pronto para imprimir ou salvar como PDF.
3. Na tela original, aparece "Salvando na pasta do cliente…" e, em seguida, o link do arquivo salvo (PDF e HTML), numa subpasta com o CNPJ do cliente.

**O documento é salvo automaticamente na pasta do cliente.** Se a gravação falhar, use "Tentar salvar de novo".

---

## 12. Documentos já gerados

Busque relatórios de QI/QO já salvos, por cliente, TAG ou nome do arquivo — sem precisar gerar de novo.

---

## 13. Por que este módulo é separado da Declaração de Execução

Se você já usa o módulo "Declaração de Execução de Serviço" para o mesmo cliente/equipamento, pode estranhar ter dois módulos parecidos. A diferença é de propósito: a Declaração registra **que o serviço foi feito**, de forma neutra; o Relatório de QI/QO/QD é o **documento técnico de qualificação**, com o mesmo cliente e equipamento, mas com foco na verificação técnica ponto a ponto (instalação, operação, desempenho) — inclusive citando os dados reais dos certificados de calibração anexados. Um cliente pode precisar dos dois documentos, ou só de um, dependendo do que foi contratado.

---

## 14. Passo a passo — gerando um relatório do zero

1. Abra o módulo. Espere o selo de status virar "pronto".
2. **Seção 1:** CNPJ, buscar, conferir cliente/endereço.
3. **Seção 2:** escolha o equipamento certo, preencha TAG/marca/modelo/localização/datas/técnico, marque local do atendimento se aplicável.
4. **QI:** marque os itens do checklist verificados, anexe fotos se quiser, preencha o campo de metodologia se houver particularidade.
5. **QO** (se aplicável): mesma lógica do QI.
6. **QD:** anexe os certificados de calibração disponíveis, um por item calibrável.
7. Preencha o número do documento se usar um.
8. Clique em **"Gerar Relatório de QI/QO com IA"** e aguarde.
9. **Revise com atenção** cada seção gerada, especialmente a de QD.
10. Clique em **"Confirmar e Gerar Relatório de QI/QO"**. O documento abre em nova aba.
11. A cópia em PDF e HTML é salva sozinha na pasta do cliente; o link aparece na tela.

---

## 15. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| A seção de QO não aparece na revisão | O perfil escolhido não usa QO, ou nenhum item de QO foi marcado | Confira se marcou algum item do checklist de QO |
| A seção de QD não aparece na revisão | Nenhum certificado de calibração foi anexado com sucesso | Anexe ao menos um certificado válido (PDF ou imagem legível) |
| A leitura do certificado demorou muito ou falhou | Arquivo de certificado ilegível, corrompido, ou muito grande | Confira se o arquivo abre normalmente antes de anexar; tente novamente |
| Troquei o equipamento e os itens marcados sumiram | Comportamento esperado — trocar de perfil reseta os checklists | Marque os itens de novo depois de escolher o equipamento certo |

---

## 16. Glossário

| Termo | Explicação simples |
|---|---|
| **QI (Qualificação de Instalação)** | Verificação de que o equipamento foi instalado corretamente |
| **QO (Qualificação de Operação)** | Verificação de que o equipamento opera conforme especificado |
| **QD (Qualificação de Desempenho)** | Verificação de que o equipamento entrega o resultado esperado, com base em certificado de calibração real |
| **Item calibrável** | Uma peça específica do equipamento que pode ser calibrada |
| **Achado técnico** | Observação sobre algo fora do padrão encontrado durante a verificação |
| **Certificado de calibração** | Documento oficial emitido para uma peça calibrada, com os dados reais da calibração |

---

*Este manual descreve o módulo Relatório de Qualificação (QI/QO/QD) tal como implementado em 2026-07-27. Se a tela mudar no futuro, este documento precisa ser atualizado junto.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica:** no fim da tela do módulo, quadro "Documentos gerados: corrigir ou usar como base" (busca por número, cliente ou TAG e botão "Atualizar"). Cada linha mostra o número, a revisão (Rev. 00, Rev. 01...), a situação (Vigente ou Substituído pela Rev. NN), quem gerou e quando, e os botões "Abrir PDF", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Confirmar e Gerar Relatório de QI/QO". Este gerador não tem etapa de aprovação: sai na hora a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Confirmar e Gerar Relatório de QI/QO". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.

**Número repetido:** um documento novo com o número de um documento já gerado é recusado, com a explicação: para corrigir aquele documento use "Abrir para corrigir"; para um documento novo, apague o número ou use outro.

**Documentos gerados antes de 21/10/2026:** não guardaram os dados do formulário e não entram na lista para corrigir. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo.

Os certificados da QD e a leitura feita deles voltam com o documento: não é preciso gerar o rascunho de novo, a menos que um certificado seja trocado (nesse caso a tela pede o rascunho, para ler o certificado novo). Sem número digitado, o relatório recebe um número automático (RQQ-aaaammdd-hhmm), usado para as revisões.

## O que mudou em 22/10/2026 (identificação completa e vários padrões)

- **Identificação do equipamento completa.** Escolhido o equipamento, tudo o que está preenchido em Cadastros › Equipamentos sai no documento: tipo, fabricante (marca), modelo, nº de série, TAG, patrimônio, setor, capacidade, câmaras ou portas e ano de fabricação. Campo preenchido no cadastro fica travado na tela, com a explicação de onde corrigir (Cadastros › Equipamentos › Editar); campo vazio no cadastro pode ser completado no quadro "Cliente e equipamento", em "Gravar no cadastro" (só grava o que está vazio). Linha vazia não aparece no documento.
- **Vários padrões de referência.** No quadro "Padrões de referência utilizados (opcional)", abaixo de "Buscar no cadastro", toque em "Escolher padrões" e marque todos os padrões usados (sem limite). O documento traz uma tabela com cada um (fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza). Padrão fora do cadastro, sem validade ou vencido na data do serviço impede a geração, com a explicação. O fabricante (marca) passa a vir do cadastro, como o modelo.
- Documentos e rascunhos antigos, com um padrão só, continuam abrindo e gerando igual.
