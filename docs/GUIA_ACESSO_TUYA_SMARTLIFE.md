# Guia de acesso à Tuya para ligar os portões e a porta da Diretoria ao SGO+

Passo a passo para quem usa o aplicativo Smart Life e nunca entrou no portal da Tuya. Versão de 22/10/2026. Cópia em Markdown do documento A4 em `C:\Users\venda\Documents\METROLABS_AUTOMACAO_PREDIAL\GUIA_ACESSO_TUYA_SMARTLIFE_20261022.html` (e `.pdf`).

O aplicativo Smart Life guarda os portões e a fechadura numa nuvem chamada Tuya. Para o SGO+ falar com essa nuvem, é preciso criar, uma vez, um projeto no portal de desenvolvedores da Tuya, ligar a ele a conta do Smart Life e copiar duas chaves (Access ID e Access Secret) para o SGO+. Nada disso abre portão nenhum: o SGO+ continua desligado até a Diretoria homologar cada dispositivo.

O que você vai precisar (cerca de 30 minutos):

- O celular com o Smart Life aberto na conta que tem os portões e a fechadura (a conta do dono da casa no aplicativo, não uma conta convidada).
- Um computador com navegador, de preferência o Chrome (o portal da Tuya é em inglês; os nomes deste guia são os originais, em inglês, com a tradução ao lado).
- Um e-mail para a conta do portal da Tuya. Pode ser o mesmo do Smart Life ou outro: são contas separadas.
- Acesso ao SGO+ com o login de responsável pelo sistema (Chaves e senhas).

Segurança: o Access Secret é como uma senha mestra da conta da nuvem. Não mande por WhatsApp, e-mail ou mensagem, não tire foto e não cole em planilha. Copie do portal e cole direto no SGO+, em Chaves e senhas.

## Passo 1. Conferir a região da conta no Smart Life

1. No celular, abra o Smart Life e toque em Eu (canto inferior direito).
2. Toque no ícone de engrenagem (Configurações), no canto superior direito.
3. Toque em Conta e segurança e veja o campo Região. Deve aparecer Brasil.

A Tuya atende o Brasil pelo centro de dados "Western America" (América Oeste); nas contas mais novas, pelo "Eastern America" (América Leste): a Tuya mudou o Brasil para o Leste em 25/11/2025 para os aplicativos registrados depois dessa data. No passo 3 escolha os dois, se o portal deixar, e no passo 6 confira em qual deles os dispositivos aparecem.

## Passo 2. Criar a conta no portal da Tuya

1. No computador, abra https://platform.tuya.com.
2. Clique em "Sign Up" (Cadastrar). Se a página abrir no login, procure o link de cadastro embaixo do formulário.
3. Escolha o país Brasil, informe o e-mail, peça o código ("Get Verification Code", Receber código), confira o e-mail e digite o código.
4. Crie a senha, aceite os termos e conclua. Se o portal perguntar o tipo de conta ou a área de atuação, escolha desenvolvedor individual ou empresa (qualquer uma serve).
5. Guarde o e-mail e a senha do portal com as senhas da empresa.

## Passo 3. Criar o projeto na nuvem

1. No menu da esquerda, pare o mouse em "Cloud" (Nuvem) e clique em "Development" (Desenvolvimento).
2. Na página "My Cloud Projects" (Meus projetos), clique em "Create Cloud Project" (Criar projeto).
3. Preencha: "Project Name" (Nome) = Metrolabs SGO; "Description" (Descrição) = Portões e porta da Diretoria no SGO+; "Industry" (Ramo) = "Smart Home" (Casa inteligente) ou a mais próxima; "Development Method" (Forma de desenvolvimento) = "Smart Home" (é a que permite ligar a conta do Smart Life); "Data Center" (Centro de dados) = "Western America" e, se o campo aceitar mais de um, também "Eastern America".
4. Clique em "Create" (Criar).

## Passo 4. Ativar os serviços que o SGO+ usa

Na página "Authorize API Services" (Autorizar serviços), mantenha os já marcados e confira estes três: "IoT Core" (ler e comandar os dispositivos), "Authorization Token Management" (gestão do acesso), "Smart Lock Open Service" (necessário para a porta da Diretoria). Clique em "Authorize" (Autorizar). Se algum faltar, depois: aba "Service API" (Serviços) > "Go to Authorize" (Autorizar).

