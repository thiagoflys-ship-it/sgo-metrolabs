# Auditoria Global SGO+ - Qualidade, Layout e Integrações - 2026-07-07

## Objetivo

Pente fino global solicitado para encontrar e classificar:

- Português visível ao usuário: acentuação, ortografia, mojibake, frases ruins e labels técnicos expostos.
- Layout operacional: aderência ao METROLABS Comfort Dark, ergonomia, contraste, tabelas, colunas e estouro visual.
- Integrações internas: frontend -> backend, dashboard, módulos, schemas, status, IDs e comunicação entre áreas.
- Zona documental protegida: documentos, PDFs, previews A4, QR, validação pública, impressão, iframe/srcdoc e canvas.

## Regra-mãe

Nem todo texto com underscore é erro. `MODULO_TECNICO`, `TECNICO_ID`, `STATUS_CARTAO`, `DB_FIN_ID`, nomes de abas, chaves, enums e funções são contratos técnicos e não devem ser convertidos automaticamente para texto natural.

Erro real é quando chave técnica ou português sem tratamento aparece em tela, documento, alerta, dashboard, relatório, preview ou mensagem para usuário final.

## Referências externas usadas

- WCAG 2.2: contraste mínimo AA para texto normal deve ser 4.5:1, e texto grande 3:1.
- Carbon Design System: uso de tokens semânticos para cor em vez de valores hardcoded, com separação entre background, layer, field, border, text, support e focus.
- Projeto modelo METROLABS: `METROLABS COMFORT DARK - paleta ergonomica para uso prolongado`.

## Agentes em execução

- Agente 1: português, mojibake e textos visíveis.
- Agente 2: layout Comfort Dark, cores, estouro visual e inline styles.
- Agente 3: conexões de dados, dashboard, schemas e chamadas frontend/backend.
- Agente 4: documentos, PDFs, previews, QR, validação e impressão.

## Achados iniciais locais

### Português/acentuação - candidatos claros para lote operacional

- `JS_AssistenciaTecnica.html`: vários textos operacionais sem acento ou com grafia técnica exposta, como `Descricao`, `PRE-VISUALIZACAO`, `Relatorio Tecnico`, `nao disponivel`, `Nao foi possivel`, `criterio tecnico aplicavel`, `Descricao da triagem`, `Tipo de servico`, `Calibracao`.
- `JS_Rastreabilidade.html`: tela pequena e segura para correção: `tecnico responsavel`, `codigo`, `informacao`, `Nao localizado`, `Descricao`, `Referencia`, `Peca Instalada`, `OS instalacao`, `Tecnico`.
- `JS_Mobile.html`: textos mobile como `apos`, `Proximo` e comentários/labels de execução sem acento.
- `JS_OS_Execucao.html`: prompts e motivos como `Correcao durante execucao`, `evidencia`, `conclusao`.
- `JS_Fin_Termo.html`: texto público/termo com `apos`, `localizacao`, `Disponivel`; exige cuidado por ser documento/termo.
- `SGO_Alertas.js`, `SGO_Auth_V2.js`, `SGO_Auditoria_Final.js`: mensagens backend com `nao`, `esta`, `tecnico`, `Calibracao`; corrigir apenas mensagens exibidas/logs, preservando chaves/status.

### Layout Comfort Dark - candidatos claros

- `UI_Estilos.html` ainda contém blocos antigos com tokens fortes: `#22c55e`, `#38bdf8`, `#0d1117`, gradientes e sombras mais intensas. A camada Comfort 4A corrige no final, mas a origem ainda tem conflito e aumenta risco de inconsistência.
- `JS_Fin_FlashV2.html` usa verdes fortes (`#22c55e`) em KPIs e status. Parte é operacional; parte é relatório/modal. Precisa separar antes de alterar.
- `JS_OS_Questionarios.html`, `JS_Registros.html`, `JS_Relatorios.html` têm cores fortes hardcoded em indicadores. Alguns são semânticos, mas devem passar por tokens Comfort.
- `Index.html` tem modais de primeiro acesso/recuperação com fundo branco e texto escuro fora da casca Comfort. Provável correção operacional segura.
- Previews A4 e validadores mantêm branco por natureza documental e não devem receber dark.

