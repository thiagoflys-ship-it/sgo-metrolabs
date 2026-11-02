# SGO+ Licitações — Regras de negócio: licitações, aderência técnica e preço (Especialistas 02, 03 e 09)

Data: 01/11/2026. Autores: Especialista 02 (Licitações Públicas), Especialista 03 (Compras Hospitalares e Engenharia Clínica) e Especialista 09 (Financeiro e Precificação). Fase: diagnóstico. Nenhum código de produção foi escrito, nada foi publicado e nada foi gravado em produção.

Documentos de entrada: `LICITACOES_00_MISSAO_DIRETORIA_20261101.md` (requisitos e decisões do dono), `LICITACOES_01_DIAGNOSTICO_ARQUITETURA_20261101.md` (arquitetura) e `LICITACOES_02_INTEGRACOES_APIS_20261101.md` (APIs e os 76 achados reais da varredura do PNCP). Código lido: `SGO_Comercial_CatalogoOficial.js`, `SGO_Comercial_TabelaC1.js`, `SGO_Comercial_Precificacao.js`, `SGO_Comercial_Config.js` (bloco `precificacao`), `SGO_Comercial_Ficha.js` e o manual `MANUAL_MODULO_COMERCIAL.md`.

Convenção deste documento:
- **VERIFICADO** = texto oficial lido hoje (01/11/2026) na fonte citada (planalto.gov.br ou gov.br/compras). Os trechos legais foram baixados e conferidos, não citados de memória.
- **INTERPRETAÇÃO** = leitura nossa de um texto verificado. Precisa de validação jurídica antes de virar regra automática.
- **PENDENTE** = depende do edital, de documento interno ou de decisão do dono.

Decisões do dono que valem para tudo abaixo (doc 00): CNPJ participante sempre a matriz de Goiânia; quem opera e decide é a Diretoria (Charles e um segundo colaborador a definir); alertas de licitação só para eles, inclusive fora do expediente; radar Brasil inteiro, sem valor mínimo, com prioridade para GO, DF, estados vizinhos e RJ.

---

## 0. Resumo para a Diretoria

1. **A lei aplicável vem do campo `amparoLegal` da contratação, não da modalidade.** O mesmo "pregão eletrônico" no Compras.gov pode ser da Lei 14.133/2021 (impugnação até 3 dias úteis antes) ou da Lei 13.303/2016 de estatal (impugnação até 5 dias úteis antes). A varredura real tem os dois casos (IMBEL, Lei 13.303).
2. **Prazos legais que o SGO+ calcula sozinho** (sempre marcados como cálculo, nunca como confirmados): publicação mínima (art. 55), impugnação e esclarecimento (art. 164), razões e contrarrazões de recurso (art. 165), dispensa eletrônica (3 dias úteis, IN 67/2021). **Prazos que só o edital ou o pregoeiro definem**: sessão, proposta ajustada e documentos após o lance (no Compras.gov, no mínimo 2 horas, IN 73/2022), assinatura do contrato, garantia, vistoria. Esses entram como "pendente de confirmação" até uma pessoa conferir.
3. **Dia útil depende do expediente do órgão comprador** (art. 183, III). Feriado municipal e ponto facultativo não chegam por API. Regra: prazo contado para trás (impugnação) leva 1 dia útil de folga; prazo contado para frente (recurso) é calculado sem contar feriados desconhecidos, para nunca passar do limite real.
4. **Habilitação hoje não tem cadastro no SGO+** (doc 01, 1.12). A seção A4 lista os 27 documentos que precisam de controle com validade. Sem isso, a declaração de que a empresa cumpre os requisitos (exigida pelo sistema de disputa) vira risco de declaração falsa, que é infração punida com inidoneidade de 3 a 6 anos (art. 155, VIII, e art. 156, § 5º).
5. **Itens exclusivos para ME/EPP**: até R$ 80.000 hoje (LC 123, art. 48, I); a partir de 01/01/2027, até o limite da dispensa de obras e engenharia (R$ 130.984,20 em 2026), pela LC 238/2026. Se a matriz não for ME/EPP, esses itens são trava de participação. É a primeira pergunta ao dono.
6. **Palavra parecida não basta.** Dos 76 achados da varredura, 48 eram falsos positivos de palavra (22) ou compra de produto (26) (castração de cães e gatos, reagentes "de calibração", embalagem "para esterilização", serviço terceirizado de esterilização, borracharia de pneus, compra de autoclave). A classificação exige trecho literal do objeto, do item ou do edital e separa fato, inferência e pendência.
7. **Pontuação de aderência 0 a 100** com sete critérios (capacidade 30, margem 15, documentação 15, localização 15, prazo 10, valor 10, riscos 5) e travas que zeram a nota (exclusiva ME/EPP, objeto fora, acreditação exigida e não detida, prazo vencido, impedimento).
8. **Preço**: o piso de cada item é a conta da política do Comercial (sobra de 35% depois de impostos de Goiânia e comissão, antes de IR e CSLL); o alvo é 40%. Em licitação o deslocamento quase sempre precisa ir diluído no preço unitário. Nenhum lance abaixo do piso aprovado pela Diretoria; o valor mínimo parametrizado no robô do próprio Compras.gov (IN 73/2022, art. 19) nunca pode ser menor que o piso aprovado.
9. **Achado do Financeiro**: pela ficha de custo da C1 (custo R$ 63,16 por termômetro), o CAL-001 a R$ 75,50 deixa sobra negativa (−0,9%). O piso pela política é R$ 132,28 sem viagem. Com 100 termômetros a 300 km de Goiânia e o deslocamento diluído, o piso sobe para R$ 213,27 por termômetro (seção C9). A mediana do mercado público para o serviço é R$ 132 (143 preços, PNCP).
10. **Ata de registro de preços não obriga o órgão a contratar** (art. 83). O piso de uma ata precisa ser calculado pelo menor pedido plausível por ordem de serviço, não pelo quantitativo estimado. No exemplo, chamados de 10 termômetros a 300 km levam o piso a R$ 785,16 por termômetro.

---

# A. Licitações (Especialista 02)

## A1. Regimes jurídicos e como o SGO+ identifica cada um

| Regime | Quem compra | Regra de prazos e recursos | Como identificar na fonte | Observação |
|---|---|---|---|---|
| Lei 14.133/2021 | Administração direta, autarquias e fundações da União, estados, DF e municípios | Arts. 55, 164, 165, 183 da lei e regulamento do ente (federal: IN SEGES 73/2022 e 67/2021) | PNCP `amparoLegal.nome` começa por "Lei 14.133/2021" (códigos observados: 1 = art. 28, I; 18 = art. 75, I; 19 = art. 75, II) | 55 dos 76 achados |
| Lei 13.303/2016 | Empresas públicas e sociedades de economia mista (ex.: IMBEL, Petrobras) | Arts. 39 (prazos), 59 (recurso em fase única, 5 dias úteis), 87, § 1º (impugnação até 5 dias úteis) e **regulamento interno de cada estatal** (art. 40) | `amparoLegal.nome` começa por "Lei 13.303/2016" (códigos observados: 113 = art. 32, IV; 85 = art. 29, II) | 5 dos 76 achados; a estatal pode usar o Compras.gov e mesmo assim seguir a 13.303 |
| Regulamento próprio (Sistema S e similares) | Entidades como SESC e SENAI | Regulamento da entidade e edital | Órgão aparece no PNCP com amparo próprio ou sem amparo da 14.133 | 1 caso na varredura (SESC, compra de autoclave) |
| Plataformas privadas hospitalares e corporativas | Hospitais privados, operadoras, indústrias | Termos de uso da plataforma e condições do comprador. **Não há lei de licitação**: sem impugnação, sem recurso administrativo, sem prazo legal mínimo | Não passam pelo PNCP; chegam por integração de parceiro ou e-mail da plataforma (doc 02, 2.3 e 2.4) | Prazo de cotação definido pelo comprador, em geral curto |

Regra: o conector grava `amparoLegal` (código e nome) e o legado escolhe o conjunto de regras pelo amparo. Amparo ausente ou desconhecido = "regime pendente de confirmação" e nenhum prazo legal é calculado.

Fontes (VERIFICADO): Lei 14.133/2021, https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm ; Lei 13.303/2016, https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm .

## A2. Modalidades e procedimentos

| Procedimento | Base legal (VERIFICADO) | Quando aparece para a Metrolabs | Código PNCP (`modalidadeId`) | Código Compras.gov (`codigoModalidade`) |
|---|---|---|---|---|
| Pregão eletrônico | Art. 6º, XLI (obrigatório para bens e serviços comuns, menor preço ou maior desconto); art. 29 (não se aplica a serviço técnico especializado de natureza predominantemente intelectual nem a obra e serviço de engenharia, exceto serviço comum de engenharia) | Calibração, qualificação, manutenção, NR-13, engenharia clínica | 6 (PROVADO, doc 02) | 5 (PROVADO) |
| Concorrência eletrônica | Art. 28, II; mesmo rito do art. 17 | Serviços especiais, técnica e preço, engenharia não comum | 4 (PROVADO) | 3 (PROVADO) |
| Dispensa eletrônica | Art. 75, I e II, § 3º (aviso por no mínimo 3 dias úteis); IN SEGES/ME 67/2021 | Serviços pequenos (calibração de balanças, equipamentos audiológicos) | 8 (PROVADO); `modoDisputaId` 4 "Dispensa Com Disputa" | 6 (PROVADO) |
| Inexigibilidade | Art. 74 (inviabilidade de competição; exclusividade; notória especialização) | Só para inteligência de mercado (quem foi contratado e por quanto) | 9 (PROVADO) | 7 (PROVADO) |
| Credenciamento | Art. 78, I, e art. 79 (contratações paralelas, padronizadas; inciso IV incluído pela Lei 15.266/2025) | Raro; quando houver, é chamamento contínuo, sem disputa de preço | 12 (consta do doc 02; código a reconferir quando a tabela de domínio do PNCP responder) | não observado |
| Sistema de registro de preços (SRP) | Art. 6º, XLV e XLVI; arts. 82 a 86 | Muito comum ("futura e eventual contratação"); campo `srp: true` | não é modalidade: é o campo `srp` | idem |
| Adesão à ata (carona) | Art. 86, §§ 2º a 5º (até 50% por órgão aderente; total das adesões até o dobro do item) | Órgão que adere a ata de outro; não é oportunidade nova para disputar (exemplo real: Turvelândia/GO aderindo a ata para comprar autoclave) | aparece como pregão do aderente | — |

