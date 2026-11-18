# Roteiro do piloto do Portal do cliente

**Para:** equipe da Metrolabs (Diretoria, gestão comercial, triagem da Assistência técnica e quem acompanha o cliente).
**Cliente do piloto:** CENTRAL DE REPROCESSAMENTO DE MATERIAIS LTDA, CNPJ 01.129.614/0001-30 (no cadastro: `f680a58b-ae58-4b83-b1ba-8a250f7cc76d`).
**Duração:** 2 semanas (10 dias úteis). **Pessoas do cliente:** 1 Gestor do cliente e 2 Solicitantes.
**Base:** especificação `ESPEC_PORTAL_CLIENTE.md` (etapa 6 e decisão 19) e o manual interno `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` (seções 3, 23 a 28).

Nada foi cadastrado para este roteiro. Os itens marcados **[DADO DO DONO]** dependem de informação real que ainda não está no sistema e não pode ser inventada.

---

## 1. Dados que o dono precisa fornecer antes de começar

| # | Dado | Para quê | Onde entra |
|---|---|---|---|
| 1 | **[DADO DO DONO]** Contrato real com a Central: número, objeto em uma frase, serviços contratados e a periodicidade de cada um, início e fim da vigência, se renova sozinho, origem (proposta aprovada no Comercial ou PDF do contrato assinado) e unidades cobertas | Sem contrato cadastrado o cliente fica na vigência provisória até 31/12/2026 e o cronograma "Previsto" não sai | Portal do cliente > Contratos de clientes > Registrar contrato |
| 2 | **[DADO DO DONO]** Prazos de atendimento do contrato por prioridade, se o contrato tiver | O prazo que o cliente vê na ficha do chamado | Regras da assistência > Contratos (ligado ao contrato) |
| 3 | **[DADO DO DONO]** Responsável da Metrolabs pelo contrato | Recebe os avisos de vencimento e acompanha o piloto | Campo "Responsável" do contrato |
| 4 | **[DADO DO DONO]** Gestor do cliente: nome completo, e-mail de trabalho individual e cargo | Convite e aprovação de orçamento | Acessos de clientes > Convidar (papel Gestor do cliente, todas as unidades) |
| 5 | **[DADO DO DONO]** Solicitante 1: nome completo, e-mail de trabalho individual, cargo e as unidades em que ele pode abrir chamado | Convite | Acessos de clientes > Convidar (papel Solicitante) |
| 6 | **[DADO DO DONO]** Solicitante 2: os mesmos dados | Convite | Acessos de clientes > Convidar (papel Solicitante) |
| 7 | **[DADO DO DONO]** Data de início do piloto e quem da Metrolabs faz a apresentação ao Gestor | Agenda | — |
| 8 | **[DADO DO DONO]** Contato do encarregado de dados (LGPD), pendente desde a etapa 1 | Aparece no termo de uso que as três pessoas aceitam | Regras do portal > Contato do encarregado |
| 9 | **[DADO DO DONO]** Telefone de plantão, se houver (pendente desde a etapa 2) | Aparece ao cliente quando o equipamento está parado fora do expediente | Regras do portal > Chamados do portal |
| 10 | **[DADO DO DONO]** Contato comercial que o cliente deve ver (nome, telefone ou e-mail) | Faixas de carência e consulta | Regras do portal > Contato comercial |

O e-mail de cada pessoa precisa ser individual (nunca de setor): ele é o login e o destino dos avisos.

---

## 2. Antes do primeiro dia (D-3 a D-1)

### 2.1 Publicação e chaves (responsável pelo sistema)
1. Publicar a etapa 6 (legado `cand19`), com a suíte completa em 0 falhas.
2. Conferir na aba **Segurança** (Portal do cliente > Contratos de clientes) que a **trava do legado**, a **recusa do servidor** e a **lista mínima** estão **desligadas**. Nada se liga durante a primeira semana do piloto.
3. Conferir que o painel "Pronto para ligar?" mostra a observação do servidor em andamento (desde 18/11/2026 00:16).

