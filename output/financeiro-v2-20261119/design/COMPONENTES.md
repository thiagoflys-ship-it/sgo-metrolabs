# Financeiro v2 — Componentes para o desenvolvedor

**Data:** 19/11/2026
**Padrão:** HTML e JS puro, como o legado. As funções devolvem HTML em texto (igual `Comercial_cabecalho_`, `Com_opcoes_`). Quando há clique, uma segunda função "liga" o elemento já desenhado. Sem framework e sem biblioteca nova.

**Código completo, já testado no protótipo:**

| Arquivo | Conteúdo | Destino no legado |
|---|---|---|
| `prototipo/css/financeiro-v2.css` | todas as classes `fv-*` e os tokens `--fv-*` | bloco `<style>` de `JS_Financeiro_V2_Componentes.html` |
| `prototipo/js/fv-base.js` | `Fin_*`: formatação, empresa, cartão, selos, linha do tempo, estados, trava, janela, tabela, CSV, marca d'água | `<script>` do mesmo arquivo |
| `prototipo/js/fv-graficos.js` | `Graf_*`: previsão, barras pareadas, empilhada, horizontais, orçamento, mini linha | idem |
| `prototipo/js/fv-painel.js`, `fv-paginas.js` | as 17 páginas com dados fictícios | modelo para cada `JS_Financeiro_V2_<Pagina>.html` |
| `prototipo/css/sgo-*.css` | **cópia** de `UI_Estilos`, `JS_Comercial` e `JS_Atividades` (por `prototipo/extrair-css.cjs`) | **não copiar**: no legado já estão incluídos |

**Dependências:**
- Tokens `--bc-*` e `--card`, `--border`, `--muted`, `--success`, `--warning`, `--danger`, `--info` (+ `-bg`), de `UI_Estilos.html`.
- Classes `cm-*` do Comercial (`cm-tabela`, `cm-faixa`, `cm-selo`, `cm-tabs`, `cm-acoes`, `cm-campo`, `cm-det`, `cm-nav-mob`).
- `atv-overlay`/`atv-modal` de `JS_Atividades.html`.
- Font Awesome 6.5.2.

> **Aviso para o desenvolvedor:** `cm-*` está no `<style>` de `JS_Comercial.html`, que é incluído sempre no `Index.html`. Se um dia o Comercial deixar de ser incluído para quem só tem o Financeiro, mova as `cm-*` usadas aqui para `UI_Estilos.html`.

Regras de uso:
- Todo texto que vem do servidor passa por `Fin_esc_`.
- Todo valor em dinheiro passa por `Fin_moeda_` (`R$ 1.234,56`). `Fin_moedaCurta_` só em eixo, legenda e trio.
- Soma em centavos no servidor (especificação, seção 9). A tela só formata.

---

## 1. Cartão de indicador — `Fin_kpi_`

Botão que abre a lista de origem. Situação na faixa de cima **e** em ícone com `aria-label`.

```js
Fin_kpi_({ rotulo: "Vencido a receber", valor: Fin_moeda_(185292.02),
  detalhe: "17 títulos · <b>41,0 %</b> do aberto", sit: "critico", ir: "cobranca" });
// trio hoje / 7 dias / mês:
Fin_kpi_({ rotulo: "A pagar", trio: [["Hoje", "R$ 3 mil"], ["7 dias", "R$ 49 mil"], ["Mês", "R$ 70 mil"]], sit: "neutro", ir: "pagar" });
```

```html
<button type="button" class="fv-kpi critico" data-fv-ir="cobranca">
  <span class="r"><span>Vencido a receber</span><i class="fas fa-circle-exclamation ic-sit critico" aria-label="crítico"></i></span>
  <span class="v">R$ 185.292,02</span>
  <span class="d">17 títulos · <b>41,0 %</b> do aberto</span>
</button>
```

