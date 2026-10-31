# Manual da gestão: segurança do acesso

Tela: Administração > Segurança do acesso. Administrador, Diretoria e Gestor consultam; só o Administrador altera.

Pedido do dono (31/10/2026): "Quero que da próxima vez que todos entrarem no sistema apareça uma tela de mude sua senha e isso é obrigatório, também queria que gerasse token e enviasse ao celular cadastrado, temos que proteger o sistema de invasões."

E, no mesmo dia: "Redefinição de senha e esqueci senha, você tem que implantar, e acho que o usuário tem que ser o e-mail cadastrado, fica mais profissional e melhor para tratar a redefinição de senha." e "onde tem login ou apelido não precisa mais existir, remova".

## O que a tela faz

- **Situação**: código no celular ligado ou desligado, trocas de senha pendentes, situação do modelo do WhatsApp na Meta, quantas pessoas estão sem celular válido, sem e-mail válido e com a senha ainda no formato antigo.
- **Não conseguem entrar no SGO+** (bloco vermelho, só quando há alguém): contas ativas sem e-mail e e-mails repetidos em duas ou mais contas ativas, com o botão Abrir Usuários.
- **Código no celular (segundo fator)**: Desligado, Só e-mail ou WhatsApp com e-mail de reserva, para todos ou só para alguns perfis.
- **Troca de senha obrigatória**: exige a troca de todas as contas ativas.
- **Pessoas**: para cada pessoa (nome e e-mail), a situação da senha e onde ela recebe o código, com Exigir nova senha e Zerar segundo fator.
- **Registro de segurança**: cada entrada, senha errada, código enviado, código usado ou errado, troca de senha, configuração alterada e zeramento, com quando, quem, IP, aparelho e quem fez.

## Ordem de implantação

Siga esta ordem. Cada passo pode esperar o anterior sem prejuízo.

1. **Publicar com tudo desligado.** O código começa desligado e ninguém é marcado para trocar a senha. Nada muda para as pessoas, a não ser que a senha passa a ser guardada no formato forte no próximo login de cada uma e que conta nova (ou senha redefinida em Usuários) já nasce provisória.
2. **Cadastrar o modelo na Meta.** Em Modelo do WhatsApp na Meta, toque em Cadastrar modelo na Meta (ou peça ao suporte para rodar o script do servidor). Toque em Consultar situação até aparecer Aprovado.
3. **Ligar a troca obrigatória para todos.** Toque em Exigir troca de senha de todos, escreva o motivo e confirme (ou peça ao suporte para rodar o script do servidor). Acompanhe as trocas pendentes na Situação.
4. **Ligar o código.** Antes, complete o e-mail e o celular de quem aparece sem. Comece com Só e-mail, ou só com alguns perfis; depois da aprovação do modelo, passe para WhatsApp com e-mail de reserva.

## Entrada pelo e-mail (31/10/2026)

- Todos entram com o **e-mail cadastrado** em Administração > Usuários e a senha. O e-mail é comparado sem diferenciar maiúsculas e sem espaços.
- O nome de usuário (login) não aparece mais em tela nenhuma. Por dentro, o sistema guarda o mesmo identificador de antes, para o histórico, a auditoria, a Frota, a Conduta e os avisos continuarem ligados às pessoas.
- **Conta ativa sem e-mail**: a entrada é recusada com "Seu acesso precisa de um e-mail cadastrado. Peça à gestão da Metrolabs para cadastrar.".
- **E-mail repetido em duas contas ativas**: as duas ficam recusadas até a correção (a pessoa que acerta a senha vê o porquê).
- Quem digitar o nome de usuário antigo com a senha certa recebe a orientação de entrar pelo e-mail (com o e-mail mascarado).
- A conta técnica do Auvo continua entrando como antes (pelo nome), fora da troca obrigatória e do código.
- No cadastro e na edição de usuário, o e-mail é obrigatório e único (inclusive entre contas inativas: quem volta é reativado). Reativar uma conta com o e-mail de outra conta ativa é recusado.
- A tela Usuários mostra em vermelho quem está sem e-mail ou com e-mail repetido (faixa no topo, selos e os números Sem e-mail (não entram) e E-mail repetido).

### Antes de publicar a entrada pelo e-mail

O responsável pelo sistema roda no contêiner do SGO+ (só lê, não altera nada):

    npx tsx scripts/seguranca_listar_emails.ts