### Estouro de tabela/colunas - candidatos

- Tabelas grandes em `JS_Cadastros.html`, `JS_Admin.html`, `JS_Contratos.html`, `JS_AssistenciaTecnica.html`, `JS_Relatorios.html`, `SGO_Frota.js`, `SGO_OS.js` e `SGO_Fin_FlashV2.js` precisam padronização com `table-layout`, `min-width`, `word-break` e `overflow-x`, mas com tratamento diferente para portal vs documento.
- Documentos/previews já têm vários `word-break`, mas precisam inspeção humana/visual antes de qualquer alteração.

### Zona protegida confirmada

- `Validacao_Documento.html`.
- `SGO_DocumentFactory.js`.
- `SGO_Documentos.js`.
- `SGO_QRCode.js`.
- `SGO_Validacao.js`.
- Blocos `iframe.srcdoc`, `HtmlService`, `createHtmlOutput`, `window.print`, `@media print`, `A4`, `PDF`, QR e canvas em módulos mistos.
- `JS_AssistenciaTecnica.html` contém UI operacional e previews A4 no mesmo arquivo; qualquer correção deve ser por bloco.
- `JS_Fin_Cartoes.html`, `JS_Fin_Termo.html`, `JS_Fin_Prestacao.html`, `JS_Fin_FlashV2.html` têm áreas mistas/documentais.

## Próxima ação segura

Aguardar os 4 agentes e consolidar uma matriz com:

1. Correções automáticas seguras de texto operacional.
2. Correções de layout operacional via tokens/classes, sem tocar documento.
3. Correções que exigem inspeção visual.
4. Correções bloqueadas por risco documental ou contrato técnico.
5. Suspeitas de integração que exigem teste `clasp run` ou leitura de schema.
## Consolidação dos agentes

### Layout

O Comfort Dark está aplicado como camada final, mas há CSS antigo e CSS local competindo com ele. Prioridade futura: consolidar `UI_Estilos.html`, corrigir modais de autenticação em `Index.html`, rebasear módulos com CSS próprio (`JS_AssistenciaTecnica.html`, `JS_Fin_Cartoes.html`, `JS_Fin_FlashV2.html`, `JS_Frota.html`) e preservar previews/iframes/documentos.

### Documentos e zona protegida

A zona protegida inclui rotas públicas em `SGO_Main.js`, `Validacao_Documento.html`, `SGO_Validacao.js`, `SGO_DocumentFactory.js`, `SGO_Documentos.js`, `SGO_QRCode.js`, documentos de Frota, Financeiro, AST, OS, QR e todos os blocos `iframe/srcdoc/canvas/@media print/A4/PDF`. Não aplicar tema dark operacional nesses conteúdos.

### Integrações

A Dashboard BI está conectada (`JS_DashboardBI.html -> dashboardBIGerar -> SGO_DashboardBI.js`), mas usava fontes/campos legados em Frota e lista incompleta de status finalizados de OS. Corrigido no lote 5A com fallback de abas `FROTA_* -> FRT_*`, soma de `CUSTO_TOTAL` com fallback `CUSTO`, booleano robusto para bloqueios e inclusão de `CONCLUIDA_TECNICAMENTE`.

### Português

Não há mojibake real amplo nos arquivos principais; os problemas são majoritariamente falta de acento em texto final. Corrigir automaticamente apenas textos operacionais simples. Zonas documentais entram em lote próprio, com revisão visual.

## Lote 5A aplicado

Arquivos alterados:

- `Index.html`: label `Financeiro / Cartões`.
- `JS_MobileCampo.html`: placeholder `Informações adicionais`.
- `SGO_Fornecedores.js`: mensagens operacionais com acento.
- `SGO_Frota.js`: mensagens operacionais de veículo, KM, check-out e manutenção com acento, sem alterar relatórios/PDF.
- `SGO_DashboardBI.js`: alinhamento funcional da BI com Frota nova e status de OS tecnicamente concluída.

Escopo preservado:

- Nenhum PDF, QR, validador, preview A4, iframe/srcdoc, canvas, termo público, DocumentFactory ou layout de impressão foi alterado neste lote.
## Lote 5B aplicado

Arquivos alterados:

