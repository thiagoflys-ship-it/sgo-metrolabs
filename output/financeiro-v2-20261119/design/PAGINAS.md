# Financeiro v2 — Arquitetura de navegação e páginas

**Data:** 19/11/2026 · Complementa `GUIA_VISUAL.md` (como desenhar) e `COMPONENTES.md` (com o quê). Conteúdo e regras: `../ESPECIFICACAO.md`.
**Protótipo:** `prototipo/index.html#<chave>` (ex.: `#pagar`, `#aprovacoes?papel=CHARLES`). **Capturas:** `capturas/1366-NN-*.png` e `capturas/390-NN-*.png`.

---

## 1. Decisões que valem para todas as páginas

- **Quem entra:** só dono (admin), Charles e Wanessa. Outra pessoa que chegar pelo endereço vê o estado "sem acesso" (captura `21-sem-acesso`).
- **Quem aprova:** só dono ou Charles. Toda saída de dinheiro passa por aprovação (pagamento, transferência, tarifa e débito automático). O limite sem aprovação existe como regra, com padrão **R$ 0,00**. Quem preparou não aprova o próprio item.
- **Empresa:** seletor fixo "Todas / Matriz / Filial / Prestadora".
  - A escolha fica no aparelho.
  - "Todas" consolida e tira transferências e mútuos do grupo.
  - Tela que grava nunca opera em "Todas": o formulário abre com a empresa e a cor dela.
- **Lote:** pagamentos aprovados saem às **09:00** do dia do vencimento, com limite diário por empresa. O que passa do limite volta para nova aprovação.
- **Conciliação:** modo **sugerir** nas duas primeiras semanas. Nada é baixado sem toque, nem com 100 pontos.
- **Guias:** pelo PDF do contador (sem SERPRO).
- **Bancos:** Sicredi, Sicoob, Itaú e Caju, cada conta com o selo **Ligado / Falta credencial / Sem API · arquivo OFX / Erro**.

## 2. Menu e rotas

O grupo "Financeiro" de hoje (`menu-secao-financeiro` no `Index.html`, um botão `omie` que abre 29 abas) vira três grupos. Chave `data-mod` sugerida para o `abrir(mod)`:

| Grupo | Página | `data-mod` | Ícone FA | Contador |
|---|---|---|---|---|
| Financeiro · dia a dia | Painel financeiro | `fin_painel` | `fa-chart-line` | — |
| | Aprovações | `fin_aprovacoes` | `fa-check-double` | itens aguardando quem vê (só dono/Charles) |
| | Contas a receber | `fin_receber` | `fa-hand-holding-dollar` | — |
| | Contas a pagar | `fin_pagar` | `fa-money-bill-transfer` | — |
| | Conciliação | `fin_conciliacao` | `fa-scale-balanced` | sugeridos + para conferir |
| | Cobrança (Pix e boleto) | `fin_cobranca` | `fa-barcode` | — |
| Financeiro · bancos e documentos | Bancos e saldos | `fin_bancos` | `fa-building-columns` | — |
| | Transferências | `fin_transferencias` | `fa-right-left` | — |
| | Notas fiscais | `fin_notas` | `fa-file-invoice` | — |
| | Fornecedores e clientes | `fin_cadastros` | `fa-address-book` | — |
| | Impostos e guias | `fin_impostos` | `fa-landmark` | — |
| | Caju | `fin_caju` | `fa-credit-card` | — |
| Financeiro · gestão | Orçamento | `fin_orcamento` | `fa-bullseye` | — |
| | Fechamento do mês | `fin_fechamento` | `fa-lock` | — |
| | Relatórios | `fin_relatorios` | `fa-file-lines` | — |
| | Empresas e bancos | `fin_empresas` | `fa-sliders` | — |
| | Trilha | `fin_trilha` | `fa-clock-rotate-left` | — |

