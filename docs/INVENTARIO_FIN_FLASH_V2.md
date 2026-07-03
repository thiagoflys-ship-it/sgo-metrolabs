# Inventario — FIN Flash V2

**Atualizado em:** 2026-06-26  
**Fase:** Fundacao limpa local criada; nada foi conectado ao menu, publicado ou executado no banco.

## Regras preservadas

- Flash antigo intocado.
- Nenhuma aba, dado ou extrato existente foi alterado.
- Nenhum deploy, producao, importacao real ou `--force` executado.
- Sem `prompt()` e `confirm()`.
- Todo registro de teste previsto usa `AMBIENTE_TESTE = SIM`.

## Arquivos V2

| Arquivo | Conteudo |
|---|---|
| `SGO_Fin_FlashV2_Setup.js` | schemas, auditoria estrutural, setup manual confirmado, usuario de teste e limpeza exclusiva de testes |
| `SGO_Fin_FlashV2.js` | mapeamento read-only do extrato, auditoria de prontidao e previa de classificacao sem aprovacao automatica |
| `JS_Fin_FlashV2.html` | componente isolado de auditoria; ainda fora do menu |

## Abas previstas

`FIN_FLASH_V2_CONTAS`, `FIN_FLASH_V2_CARTOES`, `FIN_FLASH_V2_RECARGAS`,
`FIN_FLASH_V2_PRESTACOES`, `FIN_FLASH_V2_EXTRATOS`,
`FIN_FLASH_V2_CONCILIACOES`, `FIN_FLASH_V2_PENDENCIAS`,
`FIN_FLASH_V2_DOCUMENTOS`, `FIN_FLASH_V2_TERMOS`, `FIN_FLASH_V2_ALERTAS`,
`FIN_FLASH_V2_LOGS`, `FIN_FLASH_V2_CONFIG`.

## Funcoes entregues

- `AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR()`
- `SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO(confirmacao)`
- `CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO(confirmacao)`
- `AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR()`
- `MAPEAR_EXTRATO_FLASH_V2_SEM_GRAVAR(cabecalhos)`
- `AUDITAR_FIN_FLASH_V2_PRONTO_PARA_IMPORTACAO_SEM_GRAVAR(cabecalhos)`
- `LIMPAR_FIN_FLASH_V2_TESTES_ANTES_GO_LIVE_MANUAL_AUTORIZADO(confirmacao)`
- `FIN_FLASH_V2_CLASSIFICAR_PREVIA_SEM_GRAVAR(extrato, prestacao)`

## Validacoes locais

- `node --check SGO_Fin_FlashV2.js`: OK.
- `node --check SGO_Fin_FlashV2_Setup.js`: OK.
- Nenhuma funcao de importacao real foi criada.

## Proximos passos

1. Revisar o schema e publicar somente no DEV, com autorizacao explicita.
2. Rodar primeiro a auditoria estrutural (sem gravacao).
3. Apenas apos resultado aprovado, executar setup com a frase exigida.
4. Criar e auditar o usuario ficticio de teste.
5. Testar mapeamento usando apenas cabecalhos/arquivo de teste.
6. Criar importador real somente em pacote posterior, com nova autorizacao.

## 2026-06-26 — GCP DEV dedicado criado e API Executable parcialmente configurado

- Projeto GCP criado: `sgo-fin-flash-v2-dev` / `104035470061`.
- Apps Script API habilitada no projeto DEV dedicado.
- `.clasp.json` recebeu `projectId` local do DEV dedicado.
- `appsscript.json` recebeu `executionApi.access = MYSELF`.
- `clasp push` normal concluído sem `--force`.
- Deployment API Executable DEV criado na versão `226`.
- Execução remota 0A ainda bloqueada por OAuth Desktop Client dedicado não configurado no `clasp`.
- 0B/setup não executado; abas e usuário de teste não criados; produção intocada.

## 2026-06-26 — FIN_FLASH_V2.GCP-DEV-C OAuth Desktop Client

- OAuth Desktop Client dedicado do projeto `sgo-fin-flash-v2-dev` localizado em pasta segura fora do Git: `C:\tmp\fin_flash_v2_oauth`.
- `.gitignore` atualizado para proteger `client_secret*.json` e variações.
- Conteúdo do client secret não foi lido, exibido ou documentado.
- `clasp login --creds ... --user fin_flash_v2_dev --use-project-scopes --include-clasp-scopes` iniciado.
- Autorização OAuth no navegador ainda não retornou ao terminal nesta rodada.
- 0A remota não executada; 0B/setup não executado; produção intocada.

## 2026-06-26 16:16:17 -03:00 — Login OAuth dedicado concluído

- Login dedicado do `clasp` reaberto e concluído com sucesso.
- Conta autorizada confirmada: `thiagoflys@gmail.com`.
- OAuth Client confirmado pelo `clasp`: `104035470061-0smt5esji2c0cabklep1g6b5alq2t6u9.apps.googleusercontent.com` (`user-provided`).
- Arquivo de credencial usado permanece fora do repositório em `C:\tmp\fin_flash_v2_oauth`.
- Conteúdo do `client_secret` não foi lido, exibido ou documentado.
- 0A não executada nesta etapa, conforme solicitação.
- 0B não executada nesta etapa, conforme solicitação.
- Produção não alterada; sem deploy; sem `--force`.

## 2026-06-26 16:19:20 -03:00 — FIN_FLASH_V2.GCP-DEV-D execução 0A/0B

- `.clasp.json` confirmado no DEV com `projectId: sgo-fin-flash-v2-dev`.
- OAuth dedicado confirmado para `thiagoflys@gmail.com` com client `user-provided` do projeto `104035470061`.
- 0A remota tentada com `clasp --user fin_flash_v2_dev run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR`.
- 0A remota também tentada com a sintaxe `clasp run ... --user fin_flash_v2_dev`.
- Resultado das duas tentativas: `Unable to run script function. Please make sure you have permission to run the script function.`
- 0A não retornou JSON e não aprovou.
- 0B/setup não executado por regra de segurança.
- Produção intocada; sem deploy webapp; sem `--force`; sem importação; menu não ligado.

## 2026-06-26 16:29:32 -03:00 — FIN_FLASH_V2.GCP-DEV-E diagnóstico Execution API