- `SGO_Frota.js`: correções adicionais em textos operacionais de checklist, zelo, disponibilidade, check-in, check-out, vistoria, abastecimento e alertas. As chaves técnicas, nomes de colunas e enums foram preservados.
- `SGO_DashboardBI.js`: fallback de fonte ficou mais robusto. Se uma aba nova `FROTA_*` existir mas estiver vazia, o BI tenta a fonte legada `FRT_*` antes de retornar zero, registrando aviso em `avisos`.

Validação local:

- `node --check SGO_DashboardBI.js`: ok.
- `node --check SGO_Frota.js`: ok.
- `git diff --check`: ok.

Observação de proteção:

- O diff foi revisado para evitar entrada em blocos documentais. Textos de relatórios/PDF de Frota que ainda aparecem sem acento continuam marcados para lote documental específico, com inspeção visual antes de alterar.
## Lote 5C aplicado

Arquivos alterados:

- `UI_Estilos.html`: adicionada camada final de layout operacional global para reduzir estouro de colunas/tabelas, padronizar cartões operacionais e suavizar módulos com CSS local ainda claro.

Escopo do lote:

- Tabelas operacionais: `table-wrap`, `fin-table-wrap`, `frota-table-wrap`, `ast-table-wrap` com rolagem horizontal controlada, largura máxima e quebra de texto.
- Módulos operacionais: Frota, Assistência Técnica operacional, Financeiro Cartões/Flash, Dashboard local, painéis IA de OS e Questionários.
- Responsividade: filtros AST com `auto-fit`, stagebar com rolagem horizontal e grids críticos em coluna única no mobile.

Proteções mantidas:

- O bloco foi escopado em `.app-shell .content-area` e ajustado para não aplicar box sizing diretamente em `iframe` ou `canvas`.
- Não foram editados arquivos de documentos, validadores, QR, PDFs, HtmlService, srcdoc, @media print, A4 ou templates documentais.

Validação local:

- `git diff --check`: ok.
## Lote 5D aplicado

Arquivos alterados:

- `JS_Frota.html`: correções de português em textos operacionais visíveis do frontend da Frota: checklist, labels, KPIs, botões, mensagens e tabelas. Identificadores técnicos como `gastoCombustivel`, `tipoCombustivel`, ids de campos e chaves de estado foram preservados.
- `UI_Estilos.html`: adicionada camada `AUTH GLOBAL 5D` para os modais de primeiro acesso, recuperação e redefinição de senha, que ficam fora da `.app-shell` e por isso escapavam do Comfort Dark anterior.

Proteções mantidas:

- Nenhum PDF, QR, validação pública, iframe/srcdoc, canvas, @media print, A4, HtmlService ou template documental foi alterado.

Validação local:

- Busca crítica por sobras operacionais antigas em `JS_Frota.html`: limpa.
- Extração do JavaScript de `JS_Frota.html` + `node --check`: ok.
- `git diff --check`: ok.
## Lote 5E aplicado

Arquivos alterados:

- `UI_Estilos.html`: adicionada camada `OS QUESTIONARIOS 5E` para tabelas, chips, botoes e modais operacionais do modulo de Questionarios/OS que ainda ficavam claros ou estridentes por causa de estilos inline.

Escopo do lote:

- Questionarios operacionais: `#qc_tbody`, `#qc_perguntas_tbody`, `#qcModalPergunta`, `#qcModalPreview` e `#qcModalDiag`.
- Ajuste visual focado em conforto: fundo escuro suave, bordas discretas, textos legiveis e hover menos agressivo.

Protecoes mantidas:

- Nenhum PDF, QR, validador publico, iframe/srcdoc, canvas, @media print, A4, HtmlService ou template documental foi alterado.
- O preview tratado neste lote e o modal operacional de questionarios, nao layout de documento/impressao.

Validacao local:

- `JS_OS_Questionarios.html`: parse ok.
- `JS_OS_Execucao.html`: parse ok.
- `git diff --check`: ok, com avisos esperados de LF/CRLF no Windows.
## Lote 5F aplicado

Arquivos alterados:

- `JS_AssistenciaTecnica.html`: correcoes de portugues em textos operacionais da Assistencia Tecnica V2: labels, botoes, prompts, mensagens de toast e tabelas internas.

