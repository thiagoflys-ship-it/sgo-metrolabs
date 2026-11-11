# Acessos por caixas — Lote 1: Contas, senhas e acessos (implementação)

Implementação de 11/11/2026, só no candidato local `output/poderes-20261110/base/legado`. **Nada foi publicado**, não houve acesso ao servidor (sem ssh) e não houve `git commit`. Cópia do legado antes da mudança: `output/poderes-20261110/lote1-antes-legado` (referência da equivalência).

Estado real: **preparado e testado localmente** (vm com o código real do legado e as 23 contas reais; navegador Chromium com a página completa). **Não publicado, não verificado em produção.**

---

## 1. Poderes ligados

`SGO_PODERES_LIGADOS` (SGO_Poderes.js) passou de vazio para **15 dos 17 poderes do lote 1**:

`CONTAS_VER`, `CONTAS_CRIAR`, `CONTAS_ALTERAR_OUTROS`, `CONTAS_MUDAR_PERFIL`, `CONTAS_REDEFINIR_SENHA`, `CONTAS_INATIVAR`, `CONTAS_EXCLUIR`, `CONTAS_GERIR_ADMINISTRADOR`, `CONTAS_DAR_DIRETORIA`, `AREAS_GERIR`, `AREAS_DEFINIR_PESSOA`, `SEGURANCA_VER_REGISTRO`, `SEGURANCA_ALTERAR`, `MODO_PERSONALIZADO_DESIGNAR`, `ACESSOS_GERIR`.

**Não ligados (de propósito):** `SISTEMA_SEGREDOS_SERVIDOR` e `SISTEMA_PAINEL_SERVIDOR`. As travas deles estão no servidor Node (`src/servicos/segredos.ts`, `src/servicos/estado.ts`, `src/servidor.ts`), fora do legado e fora do escopo permitido (não editar `src/`/`dist`). Ligá-los sem trocar a trava faria a tela Acessos dizer que a caixa vale quando não vale. Continuam com o aviso "passa a valer quando o módulo for ligado (lote 1)".

A tela Acessos já tratava `ligados` não vazio: a faixa do topo passa a dizer "15 de 150 caixas já valem no sistema" e as 15 caixas perdem o aviso de lote (sem mudança no `JS_Acessos.html` para isso).

---

## 2. Motor (SGO_Poderes.js)

| Função | Linha | O quê |
|---|--:|---|
| `SGO_PODERES_LIGADOS` | 31-33 | 15 códigos do lote 1 |
| `SGO_poderRecusa_(sessao, codigo, msgPadrao, acao)` | 609 | `''` se pode. Sem o poder: recusa **pelo padrão** → a mensagem original da trava (comportamento idêntico); recusa **por exceção NÃO** → mensagem da caixa (`Você não tem a permissão «…» para …`). |
| `Poderes_msgSemPoder_` | 599 | Texto único da recusa por caixa (usado também por `SGO_podeExigir_`). |
| `SGO_poderesDaSessao_(sessao)` | 619 | `{ CODIGO: bool }` dos poderes ligados da própria pessoa (para a tela). |
| `Poderes_api('pode')` | 768 | agora devolve também `meus` (os poderes ligados da pessoa), na mesma chamada que o login já fazia. |

Cada módulo usa um invólucro com recaída na regra antiga quando o `SGO_Poderes.js` não está carregado (testes isolados): `Usuarios_recusaPoder_`, `SegAcesso_recusa_`, `SGO_MP_recusaDesignar_`, `Areas_sessaoGestao_`.

---

## 3. Travas trocadas (arquivo:linha no candidato)

### SGO_Usuarios.js

