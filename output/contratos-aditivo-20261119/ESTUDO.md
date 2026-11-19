# Aditivo de recarga, compra de contrato e módulo de Contratos — estudo e desenho (19/11/2026)

**Base estudada:** código de produção `output/financeiro-20261116/cand36` (só leitura) e banco de produção (só leitura, transação `READ ONLY`). Nenhum código foi editado, nada foi gravado, cofre e segredos não foram abertos.

**Regras respeitadas:** FORM-FIN-001 (recarga Caju "de acordo com a viagem", aprovação de Charles e Thiago, prestação em 3 dias, toda saída de dinheiro só pelos sócios, Financeiro executa); aprovador delegado de Compras (Matheus) e a correção dos avisos dele (`output/avisos-matheus-20261119/`) ficam como estão.

---

## 0. Resumo para decisão

1. **Aditivo de recarga em viagem**: é um registro novo, ligado à viagem (`VIA-...`) ou à recarga da rotina (`RCJ`). Não deve usar a "revisão" da solicitação de viagem, porque hoje mudar uma solicitação aprovada derruba a aprovação, trava a carga e, depois do primeiro gasto lançado, nem deixa mudar. O aditivo aprovado soma ao teto de carga da viagem; a carga continua pelo caminho que já existe (manual ou pela API do Caju). Aprovação de **um dos sócios** (Thiago ou Charles), aviso na hora a qualquer horário, gestor da área só **acompanha e opina**, sem travar.
2. **Compra de contrato (entrega rápida)**: novo vínculo "Contrato de fornecimento recorrente" no Informar compra e na requisição, com cliente e unidade obrigatórios, tipo do contrato, referência, **competência (mês)**, natureza (fornecimento do mês, reposição, complemento) e justificativa. Destrava o Matheus hoje, sem esperar o módulo. Os campos já nascem com o lugar do `CONTRATO_ID`, para ligar depois sem migração de texto.
3. **Módulo de Contratos**: recomendo, e **sem começar do zero**. O SGO+ já tem uma tabela de contratos quase genérica (`CLI_CONTRATOS`, com parte, vigência, valores, reajuste pelo Banco Central, régua de vencimento, leitura por IA e histórico de versões). Ela está **vazia em produção** (0 contratos), o que torna o momento ideal para ampliar: virar o cadastro único (cliente, fornecedor, representada; prestação, comodato, locação, fornecimento), com as **obrigações estruturadas** em tabela própria e as ocorrências de cada obrigação cobradas pelo sistema.
4. **Ordem**: E1 (compra de contrato provisória + aditivo) → E2 (cadastro único + obrigações) → E3 (integrações: Compras, Financeiro, O.S., Portal, alertas) → E4 (IA propondo obrigações a partir do PDF).

---

## 1. Inventário: o que existe hoje

### 1.1 Recarga Caju e depósito de viagem

| O quê | Onde | Situação em produção (19/11) |
|---|---|---|
| Depósito de viagem (solicitação discriminada, revisões com marca SHA-256, aprovação, carga, prestação, acerto, fechamento, trava) | `SGO_Viagem.js`, `SGO_Viagem_Prestacao.js`, `SGO_Viagem_Recarga.js`, `SGO_Viagem_Fechamento.js`, `SGO_Viagem_Documento.js`, `SGO_Viagem_Painel.js`; tela `JS_DepositoViagem.html` | 2 solicitações (VIA-2026-0001 com carga feita, VIA-2026-0002 aprovada), 1 carga, 0 gastos lançados |
| Recarga Caju da rotina (pedido avulso e semanal, portador com termo, gasto a gasto, período, acerto, trava) | `SGO_RecargaCaju.js`, `_Prestacao.js`, `_Relatorios.js`, `_Semanal.js`; telas `JS_RecargaCaju.html`, `JS_RecargaCaju_Gestao.html` | 0 portadores, 0 pedidos (publicado, ainda sem uso) |
| Carga pela API do Caju (pedido de crédito, saldo, PIX, acompanhamento até creditado) | `SGO_Caju_Pedidos.js`, `SGO_Caju_Api.js` | 0 pedidos pela API (credenciais do dono) |
| Conciliação com o extrato do Caju | `SGO_Caju_Conciliacao.js`, `SGO_Caju_Extrato.js` | publicado |
| Aviso de aprovação na hora, a qualquer horário (GS05) | `SGO_Avisos_Gestao.js` (`SGO_avisoGestaoAprovacaoNaHora_`, `qualquerHora`) | ligado |

Pontos do código que decidem o desenho do aditivo:

- `Via_acoes_` (SGO_Viagem.js): só **quem pediu** (o gestor) altera a solicitação; depois do primeiro gasto lançado ela **não muda mais** ("Gasto a mais do que o carregado entra na própria prestação e vira reembolso").
- `Via_aposMudar_`: alterar uma solicitação aprovada ou já carregada **anula a aprovação** e devolve a rascunho; a carga fica travada até nova aprovação. Isso é certo para mudar a viagem antes de sair, e errado para um gasto imprevisto no meio dela.
- `Via_recargaAprovada_` / `Via_aCarregar_`: o teto da carga (manual e pela API do Caju, e a divergência "crédito acima do aprovado" da conciliação) sai de **uma função só**. É o ponto certo para o aditivo entrar.
- `VIA_PRESTACOES` já tem `FORA_DO_ORCADO` e `LINHA_ID`; `RCJ_CARGAS` já tem `MESMA_PESSOA` (exceção de separação de funções registrada).
- Hoje não existe pedido de dinheiro **durante** a viagem: o técnico paga do bolso e pede reembolso na prestação, ou o gestor refaz a solicitação e perde a aprovação.

### 1.2 Compras

