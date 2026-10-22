<!-- Versão em Markdown do documento C:\Users\venda\Documents\METROLABS_ASSISTENCIA_FLUXO_20261022\ESTUDO_FLUXO_ASSISTENCIA_SGO_20261022.html (fonte para impressão; PDF na mesma pasta). -->

METROLABS

# Assistência técnica no SGO+: como vai funcionar de ponta a ponta

Estudo de produto para o dono e plano de construção para a equipe de engenharia. Nenhum código foi alterado.

-   **Número:** EST-20261022-AST
-   **Revisão:** 00
-   **Data:** 22/10/2026
-   **Elaborado por:** Arquitetura de produto (desenho de telas e fluxo) e engenharia de software
-   **Para:** Dono da empresa (entendimento e decisão); equipe de engenharia (execução)
-   **Base:** Código do SGO+ e do servidor em 22/10/2026; desenho original da Assistência no COMMAND; projeto PRJ-20261021-AST; matriz de avisos de 21/10/2026; estado real do servidor (só leitura)
-   **Situação:** Proposta. Aguarda as respostas da seção 7 (há resposta padrão para cada uma).

Documento interno. Não contém dados de clientes. Os números do estado real foram lidos do servidor sem nenhuma gravação.

## Resumo para o dono

O pedido foi entender, de ponta a ponta, como a Assistência técnica vai funcionar no SGO+: o técnico entra, abre a O.S., registra fotos e textos, cadastra ou localiza cliente, unidade e equipamento, colhe a assinatura, gera a O.S. em A4 e PDF, envia ao cliente por e-mail e WhatsApp, o documento fica na pasta do cliente, e o restante segue pelos fluxos do SGO+ (tarefas agendadas, Comercial, Compras). Este estudo responde a isso com o que está no código hoje, não com o que os manuais prometem.

**O que já funciona.** Em 21/10/2026 a Assistência nasceu nativa no SGO+ e está publicada no servidor: chamado com as 15 situações do COMMAND, triagem com quatro saídas, prazo por prioridade, agenda com conflito e reserva de veículo, O.S. com um processador único de eventos, aplicativo do técnico instalável no celular (SGO+ Campo) que funciona sem internet, relatório da O.S. em A4 com fotos e assinatura, orçamento do chamado, pedido de peça em Compras, portal "Meus chamados" para o cliente, fonte única de atendimentos lida pela Qualidade, pelo Conduta e pela Frota, e eventos AT01 a AT12 na matriz de avisos. Nada disso foi usado ainda: em 22/10 o servidor tem um chamado de teste, nenhuma O.S., nenhuma requisição de compra e nenhuma oportunidade comercial.

**O que não existe e muda o uso real.** (1) O técnico não consegue cadastrar nem localizar cliente, unidade ou equipamento pelo aplicativo, nem abrir uma O.S. em campo fora da agenda: o aplicativo só trabalha nas O.S. que a gestão já agendou. (2) O PDF da O.S. não vai ao cliente no encerramento: sai só um e-mail curto de "atendimento concluído"; o documento vai pelo "Enviar documento", feito por uma pessoa, e por WhatsApp não sai de jeito nenhum hoje, porque o envio de documento só existe pela Z-API, que o piloto desligou, e não existe pelo número oficial da Meta; a janela ainda oferece a opção e o envio falha. (3) A mensagem que o cliente manda por WhatsApp chega ao COMMAND, não ao SGO+, e não abre chamado; o pedido pelo QR do equipamento existe só no nome. (4) A aprovação do orçamento pelo cliente é registrada à mão, com o aceite anexado; não há link de aceite (o COMMAND tinha). (5) Quando a peça chega, Compras não avisa a Assistência: o chamado não sabe, a gestão "retoma" e reagenda à mão, e o cliente não é avisado. (6) Não há gancho da Assistência para o Comercial além do orçamento (nada de oportunidade por calibração vencida ou contrato). Há ainda detalhes que enganam a gestão: a ficha da O.S. nunca mostra "enviado ao cliente", o relatório fechado pela rotina não entra no Arquivo de documentos, e o interruptor "Assistência ligada" não bloqueia as telas internas.

**Recomendação.** Construir em sete etapas pequenas, na ordem que destrava o uso real: primeiro o técnico abrir e fechar uma O.S. completa pelo celular, inclusive em cliente novo, e o cliente receber o PDF por e-mail (etapas 1 e 2); depois o retorno automático após a peça e o aceite do orçamento por link (3 e 4); só então o WhatsApp ao cliente, a entrada por WhatsApp e o Comercial (5 a 7). Cada etapa é publicável sozinha e tem teste próprio.

Seis perguntas ao dono mudam a construção (seção 7). Para cada uma há uma resposta padrão, adotada se não houver resposta, de modo que o trabalho não para.

## 1\. De onde partimos

### 1.1 O desenho original no COMMAND

O COMMAND foi desenhado como a central de trabalho da empresa inteira: cada pessoa abre e vê o que tem de fazer, até quando, para quem e como comprova. A Assistência técnica foi um dos módulos construídos nessa lógica (versão 0.5.0, outubro de 2026) e nunca teve uso real. O que ela definiu, e que este estudo reaproveita, é a "comunicação integrada entre os fluxos": um módulo nunca termina em si mesmo; ao mudar de situação, ele cria trabalho em outro módulo por chamada de função, com dono e prazo, e o aviso vai só para quem age.

| Ligação desenhada no COMMAND | Como funciona lá | O que vale trazer |
| --- | --- | --- |
| Chamado → Orçamento → Comercial → cliente | A triagem pede orçamento; o Comercial faz a proposta ligada ao chamado e envia por link; o aceite do cliente no link devolve o chamado a Planejado; a recusa vai para a supervisão decidir. A Assistência vê só o número e a situação, nunca valores. | Tudo, inclusive o aceite por link, que o SGO+ ainda não tem. |
| Chamado → Compras → chamado | "Aguardando peça" cria a requisição com vínculo ao chamado; quando a peça fica disponível no recebimento, Compras chama a Assistência, que avisa o técnico e a triagem e devolve o chamado a Planejado. | A chamada de volta de Compras para a Assistência. |
| Chamado → Agenda → técnico | Só a gestão agenda; exige preparo (ferramentas, instrumentos, acesso, documentação, peças, risco); conflito e deslocamento impossível avisam, não bloqueiam; reagendar exige motivo. | Já trazido ao SGO+. |
| O.S. → documento → envio | Relatório da O.S. em A4, versionado, sai como rascunho até a execução terminar; janela única "Enviar documento" por e-mail e WhatsApp com registro por destinatário e canal. | Já trazido ao SGO+ (o SGO+ é o dono do Enviar documento desde 20/10). |
| Portal do cliente e atendente | Link por cliente; a solicitação entra numa caixa de entrada e alguém converte em chamado; o cliente acompanha em cinco etapas. Atendente com inteligência artificial no WhatsApp abre o chamado sozinho depois do "sim" do cliente. | Portal já trazido. Atendente fica para depois (depende da estratégia de mensagens). |
| Casos | Junta chamado, peça, missão e contrato num problema só, com dono e prazo; inclui reclamação do cliente. | Trazido como "Reclamações" (RC-), simplificado. |
| Avisos | Um notificador central (cmdNotificar\_) com 117 pontos de chamada; sino, espelho no SGO+, fila do WhatsApp. Na matriz de 21/10 todos os avisos da Assistência do COMMAND (C007 a C016, C100, C101, C111) ficaram "só sino até migrar". | Já migrado: a Assistência do SGO+ usa a matriz (AT01 a AT12). |

A "Caixa de decisões", a escada de cobrança (sistema na hora, e-mail de resumo às 8h, WhatsApp de resumo às 9h30 só para quem não abriu o sistema, Diretoria depois de 5 dias úteis parado) e a Central de pendências são do SGO+ desde 20/10 e o COMMAND só as lê pela ponte. Esse é o motor de "comunicação integrada" que a Assistência passa a usar, sem criar fila nova.

### 1.2 O que o SGO+ ganhou em 21 e 22/10

Em um dia a Assistência nativa foi construída e publicada no servidor (grupo "Assistência técnica" no menu, dez telas com ajuda e manual, aplicativo SGO+ Campo em `/campo/`). A seção 3 lista item a item; o resumo é: o caminho de computador está inteiro; o caminho do celular cobre a execução de uma O.S. já agendada; as ligações com Compras e Comercial existem na ida e são frágeis na volta; o envio ao cliente existe por e-mail e está retido por WhatsApp.

### 1.3 Estado real no servidor em 22/10 (só leitura)

| Registro | Linhas | Leitura |
| --- | --- | --- |
| Chamados (ATEC\_CHAMADOS) / O.S. (ATEC\_OS) | 1 / 0 | Um chamado de ensaio; nenhuma O.S. Módulo publicado e sem uso. |
| Tipos de serviço / modelos de lista de verificação | 29 / 20 | Tipos vindos do Auvo; 20 modelos (7 padrão e 13 dos questionários do Auvo), que nascem inativos até a Qualidade revisar. |
| Acervo do Auvo: tarefas / arquivos | 5.490 / 24.880 | A cópia do acervo (etapa 0 do projeto de 21/10) está feita no servidor. As fotos e assinaturas antigas estão guardadas. |
| Tarefas do Auvo (sincronização) | 281 | O Auvo continua ligado e sendo lido. |
| Requisições de compra (CMP\_\*) | 0 | Compras nativo publicado; as tabelas ainda nem foram criadas (nascem no primeiro uso). |
| Oportunidades / propostas do Comercial | 0 / 0 | Comercial nativo publicado e sem uso. |
| Envios de documento (DOC\_ENVIOS) | 1 | Um envio feito. O caminho "Enviar documento" funciona. |
| Lista do piloto do WhatsApp | 0 | Lista vazia: com o piloto ligado, nenhum WhatsApp sai do servidor para ninguém (falha segura). |
| Contatos de clientes (CAD\_CONTATOS) / equipamentos | 496 / 675 | Há contatos para o envio ao cliente e equipamentos para o técnico localizar. |
| Decisões na Caixa / avisos enviados pela matriz | 748 / 125 | A escada de cobrança e a matriz estão em uso real pela gestão. |

Leitura feita por consulta direta ao banco, sem gravação. Nenhum dado de cliente foi copiado para este documento.

## 2\. O fluxo ponta a ponta em seis jornadas

Cada jornada é descrita como o usuário a vê. Para cada passo: quem faz, em que tela (caminho no menu), o que o sistema faz sozinho, qual aviso sai e para quem, e a situação do chamado ou da O.S. antes e depois. Onde o passo ainda não existe no código, a linha traz a marca **FALTA**; onde existe mas depende de algo (chave, lista do piloto, decisão), a marca **DEPENDE**. Sem marca, existe e funciona.

### 2.1 Jornada 1: entrada do chamado

