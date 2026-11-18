# Portal do cliente — Etapa 5 (e), Indicadores: relatório de implementação

**Data:** 18/11/2026. **Onde:** `output/financeiro-20261116/cand18` (cópia idêntica à produção cand17, conferida por comparação de pastas antes de começar). O trabalho também mexeu em `tests/` e `docs/`.
**Restrições respeitadas:** nada foi publicado nem commitado. Não houve acesso à produção, ao servidor nem ao banco. Nenhum e-mail real saiu (MailApp simulado). Ficaram intocados o Financeiro e o sigilo, o bloqueio da Frota e o rastreador, o chat do RH360, os documentos PGT/POP gerados e o cofre. Nenhum dado real foi inventado: nomes, e-mails, chamados e documentos dos testes e das capturas são fictícios. O servidor Node não mudou: a tela do cliente continua chamando só `PortalCliente_api`, que já está em `PCL_FUNCOES_CLIENTE` (o teste confere). Por isso `PCL_FUNCOES_CLIENTE` não precisou de função nova.
**Especificação:** `ESPEC_PORTAL_CLIENTE.md`, "Etapa 5 (e)", itens 4.1.8, 4.2.4, 4.6 e T5.1 a T5.5. O dono aceitou todas as recomendações.

## 1. O que foi feito

### 1.1 Indicadores (conta de cliente; item 4.1.8)

- **Tela nova "Indicadores"** no menu "Portal do cliente" (também no menu do celular).
  - Quem vê: Gestor do cliente (todas as unidades) e Solicitante (só as unidades dele).
  - A Consulta não tem o botão. Se chamar a ação direto, recebe a recusa com o papel, o porquê e o caminho, e fica `PAPEL_RECUSADO` no registro.
  - Acesso suspenso ou sem contrato: nada é lido (`ACESSO_RECUSADO`).
- **Filtros:** período de 30, 90 (padrão), 180 ou 365 dias e a unidade (com os textos `pclIndPeriodo` e `pclIndUnidade` da espec). Unidade de outro cliente ou fora do acesso recebe "Não encontrado. Atualize a lista." e fica `ESCOPO_RECUSADO`.
- **Oito índices**, cada um com "Como é contado" embaixo, em linguagem simples. Sem base para a conta, o índice mostra "—" e o motivo (nunca NaN nem Infinity):
  1. chamados abertos agora (etapas 1 a 7), com o gráfico por etapa;
  2. concluídos no período (etapa 8; conclusão = `ATENDIDO_EM` ou `ENCERRADO_EM`);
  3. tempo médio até a visita (abertura do pedido, ou do chamado sem pedido, até a primeira `CHEGOU_EM` das O.S. do chamado);
  4. tempo médio até a conclusão (o mesmo de `AstP_painelCliente_`);
  5. % dentro do prazo do contrato (estado "cumprido" de `Ast_slaEstado_` ÷ concluídos com `SLA_FONTE = CONTRATO`);
  6. equipamentos em dia, por categoria (o motor de "Meus equipamentos", `PCl_vencimentos_`/`PClD_farois_`);
  7. vencimentos em 30 e 60 dias, por categoria, com os vencidos à parte;
  8. reincidência (outro chamado do mesmo equipamento nos 30 dias anteriores ÷ concluídos).
- **Horas úteis:** `Ast_minUteisEntre_` da Assistência (nenhuma conta nova). Números em pt-BR com 1 casa ("6,3 h úteis", "66,7%").
- **Sem valores financeiros** e sem dado interno (o teste percorre o JSON: sem prioridade, técnico, valor, SLA cru, IP ou navegador).
- **Botões:** "Relatório do período (PDF)", "Ver no Kanban e no Gantt" (abre a tela Chamados, onde o Kanban e o Gantt de `JS_PainelAtendimento.html` continuam), "Atualizar agora" e a lista "Relatórios do período já gerados" (só os que a pessoa pode abrir).

### 1.2 Relatório do período filtrado por unidade (T5.3)

- `RepDC_relatorioPeriodo_` lê o escopo da pessoa: o Solicitante recebe só as unidades dele; `unidadeId` limita a uma unidade do cliente que esteja no acesso (senão, "Não encontrado"). Vale pelos dois caminhos: Indicadores e "Meus chamados".
- `RepD_visaoPeriodo_` (versão do cliente) passa o filtro a `AstP_painelCliente_` (que já aceitava `okUn`) e diz as unidades no subtítulo do A4.
- O registro em `REP_DOCUMENTOS` guarda as unidades na coluna nova `UNIDADES_JSON` (garantida por acréscimo antes do primeiro relatório filtrado) e, com uma só, em `UNIDADE_ID`.
- **Trava de arquivo:** `PCl_docRepNaUnidade_` deixa abrir o relatório filtrado só para quem tem todas as unidades dele; o de todas as unidades, só para quem vê todas. "Relatórios gerados" de "Meus chamados" passa a mostrar ao Solicitante o relatório do período dele.
- A recusa antiga da etapa 1 ("o relatório filtrado chega numa próxima etapa") saiu; a nota de "Meus chamados" para a Consulta foi reescrita.

