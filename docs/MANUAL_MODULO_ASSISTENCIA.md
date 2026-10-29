# Manual do módulo Assistência técnica

Assistência técnica nativa do SGO+ (21/10/2026). Substitui o uso do Auvo para chamados, agenda, ordens de serviço,
relatório do atendimento e acompanhamento do cliente. Funciona em paralelo ao Auvo até os seis critérios da tela
"Transição do Auvo" serem cumpridos. O aplicativo do técnico no celular tem manual próprio (Manual do SGO+ Campo).

## Para que serve

Cada pedido de atendimento técnico vira um chamado com número (CH-2026-0001). O chamado passa pela triagem da gestão
da área Técnica, ganha prazo pela prioridade, é agendado para um técnico e gera a ordem de serviço (OS-2026-0001). O
técnico registra o atendimento pelo aplicativo ou pela tela; a O.S. só fecha com a documentação completa e gera o
relatório A4, salvo na pasta do equipamento e enviado ao cliente.

## Quem faz o quê

- Equipe interna: abre chamado (telefone, e-mail, presencial) e acompanha. Na fila livre, qualquer colaborador assume
  o chamado ("Assumir chamado") e faz a triagem dele.
- Técnico: registra as próprias O.S. Não vê valores de orçamento.
- Gestor da área Técnica: triagem, agenda, reagendamento, cancelamento, série divergente, indicadores. Sem gestor da
  área Técnica configurado em Caixa de decisões > Regras e responsáveis, a triagem vai para a Diretoria.
- Comercial e Financeiro: preenchem, emitem e registram a resposta do orçamento do chamado.
- Administrador, Diretoria e Gestor: alteram as Regras da assistência (inclusive quem faz a triagem e a fila livre),
  excluem chamado de teste ou simulação (com motivo) e restauram os excluídos.
- Administrador: marca "Auvo desligado" quando os seis critérios estão cumpridos.
- Cliente: em "Meus chamados" pede atendimento para os próprios equipamentos e baixa os relatórios.

## O caminho do chamado

1. Aberto: o pedido chegou (tela interna, e-mail recebido, portal do cliente, QR do equipamento, pedido aprovado do Comercial).
2. Em triagem: a gestão confirma os sintomas, o risco de continuar usando e o diagnóstico preliminar.
3. Decisão da triagem: resolvido remotamente, aguardando orçamento, aguardando peça ou planejado (visita).
4. Agendado: técnico, data, duração, tipo de serviço e preparo.
5. Em campo: em deslocamento, no local, em execução (pausado ou aguardando cliente quando preciso).
6. Execução concluída, documentação pendente: o técnico concluiu, mas falta algo da documentação.
7. Encerrado (ou Cancelado, sempre com motivo).

Chamado encerrado ou cancelado não muda. Se o problema voltar, abra outro chamado: ele aparece como reincidência
quando o mesmo equipamento teve chamado nos últimos 30 dias.

## Prazos (SLA)

O prazo de atendimento conta da abertura até a execução concluída, em horas úteis do expediente da empresa
(08:00 às 17:30, dias úteis, feriados nacionais e os cadastrados):

| Prioridade | Quando usar | Prazo de atendimento | Prazo de triagem |
| --- | --- | --- | --- |
| P1, crítica | Equipamento parado que afeta o paciente | 4 horas úteis | 30 minutos úteis |
| P2, alta | Equipamento com falha importante | 1 dia útil | 2 horas úteis |
| P3, normal | Falha que permite uso | 3 dias úteis | 4 horas úteis |
| P4, baixa | Ajuste, melhoria, dúvida | 7 dias úteis | 1 dia útil |

Contrato do cliente com prazo próprio prevalece (Regras da assistência > Contratos). O prazo só pausa ao aguardar
cliente ou peça quando o contrato permite. Selos: "Em dia", "Em risco" (resta um quarto do prazo ou menos) e
"Prazo estourado". Prazo em risco ou estourado entra na Caixa de decisões da área Técnica.

## Abrir um chamado

1. Menu > Assistência técnica > Abrir chamado.
2. Busque o cliente pelo nome ou CNPJ e escolha a unidade e o equipamento. Equipamento fora do cadastro: marque
   "Equipamento não identificado" e descreva; a triagem liga ao cadastro.
