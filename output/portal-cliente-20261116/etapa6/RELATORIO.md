# Portal do cliente — Etapa 6, troca definitiva: relatório de implementação

**Data:** 18/11/2026. **Onde:** `output/financeiro-20261116/cand19` (cópia idêntica à produção cand18, conferida por comparação de pastas antes de começar: `diff -rq cand18 cand19` vazio). O trabalho também mexeu em `tests/`, `docs/` e `_tools/`.
**Restrições respeitadas:** nada foi publicado nem commitado. Não houve acesso à produção, ao servidor nem ao banco. Nenhum e-mail real saiu (MailApp simulado). O servidor Node não mudou. Ficaram intocados o Financeiro e o sigilo, o bloqueio da Frota e o rastreador, o chat do RH360 (o widget do bate-papo não foi alterado), os documentos PGT/POP gerados e o cofre. Nenhum dado real foi inventado: nomes, e-mails, chamados, documentos e o orçamento das capturas são fictícios; o que depende do dono está marcado no roteiro do piloto.
**Especificação:** `ESPEC_PORTAL_CLIENTE.md`, "Etapa 6", item 0.1, 4.8 e seção 5 (o dono aceitou todas as recomendações).

## 1. O que foi feito

### 1.1 Menu do cliente: as telas antigas abrem as do Portal

A conta de cliente passa a ver **só o grupo "Portal do cliente"**: Início, Minha conta e equipe, Chamados, Documentos técnicos, Meus equipamentos, Vencimentos e cronograma, Indicadores (Gestor e Solicitante) e Relatórios de ciclo. Cada item antigo abre a tela que o substitui (`SGO_clienteRota_`, em `JS_PortalCliente_Inicio.html`), venha do menu, de atalho, da busca, do botão Voltar ou de link antigo de e-mail. A equipe não muda.

| Antes (o que o cliente via) | Depois (o que abre) | Onde ficou cada coisa (nada sumiu) |
|---|---|---|
| **Início** (central de pendências, índices e alertas) | **Início do Portal** (novo, item 4.1.1) | Cartões: chamados abertos, próxima visita, vencimentos em 30 dias, documentos novos desde a entrada anterior; "O que precisa de você" (complemento, orçamento, confirmação); atalhos; "Manual do Portal". Os vencimentos da central ficam em Vencimentos e cronograma |
| **Meus chamados** | **Chamados** | Pedir atendimento (já era o formulário do Portal desde a etapa 2), lista/Kanban/Gantt, ficha, orçamento (só o Gestor), confirmar ou "o problema continua", relatório da O.S. **Novos na ficha:** "Gerar relatório do atendimento" e "Ver prévia" (antes só em Meus chamados). Rondas: Documentos técnicos (tipo Ronda) e Cronograma. Relatório do período e relatórios gerados: Indicadores |
| **Unidades** (Cadastros) | **Meus equipamentos > Unidades** (aba nova) | Nome, CNPJ, endereço, cidade, telefone e quantidade de equipamentos (campos públicos, sem o responsável interno); "Ver os equipamentos"; "Documentos da unidade" (pastas da unidade, com PGT e POP) |
| **Equipamentos** (Cadastros) | **Meus equipamentos** | Lista com farol e ficha. **Novo na ficha:** "Prontuário por pastas" (o mesmo do QR Code) |
| **Arquivo de documentos** (Cadastros) | **Documentos técnicos > Por pastas (prontuário)** (aba nova) | Todos os documentos emitidos para a empresa, por pasta, **inclusive PGT e POP, O.S. e qualificação** (pedido da Priscilla de 17/11). A aba "Documentos técnicos" segue com a lista fechada da decisão 17 |
| **Relatórios de ciclo** (Cadastros) | **Relatórios de ciclo** (no grupo do Portal) | A mesma tela da lavadora: consultar, **gerar a partir do arquivo do ciclo e assinar** (o cliente gera e assina; por isso a tela foi mantida e não trocada pela lista de documentos) |
| **Prontuário pelo QR Code** | O mesmo prontuário | Pela entrada do Portal (dados, pastas e "Gerar relatório do ciclo") |
| **Busca rápida (Ctrl K)** | A mesma busca | Pela entrada do Portal; o equipamento abre a ficha em Meus equipamentos e o certificado ou documento abre Documentos técnicos já com a busca |
| **Dúvida** (topo) | "Como usar esta tela" | O assistente é da equipe (já não respondia ao cliente); o botão passa a abrir a ajuda da tela do Portal |
| **Bate-papo** (topo) | Sem mudança | O bate-papo da equipe já recusa a conta de cliente ("SEM_ACESSO") e se esconde. A conversa do cliente é a do Portal |
| **Trocar senha, Sair** | Sem mudança | — |

