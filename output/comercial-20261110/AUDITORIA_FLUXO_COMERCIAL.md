# Auditoria do fluxo do Comercial (SGO+) — 10/11/2026

Escopo: somente leitura do código de produção baixado em
`output/comercial-20261110/base`. Nenhum arquivo do código foi alterado. Todas as
referências `arquivo:linha` abaixo são relativas a `base/`. Nenhuma função foi
inventada: o que está marcado como **proposta** ainda não existe.

Arquivos lidos com atenção: `legado/SGO_Comercial_Oportunidades.js`,
`legado/SGO_Comercial_Propostas.js`, `legado/SGO_Comercial_Config.js`,
`legado/SGO_Comercial_Painel.js`, `legado/SGO_Comercial_Quadro.js` (início),
`legado/SGO_Comercial_Gestora.js` (regras de propostas), `legado/SGO_Comercial_Documento.js`
(assinaturas), `legado/SGO_Comercial_Contatos.js` (lista), `legado/JS_Comercial.html` (ficha
da oportunidade, proposta, catálogo, quadro), `legado/SGO_Ajuda_Comercial.js`,
`legado/SGO_Atividades.js` (criação), `legado/SGO_Avisos_Matriz.js` e
`legado/SGO_Avisos_Gestao.js` (trechos), `legado/SGO_Assistencia_Aceite.js` (modelo de
link e confirmação), `src/servidor.ts`, `src/servicos/orcamentoPublico.ts`,
`src/publico/orcamento/app.js`, `src/compat/basicos.ts` (MailApp).

---

## 1. Mapa do fluxo atual

### 1.1 Entidades e onde ficam

| Entidade | Tabela | Observação |
|---|---|---|
| Oportunidade | `COM_OPORTUNIDADES` (`SGO_Comercial_Config.js:63-71`) | `SITUACAO` = ABERTA, GANHA, PERDIDA (`Config.js:136`). Não existe EXCLUIDA nem CANCELADA. |
| Proposta | `COM_PROPOSTAS` (`Config.js:93-112`) | `SITUACAO` = RASCUNHO, AGUARDANDO_APROVACAO, PRONTA, ENVIADA, APROVADA, RECUSADA, VENCIDA, CANCELADA, SUBSTITUIDA (`Config.js:137-139`) e EXCLUIDA (lógica, `Propostas.js:1295`). |
| Assinatura eletrônica da proposta | **Não está em tabela.** Fica em `PropertiesService` nas chaves `COM_ASS_RESP_<idProposta>` e `COM_ASS_LINK_<hash>` (`Propostas.js:992-1003`, `1013-1026`, `1100`). | Nenhuma coluna de COM_PROPOSTAS registra assinatura, link, e-mail esperado ou quem assinou. |
| Contato do cliente | `CAD_CONTATOS` (`Config.js:124-125`) | Cadastro único, com e-mail. |
| Contato registrado (interação) | `COM_CONTATOS_REGISTRO` | Ligação, WhatsApp, e-mail etc. |
| Atividade | Minhas atividades (`SGO_Atividades.js`) | A oportunidade guarda **um** `ATIVIDADE_ID` (a próxima ação). A proposta guarda `RETORNO_ATIVIDADE_ID` e `VENCIMENTO_ATIVIDADE_ID`. |
| Catálogo | `COM_PRODUTOS` | Item “excluído” = arquivado (`ATIVO = NAO`). |
| Histórico | `COM_HISTORICO` | Trilha por entidade (OPORTUNIDADE, PROPOSTA, PRODUTO). |
| Avisos internos | `COM_AVISOS` | Sistema na hora; e-mail agrupado só no expediente. |

### 1.2 Oportunidade — transições reais

```
            ComOpo_salvar_ (Oportunidades.js:190-236)
   (nada) ───────────────────────────────────────────► ABERTA (etapa 1 do funil, cria atividade de próxima ação)
   ABERTA ── ComOpo_moverEtapa_ (347-387) ─────────────► ABERTA (outra etapa; critérios em ComOpo_criteriosMudanca_ 273-322)
   ABERTA ── ComP_aoEnviar_ (Propostas.js:1106-1137) ──► ABERTA, etapa de 60% (automático no envio da proposta)
   ABERTA ── ComOpo_ganhar_ (450-467) ─────────────────► GANHA  (botão “Marcar como ganha”; NÃO exige proposta nem aceite)
   ABERTA ── ComP_registrarResposta_ APROVADA (Propostas.js:1384-1389) ► GANHA (com o arquivo do aceite)
   ABERTA ── ComOpo_perder_ (470-508) ─────────────────► PERDIDA (cancela propostas não respondidas)
   GANHA/PERDIDA ── ComOpo_pedirReabertura_ (538-550) ─► mesma situação + REABERTURA_PEDIDA_EM
   GANHA/PERDIDA ── ComOpo_reabrir_ (553-586, gestão) ─► ABERTA
   (não existe) exclusão / cancelamento de oportunidade
```

Observações: a etapa nunca vai sozinha para 100%. `ComOpo_ganhar_` e
`ComP_registrarResposta_` mudam só `SITUACAO`/`GANHA_EM`; a coluna `ETAPA` fica onde estava.
`GANHA_EM` guarda data e hora (`Com_agora_`), mas a tela mostra só o dia
(`ComOpo_paraTela_`, `Oportunidades.js:79`, `Com_brDia_`).

### 1.3 Proposta — transições reais

