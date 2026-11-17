# Contratos: vigência provisória, campo do contrato com IA, régua de vencimento e reajuste — relatório

**Data:** 17/11/2026. **Onde:** `output/financeiro-20261116/cand12`, a cópia idêntica à produção. O trabalho também mexeu em `tests/` e `docs/`.
**Restrições respeitadas:** nada foi publicado e nada foi commitado. Não houve acesso à produção, ao servidor nem ao banco. Bloqueio da Frota, chat do RH360 e PGT/POP ficaram intocados.
**Pedido do dono:** "A Brasmedical cola final de 2027. Os outros clientes coloca final de 2026. Coloca campo para inserir o contrato, I.A para estudar o contrato. Avisos e alertas de vencimento do contrato para os clientes, para o comercial [...] reajuste automático para o financeiro faturar com os índices já calculados no painel do financeiro, envia especialista para fazer isso funcionar em todos módulos."

## 1. O que mudou

### 1.1 Vigência provisória até 31/12/2026

A regra vale para o cliente que atende a todas as condições abaixo:
- tem conta de cliente, ou tem pista na pré-carga (prazo em Regras da assistência, ronda com contrato ou proposta aprovada com item de contrato);
- não tem **nenhum** contrato cadastrado, nem futuro, nem de Licitações;
- não foi marcado "Revisado: sem contrato".

Esse cliente fica em **PLENO** até a data provisória. A função é `PCl_situacaoAcesso_`, que devolve `provisoria: true` e `aCadastrar: true`.

Como a regra se comporta:
- **Configuração:** fica em `PCL_REGRAS.provisoriaAte`, com padrão `2026-12-31`. Em branco, a regra fica desligada. Fica na tela Regras do portal, com motivo e histórico.
- **Histórico:** a decisão do dono entra em `PCL_REGRAS_HIST` (CHAVE `PROVISORIA`) uma única vez, com as palavras dele (`PCl_registrarProvisoriaPadrao_`).
- **O que não se inventa:** nenhum número nem objeto de contrato.
- **Telas internas:** lista, ficha, pré-carga, Cadastros e chamado mostram o selo "contrato a cadastrar".
- **O que o cliente lê:** "Acesso completo" e "contrato em formalização, acesso garantido até 31/12/2026".
- **Depois da data:** vale de novo a transição antiga (CONSULTA).
- **Representadas:** continuam com a vigência do próprio cadastro. Nos dados de produção, a Brasmedical está até 31/12/2027 (nada a fazer).

### 1.2 Campo do contrato e IA que estuda o contrato

**Colunas novas em `CLI_CONTRATOS`:**
- parte e contato: `PARTE_TIPO`, `REPRESENTADA_ID/NOME`, `CONTATO_NOME/EMAIL`, `PARTES_TEXTO`;
- valores e reajuste: `VALOR_MENSAL/TOTAL`, `INDICE_REAJUSTE`, `INDICE_OUTRO`, `DATA_BASE_REAJUSTE`, `AVISO_PREVIO_DIAS`;
- texto do contrato: `SLA_TEXTO`, `MULTAS_TEXTO`, `OBRIGACOES_TEXTO`;
- leitura da IA: `IA_RESUMO`, `IA_PONTOS_JSON`, `IA_LIDO_EM`, `IA_CONFERIDO_POR_NOME`.

A chave de cache das tabelas mudou para `PCL_ABAS_OK_V2`, para que as colunas sejam criadas.

**Gravação (`PClC_lerCondicoes_`):**
- Faz merge: o campo que não veio no pedido fica como estava.
- Valores só são lidos de quem tem a caixa nova. Sem a caixa, os valores gravados nunca são sobrescritos.
- Índice com série no Banco Central exige a data-base.
- O e-mail é conferido.
- Cada mudança continua indo para a versão no histórico. No histórico, valores ficam ocultos para quem não tem a caixa.

