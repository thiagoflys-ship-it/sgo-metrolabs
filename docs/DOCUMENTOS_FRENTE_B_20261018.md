# Documentos técnicos em A4: frente B (18/10/2026)

**Pedido do dono:** todo gerador de documento do SGO+ gera HTML A4 para impressão.
- A orientação de cada documento é mantida.
- Cópia em HTML e em PDF fica na pasta do cliente.
- Os documentos têm sumário, gráficos e numeração, sem repetição, com texto justificado e encaixado nas margens.

**Padrão seguido:** `docs/DOCUMENTOS_PADRAO_A4_20261018.md`.
**Inventário:** `docs/DOCUMENTOS_INVENTARIO_20261018.md`, frente B: itens B1 a B15, todos cobertos.

**Situação:** nada foi publicado. Não houve clasp nem deploy.

## Como foi testado

- **Servidores de ensaio:** quatro servidores (portas 8212 a 8215), cada um com a sua cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_docB_N`. No fim, mais uma rodada integrada na porta 8211, com uma cópia nova do banco e todo o código junto. Todos foram iniciados com `SGO_ENSAIO=1 SGO_AGENDADOR=0`, sem chave de IA, e parados no fim.
- **Geração:** cada documento foi gerado de verdade pelas APIs, com dados de teste. Depois, o PDF **gravado pelo servidor** na pasta do cliente foi baixado e lido página a página como imagem, antes e depois das mudanças.
- **Caminho com IA:** testado com respostas simuladas do Gemini, de texto longo, num harness Node (vm). Foi conferido o encaixe, as quebras e o sumário. As conferências de número inventado, veredito, fabricante, ponto decimal e resposta cortada continuam valendo.
- **Telas alteradas:** cada `*_ConteudoModulo.js` alterado foi conferido decodificando a string e compilando o `<script>` interno.

Os PDFs ficam em `C:\Users\venda\AppData\Local\Temp\claude\c--Users-venda-projetos-google-script-dev\38088561-7377-4972-b573-afb90ff4ba72\scratchpad\docB\`, chamada `<docB>` nas tabelas:

| Pasta | Conteúdo |
|---|---|
| `base\` | linha de base, antes |
| `integrado\` | rodada final com todo o código, PDFs gravados pelo servidor |
| `ag1\out\` | CertCal |
| `ag2\out\` | Padrões e RelCal |
| `ag3\out\final\` | NR-13, Declaração e QI/QO/QD |
| `ag4\out\finais\` | PGT/POP, Planejamento CME, Cronograma e Registros |

## Moldura comum: `SGO_RelTecA4.js`

**Página:**
- `@page` com tamanho e margens do padrão: retrato 25/15/18/18 mm; paisagem 22/15/16/15 mm, com `orientacao: 'paisagem'`.
- Cabeçalho corrido: logo à esquerda; à direita, em duas linhas, o título curto e "Nº · Revisão".
- Rodapé corrido: empresa e "Página X de Y".
- A 1ª página não repete o cabeçalho corrido, porque já abre com o logo, o título e o número.

**Logo do cabeçalho:** o Chromium só desenha a imagem de uma caixa de margem que já foi carregada. Sem a correção, as páginas 2 em diante saíam sem o logo. Por isso o logo é pré-carregado, invisível, na própria folha de estilo.

**Sumário e numeração:** a moldura inclui o CSS do sumário, das legendas e das páginas de outra orientação da `SGO_DocA4`. Funções novas:

| Função | Para que serve |
|---|---|
| `RelTecA4_numerador_()` | numera "Tabela N —" e "Figura N —" |
| `RelTecA4_sumario_()` | sumário |
| `RelTecA4_paginar_()` | duas passagens, com o número de página lido no PDF |
| `RelTecA4_numeroAuto_('SIGLA')` | número `SIGLA-aaaammdd-hhmm` |
| `RelTecA4_graficoIncerteza_()` | SVG de tendência ± U95 por ponto, com o eixo nas mesmas casas da grandeza |

**Regra do sumário:** entra quando o documento passa de 3 páginas. A contagem é feita no PDF, menos no certificado, que usa a regra aproximada descrita nas pendências.

## Documento × verificação

Colunas: **Orient.** = orientação; **Pág.** = páginas antes → depois; **Sum.** = sumário; **Num.** = seções, tabelas e figuras numeradas; **Gráfico** = gráfico em SVG; **Rep.** = sem repetição; **Just.** = texto justificado; **Assin.** = assinatura junto do fecho; **Pasta** = cópia HTML + PDF na pasta; **Sem IA** = caminho sem IA; **IA sim.** = caminho com IA simulada.

| # | Documento | Orient. | Pág. | Sum. | Num. | Gráfico | Rep. | Just. | Assin. | Pasta | Sem IA | IA sim. | PDF final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Certificado de calibração | R | 4 → 3 | com 3 grandezas, ou 2 com fotos | sim (7 seções, Tab. 1–10) | — (opcional) | ok | ok | ok | CNPJ, `Certificado de calibracao - nº - TAG - data` | ok | — | `<docB>\integrado\cert.pdf`; `ag1\out\FINAL_*_cert_srv.pdf` |
| B2 | Relatório interpretativo | R | 2 → 2 | até 3 págs. | sim | tendência ± U95 por grandeza | ok | ok | ok | CNPJ, `Relatorio interpretativo - …` | ok | ok | `<docB>\integrado\interp.pdf`; `ag1\out\ia_interp.pdf` |
| B3 | Reabertura do certificado | R | igual à emissão | igual | igual | — | — | — | — | não grava de novo | HTML igual byte a byte em 3 cenários | — | — |
| B4 | Plano de renovação dos padrões | R | 2 → 2 | — | sim, nº REN- | barras legíveis | ok | ok | ficha "Emitido por" | interna | ok | ok | `ag1\out\FINAL_2grandezas_ren_srv.pdf` |
| B5 | Desempenho dos certificados | R | 1 → 1 | — | sim, nº DES- | barras (pontos por grandeza corrigido) | ok | ok | idem | interna | ok | ok | `ag1\out\FINAL_2grandezas_des_srv.pdf` |
| B6 | Inventário dos padrões | **P** (antes saía R) | 3 → 2 (5 com 7 padrões) | acima de 3 padrões | sim, nº INV- | — | ok | ok | responsável na ficha | interna, agora HTML + PDF | ok | — | `ag2\out\inventario_salvo_final.pdf`, `…_grande.pdf` |
| B7 | Solicitação de orçamento | **P** (antes saía R) | 2 → 2 | — | sim, nº ORC- | — | ok | ok | ok | interna, agora HTML + PDF | ok | ok | `ag2\out\orcamento_salvo_final.pdf`, `orcamento_com_ia_simulada_final.pdf` |
| B8 | Relatório de calibração | R | 3 → 2 | — | sim, certificado como figura | — | ok | ok | ok | CNPJ, `Relatorio de calibracao - RC - TAG - data` | ok | ok | `<docB>\integrado\relcal.pdf`; `ag2\out\relcal_com_ia_simulada_final.pdf` |
| B9 | Laudo NR-13 (com memória de cálculo) | R | 4 → 3 (5 com fotos) | acima de 3 págs. | 8 seções, Tab. 1–4, Fig. 1 | curva do teste hidrostático | ok | ok | PLH junto do parecer | CNPJ, `Laudo NR-13 - nº - TAG - data` | ok | ok | `<docB>\integrado\nr13.pdf`; `ag3\out\final\B9_*.pdf` |
| B10 | Declaração de execução | R | 2 → 2 | — | sim, Tab. 1 | — | ok | ok | ok | CNPJ, `Declaracao de execucao - …` | ok | ok | `<docB>\integrado\declaracao.pdf`; `ag3\out\final\B10_*.pdf` |
| B11 | Relatório QI/QO/QD | R | 4 → 3 | acima de 3 págs. | Tab. 1–3, só os anexados como figura | — | ok | ok | ok | CNPJ, `Relatorio de qualificacao - …` | ok | ok | `ag3\out\final\B11_*.pdf` |
| B12 | PGT | R | não gerava → 22 (IA simulada) | sim, 37 itens com páginas | sim | — | ok | ok | 4 assinaturas juntas | CNPJ, `PGT - … rev N.0 - …` | recusa consciente (decisão de 17/10) | ok | `ag4\out\finais\B12_PGT_comIA_simulada.pdf` |
| B12 | POP | R | 2 → 2 | acima de 3 págs. | sim, Tab. 1 = histórico | — | ok | ok | ok | CNPJ; o "Salvar" manual não duplica mais | ok (com roteiro) | ok | `<docB>\integrado\pop.pdf`; `ag4\out\finais\B12_POP_*.pdf` |
| B13 | Planejamento CME | R | 3 → 4 (6 com IA) | sim | Tab. 1–3, Fig. 1 | barras: base × total com margem | ok | ok | ok | CNPJ, `Planejamento tecnico CME - PLC - …` | ok | ok | `<docB>\integrado\plancme.pdf`; `ag4\out\finais\B13_*.pdf` |
| B14 | Cronograma | R | 3 → 3 | acima de 3 págs. | Tab. 1–2, Fig. 1 | Gantt (grupos × dias, fins de semana e feriados sombreados) | ok | ok | ok | CNPJ, `Cronograma de execucao - CRN - …` | ok | ok | `<docB>\integrado\cronograma.pdf`; `ag4\out\finais\B14_*.pdf` |
| B15 | Registro operacional | R | 1 → 1 (3–4 com muitos campos) | — | simples | — | ok | ok | nome, cargo e papel | CNPJ, `Registro operacional - REG - …` | ok | não usa IA | `<docB>\integrado\regop.pdf`; `ag4\out\finais\B15_*.pdf` |

## Principais correções

**Em todos os documentos:**
- títulos sem caixa alta gritada;
- seções numeradas;
- "Tabela N —" acima da tabela e "Figura N —" abaixo, citadas pelo número;
- assinaturas no mesmo bloco do último parágrafo: não há mais folha só com assinatura ou com nota solta;
- sem "SGO+", "sistema", "automático" ou nomes de campo internos no texto do documento.

**Repetições retiradas:**
- normas citadas duas vezes: RelCal, Declaração, QI/QO/QD, NR-13;
- itens listados duas vezes: Declaração, QI/QO/QD;
- aviso de "sem declaração de conformidade" duplicado: certificado, Declaração;
- "Próxima calibração" três vezes no interpretativo;
- parágrafo da E.R.U. duplicado e texto repetido por receita no Planejamento CME;
- identificação partida em três tabelas no interpretativo.

**Conteúdo corrigido:**
- desempenho: "Pontos calibrados por grandeza" contava blocos, não pontos;
- NR-13: PMTA com casas diferentes entre a identificação e a memória de cálculo, agora 0,254973 MPa nas duas;
- orçamento de padrões: a faixa cadastrada cortava pontos de outra unidade (pontos de % UR num registrador de °C);
- plural ("1 certificados");
- texto da estratégia de grupos do cronograma ("o(s) primeiro(s) grupo(s) recebe(m)").

**Gráficos novos em SVG:** são estáticos, porque o PDF é gerado sem JavaScript.
- interpretativo: tendência ± U95;
- cronograma: Gantt;
- Planejamento CME: barras dos insumos;
- gerenciais: barras legíveis, que antes saíam ilegíveis;
- NR-13: curva com eixos refeitos.

**Pastas:** B1, B2, B8, B9, B10 e B11 passam a gravar na subpasta com o CNPJ (`SGO_DocSalvar_pastaClienteEm_`).
- Sem CNPJ no formulário, o CNPJ é buscado no cadastro pelo nome do cliente.
- B6 e B7 passam a gravar também o PDF.
- As listas de documentos mostram as pastas antigas, com o nome do cliente, e as novas, com o CNPJ.

**Telas (sem mudança visual):**
- o "Salvar" passa a enviar o CNPJ: RelCal, Declaração, QI/QO/QD e fotos do NR-13;
- a tela de documentos dos padrões mostra "Nº INV-…/ORC-…" no lugar do ID interno.

**Ajuda e manuais:**
- ajuda atualizada: `SGO_Ajuda_Calibracao/Documentos/Planejamento/Qualificacao.js`;
- `docs/MANUAL_MODULO_*` com a nota "O que mudou em 18/10/2026";
- instruções antigas de "Salvar no Drive" corrigidas nos manuais da Declaração e do QI/QO/QD.

## Arquivos alterados (frente B)

Em `apps-script-imports/portal_sgo_versao_cnpj_db/`:

| Grupo | Arquivos |
|---|---|
| Moldura | `SGO_RelTecA4.js` |
| Certificado de calibração | `SGO_CertCal_Documento.js`, `_IA.js`, `_GestaoRelatorios.js`, `_GestaoIA.js`, `_Main.js` |
| Padrões | `SGO_Padroes_Documentos.js`, `_DocumentoHTML.js`, `_DocumentoCSS.js`, `_Orcamento.js`, `JS_Padroes_Documentos.html` |
| Relatório de calibração | `SGO_RelCal_Documento.js`, `_Main.js`, `_ConteudoModulo.js` |
| NR-13 | `SGO_NR13_Documento.js`, `_IA.js`, `_Main.js`, `_ConteudoModulo.js` |
| Declaração e QI/QO/QD | `SGO_DeclaracaoExec_Documento.js`, `_DocumentoQIQO.js`, `_IA.js`, `_Main.js`, `_ConteudoModulo.js`, `SGO_DeclaracaoExecQIQO_ConteudoModulo.js` |
| PGT e POP | `SGO_PgtPop_Documento.js`, `_Main.js` |
| Planejamento CME | `SGO_PlanCME_Documento.js`, `_IA.js`, `_Main.js` |
| Cronograma | `SGO_CronExec_Documento.js`, `_IA.js`, `_Main.js`, `_Grupos.js` |
| Registros operacionais | `SGO_RegOp_Documento.js`, `_Main.js` |
| Ajuda | `SGO_Ajuda_Calibracao.js`, `_Documentos.js`, `_Planejamento.js`, `_Qualificacao.js` |

Manuais em `docs/`:
- `MANUAL_MODULO_CERTIFICADO_CALIBRACAO.md`
- `MANUAL_MODULO_RELATORIO_CALIBRACAO.md`
- `MANUAL_MODULO_DECLARACAO_EXECUCAO.md`
- `MANUAL_MODULO_RELATORIO_QUALIFICACAO_QIQOQD.md`
- `MANUAL_MODULO_PGT_POP.md`
- `MANUAL_MODULO_PLANEJAMENTO_CME.md`
- `MANUAL_MODULO_CRONOGRAMA_EXECUCAO.md`
- `MANUAL_MODULO_REGISTROS_OPERACIONAIS.md`

Não foram editados `SGO_DocA4.js` nem `SGO_DocSalvar.js`, que são da frente A.

## Pedidos para a frente A e para o servidor

1. **`SGO_DocA4_assinaturas_`:** aceitar o campo `papel` ("Elaborado por", "Revisado por"). O PGT/POP usa uma cópia própria só por isso.
2. **`SGO_DocA4_tabelaIdent_`:** opção de 3 pares por linha em paisagem. O inventário dos padrões tem um auxiliar local para isso.
3. **`sgo_servidor/src/compat/drive.ts`:** a pasta não tem `getDescription` nem `setDescription`, então a razão social não fica gravada na pasta com nome de CNPJ. A `SGO_DocSalvar_pastaClienteEm_` engole o erro.

## Pendências e decisões

1. **IA real:** validar com a chave GEMINI_API_KEY lendo o PDF inteiro, como manda a regra do dono, nestes documentos:
   - PGT;
   - POP sem roteiro;
   - interpretativo;
   - RelCal;
   - Declaração;
   - QI/QO/QD;
   - Planejamento CME;
   - Cronograma.

   O encaixe foi conferido só com texto simulado.
2. **NR-13 (decisão do dono):** o item 13.5.4.11 pede também o nome legível e a assinatura dos técnicos que participaram da inspeção. O laudo traz só o PLH, e o formulário não tem esse campo.
3. **Sumário do certificado:** é decidido por uma regra aproximada (3 grandezas, ou 2 com fotos). Um certificado com 2 grandezas e muitos pontos pode passar de 3 páginas sem sumário.
4. **Duplicação nos módulos:** a lógica "sumário só acima de 3 páginas" e o bloco de abertura com logo e número estão repetidos em vários módulos. Podem virar `RelTecA4_sumarioSeLongo_` e `RelTecA4_abertura_` numa próxima rodada, sem mudar o resultado.
5. **Arquivos antigos:** as pastas antigas, com o nome do cliente, continuam como estão. Os documentos antigos reabrem com o HTML salvo na época; o certificado reaberto sai no layout novo, com os dados do próprio snapshot.
6. **Identidade visual:** o certificado e o interpretativo mantêm a identidade verde própria do CertCal; os demais seguem o azul do padrão.
7. **`SGO_PlanCME_Calculo.js`:** a mensagem de tela `avisoIA` usa a regex `[.s]` no lugar de `[.\s]`. É cosmético e não vai para o documento.
