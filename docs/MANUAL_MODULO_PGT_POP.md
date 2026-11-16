# Manual do Operador — Módulo PGT e POP (Engenharia Clínica)

## Geração pelas fichas técnicas (14/11/2026)

A geração do PGT e dos POPs foi refeita. Cada documento segue agora uma **ficha técnica** revisada por especialista em engenharia clínica. A ficha define as seções na ordem, o conteúdo mínimo, os passos, as responsabilidades, os registros, os indicadores e a **lista fechada de normas vigentes** que o documento pode citar. Como fatos do cliente, a IA usa só as respostas às perguntas da tela. O que não foi respondido sai como "a definir pelo estabelecimento".

- **Perguntas ao estabelecimento.** São três caixas novas e as perguntas dos POPs:
  - **Caixa 1.5 "Dados do estabelecimento".** Vale para todos os documentos. Tem três grupos recolhíveis, cada um com o contador do que falta:
    - engenharia clínica e responsável pelo plano;
    - setores, natureza jurídica e estruturas;
    - situação de implantação de cada etapa.
  - **Caixa 1.6 "Recursos do estabelecimento".** Pergunta, com sim ou não, se o cliente tem gerador, cilindros, central de gases, CME, radiologia, fonte radioativa, Rede Sentinela e área própria de guarda.
  - **Caixa 2.1 "Dados do estabelecimento para o PGT".** O roteiro passou a ser a 2.2 e as imagens, a 2.3.
  - **Perguntas de cada POP.** Aparecem dentro do cartão do POP marcado, em "Dados do estabelecimento para este POP".
  - **Caixa 3.3.** Reúne as perguntas usadas por mais de um POP marcado.

  Cada pergunta aparece uma vez só e diz se é obrigatória e por que é feita. As perguntas de frequência mostram a referência da ficha, que nunca é preenchida pelo sistema.
- **Dado obrigatório faltando.** O documento não é gerado e nada é gravado. Na etapa 4, a faixa vermelha "Faltam dados obrigatórios do estabelecimento" lista primeiro as perguntas que valem para todos e depois as de cada documento, com a caixa de cada uma. Os botões "Ir para a etapa" levam até elas, marcadas em vermelho e com o cursor na primeira. Os outros documentos da rodada saem normalmente. O servidor confere de novo e recusa com a mesma explicação (o quê, por quê e o que fazer). Nunca invente uma resposta: pergunte ao cliente.
- **Dado opcional faltando.** O documento sai, e a pendência aparece em "Pontos para conferir".
- **POPs que dependem de recurso.** Três POPs só são gerados quando a caixa 1.6 diz que o cliente tem o recurso:
  - POP023, grupo gerador;
  - POP024, cilindros de gases medicinais;
  - POP026, área própria de guarda.

  Com "Não", o POP fica indisponível na etapa 3, com a explicação no cartão. Sem área própria, as regras de organização e higiene das áreas entram no POP010. Sem resposta, o cartão avisa que a resposta é necessária.
- **Normas.** Cada documento cita só as normas vigentes da sua ficha. A seção "Referências normativas" é montada pelo sistema, e não pela IA. Algumas normas só entram quando a resposta do cliente diz que elas valem:
  - RDC 611/2022, com radiologia ou fonte radioativa;
  - RDC 15/2012, com CME;
  - RDC 872/2024, na Rede Sentinela;
  - Lei 14.133/2021, para o público da administração direta, autarquia ou fundação.

  A LGPD entra nos POPs em que a ficha a indica.
- **PGT.** O PGT cobre só equipamentos de saúde, e a capa e o escopo dizem isso. Ele continua em 6 partes, agora pelas seções da ficha:
  1. escopo, finalidade e base legal;
  2. organização, infraestrutura, pessoas e documentação;
  3. etapas do planejamento ao registro histórico;
  4. etapas do treinamento ao descarte;
  5. risco, indicadores e utilidades críticas, só se o cliente tiver gerador ou gases;
  6. implantação.

  O sistema monta três seções: os "Termos e definições" (glossário fixo de 60 termos), os "Documentos relacionados" (tabela com código, título e situação) e as "Referências normativas". Saíram do PGT a equipe mínima e as metragens de áreas do PGT original, que não têm base normativa verificada.
