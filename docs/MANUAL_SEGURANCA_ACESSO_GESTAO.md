# Manual da gestão: segurança do acesso

Tela: Administração > Segurança do acesso. Administrador, Diretoria e Gestor consultam; só o Administrador altera.

Pedido do dono (31/10/2026): "Quero que da próxima vez que todos entrarem no sistema apareça uma tela de mude sua senha e isso é obrigatório, também queria que gerasse token e enviasse ao celular cadastrado, temos que proteger o sistema de invasões."

## O que a tela faz

- **Situação**: código no celular ligado ou desligado, trocas de senha pendentes, situação do modelo do WhatsApp na Meta, quantas pessoas estão sem celular válido, sem e-mail válido e com a senha ainda no formato antigo.
- **Código no celular (segundo fator)**: Desligado, Só e-mail ou WhatsApp com e-mail de reserva, para todos ou só para alguns perfis.
- **Troca de senha obrigatória**: exige a troca de todas as contas ativas.
- **Pessoas**: para cada pessoa, a situação da senha e onde ela recebe o código, com Exigir nova senha e Zerar segundo fator.
- **Registro de segurança**: cada entrada, senha errada, código enviado, código usado ou errado, troca de senha, configuração alterada e zeramento, com quando, quem, IP, aparelho e quem fez.

## Ordem de implantação

Siga esta ordem. Cada passo pode esperar o anterior sem prejuízo.

1. **Publicar com tudo desligado.** O código começa desligado e ninguém é marcado para trocar a senha. Nada muda para as pessoas, a não ser que a senha passa a ser guardada no formato forte no próximo login de cada uma e que conta nova (ou senha redefinida em Usuários) já nasce provisória.
2. **Cadastrar o modelo na Meta.** Em Modelo do WhatsApp na Meta, toque em Cadastrar modelo na Meta (ou peça ao suporte para rodar o script do servidor). Toque em Consultar situação até aparecer Aprovado.
3. **Ligar a troca obrigatória para todos.** Toque em Exigir troca de senha de todos, escreva o motivo e confirme (ou peça ao suporte para rodar o script do servidor). Acompanhe as trocas pendentes na Situação.
4. **Ligar o código.** Antes, complete o e-mail e o celular de quem aparece sem. Comece com Só e-mail, ou só com alguns perfis; depois da aprovação do modelo, passe para WhatsApp com e-mail de reserva.

## Configurar o código no celular

1. Escolha Desligado, Só e-mail ou WhatsApp com e-mail de reserva.
2. Marque os perfis que recebem o código. Nenhum marcado vale para todos, inclusive Cliente e Representada.
3. Toque em Gravar. Vale a partir do próximo login de cada pessoa.

Com WhatsApp: o código vai para o celular do cadastro pelo WhatsApp oficial. Se a pessoa não tem celular válido, se a Meta recusar, se o modelo não estiver aprovado ou se o WhatsApp não estiver configurado em Chaves e senhas, o código vai por e-mail e a tela diz isso para a pessoa.

### O modelo da Meta

A Meta exige a categoria Autenticação para mandar código e não aceita texto livre nessa categoria. O texto é o padrão da Meta em português, com o código em destaque, a recomendação "Para sua segurança, não compartilhe este código.", o aviso "Este código expira em 10 minutos." e o botão Copiar código. O nome do modelo é sgo_codigo_acesso, em pt_BR.

O código é pedido pela própria pessoa naquela hora, então sai a qualquer hora. O piloto do WhatsApp não segura este modelo, e nenhuma outra mensagem vai pelo WhatsApp neste fluxo.

## Recuperar o acesso de uma pessoa

- **Perdeu ou trocou o celular**: corrija o celular em Administração > Usuários e toque em Zerar segundo fator. Os aparelhos confiados e as sessões dela caem e, nas próximas 24 horas, ela entra só com a senha.
- **Senha pode ter vazado**: toque em Exigir nova senha. Na próxima entrada (ou em até 5 minutos, se estiver dentro) ela cria a senha nova.
- **Esqueceu a senha**: redefina em Administração > Usuários. A senha que você define é provisória.

Cada ação pede o motivo e fica no registro de segurança com o seu nome.

## Se ninguém da gestão consegue entrar

O caminho de recuperação fica no servidor, fora do navegador. O responsável pelo sistema roda, dentro do contêiner do SGO+:

    npx tsx scripts/seguranca_recuperar_acesso.ts --usuario admin --senha-provisoria --desligar-codigo --motivo "dono sem acesso ao celular"

- Sempre: zera o segundo fator do login (aparelhos confiados e sessões desconectados, 24 horas sem código).
- --senha-provisoria: grava uma senha provisória, mostrada uma única vez no terminal; no login a pessoa cria a dela.
- --desligar-codigo: desliga o código para todos (volte a ligar pela tela depois).
- --reativar: reativa a conta, se estiver inativa.

Tudo fica no registro de segurança como feito pelo servidor. A senha provisória não vai para nenhum registro.

## Registro de segurança

Escolha o período (até 90 dias), o login e o evento e toque em Mostrar. Aparecem os 500 mais recentes. O registro nunca guarda senha, código ou token. O aparelho aparece resumido, por exemplo "Celular Android · Chrome".

## Proteções que valem sempre

- Senha guardada só como resumo forte (PBKDF2, 600 mil rodadas, sal próprio por senha).
- 5 senhas erradas no mesmo login, ou 10 na mesma conexão, seguram as tentativas por 15 minutos, com aviso de quantas faltam.
- Código de 6 números, 10 minutos, uso único, 5 tentativas, reenvio depois de 60 segundos e até 3 por entrada.
- Aparelho confiado por 30 dias guardado num cookie que o navegador não lê (HttpOnly, Secure, SameSite); trocar a senha ou zerar o segundo fator desconecta todos.
- Sessão com troca pendente é recusada pelo servidor em qualquer função até a troca, não só escondida na tela.
