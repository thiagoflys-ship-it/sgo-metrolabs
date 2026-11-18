# Relatório — Bloco C da onda 3 do Financeiro: Recarga Caju da rotina, etapas R1 a R6 (18/11/2026)

**Base de trabalho:** `output/financeiro-20261116/cand21`. Antes da mudança, era igual à `cand20` (produção atual, já com o bloco B).

**Especificação:** `output/financeiro-20261116/especialistas/ESPEC_ONDA2_FINANCEIRO.md`, usada nestas partes:
- seção 4 inteira (4.1 a 4.17);
- etapas R1 a R6 da seção 6;
- itens 9 a 13 da seção 7.

**O que não foi feito:**
- Nada foi publicado e não houve commit.
- Não houve acesso à produção, ao banco nem ao `/opt/metrolabs/sgo/cofre`.
- Caju, Omie e Gemini reais não foram chamados. Também não saiu nenhum e-mail ou WhatsApp real.
- Nos testes, o Caju, a IA e o e-mail são simulados (`tests/_caju_ambiente.cjs` e simulador próprio do Gemini).
- Não mexi no servidor Node, na Frota/rastreador, no chat do RH360, nos PGT/POP gerados nem no Portal do cliente.

## 1. O que foi feito

### Modelo adotado (decisões do dono, sem perguntar)

**Fluxo:** pedido avulso, prestação de contas e devolução. O técnico pede o valor de que precisa, gasta, comprova gasto a gasto e devolve o que sobrar no fim do período.

**O que existe na política, mas fica vazio (vazio = sem limite automático; cada pedido é decidido na aprovação):**
- fundo padrão e fundo por pessoa;
- limite de aprovação do Financeiro;
- teto por finalidade;
- limite de gasto sem comprovante.

Nenhum valor foi inventado. O modelo "fundo rotativo" está pronto, testado e desligado (campo `modelo`).

### R1 — Base (`SGO_RecargaCaju.js`)

**Tabelas novas:** `RCJ_PORTADORES`, `RCJ_SOLICITACOES`, `RCJ_DECISOES`, `RCJ_CARGAS`, `RCJ_GASTOS`, `RCJ_PERIODOS`, `RCJ_ACERTOS`, `RCJ_POLITICA`, `RCJ_LIBERACOES` e `RCJ_DOCUMENTOS`.

**Histórico:** fica em `CJU_HISTORICO`, com `ENTIDADE = RECARGA`, como a especificação prefere (um histórico só).

**Caixas novas** (lote 13, módulo "Recarga Caju"):
- `RECARGA_USAR`: padrão é quem está habilitado como portador. Não é sigilosa, porque o servidor só devolve os dados da própria pessoa, pela sessão.
- `CAJU_RECARGA_VER`, `CAJU_RECARGA_APROVAR`, `CAJU_RECARGA_CONFERIR` e `CAJU_RECARGA_POLITICA`: ficam sob a trava de sigilo. Uma exceção gravada em Acessos não libera quem está fora da lista.

**Política com versões, motivo e explicação de cada campo** (`RCJ_POLITICA_DICAS`, o mesmo texto na tela e no manual). Valores padrão:

| Campo | Padrão |
|---|---|
| Período | Mensal |
| Prazo do comprovante | 2 dias úteis |
| Prazo do fechamento | 3 dias úteis |
| Trava | 10 dias úteis |
| Saldo parado | 60 dias |
| Termos proibidos | bebida alcoólica, tabacaria, aposta, loteria, saque |
| Fim de semana ou feriado | pede justificativa |
| WhatsApp | desligado |
| Desconto em folha | não; fixo em "não" no código |

**Termo do portador:**
- texto padrão profissional, configurável;
- marcado "revisar com o RH e o contador";
- mudar o texto sobe a versão e pede novo aceite;
- o aceite grava data, hora, versão e marca do texto.

**Portadores:**
- só quem tem o CPF vinculado ao Caju (`CJU_COLABORADORES`) pode ser habilitado;
- habilitar pede motivo;
- ao desabilitar quem ainda tem saldo ou valor a devolver, a tela avisa.

### R2 — Pedido, aprovação e carga

**Tela do colaborador** (`JS_RecargaCaju.html`, Operação de campo > Minha recarga Caju):
- o menu aparece para quem tem cartão Caju vinculado;
- o pedido traz valor, justificativa (15 letras ou mais) e para que vai usar;
- só um pedido por vez fica em andamento;
- o pedido devolvido pode ser ajustado e reenviado;
- o pedido pode ser cancelado enquanto não for decidido.

