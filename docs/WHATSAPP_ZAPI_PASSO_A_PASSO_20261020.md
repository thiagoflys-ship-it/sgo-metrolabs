# WhatsApp da empresa pela Z-API — passo a passo para o responsável pelo sistema

Data: 20/10/2026. Vale para o SGO+ e o COMMAND: os dois falam pelo mesmo número e as chaves são gravadas uma vez só, no SGO+.

## 1. No painel da Z-API (app.z-api.io)

1. Abra a instância do WhatsApp da Metrolabs.
2. Se a instância estiver desconectada, leia o QR Code com o WhatsApp do celular da empresa (WhatsApp > Aparelhos conectados > Conectar um aparelho). Deixe esse celular ligado, com bateria e internet.
3. Copie a **identificação da instância** (ID da instância) e o **token da instância**.
4. No menu **Segurança**, ative e copie o **token de segurança da conta** (Client-Token).
5. Não é preciso configurar o webhook à mão: o botão "Configurar recebimento" do SGO+ faz isso (passo 3.2).

## 2. No SGO+, em Chaves e senhas

1. Abra o cartão **Z-API**.
2. Cole cada valor no campo dele e clique em **Gravar**:
   - Z-API: identificação da instância
   - Z-API: token da instância
   - Z-API: token de segurança da conta
3. Abra o cartão **WhatsApp oficial (Meta)** e, em **Provedor do WhatsApp em uso**, escolha **Z-API** e clique em **Gravar**. A partir daí os dois sistemas mandam pela Z-API. Para voltar à Meta, escolha "WhatsApp oficial (Meta)" no mesmo campo.
4. Opcional: ajuste a proteção do número no cartão Z-API (vazio = padrão).

## 3. Botões do cartão Z-API, nesta ordem

1. **Conferir conexão** — faixa verde "Conectada" com o número da empresa. Se vier "Desconectada", leia o QR Code no painel da Z-API e confira de novo.
2. **Configurar recebimento** (uma vez) — grava na Z-API o endereço do COMMAND para as mensagens recebidas e para a situação das enviadas. O endereço tem um segredo que o sistema gera e guarda sozinho; ele não aparece na tela e não precisa ser copiado.
3. **Enviar mensagem de teste para mim** — chega no celular do seu cadastro (Administração > Usuários > Celular).
4. Mande uma mensagem de outro celular para o número da empresa e confira no COMMAND (Caixa de Entrada ou atendente).

## 4. No COMMAND

- Integrações > aba Z-API: deve mostrar "Provedor em uso: Z-API" e a linha "Proteção do número". As chaves não são gravadas ali.
- Na mesma aba, preencha o número da linha, o setor e quem recebe as mensagens novas e clique em Salvar a linha (para a Caixa de Entrada).
- Assistente do ponto: a aba do administrador passa a se chamar "Mensagens do WhatsApp" e mostra os textos. Nada a aprovar.

## 5. Proteção do número (padrão)

- Intervalo sorteado de 3 a 8 segundos entre uma mensagem e a próxima, somando SGO+ e COMMAND.
- Até 40 avisos por hora, 200 por dia e 6 por hora para o mesmo celular. Passou do limite, o aviso fica no sistema e o envio é registrado com o motivo; sai na próxima rodada.
- Respostas a quem escreveu para a empresa e testes não são barrados pelo limite (respeitam só o intervalo).
- Só recebe aviso quem tem celular válido no cadastro; telefone fixo é pulado.
- Continuam valendo as regras de cada aviso: dia útil, horário de trabalho, um resumo por dia, ponto só para CLT.
- Número novo na Z-API: comece com limites baixos (por exemplo 20 por hora e 100 por dia) e aumente aos poucos.

## 6. Se algo não sair

- Veja o motivo em Notificações enviadas (SGO+) ou na tela do módulo (COMMAND). "Limite", "fora do expediente" e "um resumo por dia" são regras, não erro.
- "Client-Token" recusado: grave de novo o token de segurança da conta.
- "Desconectada": o celular da empresa perdeu a conexão; leia o QR Code de novo.
