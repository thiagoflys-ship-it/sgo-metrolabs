# Avisos e decisões do Matheus — correção e pedido novo do dono (19/11/2026)

Cópia: `output/financeiro-20261116/cand36` (base = cand35 = produção, Financeiro v2 etapa a). Nada publicado, nada gravado em
produção, nenhum envio real. Diagnóstico em `DIAGNOSTICO.md`. Patch em `legado-cand35-cand36.patch`. Placar em `suite.txt`.

## 1. Causa (resumo do diagnóstico)

Os avisos GS08–GS11 estavam publicados, ligados e configurados certo (Matheus identificado, celular final 6527, WhatsApp a
qualquer hora ligado). Eles nunca saíram porque, desde a publicação do Pacote 1 (18/11 ~14:30), nenhum gatilho aconteceu com ele
como destinatário possível:

- a compra informada (12 das 20 requisições do ano; as 4 feitas depois da publicação) **não chamava o GS08**;
- nenhuma compra chegou a "Aguardando aprovação" (as 5 abertas estão em cotação, com o Charles de comprador) → sem GS09/GS10;
- o único pedido de preço depois da publicação foi a PROP-2026-0077, **do próprio Matheus** (excluído pela regra); as da Mônica
  (0046 e 0078) foram antes da publicação;
- além disso, pelo desenho do P1 ele só podia decidir depois de 15/30 minutos, e os itens da Caixa que caem na reserva da Diretoria
  (área sem gestor, itens "só Diretoria") nunca iam a ele.

## 2. O que mudou

### Compras (`SGO_Compras_Config.js`, `SGO_Compras_Cotacoes.js`, `SGO_Compras_Informar.js`, `JS_Compras.html`)
- Espera antes do aprovador delegado vira `esperaMinutos`, **padrão 0** (0 a 2.880). O `prazoMinutos: 30` gravado em produção (REGRAS v4)
  deixa de valer sozinho: sem `esperaMinutos`, vale 0. Nenhuma gravação necessária na publicação.
- Com espera 0: escolhido o orçamento, o Matheus recebe o **GS09 na hora** (WhatsApp + e-mail + tela, a qualquer hora) junto com o GS06
  do dono e do Charles, e **decide na hora** com os mesmos critérios (3 orçamentos válidos, o mais em conta ou justificado, não pediu nem
  cotou, teto). Faltando critério, ele recebe o pedido dizendo o que falta (o quê / por quê / o que fazer) e não decide.
- Pedido do próprio Matheus (ou cotado por ele): não vai a ele; fica com o dono e o Charles.
- Cada decisão dele avisa o dono e o Charles na hora (GS10); o critério registrado passa a ser "decisão na hora (regra do dono de
  19/11/2026, espera de 0 minutos); …".
- **Compra informada** passa a gerar GS08 (para conhecimento) ao dono, Diretoria e Matheus, menos quem informou e quem comprou.
- Na Caixa de decisões a compra aguardando aprovação passa a ter o Matheus como responsável (quando liberado e com os critérios) e ele a vê
  (antes o item era "só Diretoria" e ficava oculto para ele).
- Tela: quadro "Aprovador delegado: decisão na hora"; campo "Espera antes do aprovador delegado decidir (minutos)", padrão 0.

### Comercial (`SGO_Comercial_Propostas.js`, `JS_Comercial.html`)
- Espera do aprovador delegado do preço: **padrão 0** (0 a 1.440; não há versão gravada em produção, vale o padrão).
- O GS11 já ia ao Matheus no pedido; agora o texto diz que ele pode autorizar agora e o botão "Autorizar (aprovador delegado)" aparece
  na hora, com o critério de preço mantido (nenhum item abaixo do mínimo do catálogo e custo conferível; sem custo válido, não autoriza).
- Com espera 0 a rodada de 15 minutos não repete o aviso (GS09). Autorização dele → GS10 ao dono e ao Charles.
- Proposta/pedido do próprio Matheus continua só com o dono e o Charles.

### Caixa de decisões — "e os demais" (`SGO_Gestao_Decisoes.js`, `JS_Gestao.html`)
- Novo **decisor operacional da Diretoria** (padrão: conta interna "MATHEUS GODOI"; configurável em Regras e responsáveis: liga/desliga,
  quem — só gestão fora da Diretoria —, e tipos a mais só da Diretoria). Item que cai na **reserva da Diretoria** e não é dinheiro nem
  sigilo passa a ter o Matheus também como responsável: recebe o GS01 (Caixa) e decide com as travas de cada módulo. Ninguém decide
  sobre si mesmo.

## 3. Levantamento dos pedidos que iam só ao dono e ao Charles (12–19/11 em produção) e decisão

