# Manual — Clientes, Unidades e Vínculos

O botão **Como usar**, disponível nas telas Clientes e Unidades e no painel de vínculos, abre este conteúdo operacional dentro do portal.

## Antes de cadastrar

Digite o nome ou o CNPJ completo, inclusive zeros iniciais. O painel **Cadastros e vínculos** consulta o portal enquanto você preenche. Também é possível pesquisar diretamente nele. A busca foi concentrada nesse painel para evitar campos de pesquisa repetidos. A consulta não altera os campos do formulário.

No computador, o painel fica ao lado do formulário. No celular, fica abaixo, em uma seção que pode ser recolhida. Resultados aparecem em cartões: os clientes mostram suas unidades agrupadas; unidades encontradas separadamente mostram o cliente responsável.

- **Ver vínculos:** abre os relacionamentos sem substituir o formulário.
- **Abrir cadastro:** pede confirmação antes de trocar a tela; alterações não salvas no formulário atual serão descartadas.
- **Buscar junto ao CNPJ do formulário:** consulta os dados externos para autopreenchimento. Não significa que já exista cadastro no portal.

## Cadastro completo e "Ciente" (29/10/2026)

O formulário de cliente e o de unidade (no computador e no celular) mostram um aviso fixo:

> Os dados devem ser pedidos ao cliente, completos e corretos. Não use informação buscada na internet. Cadastro incompleto ou errado pode causar problemas futuros (nota fiscal, certificado, cobrança e documentos com dados errados).

Obrigatório para salvar um cliente novo ou uma alteração:

- CNPJ válido ou, para cliente pessoa física, CPF válido (os dígitos verificadores são conferidos);
- razão social;
- endereço completo: CEP, logradouro, número (S/N quando não houver), bairro, cidade e UF. O complemento é opcional;
- contato responsável: nome, e-mail válido e telefone com DDD.

Unidade: cidade e UF são obrigatórias.

Para salvar também é obrigatório marcar **Ciente — os dados foram informados pelo cliente**. O sistema grava no cadastro quem deu o Ciente e quando, e guarda no histórico dos cadastros quem criou ou alterou, quando e cada campo que mudou (de e para). Sem os dados ou sem o Ciente, nada é gravado e cada campo que falta aparece marcado, com o que fazer.

Cadastro antigo incompleto continua funcionando: propostas, O.S. e certificados não são bloqueados. Só para salvar uma alteração nele é preciso completar o que falta; o endereço antigo, num campo só, aparece embaixo do logradouro para conferência com o cliente. O endereço completo usado nos documentos passa a ser montado das partes.

O botão **Preencher pela Receita** continua disponível para conferência; confirme com o cliente o que veio da Receita antes de marcar o Ciente.

Outros caminhos que criam cliente (cadastro rápido do Certificado de calibração no computador, aplicativo de campo da Assistência, importação do CRM) continuam como estavam; o que vier incompleto aparece em **Correções de cadastro**, com quem cadastrou. No celular, o novo cliente do assistente do certificado passa pela mesma regra da tela de Clientes.

## Cadastrar um cliente

1. Confira no painel se ele já existe.
2. Preencha o CNPJ (ou, para pessoa física, o CPF), a razão social, o endereço em partes e o contato responsável com nome, e-mail e telefone.
3. Mantenha marcada **Criar unidade principal** quando o próprio cliente for o local atendido. Cliente e unidade principal podem ter o mesmo CNPJ; a unidade principal recebe a cidade e a UF do cliente. Cliente pessoa física tem unidade principal sem CNPJ.
4. Desmarque somente quando o cliente for um agrupador de outras unidades.
5. Marque **Ciente — os dados foram informados pelo cliente**.
6. Clique em **Cadastrar cliente** e aguarde a conclusão. Se houver duplicidade, localize o registro existente e confira seu vínculo.

## Cadastrar outra unidade