```
ComP_nova_ (691-711) ──► RASCUNHO
RASCUNHO ── ComP_concluir_ (812-862) ──► PRONTA | AGUARDANDO_APROVACAO
AGUARDANDO_APROVACAO ── ComP_decidirDesconto_ (865-892) ──► PRONTA | RASCUNHO
PRONTA/AGUARDANDO ── ComP_voltarRascunho_ (896-912) ──► RASCUNHO (bloqueia só se o cliente já assinou)
PRONTA ── ComP_gerarDocumento_ (936-975) ──► PRONTA (PDF_ID, MARCA_CONTEUDO)
PRONTA ── ComP_assinarResponsavel_ (978-1007) ──► PRONTA (+ COM_ASS_RESP_ em Properties)
PRONTA/ENVIADA ── ComP_linkAssinatura_ (1009-1032) ──► SEM MUDANÇA (só Properties + e-mail ao cliente)
PRONTA/ENVIADA ── ComP_assinaturaResponder_ (1070-1103, link público) ──► SEM MUDANÇA (gera PDF assinado, grava em Properties)
PRONTA ── ComP_sincronizarEnvios_ (1143-1165) / ComP_marcarEnviada_ (1168-1179) ──► ENVIADA (via ComP_aoEnviar_)
ENVIADA ── ComP_rotinaValidade_ (1555-1581) ──► VENCIDA
ENVIADA/VENCIDA ── ComP_registrarResposta_ (1329-1408) ──► APROVADA | RECUSADA
ENVIADA/RECUSADA/VENCIDA/PRONTA/AGUARDANDO ── ComP_novaRevisao_ (1182-1211) ──► SUBSTITUIDA (+ nova RASCUNHO)
RASCUNHO..VENCIDA ── ComP_cancelar_ (1213-1230) ──► CANCELADA
RASCUNHO/AGUARDANDO/PRONTA/CANCELADA nunca enviada ── ComP_excluir_ (1284-1316) ──► EXCLUIDA
APROVADA ── ComP_passarSetores_ (1471-1516) ──► PEDIDO_SITUACAO EM_ANDAMENTO ── ComP_acompanharPassagens_ (1528-1552) ──► CONCLUIDO
```

Ponto central: **a assinatura pelo link vive fora da máquina de estados**. Assinar pela
Metrolab, enviar o link e o cliente assinar não mudam `SITUACAO` da proposta nem da
oportunidade, não gravam histórico (exceto a assinatura da Metrolab), não registram
contato, não avisam ninguém.

### 1.4 Atividades

- Criação da próxima ação: `ComOpo_criarProxima_` (`Oportunidades.js:170-181`), chamada em
  criar, registrar contato, mudar etapa (quando precisa) e reabrir.
- Retorno da proposta: `ComP_aoEnviar_` (`Propostas.js:1119-1126`) conclui a atividade
  atual e cria “Retorno sobre a proposta”, que vira o `ATIVIDADE_ID` da oportunidade.
- Aviso de vencimento: `ComP_rotinaValidade_` (`Propostas.js:1570-1577`) cria
  “Proposta vence em …” em `VENCIMENTO_ATIVIDADE_ID` (fora do `ATIVIDADE_ID`).
- Atividade da gestão: `ComOpo_criarAtividadeGestao_` (`Oportunidades.js:393-408`),
  botão “Criar atividade para o comercial” (`JS_Comercial.html:825`, `849-854`).
- Passagem aos setores: `ComP_passarSetores_` (`Propostas.js:1501-1504`).

### 1.5 Quadro (Kanban)

`SGO_Comercial_Quadro.js`. Soltar o cartão chama `ComOpo_criteriosTela_` e depois
`ComOpo_moverEtapa_`. Soltar em “Ganha” abre `Comercial_kanbanGanhar_`
(`JS_Comercial.html:3344-3375`), que **exige proposta enviada e arquivo do aceite**
(chama `respostaCliente`). A ficha da oportunidade, porém, tem “Marcar como ganha”
(`JS_Comercial.html:820`, `887`) que chama `ComOpo_ganhar_` **sem nenhuma exigência**.

### 1.6 Catálogo

`ComP_salvarProduto_` (`Propostas.js:166-261`) já impede nome ativo repetido
(`205-211`) e código repetido (`182-183`). Filtro “Possíveis duplicados”
(`Propostas.js:84-87`, `102`, `134-139`). “Excluir repetido”
(`ComP_excluirDuplicado_`, `Propostas.js:301-306`) apenas arquiva via
`ComP_arquivarProduto_` (`308-323`). Junção de repetidos existe em Cadastros > Correções
de cadastro (`JUNTADO_COM_ID`, `Propostas.js:317-318`).

---

## 2. Comunicações (e-mail e WhatsApp)

O Comercial **não envia WhatsApp diretamente** (comentário e regra em
`Config.js:871-874`: “nunca WhatsApp”). Canais existentes:

| # | Onde | Quando | Destinatário | Assunto / conteúdo | Cópia |
|---|---|---|---|---|---|
| 1 | `ComP_linkAssinatura_` `Propostas.js:1028-1029` (`MailApp.sendEmail` direto, fila SMTP) | Vendedor toca “Gerar link para o cliente” | E-mail **digitado à mão** num `window.prompt` vazio (`JS_Comercial.html:1053`) | Assunto `Assinatura da proposta PROP-…  rev.NN`; corpo: uma linha `Confira e assine a proposta no SGO: <url>` | Nenhuma. Sem `name`, `replyTo`, `htmlBody` |
| 2 | `Com_avisar_` + `Com_enviarEmailsPendentes_` (`Config.js:874-911`), via `SGO_notificar_` | Agrupado por pessoa, **só no expediente** | Pessoa interna | Título do aviso + “Veja no SGO+, em Comercial.” | — |
| 2a | `OPORTUNIDADE_RECEBIDA` (`Oportunidades.js:255`) | Gestão troca o responsável | Novo responsável (e-mail) | — | O antigo responsável não é avisado |
| 2b | `APOIO_GESTAO` (`Oportunidades.js:440-443`) | Vendedor pede apoio | Gestão (e-mail) | — | — |
| 2c | `REABERTA` (`Oportunidades.js:583`) | Gestão reabre | Responsável (e-mail) | — | — |
| 2d | `MARGEM_DIRETORIA` (`Propostas.js:851-853`) | Margem abaixo da mínima | Diretoria (e-mail) | — | — |
| 2e | `RESPOSTA_APROVADA/RECUSADA` (`Propostas.js:1400-1404`) | Resposta registrada à mão | Gestão + responsável (e-mail) | — | — |
| 2f | Só no sistema (sem e-mail): `GANHA` (`Oportunidades.js:462`), `REABERTURA_RECUSADA` (`567`), `PRECO_PEDIDO` (`Propostas.js:154`), `PRECO_APROVADO/NEGADO` (`282`), `DESCONTO_APROVADO/NEGADO` (`885`), `SETOR_CONCLUIU` (`1539`) | | | | |
| 3 | `SGO_avisoGestaoIrreversivel_` (GI01) via `Com_depois_` | Perda (`Oportunidades.js:503`), recusa de reabertura (`569`), desconto negado (`Propostas.js:888`), proposta cancelada (`1226`), proposta excluída (`1300`) | Gestor da área + Diretoria | Sistema + e-mail; para quem é da gestão, fila de avisos da gestão (`SGO_Avisos_Gestao.js:570-610`), que pode sair por WhatsApp da gestão | — |
| 4 | `Atividades_apiCriar` (`SGO_Atividades.js:834-836`) | Atividade lançada para outra pessoa (gestão → vendedor, passagem aos setores) | Responsável da atividade | “Nova atividade para você” (e-mail) | — |
| 5 | “Enviar documento” (`SGO_EnviarDoc`, `JS_Comercial.html:1107`) | Vendedor envia o PDF | Cliente (e-mail ou WhatsApp, pela caixa do vendedor) | Registrado em `DOC_ENVIOS`; sincronizado em `ComP_sincronizarEnvios_` | — |
| 6 | Resumo diário (`SGO_Avisos_Matriz.js:1293-1306`) | Diário | Responsável | Pendência “Assinar pela Metrolab / Envie o link / Acompanhe a assinatura” | — |

**Onde deveria haver aviso e não há:**

1. Cliente assinou pelo link (`ComP_assinaturaResponder_`, `Propostas.js:1070-1103`):
   nenhum aviso ao vendedor, à gestão nem ao cliente.
2. A página pública promete “A confirmação da resposta vai para este e-mail”
   (`src/publico/orcamento/app.js:120`), mas no Comercial nada é enviado. A Assistência
   técnica faz isso (`SGO_Assistencia_Aceite.js:337-367`, com anexo, `replyTo` e HTML).
3. Link gerado/reenviado: sem histórico, sem `DOC_ENVIOS`, sem contato registrado, sem
   ver para qual e-mail foi.
4. Proposta vencida pela rotina (`Propostas.js:1561-1566`): só histórico, sem aviso.
5. Oportunidade ganha por `ComOpo_ganhar_`: gestão avisada só no sistema, sem e-mail.
6. Troca de responsável: o vendedor anterior não é avisado.
7. Os avisos internos com e-mail só saem no expediente e agrupados (`Config.js:887`):
   inadequado para “cliente assinou agora”.

---

## 3. Defeitos encontrados

Numerados por gravidade. Cada um com cenário concreto.

### ALTA

**D1. Assinatura do cliente pelo link não muda nada no sistema.**
`Propostas.js:1070-1103`. Depois de gerar o PDF assinado, a função só grava
`COM_ASS_RESP_<id>` em Properties (`1091-1100`). Não muda a proposta para APROVADA, não
grava `ACEITE_ARQUIVO_*`, `RESPOSTA_EM`, `PEDIDO_SITUACAO`, não conclui a atividade de
retorno, não marca a oportunidade como GANHA, não grava `COM_HISTORICO` nem
`COM_CONTATOS_REGISTRO`, não alimenta o banco de preços (`ComBP_registrarProposta_`), não
avisa ninguém.
Cenário: cliente assina às 10h; às 10h05 a proposta continua “Pronta para enviar” ou
“Enviada ao cliente”; o vendedor só descobre se abrir a proposta e ver o botão “PDF com as
duas assinaturas” (`JS_Comercial.html:1016`).

**D2. Proposta assinada pelo link continua sendo tratada como pendente, vence, pode ser
cancelada, substituída e até excluída.**
- `ComP_rotinaValidade_` (`Propostas.js:1557-1567`) marca VENCIDA a ENVIADA assinada.
- `ComP_cancelar_` (`1213-1230`) e `ComP_novaRevisao_` (`1182-1211`) não conferem
  assinatura; a UI mostra os dois botões (`JS_Comercial.html:1008-1009`).
- `ComOpo_perder_` cancela propostas ENVIADA/PRONTA (`Oportunidades.js:488-496`) mesmo
  assinadas.
- `ComP_podeExcluir_`/`ComP_foiEnviada_` (`Propostas.js:1240-1265`): o link de assinatura
  não grava `ENVIADA_EM` nem `DOC_ENVIOS`; uma proposta PRONTA que o cliente **assinou**
  é considerada “nunca foi ao cliente” e pode ser **excluída**.
- Gestora segue sugerindo “pronta e ainda não enviada: toque em Enviar ao cliente” ou
  “enviada há N dias sem resposta” (`SGO_Comercial_Gestora.js:134-147`).
- Entrada do Comercial conta como rascunho/aguardando (`Painel.js:327-341`).
- Painel: proposta assinada não conta como enviada nem aprovada (`Painel.js:63-68`).
Cenário: cliente assina proposta PRONTA; o vendedor, sem saber, toca “Excluir proposta”
com o motivo “duplicada”; o documento assinado pelo cliente some das listas.

