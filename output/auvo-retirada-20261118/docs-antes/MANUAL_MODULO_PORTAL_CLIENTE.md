# Portal do cliente — manual interno (etapa 0: segurança da conta de cliente e contratos; 17/11/2026: vigência provisória, IA, régua de vencimento e reajuste; 18/11/2026: etapa 1, acessos das pessoas dos clientes; etapas 2 a 4: chamados, documentos e avisos ao cliente por e-mail; etapa 5: indicadores e uso do portal; etapa 6: troca definitiva, trava do legado e manual do cliente)

**Versão:** 18/11/2026. **Especificação:** `output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md` (o dono aceitou todas as recomendações).
**Tela:** menu **Portal do cliente > Contratos de clientes** (`JS_PortalCliente.html`) e **Portal do cliente > Acessos de clientes** (`JS_PortalCliente_Acessos.html`). **Servidor:** `SGO_PortalCliente.js`, `SGO_PortalCliente_Config.js`, `SGO_PortalCliente_Contratos.js`, `SGO_PortalCliente_Seguranca.js`, `SGO_PortalCliente_Acessos.js`.

## 1. Para que serve

O Portal do cliente é o acesso das empresas que têm contrato com a Metrolabs. A etapa 0 prepara a base: protege a conta de cliente e cria o cadastro de contratos que decide o que cada cliente pode fazer. As telas que o cliente usa continuam as mesmas (Início, Unidades, Equipamentos, Arquivo de documentos e Meus chamados).

O que muda para a conta de cliente nesta etapa:

1. **Arquivos:** a conta de cliente abre apenas os arquivos ligados aos registros da própria empresa. A regra padrão é negar. Antes, um arquivo que não fosse documento da Representação abria para qualquer cliente que tivesse o código.
2. **Campos:** Equipamentos, Unidades, Clientes, Arquivo de documentos e o painel de cadastros entregam ao cliente apenas as colunas públicas. Origem, autor do cadastro, QR, observações internas, nota fiscal, pastas e links do Drive não chegam ao cliente.
3. **Funções:** o servidor passa a conferir uma lista fechada de funções para a conta de cliente. A lista começa em **modo observação**, que registra e não recusa nada. A recusa só começa quando a Diretoria liga a chave.
4. **Entrada:** a conta de cliente não entra quando o acesso da empresa está suspenso, quando a empresa está sem acesso ou quando o cadastro dela está inativo. Quem já estava dentro sai em até 5 minutos.

Para a equipe da Metrolabs e para a representada, nada muda.

## 2. Situação de acesso de cada cliente

O sistema calcula a situação todos os dias, pela data, a partir dos contratos:

| Situação | Quando | O que acontece |
|---|---|---|
| Acesso completo (`PLENO`) | Há contrato vigente na data (início ≤ hoje ≤ fim) | O cliente usa tudo |
| Período de carência (`CARENCIA`) | O contrato terminou há até 30 dias e não há outro vigente | O cliente usa tudo e lê o aviso para renovar |
| Somente consulta (`CONSULTA`) | Depois da carência, por 12 meses. Também vale para a conta antiga ainda não revisada (transição) | O cliente entra e vê documentos, equipamentos, histórico e chamados. A restrição de pedido novo, que passa a ser tratado como atendimento avulso, chega na etapa 2 |
| Suspenso pela Metrolabs (`SUSPENSO`) | O Administrador ou a Diretoria suspendeu, com motivo interno | As contas não entram. O cliente lê só "acesso suspenso, fale com a Metrolabs" |
| Sem acesso (`SEM_ACESSO`) | O cliente foi revisado como sem contrato, ou o período de consulta acabou | As contas não entram. O cliente lê o caminho: falar com o Comercial |

Regras do cálculo:

- vale o melhor contrato da unidade, seja do cadastro do portal, seja de Licitações;
- contrato que ainda não começou não conta;
- contrato encerrado antes do fim (distrato ou rescisão) termina na data do encerramento, e a carência começa no dia seguinte;
- o contrato de Licitações entra sozinho quando, em Licitações > Contratos, ele está ligado a um cliente do cadastro. A situação VIGENTE, ENCERRADO ou RESCINDIDO e a vigência vêm de lá. O portal nunca altera esses contratos;
- **decisão 4 do dono:** o cliente que já tem conta de cliente e ainda não tem contrato cadastrado fica em **consulta** até a revisão na aba Pré-carga. Em Regras do portal, a alternativa é dar acesso completo por 60 dias.

## 3. Registrar um contrato

1. Abra Portal do cliente > Contratos de clientes e toque em **Registrar contrato**.
2. Busque o cliente pelo nome ou pelo CNPJ e toque nele.
3. Preencha os campos. Cada um tem a explicação logo abaixo, na tela:

| Campo | O que preencher |
|---|---|
| Cliente | O cadastro único do cliente (Cadastros > Clientes). Busque por nome ou CNPJ. |
| Unidades cobertas | "Todas" ou as unidades que o contrato atende. Só as pessoas dessas unidades usam o portal completo. |
| Número do contrato | O número que está no contrato assinado ou na proposta aprovada. Não se repete no mesmo cliente. |
| Origem | "Proposta aprovada" (escolha a proposta do Comercial), "Contrato assinado fora do sistema" (anexe o PDF) ou "Renovação" (escolha o contrato anterior). |
| Proposta | A proposta aprovada do Comercial que deu origem ao contrato. Se ela não aparece, escreva o número. |
| Contrato anterior | Na renovação, o contrato deste cliente que está sendo renovado. |
| Contrato assinado | PDF de até 10 MB. Fica numa pasta de uso interno e o cliente nunca abre este arquivo. |
| Objeto | Em uma frase, o que o contrato cobre. |
| Serviços e periodicidade | Cada serviço contratado e a frequência (mensal, bimestral, trimestral, semestral, anual ou sob demanda). Servirá para o cronograma "Previsto" da etapa 3. |
| Início e fim da vigência | Primeiro e último dia do contrato. No dia seguinte ao fim começa a carência. |
| Renovação automática | Marque se o contrato renova sozinho. O sistema nunca prorroga sem alguém registrar a renovação. |
| Responsável | Quem da Metrolabs acompanha o contrato e receberá os avisos de vencimento. |
| Motivo | Por que o contrato está sendo registrado ou alterado. Precisa de pelo menos 10 letras e fica no histórico. |

4. Toque em **Registrar o contrato**. Quando falta algo, cada campo mostra o que corrigir e nada é gravado.

**Corrigir:** na ficha do cliente, toque em **Corrigir** no contrato. Cada gravação vira uma versão, e o histórico guarda o antes, o depois, quem fez, quando e o motivo. **Encerrar:** toque em **Encerrar** e informe a data e o motivo. **Renovar:** registre um contrato novo com a origem "Renovação". Nada é apagado.

### 3.1 Como cadastrar o contrato do piloto

O piloto definido pelo dono é a **CENTRAL DE REPROCESSAMENTO DE MATERIAIS LTDA** (CNPJ 01.129.614/0001-30), com 1 unidade, 39 equipamentos e nenhuma conta de cliente. Hoje ela está **Sem acesso**: não tem conta nem contrato.

1. Portal do cliente > Contratos de clientes > **Registrar contrato**. Busque "CENTRAL DE REPROCESSAMENTO" ou "01129614".
2. Em Unidades cobertas, deixe **Todas**, porque a central tem uma unidade só.
3. Preencha o número e a origem do contrato assinado (anexe o PDF) ou da proposta aprovada, o objeto, os serviços com a frequência, o início e o fim da vigência e o responsável. No motivo, escreva "Contrato do piloto do Portal do cliente".
4. Grave. A situação passa a **Acesso completo** até a data do fim.
5. Depois disso, o convite de acesso é enviado pelo caminho de sempre: Cadastros > Clientes > Mais > Enviar acesso ao portal.

## 4. Pré-carga: revisar os clientes antigos

A aba **Pré-carga** lista os clientes que têm conta de cliente ou alguma pista de contrato:

- prazo de atendimento em Regras da assistência > Contratos;
- ronda com referência de contrato;
- proposta aprovada com item de contrato.

Nada é criado sozinho. Para cada cliente:

- **Registrar contrato**, quando há contrato;
- **Revisado: sem contrato**, com motivo, quando não há. As contas dele deixam de entrar;
- **Desfazer revisão**, com motivo, quando a revisão foi um engano.

Enquanto o cliente não é revisado, quem tem conta fica em consulta, na transição.

## 5. Suspender e reativar (Administrador e Diretoria)

Na ficha do cliente, escreva o motivo, que é interno, e toque em **Suspender o acesso**. As contas do cliente não entram mais e quem estiver dentro sai em até 5 minutos. O cliente lê só "O acesso da sua empresa ao Portal está suspenso. Fale com a Metrolabs". Para voltar, escreva o motivo e toque em **Reativar o acesso**. A suspensão é sempre manual. Não existe ligação automática com o Financeiro nem com o Omie (decisão 13).

## 6. Segurança das contas de cliente (lista fechada de funções)

A aba **Segurança** mostra cada função do servidor que as contas de cliente chamaram, com contagem, pessoas, clientes e se a função está na lista do portal.

Desde a etapa 6, a mesma aba tem o painel **"Pronto para ligar?"**, a **Trava do legado** e a **Lista usada pelo servidor** (transição ou mínima), todas desligadas por padrão. Veja a seção 28.

- **Modo observação (padrão; a chave de recusa nasce DESLIGADA):** o sistema registra o que as contas de cliente chamam e não recusa nada. O período é de **7 dias**, configurável de 1 a 60, e conta a partir da primeira chamada registrada. Terminado o período, a tela avisa.
- **Lista inicial:** o básico da sessão e da segurança do acesso (entrada, saída, código, troca de senha, "Esqueci minha senha") e as funções das telas do cliente: `Assistencia_api`, `LavCiclo_api`, `PortalCliente_api`, cadastros (clientes, unidades, equipamentos, documentos, painel de cadastros) e a ajuda.
- **Funções que nunca entram:** as dos módulos internos (Comercial, Financeiro/Omie, Conduta, bate-papo, Licitações, Compras, Ganhos, Depósito de viagem, Frota, Ponto, Gestão, Usuários, Acessos e outros). Nem a Diretoria consegue acrescentá-las.

**Como ligar a recusa (instrução para a Diretoria):**

1. Confira que o servidor está com o patch da etapa 0 aplicado (`output/portal-cliente-20261116/etapa0/servidor/etapa0-servidor.patch`). Sem o patch, nada é observado nem recusado: a tabela fica vazia.
2. Espere o fim da observação (7 dias) e abra a aba Segurança.
3. Veja as funções marcadas **"Não"** na coluna "Na lista". Se o cliente precisa de alguma, escreva o nome em **Acrescentar função à lista**, preencha o motivo e grave.
4. Em **Chave de recusa**, escolha **Ligada (recusar fora da lista)**, escreva o motivo e toque em **Gravar**. A tela pede confirmação.
5. A partir daí, e em até 1 minuto, função fora da lista volta para o cliente com a mensagem: "Esta função é da equipe Metrolabs e não faz parte do Portal do cliente. Por quê: ... O que fazer: ...". Cada recusa fica registrada.

Para voltar atrás, escolha **Desligada (observar)**, escreva o motivo e grave. Cada mudança fica no histórico das regras (`PCL_REGRAS_HIST`).

Detalhe técnico: o servidor Node consulta `PortalCliente_portaoFuncao_` no `/api/run` quando a sessão é de cliente e guarda a decisão por 60 segundos, por sessão e função. Por isso, a coluna "Chamadas" conta no máximo uma chamada por minuto, por função e pessoa.

## 7. Trava de arquivo da conta de cliente

A rota `/arquivos/<id>` abre para a conta de cliente **só** o que está numa destas regras, sempre do próprio cliente:

- arquivo do Arquivo de documentos do cliente;
- relatório da O.S. encerrada e as versões emitidas dela (nunca o rascunho nem a versão interna);
- orçamento enviado ao cliente (emitido, aprovado, recusado ou em ajuste) e o comprovante de aprovação;
- foto do técnico liberada ao cliente;
- anexo liberado ao cliente no pedido ou no chamado;
- documento A4 na versão do cliente;
- relatório do ciclo da lavadora e da ronda, pelas regras de cada módulo.

Qualquer outro arquivo é recusado: de outro cliente, contrato assinado, nota fiscal, versão interna ou arquivo de outro módulo. Com o acesso suspenso ou sem acesso, nada abre. Cada recusa fica em `PCL_ACESSOS` com a ação `ESCOPO_RECUSADO`, para detectar tentativa de acesso a dado alheio.

## 8. Regras do portal (Administrador e Diretoria)

