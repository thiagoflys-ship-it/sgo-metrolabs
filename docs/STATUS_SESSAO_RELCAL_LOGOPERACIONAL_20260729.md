# Status da sessão — Bug crítico RelCal + Log Operacional (2026-07-29)

Documento de continuidade. Objetivo: qualquer pessoa (ou IA) que retomar este trabalho depois sabe exatamente onde parou, o que já está em produção, o que está só em DEV, e o que ainda falta decidir — sem precisar reconstruir o histórico da conversa.

**Antes de agir sobre qualquer detalhe aqui (deployment, nome de função): confirme no código/`clasp deployments` atual.** Este documento é uma fotografia de 2026-07-29.

---

## 1. O problema relatado

Usuário reportou, com urgência, um bug crítico em produção no módulo **Relatório de Calibração** (RelCal, nativo do Portal SGO+ CNPJ/DB): ao gerar vários relatórios em sequência na mesma sessão do navegador (ex.: 5 num dia), dados do certificado ANTERIOR (número do certificado, cliente, TAG, data, técnico) apareciam no relatório seguinte — às vezes parecendo "cortado" (na real era um número mais curto de um relatório anterior, não truncamento de leitura).

Contexto crítico que **deve continuar governando qualquer trabalho futuro nesses módulos**: a equipe **não confere os dados gerados** — o sistema foi automatizado justamente para depender o mínimo possível de verificação humana. Qualquer fix em fluxo de preenchimento/geração de dados precisa ser auto-suficiente, nunca depender de alguém checar.

## 2. Causa raiz (achada por leitura de código)

`SGO_RelCal_ConteudoModulo.js` usa uma função auxiliar de "preenche só se vazio" (`preencherSeVazio`) pra popular campos a partir do certificado detectado — legítima para instrumentos multi-peça (ex.: Centrífuga Refrigerada, 3 certificados de peças diferentes do MESMO instrumento), mas sem nenhum reset entre relatórios DIFERENTES na mesma sessão (SPA, sem reload de página). Resultado: dados antigos ficavam presos silenciosamente, bloqueando a nova detecção pra sempre — sem erro, sem aviso.

## 3. Correção aplicada

- Nova função `tplRelCal_prepararProximoRelatorio_()`: limpa todos os campos derivados de certificado e reconstrói os slots de certificado/foto, chamada automaticamente após CADA geração de relatório bem-sucedida.
- Variáveis "congeladas" (`RELCAL_ULTIMO_CLIENTE`/`RELCAL_ULTIMO_TAG`/`RELCAL_ULTIMO_INSTRUMENTO_LABEL`) capturadas no momento exato da geração, para o botão "Salvar no Drive" continuar funcionando corretamente mesmo depois do formulário já ter sido limpo.
- Manual do Operador do módulo atualizado (callout de limpeza automática + linha nova na tabela de erros comuns).

**Verificado por simulação Node (`vm` sandbox)**: 3 relatórios em sequência, sem vazamento de dados entre eles; "Salvar no Drive" usa metadado correto mesmo com tela já limpa.

**Verificação adicional pedida pelo usuário**: instrumento Centrífuga Refrigerada (3 certificados — Temporizador, Indicador de Rotação, Sensor de Temperatura). Simulação dedicada confirmou: dentro do mesmo relatório, certificados 2 e 3 continuam sem sobrescrever campos já preenchidos pelo 1º (comportamento intencional preservado); após gerar, os 3 slots são reconstruídos juntos (não só 1); relatório seguinte não herda nada do anterior. Nenhum ajuste adicional foi necessário.

## 4. Auditoria dos outros módulos (o mesmo bug em outro lugar?)

Pedido do usuário: conferir módulo por módulo se o mesmo padrão (`preencherSeVazio` sem reset entre submissões) existe em outro lugar. Resultado da auditoria (grep real no código, não suposição): **só o RelCal tinha o bug.**

- **Declaração de Execução**: não lê certificado nenhum pra pré-popular campo (tudo manual ou via CNPJ, que sempre sobrescreve). Sem risco.
- **QI/QO/QD (Relatório de Qualificação)**: lê certificados só pra IA escrever texto do relatório, nunca pra pré-popular formulário. Sem risco.
- **Planejamento CME**: não lê nenhum certificado real (é calculadora). Sem risco.

