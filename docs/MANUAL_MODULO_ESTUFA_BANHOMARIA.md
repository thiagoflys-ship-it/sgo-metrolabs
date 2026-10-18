# Manual do Operador — Módulo Estufa + Banho-maria

## O que mudou em 18/10/2026

- O certificado em A4 ganhou um sumário na primeira página, com o número da página de cada seção. As seções e subseções são numeradas (por exemplo, "5.1 Critérios de aceitação" e "7.2 Observações").
- O quadro colorido com o parecer aparece só no início do documento. A conclusão termina com o parecer em uma linha.
- A tabela "Verificação dos critérios de aceitação" mostra o resultado obtido e a situação de cada estudo. O requisito fica na seção 5.1.
- A revisão do documento sai com dois dígitos ("Revisão 00"). A tela e os botões não mudaram.

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- São quatro perfis: Estufa de Incubação, Banho-maria, Estufa de Esterilização/Despirogenização e Secadora de traqueias (CME).
- Selo verde "APROVADO (COM OBSERVAÇÃO)": saída da faixa dentro da tolerância declarada. O equipamento está aprovado e a saída aparece em Observações do certificado.
- O campo "DTL" virou "Identificação do registrador" (TAG do cadastro de Padrões de referência). O botão final é "Confirmar e gerar o certificado".
- Se o arquivo tem várias abas, informe "Nome da aba de dados (opcional)".


> **Atualização de 21/09/2026 — produção v280:** sensores agora são selecionáveis livremente, sem senha para reduzir a quantidade. Orientações antigas de mínimo obrigatório e bloqueio por quantidade neste documento estão substituídas. Incluído o perfil Secadora de traqueias — CME, com três períodos em vazio e três com carga, temperatura e duração editáveis. Consulte o [guia atualizado de operação e relatórios](ESTUFA_SECADORA_SENSORES_20260921.md). O manual incorporado à tela já apresenta o novo funcionamento.

### Qualificação térmica de Estufa de Incubação, Banho-maria e Estufa de Esterilização/Despirogenização — ABNT NBR 16328:2024

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de engenharia ou metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também. Quando terminar a seção 12 (Passo a Passo), você já vai ter feito um laudo inteiro, do início ao fim.

Se em algum momento aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 14) — todo termo técnico do manual está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você recebe um arquivo de um aparelho chamado **datalogger** (um gravador de temperatura), que ficou registrando a temperatura de um equipamento por um período (geralmente 24 horas). Você importa esse arquivo no sistema, preenche alguns dados do cliente e do equipamento, e o sistema:

1. Lê e organiza os dados de temperatura;
2. Compara com o que a norma técnica (ABNT NBR 16328:2024) exige;
3. Decide se o equipamento **passou** ou **não passou** no teste;
4. Gera um **relatório em planilha** (com gráfico) e, se você quiser, um **certificado em PDF** com texto explicativo, prontos para entregar ao cliente.

Você nunca precisa fazer nenhuma conta. O sistema faz todos os cálculos. Sua função é: preencher os dados certos, no campo certo, e conferir se o resultado faz sentido antes de entregar.

---

## 2. Os três tipos de equipamento (perfis)

Antes de tudo, você escolhe **um** destes três tipos na tela (campo "Perfil do equipamento", seção 2). É a decisão mais importante da tela — **a tela inteira muda de acordo com o que você escolhe**, mostrando só os campos que fazem sentido para aquele equipamento e escondendo o resto.

| Perfil que você escolhe | Nome técnico da norma | Faixa de temperatura sugerida | Sensores mínimos exigidos |
|---|---|---|---|
| **Estufa de Incubação** | Anexo F | 33 °C a 37 °C (ajustável) | 12 |
| **Banho-maria** | Anexo I | 36 °C a 40 °C (ajustável) | 6 |
| **Estufa de Esterilização/Despirogenização** | Anexo E | 160 °C a 260 °C (ajustável) | 12 |

**Por que a faixa de temperatura é "sugerida" e ajustável?** Porque, ao contrário de uma geladeira de vacina (que sempre tem que ficar entre 2 °C e 8 °C por lei), a norma não fixa uma temperatura única para estes três equipamentos — cada cliente usa a temperatura que o processo dele exige. O sistema já vem com um valor de partida plausível, mas **você sempre confirma com o cliente/protocolo antes de gerar o laudo final.**

