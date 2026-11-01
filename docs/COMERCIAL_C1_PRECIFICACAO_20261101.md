# Comercial C1 — Tabela de preços por serviço, com a conta de custo aberta

Data: 01/11/2026. Etapa C1 da trilha Comercial do SGO+. Nenhum código do SGO+ foi alterado e a produção não foi tocada.

Dados que acompanham este documento, todos em `docs/`:

- `COMERCIAL_C1_TABELA_SERVICOS.json`: os 42 serviços da tabela, com horas, custo, preços e fontes. É o arquivo que a C2 vai importar.
- `COMERCIAL_C1_PRECOS_MERCADO.json`: 1.057 preços de compras públicas do PNCP, cada um com link.
- `COMERCIAL_C1_HISTORICO_PROPOSTAS.json`: 3.389 linhas de propostas antigas da Metrolabs (CRM de 2025-26 e arquivos do Drive de 2018-23). É a base do futuro banco de preços.

---

## 1. Resumo para o dono

**O que foi feito.** Para cada serviço, a tabela junta três coisas: o custo calculado pela conta (horas de técnico e de engenheiro, custo fixo, padrões e consumíveis), o preço que a Metrolabs já cobrou e o preço pago em compras públicas. São 42 serviços: 14 de qualificação térmica, 21 de calibração, 5 de manutenção preventiva e 2 de hora técnica.

**A fórmula, numa linha.** Preço = custo ÷ (1 − 14,25% de impostos − 3% de comissão − 20% de margem) = **custo × 1,594**. O preço mínimo, com margem de 10%, é custo × 1,375. O urgente é o preço normal × 2,1.

**Principais preços propostos** (deslocamento sempre à parte; valores em R$):

| Serviço | Custo | Normal (10 d.u.) | Urgente (3 d.u.) | Metrolabs 2025-26 (mediana) | Mercado público (mediana; n) |
|---|---:|---:|---:|---:|---:|
| Qualificação de autoclave a vapor acima de 100 L | 1.892 | **3.020** | 6.350 | 3.800 (ganhou a 2.750) | 2.550 (59); GO: 3.375 |
| Qualificação de autoclave de bancada | 1.019 | **1.660** | 3.490 | 2.750 | 1.660 (7) |
| Qualificação de lavadora termodesinfectora | 1.260 | **2.430** | 5.110 | 2.750 | 2.425 (11) |
| Qualificação de lavadora ultrassônica | 635 | **1.430** | 3.010 | 1.500 | 1.423 (6) |
| Qualificação de câmara ou refrigerador (24 h) | 820 | **1.310** | 2.760 | 1.895 | 899 (16) |
| Qualificação de freezer (24 h) | 840 | **1.800** | 3.780 | 1.800 | 2.200 (9) |
| Qualificação de estufa ou banho-maria | 661 | **1.060** | 2.230 | 450 | 958 (19) |
| Calibração de monitor multiparamétrico com segurança elétrica | 155 | **350** | 740 | 350 | 430 (23) |
| Calibração de desfibrilador | 146 | **280** | 590 | 280 | 399 (47) |
| Calibração de bomba de infusão | 174 | **280** | 590 | 280 | 333 (8) |
| Calibração de ventilador pulmonar | 200 | **350** | 740 | 350 | 1.428 (6) |
| Calibração de balança até 300 kg | 129 | **250** | 530 | 295 | 249 (72) |
| Calibração de termo-higrômetro | 43 | **70** | 150 | 60 | 188 (89) |
| Manutenção preventiva de autoclave hospitalar | 440 | **750** | 1.580 | 750 | 900 (82) |

**O que o material interno mudou na conta.**

1. **O deslocamento vem sendo cobrado muito abaixo do custo.** No CRM ele aparece só como km (720 km a R$ 2,50) ou como valor fechado ("Deslocamento GO/DF" a R$ 1.190, proposta ganha em Brasília). Com km, taxa por viagem, benefício da Conduta, alimentação, hotel e horas de estrada, o custo real de uma ida a Brasília com 2 pessoas é **R$ 3.325**. O preço correto do item fica em **R$ 3.880** (seção 6).
2. **O custo fixo de 25% sobre a mão de obra parece baixo.** O Planejamento Estratégico estima custos fixos de R$ 1,2 milhão em 2025 e R$ 1,5 milhão em 2026, perto de 27% a 30% do faturamento. Na conta da autoclave, os 25% viram R$ 322, só 10,7% do preço. Com 60% sobre a mão de obra, o preço sobe para R$ 3.740 (+24%). Esse número precisa ser confirmado (pergunta 3).
3. **A calibração de eletromédicos e de balanças parece terceirizada.** No CRM, esses serviços têm custo cadastrado: monitor R$ 151, ventilador R$ 163, bomba R$ 80, balança de R$ 60 a R$ 279, bisturi R$ 267. Isso tem cara de valor pago a parceiro. Se for o caso, a conta certa é custo do parceiro + logística + margem, e o prazo urgente de 3 dias úteis depende do parceiro (pergunta 4).
4. **A Política Comercial prevê comissão de 1% a 5%.** A conta usa 3%. Sem a comissão, a margem real cai de 20% para cerca de 17%.
5. **A planilha interna de 30/10/2026** (contrato de laboratório) dá três referências. Cobra **R$ 190 por hora de instalação**. Põe **30% de margem sobre peças** (preço = custo ÷ 0,7). Conta "com e sem carga" como **duas campanhas de 24 h**. Ela também avisa que **não incluiu tributos**: aqueles preços estão sem imposto.
6. **As propostas antigas mostram os hábitos da casa:**
   - Desconto de pontualidade de 8% a 10% ("boleto pago até o dia 10"), em 30 propostas. Só esse desconto come metade da margem.
   - Validade de 10 dias, a mais comum (111 propostas).
   - Hora do técnico a R$ 80 em 2018-19.
   - A minuta do CRM promete "prazo de 10 a 30 dias" e diz que "a CONTRATANTE compromete-se a concluir a entrega" (o certo é CONTRATADA). O mesmo texto está no modelo padrão do SGO+ (`SGO_Comercial_Config.js`, `COM_METODOLOGIA_PADRAO`): corrigir na C2.