| # | Quem | Onde | O que a pessoa faz | O que o sistema faz sozinho | Aviso | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 1a | Equipe interna (atendimento, gestão) | Assistência técnica › Abrir chamado | Busca o cliente por nome ou CNPJ, escolhe unidade e equipamento (ou marca "não identificado" e descreve), relata o problema, quem pediu, contato, prioridade e se o equipamento está parado. | Confere chamado aberto no mesmo equipamento (avisa; "Abrir mesmo assim"). Numera CH-AAAA-NNNN. Marca reincidência (mesmo equipamento em 30 dias). Calcula o prazo de triagem e de atendimento pela prioridade (contrato prevalece). Grava o evento. | AT01 "chamado novo para a triagem" ao gestor da área Técnica (sistema; e-mail na hora). P1: AT02, também por WhatsApp ao gestor, uma vez por dia, no expediente, só CLT. Ao cliente (canais portal, e-mail e telefone): AT08 "chamado recebido" por e-mail. | — → ABERTO |
| 1b | Equipe interna | Principal › E-mail › mensagem do cliente › "Abrir chamado" | Confere o texto que veio preenchido (remetente, cliente reconhecido pelo domínio, assunto). | Reconhece o cliente pelo e-mail ou domínio e só preenche o formulário de abertura (canal E-MAIL); a pessoa confere e envia, e o restante é igual a 1a. | Igual a 1a. | — → ABERTO |
| 1c | Cliente | Portal: Meus chamados › "Pedir atendimento técnico" | Escolhe o equipamento, descreve o problema e deixa contato. | Grava em "Solicitações dos clientes" (SOL-AAAA-NNNN). Não abre chamado sozinho (evita chamado duplicado ou errado). **FALTA**: o pedido pelo QR do equipamento: o canal "QR" existe só no nome; a página do QR e o prontuário não têm o botão "Solicitar atendimento". | AT09 "pedido do cliente na fila" ao gestor da área Técnica (sistema; e-mail na hora). | Solicitação PENDENTE |
| 1d | Equipe interna | Assistência técnica › Solicitações dos clientes | Confere, abre o chamado a partir da solicitação ou descarta com motivo. | Copia cliente, equipamento e texto para o chamado; liga a solicitação ao chamado. | Ao cliente: AT08 "chamado recebido" por e-mail (WhatsApp ao cliente desligado por regra e retido pelo piloto). | Solicitação → CONVERTIDA; chamado ABERTO |
| 1e | Cliente | WhatsApp da empresa | Escreve a mensagem. | **FALTA** no SGO+: a mensagem chega ao COMMAND (Caixa de Entrada e atendente), não ao SGO+, e não vira solicitação. Hoje alguém precisa ler lá e abrir o chamado à mão em 1a. | Nenhum no SGO+. | — |
| 1f | Vendedor | Comercial › proposta aprovada › passar ao setor Técnica | Marca a Técnica como setor executor. | Cria a atividade do setor em Minhas atividades e abre sozinho o chamado com canal COMERCIAL, prioridade P3, ligado à proposta e sem valores (só se a Assistência estiver ligada). | Atividade para o gestor da área Técnica (sistema; e-mail no resumo) e AT01 pelo chamado novo. | — → ABERTO (com PROPOSTA\_ID) |
| 1g | Técnico em campo | SGO+ Campo | Está no cliente e surge um atendimento não agendado (equipamento ao lado, pedido do responsável). | **FALTA**: o aplicativo não abre chamado nem O.S.; só trabalha nas O.S. do "Meu dia". O técnico liga para a gestão, que faz 1a e agenda. | — | — |

### 2.2 Jornada 2: triagem, prazo (SLA), agenda e reserva de veículo

| # | Quem | Onde | O que a pessoa faz | O que o sistema faz sozinho | Aviso | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 2a | Gestor da área Técnica (sem gestor: Diretoria) | Assistência técnica › Chamados › chamado › Triagem | Confirma sintomas, risco de continuar usando e diagnóstico preliminar; ajusta a prioridade com motivo; escolhe o tipo de serviço. | Recalcula o prazo se a prioridade mudou. Mostra o selo do prazo de triagem (em dia, em risco, estourado). A lista de verificação da triagem tem 6 itens (o COMMAND tinha 9). | Triagem pendente: pendência "ast\_triagem" na Central e na Caixa de decisões do gestor da área Técnica (escada de cobrança). | ABERTO → EM\_TRIAGEM |
| 2b | Gestor | Mesma tela › decisão da triagem | Escolhe um dos quatro caminhos: resolvido remotamente; precisa de orçamento; precisa de peça; planejar visita. | Remoto: pede quem confirmou e o teste e encerra. Orçamento: cria a atividade do Comercial. Peça: abre a requisição em Compras ligada ao cliente e ao chamado. Visita: fica à espera de agenda. | Orçamento: AT12 ao gestor comercial e ao gestor da área Técnica, mais a atividade do Comercial. Peça: AT11 ao gestor da área Técnica e o aviso de Compras ao comprador. | EM\_TRIAGEM → RESOLVIDO\_REMOTO / AGUARDANDO\_ORCAMENTO / AGUARDANDO\_PECA / PLANEJADO |
| 2c | Sistema | Relógio do prazo | — | Conta horas úteis (08h00 às 17h30, dias úteis, feriados): P1 4 h, P2 1 dia útil, P3 3 dias úteis, P4 7 dias úteis; triagem em 30 min, 2 h, 4 h e 1 dia útil. Pausa ao aguardar cliente ou peça só se o contrato permitir. "Em risco" quando resta um quarto. Nada é gravado: o selo é calculado a cada leitura. | Em risco ou estourado: pendência "ast\_sla" na Central e na Caixa de decisões do gestor da área Técnica (escada: sistema, e-mail de resumo, WhatsApp de resumo, Diretoria). | Selo muda; situação não |
| 2d | Gestor | Chamados › chamado PLANEJADO › Agendar | Escolhe técnico (perfil Técnico ou área Técnica), data, hora, duração, tipo de serviço; confirma o preparo (ferramentas, instrumentos calibrados, acesso, documentação, peças ou motivo de não precisar, risco). | Confere conflito: O.S. do SGO+ no horário, tarefa aberta no Auvo, ausência (férias, afastamento, dispensa). Mostra o conflito; a gestão confirma com motivo. Cria a O.S. OS-AAAA-NNNN. Cria a atividade "Atender OS-..." para o técnico em Minhas atividades, com prazo no fim do atendimento. | AT03 "atendimento agendado" ao técnico (sistema; e-mail no resumo; WhatsApp só na contagem do dia). Conflito confirmado: aviso só na tela da gestão. | PLANEJADO → AGENDADO; O.S. AGENDADA |
| 2e | Gestor | Mesma tela › "Reservar veículo" | Aceita o veículo livre sugerido pela Frota ou escolhe outro. | Cria a reserva na Frota no nome do técnico, ligada ao cliente e à O.S., com as regras da Frota (sem sobreposição, CNH válida, uma pessoa não segura dois veículos). | Avisos da Frota ao técnico (reserva de hoje; lembrete). | Reserva ATIVA |
| 2f | Gestor | Assistência técnica › Agenda dos técnicos | Vê o dia ou a semana por técnico (O.S. do SGO+ e do Auvo, reservas, ausências). Em "Rota do dia" ordena as paradas; vê o caminho no mapa. | Guarda a ordem; o técnico vê a mesma ordem no "Meu dia". | — | — |
| 2g | Gestor | Chamados › chamado › Reagendar | Nova data, técnico (se mudar) e motivo obrigatório. | Move a O.S. e a atividade; refaz a conferência de conflito. | AT04 "reagendado ou passado a outro técnico" ao técnico (e ao anterior, se trocou), e-mail na hora; ao cliente, AT08 "visita reagendada" por e-mail. | AGENDADO → AGENDADO (nova data) |
| 2h | Gestor | Chamados › chamado › Cancelar | Motivo obrigatório. | Cancela a O.S. e muda a atividade. **DEPENDE**: a reserva de veículo ligada à O.S. não é liberada sozinha (a reserva é da Frota; cancelar lá). | AT05 "O.S. cancelada" ao técnico (e-mail na hora). | qualquer → CANCELADO |

### 2.3 Jornada 3: o técnico no campo com o aplicativo

O aplicativo SGO+ Campo é instalado pelo navegador do celular, usa o mesmo usuário do SGO+ e guarda tudo no aparelho até o servidor confirmar. Localização só nos toques Cheguei e Concluí.

| # | Quem | Onde | O que a pessoa faz | O que o sistema faz sozinho | Aviso | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 3a | Técnico | SGO+ Campo › Meu dia (abas Hoje e Amanhã) | Abre o aplicativo com internet ao menos uma vez no dia; vê as O.S. na ordem da gestão, com cliente, horário, tipo, prioridade, endereço, equipamento e situação. | Baixa a agenda (Ast\_appMeuDia), as regras e a lista de verificação de cada O.S.; guarda no aparelho. O.S. abertas de dias anteriores aparecem em vermelho. | — | O.S. AGENDADA |
| 3b | Técnico | Cartão da O.S. | Vê cliente, unidade, endereço (Abrir no mapa), responsável (Ligar), problema, orientação, equipamento (TAG, série, setor) e os últimos atendimentos do equipamento, inclusive os do Auvo. | Mostra o histórico do equipamento vindo da fonte única e do acervo. | — | — |
| 3c | Técnico | Cartão da O.S. › Localizar ou cadastrar cliente, unidade e equipamento | Cliente novo, unidade nova ou equipamento sem cadastro no local. | **FALTA**: o aplicativo não tem busca nem cadastro de cliente, unidade ou equipamento. No computador, Técnico e Comercial já podem cadastrar (Cadastros › Clientes; decisão de 17/10); no celular, não. O técnico hoje liga para a gestão. | — | — |
| 3d | Técnico | Passo "Saí para o atendimento" (opcional) | Toca ao sair. | Evento SAIU com a hora do aparelho; sem localização. | — | AGENDADA → EM\_DESLOCAMENTO |
| 3e | Técnico | Passo "Cheguei" | Toca ao chegar; aceita ou recusa a localização. | Evento CHEGUEI com hora do aparelho e do recebimento; calcula a distância até a unidade quando ela tem coordenadas; longe vira observação para a gestão, não bloqueio. A fonte única passa a mostrar o técnico "em atendimento" (ponto e Frota). | — | → NO\_LOCAL |
| 3f | Técnico | Passo "Confirmar equipamento" | Lê o QR da etiqueta do SGO+ (só Android, pela foto) ou confirma pela série ou pela TAG; se a série for outra, digita. | Compara com o cadastro. Série divergente é aceita, marcada e avisada; o cadastro não muda sozinho. | Série divergente: AT10 ao gestor da área Técnica (e-mail no resumo) e pendência "ast\_serie" até alguém marcar "Série conferida". | → EM\_EXECUCAO (na primeira resposta) |
| 3g | Técnico | Passo "Checklist" | Responde cada pergunta (sim/não/não se aplica, opção, número, data, texto, foto); as obrigatórias estão marcadas. | Cada resposta vira um evento RESPOSTA guardado na hora; a última vale e a anterior fica no histórico. | — | EM\_EXECUCAO |
| 3h | Técnico | Passo "Fotos" | Tira a foto ou escolhe da galeria; escreve legenda curta. | Reduz no aparelho (lado maior 1600 px, cerca de 300 KB), carimba número da O.S., data e hora; sobe uma por vez (Ast\_appEnviarFoto) para a pasta do equipamento, privada. | — | — |
| 3i | Técnico | Passo "Peças" | "Aplicada" para a peça usada; "Falta (pedir)" com urgência para a que precisa ser comprada; "Desfazer" se lançou errado. | PECA FALTA abre a requisição em Compras (CmpR\_salvar\_) ligada ao cliente e ao chamado e põe o chamado em aguardando peça (ver 2.5). A regra "peça em falta abre pedido em Compras" controla isso. | AT11 "falta de peça" ao gestor da área Técnica; aviso de Compras ao comprador. | Chamado → AGUARDANDO\_PECA |
| 3j | Técnico | Passo "Relato" | Condição encontrada, causa, serviço realizado, teste funcional, recomendações, observações; pode ditar. | Evento RELATO; campos ausentes não mudam os já gravados. | — | — |
| 3k | Técnico e responsável do cliente | Passo "Assinatura do cliente" | O responsável assina com o dedo e informa nome e documento. Sem quem assine: "Registrar sem assinatura" com motivo, quem recebeu e justificativa. | Evento ASSINATURA com a imagem; a imagem entra no relatório A4. | — | — |
| 3l | Técnico | Passo "Concluí" | Só libera quando não falta nada; a tela diz em palavras o que falta. Aceita ou recusa a localização. | Evento CONCLUI. Com a documentação completa: encerra a O.S., gera o relatório A4 (PDF e HTML), salva na pasta do equipamento e no Arquivo de documentos, conclui a atividade "Atender OS-...". Com falta: DOC\_PENDENTE e a resposta diz o que falta; o envio que completar encerra sozinho. | Ao cliente: AT08 "atendimento concluído" por e-mail, sem o PDF (o documento vai pelo Enviar documento, jornada 4). Ao vendedor, quando o chamado veio de proposta: AT07. Documentação pendente: pendência "ast\_doc\_pendente" cobra o técnico; depois de 24 h, "ast\_doc\_pendente\_gestao" entra na Caixa do gestor. | EM\_EXECUCAO → ENCERRADA ou DOC\_PENDENTE; chamado → ENCERRADO ou DOC\_PENDENTE |
| 3m | Técnico | Barra "Pendente de envio (N)" › Envios | Vê o que espera envio, o que foi recusado (com motivo e "Tentar de novo") e o que subiu. | Envia sozinho a cada 30 s quando há sinal, na ordem, uma foto por vez; o servidor reconhece repetição (idLocal e número do pedido) e nada é gravado duas vezes. Sessão vencida: pede login sem apagar a fila. | Itens guardados há mais de 12 h: aviso vermelho no aparelho. O.S. em campo há 4 h sem notícia do aparelho: pendência "ast\_sem\_sinc" para a gestão. | — |
| 3n | Gestão | Assistência técnica › Ordens de serviço › O.S. | Corrige depois do encerramento, confere série divergente, liga documento técnico (certificado, laudo) emitido no mesmo equipamento depois da chegada. | O documento do mesmo equipamento emitido depois da chegada é ligado sozinho à O.S. ao encerrar. | — | — |

