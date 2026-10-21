# Bloqueio e liberação da partida dos veículos: estudo (21/10/2026)

Estudo por simulação. Os cenários são inventados e não há nenhum dado real. Nada foi alterado no SGO+, no COMMAND ou no servidor.
Documento para a diretoria (A4 e PDF): `C:\Users\venda\Documents\METROLABS_BLOQUEIO_PARTIDA_20261021\`.
Simulador (Node): `C:\Users\venda\Documents\METROLABS_BLOQUEIO_PARTIDA_20261021\simulador\` (`node rodar.js 300 3600`).

## Resposta curta

Aplicada ao pé da letra ("devolveu, bloqueia na hora"), a regra proposta levou a corte do motor com o carro em trânsito em 912 de 12.000 situações. O caso típico é o dos dois colegas em viagem: um devolve e o outro sai dirigindo, com o bloqueio parado na fila do rastreador. A troca de condutor precisa ser uma **passagem do carro**, sem devolução e sem comando ao carro. Com ela e mais seis cuidados, o corte em trânsito caiu para zero e ninguém tirou o carro de outro nas 8.400 situações planejadas.

## Regra recomendada

1. A retirada libera. Com a retirada aberta, o carro fica liberado, mesmo em viagem de dias. Nenhuma rotina bloqueia um carro com retirada aberta.
2. A devolução encerra a responsabilidade e pede o bloqueio. O bloqueio só é enviado com o rastreador conectado no minuto (posição de até 2 min), o carro parado e desligado. Sem isso, fica aguardando no SGO+. Uma nova retirada cancela o pedido.
3. Só se devolve com o carro desligado (o aplicativo pede para desligar).
4. Troca de condutor é "Passar o carro": sem devolução e sem comando. O segundo condutor é indicado na retirada; se não foi, a gestão autoriza.
5. Sem internet: retirada (se o celular viu o carro livre), devolução e passagem ficam guardadas com a hora.
6. Só a gestão encerra a retirada de outro, com justificativa, e só com o carro parado na base há 1 h, ou parado há 2 h em outro lugar com o condutor confirmando. No caso de retirada esquecida, a gestão passa a retirada direto para quem precisa do carro, sem bloquear.
7. Conferência a cada 2 min: carro devolvido e liberado recebe o bloqueio de novo; carro com retirada aberta e bloqueado recebe a liberação de novo.
8. Emergência 24 h pela central da iTracker (liberar para quem tem direito; bloqueio de roubo).
9. Rastreador ajustado para cortar só com a ignição desligada (confirmar com a iTracker).
10. Futuro: leitor de cartão (RFID) no carro.

Não esperar alguns minutos depois de desligado para bloquear. Num teste com 5 min de espera, o uso indevido aumentou (bateria desligada ou servidor fora nesse intervalo) e os cortes com sinal oscilando também.

## Simulação

Modelo minuto a minuto: responsável no SGO+ e o que as pessoas fizeram de fato; corte da bomba; fila de comandos da iTracker (202 = executa ao reconectar); bloqueio efetivado abaixo de 20 km/h; sinal do carro e internet do celular por local; quedas do servidor e da plataforma; gestão disponível só no expediente; pessoas (condutor, segundo condutor, colega, mecânico, pessoa sem permissão, ladrão).
Foram 12.000 situações (28 tipos de problema × 300 variações + 3.600 sorteadas ao acaso), até 6 dias cada, rodadas em 8 versões de regra: 96.000 execuções.

Situações (de 12.000) com a regra de segurança quebrada ao menos uma vez:

| Versão | S1 bloqueou quem tinha direito | S2 corte em trânsito | S3 tirou o carro de alguém | S4 devolvido e liberado | S5 uso indevido evitável | S6 preso fora da base | S7 registro errado | R1 devolução não chegou | R2 uso sem sinal | R3 comando antigo |
|---|---|---|---|---|---|---|---|---|---|---|
| V0 ao pé da letra | 912 | 912 | 934 | 7 | 1 | 1.523 | 1.732 | 1.935 | 2.134 | 896 |
| V1 SGO+ hoje | 38 | 7 | 931 | 7 | 1 | 1.247 | 2.130 | 1.927 | 2.135 | 164 |
| V2 conectado no minuto + conferência + devolução só desligado + gestão com limite | 24 | 5 | 123 | 0 | 0 | 1.216 | 2.055 | 2.116 | 2.164 | 305 |
| V3 + passar o carro | 18 | 4 | 118 | 0 | 0 | 1.200 | 1.864 | 1.994 | 2.184 | 293 |
| V4 + sem internet | 31 | 5 | 252 | 0 | 0 | 1.214 | 1.367 | 1.582 | 2.143 | 391 |
| V5 + emergência 24 h | 31 | 5 | 244 | 0 | 1 | 1.042 | 1.365 | 1.618 | 2.149 | 393 |
| **V6 + corta só desligado (recomendada)** | 25 | **0** | 244 | 0 | 1 | 1.042 | 1.365 | 1.618 | 2.149 | 393 |
| V7 + cartão (futuro) | 0 | 0 | 292 | 0 | 0 | 255 | 1.654 | 1.389 | 577 | 0 |

Nas 8.400 situações planejadas, a V6 teve S1 = 0, S2 = 0 e S3 = 0. O S3 que sobra vem das situações sorteadas: retiradas guardadas em dois celulares sem internet, para o mesmo carro, que viram conflito para a gestão sem bloquear ninguém. Registro perdido (S8) deu zero em todas as versões.
Roubo (470 situações com o carro levado): até a V4, o bloqueio parou o carro em 69; com a central 24 h (V5 e V6), em 169. Na V6, o carro só para quando o ladrão desliga. Com o cartão, o ladrão com a chave não liga o carro; só sobra o corte do fio do rastreador.

## Casos mais perigosos e como a regra resolve

| Caso | Pela regra ao pé da letra | Pela regra recomendada |
|---|---|---|
| Um devolve pelo celular enquanto o colega dirige | 233 cortes em trânsito em 300 | O aplicativo recusa (carro andando); sem sinal, o bloqueio só sai desligado |
| Devolução com o carro ligado | 264 cortes em 300 | O aplicativo pede para desligar; 0 |
| Gestão encerra a retirada de quem está usando | 156 em 300 | Proibido fora da base ou com o carro ligado; 0 |
| Dois em viagem, troca no hotel sem sinal | Segundo preso ou corte ao reconectar | Passar o carro, guardado no celular; 0 cortes, 0 presos |
| Sinal oscilando: bloqueio na fila e outra retirada | 42 cortes em 300 | 4 sem o ajuste do rastreador; 0 com o ajuste |

## Riscos que sobram

- R1, devolução que não chegou (esquecimento, celular sem internet): lembrete, aviso à gestão (carro parado na base há 1 h com retirada aberta), internet sem fio na base.
- R2, uso sem sinal antes do bloqueio: chave em local controlado, aviso de uso sem registro, cartão (2.149 para 577).
- S6, preso onde o sinal acabou ou com a plataforma fora: não devolver em garagem subterrânea nem em região sem sinal, passar o carro, central 24 h, cartão (1.042 para 255).
- Corte do fio do rastreador: aviso de rastreador sem comunicação, seguro.

## Perguntas ao dono

1. Aprova "Passar o carro" na troca de condutor? Quem pode receber o carro?
2. A devolução fora da base bloqueia, ou só avisa?
3. A central 24 h da iTracker pode liberar e bloquear em caso de roubo (com nome, placa e código)?
4. Aceita que o carro roubado só pare quando o ladrão desligar, se o rastreador for ajustado?
5. Prazo para a gestão encerrar uma retirada esquecida (sugestão: 1 h com o carro parado na base)?
6. Orçamento do leitor de cartão?
7. Chaves em local controlado?
8. Todos os carros no bloqueio, ou só alguns no começo?

## Perguntas à iTracker

O J16 pode cortar só com a ignição desligada, e pode ter um comando de roubo separado? Comando na fila pode ser cancelado, ou expira? A fila mantém a ordem, e um "liberar" logo depois de um "bloquear" chega a cortar o motor por um instante? Sem energia, o rastreador deixa a bomba ligada ou cortada, e avisa o corte do fio? Qual o telefone da central 24 h e como ela identifica quem liga? O J16 aceita leitor de cartão?
