# Falhas antigas da suíte do SGO+ — 17/11/2026

Cópia de trabalho: `output/financeiro-20261116/candG` (idêntica à produção email-outlook-20261117 antes deste trabalho).
Cópia de antes, para comparar: `output/falhas-20261117/candG-antes` e `output/falhas-20261117/tests-antes`.
Nada foi publicado, nada foi gravado no servidor nem no banco, nenhum commit foi feito.

## Resumo

- Placar de referência (`output/email-melhorias-20261117/suite.txt`): 63 falhas antigas em 26 arquivos.
- Depois: 2402 aprovados / 2 falhas em 252 arquivos; das 63 falhas antigas, 61 resolvidas e 2 deixadas de propósito (dono e impedimento) (`output/falhas-20261117/suite.txt`).
- Defeitos reais do sistema achados: **3**.
  1. **Corrigido (A):** simulador da Estufa/Banho-maria (relatório interno). A produção voltou para a versão anterior à correção de 04/11/2026: "Forçar Aprovado/Reprovado" não controlava o resultado em três perfis, a secadora e o Anexo E ignoravam a escolha, e a prévia podia sair diferente do documento. A auditoria de 06/11 já tinha visto essa regressão; a recuperação ficou preparada e não foi publicada. Reaplicada na candG (14 falhas).
  2. **Não corrigido, depende do dono:** "o responsável pelo sistema só recebe atividade lançada por ele mesmo" (pedido do dono de 26/10/2026). A regra sumiu do código em produção (antes de 06/11), mas a ajuda da tela ainda a descreve (1 falha). Pergunta no fim.
  3. **Não corrigido, falta a fonte:** a base do assistente "Tire sua dúvida" (`SGO_AssistenteManuais.js`) em produção não bate com os manuais de `docs/`. Para 24 manuais o assistente responde com texto antigo, e a produção também tem trechos que não existem em nenhum manual local (1 falha). Detalhe no fim.
- Achado menor, sem falha de teste e não corrigido porque o Comercial deve ficar idêntico à produção: no catálogo oficial, `CAL-011` (centrífuga) aparece entre `QUA-001-QO` e `QUA-001-QD`. O `L.splice(13, …)` de `SGO_Comercial_CatalogoOficial.js` foi escrito antes de existirem as 9 etapas QI/QO/QD. Afeta só a ordem da lista. Corrigir quando o Comercial for mexido de novo: inserir depois de `QUA-003` pelo código, e não pela posição.

## Falha por falha

Classes: A = defeito real do sistema; B = teste desatualizado por decisão já publicada; C = ambiente de teste; Dono = depende de decisão do dono.