**IA (`SGO_Contratos_IA.js`, `CtIA_lerContrato_`):**
- Usa a mesma chave e os mesmos modelos dos outros módulos (`RelA4_iaConfig_` / `GEMINI_API_KEY`).
- O PDF vai em `inline_data` (o enviado agora ou o já guardado) e a resposta vem num esquema JSON.
- Cada campo volta como `{valor, trecho, pagina}`. Sugestão **sem trecho é descartada**.
- Valores e datas são normalizados. A resposta traz também o resumo e os pontos de atenção com a gravidade.
- O pedido manda ignorar instruções escritas dentro do PDF.
- **Nada é gravado**: a pessoa marca o que quer usar, toca em "Aplicar ao formulário" e depois em Gravar. Só então o resumo e os pontos ficam no contrato, com o nome de quem conferiu.
- Sem chave, o botão explica o que fazer.

**Representada:** decidi ligá-la a um registro de contrato na mesma tabela (`PARTE_TIPO = REPRESENTADA`, sem `CLIENTE_ID`). Com isso:
- a representada usa o mesmo formulário, a mesma IA e o mesmo reajuste;
- a **vigência continua só no cadastro da representada**, a fonte única da trava `Rep_ativa_`;
- o registro não entra na situação de acesso de nenhum cliente.

As funções são `PClR_lista_` e `PClR_salvar_`.

### 1.3 Régua de vencimento (`SGO_Contratos_Regua.js`)

**O que entra:**
- contratos de cliente vigentes, sem os já renovados;
- representadas ativas, com a vigência do cadastro;
- contratos de Licitações, só para leitura. Os e-mails desses ficam com a agenda própria de Licitações (`licitacoesAvisos = false`), para não repetir;
- o grupo de clientes da vigência provisória, num item agregado.

**Marcos (configuráveis em `CTR_REGUA`):**
- vencimento: 120, 90, 60, 30, 15, 7 e 0 dias, mais o "vencido" uma vez, dentro da carência;
- aviso prévio: 30, 15, 7 e 0 dias antes do limite. É o alerta mais importante;
- cliente: a partir de 90 dias.

Se a régua começa tarde, vale só o marco atual. Os anteriores são registrados como "passou".

**Avisos e eventos novos (CT01 a CT06 na matriz):**
- **Equipe interna** (responsável e gestão comercial): e-mail no expediente e WhatsApp só no resumo do dia. É a regra sutil, controlada pela matriz.
- **Cliente e representada:** só e-mail (CT03), com texto formal e sem valores. Sem contato no contrato, o e-mail vai para o contato principal e, sem ele, para o e-mail do cadastro. Sem nenhum e-mail, o aviso fica registrado como PULADO com o motivo.
- **Central de pendências e Caixa de decisões:** uma fonte nova, `Contratos_fontePendencias_`, na área Comercial. O cliente vê na central dele o item publico CLIENTE do próprio contrato.
- **Tarefa de renovação** em Minhas atividades (`Com_criarAtividade_`): uma por contrato e ciclo, e nenhuma se já houver oportunidade de renovação aberta.
- **Oportunidade de renovação:** é criada pela própria `ComOpo_salvar_` do Comercial, então valem as regras dele. A referência é `ORIGEM_REF RENOVACAO:CLI:<id>`, que evita duplicar.

**Idempotência:** a tabela `CLI_CONTRATOS_AVISOS` guarda a chave fonte:id:fim:tipo:marco:público. Erro de envio tenta de novo até 3 vezes. Se o fim do contrato muda, a régua recomeça.

**Rotina diária:** `Contratos_rotina_`, chamada pela `Assistencia_rotinaGatilho` (que já roda a cada 15 minutos). Roda uma vez por dia, dentro do expediente, nesta ordem: registra a decisão da provisória, coleta os índices, propõe os reajustes, roda a régua e manda os avisos do reajuste. A tela tem o botão "Rodar a régua agora".

### 1.4 Reajuste com os índices do Banco Central

