# Portal do cliente — Etapa 2 (b), Abertura de chamado e acompanhamento: relatório de implementação

**Data:** 18/11/2026. **Onde:** `output/financeiro-20261116/cand15` (cópia idêntica à produção cand14, conferida por comparação de pastas antes de começar). O trabalho também mexeu em `tests/` e `docs/`.
**Restrições respeitadas:** nada foi publicado nem commitado, e não houve acesso à produção, ao servidor nem ao banco. Ficaram intocados o Financeiro e o sigilo (`OMIE_SIGILO_CONTAS`), o bloqueio da Frota e o rastreador, o chat do RH360, os documentos PGT/POP gerados e o cofre. Do módulo Representação, só foi lido o que é compartilhado; nenhum arquivo `SGO_Representacao*` ou `JS_Representacao*` mudou. Nenhum dado real foi inventado: os nomes, os e-mails e os contratos dos testes e das capturas são fictícios. O servidor Node também não mudou: a tela do cliente chama só `PortalCliente_api` (e `Assistencia_api` para responder ao orçamento), e as duas já estão em `PCL_FUNCOES_CLIENTE`.
**Especificação:** `ESPEC_PORTAL_CLIENTE.md`, "Etapa 2 (b)", itens 4.1.2, 4.1.3, 4.1.4, 4.1.11, 4.2.3, 4.3 a 4.7 e T2.1 a T2.12. O dono aceitou todas as recomendações. Onde algo ainda depende dele, adotei a recomendada e deixei configurável (seção 3).

## 1. O que foi feito

### 1.1 Abrir chamado (conta de cliente; item 4.1.3)

- **Tela nova:** Portal do cliente > **Chamados**, com três abas: "Chamados", "Abrir chamado" e "Conversa geral". O item aparece no menu e na grade do celular da conta de cliente. O botão "Pedir atendimento" de "Meus chamados" agora abre esse formulário completo.
- **Formulário em cinco passos:**
  - **Equipamento:** unidade, equipamento da lista do escopo ou "não está na lista" com a descrição, e setor.
  - **Problema:** sintoma (30 letras ou mais), desde quando, código no visor (ou "não exibe"), situação (Parado, Funciona com limitação ou Funcionando), risco e o que já foi tentado.
  - **Contato no local:** nome, telefone, e-mail, melhor horário e o número interno do cliente.
  - **Fotos:** até 10 fotos e até 3 da etiqueta. A foto é recomendada, não obrigatória. Vídeo opcional.
  - **Conferir e enviar.**
- **Validação no servidor:** cada falta volta em `faltam`, com o campo e o que fazer.
- **Prioridade:** o cliente não escolhe. Ele informa a situação e o risco.
- **Gravação:** o pedido entra em `ATEC_SOLICITACOES` com `ORIGEM = PORTAL`, nas colunas da Representação (`SETOR`, `CONTATO_*` e `RELATO_JSON`) e nas novas (`CONTRATO_ID`, `URGENCIA_CLIENTE`, `POR_PAPEL`, `SEM_CONTRATO`, `EQUIP_FORA_LISTA_TEXTO`, `HORARIO_PREFERIDO`, `PROTOCOLO_CLIENTE` e `REABRE_CHAMADO_ID`). Fotos e vídeo vão para `PCL_ANEXOS` (arquivo privado; tipo e tamanho conferidos no servidor).
- **Escopo:** equipamento ou unidade de outro cliente ou de outra unidade recebe exatamente a resposta de um registro inexistente, e a tentativa fica em `ESCOPO_RECUSADO`.
- **Pedido repetido:** com pedido ou chamado aberto do mesmo equipamento, a tela pergunta "É o mesmo problema?". "Sim" leva à conversa daquele atendimento; "Não" abre mesmo assim.
- **Papel e contrato:** Gestor e Solicitante abrem; a Consulta, não. Em PLENO ou CARENCIA, o pedido é normal e leva o contrato da unidade. Em **CONSULTA**, o botão vira **"Pedir atendimento avulso"**: o pedido entra `SEM_CONTRATO` e o chamado recebe no histórico "orçar antes de atender".
- **Termo de uso:** com o termo pendente, todo envio fica travado.
- **Limites:** 20 pedidos por pessoa por dia e 60 mensagens por hora, configuráveis.
- **Fora do expediente:** a resposta diz que a análise acontece no próximo horário útil. Com o equipamento parado, mostra também o telefone de plantão, se ele estiver cadastrado.