- Diagnóstico executado somente no DEV.
- `.clasp.json` confirmado com script DEV e `projectId: sgo-fin-flash-v2-dev`.
- `clasp login --status` não é suportado nesta versão; usado `show-authorized-user`.
- OAuth dedicado confirmado para `thiagoflys@gmail.com`, client `user-provided` do projeto `104035470061`.
- Conta `thiagoflys@gmail.com` confirmada como owner do projeto GCP `sgo-fin-flash-v2-dev`.
- Apps Script API confirmou `thiagoflys@gmail.com` como criador/modificador do Apps Script DEV.
- Versão 226 clonada em `C:\tmp` contém a função 0A.
- Criada função read-only `EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR()` em `SGO_Fin_FlashV2.js`.
- Validações locais OK: `node --check`, ausência de `prompt()/confirm()`, `git diff --check` sem erro.
- `clasp --user fin_flash_v2_dev push` executado sem `--force`.
- Novo deployment diagnóstico criado: `AKfycbw418p8BQN0xwrv8SEZoG-lEjCOyYH1l_zRVyzjeejOokvWJdJp_2ucTgiKnHUjBUKXWA @227`.
- Versão 227 clonada em `C:\tmp` contém ping, 0A e `executionApi.access = MYSELF`.
- Ping via `clasp run` falhou com `Unable to run script function. Please make sure you have permission to run the script function.`
- Ping via REST `scripts.run` falhou com `403 PERMISSION_DENIED` em `devMode:true`; `devMode:false` retornou `404 NOT_FOUND`.
- Token OAuth dedicado validado com escopos corretos.
- Diagnóstico provável: associação real do Apps Script DEV ao GCP `sgo-fin-flash-v2-dev / 104035470061` ainda precisa ser confirmada/ajustada na UI do editor Apps Script.
- 0A não foi reexecutada após ping falhar; 0B/setup não executado; abas e usuário teste não criados; produção intocada.

## 2026-06-26 16:51:19 -03:00 — FIN_FLASH_V2.GCP-DEV-F associação real confirmada e setup 0B aprovado

- Ping Execution API passou no DEV: `success:true`, `ping:true`, `ambiente:DEV`.
- Associação real Apps Script DEV/GCP `sgo-fin-flash-v2-dev / 104035470061` confirmada por execução remota bem-sucedida.
- 0A remota executada e aprovada: `success:true`, `ok:true`, `bloqueios:[]`, `somenteLeitura:true`.
- 0B executada após 0A; primeira execução criou/validou 12 abas, mas auditoria de usuário/cartões falhou por CPF/final tratados como número/texto pela planilha.
- Corrigido `SGO_Fin_FlashV2_Setup.js` para gravar CPF `00000000000` e finais `9999/8888` como texto e auditar por índices de cabeçalho.
- Validações locais OK: `node --check`, ausência de `prompt()/confirm()`, `git diff --check` sem erro.
- `clasp --user fin_flash_v2_dev push` executado sem `--force`.
- 0B reexecutada e aprovada: 12 abas criadas/validadas, usuário fictício validado, cartões físico/virtual validados, `AMBIENTE_TESTE=SIM` confirmado.
- Menu não ligado; importação real não executada; deploy webapp não executado; produção e Flash antigo intocados.

## 2026-06-26 16:59:21 -03:00 — FIN_FLASH_V2.1 mobile prestação com comprovante obrigatório

- Backend mobile criado em `SGO_Fin_FlashV2.js`.
- Função principal criada: `FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV(payload)`.
- Upload seguro criado: `FIN_FLASH_V2_UPLOAD_COMPROVANTE_SEGURO_DEV_(arquivo, contexto)`.
- Orquestradora criada: `EXECUTAR_FIN_FLASH_V2_1_TESTE_MOBILE_AUTOMATICO_DEV()`.
- Comprovante obrigatório implementado: foto/print/imagem/PDF, com extensão/MIME/tamanho validados.
- CPF não é escolhido pelo colaborador; é resolvido pela conta vinculada ao e-mail logado. Em DEV, o teste simula e-mail, não CPF.
- Prestação válida grava `FIN_FLASH_V2_PRESTACOES`, comprovante em `FIN_FLASH_V2_DOCUMENTOS` e log em `FIN_FLASH_V2_LOGS`.
- Tela isolada criada em `JS_Fin_FlashV2.html` com bloco `FIN_FLASH_V2_MOBILE()`, sem ligação no menu principal.
- Validações locais OK: `node --check`, `git diff --check`, ausência de `prompt()/confirm()`.
- `clasp --user fin_flash_v2_dev push` executado sem `--force`.
- Orquestradora V2.1 executada via `clasp run` e via REST para capturar JSON completo.
- Resultado: sucesso; bloqueios negativos aprovados; dados de teste com `AMBIENTE_TESTE=SIM`; produção/Flash antigo/menu/importação real intocados.

## 2026-06-26 17:09:43 -03:00 — FIN_FLASH_V2.2 importação segura do extrato Flash em DEV

- Backend de importação segura criado em `SGO_Fin_FlashV2.js`.
- Criadas funções: `FIN_FLASH_V2_MAPEAR_EXTRATO_FLASH_DEV_SEM_GRAVAR`, `FIN_FLASH_V2_IMPORTAR_EXTRATO_FLASH_DEV`, `FIN_FLASH_V2_GERAR_CHAVE_EXTRATO_`, `EXECUTAR_FIN_FLASH_V2_2_TESTE_IMPORTACAO_EXTRATO_AUTOMATICO_DEV`.
- Modelo Flash validado: Data, Movimentação, Valor, Pessoa, Pagamento, Prestação de contas.
- Valor negativo vira gasto com status `GASTO_IMPORTADO_AGUARDANDO_PRESTACAO` e pendência `AGUARDANDO_CONCILIACAO`.
- Valor positivo vira recarga com status `RECARGA_IMPORTADA` e grava também `FIN_FLASH_V2_RECARGAS`.
- Chave idempotente criada por data + pessoa + valor + movimentação + pagamento; duplicidade retorna `EXTRATO_DUPLICADO_IGNORADO`.
- Teste automático executado somente no DEV com massa simulada; sem importação real de produção.
- Orquestradora ajustada para massa única por execução e duplicidade testada dentro da rodada.
- Validações locais OK: `node --check`, `git diff --check`, ausência de `prompt()/confirm()`.
- `clasp --user fin_flash_v2_dev push` executado sem `--force`.
- Orquestradora V2.2 aprovada: mapeamento OK, gasto negativo importado, recarga positiva importada, duplicidade bloqueada, `AMBIENTE_TESTE=SIM`, produção e Flash antigo intocados, menu desligado.

## 2026-06-26 17:37:04 -03:00 — FIN_FLASH_V2.3 conciliação automática aprovada

- Backend de conciliação automática criado em `SGO_Fin_FlashV2.js`.
- Criadas funções: `FIN_FLASH_V2_CONCILIAR_AUTOMATICAMENTE_DEV`, `FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_`, `FIN_FLASH_V2_CALCULAR_SCORE_CONCILIACAO_`, `EXECUTAR_FIN_FLASH_V2_3_TESTE_CONCILIACAO_AUTOMATICA_DEV`.
- Score considera CPF, valor, data, comprovante, categoria e justificativa.
- IA configurada como apoio apenas: `iaAprovaSozinha:false`.
- Conciliação grava `FIN_FLASH_V2_CONCILIACOES`, pendências em `FIN_FLASH_V2_PENDENCIAS` e logs em `FIN_FLASH_V2_LOGS`.
- Status validados: `CONCILIADO_AUTOMATICO`, `PENDENTE_SEM_PRESTACAO`, `PENDENTE_SEM_COMPROVANTE`, `PENDENTE_VALOR_DIVERGENTE`, `AGUARDANDO_EXTRATO`, `PENDENTE_JUSTIFICATIVA_INSUFICIENTE`.
- Validações locais OK: `node --check`, `git diff --check`, ausência de `prompt()/confirm()`.
- `clasp --user fin_flash_v2_dev push` executado sem `--force`.
- Orquestradora V2.3 aprovada via `clasp run` e JSON completo capturado via REST.
- Produção e Flash antigo intocados; menu desligado; sem deploy webapp; sem importação real em produção.

