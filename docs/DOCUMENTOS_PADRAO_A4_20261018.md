# Padrão visual e técnico dos documentos A4 do SGO+ (18/10/2026)

Pedido do dono: todo lugar do SGO+ (e do COMMAND) que gera documento ou PDF gera também o HTML A4 para impressão, na orientação certa, com uma cópia (HTML + PDF) salva na pasta do cliente. Documentos com gráficos, sumário, sem repetição, texto justificado e bem encaixado na folha.

Este arquivo é o contrato comum das três frentes. A implementação de referência é `SGO_DocA4.js` (frente A, único editor junto com `SGO_DocSalvar.js`). As frentes B e C podem usar a `SGO_DocA4` diretamente ou adequar as próprias molduras (`SGO_RelTecA4.js`, `SGO_Documentos_RelatorioA4.js`) a estas regras.

O PDF de produção é gerado no servidor próprio pelo Chromium (Playwright, `sgo_servidor/src/servicos/pdf.ts`), com **JavaScript desligado**, `preferCSSPageSize: true` e fundos impressos. Tudo o que vai para o papel tem de sair só de HTML e CSS. Nada de canvas, Chart.js ou script que monta o conteúdo.

## 1. Página e margens

| Item | Retrato | Paisagem |
|---|---|---|
| `@page` | `size: A4 portrait` (210 × 297 mm) | `size: A4 landscape` (297 × 210 mm) |
| Margens (sup., dir., inf., esq.) | 25 / 15 / 18 / 18 mm | 22 / 15 / 16 / 15 mm |
| Largura útil | 177 mm | 267 mm |
| Folha na tela (`.folha`) | 210 mm | 297 mm |

- A orientação é **do documento** (`doc.orientacao: 'retrato' | 'paisagem'` em `SGO_DocA4_inicioDocumento_`). O padrão é retrato. Quem hoje é paisagem continua paisagem (ver o inventário).
- **Página paisagem dentro de documento retrato** (tabela larga, Gantt, gráfico longo): envolva o trecho em `SGO_DocA4_paginaPaisagem_(html)`. Ele usa página nomeada do CSS (`page: paisagem`): o trecho começa numa folha nova em paisagem e o documento volta ao retrato logo depois. Cabeçalho, rodapé e numeração continuam. Testado no Chromium do servidor (versão 156).
- O inverso (trecho retrato em documento paisagem) usa `SGO_DocA4_paginaRetrato_(html)`.
- Nada passa da largura útil: imagem, SVG e tabela têm `max-width: 100%`. Tabela com mais de 8 colunas numéricas vai para página paisagem ou usa a classe `compacta`.

## 2. Cabeçalho e rodapé corridos (todas as páginas)

Feitos com as caixas de margem do `@page` (`@top-left`, `@top-right`, `@bottom-left`, `@bottom-right`), que o Chromium imprime em toda folha:

- **Cabeçalho**: logo reduzido da empresa à esquerda (39 × 13 mm, JPEG de 28 KB embutido; nunca o PNG original de 750 KB); à direita, em duas linhas, o título curto do documento e "Nº … · Revisão …". Filete de 0,6 pt embaixo.
- **Rodapé**: à esquerda, razão social e CNPJ da empresa executante; à direita, **"Página X de Y"** (`counter(page)` e `counter(pages)`). Filete de 0,6 pt em cima.
- A capa (quando houver) não leva cabeçalho nem rodapé (`@page capa`).
- Número do documento: o do próprio documento (certificado, laudo, relatório). Sem número próprio, use `<SIGLA>-aaaammdd-hhmm` (ex.: `MAN-20261018-1430`). Revisão com dois dígitos ("00", "01"), salvo o PGT/POP, que segue o histórico do próprio documento.
- O rodapé corrido substitui o texto "Emitido pelo SGO+ em …" no fim da página; a data de emissão vai na ficha do documento.

## 3. Abertura, capa e sumário

