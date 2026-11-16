# Correção de Frota — Portal SGO+ CNPJ/DB — 13/09/2026

## Projeto e escopo

Projeto: `apps-script-imports/portal_sgo_versao_cnpj_db` (não o SGO da raiz).
Arquivos alterados: `SGO_Frota_Main.js`, `SGO_Frota_ConteudoModulo.js` e `JS_Core.html`.

O erro “Selecione o condutor” foi localizado na API de retirada. O mobile mostrava o nome do login em um input desabilitado, mas não enviava `condutorId`. O servidor exigia seleção explícita para gestores. As duas interfaces também limpavam/abandonavam o formulário antes de o servidor confirmar o registro; falhas apareciam apenas em toast. O dashboard principal tinha alertas de manutenção, mas não um quadro de disponibilidade e responsável.

## Alterações

- API de contexto operacional fornece o condutor vinculado à sessão e as opções permitidas ao perfil. Gestores podem escolher outro condutor ativo; na ausência de seleção, o servidor usa seu vínculo, se existente. Para os demais usuários, a API mantém a identidade vinculada, independentemente do ID enviado pelo navegador. Não há associação automática por nome.
- Condutor inexistente/inativo é recusado. Login sem vínculo recebe uma indicação explícita; a correção não inventa vínculos nem altera cadastros existentes.
- Retirada e devolução preservam campos, checklist e fotos diante de falha. A interface aguarda confirmação antes de limpar o formulário ou navegar. Há proteção contra envio duplicado na interface e conferência de movimentação aberta dentro do lock no servidor.
- A projeção de disponibilidade cruza cadastro, movimentações abertas e condutores. Uma movimentação em andamento prevalece sobre um cadastro incorretamente marcado ATIVO. O dashboard desktop, a home mobile e o módulo Frota mostram veículos disponíveis/em uso e o responsável pela retirada.
- Atualização automática a cada 30 segundos enquanto o painel estiver montado e após confirmação de uma operação. A lista de devoluções acompanha a projeção, sem redesenhar checklists em edição. Respostas antigas de consultas são descartadas.
- A consulta periódica não executa o bootstrap que reformata as colunas. As operações existentes continuam provisionando as tabelas.
- `SpreadsheetApp.flush()` ocorre antes de liberar o lock das movimentações.

## Validação

Comando: `node _tools/test_frota_20260913.js`.

18 verificações passaram: gestor com identificação automática, seleção autorizada, identidade de staff, vínculo ausente, condutor inválido/inativo, retirada e responsável no painel, retirada duplicada, cadastro divergente, corrida dentro do lock, devolução, KM regressivo, checklist inválido, veículo inativo, contexto por perfil, envio concorrente, falha/reenvio e comportamento dos handlers reais mobile/desktop.

Sintaxe validada no backend, JS_Core e script desktop extraído da string do módulo. Os testes usam dados simulados; não criam retiradas na planilha real e não substituem validação no navegador autenticado.

## Preservação e implantação

Backup anterior: `backups/PORTAL_SGO_FROTA_PRE_CORRECAO_20260913`.
Cópia do código remoto: `backups/PORTAL_SGO_FROTA_REMOTE_20260913`.
Os três arquivos anteriores à edição coincidiram com o remoto, normalizando apenas finais de linha.
Preparação do envio: `backups/PORTAL_SGO_FROTA_DEV_STAGE_20260913`, baseada integralmente nos 180 arquivos remotos, com substituição apenas dos três arquivos alterados. Isso preserva alterações remotas de outros módulos.

Envio para HEAD/desenvolvimento concluído em 13/09/2026. Uma segunda leitura remota em `backups/PORTAL_SGO_FROTA_VERIFICACAO_20260913` conferiu os 180 arquivos: somente os três previstos diferem do backup original; nenhuma divergência em relação ao conteúdo enviado. Não foi criada versão nem atualizada implantação publicada.

Teste: https://script.google.com/macros/s/AKfycbyWt7ZTH1YcOTeX6vL3UIX6BFuqbCLvaAD4KUG7BE-x/dev (requer conta com acesso ao projeto).

Não foi autorizada atualização de versão publicada. A validação humana deve cobrir login de gestor e de condutor, retirada com foto/checklist, visibilidade em outro dispositivo, devolução e atualização da disponibilidade. Vínculos ausentes precisam de cadastro pelo gestor. Uma linha marcada EM_USO sem movimentação identificável continua indisponível; não é liberada silenciosamente.
