# Pacote 1 de 18/11/2026 — Relatório

Base: `output/financeiro-20261116/cand26` (= produção atual, idêntica à cand25 antes deste pacote). Nada foi publicado, nada foi gravado
na produção (só duas leituras no banco, com `default_transaction_read_only=on`: as contas "MATHEUS GODOI" e Charles, os responsáveis por
área e a contagem de pedidos abertos). Nenhum Omie, Gemini, WhatsApp (Meta/Z-API) ou e-mail real: os testes usam os simuladores.

Placar: suíte completa **2624 aprovados / 0 falhas, 282 arquivos, todos com saída 0** (referência anterior: 2604 / 0) (`suite.txt`). Testes novos: `tests/pedidos-20261118-p1-{compras,comercial,periodo,telas}.test.cjs`
(10 + 5 + 4 + 1 testes, todos verdes).

## 1. O que foi feito, por item

### Item 1 — Wanessa: período de vencimento (Lançamentos e baixas e Aprovação de pagamentos)
- Abaixo da situação, "Vencimento de" e "até" em dd/mm/aaaa (a barra entra sozinha), com os atalhos **Esta semana** (segunda a domingo),
  **Este mês**, **Próximo mês** e **Sem período**, e o botão "Aplicar o período". Explicação embaixo de cada campo (dica do Painel) e um
  parágrafo justificado embaixo do grupo. Combina com a situação (ex.: "A vencer" + próximo mês); uma ponta vazia deixa aquele lado aberto.
- O Omie lista em ordem de cadastro, sem ordenar por vencimento, e não usei o filtro de data do Omie (`filtrar_por_data_de` no Omie é data de
  inclusão/alteração, não vencimento — sem confirmação, preferi não depender dele). Com o período, o servidor lê **todas as páginas** da
  situação (até 60 páginas de 100 títulos), filtra pelo vencimento, ordena por vencimento e pagina de 50 em 50, com a quantidade, o total do
  período e quantos títulos foram lidos. Se a situação tiver mais do que isso, a tela avisa "a lista pode estar incompleta" e o que fazer.
- Aprovação de pagamentos: com o período, "A pagar no período" traz as contas em aberto que vencem nele **sem o limite dos 30 dias**
  (só lê as situações que cabem no período: vencidos/hoje/a vencer); as listas de decisão mostram só esse vencimento; o envio confere de novo
  no Omie com o mesmo período (antes recusaria título além de 30 dias).
- Datas inválidas, invertidas ou intervalo > 400 dias: mensagem com o que fazer, sem ler o Omie.
- Sem período, tudo continua exatamente como antes (mesma chamada, 50 por página).

### Item 2 — Matheus: ciclo ao informar compra (bug reproduzido e corrigido)
- Causa: na tela, a pergunta da duplicidade **substituía** o quadro onde estava a resposta do atraso; o envio seguinte ia sem o motivo do
  atraso, o servidor perguntava o atraso de novo, que apagava a resposta da duplicidade — ciclo sem fim. O servidor também só devolvia uma
  pergunta por vez.
- Correção: o servidor confere as duas e devolve as duas juntas (`pendentes`), com a mensagem "Faltam duas respostas"; a tela guarda as
  respostas e mostra as duas perguntas juntas, com o que já foi escrito; respondidas (>= 10 letras cada), a compra grava. As respostas vão
  para os apontamentos do Financeiro ("Duplicidade possível com REQ-...; quem informou confirmou que é outra compra. Motivo: ...") e para o
  histórico.
- Campo novo opcional **"Para onde vai a compra"** (Matriz Goiânia/GO ou Filial Rio de Janeiro/RJ — as mesmas unidades do Comercial; o
  SGO+ não tem cadastro de filial). Compras iguais para destinos diferentes não são acusadas de duplicidade; o mesmo arquivo de
  comprovante continua sendo acusado sempre. Coluna nova `CMP_REQUISICOES.DESTINO`; aparece na ficha.

### Item 3 — Aprovação de compras pelo Matheus, com critérios
- Regra nova em **Compras > Regras de compras**, quadro "Aprovador delegado" (versão + motivo; **só o dono e a Diretoria alteram** — a
  gestão salva as demais regras, mas mudança neste quadro é recusada com o motivo): ligado; quem decide (padrão: a conta interna
  "MATHEUS GODOI"); prazo em minutos (**30**); de onde conta (**postagem do pedido**, ou envio à aprovação); mínimo de orçamentos (**3**);
  teto do delegado (**vazio = sem teto**); WhatsApp a qualquer hora (sim). O quadro lista quem recebe os avisos com o final do celular ou
  "sem telefone: o aviso vai só pelo sistema e pelo e-mail".