**Compatibilidade:**
- O endereço antigo `omie` (e cada `OmieTela_abrir_('aba')`) passa a abrir a página nova equivalente.
- De-para das abas:

  | Aba antiga | Página nova |
  |---|---|
  | `resumo` | Painel |
  | `contas` | Receber ou Pagar |
  | `cliente` | Fornecedores e clientes |
  | `pedidos`, `produtos`, `servicos`, `notas` | Notas fiscais |
  | `lancamentos` | Pagar |
  | `pagamentos`, `regras` › aprovações | Aprovações |
  | `cobrancas`, `regua` | Cobrança |
  | `conciliacao` | Conciliação |
  | `fluxo`, `resultado`, `relatorios`, `indicadores` | Relatórios e Painel |
  | `orcamento`, `provisoes` | Orçamento |
  | `fixas`, `espelho` | Pagar (filtro de origem) |
  | `fechamento` | Fechamento |
  | `recarga` | Caju |
  | `especialista` | botão "Perguntar ao especialista" no Painel e em Relatórios |
  | `trilha`, `sigilo` | Trilha |
  | `comissoes`, `reajustes` | continuam com as telas atuais, sem mudança visual nesta fase |

- A busca rápida (Ctrl K) usa `data-busca` com os sinônimos de hoje.

**Celular:** barra de seções `cm-nav-mob` com nomes curtos: Painel, Aprovações, Receber, Pagar, Conciliação, Cobrança, Bancos, Transferir, Notas, Cadastros, Impostos, Caju, Orçamento, Fechamento, Relatórios, Empresas, Trilha.

**Arquivos sugeridos no legado:**
- Componentes: `JS_Financeiro_V2_Componentes.html` (de `fv-base.js` e `fv-graficos.js`).
- Páginas: um `JS_Financeiro_V2_<Pagina>.html` por página.
- Estilos: o bloco de `financeiro-v2.css` no primeiro deles.
- Servidor: as funções `Financeiro_api` seguem a "uma porta" do Comercial (`Comercial_api`).

---

## 3. Páginas

Notação: **Quem** = quem usa no dia a dia (D = dono, C = Charles, W = Wanessa). Estados comuns a todas:
- carregando: esqueleto;
- erro de leitura: "Nada foi gravado" + Tentar de novo + "ver a fotografia das 06:30";
- sem permissão: `21-sem-acesso`.

Só os estados próprios de cada página estão listados.

### 3.1 Painel financeiro (`#painel`) — capturas 01, 02, 24
- **Objetivo:** em 10 segundos, saber quanto há em caixa, o que vence, o que precisa de decisão e onde está o risco.
- **Quem:** D e C (aba "Visão da diretoria", padrão para eles); W (aba "Meu dia", padrão para ela). As duas abas ficam abertas a todos.
- **Blocos da Visão da diretoria:**
  1. Faixa de riscos: conta sem extrato há mais de 2 dias úteis, guia não chegou, certificado vencendo, envio a conferir, fotografia diária que rodou ou não.
  2. **Caixa disponível agora:**
     - número principal;
     - aplicações à parte;
     - quantas contas têm API;
     - barra por empresa;
     - lista de contas com selo e origem do saldo.
  3. **Aprovações pendentes:** valor total, quantidade, o mais antigo, divisão por tipo e o botão "Revisar e aprovar".
  4. Quatro cartões:
     - A receber (hoje / 7 dias / mês);
     - A pagar (hoje / 7 dias / mês);
     - Vencido a receber;
     - Vencido a pagar ("deveria ser zero").
  5. **Previsão de caixa** 30/60/90 (linha com faixa, dia de menor saldo, alerta se negativo) e **Resultado por mês** (recebido × pago, 6 meses).
  6. A receber por idade (aging), Inadimplência (maiores devedores, realização, atraso médio, prazo médio), Concentração (5 maiores clientes, maiores fornecedores).
  7. Despesas por categoria (mês × média de 12 meses, alerta acima de 30 %) e Orçamento × realizado por grupo.
  8. DRE resumida de 6 meses.
- **Blocos de Meu dia (Wanessa):**
  - saudação com o resumo do dia;
  - 4 cartões: conciliação pendente, pago e não baixado, fornecedores sem dados, fechamento X de 12;
  - **Fazer hoje**: lista em ordem de prioridade, cada item com valor e atalho;
  - Conciliação por conta;
  - **Semana**: 5 dias úteis com receber, pagar e saldo no fim do dia;
  - Cobrança de hoje (promessas, quebradas, sem contato);
  - Pendências que travam o fechamento.
- **Ações:** Atualizar agora, Relatório A4, cada cartão abre a lista de origem, alternar 30/60/90.
- **Estados:**
  - fotografia do dia não rodou: faixa vermelha no topo, "Os números são de ontem às 06:30; a rotina de hoje falhou às 06:31 (ver Trilha)";
  - empresa sem dado (Prestadora sem Omie): cartões com "—" e o estado "sem credencial" no lugar do gráfico.
