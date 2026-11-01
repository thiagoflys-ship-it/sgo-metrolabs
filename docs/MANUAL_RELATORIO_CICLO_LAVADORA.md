# Manual: relatório do ciclo da lavadora

Vale para o SGO+ a partir de 31/10/2026. Tela "Relatórios de ciclo" (menu Cadastros) e cartão "Relatório do ciclo" da página aberta pelo QR code da lavadora. Serve para a equipe da Metrolabs e para o cliente com o login dele, no computador e no celular.

## 1. Para que serve

A lavadora grava, a cada ciclo, um arquivo com o nome do lote e final .sgolav (por exemplo, LOT-20261030-6222.sgolav). O SGO+ lê esse arquivo e gera um relatório A4 de uma única folha, que fica salvo no histórico da lavadora. A folha traz:

- a fita impressa pela lavadora, reproduzida a partir do arquivo;
- o gráfico da temperatura ao longo do ciclo;
- os indicadores do ciclo;
- a conclusão do ciclo;
- o campo de aprovação com a assinatura do responsável pelo local, feita na tela, com nome, cargo, data e hora.

Ciclo cancelado ou reprovado também gera relatório, com a falha em destaque. Ciclo com o resultado NÃO LIBERADO (processo concluído, liberação da carga bloqueada pela temperatura no fim do arrefecimento) também gera relatório, em âmbar. Os resultados estão explicados no item 7A.

## 1A. A tela de entrada: painel, busca e Kanban

Ao abrir "Relatórios de ciclo", a tela não mostra a lista de lavadoras. Mostra:

- **Os índices**: lavadoras cadastradas (o cliente vê as da empresa dele), relatórios no mês, aguardando assinatura (com a data do mais antigo), assinados, ciclos aprovados, cancelados ou reprovados (com a contagem dos não liberados, quando houver), ciclos em que a lavadora avisou manutenção preventiva vencida e novas versões.
- **A busca**: um campo só. Escreva o nome do cliente, o CNPJ (com ou sem pontos), o número de série, a TAG, o patrimônio, o modelo ou o lote e toque em "Buscar". Pode escrever sem acento e só uma parte (por exemplo, "alfa", "11222333" ou "6222"). "Mais filtros" abre o período do ciclo, o resultado e a assinatura. "Ver todas as lavadoras" mostra a lista completa, só quando você pedir.
- **O Kanban dos relatórios**, por situação: "Aguardando assinatura", "Nova versão aguardando assinatura", "Com falha (cancelado ou reprovado)" e "Assinado e aprovado". Quando há ciclo com o resultado NÃO LIBERADO, aparece também a coluna "Não liberado (câmara quente no fim)"; o relatório fica nela mesmo depois de assinado. Cada coluna mostra os 6 mais recentes; "Ver todos" traz os outros. Toque num cartão para abrir, baixar, assinar ou ver as versões.

No celular, o Kanban mostra uma situação por vez: toque num dos quadros de cima (cada um com a contagem) para trocar.

Depois da busca aparecem as lavadoras e os relatórios encontrados. "Voltar ao painel" volta aos índices e ao Kanban. O voltar do celular (ou o "← Voltar" do alto, ou o voltar do navegador) volta um passo: da lista de uma lavadora para a busca que você tinha feito, e da busca para o painel.

## 2. Antes de começar

- A lavadora precisa estar cadastrada no SGO+ e ligada ao cliente. Os dados do cliente (razão social, CNPJ, unidade e setor) e da lavadora (descrição, fabricante, modelo, número de série, patrimônio ou TAG) saem do cadastro, nunca do arquivo.
- Copie o arquivo do ciclo da lavadora pelo Wi-Fi da máquina ou pelo cartão. Use o arquivo com final .sgolav. Os arquivos .csv e .txt do mesmo lote não servem.
- Não abra nem edite o arquivo antes de importar. Arquivo alterado é recusado.

## 3. Gerar o relatório pelo QR code da lavadora

1. Leia o QR code da etiqueta da lavadora com a câmera do celular.
2. Entre com o seu e-mail e a sua senha, se o sistema pedir.
3. No cartão "Relatório do ciclo", toque em "Gerar relatório do ciclo".
4. Toque em "Escolher o arquivo do ciclo" e escolha o arquivo .sgolav.
5. Confira o lote, a data, o horário, a receita e o resultado. O arquivo não traz o número de série da máquina: a ligação com a lavadora vem do QR code.
6. Se estiver certo, toque em "Confirmar e gerar o relatório". Se não for o ciclo desta lavadora, toque em "Escolher outro arquivo".
7. Pronto: o relatório fica salvo. Toque em "Assinar agora", "Abrir o relatório" ou "Baixar PDF".

