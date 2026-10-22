# Manual do módulo Segurança e automação predial do SGO+

Versão de 22/10/2026. Tela: Segurança predial > Segurança e automação predial (abas Dispositivos, Permissões e Auditoria para a administração). Credenciais em Administração > Chaves e senhas > Automação predial (Tuya).

## Para que serve

Os portões da empresa e a porta da Diretoria, que hoje são acionados pelo aplicativo Smart Life, passam a ser administrados pelo SGO+ pela nuvem do mesmo aplicativo (plataforma Tuya). O SGO+ mostra os dispositivos por unidade e localização, lê o estado, envia o comando de abertura a quem tem permissão e registra tudo: quem pediu, quando, de qual unidade, o que a nuvem respondeu e se o dispositivo confirmou a execução.

O módulo foi construído sobre o que o SGO+ já tinha: a sessão e os perfis de acesso, o módulo Chaves e senhas, o padrão de comando solicitado, aceito e confirmado do bloqueio da partida da Frota, o registro só-inclusão com resumo encadeado, as pendências do Início e a matriz de avisos.

## Quem faz o quê

Diretoria: vê e abre os portões; vê a porta da Diretoria e solicita o destravamento quando tem a permissão "Acionar" concedida por um diretor; sincroniza com o Smart Life; administra os dispositivos; homologa cada dispositivo depois do teste presencial; concede e revoga permissões, inclusive da porta; consulta toda a auditoria.

Administrador: vê e abre os portões; sincroniza; administra os portões; concede e revoga permissões dos portões; consulta a auditoria dos portões. Não vê a porta da Diretoria (só a contagem de dispositivos restritos).

Demais perfis internos (Gestor, RH, Financeiro, Técnico, Metrologia, Comercial): só o que foi concedido por dispositivo. "Ver estado e histórico" mostra o cartão e o histórico; "Acionar (abrir) e ver" permite abrir. A permissão pode ter data de fim.

Cliente: não acessa.

Todas as regras são conferidas no servidor em cada chamada. A tela só mostra o que o servidor devolve; a porta da Diretoria nem chega ao navegador de quem não é Diretoria.

## O caminho de um comando

1. Solicitado. O SGO+ confere a sessão, a permissão no dispositivo, a confirmação adicional (fechadura), se o dispositivo está ativo e compatível, e os limites de frequência. Grava a solicitação com o identificador da operação. Se qualquer regra falha, a solicitação fica registrada como negada, com o motivo, e a tela explica o que fazer.
2. Aceito. A nuvem da Tuya respondeu que recebeu o comando. O SGO+ grava o código HTTP, o código da resposta e o identificador da chamada (tid).
3. Execução confirmada. O SGO+ espera alguns segundos, relê o estado do dispositivo e procura a mudança (ou, na fechadura, o registro de abertura). Encontrou: "Execução confirmada". Não encontrou: "Aceito pela API, sem confirmação": a gestão é avisada (evento S66 da matriz de avisos), o comando entra nas pendências do Início e o botão "Conferir agora" relê o estado por até 15 minutos.

A nuvem aceitar não quer dizer porta aberta. Só a execução confirmada quer dizer isso.

## Simulação e comando real

Enquanto a chave "Automação predial ligada" está Desligada em Chaves e senhas, ou o dispositivo não foi homologado pela Diretoria, o SGO+ trabalha em simulação: registra o que teria feito e nada sai do servidor. O cartão mostra o selo "Simulação" e o motivo.

O comando real exige as duas coisas: automação Ligada e dispositivo homologado. A homologação é feita pela Diretoria, no cartão, em "Administrar" > "Homologar (depois do teste presencial)", com a descrição do teste e a palavra HOMOLOGAR. Pode ser retirada a qualquer momento, com motivo.

## Limites de proteção

- Cada clique gera um identificador de operação. O mesmo identificador nunca é executado duas vezes: a segunda chamada devolve o resultado da primeira.
- No máximo 1 comando por dispositivo a cada 10 segundos.
- No máximo 5 comandos por pessoa por minuto.
- O mesmo dispositivo não recebe outro comando enquanto o anterior está sem resultado há menos de 60 segundos.
- No máximo 30 chamadas por minuto à nuvem da Tuya, com 300 milissegundos entre chamadas.
- A porta da Diretoria exige digitar ABRIR na confirmação, além do clique.

