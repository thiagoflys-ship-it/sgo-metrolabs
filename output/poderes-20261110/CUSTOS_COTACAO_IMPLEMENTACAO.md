# Custo com cotação do fornecedor, validade e preço sugerido — implementação (11/11/2026)

Estado: **PREPARADO E TESTADO LOCALMENTE** (emulador dos testes e navegador headless na página completa). **Não publicado**, sem ssh,
sem commit. Base: `base/legado`, que já contém a correção das brechas de preço de 10/11 (`PRECOS_IMPLEMENTACAO.md`), também não
publicada. Fórmula e percentuais da política não mudaram (mínimo e sugerido usam `ComPr_precoProduto_` e `ComPr_precoServicoConta_`).

## 1. Desenho e decisões

| Tema | Decisão | Por quê |
|---|---|---|
| Onde exige cotação | Todo custo gravado no catálogo (produto, serviço e contrato com custo digitado). Serviço com **ficha de custo** valendo (`ComF_fichaVale_`) fica isento. | A ficha calcula o custo na hora pela política (horas × custo da hora + padrões + consumíveis): não "envelhece". Custo digitado sem fonte é exatamente o risco do caso PROP-2026-0028, seja produto ou serviço de terceiro/insumo. |
| Dados da cotação | Fornecedor (texto ou da lista de Compras > Fornecedores), nº (opcional), data, validade, valor unitário, arquivo PDF/PNG/JPG (até 10 MB, tipo conferido pelos bytes), observação; quem anexou e quando ficam gravados. | Pedido do dono. |
| Validade | `VALIDO_ATE = min(validade da cotação, data da cotação + teto)`. Teto padrão 90 dias, por categoria opcional, configurável pela gestão comercial (com motivo e versão). Gravado na versão: mudar o teto vale para as cotações novas. | Previsível e auditável; a cotação gravada não "muda de validade" depois. |
| Situação do custo | VIGENTE, VENCENDO (≤ aviso, padrão 15 dias), VENCIDO, SEM_ANEXO (sem cotação ou custo mudado por outro caminho: o valor não confere com o da versão), SEM_CUSTO, FICHA. | Uma regra só (`ComCu_situacao_`), usada no catálogo, na proposta, no painel e nos avisos. |
| Proposta | VENCIDO ou SEM_ANEXO = "sem custo válido": pendência `CUSTO_SEM_COTACAO` no mesmo fluxo do item sem custo (Diretoria). O custo atual continua entrando na conta da sobra. | Reaproveita o fluxo de 10/11. |
| Reconferência (documento, envio, link, aceite) | Pega o custo que **venceu** depois da conclusão. A proposta pronta concluída **antes** desta versão (sem o retrato `PRECIFICACAO_JSON.custos`) não é barrada pelo custo legado sem anexo ("na próxima conclusão"). | Pedido do dono; evita barrar de uma vez as prontas por um requisito que não existia quando foram concluídas. |
| Aprovação | Registra os itens aprovados (`aprovacao.semCotacao`). Outro item cuja cotação vença depois não fica coberto. | Aprovação vale para o que foi aprovado. |
| Preço abaixo do piso | Ao gravar o custo, se o preço de tabela ficar abaixo do mínimo: aviso à gestão comercial (sistema + e-mail no expediente, sem R$), marca na versão e situação "Preço abaixo do mínimo" no painel. O preço não muda. | Pedido do dono. |
| Avisos | Rotina do Comercial (já roda a cada hora): uma vez por dia útil, no expediente. Avisa os responsáveis quando um item entra em VENCENDO ou VENCIDO (uma vez por situação/validade) e, às segundas, lembra os itens sem cotação em propostas abertas. Vencido em proposta aberta vira atividade em Minhas atividades (uma aberta por responsável). Sem WhatsApp, sem valores. | Padrão `Com_avisar_` + `Com_criarAtividade_`. |
| Responsáveis | Configuráveis (gestão comercial escolhe; só aceita quem tem o catálogo completo: gestão, Diretoria, Administrador, Financeiro). Vazio = gestão comercial. | Responsável que não consegue gravar o custo ficaria no limbo. Para incluir o comprador de Compras, ele precisa de perfil/área que dê o catálogo (decisão do dono, ver §7). |
| Permissões | Sem mudança: gestão/Diretoria/Administrador/Financeiro gravam custo em qualquer item; a equipe comercial só no **produto novo** que cadastra (custo obrigatório). A cotação é exigida de todos. Vendedor vê só o selo da situação (sem valores, sem fornecedor). Custos, versões e arquivos: só quem vê custo. | Pedido do dono (item 4). |
| Compras | Reaproveitado: lista de fornecedores (CMP_FORNECEDORES) e orçamentos já lançados em Compras para o mesmo item (CMP_ITENS.PRODUTO_ID → CMP_COTACOES com arquivo e na validade). O custo vem do orçamento com frete e impostos rateados pelo valor; o arquivo de Compras é referenciado (não copiado) e o SHA-256 gravado. | Sem duplicar cadastro de fornecedor nem o arquivo. |
| Arquivos | Pasta privada "Comercial - Cotações de custo" (`SGO_DocSalvar_pastaPersistente_` + `Ast_privado_`, como "Minha assinatura"); SHA-256 conferido ao abrir. | Padrão existente. |
| Edição do item | A tela de edição não manda mais o custo (só leitura + "Atualizar custo"); o servidor mantém o custo quando o campo não vem. Mandar um custo diferente sem cotação é recusado. | Um caminho só para mudar custo. |

