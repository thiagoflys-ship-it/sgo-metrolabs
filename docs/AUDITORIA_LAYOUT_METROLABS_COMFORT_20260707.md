# Auditoria Layout METROLABS Comfort - 2026-07-07

## Escopo

Estudo antes de nova aplicacao no projeto destino. Nenhuma mudanca foi publicada nesta etapa.

Projeto modelo estudado: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.
Projeto destino: `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`.
Copia local isolada do modelo: `_tmp_metrolabs_model/`.

## Conclusao do estudo

O padrao aprovado nao e apenas "dark compact". Ele e uma versao mais ergonomica chamada no proprio modelo de `METROLABS COMFORT DARK - paleta ergonomica para uso prolongado`.

A diferenca principal e que o Comfort usa fundo e superficies menos agressivos, acentos dessaturados e sombras menores. O destino recebeu uma camada mais intensa, com verde e azul muito luminosos em varios pontos. Isso precisa ser corrigido antes de considerar o layout padronizado.

## Tokens que devem guiar a correcao

- Fundo: `#111827`.
- Superficie/card: `#1f2937`.
- Superficie secundaria: `#172033`.
- Superficie elevada/acao secundaria: `#273244`.
- Texto: `#d9e2ec`.
- Texto forte: `#eef3f8`.
- Muted: `#9aa8b8`.
- Borda: `#3a4657`.
- Verde acao: `#6fbf8f`.
- Azul foco/info: `#7aa7c7`.
- Amarelo alerta: `#d6a94f`.
- Vermelho erro: `#e08a8a`.

## Problemas encontrados no destino

- `UI_Estilos.html` ainda tem a camada `METROLABS DARK COMPACT - DESKTOP PORTAL ONLY` com tokens mais fortes: `#0d1117`, `#22c55e`, `#38bdf8`.
- O documento anterior `docs/layouts/LAYOUT_PADRAO_METROLABS_DARK_COMPACT.md` tambem estava registrando a versao forte, nao a Comfort; foi atualizado para Comfort nesta auditoria.
- A camada mobile `DARK COMPACT - MOBILE OPERACIONAL 3H` usa `#0d1117`, `#38bdf8` e gradientes mais marcados; precisa ser suavizada para Comfort.
- Ha sombras fortes em modais e cartoes, como `0 22px 60px rgba(0,0,0,.42)`.
- Ha gradientes fortes aplicados amplamente em cards/headers/botoes; o modelo Comfort remove gradiente em muitos componentes.
- Ha riscos de textos inline com cores antigas ficarem inconsistentes, exigindo seletores de normalizacao mais suaves.

## Pente fino de mojibake

Candidatos reais encontrados e que precisam de correcao cuidadosa:

- `SGO_AssistenciaTecnica.js` perto das linhas 2278-2462: comentarios com `NÃšCLEO`, `RECONSTRUÃDO`, `ASSISTÃŠNCIA`, `histÃ³rico`, `movimentaÃ§Ãµes`, `descriÃ§Ã£o`, `AcessÃ³rios`, `devoluÃ§Ã£o`, `integraÃ§Ã£o`, `nÃºcleo`.
- Comentarios antigos em `UI_Estilos.html` ja mostraram mojibake de travessao em alguns trechos durante leitura no terminal; devem ser revisados antes de mexer em blocos grandes.

Observacao: nem todo resultado com acento e travessao e erro. O grep tambem lista textos corretos com `NÃO`, `VALIDAÇÃO`, `OPERAÇÃO`, etc. A correcao deve ser feita apenas onde houver sequencias quebradas como `Ã`, `Â`, `â€`, `â€“`, `â€”` em texto final ou comentario relevante.

## Plano de correcao proposto, ainda nao aplicado

1. Criar camada `METROLABS COMFORT DARK - PORTAL OPERACIONAL` no destino, substituindo ou sobrepondo a camada forte atual.
2. Trocar tokens principais do destino para os tokens Comfort.
3. Reduzir gradientes em cards, modais, botoes e headers operacionais.
4. Reduzir sombras fortes para `--shadow-soft` e `--shadow-strong` do Comfort.
5. Suavizar alertas/status em todos os lotes 2B a 3H.
6. Revisar mobile com a mesma paleta Comfort, mantendo canvas/foto/assinatura em fundo adequado.
7. Fazer pente fino de mojibake em arquivos operacionais, sem alterar strings tecnicas, chaves de banco ou geradores de documento sem necessidade.
8. Validar visualmente no DEV antes de novo push amplo.

## Nao aplicar em hipotese nenhuma sem auditoria especifica

- PDFs, documentos oficiais, validadores publicos, QR publico, layouts A4, iframes de documento, `srcdoc`, canvas de assinatura, areas de impressao e termos/prestacoes publicas.

## Lote 4A aplicado

- Arquivo alterado para publicacao: UI_Estilos.html.
- Correcao feita por camada final METROLABS COMFORT DARK - PORTAL OPERACIONAL CORRETIVO 4A.
- Escopo preservado: documentos, PDF, QR publico, validacao publica, iframes/srcdoc, A4, impressoes e canvas.

## Lote 4B mojibake

- Arquivo corrigido: SGO_AssistenciaTecnica.js.
- Escopo: comentarios e textos operacionais do nucleo V2 da Assistencia Tecnica.
- Nao foram alterados IDs, nomes de abas, nomes de colunas, status, geradores, PDFs, QR publico ou validadores.
- SGO_DocumentFactory.js continua com sequencias mojibake propositalmente, pois ali elas fazem parte do mapa de normalizacao.

## Lote 4C textos visiveis operacionais

- Arquivos corrigidos: JS_Missoes.html, JS_DashboardBI.html e JS_Core.html.
- Escopo: rotulos, subtitulos, mensagens de alerta e mensagens de erro exibidas em tela operacional.
- Nao foram alterados geradores de documentos, PDFs, QR publico, validadores, iframes, srcdoc, A4, impressoes, canvas ou arquivos publicos/documentais.