Escopo do lote:

- Entrada, triagem, diagnostico, pecas, terceiros, laboratorio, timeline e acoes operacionais.
- Restaurados e validados nomes tecnicos/backend apos a revisao para garantir que nenhuma chamada como `astRegistrarEntradaLaboratorio` ou `astGerarDocumentoLaboratorio` fosse alterada por acento.

Protecoes mantidas:

- Nao foram alterados layouts de PDF, QR, validador publico, iframe/srcdoc, canvas, @media print, A4 ou templates documentais.
- Textos dentro de pre-visualizacoes documentais foram evitados neste lote, exceto mensagens operacionais/toasts externas ao layout do documento.

Validacao local:

- Extração do script de `JS_AssistenciaTecnica.html` + parse com Node: ok.
- Busca por identificadores tecnicos acentuados em `ast*` e `google.script.run.*`: limpa.
- `git diff --check`: ok, com avisos esperados de LF/CRLF no Windows.
## Lote 5G aplicado

Arquivos alterados:

- `JS_Fin_Prestacao.html`: pagina publica de envio de prestacao Flash ajustada para o layout Comfort Dark e corrigida em textos visiveis sem acento.

Escopo do lote:

- Tela publica/operacional de prestacao: cards, campos, botoes, status, pendencias e historico.
- Correcoes de texto: `Nao`, `Numero da OS`, `pendencia`, `Historico`, `prestacao` e mensagem de ambiente pronto.

Protecoes mantidas:

- Nenhum relatorio A4, termo, PDF, iframe/srcdoc, `window.print`, DocumentFactory, QR, validador ou layout documental foi alterado.
- As chamadas `finFlashObterPrestacaoPublicaPorTokenV1`, `finFlashEnviarPrestacaoPublicaV1` e `finFlashRegularizarPendenciaPublicaV1` foram preservadas.

Validacao local:

- Extração do script de `JS_Fin_Prestacao.html` + parse com Node: ok.
- Checagem estrutural das chamadas publicas: ok.
- `git diff --check`: ok, com avisos esperados de LF/CRLF no Windows.
## Lote 5H aplicado

Arquivos alterados:

- `JS_Fin_FlashV2.html`: adicionado helper visual `finFlashV2LabelStatus_` e ajustado `ffv2Badge_` para exibir enums/status em linguagem operacional, sem underline e com acentos quando possível.

Escopo do lote:

- Badges operacionais de status/severidade/situação em tabelas e modais do FIN Flash V2.
- Exemplos validados: `AGUARDANDO_CORRECAO` -> `Aguardando correção`, `CONCILIADO_AUTOMATICO` -> `Conciliado automático`, `PENDENTE_SEM_COMPROVANTE` -> `Pendente sem comprovante`, `MODULO_TECNICO` -> `Módulo Técnico`, `NAO` -> `Não`.

Protecoes mantidas:

- O valor técnico original não foi alterado e continua preservado no `title` da badge.
- Nenhum relatório A4, termo, PDF, iframe/srcdoc, `window.print`, QR, validador, DocumentFactory ou layout documental foi alterado.

Validacao local:

- Extração do script de `JS_Fin_FlashV2.html` + parse com Node: ok.
- Teste direto de rótulos operacionais: ok.
- `git diff --check`: ok, com avisos esperados de LF/CRLF no Windows.
## Lote 5I aplicado

Arquivos alterados:

- `UI_Estilos.html`: adicionada camada final `IMPORTACAO 5I` para o wizard operacional de Importacao.

Escopo do lote:

- Tabelas de mapeamento e pre-visualizacao do wizard.
- Badges de confianca, duplicidade, alertas, danger zone, cards de resultado e toggles.
- Ajustes de overflow e quebra de texto em celulas para reduzir estouro de colunas.

Protecoes mantidas:

- Nenhum PDF, QR, validador publico, iframe/srcdoc, canvas, @media print, A4, HtmlService, DocumentFactory ou template documental foi alterado.
- O lote ficou escopado em `.app-shell .content-area` e seletores `.imp-*`/`#imp-danger-zone`.

Validacao local:

- Busca do bloco `IMPORTACAO 5I`: ok.
- `git diff --check`: ok, com avisos esperados de LF/CRLF no Windows.