3. Escreva o problema relatado, quem pediu e o contato. Escolha a prioridade e se o equipamento está parado.
4. Toque em "Abrir o chamado". Se o equipamento já tem chamado em aberto, a tela avisa: acompanhe pelo chamado aberto
   ou toque em "Abrir mesmo assim" se for outro problema.

Pelo e-mail integrado: abra a mensagem do cliente e toque em "Abrir chamado"; o texto, o remetente e o cliente
reconhecido já vêm preenchidos.

Pedido do cliente pelo portal ou pelo QR entra em "Solicitações dos clientes": a equipe confere e abre o chamado
(ou descarta com o motivo). O chamado não nasce sozinho, para não haver chamado duplicado ou errado.

### Aberta em campo (pelo técnico, no aplicativo)

Desde 22/10/2026 o técnico abre atendimento fora da agenda pelo SGO+ Campo (botão "Novo atendimento"): localiza ou cadastra
o cliente, a unidade e o equipamento e abre a O.S. na hora, inclusive sem internet. No SGO+:

- O chamado nasce com canal "Presencial", a **triagem feita em campo** pelo próprio técnico (sintomas confirmados no local,
  decisão "visita") e a O.S. já no nome dele; não entra na fila de triagem. Chamado e O.S. levam o selo **Aberta em campo**
  (lista e ficha), e a gestão da área Técnica recebe o aviso AT01 "atendimento aberto em campo".
- O cadastro feito em campo entra marcado **criado em campo por <técnico> em <data>** e vira a pendência "cadastro criado em
  campo para conferir" na Central e na Caixa de decisões da área Técnica (2 dias úteis). Em Assistência técnica > Chamados, o
  quadro "Cadastros criados em campo a conferir" lista cada um: confira em Cadastros (Clientes, Unidades, Equipamentos ou
  Vínculos), corrija se precisar e toque em "Conferido" (com o que foi conferido). Nada fica bloqueado enquanto isso.
- Nunca em dobro: antes de criar, o servidor confere CNPJ, nome, série e TAG; se já existir, usa o existente e avisa o
  técnico ("já cadastrado como ..."). Vale o original: cadastro repetido é consolidado em Vínculos.
- Equipamento que já tem O.S. aberta com o mesmo técnico: o aplicativo continua nela.

## Triagem

### Chamado pendente de triagem e fila livre (27/10/2026)

Decisão do dono: "Alerta + fila livre".

- Quem faz a triagem: as pessoas marcadas em Regras da assistência > Triagem e fila livre. Sem ninguém marcado, vale o
  de antes: o responsável da área Técnica em Caixa de decisões > Regras e responsáveis (é assim que a triagem chega à
  Bruna hoje); sem ele, o Gestor da área Técnica; sem ele, a Diretoria.
- Chamado novo nasce "Pendente de triagem". Quem faz a triagem recebe o aviso de sempre (AT01, no sistema e por e-mail)
  com a hora em que o chamado vai para a fila livre. A gestão (Gestor da área Técnica e Diretoria) recebe o alerta
  "Chamado pendente de triagem" (AT18, só no sistema). Na central de pendências o item se chama "Chamado pendente de
  triagem" e diz até quando está reservado.
- Contador: o número ao lado de "Chamados" no menu mostra quantos chamados a pessoa pode assumir agora (vermelho quando
  há fila livre); ele se atualiza a cada 5 minutos com a aba aberta, sem mexer em nenhuma tela. Na lista, a faixa do alto
  mostra os pendentes e quantos estão na fila livre, com os botões "Ver a triagem" e "Ver a fila livre".
- Fila livre: se ninguém assumir em 30 minutos úteis (configurável de 5 a 480; conta só o expediente, então o chamado
  aberto às 17:20 entra na fila às 08:20 do dia útil seguinte), o chamado entra na fila livre. Uma vez por chamado, os
  técnicos disponíveis (sem atendimento em andamento), quem faz a triagem e a gestão recebem o aviso no sistema (AT19).
  A mensagem é curta: "se puder, assuma; se já está em outro atendimento, não precisa fazer nada". E-mail e WhatsApp do
  AT19 começam desligados na matriz de avisos; se a gestão ligar o WhatsApp, valem as regras da matriz (CLT, piloto,
  expediente e teto do dia).
