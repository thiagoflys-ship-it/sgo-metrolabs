# Acessos por caixas — Lote 0 (implementação)

Implementação de 10/11/2026, só no candidato local `output/poderes-20261110/base/legado`. **Nada foi publicado**, não houve acesso ao servidor (sem ssh) e não houve `git commit`. Nenhuma trava existente mudou de comportamento: as 150 caixas existem, gravam exceções e histórico, mas nenhum módulo as consulta ainda (`ligado = false` em todas; `SGO_PODERES_LIGADOS = []`).

Estado real: **preparado e testado localmente** (testes de unidade/integração em vm com o código real do legado e conferência no navegador da página completa). **Não publicado, não verificado em produção.**

---

## 1. Arquivos

| Arquivo (em `base/legado`) | Situação | O que mudou |
|---|---|---|
| `SGO_Poderes.js` | novo | Catálogo dos 150 poderes, regras padrão (espelho de hoje), exceções, histórico, `SGO_pode_`, `SGO_podeExigir_`, `SGO_poderesEfetivos_`, modelos e a API `Poderes_api`. |
| `JS_Acessos.html` | novo | Tela Administração > Acessos (computador e celular). |
| `Index.html` | alterado | Item "Acessos" no grupo Administração (escondido por padrão) e `include('JS_Acessos')`. |
| `JS_Core.html` | alterado | `AcessosTela_iniciar_()` no login e na entrada automática; rota `abrir('acessos')`; atalho no Início do celular (só para quem pode); nome da tela; pergunta antes de sair com caixas não salvas. |
| `SGO_Ajuda.js` | alterado | Nome da tela `acessos` no catálogo de nomes da ajuda. |
| `SGO_Ajuda_Administracao.js` | alterado | Ajuda/manual completo da tela Acessos (para que serve, antes de começar, passos, cores, problemas, quem pode, perguntas, seções do manual). |

Fora do legado (apoio, não vão para o servidor):

| Arquivo | Para quê |
|---|---|
| `tests/poderes-lote0.test.cjs` | 13 testes do lote 0 (equivalência, exceções, proteções, cópia, modelos, API, tela). |
| `tests/_poderes_ambiente.cjs` | Ambiente de teste: carrega as funções-base reais do legado + `SGO_Poderes.js` num vm, com as 23 contas e a configuração real. |
| `output/poderes-20261110/ferramentas-catalogo/gerar-lista-lote0.cjs` | Gera o bloco `SGO_PODERES_LISTA` do `SGO_Poderes.js` a partir do `catalogo.json`. |
| `output/poderes-20261110/rodar-suite.cjs` | Roda toda a suíte numa fase e grava o placar por arquivo. |
| `output/poderes-20261110/lote0-navegador.cjs` | Conferência no Chromium da página completa (Index com todos os include) em 1280 px e 390 px. |
| `output/poderes-20261110/lote0-equivalencia.txt`, `lote0-modelos.txt`, `lote0-navegador.txt`, `lote0-telas/*.png` | Evidências geradas pelos testes. |
| `output/poderes-20261110/lote0-producao.txt`, `lote0-candidato.txt` | Placares da suíte completa nas duas fases. |

Final de linha preservado (todos os arquivos tocados eram LF e continuam LF). `node --check` sem erro em `SGO_Poderes.js`, `SGO_Ajuda.js` e `SGO_Ajuda_Administracao.js`; os `<script>` de `JS_Acessos.html` e `JS_Core.html` compilam. Nenhum nome global novo colide com os 440 arquivos do legado.

---

## 2. Abas novas

Criadas na primeira gravação pela própria tela (`Poderes_garantirEstrutura_`, mesmo padrão de `SegAcesso_garantirEstrutura_`: `CertCal_garantirTabela_` + chave de cache `PODERES_ESTRUTURA_OK_V1` por 6 h). Sem as abas, ninguém tem exceção e nada quebra.

**`SYS_PODERES_EXCECOES`** — uma linha por pessoa e caixa alterada:
`ID, USUARIO_ID, PODER, VALOR (SIM|NAO), MOTIVO, ALTERADO_POR_ID, ALTERADO_POR_NOME, ALTERADO_EM`.
"Voltar ao padrão" apaga a linha da exceção (o histórico guarda o antes).

**`SYS_PODERES_LOG`** — uma linha por caixa mudada, **nunca apagada** (nenhuma função remove linha desta aba; o teste confere no código-fonte):
`ID, QUANDO, USUARIO_ID, USUARIO_NOME, PODER, PODER_NOME, ACAO (EXCECAO|VOLTAR_AO_PADRAO|COPIAR|MODELO), ANTES_EXCECAO, DEPOIS_EXCECAO (SIM|NAO|PADRAO), ANTES_EFETIVO, DEPOIS_EFETIVO (SIM|NAO), MOTIVO, POR_ID, POR_NOME, LOTE` (as caixas salvas juntas têm o mesmo `LOTE`).