```css
.fv-kpi { display:block; width:100%; text-align:left; font:inherit; background:var(--card); border:1px solid var(--border);
  border-top:3px solid var(--info); border-radius:8px; padding:12px 14px; cursor:pointer; }
.fv-kpi.ok { border-top-color:var(--success); } .fv-kpi.aviso { border-top-color:var(--warning); }
.fv-kpi.critico { border-top-color:var(--danger); } .fv-kpi.neutro { border-top-color:var(--bc-line-2); }
.fv-kpi .r { display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:var(--muted); }
.fv-kpi .v { display:block; font-size:22px; font-weight:800; font-variant-numeric:tabular-nums; margin-top:4px; }
.fv-kpi .d { display:block; font-size:12px; color:var(--muted); margin-top:3px; }
.fv-trio { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin-top:8px; }
.fv-trio div { border-left:2px solid var(--border); padding-left:8px; }
.fv-trio span { display:block; font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase; }
.fv-trio b { display:block; font-size:14px; font-weight:700; white-space:nowrap; font-variant-numeric:tabular-nums; }
@media (max-width:900px) { .fv-trio { grid-template-columns:1fr; } .fv-trio div { display:flex; justify-content:space-between; border-left:0; padding-left:0; } }
```

Grade: `<div class="fv-grade fv-g4">…4 cartões…</div>` (2 colunas no celular).

## 2. Tabela com filtro por coluna, agrupamento, totais e CSV — `Fin_tabela_`

Monta sobre `cm-tabela` do Comercial, que já vira cartão no celular.

**O que faz:**
- busca geral;
- filtro por coluna (linha de campos sob o cabeçalho);
- ordenar ao tocar no título;
- **Agrupar por** com subtotal no grupo;
- **rodapé com totais** das colunas `soma`;
- seleção com **barra de lote** escura fixa embaixo;
- "Mostrar mais 25";
- **CSV** com `;` e vírgula decimal, com BOM (abre direto no Excel em português).

**Redesenho:** só o `<tbody>` e o `<tfoot>` são redesenhados. Filtros, ordem, grupo, seleção e página ficam em `cfg._st`. Uma atualização automática chama `Fin_tabela_(alvo, cfg)` com `cfg.linhas` novo e **não perde o que a pessoa digitou** (regra "auto-refresh nunca redesenha formulário").

```js
Fin_tabela_(document.getElementById("fvTabPag"), {
  id: "fvPag", csv: "contas-a-pagar", selecao: true, porPagina: 25,
  grupos: [{ k: "fornecedor", t: "Fornecedor" }, { k: "categoria", t: "Categoria" }, { k: "emp", t: "Empresa" }],
  linhas: lista,                                   // [{ id, emp, fornecedor, categoria, venc: Date, valor, ... }]
  colunas: [
    { k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } },
    { k: "fornecedor", t: "Fornecedor", mob: "titulo", fmt: function (v, l) { return "<b>" + Fin_esc_(v) + "</b>"; } },
    { k: "venc", t: "Vencimento" },                // Date → 19/11
    { k: "valor", t: "Valor", n: true, soma: true, mob: "valor" },
    { k: "dados", t: "Dados de pagamento", fmt: function (v) { return Fin_seloSit_(v); } },
    { k: "anexo", t: "Anexo", filtro: false, mob: "oculto" }
  ],
  acoes: function (l) { return '<button type="button" class="btn-secondary">Ver</button>'; },
  lote: function (sel) { return '<div class="fv-sel-lote"><span>' + sel.length + ' selecionadas · <b>' + Fin_moeda_(Fin_soma_(sel, "valor")) + '</b></span><button type="button" class="btn-primary">Enviar para aprovação</button></div>'; }
});
```

**`mob` (cartão no celular):**
- `"titulo"`: linha de cima, 14 px, sem rótulo;
- `"valor"`: logo abaixo, 18 px / 800;
- `"oculto"`: some no celular;
- sem `mob`: duas colunas com rótulo pequeno.

