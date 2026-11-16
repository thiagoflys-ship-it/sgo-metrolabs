# 05 - Módulo Documentos

## Para que serve

O módulo Documentos guarda certificados, relatórios, anexos, contratos, evidencias e outros arquivos relacionados a clientes, unidades e equipamentos. Também ajuda a acompanhar vencimentos.

## Quando usar

Use sempre que precisar registrar um arquivo importante, controlar validade ou deixar uma evidencia disponível para consulta futura.

## Campos principais

- `Cliente`: instituição relacionada ao documento.
- `Unidade`: local relacionado, quando houver.
- `Equipamento`: equipamento especifico, quando o documento for técnico.
- `Tipo de documento`: certificado, relatório, contrato, ordem, outros documentos.
- `Número / Código`: identificador do documento.
- `Data de emissão`: quando foi emitido.
- `Data de validade`: quando vence, se aplicável.
- `Arquivo / link`: anexo ou URL do documento.
- `Observações`: detalhes importantes.
- `Status`: ativo, vencido, substituído ou equivalente.

## Registrar documento

1. Abra `Documentos`.
2. Clique em `+ Novo Documento`.
3. Escolha cliente e unidade.
4. Escolha equipamento se o documento for de um equipamento especifico.
5. Selecione o tipo do documento.
6. Informe número, datas e validade.
7. Anexe o arquivo ou cole o link.
8. Revise os dados.
9. Clique em `Salvar`.

## Pesquisar documento

1. Abra `Documentos`.
2. Use cliente, unidade, equipamento, tipo, número ou status.
3. Clique em `Pesquisar`.
4. Abra o registro para conferir detalhes ou acessar o arquivo.

## Controlar vencimento

Se o dashboard apontar documento vencido ou próximo do vencimento:

1. Abra `Documentos`.
2. Filtre pelo cliente ou pelo status.
3. Abra o documento.
4. Confira validade.
5. Solicite renovacao ou cadastre o documento atualizado.

## Substituir documento

Quando chegar uma versão nova, cadastre o documento novo e marque o antigo como substituído/inativo, se essa opção existir. Evite apagar histórico.

## Problemas comuns

### Arquivo não abre

Confira se o link está correto e se o usuário tem permissão no Drive ou no local onde o arquivo foi salvo.

### Documento aparece vencido, mas foi renovado

Provavelmente a nova versão ainda não foi cadastrada ou a validade antiga ficou no registro.

### Não sei qual tipo escolher

Use o tipo mais especifico. Se não existir, use `Outros Documentos` e detalhe em observações.