1. Em Unidades, selecione o cliente responsável.
2. Informe nome, CNPJ, endereço, cidade e UF (obrigatórias) e demais dados do local.
3. Confira os resultados da consulta. Se a unidade já existir sob outro cliente, peça ao gestor a correção do vínculo.
4. Marque **Ciente — os dados foram informados pelo cliente**, salve e aguarde a confirmação. Não crie variações de nome/CNPJ para contornar um bloqueio.

## Editar um cadastro

Localize o cadastro, clique em **Abrir cadastro**, confirme a troca de tela, ajuste os dados, marque o Ciente e salve. Cadastro antigo incompleto pede para completar o que falta antes de salvar. Para mudar o cliente responsável ou a unidade de um equipamento, use o painel do gestor.

## Correções de cadastro (29/10/2026)

Menu **Cadastros > Correções de cadastro**. Mostra o que precisa de correção:

- **Clientes a completar:** CNPJ ou CPF inválido ou ausente, endereço incompleto, contato sem nome, e-mail ou telefone.
- **Unidades a completar:** sem cidade ou UF, ou com CNPJ inválido.
- **Produtos e serviços** (catálogo do Comercial): item ativo sem preço, sem unidade ou, para quem vê o custo, com preço abaixo do custo. O vendedor não vê o custo, então não vê esse aviso.
- **Possíveis duplicados:** clientes com o mesmo CNPJ ou CPF, ou com nome muito parecido (sem acento, maiúsculas, pontuação e palavras como LTDA, ME, EPP, EIRELI e S/A); unidades com o mesmo CNPJ ou com o mesmo nome no mesmo cliente; itens ativos do catálogo com o mesmo nome. Dois clientes com CNPJs válidos e diferentes não entram (são empresas ou filiais diferentes).

Cada linha mostra o problema, desde quando, quem cadastrou e quem deu o Ciente. Cadastros anteriores a 29/10/2026 aparecem com "Não registrado" em quem cadastrou (ou com a origem: Histórico do Auvo, Importação do CRM, cadastro em campo).

Quem vê: Diretoria e Administrador veem os cadastros de toda a empresa; os demais veem os problemas dos cadastros que eles mesmos fizeram.

Ações:

- **Corrigir:** abre o cadastro com os campos que faltam marcados. Item do catálogo abre **Comercial > Produtos e serviços** filtrado pelo código; o item é corrigido pelo **Editar** da linha.
- **Juntar** (Diretoria e Administrador): escolha qual cadastro fica; a prévia mostra os dois lado a lado e você escolhe, campo a campo, qual valor fica. A identificação (CNPJ ou CPF) é a do cadastro que fica; se só um tem CNPJ, ele precisa ser o que fica.
  - Clientes e unidades: a junção usa a consolidação de **Vínculos**, com prévia válida por 10 minutos e auditoria. Unidades, equipamentos, documentos do Arquivo, contatos, a ligação com o histórico do Auvo, oportunidades, propostas e contatos registrados do Comercial vão para o cadastro que fica. Certificados, laudos NR-13 e atendimentos ficam no cadastro original. Qualquer outro registro ligado trava a junção e a prévia diz em qual tabela; nada é alterado.
  - Catálogo: as propostas e os itens de pedido de compra passam a apontar o item que fica; preço e descrição já gravados nas propostas não mudam. O histórico de preço e de reajustes continua no item original.
  - O que sai nunca é apagado: fica inativo (no catálogo, arquivado) com a marca "juntado com" o que ficou, quem juntou e quando. Item do catálogo juntado não pode ser reativado.
- **Não é duplicado** (Diretoria e Administrador): com o motivo; o par sai da lista e não volta.

## Relatório "Qualidade dos cadastros" (29/10/2026)

Na tela Correções de cadastro, botão **Qualidade dos cadastros** (Diretoria e Administrador). Escolha o período e toque em **Gerar**. Para cada pessoa: quantos clientes e unidades cadastrou no período, quantos estão com erro ou incompletos hoje, quantos têm o Ciente registrado, quantas correções fez nos próprios cadastros e nos de outros, quantos cadastros dela foram corrigidos por outros e os erros mais comuns. Abaixo, a lista das correções feitas depois do cadastro (quem corrigiu, o cadastro, quem tinha cadastrado e quantos problemas foram resolvidos). Use para orientar a equipe.

