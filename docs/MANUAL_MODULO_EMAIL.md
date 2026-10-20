# Manual do módulo E-mail integrado (SGO+ e COMMAND)

Versão de 21/10/2026. Telas: SGO+ › Principal › E-mail (`JS_Email.html`, `SGO_Email.js`); COMMAND › E-mail (`ModEmail.html`, `Email.js`). Servidor: `sgo_servidor/src/servicos/emailPessoal.ts` (caixa, leitura, envio, verificação), `cofre.ts` (senha cifrada), `htmlSeguro.ts` (limpeza do HTML), global `SGO_EMAIL` (`compat/email.ts`).

## 1. Para que serve

Cada colaborador usa a própria caixa @metrolabs.com.br dentro do sistema: Entrada, Enviados, Rascunhos, Lixeira e as demais pastas do servidor de e-mail; busca; filtros Não lidas, Com anexo e De cliente; ler; escrever; responder; responder a todos; encaminhar; anexar; baixar anexo; salvar rascunho; mover; marcar como não lida; apagar para a Lixeira; apagar para sempre (só na Lixeira, com confirmação). O sistema reconhece o cliente pelo remetente, avisa e-mail novo e cobra o e-mail de cliente sem resposta.

## 2. Conectar a caixa

1. Abra E-mail › aba "Minha caixa e assinatura".
2. Informe o endereço (vem preenchido com o e-mail do cadastro) e a senha da caixa, a mesma do webmail.
3. Toque em "Testar e conectar". O servidor testa a leitura (IMAP mail.metrolabs.com.br:993) e o envio (SMTP mail.metrolabs.com.br:465) antes de gravar.
4. Pronto: a aba "Caixa de e-mail" abre a Entrada.

Só caixas do domínio da empresa (configurável no servidor: `EMAIL_DOMINIOS`, padrão metrolabs.com.br). No COMMAND a conexão é feita uma vez também (mesma senha); cada sistema só usa a caixa de quem conectou nele.

"Trocar a senha guardada" grava a senha nova depois de testar. "Desconectar" apaga a senha guardada e o rastro das mensagens no servidor; as mensagens continuam na caixa.

## 3. Segurança e privacidade

- A senha é cifrada (AES-256-GCM) com a chave do servidor assim que chega. A chave fica em `/opt/metrolabs/sgo/cofre/chave` (fora do banco, da pasta de dados e do .env, portanto fora do backup). Quem tiver só o backup não lê as senhas. Perdendo o servidor, cada colaborador conecta de novo.
- A senha nunca volta para o navegador, nunca vai para o registro e não é lida pelo código do SGO+/COMMAND (só o serviço do servidor a abre, na hora de conectar no servidor de e-mail).
- Caixa pessoal só abre para o dono. O dono é "sistema:id do usuário" montado pelo servidor com a sessão: nem Administrador, nem gestão, nem o mesmo usuário em outro sistema abrem.
- Leitura sob demanda: nada da caixa é copiado para o banco. O banco guarda, das mensagens novas da Entrada, só remetente, assunto, data, lida e respondida, por 30 dias, para o contador e as pendências.
- HTML limpo no servidor (sem script, iframe, formulário, eventos, links javascript, CSS perigoso) e mostrado num iframe com sandbox sem script e política de conteúdo que não carrega nada de fora. Imagens externas só com "Mostrar imagens". Link pede confirmação mostrando o site de destino e destaca quando o texto do link mostra outro endereço.
- Limites por usuário: 30 mensagens ou 100 destinatários por hora, 50 destinatários por mensagem, 18 MB de anexos somados por envio, 25 MB para baixar anexo (`EMAIL_LIMITE_HORA`, `EMAIL_LIMITE_DESTINATARIOS_HORA`, `EMAIL_MAX_DESTINATARIOS`, `EMAIL_ENVIO_MAX_MB`, `EMAIL_ANEXO_MAX_MB`). O envio em nome do usuário pela caixa do sistema também conta.
- Trilha `email_auditoria` (sem conteúdo): conectar, reconectar, desconectar, envio (quantidade e domínios dos destinatários), apagar para sempre, abrir e ler caixa compartilhada, cadastro e mudança de acesso. O Administrador vê a trilha de cada caixa compartilhada.
- Senha recusada pelo servidor de e-mail: o sistema marca e para de tentar até o dono gravar a senha nova (o provedor bloqueia por tentativas erradas).

