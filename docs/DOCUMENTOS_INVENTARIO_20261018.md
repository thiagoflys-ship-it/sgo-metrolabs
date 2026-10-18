# Inventário dos geradores de documento do SGO+ (18/10/2026)

Projeto: `apps-script-imports/portal_sgo_versao_cnpj_db`. Padrão a seguir: `docs/DOCUMENTOS_PADRAO_A4_20261018.md`.

Busca feita por `getAs`, `application/pdf`, `MimeType.PDF`, `createFile`, `DriveApp`, `SGO_DocA4_`, `RelTecA4_`, `RelA4_`, `SGO_DocSalvar_`, `HtmlService` de impressão, `window.print`, `DocumentApp`, exportação de planilha (`export?format=pdf`), "Gerar relatório", "PDF", "Imprimir", "etiqueta", QR e `@page`. Arquivos `createFile` que só gravam envio de arquivo (fotos, dataloggers, anexos de avisos, exportação da migração) **não** são geradores de documento e ficaram fora.

Legenda das colunas:
- **Orient.**: R = retrato, P = paisagem.
- **Moldura**: DocA4 = `SGO_DocA4_inicioDocumento_` completo; DocA4css = só `SGO_DocA4_css_()`; RelTec = `RelTecA4_css_`; RelA4 = `RelA4_documento_`; própria = CSS do módulo.
- **Pasta do cliente**: CNPJ = subpasta com os 14 dígitos do CNPJ; nome = subpasta com o nome do cliente; interna = pasta fixa sem cliente; não = não grava.
- **Sum.**: tem sumário.
- **X/Y**: tem "Página X de Y".

Situação em 18/10/2026, antes das mudanças desta rodada. As mudanças da frente A estão em `docs/DOCUMENTOS_FRENTE_A_20261018.md`.

## Frente A — qualificação e núcleo

