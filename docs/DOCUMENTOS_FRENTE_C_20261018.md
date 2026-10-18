# Documentos A4 — frente C (gestão), 18/10/2026

Não publicado no Google. Padrão seguido: `docs/DOCUMENTOS_PADRAO_A4_20261018.md`. Inventário: `docs/DOCUMENTOS_INVENTARIO_20261018.md` (itens C1 a C12, todos tratados abaixo). `SGO_DocA4.js` e `SGO_DocSalvar.js` não foram editados.

## 1. Moldura `SGO_Documentos_RelatorioA4.js` (RelA4_) no padrão comum

- A abertura agora é a da `SGO_DocA4_inicioDocumento_`: logo e "título curto / Nº … · Revisão 00" no cabeçalho de toda folha, empresa e "Página X de Y" no rodapé, título, subtítulo e ficha do documento (referência, emissão, emitido por e itens próprios; com número ímpar de itens o último ocupa a linha inteira). O fim de página antigo ("Emitido pelo SGO+ em…") saiu: o rodapé corrido faz esse papel.
- Número do documento: `SIGLA-aaaammdd-hhmm` (FRT, FRV, CND, CNS, CNM, CNE, CNP, QLD, AUV, INV).
- Numeração automática: seções `RelA4_secao_` viram "1.", subseções `RelA4_subsecao_` viram "1.1", gráficos ganham "Figura N — …" e tabelas com `legenda` ganham "Tabela N — …". Número escrito à mão no título é trocado pelo automático.
- Fecho `RelA4_finalizar_` (chamado por `RelA4_salvar_`): gera o PDF, lê o número de páginas e decide sozinho: até 3 páginas sai sem sumário; de 4 a 8, sumário com o número das páginas (`SGO_DocA4_paginar_`, duas passagens); 9 ou mais, também capa. O PDF paginado é o que vai para a pasta (sem terceira conversão) e o HTML com os números volta para a tela.
- Gravação: nome padrão `<Tipo> - <nº> - <identificador> - <aaaa-MM-dd HHmm>` (HTML + PDF com o mesmo nome). Falha de gravação nunca impede o documento (faixa laranja só de tela).
- Blocos: indicadores com cor de situação, tabela (cabeçalho repetido, linha que não quebra, total no fim do corpo, `compacta`, coluna sem quebra `nw`, tabela de até 8 linhas não se divide entre folhas), marcas, caixas, assinaturas, página paisagem dentro de documento retrato (`RelA4_paisagem_`).
- Gráficos SVG (o PDF sai sem script): barras com espaço calculado para o rótulo e o valor (nada cortado), barras empilhadas com legenda das séries, colunas com grade, linhas de referência tracejadas e legenda. Largura máxima de 177 mm, para o texto do gráfico ter o mesmo tamanho em retrato e paisagem.
- Análise pela IA sem mudança de regra (Gemini 2.5 com raciocínio ligado; sem chave, texto padrão com os mesmos números e aviso só de tela). As regras de redação comuns passaram a ir também nos prompts do Auvo e do Painel de qualidade, e o `toFixed` do prompt da qualidade virou número pt-BR.

## 2. Documentos

| # | Documento | Orientação | O que mudou | Pasta (HTML + PDF) |
|---|---|---|---|---|
| C1 | Frota geral | R + folha P no fim | 8 seções; avisos e pendências (eram duas tabelas com os mesmos itens) viraram "Avisos e providências"; gráficos de retiradas, quilometragem com utilização e composição do custo por veículo (empilhado, com legenda); paradas em tabela; quadro de 12 colunas por veículo em folha deitada | Frota - Relatorios Gerados / Frota completa |
| C2 | Frota por veículo | R | 11 seções; "Resumo gerencial" (repetia as tabelas) virou indicadores + gráfico de gastos por categoria no início; totais nas tabelas; notas e assinaturas juntas | … / placa |
| C3 | Conduta, fechamento mensal | R | velocímetro com farol + 6 indicadores (sem repetir índice e farol); grupos em gráfico com pontos e ocorrências (a tabela repetida saiu); seis meses em colunas com a cor do farol e legenda (a tabela repetida saiu); missões e contestações numa seção; o documento gravado no histórico é o final, com páginas | Programa de conduta - Relatórios / Fechamentos mensais |
| C4 | Conduta, semanal | R | resumo numerado; a seção do bônus não repete os números do resumo, diz a folga até sair do verde | … / Relatórios semanais |
| C5 | Conduta, missões | R | gráfico de valor por executante; a lista de conferências da IA (repetia a lista fixa) saiu; "Situação" não repete a aprovação; assinaturas | … / Missões |
| C6 | Conduta, extrato | R | indicadores com índice e farol da equipe; competência só na ficha | … / Extratos / nome (sem link público) |
| C7 | Conduta, prévia impressa | R | novo `Conduta_apiDocumentoPrevia` (gestão): resultado provisório, defesas e missões pendentes, valores por pessoa; o botão "Imprimir prévia" abre o A4 do servidor | … / Prévias |
| C8 | Painel de qualidade | R | refeito na moldura: indicadores, interpretação com "Pontos de atenção", gráfico de falhas de preenchimento, pessoas (reconhecimento e acompanhamento), gráfico de custo de manutenção, ocorrências com tipo em português; sem IA sai o texto padrão (antes saía a mensagem de erro dentro do documento) | Painel de qualidade - Relatórios (antes não gravava) |
| C9 | Auvo | R | refeito: gráficos em SVG (antes Chart.js e saía em branco no PDF), seção nova "Pendências de fechamento" (foto da última atualização, com evidência), lista de atendimentos; texto padrão sem IA | Auvo - Relatórios (antes não gravava) |
| C10 | Inventário com análise | P | gráfico empilhado da situação documental; total na distribuição por tipo; "Emitido por" só na ficha; colunas TAG/Série sem quebra; tabelas longas compactas; capa e sumário quando longo | subpasta do **CNPJ** do cliente (padrão); sem cliente, "Todos os clientes" |
| C11 | Impressão da tela do inventário | P | "Página X de Y" no rodapé; a ajuda diz que esta impressão não guarda cópia (a cópia é o C10) | não grava (impressão do navegador) |
| C12 | `salvarDocumento` antigo | — | sem chamada na tela; mantido | — |