| Linha | Função | Antes | Agora |
|--:|---|---|---|
| 156 | `verificarPermissaoAdmin_` | `perfilRotina_` (rotina) | caixas recebidas (basta uma), mesma mensagem |
| 165 | `verificarPermissaoConsulta_` (listar 257, obter 293, pesquisar 678) | rotina | `CONTAS_VER` |
| 173 | `exigirExcluir_` | perfil ADMIN | `CONTAS_EXCLUIR` |
| 331-343 | `exigirAdminParaContaAdmin_` | ADMIN p/ alvo ADMIN; ADMIN/DIRETORIA p/ alvo DIRETORIA | **regra fixa mantida** + `CONTAS_GERIR_ADMINISTRADOR` / `CONTAS_DAR_DIRETORIA` (a caixa só restringe; nunca amplia) |
| 355 | `criar` | rotina | `CONTAS_CRIAR` |
| 415 | `atualizar` (porta) | rotina | qualquer de `CONTAS_ALTERAR_OUTROS`, `CONTAS_MUDAR_PERFIL`, `CONTAS_REDEFINIR_SENHA`, `AREAS_DEFINIR_PESSOA` |
| 461 | `atualizar` (cada mudança) — `Usuarios_recusaMudancas_` (96) | — | perfil → `CONTAS_MUDAR_PERFIL`; senha provisória de outro → `CONTAS_REDEFINIR_SENHA`; área → `AREAS_DEFINIR_PESSOA`; nome/e-mail/celular/vínculo/empresa de outro → `CONTAS_ALTERAR_OUTROS` |
| 524 / 551 | `inativar` / `reativar` | rotina | `CONTAS_INATIVAR` |
| 585 + 593 | `excluir` | rotina + ADMIN | porta: qualquer caixa de gestão de contas; depois `CONTAS_EXCLUIR` |
| 661 | `enviarLinkRedefinicao` | rotina | `CONTAS_REDEFINIR_SENHA` |
| 1045 | `usuariosVinculosConta` | perfil ADMIN | `CONTAS_EXCLUIR` |
| 1193-1250 | `usuariosPainel` | `souAdmin`, `podeGerir`, `podeExcluir`, `podeGerirAreas` por perfil | pelas caixas (+ regra fixa); devolve `poderes`, e por linha `PODE_SENHA`, `PODE_INATIVAR`, `CONTA_PROTEGIDA` |
| 509 + 123 | `atualizar` → `Usuarios_avisarEmailTrocado_` | — | **novo:** troca de e-mail avisa o e-mail antigo (seção 4) |

### SGO_Areas.js

| Linha | Função | Antes | Agora |
|--:|---|---|---|
| 187-195 | `Areas_sessaoGestao_` (painel, salvar, situação, preencher pelo perfil) | `SGO_podeConsultarPessoas_` | `AREAS_GERIR` |
| 295 | `areasDefinirDoUsuario` | idem | `AREAS_DEFINIR_PESSOA` |

### SGO_SegurancaAcesso.js

| Linha | Função | Antes | Agora |
|--:|---|---|---|
| 1076 | `SegAcesso_recusa_` | — | invólucro (as funções-base `SegAcesso_podeVer_`/`SegAcesso_ehAdmin_` ficam intactas: são a regra padrão do catálogo) |
| 1225-1229 | `SegAcesso_api` (porta e `exigirAdmin`) | `SegAcesso_podeVer_` / `SegAcesso_ehAdmin_` | `SEGURANCA_VER_REGISTRO` (ou `SEGURANCA_ALTERAR`) / `SEGURANCA_ALTERAR` |
| 1279 | `exigirTrocaTodos` | `exigirAdmin` | + **proteção fixa**: só Administrador/dono (alcança contas de Administrador) |
| 1292 | `exigirTrocaUsuario`, `zerarSegundoFator` | `exigirAdmin` | + **proteção fixa** `exigirAlvoPermitido`: alvo ADMIN só por Administrador/dono; alvo DIRETORIA só por Administrador/dono/Diretoria |
| 95-96 | `SEGA_EVENTOS` | — | evento `EMAIL_TROCADO` |
| 732 | `SegAcesso_avisarEmailTrocado_` | — | e-mail ao endereço antigo |

### SGO_ModoPersonalizado.js (CRLF preservado)

| Linha | Função | Antes | Agora |
|--:|---|---|---|
| 360-375 | `SGO_MP_exigirAdmin_` (responsáveis, definir, redefinir senha, enviar link, desbloquear) | `SGO_MP_ehAdmin_` | `MODO_PERSONALIZADO_DESIGNAR` |
| 572 | `SGO_MP_situacao_.podeDesignar` | `SGO_MP_ehAdmin_` | caixa |
| 563 / 861 | ajuda liberada / auditoria (consulta) | `SGO_MP_ehAdmin_` | `SGO_MP_ehAdmin_` **ou** caixa (quem recebe a caixa vê a ajuda e a auditoria das abas que a tela já mostra) |

### Tela (mostrar/ocultar pelo poder; o servidor continua recusando)

