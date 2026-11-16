# Correção do cabeçalho do histórico de padrões — 21/09/2026

Relato: ao gerar inventário, `Error: Aba sem cabeçalho: PADROES_DOCUMENTOS_EMITIDOS`.

O bootstrap reutilizava uma rotina que retornava imediatamente quando a aba já existia. Assim, uma aba criada sem cabeçalho não era recuperada. Uma interrupção anterior é uma hipótese para a origem, não confirmada por logs.

## Alteração

`SGO_Padroes_Documentos.js`: bootstrap específico, sob lock, para `PADROES_CONTROLE_DOCUMENTAL` e `PADROES_DOCUMENTOS_EMITIDOS`.

- Aba ausente: criação e cabeçalho no mesmo batch da API Sheets.
- Aba completamente vazia: escreve os cabeçalhos e invalida caches.
- Aba válida, inclusive com colunas reordenadas: preserva sem gravar.
- Dados sem cabeçalho, estrutura parcial ou cabeçalhos necessários duplicados: bloqueia com orientação, sem adivinhar ou sobrescrever dados.
- Leitura inicial do módulo permanece sem bootstrap. Não executa `setupSGO()`.

A garantia de aplicação conjunta do batch segue a [documentação oficial do Sheets](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).

## Validação e retomada

37 testes locais aprovados: 10 da implementação real de preparação das abas, 18 de backend documental e 9 de abertura. Serviços externos simulados; esses testes não confirmam a emissão autenticada no portal.

190 arquivos do envio conferidos por leitura remota; somente `SGO_Padroes_Documentos.js` mudou. Backups em `backups/PADROES_CABECALHO_{REMOTE,STAGE,VERIFICADO}_20260921` e original/resultado em `backups/PADROES_CABECALHO_20260921`.

Versão **278 publicada**, substitui 277 no deployment existente `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`. Atualizar com Ctrl+F5 e repetir a geração. A recuperação ocorre nessa nova tentativa; nenhuma planilha real foi reparada pelos testes locais. A emissão autenticada continua pendente de confirmação pelo usuário.