**D3. Depois de assinada pelo link, a aprovação manual exige passo artificial.**
`ComP_registrarResposta_` aceita só ENVIADA ou VENCIDA (`Propostas.js:1349-1350`); o
link funciona em PRONTA (`1016`, `1042`) e a UI mostra os botões de assinar e de link só em
PRONTA (`JS_Comercial.html:1006`). Assim o caminho “assinar → link → cliente assina” deixa a
proposta em PRONTA e o vendedor precisa “Entregue por outro meio” (texto inventado) para
poder registrar a resposta, além de baixar o PDF assinado e reenviá-lo como anexo
(o PDF assinado não é usado como aceite).

**D4. Gerar o link de novo troca o e-mail exigido e invalida o anterior, sem aviso; o
e-mail é digitado livre.**
`Propostas.js:1019-1026`: `a.clienteEmailEsperado` é sobrescrito, o hash anterior é
apagado (`1023`) e o novo link vai ao e-mail informado. A tela usa `window.prompt` vazio
(`JS_Comercial.html:1053`), sem sugerir o e-mail do contato da proposta e sem mostrar a
quem o último link foi. A tela mostra o link pronto para copiar (`1056-1059`).
Cenário real explicado: o vendedor gerou o link de novo com o e-mail de outro cliente
(digitação ou preenchimento automático do navegador). O link foi para esse terceiro, e o
e-mail exigido passou a ser o dele. O vendedor então copiou o link da janela e mandou ao
cliente certo (WhatsApp ou e-mail próprio). O cliente certo abriu, digitou o próprio
e-mail e recebeu “Informe o e-mail que recebeu o link” (`Propostas.js:1079`). Pior: o
**terceiro** que recebeu o link podia assinar a proposta de outro cliente, porque o
e-mail dele era o esperado. Vazamento de proposta (valores, escopo) para outra empresa.

**D5. Troca de responsável da oportunidade não leva as propostas.**
`ComOpo_salvar_` (`Oportunidades.js:240-256`) muda `RESPONSAVEL_ID` só na oportunidade.
`ComP_podeVer_` usa `p.RESPONSAVEL_ID` (`Propostas.js:398-404`), assim como assinar
(`987`) e gerar link (`1012`). `ComP_abrirAssinatura_` exige
`a.usuarioId === p.RESPONSAVEL_ID` (`1042`).
Cenário: gestão passa OPO-2026-0040 de Ana para Bruno; Bruno vê a oportunidade mas não as
propostas; Ana não vê a oportunidade mas continua dona das propostas e recebe os avisos de
resposta (`1403`).

**D6. “Marcar como ganha” pela ficha não exige nada e deixa a proposta pendurada.**
`ComOpo_ganhar_` (`Oportunidades.js:450-467`) não exige proposta aprovada nem aceite,
enquanto o quadro exige (`JS_Comercial.html:3344-3375`) e a metodologia diz que a etapa de
100% exige aceite (`Oportunidades.js:316-319`). A proposta ENVIADA fica ENVIADA, depois
VENCIDA pela rotina, gera atividade “Proposta vence em …” (`Propostas.js:1570-1577`, sem
conferir a oportunidade), não entra em “Pedidos aprovados”, não pode ser passada aos
setores (`1477`) e o Financeiro não a vê (`402`). Painel: ganho sem aprovação, e a mesma
venda aparece em “vencidas”.

### MÉDIA

**D7. Atividade criada pela gestão fica solta da oportunidade.**
`ComOpo_criarAtividadeGestao_` (`Oportunidades.js:393-408`) não grava o id em lugar
nenhum da oportunidade; a ficha mostra só `ATIVIDADE_ID` (`603`, `615`). Ao ganhar, perder,
trocar responsável ou reabrir, essas atividades não são canceladas nem transferidas
(órfãs). O título é só o texto da ação, sem código/cliente (`402`). A docstring de
`ComOpo_registrarContato_` ficou acima da função errada (`389-392`).

**D8. Gestão comercial sem perfil de gestor em Atividades não consegue criar a atividade.**
`ComOpo_criarAtividadeGestao_` passa a sessão do gestor (`401`) e
`Atividades_apiCriar` exige `eu.gestor` para lançar para outra pessoa
(`SGO_Atividades.js:800-801`, `175-179`: ADMIN, DIRETORIA, GESTOR, RH, FINANCEIRO). Quem é
gestão comercial por estar em `metodologia.gestores` ou na Caixa
(`Config.js:789-821`) com perfil COMERCIAL recebe erro.

**D9. Atividade de vencimento órfã.** `VENCIMENTO_ATIVIDADE_ID`
(`Propostas.js:1572-1576`) só é encerrada em `ComP_marcarInvestimento_` (`1614`). Resposta
(`1370`), cancelamento (`1223`), perda (`Oportunidades.js:493`), nova revisão
(`Propostas.js:1206`), exclusão (`1302`) e ganho só encerram o retorno. Cenário: proposta
aprovada no dia 8; a atividade “Proposta vence em 10/11” continua aberta e atrasa.

**D10. E-mail do link: texto puro de uma linha, sem remetente identificável, sem
responder-para.** `Propostas.js:1028-1029`. Sem `name` (sai como “SGO+ Metrolabs” e o
endereço técnico do SMTP, `src/servicos/carteiro.ts:50`), sem `replyTo` (o cliente que
responde fala com a caixa do sistema), sem saudação, sem nome do vendedor, sem cliente,
valor, validade, sem HTML, só um link longo com fragmento hexadecimal e o pedido “assine”.
Isso é o padrão típico de phishing para filtros de spam e para o cliente. O emulador aceita
`name`, `replyTo`, `htmlBody`, `cc` e anexos (`src/compat/basicos.ts:246-250`).

**D11. Falha no envio do link já invalidou o anterior.** `Propostas.js:1022-1029`: o
hash antigo é apagado e o novo gravado antes do `MailApp.sendEmail`. Se o envio lançar, o
vendedor vê erro, o link antigo morreu e o novo não chegou.