| O quê | Onde | Observação |
|---|---|---|
| Informar compra já feita (ORIGEM = INFORMADA), parcelas, fatura do cartão, duplicidade, atraso, destino matriz/filial | `SGO_Compras_Informar.js`, `JS_Compras.html` | 12 dos 20 pedidos do ano são informados |
| Requisição (fluxo normal: cotação, 3 orçamentos, aprovação, pedido, recebimento) | `SGO_Compras_Requisicoes.js`, `_Cotacoes.js`, `_Pedido.js` | |
| Vínculos aceitos | `CMP_VINCULOS` (Config) e `CMP_VINCULOS_INFORMAR`: Chamado, Cliente, Pedido do Comercial, Veículo, Uso interno | **Não há vínculo com contrato** |
| Centro de custo da compra informada | texto livre (`CENTRO_CUSTO`), lista de áreas | `CAD_CENTROS_CUSTO` (22 linhas) existe na viagem e ainda não foi ligado a Compras |

**O caso do Matheus em produção:** as compras REQ-2026-0017 a 0020 são todas informadas por ele em 19/11.

| Número | Vínculo usado | Centro / destino | Texto |
|---|---|---|---|
| REQ-2026-0017 | **Uso interno** | Qualidade / Matriz GO | Título "Para IMED HCN"; motivo "Repor itens que foram enviados errados aos clientes, erro na separação do pedido" |
| REQ-2026-0018 | Uso interno | Diretoria / Matriz GO | Manifold e bomba de vácuo (manutenção de cadeia fria); duplicidade com REQ-0015 respondida (compra do RJ no mesmo dia) |
| REQ-2026-0019 | Veículo | Matriz GO | Peça de freio, "Para o veículo Onix" |
| REQ-2026-0020 | Veículo | Matriz GO | Bucha de bandeja, "Manutenção Onix" |

A REQ-0017 mostra o problema: uma reposição de insumos de contrato de cliente foi gravada como "uso interno" da Qualidade, porque não havia outra opção. O custo some do cliente e do contrato e aparece como despesa interna. Observação: não encontrei "HCN" no cadastro de clientes nem no de unidades (há IMED Trindade, Formosa, Uruaçu, HMB, Polifor, Poliposse e IMED Matriz). Antes de vincular, a unidade precisa existir no cadastro.

### 1.3 Contratos: tudo o que já existe, onde e com quais campos

| # | Onde | Tabela / campo | Campos principais | Registros em produção | Observação |
|---|---|---|---|---|---|
| 1 | Portal do cliente > Contratos (17/11) | `CLI_CONTRATOS` | cliente, unidades, número, objeto, origem (proposta, assinado fora, renovação), anterior, serviços (JSON), vigência, renovação automática, situação, responsável, PDF + SHA-256, versão; **parte** (`PARTE_TIPO` CLIENTE ou REPRESENTADA), contato, partes (texto), valor mensal e total, índice e data-base, aviso prévio, **SLA (texto)**, **multas (texto)**, **obrigações (texto)**, resumo e pontos da IA | **0** | Já é quase genérica. Usada pelo acesso do portal, régua, reajuste, IA, pastas de documentos e ficha da representada |
| 2 | idem | `CLI_CONTRATOS_HIST` | versão, ação, antes/depois, motivo | 0 | Histórico campo a campo, nada apagado |
| 3 | Régua de vencimento | `CLI_CONTRATOS_AVISOS`, `SGO_Contratos_Regua.js` | marcos 120…0 dias, aviso prévio, cliente por e-mail | 0 | Lê CLI, REP e LIC |
| 4 | Reajuste (Painel financeiro > Reajustes de contratos) | `CLI_CONTRATOS_REAJUSTES`, `FIN_INDICES_ECONOMICOS`, `SGO_Contratos_Reajuste.js`, `_Indices.js` | índice BCB (IPCA, IGP-M, INPC, IPCA-E), memória de cálculo, aprovação só Diretoria | 0 | Pronto para usar |
| 5 | Leitura por IA (Gemini) | `SGO_Contratos_IA.js` | 17 campos sugeridos, cada um com o trecho do contrato; nada grava sozinho | — | Obrigações saem como **texto corrido** |
| 6 | Licitações | `LIC_CONTRATOS`, `LIC_CONTRATO_VERSOES` (original, correção, **aditivo**, apostilamento, encerramento), `LIC_CONTRATO_VINCULOS` | órgão, CNPJ, vigência, valor, hash encadeado | tabela ainda não criada (0) | Fonte própria; o portal só lê |
| 7 | Representação | `REP_REPRESENTADAS.CONTRATO`, `VIGENCIA_*`, `PRAZOS_JSON` | texto do contrato, vigência, prazos de atendimento | 2 representadas (Brasmedical com contrato até 31/12/2027) | A ficha do contrato da representada vai para `CLI_CONTRATOS` (`PARTE_TIPO = REPRESENTADA`) |
| 8 | Assistência técnica > Regras | `ATEC_CONFIG` chave REGRAS, lista `contratos` | prazo de atendimento e de chegada por prioridade, por cliente; pausa | **lista vazia** | `Ast_slaPara_` usa daqui. **SLA de contrato duplicado** com o item 1 |
| 9 | Ronda de engenharia clínica | `ATEC_RONDA_PLANOS.CONTRATO_REF` | periodicidade, técnico, setores, **referência do contrato em texto** | 0 planos | Obrigação "visita periódica" sem ligação ao contrato |
| 10 | Comercial | `COM_TIPOS_ITEM.CONTRATO`; termos padrão do contrato (cláusulas no `SGO_Comercial_Config.js`); etapa "Contrato ou pedido" | — | — | Proposta aprovada já é uma origem aceita do `CLI_CONTRATOS` |
| 11 | Financeiro v2 | `FIN_CONTAS_FIXAS` (aluguel, telefonia, etc., planilha da Wanessa) | fornecedor, dia, valor, início/fim | tabela ainda não criada | Contratos com fornecedor existem na prática e não têm cadastro |
| 12 | Equipamentos | `CAD_EQUIPAMENTOS` (1.028) | cliente, unidade, série, patrimônio, garantia, NF de venda, revenda, origem | — | **Não há campo de posse** (próprio do cliente, comodato, locação) |
| 13 | Portal do cliente | regra "vigência provisória" | contratos a cadastrar até 31/12/2026 | — | O cadastro de contratos de cliente é tarefa já marcada |