**Aprovação:**
- Com `APROVACAO_SO_DIRETORIA = SIM` (padrão), só o dono e a Diretoria da lista de sigilo aprovam.
- Quando a Wanessa tenta aprovar, a recusa diz o quê, por quê e o que fazer.
- Quem pede não aprova (regra fixa).
- O pedido de quem é do Financeiro e está na lista vai sempre para a Diretoria, mesmo com a regra em `NAO`.
- Aprovar valor menor que o pedido, devolver e negar pedem fundamentação de 15 letras ou mais.

**Carga manual:**
- exige o comprovante;
- nunca passa do aprovado;
- carga parcial exige observação.

**Carga pelo Caju (modo API):**
- cria o pedido `RECARGA <número>`, com `CJU_PEDIDOS.ORIGEM = RECARGA` e `RECARGA_ID`;
- paga com o saldo da conta Caju;
- o crédito entra sozinho em `RCJ_CARGAS` quando o Caju credita, pela rotina de 15 minutos que já existe;
- não pode haver dois pedidos de crédito para a mesma recarga.

**Separação de funções:**
- o portador nunca carrega o próprio cartão;
- quem aprovou não faz a carga quando há outra pessoa da lista com a caixa da carga;
- se só sobrar quem aprovou, a carga é feita, marcada `MESMA_PESSOA` e listada no relatório semanal.

### R3 — Prestação

**Lançamento do gasto pela tela, no celular.** Campos:
- foto (a câmera abre) e "Ler o comprovante";
- data, valor e estabelecimento;
- CNPJ e finalidade;
- para que foi (10 letras ou mais);
- vínculo (cliente, O.S., chamado, veículo ou rotina interna);
- pago com (cartão Caju ou dinheiro próprio);
- sem comprovante e justificativa.

**"Gastos do seu cartão que faltam comprovar":** a tela mostra primeiro as linhas do extrato sem comprovante. O toque em uma delas preenche data, valor e lugar.

**Leitura pela IA:**
- O miolo da `Via_lerComprovante_` foi para `Caju_lerComprovanteIa_` (`SGO_Caju_Comprovante.js`).
- Na viagem, o pedido ao serviço é o mesmo byte a byte, e as respostas e mensagens também (teste de equivalência contra a `cand20`).
- Na recarga, o texto diz "despesa operacional" e lê também litros e placa.
- Só a instrução e a imagem vão ao serviço.
- A diferença entre o que foi lido e o que foi digitado fica em `IA_DIFERENCAS`.
- Sem a chave, o lançamento é manual.

**Política na hora:**
- **Recusado, com o que fazer:** data futura; descrição curta; gasto sem comprovante enquanto o limite está vazio; fim de semana ou feriado sem justificativa; acima do teto sem justificativa; comprovante repetido.
- **Vira apontamento para o Financeiro:** termo proibido no nome do estabelecimento ou no ramo do CNPJ (pela consulta de CNPJ que já existe); fim de semana justificado; acima do teto justificado; possível fracionamento.

**Comprovante repetido:** o mesmo arquivo (SHA-256) é recusado se já estiver na recarga, na viagem ou em Compras (`CMP_PEDIDOS.COMPROVANTE_HASH`). A viagem também passou a recusar um arquivo já usado na recarga.

### R4 — Conciliação (`SGO_Caju_Conciliacao.js`)

**Ligação do extrato à recarga:**
- **4a:** com a categoria do Caju da rotina configurada, a linha vai direto para a recarga.
- **4b:** na janela da viagem, o gasto da viagem vem primeiro; depois, o gasto da recarga com valor exato.
- **4c:** fora das viagens, o portador tem o gasto ligado pelo valor exato; se o valor for diferente e o estabelecimento parecido, vira `RCJ_VALOR_DIFERENTE`; sem gasto lançado, vira `RCJ_SEM_COMPROVANTE` (e não `FORA_DO_PERIODO`).
- **Quem não é portador** continua exatamente como antes.
- **A linha que o técnico escolheu** ao comprovar tem prioridade.
- **Crédito e devolução:** o crédito liga à carga da recarga e o recolhimento liga ao acerto da recarga.

