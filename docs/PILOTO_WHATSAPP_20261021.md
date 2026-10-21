# Piloto do WhatsApp — passo a passo para o dono

Data: 21/10/2026. Vale para o SGO+ e para o COMMAND, que mandam pelo mesmo número.

## O que mudou

- O número do WhatsApp oficial (Meta) é só do sistema.
- A Z-API saiu do sistema. Nenhuma mensagem sai por ela. O que chega por ela não entra no sistema: não vai para a Caixa de Entrada, nem para o bate-papo, nem para a IA.
- Durante o piloto, só as pessoas escolhidas recebem WhatsApp. As demais recebem os mesmos avisos no sistema e por e-mail.
- Clientes e contatos externos não recebem WhatsApp durante o piloto. Isso vale para o Atendente de IA, os avisos do Auvo ao cliente, o orçamento do chamado e o envio de documentos. O e-mail ao cliente continua como antes.
- Os avisos do COMMAND não aparecem mais no balão de conversas do SGO+. Eles continuam no sino do COMMAND.
- Na Caixa de Entrada do COMMAND, as entradas sem responsável ficam só com a gestão. A gestão atribui cada entrada a quem vai cuidar.

## Garantia dupla

1. O próprio sistema confere a lista antes de montar a mensagem. A mensagem que não sai fica registrada como "retida pelo piloto".
2. O servidor confere a lista em toda mensagem que vai para a Meta ou para a Z-API, venha do SGO+ ou do COMMAND. O número fora da lista é bloqueado e registrado. O telefone é comparado sem o 9: o mesmo número com ou sem o 9 vale igual.

Sem a lista gravada, o servidor não deixa sair nenhuma mensagem.

## Passo 1 — Meta

1. Abra o Gerenciador do WhatsApp da Meta (business.facebook.com).
2. Confira a forma de pagamento da conta. O erro 141006 é bloqueio de pagamento: enquanto ele existir, nenhuma mensagem sai.
3. Confira que o número cadastrado é o número do sistema, e não o de uma pessoa.
4. Confira que os modelos de mensagem estão aprovados, principalmente o `sgo_aviso_geral`.

## Passo 2 — Chaves e senhas (SGO+)

1. No SGO+, abra Administração > Chaves e senhas.
2. No cartão "WhatsApp oficial (Meta)", em "Provedor do WhatsApp em uso", escolha **meta** e toque em "Gravar".
3. Confira que o token e o identificador do número da Meta estão gravados.
4. Toque em "Situação dos modelos". O sistema guarda a situação de cada modelo. Modelo não aprovado não é usado: a mensagem vai pelo aviso geral, se ele estiver aprovado. Se nenhum estiver aprovado, a mensagem fica no sistema e no e-mail.
5. Desconecte a instância da Z-API no painel da Z-API. O sistema já não usa a Z-API; desconectar é a garantia física.

## Passo 3 — Tela do piloto

1. No SGO+, abra Administração > Piloto do WhatsApp. A tela é do Administrador e da Diretoria.
2. Confira o bloco "Situação": "Piloto ligado", "Provedor em uso: WhatsApp oficial (Meta)" e "Z-API desligada".
3. No bloco "Quem recebe pelo WhatsApp", deixe "Piloto ligado" marcado.
4. Marque as pessoas do piloto: você, as duas pessoas da equipe definidas para a primeira semana e o técnico escolhido. Use o campo de busca para achar pelo nome. O sistema não traz nomes gravados no código: a escolha é feita aqui.
5. Confira, abaixo do nome, se cada pessoa tem celular válido. Sem celular, a pessoa recebe só no sistema e por e-mail. O celular fica em Administração > Usuários > Celular.
6. Toque em "Gravar". A mensagem abaixo do botão diz quantas pessoas recebem pelo WhatsApp.

Sem nada gravado, vale a lista padrão: só o responsável pelo sistema.

## O que cada pessoa da lista vai receber

As mensagens que o SGO+ e o COMMAND já mandavam, com as regras de cada módulo (dia útil, horário de trabalho, limite de uma por dia onde existe):

- SGO+: avisos com ciência; resumo de Minhas atividades (só CLT); resumo da Caixa de decisões (só CLT); missões do Programa de conduta; avisos da Frota e do rastreador; reservas de veículo em risco (só CLT); avisos de O.S. do Auvo ao técnico e à gestão; bate-papo para quem está fora do sistema.
- COMMAND: avisos do sino no WhatsApp, cobranças das Demandas e lembretes do ponto, quando o administrador ligar cada um (hoje estão desligados).

Todas pelo WhatsApp oficial, com modelo aprovado na Meta.

## Acompanhar a semana

- Na mesma tela, o bloco "O que saiu, foi retido ou falhou" mostra cada mensagem do dia, do SGO+ e do COMMAND: hora, sistema, origem, para quem foi e a situação, com o motivo. Filtre por dia e por pessoa. O telefone aparece só para o Administrador.
- Todo dia às 18h, o responsável pelo sistema recebe por e-mail o resumo do dia, sem telefone.

## Liberar por etapas

1. Abra "Liberar uma área inteira" e marque a área. Todas as pessoas daquele perfil passam a receber.
2. Toque em "Gravar".
3. Para liberar todos, desmarque "Piloto ligado", toque em "Gravar" e confirme. A Z-API continua fora enquanto o provedor for "meta".

## Limpeza do que já entrou pela Z-API (aguarda aprovação)

Existe um procedimento no COMMAND que apaga só o que veio pela linha da Z-API, com cópia de segurança antes. Ele não roda sozinho. Primeiro ele mostra a contagem, sem apagar nada. Só depois da sua aprovação ele faz a cópia numa planilha nova, confere a cópia e apaga.

O que sai: as mensagens da linha da Z-API, as entradas de WhatsApp que vieram só por ela e não viraram chamado, negociação ou tarefa, o histórico e os avisos dessas entradas, as conversas do Atendente de IA dessa linha sem chamado e os recibos do webhook da Z-API. O que fica: as entradas que viraram alguma coisa, a linha da Z-API no cadastro e as conversas do bate-papo.
