# Financeiro v2 — Guia visual

**Data:** 19/11/2026 · **Fase:** 2 (design) · **Base de conteúdo:** `../ESPECIFICACAO.md`
**Referência visual:** módulo Comercial da cand34 (`JS_Comercial.html`, classes `cm-*`) sobre a casca do SGO+ (`UI_Estilos.html`, tokens `--bc-*`).
**Protótipo:** `prototipo/index.html` (abre direto do disco). **Capturas:** `capturas/` (1366 e 390 px).

---

## 1. Princípio

O Financeiro v2 **não cria um sistema visual novo**. Ele usa a casca "Bancada" do SGO+ (fundo creme, menu grafite, verde de ação, Instrument Sans) e as peças do Comercial (cabeçalho de módulo, faixas, cartões de indicador, abas, selos, tabela que vira cartão no celular, barra de seções no celular, janela `atv-modal`). O que entra de novo tem prefixo `fv-` e só cobre o que o Comercial não precisa: empresa, dinheiro, gráficos, conciliação e aprovação.

Diagnóstico da tela atual: o Financeiro de hoje é **uma página com 29 abas** (`OMIE_ABAS` em `JS_Omie_Gestao.html`), com faixas e botões de outra família (`vg-faixa`, `cadx-btn`). O v2 troca isso por **17 páginas no menu lateral**, cada uma com o padrão do Comercial.

## 2. Cores

### 2.1 Do sistema (não mudar)

| Papel | Token | Valor | Uso no Financeiro |
|---|---|---|---|
| Fundo | `--bc-bg` | `#F6F5F1` | fundo da página e da barra fixa da empresa |
| Superfície | `--bc-surface` / `--card` | `#FFFFFF` | caixas, cartões, tabelas |
| Superfície 2 e 3 | `--bc-surface-2/3` | `#FAF9F6` / `#F1EFE9` | cabeçalho de tabela, área de anexar, faixa do grupo |
| Linha | `--bc-line` / `--border` | `#E2E0D8` | bordas |
| Texto | `--bc-text` | `#1C1F1D` | números e títulos |
| Texto apagado | `--bc-text-3` / `--muted` | `#5F645F` | rótulos, "atualizado às" |
| Ação | `--bc-action` / `--success` | `#1F6B2A` | botão principal, "em dia", entrada no extrato |
| Perigo | `--bc-danger` | `#A3261B` | vencido, recusado, saída negativa no resultado |
| Atenção | `--bc-warn` | `#7A5200` | aguardando, falta credencial, desvio de orçamento |
| Informação | `--bc-info` | `#1E4F7A` | sugerido, faixa informativa, seleção |

**Situação nunca vem só pela cor:** todo vermelho, laranja ou verde tem ícone e texto (ex.: `Vencido`, `Falta credencial`, ícone de alerta no cartão).

### 2.2 Novas (só do Financeiro, em `:root`)

| Papel | Token | Valor | Regra |
|---|---|---|---|
| Matriz | `--fv-matriz` | `#2a78d6` (azul) | identidade da empresa: ponto, chip, borda do formulário, barra empilhada |
| Filial | `--fv-filial` | `#eb6834` (laranja) | idem |
| Prestadora | `--fv-prestadora` | `#1baf7a` (verde-água) | idem |
| Entradas / realizado | `--fv-entrada` | `#1f3b57` (tinta azul-escura) | barras e linhas de dinheiro |
| Saídas / orçado | `--fv-saida` | `#b9b4a6` (cinza quente) | barra par da entrada |
| Previsto | `--fv-previsto` | `#4A4F4B` | linha tracejada ou contorno |
| Idade da dívida | `--fv-seq-1..4` | `#f3dfb2 → #8a4b0c` | escala de um tom só, do claro (recente) ao escuro (antigo) |

