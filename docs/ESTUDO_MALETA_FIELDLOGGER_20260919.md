# Maleta FieldLogger — conceito para validação

Registrado em 19/09/2026. **Projeto novo, somente em discussão. Não iniciar código, criar projeto remoto ou modificar o SGO+ antes de validar a ideia com o usuário.**

Pesquisa posterior solicitada pelo usuário: [documentação oficial NOVUS, possibilidades reais de integração e proposta revisada](PESQUISA_NOVUS_FIELDLOGGER_20260919.md). Fabricante informado: NOVUS; modelos e firmware individuais ainda não confirmados.

## Objetivo relatado

Criar um sistema que se comunique com os dois FieldLoggers de uma maleta, acompanhe os sensores em tempo real, armazene e extraia os dados. Futuramente, ao concluir cada ciclo, enviar os dados ao módulo de autoclave existente no SGO+ e preparar relatório com gráficos, tabelas, fotos, textos, índices, cálculo F0 e interpretação por IA.

A primeira prioridade é comprovar a comunicação com os instrumentos. Fabricante NOVUS e presença de Ethernet nos dois instrumentos informados pelo usuário; confirmar modelos, firmware e configuração. Não presumir que o módulo atual já recebe esse pacote sem adaptações.

## Instrumentação informada

| Instrumento | Configuração relatada |
| --- | --- |
| FieldLogger 1 | 8 sensores de temperatura tipo T. |
| FieldLogger 2 | 4 sensores de temperatura tipo T; 1 tipo K; um sensor de umidade e outro de temperatura; sensor de pressão de 0 a 6 bar absolutos. |

Confirmar se umidade e temperatura são instrumentos separados ou saídas de uma única sonda, e como todos estão ligados/configurados. Distinguir grandezas exibidas de canais físicos: ainda não há diagrama de ligação nem modelo confirmado. Pressão deve permanecer identificada como absoluta; não converter silenciosamente para manométrica.

## Proposta inicial de operação

1. Preparar estudo: selecionar cliente, unidade e equipamento; identificar receita, tipo de estudo, operador, sensores utilizados e posicionamento; anexar fotos de montagem/carga.
2. Conferir aquisição: identificar cada logger e sensor, estado da comunicação, horário, intervalo de leitura e registros de calibração disponíveis. Visualizar dados antes de iniciar o ciclo.
3. Acompanhar ciclo: valores atuais, gráficos, tempo decorrido, eventos anotados, qualidade da aquisição, falhas e último horário recebido. Valor antigo nunca deve parecer leitura atual.
4. Encerrar e revisar: inicialmente início/fim explícitos pelo operador. Conferir janela do ciclo, dados faltantes, fotos, receita e observações. Detecção automática de fases/ciclos fica para etapa posterior validada.
5. Integrar: enviar um pacote identificado do ciclo ao SGO+, acompanhar confirmação e repetir envio sem criar duplicata em caso de falha.
6. Relatar: gerar rascunho pelo módulo existente, com cálculos e gráficos reproduzíveis; IA organiza a interpretação baseada nos dados. Revisão do responsável antes de liberar documento final.

## Dashboard proposto

- Cabeçalho: cliente/unidade, equipamento, estudo, receita e ciclo atual.
- Cartões separados dos dois loggers: conectado, aguardando leitura, desconectado; último registro; sensores habilitados; situação da gravação local e do envio ao SGO+.
- Grade de sensores: identificação, posição no estudo, grandeza/unidade, leitura atual e situação. Cor acompanhada de texto; escolher sensores visíveis no gráfico.
- Gráficos sincronizados no tempo; temperatura, pressão e umidade em painéis/eixos identificados, sem misturar unidades em uma escala comum.
- Linha do tempo: início, eventos registrados, mudanças de fase confirmadas e encerramento. Fotos/observações vinculadas ao horário.
- Resumo do ciclo: duração, extremos, dispersão entre sensores pertinentes e F0 quando o estudo/configuração permitir. Critérios de aceitação definidos por estudo, sem limites universais inventados.
- Área de conclusão: revisão dos dados, exportação, fila de envio e estado do relatório.

O layout será desenhado depois de decidir a forma de trabalho em campo e a plataforma da tela; nesta fase não há protótipo aprovado.

## Arquitetura candidata, condicionada à inspeção dos instrumentos

`FieldLogger 1 + FieldLogger 2 → coletor local → armazenamento e dashboard → envio de ciclos ao SGO+ → rascunho do relatório`

Recomendação inicial: separar a aquisição de campo da comunicação com a nuvem. Um coletor no computador da equipe ou em equipamento dedicado pode manter a aquisição e a fila de envio quando a internet cair. A escolha entre essas opções depende de conexões reais, sistema operacional, alimentação, mobilidade e acesso permitido no cliente.

Google Apps Script/SGO+ seria o destino da integração; a viabilidade de acesso direto aos loggers não está demonstrada. Pesquisar documentação oficial do modelo e testar uma leitura antes de escolher protocolo, biblioteca, hardware adicional ou prometer uma frequência de atualização.

Distinguir visualização frequente, amostragem efetiva, armazenamento no logger e extração posterior. A recuperação após desconexão depende das capacidades do instrumento. Alinhar horários dos dois loggers e registrar origem/qualidade do tempo; se as amostras não coincidirem, qualquer alinhamento ou interpolação deve ser explícito e rastreável.

## Dados a preservar

