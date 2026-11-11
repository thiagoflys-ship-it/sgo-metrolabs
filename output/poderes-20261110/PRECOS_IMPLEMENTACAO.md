# Brechas de preço do Comercial — implementação (10/11/2026)

Estado: PREPARADO E TESTADO LOCALMENTE (emulador dos testes). Não publicado, sem ssh, sem commit.
Auditoria e decisões pendentes: `AUDITORIA_PRECOS_COMERCIAL.md`.

## Arquivos alterados (somente `base/legado`, CRLF preservado em todas as linhas)

Cópia dos arquivos antes da mudança: `precos-antes-legado/` (reversão = copiar de volta).

| Arquivo | Linhas (+/−) | O quê |
|---|---|---|
| `SGO_Comercial_Propostas.js` | +229 / −31 | `ComP_temCusto_`, `ComP_custoCatalogo_`, `ComP_precoNaoAprovado_`, `ComP_itensComCustoAtual_`, `ComP_pendenciasPreco_`, `ComP_avaliarProposta_`, `ComP_marcaPreco_`, `ComP_registroAprovacao_`, `ComP_ehDiretoriaId_`, `ComP_conferirPrecoAntesDe_`, `ComP_faltaAprovacaoPreco_` (bloco "BRECHAS DE PREÇO", perto da linha 470); `ComP_avaliarPolitica_` aceita as pendências (códigos DESCONTO, MARGEM_MIN, SEM_CUSTO, PRECO_NAO_APROVADO); detalhe, salvar, concluir e decidir desconto usam `ComP_avaliarProposta_`; a conclusão grava o custo atual nos itens e o registro da exceção; a decisão grava `PRECIFICACAO_JSON.aprovacao`; conferência em gerar documento, assinar, link, marcar enviada, aceite na pronta e `ComP_conferirEnvio_` (nova); envio pela janela genérica registra e avisa a Diretoria; catálogo: custo obrigatório no produto novo da equipe, preço do item novo da equipe pendente (aviso, decisão aprova ou arquiva), mudança de preço do cadastro pendente; itens da proposta: tabela = preço de referência, custo = maior entre o gravado e o do catálogo |
| `SGO_Comercial_Gestora.js` | +9 / −4 | revisão da proposta com a avaliação nova; alerta do item sem custo diz que vai para a Diretoria e como evitar |
| `SGO_Comercial_Precificacao.js` | +5 / −1 | regra SEM_CUSTO (grave) nos problemas do painel da gestão; comentário da política |
| `SGO_Comercial_Painel.js` | +2 | ação `conferirEnvio` |
| `JS_Comercial.html` | +14 / −6 | "Enviar ao cliente" confere o preço antes de abrir a janela; faixa "Preço a conferir antes do envio"; passo 4 diz a alçada e o que fazer com item sem custo; caixa da política diz Diretoria quando é; campo "Custo de compra" no cadastro novo da equipe e aviso do preço pendente; textos do cadastro novo pendente e da decisão |
| `SGO_Ajuda_Comercial.js` | +6 / −3 | montar e concluir, cadastro pela equipe, decisão do preço, três situações novas em problemas |

`SGO_Comercial_Config.js`: sem mudança (nenhuma coluna nova; o registro da aprovação fica no
`PRECIFICACAO_JSON` já existente e o cadastro pendente usa as colunas PRECO_PEDIDO_* existentes).
Não foram tocados: `src/`, `dist/`, `SGO_Poderes.js`, `JS_Acessos.html`, Conduta, regras de avaliação, fórmula
e percentuais da política.

## Testes

Novo: `tests/comercial-precos-brechas.test.cjs` (13 testes: B1 a B12 e tela/ajuda; caso da PROP-2026-0028 com
dados fictícios, piso conferido em R$ 21.467).

Ajuste nos testes antigos: item sem custo agora vai para a Diretoria, e dez arquivos usavam item avulso sem
custo como dado de teste de outros assuntos (assinatura, quadro, modelo, termos etc.). Eles passaram a usar a
opção nova `custoAvulso: 0.3` do `tests/_comercial_ambiente.cjs` (antes de concluir, o item sem custo recebe
30% do preço na proposta gravada; sem a opção o ambiente se comporta como antes). Nenhuma asserção antiga foi
removida ou afrouxada. Arquivos: comercial, comercial-assinatura-aprovacao, comercial-c2-precos,
comercial-c3-revisao, comercial-catalogo-equipe-exclusao, comercial-etapa2, comercial-modelo-orcamento,
comercial-precificacao, comercial-quadro, comercial-termos-catalogo.

Placar (`tests/comercial*.test.cjs` + `poderes-lote0.test.cjs`, rodador `rodar-comercial.cjs`):

| Fase | Antes | Depois | Observação |
|---|---|---|---|
| candidato (`base/legado`) | 225 ok / 4 falhas (22 arquivos) | 238 ok / 4 falhas (23 arquivos) | as 4 falhas são as mesmas de antes (c4-entrada 1, catálogo oficial 3); os 13 novos passam |
| produção (`producao/legado`) | 211 ok / 18 falhas | 212 ok / 30 falhas | as 18 de antes são as mesmas; +12 são os testes novos falhando no código atual da produção (prova das brechas). B7 e B12 falham na produção pelo item sem custo e pela ação `conferirEnvio` inexistente; a parte "voltar para rascunho zera a aprovação" e "envio só da pronta" já era correta |

Saídas: `precos-antes-candidato.txt`, `precos-antes-producao.txt`, `precos-depois-candidato.txt`,
`precos-depois-producao.txt`. `node --check` sem erro nos 5 `.js` alterados; o script de `JS_Comercial.html`
compila.

Impacto estimado nas PRONTAS reais: `precos-impacto-prontas.txt` (32 de 35 seriam barradas na próxima ação;
detalhes na auditoria).

## Antes de publicar

- Conferir a versão em produção contra `producao/legado` (a base deste trabalho é `base/legado`, do Lote 0).
- Avisar a equipe comercial e a Diretoria das 32 propostas prontas que vão pedir nova conclusão.
- Teste no navegador da página completa (Propostas: passo 4, Enviar ao cliente; Produtos e serviços: novo item
  pela vendedora, decisão do preço), que estes testes de servidor não cobrem.
