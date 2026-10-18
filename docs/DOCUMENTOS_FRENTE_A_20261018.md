# Documentos A4: frente A (qualificação e núcleo), 18/10/2026

O padrão está em `docs/DOCUMENTOS_PADRAO_A4_20261018.md` e o inventário em `docs/DOCUMENTOS_INVENTARIO_20261018.md`.

Situação: **não publicado**. Testado no servidor próprio em modo ensaio, com dados de teste apenas:
- banco: cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_docA`;
- servidor na porta 8210, com `SGO_ENSAIO=1` e `SGO_AGENDADOR=0`, parado no fim;
- legado: cópia do projeto mais um arquivo só de ensaio (`ZZ_TesteDocA.js`, com usuário e padrões DTL de teste), que não está no projeto.

## 1. O que mudou

### `SGO_DocA4.js`

Todas as funções antigas continuam compatíveis. As novas são opcionais:

| Recurso | Como funciona |
|---|---|
| Orientação por documento | `doc.orientacao: 'paisagem'` muda o `@page` (A4 paisagem, margens 22/15/16/15 mm) e a folha da tela (297 mm). Sem o campo, o documento é retrato. |
| Orientação por página | `SGO_DocA4_paginaPaisagem_(html)` e `SGO_DocA4_paginaRetrato_(html)` usam páginas nomeadas do CSS. O trecho sai numa folha da outra orientação, com cabeçalho, rodapé e numeração. |
| Capa | `doc.capa: { tipo, linhas, texto }`: 1ª folha sem cabeçalho e rodapé, com logo, título, ficha e rodapé com empresa e número. |
| Sumário automático com páginas | `doc.sumario: true` coloca o marcador do sumário. `SGO_DocA4_paginar_(html)` dá id aos títulos h2 e h3 e gera o PDF uma vez. Depois lê no PDF (catálogo, árvore de páginas e destinos nomeados) em que página caiu cada seção, preenche os números e gera o PDF final. É preciso fazer assim porque o Chromium não implementa `target-counter()` e o PDF é gerado sem JavaScript. Se a leitura falhar, o sumário sai sem números, sem erro. |
| Numeração | Seções e subseções numeradas, `SGO_DocA4_legendaTabela_(n, texto)` ("Tabela N — …") e figuras como antes. |
| Não repetir | `SGO_DocA4_linhaParecer_` substitui o segundo quadro de resultado no fim da conclusão. |
| Revisão | `SGO_DocA4_revisao_`: a revisão sai com dois dígitos ("Revisão 00"). |
| Pedidos da frente B | `SGO_DocA4_tabelaIdent_(pares, classe, { porLinha: 3 })` para paisagem, e o campo `papel` nas assinaturas ("Elaborado por", "Revisado por", "Aprovado por"). O padrão de hoje não mudou. |

### `SGO_DocSalvar.js`

- `SGO_DocSalvar_finalizarCertificado_` pagina o sumário antes de gravar.
  - O mesmo HTML, já com os números, vai para a tela e para a pasta.
  - O PDF gravado é o da 2ª passagem (são 2 conversões por documento, não 3).
- `SGO_DocSalvar_salvarHtmlEPdf_` (usada pelas três frentes): se o HTML tiver o sumário automático e não vier `pdfBlob`, a paginação é feita ali. O HTML final volta em `.html`.

### Documentos da frente A

| Documento | Mudança |
|---|---|
| Relatório de ensaio da Autoclave: ciclo, teste de estanqueidade e relatório interno (`AutoclaveCertificado.html`) | Sumário com páginas. Subseções numeradas (3.1, 3.2, 6.1, 6.2, 7.1). A verificação dos critérios mostra só o resultado obtido e a situação, porque o requisito já está na 3.1. O parecer final virou uma linha e o quadro fica só na abertura. |
| Relatório de ensaio da Lavadora, com o anexo da memória do A0 (`LavadoraCertificado.html`) | As mesmas mudanças da Autoclave. |
| Relatório de qualificação térmica da Cadeia de frio e da Estufa/banho-maria/secadora (`SGO_DocA4_documentoQualificacaoTermica_`) | Sumário; 5.1, 5.2, 6.N "Verificação" e 7.1, 7.2 numerados; verificação sem repetir o requisito; parecer final em uma linha. |
| Memória de cálculo do F0 (`SGO_AutoRel_MemoriaF0.js`) | Sumário com a página de cada sensor. |
| Teste de estanqueidade (`SGO_AutoRel_LeakTest.js`) | "Leak Test" saiu das mensagens e da observação do documento ("teste de estanqueidade"). Só strings; os comentários ficaram como estavam. |
| Manual completo do módulo (`SGO_Ajuda.js`, `SGO_Ajuda_apiManual`) | Capa e sumário automático com os números de página. O sumário próprio, que não tinha números, saiu. |
| Etiqueta do QR Code (`JS_Equipamentos.html`) | **Defeito corrigido**: "Imprimir etiqueta" imprimia a tela inteira do sistema, porque não havia regra de impressão para a etiqueta. Agora abre uma folha A4 com uma etiqueta de 90 × 50 mm, linha de corte, TAG, tipo, modelo, série e cliente/unidade. A impressão começa quando a imagem do QR carrega. Se o navegador bloquear a janela, a mensagem diz o que fazer. No celular não há rolagem lateral. |
| Folha do "Preencher modelo" (`SGO_TemplateAutoclave.js`) | Sem mudança. Tem 1 página, sem sumário, e já segue o padrão. |

### Ajuda e manuais

- `SGO_Ajuda_Cadastros.js`: os passos "Imprimir o QR Code da etiqueta" foram reescritos (folha A4, recorte na linha tracejada, botão no alto da folha) e há um problema novo ("O navegador bloqueou a janela da etiqueta").
- `docs/MANUAL_MODULO_CADEIA_FRIO.md` e `docs/MANUAL_MODULO_ESTUFA_BANHOMARIA.md` ganharam a nota "O que mudou em 18/10/2026".
- As telas da qualificação não mudaram, então a ajuda delas (`SGO_Ajuda_Qualificacao.js`, da frente B) não precisou de alteração.

## 2. Verificação: cada documento gerado de verdade

Todos os PDFs foram gerados pelo servidor de ensaio (tela ou API, caminho **sem IA**, porque não há chave) e lidos página a página como imagem. O sumário foi conferido por script: cada entrada lida do HTML precisa aparecer como título na página indicada do PDF.

PDFs em `%TEMP%\sgo_docA\final\` e imagens em `%TEMP%\sgo_docA\final\png\`.

| Gerador | Caso | Orient. | Págs. | Sumário | Pasta do cliente | PDF |
|---|---|---|---|---|---|---|
| Autoclave, ciclo | 121 °C, aprovado, DTL-04 válido | R | 6 | 17 de 17 conferem | HTML + PDF em `11222333000181` | `auto121_salvo_na_pasta.pdf` |
| Autoclave, ciclo | 134 °C, reprovado, DTL-05 vencido em Observações | R | 6 | 17 de 17 | HTML + PDF | `auto134_salvo_na_pasta.pdf` |
| Memória de cálculo do F0 | 12 sensores | R | 13 | 17 de 17 (uma entrada por sensor) | HTML + PDF | `auto121_memoria_salva.pdf` |
| Teste de estanqueidade | reconstituído, 0,82 mbar/min ≤ 1,30 | R | 4 | 16 de 16 | não grava (uso interno, de propósito) | `leak_autoclave.pdf` |
| Relatório interno | Autoclave simulada, faixa "uso interno" | R | 6 | 17 de 17 | não grava (de propósito) | `interno_autoclave.pdf` |
| Lavadora | semicrítico, A0 3.797,92 s, aprovado, anexo do A0 | R | 7 | 19 de 19 | HTML + PDF | `lav600_salvo_na_pasta.pdf` |
| Lavadora | crítico, 86 °C, reprovado | R | 7 | 19 de 19 | HTML + PDF | `lav3000_salvo_na_pasta.pdf` |
| Cadeia de frio | distribuição, porta e energia; não qualificado | R | 7 | 17 de 17 | HTML + PDF | `cf_salvo_na_pasta.pdf` |
| Estufa de incubação | qualificado | R | 4 | 15 de 15 | HTML + PDF | `eb_salvo_na_pasta.pdf` |
| Preencher modelo | folha padrão (sem modelo oficial) | R | 1 | não se aplica | HTML + PDF | `folha_autoclave.pdf` |
| Manual completo do módulo | Frota (13 telas) | R | 20 (capa + 2 de sumário) | 74 de 74 | não grava (abre para imprimir) | `manual_frota.pdf` |
| Manual completo do módulo | Equipamentos | R | 5 | 8 de 8 | não grava | `manual_equipamentos.pdf` |
| Etiqueta do QR Code | QR de teste (o real vem de serviço externo) | R | 1 | não se aplica | não grava | `etiqueta_qr.pdf` |
| Texto longo (encaixe da IA) | Autoclave com análise e conclusão 5× maiores | R | 7 | 17 de 17 | HTML + PDF | `auto121_textolongo.pdf` |
| Texto longo (encaixe da IA) | Cadeia de frio com introdução, análises e conclusão longas | R | 10 | 17 de 17 | HTML + PDF | `cf_textolongo.pdf` |
| Texto longo (encaixe da IA) | Lavadora | R | 7 | 19 de 19 | HTML + PDF | `lav600_textolongo.pdf` |
| Padrão (teste isolado) | capa, sumário e tabela de 14 colunas em página paisagem dentro de documento retrato | R + P | 7 (folhas 4 e 5 em paisagem) | 11 de 11 | não se aplica | `%TEMP%\sgo_docA\teste\padrao.pdf` |

Conferido em todas as páginas:

- **Encaixe**: nada cortado nem fora das margens.
- **Quebras**: títulos não ficam sozinhos no pé da página, figuras e linhas de tabela não se partem, e o cabeçalho das tabelas longas se repete (memória do F0 e anexo do A0).
- **Folha final**: a última folha do relatório da Autoclave traz o parecer em uma linha, a responsabilidade técnica e as assinaturas. O espaço que sobra embaixo é o normal do fim do documento.
- **Cabeçalho e rodapé**: logo, título, "Nº … · Revisão 00", empresa e "Página X de Y" em todas as folhas, menos na capa.
- **Números e datas pt-BR**: a busca automática não achou ponto decimal antes de unidade, nem "NaN", "undefined" ou "null".
- **Tom**: nenhuma menção a "IA" ou "Gemini" no texto dos documentos.
- **Texto**: justificado e com hifenização em português ("re-gistrador", "campa-nha").
- **Gráficos**: em SVG, com eixos, unidades, faixa e limites, e com a nota da leitura espúria omitida no 121 °C.
- **Cópia na pasta do cliente**: o banco mostra os pares `.html` e `.pdf` com o nome padrão na pasta `11222333000181`. O HTML gravado traz o sumário com os números de página e não traz a faixa de tela (`%TEMP%\sgo_docA\final\cf_copia_salva_na_pasta.html`).
- **Tempo**: com as duas passagens, o manual da Frota (20 páginas) sai em 3,5 a 4,5 s.

## 3. Pendências e observações

1. **Relatório de dados (planilha) da qualificação**: Autoclave, teste de estanqueidade, Lavadora, Cadeia de frio e Estufa. Continua paisagem, com PDF exportado na hora. A planilha fica na raiz "… - Laudos", não na subpasta do cliente, e o PDF dela não é gravado. Não mexi: ela é planilha de trabalho e o documento A4 completo é o relatório de ensaio. Se o dono quiser, o próximo passo é mover a planilha para a subpasta do CNPJ e gravar o PDF.
2. **Descrição da pasta do cliente**: o `SGO_DocSalvar_pastaClienteEm_` grava a razão social quando cria a pasta. A pasta de teste já existia e saiu sem descrição. Com a correção do servidor (72d4a37), as pastas novas passam a mostrá-la.
3. **IA**: o encaixe foi conferido com texto longo simulado. Com a chave real, falta gerar um de cada módulo e ler o documento inteiro, como manda a regra de validar com o PDF real.
4. **Etiqueta**: a imagem do QR vem de um serviço externo (`api.qrserver.com`). Sem internet, a etiqueta sai sem o código. Vale avaliar gerar o QR no servidor.
5. **Gantt das atividades**: só existe na tela, não gera documento. Se for pedido em papel, use `doc.orientacao: 'paisagem'`.
6. Durante o teste, um arquivo da frente B (`SGO_Padroes_DocumentoHTML.js`) estava no meio de uma edição, com a sintaxe quebrada. A cópia de ensaio usou a versão do commit até a frente B terminar.