| Campo | O que é |
|---|---|
| Dias de carência | Dias de acesso completo depois do fim do contrato (padrão 30). Vale também para a vigência da representada. |
| Meses de consulta | Meses de consulta depois da carência (padrão 12). |
| Contas antigas sem contrato | "Somente consulta até a revisão" (decisão do dono) ou "Acesso completo por 60 dias". |
| Contato comercial | Como o cliente fala com o Comercial. Aparece nas mensagens de carência, consulta, suspensão e sem acesso. |
| Motivo | Por que as regras mudam. Fica no histórico. |

## 9. Representação: a vigência do contrato passa a valer

A representada passa a ser tratada como ativa só quando a SITUACAO é ATIVA **e** a data de fim da vigência (Representação > Representadas) não passou além da carência (a mesma do Portal do cliente, padrão 30 dias). Sem data de fim, vale só a SITUACAO, como antes. Passada a carência, a conta da representada não entra e lê: "o contrato de representação da (empresa) com a Metrolabs terminou em dd/mm/aaaa e o prazo de carência acabou em dd/mm/aaaa. O que fazer: fale com a Metrolabs para renovar o contrato". **Antes de publicar, confira a data de fim da vigência de cada representada cadastrada.**

## 10. Quem pode (caixas em Administração > Acessos, grupo "Portal do cliente")

| Caixa | Padrão |
|---|---|
| Ver contratos de clientes (`PORTAL_CLIENTE_CONTRATOS_VER`) | Administrador, Diretoria, gestores e gestão comercial |
| Registrar e alterar contrato de cliente (`PORTAL_CLIENTE_CONTRATOS_EDITAR`) | Administrador, Diretoria e gestão comercial |
| Suspender e reativar o acesso de um cliente (`PORTAL_CLIENTE_SUSPENDER`) | Administrador e Diretoria |
| Alterar as regras do portal (`PORTAL_CLIENTE_REGRAS`) | Administrador e Diretoria |
| Enviar acesso ao cliente (`USUARIOS_CLIENTES_ENVIAR_ACESSO`, a caixa do convite, grupo "Contas e acessos"). Desde 18/11/2026 vale também para toda a aba Acessos de clientes | Dono, Administrador, Diretoria e Gestor |
| Responder pedidos e conversas do portal (`PORTAL_CLIENTE_CONVERSAR`, etapa 2): aba "Conversas do portal", parte "Portal do cliente" da ficha do chamado, nota interna e retirada de anexo | Equipe interna da área Técnica, gestores, Diretoria e Administrador |
| Ocultar ou liberar documento no portal (`PORTAL_CLIENTE_DOC_LIBERAR`, etapa 3): aba "Documentos no portal" e a marca de cada documento do Arquivo de documentos | Gestão da área Técnica e da Qualidade, Diretoria e Administrador |
| Ver o uso do portal e o registro de acessos (`PORTAL_CLIENTE_USO_VER`, etapa 5): aba "Uso do portal", com a linha do tempo de cada pessoa do cliente (com IP) e a planilha | Administrador, Diretoria e gestores |

O dono sempre tem todas. As contas de fora, de cliente e de representada, nunca têm caixa.

## 11. Tabelas

- `CLI_CONTRATOS`: contratos de clientes privados, um por linha, com a versão atual.
- `CLI_CONTRATOS_HIST`: só inclusão. Guarda registro, correção, renovação, encerramento, suspensão, reativação e revisão da pré-carga, com antes, depois, motivo, quem e quando.
- `PCL_ACESSOS`: só inclusão. Guarda a entrada recusada, o arquivo recusado (`ESCOPO_RECUSADO`) e a função recusada.
- `PCL_FUNCOES_OBSERVADAS`: uma linha por dia, função e pessoa, com a contagem.
- `PCL_REGRAS_HIST`: as mudanças das regras e da lista de funções.
- Etapa 1 (18/11/2026): `PCL_PEDIDOS_EQUIPE`, `PCL_TERMOS_ACEITE` e `PCL_CONTAS_HIST` (seção 23.9) e as colunas `CLIENTE_*` em `CAD_USUARIOS`.
- Etapa 2 (18/11/2026): `PCL_MENSAGENS`, `PCL_ANEXOS` e `PCL_AVISOS_FILA` e as colunas novas de `ATEC_SOLICITACOES` e `ATEC_CHAMADOS` (seção 24.9).
- Etapa 3 (18/11/2026): as colunas `PORTAL`, `PORTAL_MOTIVO`, `PORTAL_POR_NOME` e `PORTAL_EM` em `DOC_DOCUMENTOS` (seção 25.8). Nenhuma tabela nova.
- Etapa 4 (18/11/2026): `PCL_AVISOS_ENVIOS`, o registro dos avisos ao cliente já enviados (seção 26.8).
- Etapa 5 (18/11/2026): a coluna `UNIDADES_JSON` em `REP_DOCUMENTOS` (relatório do período filtrado por unidade, seção 27.3). Nenhuma tabela nova.

As datas são gravadas como texto (aaaa-mm-dd), e nenhuma resposta da tela leva data crua.

## 12. Problemas comuns

| Situação | O que fazer |
|---|---|
| O cliente diz que não consegue entrar | Abra a ficha dele. A situação mostra o porquê: suspenso, sem acesso ou cadastro inativo. Registre ou renove o contrato, reative o acesso ou reative o cadastro em Cadastros > Clientes. |
| Um documento do cliente não abre para ele | O arquivo precisa estar registrado no Arquivo de documentos do cliente ou ligado a uma O.S., a um orçamento ou a um relatório dele. Registre o documento no Arquivo de documentos. |
| Depois de ligar a recusa, um cliente diz que uma tela parou | Na aba Segurança, veja a função com "Recusadas". Se o cliente precisa dela, acrescente à lista com motivo. |
| O contrato de licitação não aparece | Vincule o cliente ao contrato em Licitações > Contratos. |

<div style="text-align: justify">

## 13. Vigência provisória: "contrato a cadastrar" até 31/12/2026

**Decisão do dono (17/11/2026):** "A Brasmedical cola final de 2027. Os outros clientes coloca final de 2026."

- O cliente que tem conta de cliente, ou que tem pista de contrato na pré-carga (prazo em Regras da assistência, ronda com referência de contrato ou proposta aprovada com item de contrato), e que **não tem nenhum contrato cadastrado** fica com **acesso completo até 31/12/2026**.
- Não é um contrato: o sistema não inventa número nem objeto. Em todas as telas internas (lista, ficha, pré-carga, Cadastros > Clientes e o chamado da Assistência) aparece o selo **"contrato a cadastrar"**.
- O cliente não lê a palavra "provisório". No portal aparece "Acesso completo" e, em "Meu contrato", a frase "O contrato da sua empresa com a Metrolabs está em formalização. O acesso completo ao Portal está garantido até 31/12/2026."
- A régua avisa a gestão comercial (evento CT04 e um item na central de pendências) para cadastrar o contrato real de cada cliente antes da data. Uma tarefa em Minhas atividades vai para a gestão comercial.
- Depois de 31/12/2026, o cliente que continua sem contrato volta à regra das contas antigas (somente consulta até a revisão na pré-carga). O cliente marcado "Revisado: sem contrato" fica sem acesso, mesmo dentro da provisória.
- **Representadas:** continuam com a vigência do próprio cadastro (Representação > Representadas). A Brasmedical vai até 31/12/2027.
- **Como mudar:** em Regras do portal, campo "Vigência provisória dos clientes sem contrato até" (Administrador e Diretoria, com motivo). Em branco, a regra fica desligada. A decisão do dono fica registrada no histórico das regras, com o motivo.

## 14. Campo do contrato: condições comerciais e prazos

O formulário do contrato ganhou o bloco "Condições comerciais e prazos". Todos os campos são opcionais, menos a data-base quando há índice do Banco Central. Campo que não vem no formulário fica como estava: a gravação nunca apaga o que já estava gravado.

| Campo | O que preencher | Para que serve |
|---|---|---|
| Contato do contrato | A pessoa do cliente que trata o contrato | Recebe os avisos de renovação |
| E-mail do contato | O e-mail dela | Sem ele, o aviso vai ao contato principal do cliente ou ao e-mail do cadastro |
| Partes e CNPJ | Contratante e contratada, com os CNPJs | Conferir se o contrato é deste cadastro |
| Valor mensal / Valor total | O valor do contrato (ex.: 4.500,00) | Base do reajuste. Só aparece para quem tem a caixa «Ver valores e reajustes dos contratos» |
| Índice de reajuste | IPCA, IGP-M, INPC, IPCA-E, outro ou sem reajuste | Os quatro primeiros são calculados sozinhos com o Banco Central |
| Data-base do reajuste | A data a partir da qual se contam os 12 meses | Aniversário do reajuste. Obrigatória com índice do Banco Central |
| Aviso prévio (dias) | Os dias de antecedência da cláusula de rescisão ou de não renovação | A régua avisa antes do limite (fim menos estes dias) |
| Prazos de atendimento (SLA) | O que o contrato garante | Aparece no chamado da Assistência para o técnico |
| Multas, Obrigações relevantes | O que o contrato prevê | Consulta da gestão |

Cada gravação continua virando uma versão no histórico, com antes e depois. Quem não tem a caixa de valores vê no histórico só que o valor mudou, sem o número.

## 15. Ler o contrato com a IA

1. No formulário do contrato, escolha o PDF em "Contrato assinado (PDF)". Para um contrato já gravado com PDF, não precisa escolher de novo.
2. Toque em **"Ler o contrato com a IA"**. A leitura usa a mesma chave dos outros módulos (GEMINI_API_KEY em Administração > Chaves e senhas). Sem a chave, o botão explica o que fazer e o cadastro funciona igual.
3. A IA devolve **sugestões**: número, partes e CNPJ, objeto, serviços e frequência, início e fim, renovação automática, aviso prévio, valor mensal e total, índice, data-base, prazos de atendimento, multas, obrigações, contato, um resumo e os **pontos de atenção** (cláusulas de risco, com a gravidade).
4. Cada sugestão vem com o **trecho do contrato** de onde saiu. Sugestão sem trecho não aparece: a IA não pode inventar. Instruções escritas dentro do PDF são ignoradas.
5. Confira, desmarque o que não servir e toque em **"Aplicar as marcadas ao formulário"**. Os serviços aparecem só como informação: marque-os na lista.
6. Escreva o motivo e grave. **Nada é gravado antes disso.** O resumo e os pontos de atenção ficam no contrato, com a data da leitura e o nome de quem conferiu.

Só quem registra contrato (caixa «Registrar e alterar contrato de cliente») usa a leitura. Cada leitura fica registrada em PCL_ACESSOS, sem o conteúdo.

## 16. Régua de vencimento e avisos

**Onde ver:** aba **Vencimentos e reajustes** (todos os contratos na régua, com os avisos que já saíram) e o bloco "Vencimento e renovação" na ficha do cliente.

**O que entra:**
- os contratos de cliente vigentes, menos os que já foram renovados;
- as representadas ativas, com a vigência do cadastro delas;
- os contratos de Licitações, só para leitura, porque Licitações já avisa o fim, a renovação e o reajuste pela agenda própria; a regra "Mandar também os avisos dos contratos de Licitações" vem desligada;
- os clientes da vigência provisória, num item só.

**Marcos (configuráveis em Regras do portal):**
- vencimento: 120, 90, 60, 30, 15, 7 e 0 dias antes do fim, e "vencido", uma vez, dentro da carência;
- aviso prévio: 30, 15, 7 e 0 dias antes do limite (fim menos os dias de aviso prévio). Este é o alerta mais importante: depois dele, com renovação automática, o contrato renova pela cláusula; sem ela, a comunicação de não renovação perde o prazo;
- cliente: só a partir de 90 dias antes do fim.

**Quem recebe e por onde:**

| Aviso | Quem | Canal |
|---|---|---|
| CT01 vencimento e vencido | Responsável pelo contrato e gestão comercial | E-mail no expediente; WhatsApp só no resumo do dia (regra sutil: dia útil, expediente, vínculo liberado) |
| CT02 aviso prévio | Os mesmos | Os mesmos |
| CT03 aviso ao cliente | Contato do contrato (cliente) ou da representada | Só e-mail. WhatsApp ao cliente depende de modelo aprovado; até lá, não sai |
| CT04 contratos a cadastrar | Gestão comercial | E-mail; WhatsApp no resumo do dia |

Além do e-mail, cada contrato na régua aparece na **central de pendências** e na **Caixa de decisões** (área Comercial), e o responsável recebe **uma tarefa de renovação** em Minhas atividades no primeiro marco. Se já existir oportunidade de renovação aberta, a tarefa não é criada.