- **Pontos para conferir novos.** O selo "Conferir" continua sem bloquear a gravação. Os pontos novos são:
  - "Falta: ..." para um item da ficha que não apareceu no texto;
  - norma fora da lista do documento ou edição substituída;
  - prazo, meta, frequência ou quantidade que o cliente não informou;
  - setor que o cliente não informou;
  - "Pendência" para um dado opcional sem resposta;
  - seção que o sistema monta e que a IA escreveu (ela é retirada).
- **Nomes do catálogo.** Os 28 POPs receberam os nomes recomendados pelas fichas; os códigos não mudaram. Por exemplo, "Ronda Interna" passou a "Ronda Técnica nos Setores (Inspeção de Rotina)". A busca "Documentos emitidos" acha os documentos antigos pelo título gravado e pelo nome anterior do catálogo.
- **Correção.** "Abrir para corrigir" e "Usar como base" trazem de volta as respostas do estabelecimento. Um documento emitido antes desta mudança volta sem respostas, e a geração pede os dados obrigatórios.

## Documentos suspensos (14/11/2026)

Todos os PGTs e POPs emitidos antes da revisão técnica completa do módulo estão **suspensos** e serão refeitos. A Diretoria decidiu isso em 14/11/2026, depois da auditoria que encontrou erros no texto desses documentos.

- Na busca "Documentos emitidos" e na consulta da etapa 1, esses documentos aparecem com o selo vermelho **Suspenso** e a explicação.
- Não use nem envie esses arquivos. O botão "Enviar" não aparece, e o envio pelo sistema é recusado com o motivo. O PDF abre só como "Ver PDF (consulta interna)".
- O PGT novo não cita documento suspenso como existente.
- Para entregar ao cliente, gere o documento de novo quando a geração revisada estiver liberada. "Abrir para corrigir" carrega os dados do documento para isso. Os documentos gerados a partir da liberação saem sem o selo.

## Busca de documentos, motivo da revisão e documentos conferidos (14/11/2026)

- **Documentos emitidos.** A lista solta no fim da tela virou uma busca. Nada é listado até você pesquisar: digite o CNPJ (com ou sem pontos), parte do nome do cliente, o código (POP013, PGTS) ou parte do título e toque em "Buscar". Na busca por nome ou título, acentos e maiúsculas não fazem diferença. Os documentos aparecem agrupados por cliente, um por código, na revisão vigente; as anteriores ficam em "Revisões anteriores (N)". Cada documento tem "Abrir PDF" e "Mais ações", com um único "Enviar", "Abrir para imprimir", "Abrir para corrigir" e "Usar como base". A busca mostra o que foi emitido a partir de 26/10/2026; os anteriores ficam na pasta do cliente.
- **Ver documentos deste cliente.** Na etapa 1, depois de "Buscar no cadastro público" ou de "Consultar documentos já gerados", o botão leva à busca com o CNPJ digitado. A consulta deixou de listar os PDFs soltos da pasta (que incluíam revisões substituídas): ela diz quantos documentos vigentes o CNPJ tem e oferece "Abrir a pasta do cliente".
- **Motivo da revisão.** Na etapa 4, a caixa "4.2 Revisões desta rodada" mostra quais documentos já existem para o CNPJ e com que número saem ("Rev. 2.0 → sai a Rev. 3.0"). Havendo revisão, o "Motivo desta revisão" é obrigatório: um por rodada, com ao menos 10 caracteres, gravado no controle de revisões de cada documento revisado. O servidor também recusa a revisão sem motivo.
- **Cargos.** O cargo de quem aprova e o cargo de quem elaborou são obrigatórios e começam vazios (não há mais o cargo padrão "Gestor de Engenharia Clínica"). O registro profissional é recomendado: sem ele, a etapa 4 avisa que a assinatura sai sem o número do conselho.
- **Título do POP.** O título de cada POP é o nome do catálogo (no avulso, o nome digitado). A IA redige o conteúdo, não o título.
- **Texto conferido pelo sistema.** Depois da IA, o sistema retira do texto o que não pode sair no documento: rótulos do pedido feito à IA, menções à forma de elaboração ("especialista sênior", "roteiro fornecido"), seções de histórico ou controle de revisões escritas pela IA e lacunas como "[Inserir Data]". O que merece atenção vira o selo "Conferir" na etapa 5, com a lista "Pontos para conferir": norma fora da base informada, campo que ficou para preencher, nome de sistema ou marca, texto que parece cortado. O documento já está gravado; se precisar mudar algo, use "Abrir para corrigir".
- **Correção travada.** Em "Abrir para corrigir", o CNPJ e o código ficam travados e só o documento aberto entra na fila. "Usar como base" no mesmo CNPJ e com o mesmo código sai como a revisão seguinte e pede o motivo. O POP avulso recebe um código próprio (AV-...) na primeira emissão, e a correção dele sai como revisão seguinte desse código.
- **Salvar na pasta do cliente.** O arquivo salvo pelo botão leva o título do POP no nome e passa a aparecer com "Abrir PDF" na busca.
- Os documentos já emitidos não foram alterados nem gerados de novo; as correções valem para o que for gerado daqui em diante. Ao reabrir ou reimprimir um documento antigo, só os asteriscos de formatação que tenham ficado no texto deixam de aparecer.

