# Portal do cliente — Etapa 4 (d), Avisos ao cliente por e-mail: relatório de implementação

**Data:** 18/11/2026. **Onde:** `output/financeiro-20261116/cand17` (cópia idêntica à produção cand16, conferida por comparação de pastas antes de começar). O trabalho também mexeu em `tests/` e `docs/`.
**Restrições respeitadas:** nada foi publicado nem commitado. Não houve acesso à produção, ao servidor nem ao banco. Nenhum e-mail real saiu: os testes, as capturas e as prévias usam o MailApp simulado do ambiente de teste. Ficaram intocados o Financeiro e o sigilo, o bloqueio da Frota e o rastreador, o chat do RH360, os documentos PGT/POP gerados e o cofre. Nenhum dado real foi inventado: os nomes, os e-mails e os contratos dos testes, das capturas e das prévias são fictícios. O servidor Node não mudou e nenhuma função nova é chamada pela tela do cliente: a tela continua usando só `PortalCliente_api`, que já está em `PCL_FUNCOES_CLIENTE`. Por isso `SGO_PortalCliente_Seguranca.js` não mudou.
**Especificação:** `ESPEC_PORTAL_CLIENTE.md`, "Etapa 4 (d)", itens 4.1.10, 4.7 e T4.1 a T4.8. O dono aceitou todas as recomendações (decisão 11: só e-mail; decisão 12: texto neutro no fim do contrato).

## 1. O que foi feito

### 1.1 Envio central dos avisos ao cliente

- **Uma regra só para todos os avisos ao cliente**, inclusive os que já existiam (PC01 e PC02 da etapa 2, PC09 da etapa 1). A função é `PCl_enviarCliente_`, em `SGO_PortalCliente_Config.js`.
- **Só e-mail, nunca WhatsApp.** O envio passa por `SGO_notificar_` com `contatos` e `canais: ['email']`.
- **Assunto "Metrolabs — <número>: ..."**, sem o prefixo "SGO+ | ". Foi criada a opção `paraCliente` em `SGO_notificar_`, que manda o assunto exatamente como o título, o remetente "Metrolabs", a marca "Metrolabs" no topo e o rodapé do cliente. **Os avisos à equipe não mudaram** (continuam com "SGO+ | " e o rodapé interno).
- **Um e-mail por pessoa**, com:
  - saudação pelo primeiro nome;
  - o texto do evento;
  - o rodapé "Você recebe este e-mail porque..." e, nos avisos opcionais, como desligar ("Minha conta" > "Avisos que você pode desligar");
  - o botão "Abrir no Portal do cliente", que exige login.
- **Junção de endereços:** o endereço repetido sai uma vez, sem diferença entre maiúsculas e minúsculas. Com chave, o mesmo aviso nunca sai duas vezes para o mesmo endereço (tabela nova `PCL_AVISOS_ENVIOS`).
- **Horário comercial do cliente:** 08:00 às 18:00, em dias úteis, com os feriados do expediente da empresa (`PCl_horarioCliente_`, sobre `SGO_dentroDoExpediente_`). Fora dele, o e-mail espera em `PCL_AVISOS_FILA` e sai na primeira rodada do próximo horário útil. Saem na hora: PC01, PC03 com visita no mesmo dia e PC09.

### 1.2 Eventos