**D12. Assinatura e link ficam só em Properties, sem trilha.** Quem assinou, CPF, IP,
navegador, e-mail esperado e o link ficam em `COM_ASS_RESP_<id>`
(`Propostas.js:1001-1003`, `1094-1100`). Só a assinatura da Metrolab gera histórico
(`1004`). Envio do link e assinatura do cliente não aparecem no histórico da proposta nem
da oportunidade. Chaves `COM_ASS_LINK_*` antigas ficam órfãs quando a assinatura da
Metrolab é refeita (`1003` sobrescreve sem apagar o link anterior).

**D13. O cliente perde acesso ao PDF assinado quando a proposta vence ou muda de
situação.** `ComP_abrirAssinatura_` (`Propostas.js:1041-1043`) exige PRONTA/ENVIADA e
validade em vigor mesmo quando `finalPdfId` existe. Cenário: assina no último dia;
no dia seguinte o link mostra “não está disponível”.

**D14. Voltar para rascunho mata o link já enviado sem avisar o cliente.**
`ComP_voltarRascunho_` (`Propostas.js:904-907`) só bloqueia se o cliente já assinou; com
link enviado e ainda não assinado, apaga `PDF_ID` e o link passa a dar “indisponível”.

**D15. Proposta enviada só pelo link não conta como enviada.** O link não chama
`ComP_aoEnviar_`: a oportunidade não vai para a etapa de proposta, não há retorno agendado,
não há contato registrado, o painel não conta envio (`Painel.js:63`) e
`ComOpo_criteriosMudanca_` recusa avançar por “proposta não enviada” (`Oportunidades.js:312-315`).

**D16. Botões que a gestão vê mas não pode usar.** `meu = responsável || gestão`
(`JS_Comercial.html:966`) mostra “Assinar pela Metrolab” e “Gerar link” para a gestão, e o
servidor recusa (`Propostas.js:987`, `1012`). Sem o vendedor, ninguém assina nem envia link.

**D17. Mudança de funil reposiciona a etapa sem critérios e sem histórico de etapa.**
`ComOpo_salvar_` (`Oportunidades.js:239`) põe a etapa 1 do novo funil sem passar por
`ComOpo_criteriosMudanca_` e registra só “Campos alterados”.

### BAIXA

**D18. “Excluir repetido” aparece em todo item ativo e não confere repetição.**
`JS_Comercial.html:2124-2134` cria o botão para qualquer item ativo (inclusive para o
vendedor); `ComP_excluirDuplicado_` (`Propostas.js:301-306`) não confere se há outro item
com o mesmo nome, e o resultado é só arquivar (reativação pela gestão), não excluir.

**D19. Proposta aceita o mesmo item do catálogo duas vezes.** `ComP_itensDaTela_`
(`Propostas.js:592-636`) não confere repetição; `anteriores` é indexado por `produtoId`
(`593`), então o segundo item herda o preço de tabela do primeiro. Só o Orçamentista avisa
repetidos (`JS_Comercial.html:2803-2828`). Remover item já existe (`1399`, `1404`).

**D20. Data e hora do ganho não aparecem.** Gravado com hora, exibido só o dia
(`Oportunidades.js:79`). Não há coluna de “ganha por” nem “ganha via” (manual, aceite,
assinatura).

**D21. Textos desatualizados.** Comentários dizem que o Comercial não tem aprovação pelo
link (`Propostas.js:29-30`, `1371-1372`); a Ajuda (`SGO_Ajuda_Comercial.js`) não fala de
assinatura nem de link (regra do dono: manual atualizado no mesmo commit). Página pública:
título “Orçamento …” e aviso “Este link de orçamento” (`orcamentoPublico.ts:35-38`,
`app.js:72`) para uma proposta comercial.

**D22. Trabalho pesado dentro da trava.** `ComP_assinaturaResponder_` gera o PDF
(`RelA4_finalizar_`) dentro de `Com_comTrava_` (`Propostas.js:1074-1102`), segurando a trava
de todo o Comercial (espera de até 25 s, `Config.js:503`).

---

## 4. Pedidos dos usuários (a–h)

### a) Excluir produto ou serviço repetido

**Existe:**
- No catálogo: bloqueio de nome e código repetidos ao salvar (`Propostas.js:182-183`,
  `205-211`), filtro “Possíveis duplicados” (`84-87`, `102`), selo “mesmo nome de outro
  item” (`JS_Comercial.html:2116`), botão “Excluir repetido” (arquiva,
  `Propostas.js:301-306`) e junção em Cadastros > Correções de cadastro.
- Na proposta: botão “Excluir item” no rascunho (`JS_Comercial.html:1399`, `1404`).

**Falta / qual faz sentido:** o pedido do usuário tende a ser os dois: (1) no catálogo, o
botão hoje aparece em todos os itens e não confere repetição; (2) na proposta, nada impede
adicionar duas vezes o mesmo serviço.

**Proposta:**
1. Catálogo: em `JS_Comercial.html:2124`, mostrar “Excluir repetido” só quando
   `p.duplicado` (já calculado em `Propostas.js:119`). Em `ComP_excluirDuplicado_`,
   conferir com `ComP_nomesRepetidos_` que há outro item ativo com o mesmo nome e pedir o
   item que fica (`manterId`); gravar `JUNTADO_COM_ID/EM/POR_NOME` (colunas já existem)
   para que a reativação seja barrada (`318`). Exclusão física não: propostas antigas
   apontam para o `produtoId`.
2. Proposta: em `ComP_itensDaTela_`, ao achar o mesmo `produtoId` + mesmo
   `equipamentoId` + mesma `faixa` duas vezes, lançar erro claro (ou somar quantidades,
   conforme decisão do dono). Na tela, ao escolher do catálogo um item já presente, avisar
   e oferecer “somar à quantidade”. Acrescentar a regra em `ComG_revisarPropostaRegras_`
   como alerta.

