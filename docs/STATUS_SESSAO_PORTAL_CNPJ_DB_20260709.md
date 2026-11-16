# Status da sessão — Portal SGO+ CNPJ/DB (2026-07-09)

Documento de continuidade. Objetivo: qualquer pessoa (ou IA) que retomar este trabalho depois sabe exatamente onde parou, o que já está em produção, o que está só em DEV, e o que foi tentado e rejeitado — sem precisar reconstruir o histórico da conversa.

**Antes de agir sobre qualquer detalhe aqui (scriptId, deployment, nome de função): confirme no código/`clasp deployments` atual.** Este documento é uma fotografia de 2026-07-09.

---

## 1. Projetos envolvidos (scriptId de cada um)

| Projeto | Pasta | scriptId |
|---|---|---|
| Portal principal | `apps-script-imports/portal_sgo_versao_cnpj_db` | `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9` |
| Template Autoclave (standalone) | `apps-script-imports/projeto_exec_1_akfycbwt` | `1er8uNUTHK5ssOztxIo1G_-KVpvegi1K7QnSwJEDOP7y1Uzzs3Os3sT7M` |
| Template Lavadora (standalone) | `apps-script-imports/projeto_exec_2_akfycbwv` | `1qosSzRYdcDfJMCjJu96tnMYZmrEaplBQwQzNmamSN7T83cqs-P--hfL3` |
| Carta de Conformidade (standalone) | `apps-script-imports/projeto_exec_3_akfycbyv` | `1sZiEZN_yhHn-2I4rDM16Ain9HvY47nlNBq3CdBzELytL52VujKf6FlVy` |
| Autoclave Relatório (fonte, não editado hoje) | `apps-script-imports/gerador_autoclave_relatorio` | `1WtVYI9vqw-uHebPUuPJ6tLkS9FwybVW8FHZxhwQhKXKqKC377khq1fVu` |
| Lavadora Relatório (fonte, não editado hoje) | `apps-script-imports/gerador_lavadora_relatorio` | `1fqeAIZGWauruRcB4-kPONXUmcZALu2cgn6TQ61CZmFAe0tosovc7Bsfb` |

`portal_sgo_versao_cnpj_db` é um projeto **diferente** do "METROLABS SGO+" descrito em `docs/BRIEFING_ARQUITETO_SENIOR_CHATGPT.md` (aquele tem DEV/PRODUCAO_V2/PROD antigo próprios) — não confundir os dois.

## 2. Estado de deployment (produção) confirmado em 2026-07-09

| Projeto | Deployment (produção) | Versão | O que tem |
|---|---|---|---|
| Portal | `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA` | **v51** | Autoclave/Lavadora nativos (Template + Relatório de Auditoria, sem iframe) + Carta de Conformidade nativa (sem iframe) + fix de largura + fix de colisão de função (CNPJ) |
| Template Autoclave | `AKfycbwtVx6AJD3WwLCQShW3u5Vxovr1qmnskzjxHm8E8R1dFc1iMrWRecgrPfunRYzjJ4g55g` | v9 | `doPost` proxy pro Portal |
| Template Lavadora | `AKfycbwv1iylXlf9RZAiOYQrfpJSnis3_C-cvXyOMl11JK3EkBe5VAHYPjVih5nPOW7mIT6IoQ` | v10 | `doPost` proxy pro Portal |
| Carta de Conformidade | `AKfycbyvQX6Kt0P5n2bn313MsOYQGeEwxht_z3tLH96p9cPLTBYAgiFpEPrM3h69mTs9J-11` | v12 | `doPost` proxy pro Portal |

A URL `/exec` de cada deployment **não mudou** em nenhum caso — toda publicação de hoje foi via `clasp deploy -i <deploymentId existente>`, nunca criando deployment novo.

## 3. O que foi feito e JÁ ESTÁ em produção (v51 do Portal)

