# Auditoria Técnica — Portal SGO+ (versão CNPJ/DB)

**Data:** 05/08/2026 · **Escopo:** 102 arquivos, ~54.500 linhas (87 `.js`, 15 `.html`, manifests)
**Método:** análise estática automatizada (encoding, sintaxe via parser Node, cross-reference cliente↔servidor, coerência de módulos, segurança)

---

## 1. Resumo Executivo

| Dimensão | Resultado |
|---|---|
| Mojibake / Encoding | ✅ **Zero ocorrências** — todos os arquivos UTF-8 válidos |
| Sintaxe (backend .js) | ✅ 87/87 arquivos sem erro de sintaxe |
| Sintaxe (scripts inline .html) | ✅ Todos os blocos `<script>` sem erro |
| Integração cliente ↔ servidor | ✅ 30 funções expostas via `google.script.run` — **todas existem** no backend |
| Includes de template | ✅ 0 `include()` quebrados |
| Colisões de namespace global | ✅ 0 funções e 0 globais duplicadas entre arquivos |
| Config (`SGO_CFG.SHEETS`) | ✅ Todas as chaves usadas estão definidas, e vice-versa |
| Motores de relatório | ✅ Abas criadas/lidas consistentes nos 4 motores; allow-lists dos dispatchers 100% alinhadas |
| **Segurança** | 🔴 **3 achados relevantes** (ver §3) |
| Tratamento de erro no frontend | 🟡 127 de 166 chamadas sem `withFailureHandler` |

**Veredito geral:** o sistema está estruturalmente coerente — a "conversa" entre módulos (Main → Parser → Engine/AnaliseCiclo → Planilha → Graficos → CertificadoRelatorio → CertificadoIA) está íntegra, sem referências quebradas. Os problemas encontrados são de **segurança e robustez**, não de lógica funcional.

---

## 2. Verificações Aprovadas (detalhe)

- **Encoding:** varredura por padrões de duplo-encoding UTF-8 (`Ã©`, `â€`, `�` etc.) — 0 ocorrências em 102 arquivos. `iconv` validou UTF-8 em 100% dos arquivos.
- **Sintaxe:** `node --check` em todos os `.js` e em todos os blocos `<script>` extraídos dos `.html` (com scriptlets `<?!= ?>` neutralizados) — nenhum erro.
- **Cross-reference:** todas as chamadas `google.script.run.fn()` do frontend têm função top-level correspondente no backend; nenhuma função global duplicada (risco clássico do namespace único do Apps Script); nenhum `include()`/`createTemplateFromFile()` aponta para arquivo inexistente.
- **Motores de relatório:** abas de gráficos são criadas por `*_recriarAbaGrafico_()` com os mesmos nomes literais depois lidos por `getSheetByName()` — consistente em Autoclave (`GRÁF.`), Lavadora (`GRF.`), Cadeia Frio e Estufa/Banho. Os `fn` enviados pelo cliente aos dispatchers (`AutoRel_apiDispatch`, `LavRel_apiDispatch`) batem 100% com as allow-lists.
- **Chaves de API:** `GEMINI_API_KEY` corretamente lida de `PropertiesService` — nada hardcoded.
- **Sessão:** TTL com renovação, camada dupla CacheService + Properties — implementação correta.
- **Manifest:** V8, `America/Sao_Paulo`, scopes coerentes com o uso (Drive v3 advanced service declarado e usado).

---

## 3. Achados — por severidade

### 🔴 CRÍTICO — Funções expostas sem validação de sessão em webapp anônimo

O deploy é `ANYONE_ANONYMOUS` + `USER_DEPLOYING`. O módulo core valida sessão (`exigirSessao`), mas **10 funções expostas ao cliente não validam nada**. Qualquer pessoa com a URL `/exec` pode invocá-las diretamente:

