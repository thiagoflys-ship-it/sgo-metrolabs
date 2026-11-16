# 11 - Lavadora - Relatório de Auditoria

## Para que serve

Este módulo analisa o ciclo de lavadora/termodesinfectora com base nos dados coletados. Ele ajuda a verificar temperatura, tempo, A0 quando aplicável, estabilidade e atendimento aos critérios técnicos.

## Antes de comecar

Tenha o arquivo correto do ciclo, template preenchido e critério de avaliação definido. Não misture arquivo de teste, arquivo de outro equipamento ou arquivo incompleto.

## Campos e ajustes comuns

- `Cliente / Instituição`, `CNPJ`, `Unidade`: identificação do local.
- `Receita / Programa`: programa executado.
- `Tipo de Ensaio`: auditoria, qualificação ou rotina.
- `Ciclo Nº`: número do ciclo.
- `TAG`, `Marca`, `Modelo`, `Série`: equipamento.
- `Responsável Técnico`, `Operador`: responsaveis.
- `Temperatura alvo`: valor esperado.
- `Quantidade de sensores`: sensores usados.
- `Offset temperatura`, `Offset A0` ou `Offset tempo`: ajustes técnicos autorizados.
- `Tolerancias`: limites permitidos.
- `Janela manual`: usada quando o sistema não identifica automaticamente o trecho correto.

## Como gerar o relatório

1. Abra `Lavadoras`.
2. Entre na aba de relatório/auditoria.
3. Informe o arquivo por upload, link ou File ID.
4. Clique em `Preview`.
5. Confira se os sensores foram lidos.
6. Verifique datas, horarios, grafico e janela do ciclo.
7. Ajuste parametros somente com base técnica.
8. Clique em `Gerar Relatório`.

## Como interpretar o resultado

Resultado aprovado indica que o ciclo atendeu aos critérios configurados. Resultado com ressalvas exige leitura técnica. Resultado reprovado não deve ser ignorado: revise dados, arquivo, sensores e parametros.

## Problemas comuns

### A0 não aparece ou fica estranho

Confira se a temperatura e o tempo foram lidos corretamente e se o critério de cálculo está adequado ao ciclo.

### O sistema pegou a janela errada

Use a janela manual somente depois de entender onde o ciclo real comeca e termina.

### Grafico parece incompleto

O arquivo pode estar cortado ou com exportacao errada. Gere nova exportacao do datalogger.