A caixa de seleção vai para o canto e as ações ficam lado a lado embaixo.

```css
.fv-tab-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:8px; background:var(--card); }
.fv-tab-wrap .cm-tabela thead th { position:sticky; top:0; background:var(--bc-surface-2); font-size:11.5px; text-transform:uppercase; }
.fv-tab-wrap .cm-tabela tr.fv-filtro input { width:100%; min-height:30px; font-size:12px; }
.fv-tab-wrap .cm-tabela tr.fv-grupo td { background:var(--bc-surface-3); font-weight:700; }
.fv-tab-wrap .cm-tabela tfoot td { border-top:2px solid var(--bc-text); font-weight:700; }
.fv-sel-lote { position:sticky; bottom:0; display:flex; justify-content:space-between; gap:8px; padding:10px 14px;
  background:var(--bc-text); color:#fff; border-radius:8px; }
@media (max-width:900px) {
  .fv-tab-wrap .cm-tabela tbody tr { display:grid !important; grid-template-columns:1fr 1fr; gap:4px 12px; position:relative; padding:10px 12px; }
  .fv-tab-wrap .cm-tabela td.m-titulo { grid-column:1/-1; order:-3; font-size:14px; }
  .fv-tab-wrap .cm-tabela td.m-valor { grid-column:1/-1; order:-2; font-size:18px; font-weight:800; }
  .fv-tab-wrap .cm-tabela td.m-oculto { display:none !important; }
  .fv-tab-wrap .cm-tabela td.m-sel { position:absolute; top:10px; right:12px; }
  /* demais regras em financeiro-v2.css */
}
```

Tabela larga que precisa continuar tabela no celular (DRE, orçamento mês a mês): `<div class="fv-tab-wrap fv-rolar">`. Ela rola dentro da caixa, com a primeira coluna fixa, e a página não rola para o lado.

## 3. Seletor de empresa — `Fin_seletorEmpresa_` + `Fin_ligarSeletorEmpresa_`

Segmentado no computador, lista de largura total no celular. A escolha fica no aparelho (`localStorage` `fv_emp`, dentro de `try`).

```js
html += Fin_seletorEmpresa_();
Fin_ligarSeletorEmpresa_(div, function (emp) { /* recarregar a página com a empresa nova */ });
Fin_daEmpresa_(lista);   // filtra pela escolhida (TODAS = tudo)
Fin_emp_("FILIAL");      // chip: ponto laranja + "Filial"
```

```html
<div class="fv-empresas" role="group" aria-label="Empresa">
  <button type="button" data-fv-emp="TODAS" aria-pressed="true"><span class="fv-pt todas"></span>Todas</button>
  <button type="button" data-fv-emp="MATRIZ" aria-pressed="false"><span class="fv-pt matriz"></span>Matriz</button>
  <button type="button" data-fv-emp="FILIAL" aria-pressed="false"><span class="fv-pt filial"></span>Filial</button>
  <button type="button" data-fv-emp="PRESTADORA" aria-pressed="false"><span class="fv-pt prestadora"></span>Prestadora</button>
</div>
<div class="fv-empresas-sel"><select id="fvEmpSel">…</select></div>
```

```css
:root { --fv-matriz:#2a78d6; --fv-filial:#eb6834; --fv-prestadora:#1baf7a; }
.fv-empresas { display:inline-flex; border:1px solid var(--bc-line-2); border-radius:6px; background:var(--card); overflow:hidden; }
.fv-empresas button { border:0; border-right:1px solid var(--bc-line); background:transparent; min-height:40px; padding:0 14px;
  font:inherit; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:7px; }
.fv-empresas button[aria-pressed="true"] { background:var(--bc-text); color:#fff; }
.fv-pt { width:10px; height:10px; border-radius:50%; display:inline-block; }
.fv-pt.matriz { background:var(--fv-matriz); } .fv-pt.filial { background:var(--fv-filial); } .fv-pt.prestadora { background:var(--fv-prestadora); }
.fv-pt.todas { background:conic-gradient(var(--fv-matriz) 0 33%, var(--fv-filial) 0 66%, var(--fv-prestadora) 0); }
.fv-emp::before { content:""; width:8px; height:8px; border-radius:50%; } /* + cor por classe */
.app-shell.modo-mobile .fv-empresas { display:none; } .fv-empresas-sel { display:none; }
.app-shell.modo-mobile .fv-empresas-sel { display:block; width:100%; }
```

