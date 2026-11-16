# Relatório de design (UI/UX) — Financeiro no SGO+ (16/11/2026)

Base: `output/financeiro-20261116/cand4`. Nada foi publicado, nenhum acesso ao servidor de produção nem ao Omie real, nenhum commit. Nenhuma regra de negócio, de sigilo, nome de campo enviado ao servidor, função do servidor ou passo do fluxo prévia → confirmação foi alterado. Só apresentação: HTML, CSS, ordem, rotulagem, agrupamento, estados e textos de tela.

## 1. Como as telas foram vistas

Script novo `output/financeiro-20261116/capturas-design/capturar.cjs`. Ele monta a página completa (Index.html com todos os includes), simula `google.script.run` e o Omie (o mesmo simulador de `tests/financeiro-completo-20261116.test.cjs`, copiado do próprio arquivo do teste) e entra como a Wanessa. As consultas de gestão (posição, agenda, vencidos, resultado, fluxo, ficha do cliente, pedidos, faturamento, conciliação) recebem respostas fixas com valores fictícios, para a tela não ficar vazia. Compras e Caju usam as mesmas respostas fixas do teste. A 390 e 320 px o toque é emulado (`hasTouch`), como no celular: as regras de 44 px do sistema (`@media (pointer: coarse)` em `UI_Estilos.html`) só valem com toque.

- 41 cenas × 3 larguras (1366, 390, 320) = 123 capturas em `capturas-design/antes/` (cand4 original, numa cópia fora do projeto) e `capturas-design/depois/`.
- Cenas: as 15 abas do Painel; novo lançamento (com busca), prévia do lançamento; cadastro no Omie e a prévia; baixa e a prévia; envios a conferir; cobranças, prorrogar boleto, prévia de gerar boleto; conciliação bancária e a prévia; prévia de faturamento; notas, nota recebida (NFS-e ABRASF) e a prévia; fluxo, resultado, provisões (formulário aberto), comissões, sigilo. Compras: conferência, registro do pagamento, Divergente, cartões, formulário do cartão, conciliação das faturas, Justificar, A pagar, Marcar como pago. Caju: Comece por aqui, extrato, transações, divergências, fechamento, configuração.
- Medidas objetivas por cena em `antes/medidas.json` e `depois/medidas.json`: rolagem lateral, altura da página, alvos de toque abaixo de 40 px e campos sem rótulo ligado.
- Nenhum erro de JavaScript em nenhuma cena, antes e depois.

## 2. Problemas encontrados (captura de antes)

