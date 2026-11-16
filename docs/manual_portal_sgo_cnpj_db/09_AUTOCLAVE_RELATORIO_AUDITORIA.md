# 09 - Autoclave - Relatório de Auditoria

## Para que serve

Este módulo analisa dados de datalogger/sensores de autoclave e gera relatório técnico. Ele avalia temperatura, estabilidade, tolerancias, tempo, F0 quando aplicável e conformidade do ciclo.

## Antes de comecar

Tenha o arquivo correto do ensaio, template preenchido, dados do equipamento, parametros do ciclo e critério técnico definido. Não use arquivo de outro ciclo.

## Campos e ajustes comuns

- `Cliente / Instituição` e `CNPJ`: identificação do cliente.
- `Unidade / Endereço`: local do ensaio.
- `Receita / Programa`: ciclo analisado.
- `Tipo de Ensaio`: qualificação, auditoria, rotina ou equivalente.
- `Ciclo Nº`: número do ciclo.
- `TAG`, `Marca`, `Modelo`, `Série`: equipamento.
- `Responsável Técnico` e `Operador`: pessoas envolvidas.
- `Setpoint / Temperatura alvo`: temperatura esperada.
- `Quantidade de sensores`: sensores usados na validação.
- `Offset`: correção técnica aplicada aos sensores, quando autorizada.
- `Tolerancias`: limites aceitos para entrada, saida e estabilidade.
- `Modo de reconhecimento`: como o sistema identifica a janela do ciclo.

## Como carregar os dados

1. Abra `Autoclave`.
2. Entre em `Relatório`, `Auditoria` ou aba equivalente.
3. Escolha o modo de entrada: File ID, colar link ou upload.
4. Informe o arquivo correto.
5. Use `Preview` para conferir se a leitura funcionou.
6. Confira sensores, horarios e grafico.
7. Ajuste parametros somente se tiver critério técnico.
8. Gere o relatório.

## Como revisar o preview

Veja se todos os sensores apareceram, se a data faz sentido, se o ciclo está completo e se não há leituras quebradas. Se o preview parecer estranho, pare e confira o arquivo de origem.

## Quando usar offset

Offset serve para corrigir diferenca conhecida de sensor ou base de dados. Não deve ser usado para esconder falha de processo. Registre qualquer ajuste em observações.

## Resultado técnico

O sistema pode indicar aprovado, aprovado com ressalvas, reprovado ou alerta. Se houver reprovação, revise arquivo, parametros e critérios antes de emitir qualquer documento oficial.

## Problemas comuns

### Arquivo não carrega

Confira permissão do Drive, link, File ID e formato do arquivo.

### Sensores apareceram trocados

Confira o template e o mapeamento de sensores.

### Resultado reprovou e eu esperava aprovação

Não altere tolerancias sem justificativa. Chame o responsável técnico para avaliar.

