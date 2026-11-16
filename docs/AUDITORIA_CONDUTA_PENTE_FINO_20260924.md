# AUDITORIA PENTE FINO — MÓDULO CONDUTA (Portal SGO+)

**Data:** 2026-09-24 · **Gatilho:** incidente relatado por Matheus Godoi (data crua na tela + homologação impossível).
**Método:** 4 auditorias independentes e paralelas (tipos/datas · permissões/máquina de estados · matemática do ICO e bônus · interface e falhas silenciosas), todas somente-leitura, seguidas de verificação minha linha a linha nos achados que sustentam decisão.

> **O que está em jogo neste módulo:** ele decide **dinheiro** (bônus coletivo de R$300/pessoa e incentivo de R$300/missão) e **reputação de pessoas** (processo disciplinar com defesa e recurso). Erro aqui não é tela feia: é salário e é justiça.

---

## 1. JÁ CORRIGIDO E PUBLICADO

| Versão | O quê |
|---|---|
| **v283** | Competência virando Date no Sheets → 21 comparações nunca batiam → ocorrência não entrava no contador/placar/farol/fechamento. Normalização na leitura + colunas forçadas a texto + prazos tolerantes + relatório semanal deixando de perder o último dia do período. |
| **v283** | Data crua `2026-09-24T00:00:00` na tela; agora dd/mm/aaaa na aba Ocorrências. |
| **v283** | Botão "Homologar" deixou de aparecer para quem registrou a ocorrência (Regra 12), com o motivo escrito no lugar. |
| **v284** | **Regressão introduzida por mim na v283:** a chave do relatório SEMANAL é um intervalo (`2026-09-06_2026-09-12`) e estava sendo encurtada para `2026-09`, fazendo cada semana sobrescrever a anterior. Corrigida com comparação que só normaliza competência de verdade. |

---

## 2. O QUE PRECISA DE DECISÃO SUA (não mexo sem sua palavra)

Cada item aqui muda **regra de negócio**, não implementação.

### D1 — A Regra 12 protege o acusador, não o acusado
`SGO_Conduta_Ocorrencias.js:401` e `:470` comparam só `FISCAL_ID`. Se a ocorrência for **contra um gestor**, ele pode rejeitá-la ou, via contestar→julgar, anulá-la sozinho — ele não é o fiscal, então a regra não o alcança.
**Decisão:** estender a Regra 12 ao `COLABORADOR_ID` (ninguém decide sobre processo em que é parte)? E impedir que quem homologou julgue o próprio recurso?

### D2 — Fechar a competência do mês em curso
Não há checagem de que o mês acabou. O botão da tela passa exatamente o **mês corrente**, e o fechamento é irreversível (`CONGELADO`). Fechar dia 02 congela o bônus com 1 dia de dados.
O parâmetro `PRAZO_FECHAMENTO_DIAS_UTEIS: '7'` existe no seed e **nunca é lido por nenhum arquivo**.
**Decisão:** bloquear fechamento de competência não encerrada e passar a usar esse parâmetro?

### D3 — A promoção HOMOLOGADA → FIRME depende de alguém lembrar de clicar
Só acontece dentro de `Conduta_processarPrazosVencidos_`, que roda por (a) checagem diária automática ou (b) botão manual. As três APIs da checagem automática existem e **nenhuma tela as chama** — só ligando à mão no editor. E o fechamento apura **sem** processar prazos antes.
Consequência: ocorrências ficam em HOMOLOGADA, D conta zero, farol verde, bônus pago.
**Decisão:** (i) ligar a checagem diária, (ii) chamar `processarPrazosVencidos_` no início do fechamento, (iii) mostrar na tela se o automático está ligado. **Pergunta factual para você:** alguém já rodou `Conduta_apiAtivarChecagemDiariaPrazos` no editor?

### D4 — Ausência tira do divisor no tudo-ou-nada
1 dia de folga remove a pessoa inteira do divisor `n` do mês, mas os deméritos dela continuam no numerador. Três pessoas com 1 dia de folga cada podem derrubar o farol da equipe inteira.
**Decisão:** manter binário, exigir ausência mínima (ex.: metade do mês), ou proporcional?

### D5 — Duas fontes de verdade para o pagamento das missões
O **fechamento** zera o incentivo de quem tem GG própria; o **relatório de missões** — que é o documento que o Financeiro confere e a Diretoria assina — não olha GG própria, não respeita modo sombra e usa outro filtro de bloqueio.
**Decisão:** o relatório deve passar a ler o resultado do fechamento em vez de recalcular por conta própria?