**As 8 divergências novas** entram em `CJU_DIV_TIPOS`, cada uma com dono e o que fazer:
- `RCJ_SEM_COMPROVANTE`
- `RCJ_VALOR_DIFERENTE`
- `RCJ_SEM_TRANSACAO`
- `RCJ_FORA_POLITICA`
- `RCJ_LEITURA_DIFERENTE`
- `RCJ_COMPROVANTE_REPETIDO`
- `RCJ_SALDO_PARADO`
- `RCJ_CREDITO_SEM_RECARGA`

**Gravação:**
- colunas novas em `CJU_EXTRATO`: `RECARGA_ID`, `RCJ_GASTO_ID`, `RCJ_CARGA_ID` e `RCJ_ACERTO_ID`;
- também são preenchidos `RCJ_GASTOS.TRANSACAO_ID/CONCILIACAO_SITUACAO`, `RCJ_CARGAS.EXTRATO_ID` e `RCJ_ACERTOS.TRANSACAO_ID`.

**Quando a conciliação roda:** depois de cada importação, como antes, e também depois de cada gasto lançado pelo técnico.

**Regra nova:** ninguém resolve a divergência do próprio cartão.

### R5 — Régua e trava

**`Recarga_rotina_`** roda dentro de `Ges_rodada_`:
- uma vez por dia útil, no expediente;
- cada aviso uma vez só (`CJU_HISTORICO`, `ENTIDADE RECARGA_AVISO`);
- canais: sistema e e-mail, sem valor no assunto.

| Aviso | Quando |
|---|---|
| Gastos novos a comprovar | Quando aparecem no extrato |
| Prazo vence hoje | No dia do prazo do comprovante |
| Lista no e-mail | Com 2 dias úteis de atraso |
| Cópia ao Financeiro, com a data da trava | Com 5 dias úteis de atraso |
| Trava | Quando passa da trava |
| Fechamento | No fim do período |

**WhatsApp:** só se a política ligar. Nesse caso, no máximo um por semana por pessoa, sem valor, na categoria `ATIVIDADES` (regra "WhatsApp sutil").

**Trava conjunta:**
- `Rcj_trava_`: comprovante vencido há mais de 10 dias úteis, ou período sem fechar além do prazo.
- `Via_travaPrestacao_` passou a respeitar a trava da recarga, e o pedido de recarga respeita a da viagem.
- Liberação só pela Diretoria, com motivo e validade de 1 a 30 dias.

**Pendências** (ids `CJU:RCJ:`):
- do portador, sem valor: comprovar, fechar e divergência;
- da gestão, só para a lista de sigilo: aprovar, carregar, conferir, divergência do Financeiro e trava (vai para a Caixa de decisões da Diretoria).

### R6 — Conferência, períodos, acerto, painel, A4 e relatório semanal

**Conferência:** aceitar ou glosar cada gasto, total ou parcial, com motivo. Ninguém confere a própria prestação; a do Financeiro portador é conferida pela Diretoria.

**Fechamento:**
- o técnico fecha o período ("Comprovei todos"; com gasto sem comprovante, marca que está ciente);
- o Financeiro conclui;
- sem o fechamento, só depois do prazo e com motivo.

**A conta (nunca digitada):**
- a devolver = carregado − aceito no cartão − devolvido;
- a reembolsar = aceito pago com dinheiro próprio − reembolsado.

**Acertos:** devolução ou reembolso, com comprovante. Acertado, o período fica encerrado.

**Painel (aba "Painel" da gestão):**
- os 10 índices da seção 4.15;
- 4 gráficos em SVG: por finalidade, por pessoa, evolução mensal e prazo médio por pessoa com a linha do prazo;
- quadro de leitura (Kanban) com as 9 colunas;
- gasto por vínculo.

**A4:**
- **individual:** o próprio técnico gera; traz o extrato do período linha a linha e o comprovante ligado ou a falta dele; com o período concluído, vira o A4 de fechamento, com as assinaturas;
- **geral:** só a lista de sigilo;
- **pendências e divergências:** só a lista de sigilo;
- cada geração fica registrada em `RCJ_DOCUMENTOS`, e o arquivo vai para a pasta "Conciliação Caju - Relatórios".

**Relatório semanal:**
- a seção 7 traz a recarga da semana (calculada, sem IA) e as recargas aprovadas e carregadas pela mesma pessoa;
- o G8 passou a somar viagem e recarga;
- o I19 conta também os comprovantes vencidos da recarga.

### Telas, ajuda, manual e assistente