**O que o mercado diz sobre prazo e urgência.**

- Compra pública de qualificação ou calibração programada pede de 10 a 20 dias a partir da ordem de serviço, com relatório em 5 dias úteis.
- **Nenhum edital paga acréscimo por urgência.** Nos contratos de engenharia clínica de Goiás, a urgência já entra no preço mensal.
- A faixa intermediária mais comum é **5 dias úteis**.

Recomendações: manter a regra do dono (10 dias úteis no preço normal e 3 dias úteis com +110%), criar uma faixa "prioritária" de 5 dias úteis com +50% e não aplicar o acréscimo em licitação (seção 7).

**Decisões que dependem do dono** estão na seção 12. As mais importantes:

- salários e horas faturáveis reais;
- o que é a "taxa de R$ 300 por viagem";
- custo fixo anual;
- se a calibração de eletromédicos é feita pela equipe própria ou por parceiro;
- as alçadas de desconto.

---

## 2. Material lido

| Material | O que trouxe |
|---|---|
| Playbook Comercial v2 (pptx, 103 slides) | Conteúdo mínimo da proposta (escopo, prazo, condições, validade, responsabilidades, próxima ação). Proibição de prometer prazo sem validar e de negociar fora da alçada. Tickets de referência (serviços R$ 3.817,64, contratos R$ 10 mil, meta mensal de R$ 600 mil). |
| Política Comercial v1.0 (08/05/2026) | Comissão de 1% a 5%, paga só com contrato assinado, pagamento feito e CRM em dia. Proibição de negociar fora das diretrizes. |
| Planejamento Estratégico 2026-2030 | Faturamento de R$ 4,07 mi em 2025. Custos fixos de R$ 1,2 mi (2025) e R$ 1,5 mi (2026). Custos variáveis de 50%. Margem EBITDA de 10% a 12%. Sazonalidade forte (set-out). Meta de converter avulsos em contratos e de ter atas de registro de preços ativas no 2º semestre. |
| Planilha "Precificação Contrato Laboratório 2026" (30/10/2026) | 16 equipamentos com preço de preventiva, calibração e qualificação. Hora de instalação de R$ 190. Margem de 30% sobre peças. Premissas de 2 campanhas de 24 h. Preços sem tributos. |
| Planilha de custos do contrato do Hospital Municipal de Rio Verde (2019) | Contrato de R$ 4.030 por mês. Encargos de 68% sobre a mão de obra (multiplicador 1,68). Tributos de 6% (regime antigo). Lucro de 43%. Referência só histórica. |
| Backup do CRM (22/10/2026, cópia local em Downloads) | 968 orçamentos, 765 depois de tirar as revisões repetidas, com 2.261 linhas (376 de serviço e 1.885 de produto). Negócios: 222 ganhos, 241 perdidos e 390 abertos. **É a melhor base de preço praticado** (nov/2025 a out/2026). |
| Propostas no Drive (`G:\Meu Drive\Arquivos`) | 1.778 arquivos encontrados por nome e pasta. 902 ficaram depois de tirar os idênticos e 554 tinham preço. Agrupando docx e pdf da mesma proposta, sobraram 348 grupos e **323 propostas** com 1.128 valores lidos. A maioria é de 2019 a 2022, e a extração é automática, com confiança média ou baixa. |
| `Sercon tabela preços.pdf` | **Tabela de fornecedor, não de concorrente.** É a lista de preços de **peças** de um fabricante de autoclaves de out/2008, com as colunas "Autorizadas" e "Consumidor" (esta cerca de 29% acima). Não tem serviço, mão de obra nem visita. Não serve para precificar serviço. |
| Docs do repositório e código do Comercial | O SGO+ guarda o preço e o custo do item como números soltos (`COM_PRODUTOS.PRECO` e `CUSTO`). A política de precificação está quase vazia (só os R$ 2,50 por km). A margem é calculada como (preço − impostos − custo) ÷ preço, e o preço alvo como custo ÷ (1 − impostos − margem) (`ComPr_analise_`). Esta tabela usa a mesma conta, com a comissão a mais. |

Arquivos `._*` foram ignorados. Os arquivos do Drive foram copiados para a pasta de trabalho antes de ler.

---

## 3. Custos da Metrolabs: o que é dado interno e o que é estimativa

| Item | Valor usado | Origem | Situação |
|---|---|---|---|
| Salário do técnico | R$ 3.500 por mês | estimativa CAGED (parâmetro do dono) | **provisório**; nenhuma planilha interna traz o salário atual |
| Salário do engenheiro | R$ 8.800 por mês | estimativa CAGED (parâmetro do dono) | **provisório** |
| Encargos | × 1,8 | parâmetro do dono (Lucro Real) | a planilha de 2019 usava 1,68; confirmar com o contador |
| Horas faturáveis | técnico 140 h, engenheiro 120 h por mês | parâmetro do dono | provisório; não há medição |
| **Custo da hora** | **técnico R$ 45,00; engenheiro R$ 132,00** | conta: salário × 1,8 ÷ horas | |
| Custo fixo | 25% sobre a mão de obra (técnico R$ 56,25 por hora, engenheiro R$ 165,00 por hora com o fixo) | parâmetro do dono | **provavelmente baixo** (ver seção 1, item 2) |
| Impostos sobre a nota | 14,25% (PIS 1,65% + COFINS 7,6% + ISS de até 5%) | parâmetro do dono | conservador: créditos de PIS e COFINS e ISS menor reduzem esse percentual |
| IRPJ e CSLL | 34% sobre o lucro | parâmetro do dono | ficam fora do preço; a margem de 20% vira cerca de 13% depois deles |
| Comissão | 3% do preço | Política Comercial (1% a 5%) | **acrescentado nesta etapa** |
| Margem alvo e mínima | 20% e 10% do preço, antes do IR | parâmetro do dono | |
| Padrões e instrumentos | de R$ 5 a R$ 250 por serviço (tabela) | **estimativa** (detalhe abaixo) | não há valor de inventário nem custo anual de calibração dos padrões nos docs |
| Consumíveis e ART | de R$ 0 a R$ 130 por serviço | estimativa (ART de cerca de R$ 100 na autoclave grande) | confirmar a tabela de ART vigente no CREA-GO |
| Horas por serviço | ver a tabela | **estimativa de engenharia** | medir pelas O.S. do SGO+ (seção 11) |
| Peças | margem de 30% sobre o custo (preço = custo ÷ 0,7) | planilha interna de 30/10/2026 | dado interno |
| Viagem | R$ 2,50 por km; R$ 300 por viagem; Conduta R$ 300 por pessoa (trecho acima de 200 km); alimentação R$ 100 por pessoa por dia; hotel R$ 150 por pessoa por noite | parâmetros do dono e do Programa de Conduta | a "taxa de R$ 300 por viagem" ainda precisa ser definida pelo dono |

