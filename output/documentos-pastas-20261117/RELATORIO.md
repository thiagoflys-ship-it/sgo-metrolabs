# Documentos organizados por pasta — QR Code, ficha do cliente e Portal do cliente (17/11/2026)

Pedido da Priscilla (repassado pelo dono): o prontuário aberto pelo QR Code não mostrava a pasta de PGT e POP, nem as pastas de ordem de serviço e de qualificação; a ficha do cliente listava documentos soltos e repetidos; a árvore cliente → unidade → equipamento mostrava "0 documento(s)" nos equipamentos.

**Estado: PREPARADO e TESTADO na cópia `output/financeiro-20261116/candI`. NÃO publicado, sem commit, sem acesso à produção. Nenhum dado alterado ou migrado. Servidor (contêiner) não precisa de mudança.**

## 1. O que mudou

1. **Ponto central único** — `SGO_DocumentosPastas.js` (novo, só leitura):
   - `Docs_classificar_` é a classificação única e configurável.
   - `Docs_indice_` reúne os documentos de todos os módulos a cada leitura.
   - Consultas para o servidor: `Docs_doCliente_`, `Docs_daUnidade_`, `Docs_doEquipamento_` e `Docs_contagens_`.
   - `Docs_arquivoDoCliente_` atende a trava de arquivo.
   - `Docs_agruparLista_` agrupa por pasta e por versão.
   - `documentosPastas(sessionId, { escopo, id, via })` atende as telas.
   - **Fontes lidas:**
     - `DOC_DOCUMENTOS`, `CERT_CALIBRACAO`, `QUALIF_EMISSOES`, `BT_ENSAIOS`, `NR13_LAUDOS`;
     - `ATEC_OS` (só as O.S. encerradas) e `ATEC_RELATORIOS` (revisões emitidas);
     - `LAVCIC_RELATORIOS` e `REP_DOCUMENTOS`;
     - `DOC_REVISOES`, para os módulos sem tabela própria: relatório de calibração, declarações, PGT/POP, registros operacionais, cronograma e planejamento do CME;
     - a lista própria do PGT/POP e a dos Registros operacionais (planilha `MOV_DOCUMENTOS`, lida só se a propriedade existir; nunca cria planilha);
     - `CLI_CONTRATOS`, só para quem tem a caixa «Ver contratos de clientes».
   - Documento novo de qualquer módulo aparece sozinho.
2. **Componente de tela único** — `JS_DocumentosPastas.html` (novo, incluído no `Index.html`):
   - pastas recolhíveis, com contagem e com os vencidos e os que estão vencendo;
   - o documento mais novo primeiro, com a data e a validade ("Válido até", "Vence em X dias", "Vencido há X dias");
   - botão "Abrir" (e "Enviar" para a equipe) e as "Versões anteriores" guardadas dentro do documento;
   - busca e filtro por unidade e equipamento, que redesenham só a lista: o campo mantém o foco e o texto, e não há atualização automática;
   - "Como fazer nesta aba" aberto na primeira vez e lembrado no aparelho, com texto justificado;
   - toda falha diz o quê, por quê e o que fazer;
   - funciona em 320 px.
3. **QR Code / prontuário** (`JS_Core.html`, `renderProntuarioDigital_`):
   - abaixo da identificação, o cartão "Prontuário do equipamento" mostra as pastas, com a situação da qualificação no alto;
   - os documentos do equipamento vêm junto com o PGT, os POP e os registros operacionais da unidade, marcados "Da unidade"; o POP do tipo do equipamento vem primeiro;
   - a pasta antiga do Drive virou um link secundário ("arquivos guardados à mão");
   - se o componente faltar, a seção Qualificação antiga continua como reserva.