### 2.4 Jornada 4: a O.S. como documento

| # | Quem | Onde | O que a pessoa faz | O que o sistema faz sozinho | Aviso | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 4a | Sistema | Encerramento da O.S. (3l) ou botão "Relatório A4" na ficha da O.S. | — | Monta o "Relatório de atendimento técnico" em A4 (AstR\_htmlOS\_): identificação, chamado, atendimento (hora do aparelho e do recebimento quando diferem mais de 5 min), serviço, lista de verificação, peças, até 12 fotos, a imagem da assinatura e a linha do tempo. Antes do encerramento sai como rascunho, numa pasta privada. Encerrada: PDF e HTML na pasta "4. Ordens de Serviço" do equipamento (dentro da pasta da unidade, dentro da pasta do cliente), registro no Arquivo de documentos (tipo "ORDEM DE SERVIÇO"), ficha do equipamento e portal do cliente. Nenhuma versão é sobrescrita. **DEPENDE**: quando o encerramento acontece pela rotina (sem sessão de usuário), o relatório não entra no Arquivo de documentos. | — | Documento EMITIDO |
| 4b | Sistema | Numeração e revisão | — | O número é o da O.S. (OS-AAAA-NNNN). O relatório tem versões v1, v2... que nunca se sobrescrevem; o cabeçalho mostra "Revisão" = versão menos 1. **DEPENDE**: cada toque em "Relatório A4" numa O.S. encerrada gera uma versão nova, sem motivo e sem mudança de conteúdo; a O.S. encerrada não aceita correção (os eventos são recusados), só "Série conferida" e "Ligar documento". O controle de revisão com motivo "Abrir para corrigir" (SGO\_DocRevisao, 22/10) não foi ligado à O.S. | — | — |
| 4c | Técnico (no computador), gestão, atendimento | Ficha da O.S. › "Enviar ao cliente"; ou Arquivo de documentos; ou Cadastros › Cliente › Documentos gerados e envios; ou pasta do cliente › "enviar por e-mail ou WhatsApp" | Confere o PDF, marca E-mail e/ou WhatsApp, confirma os contatos sugeridos (cadastro do cliente, responsável da unidade, acessos do portal, quem já recebeu), revisa assunto e texto, confirma. | Descobre o cliente pelo próprio arquivo (a tela não troca). E-mail sai pela caixa do usuário (e-mail integrado) ou pela caixa do sistema com "responder para" o usuário. WhatsApp: só pela Z-API, com o PDF na mensagem; **FALTA** pelo número oficial da Meta: o Enviar documento não envia documento pela Meta, e com o piloto ligado (ou o provedor Meta escolhido) a Z-API fica fora, então o documento só sai por e-mail. A janela ainda mostra o WhatsApp como disponível e o envio falha. Registra cada destinatário e canal em DOC\_ENVIOS; "Tentar de novo" cria envio ligado ao que falhou. A coluna "enviado ao cliente em" da O.S. nunca é gravada: a ficha da O.S. não mostra que o relatório foi enviado. | Ao cliente: o e-mail com o PDF. Falha: na própria janela e no histórico. | Envio ENVIADO / FALHOU / RETIDO |
| 4d | Sistema | Encerramento | — | **FALTA**: o envio do PDF ao cliente no encerramento. Hoje sai só o e-mail curto "atendimento concluído" (AT08), sem o documento. Por regra do SGO+ (20/10) o sistema nunca envia documento ao cliente sozinho; o estudo propõe o meio-termo da etapa 2 (a barra "Documento salvo: Enviar ao cliente" na hora e a pendência "O.S. encerrada sem envio ao cliente" na Central até alguém enviar). | — | — |
| 4e | Técnico no celular | SGO+ Campo | Quer mostrar ou mandar o PDF ao cliente ali mesmo. | **FALTA**: o aplicativo não mostra o relatório gerado nem tem "Enviar ao cliente"; o contrato da API devolve o endereço do relatório (relatorioUrl), mas a tela não o usa. | — | — |
| 4f | Cliente | Portal › Meus chamados › chamado › relatórios | Baixa o PDF. | Mostra só documentos liberados ao cliente, sem valores internos. | — | — |

### 2.5 Jornada 5: desdobramentos (orçamento, compra, retorno, Comercial)

| # | Quem | Onde | O que a pessoa faz | O que o sistema faz sozinho | Aviso | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 5a | Gestor (triagem) ou técnico (campo) | Triagem "Precisa de orçamento"; ou relato do técnico com recomendação | Descreve o que orçar (peças, serviço). | Cria o rascunho do orçamento (OA-AAAA-NNNN) e a atividade "Orçamento do chamado CH-..." para o Comercial, com prazo (AstR\_pedirOrcamento\_). **DEPENDE**: quando a necessidade nasce do técnico em campo (recomendação no relato), ninguém converte em pedido de orçamento sozinho; a gestão precisa voltar o chamado à triagem (a transição AGUARDANDO\_PECA → EM\_TRIAGEM existe; de DOC\_PENDENTE, não). | AT12 "orçamento pedido" ao gestor comercial e ao gestor da área Técnica (e-mail no resumo). | Chamado → AGUARDANDO\_ORCAMENTO |
| 5b | Comercial, Financeiro, gestão | Assistência técnica › Chamados › chamado › Orçamento | "Preencher valores" (peças e serviços), "Emitir o A4", "Enviar ao cliente" (Enviar documento), "Nova revisão" se precisar. | Gera o orçamento em A4, salvo na pasta "Assistência técnica - Orçamentos" do cliente. O técnico e a Técnica não veem valores (nível VALORES: gestão, Comercial, Financeiro, Gestor, Diretoria). **DEPENDE**: a coluna "enviado em" do orçamento nunca é gravada; o envio fica só em DOC\_ENVIOS. | Ao cliente: e-mail com o PDF (pelo Enviar documento). | Orçamento RASCUNHO → EMITIDO → (enviado) |
| 5c | Cliente | E-mail recebido | Responde "aprovado" por e-mail, manda foto do orçamento assinado ou liga. | **FALTA**: não há link de aceite nem ação no portal "Meus chamados". O COMMAND tinha a página pública do orçamento com aceite registrado (nome, documento, cargo, assinatura, hash de integridade, resposta única). O cliente responde fora do sistema. | — | — |
| 5d | Comercial, Financeiro, gestão | Chamado › Orçamento › "Registrar resposta" | "Aprovado" com o aceite anexado obrigatório (PDF, imagem ou e-mail .eml) ou "Recusado" com motivo. | Aprovado e chamado em AGUARDANDO\_ORCAMENTO: volta a PLANEJADO; se o orçamento tem peças, vai a AGUARDANDO\_PECA e abre um pedido em Compras por peça (AstR\_decidirOrcamento\_). Recusado: a gestão decide entre nova revisão e cancelar. | AT12 "orçamento respondido" ao gestor comercial e ao gestor da área Técnica (e-mail no resumo). | AGUARDANDO\_ORCAMENTO → PLANEJADO / AGUARDANDO\_PECA / (decisão) |
| 5e | Comprador (área Logística) | Compras e peças › Fila do comprador › requisição REQ-... | Confere a especificação (devolve a quem pediu se incompleta), cota, leva à aprovação por valor (Caixa de decisões), faz o pedido de compra em A4 ao fornecedor, registra a previsão de entrega. | A requisição nasce ligada ao cliente, ao chamado e à O.S.; o pedido de compra leva o equipamento do cadastro. Aprovação por faixa de valor pela Caixa de decisões. | Avisos de Compras (especificação incompleta a quem pediu; compra para aprovar ao gestor da alçada; pedido atrasado ao comprador). | REQ: ABERTA → COTADA → APROVADA → PEDIDA |
| 5f | Comprador ou quem recebe | Compras e peças › Pedidos e recebimento › "Receber" | Confere quantidade, especificação, dano, nota fiscal e foto; divergência segura a peça. | Peça DISPONÍVEL (CmpP\_disponivel\_). **FALTA**: Compras avisa quem pediu e o vendedor, mas não chama a Assistência: o chamado não fica sabendo que a peça chegou. No COMMAND essa volta existia (Compras chamava a Assistência, que devolvia o chamado a Planejado e avisava técnico e triagem). No SGO+ a gestão descobre pelo aviso de Compras ou pela pendência de prazo. | Peça disponível a quem pediu (sistema; e-mail no resumo). | REQ → RECEBIDA → DISPONÍVEL; chamado continua AGUARDANDO\_PECA |
| 5g | Gestor | Chamados › chamado AGUARDANDO\_PECA › "Retomar" (texto obrigatório) e depois "Agendar" | Escreve o que aconteceu (peça chegou) e reagenda. | Chamado volta a PLANEJADO (AstC\_retomar\_); "Agendar" reaproveita a mesma O.S., que sai de PAUSADA e volta a AGENDADA com a nova data, e a atividade do técnico é editada. **DEPENDE**: nesse caminho o cliente não recebe o e-mail de reagendamento, porque o chamado estava em PLANEJADO e não conta como reagendamento. | AT03 ao técnico. Ao cliente: nada. | AGUARDANDO\_PECA → PLANEJADO → AGENDADO; O.S. PAUSADA → AGENDADA |
| 5h | Técnico | SGO+ Campo | Faz o retorno como qualquer O.S. (jornada 3); aplica a peça ("Aplicada"). | A O.S. é a mesma: o relatório final traz as duas visitas na linha do tempo. | Iguais à jornada 3. | → ENCERRADO |
| 5i | Sistema | Encerramento do chamado | — | **FALTA**: aviso ao Comercial quando o atendimento vira oportunidade: recomendação de troca, contrato de manutenção, calibração ou qualificação vencida do equipamento atendido. Hoje o único gancho é o orçamento do chamado. Proposta na etapa 7. | — | — |
| 5j | Vendedor | Comercial › Oportunidades | Quando o chamado nasceu de uma proposta aprovada (1f), vê a conclusão. | Ao encerrar o chamado com PROPOSTA\_ID, avisa o vendedor (AstC\_aoEncerrar\_). A conferir na etapa 7: se a atividade do setor Técnica em Minhas atividades é concluída junto. | AT07 "pedido do Comercial concluído" ao vendedor (e-mail no resumo). | — |