### b) Gestor cria atividade para o vendedor dentro da oportunidade

**Existe:** `ComOpo_criarAtividadeGestao_` (`Oportunidades.js:393-408`), ação
`criarAtividadeOportunidade` (`Painel.js:491`), botão “Criar atividade para o comercial”
para gestão em oportunidade aberta (`JS_Comercial.html:825`, `849-854`). O vendedor recebe
“Nova atividade para você” com e-mail (`SGO_Atividades.js:834-836`) e o histórico da
oportunidade registra (`Oportunidades.js:405`).

**Falta:** D7 e D8. A atividade não aparece na ficha, não é encerrada junto com a
oportunidade e falha para gestor sem perfil de gestor em Atividades.

**Proposta:**
- Nova coluna `ATIVIDADES_GESTAO_JSON` em `COM_OPORTUNIDADES` (lista de ids, com
  `Com_garantirAbas_` e nova chave de cache), gravada em `ComOpo_criarAtividadeGestao_`.
- Em `ComOpo_detalhe_` (`589-620`), devolver essas atividades com situação e prazo; na
  ficha, seção “Atividades da gestão”.
- Em `ComOpo_ganhar_`, `ComOpo_perder_` e na troca de responsável de `ComOpo_salvar_`,
  cancelar ou transferir as abertas (`Com_mudarAtividade_`).
- Criar a atividade pela identidade do Comercial (`Com_criarAtividade_` sem `sessionId`,
  que usa `Com_comoSistema_`), já que a permissão foi conferida por
  `Com_exigir_(eu,'GESTAO')`; manter `CRIADO_POR` no histórico e no texto.
- Título com código e cliente: `'[' + CODIGO + '] ' + texto + ' — ' + CLIENTE_NOME`.
- Opcional: campos 5W2H (por quê, como) e prioridade no formulário.

### c) Confirmação automática ao vendedor com o cliente em cópia após a assinatura

**Existe:** nada no Comercial. Modelo pronto na Assistência:
`AstL_confirmarCliente_` (`SGO_Assistencia_Aceite.js:337-367`), com HTML, anexo do
comprovante e `replyTo`.

**Proposta:** nova função `ComP_confirmarAssinatura_(p, a)` chamada por `Com_depois_`
(fora da trava) no fim de `ComP_assinaturaResponder_`:
- `to`: e-mail do responsável (`Com_usuarios_()[p.RESPONSAVEL_ID].email`);
- `cc`: `a.clienteEmail` (e, se a gestão decidir, o e-mail do contato da proposta);
- `replyTo`: e-mail do vendedor; `name`: “Metrolabs — <nome do vendedor>”;
- assunto: `Proposta PROP-… rev.NN assinada por <nome> (<cliente>)`;
- corpo em texto e HTML, com número, cliente, data e hora, nome e cargo do signatário,
  próximos passos e contato do vendedor; anexo: o PDF com as duas assinaturas
  (`a.finalPdfId`);
- se o envio falhar, `Com_avisar_` ao vendedor e registro no histórico “confirmação não
  saiu”, como a Assistência faz.
Também corrigir a frase da página pública (`app.js:120`) se a decisão for não enviar ao
cliente.

### d) Assinou: notificar o vendedor e marcar a oportunidade como Ganha com data e hora

**Existe:** a lógica de aprovação está dentro de `ComP_registrarResposta_`
(`Propostas.js:1361-1407`). `ComP_assinaturaResponder_` (`1070-1103`) não aplica nada (D1).

**Proposta:**
1. Extrair de `ComP_registrarResposta_` uma função interna
   `ComP_aplicarAprovacao_(p, quem, { quando, texto, arquivo: {id, nome, url}, marcarGanha, via })`
   que: grava APROVADA, `RESPOSTA_EM`, `RESPOSTA_POR_NOME`, `ACEITE_ARQUIVO_*`,
   `PEDIDO_SITUACAO = SEM_PASSAGEM`; chama `ComBP_registrarProposta_`; conclui
   `RETORNO_ATIVIDADE_ID` e `VENCIMENTO_ATIVIDADE_ID`; registra histórico e contato;
   marca a oportunidade GANHA com `GANHA_EM`; avisa gestão e responsável. Usar em
   `ComP_registrarResposta_` e em `ComP_assinaturaResponder_`.
2. Em `ComP_assinaturaResponder_`, depois de gerar o PDF: se a proposta estiver PRONTA,
   chamar `ComP_aoEnviar_(p, a.linkEnviadoEm, 'Link de assinatura para ' + email, quemSistema)`
   antes; depois `ComP_aplicarAprovacao_` com `arquivo = PDF assinado`,
   `quem = { id: 'COMERCIAL', nome: 'Assinatura eletrônica: ' + cliente.nome }`,
   `via: 'ASSINATURA_LINK'`. Mover a geração do PDF para fora da trava (D22).
3. Novas colunas sugeridas em `COM_PROPOSTAS`: `ASSINADA_EM`, `ASSINADA_POR_NOME`,
   `ASSINADA_POR_EMAIL`, `ASSINATURA_PDF_ID`, `LINK_EMAIL`, `LINK_ENVIADO_EM`; em
   `COM_OPORTUNIDADES`: `GANHA_VIA` (MANUAL, ACEITE, ASSINATURA, OC) e `GANHA_POR_NOME`.
4. Aviso imediato ao vendedor: `Com_avisar_(..., { email: true })` só sai no expediente;
   para este evento usar o e-mail do item c (imediato) e o aviso do sistema.
5. Exibir `GANHA_EM` com hora na ficha (`Oportunidades.js:79`, `Com_br_` em vez de
   `Com_brDia_`).
6. Decisão do dono: mover a etapa para a de 100% junto.