**Formulário que grava:**
- sempre com `<div class="fv-form-empresa matriz"><span class="fv-pt matriz"></span><span>Saindo de <b>Matriz</b></span></div>` (borda esquerda de 6 px na cor da empresa);
- com "Todas" escolhido, abre na Matriz e mostra a faixa "Para transferir, a origem precisa de uma empresa";
- **o servidor recusa** operação sem empresa ou com empresa diferente da prévia.

**Barra completa do módulo:** `Fin_barra_({ periodo: true, atualizado: "Bancos às 10:30 · Omie às 10:41" })` (empresa, período e "atualizado às"). Fica fixa no topo enquanto se rola.

## 4. Seletor de período — `Fin_seletorPeriodo_`

```js
Fin_seletorPeriodo_("mes");   // Hoje · Semana · Mês · 90 dias · Outro…
Fin_seletorPeriodo_("90", [["30", "30 dias"], ["60", "60 dias"], ["90", "90 dias"]]);   // previsão
```

```html
<div class="fv-periodo" role="group" aria-label="Período">
  <button type="button" data-fv-per="hoje" aria-pressed="false">Hoje</button>
  <button type="button" data-fv-per="mes" aria-pressed="true">Mês</button> …
</div>
```

```css
.fv-periodo { display:inline-flex; gap:4px; flex-wrap:wrap; }
.fv-periodo button { border:1px solid var(--bc-line-2); background:var(--card); border-radius:999px; min-height:36px; padding:0 12px; font-size:12.5px; font-weight:600; }
.fv-periodo button[aria-pressed="true"] { background:var(--info-bg); border-color:var(--bc-info-line); color:var(--info); }
```

"Outro…" abre dois `input type="date"` (De, Até) na mesma linha. O período escolhido vale para a página e fica no aparelho.

## 5. Linha do tempo de aprovação — `Fin_tempo_`

```js
var FV_ETAPAS_PAG = [["Lançado", "Wanessa"], ["Dados conferidos", "automático"], ["Aprovação", "dono ou Charles"], ["Lote 09:00", "banco"], ["Pago e baixado", "Omie"]];
Fin_tempo_(FV_ETAPAS_PAG, 2);                       // etapa 2 em andamento
Fin_tempo_(FV_ETAPAS_PAG, 3, 3, ["Wanessa", "conferido", "Charles 08:47", "recusado: saldo", "—"]);   // erro na etapa 3, notas por etapa
```

```html
<ol class="fv-tempo" aria-label="Andamento">
  <li class="feito">Lançado<small>Wanessa</small></li>
  <li class="feito">Dados conferidos<small>automático</small></li>
  <li class="agora">Aprovação<small>aguardando</small></li>
  <li>Lote 09:00<small>09:00 de 20/11</small></li>
  <li>Pago e baixado<small>Omie</small></li>
</ol>
```