## 2026-06-26 — FIN_FLASH_V2.4 dashboard financeiro e desktop de conferência

- Backend de dashboard e listagens criado em `SGO_Fin_FlashV2.js`.
- Criadas funções: `FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV`, `FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV`, `FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV`, `FIN_FLASH_V2_LISTAR_PRESTACOES_DEV`, `FIN_FLASH_V2_LISTAR_EXTRATOS_DEV`, `FIN_FLASH_V2_LISTAR_DOCUMENTOS_DEV`, `FIN_FLASH_V2_LISTAR_LOGS_DEV`, `FIN_FLASH_V2_OBTER_DETALHE_CONCILIACAO_DEV`, `EXECUTAR_FIN_FLASH_V2_4_TESTE_DASHBOARD_DESKTOP_DEV`.
- KPIs implementados: contas Flash, cartões ativos, total recarregado, total gasto, total conciliado, total pendente, pendências críticas e prestações aguardando conferência.
- Tela desktop isolada criada em `JS_Fin_FlashV2.html` com `FIN_FLASH_V2_DESKTOP()`.
- Abas internas previstas: Dashboard, Contas/Colaboradores, Cartões, Recargas, Prestações Mobile, Extratos Importados, Conciliações, Pendências, Documentos/Comprovantes e Logs/Auditoria.
- Tabelas de pendências e conciliações preparadas para conferência financeira.
- Menu principal continua desligado para o FIN_FLASH_V2; a tela permanece isolada.
- Sem deploy webapp, sem `--force`, sem importação real em produção, produção e Flash antigo intocados.
- Documento do pacote criado: `docs/FIN_FLASH_V2_4_DASHBOARD_DESKTOP.md`.
- Próximo passo: `git diff --check`, `clasp push` normal no DEV e execução remota da orquestradora V2.4.

## 2026-06-26 21:03 — FIN_FLASH_V2.4 aprovado no DEV

- `clasp --user fin_flash_v2_dev push` normal concluído às 21:02:33, sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_4_TESTE_DASHBOARD_DESKTOP_DEV` executada via `clasp run` e aprovada.
- Resultado: `success:true`, `ok:true`, `bloqueios:[]`, `avisos:[]`.
- Dashboard/listagens/detalhe validados: KPIs, pendências, conciliações, prestações, extratos, documentos e logs.
- Totais DEV no teste: extratos 56, prestações 52, documentos 2, conciliações 63, pendências 110, logs 138.
- KPIs DEV no teste: contas 2, cartões ativos 4, recarregado 750, gasto 2056.7, conciliado 180, pendências 110, críticas 8, prestações aguardando 52.
- `AMBIENTE_TESTE=SIM` validado nas amostras do teste.
- Produção e Flash antigo intocados; menu desligado; sem deploy webapp; sem importação real em produção.

## 2026-06-26 — FIN_FLASH_V2.5 ações de conferência financeira

- Backend de ações financeiras criado em `SGO_Fin_FlashV2.js`.
- Criadas funções: `FIN_FLASH_V2_MARCAR_CONCILIACAO_CONFERIDA_DEV`, `FIN_FLASH_V2_SOLICITAR_CORRECAO_COLABORADOR_DEV`, `FIN_FLASH_V2_MANTER_PENDENCIA_DEV`, `FIN_FLASH_V2_MARCAR_PENDENCIA_RESOLVIDA_DEV`, `FIN_FLASH_V2_BLOQUEAR_RECARGAS_POR_PENDENCIA_DEV`, `FIN_FLASH_V2_DESBLOQUEAR_RECARGAS_DEV`, `FIN_FLASH_V2_PREPARAR_MENSAGEM_COBRANCA_PENDENCIA_DEV`, `EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV`.
- Conferência financeira bloqueia gasto sem comprovante e gasto com divergência crítica.
- Bloqueio de recargas é operacional no SGO+ via status da conta, sem bloquear cartão físico diretamente na Flash.
- Solicitação de correção e mensagem de cobrança criam alertas, sem envio automático.
- Toda ação registra log em `FIN_FLASH_V2_LOGS`.
- Tela desktop isolada recebeu painel `FIN_FLASH_V2_ACOES_FINANCEIRAS()` com botões de ação e campos internos controlados, sem `prompt()` e sem `confirm()`.
- Menu principal continua desligado; sem deploy webapp; sem `--force`; produção e Flash antigo intocados.
- Documento do pacote criado: `docs/FIN_FLASH_V2_5_ACOES_CONFERENCIA_FINANCEIRA.md`.
- Próximo passo: `git diff --check`, `clasp push` normal no DEV e execução remota da orquestradora V2.5.

## 2026-06-26 21:16 — FIN_FLASH_V2.5 aprovado no DEV

- `clasp --user fin_flash_v2_dev push` normal concluído às 21:13:08, sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV` executada via `clasp run` e aprovada.
- JSON completo capturado via Apps Script API para documentação.
- Resultado: `success:true`, `ok:true`, `bloqueios:[]`, `avisos:[]`.
- Validados: marcar conferido, bloquear conferido sem comprovante, solicitar correção, manter pendência, resolver pendência, bloquear recargas, desbloquear recargas e preparar mensagem de cobrança sem envio.
- Logs criados para ações financeiras e alertas criados onde aplicável.
- Bloqueio de recarga confirmado como operacional no SGO+, sem bloqueio direto do cartão físico na Flash.
- `AMBIENTE_TESTE=SIM` validado nas ações de teste.
- Produção e Flash antigo intocados; menu desligado; sem deploy webapp; sem importação real em produção; sem `--force`.

## 2026-06-26 — FIN_FLASH_V2.6 documentos, relatórios e termo de uso

