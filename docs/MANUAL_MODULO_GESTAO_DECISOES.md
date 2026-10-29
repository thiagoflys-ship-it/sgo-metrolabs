# Caixa de decisões e Desempenho da gestão — manual do módulo

Versão de 20/10/2026. Telas no SGO+: **Gestão > Caixa de decisões** e **Gestão > Desempenho da gestão** (também no celular, no Início, e no COMMAND, menu **Caixa de decisões**).
Arquivos: `SGO_Gestao_Decisoes.js` (caixa, quem recebe, regras), `SGO_Gestao_Escada.js` (escada de cobrança e automações), `SGO_Gestao_Avaliacao.js` (avaliação do gestor e relatórios A4), `SGO_Gestao_RelatoriosEmpresa.js` (pacotes semanal e mensal dos relatórios da empresa e a Saúde da empresa), `JS_Gestao.html` (telas), `SGO_Ajuda_Gestao.js` (ajuda "Como usar esta tela").

## 1. Para que serve

O gestor que fica dias sem entrar no sistema não sabe o que espera por ele, e a Diretoria acaba cobrando os próprios líderes. A Caixa de decisões junta numa lista só tudo o que depende de um gestor ou da Diretoria, de todos os módulos, com quem decide, o prazo, há quanto tempo está parado e o botão que leva à tela de resolver. O sistema cobra sozinho, em escada, e mede o desempenho de cada gestor.

## 2. O que entra na caixa

A fonte é a central de pendências do SGO+ (a mesma do Início). Entram as pendências que são decisão da gestão:

| Módulo | Itens |
|---|---|
| Programa de conduta | homologar ocorrência, julgar contestação ou recurso, aprovar missão, sugestão de ocorrência (uma a uma), fechamento do mês |
| Frota | KM a conferir, devolução esquecida, multa sem condutor, multa vencendo ou vencida, CNH vencida ou com 7 dias ou menos, manutenção e documento do veículo (vencidos ou com 15 dias ou menos), avaria sem caso, comprovante não enviado, reserva em risco ou com problema, uso sem registro e alertas do rastreador, caso do Kanban em análise, plano de ação vencido, sugestão do copiloto de alta gravidade |
| Atividades | atividade atrasada da equipe, justificativa de atraso a avaliar (últimos 30 dias) |
| Avisos | aviso com prazo de leitura vencido e gente sem confirmar |
| Qualidade e Auvo | O.S. com registro incompleto, retirada com registro incompleto, O.S. aberta, O.S. sem vínculo, importação do Auvo parada (administrador) |
| Padrões e planos | padrão vencido, sem validade ou com 15 dias ou menos; plano de ação do Programa de conduta com prazo vencido |
| Acompanhamento | documentos, calibrações e laudos NR-13 vencidos dos clientes: aparecem em aba própria e no e-mail como contagem, mas não sobem a escada nem entram na avaliação (dependem do cliente) |

Novos itens que a central não tinha (homologar, julgar, missão, justificativa, caso, plano, copiloto) também aparecem no Início da gestão.

## 3. Quem recebe cada item

1. Área do item: a área da pessoa envolvida (Administração > Usuários > Áreas) ou, quando o item não é de uma pessoa, a área padrão do módulo (padrões e certificados: Metrologia; documentos de clientes: Comercial; NR-13 e Auvo: Técnica/Campo; Frota, Atividades e Avisos: Administrativo; Programa de conduta: RH; Qualidade: Qualidade). Todas configuráveis.
2. Responsável pela área (Caixa de decisões > Regras e responsáveis; só Administrador e Diretoria configuram). Pode ser Gestor, RH ou Financeiro. RH e Financeiro abrem a caixa e veem só os itens das áreas em que são responsáveis.
3. Ninguém decide sobre si mesmo: a pessoa envolvida e, no Programa de conduta, o fiscal que registrou saem da lista.
4. Programa de conduta que envolve alguém da gestão vai direto para a Diretoria.
5. Área sem responsável (ou só com a própria pessoa envolvida): reserva da Diretoria (perfil Diretoria e o dono do sistema; sem ninguém, os administradores).
6. Casos da Frota e planos de ação vão para quem conduz o caso ou criou o plano.

