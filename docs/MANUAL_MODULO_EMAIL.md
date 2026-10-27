# Manual do módulo E-mail integrado (SGO+ e COMMAND)

Versão de 21/10/2026, atualizada em 27/10/2026 (assinaturas com imagem, anexos por arrastar e soltar e da mensagem original, correção do filtro "De cliente"). Telas: SGO+ › Principal › E-mail (`JS_Email.html`, `SGO_Email.js`); COMMAND › E-mail (`ModEmail.html`, `Email.js`). Servidor: `sgo_servidor/src/servicos/emailPessoal.ts` (caixa, leitura, envio, verificação), `cofre.ts` (senha cifrada), `htmlSeguro.ts` (limpeza do HTML), global `SGO_EMAIL` (`compat/email.ts`).

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
- Limites por usuário: 30 mensagens ou 100 destinatários por hora, 50 destinatários por mensagem, 18 MB de anexos somados por envio, 15 MB por arquivo, 20 arquivos por mensagem, 25 MB para baixar anexo (`EMAIL_LIMITE_HORA`, `EMAIL_LIMITE_DESTINATARIOS_HORA`, `EMAIL_MAX_DESTINATARIOS`, `EMAIL_ENVIO_MAX_MB`, `EMAIL_ANEXO_ARQUIVO_MAX_MB`, `EMAIL_ANEXOS_MAX`, `EMAIL_ANEXO_MAX_MB`). O envio em nome do usuário pela caixa do sistema também conta. Por que 18 MB: o SMTP da empresa (Exim em mail.metrolabs.com.br, conferido em 27/10/2026) anuncia `SIZE 52428800` (50 MB), mas Gmail recusa acima de 25 MB e Outlook.com acima de 20 MB, contando a mensagem já codificada (base64 aumenta cerca de 33%): 18 MB de anexos dão cerca de 24 MB codificados.
- Trilha `email_auditoria` (sem conteúdo): conectar, reconectar, desconectar, envio (quantidade e domínios dos destinatários), apagar para sempre, abrir e ler caixa compartilhada, cadastro e mudança de acesso. O Administrador vê a trilha de cada caixa compartilhada.
- Senha recusada pelo servidor de e-mail: o sistema marca e para de tentar até o dono gravar a senha nova (o provedor bloqueia por tentativas erradas).

## 4. Cliente

O remetente é comparado com o e-mail do cadastro de clientes (SGO+: CAD_CLIENTES.EMAIL e CAD_CONTATOS.EMAIL; COMMAND: CONTATOS.email e EMPRESAS.email) e com o domínio desses e-mails (provedores públicos como gmail.com ficam de fora; domínio que aparece em dois clientes também).

Regras do SGO+ desde 27/10/2026 (`Email_indiceClientes_`, `Email_clienteDe_`):

- Endereço da própria empresa (@metrolabs.com.br e subdomínios) nunca é cliente, nem pelo endereço exato.
- Endereço cadastrado em mais de um cliente fica ambíguo: o selo mostra "Cliente: A ou B", a leitura mostra a faixa laranja com os nomes e "Registrar no cliente" pede para escolher. O sistema não escolhe um sozinho.
- Domínio só identifica se for próprio do cliente e de um cliente só. Provedores públicos nunca contam pelo domínio (gmail, googlemail, hotmail, outlook, live, msn, yahoo, ymail, bol, uol, terra, ig, icloud, globo, r7, zipmail, proton, aol, gmx, yandex, zoho e variações de país como hotmail.es ou yahoo.com.ar). O endereço exato de um contato no Gmail continua valendo.
- Causa do erro corrigido: em produção, 10 clientes importados do Auvo tinham EMAIL = administrativo@metrolabs.com.br (e 4 tinham vendas1@metrolabs.com.br). O endereço exato era gravado antes da exclusão do domínio da empresa e cada cliente sobrescrevia o anterior; o último da lista (IMPERIAL HOSPITALAR) ficava dono do endereço interno e todo e-mail interno de administrativo@ aparecia como "Cliente: IMPERIAL HOSPITALAR" no filtro "De cliente". Vale corrigir esses cadastros em Cadastros › Clientes (o e-mail do cliente, não o da Metrolabs). A leitura mostra "Cliente: nome" com "Abrir cadastro" e "Registrar no cliente", que guarda resumo, assunto, remetente, data e quem registrou (SGO+: aba EML_CLIENTE_REGISTROS; COMMAND: EMAIL_REGISTROS). No COMMAND, o detalhe do chamado tem "Responder por e-mail", que abre a janela com o e-mail do contato do cliente e o código do chamado no assunto.

## 5. Avisos

- Número de não lidas no item E-mail do menu e balão "Novo e-mail" (SGO+ e COMMAND), lidos a cada 60 s só com a aba visível; a verificação das caixas roda no servidor a cada 3 min (`EMAIL_VERIFICAR_SEG`), uma conta por vez, só com STATUS e os envelopes novos.
- Pendência da própria pessoa no Início (central de pendências): e-mail de cliente não lido há mais de 4 horas úteis, ou lido e sem resposta há mais de 8 horas úteis.
- Gestão: sem resposta há mais de 16 horas úteis (2 dias úteis) vira item "colaborador com e-mail de cliente parado" na Caixa de decisões do gestor da área da pessoa (GES_TIPOS `email_cliente_parado`) e sobe a escada de cobrança (e-mail diário, resumo diário do WhatsApp da gestão, Diretoria). O item tem só o nome, os clientes e o tempo parado; nunca assunto ou texto.
- WhatsApp: nunca um aviso por e-mail recebido; só o resumo diário da escada da gestão.
- Prazos ajustáveis pelo Administrador em E-mail › Caixas compartilhadas › Prazos dos avisos.