Nenhuma correção adicional necessária nesses 3 além do item 5 abaixo.

## 5. Log Operacional padronizado

Usuário pediu que o painel "Console Operacional" (já existente em Autoclave/Lavadora/Cadeia de Frio/Estufa) fosse adicionado em todos os módulos nativos que não tinham. Adicionado em 4 arquivos: `SGO_RelCal_ConteudoModulo.js`, `SGO_DeclaracaoExec_ConteudoModulo.js`, `SGO_DeclaracaoExecQIQO_ConteudoModulo.js`, `SGO_PlanCME_ConteudoModulo.js` — mesmo padrão visual/funcional dos módulos de referência (`.terminal-wrap`/`.terminal-header`/`.terminal`, linhas coloridas por `.success`/`.error`/`.warn`), instrumentado em inicialização, busca de CNPJ, geração de rascunho/relatório/cálculo, geração de documento final e salvar no Drive.

**Achado colateral corrigido**: ao procurar texto exato pra instrumentar o Planejamento CME, descobri que uma renomeação mecânica de função de uma sessão anterior (`\bcalcular\b`/`\brefinar\b`) tinha corrompido 2 mensagens de erro visíveis ao usuário (nome técnico de função vazando pro texto em português do alerta). Corrigido no arquivo real E no script de build reaproveitável (pra não reintroduzir o bug numa próxima regeneração).

## 6. Estado de deployment (produção) confirmado em 2026-07-29

| Projeto | Deployment (produção) | Versão | O que tem |
|---|---|---|---|
| Portal (`portal_sgo_versao_cnpj_db`) | `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA` | **v83** | Correção crítica RelCal (fim do vazamento de dados) + Log Operacional em RelCal/Declaração de Execução/QI-QO-QD/Planejamento CME + correção das 2 mensagens corrompidas do PlanCME |

`clasp push` (DEV/@HEAD) já estava em dia antes deste deploy (as edições da sessão já tinham sido enviadas ao DEV anteriormente). `clasp deploy -i <id existente>` atualizou o MESMO deployment de produção (@82 → @83) — URL `/exec` não mudou.

**Standalone `metrolabs_planejamento_cme`**: NÃO recebeu nenhuma alteração desta sessão (Log Operacional é exclusivo da versão nativa do Portal) — nenhum push/deploy necessário nesse projeto.

## 7. Pendências / decisões em aberto (NÃO resolvidas)

1. **Relatórios JÁ GERADOS com o bug**: existe a possibilidade real de que relatórios reais já entregues a clientes (antes da correção, produção antiga) tenham dados incorretos herdados de um relatório anterior (número de certificado, cliente, TAG, etc.), especialmente os gerados em sequência rápida na mesma sessão. **Ainda não investigado.** Próximo passo, se o usuário quiser: auditar os documentos salvos no Drive (via `RelCal_apiListarDocumentosSalvos` / pasta de documentos do RelCal) pra identificar candidatos a revisão manual.
2. Nenhuma outra pendência de código aberta neste momento — RelCal, Log Operacional (4 módulos) e Centrífuga Refrigerada estão testados (harness + simulações Node) e publicados em produção (v83).

## 8. Scripts reaproveitáveis criados nesta sessão (scratchpad, não fazem parte do repo)

Ficam em `C:\Users\venda\AppData\Local\Temp\claude\...\scratchpad\` (pasta de sessão, pode não sobreviver entre sessões diferentes do Claude Code — se sumir, recriar é rápido a partir da lógica descrita aqui):
- `patch_relcal_stale_data.js` / `patch_relcal_manual_text.js` / `patch_relcal_log_operacional.js` / `patch_declexec_log_operacional.js` / `patch_qiqo_log_operacional.js` / `patch_plancme_log_operacional.js` — patches programáticos (`vm.runInContext` + substring exato) aplicados aos 4 `SGO_*_ConteudoModulo.js`.
- `simulate_relcal_3_relatorios.js` — simulação de 3 relatórios em sequência (prova a correção do vazamento).
- `simulate_relcal_centrifuga_refrigerada.js` — simulação dedicada da Centrífuga Refrigerada (3 certificados/peça).
- `build_plancme_conteudomodulo.js` — script mestre de rebuild do `SGO_PlanCME_ConteudoModulo.js` a partir do standalone (já inclui a correção do bug de string corrompida).