**Índices (`SGO_Contratos_Indices.js`):**
- séries do SGS: IPCA 433, INPC 188, IGP-M 189 e IPCA-E 10764;
- cache em `FIN_INDICES_ECONOMICOS`, com o endereço consultado e a data da coleta, coletado uma vez por dia;
- sem internet, o sistema usa o último valor coletado e avisa na tela;
- mês ainda não publicado deixa o reajuste "aguardando o índice", sem estimativa.

**Reajuste (`SGO_Contratos_Reajuste.js`):**
- **Aniversário:** data-base + 12n meses. O sistema propõe 45 dias antes e recalcula enquanto não houver decisão.
- **Período:** os 12 meses encerrados no mês anterior ao aniversário.
- **Cálculo:** fator = produto de (1 + v/100). O valor novo é arredondado ao centavo.
- **Acumulado negativo:** o valor é mantido (regra configurável).
- **Memória de cálculo:** fica em `CLI_CONTRATOS_REAJUSTES.MEMORIA_JSON`.

**Aprovação:**
- Só o dono e a Diretoria aprovam ou recusam, de dentro da lista de sigilo (`CtRj_podeAprovar_`). A função usa `Omie_contaNoSigilo_`, `SGO_aprovacaoSoDiretoria_` e `SGO_ehDonoOuDiretoria_`.
- Com `APROVACAO_SO_DIRETORIA = NAO`, qualquer pessoa da lista de sigilo aprova, como nas outras aprovações do Financeiro.
- A aprovação atualiza o valor do contrato (versão nova, `ACAO REAJUSTE`) e avisa o Financeiro (CT06, sem valores).
- O Financeiro marca "faturado" com o número da nota ou do pedido. **Nada é gravado no Omie.**

**Painel financeiro, aba nova "Reajustes de contratos"** (`JS_Contratos_Financeiro.html`):
- APIs `Fin_apiReajustes`, `Fin_apiReajusteDecidir`, `Fin_apiReajusteFaturado` e `Fin_apiIndicesAtualizar`, todas atrás de `Omie_exigirAcesso_` e registradas em `OMIE_SIGILO_NOMES`;
- mostra os índices do mês, o acumulado de 12 meses, os contratos a reajustar, o valor atual e o novo, a data a partir da qual se fatura e a memória de cálculo.

**Comercial:**
- Com a caixa nova **«Ver valores e reajustes dos contratos»** (`PORTAL_CLIENTE_CONTRATOS_VALORES`, padrão Administrador, Diretoria e gestão comercial), vê o índice e os valores do contrato.
- Gera a **carta de reajuste** (A4 com `RelA4_documento_`, texto justificado e memória), só depois da aprovação.
- Não vê faturamento nem movimento do Financeiro.

### 1.5 Em todos os módulos

| Módulo | O que aparece |
|---|---|
| Cadastros > Clientes > Dados | "Contrato e Portal do cliente" (`PclT_contratoCadastro_`) |
| Assistência > ficha do chamado | "Contrato do cliente" (`PclT_cobertura_`): cobertura, serviços, SLA e renovação, sem valores |
| Cliente em "Meus chamados" | "Meu contrato com a Metrolabs" (`PclCli_meuContrato_` / ação de cliente `meuContrato`), sem valores, índice ou PDF |
| Comercial | Renovação, tarefa e carta |
| Painel financeiro | Aba Reajustes de contratos |
| Representação > Representadas | Aviso com o atalho para a ficha do contrato |
| Pendências, Caixa de decisões e relatório diário | Itens da régua e só a contagem dos reajustes (`extra.sigiloFin`) |

**Tela interna do Portal do cliente:**
- abas novas: "Vencimentos e reajustes" e "Representadas";
- formulário com as condições e a IA;
- Regras com a provisória, a régua de vencimento e o histórico das regras;
- documento (carta) aberto dentro do SGO+, com "Imprimir ou salvar em PDF".