4. **Cadastros:**
   - **Cliente** (`JS_Cadastros.html`): a aba "Documentos" virou "Documentos por pasta", com todos os módulos e os filtros. A árvore usa a contagem central e mostra "N documentos" ou "Nenhum documento ligado a este equipamento".
   - **Unidade** (`JS_Cadastros.html`) e **equipamento** (`JS_Equipamentos.html`): ganharam a mesma aba. No equipamento ela é o prontuário do QR mais o que só a equipe vê (minutas marcadas e o histórico de atendimentos do Auvo sem PDF).
   - Na aba Dados, o rótulo do número antigo passou a "No Arquivo de documentos".
5. **Servidor dos cadastros:** `SGO_CadastrosPainel.js` devolve `contagemDocs` no detalhe do cliente e da unidade.
6. **Portal do cliente** (`JS_Admin.html`): no Arquivo de documentos da conta de cliente aparece, no alto, "Documentos da sua empresa por pasta". A lista antiga continua logo abaixo.
7. **Documentos gerados e envios:**
   - o servidor (`SGO_EnviarDoc.js`) devolve também `pastas`, com as versões agrupadas (POP028 v1 e v2 juntos);
   - a tela (`JS_EnviarDoc.html`) desenha por pasta, com o último envio e o botão Enviar;
   - a lista simples `documentos` continua na resposta.
8. **Trava de arquivo** (`SGO_PortalCliente_Seguranca.js`):
   - **Regra nova, antes da recusa final:** o cliente abre um documento emitido do prontuário da própria empresa, pelas mesmas regras da lista. Pode ser desligada em `DOCP_CFG`.
   - **Lista fechada de funções do cliente:** passou a incluir `documentosPastas`, `qrcodeAcessar`, `qrcodeQualificacao`, `qualifEquipamentoListar` e `qualifEquipamentoAbrir`, que as telas do cliente já usavam.
9. **Ajuda e manual:**
   - `SGO_Ajuda_Cadastros.js` ganhou o passo "Ver os documentos por pasta" e "Documentos por pasta (conta de cliente)", e teve atualizadas a unidade, o equipamento, o que o QR mostra e as perguntas;
   - `docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md` ganhou a seção "Documentos organizados por pasta" e a seção do QR foi revista;
   - a base do assistente (`SGO_AssistenteManuais.js`) foi regerada com `_tools/gerar_base_assistente.cjs` e o teste `assistente-duvidas` está verde.

## 2. Mapa de classificação

A ordem de aplicação é:
1. regra extra da configuração;
2. módulo que gerou o documento;
3. tipo registrado;
4. nome do arquivo;
5. "Outros".

| Pasta | Módulo (vale antes do tipo) | Tipo ou nome (sem acento) |
|---|---|---|
| Certificados de calibração | CERTIFICADO_CALIBRACAO, RELATORIO_CALIBRACAO | `2.`, CALIBRA, CERTIFICADO |
| Qualificações (QI, QO, QD e térmica) | *_OFICIAL, BAIXA_TEMPERATURA, DECLARACAO_QIQO | QUALIFICA, QI/QO/QD, MAPEAMENTO TERM |
| Relatórios técnicos e de ciclos | AUTOCLAVE/LAVADORA/ESTUFA/CADEIA_FRIO (ensaio e _DADOS), ciclo da lavadora, inventário | ENSAIO, CICLO, BOWIE, LEAK, RELATORIO TECNICO, INVENTARIO |
| Ordens de serviço e relatórios de atendimento | ORDEM_SERVICO, REPRESENTACAO | `4.`, ORDEM DE SERVIÇO, ATENDIMENTO, RONDA, OS-nnnn |
| Manutenção preventiva e corretiva | CRONOGRAMA_EXECUCAO | `1.`, MANUTEN, PREVENTIV, CORRETIV, CRONOGRAMA |
| PGT e POP | PGT_POP, PLANEJAMENTO_CME | PGT/PGTS, POP/POPnnn, PLANO DE GERENCIAMENTO, PROCEDIMENTO OPERACIONAL |
| Registros operacionais | REGISTROS_OPERACIONAIS | REGISTRO OPERACIONAL |
| NR-13 (vasos de pressão) | NR13 | NR13, VASO DE PRESSÃO, CALDEIRA |
| Laudos e declarações | DECLARACAO_EXECUCAO | LAUDO, DECLARA, ATESTADO, PARECER |
| Contratos e propostas (interna) | contrato do cliente | `5.`, CONTRAT, PROPOSTA, ORÇAMENTO, NOTA FISCAL |
| Outros documentos | — | o que sobrar |

