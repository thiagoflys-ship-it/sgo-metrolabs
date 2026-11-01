# O que o seu material comercial diz e o que o SGO+ usa hoje

Data: 01/11/2026. Conferência feita a seu pedido ("leia tudo"). Na conferência nada foi mudado no SGO+; no mesmo dia o senhor decidiu os pontos da seção 0, que já estão no sistema.

Como ler este documento:

- **Igual**: o SGO+ usa o mesmo número ou a mesma regra do seu material.
- **Diferente**: o seu material diz uma coisa e o SGO+ faz outra (ou não faz).
- **Não está no material**: o SGO+ usa um número ou uma regra que não aparece em nenhum documento seu. Foi proposta nossa, estimativa ou pedido falado. Precisa do seu ok.

"C1" é o estudo de preços de 01/11/2026 (`docs/COMERCIAL_C1_PRECIFICACAO_20261101.md`). O SGO+ de hoje usa os números da C1 como valores iniciais.

---

## 0. Decidido pelo dono em 01/11/2026

Palavras do senhor: "Pra empresa tem que sobrar no mínimo 35%". "Os valores têm que ser os valores maiores, esses serviços estão muito baratos". "Os 300 é missão acima de 200 km, porém temos mais 300 por colaborador de incentivo de conduta, tem que incluir e diluir, a empresa precisa pagar esses custos". "2,50 km rodado; imposto: você tem que ver como é Goiás e como é Rio; aqui é lucro real."

| Ponto | Decidido | Como ficou no SGO+ | Provisório |
|---|---|---|---|
| Margem | Sobra mínima de 35% | Sobra = preço dos serviços e produtos − impostos − comissão − custos diretos, antes de IR e CSLL. Abaixo de 35%, só a Diretoria aprova, qualquer que seja a alçada de quem vende. O deslocamento em item próprio fica fora da conta. | Margem alvo de 40% (proposta nossa; o Planejamento traz margem de contribuição de 39,5%) |
| Valores | Os valores maiores | Preço de cada serviço = o maior entre a tabela, a planilha de 30/10/2026 com o imposto por fora e a conta de custo com a sobra de 35%. Hora avulsa = o maior entre R$ 190 com o imposto por fora e a conta. Peça = conta com a sobra de 35% e os impostos de produto. Custo da hora do técnico R$ 90 (MAN-VIA-001). | Equivalências com a planilha: câmara (R$ 950 por visita), calibração do indicador (R$ 800, o valor de 3 pontos), qualificação de câmara e de incubadora (metade do "com e sem carga") |
| Taxa de R$ 300 por viagem | Era o Incentivo de Missão | Removida. Fica só o Incentivo de Missão: R$ 300 por executante, por missão com trecho de 200 km ou mais a partir da sede. Propostas antigas que gravaram a taxa continuam mostrando o valor gravado. | — |
| Bônus de conduta | Incluir e diluir | O Bônus Coletivo (R$ 300 por mês para cada colaborador ativo) entra no custo da hora: bônus × colaboradores ÷ horas faturáveis da equipe. A tela da política mostra a conta. | Horas faturáveis da equipe por mês (sem o número real: 140 h por colaborador de campo) |
| Km rodado | R$ 2,50 confirmado | Sem mudança. Alimentação R$ 100 e hotel R$ 150 seguem como estavam. | Alimentação e hotel |
| Impostos | Ver Goiás e Rio; Lucro Real | Tabela por unidade que emite a nota. Serviço: PIS 1,65% + COFINS 7,6% + ISS 5%. Produto: PIS + COFINS + ICMS (GO 19%; RJ 20% + 2% de FECP) sobre o preço, menos os créditos sobre o custo de compra (PIS/COFINS 9,25% e ICMS da compra). A proposta escolhe a unidade (Goiânia padrão). Em 2026 a CBS e o IBS só aparecem na nota em teste: nada é somado. | ISS de 5% nos dois municípios e ICMS da compra de 12%: confirmar com o contador |

Exemplos com os valores de hoje (Goiânia): qualificação de autoclave acima de 100 L passa de R$ 3.020 para R$ 5.760 (custo R$ 2.747,64 ÷ 0,4775); peça de custo R$ 1.000 sai por R$ 2.334 em Goiânia e R$ 2.561 no Rio; hora avulsa do técnico, R$ 250. A lista dos 42 serviços, com a fonte de cada preço, está em `docs/COMERCIAL_C1_TABELA_SERVICOS.json` (campo `decisao_dono_20261101`).

---

## 1. O que foi lido