## Corrigir vínculos — gestão

Quem corrige vínculos (transferir, desvincular, consolidar): Administrador, Diretoria, Gestor, RH e Financeiro. Excluir de vez um cadastro sem dependências fica com Administrador, Diretoria e Gestor; os demais usam Inativar.

1. Clique em **Abrir painel de vínculos** ou **Ver vínculos** no cartão correto.
2. Confira o cadastro de origem, o responsável atual, os filhos e as referências nos módulos.
3. Escolha a ação e, quando necessário, o destino.
4. Explique o motivo e clique em **Conferir impacto**.
5. Leia os impedimentos, o histórico preservado e os campos que mudarão.
6. Confirme somente a alteração conferida. Se a prévia expirar ou os dados mudarem, atualize e confira novamente.

| Ação | Quando usar |
| --- | --- |
| Transferir | Mudar a unidade para outro cliente ou o equipamento para outra unidade; também vincular novamente um cadastro pendente. |
| Desvincular | Deixar o cadastro temporariamente sem responsável. Novos atendimentos ficam bloqueados até a correção. |
| Consolidar | Reunir cadastros duplicados da mesma identificação. A origem fica inativa para preservar o histórico. Não usar para juntar filiais diferentes. |
| Inativar | Impedir novos usos, mantendo o cadastro e seu histórico. |
| Reativar | Retomar o uso após conferir vínculo e duplicidades. |
| Excluir | Remover cadastro sem dependências (Administrador, Diretoria e Gestor). O sistema impede a exclusão quando encontra vínculos. |

As mudanças do painel registram usuário, motivo e valores anteriores e posteriores na auditoria. Equipamentos acompanham a transferência de sua unidade; documentos antigos permanecem associados ao atendimento original.

### Unidades ligadas ao Auvo (histórico; Auvo descontinuado em 18/11/2026)

- A ligação da unidade com o cliente do Auvo fica guardada com a unidade, só para consulta. Desvincular, transferir e excluir não são impedidos por ela.
- **Transferir** a unidade para outro cliente leva junto os equipamentos, os documentos, os contatos da unidade e a ligação com o histórico do Auvo daquele endereço (quando existir).
- **Excluir** uma unidade que só tem a ligação com o histórico do Auvo e/ou um contato: a prévia mostra que a ligação fica guardada como de cadastro excluído (para consulta) e que o contato fica inativo; nada é apagado além da unidade.
- **Excluir cliente ou unidade que só tem contatos** (26/10/2026): os contatos do próprio cadastro não impedem mais a exclusão, nem em Cadastros > Clientes/Unidades nem em Vínculos. Depois da exclusão eles ficam inativos na lista de contatos (não são apagados) e a mensagem diz quantos. Unidade, equipamento, documento, negociação e os demais registros ligados continuam impedindo.
- Contatos da unidade acompanham Transferir e Consolidar; em Desvincular ficam no cadastro original.

**Exemplo — unidade com o nome de outra empresa pendurada no cliente errado:** em Vínculos, escolha a unidade como origem, ação **Desvincular**, motivo, **Conferir impacto** e confirme. Depois, se a unidade não serve para nada, escolha a mesma unidade, ação **Excluir**, motivo, **Conferir impacto** e confirme; se ela é de fato um local de outro cliente, use **Transferir** para esse cliente.

## Avisos e carregamento

**Regular:** pronto para uso. **Sem unidade:** falta criar ou vincular um local. **Vínculo pendente/inconsistente:** o gestor deve corrigir. **Duplicidade:** conferir as identificações antes de prosseguir. **Inativo:** preservado no histórico.

Quando aparecer **Aguarde**, espere a conclusão. Uma consulta com erro oferece **Tentar novamente** e mantém o formulário. Uma consulta sem resultados não garante que a gravação será aceita: o sistema verifica novamente ao salvar.