### 1.2 Acompanhamento em 8 etapas (itens 4.1.2 e 4.4)

- **Etapas:** `PCL_ETAPAS` e `PCl_etapaCliente_` cobrem todas as situações internas do pedido e do chamado, inclusive as três do fluxo da representada. "Aguardando sua aprovação" só aparece quando há orçamento enviado.
- **Telas:** lista com filtros (unidade, etapa, período e busca por número, série, TAG ou setor), Kanban de 8 colunas e Gantt, com os componentes de `JS_PainelAtendimento.html`.
- **"O que precisa de você":** complemento pedido, orçamento à espera do gestor e atendimento para confirmar.
- **Ficha do chamado:**
  - relato, setor, contato, etapa e linha do tempo pública (eventos `PUBLICO = SIM`; o autor interno aparece como "Metrolabs");
  - prazo do contrato e se está dentro dele, só quando `SLA_FONTE = CONTRATO`;
  - visita, e o técnico (nome e sobrenome) **só nas etapas 6 e 7, com a visita agendada ou em andamento**;
  - O.S., relatório, orçamento (a resposta usa o `At_responderOrcamento_` de sempre, só para o Gestor) e galeria (fotos do cliente e do técnico liberadas com `PUBLICO = SIM`).
- **Projeção pública:** `PCl_chamadoPublico_` estende `AstC_publicoCliente_` e nunca leva prioridade, triagem, fila livre, prazo interno, custo, casos, compras nem nota interna. O teste percorre todo o JSON.

### 1.3 Conversa (itens 4.1.11 e 4.2.3)

- **Onde:** `PCL_MENSAGENS` (só inclusão), por pedido e por chamado (a conversa do chamado junta a do pedido de origem), mais a conversa geral do cliente.
- **Como o cliente vê:** a mensagem da Metrolabs aparece como "Primeiro nome (Metrolabs)". A **nota interna** nunca chega ao cliente.
- **Anexos:** foto ou PDF de até 10 MB. A Metrolabs retira um anexo com motivo, e o registro fica.
- **Avisos internos:** a mensagem do cliente avisa quem faz a triagem e o técnico do chamado (PI06).
- **Lado da equipe:**
  - aba **"Conversas do portal"** e item de menu próprio, com caixa nova `PORTAL_CLIENTE_CONVERSAR`;
  - parte **"Portal do cliente"** na ficha do chamado da Assistência;
  - botão "Conversa com o cliente" no cartão da fila de solicitações.
- **Trava de arquivo:** ganhou a regra de `PCL_ANEXOS`: só o próprio cliente, nada interno nem retirado, e respeitando a unidade (o da conversa geral vale para todo o cliente).

### 1.4 Fila da Metrolabs (item 4.2.3)

- **Cartão do pedido:** Assistência técnica > Solicitações dos clientes mostra papel, contrato ou "avulso", setor, contato, situação informada, horário, número interno do cliente, fotos e o **prazo para responder** (240 minutos úteis, configurável). Pedido vencido fica amarelo.
- **Aceitar:** usa o `AstC_converter_` existente. O prazo é o do contrato (`Ast_slaPara_`, `SLA_FONTE = CONTRATO`) e o chamado recebe o `CONTRATO_ID`.
- **Pedir complemento e recusar com motivo:** passaram a valer também para o pedido do portal. O cliente vê a pergunta ou o motivo e é avisado.
- **Caixa de decisões:** tipos novos `pcl_pedido`, `pcl_pedido_vencido` e `pcl_reaberto`.

