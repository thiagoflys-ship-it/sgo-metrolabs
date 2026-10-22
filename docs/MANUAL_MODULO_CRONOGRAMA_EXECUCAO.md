# Manual do Operador — Módulo Cronograma de Execução

## O que mudou em 18/10/2026 (documento A4)

- O documento tem seções numeradas, a lista de equipamentos com a linha de total (Tabela 1), os grupos com início, término e dias úteis (Tabela 2) e um calendário dos grupos (Figura 1), com sábados, domingos e feriados nacionais sombreados.
- As considerações finais e as assinaturas ficam juntas na mesma página; a nota de rodapé que repetia que as datas são previsões saiu.
- Arquivo salvo na pasta do cliente (CNPJ), PDF e cópia A4, com o nome "Cronograma de execucao - CRN-aaaammdd-hhmm - <cliente> - aaaa-mm-dd hhmm".

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- Na etapa 2, o botão "Trazer equipamentos do cadastro" busca os equipamentos do cliente (por unidade ou todas), agrupados por tipo, marca e modelo. "+ Adicionar" continua para acréscimo à mão.
- "Avançar" confere razão social, ao menos 1 equipamento e a data de início. Sem IA, o cronograma sai com texto padrão.


### Agrupamento de equipamentos e sugestão de datas para calibração e qualificação técnica (QI/QO/QD)

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema**. Leia na ordem, de cima para baixo, seguindo a tela também de cima para baixo. Se aparecer uma palavra técnica desconhecida, vá direto ao **Glossário** (seção 10).

---

## 1. O que este sistema faz, em uma frase

Você informa o cliente e a lista de equipamentos que precisam de calibração/qualificação técnica (QI/QO/QD), e o sistema **divide automaticamente** esses equipamentos em grupos de execução, sugerindo datas de início e fim de cada grupo — evitando que o técnico monte essa divisão manualmente numa planilha.

> **Importante:** a divisão em grupos é feita por uma regra fixa e determinística (não é Inteligência Artificial) — os mesmos equipamentos sempre vão gerar a mesma divisão. A Inteligência Artificial entra só depois, na etapa 4, pra escrever o texto explicativo do cronograma final.

---

## 2. Etapa 1 — Dados do Cliente

| Campo | O que fazer |
|---|---|
| **CNPJ** | Digite e clique em "Buscar" — o sistema preenche Razão Social, Logradouro, Bairro, Cidade e UF automaticamente |
| **Razão Social / Logradouro / Bairro / Cidade / UF** | Confira os dados preenchidos; corrija manualmente se necessário |

Clique em **"Avançar"** pra ir pra etapa 2.

---

## 3. Etapa 2 — Lista de Equipamentos

| Campo | O que fazer |
|---|---|
| **Tipo de Equipamento** | Digite o tipo (ex.: Autoclave, Lavadora) |
| **Marca / Modelo** | Identificação do equipamento |
| **Quantidade** | Quantas unidades desse mesmo tipo/marca/modelo existem |

Clique em **"+ Adicionar"** pra incluir cada equipamento na lista. Use **"Remover"** pra tirar um item adicionado por engano. Repita até a lista completa estar pronta, depois clique em **"Avançar"**.

---

## 4. Etapa 3 — Parâmetros e Sugestão de Grupos

| Campo | O que é | O que fazer |
|---|---|---|
| **Data de início do Grupo 1** | Quando a execução começa | `dd/mm/aaaa` |
| **Máx. unidades por grupo** | Quantos equipamentos, no máximo, entram no mesmo grupo | Padrão 6 |
| **Dias úteis por grupo** | Quantos dias úteis a execução de 1 grupo deve levar | Padrão 5 |
| **Intervalo entre grupos (dias úteis)** | Folga entre o fim de um grupo e o início do próximo | Padrão 0 |
| **Limite p/ grupo único** | Se o total de unidades for menor ou igual a esse número, tudo vira 1 grupo só | Padrão 3 |

Clique em **"Sugerir Grupos"** — o sistema aplica a regra e mostra a divisão, com data de Início e Fim de cada grupo. Pra montar a divisão manualmente do zero, use **"+ Novo grupo vazio"**.

