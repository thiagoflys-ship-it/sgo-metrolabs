# FIN Flash — B.3.9 — Plano: Base64 do XLSX Real e Preview

> Nenhuma acao executada neste documento.
> Executar somente apos B.3.8 (Rafael/908 cadastrado) e B.3.7 (baseline 0/0).

---

## AVISO DE SEGURANCA

O arquivo XLSX real esta em:

```
_evidencias/FIN11/extrato_flash_modelo/extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx
```

Este caminho esta coberto pelo .gitignore desde 2026-06-14.
**Nunca staged, nunca commitado, nunca publicado.**

A saida base64 gerada a partir deste arquivo tambem NUNCA deve ser versionada.

---

## Dados do XLSX real (confirmados)

| Campo | Valor |
|-------|-------|
| Portador | RAFAEL FAY MARQUES |
| Cartao final | 908 |
| Periodo | 2026-05-10 a 2026-06-10 |
| Total de lancamentos | 49 |
| Total de debitos | 46 |
| Total de creditos | 3 (depositos via Carteira Corporativa) |
| Soma debitos | -R$ 2.079,21 |
| Soma creditos | R$ 2.800,00 |
| Saldo liquido | R$ 720,79 |

---

## Como gerar o base64 do XLSX (somente leitura)

### Opcao 1 — Script Node.js local (recomendado)

Usar ferramenta local em `_tools/`:

**Script futuro sugerido:** `_tools/fin_flash_xlsx_to_base64_console.js`

Este script:
- Le o XLSX localmente sem internet
- Gera a string base64 no console (stdout)
- Nao salva arquivo
- Nao versiona nada
- Nao envia para nenhum servidor

O script existente `_tools/fin11_parse_flash_xlsx_preview.js` ja faz parse e pode
ser usado como referencia para a estrutura de leitura.

**Saida esperada:** string base64 no console, a ser copiada manualmente para o editor Apps Script.

### Opcao 2 — Converter via PowerShell (alternativa)

```powershell
$bytes = [System.IO.File]::ReadAllBytes("_evidencias\FIN11\extrato_flash_modelo\extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx")
$base64 = [System.Convert]::ToBase64String($bytes)
Write-Output $base64
```

A saida e impressa no console. Copiar o valor sem salvar em arquivo.

**Nao redirecionar para arquivo:** `> base64.txt` e proibido.

---

## Regras para o base64

| Regra | Motivo |
|-------|--------|
| Nao salvar .txt com base64 no projeto | Dados pessoais ficam expostos no git |
| Nao versionar a string base64 | Idem |
| Copiar do console diretamente para o editor Apps Script | Sem intermediarios |
| Nao enviar base64 via chat ao Claude | Dado sensivel nao deve transitar pelo chat |
| Usar apenas no editor do NOVO projeto producao | Nao usar no projeto DEV |

---

## Funcao alvo no Apps Script

```
finPreviewExtratoFlashXlsxV1(payload)
```

**Payload esperado:**
```javascript
{
  base64: "<string base64 do XLSX>",
  nomeArquivo: "extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx"
}
```

**Resultado esperado do preview:**
```json
{
  "success": true,
  "ok": true,
  "totalLancamentos": 49,
  "totalDebitos": 46,
  "totalCreditos": 3,
  "somaDebitos": -2079.21,
  "somaCreditos": 2800.00,
  "portador": "RAFAEL FAY MARQUES",
  "finalCartao": "908",
  "periodo": { "inicio": "2026-05-10", "fim": "2026-06-10" },
  "bloqueios": []
}
```

Se `bloqueios` nao estiver vazio: PARAR e investigar antes de prosseguir para dry-run.

---

## Pre-requisitos obrigatorios para este pacote

- [ ] B.3.6: AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR retornou BASE_LIMPA ou BASE_PRODUCAO_POSSIVEL
- [ ] B.3.7: TESTE_FLASH_CONTAGEM_SEM_GRAVAR retornou 0 lotes / 0 extratos
- [ ] B.3.8: Rafael/908 cadastrado em FIN_CARTOES de producao
- [ ] AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR com Rafael/908: totalCartoesLidos >= 1
- [ ] Script de base64 disponivel localmente
- [ ] XLSX real acessivel localmente (nao mover, nao renomear)

---

## Proximos passos apos preview OK

| Etapa | Funcao | Descricao |
|-------|--------|-----------|
| W.3 | finDryRunLoteExtratoFlashV1 | Dry-run com XLSX real — gera loteId e hash reais |
| W.4 | finPreConfirmarLoteExtratoFlashV1 | Pre-confirmacao do lote |
| W.5 | finPrepararPayloadImportacaoFlashV1 | Payload com decisoes operacionais |
| W.6 | gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR | Pacote de autorizacao |
| W.7 | auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR | Auditoria final pre-real |
| W.8 | GO/NO-GO manual | Decisao humana obrigatoria |
| W.9 | EXECUTAR_IMPORTACAO_FLASH_PRODUCAO_AUTORIZADA_MANUALMENTE | Criar em sessao separada |

**Nenhum payload DEV pode ser reutilizado:**
- Nao usar loteId `LOTE-FLASH-PREVIEW-34ABC763`
- Nao usar hash `LOGICO-971C06CE`
- Nao usar cartao final 777 ou portador USUARIO TESTE FLASH