| Arquivo | O quê |
|---|---|
| `JS_Acessos.html` | `SGO_MEUS_PODERES`, `SGO_temPoder_(codigo, fallback)`, `SGO_poderesAplicarMenu_()`: guarda os poderes da resposta `pode` do login e reaplica o menu (Usuários, Segurança do acesso). Antes da resposta vale a regra de perfil. |
| `JS_Core.html` 867-868, 5028 | item Usuários do menu e atalho do celular por `CONTAS_VER`. |
| `JS_SegurancaAcesso.html` | `SegAcessoTela_pode_` por `SEGURANCA_VER_REGISTRO`/`SEGURANCA_ALTERAR`. |
| `JS_Admin.html` (Usuários) | porta da tela por `CONTAS_VER`; "Novo usuário" por `CONTAS_CRIAR`; "Áreas" por `AREAS_GERIR`; "Mais ações" (rodapé) se houver alguma caixa de gestão; link/senha provisória por `PODE_SENHA`, inativar/reativar por `PODE_INATIVAR` (apagados com "Você não tem a caixa «…»"); campo Perfil travado sem `CONTAS_MUDAR_PERFIL`; "Conta de Administrador" pela regra fixa (`CONTA_PROTEGIDA`). |
| `JS_ModoPersonalizado.html` | sem mudança: já segue `podeDesignar` do servidor. |

---

## 4. Proteções fixas (mantidas e testadas)

- Conta e perfil **Administrador**: só Administrador (regra fixa em `exigirAdminParaContaAdmin_`; a caixa `CONTAS_GERIR_ADMINISTRADOR` só pode **tirar**). Na Segurança do acesso: exigir troca, desconectar aparelhos e "exigir troca de todos" sobre Administrador só por Administrador/dono.
- **Diretoria**: só Administrador ou Diretoria (idem com `CONTAS_DAR_DIRETORIA`).
- Nunca ficar sem Administrador ativo; ninguém muda o próprio perfil nem inativa/exclui a própria conta; conta do dono nunca excluída (código existente, intocado).
- Ninguém altera as próprias caixas; dono sempre tudo e sem exceção gravável (lote 0).
- **Nova (desenho):** troca de e-mail em Usuários envia aviso ao **e-mail antigo** (quem trocou, quando, e-mail novo mascarado `jo***@dominio`, texto justificado), grava `USUARIOS_EMAIL_TROCADO` no SYS_LOGS e `EMAIL_TROCADO` no registro da Segurança do acesso; a mensagem de quem salvou diz se o aviso saiu ou pede para avisar a pessoa por outro meio. Falha no envio nunca derruba a gravação.

---

## 5. Testes e placares

**`tests/poderes-lote1.test.cjs`** (novo, 5 testes) — `FASE=candidato`: **5/5**.

1. **Equivalência:** 23 contas reais × 40 ações (listar, obter, pesquisar, painel, criar comum/Diretoria/Administrador, alterar dados/perfil/área de outro, promover a Diretoria/Administrador, alterar contas da Diretoria/Administrador, mudar o próprio perfil, senha provisória, link, inativar/reativar comum/Diretoria/Administrador/si mesmo, vínculos, excluir comum/Administrador, áreas ×4, Segurança ×6, modo personalizado ×3, `pode`) rodadas na mesma ordem contra o **legado de antes** (`lote1-antes-legado`) e o candidato: **920 comparações, 718 recusas no legado, 0 divergências** de resultado e de mensagem (`lote1-equivalencia.txt`).
2. **Exceção NÃO:** gestora sem `CONTAS_ALTERAR_OUTROS` é recusada no servidor ao alterar outra pessoa (mensagem da caixa; nada gravado) e mantém as outras caixas; idem áreas, inativar e Segurança; Diretoria sem `CONTAS_DAR_DIRETORIA` não cria conta da Diretoria; dono continua com tudo.
3. **Exceção SIM:** técnico com as caixas passa a ver/alterar/inativar contas comuns, abrir Áreas, Segurança (sobre técnico) e modo personalizado, mas é recusado em 10 operações sobre Administrador/Diretoria, no próprio perfil, em "exigir troca de todos" e nas próprias caixas; o painel não lhe oferece os perfis Administrador/Diretoria.
4. **E-mail antigo:** aviso único ao endereço antigo, nada ao novo, novo mascarado, registro e log; sem troca, nenhum e-mail; envio que falha → mensagem pede aviso por outro meio.
5. **Tela:** página completa contém as funções; menu Usuários e Segurança do acesso mostrados/ocultos conforme as caixas para 8 casos (com e sem exceção), coerentes com a recusa do servidor; fallback por perfil antes da resposta; ajuda atualizada.

**Navegador** (`lote1-navegador.cjs`, Chromium, página completa, sem rede): **5/5** (`lote1-navegador.txt`, capturas em `lote1-telas/`): Diretoria sem exceção igual a antes; técnico com exceção SIM vê o menu e a lista, "Editar" só em conta comum, sem "Novo usuário"/"Áreas", link e inativar apagados com o motivo; gestora com NÃO não vê o menu e a abertura direta mostra o aviso; gestor sem criar/senha/inativar no celular 390 px sem rolagem lateral; comercial igual a antes.