**Rateio de padrões (estimativa).** A conta foi feita assim, para ser trocada pelos números reais:

- **Kit de qualificação térmica.** Dois registradores multicanal com 12 a 16 termopares e um transdutor de pressão. Supondo investimento de R$ 60 mil depreciado em 5 anos (R$ 12 mil por ano), mais R$ 4 mil por ano de calibração RBC dos canais e R$ 2 mil por ano de reposição de termopares, o kit custa cerca de R$ 18 mil por ano. Com cerca de 150 qualificações por ano, dá **R$ 120 por qualificação**. A tabela usa de R$ 40 a R$ 250, conforme o tempo de ocupação do kit (24 h numa câmara ou 7 dias num ambiente).
- **Kit de eletromédicos.** Analisador de segurança elétrica, simulador de paciente e analisadores de desfibrilador, de bomba, de fluxo e de bisturi. Supondo investimento de R$ 250 mil depreciado em 5 anos, mais R$ 15 mil por ano de calibração, o kit custa cerca de R$ 65 mil por ano. Com cerca de 2.000 calibrações por ano, dá **R$ 30 a R$ 50 por equipamento**, conforme o analisador usado.
- **Pesos, banhos e câmaras para grandezas simples:** de R$ 5 a R$ 40 por instrumento.

Se a Metrolabs não tiver algum desses kits e terceirizar o serviço, o rateio sai da conta e entra o custo do parceiro.

---

## 4. A fórmula do preço

```
hora_técnico   = salário_técnico × 1,8 ÷ 140              = R$ 45,00
hora_engenheiro = salário_engenheiro × 1,8 ÷ 120          = R$ 132,00

mão_de_obra = horas_técnico × hora_técnico + horas_engenheiro × hora_engenheiro
custo       = mão_de_obra × (1 + 25% de custo fixo) + padrões + consumíveis/ART

preço_pela_conta = custo ÷ (1 − 14,25% − 3% − 20%)  = custo ÷ 0,6275  (≈ custo × 1,594)
preço_mínimo     = custo ÷ (1 − 14,25% − 3% − 10%)  = custo ÷ 0,7275  (≈ custo × 1,375)
preço_urgente    = preço_normal × 2,1   (+110%, regra do dono)

arredondamento: para cima, em múltiplos de R$ 5 abaixo de R$ 100 e de R$ 10 acima
deslocamento: sempre à parte (seção 5), sem margem e sem comissão
```

**Regra do preço de tabela.** O preço normal é o preço pela conta. A exceção: quando a mediana do mercado público **e** a mediana do que a Metrolabs já cobrou ficam **as duas acima** da conta, o preço sobe até o **menor dos dois**. Assim a casa não deixa dinheiro na mesa sem sair do mercado. Os casos em que isso aconteceu levam ¹ na tabela.

Exemplo: na calibração de monitor, a conta dá R$ 250, o histórico é R$ 350 e o mercado é R$ 430, então a tabela fica em R$ 350.

**Exemplo completo: autoclave a vapor acima de 100 L**

| Parcela | Conta | R$ |
|---|---|---:|
| Técnico | 14 h × 45,00 | 630,00 |
| Engenheiro | 5 h × 132,00 | 660,00 |
| Custo fixo | 25% × 1.290,00 | 322,50 |
| Padrões (kit térmico) | rateio | 150,00 |
| Consumíveis e ART | | 130,00 |
| **Custo** | | **1.892,50** |
| Preço pela conta | 1.892,50 ÷ 0,6275, arredondado | **3.020,00** |
| Impostos (14,25%) e comissão (3%) | | 520,95 |
| Sobra antes do IR | 3.020 − 520,95 − 1.892,50 | 606,55 (20,1%) |
| Depois de IRPJ e CSLL (34%) | | cerca de 400 (13,3%) |

**Desconto máximo.** Sobre o preço pela conta, o desconto que ainda mantém a margem mínima de 10% é **13,75%** (1 − 0,6275 ÷ 0,7275). Nos itens em que a tabela ficou acima da conta (¹), cabe mais desconto. O SGO+ já calcula a margem real de cada proposta e manda para a Diretoria o que fica abaixo da mínima (`ComPr_analise_`).

**Sensibilidade ao custo fixo** (autoclave grande): com 25% o preço fica em R$ 3.020; com 60%, em R$ 3.740; com 100%, em R$ 4.560.

---

## 5. Tabela de preços proposta por serviço

Valores em R$ por unidade, sem deslocamento. "d.u." = dias úteis. A coluna Metrolabs CRM traz a mediana dos preços cotados entre nov/2025 e out/2026 (todas as situações). A coluna Drive é extração automática de 2018 a 2023. A coluna Mercado traz valor homologado quando existe, senão o estimado, só de itens comparáveis por unidade (PNCP, 2023-2026).

**Qualificação térmica**