A lista mostra quem está sem e-mail e os e-mails repetidos (nome, perfil, login interno e e-mail). Corrija em Administração > Usuários (ou avise as pessoas) antes de publicar.

## Esqueci minha senha e link de redefinição

- Na tela de entrada (computador, celular, aplicativo SGO+ Campo, Cliente e Representada), **Esqueci minha senha** pede o e-mail e responde sempre igual: "Se o e-mail estiver cadastrado, enviamos um link".
- O link vai por e-mail para a pessoa (de sistema@metrolabs.com.br): token aleatório forte, guardado só como resumo, uso único, vale **30 minutos**; um link por pessoa (o novo cancela o anterior).
- Ao abrir o link, se o perfil exige o código e o modo é WhatsApp, e a pessoa tem celular, a página pede também o código no WhatsApp (reserva por e-mail). Só invadir o e-mail não basta.
- A senha nova segue as regras de sempre. Ao salvar, todas as sessões e aparelhos confiados da pessoa caem na hora, ela recebe "Sua senha do SGO+ foi alterada; se não foi você, avise a gestão" e o registro guarda o evento.
- Limites: 3 pedidos por e-mail por hora (a resposta continua igual) e limite por conexão no servidor.
- A gestão envia o link em **Administração > Usuários > Mais ações > Enviar link de redefinição**, com motivo. Conta de Administrador só por Administrador; Diretoria por Administrador ou Diretoria.
- A **senha provisória** (Mais ações > Senha provisória (sem e-mail)) fica só para quem não tem e-mail.
- No modo personalizado, o Administrador envia o link de senha nova do modo (no lugar de apagar a senha); a própria pessoa também pede. Sem e-mail, continua "Apagar a senha agora".

## Trocar minha senha

Cada pessoa troca a própria senha em **Trocar senha** (topo da tela; no celular, o botão da chave ou Trocar minha senha no Início): senha atual e senha nova. As outras sessões dela caem na hora e ela recebe o aviso por e-mail.

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
- **Esqueceu a senha**: a própria pessoa usa Esqueci minha senha; ou envie o link em Administração > Usuários > Mais ações > Enviar link de redefinição. Sem e-mail, use a senha provisória (a pessoa cria a dela no próximo acesso).

Cada ação pede o motivo e fica no registro de segurança com o seu nome.

## Se ninguém da gestão consegue entrar

O caminho de recuperação fica no servidor, fora do navegador. O responsável pelo sistema roda, dentro do contêiner do SGO+:

    npx tsx scripts/seguranca_recuperar_acesso.ts --email <e-mail do dono> --senha-provisoria --desligar-codigo --motivo "dono sem acesso ao celular"

(--usuario admin, pelo login interno, também funciona.)

- Sempre: zera o segundo fator do login (aparelhos confiados e sessões desconectados, 24 horas sem código).
- --senha-provisoria: grava uma senha provisória, mostrada uma única vez no terminal; no login a pessoa cria a dela.
- --desligar-codigo: desliga o código para todos (volte a ligar pela tela depois).
- --reativar: reativa a conta, se estiver inativa.

Tudo fica no registro de segurança como feito pelo servidor. A senha provisória não vai para nenhum registro.

## Registro de segurança

Escolha o período (até 90 dias), a pessoa (nome ou e-mail) e o evento e toque em Mostrar. A coluna Pessoa mostra o nome; tentativa com e-mail que não tem conta mostra o e-mail digitado. Aparecem os 500 mais recentes. O registro nunca guarda senha, código ou token. O aparelho aparece resumido, por exemplo "Celular Android · Chrome".

## Proteções que valem sempre

- Senha guardada só como resumo forte (PBKDF2, 600 mil rodadas, sal próprio por senha).
- 5 senhas erradas com o mesmo e-mail, ou 10 na mesma conexão, seguram as tentativas por 15 minutos, com aviso de quantas faltam.
- Pedir o link de nova senha: 3 por e-mail por hora e 10 por conexão por hora; enviar o código do link: 15 por conexão por hora; 5 erros no mesmo link seguram o link por 15 minutos (e 5 códigos errados cancelam o link).
- Código de 6 números, 10 minutos, uso único, 5 tentativas, reenvio depois de 60 segundos e até 3 por entrada.
- Aparelho confiado por 30 dias guardado num cookie que o navegador não lê (HttpOnly, Secure, SameSite); trocar a senha ou zerar o segundo fator desconecta todos.
- Sessão com troca pendente é recusada pelo servidor em qualquer função até a troca, não só escondida na tela.