## Tela nova (13/11/2026)

A tela foi refeita no padrão do Comercial: "Guia do PGT e POP" no alto, trilha de 5 etapas tocável ("Cliente e assinaturas", "PGT", "POPs", "Conferir e gerar", "Documentos"), caixas numeradas com "Como preencher" em cada campo, catálogo em grupos com busca, conferência e fila de geração na etapa 4 e selos de situação em cada documento da etapa 5. Os documentos gerados, a IA e a gravação não mudaram.

## O que mudou em 18/10/2026 (documento A4)

- O PGT sai com capa, sumário com os números de página, seções numeradas (os requisitos gerais e específicos viram subseções 7.1, 8.1...), glossário com o termo em negrito e as quatro assinaturas juntas na página final ("Aprovação").
- O POP sai com título, ficha (código, revisão e data), histórico de revisões (Tabela 1), seções numeradas, passos numerados em lista e as assinaturas. O sumário só aparece quando o POP passa de 3 páginas.
- Cada documento gerado já fica na pasta do cliente (CNPJ) em PDF e em cópia A4 (HTML) com o nome "POP - POP005 rev 1.0 - Etiquetagem de Equipamentos - aaaa-mm-dd hhmm" (no PGT: "PGT - PGTS rev 1.0 - <instituição> - ..."). O botão "Salvar na pasta do cliente" não cria mais um segundo PDF com o mesmo nome: se o documento já estava salvo, mostra o arquivo que já existe.

## O que mudou até 17/10/2026

- O manual em vigor é o que abre dentro do SGO+: botão "Manual do operador" da tela e botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta e pode estar desatualizado nos detalhes abaixo.
- Os documentos são salvos na pasta do cliente no SGO+ (não mais "no Drive"). O antigo "Console Operacional" agora se chama "Detalhes técnicos da operação" (ou "Histórico da operação"); quando algo falha, a mensagem aparece também numa faixa vermelha no topo da tela.
- Nome, cargo e registro de quem elaborou ficam na etapa 1. "Avançar" confere razão social, responsável técnico e "Elaborado por".
- Cada documento é redigido pela IA como por um especialista sênior no assunto dele: o POP pelo tema do POP; o PGT, parte por parte, pelo tema das seções daquela parte. As regras continuam: nada de dado do hospital que não foi informado, nada de norma fora da base normativa, nada de marca ou fabricante.
- Se a IA devolver um texto incompleto ou fora do formato, o sistema tenta de novo (até 3 vezes) e depois passa ao modelo reserva, antes de dizer que não gerou.
- Sem IA, o PGT e os POPs sem roteiro não são gerados (nada é gravado e a revisão continua a mesma). O POP com roteiro sai com texto padrão.


### Geração de Plano de Gerenciamento de Tecnologias em Saúde e Procedimentos Operacionais Padrão

---

## Como usar este manual

Este manual foi escrito para quem **nunca usou o sistema**. Leia na ordem, de cima para baixo, seguindo a tela também de cima para baixo. Se aparecer uma palavra técnica desconhecida, vá direto ao **Glossário** (seção 10).

---

## 1. O que este sistema faz, em uma frase

Você preenche os dados de um hospital e o sistema gera, com ajuda de Inteligência Artificial, o **PGT** (Plano de Gerenciamento de Tecnologias em Saúde) inteiro e os **POPs** (Procedimentos Operacionais Padrão) escolhidos — todos personalizados pra aquele hospital, seguindo a RDC nº 509/2021 (ANVISA) e a ABNT NBR 15.943:2011.

