# Auditoria de preço, desconto e margem do Comercial — 10/11/2026

Escopo: código de produção em `output/poderes-20261110/base/legado` (referências `arquivo:linha` da versão
ANTES da correção, guardada em cópia; as linhas novas estão em `PRECOS_IMPLEMENTACAO.md`). Dados reais só
para medir o impacto: `precos-dump.txt` (política, 1.454 itens do catálogo, 1.024 propostas). Nada foi
publicado; não houve ssh nem commit.

## Caso que motivou

PROP-2026-0028 rev.00 (IMED Polifor), produto TRX-528-P "Fragmentadora de Papel Triturare": cadastrado pela
vendedora em 05/11 com preço de R$ 15.525,00 e sem custo; a proposta foi concluída PRONTA "dentro da
política" (fotografia gravada: `completa:false`, sobra parcial 68,75%). Com o custo de R$ 9.200,00
cadastrado depois, o piso é R$ 21.467,00 (conferido pelo código: custo × (1 − crédito 21,25%) ÷
(1 − 28,25% impostos de produto − 3% comissão − 35% sobra mínima)). Diferença: R$ 5.942 abaixo da regra
sem passar pela Diretoria. Hoje a rev.00 está SUBSTITUÍDA e a rev.01 está em RASCUNHO já com o custo
(ao concluir, iria para a Diretoria mesmo no código antigo).

## Brechas encontradas

Gravidade: ALTA = preço abaixo da regra sai sem a aprovação devida; MÉDIA = desconto acima da alçada ou
aprovação que não cobre o que foi enviado; BAIXA = diferença pequena ou caminho raro.

| # | Brecha | Onde (antes) | Cenário | Grav. | Explorada nos dados? | Situação |
|---|---|---|---|---|---|---|
| 1 | Item sem custo deixa a proposta PRONTA | `SGO_Comercial_Precificacao.js:273` (`ComPr_pisoItem_` devolve null sem custo), `:858` e `:883` (sobra parcial; preço mínimo null), `SGO_Comercial_Propostas.js:409-421` (`ComP_avaliarPolitica_` só olha desconto e sobra), `SGO_Comercial_Gestora.js:651` (só alerta) | Produto ou serviço sem custo: a sobra é calculada sem o custo (otimista) e nunca fica abaixo da mínima | ALTA | Sim. 27 propostas PRONTAS só por isso (lista abaixo), mais a PROP-2026-0028 rev.00 | Corrigida |
| 2 | Item avulso (fora do catálogo) nunca tem custo | `SGO_Comercial_Propostas.js:686` (custo só do catálogo; o da tela é ignorado) | Vendedor digita a descrição e qualquer preço | ALTA | Sim (avulsos entram na contagem do item 1) | Corrigida (vai para a Diretoria) |
| 3 | Vendedor cadastra produto/serviço novo com preço, sem custo e sem aprovação | `SGO_Comercial_Propostas.js:188` (vendedor proibido de informar custo) e `:266-268` (grava o preço direto) | Exatamente o caso real | ALTA | Sim (TRX-528-P e os itens sem custo usados nas PRONTAS de 30/10 a 10/11) | Corrigida |
| 4 | Proposta pronta antes do custo existir segue para o cliente | `SGO_Comercial_Propostas.js:1025` (gerar documento), `:1163` (assinar), `:1301` (link), `:1698` (marcar enviada), `:1906` (aceite/OC na pronta), `:1673` (envio pelo "Enviar documento"); `SGO_Comercial_Gestora.js:640` olha só a situação do desconto | Custo cadastrado depois da conclusão; documento, link e OC continuam liberados | ALTA | Sim: 32 das 35 PRONTAS de hoje seriam barradas (abaixo) | Corrigida (reavaliação na próxima ação) |
| 5 | Custo congelado na revisão | `SGO_Comercial_Propostas.js:686` (o custo do item anterior vence o do catálogo) | Custo sobe no catálogo; a nova revisão/conclusão continua com o custo velho | MÉDIA | Possível nas revisões; não medível no dump (sem histórico de custo) | Corrigida (vale o maior) |
| 6 | Alçada somada duas vezes | `SGO_Comercial_Propostas.js:247-248` (redução do vendedor no catálogo dentro da alçada) + `:679` (tabela da proposta = preço já reduzido) | 15% no catálogo + 15% na proposta = 27,75% sem aprovação | MÉDIA | Não medível no dump (sem PRECO_REFERENCIA) | Corrigida (a tabela da proposta é o preço de referência) |
| 7 | Aprovação sem registro do que foi aprovado | `SGO_Comercial_Propostas.js:957` e `:906-916` (só DESCONTO_SITUACAO e texto) | Aprovação do gestor (desconto) continua valendo se o custo sobe e a sobra cai abaixo da mínima; mudança por fora do rascunho não é percebida | MÉDIA | PROP-2026-0043 (aprovada; sobra 26,6% abaixo dos 35%) depende do perfil de quem aprovou | Corrigida (registro + conferência) |
| 8 | Voltar para rascunho / nova revisão reaproveitando aprovação | `SGO_Comercial_Propostas.js:972-1003` e `:1730` | — | — | Não: ambos zeram DESCONTO_SITUACAO e o rascunho só é editado em RASCUNHO | Já estava correto (teste B7 prova) |
| 9 | Envio, link, aceite com proposta não PRONTA | `:1025`, `:1163`, `:1301`, `:1698`, `:1906` | — | — | Não: todos exigem PRONTA (ou ENVIADA) | Já estava correto; a tela ganhou a conferência antes do "Enviar ao cliente" (teste B12) |
| 10 | Envio pelo "Enviar documento" com documento gerado antes | `SGO_Comercial_Propostas.js:1673-1695` | PDF de proposta pronta antiga sai pela janela genérica de envio | MÉDIA | Possível para as 32 PRONTAS barradas que já têm PDF | Mitigada: a tela confere antes de abrir a janela; se o envio já aconteceu, fica ENVIADA (fato), com histórico e aviso por e-mail à Diretoria |
| 11 | Item abaixo do piso compensado por outro item (subsídio cruzado) | `SGO_Comercial_Precificacao.js:938` (só aviso por item), `SGO_Comercial_Ficha.js` PRECO_ABAIXO_MINIMO não grave | Sobra total ≥ 35% com um item abaixo do piso | BAIXA | Sim: PROP-2026-0013, 0014, 0015, 0041, 0043 têm itens abaixo do piso | Decisão do dono (a política escrita é de sobra total) |
| 12 | Marcar "licitação ou contrato" tira o acréscimo de urgência sem contar como desconto | `SGO_Comercial_Precificacao.js:348` | Prazo urgente com preço normal | BAIXA | Não medível | Decisão do dono |
| 13 | Arredondamento do desconto a 2 casas | `SGO_Comercial_Propostas.js:390` | 15,004% conta como 15,00% | BAIXA | Irrelevante (< R$ 0,01 em R$ 200 mil) | Mantido |
| 14 | "Marcar como ganha" sem proposta | `SGO_Comercial_Oportunidades.js:562-587` | Ganha sem aceite; não gera pedido (passar aos setores exige proposta APROVADA) | BAIXA | — | Mantido (sem efeito em preço); o aceite na proposta pronta agora passa pela conferência |
| 15 | Financeiro altera preço e custo do catálogo sem aprovação; gestão cria produto sem custo | `SGO_Comercial_Propostas.js:177-179` | Por desenho (acesso completo ao catálogo) | BAIXA | — | Decisão do dono (a proposta com item sem custo já vai para a Diretoria) |
| 16 | Diretoria conclui/aprova a própria proposta com exceção | `SGO_Comercial_Propostas.js:906`, `:949` | Segregação de funções | BAIXA | — | Decisão do dono |

