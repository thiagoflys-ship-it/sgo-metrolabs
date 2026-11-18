# Portal do cliente — Etapa 1 (a), Acessos: relatório de implementação

**Data:** 18/11/2026. **Onde:** `output/financeiro-20261116/cand14` (cópia idêntica à produção, conferida por hash em 18/11). O trabalho também mexeu em `tests/` e `docs/`.
**Restrições respeitadas:** nada foi publicado nem commitado. Não houve acesso à produção, ao servidor nem ao banco. Financeiro e sigilo (`OMIE_SIGILO_CONTAS`), bloqueio da Frota e rastreador, chat do RH360, documentos PGT/POP gerados e o cofre ficaram intocados. Nenhum dado real foi inventado: nomes, e-mails e contratos dos testes e das capturas são fictícios.
**Especificação:** `output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md`, seção "Etapa 1 (a)" e itens 3.1, 3.2, 3.5, 4.1.9, 4.1.10, 4.2.2, 4.3, 4.6, 4.7 e T1.1 a T1.8. O dono aceitou todas as recomendações. Onde algo ainda depende dele, adotei a recomendada e deixei configurável (seção 3).

## 1. O que foi feito

### 1.1 Papéis e unidades por pessoa (escopo)

- **Papéis** (`PCL_PAPEIS`): Gestor do cliente, Solicitante e Consulta, com as permissões da tabela da espec (abrir, conversar, cancelar, aprovar, confirmar, documentos, equipe, indicadores).
- **Unidades:** ficam em `CAD_USUARIOS.CLIENTE_UNIDADES_JSON`. Nenhuma unidade marcada quer dizer todas, e isso só vale para o Gestor. Solicitante e Consulta precisam de pelo menos uma unidade.
- **Conta antiga sem papel:** vale como Gestor com todas as unidades, então nada muda no dia da publicação. A tela interna mostra o selo **"papel não revisado"**.
- **Escopo único:** `PCl_escopo_(userId)` usa sempre o `CLIENTE_ID` e as unidades do cadastro da conta, nunca o que vem do navegador.
- **Onde o escopo vale:**
  - Equipamentos, Unidades e Arquivo de documentos (`listar`, `obter`, `pesquisar`, pelo gancho `PCl_publicoSeCliente_`);
  - painel de cadastros (`CadPainel_base_`);
  - documentos por pasta (`documentosPastas`);
  - trava de arquivo `/arquivos`;
  - "Meus chamados": chamados, pedidos, orçamentos, relatórios, rondas, Kanban e Gantt.
- **Fora do escopo:** o registro recebe exatamente a mesma resposta de um ID inexistente. Na Assistência, o ID é trocado por um inexistente antes da função rodar. A tentativa é gravada em `PCL_ACESSOS` como `ESCOPO_RECUSADO`.
- **Trava por papel na Assistência** (`PCl_gateAssistencia_`, chamada por `Assistencia_api`). Vale no servidor, mesmo quando a ação é chamada direto:
  - Consulta não pede atendimento nem confirma;
  - só o Gestor responde orçamento (aprovar, ajuste ou recusa);
  - o Solicitante confirma só o atendimento que ele abriu;
  - o relatório do período (todas as unidades) fica só com o Gestor que tem todas as unidades.
- **Tela "Meus chamados":** recebe `acessoPortal` e esconde "Pedir atendimento" na Consulta. Para quem não é Gestor, o orçamento aparece só para consulta, com o nome do gestor que aprova.

### 1.2 Convite (porta de entrada) — T1.1

- O portal **reusa o convite que já existe** (`AcessoCli_enviar_`, "Enviar acesso ao cliente"): link de uso único, validade, cancelamento pelo envio novo e registro em `SYS_SEGURANCA_ACESSO`. Não há mecanismo novo de senha.
- **Trava do contrato:** o convite só sai com a situação PLENO ou CARENCIA no cliente e em cada unidade marcada. Foi posta também dentro do próprio convite (`AcessoCli_exigirContrato_`), antes de criar a conta, para valer nos três caminhos: Usuários, Cadastros e Acessos. A trava é configurável.
- **Papel e unidades:** gravados por merge depois do envio. Se o e-mail falhar com a conta já criada, o papel também é gravado, para a conta nunca ficar como Gestor por engano.

### 1.3 Tela interna: Portal do cliente > Acessos de clientes (4.2.2)