- Vale com `APROVACAO_SO_DIRETORIA = SIM` (produção). O dono e o Charles aprovam a qualquer momento. O pedido vai à aprovação com 3
  orçamentos válidos (fornecedor, valor e arquivo); com menos, o comprador justifica (fornecedor único) e só o dono e a Diretoria decidem.
  Escolha do mais em conta ou justificativa por escrito (já existia; virou critério).
- Vencido o prazo, o Matheus **aprova, reprova ou pede novo orçamento a um contato específico** (fornecedor do cadastro ou contato escrito;
  a compra volta para cotação com a atividade "Pedir novo orçamento a ..." para o comprador; não conta como reprovação), desde que: >= 3
  orçamentos válidos; o mais em conta ou justificado; não pediu nem cotou; dentro do teto. "Pedir novo orçamento" também ficou para o dono e
  a Diretoria.
- Ficha: quadro "Prazo do dono e da Diretoria" com até quando, **contagem que anda sozinha** (só o texto muda, nada é redesenhado), cada
  critério cumprido/faltando, e para o Matheus a frase exata do que impede ("O prazo ... vai até 10:30 (faltam 12 min)" / "venceu, mas
  falta cumprir: ...").
- Decisão do Matheus: histórico `DECISAO_DELEGADO`, `CMP_APROVACOES.NIVEL = DELEGADO`, coluna `DECISAO_CRITERIO` com o critério cumprido;
  aviso na hora ao dono e ao Charles (GS10) e na lista de avisos de Compras.
- Pendências: vencido o prazo com os critérios cumpridos, o item aparece também no Início do Matheus.
- O resto do Financeiro (pagamentos, estorno, orçamento anual, recarga) **não foi tocado** (há teste que confere).

### Item 4 — WhatsApp aos três a cada nova solicitação de compra
- Eventos novos na matriz de avisos (registrados como avisos da gestão, ligados): **GS08** nova solicitação de compra, **GS09** prazo vencido
  e o delegado já pode decidir, **GS10** decisão do delegado, **GS11** pedido de aprovação de preço do Comercial. Saem por
  `SGO_avisoTresNaHora_` (fila dos avisos da gestão, modelo sgo_gestao_item/sgo_gestao_acao já aprovados na Meta), **a qualquer hora**
  (inclusive para o Matheus, que é gestor e PJ), mais e-mail e alerta na tela. GS08/GS10 são informativos ("para conhecimento") e ficam
  resolvidos ao sair. Exemplos dos textos: `exemplos-whatsapp.txt`.
- GS08 sai em cada pedido novo da tela e em cada pedido aberto pelo Comercial (passagem aos setores); compra informada depois de feita e
  compra sem pedido não são "solicitação" e não disparam. Quem pediu nunca recebe. A conta de representação com o mesmo nome nunca recebe.
- GS09: rodada de 15 minutos (`SGO_avisosGestaoRodada_`) e na hora da escolha do orçamento quando o prazo já venceu; uma vez por pedido
  (`CMP_REQUISICOES.DELEGADO_AVISADO_EM`, zerado quando volta para cotação).
- O pedido de aprovação da compra continua indo ao dono e ao Charles na hora (GS06), agora com a linha "Se ninguém decidir até HH:MM,
  MATHEUS GODOI pode decidir".

### Item 5 — Orçamento comercial fora do preço
- O fluxo é o da proposta "Aguardando aprovação" que **só a Diretoria aprova** (sobra abaixo da mínima, item sem custo válido, custo sem
  cotação, preço do catálogo não aprovado; pendência `comercial_desconto`) e o preço do catálogo abaixo do mínimo (`comercial_preco`). O
  desconto comum (acima da alçada do vendedor) o Matheus já aprova hoje como gestão comercial — não mudou.
- Regra em **Comercial > Metodologia**, quadro "Aprovador delegado do preço fora da política" (versão + motivo, só dono/Diretoria): ligado;
  quem (padrão "MATHEUS GODOI", precisa ser da gestão comercial); prazo **15 minutos** desde o pedido; **desconto máximo sobre a tabela que
  ele autoriza: VAZIO** (o dono não deu número); WhatsApp a qualquer hora.
- Critério com o campo vazio (anotado): o Comercial já tem o **preço mínimo do catálogo** (preço que garante a sobra mínima de 35%,
  calculado pelo custo); o Matheus só autoriza se nenhum item estiver abaixo dele e se o custo de todos os itens for conferível (item sem
  custo válido não tem mínimo: fica com o dono e a Diretoria). Com número: desconto da proposta sobre a tabela até esse percentual.
  Preço do catálogo abaixo do mínimo: só com o número preenchido (redução até ele).
- Ele não autoriza proposta da qual é o responsável nem o pedido que ele mesmo concluiu. A autorização fica na proposta e no histórico com o
  critério, vale na conferência antes do envio ao cliente (`aprovacao.delegado`), e avisa o dono e o Charles (GS10). Quadro com contagem na
  proposta; botão "Autorizar (aprovador delegado)".
- WhatsApp a cada pedido de aprovação de preço, a qualquer hora: o dono e o Charles já recebiam na hora (GS04/GS06, a qualquer hora); o
  Matheus agora recebe o GS11 a qualquer hora (antes: GS04/GS06 só no expediente) e sai do GS04/GS06 para não receber duas vezes. No desconto
  comum, o GS11 vai aos três.

## 2. Arquivos (relativos à cand26)

**Novos na cand26:** nenhum.

**Alterados** (fim de linha conferido arquivo a arquivo: LF continua LF, CRLF continua CRLF, os dois mistos continuam com as mesmas linhas LF):
- `SGO_Utilis.js` (CRLF): `SGO_delegadoIds_` (conta interna e ativa; padrão pelo nome, só se houver exatamente uma), `SGO_somarMinutos_`,
  `SGO_minutosEntre_`, `SGO_duracaoTxt_`.
- `SGO_Avisos_Gestao.js`: GS08–GS11 na matriz, `SGO_avisoTresNaHora_`, `SGO_avisoTresContatos_`, avisos informativos, `excluir` no aviso
  de aprovação na hora, rodada do delegado.
- `SGO_Compras_Config.js` (CRLF): bloco `delegado` nas regras, validação e trava de quem altera, colunas novas (`DESTINO`,
  `DELEGADO_AVISADO_EM`, `DECISAO_CRITERIO`, `NOVO_ORCAMENTO_CONTATO`) e marca `CMP_ABAS_OK_V5` (cria as colunas na produção).
- `SGO_Compras_Cotacoes.js` (CRLF): aprovador delegado (rota, critérios, decisão, novo orçamento, rodada, avisos GS08–GS10), mínimo de 3.
- `SGO_Compras_Requisicoes.js` (CRLF), `SGO_Compras_Pedido.js`: GS08 no pedido novo; destino na ficha.
- `SGO_Compras_Informar.js`: as duas perguntas juntas e o destino.
- `SGO_Compras_Painel.js` (CRLF): quadro do delegado na tela de regras.
- `JS_Compras.html` (CRLF): informar sem ciclo + destino; quadro do prazo e critérios com contagem; "Pedir novo orçamento"; quadro das regras.
- `SGO_Comercial_Propostas.js`, `SGO_Comercial_Painel.js`, `JS_Comercial.html`: aprovador delegado do preço (`ComDel_*`), GS11, quadro na
  proposta e na Metodologia.
- `SGO_Omie.js`, `SGO_Omie_Operacoes.js`, `SGO_Financeiro_Pagamentos.js`, `JS_Omie.html` (misto), `JS_Omie_Operacoes.html` (CRLF),
  `JS_Financeiro_Pagamentos.html`: período de vencimento.
- Ajuda: `SGO_Ajuda_Compras.js` (CRLF), `SGO_Ajuda_Comercial.js`, `SGO_Ajuda_Financeiro.js` (misto), `SGO_Ajuda_Administracao.js`,
  `JS_Omie_Ajuda.html` (CRLF). Base do assistente regerada: `SGO_AssistenteManuais.js` (só os trechos novos mudaram).

**Fora da cand26:** `docs/MANUAL_MODULO_COMPRAS.md`, `docs/MANUAL_MODULO_COMERCIAL.md`, `docs/MANUAL_PAINEL_FINANCEIRO.md` (seção 8r; o
manual continua só sigilo). Testes novos `tests/pedidos-20261118-p1-compras|comercial|periodo|telas.test.cjs`. Ajustados de propósito,
com comentário datado: `tests/financeiro-onda3-a.test.cjs` (com SIM, uma cotação só passa a pedir a justificativa do mínimo) e
`tests/matriz-avisos.test.cjs` (95 → 99 eventos), `tests/poderes-lote5.test.cjs` (compara só as faixas de `CMP_REGRAS_PADRAO`, que
continuam intactas; o padrão ganhou o bloco `delegado`), `tests/comercial-legendas-20261113.test.cjs` (`SGO_Comercial_Propostas.js` e
`SGO_Comercial_Painel.js` saem da comparação com a produção; cobertos pelo teste do item 5) e `tests/assistente-manuais-acesso-20261117.test.cjs`
(o parágrafo "WhatsApp nunca pelo Compras" do manual foi reescrito de propósito: deixou de ser verdade).

Diff completo: `legado-p1.patch` (cand25 → cand26).

## 3. Decisões e padrões adotados
- Matheus = conta `matheusgodoi` (GESTOR, área Qualidade, gestão comercial e logística na Caixa). Existe outra conta ativa com o mesmo nome
  (`energiza2209`, perfil REPRESENTADA): é excluída por regra (perfil externo, vínculo representante, representada preenchida). O código não
  grava login nem ID: acha a conta interna pelo nome e só se houver exatamente uma; a regra permite trocar a pessoa na tela.
- Prazo de compras: 30 min **desde a postagem do pedido** (texto do dono). Consequência: como cotar 3 orçamentos leva mais que 30 min, na
  prática o Matheus já pode decidir assim que o pedido chega à aprovação. Quem quiser dar ao dono e ao Charles 30 min **depois** de o pedido
  ir à aprovação troca "O prazo começa a contar" para "do envio do orçamento escolhido à aprovação".
- Mínimo de 3 orçamentos com justificativa possível (fornecedor único): evita travar a compra sem saída; com justificativa, o Matheus não
  decide. Só vale com SIM (com NAO voltam as faixas de antes).
- Teto do Matheus em compras e desconto máximo no Comercial: vazios (o dono não informou valor). Não inventei número.
- WhatsApp: só para os três e só GS08–GS11; usa a fila e os modelos da gestão já aprovados (nada novo para cadastrar na Meta). Valor vai no
  WhatsApp (são os aprovadores).
- Período: filtro pelo vencimento feito no SGO+, lendo todas as páginas (até 6.000 títulos por situação).

## 4. Riscos
- Leitura de todas as páginas no período: com "Todos" e muitos anos de títulos, pode levar segundos e, acima de 6.000 títulos, a tela avisa
  que pode estar incompleta (pede situação ou período menor). Não grava nada.
- Contagem do prazo usa o relógio do servidor no carregamento e o do navegador para andar; ao chegar a zero, a tela pede para reabrir.
- O GS09 depende da rodada de 15 minutos: o WhatsApp de "já pode decidir" sai até 15 min depois do vencimento (a tela libera na hora).
- Matheus é PJ: o WhatsApp dele sai pela fila da gestão (sem a trava de vínculo), como os demais avisos da gestão; está na lista do piloto.
- Compra informada com destino escolhido e outra igual sem destino: ainda é acusada (só destinos diferentes, os dois informados, liberam).

## 5. O que muda no primeiro dia
- **Matheus:** recebe WhatsApp a qualquer hora de cada pedido de compra novo, do prazo vencido e de cada pedido de preço fora da política;
  na ficha da compra e na proposta vê a contagem e o que falta; decide com "Aprovar", "Reprovar", "Pedir novo orçamento" ou "Autorizar
  (aprovador delegado)". Ao informar compra, as duas perguntas aparecem juntas e o envio grava. Não decide o que pediu ou cotou.
- **Wanessa:** período de vencimento em Lançamentos e baixas e na Aprovação de pagamentos (montar a lista da semana ou do mês).
- **Dono e Charles:** continuam aprovando a qualquer momento; recebem o WhatsApp de cada nova solicitação (GS08), do prazo vencido (GS09) e
  de cada decisão do Matheus (GS10); só eles alteram as duas regras do delegado.
- **Comprador:** precisa lançar 3 orçamentos (ou justificar) para a compra ir à aprovação.
- **Pedidos abertos hoje (produção, leitura de 18/11):** compras aguardando aprovação: **0**; em cotação: **2** (REQ-2026-0003, -0005) e
  solicitadas: **4** (REQ-2026-0004, -0008 do Comercial, -0011, -0012) — essas 6 entram na regra nova quando o orçamento for escolhido (e,
  como foram postadas há dias, o prazo de 30 min já está vencido: o Matheus poderá decidir assim que forem à aprovação, cumpridos os
  critérios). Ainda não há nenhuma cotação lançada em produção (`CMP_COTACOES` vazia). Comercial: **0** propostas aguardando aprovação e
  **0** preços do catálogo pendentes.

## 6. O que depende de dado real inexistente
- Teto de valor do Matheus em compras e desconto máximo no Comercial: o dono não informou (ficaram vazios, com o efeito descrito).
- Charles e Matheus têm celular cadastrado; o dono (admin) também. Nenhuma conta dos três está "sem telefone" hoje.
- Não houve teste com a Meta real (envio simulado).
