# Retomada — 23/10/2026, noite

## Estado

| Item | Situação |
|---|---|
| Produção (sgo.metrolabs.com.br) | servidor `4c7fb31`, publicação única feita pelo Codex às ~19:50 com o trabalho do Claude e o dele |
| google-script-dev (GitHub sgo-metrolabs) | `745a923` + este documento, com push |
| sgo_servidor (GitHub sgo-servidor) | `4c7fb31`, com push, nada fora do git |
| Testes | SGO+ 705/705; servidor Vitest 192/192; regressões 42/42 |
| Backups | `G:\Meu Drive\SGO_BACKUPS_CODIGO\2026-10-23_4c7fb31` (Codex: históricos, código publicado, banco criptografado, capturas); `G:\Meu Drive\METROLABS_BACKUP\SGO_20261023_noite` (Claude, antes da publicação) |

## O que foi feito hoje à noite (Autoclave, relatório interno)

- Auditoria: o ciclo simulado saía reprovado com os exemplos da própria tela (o motor exige todos os sensores acima da temperatura mínima), não havia escolha Aprovado/Reprovado no ciclo, o simulado exigia o equipamento do cadastro e o botão "Relatório interno" não abria (diálogo da senha quebrado).
- Correções (commits `ba6e3cc` / `e14b4b3`):
  - ciclo a vapor (121, 127 e 134 °C) simulado passa em todos os critérios; intervalo padrão 10 s;
  - "Resultado desejado": Aprovado ou Reprovado (ponto frio no sensor do meio);
  - temperatura 60 = processo com formaldeído nas 7 fases da fita Baumer de 20/10/2026 (verificação 15, aquecimento 33, condicionamento 33, esterilização 60, lavagem 34, secagem 32, aeração 30 min = 237 min, editáveis);
  - simulado sem exigir o equipamento do cadastro (Autoclave e Lavadora);
  - diálogo da senha administrativa corrigido em Autoclave, Lavadora, Estufa e Cadeia de frio.
- Teste: `tests/autoclave-simulado.test.cjs`.

## Pendências para retomar

1. **Ciclo de 60 °C sem critérios de tempo e faixa.** O motor só exige que a exposição seja identificada; não confere os 60 min programados nem a faixa de 60 a 65 °C. Acrescentar muda também a avaliação de relatórios reais: decisão do dono.
2. **Documentos do ciclo de 60 °C** mostram a coluna de F0 (informativa) e a memória "temperatura medida × vapor saturado". Revisar se ficam assim para baixa temperatura.
3. **Simulador no módulo "Esterilização a baixa temperatura"** (peróxido e formaldeído): não existe; só fazer se o dono pedir.
4. **Créditos do Gemini esgotados** (HTTP 402): a conferência noturna de KM da Frota que lê a foto do painel fica parada até recarregar.
5. **Frota:** Onix aguarda devolução com foto na segunda-feira, 26/10; Montana PRP8J05 calibrada em 189.780 km.
6. **Pendências anteriores:** teste do dono nos portões e na campainha, contato da página do orçamento, botão "Atividades do módulo" na Segurança predial, área da base do Rio, placa do Mobi, fila da Assistência (etapas 5 a 7).

## Cuidado ao trabalhar no servidor

O Codex também trabalha no `sgo_servidor` e publica pelos próprios scripts. Antes de importar o legado ou publicar, rodar `git status` no `sgo_servidor`: o importador (`scripts/importar_legado.mjs`) recria a pasta `legado/` e apaga o que não estiver no git.
