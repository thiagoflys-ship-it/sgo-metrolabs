# 12 - Planejamento CME

## Para que serve

O Planejamento CME ajuda a montar o planejamento técnico de insumos, sensores e ensaios para Central de Material e Esterilizacao. Ele organiza dados do cliente, equipamento, venda realizada, receitas e resultado esperado.

## Etapa 1 - Dados do cliente

Preencha:

- `CNPJ`
- `Razão social`
- `Logradouro`
- `Bairro`
- `Cidade`
- `UF`

Use o CNPJ para buscar dados quando o sistema oferecer essa opção. Depois confira se tudo corresponde ao cliente certo.

## Etapa 2 - Dados do equipamento

Preencha:

- `Tipo de equipamento`
- `Tipo de processo`
- `Marca`
- `Modelo`
- `Número de série`
- `Volume`
- `Vácuo`, quando aplicável

Esses dados definem o tipo de planejamento. Uma autoclave, uma lavadora e outro equipamento podem exigir insumos e critérios diferentes.

## Etapa 3 - O que foi vendido

Marque os itens contratados, como:

- `QI`
- `QO`
- `QD`
- `Bowie-Dick`

Marque apenas o que realmente foi vendido. Se marcar a mais, o planejamento pode pedir insumo desnecessario. Se marcar a menos, pode faltar item na execucao.

## Etapa 4 - Receitas

1. Informe o nome da receita ou ciclo.
2. Clique em `Adicionar`.
3. Repita para cada receita.
4. Clique em `Calcular`.

Use nomes que a equipe reconheca em campo. Exemplo: ciclo instrumental, ciclo textil, ciclo flash, ciclo prion ou nomenclatura do cliente.

## Etapa 5 - Resultado

A tela apresenta indicadores e resultado com sensores, BI, IQ, Bowie-Dick, prion, cavitacao, limpeza e outros itens conforme o equipamento.

Revise:

- Quantidade de sensores.
- Quantidade de indicadores.
- Necessidade de BI/IQ.
- Necessidade de Bowie-Dick.
- Observações tecnicas.
- Resultado por receita.

## Botoes da etapa final

- `Gerar Planejamento`: cria o documento principal com o planejamento calculado.
- `Gerar Justificativa + ERU`: cria documento explicando tecnicamente a escolha e o uso dos recursos/insumos.
- `Abrir WhatsApp`: prepara uma mensagem para enviar o resumo ao cliente ou responsável.

Use primeiro o cálculo/resultado. Depois gere documentos. O WhatsApp deve ser usado por ultimo, quando tudo já estiver revisado.
## Gerar planejamento

1. Revise todas as etapas.
2. Preencha observações, se necessario.
3. Use `Refinar IA` somente para melhorar texto, não para mudar critério técnico sem revisão.
4. Clique em `Gerar Planejamento`.
5. Confira o documento gerado.

## Gerar justificativa e ERU

Use quando precisar explicar tecnicamente o planejamento, a escolha de insumos ou o racional usado. Confira texto antes de enviar.

## Enviar por WhatsApp

Antes de enviar:

1. Confira cliente.
2. Confira equipamento.
3. Confira insumos.
4. Confira se o destinatario e correto.

## Problemas comuns

### Resultado parece exagerado

Confira se foram marcados itens vendidos a mais ou receitas duplicadas.

### Faltou insumo

Confira se QI/QO/QD/Bowie-Dick ou o tipo de processo foi marcado corretamente.

### Planejamento não gera

Veja se todas as etapas obrigatorias foram preenchidas e se existe pelo menos uma receita cadastrada.