A prova está em dois testes: o levantamento no navegador (`etapa6/antes/menu-cliente-antes.json` × `etapa6/menu-cliente-depois.json`, gerados por `explorar-menu.cjs`) e `tests/portal-cliente-etapa6-*.test.cjs` (seção 6).

### 1.2 Ponte do Portal: a conta de cliente chama do servidor só a entrada do Portal

As oito funções antigas que continuam valendo para o cliente dentro do Portal (`documentosPastas`, `qrcodeAcessar`, `qrcodeQualificacao`, `Assistencia_api` só nas ações do cliente `AST_ACOES_CLIENTE`, `LavCiclo_api` sem as referências, `SGO_Ajuda_apiTela` e `SGO_Ajuda_apiManual` só para telas `portal_cliente_*`, `Inicio_apiBuscar`) passam a ser chamadas pela entrada única: `PortalCliente_api(sessão, 'legado', { fn, args })`, numa **lista fechada** (`PCL_LEGADO_CLIENTE`; a tela usa a mesma lista, `SGO_PCL_PONTE`, conferida pelo teste). O `sessionId` é sempre o da própria pessoa. Função fora da lista recebe a recusa com o quê, por quê e o que fazer, e a tentativa fica em `PCL_ACESSOS` (`FUNCAO_RECUSADA`). Cada função continua com as próprias travas (empresa, unidades, papel).

Na tela, a troca é num ponto só por arquivo: `At_chamar_` (Assistência), `Lc_chamar_` (ciclos), `SGO_DocPastas.carregar`, a ajuda e o manual da tela, a busca e o QR Code usam `SGO_run_()`, que para a equipe é o `google.script.run` de sempre.

**Entrada da conta de cliente:** a casca não chama mais, para o cliente, os inícios dos módulos internos (Comercial, Compras, Frota, Financeiro, Caju, Ganhos etc.), que só serviam para esconder menus. No navegador, a entrada do cliente passou de 17 funções do servidor para 4 (`comApi`, `getPublicConfig`, `getSessaoAtual`, `PortalCliente_api`).

### 1.3 Trava do legado (item 0.1) — DESLIGADA por padrão

- `exigirSessao` (`SGO_Auth.js`) recusa a sessão CLIENTE fora das entradas que ligam `SGO_PCL_MODULO` (`PortalCliente_api` e, agora, `PortalCliente_arquivoPermitido_`), no mesmo molde de `SGO_REP_MODULO`. Mensagem: "Esta parte do SGO+ não faz parte do Portal do cliente. Por quê: ... O que fazer: abra o que precisa pelo menu do Portal do cliente; se algo que você usava parou de funcionar, avise a Metrolabs pela Conversa geral".
- **Chave:** `travaLegado` em `PCL_FUNCOES_CFG`, `false` por padrão. Liga e desliga na aba **Segurança** (Portal do cliente > Contratos de clientes), só com a caixa «Alterar as regras do portal» (Administrador e Diretoria), com motivo, histórico em `PCL_REGRAS_HIST` e confirmação na tela. A leitura não grava nada.
- A trava de arquivo virou entrada do Portal (liga e restaura `SGO_PCL_MODULO`), para a rota `/arquivos` continuar funcionando com a trava ligada.
- Equipe e representada não mudam.

### 1.4 Lista fechada mínima — preparada, DESLIGADA

`PCL_FUNCOES_CLIENTE_MINIMA` = `PortalCliente_api`, o básico da sessão e da segurança (`getSessaoAtual`, `validarSessao`, `logout`, `login`, `getPublicConfig`, `verificarCodigoAcesso`, `reenviarCodigoAcesso`, `trocarSenhaAcesso` e as quatro de "Esqueci minha senha") e `comApi` (o bate-papo se recusa sozinho à conta de cliente e se esconde; recusado pelo servidor, mostraria "Sem conexão"). Escolhida em "Lista usada pelo servidor = Mínima" (chave `listaMinima`, `false` por padrão), o portão do servidor (`PortalCliente_portaoFuncao_`, já consultado pelo patch da etapa 0) passa a usá-la. O servidor Node não precisou mudar.

### 1.5 Painel "Pronto para ligar?" (aba Segurança)