---

## 3. Funções do servidor (`SGO_Poderes.js`)

- **`SGO_pode_(sessaoOuEu, codigo, ctx)`** → `true|false`. Aceita o ID da sessão, a sessão validada (`{userId, usuario, perfil}`) ou a pessoa (`{id, login, perfil, area, vinculo}`); perfil da sessão, área e vínculo do cadastro. Ordem: conta de fora (CLIENTE, REPRESENTADA, AUVO_SYNC, sem perfil) = NÃO; dono (`SGO_DONOS`) = SIM; exceção da pessoa; padrão. Código desconhecido lança erro. `ctx` fica reservado ao alcance do registro dos próximos lotes.
- **`SGO_podeExigir_(sessaoOuEu, codigo, ctx, acao)`** → lança `Você não tem a permissão «<nome>» para <ação>: <o que a caixa libera>. Peça ao responsável pelo sistema para liberar esta caixa em Administração > Acessos, se for o caso.`
- **`SGO_poderesEfetivos_(usuarioId)`** → lista de 150 `{codigo, modulo, nome, descricao, categoria, lote, ligado, valor, origem ('dono'|'excecao'|'padrao'|'fixo'), padrao, excecao, erro}`. `fixo` = conta de fora da equipe (não pedido no enunciado; acrescentado para a tela não chamar de "padrão" o que é proteção fixa).
- **Regra padrão** `padrao(eu, c)`: cada um dos 150 poderes chama a **mesma função-base que a trava de hoje usa** (`isAdminPerfilAuth_`, `SGO_ehGestaoRotina_`, `SGO_podeConsultarPessoas_`, `SegAcesso_*`, `Conduta_veIdentidadeUsuario_`, `Com_nivelDe_`, `ComCt_podeVer_`, `ComCat_podeMudarPreco_`, `Cmp_nivelDe_`, `Cmp_regras_`, `Cmp_gestoresCompras_`, `CmpCart_pode*_`, `Ast_nivelDe_`, `Ast_triagemPara_`, `AstO_podeTransferir_`, `AstO_podeGerirFila_`, `AstRd_podeSugestao_`, `RepI_podeAdministrar_`, `Rep_responsaveis_`, `Rep_podeAbrirEmNome_`, `Ges_cfg_`, `Ges_*`, `Ponto_cfg_`, `Ponto_areasDoGestor_`, `FrotaRes_ehGestaoRotina_`, `Lic_nivelDe_`, `LicPar_podeMudarCfg_`, `CadQ_podeJuntar_`, `SGO_QE_ehAprovador_` com os perfis do próprio módulo, `AutPred_*`, `AUVO_ACERVO_CFG`, `BAIXATEMP_CFG`, `AutoRel_UCFG`). Nenhuma lista é fixada no código: compradores, triagem, `gestoresPorArea`, responsáveis da representação, lista "abre em nome", RH do ponto e permissões da porta são lidos da configuração em vigor. Únicos valores fixos: os mesmos que já estão fixos no legado (os 2 IDs de `AstO_podeTransferir_` e o ID/login do relatório interno dos `*_ConteudoModulo.js`).
- **Nunca libera por erro:** regra padrão que falhar ao calcular vale NÃO, e o erro vai para a tela ("A regra padrão desta caixa não pôde ser conferida agora…").
- **Memória por requisição:** cadastro, exceções e funções-base de cada pessoa ficam 3 s na memória (`PODERES_MEMO`); no servidor cada chamada já começa num contexto limpo. Gravar limpa a memória. Teste: 500 perguntas = no máximo 2 leituras de aba.
- **Proteções fixas** (`Poderes_exigirGestor_`, `Poderes_conferirAlvo_`, `Poderes_motivo_`): só o dono ou quem tem `ACESSOS_GERIR` (padrão: só o dono) grava; ninguém altera as próprias caixas; não grava nada para o dono (nem SIM, nem NÃO) e exceção posta à mão na planilha para o dono é ignorada; conta de fora e conta excluída recusadas; motivo de 5+ caracteres; trava de script (`LockService`, 20 s) em toda gravação, sem trava aninhada.

### API — `Poderes_api(sessionId, acao, dados)` → `{ ok: true, ... }` ou `{ ok: false, message }`

