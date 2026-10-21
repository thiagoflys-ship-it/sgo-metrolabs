# Manual do Operador — Módulo Cadeia de Frio

## O que mudou em 21/10/2026 (revisão completa no molde da autoclave)

- **O ensaio começa pelo cadastro.** A seção 1 virou "Cliente e equipamento": busque o cliente, escolha a unidade e o equipamento. Cliente, CNPJ, endereço, TAG, número de série e local vêm do cadastro e ficam travados; marca e modelo não entram mais nos documentos. Equipamento de outro cliente é recusado.
- **Documentos novos, todos em A4, salvos na pasta do equipamento** (Cadeia de Frio - Laudos / CNPJ do cliente / TAG - tipo / Qualificação):
  - **Relatório de ensaio** (seção 6, retrato): resultado de cada estudo, critérios com a fonte, gráficos, análise e conclusões.
  - **Planilha de dados** (seção 5, A4 deitado): quadro-resumo dos critérios, estatísticas, gráficos, memória de cálculo e as leituras do registrador folha a folha.
  - **Relatório de qualificação do equipamento** (seção 8): consolida os relatórios de ensaio emitidos e a lista de verificação da instalação; a validade aparece na ficha do equipamento, no QR code e nas pendências de requalificação.
- **Aprovação do responsável técnico.** Quem não é responsável técnico envia para aprovação (seção 7). O responsável técnico confere a prévia e emite, ou devolve com o motivo. Emitir de novo o mesmo número gera a revisão seguinte; a anterior fica guardada.
- **Dados com problema não viram documento.** O rascunho mostra a lista do que corrigir: leitura impossível, sensor parado, pico isolado, leitura faltando, lacuna, registrador sem cadastro ou vencido, evento (porta ou energia) começando com sensor fora da faixa, horário do evento ou do fim da rampa fora dos dados, sensor desmarcado sem justificativa, umidade ou estudo não feito sem justificativa.
- **Desvio do método.** Duração menor que 24 h, intervalo de leitura maior que 60 s (distribuição) ou 10 s (porta e energia), menos de 5 min de monitoramento depois do evento e menos sensores que o mínimo aparecem como "Desvio do método" no documento. Não mudam o resultado.
- **Não existe mais "aprovado com observação" na tela.** Saída da faixa dentro da tolerância continua aprovada e aparece em Observações. Estudo sem critério (porta ou energia sem tempo-alvo, autonomia sem mínimo) é informativo e não aprova nem reprova os outros.
- **Norma na edição certa:** ABNT NBR 16328:2024 (3ª edição), Anexo G. A temperatura cinética média (MKT) aparece como informação, sem critério.
- **Novos campos:** "Autonomia mínima exigida" (caixa térmica), "Grandezas e estudos não realizados" (umidade, abertura de porta e queda de energia, com o motivo), "Justificativa dos sensores desconsiderados" e a "Identificação do registrador" agora fica na seção 4.

## O que mudou em 18/10/2026

- O certificado em A4 ganhou um sumário na primeira página, com o número da página de cada seção. As seções e subseções são numeradas (por exemplo, "5.1 Critérios de aceitação" e "7.2 Observações").
- O quadro colorido com o parecer aparece só no início do documento. A conclusão termina com o parecer em uma linha.
- A tabela "Verificação dos critérios de aceitação" mostra o resultado obtido e a situação de cada estudo. O requisito fica na seção 5.1.
- A revisão do documento sai com dois dígitos ("Revisão 00"). A tela e os botões não mudaram.

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- Selo verde "APROVADO (COM OBSERVAÇÃO)": a leitura saiu da faixa, mas ficou dentro da tolerância declarada. O equipamento está aprovado; no certificado sai "Aprovado" e a saída aparece em Observações; na planilha sai "APROVADO (COM OBSERVAÇÃO)".
- O campo "DTL" do certificado virou "Identificação do registrador": digite a TAG do cadastro de Padrões de referência (ex.: DTL-01, DTL-06). O certificado mostra o certificado de calibração e a validade de cada registrador.
- O botão final do certificado é "Confirmar e gerar o certificado". O documento A4 fica salvo em HTML e PDF na pasta do cliente.
- Em "Como enviar os dados", a opção principal é "Arquivo do registrador (enviar ou informar o link)". Confira antes o "Formato de data nos arquivos".
- No celular, a tela abre com uma apresentação curta: toque em "Abrir a tela completa".


### Qualificação térmica de Refrigerador, Câmara de Conservação, Câmara Fria, Freezer, Ultrafreezer e Caixa Térmica — ABNT NBR 16328:2024, Anexo G

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema e não precisa entender de engenharia ou metrologia** para operá-lo. Cada campo da tela está explicado em quatro partes:

