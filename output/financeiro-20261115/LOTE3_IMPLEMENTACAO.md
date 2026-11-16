# Acessos por caixas — Lote 3: Financeiro em Compras (15/11/2026)

<div style="text-align: justify">

## O que foi ligado

Seis caixas do módulo Financeiro passam a valer no servidor, no padrão espelho dos lotes anteriores: **sem alteração gravada para a pessoa, cada trava continua com a regra de hoje**; só o SIM ou o NÃO gravado em Administração > Acessos muda o resultado.

| Caixa | Travas (arquivo) | Regra padrão (a de antes) |
|---|---|---|
| FIN_CONFERIR_COMPRAS | conferir a compra, ver a conferência (SGO_Compras_Financeiro.js); botão "conferir" da ficha; relatório da conciliação (SGO_Compras_Relatorios.js) | Financeiro (perfil ou área), Diretoria, Administrador; no relatório, também a gestão de Compras |
| FIN_FATURAS_CONCILIAR | tela, importar extrato, conciliar e fechar fatura (SGO_Compras_Faturas.js); sinal "podeConciliar" da tela (SGO_Compras_Painel.js) | Financeiro, gestão de Compras, Diretoria, Administrador |
| FIN_A_PAGAR | ver o que há a pagar e marcar como pago (SGO_Compras_Faturas.js) | idem |
| FIN_FATURA_REABRIR | reabrir fatura fechada (SGO_Compras_Faturas.js) | Diretoria e Administrador |
| FIN_CARTOES_VER | lista de cartões e sinal "podeCartoes" | Financeiro, compradores, gestão e gestores |
| FIN_CARTOES_EDITAR | cadastrar e alterar cartões | Financeiro, Diretoria, Administrador |

**Desligadas:** FIN_VER_CONTAS e FIN_CONCILIAR_BANCO. Eram da página antiga /financeiro do servidor, aposentada em 15/11. O Painel financeiro usa as caixas próprias FIN_OMIE_*.

## Como foi feito

Usa o motor do lote 5 (SGO_Compras_Config.js):

- as 6 caixas entram em `CMP_CAIXAS`, então `Cmp_aplicarCaixas_` lê só as alterações gravadas;
- a função nova `Cmp_exigirFinCx_(eu, caixa, padrão, ação)` funciona assim: com SIM passa; com NÃO recusa com o nome da caixa e "Administração > Acessos"; sem alteração, recusa com a mensagem de antes;
- os cartões usam `Cmp_cx_` dentro de `CmpCart_podeVer_` e `CmpCart_podeEditar_`;
- `eu.financeiro` não é sobrescrito: cada trava pergunta a própria caixa, e tirar uma caixa não muda o padrão das outras;
- continuam fixas a proteção "quem registrou o pagamento ou emitiu o pedido não confere a própria compra" e o motivo obrigatório para reabrir uma fatura.

A tela não mudou: ela já segue os sinais do servidor, e a recusa continua sempre no servidor.

## Testes

- `tests/poderes-lote3.test.cjs` (novo), 4 de 4 passando:
  1. **Equivalência.** As 23 contas reais passaram por 13 ações da API de Compras mais as ações da ficha, comparadas com o legado de antes (`output/financeiro-20261115/lote3-antes`): 322 comparações e **0 divergências**. O registro está em `lote3-equivalencia.txt`.
  2. **Exceção NÃO.** Ao tirar a caixa de uma pessoa do Financeiro, a recusa vem com a mensagem da caixa. As outras caixas da pessoa seguem o padrão, e `eu.financeiro` continua verdadeiro.
  3. **Exceção SIM.** Um técnico ganha só "A pagar" e "Ver cartões"; a conciliação das faturas continua fechada para ele.
  4. **Catálogo.** As 6 caixas ficam ligadas, e as duas da página antiga ficam desligadas.
- `tests/poderes-lote0.test.cjs`: só a lista esperada de ligadas foi ajustada (com o lote 3). Resultado: 13 de 13.
- Suítes de Compras e de caixas, comparando antes e depois: os resultados são os mesmos. A suíte compras-acesso-financeiro-delegado falha igual nos dois lados (0 de 7): ela espera uma "delegação financeira" pela lista de regras que não existe no código, o que já estava registrado como falha anterior.

## Ajuda

`SGO_Ajuda_Administracao.js` › Acessos: parágrafo "Lote 3" e a frase "O que muda para a equipe".

</div>
