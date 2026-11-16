# Retomada — aguardando testes da equipe — 12/10/2026

Usuário pediu salvar tudo para retomar depois. Equipe fará os testes reais dos três módulos. Encerrar o trabalho nesta sessão; nenhuma nova publicação necessária.

## Estado confirmado

- Produção na versão **301**, mesmo link e deployment anteriores.
- Projeto: `apps-script-imports/portal_sgo_versao_cnpj_db`.
- Três módulos: Certificado de Calibração (inclui interpretativo), Relatório de Calibração e Relatório de Qualificação QI/QO/QD.
- Pacote final passou nos 24 arquivos de testes. Leitura de 197 arquivos remotos sem divergência de hash; deployment 301 confirmado e Portal abriu com HTTP 200.
- Código, testes, backups, manifesto e evidências estão gravados no disco. Não foi criado commit nesta sessão.
- Publicação: [PUBLICACAO_TRES_MODULOS_V301_20261012.md](PUBLICACAO_TRES_MODULOS_V301_20261012.md).
- Auditoria: [AUDITORIA_TRES_MODULOS_20261009.md](AUDITORIA_TRES_MODULOS_20261009.md).

## Roteiro entregue à equipe

Fechar abas antigas e reabrir o Portal antes dos testes.

1. **Certificado de Calibração:** selecionar cliente/unidade/equipamento/executor/padrões; preencher medições; gerar certificado e interpretativo; comparar identidade, unidades e resultados; conferir duas casas na apresentação, ausência de aprovado/reprovado e de próxima calibração automática; abrir PDF salvo, consultar histórico e reabrir. Exercitar desktop e celular.
2. **Relatório de Calibração:** testar PDFs reais dos nove instrumentos: termômetro, banho-maria, termo-higrômetro, incubadora biológica, estufa de incubação, balança, centrífuga, centrífuga refrigerada e esfigmomanômetro. Comparar cliente/TAG/número/datas/grandezas/unidades/resultados/incerteza/K informado com o original. Conferir narrativa, duas casas nas medições, ausência de veredito e salvamento/reabertura. Nas centrífugas, conferir associação de rotação/tempo/temperatura aos anexos corretos.
3. **Relatório de Qualificação QI/QO/QD:** testar perfis usados pela equipe, checklists, observações, fotos, anexos QD, rascunho, revisão, documento final e salvamento. Conferir fidelidade às evidências e ausência de aprovação automática. Substituição do certificado após rascunho deve exigir nova leitura.

Priorizar centrífugas, balanças e termo-higrômetros. Evitar repetir emissão quando a resposta informar documento já salvo com pendência auxiliar.

## Como retomar

Recolher, para cada divergência: módulo, instrumento, passos, erro, captura de tela, PDF original e documento gerado. Reproduzir o caso, corrigir e executar testes pertinentes antes de nova publicação seletiva. Preservar alterações de outros trabalhos; não enviar indiscriminadamente a pasta local.

## Limites preservados

Testes automatizados simulam Google/IA e não substituem emissão autenticada ponta a ponta com PDFs reais. OCR e coerência metrológica exigem conferência humana. Nove vínculos cadastrais inconsistentes continuam pendentes e não foram alterados. Idempotência, reconciliação automática e demais limites constam na auditoria; não declarar todos os procedimentos ou equipamentos universalmente homologados.

Produção: https://script.google.com/macros/s/AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA/exec