- **O que é** — o nome em português simples do que você está vendo.
- **Para que serve** — por que esse campo existe.
- **O que fazer** — como preencher, na prática.
- **O que acontece** — o resultado de preencher certo, errado, ou deixar em branco.

Leia este manual **na ordem**, de cima para baixo, seguindo a tela de cima para baixo também. Quando terminar a seção 13 (Passo a Passo), você já vai ter feito um laudo inteiro, do início ao fim.

Se em algum momento aparecer uma palavra técnica que você não entende, vá direto ao **Glossário** (seção 15) — todo termo técnico do manual está lá, explicado sem jargão.

---

## 1. O que este sistema faz, em uma frase

Você recebe um arquivo de um aparelho chamado **datalogger** (um gravador de temperatura), que ficou registrando a temperatura de um equipamento de cadeia de frio por um período (geralmente 24 horas). Você importa esse arquivo no sistema, preenche alguns dados do cliente e do equipamento, e o sistema:

1. Lê e organiza os dados de temperatura;
2. Compara com o que a norma técnica (ABNT NBR 16328, Anexo G) exige;
3. Decide se o equipamento **passou** ou **não passou** no teste;
4. Gera um **relatório em planilha** (com gráfico) e, se você quiser, um **certificado em PDF** com texto explicativo, prontos para entregar ao cliente.

Você nunca precisa fazer nenhuma conta. O sistema faz todos os cálculos. Sua função é: preencher os dados certos, no campo certo, e conferir se o resultado faz sentido antes de entregar.

---

## 2. Os nove tipos de equipamento (perfis)

Antes de tudo, você escolhe **um** destes tipos na tela (campo "Perfil do equipamento", seção 2). É a decisão mais importante da tela — **a tela inteira muda de acordo com o que você escolhe**, mostrando só os campos que fazem sentido para aquele equipamento e escondendo o resto.

| Perfil que você escolhe | Faixa de temperatura sugerida | Tolerância | A faixa pode ser editada? | Estudos que aparecem |
|---|---|---|---|---|
| **Câmara de Conservação (Imunobiológicos/Vacinas)** | 2 °C a 8 °C | 0,5 °C | **Não** — faixa travada | Distribuição, Abertura de Porta, Queda de Energia |
| **Refrigerador Comum** | 2 °C a 8 °C | 0,5 °C | **Não** — faixa travada | Distribuição, Abertura de Porta, Queda de Energia |
| **Câmara Fria** | 2 °C a 8 °C (sugerido) | 0,5 °C | **Sim** | Distribuição, Abertura de Porta, Queda de Energia |
| **Freezer -10 °C** | -14 °C a -6 °C | 1,0 °C | **Sim** | Distribuição, Abertura de Porta, Queda de Energia |
| **Freezer -20 °C** | -25 °C a -15 °C | 1,0 °C | **Sim** | Distribuição, Abertura de Porta, Queda de Energia |
| **Freezer -30 °C** | -35 °C a -25 °C | 1,0 °C | **Sim** | Distribuição, Abertura de Porta, Queda de Energia |
| **Ultrafreezer -80 °C** | -86 °C a -74 °C | 2,0 °C | **Sim** | Distribuição, Abertura de Porta, Queda de Energia |
| **Ultrafreezer -85 °C** | -91 °C a -79 °C | 2,0 °C | **Sim** | Distribuição, Abertura de Porta, Queda de Energia |
| **Caixa Térmica (Transporte)** | 2 °C a 8 °C | 0,5 °C | **Não** — faixa travada | **Só Autonomia** (ver seção 6.4) |

**Por que alguns perfis têm a faixa "travada" e outros não?** Câmara de Vacina, Refrigerador Comum e Caixa Térmica têm uma faixa regulatória fixa (2 °C a 8 °C, é lei/norma para produtos termolábeis) — por isso os campos de faixa mínima/máxima ficam **desabilitados** (cinza, não dá pra digitar) para esses três. Já Câmara Fria, Freezer e Ultrafreezer variam de instalação para instalação (cada fabricante/modelo tem sua faixa real) — por isso, nesses perfis, os campos ficam **liberados** para você ajustar conforme o equipamento real. A **Tolerância**, em todos os perfis, **sempre pode ser editada**, mesmo quando a faixa está travada.

