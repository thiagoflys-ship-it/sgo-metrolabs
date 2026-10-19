# 06 - Painel Admin e Usuários

## Para que serve

O Painel Admin controla usuários, perfis, permissoes e configuracoes gerais do portal. E uma área sensivel: alteracoes aqui mudam quem consegue entrar e o que cada pessoa consegue fazer.

## Quem deve usar

Apenas administradores ou pessoas autorizadas pela diretoria/suporte. Usuário comum não deve alterar configuracoes.

## Campos comuns de usuário

- `Nome`: nome da pessoa.
- `Usuário`: login usado para entrar.
- `Senha`: senha inicial ou nova senha.
- `Perfil`: nivel de acesso.
- `Cliente vinculado`: usado quando o usuário deve ver somente dados de um cliente.
- `Status`: ativo ou inativo.
- `E-mail` e `Telefone`: contato do usuário.
- `Vínculo de trabalho` (19/10/2026): CLT, PJ ou Não informado. Mensagens do ponto só vão para quem é CLT; PJ e Não informado não recebem (o envio pulado fica registrado com o motivo). Os outros avisos chegam para todos, inclusive PJ. A lista de Usuários mostra a coluna Vínculo, o filtro "Todos os vínculos" e o número "Sem vínculo (ativos)". Editar outro campo nunca apaga o vínculo.

## Perfis mais comuns

- `Admin`: acesso amplo, incluindo usuários e configuracoes.
- `Operacional`: usa cadastros e rotinas do dia a dia.
- `Técnico`: usa módulos técnicos e relatórios.
- `Cliente`: acesso limitado aos dados do proprio cliente, quando configurado.
- `RH` (19/10/2026): vê o que um colaborador vê (Início, Minhas atividades, Avisos, Frota e o próprio farol), publica avisos (comunicados de RH), consulta o Programa de conduta de toda a equipe (sem homologar, julgar ou fechar o mês) e consulta a lista de Usuários (sem criar, editar ou excluir contas). Não acessa Chaves e senhas, Configurações, emissão de certificados, laudos e documentos técnicos, cadastros técnicos, Auvo, Painel de qualidade nem o Comercial.

Os nomes podem variar, mas a regra e a mesma: perfil define permissão.

## Cadastrar usuário

1. Abra `Painel Admin`.
2. Entre na área de usuários.
3. Clique em `+ Novo Usuário`.
4. Preencha nome, usuário e senha.
5. Escolha o perfil correto.
6. Se for usuário cliente, vincule ao cliente certo.
7. Marque como ativo.
8. Clique em `Salvar`.
9. Peca para a pessoa testar o login.

## Alterar senha

1. Pesquise o usuário.
2. Clique em `Editar`.
3. Digite a nova senha.
4. Salve.
5. Oriente a pessoa a testar logo depois.

## Inativar usuário

Use quando a pessoa saiu da empresa, mudou de funcao ou não deve mais acessar. Inativar e mais seguro que excluir, porque preserva histórico.

## Sessão travada ou ociosidade

Se um usuário não consegue entrar porque a sessão ficou presa:

1. Peça para fechar o navegador e abrir de novo.
2. Se continuar, o administrador deve verificar sessoes/configuracoes no Painel Admin.
3. Em ultimo caso, redefina senha ou inative/reative o usuário.

## Alertas globais de calibração

Somente o perfil **ADMIN** vê e altera esse quadro. Nele é possível:

- ativar ou desativar os lembretes;
- escolher GESTOR, METROLOGIA ou ambos;
- definir horário de funcionamento;
- definir intervalo e duração do balão;
- ativar o aviso vermelho central e definir sua repetição;
- escolher quantos dias antes do vencimento entram no alerta;
- editar a mensagem crítica;
- testar o alerta imediatamente.

O balão e o aviso central aparecem sobre qualquer módulo. Eles não recarregam a página nem apagam dados digitados. “Ver padrões” e “Tratar agora” levam ao módulo Certificado de Calibração. Quando os cadastros deixam de estar vencidos, próximos do vencimento ou inválidos, os avisos param automaticamente.

## Cuidados importantes

- Não compartilhe usuário e senha.
- Não de perfil Admin sem necessidade.
- Ao criar usuário cliente, confira o cliente vinculado.
- Ao desligar colaborador, inative o acesso imediatamente.
- Depois de mexer em permissoes, teste com o usuário.
