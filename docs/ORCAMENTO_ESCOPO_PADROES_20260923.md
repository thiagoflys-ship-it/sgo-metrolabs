# Orçamento de calibração por escopo

Publicado em produção na **versão 282**, com releitura e verificação dos 193 arquivos e do deployment. Alterados três arquivos existentes e acrescentado SGO_Padroes_Orcamento; demais fontes remotas preservadas.

Solicitação do gestor: retirar o conteúdo de inventário da cotação, listar instrumentos, faixas/pontos adequados aos serviços, exigir calibração acreditada e intervalo de três anos.

## Resultado

Renderizador exclusivo para ORCAMENTO: identificação do padrão/canal, faixa proposta, pontos/serviço, aplicação e condições essenciais. Sem fichas completas, fotos, resultados anteriores, certificados antigos ou quadro de vencimentos. Inventário preservado.

O formulário permite informar serviços, faixas e setpoints. A geração pesquisa fontes na web com Gemini/Google Search, exige metadados da busca e mantém fontes, consultas, data e resposta na cópia documental. Uma segunda etapa estruturada propõe faixas por grupo de instrumentos. Valores numéricos com limites cadastrais interpretáveis são verificados; respostas fora da capacidade, unidade divergente, grupos ausentes/duplicados ou estrutura inválida não substituem a proposta conservadora. Faixas de sensores/cabos/conjuntos e aplicações não documentadas exigem confirmação do laboratório. A pesquisa não presume acesso ao texto integral de normas pagas.

Sem pesquisa verificável ou em caso de falha externa, orçamento continua disponível como preliminar, com aviso explícito; não afirma que houve pesquisa. Detalhes técnicos do erro ficam somente no snapshot. Pesquisa e sugestões não alteram cadastro, validade ou cálculos metrológicos.

Propostas iniciais distinguem temperatura, umidade, massas, pressão, segurança elétrica, rotação, velocidade linear/ar, espessura, iluminância, comprimento e tempo. DTL inclui pontos na aplicação 2–8 °C; câmaras ficam dentro dos limites cadastrados; pressão alta não é automaticamente solicitada no fundo de escala; massas preservam nominal individual; analisador preserva a inconsistência de tensão para confirmação. Acessórios (cilindro, bomba, regulador) não recebem uma grandeza de calibração inventada.

Exigência contratual: todos os padrões de medição com calibração acreditada Cgcre/RBC, grandeza/faixa/pontos/método cobertos pelo escopo, CMC e incerteza adequadas, identificação de canais e preço por instrumento. Intervalo solicitado de 36 meses e registro por acordo com proprietário, sem alegar validade normativa universal ou garantia de estabilidade.

## Referências consultadas em 23/09/2026

- Inmetro: https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/acreditacao/qual-o-prazo-de-validade-dos-certificados-de-calibracao
- Inmetro/RBC: https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/metrologia-cientifica/preciso-calibrar-um-instrumento-o-que-fazer
- ILAC G24:2022: https://ilac.org/publications-and-resources/ilac-guidance-series/
- Ministério da Saúde, Manual Rede de Frio, 6ª edição/2025: https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2025/rede-de-frio-pni.pdf
- IEC 62353 (escopo público, não texto integral): https://webstore.iec.ch/en/publication/6913
- NOVUS FieldLogger, manual do fabricante: https://www.novus.com.br/downloads/Arquivos/manual_fieldlogger_v17x_a_pt.pdf
- Notas locais sobre NBR 16328:2024, fornecidas anteriormente pelo gestor. Não usadas para inventar pontos universais obrigatórios.
- API de busca Gemini: https://ai.google.dev/gemini-api/docs/google-search

## Validação e limites

12 testes novos de escopo (incluindo 89 registros reais), 19 testes de backend, 16 de interface e 15 de automação. Regressão do inventário com os 89 registros reais. Prévia visual conferida em Edge e PDF A4 paisagem. As respostas de Gemini foram simuladas nos testes; a chamada com chave de produção ocorre na geração autenticada pelo usuário, que não foi executada nesta sessão. Falha externa é tratada como escopo preliminar explícito. Documentos históricos permanecem preservados; é necessário gerar novo orçamento.

Publicação e snapshots em backups/ORCAMENTO_ESCOPO_20260923/. O publicador preserva todos os arquivos remotos não envolvidos, verifica concorrência e relê o conteúdo publicado. Alterações locais preexistentes em JS_Admin/JS_Core não fazem parte desta publicação.