### 1.6 Ajuda e manual

- **Explicação embaixo de cada campo:** `PCL_DICAS` cobre todos os campos novos (o teste confere) e `OMIE_DICAS` ganhou `finRj*`.
- **"Como fazer nesta aba":** guias novos `PCL_GUIAS` (vencimentos, representadas e os atualizados contrato e regras) e `OMIE_GUIAS.reajustes`.
- **Ajuda da tela:** `SGO_Ajuda_PortalCliente.js` ganhou passos, problemas e perguntas.
- **Manuais atualizados:**
  - `MANUAL_MODULO_PORTAL_CLIENTE.md`, seções 13 a 22;
  - `MANUAL_PAINEL_FINANCEIRO.md`, seção 8e e campos;
  - `MANUAL_MODULO_ASSISTENCIA.md`;
  - `MANUAL_MODULO_REPRESENTACAO.md`;
  - `MANUAL_CLIENTES_UNIDADES_VINCULOS.md`;
  - `MANUAL_MODULO_COMERCIAL.md`.
- **Texto justificado e travas:** todo texto corrido novo é justificado. Cada trava diz o quê, por quê e o que fazer.

## 2. Configurações e padrões

| Chave | Padrão |
|---|---|
| `PCL_REGRAS.provisoriaAte` | `2026-12-31` (vazio = desligada) |
| `CTR_REGUA.marcos` | 120, 90, 60, 30, 15, 7, 0 |
| `CTR_REGUA.marcosAvisoPrevio` | 30, 15, 7, 0 |
| `CTR_REGUA.clienteDesdeDias` | 90 |
| `CTR_REGUA.avisarCliente` | sim |
| `CTR_REGUA.licitacoesAvisos` | não |
| `CTR_REGUA.tarefaComercial` | sim |
| `CTR_REGUA.reajusteAntecedenciaDias` | 45 |
| `CTR_REGUA.reajusteDefasagemMeses` | 1 |
| `CTR_REGUA.reajusteNegativo` | MANTER |
| `APROVACAO_SO_DIRETORIA` e `OMIE_SIGILO_CONTAS` | as que já existem (não mudaram) |
| `CTIDX_ESTADO` | estado interno da coleta |
| `CTR_ROTINA_DIA` | marca interna da rotina diária |

Toda mudança de regra exige motivo e vai para `PCL_REGRAS_HIST`.

## 3. O que ficou de fora e por quê

- **WhatsApp ao cliente:** não existe modelo aprovado pela Meta, então o CT03 sai só por e-mail. O canal está fixo em e-mail no código. Quando houver modelo, é preciso acrescentar o canal em `CtRg_enviarCliente_` e ligar o CT03 na matriz.
- **Aba própria no módulo Comercial:** não foi feita, porque os arquivos `SGO_Comercial_*.js` são conferidos como idênticos à produção (`comercial-legendas-20261113`). O Comercial trabalha pelo Portal do cliente > Contratos, pelas pendências, pela tarefa e pela oportunidade.
- **Oportunidade criada sozinha pela rotina:** não foi feita, porque o Comercial exige contato, valor e próxima ação. A rotina cria a tarefa, e a pessoa abre a oportunidade com um toque.
- **Licitações:** fica só para leitura na régua. Os e-mails continuam pela agenda de Licitações. O reajuste desses contratos continua por apostilamento lá.
- **Patch do servidor:** não precisa. Os Fin_* e Comercial já estão fora da lista do cliente (`PCL_FUNCOES_NUNCA`), e `PortalCliente_api` já está na lista dele.

## 4. Riscos