```css
.fv-tempo { list-style:none; margin:8px 0 0; padding:0; display:flex; overflow-x:auto; }
.fv-tempo li { flex:1 1 0; min-width:92px; position:relative; padding:18px 6px 0 0; font-size:11.5px; color:var(--muted); }
.fv-tempo li::before { content:""; position:absolute; top:5px; left:0; right:0; height:2px; background:var(--border); }
.fv-tempo li::after { content:""; position:absolute; top:0; left:0; width:12px; height:12px; border-radius:50%; background:var(--card); border:2px solid var(--bc-line-2); box-sizing:border-box; }
.fv-tempo li.feito::before, .fv-tempo li.feito::after { background:var(--success); border-color:var(--success); }
.fv-tempo li.agora { color:var(--text-strong); font-weight:700; } .fv-tempo li.agora::after { border-color:var(--warning); background:var(--warning-bg); }
.fv-tempo li.erro { color:var(--danger); font-weight:700; } .fv-tempo li.erro::after { border-color:var(--danger); background:var(--danger-bg); }
.fv-tempo li small { display:block; font-weight:400; color:var(--muted); }
```

Vai dentro do **cartão de operação** (`fv-card-op`):
- borda esquerda laranja = aguardando, verde = concluído, vermelha = risco ou erro;
- cabeçalho em grade: caixa de seleção · título e meta · valor e vencimento;
- ações `cm-acoes` (no celular, Aprovar e Recusar lado a lado).

Ver `FinPag_aprovacoes_` em `fv-paginas.js`.

## 6. Conciliação lado a lado (extrato × títulos)

```html
<div class="fv-conc sug">                       <!-- certo | sug | conferir -->
  <div class="fv-conc-lado">
    <h4>Extrato · Sicredi Matriz</h4>
    <div class="fv-mov-v fv-pos">R$ 3.925,40</div>
    <div class="cm-txt"><b>LIQUIDAÇÃO BOLETO · POLICLÍNICA TRÊS RIOS</b></div>
    <div class="cm-meta">19/11 às 08:41 · CNPJ … · <span class="fv-emp matriz">Matriz</span></div>
  </div>
  <div class="fv-conc-meio" aria-label="75 pontos"><span class="pts">sugerido · 75</span></div>
  <div class="fv-conc-lado">
    <h4>Título no Omie</h4>
    <div class="fv-cand escolhido">
      <span><b>R1013 · NFS-e 2213 · Policlínica Três Rios</b><br><span class="cm-meta">vence 12/11</span></span>
      <span>R$ 3.850,00<br><span class="cm-meta">75 pontos<span class="fv-barra-pts"><i style="width:75%"></i></span></span></span>
      <span class="por"><b>✓ CNPJ igual</b> · <b>✓ valor = saldo + juros/multa</b> · <s>⚠ juros e multa de R$ 75,40</s></span>
    </div>
    <div class="cm-acoes"><button class="btn-primary">Confirmar com juros</button><button class="btn-secondary">Escolher o outro</button><button class="btn-secondary">Não é este</button></div>
  </div>
</div>
```

```css
.fv-conc { display:grid; grid-template-columns:minmax(0,1fr) 44px minmax(0,1.25fr); border:1px solid var(--border); border-radius:8px; background:var(--card); overflow:hidden; }
.fv-conc-lado { padding:12px 14px; min-width:0; }
.fv-conc-meio { display:flex; align-items:center; justify-content:center; background:var(--bc-surface-2); border-left:1px solid var(--border); border-right:1px solid var(--border); }
.fv-conc-meio .pts { writing-mode:vertical-rl; transform:rotate(180deg); font-size:12px; font-weight:600; }
.fv-conc.sug .fv-conc-meio { color:var(--info); background:var(--info-bg); }
.fv-conc.certo .fv-conc-meio { color:var(--success); background:var(--success-bg); }
.fv-conc.conferir .fv-conc-meio { color:var(--warning); background:var(--warning-bg); }
.fv-cand { border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; }
.fv-cand.escolhido { border-color:var(--info); box-shadow:inset 3px 0 0 var(--info); }
.fv-cand .por { grid-column:1/-1; font-size:11.5px; } .fv-cand .por b { color:var(--success); } .fv-cand .por s { color:var(--warning); text-decoration:none; }
@media (max-width:900px) { .fv-conc { grid-template-columns:1fr; } .fv-conc-meio .pts { writing-mode:horizontal-tb; transform:none; } }
```