| Arquivo | Teste(s) | Causa | Classe | O que foi feito |
|---|---|---|---|---|
| estufa-simulado (14) | 4 perfis × APROVADO/REPROVADO, prévia = documento, fingerprint, porta/energia, FD, falhas de entrada, sobreposição, documentos | Na produção, `SGO_EstufaBanhoRel_Simulador.js` é byte a byte a versão anterior à correção 9ab5ba18 (Codex, 04/11), e o `ConteudoModulo` não tem os controles da tela. Auditoria de 06/11: "regressão confirmada… recuperação NÃO publicada". | **A** | `Simulador.js` trocado pela versão corrigida, já que a produção era exatamente a de antes. No `ConteudoModulo.js` (mudado depois, em 11/11) entraram só os 4 trechos da correção, por âncora única. Conferido: o conjunto de mudanças é idêntico ao da correção (mesmo md5 do word-diff). Script: `output/falhas-20261117/reaplicar-estufa-simulado.py`. A avaliação de leituras reais não foi mexida. Ajuda: o texto da própria tela foi atualizado junto, porque faz parte da correção. Manual: o relatório interno é recurso de administração e não aparece no manual do operador. |
| certcal-instrumentos (9), certcal-proxima-backend (2), documento-revisao-geradores (2), certcal-cadastros-cruzados (1), certcal-acesso-executor (1) | emissão do certificado e do laudo NR-13 | Desde 11/11, a emissão chama `CadQ_exigirVinculosCompletos_` (`SGO_CadastroQualidade.js`), que esses ambientes não carregam: `ReferenceError`. | C | Stub que aprova, igual ao de `_autoclave_ambiente.cjs` e `_baixatemp_ambiente.cjs` (comentário datado). A trava em si é testada em `cadastro-qualidade.test.cjs`. Em `_docrev_ambiente.cjs`, o stub vale também para documento-revisao e pgtpop-*, que continuam verdes. |
| compras-acesso-financeiro-delegado (7) | delegação financeira de Compras | Testava a lista `financeiros` das Regras de compras (Codex, 04/11). Ela foi publicada e depois perdida (regressão vista em 06/11). Por decisões posteriores do dono, esse modelo foi substituído pelas caixas do lote 3 (15/11) e pelo SIGILO do Financeiro (16/11): só a lista de sigilo, acima das caixas. Restaurar a lista antiga abriria o Financeiro de Compras a quem está fora do sigilo. | B | As mesmas 7 garantias foram reescritas sobre o mecanismo atual, com o código real e as 23 contas reais: lista de sigilo (só o dono altera) + caixas FIN_*. Perfil, área e alçadas intactos; o delegado cadastra cartão e confere; o gestor não se amplia; a tela antiga com "financeiros" não dá nem tira acesso; a lista recusa conta inativa ou de fora; destinatários dos avisos = Financeiro da lista; retirar da lista revoga na hora. Ver a pergunta 2. |
| matriz-avisos (4) | resumo do dia (e-mail e WhatsApp), Meus avisos, piloto | O resumo do dia passou a listar as correções de cadastro (`CadQ_historico_`), e `_matriz_ambiente.cjs` não carregava `SGO_CadastroQualidade.js`. A rodada inteira caía com ReferenceError e nenhum resumo saía. | C | `SGO_CadastroQualidade.js` (real) entrou no ambiente. Os outros 9 arquivos que usam esse ambiente continuam verdes. |
| licitacoes, _analise, _contratos, _disputa, _habilitacao (1 de 2), _mercado, _painel, _pareceres, _proposta (2), _ramo (11 no total); comercial-c4-entrada-mercado (1) | "arquivo em CRLF" | No contêiner (fonte da verdade), boa parte do legado está em LF desde antes de 10/11. Os testes exigiam CRLF, que é o formato do repositório. | C | Auxiliar novo `tests/_terminacao.cjs`: o arquivo precisa ter fim de linha **uniforme** (todo CRLF ou todo LF, nunca misturado), que é o risco real (edição por script que falha em silêncio). O fim de linha CRLF dos próprios testes foi preservado. |
| licitacoes_habilitacao (1 de 2) | revisão MÉDIO 7 (teto dos avisos de documento) | O teste misturava o relógio do ambiente (02/11) com a data real. Com a data real, o CRF de validade 05/11 está vencido desde 06/11 e o aviso vira CANCELADO. | C | O teste passou a usar o relógio do ambiente (`a.relogio.agora`) no teto do dia e no envio. |
| cadeiafrio-motor (1) | evento iniciado com sensor fora da faixa | Regra publicada: em vez da trava `EVENTO_INICIADO_FORA_DA_FAIXA`, o estudo sai INCONCLUSIVO, com "Não avaliável. Repita o estudo após estabilização." (Engine/Qualificação de produção; base do assistente "Quando aparece Inconclusivo"). | B | O teste confere a regra nova: sem a trava, estudo e laudo INCONCLUSIVO, tempo-alvo não avaliado, critério "Sensores na faixa no início" não conforme com S2. "Início fora dos dados vira trava" continua conferido. |
| cadastro-equipamento-campos (1) | criar e editar no cadastro | O teste não carregava `SGO_textoFalhaOperador_` (`SGO_Clientes.js`), nem a Qualidade do cadastro (`CadQ_nomeSessao_`, `CadQ_registrar_`…), que `SGO_Equipamentos.js` usa. | C | Os dois arquivos reais entraram no contexto do teste. |
| comercial-catalogo-oficial (3) | implantação, sobra, reajuste | Na tabela publicada, além dos 26 serviços com preço do dono, há 9 etapas QI/QO/QD avulsas (QUA-001, QUA-002 e QUA-005, `REGRA_PRECO` NEGOCIADO, preço 0). Elas estão no código e no cadastro real (`output/poderes-20261110/precos-dump.txt`). | B | Contagens 35/36, e as 9 etapas conferidas uma a uma (NEGOCIADO, preço 0, catálogo oficial, ativas). Os 26 preços do dono continuam conferidos. Comercial não foi alterado. |
| comercial-catalogo-equipe-exclusao (1) | pedido de preço abaixo da alçada | Decisão do dono de 11/11 (no código de `SGO_Comercial_Propostas.js`): preço abaixo do MÍNIMO do item só a Diretoria aprova. | B | A gestão é recusada com a mensagem exata e nada é gravado; a Diretoria aprova; o histórico registra a Diretoria. |
| deposito-viagem (1) | página completa: scripts válidos | Desde 12/11, o Index.html tem o marcador `<?!= JSON.stringify(…) ?>` da versão das telas, que o servidor troca. A montagem do teste só trocava os includes. | C | A montagem troca o marcador por `""` (o formato que o servidor imprime). Os 88 `<script>` compilam. |
| assistente-duvidas (1 de 2) | casca: balão idêntico ao do COMMAND | COMMAND descontinuado pelo dono em 27/10. O balão do SGO+ seguiu sozinho (ordem cronológica 09/11, Voltar fixo 11/11, documentos 16/11). | B | No lugar da igualdade com o COMMAND parado, o teste confere que o balão mantém as três entregas. Núcleo e componente seguem idênticos e conferidos. |
| assistente-duvidas (1 de 2) | base regerada: manuais em dia | Ver o item 3 do resumo. | A, bloqueado | Não alterado. Ver "Pendências". |
| atividades-equipe-avisos (1) | responsável pelo sistema só lança para si | Ver o item 2 do resumo. | Dono | Não alterado. Ver a pergunta 1. |

