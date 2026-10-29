# Manual do módulo Representação

Metrolabs · SGO+ · versão de 29/10/2026 · equipe da Metrolabs

## 1. Para que serve

O módulo Representação é a área do SGO+ em que a empresa representada (Brasmedical) aciona a Metrolabs para atendimento técnico aos clientes finais dos equipamentos dela e acompanha cada pedido até o encerramento. Do lado da Metrolabs, o mesmo módulo reúne a fila de pedidos, as conversas com a representada, o cadastro da representada e o catálogo de modelos. O pedido aceito vira chamado da Assistência técnica, com a marca da representada, e segue a triagem, a agenda, a O.S., o aplicativo do técnico e o relatório de sempre.

## 2. Como a representada entra

- A pessoa da representada entra pelo login normal do SGO+, com usuário e senha, no perfil "Representada".
- A conta é criada em Administração > Usuários: perfil Representada, a representada (empresa) e o papel dela: administrador da representada, atendente, financeiro de garantia ou leitura.
- O perfil Representada vê só o módulo Representação. O servidor recusa qualquer outra função do SGO+ para essa sessão, e a conta não aparece nas listas de pessoas (responsáveis, avisos internos, bate-papo, conduta, ponto, atividades).
- Representada inativa (Representação > Representadas) ou conta sem representada: a pessoa não entra, e a mensagem diz o motivo.
- Não há troca da própria senha pela pessoa nesta etapa: a senha é definida e redefinida em Administração > Usuários, como para as demais contas.

## 3. Primeira configuração

1. Representação > Representadas > "Nova representada": nome, CNPJ, contrato, vigência, contato e prazos.
2. Prazos (padrão do estudo, configuráveis por representada): aceite do pedido em 240 minutos úteis (4 horas), alerta ao responsável a 75% do prazo, chamado sem registro em 3 dias úteis.
3. Opções: consulta de CNPJ na base pública da Receita ao cadastrar cliente (ligada no padrão) e cancelamento pela representada antes da visita, com motivo (ligado no padrão).
4. Representação > Catálogo de modelos: código, nome, tipo de equipamento, família, garantia em meses e, se houver, o padrão do número de série. Sem modelo, a representada não cadastra equipamento.
5. Assistência técnica > Regras da assistência > Representação: marque quem responde pela conta da representada. Sem ninguém marcado, vale quem faz a triagem.
6. Administração > Usuários: crie as contas da representada.

## 4. Pedidos

- A aba "Pedidos" mostra a fila: representada, cliente, cidade, equipamento e o prazo de aceite (verde em dia, amarelo em risco, vermelho vencido, cinza pausado).
- Aceitar: escolha a prioridade (sem escolha, P2 para equipamento parado e P3 para os demais) e, se souber, o tipo de serviço. Vira chamado CH-AAAA-NNNN com a representada, o protocolo dela e o enquadramento pretendido. A representada recebe e-mail.
- Pedir complemento: o pedido volta para a representada com a pergunta e o prazo de aceite fica pausado até a resposta.
- Recusar com motivo: a representada vê o motivo e recebe e-mail.
- Os mesmos botões aparecem em Assistência técnica > Solicitações dos clientes, com o selo roxo da representada.

## 5. Alertas de prazo

| Marco | Quem recebe | Onde |
|---|---|---|
| Pedido novo | Responsável pela representação (sem ninguém, quem faz a triagem) | Aviso na Assistência e e-mail na hora (RP01; RP02 se o equipamento está parado) |
| 75% do prazo de aceite | Responsável pela representação | Central de pendências e e-mail uma vez (RP07) |
| Prazo de aceite vencido | Responsável e gestão da área Técnica | Central de pendências, Caixa de decisões e e-mail uma vez (RP07) |
| Chamado sem registro em 3 dias úteis | Responsável pela representação | Central de pendências, Caixa de decisões e e-mail uma vez por período parado (RP08) |

O tempo com complemento pedido não conta. Os avisos seguem a Matriz de avisos (Administração > Matriz de avisos, módulo Representação); nesta etapa nada sai pelo WhatsApp.

## 6. Conversas

- Cada pedido e cada chamado tem conversa própria; cada representada tem um canal geral.
- A mensagem da Metrolabs vai por e-mail à representada (quem abriu o pedido e o administrador dela).
- "Nota interna" fica só com a equipe (amarela, tracejada). Nada é apagado.
- A mensagem da representada avisa o responsável pela representação e o técnico do chamado.

## 7. Na Assistência técnica

- Filtro "Representação" na lista de chamados e selo roxo com o nome da representada.
- Parte "Representação" na ficha do chamado: protocolo, enquadramento pretendido, relato completo (código de erro, risco, o que já foi tentado), contato no local, arquivos e número de mensagens.
- Linha do tempo com três públicos: interno (sem marca), representada e cliente final. O que é registrado para o cliente final aparece também para a representada.

## 8. O que a representada vê e o que nunca vê

- Vê: os pedidos e chamados da empresa dela, a etapa (Enviado, Complemento pedido, Recusado, Aceito em análise, Aguardando aprovação de orçamento, Aguardando peça, Visita a agendar ou agendada, Em atendimento, Concluído, Encerrado, Cancelado), a data e o técnico da visita, a linha do tempo pública, os arquivos que ela enviou, a conversa e os equipamentos dos pedidos dela e os que ela cadastrou.
- Busca cliente só pelo CNPJ ou CPF completo e equipamento só pela série exata, com limite de 20 buscas em 15 minutos (contando achou e não achou). Série cadastrada em outro cliente: a tela pede para falar com a Metrolabs, sem dizer qual cliente.
- Nunca vê: outros clientes, outras representadas, notas internas, valores, registros internos do chamado, o restante do SGO+.

## 9. Cadastros feitos pela representada

- Cliente completo (CNPJ ou CPF válido, endereço em partes, contato com e-mail e telefone) com "Ciente"; unidade com cidade e UF.
- Equipamento com modelo do catálogo, série, data de instalação, nota fiscal de venda (número, data e arquivo), revenda, setor, patrimônio e foto da etiqueta. Garantia calculada: data da instalação (ou da nota) mais os meses do modelo.
- Tudo fica com a origem "REPRESENTADA", quem cadastrou e o "Ciente" com data e hora, e entra em Cadastros > Correções de cadastro e no histórico dos cadastros.

## 10. Registro de ações

A aba "Registro de ações" mostra buscas, cadastros, pedidos e cancelamentos das representadas, com nome, data e hora. O administrador da representada vê o da própria equipe.

## 11. Próximas etapas do projeto (ainda não estão no módulo)

Marcos da visita, impedimentos, relatório e aceite do encerramento pela representada; remessa de peças com rastreio; garantia, tabela de preços e custos; fechamento mensal; painéis, Gantt e Kanban da carteira; andamento automático por e-mail ao cliente final e à representada com link público só daquele chamado; consulta automática de rastreio (Correios primeiro, com a chave configurada em Chaves e senhas; sem chave, rastreio manual); relatório final A4.
