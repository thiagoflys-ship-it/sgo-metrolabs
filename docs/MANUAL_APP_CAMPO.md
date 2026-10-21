# SGO+ Campo — Manual do aplicativo do técnico

Versão de 21/10/2026. O SGO+ Campo é o aplicativo do técnico de campo da Metrolabs. Ele substitui o aplicativo do Auvo
nos atendimentos que nascem no SGO+. É instalado pelo próprio navegador do celular (Android ou iPhone), sem loja de
aplicativos, e usa o mesmo usuário e senha do SGO+.

Endereço: `https://sgo.metrolabs.com.br/campo/`

A mesma ajuda está dentro do aplicativo, no botão **Ajuda** (canto de cima, em todas as telas).

## 1. Instalar

### Android (Chrome)

1. Abra o endereço no Chrome, com internet.
2. Entre com o seu usuário e senha do SGO+.
3. Toque em **Instalar o app** (aparece no aviso amarelo ou em Minha conta). Se não aparecer, toque no menu de três
   pontos e em **Instalar aplicativo** ou **Adicionar à tela inicial**.
4. Daqui em diante, abra sempre pelo ícone **SGO+ Campo**.

### iPhone (Safari)

1. Abra o endereço no **Safari** (não em outro navegador), com internet.
2. Toque em **Compartilhar** (o quadrado com a seta para cima) e em **Adicionar à Tela de Início**.
3. Abra pelo ícone **SGO+ Campo** que apareceu na Tela de Início e entre com o seu usuário.
4. Use sempre o ícone. No iPhone, o que um site guarda no Safari pode ser apagado pelo próprio aparelho depois de alguns
   dias sem uso; pelo ícone da Tela de Início isso não acontece. Enquanto o app não estiver na Tela de Início, ele mostra
   um aviso amarelo explicando isso.

## 2. Meu dia

- Mostra as suas O.S. de **hoje** (e as que ficaram abertas de dias anteriores, marcadas em vermelho) e as de
  **amanhã**, na ordem definida pelo supervisor.
- Abra o app com internet ao menos uma vez por dia, de preferência antes de sair. É quando a agenda é baixada e fica
  guardada no celular. A linha "Agenda atualizada às ..." mostra quando foi a última vez.
- Cada cartão mostra cliente, horário, tipo de serviço, prioridade, endereço, equipamento e a situação ("A fazer",
  "Em atendimento", "Concluída, aguardando envio", "Concluída e enviada").
- **Atualizar agenda** baixa de novo quando houver sinal.

## 3. Atendimento, passo a passo

Toque no cartão da O.S. Em cima ficam cliente, unidade, endereço, responsável, problema e orientação; os botões
**Abrir no mapa** (abre o aplicativo de mapas do celular) e **Ligar**; o equipamento (TAG, nº de série, setor) e os
últimos atendimentos dele (inclusive os do Auvo). Embaixo, o passo a passo. Cada passo fica com um visto quando está
feito, e "Falta" em vermelho quando é obrigatório e ainda não foi feito.

1. **Saí para o atendimento** (opcional): ao sair para o cliente. Não registra localização.
2. **Cheguei**: ao chegar. O app avisa antes: a localização é registrada **só neste toque e no Concluí**, nunca o tempo
   todo. Pode escolher **Registrar sem localização**; o registro vale do mesmo jeito, com a observação.
3. **Confirmar equipamento**: no Android, **Ler o QR do equipamento** (tira uma foto da etiqueta QR do SGO+). Em
   qualquer celular, confirme pela série ou pela TAG. Se a série da etiqueta for outra, digite-a: o app aceita e a gestão
   é avisada da série divergente (o cadastro não muda sozinho).
4. **Checklist**: responda cada pergunta (Sim / Não / Não se aplica, opções, números, data, texto ou foto). As
   obrigatórias estão marcadas. Número aceita vírgula ou ponto. Cada resposta é guardada na hora.
5. **Fotos**: **Tirar foto** abre a câmera; **Escolher da galeria** usa uma foto já tirada. A foto é reduzida no próprio
   celular (lado maior até 1600 pixels, cerca de 300 KB) e leva gravados o número da O.S., a data e a hora. Escreva uma
   legenda curta. Foto ainda não enviada pode ser removida; depois de começar a subir, não.
6. **Peças**: **Aplicada** para a peça usada; **Falta (pedir)** para a peça que precisa ser comprada (abre o pedido em
   Compras e a O.S. fica aguardando peça), com urgência Normal ou Urgente. Lançou errado: **Desfazer**.
