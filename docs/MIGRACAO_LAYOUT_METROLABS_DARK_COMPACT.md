# Migracao Layout METROLABS Dark Compact

Status: etapa de estudo e controle antes de aplicar mudancas visuais.
Projeto Apps Script alvo: `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`.
WebApp DEV atual: `https://script.google.com/macros/s/AKfycbxwyKiMQBoCAnnVUHuph75gKuVroyzQv4LqDeqsWJoV/dev`.
Data de abertura: 2026-07-07.

## Objetivo

Aplicar o layout padrao METROLABS Dark Compact nas telas operacionais do Portal SGO+, preservando integralmente layouts documentais, templates de PDF, areas de impressao, validadores, QR Code, relatorios gerados e qualquer HTML usado como documento final.

## Regra principal

O tema visual do portal pode mudar. O layout de documento emitido nao muda sem autorizacao explicita.

## Fonte do layout

- `docs/layouts/LAYOUT_PADRAO_METROLABS_DARK_COMPACT.md`
- Referencias locais citadas no padrao:
  - `apps-script-imports/projeto_exec_3_akfycbyv/Index.html`
  - `apps-script-imports/metrolabs_planejamento_cme/Index.html`

## Zona protegida

Arquivos e fluxos abaixo nao devem receber alteracao visual global durante esta migracao:

- `SGO_DocumentFactory.js`
  - Monta HTML documental padrao.
  - Gera token, hash, URL de validacao, QR Code e PDF.
  - Salva PDF no Drive.
- `SGO_Documentos.js`
  - Lista, cria e organiza documentos.
  - Faz upload inteligente e cria estrutura de pastas no Drive.
- `SGO_QRCode.js`
  - Gera QR Code e link seguro de equipamento.
  - Controla acesso via QR.
- `SGO_Validacao.js`
  - Fluxo de validacao documental.
- `Validacao_Documento.html`
  - Pagina publica de validacao.
  - Possui layout proprio, selo, acoes, area `.print-area` e `@media print`.
- `SGO_Inventario.js`
  - Deve ser auditado antes de qualquer ajuste por possivel emissao de inventario/relatorio.
- `JS_Relatorios.html`
  - Deve ser tratado como misto: tela operacional e possiveis previews/relatorios.
- `JS_Inventario.html`
  - Deve ser tratado como misto: tela operacional e possiveis saidas documentais.
- `JS_Fin_Termo.html`
  - Deve ser tratado como documento/termo ate prova contraria.
- `JS_Fin_Prestacao.html`
  - Deve ser tratado como documento/comprovante ate prova contraria.
- `JS_Mobile.html` e `JS_MobileCampo.html`
  - Nao aplicar layout desktop automaticamente.
  - Mobile deve ter revisao propria.
- Qualquer bloco com:
  - `@media print`
  - `window.print`
  - `MimeType.PDF`
  - `DriveApp.createFile`
  - `getAs`
  - HTML A4
  - comprovante
  - termo
  - certificado
  - relatorio emitido
  - QR Code
  - validacao publica

## Zona candidata a layout

Arquivos de interface operacional podem receber o padrao visual, desde que o diff nao altere fluxos documentais:

- `UI_Estilos.html`
- `Index.html`
- `JS_Core.html`
- `JS_Admin.html`
- `JS_Cadastros.html`
- `JS_Equipamentos.html`
- `JS_Pecas.html`
- `JS_Contratos.html`
- `JS_OS.html`
- `JS_OS_Execucao.html`
- `JS_OS_Questionarios.html`
- `JS_AssistenciaTecnica.html`
- `JS_Missoes.html`
- `JS_Frota.html`
- `JS_DashboardBI.html`
- `JS_Fornecedores.html`
- `JS_Estoque.html`
- `JS_Rastreabilidade.html`
- `JS_Registros.html`
- `JS_Tecnicos.html`
- `JS_Importacao.html`
- `JS_Fin_Cartoes.html`
- `JS_Fin_FlashV2.html`

## Zona mista

Arquivos abaixo precisam de leitura detalhada bloco a bloco. Podem conter tela operacional e tambem saida documental:

- `JS_Relatorios.html`
- `JS_Inventario.html`
- `JS_Fin_Termo.html`
- `JS_Fin_Prestacao.html`
- `SGO_OS.js`
- `SGO_OS_Checklist.js`
- `SGO_OS_Questionarios.js`
- `SGO_OS_Fotos.js`
- `SGO_OS_Materiais.js`
- `SGO_Rastreabilidade.js`
- `SGO_Etiquetas.js`
- `SGO_Fin.js`
- `SGO_Fin_Termos.js`

## Procedimento de execucao

1. Auditar arquivos candidatos e mistos com busca por impressoes, PDF, QR Code e HTML gerado.
2. Registrar no checklist quais arquivos serao alterados em cada lote.
3. Alterar primeiro apenas `UI_Estilos.html` e, se necessario, `Index.html`, mantendo nomes de classes e IDs existentes.
4. Aplicar ajustes por modulo em lotes pequenos.
5. Antes de cada `clasp push`, conferir:
   - `git diff --name-only`
   - `git diff --check`
   - ausencia de alteracoes na zona protegida
   - `clasp status`
6. Validar visualmente o WebApp DEV.
7. So depois criar commit e push.

## Checklist inicial

- [x] Confirmar projeto alvo pelo `.clasp.json`.
- [x] Identificar fonte do layout padrao.
- [x] Mapear zona protegida inicial.
- [x] Mapear zona candidata inicial.
- [x] Mapear zona mista inicial.
- [x] Auditar `UI_Estilos.html` completo.
- [x] Auditar `Index.html` completo.
- [x] Auditar arquivos `JS_*.html` por blocos de impressao/documento.
- [x] Aplicar lote 1: shell geral, topbar, sidebar, content panel.
- [x] Validar que nenhum documento/relatorio/validador foi alterado no lote 1.
- [ ] Validar que nenhum documento/relatorio/validador foi alterado.
- [x] Aplicar lote 2: compatibilidade visual de caixas neutras inline em modulos operacionais.
- [x] Aplicar lote 2B: overrides UI de Importacao e Frota, sem alterar geracao documental.
- [x] Aplicar lote 2C: Cadastros, Missoes e Dashboard BI via overrides globais seguros.
- [x] Aplicar lote 3A: Estoque, Registros e Tecnicos via CSS do portal, sem alterar prints/prontuarios.
- [x] Aplicar lote 3B: Fornecedores e Contratos via CSS do portal, preservando documentos/links.
- [x] Aplicar lote 3C: Rastreabilidade, Inventario e Relatorios com auditoria reforcada.
- [x] Aplicar lote 3D: Assistencia Tecnica via CSS do portal, sem alterar previews A4, PDFs, iframes, documentos, QR ou validacao.
- [x] Aplicar lote 3E: OS, Execucao de OS e Questionarios via CSS do portal, sem alterar PDF, QR, validacao, iframes, srcdoc ou impressoes.
- [x] Aplicar lote 3F: Financeiro interno e FIN Flash V2 operacional via CSS do portal, sem alterar termo publico, prestacao publica, iframes, srcdoc, previews A4 ou impressao.
- [x] Aplicar lote 3G: Index Documentos, modais de autenticacao e Manual operacional via CSS do portal, sem alterar validacao publica, QR publico, geradores ou layouts A4.
- [x] Aplicar lote 3H: Mobile operacional (.mobile-* e .mc2-*) via CSS do portal, sem alterar QR, validacao, camera/upload, assinaturas/canvas, geradores ou documentos.
- [ ] Aplicar lote 3: modulos mistos, somente nas telas operacionais.

## Observacoes

