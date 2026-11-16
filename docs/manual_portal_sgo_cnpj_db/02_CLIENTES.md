# 02 - Módulo Clientes

## Para que serve

Clientes e o cadastro mestre. Unidades, equipamentos, documentos e usuários de perfil cliente dependem dele.

## Campos

- `CNPJ`: identificador fiscal. Pesquise antes de criar.
- `Razão social`: nome juridico oficial.
- `Nome fantasia`: nome conhecido.
- `Endereço`: endereço principal.
- `Status`: ATIVO por padrão.
- `Contato`, `Telefone`, `E-mail`: dados para contato.

## Pesquisar cliente

1. Abra `Clientes`.
2. Digite nome ou CNPJ.
3. Clique em `Pesquisar`.
4. Confira a tabela.

## Cadastrar cliente

1. Clique em `+ Novo Cliente`.
2. Digite o CNPJ.
3. Clique em `Buscar`.
4. Confira os dados preenchidos.
5. Complete contato, telefone e e-mail.
6. Clique em `Salvar`.
7. Pesquise novamente para confirmar.

## Editar cliente

1. Pesquise o cliente.
2. Clique em `Editar`.
3. Ajuste os campos.
4. Clique em `Salvar`.

## Inativar, reativar e excluir

- `Inativar`: cliente existe, mas não deve mais ser usado em rotinas novas.
- `Reativar`: cliente volta a operar.
- `Excluir`: somente cadastro errado ou duplicado sem histórico relevante.

## Boas praticas

- Pesquise antes de criar.
- Use CNPJ como principal referencia.
- Evite abreviacoes confusas.
- Prefira inativar em vez de excluir.

## Problemas comuns

### Busca de CNPJ não funcionou
Confira o CNPJ. Se estiver certo, preencha manualmente.

### Cliente não aparece em outros módulos
Pode estar inativo.