### e) Anexar ordem de compra e marcar como ganha sem assinatura (IMED)

**Existe:** `ComP_registrarResposta_` já aceita como aceite “pedido de compra”
(`Propostas.js:1344-1346`) e marca a oportunidade ganha (`1384-1389`). Porém só para
proposta ENVIADA/VENCIDA (`1350`) e o arquivo vai para a subpasta “Aceites” sem
classificação. `ComOpo_ganhar_` marca ganha sem anexo nenhum (D6). Não há tratamento
específico de IMED.

**Proposta:**
- No formulário “Registrar resposta do cliente” (`JS_Comercial.html:1114-1124`) e no
  quadro (`3344-3375`), campo “Tipo do aceite”: Proposta assinada / Ordem de compra /
  E-mail de aprovação; com OC, campos “Número da OC” e “Data da OC”. Gravar em novas colunas
  `ACEITE_TIPO`, `OC_NUMERO`, `OC_DATA` e no histórico; mandar o número para a passagem aos
  setores (Financeiro precisa dele para faturar).
- Permitir registrar aprovação por OC também em proposta PRONTA (o cliente recebeu por
  outro meio), chamando `ComP_aoEnviar_` com “Aceite por OC” antes de aprovar.
- `ComOpo_ganhar_`: exigir proposta aprovada ou um arquivo de aceite (decisão do dono);
  no mínimo, quando houver proposta ENVIADA/PRONTA, abrir o mesmo formulário de aceite em
  vez de marcar ganha sem nada.
- Se o dono quiser regra por cliente (“IMED aprova por OC”), uma marca no cadastro do
  cliente (ex.: `ACEITE_PADRAO = OC`) que faça a tela abrir já em “Ordem de compra” e
  dispense a assinatura no checklist. Não existe hoje.

### f) Envio automático do link por e-mail

**Existe:** `ComP_linkAssinatura_` (`Propostas.js:1009-1032`).

**Problemas:** D4, D10, D11, D12, D15. Resumo:
1. Conteúdo: uma linha, sem identificação, sem `replyTo`, sem HTML; aparência de golpe
   (“assine aqui” + link longo de domínio pouco conhecido), tende a cair no spam e a ser
   ignorado.
2. Remetente: endereço técnico do SMTP; o cliente não reconhece.
3. Gerar de novo troca o e-mail exigido e invalida o anterior, sem mostrar isso ao
   vendedor nem avisar o primeiro destinatário.
4. E-mail digitado livre; nenhuma ligação com o contato da proposta.
5. Comparação exata do e-mail (`1079`): quem recebeu por encaminhamento (colega do
   cliente) é recusado.

**Proposta:**
- Tela: substituir o `prompt` por janela com o e-mail do contato da proposta
  pré-preenchido (`CONGELADO_JSON.contato.email` ou `ComCt_listar_`), lista dos contatos
  do cliente, aviso quando o domínio não é de nenhum contato do cliente, e a linha “Último
  link: para X em dd/mm hh:mm (será invalidado)”. Exigir confirmação explícita para
  invalidar.
- Servidor: guardar `LINK_EMAIL` e `LINK_ENVIADO_EM` na proposta, gravar histórico
  “Link enviado para …” e um registro em `COM_CONTATOS_REGISTRO`; chamar `ComP_aoEnviar_`
  quando a proposta estiver PRONTA (o link é um envio).
- Ordem: enviar o e-mail antes de apagar o hash antigo, ou desfazer as Properties se o
  envio lançar (D11).
- Conteúdo: `name` “<Vendedor> — Metrolabs”, `replyTo` do vendedor, `cc` opcional para o
  vendedor, `htmlBody` com saudação ao contato, número e título da proposta, cliente,
  valor total, validade, o que o cliente vai fazer (conferir, informar nome, cargo, e-mail
  e assinar), que o e-mail digitado deve ser este, e o contato do vendedor; versão texto
  equivalente. Opcional: anexar o PDF (sem assinatura) para o cliente ler mesmo sem abrir
  o link.
- Regra do e-mail esperado (decisão do dono): manter exato, aceitar qualquer e-mail do
  mesmo domínio, ou aceitar uma lista (contatos do cliente).
- Ao reenviar para endereço diferente, avisar o anterior que o link foi cancelado (ou não,
  decisão do dono).

### g) Assinatura do vendedor em imagem cadastrada no perfil

**Existe:** `ComP_assinarResponsavel_` (`Propostas.js:978-1007`) recebe um desenho em PNG
(`982`), salva o PNG ao lado do PDF, calcula SHA-256 da imagem e do PDF e grava em
`COM_ASS_RESP_<id>`. `ComDoc_assinaturaProposta_` (`SGO_Comercial_Documento.js:54-62`)
desenha a imagem no bloco de assinaturas (`117-120`), mas só no PDF final, depois que o
cliente assina (`Propostas.js:1083-1086`). O PDF que o cliente recebe antes não tem a
assinatura da Metrolab. Não existe assinatura guardada no cadastro do usuário.

**Proposta de reaproveitamento:**
1. Perfil: “Minha assinatura” (Meu perfil ou Comercial > Configurações), com envio de
   PNG/JPG, pré-visualização, “trocar” e “remover”. Servidor `ComAss_salvarImagem_(eu, d)`:
   aceitar `image/png` e `image/jpeg` até ~200 KB; converter para PNG (o documento só aceita
   PNG, `Documento.js:56`) ou ampliar o regex para JPEG; guardar o arquivo em pasta privada
   (`Ast_privado_`) e em `CAD_USUARIOS` (ou tabela própria) `ASSINATURA_ARQUIVO_ID`,
   `ASSINATURA_SHA256`, `ASSINATURA_EM`, mantendo as versões anteriores (nunca sobrescrever
   sem histórico).