**Por que os sensores mínimos mudam?** É exigência direta da norma para cada tipo de equipamento — não é um número que o sistema escolhe. Se você tentar gerar um laudo oficial com menos sensores que o mínimo, o sistema **bloqueia** e não deixa continuar (mais detalhes na seção 8).

---

## 3. Mapa da tela — visão geral

A tela é dividida em 6 blocos numerados, de cima para baixo:

1. **Cliente** — quem é o dono do equipamento.
2. **Equipamento** — qual equipamento está sendo testado, e em qual faixa de temperatura.
3. **Estudos do Ensaio** — quais testes você vai reportar (mudam de acordo com o perfil escolhido).
4. **Importação do Datalogger** — de onde vêm os dados de temperatura.
5. **Gerar Relatório** — o botão que processa tudo e entrega a planilha + PDF.
6. **Certificado de Qualificação Térmica (Beta)** — um segundo documento, opcional, com texto explicativo gerado por Inteligência Artificial.

Existe ainda um **Console Operacional** no fim da tela — um "diário de bordo" que mostra tudo que o sistema está fazendo, em tempo real, enquanto você usa.

---

## 4. Seção 1 — Cliente

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **CNPJ** | Número de identificação da empresa cliente | Preenche automaticamente nome e endereço do cliente | Digite o CNPJ e clique em "Buscar CNPJ" — o sistema consulta uma base pública e preenche os dois campos abaixo sozinho |
| **Buscar CNPJ** (botão) | Dispara a busca automática | Evita digitar nome/endereço manualmente | Clique depois de digitar o CNPJ |
| **Cliente / Razão Social** | Nome oficial da empresa | Aparece na capa do laudo | Confira se veio certo depois da busca automática; se a busca falhar, digite manualmente |
| **Endereço** | Endereço da empresa | Aparece na capa do laudo | Mesma lógica do campo acima |
| **Responsável técnico (assinatura do laudo)** | Seu nome, ou o nome de quem está assinando tecnicamente o laudo | É o nome que aparece como responsável pelo documento | Digite o nome completo da pessoa que vai assinar |

**O que acontece se eu deixar em branco?** O laudo é gerado do mesmo jeito, mas fica com campos vazios na capa — o que passa uma imagem pouco profissional para o cliente. Preencha sempre antes de gerar o relatório final.

---

## 5. Seção 2 — Equipamento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Perfil do equipamento** | O tipo de equipamento (ver seção 2 deste manual) | Define toda a lógica da tela: faixa sugerida, sensores mínimos, quais estudos aparecem | Escolha o tipo certo **antes** de preencher qualquer outra coisa — trocar depois reseta alguns campos |
| **TAG / Identificação** | Código interno do equipamento no cliente (etiqueta, patrimônio) | Identifica qual equipamento específico foi testado, entre vários do mesmo cliente | Copie do equipamento físico ou peça ao cliente |
| **Marca** | Fabricante do equipamento | Informação de identificação no laudo | Digite o nome do fabricante |
| **Modelo** | Modelo do equipamento | Informação de identificação no laudo | Digite o modelo |
| **Número de série** | Número de série de fábrica | Informação de identificação no laudo | Digite o número de série |
| **Localização** | Onde o equipamento fica fisicamente (sala, setor) | Ajuda a rastrear o equipamento no cliente | Digite o local |
| **Volume interno declarado (L)** | Volume em litros da câmara interna | Só um dado informativo do laudo | Preencha se souber — **não muda o número mínimo de sensores** (isso é decidido só pelo tipo de equipamento, explicado na seção 2) |

### Faixa operacional

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Faixa mínima (°C)** | Temperatura mínima aceitável para este equipamento | É o piso: leituras abaixo disso reprovam o ensaio | Já vem preenchido com um valor sugerido ao escolher o perfil — ajuste se o protocolo do cliente pedir outro valor |
| **Faixa máxima (°C)** | Temperatura máxima aceitável | É o teto: leituras acima disso reprovam o ensaio | Mesma lógica do campo acima |
| **Tolerância operacional (°C)** | Uma margem de segurança em torno da faixa | Uma leitura que passou da faixa por **pouco** (dentro da tolerância) vira "Aprovado com Alerta" em vez de "Reprovado" direto | Normalmente não precisa mexer — já vem com um valor padrão sensato para o perfil |

