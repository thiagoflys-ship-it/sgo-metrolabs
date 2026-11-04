# Estufa e banho-maria — simulação corrigida e publicada em 04/11/2026

Corrigido o resultado dos dados simulados nos quatro perfis: incubação, banho-maria, esterilização/despirogenização e secadora de traqueias. A imagem testada está ativa no SGO+; os critérios usados para avaliar arquivos reais, a Autoclave e a Lavadora permanecem com os mesmos bytes.

## Causa e comportamento

O gerador aplicava oscilações fixas que ultrapassavam faixas estreitas e a tolerância da secadora. A tela não encaminhava a escolha de resultado para os seis períodos da secadora nem para as repetições do Anexo E. O modo de arquivos individuais ainda introduzia perdas/jitter aleatórios, podendo mudar entre prévia e documento.

A amplitude agora respeita os limites declarados no protocolo, a faixa do perfil e a tolerância própria da secadora. A reprovação introduz uma falha térmica que o próprio motor identifica, inclusive na integral FH/FD; nenhum status é substituído. A distribuição tem controle que vale para os períodos/repetições e a penetração tem controle separado. Leituras repetem com os mesmos parâmetros, inclusive sem cache e após separar/mesclar canais. O fingerprint inclui versão, perfil, critérios, escolhas e janelas das repetições.

Dados incompatíveis recebem orientação: alvo fora da faixa, períodos cortados, poucos registros, resultados contraditórios sobrepostos e letalidade impossível na duração/faixa. Porta e energia precisam de critério para ter parecer; sem limite, o estudo é informativo. Forçar aprovado não modifica um resultado não conforme do laboratório. Os documentos simulados continuam identificados como internos/reconstituídos.

## Verificação

- Antes: 7 testes específicos falhavam e 3 passavam; os seis períodos da secadora simulada aprovada saíam fora da faixa.
- Depois: 20 testes específicos passaram nos quatro perfis, FH/FD, eventos, determinismo, validação e proteção da avaliação real. Os mesmos 20 passaram dentro da imagem exata, com rede desligada.
- Regressão: 1.713 testes, zero falhas. Um teste adicional posterior conferiu o fluxo de prévia → relatório → planilha em oito cenários dos quatro perfis; passou localmente e na mesma imagem. O teste adicional não exigiu nova imagem.
- Navegador Chromium: 16 cenários a 390 e 1280 px, zero erros JavaScript; seletores e payload reais da interface, dispatch/motor reais com serviços de compatibilidade em memória e dados sintéticos. Capturas conferidas. Não é login/ensaio com pessoas reais na produção.
- Imagem: sintaxe dos 367 arquivos JS e do script incorporado, pins e ancestralidade da imagem aprovados, rede desligada.
- PostgreSQL: backups consistentes antes e depois, snapshot read-only exportado, 30 tabelas restauradas em DBs QA vazios e serialização de todas as linhas comparada por SHA256. Não foi alegado restore de owner/ACL nem novo restore integral de arquivos.
- Publicação: saúde, pins ativos, ambiente/montagens/redes do app equivalentes; SGO/COMMAND/RH HTTP200 e identidades/imagens/PIDs/montagens dos outros serviços preservados. Nenhuma migração, grant, simulação ou documento de teste gerado na produção. Imagem anterior retida para rollback do código; não houve execução de rollback nesta publicação.

## Identidade entregue

Imagem: `sha256:1b1bf6fee10bd7d24f3f9ebc9dca98846682997c3028648075f1cfd4c9c25951`.
App: `7874d296a523e0639157f1b74119e1bed7a396621252584a4a03870750f97b94`.
Parent/rollback: `sha256:551da0fc1d41b0a92da3e708009d346eb107fd6fee389ce874a161aca9e41d7a`.
Fonte funcional: `9ab5ba1`; runtime funcional: `ca557a4827f72556bc3e7bfd7c552679f870918b`.
Backup final restaurado SHA256: `0d8a88e0cf47d6fbab894d66327637beef189c467c10f1615ad8d1ee75bb5af4`.
Stage retido: `/opt/metrolabs/qa/sgo-estufa-simulado-20261104-b62f`.

## Ocorrências preservadas e limpeza

A primeira preparação parou antes de testes por diretório vazio ausente no pacote; continuou somente na fase ainda não executada, sem reconstrução. A rede QA nova inicialmente foi recusada por pools esgotados. Sob a autorização humana de retirar recursos antigos, retirou-se apenas a rede do ensaio Compras concluído; contêiner/volume/dump verificado foram mantidos. A verificação original pós-retirada confundiu IDs curtos e completos do Docker. A auditoria independente confirmou o banco parado e seu volume, backup e os quatro IDs de produção ativos; como o inventário anterior não tinha sido persistido, não se alegou igualdade global de redes/FS.

O QA desta correção foi parado ao terminar, mantendo volume e backups. Sua própria rede nova foi retirada. O finalizador teve erro de lookup de ID curto/completo depois da retirada; a continuação só de leitura comparou o inventário ANTERIOR persistido contra o posterior e confirmou exatamente uma mudança: a retirada da rede do próprio banco parado. Nenhuma mutação foi repetida. As duas falhas de preparação do harness de navegador (callback Proxy e contexto sintético ausente) e a primeira asserção do teste adicional (campo `statusAprovacao` em vez de `resultado` na emissão) foram corrigidas no ensaio; não eram defeitos da aplicação.

Os scripts com data são registros de operações já concluídas, não devem ser reexecutados. Os recibos originais e a limitação da limpeza anterior permanecem no índice. Dados, contas, credenciais e cópias privadas não integram o repositório.

Para usar: reabrir/recarregar o SGO+, entrar em Estufa e banho-maria → Relatório interno, escolher o perfil e o resultado desejado. Na secadora o controle de distribuição alcança os seis períodos; no Anexo E a letalidade tem controle próprio.
