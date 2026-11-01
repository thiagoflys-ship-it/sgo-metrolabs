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
- Opções (terceiro argumento): `{ chave: "x" }` não empilha de novo se o topo já é um sub-nível com a mesma chave (passos de um assistente); `{ substituir: true }` troca o sub-nível do topo (ex.: "Novo cliente" salvo vira o passo "Equipamento"); `{ reabrir: fn }` redesenha o sub-nível quando a pessoa volta para ele a partir de outra tela; `{ reinicia: true }` indica que `aoVoltar` leva ao começo do módulo. `{ mantemTexto: true }` (revisão de 01/11/2026) diz que `aoVoltar` só desfaz o que está acima do formulário e o texto digitado fica: o voltar não pergunta "Descartar o que foi digitado?" (ex.: o resultado do Orçamentista, com o pedido ainda na tela).
- Botões "Voltar" do próprio módulo: troque `onclick="desenharLista_()"` por `onclick="SGO_voltarOu_(desenharLista_)"`. Com sub-nível gravado, volta pelo histórico (o mesmo `aoVoltar`); sem, chama a função.
- O módulo voltou ao começo sozinho (ex.: "Voltar ao painel"): chame `SGO_NAV.limparSubniveis()` no começo da função que desenha o começo.
- `SGO_NAV.voltar()` faz o mesmo que o Voltar da barra do topo.

## Etapa 2 (01/11/2026): peças novas

- **Rolagem.** Cada passo guarda a altura da página (`document.scrollingElement.scrollTop`) no momento em que a pessoa sai dele: em `antesDeAbrir` (troca de tela), no `push` de qualquer passo novo (janela, sub-nível) e, no passo automático, a altura medida no toque (`empilhar(..., { rol })`). Ao voltar para o passo, `restaurarRolagem(y)` repete por até 3 s (a lista pode chegar do servidor depois) e para se a pessoa rolar (roda do mouse, toque, tecla) ou trocar de tela. A rolagem de dentro de janelas e painéis não é guardada.
- **`SGO_NAV.janelaVolta(el, fn)`.** Ficha aberta por cima de outra no mesmo lugar (a gaveta é trocada, então o passo da janela é substituído): quando o voltar fecha `el`, chama `fn` para reabrir a anterior (com os dados de agora). Vale para o elemento já registrado ou para o próximo que aparecer. Fechada pelo próprio botão, a ficha não reabre nada. Usado em: O.S. aberta do chamado (`AT.voltaChamado`), proposta aberta da oportunidade (`CM.voltaOpo`, `Comercial_abrirPropostaDaOportunidade_`; antes trocava para a tela Propostas), "Editar" a oportunidade, outra revisão da proposta, oportunidade aberta do detalhe do Gantt, "Editar" o fornecedor.
- **`SGO_NAV.descartar(id)`.** O sub-nível (id devolvido por `empilhar`) deixou de valer: sai da pilha com um voltar silencioso, sem chamar `aoVoltar`. Usado quando o módulo voltou sozinho à tela de antes ("Cancelar" e "Salvar" do formulário, que já reabrem a ficha) e ao fechar um painel (os passos de dentro dele).
- **`SGO_NAV.restaurando()`.** `true` enquanto o voltar redesenha uma tela. `CadTela_montar_` usa para manter a busca, os números do topo, os filtros e a ordem ao voltar de outra tela.
- **`data-sgo-janela="1"`.** Painel lateral que conta como janela mesmo estreito no computador (menos de 40% da tela). Usado no painel dos cadastros (`#cadxPainel`, dentro de `#conteudo`).
- **Texto digitado dentro de janela.** `conteudoSujo` olha `#conteudo` e as janelas abertas fora dele. Com OK no "Descartar o que foi digitado?", o `aoVoltar` do sub-nível roda com o `confirm` do módulo respondido sozinho (`semPerguntar`), como já acontecia ao fechar janela.
- **Bate-papo e "Tire sua dúvida".** A casca reconhece `#aswPainel` (AssistenteWidget) e `.comw-painel` (ComunicacaoWidget) visíveis como janelas, sem limite de tamanho, sem a classe `sgo-nav-janela` (não mexe na posição deles) e sem a pergunta de texto digitado (o rascunho fica no componente). Voltar fecha pelo "×" de cada um (`aria-label` "Fechar..."). Trocar de tela não fecha esses painéis (`janelaPersistente`): o passo antigo morre e o painel entra de novo por cima da tela nova. Os dois componentes não mudam.
- **Documento A4 pelo link direto.** `SGO_DocA4_inicioDocumento_` põe na barra da tela `<a id="sgoDocVoltar" hidden>Voltar ao SGO+</a>` e um script que só mostra o botão quando `window.top === window`, sem `window.opener`, em http(s) e no caminho `/arquivos/` (o endereço do próprio SGO+). Aberto pelo sistema (aba nova no computador, visualizador no celular), fica escondido. A barra inteira some na impressão.

### Ganchos por módulo (Etapa 2)