Outros códigos de modalidade do PNCP (leilão, diálogo competitivo, concurso, presenciais, pré-qualificação, manifestação de interesse, inaplicabilidade) **não foram conferidos hoje**: a tabela de domínio da API de integração do PNCP (`/api/pncp/v1/modalidades`) respondeu HTTP 503 em 01/11/2026 às 20h40. Não usar código que não foi provado.

Campos que mudam a regra, observados na varredura: `modoDisputaId` 1 Aberto, 3 Aberto-Fechado, 4 Dispensa Com Disputa, 5 Não se aplica; `tipoInstrumentoConvocatorioCodigo` 1 Edital, 2 Aviso de Contratação Direta (há disputa), 3 Ato que autoriza a Contratação Direta (**contratação já decidida, sem disputa: vai só para inteligência de mercado**).

Valores de 2026 (Decreto 12.807/2025, VERIFICADO, https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/D12807.htm): dispensa por valor de obras, serviços de engenharia e manutenção de veículos (art. 75, I) R$ 130.984,20; outros serviços e compras (art. 75, II) R$ 65.492,11; dispensa de documentos de habilitação (art. 70, III) R$ 392.952,63. O valor é atualizado todo 1º de janeiro (art. 182); o SGO+ guarda a tabela por ano em `LIC_CONFIG`, nunca no código.

## A3. Prazos

### A3.1 Tabela de prazos

| Prazo | Regra | Quem define | Fonte (VERIFICADO) |
|---|---|---|---|
| Publicação mínima até a proposta (14.133) | Bens: 8 dias úteis (menor preço/maior desconto) ou 15. Serviços comuns e serviços comuns de engenharia: 10 dias úteis (menor preço/maior desconto). Serviços especiais: 25. Integrada: 60. Semi-integrada e demais: 35. Técnica e preço: 35. Contados da divulgação do edital. Pode cair à metade em licitação do Ministério da Saúde no SUS (§ 2º) | Lei; o edital marca a data | Art. 55 |
| Retificação do edital | Nova divulgação e mesmos prazos, salvo quando a alteração não compromete a formulação das propostas | Órgão (decide se reabre o prazo) | Art. 55, § 1º |
| Publicação mínima (estatais) | Bens: 5 dias úteis (menor preço/maior desconto) ou 10. Obras e serviços: 15 ou 30. Técnica, técnica e preço, integrada e semi-integrada: 45 | Lei e regulamento | Lei 13.303, art. 39 |
| Impugnação e esclarecimento (14.133) | Protocolar até 3 dias úteis antes da data de abertura; resposta em até 3 dias úteis, limitada ao último dia útil antes da abertura | Lei; o edital indica canal e horário | Art. 164 e parágrafo único |
| Impugnação (estatais) | Até 5 dias úteis antes da data do certame; resposta em até 3 dias úteis. Esclarecimento: regulamento da estatal | Lei e regulamento | Lei 13.303, art. 87, § 1º |
| Proposta inicial (Compras.gov) | Até a data e hora de abertura da sessão; pode ser retirada ou substituída até a abertura | Edital | IN 73/2022, art. 18 e § 4º |
| Proposta ajustada ao último lance e documentos complementares | No mínimo 2 horas, prorrogável por igual período, contado da solicitação do agente de contratação no sistema | Edital fixa o mínimo; o pregoeiro dispara | IN 73/2022, art. 29, § 2º e § 3º; art. 30, § 4º |
| Documentos de habilitação (do vencedor) | No prazo do edital, no mínimo 2 horas após a solicitação no sistema, prorrogável | Edital e pregoeiro | IN 73/2022, art. 39, § 5º |
| ME/EPP com restrição fiscal | 5 dias úteis, prorrogáveis, a partir de ser declarada vencedora | Lei | LC 123, art. 43, § 1º (não se aplica se a matriz não for ME/EPP) |
| Intenção de recurso | Imediata, na sessão, sob pena de preclusão (julgamento e habilitação) | Lei; a janela é aberta pelo pregoeiro no sistema | Art. 165, § 1º, I |
| Razões de recurso | 3 dias úteis da intimação ou da lavratura da ata (para julgamento e habilitação, conta da ata de habilitação, ou da de julgamento se houver inversão de fases) | Lei | Art. 165, I, e § 1º, I |
| Contrarrazões | Mesmo prazo do recurso, a partir da intimação pessoal ou da divulgação da interposição | Lei | Art. 165, § 4º |
| Decisão do recurso | Reconsideração em 3 dias úteis; autoridade superior decide em até 10 dias úteis | Lei | Art. 165, § 2º |
| Recurso (estatais) | Fase única, 5 dias úteis após a habilitação | Lei e regulamento | Lei 13.303, art. 59, § 1º |
| Pedido de reconsideração | 3 dias úteis, contra ato sem recurso hierárquico | Lei | Art. 165, II |
| Recurso contra sanção (advertência, multa, impedimento) | 15 dias úteis da intimação | Lei | Art. 166 |
| Assinatura do contrato ou da ata | Prazo do edital; prorrogável uma vez por igual período, a pedido justificado durante o prazo | Edital | Art. 90 e § 1º |
| Validade da proposta | Prazo do edital; vencido sem convocação, o licitante fica liberado | Edital | Art. 90, § 3º |
| Garantia por seguro-garantia | O edital dá no mínimo 1 mês, contado da homologação e antes da assinatura | Lei e edital | Art. 96, § 3º |
| Dispensa eletrônica | Aviso por no mínimo 3 dias úteis; lances públicos por período de 6 a 10 horas | Lei, IN e aviso | Art. 75, § 3º; IN 67/2021, art. 6º, parágrafo único, e art. 11 |
| Vigência da ata de registro de preços | 1 ano, prorrogável por igual período se o preço continuar vantajoso | Lei | Art. 84 |
| Reajuste | Índice obrigatório no edital e no contrato, com data-base na data do orçamento estimado; serviços contínuos com interregno mínimo de 1 ano | Lei e edital | Art. 25, §§ 7º e 8º; art. 92, §§ 3º e 4º |

Fontes: IN SEGES/ME 73/2022, https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022 ; IN SEGES/ME 67/2021, https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-67-de-8-de-julho-de-2021 ; LC 123/2006, https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm .

Atenção: as IN 73/2022 e 67/2021 valem para a União e para quem usa o Compras.gov. Estados e municípios podem ter regulamento próprio. O prazo de 2 horas, por exemplo, é regra federal: em portal estadual ou municipal, o prazo vem do edital (PENDENTE por edital).

### A3.2 Contagem dos prazos (art. 183, VERIFICADO)

- Exclui o dia do começo e inclui o do vencimento.
- Dias corridos: contínuos. Meses e anos: data a data (sem dia equivalente, vale o último dia do mês).
- Dias úteis: **só os dias com expediente administrativo no órgão ou entidade competente** (inciso III).
- Dia do começo, salvo disposição em contrário: o primeiro dia útil seguinte ao da disponibilização na internet (§ 1º, I).
- Prorroga-se ao primeiro dia útil seguinte se o vencimento cair em dia sem expediente, com expediente encerrado antes da hora normal ou com indisponibilidade da comunicação eletrônica (§ 2º).

Regras do SGO+ (INTERPRETAÇÃO, para validação jurídica):
1. Calendário em três camadas: nacional, estadual e municipal do órgão. O expediente existente no SGO+ (`SGO_Expediente.js`) tem feriados de Goiânia; precisa da camada por município e UF (dependência).
2. Feriado municipal, ponto facultativo e expediente reduzido do órgão não chegam por API: todo prazo em dia útil calculado pelo SGO+ nasce como **INFERÊNCIA** com o texto "calculado pelo calendário conhecido; confirmar no edital ou com o órgão".
3. Prazo contado **para trás** a partir da abertura (impugnação, esclarecimento): o SGO+ mostra o limite calculado e um **limite interno com 1 dia útil de folga**. Os alertas usam o limite interno.
4. Prazo contado **para frente** (recurso, contrarrazões, documentos): o SGO+ não acrescenta feriado que não conhece. Assim o limite exibido nunca fica depois do limite real.
5. Hora do limite: a lei fala em dias; o edital costuma fixar a hora (ex.: "até as 23h59" ou "até o fim do expediente"). Sem hora no edital, o limite interno é 17h do horário do órgão.

Exemplos reais (calendário nacional de 2026; 02/11 é Finados, segunda-feira):

| Oportunidade (varredura doc 02) | Abertura | Regime | Limite de impugnação calculado | Situação em 01/11/2026 |
|---|---|---|---|---|
| `00444232000139-1-001311/2026`, IMBEL, Magé/RJ, NR-13 em vasos de pressão | 13/11/2026 (sexta) 08:00 | Lei 13.303 (amparo código 113) | 5 dias úteis antes: 12, 11, 10, 09 e 06/11 → **até 06/11/2026**. Se o SGO+ aplicasse a 14.133 por engano, daria 10/11 | Aberto. Feriado municipal de Magé e regulamento da IMBEL: PENDENTE |
| `78680337000770-1-000430/2026`, Cascavel/PR, manutenção com calibração | 04/11/2026 (quarta) 08:30 | Lei 14.133 | 3 dias úteis antes: 03/11 (1), 02/11 é feriado, 30/10 (2), 29/10 (3) → **até 29/10/2026** | Prazo de impugnação já vencido; ainda é possível disputar |

### A3.3 Fuso horário

- Compras.gov e dispensa eletrônica federal: horário de Brasília, inclusive para contagem de tempo e registro (IN 73/2022, art. 48; IN 67/2021, art. 25, VERIFICADO).
- PNCP: datas sem fuso (doc 02, 3.4). O SGO+ guarda o texto original, grava o fuso como "presumido: Brasília" e pede confirmação quando o órgão está em UF com outro fuso (AM, MT, MS, RO, RR, AC) ou quando o edital diz "horário local".
- Plataformas privadas e portais estaduais: o fuso vem da própria plataforma ou do edital (PENDENTE por portal, registrado em `LIC_PORTAIS`).