- **Acesso:** aba nova e item de menu próprio. A caixa é a mesma do convite, `USUARIOS_CLIENTES_ENVIAR_ACESSO` (item 4.6: "uma regra só"). A descrição da caixa foi atualizada.
- **Lista:** escolha ou busca do cliente; faixa com a trava do convite; formulário de convite; lista das pessoas com papel, selo "papel não revisado", unidades, situação (ativo, convite enviado ou vencido, desligado), última entrada e dias sem entrada.
- **Ações:** Mudar papel, Reenviar convite, Trocar e-mail, Marcar ou Tirar "manter", Desligar, Reativar e Histórico. Todas pedem motivo e ficam em `PCL_CONTAS_HIST` e em `PCL_ACESSOS`.
- **Pedidos do gestor:** "Enviar o convite" atende com um toque; "Recusar" exige a resposta ao gestor.
- **"Conferir inatividade agora":** só com `PORTAL_CLIENTE_REGRAS`.

### 1.4 Conta de cliente: "Minha conta e equipe" e termo de uso (4.1.9, 4.1.10, 3.5) — T1.7

- **Menu e celular:** item novo no menu da conta de cliente e na grade do celular.
- **Meus dados:** nome, cargo e telefone editáveis; e-mail só para leitura; preferências PC06, PC07 e PC08; termo aceito, com "Ver termo".
- **Minha equipe (só Gestor):**
  - pessoas, pedidos e registro de ações da empresa, **sem IP e sem navegador**; ações internas aparecem como "Metrolabs";
  - "Pedir acesso" vai para a Caixa de decisões (PI02);
  - "Desligar acesso" age na hora. O gestor não desliga o próprio acesso, e uma conta de outra empresa recebe "não encontrado" com registro.
- **Termo de uso:**
  - aparece numa janela no primeiro acesso e a cada versão nova, com "Li e estou ciente" ou "Sair do Portal";
  - o aceite vai para `PCL_TERMOS_ACEITE` (só inclusão) com a versão, a data, o IP e o navegador. **IP e navegador vêm do login, gravados pelo servidor na sessão** (`ipLogin` e `agenteLogin` em `criarSessaoLoginAuth_`), não da tela;
  - sem o aceite, o servidor recusa com o caminho as ações que gravam: pedido, resposta de orçamento, confirmação, Minha equipe e Meus dados.
- **Texto e versão:** ficam em Regras do portal. Mudar o texto gera versão nova (data do dia) e pede o aceite de novo.

### 1.5 Desligamento e inatividade — T1.5 e T1.8

- **Desligar** (`PClA_desligar_`):
  - `STATUS=INATIVO`, `CLIENTE_DESLIGADO_*` e +1 em `SEGURANCA_VERSAO`, que invalida o link pendente;
  - `SegAcesso_derrubarSessoes_` encerra as sessões abertas na hora, e a próxima chamada já cai;
  - grava o histórico e manda o PC09.
- **Rotina diária** (`PortalCliente_rotinaAcessos_`, ligada a `Contratos_rotina_`, uma vez por dia no expediente):
  - cliente em SEM_ACESSO: inativa as contas com o motivo "Fim do contrato". Elas podem ser reativadas depois da renovação;
  - 90 dias sem entrada: aviso PI04 uma vez por período, e a conta entra na Caixa de decisões;
  - 120 dias sem entrada: inativa, a menos que alguém tenha marcado "manter".
- **Início da contagem:** é a data da primeira rodada depois da publicação (`inatividadeDesde`), para nenhuma conta antiga cair no primeiro dia. Entrada, convite e reativação reiniciam a contagem.
- **Entrada e saída:** são gravadas em `PCL_ACESSOS`, junto com `CLIENTE_ULTIMA_ENTRADA_EM`.

### 1.6 Avisos e pendências (4.7)

- **Canal:** tudo pelo mecanismo existente (`SGO_notificar_`), só por e-mail. Nenhum WhatsApp para o cliente.
- **PC09:** vai à pessoa e aos gestores do cliente, na hora, em texto neutro, sem motivo interno e sem IP. Cobre papel alterado, desligamento, reativação e o aviso de convite aos gestores.
- **PI02 e PI04:** vão a quem tem a caixa do convite.
- **Registro na matriz:** PC09, PI02 e PI04 em `MTZ_PADRAO`.
- **Tipos de pendência:** `pcl_pedido_equipe` e `pcl_conta_inativa` em `PEND_TIPOS` e `GES_TIPOS`, módulo "Portal do cliente" (área TECNICA), com a fonte `PortalCliente_fontePendencias_`. Essa fonte nunca roda para a conta de cliente.

