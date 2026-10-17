# Frota simples e rápida: retirar e devolver em poucos toques (17/10/2026)

Não publicado (sem clasp, sem servidor de produção). Testado no servidor próprio em modo ensaio, com cópia da base dev e só dados de teste (usuários gestorfs, tecfa, tecfb; veículos FST1A11 a FST6F66).

## O que a equipe reclamava e o que foi medido

O servidor responde em 10 a 100 ms; a lentidão estava no celular:

- **Fotos:** já eram reduzidas (1.280 px), mas na tela principal: cada foto de câmera (4.000 x 3.000, 4,6 MB) travava a tela cerca de 2,5 s com CPU 4x mais lenta, e o envio só começava ao tocar em "Registrar". Confirmar esperava o envio de todas as fotos.
- **Chamadas em sequência:** abrir a Frota fazia 2 chamadas; tocar em "Retirar" fazia mais 3 (apiPing, apiListarVeiculosAtivos, apiContextoOperacional); confirmar fazia 3 envios de foto + o registro + a situação da frota.
- **Tela:** formulário único com veículo em lista suspensa, condutor, KM vazio, foto do painel, finalidade, justificativa e as 29 linhas da vistoria (a vistoria tem 29 itens, não 31), sempre abertas.

## Fluxo antes x depois

| | Antes | Depois |
|---|---|---|
| Abrir a Frota | situação + avisos (2 chamadas); botão flutuante "+ Retirar veículo" | 1 chamada (`apiInicioFrota`) com tudo; guardada por 60 s no celular. Quem está com um veículo vê no topo o botão verde **"Devolver PLACA"** (também no Início do celular) |
| Retirar | toque em "+ Retirar", escolher veículo na lista suspensa, digitar o KM, rolar 29 itens, anexar fotos, "Registrar retirada" | 1) tocar no veículo (cartão grande com placa, modelo, KM e foto da última vistoria; só os disponíveis); 2) KM já preenchido com o último registrado e fotos com a câmera abrindo direto; 3) **"Tudo OK"** em um toque, ou "Tem problema" para abrir os itens por grupo; 4) "Confirmar retirada" |
| Devolver | achar a retirada na lista, formulário com KM, vistoria de 29 linhas e fotos | "Devolver PLACA", KM de chegada + foto do painel, "Tudo OK" ou "Tem problema", "Confirmar devolução". Mais fotos e observações: opcionais, recolhidas |
| Gestão | campos de data/hora, condutor e justificativa sempre à vista | a mesma tela; condutor, data/hora e justificativa em **"Opções da gestão"** (recolhido; abre sozinho quando é obrigatório: devolução no lugar do condutor, login da gestão sem condutor, erro de justificativa). Abastecimento, Ajustar KM e Partida do veículo também em "Opções da gestão" |
| Computador | formulários próprios de retirada e devolução | o mesmo fluxo, no painel "Retirar e devolver" da aba Situação e retiradas; "Registrar devolução" da lista abre a devolução nele |
| Toques mínimos (1 foto) | cerca de 8 toques, mais rolar a vistoria | retirada: 4 (veículo, foto, Tudo OK, Confirmar); devolução: 5 (Devolver, KM, foto do painel, Tudo OK, Confirmar) |

Operador nunca no limbo: a linha acima do botão diz o que falta ("Falta: a foto do painel, ..."); cada foto mostra "Preparando…", "Enviando…", "Enviada", "Sem sinal: nova tentativa em instantes" ou "Não enviada: toque para tentar de novo"; tocar no veículo de outra pessoa mostra com quem está e o que fazer; login sem condutor vinculado diz o que pedir à gestão; se a conexão cai na resposta do registro, a tela confere no servidor antes de pedir para registrar de novo ("Registro conferido... não registre de novo"). Sair da tela sem confirmar guarda o rascunho ("Continuar a retirada do PLACA").

## Velocidade: o que mudou

