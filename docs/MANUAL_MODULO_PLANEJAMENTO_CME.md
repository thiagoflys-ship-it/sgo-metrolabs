# Manual do Operador — Módulo Planejamento CME

## O que mudou em 18/10/2026 (documento A4)

- O documento tem seções numeradas, o quantitativo na Tabela 1 com um gráfico (Figura 1) da base calculada e do total com a margem, e a composição do cálculo por etapa e receita na Tabela 2 (a soma das colunas é a base da Tabela 1). A antiga lista "Explicação técnica do resultado", que repetia o mesmo texto para cada receita, saiu.
- Sem a IA, a fundamentação sai na Tabela 3 ("Base técnica das quantidades"), com a fonte e a natureza de cada número (normativa, protocolo do fabricante ou critério da executante). Com a IA, a fundamentação em texto entra no lugar dessa tabela.
- Referências normativas no mesmo formato do texto (RDC nº 15/2012, ABNT NBR 16328:2024...); o parágrafo da E.R.U. não se repete mais; o campo da E.R.U. tem linhas para preenchimento; as assinaturas ficam junto do parágrafo de responsabilidade técnica. Sumário com páginas quando o documento passa de 3 páginas.
- Arquivo salvo na pasta do cliente (CNPJ), PDF e cópia A4, com o nome "Planejamento tecnico CME - PLC-aaaammdd-hhmm - <equipamento e série> - aaaa-mm-dd hhmm".

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- São 6 tipos de processo: as três "Lavadora Ultrassônica" com marca viraram uma só, "Lavadora Ultrassônica". O Bowie-Dick só aparece na Autoclave a Vapor.
- "Próximo" confere razão social, tipo de processo, volume maior que zero e ao menos um serviço contratado. "Voltar" não apaga o cálculo.


### Planejamento técnico e quantitativo de insumos para qualificação de esterilizadores, termodesinfectoras e lavadoras ultrassônicas

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de engenharia ou metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também (a tela é dividida em passos numerados — você avança de um pro outro clicando em "Próximo"). Se em algum momento aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 12) — todo termo técnico do manual está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você informa o cliente, o equipamento (autoclave, termodesinfectora ou lavadora ultrassônica), o que foi contratado (Qualificação de Instalação, Operação, Desempenho) e as receitas a qualificar — e o sistema **calcula automaticamente** quantos sensores, indicadores biológicos, integradores químicos e outros insumos são necessários, e gera um **único documento técnico** explicando, com Inteligência Artificial, o porquê de cada número, citando norma ou protocolo do fabricante.

Este documento reúne, num só arquivo: o planejamento técnico e o quantitativo de insumos, a fundamentação de cada exigência, e a orientação de como o cliente pode formalizar uma alteração de critério (Especificação de Requisitos do Usuário — E.R.U.), caso não concorde com algo.

---

## 2. Os 8 tipos de processo

Você escolhe **um** tipo de processo na tela (Etapa 2, campo "Tipo de processo"). Essa escolha muda a fórmula de cálculo de sensores e a exigência (ou não) do Teste Bowie-Dick.

| Tipo de processo | Família | Bowie-Dick disponível? |
|---|---|---|
| **Autoclave a Vapor** | Autoclave | Sim |
| **Autoclave de Peróxido de Hidrogênio** | Autoclave | Não |
| **Esterilizador a Vapor de Baixa Temperatura e Formaldeído (VBTF)** | Autoclave | Não |
| **Esterilizador a Óxido de Etileno (ETO)** | Autoclave | Não |
| **Termodesinfectora** | Termodesinfectora | Não se aplica |
| **Lavadora Ultrassônica (Brasmedical)** | Lavadora | Não se aplica |
| **Lavadora Ultrassônica (Sanders)** | Lavadora | Não se aplica |
| **Lavadora Ultrassônica (Outros)** | Lavadora | Não se aplica |