- "Assumir chamado" (na lista e na ficha, botão grande para o celular): o chamado vai para "Em triagem" com quem assumiu
  e quando (selo "Assumido por ... em ..." e histórico). Quem fazia a triagem é avisado no sistema quando outra pessoa
  assume pela fila livre. Dois colegas não assumem o mesmo chamado: o segundo vê "já foi assumido por ... em ...".
- Quem faz a triagem e a gestão podem assumir a qualquer momento; começar a preencher a triagem também é assumir.
  Antes da fila livre, os demais colaboradores veem "reservado para a triagem de ... até ...".
- A conferência da fila livre roda com o gatilho da Assistência (de 15 em 15 minutos) e a cada abertura da lista.

### Preencher a triagem

1. Abra o chamado e preencha os sintomas confirmados, o risco de continuar usando e o diagnóstico preliminar.
2. Mude a prioridade se precisar (com o motivo; o prazo é recalculado).
3. Escolha o tipo de serviço e o caminho:
   - Resolvido remotamente: descreva a orientação. Depois, encerre com quem confirmou no cliente e o teste.
   - Precisa de orçamento: descreva o que orçar. O Comercial recebe a atividade.
   - Precisa de peça: diga qual peça. O pedido abre sozinho em Compras, ligado ao cliente e ao chamado.
   - Planejar visita: o chamado vai para "Planejado" e aparece para agendar.

## Agenda e despacho

1. No chamado "Planejado", escolha o técnico (usuário ativo com perfil Técnico ou da área Técnica), a data, a hora,
   a duração e o tipo de serviço.
2. Confirme o preparo: ferramentas, instrumentos calibrados, acesso combinado, documentação, peças (ou por que não
   precisa) e a avaliação de risco.
3. Toque em "Agendar". Se o técnico já tem O.S. no horário, tarefa aberta no Auvo ou ausência (férias, afastamento,
   dispensa do ponto), a tela mostra o conflito. Escolha outro horário ou confirme com o motivo (a gestão é avisada).
4. Reserve o veículo livre sugerido pela Frota, se precisar. A reserva fica no nome do técnico e ligada ao cliente.

O técnico recebe a atividade "Atender OS-..." em Minhas atividades, com prazo no fim do atendimento; ela é concluída
sozinha quando a O.S. fecha. O cliente recebe por e-mail "visita agendada" no agendamento, "visita reagendada" no
reagendamento (que exige motivo e avisa também o técnico, e o anterior, se mudou) e "retorno agendado" quando a mesma
O.S. volta à agenda depois da peça ("Liberar para agendar" + "Agendar", ou a volta automática de Compras).

Contrato com prazo de chegada ao local (Regras da assistência > Contratos, coluna "chegada em minutos úteis"): a ficha
do chamado mostra o selo "Chegada ao local até ..." ao lado do prazo de atendimento, fechado pelo "Cheguei" da O.S.

Chamado crítico (P1) sem triagem concluída em 30 minutos: pendência própria, crítica, na Caixa de decisões da gestão e
da Diretoria, com um aviso (uma vez por chamado).

O.S. com documentação pendente (ou chamado aguardando peça) pode voltar à triagem pela gestão, com motivo, quando o
técnico descobre em campo que precisa de orçamento ou de outro diagnóstico: "Voltar à triagem" na ficha do chamado. A
O.S. fica pausada e volta à agenda quando a triagem decidir "planejar visita".

Agenda dos técnicos: dia ou semana, com os atendimentos do SGO+ e do Auvo, reservas de veículo e ausências. "Rota do
dia" mostra as paradas na ordem e o caminho no mapa; a gestão muda a ordem e o técnico vê a mesma no Meu dia.

## Ordem de serviço

O técnico registra pelo aplicativo do celular (funciona sem internet) ou em Assistência técnica > Ordens de serviço:

1. Cheguei: registra a hora e, se o aparelho permitir, a localização. Localização só nos toques Cheguei e Concluí,
   nunca o tempo todo. Chegada longe do endereço da unidade vira observação para a gestão, não bloqueio.
2. Checklist do tipo de serviço (itens com * são obrigatórios), fotos de cada pergunta de foto e fotos gerais.
3. Relato: condição encontrada, causa, serviço realizado, teste funcional, recomendações e o número de série
   conferido (ou leitura do QR). Série diferente do cadastro é aceita, avisada à gestão e vira pendência até alguém
   conferir; o cadastro não muda sozinho.