| # | Problema | Onde (captura de antes) |
|---|---|---|
| 1 | No celular, as 15 rotinas do Painel viravam 8 linhas de botões (~400 px) antes de qualquer conteúdo, em todas as abas. | `antes/390-p01-visao-geral.png` (topo), qualquer `390-p*` |
| 2 | Prévia de confirmação em lista `dl` sem formatação: rótulo e valor em linhas soltas, valores e datas sem destaque, difícil de conferir. Igual em lançamento, baixa, boleto, nota recebida e faturamento. | `antes/390-p07-novo-previa.png`, `390-p11-baixa-previa.png`, `390-p18-faturamento-previa.png`, `390-p21-nota-previa.png` |
| 3 | Ordem do novo lançamento fora da sequência do trabalho: "Referência única" (código técnico) era o 1º campo, antes do cliente e do documento; valor e vencimento vinham depois de categoria e conta. | `antes/1366-p06-novo-lancamento.png` |
| 4 | Baixa: desconto, juros e multa travados, cada um com uma explicação longa, mais o aviso dizendo a mesma coisa (4 textos iguais, ~600 px no celular). | `antes/390-p10-baixa-form.png` |
| 5 | Botão "Carregar mais" sempre visível ao lado de "Lista completa." (botão inútil de 44 px, duas vezes por formulário). | `antes/390-p07-novo-previa.png` |
| 6 | Cadastro no Omie: 13 campos em sequência, sem grupos; no celular, um embaixo do outro (5.966 px). Na prévia do cadastro, cada linha virava cartão com "Campo:", "Vai para o Omie:", "De onde veio:" repetidos, e "De onde veio:" vazio aparecia. | `antes/390-p08-cadastro-form.png`, `390-p09-cadastro-previa.png` |
| 7 | Importação de notas: o quadro do dia a dia (lançar nota recebida como conta a pagar) ficava embaixo da importação de NF-e de saída; os dois tinham campos parecidos ("Documento: NF-e compra" e "Tipo da nota: NF-e de compra"), confuso. O formulário de importação usava rótulos soltos sem `cadx-input` e o botão principal não era destacado. | `antes/390-p19-notas.png`, `390-p20-nota-recebida.png` |
| 8 | Conciliação bancária: campos numa barra horizontal que quebrava no celular; "Gerar prévia" e "Registrar conferências" com aparência de botão secundário; as explicações dos 5 campos viravam um parágrafo só; o parágrafo de limites repetia o que as explicações já diziam. | `antes/390-p16-conciliacao.png`, `390-p17-conciliacao-previa.png` |
| 9 | Faturamento: lista sem rótulos no celular (o cartão mostrava "9001" sem dizer o que é); "Confirmar faturamento" não era o botão principal; estado vazio sem orientação ("Nenhum documento nesta etapa."). Histórico documental em parágrafos "data - tipo - número - status". | `antes/390-p18-faturamento-previa.png` |
| 10 | Situação dos títulos com o código do Omie ("EMABERTO", "ATRASADO") nas listas. | `antes/1366-p05-lancamentos.png`, `1366-p02-contas.png` |
| 11 | Mensagens de andamento e erro dos formulários como texto solto, sem destaque; depois de confirmar, o resultado substituía a prévia como texto simples. | `antes/390-p11-baixa-previa.png` |
| 12 | Marca d'água cortada: o ladrilho de 440 px fixos cortava nomes longos ("ANESSA FINANCEIRO TESTE"). | `antes/1366-p01-visao-geral.png` |
| 13 | Compras: o formulário do cartão (Novo cartão, Editar) abre numa gaveta fora da tela observada, e as explicações dos campos ck* (escritas na entrega anterior) não apareciam. | `antes/390-c05-cartao-form.png` |
| 14 | Compras: nenhum rótulo `.cp-campo` ligado ao campo (sem `for`) nas telas do Financeiro: 3 a 9 campos sem rótulo por cena. | `antes/medidas.json` (`semRotulo`) |
| 15 | Conciliação das faturas: a lista "Cartão" mostrava "Escolha o cartão" enquanto a tela já exibia a fatura do cartão que o servidor escolheu. | `antes/390-c06-faturas.png` |
| 16 | Subtítulo de Lançamentos repetia o "Para que serve" do guia logo acima; nota final do guia longa e repetida em todas as abas. | `antes/390-p05-lancamentos.png` |
| 17 | Caixa de marcar "Revisado" da conciliação e o aceite do faturamento pequenos, sem área de toque. | `antes/390-p17-conciliacao-previa.png` |

Não havia rolagem lateral em nenhuma cena (antes e depois). Com toque emulado, os campos já tinham 44 px pela regra global do sistema; o único item abaixo de 40 px que sobra é o próprio `input type=file` (o botão "Escolher arquivo" dentro dele já tem a altura certa na captura).

## 3. O que mudou, por arquivo