- **Celular:**
  - Aprovações aparece **antes** do caixa (dono e Charles aprovam pelo celular);
  - a faixa de riscos mostra 2 avisos e "mais 3 avisos";
  - os trios viram três linhas;
  - a DRE rola dentro da caixa.

### 3.2 Aprovações (`#aprovacoes`) — capturas 03, 04, 22
- **Objetivo:** decidir toda saída de dinheiro com o que é preciso à vista: anexo, dado de pagamento conferido, quem enviou e onde está no fluxo.
- **Quem:** D e C aprovam. W vê a fila, sem os botões de aprovar, com a trava explicando e o botão "Retirar da fila".
- **Blocos:**
  - faixa da regra em vigor (limite R$ 0,00, lote 09:00);
  - abas por tipo (Todos, Pagamentos, Tarifas e débitos, Transferências, Dados bancários);
  - lista de **cartões de operação** (`fv-card-op`): título, empresa, tipo, descrição, valor, vencimento, forma e conferência, anexo e linha do tempo (Lançado → Dados conferidos → Aprovação → Lote 09:00 → Pago e baixado).
- **Ações:**
  - caixa de seleção por cartão; "Aprovar selecionados" abre a **janela de confirmação** (resumo por conta pagadora, limite do dia, digitar o total acima de R$ 50 mil);
  - por item: Aprovar, Recusar (motivo obrigatório), Pedir ajuste;
  - tarifas do dia: "Aprovar todas as tarifas do dia".
- **Estados próprios:**
  - troca de dados bancários de terceiro: cartão com borda vermelha e trava "ligue no telefone do cadastro";
  - item que já passou do limite do dia: selo laranja "volta para nova aprovação";
  - fila vazia: "Nada aguardando você. O próximo lote sai amanhã às 09:00 com X itens já aprovados."
- **Celular:** cartões em coluna; Aprovar e Recusar lado a lado; a janela de confirmação ocupa a tela com os botões empilhados.

### 3.3 Contas a receber (`#receber`) — captura 05
- **Objetivo:** acompanhar o que os clientes devem às três empresas e a cobrança de cada título no banco.
- **Quem:** W (diário); D e C (consulta).
- **Blocos:**
  - 4 cartões: em aberto, vencido, recebido no mês com % baixado sozinho, cobrança com problema;
  - abas: Em aberto, Vencidos, Recebidos, Todos;
  - **tabela** com Empresa, Cliente e documento, Vencimento e dias de atraso, Valor, Saldo, Forma, Cobrança, Situação;
  - filtro por coluna, agrupar por cliente, empresa ou situação, totais e CSV.
- **Ações:**
  - Nova conta a receber;
  - Emitir boletos;
  - por linha: 2ª via, Baixar (prévia com juros, multa e desconto), Ver;
  - em lote: enviar 2ª via por e-mail, emitir boleto.
- **Estados:** sem títulos no filtro: estado vazio com "limpe os filtros ou escolha outra empresa".
- **Celular:** cartão compacto (cliente, saldo grande, empresa, vencimento, forma, selos, 2ª via e Baixar).

### 3.4 Contas a pagar (`#pagar`) — capturas 06, 23
- **Objetivo:** levar cada obrigação do lançamento ao comprovante sem sair do SGO+.
- **Quem:** W (lança, confere e envia); D e C (consulta).
- **Blocos:**
  - faixa do **próximo lote** (quantidade, total, % do limite diário);
  - 4 cartões: vence hoje, aguardando aprovação, vencido (deveria ser zero), sem dados de pagamento;
  - abas: A pagar, Aguardando aprovação, Aprovados (lote 09:00), Pagos, Recusados pelo banco;
  - tabela com Empresa, Fornecedor e categoria, Vencimento, Valor, Forma, **Dados de pagamento** (Chave conferida / Linha digitável conferida / Sem dados), Situação e Anexo.
- **Ações:**
  - **Nova conta a pagar** (janela com a faixa da empresa, área "solte o boleto ou a nota em PDF" lida pela IA, conferência da chave Pix com o titular);
  - Ler boleto ou nota (PDF);
  - por linha: Enviar para aprovação, Ver;
  - em lote: Enviar para aprovação, Mudar conta pagadora.