4. Peças aplicadas. Peça em falta abre o pedido em Compras e a O.S. fica aguardando peça. Quando Compras recebe e
   confere a peça, o chamado volta sozinho a "Planejado" com "peça disponível em ..." e entra na Caixa de decisões
   como "retorno a agendar"; o técnico e a gestão são avisados e o cliente recebe o e-mail "peça chegou, retorno será
   agendado". A gestão toca em "Agendar o retorno" (mesma O.S.) e o cliente recebe "retorno agendado para dd/mm".
   Recebimento com divergência não devolve o chamado (só depois de "Divergência resolvida").
5. Assinatura do cliente no quadro, com o nome (e o documento, se quiser). Sem o responsável: "Responsável ausente",
   com o nome de quem recebeu e a justificativa.
6. Concluí: registra a conclusão.

A O.S. só fecha com a documentação completa do tipo de serviço: chegada, relato, condição encontrada, teste
funcional, conferência do equipamento, checklist obrigatório, fotos mínimas e assinatura (ou a exceção). Faltando
algo, fica "Documentação pendente": o técnico vê o que falta e recebe a cobrança; passadas 24 horas, a gestão também.
Quando o que falta chega, a O.S. fecha sozinha.

Calibração e qualificação: emita o documento no módulo (certificado, relatório de qualificação). O documento do mesmo
equipamento emitido depois da chegada é ligado sozinho à O.S. ao encerrar; também dá para ligar pela ficha da O.S.

## Relatório da O.S.

Relatório de atendimento técnico em A4: identificação, chamado, atendimento (com a hora do aparelho quando difere da
hora do servidor), serviço, checklist, peças, fotos, assinaturas e linha do tempo. Antes do encerramento sai como
rascunho e fica numa pasta privada. Encerrada, a versão é salva na pasta "4. Ordens de Serviço" do equipamento (a
mesma do QR), registrada no Arquivo de documentos (também quando o encerramento vem pela rotina, sem sessão) e aparece
na ficha do equipamento e no portal do cliente. Nenhuma versão é sobrescrita.

O PDF é gerado **uma vez só**, no encerramento. "Abrir o PDF" numa O.S. encerrada reabre o mesmo documento; nenhuma
versão nova nasce sem motivo. Correção depois do encerramento é da gestão: na ficha da O.S., bloco "Documento e envio",
"Abrir para corrigir" (textos do relato e o motivo, com pelo menos 10 letras). Sai a revisão seguinte do mesmo número
(Rev. 01, 02...), a anterior fica arquivada como substituída, o histórico de revisões entra no documento (registro
comum de revisões do SGO+) e a revisão precisa ser enviada ao cliente de novo.

## Documento e envio ao cliente

O envio do PDF ao cliente é sempre ato de uma pessoa: o técnico, no aplicativo, ao concluir (O.S. encerrada > "Enviar ao
cliente por e-mail", com os contatos do cadastro e o e-mail conferível), ou a gestão, na ficha da O.S. (Assistência
técnica > Ordens de serviço > O.S. > bloco "Documento e envio" > "Enviar ao cliente", que abre o Enviar documento). O
e-mail vai com o PDF anexado, o chamado no assunto e texto profissional assinado pela Metrolabs.

A ficha da O.S. mostra a situação: "PDF gerado, ainda não enviado", ou "Enviado ao cliente em dd/mm/aaaa hh:mm por
(quem) (e-mail) para (endereço)". O envio fica gravado na O.S. e no histórico do chamado. Sem envio em 1 dia útil, a
pendência "relatório não enviado" entra na Caixa de decisões da gestão (antes disso cobra só o técnico, no Início).

WhatsApp ao cliente continua fora: na janela "Enviar documento" o WhatsApp só aparece quando houver canal ativo de
verdade; com o piloto do WhatsApp oficial ligado a opção vem desligada, com o porquê e o caminho (envie por e-mail).

O cliente, em "Meus chamados", vê e baixa o PDF da O.S. encerrada.

## Orçamento do chamado