**O texto ao cliente** é formal e não traz valores: informa o fim da vigência, o prazo do aviso prévio (quando houver) e o contato comercial das Regras do portal.

**Sem repetir:** cada aviso é gravado em CLI_CONTRATOS_AVISOS com a chave contrato, fim, tipo, marco e público. A mesma chave nunca sai duas vezes. Erro de envio tenta de novo no dia seguinte, até 3 vezes. Se a régua começa tarde (contrato que já está a 50 dias do fim), vale só o marco atual (60); os anteriores ficam registrados como "passou". Mudou o fim do contrato (renovação ou aditivo), a régua recomeça.

**Rotina diária:** a rotina da Assistência (a cada 15 minutos) chama Contratos_rotina_, que roda **uma vez por dia, dentro do expediente**: registra a decisão da provisória, atualiza os índices do Banco Central, propõe e recalcula os reajustes e roda a régua. Quem tem a caixa das regras pode tocar em "Rodar a régua agora" na aba Vencimentos e reajustes; os avisos já enviados não se repetem.

**Oportunidade de renovação:** na régua, toque em "Oportunidade de renovação". O formulário pede unidade, contato principal, valor estimado e a próxima ação. A oportunidade nasce pelas regras do próprio Comercial (funil Engenharia, origem "Cliente da carteira", próxima ação em Minhas atividades), com a referência do contrato. Já existindo uma aberta, o sistema mostra o código e não cria outra.

## 17. Reajuste automático com os índices do Banco Central

<!-- assistente: acesso=sigilo -->
**Índices:** IPCA (série 433), INPC (188), IGP-M (189) e IPCA-E (10764), da API pública do Banco Central (Sistema Gerenciador de Séries Temporais). A rotina consulta uma vez por dia e grava cada mês em FIN_INDICES_ECONOMICOS, com o endereço consultado e a data da coleta. Sem internet, o sistema usa o último valor gravado e diz isso na tela. Nada é estimado: mês que o Banco Central ainda não publicou deixa o reajuste "aguardando o índice".

**Cálculo:**
- aniversário = data-base + 12, 24, 36 meses;
- o sistema calcula 45 dias antes do aniversário (configurável) e recalcula enquanto não houver decisão;
- o período são os 12 meses encerrados no mês anterior ao aniversário (defasagem 1, configurável);
- acumulado = produto de (1 + variação do mês / 100) nos 12 meses, menos 1;
- valor novo = valor atual × fator acumulado, arredondado ao centavo;
- acumulado negativo: o valor é mantido (regra "manter", configurável para "aplicar a redução");
- a memória de cálculo, mês a mês, fica gravada no reajuste.

**Quem faz o quê:**
1. O sistema **propõe**.
2. Só o **dono do sistema e a Diretoria aprovam ou recusam**, de dentro da lista de sigilo, em **Painel financeiro > Reajustes de contratos** (regra "Aprovação só do dono e da Diretoria", em Chaves e senhas > Regras do Financeiro). A recusa exige motivo.
3. Aprovado, o valor do contrato passa ao valor novo (versão nova no histórico, ação "Reajuste aprovado pela Diretoria"). O Financeiro recebe o aviso (CT06, sem valores).
4. O **Financeiro fatura** pelas telas de sempre, com o valor aprovado, a partir da data indicada, e marca "faturado" com o número da nota ou do pedido. **Nada é gravado no Omie automaticamente.**
5. Quem tem a caixa «Ver valores e reajustes dos contratos» (gestão comercial) gera a **carta de reajuste ao cliente** (A4, texto justificado, com a memória de cálculo) depois da aprovação, na ficha do cliente ou na aba Vencimentos e reajustes. A carta abre dentro do SGO+, com "Imprimir ou salvar em PDF".

**Sigilo:** os valores e a memória aparecem só no Painel financeiro (lista de sigilo) e, para o Comercial, com a caixa de valores. Quem não está na lista não vê faturamento nem movimento do Financeiro. Os avisos e as pendências do reajuste levam só a contagem.

## 18. Contrato da representada

Aba **Representadas**. Cada representada mostra a vigência do cadastro, a ficha do contrato, a régua e os reajustes. "Registrar a ficha do contrato" grava número, objeto, PDF (com a leitura pela IA), contato, valores, índice e data-base, aviso prévio, prazos, multas e obrigações, com motivo e histórico. **A vigência não muda aqui:** ela continua no cadastro da representada (Representação > Representadas), que libera o acesso. A ficha fica em CLI_CONTRATOS com PARTE_TIPO = REPRESENTADA e sem cliente; por isso, não entra na situação de acesso de nenhum cliente.

## 19. O contrato em todos os módulos

| Módulo | O que aparece |
|---|---|
| Cadastros > Clientes > Dados | "Contrato e Portal do cliente": situação, selo "contrato a cadastrar", objeto, serviços e renovação. Sem valores |
| Assistência técnica > ficha do chamado | "Contrato do cliente": cobertura, serviços e frequência, prazos do contrato (SLA) e a renovação. Sem valores. Qualquer pessoa da equipe vê |
| Comercial | Oportunidade de renovação pela régua (sem duplicar), tarefa em Minhas atividades, pendências na área Comercial e a carta de reajuste |
| Portal do cliente (Meus chamados) | "Meu contrato com a Metrolabs": número, objeto, serviços, unidades, vigência e o aviso de renovação a partir de 90 dias. Nunca valores, índice ou PDF |
| Representação > Representadas | A vigência continua lá; um aviso leva à ficha do contrato |
| Central de pendências, Caixa de decisões e relatório diário | Itens da régua (área Comercial) e a contagem dos reajustes a aprovar (Diretoria) e a faturar (Financeiro), sem valores |

### 19.1 No Painel financeiro (lista de sigilo)

<!-- assistente: acesso=sigilo -->
Painel financeiro, aba "Reajustes de contratos": índices do mês, acumulados de 12 meses, contratos a reajustar, valor atual e novo, a partir de quando faturar, aprovação e faturado.

## 20. Caixas, regras e tabelas novas

- Caixa nova **«Ver valores e reajustes dos contratos»** (PORTAL_CLIENTE_CONTRATOS_VALORES): valores, memória de cálculo e carta de reajuste. Padrão: Administrador, Diretoria e gestão comercial. Não dá acesso ao Financeiro.
- **Régua de vencimento e reajuste** (propriedade CTR_REGUA, em Regras do portal, com motivo e histórico): marcos, marcos do aviso prévio, avisar o cliente a partir de, avisar o cliente sim ou não, avisos de Licitações, tarefa de renovação, antecedência e defasagem do reajuste, acumulado negativo.
- **Vigência provisória** (PCL_REGRAS.provisoriaAte, padrão 31/12/2026).
- Tabelas: CLI_CONTRATOS (colunas novas de condições e da IA), CLI_CONTRATOS_AVISOS (avisos enviados), CLI_CONTRATOS_REAJUSTES (reajustes, com a memória) e FIN_INDICES_ECONOMICOS (índices do Banco Central).
- Eventos novos na matriz de avisos: CT01 a CT06.

## 21. Problemas comuns (contratos, régua e reajuste)

| Situação | O que fazer |
|---|---|
| A leitura pela IA está indisponível | Falta a chave da IA (GEMINI_API_KEY em Administração > Chaves e senhas). Preencha olhando o PDF; o cadastro funciona igual |
| O cliente não recebeu o aviso de renovação | Na aba Vencimentos e reajustes, a coluna "Avisos já enviados" diz o motivo. Normalmente falta o e-mail do contato do contrato |
| O cliente aparece com "contrato a cadastrar" | Cadastre o contrato real antes de 31/12/2026, ou marque "Revisado: sem contrato" na pré-carga |

### 21.1 Problemas do reajuste (lista de sigilo)

<!-- assistente: acesso=sigilo -->
| Situação | O que fazer |
|---|---|
| O reajuste está "aguardando o índice" | O Banco Central ainda não publicou um mês do período. O sistema recalcula sozinho; nada é estimado |
| O reajuste não aparece | O contrato precisa de índice do Banco Central, data-base e valor. O Painel financeiro lista os contratos que o sistema não calcula e o motivo |
| "Você não aprova nem recusa reajustes" | Só o dono e a Diretoria aprovam, por decisão do dono. Peça a eles em Painel financeiro > Reajustes de contratos |
| A carta de reajuste não sai | Ela sai só depois da aprovação da Diretoria, e com a caixa de valores |

## 22. O que preencher em cada campo (novos)

- **Ler o contrato com a IA:** escolha o PDF e toque no botão. As sugestões vêm com o trecho do contrato; nada é gravado sem você tocar em gravar.
- **Mostrar (Vencimentos e reajustes):** "na régua agora" traz só os contratos num marco de aviso; "todos" traz também os vigentes longe do fim.
- **Unidade, Contato principal, Valor estimado, Próxima ação, Data e Hora (oportunidade de renovação):** os mesmos campos da oportunidade do Comercial; a próxima ação vira atividade em Minhas atividades.
- **Vigência provisória dos clientes sem contrato até:** padrão 31/12/2026; em branco, desliga.
- **Marcos do vencimento e marcos do aviso prévio:** números de dias separados por vírgula.
- **Avisar o cliente a partir de:** padrão 90 dias antes do fim.

### 22.1 Campos do reajuste (lista de sigilo)

<!-- assistente: acesso=sigilo -->
- **Propor o reajuste com antecedência de, Defasagem do índice e Acumulado negativo:** padrões 45 dias, 1 mês e "manter o valor".

## 23. Acessos de clientes (etapa 1, 18/11/2026)

A etapa 1 deixa várias pessoas de um mesmo cliente usarem o Portal, cada uma com um papel e com as unidades em que atua. O convite continua sendo o de sempre ("Enviar acesso ao cliente"): link de uso único, com validade, e a senha é criada pela própria pessoa. O portal não cria outro mecanismo de senha; ele acrescenta o papel e as unidades e confere o contrato antes de deixar enviar.

### 23.1 Papéis

| Papel | Abre chamado | Responde orçamento | Confirma atendimento | Documentos e equipamentos | Minha equipe |
|---|---|---|---|---|---|
| Gestor do cliente | sim | sim | sim | todas as unidades marcadas (ou todas) | vê, pede inclusão e desliga |
| Solicitante | sim, nas unidades dele | não | só os que ele abriu | das unidades dele | não |
| Consulta | não | não | não | das unidades dele | não |

**Unidades.** Nenhuma unidade marcada quer dizer todas, e isso só vale para o Gestor do cliente. Solicitante e Consulta precisam de pelo menos uma unidade. Um registro de outra unidade, ou de outra empresa, recebe a mesma resposta de um registro que não existe, e a tentativa fica no registro de acessos como `ESCOPO_RECUSADO`. A regra vale em Equipamentos, Unidades, Arquivo de documentos, no painel de cadastros, nos arquivos (rota `/arquivos`) e em "Meus chamados" (chamados, pedidos, orçamentos, relatórios, rondas, Kanban e Gantt).

**Conta antiga sem papel.** Ela vale como Gestor do cliente com todas as unidades, para que nada mude no dia da publicação, e aparece na tela com o selo **"papel não revisado"**. A Metrolabs revisa com "Mudar papel".

### 23.2 Convidar uma pessoa

1. Abra **Portal do cliente > Acessos de clientes** e escolha o cliente (ou busque pelo nome ou CNPJ).
2. Preencha nome, e-mail de trabalho, cargo, papel e unidades e toque em **Enviar convite**.
3. A pessoa recebe o e-mail do convite; o gestor do cliente recebe um aviso de que ela foi convidada.

O convite só sai quando a situação de acesso do cliente é **Acesso completo** ou **Período de carência**, e quando o contrato cobre as unidades marcadas. Nas outras situações, a faixa amarela diz o motivo e o caminho: cadastrar ou renovar o contrato em Portal do cliente > Contratos. A mesma trava vale para o "Enviar acesso ao cliente" de Administração > Usuários e de Cadastros > Clientes. A regra pode ser desligada em Regras do portal ("Convite só com contrato"), com motivo; o padrão recomendado é ligada.

Se o e-mail do convite falhar depois de a conta ser criada, o papel e as unidades já ficam gravados. Use **Reenviar convite** quando o e-mail voltar a funcionar.

### 23.3 Pedido do Gestor do cliente

O Gestor do cliente não inclui pessoas sozinho. Em "Minha conta e equipe" > **Minha equipe**, ele preenche nome, e-mail, cargo, papel, unidades e motivo e toca em **Pedir acesso**. O pedido aparece:

- na ficha do cliente, em "Pedidos do gestor deste cliente";
- na Caixa de decisões e na central de pendências de quem gere acessos (`pcl_pedido_equipe`, aviso PI02 por e-mail).