| Documento | Onde estava | Situação |
|---|---|---|
| Playbook Comercial v2 (103 slides) | Downloads e Drive (`COMMAND_COMERCIAL`) | Lido inteiro: textos, tabelas e notas. As duas cópias são idênticas. Não há notas do apresentador. Os slides 43 e 44 são fotos de telas do CRM, sem regra escrita. |
| Política Comercial v1.0 (08/05/2026, 6 páginas) | Downloads e Drive | Lida inteira. As duas cópias são idênticas. |
| POL-BON-001 Política de Bonificação, Rev. 00 (8 páginas) | Downloads (3 cópias) e Downloads\RH (1 cópia) | Lida inteira. **As 4 cópias são idênticas, byte a byte.** Não há diferença entre versões. |
| Planejamento Estratégico e Projeção Financeira 2026-2030 (15 páginas) | Downloads (2 cópias) e Drive (`Planejamento_Estrategico_Metrolabs.pdf`) | Lido inteiro. **As 3 cópias são idênticas.** |
| Planilha "Precificação Contrato Laboratório 2026" (30/10/2026) | Downloads | Lidas as 7 abas, com as fórmulas: PAINEL, ITENS_ORCAMENTO, ESCOPO_TECNICO, PECAS_A_COTAR, PREMISSAS, FONTES, EXECUCAO_24H. O arquivo não tem autor gravado. |
| Apresentação Comercial (2 versões, HTML) | Downloads | Lidas. As duas versões são textos técnicos sobre monitoramento de ar comprimido medicinal. **Não têm preço, margem, desconto nem prazo.** |
| MAN-VIA-001 Manual do Incentivo de Missão, Rev. 03 | Downloads (3 cópias idênticas) | Lido. Tem regra de orçamento (achado nesta busca). |
| Manual de Operação Técnica e Viagem em Campo v01 | Downloads (2 cópias idênticas) | Lido. Fala do incentivo de R$ 300, sem valores de diária. |
| ANX-CAT-001 Catálogo de Ocorrências | Downloads | Lido o grupo Comercial (COM-01 a COM-06) e o Financeiro. |
| ANX-CAL-001 Memorial de Cálculo | Downloads | Lido. Só a conta do farol; nada de preço. |
| "Proposta do Gestor Comercial" (mar/2025) | Drive, backup Parte 1 | Lida. Traz uma tabela de comissão. |
| Dados cadastrais da matriz | Downloads | Lido só para o regime de impostos. |
| Planilha de custos de um contrato público de 2019 | Drive, pasta de licitação | Lida (é a planilha "2019" que a C1 cita). |

**Não li, e por quê:**

- Cerca de 500 orçamentos antigos nas pastas `Orcamentos` do Drive. São propostas de clientes, sem regra geral. A C1 já tirou os preços delas.
- Tabelas de preço de fabricantes de autoclaves e de um distribuidor (2008 a 2022). São listas de fornecedor, não regra sua.
- Propostas de outras empresas que estavam no Drive.
- Arquivos do Google (`.gdoc`, `.gsheet`), como "Orçamento ... com desconto" e "Exportação comercial". Não abrem fora do Google Drive.
- PDFs em `Documents\METROLABS_COMERCIAL_SGO_20261021`, `METROLABS_MODELOS_VALIDACAO_20261018` e `METROLABS_PROJETO_COMERCIAL_20261021`. Foram gerados pelo próprio SGO+ ou pelo nosso projeto. Não são material seu.
- Os demais manuais do Programa de Conduta (cultura, guias, ata). Não falam de preço.

**Não achei** a "política financeira" (citada na Política Comercial, item 5) nem a "política de despesas" (citada no MAN-VIA-001, item 3). Se existirem, preciso delas.

---

## 2. Tabela principal

### 2.1 Margem

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Margem alvo por venda | Nenhum número. A margem aparece só como critério: "As metas poderão considerar: (...) Margem de lucro"; a comissão "poderá variar conforme: (...) Margem da negociação". | Política Comercial, itens 4 e 5 (pág. 3) | 40% (proposta nossa, provisória; antes 20%) | **Não está no material** |
| Margem mínima | Nenhum número | — | 35% de sobra. Abaixo disso, só a Diretoria aprova | **Decidido pelo dono em 01/11/2026** (antes 10%) |
| Margem de contribuição | "Margem de Contribuição: 39,5%" (2025 e 2026), 40,0% (2028) | Planejamento, Tabela 4.2 (pág. 11) | Não usa | Diferente (o SGO+ não usa esse número) |
| Margem EBITDA | "~10%" (2025), "~12%" (2026), "~13,5%" (2027), "~15,5%" (2028) | Planejamento, Tabela 4.2 (pág. 11) | Não usa | Diferente (o SGO+ não usa esse número) |
| Margem sobre peças | "Margem material" = 0,3 (30%) | Planilha de 30/10, aba PECAS_A_COTAR, célula K3 | 30% | **Igual no número**, diferente na conta (ver 2.2) |
| Margem por tipo de serviço ou produto | Produto: "deve ser gerido por margem, oportunidade e potencial de conta". Sem número. | Playbook, slide 73 | Uma margem só para tudo (20% e 10%) | **Não está no material** |

### 2.2 Preço de produto e peças: com ou sem imposto

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Conta do preço da peça | Preço = custo ÷ (1 − 30%) + horas de instalação × R$ 190 + extras de logística | Planilha de 30/10, aba PECAS_A_COTAR, fórmula da coluna K (K5 a K51) | Preço = custo × (1 − créditos) ÷ (1 − impostos de produto − comissão − 35%). As horas de instalação entram como item de hora. | **Decidido em 01/11/2026** (sobra de 35% e impostos por fora) |
| Imposto no preço da planilha | Tributos: "Preço preliminar interno sem enquadramento tributário validado" / "Não aplicado adicional" / "Validar com contador/financeiro". E também: "NÃO ENVIAR AO CLIENTE sem confirmar (...) tributos". | Planilha, aba PREMISSAS, linha 23; aba ITENS_ORCAMENTO, célula A24 | A proposta do SGO+ diz "Impostos: Inclusos no preço" (`SGO_Comercial_Config.js`, condições padrão). O preço da peça sai **com o imposto dentro**. | **Diferente** |

