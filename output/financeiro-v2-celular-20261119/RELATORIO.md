# Financeiro v2 no celular: correção (19-20/11/2026)

Candidato: `output/financeiro-20261116/cand39` (cand38 + a correção). Nada publicado, nada commitado, nada escrito em produção.

## 1. O que o dono viu (iPhone, 19/11, 23:30)

- Painel financeiro, "Resultado por mês" e "DRE resumida": 1ª coluna com uma letra de largura ("R e c e b i d o" em pé) e valores uns sobre os outros ("R$ 1.018.8R$7230.375,00").
- Empresas e bancos, lista de contas: nome do banco e texto azul ("Matriz por padrão...") em pé, letra por letra; lista de empresa e caixa "aplicação" uma sobre a outra.
- Aprovações, período: "Ven / cim / ento de" e "a / t / é" espremidos ao lado do campo, com a explicação do lado.

Reproduzido igual no SGO+ de verdade (Index.html + includes da cand38) aberto como iPhone: 390 x 844 e 320 x 844, escala 3, `isMobile`, toque, agente do Safari, no modo celular do app (`#app.modo-mobile`, que o JS_Core liga quando a tela tem até 900 px ou é celular deitado), com valores grandes (R$ 1 a 1,5 milhão). Ver `principais-390/` (antes à esquerda, depois à direita).

## 2. Causa

Três camadas de CSS se somavam dentro de `#omieTela`, que é onde as páginas novas vivem:

1. **`UI_Estilos.html` (linha 3338): `.app-shell.modo-mobile #conteudo { overflow-wrap: anywhere; }`.** Vale para todo o conteúdo no modo celular e é herdada. Com `anywhere`, a largura mínima de cada palavra passa a ser UMA letra. Toda coluna de tabela, item de grade ou de linha flexível que se ajusta ao conteúdo pode encolher até uma letra. Só aparece no modo celular do app (é por classe, não por largura). Foi a causa do texto em pé.
2. **`JS_Omie.html` (linhas 130 a 141): regras antigas de `#omieTela`.** No celular, todo `td` vira bloco com `overflow-wrap: anywhere`, e todo `label` vira linha (`display: flex; align-items: center`). A explicação do campo (`.omie-dica`, que o JS_Omie_Ajuda põe dentro do rótulo) virava a 3ª coluna e espremia o nome do campo. Foi a causa do rótulo quebrado das Aprovações (e do "Motivo" em Trilha > Sigilo).
3. **`JS_Financeiro_V2_Componentes.html` (etapa a): o "cartão compacto"** (`.fv-tab-wrap .cm-tabela tbody tr { display: grid !important; grid-template-columns: 1fr 1fr }`) pegava TODAS as tabelas `.fv-tab-wrap`, inclusive as de números (`fv-rolar`), que deviam continuar tabela e rolar. O `!important` vencia o "encaixe no legado". Resultado: a linha virava uma grade de 2 colunas dentro de uma tabela `width: max-content`, com células encolhidas por (1). Era a "meio cartão, meio tabela" da foto, com os valores das colunas 3 e 4 caindo em cima das colunas 1 e 2.

Na lista de contas de Empresas e bancos também havia a combinação (1) + (3) + `select`/caixa com `min-width`, e por isso a lista e a caixa ficavam sobrepostas. Em Bancos e no Painel, a lista de contas (`.fv-conta`) tinha a 3ª coluna ("saldo pelo Omie...") sem quebra, e ela ficava em cima do selo do conector.

## 3. Por que os testes e as capturas da etapa (a) não pegaram

- O teste da etapa (a) (`financeiro-v2-etapa-a-20261119.test.cjs`) conferia em 390 e 320 px só a rolagem lateral da página e se os textos estavam presentes. Texto em pé não dá rolagem lateral (a página fica mais alta, não mais larga), e o texto continua no DOM. Nenhuma asserção media largura de célula nem sobreposição.
- O modo celular estava ativo nas capturas (390 px já liga `modo-mobile`), e o defeito aparece nelas: a DRE está quebrada no fim de `etapa-a/capturas/390-real-01-painel-diretoria.png`. Mas a captura tem 6.873 px de altura e foi conferida reduzida, onde a coluna de uma letra parece só uma linha fina. A tabela "Resultado por mês" fica dentro de "Ver em tabela", que estava fechado.
- O navegador não era um iPhone: escala 1, sem `isMobile`, sem toque. Isso não mudava o defeito, mas deixava a captura pequena demais para ler.
- Achado ao refazer o roteiro: em escala 3, a captura de página inteira do Chromium sai **em branco** quando passa de cerca de 16 mil pixels reais (Empresas tem 11 mil px de altura, ou seja 34 mil reais). O roteiro novo captura em pedaços de 1.500 px e junta (`varredura.cjs` + `costurar.py`).

## 4. O que mudou (cand38 para cand39, `cand38-cand39.patch`)