**Por que essas:**
- As três cores de empresa são as três primeiras da paleta categórica validada (script `validate_palette.js`, modo claro, **todos os pares**): passam no teste de daltonismo e de distinção.
- O verde-água fica abaixo de 3:1 de contraste sobre o branco. Por isso **a empresa sempre aparece com o nome ao lado do ponto**, nunca só pela cor.
- Entradas e saídas usam tinta neutra, sem matiz próprio. Assim a cor fica reservada para **empresa** (identidade) e **situação** (verde, laranja, vermelho), e um gráfico de fluxo nunca parece "da Matriz".
- A cor da empresa é fixa: um filtro que esconde a Filial não repinta a Prestadora.

### 2.3 Tema escuro

O SGO+ **não tem tema escuro** (`color-scheme: light` em `UI_Estilos.html`, sem `data-theme` nem `prefers-color-scheme`). O v2 segue a casca e fica só no claro.

Se a casca ganhar tema escuro um dia:
- os gráficos já leem tudo de tokens;
- basta redefinir `--fv-*` e `--bc-*` para o escuro, com os passos escuros da mesma paleta (`#3987e5`, `#d95926`, `#199e70`), validados contra a superfície escura.

## 3. Tipografia e números

| Elemento | Estilo |
|---|---|
| Fonte | `Instrument Sans` (`--bc-sans`), igual ao sistema |
| Título da página | `.content-title` 24 px / 700, com o traço do `module-header` |
| Subtítulo (objetivo da página) | `.content-subtitle`, **justificado** |
| Título de caixa | 14 px / 700 |
| Rótulo de campo e de cartão | 12 px / 700, `--muted` (igual `cm-filtros label`) |
| Valor de cartão | 22 px / 800, algarismos tabulares (no celular 18 e 16 px) |
| Número principal (caixa agora) | 34 px / 800 (28 px no celular) |
| Tabela | 12,5 px; valores à direita, algarismos tabulares |
| Códigos (TRF-0041, linha digitável, código de integração) | `IBM Plex Mono` (`--fv-cod`), 11,5 px |

**Números:**
- Sempre pt-BR, pelo `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`: `R$ 1.234,56`.
- Tabelas, prévias e janelas de confirmação mostram o **valor inteiro**.
- O formato curto (`R$ 412 mil`, `R$ 1,2 mi`, função `Fin_moedaCurta_`) só aparece em eixo de gráfico, legenda e trio de cartão.
- Negativo: sinal "−" e cor `--danger` só em resultado. Em extrato, a saída é vermelha e a entrada verde.
- Percentual com espaço: `41,0 %`.
- Datas: `19/11` em listas, `19/11/2026` em prévias e PDF.

**Texto corrido justificado** (régua do dono): subtítulos, faixas (`cm-faixa`), travas, estados e parágrafos de janela usam `text-align: justify`. Rótulos curtos, valores e legendas **não** se justificam (classe `.cm-det dd` corrigida no `financeiro-v2.css`), senão "Lucro Presumido" vira "Lucro      Presumido".

## 4. Espaço, cartões e grade

- **Raio:** 8 px nas caixas e cartões (como `cm-caixa`/`cm-kpi`), 4 a 6 px em botões e campos (sistema).
- **Folga entre caixas:** 12 px. Dentro da caixa: 14 × 16 px.
- **Grades:** `fv-g4` (4 cartões), `fv-g3`, `fv-g2` e `fv-g-hero` (1,55 : 1, número principal + aprovações). No celular, 2 colunas para cartões e 1 coluna para o resto.
- **Cartão de indicador** (`fv-kpi`): faixa de 3 px no topo com a situação (neutro, ok, aviso, crítico), igual `cm-kpi`. **É um botão:** abre a lista que originou o número.
- **Sombra:** nenhuma em repouso (casca "Bancada"). Leve no passar do mouse.

## 5. Estrutura de toda página