## 4. Gerar o relatório pela tela

1. No menu, toque em "Relatórios de ciclo" (no celular, no Início).
2. Na busca, escreva a TAG, o número de série, o patrimônio ou o nome do cliente da lavadora e toque em "Buscar". Aparecem só as lavadoras a que você tem acesso; o cliente vê só as da empresa dele.
3. Na lavadora certa, toque em "Gerar relatório do ciclo".
4. Siga os passos 4 a 7 do item 3.
5. "Voltar" leva de volta à busca que você tinha feito, com os números do painel atualizados.

## 5. Assinar na tela

1. Logo depois de gerar, toque em "Assinar agora". Para assinar depois, toque no cartão do relatório na coluna "Aguardando assinatura" do Kanban e em "Assinar".
2. Toque em "Abrir o relatório para conferir" e leia a folha.
3. Assine no quadro com o dedo (celular) ou com o mouse (computador). No celular, a assinatura ocupa a tela inteira e a página não rola enquanto você assina; pode girar o celular, que a assinatura continua no lugar. Se errar, toque em "Desfazer" (tira o último traço) ou em "Limpar".
4. Escreva o nome e o cargo de quem assina (o responsável pelo local, por exemplo a enfermeira da CME).
5. Marque "Conferi os dados do relatório".
6. Toque em "Assinar".

O documento assinado traz a imagem da assinatura, o nome, o cargo, a data e a hora, o usuário que estava no sistema e o resumo SHA-256 do documento conferido. Depois de assinado, o documento fica travado: uma correção só pela Metrolabs, em nova versão, e a versão anterior continua guardada.

## 6. Encontrar, abrir e baixar

1. Na busca, escreva o lote (ou só os últimos números), o nome do cliente, o CNPJ, a série ou a TAG e toque em "Buscar".
2. Para um período, toque em "Mais filtros" e escolha "Ciclo de" e "até".
3. Em "Mais filtros", use "Resultado" para ver só os aprovados, só os não liberados ou só os cancelados e reprovados, e "Assinatura" para ver os que faltam assinar.
4. Toque em "Abrir o relatório" para ver a folha A4, ou em "Baixar PDF".
5. "Versões e histórico" mostra quem gerou, quem assinou e as versões anteriores.

**A folha no celular.** No celular, "Abrir o relatório" mostra a folha dentro do SGO+, no visualizador de documentos: no alto ficam "Voltar" (volta para a ficha ou a lista de onde você veio; o botão voltar do celular faz o mesmo), "Imprimir" e "Baixar PDF". No computador, a folha continua abrindo em aba nova. A folha abre do tamanho da tela, inteira, com a mesma disposição do PDF. Para ler de perto, afaste dois dedos na tela ou toque em "Ver em tamanho real" (a folha fica no tamanho do papel e rola para o lado); "Ajustar a folha à tela" volta. Nada sai da folha: nome, endereço e outros textos longos quebram de linha dentro da caixa. A impressão e o PDF continuam em uma folha A4.

## 7. O que cada parte da folha mostra

| Parte | O que é |
|---|---|
| Identificação | Cliente, CNPJ, unidade, setor, lavadora, fabricante, modelo, série, patrimônio ou TAG (do cadastro); lote, receita, início, término e operador (do arquivo). Campo que falta no cadastro sai com um traço. |
| Resultado | O resultado que a lavadora registrou. Aprovado sai em verde; não liberado, em âmbar, com o motivo do bloqueio; cancelado ou reprovado, em vermelho, com a falha. |
| Fita impressa pela lavadora | Reprodução do comprovante impresso, montada a partir do arquivo, na mesma ordem. O título é "TÉRMINO DE CICLO", "CICLO NÃO LIBERADO" ou "CICLO CANCELADO". Como no papel, só os 8 últimos eventos. |
| Indicadores | Resultado, temperatura máxima e duração da desinfecção térmica, tempo total, temperatura no término, falha, manutenção preventiva, fases e pausas. |
| Gráfico | A temperatura máxima registrada em cada fase, sobre a duração da fase. O arquivo não traz a leitura contínua do sensor. |
| Conclusão | Texto do ciclo. A folha diz se a redação foi assistida por inteligência artificial e conferida com os números do arquivo, ou escrita por regra fixa do sistema. |
| Aprovação | Assinatura, nome, cargo, data e hora, usuário e resumo do documento conferido. |