**Por que só a Autoclave a Vapor tem Bowie-Dick?** O teste Bowie-Dick detecta ar residual num ciclo de vácuo fracionado — isso é específico do processo a vapor. Peróxido, Formaldeído e Óxido de Etileno não usam vapor saturado sob vácuo fracionado, então não existe um equivalente físico direto. **O sistema já esconde sozinho** o campo de Bowie-Dick da tela quando você escolhe qualquer processo que não seja Vapor — você não precisa lembrar dessa regra, o sistema aplica por você.

---

## 3. Mapa da tela — visão geral

A tela é organizada em passos, avançados com o botão "Próximo":

1. **Dados do cliente** — CNPJ e endereço.
2. **Dados do equipamento** — tipo de processo, marca, modelo, volume da câmara.
3. **O que foi vendido?** — quais etapas (QI/QO/QD) e o Bowie-Dick foram contratados.
4. **Receitas que serão qualificadas** — lista de receitas/ciclos.
5. **Resultado do planejamento** — os números calculados, observações, e o botão que gera o documento final.

---

## 4. Etapa 1 — Dados do cliente

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **CNPJ** | Número de identificação da empresa cliente | Tenta preencher automaticamente razão social e endereço | Digite o CNPJ e clique em "Buscar" |
| **Razão social** | Nome oficial da empresa | Aparece no documento | Confira depois da busca automática; se falhar, digite manualmente |
| **Logradouro / Bairro / Cidade / UF** | Endereço da empresa | Aparece no documento | Preenchidos automaticamente pela busca, ou digite manualmente |

**O que acontece se a busca automática falhar?** Uma mensagem avisa que a consulta não funcionou e pede para completar manualmente — você pode continuar normalmente, só precisa digitar os campos você mesmo.

---

## 5. Etapa 2 — Dados do equipamento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Tipo de equipamento** | Categoria geral (ex.: "Autoclave") | Informação de identificação no documento | Já vem preenchido com um valor padrão; ajuste se necessário |
| **Tipo de processo** (dropdown) | Um dos 8 processos (seção 2 deste manual) | Define a fórmula de sensores e se o Bowie-Dick fica disponível na Etapa 3 | Escolha o processo real do equipamento |
| **Marca** / **Modelo** | Fabricante e modelo | Identificação no documento | Digite conforme a placa |
| **Número de série** | Número de série de fábrica | Identificação no documento | Digite o número de série |
| **Volume da câmara em litros** | Volume interno da câmara | Usado para calcular a quantidade de sensores | Digite o volume real — este número afeta diretamente o cálculo |
| **Possui bomba de vácuo?** | Se o equipamento tem bomba de vácuo | Informação de identificação no documento | Escolha Sim ou Não |

---

## 6. Etapa 3 — O que foi vendido?

Marque exatamente o que foi contratado — o sistema usa exatamente essas marcações para calcular os insumos, nada além disso.

| Campo | O que é | O que fazer |
|---|---|---|
| **Qualificação de Instalação** | Verificação da infraestrutura e das condições de instalação | Marque se foi contratada |
| **Qualificação de Operação** | Avaliação do funcionamento do equipamento vazio | Marque se foi contratada |
| **Qualificação de Desempenho** | Avaliação do equipamento com carga ou receitas a qualificar | Marque se foi contratada |
| **Teste Bowie-Dick** (só aparece para Autoclave a Vapor) | Teste independente de rotina | Marque se foi contratado — este campo some sozinho para os outros 7 processos |

> **Importante — leia com atenção, essa é a regra mais perguntada deste sistema:** quando o cliente contrata **só QI+QO, sem QD** (comum em orçamentos que não incluem a etapa de desempenho), o sistema **ainda inclui 3 indicadores biológicos e 3 integradores químicos fixos por ciclo**, posicionados conceitualmente no início, meio e fim da câmara. Isso existe porque um relatório de qualificação não pode sair sem nenhum teste microbiológico documentado. **Quando o cliente contrata QD junto**, essa responsabilidade passa a ser inteiramente da Qualificação de Desempenho (1 indicador biológico + 1 integrador químico por sensor), e a Qualificação de Operação não leva mais indicador nenhum — ela avalia só a distribuição de temperatura em vazio. Você não precisa fazer nada de diferente na tela para isso funcionar — o sistema decide sozinho qual dos dois regimes se aplica, só olhando se QD foi marcado ou não.