**O que isso quer dizer, num exemplo.** Peça com custo de R$ 1.000:

| | SGO+ hoje | Planilha, com o imposto somado por fora |
|---|---:|---:|
| Preço na proposta | R$ 1.429 | R$ 1.666 |
| Impostos (14,25%) | R$ 204 | R$ 237 |
| Comissão (3%, só no SGO+) | R$ 43 | — |
| Sobra para a empresa | **R$ 182 (12,8%)** | R$ 428 (25,7%) |

Os "30% de margem" da planilha são sem imposto. No SGO+ eles viram cerca de 13% depois de impostos e comissão. Ficam acima da mínima de 10%, mas abaixo da alvo de 20%. A mesma coisa vale para a hora de R$ 190 (ver 2.11).

O preço dos **serviços** da C1 não tem esse problema: a conta já põe os impostos dentro (custo ÷ (1 − 14,25% − 3% − 20%)).

### 2.3 Impostos e regime

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Regime | "PORTE: ME OPTANTE DO LUCRO REAL" | Dados cadastrais da matriz, pág. 1 | Lucro Real | Igual |
| Regime (outro documento) | "possível saída do Simples Nacional ou aumento de alíquota efetiva" | Planejamento, pág. 3 | — | Contradição no material (ver seção 4) |
| Alíquota sobre a venda | "Impostos S/ Vendas: (10,5% est.)" 2025; "(12,5% est.)" 2026; "(13,5% est.)" 2027; "(14,0% est.)" 2028 | Planejamento, Tabela 4.2 (pág. 11) | Por unidade (Lucro Real): serviço 14,25% (PIS 1,65% + COFINS 7,6% + ISS 5%); produto GO 28,25% e RJ 31,25% menos os créditos da compra | **Decidido pelo dono em 01/11/2026** (impostos por unidade; ISS e ICMS da compra provisórios para o contador) |
| Alíquota antiga | Taxas e impostos de R$ 2.901,60 sobre R$ 48.360 (6%) | Planilha de custos de 2019 | — | Só histórico |

### 2.4 Desconto e alçadas (quem aprova quanto)

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Quem define as alçadas | Diretoria: "Validar alçadas comerciais, descontos especiais e contratos relevantes." | Playbook, slide 26 | Diretoria e Administrador mudam a política | Igual |
| Negociar fora da alçada | "O que não e aceito: (...) Negociar fora de alçada"; "É proibido: (...) Negociar fora das diretrizes da empresa" | Playbook, slides 9 e 84; Política Comercial, item 10 (pág. 5) | Desconto acima do limite vai para a Caixa de decisões | Igual |
| SDR e desconto | "Não e papel do SDR: (...) negociar desconto sem autorizacao" | Playbook, slide 28 | Não há regra por cargo | Diferente |
| Postura | "Nunca venda apenas desconto."; "não vender desconto como primeira saída" | Playbook, slides 20 e 101 | Texto da metodologia: "Venda valor técnico, não desconto." | Igual |
| Percentuais das alçadas | **Nenhum número** | — | C1 e manual: vendedor 5%, gerente 10%, Diretoria até 13,75%. **No valor padrão do código, o vendedor dá até 15% sem pedir** (`descontoMaxPct: 15`; não conferi o valor gravado na produção); 10% e 13,75% só geram aviso. | **Não está no material** (e o SGO+ se contradiz) |
| Desconto e incentivo de viagem | "Desconto comercial incide sobre a margem, nunca sobre a linha de incentivo." A linha "Não pode ser suprimida na negociação". | MAN-VIA-001, item 6.1 (pág. 4) | O incentivo fica dentro do item "Despesas de deslocamento e estadia", e o desconto geral sai só dos serviços e produtos: esse item fica sempre com o preço inteiro. | **Igual** (corrigido em 01/11/2026) |
| Desconto de lote (5% de 5 a 19 unidades, 10% a partir de 20) | Nenhum | — | Regra de uso da C1 | **Não está no material** |

### 2.5 Desconto de pontualidade e antecipação

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Desconto por pagar até o dia 10 | Nenhum documento fala disso. Só aparece em propostas antigas (8% a 10%, segundo a C1). | — | Desligado; a gestora avisa se alguém usar. A C1 sugere no máximo 2% para pagamento antecipado. | **Não está no material** |
| Antecipação | Só do lado da empresa: "Antecipação de Recebíveis (...) usar com parcimônia para não corroer a margem financeira." | Planejamento, item 4.3 (pág. 12) | Não usa | Assunto diferente (é crédito da empresa, não desconto ao cliente) |