Duas confusões a evitar:

- `COM_REAJUSTES` (732 linhas) **não é reajuste de contrato**: é o histórico de reajuste de preço do catálogo do Comercial. A especificação do Financeiro v2 cita "733 reajustes de contrato (`COM_REAJUSTES`)"; a leitura está equivocada e não deve guiar o faturamento de contratos.
- Comodato aparece hoje só como texto: nos PGT/POP (fichas de incorporação de equipamentos) e num item antigo do CRM (sistema de laser cirúrgico em "Comodato Mensal (Mín 300 cirurgias/mês)", IMED HMB, perdido). Esse item ilustra bem o que o módulo precisa entender: **comodato de equipamento amarrado a consumo mínimo de insumos**, que é obrigação da outra parte.

### 1.4 O que está duplicado ou solto

| Assunto | Onde aparece | Problema |
|---|---|---|
| SLA de atendimento | `CLI_CONTRATOS.SLA_TEXTO` (texto), `ATEC_CONFIG.contratos` (estruturado), `REP_REPRESENTADAS.PRAZOS_JSON` | Três lugares, só um é lido pela O.S. |
| Obrigações | `CLI_CONTRATOS.OBRIGACOES_TEXTO`, `MULTAS_TEXTO` | Texto: o sistema não cobra nada |
| Aditivos de contrato | `LIC_CONTRATO_VERSOES` (licitação) | Contrato privado só tem versão de cadastro, sem "termo aditivo" formal |
| Contrato na ronda | `ATEC_RONDA_PLANOS.CONTRATO_REF` | Texto livre |
| Contratos com fornecedor | nenhum (contas fixas sem contrato) | Vencimento e reajuste de aluguel, software, comodato recebido ficam fora |
| Compra para contrato | nenhum vínculo | Vira "uso interno" |

---

## 2. Aditivo de recarga em viagem

### 2.1 Princípios

1. **Não mexe na solicitação aprovada.** O aditivo é um registro próprio, com número próprio (`VIA-2026-0001/A1`, `/A2`…; na rotina, `RCJ-…/A1`), aprovação própria e marca própria. A viagem continua aprovada e carregada.
2. **O teto de carga passa a ser "aprovado + aditivos aprovados".** Uma função nova (`Via_tetoCarga_`) substitui `Via_recargaAprovada_` nos pontos que calculam o que falta carregar (carga manual, pedido pela API do Caju, pendências, contagens, conciliação). Auditar todas as cópias irmãs dessa conta antes de trocar.
3. **Aprovação só dos sócios** (FORM-FIN-001, E3 e B1). Basta **um** deles (o banco também não exige duas aprovações, A5). Ninguém aprova o aditivo em que viaja.
4. **Gestor da área acompanha, não trava.** Recebe o mesmo aviso e pode registrar um parecer curto ("confirmo que é necessário" ou "não vejo necessidade, porque…"), que aparece para os sócios na hora de decidir. Motivo: o técnico está parado no cliente; uma etapa a mais dobra a espera, e a regra da empresa já diz que dinheiro é decisão dos sócios.
5. **Financeiro executa.** Aprovado, vira pendência da Wanessa: carga pela API do Caju (botão que já existe, agora com o valor do aditivo) ou carga manual com comprovante.
6. **Prestação junto com a da viagem** (3 dias úteis após a volta), gasto a gasto, cada gasto marcado com o aditivo a que pertence.

### 2.2 Quem pede e quando

| Situação | Quem pode pedir | Para qual cartão |
|---|---|---|
| Viagem `VIA` com situação Aprovada, Carga feita ou Prestação pendente, e hoje dentro de saída − 1 dia até chegada + 1 dia | quem viaja (equipe) e quem pediu a viagem | do **responsável pelo dinheiro** da viagem (padrão). Pode escolher outro da equipe que seja portador Caju, com o motivo |
| Recarga da rotina `RCJ` com período aberto | o próprio portador | o dele |
| Nada ativo | ninguém | a tela explica: "Você não tem viagem nem recarga em andamento. Para um gasto da rotina, use Minha recarga Caju > Pedir recarga; para uma viagem, peça ao seu gestor a solicitação de depósito." |

Viagem com a prestação já enviada não aceita aditivo (a conta já fechou); gasto depois disso vira reembolso, como hoje.

### 2.3 Tela do técnico (celular, 390 px, e web)

Botão **"Pedir aditivo de recarga"** no topo da viagem (Depósito de viagem) e em Minha recarga Caju. Formulário em uma tela só:

| Campo | Regra |
|---|---|
| Viagem ou recarga | já vem preenchida; se houver duas ativas, escolhe |
| Categoria | Peça, Usinagem ou serviço de terceiro, Hospedagem extra, Alimentação extra, Combustível extra, Pedágio e estacionamento, Transporte local, Ferramenta ou material, Outro |
| Valor | em reais, maior que zero. Sem teto automático (decisão: "de acordo com a viagem") |
| Para que é (justificativa) | mínimo 20 letras. Exemplo na própria tela: "Usinagem do eixo da bomba da autoclave, peça quebrada na desmontagem; sem ela o equipamento não volta a operar." |
| Vínculo | herdado da viagem (cliente, O.S., chamado); pode apontar a O.S. ou o chamado específico do gasto |
| Repassar ao cliente? | Sim, Não, A definir (padrão). "Sim" gera tarefa ao Comercial/Financeiro para incluir no faturamento ou no orçamento do chamado |
| Urgência | "Estou parado aguardando" ou "Pode ser decidido hoje". A primeira libera o aviso a qualquer horário |
| Foto ou orçamento | opcional; foto da peça, do orçamento da oficina ou print. Obrigatório só em "Outro" e acima de valor que a política definir (vazio = nunca) |

