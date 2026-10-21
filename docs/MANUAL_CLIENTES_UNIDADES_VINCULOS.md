# Manual — Clientes, Unidades e Vínculos

O botão **Como usar**, disponível nas telas Clientes e Unidades e no painel de vínculos, abre este conteúdo operacional dentro do portal.

## Antes de cadastrar

Digite o nome ou o CNPJ completo, inclusive zeros iniciais. O painel **Cadastros e vínculos** consulta o portal enquanto você preenche. Também é possível pesquisar diretamente nele. A busca foi concentrada nesse painel para evitar campos de pesquisa repetidos. A consulta não altera os campos do formulário.

No computador, o painel fica ao lado do formulário. No celular, fica abaixo, em uma seção que pode ser recolhida. Resultados aparecem em cartões: os clientes mostram suas unidades agrupadas; unidades encontradas separadamente mostram o cliente responsável.

- **Ver vínculos:** abre os relacionamentos sem substituir o formulário.
- **Abrir cadastro:** pede confirmação antes de trocar a tela; alterações não salvas no formulário atual serão descartadas.
- **Buscar junto ao CNPJ do formulário:** consulta os dados externos para autopreenchimento. Não significa que já exista cadastro no portal.

## Cadastrar um cliente

1. Confira no painel se ele já existe.
2. Preencha CNPJ, razão social, endereço e contatos.
3. Mantenha marcada **Criar unidade principal** quando o próprio cliente for o local atendido. Cliente e unidade principal podem ter o mesmo CNPJ.
4. Desmarque somente quando o cliente for um agrupador de outras unidades.
5. Clique em **Salvar** e aguarde a conclusão. Se houver duplicidade, localize o registro existente e confira seu vínculo.

## Cadastrar outra unidade

1. Em Unidades, selecione o cliente responsável.
2. Informe nome, CNPJ, endereço e demais dados do local.
3. Confira os resultados da consulta. Se a unidade já existir sob outro cliente, peça ao gestor a correção do vínculo.
4. Salve e aguarde a confirmação. Não crie variações de nome/CNPJ para contornar um bloqueio.

## Editar um cadastro

Localize o cadastro, clique em **Abrir cadastro**, confirme a troca de tela, ajuste os dados e salve. Para mudar o cliente responsável ou a unidade de um equipamento, use o painel do gestor.

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
| Excluir | Remover cadastro sem dependências. O sistema impede a exclusão quando encontra vínculos. |

As mudanças do painel registram usuário, motivo e valores anteriores e posteriores na auditoria. Equipamentos acompanham a transferência de sua unidade; documentos antigos permanecem associados ao atendimento original.

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
| **Fabricante e modelo** | Uso interno. Não aparecem nos relatórios de qualificação. |
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
