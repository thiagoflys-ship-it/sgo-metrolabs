# Manual do Operador — Módulo Cadeia de Frio

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


### Qualificação térmica de Refrigerador, Câmara de Conservação, Câmara Fria, Freezer, Ultrafreezer e Caixa Térmica — ABNT NBR 16328:2023/2024, Anexo G

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
| **Perfil do equipamento** | O tipo de equipamento (ver seção 2 deste manual) | Define toda a lógica da tela: faixa sugerida, se a faixa é editável, quais estudos aparecem | Escolha o tipo certo **antes** de preencher qualquer outra coisa — trocar depois reseta os estudos habilitados |
| **TAG / Identificação** | Código interno do equipamento no cliente (etiqueta, patrimônio) | Identifica qual equipamento específico foi testado, entre vários do mesmo cliente | Copie do equipamento físico ou peça ao cliente |
| **Marca** | Fabricante do equipamento | Informação de identificação no laudo | Digite o nome do fabricante |
| **Modelo** | Modelo do equipamento | Informação de identificação no laudo | Digite o modelo |
| **Número de série** | Número de série de fábrica | Informação de identificação no laudo | Digite o número de série |
| **Localização** | Onde o equipamento fica fisicamente (sala, setor) | Ajuda a rastrear o equipamento no cliente | Digite o local |
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

## 9. Seção 5 — Gerar Relatório

| Elemento | O que é | O que fazer |
|---|---|---|
| **Gerar Relatório** (botão) | Processa tudo que você preencheu e produz o laudo final | Clique só depois de conferir tudo (recomendado: rodar "Pré-visualizar dados" antes) |
| **Limpar Log** (botão) | Apaga o histórico do Console Operacional (seção 12) | Use se a tela de log estiver muito cheia e você quiser começar do zero visualmente — não afeta os dados já preenchidos |

### O que aparece depois de clicar em "Gerar Relatório"

O sistema mostra um "selo" colorido com o status geral do laudo, e um selo separado para cada estudo incluído. Veja o que cada status significa:

| Status | O que significa | O que fazer |
|---|---|---|
| **APROVADO** | O equipamento passou em tudo, dentro da faixa e da tolerância, o tempo todo | Pode entregar o laudo normalmente |
| **APROVADO (COM OBSERVAÇÃO)** | Passou; alguma leitura saiu da faixa, mas ficou dentro da tolerância declarada | Pode entregar; a saída aparece em Observações do certificado e da planilha |
| **REPROVADO** | O equipamento saiu da faixa aceitável em algum momento, além da tolerância (na Distribuição), ou rompeu antes do tempo-alvo definido (na Abertura de Porta/Queda de Energia) | **Não invente uma solução sozinho** — reporte ao responsável técnico/cliente. O motivo exato da reprovação aparece no Console Operacional (seção 12) |
| **INFORMATIVO** ou **CARACTERIZAÇÃO** | O estudo não teve critério de aprovação/reprovação definido (Abertura de Porta/Queda de Energia sem "Tempo-alvo mínimo" preenchido, ou o estudo de Autonomia, que nunca tem veredito) — o sistema só está documentando o que aconteceu, sem julgar se é bom ou ruim | Normal — nada a fazer, é assim que o estudo foi configurado |

Depois do selo de status, aparecem dois botões:

- **Abrir planilha** — abre o relatório completo (com tabelas e gráfico) direto no navegador.

> Atualização de 18/10/2026: não existe "aprovado com alerta". A excursão dentro da tolerância declarada aprova o estudo e vai para Observações (no certificado sai "Aprovado"; na planilha e no selo da tela, "APROVADO (COM OBSERVAÇÃO)", em verde). O PDF da planilha (relatório de dados) também fica salvo na pasta do cliente (subpasta do CNPJ), com o nome "Relatório de dados ... - <TAG> - <aaaa-MM-dd HHmm>.pdf"; a frase logo abaixo dos botões confirma o arquivo ou diz por que não salvou.
- **Baixar PDF** — baixa o mesmo relatório já convertido em PDF, pronto para enviar ao cliente.

**Se o laudo tiver mais de um estudo marcado (ex.: Distribuição + Abertura de Porta + Queda de Energia), o status geral no topo é o pior status entre todos os estudos** — ou seja, se um estudo reprovar, o laudo inteiro aparece como Reprovado no selo geral, mesmo que os outros estudos tenham aprovado.

---

## 10. Seção 6 — Certificado de Qualificação Térmica (Beta)

Este é um **segundo documento**, opcional, diferente da planilha da seção 5. Ele não substitui a planilha — é complementar. É um PDF em formato de página A4, com texto corrido explicando o ensaio (não uma tabela de dados). Os textos (Introdução, Objetivo, Análise por estudo, Conclusão) são **escritos por Inteligência Artificial**, a partir dos números que o sistema já calculou.

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