- Identificador único da maleta, logger, sensor/canal, estudo e ciclo.
- IDs estáveis de cliente/unidade/equipamento do SGO+, com cópia dos dados apresentados no estudo para rastreabilidade.
- Modelo/número de série, unidade de medida, tipo de sensor, posição e referência de calibração.
- Horário original e de recebimento, sequência quando disponível, valor bruto, eventuais correções e qualidade da leitura.
- Parâmetros da receita e do cálculo, versões de software/método, eventos, fotos e observações.
- Arquivo bruto original preservado; exportações e relatórios derivados sem sobrescrever a evidência original.
- ID do envio, tentativas, confirmação recebida e versão do relatório, evitando documentos duplicados.

## F0 e IA — decisões a validar adiante

Não definir agora fórmulas implementadas, parâmetros, limites, critérios normativos ou quais sensores entrarão no cálculo. Confirmar aplicação, método, referências técnicas, temperatura de referência, parâmetro z, intervalo de integração e tratamento de lacunas antes de implementar. Calcular por sensor pertinente e registrar o método; não substituir esse resultado por uma interpretação da IA.

IA poderá redigir e interpretar resultados calculados, indicar limitações de dados e organizar relatos/fotos. Não inventar medições, preencher lacunas como se fossem observadas ou liberar automaticamente uma conclusão técnica sem critérios e revisão.

## Etapas sugeridas

1. **Descoberta:** modelo exato, conexões, configuração dos canais, arquivo de exemplo e fluxo real do operador.
2. **Prova de comunicação:** ler um logger, conferir valores com a ferramenta atual e demonstrar recuperação/indicação de falha.
3. **Aquisição da maleta:** dois loggers, identificação dos sensores, alinhamento temporal, persistência e exportação bruta.
4. **Dashboard e estudos:** seleção dos dados cadastrais, receitas, ciclo manual, eventos e fotos.
5. **Ponte SGO+:** avaliar interface do módulo de autoclave, definir contrato do pacote, confirmação e reenvio sem duplicidade; testar com estudo identificado para homologação.
6. **Relatório:** cálculos validados, gráficos, tabelas e IA, com revisão e histórico de versões.

Validar cada etapa com dados comparáveis antes de avançar. Não há prazo, orçamento, plataforma ou compra de equipamento aprovados.

## Perguntas para pensar com o usuário

1. Quais os modelos exatos e firmware dos dois loggers NOVUS? Como conecta hoje ao computador e qual programa usa para baixar os dados?
2. A maleta ficará ligada a um notebook durante todo o ensaio ou precisa trabalhar sem computador? Precisa operar sem internet no cliente?
3. Como os sinais de umidade, temperatura adicional e pressão estão conectados? Qual o formato do arquivo que o software atual exporta?
4. Quais estudos/receitas serão o primeiro piloto e como a equipe identifica hoje o início e o fim de cada ciclo?

Próximo passo: discutir e validar o conceito, começando pelas duas primeiras perguntas. Nenhuma implementação autorizada nesta sessão.

## Atualização de 21/09/2026 — conexão e ponto de retomada

Usuário solicitou salvar a proposta para o projeto futuro. **Manter em planejamento, sem iniciar desenvolvimento.**

Informações confirmadas pelo usuário: ambos os FieldLoggers possuem Ethernet; o notebook não possui porta de rede Ethernet. Tipo de USB do notebook e modelos/firmware dos instrumentos ainda precisam ser identificados.

### Opção inicial com cabos

```text
FieldLogger 1 -- Ethernet --+
                           +-- switch -- Ethernet -- adaptador USB/Ethernet -- notebook
FieldLogger 2 -- Ethernet --+
```

Materiais candidatos: um switch pequeno de cinco portas com alimentação, três cabos de rede e um adaptador USB–Ethernet compatível com USB-A ou USB-C e sistema operacional do notebook. Cada logger terá endereço IP próprio na mesma rede do computador; verificar a configuração de Modbus TCP no piloto.

Não assumir que ligar um logger ao outro por Ethernet e conectar apenas um deles por USB permite acessar ambos. Essa ponte USB → Ethernet não está documentada no manual consultado. O USB device permite acesso Modbus RTU ao instrumento; a ponte documentada encaminha solicitações Ethernet Modbus TCP para dispositivos RS485. Fonte: [manual NOVUS V1.8x B, seções 9.7, 9.8 e capítulo 10](https://cdn.novusautomation.com/downloads/manual_fieldlogger_v18x_b_en.pdf).

### Evolução para Wi-Fi ou alternativa desde o piloto

```text
FieldLogger 1 -- Ethernet --+
                           +-- roteador Wi-Fi )) notebook
FieldLogger 2 -- Ethernet --+
```

Usar roteador com pelo menos duas portas LAN disponíveis; os loggers continuam cabeados, enquanto o notebook usa Wi-Fi. Se já houver roteador adequado, avaliar começar diretamente com ele, evitando a compra intermediária de switch e adaptador. A comunicação local não depende de internet; o envio ao SGO+ requer conexão com a internet. O coletor e armazenamento locais continuam previstos na arquitetura candidata.

### Quando retomarmos

1. Identificar modelos, firmware, configuração atual, portas USB do notebook e material de rede já disponível.
2. Escolher a montagem e validar leitura dos dois loggers, comparando canais e horários com o software NOVUS.
3. Testar estabilidade, indicação de desconexão e recuperação dos registros, preservando os dados originais.
4. Validar os resultados antes de desenvolver dashboard, gestão dos ciclos e integração com o módulo de autoclave.

Nenhuma compra, instalação ou alteração nos instrumentos foi realizada; a solicitação atual é de registro para retomada futura.