| Código | Serviço | Unidade | Horas téc. / eng. | Custo | Preço normal (10 d.u.) | Urgente (3 d.u.) | Mínimo (margem 10%) | Metrolabs CRM 2025-26: mediana (n) | Metrolabs Drive 2018-23: mediana (n) | Mercado público: mín / mediana / máx (n) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| QT_AUTOCLAVE_GRANDE | Qualificação térmica de autoclave a vapor acima de 100 L (QI, QO e QD) | por equipamento | 14 / 5 | 1.892 | **3.020** | 6.350 | 2.610 | 3.800 (17) | 2.750 (73) | 611 / 2.550 / 8.700 (59) |
| QT_AUTOCLAVE_BANCADA | Qualificação térmica de autoclave de bancada até 100 L (QO e QD) | por equipamento | 7 / 3 | 1.019 | **1.660** ¹ | 3.490 | 1.410 | 2.750 (13) | 2.200 (2) | 799 / 1.660 / 7.200 (7) |
| QT_AUTOCLAVE_BT | Qualificação de esterilizador de baixa temperatura (formaldeído, peróxido ou óxido de etileno) | por equipamento | 8 / 4 | 1.240 | **1.980** | 4.160 | 1.710 | 2.750 (3) | — | não achado |
| QT_LAVADORA_TD | Qualificação de lavadora termodesinfectora (QI, QO e QD) | por equipamento | 8 / 4 | 1.260 | **2.430** ¹ | 5.110 | 1.740 | 2.750 (3) | 1.300 (23) | 1.110 / 2.425 / 4.013 (11) |
| QT_LAVADORA_US | Qualificação de lavadora ultrassônica | por equipamento | 4 / 2 | 635 | **1.430** ¹ | 3.010 | 880 | 1.500 (7) | 850 (14) | 1.264 / 1.423 / 3.000 (6) |
| QT_SECADORA | Qualificação de secadora ou gabinete de secagem | por equipamento | 3 / 1,5 | 466 | **750** | 1.580 | 650 | 650 (4) | — | não achado |
| QT_SELADORA | Validação de seladora térmica | por equipamento | 2 / 1 | 348 | **560** | 1.180 | 480 | 550 (1) | 900 (2) | 806 / 850 / 857 (3) |
| QT_CAMARA_CONSERVADORA | Qualificação térmica de câmara de conservação ou refrigerador (até 1.000 L) | por equipamento, 1 campanha de 24 h | 4 / 3 | 820 | **1.310** | 2.760 | 1.130 | 1.895 (12) | — | 317 / 899 / 1.229 (16) |
| QT_FREEZER | Qualificação térmica de freezer (-10 a -30 °C) | por equipamento, 1 campanha de 24 h | 4 / 3 | 840 | **1.800** ¹ | 3.780 | 1.160 | 1.800 (4) | — | 640 / 2.200 / 2.381 (9) |
| QT_ULTRAFREEZER | Qualificação térmica de ultracongelador (-65 a -86 °C) | por equipamento, 1 campanha de 24 h | 4 / 3,5 | 962 | **2.160** ² | 4.540 | 1.330 | 3.150 (4) | — | não achado |
| QT_CAMARA_FRIA | Qualificação térmica de câmara fria (walk-in, até 30 m³) | por equipamento, 1 campanha de 24 h | 6 / 5 | 1.382 | **2.210** | 4.650 | 1.910 | — | — | 1.560 / 1.971 / 2.381 (2) |
| QT_ESTUFA | Qualificação térmica de estufa, incubadora de laboratório ou banho-maria | por equipamento, 1 temperatura de trabalho | 3 / 2,5 | 661 | **1.060** | 2.230 | 910 | 450 (3) | — | 190 / 958 / 2.790 (19) |
| QT_SALA | Mapeamento térmico de ambiente (farmácia, almoxarifado, depósito) | por ambiente, até 7 dias | 6 / 6 | 1.598 | **2.550** | 5.360 | 2.200 | — | — | não achado |
| QT_CAIXA_TERMICA | Qualificação térmica de caixa térmica de transporte | por caixa | 2 / 1,5 | 400 | **640** | 1.350 | 550 | 380 (1) | — | não achado |

**Calibração de eletromédicos**

| Código | Serviço | Unidade | Horas téc. / eng. | Custo | Preço normal (10 d.u.) | Urgente (3 d.u.) | Mínimo (margem 10%) | Metrolabs CRM 2025-26: mediana (n) | Metrolabs Drive 2018-23: mediana (n) | Mercado público: mín / mediana / máx (n) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| CAL_MONITOR | Calibração com teste de segurança elétrica de monitor multiparamétrico | por equipamento | 1,25 / 0,3 | 155 | **350** ¹ | 740 | 220 | 350 (15) | — | 91 / 430 / 1.600 (23) |
| CAL_DESFIBRILADOR | Calibração com teste de segurança elétrica de desfibrilador ou cardioversor | por equipamento | 1 / 0,3 | 146 | **280** ¹ | 590 | 210 | 280 (11) | — | 91 / 399 / 940 (47) |
| CAL_BOMBA_INFUSAO | Calibração com teste de segurança elétrica de bomba de infusão | por equipamento | 1,5 / 0,3 | 174 | **280** | 590 | 240 | 280 (8) | — | 174 / 333 / 395 (8) |
| CAL_VENTILADOR | Calibração com teste de segurança elétrica de ventilador pulmonar | por equipamento | 1,5 / 0,4 | 200 | **350** ¹ | 740 | 280 | 350 (15) | — | 300 / 1.428 / 4.100 (6) |
| CAL_ECG | Calibração com teste de segurança elétrica de eletrocardiógrafo | por equipamento | 0,75 / 0,25 | 108 | **210** ¹ | 450 | 150 | 205 (8) | — | 145 / 382 / 1.550 (34) |
| CAL_BISTURI | Calibração com teste de segurança elétrica de bisturi elétrico | por equipamento | 1 / 0,3 | 146 | **480** ¹ | 1.010 | 210 | 480 (7) | — | 160 / 473 / 830 (3) |
| CAL_OXIMETRO | Calibração de oxímetro de pulso | por equipamento | 0,5 / 0,2 | 81 | **180** ¹ | 380 | 120 | 200 (7) | — | 49 / 174 / 290 (13) |
| CAL_INCUBADORA_NEO | Calibração com teste de segurança elétrica de incubadora neonatal ou berço aquecido | por equipamento | 1,5 / 0,4 | 180 | **290** | 610 | 250 | 242 (12) | — | 174 / 405 / 982 (13) |
| CAL_ASPIRADOR | Calibração com teste de segurança elétrica de aspirador cirúrgico | por equipamento | 0,5 / 0,15 | 63 | **190** ¹ | 400 | 90 | 189 (4) | — | 174 / 230 / 880 (3) |
| CAL_ANESTESIA | Calibração com teste de segurança elétrica de aparelho de anestesia | por equipamento | 2 / 0,5 | 245 | **400** | 840 | 340 | 250 (3) | — | não achado |