| Função | Arquivo | Risco |
|---|---|---|
| `dispararSincronizacaoTotal` | SGO_Integracao_Engine.js | **Escrita** — dispara sync completo OSPlus |
| `AutoRel_apiDispatch` | SGO_AutoRel_Main.js | Upload de arquivos no Drive, consulta CNPJ, geração de certificados |
| `LavRel_apiDispatch` | SGO_LavRel_Main.js | Idem |
| `tplCartaConfGerarDocumento` | SGO_CartaConformidade.js | **Cria documentos no Drive** |
| `tplCartaConfBootstrap` / `tplCartaConfBuscarCnpj` | SGO_CartaConformidade.js | Exposição de dados / proxy de consulta CNPJ |
| `tplAutoclaveObterConfig` / `tplAutoclaveObterPlaceholders` | SGO_TemplateAutoclave.js | Exposição de configuração |
| `tplLavadoraObterConfig` / `tplLavadoraObterPlaceholders` | SGO_TemplateLavadora.js | Idem |

**Correção recomendada:** exigir `sessionId` no payload desses endpoints e validar com `exigirSessao()` no início de cada um (ou dentro dos dispatchers, antes do `allow[fn]`).

### 🔴 ALTO — Senha administrativa hardcoded no código-fonte

`senhaFallback: 'METROLABS@2026'` presente em **SGO_AutoRel_Config.js:258, SGO_LavRel_Config.js:89, SGO_EstufaBanhoRel_Config.js:228, SGO_CadeiaFrioRel_Config.js:213** (+ `'ENGENHARIA'` em SGO_EstufaBanhoRel_Config.js:248). Combinado com o achado anterior, o modo simulador/admin fica acessível a qualquer anônimo que leia o fonte ou adivinhe a senha.
**Correção:** remover os fallbacks e usar exclusivamente `Script Properties → SIMULADOR_ADMIN_SENHA` (o mecanismo já existe).

### 🔴 ALTO — Senhas de usuários em texto plano

`SGO_Auth.js:70` compara `senhaDb === senhaInformada` — as senhas estão em texto plano na aba `CAD_USUARIOS`.
**Correção:** armazenar hash (`Utilities.computeDigest(SHA_256, senha + salt)`) e comparar hashes.

### 🟡 MÉDIO — 127/166 chamadas `google.script.run` sem `withFailureHandler`

Falhas de servidor (timeout, quota, exceção) morrem em silêncio no frontend — o usuário vê spinner infinito ou tela travada. Piores casos: JS_Core (18/30), JS_Admin (15/18), JS_Cadastros (14/15).
**Correção:** criar um wrapper único em JS_Core (ex.: `chamarServidor(fn, payload)`) com failure handler padrão + toast de erro, e migrar as chamadas gradualmente.

### 🟢 BAIXO — Mensagem de erro orienta função inexistente

`SGO_Documentos.js:127` e `SGO_QRCode.js:57` instruem: *"Execute a função setupDrive() no script SGO_DriverSetup.gs"* — mas a função real é **`configurarPastasSGO()`**. O operador que seguir a mensagem não encontrará a função.

### 🟢 BAIXO — Arquivo morto em produção

`UI_Scripts_BKP.html` (2.726 linhas) não é incluído em nenhum template, mas continua no push do clasp (inclusive listado no `filePushOrder`). Contém 47 chamadas antigas sem failure handler que poluem análises. **Remover do projeto** (manter backup fora do rootDir).

### 🟢 BAIXO — BOM (Byte Order Mark) em 9 arquivos

`SGO_AutoRel_Config.js`, `SGO_AutoRel_Simulador.js`, `SGO_LavRel_{AnaliseCiclo, Config, Graficos, Main, Planilha, Simulador}.js`, `UI_Estilos.html`. Inofensivo hoje, mas pode gerar diffs falsos e problemas com ferramentas de build. Normalizar para UTF-8 sem BOM.

### ℹ️ INFO — Resíduos de mojibake histórico (nomes de abas legadas)

`SGO_LavRel_Graficos.js` remove abas legadas com nomes já corrompidos: `'6. GRF. PRESSO'`, `'8. ANALISE AVANADA DE PRESSO'` etc. É limpeza de legado — mas se as planilhas antigas tiverem os nomes **acentuados** corretos, essas abas não serão removidas. Vale incluir as variantes acentuadas na lista de exclusão.