Mostra: dias de observação (a partir da primeira chamada de conta de cliente registrada; no servidor, desde 18/11/2026 00:16), as funções fora da lista mínima chamadas por clientes (chamadas nos últimos 7 dias, pessoas, total, se está na lista de transição, se é interna), o estado da trava do legado, da recusa do servidor e da lista usada, os itens com selo "Pronto"/"Ainda não" e o passo a passo para ligar e para voltar atrás (`PClT_prontidao_`).

### 1.6 Manual do cliente

- **Texto único** em `SGO_PortalCliente_Manual.js` (`PCL_MANUAL_CLIENTE`), sem termos internos (o teste confere), com as 15 seções pedidas: entrar e aceitar o termo, Início, abrir chamado, acompanhar (as 8 etapas), conversar, aprovar orçamento (Gestor), confirmar o atendimento e o relatório, documentos (com as pastas), equipamentos e unidades, vencimentos e cronograma, indicadores, relatórios de ciclo, minha conta e equipe, avisos por e-mail (preferências), senha e ajuda, e "Se algo der errado".
- **Dentro do Portal:** Início > "Manual do Portal" abre o A4 (padrão `SGO_DocA4`, capa, sumário, texto justificado), registrado em `PCL_ACESSOS` (`MANUAL_ABERTO`). Sem imagens, para não pesar o legado.
- **Para enviar ao cliente:** `docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.md`, `.html` (A4 imprimível, imagens embutidas, 2,4 MB) e `.pdf`, com **21 capturas reais** do SGO+ rodando (`docs/manual_portal_cliente/*.jpg`). Os três saem do mesmo texto por `etapa6/gerar-manual-cliente.cjs`.
- **Ajuda:** telas novas `portal_cliente_inicio` e `portal_cliente_ciclos` (texto do cliente, sem recurso administrativo); Documentos técnicos, Meus equipamentos e Chamados atualizadas; Contratos com o passo "Ligar a troca definitiva". Guias `inicio` e `unidades`; dicas `pclSegTravaLegado` e `pclSegLista`.
- **Manual interno:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`, seção 28 (28.1 a 28.7) e um aviso na seção 6.
- **Base do assistente** regerada (`_tools/gerar_base_assistente.cjs --docs docs --saida .../cand19/SGO_AssistenteManuais.js`): só as seções do Portal mudaram (seção 28). O manual do cliente ficou na lista `IGNORAR` do gerador (seção 3).

### 1.7 Roteiro do piloto

`etapa6/ROTEIRO_PILOTO.md`: CENTRAL DE REPROCESSAMENTO DE MATERIAIS LTDA, 2 semanas, 1 Gestor e 2 Solicitantes; dados que o dono precisa fornecer (marcados **[DADO DO DONO]**), preparação (contrato, cadastro, documentos no portal, convites), apresentação, primeiro chamado acompanhado, o que observar, critérios de sucesso e como voltar atrás. Nada foi cadastrado.

## 2. Lista exata de arquivos

**Legado, novos (relativos à cand19, LF):**
- `SGO_PortalCliente_Troca.js`
- `SGO_PortalCliente_Manual.js`
- `JS_PortalCliente_Inicio.html`

**Legado, alterados** (fins de linha conferidos byte a byte depois das edições; sintaxe conferida):
- `SGO_PortalCliente_Seguranca.js` (**CRLF preservado**, 292 → 322 linhas, todas CRLF)
- `SGO_PortalCliente.js`, `SGO_Auth.js` (LF)
- `JS_Core.html`, `Index.html`, `JS_Assistencia.html`, `JS_LavCiclo.html`, `JS_DocumentosPastas.html`, `JS_Inicio.html` (LF)
- `JS_PortalCliente.html`, `JS_PortalCliente_Ajuda.html`, `JS_PortalCliente_Chamados.html`, `JS_PortalCliente_Documentos.html` (LF)
- `SGO_Ajuda.js`, `SGO_Ajuda_PortalCliente.js`, `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (regerado) (LF)

**Testes:**
- `tests/portal-cliente-etapa6-20261118.test.cjs` (novo, 8 testes)
- `tests/portal-cliente-etapa6-navegador-20261118.test.cjs` (novo, 1 teste de navegador)
- `tests/_portal_cliente_navegador.cjs` (novo, auxiliar do navegador, usado também pelas capturas)
- `tests/documentos-pastas-20261117.test.cjs` (**alterado**: o servidor simulado do teste de navegador passa a repassar a chamada da ponte do Portal, como faz `PClT_legado_`; cópia anterior em `etapa6/antes/`)