> **PGT é um documento grande e denso** — é gerado em 6 blocos de Inteligência Artificial (não 1 chamada só), o que deixa o texto bem mais completo, mas também demora — pode levar alguns minutos. É normal a tela mostrar "gerando..." por um tempo.

---

## 2. Etapa 1 — Cliente e assinaturas

| Caixa e campo | O que fazer |
|---|---|
| **1.1 CNPJ** | Digite o CNPJ da unidade onde estão os equipamentos e toque em "Buscar no cadastro público". A razão social e o endereço são preenchidos e ficam com fundo amarelo claro até você conferir e editar. Se a busca trocar um valor que você já tinha digitado, a faixa verde diz quais campos mudaram. |
| **1.1 Consultar documentos já gerados** | Diz quantos documentos vigentes o CNPJ tem (PGT e POPs), com "Ver documentos deste cliente" e "Abrir a pasta do cliente". Com a razão social em branco, preenche os dados do cliente pelo documento registrado mais recente, e a faixa azul diz quais campos e de qual data vieram. |
| **1.2 Dados do cliente** | Razão social (obrigatória), endereço, porte e tipo, número de leitos. |
| **1.3 Quem aprova pelo cliente** | Nome e cargo de quem assina como "Aprovado por", os dois obrigatórios. Escreva o cargo como a pessoa assina. |
| **1.4 Quem elaborou** | Nome e cargo (obrigatórios) e registro (recomendado) de quem assina como "Elaborado por". O cargo começa vazio. Os 3 campos são sempre da mesma pessoa. "Revisado por" é fixo. |

Toque em **"Avançar para o PGT"**. Se faltar a razão social, o nome ou o cargo de quem aprova, ou o nome ou o cargo de quem elaborou, os campos ficam em vermelho, a faixa acima do botão diz o que falta e o primeiro campo recebe o cursor. Cada campo tem o seu "Como preencher" (toque no i).

---

## 3. Etapa 2 — PGT

| Caixa | O que fazer |
|---|---|
| **Como o PGT é montado** | Toque para ver as 6 partes do plano. Só leitura. |
| **2.1 Roteiro do PGT (opcional)** | Fatos do cliente em frases curtas. Os trechos prontos entram no fim do texto, sem apagar o que já está escrito. Em branco, a IA monta a estrutura padrão. |
| **2.2 Imagens do PGT (opcional)** | "Escolher imagens", legenda de cada uma, "Remover" para tirar. A IA escreve uma interpretação técnica de cada imagem. |

---

## 4. Etapa 3 — POPs

O catálogo está em 8 grupos por assunto, com uma explicação de uma linha em cada POP. Toque na linha do POP para marcar: abre o roteiro e as imagens daquele POP. "Procurar no catálogo" acha pelo nome ou código; "Abrir todos os grupos" mostra tudo; "Desmarcar todos" pede confirmação na tela e guarda os roteiros e imagens digitados. O título de cada POP é o nome do catálogo. Para um procedimento fora do catálogo, digite o nome em "POP fora do catálogo (avulso)" e toque em **"Adicionar POP avulso"**: o nome digitado é o título, e o avulso recebe um código próprio (AV-...) na primeira emissão, como revisão 1.0. Toque em **"Conferir e gerar"**.

---

## 5. Etapa 4 — Conferir e gerar

A caixa "4.1 Conferência" mostra cliente, assinaturas, PGT e POPs; "Alterar" leva à etapa certa. Sem registro profissional, o cartão das assinaturas fica laranja, sem impedir a geração.

A caixa "4.2 Revisões desta rodada" confere pelo CNPJ quais documentos já existem e com que número saem. Se algum sair como revisão, escreva o **"Motivo desta revisão"** (obrigatório, ao menos 10 caracteres, um para a rodada). Escreva o que mudou, não "revisão de conteúdo"; se cada documento mudou por um motivo diferente, gere em rodadas separadas. Sem CNPJ, ou se a conferência falhar, o motivo também é pedido.

Na caixa "4.3 Gerar", toque em **"Gerar tudo"**: primeiro o PGT (6 partes, pode levar alguns minutos), depois cada POP, um por vez. A "Fila de geração" mostra cada documento: "Na fila", "Gerando…", "Gerado · rev. N.0", "Gerado · conferir", "Gerado · revisar" ou "Não gerado" (com o motivo e o que fazer). Um documento que falha não para os outros. Mantenha a aba aberta. No fim a tela vai sozinha para a etapa 5 ("Ver os documentos" leva antes).

