# Manual do Operador — Esterilização a baixa temperatura

Qualificação de instalação (QI), de operação (QO) e de desempenho (QD) de esterilizadores a peróxido de hidrogênio vaporizado (com ou sem fase de plasma) e a vapor a baixa temperatura com formaldeído (VBTF). Menu: Qualificação e inspeção > Esterilização a baixa temperatura.

O manual em vigor é o que abre dentro do SGO+, pelo botão "Como usar esta tela" (cabeçalho no computador, barra do topo no celular), que também oferece o "Manual completo do módulo" em A4. Este arquivo é a cópia de consulta.

## 1. Para que serve

O módulo registra o ensaio de qualificação, lê os arquivos do registrador de dados, calcula as grandezas de cada ciclo, confere os indicadores químicos e biológicos e decide, critério por critério, se o resultado é conforme. A decisão é sempre do cálculo. A redação automática das análises e das conclusões só escreve sobre o resultado calculado e passa por conferência antes de ser aceita. O relatório só é emitido depois da revisão e da aprovação do responsável técnico, registradas no próprio relatório.

## 2. Antes de começar

- Cliente, unidade e esterilizador cadastrados em Cadastros (Clientes, Unidades e Equipamentos). Fabricante (marca), modelo, patrimônio e capacidade do cadastro saem na identificação do relatório quando preenchidos.
- Especificação do ciclo do fabricante do equipamento: temperatura programada e tolerâncias, tempo de exposição e, quando declarados, número de pulsos de injeção e pressão de vácuo. Esses valores são os limites de aceitação.
- Registradores e transdutores cadastrados em Calibração > Padrões de referência, com certificado válido no período do ensaio, incerteza U e fator k.
- Arquivos exportados pelo registrador de cada ciclo: planilha (XLSX, XLS, ODS ou Planilha Google) ou texto (CSV, TXT). Um arquivo com todos os sensores ou um arquivo por sensor.
- Indicadores químicos e biológicos de cada ciclo: posição, lote, validade e resultado. O ciclo de desempenho só fecha depois da incubação dos indicadores biológicos e do controle positivo.

## 3. As oito abas da tela

### 3.1 Identificação

Tipo de processo (peróxido de hidrogênio ou VBTF), etapas executadas (QI, QO, QD), cliente (busca por nome ou CNPJ), unidade, equipamento, datas do ensaio, técnico executor, quem acompanhou pelo cliente, motivo da qualificação e observações gerais. Os dados do cliente e do equipamento vêm sempre do cadastro, e o relatório só pode ser feito para equipamento do próprio cliente: equipamento de outro cliente ou de outra unidade é recusado já ao salvar. Se a TAG, o número de série ou o setor estiverem vazios no cadastro, a tela mostra **Falta no cadastro do equipamento** com os campos para preencher ali mesmo: **Gravar no cadastro** grava no cadastro do equipamento só o que está vazio (com registro de quem gravou) e o ensaio continua; trocar valor já gravado é em Cadastros › Equipamentos › Editar. Patrimônio e capacidade, quando preenchidos no cadastro, também saem no relatório. Se estiverem vazios no cadastro, a aba Identificação mostra "Completar no cadastro do equipamento (opcional)" com os dois campos: preencha se souber e toque em **Gravar no cadastro** (mesma regra: só o que está vazio). Se faltar cadastro, os botões **Cadastrar cliente**, **Cadastrar unidade** e **Cadastrar equipamento** abrem o cadastro em outra aba; depois de salvar, volte e toque em **Buscar cliente** de novo. O relatório emitido aparece na ficha do equipamento (aba **Qualificações**), no Arquivo de documentos e na seção **Qualificação** do QR Code, com a validade da requalificação.

### 3.2 Ciclo e critérios

Parâmetros do ciclo programado, copiados da especificação do fabricante, e a origem desses parâmetros (obrigatória). Campo em branco significa que o fabricante não declara: o critério fica informativo (uniformidade, concentração) ou não é avaliado (pulsos, vácuo). Abaixo, a tabela dos critérios que o sistema avalia, com as etapas e a fonte, e a lista das normas de referência do processo, com o selo "a confirmar" nas que o responsável técnico ainda precisa confirmar.