**Calibração de instrumentos**

| Código | Serviço | Unidade | Horas téc. / eng. | Custo | Preço normal (10 d.u.) | Urgente (3 d.u.) | Mínimo (margem 10%) | Metrolabs CRM 2025-26: mediana (n) | Metrolabs Drive 2018-23: mediana (n) | Mercado público: mín / mediana / máx (n) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| CAL_ESFIGMO | Calibração de esfigmomanômetro (aneroide ou digital) | por instrumento | 0,33 / 0,1 | 40 | **70** ¹ | 150 | 60 | 70 (13) | 115 (14) | 40 / 82 / 357 (13) |
| CAL_TERMOMETRO | Calibração de termômetro (digital, espeto, máxima e mínima) | por instrumento | 0,33 / 0,1 | 43 | **70** | 150 | 60 | 70 (28) | 150 (6) | 45 / 132 / 628 (143) |
| CAL_TERMOHIGROMETRO | Calibração de termo-higrômetro | por instrumento | 0,3 / 0,1 | 43 | **70** | 150 | 60 | 60 (24) | — | 42 / 188 / 481 (89) |
| CAL_DATALOGGER | Calibração de registrador de temperatura (data logger) | por instrumento | 0,5 / 0,15 | 63 | **110** | 240 | 90 | 140 (2) | — | não achado |
| CAL_BALANCA_PEQ | Calibração de balança até 30 kg (neonatal, pediátrica, de bancada) | por instrumento | 0,6 / 0,15 | 74 | **150** ¹ | 320 | 110 | 150 (10) | — | 115 / 249 / 411 (21) |
| CAL_BALANCA_ADULTO | Calibração de balança até 300 kg (antropométrica, plataforma) | por instrumento | 1 / 0,2 | 129 | **250** ¹ | 530 | 180 | 295 (14) | — | 90 / 249 / 625 (72) |
| CAL_MANOMETRO | Calibração de manômetro, manovacuômetro ou transdutor de pressão | por instrumento | 0,5 / 0,15 | 68 | **110** | 240 | 95 | 379 (2) | 189 (10) | não achado |
| CAL_VALVULA_SEG | Calibração de válvula de segurança com emissão de ART | por válvula | 1 / 0,5 | 159 | **260** | 550 | 220 | 320 (3) | — | não achado |
| CAL_CENTRIFUGA | Calibração de centrífuga | por equipamento | 0,75 / 0,2 | 90 | **150** | 320 | 130 | 350 (10) | — | não achado |
| CAL_CAMARA | Calibração do indicador de câmara, refrigerador, estufa ou banho | por equipamento | 0,75 / 0,25 | 103 | **170** | 360 | 150 | 115 (3) | — | não achado |
| CAL_INCUBADORA_BIO | Calibração de incubadora de indicador biológico | por equipamento | 0,4 / 0,1 | 49 | **80** | 170 | 70 | 190 (8) | — | não achado |

**Manutenção preventiva**

| Código | Serviço | Unidade | Horas téc. / eng. | Custo | Preço normal (10 d.u.) | Urgente (3 d.u.) | Mínimo (margem 10%) | Metrolabs CRM 2025-26: mediana (n) | Metrolabs Drive 2018-23: mediana (n) | Mercado público: mín / mediana / máx (n) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| MP_AUTOCLAVE_GRANDE | Manutenção preventiva de autoclave hospitalar | por visita | 6 / 0,5 | 440 | **750** ¹ | 1.580 | 610 | 750 (5) | 1.000 (3) | 200 / 900 / 4.733 (82) |
| MP_AUTOCLAVE_BANCADA | Manutenção preventiva de autoclave de bancada | por visita | 2,5 / 0,25 | 192 | **310** | 660 | 270 | 625 (2) | — | não achado |
| MP_LAVADORA_US | Manutenção preventiva de lavadora ultrassônica | por visita | 2 / 0,25 | 164 | **270** | 570 | 230 | — | — | não achado |
| MP_SELADORA | Manutenção preventiva de seladora | por visita | 1,5 / 0,2 | 127 | **210** | 450 | 180 | 300 (3) | — | não achado |
| MP_CAMARA | Manutenção preventiva de câmara de conservação ou refrigerador | por visita | 3 / 0,5 | 266 | **430** | 910 | 370 | — | — | não achado |

**Hora técnica**

| Código | Serviço | Unidade | Horas téc. / eng. | Custo | Preço normal (10 d.u.) | Urgente (3 d.u.) | Mínimo (margem 10%) | Metrolabs CRM 2025-26: mediana (n) | Metrolabs Drive 2018-23: mediana (n) | Mercado público: mín / mediana / máx (n) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| HORA_TECNICO | Hora técnica de técnico (corretiva, instalação, acompanhamento) | por hora | 1 / 0 | 56 | **190** ² | 400 | 80 | — | — | não achado |
| HORA_ENGENHEIRO | Hora técnica de engenheiro (laudo, parecer, consultoria) | por hora | 0 / 1 | 165 | **270** | 570 | 230 | — | — | não achado |

¹ Preço acima da conta porque o mercado e o histórico estão os dois acima dela (regra da seção 4).
² Exceção. No ultracongelador, o piso é 120% do freezer, porque a ultrabaixa temperatura pede mais sensores e mais tempo. Na hora do técnico vale o valor da planilha interna (R$ 190): a hora avulsa carrega espera e diagnóstico sem peça, e a conta pura (R$ 90) não cobre isso.

**Onde a tabela pede atenção** (alertas no JSON, campo `alertas`):