- O modulo `JS_Fin_FlashV2.html` ja contem estilos isolados `ffv2-*` e tambem regras de impressao no modal. Qualquer reaproveitamento deve preservar os blocos A4/documentais.
- `Validacao_Documento.html` tem identidade visual propria de documento publico e impressao. Nao deve herdar o tema dark do portal.
- Mudancas globais em `body`, `label`, `input`, `button`, `.card`, `.btn` e tabelas devem ser avaliadas porque podem afetar iframes, previews ou HTMLs renderizados dentro de modais.
- Lote 3C aplicado apenas em `UI_Estilos.html`, com seletores `.app-shell .content-area`; `#inv-print-overlay`, `.inv-print-*`, `.prt-*` e HTML de impressao de relatorios permanecem fora do escopo.
- Lote 3D aplicado apenas em `UI_Estilos.html`, usando `.app-shell .content-area .ast-*`; `iframe`, `srcdoc`, previews A4, PDFs, documentos emitidos, QR e validacao ficaram fora dos seletores.
- Lote 3E aplicado apenas em `UI_Estilos.html`, depois do CSS base de OS para manter precedencia; geradores PDF, QR, validacao, iframes, srcdoc e impressoes nao foram alterados.
- Lote 3F aplicado apenas em `UI_Estilos.html`; `JS_Fin_Termo.html`, `JS_Fin_Prestacao.html`, `#ffv2-modal`, iframes, srcdoc, previews A4 e impressoes ficaram fora do escopo.
- Lote 3G aplicado apenas em UI_Estilos.html; repositorio de documentos, modais de autenticacao e manual operacional foram estilizados sem alterar Validacao_Documento.html, QR publico, geradores, previews A4 ou impressoes.
- Lote 3H aplicado apenas em UI_Estilos.html; camada visual mobile cobre .mobile-* e .mc2-*, mantendo fora do escopo QR, validacao publica, uploads/camera, canvas de assinatura, geradores e documentos oficiais.
- [x] Aplicar lote 4A: correcao Comfort Dark operacional por CSS, suavizando acentos, sombras, gradientes e mobile sem tocar documentos/QR/validadores/impressoes.
- [x] Aplicar lote 4B: corrigir mojibake e acentuacao operacional segura em SGO_AssistenciaTecnica.js, sem alterar contratos de dados, documentos, QR ou validadores.

- [x] Aplicar lote 4C: corrigir acentuacao/ortografia visivel em Missoes, Dashboard BI e mensagens operacionais do Core, sem tocar documentos, PDFs, QR, validadores ou layouts de impressao.

## Auditoria `Index.html` completa - 2026-07-08

- Escopo operacional auditado: tela de login, shell principal, topbar, sidebar, carregamento de includes, area principal e modais de autenticacao/primeiro acesso.
- Escopo sensivel identificado e preservado: `renderDocumentosModulo_()` e fluxo de QR publico (`SGO_QR_STATE`, `qrcodeAcessar`, redirecionamento de validacao/sessao).
- Conclusao: nao houve necessidade de nova alteracao em `Index.html`; os ajustes visuais operacionais ja estao cobertos pelos overrides de `UI_Estilos.html` dos lotes anteriores. Documentos, QR publico, validacao e qualquer layout documental permanecem fora do escopo.

## Auditoria `JS_*.html` por blocos - 2026-07-08

- Arquivos sem marcador documental/print/QR relevante na varredura do projeto alvo: `JS_Cadastros.html`, `JS_DashboardBI.html`, `JS_Missoes.html`, `JS_Rastreabilidade.html`. Podem receber ajustes operacionais normais, respeitando contratos de dados e nomes internos.
- Arquivos operacionais com termos falsos positivos ou anexos simples: `JS_Admin.html`, `JS_Contratos.html`, `JS_Estoque.html`, `JS_Fornecedores.html`, `JS_Importacao.html`, `JS_Manual.html`, `JS_OS_Questionarios.html`, `JS_Pecas.html`. Ajustes visuais devem ficar em componentes/telas; nao tratar esses termos como permissao para alterar documentos.
- Arquivos mistos com blocos documentais/print explicitamente protegidos: `JS_AssistenciaTecnica.html`, `JS_Equipamentos.html`, `JS_Fin_Cartoes.html`, `JS_Fin_FlashV2.html`, `JS_Frota.html`, `JS_Inventario.html`, `JS_OS.html`, `JS_OS_Execucao.html`, `JS_Registros.html`, `JS_Relatorios.html`, `JS_Tecnicos.html`.
- Arquivos publicos ou documentais que devem ficar fora da migracao visual do portal: `JS_Fin_Termo.html` e `JS_Fin_Prestacao.html`, exceto correcao pontual autorizada em tela publica ja isolada.
- Blocos que nao podem ser alterados por lote visual global: `@media print`, `window.print`, `iframe.srcdoc`, previews A4, `.prt-*`, `#inv-print-overlay`, QR de equipamento, token/hash/validacao, geracao/abertura de PDF, canvas de assinatura, camera/upload de comprovantes e qualquer HTML completo montado para impressao.
- Conclusao: o proximo lote so pode mirar tela operacional dentro de `.app-shell .content-area` ou classes modulares de portal. Qualquer CSS/HTML documental deve permanecer intacto.