Conferidos sem brecha: itens automáticos de deslocamento e frete (o preço digitado abaixo de custo +
impostos sai da sobra, `Precificacao.js:316-319`; o desconto geral não os reduz), viagem diluída (entra no
custo da sobra), impostos por unidade emissora (a proposta usa a unidade dela, `Precificacao.js:79-86` e
`:354`), "impostos inclusos" (a sobra é sempre depois dos impostos), desconto geral × por item (somam no
mesmo percentual, `Propostas.js:367-394`; item acima da tabela não compensa outro abaixo), modo investimento
(só suspende a cadência; preço e validade iguais), Orçamentista (grava pelo mesmo `ComP_salvar_` e conclui
pelo mesmo caminho), importação do CRM (rotina de carga única; as ORC- aprovadas são histórico),
Licitações (aprovação própria da Diretoria com hash do conteúdo e pendência para item sem custo,
`SGO_Licitacoes_Proposta.js:319`, `:748-777`).

## Impacto nos dados reais (estimativa com o código corrigido sobre o dump)

Propostas PRONTAS hoje: 35. Na próxima ação (gerar documento, enviar, assinar, link, marcar enviada,
registrar aceite) seriam barradas com a mensagem de "Voltar para rascunho" e concluir de novo:

- Item sem custo (27): PROP-2026-0009, 0012, 0017, 0019, 0020, 0021, 0022, 0023, 0024, 0025, 0026, 0029,
  0030, 0038, 0039, 0040, 0041, 0044, 0045, 0046, 0048, 0049, 0050, 0051, 0052, 0054, 0055 (Mônica Souza,
  exceto 0009 de Charles Teixeira e 0039 de Matheus Godoi). Soma: R$ 686.510,38 em propostas.
- Sobra abaixo da mínima com a política atual (4): PROP-2026-0013, 0014, 0015 e ORC-20261022-2010
  (concluídas em 30/10 com a política versão 2: 46%, 41%; hoje 26,6% e 22,5%, depois dos impostos do
  Lucro Real de 01/11).