O ajuste "Elevação mínima de pressão para contar um pulso" não é critério de aceitação: é o parâmetro que separa uma injeção do agente de uma oscilação de pressão. O padrão é 3 mbar no peróxido de hidrogênio e 20 mbar no VBTF. Só altere com orientação do responsável técnico.

### 3.3 Instrumentos

Escolha cada registrador ou transdutor do cadastro de padrões. Confira a grandeza, o número do certificado, a validade, a incerteza U do certificado e o fator k, e informe a resolução do registrador. Certificado vencido no período do ensaio, sem número ou sem incerteza impede a emissão.

### 3.4 Instalação (QI)

Lista de verificação do laboratório baseada nos requisitos de instalação do fabricante. Cada item recebe Sim, Não ou Não se aplica (com observação obrigatória). "Não" vira não conformidade.

### 3.5 Operação (QO)

Verificações funcionais (intertravamento da porta, alarmes, cancelamento de ciclo, programas), ensaio de estanqueidade quando aplicável (pressões no início e no fim da espera, duração e limite declarado pelo fabricante; o sistema calcula a elevação em mbar/min) e os ciclos com a câmara vazia.

### 3.6 Desempenho (QD)

Ciclos com carga (o plano configurado pede três). Cada ciclo exige indicadores químicos e biológicos, o controle positivo e a incubação concluída.

### 3.7 Resultado e textos

"Calcular resultado" lê todos os arquivos, aplica os critérios e mostra o resultado calculado, a lista "O que falta" (pendências que impedem a emissão) e os avisos. "Redigir textos" monta as análises de cada etapa e as conclusões técnica e em linguagem de fácil compreensão.

### 3.8 Revisão e emissão

"Ver prévia do relatório", "Enviar para revisão", a revisão do responsável técnico ("Aprovar" ou "Devolver ao técnico", com parecer), "Emitir relatório", os links do PDF, do HTML e da pasta do cliente, "Enviar ao cliente" e "Nova revisão". O histórico mostra cada ação com data, hora e responsável.

## 4. Passo a passo de um ensaio completo

1. Toque em "Novo ensaio", preencha a aba 1 e toque em "Salvar".
2. Na aba 2, copie a especificação do ciclo e a origem dos parâmetros.
3. Na aba 3, carregue os padrões e acrescente os instrumentos usados.
4. Na aba 4, responda as verificações de instalação.
5. Na aba 5, responda as verificações funcionais, preencha a estanqueidade se aplicável e acrescente o ciclo de operação.
6. Em cada ciclo: número e data do ciclo, carga, envio do arquivo, conferência da prévia e das colunas, papel e posição de cada sensor, janela de exposição (automática), indicadores.
7. Na aba 6, acrescente os ciclos de desempenho e faça o mesmo em cada um.
8. Na aba 7, toque em "Calcular resultado", resolva "O que falta", toque em "Redigir textos", revise e salve.
9. Na aba 8, veja a prévia, envie para revisão. O responsável técnico aprova. Toque em "Emitir relatório" e em "Enviar ao cliente".

## 5. Leitura dos arquivos do registrador

### 5.1 Formatos aceitos

Planilha (XLSX, XLS, ODS, Planilha Google: primeira aba) e texto (CSV, TXT, TSV, DAT, LOG) com separador ponto e vírgula, tabulação, vírgula, barra vertical ou espaços. Vírgula decimal é reconhecida. Data e hora juntas ou em colunas separadas, só a hora (a data vem do cartão do ciclo), tempo decorrido em segundos ou minutos (com a hora de início informada) e hora com milissegundos (hh:mm:ss:mmm). Pressão em mbar, hPa, kPa, Pa, bar, psi, mmHg ou Torr, sempre convertida para mbar. Colunas de umidade e de concentração (ppm, mg/L) são lidas quando existem.

### 5.2 Prévia e colunas