### 2.6 Jornada 6: gestão

| # | Quem | Onde | O que a pessoa faz | O que o sistema faz sozinho | Aviso | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 6a | Gestor da área Técnica, Diretoria | Assistência técnica › Chamados (lista) | Filtra por situação, técnico, prazo (em dia, em risco, estourado), cliente. | Calcula os selos de prazo na hora. | — | — |
| 6b | Gestor | Gestão › Caixa de decisões › aba "Para mim" | Vê o que depende dele: triagem pendente, chamado planejado sem agenda, prazo em risco ou estourado, orçamento parado há 2 dias úteis, documentação pendente há mais de 24 h, O.S. sem notícia do aparelho há 4 h, série divergente, solicitação de cliente na fila, caso vencido, O.S. de hoje. Registra providência ou abre a tela que resolve. | Escada: sistema na hora; e-mail de resumo às 8h; WhatsApp de resumo às 9h30 (só CLT, só se não abriu o sistema); 5 dias úteis parado sobe à Diretoria; conta na avaliação do gestor. | Os da escada. | — |
| 6c | Técnico | Principal › Minhas atividades | Vê "Atender OS-..." com prazo; atraso bloqueia até justificar. | A atividade é concluída sozinha quando a O.S. encerra. | Atividade atrasada: cobrança no sistema; e-mail; contagem no WhatsApp do dia. | — |
| 6d | Qualidade, gestão | Qualidade › Painel de qualidade; Programa de conduta › sugestões | Vê O.S. com registro incompleto (sem foto, sem relato, sem saída), por técnico; Cobrar e Parabenizar. | Lê a fonte única (Auvo e SGO+). Conduta só sugere; nada vira ocorrência sozinho. | Os de hoje. | — |
| 6e | Gestor, Diretoria | Assistência técnica › Indicadores | Atendimentos no prazo, tempo médio em horas úteis, reincidência (2 ou mais chamados em 90 dias), O.S. por técnico (encerradas, documentação pendente, tempo no local, sem assinatura, série divergente), prazos estourados, reclamações. | Relatório mensal A4 no primeiro dia útil, no e-mail mensal da Diretoria. | E-mail mensal da Diretoria. | — |
| 6f | Gestor | Assistência técnica › Reclamações | Registra reclamação do cliente ou problema que se repete (RC-AAAA-NNNN) com dono e prazo de 2 dias úteis; para resolver, exige causa e ação. | Caso com prazo vencido vai à Caixa de decisões (pendência "ast\_caso"). | AT06 "reclamação para tratar" ao dono do caso (e-mail no resumo). | RC: ABERTO → RESOLVIDO |
| 6g | Administrador, Diretoria | Administração › Matriz de avisos | Ajusta canal de cada evento AT01 a AT12 com motivo; "Resumos do dia" mostra por que um resumo não saiu (fora do piloto, PJ, já abriu o sistema). | Todo envio passa pela matriz; nada fora do expediente; WhatsApp só CLT e só na lista do piloto. | — | — |
| 6h | Administrador | Assistência técnica › Transição do Auvo | Acompanha os seis critérios (acervo copiado, quatro semanas só no SGO+, painéis conferidos, nenhuma O.S. aberta no Auvo, atendimento sem internet conferido, relatório aprovado e enviado a cliente real); dá destino a cada O.S. aberta no Auvo; marca "Auvo desligado" só quando os seis estão cumpridos. | Mede o que é medível (acervo, O.S. abertas no Auvo, semanas de uso). Nada é desligado sozinho. | — | — |

## 3\. O que já existe, o que ficou no COMMAND e o que não existe em nenhum dos dois

Conferido no código em 22/10/2026, função por função. "Existe e ligado" quer dizer que uma função chama a outra de verdade; "parcial" quer dizer que existe a tela ou a tabela, mas falta a ligação; "não existe" é literal. Os nomes dos arquivos valem para a pasta do SGO+ (`apps-script-imports/portal_sgo_versao_cnpj_db`), do servidor (`sgo_servidor`) e do COMMAND (`metrolabs_command`).

### 3.1 Os pontos que o dono pediu para conferir

| Ponto | SGO+ hoje | COMMAND | Onde está |
| --- | --- | --- | --- |
| Cadastrar ou localizar cliente, unidade e equipamento a partir do aplicativo do técnico | **Não existe.** O aplicativo tem só quatro funções de servidor (Meu dia, O.S., sincronizar, enviar foto) e oito tipos de evento; nenhum cria ou busca cadastro. No computador, Técnico e Comercial cadastram (Cadastros › Clientes), mas essa tela não é para celular. | **Não existe.** O chamado exige cliente, unidade e equipamento já cadastrados e ativos. | SGO\_Assistencia\_App.js:89-163; SGO\_Assistencia\_OS.js:131; campo/app.js:928-1061; COMMAND Assistencia.js:327-338 |
| O.S. aberta pelo técnico em campo, fora da agenda | **Não existe.** A O.S. só nasce em "Agendar", pela gestão, de um chamado Planejado. Evento com O.S. desconhecida é recusado. O técnico pode abrir chamado no computador, mas ele passa pela triagem e pela agenda. | **Não existe.** | SGO\_Assistencia\_Agenda.js:66-128; SGO\_Assistencia\_OS.js:134 |
| Envio da O.S. ao cliente por e-mail | **Existe e ligado**, por pessoa: botão "Enviar ao cliente" na ficha da O.S. abre o Enviar documento; sai pela caixa integrada do usuário ou pela caixa do sistema; registro em DOC\_ENVIOS. Automático só o e-mail curto "atendimento concluído" (AT08), sem o PDF. A coluna "enviado ao cliente em" da O.S. nunca é gravada. | Existe (cmdApiRelatorioOsEnviar e EnviarDoc.js), por pessoa; grava o evento OS\_ENVIADA no chamado. | JS\_Assistencia.html:603,690; SGO\_EnviarDoc.js:452,732; SGO\_Assistencia\_Relatorio.js:123-126; SGO\_Assistencia\_OS.js:370 |
| Envio da O.S. ao cliente por WhatsApp, pelo número do sistema (Meta) | **Não existe.** O Enviar documento manda documento só pela Z-API (send-document, PDF na mensagem). Com o piloto ligado ou o provedor Meta, a Z-API fica fora e o documento vai só por e-mail. A janela mostra o WhatsApp como disponível (confere só as credenciais) e o envio falha. O servidor confirma: todo envio pela Meta ou Z-API passa pela trava do piloto; cliente e contato externo ficam bloqueados. | Igual: só Z-API, desligada pelo piloto desde a 0.38.0. | SGO\_EnviarDoc.js:452-465,591-593; servidor whatsappPiloto.ts:36-93; COMMAND EnviarDoc.js:559-562 |
| Pasta do cliente | **Existe e ligado.** Relatório encerrado: PDF e HTML em pasta de documentos › cliente › unidade › "TAG - tipo" › "4. Ordens de Serviço"; rascunho em pasta privada; orçamento em "Assistência técnica - Orçamentos" › cliente; fotos na pasta do equipamento, privadas. Registro no Arquivo de documentos (tipo "ORDEM DE SERVIÇO") só quando há unidade e sessão de usuário: o encerramento pela rotina não registra. A pasta abre em /pastas/:id com "enviar por e-mail ou WhatsApp" em cada PDF. | Existe (cmdA4Guardar\_: pasta do cliente, categoria RELATORIO, e Documentos com versão anterior OBSOLETO). | SGO\_Assistencia\_Config.js:889-920; SGO\_Assistencia\_Relatorio.js:98-141; SGO\_Assistencia\_Painel.js:141-144; servidor rotasDocumentos.ts:49-70 |
| Orçamento → aprovação do cliente → Compras: ligação real? | **Parcial.** Pedir, preencher, emitir A4, revisar e registrar a resposta existem e estão ligados; aprovado com peças chama Compras de verdade (um pedido por peça). O que falta é o cliente: a aprovação é manual, com aceite anexado obrigatório (PDF, imagem ou e-mail); não há link nem ação no portal. | Existe o link público com aceite (nome, documento, cargo, assinatura, hash do conteúdo, resposta única, validade); o aceite devolve o chamado a Planejado e cria pré-agenda. O plano integrado apontou que o aceite não confere "condição de entrada" (pagamento) antes de planejar. | SGO\_Assistencia\_Relatorio.js:161-302; COMMAND Orcamentos.js:916-1275, OrcChamado.js:103-131 |
| Aguardando peça → Compras | **Existe e ligado.** Triagem, orçamento aprovado e falta em campo chamam CmpR\_salvar\_ com vínculo ao cliente e ao chamado; regra "peça em falta abre pedido em Compras". | Existe (cmdComprasCriarRequisicaoInterna\_ com origem CHAMADO; valida a transição antes para não deixar requisição órfã). | SGO\_Assistencia\_Chamados.js:259-290; SGO\_Compras\_Requisicoes.js:236; COMMAND Assistencia.js:422-456 |
| Peça chegou → chamado volta e retorno é agendado | **Não existe a volta.** O recebimento em Compras avisa quem pediu e o vendedor; nenhuma função de Compras chama a Assistência. A gestão usa "Retomar" (texto obrigatório) e "Agendar"; "Agendar" reaproveita a mesma O.S. (sai de PAUSADA), e o teste confirma o mesmo número. Nesse caminho o cliente não é avisado. | Existe: cmdComprasPecaDisponivel\_ chama cmdAssistenciaPecaDisponivel\_, que devolve o chamado a Planejado e avisa técnico e triagem; cria a missão de entrega da peça. | SGO\_Compras\_Pedido.js:232-245; SGO\_Assistencia\_Chamados.js:297; SGO\_Assistencia\_Agenda.js:97-119; COMMAND Compras.js:941-952, Assistencia.js:400-418 |
| Tarefas agendadas e Minhas atividades | **Existe e ligado.** "Agendar" cria a atividade "Atender OS-..." (Atividades\_apiCriar); reagendar edita; encerrar e cancelar mudam a situação. Orçamento cria atividade para o Comercial; pedido aprovado do Comercial cria atividade para a Técnica e o chamado. | Existe como missão (cmdCriarMissaoInterna\_), sincronizada com o chamado. | SGO\_Assistencia\_Agenda.js:147-150; SGO\_Assistencia\_Config.js:850-878 |
| Aviso ao Comercial | **Parcial.** Existem: orçamento pedido e respondido (AT12 ao gestor comercial), e "pedido do Comercial concluído" ao vendedor quando o chamado veio de proposta (AT07). Não existe: oportunidade a partir do atendimento (recomendação de troca, contrato, calibração ou qualificação vencida). O Comercial do SGO+ cita "VENCIMENTO:<id>" como gancho de segunda fase. | Só o aviso C013 (orçamento pedido). Sem criação de negociação a partir do chamado. | SGO\_Assistencia\_Chamados.js:343-347; SGO\_Assistencia\_Relatorio.js:168-176; SGO\_Comercial\_Oportunidades.js:24-25 |
| Assinatura do cliente no A4 | **Existe e ligado.** Quadro no aplicativo (nome e documento obrigatórios; PNG até 200.000 caracteres); a imagem entra no relatório pelo bloco de assinaturas do padrão A4; "sem assinatura" exige motivo, quem recebeu e justificativa. A regra "assinatura obrigatória" é configurável por tipo de serviço. | Existe (quadro na tela web, PNG de 800 a 45.000 caracteres). | campo/app.js:895-921; SGO\_Assistencia\_Relatorio.js:75-77; COMMAND Assistencia.js:852-868 |
| Entrada pelo WhatsApp | **Não existe.** O SGO+ não tem webhook de entrada; a mensagem vai ao COMMAND (Caixa de Entrada, atendente, bate-papo). | Existe o atendente com inteligência artificial que abre o chamado depois do "sim" do cliente, com pré-agenda; passa a uma pessoa depois de duas falhas. | servidor servidor.ts:255-293; COMMAND Atendente.js:301-328,456-538 |
| Entrada pelo QR do equipamento | **Não existe.** O canal "QR" é aceito na função de solicitar, mas nenhuma página chama essa função. | Não existia. | SGO\_Assistencia\_Chamados.js:416-426 |
| Portal do cliente | **Existe e ligado.** "Meus chamados": pedir atendimento (vira solicitação), acompanhar as etapas, baixar relatórios, ver equipamentos. Sem ação de orçamento. | Existe com cinco etapas, token de 64 caracteres (só o hash fica), validade de 12 meses, limites por hora e por dia. | SGO\_Assistencia\_Painel.js:376,523; JS\_Assistencia.html:971-993; COMMAND PortalCliente.js |