### 2.6 Comissão e bonificação

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Faixa da comissão | "A remuneração variável iniciará em 1% de comissão mínima, podendo atingir até 5% de comissão máxima." | Política Comercial, item 5 (pág. 3); Playbook, slide 76 | 3% fixos, só como custo na conta do preço | **Diferente** (3% é escolha nossa dentro da faixa) |
| Do que a comissão depende | "Percentual da meta atingida", "Qualidade das vendas", "Margem da negociação", "Adimplência do cliente", "Cumprimento dos processos internos", "Atualização correta do CRM" | Política Comercial, item 5 (pág. 3) | O SGO+ não calcula comissão a pagar | Diferente |
| Quando se paga | Contrato assinado, "O cliente efetuar o pagamento conforme política financeira", CRM em dia, Playbook seguido | Política Comercial, item 5 (pág. 3) | O SGO+ não calcula | Diferente |
| Tabela da escala | Playbook: "conforme regras oficiais". A tabela de 1% a 5% **não foi encontrada**. | Playbook, slide 76 | — | Lacuna |
| Comissão do gestor comercial (2025) | 2% até R$ 50 mil; 3% de R$ 50 mil a R$ 100 mil; 4% acima de R$ 100 mil, sobre o faturamento mensal de contratos novos. Bônus de R$ 2.000 (contrato de 12 meses ou mais acima de R$ 100 mil) e de R$ 5.000 (acima de R$ 300 mil). | "Proposta do Gestor Comercial" (mar/2025), seções 2 e 3 | Não usa | Diferente (e contradiz a Política; ver seção 4) |
| Bônus Coletivo de Cultura | R$ 300 por colaborador por mês, com farol verde. "Custo fixo da empresa, diluído na hora técnica: +R$ 3,56/hora" | POL-BON-001, itens 2, 4.1 e 10 (págs. 1, 3 e 7) | Diluído na hora: bônus × colaboradores ativos ÷ horas faturáveis da equipe (soma no custo da hora de técnico e engenheiro) | **Decidido pelo dono em 01/11/2026** ("incluir e diluir") |
| Incentivo de Missão | R$ 300 por executante, por missão de 200 km ou mais por trecho, a partir da sede. "Linha direta no orçamento". | POL-BON-001, itens 5 e 10; MAN-VIA-001, itens 1 e 6 | R$ 300 por pessoa quando o trecho tem 200 km ou mais, dentro do custo do deslocamento; nunca aparece com esse nome para o cliente | **Igual** |
| Incentivo "antes da margem" | "deve conter a linha de incentivo no custo, como item próprio, antes da margem" | MAN-VIA-001, item 6 (pág. 4) | Entra no custo do deslocamento, que é repassado sem margem | Igual no valor; o MAN-VIA pede "item próprio", o SGO+ junta no item de deslocamento |

### 2.7 Prazo de pagamento e parcelamento

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Prazo padrão do cliente | Nenhum número. A Política fala em "política financeira", que não foi encontrada. | Política Comercial, item 5 | "Boleto bancário com vencimento em 28 dias após a emissão da nota fiscal." | **Não está no material** |
| Parcelas do contrato anual | "Contrato anual: 12 meses (...) Preço anual / 12 parcelas"; "Mensalidade: Total anual/12" | Planilha de 30/10, aba PREMISSAS, linhas 4 e 24 | 12 parcelas (C1) | **Igual** (está na sua planilha, como "padrão proposto") |
| Vencimento da mensalidade | "Regra de vencimento e reajuste contratual" está como **decisão pendente** | Planilha, PREMISSAS, linha 24 | Não definido | Lacuna |
| Prazo com fornecedor | "Negociar prazos de pagamento de peças para 60/90 dias" | Planejamento, item 4.3 (pág. 12) | Não usa | Diferente (o SGO+ não usa) |
| Compra de equipamento caro | "devem ser comprados back-to-back (apenas após o pedido do cliente)" | Planejamento, item 4.3 (pág. 12) | Não há regra | Diferente |

### 2.8 Urgência e prazos de execução

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Prometer prazo | "O que não e aceito: (...) Prometer prazo sem validar". Ocorrência COM-03 "Prazo técnico prometido sem validação" (média, −8) e COM-06 "Promessa comercial fora da capacidade real" (grave, −30). | Playbook, slides 9, 84 e 91; ANX-CAT-001, pág. 5 | Prazo urgente ou prioritário pede a agenda confirmada pela Área técnica | Igual |
| Prazo normal | Nenhum número | — | 10 dias úteis | **Não está no material** (o código registra como "decisão do dono, 01/11/2026", não escrita) |
| Urgente | Nenhum número | — | 3 dias úteis, preço × 2,1 (+110%) | **Não está no material** (mesma observação) |
| Prioritária | Nenhum número | — | 5 dias úteis, +50%, desligada | **Não está no material** |
| Prazo conta até o relatório | Nenhum | — | Até a entrega do relatório (relatório em 5 dias úteis) | **Não está no material** |
| Urgência em licitação ou contrato | Nenhum | — | Sem acréscimo | **Não está no material** |

