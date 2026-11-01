# Avisos da gestão no celular: inventário e regras

Data: 01/11/2026. Pedido do dono: pendência, atraso, aprovação e ato irreversível da gestão chegam ao celular por WhatsApp, além do e-mail, para tomada de ação, sem perder nada. Código: `SGO_Avisos_Gestao.js`, com ganchos em `SGO_Avisos_Matriz.js`, `SGO_Notificar.js`, `SGO_Gestao_Escada.js`, `SGO_Sedna.js`, `SGO_WhatsappPiloto.js` e nos módulos listados na seção 3.3. Testes: `tests/avisos-gestao-celular.test.cjs`.

## 1. Decisões do dono e como cada uma foi aplicada

| Decisão | Como funciona |
|---|---|
| 1. Horário | A Diretoria (perfil Diretoria e o dono) recebe a qualquer hora. O gestor recebe só no expediente cadastrado em Atividades da equipe > Avisos e horários. O que nasce fora dele fica na fila com a hora de saída (`LIBERAR_EM`) na abertura do próximo dia útil (08:00 no padrão), pulando fim de semana e feriados. |
| 2. Quantidade | Sem o teto de 3 WhatsApp por dia. Pendência e aprovação esperam até 30 minutos e saem numa mensagem só por pessoa, com um link por item. Atraso e ato irreversível saem na hora, sem esperar o agrupamento, respeitando o horário. |
| 3. Ação | Cada item leva o link `<endereço do SGO+>?aviso=<código>`. Depois do login, o SGO+ abre o item exato com a mesma ação do Início (proposta, oportunidade, chamado, pedido de compra, Caixa de decisões). Não há botão de aprovar ou recusar no WhatsApp. |
| 4. Irreversível | Perda, cancelamento, exclusão, indeferimento e recusa definitiva avisam na hora o gestor da área e a Diretoria, menos quem fez: quem fez, o quê, o item e o motivo. |
| 5. Para todos | Vale para todos os gestores e a Diretoria, inclusive PJ, sem piloto. O piloto continua valendo para as demais mensagens. O ponto continua fora. |

"Gestão", aqui: Administrador, Gestor, Diretoria, o dono e os responsáveis de área da rotina da empresa (RH e Financeiro), ativos, sem a conta técnica "admin". Para as demais pessoas nada muda: teto de 3 WhatsApp na hora, resumo do dia e regras da matriz.

## 2. Os quatro tipos

| Tipo | Quando sai | WhatsApp |
|---|---|---|
| Pendência / Aprovação | Agrupada em 30 minutos por pessoa | Sim (modelo `sgo_gestao_acao`) |
| Atraso | Na hora | Sim |
| Irreversível | Na hora; não exige ação, fica resolvido ao sair | Sim |
| Informativo | Como antes (sistema, resumo do dia) | Não |

## 3. Inventário

Legenda: **Existia** = evento já estava na matriz e ganhou o tipo da gestão; **Novo** = criado nesta entrega. Prazo em dias úteis, contado da entrada na Caixa de decisões (o próprio item pode trazer prazo menor).

### 3.1 Pendência / Aprovação

| Código | Módulo | Quem recebe | Prazo | Situação |
|---|---|---|---|---|
| GS01 | Caixa de decisões (todos os módulos, tabela 3.1.1) | Gestor responsável pelo item (Regras e responsáveis); área sem gestor: Diretoria | O do item | Novo |
| S23 | Comercial: pedido de apoio à gestão comercial | Gestor da área Comercial | Mesmo dia | Existia |
| RP01 | Representação: pedido da representada na fila | Responsável pela representação (quando é da gestão) | 4 horas úteis para o aceite | Existia |
| RP02 | Representação: pedido com equipamento parado | Responsável pela representação (quando é da gestão) | 4 horas úteis para o aceite | Existia |

#### 3.1.1 Itens da Caixa de decisões cobertos pelo GS01 (74 tipos)

