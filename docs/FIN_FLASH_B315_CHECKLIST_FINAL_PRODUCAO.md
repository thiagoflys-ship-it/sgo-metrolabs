# FIN Flash - B.3.15 - Checklist Final Producao

Funcao: `AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR`

Objetivo: consolidar o estado final FIN Flash producao antes de qualquer deploy.

Execucao manual:

```text
AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR
```

Valida:

- DB FIN PROD;
- lotes Flash;
- extratos;
- conciliacoes;
- pendencias;
- logs;
- documentos;
- contagens por aba.

Status final:

- `PRONTO_PARA_DEPLOY`
- `BLOQUEADO_COM_PENDENCIAS`

Deploy WebApp producao continua proibido ate aprovacao manual explicita depois
do JSON final.
