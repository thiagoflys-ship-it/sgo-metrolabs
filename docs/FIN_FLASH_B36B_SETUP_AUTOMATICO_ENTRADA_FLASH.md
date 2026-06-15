# FIN Flash - B.3.6B - Setup automatico da entrada Flash

Objetivo: configurar e carregar a entrada real do Flash em producao na aba
temporaria `TMP_IMPORT_EXTRATO_FLASH`, sem tocar nas abas oficiais FIN.

Funcoes publicas:

- `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`
- `CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO`
- `AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR`

Fluxo recomendado:

1. Converter o XLSX real do Flash para Google Sheets.
2. Preencher no codigo, dentro de
   `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`, os campos:
   `FIN_FLASH_FONTE_TIPO = "GOOGLE_SHEETS"`,
   `FIN_FLASH_SOURCE_SPREADSHEET_ID` e, se necessario,
   `FIN_FLASH_SOURCE_SHEET_NAME`.
3. Executar manualmente
   `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`.
4. Executar manualmente
   `CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO`.
5. Executar manualmente
   `AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR`.
6. Se aprovado, executar `DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR`.

Propriedades configuradas somente apos validacao:

- `FIN_FLASH_FONTE_TIPO`
- `FIN_FLASH_XLSX_FILE_ID`
- `FIN_FLASH_XLSX_NOME_ESPERADO`
- `FIN_FLASH_IMPORTACAO_MODO`
- `FIN_FLASH_ABA_TMP`
- `FIN_FLASH_PROD_DB_CONFIRMADO`
- `FIN_FLASH_SOURCE_SPREADSHEET_ID`
- `FIN_FLASH_SOURCE_SHEET_NAME`

Garantias:

- A configuracao grava apenas `PropertiesService`, quando a fonte estiver
  preenchida e validada.
- A carga grava apenas `TMP_IMPORT_EXTRATO_FLASH`.
- A carga bloqueia se `TMP_IMPORT_EXTRATO_FLASH` ja possuir dados.
- A carga nao limpa dados existentes.
- A auditoria B.3.6B e somente leitura.
- O leitor direto de XLSX fica bloqueado por
  `LEITOR_XLSX_NAO_IMPLEMENTADO_COM_SEGURANCA`.

Abas oficiais que devem permanecer sem escrita nesta etapa:

- `FIN_LOTES_EXTRATO_FLASH`
- `FIN_CARTOES_EXTRATOS`
- `FIN_CARTOES_CONCILIACAO`
- `FIN_CARTOES_PENDENCIAS`

Bloqueios comuns:

- `FONTE_TIPO_NAO_CONFIGURADO`: constantes ainda vazias na funcao de
  configuracao.
- `SOURCE_SPREADSHEET_ID_NAO_CONFIGURADO`: fonte Google Sheets ainda sem ID.
- `TMP_IMPORT_EXTRATO_FLASH_JA_POSSUI_DADOS`: a aba temporaria ja tem dados e
  nao sera limpa automaticamente.
- `HEADERS_TMP_FLASH_INVALIDOS`: headers da aba temporaria nao conferem com
  `DATA`, `DESCRICAO`, `VALOR`, `TIPO`, `PESSOA`, `CARTAO_FINAL`.

Proibido nesta etapa: importacao real, conciliacao real, geracao real de
pendencias, deploy WebApp, `clasp push --force`, limpeza automatica da TMP e
alteracao no DEV.