---

## 7. Etapa 4 — Receitas que serão qualificadas

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Nome da receita** | O nome do ciclo/receita (ex.: "Instrumental 134 °C", "Lavagem Geral", "Príons") | Cada receita informada gera sua própria linha de cálculo no relatório | Digite o nome e clique em "Adicionar receita" — repita para cada receita |

**O que acontece se eu não marcar Qualificação de Operação nem Desempenho?** Uma mensagem avisa que não é necessário informar receitas nesta etapa, e o campo de receitas fica oculto — isso é normal quando o cliente contratou só Qualificação de Instalação.

> **Atenção com a receita "Príons":** se você digitar uma receita cujo nome contenha a palavra "Príons" (em qualquer capitalização), o sistema automaticamente troca o integrador químico convencional por um integrador químico específico para Príons nessa receita — mantendo o indicador biológico normal. Não existe um campo separado para isso, o sistema reconhece pelo nome da receita.

---

## 8. Etapa 5 — Calcular o planejamento

Depois de preencher as etapas 1 a 4, clique em **"Calcular planejamento"**.

O sistema calcula o quantitativo de insumos (sensores, indicadores biológicos, integradores químicos, Bowie-Dick, testes de cavitação/limpeza, dependendo do processo) **e, na mesma chamada, já pede à Inteligência Artificial para escrever a fundamentação técnica do documento inteiro** — por isso este passo pode levar alguns segundos a mais que um cálculo simples. Uma mensagem "Calculando e gerando a fundamentação técnica com IA..." aparece enquanto isso acontece.

Ao terminar, a tela mostra:

- **Indicadores (KPIs)** — sensores, indicadores biológicos, integradores químicos, Bowie-Dick, integrador para Príons, testes de cavitação, testes de limpeza — só aparecem os que tiverem valor maior que zero para o processo escolhido.
- **Tabela de insumos** — cada item, a base calculada e o total já com margem de segurança aplicada.

---

## 9. Observações adicionais e Refinar com IA

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Observações adicionais** | Texto livre sobre particularidades do caso | Some no documento final como uma seção de observações | Escreva livremente |
| **Refinar texto com IA** (botão) | Pede à IA para melhorar a redação do que você escreveu | Deixa o texto mais formal/claro, sem mudar o conteúdo | Escreva algo no campo antes de clicar — o botão substitui o texto pela versão refinada |

---

## 10. Gerar Documento, Salvar no Drive e WhatsApp

| Elemento | O que é | O que fazer |
|---|---|---|
| **Gerar Documento** (botão) | Monta o documento único completo (planejamento + fundamentação + orientação de E.R.U.) | Clique depois de calcular. Uma nova aba abre imediatamente com "Gerando documento, aguarde..." e é preenchida com o documento assim que pronto |
| **Salvar no Drive** (botão, aparece depois de gerar) | Converte o documento em PDF e salva na pasta do cliente no Google Drive | Clique se quiser guardar uma cópia — depois de salvo, aparece um link direto para o arquivo |
| **Abrir WhatsApp** (botão) | Monta uma mensagem pronta com o resumo dos insumos calculados | Clique a qualquer momento depois de calcular. **O link do documento só aparece na mensagem se você já tiver clicado em "Salvar no Drive" antes** |

**O documento não é salvo automaticamente no Drive.** Se você fechar a aba sem clicar em "Salvar no Drive", o documento gerado não fica registrado em lugar nenhum — gere de novo se precisar.

---

## 11. Passo a passo — do zero até o documento pronto

1. **Etapa 1:** digite o CNPJ, clique em "Buscar", confira/complete o endereço, clique em "Próximo".
2. **Etapa 2:** escolha o tipo de processo correto, preencha marca/modelo/série/volume/bomba de vácuo, clique em "Próximo".
3. **Etapa 3:** marque exatamente o que foi vendido (QI/QO/QD/Bowie-Dick), clique em "Próximo".
4. **Etapa 4:** adicione cada receita a ser qualificada, uma de cada vez, clique em "Calcular planejamento".
5. **Etapa 5:** confira os indicadores e a tabela de insumos. Escreva observações adicionais se houver, use "Refinar texto com IA" se quiser.
6. Clique em **"Gerar Documento"** — o documento abre em nova aba assim que pronto.
7. Clique em **"Salvar no Drive"** se quiser guardar uma cópia em PDF.
8. Clique em **"Abrir WhatsApp"** se quiser enviar o resumo ao cliente.