## 4. Idade, prazo e providência

- Cada item ganha um registro quando entra na caixa (`GES_DECISOES`) e sai sozinho quando a pendência some da origem. Itens que já existiam quando a caixa foi ligada começam a contar do dia em que a caixa os viu.
- Prazo de decisão: o da própria regra quando existe (prazo de homologação, de julgamento, de registro da sugestão, vencimento) ou a entrada mais N dias úteis do tipo (1 a 5).
- Parado: dias úteis desde a entrada ou desde a última providência. Fins de semana e feriados não contam (expediente da empresa).
- "Registrar providência": o que foi feito e até quando acompanhar (no máximo 10 dias). Conta como decisão tomada e pausa a escada até a data.
- "Ciente": só para justificativa de atraso; tira o item da caixa.
- Ocorrência que o sistema descartou porque o prazo de homologação venceu fica como "venceu sem decisão" e conta na avaliação.

## 5. Escada de cobrança

| Quando | Canal |
|---|---|
| Na hora | item na caixa, no Início da gestão e no balão do menu |
| Todo dia útil, a partir das 08:00 | UM e-mail por pessoa da gestão com o resumo do que espera por ela (só se houver algo), agrupado: paradas, prazo vencido, novas e demais, com o caminho de cada item |
| Parado há 2 dias úteis | entra na contagem do WhatsApp de resumo do dia do gestor (09:30, só CLT, só se ele ainda não abriu o sistema) |
| Parado há 5 dias úteis | escala para a Diretoria (aba "Com a Diretoria" e e-mail diário da Diretoria com o nome de quem está segurando) |
| Primeiro dia útil da semana, 08:00 | pacote semanal dos relatórios da empresa (seção 6A), em e-mail próprio; com o pacote desligado, o e-mail da Diretoria leva o relatório A4 semanal da gestão, como antes |
| Primeiro dia útil do mês | pacote mensal dos relatórios da empresa (seção 6A), começando pela "Saúde da empresa"; com o pacote desligado, os relatórios do mês anterior vão no e-mail da Diretoria, como antes |

Matriz de avisos (21/10/2026): o e-mail diário da gestão, a escalada e os relatórios da Diretoria saem dentro do e-mail de resumo do dia único de cada pessoa (com atividades, avisos e o resto, um e-mail só), e o WhatsApp da gestão é a contagem de decisões paradas no WhatsApp de resumo do dia. Cada envio continua registrado em `GES_ENVIOS` (EMAIL_GESTOR, EMAIL_DIRETORIA, WHATS_GESTOR). Decisões do Programa de conduta e do ponto vão só como contagem. Ver `docs/MANUAL_MATRIZ_DE_AVISOS.md`.

Regras: nunca à noite, fim de semana ou feriado; a Diretoria recebe um só e-mail por dia (as decisões dela, os escalados, as áreas sem gestor e os relatórios do dia); o mesmo item não é cobrado duas vezes no mesmo dia (cada envio fica em `GES_ENVIOS`). WhatsApp: no máximo uma mensagem por pessoa por dia somando atividades e gestão (no dia em que o gestor recebe o resumo da gestão, ele já leva a contagem das atividades dele), só no horário de trabalho, só para o vínculo liberado (padrão CLT). Modelo da Meta próprio: `sgo_gestao_resumo_dia` (até ser aprovado, sai pelo `sgo_aviso_geral`).

Tudo configurável em Regras e responsáveis (horas, dias úteis do WhatsApp e da Diretoria, liga e desliga de cada etapa e de cada automação). O horário de trabalho e os feriados continuam em Atividades da equipe > Avisos e horários.

## 6. Avaliação do gestor

Por gestor e por mês. É avaliado quem tem o perfil Gestor e quem responde por uma área (a Diretoria avalia, não é avaliada).