O sistema propõe o papel de cada coluna pelo cabeçalho (Data, Hora, T1, ST-01, Pressão...). Corrija na prévia quando precisar e toque em "Ler de novo com as colunas abaixo". Linhas sem horário ou sem temperatura válida, horários repetidos e leituras fora de ordem são tratados e informados nos avisos.

### 5.3 Um arquivo por sensor

Envie todos os arquivos do ciclo de uma vez. As leituras são unidas pelo horário: a grade é a do arquivo com pressão (ou a do primeiro) e a leitura de outro arquivo entra no horário mais próximo até meio intervalo de distância. Horários sem par ficam sem valor para aquele sensor e o aviso informa quantos.

## 6. Como o resultado é calculado

### 6.1 Fases e janela de exposição

Peróxido de hidrogênio: a janela vai do início do primeiro pulso de injeção até a volta ao vácuo depois do último pulso. VBTF: a janela é o maior trecho contínuo em que todos os sensores ativos ficam no limite inferior da faixa de temperatura. Sem os dados de um método, o outro serve de reserva. Pulso é a elevação de pressão, a partir de um vácuo, de pelo menos o valor de detecção configurado, sem chegar à pressão ambiente (subida até a pressão ambiente é ventilação). As fases mostradas no relatório são a preparação e o vácuo, a exposição e a fase final.

### 6.2 Grandezas calculadas

Na janela: mínima, média e máxima de cada sensor; leituras fora da faixa; a maior diferença entre sensores no mesmo instante; a duração; a pressão mínima do ciclo; o número de pulsos; a concentração ou a umidade, quando registradas.

### 6.3 Critérios

C01 temperatura na carga (QD); C02 temperatura da câmara; C03 uniformidade (informativa sem limite declarado); C04 tempo de exposição; C05 número de pulsos; C06 pressão de vácuo; C07 indicadores químicos; C08 indicadores biológicos com controle positivo; C09 concentração ou umidade; C10 estanqueidade; C11 verificações de instalação; C12 verificações funcionais; C13 ciclos de desempenho aprovados. Cada critério sai no relatório com o requisito e a fonte.

### 6.4 Incertezas e regra de decisão

A incerteza expandida (k = 2) combina a incerteza do certificado (U dividido pelo k do certificado) com a resolução do registrador (distribuição retangular). Para o tempo de exposição, cada limite da janela tem a resolução do intervalo entre leituras. A regra de decisão configurada é a aceitação simples: o valor medido é comparado com o limite e a incerteza é declarada. O responsável técnico pode adotar a aceitação protegida (limites reduzidos pela incerteza) na configuração do módulo.

## 7. Travas: o que impede a emissão

O relatório não sai enquanto houver pendência. Cada item da lista "O que falta" diz o que aconteceu, por quê, onde corrigir e como retomar. Exemplos: cliente, unidade ou equipamento não escolhidos; datas inválidas; parâmetros do ciclo ou sua origem em branco; instrumento sem certificado, vencido ou sem incerteza; verificações sem resposta; ciclos de operação ou de desempenho a menos que o mínimo; arquivo sem leituras, com intervalo fora da faixa ou com falhas de registro acima do limite; janela manual sem justificativa; sensor ativo sem leitura; indicador vencido ou sem resultado; incubação não concluída; controle positivo sem crescimento; pulsos ou vácuo programados sem coluna de pressão; vácuo avaliado sem transdutor calibrado; textos vazios ou com resultado diferente do calculado.

## 8. Redação automática e conferência

A redação recebe só os resultados calculados (sem nome de cliente, sem fabricante, sem as leituras). Cada seção é conferida: número que não está nos resultados, norma fora da lista do documento, resultado diferente do calculado, resultado intermediário, nome de fabricante ou texto que se refira a si mesmo fazem a seção ser descartada e trocada pelo texto padrão, montado diretamente dos resultados. Sem a chave da IA, o módulo funciona com o texto padrão. Na emissão, os textos revisados passam pela mesma conferência: resultado diferente, norma fora da lista ou fabricante impedem a emissão; número que não está nos resultados vira aviso para o responsável técnico conferir.

## 9. Revisão, aprovação e emissão

