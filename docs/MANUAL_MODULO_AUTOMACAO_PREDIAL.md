# Manual do módulo Segurança e automação predial do SGO+

Versão de 27/10/2026 (cota da Tuya: eventos pelo serviço de mensagens, consulta econômica, modo econômico, sentinela e aba "Saúde da infraestrutura"; antes: 23/10/2026, portões de toda a equipe, abrir e fechar com posição do portão, abertura automática pela campainha). Tela: Segurança predial > Segurança e automação predial (abas Dispositivos, Permissões, Auditoria e Saúde da infraestrutura para a administração). Credenciais em Administração > Chaves e senhas > Automação predial (Tuya).

## Para que serve

Os portões da empresa e a porta da Diretoria, que hoje são acionados pelo aplicativo Smart Life, passam a ser administrados pelo SGO+ pela nuvem do mesmo aplicativo (plataforma Tuya). O SGO+ mostra os dispositivos por unidade e localização, lê o estado, envia o comando de abertura a quem tem permissão e registra tudo: quem pediu, quando, de qual unidade, o que a nuvem respondeu e se o dispositivo confirmou a execução.

O módulo foi construído sobre o que o SGO+ já tinha: a sessão e os perfis de acesso, o módulo Chaves e senhas, o padrão de comando solicitado, aceito e confirmado do bloqueio da partida da Frota, o registro só-inclusão com resumo encadeado, as pendências do Início e a matriz de avisos.

## Quem faz o quê

Quem é diretor (decisão do dono, 22/10/2026): quem tem o perfil Diretoria, ou o vínculo de trabalho Diretoria no cadastro de usuários (Administração > Usuários), ou é o responsável pelo sistema. Uma regra só, conferida no servidor.

Diretores: veem, abrem e fecham os portões; veem a porta da Diretoria; sincronizam com o Smart Life; administram os dispositivos; homologam cada dispositivo depois do teste presencial; consultam todo o registro e toda a auditoria.

Porta da Diretoria ("minha sala é para o meu login ter acesso, os demais não", dono): o responsável pelo sistema destrava por padrão, sem permissão gravada. Outro diretor só destrava se o responsável pelo sistema conceder a permissão "Acionar" (com vigência, se quiser) em Permissões; só ele concede e revoga a permissão da porta, e só para diretores. Quem destrava a porta também liga e desliga a abertura automática pela campainha.

Administrador que não é diretor: vê, abre e fecha os portões; sincroniza; administra os portões; consulta o registro e a auditoria dos portões. Não vê a porta da Diretoria (só a contagem de dispositivos restritos).

Demais perfis internos (Gestor, RH, Financeiro, Técnico, Metrologia, Comercial), decisão do dono de 23/10/2026: depois da implantação, veem, abrem e fecham os portões, sem permissão individual (atalho "Portões" no Início do celular). No registro de rastreabilidade, cada um vê só os próprios comandos. A porta da Diretoria continua oculta para eles.

Implantação: enquanto a automação está Desligada em Chaves e senhas ou nenhum dispositivo foi homologado, o item "Segurança predial" do menu, os atalhos e a própria tela são só do Administrador e dos diretores; o servidor recusa os demais com a explicação. Depois, aparecem para toda a equipe interna.

Cliente: não acessa.

Todas as regras são conferidas no servidor em cada chamada. A tela só mostra o que o servidor devolve; a porta da Diretoria nem chega ao navegador de quem não é Diretoria.

## Abrir em um toque (celular e computador)

Quem pode abrir algum portão (ou a porta) vê os botões grandes:

- No celular: atalho "Portões" no Início, que abre a tela com o bloco "Abrir agora" no topo, botões de pelo menos 56 px por dispositivo ("Abrir portão" e, no portão com abrir e fechar, "Fechar portão"), com a posição em selo grande e o estado ao lado (Online ou Offline, último comando e a situação: "Execução confirmada", "Aceito, sem confirmação", "Simulado").
- No computador: os mesmos botões no Início e no topo da tela do módulo.
- Quem não pode acionar nenhum dispositivo não vê o atalho nem os botões.