- Camada documental criada em `SGO_Fin_FlashV2.js`.
- Constante criada: `FIN_FLASH_V2_TERMO_VERSAO_ATUAL = 'FIN-FLASH-V2-TERMO-001'`.
- Funções internas criadas: `FIN_FLASH_V2_termoTexto_()`.
- Funções criadas: `FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_POSITIVA_DEV`, `FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_NEGATIVA_DEV`, `FIN_FLASH_V2_GERAR_RELATORIO_PENDENCIAS_COLABORADOR_DEV`, `FIN_FLASH_V2_GERAR_TERMO_USO_CARTAO_FLASH_DEV`, `FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV`, `FIN_FLASH_V2_REGISTRAR_ACEITE_TERMO_DEV`, `EXECUTAR_FIN_FLASH_V2_6_TESTE_DOCUMENTOS_TERMO_DEV`.
- Relatórios gravam em `FIN_FLASH_V2_DOCUMENTOS` com TIPO específico e hash de conteúdo.
- Termo versão `FIN-FLASH-V2-TERMO-001` com 8 cláusulas; grava em `FIN_FLASH_V2_TERMOS` (STATUS=VIGENTE) e `FIN_FLASH_V2_DOCUMENTOS`.
- Aceite grava em `FIN_FLASH_V2_TERMOS` (STATUS=ACEITO) com CPF, versão, data/hora.
- CPF no aceite gravado como texto via `setNumberFormat('@')`.
- Toda ação gera log em `FIN_FLASH_V2_LOGS`.
- Termo não permite desconto automático: cláusula 6 exige apuração formal prévia.
- Desktop atualizado: nova aba **Documentos/Relatórios** com `FIN_FLASH_V2_PAINEL_DOCUMENTOS_RELATORIOS_()`, tabela de documentos e 5 botões de ação.
- Mobile atualizado: nova seção `FIN_FLASH_V2_MOBILE_TERMO()` com leitura e aceite do termo.
- Menu principal desligado; sem deploy webapp; sem `--force`; produção e Flash antigo intocados.
- Documento do pacote criado: `docs/FIN_FLASH_V2_6_DOCUMENTOS_RELATORIOS_TERMO.md`.
- Próximo passo: `git diff --check`, `clasp push` normal no DEV e execução remota da orquestradora V2.6.

## 2026-06-26 21:43 — FIN_FLASH_V2.6 aprovado no DEV

- `clasp --user fin_flash_v2_dev push` normal concluído às 21:43:08, sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_6_TESTE_DOCUMENTOS_TERMO_DEV` executada via `clasp run` e aprovada.
- Resultado: `success:true`, `ok:true`, `bloqueios:[]`, `avisos:[]`.
- Validados: relatório positivo (9 conciliações, R$270), relatório negativo (72 pendências, R$2.330), relatório por colaborador (2 colaboradores, 140 pendências), termo gerado e vigente, termo obtido em leitura, aceite registrado.
- Dados DEV: termo versão `FIN-FLASH-V2-TERMO-001`, aceite CPF `00000000000` / `teste.flash@metrolabs.local`, `AMBIENTE_TESTE=SIM` validado.
- Produção e Flash antigo intocados; menu desligado; sem deploy webapp; sem importação real em produção; sem `--force`.

## 2026-06-27 — FIN_FLASH_V2.7 menu DEV ligado e validação humana controlada aprovada

- Backend: adicionadas `FIN_FLASH_V2_VERIFICAR_ACESSO_DEV()` e `EXECUTAR_FIN_FLASH_V2_7_VALIDACAO_HUMANA_DEV()` em `SGO_Fin_FlashV2.js`.
- `Index.html`: seção DEV (`menu-secao-dev-fin-flash-v2`) oculta por padrão + botão `FIN Flash V2 — DEV` + template `tplFinFlashV2DevModulo` ao final da página.
- `JS_Core.html`: rota `abrir('fin_flash_v2_dev')` adicionada + `renderFinFlashV2DevModulo_()` (carrega template e chama `finFlashV2Html_()`) + `inicializarMenuDevFinFlashV2_()` (chamada no callback de `carregarPermissoesAuth5_()`) + entrada no badge map e nomes.
- Trava de ambiente: `FIN_FLASH_V2_VERIFICAR_ACESSO_DEV()` usa `ScriptApp.getScriptId() === DEV_ID` — bloqueio automático fora do DEV.
- Produção não recebeu item de menu; menu DEV aparece somente após backend confirmar `ok:true`.
- `clasp --user fin_flash_v2_dev push`: 84 arquivos enviados às 22:10:26, sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_7_VALIDACAO_HUMANA_DEV` aprovada: `success:true`, `ok:true`, `bloqueios:[]`.
- Documento do pacote criado: `docs/FIN_FLASH_V2_7_VALIDACAO_HUMANA_DEV.md`.
- Produção e Flash antigo intocados; sem deploy webapp; sem importação real; sem `--force`.

## 2026-06-27 — FIN_FLASH_V2.6 validação formal concluída

- Validações obrigatórias rodadas novamente para conclusão formal do pacote.
- `node --check SGO_Fin_FlashV2.js`: OK.
- `node --check SGO_Fin_FlashV2_Setup.js`: OK.
- Parse `JS_Fin_FlashV2.html`: OK.
- `git diff --check`: OK (avisos CRLF apenas em arquivos não relacionados ao V2.6).
- `prompt()` e `confirm()`: ausentes em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html.
- Menu principal: desligado — linha 1 do HTML declara componente isolado.
- `clasp --user fin_flash_v2_dev push`: `Script is already up to date.` (sem `--force`).
- Orquestradora reexecutada via `clasp run` e aprovada: `success:true`, `ok:true`, `bloqueios:[]`.
- Dados desta execução: relatório positivo `FIN_FLASH_V2_REL_POS_7d8db473-...` (10 conciliações, R$300), relatório negativo `FIN_FLASH_V2_REL_NEG_8d9af897-...` (77 pendências, R$2.500), relatório por colaborador `FIN_FLASH_V2_REL_PEND_34a475ff-...` (2 colaboradores, 150 pendências), termo `FIN_FLASH_V2_TERMO_FIN_FLASH_V2_TERMO_001` vigente, aceite `FIN_FLASH_V2_ACEITE_5gNobhfR9YuzqjShfoUui7Zzwd_KZXXj`.
- FIN_FLASH_V2.6 **CONCLUÍDO**.

## 2026-06-27 — FIN_FLASH_V2.8 correção visual e UX no DEV aprovada