| Ação | Dados | Retorno |
|---|---|---|
| `pode` | — | `{ pode }` (qualquer sessão; a tela usa para mostrar o menu) |
| `pessoas` | — | `{ pessoas: [{id, nome, email, perfil, area, areaNome, vinculo, ativo, dono, excecoes}], eu, totalPoderes, ligados }` (sem clientes, representadas e contas excluídas) |
| `pessoa` | `usuarioId` | `{ pessoa, grupos: [{modulo, total, comPoder, alteradas, itens: [{codigo, nome, descricao, categoria, categoriaNome, lote, ligado, valor, padrao, origem, origemNome, excecao: {valor, motivo, por, em}, erro}]}], podeAlterar, porQueNaoAltera }` |
| `salvar` | `usuarioId, motivo, mudancas: [{codigo, valor: SIM|NAO|PADRAO}]` | `{ alteradas, iguais, message, tela }` |
| `voltarPadrao` | `usuarioId, codigo` (ou `codigos`), `motivo` | idem |
| `copiar` | `usuarioId, deUsuarioId, motivo` | idem; exceção só onde o efetivo da origem difere do padrão do destino; `ACESSOS_GERIR` nunca é copiada |
| `modelos` | `usuarioId` (opcional) | `{ modelos: [{chave, nome, descricao, poderes, erro}] }` |
| `aplicarModelo` | `usuarioId, modelo, modo (SUBSTITUIR|SOMAR), motivo` | idem; `ACESSOS_GERIR` nunca é mexida |
| `historico` | `usuarioId` (opcional), `limite` | `{ historico: [{quando, pessoa, poder, poderNome, acao, antes, depois, antesEfetivo, depoisEfetivo, motivo, por}] }` (mais recente primeiro) |
| `verComo` | `usuarioId` | `{ pessoa, resumo: [{modulo, pode: [{nome, ligado, origem}], naoPode}] }` |

Todas as ações exceto `pode` passam por `Poderes_exigirGestor_` no servidor (o menu escondido não é a trava). O nome não termina em `_`, então o `/api/run` do servidor já deixa o navegador chamar (`sistemas.ts`, `podeChamar`), sem mudar `src/`/`dist/`.

---

## 4. Modelos

Cada modelo é o **padrão de hoje de uma conta de referência**, sem as listas de configuração (compradores, triagem, responsáveis de área) e sem nada exclusivo do dono; nenhum modelo inclui `ACESSOS_GERIR`. Calculado na hora pelas mesmas regras padrão (lista completa de cada um em `lote0-modelos.txt`).

| Modelo | Referência | Caixas | Resumo |
|---|---|--:|---|
| Gerente | Gestor sem área | 74 | Rotina da empresa, Caixa de decisões, Frota, Conduta (sem o sigilo), aprovações de relatório, regras da Assistência e de Compras. |
| Gestor de área | Gestor com a área **da própria pessoa** | 77 + área | Base de 77 + Comercial: gestão comercial (11); Técnica: gestão da Assistência e triagem (6); Qualidade: sigilo do Conduta (3); RH: ponto de todos (2); Financeiro: conferência/faturas/catálogo (8); Logística: compras (4). Sem área no cadastro: recusado com o caminho (Usuários ou modelo Gerente). |
| Técnico | Técnico, área Técnica | 10 | Frota, Assistência, pedido de compra, cadastros, documentos e emissão oficial, QR, portões. |
| Metrologia | Metrologia, área Metrologia | 14 | Técnico + aprovar relatório técnico, referência do ciclo da lavadora, todos os chamados, pendências técnicas. |
| Comercial | Comercial, área Comercial | 17 | Vendedor: Comercial nas próprias vendas, valores, contatos, catálogo de venda, sugestões da ronda. |
| Financeiro | Financeiro, área Financeiro | 50 | Contas, conciliação, compras/faturas/cartões, pedidos aprovados, catálogo e rotina da empresa. |
| RH | RH, área RH | 42 | Rotina da empresa, Conduta (consulta), ponto de todos, sem documentos técnicos. |

Modos: **Substituir** (a pessoa fica exatamente com as caixas do modelo) e **Somar** (só libera). Nos dois, exceção só onde o desejado difere do padrão da pessoa.

---

## 5. Tela Administração > Acessos (`JS_Acessos.html`)