### D6 — Reincidência quase nunca dispara dentro do mês
O nível é congelado no registro, e a âncora precisa estar FIRME — o que leva ~6 dias úteis. Duas faltas iguais na mesma semana entram ambas como leves.
**Decisão:** avaliar reincidência na promoção a FIRME em vez de no registro?

### D7 — Parâmetros: `Number(valor) || default`
Gravar `0` ou `450,00` na planilha é silenciosamente trocado pelo default. Suspender o bônus com `VALOR_BONUS_COLETIVO = 0` continuaria pagando R$300.
**Decisão:** tratar vírgula decimal e distinguir "vazio" de "zero" (é o padrão pt-BR já registrado no projeto).

### D8 — Colunas configuráveis que o motor ignora
`PESO_ICO` e `CANCELA_BONUS` (catálogo) e `SEDE_ENDERECO` são semeados e **nunca lidos**. Hoje o seed concorda com a tabela fixa no código, então não há divergência — mas quem editar o peso na planilha não muda nada e não recebe aviso.
**Decisão:** passar a ler do catálogo, ou remover as colunas para não enganar?

---

## 3. O QUE EU CORRIJO SEM PRECISAR DE DECISÃO (aguardando seu ok para o lote)

Bugs claros, sem escolha de regra envolvida.

### Perda de dado e de evidência
1. **Foto some sem avisar** — o compressor devolve `null` em erro (HEIC, arquivo corrompido) e o código segue e grava a ocorrência **sem foto**, modal fecha, nenhum aviso. A evidência do fato que vai custar dinheiro a alguém desaparece em silêncio. Desktop e mobile.
2. **Foto, contestação e recurso nunca são exibidos** — são gravados e nenhuma tela os lê. Quem julga uma contestação **decide sem poder ler a defesa**.
3. **O gestor homologa às cegas** — a tabela não mostra de quem é a ocorrência nem o que aconteceu (só a sigla `M03`).

### Mobile (é a tela real da equipe de campo — abaixo de 900px o Portal troca de UI)
4. **"Reconhecer colega" é impossível pelo celular** — a tela não tem o campo de texto que o servidor exige; o elogio nunca entra. Funciona no desktop, por isso ninguém viu.
5. **Sem trava de duplo toque** — em 3G, tocar duas vezes grava **duas ocorrências** contra a mesma pessoa, com o dobro do demérito. O desktop está protegido; o celular não.
6. **Sem fluxo de defesa** — contestar e recorrer só existem no desktop, mas o prazo de 3 dias corre para o técnico, que só tem celular.

### Permissões na tela (mesma correção de hoje, não propagada)
7. **Julgar / Contestar / Recorrer** ainda são oferecidos a quem não pode — inclusive ao próprio fiscal, uma linha abaixo do comentário que documenta a correção do Homologar. O servidor já manda `SOU_O_FISCAL` e `PODE_HOMOLOGAR`; basta usar.
8. **Nove botões de gestão visíveis para toda a equipe** — incluindo "Fechar esta competência" (irreversível, na aba que abre por padrão) e "Remover" ao lado das férias de um colega.
9. **Prazos nunca aparecem** — o servidor manda `PRAZO_CONTESTACAO`/`PRAZO_RECURSO` e a tela não mostra nem desabilita o botão vencido.
10. **"Processar prazos vencidos agora" sem confirmação** — converte pendências em FIRME e apaga direito de contestação, num clique, sem `confirm()`. Todos os outros botões destrutivos têm.

### Cálculo silencioso
11. **`NIVEL` fora da tabela zera a ocorrência** — `PESOS['g']` (minúsculo) é `undefined` → peso 0 → a ocorrência conta nada e nem dispara o gatilho de gravíssima. Falta `safeUpper` e um erro explícito.
12. **Catálogo com código apagado derruba a home inteira** — `Conduta_buscarTipoOcorrencia_` lança exceção dentro do cálculo do farol; o módulo fica indisponível para todos.
13. **Duas missões idênticas no mesmo dia pagam duas vezes** — sem deduplicação.

### Formato e apresentação
14. Datas ISO em Missões, Ausências, Positivos, Fechamentos e Relatórios (a correção de hoje pegou só a aba Ocorrências).
15. `CondutaRG_br_` imprime **`18T00:00:00/09/2026`** no documento que vai ao Financeiro.
16. Frase do farol na home mostra `2026-09-24T00:00:00`.
17. Peso 0 (GG — a infração mais grave) aparece em branco: `GG / `.
18. ICO aparece três vezes no mesmo cartão em três formatos (93 · 92.5 · 70–84,9).
19. `escapeHtml_` esquecido no nome do colega em 3 pontos (Missões e Ausências).
20. Missões/Ausências mostram ID de banco (`u_7f3a91c4`) em vez do nome quando é a primeira aba aberta.
21. Popup bloqueado = clique sem efeito, sem aviso (a função irmã avisa).
22. Colunas de data ainda desprotegidas no Sheets: `FECHADO_EM`, `GERADO_EM`, `PERIODO_INICIO/FIM` e 6 colunas `*_EM` de ocorrência.