1. **Autoclave/Lavadora "Gerar Template" e "Gerar Relatório de Auditoria"** portados como telas nativas do Portal (sem iframe) — resolve o bloqueio de cookies de terceiros do Chrome que travava essas abas com tela preta. Arquivos: `SGO_TemplateAutoclave.js`/`JS_TemplateAutoclave.html`, `SGO_TemplateLavadora.js`/`JS_TemplateLavadora.html`, `SGO_AutoRel_*.js`/`JS_AutoclaveRelatorio.html`, `SGO_LavRel_*.js`/`JS_LavadoraRelatorio.html`. Convenção de prefixo: `tplAutoclave_`/`AutoRel_`/`tplAutoRel_` (Autoclave), `tplLavadora_`/`LavRel_`/`tplLavRel_` (Lavadora) — necessário porque os dois módulos compartilham a mesma base de código original com os mesmos nomes de função.
2. **Fix de largura** (`.wrap`/`.action-bar` da Lavadora renderizando mais estreito que a Autoclave): causa era `margin: 0 auto` num item flex esticado — margem automática desliga o `stretch` do Flexbox e o item passa a usar largura baseada no conteúdo. Trocado para `margin: 0` nos 4 arquivos (Autoclave/Lavadora × Template/Relatório).
3. **Fix de colisão de função** (busca de CNPJ da Autoclave parou de funcionar): `consultarCnpjAutomatico`, `ativarModoSimuladoAdmin`, `construirPayload`, `chamarPreview`, `chamarConverter` tinham escapado da renomeação original e ficaram sem prefixo nos dois módulos — como os dois scripts carregam na mesma página, a versão da Lavadora (carregada por último) sobrescrevia a da Autoclave no escopo global. Renomeadas com o prefixo correto.
4. **Carta de Conformidade Técnica** portada como tela nativa do Portal (sem iframe): wizard de 6 etapas (dados do cliente, equipamento, escopo/parecer, processo, insumos, conclusão/emissão) + impressora térmica. Arquivo `JS_CartaConformidade.html` (~2650 linhas), proxy `SGO_CartaConformidade.js`. Detalhe técnico importante: o formulário original usa **Bootstrap 5.3.3**, que o resto do Portal não usa (tem seu próprio design system, com classes de mesmo nome `.btn`/`.card`/`.form-control`/`.container`). Solução: baixei o `bootstrap.min.css` e escopei **mecanicamente** todos os seletores sob `#tplCartaConfContainer` (script Node ad-hoc, não fica no repo) para não vazar pro resto do Portal. Backend do standalone ganhou um `doPost(e)` roteando 8 ações (`bootstrap`, `buscarCnpj`, `validarPayload`, `auditar`, `gerarDocumento`, `salvarRelatorio`, `refinarIA`, `pesquisarDocumentos`) sem alterar nenhuma lógica de `Config.js`/`Motor_Auditoria.js`/`Documento.js`/`IA.js`/`Validacao.js`.
5. **Fix de checkbox/radio sem feedback visual** na Carta de Conformidade (Etapa 3): o Comfort Dark global do Portal sobrescreve `background` (shorthand) em todo `<input>`, apagando o SVG de check que o Bootstrap usa pro estado marcado. Corrigido com `accent-color` + reset de `appearance` nos checkboxes, e destaque explícito de borda/fundo no card ativo do parecer técnico.

## 4. Pendência menor conhecida (não corrigida, baixo impacto)

Botão **"PRÉVIA"** da impressora térmica da Carta de Conformidade (antes de gerar o documento oficial) não preenche receitas/QR corretamente — depende de `window.receitas`/`window.ultimaValidacaoGerada`, que no app original nunca são atribuídas a `window` (são `let` no escopo do script, não `var`), então sempre ficam `undefined` nesse caminho específico. **Isso já era assim no app original antes do port** — não é regressão. O ticket **oficial** (depois de gerar o PDF de verdade) funciona certo, porque usa `payload.resumo_impressao` vindo do backend, não essas variáveis. Não mexi para não fugir do escopo pedido.

## 5. Fora do escopo de hoje (não tocado)

- **Planejamento CME** continua embutido via `<iframe>` em `JS_Core.html` (`abrir('planejamento_cme')`, linha ~556 na época deste documento) — mesmo risco de bloqueio de cookies de terceiros que já resolvemos pros outros módulos. Próximo candidato natural a port nativo, quando o usuário quiser.

## 6. Versão mobile — tentada duas vezes, REJEITADA as duas, só em DEV (nunca publicada)

O usuário pediu uma tela inicial mobile (grade de ícones pra Planejamento CME/Carta de Conformidade/Clientes/Unidades/Equipamentos/Documentos). Duas tentativas, ambas rejeitadas:

- **v1**: grade de ícones + reaproveitar as telas desktop existentes (`renderClientesModulo_` etc.) pros 4 módulos de cadastro. Rejeitada: "abre fora de encaixe" (precisava dar zoom out) e as telas reaproveitadas ficavam ruins de tocar (formulário+tabela lado a lado, do jeito desktop, só espremido).
- **v2**: telas mobile próprias construídas do zero pra Clientes/Unidades/Equipamentos/Documentos (lista+busca+card+formulário empilhado, CSS e JS novos, mesma API de backend do desktop), barra fixa "Voltar/Sair" no lugar do cabeçalho desktop. Também rejeitada pelo usuário (sem detalhar o motivo específico desta vez).

**Decisão do usuário: parar por aqui.** "Vamos pensar no futuro como melhorar e descrever melhor como ela irá funcionar" — ou seja, antes de tentar de novo, alinhar um requisito bem mais detalhado (telas exatas, fluxo, campos) ANTES de codar, em vez de partir direto pra implementação.

**Estado técnico**: todo o código da v1 e v2 está no `/dev` do Portal (nunca publicado — produção v51 não tem nenhuma dessas mudanças). Inclui: classe `.modo-mobile` em `#app` (detecção client-side via `matchMedia(max-width:900px)` no login), `abrir('mobile_home')`, `renderMobileHome_()`, `ehMobileModo_()`/`irTelaInicial_()`/`voltarMobile_()`, 8 funções de tela (lista+form × Clientes/Unidades/Equipamentos/Documentos), CSS `.mobile-*` em `UI_Estilos.html`, barra `.mobile-topbar` em `Index.html`. Pode ser reaproveitado em pedaços quando o requisito for refeito, ou removido — decisão em aberto pro usuário.

## 7. Convenções estabelecidas hoje (seguir em qualquer continuação)

- **Prefixo por módulo portado**: frontend `tplXxx_`, backend `Xxx_` (ex.: `tplAutoRel_`/`AutoRel_`, `tplCartaConf_`/nenhum backend próprio pois é proxy). Sempre prefixar TODO identificador top-level (função/variável) do arquivo portado, não só os "óbvios" — a colisão do item 3 acima aconteceu justamente por 5 funções terem escapado dessa varredura.
- **Padrão proxy (sem iframe)**: standalone ganha `doPost(e)` roteando `action` pra funções já existentes; Portal ganha `SGO_<Modulo>.js` com IIFE + `UrlFetchApp.fetch` + wrappers globais `tplXxx*` chamados via `google.script.run`.
- **Nunca criar deployment novo** — sempre `clasp version` + `clasp deploy -i <deploymentId existente>`, preservando a URL `/exec`.
- **Backup antes de editar, sempre** — pasta `backups/` na raiz do repo, nomeada `<PROJETO>_<CONTEXTO>_20260709`. Backups de hoje: `PORTAL_SGO_PRE_PILOTO_PROXY`, `PORTAL_SGO_PRE_LAVADORA_PROXY`, `PORTAL_SGO_PRE_AUTOREL_PORT`, `PORTAL_SGO_PRE_LAVREL_PORT`, `PORTAL_SGO_PRE_FIX_COLISAO_FUNCOES`, `PORTAL_SGO_PRE_CARTACONF_PORT`, `PORTAL_SGO_PRE_MOBILE_HOME`, `PORTAL_SGO_PRE_MOBILE_TELAS_V2`, `CARTA_CONFORMIDADE_PRE_DOPOST`, `TEMPLATE_AUTOCLAVE_PRE_PILOTO_PROXY`, `TEMPLATE_LAVADORA_PRE_PROXY` (todas com sufixo `_20260709`).
- **DEV primeiro, sempre** — só publica em produção depois de validação humana explícita no navegador e autorização explícita do usuário no chat.
- **Validar sintaxe antes de todo push** — parse de cada bloco `<script>` via `new Function(...)` + balanceamento de chaves do CSS.

## 8. Próximos passos em aberto (nenhum decidido ainda)

- Redesenhar a versão mobile com requisito mais detalhado antes de codar (ver seção 6).
- Portar Planejamento CME nativamente (mesmo padrão dos outros módulos).
- Opcional: corrigir a pendência da prévia de impressão (seção 4).