Busca de pessoa (nome, e-mail, perfil, área); cabeçalho com perfil, área, vínculo e nº de caixas alteradas; 18 grupos por módulo recolhíveis (abrem sozinhos os que têm alteração; "Abrir todos"/"Fechar todos"); cada caixa com nome, categoria, descrição (justificada), selo "Padrão do perfil" / "Alterado para esta pessoa" (com quem, quando, motivo e o que o padrão seria) / "Responsável pelo sistema"; "voltar ao padrão"; aviso discreto "Esta caixa passa a valer quando o módulo for ligado (lote N)"; faixa no topo dizendo que nenhum módulo obedece às caixas ainda; rodapé fixo com o contador de pendências, Desfazer e Salvar (janela com a lista do que muda, aviso das caixas sem efeito e motivo obrigatório); Copiar de…, Aplicar modelo, Histórico, Ver como esta pessoa vê. Trocar de pessoa ou de tela com pendências pergunta antes. Resposta atrasada de outra pessoa não pinta por cima. A própria conta e a do dono abrem só para consulta, com o porquê.

Menu: item "Acessos" no grupo Administração com `display:none`; `AcessosTela_iniciar_` pergunta ao servidor (`pode`) no login e só então mostra; no celular, atalho no Início só para quem pode. Visual: classes e variáveis do SGO+ (`module-shell`, `cadx-btn`, `CadUI_confirmar_`, `CadUI_ajuda_`, `CadUI_aviso_`, selos no padrão da Segurança do acesso). A caixinha da tela tem 22 px (a trava global do sistema fixa 16 px; aqui ela é a ação principal e precisava de alvo de toque maior no celular).

**Conferência no navegador** (`lote0-navegador.cjs`, Chromium, página completa montada como o servidor, sem rede): Gestor sem a caixa não vê o item e, abrindo à força, recebe a recusa do servidor com o caminho de volta; dono vê o item; 18 módulos e 150 caixas com o aviso de lote; marcar/desmarcar → pendências → motivo curto recusado → gravado com selo e "quem/quando/motivo"; histórico; ver como; voltar ao padrão; copiar de; aplicar modelo; a própria conta só consulta; celular 390 px sem rolagem lateral. Capturas em `lote0-telas/`.

---

## 6. Equivalência (com a configuração real)

Rodado com a configuração real que dá poderes: `GES_CONFIG.gestoresPorArea` (`gestoresPorArea.json`, extraído da produção — o `catalogo.json` tinha suposto vazio), `CMP_CONFIG.REGRAS`, `ATEC_CONFIG.REGRAS` e `COM_CONFIG.METODOLOGIA` (do `cadastro-e-config.txt`). O "hoje" esperado foi **recalculado pelas funções originais do legado** (as mesmas 36+ funções do teste de equivalência do catálogo, agora lendo a configuração real) e, onde não há função isolada, pela expressão do catálogo avaliada com as listas lidas pelas funções de leitura do legado.

- **3.450 comparações (150 × 23): 0 divergências** entre `SGO_pode_` sem exceções e o hoje real.
- **Dono (admin):** SIM em tudo; difere do hoje só nas 3 caixas documentadas no catálogo: `FROTA_BLOQUEIO_ROUBO`, `COM_CATALOGO_EDITAR_VENDA`, `REP_ABRIR_EM_NOME` (decisão "dono sempre tudo", seção 1 item 5 do catálogo; sem efeito no lote 0 porque nada está ligado).
- **Catálogo × legado:** 1 simplificação do catálogo encontrada e corrigida a favor do legado: `AST_GERIR_FILA_SETOR` no catálogo aceitava responsável de **qualquer** área; o legado (`AstO_podeGerirFila_`) só das 5 filas de O.S. (Técnica, Metrologia, Comercial, Logística, Administrativo). A Elisa é responsável só da área RH: hoje NÃO; `SGO_pode_` segue o legado.

**O que mudou em relação ao `catalogo.json` por causa da configuração real** (23 células, 18 poderes; ver `lote0-equivalencia.txt`):

| Causa | Poderes | Quem ganha |
|---|---|---|
| `gestoresPorArea.COMERCIAL` contém Matheus (`Com_gestoresConfigurados_`) | `COM_USAR`, `COM_TODAS_AS_VENDAS`, `COM_GESTAO_COMERCIAL`, `COM_DECIDIR_DESCONTO`, `COM_PEDIDOS_APROVADOS`, `COM_VER_VALORES`, `COM_VER_CUSTO`, `COM_CATALOGO_EDITAR`, `COM_BANCO_PRECOS_GERIR`, `COM_EXCLUIR` | matheusgodoi |
| `gestoresPorArea.TECNICA` contém Bruna e Matheus (`Ast_nivelDe_`) | `AST_GESTAO`, `AST_EXECUTAR_OS_DE_OUTROS` | matheusgodoi, bruna |
| `gestoresPorArea.ADMINISTRATIVO`/`FINANCEIRO` contêm Wanessa | `COMPRAS_APROVAR_DA_AREA` (rota da faixa do gestor), `AST_GERIR_FILA_SETOR` (fila Administrativo), `AVISOS_ABRIR_DE_OUTROS` (rotina + responsável de área), `PONTO_VER_EQUIPE_AREA` (`Ponto_areasDoGestor_`) | wanessa |
| `Rep_responsaveis_` sem lista própria cai na lista da triagem (premissa do catálogo: vazia) | `REP_ADMINISTRAR` | bento |
| idem | `REP_LIBERAR_FOTO` | bento, matheusgodoi, ricardo, bruna |