- **Estados próprios:**
  - recusado pelo banco: linha com o motivo do banco e "volta para A pagar";
  - "a conferir": nunca reenviar; atalho para a Trilha.
- **Celular:** cartão compacto; a barra de lote fica fixa embaixo.

### 3.5 Conciliação (`#conciliacao`) — captura 07
- **Objetivo:** casar cada movimento do extrato com o título do Omie, com o motivo à vista, e baixar com um toque.
- **Quem:** W (diário, meta zero); D e C (desfazer).
- **Blocos:**
  - faixa do **modo sugerir** (data de fim, acerto medido);
  - 4 cartões: certeza (100 pontos), sugeridos, para conferir, conciliados hoje;
  - filtros por conta e por nível;
  - **painel lado a lado** por movimento: à esquerda o extrato (valor, descrição, CPF/CNPJ, hora, empresa); no meio o nível e os pontos; à direita os candidatos, cada um com os critérios que bateram (✓) e os que divergem (⚠, ex.: "juros e multa de R$ 75,40").
- **Ações:**
  - Confirmar / Confirmar com juros;
  - Escolher o outro;
  - Não é este;
  - sem candidato: Lançar título novo (pré-preenchido), Recebimento avulso, Devolver o Pix, É transferência;
  - Importar OFX ou CSV (contas sem API);
  - "Confirmar todos os sugeridos" com prévia.
- **Estados próprios:**
  - conta sem extrato há mais de 2 dias: faixa vermelha no topo da conta;
  - conta sem API: selo "OFX" e a área de soltar arquivo.
- **Celular:** o painel empilha (extrato, faixa de pontos na horizontal, candidato, botões).

### 3.6 Cobrança (Pix e boleto) (`#cobranca`) — captura 08
- **Objetivo:** emitir a cobrança no banco de cada empresa e cobrar quem atrasou.
- **Quem:** W.
- **Blocos:**
  - 4 cartões: emitidas no mês, pagas hoje, a emitir, recusadas;
  - régua de cobrança em três caixas: promessas de hoje, promessas quebradas, sem contato há 7 dias;
  - tabela de cobranças com a situação no banco e o motivo da recusa.
- **Ações:**
  - Emitir boleto (híbrido, com Pix);
  - Pix com vencimento;
  - por linha: Emitir, Corrigir e reenviar, 2ª via, Prorrogar.
- **Estados próprios:** conta sem cobrança por API (Itaú sem credencial): "Emitir pelo Omie" ou "cobrança manual", com o motivo.
- **Celular:** cartão compacto; régua em coluna.

### 3.7 Bancos e saldos (`#bancos`) — captura 09
- **Objetivo:** ver o saldo e o extrato de cada conta, por empresa, e saber de onde veio cada número.
- **Quem:** D, C, W.
- **Blocos:** uma caixa por empresa (nome, CNPJ, total) com um cartão por conta:
  - banco, agência e conta, saldo e origem;
  - selo do conector e mini linha de 30 dias;
  - capacidades (saldo, extrato, Pix, boleto, pagar);
  - sem credencial: o estado com o **nome** das chaves que faltam;
  - aplicação separada do caixa.
  
  Abaixo, o extrato da conta escolhida, com a coluna de conciliação.
- **Ações:** Ler saldos agora, Importar OFX ou CSV, "O que pedir ao banco" (abre o trecho de `CREDENCIAIS_PARA_O_DONO.md`).
- **Celular:** um cartão por conta em coluna.

### 3.8 Transferências (`#transferencias`) — captura 10
- **Objetivo:** mover dinheiro entre contas e entre empresas com o registro certo nos dois lados.
- **Quem:** W prepara; D e C aprovam (todas, inclusive na mesma empresa, enquanto o limite for R$ 0,00).
- **Blocos:**
  - formulário: faixa da empresa de origem, conta de origem com saldo, destino, valor, data, motivo;
  - **prévia** com o caso (mesma empresa ou mútuo), o que vai ao banco, a aprovação e o saldo depois;
  - tabela "como cada caso é registrado";
  - últimas transferências com linha do tempo (Pedido → Aprovação → Banco → Omie → Conciliado).
- **Ações:** Enviar para aprovação; Já transferi no banco (só registrar).
- **Estados próprios:** saldo da origem insuficiente: trava "O que houve / Por quê / O que fazer" antes de enviar.
- **Celular:** formulário em uma coluna; prévia logo abaixo do botão.