## A4. Habilitação (arts. 62 a 70, VERIFICADO)

Regras que mudam o trabalho:
- Habilitação é jurídica, técnica, fiscal/social/trabalhista e econômico-financeira (art. 62).
- Em regra só o vencedor apresenta documentos (art. 63, II), e a regularidade fiscal só depois do julgamento (art. 63, III). Mas o licitante declara antes, no sistema, que cumpre os requisitos (art. 63, I; IN 73/2022, art. 18, § 2º); a falsidade sujeita a sanção (IN 73/2022, art. 18, § 3º).
- Depois de entregues, os documentos não podem ser trocados, salvo diligência para complementar informação de fato já existente na abertura ou atualizar documento que venceu depois do recebimento das propostas (art. 64). **Documento vencido na data da sessão não se corrige depois.**
- Atestados técnicos: só das parcelas de maior relevância (valor individual igual ou superior a 4% do total) e com quantidades mínimas de até 50% dessas parcelas, sem limitação de tempo ou local (art. 67, §§ 1º e 2º). Serviço contínuo: pode exigir execução anterior por prazo mínimo de até 3 anos (art. 67, § 5º).
- Econômico-financeira: balanço, DRE e demonstrações dos 2 últimos exercícios e certidão negativa de falência da sede (art. 69, I e II); vedado exigir faturamento mínimo ou índice de rentabilidade (art. 69, § 2º); pode exigir capital ou patrimônio líquido mínimo de até 10% do valor estimado (art. 69, § 4º).
- Documentos podem ser substituídos por registro cadastral (SICAF no federal) quando o edital prevê (art. 70, II; IN 73/2022, art. 39), e consulta a sítio oficial do emissor vale como prova (IN 73/2022, art. 39, § 6º).

Lista de documentos que o SGO+ precisa controlar, com validade. Validade nunca é presumida: o SGO+ grava a data impressa no documento ou a regra do emissor; o edital pode exigir emissão recente. Dono do cadastro: "Documentos da empresa" no grupo Documentos (dependência 1 do doc 01), consumido por Licitações.

| # | Documento | Grupo (art.) | Validade | Observação |
|---|---|---|---|---|
| 1 | Contrato social consolidado e alterações | Jurídica (66) | Sem validade; vale a versão vigente | Alerta quando houver alteração contratual |
| 2 | Comprovante de inscrição no CNPJ (matriz Goiânia) | Fiscal (68, I) | Emitir na data | Sempre a matriz (decisão do dono) |
| 3 | Documento do administrador e procuração do representante nas plataformas | Jurídica | Validade da procuração | Uma por plataforma quando exigido |
| 4 | Certidão simplificada da Junta Comercial | Jurídica | A do edital | Muitos editais pedem até 30 ou 90 dias (PENDENTE por edital) |
| 5 | Inscrição estadual e municipal | Fiscal (68, II) | Emitir na data | — |
| 6 | Certidão conjunta Receita Federal e PGFN | Fiscal (68, III) | Data impressa | — |
| 7 | Certidão estadual (GO) | Fiscal (68, III) | Data impressa | — |
| 8 | Certidão municipal (Goiânia) | Fiscal (68, III) | Data impressa | — |
| 9 | Certificado de regularidade do FGTS | Fiscal (68, IV) | Data impressa | Validade curta: é o que mais vence |
| 10 | Certidão negativa de débitos trabalhistas | Trabalhista (68, V) | Data impressa | — |
| 11 | Declaração de não empregar menor (CF, art. 7º, XXXIII) | Social (68, VI) | Por certame | Modelo do SGO+, assinada pela Diretoria |
| 12 | Declaração de reserva de cargos para PcD e reabilitados | 63, IV | Por certame | Idem |
| 13 | Declaração de que a proposta cobre todos os custos trabalhistas | 63, § 1º | Por certame | Idem |
| 14 | Balanço patrimonial, DRE e demonstrações dos 2 últimos exercícios | Econômico (69, I) | Até o balanço do exercício seguinte ser exigível | O contador informa a data |
| 15 | Índices contábeis do edital e declaração do contador | Econômico (69, § 1º) | Por exercício | O SGO+ guarda os índices calculados para comparar com o edital |
| 16 | Certidão negativa de falência e recuperação judicial (distribuidor da sede) | Econômico (69, II) | A do edital ou a impressa | — |
| 17 | Capital social ou patrimônio líquido | Econômico (69, § 4º) | Por exercício | Para conferir o limite de 10% |
| 18 | Atestados de capacidade técnica | Técnica (67, II) | Sem validade | Por serviço, quantidade, cliente, período e responsável técnico; ligado à O.S. e ao relatório que o comprova |
| 19 | Certidão de registro e quitação da empresa no conselho profissional | Técnica (67, V) | Data impressa | Quando o objeto exigir |
| 20 | Responsável técnico: registro no conselho, acervo técnico (CAT) e vínculo | Técnica (67, I) | Registro anual; vínculo vigente | Depende de RH técnico (dependência 2 do doc 01); NR-13 exige profissional legalmente habilitado |
| 21 | ART do serviço | Técnica | Por serviço | Emitida na execução |
| 22 | Acreditação de laboratório (Cgcre/Inmetro, ABNT NBR ISO/IEC 17025) com escopo | Técnica (67, IV, quando exigida) | Data do certificado e escopo vigente | **Escopo por grandeza e faixa**: ter acreditação em temperatura não atende pedido em massa |
| 23 | Certificados de calibração dos padrões (rastreabilidade) | Técnica (67, III) | Validade de cada certificado | Já existe em `CAD_PADROES` |
| 24 | Relação de equipe, instalações e aparelhamento | Técnica (67, III) | Por certame | Do cadastro de padrões e de RH |
| 25 | Declaração de vistoria ou de conhecimento das condições locais | Técnica (63, §§ 2º e 3º; 67, VI) | Por certame | Vistoria pode ser substituída por declaração (art. 63, § 3º) |
| 26 | Relação de compromissos assumidos | 67, § 8º; 69, § 3º | Por certame | Do Comercial e dos contratos ativos |
| 27 | Cadastros de fornecedor: SICAF, cadastros estaduais e das plataformas | 70, II | Validade de cada cadastro | Já previsto em `LIC_PORTAIS.CADASTRO_VALIDO_ATE` |

## A5. Julgamento, disputa e pós-disputa

**Modos de disputa** (art. 56, VERIFICADO): aberto (lances públicos sucessivos) e fechado (sigilo até a hora marcada), isolados ou combinados. Fechado isolado é vedado com menor preço ou maior desconto (§ 1º). Lance intermediário, no menor preço, é o igual ou superior ao menor já ofertado (§ 3º, II). Se a melhor proposta ficar pelo menos 5% abaixo da segunda, a disputa aberta pode ser reiniciada para definir as demais colocações (§ 4º). O edital pode fixar intervalo mínimo entre lances, que vale para os intermediários e para quem cobre a melhor oferta (art. 57).

**No Compras.gov** (IN 73/2022, VERIFICADO):
- Aberto: 10 minutos, com prorrogação automática de 2 minutos sempre que houver lance nos últimos 2 minutos, inclusive intermediário (art. 23).
- Aberto e fechado: 15 minutos; aviso de fechamento iminente; encerramento aleatório em até 10 minutos; depois, o autor do menor lance e os que estiverem até 10% acima dão um lance final fechado em até 5 minutos; com menos de 3 nessa faixa, entram os melhores seguintes até 3 (art. 24).
- Fechado e aberto: só a melhor proposta e as até 10% acima vão para a fase aberta (art. 25).
- O licitante pode excluir o próprio último lance uma vez, em até 15 segundos, se inconsistente ou inexequível (art. 21, § 3º).
- **Valor final mínimo parametrizado**: ao cadastrar a proposta, o licitante pode fixar o valor final mínimo e o sistema dá lances automáticos até ele, respeitando o intervalo mínimo; o valor é sigiloso e só pode baixar durante a disputa (art. 19). A dispensa eletrônica tem a mesma ferramenta (IN 67/2021, art. 9º). **Regra do SGO+: o valor final mínimo digitado na plataforma é igual ou maior que o piso aprovado pela Diretoria; o operador registra no SGO+ o valor parametrizado e o SGO+ confere.** É a única forma de lance automático hoje autorizada pela própria plataforma (o doc 02 não achou API de lance para fornecedor).

**Inexequibilidade**: obras e serviços de engenharia abaixo de 75% do orçado são inexequíveis (art. 59, § 4º); bens e serviços em geral abaixo de 50% do orçado são indício, que só vale após diligência que comprove custo acima da proposta (IN 73/2022, art. 34). Para nós, isso vale nos dois sentidos: um lance nosso muito abaixo da referência pode ser chamado a provar custo.

**Negociação**: depois do julgamento, com o primeiro colocado; com os seguintes se o primeiro continuar acima do preço máximo (art. 61; IN 73/2022, art. 30). Pedido de desconto do pregoeiro é evento crítico: resposta só com piso aprovado.

**Adjudicação e homologação**: depois de julgamento, habilitação e recursos, a autoridade pode sanear, revogar, anular ou adjudicar e homologar (art. 71).

**Contrato ou ata**: convocação no prazo do edital, prorrogável uma vez (art. 90, § 1º); recusa injustificada é descumprimento total e sujeita a sanção (art. 90, § 5º). Alterações unilaterais obrigam a aceitar acréscimos ou supressões de até 25% do valor inicial atualizado (art. 125). Atraso de pagamento da Administração por mais de 2 meses dá direito à extinção (art. 137, § 2º, IV). Pagamento antecipado é proibido, salvo exceção justificada (art. 145).

**Garantias**: garantia de proposta de até 1% do valor estimado, executada se o vencedor recusar o contrato (art. 58). Garantia contratual de até 5% do valor inicial, até 10% com justificativa de complexidade (art. 98), nas modalidades caução, seguro-garantia, fiança bancária ou título de capitalização, à escolha do contratado (art. 96, § 1º). Liberada após a execução (art. 100).

**Sanções** (arts. 155 e 156, VERIFICADO):