| Pedido / item da Caixa | Classe | Decisão |
|---|---|---|
| Compra a aprovar (GS06, `compras_aprovar`) | Compras (preço/orçamento) | Matheus recebe e decide **na hora** com os critérios (aprovador delegado) |
| Proposta fora da política (GS04, `comercial_desconto`, 7 na semana) | Comercial | Matheus recebe (GS11) e autoriza **na hora** com o critério de preço |
| Preço do catálogo / abaixo do mínimo (GS06 `COM:PRECO`/`COM:PISO`) | Comercial | Já recebia como gestão comercial; abaixo do mínimo só autoriza com desconto máximo definido (vazio hoje) |
| `comercial_sem_proxima` (6 abertas), `comercial_pedido_parado`, `email_cliente_parado`, `plano_atrasado`, `qualidade_mov`/`qualidade_os` (sem sigilo), `atividade_justificativa`, `compras_sem_pedido`, Frota, padrões, documentos, cadastros e demais operacionais na reserva da Diretoria | (a) não financeiro | Matheus passa a receber e pode decidir (decisor operacional), com as travas do módulo |
| Depósito de viagem (GS05, `viagem_*`) | (b) dinheiro | Só sócios (FORM-FIN-001) |
| Recarga Caju (`recarga_*`), comissão (`ganhos_*`), Financeiro (`fin_*`: pagamentos, orçamento, estornos, cobrança, contas fixas, espelho Omie) | (b) dinheiro + sigilo | Só sócios; Matheus **não** recebe (Financeiro é sigiloso: só admin, Charles e Wanessa) |
| Programa de conduta (`conduta_*`: sugestão — 16 abertas —, homologar, julgar), ponto/RH | (c) sigilo/pessoal | Fica com a Diretoria (decisão anterior do dono: Conduta só discutir) |
| Sugestão sobre gestor (item "só Diretoria" da avaliação) | (c) sobre a própria gestão | Fica com a Diretoria |

Tudo configurável: espera de Compras e do Comercial; decisor operacional (liga/desliga, quem, tipos a mais fora). A lista fixa (dinheiro,
conduta, ponto/RH, compras_aprovar e sigilo) está em `GES_OPERACIONAL_FORA` / `GES_OPERACIONAL_MODULOS_FORA`.

Não incluído (decisão recomendada): o Matheus **não** recebe para acompanhar os pedidos de dinheiro (depósito de viagem, Caju), porque
levam valores e pessoas; se o dono quiser, é um ajuste pequeno no GS05.

## 4. Avisos, ajuda e manuais
- Matriz: textos de GS08 (inclui compra informada) e GS09 (pedido na hora) em `SGO_Avisos_Gestao.js`.
- Ajuda: `SGO_Ajuda_Compras.js`, `SGO_Ajuda_Comercial.js`, `SGO_Ajuda_Gestao.js` (decisor operacional), `SGO_Ajuda_Administracao.js`.
- Manuais (fora da cand): `docs/MANUAL_MODULO_COMPRAS.md`, `docs/MANUAL_MODULO_COMERCIAL.md`, `docs/MANUAL_MODULO_GESTAO_DECISOES.md`,
  `docs/MANUAL_MATRIZ_DE_AVISOS.md`; base do assistente regenerada (`SGO_AssistenteManuais.js`, `_tools/gerar_base_assistente.cjs`).

## 5. Testes
- Novo: `tests/avisos-matheus-20261119.test.cjs` (9 testes, simuladores de WhatsApp/e-mail): espera 0 mesmo com a regra de 18/11
  gravada; GS09 na hora no sábado à noite e decisão na hora com GS10; Caixa mostra a compra ao Matheus; pedido dele não vai a ele;
  falta de critério; compra informada → GS08; decisor operacional (inclui/exclui por tipo, sigilo, próprio item, configuração e
  validação da tela); Comercial na hora com critério e sem repetir GS09; proposta dele; nada de delegado no Financeiro.
- Ajustados (cenário com prazo continua coberto): `tests/pedidos-20261118-p1-compras.test.cjs` grava espera de 30 min e usa
  `esperaMinutos`; `tests/pedidos-20261118-p1-comercial.test.cjs` grava 15 min e a validação passa a 0–1.440;
  `tests/pedidos-20261118-p1-telas.test.cjs` (capturas) fica no cenário de 30/15 min.
- Na 1ª rodada da suíte, o teste E10 (Financeiro sigiloso) pegou o texto novo do manual da Caixa ("régua de cobrança" visível ao RH);
  o texto foi reescrito sem citar a régua e a base do assistente regenerada.
- Patches: `legado-cand35-cand36.patch` (14 arquivos da cand) e `docs-testes.patch` (manuais e testes no repositório).
- Suíte completa (cand36): **2714 passam, 1 falha intermitente** fora desta mudança — `email-outlook-20261117` ("Esc na lista não
  fecha a janela"), que também falha 1 em 2 vezes na cand35 (produção, sem a mudança) e passou na outra rodada completa e em
  reexecução isolada. Detalhe em `suite.txt`.

## 6. Na publicação / depois
- Nada a gravar: a espera 0 vale pelo padrão. Conferir em produção, depois de publicar (só leitura): `Ensaio` de `Cmp_delegadoCfg_` →
  `prazoMinutos 0`; `ComDel_cfg_` → `prazoMinutos 0`; `Gestao_apiConfig` → `operacional.nomes = ["MATHEUS GODOI"]`.
- Na primeira sincronização da Caixa, os itens abertos de reserva da Diretoria que entram na regra ganham o Matheus como responsável
  (ele recebe os GS01 desses itens: hoje ~10 abertos operacionais; os 16 de Conduta ficam fora).
- Atenção: os itens a mais entram na nota de "Desempenho da gestão" do Matheus (Caixa por responsável). Se o dono não quiser, excluir
  o decisor operacional da avaliação é um ajuste separado.
- A rotina de compras depende do comprador (hoje o Charles) cotar: as 5 requisições abertas seguem paradas na cotação.
