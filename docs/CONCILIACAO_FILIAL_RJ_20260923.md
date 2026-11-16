# Conciliação da filial — 23/09/2026

## Atualização final após esclarecimento do gestor

Localizações concluídas e relidas na base: **49 registros Rio de Janeiro e 54 Goiânia**, total 103, nenhum sem localização. O gestor esclareceu que a identificação da lista deve orientar a localização, sem bloquear por divergência de série. Os 25 registros abaixo foram então localizados no Rio de Janeiro; séries, certificados e parâmetros metrológicos existentes foram preservados. Diferenças de série dos DTL ficaram nas observações para conferência. O relato abaixo documenta a etapa anterior, já superada quanto à localização. Evidência final: backups/PADROES_RJ_20260923/localizacoes-concluidas.json.

Fonte: imagem “Inventário Analisadores Filial” enviada pelo gestor nesta conversa. Complementa a revisão dos certificados; substitui a pendência de fonte ausente no relatório anterior.

Gravação real via Google Drive/Sheets: 64 cadastros existentes receberam localização (10 Rio de Janeiro, 54 Goiânia). As 11 colunas originais dos 89 registros de CAD_PADROES foram preservadas. O modelo ausente de TIV-001 foi preenchido pela imagem, com proveniência explícita.

Criados 14 registros em CAD_PADROES e respectivas fichas documentais: RJ-MAN-001, RJ-ESP-001, RJ-ANE-001, RJ-LUX-001, RJ-CIL-001, RJ-REGP-001, RJ-BTH-001, RJ-TRE-001, RJ-CRO-001, DTL-13, DTL-15, DTL-17, DTL-18, DTL-19. TAGs RJ são identificadores internos gerados, pois a fonte não declara TAG. Total após importação: 103 registros. Novos registros inativos para uso metrológico: sem PDFs, incertezas, K ou Veff inventados. Dados de certificado declarados na imagem estão identificados como não conferidos documentalmente. Vencimentos apenas mês/ano permanecem nas observações, sem criação artificial de dia.

## Identidades pendentes

- DTL-01, 02, 03, 06, 07, 10, 11 e 12: séries da imagem diferentes das séries dos certificados cadastrados. Perguntado ao gestor se são outros aparelhos ou substituições; sem resposta até esta gravação. Não transferidos certificados entre aparelhos e não criadas duplicatas dessas TAGs.
- REG-001 (8 canais) e REG-002 (4 canais): fonte Novus Fieldlogger com identificação 124506/124507; falta vínculo inequívoco aos canais existentes.
- TER-001 (4 canais): fonte TASI TA612 sem série/TAG para confirmar associação.
- MAN-004: fonte FANDE sem série/TAG; cadastro Fandeii série 22060007 exige identificação física.

Esses 25 registros foram preservados integralmente. Não classificados como ausentes da filial por falta de identificação. A localização depende de resolver os vínculos.

## Evidências

Backup em backups/PADROES_RJ_20260923/antes.json. Plano detalhado, valores e solicitações em plano.json. Releitura verificou 544 células gravadas, total de 103 registros e preservação integral do cadastro metrológico anterior (verificacao.json). Pré-gravação verificou ausência de alterações concorrentes. Não houve mudança de código ou nova publicação nesta etapa. A conferência foi feita diretamente na base; a interface autenticada do portal não foi aberta.

Script _tools/conciliar_rj_20260923.js apenas prepara plano offline sobre o backup; não executa importação por si. Não reaplicar o plano após a gravação.