**`JS_Omie_Gestao.html`**
- Lista de escolha **"Rotina do Financeiro"** (`#omieAbaMovel`) no lugar dos 15 botões a ≤ 700 px; no computador os botões continuam. `OmieTela_abrir_` mantém a lista sincronizada. Os botões continuam no DOM (o teste de destaque da aba segue valendo).
- `OmieUI_destacar_` e `OmieUI_previa_`: prévia em grade (rótulo | valor; no celular, um embaixo do outro), valores em R$ e datas em negrito com algarismos alinhados, linhas que têm valor ou data com fundo verde claro, linha vazia com "—". O texto vem do servidor igual; só é escapado e marcado.
- CSS comum: foco do teclado visível (contorno verde de 3 px), `summary` com 40 px, mensagens dos formulários (`#omieOpsAviso`, `#omieCadAviso`, `#omieNotaAviso`, `#omieFatMensagem`) em faixa azul quando têm texto, caixa da prévia (`omie-previa-caixa`, borda verde), caixas de marcar com 44 px de área, grade de formulário (`omie-grade`), barra de ações (`omie-acoes`), quadro (`omie-bloco`), quadro dos campos travados da baixa (`omie-travados`), campo de arquivo com 44 px.

**`JS_Omie_Operacoes.html`**
- Ordem do lançamento: cliente/fornecedor → documento → valor → vencimento → categoria → conta → referência única → previsão → emissão → observação. Nomes dos campos iguais.
- Baixa: desconto, juros e multa num `fieldset` "Desconto, juros e multa (em zero por enquanto)", lado a lado, descritos pelo aviso (`aria-describedby="omieAvisoBaixa"`), sem as três explicações repetidas. O aviso e o texto dele não mudaram.
- "Carregar mais" some quando a lista veio inteira.
- Prévia com `OmieUI_previa_`, "Prévia válida por … Nada foi enviado ainda.", foco no título da prévia. Resultado da confirmação em faixa verde (ou vermelha, se recusado).
- Situação por extenso na lista (`OmieOps_situacao_`: Em aberto, Vencido, A vencer, Pago, Cancelado…). A regra de "título fechado" continua no campo `fechado` do servidor.
- Tirado o subtítulo de Lançamentos (repetia o guia); em Cobranças ficou só "Gerar e alterar boleto pode ter tarifa do banco."

**`JS_Omie.html`** (Contas a pagar e receber): situação por extenso, com a mesma função. Terminações de linha mistas preservadas.

**`JS_Omie_Cadastro.html`**: campos em três grupos (Quem é, Endereço, Contato); no celular número + complemento e UF + CEP lado a lado; `inputmode` numérico em CNPJ, CEP e telefone, `type=email` no e-mail. Prévia em caixa; no celular, campo pequeno em cima, valor em negrito, "origem: …" embaixo e origem vazia escondida. Busca de pessoa ocupa a largura toda da grade; nome escolhido em verde.

**`JS_Omie_Notas.html`**: quadro com borda (`omie-bloco`), texto de abertura reescrito; prévia com `OmieUI_previa_`; tabela "Contas a pagar que serão lançadas" com vencimento e valor em destaque e linha final "Total que será lançado agora"; valor líquido da NFS-e em destaque; "Nota já paga" com área de toque de 44 px; "Carregar mais" das categorias some quando a lista está completa.

**`JS_Omie_Faturamento.html`**: em Importação de notas, o quadro de nota recebida vem primeiro; o segundo quadro se chama "Importar NF-e de saída ou guardar nota só como documento" e usa a grade com rótulo em cima. Etapa em barra com rótulo. Lista com rótulos no celular; estado vazio com orientação. Prévia com `OmieUI_previa_`, aceite com 44 px, "Confirmar faturamento/importação/recebimento documental" como botão principal. Histórico documental em tabela. O `window.confirm` e o aceite obrigatório continuam.

**`JS_Omie_Conciliacao.html`**: quadro com grade (rótulo em cima, uma explicação por campo); "Gerar prévia" e "Registrar conferências selecionadas" como botões principais; parágrafo só com o formato do CSV (os limites já estão nas explicações); valor de cada movimento em negrito; caixa "Revisado" dentro de um rótulo de 44 × 44 px. `OmieConc_mensagem_` (textContent) intacto.

