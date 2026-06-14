# FIN Flash — B.3.8 — Plano de Cadastro: Rafael FAY MARQUES / Cartao final 908

> Nenhuma acao executada neste documento.
> Executar somente apos B.3.6 (BASE_LIMPA confirmada) no projeto de producao.

---

## Por que e obrigatorio

O backend de importacao Flash (`finImportarLoteExtratoFlashV1`) vincula cada extrato
a um cartao pelo campo `CARTAO_FINAL`. Se o cartao nao existe em `FIN_CARTOES`,
a importacao pode falhar ou criar extratos orfaos sem vinculo correto.

O XLSX real identificado tem:
- Portador: RAFAEL FAY MARQUES
- Cartao final: 908
- Periodo: 2026-05-10 a 2026-06-10

---

## Dados do cartao a cadastrar

| Campo | Valor confirmado | Fonte |
|-------|-----------------|-------|
| Portador | RAFAEL FAY MARQUES | XLSX real + preview_parser_flash.json |
| Numero final (CARTAO_FINAL) | 908 | XLSX real |
| Tipo de cartao | Fisico | Coluna E do XLSX ("Cartao fisico") |
| Bandeira / Operadora | Flash | Nome do arquivo XLSX |
| Status | ATIVO | A definir no momento do cadastro |
| Funcionario vinculado | A confirmar — quem e o funcionario Rafael no sistema? | Verificar em SGO |

**Campos que precisam de confirmacao antes do cadastro:**
- FUNCIONARIO_ID do Rafael no banco principal (DB_ID, nao DB_FIN)
- CPF/email se o schema FIN_CARTOES exigir (nao incluir dados sem confirmacao)
- Centro de custo e finalidade do cartao

---

## Caminhos possiveis para cadastro

### Caminho A — Via WebApp producao (preferencial)

Se a tela de Cartoes do WebApp producao tiver formulario de cadastro de cartao:
1. Acessar WebApp producao (URL do novo projeto)
2. Ir em Financeiro > Cartoes
3. Adicionar novo cartao com os dados acima
4. Confirmar criacao

**Verificar apos:**
```
AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR
```
Deve retornar `totalCartoesLidos >= 1` e `primeirosCartoes[0].NUMERO_FINAL = 908`.

### Caminho B — Via funcao dedicada (se tela nao permitir)

Se a tela de producao nao tiver cadastro de cartao disponivel, sera necessario
criar funcao autorizada especifica. Proposta de nome:

```
CADASTRAR_CARTAO_RAFAEL_908_PRODUCAO_AUTORIZADO
```

Esta funcao NAO existe ainda. Sera criada em sessao separada com autorizacao explicita.

**Nao implementar sem autorizacao.**

---

## Auditoria esperada apos cadastro

Executar no editor do projeto de producao:
```
AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR
```

Resultado esperado:
```json
{
  "success": true,
  "ok": true,
  "ambienteInferido": "BASE_PRODUCAO_POSSIVEL",
  "totalCartoesLidos": 1,
  "totalLotesLidos": 0,
  "totalExtratosLidos": 0,
  "primeirosCartoes": [
    {
      "NUMERO_FINAL": "908",
      "APELIDO": "...",
      "FUNCIONARIO_ID": "...",
      "FUNCIONARIO_NOME": "RAFAEL FAY MARQUES"
    }
  ],
  "deteccaoDev": {
    "testeFinCartao": false,
    "testeFinFuncionario": false
  },
  "bloqueios": []
}
```

**PARAR se:**
- `NUMERO_FINAL` != 908
- `testeFinCartao` = true (cartao errado cadastrado)
- `testeFinFuncionario` = true
- `bloqueios` nao vazio

---

## Verificacao de duplicidade

Antes de cadastrar, confirmar que:
- Nao existe outro cartao com `NUMERO_FINAL = 908` para portador diferente
- Nao existe Rafael duplicado com finais diferentes

Funcao para verificar (sem gravar):
```
AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR
```
Inspecionar `primeirosCartoes` no resultado.

---

## Pre-requisitos para este pacote

- [ ] B.3.6: AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR retornou `BASE_LIMPA`
- [ ] B.3.7: TESTE_FLASH_CONTAGEM_SEM_GRAVAR retornou 0/0
- [ ] Funcionario Rafael confirmado no banco principal
- [ ] Dados do cartao validados com o extrato XLSX real
- [ ] Nenhum cartao com final 908 pre-existente na base

---

## Proibicoes

- Nao cadastrar cartao no projeto DEV (script antigo)
- Nao usar dados do cartao simulado (final 777, USUARIO TESTE FLASH)
- Nao cadastrar sem confirmar FUNCIONARIO_ID do Rafael
- Nao cadastrar sem a auditoria B.3.6 (BASE_LIMPA) concluida