**Importante:** estes três campos **sempre podem ser editados**, em qualquer perfil — o sistema não trava nenhum deles. Eles só vêm pré-preenchidos com um valor de partida razoável para te ajudar; a responsabilidade de confirmar o valor certo com o protocolo do cliente é sua.

---

## 6. Seção 3 — Estudos do Ensaio

**Ideia central desta seção:** todos os estudos que você marcar aqui são lidos **do mesmo arquivo** de datalogger, que você importa na seção 4. Você não precisa de um arquivo separado para cada estudo — o sistema recorta os pedaços certos do mesmo arquivo, usando os horários de início/fim que você informar em cada bloco abaixo.

Você pode marcar **mais de um estudo** no mesmo laudo (por exemplo: Distribuição de Temperatura + Abertura de Porta, os dois no mesmo relatório).

**Os blocos que aparecem mudam conforme o perfil escolhido.** A tabela abaixo mostra o que aparece em cada um:

| Estudo | Estufa de Incubação | Banho-maria | Estufa Esterilização/Despirogenização |
|---|:---:|:---:|:---:|
| Distribuição de Temperatura | ✅ | ✅ | — |
| Abertura de Porta | ✅ | — | — |
| Queda de Energia | ✅ | — | — |
| Distribuição em Vazio (3 repetições) | — | — | ✅ |
| Penetração com Carga e Letalidade (3 repetições) | — | — | ✅ |

Se um bloco não aparece na sua tela, é porque a norma não pede aquele estudo para o equipamento que você escolheu — **não é um erro do sistema**, é intencional.

### 6.1 Distribuição de Temperatura (Estufa de Incubação e Banho-maria)

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de distribuição?** | Liga/desliga este estudo no laudo | Se "Não incluir", nada deste bloco entra no relatório final | Escolha "Sim — em vazio" (equipamento sem produto dentro) ou "Sim — com carga" (equipamento com produto/amostras dentro) |
| **Início do estudo** | Data/hora em que a gravação do teste começou | Delimita, dentro do arquivo completo, onde este estudo começa | Digite no formato `dd/MM/aaaa HH:mm:ss`, ex.: `10/07/2026 08:00:00` |
| **Fim do estudo** | Data/hora em que a gravação do teste terminou | Delimita onde este estudo termina | Mesmo formato do campo acima |
| **Fim da rampa de estabilização** (opcional) | O momento em que o equipamento **terminou de esquentar/esfriar** e entrou na faixa de trabalho | Leituras **antes** desse horário não contam para aprovação/reprovação (é normal um equipamento recém-ligado ainda não estar na temperatura certa) | Deixe em branco se o equipamento **já estava estável** quando a gravação começou. Preencha só se o técnico ligou o equipamento frio/fora da faixa e já começou a gravar |
| **Detectar rampa automaticamente** (botão) | Pede para o sistema **sugerir** esse horário sozinho, olhando os dados | Evita você ter que descobrir manualmente, olhando gráfico por gráfico | Clique — o sistema mostra a sugestão e **pede sua confirmação** antes de aplicar. Você sempre pode recusar |
| **Utilizou tampa durante o ensaio?** (só aparece no Banho-maria) | Se a cuba do banho-maria estava com tampa ou aberta | A norma pede que isso conste no laudo (item I.2.f) | Escolha "Sim, com tampa" ou "Não, sem tampa" |
| **Quantidade de líquido na cuba** (só aparece no Banho-maria) | Observação livre sobre o nível de líquido | A norma pede que a quantidade de líquido seja registrada (item I.2.e) | Escreva algo como "cuba cheia até a marca de nível" |

> **Sobre a duração exigida:** para Estufa de Incubação, a norma recomenda 24 horas contínuas de gravação. Para Banho-maria, **não há duração fixa** — o tempo é definido pelo protocolo do cliente. O aviso que aparece embaixo do título do bloco muda sozinho conforme o perfil escolhido, avisando qual das duas regras se aplica.

