# Manual do responsável técnico — Modo personalizado

Este manual é do responsável técnico designado e do Administrador. A tela fica em **Qualificação e inspeção > Modo personalizado** e só aparece para quem foi designado (ou para o Administrador).

## O que mudou em 21/10/2026

- A senha única do modo personalizado, que ficava guardada em texto em Chaves e senhas, foi apagada. Cada responsável técnico tem a própria senha.
- O Administrador designa os responsáveis técnicos em **Administração > Configurações > Responsáveis técnicos do modo personalizado**.
- O modo personalizado deixou de ser um botão escondido dentro da estufa: virou uma tela própria, com as mesmas ferramentas para todos os geradores que têm parâmetros ajustáveis.

## 1. Para que serve

Alguns clientes têm protocolo próprio, acordado com a empresa executante, que pede um valor diferente da referência normativa. O modo personalizado permite usar esse valor sem esconder nada:

1. O responsável técnico ajusta o parâmetro, dentro da faixa permitida, com justificativa.
2. Os documentos gerados depois disso saem com a seção **Parâmetros personalizados**: parâmetro, valor de referência e fonte, valor usado, justificativa, quem definiu e quem aprovou.
3. A emissão final desses documentos só acontece com a aprovação de um responsável técnico com o modo aberto.
4. Tudo fica no registro de auditoria: quem, quando, de quanto para quanto e por quê.

## 2. Parâmetros que podem ser ajustados hoje

Gerador **Estufa, banho-maria e secadora** (relatório de ensaio e planilha de dados do modelo novo), por tipo de equipamento:

| Parâmetro | Referência | Faixa permitida |
|---|---|---|
| Mínimo de sensores | Estufa de incubação e de esterilização: 12 (ABNT NBR 16328:2024, Anexos F e E); banho-maria: 6 (Anexo I); secadora: 1 (protocolo) | da metade da referência (arredondada para cima) até 60 |
| Duração mínima da distribuição | Estufa de incubação: 24 h (Anexo F) | de 1 h a 72 h |
| Intervalo máximo de registro | Distribuição 60 s, eventos 10 s (Anexo F); banho-maria 30 s (Anexo I); distribuição e penetração 30 s (Anexo E) | de 1 s a 300 s |

A faixa permitida é definida na configuração do sistema (SGO_ModoPersonalizado.js). Para mudar a faixa ou incluir outro parâmetro ou outro gerador, é preciso uma alteração revisada no sistema.

Os demais geradores (autoclave, lavadora, cadeia de frio, baixa temperatura, calibração, declarações, QI/QO/QD, NR-13) não têm parâmetros no modo personalizado: os limites deles vêm do protocolo informado no ensaio, do cadastro do instrumento ou da especificação do fabricante, e já são digitados no próprio documento.

## 3. Primeira vez: designação e senha

1. O Administrador abre **Administração > Configurações**, toca em **Responsáveis técnicos do modo personalizado**, marca as pessoas (perfis Administrador, Diretoria, Gestor e Metrologia) e toca em **Gravar a lista**.
2. A pessoa designada abre **Qualificação e inspeção > Modo personalizado**.
3. No quadro **Criar minha senha do modo personalizado**, digita a senha duas vezes (pelo menos 8 caracteres, com letras e números, sem o login) e toca em **Criar minha senha**. O modo abre na hora.

A senha é guardada só como resumo (SHA-256 com sal e 2.000 repetições). Ninguém consegue ler a senha, nem o Administrador.

## 4. Entrar, sair e trocar a senha

- **Entrar:** digite a senha e toque em **Entrar**.
- O modo fica aberto por **30 minutos sem uso**; cada ação renova o prazo. Sair do SGO+ ou entrar por outro navegador pede a senha de novo.
- **Cinco senhas erradas seguidas** bloqueiam a entrada por 15 minutos. O Administrador pode desbloquear.
- **Sair do modo:** toque em **Sair do modo**.
- **Trocar a senha:** **Trocar minha senha**, digite a atual, a nova e a confirmação.
- **Esqueceu a senha:** toque em **Esqueci a senha do modo personalizado**. O link vai para o seu e-mail e vale 30 minutos; ao abrir, a senha antiga é apagada e você cria outra nesta tela. O Administrador também pode enviar o link (**Enviar link de senha nova (esqueceu)** na sua linha). Sem e-mail cadastrado, o Administrador usa **Apagar a senha agora (sem e-mail)**.

## 5. Ajustar e restaurar

1. Aba **Parâmetros**: escolha o gerador, o equipamento e em **Vale para** escolha **Todos os clientes** ou **Um cliente (buscar)...**.
2. A tabela mostra lado a lado a referência normativa (com a fonte) e o valor em uso, a faixa permitida e a situação (verde = referência; amarelo = ajustado).
3. **Ajustar:** digite o valor, escreva a justificativa (pelo menos 20 caracteres) e toque em **Gravar ajuste**.
4. **Restaurar o padrão:** na linha do parâmetro, escreva o motivo e confirme. **Restaurar todos os ajustes deste escopo** volta tudo do equipamento e do escopo escolhidos.

O ajuste de um cliente tem prioridade sobre o de todos os clientes. Documentos já emitidos não mudam.

## 6. Diferenças do padrão

A aba **Diferenças do padrão** lista tudo o que está diferente da referência em todos os geradores: referência, valor em uso, diferença, justificativa e quem ajustou. Ajuste que ficou fora da faixa permitida atual aparece em vermelho e não é aplicado.

## 7. Aprovação dos documentos

1. O técnico gera o rascunho normalmente e toca em **Enviar para aprovação**. O documento com parâmetros personalizados aparece na aba **Aprovações**.
2. O responsável técnico, com o modo aberto, toca em **Abrir no gerador para conferir e aprovar**, confere a prévia (seção **Parâmetros personalizados**) em **Aguardando aprovação** e aprova.
3. Sem o modo aberto, a emissão é recusada com a explicação; entre no modo e aprove de novo (o documento continua aguardando).
4. Se o parâmetro foi ajustado ou restaurado depois do envio, a emissão diz que os dados ou os critérios mudaram: devolva ao técnico para gerar o rascunho de novo.

## 8. Auditoria

A aba **Auditoria** mostra cada ação: inclusão e retirada de responsáveis, criação, troca e apagamento de senha (nunca o valor), entradas, senhas erradas, bloqueios, ajustes (de quanto para quanto, com o motivo), restaurações e aprovações de documentos. Filtre por período, ação ou texto. **Conferir integridade** confere se alguma linha foi alterada ou apagada (cada linha guarda o resumo SHA-256 da anterior). O Administrador também consulta a auditoria, mesmo sem ser responsável.

## 9. Problemas comuns

| Situação | O que fazer |
|---|---|
| "O modo personalizado está fechado" | Passaram 30 minutos sem uso ou você saiu do SGO+. Entre de novo com a senha. |
| "Entrada bloqueada até hh:mm" | Aguarde ou peça ao Administrador para desbloquear. |
| "Valor fora da faixa permitida" | Escolha um valor dentro da faixa; se o protocolo pedir outro, fale com o Administrador. |
| "É exclusivo dos responsáveis técnicos designados" | Peça ao Administrador para incluir o seu usuário na lista. |
| A emissão foi recusada por parâmetros personalizados | Entre no modo e aprove de novo, na mesma sessão. |