**Quais normas o certificado/relatório citam?** Sempre a ABNT NBR 16328 (Anexo G) e a RDC nº 430/2020 da Anvisa (Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos). Para o perfil **Câmara de Conservação (Vacinas)** especificamente, o sistema também cita o Manual de Rede de Frio do Programa Nacional de Imunizações (PNI/Ministério da Saúde) — a referência técnica específica para conservação de imunobiológicos.

---

## 11. Sobre o número de sensores — por que este módulo não tem "Modo Personalizado"

Se você já usa outro módulo Metrolabs (como Estufa+Banho-maria), talvez espere encontrar aqui um "Modo Personalizado" protegido por senha, que libera usar menos sensores que o mínimo. **Este módulo não tem esse recurso — e a razão é simples: aqui não existe nenhuma trava para liberar.** Como já explicado na seção 7, o número de sensores é só uma sugestão automática que você pode sobrescrever livremente, a qualquer momento, sem senha nenhuma. A responsabilidade de conferir se o número usado está de acordo com o protocolo do cliente é sempre sua.

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

## 13. Passo a passo — gerando um laudo do zero

Um roteiro prático, resumindo tudo o que este manual explica, para você seguir na primeira vez.

1. Abra o sistema. Espere o selo "SISTEMA ONLINE" aparecer no topo.
2. **Seção 1 (Cliente):** digite o CNPJ, clique em "Buscar CNPJ", confira nome/endereço, preencha o responsável técnico.
3. **Seção 2 (Equipamento):** escolha o perfil correto (um dos nove da tabela da seção 2 deste manual). Preencha TAG, marca, modelo, número de série, localização, volume e se é conjugado. Confira a faixa de temperatura sugerida e ajuste se o perfil permitir e o protocolo do cliente pedir outro valor.
4. **Seção 3 (Estudos):** marque os estudos que você realmente fez (o sistema já mostra só as opções válidas para o perfil escolhido). Preencha os horários de início/fim de cada um. Confira o número de sensores sugerido e ajuste se necessário.
5. **Seção 4 (Importação):** escolha o modo de entrada certo e informe o arquivo/dados. Clique em "Pré-visualizar dados" e confira se o número de linhas e sensores detectados bate com o que você espera.
6. **Seção 5:** clique em "Gerar Relatório". Confira o selo de status geral e o de cada estudo. Se algo reprovou, olhe o Console Operacional para entender o motivo exato.
7. Clique em "Abrir planilha" para conferir visualmente o relatório completo (tabela, gráfico), ou "Baixar PDF" para já baixar o documento final.
8. **(Opcional) Seção 6:** se o cliente pediu também o Certificado, preencha os campos daquela seção, clique em "Gerar Rascunho com IA", **leia com atenção** os textos gerados, corrija o que precisar, e clique em "Confirmar e Gerar Certificado".

---

## 14. Erros comuns e o que fazer

| O que aconteceu | Motivo mais provável | O que fazer |
|---|---|---|
| "Pré-visualizar dados" mostra um número de sensores diferente do que você esperava | O arquivo importado tem mais ou menos colunas de temperatura do que você imaginava | Confira o arquivo original antes de prosseguir — não gere o laudo até bater o número certo |
| Um estudo aparece como "Reprovado" mas você achava que devia estar "Aprovado" | Alguma leitura de temperatura saiu da faixa/tolerância configurada, ou o equipamento rompeu antes do tempo-alvo (Abertura de Porta/Queda de Energia) | Olhe o Console Operacional — o motivo exato da reprovação sempre aparece ali |
| Os campos de Faixa mínima/máxima estão cinza e não deixam digitar | O perfil escolhido (Câmara de Vacina, Refrigerador Comum ou Caixa Térmica) tem faixa regulatória fixa, travada de propósito | Comportamento esperado — se realmente precisar de outra faixa, confirme se o perfil escolhido é o certo |
| Bloco de estudo (ex.: Abertura de Porta) não aparece na tela | O perfil escolhido não usa esse estudo, segundo a norma (ex.: Caixa Térmica só tem Autonomia) | Confira a tabela da seção 6 deste manual — não é erro, é intencional |
| Preenchi menos sensores que o sugerido e o sistema deixou gerar mesmo assim | Comportamento esperado — este módulo não bloqueia por número de sensores (ver seção 11) | Confira se o número usado está de acordo com o protocolo antes de entregar o laudo |

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
| **PNI** | Programa Nacional de Imunizações (Ministério da Saúde) — dono do "Manual de Rede de Frio", referência específica para conservação de vacinas |

---

*Este manual descreve o módulo Cadeia de Frio tal como implementado em 2026-07-22. Se a tela mudar no futuro (novos campos, novos perfis), este documento precisa ser atualizado junto — ele não se atualiza sozinho.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).
