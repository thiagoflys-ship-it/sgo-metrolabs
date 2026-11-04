# SGO+ — entrega de 04/11/2026

## Publicado e conferido

Ronda de engenharia clínica e filtro do ramo publicados uma única vez. Imagem `sha256:3eeef084dd35cd7a16470e898477f118b2f908b33411ec35e8f82f25494fc005`, código do servidor `1157a80ec5b446bdaf188f1150a6fe8dd825793a`. Origem funcional `494e569`; integração/documentação `5773f6f`. Ambos os master avançados por fast-forward. Não repetir a publicação já confirmada.

Novo contêiner de produção `8d2d32ec62752d82b6236b60f6ba2de429a795aafbb8b55d658f1969d3058c46`. Saúde, TLS público e smoke administrativo autenticado passaram. PostgreSQL não reiniciou, ambiente e montagens idênticos; 35 outros contêineres em execução mantiveram IDs/imagens/PIDs. Nenhum banco foi restaurado em produção.

## Onde usar

- Assistência técnica > Rondas de engenharia clínica: contratos, recorrência, ronda avulsa, setores, ficha, relatórios e sugestões ao Comercial. No SGO+ Campo: setores, trabalho offline, equipamento cadastrado em campo e assinaturas. Ronda incluída no contrato; parado P2 e uso com limitação P3, configuráveis pela gestão.
- Licitações > Revisar o filtro do ramo: termos de entrada, palavras que incluem/excluem, simulação, aplicar e desfazer por nova versão, sugestões dos descartes, segundo filtro da IA e tipos de serviço. Regras só por Diretoria/Administrador.
- Avisos do Radar anteriores preservados: resumo de e-mail sem duplicação, cobertura de fim de semana e e-mail único para nova candidata urgente. Candidatas sem WhatsApp individual.

## Validação

- Código de origem final: **1679/1679**, log integral em `C:/Users/venda/projetos/wt_sgo_retomada_20261104/output/retomada-sgo-20261104/legado-suite-final.log`.
- Servidor combinado: **351/351**, TypeScript sem erro; 17/17 testes específicos Campo/rascunho/coletor.
- Ronda completa no celular e gestão no computador/celular: 100% OK na base combinada sintética. Roteiro não repete preenchimento de ronda já encerrada.
- Navegador + coletor reais: sincronizar, simular sem gravar, aplicar exclui só oportunidade sintética de tratamento de água, remover palavra recupera a oportunidade, técnico bloqueado, tela em 390 px, zero erro JS.
- Texto: IndexedDB gravado em 24 ms, antes dos 900 ms da fila; reabertura sem sinal mantém texto e o repõe na fila. Encerramento abrupto do renderer não foi aprovado (falha do ensaio ao reabrir offline); não alegar essa cobertura.
- Correção comercial: nova ronda sintética encerrada e sugestão vinculada/presente nas pendências pelo motor instalado. Nenhum teste sintético executado em produção.
- Imagem exata: smoke sem rede e análise de autoclave sem emissão de documento/comando físico.
- PostgreSQL nativo isolado: versão anterior → candidata (ronda/filtro/ponte) → anterior, três etapas PASS, usando backup restaurado, sem alterar produção.
- Backup: **30 tabelas** do mesmo snapshot exportado comparadas após pg_restore; **29425 entradas / 29354 arquivos** restaurados com bytes, UID/GID e modos conferidos. Dump SHA256 `1550282f7ca38c8d5ff54b7a1a14276dafbf1107b9dfaa4994d42680cdcd2bd2`; arquivos SHA256 `2eb5d23a3bfd00e92e91dbe314a52008b294bb5dd36d89a5727810bfece0d57c`.
- Backup e fonte anterior: `/opt/metrolabs/qa/sgo-retomada-20261104-1157a80ec5b4/backup-verificado`. Imagem anterior `4958e80c...` preservada também pela etiqueta `metrolabs/sgo:rollback-1157a80ec5b4`.

## Defeitos reproduzidos e corrigidos nesta retomada

1. Colisão `Lic_radarEstado_` entre IA e resumo: agora filtro usa `Lic_radarFiltroEstado_`.
2. Descartadas pela IA ainda podiam ir no resumo: elegibilidade do filtro aplicada aos avisos.
3. `AstR_comercialPara_` devolve pessoa, não array: ID convertido em lista no aviso e nas pendências da ronda. RED reproduzido, GREEN validado.
4. Integração do descarte mantém cancelamento de avisos e sugestão de palavra; manuais regenerados.
5. Smoke isolado antigo usava nome admin; corrigido para e-mail sintético `admin@sgo.local`, sem mudar autenticação.

## Histórico de falhas preservado

Primeiro ensaio da gestão falhou por reenviar ronda encerrada; primeira imagem falhou no login do smoke antigo; captura do backup terminou por timeout no fechamento do stdin depois de salvar dump e hashes. Continuação restaurou a mesma captura, sem novo dump, e comprovou igualdade. Falhas originais permanecem nas provas; nenhuma foi convertida retrospectivamente em PASS. Teste inicial de porta 8159 EADDRINUSE levou à conferência prévia da porta e proibição de repetir semeadura quando semeado.json existe.

## Evidências e pendências

Índice de provas brutas em `docs/evidencias_sgo_20261104/`. Capturas, relatórios completos e dados sintéticos locais em `C:/Users/venda/projetos/wt_srv_retomada_20261104/ensaios_locais/retomada_combinada_20261104`. Provas anteriores em `C:/Users/venda/projetos/wt_srv_ronda/ensaios_locais/retomada_ronda_20261104`.

Próxima frente: outras plataformas — leitor dos e-mails de aviso, cadastro manual por PDF/texto e selo cotação privada. Pergunta assíncrona sobre criação da caixa licitacoes@metrolabs.com.br permanece pendente; não foi criada conta nem configurada credencial. Não enviar pedidos a plataformas ou mensagens a Matheus sem instrução explícita. RH360 segue pausado; lavadora e demais projetos preservados.

Backups dos repositórios: GitHub master sincronizado; bundles Git verificados em `C:/Users/venda/projetos/_BACKUP_SGO_20261104` e cópias locais do Drive em `G:/Meu Drive/SGO_BACKUP_SOFTWARE`, com SHA256 no manifesto. A sincronização remota do cliente Drive não foi auditada. Worktrees originais preservados; o legado não commitado de wt_srv_ramo é histórico e não deve ser reimportado sobre o master publicado.