### 2.9 Contrato anual e pacotes

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Importância do contrato | "Contrato e o caminho para previsibilidade de caixa e relacionamento." | Playbook, slide 16 | — | — |
| Converter avulso em contrato | "Conversão agressiva de clientes de 'chamado avulso' para contratos de manutenção preventiva com valor fixo mensal." Meta: receita recorrente cobrir "100% dos custos fixos operacionais" até 2028. | Planejamento, Pilar 1 (pág. 5) | Preço de contrato = tabela − 10% (C1) | Diferente (o material quer contrato, mas não dá desconto) |
| Desconto do contrato anual | **Nenhum número** | — | −10% | **Não está no material** |
| O que fica fora do contrato | Peças e consumíveis ("NÃO incluídos"); corretivas ("Reparos corretivos não incluídos"); deslocamento ("Fora do valor"); reensaio ("Reensaio pago se reprovação") | Planilha de 30/10, PREMISSAS, linhas 9, 13, 20 e 22 | C1: deslocamento das visitas programadas somado no valor anual; corretiva com franquia de horas ou hora com 10% de desconto | **Diferente** |
| Frequência de preventiva | Equipamento térmico: 2 por ano (semestral). Osmose: 4 por ano (trimestral). | Planilha, PREMISSAS, linhas 5 e 6 | Não há regra de frequência | Diferente |
| Campanha "com e sem carga" | "considerada como DUAS campanhas de 24h" | Planilha, PAINEL, célula A19 | Segunda campanha a 60% do preço da primeira (C1) | **Diferente** (a planilha cobra duas campanhas; o desconto de 40% é nosso) |
| Diagnóstico gratuito | Campanha "Check-up de Verão" em janeiro e fevereiro: "Inventário e Diagnóstico Gratuito" | Planejamento, item 3.2.1 (pág. 7) | Não existe | Diferente |

### 2.10 Deslocamento, diária e hotel

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Ponto de partida | "Sempre a sede" (Goiânia). "Não se mede da residência do colaborador." | POL-BON-001, item 5.1; MAN-VIA-001, item 1 | Origem padrão Goiânia/GO; distância pela tabela da Conduta | Igual |
| Incentivo de R$ 300 | Ver 2.6 | POL-BON-001 e MAN-VIA-001 | R$ 300 por pessoa, trecho de 200 km ou mais | Igual |
| Km rodado | Nenhum valor por km. Exemplo do MAN-VIA: "Deslocamento — combustível e pedágio: R$ 480,00 / 420 km ida e volta" (cerca de R$ 1,14 por km, já com pedágio). | MAN-VIA-001, item 6.1 (pág. 4) | R$ 2,50 por km (ida e volta), mais pedágio à parte | **Decidido pelo dono em 01/11/2026** (R$ 2,50 confirmado) |
| "Taxa por viagem" de R$ 300 | **Nenhum documento fala disso.** O único R$ 300 por viagem no material é o Incentivo de Missão. | — | Removida | **Decidido pelo dono em 01/11/2026**: era o Incentivo de Missão; fica só ele |
| Diária, alimentação e hotel | "Diárias, hospedagem e alimentação seguem a política de despesas". Exemplo: "Diárias e hospedagem: R$ 520,00" para 2 técnicos. | MAN-VIA-001, itens 3 e 6.1 | Alimentação R$ 100 por pessoa por dia; hotel R$ 150 por pessoa por noite | **Não está no material** (a "política de despesas" não foi encontrada) |
| Incentivo não é diária | "O valor de R$ 300,00 será tratado como incentivo de eficiência em missão técnica, e não como diária automática." | Manual de Viagem em Campo, item 4 (pág. 6) | O SGO+ trata como linha separada da alimentação | Igual |
| Horas de estrada | Nenhuma regra | — | Cobradas em trecho acima de 200 km | **Não está no material** |
| Deslocamento no contrato | "Valor presume laboratório no mesmo complexo e visitas consolidadas" / "Fora do valor" / "Cotação de logística adicional" | Planilha, PREMISSAS, linha 13 | Item à parte, sem margem | Igual |

### 2.11 Hora técnica

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Custo da hora do técnico | Exemplo: "Hora técnica — 2 técnicos × 10 h: R$ 1.800,00 / Já contém o rateio do Bônus Coletivo (+R$ 3,56/h)". Dá **R$ 90 por hora de custo**. | MAN-VIA-001, item 6.1 (pág. 4) | Técnico R$ 90 por hora (o valor maior), mais o custo fixo e o Bônus Coletivo diluído; engenheiro R$ 132 | **Decidido em 01/11/2026** ("valores maiores"). Observação: o MAN-VIA diz que os R$ 90 já contêm o bônus; o sistema soma o bônus por cima, o lado seguro |
| Preço da hora de instalação | R$ 190 por hora, sem imposto (célula L3, usada na fórmula da coluna K) | Planilha, PECAS_A_COTAR | O maior entre R$ 190 com o imposto por fora (R$ 230) e a conta de custo (R$ 250 hoje) | **Decidido em 01/11/2026** (imposto por fora; valor maior) |
| Hora do engenheiro (preço) | Nenhum | — | R$ 270 | **Não está no material** |
| Encargos sobre salário | Encargos de R$ 5.319 sobre mão de obra de R$ 7.800 (68%, ou 1,68) | Planilha de custos de 2019 | 1,8 | **Diferente** (e o 1,8 é estimativa) |
| Salários e horas faturáveis | Nenhum documento traz | — | Técnico R$ 3.500, engenheiro R$ 8.800; 140 h e 120 h por mês | **Não está no material** (estimativa) |

### 2.12 Custos fixos e variáveis

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Custos fixos | "Custos Fixos (Estimado): R$ 1.200.000" (2025), "R$ 1.500.000" (2026) | Planejamento, Tabela 4.2 (pág. 11) | 25% sobre a mão de obra de cada serviço | **Diferente** (a própria C1 acha 25% baixo) |
| Custos variáveis | "Custos Variáveis (CMV): (50%)" 2025, "(48%)" 2026 | Planejamento, Tabela 4.2 | Não usa | Diferente (o SGO+ não usa) |
| Bônus coletivo na hora | "+R$ 3,56/hora" | POL-BON-001, item 10 | Não soma | Diferente |
| Custo fixo pelo vale | "A estrutura de custos fixos deve ser dimensionada pelo vale, não pelo pico." | Planejamento, pág. 5 | — | — |

