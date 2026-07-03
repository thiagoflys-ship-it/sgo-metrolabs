# FIN Flash V2.0A — API Executable: auditoria de configuração

Data: 2026-06-26.

## Escopo autorizado e preservado

Somente o projeto DEV foi consultado. Não houve produção, deploy webapp, setup,
criação de abas/usuário de teste, importação ou alteração de menu.

## Evidência

- `.clasp.json` aponta para o script DEV `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG` antes e depois.
- `clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR` retornou que o script não está publicado como API Executable.
- `clasp apis` informou que não há `projectId` GCP configurado neste projeto local.

## Pré-requisitos técnicos confirmados pelo próprio `clasp`

1. Associar o Apps Script DEV a um projeto GCP padrão.
2. Configurar um OAuth Client do tipo Desktop para a conta autorizada.
3. Declarar `executionApi` no manifesto com acesso definido conscientemente.
4. Criar deployment do tipo **API Executable** (não webapp).

Essas ações exigem a escolha de um projeto GCP e criam credenciais/configuração
externa. Elas não foram inferidas nem criadas automaticamente para evitar usar
um projeto errado ou expor execução remota além do necessário.

## Estado

O código da orquestradora está no DEV e a validação local está aprovada. A
execução remota automática permanece bloqueada apenas pela configuração externa
descrita acima.