**`tests/poderes-lote0.test.cjs`**: 13/13 — ajustado só onde afirmava "nenhum poder ligado" (agora confere exatamente a lista do lote 1).

**Suítes pedidas** (candidato, antes → depois): `login-email` 13/13 → 13/13; `modo-personalizado` 9/9 → 9/9; `perfil-rh-vinculo` 14/14 → 14/14; `perfis-rotina-frota` 6/6 → 6/6; `perfis-rotina-geral` 10/10 → 10/10; `seguranca-acesso` 13/13 → 13/13; `usuarios-excluir-vinculo` 16/16 → 16/16.

**Suíte inteira** (`rodar-suite.cjs`, placar por arquivo em `lote1-antes.txt` e `lote1-depois.txt`):

| Fase (candidato) | Arquivos | Arquivos com falha | Testes que passaram | Testes que falharam |
|---|--:|--:|--:|--:|
| Antes do lote 1 (`lote1-antes.txt`) | 195 | 30 | 1.765 | 92 |
| Depois do lote 1 (`lote1-depois.txt`) | 196 | 30 | 1.770 | 92 |

**Nenhuma falha nova** (comparação teste a teste: 0 falhas novas, 0 sumidas). A diferença é só o arquivo novo `poderes-lote1.test.cjs` (5/5). As 92 falhas são as mesmas que já existiam no candidato antes desta mudança, em módulos fora deste lote.

`node --check` sem erro nos 6 `.js` alterados; os `<script>` de `JS_Admin.html`, `JS_Core.html`, `JS_Acessos.html` e `JS_SegurancaAcesso.html` compilam; finais de linha preservados (LF nos arquivos LF; CRLF no `SGO_ModoPersonalizado.js`); 23 nomes globais novos, nenhum repetido no legado.

---

## 6. Ajuda

- `SGO_Ajuda_Administracao.js` › **Acessos**: implantação por etapas (lote 1 ligado, as duas caixas do servidor pendentes), proteções fixas de Contas, aviso ao e-mail antigo, pergunta "Tirei a caixa… o que ele vê?", seção "Implantação por lotes" com o lote 1.
- › **Usuários**: problemas "Você não tem a permissão/caixa «…»" e "aviso no e-mail antigo"; linha "TODOS (caixas)" no quem pode.

---

## 7. Limites e pendências

- **Não publicado, não verificado em produção.** Testes em vm e Chromium com o `google.script.run` ligado ao ambiente de teste.
- **`SISTEMA_SEGREDOS_SERVIDOR` e `SISTEMA_PAINEL_SERVIDOR` não ligados** (trava no servidor Node; exige mudar `src/` e recompilar — fora deste lote).
- **Perfil RH na casca:** a casca do perfil RH só abre telas de `SGO_TELAS_RH`. Exceção SIM de `SEGURANCA_*` ou `ACESSOS_GERIR` para alguém do perfil RH mostra o item, mas a casca não abre a tela (mesma limitação anotada no lote 0). `usuarios` já está na lista do RH.
- **Grupo do menu:** se uma exceção SIM mostrar "Usuários" a quem não tinha nenhum item no grupo Administração, o grupo aparece só na próxima entrada (o menu agrupado não é recalculado depois da resposta). No ensaio do navegador o técnico já tinha "Configurações" no grupo, então o grupo estava visível; o caso extremo não foi testado.
- **Edição da própria conta:** passa pela porta "alguma caixa de edição"; nome/e-mail/celular da **própria** conta não pedem `CONTAS_ALTERAR_OUTROS` (a caixa é "de outra pessoa"); perfil próprio continua proibido.
- **Exceção SIM de Segurança para não Administrador:** pode gravar a configuração do código no celular e desconectar/exigir troca de contas comuns; nunca de Administrador/Diretoria (fixo) nem de todos.
- **Auditoria do modo personalizado:** quem recebe `MODO_PERSONALIZADO_DESIGNAR` também consulta a auditoria sem abrir o modo (como o Administrador).
- **`lote0-navegador.cjs`** (evidência do lote 0, fora da suíte) afirma "150 avisos de lote" e a faixa "Nenhum módulo obedece"; depois do lote 1 são 135 avisos e a faixa "15 de 150". Não foi reescrito; a conferência atual é `lote1-navegador.cjs`.
- **E-mail:** o aviso usa `MailApp` como os demais avisos da Segurança do acesso; não foi conferido o envio real (cota/entrega).
- `_poderes_ambiente.cjs` ganhou as opções `extras` e `pasta` (sem mudar o comportamento padrão).