- **Fotos:** reduzidas fora da tela principal (Worker com `createImageBitmap` + `OffscreenCanvas`; sem suporte, mesma redução na tela), lado maior até 1.600 px, JPEG 0,7, alvo de no máximo 400 KB (baixa a qualidade até 0,45 e, se preciso, 1.280 px). Uma redução por vez (memória do celular) e o envio de cada foto começa assim que ela fica pronta, em paralelo, pela `apiUploadFotoVeiculo` que já existia. Nova tentativa automática em 2, 5 e 10 s; depois, toque na foto. A prévia usa o arquivo reduzido em memória (não um texto base64 dentro da página).
- **Abrir:** `Frota_apiInicioFrota` (só leitura): veículos com situação e miniatura, retiradas em aberto (as minhas marcadas), condutor do login, condutores (gestão), grupos da vistoria, tipos de combustível e avisos de manutenção. Atualização a cada 30 s em segundo plano, que só redesenha se algo mudou.
- **Confirmar:** botão vira "Registrando…" e fica desligado (sem duplo toque), espera só as fotos que faltam e grava. A tela inicial é atualizada na hora com o resultado; a conferência com o servidor vem 1,5 s depois, em segundo plano. Não recarrega o módulo.
- **Tela leve:** os 29 itens da vistoria só são montados ao tocar em "Tem problema"; cada foto atualiza só o próprio quadro. O código do celular continua no JS_Core (cerca de 40 KB, sem ganho em carregar à parte); a tela do computador já vinha sob demanda (`Frota_obterConteudoModulo`).

## Tempos (Playwright, Chromium, CPU 4x mais lenta, rede 1,6 Mbps / 750 kbps / 150 ms)

Fotos de teste geradas: JPEG 4.000 x 3.000 de 4,6 MB cada (`%TEMP%\sgo_frotasimples\fotos`). Retirada com 3 fotos; devolução com 1 foto. "Antes" rodou o código anterior (HEAD) num segundo servidor com cópia da mesma base; "depois", o código novo. Cada número é de uma rodada; houve várias rodadas com resultados próximos.

| Medida | Antes iPhone 13 | Antes Pixel 7 | Depois iPhone 13 | Depois Pixel 7 |
|---|---|---|---|---|
| Abrir a Frota | 0,32 s (2 chamadas) + 0,58 s ao tocar em Retirar (3 chamadas) | 0,32 s + 0,95 s | 0,58 a 0,63 s (1 chamada); de novo em até 60 s: 0,10 a 0,15 s | 0,65 a 0,92 s; de novo: 0,09 a 0,12 s |
| Toque no veículo até a tela de retirada | (lista suspensa no formulário acima) | | 0,35 a 0,49 s, sem chamada | 0,43 s |
| Toque em Retirar até a tela pronta para confirmar (3 fotos) | 8,2 s (tela travada pelas fotos) | 9,7 s | 1,8 a 2,5 s | 1,6 a 1,8 s |
| Redução de cada foto | cerca de 2,5 s, na tela | | 0,2 a 0,4 s, fora da tela | 0,2 a 0,3 s |
| Envio das fotos da retirada | 4,0 s, só depois de confirmar (360 KB, 1.280 px) | 3,9 s | 7,8 s em segundo plano desde a 1ª foto (647 KB: 3 fotos de 1.600 px com cerca de 159 KB + miniatura, em base64) | 7,8 s |
| Confirmar a retirada | 4,9 s | 5,0 s | 0,53 s com 20 s de vistoria entre a última foto e o toque; 6,8 s confirmando na mesma hora | 0,35 s; 7,0 s |
| Devolução: toque até pronta para confirmar | 3,2 s | 4,0 s | 1,0 a 1,1 s | 0,9 a 1,2 s |
| Confirmar a devolução | 2,0 s | 3,6 s | 0,56 s (com pausa); 3,2 s (na mesma hora) | 0,46 s; 3,5 s |

Leitura honesta: com 1.600 px (pedido do dono) cada foto pesa mais que com os 1.280 px de antes; quem tocar em Confirmar no mesmo segundo em que tirou a última foto espera o envio (6,8 a 7,0 s, contra 4,9 a 5,0 s antes), com "Terminando de enviar as fotos: 1 de 3…" na tela. No uso real, entre a foto e o Confirmar há a vistoria; com 20 s nesse intervalo o Confirmar cai para meio segundo. Nas fotos de teste com ruído forte (5,5 MB, primeira rodada) a foto reduzida ficou em 380 KB, dentro do alvo de 400 KB.

## O que é gravado (não mudou)

