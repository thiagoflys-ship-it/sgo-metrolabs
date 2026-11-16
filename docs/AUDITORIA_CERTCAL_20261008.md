# Revisão do módulo Certificado de Calibração — 08/10/2026

Projeto revisado: `apps-script-imports/portal_sgo_versao_cnpj_db` (SGO+). O arquivo ativo no IDE pertence ao projeto de RH e não ao módulo solicitado.

## Correções locais

- Removidos os campos aprovado/reprovado na interface desktop e mobile, no contexto de novos certificados, na persistência e na descrição enviada à integração Auvo. A coluna histórica VEREDITO permanece por compatibilidade, vazia em novas emissões.
- Certificado e interpretativo apresentam resultados, sem decisão de aptidão para uso. Essa avaliação cabe à qualidade do cliente. As assinaturas continuam representando revisão e emissão técnica do documento.
- Leituras, valores nominais, médias, tendências, incertezas, fatores K, graus de liberdade finitos e resultados dos relatórios gerenciais usam duas casas decimais e vírgula. A precisão de cálculo e do snapshot permanece integral. Valores pequenos podem aparecer como 0,00; há explicação no documento.
- Graus de liberdade finitos elevados deixam de ser rotulados como infinitos. A convenção de zero para infinito é preservada onde aplicável.
- O interpretativo numérico usa texto determinístico a partir do mesmo snapshot do certificado. Não depende de geração por IA para números ou conclusões. As fotos também vêm do snapshot; legendas automáticas continuam opcionais e são filtradas contra números e declarações de conformidade.
- Welch–Satterthwaite usa componentes normalizadas para evitar perda numérica com valores extremos. Foram reforçadas validações de fontes, pontos, grandeza, unidade, três leituras, duplicidade de padrões e condições ambientais.
- A validade calculada usa a data da calibração, com ajuste para o último dia do mês, em vez da data de emissão.
- Interface embutida, fluxo mobile, manual e relatórios gerenciais foram alinhados ao novo comportamento.

## Validação executada

- `node --test --test-isolation=none tests/certcal-motor.test.cjs`: 8 testes passaram, incluindo rotação de centrífuga, referências analíticas Student, propagação U95/K, valores extremos e validade.
- `node tests/certcal-documentos.test.cjs --fixtures`: formatação, precisão interna preservada, consistência numérica, ausência de veredito, Veff e cabeçalhos de leituras passaram.
- `node tests/certcal-interface.test.cjs`: interface, payload e preview passaram.
- `node _tools/test_certcal_20260913.js`: 22 verificações passaram, incluindo sintaxe e regressão de snapshots.
- `node _tools/test_certcal_gestao_relatorios_20260913.js`: relatórios gerenciais passaram.
- Foram gerados HTMLs de teste em `tmp/certcal-certificado-qa.html` e `tmp/certcal-relatorio-qa.html`. A conversão nativa HTML → PDF do Apps Script e o fluxo publicado ainda precisam de validação no ambiente Google; não houve inspeção visual do PDF nesta revisão.

## Histórico que exige revisão técnica

90 certificados históricos / 289 pontos foram recalculados em memória, sem alterar documentos no Portal ou PDFs no Drive. 32 pontos de 15 certificados apresentam U95 diferente do snapshot histórico; todos têm Veff maior ou igual a 10 milhões. Essa diferença corresponde ao problema antigo do fator K para Veff elevado, cujo tratamento já existia antes desta revisão, e não deve ser atribuída ao patch de hoje.

Certificados envolvidos: 202600011, 202600018, 202600048, 202600049, 202600050, 202600051, 202600052, 202600053, 202600077, 202600078, 202600080, 202600081, 202600082, 202600084 e 202600085.

Reabrir um certificado monta HTML com os dados históricos e a apresentação atual; não recalcula nem substitui o PDF histórico. Uma eventual retificação precisa conferir os registros originais e preservar rastreabilidade.

## Limites e próximos passos

O cadastro de padrões não oferece unidade, faixa, resolução e correções por ponto estruturadas de modo suficiente para conferir automaticamente a adequação metrológica de cada fonte. A comparação textual na interface é apenas um auxílio. O modelo calcula repetibilidade e incertezas dos padrões selecionados; não inclui automaticamente resolução do instrumento, correções do padrão, correlações ou outras contribuições específicas do método. Essas informações precisam ser definidas e conferidas tecnicamente para cada grandeza antes de afirmar que o orçamento de incerteza está completo.

As alterações estão locais, sem push/deploy. Vários arquivos SGO_CertCal estão ignorados pelo Git nesta cópia: devem ser incluídos explicitamente no pacote de publicação. Alterações preexistentes em outros módulos foram preservadas.

A retirada do veredito não elimina a responsabilidade do laboratório pela correção dos resultados. Declarações de conformidade podem existir quando contratadas com especificação e regra de decisão definidas e acordadas: [ILAC G8:09/2019](https://www.iecex.com/dmsdocument/3485/). Esse serviço não está sendo emitido automaticamente neste módulo.