7. **Relato**: condição encontrada, causa, serviço realizado, teste funcional, recomendações e observações. Pode usar o
   microfone do teclado para ditar. Toque em **Guardar relato** (sair da tela também guarda).
8. **Assinatura do cliente**: o responsável assina no quadro com o dedo e informa nome e documento (CPF, RG ou
   matrícula). Sem quem assine: **Registrar sem assinatura**, com o motivo, o nome de quem recebeu o serviço e a
   justificativa.
9. **Concluí**: só libera quando não falta nada. A tela diz em palavras o que falta (por exemplo: "1 foto (mínimo 2)",
   "A assinatura do cliente ou o motivo de não haver assinatura"). Ao concluir, o app pede a localização de novo, com o
   mesmo aviso. Depois de concluída, a O.S. não muda mais no celular; correções são feitas pela gestão na tela do SGO+.

## 4. Sem sinal (subsolo, centro cirúrgico, estrada)

- Trabalhe normalmente. Tudo o que você faz fica guardado no celular, inclusive fotos e assinatura, mesmo que o app seja
  fechado ou o celular desligado.
- A barra de baixo, sempre visível, mostra **Pendente de envio (N)** e a situação ("Sem sinal: guardado no aparelho",
  "Enviando...", "Tudo enviado às 14:32").
- Quando o sinal volta, o app envia sozinho, na ordem em que as coisas foram feitas, uma foto de cada vez. Se a conexão
  cair no meio, ele tenta de novo; o servidor reconhece o que já recebeu e **nada é registrado duas vezes**.
- Para forçar, toque na barra e em **Enviar agora**.
- **Nada é apagado do celular antes do servidor confirmar.**
- Se a sessão terminar no servidor (muitas horas sem uso), o app mostra "A sua sessão terminou" e o botão **Entrar de
  novo**. O que está guardado não se perde: depois de entrar, o envio continua.
- Itens guardados há mais de 12 horas sem envio geram um aviso vermelho: abra o app num lugar com internet.

## 5. Envios

Toque na barra **Pendente de envio (N)**. A tela lista:

- **Esperando envio**: o que ainda não subiu, com a hora em que foi feito e as tentativas.
- **Recusados pelo servidor**: com o motivo e o que fazer. Quando dá para corrigir, há **Tentar de novo**. Quando não
  adianta reenviar (por exemplo, O.S. cancelada ou de outro técnico), o item fica guardado como registro; fale com o
  supervisor.
- **Enviados**: os últimos confirmados, com a hora do envio.

## 6. Trocar de celular (ou entregar o aparelho)

1. No celular antigo, abra o app com internet e espere **Pendente de envio (0)**.
2. Só depois desinstale, limpe ou entregue o aparelho. O que não foi enviado existe **só naquele celular**.
3. No celular novo, instale o app (item 1) e entre com o seu usuário. A agenda e o que já está no servidor (chegada,
   respostas, fotos, relato, assinatura) são baixados de novo.

Celular perdido ou quebrado com itens pendentes: avise o supervisor. O que não chegou ao servidor terá de ser
registrado de novo pela gestão.

## 7. Cuidados

- Não limpe os dados do navegador nem desinstale o app com itens pendentes.
- No iPhone, use sempre o ícone da Tela de Início e abra o app com internet todos os dias.
- Um celular por pessoa. Se outra pessoa entrar no mesmo celular, o que é seu fica guardado e só é enviado quando você
  entrar de novo; o app avisa que há itens de outro usuário.
- **Sair** (em Minha conta) não apaga o que está guardado para envio.
- **Letra grande** (em Minha conta) aumenta textos e botões.
- Quando houver versão nova, aparece **Versão nova do app pronta — Atualizar agora**.

## 8. Para a gestão e o suporte

- O app chama as funções do contrato `docs/API_APP_TECNICO.md` (Ast_appMeuDia, Ast_appSincronizar, Ast_appEnviarFoto)
  pelo `/api/run` do servidor, com o número de pedido no cabeçalho `X-Pedido-Id`. Cada ação tem uma chave única do
  aparelho (`idLocal`); o servidor guarda a hora do aparelho e a do recebimento.
- O aplicativo fica em `sgo_servidor/src/publico/campo/` (página, service worker, manifest, ícones) e é servido por
  `src/servicos/campo.ts`. Ele só existe no endereço do SGO+.
- A localização é coletada só nos toques Cheguei e Concluí.
