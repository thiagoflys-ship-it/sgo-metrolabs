# PADRÃO VISUAL SGO+ — Tema "Consultório Dark" e Escala Compacta

**Arquivo-fonte único de estilo:** `UI_Estilos.html`
**Regra de ouro:** a **última camada** do `<style>` vence a cascata. Todo o tema novo está nas duas seções finais do arquivo. **Não crie camadas novas depois delas** — edite as existentes.

---

## 1. O que foi feito (resumo)

1. **Removidas 3 camadas conflitantes** que estavam no fim do `UI_Estilos.html`: "layout claro estilo Consultório Live" (forçava tema branco), "barra superior com gradiente" e "estado ativo do menu (verde)". Elas se anulavam e produziam o visual inconsistente.
2. **Criada uma camada única e final:** `TEMA "CONSULTÓRIO DARK NAVY"` — define todas as variáveis CSS e o estilo de shell (topbar, sidebar, cards, botões, tabelas).
3. **Criada a camada de densidade:** `DENSIDADE COMPACTA` — escala tipográfica e de espaçamento de painel profissional, incluindo um seletor genérico que aplica o mesmo padrão **dentro de todos os módulos técnicos**.
4. **Dashboard reconstruído** (`JS_Core.html` → `montarDashboardHtml_`) com widgets: stat cards, clientes recentes, círculo de vencimentos, gráfico rosca, gráfico de barras e duas tabelas.
5. **Backend novo:** `obterDashboardDetalhado(sessionId)` em `SGO_Main.js` — com `exigirSessao` e trava do Portal do Cliente.

---

## 2. Design tokens (variáveis CSS)

Use **sempre** as variáveis, nunca cores literais novas.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0d1119` | Fundo da página |
| `--card` | `#161c26` | Superfície de cards/painéis |
| `--card-soft` / `--surface-3` | `#1c2330` | Cabeçalho de tabela, superfície elevada |
| `--surface-2` | `#131923` | Card-body, modal-header |
| `--input` | `#10151f` | Fundo de campos |
| `--text` | `#cbd5e1` | Texto padrão |
| `--text-strong` | `#f1f5f9` | Títulos e valores |
| `--muted` | `#8b97a8` | Legendas, labels secundários |
| `--muted-2` | `#64748b` | Placeholder, estado vazio |
| `--border` | `#232b39` | Bordas |
| `--border-strong` | `#2f394b` | Borda em hover/foco |
| `--accent` | `#3b82f6` | Ação primária (botões, foco) |
| `--accent-2` | `#60a5fa` | Links, destaques |
| `--success` `--info` `--warning` `--danger` | `#4ade80` `#60a5fa` `#fbbf24` `#f87171` | Feedback |
| `--salmao` | `#f2b5a0` | Círculo de destaque do dashboard |

**Paleta de gráficos (Chart.js):** `["#e64980","#4dabf7","#ffd43b","#69db7c","#b197fc","#868e96"]` — barras usam `#339af0`.

---

## 3. Escala compacta (métricas obrigatórias)

| Elemento | Valor |
|---|---|
| Fonte base (`body`) | **13px** |
| Sidebar | largura **208px**, itens 12.5px / padding 7px 10px |
| Topbar | altura **56px**, padding vertical 8px |
| Padding do conteúdo | **18px 22px** |
| Títulos | h1 20px · h2 17px · h3 14px |
| Inputs / selects / textarea | **32px** de altura, 12.5px, padding 6px 10px |
| Botões | 12.5px, padding 7px 14px |
| Tabelas | 12.5px · `th` 11px · células 7px 9px |
| Cards/painéis | padding **15px 17px** |
| Cards do dashboard | padding 12-15px · valores 20px · gap 12px |
| Área de gráfico | altura **200px** |

**Dentro dos módulos técnicos** (um degrau menor que o shell):

| Elemento | Valor |
|---|---|
| Fonte base do container | **12.5px** |
| Títulos | h1 17px · h2 15px · h3 13.5px · h4 12.5px |
| Inputs | **30px** de altura, padding 5px 9px |
| Tabelas | 12px, células 6px 8px |
| `.wrap` / `.header-card` | padding 14px 16px |