### 3.2 O que existe e funciona no SGO+ (resumo por tela)

| Tela ou função | O que faz | Arquivo |
| --- | --- | --- |
| Abrir chamado (AstC\_abrir\_) | Busca no cadastro único, equipamento não identificado, reincidência em 30 dias, chamado aberto no mesmo equipamento, prazo pela prioridade ou pelo contrato, avisos AT01/AT02 e AT08 ao cliente. | SGO\_Assistencia\_Chamados.js:107-175 |
| E-mail › "Abrir chamado" | Preenche o formulário de abertura com o e-mail do cliente (canal E-MAIL). | JS\_Email.html:322-350; JS\_Assistencia.html:240 |
| Solicitações dos clientes (AstC\_solicitar\_, converter\_, descartar\_) | Fila; converter abre o chamado; descartar exige motivo; AT09. | SGO\_Assistencia\_Chamados.js:416-459 |
| Triagem e decisão (AstC\_mudar\_) | 15 situações com transições conferidas no servidor; quatro caminhos; prioridade com motivo; orçamento e peça ligados. | SGO\_Assistencia\_Chamados.js:25-290; SGO\_Assistencia\_Config.js:88-117 |
| Agendar (AstA\_agendar\_), conflitos, veículo, rota | Técnico, data, duração, tipo, preparo; conflito com O.S., tarefa do Auvo e ausência; reserva pela Frota (FrotaRes\_criar\_); atividade do técnico; rota do dia na ordem da gestão. | SGO\_Assistencia\_Agenda.js:13-288 |
| O.S.: processador de eventos (AstO\_aplicarEvento\_), faltas (AstO\_faltas\_), encerramento (AstO\_tentarEncerrar\_) | Oito eventos; localização só em Cheguei e Concluí; série divergente; peça em falta; trava de encerramento; encerramento sozinho quando a documentação completa; liga o documento técnico do equipamento. | SGO\_Assistencia\_OS.js:34-468 |
| API do aplicativo (Ast\_appMeuDia, Ast\_appSincronizar, Ast\_appEnviarFoto, Ast\_appOS) | Contrato versão 1; idempotente por idLocal; sessão vencida sem perder a fila; interruptor "Assistência ligada". | SGO\_Assistencia\_App.js:18-163; docs/API\_APP\_TECNICO.md |
| SGO+ Campo (aplicativo) | Entrar, Meu dia (hoje e amanhã), O.S. com nove passos, Envios, Minha conta, Ajuda; fila no aparelho (IndexedDB), envio a cada 30 s, foto reduzida e carimbada, QR por foto (Android), assinatura no quadro, localização só nos dois toques, versão nova baixada sozinha. | sgo\_servidor/src/publico/campo/app.js, fila.js, regras.js; src/servicos/campo.ts |
| Relatório A4 (AstR\_htmlOS\_, AstR\_emitirRelatorioOS\_) | Fotos (até 12), assinatura, lista de verificação, peças, linha do tempo; versões; pasta do equipamento; Arquivo de documentos; portal. | SGO\_Assistencia\_Relatorio.js:24-141 |
| Orçamento do chamado (AstR\_pedirOrcamento\_, salvar, emitir, revisar, decidir) | Rascunho OA-, valores só para quem pode, A4, revisão, resposta com aceite anexado, volta a Planejado ou Aguardando peça com pedidos em Compras. | SGO\_Assistencia\_Relatorio.js:161-302 |
| Reclamações (AstC\_salvarCaso\_) | RC- com dono, prazo de 2 dias úteis, causa e ação para resolver; AT06; pendência na Caixa. | SGO\_Assistencia\_Chamados.js:499-542 |
| Indicadores e relatório mensal (AstR\_indicadores\_, Assistencia\_relatorioMes\_) | Prazo por prioridade, tempo médio, reincidência, por técnico e por tipo, reclamações, Auvo contra SGO+; A4 no primeiro dia útil, no e-mail da Diretoria. | SGO\_Assistencia\_Relatorio.js:313-397; SGO\_Gestao\_Escada.js:343,404 |
| Pendências e Caixa de decisões (Assistencia\_fontePendencias\_, SGO\_Pendencias\_Assistencia.js) | Doze tipos de pendência registrados na Central e na Caixa (triagem, agendar, prazo, orçamento parado, documentação pendente, sem sincronização, série, solicitação, caso, O.S. de hoje, aviso). | SGO\_Assistencia\_Painel.js:29; SGO\_Pendencias\_Assistencia.js:15-57 |
| Matriz de avisos AT01 a AT12 (Assistencia\_registrarTipos\_) | Injetados no padrão da matriz; todo envio por SGO\_notificar\_, depois de soltar a trava; WhatsApp ao cliente desligado por regra e retido pelo piloto. | SGO\_Pendencias\_Assistencia.js:33-58; SGO\_Assistencia\_Config.js:813-839; SGO\_Notificar.js:740-743 |
| Fonte única de atendimentos (SGO\_Atendimentos\_linhas\_) | Auvo e O.S. do SGO+ com os mesmos campos para Qualidade, Conduta, Frota, ponto, Central, Início, equipamento e Vínculos; histórico do equipamento com o acervo. | SGO\_Assistencia\_Fonte.js:51-87 |
| Regras da assistência e Transição do Auvo | Prazos, contratos, assinatura, distância, foto, peça, avisos, interruptor; 29 tipos; 7 modelos padrão e importação dos 13 questionários; seis critérios com parte automática; destino das O.S. abertas no Auvo; "Auvo desligado" só pelo Administrador. | SGO\_Assistencia\_Config.js:165-276,494-576; SGO\_Assistencia\_Painel.js:189-285 |
| Comercial → Assistência (Assistencia\_doPedidoComercial\_) | Passar o pedido aprovado ao setor Técnica abre o chamado (canal COMERCIAL, P3, sem valores). | SGO\_Comercial\_Propostas.js:736-768; SGO\_Assistencia\_Chamados.js:473-488 |
| Testes | 23 casos em 4 arquivos (assistencia, fonte-integracao, tela, questionarios). Sem teste: envio pelo Enviar documento, volta de Compras, envio real dos AT pela matriz, reserva de veículo. | tests/assistencia\*.test.cjs |

### 3.3 O que existe no COMMAND e ainda não veio

-   **Volta de Compras para a Assistência** quando a peça fica disponível (cmdComprasPecaDisponivel\_ → cmdAssistenciaPecaDisponivel\_), com aviso ao técnico e à triagem e missão de entrega da peça.
-   **Aceite do orçamento por link público** (Orcamentos.js: token com hash, validade, resposta única, nome, documento, cargo e assinatura; o aceite devolve o chamado a Planejado e cria pré-agenda).
-   **Atendente no WhatsApp** (Atendente.js): identifica cliente, unidade, equipamento e contrato; abre o chamado após o "sim"; pré-agenda com técnico designado; passa a uma pessoa depois de duas falhas; avisa o cliente das mudanças.
-   **Prazos do contrato por etapa** (Contratos.js: reconhecer, triagem, resposta, chegada, solução, por prioridade e categoria; cobertura mais específica vence). O SGO+ trouxe só o prazo de atendimento por contrato; a chegada ao local, que o hospital mais cobra, não é usada em nenhum dos dois.
-   **Triagem com nove itens** (códigos de erro, utilidades, intervenções recentes, orientação remota, isolamento, peça ou instrumento). O SGO+ ficou com seis.
-   **Casos guarda-chuva** (chamado, missão, entrada, ordem, requisição, contrato e documento no mesmo caso; só encerra sem vínculo aberto; visibilidade em dois níveis). O SGO+ trouxe a reclamação simples.
-   **Alertas próprios**: P1 sem triagem em 30 min; reincidência como alerta. O SGO+ tem o prazo de triagem, mas não um alerta específico de P1 nos 30 min.
-   **Portal com limites** (60 consultas por hora, 20 solicitações por dia, foto validada) e com a etapa "Em análise".
-   **Pedido de remarcação** vindo de fora (mudança feita na agenda externa vira pedido para a supervisão decidir).

As cinco cópias em `cmd_wt_*` não são repositórios: são cópias soltas de 12/10, menores que o código do COMMAND atual, sem nenhuma função que falte ao principal. Não há trabalho perdido nelas.

### 3.4 O que não existe em nenhum dos dois

-   Cadastro ou busca de cliente, unidade e equipamento pelo celular do técnico; O.S. aberta em campo.
-   Envio de documento pelo número oficial da Meta (só a Z-API faz "send-document"); envio do PDF ao cliente no encerramento.
-   Pedido de atendimento pelo QR do equipamento.
-   Oportunidade comercial nascida do atendimento (recomendação, contrato, vencimento de calibração ou qualificação do equipamento atendido).
-   Correção de O.S. encerrada com revisão e motivo ("Abrir para corrigir" do padrão de documentos de 22/10).
-   Pesquisa de satisfação do cliente depois do atendimento.
-   Estoque de peças (a "peça disponível" de Compras é da requisição, não de um saldo).
-   Leitura do QR no iPhone (depende de recurso do navegador que o iPhone não tem; a série e a TAG resolvem).

## 4\. Diagramas

### 4.1 Situações do chamado (SGO+, 15) e transições permitidas

Conferidas no servidor em AstC\_mudar\_ (tabela AST\_TRANSICOES). Toda mudança grava um evento com a hora do servidor; chamado ENCERRADO ou CANCELADO não muda mais.