**O que acontece se eu não usar "Detectar rampa automaticamente" e nem preencher manualmente?** O sistema assume que **todas** as leituras do arquivo, do início ao fim, contam para aprovação — inclusive as primeiras, quando o equipamento ainda pode estar esquentando. Se o equipamento já estava estável quando você começou a gravar (o mais comum), isso é o comportamento certo e você não precisa fazer nada.

### 6.2 Abertura de Porta (só Estufa de Incubação)

Simula o que acontece quando um funcionário abre a porta do equipamento durante o uso — quanto tempo a temperatura demora para voltar ao normal.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de abertura de porta neste laudo** (caixa de marcar) | Liga/desliga este bloco inteiro | Sem marcar, os campos abaixo ficam escondidos e não entram no laudo | Marque só se este teste foi realmente feito |
| **Tipo de abertura** | Se a porta foi aberta parcialmente ou totalmente | Documenta como o teste foi conduzido | Escolha "Porta semiaberta" ou "Porta totalmente aberta" |
| **Início do evento** | Hora exata em que a porta foi aberta | Marca, dentro do arquivo, onde está esse evento | Digite `dd/MM/aaaa HH:mm:ss` |
| **Fim do evento** (opcional) | Hora em que a porta foi fechada de novo | Ajuda a visualizar o evento no gráfico | Preencha se souber; pode deixar em branco |
| **Tempo-alvo mínimo (min)** (opcional) | Quanto tempo, no máximo, o equipamento pode demorar para voltar à faixa normal depois do evento | **Este é o campo que decide se o resultado é Aprovado/Reprovado ou só informativo** — veja o quadro abaixo | Preencha só se o protocolo do cliente definir um tempo-limite |

> **Muito importante — leia com atenção:** Se você **preencher** o "Tempo-alvo mínimo", o sistema vai comparar o tempo real de recuperação com esse valor e marcar o estudo como **Aprovado** ou **Reprovado**. Se você **deixar em branco**, o sistema só **documenta** quanto tempo o equipamento levou para se recuperar, **sem aprovar nem reprovar** — vira uma informação de caracterização do equipamento, não um critério de corte. Use isso a seu favor: se o cliente não tem um critério definido, deixe em branco e apenas reporte o tempo medido.

### 6.3 Queda de Energia (só Estufa de Incubação)

Mesma lógica da Abertura de Porta, mas simulando uma falta de energia em vez de porta aberta.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de queda de energia neste laudo** | Liga/desliga este bloco | — | Marque só se este teste foi realmente feito |
| **Início do evento** | Hora em que a energia caiu | Marca o evento no arquivo | `dd/MM/aaaa HH:mm:ss` |
| **Fim do evento** (opcional) | Hora em que a energia voltou | Ajuda o gráfico | Preencha se souber |
| **Tempo-alvo mínimo (min)** (opcional) | Quanto tempo o equipamento pode ficar sem energia antes de sair da faixa seguramente | Mesma regra da seção 6.2: com valor preenchido vira Aprovado/Reprovado; em branco vira só informativo | Preencha conforme o protocolo do cliente, ou deixe em branco para só documentar |

### 6.4 Distribuição em Vazio — Anexo E (só Estufa de Esterilização/Despirogenização)

Este estudo verifica se a temperatura fica uniforme dentro da estufa **sem nenhum produto/carga dentro**, e a norma exige que ele seja feito **3 vezes** (3 repetições independentes), não apenas uma.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de distribuição em vazio (Anexo E) neste laudo** | Liga/desliga o bloco inteiro | — | Marque se este ensaio foi feito |
| **Repetição 1/2/3 — Início e Fim** | Data/hora de cada uma das 3 execuções do teste | Cada repetição é analisada separadamente, e depois o sistema junta o resultado das três num veredito único | Preencha as 3 repetições — são 3 pares de campos (início e fim de cada uma) |

**Por que 3 vezes?** Porque um único teste pode ter sido sorte ou azar. Repetir 3 vezes garante que o resultado é consistente. **Se qualquer uma das 3 repetições reprovar, o resultado final do estudo é Reprovado** — mesmo que as outras duas tenham passado.

### 6.5 Penetração com Carga e Letalidade — Anexo E (só Estufa de Esterilização/Despirogenização)