1. A triagem escolhe "Precisa de orçamento"; o Comercial recebe a atividade.
2. Em Chamados > chamado > Orçamento: "Preencher valores" (peças e serviços) e "Emitir o A4".
3. "Enviar com link de aceite": escolha os contatos do cliente (ou digite outro e-mail), confira o texto e toque em
   "Enviar". O e-mail leva o PDF em anexo e o link "Ver e responder o orçamento". O link vale 30 dias (Regras da
   assistência > "Link de aceite do orçamento vale (dias)", de 1 a 90) e é um por envio: enviar de novo cria outro e o
   anterior deixa de funcionar. O sistema guarda só o resumo do link; nem a gestão consegue ver o link de novo.
4. O cliente abre o link no celular ou no computador, sem login, e vê o orçamento (itens, valores, total, validade,
   condições e o PDF para baixar). Ele escolhe:
   - Aprovar: nome completo, cargo, CPF (opcional), e-mail, "Li e concordo" e a assinatura no quadro, com o dedo ou o
     mouse.
   - Pedir ajuste: nome, e-mail e o que precisa mudar.
   - Recusar: nome, e-mail e o motivo (obrigatório).
   A resposta é única: depois dela, o link mostra "Respondido em ... por ..." e não aceita outra. Orçamento vencido
   mostra o aviso e não aprova (o cliente ainda pode pedir ajuste). Link vencido, invalidado ou trocado mostra "Link
   indisponível" e o contato da Metrolabs.
5. O que acontece com a resposta (o mesmo caminho do registro manual):
   - Aprovado: o orçamento fica "Aprovado pelo cliente" e o chamado vai a "Planejado" (falta agendar) ou, com peça, a
     "Aguardando peça", com um pedido em Compras por peça, em nome de quem enviou o orçamento. Gera o "Comprovante de
     aprovação" (A4 em HTML e PDF, na pasta do cliente em "Assistência técnica - Orçamentos"), ligado ao orçamento como
     o aceite. O cliente recebe a confirmação por e-mail com o comprovante.
   - Recusado: o orçamento fica "Recusado pelo cliente" com o motivo; o chamado continua aguardando orçamento e entra
     na Caixa de decisões como "orçamento recusado pelo cliente para decidir": negociar (Nova revisão), cobrar a visita
     ou encerrar o chamado.
   - Ajuste pedido: o orçamento fica "Cliente pediu ajuste"; a Caixa de decisões mostra "pedido de ajuste no orçamento
     para revisar". Faça a Nova revisão, emita e envie de novo (o link da revisão anterior deixa de funcionar).
   A gestão da área Técnica, o gestor comercial e o técnico do chamado são avisados (AT16 aprovado, AT17 recusa ou
   ajuste). Ao cliente vai só e-mail; nada de WhatsApp.
6. Bloco "Aceite do cliente" na ficha do orçamento (quem vê valores): situação do link (enviado em, para quem, válido
   até, visto em e quantas vezes, respondido em), a resposta registrada (quem, cargo, e-mail, CPF mascarado, data e
   hora do servidor, meio, IP, assinatura, protocolo, "registro íntegro" e "conteúdo igual ao aceito") e o comprovante.
   Botões: "Gerar e copiar link" (cria outro link para mandar por outro meio; o anterior deixa de funcionar),
   "Invalidar link" (com o motivo; por exemplo, enviado ao contato errado) e, se o comprovante não saiu na hora,
   "Gerar o comprovante".
7. Registro manual: quem responde por telefone, e-mail ou documento assinado continua em "Registrar a resposta do
   cliente", com o aceite anexado.
8. O cliente com acesso ao portal também responde em "Meus chamados" > Orçamentos, sem o link: os mesmos campos, a
   mesma assinatura e o mesmo registro (meio "Portal do cliente").

Prova do aceite: cada resposta fica numa trilha só de inclusão, com data e hora do servidor, endereço de rede (IP),
navegador, nome, cargo, CPF, e-mail, a assinatura (imagem guardada na pasta privada), o resumo SHA-256 do conteúdo do
orçamento mostrado ao cliente (itens, valores, condições e validade), o resumo do PDF e o resumo do próprio registro,
encadeado ao anterior. Se o orçamento mudasse depois do envio do link, a resposta seria recusada e nada seria
registrado.

O técnico não vê valores.

## Reclamações

