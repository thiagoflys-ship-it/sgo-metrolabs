# Navegação e voltar da casca do SGO+ (para quem mantém o código)

Programa de melhoria do SGO+, Etapa 1 (01/11/2026). Código: `apps-script-imports/portal_sgo_versao_cnpj_db/JS_Navegacao.html`, ligado em `JS_Core.html` (`abrir`, `voltarMobile_`, `exibirAppLogado_`, `SGO_irTelaDeEntrada_`, `logout`) e incluído no `Index.html` logo depois de `JS_Core`. Estilos no fim de `UI_Estilos.html`. Testes: `tests/navegacao-voltar.test.cjs`. Manual de quem usa: `docs/MANUAL_NAVEGACAO_VOLTAR.md`. Diagnóstico: `docs/PROGRAMA_MELHORIA_SGO_ETAPA0_DIAGNOSTICO.md`, seção 3.

## Como funciona

- **Tela = passo.** No fim de `abrir(mod)`, `SGO_NAV.aoAbrir(mod)` grava `history.pushState({ sgo: 1, pos, telaPos, tipo: "tela", mod, id, u }, "", "#/mod")`. A mesma tela redesenhada (auto-refresh, "Atualizar", salvar e redesenhar) não grava passo. Um único `popstate` reabre a tela anterior com `abrir()` em modo de restauração (não grava passo).
- **Entrada-base.** Ao entrar, a entrada atual vira `{ tipo: "base", pos: 0 }` e o Início entra em `pos: 1`. Voltar no Início chega na base: aparece o aviso "toque de novo para sair" e o Início volta ao topo. Um segundo voltar em até 3 s chama `history.back()` e sai.
- **Janelas.** Um `MutationObserver` reconhece qualquer elemento `position: fixed`, visível, que cubra pelo menos 40% da tela (as famílias `atv-overlay`, `em-overlay`, `vinc-overlay`, `busca-overlay`, `avisos-login-overlay`, `sga-sobre`, `[role=dialog][aria-modal=true]` e outras). Cada janela nova grava um passo `tipo: "janela"`. Voltar fecha a janela de cima clicando no botão de fechar dela (`[data-sgo-fechar]`, classe com `fechar`/`close`, `data-cm-fechar`, `data-at-fechar`, `aria-label` "Fechar", texto "×"/"Fechar"; por último "Voltar", ou "Cancelar" com `data-x`), para a regra do módulo rodar. Sem botão, tenta a tecla Esc; se a janela continuar aberta, avisa "Use os botões da própria janela". Janela fechada pelo próprio botão sai da pilha com um voltar silencioso.
- **Travas.** Não fecham pelo voltar: `.atv-overlay.bloqueante` (atividade com prazo vencido), `#sgaSobre` sem o botão `SegAcesso_fecharEtapas_` (troca de senha obrigatória) e qualquer elemento com `data-sgo-trava="1"`. O passo é regravado e aparece o aviso "Resolva primeiro a janela ...".
- **Texto digitado.** A casca marca os campos em que a pessoa digitou (evento `input` real; buscas e filtros não contam). Voltar com campo preenchido numa janela, ou saindo de uma tela com campo preenchido, pergunta "Descartar o que foi digitado?". Com OK, o `confirm` do módulo é respondido sozinho durante o clique no botão de fechar (não pergunta duas vezes).
- **Trocar de módulo** (`SGO_NAV.antesDeAbrir`) fecha as janelas abertas que não são trava; com texto, pergunta antes e, se a pessoa cancelar, `abrir()` não troca a tela.
- **Celular.** `html.sgo-movel` acompanha `#app.modo-mobile`. A barra do topo fica por cima das janelas (`z-index: 100650`) e as janelas (`.sgo-nav-janela`) começam abaixo dela (`top: var(--mobile-topbar-h)`). O aviso de carregamento fica por cima da barra (`100660`).
- **Recarregar.** `SGO_NAV.iniciarSessao()` (em `exibirAppLogado_`) lê `history.state`: se é do mesmo usuário e a tela ainda está no menu dele (`telaPermitida`), `SGO_irTelaDeEntrada_()` reabre essa tela na mesma entrada; se era janela ou sub-nível, volta sem tratar até o passo da tela. Um link `#/modulo` copiado abre a tela depois do Início. `?tela=` dos e-mails continua valendo e tem prioridade. Sair (`logout`) zera a pilha.
- **Passo automático.** Um toque dentro de `#conteudo` que troca os títulos da tela (`h1`, `h2`, `h3`, `.content-title`, aba selecionada e o título da barra do celular) sem gravar passo em até 6 s vira um sub-nível automático: voltar reabre o módulo do começo. Toques em botões de ação (Salvar, Concluir, Atualizar, Buscar, Excluir e semelhantes) não contam.