Posição do portão: o selo grande mostra "Aberto" (laranja) ou "Fechado" (verde) pelo sensor do portão e "Abrindo…" ou "Fechando…" (azul) durante o percurso depois de um comando (o tempo de percurso informado pelo portão, ou 30 segundos). Com a tela aberta e visível, o SGO+ atualiza a posição no ritmo que o servidor indica (desde 27/10/2026, para não esgotar a cota da Tuya): a cada 3 segundos durante o percurso de um comando; com o portão parado, pelos eventos da Tuya (em segundos, sem gastar chamada) ou, sem eles, com releitura na nuvem no máximo a cada 10 minutos (leitura compartilhada entre todas as telas; quando o minuto já tem muitas chamadas, a tela cede a vez aos comandos). Com a aba em segundo plano, a tela não consulta nada e volta a consultar quando a aba aparece. Ela só troca os selos, sem redesenhar a tela. "Ler estado" lê na hora. Quando a posição muda, por qualquer meio (SGO+, controle remoto ou aplicativo), aparece no topo o aviso "Portão ... abriu às hh:mm:ss" ou "fechou às hh:mm:ss". Portão sem sensor (pedestre) mostra "Posição: sem sensor".

Nada para digitar: toque em "Abrir portão", "Fechar portão" ou "Destravar a porta", confira o nome na janela grande e toque em "Sim, abrir agora" ou "Sim, fechar agora" (ou "Cancelar"). A janela leva um código de uso único, válido por 60 segundos, emitido pelo servidor para o seu usuário, aquele dispositivo e aquela solicitação; sem ele (por exemplo, uma chamada direta sem passar pela janela) o servidor recusa e registra.

## O caminho de um comando

1. Solicitado. O SGO+ confere a sessão, a permissão no dispositivo, o código da janela de confirmação, se o dispositivo está ativo e compatível, e os limites de frequência. Grava a solicitação com o identificador da operação. Se qualquer regra falha, a solicitação fica registrada como negada, com o motivo, e a tela explica o que fazer.
2. Aceito. A nuvem da Tuya respondeu que recebeu o comando. O SGO+ grava o código HTTP, o código da resposta e o identificador da chamada (tid).
3. Execução confirmada. O SGO+ espera alguns segundos, relê o estado do dispositivo e procura a mudança (ou, na fechadura, o registro de abertura). Encontrou: "Execução confirmada". Não encontrou: "Aceito pela API, sem confirmação": a gestão é avisada (evento S66 da matriz de avisos), o comando entra nas pendências do Início e o botão "Conferir agora" relê o estado por até 15 minutos.

A nuvem aceitar não quer dizer porta aberta. Só a execução confirmada quer dizer isso.

Portão com sensor e abrir e fechar (garagem), desde 23/10/2026: a execução é o sensor na posição pedida (aberto para abrir, fechado para fechar). O SGO+ relê o estado até três vezes (cerca de 8 segundos). Se o portão ainda está no percurso, a resposta é "Comando aceito: o portão está abrindo/fechando", sem aviso à gestão, e a confirmação vem depois, quando o sensor chegar: pela tela aberta (a cada 3 segundos no percurso), pelo evento do sensor ou pela rotina de 1 minuto do servidor, por até 15 minutos. O selo da situação do último comando só aparece nesses 15 minutos.

## Simulação e comando real

Enquanto a chave "Automação predial ligada" está Desligada em Chaves e senhas, ou o dispositivo não foi homologado pela Diretoria, o SGO+ trabalha em simulação: registra o que teria feito e nada sai do servidor. O cartão mostra o selo "Simulação" e o motivo.

O comando real exige as duas coisas: automação Ligada e dispositivo homologado. A homologação é feita por um diretor, no cartão, em "Administrar" > "Homologar (depois do teste presencial)", com a descrição do teste (nada mais para digitar). Pode ser retirada a qualquer momento, com motivo.

## Limites de proteção

- Cada clique gera um identificador de operação. O mesmo identificador nunca é executado duas vezes: a segunda chamada devolve o resultado da primeira.
- No máximo 1 comando por dispositivo a cada 10 segundos.
- No máximo 5 comandos por pessoa por minuto.
- Na fechadura, o mesmo comando não é repetido enquanto o anterior está sem resultado há menos de 60 segundos. Nos portões vale o intervalo de 10 segundos e, na garagem, o percurso do portão.
- No máximo 90 chamadas por minuto à nuvem da Tuya, com 300 milissegundos entre chamadas (a leitura de posição para a tela para quando o minuto passa de 70 chamadas). Desde 27/10/2026 vale também o orçamento do mês (seção "Cota da Tuya").
- Todo comando exige o toque em "Sim, abrir agora" na janela (código de uso único de 60 segundos).