**`JS_Omie_Ajuda.html`**: guia de Importação de notas reescrito na nova ordem dos quadros; guia de Lançamentos com a busca de cliente logo depois do 1º passo e "na ordem da tela"; nota final do guia mais curta. `OMIE_DICAS` não mudou.

**`JS_Financeiro_Marca.html`**: ladrilho do SVG do tamanho do texto (mínimo 440 px). Opacidade, cor, `pointer-events: none` e impressão iguais.

**`JS_Compras.html`** (CRLF preservado): rótulos dos `.cp-campo` ligados ao campo nas telas do Financeiro (em `Cp_dicasFin_`); a gaveta do cartão passa por `Cp_vigiarFin_` (as explicações ck* aparecem); a lista Cartão da Conciliação das faturas mostra o cartão da fatura aberta (`CP_CONC.final || t.final`, só a opção marcada; a próxima consulta continua lendo a lista); campo de arquivo com 44 px; explicação do Financeiro em 12,5 px.

**`JS_ConciliacaoCaju.html`**: só o campo de arquivo com 44 px. O resto da Caju já seguia o padrão vg-* e estava bom nas capturas.

**Ajuda e manuais**: `SGO_Ajuda_Financeiro.js` (ordem dos campos do lançamento, prévia em destaque, quadro da baixa, primeiro e segundo quadro de notas); `docs/MANUAL_PAINEL_FINANCEIRO.md` (tabela de abas, seção 8a, **seção 8b nova** com os ajustes de tela, seções 10 e 11 regeneradas por `gerar-manual-campos.cjs`); `docs/MANUAL_COMPRAS_FINANCEIRO.md` e `docs/MANUAL_CONCILIACAO_CAJU.md` (um parágrafo cada). `SGO_Ajuda_Compras.js` e `SGO_Ajuda_ConciliacaoCaju.js` não precisaram mudar: o texto deles já dizia que o formulário do cartão tem explicação em cada campo (agora a tela cumpre).

## 4. Antes × depois (medidas)

| Medida | Antes | Depois |
|---|---|---|
| Rolagem lateral a 390 e 320 px | nenhuma | nenhuma |
| Altura das abas do Painel a 390 px | ex.: Visão geral 3.910, Lançamentos 2.262, Comissões 1.369 | 3.535, 1.887, 994 (−375 px em todas) |
| Formulário de baixa a 390 / 320 px | 3.622 / 3.898 | 2.939 / 3.264 |
| Cadastro no Omie a 390 px | 5.966 | 5.663 |
| Campos sem rótulo ligado (Compras, por cena) | 1 a 9 | 0 |
| Erros de JavaScript | 0 | 0 |