**Regras de tela:**
- os critérios que bateram vêm com ✓ (verde) e os que divergem com ⚠ (laranja), sempre com texto;
- o nível do meio é texto + cor ("certeza · 100", "sugerido · 75", "conferir · 20");
- sem candidato: estado vazio com as quatro saídas (título novo, avulso, devolver, transferência);
- no modo sugerir, o nível "certeza" também espera o toque.

## 7. Janela de confirmação de pagamento — `Fin_modal_` + `FinJanela_confirmarPagamento_`

`Fin_modal_(titulo, corpoHtml, rodapeHtml, largura)` usa as classes `atv-overlay`/`atv-modal` do legado. No celular, o rodapé `empilha` põe o botão principal em cima, com largura total.

**Conteúdo obrigatório da janela de aprovar ou pagar:**
1. Frase justificada: quantas saídas, total, quando saem ("lote das 09:00 do dia do vencimento") e "nada é enviado ao banco agora".
2. Resumo **por conta pagadora**, com chip da empresa, total e limite do dia (`cm-tabela cm-conta`).
3. A linha do tempo na etapa "Aprovação".
4. Acima de R$ 50.000,00: campo "digite o total para confirmar" (o botão só liga quando o valor confere).
5. Rodapé: Cancelar · **Aprovar R$ X** (o valor no próprio botão).

```js
Fin_modal_("Confirmar aprovação", corpo,
  Fin_btn_("Cancelar", "", "btn-secondary", 'onclick="this.closest(\'.atv-overlay\').remove()"') +
  Fin_btn_("Aprovar " + Fin_moeda_(tot), "fa-check", "btn-primary"), 560);
```

**Servidor (já é o padrão do Financeiro):** prévia → token de uso único (10 min, sessão e empresa) → relê o estado → trava → código de integração fixo → trilha. Ver especificação, seção 6.

## 8. Selo de estado do banco — `Fin_conector_`

```js
Fin_conector_("ligado");   // Ligado
Fin_conector_("falta");    // Falta credencial   (o title pode trazer o NOME das chaves que faltam, nunca o valor)
Fin_conector_("manual");   // Sem API · arquivo OFX
Fin_conector_("erro");     // Erro na última leitura
Fin_conector_("homolog");  // Homologação
```

```html
<span class="fv-con falta" title="SICOOB_MATRIZ_CLIENT_ID, SICOOB_MATRIZ_CERT_PFX">Falta credencial</span>
```

```css
.fv-con { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; border:1px solid currentColor; white-space:nowrap; }
.fv-con::before { content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
.fv-con.ligado { color:var(--success); background:var(--success-bg); }
.fv-con.falta { color:var(--warning); background:var(--warning-bg); }
.fv-con.erro { color:var(--danger); background:var(--danger-bg); }
.fv-con.manual { color:var(--muted); background:var(--bc-surface-2); }
.fv-con.homolog { color:var(--info); background:var(--info-bg); }
```

Acompanha a **linha de conta** (`fv-conta`): número do banco num quadrado, apelido, chip da empresa, selo, saldo com a origem e a hora (`API do banco · 10:30`, `saldo do Omie · ontem 18:00`).

## 9. Estados e trava — `Fin_estado_`, `Fin_trava_`

```js
Fin_estado_("vazio" | "carregando" | "erro" | "credencial" | "permissao", titulo, textoHtml, botoesHtml);
Fin_trava_(oQueHtml, porQueHtml, oQueFazerHtml, ehErro);
```

```html
<div class="fv-trava" role="alert"><dl>
  <dt>O que houve</dt><dd>O botão Fechar outubro da Matriz está desligado.</dd>
  <dt>Por quê</dt><dd>Ainda há 3 itens pendentes e 1 bloqueado no checklist.</dd>
  <dt>O que fazer</dt><dd>Resolva os itens marcados com ! (cada um tem o atalho "resolver").</dd>
</dl></div>
```