**Enviar o convite** atende com um toque, pelo mesmo convite. **Recusar** pede a resposta ao gestor, que ele lê em "Minha equipe" e por e-mail. O gestor pode ter no máximo 10 pedidos aguardando.

### 23.4 Mudar papel, unidades e e-mail

Só a Metrolabs faz, sempre com motivo. Cada mudança fica no histórico da conta (`PCL_CONTAS_HIST`, com antes e depois) e no registro de acessos. A pessoa e o gestor do cliente recebem um e-mail (PC09) com o papel e as unidades novos. O papel vale a partir da próxima tela que a pessoa abrir.

**Trocar e-mail** muda o login, encerra as sessões abertas e manda um convite novo para o e-mail novo. O link anterior deixa de valer, porque cada pessoa tem um só link vivo. O e-mail antigo recebe o aviso de troca.

### 23.5 Desligar e reativar

- **Pelo Gestor do cliente:** "Desligar acesso" em Minha equipe, com motivo. A conta é inativada na hora, as sessões abertas caem na próxima chamada e a Metrolabs é avisada (PI02). O gestor não desliga o próprio acesso.
- **Pela Metrolabs:** "Desligar", com motivo. Mesmo efeito.
- **Fim do contrato:** quando a situação do cliente vira **Sem acesso** (consulta encerrada ou revisado sem contrato), a rotina diária inativa as contas com o motivo "Fim do contrato". Depois da renovação, a Metrolabs reativa cada conta.
- **Reativar:** só com o cliente numa situação que entra (completo, carência ou consulta). A pessoa entra com a senha que já tinha; se não lembrar, use "Reenviar convite".

A pessoa desligada e o gestor recebem um e-mail neutro, sem o motivo. O motivo fica só no histórico da conta.

### 23.6 Contas paradas: 90 e 120 dias

A rotina diária (junto com a régua dos contratos, no expediente) confere a última entrada de cada conta:

- **90 dias sem entrada:** quem gere acessos recebe o aviso PI04, uma vez por período, e a conta aparece na Caixa de decisões (`pcl_conta_inativa`).
- **120 dias sem entrada:** a conta é inativada, **a menos que alguém tenha marcado "manter"**.

A contagem começa no dia da publicação desta etapa (ninguém cai no primeiro dia por causa de um acesso antigo). Convite novo, reativação e a própria entrada reiniciam a contagem. Os prazos ficam em Regras do portal.

### 23.7 Termo de uso

No primeiro acesso, a pessoa vê o **Termo de uso do Portal do cliente** e só continua depois de marcar "Li o termo de uso e estou ciente". O aceite fica em `PCL_TERMOS_ACEITE` com a versão, a data, o endereço IP e o navegador do login (vindos do servidor, não da tela). Quando o texto muda em Regras do portal, a versão muda e todos aceitam de novo na próxima entrada.

O texto padrão cobre a finalidade, os dados tratados e a base legal (Lei 13.709/2018, art. 7º, incisos V e II), a guarda do registro (2 anos), os cuidados com dados de pacientes e os direitos do titular. **O contato do encarregado de dados é informado pelo dono** em Regras do portal ("Contato do encarregado de dados"); em branco, o termo orienta a responder ao e-mail do convite.

Enquanto o termo não é aceito, o servidor recusa as ações do portal que gravam algo (pedido de atendimento, resposta de orçamento, confirmação, Minha equipe e Meus dados), com a mensagem do caminho.

### 23.8 Minha conta e equipe (o que o cliente vê)

- **Meus dados:** nome, cargo e telefone (editáveis), e-mail (só leitura), o papel e as unidades, as preferências dos avisos PC06, PC07 e PC08 e o termo aceito, com "Ver termo".
- **Minha equipe (só Gestor do cliente):** as pessoas da empresa com papel, unidades, situação e última entrada; o pedido de inclusão; os pedidos e as respostas; o registro de ações da empresa, **sem IP e sem navegador**, com as ações da equipe da Metrolabs mostradas como "Metrolabs".
- Em "Meus chamados", o Solicitante e a Consulta veem só as unidades deles. A Consulta não vê o botão "Pedir atendimento". Quem não é Gestor vê o orçamento só para consulta, com o nome do gestor que aprova.

### 23.9 Regras, tabelas e avisos

**Regras do portal (Administrador e Diretoria, com motivo e histórico):** convite só com contrato (padrão sim), aviso de conta parada (padrão 90 dias), inativar a conta parada (padrão 120 dias), inativar no fim do contrato (padrão sim), contato do encarregado de dados e o texto do termo de uso.

**Tabelas novas:** `PCL_PEDIDOS_EQUIPE` (pedidos dos gestores), `PCL_TERMOS_ACEITE` (aceites, só inclusão) e `PCL_CONTAS_HIST` (histórico de cada conta, só inclusão). **Colunas novas em `CAD_USUARIOS`, por acréscimo:** `CLIENTE_PAPEL`, `CLIENTE_UNIDADES_JSON`, `CLIENTE_CARGO`, `CLIENTE_TELEFONE`, `CLIENTE_AVISOS_JSON`, `CLIENTE_CONVIDADO_POR_ID/NOME`, `CLIENTE_DESLIGADO_EM/POR_NOME/MOTIVO`, `CLIENTE_ULTIMA_ENTRADA_EM`, `CLIENTE_REATIVADO_EM/POR_NOME`, `CLIENTE_MANTER`, `CLIENTE_MANTER_POR_NOME/EM` e `CLIENTE_INATIVIDADE_AVISO_EM`.

**Avisos (matriz):** PC09 (acesso do cliente: convite, papel alterado, desligado e reativado; só e-mail, na hora), PI02 (pedido de inclusão e desligamento pelo cliente, para quem gere acessos) e PI04 (contas paradas). Nenhum aviso ao cliente sai por WhatsApp. Desde a etapa 4, o assunto chega como "Metrolabs — ...", sem o prefixo "SGO+ | " (seção 26.1).

**Registro de acessos (`PCL_ACESSOS`):** entrada, saída, recusa, aceite do termo, dados alterados, convite, papel alterado, e-mail trocado, desligamento, reativação, pedido de inclusão e toda tentativa fora do escopo.

### 23.10 Problemas comuns (acessos)

| Situação | O que fazer |
|---|---|
| "Enviar convite" está travado | O cliente está sem contrato vigente ou em consulta. Cadastre ou renove o contrato em Portal do cliente > Contratos |
| A pessoa diz que não vê uma unidade | Confira as unidades marcadas na conta, em "Mudar papel". Solicitante e Consulta veem só as unidades marcadas |
| A pessoa diz que a tela pede o termo de uso | É o primeiro acesso ou o texto mudou. Ela lê e toca em "Li e estou ciente" |
| Uma conta foi inativada por falta de entrada e ainda é usada | Reative com o motivo e marque "manter" |
| O gestor do cliente desligou alguém por engano | Reative a conta com o motivo; a pessoa entra com a senha que já tinha |

## 24. Chamados pelo Portal (etapa 2, 18/11/2026)

A conta de cliente ganhou a tela **Portal do cliente > Chamados**, com três abas: "Chamados" (lista, Kanban e Gantt), "Abrir chamado" e "Conversa geral". O botão "Pedir atendimento" de "Meus chamados" passou a abrir o mesmo formulário. A equipe da Metrolabs continua tratando os pedidos em Assistência técnica > Solicitações dos clientes, agora com tudo o que o cliente informou, e responde às mensagens na aba nova **Conversas do portal** ou na parte "Portal do cliente" da ficha do chamado.

### 24.1 Abrir chamado (o que o cliente preenche)

O formulário tem cinco passos: 1) Equipamento, 2) Problema, 3) Contato no local, 4) Fotos e 5) Conferir e enviar. O servidor confere cada campo e devolve a lista do que falta, com o campo marcado em vermelho e o que preencher.

| Passo | Campos | Regra |
|---|---|---|
| Equipamento | Unidade, equipamento (ou "Equipamento não está na lista" com a descrição), setor | Só as unidades e os equipamentos ativos do acesso da pessoa. Equipamento de outra unidade ou de outro cliente recebe "Não encontrado. Atualize a lista." e a tentativa fica registrada (`ESCOPO_RECUSADO`) |
| Problema | O que está acontecendo (30 letras ou mais), desde quando, código no visor (ou "Não exibe código"), situação do equipamento (Parado, Funciona com limitação ou Funcionando), risco de continuar usando, o que já foi tentado | O cliente **não escolhe a prioridade**: a triagem define P1 a P4 ao aceitar |
| Contato no local | Nome, telefone com DDD, e-mail, melhor horário e o número interno do cliente | Telefone com 10 ou 11 números; e-mail válido |
| Fotos | Fotos do equipamento e do visor (até 10), da etiqueta (até 3) e um vídeo | Foto recomendada, não obrigatória (decisão 10a). Imagem e PDF até 10 MB; vídeo até 8 MB nesta etapa. Tipo conferido no servidor. Aviso fixo: não fotografar pacientes, prontuários nem documentos de pessoas |

**Pedido repetido.** Se o equipamento já tem pedido ou chamado aberto, a tela mostra o atendimento e pergunta "É o mesmo problema?". "Sim" leva para a conversa daquele atendimento; "Não, é outro problema" abre o pedido mesmo assim.

**Limites.** Até 20 pedidos por pessoa por dia e 60 mensagens por hora (Regras do portal). Passou do limite, a mensagem diz o quê, por quê e o que fazer.

**Fora do expediente.** A resposta diz que o pedido foi recebido e que a análise acontece no próximo horário útil. Com o equipamento parado, mostra também o telefone de plantão, se ele estiver cadastrado em Regras do portal.

### 24.2 Quem abre (papel e contrato)

- **Gestor do cliente e Solicitante** abrem; a **Consulta** não abre (recusa no servidor, com o papel e o caminho na mensagem).
- Com o contrato vigente ou em carência (PLENO ou CARENCIA), o pedido é normal e leva o contrato da unidade (`CONTRATO_ID`).
- Em **modo consulta** (CONSULTA), o botão vira **"Pedir atendimento avulso"**: o pedido entra marcado `SEM_CONTRATO`, sem contrato, e a Metrolabs envia o orçamento antes de atender (decisão 3). O chamado recebe no histórico a orientação "orçar antes de atender".
- Termo de uso pendente trava os envios até o aceite.

### 24.3 O que a Metrolabs faz com o pedido

Em Assistência técnica > Solicitações dos clientes, o cartão do pedido do portal mostra: o papel de quem pediu, o contrato (ou "atendimento avulso: orçar antes"), o setor, o contato no local, a situação informada, o melhor horário, o número interno do cliente, as fotos e o **prazo para responder** (padrão 240 minutos úteis, em Regras do portal). As ações:

- **Aceitar (vira chamado):** pelo `AstC_converter_` de sempre, com a prioridade escolhida na hora. O prazo de atendimento é o do contrato quando ele está em Regras da assistência > Contratos (`SLA_FONTE = CONTRATO`); o chamado recebe o `CONTRATO_ID` do pedido. O cliente vê "Pedido aceito: virou o chamado ..." e recebe e-mail (PC02).
- **Pedir complemento:** o pedido volta ao cliente com a pergunta (etapa "Complemento pedido") e o prazo fica pausado até a resposta. O cliente responde na ficha, com fotos se quiser.
- **Recusar com motivo:** o cliente lê o motivo na ficha e recebe e-mail. Escreva de forma clara e profissional.
- **Conversa com o cliente:** abre, no próprio cartão, o relato, as fotos e a conversa, com resposta e nota interna.

O equipamento "fora da lista" entra marcado assim; cadastre o equipamento ao converter, pela regra do cadastro.

### 24.4 As 8 etapas que o cliente vê

| n | Etapa | Situações internas |
|---|---|---|
| 1 | Recebido | pedido NOVA; chamado ABERTO |
| 2 | Complemento pedido | pedido COMPLEMENTO |
| 3 | Em análise | EM_TRIAGEM, AGUARDANDO_CLIENTE, LAUDO, AGUARDANDO_REPRESENTADA e AGUARDANDO_ORCAMENTO sem orçamento enviado |
| 4 | Aguardando sua aprovação | AGUARDANDO_ORCAMENTO com orçamento enviado ao cliente |
| 5 | Aguardando peça | AGUARDANDO_PECA |
| 6 | Visita agendada | PLANEJADO, AGENDADO, EM_DESLOCAMENTO |
| 7 | Em atendimento | NO_LOCAL, EM_EXECUCAO, PAUSADO, DOC_PENDENTE |
| 8 | Concluído | RESOLVIDO_REMOTO, ENCERRADO, AGUARDANDO_ENCERRAMENTO |
| 0 | Recusado ou cancelado | pedido DESCARTADA ou CANCELADA; chamado CANCELADO (com o motivo) |