**Por que a Caixa Térmica é tão diferente dos outros oito?** Porque fisicamente ela é outra coisa: não tem porta que abre/fecha durante o uso normal, não tem fonte de energia, e não fica ligada continuamente — ela é uma caixa isolada usada para **transportar** produto por um tempo limitado. Por isso ela não tem os estudos de Distribuição/Abertura de Porta/Queda de Energia (não fazem sentido para ela) — o único ensaio que ela precisa é a **Autonomia**: quanto tempo ela consegue segurar a temperatura entre 2 °C e 8 °C antes de sair da faixa, sem eletricidade, contando só com o isolamento térmico. Não existe "ensaio de 24 horas" para caixa térmica — o teste dura o tempo que ela aguentar (ou o tempo que você gravou).

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

## 4. Seção 1 — Cliente e equipamento

| Campo | O que é | O que fazer |
|---|---|---|
| **Buscar cliente** | Busca no cadastro de clientes do SGO+, pelo nome ou pelo CNPJ | Digite ao menos 2 letras do nome ou 3 números do CNPJ e toque em "Buscar cliente" |
| **Cliente, Unidade, Equipamento** | As três listas do cadastro | Escolha o cliente, depois a unidade e depois o equipamento ensaiado |
| **Cadastrar cliente / unidade / equipamento** | Atalhos que abrem o cadastro em outra aba | Use se algo não aparecer; depois de salvar, volte e toque em "Atualizar listas" (o que já foi preenchido continua) |
| **Cliente, CNPJ e Endereço (do cadastro)** | Vêm do cadastro e ficam travados | Só confira. Se estiver errado, corrija no cadastro |
| **Técnico executor do ensaio** | Quem executou o ensaio | Digite o nome completo; ele aparece como "Executado por" nos documentos |

**O que acontece se eu não escolher o equipamento?** Nenhum documento é gerado: a tela pede para escolher o cliente, a unidade e o equipamento. Equipamento cadastrado em outro cliente ou em outra unidade é recusado.

---

## 5. Seção 2 — Equipamento

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Perfil do equipamento** | O tipo de equipamento (ver seção 2 deste manual) | Define toda a lógica da tela: faixa sugerida, se a faixa é editável, quais estudos aparecem | Escolha o tipo certo **antes** de preencher qualquer outra coisa — trocar depois reseta os estudos habilitados |
| **TAG, Número de série, Unidade e setor (do cadastro)** | Identificação do equipamento escolhido na seção 1 | Identificam o equipamento nos documentos | Só confira; ficam travados. Marca e modelo não aparecem nos documentos |
| **Volume interno declarado (L)** | Volume em litros da câmara interna | Sugere automaticamente um número de sensores (ver seção 7) | Preencha se souber — não é obrigatório |
| **Equipamento conjugado** (caixa de marcar) | Se o equipamento é dois aparelhos numa peça só (ex.: geladeira com freezer embutido) | Também influencia a sugestão automática de sensores (ver seção 7) | Marque só se o equipamento físico realmente tiver duas partes distintas conjugadas |

### Faixa operacional

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Faixa mínima (°C)** | Temperatura mínima aceitável para este equipamento | É o piso: leituras abaixo disso reprovam o ensaio | Já vem preenchido ao escolher o perfil. **Travado** (cinza) para Câmara de Vacina, Refrigerador Comum e Caixa Térmica; **editável** para Câmara Fria, Freezer e Ultrafreezer |
| **Faixa máxima (°C)** | Temperatura máxima aceitável | É o teto: leituras acima disso reprovam o ensaio | Mesma lógica do campo acima |
| **Tolerância operacional (°C)** | Uma margem de segurança em torno da faixa | Uma leitura que passou da faixa por **pouco** (dentro da tolerância) vira "Aprovado com Alerta" em vez de "Reprovado" direto | **Sempre editável, em qualquer perfil.** Normalmente não precisa mexer — já vem com um valor padrão sensato |

---

## 6. Seção 3 — Estudos do Ensaio

**Ideia central desta seção:** todos os estudos que você marcar aqui são lidos **do mesmo arquivo** de datalogger, que você importa na seção 4. Você não precisa de um arquivo separado para cada estudo — o sistema recorta os pedaços certos do mesmo arquivo, usando os horários de início/fim que você informar em cada bloco abaixo.

Você pode marcar **mais de um estudo** no mesmo laudo (por exemplo: Distribuição de Temperatura + Abertura de Porta + Queda de Energia, os três no mesmo relatório e no mesmo arquivo).

**Os blocos que aparecem mudam conforme o perfil escolhido.** Para os oito perfis "normais" (Câmara de Vacina, Refrigerador, Câmara Fria, Freezers, Ultrafreezers), aparecem Distribuição + Abertura de Porta + Queda de Energia. Para **Caixa Térmica**, só aparece o bloco de Autonomia (seção 6.4) — os outros três somem da tela. Se um bloco não aparece na sua tela, é porque a norma não pede aquele estudo para o equipamento que você escolheu — **não é um erro do sistema**, é intencional.