O técnico envia para revisão; o sistema guarda a impressão digital (SHA-256) dos dados, dos resultados e dos textos. O responsável técnico (perfis Administrador, Diretoria ou Gestor, diferente de quem elaborou) escolhe quem assina, escreve o parecer e aprova, ou devolve com o que corrigir. Qualquer alteração depois do envio volta o ensaio para rascunho e anula a aprovação. Na emissão, os arquivos são lidos de novo e a impressão digital precisa conferir com a aprovada. O relatório recebe o número QBT-ano-sequência, é salvo em PDF e HTML A4 na pasta do equipamento, dentro da pasta do cliente ("Baixa Temperatura - Laudos" > CNPJ > TAG e tipo do equipamento > Qualificação), e registrado no Arquivo de documentos na categoria "Relatórios de qualificação", com vencimento de 12 meses para a requalificação. Ensaio emitido não muda: correções são feitas por "Nova revisão".

## 10. O relatório

Capa; ficha e quadro do resultado; sumário com páginas; identificação; objetivo e escopo; referências; metodologia; instrumentação e rastreabilidade; critérios de aceitação com fonte; QI, QO e QD com tabelas por ciclo, gráficos de temperatura (com a janela de exposição e os limites) e de pressão (escala logarítmica), indicadores e análise; consolidação; incertezas e regra de decisão; não conformidades e observações; conclusão técnica e em linguagem de fácil compreensão; responsabilidades e assinaturas (elaborado por e revisado e aprovado por); Anexo A com o registro de revisão e aprovação e a impressão digital; Anexo B com os arquivos de dados usados.

## 11. Normas e pontos a confirmar pelo responsável técnico

Referências configuradas: RDC ANVISA nº 15/2012; ISO 14937:2009; ISO 22441:2022 (peróxido de hidrogênio); ISO 25424:2018 e EN 14180:2014 (VBTF); ISO 11140-1:2014 (indicadores químicos); ISO 11138-1:2017 e ISO 11138-5:2017 (indicadores biológicos; a parte 5 para VBTF); JCGM 100:2008 (incerteza). Estão marcadas "a confirmar" e devem ser conferidas: edições vigentes de ISO 22441, ISO 25424, EN 14180 e ISO 11138-5; adoções ABNT NBR ISO equivalentes; a parte da série ISO 11138 para peróxido de hidrogênio e a norma europeia de equipamento a peróxido (não saem no relatório até a confirmação). Também ficam com o responsável técnico: os três ciclos de desempenho, a exigência de indicadores químicos e biológicos no desempenho, a regra de decisão, os valores de detecção de pulso e o prazo de 12 meses para requalificação.

## 12. Quem pode fazer

Administrador, Diretoria, Gestor, Técnico e Metrologia preenchem, calculam, enviam para revisão e emitem. Administrador, Diretoria e Gestor revisam e aprovam ensaios elaborados por outra pessoa. Comercial e Financeiro consultam. Cliente e RH não acessam a tela.

## O que mudou em 22/10/2026 (identificação completa e vários padrões)

- **Identificação do equipamento completa.** Escolhido o equipamento, tudo o que está preenchido em Cadastros › Equipamentos sai no documento: tipo, fabricante (marca), modelo, nº de série, TAG, patrimônio, setor, capacidade, câmaras ou portas e ano de fabricação. Campo preenchido no cadastro fica travado na tela, com a explicação de onde corrigir (Cadastros › Equipamentos › Editar); campo vazio no cadastro pode ser completado no quadro "Cliente e equipamento", em "Gravar no cadastro" (só grava o que está vazio). Linha vazia não aparece no documento.
- **Vários padrões de referência.** Na aba "3. Instrumentos", toque em "Carregar padrões" e marque na lista, com busca, todos os registradores e transdutores usados (sem limite); desmarcar tira da tabela. O relatório traz cada um com fabricante, modelo, nº de série, certificado, laboratório, calibração, validade, incerteza e a situação no período do ensaio.
- Documentos e rascunhos antigos, com um padrão só, continuam abrindo e gerando igual.