Comparar, por exemplo: `antes/390-p11-baixa-previa.png` × `depois/390-p11-baixa-previa.png`; `antes/390-p09-cadastro-previa.png` × `depois/…`; `antes/390-p21-nota-previa.png` × `depois/…`; `antes/1366-p01-visao-geral.png` × `depois/…` (marca d'água); `antes/390-c05-cartao-form.png` × `depois/…`.

## 5. Para decisão do dono

1. **Nome da aba "Importação de notas".** O uso principal agora é lançar nota recebida para pagar. Sugestão: "Notas fiscais" ou "Notas recebidas e emitidas". Não troquei porque o nome aparece em manuais, ajuda e testes.
2. **Guia "Como fazer nesta aba" aberto na primeira visita, também no celular.** Ocupa de 300 a 550 px no celular. Ficou como estava (aberto na 1ª vez, lembra quando fechado), por ser pedido do dono; dá para abrir fechado no celular.
3. **Explicação embaixo de cada campo.** No celular, as explicações são metade da altura dos formulários. Alternativa: mostrar a explicação inteira só quando o campo recebe o foco e um resumo de uma linha no resto do tempo. Não fiz, porque o pedido foi "cada campo com explicação" visível.
4. **Abas no computador.** Continuam 15 botões. Poderiam ser agrupadas (Consultar, Lançar e cobrar, Faturar e notas, Planejar, Controle).
5. **Marca d'água no modo escuro.** O texto é cinza-escuro a 7 %; num fundo escuro some. O SGO+ ainda não tem tema escuro no Financeiro, então ficou como está.
6. **Prévia do servidor com códigos crus.** Algumas linhas vêm do servidor com o código do Omie ("Situação atual: EMABERTO"). A tela não reescreve texto vindo do servidor; trocar exige mexer em `SGO_Omie_Operacoes.js` (fora do escopo de apresentação).
7. **Ordem dos campos no manual (seção 11).** O gerador `gerar-manual-campos.cjs` lista os campos do lançamento na ordem antiga (referência primeiro). O gerador fica fora das pastas que eu podia alterar; basta trocar a lista na linha "Novo lançamento e edição".

## 6. Testes

Nenhum teste foi alterado: nenhuma mudança visual quebrou teste.

Lista pedida (`sh output/financeiro-20261116/rodar-lista.sh output/financeiro-20261116/cand4 …`):

| Arquivo | Resultado |
|---|---|
| financeiro-completo-20261116 | 23 passam / 0 falham |
| financeiro-omie-20261114 | 25 / 0 |
| omie-operacoes | 20 / 0 |
| omie-faturamento | 12 / 0 |
| omie-financeiro | 13 / 0 |
| omie-conciliacao | 9 / 0 |
| financeiro-sigilo-geral-20261116 | 5 / 0 |
| compras | 17 / 0 |
| compras-informar-conciliacao | 10 / 0 |
| conciliacao-caju | 14 / 0 |
| conduta-relato-20261116 | 10 / 0 |

Suíte completa (`output/financeiro-20261116/suite-design.txt`): **241 arquivos, pass 2225 / fail 71** (27 arquivos com saída diferente de zero). Referência `suite-dev.txt`: 241 arquivos, pass 2215 / fail 80 (28 arquivos).

Comparação arquivo a arquivo com `suite-dev.txt`: **nenhum arquivo piorou**. A única diferença é `conduta-relato-20261116` (0/9 → 10/0), que já vinha corrigido na cand4. As 71 falhas restantes são as mesmas antigas da referência (CertCal, Licitações, Estufa simulado, matriz de avisos, depósito de viagem na página completa etc.), em arquivos que esta entrega não tocou.

Observação: a lista pedida rodou durante o trabalho, antes de três ajustes finais pequenos (linha do total na prévia da nota, texto do formato do CSV e o critério de destaque das linhas da prévia); a suíte completa rodou depois de todas as mudanças e cobre esses arquivos com o mesmo resultado (todos passando).

## 7. Arquivos alterados

`output/financeiro-20261116/cand4/`:
- JS_Omie.html
- JS_Omie_Gestao.html
- JS_Omie_Operacoes.html
- JS_Omie_Cadastro.html
- JS_Omie_Notas.html
- JS_Omie_Faturamento.html
- JS_Omie_Conciliacao.html
- JS_Omie_Ajuda.html
- JS_Financeiro_Marca.html
- JS_Compras.html
- JS_ConciliacaoCaju.html
- SGO_Ajuda_Financeiro.js

`docs/`:
- MANUAL_PAINEL_FINANCEIRO.md
- MANUAL_COMPRAS_FINANCEIRO.md
- MANUAL_CONCILIACAO_CAJU.md

`output/financeiro-20261116/`:
- capturas-design/capturar.cjs (novo), capturas-design/antes/ e capturas-design/depois/ (capturas e medidas), e as capturas que a suíte grava em capturas-design/
- suite-design.txt
- especialistas/RELATORIO_DESIGN.md (este)

Sem mudança: JS_Omie_Pedidos.html, JS_Omie_Cliente.html, SGO_Ajuda_Compras.js, SGO_Ajuda_ConciliacaoCaju.js, todos os SGO_*.js de servidor e `tests/`.
