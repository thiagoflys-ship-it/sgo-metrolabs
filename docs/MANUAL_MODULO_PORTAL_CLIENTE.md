# Portal do cliente — manual interno (etapa 0: segurança da conta de cliente e contratos; 17/11/2026: vigência provisória, IA, régua de vencimento e reajuste; 18/11/2026: etapa 1, acessos das pessoas dos clientes)

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

O dono sempre tem todas. As contas de fora, de cliente e de representada, nunca têm caixa.

## 11. Tabelas

- `CLI_CONTRATOS`: contratos de clientes privados, um por linha, com a versão atual.
- `CLI_CONTRATOS_HIST`: só inclusão. Guarda registro, correção, renovação, encerramento, suspensão, reativação e revisão da pré-carga, com antes, depois, motivo, quem e quando.
- `PCL_ACESSOS`: só inclusão. Guarda a entrada recusada, o arquivo recusado (`ESCOPO_RECUSADO`) e a função recusada.
- `PCL_FUNCOES_OBSERVADAS`: uma linha por dia, função e pessoa, com a contagem.
- `PCL_REGRAS_HIST`: as mudanças das regras e da lista de funções.
- Etapa 1 (18/11/2026): `PCL_PEDIDOS_EQUIPE`, `PCL_TERMOS_ACEITE` e `PCL_CONTAS_HIST` (seção 23.9) e as colunas `CLIENTE_*` em `CAD_USUARIOS`.

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

**Avisos (matriz):** PC09 (acesso do cliente: convite, papel alterado, desligado e reativado; só e-mail, na hora), PI02 (pedido de inclusão e desligamento pelo cliente, para quem gere acessos) e PI04 (contas paradas). Nenhum aviso ao cliente sai por WhatsApp. O assunto chega como "SGO+ | Metrolabs — ...", porque o serviço de avisos do SGO+ acrescenta o prefixo.

**Registro de acessos (`PCL_ACESSOS`):** entrada, saída, recusa, aceite do termo, dados alterados, convite, papel alterado, e-mail trocado, desligamento, reativação, pedido de inclusão e toda tentativa fora do escopo.

### 23.10 Problemas comuns (acessos)

| Situação | O que fazer |
|---|---|
| "Enviar convite" está travado | O cliente está sem contrato vigente ou em consulta. Cadastre ou renove o contrato em Portal do cliente > Contratos |
| A pessoa diz que não vê uma unidade | Confira as unidades marcadas na conta, em "Mudar papel". Solicitante e Consulta veem só as unidades marcadas |
| A pessoa diz que a tela pede o termo de uso | É o primeiro acesso ou o texto mudou. Ela lê e toca em "Li e estou ciente" |
| Uma conta foi inativada por falta de entrada e ainda é usada | Reative com o motivo e marque "manter" |
| O gestor do cliente desligou alguém por engano | Reative a conta com o motivo; a pessoa entra com a senha que já tinha |

</div>