- `JS_Fin_FlashV2.html` reescrito com 4 visões navegáveis: Colaborador, Financeiro, Documentos e Termo, Auditoria.
- Estrutura anterior (tudo empilhado em uma tela) substituída por navegação por abas com container `.ffv2-shell`.
- Visão Colaborador: formulário de prestação com comprovante obrigatório, card de termo (ler/aceitar), tabela de pendências.
- Visão Financeiro: 8 KPI cards + 6 sub-abas (Dashboard, Prestações, Extratos, Conciliações, Pendências, Contas/Cartões).
- Visão Documentos e Termo: botões de relatórios + ver/gerar termo + tabela de documentos registrados.
- Visão Auditoria: tabela de logs completa.
- Painel de ações financeiras oculto por padrão (`display:none`), expandido via botão "Ações financeiras" na Visão Financeiro.
- CSS premium embutido no `finFlashV2Html_()` — sem dependência de folha externa.
- Backend: adicionadas `FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV()` e `EXECUTAR_FIN_FLASH_V2_8_TESTE_UX_VISUAL_DEV()` em `SGO_Fin_FlashV2.js`.
- Funções preservadas: `finFlashV2Html_()`, `finFlashV2CarregarDesktop_()`, `finFlashV2CarregarTermo_()`, `finFlashV2AceitarTermo_()`, `finFlashV2ArquivoParaBase64_()`, `finFlashV2Escape_()`, `finFlashV2FmtMoeda_()`.
- IDs de elementos do termo (`finFlashV2TermoTexto`, `finFlashV2TermoResultado`) preservados para compatibilidade.
- `node --check SGO_Fin_FlashV2.js`: OK. Parse `JS_Fin_FlashV2.html`: OK.
- `git diff --check`: OK. `prompt()/confirm()`: ausentes.
- `clasp --user fin_flash_v2_dev push`: 84 arquivos enviados às 22:43:17, sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_8_TESTE_UX_VISUAL_DEV` aprovada: `success:true`, `ok:true`, `bloqueios:[]`.
- Produção e Flash antigo intocados; menu principal não alterado; sem deploy webapp; sem `--force`.
- FIN_FLASH_V2.8 **CONCLUÍDO**.

## 2026-06-26 — FIN_FLASH_V2.9 UX definitiva por perfil, mobile/desktop e manual de uso aprovada

- `JS_Fin_FlashV2.html` reescrito completamente para V2.9 com roteamento por perfil.
- `finFlashV2Html_()` agora retorna estrutura full-width imediatamente (skeleton com largura 100%) — resolve bug "tela estreita que depois expande". CSS inclui override `.fin-flash-v2-dev-shell{padding:0!important;max-width:none!important;width:100%!important;}`.
- `finFlashV2CarregarDesktop_()` chama `FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV()` e roteia para portal correto.
- **Portal Colaborador** (perfil COLABORADOR): 5 abas — Registrar Gasto, Minhas Prestações, Pendências, Termo de Uso, Manual. Sem acesso a dashboard financeiro, logs gerais, todos colaboradores ou ações financeiras.
- **Portal Financeiro** (perfil FINANCEIRO/ADMIN): header com 6 KPI cards + 6 abas — Dashboard, Conferência de Gastos, Pendências, Documentos, Auditoria, Manual.
- Ações financeiras ocultas para colaborador; visível apenas via botão em Conferência e Pendências no portal financeiro.
- Carregamento lazy: cada aba carrega dados somente quando acessada.
- Manual de uso lazy-loaded (`FIN_FLASH_V2_OBTER_MANUAL_USO_DEV()`) — seção separada para colaborador e financeiro.
- Toggles DEV: `[DEV] Colaborador` / `[DEV] Financeiro` para testar ambos os portais.
- IDs de compatibilidade preservados: `finFlashV2TermoTexto`, `finFlashV2TermoResultado`.
- Backend: adicionadas `FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV()`, `FIN_FLASH_V2_OBTER_MANUAL_USO_DEV()`, `EXECUTAR_FIN_FLASH_V2_9_TESTE_UX_PERFIL_MANUAL_DEV()` em `SGO_Fin_FlashV2.js`. `FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV()` atualizado para `versaoUX:'V2.9'`.
- `node --check SGO_Fin_FlashV2.js`: OK. Parse `JS_Fin_FlashV2.html`: OK (1 bloco script).
- `git diff --check`: OK. `prompt()/confirm()`: ausentes.
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_9_TESTE_UX_PERFIL_MANUAL_DEV` aprovada: `success:true`, `ok:true`, `bloqueios:[]`, 21 itens todos `true`.
- Produção e Flash antigo intocados; menu principal não alterado; sem deploy webapp; sem `--force`.
- Documento do pacote criado: `docs/FIN_FLASH_V2_9_UX_PERFIL_MANUAL_DEV.md`.
- FIN_FLASH_V2.9 **CONCLUÍDO**.

## 2026-06-27 — FIN_FLASH_V2.10 Pente Fino Funcional aprovado