O teste confere que todos os módulos do `DOC_REVISOES` e todas as pastas de cliente do envio de documentos têm uma pasta própria, ou seja, nenhum cai em "Outros".

## 3. Por que aparecia "0 documento(s)"

A árvore contava só as linhas do **Arquivo de documentos** (`DOC_DOCUMENTOS`) que tinham `EQUIPAMENTO_ID`. Por isso a maior parte dos equipamentos ficava em 0:

- **Fora da contagem:**
  - os relatórios de qualificação e de ensaio (`QUALIF_EMISSOES`: só os _OFICIAL são registrados no Arquivo);
  - os relatórios de O.S.;
  - as declarações e os relatórios de calibração;
  - o PGT e os POP, que são da unidade e não têm equipamento;
  - o histórico do Auvo.
- **O que estava no Arquivo:** sobretudo os certificados do CertCal, alguns em dobro. Daí os "26" no topo e as repetições.

**Conclusão por leitura de código; os dados reais não foram consultados.** Agora a contagem soma todos os módulos ligados ao equipamento, e o mesmo arquivo conta uma vez só.

## 4. Decisões (padrão seguro e configurável)

- **A conta de cliente e o QR Code nunca recebem:** pasta interna, minuta, rascunho, documento inativo, versão interna da Representação nem PGT/POP suspenso.
- **No QR, a equipe vê** a lista do cliente; o PGT/POP suspenso aparece marcado. Na ficha, a equipe vê tudo, inclusive as minutas (sem abrir).
- **Links do cliente:** sempre `/arquivos/<id>`, sem link do Drive e sem os campos `arquivoId`/`docDocumentoId`.
- **Trava do cliente:** passa a abrir os documentos emitidos do prontuário dele (`DOCP_CFG.clienteAbreProntuario`, padrão SIM). Com SIM desligado, o item mostra "Peça a cópia à Metrolabs".
- **PDF do contrato do Portal:** só para quem tem a caixa «Ver contratos de clientes». O contrato registrado no Arquivo continua visível à equipe, como antes.
- **Documentos da unidade no prontuário do equipamento:** PGT e POP e Registros operacionais (configurável).
- **Prazo de "vencendo":** 30 dias. O dia do vencimento conta como "Vence hoje", na regra das qualificações (a central de pendências trata o mesmo dia como vencido).
- **Versões:** mesmo número ou mesmo nome sem "Rev./_vN/carimbo" viram versões, com a mais nova na frente; o mesmo arquivo em várias fontes vira um documento, com o aviso "registrado em N lugares".
- **`DOCP_CFG` é uma propriedade do servidor:** não ganhou tela em Chaves e senhas.

## 5. Riscos e limites

- **Custo de leitura:** cada consulta lê várias tabelas e, se configuradas, as planilhas do PGT/POP e dos Registros operacionais. Abrir a ficha do cliente também calcula a contagem (sem as planilhas). O tempo real precisa ser conferido em produção.
- **O que não mudou:** as listas de Equipamentos e Clientes (números "Documentos" e "Sem documento") seguem contando só o Arquivo de documentos.
- **PGT/POP pelo CNPJ:** se o CNPJ digitado no módulo não for o de nenhum cliente ou unidade cadastrada, o documento não aparece.
- **Acesso do cliente:** a regra nova da trava amplia o que o cliente abre (só o prontuário dele). A decisão é do dono; para desligar, use `{"clienteAbreProntuario": false}`.
- **Capturas sem ícones:** os ícones do Font Awesome não aparecem porque o teste bloqueia a internet.
- **Barra "Início/Ajuda/Conta" nas capturas do QR:** é efeito da montagem do teste. No fluxo real ela fica escondida.
- **Sem teste com dados reais:** não houve teste operacional real; a conta da Priscilla, os 323 equipamentos e os documentos reais não foram consultados.