Este é o estudo mais técnico do sistema. Ele mede se o calor realmente **penetrou** dentro da carga (produto/material dentro da estufa) o suficiente para **matar micro-organismos** (esterilização) ou **destruir endotoxinas** (despirogenização). Também exige 3 repetições.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de penetração com carga (Anexo E) neste laudo** | Liga/desliga o bloco | — | Marque se este ensaio foi feito |
| **Tipo de ensaio** | Escolha entre **Esterilização (calor seco — FH)** ou **Despirogenização (endotoxina — FD)** | Cada tipo usa uma fórmula de cálculo diferente (ver Glossário: FH e FD) | Escolha conforme o objetivo do cliente — nunca os dois ao mesmo tempo neste bloco |
| **Valor mínimo exigido (min)** (opcional) | O valor de FH ou FD mínimo que o processo precisa atingir | Se deixar em branco, o sistema usa um valor padrão internacional (30 min) | Preencha só se o cliente/protocolo exigir um valor diferente do padrão |
| **Repetição 1/2/3 — Início e Fim** | Data/hora de cada uma das 3 execuções | O sistema calcula o FH ou FD de cada repetição a partir da curva de temperatura registrada | Preencha as 3 |
| **Resultado de laboratório** (por repetição) | Se um laboratório terceirizado testou um **Indicador Biológico** ou fez um **Ensaio de Endotoxina** naquela repetição | **Este resultado manda mais que o cálculo do sistema** — veja o aviso abaixo | Escolha o tipo, se aplicável |
| **Resultado** (por repetição) | Se o laboratório aprovou ou reprovou aquela amostra | Junto com o campo acima, define o resultado final daquela repetição | Escolha "Aprovado" ou "Reprovado" conforme o laudo do laboratório |
| **Lote / Validade / Laboratório responsável** (por repetição) | Dados de rastreabilidade do indicador/ensaio usado | Documentação, exigida para auditoria | Preencha com os dados do produto usado no teste |
| **Laudo do laboratório (PDF)** (por repetição, opcional) | Upload do laudo que o laboratório terceirizado emitiu | Anexa o comprovante junto ao seu relatório | Clique no campo de arquivo e escolha o PDF do computador |
| **Registro impresso do ciclo do equipamento** (por repetição) | Upload do papel/gráfico que o próprio equipamento imprime durante o ciclo | **Obrigatório quando o tipo de ensaio é Despirogenização** (exigência direta da norma, item B.3.f) | Anexe o arquivo (PDF ou imagem). Se faltar, o sistema **avisa** no laudo, mas não bloqueia a geração |

> **O ponto mais importante deste bloco:** o cálculo térmico (FH/FD) que o sistema faz é uma estimativa a partir da temperatura registrada. Mas se você preencher o **Resultado de laboratório** como "Reprovado", **isso vale mais que o cálculo** — mesmo que o número de FH/FD tenha batido a meta, a repetição é considerada reprovada. É assim porque o teste de laboratório mede o efeito real (micro-organismo morto de verdade, endotoxina destruída de verdade), enquanto o cálculo térmico é só uma previsão baseada na curva de temperatura.

---

## 7. Sensores

Aparece logo depois dos blocos de estudos, ainda dentro da seção 3.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Nº de sensores instalados** | Quantos sensores de temperatura foram usados na gravação | Define quantos "canais" de temperatura o sistema vai procurar no arquivo importado | Digite o número real de sensores usados no teste. Já vem pré-preenchido com o mínimo exigido pelo perfil escolhido |
| **Sensores S1, S2, S3...** (caixas de marcar, uma para cada sensor) | Lista de todos os sensores, de acordo com o número informado acima | Permite desmarcar um sensor específico se ele, por exemplo, teve defeito durante a gravação e não deve entrar no cálculo | Deixe todos marcados por padrão; desmarque só sensores que você sabe que falharam |

**O que acontece se eu colocar menos sensores que o mínimo exigido?** Um aviso vermelho aparece na tela na hora, e o sistema **bloqueia a geração do laudo**, mostrando uma mensagem de erro. Isso é proposital: impede que um laudo saia fora da norma sem ninguém perceber.

---

## 8. Seção 4 — Importação do Datalogger