```
ABERTO ──────────────► EM_TRIAGEM ──┬─► RESOLVIDO_REMOTO ──► ENCERRADO
   │                        ▲        ├─► AGUARDANDO_ORCAMENTO ─┬─► PLANEJADO
   │                        │        ├─► AGUARDANDO_PECA ──────┤      │
   │                        │        └─► PLANEJADO ◄───────────┘      │
   │                        │                 │                        │
   │                        │                 ▼                        │
   │                        │              AGENDADO ──► EM_DESLOCAMENTO ──► NO_LOCAL ──► EM_EXECUCAO
   │                        │                 ▲                                   │          │  ▲
   │                        │                 │ (peça chegou: Retomar + Agendar)  │          ▼  │
   │                        │                 │                                   │       PAUSADO
   │                        │           AGUARDANDO_PECA ◄─────────────────────────┤  AGUARDANDO_CLIENTE
   │                        └─────────────────┘ (volta à triagem)                 │
   │                                                                              ▼
   └──► CANCELADO (de quase todas, com motivo)                 DOC_PENDENTE ──► ENCERRADO
```

Texto para ferramenta de diagrama (mermaid): `stateDiagram-v2; [*]-->ABERTO; ABERTO-->EM_TRIAGEM; EM_TRIAGEM-->RESOLVIDO_REMOTO; EM_TRIAGEM-->AGUARDANDO_ORCAMENTO; EM_TRIAGEM-->AGUARDANDO_PECA; EM_TRIAGEM-->PLANEJADO; RESOLVIDO_REMOTO-->ENCERRADO; RESOLVIDO_REMOTO-->EM_TRIAGEM; AGUARDANDO_ORCAMENTO-->PLANEJADO; AGUARDANDO_ORCAMENTO-->AGUARDANDO_PECA; AGUARDANDO_PECA-->PLANEJADO; AGUARDANDO_PECA-->EM_TRIAGEM; PLANEJADO-->AGENDADO; PLANEJADO-->AGUARDANDO_PECA; PLANEJADO-->AGUARDANDO_ORCAMENTO; AGENDADO-->EM_DESLOCAMENTO; AGENDADO-->NO_LOCAL; AGENDADO-->PLANEJADO; AGENDADO-->AGUARDANDO_PECA; EM_DESLOCAMENTO-->NO_LOCAL; EM_DESLOCAMENTO-->PLANEJADO; NO_LOCAL-->EM_EXECUCAO; NO_LOCAL-->AGUARDANDO_CLIENTE; NO_LOCAL-->PLANEJADO; NO_LOCAL-->DOC_PENDENTE; EM_EXECUCAO-->PAUSADO; EM_EXECUCAO-->AGUARDANDO_CLIENTE; EM_EXECUCAO-->AGUARDANDO_PECA; EM_EXECUCAO-->DOC_PENDENTE; EM_EXECUCAO-->PLANEJADO; PAUSADO-->EM_EXECUCAO; PAUSADO-->AGUARDANDO_PECA; PAUSADO-->PLANEJADO; AGUARDANDO_CLIENTE-->EM_EXECUCAO; AGUARDANDO_CLIENTE-->AGUARDANDO_PECA; AGUARDANDO_CLIENTE-->PLANEJADO; DOC_PENDENTE-->ENCERRADO; ENCERRADO-->[*]; CANCELADO-->[*]`

### 4.2 Situações da O.S. (8) e os eventos do aplicativo

```
AGENDADA ──SAIU──► EM_DESLOCAMENTO ──CHEGUEI──► NO_LOCAL
   ▲                (CHEGUEI direto também vale)    │ RESPOSTA / FOTO / RELATO / PECA
   │                                                ▼
   │ Agendar de novo (mesma O.S.)              EM_EXECUCAO ──PECA FALTA──► PAUSADA
   └────────────────────────────────────────────────┘           (chamado AGUARDANDO_PECA)
                                                    │ CONCLUI
                                                    ▼
                          documentação completa? ──sim──► ENCERRADA
                                                    │     (relatório A4, atividade concluída)
                                                    └──não──► DOC_PENDENTE ──evento que completa──► ENCERRADA
CANCELADA: pela gestão, com motivo. ENCERRADA e CANCELADA não aceitam eventos.
```

A O.S. não tem tabela de transições própria; o controle fica dentro do processador de eventos (AstO\_aplicarEvento\_). No COMMAND a O.S. não era entidade: era o número gravado no chamado ao finalizar a execução.

### 4.3 Ligações entre módulos

Setas cheias: chamada de função que existe hoje no SGO+. Setas tracejadas: ligação que falta (plano, seção 5).

```
COMERCIAL     ──── passar ao setor Técnica (chamado nasce) ─────────────────► ASSISTÊNCIA
oportunidade  ◄─── AT12 orçamento pedido/respondido · AT07 pedido concluído ── chamado · O.S.
proposta      ◄ ─ ─ oportunidade do atendimento (falta, etapa 7) ─ ─ ─ ─ ─ ─ ─ triagem · agenda
                                                                                    │
COMPRAS       ◄─── requisição por peça (CmpR_salvar_), vínculo chamado/O.S. ────────┤
requisição    ─ ─ ─ peça disponível → chamado volta a Planejado (falta, etapa 3) ─ ►│
                                                                                    │
FROTA ·       ◄─── reserva de veículo (FrotaRes_criar_) · atividade "Atender OS" ───┤
ATIVIDADES    ───► ausências e tarefas do Auvo entram no conflito da agenda ────────┤
                                                                                    │
DOCUMENTOS    ◄─── relatório A4 (PDF+HTML) → pasta do equipamento → Arquivo ────────┤
pasta cliente ───► Enviar documento (e-mail hoje; WhatsApp pela Meta: falta, 5) ────┤
                                                                                    │
AVISOS        ◄─── Ast_avisar_ → SGO_notificar_ (AT01..AT12) → matriz de avisos ────┤
Caixa         ◄─── pendências ast_* → Central → Caixa de decisões → escada ─────────┤
                                                                                    │
FONTE ÚNICA   ◄─── SGO_Atendimentos_linhas_ (Auvo + O.S.) → Qualidade, Conduta, ────┘
                   Frota, ponto, Início, equipamento, Vínculos
```

Texto para ferramenta de diagrama (mermaid): `flowchart LR; COM[Comercial]-->|chamado do pedido aprovado|AST[Assistência]; AST-->|AT12, AT07|COM; AST-.->|oportunidade do atendimento|COM; AST-->|requisição por peça|CMP[Compras]; CMP-.->|peça disponível devolve a Planejado|AST; AST-->|reserva, atividade|FRO[Frota e Atividades]; FRO-->|ausências, conflito|AST; AST-->|relatório A4|DOC[Documentos e pasta do cliente]; DOC-->|Enviar documento|CLI[Cliente]; DOC-.->|WhatsApp pela Meta|CLI; AST-->|AT01..AT12, pendências|AVI[Avisos, Central, Caixa de decisões]; AST-->|fonte única|QUA[Qualidade, Conduta, Frota, ponto]`

## 5\. Plano de construção em etapas publicáveis

Ordem pelo que destrava o uso real: primeiro o técnico abre e fecha uma O.S. completa pelo celular, inclusive em cliente novo, e o cliente recebe o PDF. Cada etapa é pequena, publicável sozinha, com teste próprio e com a ajuda da tela e o manual atualizados no mesmo trabalho. "Design" é o que se vê e se lê (telas, fluxo, textos); "engenharia" é servidor, regras e integrações. Nenhuma etapa depende de o Auvo ser desligado.

### Etapa 1. Técnico em campo: localizar ou cadastrar cliente, unidade e equipamento, e O.S. avulsa

-   **Entrega ao usuário:** No SGO+ Campo, botão "Atendimento fora da agenda" no Meu dia. O técnico busca o cliente por nome ou CNPJ (consulta de CNPJ já existe), escolhe ou cria a unidade e o equipamento (tipo, fabricante, modelo, série, TAG, setor; foto da plaqueta como primeira foto) e abre a O.S. na hora, com o chamado criado por trás (canal PRESENCIAL, prioridade P3, tipo de serviço escolhido). A triagem fica registrada como "feita em campo" e a gestão é avisada. O cadastro novo entra marcado "criado em campo" para a gestão conferir vínculo e duplicidade (regra "vale o original").
-   **Design:** Telas de busca e cadastro mínimo no celular (campos grandes, 5 por tela, CNPJ com consulta, "Já existe? abrir"), texto de confirmação antes de criar ("Você vai criar o cliente X"), pendência "cadastro criado em campo a conferir" para a gestão; manual do aplicativo (item 3 novo).
-   **Engenharia:** Contrato da API versão 2 (docs/API\_APP\_TECNICO.md, seção Mudanças): `Ast_appBuscarCadastro` (cliente, unidade, equipamento; leitura), `Ast_appCadastrar` (cria pelo SGO\_DATA com as regras do cadastro; idempotente por idLocal), `Ast_appAbrirOS` (cria chamado e O.S. numa trava; nível TÉCNICO; exige a Assistência ligada). Fila do aparelho com o evento NOVA\_OS resolvido antes dos demais (a O.S. provisória recebe o id real na resposta). Pendência nova "ast\_cadastro\_campo". Evento AT01 com canal PRESENCIAL.
-   **Arquivos:** SGO\_Assistencia\_App.js, SGO\_Assistencia\_Chamados.js, SGO\_Assistencia\_OS.js, SGO\_Pendencias\_Assistencia.js, SGO\_Cadastros\*.js (reaproveitar as funções de criar); servidor src/publico/campo/app.js, fila.js, regras.js; docs/API\_APP\_TECNICO.md, docs/MANUAL\_APP\_CAMPO.md, SGO\_Ajuda\_Assistencia.js.
-   **Testes:** tests/assistencia.test.cjs: busca por CNPJ, criação idempotente, O.S. avulsa com chamado por trás, recusa com a Assistência desligada, duplicidade apontada. Servidor: testes do app com a fila em modo avião criando a O.S. antes das fotos.
-   **Risco:** Cadastro duplicado por técnico apressado (mitigado pela busca obrigatória antes de criar e pela pendência de conferência); sem internet, a O.S. provisória só ganha número ao sincronizar (a tela avisa).

### Etapa 2. O cliente recebe o PDF: envio no encerramento, registro na O.S., aplicativo mostra e envia

-   **Entrega ao usuário:** Ao encerrar, a tela do SGO+ mostra a barra "Relatório salvo: Enviar ao cliente" já com os contatos do cliente; no aplicativo, a O.S. encerrada ganha "Ver relatório" e "Enviar ao cliente por e-mail" (um toque, contatos do cadastro). A ficha da O.S. passa a mostrar "Enviado ao cliente em ... para ..." e a Central ganha a pendência "O.S. encerrada há 1 dia útil sem envio ao cliente" para a gestão. O relatório encerrado pela rotina entra no Arquivo de documentos.
-   **Design:** Tela "Relatório" no aplicativo (abre o PDF privado com a sessão), botão de envio com prévia do e-mail em uma tela; texto do e-mail ao cliente padronizado (sem cara de sistema); pendência com caminho.
-   **Engenharia:** Gravar ENVIADO\_CLIENTE\_EM e o destinatário na O.S. a partir do Enviar documento (gancho "depois do envio" por tipo de documento, como o COMMAND fazia com OS\_ENVIADA); `Ast_appEnviarRelatorio` chamando EnviarDoc\_apiEnviar com os contatos; registrar no Arquivo de documentos com usuário de sistema quando não há sessão; pendência "ast\_sem\_envio". Decisão de produto: o envio continua sendo ato de uma pessoa (regra de 20/10), mas a pessoa pode ser o técnico, no celular, no fim do atendimento.
-   **Arquivos:** SGO\_EnviarDoc.js, SGO\_Assistencia\_Relatorio.js, SGO\_Assistencia\_OS.js, SGO\_Assistencia\_App.js, SGO\_Pendencias\_Assistencia.js, JS\_Assistencia.html; campo/app.js; manuais.
-   **Testes:** Envio grava a coluna e o histórico; pendência some depois do envio; rotina registra no Arquivo; aplicativo envia uma vez só (pedido repetido).
-   **Risco:** Técnico enviar a um contato errado: a lista vem do cadastro e o técnico não digita e-mail novo no celular (só a gestão acrescenta contato).