| Infração (art. 155) | Sanção típica (art. 156) | Risco para a Metrolabs |
|---|---|---|
| IV deixar de entregar documentação exigida no certame | Impedimento até 3 anos no ente | Proposta enviada sem o documento em dia |
| V não manter a proposta | Impedimento até 3 anos | Ganhar item abaixo do custo e desistir |
| VI não celebrar o contrato ou não entregar documentação para contratar, dentro da validade da proposta | Impedimento até 3 anos | Ganhar sem garantia pronta ou com certidão vencida |
| VII retardar a execução sem motivo | Impedimento até 3 anos | Ata com demanda em local distante sem equipe |
| I, II, III inexecução parcial ou total | Advertência a impedimento | Prazo de execução incompatível com a agenda técnica |
| VIII declaração ou documento falso | Inidoneidade de 3 a 6 anos em todos os entes | Marcar "cumpre a habilitação" sem cumprir |
| Qualquer infração | Multa de 0,5% a 30% do valor do contrato | Valor do edital, além da sanção |

Recurso contra advertência, multa ou impedimento: 15 dias úteis (art. 166).

## A6. Mapa de eventos e prazos para a agenda e os alertas

Destinatários: só a Diretoria (Charles e o segundo colaborador), inclusive fora do expediente (decisão do dono). Escalonamento inicial da missão: normal sem confirmação em 60 min, importante em 15 min, crítico em 5 min. "Automático" = o SGO+ cria o evento sozinho a partir da fonte, sempre com a fonte gravada. "Confirmação" = nasce como `IA_PENDENTE_CONFIRMACAO` ou `PREVISTO` e só vira `CONFIRMADO` quando uma pessoa confere (doc 01, `LIC_EVENTOS`).

| Evento | Quem define a data | Fonte no SGO+ | Automático ou confirmação | Criticidade | Antecedências sugeridas |
|---|---|---|---|---|---|
| Nova oportunidade aderente | Publicação | PNCP (coletor) | Automático | Importante (nota ≥ 75); normal (50 a 74) | Na hora; resumo diário para 50 a 74 |
| Retificação, suspensão, revogação, reabertura | Órgão | Mudança de `dataAtualizacaoGlobal` ou hash; e-mail da plataforma | Automático para "houve mudança"; confirmação para o conteúdo | Crítico | Na hora; cancela alertas antigos e cria os novos com histórico |
| Limite de esclarecimento e impugnação | Lei (art. 164 ou Lei 13.303, art. 87) a partir da abertura; edital fixa canal e hora | Cálculo | Confirmação (inferência até conferir) | Importante | Limite interno D-2 e D-1 dia útil, H-4 |
| Vistoria técnica | Edital | Extração do edital | Confirmação | Importante; crítico se obrigatória | D-3, D-1, H-2 |
| Limite de envio da proposta | Edital (no Compras.gov coincide com a abertura) | `dataEncerramentoProposta` do PNCP + edital | Automático com fuso presumido; confirmação do fuso e da hora | Crítico | 7 dias, 3 dias, 24 h, 4 h, 1 h (missão) |
| Sessão pública | Edital | PNCP + edital | Idem | Crítico | 24 h, 4 h, 1 h, 30 min, 10 min, início (missão) |
| Convocação para proposta ajustada | Pregoeiro (mínimo de 2 h no federal) | Chat da plataforma (só onde houver API, doc 02) ou e-mail da plataforma; senão, o operador registra | Confirmação | Crítico | Na hora; lembrete na metade do prazo e a 30 min do fim |
| Pedido de documentos de habilitação ou diligência | Pregoeiro | Idem | Confirmação | Crítico | Idem |
| Negociação (pedido de desconto) | Pregoeiro | Idem | Confirmação | Crítico | Na hora; resposta só com piso aprovado |
| Janela de intenção de recurso | Pregoeiro, na sessão | Operador | Confirmação | Crítico | Na hora |
| Razões de recurso (nosso) | Lei: 3 dias úteis da ata | Cálculo a partir da data da ata informada | Confirmação | Importante; crítico no último dia | D-2, D-1, H-4 |
| Contrarrazões (recurso de terceiro contra nós) | Lei: 3 dias úteis da intimação ou divulgação | Idem | Confirmação | Importante; crítico no último dia | D-2, D-1, H-4 |
| Resultado de recurso, adjudicação, homologação | Autoridade | PNCP (resultado do item) ou operador | Automático quando vier do PNCP | Normal | Na hora |
| Convocação para assinar contrato ou ata | Edital (prorrogável 1 vez) | Operador ou e-mail | Confirmação | Crítico | Na hora; D-2, D-1 |
| Entrega da garantia contratual | Edital (seguro-garantia: mínimo 1 mês após a homologação) | Edital | Confirmação | Importante | D-10, D-5, D-2 |
| Validade da proposta | Edital | Edital + data de envio | Confirmação | Normal | D-5 |
| Ordem de serviço e início de execução | Contrato | Contratos (dependência) | Confirmação | Importante | Na hora; D-2 |
| Vigência da ata ou do contrato | Lei (ata: 1 ano + 1) e contrato | Contrato | Automático depois de confirmado o início | Normal | 90, 60 e 30 dias |
| Aniversário do reajuste | Data-base do orçamento estimado | Edital | Confirmação | Normal | 30 dias antes; pedido na data |
| Certidão a vencer ou vencida | Emissor | Documentos da empresa | Automático | Importante; crítico se houver licitação ativa até o vencimento | 30, 15 e 7 dias; vencida na hora |
| Aviso de dispensa eletrônica: abertura e fim dos lances | Aviso (mínimo de 3 dias úteis; lances de 6 a 10 h) | PNCP + aviso | Automático com confirmação do horário | Crítico | 24 h, 1 h, início, 1 h antes do fim |
| Recurso contra sanção | Lei: 15 dias úteis | Intimação | Confirmação | Crítico | D-5, D-2, D-1 |
| Cotação em plataforma privada | Comprador | Integração de parceiro ou e-mail da plataforma | Confirmação | Importante; crítico nas últimas 24 h | 24 h, 4 h, 1 h |

## A7. O que a automação não interpreta sozinha

| Situação | Por que não | Como sinalizar |
|---|---|---|
| Prazo contado a partir do edital ou de ato do pregoeiro | A data do ato não vem por API (sessão, chat, intimação) | Evento com situação `PREVISTO` e selo "pendente de confirmação: informe a data do ato"; não gera alerta crítico antes da confirmação, gera tarefa |
| Dia útil no órgão | Feriado municipal e ponto facultativo não chegam por API | Inferência com limite interno de folga (A3.2) |
| Fuso | PNCP sem fuso; edital pode usar horário local | "Fuso presumido: Brasília" até a confirmação |
| Retificação | O PNCP mostra que mudou, não o quê; o § 1º do art. 55 deixa ao órgão dizer se reabre o prazo | Alerta crítico "edital alterado"; eventos antigos marcados `RETIFICADO`, nunca apagados; a IA compara as versões, a pessoa confirma |
| Suspensão, revogação, anulação | Pode vir só por aviso na plataforma ou no chat | Alerta crítico; alertas pendentes cancelados com motivo |
| Data incoerente na fonte | Varredura real: lavadora ultrassônica de Campinas com fim de proposta em 11/09/2026 e datalogger de Barra do Garças em 14/07/2026, ambos na rota de "proposta aberta" | "Data da fonte incoerente"; nenhum alerta até a confirmação |
| Valor estimado | Zero, sigiloso ou simbólico (varredura: R$ 0,00 em 10 casos e R$ 0,03 em um) | "Valor não informado ou sigiloso"; a margem fica pendente |
| Regime jurídico | Estatal pode usar o Compras.gov com a Lei 13.303 | Regra pelo `amparoLegal`; sem amparo, nenhum prazo legal calculado |
| Plataforma da sessão | `usuarioNome` às vezes é sistema municipal de gestão (doc 02, 3.6) | "Plataforma pendente: ler no edital" |
| Exclusividade ME/EPP, cota reservada, subcontratação obrigatória | Vem no edital ou no campo de benefício do item | Benefício do item lido pela API quando houver; senão pendência de leitura do edital |
| Pedido do pregoeiro | Só com API de chat (Portal de Compras Públicas, doc 02) ou e-mail | Operador registra; o SGO+ cria o evento e o alerta |
| Edital escaneado | Sem texto, sem verificação de trecho | "Sem texto extraível"; leitura humana obrigatória |

Regra geral: data que a IA tirou do edital nunca nasce confirmada (doc 01, 3.7). Confirmar é ato de pessoa autenticada no SGO+, com registro de quem e quando.

---

# B. Aderência técnica (Especialista 03)

## B1. O que a Metrolabs vende hoje (fonte: código)

Catálogo oficial da Diretoria, versão `DIRETORIA-2026-11-01` (`SGO_Comercial_CatalogoOficial.js`), mais os serviços da tabela C1 que continuam ativos (`SGO_Comercial_TabelaC1.js`; os substituídos estão em `COM_CAT_SUBSTITUI`).