---

## 4. VERIFICADO E CORRETO (vale registrar)

- **O motor de cálculo está matematicamente certo**: fórmula do ICO, ordem das operações, arredondamento, clamp, fronteira da janela de reincidência (90 dias inclusivo) e a separação "GG tem peso 0 mas aciona o farol por gatilho próprio" — tudo conferido com números. Os erros estão na camada que **alimenta** o motor.
- **Nenhum payload sobrescreve campo de servidor** (sem mass assignment) — verificado em duas camadas.
- **Estados terminais são terminais**: não dá para homologar duas vezes, contestar após julgamento, recorrer de anulada ou refechar competência.
- **Prazos usam o relógio do servidor**, não o do cliente; registro retroativo está fechado.
- **XSS de texto livre**: limpo — justificativa, contestação, reconhecimento e destino são escapados, inclusive nos relatórios A4.
- **Relatório mensal e semanal são anônimos por construção**; o de missões, que tem nomes, está corretamente restrito a admin.
- **Snapshot de km/qualificação** protege missão já paga de mudança na tabela de distâncias.
- **Desktop tem trava de duplo clique e overlay** em todas as ações que gravam.

---

## 5. RISCO DE PROCESSO (fora do código)

A pasta `apps-script-imports/` está inteira no `.gitignore`: **186 dos 192 arquivos do Portal não têm versionamento em git**. Hoje o rollback depende só do histórico do Apps Script. Num módulo que decide pagamento, isso merece decisão própria.

---

## 6. ORDEM SUGERIDA

1. Responder D3 (a checagem diária está ligada?) — é o que pode estar errando dinheiro agora.
2. Lote de correções da seção 3 que envolvem **perda de dado**: foto silenciosa, duplo toque no celular, "Reconhecer colega" morto.
3. Permissões na tela (itens 7 a 10) — mesma correção de hoje, propagada.
4. Decisões D1, D2, D4, D5 — regra de negócio, com você.
5. Formato e apresentação (14 a 22) — lote único, baixo risco.

---

## 7. STATUS AO FIM DO DIA 24/09/2026

Verificado puxando a versão publicada de volta: **as 10 correções estão no ar (v288)**.

| Versão | Entregue |
|---|---|
| 283 | competência/contador, data na tela, botão Homologar respeitando a Regra 12 |
| 284 | correção da regressão que EU introduzi (chave do relatório semanal) |
| 285 | foto que sumia em silêncio, duplo toque no celular, elogio impossível no mobile |
| 286 | Julgar/Contestar/Recorrer com permissão e prazo, 5 botões de gestão escondidos, confirmação no processar prazos |
| 287 | automação de prazos ligável pela tela, fechamento aplica prazos antes de apurar, NIVEL inválido recusado, catálogo apagado não derruba a home, datas pt-BR, escape de nomes |
| 288 | defesa pelo celular (contestar/recorrer com prazo), homologar/julgar mostrando envolvido, descrição, foto e o texto da defesa |

Manuais entregues: `MANUAL_CONDUTA_COLABORADOR.md` e `MANUAL_CONDUTA_FISCAL.md`.

### O que continua em aberto

1. **A automação de prazos precisa ser LIGADA por um gestor no Portal** — ação autenticada no navegador, não dá para fazer por código daqui. Até lá, nada vira FIRME sozinho.
2. **Nada foi testado rodando de verdade.** Validei sintaxe, lógica, o JS emitido pelo template e a presença do código publicado. Falta a conferência humana na tela.
3. **Decisões D1–D8** (seção 2), sendo a mais urgente a **D2**: impedir o fechamento de um mês em curso.
4. **Correções menores ainda não feitas:** missão duplicada paga duas vezes; ausência tudo-ou-nada no divisor; `Number(param) || default` engolindo 0 e vírgula decimal; relatório de missões com regra própria (diverge do fechamento); ICO em três formatos no mesmo cartão; popup bloqueado sem aviso; ID de banco em vez de nome em Missões/Ausências quando é a primeira aba aberta.
5. **Sem trilha de auditoria:** contestação e recurso não gravam quem os fez.
6. **`apps-script-imports/` fora do git** — sem versionamento para 186 dos 192 arquivos do Portal.