**Gestão:** `JS_RecargaCaju_Gestao.html`, como aba nova "Recarga Caju" no Painel financeiro (22 abas). Sub-abas: Pedidos e cargas, Prestações, Portadores, Divergências, Política, Painel e Relatórios A4.
- Cada campo tem a explicação embaixo.
- "Como fazer nesta aba" está em `JS_Omie_Ajuda.html` (`OMIE_GUIAS.recarga`).

**Ajuda do colaborador:** `SGO_Ajuda_RecargaCaju.js`, com "Como usar esta tela" sem regras da gestão.

**Manuais:**
- `docs/MANUAL_RECARGA_CAJU.md`: novo, do colaborador, para a base de todos;
- `docs/MANUAL_PAINEL_FINANCEIRO.md`: seção 8i, mais a aba nas seções 3, 10 e 11; acesso `sigilo`, só a lista;
- `docs/MANUAL_CONCILIACAO_CAJU.md`: parágrafo sobre a recarga.

**Assistente:**
- base regenerada (`SGO_AssistenteManuais.js`);
- `SGO_AssistenteErros.js` mapeia `Rcj_*` para `recarga_caju`, e a tela da gestão é tratada como Financeiro.

## 2. Arquivos (relativos à cand21)

**Novos:**
- `SGO_RecargaCaju.js`
- `SGO_RecargaCaju_Prestacao.js`
- `SGO_RecargaCaju_Relatorios.js`
- `SGO_Caju_Comprovante.js`
- `SGO_Ajuda_RecargaCaju.js`
- `JS_RecargaCaju.html`
- `JS_RecargaCaju_Gestao.html`

**Alterados** (fim de linha preservado e conferido arquivo a arquivo; todos LF, menos `JS_Omie_Ajuda.html` e `JS_Omie_Gestao.html`, que são CRLF):
- `Index.html`: menu "Minha recarga Caju" e os dois includes
- `JS_Core.html`: iniciar, rota `recarga_caju` e título
- `JS_Inicio.html`: pendências `recarga` e `recarga_gestao`
- `JS_Omie_Gestao.html`: aba `recarga`
- `JS_Omie_Ajuda.html`: guia da aba
- `SGO_Ajuda.js`
- `SGO_AssistenteErros.js`
- `SGO_AssistenteManuais.js` (gerado)
- `SGO_Caju.js`: colunas novas, cache `CJU_ABAS_OK_V2`, pendências
- `SGO_Caju_Conciliacao.js`: 4a a 4c, crédito, recolhimento, 5b, saldo parado, gravação, resolução
- `SGO_Caju_Pedidos.js`: histórico, crédito e pagamento do pedido de origem RECARGA
- `SGO_Financeiro_Indicadores.js`: I19 e G8
- `SGO_Financeiro_Relatorio.js`: seção 7
- `SGO_Gestao_Escada.js`: `Recarga_rotina_` em `Ges_rodada_`, sem cron novo
- `SGO_Viagem.js`: pendências e registro dos tipos
- `SGO_Viagem_Prestacao.js`: leitura da IA pelo núcleo compartilhado, trava conjunta, comprovante repetido

**Fora da cand21:**
- `docs/MANUAL_RECARGA_CAJU.md` (novo)
- `docs/MANUAL_PAINEL_FINANCEIRO.md`
- `docs/MANUAL_CONCILIACAO_CAJU.md`
- `_tools/gerar_base_assistente.cjs`: entrada do manual novo no MAPA
- `tests/recarga-caju.test.cjs` (novo)
- `tests/_caju_ambiente.cjs`: carrega a recarga com o Caju
- `tests/_viagem_ambiente.cjs`: carrega `SGO_Caju_Comprovante.js`
- `tests/financeiro-omie-20261114.test.cjs`: ajustado de propósito, de 21 para 22 abas

**Diff completo:** `legado-bloco-c.patch` (cand20 → cand21).

## 3. Testes

**`tests/recarga-caju.test.cjs`: 12 passam, 0 falham.**