- **Câmara ou refrigerador:** a conta (R$ 1.310) fica acima do 3º quartil do mercado público (R$ 959). Em licitação, a Metrolabs só compete com lote de vários equipamentos no mesmo local (desconto de lote, regras logo abaixo).
- **Estufa, caixa térmica, câmara (indicador), incubadora neonatal e aparelho de anestesia:** a Metrolabs vem cotando **abaixo do preço mínimo** desta conta. Ou as horas estimadas estão altas, ou esses preços dão prejuízo. Vale medir antes de decidir.
- **Seladora:** a conta (R$ 560) é próxima do que a casa já cobrou (R$ 550). O mercado público pagou de R$ 806 a R$ 857, mas são só 3 preços de um único órgão.
- **Sem preço público comparável:** baixa temperatura, ultracongelador, ambiente, caixa térmica, manômetro, válvula, centrífuga, preventivas menores e hora técnica. Nesses, o preço é só a conta.
- **Câmara fria:** só 2 preços públicos e nenhum histórico. O preço é a conta.

Regras de uso da tabela:

- **Campanha com carga.** Uma segunda campanha de 24 h no mesmo equipamento custa 60% do preço da primeira (a instalação dos sensores já está feita).
- **Lote no mesmo local e na mesma visita.** Desconto de 5% de 5 a 19 unidades do mesmo serviço e de 10% a partir de 20. O tempo de preparação se dilui no lote.
- **Calibração da instrumentação da autoclave grande** (sensor, manômetro, manovacuômetro, válvula com ART) já está dentro da qualificação. Avulsa, usa os códigos de calibração.
- **Peças, kits e consumíveis do equipamento** ficam fora, com 30% de margem sobre o custo.

---

## 6. Regras de deslocamento

O deslocamento é **sempre um item à parte** ("Despesas de deslocamento e estadia", que é o padrão do SGO+). Não leva margem nem comissão: o preço é o custo ÷ (1 − 14,25%), arredondado para cima em múltiplos de R$ 10. É assim que o sistema já calcula.

| Linha | Regra |
|---|---|
| Km | km do trecho × 2 (ida e volta) × R$ 2,50 |
| Taxa por viagem | R$ 300, **fora da Grande Goiânia** (até 60 km não cobra). O dono ainda vai dizer o que é. |
| Benefício da Conduta | R$ 300 por colaborador, quando o trecho passa de 200 km. Nunca aparece com esse nome para o cliente. |
| Alimentação | R$ 100 por pessoa por dia, fora da Grande Goiânia |
| Hotel | R$ 150 por pessoa por noite |
| Horas de estrada | horas de ida e volta (a 70 km/h) × pessoas × R$ 56,25 (técnico), **só em trecho acima de 200 km**. Abaixo disso, as 140 h faturáveis já absorvem o tempo de estrada. |
| Pedágio | valor da rota |
| Pernoite | obrigatório quando estrada mais serviço passa de 10 h no dia; na prática, trecho acima de 200 km com serviço de dia inteiro |
| Várias O.S. na mesma viagem | uma viagem só: o custo é dividido entre os clientes pelo número de horas de serviço de cada um ("encaixe de rota", que já aparece no CRM) |

**Exemplos** (1 técnico, salvo indicação; valores em R$; distâncias rodoviárias aproximadas a partir de Goiânia):

| Destino | Composição do custo | Custo | Preço do item | O que se cobrava |
|---|---|---:|---:|---|
| Aparecida de Goiânia (20 km) | km 100 | 100 | 120 | — |
| Anápolis (55 km) | km 275 | 275 | 330 | — |
| Caldas Novas (170 km), bate-volta | km 850 + taxa 300 + alimentação 100 | 1.250 | 1.460 | — |
| Itumbiara (205 km), bate-volta | km 1.025 + taxa 300 + Conduta 300 + alimentação 100 + estrada 329 | 2.054 | 2.400 | — |
| Rio Verde (230 km), 2 dias e 1 noite | km 1.150 + taxa 300 + Conduta 300 + alimentação 200 + hotel 150 + estrada 370 | 2.470 | 2.890 | — |
| Brasília (210 km), 2 pessoas, 2 dias e 1 noite | km 1.050 + taxa 300 + Conduta 600 + alimentação 400 + hotel 300 + estrada 675 | 3.325 | 3.880 | R$ 1.190 ("GO/DF", ganha em ago/2026) |
| Cachoeira Alta (360 km), 2 dias e 1 noite | km 1.800 + taxa 300 + Conduta 300 + alimentação 200 + hotel 150 + estrada 579 | 3.329 | 3.890 | R$ 1.800 (só km, 720 × 2,50) |
| Cuiabá (900 km), de carro, 3 dias e 2 noites | km 4.500 + taxa 300 + Conduta 300 + alimentação 300 + hotel 300 + estrada 1.446 | 7.146 | 8.340 | comparar com passagem aérea |

