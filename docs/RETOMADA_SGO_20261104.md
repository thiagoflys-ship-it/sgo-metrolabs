# Retomada do SGO+ — 04/11/2026

Pedido do proprietário: continuar ronda de engenharia clínica, filtro do ramo e fila das plataformas a partir do trabalho de Claude. RH360 permanece pausado. Produção não alterada nesta rodada.

## Candidatos isolados

- Origem: `C:/Users/venda/projetos/wt_sgo_retomada_20261104`, ramo `retomada-ronda-filtro-20261104`. Integra master `37f5e73`, ronda `7344682`, filtro `cfd77af`.
- Servidor: `C:/Users/venda/projetos/wt_srv_retomada_20261104`, ramo `retomada-sgo-20261104`. Integra master `fa06244`, ronda e coletor do filtro. Arquivos originais de outros ramos preservados.
- Commit `28ccaa4`: corrige colisão de `Lic_radarEstado_` (filtro agora `Lic_radarFiltroEstado_`) e aplica exclusão da IA aos avisos/resumos. RED 2/2 falharam antes; GREEN 19/19 passaram.
- Commit `494e569`: `AstR_comercialPara_` devolve pessoa, não lista. Destinatários usam `[comercial.id]` e Diretoria em sugestão e pendências. RED reproduzido; GREEN ronda 11/11.
- Descarte integrado mantém cancelamento de avisos e sugestão de palavra do ramo; manuais regenerados, CRLF conferido.

## Evidências e limitações

- Suíte de origem combinada anterior à correção comercial: 1678/1678, log `output/retomada-sgo-20261104/legado-suite.log` nesta pasta.
- TypeScript passou; servidor combinado: 17/17 testes específicos Campo/rascunho/coletor.
- Ensaio inicial em `C:/Users/venda/projetos/wt_srv_ronda/ensaios_locais/retomada_ronda_20261104`: Campo 100% OK; gestão terminou FAILED somente porque tentou preencher novamente a ronda encerrada no Campo. Rejeição correta preservada, reconciliada por leitura em `gestao-reconciliacao.json`. Não promover resultado original a PASS.
- A primeira inicialização tentou porta 8159 e terminou EADDRINUSE após preparar QA. Porta passou a ser conferida antes da preparação, com parâmetro RONDA_ENSAIO_PORTA. Bases com semeado.json não repetem semeadura; DATABASE_URL é explicitamente indefinida para usar apenas PGlite local.
- Ensaio combinado próprio em `C:/Users/venda/projetos/wt_srv_retomada_20261104/ensaios_locais/retomada_combinada_20261104`, porta 18160, somente dados sintéticos. Campo terminou 100% OK; gestão em execução na última gravação. Este ensaio iniciou antes da correção comercial; não herdar aceite para bytes alterados.
- Suíte Vitest completa inicial da ronda interrompida ao substituí-la pela suíte do candidato combinado. Não registrada como PASS.
- Suíte Vitest completa combinada em execução, saída JSON `ensaios_locais/retomada_combinada_20261104/vitest-completo.json`.

## Próximos passos

1. Colher resultados pendentes sem duplicar processos/ensaios. Atualizar prova exata após correção comercial; sem repetir eventos de O.S. encerrada.
2. Ensaio integrado real do filtro (tela, ponte e coletor), incluindo palavras, simulação, reprocessamento, desfazer e permissões. A suíte isolada é insuficiente para aceite do navegador.
3. Conferir salvamento de texto em IndexedDB por comportamento real; testes atuais do rascunho inspecionam código e não comprovam encerramento abrupto.
4. Fixar versão final, suíte completa, revisão, imagem isolada, backup/rollback e publicação conforme fluxo do projeto. Não há publicação autorizada como concluída.
5. Plataformas: leitor de avisos, cadastro por PDF/texto e selo cotação privada; acesso à caixa de licitações depende do proprietário.
