# FIN Flash - Status Producao

Estado atual aprovado:

- Provisionamento producao limpa aprovado.
- Setup producao limpa aprovado.
- Auditoria producao limpa B.3.5 aprovada.
- DB FIN PROD: `1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw`.
- Pasta FIN PROD: `1v3sck6YvGt0Na2vIpVy1_yLD5_9Dqkw5`.
- DB DEV bloqueado: `1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0`.

Sequencia operacional:

1. `DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR`
2. `PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR`
3. `IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO`
4. `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR`
5. `PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR`
6. `CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO`
7. `AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR`
8. `PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR`
9. `GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO`
10. `AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR`

Primeira funcao a executar agora:

```text
DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR
```

Proibido ate nova aprovacao:

- importacao real;
- conciliacao real;
- geracao real de pendencias;
- deploy WebApp;
- alteracao DEV;
- uso do DB FIN DEV como producao.