- **Abertura** (sempre): título (h1), subtítulo de uma linha, ficha do documento (data do ensaio, emissão, número, estudos ou período) e, quando houver veredito, o **quadro de resultado** (verde Aprovado, vermelho Reprovado, cinza Informativo).
- **Capa** (quando couber): documentos longos sem veredito único, como manuais, coletâneas e relatórios gerenciais com mais de 8 páginas. Use `doc.capa: { linhas: [[rótulo, valor]] }`. A capa ocupa a 1ª folha, sem cabeçalho e rodapé, e não conta como página de conteúdo no sumário (a numeração "Página X de Y" conta todas as folhas).
- **Sumário automático** (`doc.sumario: true`): lista os títulos h2 e h3 do documento, com número da seção, pontilhado e **número da página**. Como o PDF não roda script e o Chromium ainda não implementa `target-counter()`, o número da página vem de duas passagens:
  1. a `SGO_DocA4` gera o PDF uma vez;
  2. lê no próprio PDF em que página caiu cada destino interno (`#sec-…`), preenche os números no sumário e gera o PDF final. O sumário reserva a largura do número na 1ª passagem, então a paginação não muda na 2ª.
  Se a leitura falhar (outro conversor, por exemplo), o sumário sai com as seções e sem os números, sem erro.
- Sumário em documento curto (até 3 páginas) não é usado: ocupa mais do que ajuda.

## 4. Numeração

- **Seções**: "1. Identificação", "6.1 Estudo de distribuição", com no máximo 3 níveis (h2, h3, h4). O h4 não entra no sumário.
- **Figuras**: "Figura N — legenda" abaixo do gráfico ou da foto (`SGO_DocA4_figura_`), numeração contínua no documento.
- **Tabelas de resultado**: "Tabela N — legenda" acima da tabela (`SGO_DocA4_legendaTabela_`). Tabelas de identificação (rótulo/valor) e a ficha não levam número.
- O texto cita pelo número ("ver Tabela 3"), nunca "a tabela abaixo" quando ela pode cair na página seguinte.

## 5. Tipografia e cores

| Elemento | Fonte e tamanho |
|---|---|
| Corpo | Arial/Helvetica 9,6 pt, entrelinha 1,45, cor #1f2933 |
| h1 (título) | 15,5 pt, negrito, #0b3d6e |
| h2 (seção) | 11 pt, negrito, #0b3d6e, filete de 0,8 pt embaixo |
| h3 / h4 | 10 pt / 9,6 pt, negrito, #243b53 |
| Tabelas | 8,6 pt (compacta: 8 pt) |
| Legendas e notas | 8,3 pt, #3e4c59 |
| Cabeçalho e rodapé | 7,3 a 7,8 pt, #3e4c59 / #616e7c |

- Situação: verde #1d6b3f (conforme/aprovado), vermelho #a61b1b (não conforme/reprovado), cinza #3e4c59 (informativo). Cor nunca é o único sinal: o texto diz "Aprovado"/"Reprovado".
- Sem caixa alta gritada, sem emoji, sem ícones decorativos, sem gradiente. Tom técnico e impessoal.

## 6. Texto: justificação e hifenização

- `<html lang="pt-BR">` em todo documento.
- Parágrafos e itens de lista: `text-align: justify; hyphens: auto; orphans: 3; widows: 3`.
- Células de tabela, legendas, notas e títulos ficam alinhados à esquerda; números à direita (`td.num`, algarismos tabulares, sem quebra).
- Valor e unidade nunca se separam: espaço inseparável (`SGO_DocA4_val_`).
- Títulos não ficam sozinhos no pé da página (`break-after: avoid`).

## 7. Tabelas

- `thead` com `display: table-header-group`: o cabeçalho **se repete** em cada página.
- Linha nunca quebra no meio (`tr { break-inside: avoid }`).
- Linha de total no fim do `tbody` (classe `total`), nunca no `tfoot`, porque o navegador repetiria o `tfoot` em toda página.
- Célula vazia mostra "—".
- Tabela larga: ver item 1 (página paisagem ou `compacta`).

## 8. Gráficos