A tela antiga "Meus chamados" e os documentos A4 continuam com as 5 etapas de antes até a troca definitiva (etapa 6).

**Ficha do chamado:** número, equipamento, unidade, setor, contato, o relato enviado, a etapa e a linha do tempo pública (autor interno aparece como "Metrolabs"), o prazo do contrato e se está dentro dele (só quando o prazo veio do contrato), a data da visita e o **nome do técnico só nas etapas 6 e 7, com a visita agendada ou em andamento** (nome e sobrenome, sem telefone), o número da O.S., o orçamento (resposta só do Gestor do cliente), o relatório da O.S. na versão do cliente, a galeria (fotos do cliente e fotos do técnico liberadas para o cliente) e a conversa. O cliente **nunca** recebe prioridade, triagem, fila livre, prazo interno, custo, casos, compras nem nota interna.

### 24.5 Conversa

Uma conversa por pedido e por chamado (a do chamado junta a do pedido que deu origem a ele) e a **conversa geral** do cliente, para assuntos fora de um chamado. A mensagem da Metrolabs aparece para o cliente com o primeiro nome seguido de "(Metrolabs)". A **nota interna** fica só para a equipe. A mensagem do cliente avisa quem faz a triagem e o técnico do chamado (PI06). A Consulta só lê. Anexo: foto ou PDF de até 10 MB.

### 24.6 Cancelar antes da visita

O cliente cancela, com motivo (10 letras ou mais), o pedido em "Recebido" ou "Complemento pedido" e o chamado ainda sem técnico a caminho (ABERTO, EM_TRIAGEM, AGUARDANDO_ORCAMENTO, AGUARDANDO_PECA, PLANEJADO e AGENDADO). Depois disso, só pela conversa. O Solicitante cancela só o que abriu. Quem faz a triagem, a gestão da área Técnica e o técnico do chamado são avisados (PI07).

### 24.7 Aceite do atendimento

Com o chamado encerrado (concluído depois da publicação desta etapa), a ficha mostra:

- **"Confirmar atendimento"**, com comentário opcional (`CLIENTE_ACEITE_TIPO = CONFIRMADO`);
- **"O problema continua"**, com o relato obrigatório (30 letras ou mais): abre um **pedido novo ligado ao chamado** (`REABRE_CHAMADO_ID`), o chamado fica `REABERTO`, a gestão da área Técnica recebe o aviso PI03 e a Caixa de decisões mostra "O problema continua". Ao aceitar o pedido, o chamado novo entra como reincidência (mesmo equipamento em 30 dias);
- sem resposta em **5 dias úteis**, a rotina marca "confirmado por prazo" (`PRAZO`). O prazo é configurável em Regras do portal.

O chamado de representada continua com o fluxo próprio (confirmação no mesmo chamado).

### 24.8 Avisos

- **Ao cliente, só por e-mail** (nunca WhatsApp): PC01 "Pedido recebido", na hora, para quem abriu e para o contato no local; PC02 "Pedido aceito", "falta uma informação" e "não pôde ser atendido", no horário comercial (fora dele, o e-mail espera na fila `PCL_AVISOS_FILA` e sai na rotina seguinte dentro do expediente).
- Visita (PC03), orçamento (PC04), conclusão (PC05) e o resumo das mensagens da Metrolabs (PC06) chegam pela etapa 4 (seção 26). O PC02 também vai aos gestores do cliente da unidade desde a etapa 4.
- **Internos:** AT09 (pedido novo, para quem faz a triagem), PI03 (o problema continua), PI06 (mensagem do cliente) e PI07 (cancelamento pelo cliente). Pendências na Caixa de decisões: `pcl_pedido`, `pcl_pedido_vencido` e `pcl_reaberto`.

### 24.9 Regras, tabelas e caixas

**Regras do portal > Chamados do portal (Administrador e Diretoria, com motivo):** telefone de plantão (em branco, não mostra), prazo para responder ao pedido (240 minutos úteis), confirmação automática do atendimento (5 dias úteis), pedidos por pessoa por dia (20) e mensagens por pessoa por hora (60).

**Tabelas novas:** `PCL_MENSAGENS` (só inclusão; nota interna com `INTERNA = SIM`), `PCL_ANEXOS` (fotos, vídeo e anexos; retirada com motivo em `REMOVIDO_*`, o registro fica) e `PCL_AVISOS_FILA` (e-mails que esperam o horário comercial).

**Colunas novas, por acréscimo:** em `ATEC_SOLICITACOES`, `CONTRATO_ID`, `URGENCIA_CLIENTE` (situação informada), `POR_PAPEL`, `SEM_CONTRATO`, `EQUIP_FORA_LISTA_TEXTO`, `HORARIO_PREFERIDO`, `REABRE_CHAMADO_ID` e `PROTOCOLO_CLIENTE`; em `ATEC_CHAMADOS`, `CONTRATO_ID`, `CLIENTE_ACEITE_POR_ID` e `REABERTO_POR_SOL_ID` (as colunas `CLIENTE_ACEITE_EM`, `_POR_NOME`, `_TIPO` e `_TEXTO` já existiam).

**Caixa nova:** «Responder pedidos e conversas do portal» (`PORTAL_CLIENTE_CONVERSAR`), padrão para a equipe interna da área Técnica, gestores, Diretoria e Administrador. Aceitar, pedir complemento e recusar seguem a regra de sempre da Assistência técnica.

**Trava de arquivo:** o anexo de `PCL_ANEXOS` abre só para o próprio cliente, não retirado e não interno; o do pedido ou do chamado, só para quem tem a unidade; o da conversa geral, para todas as pessoas do cliente.

**Registro de acessos (`PCL_ACESSOS`):** pedido, pedido recusado, complemento, cancelamento, mensagem, anexo, chamado aberto na ficha, atendimento confirmado, "o problema continua", anexo retirado e toda tentativa fora do escopo.

### 24.10 Problemas comuns (chamados)

| Situação | O que fazer |
|---|---|
| O cliente diz que o botão virou "Pedir atendimento avulso" | O contrato terminou e o acesso está em consulta. Para o atendimento pelo contrato, registre ou renove o contrato em Portal do cliente > Contratos |
| O pedido não aparece para um Solicitante | Ele vê só as unidades marcadas na conta. Confira em Acessos de clientes |
| O cliente não recebeu o e-mail de complemento | Fora do horário comercial, o e-mail espera a fila e sai na rotina seguinte dentro do expediente |
| O prazo do contrato não aparece na ficha do cliente | O prazo só aparece quando o contrato está em Regras da assistência > Contratos; sem ele, vale o prazo da prioridade, que o cliente não vê |
| Uma foto do cliente mostra um paciente | Na parte "Portal do cliente" do chamado (ou em "Conversa com o cliente"), toque em "Retirar" e escreva o motivo |
| O cliente marcou "O problema continua" | Trate o pedido novo na fila; ele vem com a faixa "o problema continua no chamado ..." e vira reincidência ao aceitar |


## 25. Documentos, equipamentos, vencimentos e cronograma (etapa 3, 18/11/2026)

A conta de cliente ganha três telas no menu "Portal do cliente": **Documentos técnicos**, **Meus equipamentos** e **Vencimentos e cronograma**. Tudo fica limitado ao cliente da conta e às unidades liberadas para a pessoa. O Gestor do cliente vê todas as unidades; o Solicitante e a Consulta veem as unidades marcadas no acesso. As três telas leem também nas situações de carência e de consulta. Com o acesso suspenso ou sem contrato, nada é lido nem aberto, e a mensagem diz o caminho (falar com o Comercial).

### 25.1 Documentos técnicos (o que o cliente vê)

A lista usa o mesmo índice de "Documentos em pastas" (Cadastros, ficha do equipamento e QR Code). Ele junta o Arquivo de documentos, os certificados de calibração, as qualificações, os laudos NR-13, os relatórios das O.S. encerradas (versão do cliente), os relatórios A4 com público "cliente", as rondas, os relatórios do ciclo da lavadora e as revisões emitidas. Não existe um segundo agregador. Rascunho, minuta, versão interna, documento suspenso, inativo e a pasta de contratos e propostas nunca chegam ao cliente.

Sobre essa base valem duas regras do portal:

1. **Tipos visíveis** (decisão 17 do dono). Aparecem sozinhos: certificado de calibração, relatório de qualificação, laudo NR-13, relatório de atendimento, cronograma de execução, relatório do ciclo da lavadora e relatório de ronda. Os outros tipos (PGT e POP, registros operacionais, relatórios técnicos e de ensaio, relatórios de manutenção, laudos e declarações, outros) só aparecem quando liberados um a um. A lista fica em Regras do portal.
2. **Marca do documento** (coluna `PORTAL` do Arquivo de documentos): em branco segue a regra do tipo; "Oculto no portal" esconde o documento da lista e da abertura em todas as telas do cliente (inclusive o Arquivo de documentos antigo, o QR Code e a central de vencimentos); "Liberado um a um" mostra o documento mesmo com o tipo fora da lista.

Filtros: unidade, equipamento, tipo, data de emissão ("Emitido"), validade ("Vence até") e busca por número, TAG, série ou nome. Cada linha traz o tipo, o título, o número, o equipamento, a unidade, a emissão, a validade com o selo (em dia, vence em até 30 dias, vencido) e o botão "Abrir". As versões anteriores de um documento ficam guardadas logo abaixo dele.

**Abrir:** o documento abre numa aba nova no computador; no celular, abre dentro do SGO+, com Voltar e Imprimir. A tela pede ao servidor, que confere se o documento está na lista da pessoa e passa pela trava de arquivo (`PortalCliente_arquivoPermitido_`, a mesma da rota `/arquivos`). A abertura fica em `PCL_ACESSOS` como `DOCUMENTO_ABERTO`. Documento de outro cliente, de outra unidade, oculto ou inexistente recebe a mesma resposta: "Não encontrado. Atualize a lista." Quando o documento existe na lista de outro cliente ou unidade, a tentativa fica como `ESCOPO_RECUSADO`.

### 25.2 Meus equipamentos

Lista dos equipamentos das unidades da pessoa, com o **farol por categoria**: calibração, qualificação, NR-13 e manutenção. Cada categoria fica "em dia", "vence em até 30 dias", "vencido" ou "sem registro". O farol vem do **mesmo motor da central de pendências** (`Pend_vencimentosBase_`): por equipamento e categoria vale o documento mais recente, e o renovado substitui o anterior. A manutenção é o documento com validade cujo tipo fala de manutenção (preventiva ou corretiva).

A ficha mostra:
- os dados públicos do cadastro (tipo, fabricante, modelo, série, TAG, patrimônio, setor, unidade, instalação, situação), nunca nota fiscal, origem, QR, observações internas ou quem cadastrou;
- os vencimentos do equipamento e os documentos dele;
- o **histórico dos atendimentos concluídos** (O.S. do SGO+ e tarefas do Auvo encerradas), sem o nome do técnico e sem link de outro sistema;
- os chamados do equipamento, que abrem a ficha do chamado;
- "Abrir chamado para este equipamento" (o formulário já vem com ele) e "Informar correção de cadastro", que envia uma mensagem à Metrolabs pela Conversa geral. O cliente não edita o cadastro.

### 25.3 Vencimentos

Tabela por equipamento e categoria, com a data, os dias que faltam e o documento de origem. Filtros: unidade, categoria (calibração, qualificação, NR-13, manutenção e outros documentos) e janela (vencidos e os próximos 30, 60 ou 90 dias, ou todos). Os vencidos aparecem sempre. A leitura é própria (`PCl_vencimentos_`) e usa o motor da central, sem depender dela.

### 25.4 Cronograma

Três blocos, sempre separados, com a explicação fixa: "Previsto é calculado pela validade dos documentos e pela periodicidade do contrato. A data só fica confirmada quando aparece em Agendado."

- **Agendado:** O.S. agendadas de hoje em diante ou em andamento, rondas de engenharia clínica e visitas de chamado, com data, hora, tipo de serviço e número da O.S.
- **Previsto:** (a) a próxima calibração, qualificação, inspeção NR-13 ou manutenção pela validade do documento mais recente de cada equipamento, nos próximos 12 meses, e os vencidos marcados "a programar"; (b) as janelas dos serviços do contrato pela periodicidade gravada em `CLI_CONTRATOS.SERVICOS_JSON` (mensal, bimestral, trimestral, semestral ou anual), contadas a partir do início do contrato e só dentro da vigência. "Sob demanda" não gera previsto. O previsto nunca vira compromisso.
- **Documento do cronograma:** o PDF do Cronograma de execução emitido, quando ele está na lista de documentos do cliente.