### 2.13 Metas e tickets

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Meta mensal | "Compromisso com meta mensal de R$ 600 mil em faturamento." | Playbook, slides 7, 16 e 73 | R$ 600.000 | **Igual** |
| Ticket de serviços | "R$ 3.817,64 ticket médio ideal em serviços" | Playbook, slides 16 e 73 | R$ 3.817,64 | **Igual** |
| Ticket de contratos | "R$ 10k ticket médio ideal para contratos" | Playbook, slides 16 e 73 | R$ 10.000 | **Igual** |
| Ticket de produtos | "Não existe ticket médio unico." | Playbook, slides 15 e 73 | Sem ticket | Igual |
| Faturamento do ano | R$ 5.500.000 em 2026 (R$ 458.333 por mês, em média) | Planejamento, Tabela 4.2 (pág. 11) | Não usa | Contradição no material (ver seção 4) |
| Metas por função | LDR: 50 leads qualificados por mês. SDR: 15 reuniões por mês. Closer: R$ 200 mil em novos negócios por mês. Farmer: churn abaixo de 5% e upsell de 10%. | Planejamento, Tabela 3.1 (págs. 6 e 7) | Não usa | Diferente |
| Quem define a meta | "definidas mensalmente pela gestão comercial", apresentadas no início do mês | Política Comercial, item 4 | — | — |
| Concentração de cliente | "Nenhum cliente deve representar mais de 20% do faturamento." | Planejamento, item 5.1 (pág. 12) | A C1 propôs um indicador; não confirmei se ele já está no painel | Lacuna a conferir |

### 2.14 Validade da proposta

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Proposta tem validade | "Prazos, condicoes e validade da proposta."; "cotação enviada com validade e proxima acao" | Playbook, slides 62 e 38 | Campo obrigatório | Igual |
| Quantos dias | **Nenhum número** | — | 15 dias | **Não está no material** (nas propostas antigas, 10 dias era o mais comum, segundo a C1) |

### 2.15 Reajuste

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Reajuste do contrato | "Regra de vencimento e reajuste contratual" como **decisão pendente** | Planilha, PREMISSAS, linha 24 | Catálogo reajustado ao menos 1 vez a cada 12 meses, pelo índice que a Diretoria informar | **Não está no material** |
| Inflação de peças | "Inflação Médica (VCMH): Projetada em patamares elevados (11% a 14%) para 2026" | Planejamento, pág. 5 | Não usa | — |
| Correção de atraso | Nenhum documento lido | — | Termos da proposta: multa de 30%, IGP-DI e juros de 1% ao mês | **Não está no material lido** (o código diz que vieram das cláusulas do CRM, a seu pedido, em 28/10) |

### 2.16 Licitação

| Regra ou número | O que o seu material diz | Onde | O que o SGO+ e a C1 usam | Situação |
|---|---|---|---|---|
| Papel da licitação | "Licitação deve existir como canal, mas não pode virar muleta." Hoje "terceirizada em teoria". | Playbook, slides 24 e 32 | — | — |
| O que conferir | "Validar margem, prazo, capacidade operacional e exigencias documentais." | Playbook, slide 32 | Sem regra própria para licitação | Diferente |
| Atas de registro de preços | "Participar agressivamente de licitações de Registro de Preços no início do ano"; atas "prontas para serem ativadas em Setembro/Outubro" | Planejamento, item 3.2.2 (pág. 8) | Não usa | Diferente |
| Lance mínimo | Nenhum número | — | C1 propõe: lance nunca abaixo do preço mínimo sem a Diretoria | **Não está no material** |
| Urgência em licitação | Nenhum | — | Sem acréscimo | **Não está no material** |

### 2.17 Seus preços de serviço × a tabela do SGO+

A planilha de 30/10 tem preços de serviço. Ela avisa que são "VALORES ESTIMATIVOS, NÃO COTAÇÃO DE MERCADO" (PAINEL, A3) e estão **sem impostos** (ITENS_ORCAMENTO, A22). Mesmo assim, ficam bem acima da tabela do SGO+, que já tem o imposto dentro:

| Serviço | Planilha de 30/10 (sem imposto) | Tabela do SGO+ (com imposto) |
|---|---:|---:|
| Preventiva de câmara ou refrigerador, por visita | R$ 850 a R$ 950 | R$ 430 |
| Preventiva de estufa ou incubadora, por visita | R$ 500 a R$ 580 | sem item próprio |
| Calibração do indicador de câmara ou estufa | R$ 450 a R$ 800 (1 a 3 pontos) | R$ 170 |
| Qualificação de câmara de cerca de 600 L, com e sem carga (2 × 24 h) | R$ 4.800 | R$ 2.096 (R$ 1.310 + 60%) |
| Qualificação de incubadora, com e sem carga (2 × 24 h) | R$ 3.500 | R$ 1.696 (R$ 1.060 + 60%) |
| Preventiva de osmose, por visita | R$ 620 | sem item |