Aqui você diz ao sistema **de onde** vêm os dados de temperatura.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Modo de entrada** | Escolha de como os dados vão chegar ao sistema | Cada opção muda os campos que aparecem embaixo | Escolha uma das 3 opções da tabela abaixo |

### As opções de "Modo de entrada"

| Opção | Quando usar | Como funciona |
|---|---|---|
| **ID / link do arquivo no Drive** | O caso mais comum: você já tem o arquivo exportado do datalogger (uma planilha/CSV) | Cole o link do Google Drive no campo, **ou** clique no campo de arquivo abaixo e escolha o arquivo direto do computador — o sistema faz o upload sozinho e preenche o link |
| **Colar dados brutos** | Quando você tem os dados mas não quer subir um arquivo — por exemplo, copiou de outro programa | Cole o texto (cabeçalho + linhas, com colunas separadas por tab, vírgula ou ponto e vírgula) direto na caixa de texto |
| **Um arquivo por sensor (datalogger individual)** | Quando cada sensor gravou seu **próprio** arquivo separado (dataloggers individuais, não um gravador central) | Volte à seção "Sensores": cada sensor marcado ganha seu próprio campo de link/upload. O sistema junta e alinha os horários de todos automaticamente |

**Pré-visualizar dados** (botão, mais abaixo nesta seção): depois de escolher o arquivo/dados, clique aqui para conferir, **antes de gerar o laudo final**, se o sistema está lendo os dados certos — ele mostra quantas linhas, quantos sensores e qual formato de data foi detectado, e uma prévia da tabela. **Use sempre antes de gerar o relatório**, é a forma mais rápida de pegar um arquivo errado antes de gastar tempo gerando um laudo que vai sair errado.

---

## 9. Seção 5 — Gerar Relatório

| Elemento | O que é | O que fazer |
|---|---|---|
| **Gerar Relatório** (botão) | Processa tudo que você preencheu e produz o laudo final | Clique só depois de conferir tudo (recomendado: rodar "Pré-visualizar dados" antes) |
| **Limpar Log** (botão) | Apaga o histórico do Console Operacional (seção 11) | Use se a tela de log estiver muito cheia e você quiser começar do zero visualmente — não afeta os dados já preenchidos |

### O que aparece depois de clicar em "Gerar Relatório"

O sistema mostra um "selo" colorido com o status geral do laudo, e um selo separado para cada estudo incluído. Veja o que cada status significa:

| Status | O que significa | O que fazer |
|---|---|---|
| **APROVADO** | O equipamento passou em tudo, dentro da faixa e da tolerância, o tempo todo | Pode entregar o laudo normalmente |
| **APROVADO (COM OBSERVAÇÃO)** | Passou; alguma leitura saiu da faixa, mas ficou dentro da tolerância declarada | Pode entregar; a saída aparece em Observações do certificado e da planilha |
| **REPROVADO** | O equipamento saiu da faixa aceitável em algum momento (além da tolerância), ou uma repetição/indicador de laboratório reprovou | **Não invente uma solução sozinho** — reporte ao responsável técnico/cliente. O motivo exato da reprovação aparece no Console Operacional (seção 11) |
| **INFORMATIVO** ou **CARACTERIZAÇÃO** | O estudo não teve critério de aprovação/reprovação definido (ex.: Abertura de Porta ou Queda de Energia sem "Tempo-alvo mínimo" preenchido) — o sistema só está documentando o que aconteceu, sem julgar se é bom ou ruim | Normal — nada a fazer, é assim que o estudo foi configurado |

Depois do selo de status, aparecem dois botões:

- **Abrir planilha** — abre o relatório completo (com tabelas e gráfico) direto no navegador.

> Atualização de 18/10/2026: não existe "aprovado com alerta". A excursão dentro da tolerância declarada aprova o estudo e vai para Observações (no certificado sai "Aprovado"; na planilha e no selo da tela, "APROVADO (COM OBSERVAÇÃO)", em verde). O PDF da planilha (relatório de dados) também fica salvo na pasta do cliente (subpasta do CNPJ), com o nome "Relatório de dados ... - <TAG> - <aaaa-MM-dd HHmm>.pdf"; a frase logo abaixo dos botões confirma o arquivo ou diz por que não salvou.
- **Baixar PDF** — baixa o mesmo relatório já convertido em PDF, pronto para enviar ao cliente.