## Arquivos alterados

Legado (candG), 2 arquivos, CRLF preservado:
- `output/financeiro-20261116/candG/SGO_EstufaBanhoRel_Simulador.js`
- `output/financeiro-20261116/candG/SGO_EstufaBanhoRel_ConteudoModulo.js`

Testes (fim de linha de cada arquivo preservado):
- novo: `tests/_terminacao.cjs`
- ambientes: `tests/_docrev_ambiente.cjs`, `tests/_matriz_ambiente.cjs`
- `tests/assistente-duvidas.test.cjs`, `tests/cadastro-equipamento-campos.test.cjs`, `tests/cadeiafrio-motor.test.cjs`,
  `tests/certcal-acesso-executor.test.cjs`, `tests/certcal-cadastros-cruzados.test.cjs`, `tests/certcal-instrumentos.test.cjs`,
  `tests/certcal-proxima-backend.test.cjs`, `tests/comercial-c4-entrada-mercado.test.cjs`, `tests/comercial-catalogo-equipe-exclusao.test.cjs`,
  `tests/comercial-catalogo-oficial.test.cjs`, `tests/compras-acesso-financeiro-delegado.test.cjs` (reescrito), `tests/deposito-viagem.test.cjs`,
  `tests/licitacoes.test.cjs`, `tests/licitacoes_analise.test.cjs`, `tests/licitacoes_contratos.test.cjs`, `tests/licitacoes_disputa.test.cjs`,
  `tests/licitacoes_habilitacao.test.cjs`, `tests/licitacoes_mercado.test.cjs`, `tests/licitacoes_painel.test.cjs`, `tests/licitacoes_pareceres.test.cjs`,
  `tests/licitacoes_proposta.test.cjs`, `tests/licitacoes_ramo.test.cjs`

Ferramentas deste trabalho (em `output/falhas-20261117/`): `rodar-tap.sh`, `editar-crlf.cjs`, `reaplicar-estufa-simulado.py`.

Para publicar a correção da Estufa: a camada é só esses 2 arquivos do legado sobre a imagem email-outlook-20261117. Antes de publicar, conferir o hash da produção, como sempre.

## Placar, arquivo a arquivo