## Dispositivos

Depois de "Sincronizar com o Smart Life", cada dispositivo da conta do aplicativo ligada ao projeto vira um cartão com: nome, tipo (portão ou acesso, fechadura), unidade, localização, situação (online ou offline), estado lido, último comando, homologação e os botões que o seu perfil permite.

A sincronização só lê. Ela identifica a categoria do produto e os comandos que o dispositivo suporta e monta a compatibilidade:

- Portões e acessos (abridor de portão ou garagem, motor, interruptor, acionador): comando de abertura "switch_1: true" (pulso), "switch: true" ou "control: open". Se o dispositivo não informa nenhum deles, o cartão diz "Não disponível pela API" e o Administrador pode definir o comando à mão em "Administrar", desde que esteja na lista de comandos do dispositivo.
- Fechaduras (residencial, residencial Pro, controle de acesso, hotel, comercial, com câmera, cofre): destravamento só pelo fluxo de bilhete temporário da nuvem (Smart Lock Open API), e só quando o modelo oferece abertura remota pela nuvem. Se não oferece, o cartão diz "Não disponível pela API" com o porquê; a abertura continua pelo aplicativo Smart Life ou na própria porta, e o SGO+ mostra o estado e os registros quando a nuvem os fornece.
- Outras categorias: só consulta.

Fechaduras entram restritas à Diretoria. Só um diretor marca ou desmarca "Restrito à Diretoria".

"Administrar" permite trocar o nome no SGO+, escolher a unidade (do cadastro de unidades ou em texto, por exemplo METROLABS — MATRIZ GOIÂNIA), a localização, desativar o dispositivo e, nos portões, ajustar o comando de abertura. Nada é apagado: dispositivo removido do Smart Life continua no cadastro, e o Administrador o desativa.

## Porta da Diretoria: abrir quando tocam a campainha

A fechadura da Porta da Diretoria (Wifi Smart Lock, conferida em 22/10/2026 só com leitura) não tem abertura remota livre pela nuvem. Ela abre um pedido quando tocam a campainha: o ponto unlock_request conta o tempo do pedido (até 90 segundos) e, só nessa janela, a nuvem aceita a resposta reply_unlock_request (abrir ou recusar). É o mesmo botão que o aplicativo Smart Life mostra.

No SGO+: com a tela Segurança predial ou o Início aberto, quem pode destravar a porta vê, em até 3 segundos, "Campainha tocou às hh:mm:ss — pedido válido por N s", com a contagem e os botões "Abrir agora" e "Recusar" (com a janela de confirmação e o código de uso único). Fora do pedido não há botão. Cada pedido aceita uma resposta só; se o tempo acabar antes do "Sim", o SGO+ recusa com a explicação e nada é enviado. A abertura é confirmada pelo registro de abertura remota da própria fechadura (unlock_app) ou pela porta aberta (closed_opened); digital, senha ou cartão de quem está na porta não contam como confirmação do SGO+.

Desde 27/10/2026: com os eventos da Tuya ligados, o pedido chega ao servidor no momento do toque e a tela mostra em segundos, sem gastar chamada. Sem os eventos, a tela (aberta e visível) usa a consulta econômica: uma leitura da fechadura vale por 2 minutos para todas as telas e rotinas, e a tela avisa o atraso; o botão "Verificar campainha agora" lê na hora (vale até no modo econômico). Uma rotina do servidor, a cada minuto, avisa quem pode destravar (evento S67: no sistema; WhatsApp só para quem está liberado no piloto). Como o pedido dura cerca de 60 a 90 segundos, o aviso pode chegar perto do fim: para atender, deixe a tela aberta.

## Porta da Diretoria: abertura automática pela campainha

Pedido do dono (23/10/2026): uma opção para os diretores marcarem "abrir automaticamente quando alguém tocar a campainha"; desmarcada, tudo continua como acima.