### ℹ️ INFO — Cobertura de try/catch desigual

`SGO_PlanCME_Main.js` tem 1 catch para 5 funções, contra média de ~25% nos demais Main. Padronizar o envelope `{ success, message }` também no PlanCME.

---

## 4. Plano de Ação Sugerido (ordem de prioridade)

1. **Blindar os 10 endpoints sem sessão** (1 função helper + 10 inserções de 1 linha).
2. **Remover `senhaFallback` hardcoded** dos 4 configs → Script Properties.
3. **Hash de senhas** em CAD_USUARIOS (script de migração único + ajuste no `login()`).
4. Wrapper `chamarServidor()` com failure handler padrão em JS_Core.
5. Corrigir mensagens `setupDrive()` → `configurarPastasSGO()`.
6. Excluir `UI_Scripts_BKP.html`; normalizar BOM dos 9 arquivos.

Itens 1, 2, 5 e 6 são de baixo esforço e podem ser aplicados num único push.

---

## 5. CORREÇÕES APLICADAS — 05/08/2026

Todas as correções foram aplicadas e verificadas (sintaxe 100% limpa, cross-reference cliente↔servidor íntegro):

| # | Correção | Arquivos |
|---|---|---|
| 1 | **Validação de sessão** nos 7 dispatchers (`exigirSessao(req.sessionId)`) + `sessionId` injetado nos 28 call sites do cliente | 7× `*_Main.js`, `JS_AutoclaveRelatorio.html`, `JS_LavadoraRelatorio.html`, 6× `*_ConteudoModulo.js` |
| 2 | **Validação de sessão** nas 8 funções `tpl*` (Carta Conformidade + Templates) com `sessionId` como 1º parâmetro | `SGO_CartaConformidade.js`, `SGO_TemplateAutoclave.js`, `SGO_TemplateLavadora.js` + 3 HTML |
| 3 | **Sincronização protegida**: gatilho validado por `triggerUid` real; portal exige sessão de perfil ≠ CLIENTE; funções de menu exigem contexto de planilha | `SGO_Integracao_Engine.js`, `Integracao_OSPlus.js`, `Index.html` |
| 4 | **Acessor global `SGO_getSessionId()`** + **wrapper `chamarServidor()`** com failure handler padrão | `JS_Core.html` |
| 5 | **Senhas hardcoded removidas** (`METROLABS@2026` ×5, `ENGENHARIA` ×1) — agora exclusivamente via Script Properties | 4× `*_Config.js`, `SGO_LavRel_Simulador.js` |
| 6 | **Hash SHA-256 + salt por usuário** no login (dual-mode com migração transparente no 1º login) e na gravação de usuários | `SGO_Auth.js`, `SGO_Usuarios.js` |
| 7 | **Setup automatizado de segurança**: gera senhas admin, migra senhas para hash, imprime checklist | `SGO_Setup_Seguranca.js` (novo) |
| 8 | Mensagens corrigidas: `setupDrive()` → `configurarPastasSGO()` | `SGO_Documentos.js`, `SGO_QRCode.js` |
| 9 | `UI_Scripts_BKP.html` excluído (2.726 linhas mortas) + removido do `filePushOrder` | `.clasp.json` |
| 10 | BOM removido de 9 arquivos; variantes acentuadas incluídas na limpeza de abas legadas | `SGO_LavRel_Graficos.js` e outros |

### Passos pós-deploy (obrigatórios, nesta ordem)

1. `clasp push` e criar **nova implantação** (New deployment) — a URL `/exec` antiga continua na versão anterior.
2. No editor do Apps Script, executar **`setupSeguranca()`** (arquivo SGO_Setup_Seguranca) e anotar as senhas geradas no log de Execuções.
3. Re-executar **`executarSetupIntegracao()`** para recriar o gatilho das 03:00 (o guard valida o `triggerUid` do gatilho ativo).
4. Testar login (a migração das senhas para hash é automática no primeiro login de cada usuário; ou já foi feita em lote pelo `setupSeguranca`).
5. Testar um relatório de cada motor logado — chamadas sem sessão agora retornam erro de sessão inválida (comportamento esperado).