Depois de enviar, a tela mostra o andamento em texto simples, que se atualiza sozinho sem redesenhar o formulário: "Aditivo VIA-2026-0001/A1 enviado às 14:02. Thiago e Charles foram avisados por WhatsApp e e-mail. Lembrete automático às 14:32." Enquanto não houver decisão, o técnico pode cancelar ou complementar (texto e foto; valor maior pede novo aditivo).

### 2.4 Estados

| Estado | Significado | Próximo |
|---|---|---|
| Aguardando os sócios | enviado | Aprovado, Aprovado com valor menor, Pedido de informação, Negado, Cancelado |
| Pedido de informação | um sócio pediu algo (foto, orçamento, explicação) | técnico responde → volta a Aguardando |
| Aprovado, aguardando a carga | valor aprovado (igual ou menor, com fundamentação) | Carregado |
| Carregado no cartão | carga registrada (API ou manual com comprovante) | entra na prestação |
| Negado | com motivo obrigatório (15 letras ou mais) | fim |
| Cancelado | pelo técnico antes da decisão | fim |

Toda mudança vai para o histórico (`VIA_HISTORICO` ou o da recarga), com quem e quando.

### 2.5 Avisos e escalonamento

| Momento | Para quem | Canal | Conteúdo |
|---|---|---|---|
| Envio | Thiago e Charles | WhatsApp (modelo da gestão), e-mail, Caixa de decisões; **a qualquer hora** se "parado aguardando", senão no expediente | número, técnico, cliente/cidade, categoria, valor, justificativa, link para decidir |
| Envio | gestor da área de quem pediu | sistema e e-mail (WhatsApp só no expediente) | o mesmo, sem botão de decisão, com "registrar parecer" |
| +30 min sem decisão | os dois sócios | WhatsApp de novo, uma vez | "aguarda há 30 min" |
| +60 min sem decisão | Wanessa e o gestor da área | sistema, e-mail, WhatsApp no expediente | tarefa "ligar para os sócios: aditivo parado há 1 h" |
| Decisão | técnico (e o responsável pelo dinheiro, se outro) | sistema e WhatsApp, **na hora** (é resposta a um pedido dele, não cobrança) | aprovado/negado, valor, motivo |
| Aprovado | Financeiro (lista de sigilo, caixa de carga) | sistema, e-mail; WhatsApp na hora se "parado aguardando" | "carregar R$ X no cartão de Fulano" |
| Carregado | técnico | sistema e WhatsApp | "crédito de R$ X disponível no seu cartão" |

Tempos configuráveis na política (padrão 30 e 60 min). **Não há aprovação automática por tempo**: o dinheiro só sai com decisão de um sócio. O evento novo da matriz de avisos (código GS livre na hora da implementação, para não colidir com o trabalho dos avisos do Matheus) segue o padrão do GS05.

Valor no WhatsApp: os sócios e o Financeiro estão na lista de sigilo, então o valor pode ir na mensagem para eles; para o gestor da área, só se ele estiver na lista (senão vai sem valor, como nas pendências da recarga).

### 2.6 Carga

- O aditivo aprovado aumenta o teto; o botão "Fazer a carga pelo Caju" (que já existe) usa o que falta carregar. Nome do pedido no Caju: `ADT VIA-2026-0001/A1` (cabe nas 27 letras).
- Sem a API ligada: carga manual com comprovante, como hoje.
- **Separação de funções fora do expediente**: hoje quem aprova não registra a carga. Se o aditivo é aprovado às 21 h e a Wanessa não está, a carga pode ser feita pelo **outro sócio**; se nenhum outro puder, o próprio aprovador faz, marcado como exceção (`MESMA_PESSOA`, que já existe na recarga), e a Wanessa confere no dia útil seguinte (pendência própria).
- Trava de prestação vencida: aparece para o sócio como apontamento ("Fulano tem prestação vencida desde …"). Aprovar o aditivo, nesse caso, registra também a liberação da trava para aquela viagem, com o motivo.

### 2.7 Prestação de contas e previsto × realizado

- Na prestação da viagem, cada gasto ganha o campo **Aditivo** (vazio = orçado na viagem). Gasto de aditivo sem comprovante segue a regra da política.
- O A4 de fechamento e a tela passam a mostrar:

| Linha | Orçado | Aditivos aprovados | Previsto total | Carregado | Gasto | Aceito | Glosado |
|---|---|---|---|---|---|---|---|
| Hospedagem | | | | | | | |
| … | | | | | | | |
| Aditivo A1 — Usinagem | — | | | | | | |
| **Total** | | | | | | | |

- Relatório gerencial (Painel financeiro > Depósito de viagem): aditivos por mês, por categoria, por técnico e por cliente; tempo até a decisão; aprovados × negados; aditivos repassados ao cliente e ainda não faturados.
- Peça comprada com aditivo **não** vira compra informada em Compras (seria contada duas vezes). Compras ganha uma visão só de leitura "Peças compradas em viagem", lida das prestações, para o histórico de fornecedor e de peça.

### 2.8 Dados (proposta)

Tabela nova `CJU_ADITIVOS` (uma só para viagem e rotina, porque o cartão é o mesmo):