---

## 4. Como o padrão chega nos módulos (mecanismo)

Todos os módulos técnicos renderizam dentro de uma `<div>` cujo id segue o formato `tpl<Nome>Container`. Por isso a camada de densidade usa **um seletor genérico** que já cobre os 11 módulos existentes:

```css
[id^="tpl"][id$="Container"] { font-size: 12.5px !important; }
[id^="tpl"][id$="Container"] h1 { font-size: 17px !important; }
[id^="tpl"][id$="Container"] input,
[id^="tpl"][id$="Container"] select,
[id^="tpl"][id$="Container"] textarea {
  font-size: 12.5px !important;
  min-height: 30px !important;
  padding: 5px 9px !important;
}
/* ...ver bloco completo no fim de UI_Estilos.html */
```

O `!important` é necessário porque cada módulo injeta o próprio `<style>` **depois** do `UI_Estilos.html`.

### Consequência prática para módulos novos

**Nada a fazer** — basta que o container do módulo siga a convenção de id `tpl<Nome>Container` e ele herda o padrão automaticamente.

---

## 5. Regras para quem for aplicar em outros módulos

1. **Não edite cores dentro dos arquivos `JS_*.html` dos módulos.** Cor e densidade vivem só no `UI_Estilos.html`. Se um módulo tem cor hardcoded (`#fff`, `#000`, `background:#eee`), troque pela variável correspondente.
2. **Nunca adicione uma camada `:root` nova no fim do arquivo** — isso foi exatamente a causa do bug de tema anterior. Ajuste os valores na camada `TEMA "CONSULTÓRIO DARK NAVY"`.
3. **Ajuste pontual de módulo:** se um módulo específico precisar de exceção, crie uma regra com o id próprio dele (ex.: `#tplAutoRelContainer .minha-classe { ... }`) **dentro da camada de densidade**, nunca depois dela.
4. **Respeite a escala da tabela do item 3** — não introduza fontes 14px+ ou paddings 20px+ em telas de operação.
5. **Contraste:** texto sobre `--card` deve usar `--text` ou `--text-strong`; nunca cinza abaixo de `--muted-2`.
6. **Gráficos novos:** usar a paleta do item 2, `borderColor: "#161c26"`, `borderWidth: 3`, eixos com `ticks.color = #8b97a8` e grade `rgba(255,255,255,0.05)`.

---

## 6. Estrutura da topbar (referência)

```html
<div class="topbar-logo-block" onclick="irTelaInicial_()">
  <img id="logoTopo" class="topbar-logo">           <!-- oculta via CSS -->
  <div class="topbar-brand">
    <div class="topbar-title">SGO<span class="topbar-title-plus">+</span></div>
    <div class="topbar-subtitle">Metrolabs · Painel Operacional</div>
  </div>
</div>
```

Características: fundo `#10161f` (integrado ao tema, não azul chapado), filete azul degradê via `.topbar::after`, relógio e status em chip `.topbar-info-block` com sombra externa + brilho interno, botão Sair em outline azul.

---

## 7. Checklist de validação após aplicar em um módulo

- [ ] Fonte base do módulo em 12.5px; nenhum texto acima de 17px
- [ ] Campos com 30px de altura, alinhados verticalmente com os botões
- [ ] Nenhuma cor literal clara remanescente (fundo branco, texto preto)
- [ ] Tabelas com cabeçalho `--card-soft` e linhas com hover azulado
- [ ] Botão primário em `--accent`, secundário em superfície neutra
- [ ] Conteúdo cabe na largura sem scroll horizontal em 1366px
- [ ] Após alterar, rodar `clasp push` e validar na URL `/dev` antes de publicar

---

## 8. Fluxo de publicação (obrigatório)

```bash
cd c:\Users\venda\projetos\google-script-dev\apps-script-imports\portal_sgo_versao_cnpj_db
clasp push                     # atualiza só o HEAD (URL /dev)
# validar visualmente em /dev
clasp deploy -i AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA -d "descrição"
```

⚠️ **Sempre com `-i <ID>`** — `clasp deploy` sem o `-i` cria uma URL nova e os colaboradores perdem o acesso.