| Código | Situação nesta etapa |
|---|---|
| PC01 | Já existia (pedido recebido). **Novo:** chamado registrado pela equipe (telefone, e-mail ou QR) para cliente com Portal vai aos gestores do cliente da unidade, na hora |
| PC02 | Já existia. **Agora também vai aos gestores do cliente da unidade**, como pede a tabela da espec |
| PC03 | **Novo:** visita agendada, reagendada, retorno agendado, peça recebida e visita cancelada pela Metrolabs. Vai a quem abriu e aos gestores da unidade, sem o motivo interno |
| PC04 | **Novo:** orçamento emitido. Vai só aos gestores da unidade (e aos da empresa que paga, se ela tiver Portal), sem valores |
| PC05 | **Novo:** atendimento concluído (e O.S. de logística concluída), com o relatório no Portal e o caminho do "O problema continua" |
| PC06 | **Novo:** resumo das mensagens da Metrolabs, no máximo um a cada 2 horas úteis por pessoa, sem o texto da mensagem e nunca com nota interna. Vai a quem abriu e a quem participa da conversa; sem nenhum dos dois, aos gestores da unidade |
| PC07 | **Novo:** resumo diário dos documentos novos, a partir das 08:30, para todas as pessoas com a unidade do documento |
| PC08 | **Novo:** resumo semanal (primeiro dia útil da semana, a partir das 08:30) dos vencimentos em 60, 30 e 7 dias e dos vencidos, só para os gestores da unidade. Cada faixa sai uma vez; o vencido, uma vez |
| PC09 | Já existia. Agora passa pelo envio central |
| PC10 | **Novo:** contrato termina em 30 dias, período de carência e modo consulta, aos gestores do cliente, com texto neutro |
| PI01 | **Já coberto pelo CT01** da régua de contratos (120, 90, 60, 30, 15, 7 e 0 dias, uma vez cada). Não foi duplicado; o teste T4.7 prova os marcos de 60, 30 e 15 dias |
| PI02, PI03, PI04 | Já existiam (etapas 1 e 2) |
| PI05 | **Novo:** pedido do Portal a 75% do prazo de resposta (à triagem) e vencido (à triagem e à gestão Técnica). Só e-mail, pela matriz, no expediente da equipe |

Os códigos PC03, PC04, PC05, PC06, PC07, PC08, PC10 e PI05 entraram na matriz de avisos.

### 1.3 Substituição dos avisos antigos da Assistência, sem duplicar

- **Como funciona:** `Ast_avisarCliente_` ganhou um último argumento opcional, `pc` (`{ cod, tipo, ... }`), passado nos pontos certos:
  - Agenda: visita agendada, reagendada e retorno;
  - Chamados: chamado aberto e peça recebida;
  - Relatório da O.S.: conclusão e logística.
- **Cliente com Portal na unidade:** há pelo menos uma pessoa ativa com o papel e a unidade certos, e o acesso não está suspenso nem sem acesso. O aviso vai para as pessoas do Portal, e o e-mail do cadastro **não** recebe esse aviso.
- **Caso contrário:** sem pessoa do Portal na unidade, acesso suspenso, sem acesso ou avisos pelo Portal desligados, segue tudo como antes, no e-mail do cadastro.
- **Pedido do Portal aceito:** o e-mail antigo "Recebemos o seu chamado", que antes também saía para o cadastro na conversão, deixa de sair. Fica só o PC02.
- **O que não mudou:**
  - chamado de representada;
  - avisos de ronda;
  - envio de relatório e de orçamento por "Enviar documento" (é um envio feito por uma pessoa, com PDF).
- **Visita cancelada (PC03):** sai quando a Metrolabs cancela um chamado com visita marcada. Quando o próprio cliente cancela pelo Portal, não sai (marca `peloCliente`).

### 1.4 Rotina

- **Quem chama:** `PortalCliente_rotinaAvisos_`, a partir de `PortalCliente_rotinaChamados_`, que já é chamada pela rotina da Assistência a cada 15 minutos. Não há cron novo.
- **Passos, cada um isolado:**
  1. PI05, em toda rodada;
  2. PC06, no horário comercial;
  3. PC10, uma vez por dia útil;
  4. PC07, uma vez por dia útil, a partir das 08:30;
  5. PC08, uma vez por semana, no primeiro dia útil, a partir das 08:30;
  6. a fila.
- **Início dos avisos:** a primeira rodada grava `avisosDesde` em Regras do portal. Mensagens, documentos e pedidos anteriores não geram aviso.
- **Primeira semana do PC08:** se a publicação cair fora do primeiro dia útil da semana, a primeira rodada só marca a semana, e o primeiro resumo sai no primeiro dia útil da semana seguinte.

### 1.5 Telas, ajuda e manual

**Minha conta > Meus dados**, tela do cliente, com a nova parte **"Avisos por e-mail"**:
- o endereço que recebe, o horário e a informação de que o e-mail nunca leva anexo nem valor;
- a lista do que é sempre enviado;
- os três avisos que podem ser desligados (PC06, PC07 e PC08), cada um com a explicação logo abaixo. O PC08 só aparece para o Gestor do cliente; os outros papéis leem uma linha que explica isso;
- em modo consulta, a nota de que os resumos de documentos e de vencimentos não saem.

