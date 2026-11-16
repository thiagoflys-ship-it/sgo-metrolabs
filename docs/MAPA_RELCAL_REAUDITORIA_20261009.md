# Reauditoria do Relatório de Calibração

Escopo: RelCal (interpretação de certificados externos). Alterações locais, sem publicação por este agente.

## Mapa verificado

- Menu e loader `JS_RelCal.html` carregam `RelCal_obterConteudoModulo`, preservado.
- Catálogo `SGO_RelCal_Config.js`: nove instrumentos. Termômetro, termo-higrômetro, esfigmomanômetro, balança, incubadora biológica, estufa de incubação e banho-maria usam um certificado. Centrífuga usa temporizador e rotação; refrigerada acrescenta temperatura.
- UI envia sessão ao dispatch; seis ações autenticadas. APIs diretas sensíveis também exigem equipe. Ping direto publica apenas catálogo.
- Backend resolve anexos pela configuração, rejeita peça desconhecida/duplicada e exige ao menos um certificado. Escopo parcial é explicitado no documento.
- Detecção descarta respostas de arquivo, slot ou instrumento anteriores. Geração usa uma chamada principal com anexos separados por peça; fotos têm análise independente.
- Marcadores obrigatórios, ordem, unicidade e fim protegem contra relatório truncado. PDF é salvo por cliente no Drive. Vinculação ao inventário é ação adicional da interface.

## Correções nesta rodada

1. A identificação do instrumento utilizada ao salvar vinha da tela após a espera pela IA, embora cliente/TAG já fossem congelados. Agora vem do payload da emissão, evitando nome de arquivo de instrumento trocado durante a geração.
2. Bloqueio de veredito ampliado para afirmações de aptidão/conformidade do instrumento, preservando expressões como “conforme certificado” e “não emitimos declaração de conformidade”. Análise de foto também rejeita vereditos recebidos da IA.
3. Duas casas estendidas à prosa e análise de foto quando uma medição é identificada por grandeza e unidade. Intervalos, datas, TAGs, normas e nomes são preservados. Tabelas continuam formatando somente colunas reconhecidas de medição. Prosa arbitrária sem grandeza identificável depende da instrução da IA e conferência humana.
4. Três perfis ainda imprimiam RDC 302/2005 como referência sanitária: centrífugas e incubadora biológica. Substituída por RDC 978/2025 com alterações vigentes, condicionada à aplicação ao uso do equipamento. Não há declaração automática de cumprimento normativo.

Fontes oficiais consultadas: [Anvisa: RDC 978/2025 substitui RDC 786/2023](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2025/anvisa-esclarece-duvidas-sobre-servicos-que-realizam-exames-de-analises-clinicas-eac); [Anvisa: avaliação da RDC 786, incluindo revogação da 302](https://www.gov.br/anvisa/pt-br/assuntos/regulamentacao/avaliacao-do-resultado-regulatorio/relatorio-de-arr-rdc-786.pdf).

## Evidência e limites

Cinco arquivos `tests/relcal*.test.cjs` passam: autenticação, concorrência da detecção, contexto congelado da geração, nove documentos/neutralidade/formatação/legenda e vínculo dos anexos. Integração menu→loader→getter→seis ações RelCal passa no teste dos três módulos.

Não houve emissão oficial real nem alteração de dados de clientes. OCR/IA exige comparação com PDF original; bloqueios textuais não são garantia de equivalência metrológica. Aceita HTML enviado por equipe autenticada no salvar; não tem idempotência formal, revisão controlada ou confirmação automática da vinculação ao inventário. Listagem limita a varredura a 300 arquivos e retorna 50; não garante últimos 50 globais em acervos maiores. Referências de esfigmomanômetro e procedimentos locais ainda requerem revisão normativa especializada; não foram alteradas sem confirmação específica.