- `apiIniciarViagem` / `apiFinalizarViagem` com o mesmo payload: condutor (o do login; outro só pela gestão), hora do servidor, KM, `fotosSalvas`, `fotosPainelSalvas`, `checklist` item a item. "Tudo OK" grava os 29 itens com `ok: true` e observação vazia, a mesma estrutura de `CHECKLIST_SAIDA_JSON` / `CHECKLIST_CHEGADA_JSON` (conferido no histórico do veículo).
- Devolução: a foto do painel é a foto obrigatória do registro (vai em `FOTOS_CHEGADA_JSON`) e também em `FOTOS_PAINEL_CHEGADA_JSON`. Retirada: a foto do painel é pedida quando o KM é diferente do registrado (regra existente).
- Auditoria, avisos ao condutor, alertas da central e rastreador (`Frota_rastreadorAoRetirar_` / `AoDevolver_`; `rastreador.aviso` fica na tela inicial e `rastreador.texto` vai no aviso de confirmação): sem mudança.
- Campo novo: `CAD_VEICULOS.FOTO_MINIATURA_LINK` (miniatura de 320 px feita no celular a partir da 1ª foto da retirada, enviada à parte; criado por `Frota_bootstrap_`, só aceita link de arquivo). Nada apagado.

## Regras de docs/FROTA_TRAVAS_20261017.md conferidas (HTTP, `h\regras.mjs`, 20 de 20)

Técnico retira com KM "10.000" e vale a hora do servidor (data antiga enviada é ignorada); Tudo OK grava os 29 itens; a tela inicial marca a retirada como minha só para o condutor; técnico B não devolve a retirada do A (mensagem exigida); gestão sem justificativa recusada e com justificativa grava marca, foto do painel e trilha `DEVOLUCAO_PELA_GESTAO`; KM diferente sem foto do painel recusado, com foto passa e entra em "KM a conferir"; KM menor recusado para o técnico; item com problema sem observação recusado; gestão em nome de outro sem justificativa recusada, com justificativa marcada; retirada retroativa que sobrepõe a última devolução recusada; data no futuro recusada; **corrida de 4 pedidos simultâneos: só 1 passa**.

Pela tela (`h\ui2.mjs`): técnico B tocando no veículo do A vê com quem está e o que fazer; gestão devolvendo no lugar vê o aviso, "Opções da gestão" aberto, erro de justificativa e depois o registro "registrada pela gestão"; KM diferente pede a foto do painel; "Tem problema" com item sem descrição mostra "Falta: ..."; atalho "Devolver" do Início do celular abre a devolução; computador 1440 (gestão) com o mesmo fluxo. Sem rolagem lateral, campos com 16 px, alvos com pelo menos 44 px, sem erro de JavaScript. `npx vitest run` no sgo_servidor: 100 de 100. Servidores de teste parados no fim.

## Notas

- Não exercitados no teste automático: a conferência depois de queda de conexão na resposta do registro, o rascunho "Continuar a retirada" e a nova tentativa depois de falha real de envio (o código existe; vale um teste manual com o celular em modo avião antes de publicar).
- No Google (Apps Script), a miniatura do veículo é mostrada pelo endereço de miniatura do Drive; se não abrir, aparece a sigla da placa no lugar.
- Fotos de teste são desenhos gerados (veículo esquemático com textura), não fotos reais.

## Arquivos

- `SGO_Frota_Main.js`: `Frota_apiInicioFrota`, `Frota_linkMiniatura_`, coluna `FOTO_MINIATURA_LINK`, miniatura gravada na retirada/devolução.
- `JS_Core.html` (trecho da Frota): fluxo novo (`fs*`), atalho "Devolver" no Início do celular; removidas as funções do formulário antigo do celular.
- `SGO_Frota_ConteudoModulo.js`: painel "Retirar e devolver" com o fluxo novo no lugar dos dois formulários; manual do operador (seções 3, 5, 6 e 14).
- Medição e capturas: `%TEMP%\sgo_frotasimples\h` (`medir_antes.mjs`, `medir_depois.mjs`, `regras.mjs`, `ui2.mjs`, `antes.jsonl`, `depois.jsonl`) e `%TEMP%\sgo_frotasimples\shots`.