| Teste | O que prova |
|---|---|
| R1 | Caixas sob sigilo; política padrão sem valores; versão e motivo; habilitação só com vínculo; termo com versão e novo aceite |
| 4.16-1 | `usuarioId` vindo da tela é ignorado; ninguém vê dado de terceiros; o relatório de outra pessoa é recusado |
| 4.16-2 | 4 contas de fora (gestor com exceção gravada em Acessos, técnico, RH e gerente) recusadas em 15 APIs; recusa registrada em `FIN_OMIE_ACESSOS`; pendências do portador sem valor |
| 4.16-3 | Só dono e Diretoria aprovam; quem pede não aprova; Wanessa portadora vai à Diretoria; no fundo rotativo, sugestão = reposição, e acima do fundo ou do limite sobe |
| 4.16-4 | Carga manual e pelo Caju nunca passam do aprovado; um pedido Caju por recarga; quem aprovou não carrega; "mesma pessoa" no relatório semanal |
| 4.16-5 | Valor exato; prioridade da viagem; 4b; `RCJ_SEM_COMPROVANTE` em vez de `FORA_DO_PERIODO`; não portador como antes; comprovação pela linha sana a divergência; `RCJ_VALOR_DIFERENTE` |
| 4.16-6 | Termo proibido pelo nome e pelo CNAE simulado; fim de semana; teto; fracionamento; divergência do Financeiro |
| 4.16-7 | Mesmo SHA entre recarga, viagem e Compras recusado nos dois sentidos |
| 4.16-8 | Fora do expediente e sábado não avisam; aviso uma vez; 2 e 5 dias úteis; trava em 10 dias úteis (com o feriado de 02/11); viagem travada junto; liberação só da Diretoria e vencimento |
| 4.16-9 | Equivalência byte a byte com a `cand20` (pedido e resposta); mensagens; recarga com litros e placa; diferenças registradas; sem chave |
| 4.16-10 | Conferência, glosa parcial, fechamento, conclusão (a devolver R$ 225,00, a reembolsar R$ 25,00, conta feita à mão), acertos, recolhimento ligado, A4 individual, geral e pendências, painel, seção 7 |
| 4.16-11 | Tela real, página completa, a 390, 320 e 1366 px, sem rolagem lateral e sem erro de JavaScript, com o fluxo pela tela: aceite do termo, pedido, aprovação no Painel, comprovação no celular a partir da linha do extrato com a foto, conferência; as 6 sub-abas da gestão; Conciliação Caju; prévia do A4 |

**Regressão** (`rodar-lista.sh`, todos com 0 falhas):

| Arquivo | Passam |
|---|---|
| conciliacao-caju | 14 |
| deposito-viagem | 22 |
| deposito-viagem-prestacao | 13 |
| financeiro-omie-20261114 | 25 |
| financeiro-onda2-e1e5 | 12 |
| financeiro-relatorio-semanal | 8 |
| financeiro-cobranca-agenda | 7 |
| assistente-duvidas | 12 |
| assistente-manuais-acesso-20261117 | 6 |
| financeiro-sigilo-geral-20261116 | 5 |
| financeiro-onda3-a | 7 |

**Suíte completa:** ver a seção 7.

**Capturas** (`capturas/`, tela real):
- **390 px:** termo do portador, pedido, gastos a comprovar, prestação no celular, depois do lançamento.
- **1366 px:** aprovação, conciliação Caju, prévia do A4.
- **1366 e 390 px, gestão:** conferência, divergências, portadores, política, painel, relatórios.
- **320 px:** Minha recarga.

**Prévias do A4:** `previa-a4-recarga-individual.html` e `previa-a4-recarga-geral.html`.

## 4. Decisões adotadas (além das do dono)

- **Telas.** A gestão é uma aba do Painel financeiro, como diz a especificação. Não há item próprio no menu Financeiro. As divergências também aparecem na Conciliação Caju. Os "cartões de resumo na Conciliação Caju" não foram feitos (ver a seção 5).
- **Tabelas a mais em relação à especificação:**
  - `RCJ_CARGAS`: a especificação guarda só o total na solicitação, mas a conciliação precisa de cada carga;
  - `RCJ_LIBERACOES`: liberação da trava;
  - colunas `RCJ_CARGA_ID` e `RCJ_ACERTO_ID` em `CJU_EXTRATO`.
- **Limite do Financeiro vazio**, com a regra "só a Diretoria" desligada: tudo vai para a Diretoria. Fica do lado conservador.
- **Matriz de avisos.** Os eventos FN02 a FN06 não foram registrados, como o bloco B fez com o FN01. O aviso usa a origem `RECARGA_CAJU`, com regra própria: dia útil e expediente. Assim nenhum evento financeiro aparece na tela da matriz, que a gestão vê.
- **Autorização da IA.** É o mesmo tratamento da viagem, como a especificação recomenda; não há chave `RCJ_IA_AUTORIZADA`.
- **Período.** É calculado a partir dos dados. A linha em `RCJ_PERIODOS` guarda só o fechamento, a conferência e o encerramento.
- **Na janela de uma viagem**, a transação do portador sem gasto exato da viagem nem da recarga segue a regra da viagem (sem comprovante da viagem), como na especificação 4b.
- **"Por centro de custo"** virou "por vínculo" (cliente, O.S., chamado, veículo), porque o cartão da rotina não tem centro de custo no SGO+.