### 1.3 Uso do portal (equipe; itens 4.2.4 e 4.6)

- **Caixa nova `PORTAL_CLIENTE_USO_VER`** («Ver o uso do portal e o registro de acessos»), grupo "Portal do cliente", padrão Administrador, Diretoria e gestores. Aba "Uso do portal" na tela Portal do cliente e botão próprio no menu.
- **Por cliente** (período 30/90/180/365): contas ativas e por papel, convites pendentes e vencidos, última entrada, entradas em 30 dias, pedidos pelo portal ÷ todos os pedidos, documentos abertos, tempo médio de aceite do pedido (horas úteis menos a pausa do complemento), avisos enviados e com falha, contas com e-mail inválido, contas sem entrada há N dias (N = aviso de inatividade das Regras, padrão 90) e tentativas fora do acesso. "Como cada número é contado" embaixo da tabela.
- **Pessoas e avisos de um cliente:** cada pessoa com papel, unidades, situação, última entrada, dias parada, entradas, documentos abertos e e-mail inválido; a **lista dos avisos enviados** (`PCL_AVISOS_ENVIOS`, pendência deixada pela etapa 4) e as falhas de envio com o motivo.
- **Linha do tempo por pessoa** (`PCL_ACESSOS`, 500 mais recentes) com IP e navegador, só para a equipe.
- **Exportação para planilha** (CSV com ponto e vírgula, BOM, proteção contra fórmula): todos os clientes, pessoas, avisos e linha do tempo.

### 1.4 Desempenho

- Cada resposta lê cada tabela uma vez (memória da chamada) e guarda o resultado 2 minutos no cache do script (chave com cliente, unidades, filtro, período e dia; "Atualizar agora" passa por cima). As travas de papel, situação e escopo rodam sempre, mesmo com cache.
- **Medido no ensaio local** com um cliente de 4.000 chamados, 3.000 pedidos, 1.500 equipamentos e 20.000 registros de acesso:
  - indicadores: cerca de 1,1 a 1,3 s na primeira vez, cerca de 1 ms do cache;
  - uso do portal de todos os clientes: 0,3 a 0,6 s.
- Quase todo o tempo dos indicadores é a conta das horas úteis por chamado (`Ast_minUteisEntre_`, cerca de 0,2 ms cada). Um cliente real tem bem menos chamados por período.

### 1.5 Ajuda e manual

- `PCL_DICAS` (`pclIndPeriodo`, `pclIndUnidade`, `pclUsoPeriodo`, `pclUsoBusca`) e guias `indicadores` e `uso`.
- Ajuda das telas `portal_cliente_indicadores` (texto do cliente, sem recurso administrativo; o teste confere) e `portal_cliente_uso`; nomes em `SGO_Ajuda.js`; `JS_PortalCliente_Painel` no mapa de erros do assistente.
- Ajuda de "Meus chamados" (`SGO_Ajuda_Assistencia.js`): o relatório do período do Solicitante sai filtrado.
- Manual `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`: seção 27 (27.1 a 27.5), linha nova em "Quem pode" e em "Tabelas". `docs/MANUAL_MODULO_REPRESENTACAO.md` 12.2: o escopo do relatório do cliente. Cópias anteriores em `etapa5/antes/`.
- Base do assistente regerada (`_tools/gerar_base_assistente.cjs --docs docs --saida .../cand18/SGO_AssistenteManuais.js`); só as seções do Portal (e o trecho 12.2 da Representação) mudaram.

## 2. Lista exata de arquivos (relativos à cand18)

**Legado, novos (LF):** `SGO_PortalCliente_Painel.js`, `JS_PortalCliente_Painel.html`.