### 3.9 Notas fiscais (`#notas`) — captura 11
- **Objetivo:** NF-e e NFS-e de saída e entrada sem abrir o Omie, ligadas ao título.
- **Quem:** W.
- **Blocos:**
  - 4 cartões: emitidas, recebidas, sem título (trava o fechamento), não enviadas ao cliente;
  - abas por tipo;
  - tabela com Situação, **Título** (com ou sem) e Envio.
- **Ações:**
  - Faturar pedido aprovado;
  - Importar XML de compra;
  - por linha: PDF, XML, Enviar (PDF, XML e boleto num e-mail só), Cancelar (motivo obrigatório; prazo legal mostrado).
- **Celular:** cartão compacto com PDF, XML e Enviar lado a lado.

### 3.10 Fornecedores e clientes (`#cadastros`) — captura 12
- **Objetivo:** cadastro completo com dados de pagamento, para o pagamento sair pelo banco.
- **Quem:** W; D e C aprovam a troca de dados bancários.
- **Blocos:**
  - 4 cartões: cadastros, sem dados de pagamento, completados na semana, trocas aguardando;
  - **Mutirão**: fornecedores sem dados, ordenados pelo valor pago em 90 dias;
  - tabela com Pix, conta e pago em 90 dias.
- **Ações:**
  - Novo cadastro pelo CNPJ (busca na Receita);
  - Abrir ficha (endereço, contato, Pix conferido no banco, conta, titular, forma e categoria padrão, etiquetas);
  - Completar.
- **Estados próprios:** titular diferente do fornecedor: trava e aprovação obrigatória.
- **Celular:** cartão compacto; a ficha abre em janela de tela cheia.

### 3.11 Impostos e guias (`#impostos`) — captura 13
- **Objetivo:** não perder guia: calendário por empresa, conferência do PDF do contador e pagamento aprovado.
- **Quem:** W; D e C aprovam.
- **Blocos:**
  - faixa "guias pelo PDF do contador";
  - 4 cartões: vencem em 5 dias, falta guia, retenções sofridas, pagas na competência;
  - tabela das guias (empresa, tributo, competência, vencimento, valor, situação e alerta);
  - **conferência da guia lida**: tributo, CNPJ com selo "confere com a Prestadora", competência, vencimento, valor com a variação sobre a média de 3 meses, código de barras.
- **Ações:** Anexar guia (PDF), Calendário fiscal, Lançar e enviar para aprovação, Corrigir campos.
- **Estados próprios:**
  - CNPJ da guia diferente da empresa: trava e lançamento bloqueado;
  - variação acima de 30 %: aviso laranja.
- **Celular:** a conferência aparece antes da tabela.

### 3.12 Caju (`#caju`) — captura 14
- **Objetivo:** recargas aprovadas e pagas sem sair do SGO+, e a conferência dos gastos pelo arquivo do portal.
- **Quem:** W; D e C aprovam.
- **Blocos:**
  - 4 cartões: conector, recargas no mês, aguardando aprovação, gastos sem comprovante;
  - pedidos com linha do tempo (Pedido → Aprovação → Pix pago → Crédito → Omie).
- **Ações:** Nova recarga, Importar CSV do portal.
- **Estados próprios:** conector sem chave: "Falta credencial do Caju"; a recarga continua pelo fluxo de hoje.
- **Celular:** cartões em coluna.

### 3.13 Orçamento (`#orcamento`) — captura 15
- **Objetivo:** comparar o realizado com o orçado por grupo e mês, por empresa.
- **Quem:** D e C (decidem); W (comenta desvios).
- **Blocos:**
  - 4 cartões: receita no ano, despesa no ano, grupos acima do orçado, comentários;
  - orçado × realizado do mês por grupo;
  - gráfico mês a mês;
  - tabela grupo × mês com desvios em vermelho.
- **Ações:** Editar orçamento do ano seguinte, Relatório A4, comentar o desvio.
- **Celular:** a tabela grupo × mês rola dentro da caixa, com a primeira coluna fixa.

### 3.14 Fechamento do mês (`#fechamento`) — captura 16
- **Objetivo:** fechar o mês de cada empresa só quando os 12 itens estiverem conferidos.
- **Quem:** W deixa pronto; D ou C fecham.
- **Blocos:**
  - uma caixa por empresa com barra de progresso, selo "X de 12" ou "pronto para fechar";
  - checklist com situação (✓, !, cadeado), motivo e o atalho "resolver".