| Família | Códigos oficiais | Códigos C1 ativos | Observação para licitação |
|---|---|---|---|
| Calibração de temperatura | CAL-001 termômetro digital, CAL-002 espeto, CAL-007 sensor de temperatura, CAL-008 pirômetro infravermelho | CAL_DATALOGGER (registrador), CAL_CAMARA (indicador de câmara, estufa ou banho), CAL_INCUBADORA_BIO | Preço por pontos (REG-CAL-001: mínimo de 3) |
| Calibração de umidade | CAL-003 termo-higrômetro | — | Temperatura e umidade são grandezas separadas |
| Calibração de pressão | CAL-004 manômetro, CAL-005 manovacuômetro, CAL-006 vacuômetro, CAL-010 manômetro e válvula de autoclave | — | Pontos do vacuômetro pendentes de validação técnica |
| Válvula de segurança | CAL-009 | — | Ajuste nunca acima da PMTA |
| Rotação | CAL-011 centrífuga | — | Terceiro ponto pendente |
| Massa | — | CAL_BALANCA_PEQ (até 30 kg), CAL_BALANCA_ADULTO (até 300 kg) | Fora da tabela oficial; o CRM indica custo pago a parceiro (provável terceirização: PENDENTE) |
| Eletromédicos (engenharia clínica) | — | CAL_MONITOR, CAL_DESFIBRILADOR, CAL_BOMBA_INFUSAO, CAL_VENTILADOR, CAL_ECG, CAL_BISTURI, CAL_OXIMETRO, CAL_INCUBADORA_NEO, CAL_ASPIRADOR, CAL_ANESTESIA, CAL_ESFIGMO | O CRM indica custo pago a parceiro em vários (PENDENTE: equipe própria ou terceiro) |
| Qualificação de esterilização a vapor | QUA-001 autoclave hospitalar, QUA-005 autoclave odontológica | — | NR-13 nunca incluída: serviço à parte |
| Qualificação de baixa temperatura | QUA-011 peróxido de hidrogênio, QUA-012 formaldeído | QT_AUTOCLAVE_BT como óxido de etileno (preço a confirmar pela Diretoria) | — |
| Qualificação de limpeza | QUA-002 termodesinfectora, QUA-004 lavadora ultrassônica, QUA-003 gabinete de secagem | QT_SELADORA | — |
| Qualificação térmica de armazenamento | QUA-006 câmara de conservação, QUA-007 ultrafreezer, QUA-008 estufa, QUA-009 banho-maria | QT_FREEZER, QT_CAMARA_FRIA, QT_SALA (mapeamento de ambiente), QT_CAIXA_TERMICA | — |
| Centrífuga (qualificação) | QUA-010 | — | — |
| NR-13 | NR13-001 compressor, NR13-002 autoclave até 75 L, NR13-003 autoclave com ensaios e ART | — | Enquadramento nunca presumido; teste hidrostático nunca automático |
| Manutenção preventiva | — | MP_AUTOCLAVE_GRANDE, MP_AUTOCLAVE_BANCADA, MP_LAVADORA_US, MP_SELADORA, MP_CAMARA | Corretiva com peças: risco de custo (ver B4) |
| Hora técnica | — | HORA_TECNICO, HORA_ENGENHEIRO | — |
| Produtos | Funil PRODUTOS e módulo Representação | — | Compra de equipamento só é aderente se houver produto no catálogo ou representada (trilha PRODUTO, ver B3) |

Áreas da missão **sem serviço no catálogo hoje** (aderência só com decisão da Diretoria e cadastro do serviço): osmose reversa e tratamento de água, compressores fora da NR-13, metrologia dimensional, acústica e audiologia, engenharia clínica com dedicação exclusiva de mão de obra e software de gestão, manutenção industrial em geral.

## B2. Taxonomia com termos positivos, negativos e contexto exigido

Leitura obrigatória: objeto, todos os itens (descrição, unidade, quantidade, `materialOuServico`) e, quando houver, termo de referência. O código CATSER e a categoria da fonte **não decidem**: o item real de NR-13 da IMBEL veio sem CATSER e com categoria "Informática (TIC)" (doc 02, 3.5).

| Família | Termos positivos (com contexto) | Termos negativos (descartam ou rebaixam) | Contexto que precisa aparecer junto |
|---|---|---|---|
| Calibração de instrumentos | "calibração de termômetros", "certificado de calibração", "calibração de manômetros", "rastreável", "pontos de calibração" | "soluções de calibração", "solução de calibração", "calibradores" (reagente), "tiras e soluções controle", "calibração de pneus", "borracharia", "vidrarias calibradas" (produto), "calibração referencial de deflectômetro" (pavimento), "cabine audiométrica" e "audiômetro" (fora do catálogo) | Item de **serviço** (`materialOuServico` S) e instrumento que existe no catálogo |
| Qualificação térmica e de processo | "qualificação térmica", "validação de autoclave", "qualificação de instalação, operação e desempenho", "IQ, OQ, PQ", "mapeamento térmico", "validação do processo de esterilização", "termodesinfectora" | "testes de validação" e "indicadores" como insumo de compra, "escovas", "insumos para CME", "embalagem para esterilização", "invólucros" | Serviço sobre equipamento do cliente |
| Esterilização (equipamento) | "qualificação de esterilizador", "validação de esterilizador por peróxido", "óxido de etileno", "formaldeído" | "esterilização cirúrgica", "castração", "cães e gatos", "caninos e felinos", "manejo populacional", "serviço de esterilização em planta externa", "processamento e esterilização de materiais" (terceirização de CME, que a Metrolabs não faz) | Equipamento do cliente e serviço de qualificação |
| NR-13 | "NR-13", "vaso de pressão", "inspeção de segurança de caldeiras e vasos", "válvula de segurança", "prontuário", "PMTA" | "inspeção de segurança" sem vaso nem NR-13 (pode ser segurança patrimonial ou do trabalho em geral) | Vaso, compressor ou autoclave; serviço |
| Engenharia clínica | "manutenção preventiva e corretiva de equipamentos médico-hospitalares", "calibração e teste de segurança elétrica", "engenharia clínica" | "dedicação exclusiva de mão de obra" (equipe residente; não é exclusão automática, é trava de capacidade a decidir), "software dedicado de gestão" (idem), "locação de equipamento", "solução integrada de exames" | Lista de equipamentos e escopo compatíveis com o C1 |
| Manutenção de equipamentos de CME e laboratório | "manutenção preventiva de autoclave", "manutenção de lavadora ultrassônica", "manutenção de seladora" | "peças de reposição" como compra, "materiais para manutenção das autoclaves" (produto), "nobreak", "hidráulica naval" | Serviço; peças com custo conhecido ou fora do escopo |
| Produto (trilha separada) | "aquisição de autoclave", "aquisição de lavadora ultrassônica", "fornecimento e instalação" | — | Produto do catálogo ou de representada; sem isso, descarte por regra com motivo |

## B3. Sinais de compra de produto e não de serviço

Qualquer dois sinais juntos classificam o item como PRODUTO (FATO quando o sinal está no texto da fonte):
1. Objeto começa por "aquisição", "fornecimento parcelado", "compra" ou "registro de preços para aquisição".
2. Item com `materialOuServico` = M.
3. Unidade de fornecimento física: unidade, caixa, frasco, kit, pacote, litro, rolo.
4. Marca, modelo, volume de câmara ou especificação construtiva exigidos do licitante ("câmara de 405 litros", "inox", "com impressora térmica").
5. Garantia de fábrica, assistência técnica do fabricante, prazo de entrega.
6. Adesão a ata de compra (carona).
7. Lista de insumos (reagentes, indicadores, embalagens, escovas).

Casos mistos: "fornecimento, instalação e entrega em pleno funcionamento" é produto com serviço acessório. "Manutenção com fornecimento de peças" é serviço com risco de produto (B4). Produto não é descarte automático: vai para a trilha PRODUTO, e só é aderente se a Diretoria tiver o item no catálogo ou numa representada.

## B4. Exigências que a Metrolabs pode não atender

| Exigência | Por que é risco | Tratamento na pontuação |
|---|---|---|
| Acreditação Cgcre/ISO 17025 (RBC) obrigatória numa grandeza ou faixa não acreditada | Inabilitação | Trava (nota 0) quando a acreditação é obrigatória e não consta do escopo vigente; "opcional" (caso real de Cascavel/PR: "opcional à empresa contratada a apresentação dos laudos com acreditação") não trava |
| Participação exclusiva ME/EPP ou cota reservada | Matriz não participa se não for ME/EPP | Trava no item exclusivo; na cota reservada, só a parcela aberta conta |
| Dedicação exclusiva de mão de obra (equipe residente) | Contratação de pessoal local, repactuação, encargos | Trava até decisão da Diretoria |
| Software de gestão próprio exigido | Não temos produto declarado | Trava até decisão |
| Equipe ou base local, tempo de atendimento em horas | Sem base na UF, o SLA é inviável | Rebaixa capacidade a 0 no item; pendência se o SLA for negociável |
| Quantitativo muito acima da capacidade mensal (ex.: centenas de equipamentos em prazo curto) | Inexecução e sanção | Risco; capacidade proporcional ao que a agenda técnica comporta (PENDENTE: capacidade mensal declarada pela área técnica) |
| Manutenção corretiva com peças por conta da contratada sem limite | Custo aberto | Risco; preço só com teto de peças ou exclusão |
| Atestado com quantidade mínima (até 50% das parcelas relevantes) | Precisamos ter executado volume semelhante | Documentação: consulta aos atestados cadastrados |
| Responsável técnico com registro e acervo específico | Depende de RH técnico | Pendência até existir o cadastro |
| Visita técnica obrigatória já vencida | Inabilitação | Trava |
| Garantia acima de 5% ou garantia de proposta | Custo e caixa | Risco e custo (C7) |
| Execução em UF sem expediente conhecido e longe de GO, DF, vizinhos e RJ | Custo de deslocamento e prazo | Localização (B6) |

## B5. Regra de evidência: fato, inferência e pendência

Toda classificação de item gera uma linha em `LIC_ANALISES` (doc 01, 3.3) com:
- **FATO**: afirmação com trecho literal da fonte (objeto, item ou página do edital) que o verificador encontra no texto. Ex.: "Objeto: 'Inspeção de Segurança, NR-13, em vasos de Pressão'" (PNCP, `objetoCompra`).
- **INFERÊNCIA**: conclusão nossa a partir de fatos, com o raciocínio. Ex.: "Vaso de pressão industrial; serviço compatível com NR13-001, que é de compressor: o preço não se aplica direto".
- **PENDÊNCIA**: o que falta para decidir. Ex.: "Quantidade, categoria e PMTA dos vasos: ler o termo de referência".

Regras:
1. Semelhança de palavra nunca vira FATO de aderência. Sem trecho, a capacidade do item conta zero.
2. Código do catálogo sugerido sempre com o trecho que o justifica e o grau (ALTA, MÉDIA, BAIXA, NÃO ATENDE).
3. Termo negativo encontrado no mesmo item rebaixa para NÃO ATENDE, salvo trecho positivo mais específico (ex.: "calibração de termômetros" no mesmo item de "soluções").
4. A IA não descarta oportunidade; o descarte por regra (termos negativos, produto sem catálogo, trava) é permitido e fica registrado com o motivo (doc 01, 4.4).
5. Fabricante, marca ou modelo citados no edital nunca aparecem no texto gerado pelo SGO+.

## B6. Pontuação de aderência (0 a 100)

