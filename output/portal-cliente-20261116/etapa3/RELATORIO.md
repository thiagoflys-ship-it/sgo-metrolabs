# Portal do cliente — Etapa 3 (c), Documentos, equipamentos, histórico, vencimentos e cronograma: relatório de implementação

**Data:** 18/11/2026. **Onde:** `output/financeiro-20261116/cand16` (cópia idêntica à produção cand15, conferida por comparação de pastas antes de começar). O trabalho também mexeu em `tests/` e `docs/`.
**Restrições respeitadas:** nada foi publicado nem commitado; não houve acesso à produção, ao servidor nem ao banco. Ficaram intocados o Financeiro e o sigilo, o bloqueio da Frota e o rastreador, o chat do RH360, os documentos PGT/POP gerados e o cofre. Nenhum dado real foi inventado: nomes, documentos e contratos dos testes e das capturas são fictícios. O servidor Node não mudou: a tela do cliente chama só `PortalCliente_api`, que já está em `PCL_FUNCOES_CLIENTE` (o teste confere). Nenhum aviso novo (PC07 e PC08 ficam para a etapa 4).
**Especificação:** `ESPEC_PORTAL_CLIENTE.md`, "Etapa 3 (c)", itens 4.1.5, 4.1.6, 4.1.7, 4.3 a 4.7, seção 3 e T3.1 a T3.9, mais as três pendências de filtro por unidade deixadas pela etapa 1.

## 1. O que foi feito

### 1.1 Documentos técnicos (conta de cliente; item 4.1.5)
- **Sem segundo agregador.** A lista reaproveita o índice de "Documentos em pastas" (`Docs_indice_`, `Docs_leitor_`, `Docs_visivel_`, `Docs_itemTela_`, `Docs_agruparLista_`). Ele já tira rascunho, minuta, versão interna, suspenso, inativo e a pasta de contratos, e já respeita o cliente e as unidades da conta.
- **Por cima, duas regras novas:**
  - **tipos visíveis** (decisão 17): certificado de calibração, relatório de qualificação, laudo NR-13, relatório de atendimento, cronograma de execução, relatório do ciclo da lavadora e relatório de ronda. Configurável em Regras do portal (merge com as outras regras e histórico);
  - **coluna `PORTAL` em `DOC_DOCUMENTOS`**: '' segue o tipo; `OCULTO` esconde da lista e da abertura em **todas** as telas do cliente (Arquivo de documentos antigo, documentos por pasta, QR Code, central de vencimentos, trava `/arquivos`); `VISIVEL` libera um documento de tipo fora da lista. A marca do Arquivo vale também quando o mesmo arquivo vem de outro módulo.
- **Filtros:** unidade, equipamento, tipo, emissão, "vence até" e busca. Versões anteriores ficam guardadas abaixo do documento.
- **Abrir:** ação `abrirDocumento` confere que o documento está na lista da pessoa, chama `PortalCliente_arquivoPermitido_` e grava `DOCUMENTO_ABERTO` em `PCL_ACESSOS`. Outro cliente, outra unidade, oculto ou inexistente: a mesma resposta ("Não encontrado. Atualize a lista."); quando o documento existe para outro, fica `ESCOPO_RECUSADO`. A janela nasce no toque, para o navegador não bloquear.
- **Projeção pública** (`PCl_docPortalPublico_`): sem pasta, link do Drive, código de arquivo solto, quem registrou nem a marca interna.

### 1.2 Meus equipamentos (4.1.6)
- Lista com **farol** por categoria (calibração, qualificação, NR-13, manutenção): em dia, vence em até 30 dias, vencido, sem registro. O farol usa o **mesmo motor** da central de pendências (`Pend_vencimentosBase_`, extraído de `Pend_fonteDocumentos_` sem mudar o comportamento da central). Manutenção = documento com validade cujo tipo fala de manutenção.
- **Ficha:** dados públicos (`PCl_eqPublico_`), vencimentos, documentos, **histórico** (`SGO_Atendimentos_doEquipamento_` em modo cliente, filtrado para atendimentos encerrados, sem técnico e sem link do Auvo), chamados, "Abrir chamado para este equipamento" e "Informar correção de cadastro" (mensagem na Conversa geral; o cliente não edita cadastro).

### 1.3 Vencimentos e cronograma (4.1.7)
- **Vencimentos:** `PCl_vencimentos_` (leitura própria do motor), por equipamento e categoria, com data, dias e documento de origem; filtros de unidade, categoria e janela (30/60/90/todos; vencidos sempre).
- **Cronograma** (`PCl_cronograma_`), três blocos separados e a frase fixa da espec:
  - **Agendado:** O.S. com data de hoje em diante ou em andamento, rondas e visitas de chamado (sem nome de técnico);
  - **Previsto:** validade do documento mais recente (12 meses à frente; vencido marcado "a programar") e janelas da periodicidade de `CLI_CONTRATOS.SERVICOS_JSON`, contadas do início do contrato e só dentro da vigência ("sob demanda" não gera);
  - **Documento:** o PDF do Cronograma de execução.
