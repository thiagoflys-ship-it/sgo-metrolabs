# Correção do módulo Certificado de Calibração — 13/09/2026

Código corrigido e enviado ao DEV do Portal SGO+ CNPJ/DB. Foram reparadas 117 células no banco real, com backup, conferência da identidade de cada registro antes da gravação e releitura posterior. A publicação `/exec` permanece na versão 269. Os PDFs emitidos e seus resultados históricos não foram recalculados nem substituídos.

[Abrir DEV para testar](https://script.google.com/macros/s/AKfycbyWt7ZTH1YcOTeX6vL3UIX6BFuqbCLvaAD4KUG7BE-x/dev). Recarregar o Portal antes dos testes para carregar o código novo.

## Causas confirmadas e correções

| Problema | Evidência e correção |
|---|---|
| `0,15` passa a `15` ao editar/salvar | `SGO_UTILS.toNumber` removia todos os pontos. O cadastro recebia números do Sheets e textos como `0.15` ao editar. O módulo agora usa um conversor próprio, idempotente: `0,15`, `0.15` e o número `0.15` preservam o mesmo valor. O conversor global dos outros módulos não foi alterado. |
| Anexar PDF altera números do padrão | A anexação reenviava U95/K/Veff já numéricos para o mesmo conversor defeituoso. O caminho foi testado com a correção. |
| Data preenchida aparece como sem validade | O banco está em `en_US`: datas com dia até 12 foram interpretadas como mês/dia e armazenadas como datas automáticas; outras ficaram em texto brasileiro. O classificador só reconhecia `dd/mm/aaaa`. Agora reconhece texto brasileiro, ISO, Date e serial legado, valida o calendário e distingue data inválida de data ausente. Isso reconhece o formato; não adivinha a data pretendida de registros antigos. |
| A proteção anterior não evitava novas datas automáticas | O helper compartilhado conferia somente a primeira célula de dados da coluna. H2 em texto não garantia que H3:H estivessem em texto. O cadastro agora prepara as colunas de validade/número de certificado antes da gravação. A emissão também protege as três colunas de datas. A operação ocorre nas gravações, sem adicionar escrita às consultas de Frota. |
| Leituras vazias viram zero | Desktop e mobile convertiam `''` em `0` antes da API. Agora enviam os valores brutos; o backend rejeita campos vazios/ilegíveis, com identificação do bloco e ponto. Exige as três leituras previstas na configuração. |
| Cálculo sem padrão ou com padrão inativo | A API aceitava bloco sem fonte e o mapa chamado “ativos” carregava também os inativos. Agora exige padrão ativo e impede repetir o mesmo UUID no mesmo bloco. |
| K chega a 1000 com leituras quase iguais | Veff muito grande causava cancelamento numérico no cálculo da distribuição t. Para Veff a partir de 10 milhões, o motor usa seu limite normal; também deixa de devolver silenciosamente o teto numérico quando não consegue calcular K. A mudança foi conferida com soluções analíticas e dados históricos. |
| Incertezas pequenas aparecem como `0,00` | A prévia e o documento preservam valores pequenos não nulos; o prompt do relatório interpretativo recebe a precisão numérica salva, sem reduzir tudo a duas casas. |
| Mesmo certificado, mesma data, grandezas diferentes | O cadastro já permitia isso. Foi preservado e testado: cada registro mantém UUID, TAG, descrição, U95, K e Veff independentes. O snapshot novo inclui UUID e validade dos padrões utilizados. |

Outros ajustes: validação antes de subir PDF, preservação de campos adicionais na edição, proteção contra duplo envio no formulário de padrão, validação da relação equipamento/cliente, data de calibração obrigatória, meses inteiros positivos e sequência de numeração protegida por lock. Os alertas de padrões usam o mesmo classificador de validade do módulo.

## Dados reparados no banco real

Banco: `1Ny2wiUrzqa8i3IirgEaW11ZZe_IFH9cs1kpXkxu3VzM`. Foram examinados 89 padrões e os snapshots dos 90 certificados emitidos.

| Registros | Reparo | Fonte |
|---|---|---|
| ESF-39982 | K `201` → `2,01` | Certificado 2025-02092, ponto cujo U95 é 0,48 e Veff é 297. |
| ASE-01 (T), ASE-02 (R), ASE-03 (CFB), ASE-04 (CFA) | Validade `07/06/2027` | Os quatro PDFs anexados identificam o certificado 2024004680, que informa esse vencimento. ASE-01 também tinha ano 2020. |
| REG-001 canais 1 a 8 e REG-002 canais 1 a 3 | Validade `05/09/2026` | Cada PDF foi conferido pelo número e pela indicação “Data da Próx. Cal.: 5-set-26”. |
| TIV-001 | Validade `12/09/2026` | Certificado 12228534R01, próxima calibração 12-set-26. |
| TER-001 canais 1 a 4 | Validade `08/09/2026` | Certificados 12228501R01 a 12228504R01, próxima calibração 8-set-26. |
| 37 certificados emitidos, números 202600054 a 202600090 | 96 células de datas restauradas como texto brasileiro | `DADOS_JSON` da própria emissão, conferido pelo número do certificado e UUID. Não houve mudança das datas no snapshot, dos resultados ou dos PDFs. |

Total: **20 vencimentos de padrões + 1 fator K + 96 células de datas = 117 células**. A releitura confirmou todos os valores planejados e nenhuma diferença de valor fora desses alvos nos intervalos auditados. Nenhuma validação de dados estava presente nas células alteradas. Formatos de data foram ajustados somente nos alvos; demais estilos e estrutura foram preservados. Verificação de formatação pela API, sem inspeção visual em navegador autenticado.

## Pendências que precisam de informação do laboratório

1. **RP-362, RP-363 e RP-364:** os PDFs informam calibração em 30/07/2026, mas não o vencimento do próprio instrumento. O cadastro contém datas divergentes, inclusive anteriores à calibração. Foi solicitada a validade correta para temperatura/umidade; nenhuma data foi presumida.
2. **REG-002 (CANAL4):** cadastro 12228517R01 está ligado a um PDF de REG-001 (CANAL2), certificado 12228506R01. Foi solicitado o link correto. Não alterado com base no PDF errado.
3. Existem TAGs repetidas `PSL-01.02` e `PSL-02.02` em descrições/faixas diferentes. Não foram fundidas. Recomenda-se distinguir a TAG/descrição para o operador escolher corretamente.

## Certificados emitidos que precisam de revisão

Os snapshots são evidência do que foi emitido, não devem ser sobrescritos silenciosamente. A nova versão calcula novas emissões; reabrir um certificado antigo continua usando o snapshot original.

| Certificados | Achado |
|---|---|
| **202600011, 202600018, 202600077, 202600078, 202600080, 202600081, 202600082, 202600084, 202600085** | Nove certificados com pontos cujo K histórico chegou a 1000 por Veff muito grande. Exemplo: 202600011, ponto 3, U95 histórico 6; reprocessando as mesmas leituras/fontes, U95 ≈ 0,012 e K ≈ 2. |
| **202600048 a 202600053** | Usam U95 = 29 para THM-002 (U). O PDF 12228974R01 apresenta U95 diferentes conforme o ponto (2,0 / 2,3 / 2,9), não 29. O cadastro atual está em 2,0. A fonte adequada precisa ser escolhida conforme grandeza/faixa; não foi feita substituição automática por um valor único. |
| **202600001** | Bloco emitido sem fonte de incerteza de padrão. |
| **202600050 a 202600053** | Blocos “Umidade” emitidos sem fonte de padrão, além do achado de U95 29 em outro bloco. |
| **202600002** | Bloco “Sensor Interno (Controle)” combina os padrões de temperatura e umidade. A compatibilidade das grandezas precisa de revisão técnica. |

Os nove certificados com K=1000, os seis com fonte 29 e os dois outros casos acima formam **17 certificados distintos sinalizados**. Isso é uma lista de evidências para revisão, não uma decisão automática de cancelamento ou reemissão. O modelo de cadastro continua com uma U95/K/Veff por registro; cabe selecionar ou desmembrar padrões por grandeza/faixa aplicável.

## Testes executados e limites

- **22 testes automatizados**: formatos decimais, precisão, valores inválidos, datas ISO/brasileiras/seriais, calendário/bissexto, cinco ciclos de edição, anexação, duplicidade legítima por TAG, preservação de campos, restrição de cliente, cálculo, fontes ativas, leitura obrigatória, handlers reais desktop/mobile e precisão do prompt IA.
- **90 snapshots / 289 pontos reprocessados localmente**. Houve diferenças superiores a 0,00001 em 32 pontos de 15 certificados. Nove têm o erro grave de K elevado; nos outros seis, o ajuste numérico é pequeno e não corrige o problema separado da fonte U95 = 29.
- Student conferido com soluções analíticas para graus de liberdade 1 e 2; limite de Veff elevado conferido próximo de K=2. Preservadas as fórmulas e a probabilidade de abrangência preexistentes.
- **18 testes de Frota passaram** depois da alteração de `JS_Core.html`.
- Sintaxe dos 180 arquivos enviados conferida; releitura remota confirmou os 180 arquivos idênticos ao estágio de envio, com apenas oito arquivos alterados.
- O ping pela API de execução do Apps Script foi recusado por permissão. Não houve teste autenticado completo no navegador nem emissão real de certificado de teste.
- Foi preservada a regra existente de contar os meses de validade da nova emissão a partir da data de emissão. Alterar a política para contar da calibração exige definição do laboratório.

## Roteiro para o usuário no DEV

Use cadastros identificados como teste e depois inative os padrões de teste. O DEV compartilha o banco real. Para conferir números, use primeiro a prévia; o botão de emissão cria documento e registros reais.

| Teste | Resultado esperado |
|---|---|
| Cadastrar padrão de teste com U95 `0,15`, K `2,01`, Veff `297`, validade `07/06/2027`. Salvar e reabrir. | Mesmos valores e mesma data; sem “Sem validade”. |
| Editar sem mudar nada, salvar e reabrir três vezes. | U95 continua `0,15`; K continua `2,01`. |
| Repetir com U95 `0.15` e depois `0,00001`. | Ponto/vírgula aceitos e casas decimais preservadas. |
| Anexar o PDF ao padrão já salvo. | U95, K, Veff e validade permanecem iguais. |
| Informar `31/02/2027`, depois `29/02/2028`. | Primeira data bloqueada com explicação; segunda aceita. |
| Cadastrar duas TAGs diferentes com mesmo número e validade, U95 diferentes. Editar apenas uma. | Dois registros independentes; a edição não altera o outro. |
| Na prévia, selecionar o padrão adequado e informar nominal `0,15`, leituras `0,14 / 0,15 / 0,16`. | Valores preservados e média `0,15`. |
| Apagar uma leitura e calcular; repetir com texto inválido. | Mensagem identifica a entrada; não calcula usando zero ou descartando a leitura. |
| Retirar todos os padrões do bloco e calcular. | Solicita ao menos um padrão. |
| Usar três leituras iguais, com um padrão válido. | Incerteza proveniente do padrão permanece; K não salta para 1000. |
| Repetir o preenchimento no celular. | Vírgulas preservadas; campos vazios dão erro. A confirmação da emissão real deve ser feita apenas em atendimento de teste autorizado. |
| Conferir os padrões corrigidos na lista e nos alertas. | ASE vence em junho/2027; REG em setembro/2026; TIV em 12/09/2026; TER em 08/09/2026. Vencidos devem aparecer como vencidos. |

## Arquivos e rastreabilidade

Alterados no Portal: `SGO_Padroes.js`, `SGO_CertCal_Calculo.js`, `SGO_CertCal_Main.js`, `SGO_CertCal_ConteudoModulo.js`, `SGO_CertCal_Documento.js`, `SGO_CertCal_IA.js`, `SGO_Alertas.js`, `JS_Core.html`.

Testes: `_tools/test_certcal_20260913.js` e `_tools/test_frota_20260913.js`. Preparação/conferência: `_tools/preparar_certcal_dev_20260913.js` e `_tools/verificar_certcal_dev_20260913.js`.

Backups e evidências em `backups/CERTCAL_AUDITORIA_20260913/`: `celulas_antes.json`, `celulas_depois.json`, `plano_reparos.json`, `evidencias_pdfs.json`, `certificados_snapshots_sem_fotos.json` e `recalculo_diferencas.json`. Os snapshots locais excluem fotos, mantendo leituras/fontes/resultados para auditoria.

Código anterior: `backups/CERTCAL_PRE_CORRECAO_20260913/` e `backups/CERTCAL_REMOTE_PRE_PUSH_20260913/`. Código enviado/reobtido: `backups/CERTCAL_DEV_STAGE_20260913/` e `backups/CERTCAL_DEV_VERIFICACAO_20260913/`.

Projeto: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`. Envio HEAD concluído às 17:56:48 de 13/09/2026. Os deployments publicados continuam em 269, 199 e 1. Publicação após validação humana e autorização, conforme a convenção registrada em `docs/STATUS_SESSAO_PORTAL_CNPJ_DB_20260709.md`, seção 7.