**Legado, alterados** (fins de linha conferidos byte a byte; sintaxe conferida):
- `SGO_PortalCliente.js` (LF): ações `indicadores`, `relatorioPeriodo`, `uso`, `usoPessoa`; `usoVer` no `iniciar`; mensagem da caixa.
- `SGO_PortalCliente_Config.js` (LF): caixa `PORTAL_CLIENTE_USO_VER`.
- `SGO_PortalCliente_Acessos.js` (LF): trava de "Meus chamados" (relatório do Solicitante liberado e filtrado; "Relatórios gerados"; `podeRelatorioPeriodo`).
- `SGO_PortalCliente_Seguranca.js` (**CRLF preservado**, 285 → 292 linhas, todas CRLF): `PCl_docRepNaUnidade_` na trava de arquivo.
- `SGO_Representacao_Documentos.js` (LF): filtro por unidades no relatório do período do cliente, `UNIDADES_JSON`, `RepD_garantirColunaUnidades_`.
- `Index.html`, `JS_Core.html`, `JS_PortalCliente.html`, `JS_PortalCliente_Acessos.html`, `JS_PortalCliente_Ajuda.html`, `JS_Assistencia.html` (LF).
- `SGO_Ajuda.js`, `SGO_Ajuda_PortalCliente.js`, `SGO_Ajuda_Assistencia.js`, `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (regerado) (LF).

**Testes:**
- `tests/portal-cliente-etapa5-20261118.test.cjs` (novo, 8 testes).
- `tests/portal-cliente-etapa1-20261118.test.cjs`: **uma linha alterada**. Ela afirmava a recusa antiga ("unidades específicas") que a própria etapa 1 anunciava como provisória; agora afirma que a recusa não acontece. A prova do relatório filtrado está no teste da etapa 5. A cópia anterior está em `etapa5/antes/`.

**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`, `docs/MANUAL_MODULO_REPRESENTACAO.md`.

**Entregas (`output/portal-cliente-20261116/etapa5/`):** `RELATORIO.md`, `legado-etapa5.patch` (diff cand17 → cand18, 18 arquivos), `suite.txt`, `suite-execucao.log`, `capturas.cjs`, `capturas/` (24 imagens e `conferencia.txt`), `capturas-suite/`, `antes/`.

## 3. Decisões adotadas e o que ficou configurável

| Assunto | Adotado | Onde mudar |
|---|---|---|
| Quem vê os indicadores | Gestor do cliente e Solicitante (espec); Consulta não | `PCL_PAPEIS[...].indicadores` |
| "Equipamento em dia" | Validade não vencida; quem vence em até 30 dias conta como em dia (a tabela mostra quantos) | código (`PCl_indicadoresCalc_`) |
| Universo dos tempos, prazo e reincidência | Concluídos no período (texto `pclIndPeriodo` da espec) | código |
| Início do tempo até a visita | Envio do pedido; sem pedido, abertura do chamado. Fim: primeira chegada entre as O.S. do chamado | código |
| Janela da reincidência | 30 dias (espec). A Representação continua com 90 dias para os relatórios dela | `PCLP_REINCIDENCIA_DIAS` |
| O que conta como pedido no uso | Portal, telefone, e-mail, QR, presencial, WhatsApp e tela interna; fora: preventiva do contrato, Comercial, ronda, representada. Chamado cancelado conta | `PCLP_CANAIS_PEDIDO` |
| Limite de "sem entrada" | O aviso de inatividade das Regras do portal (padrão 90) | Regras do portal |
| Cache | 2 minutos, com "Atualizar agora" | `PCLP_CACHE_SEG` |
| Kanban e Gantt | Continuam na tela Chamados; o Indicadores tem o atalho | — |
| Fórmula no "i" (4.1.8) | Substituída pelo texto sempre visível embaixo de cada índice (regra da tarefa) | — |

## 4. O que ficou de fora, e por quê

- **"Avisos que voltaram (e-mail inválido)" no sentido de devolução pelo provedor (bounce):** **depende de dado real que não existe.** Nenhuma parte do sistema recebe hoje a devolução que o provedor do cliente manda depois. A fila de e-mail do servidor (`emails_saida.erro`, no PostgreSQL) guarda a recusa do envio, mas o legado não lê essa tabela. A tela mostra o que existe e diz isso em texto:
  - a falha de envio registrada em `NTF_ENVIOS` (origem `PORTAL_CLIENTE`, `ERRO`);
  - a fila do horário comercial com erro;
  - as contas com e-mail em formato inválido.
  Para completar, seria preciso ler a caixa de devoluções ou expor `emails_saida` ao legado.
- **Registro em `PCL_ACESSOS` de cada abertura dos indicadores:** não foi feito, para não encher o registro. A geração do PDF fica registrada (`RELATORIO_PERIODO`).
- **Registro da planilha baixada:** a planilha é montada na tela, a partir do que a equipe já vê. Não há registro no servidor, como o Financeiro faz por sigilo; aqui não há dado do Financeiro.

## 5. Riscos a conferir antes de publicar