## Visualizador de documentos (só no celular)

Decisão do dono (01/11/2026): no computador, documentos continuam abrindo em aba nova. No celular (modo celular da casca: `#app.modo-mobile`, decidido por `SGO_modoMovelDesejado_`, ou seja, `(max-width: 900px)` ou `(pointer: coarse) and (max-height: 500px)`), a casca troca `window.open` por uma versão que, quando o endereço é vazio (`window.open("")`, `window.open("", "_blank")` ou `about:blank`), devolve uma janela falsa ligada a um `iframe` do visualizador. `document.open/write/close`, `location.href = url`, `close()`, `closed`, `focus()`, `print()` e `opener` funcionam como numa aba. Os geradores de documento não mudam.

- Endereço do próprio SGO+ (`/arquivos/...`) carrega no `iframe` com `location.replace` (não cria passo no histórico).
- Endereço de fora (Drive), `blob:` e PDF mostram o botão "Abrir o documento" (aba nova, toque da pessoa).
- Qualquer `window.open` com endereço (wa.me, mailto, Drive, `?baixar=1`) segue o caminho normal.
- Folha mais larga que o celular recebe `@media screen { html { zoom: ... } }` dentro do `iframe`; a impressão não tem zoom e continua A4. "Tamanho real" tira o ajuste.
- Imprimir chama `print()` do `iframe`.
- Para abrir um endereço no visualizador: `SGO_NAV.abrirDocumento({ url, titulo, baixarUrl })`; devolve `false` no computador (o chamador segue com `window.open`). Usado em `Lc_abrirUrl_` (Relatório do ciclo da lavadora).

## Gancho para sub-níveis: `SGO_NAV.empilhar`

Para módulos que trocam o conteúdo por dentro (lista → ficha → formulário), sem `abrir()`:

```js
// ao entrar no sub-nível (antes ou depois de desenhar)
if (window.SGO_NAV) SGO_NAV.empilhar("Ficha do pedido", function () { Compras_desenharLista_(); });
```

- `aoVoltar` desenha a tela anterior **sem** chamar `abrir()` e sem empilhar de novo (durante o voltar, `empilhar` não faz nada).
- Opções (terceiro argumento): `{ chave: "x" }` não empilha de novo se o topo já é um sub-nível com a mesma chave (passos de um assistente); `{ substituir: true }` troca o sub-nível do topo (ex.: "Novo cliente" salvo vira o passo "Equipamento"); `{ reabrir: fn }` redesenha o sub-nível quando a pessoa volta para ele a partir de outra tela; `{ reinicia: true }` indica que `aoVoltar` leva ao começo do módulo.
- Botões "Voltar" do próprio módulo: troque `onclick="desenharLista_()"` por `onclick="SGO_voltarOu_(desenharLista_)"`. Com sub-nível gravado, volta pelo histórico (o mesmo `aoVoltar`); sem, chama a função.
- O módulo voltou ao começo sozinho (ex.: "Voltar ao painel"): chame `SGO_NAV.limparSubniveis()` no começo da função que desenha o começo.
- `SGO_NAV.voltar()` faz o mesmo que o Voltar da barra do topo.

Já usam o gancho: Relatório do ciclo da lavadora (busca, busca dentro da busca, gerar relatório, "Voltar ao painel"), Caixa de decisões ("Regras e responsáveis" e "Voltar à caixa"), Certificado de calibração do celular (passos Equipamento, Dados, Ensaios, Gerar, "+ Novo cliente" e "+ Novo equipamento", que voltam ao certificado) e "Abrir a tela completa" das telas pesadas no celular (Autoclaves, Lavadoras, Cadeia de frio, Estufa, Planejamento CME: voltar volta ao resumo). Os outros módulos ficam para a Etapa 2 (lista na seção 5 do diagnóstico); até lá, o passo automático leva ao começo do módulo.

## Desligar

`window.SGO_NAV_LIGADO = false` antes de carregar a página, ou `localStorage.setItem("SGO_NAV_DESLIGADO", "1")` no aparelho e recarregar. Com a navegação desligada, `SGO_NAV` existe com funções vazias, `window.open` não é trocado e o Voltar da barra do topo volta ao comportamento antigo (`voltarMobile_`).

## Cuidados

- `history.replaceState(null, ...)` apaga o passo atual: use `history.replaceState(history.state, ...)` (teste em `navegacao-voltar.test.cjs`).
- Auto-refresh nunca grava passo: só `abrir()` de outra tela, `empilhar` e janelas gravam.
- `AssistenteWidget.html` e `ComunicacaoWidget.html` não mudam; os painéis deles não entram na pilha.