### 1.5 Cancelar e aceite do atendimento

- **Cancelar:** antes da visita, com motivo. Vale para o pedido NOVA ou COMPLEMENTO e para o chamado nas mesmas situações de `REP_CANCELA_CHAMADO`. O Solicitante cancela só o que abriu. A triagem, a gestão Técnica e o técnico do chamado são avisados (PI07).
- **Aceite:**
  - "Confirmar atendimento", com comentário opcional;
  - "O problema continua": pedido novo ligado ao chamado (`REABRE_CHAMADO_ID`), relato obrigatório de 30 letras ou mais, chamado `REABERTO`, aviso PI03 à gestão Técnica e pendência. Ao aceitar o pedido, a Assistência marca a reincidência;
  - **confirmado por prazo em 5 dias úteis**, pela rotina (`PortalCliente_rotinaChamados_`, ligada à rotina da Assistência).
- **Colunas:** `CLIENTE_ACEITE_*` em `ATEC_CHAMADOS`.
- **Representada:** o chamado de representada segue o fluxo próprio (`RepFC_confirmar_`).

### 1.6 Avisos

- **Ao cliente, só por e-mail, nunca WhatsApp:**
  - **PC01** "Pedido recebido": na hora, mesmo fora do expediente, para quem abriu e para o contato no local;
  - **PC02** "aceito", "falta uma informação" e "não pôde ser atendido": no horário comercial. Fora dele, o e-mail espera em `PCL_AVISOS_FILA` e sai na rotina seguinte dentro do expediente.
- **Internos:** AT09 (o de sempre), PI03, PI06 e PI07, registrados na matriz.

### 1.7 Ajuda e manual