### 25.5 Documentos no portal (equipe)

Aba nova na tela Portal do cliente, para quem tem a caixa «Ocultar ou liberar documento no portal» (`PORTAL_CLIENTE_DOC_LIBERAR`).

1. Busque o cliente pelo nome ou CNPJ e toque nele.
2. A lista mostra cada documento que pode chegar ao cliente, com "Aparece: o tipo está na lista", "Aparece: liberado um a um", "Não aparece: o tipo está fora da lista" ou "Não aparece: oculto no portal". Filtre por "só os que aparecem", "só os que não aparecem" ou "só os ocultos".
3. Em "Mudar no portal", escolha "Segue a regra do tipo", "Oculto no portal" ou "Liberado um a um", escreva o motivo (pelo menos 10 letras) e toque em Gravar.

A marca vale para o documento registrado no Arquivo de documentos. Quando o mesmo arquivo também vem de outro módulo (certificado, qualificação, O.S.), a marca vale para ele. Documento sem registro no Arquivo segue a regra do tipo. Cada mudança grava quem, quando e o motivo na própria linha (`PORTAL_MOTIVO`, `PORTAL_POR_NOME`, `PORTAL_EM`) e no histórico das regras ("Documento no portal").

### 25.6 Tipos visíveis (Regras do portal)

Em Regras do portal > "Documentos no portal", o Administrador e a Diretoria marcam os tipos que aparecem sozinhos e gravam com motivo. A lista recomendada, aceita pelo dono, tem os sete tipos da seção 25.1. Pelo menos um tipo precisa ficar marcado.

### 25.7 Filtro por unidade em três telas antigas

A etapa 1 deixou três listas sem o filtro por unidade. Elas agora seguem a mesma regra (registro de outra unidade recebe a resposta de inexistente e a tentativa fica como `ESCOPO_RECUSADO`):
- **prontuário pelo QR Code** (`qrcodeAcessar`, a lista de qualificações e a abertura de documento da qualificação); a conta de cliente passa a receber só os campos públicos do equipamento;
- **relatórios de ciclo da lavadora** (busca, lista, equipamento e relatório);
- **vencimentos da central de pendências** para a conta de cliente (o documento oculto no portal também sai da central do cliente; a equipe continua vendo).

### 25.8 Tabelas, colunas e caixas

- **Colunas novas em `DOC_DOCUMENTOS`**, por acréscimo e garantidas antes da primeira gravação: `PORTAL` ('' segue o tipo, `OCULTO`, `VISIVEL`), `PORTAL_MOTIVO`, `PORTAL_POR_NOME` e `PORTAL_EM` (texto). Editar o documento no Arquivo de documentos não apaga a marca.
- **Registro de acessos (`PCL_ACESSOS`):** `DOCUMENTO_ABERTO` a cada abertura, `ESCOPO_RECUSADO` nas tentativas fora do escopo e `ACESSO_RECUSADO` quando a situação de acesso não permite ler.
- **Caixa nova:** «Ocultar ou liberar documento no portal» (`PORTAL_CLIENTE_DOC_LIBERAR`), padrão para a gestão da área Técnica e da Qualidade, a Diretoria e o Administrador.
- **Regras do portal:** a lista `docTiposVisiveis` (mesma propriedade das outras regras, com merge e histórico).
- **Sem avisos novos nesta etapa.** O aviso de documento novo (PC07) e o de vencimento (PC08) chegaram na etapa 4 (seção 26).

### 25.9 Problemas comuns (documentos e equipamentos)

| Situação | O que fazer |
|---|---|
| O cliente diz que um documento sumiu do Portal | Abra "Documentos no portal", busque o cliente e veja o porquê: tipo fora da lista ou oculto. Libere um a um, com motivo, se for o caso |
| O cliente vê um documento que não deveria | Marque "Oculto no portal" com o motivo: ele some da lista e não abre em nenhuma tela do cliente |
| O botão "Abrir" não aparece para o cliente | O arquivo do documento não está ligado a um registro que a trava reconhece. Registre o documento no Arquivo de documentos com o arquivo |
| O farol mostra "vencido", mas o serviço foi feito | Emita ou registre o documento novo com a validade; o farol usa o documento mais recente |
| O previsto do contrato não aparece | Confira em Contratos a periodicidade dos serviços (não pode ser "sob demanda") e a vigência |
| Um Solicitante não vê um equipamento ou um relatório de ciclo | Ele vê só as unidades marcadas na conta. Confira em Acessos de clientes |
| A marca "Oculto no portal" não aparece para um certificado | A marca existe só para o documento registrado no Arquivo de documentos. Registre o certificado lá e marque |

## 26. Avisos ao cliente por e-mail (etapa 4, 18/11/2026)

O cliente com Portal passa a receber por e-mail os avisos do atendimento, da conversa, dos documentos, dos vencimentos e do contrato, sempre nas pessoas certas da empresa. O canal é só o e-mail (decisão 11). WhatsApp para cliente continua desligado. Para a equipe, vale a regra de sempre: avisos no expediente, em dia útil, e cobrança pelo sistema e pelo e-mail.

### 26.1 Como o e-mail chega

- **Assunto:** começa sempre com "Metrolabs — " seguido do número, por exemplo "Metrolabs — Chamado CH-2026-0031: visita agendada para 21/10/2026". Os avisos ao cliente não levam mais o prefixo "SGO+ | ". Os avisos à equipe continuam com ele.
- **Remetente e marca:** "Metrolabs". O botão "Abrir no Portal do cliente" abre o sistema, e a pessoa precisa entrar com o próprio login.
- **Corpo:** saudação pelo primeiro nome, o texto do aviso e um rodapé que diz por que a pessoa recebe o e-mail. Nos avisos que podem ser desligados, o rodapé também ensina a desligar.
- **Nunca vão no e-mail:** anexos, valores (nem do orçamento), nome de outro cliente, texto das mensagens da conversa, motivo interno de cancelamento ou reagendamento, prioridade, triagem e qualquer termo interno.
- **Uma vez só:** endereços repetidos são juntados, e a mesma pessoa recebe o aviso uma vez, mesmo quando ela é ao mesmo tempo quem abriu e gestora da unidade. O que já saiu fica em `PCL_AVISOS_ENVIOS` e não se repete.

### 26.2 Os avisos

| Código | Aviso | Quem recebe | Quando sai | Pode desligar? |
|---|---|---|---|---|
| PC01 | Pedido recebido (etapa 2). Chamado registrado pela equipe por telefone, e-mail ou QR Code para cliente com Portal | Quem abriu e o contato no local. No chamado registrado pela equipe: os gestores do cliente da unidade | Na hora | Não |
| PC02 | Pedido aceito (virou chamado), complemento pedido ou recusa com o motivo | Quem abriu e os gestores do cliente da unidade | Horário comercial | Não |
| PC03 | Visita agendada, reagendada, retorno agendado, peça recebida e visita cancelada pela Metrolabs | Quem abriu e os gestores do cliente da unidade | Horário comercial. Visita no mesmo dia: na hora | Não |
| PC04 | Orçamento aguardando aprovação (ao emitir o orçamento) | Gestores do cliente da unidade (e da empresa que paga, se tiver Portal) | Horário comercial | Não |
| PC05 | Atendimento concluído, com o relatório disponível no Portal | Quem abriu e os gestores do cliente da unidade | Horário comercial | Não |
| PC06 | Mensagem da Metrolabs na conversa (resumo, sem o texto) | Quem abriu e quem participa da conversa. Sem nenhum dos dois: os gestores da unidade | No máximo um resumo a cada 2 horas úteis por pessoa | Sim |
| PC07 | Documentos novos (certificado, relatório, laudo) | Todas as pessoas com a unidade do documento | Resumo diário, a partir das 08:30 | Sim |
| PC08 | Vencimentos em 60, 30 e 7 dias e vencidos | Gestores do cliente da unidade | Resumo semanal, no primeiro dia útil da semana, a partir das 08:30. Cada faixa sai uma vez; o vencido, uma vez. O vencido só entra se venceu a partir de 30 dias antes do início dos avisos (configurável); os mais antigos ficam só no Portal | Sim (vem ligado) |
| PC09 | Acesso: convite, papel alterado, desligamento, reativação (etapa 1) | A própria pessoa e os gestores do cliente | Na hora | Não |
| PC10 | Contrato termina em 30 dias, período de carência, modo consulta | Gestores do cliente | Horário comercial, uma vez por situação | Não |

**Texto do fim de contrato (decisão 12):** neutro, sem tom de cobrança. Diz a data e o caminho (falar com o contato comercial das Regras do portal). PC10 não sai na vigência provisória ("contrato a cadastrar") nem na transição das contas antigas: nesses casos o Comercial cuida pela régua dos contratos (CT04). Contrato de licitação não recebe o aviso de 30 dias, porque Licitações avisa pela agenda própria. O contato do contrato que já recebe o aviso de renovação da régua (CT03) não recebe o PC10 dos 30 dias, para não repetir.

**Avisos internos:**

- **PI01** (contrato vence em 60, 30 e 15 dias) é o CT01 da régua dos contratos (seção 16), que já sai em 120, 90, 60, 30, 15, 7 e 0 dias, uma vez cada marco, ao responsável e à gestão comercial. Nada foi duplicado.
- **PI02, PI03 e PI04** continuam como nas etapas 1 e 2.
- **PI05** (novo): pedido do Portal a 75% do prazo de resposta (padrão 4 horas úteis) vai a quem faz a triagem. Com o prazo vencido, vai também à gestão da área Técnica. Sai uma vez cada marco, por e-mail, no expediente da equipe, sem WhatsApp. É a mesma regra do RP07 da Representação.

### 26.3 Horário comercial

Os e-mails ao cliente saem de **08:00 às 18:00, em dias úteis**. Os feriados são os do expediente da empresa (Atividades da equipe > Avisos e horários). O que acontece fora desse horário espera na fila `PCL_AVISOS_FILA` e sai na primeira rodada do próximo horário útil. Saem na hora, mesmo à noite: o pedido recebido (PC01), a visita marcada para o mesmo dia (PC03) e o acesso (PC09).

O horário dos avisos ao cliente é separado do expediente da equipe (padrão 17:30), porque a espec fixou 18:00 para o cliente. Os dois ficam configuráveis.

### 26.4 Substituição dos e-mails antigos da Assistência

Até esta etapa, a Assistência mandava os avisos de visita, peça e conclusão (AT08 e AT15) para o e-mail do cadastro da unidade ou do cliente. Agora:

- **Cliente com Portal na unidade** (pelo menos uma pessoa ativa com o papel e a unidade certos, e o acesso não está suspenso nem sem acesso): o aviso vai para as pessoas do Portal no modelo novo. Enquanto "Cópia ao e-mail do cadastro" estiver em **Sim** (padrão na transição), o e-mail do cadastro da unidade também recebe, no mesmo modelo. O endereço repetido sai uma vez só.
- **Cliente sem Portal, unidade sem nenhuma pessoa do Portal, acesso suspenso ou sem acesso:** continua tudo como antes, no e-mail do cadastro.
- **Pedido do Portal aceito:** o cliente recebe só o "pedido aceito" (PC02). O e-mail antigo "Recebemos o seu chamado" deixa de sair para esse caso.
- **Chamado de representada:** segue o fluxo próprio da Representação, como antes.
- **Rondas:** os avisos de ronda agendada e concluída continuam no e-mail do cadastro (não fazem parte dos eventos do Portal).
- **Cópia ao e-mail do cadastro** (Regras do portal, **padrão "Sim"** na transição): as contas de cliente atuais são antigas (sem papel, valem como Gestor do cliente) e ainda não se sabe se os e-mails delas são de pessoas reais. Por isso o e-mail da unidade continua recebendo os avisos de visita, peça e conclusão que recebe hoje, juntado com os das pessoas (o mesmo endereço recebe uma vez). Depois de revisar as contas em Acessos de clientes, a Diretoria pode trocar para "Não", com motivo.
- O envio do relatório e do orçamento por "Enviar documento" (com o PDF) continua igual: é um envio feito por uma pessoa da equipe, e não um aviso automático.

### 26.5 Preferências da pessoa (Minha conta)

Em Portal do cliente > Minha conta > Meus dados, a parte **Avisos por e-mail** mostra:

- o e-mail que recebe, o horário e o aviso de que o e-mail nunca leva anexos nem valores;
- a lista do que é **sempre enviado**: pedido, visita, orçamento, conclusão, acesso e contrato;
- os três avisos que a pessoa **pode desligar**: mensagens da Metrolabs (PC06), documentos novos (PC07) e vencimentos (PC08). O de vencimentos aparece só para o Gestor do cliente. Em modo consulta, a tela explica que os resumos de documentos e vencimentos não saem.

