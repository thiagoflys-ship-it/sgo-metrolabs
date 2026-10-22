# Manual do Operador — Módulo Certificado de Calibração

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- Cada bloco tem o campo "Resolução do instrumento (na unidade do bloco)". A resolução entra no orçamento de incerteza; em branco, é deduzida das leituras e marcada com asterisco.
- Padrão vencido na data da calibração bloqueia a emissão. O cadastro e a validade dos padrões ficam na página "Padrões de referência" (botões "Editar" e "⋯" Mais ações: Substituir PDF, Dados, localização e foto, Inativar, Reativar).
- Os perfis Comercial e Financeiro só consultam certificados.

## O que mudou em 18/10/2026

- Certificado e relatório interpretativo em A4 com seções numeradas ("1. Identificação"…), tabelas numeradas ("Tabela N —") e figuras numeradas ("Figura N —"), identificação numa tabela só e cada informação uma vez (o aviso de que o certificado não contém declaração de conformidade fica só no quadro da abertura).
- Certificado com três grandezas ou mais ganha sumário com o número das páginas.
- O relatório interpretativo traz um gráfico por grandeza (tendência e intervalo de ±U95 em cada ponto) e a próxima calibração numa linha da identificação; o texto padrão explica os termos uma vez e resume as faixas, sem repetir a tabela do certificado.
- Os dois documentos ficam na pasta do cliente com o CNPJ (14 dígitos) e com nome padrão: "Certificado de calibracao - <número> - <TAG> - <aaaa-MM-dd HHmm>" e "Relatorio interpretativo - <número> - <TAG> - <aaaa-MM-dd HHmm>", em HTML e PDF.
- "Reabrir certificado" monta o mesmo HTML da emissão.
- Relatórios gerenciais dos padrões (plano de renovação e desempenho da emissão de certificados): número próprio (REN-… e DES-…), período com as datas, gráficos legíveis no PDF e a contagem de pontos por grandeza corrigida (antes contava blocos).


### Emissão do certificado oficial de calibração (cálculo próprio de incerteza) + relatório interpretativo baseado nos resultados salvos

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também. Se aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 12) — todo termo técnico está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você digita as leituras feitas durante a calibração de um equipamento (por comparação com um padrão de referência) e o sistema **calcula sozinho** a tendência, a incerteza e monta o **Certificado de Calibração oficial**, pronto pra imprimir — exatamente no mesmo formato que a Metrolab's já usa.

**Isto é diferente do módulo "Relatório de Calibração"** (que só lê um certificado que já existe, pronto, anexado como PDF). Aqui **não existe certificado prévio** — é este sistema que **emite** o certificado do zero, fazendo a conta de verdade.

Depois de emitir o certificado, você também pode gerar, com 1 clique a mais, um **Relatório Interpretativo** — um segundo documento, em linguagem simples, explicando o que os números do certificado significam, para quem não entende de metrologia.

---

## 2. Mapa da tela — visão geral

A tela é dividida em blocos, de cima para baixo:

1. **Consultar certificados já emitidos (por CNPJ)** — para reabrir um certificado antigo.
2. **Padrões de Referência do Laboratório** — cadastro e controle de vencimento dos instrumentos-padrão usados nas calibrações. Fica sempre visível, **independente** de você estar emitindo um certificado agora.
3. **1. Cliente** — quem é o dono do equipamento calibrado.
4. **2. Equipamento** — qual equipamento foi calibrado.
5. **3. Dados da calibração** — técnico, data, local, condições ambientais.
6. **4. Ensaios (blocos de resultado)** — onde você digita as leituras e o sistema calcula.
7. **5. Resultados de medição** — responsabilidade do cliente pela decisão de uso.
8. **6. Fotos do ensaio** — opcional.
9. **7. Gerar** — os botões finais: gerar o certificado e, depois, o relatório interpretativo.

---

## 3. Padrões de Referência do Laboratório

Um **padrão de referência** é o instrumento que a Metrolab's usa para comparar e calibrar o equipamento do cliente (ex.: um termômetro certificado, mais preciso que o equipamento sendo calibrado). Todo padrão tem sua própria validade — se ele vencer, qualquer calibração feita com ele fica questionável.