Se o portal pedir assinatura, escolha "Free Trial" (teste gratuito). O IoT Core vem num período de teste que vence; vencido, nada funciona e o SGO+ mostra o código 28841002. Para estender: "Cloud" > "My Services" (Meus serviços) > "Extend Trial Period" (Estender o período de teste), responder o formulário curto e esperar a aprovação (minutos a um dia útil). Outra entrada relatada: "Service API" > "IoT Core" > "View Details". Ponha um lembrete na agenda um mês antes de vencer.

## Passo 5. Ligar a conta do Smart Life ao projeto

1. No projeto, abra a aba "Devices" (Dispositivos).
2. Clique em "Link Tuya App Account" (Vincular conta do aplicativo) e em "Add App Account" (Adicionar conta). Aparece um código QR.
3. No celular, no Smart Life, toque em Eu e no ícone de leitura de código (canto superior direito).
4. Aponte para o código QR da tela.
5. No celular, toque em Confirmar.
6. No computador, escolha "Automatic Link" (Ligação automática) e a permissão "Read, Write and Manage" (Ler, comandar e administrar). Clique em "OK".

Use a conta dona da casa. Conta convidada costuma trazer a lista vazia. Uma conta do aplicativo pode estar ligada a no máximo dois projetos.

## Passo 6. Conferir se os dispositivos apareceram

1. Na aba "Devices", clique em "All Devices" (Todos os dispositivos).
2. Devem aparecer os dois portões e a fechadura.
3. Lista vazia: no seletor de centro de dados (canto superior direito), troque para "Eastern America" (ou "Western America"). Anote em qual aparecem: é esse que vai no SGO+.

## Passo 7. Copiar as duas chaves

Aba "Overview" (Visão geral) > quadro "Authorization Key" (Chave de autorização): "Access ID/Client ID" e "Access Secret/Client Secret" (ícone de olho para ver, ícone de copiar ao lado). Cole direto no SGO+.

## Passo 8. Gravar no SGO+ e testar

1. SGO+ > Administração > Chaves e senhas > grupo Automação predial (Tuya).
2. "Tuya: Access ID do projeto cloud": cole e Gravar.
3. "Tuya: Access Secret do projeto cloud": cole e Gravar (o valor não aparece mais; é normal).
4. "Tuya: centro de dados do projeto": o mesmo do passo 6, e Gravar.
5. Deixe "Automação predial ligada" em Desligado.
6. Toque em "Testar conexão". Esperado: "Funcionou: a Tuya aceitou as credenciais ... e informou 3 dispositivo(s). Nenhum comando foi enviado."

Depois: a Diretoria sincroniza, preenche unidade e localização e faz a homologação presencial (portão secundário, principal, porta). Só então "Automação predial ligada" passa para Ligado.

## O que fazer se der errado

| O que aparece | Por quê | O que fazer |
|---|---|---|
| Código QR não aceito, ou erro de região | O centro de dados do projeto não atende a região da conta | Edite o projeto e acrescente "Eastern America" ou "Western America"; leia de novo |
| "All Devices" vazio, ou o SGO+ informa 0 dispositivo | Centro de dados diferente, conta convidada ou conta ligada pela aba errada | Troque o seletor (passo 6); use a conta dona da casa; ligue pela aba "Devices", não "Users"; ajuste o centro de dados no SGO+ |
| SGO+: "código 28841105" ou "28841101" | Serviço não ativado | "Service API" > "Go to Authorize": IoT Core, Authorization Token Management, Smart Lock Open Service |
| SGO+: "código 1106" | Conta do Smart Life não ligada, ou dispositivo fora dela | Refaça os passos 5 e 6 |
| SGO+: "código 28841002" | Período de teste do IoT Core vencido | "Cloud" > "My Services" > "Extend Trial Period"; se continuar, desligue e ligue de novo a conta do aplicativo |
| SGO+: "código 1004" | Access Secret colado errado | Copie de novo e grave por cima |
| SGO+: "o token não veio" | Centro de dados errado no SGO+ | Troque Western America por Eastern America (ou o contrário) e teste |

Fontes consultadas em 22/10/2026: documentação da Tuya ("Create Cloud Project", "Link Devices by App Account", "Mappings Between OEM App Accounts and Data Centers") e guias públicos de integração (Home Assistant, Homey, Gladys). A Tuya muda o portal com frequência: se um nome estiver diferente, procure pela posição descrita.
