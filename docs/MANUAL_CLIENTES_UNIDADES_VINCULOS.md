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

Outros caminhos que criam cliente (cadastro rápido do Certificado de calibração no computador, aplicativo de campo da Assistência, sincronização do Auvo, importação do CRM) continuam como estavam; o que vier incompleto aparece em **Correções de cadastro**, com quem cadastrou. No celular, o novo cliente do assistente do certificado passa pela mesma regra da tela de Clientes.

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

Cada linha mostra o problema, desde quando, quem cadastrou e quem deu o Ciente. Cadastros anteriores a 29/10/2026 aparecem com "Não registrado" em quem cadastrou (ou com a origem: Integração Auvo, Importação do CRM, cadastro em campo).

Quem vê: Diretoria e Administrador veem os cadastros de toda a empresa; os demais veem os problemas dos cadastros que eles mesmos fizeram.

Ações:

- **Corrigir:** abre o cadastro com os campos que faltam marcados. Item do catálogo abre **Comercial > Produtos e serviços** filtrado pelo código; o item é corrigido pelo **Editar** da linha.
- **Juntar** (Diretoria e Administrador): escolha qual cadastro fica; a prévia mostra os dois lado a lado e você escolhe, campo a campo, qual valor fica. A identificação (CNPJ ou CPF) é a do cadastro que fica; se só um tem CNPJ, ele precisa ser o que fica.
  - Clientes e unidades: a junção usa a consolidação de **Vínculos**, com prévia válida por 10 minutos e auditoria. Unidades, equipamentos, documentos do Arquivo, contatos, a ligação com o Auvo, oportunidades, propostas e contatos registrados do Comercial vão para o cadastro que fica. Certificados, laudos NR-13 e atendimentos ficam no cadastro original. Qualquer outro registro ligado trava a junção e a prévia diz em qual tabela; nada é alterado.
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

### Unidades ligadas ao Auvo (21/10/2026)

- **Desvincular** uma unidade ligada ao Auvo não é mais impedido pela mensagem "vínculo com o Auvo incompleto ou repetido". A ligação da unidade com o cliente do Auvo continua guardada com a unidade; enquanto ela estiver sem cliente, tarefa nova do Auvo nesse endereço fica pendente em **Integração Auvo**.
- **Transferir** a unidade para outro cliente leva junto os equipamentos, os documentos, os contatos da unidade e a ligação do cliente Auvo daquele endereço (quando existir).
- **Excluir** uma unidade que só tem a ligação com o Auvo criada pelo próprio SGO+ e/ou um contato: a prévia mostra que a ligação fica guardada como de cadastro excluído (para consulta) e que o contato fica inativo; nada é apagado além da unidade. Se a unidade é o cadastro original de um cliente do Auvo (veio do Auvo) ou se o Auvo tem atendimento nesse cliente, a exclusão é impedida e a prévia orienta **Inativar** ou **Consolidar** — a ligação com o Auvo vale para o cadastro original.
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

Quem lê a etiqueta do equipamento e entra no SGO+ vê, abaixo da identificação, a seção **Qualificação**: situação, relatório vigente com a validade e revisões anteriores. Só aparecem documentos **emitidos e aprovados**; o cliente vê apenas os equipamentos da própria empresa. Cada consulta, cada documento aberto e cada tentativa negada ficam registrados (trilha de acesso).

### Vencimento da requalificação

A validade do relatório de qualificação vira pendência **Requalificação a vencer** (30 dias antes) e **Requalificação vencida** na central de pendências, na Caixa de decisões da gestão (acompanhamento) e para o próprio cliente. No Cronograma de execução, ao trazer os equipamentos do cadastro, a tela avisa quais estão com a requalificação vencida ou a vencer. O novo relatório emitido substitui o vencimento anterior.