### Ampliação (preço sugerido e opções)
`ComCu_guiaPrecos_` (no detalhe da proposta em rascunho/aguardando/pronta e na resposta do salvar):
- por item: preço de tabela, **mínimo** (sobra mínima, hoje 35%), **sugerido** (margem alvo da política), onde o preço está
  (abaixo do mínimo / entre / no sugerido ou acima) e a situação do custo; vendedor vê mínimo e sugerido em R$; quem vê custo vê
  também custo e sobra (%);
- total: situação da sobra, desconto sobre a tabela, **alçada** e o **efeito do desconto geral** na sobra;
- opções (passo 4): "Usar preço sugerido" e "Ajustar para o mínimo" (`aplicarPrecos`: só no rascunho, nunca baixa preço, mostra o
  total novo, histórico), "Manter meu preço e pedir autorização" (fluxo existente de concluir com motivo; a faixa mostra quem aprova,
  com os nomes, e o que será aprovado) e "Pedir atualização do custo" (`custoPedirAtualizacao`: aviso a cada responsável + atividade
  para o primeiro, ligada ao item e à proposta, histórico na proposta, um por item e proposta por dia);
- proposta pronta: faixa "Mudou desde a conclusão" (cotação venceu ou custo subiu, sem valores) com "Voltar para rascunho", "Pedir
  atualização do custo" e o guia com o custo de hoje.

## 2. Arquivos (somente `base/legado` e `tests/`)

Cópia de antes: `custos-antes-legado/` (reversão = copiar de volta e apagar `SGO_Comercial_Custos.js`).

| Arquivo | Linhas | O quê |
|---|---|---|
| `SGO_Comercial_Custos.js` (novo) | 615 | configuração, situação, conferência e gravação da cotação, janela do item, arquivo, painel, regra, rotina de avisos, pedido de atualização, guia de preço, aplicar preços, mudanças desde a conclusão |
| `SGO_Comercial_Config.js` (CRLF preservado: 1.018 linhas CRLF, 0 LF solta) | +20 / −7 | aba `COM_CUSTOS_COTACOES`, colunas novas em `COM_PRODUTOS`, colunas texto, cache das abas `V13_CUSTOS` |
| `SGO_Comercial_Propostas.js` | +67 / −18 | `custoSit` no item; filtro `CUSTO_ATUALIZAR` e contagem; cotação no `salvarProduto` (custo novo/alterado), custo mantido quando não vem; pendência `CUSTO_SEM_COTACAO`, `ComP_opcoesReconferencia_`, registro `semCotacao`, conferência por item na aprovação; retrato `foto.custos` na conclusão; detalhe com tolerância na pronta, `guiaPrecos` e `mudancasCusto`; `guia` na resposta do salvar; mensagens |
| `SGO_Comercial_Painel.js` | +11 | ações `custosPainel`, `custoItem`, `custoSalvar`, `custoArquivo`, `custosConfigSalvar`, `custoPedirAtualizacao`, `guiaPrecos`, `aplicarPrecos`; passo `custos` na rotina |
| `SGO_Comercial_Gestora.js` | +3 | alerta do custo sem cotação válida |
| `JS_Comercial.html` | +172 / −11 | botão e painel "Custos a atualizar" (filtros, quadros, ordem por uso, regra e responsáveis), janela "Atualizar custo" (cotação, orçamento de Compras, histórico, abrir arquivo), selo do custo no catálogo, cotação no cadastro novo, custo só leitura na edição, aviso do custo no item da proposta com mínimo/sugerido, guia de preço com as opções no passo 4, faixa "Mudou desde a conclusão", quem aprova no pedido de aprovação |
| `SGO_Ajuda_Comercial.js` | +9 / −1 | passos "Custo com a cotação", "Custos a atualizar", "Preço mínimo, preço sugerido e as opções"; selos; problemas novos |
| `tests/_comercial_ambiente.cjs` | carrega o arquivo novo; opção `cotacaoReal` | sem a opção, o custo semeado nos testes antigos e o `salvarProduto` com custo recebem uma cotação de teste válida (como se o custo já estivesse documentado); nenhuma asserção antiga foi removida ou afrouxada |
| `tests/comercial-custos-cotacao.test.cjs` (novo) | 11 testes | ver §5 |