- Quem liga e desliga: quem destrava a porta (o responsável pelo sistema, ou o diretor com a permissão "Acionar" dele). A caixa "Abrir automaticamente quando tocarem a campainha" fica no bloco da porta, no topo da tela e no Início. Ao ligar, uma janela explica que a porta vai abrir sem ninguém confirmar; ao desligar, não há janela.
- Como funciona: com a opção ligada, o SGO+ responde "abrir" (reply_unlock_request = true) sozinho, uma vez por pedido. Até 27/10/2026 o servidor lia a fechadura a cada 3 segundos o dia todo (cerca de 28.800 chamadas por dia), o que esgotou a cota do plano de teste da Tuya às 07:45 daquele dia. Agora: com os eventos da Tuya, o servidor recebe o toque da campainha e abre na hora, sem leitura; sem os eventos, consulta econômica (só na janela configurada, padrão dias úteis das 08:00 às 18:00, e no máximo uma leitura a cada 2 minutos; um toque curto pode passar sem abrir). Nunca volta à leitura a cada 3 segundos. A rotina de 1 minuto segue como reserva, com as mesmas regras. A resposta passa pela mesma trava e pelo mesmo registro dos comandos manuais e é confirmada pelo registro de abertura remota da fechadura.
- Avisos (evento S68): "Porta aberta automaticamente" a quem pode destravar, dizendo se a fechadura confirmou; "não abriu sozinha" quando a nuvem recusa (com a sugestão de tocar em "Abrir agora" se ainda der tempo; no máximo 2 tentativas por pedido); e, a quem pode destravar, quando outra pessoa liga ou desliga a opção. Com a opção ligada, o aviso S67 ("toque em Abrir agora") não é enviado.
- Registro: cada abertura automática entra no registro de rastreabilidade com "Quem: Abertura automática" e a origem "Abertura automática (campainha)"; a autorização guarda quem ligou a opção e quando. Ligar e desligar entram na auditoria.
- Simulação: com a automação desligada ou a fechadura sem homologação, a abertura automática só registra o que teria feito.
- Atenção: enquanto ligada, a porta abre para qualquer pessoa que tocar a campainha. Desmarque quando não quiser esse comportamento.

## Portões: abrir e fechar ou pulso

Os dois portões conferidos em 22/10/2026 (só leitura) são módulos de pulso com dois comandos na nuvem: switch_1 (pulso) e door_control_1 (abrir ou fechar); o da garagem tem sensor de portão (doorcontact_state). Nenhum aceita parar.

Como a garagem é acionada (medido no histórico do próprio módulo em 23/10/2026): o módulo "MINI MODULO PULSO PARA GARAGEM C/ SENSOR" responde só ao pulso switch_1, que é o que o aplicativo Smart Life manda. O comando door_control_1 (abrir/fechar) vindo da nuvem é aceito pela Tuya e ignorado pelo módulo (das 12:42 às 13:34 de 23/10, nenhuma resposta). O motor alterna: o mesmo pulso abre o portão fechado e fecha o aberto. Por isso, no SGO+:
- "Abrir portão" e "Fechar portão" mandam o pulso; o sensor decide qual vale: abrir só com o portão fechado, fechar só com ele aberto (no caso contrário, a recusa explica que o pulso faria o oposto).
- Durante o percurso, outro toque é recusado com o tempo que falta, porque um pulso no meio do caminho para o motor (medido em 23/10/2026: pulso de fechar aos 29 s da abertura não fechou; com o portão aberto, o fechar leva cerca de 55 s: pulso às 15:06:22, sensor fechado às 15:07:16). O tempo vale o gravado em Administrar > "Tempo de percurso do portão (segundos)" (5 a 180); sem ele, o maior entre o informado pelo módulo (door_time_1 = 20 na garagem, curto demais) e 60 segundos. Enquanto falta tempo, os botões do portão mostram "Aguarde N s" com a contagem (o servidor informa os segundos restantes, liberaEmS) e voltam sozinhos.
- Fechamento automático do motor: a garagem fecha sozinha cerca de 2 minutos depois de aberta (15:07:40 aberto, 15:09:53 fechado, sem comando). Um pulso do SGO+ durante esse fechamento pararia o portão.
- Logo depois de o sensor mudar (o portão passando por ele), o sensor oscila entre aberto e fechado no mesmo segundo. O SGO+ lê a hora da última mudança na nuvem e, se foi há menos de 5 segundos, recusa e pede para aguardar.
- "Abrindo…" e "Fechando…" seguem o último comando enviado pelo SGO+ e o percurso; "Aberto" e "Fechado" vêm do sensor.
- Portão sem sensor (pulso simples): só "Abrir portão"; no portão de pulso não há espera pelo resultado do anterior, só o intervalo de 10 segundos.

