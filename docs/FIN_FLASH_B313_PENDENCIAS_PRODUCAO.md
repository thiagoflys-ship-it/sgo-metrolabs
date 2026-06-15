# FIN Flash - B.3.13/B.3.14 - Pendencias Producao

Funcoes:

- `PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR`
- `GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO`

## B.3.13 - Previa

Somente leitura. Le extratos e calcula pendencias previstas, sem gravar.

Execucao:

```text
PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR
```

JSON esperado: `executado:false`, `somenteLeitura:true`, resumo de pendencias
previstas e amostras compactas.

## B.3.14 - Geracao Real

Wrapper real autorizado, mas bloqueado enquanto rotina de producao nao estiver
homologada.

Execucao futura:

```text
GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO
```

Bloqueio atual esperado:

- `ROTINA_GERACAO_PENDENCIAS_PRODUCAO_NAO_HOMOLOGADA`

Proibido: gerar pendencias reais sem aprovacao, deploy, alteracao DEV.