### 2.2 Cadastro do contrato (gestão comercial ou Diretoria)
1. Portal do cliente > Contratos de clientes > **Registrar contrato**. Busque por "01129614".
2. Preencha com os dados do item 1 da tabela: unidades, número, origem, objeto, serviços e periodicidade, início e fim, responsável, e o motivo "Contrato do piloto do Portal do cliente".
3. Se houver o PDF do contrato, use "Ler o contrato com a IA", confira cada sugestão com o trecho e só então aplique e grave.
4. Confira que a situação do cliente passou para **Acesso completo** e que o selo "contrato a cadastrar" sumiu.

### 2.3 Cadastro do cliente (triagem da Assistência e Qualidade)
1. Cadastros > Clientes: CNPJ, endereço e e-mail do cadastro corretos.
2. Unidades e equipamentos: todos os equipamentos do contrato cadastrados na unidade certa, com TAG, série e setor.
3. **Documentos no portal** (aba da tela Portal do cliente): busque a Central e confira cada documento que vai aparecer. Oculte, com motivo, o que não deve ir ao cliente.
4. Peça a alguém da equipe para conferir as pastas do prontuário de um equipamento (o mesmo que o cliente vê pelo QR Code e em Documentos técnicos > Por pastas), inclusive PGT e POP da unidade.

### 2.4 Convites (quem tem a caixa «Enviar acesso ao cliente»)
1. Portal do cliente > **Acessos de clientes** > escolha a Central.
2. Convide o Gestor do cliente: papel **Gestor do cliente**, unidades "Todas", cargo.
3. Convide os dois Solicitantes: papel **Solicitante**, com as unidades de cada um.
4. Confira em **Uso do portal** que os três convites aparecem como pendentes. O convite vale por tempo limitado; se vencer, use "Reenviar convite".

### 2.5 Equipe preparada
- Triagem da Assistência: sabe que os pedidos do portal chegam em Assistência técnica > Solicitações dos clientes, com prazo de resposta de 240 minutos úteis, e que a recusa e o complemento vão para o cliente.
- Quem responde conversas (caixa «Responder pedidos e conversas do portal»): acompanha **Conversas do portal** duas vezes por dia.
- Todos: o cliente vê o primeiro nome seguido de "(Metrolabs)"; nada de valores, prazos internos ou nomes de outros clientes na conversa.

---

## 3. Primeiro dia (D0): apresentação ao Gestor do cliente

Reunião ou ligação de 30 minutos, com a tela compartilhada.

1. O Gestor abre o convite, cria a senha e entra. Confirme que a janela do **termo de uso** aparece e que ele aceita.
2. Mostre o **Início**: cartões, "O que precisa de você" e os atalhos.
3. Mostre **Documentos técnicos** e a aba **Por pastas (prontuário)**, com PGT e POP.
4. Mostre **Meus equipamentos** (farol e ficha) e a aba **Unidades**.
5. Mostre **Minha conta e equipe**: preferências de aviso por e-mail e a aba **Minha equipe** (pedir acesso e desligar).
6. Entregue o manual: `docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.pdf` (o mesmo texto está no Portal, em Início > "Manual do Portal").
7. Combine o primeiro chamado acompanhado (item 4).

Os Solicitantes entram no mesmo dia ou no seguinte, cada um com o próprio convite.

---

## 4. Primeiro chamado acompanhado

Escolham juntos um caso real (uma falha atual ou uma verificação preventiva). Se não houver, combine um pedido de verificação de um equipamento em funcionamento, com a situação "Funcionando".

| Passo | Quem | O que conferir |
|---|---|---|
| 1. Abrir o chamado pelo Portal | Solicitante | O formulário pede tudo e o pedido chega com setor, contato, situação, risco e fotos. O e-mail "Pedido recebido" chega a quem abriu |
| 2. Aceitar, pedir complemento ou recusar | Triagem | Resposta dentro do prazo de 240 minutos úteis. O cliente vê a etapa mudar e recebe o e-mail de aceite |
| 3. Conversar | Solicitante e Metrolabs | Uma mensagem de cada lado na ficha; o resumo por e-mail sai no horário comercial |
| 4. Agendar a visita | Assistência | A ficha mostra a data e o técnico; o e-mail de visita agendada chega |
| 5. Orçamento, se houver | Assistência e Gestor | Só o Gestor aprova; o comprovante fica no chamado |
| 6. Atendimento e encerramento | Técnico | O relatório da O.S. abre pelo Portal; o e-mail de conclusão chega |
| 7. Confirmar | Solicitante | "Confirmar atendimento" ou "O problema continua"; "Gerar relatório do atendimento" funciona |

