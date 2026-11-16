# Referência interna — QI/QO Lavadora Ultrassônica (documento de fabricante recebido em 2026-07-25)

**USO INTERNO APENAS — nunca citar o nome do fabricante nem o nome deste arquivo no texto gerado pelo sistema (Planejamento CME). No documento pro cliente, atribuir sempre como "protocolo técnico do fabricante do equipamento", de forma genérica, porque o mesmo texto atende equipamentos de outras marcas.**

Fonte: PDF "QI-QO - Lavadoras Ultrassônicas SW.pdf" (fabricante Sanders do Brasil, linha SW), enviado pelo usuário como comprovação de que o critério já usado no `metrolabs_planejamento_cme` (4 repetições, pontos de cavitação, etc.) reflete prática real de fabricante — usuário confirmou que outros fabricantes que já viu seguem padrão semelhante.

## Base normativa citada pelo próprio fabricante
RDC nº 15/2012 (Anvisa) — mesma norma já usada no resto do sistema. Define QI ("evidência documentada... equipamento entregue e instalado de acordo com as especificações") e QO ("evidência documentada... equipamento opera dentro dos parâmetros originais de fabricação").

## Parâmetros técnicos reais (QI)
- Nivelamento: desnível máximo entre lados definido em formulário próprio do fabricante (não um número universal).
- Aterramento: tensão fase-pino-central ≈127V (bifásico) ou 220V (monofásico 220V).
- Verificação de rede de ar pressurizado, tensão de instalação, pressão/tempo de enchimento de água, ponto de esgoto abaixo da saída, espaço livre de manuseio.

## Parâmetros técnicos reais (QO)
- **Temperatura**: ciclo de 1 min ultrassom, medição no centro da cuba a 20mm de profundidade — tolerância **± 2°C** da temperatura setada.
- **Cavitação (MDU/medidor de desempenho ultrassônico)**: ciclo de 15 min ultrassom (5 min desgaseificação) a 35°C — área de varredura 85×55mm com pontos definidos por modelo (SW2000/SW3000-4000/SW4500 têm quantidades de pontos diferentes). Critério de aceitação: **média ≥ 6,5**, pontos individuais **≥ 4**.
- **Cavitação (ampolas químicas)**: mesmo ciclo (15min/5min desgas, 35°C) — fabricante alerta que ampolas têm inconsistência de lote conhecida; em caso de falha, **repetir o teste 3 vezes** antes de confirmar problema (nota de rastreabilidade útil).
- **Volume de detergente injetado**: ciclo de 5 min, 60ml programado, mede-se com proveta graduada o volume real injetado.
- **Fluxo de água nos canulados**: ciclo de 5 min circulação, verificação visual de fluxo uniforme em todos os bicos, sem obstrução.

## Relevância pro `metrolabs_planejamento_cme`
Confirma que o padrão de "protocolo do fabricante, não normativo direto" já adotado no sistema (Anexo J da NBR 16328 é informativo) é coerente com a prática real de mercado — o fabricante também não segue uma tabela fixa universal, define parâmetros próprios por modelo/linha, com tolerâncias específicas (ex.: ±2°C, ≥6,5 cavitação). Reforça a decisão já tomada de manter a fórmula da Lavadora Ultrassônica inalterada e sempre atribuída genericamente a "protocolo do fabricante".

Quando a implementação da IA deste módulo for retomada, considerar enriquecer o prompt/fundamentação da Lavadora Ultrassônica com esses tipos de parâmetro (tolerância de temperatura, critério de cavitação, repetição em caso de falha de ampola) — sempre em linguagem genérica, nunca citando "Sanders"/"MDU Sanders" no texto final.
