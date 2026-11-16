# Estufa, banho-maria e secadora — sensores selecionáveis

Data: 21/09/2026. Implementação autorizada pelo usuário. Publicado em DEV/HEAD e produção **versão 280**.

## Entrega

- Seleção de um ou mais canais em todos os perfis do módulo, sem senha ou bloqueio por quantidade mínima do perfil. Os relatórios registram quantidade e identificadores utilizados, sem comparação com 12 ou 6 sensores.
- Seleção e referências de arquivos preservadas ao mudar modo de entrada, perfil e quantidade de canais. Canais desmarcados não entram nas análises, tabelas ou gráficos.
- Novo perfil **Secadora de traqueias — CME**: três estudos em vazio e três com carga, com períodos independentes. Temperatura, tolerância e duração configuráveis; sugestão inicial de 60 °C e 30 minutos por estudo. A faixa de 50–100 °C não é uma trava do software.
- Identificação da secadora nos resultados e instruções da IA, sem atribuir esterilização, despirogenização ou letalidade ao estudo térmico da secadora.
- Relatório técnico em planilha/PDF e relatório interpretativo HTML A4 usam a mesma análise. Resultado informativo não é convertido automaticamente em aprovação.
- Na estufa de esterilização, seleção propagada aos gráficos e dados das três repetições. Dados entre repetições não entram no conjunto analisado. Contexto interpretativo e tabela incluem resultados por repetição e letalidade existente.
- Alteração dos dados após gerar os textos interpretativos exige nova interpretação, evitando emitir os textos anteriores com outros resultados.
- Manual incorporado atualizado com instruções sobre seleção e secadora. Indicadores de carregamento existentes preservados.

## Como usar

1. Abra o módulo e escolha o perfil do equipamento.
2. Informe os canais disponíveis e marque somente os sensores utilizados. Exemplo: mantenha oito canais disponíveis para selecionar S1, S3, S5 e S8.
3. Importe o arquivo único, cole os dados ou informe os arquivos individuais dos canais selecionados.
4. Confira temperatura mínima, máxima e tolerância. Para avaliar um alvo de 60 °C, informe o alvo nos dois limites e a tolerância prevista no protocolo, ou informe diretamente a faixa de aceitação definida.
5. Na secadora, preencha início e duração/fim dos três períodos em vazio e dos três com carga. Os períodos devem ser independentes e conter leituras válidas.
6. Gere o relatório técnico. Para o interpretativo, gere os textos, revise-os e monte o documento final para impressão.
7. Se mudar canais, temperaturas, períodos ou dados depois da interpretação, gere os textos novamente.

Nenhum sensor selecionado, leitura inválida em canal selecionado ou período inconsistente resulta em mensagem de correção, sem emissão de aprovação artificial.

## Evidência disponível

Execução local de `_tools/test_estufa_secadora_20260921.js`: **66 testes aprovados, 126 emissões simuladas e 190 construções de gráficos**.

Cobertura: 1/3/4/6/8/12 sensores; canais alternados S1/S3/S5/S8; quantidade de canais disponíveis reduzida; temperaturas de 50/60/80/100 °C; durações de 10/30/60 minutos e incubação de 24 horas; resultado aprovado, com alerta e reprovado; indicadores de esterilização aprovados/reprovados; arquivos único/individuais; ausência de leitura; nenhuma seleção; sobreposição de períodos; mudança após interpretação; regressão dos cálculos de 12 sensores contra o motor anterior.

`_tools/test_estufa_ui_20260921.js`: verificações do DOM real com jsdom, incluindo seleção, arquivo preservado, perfis, campos, duração e payload.

Artefatos: `backups/ESTUFA_SECADORA_20260921/evidencias/`. Contêm JSON dos resultados, estruturas de planilhas e HTML interpretativos sintéticos.

**Limite da evidência:** parser, motor, montagem de planilhas/gráficos, contexto e template reais foram executados localmente. Sheets, Drive e resposta da IA foram simulados. Não é prova de emissão autenticada no Google, do texto efetivamente devolvido pelo modelo ou da paginação/renderização final dos gráficos no Sheets. Não foram gerados registros fictícios de clientes em produção.

## Arquivos e retomada

- Backup inicial: `backups/ESTUFA_SECADORA_20260921/original/`.
- Backup remoto imediatamente anterior: `backups/ESTUFA_SECADORA_20260921/remote-before/`.
- Pacote de publicação: `backups/ESTUFA_SECADORA_20260921/stage/`.
- Lista dos dez arquivos alterados/adicionados: `backups/ESTUFA_SECADORA_20260921/arquivos-alterados.json`.
- Projeto Apps Script: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.
- Versão anterior de produção: **279**. Alterações limitadas a Estufa/Banho e novo perfil; sem alteração de dados cadastrais ou rotinas de setup.
- Rollback: reatribuir a implantação de produção à versão 279; restaurar HEAD somente a partir do backup, conferindo eventuais mudanças posteriores.

## Publicação

- `clasp push`: 192 arquivos enviados ao HEAD/DEV, às 22:46 (horário local registrado pela ferramenta).
- Novo pull remoto: 192 arquivos comparados, nenhuma divergência com o pacote testado; evidência em `verificacao-remota.json`.
- Versão imutável **280** criada e aplicada à implantação habitual `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`.
- `clasp deployments` confirmou produção em 280.
- GET do portal em produção: HTTP 200, conteúdo do portal presente. Evidência: `http-producao.json`.
- GET do DEV: HTTP 200 com solicitação de login Google. Não houve sessão autenticada para emissão real nos serviços Google. **Pendente: emissão autenticada de um caso conhecido nos dois relatórios, revisão do texto efetivo da IA e conferência da impressão final.** Os testes locais e a publicação não substituem essa verificação.