| Módulo | Itens (prazo) |
|---|---|
| Comercial | desconto acima da alçada (1, aprovação); reabertura pedida (2, aprovação); preço do catálogo abaixo da alçada (1, aprovação); oportunidade sem próxima ação (1); pedido aprovado sem passagem aos setores (1) |
| Atividades | pedido de nova data (2, aprovação) |
| Compras | compra aguardando aprovação (1, aprovação); compra parada há 2 dias úteis (1); compra feita sem pedido (2); compra do cartão sem informar (1) |
| Assistência técnica | triagem (1); agendar (1); prazo em risco (1); orçamento parado (1); documentação atrasada (1); O.S. sem envio do aparelho (1); série divergente (2); pedido do cliente na fila (1); reclamação (2); cadastro criado em campo (2); relatório sem envio (1); retorno a agendar (1); P1 sem triagem (1); orçamento recusado (2, aprovação); ajuste de orçamento (1, aprovação) |
| Representação | prazo de aceite vencido (1); chamado sem registro (1) |
| Programa de conduta | sugestão de ocorrência (2); fechamento (3); homologar (3, aprovação); julgar (5, aprovação); missão (3, aprovação). Sigilo: a mensagem não traz detalhe |
| Qualidade | O.S. com registro incompleto (3); retirada com registro incompleto (3); plano de ação vencido (2) |
| Frota | CNH vencida (1) e vencendo (2); documento do veículo vencido (1) e vencendo (5); manutenção vencida (2) e vencendo (5); multa a conferir (3), vencida (1) e vencendo (3); viagem aberta (1); km a conferir (2); uso sem registro (1); partida a liberar (1); bloqueio pendente (1); rastreador sem conexão (2); comprovante (2); avaria (3); abastecimento pendente (1), justificativa (2, aprovação) e conferência (5); plano de manutenção incompleto (5); checklist (2); reserva atrasada (1) e com problema (1); bloqueio a decidir (1); retirada esquecida (1); bloqueio na fila (1); passagem do carro (1); odômetro (3); caso da Frota (5); sugestão do copiloto (5) |
| Padrões, Auvo, Avisos, E-mail | padrão vencido (1), vencendo (5) e sem validade (2); O.S. do Auvo aberta (3), sem vínculo (3) e importação parada (1); leitura de aviso atrasada (3); e-mail de cliente parado (1) |

Fora do GS01, de propósito: os quatro itens de acompanhamento (documento, requalificação, calibração e NR-13 de cliente), que são Informativo; o ajuste de ponto parado (o ponto continua fora); e a atividade atrasada da equipe, que a SEDNA já escala por prioridade (S72 e S73, seção 3.2).

### 3.2 Atraso

| Código | Módulo | Quem recebe | Prazo | Situação |
|---|---|---|---|---|
| GS02 | Caixa de decisões: prazo de decisão vencido sem nenhuma ação | Gestor responsável pelo item | Na hora; sem ação, a escada sobe à Diretoria | Novo |
| GS03 | Caixa de decisões: item escalado à Diretoria (parado há 5 dias úteis) | Diretoria, com o nome de quem está segurando | Na hora | Novo |
| S72 | Atividades: atividade atrasada escalada ao gestor da área (SEDNA, nível 2) | Gestor da área e quem lançou (da gestão) | Pela prioridade (Normal: 48 h) | Existia |
| S73 | Atividades: atividade atrasada escalada à Diretoria (SEDNA, nível 3) | Diretoria | Pela prioridade (Normal: 120 h) | Existia |
| RP07 | Representação: prazo de aceite em risco (75%) ou vencido | Responsável; vencido: gestão da área Técnica | 4 horas úteis | Existia |

### 3.3 Irreversível (todos novos)