**Regras do portal > "Avisos ao cliente por e-mail"**, tela da equipe (Administrador e Diretoria, com motivo e histórico):
- avisos pelo Portal ligados ou desligados;
- início e fim do horário comercial;
- hora dos resumos;
- intervalo do resumo das mensagens;
- cópia ao e-mail do cadastro (padrão "Sim" na transição);
- vencidos antigos no resumo semanal (padrão 30 dias antes do início dos avisos, de 0 a 365);
- a data de início dos avisos.

**Ajuda e manual:**
- **Dicas** (`PCL_DICAS`) para os 9 campos novos. Os guias "conta" e "regras" foram atualizados.
- **Ajuda das telas:**
  - Minha conta: passo novo, problema "não chegou o e-mail" e pergunta "por que o e-mail não traz o documento";
  - Contratos/Regras: passo e problema novos;
  - Conversas: o problema do e-mail foi atualizado.
- **Manual** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`:
  - seção 26 nova (26.1 a 26.9);
  - ajustes nas seções 11, 23.9, 24.8 e 25.8, porque o texto antigo dizia "SGO+ | " no assunto e "chega na etapa 4".
- **Base do assistente** regerada por `_tools/gerar_base_assistente.cjs --docs docs --saida .../cand17/SGO_AssistenteManuais.js`. Só as seções do Portal mudaram.

## 2. Lista exata de arquivos (relativos à cand17)

**Legado, novo (LF):** `SGO_PortalCliente_Avisos.js`.

**Legado, alterados (todos LF antes e depois; conferido byte a byte, sintaxe conferida):**
- `SGO_Notificar.js`: opção `paraCliente` (assunto sem prefixo, marca e rodapé do cliente).
- `SGO_PortalCliente_Config.js`: tabela `PCL_AVISOS_ENVIOS`, cache `PCL_ABAS_OK_V5`, regras dos avisos, `PCl_horarioCliente_`, `PCl_enviarCliente_` e `PCl_enviarFilaCliente_`.
- `SGO_PortalCliente_Chamados.js`: PC01 e PC02 pelo envio central, PC02 também aos gestores, o horário do cliente, a rotina chamando a dos avisos e `peloCliente` no cancelamento.
- `SGO_PortalCliente_Acessos.js`: PC09 pelo envio central e `avisosInfo` em Minha conta.
- `SGO_PortalCliente.js`: Regras do portal com os avisos (leitura e gravação por merge).
- `SGO_Assistencia_Config.js`: `Ast_avisarCliente_` com o argumento `pc`.
- `SGO_Assistencia_Agenda.js`: PC03 nos três agendamentos.
- `SGO_Assistencia_Chamados.js`: PC01 na abertura, PC03 na peça e PC03 cancelada.
- `SGO_Assistencia_Relatorio.js`: PC05 na conclusão e na logística e PC04 na emissão do orçamento.
- `JS_PortalCliente_Acessos.html`: a parte "Avisos por e-mail".
- `JS_PortalCliente.html`: a seção de avisos em Regras do portal.
- `JS_PortalCliente_Ajuda.html`: dicas e guias.
- `SGO_Ajuda_PortalCliente.js`.
- `SGO_AssistenteManuais.js` (regerado).

**Testes:** `tests/portal-cliente-etapa4-20261118.test.cjs` (novo, 13 testes). Nenhum teste existente foi alterado.
**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` (a cópia anterior está em `etapa4/antes/`).
**Entregas (`output/portal-cliente-20261116/etapa4/`):**
- `RELATORIO.md`, `legado-etapa4.patch` (git diff cand16 → cand17, 15 arquivos), `suite.txt` e `suite-execucao.log`;
- `capturas.cjs` e `capturas/`: 24 imagens e `conferencia.txt`;
- `modelos/`: 17 prévias HTML e `index.html`;
- `capturas-suite/`.