### 6.1 Distribuição de Temperatura (24h)

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de distribuição?** | Liga/desliga este estudo no laudo | Se "Não incluir", nada deste bloco entra no relatório final | Escolha "Sim — em vazio" (equipamento sem produto dentro) ou "Sim — com carga" (equipamento com produto/amostras dentro) |
| **Início do estudo** | Data/hora em que a gravação do teste começou | Delimita, dentro do arquivo completo, onde este estudo começa | Digite no formato `dd/MM/aaaa HH:mm:ss`, ex.: `10/07/2026 08:00:00` |
| **Fim do estudo** | Data/hora em que a gravação do teste terminou | Delimita onde este estudo termina | Mesmo formato do campo acima |
| **Fim da rampa de estabilização** (opcional) | O momento em que o equipamento **terminou de esfriar** e entrou na faixa de trabalho | Leituras **antes** desse horário não contam para aprovação/reprovação (é normal um equipamento recém-ligado ainda não estar na temperatura certa) | Deixe em branco se o equipamento **já estava estável** quando a gravação começou. Preencha só se o técnico ligou o equipamento quente/fora da faixa e já começou a gravar |
| **Detectar rampa automaticamente** (botão) | Pede para o sistema **sugerir** esse horário sozinho, olhando os dados | Evita você ter que descobrir manualmente, olhando gráfico por gráfico | Clique — o sistema mostra a sugestão e **pede sua confirmação** antes de aplicar. Você sempre pode recusar |

> **Sobre a duração exigida:** a norma pede 24 horas contínuas de gravação para o estudo de Distribuição, para todos os oito perfis (exceto Caixa Térmica, que não tem este estudo).

**O que acontece se eu não usar "Detectar rampa automaticamente" e nem preencher manualmente?** O sistema assume que **todas** as leituras do arquivo, do início ao fim, contam para aprovação — inclusive as primeiras, quando o equipamento ainda pode estar esfriando. Se o equipamento já estava estável quando você começou a gravar (o mais comum), isso é o comportamento certo e você não precisa fazer nada.

### 6.2 Abertura de Porta

Simula o que acontece quando um funcionário abre a porta do equipamento durante o uso — quanto tempo a temperatura demora para sair da faixa (se sair) e quanto tempo leva para voltar ao normal.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de abertura de porta neste laudo** (caixa de marcar) | Liga/desliga este bloco inteiro | Sem marcar, os campos abaixo ficam escondidos e não entram no laudo | Marque só se este teste foi realmente feito |
| **Tipo de abertura** | Se a porta foi aberta parcialmente ou totalmente | Documenta como o teste foi conduzido — é só um metadado, não muda o cálculo | Escolha "Porta semiaberta" ou "Porta totalmente aberta" |
| **Início do evento** | Hora exata em que a porta foi aberta | Marca, dentro do arquivo, onde está esse evento | Digite `dd/MM/aaaa HH:mm:ss` |
| **Fim do evento** (opcional) | Hora em que a porta foi fechada de novo | Ajuda a visualizar o evento no gráfico | Preencha se souber; pode deixar em branco |
| **Tempo-alvo mínimo (min)** (opcional) | Quanto tempo, no mínimo, o equipamento precisa aguentar sem sair da faixa depois do evento | **Este é o campo que decide se o resultado é Aprovado/Reprovado ou só informativo** — veja o quadro abaixo | Preencha só se o protocolo do cliente definir um tempo-limite |

> **Muito importante — leia com atenção:** Se você **preencher** o "Tempo-alvo mínimo", o sistema vai comparar quanto tempo o equipamento aguentou sem sair da faixa com esse valor e marcar o estudo como **Aprovado** ou **Reprovado**. Se você **deixar em branco**, o sistema só **documenta** os tempos observados (até romper e até recuperar), **sem aprovar nem reprovar** — vira uma informação de caracterização do equipamento, não um critério de corte. Use isso a seu favor: se o cliente não tem um critério definido, deixe em branco e apenas reporte os tempos medidos.

### 6.3 Queda de Energia

Mesma lógica da Abertura de Porta, mas simulando uma falta de energia em vez de porta aberta — a porta permanece fechada durante todo este ensaio.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de queda de energia neste laudo** | Liga/desliga este bloco | — | Marque só se este teste foi realmente feito |
| **Início do evento** | Hora em que a energia caiu | Marca o evento no arquivo | `dd/MM/aaaa HH:mm:ss` |
| **Fim do evento** (opcional) | Hora em que a energia voltou | Ajuda o gráfico | Preencha se souber |
| **Tempo-alvo mínimo (min)** (opcional) | Quanto tempo o equipamento pode ficar sem energia antes de sair da faixa seguramente | Mesma regra da seção 6.2: com valor preenchido vira Aprovado/Reprovado; em branco vira só informativo | Preencha conforme o protocolo do cliente, ou deixe em branco para só documentar |

