# 07 - Módulos Técnicos por Iframe

## O que e um iframe

Iframe e quando o portal abre outro sistema dentro da própria tela. Parece um módulo do portal, mas por dentro ele pode ser um projeto separado. Por isso alguns botões, abas e carregamentos podem ter comportamento diferente.

## Módulos técnicos encontrados

- `Autoclave`: abre sistemas de template e relatório de auditoria.
- `Lavadoras`: abre sistemas de template e relatório de auditoria.
- `Planejamento CME`: abre o sistema Metrolabs Planejamento.
- `Carta / Relatório de Conformidade`: abre o gerador de carta e consulta de documentos.

## Abas e etapas internas

- Autoclave e Lavadoras trabalham com rotinas de preparo de template e geracao de relatório/auditoria. Leia os manuais especificos antes de usar.
- Planejamento CME trabalha por etapas: cliente, equipamento, servicos vendidos, receitas e resultado.
- Carta / Relatório de Conformidade trabalha por etapas: cliente, equipamento, escopo/status, processo, insumos e conclusão. Também possui consulta de documentos gerados.
## Como usar com seguranca

1. Abra o módulo pelo menu lateral do portal.
2. Aguarde o iframe carregar completamente.
3. Se houver abas internas, escolha a aba correta.
4. Preencha os campos de cima para baixo.
5. Antes de gerar documento, revise cliente, CNPJ, equipamento e datas.
6. Se a tela parecer em branco, atualize a pagina ou tente abrir novamente.

## Quando a tela muda de visual

Isso e esperado em módulos por iframe. Cada sistema pode ter cabecalho, botões e abas próprias. O portal principal continua sendo a moldura, mas o conteúdo interno pertence a outro projeto.

## Problemas comuns

### O módulo não abre

Atualize a pagina. Se continuar, pode haver problema no projeto externo ou permissão de Apps Script.

### Apareceu erro de autorização

Entre com a conta Google correta. Se o erro persistir, chame suporte para verificar permissão do script.

### Não sei se estou no portal ou no sistema interno

Se você ainda vê o menu lateral do SGO+, está dentro do portal. A tela central pode ser o sistema interno.

## Regra de ouro

Nos módulos técnicos, não gere relatório oficial sem revisar o arquivo de entrada, o equipamento e o status técnico final.