---

## 6. Etapa 5 — Documentos

| Selo ou botão | O que significa |
|---|---|
| **Salvo na pasta** | Está na pasta do cliente. "Abrir" mostra o documento; "PDF salvo" abre o PDF. |
| **Conferir** | Gravado, mas com pontos para conferir (lista no cartão). Abra e confira; se precisar mudar algo, "Abrir para corrigir" gera a revisão seguinte, com o motivo. |
| **Revisar texto** | O POP saiu com o texto padrão montado do roteiro, sem a IA. Revise antes de enviar. |
| **Falta salvar na pasta** | Toque em "Abrir" e depois em "Salvar na pasta do cliente". |
| **Não gerado** | A faixa vermelha diz o motivo e o que fazer ("Escrever o roteiro" no POP; "Voltar ao PGT" no PGT). |
| **Atualizar lista** | Lista de controle do cliente: código, título, revisão e data (no celular, em cartões). |

"Começar outro cliente" volta à etapa 1 sem apagar nada. O "Histórico da operação", no fim da tela, guarda cada pedido ao servidor com a hora. Logo abaixo fica a busca **"Documentos emitidos"** (ver o início deste manual).

---

## 7. Passo a passo completo

1. Etapa 1: CNPJ, "Buscar no cadastro público", "Consultar documentos já gerados", porte, leitos, quem aprova e quem elaborou. "Avançar para o PGT".
2. Etapa 2: roteiro e imagens do PGT (opcionais). "Avançar para os POPs".
3. Etapa 3: marcar os POPs, roteiros, avulsos. "Conferir e gerar".
4. Etapa 4: conferir, escrever o motivo se algum documento sair como revisão e "Gerar tudo"; acompanhar a fila.
5. Etapa 5: abrir e conferir cada documento; resolver "Conferir", "Revisar texto", "Falta salvar na pasta" e "Não gerado".

---

## 8. Erros comuns e o que fazer

| O que aconteceu | O que fazer |
|---|---|
| "Avançar para o PGT" não passa da etapa 1 | Preencha razão social, nome e cargo de quem aprova e nome e cargo de quem elaborou (campos em vermelho). |
| "Falta o motivo desta revisão" | Algum documento já existe para este CNPJ e sai como revisão. Escreva o que mudou na caixa 4.2 e toque de novo em "Gerar tudo". |
| Selo "Conferir" na etapa 5 | O documento está gravado. Leia os pontos, abra e confira; se precisar, "Abrir para corrigir". |
| A busca não trouxe os dados do cliente | Confira o CNPJ e busque de novo, ou preencha à mão. |
| POP "Não gerado" | Escreva o roteiro do POP e gere de novo: com roteiro ele sai mesmo sem a IA. |
| PGT "Não gerado" | Nada foi gravado. Gere de novo mais tarde; se repetir, peça ao administrador para conferir a chave em "Chaves e senhas". |
| "O servidor não respondeu a este documento" | Recarregue (F5) e confira a lista de controle antes de gerar de novo. |
| O catálogo de POPs não carregou | Recarregue a página (F5). Enquanto isso, o POP avulso continua disponível. |
| A nova aba não abriu | Libere pop-ups para o SGO+ e toque de novo em "Abrir". |

---

## 9. Glossário

| Termo | Explicação simples |
|---|---|
| **PGT** | Plano de Gerenciamento de Tecnologias em Saúde — documento amplo, exigido por norma, sobre a gestão dos equipamentos do hospital |
| **POP** | Procedimento Operacional Padrão — instrução passo a passo de como um processo deve ser feito |
| **RDC nº 509/2021** | Norma da ANVISA que embasa a exigência do PGT |
| **POP avulso** | Um POP personalizado, criado na hora, fora da lista padrão; recebe um código próprio (AV-...) na primeira emissão |

---

*Este manual descreve o módulo PGT e POP tal como implementado em 2026-08-20.*

## Enviar o documento ao cliente (20/10/2026)

Depois de gerar, a barra "Documento salvo" mostra o botão "Enviar ao cliente"; os links do PDF salvo na tela ganham o botão "Enviar". A janela "Enviar documento" sugere os contatos do cliente do documento (descoberto pela pasta em que o PDF foi gravado), envia por e-mail e/ou WhatsApp com o PDF anexado, mostra a pré-visualização antes de confirmar e registra cada envio no histórico do documento e do cliente. Detalhes, regras e o que fazer em caso de falha: [MANUAL_ENVIAR_DOCUMENTO.md](MANUAL_ENVIAR_DOCUMENTO.md).

