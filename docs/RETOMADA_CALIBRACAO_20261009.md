# Retomada da calibração — 09/10/2026

Usuário pediu para salvar tudo e retomar amanhã, 10/10/2026. Encerrar o trabalho nesta sessão; nenhuma nova publicação necessária.

## Estado salvo

- Projeto: `apps-script-imports/portal_sgo_versao_cnpj_db`.
- Produção publicada na versão 300, no mesmo link existente. Versão anterior: 299.
- CertCal e RelCal revisados, incluindo nove instrumentos da seleção, neutralidade sem aprovado/reprovado, apresentação de medições com duas casas e coerência dos documentos com os dados salvos.
- Vinte arquivos de testes passaram sobre o pacote final; 197 arquivos remotos conferidos por hash; Portal respondeu HTTP 200.
- Código, testes, backups e evidências já estão gravados no disco. Não foi criado commit nesta sessão.
- Registro completo da publicação: [PUBLICACAO_CALIBRACAO_V300.md](PUBLICACAO_CALIBRACAO_V300.md).
- Auditoria: [AUDITORIA_CRUZADA_CERTCAL_20261008.md](AUDITORIA_CRUZADA_CERTCAL_20261008.md).

## Próxima retomada

1. Recolher os resultados dos testes reais da equipe em produção, com PDF original, documento gerado, instrumento e descrição de eventual divergência.
2. Conferir emissão completa, PDF salvo, interpretativo, unidades, identidade, duas casas e fluxo mobile; priorizar centrífugas e equipamentos com múltiplas grandezas.
3. Resolver os nove vínculos divergentes entre cliente e unidade somente após confirmação do cadastro correto. Nenhum desses registros foi alterado.
4. Avaliar as pendências já documentadas: idempotência por requestId, auditoria crítica e reconciliação de integrações. A validação metrológica de procedimentos e a conferência humana de OCR/IA permanecem necessárias.

Os testes automatizados simulam serviços Google; não houve emissão oficial sintética em produção nem validação completa de emissão ponta a ponta. Não declarar todos os equipamentos universalmente homologados.

Preservar alterações locais de outros trabalhos. Para nova publicação, montar pacote seletivo a partir do remoto, conforme o registro da versão 300; não enviar indiscriminadamente todo o diretório local nem usar `clasp push --force`.