| Arquivo | Antes (aprovados/falhas) | Depois |
|---|---|---|
| estufa-simulado | 7/14 | 21/0 |
| certcal-instrumentos | 2/9 | 11/0 |
| compras-acesso-financeiro-delegado | 0/7 | 7/0 |
| matriz-avisos | 15/4 | 19/0 |
| comercial-catalogo-oficial | 14/3 | 17/0 |
| licitacoes_proposta | 20/2 | 22/0 |
| licitacoes_habilitacao | 24/2 | 26/0 |
| documento-revisao-geradores | 4/2 | 6/0 |
| certcal-proxima-backend | 4/2 | 6/0 |
| assistente-duvidas | 10/2 | 11/1 |
| licitacoes_ramo | 9/1 | 10/0 |
| licitacoes_pareceres | 20/1 | 21/0 |
| licitacoes_painel | 14/1 | 15/0 |
| licitacoes_mercado | 14/1 | 15/0 |
| licitacoes_disputa | 22/1 | 23/0 |
| licitacoes_contratos | 21/1 | 22/0 |
| licitacoes_analise | 27/1 | 28/0 |
| licitacoes | 12/1 | 13/0 |
| deposito-viagem | 21/1 | 22/0 |
| comercial-catalogo-equipe-exclusao | 7/1 | 8/0 |
| comercial-c4-entrada-mercado | 8/1 | 9/0 |
| certcal-cadastros-cruzados | 0/1 | 1/0 |
| certcal-acesso-executor | 4/1 | 5/0 |
| cadeiafrio-motor | 14/1 | 15/0 |
| cadastro-equipamento-campos | 7/1 | 8/0 |
| atividades-equipe-avisos | 12/1 | 12/1 |

Suíte completa: antes 2340/64 em 252 arquivos (63 falhas antigas + pendencias-memo-representada, já verde na candG); depois **2402/2** (`output/falhas-20261117/suite.txt`). Nenhum arquivo piorou (comparação automática arquivo a arquivo com o placar de referência).

## Pendências e perguntas ao dono

1. **Atividade para o responsável pelo sistema.** Em 26/10/2026 você pediu: "o responsável pelo sistema só recebe atividade lançada por ele mesmo; ninguém lança nem passa atividade para ele". A regra está no git e ainda aparece na ajuda da tela Minhas atividades ("é o responsável pelo sistema e só ele lança atividades para si"). Só que o código em produção não tem mais a trava: hoje a gestão consegue lançar ou passar atividade para você. Ela foi tirada à mão, antes de 06/11, por alguém que não deixou registro. **Pergunta: a regra continua valendo?** Se sim, eu a recoloco (`SGO_Atividades.js`: criar, trocar responsável e a lista de pessoas). Se não, tiro da ajuda e do teste.
2. **Delegação do Financeiro em Compras.** As Regras de compras reais ainda guardam `financeiros = [elisa, matheusgodoi]`, gravado em 04/11. O código atual ignora essa lista: pelo sigilo de 16/11, só admin, charles e wanessa veem o Financeiro de Compras. **Pergunta: Elisa e Matheus devem voltar a conferir compras e cadastrar cartões?** Se sim, o caminho é você incluí-los na lista de sigilo (Painel financeiro > Sigilo e acessos) e marcar as caixas FIN_CONFERIR_COMPRAS e FIN_CARTOES_EDITAR em Administração > Acessos. Se não, nada a fazer.
3. **Base do assistente "Tire sua dúvida" (impedimento, não é regra de negócio).** `SGO_AssistenteManuais.js` em produção (versão 0a0b5125a2fe) não foi gerado a partir de `docs/`. Em 24 manuais o `docs/` local é mais novo (por exemplo, o app de campo com "Quatro abas", de 12/11, e os e-mails de 17/11). A produção, por sua vez, tem trechos que não existem em nenhum manual local nem no git, como "Quando aparece Inconclusivo" (Cadeia de Frio) e "Diretoria informada, não cobrada" (Caixa de decisões). Gerar de novo a partir de `docs/` apagaria esses trechos, por isso não regerei. Para resolver: copiar a pasta de manuais que a produção usou (contêiner, `/app/docs` ou a de origem da imagem), juntar com `docs/` manual a manual e rodar `node _tools/gerar_base_assistente.cjs`. Isso exige ler a produção, o que esta tarefa não permitia. Também falta lugar no mapa do gerador para `MANUAL_GANHOS_VENDEDORES.md`, `MANUAL_MODULO_PORTAL_CLIENTE.md` e `MANUAL_PAINEL_FINANCEIRO.md`. O do Painel financeiro deve ficar fora do assistente geral (decisão da onda 2: "assistente geral sem manuais do Financeiro"). Para o de Ganhos dos vendedores, é preciso decidir quais perfis o leem.