`ID, NUMERO, ORIGEM_TIPO (VIAGEM|RECARGA), ORIGEM_ID, ORIGEM_NUMERO, SEQ, SOLICITANTE_ID, SOLICITANTE_NOME, PORTADOR_ID, PORTADOR_NOME, CATEGORIA, VALOR_PEDIDO, JUSTIFICATIVA, URGENCIA, VINCULO_TIPO, VINCULO_REF, CLIENTE_ID, REPASSAR_CLIENTE, ANEXOS_JSON, SITUACAO, PARECER_GESTOR, PARECER_POR_NOME, PARECER_EM, VALOR_APROVADO, DECIDIDO_POR_ID, DECIDIDO_POR_NOME, DECIDIDO_EM, FUNDAMENTACAO, CARREGADO_TOTAL, CARREGADO_EM, LEMBRETE_EM, ESCALADO_EM, MARCA, CRIADO_EM, ATUALIZADO_EM, CANCELADO_EM, CANCELADO_MOTIVO`

Colunas novas: `VIA_CARGAS.ADITIVO_ID`, `RCJ_CARGAS.ADITIVO_ID`, `VIA_PRESTACOES.ADITIVO_ID`, `RCJ_GASTOS.ADITIVO_ID`, `CJU_PEDIDOS.ADITIVO_ID`; campos calculados `VIA_SOLICITACOES.ADITIVOS_APROVADOS` e `RCJ_SOLICITACOES.ADITIVOS_APROVADOS`.

Caixas de acesso: pedir aditivo = quem já usa a viagem ou a recarga (sem caixa nova); decidir = sócios (regra fixa, como `CAJU_RECARGA_APROVAR` com "só Diretoria"); carregar = `VIAGEM_DEPOSITAR` / `CAJU_RECARGA_CONFERIR`; política do aditivo = `VIAGEM_POLITICA`.

---

## 3. Compra de contrato (fornecimento recorrente)

### 3.1 Entrega rápida (E1a) — destrava o Matheus hoje

No **Informar compra** e na **requisição**, vínculo novo: **"Contrato de cliente (fornecimento recorrente, comodato, locação)"**.

| Campo | Regra |
|---|---|
| Cliente e unidade | obrigatórios, do cadastro (mesma busca do vínculo "Cliente"). Unidade que não existe: a tela manda cadastrar em Cadastros > Clientes |
| Tipo do contrato | Fornecimento de insumos, Comodato, Locação, Prestação de serviços, Outro |
| Referência do contrato | número ou descrição curta (mínimo 5 letras), por exemplo "Contrato de insumos IMED 2026" |
| Competência | mês/ano a que a compra se refere (padrão: mês da compra) |
| Natureza | Fornecimento do mês, Reposição (erro, avaria ou falta), Complemento fora do previsto |
| Justificativa | mínimo 20 letras; obrigatória em Reposição e Complemento |
| Arquivo do contrato ou do pedido do cliente | opcional |

Conferências simples já na E1a (apontamento para o Financeiro, não bloqueiam):

- segunda compra "Fornecimento do mês" para o mesmo cliente, unidade, referência e competência → "já há fornecimento informado para esta competência (REQ-…)";
- competência mais de 2 meses antes ou depois da data da compra → pergunta o motivo;
- natureza Reposição → marcada para o indicador de custo de erro (a REQ-0017 é exatamente isso).

Colunas novas em `CMP_REQUISICOES`: `CONTRATO_ID` (vazio na E1a, preenchido na E3), `CONTRATO_REF`, `CONTRATO_TIPO`, `COMPETENCIA`, `CONTRATO_NATUREZA`, `CONTRATO_JUSTIFICATIVA`. `VINCULO_TIPO = CONTRATO`, com `CLIENTE_ID` e `UNIDADE_ID` preenchidos (assim os relatórios por cliente já pegam a compra).

**Corrigir o vínculo** de compra já informada: ação nova na ficha, para quem informou, Compras e Financeiro, com motivo; grava antes e depois no histórico, campo a campo, sem regravar o registro. Serve para o Matheus reclassificar a REQ-0017 (hoje "uso interno / Qualidade") como compra do contrato do IMED, depois de a unidade ser cadastrada.

Relatório: filtro "Compras de contrato" em Compras > Relatórios, agrupado por cliente, referência e competência, com total e quantidade de reposições.

### 3.2 Versão completa (E3, com o módulo de Contratos)

- O campo "Referência" vira **escolha do contrato cadastrado** (só vigentes do cliente; comodato e fornecimento primeiro). As compras da E1a com `CONTRATO_REF` são ligadas pelo Compras com um assistente (sugere pelo cliente e pela referência; a pessoa confirma).
- O sistema confere sozinho, contra os **itens previstos do contrato** (`CTR_ITENS`):
  - contrato vigente na data da compra;
  - cliente e unidade cobertos pelo contrato;
  - quantidade da competência: soma das compras da competência × quantidade prevista (tolerância configurável, padrão vazio = só informa);
  - valor: preço unitário contra o último pago e contra o teto do contrato (se houver);
  - periodicidade: mensal, quinzenal, trimestral; compra fora da janela pede justificativa;
  - consumo mínimo da outra parte (comodato com mínimo de uso): mostra o consumo do cliente na competência.
- Tudo que foge do previsto vira apontamento para o Financeiro e o gestor do contrato; nada é recusado, exceto contrato encerrado.
- Resultado do contrato por competência: receita (títulos do Omie ligados ao contrato) − compras de contrato − viagens e aditivos ligados ao cliente.

---

## 4. Módulo de Contratos

### 4.1 Recomendação

**Sim, criar, ampliando o que já existe.** Prós e contras:

| A favor | Contra / risco |
|---|---|
| A base existe (`CLI_CONTRATOS` + régua + reajuste + IA + histórico) e está **vazia**: ampliar agora não exige migração de dados | Cadastrar contratos dá trabalho; sem cadastro, o módulo não serve para nada. Mitigação: IA propõe, pessoa confere; começar pelos contratos que mais geram dinheiro e obrigação (IMED, comodatos, ronda) |
| Acaba com SLA, obrigações e referências espalhados em quatro lugares | Mexer em `CLI_CONTRATOS` afeta o portal do cliente (acesso pela vigência). Mitigação: colunas novas só acrescentam; o acesso continua lendo só `PARTE_TIPO = CLIENTE` |
| Faz o sistema cobrar obrigação com prazo e evidência, em vez de texto | Obrigação mal cadastrada gera alarme falso. Mitigação: cada obrigação nasce "a conferir" e só cobra depois de conferida por uma pessoa |
| Liga custo e receita por contrato (compras, viagens, O.S., faturamento) | Integração com Omie depende das chaves e do Financeiro v2. Mitigação: E3 só lê títulos já ligados; nada grava no Omie sozinho |
| A leitura do contrato por IA já tem a regra anti-invenção (cada sugestão com o trecho) | Contrato escaneado ruim gera sugestão fraca. Mitigação: sem trecho, a sugestão é descartada (regra que já existe) |

Alternativa descartada: tabela nova "do zero" para contratos de fornecedor e comodato. Duplicaria vigência, régua, reajuste e IA, e o portal teria de ler duas fontes.

### 4.2 Cadastro único

Menu: **Gestão > Contratos** (a tela atual do portal continua como atalho filtrado para contratos de cliente). Campos novos em `CLI_CONTRATOS` (só acréscimo):

| Grupo | Campos |
|---|---|
| Classificação | `TIPO_CONTRATO` (Prestação de serviços, Manutenção e engenharia clínica, Calibração e qualificação, Comodato, Locação, Fornecimento de insumos, Representação, Outro); `POLO` (Metrolabs contratada ou contratante); `PARTE_TIPO` passa a aceitar FORNECEDOR, além de CLIENTE e REPRESENTADA |
| Partes | `FORNECEDOR_ID` (de `CMP_FORNECEDORES`), `EMPRESA` (Matriz, Filial RJ, Prestadora: define o Omie e o centro de custo), `CENTRO_CUSTO_ID` (de `CAD_CENTROS_CUSTO`) |
| Dinheiro | `PERIODICIDADE_FATURAMENTO` (mensal, trimestral, anual, por medição), `DIA_VENCIMENTO`, `FORMA_COBRANCA`, `FATURAMENTO_MINIMO` (já existem valor mensal/total, índice e data-base) |
| Gestão | `GESTOR_ID` (dono do contrato no dia a dia), `FISCAL_CLIENTE` (contato), `CRITICIDADE` |
| Termos aditivos | tabela nova `CTR_ADITIVOS` (número, tipo: prazo, valor, escopo, reajuste; vigência nova; PDF; motivo), cada um gera nova versão no `CLI_CONTRATOS_HIST`. Mesmo modelo de `LIC_CONTRATO_VERSOES` |

Licitações continua dona dos contratos públicos (`LIC_CONTRATOS`); a tela de Contratos **lista** os dois, como o portal já faz, e as obrigações de contrato público usam a mesma tabela de obrigações com `FONTE = LIC`.

### 4.3 Direitos, deveres e obrigações — o que faz o sistema "entender"

Cada cláusula relevante vira uma linha em **`CTR_OBRIGACOES`**:

| Campo | Exemplo |
|---|---|
| `CONTRATO_ID`, `FONTE` (CLI ou LIC) | |
| `CLAUSULA`, `TRECHO` | "5.2" e o texto literal |
| `LADO` | Metrolabs ou a outra parte |
| `NATUREZA` | Dever, Direito, Vedação |
| `CATEGORIA` | Atendimento (SLA), Manutenção preventiva, Calibração/qualificação, Ronda, Fornecimento de insumos, Entrega de documento, Faturamento/pagamento, Reajuste, Consumo mínimo, Devolução de equipamento, Seguro, Treinamento, Confidencialidade, Outra |
| `GATILHO` | Periódica, Por evento (chamado aberto), Data única, Contínua |
| `PERIODICIDADE` e `JANELA` | trimestral; tolerância de 15 dias |
| `PRAZO` | 24 horas úteis; 5 dias úteis; até o dia 10 |
| `QUANTIDADE`, `UNIDADE`, `ESCOPO` | 20 caixas/mês; todas as autoclaves da unidade X |
| `RESPONSAVEL` | área e pessoa |
| `EVIDENCIA` | O.S. encerrada do tipo X; relatório; certificado; compra de contrato da competência; título faturado; termo assinado; arquivo enviado |
| `MODULO` | Assistência, Metrologia, Compras, Financeiro, Manual |
| `ALERTA_DIAS` | 7 dias antes |
| `PENALIDADE` | texto da multa |
| `SITUACAO` | A conferir, Ativa, Suspensa, Encerrada; `ORIGEM` Manual ou IA conferida; quem conferiu |

E cada vencimento de uma obrigação vira uma **ocorrência** em `CTR_OCORRENCIAS` (competência, prazo, situação: prevista, em risco, cumprida, cumprida com atraso, não cumprida, dispensada com motivo; evidência ligada). A rotina diária dos contratos (que já roda) gera as ocorrências num horizonte de 90 dias e **dá baixa sozinha** quando acha a evidência:

| Obrigação | Como o sistema confere |
|---|---|
| Preventiva trimestral nos equipamentos X | O.S. de preventiva encerrada para a unidade e os equipamentos dentro da janela |
| SLA de atendimento em 24 h | o prazo do chamado passa a vir do contrato (`Ast_slaPara_` lê a obrigação primeiro; as Regras da assistência ficam como padrão) |
| Entregar X insumos por mês | compras de contrato da competência + entrega registrada |
| Consumo mínimo do cliente (comodato) | quantidade faturada ou fornecida na competência |
| Faturar até o dia 5 | título no Omie ligado ao contrato na competência (leitura) |
| Devolver equipamento em comodato no fim | ocorrência de data única no fim da vigência, com o termo de devolução como evidência |
| Ronda mensal | plano de ronda (`ATEC_RONDA_PLANOS.CONTRATO_ID`) e visitas feitas |