Acionamento (corrigido em 23/10/2026; antes, o portão só abria até alguém escolher o tipo e homologar o fechar à parte):
- Sem escolha gravada, o portão que tem sensor de posição (a garagem) já vem como "Portão com abrir e fechar": botões "Abrir portão" e "Fechar portão", com o pulso e a trava pelo sensor descritos acima. Portão com "pedestre" no nome fica só com "Abrir portão" (decisão do dono: fecha à mão).
- Sem sensor (o de pedestre), continua "Pulso (só abrir; fecha manualmente)": só o botão "Abrir portão" (pulso).
- O Administrador ou um diretor pode mudar em Administrar > Acionamento; a escolha gravada vale sobre a sugestão.

O fechar segue as mesmas proteções do abrir (janela com código de uso único, limites, registro e confirmação pelo sensor) e vale com a mesma homologação do abrir: portão homologado abre e fecha de verdade.

## Permissões

Portões: toda a equipe interna vê, abre e fecha, sem permissão individual (decisão do dono, 23/10/2026). A aba Permissões passou a tratar só da porta da Diretoria.

Porta da Diretoria: só o responsável pelo sistema libera, e só para diretores; ele próprio destrava por padrão. Na aba Permissões, escolha o diretor, a permissão "Acionar (abrir) e ver", a data de fim (opcional) e o motivo. Uma permissão nova substitui a anterior do mesmo usuário. "Revogar" tira a permissão na hora, com motivo.

Toda concessão e revogação entra na auditoria e no log do sistema, com quem, quando e o motivo.

## Registro de rastreabilidade

Na tela do módulo, "Registro de rastreabilidade" mostra os comandos por dia (Hoje, Ontem, data), em linguagem simples: Quando (dd/mm/aaaa hh:mm:ss) · Dispositivo (nome e local) · Quem · Ação (Abrir, Fechar, Parar, Destravar, Recusar pedido) · Resultado · Origem (Celular, Computador, Atalho no Início, Abertura automática (campainha)).

O Administrador e os diretores veem os comandos de todos; cada colaborador vê só os próprios (no registro, no histórico do dispositivo e nos últimos comandos).

Resultados: "Aberto — confirmado pelo portão às hh:mm:ss" (verde); "Enviado — portão não confirmou" (amarelo, com "Conferir agora"); "Recusado — motivo curto", por exemplo "aguarde 10 s entre comandos", "sem permissão", "fora da janela da campainha", "sem a confirmação na janela" (vermelho); "Teste — nada enviado (portão ainda não homologado)" ou "(automação desligada)" (azul); "Falhou — a nuvem recusou o comando".

Nada de código, comando JSON ou identificação na tabela: esses dados ficam guardados e aparecem só em "Detalhes técnicos", ao tocar na linha. Filtros por dispositivo, pessoa e período; "Exportar planilha" (arquivo CSV que o Excel abre) e "Imprimir ou salvar PDF" (A4) para a Diretoria arquivar. No celular, cartões compactos.

Duplo toque: o comando agora confere o limite e grava a solicitação sob a trava do servidor, e a tela só deixa um preparo e uma janela por vez (o "Sim" trava no primeiro toque). Antes, dois toques quase juntos podiam gerar duas linhas no mesmo segundo.

## Auditoria

Aba Auditoria (Administrador e diretores). Cada linha diz em uma frase o que aconteceu, por dia; os detalhes técnicos (evento, resultado, operação e resumo SHA-256) ficam recolhidos ao tocar na linha. Lista os eventos: sincronização, dispositivo descoberto ou alterado, homologação, comando solicitado, aceito, execução confirmada ou não, comando negado (sem permissão, limite, sem a confirmação da janela), comando recusado pela nuvem, estado consultado, permissão concedida ou revogada, abertura automática ligada ou desligada, integridade conferida.

Cada linha leva o resumo SHA-256 da linha anterior. "Conferir a integridade do registro" percorre a corrente: linha alterada ou apagada aparece com o número e a hora. O Administrador que não é diretor não vê os eventos da porta da Diretoria.

## Cota da Tuya, eventos e modo econômico (27/10/2026)