2. `ComP_assinarResponsavel_`: aceitar `d.usarPadrao === true`; nesse caso ler a imagem
   do perfil em vez do desenho, manter a conferência (“Li e concordo”, `pdfId` e `marca`)
   e registrar no histórico que foi a assinatura cadastrada (com o SHA da imagem).
3. Na janela “Assinar pela Metrolab” (`JS_Comercial.html:1062-1105`): mostrar a
   assinatura cadastrada com “Usar esta” e, como alternativa, o quadro de desenho atual.
4. Opcional (decisão do dono): inserir a assinatura do vendedor já no PDF gerado por
   `ComP_gerarDocumento_`, para o cliente receber a proposta assinada pela Metrolab.
   Exige gerar o documento depois da assinatura (hoje a assinatura depende do `pdfId`).

### h) Excluir uma oportunidade criada para teste

**Existe:** nada. Não há ação em `COM_ACOES` (`Painel.js:462-573`), nem situação, nem
coluna. Hoje a única saída é “Registrar perda”, que suja o relatório de perdas, o banco de
preços e avisa a Diretoria como ato irreversível.

**Proposta (exclusão lógica, no padrão de `ComP_excluir_`):**
- Colunas novas em `COM_OPORTUNIDADES`: `EXCLUIDA_EM`, `EXCLUIDA_POR_ID`,
  `EXCLUIDA_POR_NOME`, `EXCLUIDA_MOTIVO` (+ nova chave de cache em `Com_garantirAbas_`).
- `ComOpo_podeExcluir_(eu, o)`: só gestão comercial (ou o próprio criador, se o dono
  quiser, e só nas primeiras 24 h). Recusar se: alguma proposta (`ComP_lerPropostas_`)
  foi enviada (`ComP_foiEnviada_`), está APROVADA/RECUSADA/VENCIDA, tem
  `COM_ASS_RESP_` com `linkHash` ou `finalPdfId`, ou tem passagem aos setores; se houver
  contrato em `LIC_CONTRATOS` com `COMERCIAL_OPO_ID` igual; se houver linhas no banco de
  preços desta oportunidade sem desconsiderar.
- `ComOpo_excluir_(eu, d)`: motivo com 10+ letras; cancelar `ATIVIDADE_ID` e as
  atividades da gestão; excluir logicamente as propostas nunca enviadas (mesma rotina de
  `ComP_excluir_`); gravar a oportunidade com `SITUACAO = 'EXCLUIDA'` e as colunas;
  `Com_historico_('OPORTUNIDADE', id, 'EXCLUIDA', …)`; `SGO_avisoGestaoIrreversivel_` GI01.
  Código não reaproveitado.
- Leitura: criar `ComOpo_lerOportunidades_()` (como `ComP_lerPropostas_`,
  `Propostas.js:1320`) e usar em `ComOpo_listar_`, `ComQ_base_`, `Com_indicadores_`,
  `Comercial_fontePendencias_`, `Com_entrada_`, `Com_listasDoDia_`/`ComG_ctx_`,
  `Comercial_emUso_`, `SGO_Gestao_RelatoriosEmpresa.js:401` e `SGO_Vinculos.js:136`;
  `ComOpo_obter_` recusa com mensagem igual a `ComP_obter_` (`Propostas.js:409-410`).
- Tela: botão “Excluir oportunidade (teste ou engano)” na ficha só para quem pode, com o
  motivo do bloqueio quando não pode (mesmo padrão de `podeExcluir`/`motivoSemExcluir`,
  `Propostas.js:579`).

---

## 5. Dúvidas que só o dono do negócio decide

1. Assinatura pelo link deve marcar a oportunidade como ganha **automaticamente** ou
   apenas avisar o vendedor para confirmar? E mover a etapa para a de 100%?
2. A confirmação após a assinatura vai para quem: vendedor com cliente em cópia (pedido c),
   também a gestão comercial? Com o PDF assinado anexado?
3. O e-mail exigido na assinatura deve ser exato, qualquer do mesmo domínio, ou qualquer
   contato cadastrado do cliente?
4. Ao gerar novo link para outro e-mail, o anterior deve ser invalidado (como hoje) e o
   primeiro destinatário avisado?
5. “Marcar como ganha” sem proposta aprovada deve continuar existindo? Se sim, exigir
   pelo menos um arquivo (OC ou e-mail)?
6. Para clientes que aprovam por ordem de compra (IMED e outros), a OC dispensa a
   assinatura sempre, ou só para clientes marcados no cadastro? Quais campos da OC são
   obrigatórios (número, data, valor)?
7. Item repetido na proposta: impedir ou somar as quantidades?
8. Quem pode excluir oportunidade: só gestão, ou o vendedor criador dentro de um prazo?
   Oportunidade com proposta já enviada nunca pode ser excluída (só perdida)?
9. A assinatura cadastrada do vendedor pode ser usada sem desenho a cada proposta? Deve ir
   já no PDF enviado ao cliente (antes da assinatura dele)?
10. Gestão comercial pode assinar e gerar link no lugar do vendedor ausente?
11. Ao trocar o responsável da oportunidade, as propostas em andamento passam para o novo
    responsável? E as já assinadas pela Metrolab (assinatura é pessoal)?
12. Proposta assinada pelo cliente pode ser cancelada ou substituída depois? Se sim, por
    quem e com que aviso ao cliente?

---

## 6. Ordem sugerida de correção

1. D1/D2/D3 com os pedidos c e d (núcleo `ComP_aplicarAprovacao_` + confirmação).
2. D4/D10/D11/D15 com o pedido f (envio do link).
3. D5 (troca de responsável) e D6 (ganho sem aceite) com o pedido e.
4. Pedido h (exclusão segura) e pedido b (D7/D8).
5. Pedido g, a, D9, D13, D14, D16-D22.

Estado deste documento: **diagnóstico apenas** (código lido; nada alterado, nada testado,
nada publicado).