## 5. O que ficou para depois (depende de decisão ou de dado real que não existe)

- **Categoria ou carteira da rotina no Caju** [a confirmar com o Caju]. O campo existe na política; até lá, a separação é feita pelo SGO+.
- **Valores do dono:**
  - fundo (só se mudar para fundo rotativo);
  - limite do Financeiro;
  - tetos por finalidade;
  - limite de gasto sem comprovante.

  Hoje estão vazios. Com o limite vazio, gasto sem comprovante não é aceito.
- **Texto do termo do portador e destino do não comprovado:** revisar com o RH e o contador. Desconto em folha está desligado e fixo no código.
- **Arquivamento no Caju.** A especificação 4.9 pede que arquivar no Caju exija antes recolher o saldo e fechar o período. Hoje a tela só avisa, em Portadores, ao desabilitar. A trava em `Cju_arquivarColaborador_` não foi feita.
- **Cartões de resumo da recarga na tela Conciliação Caju.** As divergências RCJ já aparecem lá.
- **Ligação manual de linha do extrato a gasto da recarga pela Conciliação Caju.** Hoje ela é feita pelo técnico ("Comprovar este gasto") ou pela regra.
- **Compras recusar arquivo já usado na recarga.** Compras tem fluxo próprio de duplicidade com motivo, que não foi alterado; quem recusa é a recarga.

## 6. Riscos e o que muda no primeiro dia

**Técnicos:**
- Quem tem cartão Caju vinculado passa a ver "Minha recarga Caju" no menu.
- Enquanto o Financeiro não habilitar, a tela diz que o cartão não está habilitado.
- Depois de habilitados, aceitam o termo, que é o texto padrão ainda não revisado pelo RH. **Recomendo revisar o texto antes de habilitar alguém.**
- Gasto em fim de semana ou feriado e gasto sem comprovante pedem justificativa. Sem comprovante, a política atual recusa.

**Wanessa:**
- Ganha a aba Painel financeiro > Recarga Caju. Habilita portadores, faz a carga, confere e registra os acertos.
- Não aprova: a recusa explica o motivo.
- Novas pendências na central: carregar, conferir e divergências.
- Depois do primeiro extrato importado com portadores habilitados, os gastos da rotina fora das viagens deixam de virar "fora do período" e passam a "Recarga: sem comprovante", com dono no portador.
- Linhas antigas do extrato de quem for habilitado podem mudar de tipo de divergência na primeira conciliação: a antiga fica "sanada" e nasce a da recarga. **Conferir na primeira importação.**

**Dono e Charles:**
- Recebem os pedidos para aprovar (Caixa de decisões e e-mail, sem valor no assunto) e a decisão de liberar a trava.
- O relatório semanal passa a ter a recarga na seção 7.
- O Charles precisa estar na lista de sigilo, com perfil ou área DIRETORIA, como já era exigido.

**Trava conjunta.** Quem tiver pendência da recarga há mais de 10 dias úteis fica travado também no depósito de viagem. Isso é novo para a viagem.

**Mudanças técnicas:**
- **Cache das tabelas do Caju:** a chave mudou para `CJU_ABAS_OK_V2`, para criar as colunas novas na primeira chamada depois de publicar. As tabelas `RCJ_*` são criadas na primeira chamada da recarga.
- **Rotina diária:** o passo `recargaCaju` em `Ges_rodada_` não faz nada enquanto não houver portador.
- **IA:** a leitura do comprovante da recarga usa a chave paga atual. Só a imagem vai ao serviço.

## 7. Suíte completa

Resultado em `suite.txt`:

| | Arquivos | Passam | Falham | Saída diferente de zero |
|---|---|---|---|---|
| Esta rodada | 265 | 2529 | 0 | 0 |
| Referência (bloco B) | 264 | 2517 | 0 | 0 |

A diferença são os 12 testes do arquivo novo `recarga-caju.test.cjs`. O teste ajustado de propósito (`financeiro-omie-20261114`, 22 abas) passa com 25 de 25.