A escolha fica em `CAD_USUARIOS.CLIENTE_AVISOS_JSON` e vale a partir do próximo aviso. Os avisos obrigatórios não podem ser desligados, nem mesmo chamando o servidor direto.

### 26.6 Regras do portal > Avisos ao cliente por e-mail (Administrador e Diretoria, com motivo e histórico)

| Campo | O que faz | Padrão |
|---|---|---|
| Avisos pelo Portal | Ligados: os avisos da Assistência e os resumos vão para as pessoas do Portal. Desligados: a Assistência volta a avisar só o e-mail do cadastro e os resumos não saem. Pedido recebido, aceite e acesso continuam saindo sempre | Ligados |
| Horário comercial: início e fim | Janela dos e-mails ao cliente nos dias úteis | 08:00 e 18:00 |
| Hora dos resumos | A partir desta hora sai o resumo diário dos documentos novos e, no primeiro dia útil da semana, o dos vencimentos | 08:30 |
| Resumo das mensagens | No máximo um resumo por pessoa a cada tantos minutos úteis | 120 |
| Cópia ao e-mail do cadastro | O e-mail da unidade também recebe os avisos da Assistência de quem tem Portal (sem repetir endereço) | Sim (transição) |
| Vencidos antigos no resumo semanal | O vencido só entra no PC08 se venceu a partir de tantos dias antes do início dos avisos; os mais antigos nunca vão no e-mail e continuam no Portal (Vencimentos e cronograma) | 30 (de 0 a 365) |

**Início dos avisos:** a primeira rodada da rotina depois da publicação grava o dia e a hora (`avisosDesde`). Mensagens, documentos e pedidos anteriores a esse momento **não** geram aviso. A tela de Regras mostra a data. Na primeira semana, se a publicação não cair no primeiro dia útil, o resumo de vencimentos só começa no primeiro dia útil da semana seguinte.

### 26.7 Rotina

A rotina da Assistência (a cada 15 minutos) chama `PortalCliente_rotinaChamados_`, que agora também chama `PortalCliente_rotinaAvisos_`:

1. PI05 (prazo do pedido do Portal), em toda rodada;
2. PC06 (resumo das mensagens), dentro do horário comercial do cliente;
3. PC10 (contrato), uma vez por dia útil;
4. PC07 (documentos novos), uma vez por dia útil, a partir da hora dos resumos;
5. PC08 (vencimentos), uma vez por semana, no primeiro dia útil, a partir da hora dos resumos;
6. a fila do horário comercial (`PCL_AVISOS_FILA`).

Nenhum passo derruba os outros: um erro fica registrado no log e a rodada continua.

### 26.8 Tabelas e código

- **Tabela nova `PCL_AVISOS_ENVIOS`** (só inclusão): CHAVE do aviso, evento, cliente, pessoa, e-mail, referência, situação (`ENVIADO` ou `NA_FILA`) e data. É o que impede a repetição.
- **`PCL_AVISOS_FILA`** (etapa 2) passa a guardar todos os avisos ao cliente que esperam o horário comercial, um por pessoa.
- **Matriz de avisos:** códigos novos PC03, PC04, PC05, PC06, PC07, PC08, PC10 e PI05.
- **Código:** `SGO_PortalCliente_Avisos.js` (novo), o envio central `PCl_enviarCliente_` em `SGO_PortalCliente_Config.js`, `paraCliente` em `SGO_notificar_` (assunto sem prefixo e marca Metrolabs) e o último argumento de `Ast_avisarCliente_` na Assistência (Agenda, Chamados e Relatório da O.S.).

### 26.9 Problemas comuns (avisos ao cliente)

| Situação | O que fazer |
|---|---|
| O cliente com Portal não recebeu o aviso da visita | Veja se a pessoa está ativa e tem a unidade do chamado (Acessos de clientes). O Gestor do cliente da unidade sempre recebe. Fora do horário comercial, o e-mail espera o próximo horário útil |
| O e-mail da unidade parou de receber os avisos da Assistência | Alguém trocou "Cópia ao e-mail do cadastro" para "Não" em Regras do portal (o histórico das regras diz quem e por quê). Volte para "Sim" se a unidade precisa receber |
| Um equipamento vencido há muito tempo não aparece no resumo semanal | É a regra: o vencido só entra se venceu a partir de 30 dias antes do início dos avisos (Regras do portal > Vencidos antigos no resumo semanal). Ele continua em Portal do cliente > Vencimentos e cronograma |
| O cliente diz que não recebe o resumo das mensagens | Ele pode ter desligado em Minha conta. O resumo sai no máximo a cada 2 horas úteis e nunca leva o texto da mensagem |
| Um Solicitante não recebe os vencimentos | O resumo de vencimentos vai só para o Gestor do cliente da unidade |
| O cliente em modo consulta não recebe documentos novos nem vencimentos | É a regra do modo consulta (item 3.3 da espec) |
| O cliente recebeu um aviso duas vezes | Confira em `PCL_AVISOS_ENVIOS` se são dois avisos diferentes (por exemplo, visita agendada e depois reagendada). O mesmo aviso não se repete para o mesmo endereço |
| Nenhum aviso ao cliente sai | Confira em Regras do portal se os avisos pelo Portal estão ligados e se a rotina da Assistência está rodando |

## 27. Indicadores e uso do portal (etapa 5, 18/11/2026)

A conta de cliente ganha a tela **Indicadores** no menu "Portal do cliente". A equipe ganha a aba **Uso do portal** na tela Portal do cliente (também no menu, com o mesmo nome). Nenhuma das duas mostra valor financeiro.

### 27.1 Indicadores (o que o cliente vê)

- **Quem vê:** o Gestor do cliente (todas as unidades) e o Solicitante (só as unidades marcadas no acesso dele). A Consulta não vê: o botão do menu não aparece, e a chamada direta recebe a recusa com o papel, o porquê e o caminho (registro `PAPEL_RECUSADO`). Com o acesso suspenso ou sem contrato, nada é lido (`ACESSO_RECUSADO`).
- **Filtros:** período de 30, 90 (padrão), 180 ou 365 dias e a unidade. Os chamados abertos aparecem sempre; os outros índices contam os chamados concluídos no período. Unidade de outra empresa ou fora do acesso recebe "Não encontrado. Atualize a lista." e fica como `ESCOPO_RECUSADO`.
- **Como é contado:** cada índice traz embaixo a explicação em linguagem simples. Quando não há base para a conta, o índice mostra "—" e o motivo (por exemplo, "Nenhum chamado foi concluído no período escolhido."), nunca um número inventado.

| Índice | Como é contado |
|---|---|
| Chamados abertos agora | Pedidos e chamados nas etapas 1 a 7 (de "Recebido" a "Em atendimento"), hoje. O pedido já convertido em chamado conta uma vez só (como chamado). Há também o gráfico por etapa |
| Chamados concluídos no período | Etapa 8 com a conclusão (fim do atendimento, `ATENDIDO_EM`, ou, sem ele, o encerramento, `ENCERRADO_EM`) dentro do período |
| Tempo médio até a visita | Entre os concluídos no período com visita: da abertura do pedido (ou do chamado, quando a Metrolabs registrou) até a primeira chegada do técnico (`CHEGOU_EM` das O.S. do chamado), em h úteis |
| Tempo médio até a conclusão | Como em `AstP_painelCliente_`: da abertura do chamado até `ATENDIDO_EM` ou `ENCERRADO_EM`, em h úteis |
| % dentro do prazo do contrato | Concluídos no período com o atendimento dentro de `SLA_MIN_UTEIS` (estado "cumprido" de `Ast_slaEstado_`) ÷ concluídos no período com prazo de contrato (`SLA_FONTE = CONTRATO`). Os outros não entram |
| Equipamentos em dia | Por categoria (calibração, qualificação, NR-13 e manutenção): equipamentos ativos com a validade do documento mais recente não vencida ÷ equipamentos ativos que têm aquela categoria. Os que vencem em até 30 dias ainda contam como em dia (a tabela mostra quantos). O mesmo motor de "Meus equipamentos" (`PCl_vencimentos_`) |
| Vencimentos nos próximos 30 e 60 dias | Contagem por categoria dos documentos com validade de hoje até 30 e até 60 dias (a de 60 inclui a de 30); os vencidos aparecem à parte |
| Reincidência | Concluídos no período que tiveram outro chamado do mesmo equipamento aberto nos 30 dias anteriores ÷ concluídos no período. Cancelados não contam |

**Horas úteis:** a conta é a da Assistência (`Ast_minUteisEntre_`): o expediente da empresa (08:00 às 17:30, dias úteis, com os feriados do expediente), a mesma do prazo do contrato. Os tempos aparecem com uma casa decimal ("6,3 h úteis"); os percentuais também ("66,7%").

**Botões:**
- "Relatório do período (PDF)": o mesmo documento A4 de "Meus chamados" (`RepDC_relatorioPeriodo_`), com o período e a unidade escolhidos. Para o Solicitante, sai só com as unidades dele (seção 27.3). Os já gerados ficam em "Relatórios do período já gerados" (só os que a pessoa pode abrir). A geração fica no registro (`RELATORIO_PERIODO`).
- "Ver no Kanban e no Gantt": abre a tela Chamados no Kanban. O Kanban e o Gantt continuam lá (`JS_PainelAtendimento.html`).
- "Atualizar agora": os números ficam guardados por 2 minutos (cache do script, por cliente, unidades, período e dia); este botão conta de novo.

### 27.2 Uso do portal (equipe)

Caixa nova **«Ver o uso do portal e o registro de acessos»** (`PORTAL_CLIENTE_USO_VER`), padrão Administrador, Diretoria e gestores. Só mostra; nada é alterado.

Por cliente (período de 30, 90, 180 ou 365 dias), com "Como cada número é contado" embaixo da tabela:

| Coluna | Como é contado |
|---|---|
| Contas ativas | Pessoas do cliente com a conta ativa e quantas por papel (Gestor, Solicitante, Consulta e "papel não revisado") |
| Convites | Contas ativas que ainda não criaram a senha: pendentes (convite na validade) e vencidos (convite vencido sem uso), pelo último envio em `SYS_ACESSO_CLIENTE_ENVIOS` |
| Última entrada | A entrada mais recente de qualquer pessoa do cliente |
| Entradas em 30 dias | Registros `ENTRADA` em `PCL_ACESSOS` nos últimos 30 dias (não depende do período) |
| Pedidos pelo portal | Pedidos do Portal (`ATEC_SOLICITACOES.ORIGEM = PORTAL`) ÷ todos os pedidos do cliente no período: cada pedido (Portal, e-mail, QR...) e cada chamado aberto sem pedido por telefone, e-mail, QR, presencial, WhatsApp ou pela tela interna. Preventivas do contrato, pedidos do Comercial, rondas e pedidos de representada não contam. O chamado cancelado conta (foi um pedido) |
| Documentos abertos | Registros `DOCUMENTO_ABERTO` no período |
| Aceite do pedido | Média, entre os pedidos do Portal aceitos no período, das horas úteis entre o envio e o aceite (`TRATADA_EM`), menos a pausa do complemento (`PAUSA_MIN`) |
| Avisos | Avisos ao cliente enviados no período (`PCL_AVISOS_ENVIOS`) e os que falharam no envio (`NTF_ENVIOS` com origem `PORTAL_CLIENTE` e situação `ERRO`, e a fila do horário comercial com erro); à parte, as contas com e-mail em formato inválido |
| Sem entrada | Contas ativas sem entrar há N dias ou mais (N = aviso de inatividade de Regras do portal, padrão 90), da última entrada ou, sem nenhuma, da criação ou da reativação |
| Fora do acesso | `ESCOPO_RECUSADO` e `FUNCAO_RECUSADA` no período |

**Pessoas e avisos de um cliente:** cada pessoa com papel, unidades, situação, última entrada, dias sem entrada (em vermelho acima do limite), entradas em 30 dias, documentos abertos e o e-mail (em vermelho quando inválido); a **lista dos avisos enviados** ao cliente (os últimos 200, com o código e o nome do aviso, o endereço e se saiu ou espera o horário comercial), pendência deixada pela etapa 4; e as falhas de envio com o motivo.

**Linha do tempo da pessoa:** os registros de `PCL_ACESSOS` da pessoa (os 500 mais recentes), com a ação, o detalhe, a referência, o **IP e o navegador**. Só a equipe com a caixa vê o IP; o Gestor do cliente continua vendo o registro da empresa em "Minha conta e equipe", sem IP e sem navegador (T5.5).