## 4. Cliente

O remetente é comparado com o e-mail do cadastro de clientes (SGO+: CAD_CLIENTES.EMAIL; COMMAND: CONTATOS.email e EMPRESAS.email) e com o domínio desses e-mails (provedores públicos como gmail.com ficam de fora; domínio que aparece em dois clientes também). A leitura mostra "Cliente: nome" com "Abrir cadastro" e "Registrar no cliente", que guarda resumo, assunto, remetente, data e quem registrou (SGO+: aba EML_CLIENTE_REGISTROS; COMMAND: EMAIL_REGISTROS). No COMMAND, o detalhe do chamado tem "Responder por e-mail", que abre a janela com o e-mail do contato do cliente e o código do chamado no assunto.

## 5. Avisos

- Número de não lidas no item E-mail do menu e balão "Novo e-mail" (SGO+ e COMMAND), lidos a cada 60 s só com a aba visível; a verificação das caixas roda no servidor a cada 3 min (`EMAIL_VERIFICAR_SEG`), uma conta por vez, só com STATUS e os envelopes novos.
- Pendência da própria pessoa no Início (central de pendências): e-mail de cliente não lido há mais de 4 horas úteis, ou lido e sem resposta há mais de 8 horas úteis.
- Gestão: sem resposta há mais de 16 horas úteis (2 dias úteis) vira item "colaborador com e-mail de cliente parado" na Caixa de decisões do gestor da área da pessoa (GES_TIPOS `email_cliente_parado`) e sobe a escada de cobrança (e-mail diário, resumo diário do WhatsApp da gestão, Diretoria). O item tem só o nome, os clientes e o tempo parado; nunca assunto ou texto.
- WhatsApp: nunca um aviso por e-mail recebido; só o resumo diário da escada da gestão.
- Prazos ajustáveis pelo Administrador em E-mail › Caixas compartilhadas › Prazos dos avisos.

## 6. Caixas compartilhadas (Administrador do SGO+)

E-mail › aba "Caixas compartilhadas" › "Cadastrar caixa compartilhada": endereço, nome que o cliente vê, senha (testada), áreas e pessoas com acesso. Quem tem acesso escolhe a caixa no seletor acima das pastas. Ao responder, a mensagem fica marcada "Respondendo: nome" por 30 minutos e, depois do envio, "Respondida por nome". No COMMAND a caixa aparece para quem tem a conta ligada ao SGO+ (sgo_id) e foi liberado por pessoa ou pela área do cadastro do SGO+. Uma caixa é pessoal ou compartilhada, nunca as duas.

## 7. Para as outras telas: enviar como o usuário

SGO+ (servidor do legado):

```
SGO_Email_enviarComoUsuario_({ usuarioId, para, cc, cco, assunto, html | texto, responderPara,
  anexos: [ { arquivoId, nome?, tipo? } | { conteudo: base64, nome, tipo } | { blob, nome? } | Blob ] })
→ { ok, via: 'pessoal' | 'sistema', de, responderPara, messageId?, salvoEmEnviados?, message? }
```

COMMAND: `cmdEmailEnviarComoUsuario_({ usuarioId, para, cc, cco, assunto, html | texto, anexos: [{ conteudo, nome, tipo } | Blob] })`, mesmo retorno.

Com caixa pessoal conectada, sai da caixa da pessoa (cópia em Enviados; a resposta do cliente cai na caixa dela). Sem caixa, sai pela caixa do sistema (sistema@metrolabs.com.br) com o nome da pessoa e "responder para" o e-mail do cadastro. Nunca lança erro. Os dois caminhos contam no limite por hora. Já usado por "Enviar documento" (SGO_EnviarDoc.js).

## 8. Erros comuns

| O que aparece | O que fazer |
|---|---|
| O servidor de e-mail recusou a senha | Confira no webmail; se trocou a senha, "Trocar a senha guardada". |
| Só dá para conectar caixas da empresa | Use o endereço @metrolabs.com.br. |
| Limite de envio atingido | "Salvar rascunho" e envie mais tarde. |
| A mensagem não está mais na pasta | Foi movida ou apagada no webmail ou celular; procure nas pastas e na Lixeira. |
| O e-mail integrado só funciona no servidor próprio | Entre por sgo.metrolabs.com.br ou command.metrolabs.com.br. |