| # | Módulo | Função (arquivo) | Documento | Orient. | Moldura | Pasta do cliente | Gráficos | Sum. | X/Y |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Autoclave | `AutoRel_apiGerarRascunhoCertificado` → `AutoRel_apiMontarCertificadoFinal` (`SGO_AutoRel_CertificadoRelatorio.js`, modelo `AutoclaveCertificado.html`) | Relatório de ensaio térmico (ciclo de esterilização) | R | DocA4 | CNPJ ("Autoclave - Laudos/<CNPJ>"), HTML + PDF | SVG: temperatura, pressão, F0 por sensor | não | sim |
| A2 | Autoclave | mesmo caminho, `tipoRelatorio = LEAK_TEST` | Relatório do teste de estanqueidade | R | DocA4 | CNPJ, HTML + PDF | SVG: pressão | não | sim |
| A3 | Autoclave | `AutoRel_apiGerarMemoriaF0` (`SGO_AutoRel_MemoriaF0.js`) | Memória de cálculo do F0 (leitura a leitura) | R | DocA4 | CNPJ, HTML + PDF | não | não | sim |
| A4 | Autoclave | mesmo de A1 com `modoRelatorioSimulado` (`SGO_AutoRel_Simulador.js`) | Relatório interno (dados simulados, faixa "uso interno") | R | DocA4 | não (de propósito) | SVG | não | sim |
| A5 | Autoclave | `AutoRel_apiConverter` → `AutoRel_gerarPlanilhaAuditoria` + `AutoRel_construirLinkPdfPaisagem` (`SGO_AutoRel_Main.js`, `_Planilha.js`, `_Graficos.js`) | Relatório de dados (planilha de auditoria) e o PDF dela | P | planilha (no servidor: `desenhoPlanilha.ts`) | planilha na raiz "Autoclave - Laudos" (sem subpasta do cliente); PDF sob demanda, não gravado | gráficos da planilha → SVG | não | rodapé central do export |
| A6 | Autoclave | `AutoRel_apiConverterLeakTest_` → `AutoRel_gerarPlanilhaLeakTest_` | Planilha do teste de estanqueidade e PDF | P | planilha | como A5 | sim | não | idem |
| A7 | Lavadora | `LavRel_apiGerarRascunhoCertificado` → `LavRel_apiMontarCertificadoFinal` (`SGO_LavRel_CertificadoRelatorio.js`, `LavadoraCertificado.html`) | Relatório de ensaio (termodesinfectora e ultrassônica), com anexo "Memória de cálculo do A0" | R | DocA4 | CNPJ ("Lavadora - Laudos/<CNPJ>"), HTML + PDF | SVG: temperatura, A0 por sensor | não | sim |
| A8 | Lavadora | A7 com `modoRelatorioSimulado` | Relatório interno | R | DocA4 | não | SVG | não | sim |
| A9 | Lavadora | `LavRel_apiConverter` + `LavRel_construirLinkPdfPaisagem` (`SGO_LavRel_Main.js`, `_Planilha.js`) | Relatório de dados (planilha) | P | planilha | raiz "Lavadora - Laudos"; PDF sob demanda | sim | não | idem |
| A10 | Cadeia de frio | `CadeiaFrioRel_apiMontarCertificadoFinal` (`SGO_CadeiaFrioRel_CertificadoRelatorio.js`, `CadeiaFrioCertificado.html` → `SGO_DocA4_documentoQualificacaoTermica_`) | Relatório de qualificação térmica (certificado) | R | DocA4 | CNPJ, HTML + PDF | SVG por estudo | não | sim |
| A11 | Cadeia de frio | A10 simulado | Relatório interno | R | DocA4 | não | SVG | não | sim |
| A12 | Cadeia de frio | `CadeiaFrioRel_apiConverter` + `CadeiaFrioRel_cfConstruirLinkPdfPaisagem` (`_Main.js`, `_Planilha.js`) | Relatório de dados (capa, resultados, conclusão, parecer) | P | planilha | raiz "Cadeia de Frio - Laudos"; PDF sob demanda | sim | não | idem |
| A13 | Estufa, banho-maria e secadora | `EstufaBanhoRel_apiMontarCertificadoFinal` (`SGO_EstufaBanhoRel_CertificadoRelatorio.js`, `EstufaBanhoCertificado.html` → `SGO_DocA4_documentoQualificacaoTermica_`) | Relatório de qualificação térmica (certificado) | R | DocA4 | CNPJ, HTML + PDF | SVG por estudo | não | sim |
| A14 | Estufa | A13 simulado | Relatório interno | R | DocA4 | não | SVG | não | sim |
| A15 | Estufa | `EstufaBanhoRel_apiConverter` + `EstufaBanhoRel_ebConstruirLinkPdfPaisagem` | Relatório de dados (planilha) | P | planilha | raiz da Estufa; PDF sob demanda | sim | não | idem |
| A16 | Preencher modelo (Autoclave e Lavadora) | `tplAutoclaveGerarRelatorio` / `tplLavadoraGerarRelatorio` (`SGO_TemplateAutoclave.js` motor comum, `SGO_TemplateLavadora.js`) | Modelo oficial preenchido (documento-modelo copiado e preenchido, PDF) ou, sem modelo, folha de identificação padrão | R | modelo oficial: o do documento; folha: DocA4 | CNPJ; oficial: documento + PDF; folha: HTML + PDF | não | não | folha: sim |
| A17 | Ajuda (núcleo) | `SGO_Ajuda_apiManual` (`SGO_Ajuda.js`) | Manual completo do módulo ("Manual do operador") | R | DocA4 | não grava (abre para imprimir) | não | sim, sem números de página | sim |
| A18 | Ajuda (núcleo) | manuais do operador antigos dentro dos `*_ConteudoModulo.js` (botão "Manual do operador") | Manual do operador da tela | R | própria de cada módulo | não | não | alguns com índice | não |
| A19 | Equipamentos (Cadastros) | `qrcodeGerarParaEquipamento` (`SGO_QRCode.js`) + `imprimirQRCode_` (`JS_Equipamentos.html`, `window.print`) | Etiqueta com QR Code do equipamento | etiqueta (sem `@page` próprio) | própria | não | — | — | — |
| A20 | Atividades | `Atividades_ganttHtml_` (`JS_Atividades.html`) | Gantt da equipe (só tela, SVG) | — | — | não gera documento | SVG | — | — |
| A21 | Cadastros, Vínculos, Usuários, Avisos, Início, Documentos (arquivo) | — | não geram documento: listas e painéis de tela; o "Arquivo de documentos" (`SGO_Documentos.js`) só guarda arquivos enviados | — | — | — | — | — | — |