Frota, despesas, multas e KM a conferir: não há gerador de documento próprio (são telas de consulta). As despesas por veículo saem no quadro deitado do C1 e no C2.

## 3. Correções achadas no caminho

- Auvo: `AuvoRel_parseData_` lia "dd/mm/aaaa" como mês/dia (10/09 virava 9 de outubro; dia maior que 12 sumia do relatório). Agora lê o formato brasileiro; ISO continua igual.
- Inventário: a lista "Documentos já gerados" reconhece a subpasta por CNPJ (mostra o nome do cliente; o perfil Cliente vê a pasta pelo nome antigo ou pelo CNPJ).
- Conduta: reabrir um relatório semanal ou de missões passa pelo mesmo fecho (sumário com páginas quando longo).

## 4. Ajuda e manuais

- `SGO_Ajuda_Frota.js`, `_Conduta.js`, `_Qualidade.js`, `_Auvo.js`, `_Inventario.js`: botão de impressão do próprio relatório, onde fica a cópia, sumário e folha deitada, faixa do texto padrão, falha de gravação, prévia em A4.
- Manuais: `docs/MANUAL_MODULO_FROTA.md`, `docs/MANUAL_MODULO_INVENTARIO_EQUIPAMENTOS.md`, `docs/MANUAL_CONDUTA_FISCAL.md`; manual do gestor na biblioteca do Conduta (`SGO_Conduta_Biblioteca.js`, um trecho) e manual do operador da Frota dentro do `SGO_Frota_ConteudoModulo.js` (trecho do Ctrl+P).
- `*_ConteudoModulo.js` (Conduta, Inventário, Frota): só trechos trocados por script, com conferência da decodificação, da função de leitura e compilação do script interno.

## 5. Como foi testado

- Cópia de `dados/dev/pglite` em `%TEMP%\sgo_docC`, só dados de teste: 2 clientes, 153 equipamentos, 6 veículos (com os valores defeituosos de propósito do 17/10), 18 retiradas, 12 abastecimentos, multas, paradas, despesas, ocorrências de abril a outubro com cinco meses fechados, missões, 34 atendimentos do Auvo, 3 pendências e 4 ocorrências da qualidade.
- Cada documento gerado pelo próprio servidor do legado; o PDF **gravado na pasta** foi renderizado e conferido página a página como imagem (orientação, cabeçalho e rodapé, sumário batendo com as folhas, capa no inventário de 141 equipamentos com 12 páginas, tabelas, gráficos e legendas, sem corte). Os mesmos documentos com análise longa simulada (6 parágrafos e lista) para conferir o encaixe.
- Servidor `SGO_ENSAIO=1` em `PORTA=8232` (a 8212 estava ocupada por outro processo, que não foi tocado), Playwright em 1440 px com o perfil Gestor: relatório geral e por veículo da Frota, semanal, missões, extrato, fechamento mensal, prévia, qualidade, Auvo e inventário gerados pelos botões das telas, sem erro de JavaScript. Versão de tela de todos em 390 e 1366 px sem rolagem lateral. Servidor parado no fim.
- Sem chave de IA local: caminho sem IA conferido de verdade; com IA só o encaixe (texto simulado).

## 6. Pedidos e notas para as outras frentes

- Frente A (`SGO_DocA4`): funcionou como descrito. Nenhum pedido obrigatório. Sugestão: no servidor próprio a pasta não guarda descrição (`Folder.setDescription` não existe na camada de compatibilidade), então a subpasta por CNPJ não mostra a razão social; resolvi no inventário cruzando com o cadastro.
- Relatórios antigos já gravados no histórico do Conduta (`qual_relatorio`) continuam com a moldura antiga até serem gerados de novo.