| Critério | Peso | Como pontua |
|---|---|---|
| Capacidade técnica | 30 | 30 × (valor estimado dos itens com aderência ALTA comprovada por FATO ÷ valor estimado total). Aderência MÉDIA conta metade; INFERÊNCIA sem fato conta metade da classe; PENDÊNCIA conta zero até confirmar. Sem valor por item, usa a proporção de itens |
| Margem | 15 | Pela folga entre o preço de referência do item e o piso (C2): ≥ +30% 15; +10% a +30% 11; 0 a +10% 7; −10% a 0 3 (exige decisão da Diretoria); abaixo de −10% 0. Valor sigiloso ou zero: 5 e pendência |
| Documentação | 15 | 15 × (requisitos de habilitação atendidos com documento válido na data prevista da sessão ÷ requisitos exigidos). Requisito impossível de cumprir = trava |
| Localização | 15 | Prioridade da UF (até 8): GO 8; DF 8; MG, BA, TO, MT, MS 6; RJ 6; demais do Sudeste e Sul 3; Nordeste e Norte 2. Distância rodoviária da base que executa (até 7): até 60 km 7; até 200 km 6; até 500 km 4; até 1.000 km 2; acima de 1.000 km 1; exige avião 0 |
| Prazo | 10 | Dias úteis até o limite da proposta: 10 ou mais 10; 5 a 9 7; 3 a 4 4; 1 a 2 2; menos de 1 0 |
| Valor | 10 | Valor estimado dos itens aderentes: até R$ 5 mil 2; até R$ 20 mil 5; até R$ 100 mil 8; até R$ 1 milhão 10; acima de R$ 1 milhão 8 (e risco de capacidade avaliado) |
| Riscos | 5 | Começa em 5 e perde 1 por risco: SRP sem quantidade mínima por pedido; garantia acima de 5%; garantia de proposta; peças sem teto; SLA em horas; pagamento por medição longa; multa acima de 10%; vistoria obrigatória. Mínimo 0 |

**Travas** (nota final 0, com o motivo; a oportunidade fica registrada e pode ser reaberta por pessoa): participação exclusiva ME/EPP sem a matriz ser ME/EPP; todos os itens fora do catálogo ou de produto sem catálogo; acreditação obrigatória não detida; dedicação exclusiva ou software próprio sem decisão da Diretoria; limite de proposta vencido; vistoria obrigatória vencida; empresa impedida no ente; contratação direta já decidida (`tipoInstrumentoConvocatorioCodigo` 3).

**Classes**: 75 a 100 alta (alerta imediato à Diretoria); 50 a 74 média (resumo diário); 30 a 49 baixa (lista, sem alerta); abaixo de 30 ou com trava: descartada por regra, com motivo.

A nota é recalculada a cada versão da fonte (retificação) e a cada documento que vence ou é renovado. Os pesos ficam em `LIC_CONFIG` com versão e motivo; a Diretoria ajusta depois do primeiro mês com dados reais.

## B7. Calibração com os achados reais da varredura (doc 02, 3.6)

Classificação preliminar só pelo objeto do PNCP (sem itens e sem edital, que é o que a primeira versão vai ler). Resultado: dos 76, **14 com aderência provável ou parcial** a confirmar no edital (5 deles com trava de decisão), **22 falsos positivos de palavra** (11 de castração de cães e gatos, 4 de embalagem para esterilização, 3 de reagente ou solução "de calibração", 3 de serviço terceirizado de esterilização, 1 de borracharia), **26 compras de produto** e **14 fora do catálogo ou só para inteligência de mercado**.

| numeroControlePNCP | UF | Trecho do objeto (fonte PNCP) | Classificação | Motivo |
|---|---|---|---|---|
| 00444232000139-1-001311/2026 | RJ | "Inspeção de Segurança, NR-13, em vasos de Pressão" | Provável (NR-13) | FATO: NR-13 e vasos. PENDÊNCIA: quantidade, categoria, PMTA; regulamento da IMBEL (Lei 13.303). Valor R$ 100.553,73, SRP |
| 00348003000110-1-001347/2026 | RJ | "serviços de calibração e manutenção preventiva e corretiva de equipamentos de laboratório, com fornecimento de peças" | Parcial | Calibração aderente; corretiva com peças é risco. R$ 14.525, SRP |
| 11806275000133-1-000075/2026 | PR | "manutenção preventiva, corretiva e calibração nos equipamentos dos laboratórios" | Parcial | Depende da lista de equipamentos. R$ 268.763,16 |
| 78680337000770-1-000430/2026 | PR | "manutenção preventiva com certificado de calibração e ajuste, sendo opcional ... acreditação da Rede Brasileira de Calibração" | Parcial | RBC opcional (não trava). Impugnação já vencida |
| 78680337000770-1-000431/2026 | PR | "manutenção preventiva com serviço de calibração para equipamentos laboratoriais e de armazenamento de leite humano" | Parcial | Câmaras e freezers podem casar com QUA-006 e QT_FREEZER |
| 18338293000187-1-000090/2026 | MG | "manutenção preventiva, corretiva e calibração, bem como o fornecimento e/ou substituição de peças" | Parcial | Objeto truncado: ler itens |
| 76958966000106-1-000427/2026 | PR | "manutenção preventiva, corretiva, instalação e deslocamento de autoclaves odontológicas" | Parcial | MP_AUTOCLAVE_BANCADA; corretiva e instalação a confirmar |
| 62759595000110-1-000048/2026 | RJ | "Calibrações das balanças ... empresa pertencente à rede brasileira de calibração" | Trava provável | Exige RBC em massa: só passa se houver acreditação nessa grandeza (pergunta ao dono) |
| 18602011000107-1-000249/2026 | MG | "serviços continuados de Engenharia Clínica ... manutenção preventiva e corretiva com fornecimento de peças ... calibração" | Parcial com risco | R$ 4,56 milhões; equipe local e peças |
| 00394544000185-1-002305/2026 | RJ | "regime de dedicação exclusiva de mão de obra, para serviços engenharia clínica" | Trava (decisão) | Dedicação exclusiva |
| 00394429000100-1-002721/2026 | PA | "engenharia biomédica/clínica ... utilizando software dedicado" | Trava (decisão) | Software próprio; R$ 22,3 milhões |
| 07954480000179-1-026509/2026 | CE | "manutenção preventiva, corretiva, calibração e ensaio de segurança elétrica do equipamento nobreak trifásico" | Fora do catálogo | Nobreak não é serviço da Metrolabs; "calibração" é palavra parecida |
| 46523023000181-1-000171/2026 e 10 semelhantes | SP, PR, RS, PA, SC | "esterilização cirúrgica (castração) de cães e gatos" | Falso positivo | Termo negativo |
| 07570518000100-1-000060/2026 | CE | "reagentes, soluções de calibração, controles e soluções de manutenção" | Falso positivo | Reagente; produto |
| 05816630000152-1-008208/2026 | BA | "tira com comodato de 319 glicosímetros ... soluções de controle p calibração" | Falso positivo | Insumo |
| 76205970000195-1-000145/2026 | PR | "serviços de borracharia ... manutenção de pneus" | Falso positivo | "Calibração de pneus" |
| 08109444000171-1-000137/2026 | PA | "serviço de esterilização por vapor saturado e baixa temperatura ... em planta externa própria da contratada" | Falso positivo | Terceirização de esterilização |
| 13937032000160-1-002886/2026 | BA | "material de consumo médico-hospitalar ... (embalagem, para esterilização ...)" | Falso positivo | Insumo |
| 11303923000139-1-000003/2026 | SC | "Aquisição de equipamentos odontológicos permanentes, compreendendo autoclave horizontal de mesa" | Produto | Sinais 1, 4 |
| 11211433000102-1-000033/2026 | GO | "aquisição de autoclave horizontal hospitalar ... câmara de 405 litros ... por meio da adesão (carona)" | Produto | Sinais 1, 4, 6 |
| 47018676000176-1-000443/2026 | SP | "Aquisição de Lavadora Ultrassônica" | Produto | Trilha PRODUTO; data da fonte incoerente |
| 02056729000105-1-000724/2026 | GO | "escovas, testes de validação e insumos para CME" | Produto | "Testes de validação" é insumo |
| 22040711000122-1-000074/2026 | MG | "elaboração de Projetos de Setorização do Sistema de Abastecimento de Água" | Fora / inteligência | Engenharia de projeto; contratação direta já decidida |
| 82892316000108-1-000341/2026 | SC | "calibração dos equipamentos utilizados pelo Serviço de Inspeção Municipal" | Só inteligência | Aderente no tema, mas `tipoInstrumentoConvocatorio` "Ato que autoriza a Contratação Direta": já contratado. Serve para o banco de preços |

Exemplo de pontuação completa (IMBEL, com o que se sabe hoje): capacidade 15 (aderência ALTA por fato no objeto, mas o serviço exato e a quantidade são pendência: metade); margem 5 (sem itens detalhados nem piso calculado); documentação 7,5 (sem cadastro de habilitação no SGO+, metade como pendência); localização 6 + 1 = 7 (RJ; acima de 1.000 km da matriz, salvo execução pela equipe da filial, pergunta ao dono); prazo 7 (8 dias úteis em 01/11); valor 10; riscos 4 (SRP sem quantidade mínima por pedido a confirmar). **Total 55,5: média**, com quatro pendências que, resolvidas, podem levá-la a alta. É o comportamento desejado: a oportunidade aparece, mas a nota não finge certeza.

---

# C. Preço de licitação (Especialista 09)

## C1. A política existente, como o preço de licitação a usa

Fonte: `SGO_Comercial_Config.js` (`COM_METODOLOGIA_PADRAO.precificacao`), `SGO_Comercial_Precificacao.js`, `SGO_Comercial_Ficha.js`. Licitação não cria regra de preço paralela: usa a mesma política, com a unidade emissora sempre Goiânia (`ComPr_polUnidade_(pol, 'GO')`).