| Módulo | Arquivo | Gancho |
|---|---|---|
| Cadastros (Clientes, Unidades, Equipamentos, Arquivo de documentos, Usuários) | `JS_Cadastros.html` | `#cadxPainel` com `data-sgo-janela`; `CadUI_painelPasso_` em `CadUI_painelAbrir_`: aba e formulário dentro do painel são passos (`CADUI.passosPainel`); voltar à mesma ficha pelo botão do módulo descarta o passo; "Novo ..." salvo não volta ao formulário vazio; `CadUI_painelFechar_` descarta os passos; `CadTela_montar_` mantém busca e filtros no voltar |
| Comercial | `JS_Comercial.html` | `janelaVolta` (proposta da oportunidade, editar, revisão, Gantt); proposta do Hoje abre por cima do Hoje |
| Assistência técnica | `JS_Assistencia.html` | abas de chamados e de O.S. com `empilhar`; O.S. do chamado com `janelaVolta` |
| Compras | `JS_Compras.html` | situação da fila e abas de "Informar compra" com `empilhar`; editar fornecedor com `janelaVolta` |
| Frota | `JS_Core.html` (Frota simples), `JS_Frota.html` (Frota completa) | `fsEntrarForm_` (chave `fs-form`) nos formulários; `fsDesenharInicio_` limpa os sub-níveis no celular; "tela completa" é passo no celular; `tplFrota_ligarVoltarAbas_` embrulha `tplFrota_mostrarAba_` (só toque da pessoa grava passo; `SGO_Frota_ConteudoModulo.js` não muda) |
| Padrões de referência | `JS_Padroes_Documentos.html` | `pdrPassoPainel_` em `pdrAbrirPainel_` e `pdrAbrirGrupo_`; `pdrFecharPainel_` descarta |
| Vínculos | `JS_Vinculos.html` | `vincPasso_` ao escolher a origem, trocar o tipo e abrir o histórico |

Robô de medição da Etapa 2 (ensaio local): `subniveis.mjs` desce lista, ficha, formulário e aba de cada módulo e compara a tela depois de cada voltar com a impressão guardada antes (módulo, títulos, janelas abertas, filtros e busca, aba ativa; rolagem à parte). Resultado no relatório da etapa.

Já usam o gancho: Relatório do ciclo da lavadora (busca, busca dentro da busca, gerar relatório, "Voltar ao painel"), Caixa de decisões ("Regras e responsáveis" e "Voltar à caixa"), Certificado de calibração do celular (passos Equipamento, Dados, Ensaios, Gerar, "+ Novo cliente" e "+ Novo equipamento", que voltam ao certificado) e "Abrir a tela completa" das telas pesadas no celular (Autoclaves, Lavadoras, Cadeia de frio, Estufa, Planejamento CME: voltar volta ao resumo). Na Etapa 2 entraram Comercial, Assistência, Compras, Frota, cadastros, Padrões e Vínculos (tabela acima). Nas telas ainda sem gancho, o passo automático leva ao começo do módulo, agora na mesma altura de página.

## Desligar

`window.SGO_NAV_LIGADO = false` antes de carregar a página, ou `localStorage.setItem("SGO_NAV_DESLIGADO", "1")` no aparelho e recarregar. Com a navegação desligada, `SGO_NAV` existe com funções vazias, `window.open` não é trocado e o Voltar da barra do topo volta ao comportamento antigo (`voltarMobile_`).

## Cuidados

- `history.replaceState(null, ...)` apaga o passo atual: use `history.replaceState(history.state, ...)` (teste em `navegacao-voltar.test.cjs`).
- Auto-refresh nunca grava passo: só `abrir()` de outra tela, `empilhar` e janelas gravam.
- `AssistenteWidget.html` e `ComunicacaoWidget.html` não mudam; desde a Etapa 2 os painéis deles entram na pilha pela casca (ver acima).
- `empilhar` não faz nada durante o voltar: o `aoVoltar` pode redesenhar com as funções normais do módulo (que chamam `empilhar`) sem gravar passo.

## Etapa 3 (01/11/2026): campo e celular

- **`data-sgo-sujo-texto`.** O painel marcado com `data-sgo-sujo` pode trazer a pergunta própria (o que se perde). `confirmar` da casca troca a pergunta padrão por esse texto quando o painel visível está alterado. Usado em "Abasteci" e "Outra despesa" da Frota simples (`FSG_TEXTO_DESCARTAR`, `fsGastoSujo_`).
- **Botões redondos ao rolar.** `SGO_flutAoRolar_(estado, topo, max)` (JS_Core, pura) decide se o bate-papo e o "Tire sua dúvida" saem para o lado: rolando para baixo mais de 12 px, somem; rolando para cima, no topo (até 40 px) e no fim (8 px), voltam. Ouvinte de `scroll` em captura (página, janelas, gaveta) só no modo celular; classe `html.sgo-flut-recolhido` (UI_Estilos, `translate`, sem mexer nos componentes); `abrir()` tira a classe.

| Módulo | Arquivo | Gancho |
|---|---|---|
| Atividades | `JS_Atividades.html` | `Atividades_passoAba_` (abas de Minhas e da equipe); `ATV.fichaVolta` reabre a ficha ao voltar da O.S. (`Atividades_aoAbrirModulo_` com `SGO_NAV.restaurando()`); `Atividades_vigiarSujo_` em toda janela de `Atividades_modal_` (valor guardado no primeiro foco); ficha redesenhada mantém a rolagem |
| Frota simples | `JS_Core.html` | `fsSecoes_`/`fsAplicarRecolher_`/`fsIrFalta_`/`fsSecaoDaPendencia_`/`fsResumoPasso_` (seções recolhíveis, estado em `FS.fluxo.recolhidas`); gasto com `data-sgo-sujo` |
| Assistência | `JS_Assistencia.html` | `At_indiceSecoes_` (4 seções ou mais, `At_secaoAtual_` pura) em `At_gaveta_`; rolagem mantida ao redesenhar a mesma ficha (`g.__rolMantido`); `AT.voltaChamado = null` ao fechar pelo botão ou por fora |
| Ponto | `JS_Ponto.html` | `Ponto_aba_` com `empilhar` |
| Relatório do ciclo | `JS_LavCiclo.html` | abas Kanban/Referências com `empilhar` |
