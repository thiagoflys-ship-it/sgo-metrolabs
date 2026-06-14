# FIN Flash — B.3.1 — Checklist: Criar Novo Apps Script para Producao

> Acao manual obrigatoria. Claude nao pode criar o projeto remotamente.
> Executar somente apos commits B.3.0 concluidos.

---

## Por que criar um novo projeto

O atual scriptId (12xiWNlQ...) e usado por /dev e /prod simultaneamente.
PropertiesService e compartilhada entre todos os deployments do mesmo script.
Um novo projeto Apps Script tem scriptId proprio, PropertiesService propria e
pode ter DB_FIN_ID apontando para planilha de producao limpa, sem contaminacao de DEV.

---

## Passo a passo

### 1. Acessar Google Apps Script

Abrir: https://script.google.com

Conta Google: thiagoflys@gmail.com (mesma conta do projeto atual)

### 2. Criar novo projeto

- Clicar em "Novo projeto"
- Nome do projeto: `SGO_PLUS_PRODUCAO_FINANCEIRO`
  (ou `SGO_PLUS_PROD_FIN` se preferir nome mais curto)
- Aguardar abrir o editor

### 3. Copiar o scriptId

- No editor, clicar no menu: Projeto > Configuracoes do projeto
  (ou no icone de engrenagem no menu lateral)
- Localizar: "ID do script"
- Copiar o valor completo (ex: `1xyzABCdef...`)

### 4. Copiar o URL do editor (opcional, para referencia)

- O URL do editor tem o formato:
  `https://script.google.com/home/projects/SCRIPT_ID/edit`
- Salvar para referencia futura.

### 5. Verificar a conta

- Confirmar que o projeto foi criado na mesma conta: thiagoflys@gmail.com
- Isso e necessario para que o Drive e as permissoes funcionem corretamente.

---

## O que NAO fazer neste momento

| Proibido | Motivo |
|----------|--------|
| Nao colar codigo manualmente no editor | O clasp push fara isso controlado |
| Nao executar nenhuma funcao | O provisionamento e feito em etapa separada |
| Nao alterar DB_FIN_ID no projeto antigo | O antigo continua como DEV |
| Nao importar XLSX ainda | Apenas apos B.3.4-B.3.7 |
| Nao criar planilha manualmente | O provisionamento cria automaticamente |
| Nao publicar WebApp ainda | Apenas apos B.3.3 (push) |

---

## Como retornar para o Claude

Apos obter o scriptId do novo projeto, informar no chat:

```
"Script ID do novo projeto producao: COLE_O_SCRIPT_ID_AQUI"
```

O Claude vai:
1. Criar .clasp-prod.json localmente com o novo scriptId
2. Preparar e executar clasp push (com autorizacao separada)
3. Orientar provisionamento do DB_FIN de producao

---

## Proximos passos apos informar o scriptId

| Etapa | Acao | Executado por |
|-------|------|--------------|
| B.3.2 | Criar .clasp-prod.json local | Claude (com scriptId fornecido) |
| B.3.3 | clasp push para novo projeto | Claude (com autorizacao) |
| B.3.4 | Autorizar OAuth no novo projeto | Usuario (1x no editor) |
| B.3.5 | Provisionamento: provisionarAmbienteFinanceiroV2_AUTORIZADO | Usuario (no editor do novo projeto) |
| B.3.6 | Setup: setupFinanceiroV2 | Usuario (no editor do novo projeto) |
| B.3.7 | Verificar: AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR | Usuario (confirmar BASE_LIMPA) |
| B.3.8 | Cadastrar Rafael/908 | Sessao separada |
| B.3.9 | Baseline: TESTE_FLASH_CONTAGEM_SEM_GRAVAR | Usuario (confirmar 0/0) |
| B.3.10+ | Preview, dry-run, importacao real | Sessoes separadas |

---

## Referencia rapida de confusao DEV vs PROD

| Item | DEV (atual) | PROD (novo) |
|------|-------------|-------------|
| scriptId | 12xiWNlQ... | (novo, a ser fornecido) |
| .clasp.json | .clasp.json | .clasp-prod.json |
| clasp push comando | clasp push | clasp push --project .clasp-prod.json |
| DB_FIN_ID | 1Q7zvZvtzrYUVGk8o... (teste) | (novo, criado pelo provisionamento) |
| Planilha | SGO_FIN_CARTAO_FLASH_DB (com dados de teste) | Nova planilha limpa |
| Dados | TESTE_FIN_*, Pacote T (2 lotes/7 extratos) | Vazia ate importacao real |