### 1.7 Ajuda e manual

- **Explicação embaixo de cada campo:** `PCL_DICAS` cobre todos os campos novos (o teste confere).
- **"Como fazer nesta aba":** guias novos `PCL_GUIAS.acessos`, `PCL_GUIAS.conta` e `PCL_GUIAS.equipe`.
- **Ajuda da tela:** `SGO_Ajuda_PortalCliente.js` ganhou as telas `portal_cliente_acessos` e `portal_cliente_conta`. A da conta usa texto para o cliente, sem recurso administrativo. Os nomes das telas entraram em `SGO_Ajuda.js`.
- **Ajuda do convite:** em Administração (`SGO_Ajuda_Administracao.js`) e em Cadastros (`SGO_Ajuda_Cadastros.js`), com a trava nova do contrato.
- **Manuais:**
  - `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`: seção 23 nova (23.1 a 23.10), mais as linhas novas em "Quem pode" e "Tabelas";
  - `docs/MANUAL_SEGURANCA_ACESSO_GESTAO.md`: a trava do contrato no convite.
- **Base do assistente:** `SGO_AssistenteManuais.js` regerada por `_tools/gerar_base_assistente.cjs --saida` na cand14. Só as seções do Portal e a do convite mudaram.
- **Mapa de erros do assistente:** `JS_PortalCliente_Acessos` entrou em `SGO_AssistenteErros.js`.

## 2. Tabelas e colunas (por acréscimo; nada apagado nem renomeado)

**Tabelas novas** (`PCl_garantirAbas_`, chave de cache `PCL_ABAS_OK_V3`, datas como texto):
- `PCL_PEDIDOS_EQUIPE`: pedidos de inclusão feitos pelos gestores dos clientes;
- `PCL_TERMOS_ACEITE`: aceites do termo de uso (só inclusão);
- `PCL_CONTAS_HIST`: histórico de cada conta de cliente (só inclusão).

**Colunas novas em `CAD_USUARIOS`** (`PClA_garantirColunas_`, cache `PCL_USR_COLS_V1`):
- `CLIENTE_PAPEL`, `CLIENTE_UNIDADES_JSON`, `CLIENTE_CARGO`, `CLIENTE_TELEFONE`, `CLIENTE_AVISOS_JSON`;
- `CLIENTE_CONVIDADO_POR_ID` e `CLIENTE_CONVIDADO_POR_NOME`;
- `CLIENTE_DESLIGADO_EM`, `CLIENTE_DESLIGADO_POR_NOME` e `CLIENTE_DESLIGADO_MOTIVO`;
- `CLIENTE_ULTIMA_ENTRADA_EM`;
- `CLIENTE_REATIVADO_EM` e `CLIENTE_REATIVADO_POR_NOME`;
- `CLIENTE_MANTER`, `CLIENTE_MANTER_POR_NOME` e `CLIENTE_MANTER_EM`;
- `CLIENTE_INATIVIDADE_AVISO_EM`.

Toda gravação na conta usa `SGO_DATA.update` só com os campos que mudam (merge).

## 3. Decisões adotadas (as recomendadas) e o que ficou configurável

| Assunto | Adotado | Onde mudar |
|---|---|---|
| Caixa da aba Acessos | A mesma do convite (`USUARIOS_CLIENTES_ENVIAR_ACESSO`), em vez de criar `PORTAL_CLIENTE_ACESSOS_GERIR` (item 4.6: "uma regra só") | Administração > Acessos |
| Convite só com contrato | Ligado, nos três caminhos do convite | Regras do portal ("Convite só com contrato") |
| Gestor inclui pessoas? | Não: ele pede e a Metrolabs envia (decisão 6). Para desligar, ele desliga na hora | — |
| Aviso e inativação de conta parada | 90 e 120 dias; "manter" impede a inativação até ser retirado | Regras do portal |
| Fim do contrato (SEM_ACESSO) | Inativa as contas com "Fim do contrato"; reativação manual depois da renovação | Regras do portal |
| Termo de uso | Texto padrão escrito por mim, com a base legal da espec; versão `2026-11-18` | Regras do portal (texto e versão) |
| Responder orçamento | Aprovar, ajuste e recusa ficam só com o Gestor (a espec fala de "aprovar"; tratei as três respostas como decisão do gestor) | Código (`PCl_gateAssistencia_`) |
| Relatório do período | Só o Gestor com todas as unidades (a versão filtrada por unidade é da etapa 5, T5.3) | — |