Referência pública: em compras públicas, quando o km é pago à parte, foi homologado a R$ 3,77 por km (Sítio d'Abadia/GO, 2024) e a R$ 1,68 por km (consórcio no Paraná, 2026).

---

## 7. Prazo e urgência

**Regra do dono (mantida):**

- **Normal:** 10 dias úteis, preço normal.
- **Urgente:** 3 dias úteis, preço normal × 2,1 (+110%).

**O que o mercado pratica** (detalhes e links em `COMERCIAL_C1_PRECOS_MERCADO.json` e no levantamento de prazos):

| Situação | Prazo comum | Exemplos |
|---|---|---|
| Qualificação ou calibração programada (compra pública) | de 10 dias corridos a 20 dias úteis desde a ordem de serviço | Bonito/MS e Vacaria/RS: 10 dias; Silvânia/GO: 15 dias úteis; Ebserh/PR: 20 dias úteis |
| Entrega do relatório ou certificado | 5 dias úteis após a execução | vários editais, incluindo FUNSAÚDE/PR |
| Urgência em contrato de manutenção | 72 h, ou 2 a 5 dias úteis | consórcio CONIMS/PR ("urgente 72 h, emergencial 24 h, normal 10 dias"); Nova Andradina/MS (diagnóstico em 2 d.u., solução em 5 d.u.) |
| Emergência em contrato de engenharia clínica (GO) | de 1 h a 24 h | Rio Verde e Jataí: emergência em 1 h, com plantão |
| Acréscimo por urgência | **nenhum edital prevê** | os TRs de Rio Verde e Jataí dizem expressamente que a urgência fora de hora "não ensejará valores adicionais" |

**Recomendações (a regra do dono não muda):**

1. **Criar a faixa intermediária "prioritária": 5 dias úteis, +50%.** É o prazo que mais se repete no mercado e cobre o cliente que não pode esperar 10 dias mas não quer pagar o dobro.
2. **Dizer o que o prazo cobre.** "Execução em até X dias úteis após o aceite e a liberação do equipamento; relatório ou certificado em até 5 dias úteis após a execução." No caso urgente, 3 dias úteis para executar e entregar uma qualificação com campanha de 24 h é apertado. O urgente só deve ser oferecido depois que a Técnica confirmar a agenda (o Playbook proíbe prometer prazo sem validar).
3. **O acréscimo vale só para o serviço.** Deslocamento e peças ficam fora, porque não mudam de custo com a pressa.
4. **Não aplicar acréscimo de urgência em licitação nem em ata:** o preço é único. Em contrato com SLA, a disponibilidade entra no valor mensal.

---

## 8. Pacotes e contratos

| | Avulso | Contrato anual |
|---|---|---|
| Preço | tabela | tabela − 10% (a margem fica em cerca de 13%, acima da mínima) |
| Pagamento | 30 dias no boleto (prática atual) | 12 parcelas mensais |
| Deslocamento | por viagem | visitas programadas e somadas no valor anual; visita extra cobrada à parte |
| Urgência | +110% (3 d.u.) ou +50% (5 d.u., se aprovado) | sugestão: uma urgência por ano sem acréscimo; as demais com +50% |
| Reajuste | não se aplica | anual, pelo índice do contrato (o SGO+ já tem reajuste do catálogo com histórico) |
| Corretiva | hora técnica (R$ 190) + peças com 30% | franquia de horas de corretiva no valor mensal, ou hora técnica com 10% de desconto |

**Exemplo de pacote CME** (1 autoclave grande, 1 termodesinfectora, 1 ultrassônica, 1 seladora e 2 preventivas da autoclave por ano):

- Avulso: 3.020 + 2.430 + 1.430 + 560 + 2 × 750 = **R$ 8.940 por ano**.
- Contrato: −10% = **R$ 8.046 por ano** (R$ 670,50 por mês), mais o deslocamento das visitas.

**Exemplo de pacote de eletromédicos** (20 monitores, 5 desfibriladores, 10 bombas e 3 ventiladores numa visita):

- Tabela: R$ 12.250.
- Com desconto de lote: R$ 11.340. São 10% nos monitores (20 unidades), 5% nos desfibriladores e nas bombas, e nenhum desconto nos 3 ventiladores.
- Contrato anual com mais 10% em cima disso: os monitores ainda ficam acima do mínimo (R$ 283,50 contra R$ 220). As bombas, que já estão no preço da conta, passam do desconto máximo de 13,75% e precisam de aprovação.

O desconto de pontualidade de 8% a 10% das propostas antigas não deve voltar. Se a Diretoria quiser algum incentivo, 2% para pagamento antecipado já é generoso.

---

## 9. Regras do Playbook e da Política que devem virar regra no sistema (C2)

| Regra | Fonte | Como fica no SGO+ |
|---|---|---|
| Proposta com escopo, prazo, condições, validade, responsabilidades e próxima ação com data | Playbook, slide 62 | campos obrigatórios para concluir a proposta |
| Toda proposta enviada tem follow-up agendado | Playbook, slides 42 e 67 | a proposta concluída já cria a atividade de retorno (existe; manter) |
| Não prometer prazo sem validar | Playbook, slides 9 e 84 | prazo urgente ou prioritário pede confirmação da Técnica antes do envio |
| Não negociar fora da alçada | Playbook, slide 26; Política, item 10 | alçadas de desconto: vendedor até 5%, gerente até 10%, Diretoria até 13,75% sobre a conta; abaixo da margem mínima, só a Diretoria (já existe) |
| Comissão de 1% a 5%, ligada à margem e à adimplência | Política, item 5 | percentual de comissão na política de precificação, entrando na conta da margem |
| Motivo de perda real e padronizado | Playbook, slide 40 | já existe; acrescentar "valor do concorrente ou do vencedor" na perda |
| Licitação: validar margem, prazo e capacidade | Playbook, slide 32 | lance nunca abaixo do preço mínimo da tabela sem aprovação da Diretoria |
| Vender valor técnico, não desconto | Playbook, slide 86 | a tela da proposta mostra o valor que sobra para a empresa e o efeito do desconto |
| Transparência em orçamentos e prazos | Planejamento, valor 4 | deslocamento sempre como item visível; prazo com o que ele cobre |
| Converter avulso em contrato e ter atas ativas no 2º semestre | Planejamento, pilares 1 e 3.2.2 | preço de contrato (−10%) e preço de ata calculados a partir da tabela |
| Nenhum cliente acima de 20% do faturamento | Planejamento, item 5.1 | indicador no painel comercial (C3) |
| Validade da proposta | prática: 10 dias | padrão de 15 dias para serviço; 10 dias para produto com preço de fornecedor |

Para a C2, campos novos no catálogo (`COM_PRODUTOS`): horas do técnico, horas do engenheiro, padrões, consumíveis, custo calculado e preço sugerido. Na política (`metodologia.precificacao`): custo por hora por função, custo fixo, comissão, acréscimos de urgência e de prioridade, prazos por faixa e taxa por viagem. Os valores podem sair direto de `COMERCIAL_C1_TABELA_SERVICOS.json`.

---

## 10. Mercado: como foi levantado e o que ficou fraco

- **Fonte.** API pública do PNCP: itens das compras e resultado homologado de cada item. São 1.057 registros de 2023 a 2026, dos quais 697 são comparáveis por unidade e 670 têm valor homologado. O Painel de Preços não foi usado, porque a consulta exige o código CATSER e não aceita busca por texto.
- **Fora da conta (mas no arquivo, com o motivo).** Lote ou valor global, valor mensal, itens que juntam manutenção e calibração, aparelhos de laboratório classificados no código errado e valores fora da curva.
- **Pouco Goiás e Centro-Oeste.**
  - Qualificação de autoclave em GO: um único preço (Mineiros, 2024, R$ 3.375 homologado, com outros R$ 3.375 pela calibração).
  - Câmara de vacina: dois preços (Firminópolis, R$ 920 e R$ 1.050).
  - Estufa, termodesinfectora, ultrassônica, seladora, freezer e câmara fria: nenhum preço do Centro-Oeste.
  - SES-GO, HC-UFG e as OSS goianas não apareceram com preço no PNCP.
- **Menos de 10 preços comparáveis:** autoclave grande e de bancada (7 cada), seladora (3), câmara fria (2), ultrassônica (6), freezer (9), bisturi (3), aspirador (3), ventilador (6) e bomba (8).
- **Contrato de engenharia clínica por equipamento por mês:** nenhum. Todos os contratos encontrados são mensais ou globais.
- **Preço público é piso de referência, não teto.** O comprador privado costuma pagar mais pelo prazo e pela documentação, e a Metrolabs ganhou na rede privada a R$ 2.750 por autoclave.

---

## 11. Riscos

1. **Salários, encargos e horas faturáveis provisórios.** A hora do técnico muda 7% para cada R$ 250 de salário. Até o dono confirmar, a tabela é proposta.
2. **Custo fixo subestimado** (seção 1, item 2). É o maior risco de margem: pode levar a um preço até 24% menor que o necessário.
3. **As horas por serviço são estimativas.** O SGO+ já tem as O.S. com horário (Auvo e agenda). Medir as últimas 50 de cada tipo e recalibrar na C3.
4. **Rateio de padrões sem inventário com valor.** Se os kits forem mais caros ou menos usados, o custo de qualificação sobe.
5. **Terceirização da calibração.** Se o serviço é feito por parceiro, a margem depende do preço dele, o prazo urgente depende da agenda dele e a responsabilidade técnica precisa estar no contrato.
6. **Impostos.** 14,25% é conservador. A reforma tributária começa a trocar PIS e COFINS pela CBS em 2027, e contratos que atravessam 2027 precisam de cláusula de reequilíbrio.
7. **Urgência a +110%.** Pode perder venda para quem não cobra urgência; a faixa de 5 d.u. com +50% reduz esse risco. Em licitação, não se aplica.
8. **Licitação de câmaras e refrigeradores.** O preço público (mediana de R$ 899) fica abaixo da conta (R$ 1.310); sem lote grande, a Metrolabs perde.
9. **Histórico do Drive.** A extração é automática, por regra, com valores de 2018-22 e sem saber se a proposta foi ganha. Use como contexto, não como referência de preço.
10. **Comissão e inadimplência.** A conta tem 3% de comissão e nenhuma provisão de inadimplência. O Planejamento aponta atraso de órgão público como risco de caixa.

---

## 12. Perguntas

**Para o dono**

1. Quais são os salários reais por função (faixa) e quantas horas por mês o técnico e o engenheiro de fato faturam?
2. O que é a "taxa de R$ 300 por viagem"? Vale para toda viagem ou só fora da Grande Goiânia (como foi proposto aqui)?
3. Qual é o custo fixo anual real (o Planejamento fala em R$ 1,2 a R$ 1,5 milhão)? Quanto dele cabe aos serviços?
4. A calibração de eletromédicos, balanças e registradores é feita pela equipe própria ou por parceiro? Os custos do CRM (monitor R$ 151, ventilador R$ 163, bomba R$ 80) são o valor pago ao parceiro?
5. Quais kits a Metrolabs tem (registradores, termopares, analisadores, pesos, fotômetro e contador de partículas para capela)? Quanto custaram e quanto custa calibrá-los por ano?
6. A comissão média de 3% está certa para a conta?
7. Aprova a faixa "prioritária" de 5 dias úteis com +50%?
8. O prazo vale até a execução ou até a entrega do relatório?
9. Cliente de contrato também paga a urgência?
10. Aprova as alçadas (vendedor 5%, gerente 10%, Diretoria até 13,75%) e o fim do desconto de pontualidade de 8% a 10%?
11. A hora do engenheiro fica em R$ 270 (conta) ou mais perto de R$ 560 (mesma folga da hora do técnico)?
12. A filial do Rio de Janeiro usa a mesma tabela? No CRM, as propostas ganhas no RJ foram de R$ 2.750 por qualificação.
13. Aprova a campanha com carga a 60% do preço e os descontos de lote (5% e 10%)?

**Para o contador**

1. Qual é a alíquota efetiva de PIS e COFINS não cumulativos, com os créditos de combustível, peças, depreciação de padrões, energia e aluguel?
2. Qual é o ISS de Goiânia, de Brasília e do Rio de Janeiro? Em que item da lista da LC 116 entram calibração, qualificação e manutenção? Onde há retenção na fonte?
3. Qual é o multiplicador real de encargos no Lucro Real para técnico e engenheiro (1,8 ou o 1,68 da planilha de 2019)?
4. Qual é a natureza do benefício de R$ 300 do Programa de Conduta? Incidem encargos?
5. Como fica a reforma tributária (CBS em 2027, IBS a partir de 2029) nos contratos anuais já assinados? Que cláusula usar?
6. Quais retenções federais (IR 1,5% e CSRF 4,65%) se aplicam nas vendas a órgãos públicos e empresas, e qual é o efeito no caixa?

---

## 13. Como os dados foram montados (para refazer)

- **Mercado:** busca e itens pela API do PNCP, classificação por palavras-chave e revisão dos valores fora da curva.
- **CRM:** leitura direta do backup PostgreSQL (`Downloads\CRM\...20261022-092609.dump`), sem restaurar em banco. As revisões idênticas do mesmo negócio foram descartadas.
- **Drive:**
  - cópia local dos arquivos, sem os idênticos (mesmo hash);
  - texto de docx, xlsx e pdf, este com `pdftotext`;
  - um arquivo por grupo docx/pdf da mesma proposta;
  - leitura dos valores em R$ com o texto ao redor.
- **Privacidade:**
  - os JSON não têm nome de colaborador, telefone, e-mail nem CPF;
  - cliente pessoa física aparece sem nome;
  - salários aparecem só como valor de função.
- **Fabricantes:** nenhuma recomendação cita fabricante. A marca só aparece no texto bruto de editais e de propostas antigas, dentro dos JSON.