| Código | Módulo | O que é irreversível (onde nasce) | Quem recebe |
|---|---|---|---|
| GI01 | Comercial | Oportunidade perdida (`ComOpo_perder_`); reabertura recusada (`ComOpo_reabrir_`); desconto não aprovado (`ComP_decidirDesconto_`); proposta cancelada (`ComP_cancelar_`) ou excluída (`ComP_excluir_`) | Gestor comercial e Diretoria |
| GI02 | Atividades | Pedido de nova data recusado (`Atividades_apiDecidirPedido`) | Gestor da área da pessoa e Diretoria |
| GI03 | Compras | Pedido de compra cancelado (`CmpR_cancelar_`) | Gestor da Logística e Diretoria |
| GI04 | Assistência técnica | Chamado cancelado (`AstC_cancelar_`) ou excluído (`AstC_excluir_`); solicitação do cliente descartada (`AstC_descartar_`) | Gestor da Técnica e Diretoria |
| GI05 | Programa de conduta | Ocorrência mantida ou anulada no julgamento (`Conduta_apiJulgarOcorrencia`) | Só a Diretoria, sem detalhe (sigilo) |
| GI06 | Representação | Pedido da representada recusado (`AstC_descartar_`) | Gestor da Técnica e Diretoria |
| GI07 | Cadastros | Cliente, unidade, equipamento ou usuário excluído (`clientesExcluir`, `unidadesExcluir`, `equipamentosExcluir`, `usuariosExcluir`) | Diretoria |

Quem fez nunca recebe o próprio aviso. A exclusão de cadastro não pede motivo; o aviso diz isso.

### 3.4 Informativo (sem mudança, sem WhatsApp da gestão)

Venda ganha (S24), atividade concluída e comentário (S05, S06), atendimento do pedido do Comercial concluído (AT07), resumos diários da Caixa e da Diretoria (S12, S14), relatórios semanais e mensais (S15, S16) e os itens de acompanhamento da Caixa.

## 4. Matriz de avisos

- Cada evento da gestão tem o selo "Gestão: <tipo>" e a escolha "Avisos da gestão: Ligado / Desligado" em Administração > Matriz de avisos. Desligado, o evento volta à regra comum (o e-mail e o WhatsApp da linha). Toda mudança pede motivo e entra na trilha.
- A ligação foi gravada uma vez em `NTF_REGRAS` na primeira rodada da gestão depois da publicação: uma linha por evento, autor "Sistema (decisão do dono)", motivo começando por "decisão do dono 01/11/2026". O canal de e-mail, o de WhatsApp, a decisão e a área em vigor foram copiados para o "depois" (merge). Essas linhas não marcam a regra como "Alterada". Nada foi apagado.
- Para os gestores ninguém precisa marcar nada: o padrão já sai ligado.

## 5. Ciclo de cada aviso e "não perder nada"

Aba `NTF_GESTAO`, uma linha por evento + item + pessoa (a `CHAVE`; não se repete):

1. **Criado e na fila** (`NA_FILA`, com `QUANDO` e `LIBERAR_EM`).
2. **Enviado** (`ENVIADO`): o e-mail sai sempre (`EMAIL_SITUACAO`); o WhatsApp sai junto (`WA_SITUACAO`: `ENVIADO`, `AGUARDANDO_MODELO`, `SEM_NUMERO` ou `FALHOU`, com `WA_MOTIVO`). Celular sempre mascarado ("final 1234").
3. **Entregue e lido**: `SGO_avisosGestaoRetornoMeta_(wamid, status, quandoIso, motivo)` grava `ENTREGUE_EM` e `LIDO_EM`. O retorno da Meta ainda não é registrado no SGO+; a função está pronta para o servidor chamar.
4. **Aberto**: o link grava `ABERTO_EM` quando a própria pessoa abre.
5. **Resolvido** (`RESOLVIDO`): o item saiu da Caixa de decisões (`CAIXA:<item>`) ou a atividade foi concluída ou replanejada (`ATV:<ids>`). Resolvido antes do envio não manda mensagem (fica registrado). O irreversível fica resolvido ao sair.

Falhas: sem e-mail no cadastro, cota ou erro do e-mail ficam registrados; erro passageiro do e-mail tenta de novo até 3 vezes. Sem ação no prazo, a escada da Caixa (e-mail diário, resumo do WhatsApp, Diretoria em 5 dias úteis) e a SEDNA continuam cobrando; GS02 e GS03 avisam essas subidas na hora. O S23 (pedido de apoio comercial) não tem item na Caixa: não sobe a escada, só o aviso.