Após corrigir um vínculo, reabra o módulo de destino e selecione novamente cliente, unidade e equipamento. Se uma gravação falhar, leia a mensagem e confira o cadastro/auditoria antes de repetir.

## Do cadastro ao relatório de qualificação (20/10/2026)

A ordem de trabalho é sempre a mesma: **Clientes → Unidades → Equipamentos → módulo de qualificação**. O módulo de qualificação (Autoclaves, Esterilização a baixa temperatura) não pede para digitar cliente, CNPJ, endereço, TAG nem número de série: o técnico busca o cliente, escolhe a unidade e o equipamento, e a identificação vem do cadastro. O relatório só pode ser feito para equipamento do próprio cliente; equipamento de outro cliente ou de outra unidade é recusado com a explicação.

Se o cliente, a unidade ou o equipamento ainda não existir, os botões **Cadastrar cliente**, **Cadastrar unidade** e **Cadastrar equipamento** abrem o cadastro em outra aba. Depois de salvar, volte para a aba do ensaio e clique em **Atualizar listas** (na baixa temperatura, **Buscar cliente** de novo): o que já foi preenchido no ensaio continua.

### Campos do equipamento que os documentos usam (21/10/2026)

O cadastro do equipamento guarda tudo o que antes era digitado na tela do ensaio. Os relatórios, certificados, a planilha de dados e a etiqueta do QR Code puxam daqui:

| Campo | Para que serve |
|---|---|
| **TAG** | Identifica o equipamento em todos os documentos e no nome da pasta. Não se repete entre equipamentos ativos do mesmo cliente. |
| **Número de série** | Rastreabilidade do equipamento nos documentos. Série repetida no mesmo cliente não bloqueia, mas o sistema avisa ao salvar. |
| **Setor ou local** | Setor da unidade onde o equipamento está instalado (ex.: CME). Sai nos documentos junto com a unidade. |
| **Patrimônio** | Número de patrimônio do cliente, quando houver. |
| **Tipo** | Define em qual módulo de qualificação o equipamento aparece. |
| **Fabricante e modelo** | Como estão na placa do equipamento. Desde 22/10/2026 saem na identificação de todos os documentos do equipamento (qualificações, ensaios, planilhas de dados, certificado e relatórios). |
| **Ano de fabricação, capacidade ou volume, câmaras ou portas** | Saem no relatório de qualificação quando preenchidos. |
| **Responsável no cliente** | Quem responde pelo equipamento no cliente; entra como acompanhamento no relatório quando a tela do ensaio não informar outro. |

Equipamento sem TAG, número de série ou setor aparece como **Cadastro incompleto**. Na tela do ensaio, o quadro "Cliente e equipamento" mostra **Falta no cadastro do equipamento** com os campos para preencher ali mesmo: **Gravar no cadastro** grava só o que está vazio (com registro de quem gravou e de onde) e **Buscar nos ensaios anteriores** traz o que foi digitado em relatórios antigos do mesmo equipamento, para conferir antes de gravar. Trocar um valor já gravado é feito aqui, em **Editar**, por quem tem permissão de editar cadastros.

Ao emitir, o relatório:

- fica na pasta do equipamento, dentro da pasta do cliente: `<pasta do módulo>/<CNPJ do cliente>/<TAG - tipo>/Qualificação`, em HTML (para imprimir) e PDF;
- entra no **Arquivo de documentos** na categoria **3. Relatórios de qualificação**, ligado ao cliente, à unidade e ao equipamento, com o vencimento da requalificação — por isso aparece no cadastro do cliente, da unidade e do equipamento, sem arquivo repetido;
- aparece na ficha do equipamento, aba **Qualificações**, e na seção **Qualificação** do QR Code.

### Ficha do equipamento — aba Qualificações

Mostra a situação (qualificado até a data, requalificação vencendo, qualificação vencida, última qualificação reprovada ou sem qualificação), o relatório de qualificação vigente, a validade, as revisões anteriores marcadas como **substituídas** e os relatórios de ensaio de cada ciclo. A aba **Dados** traz a mesma situação em uma faixa colorida. Minuta (aguardando aprovação do responsável técnico) aparece só para a equipe e não abre pela ficha.