Este bloco fica **sempre visível no topo da tela**, independente de você estar no meio de emitir um certificado ou não — é um cadastro permanente do laboratório, não uma etapa do certificado.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Identificação (TAG)** | Código do padrão (ex.: "THM-002") | Identifica qual padrão foi usado, no certificado | Digite o código físico do instrumento-padrão |
| **Descrição** | O que é o padrão | Aparece na tabela "Padrões utilizados" do certificado | Ex.: "Registro de temperatura e umidade" |
| **Nº do certificado do padrão** | Número do certificado de calibração **do próprio padrão** (emitido por outro laboratório) | Rastreabilidade | Copie do certificado do padrão |
| **Incerteza (U95)** | O valor de incerteza expandida escrito no certificado do padrão | Entra direto na conta de incerteza do certificado que você vai emitir | Copie o número exatamente como está no certificado do padrão |
| **Fator K (padrão 2)** | O fator de abrangência usado no certificado do padrão | Usado para converter a incerteza do padrão pro cálculo | Deixe 2, a menos que o certificado do padrão diga outro valor explicitamente |
| **Graus de liberdade (0 = infinito)** | Um número técnico do cálculo de incerteza do próprio padrão | Ajusta a conta com precisão | Deixe 0 (infinito) — é o caso normal. Só mude se souber exatamente o motivo |
| **Validade** | Até quando o padrão pode ser usado | Controla o aviso de vencimento | `dd/mm/aaaa` |
| **Certificado do padrão (PDF)** | O arquivo do certificado do próprio padrão | Fica salvo pra consulta futura, sem precisar procurar no computador/gaveta | Anexe o PDF (opcional, mas recomendado) |

### Status de validade (selo colorido)

Cada padrão cadastrado mostra um selo:

| Selo | O que significa |
|---|---|
| 🟢 **Válido** | Mais de 30 dias até vencer |
| 🟡 **Vencendo** | Vence em 30 dias ou menos |
| 🔴 **VENCIDO** | Já passou da validade |
| ⚪ **Sem validade** | Nenhuma data foi cadastrada |

> **O que acontece se algum padrão estiver vencendo ou vencido?** Aparece um aviso vermelho no topo deste bloco. O mesmo aviso também aparece na tela inicial do Portal (Dashboard) e como um número vermelho no menu lateral, ao lado de "Certificado de Calibração" — em qualquer tela do sistema, não só aqui. A ideia é você nunca ser pego de surpresa usando um padrão vencido sem perceber.

### Anexar/trocar o PDF de um padrão já cadastrado

Na tabela de padrões, a coluna "Certificado (PDF)" tem um campo pequeno de upload — use pra anexar o certificado depois, se você cadastrou o padrão sem o PDF na hora, ou pra substituir por um certificado renovado.

### Inativar / Reativar

Um padrão vencido ou fora de uso não precisa ser excluído — clique em **Inativar**. Ele some da lista de seleção (seção 4 deste manual), mas continua no histórico. **Reativar** traz ele de volta.

---

## 4. Seção 1 — Cliente

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **CNPJ** | Número de identificação da empresa cliente | Busca ou cria o cadastro do cliente | Digite o CNPJ (só números) e clique em "Buscar / Selecionar Cliente" |

> **O que acontece?** Se o CNPJ já existe no cadastro do Portal, o cliente é selecionado automaticamente. Se não existe, o sistema consulta a Receita Federal (BrasilAPI) e **pré-preenche** um formulário de cadastro novo (razão social, endereço, telefone) — confira os dados e clique em "Cadastrar Cliente". Esse cliente fica salvo pra sempre, reaproveitável em qualquer certificado futuro (não precisa cadastrar de novo).

---

## 5. Seção 2 — Equipamento

Depois de selecionar o cliente, você escolhe um equipamento **já cadastrado** para esse cliente, ou cadastra um novo.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Equipamento já cadastrado** (lista) | Equipamentos que esse cliente já tem no sistema | Reaproveitar cadastro existente | Escolha na lista e clique em "Usar este equipamento" |
| **Unidade** | O local/filial do cliente onde o equipamento fica | Organização do cadastro | Escolha a unidade (criada automaticamente como "Matriz" quando o cliente é novo) |
| **Descrição/Tipo** | O que é o equipamento (ex.: "Termo higrômetro") | Aparece no certificado | Digite o tipo |
| **Fabricante** / **Modelo** / **Nº de série** / **TAG** / **Setor** | Identificação física do equipamento | Aparecem no certificado | Copie da placa/etiqueta do equipamento |

> **O que acontece?** Um equipamento novo, uma vez cadastrado, também fica salvo pra sempre — nas próximas calibrações desse mesmo cliente, ele já aparece na lista "Equipamento já cadastrado", sem precisar digitar tudo de novo. O campo **Patrimônio (se houver)** grava o número de patrimônio do cliente no cadastro; quando preenchido, ele sai no certificado junto da TAG e do número de série.