- Backend: adicionadas 28 funções V2.10 + `FIN_FLASH_V2_sheetCtx10_()` (wrapper tolerante, Date→string) em `SGO_Fin_FlashV2.js`.
- Gestão de colaboradores: `LISTAR_COLABORADORES_CARTOES_DEV`, `CADASTRAR_COLABORADOR_DEV`, `ATUALIZAR_COLABORADOR_DEV`, `VINCULAR_CARTAO_COLABORADOR_DEV`, `OBTER_CONTA_COLABORADOR_DEV`.
- Importação Flash: `PREVISUALIZAR_EXTRATO_FLASH_DEV` (prévia obrigatória), `CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV` (idempotente via CHAVE_LOTE), `LISTAR_LOTES_IMPORTACAO_DEV`, `CONCILIAR_LOTE_IMPORTADO_DEV`.
- Conferência de gastos: `FILTRAR_CONFERENCIA_GASTOS_DEV` (CPF+status+período+limite+sugestaoIA), `OBTER_PREVIEW_COMPROVANTE_DEV` (AUSENTE/IMAGEM/PDF), `CONCILIAR_MANUALMENTE_DEV`, `REPROVAR_COMPROVANTE_DEV`, `SOLICITAR_CORRECAO_COMPROVANTE_DEV`.
- Extrato CPF: `LISTAR_MOVIMENTACOES_CPF_DEV` (resumo+movimentações), `GERAR_EXTRATO_CONTA_CPF_DEV` (htmlA4).
- Relatórios A4: `FIN_FLASH_V2_htmlA4Base_()` (texto inteligente positivo/negativo), `PREVIEW_RELATORIO_DEV`, `GERAR_HTML_RELATORIO_A4_DEV`, `LISTAR_RELATORIOS_DEV`.
- Alertas: `msgCobranca_()`, `PREPARAR_COBRANCAS_DIARIAS_DEV`, `SIMULAR_ENVIO_COBRANCAS_DEV`, `LISTAR_ALERTAS_COBRANCA_DEV`, `MARCAR_ALERTA_COMO_ENVIADO_DEV`. Envio real sempre BLOQUEADO.
- `JS_Fin_FlashV2.html` reescrito para V2.10: Portal Colaborador (5 abas: Registrar, Prestações, Pendências, Termo, Manual) + Portal Financeiro (11 abas: Dashboard, Colaboradores e Cartões, Importar Extrato, Conferência de Gastos, Extrato por Colaborador, Pendências, Alertas e Cobranças, Documentos e Relatórios, Termos, Auditoria, Manual). Modal inline para preview A4 e comprovantes.
- `node --check SGO_Fin_FlashV2.js`: OK. Parse `JS_Fin_FlashV2.html`: OK.
- `prompt()/confirm()`: ausentes.
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_10_PENTE_FINO_FUNCIONAL_DEV` aprovada: `success:true`, `ok:true`, `bloqueios:[]`, `penteFinoConcluido:true`, 21 itens todos `true`.
- Produção e Flash antigo intocados; menu principal não alterado; sem deploy webapp; sem `--force`. Envio real de cobranças bloqueado.
- Documento do pacote criado: `docs/FIN_FLASH_V2_10_PENTE_FINO_FUNCIONAL_DEV.md`.
- FIN_FLASH_V2.10 **CONCLUÍDO**.

## 2026-06-27 — FIN_FLASH_V2.10.1 Hotfix tela travada no skeleton aprovado

- Causa raiz: `finFlashV2Html_()` inicializava `#ffv2-nav-box` com skeleton; exceção silenciosa no `withSuccessHandler` impedia substituição pelas 11 abas. Sem timeout nem failure handler robusto.
- Causa raiz 2: `FIN_FLASH_V2_OBTER_DASHBOARD_DEV`, `FIN_FLASH_V2_OBTER_PENDENCIAS_DEV` e `FIN_FLASH_V2_OBTER_LOGS_DEV` não existiam — nomes divergentes dos aliases de V2.4.
- Fix principal: `finFlashV2Html_()` renderiza 11 botões de aba estaticamente no primeiro frame, sem depender de backend.
- Adicionados: `ffv2TimeoutFallback_()` (fallback 8s), `ffv2ErroRender_(msg)` (card erro + retry), try/catch em `ffv2RotearPortal_`, `ffv2RenderPortalF_`, `ffv2RenderPortalC_`. IIFE redundante removido.
- `ffv2RenderPortalF_` não reconstrói mais o nav (já presente do HTML estático) — remove ponto de falha.
- Backend V2.10.1: `FIN_FLASH_V2_OBTER_DASHBOARD_DEV`, `FIN_FLASH_V2_OBTER_PENDENCIAS_DEV` (remapeia campos lowercase→uppercase), `FIN_FLASH_V2_OBTER_LOGS_DEV` (retorna `r.logs[]` com campos UPPERCASE), `EXECUTAR_FIN_FLASH_V2_10_1_TESTE_HOTFIX_RENDER_DEV`.
- `node --check SGO_Fin_FlashV2.js`: OK. Parse `JS_Fin_FlashV2.html`: OK. `prompt()/confirm()`: ausentes.
- `clasp --user fin_flash_v2_dev push`: 84 arquivos enviados sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_10_1_TESTE_HOTFIX_RENDER_DEV`: `success:true`, `ok:true`, `bloqueios:[]`, 11/11 itens `true` (inclui `abasPrimeiroFrame:true`).
- Produção e Flash antigo intocados; menu DEV mantido; sem deploy; sem `--force`.
- Documento do pacote criado: `docs/FIN_FLASH_V2_10_1_HOTFIX_RENDER_DEV.md`.
- FIN_FLASH_V2.10.1 **CONCLUÍDO**.

## 2026-06-28 — FIN_FLASH_V2.11 Redesenho Operacional Final aprovado

- Backend V2.11: 34 novas funções adicionadas a `SGO_Fin_FlashV2.js` — ver `docs/FIN_FLASH_V2_11_REDESENHO_OPERACIONAL_FINAL.md` para lista completa.
- Dashboard redesenhado: cards visuais por colaborador (nome/CPF/última recarga/saldo estimado/situação) via `FIN_FLASH_V2_OBTER_DASHBOARD_COLABORADORES_DEV`.
- Colaboradores: CRUD completo com soft delete (`INATIVAR_COLABORADOR_DEV`) e múltiplos cartões por CPF (`CADASTRAR_CARTAO_COLABORADOR_DEV`, `INATIVAR_CARTAO_COLABORADOR_DEV`, `LISTAR_CARTOES_DO_COLABORADOR_DEV`).
- Pendências: resumo por colaborador (`RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV`) com situação, valor total e ação recomendada; lista detalhada abaixo.
- Alertas e Cobranças: configuração de cobrança diária (`CONFIGURAR_COBRANCA_DIARIA_DEV`), histórico com mensagens (`LISTAR_HISTORICO_COBRANCAS_DEV`); envio real sempre bloqueado.
- Documentos: organizados por tipo (`LISTAR_DOCUMENTOS_ORGANIZADOS_DEV`) com preview A4 unificado (`PREVIEW_DOCUMENTO_A4_DEV`).
- Termos: lista de colaboradores com status de aceite (`LISTAR_TERMOS_COLABORADORES_DEV`) e preview A4 por colaborador (`PREVIEW_TERMO_ASSINADO_DEV`).
- Auditoria: linha do tempo operacional (`LISTAR_AUDITORIA_OPERACIONAL_DEV`) — logs técnicos internos filtrados.
- Portal Colaborador redesenhado: Registrar Gasto → **Minhas Pendências** (pendências por CPF via `BUSCAR_PENDENCIAS_DEV`) → **Meus Comprovantes** (prestações com status via `LISTAR_MOVIMENTACOES_CPF_DEV`) → Termo de Uso → Manual Rápido.
- `JS_Fin_FlashV2.html` atualizado: CSS `@media print`, botão Imprimir no modal (window.print()), `.ffv2-colaboradores-grid`, `.ffv2-sit-card`, 11 novas funções frontend.
- `node --check SGO_Fin_FlashV2.js`: OK. `node --check SGO_Fin_FlashV2_Setup.js`: OK. Parse `JS_Fin_FlashV2.html`: OK. `prompt()/confirm()`: ausentes.
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_11_TESTE_OPERACIONAL_FINAL_DEV`: `success:true`, `ok:true`, `bloqueios:[]`, 23/23 itens obrigatórios `true`.
- Produção e Flash antigo intocados; menu DEV mantido; sem deploy; sem `--force`.
- Documentos do pacote: `docs/FIN_FLASH_V2_11_REDESENHO_OPERACIONAL_FINAL.md`.
- FIN_FLASH_V2.11 **CONCLUÍDO**.

## 2026-06-30 — FIN_FLASH_V2.11.1 Hotfix Importação com Upload Real aprovado