**Se o laudo tiver mais de um estudo marcado (ex.: Distribuição + Abertura de Porta), o status geral no topo é o pior status entre todos os estudos** — ou seja, se um estudo reprovar, o laudo inteiro aparece como Reprovado no selo geral, mesmo que os outros estudos tenham aprovado.

---

## 10. Seção 6 — Certificado de Qualificação Térmica (Beta)

Este é um **segundo documento**, opcional, diferente da planilha da seção 5. Ele não substitui a planilha — é complementar. É um PDF em formato de página A4, com texto corrido explicando o ensaio (não uma tabela de dados). Os textos (Introdução, Objetivo, Análise, Conclusão) são **escritos por Inteligência Artificial**, a partir dos números que o sistema já calculou.

| Campo | O que é | Para que serve |
|---|---|---|
| **Número do Certificado** | Código do documento (ex.: `02062026/01RJ`) | Numeração/controle interno |
| **Revisão** | Número da versão do certificado (0, 1, 2...) | Controle de revisões, caso o certificado precise ser reemitido |
| **DTL (identificação do data logger)** | Código do equipamento gravador usado | Rastreabilidade do instrumento de medição |
| **Responsável pelo aceite (cliente)** | Nome de quem, do lado do cliente, está aceitando o certificado | Aparece no documento como aceite formal |
| **Tarefa de origem** (opcional) | Código de uma ordem de serviço/tarefa relacionada, se houver | Rastreabilidade interna |
| **Registros fotográficos** (até 4, opcional) | Fotos do equipamento/ensaio, cada uma com uma legenda | Ilustra o certificado com evidência visual |

### Como gerar

1. Clique em **"Gerar Rascunho com IA"** — o sistema roda a mesma análise da seção 5 e pede para a IA escrever os textos.
2. **Revise os textos** que aparecem (Introdução, Objetivo, Análise por estudo, Conclusão Geral) — **eles vão direto para o documento final exatamente como estiverem na tela**, então corrija qualquer coisa que pareça errada antes de continuar.
3. Clique em **"Confirmar e Gerar Certificado"** — o documento abre em uma nova aba, pronto para imprimir (Ctrl+P) ou salvar como PDF.

**Atenção:** como o texto é gerado por IA, **sempre leia antes de confirmar**. A IA escreve com base nos números certos, mas o texto em si precisa da sua revisão antes de virar um documento oficial.

---

## 11. Console Operacional (o log)

É a caixa preta, no fim da tela, com fundo escuro, chamada "LOG OPERACIONAL". Toda ação que o sistema faz — carregar a configuração, ler o arquivo, calcular resultados, gerar o PDF — aparece ali como uma linha de texto, com hora.

| Cor da linha | O que significa |
|---|---|
| Verde | Sucesso — a ação deu certo |
| Amarelo | Aviso — algo que você deve prestar atenção, mas não é um erro |
| Vermelho | Erro — algo falhou e precisa da sua ação |

**Quando algo dá errado e você não sabe por quê, olhe sempre o Console Operacional primeiro** — a mensagem de erro exata, e muitas vezes o motivo específico (ex.: "sensor 3 ficou 2,1 °C acima da faixa às 14:32:00"), está sempre registrada ali.

---

## 12. Passo a passo — gerando um laudo do zero

Um roteiro prático, resumindo tudo o que este manual explica, para você seguir na primeira vez.