Observações da frente A:
- A5, A6, A9, A12 e A15: o relatório de dados é uma planilha de trabalho com PDF exportado na hora. O documento A4 completo da qualificação é o relatório de ensaio ou certificado (A1, A2, A7, A10, A13), que já traz tudo o que a planilha trazia, além dos gráficos. A planilha não fica na subpasta do cliente.
- A16 (modelo oficial): no servidor próprio, o documento-modelo é HTML e o PDF sai pelo Chromium. A moldura é a do modelo do cliente e não deve ser trocada.
- A19: a etiqueta é impressa pelo navegador a partir do modal, sem tamanho de página definido.

## Frente B — técnicos

| # | Módulo | Função (arquivo) | Documento | Orient. | Moldura | Pasta do cliente | Gráficos | Sum. | X/Y |
|---|---|---|---|---|---|---|---|---|---|
| B1 | CertCal | `CertCal_apiGerarCertificado` → `CertCalDoc_montarDocumentoHtml_` (`SGO_CertCal_Main.js`, `_Documento.js`) | Certificado de calibração | R | DocA4css + RelTec | nome ("Certificado de Calibracao - Documentos Gerados/<razão social>"), PDF + HTML | não | não | sim |
| B2 | CertCal | `CertCal_apiGerarRelatorioInterpretativo` → `CertCalDoc_montarRelatorioInterpretativoHtml_` | Relatório interpretativo do certificado | R | DocA4css + RelTec | nome, PDF + HTML | não | não | sim |
| B3 | CertCal | `CertCal_apiReabrirCertificado` | Reabertura do certificado emitido | R | idem | não grava de novo | não | não | sim |
| B4 | Padrões (gerencial) | `CertCal_apiGerarRelatorioRenovacao` → `CertCalGest_htmlRenovacao_` (`SGO_CertCal_GestaoRelatorios.js`) | Plano de renovação e auditoria dos padrões | R | DocA4css + RelTec | interna ("…/Relatorios gerenciais dos padroes") | SVG | não | sim |
| B5 | Padrões (gerencial) | `CertCal_apiGerarRelatorioDesempenho` | Desempenho dos certificados de calibração | R | idem | interna | SVG | não | sim |
| B6 | Padrões | `CertCal_apiGerarDocumentoPadroes` / `CertCal_apiEmitirDocumentoPadroes` → `PadDoc_html_` (`SGO_Padroes_Documentos.js`, `_DocumentoHTML.js`) | Inventário dos padrões de referência | **P** | própria + DocA4css + RelTec | interna, **HTML + JSON, sem PDF** | não | não | sim |
| B7 | Padrões | mesma API, tipo ORCAMENTO → `PadOrc_html_` (`SGO_Padroes_Orcamento.js`) | Solicitação de orçamento de calibração | **P** | própria + DocA4css + RelTec | interna, HTML + JSON, sem PDF | não | não | sim |
| B8 | RelCal | `RelCal_apiGerarDocumento` → `RelCalDoc_montarDocumentoHtml_`; `RelCal_apiSalvarDocumento` | Relatório de calibração | R | DocA4css + RelTec | nome, PDF + HTML | não | não | sim |
| B9 | NR-13 | `NR13_apiEmitirLaudo` / `NR13_apiReabrirLaudo` → `NR13Doc_montarDocumentoHtml_` | Laudo NR-13 | R | DocA4css + RelTec | nome ("Laudos NR13 - Documentos Gerados/<razão social>"), PDF + HTML | SVG (teste hidrostático) | não | sim |
| B10 | Declaração | `DeclExec_apiMontarDocumentoFinal` → `DeclExec_montarDocumentoHtml_`; `DeclExec_apiSalvarDocumento` | Declaração de execução de serviço | R | DocA4css + RelTec | nome, PDF + HTML | não | não | sim |
| B11 | QI/QO/QD | `DeclExec_apiMontarDocumentoQIQO` → `DeclExecQIQO_montarDocumentoHtml_` | Relatório QI/QO/QD | R | DocA4css + RelTec | nome, PDF + HTML | não | não | sim |
| B12 | PGT/POP | `PgtPop_apiGerarDocumento` (salva sozinho) / `PgtPop_apiSalvarDocumento` → `PgtPop_montarDocumentoHtml_` | PGT e POP | R | DocA4css + RelTec | CNPJ (ou nome), PDF + HTML | não | não | sim |
| B13 | Planejamento CME | `PlanCME_apiMontarDocumentoFinal` / `PlanCME_apiSalvarDocumento` → `PlanCME_montarDocumentoHtml_` | Planejamento técnico do CME | R | DocA4css + RelTec | CNPJ (ou nome), PDF + HTML | não | não | sim |
| B14 | Cronograma | `CronExec_apiMontarDocumentoFinal` / `CronExec_apiSalvarDocumento` → `CronExec_montarDocumentoHtml_` | Cronograma de execução | R | DocA4css + RelTec | CNPJ (ou nome), PDF + HTML | não | não | sim |
| B15 | Registros operacionais | `RegOp_apiGerarRegistro` → `RegOp_montarDocumentoHtml_` | Registro operacional | R | DocA4css + RelTec | CNPJ, PDF + HTML | não | não | sim |