**Equipamentos do contrato**: `CTR_EQUIPAMENTOS` (contrato, equipamento de `CAD_EQUIPAMENTOS`, papel: coberto pela manutenção, em comodato, em locação; data de entrega, termo de entrega, data e termo de devolução, valor de reposição). Em `CAD_EQUIPAMENTOS`, coluna nova `POSSE` (do cliente, comodato Metrolabs, locação Metrolabs, de terceiro), preenchida a partir do contrato.

**Itens previstos**: `CTR_ITENS` (contrato, produto ou descrição, quantidade por período, unidade, preço contratado, tolerância). É o que a compra de contrato confere.

### 4.4 Ligações com os outros módulos

| Módulo | O que muda | Sem duplicar |
|---|---|---|
| Compras | vínculo "Contrato" escolhe o contrato; conferência contra `CTR_ITENS`; resultado do contrato | os campos da E1a viram `CONTRATO_ID` |
| Financeiro | contrato com cliente: previsão de contas a receber por competência; contrato com fornecedor: liga a `FIN_CONTAS_FIXAS.CONTRATO_ID`; reajuste continua o atual | nada é lançado no Omie sozinho (regra do Financeiro v2) |
| Assistência e O.S. | SLA e chegada vêm do contrato; obrigações periódicas viram O.S. planejadas (ou ronda) | `ATEC_CONFIG.contratos` (vazio) é aposentado depois de 1 ciclo lendo as duas fontes |
| Viagem e aditivo | viagem e aditivo podem apontar o contrato (custo do contrato) | campo opcional |
| Portal do cliente | cliente vê o contrato, as obrigações da Metrolabs e o cumprimento (preventivas previstas × feitas, SLA cumprido). **Sem valores** a quem não tem a caixa de valores | o acesso pela vigência continua igual |
| Representação | a ficha já está em `CLI_CONTRATOS`; os `PRAZOS_JSON` viram obrigações de SLA da representada | migração de 2 registros |
| Licitações | lista e obrigações; versões continuam em `LIC_CONTRATO_VERSOES` | só leitura |
| Alertas | régua atual + obrigação em risco, atrasada e não cumprida (sistema, e-mail, Caixa de decisões; WhatsApp interno só no resumo do dia, regra sutil) | mesma rotina e mesma tabela de avisos (`CLI_CONTRATOS_AVISOS`) |

### 4.5 Leitura do PDF por IA (E4)

O botão que já existe passa a devolver também a **lista de obrigações**, cada uma com cláusula, trecho literal e os campos da tabela. Regras que já valem e continuam: sem trecho, a sugestão é descartada; instrução escrita no PDF é ignorada; nada grava sozinho. Novo: cada obrigação sugerida entra como "A conferir" e só passa a cobrar quando uma pessoa confere (quem e quando ficam registrados). Teste com contratos reais (o do IMED e o da Brasmedical) antes de liberar, comparando o que a IA propôs com o que a pessoa conferiu.

---

## 5. Plano por etapas

### E1a — Compra de contrato provisória (1 a 2 dias)

- **Arquivos:** `SGO_Compras_Config.js` (vínculo e colunas), `SGO_Compras_Informar.js` (`CmpI_vinculo_`, conferências, corrigir vínculo), `SGO_Compras_Requisicoes.js` (`CmpR_vinculo_`, `CmpR_vinculoTexto_`), `SGO_Compras_Relatorios.js` (filtro), `JS_Compras.html`, `SGO_Ajuda_Compras.js`, manual de Compras e índice do assistente.
- **Testes:** vínculo novo nos dois caminhos; cliente e unidade obrigatórios; competência inválida; segunda compra da mesma competência vira apontamento; reposição exige justificativa; corrigir vínculo grava antes/depois sem sobrescrever outros campos; relatório; tela real a 1366 e 390 px; suíte completa verde.
- **Riscos:** baixos. Cuidar para o vínculo novo não disparar a duplicidade entre compras de destinos diferentes (regra do Pacote 1) e para o GS08 continuar como o especialista dos avisos do Matheus deixar.

### E1b — Aditivo de recarga (4 a 6 dias)

- **Arquivos:** novo `SGO_Caju_Aditivo.js` (regras, estados, avisos, pendências); `SGO_Viagem.js` (`Via_tetoCarga_`, ações, tela); `SGO_Viagem_Prestacao.js` e `SGO_Viagem_Fechamento.js` (campo Aditivo e previsto × realizado); `SGO_Viagem_Painel.js` (relatório); `SGO_RecargaCaju.js` e `_Prestacao.js` (o mesmo na rotina); `SGO_Caju_Pedidos.js` (nome e `ADITIVO_ID` do pedido); `SGO_Caju_Conciliacao.js` (teto com aditivos); `SGO_Avisos_Gestao.js` (evento novo); `JS_DepositoViagem.html`, `JS_RecargaCaju.html`, `JS_RecargaCaju_Gestao.html`; ajudas e manuais da viagem e da recarga.
- **Testes:** pedir com viagem ativa e fora da janela; ninguém aprova o aditivo em que viaja; só sócio decide; valor menor exige fundamentação; teto de carga = aprovado + aditivos em todos os pontos (carga manual, API, pendências, conciliação); a aprovação da viagem não muda (marca igual antes e depois); lembrete de 30 min e escalonamento de 60 min, uma vez só; aviso a qualquer hora só com "parado aguardando"; exceção `MESMA_PESSOA`; prestação com aditivo; A4 de fechamento; tela real a 390 px; suíte completa verde.
- **Riscos:** médio. O teto de carga é usado em vários arquivos (auditar as cópias irmãs); avisos fora de hora (limitar a sócios e ao pedido urgente); regra de separação de funções à noite.

### E2 — Cadastro único de contratos e obrigações (2 a 3 semanas)