## Corrigir um documento gerado e usar como base (21/10/2026)

Depois de gerado, o documento pode ser corrigido sem refazer nada: o sistema guarda, junto de cada documento, tudo o que foi usado para gerá-lo (dados digitados, equipamento, textos revisados, anexos, leituras e arquivos importados).

**Onde fica (desde 14/11/2026):** no fim da tela do módulo, busca "Documentos emitidos". Pesquise o documento e toque em "Mais ações" para "Abrir para corrigir" ou "Usar como base". Neste módulo a revisão aparece como no documento (Rev. 1.0, 2.0...). O texto abaixo, de 21/10/2026, vale para o fluxo da correção; onde ele fala do quadro "Documentos gerados", leia "Documentos emitidos".

**Corrigir (nova revisão do mesmo número):**

1. Na linha do documento, toque em "Abrir para corrigir". O formulário volta preenchido com tudo o que foi usado, sem importar nada de novo. Anexos que não voltam para o campo de arquivo (certificados, fotos) continuam valendo pelos dados guardados; o quadro do alto diz quantos são. Só escolha arquivo se quiser trocar.
2. No quadro amarelo "Correção do documento", no alto do formulário, escreva o motivo da revisão (obrigatório, ao menos 10 caracteres). O campo do número fica travado: a correção mantém o número.
3. Altere o que precisa e toque em "Gerar tudo". Este gerador não tem etapa de aprovação: sai na hora a revisão seguinte (Rev. 01, 02...) com o mesmo número.
4. O documento novo traz o quadro "Histórico de revisões" (revisão, data, motivo e responsável) e a revisão no cabeçalho e no nome do arquivo.
5. A revisão anterior nunca é apagada nem sobrescrita: continua na pasta do cliente, com a revisão no nome do arquivo, ganha a anotação "Substituído pela Rev. NN" na descrição do arquivo e aparece na lista como substituída.
6. Para desistir, toque em "Cancelar a correção e limpar o formulário".

**Usar como base (documento novo, número novo):** na mesma lista, toque em "Usar como base" (por exemplo, o mesmo equipamento no ano seguinte). O formulário volta preenchido; confira datas, leituras e resultados, que são do serviço anterior, e toque em "Gerar tudo". Sai um documento novo, Rev. 00, com número novo; o documento de origem não muda.

**Documentos gerados antes de 21/10/2026:** não guardaram os dados do formulário e não entram na lista para corrigir. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo.

Neste módulo o número do documento é o código (PGTS para o PGT, o código do POP no catálogo, AV-... no avulso) no hospital: gerar de novo o mesmo código para o mesmo hospital já sai como a revisão seguinte, com a tabela "Controle de revisões" no próprio documento e o motivo pedido na etapa 4. Pelo "Abrir para corrigir", o motivo digitado no quadro amarelo vira a descrição dessa revisão, o CNPJ e o código ficam travados e só o documento aberto é gerado de novo. "Usar como base" para outro hospital sai como a primeira revisão do código nesse hospital; no mesmo hospital e com o mesmo código, sai a revisão seguinte, com o motivo. O POP avulso copiado com "Usar como base" sai como documento novo; para revisar o mesmo avulso, use "Abrir para corrigir".

## No celular (01/11/2026)

- **Voltar com o formulário preenchido.** Se você digitou, escolheu numa lista, marcou uma caixa ou importou um arquivo (inclusive para a leitura pela IA) e o documento ainda não foi gerado, o Voltar pergunta "Sair deste formulário?" antes de descartar. Cancelar continua na tela; OK sai e o que foi preenchido se perde.
- **Pré-visualização do documento.** No celular, o documento abre dentro do SGO+, com Voltar, Imprimir e o nome no alto. Tabela mais larga que a tela rola de lado dentro da própria caixa: arraste a tabela com o dedo. Quando aparece "Tamanho real", ele mostra a folha na largura do papel. No computador, o documento continua abrindo em aba nova.
- **O documento A4 não muda.** Nada disso altera o texto, os cálculos, os critérios, as normas citadas, a numeração ou a folha impressa e o PDF.