Uma observação sobre a pasta das capturas da suíte: rodei a suíte com `CAPTURAS=.../etapa4/capturas-suite`, como nas etapas 1 a 3, e não com `.../etapa4/capturas`, para não misturar nem sobrescrever as capturas reais desta etapa (inclusive o `conferencia.txt`).

## 3. Decisões adotadas e o que ficou configurável

| Assunto | Adotado | Onde mudar |
|---|---|---|
| Horário comercial do cliente | 08:00–18:00 em dias úteis (espec), separado do expediente da equipe (17:30). Feriados: os do expediente | Regras do portal |
| Hora dos resumos (PC07, PC08) | 08:30 | Regras do portal |
| Intervalo do PC06 | 120 minutos úteis por pessoa; o primeiro resumo depois de um período sem envio sai na rodada seguinte (até 15 min) | Regras do portal |
| Texto das mensagens no PC06 | **Não vai** no e-mail (regra "corpo sem valores"; a mensagem pode citar valores) | código |
| E-mail do cadastro de quem tem Portal | **Ajuste de transição do coordenador:** "Cópia ao e-mail do cadastro" **ligada por padrão** (vale quando a chave não está gravada). O e-mail da unidade continua recebendo os avisos de visita, peça e conclusão, no modelo novo, junto com as pessoas do Portal; o mesmo endereço recebe uma vez e o e-mail antigo não sai junto. Motivo: as contas atuais são antigas (sem papel, valem como Gestor) e não se sabe se os e-mails delas são de pessoas reais | Regras do portal (a Diretoria troca para "Não" depois de revisar as contas) |
| Vencidos antigos no PC08 | **Ajuste de transição do coordenador:** o vencido só entra no resumo semanal se venceu a partir de **30 dias antes do início dos avisos** (`avisosDesde`). Os mais antigos nunca vão no e-mail e continuam no Portal (Vencimentos e cronograma) | Regras do portal, "Vencidos antigos no resumo semanal" (de 0 a 365) |
| Interruptor geral | "Avisos pelo Portal" ligado. Desligado: a Assistência volta ao cadastro e os resumos param (PC01, PC02 e PC09 continuam) | Regras do portal |
| PC02 aos gestores | Sim (tabela da espec) | código |
| PC04 | Na emissão do orçamento (quando ele aparece no Portal como "Aguardando sua aprovação"), além do envio manual com PDF que a equipe já faz | código |
| PC10 | Não sai na vigência provisória nem na transição (o Comercial cuida pelo CT04); sem o aviso de 30 dias para contrato de licitação (Licitações avisa); o contato do contrato que recebe o CT03 não recebe o PC10 de 30 dias | código |
| PI01 | É o CT01 da régua (já existente) | Regras do portal > régua |
| Primeira semana do PC08 | Só marca, se a publicação não cair no primeiro dia útil | código |
| Avisos anteriores à publicação | Não saem (`avisosDesde`) | automático |

**Dado real que não existe:** nenhum dado novo é exigido nesta etapa. Continuam pendentes do dono, das etapas anteriores, o contato do encarregado de dados (LGPD) e o telefone de plantão. O "contato comercial" citado no PC10 é o de Regras do portal: hoje o texto padrão é "o Comercial da Metrolabs". Vale preencher com nome, telefone ou e-mail reais antes de publicar.

## 4. O que ficou de fora, e por quê

- **Avisos de ronda** (agendada e concluída): não estão na tabela de eventos da espec, então continuam no e-mail do cadastro.
- **Chamado resolvido a distância:** não gera PC05, porque não há relatório e antes também não havia aviso.
- **Link direto para o chamado no e-mail:** o botão abre o Portal (com login), como nas etapas 1 e 2. Não existe hoje um endereço que abra a ficha diretamente.
- **Tela da equipe com a lista dos avisos enviados:** os envios ficam em `NTF_ENVIOS` (tela de envios) e em `PCL_AVISOS_ENVIOS`. A visão por cliente é da etapa 5 (uso do portal, "avisos que voltaram").
- **Documento registrado com data de emissão de mais de 7 dias atrás:** não entra no PC07. A janela é de 7 dias para trás, para não repetir o passado. Ele continua aparecendo no Portal.
- **PC08 por documento sem equipamento:** sai como "Documento da unidade".