## 6. Caixas compartilhadas (Administrador do SGO+)

E-mail › aba "Caixas compartilhadas" › "Cadastrar caixa compartilhada": endereço, nome que o cliente vê, senha (testada), áreas e pessoas com acesso. Quem tem acesso escolhe a caixa no seletor acima das pastas. Ao responder, a mensagem fica marcada "Respondendo: nome" por 30 minutos e, depois do envio, "Respondida por nome". No COMMAND a caixa aparece para quem tem a conta ligada ao SGO+ (sgo_id) e foi liberado por pessoa ou pela área do cadastro do SGO+. Uma caixa é pessoal ou compartilhada, nunca as duas.

## 6A. Assinaturas (como no Outlook)

E-mail › aba "Minha caixa e assinatura" › "Assinaturas":

1. "Nova assinatura": nome (único por pessoa), texto opcional (negrito, itálico, sublinhado, link) e imagem opcional (PNG ou JPG de até 5 MB no computador). O navegador reduz a imagem para até 1000 px de largura e até 300 KB (PNG pequeno vai como está, com a transparência; senão PNG reduzido e, se precisar, JPG com fundo branco em qualidade decrescente). O servidor confere o formato e o tamanho lendo o próprio arquivo.
2. "Largura exibida da imagem" (40 a 700 px, nunca maior que a imagem) e "Posição da imagem" (abaixo ou acima do texto), com pré-visualização.
3. "Mensagens novas" e "Respostas e encaminhamentos": qual assinatura entra sozinha em cada caso (ou nenhuma). A primeira assinatura criada vira padrão das duas.
4. Na janela de escrever, o seletor "Assinatura" na barra do editor troca ou tira a assinatura que está no texto (ela fica num bloco `div.sgo-assinatura`, antes do texto citado). Trocar a caixa "De" aplica a padrão daquela caixa; caixa compartilhada com assinatura própria (cadastrada pelo Administrador) usa a dela. Rascunho reaberto mantém a assinatura que está no texto.

Guardadas no servidor por pessoa (`email_assinaturas`, chave "sistema:id"), não por caixa: desconectar não apaga. Até 10 por pessoa. Cada gravação muda uma assinatura só, dentro de transação (duas janelas não apagam a mudança uma da outra). A assinatura antiga (campo único da caixa pessoal) aparece como "Minha assinatura" até a primeira gravação.

Como a imagem chega ao destinatário: no envio, toda imagem `data:image/...;base64` do corpo (a da assinatura e as coladas no texto) vira imagem embutida por Content-ID (`cid:`, parte `multipart/related`, `Content-Disposition: inline`), que Gmail, Outlook e os aplicativos de celular mostram no corpo sem baixar nada e sem link que exija login. A mesma imagem repetida vai uma vez só. Limite de 1 MB por imagem no corpo (`EMAIL_IMAGEM_CORPO_KB`) e 20 imagens; entram na soma dos 18 MB. A imagem leva `width` e `height` (Outlook de mesa respeita) e `max-width:100%` (celular).

## 6B. Anexos

- Anexar pelo botão "Anexar arquivo" ou arrastando os arquivos para a janela de escrever (contorno tracejado; o navegador não abre o arquivo por cima do rascunho). Lista com nome, tamanho, "Tirar" e o total.
- Conferência na tela antes de ler o arquivo e de novo no servidor: 15 MB por arquivo, 18 MB somados, 20 arquivos. Pasta arrastada é recusada com a explicação (compactar em .zip).
- Encaminhar: os anexos da original vêm marcados em "Manter os anexos da mensagem original" (como no Outlook); dá para desmarcar todos ou um a um. Responder: os anexos da original aparecem desmarcados em "Incluir os anexos da mensagem original". O servidor recebe `anexosOriginais` (partes escolhidas); sem a escolha, o encaminhar leva todos, como antes.
- Rascunho: os arquivos anexados ficam no rascunho guardado. Ao reabrir pela pasta Rascunhos, aparecem como "guardado no rascunho" e vão no envio (`anexosDoRascunho`); salvar de novo não duplica. Os anexos da mensagem original não entram no rascunho: vão no envio, com a janela aberta.
- Recebidos: lista de anexos acima do texto, com nome e tamanho; tocar baixa (até 25 MB).
- A atualização automática da lista nunca redesenha a janela de escrever: rascunho e anexos ficam como estão.

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
| O limite por arquivo é 15 MB / passaria de 18 MB somados | Compacte, divida em partes, desmarque anexos da original ou mande um link de compartilhamento. |
| Limite de 20 arquivos por mensagem | Junte os arquivos num .zip ou mande em outra mensagem. |
| A imagem da assinatura precisa ser PNG ou JPG / passa de 300 KB | Salve como PNG ou JPG; recorte as bordas ou use o logotipo em PNG. |
| Uma imagem dentro do texto passa de 1024 KB | Reduza a imagem colada ou mande como anexo. |
| Filtro "De cliente" com nome errado ou e-mail interno | Confira o e-mail do cliente em Cadastros › Clientes: endereço @metrolabs nunca conta; o mesmo endereço em dois clientes aparece como "A ou B". |
| O rascunho guardado não está mais na pasta Rascunhos | Foi apagado ou enviado pelo webmail/celular; anexe de novo e envie. |
