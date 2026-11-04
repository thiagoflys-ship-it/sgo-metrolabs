# Avisos de ponto por pessoa — publicado em 04/11/2026

Solicitação: marcar pessoas e quais avisos devem receber; matriz pode dispensar almoço/retorno e filial manter. Não inferir lotação nem mudar pessoas reais automaticamente.

Worktree origem C:/Users/venda/projetos/wt_sgo_ponto_20261104, servidor C:/Users/venda/projetos/wt_srv_ponto_20261104, ambos branch ponto-avisos-pessoa-20261104. Nenhuma publicação desta funcionalidade.

Implementado LEMBRETES_JSON opcional por pessoa: ausente herda padrão; [] desliga todos; lista explícita sobrepõe padrão, sem alterar jornada/SEM_ALMOCO. JSON inválido desliga avisos. API salvarLembretes restrita à permissão pessoas e protegida por Pto_comTrava_; edições de jornada preservam seleção. Migração cache PONTO_ABAS_OK_V2. Rodada aplica seleção antes de reservar/enviar mensagens. Painel com busca nome/área, quatro checkboxes/horas (sexta/dinâmica retorno), salvar por pessoa e restaurar padrão, sem recarregar outros rascunhos. Contagem/situação atualizadas.

Testes: RED inicial duas falhas ação inexistente preservadas no histórico da sessão; três novos testes GREEN de seleção matriz/filial, vazio, permissão, validação, independência padrão, preservação jornada e restauração padrão. 32 testes ponto+perfil RH PASS. Primeira suíte geral 1681/1682, falha extração isolada motivoFora sem helper novo; corrigido checando só seleção explícita, teste isolado e módulo passaram. Segunda suíte geral em execução sessão32105 encerrada; rerun final sessão57960 em andamento, log output/ponto-full-tests-final.log. Servidor Vitest sessão61692 em andamento (arquivo ponto-vitest.json), TypeScript PASS antes da última cópia de arquivos. Copiar arquivos finais da origem para legado/ novamente antes de congelar.

Browser sintético real Playwright PASS checkbox por pessoa, persistência, Beto preservado, mobile390 sem rolagem lateral/zero JS erros. output/ponto-browser.cjs, ponto-browser.json e PNG desktop/mobile (vistos). Primeiro harness esperava nome Ana em vez de ANA TECNICA TESTE, falhou timeout; corrigido só seletor, não houve envio/seed real. Nenhuma RPC externa.

Produção consultada: sgo-app-1 8d2d32ec62752d82b6236b60f6ba2de429a795aafbb8b55d658f1969d3058c46 imagem3eeef084dd35cd7a16470e898477f118b2f908b33411ec35e8f82f25494fc005 saudável; disco40GiB livre80%. Publicação prévia ronda/filtro intacta. Não repetir publicação ou limpeza anteriores. RH pausado e lavadora intocados.

Falta finalizar suíte, revisar/testar integração nativa, congelar commits/arquivo/imagem, novo backup restaurado/rollback e publicação com controlador próprio. Controladores antigos em google-script-dev/docs/evidencias_sgo_20261104/controllers são hardcoded à publicação anterior: adaptar namespace/IDs/hashes, NUNCA executar originais para repetir. Espaço permite backup+restore temporário (~20GB), remover só cópia QA própria após gates; preservar arquivos protegidos RH/volumes/imagens/dados.


## Congelamento e execução
Origem commit579224db8addbe61d94c25a7709580a6c4737059. Servidor commitaba38552eaa17b4cdc06cd0d770b1dd59e261cb1. Última suíte geral1682/1682 PASS (~204s); teste ponto18/18 após trava também em salvarPessoa. Browser PASS após busca/atualização situação/horas.

Runtime legado preservou EOL original por arquivo, sem mudanças Core/Command/modelos; _ORIGEM.commit atualizado. Imagem real construída sha256:fa1e066352d2d6f70ba966f0e1290eae094e41e2572512555fc6bdb5eb8c7169, OCIrevisionaba38552eaa17b4cdc06cd0d770b1dd59e261cb1; arquivoSHA8614933b6916b20392672e6d906e7509ba48e2b3a1474017672c2111bd3c1f55.