```
module-header   título · objetivo justificado · botões (principal à direita, verde)
fv-barra        [Todas | Matriz | Filial | Prestadora]  [período]   atualizado às … · DADOS FICTÍCIOS (só protótipo)
cm-faixa        regra em vigor ou aviso da página (quando houver)
fv-g4           4 indicadores que abrem listas
cm-tabs         recortes da lista (Em aberto, Vencidos…)
conteúdo        tabela fv/cm-tabela, cartões fv-card-op ou painéis lado a lado
fv-sel-lote     barra escura fixa embaixo quando há itens marcados
```

- A **barra da empresa** fica fixa no topo da área de conteúdo enquanto se rola (computador).
- Toda tela que **grava** exige uma empresa. Mesmo vendo "Todas", o formulário abre com a faixa `fv-form-empresa` na cor da empresa ("Saindo de **Matriz**"). Lançar na empresa errada fica visível.

## 6. Menu e navegação

- **Computador:** o menu lateral grafite ganha três grupos (componente `menu-grupo` do sistema):
  - "Financeiro · dia a dia"
  - "Financeiro · bancos e documentos"
  - "Financeiro · gestão"
- Contadores (`menu-badge`) em Aprovações e Conciliação.
- **Celular:** igual ao Comercial (`cm-nav-mob`):
  - barra de pílulas roláveis no topo com as 17 seções, nomes curtos (Painel, Aprovações, Receber, Pagar…);
  - a seção aberta fica centralizada;
  - o seletor de empresa vira uma lista de largura total ("Empresa: todas (consolidado)").

## 7. Botões e ações

| Tipo | Classe | Uso |
|---|---|---|
| Principal | `btn-primary` (verde sólido) | uma por área: "Aprovar", "Confirmar", "Nova conta a pagar" |
| Secundária | `btn-secondary` (branco com contorno) | o resto |
| Perigo | `btn-outline-danger` | "Desligar pagamentos agora" |
| Link | `.fv-link` (verde, sem caixa) | "Bancos e saldos →" no canto da caixa |

- Altura mínima de **44 px** (regra do Comercial, `min-height: 44px !important`). Botões dentro de tabela no computador: 32 px.
- No celular, o cartão de aprovação põe **Aprovar e Recusar lado a lado**; o terceiro botão vai para a linha de baixo.
- Ícones: Font Awesome 6.5.2 (o mesmo da casca), sempre com `aria-hidden` e texto ao lado.

## 8. Gráficos

**Escolha:** SVG próprio (`prototipo/js/fv-graficos.js`), sem biblioteca nova.
- O SGO+ já carrega Chart.js 4.4.1 por CDN sob demanda (`carregarChartJs_` em `JS_Core.html`), usado no Início e em Ganhos dos vendedores.
- Para o Financeiro, o SVG próprio é melhor por quatro motivos:
  - são só 5 formas simples;
  - desenha na hora, sem esperar a CDN;
  - sai igual no PDF A4;
  - quando a CDN cai, o Financeiro não fica sem gráfico (o Ganhos dos vendedores tem esse problema e precisa de "barras simples" de reserva).

| Forma | Onde | Regras |
|---|---|---|
| Linha com faixa | Previsão de caixa 30/60/90 | linha de 2 px; faixa provável em 8 % de opacidade; linha do zero; abaixo de zero fundo `--danger-bg`; ponto e rótulo no dia de menor saldo |
| Barras pareadas | Resultado por mês, orçado × realizado, previsto × realizado | uma escala só (nunca dois eixos); ponta arredondada de 4 px; 2 px entre as barras; resultado escrito embaixo; mês em andamento mais claro com "*" |
| Barra empilhada 100 % | Caixa por empresa, idade do a receber | 2 px de folga entre segmentos; legenda com valor e % sempre escritos |
| Barras horizontais (HTML) | Despesas por categoria, maiores clientes | rótulo à esquerda, valor à direita, variação sobre a média com ícone quando > 30 % |
| Mini linha | Saldo da conta em Bancos | 120 × 30 px, sem eixo |