### 6.4 Autonomia (só Caixa Térmica)

Este é o único estudo do perfil Caixa Térmica — mede quanto tempo ela sustenta a faixa de 2 °C a 8 °C, sem eletricidade, contando só com o isolamento térmico e a carga fria (gelo/gelox) colocada dentro.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Incluir estudo de autonomia neste laudo** | Liga/desliga este bloco | — | Marque para incluir o ensaio |
| **Início do período gravado** | Hora em que a gravação começou (caixa fechada, pronta para o teste) | Marca o início da contagem | `dd/MM/aaaa HH:mm:ss` |
| **Fim do período gravado** | Hora em que a gravação terminou | Marca o fim da contagem | `dd/MM/aaaa HH:mm:ss` |

**Como o sistema decide o resultado?** Diferente de Abertura de Porta/Queda de Energia, aqui **não existe "tempo-alvo" para preencher** — o próprio objetivo do ensaio é **descobrir** quanto tempo a caixa aguenta, não verificar se ela bateu uma meta. O sistema procura o primeiro momento em que algum sensor saiu da faixa e reporta esse tempo como a **autonomia medida**. Se nenhum sensor saiu da faixa durante todo o período gravado, o sistema reporta a autonomia como "pelo menos o tempo todo gravado" e sugere estender a gravação da próxima vez, para descobrir o limite real. Este estudo **nunca aparece como Aprovado/Reprovado** — o status é sempre uma caracterização (a norma não define um tempo mínimo universal; cada cliente define, por fora do sistema, se a autonomia medida atende à necessidade dele de transporte).

---

## 7. Sensores

Aparece logo depois dos blocos de estudos, ainda dentro da seção 3.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Nº de sensores instalados** | Quantos sensores de temperatura foram usados na gravação | Define quantos "canais" de temperatura o sistema vai procurar no arquivo importado | Digite o número real de sensores usados no teste |
| **Sensores S1, S2, S3...** (caixas de marcar, uma para cada sensor) | Lista de todos os sensores, de acordo com o número informado acima | Permite desmarcar um sensor específico se ele, por exemplo, teve defeito durante a gravação e não deve entrar no cálculo | Deixe todos marcados por padrão; desmarque só sensores que você sabe que falharam |

**De onde vem o número que já aparece preenchido nesse campo?** O sistema sugere automaticamente um número, calculado a partir de dois campos da seção 2 (Equipamento):

| Situação | Sugestão automática |
|---|---|
| "Equipamento conjugado" marcado | 12 sensores |
| Não conjugado, e "Volume interno declarado" preenchido com menos de 60 L | 3 sensores |
| Não conjugado, volume em branco, ou 60 L ou mais | 12 sensores |

Essa conta roda de novo, sozinha, toda vez que você edita o Volume ou marca/desmarca o Equipamento Conjugado.

**Isso me impede de usar outro número?** Não. **É só uma sugestão de partida** — o campo "Nº de sensores instalados" é um número comum, você pode digitar por cima o valor real que foi usado no teste, seja maior ou menor que a sugestão. **O sistema não bloqueia a geração do relatório com um número de sensores diferente do sugerido.** Isso é diferente de outros módulos do Metrolabs (como Estufa+Banho-maria), onde o mínimo de sensores é uma trava rígida. Aqui, a responsabilidade de garantir que o número de sensores usado no ensaio real está de acordo com o protocolo/norma do equipamento é sua, como técnico responsável.

---

## 8. Seção 4 — Importação do Datalogger

Aqui você diz ao sistema **de onde** vêm os dados de temperatura.

| Campo | O que é | Para que serve | O que fazer |
|---|---|---|---|
| **Modo de entrada** | Escolha de como os dados vão chegar ao sistema | Cada opção muda os campos que aparecem embaixo | Escolha uma das opções da tabela abaixo |

### As opções de "Modo de entrada"

| Opção | Quando usar | Como funciona |
|---|---|---|
| **ID / link do arquivo no Drive** | O caso mais comum: você já tem o arquivo exportado do datalogger (uma planilha/CSV) | Cole o link do Google Drive no campo, **ou** clique no campo de arquivo abaixo e escolha o arquivo direto do computador — o sistema faz o upload sozinho e preenche o link |
| **Colar dados brutos** | Quando você tem os dados mas não quer subir um arquivo — por exemplo, copiou de outro programa | Cole o texto (cabeçalho + linhas, com colunas separadas por tab, vírgula ou ponto e vírgula) direto na caixa de texto |
| **Um arquivo por sensor (datalogger individual)** | Quando cada sensor gravou seu **próprio** arquivo separado (dataloggers individuais, não um gravador central) | Volte à seção "Sensores": cada sensor marcado ganha seu próprio campo de link/upload. O sistema junta e alinha os horários de todos automaticamente |

