# FIN_FLASH_V2.6 — Documentos, Relatórios e Termo de Uso

**Aprovado em:** 2026-06-26  
**Validação formal:** 2026-06-27  
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Resumo

Camada documental do módulo FIN_FLASH_V2: relatórios de conciliação positiva e negativa, relatório de pendências por colaborador, termo de uso do Cartão Flash com aceite registrado.

## Resultado da orquestradora (clasp run) — execução formal 2026-06-27

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "relatorioPositivoGerado": true,
  "relatorioNegativoGerado": true,
  "relatorioPendenciasGerado": true,
  "termoUsoGerado": true,
  "termoAtualObtido": true,
  "aceiteTermoRegistrado": true,
  "documentosGravados": true,
  "termosGravados": true,
  "logsCriados": true,
  "todosDadosTesteComAmbienteTeste": true,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": []
}
```

Dados DEV na execução formal (2026-06-27):
- Relatório positivo: `FIN_FLASH_V2_REL_POS_7d8db473-...`, 10 conciliações aprovadas, R$ 300,00.
- Relatório negativo: `FIN_FLASH_V2_REL_NEG_8d9af897-...`, 77 pendências, R$ 2.500,00.
- Relatório de pendências: `FIN_FLASH_V2_REL_PEND_34a475ff-...`, 2 colaboradores, 150 pendências.
- Termo: `FIN_FLASH_V2_TERMO_FIN_FLASH_V2_TERMO_001`, versão `FIN-FLASH-V2-TERMO-001`, STATUS=VIGENTE.
- Termo atual (somente leitura): `somenteLeitura:true`, 8 cláusulas retornadas.
- Aceite: `FIN_FLASH_V2_ACEITE_5gNobhfR9YuzqjShfoUui7Zzwd_KZXXj`, CPF `00000000000` / `teste.flash@metrolabs.local`, STATUS=ACEITO.

## Funções criadas

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_POSITIVA_DEV(opcoes)` | Relatório de conciliações aprovadas (CONCILIADO / CONCILIADO_AUTOMATICO) |
| `FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_NEGATIVA_DEV(opcoes)` | Relatório de conciliações com pendências e recomendações de ação |
| `FIN_FLASH_V2_GERAR_RELATORIO_PENDENCIAS_COLABORADOR_DEV(opcoes)` | Consolidação de pendências por CPF/colaborador |
| `FIN_FLASH_V2_GERAR_TERMO_USO_CARTAO_FLASH_DEV(opcoes)` | Geração do termo de uso versão `FIN-FLASH-V2-TERMO-001` |
| `FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV()` | Retorna termo vigente para exibição/assinatura (somente leitura) |
| `FIN_FLASH_V2_REGISTRAR_ACEITE_TERMO_DEV(payload)` | Registra aceite do colaborador com CPF/e-mail validados |
| `EXECUTAR_FIN_FLASH_V2_6_TESTE_DOCUMENTOS_TERMO_DEV()` | Orquestradora automática de validação |

Constante auxiliar: `FIN_FLASH_V2_TERMO_VERSAO_ATUAL = 'FIN-FLASH-V2-TERMO-001'`  
Função interna: `FIN_FLASH_V2_termoTexto_()` — texto completo do termo de uso (8 cláusulas).

## Abas utilizadas

- `FIN_FLASH_V2_DOCUMENTOS` — todos os relatórios e referência do termo gravados aqui.
- `FIN_FLASH_V2_TERMOS` — definição vigente do termo (STATUS=VIGENTE, CONTA_ID=SISTEMA) e registros de aceite (STATUS=ACEITO).
- `FIN_FLASH_V2_LOGS` — log de auditoria para cada operação de geração/aceite.

## Termo de uso — Cláusulas

1. **Objeto** — cartão Flash para uso exclusivo em serviço, vinculado ao CPF.
2. **Uso exclusivo em serviço** — vedado para fins pessoais ou não autorizados.
3. **Prestação de contas obrigatória** — todo gasto deve ser justificado no SGO+.
4. **Comprovante obrigatório** — nota fiscal, cupom, recibo, print ou imagem legível. Ausência gera pendência imediata.
5. **Pendências e bloqueio de recargas** — pendências podem bloquear novas recargas.
6. **Uso indevido e ressarcimento** — valores usados indevidamente cobrados/ressarcidos conforme CLT, contrato e apuração formal. **Nenhum desconto automático sem apuração prévia.**
7. **Medidas disciplinares** — advertência, suspensão ou justa causa conforme gravidade e CLT.
8. **Ciência e aceite** — colaborador declara ciência e concorda com todas as regras.

## Frontend desktop

- Nova aba **Documentos/Relatórios** adicionada ao `FIN_FLASH_V2_DESKTOP()`.
- Painel com botões: Gerar relatório positivo, Gerar relatório negativo, Gerar relatório de pendências, Gerar termo de uso, Ver termo atual.
- Tabela de documentos registrados exibida na aba.

## Frontend mobile

- Nova seção `FIN_FLASH_V2_MOBILE_TERMO()` adicionada ao `finFlashV2Html_()`.
- Botão "Ver termo de uso" carrega o texto via `FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV()`.
- Botão "Li e aceito o termo de uso" registra aceite via `FIN_FLASH_V2_REGISTRAR_ACEITE_TERMO_DEV()`.

## Regras preservadas

- Nenhum desconto automático: o termo declara explicitamente que ressarcimento ocorre somente após apuração formal.
- DEV exclusivo: toda operação bloqueada fora do DEV.
- AMBIENTE_TESTE=SIM: todos os registros de teste marcados.
- Menu principal: desligado.
- Deploy webapp: não executado.
- Importação real: não executada.
- Produção e Flash antigo: intocados.
- `--force`: não usado.
- `prompt()` / `confirm()`: ausentes.

## Validações locais — execução formal 2026-06-27

- `node --check SGO_Fin_FlashV2.js`: **OK**.
- `node --check SGO_Fin_FlashV2_Setup.js`: **OK**.
- Parse de `JS_Fin_FlashV2.html`: **OK**.
- `git diff --check`: **OK** (sem conflitos; avisos CRLF apenas em arquivos não relacionados).
- grep `prompt()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- grep `confirm()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- Menu principal não ligado: **confirmado** (linha 1 do HTML declara componente isolado).
- `clasp --user fin_flash_v2_dev push`: `Script is already up to date.` (sem `--force`).
- `EXECUTAR_FIN_FLASH_V2_6_TESTE_DOCUMENTOS_TERMO_DEV`: **APROVADO** — `success:true, ok:true, bloqueios:[]`.