| Parâmetro | Valor de hoje | Onde |
|---|---|---|
| Impostos de serviço, Goiânia (Lucro Real) | PIS 1,65% + COFINS 7,6% + ISS 5% = 14,25% (ISS provisório) | `unidades.GO`, `ComPr_impostosDaUnidade_` |
| Comissão | 3% sobre serviços e produtos (deslocamento em item próprio não tem comissão) | `comissaoPct`; `ComPr_analise_` |
| Sobra mínima | 35% do preço dos itens, depois de impostos, comissão e custos diretos, antes de IR e CSLL | `margemMinPct` |
| Margem alvo | 40% (provisória) | `margemAlvoPct` |
| Custo da hora | Técnico R$ 90, engenheiro R$ 132, mais 25% de custo fixo e o Bônus Coletivo diluído | `custoHora`, `custoFixoPct`, `ComPr_bonusHora_` |
| Bônus Coletivo diluído | R$ 300 por colaborador ativo por mês ÷ horas faturáveis; nos exemplos do manual, R$ 3,56 por hora (base do POL-BON-001) | `bonusConduta` |
| Km rodado | R$ 2,50 por km, ida e volta | `valorKm` |
| Alimentação | R$ 100 por pessoa por dia, só acima de 60 km (provisório) | `alimentacaoPessoaDia`, `taxaViagem.kmMinimo` |
| Hospedagem | R$ 150 por pessoa por noite (provisório) | `hospedagemPessoaNoite` |
| Incentivo de Missão | R$ 300 por executante por missão com trecho de 200 km ou mais a partir da sede | `beneficioConduta` e parâmetros da Conduta |
| Horas de estrada | Custo da hora com custo fixo (técnico R$ 112,50; engenheiro R$ 165) × (km × 2 ÷ 70 km/h), só acima de 200 km | `horaDeslocamento`, `velocidadeMediaKmh`, `estradaKmMinimo` |
| Diária em dinheiro | Não se aplica (alimentação e hotel cobrem) | `diariaPessoaDia` |
| Acréscimo de urgência | **Nunca em licitação** (`licitacaoSemAcrescimo: true`) | `ComPr_fatorFaixa_` |

Fórmulas (código):
- Custo do serviço pela ficha: mão de obra (horas × custo da hora) + 25% de custo fixo + horas × bônus por hora + padrões + consumíveis (`ComF_calcular_`).
- **Piso do item de serviço** (sobra de 35%): custo ÷ (1 − 0,1425 − 0,03 − 0,35) = custo ÷ 0,4775, arredondado para cima ao centavo (`ComPr_pisoItem_`).
- Preço alvo (40%): custo ÷ 0,4275.
- Deslocamento em item próprio: custo da viagem ÷ (1 − 0,1425), arredondado para cima a R$ 10; fora da sobra (`ComPr_precoRepasse_`).
- Deslocamento diluído: entra no custo dos serviços, e a sobra de 35% precisa cobrir (`ComPr_analise_`, `precoItensPara`).

## C2. Piso, alvo e proposta inicial; quem aprova

| Valor | Definição | Quem vê | Quem aprova |
|---|---|---|---|
| Piso do item | O preço unitário que garante a sobra mínima de 35% com o deslocamento e os custos de licitação (C7, C8) do cenário escolhido | Diretoria e quem opera a sessão | Diretoria, antes da sessão, por item ou lote, em `LIC_DECISOES` tipo PRECO_FINAL (Caixa de decisões) |
| Preço alvo | Sobra de 40% | Diretoria | — |
| Proposta inicial | O menor entre o valor estimado do item no edital e o maior valor defensável (mercado e histórico, `COM_PRECOS`); nunca acima do estimado, que leva à desclassificação (art. 59, III) | Diretoria | Diretoria, junto com o piso |
| Valor final mínimo na plataforma | Igual ou maior que o piso aprovado | Operador | Registrado no SGO+ e conferido contra o piso |

Regras:
1. **Nenhum lance abaixo do piso aprovado.** Piso abaixo da sobra mínima (por estratégia, para entrar num cliente, por exemplo) só por decisão expressa da Diretoria, registrada com motivo, valor e quem decidiu; o SGO+ mostra a sobra resultante.
2. Mudança de piso durante a sessão: nova decisão registrada no SGO+ por pessoa autenticada da Diretoria (confirmação pelo link autenticado do alerta). Mensagem de WhatsApp sozinha não é aprovação.
3. O piso fica congelado na decisão com a versão da política e da ficha; mudar a política depois não altera a decisão já tomada.
4. A IA não define preço nem piso (doc 01, 4.4); o cálculo é regra.

## C3. Viabilidade por item e por lote

- **Por item**: preço de referência do edital ÷ piso do item. Abaixo de 1,00, o item é inviável na política; entre 1,00 e 1,10, viável com folga curta.
- **Por lote** (julgamento por lote ou por grupo): o lance é um só para o lote. Piso do lote = soma dos pisos dos itens com o deslocamento diluído uma vez só (é o ganho de escala: uma viagem atende vários itens). O SGO+ mostra quais itens do lote ficam abaixo do piso individual e quanto o lote compensa.
- **Item que não atendemos dentro do lote**: se o julgamento é por lote, ou todo o lote é viável (inclusive itens terceirizados com custo cotado em Compras, se a Diretoria aceitar), ou não participamos do lote.
- **Itens de famílias diferentes na mesma viagem** (termômetros e qualificação de autoclave no mesmo hospital): o deslocamento é rateado pelo valor dos itens; é a forma mais comum de tornar viável um lote longe de Goiânia.

## C4. Preço de referência do edital abaixo do nosso piso

1. O item é marcado "referência abaixo do piso" com a diferença em reais e em porcentagem.
2. A nota de margem cai (B6) e a decisão vai para a Diretoria com três opções: não participar do item; participar no piso (e provavelmente perder ou ser desclassificado por preço acima do estimado); participar abaixo do piso por decisão estratégica registrada.
3. Se a referência é muito baixa em relação ao mercado (`COM_PRECOS`), o SGO+ sugere pedido de esclarecimento ou impugnação dentro do prazo do art. 164, com rascunho para a pessoa revisar. Nunca envia sozinho.
4. Orçamento sigiloso (IN 73/2022, art. 12): a referência só aparece depois do julgamento; a decisão se faz pelo piso e pelo mercado.

## C5. Ata de registro de preços e quantitativo estimado

- A ata não obriga o órgão a contratar (art. 83, VERIFICADO): o quantitativo é teto, não promessa. Vigência de 1 ano, prorrogável (art. 84).
- O custo que mais muda é o deslocamento **por ordem de serviço**. Regra do SGO+: o piso de item em SRP é calculado pelo **menor pedido plausível por chamado** (quantidade mínima por pedido do edital, art. 82, II; sem ela, PENDÊNCIA e cenário conservador com o menor lote informado pela Diretoria).
- O SGO+ mostra três cenários: pedido único com todo o quantitativo, pedidos médios e pedido mínimo. A Diretoria aprova o piso pelo cenário que aceitar como risco.
- Adesões de outros órgãos (art. 86) podem gerar pedidos em cidades novas com o mesmo preço: o SGO+ avisa que o preço registrado vale para quem aderir, e a aceitação da adesão pelo fornecedor é prévia (art. 86, § 2º, III), ou seja, podemos recusar adesão em local inviável.

## C6. Reajuste

- Índice e data-base vêm do edital (art. 25, § 7º; art. 92, § 3º). A data-base é a do **orçamento estimado**, não a da assinatura: o primeiro reajuste pode chegar antes de 1 ano de contrato.
- Serviço contínuo sem dedicação de mão de obra: reajuste por índice, com interregno mínimo de 1 ano (art. 92, § 4º, I).
- O SGO+ grava índice, data-base e data do pedido; alerta 30 dias antes do aniversário. Reajuste não é automático: depende de pedido da contratada, em regra.
- Para o preço: a proposta de contrato longo usa os preços de hoje; a perda de valor até o primeiro reajuste é risco aceito pela Diretoria ou embutido no piso (parâmetro "meses até o reajuste" × inflação estimada, a definir).

## C7. Garantias como custo

- Garantia de proposta: até 1% do estimado (art. 58). Custo = taxa do instrumento escolhido × valor garantido × prazo; perda total se recusarmos o contrato.
- Garantia contratual: até 5%, ou até 10% justificado (art. 98), sobre o valor anual em serviços contínuos acima de 1 ano (parágrafo único). Modalidade à nossa escolha (art. 96, § 1º).
- Custo para o piso: seguro-garantia = prêmio cobrado pela seguradora (taxa informada pela corretora, PENDENTE); caução em dinheiro = valor imobilizado × custo financeiro mensal × meses de vigência.
- Fórmula com custo de garantia e custo financeiro (C8) somados ao custo direto: piso = custo ÷ (0,4775 − g − f), em que g e f são os custos como fração do preço.

## C8. Prazo de pagamento público e custo financeiro

- Federal: liquidação em até 10 dias úteis do recebimento da nota e pagamento em até 10 dias úteis da liquidação; prazos pela metade até o limite do art. 75, II (IN SEGES/ME 77/2022, art. 7º, VERIFICADO, https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-77-de-4-de-novembro-de-2022). Pagamento em ordem cronológica por fonte de recurso (art. 141).
- Estados e municípios: prazo do edital e do contrato (PENDENTE por edital); o histórico real de cada órgão fica em `LIC_ORGAOS` (prazo médio informado pela equipe).
- Custo financeiro = valor faturado × taxa mensal da Diretoria × meses entre a execução e o recebimento. Parâmetro novo em `LIC_CONFIG`, sem valor padrão até a Diretoria definir.
- Retenções na fonte em pagamentos de órgãos públicos (tributos federais e ISS do tomador, conforme o caso): são antecipação, não custo extra, mas reduzem o caixa até a compensação. Percentuais e enquadramento a confirmar com o contador; o SGO+ só registra "retenções previstas no edital" como fato (doc 01, 1.9).

## C9. Exemplo numérico completo: 100 termômetros CAL-001 a 300 km de Goiânia

Hipóteses (cada uma é parâmetro na tela):
- 100 termômetros digitais com sonda externa, 3 pontos padrão (-10, 2 e 8 °C): preço de tabela CAL-001 R$ 75,50 por unidade (regra de pontos: 3 pontos = mínimo, unitário = preço-base).
- Custo por termômetro pela ficha da C1 (`CAL_TERMOMETRO`: 0,33 h de técnico, 0,10 h de engenheiro, R$ 8 de padrões), com o bônus de R$ 3,56 por hora: 0,33 × 90 = R$ 29,70; 0,10 × 132 = R$ 13,20; mão de obra R$ 42,90; custo fixo 25% R$ 10,73; bônus 0,43 h × 3,56 = R$ 1,53; padrões R$ 8,00. **Custo R$ 63,16** (o mesmo de `decisao.custo` na tabela C1).
- Viagem: 1 técnico, veículo da empresa, 1 viagem, 5 dias e 4 noites (33 h de técnico em campo; o engenheiro revisa os certificados em Goiânia). Pedágio: R$ 0 no exemplo, para não inventar valor (no caso real, informar pela rota).