---

## 6. Seção 3 — Dados da calibração

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Técnico executor (cadastrado)** | Lista de técnicos já cadastrados | Reaproveitar nome sem digitar toda vez | Escolha na lista, ou clique em "+ Novo" pra cadastrar um técnico (só o nome, sem precisar de login) |
| **ou nome do técnico executor (texto livre)** | Campo alternativo | Pra quando o técnico não está cadastrado e você não quer cadastrar agora | Digite o nome diretamente — funciona igual, não precisa das duas opções preenchidas |
| **Data da calibração** | Quando a calibração foi feita | Aparece no certificado | `dd/mm/aaaa` |
| **O cliente solicitou a apresentação de uma data de próxima calibração?** | Solicitação expressa do cliente | Registra a data solicitada e a sua origem, sem calcular intervalo | Deixe NÃO. Se SIM, preencha data `dd/mm/aaaa`, nome do solicitante, cargo/setor e referência da OS, email, contrato ou documento; observação é opcional |
| **Realizado no laboratório da Metrolab's** (já vem marcado) | Onde a calibração foi feita | Muda o texto do certificado | Deixe marcado se foi no laboratório; desmarque se foi nas instalações do cliente |
| **Temperatura ambiente (°C)** / **Umidade Relativa do ar (%)** | As condições do ambiente durante a calibração | Aparecem no certificado, num texto padronizado | Digite só o número (ex.: `23,5`) — o texto ao redor é sempre igual, pra todo mundo, sem variar de técnico pra técnico |

---

## 7. Seção 4 — Ensaios (blocos de resultado)

Esta é a parte principal — onde o cálculo acontece de verdade.

### O que é um "bloco de ensaio"

Um **bloco** é uma grandeza física medida (ex.: "Temperatura", "Umidade", ou, num equipamento com mais de um sensor, "Sensor Interno" e "Sensor Externo" — dois blocos separados). Um certificado pode ter **vários** blocos.

### O que é um "ponto"

Dentro de cada bloco, um **ponto** é um valor de referência testado (ex.: 15°C, 25°C, 30°C). Cada ponto tem uma **Referência** (o valor de referência informado conforme o procedimento) e **3 leituras** (Ensaio 1, Ensaio 2, Ensaio 3) — as 3 medições reais feitas pelo equipamento sendo calibrado, naquele ponto.

| Campo | O que é | O que fazer |
|---|---|---|
| **Título (grandeza/canal)** | Nome do bloco | Ex.: "Sensor Interno — Temperatura" |
| **Unidade** | A unidade de medida do bloco | Ex.: "°C", "% UR" |
| **Padrões de referência usados neste bloco** | Quais padrões (seção 3) entram na conta de incerteza | Marque um ou mais padrões cadastrados — sem marcar nenhum, a conta de incerteza fica incompleta |
| **Referência (Nominal)** | O valor de referência do ponto | Informe o valor de referência conforme o procedimento; sua origem ainda precisa de definição técnica explícita |
| **Ensaio 1 / Ensaio 2 / Ensaio 3** | As 3 leituras reais | Digite os 3 valores medidos pelo equipamento |

Use **"+ Adicionar ponto"** pra incluir mais pontos no mesmo bloco, e **"+ Adicionar bloco de ensaio"** pra incluir outra grandeza inteira.

### Botão "Calcular"

Depois de preencher os pontos, clique em **"Calcular"** — o sistema mostra uma prévia da tabela de resultados (Média, Tendência, Incerteza, Veff, |Tendência| + U95) **antes** de gerar o certificado final, pra você conferir se os números fazem sentido.

> **O que acontece se eu não marcar nenhum padrão num bloco?** O cálculo de incerteza considera só a variação entre as 3 leituras (sem a contribuição do padrão) — os números saem incompletos. Sempre marque ao menos 1 padrão por bloco.

---

## 8. Seção 5 — Resultados de medição

O laboratório apresenta as leituras, a tendência, as incertezas e as condições da calibração. O certificado não declara aprovação, reprovação ou autorização de uso do equipamento. A avaliação de aptidão cabe ao setor de qualidade do cliente, considerando seus requisitos e os resultados com suas incertezas.

Os resultados dos documentos usam duas casas decimais e vírgula. O cálculo e os dados salvos conservam a precisão integral; 0,00 na apresentação pode representar um valor pequeno não nulo. A retirada do veredito não elimina a responsabilidade do laboratório pela correção e rastreabilidade dos resultados.