| Componente | Como é contado | Nota do componente | Peso padrão |
|---|---|---|---|
| Decidido no prazo | decisões até o prazo / decisões do mês mais prazos vencidos sem decisão | o próprio percentual | 30 |
| Tempo médio de decisão | dias úteis da entrada até a decisão | 100 até 1 dia útil; -25 por dia útil a mais | 15 |
| Itens vencidos | prazos que venceram no mês sem decisão até a data | 100 - 20 por item | 15 |
| Escalonamentos à Diretoria | itens dele parados até a Diretoria | 100 - 25 por item | 15 |
| Dias sem acessar | dias úteis do mês sem abrir o SGO+ (ou o COMMAND pela caixa), desde a ligação da caixa | 100 - 15 por dia | 10 |
| Decisões revertidas | ocorrências que ele homologou e foram anuladas | 100 - 25 por reversão | 5 |
| Atividades da equipe | % das atividades da área dele com prazo no mês sem atraso | o próprio percentual | 5 |
| Planos de ação | % dos planos dele com prazo no mês cumpridos no prazo | o próprio percentual | 5 |

Nota = média ponderada dos componentes com dado no mês (sem dado, o componente não entra e os pesos se redistribuem). Farol: verde a partir de 85, amarelo a partir de 70, vermelho abaixo. Pesos e faixas: só a Diretoria muda (Desempenho da gestão > Regra da nota). O mês fechado é congelado no primeiro dia útil do mês seguinte (`GES_AVALIACOES`).

Quem vê: o próprio gestor (só a dele) e a Diretoria (todas). Ninguém mais, nem na tela, nem no COMMAND, nem no relatório.

Falha grave recorrente (farol vermelho dois meses seguidos, ou 3 escalonamentos ou mais no mês) vira SUGESTÃO no Programa de conduta, visível e decidida só pela Diretoria. Nunca vira ocorrência sozinha.

Relatório A4 "Desempenho da gestão" (todos, para a Diretoria; ou só o do gestor, para ele): resumo, nota e farol por gestor, gráfico de notas só quando há dois ou mais gestores, itens que chegaram à Diretoria, prazos vencidos, dias sem acesso e a regra da nota. Texto montado dos números, sem IA (a avaliação de pessoas não sai do sistema). Guardado em "Gestão - Relatórios" (HTML e PDF, sem compartilhamento público).

## 6A. Relatórios da empresa (29/10/2026)

Código: `SGO_Gestao_RelatoriosEmpresa.js` (chamado pela rodada de 15 minutos, `Ges_rodada_`). Tela: Desempenho da gestão > Relatórios, bloco "Relatórios da empresa".

**Quem recebe.** Lista "Quem recebe os relatórios da empresa", gravada por id de usuário na propriedade `GES_RELATORIOS_EMPRESA_CFG`. Só a Diretoria e o Administrador mudam. Sem lista gravada (ou "Voltar ao padrão") vale o padrão: perfil Diretoria, o dono do sistema e quem é gestor da área Qualidade (Gestor ou Administrador com área Qualidade no cadastro, ou responsável pela Qualidade em Regras e responsáveis). Em produção, o padrão dá Thiago, Charles e Matheus Godoi. Pode desligar o envio: os links voltam ao e-mail diário da Diretoria.

**Regra de acesso de cada relatório** (vale para quem está na lista):

| Relatório | Quem recebe |
|---|---|
| Programa de conduta: relatório da equipe (mensal) e prestação de contas das missões | só quem vê o envolvido: Diretoria e Gestor de Qualidade (`Conduta_veIdentidadeUsuario_`) |
| Desempenho da gestão e Semanal da gestão (avaliação de gestores) | só a Diretoria, como na tela |
| Os demais | toda a lista |

O e-mail diz o que não foi e por quê. Quem não tem o direito nunca recebe relatório com nome de envolvido.

**Pacote semanal** (primeiro dia útil da semana, a partir das 08:00; semana anterior, segunda a domingo): Semanal da gestão; Programa de conduta, semanal da equipe; Programa de conduta, prestação de contas das missões do mês; Frota da semana (retiradas, alertas do rastreador, sugestões e decisões do copiloto; só com veículos cadastrados); Comercial da semana (propostas enviadas, aprovadas e recusadas com valor, oportunidades ganhas e perdidas, por vendedor, motivos de perda; só com o Comercial em uso); SEDNA da semana (cobranças das atividades atrasadas por nível e por pessoa, e quantas foram resolvidas, de `GES_ENVIOS` tipo SEDNA_ESCALA e das atividades).