- **Problema:** Aba "Importar Extrato Flash" não possuía campo para selecionar o arquivo do extrato — apenas período e botão de prévia, tornando a aba inutilizável.
- Frontend `JS_Fin_FlashV2.html`: aba "Importar Extrato Flash" reescrita com fluxo visual em 6 etapas: (1) período, (2) upload arquivo xlsx/xls/csv com exibição de nome/tamanho/botão limpar, (3) prévia com validação obrigatória de arquivo e período + envio base64 ao backend + exibição de colunas Flash e métricas, (4) confirmar importação (só após chavePrevia válida), (5) conciliar agora com preview inline de KPIs, (6) gerar relatório A4 com modal + botão imprimir.
- Funções frontend adicionadas: `ffv2ArquivoExtratoSelecionado_`, `ffv2LimparArquivoExtrato_`, `ffv2GerarDocConciliacao_`, `ffv2VerPreviewA4Conc_`.
- Backend `SGO_Fin_FlashV2.js`: adicionadas `FIN_FLASH_V2_RECEBER_ARQUIVO_EXTRATO_DEV` (valida extensão/tamanho/base64), `FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV` (decodifica CSV UTF-8, valida 6 colunas Flash obrigatórias, retorna chavePrevia + preview), `EXECUTAR_FIN_FLASH_V2_11_1_TESTE_IMPORTACAO_UPLOAD_DEV` (orquestradora 15 validações + 5 verificações de segurança).
- Colunas Flash validadas: `Data`, `Movimentação`, `Valor`, `Pessoa`, `Pagamento`, `Prestação de contas`.
- Validações locais: `node --check SGO_Fin_FlashV2.js`: OK. `node --check SGO_Fin_FlashV2_Setup.js`: OK. Parse `JS_Fin_FlashV2.html`: OK. `git diff --check`: OK (exit 0). `prompt()/confirm()`: ausentes. Menu DEV: OK. Produção sem menu: OK.
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_11_1_TESTE_IMPORTACAO_UPLOAD_DEV`: `success:true`, `ok:true`, `hotfixImportacaoUpload:true`, `bloqueios:[]`, `avisos:[]`. Todos os 15 itens `true`. Sem violações de segurança.
- Produção e Flash antigo intocados; menu DEV mantido; sem deploy; sem `--force`; sem envio real.
- Documento do pacote: `docs/FIN_FLASH_V2_11_1_HOTFIX_IMPORTACAO_UPLOAD.md`.
- FIN_FLASH_V2.11.1 **CONCLUÍDO**.

## 2026-06-30 — FIN_FLASH_V2.12 Auditoria de Performance e Fluxo aprovada

- **Diagnóstico:** na abertura do módulo havia 4 chamadas backend lendo 12+ abas; KPIs e dashboard disparavam em paralelo, ambos pesados (7 e 5 abas).
- Backend `SGO_Fin_FlashV2.js`: adicionadas `FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV(filtros)` (lê só 3 abas: CONTAS, PENDENCIAS, CARTOES; retorna KPIs + cards resumidos por colaborador), `FIN_FLASH_V2_MEDIR_PERFORMANCE_DEV()` (mede cada função e retorna métricas de tempo/abas), `EXECUTAR_FIN_FLASH_V2_12_AUDITORIA_PERFORMANCE_FLUXO_DEV()` (30 verificações: performance + 8 fluxos operacionais + portais + segurança).
- Frontend `JS_Fin_FlashV2.html`: `ffv2RenderPortalF_()` agora faz UMA chamada `FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV()` (substitui as 2 chamadas pesadas). Dashboard usa cache de 3 min (`ffv2St_().dashboardLeve + dashboardTs`). `ffv2RenderDashboardCards_()` e `ffv2AtualizarDashboard_()` adicionadas. Aba Importar: lotes carregam sob demanda (botão "Ver Lotes", não automático). Aba Conferência: não filtra automaticamente. Barra DEV atualizada para V2.12.
- **Redução de 799ms** no tempo de abertura: `totalAberturaLeveMs: 1683ms` vs `totalAberturaAntesMs: 2482ms`. Abas lidas na abertura: 3 (antes eram 7).
- Validações locais: `node --check`: OK. Parse HTML: OK. `git diff --check`: OK. `prompt()/confirm()`: ausentes. Menu DEV: OK. Produção sem menu: OK. Envio real: bloqueado.
- `clasp --user fin_flash_v2_dev push`: 84 arquivos enviados sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_12_AUDITORIA_PERFORMANCE_FLUXO_DEV`: `success:true`, `ok:true`, `auditoriaPerformanceConcluida:true`, `bloqueios:[]`, `avisos:[]`. 22/22 itens obrigatórios `true`. Performance sem gargalos.
- 8 fluxos operacionais validados: cadastro, termo, prestação, importação, conciliação, pendências/cobranças, documentos, auditoria.
- Produção e Flash antigo intocados; menu DEV mantido; sem deploy; sem `--force`; sem envio real.
- Documento do pacote: `docs/FIN_FLASH_V2_12_AUDITORIA_PERFORMANCE_FLUXO.md`.
- FIN_FLASH_V2.12 **CONCLUÍDO**.

## 2026-06-30 — FIN_FLASH_V2.12.1 Hotfix Preview XLSX Real aprovado

- **Problema:** `FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV` usava valores mock hardcoded para XLSX (`totalLinhas=12`, `valorTotalGasto=2340.50`, etc.) e estimativas falsas para CSV. Prévia não refletia o arquivo real.
- **Backend `SGO_Fin_FlashV2.js`:** 3 novas funções helper adicionadas:
  - `FIN_FLASH_V2_splitCsvLinha_(linha, sep)` — parser CSV com campos entre aspas, separador autodetectado
  - `FIN_FLASH_V2_parsearLinhasExtrato_(values)` — parser genérico de 2D array para estatísticas do extrato Flash (gastos, recargas, valores, colaboradores, cartões, status)
  - `FIN_FLASH_V2_lerXlsxViaDrive_(b64, ext)` — converte XLSX/XLS para Google Sheets via Drive REST API (`/copy`), lê aba 1, deleta temporários no `finally`
