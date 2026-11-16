# Clientes, unidades e vínculos — implementação de 17/09/2026

Autorização: “vamos começar”, após a proposta de revisão dos cadastros e gestão dos vínculos. Trabalho limitado ao portal CNPJ. O projeto futuro de gestão operacional não foi iniciado.

**Status atual: publicado na versão 274**, após a continuidade solicitada por “vamos prosseguir”. Mantido o deployment e a URL existentes. Antes da publicação, os 186 arquivos remotos foram comparados com a versão testada, sem divergências. Consulta posterior confirmou o deployment em `@274`; leitura HTTP retornou 200, título `PORTAL SGO+ VERSÃO CNPJ` e presença do código do novo painel. Validação visual autenticada e confirmação de escrita de homologação ainda pendentes; a leitura HTTP não comprova essas operações.

[Abrir portal publicado](https://script.google.com/macros/s/AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA/exec).

Versão anterior disponível para reversão: **273**. Reversão de código consiste em apontar esse mesmo deployment para a versão anterior; isso não desfaz alterações cadastrais que usuários venham a confirmar. Nenhum vínculo ou cadastro real foi alterado pelos procedimentos de publicação. Cópia remota imediatamente anterior à publicação: `backups/VINCULOS_PREPUBLICACAO_20260917`.

Complemento enviado às 19:37 do mesmo dia: proteções de reativação e transferência, com 39 testes de backend e 6 de interface aprovados. Nova leitura dos 186 arquivos confirmou o conteúdo enviado. Base anterior ao complemento preservada em `backups/VINCULOS_CONTINUACAO_REMOTE_20260917`. Nenhum deployment de produção foi atualizado nesta continuação.

[Abrir DEV](https://script.google.com/macros/s/AKfycbyWt7ZTH1YcOTeX6vL3UIX6BFuqbCLvaAD4KUG7BE-x/dev). Acesso restrito a contas com permissão de edição do projeto Apps Script.

## Entrega

- Consulta preventiva por nome/CNPJ nos formulários de clientes e unidades, no computador e no celular. Mostra cadastros existentes, unidades associadas e cliente responsável.
- Novo cliente cria sua unidade principal por padrão. O mesmo CNPJ em cliente e unidade é permitido. Pode-se desmarcar essa criação para cadastrar um agrupador. Uma unidade já existente é identificada e não é duplicada automaticamente.
- Painel acessível em Clientes e Unidades: cadastro, proprietário, filhos, diagnóstico, referências nos módulos e histórico das alterações do gestor.
- Gestor pode conferir e confirmar transferências, desvinculações, consolidações, inativação, reativação e exclusão. A edição cadastral abre o formulário existente.
- A prévia mostra origem, destino, campos afetados, histórico preservado e impedimentos. Exige motivo. A confirmação fica vinculada à sessão, expira em dez minutos e rejeita dados modificados depois da prévia.
- Vínculos e auditoria são gravados numa única chamada `spreadsheets.batchUpdate`. Confirmações repetidas usam o identificador da operação para evitar reaplicação.
- Transferência de unidade acompanha seus equipamentos e os mapeamentos Auvo correspondentes. IDs e QR tokens são preservados. Documentos e atendimentos anteriores mantêm o cliente original.
- Desvinculação deixa o registro pendente; novas emissões exigem cliente/unidade/equipamento ativos e coerentes. Exclusão é impedida quando há dependências; consolidação mantém a origem inativa para preservar referências históricas.
- Inventário e histórico Auvo de usuários CLIENTE filtram também o proprietário do documento/atendimento. Transferir equipamento não concede acesso aos registros do cliente anterior.
- Seletores compartilhados consultam as unidades ativas do cliente; digitar outro nome limpa o ID selecionado anteriormente. Consultas atrasadas em equipamentos/documentos não substituem uma seleção mais recente.
- Auvo separa filiais por vínculos já definidos no portal, mesmo com a mesma raiz de CNPJ. Cadastros novos em grupos ambíguos exigem definição de proprietário.

## Áreas integradas

Clientes, Unidades, Equipamentos, Documentos, Inventário, Certificado de Calibração, NR-13 e integrações Auvo. A camada de escrita valida as referências das tabelas cadastrais/documentais correspondentes. Outros módulos que apenas incorporam texto ou snapshots não são convertidos automaticamente para novos cadastros: documentos emitidos permanecem históricos. Referências encontradas em tabelas sem regra de transferência conhecida impedem a alteração e indicam a tabela para revisão.

## Validação executada

- `_tools/test_vinculos_20260917.js`: 39 testes, com as implementações reais em VM e serviços Apps Script simulados. Inclui criação, CNPJ com zero, compensação de erro, permissões, prévia, concorrência, confirmação repetida, auditoria, transferência, desvinculação, consolidação de clientes/unidades/equipamentos, exclusão, emissão com vínculo antigo, isolamento de histórico e Auvo. A continuação acrescentou bloqueios de reativação de cliente com CNPJ ativo duplicado e transferência que introduza unidade homônima no destino.
- `_tools/test_ui_vinculos_20260917.js`: 6 testes dos handlers reais, incluindo respostas atrasadas, limpeza do ID antigo, elemento removido e escape de conteúdo.
- `_tools/test_regressao_vinculos_20260917.js`: 16 testes de CNPJ/sintaxe; 22 de calibração, com reprocessamento local de 90 snapshots; 18 verificações de frota; 2 grupos de testes de relatório/interface Auvo.
- Sintaxe dos arquivos JavaScript e scripts HTML, inclusive conteúdos de módulos embutidos.

Os testes automatizados não substituem a validação visual autenticada no DEV nem comprovam a chamada de gravação contra o serviço Google real. Não foi feita transferência/exclusão de cadastro real durante a implementação.

Na continuação autorizada por “pode continuar”, foram tentadas duas verificações remotas sem escrita: o endereço DEV redirecionou para `accounts.google.com` (login Google) e `clasp run vinculosPainel` sem sessão retornou “Unable to run script function. Please make sure you have permission to run the script function.” Isso não é resultado de teste do painel: a execução autenticada permanece pendente. Não se criaram sessões artificiais nem se alteraram permissões do portal para contornar o login.

## Configuração e cópias

- Projeto: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.
- Fonte local: `apps-script-imports/portal_sgo_versao_cnpj_db`.
- Base remota preservada: `backups/VINCULOS_REMOTE_20260917`.
- Segunda consulta antes do envio: `backups/VINCULOS_PREPUSH_20260917`; sem divergências em relação à base.
- Trabalho preparado: `backups/VINCULOS_STAGE_20260917`; conferência após envio: `backups/VINCULOS_VERIFICADO_20260917`.
- Arquivos locais anteriores: `backups/VINCULOS_LOCAL_ANTES_20260917`.
- Manifesto das alterações: `backups/VINCULOS_MANIFEST_20260917.json`.
- 18 arquivos alterados/adicionados. Acrescentado serviço avançado Sheets v4 no manifesto; mantidos os mesmos escopos OAuth.
- Auditoria criada na primeira confirmação: `SYS_VINCULOS_AUDITORIA`.

O DEV deste projeto usa o mesmo banco configurado para o portal. Abrir o painel e conferir uma prévia são leituras; confirmar alterações ou salvar cadastros modifica esse banco. Testes de escrita devem usar cadastros específicos de homologação e uma decisão explícita sobre a alteração.

## Validação humana antes da publicação

1. Abrir o DEV com usuário interno e entrar em Clientes. Conferir a consulta por `08562523000133` e `44.649.812/0370-58`.
2. No painel, selecionar o cliente e a unidade Pinto de Azevedo e conferir o proprietário atual, seus equipamentos e referências.
3. Testar criação de cliente/unidade principal com cadastro de homologação, além do agrupador sem unidade automática. Repetir tentativa e conferir a identificação do cadastro existente.
4. Com GESTOR, conferir uma transferência de homologação; confirmar somente após revisar origem/destino e impacto. Conferir auditoria, equipamentos, seletores e mapeamentos Auvo. Com TÉCNICO, conferir que ações de gestor não ficam disponíveis.
5. Validar o fluxo completo de seleção e geração no Certificado de Calibração e NR-13, usando dados de homologação.
6. Conferir navegação e edição em computador/celular. Reabrir telas que estavam abertas antes de uma mudança de vínculo.
7. Validar a chamada de gravação Sheets. Em projeto Cloud padrão, o serviço avançado habilita a API; em projeto Cloud próprio, pode ser necessário habilitar Google Sheets API no projeto correspondente. Falha da API não deve ser tratada como confirmação de mudança.
8. Publicar uma nova versão no deployment existente somente após validar o DEV.

## Decisão pendente: Pinto de Azevedo

A unidade `526bc156-b901-43e3-a4f6-841d27b65980`, CNPJ `44.649.812/0370-58`, permanece vinculada ao cliente `642bfc2b-6081-4d46-8fd4-4e76e5ce5083`, conforme o diagnóstico anterior. Não foi transferida automaticamente para `ca7f8bf8-8392-4473-a185-ed6b91831d35` nem para outro agrupador. O gestor deve decidir se permanece no grupo atual ou passa a outro cliente e conferir essa decisão no painel.

Referência da gravação atômica: [Google Sheets — batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).