Stage próprio /opt/metrolabs/qa/sgo-ponto-avisos-20261104. Backup readonly/restore em execução sessão77621, controller output/ponto-backup-controller.py, sshlog output/ponto-backup-ssh.log. Novo PG sgo-ponto-restore-20261104; guardfree>30GiB, TCPreadiness, snapshot/cópia/restauração próprios; não repetir se terminar. À última leitura tar ainda em compressão4.8GiB,35GiB livres. Smoke imagem network-none em execução sessão84907, controller output/ponto-smoke-controller.py. Build jáPASS sessão54945 concluída, não repetir. Vitest servidor sessão61692 ainda rodando JSONem ponto-vitest.json (não existe até finalizar), não duplicar. Fonte suíte57960 encerradaPASS. Native controller autorado output/ponto-native-controller.py NÃO EXECUTADO; depende smoke-result.json e backup-restore-result.json PASS. Testa seleção[],2,4 e jornada preservada viaHTTP/API/PostgreSQL, doisworkers semrede externa, restaura escolha original no clone, sequência atual→nova→atual. Nomes próprios sgo-ponto-*aba38552eaa1; produção intacta.

Ainda NÃO PUBLICADO. Depois de todos gates, adaptar publicação anterior para novo namespace/OLD3eeef/NEWfa1e/REVaba38552 eAPPID8d2d32; backup nome backup-verificado; PUBLICADO guard. Não restaurar DBprodução. Após publicação/gates limpar só QAapps próprias e cópia fs-restaurado própria verificada para devolver espaço; arquivosbackup/Dockerimagens/RH/dados protegidos permanecem. Atualizar memória, commits/docs/provas, ff masters seguros e push.


Atualização: Vitest servidor351/351 PASS, JSON ponto-vitest.json. Smoke imagemfa1e network-none PASS, nunca repetir. Browser320 PASS com busca preservando seleção, zerooverflow/erroJS. local-validation.json enviada ao stage passed=true com fonte1682 e ponto18. Publicação controller output/ponto-publish-controller.py autorado e conferido (ainda NÃOexecutado), exige localvalidation+smoke+backuprestore+nativerollback. Backup sessão77621 restaurandoFS ~7.8GiB,23GiB livres,89%; não interromper/duplicar. Nenhuma mudança em produção.


Backup/restauração PASS: snapshot00000003-003D10DF-1,30tabelas29430entradasFS29359arquivos; bytes/dono/modos iguais. DumpSHA93f61f35de1989a2d7812ff9ea5bc126be391ab246bf6f3931e6b0fef99d7500, arquivosSHA9eefb2c698790897bb5251ca0e837ae8e1dfa0f13a77bd17930e34c6bbbadfa8,36contêineres running preservados. PGpróprio parado. Native PostgreSQL2workers seleção[]/2/4 e jornada preservada PASS, zeroenvios, atual3eeef→candidatafa1e→atual3eeef PASS; própriosapps/PGparados. Publicação iniciada UMAvez sessão10041, não duplicar: aguardar /PUBLICADO.json ou publication-result.json no stage.


## Entrega confirmada (este bloco prevalece)
Publicação ÚNICA PASS, imagemfa1e066352d2d6f70ba966f0e1290eae094e41e2572512555fc6bdb5eb8c7169 commitservidoraba38552eaa17b4cdc06cd0d770b1dd59e261cb1. Containerprodução031543ded0d040cbcd2c02e8e495c2731a60528f94da3afac0d97e69a4a75583 saudável. PostgreSQL,35outrosrunning,ambiente,montagens preservados. TLS/saúdepública200,6workersda produção preservados; gatesnativosQAcom2workers. Nenhum banco restaurado em produção e nenhuma escolha de pessoa real alterada automaticamente.

Uso: SGO+ > Assistente do ponto > Pessoas e jornadas. Buscar pessoa/área, marcar Entrada/Saída para almoço/Retorno/Saída e Salvar avisos. Horas exibidas seguem jornada; Ajustar altera jornada; Usar padrão geral retira override. Desmarcar todos desliga somente avisos da pessoa. Para matriz, almoço/retorno podem ser desmarcados; filial manter. Global padrão continua sendo usado por quem não tem escolha individual. CLT/piloto/ausência/horário/umaviso continuam protegidos.

Provas imutáveis em docs/evidencias_ponto_20261104 com índiceSHA. Backupverificado próprio (30tabelas29359arquivos) e app-anterior mantidos no stage servidor; PGQAparado. Nunca repetir publicação confirmada. Última operação: remoção SOMENTE de4QAapps próprias paradas e cópia FSrestaurado própria, após reverificar SHA dos arquivos integrais; aguardar resultado sessão43099/qa-retirement-result.json, não duplicar. RH360permanece pausado/lavadora e outrosprojetos intocados.


Fechamento: qa-retirement-result.json PASS,4QAapps próprias paradas retiradas,FSrestaurado próprio removido após SHA integral reverificado,10.58GB liberados,31.14GB livres. Banco.dump/dados.tgz/app-anterior/imagens e PGQAparado preservados. Todos36running IDs/imagens/PIDs inalterados durante limpeza. Nenhuma operação remota pendente; não repetir publicação/limpeza.
