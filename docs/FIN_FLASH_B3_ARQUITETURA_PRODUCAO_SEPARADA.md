# FIN Flash — B.3 — Decisao Arquitetural: Producao Separada

> Documento de decisao tecnica. Data: 2026-06-14.
> Nenhuma acao de producao executada neste documento.

---

## 1. Diagnostico da arquitetura atual

### Descoberta: um unico Apps Script, uma unica PropertiesService

Todos os arquivos .clasp*.json do projeto apontam para o mesmo scriptId:

```
12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG
```

Em Google Apps Script, `/dev` (HEAD) e `/prod` (deployment versionado) sao dois targets
de deploy do MESMO script. `PropertiesService.getScriptProperties()` e por-scriptId,
nao por-deployment. Portanto:

- Uma unica PropertiesService compartilhada entre todos os deployments
- `DB_FIN_ID` lido e o mesmo para /dev e /prod
- Nao ha isolamento nativo de propriedades entre HEAD e versioned deployments

### O DB_FIN atual

| Campo | Valor |
|-------|-------|
| DB_FIN_ID | 1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0 |
| Nome da planilha | SGO_FIN_CARTAO_FLASH_DB |
| Conteudo | Dados de teste: TESTE_FIN_CARTAO_FLASH, NUMERO_FINAL 9999, TESTE_FIN_FUNCIONARIO |
| Lotes/extratos | 2 lotes / 7 extratos do Pacote T (importacao de teste em /dev) |
| Rafael/908 | NAO cadastrado |

### Conclusao do diagnostico

- /dev e /prod compartilham o mesmo DB_FIN_ID
- O baseline 2/7 retornado por /prod nao e producao real — e o resultado do Pacote T de teste
- Importar XLSX real nessa base e PROIBIDO (dados de teste e dados reais misturados)
- Producao real esta BLOQUEADA

---

## 2. Por que B.1 foi rejeitado

B.1 = limpar a planilha atual e usa-la como producao.

Motivos de rejeicao:

1. **Operacao destrutiva irreversivel** — limpar dados de teste apaga a evidencia do Pacote T
2. **Mistura DEV e producao** — o mesmo script continuaria gravando na base ao executar testes futuros
3. **Rafael/908 nao cadastrado** — sera necessario cadastrar antes de qualquer importacao
4. **Nao ha separacao possivel** — com uma unica PropertiesService, qualquer escrita do editor /dev va para a mesma base

---

## 3. Por que C3 foi rejeitado

C3 = trocar DB_FIN_ID no mesmo script para uma nova planilha.

Motivos de rejeicao:

1. **DEV aponta para producao** — apos a troca, funcoes executadas no editor (qualquer
   EXECUTAR_IMPORTACAO_*, setupFinanceiroV2, etc.) gravariam na planilha de producao
2. **Risco critico de contaminacao** — Pacote T rodado acidentalmente destruiria dados reais
3. **Impossivel separar ambientes** — PropertiesService e unica; nao ha como ter DEV → DB_DEV e PROD → DB_PROD
4. **Reversao dificil** — trocar de volta exigiria nova sessao, nova propriedade, novo setup

---

## 4. Caminho recomendado: C1 — Novo Apps Script para producao

### O que e C1

Criar um novo projeto Google Apps Script exclusivamente para producao:

- Novo scriptId (diferente do atual)
- Nova PropertiesService exclusiva para producao
- Novo DB_FIN_ID apontando para nova planilha limpa
- /dev continua no script atual, com a base de teste, sem nenhuma alteracao

### Por que C1 e correto

| Propriedade | C1 (Novo script) | C3 (Trocar ID) |
|-------------|-----------------|----------------|
| DEV contamina PROD? | Impossivel | Critico |
| Isolamento de PropertiesService | Completo | Nenhum |
| Testes futuros em DEV | Independentes | Proibidos |
| Reversao | Facil | Dificil |
| Complexidade | Media | Baixa |
| Risco | Baixo | Alto |

### Impacto em outros modulos