1. Abra o sistema. Espere o selo "SISTEMA ONLINE" aparecer no topo.
2. **Seção 1 (Cliente):** digite o CNPJ, clique em "Buscar CNPJ", confira nome/endereço, preencha o responsável técnico.
3. **Seção 2 (Equipamento):** escolha o perfil correto (Estufa de Incubação / Banho-maria / Estufa de Esterilização-Despirogenização). Preencha TAG, marca, modelo, número de série, localização. Confira a faixa de temperatura sugerida e ajuste se o protocolo do cliente pedir outro valor.
4. **Seção 3 (Estudos):** marque os estudos que você realmente fez (o sistema já mostra só as opções válidas para o perfil escolhido). Preencha os horários de início/fim de cada um. Preencha o número de sensores usados.
5. **Seção 4 (Importação):** escolha o modo de entrada certo e informe o arquivo/dados. Clique em "Pré-visualizar dados" e confira se o número de linhas e sensores detectados bate com o que você espera.
6. **Seção 5:** clique em "Gerar Relatório". Confira o selo de status geral e o de cada estudo. Se algo reprovou, olhe o Console Operacional para entender o motivo exato.
7. Clique em "Abrir planilha" para conferir visualmente o relatório completo (tabela, gráfico), ou "Baixar PDF" para já baixar o documento final.
8. **(Opcional) Seção 6:** se o cliente pediu também o Certificado, preencha os campos daquela seção, clique em "Gerar Rascunho com IA", **leia com atenção** os textos gerados, corrija o que precisar, e clique em "Confirmar e Gerar Certificado".

---

## 13. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| Sistema bloqueia e diz que o número de sensores é insuficiente | Você digitou menos sensores que o mínimo exigido para o perfil escolhido | Confira o mínimo na tabela da seção 2 deste manual e ajuste o número de sensores usados no ensaio |
| "Pré-visualizar dados" mostra um número de sensores diferente do que você esperava | O arquivo importado tem mais ou menos colunas de temperatura do que você imaginava | Confira o arquivo original antes de prosseguir — não gere o laudo até bater o número certo |
| Um estudo aparece como "Reprovado" mas você achava que devia estar "Aprovado" | Alguma leitura de temperatura saiu da faixa/tolerância configurada, ou (no Anexo E) o indicador de laboratório foi marcado como reprovado | Olhe o Console Operacional — o motivo exato da reprovação sempre aparece ali |
| Bloco de estudo (ex.: Abertura de Porta) não aparece na tela | O perfil escolhido não usa esse estudo, segundo a norma | Confira a tabela da seção 6 deste manual — não é erro, é intencional |

---

## 14. Glossário

| Termo | Explicação simples |
|---|---|
| **Anexo E, F, I** | São capítulos numerados dentro da norma ABNT NBR 16328:2024, cada um com regras específicas para um tipo de equipamento. E = Estufa de Esterilização/Despirogenização; F = Estufa de Incubação; I = Banho-maria |
| **Datalogger** | Aparelho gravador de temperatura, que fica registrando leituras ao longo do tempo e depois gera um arquivo com esses dados |
| **Faixa operacional** | O intervalo de temperatura (mínima até máxima) considerado aceitável para aquele equipamento funcionar corretamente |
| **Tolerância** | Uma margem extra em torno da faixa — uma leitura que passou um pouco do limite, mas dentro dessa margem, não é tratada como uma falha grave |
| **Rampa de estabilização** | O período inicial em que um equipamento recém-ligado ainda está esquentando/esfriando até chegar na temperatura de trabalho — leituras desse período não contam para aprovação |
| **FH** | Sigla usada no cálculo de esterilização por calor seco — um número que resume, em minutos equivalentes, o quanto de "efeito esterilizante" a temperatura registrada realmente entregou |
| **FD** | Mesma ideia do FH, mas para despirogenização (destruição de endotoxinas) — usa uma fórmula com parâmetros diferentes |
| **Indicador Biológico** | Um produto de laboratório com micro-organismos conhecidos, usado para testar na prática se o processo de esterilização realmente matou o que precisava matar |
| **Ensaio de Endotoxina** | Teste de laboratório que mede se o processo de despirogenização realmente destruiu as endotoxinas presentes |
| **Letalidade** | Termo geral para "o quanto aquele processo térmico foi eficaz em matar/destruir o que precisava" — é o que o FH e o FD medem |
| **Penetração com carga** | Estudo que verifica se o calor chegou de verdade até o centro do material que está sendo processado, não só na câmara vazia ao redor |
| **Distribuição em vazio** | Estudo que verifica se a temperatura é uniforme dentro da câmara **sem nada dentro**, só o ar |

---

*Este manual descreve o módulo Estufa + Banho-maria tal como implementado em 2026-07-21. Se a tela mudar no futuro (novos campos, novos perfis), este documento precisa ser atualizado junto — ele não se atualiza sozinho.*