Não tocados: `src/`, `dist/`, `SGO_Poderes.js`, `JS_Acessos.html`, Conduta, `sgo_servidor`, `apps-script-imports`.

## 3. Abas e colunas novas

- **`COM_CUSTOS_COTACOES`** (uma linha por versão; nada é apagado): ID, PRODUTO_ID, CODIGO, NOME, TIPO, VERSAO, CUSTO, CUSTO_ANTERIOR,
  FORNECEDOR, FORNECEDOR_ID, COTACAO_NUMERO, COTACAO_DATA, COTACAO_VALIDADE, TETO_DIAS, VALIDO_ATE, ARQUIVO_ID, ARQUIVO_NOME,
  ARQUIVO_TIPO, SHA256, TAMANHO, ORIGEM (CADASTRO, CATALOGO, COMPRAS), COMPRAS_COTACAO_ID, PRECO_NA_DATA, PISO_NA_DATA,
  PRECO_ABAIXO_PISO, OBS, SITUACAO (VIGENTE, SUBSTITUIDA), SUBSTITUIDA_EM, ANEXADO_POR_ID, ANEXADO_POR_NOME, ANEXADO_EM, CRIADO_EM.
- **`COM_PRODUTOS`**: CUSTO_COTACAO_ID, CUSTO_COTACAO_VALOR, CUSTO_VALIDO_ATE, CUSTO_FORNECEDOR, CUSTO_COTACAO_EM, CUSTO_POR_NOME,
  CUSTO_EM, CUSTO_AVISO_SIT.
- **`COM_CONFIG`**: CHAVE `CUSTOS` (tetoDias, avisoDias, tetoPorCategoria, responsaveis), uma linha por versão.
- `PRECIFICACAO_JSON` das propostas: `custos` (retrato na conclusão) e `aprovacao.semCotacao`.
- Propriedades: `COM_CUSTOS_AVISO_DIA`, `COM_CUSTOS_ATIVIDADES`.

## 4. Impacto real nos dados (`precos-dump.txt`, 10/11/2026)

Catálogo ativo: 1.439 itens (1.247 produtos, 192 serviços).
- Com custo: 894 (832 produtos, 62 serviços) — **todos sem cotação anexada** → "Custo sem cotação" no dia da publicação.
- Sem custo: 545 (415 produtos, 130 serviços). Serviço com ficha valendo fica isento; o dump não traz as colunas da ficha, então
  parte dos 130 serviços (os importados da C1 e os 26 oficiais com ficha) não será afetada — conferir em produção.
- Propostas abertas: 98 RASCUNHO, 35 PRONTA, 2 ENVIADA. Itens distintos do catálogo nelas: **271** (151 com custo sem cotação,
  120 sem custo; 238 produtos, 33 serviços). Lista priorizada: `custos-saneamento-prioridade.csv` (propostas abertas e valor por item).
- **RASCUNHO**: as 98 têm pelo menos um item do catálogo sem custo válido (72 com custo legado, 37 com item sem custo). Com o catálogo
  de hoje, todas iriam para a Diretoria na próxima conclusão — por isso o saneamento dos 271 itens vem antes da publicação.
- **PRONTA**: 11 das 35 têm itens com custo legado; pela tolerância, **nenhuma é barrada por esta mudança** (as 32 barradas são da
  correção de 10/11: item sem custo e sobra). A partir da publicação, só a cotação que vencer barra a pronta.
- **ENVIADA** (2) e aprovadas: sem efeito retroativo.
- Mais usados em propostas abertas (custo legado): CRM-9116C102 (membrana de osmose, 4 propostas), CRM-843975D6, CRM-176FC4A8,
  CRM-701B8253 (4 cada), CRM-216DE12A, CRM-3C6522D6 (3 cada), TRX-528-P (o do caso, 2). Sem custo e de maior valor nas prontas:
  VL001 (videolaringoscópio, 3 propostas, R$ 72.800), NI1760/300 (R$ 100.800), 2563356 (R$ 79.000), ISRN-220, 31107, 020, QUA-006.

## 5. Testes

