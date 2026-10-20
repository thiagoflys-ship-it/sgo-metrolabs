# Manual do bate-papo (Comunicação do SGO+ e do COMMAND)

Atualizado em 20/10/2026. O mesmo balão de conversas aparece no SGO+ e no COMMAND; quem está num sistema conversa
com quem está no outro. Dentro do balão, o ícone de interrogação abre "Como usar esta tela" com este mesmo conteúdo,
resumido.

## 1. Para que serve

- Conversas diretas entre duas pessoas, grupos, a conversa da sua área e a conversa geral de todos.
- Avisos automáticos que vêm do outro sistema e comunicados da gestão (com "Li e estou ciente").
- Aviso no WhatsApp quando alguém manda mensagem direta para você, ou chama você com @ num grupo, e você está fora
  do sistema. A resposta pelo WhatsApp volta para a conversa.

## 2. Conversas e grupos

**Conversa com uma pessoa:** «+ Conversa» → buscar pelo nome ou pela área → tocar na pessoa → escrever. Enter envia;
Shift+Enter quebra a linha. Se a internet cair, o texto fica guardado na caixa.

**Criar um grupo:**
1. «+ Grupo» e escreva o nome do grupo.
2. Busque pelo nome ou pela área e marque as pessoas. Para chamar uma área inteira, escolha a área no filtro e toque
   em «Marcar a área inteira». O que foi marcado continua marcado enquanto você busca.
3. «Revisar e criar»: aparece "Você vai criar o grupo … com:" e a lista de nomes e áreas.
4. «Confirmar e criar» (ou «Voltar e ajustar»). A criação fica escrita na conversa.

**Ver quem está no grupo:** dentro do grupo, «Participantes». Mostra o nome, a área do cadastro e o sistema que cada
pessoa usa (SGO+, COMMAND ou os dois). Quem criou o grupo tem o selo "criou o grupo". Só quem está na conversa vê
essa lista.

**Adicionar, remover e mudar o nome:** só quem criou o grupo e a gestão (Administrador, Gestor e Diretoria no SGO+;
quem gere missões no COMMAND). Em «Participantes»: «+ Adicionar pessoas» → marcar → «Conferir» → «Confirmar»;
«Remover» ao lado do nome; ou escreva o nome novo e toque em «Salvar nome». Cada mudança fica numa linha tracejada
na conversa, com quem fez ("Ana adicionou Bruno.", "Gil removeu Caio.", "Ana mudou o nome do grupo de … para …").

**Sair do grupo:** em «Participantes», «Sair do grupo» e confirmar. Você deixa de ver o grupo; as mensagens não são
apagadas. Para voltar, peça a quem criou o grupo ou à gestão. Quem é removido também deixa de ver o grupo e recebe o
aviso "Você não está mais nesta conversa".

**Minha área:** abre a conversa de todas as pessoas da sua área no cadastro do SGO+ (Administração › Usuários › Área,
os códigos de Administração › Usuários › Áreas). Quem muda de área entra e sai sozinho, sem ninguém editar. Se o
botão não aparece, sua área ainda não foi preenchida. As conversas de setor antigas (pelo perfil de acesso) continuam
como estavam.

**Chamar alguém com @:** na caixa de mensagem de um grupo, escreva @ e o começo do nome e escolha a pessoa na lista
(Enter escolhe o primeiro). Só quem é chamado assim pode receber aviso fora do sistema.

## 3. Aviso no WhatsApp quando você está fora do sistema

Quando vira aviso:
- mensagem DIRETA para você, ou @ com o seu nome num grupo, na área ou na geral;
- você não está com o sistema aberto e visível há pelo menos 10 minutos (configurável) e ainda não leu;
- só em dia útil e no horário de trabalho (os mesmos de Atividades da equipe › Avisos e horários). O que chegar à
  noite, no fim de semana ou no feriado sai junto, num aviso só, no começo do expediente seguinte;
- no máximo 1 aviso por pessoa por hora e 4 por dia (configurável); o que passar espera e vai junto no aviso seguinte.

Mensagem comum de grupo (sem @) nunca vai para o WhatsApp. Mudança de participantes também não.

O aviso traz quem escreveu, o texto (ou "3 mensagens. A última: …") e o link do SGO+. Pelo provedor atual (Z-API) é
uma mensagem de texto do número da empresa; pelo WhatsApp oficial da Meta é o modelo `sgo_bate_papo_mensagem`.

