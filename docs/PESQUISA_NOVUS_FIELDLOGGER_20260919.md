# Pesquisa oficial NOVUS — maleta FieldLogger

Pesquisa em 19/09/2026. Somente estudo; não houve código, configuração de instrumentos, instalação de firmware ou alteração no SGO+.

## Evidências e limites

1. **Integração própria:** o manual V1.8x B descreve acesso aos canais por Modbus RTU (USB/RS485) e TCP (Ethernet). Também documenta chamada do Configurador por linha de comando para coleta/exportação, com parâmetros previamente configurados. Fonte: [manual V1.8x B, capítulos 8 e 10](https://cdn.novusautomation.com/downloads/manual_fieldlogger_v18x_b_en.pdf).
2. **Biblioteca:** a página do produto anuncia DLL de coleta gratuita. Não foi obtido/verificado o pacote nem sua compatibilidade com Windows/arquiteturas atuais; não é dependência aprovada. Fonte: [FieldLogger](https://www.novusautomation.com/en/fieldlogger).
3. **Variantes:** há modelos sem Ethernet; confirmar código da etiqueta. Fonte: [manual V1.6x O, seção 7.8](https://www.novusautomation.com/downloads/Arquivos/manual_fieldlogger_v16x_o_en.pdf).
4. **MQTT:** a NOVUS anunciou versão com MQTT em 16/05/2025, incluindo brokers locais ou em nuvem. Não inferir que os instrumentos existentes aceitam atualização para essa variante. Fonte: [anúncio oficial](https://www.novus.com.br/pt/noticia/NOVUS-lanca-nova-versao-do-FieldLogger-com-suporte-a-MQTT).
5. **Limites MQTT:** manual V1.9x A descreve broker genérico, QoS 0/1, ausência de TLS e que registros do SD não são enviados via MQTT. Fonte: [manual V1.9x A, seção 4.1.3.7](https://cdn.novusautomation.com/downloads/manual_fieldlogger_v19x_a_en.pdf). Essas limitações exigem conferir firmware/manual correspondente antes do desenho definitivo.
6. **Amostragem:** manual V1.7x F informa condição de exatidão ligada a mais de 200 ms por canal e dá 1,6 s como exemplo para oito canais. Não confundir velocidade máxima anunciada, varredura analógica, gravação e atualização da tela. Fonte: [manual V1.7x F, seção 6.1.4](https://cdn.novusautomation.com/downloads/manual_fieldlogger_v17x_f_en.pdf).
7. **Ferramentas existentes:** NXperience oferece configuração, coleta, análise e exportação. Servirá como referência de comparação no piloto; não assumir que todas suas funções se aplicam a qualquer variante do FieldLogger. Fonte: [NXperience](https://www.novusautomation.com/en/nxperience).
8. **Documentos a obter para o modelo real:** a área de downloads lista protocolo Modbus, manuais e firmware em linhas separadas (convencional e MQTT). O mapa de registradores não foi analisado nesta pesquisa; endereços e formatos não estão aprovados. Fonte: [downloads oficiais](https://www.novus.com.br/pt/produto/data-loggers/fieldlogger/downloads).

## Inferência sobre a maleta

A descrição parece corresponder a 16 grandezas: oito temperaturas no primeiro instrumento; no segundo, quatro T, uma K, umidade, temperatura adicional e pressão. Isso é uma interpretação da descrição, não inspeção da fiação. Confirmar tipo de sinal dos transmissores e localização dos sensores; a temperatura adicional pode servir a um contexto diferente das sondas do estudo. Não incluir automaticamente todos os canais no F0.

## Proposta após a pesquisa — para discussão

**Duas rotinas complementares:** leitura dos valores atuais para o painel e coleta do histórico para conferência do ciclo. A primeira permite conduzir o ensaio; a segunda permite comparar a série capturada com os dados gravados. Recuperação após falha só será prometida após verificar o comportamento real de memória, horários e coleta.

**Piloto preferido:** computador Windows disponível à equipe, com coletor local e dashboard acessível no navegador. Modbus TCP é candidato se ambos tiverem Ethernet; USB/RS485 são alternativas a testar. Para o histórico, experimentar a automação documentada do Configurador antes de depender de uma DLL não examinada. Isso aproveita a ferramenta do fabricante e concentra o desenvolvimento no fluxo de estudo e integração.

**Evolução candidata:** computador dedicado na maleta, rede local e acesso por tablet/notebook; aquisição e armazenamento continuam locais, envio ao SGO+ ocorre quando houver conexão. Se a solução depender do Configurador ou DLL Windows, não pressupor portabilidade para Linux. Nenhuma compra indicada antes da prova de comunicação.

**MQTT opcional:** avaliar apenas se os modelos permitirem. Dadas as limitações documentadas, considerar broker local e um serviço intermediário com conexão protegida à nuvem, em vez de expor o instrumento diretamente à internet. MQTT não substitui automaticamente a recuperação do histórico.

**Experiência de uso proposta:** mapa de posicionamento das sondas sobre foto da montagem; indicadores de comunicação por logger; gráficos com seleção de canais; evento/foto com horário; detecção de fases sugerida pelo sistema e confirmada pelo operador; revisão de lacunas e identificação dos sensores pertinentes; comparação entre ciclos da mesma receita. Essas são ideias de produto, não funcionalidades atribuídas à NOVUS.

**Integração futura:** ciclo identificado → conferir integridade e janela temporal → pacote para o módulo autoclave → cálculos/gráficos reproduzíveis → rascunho com IA → revisão responsável. O formato aceito pelo módulo SGO+ deverá ser inspecionado antes de implementar a ponte.

## Próxima validação

Obter código/modelo, firmware e conectores reais dos dois loggers, configuração/exportação atual e modelo/sinal dos transmissores. Não atualizar firmware nem reconfigurar a maleta por causa desta pesquisa. Primeiro demonstrar leitura somente de consulta e comparar valores/horários com o software NOVUS. Escolher então aquisição, coleta, frequência e arquitetura com base nos ensaios e na aplicação metrológica.