O que aconteceu: às 07:45 de 27/10/2026 toda chamada à Tuya passou a voltar o código 28841004 ("No permissions. Your quota of Trial Edition is used up."). A cota do plano de teste (Trial Edition: 26.000 chamadas de API e 68.000 mensagens por mês) acabou por consumo: a abertura automática lia a fechadura a cada 3 segundos o dia todo, mais a rotina de 1 minuto e as telas que reliam os portões a cada 5 segundos e a campainha a cada 3. A equipe viu o erro técnico e achou que o módulo inteiro tinha parado; o alarme respondeu normalmente o tempo todo.

O que mudou:
- Contador: toda chamada que sai é contada por dia, por mês e por origem (comandos de pessoas, leituras pedidas na tela, releitura automática das telas, consultas das rotinas, abertura automática por evento, sentinela, sincronização, token). Fica em Saúde da infraestrutura.
- Eventos da Tuya: o servidor do SGO+ assina o serviço de mensagens da Tuya. A campainha e o sensor do portão chegam por evento e não gastam chamada (contam na cota de mensagens, à parte). O SGO+ só confia nos eventos de um dispositivo depois de receber o primeiro evento dele e enquanto a conexão está viva; senão, cai sozinho na consulta econômica.
- Consulta econômica (sem eventos): a campainha é lida só na janela configurada (padrão: dias úteis, das 08:00 às 18:00) e no máximo uma vez a cada 2 minutos, numa leitura compartilhada por telas, rotina rápida e rotina de 1 minuto. A posição do portão parado é relida no máximo a cada 10 minutos; no percurso de um comando, a cada 8 segundos.
- Telas: consultam só com a aba visível, no ritmo do servidor (3 segundos no percurso, 10 com eventos, 30 parado sem eventos; a campainha a cada 3 segundos com eventos e 15 sem). A consulta à tela não gasta cota: quem decide ler na nuvem é o servidor.
- Orçamento (Saúde da infraestrutura, só diretores mudam; padrão 26.000 chamadas por mês, o plano de teste): 70% avisa a gestão (sistema e e-mail); 90% liga o modo econômico.
- Modo econômico: só saem os comandos pedidos por pessoas (abrir, fechar, destravar, responder à campainha), as leituras que a pessoa pede ("Ler estado", "Verificar campainha agora") e a abertura automática disparada por evento. Leituras automáticas e a consulta econômica param. A equipe vê a faixa "Economia da nuvem ligada". Sai sozinho na virada do mês; um diretor sai antes em "Sair do modo econômico" (com confirmação e motivo; no mesmo mês o SGO+ não religa sozinho) ou ajustando o orçamento.
- Cota esgotada ou plano vencido (28841004, 28841104, 28841002, 28841001): o SGO+ marca o bloqueio, para as leituras automáticas e a equipe vê "Portões pelo SGO+ fora do ar no momento: use o controle ou o aplicativo Smart Life. A gestão já foi avisada." A gestão vê também o detalhe técnico. Comando pedido por pessoa ainda tenta (não gasta cota se a Tuya recusa); qualquer resposta com sucesso tira o bloqueio.

Consumo estimado (premissas: 2 portões e 1 fechadura, 20 comandos por dia, telas abertas no expediente, 22 dias úteis):

| Situação | Chamadas por dia útil | Por mês |
|---|---|---|
| Antes (27/10/2026) | cerca de 28.800 (rotina rápida) + 1.440 (rotina de 1 minuto) + telas = mais de 30.000 | cota de 26.000 esgotada em menos de 1 dia |
| Agora, com eventos da Tuya | cerca de 140 (comandos e confirmações 120, sentinela até 10, token até 12; campainha e posição por evento) | cerca de 3.400 (13% da cota) |
| Agora, sem eventos (consulta econômica) | cerca de 590 (campainha 300, garagem parada até 60, garagem no percurso até 90, comandos 120, sentinela e token 22) | cerca de 13.300 (51% da cota) |

Mensagens de eventos (cota à parte, 68.000 por mês no plano de teste): cerca de 46 por toque da campainha (o pedido conta o tempo de 2 em 2 segundos) e até 6 por movimento de portão; com 10 toques e 30 movimentos por dia, cerca de 750 por dia, 22.000 por mês (33%).

## Ligar o serviço de mensagens da Tuya (responsável pelo sistema)