**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` (alterado), `docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.md`, `.html`, `.pdf` e `docs/manual_portal_cliente/` (21 imagens) (novos).

**Ferramenta:** `_tools/gerar_base_assistente.cjs` (o manual do cliente na lista `IGNORAR`; cópia anterior em `etapa6/antes/`).

**Entregas (`output/portal-cliente-20261116/etapa6/`):** `RELATORIO.md`, `ROTEIRO_PILOTO.md`, `legado-etapa6.patch` (diff cand18 → cand19, 20 arquivos), `suite.txt`, `suite-execucao.log`, `capturas.cjs`, `capturas/` (33 imagens e `conferencia.txt`), `capturas-suite/`, `gerar-manual-cliente.cjs`, `explorar-menu.cjs`, `ver-menu.cjs`, `menu-cliente-depois.json`, `antes/` (cópias anteriores e `menu-cliente-antes.json`).

## 3. Decisões adotadas

| Assunto | Adotado | Por quê / onde mudar |
|---|---|---|
| Trava do legado | Pronta e **desligada**; liga na aba Segurança | Observação do servidor desde 18/11 00:16; ligar só com 7 dias e revisão (recomendação) |
| Lista fechada mínima | Pronta e **desligada** ("Lista usada = Transição") | Idem; escolher "Mínima" quando "fora da lista mínima" estiver em zero |
| Ponte do Portal | Sempre usada pela conta de cliente (independe das chaves) | Com ela, o cliente já não chama funções antigas direto: a observação limpa e a lista mínima ficam viáveis sem mudar o servidor |
| `comApi` na lista mínima | Sim | O bate-papo recusa o cliente sozinho; sem ela, o widget mostraria "Sem conexão" (o chat do RH360 não foi tocado) |
| As 8 etapas no lugar das 5 (`AST_ETAPAS_CLIENTE`) | **Não trocadas.** As telas do cliente já usam as 8; as 5 continuam só dentro dos documentos A4 (relatório do atendimento e do período) e na Representação | Não é seguro: cores, legenda e linha do tempo dos A4 e da Representação são indexadas pelas 5 (`REPD_COR_ETAPA_CLIENTE`, `V.etapasCliente`, `P.porEtapa`) e os testes da Representação dependem delas |
| PGT/POP (decisão 17 × pedido da Priscilla) | A lista "Documentos técnicos" segue a decisão 17; PGT, POP, O.S. e qualificação ficam na aba "Por pastas (prontuário)", na ficha do equipamento e nas pastas da unidade | Caminho equivalente ao antigo Arquivo de documentos e ao QR Code |
| Relatórios de ciclo | A tela da lavadora continua (no grupo do Portal) | O cliente gera e assina relatórios; a lista de documentos só mostra |
| "Dúvida" na conta de cliente | Abre "Como usar esta tela" | O assistente é da equipe; antes o botão não fazia nada para o cliente |
| Manual dentro do Portal | A4 só com texto | As imagens embutidas no legado pesariam em toda carga; a versão com imagens vai em PDF ao cliente |
| Manual do cliente na base do assistente | Fora (`IGNORAR`) | Com ele, perguntas sem base passavam a achar resposta (por exemplo "receita"), mudando o comportamento do assistente da equipe |
| Tela fora do Portal pedida pelo cliente | Abre o Início do Portal, sem mensagem | É atalho, busca ou link antigo; a trava do legado (quando ligada) cobre a chamada direta ao servidor |

## 4. Riscos e o que conferir antes de publicar

1. **Observação contaminada pelo passado:** as chamadas antigas dos clientes (antes da publicação da etapa 6) continuam na tabela. O painel conta "fora da lista" nos últimos 7 dias, então o selo de "Mínima" só fica verde 7 dias depois da publicação. É o esperado.
2. **Casca do cliente sem os inícios internos:** confira no uso real (celular e computador) que nenhum menu interno aparece e que a tela de entrada é o Início do Portal. No ensaio, o menu tem exatamente as 8 telas (7 para a Consulta).
3. **Aprovação de orçamento:** o nome do campo "Nome completo" deixa de vir preenchido no Portal (vinha do início da Assistência, que a conta de cliente não chama mais). A pessoa digita o nome; o resto não muda.
4. **Ajuda fora das telas do Portal** (por exemplo, no prontuário aberto pelo QR Code) é recusada pela ponte, que só aceita `portal_cliente_*`; a tela mostra a mensagem. O prontuário não tem o botão de ajuda.
5. **Desempenho do Início:** lê chamados, vencimentos e o índice de documentos do cliente a cada abertura (o mesmo custo das telas de cada um). Medir com o maior cliente.
6. **Publicação:** os três arquivos novos do legado precisam ir juntos. O servidor Node não muda; o patch da etapa 0 continua o mesmo.
7. **Conferir no uso real:** a rota `/arquivos` abrindo o PDF pelo Portal (no ensaio não há servidor de arquivos) e o "Manual do Portal" no celular (abre numa aba nova).

## 5. Testes e placar

**Testes novos:**
- `portal-cliente-etapa6-20261118.test.cjs` (8 testes, código real de `SGO_Auth.js` com o `exigirSessao` de verdade):
  - **T6.1** menu antes → depois sem perda: cada item antigo abre a tela nova e a aba certa; tela fora do Portal vai ao Início; a equipe não muda; ponte da tela = ponte do servidor; todas as ações antigas do cliente (Meus chamados, ciclos, pastas, ajuda) alcançáveis pela entrada do Portal; menu, rotas e botões novos presentes.
  - **T6.2** trava desligada por padrão: nada muda (exigirSessao, função antiga chamada direto, portão do servidor, representada).
  - **T6.3** trava ligada: só Administrador e Diretoria, com motivo e histórico; recusa fora de `SGO_PCL_MODULO` com quê/por quê/o que fazer; o Portal, a ponte e a trava de arquivo funcionam; a marca do módulo volta; equipe e representada iguais; voltar atrás.
  - **T6.4** ponte fechada: função fora da lista e ação interna recusadas e registradas; sessão sempre a da pessoa; a equipe não usa a ponte.
  - **T6.5** lista mínima: nasce desligada; escolhida, só a entrada do Portal e o básico passam; volta à transição.
  - **T6.6** "Pronto para ligar?": dias de observação, janela de 7 dias, função interna antiga, tela antiga ainda em uso, função interna recente.
  - **T6.7** Início (cartões e "O que precisa de você" com as contas à mão), Solicitante e Consulta, Unidades (campos públicos e escopo), ponte com a Assistência e as pastas (PGT e POP), sem dado de outro cliente.
  - **T6.8** manual do cliente (Portal e docs, sem termos internos, 21 imagens existentes, versão A4), ajuda, dicas, guias, manual interno, base do assistente e mapa de erros.
- `portal-cliente-etapa6-navegador-20261118.test.cjs` (1 teste, cerca de 1 minuto): o SGO+ de verdade no navegador com o servidor simulado **aceitando só a lista mínima**, a 1366, 390 e 320 px: menu do Gestor e da Consulta; entrada no Início; cada item antigo → tela nova; pastas com PGT e POP; Unidades sem o responsável interno; prontuário da ficha; ciclos e ajuda pela ponte; **nenhuma função fora da lista mínima chamada**; sem erro de JavaScript e sem rolagem lateral; a equipe com o menu dela e o painel "Pronto para ligar?".

**Capturas reais** (Index.html com os includes da cand19, servidor simulado só com a lista mínima) a 1366, 390 e 320 px em `etapa6/capturas/` (Início, Documentos > Por pastas, Documentos técnicos, Unidades com as pastas da unidade, Meus equipamentos, ficha do equipamento com o prontuário, Chamados, ficha com visita, ficha com o relatório do atendimento, Relatórios de ciclo, e a aba Segurança da equipe com "Pronto para ligar?"). Resultado (`capturas/conferencia.txt`): **sem rolagem lateral, sem erro de JavaScript e o cliente chamou só funções da lista mínima**.

**Suíte completa** (`etapa6/suite.txt`):

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência (etapa 5, produção cand18) | 260 | 2493 | 0 |
| **Rodada final (cand19)** | **262** | **2502** | **0** |

Nenhum arquivo terminou com código de saída diferente de zero (`arquivos_com_saida_nao_zero=0`; o log termina com `saida=0`). A diferença em relação à referência são os dois testes novos: 2 arquivos e 9 testes a mais. A linha alterada no teste de documentos por pasta continua aprovada. A suíte rodou numa única rodada, sem falha de tempo.

**Antes da suíte:** lista dirigida (Portal etapas 0 a 6, acesso do cliente, ajuda sem recurso administrativo, assistente, navegação, documentos por pasta, ciclo da lavadora, Assistência, Representação, login, segurança do acesso e contratos): 0 falhas depois de três ajustes (id do painel sem dica, manual do cliente fora da base do assistente e o servidor simulado do teste de pastas).

**Observação sobre o comando:** `DEST=cand19` do pedido não existe na raiz do repositório (o redirecionador resolve o caminho a partir da raiz); a suíte e as listas rodaram com `DEST=output/financeiro-20261116/cand19`.