---

## 9. Seção 6 — Fotos do ensaio (opcional)

Anexe até 8 fotos tiradas durante a calibração. Cada foto pode receber uma legenda escrita por você — se você não escrever nada, e depois gerar o Relatório Interpretativo, a Inteligência Artificial escreve uma legenda descritiva sozinha.

---

## 10. Seção 7 — Gerar

### Gerar Certificado de Calibração

1. Clique em **"Gerar Certificado de Calibração"**.
2. Uma nova aba abre imediatamente, mostrando "Gerando certificado, aguarde...".
3. O sistema recalcula tudo no servidor (nunca confia em conta feita no navegador, por segurança), monta o documento, e a aba é preenchida com o certificado final, pronto pra imprimir ou salvar como PDF.
4. O certificado também é salvo automaticamente, em HTML e PDF, na pasta do cliente (subpasta com o CNPJ) — o link aparece na tela.
5. O número do certificado (ex.: `202600001`) é gerado **sozinho** — ano atual + um número sequencial que nunca se repete. Você não digita esse número em lugar nenhum.

### Gerar Relatório Interpretativo

Depois que o certificado for gerado, aparece um segundo botão: **"Gerar Relatório Interpretativo"**.

1. Clique nele.
2. O sistema monta uma explicação didática a partir dos mesmos resultados salvos no certificado. Os textos e tabelas usam a mesma formatação; a interpretação numérica não depende de geração por IA.
3. Uma nova aba abre com o documento pronto, com uma conclusão técnica (pra quem entende) e uma conclusão em linguagem simples (pra quem não entende de metrologia) — as duas dizendo a mesma coisa, cada uma no seu nível.
4. Esse documento também é salvo automaticamente, em HTML e PDF, na pasta do cliente (subpasta com o CNPJ).

> **Este relatório é opcional e separado do certificado.** O certificado sozinho já é um documento completo e válido — o Relatório Interpretativo é um complemento, útil quando o cliente ou gestor não entende de metrologia e precisa de uma explicação mais acessível.

---

## 11. Consultar certificados já emitidos (por CNPJ)

No topo da tela, digite o CNPJ do cliente e clique em "Buscar" — aparece a lista de todos os certificados já emitidos para esse cliente, com data e 2 botões: **"Reabrir certificado"** (monta o documento com os dados salvos e a apresentação atual; o PDF histórico permanece no Drive) e o link direto pro **Relatório Interpretativo**, se ele já tiver sido gerado.

---

## 12. Passo a passo — emitindo um certificado do zero

1. Abra o módulo. Se algum padrão estiver vencendo/vencido, resolva isso primeiro (ou ao menos tome ciência).
2. **Padrões:** confira se o(s) padrão(ões) que você vai usar estão com selo verde. Se não tiver nenhum cadastrado ainda, cadastre agora.
3. **Seção 1:** CNPJ, buscar/cadastrar cliente.
4. **Seção 2:** escolher ou cadastrar o equipamento.
5. **Seção 3:** técnico, data, local, condições ambientais.
6. **Seção 4:** monte os blocos — título, unidade, marque os padrões, preencha os pontos (referência + 3 leituras). Clique em "Calcular" pra conferir.
7. **Seção 5:** o engenheiro decide Aprovado/Reprovado.
8. **Seção 6:** anexe fotos, se tiver.
9. Clique em **"Gerar Certificado de Calibração"** — confira o documento na nova aba.
10. Se quiser, clique em **"Gerar Relatório Interpretativo"** — confira o segundo documento.

---

## 13. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| "Selecione o cliente e o equipamento antes de gerar" | Você pulou a seção 1 ou 2 | Volte e complete cliente + equipamento |
| "Adicione ao menos 1 bloco de ensaio" | Nenhum bloco foi criado, ou todos foram removidos | Clique em "+ Adicionar bloco de ensaio" |
| Os números da prévia parecem estranhos | Padrão errado marcado, ou leitura digitada com erro de dedo | Confira os valores digitados e os padrões marcados no bloco |
| Um padrão que eu preciso usar não aparece na lista de seleção | Ele está **Inativo** | Vá no bloco "Padrões de Referência" no topo e clique em "Reativar" |
| O balão vermelho no menu não some depois que eu resolvi o padrão vencido | A tela ainda não recarregou a contagem | Saia e entre de novo no Portal, ou aguarde a próxima ação que atualiza o balão |