## 5. Riscos a conferir antes de publicar — o que passa a sair no primeiro dia, e para quem

1. **Avisos da Assistência para quem tem Portal (o maior efeito).** Com a vigência provisória até 31/12/2026, praticamente todo cliente com conta de cliente ativa está com acesso completo. Pelo coordenador, hoje são 3 contas, todas antigas. A partir da publicação, os avisos de chamado registrado, visita agendada ou reagendada, retorno, peça recebida e conclusão vão:
   - **às pessoas do Portal** (as contas antigas sem papel valem como Gestor do cliente com todas as unidades e recebem tudo);
   - **e também ao e-mail do cadastro da unidade**, porque "Cópia ao e-mail do cadastro" nasce ligada.

   Ninguém deixa de receber o que recebe hoje. O que muda:
   - o e-mail da unidade passa a receber o **modelo novo** (assunto "Metrolabs — ...", botão do Portal, rodapé "este é o e-mail de contato da sua empresa cadastrado na Metrolabs") **no lugar** do modelo antigo, nunca os dois;
   - se o endereço da unidade for igual ao de uma conta, sai uma vez.

   Quem lê o e-mail da unidade e não tem login vê o botão do Portal, mas não entra. Depois de revisar as contas, a Diretoria pode trocar para "Não", com motivo.
2. **Mais destinatários em eventos que já existiam:** o PC02 (aceite, complemento e recusa) passa a ir também aos gestores do cliente da unidade. Todos os e-mails ao cliente (PC01, PC02 e PC09 inclusive) mudam de assunto ("Metrolabs — ...", sem "SGO+ | ") e de remetente ("Metrolabs").
3. **PC08, primeiro resumo semanal:** no primeiro dia útil da semana seguinte à publicação, às 08:30, **cada Gestor de cliente com Portal** recebe a lista dos equipamentos das unidades dele que vencem em até 60 dias. Os **vencidos entram só se venceram a partir de 30 dias antes do início dos avisos**. Os mais antigos nunca vão no e-mail e continuam visíveis no Portal. O limite é configurável de 0 a 365 dias. A lista é cortada em 40 linhas, com "e mais N". O texto é neutro.
4. **PC10 no primeiro dia útil:** clientes com **contrato real cadastrado** que vence em até 30 dias, que está em carência ou em modo consulta (fora da transição) recebem o aviso uma vez. A vigência provisória e as contas antigas em transição não recebem.
5. **PC04 a mais:** o Gestor do cliente com Portal recebe "orçamento para aprovação" na emissão, além do e-mail com PDF e link que a equipe manda por "Enviar documento". Combine com o Comercial se os dois devem continuar.
6. **Horário:** os e-mails PC01 e PC02 passam a considerar 18:00 como fim do horário (antes, 17:30 da equipe). Avisos entre 17:30 e 18:00 agora saem na hora.
7. **Volume e desempenho:** o PC07 lê o índice de documentos uma vez por pessoa por dia (como a tela "Documentos técnicos"). Confira o tempo da rotina com o volume real.
8. **Conferir no uso real:**
   - um e-mail de cada tipo numa caixa de e-mail real (Gmail e Outlook), para ver o HTML (as prévias estão em `modelos/`);
   - o envio pela fila do servidor (`emails_saida`) com o remetente "Metrolabs";
   - a tela "Minha conta" no celular de um cliente.

## 6. Testes e placar

**Teste novo** `tests/portal-cliente-etapa4-20261118.test.cjs` (13 testes, todos aprovados, código de saída 0):

