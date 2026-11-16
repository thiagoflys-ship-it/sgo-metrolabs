# Estudo de Clientes, Unidades e vínculos — 17/09/2026

**Registro da investigação inicial, que foi somente leitura. Após a autorização “vamos começar”, a implementação foi iniciada e está documentada em [Implementação de vínculos](IMPLEMENTACAO_VINCULOS_CLIENTES_UNIDADES_20260917.md). A decisão sobre o proprietário da unidade permanece pendente.**

## Caso relatado e evidência no banco

Banco consultado: `1Ny2wiUrzqa8i3IirgEaW11ZZe_IFH9cs1kpXkxu3VzM`. Consulta de deployments confirmou produção na versão 273. Análise de código baseada nos arquivos locais correspondentes à entrega 273, cuja publicação foi conferida na sessão anterior; não houve nova extração integral do código nesta investigação.

| Registro | Identificação | Situação encontrada |
|---|---|---|
| Cliente anterior | `642bfc2b-6081-4d46-8fd4-4e76e5ce5083` — CNPJ **44.649.812/0249-08** | Notre Dame, endereço Silva Teles, 52, Andaraí; ativo |
| Unidade existente | `526bc156-b901-43e3-a4f6-841d27b65980` — CNPJ **44.649.812/0370-58** | Rua Pinto de Azevedo, 105, Cidade Nova; ativa, vinculada ao cliente anterior; criada em 27/08/2026 com origem AUVO |
| Cliente novo | `ca7f8bf8-8392-4473-a185-ed6b91831d35` — CNPJ **44.649.812/0370-58** | Mesmo estabelecimento de Pinto de Azevedo; criado em 17/09/2026, ativo, sem unidade própria encontrada |
| Outro cliente novo do grupo | `afd5a306-cb31-4ab4-99f9-d322388e232f` — CNPJ **44.649.812/0001-38** | Nome fantasia HAPVIDA NOTREDAME SP/RJ; criado em 17/09/2026 |

O usuário escolhe o cliente novo, mas o seletor busca unidades cujo `CLIENTE_ID` seja exatamente o ID desse cliente. A unidade de Pinto de Azevedo pertence ao cliente anterior e não aparece nessa seleção. Ao tentar criá-la novamente, a validação encontra o mesmo CNPJ em `CAD_UNIDADES` e recusa.

**Não é proibido repetir o CNPJ entre a tabela de clientes e a tabela de unidades. O bloqueio ocorre porque já existe outra linha de unidade com esse CNPJ.** A mensagem genérica não identifica a unidade, o cliente ao qual pertence nem como resolver.

Nos intervalos consultados, não foram encontrados equipamentos, documentos, certificados, laudos NR13 ou usuários diretamente ligados à unidade de Pinto de Azevedo ou ao novo cliente. Isso não dispensa nova conferência completa antes de migrar. Existem dois mapeamentos Auvo relevantes para o customer `16437474`:

- `CLIENTE:AUVOID:16437474` aponta para o cliente anterior `/0249-08`.
- `UNIDADE:AUVOID:16437474` aponta para a unidade de Pinto de Azevedo `/0370-58`.

Transferir apenas `CAD_UNIDADES.CLIENTE_ID` deixaria esses mapeamentos discordantes. O resolvedor incremental do Auvo prioriza o mapeamento de cliente quando presente.

## Causas de desenho e experiência de uso

1. **Modelos de organização misturados:** o cadastro manual usa CNPJ completo para identificar clientes; o Auvo agrupa customers por raiz de oito dígitos e pode vinculá-los a um cliente previamente existente do grupo. Isso permite o mesmo estabelecimento aparecer como unidade de um grupo e posteriormente como cliente separado.
2. **Criação desigual:** o cadastro normal de Clientes não garante uma unidade. Certificado e NR13 possuem fluxo que cria cliente e unidade juntos. O resultado depende de onde o operador começou.
3. **Texto incorreto:** `JS_Cadastros.html` orienta “CNPJ da PRÓPRIA unidade (diferente do cliente acima...)”. A unidade principal pode ter o mesmo CNPJ do cliente.
4. **Bloqueio sem orientação:** `SGO_Unidades.existeCnpjDuplicado_` procura em todas as unidades, inclusive as de outros clientes e as inativas. Não informa qual registro conflitou. Essa regra já existia antes da entrega 273; a validação compartilhada foi reforçada nessa entrega.
5. **Identidade visual ambígua:** há três clientes Notre Dame com nomes semelhantes. Alguns seletores mobile apresentam somente a razão social; o seletor compartilhado de unidades retorna ID/nome, sem CNPJ/endereço.
6. **Vínculos exigidos de forma desigual:** algumas ferramentas validam cliente/unidade/equipamento; outras verificam apenas se os registros existem ou trabalham com identificação textual recebida no formulário.