- Situação: PLENO, CARENCIA e CONSULTA leem e abrem; SUSPENSO e SEM_ACESSO recebem a recusa com o texto neutro e `ACESSO_RECUSADO` no registro.

### 1.4 Documentos no portal (equipe)
- Aba nova na tela Portal do cliente, caixa nova **`PORTAL_CLIENTE_DOC_LIBERAR`** (padrão: gestor da área Técnica ou Qualidade, Diretoria, Administrador). Por cliente, cada documento aparece com "Aparece/Não aparece" e o porquê; filtro e busca; marca com motivo (≥ 10 letras), gravada por merge (`PORTAL`, `PORTAL_MOTIVO`, `PORTAL_POR_NOME`, `PORTAL_EM`) e no histórico das regras ("Documento no portal").
- Regras do portal ganhou "Tipos de documento visíveis" (pelo menos um marcado).

### 1.5 Pendências da etapa 1 (filtro por unidade) — fechadas
- **Prontuário pelo QR Code:** `qrcodeAcessar` (resposta de inexistente + `ESCOPO_RECUSADO`; a conta de cliente recebe só os campos públicos do equipamento) e a qualificação do prontuário (`SGO_QEQ_equipamentoVisivel_`: lista, ficha e abertura).
- **Relatórios de ciclo da lavadora:** `LavCic_eu_` passa a levar o escopo; equipamentos, relatórios, busca, painel e ficha só das unidades da pessoa; equipamento de outra unidade = inexistente.
- **Vencimentos da central para o cliente:** `Pend_podeVer_` confere a unidade do item (do documento ou do equipamento) e tira o documento oculto. A equipe vê como antes.

### 1.6 Ajuda e manual
- `PCL_DICAS` para todos os campos novos (o teste confere) e guias `documentos`, `equipamentos`, `fichaEquipamento`, `vencimentos`, `cronograma` e `documentosPortal`.
- Ajuda das telas `portal_cliente_documentos`, `portal_cliente_equipamentos` e `portal_cliente_vencimentos` (texto do cliente, sem recurso administrativo) e um passo novo na ajuda de Contratos de clientes; nomes em `SGO_Ajuda.js`; `JS_PortalCliente_Documentos` no mapa de erros do assistente.
- Manual: seção 25 (25.1 a 25.9) e linhas novas em "Quem pode" e "Tabelas". Base do assistente regerada (`_tools/gerar_base_assistente.cjs --docs docs --saida .../cand16/SGO_AssistenteManuais.js`); só as seções do Portal mudaram.

## 2. Lista exata de arquivos (relativos à cand16)

**Legado, novos (LF):** `SGO_PortalCliente_Documentos.js`, `JS_PortalCliente_Documentos.html`.

**Legado, alterados:**
- `SGO_PortalCliente.js`, `SGO_PortalCliente_Config.js` (LF); `SGO_PortalCliente_Seguranca.js` (CRLF preservado)
- `SGO_DocumentosPastas.js`, `SGO_Alertas_Central.js`, `SGO_LavCiclo_Main.js` (LF); `SGO_QRCode.js`, `SGO_QualifEquipamento.js` (CRLF preservado)
- `Index.html`, `JS_Core.html`, `JS_PortalCliente.html`, `JS_PortalCliente_Acessos.html`, `JS_PortalCliente_Ajuda.html` (LF)
- `SGO_Ajuda.js`, `SGO_Ajuda_PortalCliente.js`, `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (regerado) (LF)

Fins de linha conferidos com leitura byte a byte depois das edições (os CRLF continuam inteiramente CRLF; os LF continuam LF); sintaxe de todos conferida.

**Testes:** `tests/portal-cliente-etapa3-20261118.test.cjs` (novo, 14 testes). Nenhum teste existente foi alterado.
**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`.
**Entregas (`output/portal-cliente-20261116/etapa3/`):** `RELATORIO.md`, `legado-etapa3.patch` (diff cand15 → cand16), `suite.txt`, `suite-rodada1.txt`, `suite-execucao.log`, `capturas.cjs`, `capturas/` (30 capturas e `conferencia.txt`), `capturas-suite/`.

## 3. Decisões adotadas e o que ficou configurável

| Assunto | Adotado | Onde mudar |
|---|---|---|
| Tipos visíveis | Os sete da decisão 17, exatamente | Regras do portal > Documentos no portal |
| PGT/POP | **Fora da lista** (decisão 17). Ver risco 1 | Regras do portal (marcar "PGT e POP") ou liberar um a um |
| Onde a lista de tipos vale | Nas telas novas do portal. As telas antigas (Arquivo de documentos, QR Code) seguem como estavam até a etapa 6, exceto o `OCULTO`, que vale em todas | código (etapa 6) |
| Categoria "manutenção" do farol | Documento com validade cujo tipo cita manutenção, preventiva ou corretiva | código |
| Previsto pelo contrato | Janelas a partir do início do contrato, dentro da vigência, 12 meses à frente; "sob demanda" não gera | Contratos (periodicidade) |
| Histórico | Só encerrados (inclusive Auvo), sem técnico (decisão 8) e sem link do Auvo | código |
| Caixa da marca | Nova `PORTAL_CLIENTE_DOC_LIBERAR` (item 4.6) | Administração > Acessos |
| Nomes no menu do cliente | "Documentos técnicos", "Meus equipamentos", "Vencimentos e cronograma", para não confundir com os itens antigos "Equipamentos" e "Arquivo de documentos" até a etapa 6 | Index.html |