Novo `tests/comercial-custos-cotacao.test.cjs` (11, todos passando):
C1 sem anexo recusa (cadastro da gestão e da vendedora, atualização; sem fornecedor, sem validade, data futura, cotação vencida, além
do teto, arquivo falso, extensão errada, vendedora atualizando; edição sem custo mantém o custo) · C2 versão, validade, SHA, arquivo
conferido, substituição e histórico; vendedor vê só o selo · C3 preço abaixo do novo piso sinalizado (R$ 21.467 do caso real), aviso
sem R$, preço inalterado, painel · C4 vencido bloqueia a conclusão; gestor não aprova; Diretoria aprova; registro do item · C5
reconferência pega o que venceu depois da conclusão; tela mostra "venceu" e "custo subiu" · C6 legado sem anexo vai para a Diretoria na
próxima conclusão; pronta antiga não é barrada; custo mudado por fora volta a "sem cotação" · C7 vencendo avisa uma vez (e-mail
pendente, sem R$), vencido em proposta aberta vira atividade, regra e responsáveis configuráveis, teto por categoria · C8 pedir
atualização do custo (aviso, atividade, histórico, sem repetir, só o responsável) e conclusão pronta depois · C9 guia: mínimo e
sugerido, vendedor sem custo, gestão com custo e sobra, totais das opções, quem aprova, alçada; aplicar mínimo e sugerido · C10 item
sem custo e desconto acima da alçada com o efeito · tela e ajuda.

Placar (`rodar-custos.cjs`: `tests/comercial*.test.cjs`, `compras*.test.cjs`, `poderes-lote0.test.cjs`, FASE=candidato):

| | Arquivos | Passam | Falham |
|---|---|---|---|
| Antes (`custos-antes-candidato.txt`) | 27 | 266 | 13 |
| Depois (`custos-depois-candidato.txt`) | 28 | 277 | 13 |

As 13 falhas são exatamente as mesmas de antes (nomes idênticos): c4-entrada 1, catálogo oficial 3, compras-acesso-financeiro-delegado 7,
compras 2. Nenhuma falha nova. Um teste antigo (B1 das brechas) pegou uma troca de redação: a frase original foi mantida.
`node --check` sem erro nos 6 `.js` alterados; o script de `JS_Comercial.html` compila.

Navegador (`custos-navegador.cjs`, Chrome headless, **página completa** `Index.html` com os `include()` resolvidos, 1280 e 390 px):
gestão — catálogo avisa os custos a atualizar, painel lista e prioriza, "Atualizar custo" recusa sem anexo com o que fazer;
vendedora — passo 4 com mínimo e sugerido sem custo e as quatro opções, "Pedir atualização do custo" avisa, "Ajustar para o mínimo"
grava R$ 21.467; sem rolagem lateral; sem erro de script. Resultado: `custos-navegador.txt`; telas: `custos-telas/`.

## 6. Plano de saneamento sugerido ao dono

1. **Antes de publicar (urgente):** atualizar com cotação os itens das propostas PRONTAS e dos RASCUNHOS ativos de novembro
   (`custos-saneamento-prioridade.csv`, ordenado por número de propostas abertas e valor). Começar pelos sem custo de maior valor nas
   prontas (VL001, NI1760/300, 2563356, ISRN-220, 31107, serviços 020 e QUA-006) e pelos com custo legado mais repetidos.
2. **Rascunhos antigos:** 95 dos 98 rascunhos são ORC- (agosto a outubro) importados do CRM. Pedir à equipe que cancele ou exclua os que
   não vão seguir; isso reduz os 271 itens a sanear.
3. **Semana 1 após publicar:** a gestão escolhe os responsáveis (sugestão: gestão comercial + Financeiro) e o teto por categoria
   (ex.: peças 60 dias, equipamentos 30 dias se o câmbio pesar). O painel "A atualizar usados em propostas abertas" vira a fila diária.
4. **Demais 600+ itens com custo legado:** só quando forem usados (a proposta mostra "Pedir atualização do custo"); arquivar os que
   não vendem há mais de 12 meses.
5. **Comunicar a equipe:** depois da publicação, toda conclusão com item de custo antigo vai para a Diretoria até o custo ser
   atualizado; o passo 4 mostra o que fazer.

## 7. Limites e pontos para decisão

- Não publicado; nada foi conferido no servidor real. Antes de publicar: conferir a produção contra `producao/legado` (a correção de
  10/11 ainda não está lá; esta depende dela) e publicar as duas juntas.
- Responsável de Compras sem perfil Financeiro/gestão não grava custo (permissão mantida, como pedido). Se o dono quiser o comprador
  como responsável, é preciso dar a ele o catálogo completo (mudança de permissão para decidir).
- A junção de itens repetidos (Cadastros > Correções) e a importação do CRM podem mudar o CUSTO sem cotação; o sistema detecta
  (o valor não confere com a versão → "sem cotação"), mas não pede a cotação nesses caminhos.
- Valores de padrões e consumíveis da ficha de custo não exigem cotação (a ficha inteira fica isenta).
- O guia usa o custo atual do catálogo e a unidade emissora da proposta; o item avulso não tem mínimo nem sugerido.
- Licitações tem precificação própria e não foi alterada.
- O efeito do desconto para o vendedor é descrito em texto (sem percentual de sobra); a gestão vê os percentuais.