- **SVG estático** gerado no servidor (`SGO_DocA4_graficoLinhas_`, `SGO_DocA4_graficoBarras_`), com largura 100% da coluna, fonte Arial, grade clara, eixos com rótulo e unidade, legenda abaixo e números pt-BR nos eixos.
- Escala robusta: leitura espúria isolada fica fora da escala e a legenda diz o valor omitido.
- Faixa aceitável e janela do ensaio sombreadas; limite normativo em linha tracejada vermelha com rótulo.
- Paleta fixa de 20 cores distinguíveis; série destacada pela espessura, não só pela cor.
- Figura não quebra entre páginas (`figure { break-inside: avoid }`).

## 9. Números e datas

- Sempre pt-BR: milhar com ponto, decimal com vírgula (`SGO_DocA4_num_`), "1.511,98 s". Nunca `toFixed()` cru no documento.
- Datas dd/mm/aaaa; data e hora "dd/mm/aaaa hh:mm"; durações em min ou h com vírgula.
- Mesma grandeza, mesmas casas decimais em todo o documento (texto, tabela, gráfico e IA).
- O contexto enviado à IA já leva os números formatados como no documento.

## 10. Regra de não repetir conteúdo

- Cada informação aparece **uma vez**, no lugar dela. Onde for preciso lembrar, cite a seção, tabela ou figura.
- O **quadro de resultado** aparece só na abertura. A conclusão termina com o parecer em uma linha, sem repetir o quadro.
- Critérios de aceitação: o requisito fica na metodologia. A verificação mostra só o resultado obtido e a situação de cada critério.
- Identificação do cliente e do equipamento: uma tabela só, na seção 1. A ficha da abertura traz apenas dados do documento (datas, número, estudos).
- Texto de IA e texto fixo não podem dizer a mesma coisa. Se a IA escreve a metodologia, o parágrafo fixo sai.
- Mensagens de tela (avisos de chave de IA, "salvo na pasta") nunca entram no documento.

## 11. Responsável e assinaturas

- Seção final "Responsabilidade técnica": escopo da validade dos resultados e as assinaturas (técnico executor, responsável técnico e, quando houver aceite, o cliente), com nome, cargo e registro profissional.
- Bloco de assinaturas não quebra entre páginas e fica junto do parágrafo de responsabilidade (`.manter`).
- Assinatura em imagem só se vier da configuração do módulo (SVG que começa com `<svg` ou imagem base64).

## 12. Salvar HTML + PDF na pasta do cliente

- **Pasta**: `<pasta raiz do módulo>/<CNPJ com 14 dígitos>/`. Sem CNPJ, usa o nome do cliente sem caracteres proibidos. A descrição da pasta guarda a razão social. Use `SGO_DocSalvar_pastaClienteEm_(raiz, cnpj, cliente)`.
- Raiz do módulo: a pasta configurada (`*_LAUDOS_FOLDER_ID`) ou uma pasta fixa criada uma vez e guardada em propriedade do script (`SGO_DocSalvar_pastaPersistente_`).
- Documento sem cliente (gestão interna: frota, conduta, padrões, manuais): `<pasta fixa do módulo>/<tema>/`, por exemplo "Frota - Relatorios Gerados/ABC1D23".
- **Nome do arquivo**: `<Tipo do documento> - <número> - <TAG ou identificador> - <aaaa-MM-dd HHmm>`, com `.html` e `.pdf` de mesmo nome. Exemplo: `Relatorio de ensaio - AUT-2026-0101 - AC-01 - 2026-10-18 1430.pdf`.
- Gravação: `SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, html, { pdfBlob })`. O PDF já paginado pela `SGO_DocA4_paginar_` é reaproveitado (sem terceira conversão).
- Documentos de qualificação: `SGO_DocSalvar_finalizarCertificado_` faz tudo (sumário com páginas, gravação e faixa de tela). Ela **nunca lança**: se não salvar, o documento abre igual, com a faixa laranja dizendo o motivo e o caminho ("Use Imprimir > Salvar como PDF").
- O HTML salvo é o mesmo do PDF (sem faixas de tela). A faixa "Documento salvo na pasta do cliente" só aparece na tela e some na impressão.
- Relatório interno com dados simulados **não** é salvo na pasta do cliente e leva a faixa "uso interno".

## 13. Versão de tela