| Componente | Impacto | Acao |
|-----------|---------|------|
| SGO_WEBAPP_URL | Nova URL de deploy | Configurar no provisionamento do novo projeto |
| WEBAPP_URL | Idem | Idem |
| Rota publica do termo (?fin_termo=TOKEN) | Funciona pela URL do novo deploy | OK apos configurar WebApp |
| Financeiro no menu | Sem impacto — codigo do menu nao tem env check | OK |
| OAuth scopes | Mesmos scopes (appsscript.json) | Iguais no novo projeto |
| Drive folder FIN (SGO_FINANCEIRO_DOCUMENTOS) | Pode ser pasta nova ou a mesma | Decisao operacional |
| Permissoes WebApp | Novo projeto precisa de autorizacao OAuth | Acao manual 1x |
| DB_FIN_ID | Novo ID via provisionamento | Configurado automaticamente |

---

## 5. Pacotes B.3 — Sequencia completa

| Pacote | Descricao | Estado |
|--------|-----------|--------|
| B.3.0 | Remover hardcode DB_FIN_ID_ESPERADO em SGO_Fin_Provisionamento.js | CONCLUIDO |
| B.3.0D | Documentar decisao arquitetural C1 (este documento) | CONCLUIDO |
| B.3.0E | Checklist criacao novo Apps Script producao | CONCLUIDO |
| B.3.0F | Template .clasp-prod.example.json | CONCLUIDO |
| B.3.0G | Plano de provisionamento producao limpa | CONCLUIDO |
| B.3.0H | Plano cadastro Rafael/cartao 908 | CONCLUIDO |
| B.3.0I | Plano base64/preview XLSX real | CONCLUIDO |
| B.3.1 | Criar novo projeto Apps Script manualmente | AGUARDA USUARIO |
| B.3.2 | Configurar .clasp-prod.json com novo scriptId | Apos B.3.1 |
| B.3.3 | clasp push do codigo para o novo projeto producao | Apos B.3.2, autorizacao |
| B.3.4 | Provisionar ambiente financeiro (nova planilha) | Apos B.3.3, autorizacao |
| B.3.5 | Setup das 12 abas FIN na nova planilha | Apos B.3.4 |
| B.3.6 | Cadastrar Rafael FAY MARQUES / cartao final 908 | Apos B.3.5 |
| B.3.7 | Baseline producao real (TESTE_FLASH_CONTAGEM_SEM_GRAVAR) | Apos B.3.5 |
| B.3.8 | Preview e dry-run XLSX real | Apos B.3.6 + B.3.7 |
| B.3.9 | Importacao real autorizada (Pacote W no novo projeto) | Apos B.3.8, autorizacao |
| B.3.10 | Auditoria pos-importacao | Apos B.3.9 |
| B.3.11 | Validacao visual WebApp producao | Apos B.3.10 |
| B.3.12 | Documentacao e commit final | Apos B.3.11 |

---

## 6. Riscos e mitigacao

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| DEV executar funcao real no projeto de producao | CRITICO | Separacao fisica de scriptId elimina o risco |
| DB_FIN_ESPERADO bloquear setup no novo projeto | MEDIO | Resolvido em B.3.0: check removido |
| Esquecimento de qual .clasp usar | MEDIO | .clasp.json = DEV, .clasp-prod.json = PROD |
| Push acidental para projeto errado | MEDIO | Usar `clasp push --project .clasp-prod.json` explicitamente |
| Rafael/908 nao cadastrado antes de XLSX | ALTO | B.3.6 obrigatorio antes de B.3.8 |
| PropertiesService do projeto novo vazia | BAIXO | Resolvido pelo provisionamento (B.3.4) |

---

## 7. Decisao final

> **Producao real Flash somente em ambiente Apps Script separado.**
>
> O script atual (scriptId 12xiWNlQ...) permanece como DEV/homologacao.
> Um novo projeto Apps Script sera criado para producao, com PropertiesService
> propria e DB_FIN_ID proprio apontando para planilha limpa.
> Nenhuma importacao real sera executada antes de B.3.7 (baseline 0/0 confirmado).

## 8. Nota B.3.4C - Recursos Drive com nomes iguais

Mesmo com Apps Script separado, funcoes que procuram arquivos por nome no Drive podem
reutilizar recursos DEV quando a conta Google e a mesma. Isso ocorreu quando o
provisionamento antigo encontrou `SGO_FIN_CARTAO_FLASH_DB` e reutilizou o DB_FIN
DEV/homologacao `1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0`.

Para producao real, o provisionamento deve usar nomes proprios de producao, como
`SGO_FIN_CARTAO_FLASH_DB_PROD` e `SGO_FINANCEIRO_DOCUMENTOS_PROD`, e bloquear
explicitamente qualquer retorno com o ID DEV conhecido.