## Dispositivos

Depois de "Sincronizar com o Smart Life", cada dispositivo da conta do aplicativo ligada ao projeto vira um cartão com: nome, tipo (portão ou acesso, fechadura), unidade, localização, situação (online ou offline), estado lido, último comando, homologação e os botões que o seu perfil permite.

A sincronização só lê. Ela identifica a categoria do produto e os comandos que o dispositivo suporta e monta a compatibilidade:

- Portões e acessos (abridor de portão ou garagem, motor, interruptor, acionador): comando de abertura "switch_1: true" (pulso), "switch: true" ou "control: open". Se o dispositivo não informa nenhum deles, o cartão diz "Não disponível pela API" e o Administrador pode definir o comando à mão em "Administrar", desde que esteja na lista de comandos do dispositivo.
- Fechaduras (residencial, residencial Pro, controle de acesso, hotel, comercial, com câmera, cofre): destravamento só pelo fluxo de bilhete temporário da nuvem (Smart Lock Open API), e só quando o modelo oferece abertura remota pela nuvem. Se não oferece, o cartão diz "Não disponível pela API" com o porquê; a abertura continua pelo aplicativo Smart Life ou na própria porta, e o SGO+ mostra o estado e os registros quando a nuvem os fornece.
- Outras categorias: só consulta.

Fechaduras entram restritas à Diretoria. Só a Diretoria marca ou desmarca "Restrito à Diretoria".

"Administrar" permite trocar o nome no SGO+, escolher a unidade (do cadastro de unidades ou em texto, por exemplo METROLABS — MATRIZ GOIÂNIA), a localização, desativar o dispositivo e, nos portões, ajustar o comando de abertura. Nada é apagado: dispositivo removido do Smart Life continua no cadastro, e o Administrador o desativa.

## Permissões

Aba Permissões (Administrador e Diretoria). Escolha o usuário interno ativo, o dispositivo, a permissão ("Ver estado e histórico" ou "Acionar (abrir) e ver"), a data de fim (opcional) e o motivo. Uma permissão nova substitui a anterior do mesmo usuário no mesmo dispositivo. "Revogar" tira a permissão na hora, com motivo.

A porta da Diretoria só é liberada por um diretor, para usuários do perfil Diretoria, e só com "Acionar" o diretor consegue solicitar o destravamento. Administrador e Diretoria já veem e acionam os portões sem permissão individual.

Toda concessão e revogação entra na auditoria e no log do sistema, com quem, quando e o motivo.

## Auditoria

Aba Auditoria (Administrador e Diretoria). Lista os eventos: sincronização, dispositivo descoberto ou alterado, homologação, comando solicitado, aceito, execução confirmada ou não, comando negado (sem permissão, limite, confirmação ausente), comando recusado pela nuvem, estado consultado, permissão concedida ou revogada, integridade conferida.

Cada linha leva o resumo SHA-256 da linha anterior. "Conferir a integridade do registro" percorre a corrente: linha alterada ou apagada aparece com o número e a hora. O Administrador não vê os eventos da porta da Diretoria.

## Chaves e senhas: configuração das credenciais

Exclusivo do responsável pelo sistema. Grupo "Automação predial (Tuya)":

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
- "Nenhum dispositivo liberado para você": peça a permissão ao Administrador ou à Diretoria; o Administrador sincroniza.
- "código 1106" ou "28841105": conta do aplicativo não ligada ao projeto ou serviço não autorizado no portal da Tuya.
- "28841002": período de teste do IoT Core vencido; peça a extensão no portal.
- "Offline": o dispositivo está sem internet; o comando não chega. Confira energia e rede sem fio.
- "intervalo mínimo de 10 s", "comandos no último minuto", "ainda está sem resultado": limites de proteção; aguarde ou use "Conferir agora".
- Fechadura "Não disponível pela API": o modelo não aceita abertura remota pela nuvem; use o aplicativo Smart Life ou a própria porta.