Custo da viagem (`ComPr_calcularViagem_`):

| Linha | Conta | Valor |
|---|---|---|
| Km rodado | 300 × 2 × R$ 2,50 | R$ 1.500,00 |
| Pedágios | a informar | R$ 0,00 |
| Alimentação | 1 pessoa × 5 dias × R$ 100 | R$ 500,00 |
| Hospedagem | 1 pessoa × 4 noites × R$ 150 | R$ 600,00 |
| Incentivo de Missão | 1 executante × R$ 300 (trecho de 300 km, acima de 200) | R$ 300,00 |
| Horas de estrada | 300 × 2 ÷ 70 = 8,6 h × R$ 112,50 | R$ 967,50 |
| Diária, combustível adicional | não se aplica | R$ 0,00 |
| **Total da viagem** | | **R$ 3.867,50** |

**Cenário 1 — preço de tabela, deslocamento em item próprio** (como uma proposta comum do Comercial):

| | Valor |
|---|---|
| Serviços: 100 × R$ 75,50 | R$ 7.550,00 |
| Impostos 14,25% | R$ 1.075,88 |
| Comissão 3% | R$ 226,50 |
| Custo dos serviços: 100 × R$ 63,16 | R$ 6.316,00 |
| **Sobra** | **−R$ 68,38 (−0,9%)** |
| Deslocamento em item próprio: R$ 3.867,50 ÷ 0,8575 = R$ 4.510,20 → arredondado | R$ 4.520,00 (fora da sobra) |
| Total da proposta | R$ 12.070,00 |

O preço de tabela do CAL-001 não cobre o custo da ficha. Pela política, essa proposta já iria para a Diretoria.

**Cenário 2 — piso pela política, deslocamento em item próprio** (só se o edital tiver item de deslocamento, o que é raro):
- Piso do termômetro: R$ 63,16 ÷ 0,4775 = R$ 132,27 → **R$ 132,28** (para cima ao centavo).
- Serviços 100 × R$ 132,28 = R$ 13.228,00 + deslocamento R$ 4.520,00 = **R$ 17.748,00**.

**Cenário 3 — piso pela política, deslocamento diluído no preço unitário** (o caso normal de licitação, em que o edital pede preço unitário com todas as despesas):
- Custo total = 6.316,00 + 3.867,50 = R$ 10.183,50.
- Preço dos itens para sobra de 35% = 10.183,50 ÷ 0,4775 = R$ 21.326,70 → unitário **R$ 213,27**; total R$ 21.327,00.
- Conferência: impostos R$ 3.039,10; comissão R$ 639,81; custo R$ 10.183,50; sobra R$ 7.464,59 = **35,0%**.
- Alvo (40%): 10.183,50 ÷ 0,4275 = R$ 23.821,05 → unitário R$ 238,22; total R$ 23.822,00.

**Cenário 4 — o mesmo lote em ata de registro de preços, com chamados de 10 termômetros**:
- Viagem por chamado: 2 dias e 1 noite (3,3 h em campo e 8,6 h de estrada): km R$ 1.500,00 + alimentação R$ 200,00 + hospedagem R$ 150,00 + incentivo R$ 300,00 + estrada R$ 967,50 = R$ 3.117,50.
- Piso por termômetro = (10 × 63,16 + 3.117,50) ÷ 0,4775 ÷ 10 = **R$ 785,16**.
- Com custo financeiro de 2% do preço (exemplo ilustrativo: 1% ao mês × 2 meses até receber) no cenário 3: 10.183,50 ÷ (0,4775 − 0,02) = R$ 22.259,02 → unitário R$ 222,60.

Leitura para a Diretoria: o mercado público paga mediana de R$ 132 pelo serviço (143 preços, 58 órgãos; 1º quartil R$ 90, 3º quartil R$ 200; Centro-Oeste, mediana R$ 122,70 em 5 preços), segundo a tabela C1. O piso sem viagem (R$ 132,28) fica na mediana; com 300 km de viagem diluída, fica acima do 3º quartil. **Lotes de termômetros longe de Goiânia só fecham com quantidade grande num único chamado ou juntos com serviços de maior valor na mesma viagem** (qualificações de autoclave e termodesinfectora, por exemplo).

## C10. Achados do Financeiro para a Diretoria

1. Pela ficha da C1, o CAL-001 de R$ 75,50 tem sobra negativa. A tabela de sobra da gestão (`ComCat_sobra_`) já mostra isso. Ou a ficha de horas do termômetro está superestimada (em lote, o tempo por instrumento cai), ou o preço oficial está abaixo do custo. Em licitação isso decide o piso de todos os lotes de calibração.
2. A regra "deslocamento em item próprio fica fora da sobra" (MAN-VIA-001) quase nunca se aplica em licitação, porque o edital pede preço unitário com todas as despesas. Diluído, o código aplica a sobra de 35% também sobre o deslocamento (cenário 3: R$ 213,27). Se a Diretoria quiser o deslocamento só a custo mais impostos e comissão mesmo diluído, o unitário seria R$ 132,28 + (3.867,50 ÷ 0,8275 ÷ 100) = **R$ 179,02**. É decisão do dono (pergunta 3).
3. O óxido de etileno está com "preço a confirmar pela Diretoria": sem preço confirmado, o SGO+ não calcula piso para esse serviço em licitação.

---

# D. Dependências, pendências e perguntas ao dono

Dependências (já declaradas no doc 01, confirmadas aqui pela regra de negócio): cadastro de Documentos da empresa (A4); RH técnico com registro, acervo e vínculo; calendário de feriados por município e UF; matriz de capacidade de medição com escopo de acreditação; módulo Contratos (quantitativos, saldo, reajuste, garantia); capacidade mensal da equipe técnica por família de serviço.

Pendências técnicas: validação jurídica das interpretações de A3.2 (folga de 1 dia útil e hora padrão de 17h); conferência dos códigos de modalidade do PNCP não provados (A2) quando a API de domínio responder; leitura do regulamento interno de cada estatal antes da primeira participação (Lei 13.303, art. 40); taxa de seguro-garantia com a corretora; percentuais de retenção com o contador.

## Perguntas que só o dono pode responder

1. A matriz de Goiânia é microempresa ou empresa de pequeno porte (LC 123)? Se não for, todo item exclusivo para ME/EPP é trava (hoje até R$ 80 mil; em 2027, até cerca de R$ 131 mil).
2. A Metrolabs tem acreditação de laboratório (Cgcre, ISO/IEC 17025) vigente? Em quais grandezas e faixas? Sem isso, editais que exigem RBC (como o de balanças no RJ) são trava.
3. Em licitação, com o deslocamento diluído no preço unitário, a sobra de 35% vale também sobre o deslocamento (R$ 213,27 por termômetro no exemplo) ou o deslocamento entra só a custo mais impostos e comissão (R$ 179,02)?
4. O piso é aprovado por item ou basta o lote fechar com 35%? E a ficha de horas do termômetro (0,43 h por instrumento, custo R$ 63,16) está correta para lotes grandes, já que deixa o CAL-001 de R$ 75,50 com sobra negativa?
5. A comissão de 3% entra no preço de licitação, sendo a Diretoria quem opera e decide?
6. Contrato ganho pela matriz no RJ ou perto dele pode ser executado pela equipe da filial do Rio (deslocamento e Incentivo de Missão contados a partir do Rio, nota emitida pela matriz)?
7. Os serviços de eletromédicos e balanças são feitos pela equipe própria ou por parceiro? Podemos disputar com parte do serviço subcontratada (o edital pode exigir atestado do subcontratado, até 25%, art. 67, § 9º)?
8. Qual taxa mensal de custo financeiro usar para prazo de pagamento e caução, e a empresa já tem corretora e limite aprovado de seguro-garantia? Com o segundo diretor definido, piso abaixo da sobra mínima precisa dos dois?

---

# E. Fontes consultadas em 01/11/2026

Legislação e regulamentos (texto baixado e conferido):
- Lei 14.133/2021: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm (arts. 4º, 6º, 17, 25, 28, 29, 54, 55, 56, 57, 58, 59, 61 a 64, 66 a 71, 74, 75, 78, 79, 82 a 84, 86, 90, 92, 96, 98, 100, 125, 137, 141, 145, 155, 156, 164 a 166, 182, 183).
- Decreto 12.807/2025 (valores de 2026): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/D12807.htm
- Lei 13.303/2016: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm (arts. 32, 39, 40, 51, 59, 87).
- Lei Complementar 123/2006: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm (arts. 43, 44, 45, 48).
- Lei Complementar 238/2026 (art. 8º, efeitos a partir de 01/01/2027 no art. 48 da LC 123): https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp238.htm
- IN SEGES/ME 73/2022 (pregão e concorrência eletrônicos federais): https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022 (arts. 12, 13, 18, 19, 21 a 25, 29, 30, 33, 34, 39, 48).
- IN SEGES/ME 67/2021 (dispensa eletrônica): https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-67-de-8-de-julho-de-2021 (arts. 4º, 6º, 8º, 9º, 11, 12, 25).
- IN SEGES/ME 77/2022 (ordem cronológica e prazos de pagamento): https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-77-de-4-de-novembro-de-2022 (arts. 5º a 7º).

Dados: PNCP e Compras.gov conforme doc 02 (varredura de 01/11/2026, 76 achados; códigos de modalidade, modo de disputa, amparo e instrumento convocatório observados nos registros reais). Tabela de domínio do PNCP (`/api/pncp/v1/modalidades`, `/modos-disputas`, `/criterios-julgamentos`): HTTP 503 em 01/11/2026 às 20h40.

Arquivos de prova (temporários, fora do repositório): `C:\Users\venda\AppData\Local\Temp\claude\lic\leis\` (textos das leis e INs convertidos) e `C:\Users\venda\AppData\Local\Temp\claude\lic\scan2_out.json` (varredura).