1. Entre em platform.tuya.com com a conta de desenvolvedor da Metrolabs e abra Cloud > Development > o projeto do SGO+ ("Open Project").
2. Aba "Message Service": ligue a chave (Enable). Na janela "Configure Message Service": tipo = fila de mensagens (message queue); contato de alerta = o e-mail do responsável pelo sistema; limite de alerta = 100; intervalo = 6 horas.
3. Em "Messaging Rules" (ou "Modify Messaging Rules"), confira que as regras de produção estão liberadas para os eventos de estado dos dispositivos (status report) e de conexão (online e offline) e clique em "Release Rule" / ative a regra. Projetos criados antes de 20/06/2023 já vêm com a regra padrão.
4. A assinatura de produção ("event") é criada sozinha; confira que aparece "Enabled". Não é preciso copiar nada para o SGO+: o servidor usa o mesmo Access ID e Access Secret de Chaves e senhas.
5. Criptografia: o SGO+ aceita os dois modos (AES/ECB, padrão, e AES/GCM).
6. Confira em Segurança predial > Saúde da infraestrutura: o cartão "Eventos da Tuya" fica verde ("Recebendo eventos") em até 1 minuto. Toque a campainha uma vez: a partir do primeiro evento da fechadura, o SGO+ para de consultar a campainha.
7. Se o cartão ficar amarelo com "conexão recusada": o serviço não está ligado ou as credenciais não batem. Projeto do centro de dados Eastern America com endereço próprio de mensagens: o responsável pelo servidor grava o endereço wss:// indicado no portal na propriedade TUYA_MENSAGENS_ENDERECO. Para testar sem produção, TUYA_MENSAGENS_AMBIENTE = event-test (só os dispositivos de teste). TUYA_MENSAGENS = 0 desliga os eventos no servidor.
8. Cota da Tuya esgotada: renove em iot.tuya.com › Cloud › Cloud Services › IoT Core (estender o período de teste ou assinar um plano). Com plano pago, ajuste o orçamento em Saúde da infraestrutura.

## Sentinela e Saúde da infraestrutura

A sentinela roda no servidor a cada 5 minutos e confere: a nuvem da Tuya (bloqueio de cota ou plano, credenciais, token, dispositivos homologados conectados), o consumo da cota, o modo econômico, os eventos da Tuya, a central de alarme Intelbras (responde e o estado é legível), as rotinas agendadas do servidor, a rotina de 1 minuto da automação, a rotina rápida da abertura automática e o próprio servidor (banco e memória).

Sem gastar chamada à toa: a cada 5 minutos ela usa só o que já sabe (contador, último erro, idade da última resposta, estado gravado pelas telas e eventos). Chamada real à Tuya (lista de dispositivos) no máximo uma vez por hora, na janela de consulta, e só se nenhuma outra chamada deu certo na última hora (ou para ver se a cota voltou).

Autocorreção (cada ação fica no histórico): token da Tuya recusado é renovado; falha passageira da Tuya ou do alarme é repetida depois de 2 segundos; laço das rotinas agendadas sem volta há 3 minutos é reiniciado; rotina de 1 minuto que sumiu é reinstalada; rotina rápida parada é reiniciada; eventos da Tuya desconectados há mais de 10 minutos são reconectados.

Quando não corrige: abre um incidente e avisa o responsável pelo sistema e a Diretoria uma vez (evento S74 da matriz de avisos: no sistema, por e-mail e, nas falhas, por WhatsApp na hora), com o quê, por quê e o que fazer, e avisa de novo quando normaliza. Falhas passageiras só viram incidente depois de rodadas seguidas (alarme: 2; eventos desconectados: 3). Consumo em 70% e modo econômico avisam só no sistema e por e-mail.

A aba "Saúde da infraestrutura" (Diretoria e Administrador) mostra cada item em verde, amarelo, vermelho ou cinza, com o porquê e o que fazer; o consumo de hoje e do mês, a porcentagem do orçamento, a previsão do mês, as chamadas por origem e as mensagens recebidas; o modo econômico (com "Sair do modo econômico" para diretores); o orçamento e a consulta econômica (diretores mudam, com motivo); e o histórico de incidentes (abertura, ação automática, aviso, normalização). A aba não se atualiza sozinha: "Atualizar". Se a sentinela não roda há 15 minutos, aparece o cartão amarelo "Sentinela".