**Planilha:** "Baixar planilha (CSV)" (todos os clientes), "Baixar as pessoas", "Baixar os avisos" e "Baixar a linha do tempo". O arquivo usa ponto e vírgula, abre no Excel em português e é montado na própria tela, a partir do que ela já mostra.

### 27.3 Relatório do período filtrado por unidade

- **Antes:** o Solicitante recebia "o relatório filtrado pelas suas unidades chega numa próxima etapa".
- **Agora:** `RepDC_relatorioPeriodo_` lê o escopo da pessoa (`eu.pclEscopo`): o Solicitante recebe só as unidades dele; a unidade escolhida (`unidadeId`) limita a uma, desde que seja do cliente e esteja no acesso (senão, "Não encontrado"). Vale pelos dois caminhos: Portal do cliente > Indicadores e "Meus chamados".
- **O documento:** o subtítulo diz as unidades ("· unidade Unidade Centro"); o registro em `REP_DOCUMENTOS` ganha a coluna nova `UNIDADES_JSON` (por acréscimo, garantida antes do primeiro relatório filtrado) e, com uma unidade só, `UNIDADE_ID`.
- **Trava de arquivo:** o relatório filtrado abre só para quem tem todas as unidades dele no acesso (`PCl_docRepNaUnidade_`); o de todas as unidades, só para quem vê todas. "Relatórios gerados" de "Meus chamados" mostra ao Solicitante o relatório do período dele.

### 27.4 Tabelas, código e caixas

- **Código:** `SGO_PortalCliente_Painel.js` (cálculo `PCl_indicadoresCalc_` e `PCl_usoCalc_`, ações `indicadores`, `relatorioPeriodo`, `uso` e `usoPessoa`) e `JS_PortalCliente_Painel.html` (tela do cliente e aba da equipe). A tela do cliente chama só `PortalCliente_api`, que já está na lista fechada de funções.
- **Registro (`PCL_ACESSOS`):** `RELATORIO_PERIODO` (geração do PDF), `PAPEL_RECUSADO` (Consulta), `ACESSO_RECUSADO` (suspenso ou sem acesso) e `ESCOPO_RECUSADO` (unidade fora do acesso).
- **Coluna nova:** `UNIDADES_JSON` em `REP_DOCUMENTOS`. Nenhuma tabela nova.
- **Caixa nova:** `PORTAL_CLIENTE_USO_VER`.
- **Desempenho:** cada resposta lê cada tabela uma vez; o resultado fica 2 minutos no cache. Medido no ensaio local com um cliente de 4.000 chamados, 3.000 pedidos, 1.500 equipamentos e 20.000 registros de acesso: cerca de 1 a 1,5 s na primeira vez (quase todo o tempo é a conta das horas úteis de cada chamado), instantâneo do cache; o uso do portal de todos os clientes, menos de 1 s.

### 27.5 Problemas comuns (indicadores e uso)

| Situação | O que fazer |
|---|---|
| Um índice aparece com "—" | Não há chamado que entre na conta no período (o motivo aparece embaixo). Escolha um período maior |
| O número não mudou depois de um atendimento | O cache guarda por 2 minutos. Toque em "Atualizar agora" |
| O Solicitante diz que o relatório do período não traz uma unidade | Ele recebe só as unidades marcadas no acesso. Confira em Acessos de clientes |
| O tempo até a visita parece baixo | Só entram os concluídos com chegada do técnico registrada; os resolvidos a distância ficam fora dessa conta |
| O cliente diz que não recebeu um aviso marcado como enviado | A devolução do provedor do cliente ("e-mail que voltou") ainda não chega ao SGO+. Confira o endereço na linha da pessoa e a caixa de saída do e-mail da Metrolabs |
| A aba "Uso do portal" não aparece | Falta a caixa «Ver o uso do portal e o registro de acessos». Peça em Administração > Acessos |


## 28. Troca definitiva (etapa 6)

A partir da etapa 6, a conta de cliente usa só as telas do Portal. As telas antigas que o cliente via fora do Portal passam a abrir a tela nova que as substitui, sem perder nada do que ele fazia. A trava do legado e a lista fechada mínima ficam prontas, mas **nascem desligadas**: quem liga é a Diretoria, pelo painel "Pronto para ligar?", depois da observação.

### 28.1 O menu do cliente: antes e depois

| Antes (o que o cliente via) | Depois (o que abre agora) | Onde ficou cada coisa |
|---|---|---|
| Início (pendências da central, índices e alertas) | **Início** do Portal | Cartões de chamados abertos, próxima visita, vencimentos em 30 dias e documentos novos; "O que precisa de você"; atalhos; "Manual do Portal" |
| Meus chamados (Assistência técnica) | **Chamados** | Pedir atendimento (formulário completo), lista, Kanban e Gantt, orçamento (aprovação do Gestor), confirmação, relatório da O.S. e, na ficha, "Gerar relatório do atendimento" e "Ver prévia". Rondas: em Documentos técnicos (tipo Ronda) e no Cronograma. Relatório do período: em Indicadores |
| Unidades (Cadastros) | **Meus equipamentos > Unidades** | Nome, CNPJ, endereço, telefone e equipamentos de cada unidade; "Documentos da unidade" abre as pastas da unidade (PGT, POP e registros) |
| Equipamentos (Cadastros) | **Meus equipamentos** | Lista com farol, ficha com vencimentos, documentos, **prontuário por pastas**, histórico e chamados |
| Arquivo de documentos (Cadastros) | **Documentos técnicos > Por pastas (prontuário)** | Todos os documentos emitidos para a empresa, por pasta, inclusive **PGT e POP**, O.S. e qualificação (pedido da Priscilla de 17/11) |
| Relatórios de ciclo (Cadastros) | **Relatórios de ciclo** (no grupo Portal do cliente) | A mesma tela da lavadora (consultar, gerar e assinar), chamada pela entrada do Portal |
| Prontuário pelo QR Code | O mesmo prontuário | Pela entrada do Portal (`qrcodeAcessar`, `documentosPastas` e "Gerar relatório do ciclo") |
| Busca rápida (Ctrl K) | A mesma busca | O equipamento abre a ficha em Meus equipamentos; o certificado ou documento abre Documentos técnicos já com a busca |
| "Dúvida" no topo | "Como usar esta tela" | O assistente é da equipe; para o cliente, o botão abre a ajuda da tela do Portal |
| Bate-papo no topo | Sem mudança | O bate-papo da equipe já recusa a conta de cliente e se esconde; a conversa do cliente é a do Portal (Chamados > Conversa geral) |

Atalho, busca ou link antigo de e-mail para uma tela que não é do Portal leva ao Início do Portal. A equipe não muda: para ela, Unidades, Equipamentos e as demais telas continuam como estavam.

**As 5 etapas antigas** (`AST_ETAPAS_CLIENTE`) continuam só dentro dos documentos A4 (relatório do atendimento e do período) e da Representação, que dependem delas para as cores e a linha do tempo. Todas as telas do cliente mostram as 8 etapas do Portal.

### 28.2 Ponte do Portal (telas antigas que continuam valendo)

Oito funções antigas continuam úteis ao cliente dentro do Portal: as pastas de documentos (`documentosPastas`), o prontuário pelo QR Code e a qualificação dele (`qrcodeAcessar`, `qrcodeQualificacao`), a Assistência técnica só nas ações do cliente (`Assistencia_api`: relatório do atendimento, prévia, orçamento), os relatórios de ciclo (`LavCiclo_api`, menos as referências), a ajuda e o manual da tela do Portal (`SGO_Ajuda_apiTela`, `SGO_Ajuda_apiManual`) e a busca rápida (`Inicio_apiBuscar`). Para a conta de cliente, a tela as chama pela entrada única do Portal (`PortalCliente_api`, ação `legado`), numa lista fechada (`PCL_LEGADO_CLIENTE`). Cada função continua com as próprias travas (empresa, unidades e papel). Fora da lista, a resposta é a recusa com o caminho e a tentativa fica em `PCL_ACESSOS` (`FUNCAO_RECUSADA`). Assim, o cliente chama do servidor só `PortalCliente_api` e o básico da sessão.

### 28.3 Painel "Pronto para ligar?" (aba Segurança)

No topo da aba Segurança (Portal do cliente > Contratos de clientes), o painel mostra:

- os **dias de observação** (desde a primeira chamada de conta de cliente registrada pelo servidor; o servidor está em observação desde 18/11/2026 00:16);
- as **funções fora da lista** chamadas por contas de cliente, com as chamadas dos últimos 7 dias, as pessoas e se a função está na lista de transição;
- o estado da **trava do legado**, da **recusa do servidor** e da **lista usada**;
- o passo a passo para ligar e para voltar atrás.

O selo "Pronto" aparece quando a observação completou o período e nenhuma função fora da lista de transição foi chamada nos últimos dias. As funções de módulos internos (marcadas "interna") nunca entram na lista; vê-las na tabela antes de ligar é esperado, porque elas serão recusadas.

### 28.4 Como ligar (Administrador e Diretoria, sempre com motivo)

1. Espere os 7 dias de observação e confira o painel. Se uma função de tela que o cliente ainda usa aparecer fora da lista, não ligue: avise o desenvolvimento ou acrescente a função com motivo.
2. Em **Trava do legado**, escolha **Ligada (cliente só pelo Portal)**, escreva o motivo e grave. Vale na hora e não depende do servidor: fora das telas do Portal, a conta de cliente recebe "Esta parte do SGO+ não faz parte do Portal do cliente. Por quê: ... O que fazer: ...". Acompanhe um dia útil pela Conversa geral e pelo Uso do portal.
3. Em **Chave de recusa**, escolha **Ligada**, com a lista de transição. Vale em até 1 minuto, com o servidor atualizado.
4. Quando "fora da lista mínima" estiver em zero, troque **Lista usada pelo servidor** para **Mínima**: o servidor passa a aceitar do cliente só `PortalCliente_api`, o básico da sessão e o bate-papo (que se recusa sozinho).
5. **Para voltar atrás**, a qualquer momento: escolha "Desligada" (ou "Transição") na mesma chave, escreva o motivo e grave. Nada é apagado; tudo fica no histórico das regras (`PCL_REGRAS_HIST`, chave `FUNCOES_CLIENTE`).

### 28.5 Manual do cliente

- **Dentro do Portal:** Início > "Manual do Portal" abre o manual em A4, para ler ou imprimir (texto de `SGO_PortalCliente_Manual.js`). A abertura fica em `PCL_ACESSOS` (`MANUAL_ABERTO`).
- **Para enviar ao cliente:** `docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.md`, com a versão A4 em `docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.html` e `.pdf`, com capturas reais do sistema (dados fictícios). Os dois saem do mesmo texto, por `output/portal-cliente-20261116/etapa6/gerar-manual-cliente.cjs`.

### 28.6 Tabelas, código e chaves

- **Código novo:** `SGO_PortalCliente_Troca.js` (Início, Unidades, ponte, trava do legado, lista mínima e "Pronto para ligar?"), `SGO_PortalCliente_Manual.js` (manual do cliente) e `JS_PortalCliente_Inicio.html` (tela Início, menu do cliente e ponte da tela).
- **Chaves novas** em `PCL_FUNCOES_CFG` (propriedade do script): `travaLegado` e `listaMinima`, as duas `false` por padrão.
- **Ações novas do cliente** em `PortalCliente_api`: `inicio`, `unidades`, `legado` e `manual`. Nenhuma função nova fora de `PortalCliente_api` é chamada pela tela do cliente.
- **Nenhuma tabela nova.** Registros novos em `PCL_ACESSOS`: `MANUAL_ABERTO` e `FUNCAO_RECUSADA` vindo da ponte.

### 28.7 Problemas comuns (troca definitiva)

| Problema | O que fazer |
|---|---|
| O cliente diz que a tela Unidades sumiu | Ela está em Meus equipamentos > Unidades |
| O cliente não acha o PGT ou o POP | Documentos técnicos > Por pastas (prontuário), pasta "PGT e POP"; ou a ficha do equipamento > "Abrir o prontuário por pastas" |
| Com a trava ligada, o cliente vê "não faz parte do Portal do cliente" | Veja no painel "Pronto para ligar?" qual função ele chamou. Se for de tela que ele precisa, desligue a trava (com motivo) e avise o desenvolvimento |
| O painel diz "Ainda não" mesmo depois de 7 dias | Alguma função fora da lista foi chamada nos últimos 7 dias. Confira a tabela; funções internas antigas (anteriores à etapa 6) deixam de contar quando saem da janela de 7 dias |
| A recusa do servidor não tem efeito | Confira se o patch da etapa 0 do servidor está aplicado. A trava do legado não depende dele |
</div>