---

## 14. Glossário

| Termo | Explicação simples |
|---|---|
| **Padrão de referência** | O instrumento mais preciso usado pra comparar e calibrar o equipamento do cliente |
| **Bloco de ensaio** | Um grupo de resultados de uma mesma grandeza física (ex.: temperatura) |
| **Ponto de calibração** | Um valor de referência testado, com 3 leituras |
| **Referência / Nominal** | O valor de referência informado conforme o procedimento |
| **Tendência** | A diferença entre a média do que o equipamento mediu e o valor de referência |
| **Incerteza (U95)** | A margem de confiança do resultado — o quanto o valor real pode variar |
| **Veff** | Um número técnico do cálculo de incerteza (graus de liberdade efetivos) |
| **Fator K** | O número usado pra transformar a incerteza "crua" na incerteza final do certificado |
| **|Tendência| + U95** | A soma do módulo da tendência com U95; não constitui decisão de aceitação |
| **Decisão de uso** | Avaliação de aptidão feita pelo setor de qualidade do cliente |
| **Relatório Interpretativo** | Documento separado que explica o certificado em linguagem simples, com ajuda de Inteligência Artificial |

---

*Este manual descreve o módulo Certificado de Calibração tal como implementado em 2026-08-20. Se a tela mudar no futuro (novos campos, novo cálculo), este documento precisa ser atualizado junto.*

### Data de próxima calibração solicitada pelo cliente

A opção inicial é **NÃO**: nenhuma data é calculada nem incluída por padrão. Ao selecionar **SIM**, data, nome do solicitante, cargo/setor e referência da solicitação são obrigatórios; a observação é opcional. A data deve reproduzir a solicitação documentada do cliente. Ao retornar para NÃO, os campos são limpos. O registro da solicitação e da emissão é feito pelo servidor com a sessão autenticada. A apresentação dessa data não representa validade automática do certificado nem decisão de adequação ao uso.

**Maior tendência em módulo** identifica a tendência de maior magnitude, preservando seu sinal. **|Tendência| + U95** é uma expressão numérica; não constitui decisão de aceitação. A origem do valor de referência informado em cada ponto permanece uma pendência técnica a ser definida no procedimento.

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## O que mudou em 22/10/2026 (identificação completa e vários padrões)

- **Identificação do equipamento completa.** Escolhido o equipamento, tudo o que está preenchido em Cadastros › Equipamentos sai no documento: tipo, fabricante (marca), modelo, nº de série, TAG, patrimônio, setor, capacidade, câmaras ou portas e ano de fabricação. Campo preenchido no cadastro fica travado na tela, com a explicação de onde corrigir (Cadastros › Equipamentos › Editar); campo vazio no cadastro pode ser completado no quadro "Cliente e equipamento", em "Gravar no cadastro" (só grava o que está vazio). Linha vazia não aparece no documento.
- **Vários padrões de referência.** Os padrões continuam marcados por bloco (quantos forem). A tabela "Padrões de referência utilizados" do certificado passa a trazer, de cada padrão, fabricante, modelo, nº de série, certificado, laboratório, data de calibração, validade e incerteza do certificado, conforme Cadastros › Padrões de referência (controle documental do padrão).
- Documentos e rascunhos antigos, com um padrão só, continuam abrindo e gerando igual.

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica:** na busca de certificados emitidos (por CNPJ), ao lado de "Reabrir certificado", e no quadro "Documentos gerados: corrigir ou usar como base", no fim da tela. Cada linha mostra o número, a revisão (Rev. 00, Rev. 01...), a situação (Vigente ou Substituído pela Rev. NN), quem gerou e quando, e os botões "Abrir PDF", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Gerar Certificado de Calibração". Este gerador não tem etapa de aprovação: sai na hora a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Gerar Certificado de Calibração". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.



**Certificados emitidos antes de 21/10/2026** também podem ser corrigidos pela busca por CNPJ: o formulário é remontado a partir do registro do próprio certificado (cliente, equipamento, técnico, datas, local, blocos com as leituras e os padrões, fotos e solicitação de próxima calibração). Só a temperatura ambiente e a umidade relativa precisam ser digitadas de novo, porque o certificado antigo guardou apenas a frase das condições ambientais; o quadro do alto avisa. Padrão que venceu ou foi inativado depois da emissão é recusado na correção: troque o padrão do bloco. O certificado corrigido sai da busca (fica como substituído) e o relatório interpretativo é gerado de novo a partir da revisão nova.