### QR Code — seção Qualificação

Quem lê a etiqueta do equipamento e entra no SGO+ vê, abaixo da identificação, o **Prontuário do equipamento** organizado por pasta (desde 17/11/2026; detalhes em "Documentos organizados por pasta", no fim deste manual). A pasta **Qualificações (QI, QO, QD e térmica)** traz o relatório vigente com a validade e as revisões anteriores, e a situação da qualificação aparece no alto. Só aparecem documentos **emitidos e aprovados**; o cliente vê apenas os equipamentos da própria empresa. Cada consulta, cada documento aberto e cada tentativa negada ficam registrados (trilha de acesso).

### Vencimento da requalificação

A validade do relatório de qualificação vira pendência **Requalificação a vencer** (30 dias antes) e **Requalificação vencida** na central de pendências, na Caixa de decisões da gestão (acompanhamento) e para o próprio cliente. No Cronograma de execução, ao trazer os equipamentos do cadastro, a tela avisa quais estão com a requalificação vencida ou a vencer. O novo relatório emitido substitui o vencimento anterior.

## Etapa 5 do programa de melhoria (01/11/2026): o que o cliente vê em Unidades e Equipamentos

Para o perfil **Cliente**, as listas de Unidades e Equipamentos:

- não têm o filtro **"Todos os clientes"** (só existe a empresa dele);
- não mostram os números, os selos e as faixas **"Cadastro incompleto"** e **"Vínculo pendente"**, que são da rotina interna da Metrolabs (ele não corrige o cadastro). Continuam: Total, Ativos, Inativos, Documento vencido ou vencendo e Sem documento.

**Conferência no servidor (sem mudança necessária):** com um cliente entrando e pedindo direto ao servidor os dados de outro cliente, todas as chamadas desta área devolveram só a própria empresa ou "Acesso negado": `cadastrosPainel` (clientes, unidades, equipamentos, documentos), `cadastrosDetalhe`, `equipamentosListar`, `equipamentosPesquisar`, `equipamentosObter`, `equipamentosListarClientesAtivos`, `equipamentosListarUnidadesAtivasPorCliente`, `qualifEquipamentoListar`, `qrcodeGerarParaEquipamento`, `qrcodeAcessar`, `inventarioListarClientesAtivos`, `inventarioListarUnidadesAtivasPorCliente` e `inventarioGerar` (mesmo pedindo o outro cliente no filtro). O recorte é feito pelo `clienteId` da sessão (`CadPainel_base_`, `SGO_EQUIPAMENTOS`, `SGO_QEQ_equipamentoVisivel_`, `SGO_VINCULOS.units`). O filtro na tela era só aparência: não havia vazamento.

## O que a conta de cliente recebe e abre (17/11/2026, Portal do cliente etapa 0)

A conta de cliente (perfil Cliente) recebe de Clientes, Unidades, Equipamentos, Arquivo de documentos e do painel de
cadastros só as colunas públicas: identificação, endereço, cidade e UF, tipo, fabricante, modelo, série, TAG, setor,
patrimônio, situação, nomes, contagens e vencimentos. Origem, autor do cadastro, QR, observações internas, nota fiscal,
pastas, responsável interno da unidade e links do Drive não chegam ao cliente; o link do documento vira a rota do SGO+
com login (/arquivos/...). A equipe interna continua vendo tudo. O cliente abre só os arquivos ligados aos registros
da própria empresa, e a entrada depende do contrato cadastrado em Portal do cliente > Contratos de clientes (cliente com
acesso suspenso, sem acesso ou com cadastro inativo não entra). Detalhes em
[Manual do Portal do cliente](MANUAL_MODULO_PORTAL_CLIENTE.md).

## Enviar acesso ao portal para o contato do cliente (16/11/2026)

Na ficha do cliente, toque em **Mais > Enviar acesso ao portal (login do cliente)**. A janela já vem com a empresa
escolhida e mostra as contas de cliente que ela tem:

- **Conta que já existe:** toque em **Enviar para esta conta**. A janela mostra a situação do último envio e os envios
  anteriores; toque em **Enviar de novo** (ou **Enviar o convite**).
- **Contato novo:** preencha o nome e o e-mail (os contatos cadastrados do cliente aparecem para tocar e preencher) e
  toque em **Enviar o convite**. O sistema cria a conta de cliente (perfil Cliente, ligada a esta empresa) e envia.

O contato recebe por e-mail o login (o próprio e-mail) e um link de uso único para criar a senha, que vale 72 horas. A
senha nunca vai por e-mail e ninguém da Metrolabs a vê. Enviar de novo cancela o link anterior. Quem pode: o dono,
Administrador, Diretoria e Gestor. Cliente inativo não recebe acesso novo: reative antes. Detalhes, registro e regras
em [Manual da gestão: segurança do acesso](MANUAL_SEGURANCA_ACESSO_GESTAO.md), seção "Enviar acesso ao cliente".

<div style="text-align: justify">

## Contrato do cliente na ficha (17/11/2026)

Na ficha do cliente (Cadastros > Clientes > aba Dados), a parte **"Contrato e Portal do cliente"** mostra a situação do cliente no Portal, o contrato vigente com a vigência, o objeto, os serviços e a renovação. Cliente com conta de cliente (ou com pista de contrato) e sem nenhum contrato cadastrado aparece com o selo **"contrato a cadastrar"**: ele tem acesso completo até 31/12/2026 (decisão do dono), e o Comercial cadastra o contrato real antes dessa data. Valores não aparecem aqui. Quem tem a caixa «Ver contratos de clientes» abre os contratos pelo botão da própria parte.

## Documentos organizados por pasta (17/11/2026)

Pedido da equipe técnica: pelo QR Code o prontuário não mostrava a pasta de PGT e POP, nem as pastas de ordem de serviço e de qualificação; na ficha do cliente os documentos apareciam em lista solta, com repetições, e a árvore cliente → unidade → equipamento mostrava "0 documento(s)" em quase todos os equipamentos. Agora o SGO+ tem uma organização única dos documentos, usada em todas as telas.

### As pastas

Todo documento de qualquer módulo cai numa destas pastas, sempre na mesma ordem:

1. **Certificados de calibração** — certificados do módulo de calibração e relatórios de calibração.
2. **Qualificações (QI, QO, QD e térmica)** — relatórios de qualificação de autoclave, lavadora, estufa, banho-maria, cadeia de frio, baixa temperatura e QI/QO/QD.
3. **Relatórios técnicos e de ciclos** — relatórios de ensaio de ciclo, planilhas de dados, relatórios de ciclo da lavadora e inventário.
4. **Ordens de serviço e relatórios de atendimento** — relatório da O.S. encerrada, relatórios de atendimento e de ronda.
5. **Manutenção preventiva e corretiva** — relatórios de manutenção e cronograma de execução.
6. **PGT e POP** — PGT, POP e planejamento técnico do CME. São documentos da unidade e valem para todos os equipamentos dela.
7. **Registros operacionais** — formulários de rotina da unidade.
8. **NR-13 (vasos de pressão)** — laudos de inspeção, com a data da próxima inspeção.
9. **Laudos e declarações** — declarações de execução de serviço, laudos técnicos e pareceres.
10. **Contratos e propostas** — uso interno: nunca aparece para o cliente nem no QR Code.
11. **Outros documentos** — o que não se encaixa nas pastas acima.

A pasta vem do módulo que gerou o documento. Para o que foi enviado à mão no Arquivo de documentos vale a categoria escolhida; documento antigo sem categoria útil é classificado pelo nome do arquivo (por exemplo, "POP008..." vai para PGT e POP). Nada é alterado nos registros: a organização é calculada na hora da consulta, e documento novo de qualquer módulo aparece sozinho.

### Onde aparece