- **Arquivos:** `SGO_PortalCliente_Config.js` (colunas novas), novo `SGO_Contratos.js` (cadastro único, tipos, partes, aditivos), novo `SGO_Contratos_Obrigacoes.js` (obrigações, ocorrências, rotina), `SGO_Contratos_Regua.js` (alertas de obrigação), tela nova `JS_Contratos.html` (Gestão > Contratos), `SGO_Poderes.js` (caixas: ver, editar, conferir obrigação, ver valores), ajuda e manual.
- **Testes:** contrato de cliente continua liberando o portal igual (teste de não regressão do acesso); fornecedor e representada não entram no acesso; obrigação "a conferir" não cobra; ocorrências geradas sem repetição; dispensa com motivo; histórico.
- **Riscos:** o portal do cliente depende da tabela (não regressão é obrigatória); cadastrar os contratos reais é trabalho da casa (começar por 3 a 5).

### E3 — Integrações e alertas (2 a 3 semanas, em lotes publicáveis)

1. Compras: escolha do contrato, conferência contra `CTR_ITENS`, assistente de ligação das compras da E1a.
2. Assistência: SLA e chegada do contrato; O.S. planejada a partir das obrigações; ronda com `CONTRATO_ID`.
3. Financeiro: previsão de receita por competência; `FIN_CONTAS_FIXAS.CONTRATO_ID`; resultado do contrato.
4. Portal do cliente: obrigações e cumprimento, sem valores.
5. Alertas de obrigação em risco e não cumprida; painel de contratos.

- **Riscos:** depende do Financeiro v2 (chaves Omie, contas fixas) para a parte de receita; manter "nada grava no Omie sozinho".

### E4 — Obrigações propostas pela IA (1 semana)

- **Arquivos:** `SGO_Contratos_IA.js` (pedido e validação da lista de obrigações), tela de conferência das sugestões.
- **Testes:** resposta simulada; sugestão sem trecho descartada; nada grava sem conferência; teste com 2 PDFs reais (sem enviar dados além do PDF).
- **Riscos:** qualidade da leitura em PDF escaneado; custo baixo (o dono já liberou o Gemini pago).

---

## 6. Perguntas ao dono (com a recomendação que vale se não houver resposta)

1. **Aprovação do aditivo: basta um sócio?** Recomendo: sim, Thiago **ou** Charles (o banco também não exige dois).
2. **Gestor da área aprova antes ou só acompanha?** Recomendo: só acompanha e pode dar parecer, sem travar.
3. **Teto do aditivo sem justificativa extra?** Recomendo: nenhum (vazio), como a política de viagem; cada aditivo é decidido na hora.
4. **Ninguém responde em 1 hora: o que acontece?** Recomendo: nada é aprovado sozinho; lembrete aos 30 min, Wanessa e o gestor ligam aos 60 min.
5. **Carga à noite, com a Wanessa fora:** recomendo o outro sócio carregar; se não der, o aprovador carrega como exceção registrada e a Wanessa confere no dia seguinte.
6. **Peça comprada com aditivo entra em Compras?** Recomendo: não como compra (seria duplicada); só na prestação, com uma visão de leitura em Compras.
7. **Gasto do aditivo repassado ao cliente:** recomendo o campo "Repassar ao cliente? (a definir)" com tarefa ao Comercial quando "sim".
8. **Compra de contrato: quem pode marcar?** Recomendo: qualquer pessoa que informa compra; Compras e Financeiro conferem.
9. **IMED HCN:** é unidade de qual cliente IMED, e o contrato de insumos é com qual CNPJ? Recomendo cadastrar a unidade antes de reclassificar a REQ-2026-0017.
10. **Módulo de Contratos:** seguir pela ampliação do `CLI_CONTRATOS` (recomendado) e começar o cadastro por quais contratos? Recomendo: IMED (insumos e comodato), os contratos com ronda ou preventiva e a Brasmedical.
11. **Quem é o gestor de cada contrato?** Recomendo: Comercial para contratos com cliente, Matheus para fornecimento e comodato, Wanessa para contratos com fornecedor (aluguel, software).
12. **Cliente vê as obrigações no portal?** Recomendo: sim, as da Metrolabs e o cumprimento, sem valores.

---

## 7. Fontes consultadas

- Código: `SGO_Viagem*.js`, `SGO_RecargaCaju*.js`, `SGO_Caju_Pedidos.js`, `SGO_Caju_Api.js`, `SGO_Avisos_Gestao.js`, `SGO_Compras_Config.js`, `SGO_Compras_Informar.js`, `SGO_Compras_Requisicoes.js`, `SGO_PortalCliente_Config.js`, `SGO_PortalCliente_Contratos.js`, `SGO_Contratos_*.js`, `SGO_Licitacoes_Contratos.js`, `SGO_Representacao_Config.js`, `SGO_Assistencia_Config.js`, `SGO_Financeiro_ContasFixas.js`, `SGO_Comercial_Config.js`, `SGO_Inventario_Main.js` (todos em `output/financeiro-20261116/cand36`).
- Relatórios: `output/pedidos-20261118/p1/RELATORIO.md`, `output/pedidos-20261118/p4/RELATORIO.md`, `output/avisos-matheus-20261119/DIAGNOSTICO.md`, `output/financeiro-v2-20261119/DEFINICOES_WANESSA_20261119.md`, `output/financeiro-v2-20261119/ESPECIFICACAO.md`.
- Banco de produção (somente leitura, 19/11/2026): contagens de `CLI_CONTRATOS`, `LIC_CONTRATOS`, `REP_REPRESENTADAS`, `ATEC_RONDA_PLANOS`, `ATEC_CONFIG` (REGRAS), `CMP_REQUISICOES` (REQ-2026-0001 a 0020), `VIA_SOLICITACOES`, `VIA_CARGAS`, `RCJ_*`, `CJU_PEDIDOS`, `CAD_CLIENTES`, `CAD_UNIDADES`, colunas de `CAD_EQUIPAMENTOS`, `COM_REAJUSTES`, `COM_PROPOSTAS`.