**Pré-visualizar dados** (botão, mais abaixo nesta seção): depois de escolher o arquivo/dados, clique aqui para conferir, **antes de gerar o laudo final**, se o sistema está lendo os dados certos — ele mostra quantas linhas, quantos sensores e qual formato de data foi detectado, e uma prévia da tabela. **Use sempre antes de gerar o relatório**, é a forma mais rápida de pegar um arquivo errado antes de gastar tempo gerando um laudo que vai sair errado.

---

## 9. Seção 5 — Planilha de dados (A4 deitado)

Documento com as leituras do registrador, as estatísticas de cada estudo, os gráficos, a memória de cálculo e o quadro-resumo dos critérios (valor medido × critério × fonte × situação). Usa o **mesmo número** do relatório de ensaio (seção 6).

1. Preencha o "Número do relatório" na seção 6.
2. Responsável técnico: marque "Conferi os dados do ensaio e aprovo a emissão da planilha de dados" e toque em "Gerar planilha de dados". O documento abre em outra aba e fica salvo na pasta do equipamento.
3. Técnico: toque em "Gerar planilha de dados". Ela vai para a aprovação do responsável técnico e a minuta abre em outra aba para conferência.

Quando há mais de 2.000 leituras num estudo, as tabelas mostram uma leitura a cada intervalo da norma (60 s ou 10 s) e todas as linhas com evento marcado; os cálculos usam todas as leituras.

### Resultado de cada estudo

| Situação | O que significa | O que fazer |
|---|---|---|
| **APROVADO** | O estudo atendeu ao critério: leituras na faixa (ou na tolerância declarada, com a saída registrada em Observações), ou aguentou o tempo-alvo | Pode seguir para a emissão |
| **REPROVADO** | Saiu da faixa além da tolerância, ou antes do tempo-alvo (porta, energia) ou da autonomia mínima | Não invente uma solução sozinho: avise o responsável técnico. O motivo aparece em "Não conformidades" |
| **INFORMATIVO** | O estudo não tem critério (porta ou energia sem tempo-alvo, autonomia sem mínimo): só registra os tempos | Normal; não aprova nem reprova os outros estudos |
| **Desvio do método** | O ensaio não seguiu a forma do Anexo G (duração, intervalo de leitura, quantidade de sensores, monitoramento depois do evento) | Fica registrado no documento e não muda o resultado |

O resultado do ensaio é REPROVADO se algum estudo reprovou; APROVADO se os estudos com critério foram aprovados; INFORMATIVO se nenhum estudo tem critério.

---

## 10. Seção 6 — Relatório de ensaio

Documento A4 (retrato) com a identificação do cadastro, o registrador e a calibração, a metodologia, os critérios com a fonte, os resultados de cada estudo (tabelas por sensor e gráficos), as não conformidades, os desvios do método, a conclusão técnica e a conclusão em linguagem simples.

| Campo | O que é |
|---|---|
| **Número do relatório** | Código do documento. Emitir de novo o mesmo número gera a revisão seguinte |
| **Revisão** | Começa em 0; as próximas são atribuídas sozinhas |
| **Responsável pelo aceite (cliente)** | Nome de quem, do lado do cliente, acompanha |
| **Tarefa de origem** (opcional) | Código de ordem de serviço relacionada |
| **Registros fotográficos** (até 4) | Fotos com legenda, no anexo do documento |
| **Redigir a análise com a ajuda da IA** | O texto é conferido automaticamente (números, normas, resultado); se não passar, vale o texto padrão montado só com os resultados |

### Como gerar

1. Toque em **"Gerar rascunho"**. Se aparecer "O documento não pode ser emitido", corrija cada item da lista (ela diz o que aconteceu, por quê e como corrigir) e gere de novo.
2. **Revise** a análise de cada estudo, a conclusão técnica e a conclusão em linguagem simples. Texto com resultado diferente do calculado, número que não está nos resultados ou "aprovado com ressalvas" é recusado.
3. Técnico: **"Enviar para aprovação"** (a minuta abre em outra aba). Responsável técnico: marque a confirmação e toque em **"Emitir relatório"**.
4. Depois de emitido: "Abrir o PDF", "Abrir para imprimir (HTML)", "Abrir a pasta" e **"Enviar ao cliente"**.