Poderes por pessoa (hoje real × catálogo): bento 15 (13), matheusgodoi 98 (85), wanessa 54 (50), ricardo 93 (92), bruna 83 (80); demais iguais. `MODO_PERS_RESPONSAVEIS` (bento, matheusgodoi, admin) continua fora das caixas (lista + senha própria do modo personalizado), como no catálogo.

---

## 7. Placares

**Teste do lote 0** (`FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs tests/poderes-lote0.test.cjs`): **13 de 13 passaram** (catálogo; equivalência 150 × 23; exceções e histórico; motivo; proteções; `SGO_podeExigir_`; copiar; modelos; API da tela; regra que falha não libera; memória por requisição; tela na página completa e item do menu só para quem pode; texto justificado, celular e motivo). Na produção intacta (`FASE=producao`) o mesmo teste falha 13/13, como esperado (o `SGO_Poderes.js` não existe lá).

**Suíte completa** `tests/*.test.cjs` (190 arquivos, `rodar-suite.cjs`), placar por arquivo em `lote0-producao.txt` e `lote0-candidato.txt`:

| Fase | Arquivos com falha | Testes que passaram | Testes que falharam |
|---|--:|--:|--:|
| Produção intacta | 43 | 1.672 | 137 (124 já existentes + 13 do teste novo, sem o módulo) |
| Candidato (lote 0) | 41 | 1.686 | 123 |

**Nenhuma falha nova no candidato** (comparação teste a teste). As 123 falhas restantes são as mesmas que já falham na produção (124). A única diferença além do teste novo é `comercial-assinatura-aprovacao.test.cjs` › "tela, página pública e ajuda…", que falha só com `FASE=producao` porque o próprio teste lê `output/comercial-20261110/<producao|base>/src/publico/orcamento/app.js` conforme a fase; não tem relação com este lote.

**Navegador** (`lote0-navegador.cjs`): 10 de 10 conferências OK (seção 5; `lote0-navegador.txt`).

---

## 8. Limites e pendências

- **Nada ligado:** nenhuma trava do sistema lê as caixas. Exceções gravadas agora só passam a valer quando o lote do módulo acrescentar o código em `SGO_PODERES_LIGADOS` e trocar a trava por `SGO_pode_`. A tela avisa isso em cada caixa e na faixa do topo.
- **Não publicado, não verificado em produção.** Testes em vm com o código real do legado e dados reais das 23 contas; navegador com o `google.script.run` ligado ao ambiente de teste (não ao servidor).
- **Configuração lida em tempo real:** se `gestoresPorArea`, compradores ou triagem mudarem, o padrão muda junto (é o espelho do sistema). O teste de equivalência usa a fotografia de 10/11/2026.
- **Listas ainda não extraídas** (premissas mantidas do catálogo, conferidas só pelo que o código lê): "abre em nome da representada", RH do Assistente do ponto, permissões ACIONAR da porta. Como as regras leem a configuração em vigor, o espelho vale com qualquer valor; só o teste usa a premissa.
- **Perfil RH:** a casca bloqueia para o RH as telas fora de `SGO_TELAS_RH`; se o dono der `ACESSOS_GERIR` a alguém do perfil RH, essa pessoa não abre a tela até o lote de Contas e acessos incluir `acessos` nessa lista.
- **Manual do assistente:** a ajuda e o manual da tela estão em `SGO_Ajuda_Administracao.js` (o assistente "Tire sua dúvida" lê a ajuda na hora). Não foi criado `docs/MANUAL_*.md` nem regenerado `SGO_AssistenteManuais.js` (ficam fora de `base/legado`; o teste de base de manuais já falha na produção).
- **Servidor Node** (`/_sgo/segredos`, `/_sgo/estado`): as caixas `SISTEMA_*` só espelham `isAdminSession`; trocar essas travas exige recompilar `src/` (fora deste lote).
- Proteções por registro (quem pediu não aprova, quem elaborou não aprova, envolvido não decide) continuam nos módulos, como hoje; `ctx` de `SGO_pode_` está reservado para o alcance (próprio/área/todos) nos próximos lotes.