Registre o horário de cada passo; ele alimenta os critérios de sucesso.

---

## 5. O que observar durante as duas semanas

Diariamente (5 minutos, responsável do piloto):
- **Uso do portal** (aba da equipe): entradas, documentos abertos, pedidos pelo portal e pelos outros canais, avisos enviados e os que falharam.
- **Conversas do portal**: mensagens sem resposta.
- **Painel "Pronto para ligar?"** (aba Segurança): se alguma conta da Central chamou função fora da lista mínima. Depois da etapa 6, o esperado é só a entrada do Portal e o básico da sessão.

Semanalmente:
- Pedidos pelo portal ÷ todos os pedidos da Central (telefone, e-mail, QR).
- Tempo médio de aceite do pedido.
- Dúvidas que se repetem na Conversa geral (viram ajuste no manual ou na ajuda).
- Uso no celular: peça ao Gestor para abrir o Portal no celular e contar o que achou.

Anote também qualquer mensagem de recusa que o cliente relatar, com a tela e o horário.

---

## 6. Critérios de sucesso

| # | Critério | Meta |
|---|---|---|
| 1 | As três pessoas entraram e aceitaram o termo de uso | 3 de 3 na primeira semana |
| 2 | Pelo menos um chamado aberto pelo Portal percorreu as etapas até "Concluído", com confirmação | 1 ou mais |
| 3 | Pedidos do portal aceitos (ou com complemento pedido) dentro do prazo de resposta | 100% |
| 4 | Nenhum dado de outro cliente visto; nenhuma tentativa "fora do acesso" inesperada no registro | 0 |
| 5 | Nenhuma função fora da lista mínima chamada pelas contas da Central nos últimos 7 dias | 0 |
| 6 | Avisos por e-mail entregues às três pessoas, sem falha de envio | 100% |
| 7 | O Gestor encontra sozinho um certificado, o PGT da unidade e a situação de um equipamento | Sim |
| 8 | Avaliação do Gestor ao fim (três perguntas: o que ajudou, o que atrapalhou, o que falta) | Registrada |

Com os critérios 1 a 6 atingidos, a recomendação é seguir o passo a passo da seção 28.4 do manual interno: ligar a trava do legado, depois a recusa do servidor e, por último, a lista mínima; e então abrir o Portal para os demais clientes com contrato.

---

## 7. Como voltar atrás

Cada medida é independente e não apaga nada.

| Situação | O que fazer | Onde |
|---|---|---|
| Uma tela parou de funcionar para o cliente depois de ligar uma chave | Escolher "Desligada" (ou "Transição") na chave, com motivo. Vale em até 1 minuto | Contratos de clientes > Segurança |
| E-mails ao cliente com problema | Desligar os avisos pelo Portal, com motivo (o que passa a sair em cada caso está na seção 26 do manual interno) | Regras do portal > Avisos ao cliente por e-mail |
| Uma pessoa não deve mais acessar | "Desligar", com motivo. A sessão cai na próxima ação | Acessos de clientes |
| O piloto precisa parar por completo | "Suspender o acesso" do cliente, com motivo interno (Administrador ou Diretoria). O cliente vê só "acesso suspenso, fale com a Metrolabs" | Contratos de clientes > ficha da Central |
| A etapa 6 precisa ser desfeita | Publicar de novo a versão anterior do legado (cand18). A etapa 6 não criou tabelas nem colunas, e as chaves novas ficam sem efeito | Publicação |

Chamados abertos pelo Portal continuam na Assistência técnica como qualquer outro chamado, em qualquer dessas situações.

---

## 8. Ao final das duas semanas

1. Reunião de 30 minutos com o Gestor (avaliação, item 6, critério 8).
2. Relatório curto do piloto: critérios atingidos, problemas, ajustes feitos e a decisão (ampliar, ajustar ou parar).
3. Se ampliar: definir a ordem dos próximos clientes com contrato vigente e repetir as seções 2.2 a 2.4 para cada um.