**Dado real que não existe, deixado configurável:** o **contato do encarregado de dados (LGPD)**. Item 3.5: "o dono informa o contato". Enquanto o campo "Contato do encarregado de dados" (Regras do portal) estiver em branco, o termo orienta a "responder ao e-mail do convite ou usar o canal de atendimento que a empresa já usa". O dono precisa informar o contato. Não muda a versão do termo.

## 4. O que ficou de fora, e por quê

- **"Conversar" e "cancelar antes da visita":** a conversa e o cancelamento pelo cliente são da etapa 2. As permissões já estão em `PCL_PAPEIS` (`conversar`, `cancelar`) para a etapa 2 usar. Hoje não há ação de conversa nem de cancelamento do cliente para travar.
- **Escopo por unidade ainda não aplicado** em três lugares. Os arquivos dessas listas são negados pela trava de arquivo para quem não tem a unidade, mas a lista ainda mostra os nomes:
  - prontuário pelo QR Code (`qrcodeAcessar`);
  - lista de relatórios de ciclo da lavadora (`LavCiclo_api`);
  - vencimentos da central de pendências para o cliente (`publico CLIENTE`).

  Isso fica para a etapa 3, que refaz documentos, equipamentos e vencimentos dentro do portal.
- **Assunto do e-mail:** o serviço de avisos acrescenta "SGO+ | " antes de "Metrolabs — ..." (`SGO_notificar_`). Não mexi no serviço comum. A regra de assunto da etapa 4 decide se o prefixo sai.
- **Patch do servidor Node:** não é necessário. O cliente só usa `PortalCliente_api` e `Assistencia_api`, que já estão na lista dele.
- **Anonimização de contas inativas há 5 anos e retenção resumida do registro:** item 3.5. Não é etapa 1 e não foi feita.

## 5. Riscos a conferir antes de publicar

1. **Convite travado sem contrato:** a partir da publicação, "Enviar acesso ao cliente" (Usuários e Cadastros) recusa o cliente que não está em PLENO ou CARENCIA. Quem tem conta ou pista de contrato está em PLENO provisório até 31/12/2026, mas **um cliente novo, sem conta, sem pista e sem contrato, não recebe convite** até ter o contrato cadastrado. Se a Bruna precisar enviar a um cliente assim antes, desligue "Convite só com contrato" em Regras do portal (com motivo).
2. **Fim do contrato inativa contas:** na primeira rotina diária, clientes que já estão em SEM_ACESSO (por exemplo, "revisado: sem contrato" na pré-carga) têm as contas inativadas com "Fim do contrato". Essas contas já não entravam (etapa 0), mas confira a lista antes. Para adiar, desligue a regra em Regras do portal.
3. **Termo de uso no primeiro acesso:** todas as contas de cliente verão a janela do termo na próxima entrada. Antes, revise o texto e informe o contato do encarregado.
4. **Escrita a cada entrada de cliente:** o login da conta de cliente passa a gravar `CLIENTE_ULTIMA_ENTRADA_EM` e uma linha em `PCL_ACESSOS`.
5. **Sessão com IP e navegador:** a sessão passa a guardar `ipLogin` e `agenteLogin`, que `getSessaoAtual` devolve à própria pessoa.
6. **Gestores do cliente recebem e-mail (PC09)** quando alguém da empresa tem o papel alterado, é desligado ou recebe convite. Contas antigas sem papel contam como gestor.
7. **Conferir no uso real:** a janela do termo e "Minha conta" no celular de um cliente (as capturas usam o servidor simulado). Os e-mails PC09, PI02 e PI04 com a matriz de avisos real.

## 6. Testes e placar

**Teste novo:** `tests/portal-cliente-etapa1-20261118.test.cjs`, com 11 testes, todos aprovados (código de saída 0):

