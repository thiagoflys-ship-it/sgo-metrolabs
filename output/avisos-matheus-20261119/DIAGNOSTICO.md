# Diagnóstico — Matheus não recebe os pedidos de autorização (19/11/2026)

Fonte: produção (banco e contêiner `sgo-app-1`), só leitura. Ensaio de funções de leitura com a cand34 (= contêiner) em
`/tmp/ensG` (funções `Ensaio_diagMat_` e `Ensaio_diagMat2_`, em `ensaio/`). Nenhuma gravação, nenhum envio.

## 1. Resposta curta

O código do Pacote 1 (GS08–GS11) **está publicado, ligado e configurado corretamente**: se um dos gatilhos tivesse
acontecido, o aviso sairia ao Matheus por WhatsApp e e-mail. Os GS08–GS11 nunca saíram porque, desde a publicação
(18/11 por volta de 14:30), **nenhum dos gatilhos aconteceu com ele como destinatário possível**. Os gatilhos ficaram
estreitos demais para o uso real:

1. **GS08 (nova solicitação de compra)** só é disparado por `CmpR_salvar_` (pedido feito pela tela) e por
   `SGO_Compras_Pedido.js` (pedido vindo do Comercial). O caminho mais usado hoje é a **compra informada**
   (`CmpI_informar_`, ORIGEM = INFORMADA: 12 dos 20 pedidos do ano; os 4 pedidos feitos depois da publicação,
   REQ-2026-0017 a 0020, são todos informados), e esse caminho **não chama o GS08**. Além disso os 4 são do próprio
   Matheus (ele seria excluído de qualquer forma).
2. **GS09/GS10 de Compras** dependem de a compra chegar a "Aguardando aprovação" (orçamento escolhido). **Nenhuma das
   20 requisições do ano chegou a esse ponto** (ESCOLHA_EM vazio em todas). As 5 abertas (REQ-0004, 0005, 0008, 0011,
   0012) estão em SOLICITADA/EM_COTACAO, todas com **comprador = Charles**, e são anteriores à publicação.
3. **GS11 (preço do Comercial)**: o único pedido de aprovação depois da publicação foi a **PROP-2026-0077, do próprio
   Matheus** (19/11 08:05) — pela regra "ninguém aprova o próprio pedido", ele foi corretamente excluído; o GS04 foi ao
   dono e ao Charles. As da Mônica (PROP-0046 às 11:57 e PROP-0078 às 13:49 de 18/11) foram **antes da publicação**.
   Não houve pedido de preço de catálogo depois de 18/11 09:05.
4. **GS09 do Comercial**: nunca houve proposta aguardando além do prazo com o critério cumprido. O Charles decidiu
   0046 em 24 min, 0078 em 6 min e 0077 em 88 min. E o critério do P1 barraria as três: 0046/0078 eram "sobra abaixo da
   mínima" e 0077 tinha "item sem custo" (o critério exige o preço mínimo conferível em todos os itens).

Ou seja: **não é falha de envio, é desenho**. Mesmo que os eventos tivessem acontecido, o Matheus só poderia decidir
depois de 15 min (Comercial) ou 30 min (Compras), e o dono e o Charles continuariam sendo os primeiros cobrados.

## 2. O que foi conferido e está certo (produção)

| Item | Valor em produção |
|---|---|
| NTF_REGRAS (matriz) | 19 linhas; nenhuma para GS04–GS11 → vale o padrão: GS08–GS11 `gestao=PENDENCIA`, `gestaoLigada=true`, tipo ligado |
| Aprovação só do dono e da Diretoria (`Cmp_soDiretoria_`) | SIM |
| Aprovador delegado Compras (`CMP_CONFIG` REGRAS v4) | ligado, padrão por nome → id `2263e0c4…` MATHEUS GODOI; 30 min contados da postagem; mínimo 3 orçamentos; sem teto; WhatsApp a qualquer hora SIM |
| Aprovador delegado Comercial (`COM_CONFIG` DELEGADO_PRECO) | sem versão gravada → padrão: ligado, Matheus, 15 min, desconto máx. vazio, WhatsApp SIM |
| Destinos "aos três" | Thiago (admin, dono), Charles (Diretoria), Matheus (GESTOR, gestão comercial) |
| Matheus é "da gestão" para a fila (`AvG_ehGestao_`) | sim; celular final 6527; 194 avisos ENVIADOS a ele em 3 dias (GS01, GS02, GI01, S72) |
| Propriedades `COM_DEL_AV_*` (rodada do GS09) | nenhuma → a rodada nunca encontrou caso elegível |
| Log (`registro`) | nenhum erro de "aviso ao dono, à Diretoria e ao delegado" / "nova solicitação" / "delegado" |

## 3. O que o Matheus deixou de receber (12–19/11, fila NTF_GESTAO)

Itens que foram **só ao dono e ao Charles** e não a ele:

- **GS04 COM:DESC — 7 pedidos** de aprovação de proposta (margem abaixo da mínima / item sem custo): com a aprovação só
  da Diretoria, `SGO_avisoGestaoAprovacaoNaHora_` vai `soDiretoria`; o Matheus só entraria pelo GS11 do P1.
- **GS05 VIA:DIR — 2** depósitos de viagem (saída de dinheiro: correto continuar só sócios).
- **GS06 COM:PISO — 1** preço abaixo do mínimo.
- **Caixa de decisões com responsável só dono/Charles** (desde 11/11 a Diretoria não recebe GS01/GS02 item a item; vai
  no resumo diário GS07): CONDUTA_SUGESTAO (16 abertas), COMERCIAL_SEM_PROXIMA (6 abertas), ATIVIDADE_JUSTIFICATIVA (2
  abertas, pessoas cujo gestor é o dono), PLANO_ATRASADO (2), COMPRAS_SEM_PEDIDO (1), QUALIDADE_MOV (1),
  EMAIL_CLIENTE_PARADO (2), CONDUTA_HOMOLOGAR (3 resolvidas), COMERCIAL_DESCONTO (8 resolvidas), FROTA_VIAGEM_ABERTA (1).

Antes do P1 o Matheus já recebia GS06 de preço do catálogo (17 e 18/11), como gestão comercial.

## 4. Causa raiz, em uma frase

GS08–GS11 só nascem em caminhos que não foram usados desde a publicação (pedido de compra pela tela/Comercial, compra
com orçamento escolhido, pedido de preço de outra pessoa) e o caminho realmente usado (compra informada) não tem o
gatilho; somado a isso, o desenho do P1 coloca o Matheus como reserva (decide só depois de 15/30 min) e deixa de fora os
demais pedidos que hoje só vão à Diretoria.

## 5. Correção proposta (fase 2)

1. Gatilho GS08 também na compra informada e nos pedidos do Comercial; teste de ponta a ponta de cada evento com
   simulador (linha em NTF_GESTAO para os três).
2. Prazo de espera do delegado vira configuração com **padrão 0** (Compras e Comercial): o Matheus recebe na hora e
   decide na hora, com os mesmos critérios e a regra de não decidir o próprio pedido; o pedido do Matheus vai ao dono e ao
   Charles.
3. GS04/GS06 de preço passam a incluir o Matheus (via GS11) já no pedido; GS10 avisa o dono e o Charles de cada decisão.
4. Itens não financeiros da Caixa que hoje só vão à Diretoria passam a ter o Matheus como decisor (configurável); saída de
   dinheiro continua só sócios.