A correção de 16/09 resolveu a perda de zeros e reduziu duplicações, mas não resolveu a decisão de negócio sobre cliente individual versus agrupamento de filiais. Não se deve remover toda a proteção de duplicidade para contornar esse conflito.

## Impacto nos módulos revisados

| Área | Comportamento observado | Revisão proposta |
|---|---|---|
| Clientes e Unidades desktop/mobile | Cadastros separados; duplicidade global na tabela de unidades; seletores nem sempre distinguem CNPJ/local | Fluxo comum para unidade principal, mensagens úteis e identificação completa |
| Equipamentos | Seleciona unidades ativas por `CLIENTE_ID`; guarda cliente e unidade; valida relação nas novas gravações/alterações de vínculo | Manter consistência, atualizar seletores e impedir relação cruzada |
| Certificado de Calibração | Reutiliza pesquisa de clientes e unidades do cadastro; criação conjunta própria; emissão verifica vínculos | Adotar o mesmo serviço de cadastro e seleção dos demais módulos |
| NR13 | Reutiliza pesquisa/seleção do cadastro e criação conjunta compartilhada com certificado | Aplicar a política comum e conferir todo o ciclo de seleção/emissão |
| Documentos | Guarda cliente/unidade/equipamento; criação verifica cliente/unidade ativos, mas o trecho analisado não valida toda a relação entre eles | Validar o conjunto no servidor, inclusive registro de documento existente e edição |
| Inventário | Filtra equipamentos por cliente e unidade; seletor de unidades usa vínculo exato | Unificar seleção e validar filtros coerentes |
| QR Code e portal do cliente | Consultam equipamento, cliente, unidade e escopo de acesso por cliente | Preservar IDs e permissões em qualquer migração; impedir exposição a outro cliente |
| Auvo — reverso, incremental, push e relatórios | Agrupamento por raiz, mapeamentos separados de cliente/unidade e resolução usada em tarefas | Reconhecer vínculo definido pelo gestor; não desfazer decisão manual na próxima sincronização |
| Relatório de Calibração, Planejamento CME e Cronograma | Há caminhos com cliente/CNPJ textual no payload e consulta pública, sem depender exclusivamente dos IDs centrais | Mapear preenchimento e persistência de cada ferramenta antes de uniformizar; preservar snapshots |
| Templates Autoclave/Lavadora e Carta de Conformidade | Existem caminhos próprios/proxy; não são todos o mesmo seletor Cliente → Unidade | Conferir contratos de dados e integração, sem presumir que mudar um dropdown corrige tudo |
| Relatórios de qualificação, registros e demais documentos técnicos | Precisam entrar na matriz de homologação dos fluxos de identificação/preenchimento | Confirmar por ferramenta a origem do cliente/local, validações e documento final |
| Integração OS+ | Escrita em outro banco e mapeamentos posicionais | Validar esquema de destino antes de qualquer alteração ou execução |

Esta foi uma revisão de dados e caminhos de código, não homologação interativa de todas as telas. Não foram emitidos documentos de teste nem executadas sincronizações.

## Modelo recomendado para aprovação

Manter a relação **Cliente → Unidade → Equipamento**, para preservar os módulos existentes. A unidade representa o local atendido; o cliente representa a organização contratante escolhida para aquela operação. Um cliente com apenas um local continua tendo uma unidade, mas o operador não deve precisar repetir manualmente todo o cadastro.

### 1. Unidade principal no cadastro do cliente

Propor a opção “Usar os dados deste cliente como unidade principal”, marcada por padrão. Nome sugerido “Unidade principal”, com nome do estabelecimento, mesmo CNPJ e endereço inicial. Usar “principal”, sem afirmar que a filial seja juridicamente a matriz.

Salvar o conjunto de forma consistente. Se a unidade já existir, não criar outra: identificar o registro e encaminhar para a escolha apropriada. Um cliente que seja apenas agrupador poderá ser cadastrado sem local próprio de maneira explícita, com a indicação de que precisa associar unidades para operar.