- **QR Code (prontuário do equipamento no celular):** só os documentos ligados ao equipamento, por pasta. O PGT, os POP e os registros operacionais são da unidade e ficam nas pastas da unidade e do cliente (veja "Cada equipamento só com o que é dele", abaixo).
- **Cadastros > Clientes > aba "Documentos por pasta":** todos os documentos do cliente, com busca e filtro por unidade e equipamento, e os botões Abrir e Enviar.
- **Cadastros > Unidades e Equipamentos > aba "Documentos por pasta":** o mesmo recorte para a unidade e para o equipamento (no equipamento é o mesmo prontuário do QR Code, mais o que só a equipe vê).
- **Arquivo de documentos, na conta de cliente:** "Documentos da sua empresa por pasta", no alto da tela.
- **Cadastros > Clientes > aba "Documentos gerados e envios":** os documentos salvos nas pastas do cliente, separados nas mesmas pastas, com o último envio.

### Como ler cada documento

O documento mais novo vem primeiro, com a data de emissão e a validade: **Válido até**, **Vence em X dias** (amarelo, até 30 dias) ou **Vencido há X dias** (vermelho). De um documento gerado mais de uma vez (por exemplo, POP028 v1 e v2, ou o mesmo certificado emitido três vezes) aparece só o último gerado, que é o oficial. Os anteriores ficam guardados, marcados como substituídos, e só Admin e Diretoria os veem, em **Substituídos**, dentro do documento oficial. Nada é apagado. O mesmo arquivo registrado em dois lugares (o certificado que o módulo grava e o registro no Arquivo de documentos, por exemplo) aparece uma vez só; a equipe vê o aviso de quantos registros ele tem.

### Cada equipamento só com o que é dele (18/11/2026)

Regra do dono, depois do caso em que o QR Code de todos os equipamentos de uma unidade mostrava os mesmos 29 PGT e POP: nenhum dado de um equipamento pode aparecer em outro, e documento gerado mais de uma vez não pode ser visto repetido.

1. **Vínculo exato.** O prontuário do equipamento (QR Code, aba "Documentos por pasta" do equipamento e ficha do equipamento no Portal do cliente) mostra só os documentos que têm o identificador daquele equipamento no cadastro. Documento sem equipamento não aparece no equipamento. A pasta da unidade mostra só o que está ligado à unidade; o que é só do cliente fica na ficha do cliente.
2. **PGT, POP e registros operacionais são da unidade.** Eles são gerados pelo CNPJ, sem equipamento. Ficam nas pastas da unidade e do cliente e no Portal do cliente ("Por pastas (prontuário)"), e não aparecem mais no QR Code do equipamento. A configuração antiga que escolhia "documentos da unidade no prontuário do equipamento" deixou de valer.
3. **Só o último gerado.** O mesmo documento gerado de novo vale uma vez só, na última geração (a oficial). O sistema reconhece a repetição dentro do mesmo equipamento (ou da mesma unidade, para os documentos da unidade): o certificado de calibração pela data da calibração e pelos instrumentos calibrados (dois manômetros calibrados no mesmo dia continuam dois certificados); os relatórios de ensaio e de qualificação pelo número (espaços repetidos e acentos não contam); os demais pelo número ou pelo nome do arquivo.
4. **Quem vê os substituídos.** No QR Code, no Portal do cliente, na conta de cliente e para os perfis da equipe que não são Admin nem Diretoria, aparece só o oficial; a equipe vê o aviso "N documentos gerados de novo ficaram fora desta lista". Admin e Diretoria veem os anteriores na ficha, em "Substituídos", marcados como substituídos. Nenhum registro é apagado do banco.
5. **Pasta de arquivos do equipamento.** O QR Code não abre mais a pasta de arquivos do equipamento. Ela era achada pelo nome ("TAG - TIPO") e equipamentos com a mesma TAG e o mesmo tipo na mesma unidade (por exemplo, vários "N/P - TERMOHIGRÔMETRO") caíam na mesma pasta, que também mostrava cada arquivo gerado de novo.
6. **Substituição gravada pelos módulos.** Os módulos de relatórios de ensaio (autoclave, lavadora, estufa e cadeia de frio) e o registro de revisões (PGT e POP, entre outros) marcavam como substituído qualquer documento com o mesmo número, até de outro equipamento ou de outro cliente. Agora marcam só o do mesmo equipamento (sem equipamento, do mesmo CNPJ). As marcas antigas erradas não foram mexidas no banco: a lista de documentos recalcula a situação dentro de cada equipamento.

