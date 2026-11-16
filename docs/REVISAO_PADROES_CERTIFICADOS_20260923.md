# Revisão do inventário e dos certificados — 23/09/2026

## Resultado operacional

Publicado no portal CNPJ_DB, deployment `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`, versão **281** (anterior: 280). Quatro arquivos substituídos sobre cópia atual do remoto; os outros 188 arquivos foram preservados e relidos para verificação.

Banco: `1Ny2wiUrzqa8i3IirgEaW11ZZe_IFH9cs1kpXkxu3VzM`. Atualização efetiva, pelo conector Google Drive/Sheets, de **89 fichas** em `PADROES_CONTROLE_DOCUMENTAL!A2:E90`. Antes havia sete fichas. **996 campos preenchidos/corrigidos**, incluindo 27 séries antes ausentes; as 11 séries DTL estão presentes após a revisão. Uma operação batchUpdate gravou os 89 registros. Nova leitura conferiu exatamente as 445 células gravadas. Dados antigos e planos estão em `backups/PADROES_REVISAO_20260923/`.

Foram lidos os PDFs dos 89 registros (88 arquivos Drive). Os PDFs foram baixados, e as tabelas CMLab reconstituídas por coordenadas de página para evitar a ordem incorreta da extração textual. Foram preservados sinais, casas decimais, unidades, resultados antes/depois do ajuste e fatores. O cabeçalho gráfico CK foi conferido visualmente; sua imagem é idêntica nos cinco anexos RP.

As modificações foram restritas às fichas documentais. ID, TAG, U95, K, Veff, vencimentos, status e PDFs do cadastro principal não foram alterados. Extração documental não atesta conferência humana; marcações de conferência das fichas alteradas foram limpas.

## Relatórios

- Parágrafos e descrições justificados; tabelas com cabeçalhos repetidos na impressão.
- Faixas extensas saem da coluna estreita e passam a tabela própria da ficha.
- Resultados em tabelas com uma linha por ponto e colunas explícitas. Formato legado é preservado quando não puder ser interpretado sem perda.
- Resumo e indicadores não dependem de redação gerada por IA. O snapshot determina contagens e situações.
- Contagem do acervo completo na data: **89 registros/canais, 44 certificados identificados por número e laboratório, 76 registros vencidos, 13 dentro do prazo cadastrado, dois inativos**. Inatividade/pendências podem coexistir com qualquer classificação de vencimento; não somar indicadores independentes.
- Orçamento pode ser gerado com pendências explícitas, sem declarar aptidão metrológica. Continua sujeito à seleção de registros, autenticação e controles de concorrência/imutabilidade.
- Cópias históricas não foram reescritas. Gerar um novo documento após atualizar o portal para usar o formato corrigido.

## Pendências reais

1. **Localizações e inclusão de novos padrões:** a planilha de referência do Rio de Janeiro não veio disponível nesta conversa e não foi localizada nas buscas. Solicitado nome/link. Nenhuma localização Rio/Goiânia foi inferida de endereço do cliente ou laboratório. Nenhum novo padrão foi criado sem essa fonte.
2. **12 pesos pequenos:** mais de uma peça no certificado possui o mesmo nominal. Os dados gerais foram preenchidos, mas a associação do resultado à peça permanece pendente. Identificar marcação física antes de selecionar a linha do certificado.
3. **DTL-09:** o PDF traz U=400 °C, K=4,52 e Veff=2 no ponto 20 °C. Transcrito fielmente e sinalizado; não foi corrigido por suposição.
4. **Analisador elétrico:** certificado declara capacidade de tensão até 110 Vac, mas apresenta pontos em 200/230 Vac. Ressalva preservada. Os registros ASE agora contêm apenas as grandezas/canais correspondentes; o TSE inativo conserva a ficha completa.
5. **Séries e outros campos ausentes:** declarações “Não Consta”/“N/C” não são séries reais nem resolvem pendências. Ausências foram mantidas sem inventar valores.
6. **Validade:** os certificados RP e PTS não declaram vencimento próprio; alguns documentos informam apenas mês/ano. As ressalvas estão nas fichas. Os prazos cadastrados foram preservados para não substituir política da empresa por inferência.

## Validação

- 19 testes do backend documental; 15 da automação; 16 da interface; 22 do motor de calibração, incluindo 90 snapshots / 289 pontos.
- Verificação adicional com os 89 registros reais: identidades únicas, tamanhos das células, tabelas retangulares, separação de canais, séries DTL, dados anômalos preservados e soma das situações.
- Prévia do analisador renderizada no Edge e inspecionada. PDF conferido em três páginas A4 paisagem, com repetição do cabeçalho da tabela de resultados.
- Publicação validada por releitura dos 192 arquivos e consulta do deployment. Geração/emissão autenticada pelo navegador do portal não foi executada nesta sessão; serviços de geração estão cobertos pelos testes locais. A gravação das fichas foi real e verificada via Sheets.

Ferramentas principais: `_tools/extrair_padroes_20260923.js`, `_tools/pdf_layout_padroes_20260923.py`, `_tools/test_padroes_revisao_20260923.js`, `_tools/publicar_padroes_revisao_20260923.js`. Evidências: `gravacao-verificada.json`, `publicacao.json`, `contagens.json`, `plano-preenchimento.json`, `remote-before.json`, `remote-after.json` no diretório de backup.