Mudança posterior no endereço/CNPJ do cliente não deve sobrescrever silenciosamente uma unidade já utilizada. O sistema precisa permitir revisar o que será atualizado.

### 2. Resolver duplicidade em vez de apenas bloquear

| Situação | Resultado proposto |
|---|---|
| Mesmo cliente e mesma unidade/local já ativos | Informar o existente e permitir selecioná-lo/abri-lo |
| Unidade existente inativa | Explicar a inativação e encaminhar reativação ao perfil autorizado |
| Mesmo CNPJ em unidade de outro cliente | Mostrar cliente atual e local, respeitando permissões; gestor decide organização/migração |
| Mesmo CNPJ em locais físicos diferentes | Identificar endereço/local; permitir exceção controlada se confirmada, sem deduplicar apenas pelo CNPJ |
| Clique repetido ou requisição concorrente | Não criar segunda linha; retornar resultado coerente |

Não vincular a mesma unidade a dois clientes implicitamente: a estrutura atual admite um `CLIENTE_ID`. Se houver necessidade real de múltiplos contratantes para um local, isso exige modelo explícito e análise de permissões, não duplicação indiscriminada.

### 3. Seleção padronizada em todas as telas dependentes

- Cliente: nome + CNPJ completo + identificação de local quando necessária.
- Unidade: nome + CNPJ + cidade/endereço, para distinguir filiais de mesma razão social.
- Com uma única unidade ativa, selecionar automaticamente e mostrá-la claramente; com várias, exigir escolha.
- Sem unidade, oferecer ação orientada para criar/reutilizar a principal, sem gravar automaticamente apenas porque alguém abriu a tela.
- Ao trocar cliente, limpar unidade/equipamento incompatíveis e descartar respostas antigas de consultas assíncronas.
- Autorizar e validar os vínculos no servidor, além do filtro visual.

### 4. Política de agrupamento e Auvo

Tratar raiz do CNPJ como sugestão de agrupamento, não como decisão definitiva sobre o cliente responsável. Priorizar vínculos existentes aprovados e encaminhar conflitos novos ao gestor. A definição deve ser única entre cadastro manual, criação dentro de módulos e sincronização.

Agrupar filiais por raiz pode ser útil, mas não deve impedir que uma filial seja administrada como cliente independente quando essa for a regra de negócio escolhida.

## Escolha necessária para o caso Pinto de Azevedo

**Opção A — estabelecimento como cliente independente:** usar o cliente novo `/0370-58` e transferir a unidade existente para ele, mantendo o ID da unidade. Revisar dependências e atualizar os dois mapeamentos Auvo do customer `16437474`, além das referências operacionais pertinentes. É a opção mais próxima do fluxo relatado pelo usuário (“vinculado a ele mesmo”).

**Opção B — grupo com várias unidades:** manter Pinto de Azevedo sob o cliente agrupador; o usuário seleciona esse cliente e depois a unidade já existente. Decidir qual cadastro deve representar o grupo, pois há um cliente `/0249-08` antigo e outro `/0001-38` criado hoje. Não presumir que o novo `/0001-38` deva substituir o antigo sem avaliar todas as filiais.

Não executar nenhuma das duas opções sem validação. Não apagar os clientes novos para esconder o conflito. Uma eventual consolidação deve ter plano de referências, permissões, histórico e reversão.

## Sequência proposta após aprovação

1. Validar o modelo e escolher a organização do caso concreto.
2. Reconsultar o banco, mapear referências completas e preparar plano de ajustes por ID; preservar documentos históricos e snapshots.
3. Corrigir mensagem e identificação dos seletores e implementar o fluxo comum de unidade principal.
4. Harmonizar duplicidade, autorização, vínculo e integração Auvo no backend.
5. Adaptar desktop/mobile e cada módulo dependente ao fluxo comum; tratar separadamente os módulos que usam dados textuais/proxy.
6. Testar cliente de um local, cliente com filiais, unidade existente em outro cliente, inativos, nomes iguais, alteração de vínculo, duplo clique e concorrência.
7. Conferir Equipamentos, Certificado, NR13, Documentos, Inventário, QR, portal do cliente e sincronização Auvo, além dos formulários técnicos mapeados.
8. Homologar o caso `/0370-58` com o usuário antes de publicar a alteração aprovada.

**Status final desta investigação: causa do bloqueio identificada; proposta aguardando validação; nenhum código ou dado de produção alterado.**