Pontos de atenção da frente B:
- B1, B2, B8, B9, B10, B11: a subpasta usa o nome do cliente, não o CNPJ (padrão: `SGO_DocSalvar_pastaClienteEm_`).
- B6 e B7 não geram PDF. O orçamento embute um `<iframe srcdoc>` que não imprime bem.
- B4 e B5: sobra o carregamento do Chart.js por CDN em `CertCalGest_baseHtml_`, sem uso (os gráficos já são SVG).
- B12: a gravação automática e o "Salvar" manual podem criar dois PDFs com o mesmo nome.
- Nenhum documento técnico tem sumário. Os longos (PGT, Planejamento CME, laudo NR-13) devem ganhá-lo.

## Frente C — gestão

| # | Módulo | Função (arquivo) | Documento | Orient. | Moldura | Pasta | Gráficos | Sum. | X/Y |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Frota | `Frota_apiGerarRelatorio` → `FrotaRel_montarDocumentoHtml_` (`SGO_Frota_Relatorio.js`) | Relatório da frota (geral) | R | RelA4 | interna ("Frota - Relatorios Gerados/Frota completa"), PDF + HTML | SVG | não | sim |
| C2 | Frota | mesma API com veículo → `FrotaRel_montarDocumentoVeiculoHtml_` | Relatório por veículo | R | RelA4 | interna (…/<placa>) | não | não | sim |
| C3 | Conduta | `Conduta_apiGerarRelatorio` → `Conduta_montarRelatorioHtml_` (`SGO_Conduta_Relatorio.js`) | Fechamento mensal do programa de conduta | R | RelA4 | interna ("Programa de conduta - Relatórios/Fechamentos mensais") | SVG | não | sim |
| C4 | Conduta | `Conduta_apiGerarRelatorioSemanal` e gatilho → `CondutaRG_htmlSemanal_` (`SGO_Conduta_RelatoriosGerenciais.js`) | Relatório semanal | R | RelA4 | interna (…/Relatórios semanais) | não | não | sim |
| C5 | Conduta | `Conduta_apiGerarRelatorioMissoes` → `CondutaRG_htmlMissoes_` | Prestação de missões | R | RelA4 | interna (…/Missões) | não | não | sim |
| C6 | Conduta | `Conduta_apiGerarExtratoColaborador` → `CondutaExt_html_` (`SGO_Conduta_Extrato.js`) | Extrato do colaborador | R | RelA4 | interna (…/Extratos/<nome>) | não | não | sim |
| C7 | Conduta | `tplConduta_imprimirPrevia_` (`SGO_Conduta_ConteudoModulo.js`, `window.print`) | Prévia impressa | sem `@page` | própria mínima | não | não | não | não |
| C8 | Qualidade | `Qualidade_apiGerarRelatorio` → `Qualidade_montarRelatorioHtml_` (`SGO_Qualidade_Relatorio.js`) | Relatório de gestão da qualidade | R | própria + DocA4css | **não grava** | não | não | sim |
| C9 | Auvo | `Auvo_apiGerarRelatorio` → `Auvo_montarRelatorioHtml_` (`SGO_Auvo_Relatorio.js`) | Relatório de atendimentos | R | própria + DocA4css | **não grava** | **canvas + Chart.js por CDN** (sai em branco no PDF) | não | sim |
| C10 | Inventário | `inventarioGerarRelatorio` → `gerarRelatorioA4` (`SGO_Inventario_Main.js`, RelA4 com `paisagem: true`) | Inventário de equipamentos com análise | **P** | RelA4 | nome ("Inventario de Equipamentos - Documentos Gerados/<cliente>"), PDF + HTML | não | não | sim |
| C11 | Inventário | `tplInv_executarImpressao_` (`SGO_Inventario_ConteudoModulo.js`, `window.print`) | Impressão da tela do inventário | **P** | própria | não | não | não | não |
| C12 | Inventário | `salvarDocumento` / `inventarioSalvarDocumento`, `tplInv_buildStandaloneHtmlParaPdf_` | caminhos antigos | — | — | sem chamada na tela (código morto) | — | — | — |