```css
.fv-trava { border:1px solid var(--bc-warn-line); border-left:4px solid var(--warning); background:var(--bc-warn-bg); border-radius:8px; padding:10px 14px; font-size:13px; }
.fv-trava dl { display:grid; grid-template-columns:112px minmax(0,1fr); gap:3px 10px; margin:0; }
.fv-trava dt { font-weight:700; color:var(--bc-warn); } .fv-trava dd { margin:0; text-align:justify; }
.fv-estado { border:1px dashed var(--bc-line-2); border-radius:8px; padding:22px 20px; background:var(--card); display:grid; grid-template-columns:44px minmax(0,1fr); gap:4px 14px; }
.fv-estado .ic { grid-row:span 3; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--bc-surface-3); color:var(--muted); }
.fv-estado.erro { border-style:solid; border-color:var(--bc-danger-line); }      /* ícone vermelho */
.fv-estado.credencial { border-style:solid; border-color:var(--bc-warn-line); }  /* ícone laranja */
.fv-estado.permissao .ic { background:var(--info-bg); color:var(--info); }
```

Todos os modelos de texto estão em `GUIA_VISUAL.md`, seção 9, e desenhados em `capturas/1366-20-componentes-e-estados.png`.

## 10. Outros

| Peça | Função / classe | Onde ver |
|---|---|---|
| Cabeçalho da página | `Fin_cabecalho_(titulo, objetivo, botoes)`, igual `Comercial_cabecalho_` | toda página |
| Caixa com título e atalho | `Fin_caixa_(titulo, subHtml, corpoHtml, ["Bancos e saldos", "bancos"])` | Painel |
| Faixa de riscos | `.fv-riscos` / `.fv-risco.critico|aviso|ok` (2 visíveis no celular + "mais N avisos") | Painel |
| Lista de tarefas do dia | `.fv-tarefas` / `.fv-tarefa` (ícone com situação, título, detalhe, valor) | Painel › Meu dia |
| Semana | `.fv-semana` / `.fv-dia.hoje` | Painel › Meu dia |
| Checklist | `.fv-check li.ok|pend|bloq` + `.fv-prog` | Fechamento |
| Área de anexar | `.fv-anexar` | Impostos, Nova conta a pagar |
| Marca d'água | `Fin_marca_(texto)` num `div.fv-marca` fixo (igual `JS_Financeiro_Marca.html`; no legado, reaproveitar o de lá) | toda página |
| CSV | `Fin_csv_(nome, colunas, linhas)` | tabelas |
| Gráficos | `Graf_previsao_(alvo, serie, dias)`, `Graf_pareadas_(alvo, itens, nomes, cores)`, `Graf_pilha_(partes)`, `Graf_hbar_(itens)`, `Graf_orcamento_(itens)`, `Graf_sparkline_(valores)`. Todos com dica ao passar e "Ver em tabela" | Painel, Orçamento, Relatórios, Bancos |

**Nota sobre gráficos:**
- `Graf_previsao_` e `Graf_pareadas_` medem `alvo.clientWidth` ao desenhar. Por isso só funcionam com o alvo **já visível** no DOM.
- Numa aba escondida, desenhe ao abrir a aba (o legado já tem o mesmo cuidado com tabelas, em `SGO_agendarAjusteTabelas_`).
- Para redesenhar ao girar o celular, chame de novo no `resize` com um pequeno atraso.

## 11. Conferido no protótipo

- 24 telas × 2 larguras (1366 e 390 px): **0 erros de script, 0 rolagem lateral** (`capturas/relato.json`).
- Paleta das empresas validada para daltonismo (todos os pares).
- Os três estilos copiados da cand34 são idênticos aos de produção. Para atualizar depois de nova publicação: `node output/financeiro-v2-20261119/design/prototipo/extrair-css.cjs`.
