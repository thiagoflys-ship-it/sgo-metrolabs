# Reauditoria do Certificado de Calibração

Escopo: CertCal, seus documentos oficiais/interpretativos, motor, cadastro de padrões e relatórios gerenciais. Revisão local posterior à produção 300; este registro não comprova nova publicação.

## Cruzamento dos fluxos

| Entrada | Processamento | Saída e vínculo | Evidência |
| --- | --- | --- | --- |
| Cliente, unidade e equipamento cadastrados | `CertCal_montarContexto_`, vínculo real e executor | Identidade congelada no snapshot | 400 cadastros anonimizados: 391 coerentes, 9 bloqueados |
| Grandezas, unidades, padrões e três leituras por ponto | `CertCal_calcularBlocos_`, `CertCalCalculo` | Tendência assinada, U, K, Veff e memória | Motor + regressão 202600250 + nove perfis |
| Emissão | PDF privado, persistência, publicação | CERT_CALIBRACAO e PDF; integração auxiliar Inventário/Auvo | Testes de persistência parcial e limpeza |
| Snapshot volumoso | JSON privado no Drive, referência compacta | Leitura confere versão e identidade | Logo de 1 milhão de caracteres e falhas de privacidade |
| Interpretativo | Narrativa determinística do snapshot | PDF original reutilizado; concorrência preserva primeira emissão | Neutralidade, identidade, valores e concorrência |
| Consulta e reabertura | Sessão e isolamento de cliente | Histórico por identidade original | Testes de acesso e divergência |
| Desktop e mobile | Payload preserva precisão; apresentação com duas casas | Certificado e interpretativo do mesmo ID | Testes de interface e próxima calibração |
| Gestão | Pontos do snapshot/índice compacto | Indicadores por grandeza e padrões | Testes de cruzamento gerencial |

Nove perfis exercitados com motor e ambos os documentos: termômetro, banho-maria de bancada, termo-higrômetro, incubadora de testes biológicos, estufa de incubação, balança, centrífuga, centrífuga refrigerada e esfigmomanômetro. O motor aceita blocos genéricos; isso não valida automaticamente procedimentos físicos de todo o catálogo.

## Correções desta revisão

- APIs de emissão de certificado e interpretativo retornam `avisos: string[]` quando eventos de auditoria não são registrados. Documento já salvo continua identificado como emitido, evitando tratar pendência auxiliar como falha genérica.
- Falhas de vínculo no Inventário e integração Auvo ficam explícitas na resposta com orientação para reconciliar a emissão existente, sem emitir outra.
- Desktop apresenta os avisos com escape HTML. Mobile deve apresentar o mesmo campo no fluxo compartilhado `JS_Core.html` (integração pelo agente principal).
- Texto de espera do interpretativo descreve resultados salvos; sua narrativa já era determinística, sem IA recalculando resultados.
- A detecção real de falha do logger depende de `SGO_DATA.log` retornar `false` ao falhar e `true` ao salvar; alteração compartilhada solicitada ao agente principal. Exceções também são detectadas.

## Validação

Executados diretamente os 16 arquivos `tests/certcal*.test.cjs`: todos passaram. `certcal-emissao-parcial.test.cjs` possui 11 cenários, incluindo quatro novos casos de log/integração pós-persistência. `certcal-interface.test.cjs` verifica escape dos avisos e texto determinístico.

Não foram emitidos certificados oficiais sintéticos nem alterados dados de produção nesta reauditoria.

## Limites materiais

- Necessária emissão completa no Apps Script com equipamento/PDF reais para confirmar conversão Google, permissões e escrita no ambiente efetivo.
- Os nove vínculos cadastrais divergentes continuam exigindo identificação correta do responsável.
- Idempotência por requestId e reconciliação automática de integrações não estão implementadas; os avisos permitem identificar a pendência, sem corrigi-la automaticamente.
- `CAD_PADROES` não possui unidade/faixa estruturadas suficientes para provar compatibilidade física. Ativo não comprova adequação ou validade na data histórica de medição.
- Política gerencial anterior solicita três anos para renovação dos padrões. Não foi estendida como validade automática de certificados emitidos ao cliente nem alterada nesta revisão.
- Orçamento completo de incerteza, correções, resolução, distribuição, correlações e sensibilidade exigem homologação do procedimento metrológico responsável.