> **Datas pulam fim de semana.** O cálculo de "dias úteis" nunca conta sábado/domingo.

---

## 5. Etapa 4 — Gerar Cronograma

Clique em **"Gerar Cronograma"**. O sistema confere se a quantidade de equipamentos nos grupos bate com a lista original (etapa 2) e, se estiver tudo certo, chama a Inteligência Artificial **uma única vez** pra escrever o texto explicativo, e salva o registro.

> **O que acontece se as quantidades não baterem?** O sistema recusa gerar e avisa exatamente qual equipamento está com quantidade divergente — revise a divisão na etapa 3 antes de tentar de novo.

---

## 6. Etapa 5 — Documento

| Botão | O que faz |
|---|---|
| **Abrir Documento** | Abre o cronograma final numa nova aba, pronto pra imprimir ou salvar como PDF |
| **Salvar no Drive** | Salva uma cópia em PDF na pasta do cliente |
| **Abrir WhatsApp** | Abre o WhatsApp com uma mensagem padrão pronta, pra enviar ao cliente |

O documento final também inclui, sempre com o mesmo texto fixo (não passa pela IA de propósito, por ser um compromisso operacional): orientações que o cliente precisa seguir antes da execução (manutenção em dia, desligamento prévio dos equipamentos com antecedência mínima, acesso liberado à área técnica, presença de responsável local, etc.).

---

## 7. Passo a passo completo

1. Etapa 1: CNPJ, buscar, conferir dados do cliente.
2. Etapa 2: adicionar todos os equipamentos.
3. Etapa 3: ajustar parâmetros, clicar em "Sugerir Grupos", revisar a divisão.
4. Etapa 4: clicar em "Gerar Cronograma" e aguardar a IA escrever o texto.
5. Etapa 5: abrir o documento, salvar no Drive, enviar pelo WhatsApp se quiser.

---

## 8. Erros comuns e o que fazer

| O que aconteceu | O que fazer |
|---|---|
| "Adicione ao menos um equipamento antes de sugerir os grupos" | Volte pra etapa 2 e adicione a lista |
| "A quantidade de equipamento nos grupos não bate com a lista informada" | Revise a divisão manual da etapa 3 |
| As datas dos grupos parecem "erradas" | Dias úteis pulam fim de semana — confira o dia da semana ao lado de cada data |

---

## 9. Glossário

| Termo | Explicação simples |
|---|---|
| **Grupo** | Conjunto de equipamentos executados no mesmo período |
| **QI / QO / QD** | Qualificação de Instalação / Operação / Desempenho |
| **Dias úteis** | Dias da semana sem contar sábado e domingo |
| **Grupo único** | Quando o total de equipamentos é pequeno o bastante pra não precisar dividir |

---

*Este manual descreve o módulo Cronograma de Execução tal como implementado em 2026-08-20.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica:** no fim da tela do módulo, quadro "Documentos gerados: corrigir ou usar como base" (busca por número, cliente ou TAG e botão "Atualizar"). Cada linha mostra o número, a revisão (Rev. 00, Rev. 01...), a situação (Vigente ou Substituído pela Rev. NN), quem gerou e quando, e os botões "Abrir PDF", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Gerar Cronograma". Este gerador não tem etapa de aprovação: sai na hora a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Gerar Cronograma". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.

**Número repetido:** um documento novo com o número de um documento já gerado é recusado, com a explicação: para corrigir aquele documento use "Abrir para corrigir"; para um documento novo, apague o número ou use outro.

**Documentos gerados antes de 21/10/2026:** não guardaram os dados do formulário e não entram na lista para corrigir. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo.

Ao abrir, cliente, parâmetros, equipamentos e grupos voltam e a tela vai para a etapa 3. Confira os grupos, toque em "Gerar Cronograma" (etapa 4) e, na etapa 5, em "Abrir Documento" e "Salvar na pasta do cliente". O número (CRN) e a revisão ficam no documento salvo. Os textos são redigidos de novo com os dados corrigidos.