### Etapa 3. Peça chegou: Compras devolve o chamado e o retorno é agendado

-   **Entrega ao usuário:** Quando a peça fica disponível em Compras, o chamado volta sozinho a Planejado com a anotação "peça disponível em ..." e entra na Caixa do gestor como "retorno a agendar"; o técnico e o gestor são avisados; ao agendar o retorno, o cliente recebe o e-mail "visita agendada" (hoje não recebe). Cancelar o chamado libera a reserva de veículo.
-   **Design:** Ficha do chamado com o quadro "Peça": requisição, situação, previsão, "disponível em"; botão "Agendar o retorno" direto do aviso; texto do e-mail ao cliente.
-   **Engenharia:** `Assistencia_pecaDisponivel_(requisicaoId)` chamada por CmpP\_disponivel\_ quando o vínculo é chamado (com typeof, como o COMMAND), transição AGUARDANDO\_PECA → PLANEJADO com evento; pendência "ast\_retorno"; AT03 ao técnico e AT11 fechado; AT08 ao cliente no agendamento vindo de Planejado quando já houve visita; cancelar chama FrotaRes\_cancelar\_ da reserva ligada à O.S.
-   **Arquivos:** SGO\_Compras\_Pedido.js, SGO\_Assistencia\_Chamados.js, SGO\_Assistencia\_Agenda.js, SGO\_Pendencias\_Assistencia.js, SGO\_Frota\_Reservas.js; manuais da Assistência e de Compras.
-   **Testes:** Receber em Compras devolve o chamado e avisa; divergência no recebimento não devolve; agendar o retorno avisa o cliente; cancelar libera a reserva.
-   **Risco:** Trava reentrante entre Compras e Assistência (as chamadas cruzadas rodam depois de soltar a trava, padrão já usado).

### Etapa 4. Aceite do orçamento pelo cliente por link e pelo portal

-   **Entrega ao usuário:** O e-mail do orçamento leva um link "Aprovar ou recusar" (e o portal "Meus chamados" mostra o mesmo botão). O cliente vê a mesma folha A4, informa nome, documento e cargo, assina no quadro e confirma; o aceite fica registrado com hora e endereço de rede, a resposta é única, o link vence com a validade do orçamento, e uma revisão nova revoga o link anterior. Aprovado, o chamado vai a Planejado (ou Aguardando peça) sozinho; recusado, o gestor decide. A resposta manual com anexo continua existindo para quem responde por telefone.
-   **Design:** Página pública do orçamento (modelo do COMMAND: folha num quadro, sem nomes da equipe, sem rolagem lateral no celular), texto do e-mail, tela de confirmação "recebemos a sua aprovação".
-   **Engenharia:** Rota pública do servidor `/orcamento/:token` (só o hash do token gravado; hash do conteúdo para garantir que não mudou; trava e marca contra resposta dupla); `AstR_responderPorLink_` reaproveitando AstR\_decidirOrcamento\_ com o aceite gerado pelo sistema (PDF do aceite assinado); gancho no portal.
-   **Arquivos:** SGO\_Assistencia\_Relatorio.js, SGO\_Assistencia\_Painel.js (portal), JS\_Assistencia.html; servidor src/servicos/rotasDocumentos.ts ou rota nova; modelos de e-mail.
-   **Testes:** Token inválido, vencido, respondido duas vezes, conteúdo alterado; aprovado leva a Planejado; recusado avisa o gestor; revisão revoga o link.
-   **Risco:** Link reenviado a pessoa errada: o aceite exige nome e documento e fica no histórico; o orçamento nunca mostra dados internos.

### Etapa 5. WhatsApp ao cliente pelo número oficial: documento e avisos

-   **Entrega ao usuário:** O Enviar documento passa a mandar o PDF pelo número oficial da empresa (Meta), e os avisos ao cliente (chamado recebido, visita agendada ou reagendada, atendimento concluído) saem por WhatsApp quando a regra "avisos ao cliente por WhatsApp" estiver ligada e o cliente estiver na lista do piloto. A janela só oferece o WhatsApp quando ele realmente pode sair.
-   **Design:** Textos dos modelos (sem exclamação, sem emoji, com o nome do documento e o número da O.S.); janela do Enviar documento mostrando o motivo quando o WhatsApp está indisponível; manual da matriz.
-   **Engenharia:** Envio de documento pela Meta: subir o PDF para a mídia da Meta e mandar a mensagem de documento (modelo aprovado fora da janela de 24 h); `SGO_waMetaEnviarDocumento_` no lugar do send-document da Z-API; EnviarDoc\_canais\_ consultando a trava do piloto; piloto com clientes de teste na lista. Modelos a cadastrar na Meta: documento da O.S., orçamento, chamado recebido, visita agendada, atendimento concluído.
-   **Arquivos:** SGO\_EnviarDoc.js, SGO\_Notificar.js, SGO\_Assistencia\_Config.js (regra), servidor whatsappPiloto.ts (sem mudança de regra, só a lista); sgo\_servidor/docs/MODELOS\_WHATSAPP\_META.md.
-   **Testes:** Documento pela Meta com cliente na lista; retido fora da lista; janela sem a opção quando bloqueado; nunca valor em mensagem ao cliente.
-   **Risco:** Aprovação dos modelos pela Meta (prazo fora do nosso controle) e a estratégia de mensagens ao cliente, que o dono ainda está definindo (decisão de 20/10: piloto com poucas pessoas antes de abrir). Por isso esta etapa vem depois das quatro primeiras.

### Etapa 6. Entrada pelo WhatsApp e pelo QR

-   **Entrega ao usuário:** Mensagem de cliente no número da empresa vira "Solicitação do cliente" no SGO+ (com o texto e a mídia), com resposta automática curta "recebemos, em breve retornamos"; a página do QR do equipamento ganha "Solicitar atendimento", que cria a solicitação com o equipamento certo. O atendente com inteligência artificial do COMMAND fica para uma fase seguinte, se o dono quiser.
-   **Design:** Fila de solicitações com origem (WhatsApp, QR, portal) e a conversa anexada; formulário curto na página do QR (nome, telefone, o que acontece, equipamento parado?).
-   **Engenharia:** Webhook de entrada no SGO+ (hoje só o COMMAND tem): reconhecer o cliente pelo telefone em CAD\_CONTATOS e criar a solicitação (AstC\_solicitar\_, canal WHATSAPP); decidir com o COMMAND quem fica com a linha de entrada (uma só assinatura da Meta); rota pública do QR chamando "solicitar" com origem QR e limite por hora.
-   **Arquivos:** servidor src/servidor.ts, src/servicos/webhook.ts; SGO\_Assistencia\_Chamados.js; página do QR (SGO\_Equipamentos\*/SGO\_Qr\*); manuais.
-   **Testes:** Mensagem de telefone conhecido vira solicitação; desconhecido vai para a fila com "cliente não identificado"; QR cria com o equipamento; limite por hora.
-   **Risco:** Duplicidade com o COMMAND na mesma linha: só um sistema pode receber o webhook; a recomendação é o SGO+ receber e repassar ao COMMAND o que for dele (bate-papo da equipe).

### Etapa 7. Comercial: oportunidade a partir do atendimento e fechamento do pedido

-   **Entrega ao usuário:** Ao encerrar a O.S., o técnico marca (no relato) "recomendo: troca / contrato de manutenção / calibração / qualificação"; a gestão confirma e nasce a oportunidade no Comercial, ligada ao cliente, à unidade e ao equipamento, com a O.S. como origem e sem valores do lado técnico. Vencimento de calibração ou qualificação do equipamento atendido vira sugestão de oportunidade na Caixa de acompanhamento. Quando o chamado veio de proposta, encerrar a O.S. conclui a atividade do setor Técnica.
-   **Design:** Campo "Recomendação comercial" no relato (lista curta), quadro "Oportunidades deste atendimento" na ficha do chamado, botão "Criar oportunidade" na lista de vencimentos (já previsto no projeto do Comercial).
-   **Engenharia:** `Assistencia_aoEncerrar_` chamando `Comercial_criarOportunidadeDeOS_` (origem "OS:<id>"), AT nova "oportunidade sugerida" ao gestor comercial no resumo do dia; conclusão da atividade do setor pela proposta; gancho "VENCIMENTO:<id>" já citado no Comercial.
-   **Arquivos:** SGO\_Assistencia\_Chamados.js, SGO\_Assistencia\_OS.js, SGO\_Comercial\_Oportunidades.js, SGO\_Comercial\_Propostas.js, SGO\_Pendencias\_Assistencia.js; campo/app.js (campo do relato); manuais do Comercial e da Assistência.
-   **Testes:** Recomendação cria oportunidade uma vez só; técnico não vê valores; proposta com setor Técnica fecha a atividade ao encerrar.
-   **Risco:** Oportunidade inflada por recomendação automática: nasce como "sugerida" e só vira oportunidade com o "sim" do Comercial.

### Acertos pequenos que entram na primeira publicação (sem etapa própria)

-   Interruptor "Assistência ligada" conferido também em Assistencia\_api (hoje bloqueia só o aplicativo e o gancho do Comercial).
-   "Relatório A4" numa O.S. encerrada reabre a última versão em vez de gerar outra; versão nova só com "Abrir para corrigir" e motivo (ligar SGO\_DocRevisao à O.S.).
-   Prazo de chegada ao local por contrato (o COMMAND guardava e não usava): mostrar o selo "chegada" ao lado do prazo de atendimento quando o contrato tiver.
-   Alerta "P1 sem triagem em 30 minutos" como pendência própria.
-   Transição DOC\_PENDENTE → EM\_TRIAGEM (quando o técnico descobre em campo que precisa de orçamento), com motivo.

### Ordem, tamanho e critério de pronto

| Etapa | Tamanho | Pronto quando | Depende de |
| --- | --- | --- | --- |
| 1\. Cadastro e O.S. em campo | Média (2 frentes: servidor e aplicativo) | Um técnico abre uma O.S. em cliente novo pelo celular, sem internet, e ela chega ao servidor com o cadastro conferido pela gestão. | Resposta à pergunta 1 |
| 2\. PDF ao cliente | Pequena | Cliente de teste recebe o PDF por e-mail enviado do celular do técnico; a ficha mostra "enviado"; pendência some. | Nada |
| 3\. Peça chegou | Pequena | Recebimento em Compras devolve o chamado e o retorno agendado avisa o cliente. | Nada |
| 4\. Aceite por link | Média | Cliente de teste aprova pelo link e o chamado vai a Planejado sem ninguém tocar. | Pergunta 3 |
| 5\. WhatsApp pela Meta | Média (depende da Meta) | PDF chega no celular de um cliente da lista do piloto pelo número oficial. | Modelos aprovados; pergunta 4 |
| 6\. Entrada por WhatsApp e QR | Média | Mensagem de cliente e leitura do QR viram solicitação na fila. | Decisão sobre a linha (pergunta 4) |
| 7\. Comercial | Pequena | Recomendação do técnico vira oportunidade com o "sim" do Comercial. | Pergunta 5 |

