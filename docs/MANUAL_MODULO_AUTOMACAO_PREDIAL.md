# Manual do módulo Segurança e automação predial do SGO+

Versão de 23/10/2026 (portões de toda a equipe, abrir e fechar com posição do portão, abertura automática pela campainha). Tela: Segurança predial > Segurança e automação predial (abas Dispositivos, Permissões e Auditoria para a administração). Credenciais em Administração > Chaves e senhas > Automação predial (Tuya).

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

Posição do portão: o selo grande mostra "Aberto" (laranja) ou "Fechado" (verde) pelo sensor do portão e "Abrindo…" ou "Fechando…" (azul) durante o percurso depois de um comando (o tempo de percurso informado pelo portão, ou 30 segundos). Com a tela aberta, o SGO+ relê a posição a cada 5 segundos (leitura compartilhada entre todas as telas; quando o minuto já tem muitas chamadas à nuvem, a tela cede a vez aos comandos) e só troca os selos, sem redesenhar a tela. Quando a posição muda, por qualquer meio (SGO+, controle remoto ou aplicativo), aparece no topo o aviso "Portão ... abriu às hh:mm:ss" ou "fechou às hh:mm:ss". Portão sem sensor (pedestre) mostra "Posição: sem sensor".

Nada para digitar: toque em "Abrir portão", "Fechar portão" ou "Destravar a porta", confira o nome na janela grande e toque em "Sim, abrir agora" ou "Sim, fechar agora" (ou "Cancelar"). A janela leva um código de uso único, válido por 60 segundos, emitido pelo servidor para o seu usuário, aquele dispositivo e aquela solicitação; sem ele (por exemplo, uma chamada direta sem passar pela janela) o servidor recusa e registra.

## O caminho de um comando

1. Solicitado. O SGO+ confere a sessão, a permissão no dispositivo, o código da janela de confirmação, se o dispositivo está ativo e compatível, e os limites de frequência. Grava a solicitação com o identificador da operação. Se qualquer regra falha, a solicitação fica registrada como negada, com o motivo, e a tela explica o que fazer.
2. Aceito. A nuvem da Tuya respondeu que recebeu o comando. O SGO+ grava o código HTTP, o código da resposta e o identificador da chamada (tid).
3. Execução confirmada. O SGO+ espera alguns segundos, relê o estado do dispositivo e procura a mudança (ou, na fechadura, o registro de abertura). Encontrou: "Execução confirmada". Não encontrou: "Aceito pela API, sem confirmação": a gestão é avisada (evento S66 da matriz de avisos), o comando entra nas pendências do Início e o botão "Conferir agora" relê o estado por até 15 minutos.

A nuvem aceitar não quer dizer porta aberta. Só a execução confirmada quer dizer isso.

Portão com sensor e abrir e fechar (garagem), desde 23/10/2026: a execução é o sensor na posição pedida (aberto para abrir, fechado para fechar). O SGO+ relê o estado até três vezes (cerca de 8 segundos). Se o portão ainda está no percurso, a resposta é "Comando aceito: o portão está abrindo/fechando", sem aviso à gestão, e a confirmação vem depois, quando o sensor chegar: pela tela aberta (a cada 5 segundos) ou pela rotina de 1 minuto do servidor, por até 15 minutos. O selo da situação do último comando só aparece nesses 15 minutos.

## Simulação e comando real

Enquanto a chave "Automação predial ligada" está Desligada em Chaves e senhas, ou o dispositivo não foi homologado pela Diretoria, o SGO+ trabalha em simulação: registra o que teria feito e nada sai do servidor. O cartão mostra o selo "Simulação" e o motivo.

O comando real exige as duas coisas: automação Ligada e dispositivo homologado. A homologação é feita por um diretor, no cartão, em "Administrar" > "Homologar (depois do teste presencial)", com a descrição do teste (nada mais para digitar). Pode ser retirada a qualquer momento, com motivo.

## Limites de proteção

- Cada clique gera um identificador de operação. O mesmo identificador nunca é executado duas vezes: a segunda chamada devolve o resultado da primeira.
- No máximo 1 comando por dispositivo a cada 10 segundos.
- No máximo 5 comandos por pessoa por minuto.
- Na fechadura, o mesmo comando não é repetido enquanto o anterior está sem resultado há menos de 60 segundos. Nos portões vale o intervalo de 10 segundos e, na garagem, o percurso do portão.
- No máximo 90 chamadas por minuto à nuvem da Tuya, com 300 milissegundos entre chamadas (campainha, abertura automática e posição dos portões cabem aqui; a leitura de posição para a tela para quando o minuto passa de 70 chamadas).
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

A tela consulta a fechadura a cada 3 segundos só enquanto está aberta, e a leitura é compartilhada entre as telas (uma chamada a cada 2,5 segundos, no máximo). Uma rotina do servidor, a cada minuto, avisa quem pode destravar (evento S67: no sistema; WhatsApp só para quem está liberado no piloto). Como o pedido dura cerca de 60 a 90 segundos, o aviso pode chegar perto do fim: para atender, deixe a tela aberta.

## Porta da Diretoria: abertura automática pela campainha

Pedido do dono (23/10/2026): uma opção para os diretores marcarem "abrir automaticamente quando alguém tocar a campainha"; desmarcada, tudo continua como acima.

- Quem liga e desliga: quem destrava a porta (o responsável pelo sistema, ou o diretor com a permissão "Acionar" dele). A caixa "Abrir automaticamente quando tocarem a campainha" fica no bloco da porta, no topo da tela e no Início. Ao ligar, uma janela explica que a porta vai abrir sem ninguém confirmar; ao desligar, não há janela.
- Como funciona: com a opção ligada, o servidor consulta o pedido da fechadura a cada 3 segundos (rotina rápida do servidor, que só roda enquanto há porta com a opção ligada) e responde "abrir" (reply_unlock_request = true) sozinho, uma vez por pedido. A rotina de 1 minuto faz o mesmo como reserva. A resposta passa pela mesma trava e pelo mesmo registro dos comandos manuais e é confirmada pelo registro de abertura remota da fechadura.
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
- "Offline": o dispositivo está sem internet; o comando não chega. Confira energia e rede sem fio.
- "intervalo mínimo de 10 s", "comandos no último minuto", "ainda está sem resultado": limites de proteção; aguarde ou use "Conferir agora".
- Fechadura "Não disponível pela API": o modelo não aceita abertura remota pela nuvem; use o aplicativo Smart Life ou a própria porta.