---

## 12. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| O campo de Bowie-Dick sumiu da tela | Você trocou o tipo de processo para algo diferente de "Autoclave a Vapor" | Comportamento esperado — Bowie-Dick só existe para o processo a Vapor |
| O cálculo demorou mais do que eu esperava | O passo de "Calcular" já inclui a geração da fundamentação técnica pela IA, numa única chamada | Normal — espere a mensagem de carregamento terminar |
| Recebi um erro ao calcular, mensagem sobre a IA | Falha temporária na geração do texto (ex.: instabilidade de rede) | Tente calcular novamente |
| O link do documento não apareceu na mensagem do WhatsApp | Você ainda não clicou em "Salvar no Drive" | Clique em "Salvar no Drive" primeiro, depois abra o WhatsApp |
| A quantidade de indicadores biológicos/químicos veio diferente do que eu esperava para QI+QO sem QD | Comportamento esperado — ver a explicação da seção 6 deste manual sobre o regime de 3 indicadores fixos por ciclo | Confira se QD estava realmente marcado ou não — isso muda completamente o cálculo |

---

## 13. Glossário

| Termo | Explicação simples |
|---|---|
| **QI (Qualificação de Instalação)** | Verificação de que o equipamento foi instalado corretamente |
| **QO (Qualificação de Operação)** | Verificação de que o equipamento opera conforme especificado, em ciclo vazio |
| **QD (Qualificação de Desempenho)** | Verificação de que o equipamento entrega o resultado esperado, com carga real |
| **Bowie-Dick** | Teste de rotina que detecta ar residual num ciclo de esterilização a vapor com vácuo fracionado |
| **Indicador biológico** | Insumo que comprova a eficácia microbiológica (morte de esporos-teste) de um ciclo de esterilização |
| **Integrador químico** | Insumo que verifica se as condições físicas de exposição (tempo, temperatura, agente esterilizante) foram atingidas |
| **Receita/ciclo** | O programa específico que o equipamento executa para um tipo de carga (ex.: "Instrumental", "Têxteis", "Príons") |
| **E.R.U. (Especificação de Requisitos do Usuário)** | Documento que o cliente preenche e assina quando quer alterar algum critério do planejamento original |
| **Margem de segurança** | Percentual adicional aplicado sobre a quantidade base calculada, para cobrir repetições/imprevistos |

---

*Este manual descreve o módulo Planejamento CME tal como implementado em 2026-07-27. Se a tela mudar no futuro (novos processos, novos campos), este documento precisa ser atualizado junto — ele não se atualiza sozinho.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica:** no fim da tela do módulo, quadro "Documentos gerados: corrigir ou usar como base" (busca por número, cliente ou TAG e botão "Atualizar"). Cada linha mostra o número, a revisão (Rev. 00, Rev. 01...), a situação (Vigente ou Substituído pela Rev. NN), quem gerou e quando, e os botões "Abrir PDF", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Gerar Documento". Este gerador não tem etapa de aprovação: sai na hora a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Gerar Documento". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.

**Número repetido:** um documento novo com o número de um documento já gerado é recusado, com a explicação: para corrigir aquele documento use "Abrir para corrigir"; para um documento novo, apague o número ou use outro.

**Documentos gerados antes de 21/10/2026:** não guardaram os dados do formulário e não entram na lista para corrigir. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo.

Ao abrir, cliente, equipamento, escopo contratado, receitas e observações voltam ao formulário e a tela vai para a etapa 4: toque em "Calcular planejamento" (o quantitativo é refeito com os dados corrigidos), confira o resultado, toque em "Gerar Documento" e em "Salvar na pasta do cliente". O número (PLC) e a revisão ficam no documento salvo; o motivo é conferido ao tocar em "Gerar Documento".