Transição do Auvo: segue o plano de 21/10 (paralelo por técnico, seis critérios). Este plano não a antecipa nem a atrasa; a etapa 1 é a que permite o paralelo de verdade, porque hoje um atendimento fora da agenda só é possível no Auvo.

## 6\. Desenho das telas: o que muda para o usuário

### 6.1 Aplicativo do técnico (SGO+ Campo)

-   **Meu dia** ganha, no fim da lista, o botão "Atendimento fora da agenda". Tudo o mais continua: cartões por O.S., ordem da gestão, "Atualizar agenda".
-   **Atendimento fora da agenda** (três telas curtas): 1) "Qual cliente?": busca por nome ou CNPJ; resultado com "Abrir"; sem resultado, "Cadastrar cliente" (razão social pela consulta do CNPJ, telefone). 2) "Qual unidade e equipamento?": lista da unidade; "Novo equipamento" com tipo, fabricante, modelo, série, TAG, setor e foto da plaqueta. 3) "O que você vai fazer?": tipo de serviço, o que o cliente relatou, equipamento parado? Toque em "Abrir a O.S." e a tela de atendimento aparece como qualquer outra, com o aviso "O.S. provisória até sincronizar" quando sem sinal.
-   **O.S. encerrada** ganha dois botões: "Ver relatório" e "Enviar ao cliente por e-mail" (contatos marcados, prévia curta, "Enviar"). Depois do envio, o cartão mostra "Enviado às ...".
-   **Relato** ganha "Recomendação comercial" (nenhuma, troca, contrato, calibração, qualificação) com uma linha de texto.
-   Textos: toda trava diz o quê, por quê, o que fazer e como voltar. Sem termos técnicos de sistema.

### 6.2 Telas do SGO+ no computador

-   **Ficha do chamado**: quadro "Peça" (requisição, situação, previsão, disponível em) e botão "Agendar o retorno"; quadro "Envio ao cliente" na O.S. (quando, para quem, canal, "Enviar de novo"); quadro "Oportunidades deste atendimento".
-   **Orçamento**: botão "Enviar com link de aceite"; situação "Aguardando resposta pelo link"; aceite registrado com nome, documento e hora.
-   **Solicitações dos clientes**: coluna origem (portal, QR, WhatsApp, e-mail) e a conversa anexada.
-   **Caixa de decisões**: itens novos "retorno a agendar", "O.S. sem envio ao cliente", "cadastro criado em campo a conferir", "P1 sem triagem".
-   **Enviar documento**: o WhatsApp aparece só quando pode sair; caso contrário, a frase com o motivo e o que fazer.

### 6.3 Cliente

-   E-mails: "chamado recebido", "visita agendada", "visita reagendada", "atendimento concluído" (com o PDF quando enviado), "orçamento para aprovação" (com o link). Tom profissional, sem exclamação, assinados pela Metrolabs com o nome de quem enviou.
-   Página pública do orçamento: a folha A4 num quadro, botões "Aprovar" e "Recusar", nome, documento, cargo, assinatura.
-   Portal "Meus chamados": acrescenta "Aprovar orçamento" e a etapa "Aguardando sua aprovação".

## 7\. Perguntas ao dono

Só as que mudam a construção. Se não houver resposta, vale a resposta padrão, e o trabalho segue.

| # | Pergunta | Por que muda a construção | Resposta padrão adotada |
| --- | --- | --- | --- |
| 1 | O técnico pode cadastrar cliente, unidade e equipamento pelo celular e abrir a O.S. na hora, sem passar pela triagem e pela agenda da gestão? | Define a etapa 1 inteira: se não puder, o aplicativo só busca o cadastro e a O.S. nasce pela gestão por telefone. | Sim. O cadastro entra marcado "criado em campo" e a gestão confere depois; a O.S. nasce com triagem "feita em campo" e a gestão é avisada. |
| 2 | Quem envia o PDF da O.S. ao cliente: o técnico no celular, ao encerrar, ou só a gestão no computador? | Muda a etapa 2 (botão no aplicativo) e a pendência "sem envio". | O técnico pode enviar do celular para os contatos do cadastro; a gestão também. Sem envio em 1 dia útil, a pendência cobra a gestão. |
| 3 | O cliente aprova o orçamento por link (nome, documento, assinatura na tela) ou a empresa prefere continuar com o aceite por e-mail ou documento assinado? | Define a etapa 4. Sem o link, fica o registro manual com anexo, que já existe. | Link de aceite, mantendo o registro manual para quem responde por telefone. |
| 4 | O WhatsApp ao cliente (documento e avisos) sai pelo número oficial da Meta e entra no piloto agora, ou espera a estratégia de mensagens? | Define se a etapa 5 começa já (modelos a cadastrar na Meta) e se o SGO+ assume a linha de entrada (etapa 6). | Espera: etapas 1 a 4 primeiro; os modelos são cadastrados na Meta desde já (aprovação demora), e a etapa 5 começa com dois clientes na lista do piloto. |
| 5 | A recomendação do técnico (troca, contrato, calibração, qualificação) pode virar oportunidade no Comercial, com o "sim" do Comercial? | Define a etapa 7 e o campo novo no relato. | Sim, como "sugerida"; só vira oportunidade quando o Comercial aceitar. |
| 6 | A O.S. encerrada pode ser corrigida pela gestão com motivo (revisão 01, 02...), como os outros documentos do SGO+ desde 22/10, ou O.S. encerrada nunca muda? | Define se o controle de revisão entra na O.S. (acerto pequeno) ou se a correção é sempre uma O.S. nova. | Pode, só pela gestão, com motivo, gerando revisão nova e mantendo a anterior como substituída. |

Perguntas do projeto de 21/10 que continuam abertas e não bloqueiam este plano: número de técnicos, prazo do contrato com o Auvo, celulares da equipe (Android ou iPhone), técnico piloto, estoque de peças.

## Anexo A. Referências no código

SGO+ = `google-script-dev/apps-script-imports/portal_sgo_versao_cnpj_db`; Servidor = `sgo_servidor`; COMMAND = `metrolabs_command`. Conferido em 22/10/2026 (SGO+ até 1da5036, servidor até 96b3d27, COMMAND 0.39.3).

| Assunto | Arquivo:linha |
| --- | --- |
| Situações do chamado e transições | SGO+ SGO\_Assistencia\_Config.js:88-117; AstC\_mudar\_ em SGO\_Assistencia\_Chamados.js:25 |
| Prazos por prioridade e por contrato; em risco | SGO+ SGO\_Assistencia\_Config.js:135,166-171,774-789 |
| Abertura, reincidência, avisos AT01/AT02/AT08 | SGO+ SGO\_Assistencia\_Chamados.js:107-175 |
| Triagem, aguardar peça → Compras | SGO+ SGO\_Assistencia\_Chamados.js:247-290; SGO\_Compras\_Requisicoes.js:236 |
| Retomar (peça chegou, manual) | SGO+ SGO\_Assistencia\_Chamados.js:297 |
| Vendedor avisado ao encerrar (AT07) | SGO+ SGO\_Assistencia\_Chamados.js:343-347 |
| Solicitações do cliente, converter, descartar | SGO+ SGO\_Assistencia\_Chamados.js:416-459 |
| Pedido aprovado do Comercial vira chamado | SGO+ SGO\_Comercial\_Propostas.js:736-768; SGO\_Assistencia\_Chamados.js:473-488 |
| Reclamações (RC-) | SGO+ SGO\_Assistencia\_Chamados.js:499-542 |
| Agenda: conflitos, agendar, reagendar, veículo, atividade, rota | SGO+ SGO\_Assistencia\_Agenda.js:13-288; SGO\_Frota\_Reservas.js (FrotaRes\_livres\_, FrotaRes\_criar\_); SGO\_Atividades.js |
| Mesma O.S. reaproveitada ao agendar depois da peça | SGO+ SGO\_Assistencia\_Agenda.js:97-119; tests/assistencia.test.cjs:237-259 |
| Processador de eventos da O.S., faltas, série divergente, peça, encerramento | SGO+ SGO\_Assistencia\_OS.js:34-468 |
| API do aplicativo | SGO+ SGO\_Assistencia\_App.js:18-163; docs/API\_APP\_TECNICO.md |
| Aplicativo: telas, ações, QR, assinatura, fotos, fila | Servidor src/publico/campo/app.js:182,322-421,424-463,895-921,928-1061; fila.js:21,76-110,202-252; regras.js:100-193; src/servicos/campo.ts:34-92 |
| Relatório A4, fotos, assinatura, pasta, Arquivo de documentos, versões | SGO+ SGO\_Assistencia\_Relatorio.js:24-141; SGO\_Assistencia\_Config.js:889-920; SGO\_Assistencia\_Painel.js:141-144 |
| Orçamento do chamado | SGO+ SGO\_Assistencia\_Relatorio.js:161-302 |
| Indicadores e relatório mensal | SGO+ SGO\_Assistencia\_Relatorio.js:313-397; SGO\_Gestao\_Escada.js:343,404 |
| Enviar documento: canais, e-mail, Z-API, piloto | SGO+ SGO\_EnviarDoc.js:452-465,591-593,732; SGO\_Notificar.js:740-743 |
| Trava do piloto no servidor; webhook só no COMMAND; PDF; pasta do cliente | Servidor src/servicos/whatsappPiloto.ts:36-93; src/servidor.ts:255-293,369-385; src/servicos/pdf.ts:12-39; src/servicos/rotasDocumentos.ts:49-70 |
| Pendências e matriz AT01 a AT12 | SGO+ SGO\_Pendencias\_Assistencia.js:15-58; SGO\_Assistencia\_Painel.js:29; SGO\_Assistencia\_Config.js:813-839 |
| Portal do cliente | SGO+ SGO\_Assistencia\_Painel.js:376,523; JS\_Assistencia.html:971-993 |
| Transição do Auvo | SGO+ SGO\_Assistencia\_Painel.js:189-285 |
| Fonte única de atendimentos | SGO+ SGO\_Assistencia\_Fonte.js:51-87 |
| Interruptor "Assistência ligada" | SGO+ SGO\_Assistencia\_Config.js:165,522; SGO\_Assistencia\_App.js:24; SGO\_Assistencia\_Painel.js:505 |
| Gancho de oportunidade por vencimento (futuro) | SGO+ SGO\_Comercial\_Oportunidades.js:24-25 |
| COMMAND: situações, SLA, triagem, preparo, marcos, assinatura, encerramento, peça | COMMAND Assistencia.js:31-58,161-215,400-456,623-737,801-934 |
| COMMAND: Compras devolve o chamado | COMMAND Compras.js:906-952; Assistencia.js:400-418 |
| COMMAND: orçamento do chamado e aceite por link | COMMAND OrcChamado.js:19-139; Orcamentos.js:916-1275 |
| COMMAND: portal, atendente, casos, Enviar documento, matriz | COMMAND PortalCliente.js:1-30,355-549; Atendente.js:295-576; Casos.js:44-183; EnviarDoc.js:153-677; AvisosMatriz.js:1-21; Crm.js:333-341 |
| COMMAND: prazos do contrato por etapa (chegada não usada) | COMMAND Contratos.js:41,180-218; Assistencia.js:166-170 |
