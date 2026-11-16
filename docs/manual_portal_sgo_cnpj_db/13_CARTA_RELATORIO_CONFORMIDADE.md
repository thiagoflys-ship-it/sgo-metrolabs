# 13 - Carta / Relatório de Conformidade

## Para que serve

Este módulo emite Carta de Conformidade Técnica e permite consultar documentos gerados. Ele deve ser usado com cuidado, porque o documento comunica uma conclusão técnica.

## Etapa 1 - Cliente

Preencha CNPJ e dados da instituição. Use busca quando disponível e confira razão social, endereço e identificação do cliente.

## Etapa 2 - Equipamento

Preencha conforme o tipo de equipamento:

- `Tipo de equipamento`
- `Marca`
- `Modelo`
- `Número de série`
- `Patrimonio / TAG`
- `Volume / Capacidade`
- `Setor`
- `Local de instalacao`
- `Faixa minima e maxima`
- `PMTA`
- `NR13`, quando aplicável
- `Classe / filtro`
- `Rotacao`
- `Temperatura de trabalho`
- `Gas`
- `Exaustao`

Nem todo campo aparece para todo equipamento. Preencha tudo que for aplicável.

## Etapa 3 - Escopo e status

Marque o escopo executado:

- `QI`
- `QO`
- `QD`
- `Inspecao`

Depois selecione o status:

- `Aprovado`
- `Aprovado com Ressalvas`
- `Reprovado`

Nunca escolha status sem conferir o resultado técnico.

## Etapa 4 - Processo

Informe receitas, ensaios e dados de processo. Para equipamentos sujeitos a NR13, confira os campos especificos antes de gerar.

## Etapa 5 - Insumos

Registre insumos usados, conforme aplicável:

- BI
- IQ
- Bowie-Dick
- Príons
- Outros indicadores ou evidencias

## Etapa 6 - Conclusao

1. Escreva a conclusão técnica.
2. Use `Refinar IA` apenas para melhorar clareza do texto.
3. Revise o texto final.
4. Gere a carta.

Se existir opção de imprimir ticket térmico ou enviar WhatsApp, revise antes de usar.

## Botoes finais

- `Voltar`: retorna para corrigir etapa anterior.
- `Refinar IA`: melhora a redação da conclusão mantendo o sentido técnico informado.
- `Avisar Cliente (WhatsApp)`: abre mensagem para comunicacao com o cliente.
- `Gerar Carta de Conformidade`: valida dados, gera PDF, salva histórico e abre o documento.

O botao de gerar carta deve ser o ultimo passo, depois de revisar status, conclusão e dados do equipamento.
## Consulta de documentos

Use a consulta para localizar documentos por cliente, CNPJ, OS, código, série ou status. Sempre confira se abriu o documento correto antes de reenviar.

## Problemas comuns

### Status não combina com conclusão

Corrija antes de gerar. Status e texto precisam dizer a mesma coisa.

### Equipamento sem série

Use TAG/patrimonio e explique em observação, se permitido. Não invente número de série.

### Cliente pediu segunda via

Use a consulta, pesquise pelo cliente/CNPJ/equipamento e reenvie o documento correto.