Reclamação do cliente ou problema que se repete vira um caso (RC-2026-0001) com dono (gestor da área Técnica) e
prazo. Registre a causa, a ação e a resposta ao cliente e marque "Resolvido". Caso com prazo vencido vai à Caixa de
decisões.

## Indicadores e relatório mensal

Atendimentos no prazo, tempo médio de atendimento em horas úteis, reincidência por equipamento (dois ou mais chamados
em 90 dias), O.S. por técnico (encerradas, documentação pendente, tempo médio no local, sem assinatura, série
divergente), prazos estourados e reclamações. O relatório mensal A4 é gerado no primeiro dia útil e vai no e-mail
mensal da Diretoria, junto com os relatórios do Comercial e de Compras.

## Avisos

Pela matriz de avisos (eventos AT01 a AT19; AT18 = chamado pendente de triagem, à gestão, só no sistema; AT19 = chamado
sem triagem liberado na fila livre, aos técnicos disponíveis, a quem faz a triagem e à gestão, só no sistema; AT13 = cadastro criado em campo, no resumo do dia; AT14 = peça disponível
em Compras, chamado devolvido, ao técnico e à gestão no resumo do dia; AT15 = peça recebida e retorno agendado, ao
cliente por e-mail; AT16 = orçamento aprovado pelo cliente pelo link ou pelo portal e AT17 = recusa ou pedido de
ajuste, à gestão da área Técnica, ao gestor comercial e ao técnico do chamado, por e-mail na hora): tudo no sistema na hora; e-mail na hora no que tem prazo curto (chamado para a triagem, chamado
crítico, reagendamento, cancelamento, pedido do cliente) e no resumo do dia no resto. WhatsApp só na exceção do chamado
P1 ao gestor da área Técnica (expediente, CLT, uma vez por dia) e na contagem do resumo do dia. O cliente recebe só
e-mail (chamado recebido, visita agendada ou reagendada, atendimento concluído, peça recebida, retorno agendado)
enquanto durar o piloto do WhatsApp; o PDF da O.S. vai pelo Enviar documento, por uma pessoa.

Interruptor "Assistência do SGO+ ligada": desligado, vale também nas telas internas. Consultar continua; abrir chamado,
triagem, agenda, registro de campo e orçamento ficam travados, com a mensagem explicando o porquê e o caminho para
religar (Regras da assistência > Ligar). Nada é apagado.

## Regras da assistência

Triagem e fila livre (quem faz a triagem, fila livre ligada e o tempo em minutos úteis, padrão 30). Prazos por prioridade, contratos com prazo próprio, assinatura obrigatória, distância para o aviso de localização,
tamanho máximo da foto, peça em falta abrindo pedido em Compras, avisos ao cliente, relatório mensal e o interruptor
"Assistência do SGO+ ligada". Tipos de serviço (29, vindos dos 30 tipos do Auvo) e modelos de checklist (editáveis;
"Trazer os questionários do Auvo" cria os modelos a partir dos 13 questionários copiados no acervo). Quando a lista de questionários do acervo veio vazia, "Montar os checklists a partir das tarefas do Auvo" (e a rotina, de hora em hora) lê as tarefas copiadas em lotes e monta um modelo por questionário, com as perguntas na ordem mais frequente e o tipo de resposta inferido das respostas (foto, assinatura, sim ou não, número, opção, texto). Esses modelos nascem inativos: revise e marque "Ativo" no editor do modelo. Cada mudança
vira uma versão com o motivo; as O.S. já agendadas seguem o checklist que tinham.

## Fonte única de atendimentos e o Auvo

Painel de qualidade, Programa de conduta (sugestões), Frota (deslocamento até o atendimento), ponto (técnico em
atendimento não recebe lembrete), central de pendências, Início, ficha do equipamento e Vínculos leem a mesma lista:
tarefas do Auvo e O.S. do SGO+. A ficha do equipamento mostra também o histórico copiado do Auvo; as fotos do acervo
abrem só para a equipe interna.

## Transição do Auvo

Os seis critérios do projeto, cada um com o que o sistema mediu e a confirmação da gestão:

1. Cópia do acervo do Auvo com zero faltas (ou faltas aceitas pelo dono) e o backup conferido.
2. Quatro semanas seguidas com todos os técnicos só no SGO+, sem atendimento perdido.
3. Painel de qualidade, Conduta e Frota mostrando os dados do módulo novo, conferidos pela gestão.
4. Nenhuma O.S. aberta no Auvo, ou cada uma com destino registrado (fechar no Auvo, recriar como chamado no SGO+ ou
   não houve atendimento).
5. Pelo menos um atendimento feito sem internet e sincronizado sem perda, conferido.
6. Relatório da O.S. aprovado pela Qualidade e já enviado a clientes reais.

Com os seis cumpridos, o Administrador marca "Auvo desligado". É o registro da decisão: nada é desligado sozinho.
Depois, desligue os gatilhos em Integração Auvo, retire a criação de tarefa nos geradores e cancele o contrato.

## Excluir chamado de teste ou simulação (27/10/2026)

Decisão do dono: só Gestor, Diretoria e Administrador; motivo obrigatório; confirmação antes; nada é apagado.

1. Na ficha do chamado, toque em "Excluir (teste ou simulação)". Atendimento real que não vai acontecer se cancela
   (o cliente vê o cancelamento); a exclusão é só para teste ou simulação.
2. A janela lista cada vínculo e o efeito da exclusão nele:
   - O.S.: sai junto (agenda, aplicativo do técnico, Minhas O.S., histórico do equipamento e fonte única de
     atendimentos); a atividade dela em Minhas atividades é cancelada; o relatório já gerado continua no Drive; se o
     relatório já foi enviado ao cliente ou a O.S. está em andamento com o técnico, a janela destaca em vermelho.
   - Orçamento: sai junto; o link de aceite enviado ao cliente deixa de abrir o orçamento.
   - Pedido de compra: não é cancelado sozinho; cancele em Compras se a peça não vai mais ser comprada.
   - Reclamação, pedido do cliente, pedido aprovado do Comercial e tarefa do Auvo: continuam onde estão; nada muda no Auvo.
   - Cliente: os e-mails já enviados não voltam; o chamado some de "Meus chamados".
3. Escreva o motivo (pelo menos 10 letras), marque "Li os vínculos e o efeito" e toque em "Excluir o chamado". Se os
   vínculos mudaram enquanto a janela estava aberta, o sistema pede para abrir de novo.

O chamado (e as O.S. e orçamentos dele) sai de listas, contadores, pendências, indicadores, agenda, aplicativo, portal
do cliente e fonte única de atendimentos. A auditoria (histórico do chamado) guarda quem excluiu, quando e o motivo; os
avisos ainda não lidos sobre ele deixam de cobrar. O número do chamado não é reaproveitado.

Excluídos: aba "Excluídos" em Chamados (Gestor, Diretoria e Administrador), com quem excluiu, quando, o motivo e o que
saiu junto. "Restaurar" pede o motivo e devolve o chamado, a O.S. e o orçamento da mesma exclusão, na situação que
tinham. A atividade cancelada em Minhas atividades não volta sozinha: se o atendimento vale, reagende pela ficha.

## Problemas comuns

- "Reservado para a triagem de ... até ...": o chamado ainda está no tempo de quem faz a triagem. Depois do horário,
  se ninguém assumir, ele vai para a fila livre. Se é urgente, fale com quem faz a triagem ou com a gestão.
- "Já foi assumido por ... em ...": outro colega assumiu antes; atualize a lista.
- Não encontro um chamado: veja se ele foi excluído (aba "Excluídos", só Gestor, Diretoria e Administrador).

- "Esse caminho não é permitido": siga o "Próximo passo" indicado na ficha do chamado.
- O cliente diz que o link do orçamento mostra "Link indisponível": o link venceu, foi invalidado ou um envio mais novo
  o trocou. Envie de novo em Chamados > chamado > Orçamento > "Enviar com link de aceite" (ou "Gerar e copiar link").
  Se o orçamento já venceu, faça a Nova revisão antes.
- O cliente aprovou pelo link mas o comprovante não aparece: toque em "Gerar o comprovante" no bloco "Aceite do
  cliente". A aprovação já vale; só o documento é gerado de novo.
- O cliente respondeu errado pelo link: a resposta é única e não se apaga. Para recusa ou ajuste, faça a Nova revisão
  e envie de novo; para aprovação indevida, registre a conversa no chamado e trate com a gestão.