Pontos de atenção da frente C:
- C9: os gráficos precisam virar SVG estático (o PDF é gerado sem JavaScript).
- C8 e C9 não gravam cópia nenhuma. A regra pede HTML + PDF numa pasta.
- C7 e C11 não têm `@page`, numeração nem moldura.
- C10: a subpasta usa o nome do cliente, não o CNPJ.
- Frota e Conduta usam pastas internas. Está certo, porque não há cliente.

## Resumo das orientações (manter como está)

- **Paisagem**: B6, B7, C10, C11 e os relatórios de dados em planilha (A5, A6, A9, A12, A15).
- **Retrato**: todos os demais.
- Etiqueta de QR (A19): formato de etiqueta, impressa pelo navegador.

## Camada do servidor (`sgo_servidor`, só leitura)

- `src/servicos/pdf.ts` converte com Chromium 156, JavaScript desligado, `preferCSSPageSize: true` e `printBackground`.
  - Conferido em 18/10: páginas nomeadas com orientação mista funcionam, e as caixas de margem e o `counter(pages)` também.
  - `target-counter()` **não** funciona. Por isso o sumário com páginas é feito em duas passagens na `SGO_DocA4`.
- `temPagina` (`/@page[^{]*\{[^}]*size\s*:/`) só reconhece o `size` se ele vier antes da primeira caixa de margem do primeiro `@page`. Hoje isso é inofensivo: sem `size`, o Chromium recebe `format: "A4"`, mas `preferCSSPageSize` continua valendo para qualquer `size` do CSS.
- `src/compat/basicos.ts` (`Blob.getAs`) usa `getDataAsString('ISO-8859-1')`, que devolve o PDF em latin1 sem montar o vetor de bytes. É o caminho usado para ler os destinos do PDF.