O alarme Intelbras não depende da Tuya: fala com a central pelo servidor do SGO+. Na tela, cada um tem o seu bloco e o seu item na saúde.

## Chaves e senhas: configuração das credenciais

Exclusivo do responsável pelo sistema. O passo a passo para leigo, tela por tela, está no Guia de acesso à Tuya (docs/GUIA_ACESSO_TUYA_SMARTLIFE.md e o documento A4 em Documentos/METROLABS_AUTOMACAO_PREDIAL). Grupo "Automação predial (Tuya)":

1. No portal da Tuya (platform.tuya.com), entre com a conta de desenvolvedor da Metrolabs e abra Cloud > Development. Crie (ou abra) o projeto cloud. Centro de dados: o mesmo da conta do Smart Life (contas do Brasil: Western America).
2. Em Devices > Link Tuya App Account > Add App Account, leia o QR Code com o aplicativo Smart Life da conta que tem os portões e a fechadura. Os dispositivos aparecem na lista do projeto.
3. Em Service API, confira os serviços autorizados: IoT Core, Authorization Token Management e, para a fechadura, Smart Lock Open Service. Sem isso a nuvem responde "código 28841105" ou "1106".
4. Em Cloud > My Services, confira o prazo do plano IoT Core (período de teste). Vencido, a nuvem responde "28841002" e nada funciona até a extensão ou a assinatura.
5. Na aba Overview do projeto, copie o Access ID/Client ID e o Access Secret/Client Secret e grave em Chaves e senhas (TUYA_ACCESS_ID e TUYA_ACCESS_SECRET). Escolha o centro de dados (TUYA_REGIAO).
6. Clique em "Testar conexão": o SGO+ pede um token e lista os dispositivos, sem enviar comando.
7. Deixe "Automação predial ligada" Desligado até a homologação pela Diretoria. Ligado, o SGO+ passa a ler os dispositivos e os estados; os comandos só saem de verdade nos dispositivos homologados.

Nenhuma credencial aparece na tela depois de gravada, nem em log, e-mail, aviso ou planilha. O token de acesso fica só na memória do servidor e é renovado sozinho.

## Problemas comuns

- "Nenhum comando real sai agora": esperado até a homologação; veja "Simulação e comando real".
- "Nenhum dispositivo liberado para você": ainda não há portão ativo; o Administrador sincroniza com o Smart Life.
- O atalho "Portões" não aparece para um colaborador: a automação ainda está em implantação (desligada ou sem portão homologado). Depois da homologação, saia e entre de novo no SGO+.
- "Fechar portão" não aparece: o portão está como "Pulso (só abrir)"; se ele fecha pela nuvem no aplicativo, mude em Administrar > Acionamento.
- Abertura automática ligada e a porta não abriu: veja o aviso "não abriu sozinha" e o registro (por exemplo, fechadura sem internet); se ainda der tempo, toque em "Abrir agora".
- "código 1106" ou "28841105": conta do aplicativo não ligada ao projeto ou serviço não autorizado no portal da Tuya.
- "28841002": período de teste do IoT Core vencido; peça a extensão no portal.
- "28841004" (quota of Trial Edition is used up) ou "Portões pelo SGO+ fora do ar no momento": cota da Tuya esgotada. A equipe usa o controle ou o aplicativo Smart Life; o responsável pelo sistema renova em iot.tuya.com › Cloud › Cloud Services › IoT Core. O SGO+ volta sozinho e avisa a normalização.
- Posição do portão demorando ou campainha atrasada: eventos da Tuya não ligados (cartão amarelo em Saúde da infraestrutura); use "Ler estado" e "Verificar campainha agora" e ligue o serviço de mensagens (seção acima).
- Faixa "Economia da nuvem ligada": modo econômico (consumo do mês em 90% do orçamento). Um diretor pode sair em Saúde da infraestrutura.
- "Offline": o dispositivo está sem internet; o comando não chega. Confira energia e rede sem fio.
- "intervalo mínimo de 10 s", "comandos no último minuto", "ainda está sem resultado": limites de proteção; aguarde ou use "Conferir agora".
- Fechadura "Não disponível pela API": o modelo não aceita abertura remota pela nuvem; use o aplicativo Smart Life ou a própria porta.