- **Explicação de campo:** `PCL_DICAS` cobre todos os campos novos (o teste confere). Guias novos: `chamados`, `abrirChamado`, `fichaChamado`, `conversaGeral` e `conversas`.
- **Ajuda das telas:** `portal_cliente_chamados`, com texto para o cliente e sem recurso administrativo, e `portal_cliente_conversas`, para a equipe. A ajuda da Assistência foi atualizada (fila de solicitações e "Meus chamados").
- **Manual:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` ganhou a seção 24 (24.1 a 24.10), e as seções 10 e 11 foram atualizadas.
- **Assistente:** a base `SGO_AssistenteManuais.js` foi regerada por `_tools/gerar_base_assistente.cjs --saida`; só as seções do Portal mudaram. `JS_PortalCliente_Chamados` entrou no mapa de erros do assistente.

## 2. Tabelas e colunas (por acréscimo; nada apagado nem renomeado)

- **Tabelas novas** (`PCl_garantirAbas_`, cache `PCL_ABAS_OK_V4`, datas como texto):
  - `PCL_MENSAGENS`;
  - `PCL_ANEXOS`;
  - `PCL_AVISOS_FILA`.
- **`ATEC_SOLICITACOES`** (`PClCh_garantirColunas_`, cache `PCL_AST_COLS_V1`): `CONTRATO_ID`, `URGENCIA_CLIENTE`, `POR_PAPEL`, `SEM_CONTRATO`, `EQUIP_FORA_LISTA_TEXTO`, `HORARIO_PREFERIDO`, `REABRE_CHAMADO_ID` e `PROTOCOLO_CLIENTE`. A mesma rotina garante também as colunas da Representação que o pedido usa.
- **`ATEC_CHAMADOS`:** `CONTRATO_ID`, `CLIENTE_ACEITE_POR_ID` e `REABERTO_POR_SOL_ID`. As `CLIENTE_ACEITE_EM`, `_POR_NOME`, `_TIPO` e `_TEXTO` já existiam e agora são garantidas aqui também.
- **Gravação:** toda alteração usa `SGO_DATA.update` só com os campos que mudam.

## 3. Decisões adotadas e o que ficou configurável

| Assunto | Adotado | Onde mudar |
|---|---|---|
| 8 etapas × as 5 antigas | `PCL_ETAPAS` (8) nas telas do Portal. `AST_ETAPAS_CLIENTE` (5) fica para "Meus chamados" e os documentos A4 até a etapa 6, porque o teste da Representação e as cores dos A4 dependem das 5 | código (etapa 6) |
| Situações fora da tabela da espec | LAUDO e AGUARDANDO_REPRESENTADA → Em análise; AGUARDANDO_ENCERRAMENTO → Concluído; AGUARDANDO_ORCAMENTO sem orçamento enviado → Em análise | código |
| Técnico visível | Só em AGENDADO, EM_DESLOCAMENTO, NO_LOCAL, EM_EXECUCAO, PAUSADO e DOC_PENDENTE. PLANEJADO (etapa 6, mas sem data) não mostra | código |
| Aceite automático | 5 dias úteis; vale só para chamado encerrado a partir da primeira rotina depois da publicação (`aceiteDesde`), para não marcar o passado | Regras do portal |
| Prazo de resposta ao pedido | 240 minutos úteis (o mesmo padrão da Representação) | Regras do portal |
| Limites | 20 pedidos por dia e 60 mensagens por hora, por pessoa | Regras do portal |
| Plantão | Em branco (não mostra) | Regras do portal |
| Caixa da conversa | `PORTAL_CLIENTE_CONVERSAR` para a equipe interna da Técnica, gestores, Diretoria e Administrador | Administração > Acessos |
| "Pedir atendimento" de Meus chamados | Passou a abrir o formulário completo do Portal (o formulário pobre antigo deixava de levar setor, contato e situação) | JS_Assistencia.html |
| Anexos | Imagem e PDF até 10 MB; vídeo até 8 MB dentro do pedido | código |

**Dado real que não existe, deixado configurável:** o **telefone de plantão** (item 4.1.3, "se a Metrolabs cadastrar"). Ele fica em branco até o dono informar em Regras do portal > Chamados do portal. Também segue pendente, da etapa 1, o contato do encarregado de dados.

## 4. O que ficou de fora, e por quê

- **PC03, PC04 e PC05** (visita, orçamento e conclusão): são da etapa 4. Até lá continuam os avisos de sempre da Assistência (AT08/AT15, para o e-mail do cadastro), para não duplicar.
- **PC06** (resumo das mensagens da Metrolabs a cada 2 horas úteis, desligável): também é da etapa 4. Hoje a resposta aparece no Portal, mas **o cliente não recebe e-mail quando a Metrolabs responde**. O gancho está anotado em `PClCh_enviarMensagemInterna_`.
- **PI05** (e-mail a 75% do prazo de aceite): a Caixa de decisões já mostra o pedido e o vencido (`pcl_pedido_vencido`); falta o e-mail no meio do prazo.
- **Vídeo de até 50 MB:** depende da rota própria do servidor Node, como `/api/representacao/midia`, e não mexi no servidor. Hoje o limite é 8 MB, e a ajuda explica o caminho.
- **Generalizar `Rep_conferirArquivo_` e `Rep_salvarAnexo_`:** não generalizei, para não mexer na Representação. `PClCh_conferirArquivo_` e `PClCh_salvarAnexo_` são finos e próprios do portal (tabela, pasta e limites diferentes).
- **Etapa 6:** a troca de "Meus chamados" pelas telas do portal, a trava do legado e a lista mínima do servidor.

## 5. Riscos a conferir antes de publicar

1. **Botão "Pedir atendimento" de Meus chamados** agora abre a tela Chamados. Confira no celular de um cliente real.
2. **E-mail ao contato no local (PC01):** o contato informado no pedido recebe "Pedido recebido", mesmo sem conta no portal. Os e-mails continuam com o prefixo "SGO+ | " do serviço comum (já anotado na etapa 1).
3. **Rotina da Assistência:** ganhou o passo `portalCliente`. A primeira rodada grava `aceiteDesde` em Regras do portal.
4. **Colunas novas** em `ATEC_SOLICITACOES` e `ATEC_CHAMADOS`, e tabelas novas, criadas na primeira chamada. Conferir no banco real que `CertCal_garantirColuna_` cria as colunas antes da primeira gravação.
5. **Recusa de pedido do portal:** o motivo vai para o cliente. Avise a equipe da triagem para escrever motivos claros (a ajuda da fila diz isso).
6. **Conferir no uso real:**
   - o e-mail PC02 que espera o horário comercial;
   - a miniatura das fotos em `/arquivos` (nas capturas não abre, porque não há servidor de arquivos);
   - o formulário com foto HEIC no iPhone (não é reduzida no aparelho; sobe como está, até 10 MB).

## 6. Testes e placar

**Teste novo:** `tests/portal-cliente-etapa2-20261118.test.cjs`, com 15 testes, todos aprovados (código de saída 0):

- **T2.1 a T2.12:** um teste para cada item;
- complemento e recusa com a fila PC02 no horário comercial;
- lista, Kanban, Gantt, filtros, portão de funções e chaves proibidas;
- tela, ajuda e manual.

Nenhum teste existente foi alterado.

**Antes da suíte:** rodei os 42 arquivos da Assistência, do Assistente, da Representação, do Portal, dos acessos, dos poderes, da matriz e das pendências. Todos com 0 falhas.

**Suíte completa:** em `etapa2/suite.txt`. O placar está na seção 8.

**Capturas reais:** Index.html com os includes da cand15 e o servidor simulado, a 1366, 390 e 320 px, em `etapa2/capturas/`:
- cliente: lista, Kanban, Gantt, ficha com visita e técnico, ficha com complemento, abrir chamado, faltas e conversa geral;
- equipe: conversas do portal e o cartão da fila com a conversa.

Resultado: **sem rolagem lateral e sem erro de JavaScript** (`capturas/conferencia.txt`). Script: `etapa2/capturas.cjs`.

## 7. Lista exata de arquivos (relativos à cand15)

**Legado, novos (LF):**
- `SGO_PortalCliente_Chamados.js`
- `JS_PortalCliente_Chamados.html`

**Legado, alterados:**
- `SGO_PortalCliente.js`, `SGO_PortalCliente_Config.js`, `SGO_PortalCliente_Acessos.js`
- `SGO_PortalCliente_Seguranca.js` (CRLF preservado, conferido: 282 de 282 linhas)
- `SGO_Assistencia_Chamados.js`, `SGO_Assistencia_Painel.js`
- `JS_PortalCliente.html`, `JS_PortalCliente_Acessos.html`, `JS_PortalCliente_Ajuda.html`, `JS_Assistencia.html`, `JS_Core.html`, `Index.html`
- `SGO_Ajuda.js`, `SGO_Ajuda_PortalCliente.js`, `SGO_Ajuda_Assistencia.js`
- `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (regerado)

Os demais são LF e continuam LF. A sintaxe de todos foi conferida.

**Testes:** `tests/portal-cliente-etapa2-20261118.test.cjs` (novo).

**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`.

**Entregas (`output/portal-cliente-20261116/etapa2/`):**
- `RELATORIO.md`, `suite.txt`, `suite-execucao.log`;
- `legado-etapa2.patch`: diff da cand14 (idêntica à produção) para a cand15;
- `capturas.cjs`, `capturas/` e `capturas-suite/`.

## 8. Placar da suíte completa (`etapa2/suite.txt`)

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência (etapa 1, produção cand14) | 256 | 2443 | 0 |
| **Rodada final (cand15)** | **257** | **2458** | **0** |

Nenhum arquivo terminou com código de saída diferente de zero. A diferença em relação à referência é o teste novo: mais 1 arquivo e mais 15 testes aprovados.