Só dois arquivos, ambos com fim de linha LF (como estavam):

**`JS_Financeiro_V2_Componentes.html`**
- O cartão compacto da etapa (a) passou a valer só para tabelas marcadas `fv-tab-wrap fv-cartoes`. As de números (`fv-rolar`) não são mais pegas.
- Bloco novo no fim do `<style>`. Toda regra começa com `#app.modo-mobile #omieTela`, ou seja, vale só no Financeiro e só no modo celular do SGO+ (o mesmo critério do JS_Core: até 900 px ou celular deitado). Nenhuma tela fora do Financeiro é tocada, e o computador fica igual. Há uma regra por tipo:
  - `overflow-wrap: break-word; word-break: normal` em `#omieTela`, `td` e `th`: só parte o que não cabe na linha e não encolhe coluna. Não há `anywhere` nem `break-all` no bloco.
  - **(a) tabela de números (`fv-rolar`**: DRE e todo "Ver em tabela" dos gráficos, que são Previsão de caixa e Resultado por mês): continua tabela e rola para o lado dentro da caixa, que cabe na tela. A 1ª coluna fica fixa (`sticky`), com 120 a 170 px e quebra por palavra. Os valores ficam à direita, numa linha só, com algarismos de largura fixa. A legenda `data-r` do cartão antigo fica desligada.
  - **(b) lista operacional (`fv-cartoes`)**: um cartão por linha, com o título na largura toda e os pares rótulo/valor em duas colunas (`minmax(0, 1fr)`). Lista, caixa de texto e apelido ocupam a largura toda, com 44 px e fonte de 16 px (o iPhone não dá zoom). A caixa "aplicação" tem 22 px numa área de toque de 44 px.
  - **(c) rótulos com caixa de texto, lista ou área de texto** (`label:has(> input|select|textarea)`, sem caixas de marcar): o nome em cima, o campo embaixo e a explicação embaixo do campo, na largura toda.
  - Lista de contas (`.fv-conta`, Painel e Bancos): o saldo e "saldo pelo Omie..." descem para baixo do nome, sem cobrir o selo.
  - Lista de nomes de chaves (Empresas e bancos > conectores): alinhada à esquerda no celular. Não é texto corrido: justificada, os nomes longos abriam buracos na linha.

**`JS_Financeiro_V2_Empresas.html`**
- Contas correntes, Regras em vigor e Histórico: `fv-rolar` virou `fv-cartoes`. São listas, não números. As células ganharam `m-titulo` (nome da conta e nome da regra) e `m-largo` (Empresa, Apelido, Em vigor, Campos, Motivo). No computador continuam tabela, e o teste confere isso.

Nenhuma função, texto ou comportamento mudou. Só a apresentação no celular. Por isso a ajuda e o manual não precisaram de ajuste.

## 5. Varredura completa (antes e depois)

`varredura.cjs`: as 17 páginas e cada aba (nova e antiga) que vive nelas (43 telas), como dono (admin) e como Wanessa (Painel, Aprovações e Empresas), em 390, 320 e 1366 px, no modo celular real (iPhone emulado), com valores grandes. Em cada tela, todos os "Ver em tabela" são abertos e o detector roda (`tests/_financeiro_v2_celular.cjs`). Resultado completo em `varredura-antes.json` e `varredura-depois.json`. Capturas de todas as telas em `capturas-antes/` e `capturas-depois/` (390 e 320 px, e 1366 px na 1ª aba de cada página).

**Antes (cand38): 246 defeitos em 19 telas. Depois (cand39): 0 defeitos nas 129 telas. Nenhum erro de JavaScript nas duas.**

