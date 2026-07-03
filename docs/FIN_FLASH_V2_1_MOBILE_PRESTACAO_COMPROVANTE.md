# FIN_FLASH_V2.1 — Mobile de prestação com comprovante obrigatório

Atualizado em: 2026-06-26 16:59:21 -03:00

## Objetivo

Criar fluxo mobile isolado do FIN_FLASH_V2 para o colaborador registrar gasto do cartão Flash com valor, data, categoria, justificativa e comprovante obrigatório por foto, print, imagem ou PDF.

## Escopo preservado

- Somente DEV.
- PRODUCAO_V2 não alterada.
- PROD antigo não alterado.
- Flash antigo não alterado.
- Menu principal não ligado.
- Importação real não executada.
- Deploy webapp não executado.
- `--force` não usado.
- IA não aprova gasto financeiro sozinha.

## Arquivos alterados

- `SGO_Fin_FlashV2.js`
- `JS_Fin_FlashV2.html`
- `docs/FIN_FLASH_V2_1_MOBILE_PRESTACAO_COMPROVANTE.md`
- `docs/INVENTARIO_FIN_FLASH_V2.md`

## Backend criado

Funções principais adicionadas:

- `FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV(payload)`
- `FIN_FLASH_V2_UPLOAD_COMPROVANTE_SEGURO_DEV_(arquivo, contexto)`
- `EXECUTAR_FIN_FLASH_V2_1_TESTE_MOBILE_AUTOMATICO_DEV()`

Funções auxiliares adicionadas:

- `FIN_FLASH_V2_dev_()`
- `FIN_FLASH_V2_result_(ok)`
- `FIN_FLASH_V2_getHeaderMap_(sh)`
- `FIN_FLASH_V2_cfg_(chave, padrao)`
- `FIN_FLASH_V2_resolverContaPorEmail_(emailUsuario, opts)`
- `FIN_FLASH_V2_emailUsuarioAtual_(payload)`
- `FIN_FLASH_V2_cartaoPrincipal_(cpf)`
- `FIN_FLASH_V2_validarPrestacaoMobile_(payload, conta)`
- `FIN_FLASH_V2_obterPastaUploadDev_()`
- `FIN_FLASH_V2_linhasPorId_(aba, coluna, valor)`

## Regras implementadas

- CPF não é escolhido livremente pelo colaborador.
- CPF é resolvido pela conta vinculada ao e-mail do usuário logado.
- Em DEV, o teste automático pode simular o e-mail `teste.flash@metrolabs.local`, mas não escolhe CPF diretamente.
- Se um CPF informado divergir do CPF vinculado, o envio é bloqueado.
- Valor obrigatório e maior que zero.
- Data obrigatória e válida.
- Categoria obrigatória.
- Justificativa obrigatória e mínima.
- Comprovante obrigatório.
- Comprovante aceita apenas:
  - `jpg`
  - `jpeg`
  - `png`
  - `gif`
  - `webp`
  - `pdf`
- MIMEs aceitos:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`
- Arquivo vazio é bloqueado.
- Arquivo acima do limite é bloqueado. Limite padrão: `5242880` bytes, configurável por `UPLOAD_MAX_BYTES` em `FIN_FLASH_V2_CONFIG`.
- Upload salvo em pasta Drive DEV/teste `FIN_FLASH_V2_DEV_COMPROVANTES_TESTE`, ou pasta configurada por `PASTA_COMPROVANTES_DEV_ID`.
- Prestação válida grava:
  - `FIN_FLASH_V2_PRESTACOES`
  - `FIN_FLASH_V2_DOCUMENTOS` como equivalente de anexos/comprovantes
  - `FIN_FLASH_V2_LOGS`
- Todos os registros de teste usam `AMBIENTE_TESTE = SIM`.

## Tela mobile isolada

Arquivo: `JS_Fin_FlashV2.html`

Bloco criado:

- `FIN_FLASH_V2_MOBILE()`

Campos:

- valor
- data do gasto
- categoria
- justificativa
- comprovante obrigatório

Botão:

- Enviar prestação

Observação: o bloco existe no arquivo isolado, mas não foi ligado ao menu principal. Busca em arquivos principais não encontrou ligação:

```text
rg "finFlashV2Html_|FIN_FLASH_V2_MOBILE|JS_Fin_FlashV2" SGO_Main.js Index.html JS_Core.html JS_Admin.html JS_Mobile.html
```

Resultado: sem ocorrências.

## Validações locais

- `node --check SGO_Fin_FlashV2.js`: OK
- `node --check SGO_Fin_FlashV2_Setup.js`: OK
- `git diff --check`: OK, apenas avisos LF/CRLF
- `rg "prompt\(|confirm\(" SGO_Fin_FlashV2.js SGO_Fin_FlashV2_Setup.js JS_Fin_FlashV2.html`: sem ocorrências

## Publicação DEV

Comando:

```powershell
clasp --user fin_flash_v2_dev push
```

Resultado:

```text
Pushed 84 files at 16:56:27.
```

Sem `--force`.

## Orquestradora automática

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_1_TESTE_MOBILE_AUTOMATICO_DEV --user fin_flash_v2_dev
```