1. **Relatório do período para o Solicitante passa a sair**, pelo Indicadores e por "Meus chamados", filtrado. Conferir um A4 real de um Solicitante com duas unidades.
2. **Coluna `UNIDADES_JSON` em `REP_DOCUMENTOS`** nasce no primeiro relatório filtrado (`CertCal_garantirColuna_`). Conferir no banco real que a coluna é criada e gravada.
3. **Cache de 2 minutos:** os números podem atrasar até 2 minutos depois de um atendimento (o botão "Atualizar agora" resolve). A chave inclui as unidades da pessoa, então nenhum número passa de um escopo para outro.
4. **Desempenho com dado real:** medir no servidor a primeira abertura dos indicadores do maior cliente e o "Uso do portal" (lê `NTF_ENVIOS` inteira, que cresce com todos os avisos do sistema).
5. **"Última entrada" e "sem entrada"** usam `CLIENTE_ULTIMA_ENTRADA_EM`, o registro de logins e as entradas de `PCL_ACESSOS`. Contas antigas sem nenhuma dessas datas e sem `CRIADO_EM` não entram em "sem entrada".
6. **Conferir no uso real:** a tela no celular de um cliente; a abertura do PDF pela rota `/arquivos` (nas capturas não há servidor de arquivos); a planilha aberta no Excel.

## 6. Testes e placar

**Teste novo** `tests/portal-cliente-etapa5-20261118.test.cjs` (8 testes, todos aprovados, código de saída 0):
- **T5.1:** cada índice confere com a conta à mão num conjunto fixo (comentado no teste): visita 6,3 h úteis, conclusão 10,7 h úteis, prazo 50,0% (1 de 2), reincidência 33,3%, equipamentos em dia por categoria, vencimentos em 30/60 dias, abertos por etapa; outro cliente nunca entra; períodos 30/365 e período inválido.
- **T5.1, divisão por zero:** a Filial sem visita e sem prazo de contrato, e um cliente sem nenhum dado. Cada "—" tem motivo, sem NaN, Infinity ou undefined.
- **T5.2:** o Solicitante vê só a unidade dele (todos os números mudam); outra unidade ou outro cliente dão "não encontrado" e `ESCOPO_RECUSADO`; a Consulta é recusada (indicadores, PDF e "Meus chamados"); acesso suspenso não lê.
- **T5.3:** o PDF do Solicitante só tem os chamados da unidade dele; o Gestor tem todos ou a unidade escolhida; `UNIDADES_JSON` gravado; a trava de arquivo segue o filtro (Solicitante não abre o de todas nem o da Filial; o Gestor abre todos; outro cliente nunca); a lista de relatórios da pessoa; "Meus chamados" filtrado e "Relatórios gerados".
- **T5.4:** uso do portal com as contas à mão (entradas em 30 dias, convites pendentes e vencidos, documentos abertos, pedidos 2 de 6 = 33,3%, aceite 1,0 h útil, avisos e falha, e-mail inválido, conta parada, fora do acesso); detalhe do cliente; linha do tempo com IP; caixa (técnico recusado com o caminho, conta de cliente recusada, `iniciar.usoVer`); cache e "Atualizar agora".
- **T5.5:** o Gestor do cliente não recebe IP nem navegador ("Minha equipe", indicadores, relatório); a equipe recebe.
- **Portão de funções, desempenho e cache** (cliente grande) e **tela, ajuda e manual**.

**Antes da suíte:** lista dirigida de 52 arquivos (Portal etapas 0 a 5, Representação, Assistência, assistente, navegação, acessos, poderes, ajuda e manuais): 0 falhas.

**Capturas reais** (Index.html com os includes da cand18 e o servidor simulado) a 1366, 390 e 320 px, em `etapa5/capturas/`:
- Indicadores do Gestor, da Filial e com o relatório do período gerado;
- Indicadores do Solicitante;
- a recusa da Consulta (o botão do menu não aparece para ela; aparece para Gestor e Solicitante, e o roteiro confere);
- Uso do portal: lista, pessoas e avisos de um cliente, linha do tempo de uma pessoa.

Resultado: **sem rolagem lateral e sem erro de JavaScript** (`capturas/conferencia.txt`).

**Suíte completa** (`etapa5/suite.txt`):

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência (etapa 4, produção cand17) | 259 | 2485 | 0 |
| **Rodada final (cand18)** | **260** | **2493** | **0** |

Nenhum arquivo terminou com código de saída diferente de zero (`arquivos_com_saida_nao_zero=0`; o log termina com `saida=0`). A diferença em relação à referência é o teste novo: 1 arquivo e 8 testes a mais. A linha alterada no teste da etapa 1 continua aprovada. A suíte rodou numa única rodada, sem falha de tempo.
