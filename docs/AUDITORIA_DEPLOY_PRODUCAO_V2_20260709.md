# Auditoria de Deploy — PRODUCAO_V2 e DEV (2026-07-09)

> Documento de auditoria somente leitura. Nenhum deploy, push ou versionamento
> foi executado para gerar este documento — apenas `clasp deployments` e
> `clasp versions` (passando o `scriptId` como argumento, sem alterar nenhum
> `.clasp.json`).

## 1. Produção atual

- **Script:** PRODUCAO_V2 (`1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y`)
- **Deployment fixo:** `AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw`
- **Versão:** v56 — "FLASH.10.1-10.2 prestacoes conferencia termos documentos"
- **URL /exec:** `https://script.google.com/macros/s/AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw/exec`
- **Status:** operacional e estável. O deployment fixo bate exatamente com a
  última versão já criada nesse script (v56) — sem defasagem entre deployment
  e versão dentro do próprio script de produção.

## 2. DEV

- **Script:** DEV (`12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`)
- **Última versão:** v227
- **Status:** ambiente de teste/desenvolvimento. É onde vive o trabalho mais
  recente do repositório, incluindo o módulo isolado `FIN_FLASH_V2`
  (série V2.0 até V2.19B).

## 3. Observação

- `FIN_FLASH_V2` ainda **não foi promovido** para produção. Existe um plano de
  piloto documentado (`docs/FIN_FLASH_V2_V219_PLANO_PILOTO_PRODUCAO.md` e
  `docs/FIN_FLASH_V2_V219B_CHECKLIST_INFRA_PRODUCAO.md`), mas nenhum dos
  passos reais (criar planilha própria, configurar `DB_FIN_ID` em
  PRODUCAO_V2, push de código, rodar setup) foi executado.
- Nenhum deploy, push ou versionamento deve ser feito sem autorização
  expressa.
- O sistema em produção para uso da equipe permanece o atual: PRODUCAO_V2
  no deployment fixo v56, intocado.