Não dá para dizer qual está certo. A planilha também avisa: "Não somar este orçamento aos custos reais sem incorporar viagens, impostos, margem, laudos terceirizados e contingências" (PAINEL, A23). Essa frase é ambígua: pode querer dizer que esses preços ainda nem têm margem.

---

## 3. O que é proposta nossa e precisa do seu ok

Item por item. Na coluna do meio está o que o seu material diz sobre o mesmo assunto.

| # | O que o SGO+ usa | O que o seu material diz sobre isso | Origem |
|---|---|---|---|
| 1 | Margem alvo de 40% (antes 20%) | Não dá margem por venda. O Planejamento projeta EBITDA de ~12% em 2026 e margem de contribuição de 39,5%. A planilha usa 30% em peças. | Proposta nossa, ajustada à sobra mínima de 35% decidida em 01/11/2026 |
| 2 | Sobra mínima de 35% (antes margem de 10%) | Nada | **Decidido pelo dono em 01/11/2026** |
| 3 | Impostos por unidade (Lucro Real) | Lucro Real (dados cadastrais). O Planejamento estima 12,5% para 2026. | **Decidido em 01/11/2026**: tabela de Goiânia e Rio; ISS e ICMS da compra provisórios para o contador |
| 4 | Comissão de 3% na conta | De 1% a 5%, conforme meta, margem, adimplência e CRM (Política, item 5) | Escolha nossa dentro da sua faixa |
| 5 | Alçadas: vendedor 5%, gerente 10%, Diretoria 13,75% | A Diretoria valida as alçadas (Playbook, slide 26), sem número. **Pelo padrão do código, o vendedor dá até 15% sozinho.** | Proposta nossa |
| 6 | Contrato anual com 10% a menos | Nada sobre desconto de contrato | Proposta nossa |
| 7 | Contrato em 12 parcelas | **Está na sua planilha** (PREMISSAS, linhas 4 e 24), como padrão proposto | Seu material |
| 8 | Segunda campanha de 24 h a 60% | A planilha conta "com e sem carga" como duas campanhas | Proposta nossa |
| 9 | Desconto de lote de 5% e 10% | Nada | Proposta nossa |
| 10 | Normal 10 d.u.; urgente 3 d.u. com +110%; prioritária 5 d.u. com +50% | Só proíbe prometer prazo sem validar | Pedido falado (urgente e normal) e proposta nossa (prioritária). Nada escrito. |
| 11 | Sem acréscimo de urgência em licitação e contrato | Nada | Proposta nossa |
| 12 | R$ 2,50 por km | Exemplo do MAN-VIA: R$ 480 para 420 km, já com pedágio | **Decidido pelo dono em 01/11/2026** (confirmado) |
| 13 | Taxa de R$ 300 por viagem (acima de 60 km) | Só existe o Incentivo de Missão de R$ 300 (200 km ou mais) | **Decidido em 01/11/2026**: era o Incentivo de Missão; removida |
| 14 | Alimentação R$ 100 por dia e hotel R$ 150 por noite, por pessoa | "seguem a política de despesas" (não encontrada). Exemplo: R$ 520 de diárias e hospedagem para 2 técnicos. | Proposta nossa |
| 15 | Horas de estrada acima de 200 km | Nada | Proposta nossa |
| 16 | Custo da hora: técnico R$ 90 (MAN-VIA-001), engenheiro R$ 132 | Encargos de 1,68 (planilha de 2019). Custo da hora do técnico de R$ 90 no exemplo do MAN-VIA. | **Decidido em 01/11/2026** ("valores maiores"); o salário real continua estimativa |
| 17 | Custo fixo de 25% sobre a mão de obra | Custos fixos de R$ 1,2 mi (2025) e R$ 1,5 mi (2026), estimados no Planejamento | Estimativa |
| 18 | Preço da peça pela conta com a sobra de 35% e os impostos de produto | A planilha usa custo ÷ 0,7 **sem imposto** e soma as horas de instalação | **Decidido em 01/11/2026** |
| 19 | Hora avulsa: o maior entre R$ 190 com o imposto por fora e a conta (R$ 250) | R$ 190 por hora de instalação, sem imposto | **Decidido em 01/11/2026** |
| 20 | Hora do engenheiro a R$ 270 | Nada | Conta nossa |
| 21 | Validade de 15 dias | Exige validade, sem número | Proposta nossa |
| 22 | Pagamento em boleto a 28 dias da nota | "conforme política financeira" (não encontrada) | Padrão antigo do SGO+; nada escrito |
| 23 | Desconto de pontualidade desligado (C1 sugere no máximo 2% para antecipado) | Nada | Proposta nossa |
| 24 | Garantia de 90 dias para serviços | Nada. A planilha deixa "SLA, emergência e garantia" como decisão pendente. | Padrão antigo do SGO+ |
| 25 | Reajuste do catálogo a cada 12 meses | "Regra de vencimento e reajuste contratual" pendente na planilha | Proposta nossa |
| 26 | Preço sobe até o menor valor entre mercado e histórico | Nada | Regra da C1 |
| 27 | Lance de licitação nunca abaixo do mínimo sem a Diretoria | "Validar margem" (Playbook, slide 32), sem número | Proposta nossa |

---

## 4. Contradições dentro do seu próprio material

