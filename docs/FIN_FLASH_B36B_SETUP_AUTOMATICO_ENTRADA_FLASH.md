# FIN Flash - B.3.6B - Setup automatico da entrada Flash

Objetivo: configurar e carregar a entrada real do Flash em producao na aba
temporaria `TMP_IMPORT_EXTRATO_FLASH`, sem tocar nas abas oficiais FIN.

Funcoes publicas:

- `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`
- `CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO`
- `AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR`

Fluxo recomendado:

1. Converter o XLSX real do Flash para Google Sheets.
2. Copiar o ID da planilha Google Sheets convertida.
3. Confirmar o nome exato da aba fonte.
4. Preencher no codigo, dentro de
   `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`, o bloco:

```javascript
var CONFIG = {
  FIN_FLASH_FONTE_TIPO: "GOOGLE_SHEETS",
  FIN_FLASH_SOURCE_SPREADSHEET_ID: "<ID_REAL>",
  FIN_FLASH_SOURCE_SHEET_NAME: "<ABA_REAL>",
  FIN_FLASH_XLSX_NOME_ESPERADO: "<NOME_DO_ARQUIVO>",
  FIN_FLASH_IMPORTACAO_MODO: "TMP_ONLY",
  FIN_FLASH_ABA_TMP: "TMP_IMPORT_EXTRATO_FLASH"
};
```

Configuracao atual da fonte real:

- XLSX local: `_evidencias/FIN11/extrato_flash_modelo/extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx`
- Pasta Drive fonte: `SGO_FIN_FLASH_FONTES_PROD`
- ID da pasta Drive fonte: `1syoQZ0F-2H6ubB3fAuajugZqwzNNAoRi`
- Planilha Google Sheets convertida:
  `1aJGp7AM0PR5ry8CPONcsRhqXg0_ZZKvHbq6irwHU1GU`
- Nome da planilha convertida:
  `FONTE_FLASH_PROD_extrato-do-colaborador-2026-05-10-ate-2026-06-10`
- Aba fonte: `Sheet1`
- Nome esperado do XLSX:
  `extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx`

5. Publicar no Apps Script producao com `clasp push`, sem `--force`.
6. Executar manualmente
   `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`.
7. Executar manualmente
   `CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO`.
8. Executar manualmente
   `AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR`.
9. Se aprovado, executar `DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR`.

PENDENTE DE INFORMACAO REAL

- `FIN_FLASH_SOURCE_SPREADSHEET_ID` preenchido com a planilha convertida.
- `FIN_FLASH_SOURCE_SHEET_NAME` preenchido com `Sheet1`.
- `FIN_FLASH_XLSX_NOME_ESPERADO` preenchido com o nome real do XLSX.
- Se algum desses valores for removido ou ficar vazio, a configuracao deve
  bloquear com seguranca.

Execucao manual apos publicacao:

1. Executar manualmente
   `CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO`.
2. Executar manualmente
   `CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO`.
3. Executar manualmente
   `AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR`.
4. Executar manualmente `DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR`.

Propriedades configuradas somente apos validacao:

- `FIN_FLASH_FONTE_TIPO`
- `FIN_FLASH_XLSX_NOME_ESPERADO`
- `FIN_FLASH_IMPORTACAO_MODO`
- `FIN_FLASH_ABA_TMP`
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
- `SOURCE_SHEET_NAME_NAO_CONFIGURADO`: fonte Google Sheets ainda sem nome da aba.
- `XLSX_NOME_ESPERADO_NAO_CONFIGURADO`: nome do XLSX real ainda nao informado.
- `MAPEAMENTO_COLUNAS_FLASH_INSUFICIENTE`: headers da fonte nao puderam ser
  mapeados para `DATA`, `DESCRICAO`, `VALOR`, `TIPO`, `PESSOA`,
  `CARTAO_FINAL`.
- `TMP_IMPORT_EXTRATO_FLASH_JA_POSSUI_DADOS`: a aba temporaria ja tem dados e
  nao sera limpa automaticamente.
- `HEADERS_TMP_FLASH_INVALIDOS`: headers da aba temporaria nao conferem com
  `DATA`, `DESCRICAO`, `VALOR`, `TIPO`, `PESSOA`, `CARTAO_FINAL`.

Mapeamento tolerante de headers:

- `DATA`: `DATA`, `DATA DA TRANSACAO`, `DATA_TRANSACAO`, `DATA TRANSACAO`,
  `DATA/HORA`, `DATA E HORA`.
- `DESCRICAO`: `DESCRICAO`, `DESCRICAO DA TRANSACAO`, `ESTABELECIMENTO`,
  `HISTORICO`, `MOVIMENTACAO`, `MERCHANT`.
- `VALOR`: `VALOR`, `VALOR R$`, `VALOR_TRANSACAO`,
  `VALOR DA TRANSACAO`, `AMOUNT`.
- `TIPO`: `TIPO`, `TIPO TRANSACAO`, `TIPO DA TRANSACAO`, `CATEGORIA`,
  `OPERACAO`, `PAGAMENTO`, `PRESTACAO DE CONTAS`.
- `PESSOA`: `PESSOA`, `PORTADOR`, `USUARIO`, `FUNCIONARIO`, `NOME`.
- `CARTAO_FINAL`: `CARTAO_FINAL`, `CARTAO FINAL`, `FINAL CARTAO`,
  `FINAL DO CARTAO`, `ULTIMOS 4`, `PAGAMENTO`, `CARTAO`.

Headers detectados na fonte convertida:

- `Data` -> `DATA`
- `Movimentacao` -> `DESCRICAO`
- `Valor` -> `VALOR`
- `Pessoa` -> `PESSOA`
- `Pagamento` -> `TIPO` e extracao de `CARTAO_FINAL`
- `Prestacao de contas` -> alias aceito para `TIPO`, se necessario

Normalizacoes aplicadas na carga:

- Headers sao comparados sem acento, em maiusculo e sem espacos extras.
- `VALOR` aceita numero ou texto com `R$`, ponto e virgula brasileira.
- `CARTAO_FINAL` extrai os ultimos 4 digitos se a origem vier com texto maior.
- `DATA` e preservada como veio da fonte; se estiver vazia, a linha entra como
  invalida.
- `PESSOA` nao e mascarada nem inventada.

Proibido nesta etapa: importacao real, conciliacao real, geracao real de
pendencias, deploy WebApp, `clasp push --force`, limpeza automatica da TMP e
alteracao no DEV.