- PROP-2026-0043 (aprovada por Charles Hytley; sobra 26,6%): passa se ele tem perfil Diretoria ou
  Administrador (aprovação antiga vale quando foi da Diretoria); senão é barrada.
- Passam: PROP-2026-0005, 0008, 0042.

Enviadas, aprovadas pelo cliente e recusadas não são bloqueadas (sem efeito retroativo). Já exploradas
(aprovadas pelo cliente com item sem custo; com o custo de hoje, item abaixo do piso): ORC-20261007-1957,
ORC-20251211-1040, ORC-20260505-1280, ORC-20260504-1270, ORC-20260701-1555, ORC-20260619-1476,
ORC-20260423-1247, ORC-20260617-1469, ORC-20260616-1459, ORC-20260605-1401, ORC-20260529-1380,
ORC-20260526-1363, ORC-20251210-1033, ORC-20260921-1902 (todas importadas do CRM antigo). Catálogo:
544 itens ativos sem custo (414 produtos) e 168 com preço zero.

Observação: a estimativa não tem o DESLOCAMENTO_JSON das propostas (não está no dump); a conta na produção
pode diferir nas propostas com viagem.

## O que foi corrigido

1. Item sem custo (produto ou serviço, do catálogo ou avulso; itens automáticos ficam fora) e item com o
   preço do catálogo ainda não aprovado levam a conclusão para AGUARDANDO_APROVACAO na alçada da Diretoria,
   com o motivo "item sem custo: item N (código, descrição)". O gestor comercial não aprova; a Diretoria
   aprova com a fundamentação. A tela avisa antes de concluir (resposta do salvar, passo 4 e caixa da
   política) e diz como evitar (custo pela gestão ou pelo Financeiro).
2. A avaliação usa o custo atual do catálogo (o maior entre o gravado no item e o do catálogo); a conclusão
   grava esse custo no item.
3. Produto novo da equipe comercial exige o custo de compra (não aceita preço abaixo dele); o preço de
   qualquer item novo da equipe fica "aguardando aprovação" (fluxo PRECO_PEDIDO existente, Caixa de
   decisões e aviso à gestão). Aprovado: libera; negado: o item é arquivado. A equipe continua sem
   informar custo de serviço e sem mudar o custo de item já cadastrado.
4. A redução feita pela equipe no catálogo não vira tabela nova da proposta: a tabela é o preço de
   referência e a redução soma com o desconto na mesma alçada.
5. Toda aprovação (decisão do gestor/Diretoria ou exceção na conclusão) grava em
   `PRECIFICACAO_JSON.aprovacao` quem aprovou, se foi a Diretoria, o texto, os motivos aprovados, a sobra,
   o desconto e a marca dos itens/preços/desconto/viagem.
6. Antes de gerar o documento, assinar pela Metrolab, enviar o link, marcar como enviada, registrar o
   aceite/OC na proposta pronta e abrir a janela "Enviar ao cliente", o preço é conferido de novo: proposta
   concluída "dentro da política" que hoje não passaria, aprovação que não cobre o motivo atual, conteúdo
   mudado depois da aprovação, sobra que caiu abaixo da aprovada, ou aprovação antiga que não foi da
   Diretoria quando hoje só ela aprova. A mensagem diz o quê, por quê e como resolver.
7. Envio já feito pela janela genérica: a proposta passa a ENVIADA (o fato), com histórico
   "PRECO_SEM_APROVACAO" e aviso por e-mail à Diretoria.
8. Painel da gestão (gestora) lista proposta com item sem custo sem aprovação como problema grave; ajuda
   do Comercial atualizada.

A fórmula da política e os percentuais não mudaram.

## Para decisão do dono

1. Subsídio cruzado (item abaixo do piso compensado por outro): hoje só alerta. Exigir aprovação por
   item? (5 PRONTAS seriam afetadas.)
2. Propostas concluídas com a política anterior (PROP-2026-0013, 0014, 0015, ORC-20261022-2010): manter a
   reavaliação pela política de hoje (como está) ou honrar a política da época da conclusão?
3. Custo obrigatório também quando a gestão comercial ou o Financeiro cadastram PRODUTO (hoje não é; a
   proposta com o item vai para a Diretoria).
4. Aumento de preço pela equipe no catálogo continua direto (não reduz a margem). Quer que qualquer
   mudança de preço da equipe fique pendente?
5. Diretoria aprovar a própria proposta e "licitação ou contrato" sem acréscimo de urgência sem aprovação.
6. Saneamento: 544 itens ativos sem custo no catálogo (414 produtos) e 168 com preço zero. Enquanto não
   tiverem custo, cada proposta com eles vai para a Diretoria.
7. Antes de publicar: avisar a equipe de que 32 propostas prontas vão pedir "Voltar para rascunho" e nova
   conclusão (as de item sem custo irão para a Diretoria).