- Barra "Imprimir ou salvar em PDF" no topo (some na impressão).
- Folha branca centrada sobre fundo cinza; no celular a folha ocupa a largura, sem rolagem lateral da página (tabelas largas rolam dentro do próprio quadro).
- O botão usa `window.print()`; a impressão pelo navegador usa as mesmas regras de `@page`.

## 14. API da `SGO_DocA4` (resumo)

Funções antigas continuam iguais: `SGO_DocA4_css_()`, `SGO_DocA4_num_()`, `SGO_DocA4_inicioDocumento_(doc)`, `SGO_DocA4_fimDocumento_()`, tabelas, figuras, assinaturas, registradores, gráficos e IA.

Novas (18/10/2026), todas opcionais:

| Função ou campo | Uso |
|---|---|
| `doc.orientacao` | `'retrato'` (padrão) ou `'paisagem'` |
| `doc.sumario` | `true` coloca o sumário automático depois da abertura |
| `doc.capa` | `{ linhas: [[rótulo, valor]], texto }`: capa sem cabeçalho e rodapé |
| `SGO_DocA4_paginaPaisagem_(html)` / `SGO_DocA4_paginaRetrato_(html)` | trecho em folha de outra orientação |
| `SGO_DocA4_legendaTabela_(n, texto)` | "Tabela N — texto" |
| `SGO_DocA4_paginar_(html)` | acrescenta ids aos títulos, monta o sumário com as páginas lidas do PDF e devolve `{ html, pdfBlob, paginas, sumarioComPaginas }`. Nunca lança |
| `SGO_DocA4_paginasDoPdf_(bytes)` | lê no PDF a página de cada destino interno (`{ 'sec-1': 2, ... }`) |
| `SGO_DocA4_linhaParecer_(status, rótulo, txtAprovado, txtReprovado, txtInfo)` | parecer final em uma linha (o quadro fica só na abertura) |
| `SGO_DocA4_revisao_(r)` | revisão com dois dígitos ("0" vira "00"); usada no cabeçalho, na tela e na capa |
| `SGO_DocA4_tabelaIdent_(pares, classe, { porLinha: 3 })` | 3 pares rótulo/valor por linha, para paisagem (o padrão continua 2) |
| assinatura com `papel` | "Elaborado por", "Revisado por", "Aprovado por" acima da assinatura; as demais reservam a linha para alinhar |

Logo do cabeçalho corrido: na `SGO_DocA4` ele é um SVG em `data:` com o JPEG embutido e saiu em todas as páginas nos testes (Chromium 156). Moldura que usar imagem por URL no `@page` precisa pré-carregar a imagem no corpo, como a frente B fez.

Documento de outra moldura pode usar só o sumário: basta ter `<nav class="sumario" data-sgo-sumario></nav>` no HTML e títulos h2/h3 numerados, e chamar `SGO_DocA4_paginar_(html)` antes de salvar.

## 15. Checklist de qualidade do PDF gerado

Conferir **gerando de verdade** e olhando cada página como imagem:

1. Orientação certa em todas as folhas (inclusive as páginas paisagem internas).
2. Nada cortado na direita ou no pé; nada fora das margens; nenhuma folha quase vazia sem motivo.
3. Cabeçalho e rodapé em todas as folhas (menos a capa); "Página X de Y" com Y correto.
4. Sumário com os números de página batendo com as folhas.
5. Títulos não ficam sozinhos no pé da página; tabelas repetem o cabeçalho; nenhuma linha partida.
6. Gráficos nítidos, com eixos, unidades, legenda e números pt-BR; figuras numeradas na ordem.
7. Todos os números e datas em pt-BR, com as mesmas casas decimais do texto às tabelas.
8. Nenhum conteúdo repetido (quadro de resultado, identificação, critérios, textos da IA e textos fixos).
9. Texto corrido justificado, sem rios grandes; listas e células alinhadas à esquerda.
10. Sem emoji, sem inglês, sem nome de fabricante, sem "IA"/"sistema" no texto do documento.
11. Assinaturas presentes e inteiras na mesma folha.
12. Cópia HTML + PDF na pasta do cliente com o nome padrão; o HTML abre com acentuação certa.
13. Caminho sem IA perfeito; caminho com IA conferido com texto longo simulado (encaixe e quebras).