## 6. Placar

- **Suíte completa** (`output/documentos-pastas-20261117/suite.txt`): 254 arquivos, **2426 aprovados e 0 falhas**, nenhum arquivo com saída diferente de zero.
- **Comparação com a referência** (`output/assistente-20261117/suite.txt`, 2417/0): todos os 253 arquivos ficaram iguais. O único novo é `documentos-pastas-20261117.test.cjs`, com 9/0; nenhum piorou.
- **Lista relacionada**, todos com 0 falhas:

| Arquivo | Aprovados |
|---|---|
| portal-cliente-etapa0 | 11 |
| enviar-documento | 13 |
| qualificacao-integrada | 14 |
| assistente-duvidas | 12 |
| assistente-ia-eficaz | 12 |
| cadastro-qualidade | 12 |
| cadastro-equipamento-campos | 8 |
| padroes-equipamento-documentos | 11 |
| documentos-celular | 9 |
| acesso-cliente | 9 |
| relatorios-qualificacao-cadastro | 3 |

## 7. Arquivos

Legado (`output/financeiro-20261116/candI`); o fim de linha foi preservado e conferido.

| Arquivo | Situação |
|---|---|
| `SGO_DocumentosPastas.js` | **novo** |
| `JS_DocumentosPastas.html` | **novo** |
| `Index.html` | include |
| `JS_Core.html` | QR |
| `JS_Cadastros.html` | CRLF |
| `JS_Equipamentos.html` | CRLF |
| `JS_Admin.html` | portal |
| `JS_EnviarDoc.html` | envios |
| `SGO_CadastrosPainel.js` | CRLF |
| `SGO_EnviarDoc.js` | envios |
| `SGO_PortalCliente_Seguranca.js` | CRLF, trava e lista |
| `SGO_Ajuda_Cadastros.js` | ajuda |
| `SGO_AssistenteManuais.js` | regerado |

Fora do legado:
- `docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md`;
- `tests/documentos-pastas-20261117.test.cjs` (novo).

Material de apoio:
- **Originais:** `output/documentos-pastas-20261117/antes/` (`candH` é idêntica à `candI` original).
- **Diferenças:** `mudancas-legado.patch` e `mudancas-docs.patch`.

Arquivos que ficaram de fora:
- **Servidor e contêiner:** nenhuma mudança.
- **Comercial, Frota, RH360 e Financeiro:** não foram tocados.
- **PGT/POP:** nada foi regerado.

## 8. Capturas (telas reais, para o dono conferir)

Pasta: `output/documentos-pastas-20261117/capturas/`

| Tela | Arquivos |
|---|---|
| Prontuário pelo QR, 390 e 320 px, equipe e cliente | `390-prontuario-qr-equipe.png`, `390-prontuario-qr-cliente.png`, `320-prontuario-qr-equipe.png`, `320-prontuario-qr-cliente.png` |
| Mesmas telas com as pastas abertas | os mesmos nomes terminados em `-pastas-abertas.png` |
| Ficha do cliente, 1366 px | `1366-ficha-cliente-documentos-por-pasta.png`, `1366-ficha-cliente-busca-TER-01.png`, `1366-ficha-cliente-arvore-contagem.png` |
| Visão do cliente | `1366-cliente-arquivo-de-documentos-por-pasta.png`, `390-cliente-arquivo-de-documentos-por-pasta.png` |

## 9. Para publicar (quando o dono autorizar)

1. Publicar em camada sobre a imagem atual (`assistente-ia-20261117`) os 13 arquivos do legado listados acima.
2. Depois de publicar, conferir na produção:
   - o QR de um equipamento do Hospital Santa Lúcia, com a conta da Priscilla e com uma conta de cliente;
   - a aba "Documentos por pasta";
   - a árvore com a contagem nova;
   - o tempo de resposta.