- O técnico não aparece na lista: ajuste o perfil (Técnico) ou a área (Técnica) em Administração > Usuários.
- "A O.S. é de outro técnico": só o técnico responsável ou a gestão da área Técnica registra.
- A foto não subiu: verifique a conexão e salve de novo; as que já subiram não se repetem.
- Cadastro de cliente com chamado aberto não muda de cliente em Vínculos: encerre ou cancele o chamado primeiro.
- "Relatório ainda não enviado ao cliente" na Caixa de decisões: abra a O.S. em Ordens de serviço, bloco "Documento e
  envio", e toque em "Enviar ao cliente" (ou peça ao técnico para enviar pelo aplicativo).
- O WhatsApp aparece desligado na janela "Enviar documento": o piloto do WhatsApp oficial está ligado e o número
  oficial ainda não envia documentos. Envie por e-mail.
- Preciso corrigir um relatório já emitido: só a gestão, em "Abrir para corrigir", com o motivo; sai a Rev. 01 e ela
  precisa ser enviada de novo ao cliente.

## Agenda única com Atividades da equipe (26/10/2026)

- Toda O.S. agendada cria sozinha a atividade do técnico em Minhas atividades, ligada à O.S. (OS_ID). Quem manda é a O.S.: reagendar, encerrar ou cancelar muda a atividade sozinha; ninguém conclui, edita ou justifica essa atividade à mão.
- A atividade da O.S. não conta atraso em Atividades (nem aviso de atraso, escalonamento por prioridade, central de pendências ou avaliação do gestor): o prazo do cliente é acompanhado aqui, na Assistência.
- Em Atividades da equipe, o Gantt mostra o atendimento em azul no horário da O.S. e os atendimentos do Auvo em cinza (só consulta). No Kanban o cartão da O.S. é só consulta; o detalhe tem "Abrir a O.S.".
- Nova atividade > "É serviço técnico em cliente" (só gestão técnica, Diretoria e Administrador): abre o chamado (canal Interno), faz a triagem como visita planejada e agenda a O.S., conferindo tudo antes (tipo, técnico, horário, duração, preparo e conflito de agenda). Equipamento com chamado aberto: pergunta se é um deles. Chamado vindo do cliente continua pela triagem.
- Aplicativo do técnico: o Meu dia mostra também "Minhas atividades" (tarefas internas: atrasadas, que vencem até amanhã, em andamento e aguardando), com iniciar, aguardando, concluir, justificar atraso e comentar, também sem internet. Se a gestão mudou a atividade antes do envio, vale a mudança dela e o motivo aparece em Envios.

## Chamados de representada (módulo Representação, 29/10/2026)

- A empresa representada (Brasmedical) entra no SGO+ com o perfil "Representada" e usa só o módulo Representação. O pedido dela entra na fila de Solicitações dos clientes com o selo roxo da representada e o prazo de aceite (4 horas úteis no padrão, configurável em Representação > Representadas).
- Na fila: "Aceitar (vira chamado)", "Pedir complemento" (o pedido volta para a representada e o prazo de aceite pausa até a resposta) ou "Recusar com motivo" (a representada vê o motivo). A representada recebe e-mail nas três saídas.
- O chamado aceito leva a representada (REPRESENTADA_ID), o protocolo dela e o enquadramento pretendido, e segue a triagem, a agenda, a O.S. e o relatório de sempre. O canal aparece como "Representação".
- Lista de chamados: filtro "Representação" (só de representadas ou de uma delas) e selo roxo com o nome. Ficha: parte "Representação" com relato completo, contato no local, arquivos e número de mensagens; a conversa fica em Representação > Conversas.
- Linha do tempo com três públicos: interno (sem marca), representada e cliente final. O que a equipe registra com público para o cliente aparece também para a representada; o resto é interno.
- Regras da assistência > Representação: quem responde pela conta da representada (recebe pedidos, alertas e mensagens). Sem ninguém marcado, vale quem faz a triagem.
- Alertas: 75% do prazo de aceite (responsável), prazo vencido (responsável, gestão da área Técnica e Caixa de decisões) e chamado de representada sem registro em 3 dias úteis (responsável e Caixa de decisões).
- Detalhes no Manual do módulo Representação.