**Quais normas os documentos citam?** A ABNT NBR 16328:2024 (Anexo G) e a RDC nº 430/2020 da Anvisa. Para a **Câmara de Conservação (imunobiológicos)**, também o Manual de Rede de Frio do Programa Nacional de Imunizações. A caixa térmica (autonomia) cita só a RDC nº 430/2020, porque não faz parte do Anexo G.

---

## 10A. Seção 7 — Aguardando aprovação

Lista dos relatórios de ensaio e das planilhas de dados enviados. O responsável técnico toca em "Prévia" para conferir a minuta e depois em "Aprovar e emitir" ou em "Devolver" (com o motivo, ao menos 10 caracteres). O técnico vê os próprios envios e as devoluções com o motivo. Se os dados mudarem depois do envio (por exemplo, o cadastro do registrador), a emissão é barrada e o envio precisa ser refeito.

---

## 10B. Seção 8 — Relatório de qualificação do equipamento

É o documento de qualificação do equipamento (o que o cliente guarda no prontuário), feito a partir dos relatórios de ensaio já emitidos.

1. Toque em "Carregar o equipamento escolhido" (o da seção 1). Aparecem a situação da qualificação, os relatórios de qualificação já emitidos e os relatórios de ensaio do equipamento.
2. Marque as etapas: **Instalação (QI)**, **Operação (QO)** — distribuição em vazio, abertura de porta, queda de energia, autonomia — e **Desempenho (QD)** — distribuição com carga.
3. Escolha o motivo e a periodicidade da requalificação (padrão de 12 meses), marque os relatórios de ensaio que entram e responda a lista da instalação (Conforme, Não conforme com a descrição, ou Não aplicável).
4. Toque em "Gerar rascunho", revise a conclusão e toque em "Enviar para aprovação". O responsável técnico aprova na mesma lista.
5. Emitido, o documento vai para a pasta do equipamento e para o Arquivo de documentos com o vencimento: a ficha do equipamento (aba Qualificações), o QR code e as pendências de requalificação passam a mostrar a situação. Uma não conformidade (estudo reprovado ou item da instalação não conforme) reprova a qualificação.
6. "Nova revisão" carrega um relatório emitido para revisar (o motivo da revisão é obrigatório); "Corrigir" carrega um envio devolvido.

---

## 11. Sobre o número de sensores

O sistema sugere 12 sensores (3 em equipamento com menos de 60 L, 12 no equipamento conjugado). Você pode digitar outro número. Abaixo do mínimo, o documento registra "Desvio do método", sem reprovar. Se um sensor falhou, desmarque-o e escreva o motivo em "Justificativa dos sensores desconsiderados": sem o motivo, o documento não é emitido.

---

## 12. Console Operacional (o log)

É a caixa preta, no fim da tela, com fundo escuro, chamada "LOG OPERACIONAL". Toda ação que o sistema faz — carregar a configuração, ler o arquivo, calcular resultados, gerar o PDF — aparece ali como uma linha de texto, com hora.

| Cor da linha | O que significa |
|---|---|
| Verde | Sucesso — a ação deu certo |
| Amarelo | Aviso — algo que você deve prestar atenção, mas não é um erro |
| Vermelho | Erro — algo falhou e precisa da sua ação |

**Quando algo dá errado e você não sabe por quê, olhe sempre o Console Operacional primeiro** — a mensagem de erro exata, e muitas vezes o motivo específico (ex.: "sensor 3 ficou 2,1 °C acima da faixa às 14:32:00"), está sempre registrada ali.

---

## 13. Passo a passo — do ensaio ao relatório de qualificação

1. **Seção 1:** busque o cliente, escolha a unidade e o equipamento; preencha o técnico executor.
2. **Seção 2:** escolha o perfil, informe o volume e confira a faixa e a tolerância.
3. **Seção 3:** marque os estudos feitos com os horários; informe o tempo-alvo (porta, energia) ou a autonomia mínima (caixa térmica); responda "Grandezas e estudos não realizados"; confira os sensores.
4. **Seção 4:** informe a identificação do registrador, envie o arquivo e toque em "Pré-visualizar dados".
5. **Seção 6:** número do relatório, fotos, "Gerar rascunho"; corrija o que a lista pedir; revise os textos; envie para aprovação (técnico) ou emita (responsável técnico).
6. **Seção 5:** gere a planilha de dados com o mesmo número.
7. **Seção 7:** o responsável técnico aprova ou devolve.
8. **Seção 8:** com os relatórios de ensaio emitidos, gere o relatório de qualificação do equipamento e envie para aprovação.
9. Use "Enviar ao cliente" para mandar os PDFs.