| Tela (largura, quem) | Defeito antes | Depois |
|---|---|---|
| Painel > Visão da diretoria (390 e 320, dono) | DRE: 4 rótulos de linha em pé (18 px de largura, até 18 linhas por rótulo). Previsão em tabela: 14 datas em pé (18 px). Resultado por mês: 6 meses partidos ("jun/ 26", "nov /26 (até / hoj / e)"). 19 pares de valores sobrepostos (ex.: "R$ 1.063.905,00" sobre "R$ 1.325.215,00"). "saldo pelo Omie (Fluxo de caixa)" sobre o selo "Sem API · arquivo OFX". | Tabelas legíveis, rolagem só dentro da caixa, 1ª coluna com 170 px; saldo da conta embaixo do nome |
| Painel > Visão da diretoria (320, Wanessa) | 1 texto partido | ok |
| Painel > Meu dia (320, dono e Wanessa) | "Receber" partido em 3 linhas (20 px) | ok |
| Empresas e bancos (390 e 320, dono) | Lista de contas: nome do banco (8 px, 13 linhas), "Banco 001 · ag. ..." (10 px, 43 linhas), "Matriz por padrão..." (2 px, 59 linhas), "aplicação" (2 px), conector em pé. Apelido, caixa "aplicação" e lista de empresa sobrepostos (10 pares). Histórico: data, quem e motivo em pé (23 px). | Cartões: nome, dados do banco, Empresa (lista na largura toda), Apelido, Aplicação/Conector |
| Empresas e bancos (390 e 320, Wanessa) | 32 textos em pé (as mesmas colunas, só leitura) | ok |
| Bancos e saldos (390 e 320) | "Banco do Brasil" e "CAIXA FILIAL" partidos (36 px, em 320). Lista de chaves "Falta: SICREDI_..." com 93 a 163 px e até 57 linhas. "saldo pelo Omie..." sobre o selo do conector. | Saldo embaixo do nome; a lista usa a largura toda |
| Aprovações > Pagamentos do dia (390 e 320, dono e Wanessa) | "Vencimento de" e "até" espremidos ao lado do campo, com a explicação do lado | Nome em cima, campo e explicação embaixo |
| Contas a pagar > Lançamentos e baixas (390 e 320) | O mesmo rótulo de período espremido | ok |
| Trilha > Sigilo (390 e 320) | Rótulo "Motivo" espremido ao lado da caixa | ok |
| As outras 34 telas (Receber, Pagar, Conciliação, Cobrança, Transferências, Notas, Cadastros, Impostos, Caju, Orçamento, Fechamento, Relatórios e suas abas antigas) | nada encontrado | ok |
| 1366 px (todas) | nada encontrado | ok (DRE e contas continuam tabela) |

Rolagem lateral da página e botão cortado: nenhum caso, nem antes nem depois. O problema era o texto em pé e a sobreposição, que a rolagem lateral não mostra.

Ponto cosmético que fica como está (régua do dono: texto corrido justificado): a faixa "1 pagamento(s) aguardando a sua aprovação. [Ver a lista]" é justificada e, em 320 px, abre espaços entre as palavras. Não sobrepõe nem corta nada.

## 6. Teste automático novo

`tests/financeiro-v2-celular-20261119.test.cjs` (com o ambiente e o detector em `tests/_financeiro_v2_celular.cjs`):

1. **Estrutura.** Toda regra do bloco novo começa com `#app.modo-mobile #omieTela`, sem `overflow-wrap: anywhere` nem `break-all`. O cartão compacto vale só para `fv-cartoes`. A DRE e o "Ver em tabela" são `fv-rolar`. As 3 listas de Empresas são `fv-cartoes`.
2. **iPhone de verdade, 390 e 320 px, modo celular confirmado.** Em 390: as 17 páginas, mais Aprovações > Pagamentos, Pagar > Lançamentos, Trilha > Sigilo e Painel > Meu dia. Em 320: Painel, Empresas, Aprovações e Bancos. O teste falha se o detector achar:
   - célula ou rótulo com menos de 60 px e texto de 4 ou mais letras quebrado em linhas, ou texto com mais linhas do que palavras;
   - textos (ou texto e controle) que se cruzam na parte visível;
   - rolagem lateral da página;
   - botão fora da tela.

   Confere também que a DRE é tabela (`table-row`), com a 1ª coluna de pelo menos 120 px e a caixa dentro da tela, e que o rótulo do período fica em coluna.
3. **Computador, 1366 px.** Painel, Empresas e Aprovações sem defeito, e as contas continuam tabela.

Resultado: **cand38: falha** (testes 1 e 2; o 3 passa, porque o computador nunca teve o defeito). **cand39: 3 de 3 passam.**

## 7. Suíte completa

`suite.txt` (DEST = cand39): **304 arquivos, 2.741 testes passaram, 0 falharam, nenhum arquivo com saída diferente de zero.** A referência era 2.738; a diferença são os 3 testes novos. O `email-outlook-20261117`, que costuma falhar de vez em quando, passou nesta rodada.

Observação: a suíte regrava as capturas de outros testes (por exemplo, `output/financeiro-v2-20261119/etapa-a/capturas`), como já acontecia antes.

## 8. Arquivos

- `cand38-cand39.patch`: a correção.
- `principais-390/`: antes e depois lado a lado (Painel diretoria, Meu dia, Contas a pagar, Aprovações, Empresas e bancos, Bancos).
- `capturas-antes/` e `capturas-depois/`: todas as telas da varredura (390 e 320 px em escala 3; 1366 px).
- `varredura.cjs`, `costurar.py`, `lado-a-lado.py`: roteiros. Uso no cabeçalho de `varredura.cjs`.
- `varredura-antes.json`, `varredura-depois.json` e os `.log`: o que o detector achou em cada tela.
- `tests/financeiro-v2-celular-20261119.test.cjs` e `tests/_financeiro_v2_celular.cjs` (no repositório).

Dados: simulados (Omie simulado dos testes, valores do Painel multiplicados para a casa do milhão). Não houve ensaio com dados reais nesta rodada. Os prints do dono (dados reais) mostram os mesmos defeitos, nas mesmas tabelas.