**Pacote mensal** (primeiro dia útil do mês; mês anterior): Saúde da empresa (primeiro); Desempenho da gestão (avaliação dos gestores); Frota; Programa de conduta, relatório da equipe; Atividades da equipe; Comercial, Compras e Assistência quando em uso; fechamento do mês do Programa de conduta (a cópia gravada no fechamento, sem recalcular; mês ainda não fechado sai como "sem dado").

**Saúde da empresa** (A4, sem nomes de pessoas). Índice de 0 a 100 por área, só com registros do SGO+:
- Decisões no prazo: itens da Caixa de decisões da área decididos no mês até o prazo, sobre os decididos no mês mais os prazos que venceram no mês sem decisão (acompanhamento de clientes não entra).
- Atividades no prazo: atividades das pessoas da área com prazo no mês concluídas até o prazo, sobre todas com prazo no mês (canceladas e atendimentos de O.S. não entram).
- Índice da área: média simples dos dois que tiveram dado. Sem nenhum, "sem dado" (nunca zero).
- Programa de conduta: índice de conduta do mês (ICO; o do fechamento quando existe, senão a apuração até a emissão).
- Índice geral: média simples das áreas com dado e do Programa de conduta. Faixas: as do farol da avaliação (85 e 70).
- Comparação com o mês anterior pela mesma regra, em pontos.
- Melhorias e pendências (só contagens): planos de ação do Programa de conduta e da Qualidade, casos da Frota, Caixa de decisões e atividades da equipe — abertas no mês, resolvidas no mês, atrasadas e em aberto no fim do mês.

**Como sai.** Um relatório por rodada (a geração de PDF é demorada); o semanal e os mensais da gestão continuam gerados pela rotina de sempre (`Ges_gerarSemanal_`, `Ges_gerarMensal_`, tipos SEMANAL e MENSAL em `GES_ENVIOS`) e o pacote só espera por eles; os novos ficam como EMPRESA_ITEM. Tudo guardado em "Gestão - Relatórios" (ou na pasta do próprio módulo). O e-mail sai quando tudo ficou pronto ou na hora-limite (`GES_HORA_LIMITE_RELATORIOS`, 10:30) com o que ficou pronto e o motivo do resto; um por pessoa e por dia (semanal e mensal no mesmo dia vão juntos), registrado como EMPRESA_PACOTE (falha de envio tenta de novo na rodada seguinte). Só em dia útil e no expediente. Com o pacote ligado, o e-mail diário da Diretoria diz só "seguem em e-mail próprio" e não espera mais a hora-limite: o mesmo relatório não chega duas vezes no mesmo dia.

**Teste.** "Gerar e enviar agora (teste): semanal" ou "mensal" (Diretoria e Administrador): gera o que falta (até 4min30 por toque; o que já está pronto é reaproveitado) e manda o pacote só para quem clicou, com a mesma regra de acesso. Fica como EMPRESA_TESTE e não conta como envio do pacote de verdade.

## 7. Automações

