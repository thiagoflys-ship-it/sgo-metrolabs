# Interface e manual de Clientes e Unidades — 17/09/2026

Autorização: “vamos seguir”, após aprovação da proposta de painel lateral, cartões, manual integrado e carregamento visível.

**Publicado na versão 275**, no deployment e endereço existentes. Consulta posterior confirmou `@275`; leitura da página retornou HTTP 200, presença do manual e da busca lateral, sem mensagens de ReferenceError/SyntaxError detectadas no HTML. Reversão de código disponível pela versão 274. A verificação HTTP não substitui teste autenticado da equipe.

## Alterações

- Painel Cadastros e vínculos integrado à coluna de consulta, com busca por nome/CNPJ e consulta automática durante o preenchimento.
- Busca concentrada no painel: removida a duplicação visual no cabeçalho, preservando os handlers existentes.
- Cartões com situação textual, cliente responsável, unidades agrupadas e ações para abrir cadastro ou vínculos.
- Confirmação antes de abrir outro cadastro e descartar dados não salvos. Ver vínculos preserva o formulário e seleciona o registro correto no painel.
- Consulta com indicação Aguarde, descarte de respostas antigas, tratamento de erro e Tentar novamente.
- Painel expansível abaixo do formulário mobile; listagem de usuários CLIENTE preservada.
- Como usar nas telas e no painel do gestor, com seis tópicos operacionais. [Manual completo](MANUAL_CLIENTES_UNIDADES_VINCULOS.md).
- Carregamento na edição mobile de clientes/unidades e na busca dos clientes responsáveis. Operações de salvar continuam usando o overlay global existente.
- Ajustes de proporção das colunas, espaçamento, cartões e adaptação a telas estreitas, mantendo o tema do portal.

## Validação

- 13 testes DOM com os scripts reais, renderização real de Clientes e simulação das respostas Google: cartões, escape de conteúdo, agrupamento, preservação do formulário, respostas antigas, limpeza da busca, falha e repetição, manual, seleção de registro, mobile, perfil CLIENTE e encerramento do carregamento nos casos de sucesso e erro.
- 22 testes de calibração e 18 verificações de frota aprovados após a alteração em JS_Core.
- Prévia desktop renderizada e inspecionada em Edge headless com perfil isolado; imagens em `backups/UX_CADASTROS_DESKTOP2.png`. A prévia usa dados de exemplo e não comprova uma sessão autenticada do portal.
- Sem alterações em cadastros reais ou regras de transferência do backend.

Arquivos alterados: `JS_Vinculos.html`, `JS_Cadastros.html` e `JS_Core.html`.

Cópia anterior local: `backups/UX_CADASTROS_ANTES_20260917`. Base remota: `backups/UX_CADASTROS_REMOTE_20260917`. Publicação preparada em `backups/UX_CADASTROS_STAGE_20260917`, preservando os demais arquivos remotos.