| # | Assunto | Um documento diz | O outro diz |
|---|---|---|---|
| 1 | Meta de faturamento | Playbook (slides 7, 16 e 73): R$ 600 mil por mês, o que dá R$ 7,2 milhões por ano | Planejamento (Tabela 4.2): R$ 5,5 milhões em 2026, média de R$ 458 mil por mês, com pico de cerca de R$ 1,2 milhão em setembro e outubro |
| 2 | Comissão | Política Comercial (item 5, mai/2026): de 1% a 5%, escalonada por meta, margem, adimplência e CRM | Proposta do Gestor Comercial (mar/2025): 2%, 3% ou 4% conforme o faturamento mensal de contratos novos, mais bônus de R$ 2.000 e R$ 5.000. A Política é mais nova, mas não diz se substitui a proposta. |
| 3 | Regime de impostos | Dados cadastrais (pág. 1): "ME OPTANTE DO LUCRO REAL" | Planejamento (pág. 3): fala em "possível saída do Simples Nacional" e projeta imposto de 10,5% a 14% |
| 4 | Custo da hora técnica | MAN-VIA-001 (item 6.1): R$ 1.800 por 20 horas, ou R$ 90 por hora de custo | POL-BON-001 (item 10): o bônus de R$ 68.400 por ano vira R$ 3,56 por hora. Isso supõe cerca de 19.200 horas faturadas por ano na empresa toda. Os dois números juntos não batem com nenhuma tabela de salário que exista no material. |
| 5 | Equipe comercial | Playbook (slide 24): meta de 3 vendedores, 2 SDRs, 1 Farmer, 1 Hunter de Produtos e 1 Hunter de Serviços | Planejamento (Tabela 3.1): LDR, SDR, Closer e Farmer, com metas por função que o Playbook não tem |
| 6 | Etapas do funil | Playbook (slide 34): 6 etapas (entrada, qualificação, diagnóstico, proposta, negociação, fechamento) | Planejamento (item 3.4): 5 etapas (reconhecimento, diagnóstico técnico, desenho da solução, validação financeira, fechamento) |
| 7 | Limite do Incentivo de Missão | MAN-VIA-001 Rev. 03: 200 km por trecho | As revisões 01 e 02 usavam 250 km. A Rev. 03 diz que "substitui integralmente" as anteriores, então vale 200 km. O Manual de Viagem em Campo não fala de distância. |

E uma contradição dentro do SGO+, achada nesta conferência: o manual e a C1 dizem "vendedor até 5%", mas o valor padrão do código deixa o vendedor dar **até 15%** sem pedir aprovação (o valor gravado na produção não foi conferido). Os 10% do gerente e os 13,75% da Diretoria só geram aviso.

---

## 5. O que o seu material não diz

Só o senhor pode responder:

1. **Margem.** Decidido em 01/11/2026: sobra mínima de 35% para tudo. Falta confirmar a margem alvo (40% proposto).
2. **Impostos.** Decidido em 01/11/2026: Lucro Real, por unidade (Goiânia e Rio). Falta o contador confirmar o ISS de cada município e o ICMS das compras.
3. **Preço da peça.** Decidido em 01/11/2026: imposto por fora e sobra de 35% (peça de R$ 1.000 sai por R$ 2.334 em Goiânia).
4. **Hora de R$ 190.** Decidido em 01/11/2026: sem imposto (o preço é o maior entre R$ 190 com o imposto e a conta de custo).
5. **Alçadas.** Quanto o vendedor, o gerente e a Diretoria podem dar de desconto? Pelo padrão do código, o vendedor pode dar 15%.
6. **Comissão.** Qual é a tabela da escala de 1% a 5%? A tabela do gestor de 2025 ainda vale? Comissão sobre produto é igual à de serviço?
7. **Política financeira.** Prazo padrão de pagamento, parcelamento de avulso, desconto por pagar até o dia 10. O documento existe?
8. **Política de despesas.** Valor da diária, alimentação e hotel. O documento existe?
9. **Taxa de R$ 300 por viagem.** Decidido em 01/11/2026: não existe; era o Incentivo de Missão.
10. **Valor do km.** Decidido em 01/11/2026: R$ 2,50.
11. **Urgência.** Confirma 10 dias úteis no normal e 3 dias úteis com +110%? Quer a faixa de 5 dias? Cliente de contrato paga urgência?
12. **Contrato anual.** Tem desconto sobre o avulso? Deslocamento e corretiva entram ou ficam fora (a planilha deixa fora)?
13. **Validade da proposta.** Quantos dias?
14. **Garantia** dos serviços e **reajuste** dos contratos (índice e data).
15. **Custo real.** Salários por função, horas faturadas por mês e custo fixo que cabe aos serviços.
16. **Custo da hora.** Decidido em 01/11/2026: R$ 90 (valor maior). O MAN-VIA diz que esse valor já contém o Bônus Coletivo; o sistema soma o bônus por cima. Confirmar se é para manter assim.
17. **Preços da planilha de 30/10.** Decidido em 01/11/2026: valem, com o imposto por fora, quando forem maiores que a tabela e a conta.
18. **Meta.** Vale R$ 600 mil por mês (Playbook) ou R$ 5,5 milhões no ano (Planejamento)?
19. **Licitação.** Qual é a margem mínima de lance e quem aprova?
20. **Filial do Rio de Janeiro.** Decidido em 01/11/2026: a mesma tabela de preços, com os impostos do Rio na proposta e a distância medida a partir da sede do Rio.
