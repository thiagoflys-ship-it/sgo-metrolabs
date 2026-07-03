# FIN Flash V2.0B — Setup automático DEV

Data: 2026-06-26.

## Função

`EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV()` executa, exclusivamente no
script DEV, a pré-validação das abas V2, setup idempotente, configuração inicial,
usuário e cartões de teste, log de teste e auditoria final.

## Proteções

- bloqueia qualquer script que não seja o DEV esperado;
- verifica todos os schemas existentes antes de iniciar escrita;
- não toca em tabelas antigas Flash;
- não importa extrato, não liga menu e não altera produção;
- configura importação real e aprovação automática por IA como `NAO`;
- dados criados nesta etapa usam `AMBIENTE_TESTE = SIM`;
- usuário de teste: CPF `00000000000`, cartões FISICO `9999` e VIRTUAL `8888`.

## Resultado esperado após execução remota

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "executado": true,
  "setupExecutado": true,
  "abasCriadasOuValidadas": 12,
  "usuarioTesteCriadoOuValidado": true,
  "cartoesTesteCriadosOuValidados": true,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "todosDadosTesteComAmbienteTeste": true,
  "bloqueios": [],
  "avisos": []
}
```

## Estado

Função criada localmente; execução automática remota depende do API Executable
DEV documentado em `FIN_FLASH_V2_0A_API_EXECUTABLE_BLOQUEIO.md`.