---

## 14. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| "Pré-visualizar dados" mostra um número de sensores diferente do que você esperava | O arquivo importado tem mais ou menos colunas de temperatura do que você imaginava | Confira o arquivo original antes de prosseguir — não gere o laudo até bater o número certo |
| Um estudo aparece como "Reprovado" mas você achava que devia estar "Aprovado" | Alguma leitura de temperatura saiu da faixa/tolerância configurada, ou o equipamento rompeu antes do tempo-alvo (Abertura de Porta/Queda de Energia) | Olhe o Console Operacional — o motivo exato da reprovação sempre aparece ali |
| Os campos de Faixa mínima/máxima estão cinza e não deixam digitar | O perfil escolhido (Câmara de Vacina, Refrigerador Comum ou Caixa Térmica) tem faixa regulatória fixa, travada de propósito | Comportamento esperado — se realmente precisar de outra faixa, confirme se o perfil escolhido é o certo |
| Bloco de estudo (ex.: Abertura de Porta) não aparece na tela | O perfil escolhido não usa esse estudo, segundo a norma (ex.: Caixa Térmica só tem Autonomia) | Confira a tabela da seção 6 deste manual — não é erro, é intencional |
| Preenchi menos sensores que o sugerido e o sistema deixou gerar mesmo assim | Comportamento esperado — o número de sensores não bloqueia; vira "Desvio do método" no documento (ver seção 11) | Confira se o número usado está de acordo com o protocolo antes de entregar |
| "Escolha o cliente, a unidade e o equipamento" | O documento só sai com o equipamento do cadastro | Escolha no quadro da seção 1 |
| "O registrador ... não está no cadastro de padrões" ou "estava vencido" | Identificação digitada diferente do cadastro, ou certificado vencido na data do ensaio | Corrija a identificação ou o cadastro de padrões; vencido exige repetir o ensaio |
| "No início do evento havia sensor fora da faixa" | O estudo de porta ou energia começou antes de o equipamento voltar à faixa | Marque o início depois que todos os sensores voltaram à faixa, ou repita o estudo |
| "Os dados mudaram desde o rascunho" | Algo mudou na tela ou no cadastro depois do rascunho | Toque em "Gerar rascunho" de novo |

---

## 15. Glossário

| Termo | Explicação simples |
|---|---|
| **Anexo G** | O capítulo da norma ABNT NBR 16328 que traz as regras específicas para refrigeradores, freezers, câmaras frias e ultrafreezers |
| **Datalogger** | Aparelho gravador de temperatura, que fica registrando leituras ao longo do tempo e depois gera um arquivo com esses dados |
| **Faixa operacional** | O intervalo de temperatura (mínima até máxima) considerado aceitável para aquele equipamento funcionar corretamente |
| **Tolerância** | Uma margem extra em torno da faixa — uma leitura que passou um pouco do limite, mas dentro dessa margem, não é tratada como uma falha grave |
| **Rampa de estabilização** | O período inicial em que um equipamento recém-ligado ainda está esfriando até chegar na temperatura de trabalho — leituras desse período não contam para aprovação |
| **Equipamento conjugado** | Um único aparelho físico com duas partes distintas (ex.: geladeira com freezer embutido) — influencia a sugestão automática de número de sensores |
| **Autonomia** | O tempo que um equipamento sem energia (como uma caixa térmica) consegue manter a temperatura dentro da faixa aceitável, contando só com isolamento/carga fria |
| **Câmara de Conservação** | Nome técnico do refrigerador usado especificamente para guardar vacinas/imunobiológicos, com faixa regulatória fixa de 2 °C a 8 °C |
| **RDC nº 430/2020** | Norma da Anvisa sobre Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos — é o motivo regulatório pelo qual a qualificação térmica de cadeia de frio é exigida |
| **Desvio do método** | O ensaio não seguiu a forma do Anexo G (duração, intervalo de leitura, quantidade de sensores, monitoramento depois do evento). Fica registrado e não muda o resultado |
| **MKT (temperatura cinética média)** | Temperatura constante que teria o mesmo efeito acumulado sobre um produto que as temperaturas registradas. Informativa |
| **Responsável técnico** | Perfil que confere e aprova a emissão dos documentos (Administrador, Diretoria, Gestor, Metrologia) |
| **PNI** | Programa Nacional de Imunizações (Ministério da Saúde) — dono do "Manual de Rede de Frio", referência específica para conservação de vacinas |

---

*Este manual descreve o módulo Cadeia de Frio tal como implementado em 21/10/2026. Se a tela mudar no futuro (novos campos, novos perfis), este documento precisa ser atualizado junto — ele não se atualiza sozinho.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).