- **T4.1** (pessoas certas por papel e unidade): PC02, PC03, PC01 da equipe, PC04, PC05, PC03 cancelada e o cancelamento pelo cliente, que não volta para ele.
- **T4.2** (junção de endereços): no mesmo envio, entre caminhos, na repetição da mesma chave e com a cópia ao cadastro.
- **T4.3** (preferências): desligar bloqueia só PC06, PC07 e PC08. Também prova o resumo PC06 a cada 2 horas úteis, sem texto e sem nota interna.
- **T4.4** (horário comercial): fila fora do horário; PC01, PC09 e PC03 no mesmo dia saem na hora; a fila sai uma vez às 08:05; 18:00, sábado e feriado; regras configuráveis com validação e histórico.
- **T4.5** (conteúdo): nenhum e-mail leva anexo, valor, dado interno, nome de outro cliente nem o prefixo "SGO+ | ".
- **T4.6** (cliente sem portal): recebe AT08 e AT15 no cadastro. Com portal, nada vai ao cadastro. Unidade sem pessoa do Portal, acesso suspenso e avisos desligados voltam ao cadastro.
- **T4.7** (PI01 e PC10): PI01 (CT01) em 60, 30 e 15 dias, uma vez cada; PC10 nos 30 dias, na carência e no modo consulta, uma vez cada, neutro; nada na vigência provisória.
- **PI05:** aviso a 75% e no vencido, uma vez cada, só para a equipe.
- **PC07 e PC08:**
  - por unidade, cada documento e cada faixa uma vez;
  - feriado de segunda passa o resumo para terça;
  - publicação no meio da semana: o primeiro resumo sai na segunda seguinte;
  - em modo consulta, não sai.
- **T4.8** (régua de tom, `PCl_reguaTom_`): todos os e-mails ao cliente passam, e textos ruins são pegos.
- **Tela, ajuda e manual.**
- **Prévia de cada modelo:** grava `modelos/` com `PCL_MODELOS_DIR`.
- **Ajustes de transição:**
  - sem a chave gravada, a cópia ao cadastro vale: o e-mail da unidade recebe a visita no modelo novo, sem o modelo antigo junto;
  - o endereço igual ao de uma pessoa sai uma vez;
  - a Diretoria desliga com motivo e o cadastro deixa de receber;
  - o PC08 leva o vencido de exatamente 30 dias antes do início e não leva o de 200 dias, que continua no Portal;
  - 400 dias é recusado com o campo; com 365, o antigo entra.

As cenas T4.1 a T4.8 rodam com a cópia desligada explicitamente, para olhar só as pessoas do Portal.

**Antes da suíte:** etapas 0 a 3 do Portal, contratos, matriz de avisos, acesso do cliente, Assistência (geral, compras-retorno, logística, orçamento, aceite, ronda, triagem) e Representação (fluxo e modelos de avisos). Todos com 0 falhas.

**Capturas reais** (Index.html com os includes da cand17 e o servidor simulado), a 1366, 390 e 320 px, em `etapa4/capturas/`. Cada uma tem a página inteira e o recorte da parte nova:
- Meus dados do Gestor do cliente, do Solicitante e de uma conta em modo consulta;
- Regras do portal com os avisos.

Resultado: **sem rolagem lateral e sem erro de JavaScript** (`capturas/conferencia.txt`).

**Prévias dos e-mails** (`etapa4/modelos/`, abrir `index.html`): PC01 (pedido recebido e chamado registrado), PC02 (complemento e aceite), PC03 (agendada, reagendada, peça, retorno e cancelada), PC04, PC05, PC06, PC07, PC08, PC09 e PC10 (30 dias e carência).

**Suíte completa** (`etapa4/suite.txt`): o placar está na seção 7.

## 7. Placar da suíte completa

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência (etapa 3, produção cand16) | 258 | 2472 | 0 |
| Rodada antes dos ajustes de transição (cand17) | 259 | 2484 | 0 |
| **Rodada final, com os ajustes de transição (cand17)** | **259** | **2485** | **0** |

Nenhum arquivo terminou com código de saída diferente de zero (`arquivos_com_saida_nao_zero=0`; o log termina com o código de saída 0). A diferença em relação à referência é o teste novo: 1 arquivo e 13 testes aprovados a mais (o 13º cobre os dois ajustes de transição pedidos pelo coordenador: cópia ao cadastro ligada por padrão e o corte dos vencidos antigos no PC08). Antes da suíte final rodei a lista dirigida (etapas 0 a 4 do Portal, contratos, matriz, acesso do cliente, Assistência, Representação, avisos da gestão e das atividades): 0 falhas. Uma primeira rodada foi interrompida de propósito, logo no começo, para incluir a regra da primeira semana do PC08. A rodada registrada aqui é a completa, já com essa regra.