| Automação | Regra |
|---|---|
| CNH ao condutor | e-mail direto ao condutor com 30, 15 e 7 dias do vencimento (um de cada, só em dia útil); só com 7 dias ou menos a CNH entra na caixa do gestor |
| Manutenção preventiva na agenda | manutenção prevista pela data ou pelo KM vira atividade do gestor da área da Frota em Minhas atividades (agenda e Gantt), uma por veículo e tipo a cada 60 dias |
| Atividade sem responsável | atividade aberta com responsável inativo, apagado ou vazio volta para quem lançou (ou para o gestor da área, ou para a Diretoria), com histórico e aviso |
| Relatórios do mês | gerados no primeiro dia útil do mês e enviados à lista dos relatórios da empresa (seção 6A); com o pacote desligado, à Diretoria |
| Copiloto da Frota | a lista das sugestões de alta gravidade sem decisão é atualizada a cada 3 horas para a caixa |
| Escalonamento por prioridade (26/10/2026) | atividade atrasada sobe em horas corridas depois da previsão vencer: nível 1 o responsável, nível 2 o gestor da área (e quem lançou, se for da gestão; sem ninguém, a Diretoria), nível 3 a Diretoria. Padrão: Urgente 15 min, 1 h e 4 h; Alta 1, 4 e 24 h; Normal 8, 48 e 120 h (5 dias; afrouxada pelo dono em 29/10/2026, antes 4, 24 e 72 h); Baixa 24, 72 e 168 h. Uma vez por nível, atividade e previsão; só no expediente (o que passou fora dele sai no começo do expediente, só o nível mais alto); uma mensagem por pessoa por rodada; eventos S71, S72 e S73 da matriz de avisos (e-mail na hora; WhatsApp só se marcado). Fica no histórico da atividade e em GES_ENVIOS (SEDNA_ESCALA) |
| Resumo do dia da gestão (26/10/2026) | a partir das 08:30, uma vez por dia, no Início de cada pessoa da gestão: atrasadas e que vencem hoje da equipe (áreas em que é responsável e o que lançou; Diretoria vê tudo), por onde começar, as dela e a central de pendências (total, críticas e os três maiores grupos, do maior para o menor, com o nome do tipo; desde 29/10/2026 — antes saíam os três primeiros na ordem da central). Atividade de O.S. da Assistência não conta como atrasada nem como "vence hoje" (quem manda é a O.S.). Texto pelas regras; com a chave da IA, a IA reescreve (até 3 pessoas por rodada) e só vale se passar no verificador (números e nomes só dos dados, sem formatação nem menção a IA) |

Os prazos do escalonamento, a hora do resumo e a IA ficam em Regras e responsáveis (Administrador e Diretoria). Código: SGO_Sedna.js, chamado pela rotina de 15 minutos.

## 8. Rotina

Gatilho `Gestao_rotinaDecisoes` a cada 15 minutos (instalado por `Gestao_garantirRotina_`, também conferido uma vez por dia quando alguém da gestão abre o sistema; no servidor, `scripts/instalar_gatilhos.ts`). Desde 21/10/2026 a rodada chama o resumo do dia único (`SGO_resumoDiaRodada_`, `SGO_Avisos_Matriz.js`), que também é chamado pela rotina das atividades de hora em hora; cada pessoa recebe no máximo um e-mail e um WhatsApp de resumo por dia.

## 9. COMMAND

Menu **Caixa de decisões** (permissão `gestao.decisoes`: Diretoria, Gestor operacional, supervisores e Gestor comercial), só leitura pela ponte (`gestao.caixa`, `gestao.resumo`, `gestao.avaliacao`), e cartão na Central "Decisões aguardando você". Providência, regras e relatórios ficam no SGO+.

## 10. Decisões para o dono

Padrões adotados (seguros e já funcionando), para confirmar ou mudar em Regras e responsáveis:
1. Áreas padrão de cada módulo (Frota em Administrativo, Programa de conduta em RH, documentos de clientes em Comercial).
2. Vencimentos de clientes como acompanhamento (fora da escada e da avaliação).
3. Janela da caixa para "a vencer": 15 dias (padrões, documentos e manutenção de veículo) e 7 dias (CNH).
4. Pausa máxima da providência: 10 dias.
5. Mensal no primeiro dia útil do mês (o dia 1 pode cair em fim de semana ou feriado).
6. Pesos e faixas do farol (30/15/15/15/10/5/5/5; 85 e 70).
7. Gatilho da sugestão no Programa de conduta (vermelho dois meses seguidos ou 3 escalonamentos no mês).
8. Cadastrar na Meta o modelo `sgo_gestao_resumo_dia` (texto em `sgo_servidor/docs/MODELOS_WHATSAPP_META.md`).
9. Configurar os gestores responsáveis por área (sem isso, tudo vai para a Diretoria).
10. Relatórios da empresa (29/10/2026): o Gestor de Qualidade está na lista, mas a avaliação dos gestores (Desempenho e Semanal da gestão) segue a regra da tela e vai só para a Diretoria. Se ele também deve receber, é uma mudança de regra de acesso, a decidir.