Quem recebe por e-mail em vez de WhatsApp: vínculo PJ, vínculo não informado no cadastro, sem celular no cadastro e,
pela Meta, enquanto o modelo não estiver aprovado. Tudo no mesmo horário e com os mesmos limites.

**Desligar para você:** engrenagem do balão (Preferências) → desmarque "Avisar no meu WhatsApp (ou e-mail) quando eu
estiver fora do sistema" → «Salvar minha preferência». As mensagens continuam no balão.

Seu celular vem do cadastro do SGO+ (Administração › Usuários › Celular). Ele nunca aparece para os colegas nem é
gravado na planilha da Comunicação.

## 4. Responder pelo WhatsApp

- Segure o aviso no WhatsApp e toque em Responder: a resposta entra na mesma conversa, marcada "(pelo WhatsApp)".
- Mensagem nova, sem responder a um aviso: vai para a última conversa direta avisada a você nas últimas 24 horas.
- Se não houver: vai para a conversa "Recebidas pelo WhatsApp: Seu nome", que você e a gestão veem; a gestão lê e
  encaminha.
- Texto com código de demanda (DEM-…) continua indo para as Demandas do COMMAND, como antes.
- Foto, áudio, vídeo ou documento chega como aviso ("Ana enviou uma foto pelo WhatsApp.", com a legenda). O arquivo
  fica no celular de quem enviou: peça por e-mail se precisar dele.
- Só entra no bate-papo quem é da equipe, reconhecido pelo celular do cadastro. Número desconhecido (cliente) segue
  para a Caixa de Entrada e o atendente do COMMAND, como sempre.

## 5. Administração (ligar e acompanhar)

Engrenagem do balão → "Avisos fora do sistema (administração)" (só administrador):
- ligar ou desligar; minutos sem a pessoa no sistema antes de avisar (5 a 240); avisos por hora (1 a 6) e por dia
  (1 a 12);
- «Ver últimos envios e respostas»: para quem, de qual conversa, por qual canal, situação e motivo (sem telefone).

Desligada (padrão), nada sai; resposta a um aviso que já saiu ainda chega; mensagem solta de colaborador fica na
Caixa de Entrada do COMMAND, como antes.

Antes de ligar:
1. **Z-API (em uso):** no painel da Z-API, instância da Metrolabs → Webhooks → "Ao receber" = o endereço do webhook do
   COMMAND (COMMAND › Integrações mostra o endereço completo, com o segredo). Sem isso, os avisos saem mas as respostas
   não voltam.
2. **Meta (se o provedor for meta):** cadastrar e aprovar `sgo_bate_papo_mensagem`, assinar o webhook (campo
   messages) no painel de desenvolvedores e gravar META_APP_SECRET em Chaves e senhas. Passo a passo em
   `sgo_servidor/docs/MODELOS_WHATSAPP_META.md`, seção 9.
3. Conferir celulares e vínculos em SGO+ › Administração › Usuários.
4. Rotina: `SGO_comWhatsappRodada` a cada 5 min (instalada por `SGO_comInstalarGatilho`, que o instalador de gatilhos
   do servidor já roda).

## 6. Erros comuns

| Mensagem | O que fazer |
| --- | --- |
| "Só quem criou o grupo e a gestão mudam os participantes e o nome." | Peça a quem criou o grupo (selo "criou o grupo" em Participantes). |
| "Sua área ainda não está no cadastro…" | A gestão preenche a área em SGO+ › Administração › Usuários. |
| "A conversa de área é só de quem está na área…" | Crie um grupo e use «Marcar a área inteira». |
| "O grupo precisa de pelo menos duas pessoas…" | Adicione alguém antes de remover, ou use «Sair do grupo». |
| "Para sair do grupo, use o botão «Sair do grupo»." | Você tentou se remover pela lista; use o botão de sair. |
| Não recebi aviso no WhatsApp | Confira: era direta ou @ seu? estava em horário de trabalho? passou o limite da hora? é PJ (vai por e-mail)? o aviso está ligado em Preferências? o celular está no cadastro? |

## 7. Quem pode o quê

| Quem | Pode |
| --- | --- |
| Todos | Conversar, criar grupo, ver participantes das próprias conversas, sair de grupo, falar com a própria área e com todos, ligar ou desligar o próprio aviso fora do sistema. |
| Quem criou o grupo | Adicionar, remover e mudar o nome do grupo. |
| Gestão | O mesmo em qualquer grupo em que esteja; publicar comunicados; ler "Recebidas pelo WhatsApp". |
| Administrador | Ligar os avisos fora do sistema, ajustar minutos e limites, ver os últimos envios e respostas. |