**Em todo gráfico:**
- grade discreta (`#ECEAE3`);
- texto em tinta, nunca na cor da série;
- **dica ao passar o mouse ou o dedo** (cursor vertical na linha; por mês nas barras);
- **"Ver em tabela"** embaixo, para leitura sem gráfico e para quem usa leitor de tela.
- O gráfico mede a largura da caixa ao desenhar, para o texto não encolher no celular.

## 9. Estados (toda página tem os cinco)

| Estado | Componente | Texto (modelo) |
|---|---|---|
| Carregando | `Fin_estado_("carregando")`: esqueleto com brilho (parado se o aparelho pede menos movimento) | — |
| Vazio | `fv-estado` tracejado, ícone de caixa | "Nenhuma conta a pagar nesta semana. Nada vence entre 19 e 25/11 na Matriz. Para ver outro período, use o seletor no topo." |
| Erro | `fv-estado.erro` | "O Omie não respondeu. A leitura passou de 30 segundos e foi interrompida. **Nada foi gravado.** Os números são da fotografia das 06:30." + Tentar de novo |
| Sem credencial | `fv-estado.credencial` (laranja, chave) | "Falta gravar SICOOB_MATRIZ_CLIENT_ID e SICOOB_MATRIZ_CERT_PFX. Até lá, o saldo vem do Omie e o extrato entra por arquivo OFX." (só o **nome** da chave, nunca o valor) |
| Sem permissão | `fv-estado.permissao` (azul, cadeado) | "O Financeiro é restrito ao dono, ao Charles e à Wanessa…" + Abrir o bate-papo |

**Trava** (`fv-trava`): sempre três linhas, **O que houve / Por quê / O que fazer**. Exemplos no protótipo:
- botão de fechar desligado;
- Wanessa na fila de aprovação;
- guia de CNPJ diferente;
- troca de chave Pix por terceiro.

## 10. Comportamentos obrigatórios

- **Auto-refresh nunca redesenha formulário em edição.** A tabela (`Fin_tabela_`) redesenha só o `<tbody>` e guarda filtros, ordem, seleção e página em `cfg._st`. Saldos e contadores se atualizam no lugar. Se houver formulário aberto ou campo com foco, a atualização espera e mostra "há dados novos — atualizar" na barra.
- **"Atualizado às"** em toda página, com a fonte: "Bancos às 10:30 · Omie às 10:41". Saldo sem API diz a origem ("saldo do Omie · ontem 18:00").
- **Marca d'água** de `JS_Financeiro_Marca.html` mantida (nome · login · data e hora · SIGILOSO) em todas as páginas e no PDF.
- **Mostrar a tela real:** a ajuda e o manual de cada página usam capturas do sistema rodando, como as de `capturas/`, nunca ilustração.
- **Celular sem rolagem lateral:** conferido nas 24 telas em 390 px (`capturas/relato.json`, `rolagemLateral: false`). Tabelas largas que precisam continuar tabela (DRE, orçamento mês a mês) rolam dentro da própria caixa (`.fv-rolar`), com a primeira coluna fixa.
- **Tabela no celular vira cartão compacto:**
  - título (cliente, fornecedor) em cima;
  - valor grande logo abaixo;
  - os demais campos em duas colunas com rótulo pequeno;
  - caixa de seleção no canto;
  - ações lado a lado embaixo.

## 11. Tom dos textos

- Frases curtas, voz ativa, sem "Oops", sem exclamação e sem emoji.
- Diz **quem faz** ("o dono ou o Charles aprovam", "o dono grava em Chaves e senhas") e **quando** ("sai no lote das 09:00 do dia do vencimento").
- Botões com verbo e objeto: "Enviar para aprovação", "Confirmar com juros", "Já transferi no banco (só registrar)".
- Nunca "erro desconhecido". Sempre o motivo do banco ou do Omie, já limpo de dados sensíveis.