Resultado aprovado.

Como o `clasp run` compacta objetos aninhados como `[Object]`, o JSON completo foi capturado também via Apps Script Execution API REST com o mesmo OAuth dedicado. Essa captura reexecutou o teste uma vez adicional, criando dados/arquivo fake seguros no DEV com `AMBIENTE_TESTE=SIM`.

## JSON completo final

```json
{
  "bloqueioSemJustificativa": true,
  "ambiente": "DEV",
  "bloqueioCpfDiferente": true,
  "menuLigado": false,
  "bloqueios": [],
  "flashAntigoAlterado": false,
  "todosDadosTesteComAmbienteTeste": true,
  "importacaoRealExecutada": false,
  "prestacaoValidaCriada": true,
  "bloqueioSemValor": true,
  "avisos": [],
  "success": true,
  "forceUsado": false,
  "bloqueioSemComprovante": true,
  "ok": true,
  "detalhes": {
    "gravacao": {
      "logsCriados": 1,
      "prestacaoEncontrada": true,
      "documentoEncontrado": true
    },
    "bloqueiosNegativos": {
      "semComprovante": {
        "avisos": [],
        "success": false,
        "ambiente": "DEV",
        "comprovanteArquivoId": "",
        "bloqueios": ["Comprovante obrigatorio."],
        "gravacaoReal": false,
        "prestacaoId": "",
        "ok": false,
        "documentoId": ""
      },
      "cpfDiferente": {
        "avisos": [],
        "ambiente": "DEV",
        "success": false,
        "comprovanteArquivoId": "",
        "bloqueios": ["CPF informado diverge da conta vinculada ao usuario logado."],
        "gravacaoReal": false,
        "ok": false,
        "prestacaoId": "",
        "documentoId": ""
      },
      "semJustificativa": {
        "avisos": [],
        "ambiente": "DEV",
        "success": false,
        "comprovanteArquivoId": "",
        "bloqueios": ["Justificativa obrigatoria e deve ser suficiente."],
        "gravacaoReal": false,
        "documentoId": "",
        "ok": false,
        "prestacaoId": ""
      },
      "semValor": {
        "avisos": [],
        "success": false,
        "ambiente": "DEV",
        "comprovanteArquivoId": "",
        "bloqueios": ["Valor obrigatorio e deve ser maior que zero."],
        "gravacaoReal": false,
        "documentoId": "",
        "ok": false,
        "prestacaoId": ""
      }
    },
    "envioValido": {
      "ambiente": "DEV",
      "link": "https://drive.google.com/file/d/129OuDU2moyWVJF3ii3id0ZXRGaKWzgAs/view?usp=drivesdk",
      "bloqueios": [],
      "prestacaoId": "FIN_FLASH_V2_PRESTACAO_3d41460a-bbd1-4aa1-a423-fa7a205cad4e",
      "todosDadosTesteComAmbienteTeste": true,
      "avisos": [],
      "success": true,
      "comprovanteArquivoId": "129OuDU2moyWVJF3ii3id0ZXRGaKWzgAs",
      "cpf": "00000000000",
      "gravacaoReal": true,
      "ok": true,
      "documentoId": "FIN_FLASH_V2_DOC_96aea27a-2ca2-4ac9-b967-8fa2a811f174",
      "email": "teste.flash@metrolabs.local",
      "status": "AGUARDANDO_EXTRATO"
    }
  },
  "producaoAlterada": false
}
```

## Resultado consolidado

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "prestacaoValidaCriada": true,
  "bloqueioSemComprovante": true,
  "bloqueioSemValor": true,
  "bloqueioSemJustificativa": true,
  "bloqueioCpfDiferente": true,
  "todosDadosTesteComAmbienteTeste": true,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": []
}
```

## Próximos passos sugeridos

1. Criar validação visual/humana do formulário mobile dentro de ambiente DEV, ainda sem menu principal.
2. Criar camada de categorias configuráveis em `FIN_FLASH_V2_CONFIG`.
3. Preparar etapa de conciliação contra extrato Flash real, ainda sem importação real até autorização específica.