**Dado real que não existe:** nenhum novo nesta etapa. Continuam pendentes do dono, das etapas anteriores, o contato do encarregado de dados (LGPD) e o telefone de plantão. A periodicidade dos serviços só gera "Previsto" quando o contrato real estiver cadastrado com ela (os clientes em vigência provisória não têm serviços cadastrados).

## 4. O que ficou de fora, e por quê
- **Avisos PC07 (documento novo) e PC08 (vencimento):** etapa 4, como manda a tarefa.
- **Troca dos itens antigos do menu do cliente** (Equipamentos, Arquivo de documentos, Relatórios de ciclo) pelas telas novas: etapa 6. Até lá as duas convivem.
- **Marca `PORTAL` para documento sem registro no Arquivo de documentos** (certificado, laudo ou O.S. só na tabela do módulo): a coluna existe só em `DOC_DOCUMENTOS` (item 4.3); esses seguem a regra do tipo. A tela da equipe diz isso.
- **Previsto por equipamento a partir da última preventiva executada:** não há como ligar o serviço do contrato a cada equipamento sem inventar; o previsto do contrato sai por unidade.
- **`redirectUrl` do QR Code para a conta de cliente** (link da pasta do Drive): mantido como estava, para não quebrar o fluxo do QR; o arquivo da pasta continua privado.

## 5. Riscos a conferir antes de publicar
1. **PGT/POP:** pela decisão 17 não aparece na tela nova "Documentos técnicos", mas continua no Arquivo de documentos antigo e no QR Code (pedido da Priscilla de 17/11). Confirmar com o dono se marca "PGT e POP" na lista.
2. **Coluna `PORTAL`** nasce na primeira marcação (`PClD_garantirColunas_`, antes da gravação). Conferir no banco real que `CertCal_garantirColuna_` cria as quatro colunas.
3. **Central de pendências:** o cálculo dos vencimentos virou função (`Pend_vencimentosBase_`), com a mesma regra. O teste de equivalência e a suíte passaram; conferir no uso real a quantidade de itens da central da equipe antes e depois.
4. **Desempenho:** "Documentos técnicos" e o cronograma leem o índice inteiro de documentos a cada chamada (como a tela de pastas já faz). Conferir o tempo com o volume real de um cliente grande.
5. **Solicitante com relatório de ciclo sem unidade gravada:** passa a valer a unidade do equipamento; relatório de equipamento sem unidade deixa de aparecer para quem tem unidades marcadas (regra padrão de negar).
6. **Conferir no uso real:** a aba nova abrindo o PDF pela rota `/arquivos` (nas capturas não há servidor de arquivos) e a tela no celular de um cliente.

## 6. Testes e placar

**Teste novo** `tests/portal-cliente-etapa3-20261118.test.cjs` (14 testes, todos aprovados): T3.1 a T3.9 (um teste para cada), filtro por unidade no QR Code e na qualificação, nos relatórios de ciclo e na central, "Documentos no portal" com caixa, portão de funções e projeção (chaves proibidas e nenhum `Date` cru), tela, ajuda e manual.

**Antes da suíte:** etapas 0, 1 e 2 do portal, documentos por pasta, relatório do ciclo da lavadora, pendências e assistente: todos com 0 falhas.

**Capturas reais** (Index.html com os includes da cand16, servidor simulado) a 1366, 390 e 320 px em `etapa3/capturas/`: cliente (documentos, documento aberto, equipamentos, ficha, vencimentos, cronograma), Solicitante (documentos, equipamentos), equipe (Documentos no portal, Regras com os tipos). **Sem rolagem lateral e sem erro de JavaScript** (`capturas/conferencia.txt`). Script: `etapa3/capturas.cjs`.

**Suíte completa** (`etapa3/suite.txt`):

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência (etapa 2, cand15) | 257 | 2458 | 0 |
| Rodada 1 (`suite-rodada1.txt`) | 258 | 2471 | 1 |
| **Rodada final** | **258** | **2472** | **0** |

A falha da rodada 1 era de `navegacao-subniveis`: a ajuda nova dizia que o documento "abre numa aba nova" sem a frase do celular. Conferi que a tela usa `window.open`, que no celular vira o visualizador interno do SGO+, e acrescentei "No celular, o documento abre dentro do SGO+, com Voltar e Imprimir." à ajuda e ao manual. Depois regerei a base do assistente. Nenhum arquivo terminou com código de saída diferente de zero. A diferença em relação à referência é o teste novo: 1 arquivo e 14 testes a mais.