- **Volume do primeiro dia:** na publicação, todo cliente com conta ou pista passa de CONSULTA para PLENO provisório. No primeiro dia útil sai **um** CT04 agregado para a gestão comercial. A régua do contrato real dispara no marco atual, sem repetir os anteriores.
- **Gestão comercial:** sem gestor comercial configurado, os avisos internos vão para a Diretoria.
- **Contato do cliente:** sem contato no contrato, o e-mail ao cliente vai para o contato principal ou para o e-mail do cadastro. Confira antes de deixar ligado.
- **Conferir no primeiro uso real:**
  - a resposta real da API do Banco Central (o teste simula o formato documentado `[{data, valor}]`);
  - a leitura real de um PDF pela IA.
- **Duas edições em testes existentes** (para refletir a decisão nova, não para esconder defeito):
  - `portal-cliente-etapa0` passou a desligar a provisória nos testes T0.6 e T0.7, que conferem a transição antiga;
  - `financeiro-omie-20261114` passou a esperar 18 abas.

## 5. Placar da suíte

Placar completo em `contratos/suite.txt`. Referência: `etapa0/suite.txt`.

| | Arquivos | Aprovados | Falhas |
|---|---|---|---|
| Referência | 249 | 2316 | 63 |
| **Agora** | **250** | **2326** | **63** |

- Comparação arquivo a arquivo: **nenhum arquivo piorou, e as falhas são as mesmas 63 de antes**.
- A única diferença é o arquivo novo `contratos-vigencia-reajuste-20261117.test.cjs`, com **10 aprovados, 0 falhas e código de saída 0**.
- Uma falha surgiu na primeira rodada: `financeiro-onda2-e1e5` E1, porque o assistente geral não pode ter texto do Painel financeiro com "lista de sigilo". O texto da ajuda foi corrigido e o arquivo voltou a 12/0 na rodada final.

**Capturas reais** (Index com os includes da cand12) a 1366, 390 e 320 px, em `contratos/capturas/` (`*-contratos-*`, `*-contrato-form-ia`, `*-vencimentos-reajustes`, `*-representadas`, `*-regras`, `*-financeiro-reajustes`, `*-assistencia-cobertura`, `*-cliente-meu-contrato`). Resultado: sem rolagem lateral e sem erro de JavaScript (`capturas/conferencia.txt`).

## 6. Lista exata de arquivos

**Legado, novos (cand12):** `SGO_Contratos_Indices.js`, `SGO_Contratos_IA.js`, `SGO_Contratos_Regua.js`, `SGO_Contratos_Reajuste.js`, `JS_Contratos_Financeiro.html`.

**Legado, alterados (cand12):**
- `SGO_PortalCliente.js`, `SGO_PortalCliente_Config.js`, `SGO_PortalCliente_Contratos.js`;
- `JS_PortalCliente.html`, `JS_PortalCliente_Ajuda.html`, `SGO_Ajuda_PortalCliente.js`;
- `JS_Omie_Gestao.html` e `JS_Omie_Ajuda.html` (CRLF preservado), `SGO_Omie_Sigilo.js`;
- `Index.html`, `SGO_Assistencia_Painel.js`, `JS_Assistencia.html`;
- `JS_Cadastros.html` (CRLF preservado), `JS_Representacao.html`.

Os fins de linha foram conferidos depois de cada edição.

**Testes:**
- `tests/contratos-vigencia-reajuste-20261117.test.cjs` (novo);
- `tests/portal-cliente-etapa0-20261117.test.cjs` (alterado);
- `tests/financeiro-omie-20261114.test.cjs` (alterado).

**Documentos:** `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`, `docs/MANUAL_PAINEL_FINANCEIRO.md`, `docs/MANUAL_MODULO_ASSISTENCIA.md`, `docs/MANUAL_MODULO_REPRESENTACAO.md`, `docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md`, `docs/MANUAL_MODULO_COMERCIAL.md`.

**Entregas (`output/portal-cliente-20261116/contratos/`):** `RELATORIO.md`, `suite.txt`, `suite-execucao.log`, `legado-contratos.patch` (diff contra a cand12 de antes, idêntica à produção), `capturas.cjs`, `capturas/`, `antes/` (cópia dos arquivos antes da edição).