## 6. Modelo do WhatsApp

Os modelos `sgo_gestao_resumo_dia` e `sgo_aviso_geral` foram reclassificados como Marketing pela Meta. Foi criado o modelo `sgo_gestao_acao`, categoria Utilidade, pt_BR, sem botão, em `NTF_MODELOS_META` (`SGO_Notificar.js`). O botão "Cadastrar modelos na Meta" (Chaves e senhas) e o script do servidor que cadastra os modelos já o enviam.

Texto para cadastro (corpo):

```
Olá, {{1}}. Você tem {{2}} no SGO+ que pede a sua ação ou atenção.

{{3}}

Para ver e decidir no sistema, acesse: {{4}}

A decisão é sempre tomada no SGO+, com login.

Metrolabs — SGO+
```

Variáveis e exemplos: {{1}} primeiro nome ("Maria", até 60); {{2}} quantidade ("2 avisos da gestão", até 40); {{3}} lista numa linha, com um link por item e "e mais N: abra a Caixa de decisões" quando não cabe (até 560); {{4}} link do item (um item) ou da Caixa de decisões (até 200).

Enquanto o modelo não estiver aprovado, o aviso vai só por e-mail com a marca "WhatsApp aguardando modelo". Ele nunca troca pelo `sgo_aviso_geral`.

## 7. Conferência dos parados (relatório semanal da manutenção)

Chamada: `SGO_avisosGestaoConferir_()` (ou `SGO_avisosGestaoConferir_(new Date(...))`). Nunca lança. Devolve:

```
{ ok: true, geradoEm: "dd/mm/aaaa hh:mm",
  totais: { paradosNaFila, semResolucao, falhasSemEmail, aguardandoModelo },
  paradosNaFila: [item],   // criados e não enviados há mais de 1 hora (a espera do expediente não conta)
  semResolucao: [item],    // enviados e ainda pendentes depois do prazo do item
  falhasSemEmail: [item],  // nada chegou: nem e-mail nem WhatsApp
  texto: "Avisos da gestão parados em ...\n- Na fila há mais de 1 hora: N.\n..." }
item = { avisoId, pessoa, evento, tipo, modulo, titulo, criadoEm, liberarEm, enviadoEm, prazo, situacao, email, whatsapp, motivo }
```

Em erro: `{ ok: false, message }`. O campo `texto` serve direto para o e-mail da manutenção.

## 8. Telas

- Administração > Matriz de avisos: bloco "Avisos da gestão" com o dia, os totais (enviados, na fila, falhas, parados, aguardando modelo), a situação do modelo e uma linha por aviso (quando, pessoa, tipo, item, situação, canais, motivo). Em cada regra da gestão, o selo e a escolha Ligado/Desligado.
- Menu > Meus avisos: para quem é da gestão, "O que não pode ser desligado" explica que os avisos da gestão são obrigatórios, por quê, o horário (gestor ou Diretoria) e a situação do modelo.

## 9. Riscos e pendências

- O servidor confere a lista de telefones do piloto em todo envio: o celular da gestão passou a entrar nessa lista (`SGO_waPilotoTelefones_`), para a decisão 5 valer também lá. As demais mensagens para essas pessoas continuam barradas pelo piloto no SGO+.
- Os avisos de um módulo que já mandava e-mail próprio ao gestor e também criam item na Caixa (por exemplo a triagem da Assistência, AT01) chegam pelos dois caminhos: o e-mail antigo do módulo e o GS01.
- Antes do cadastro e da aprovação do modelo, todos os avisos da gestão saem só por e-mail (com a marca).
- O retorno de entrega e leitura da Meta depende de o servidor registrar o webhook e chamar `SGO_avisosGestaoRetornoMeta_`.
- Itens que já estavam na Caixa antes da publicação não geram aviso novo (marco `AVG_IMPLANTADO_EM`), para não haver enxurrada. Eles continuam no resumo diário.