- **Ações:** Fechar (D/C, desligado até 12 de 12, com a trava explicando); trocar o mês.
- **Estados próprios:** mês fechado: selo "fechado em dd/mm por Fulano"; lançamento com data anterior bloqueado com o motivo.
- **Celular:** uma empresa por vez, em coluna.

### 3.15 Relatórios (`#relatorios`) — captura 17
- **Objetivo:** DRE gerencial, fluxo realizado × previsto, aging, por empresa, por centro de custo, extrato por conta e pagamentos feitos pelo SGO+.
- **Quem:** D e C; o contador recebe o PDF.
- **Blocos:**
  - abas por relatório;
  - faixa sobre a categoria Tarifas bancárias revista;
  - DRE com % da receita;
  - resultado por empresa (mútuos fora);
  - fluxo previsto × realizado.
- **Ações:** PDF A4 justificado, CSV, filtros de empresa e período.
- **Estados próprios:** centro de custo sem classificação: "0 % dos títulos têm centro de custo; o relatório começa a encher a partir dos lançamentos novos."
- **Celular:** a DRE em duas colunas (linha e valor), % abaixo.

### 3.16 Empresas e bancos (`#empresas`) — captura 18
- **Objetivo:** configurar as três empresas, as contas, as integrações e as regras do Financeiro.
- **Quem:** D (altera); C e W (consultam, com a trava explicando).
- **Blocos:**
  - cartão por empresa: CNPJ, cidade, regime, modo Omie (próprio ou compartilhado) com selo, cor fixa;
  - **Integrações por conta**: situação, o que falta gravar (nome da chave), vencimento do certificado (laranja a 30 dias);
  - **Regras do Financeiro**: limite sem aprovação R$ 0,00, lote 09:00, limite diário por empresa, conciliação automática em modo sugerir até 03/12, transferência entre empresas sempre aprovada, débito acima de R$ 500 nunca vira tarifa sozinho;
  - **Chaves de emergência**: gravação no Omie, pagamento pelo banco.
- **Ações:** Testar (por conta e todas), Como obter, Editar empresa (motivo de 15 letras ou mais), Mudar regras, **Desligar pagamentos agora**.
- **Celular:** cartões em coluna; a tabela vira cartão compacto.

### 3.17 Trilha (`#trilha`) — captura 19
- **Objetivo:** ver tudo o que o SGO+ gravou no Omie e no banco, e resolver os envios sem resposta.
- **Quem:** D e C (estorno só por aqui); W (consulta).
- **Blocos:**
  - **Envios a conferir** no topo (nunca reenviar sozinho; consultar pelo código);
  - tabela com quando, quem, empresa, onde, operação, resultado e código.
- **Ações:** Consultar no banco, Antes e depois, Acessos ao Financeiro, CSV.
- **Celular:** cartão compacto com a operação como título.

### 3.18 Páginas só do protótipo
- `#componentes` (captura 20): todos os componentes e os cinco estados.
- `#sem-acesso` (captura 21): quem não é dono, Charles ou Wanessa.

## 4. Índice das capturas

| Nº | Tela | 1366 | 390 |
|---|---|---|---|
| 01 | Painel · diretoria (dono) | `capturas/1366-01-painel-diretoria.png` | `capturas/390-01-painel-diretoria.png` |
| 02 | Painel · meu dia (Wanessa) | `1366-02-painel-meu-dia.png` | `390-02-…` |
| 03 / 04 | Aprovações (Charles / Wanessa) | `1366-03…`, `1366-04…` | `390-03…`, `390-04…` |
| 05 a 19 | Uma por página, na ordem da seção 3 | `1366-05…` a `1366-19…` | `390-05…` a `390-19…` |
| 20 / 21 | Componentes e estados / Sem acesso | | |
| 22 / 23 | Janelas: confirmar aprovação / nova conta a pagar | | |
| 24 | Painel só da Matriz (seletor de empresa) | | |

`capturas/relato.json` registra, para cada captura, se houve erro de script e se apareceu rolagem lateral. Resultado da última rodada: 48 capturas, 0 erros, 0 rolagem lateral. Para gerar de novo: `node output/financeiro-v2-20261119/design/capturas/capturas.cjs`.