### Excluir documento da pasta (18/11/2026)

Pedido do Matheus: há documentos cadastrados em clientes a que não pertencem, o que pode trazer problema com a fiscalização. Na aba **Documentos por pasta** do equipamento (e também na da unidade e na do cliente), quem tem a caixa **«Excluir documento da pasta»** vê o botão **Excluir** em cada documento.

1. Toque em **Excluir**. Aparece, dentro do próprio documento, a confirmação com o nome do documento, o equipamento e o cliente, e o aviso de que ele some do QR Code, das pastas, das fichas e do Portal do cliente.
2. Escreva o **motivo** (obrigatório, pelo menos 10 letras) e toque em **Confirmar exclusão**. Para desistir, toque em **Cancelar**.
3. O documento sai na hora de todas as telas e a conta de cliente não consegue mais abrir o arquivo, nem pelo link.

**Exclusão lógica.** Nada é apagado: o registro do módulo (certificado, relatório, Arquivo de documentos) e o arquivo continuam guardados. A exclusão é uma linha na tabela DOCP_EXCLUSOES com o documento, o cliente, a unidade, o equipamento, quem excluiu, quando e o motivo, e fica também no registro de eventos (DOCUMENTO_EXCLUIDO_PASTA).

**Documentos excluídos e restaurar.** Só o Administrador e a Diretoria veem, no fim da mesma aba, a lista **Documentos excluídos**, com quem excluiu, quando e o motivo. Para trazer um documento de volta, escrevem o motivo e tocam em **Restaurar** (registrado como DOCUMENTO_RESTAURADO_PASTA).

**Caixa de Acessos.** «Excluir documento da pasta» (DOCP_EXCLUIR), grupo "Documentos por pasta". Padrão: Administrador, Diretoria e gestores das áreas Técnica, Qualidade e Comercial (inclui o gestor da Qualidade). Para dar ou tirar de outra pessoa, use Administração > Acessos.

Depois de excluir um documento de outro cliente, registre-o no cliente certo (Arquivo de documentos ou o módulo que o gerou).

### O que o cliente vê

A conta de cliente e o QR Code mostram só documentos **emitidos**, da própria empresa, sem a pasta Contratos e propostas, sem minuta aguardando aprovação, sem a versão interna dos relatórios de atendimento, sem documento inativo e sem PGT/POP suspenso. O link de cada documento passa pela trava de arquivo do Portal do cliente (rota /arquivos do SGO+, com login): o cliente abre o documento emitido do prontuário da própria empresa e nenhum outro. Se aparecer "Peça a cópia à Metrolabs", o arquivo ainda não foi liberado para abrir pelo portal.

### Por que a árvore mostrava "0 documento(s)"

A contagem por equipamento olhava só o **Arquivo de documentos**. Certificados, relatórios de qualificação, O.S., laudos NR-13, PGT e POP ficam na tabela de cada módulo e só uma parte deles é registrada no Arquivo; o PGT e os POP são da unidade e não têm equipamento. Por isso a maior parte dos equipamentos aparecia sem documento. Agora a árvore conta os documentos de todos os módulos ligados a cada equipamento (o mesmo arquivo conta uma vez).

### Configuração (Administrador)

A organização vem pronta. Quando preciso, o responsável pelo sistema ajusta a configuração **DOCP_CFG** (propriedade do servidor), que permite: trocar o nome de uma pasta, esconder uma pasta do cliente, acrescentar uma regra pelo nome ou pelo tipo (por exemplo, "LAUDO TECNICO" para Relatórios técnicos), o prazo de "vencendo" (padrão 30 dias) e se a conta de cliente abre os documentos emitidos do prontuário pela trava de arquivo (padrão: sim).

</div>