- `FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV`: todo o bloco mock removido; CSV usa parser real; XLSX usa `FIN_FLASH_V2_lerXlsxViaDrive_`; retorna `fonteDados:'ARQUIVO_REAL'`, `pessoasNomes[]`, `cartoes[]`, `status{}`, `linhasReais[]`
- `FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV`: mock linhas (POSTO TESTE DEV / SUPERMERCADO DEV) removido; bloqueia se `payload.linhas` vazio; lookup nome→CPF via CONTAS; extrai cartão de `Pagamento`
- **Frontend `JS_Fin_FlashV2.html`:** badge "✅ Prévia calculada diretamente do arquivo enviado"; nomes de colaboradores e finais de cartão exibidos; status breakdown (`Pendente: 19 | Finalizada: 7 | -: 2`); `linhasReais` armazenado em `window.__ffv2Extrato.linhasReais`; CONFIRMAR passa linhas reais ao backend (sem re-leitura do arquivo). Barra DEV: V2.12.1 Hotfix Preview XLSX Real.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_12_1_TESTE_PREVIEW_XLSX_REAL_DEV`: `success:true`, `ok:true`, todos os 24 itens `true`, `bloqueios:[]`. CSV sintético de 28 linhas validado: `totalLinhas=28`, `gastos=26`, `recargas=2`, `valorGasto=1037.98`, `valorRecarga=950.00`, `colaboradores=1`, `cartões=2` (0546, 881), `Pendente=19`, `Finalizada=7`, `"-"=2`.
- Documento do pacote: `docs/FIN_FLASH_V2_12_1_HOTFIX_PREVIEW_XLSX_REAL.md`.
- FIN_FLASH_V2.12.1 **CONCLUÍDO**.

## 2026-06-30 — FIN_FLASH_V2.13 Validação Operacional Real com Colaboradora Bruna aprovada

- **Problema 1:** relatório de conciliação do lote mostrava `Colaborador: Lote` / `CPF: LOTE_...` / `Período: — a —` em vez dos dados reais da colaboradora.
- **Problema 2:** `PENDENCIAS` gravava `CONCILIACAO_ID` (campo fora do schema) em vez de `EXTRATO_ID`, deixando o campo correto sempre vazio e quebrando a busca de pendências na prévia de conciliação.
- **Problema 3:** Google Sheets converte string numérica em número ao gravar (`'05553116198'` → `5553116198`, perdendo o zero inicial; `'0546'` → `546`), quebrando comparações estritas de CPF e final de cartão em toda a base.
- **Problema 4 (causa raiz do bloqueio final):** a aba `CARTOES` usa os cabeçalhos reais `TIPO_CARTAO` e `FINAL_CARTAO` (não `TIPO`/`FINAL`). `FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV` gravava em `nr.TIPO`/`nr.FINAL`, que não correspondem a nenhuma coluna real — todo cartão criado por essa função ficava com `TIPO_CARTAO`/`FINAL_CARTAO` vazios, mesmo aparentando sucesso.
- **Backend `SGO_Fin_FlashV2.js`:**
  - `FIN_FLASH_V2_normCpf_(v)` — normaliza CPF para texto de 11 dígitos com zero inicial preservado.
  - `FIN_FLASH_V2_getCampoAlias_(obj, aliases)` — lê um campo testando uma lista de nomes de cabeçalho alternativos.
  - `FIN_FLASH_V2_normFinalCartao_(v)` — normaliza final de cartão (remove não-dígitos e zeros à esquerda) para comparação tolerante a formatos (`881`, `0881`, `Final 881`, `Conta final 881`).
  - `FIN_FLASH_V2_getCpfCartao_(k)`, `FIN_FLASH_V2_getFinalCartao_(k)`, `FIN_FLASH_V2_getTipoCartao_(k)`, `FIN_FLASH_V2_getStatusCartao_(k)` — leitura robusta de campos de cartão por alias, sem depender de um único nome de cabeçalho.
  - `FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV` corrigida: grava simultaneamente em `TIPO`/`TIPO_CARTAO` e `FINAL`/`FINAL_CARTAO` (compatível com qualquer um dos dois esquemas de cabeçalho); checagem de duplicidade usa os helpers de alias.
  - `FIN_FLASH_V2_INATIVAR_CARTAO_COLABORADOR_DEV` corrigida: matching por final/CPF usa os helpers normalizados.
  - `FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV` corrigida: `PENDENCIAS.EXTRATO_ID = ext.ID` (antes gravava `CONCILIACAO_ID`, fora do schema) e `DESCRICAO` no lugar de `MOTIVO`.
  - `FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV` reescrita: resolve colaborador real (`nome`/`cpf`) a partir do CPF normalizado dos extratos do lote, calcula período, totais e cartões usados.
  - `FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV` corrigida: usa `prev.colaborador.nome`/`prev.colaborador.cpf` no relatório A4 em vez de `'Lote'`/`loteId`.
  - `FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV` atualizada: aceita `payload.cpfColaborador` (Etapa 0 do frontend) para vincular cada linha do extrato ao CPF correto.
  - `FIN_FLASH_V2_LISTAR_COLABORADORES_PARA_IMPORTACAO_DEV` (nova) — lista colaboradores ativos com CPF normalizado e cartões ativos, para a Etapa 0 de seleção na importação.
  - `FIN_FLASH_V2_PREPARAR_BRUNA_VALIDACAO_DEV` (nova) — cria/atualiza a colaboradora Bruna (CPF `05553116198`) e seus cartões físico (final `881`) e virtual (final `0546`); remove automaticamente registros de cartão corrompidos (final vazio) gerados antes da correção dos cabeçalhos.
  - `FIN_FLASH_V2_RESETAR_HISTORICO_BRUNA_VALIDACAO_DEV` (nova) — apaga apenas `EXTRATOS`/`RECARGAS`/`PRESTACOES`/`CONCILIACOES`/`PENDENCIAS`/`ALERTAS` de teste da Bruna (`AMBIENTE_TESTE=SIM`); preserva cadastro, cartões, documentos e logs.
  - `FIN_FLASH_V2_CRIAR_MASSA_VALIDACAO_BRUNA_DEV` (nova) — gera massa de teste com 9 cenários de extrato (A–I: prestação correta, sem prestação, sem comprovante, valor divergente, justificativa insuficiente, cartão não cadastrado, pendência vencida, regularização posterior) + 5 prestações + 2 recargas.
  - `FIN_FLASH_V2_VALIDAR_PORTAL_COLABORADOR_BRUNA_DEV` e `FIN_FLASH_V2_VALIDAR_PORTAL_FINANCEIRO_BRUNA_DEV` (novas) — validam isolamento do portal colaborador e completude do portal financeiro para a Bruna.
  - `EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV` (nova) — orquestradora de 13 passos: reset → preparar → verificar preservação pós-reset → criar massa → vínculo CPF→extrato → conciliar → validar cenários A–I → prévia de conciliação → gerar documento A4 → alertas → cobrança manual → validar portais → consolidar.
- **Frontend `JS_Fin_FlashV2.html`:** Etapa 0 adicionada antes da Etapa 1 do fluxo de importação — seletor de colaborador (`ffv2LoadImportarColaboradores_`, `ffv2OnColabSelecionado_`) carregado via `FIN_FLASH_V2_LISTAR_COLABORADORES_PARA_IMPORTACAO_DEV`; prévia e confirmação bloqueiam se nenhum colaborador estiver selecionado e passam `cpfColaborador` ao backend. Barra DEV atualizada para V2.13.
- Validações locais: `node --check SGO_Fin_FlashV2.js`: OK. `node --check SGO_Fin_FlashV2_Setup.js`: OK. Parse `JS_Fin_FlashV2.html`: OK. `prompt()/confirm()`: ausentes. Menu DEV: OK. Produção sem menu: OK. Envio real: bloqueado.
- `clasp --user fin_flash_v2_dev push`: 84 arquivos enviados sem `--force`.
- Orquestradora `EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV` executada 2x consecutivas (idempotência confirmada): `success:true`, `ok:true`, `bloqueios:[]`. Todos os itens obrigatórios `true`: `cpfBrunaNormalizado`, `cpfBrunaTexto`, `zeroInicialCpfPreservado`, `brunaCadastrada`, `cartaoFisico881`, `cartaoVirtual0546`, `extratoVinculadoAoCpf`, `loteNaoUsadoComoColaborador`, `chaveLoteNaoUsadaComoCpf`, `relatorioMostraBruna`, `relatorioMostraCpfBruna`, `relatorioMostraPeriodo`, `relatorioMostraCartoes`, `todosCenariosValidados`, `envioRealBloqueado`, `resetHistoricoTesteDisponivel`, `cadastroCartoesPreservadosNoReset`, `menuDevLigado`.
- Produção e Flash antigo intocados; menu produção desligado; sem deploy webapp; sem `--force`; sem envio real.
- Documento do pacote: `docs/FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV.md`.
- FIN_FLASH_V2.13 **CONCLUÍDO**.