O relatório não usa critério de norma nem valor A0, porque o arquivo não traz a curva contínua do sensor. Quando a receita tem valor de referência cadastrado pela Metrolabs, a folha compara a temperatura máxima e a duração da desinfecção com ele e escreve "a confirmar pelo responsável técnico" até a confirmação.

## 7A. Resultados e códigos de falha

A lavadora registra um destes resultados:

| Resultado | Significado |
|---|---|
| APROVADO | O ciclo terminou com sucesso, arrefecimento incluído. |
| NÃO LIBERADO | O processo foi concluído: as etapas de limpeza, enxágue e desinfecção foram cumpridas e registradas e a cuba foi drenada. A liberação da carga ficou bloqueada porque o arrefecimento de fim de ciclo esgotou o tempo com a câmara acima da temperatura-alvo (código 17). A tampa só destrava com leitura válida abaixo de 45 °C. Não é ciclo aprovado nem ciclo cancelado. A decisão sobre a carga segue o procedimento da unidade, com a avaliação do responsável pelo local. |
| CANCELADO | O ciclo foi interrompido antes do fim. A carga não deve ser liberada com base nele. |

Nos arquivos das revisões atuais do firmware, a lavadora grava também se o processo foi concluído ou interrompido; o relatório usa essa informação na conclusão.

O relatório mostra o texto da falha exatamente como a lavadora gravou no arquivo. O número de cada código não muda entre revisões do firmware; o texto pode mudar. Arquivos antigos trazem o texto antigo.

| Código | Texto nas revisões atuais | Texto nos arquivos antigos |
|---|---|---|
| 1 | TEMPO DE ENCHIMENTO ESGOTADO: NÍVEL NÃO ATINGIDO | TIMEOUT ENCHIMENTO: FALTA DE ÁGUA |
| 2 | SUBTEMPERATURA: ALVO NÃO ATINGIDO OU NÃO MANTIDO (aquecimento ou patamar de desinfecção) | SUBTEMPERATURA: ALVO NÃO ATINGIDO |
| 3 | TEMPO DE DRENAGEM ESGOTADO: CUBA NÃO ESVAZIOU | TIMEOUT DRENAGEM: OBSTRUÇÃO |
| 4 | BOTÃO DE EMERGÊNCIA ACIONADO | EMERGÊNCIA ACIONADA PELO USUÁRIO |
| 5 | SOBRETEMPERATURA CRÍTICA DA CÂMARA | (igual) |
| 6 | FALTA DE ÁGUA NA REDE DE ABASTECIMENTO | FALHA NA REDE DE ÁGUA HOSPITALAR |
| 7 | TAMPA ABERTA COM A MÁQUINA EM OPERAÇÃO | TAMPA ABERTA INDEVIDAMENTE |
| 8 | FALHA NO SENSOR DE TEMPERATURA (PT100) | FALHA DE LEITURA DO SENSOR DE TEMPERATURA (PT100) |
| 9 | CICLO ABORTADO PELO OPERADOR | ABORTADO MANUALMENTE PELO OPERADOR |
| 10 | SEM DECISÃO DO OPERADOR NO TEMPO LIMITE | TIMEOUT NA ROTINA DE CANCELAMENTO |
| 11 | GALÃO DE PRODUTO (DETERGENTE) VAZIO | (igual) |
| 12 | FALTA DE FASE NA REDE ELÉTRICA | (igual) |
| 13 | FALHA NO MÓDULO DE SAÍDAS (I2C) | FALHA NO EXPANSOR DE SAÍDAS (I2C) |
| 14 | FALHA DE COMUNICAÇÃO CLP-IHM (CAN) | FALHA NO BARRAMENTO CAN |
| 15 | SENSORES DE NÍVEL INCOERENTES | INCOERÊNCIA NOS SENSORES DE NÍVEL |
| 16 | PERDA DE NÍVEL DURANTE O PROCESSO | (igual) |
| 17 | ARREFECIMENTO NÃO CONCLUÍDO: CÂMARA AINDA QUENTE | (não existia) |
| 18 | PAUSA EXCEDEU O TEMPO MÁXIMO | (não existia; a pausa esgotada saía como código 9) |

Eventos que podem aparecer na fita e nas ocorrências a partir das revisões atuais:

- "ARREFECIMENTO PROLONGADO": o arrefecimento passou do tempo normal e entrou na segunda etapa. Pode aparecer também em ciclo aprovado.
- "ARREFEC. NÃO CONCLUÍDO": o tempo total do arrefecimento acabou sem a câmara chegar ao alvo. Aparece no ciclo não liberado e também no cancelado, quando o arrefecimento de segurança não chegou ao alvo.
- "CICLO NÃO LIBERADO": evento de fim do ciclo não liberado, no lugar de "CICLO CONCLUÍDO" ou "CICLO CANCELADO".

**Arquivos antigos com o código 2 no arrefecimento.** Nas revisões anteriores do firmware, o código 2 (SUBTEMPERATURA) também era gravado quando o arrefecimento de fim de ciclo passava do tempo com a câmara quente. Quando a última fase registrada é a de arrefecimento, o relatório traz uma nota explicando isso, logo abaixo do resultado. O resultado gravado pela lavadora (CANCELADO) não é alterado: é o registro da máquina.

## 8. Cores e selos

| Selo | Significado |
|---|---|
| Verde "APROVADO" | A lavadora concluiu o ciclo sem falha registrada. |
| Âmbar "NÃO LIBERADO" | Processo concluído; a lavadora bloqueou a liberação da carga porque a câmara não esfriou até a temperatura-alvo. |
| Vermelho "CANCELADO" ou "REPROVADO" | O ciclo não chegou ao fim; a carga não deve ser liberada com base nele. |
| Laranja "Aguardando assinatura" | Gerado e ainda não assinado. |
| Verde "Assinado" | Assinado na tela; documento travado. |
| Cinza "Substituída pela versão nova" | Versão antiga guardada; vale a mais nova. |
| Faixa laranja "O cadastro desta lavadora está sem..." | Falta dado no cadastro; o relatório sai assim mesmo. |

## 9. Problemas comuns

| Mensagem | O que fazer |
|---|---|
| "Este arquivo não é o arquivo de ciclo da lavadora (.sgolav)" | Escolha o arquivo do mesmo lote com final .sgolav. |
| "O conteúdo do arquivo está corrompido, incompleto ou foi alterado" | Copie o arquivo de novo direto da lavadora e escolha sem abrir. Se repetir, avise a Metrolabs. |
| "Este lote já tem relatório para esta lavadora" | O mesmo ciclo não é importado duas vezes. Toque em "Abrir o relatório que já existe". |
| "Este arquivo é de outro equipamento" | O arquivo informa a série de outra máquina. Importe pelo QR code da máquina de onde o arquivo saiu. |
| "Acesso negado: este equipamento não pertence à sua empresa" | Confira o QR code. Se a máquina for sua, peça à Metrolabs para corrigir o cadastro. |
| "já foi assinado" | Documento travado. Peça à Metrolabs uma nova versão, com o motivo. |
| "Nada encontrado" na busca | Confira a grafia ou busque só por uma parte: uma palavra do nome do cliente, o CNPJ sem pontos, os últimos números da série ou do lote. |
| "Ver todas as lavadoras" não mostra a sua | Peça à Metrolabs para cadastrar a lavadora e ligar ao seu cliente. |
| Relatório com o resultado "NÃO LIBERADO" | Siga o procedimento da unidade para a carga, com a avaliação do responsável pelo local, e peça à Metrolabs para verificar o arrefecimento da lavadora. |
| "Nota sobre o código 2 deste arquivo" | Nada a corrigir: arquivo de revisão anterior do firmware. O resultado gravado continua o mesmo. |

## 10. Quem pode

| Perfil | O que faz |
|---|---|
| Cliente | Gera, assina e baixa os relatórios das lavadoras da própria empresa. |
| Equipe da Metrolabs | Gera, assina e baixa os relatórios de qualquer lavadora, completa o cadastro do equipamento e gera nova versão com motivo. |

## 11. No celular e o voltar (01/11/2026)

- O Kanban dos relatórios é um quadro com uma coluna por situação do relatório (aguardando assinatura, assinado e aprovado, cancelado ou reprovado...).
- Trocar entre "Kanban dos relatórios" e "Referências por receita" é um passo do voltar: voltar devolve a aba de antes.
- No celular, os botões redondos (? e bate-papo) saem para o lado enquanto você rola para baixo e voltam ao rolar para cima, no topo e no fim da tela. Se um deles estiver por cima de um botão, role um pouco para baixo.