- **T1.1:** convite só com PLENO ou CARENCIA, pelo portal e pelo "Enviar acesso" de sempre; regra desligável; caixa; validações por campo.
- **T1.2 (cadastros):** equipamentos, documentos, unidades, painel de cadastros, documentos por pasta e arquivos. Fora do escopo recebe a mesma resposta de inexistente, com `ESCOPO_RECUSADO`.
- **T1.2 e T1.3 ("Meus chamados"):** escopo dos chamados e do painel; pedido de outra unidade recebe a resposta de inexistente; Consulta não pede, não confirma e não gera o relatório do período, mesmo chamando direto.
- **T1.4:** só o Gestor responde orçamento; orçamento de outra unidade recebe a resposta de inexistente.
- **T1.5:** o gestor desliga; a sessão cai na próxima chamada; não desliga a si mesmo nem outra empresa; reativar exige motivo.
- **T1.6:** conta antiga = Gestor com todas, com "papel não revisado"; mudar papel grava histórico e faz merge.
- **T1.7:** termo exigido; aceite com versão, data, IP e navegador do login; versão nova pede de novo; Meus dados.
- **T1.8:** aviso aos 90 dias uma vez; inativação aos 120 só sem "manter"; contagem a partir da publicação; fim do contrato inativa; regras configuráveis.
- **Minha equipe:** pedido de inclusão; atender e recusar; troca de e-mail com convite novo.
- **Avisos:** PI02, PC09 e pendência na Caixa de decisões; nunca WhatsApp.
- **Tela, ajuda e manual:** menu, rotas, dicas de todos os campos, guias, ajuda das duas telas, manual e nenhum `alert`.

**Suíte completa** (`etapa1/suite.txt`):

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência (produção, informada) | — | 2432 | 0 |
| Rodada 1 (antes dos ajustes finais) | 256 | 2443 | 0 |
| **Rodada final** | **256** | **2443** | **0** |

**Capturas reais** (Index.html com os includes da cand14, servidor simulado) a 1366, 390 e 320 px, em `etapa1/capturas-telas/`:
- equipe interna: Acessos do cliente, Mudar papel e convite travado;
- cliente: termo no primeiro acesso, Meus dados e Minha equipe;
- Solicitante: Meus dados.

Resultado: **sem rolagem lateral e sem erro de JavaScript** (`capturas-telas/conferencia.txt`). As tabelas viram cartões no celular. Script: `etapa1/capturas.cjs`.

## 7. Lista exata de arquivos (relativos à cand14)

**Legado, novos:**
- `SGO_PortalCliente_Acessos.js`
- `JS_PortalCliente_Acessos.html`

**Legado, alterados:**
- `SGO_PortalCliente.js`, `SGO_PortalCliente_Config.js`, `SGO_PortalCliente_Seguranca.js` (CRLF preservado)
- `SGO_Auth.js`, `SGO_Usuarios_AcessoCliente.js` (CRLF preservado)
- `SGO_Assistencia_Painel.js`, `SGO_CadastrosPainel.js` (CRLF preservado), `SGO_DocumentosPastas.js`, `SGO_Contratos_Regua.js`
- `JS_PortalCliente.html`, `JS_PortalCliente_Ajuda.html`, `JS_Assistencia.html`, `JS_Core.html`, `Index.html`
- `SGO_Ajuda.js`, `SGO_Ajuda_PortalCliente.js`, `SGO_Ajuda_Administracao.js`, `SGO_Ajuda_Cadastros.js`
- `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (regerado)

Os fins de linha de cada arquivo foram conferidos depois das edições: os de CRLF continuam CRLF, e os de LF continuam LF. A sintaxe de todos foi conferida.

**Testes:** `tests/portal-cliente-etapa1-20261118.test.cjs` (novo). Nenhum teste existente foi alterado.

**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` e `docs/MANUAL_SEGURANCA_ACESSO_GESTAO.md` (fins de linha mistos preservados).

**Entregas (`output/portal-cliente-20261116/etapa1/`):**
- `RELATORIO.md`, `suite.txt`, `suite-execucao.log`;
- `legado-etapa1.patch`: diff contra a cand14 de antes, idêntica à produção;
- `antes/`: cópia dos arquivos antes da edição e o hash da cand14 antes;
- `capturas.cjs`, `capturas-telas/` e `capturas-suite/` (capturas que a suíte gerou).
