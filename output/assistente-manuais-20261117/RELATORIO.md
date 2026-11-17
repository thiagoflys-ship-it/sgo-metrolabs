# Assistente "Tire sua dúvida": manuais restritos por tela e parágrafos em duas versões (17/11/2026)

<div style="text-align: justify">

Cópia de trabalho: `output/financeiro-20261116/candJ`, idêntica à produção `documentos-pastas-20261117` antes deste trabalho. Nada foi publicado, nada foi lido nem gravado no servidor ou no banco e nenhum commit foi feito. A base de partida foi a da candJ (`SGO_AssistenteManuais.js`, versão `1d9bc25bba23`), conferida igual ao que o gerador produz do `docs/` atual. Ela foi guardada em `SGO_AssistenteManuais.antes.js`, e os manuais de antes estão em `docs-antes/`.

## Resumo

1. **Decisão 1 do dono.** Os três manuais que ficavam fora da base entraram, cada um só para quem abre a tela correspondente: Painel financeiro, Ganhos dos vendedores e Portal do cliente (interno). Quem não tem o acesso não recebe nada do manual, nem o título. O que é da lista de sigilo nem entra na base de quem está fora dela. Por isso o vocabulário, a correção de digitação e a estatística da busca dessa pessoa também não "conhecem" o texto.
2. **Decisão 2 do dono.** Onze pares de parágrafos em duas versões foram conferidos no código da tela atual. Em cada par ficou a versão correta, ou as duas juntas quando ambas eram verdadeiras e complementares, e a outra saiu do `docs/`.
3. Base nova: 48 manuais e 1.364 seções, versão `e99b728d6360`. A base anterior tinha 45 manuais e 1.273 seções. Nenhum parágrafo da base anterior se perdeu sem justificativa (teste 6).

Placar: ver o fim.

## 1. Regra de acesso de cada manual

### Mecanismo

- **Gerador** (`_tools/gerar_base_assistente.cjs`): os três manuais saíram de `IGNORAR` e entraram no `MAPA` com `acesso`. Cada seção pode ganhar uma regra própria com a marca `<!-- assistente: acesso=... -->`. Abaixo de um `##`, a marca vale para a seção e para as subseções dela; abaixo de um `###`, vale só para aquela subseção. A marca é um comentário: não aparece no manual nem no texto da base. Uma regra desconhecida (erro de digitação na marca) faz o gerador parar com erro, para que uma palavra errada nunca abra uma seção a todos. As regras aceitas são `sigilo`, `sigilo_diretoria`, `ganhos` e `portal_contratos`.
- **Assistente** (`SGO_Assistente.js`):
  - **Três bases**, cada uma guardada por 10 minutos: a geral, a da Diretoria e do dono fora da lista (`D`) e a da lista de sigilo (`S`). O que é `sigilo` só entra na base `S`, e o que é `sigilo_diretoria` só entra nas bases `D` e `S`.
  - **Conferência por pessoa** (`SGO_ASSIST_ACESSO_MANUAL`, função `SGO_Assist_acessoManual_`): em `SGO_Assist_situacao_`, todo trecho com regra é conferido para quem pergunta. Sem o acesso, a função devolve `null`: o trecho não chega à resposta, nem às fontes, nem à IA, nem à explicação de erro, que usa a mesma função. Cada conferência roda uma vez por pergunta e só quando um trecho restrito aparece. Um erro na conferência fecha o acesso.
  - **Os demais manuais do Financeiro** (Compras financeiro, Conciliação Caju) e a ajuda das telas do Financeiro continuam fora de todas as bases, como antes.

### Quem lê o quê

| Manual / seção | Regra | Quem lê (padrão) | Conferência no código |
|---|---|---|---|
| Painel financeiro (todo o manual) | `sigilo` | Só a lista `OMIE_SIGILO_CONTAS` (hoje admin, charles e wanessa). O perfil Financeiro fora da lista não lê. | `Omie_contaNoSigilo_` (SGO_Omie_Sigilo.js:52) |
| Ganhos dos vendedores (parte de uso) | `ganhos` | Quem vê a tela: alguma caixa GANHOS_* (Financeiro e Diretoria pelo padrão, ou exceção dada em Acessos), contrato de ganhos próprio ou vendedor da equipe comercial | `GV_veTela_` (novo, SGO_Ganhos_Vendedores.js), a mesma regra que a tela usa em `iniciar` |
| Ganhos > "Exemplo com o contrato da Mônica" | `ganhos` + `sigilo_diretoria` | Lista de sigilo, Diretoria e o dono | perfil DIRETORIA, `Chaves_ehDonoUsuario_` |
| Ganhos > "Recebimentos do Omie (15/11/2026)" | `ganhos` + `sigilo` | Só a lista de sigilo (além disso, todo texto sobre o Omie já era só da lista) | `Omie_contaNoSigilo_` |
| Portal do cliente, manual interno (parte de uso) | `portal_contratos` | Caixa PORTAL_CLIENTE_CONTRATOS_VER (padrão: Administrador, Diretoria, gestores e gestão comercial; exceções de Acessos valem) | `PCl_pode_(PCl_eu_(sessão), 'PORTAL_CLIENTE_CONTRATOS_VER')`, que já recusa cliente e representada |
| Portal > 17 (reajuste automático), 19.1 (Painel financeiro), 21.1 (problemas do reajuste), 22.1 (campos do reajuste) | `portal_contratos` + `sigilo` | Quem tem a caixa **e** está na lista de sigilo | as duas acima |
| Conta de cliente | — | Não usa o assistente: a recusa "é da equipe interna" vem antes de qualquer base (já existia) | `SGO_Assist_eu_` |

Sem os módulos carregados (teste isolado), vale o padrão por perfil de cada tela: Ganhos para Administrador, Diretoria, Financeiro e Comercial; Portal para Administrador, Diretoria e Gestor.

### O que mudou no texto dos manuais para separar as partes

O sentido não mudou: as partes restritas foram para seções próprias, marcadas.

- `MANUAL_GANHOS_VENDEDORES.md`: as faixas e o exemplo numérico do contrato da Mônica saíram da regra geral e foram para a subseção "Exemplo com o contrato da Mônica (Financeiro e Diretoria)". A regra geral ficou: "faixa cheia" e "'Até' inclui o próprio valor", sem números de contrato. "Recebimentos do Omie" virou subseção. O passo 4 do cadastro do contrato descreve o quadro "Modelo disponível", que aparece no formulário (JS_GanhosVendedores.html:459).
- `SGO_Ajuda_GanhosVendedores.js` (ajuda "Como usar esta tela", que o assistente também lê): o exemplo com as faixas do contrato da Mônica e o passo "Para a Mônica..." saíram. Entraram a regra do limite da faixa, a frase "o contrato de cada vendedor é sigiloso: o vendedor vê só o próprio; o Financeiro e a Diretoria veem todos" (a mesma regra de `GV_exigirVer_`) e o quadro "Modelo disponível". Sem essa troca, o vendedor recebia as faixas da Mônica pela ajuda da tela.
- `MANUAL_MODULO_PORTAL_CLIENTE.md`: §17 marcada. A linha "Painel financeiro" da tabela §19 virou a subseção 19.1. As quatro linhas do reajuste da §21 viraram a 21.1. O campo do reajuste da §22 virou a 22.1. Nenhuma seção de uso cita o Painel financeiro nem a lista de sigilo.
- `MANUAL_ASSISTENTE_DUVIDAS.md` e `SGO_Ajuda_Assistente.js`: dizem quem lê cada um dos três manuais (regra "manual em toda tela"). Esses textos estão na base geral. Por isso falam em "o manual do Financeiro" e "Financeiro autorizado", sem citar o Painel financeiro junto da lista de sigilo, que é o que o teste da onda 2 protege. Na primeira rodada da suíte eles citavam, e o teste E1 recusou com razão (ver o placar).

### Teste `financeiro-onda2-e1e5`

O teste "nada do Financeiro na base geral" foi ajustado, com comentário datado, sem ficar mais fraco. Ele confere agora a base geral **e** a da Diretoria fora da lista (`''` e `D`). Nenhuma das duas tem trecho do Painel, da ajuda do Financeiro ou dos manuais de Compras financeiro e Conciliação Caju, nem texto com "Painel financeiro" e "lista de sigilo" juntos, nem seção marcada `sigilo`. Os manuais do Portal e dos Ganhos não citam o Painel financeiro nem os recebimentos do Omie. Só a base `S` tem o Painel, todo marcado `sigilo`. A ajuda das telas do Financeiro e os outros manuais do Financeiro continuam fora até da base `S`.

O teste 6 de `assistente-ia-eficaz-20261117` exigia o Painel e os Ganhos em `IGNORAR`. Ele passou a exigir a regra nova (comentário datado): o Painel fica fora da base geral e dentro da base da lista.

## 2. Parágrafos em duas versões: pares resolvidos

Ferramenta: `pares-duplicados.cjs`. Para cada parágrafo recuperado da produção, ela acha o parágrafo mais parecido do mesmo manual (`pares-duplicados.json`). Os parágrafos recuperados que não têm par no `docs/` (seções novas da Cadeia de Frio, do Comercial, da Gestão, da Matriz de avisos, de Minhas atividades, da Estufa, de Compras e da Frota) foram conferidos e ficaram. Eles trazem informação que só existe ali, coerente com o código (por exemplo, "Quadro de relatórios" e "Biblioteca de POPs" estão em JS_CadeiaFrioRelatorio.html:130 e :163).

| # | Manual / assunto | Versões | Decisão | Evidência no código (candJ) |
|---|---|---|---|---|
| P1 | Cadeia de Frio, "O que mudou em 22/10": registrador vencido | `docs/`: "toque em Editar e atualize número, validade e PDF"; produção: "Novo certificado", anexar o PDF, ler com IA | **Produção** (juntada ao item da lista; o parágrafo solto saiu, e a primeira frase dele repetia o item "Conferência enquanto preenche") | JS_Padroes_Documentos.html:522 (o formulário de edição tira CERTIFICADO_NUMERO e VALIDADE), :529 ("não mudam aqui... Use a aba Novo certificado"), :435 (botões "Novo certificado" e "Cadastro e validade") |
| P2 | Cadeia de Frio, "O que mudou em 21/10": documentos e travas | `docs/`: lista com "evento começando com sensor fora da faixa" entre as travas; produção: o mesmo texto corrido, sem essa trava, com "a conferência distingue erros que impedem a emissão de estudos inconclusivos" | **As duas juntas na lista**: a trava saiu e entrou a frase do inconclusivo; o parágrafo corrido saiu | SGO_CadeiaFrioRel_Engine.js:542-545 (sensor fora da faixa no início = INCONCLUSIVO); SGO_CadeiaFrioRel_Qualificacao.js:241-286 (as travas não incluem esse caso) e :421 ("Não avaliável. Repita o estudo após estabilização.") |
| P3 | Cadeia de Frio, "Erros comuns": linha do registrador | `docs/`: "Editar, atualize..."; produção: "Novo certificado... leia com IA" | **Produção** (na linha da tabela; a linha solta saiu) | igual a P1 |
| P4 | Cadeia de Frio, "Quando aparece Inconclusivo" × linha "No início do evento havia sensor fora da faixa" | `docs/`: mensagem de trava ("marque o início depois..."); produção: inconclusivo, conservar as leituras | **Produção**: a linha virou "O estudo de porta ou energia ficou Inconclusivo", com o motivo e o que fazer | A mensagem "No início do evento havia..." não existe mais no código (busca vazia); Engine.js:542-545; Qualificacao.js:421 e :431 |
| P5 | Comercial, Precificação: linha do Incentivo de Missão | `docs/` (tabela): "executantes x missões; missões = menor entre O.S. previstas e viagens"; produção: "executantes x viagens x valor" | **`docs/`**; a linha da produção saiu | SGO_Comercial_Precificacao.js:778 (quantidade = executantes x missões) e :815 (uma por O.S. prevista) |
| P6 | Comercial, "Catálogo pela equipe comercial" | `docs/`: lista; produção: o mesmo texto corrido, mais o que mudou em 11/11 (GS06 na hora para a Diretoria; janela "Decidir o preço" com a conta completa, as opções e o "Ver a conta deste preço") | **As duas juntas na lista**; o texto corrido saiu | SGO_Comercial_Propostas.js:183-188 (GS06), :502 ("Ver a conta deste preço"), :512-513 (aprovar com o sugerido ou com o mínimo), :526 (histórico do item); JS_Comercial.html:3614 ("Aprovar com outro preço") |
| P7 | Comercial, "Problemas comuns" | `docs/`: lista completa, com "o deslocamento, em item próprio ou diluído, não muda a sobra"; produção: o mesmo texto corrido com "a viagem diluída entra nela" | **`docs/`**; o texto corrido saiu | SGO_Comercial_Precificacao.js:73 e :96 (repasse e diluído fora da sobra, desde 13/11/2026) |
| P8 | Representação, linha de versão | `docs/` sem e produção com "imagens e vídeos do pedido e do chamado" | **As duas juntas** no cabeçalho; a seção "Introdução" repetida saiu | a seção "Imagens e vídeos" existe e descreve a tela (JS_Representacao.html, galeria) |
| P9 | Representação, "Primeira configuração", item 2 (prazos) | `docs/`: com relatório e avaliação de 2 dias úteis; produção: com "= 3 dias úteis" na tela e 570 minutos por dia | **As duas juntas** no item 2; o item repetido saiu | JS_Representacao.html:1068 (dica "= " + prazo); SGO_Representacao_Config.js:109 e :220 (1710 = 3 x 570) |
| P10 | Representação, régua de prazos | produção: seção em lista; `docs/`: seção 6.3 em tabela, com tudo da lista e mais (peça dispensada, ações de cada lado, RP06, chamados antigos) | **`docs/` (6.3)**; a seção em lista saiu | SGO_Representacao_Regua.js:9-24 (as cinco etapas como na tabela) |
| P11 | Representação, "Prazo de atendimento do chamado da representada" | produção: "Atenção: o SGO+ conta esse prazo até a conclusão do atendimento, não até o agendamento" e "chamado comum ligado depois mantém o prazo" (repetida da 6.3); 6.3: o selo segue a etapa da régua | **6.3**. A frase "Atenção" (de antes da régua) virou a remissão "etapa 1 da régua, até o atendimento agendado: seção 6.3"; a frase repetida saiu; o resto da seção (prazo gravado, prioridade, mudança de prazo, dias úteis) ficou | SGO_Assistencia_Config.js:1160 (o prazo do chamado da representada vem de `RepR_slaEstado_`); SGO_Representacao_Regua.js:10 (etapa 1 cumprida ao ir para "Agendado") |

**Achado fora do escopo, não corrigido.** As mensagens de registrador vencido do servidor ainda mandam "clique em Editar, atualize o número do certificado, a validade e o PDF". Hoje isso não é possível na tela de Padrões. Os pontos são SGO_CadeiaFrioRel_Qualificacao.js:314, SGO_AutoRel_CertificadoRelatorio.js:102, SGO_EstufaBanhoRel_Qualif.js:487, SGO_LavRel_CertificadoRelatorio.js:94 e a ajuda SGO_Ajuda_Qualificacao.js:414. O manual da Cadeia de Frio agora explica "onde corrigir" com o caminho certo ("Novo certificado"). Recomendo trocar o texto dessas cinco mensagens numa entrega própria, porque são quatro módulos e as suítes deles.

## 3. Testes

- **Novo** `tests/assistente-manuais-acesso-20261117.test.cjs` (6 testes). Ele usa o código real do assistente, a base gerada, a ajuda das telas, SGO_Ganhos_Vendedores.js, SGO_PortalCliente*.js e SGO_Omie_Sigilo.js, com 10 pessoas de teste:
  1. o gerador e as marcas: a marca desconhecida é recusada; a herança `##`/`###`; a base igual ao `docs/`; Mônica só em `sigilo_diretoria`; Omie em `sigilo`; nada do Painel ou da lista de sigilo em seção de uso do Portal;
  2. quem lê cada manual: Painel = exatamente a lista; Ganhos = admin, Fabi, Dora, Felipe, Davi e a vendedora (sem o técnico e os gestores); Portal = admin, Diretoria e gestores técnico e comercial (sem o Financeiro, a vendedora e o técnico); seções restritas; quem está fora da lista nem tem o Painel na base;
  3. de ponta a ponta pela pergunta (resposta, fontes e passos), mais a recusa da conta de cliente;
  4. sem os módulos vale o padrão da tela, e um erro na conferência fecha;
  5. nenhum parágrafo recuperado repete outro do mesmo manual (85% das palavras ou mais), e as versões descartadas de P1 a P11 não voltam;
  6. nenhum parágrafo da base anterior se perdeu: cada um está igual na base nova, ou 95% contido em outro (a divisão em partes mudou), ou na lista de saídas justificadas (P1 a P11).
- `financeiro-onda2-e1e5` e `assistente-ia-eficaz-20261117`: ajustados como descrito na seção 1.
- Lista pedida (`rodar-lista.sh`): assistente-duvidas 12/0, assistente-ia-eficaz-20261117 12/0, financeiro-onda2-e1e5 12/0, ajuda-sem-recurso-admin 1/0, assistente-manuais-acesso-20261117 6/0. Também os que leem os manuais e as ajudas mexidos: ganhos-vendedores 12/0, ganhos-omie-20261115 6/0, comercial-* (8 arquivos) sem falha, contratos-vigencia-reajuste-20261117 10/0, portal-cliente-etapa0-20261117 11/0, representacao-regua-prazos 9/0, documentos-celular 9/0, cadeiafrio-motor 15/0.

## 4. Arquivos alterados

Legado (`output/financeiro-20261116/candJ`), com o fim de linha de cada arquivo preservado e conferido:
- `SGO_Assistente.js` (CRLF): regras de acesso, três bases e conferência por pessoa;
- `SGO_AssistenteManuais.js` (LF): regerada do `docs/`;
- `SGO_Ganhos_Vendedores.js` (LF): `GV_veTela_`, a mesma regra de antes, agora usada pela tela e pelo assistente;
- `SGO_Ajuda_GanhosVendedores.js` (LF): sem os dados do contrato da Mônica;
- `SGO_Ajuda_Assistente.js` (CRLF): pergunta nova sobre os manuais restritos.

Repositório:
- `_tools/gerar_base_assistente.cjs`;
- `docs/`: `MANUAL_GANHOS_VENDEDORES.md`, `MANUAL_MODULO_PORTAL_CLIENTE.md`, `MANUAL_ASSISTENTE_DUVIDAS.md`, `MANUAL_MODULO_CADEIA_FRIO.md`, `MANUAL_MODULO_COMERCIAL.md` e `MANUAL_MODULO_REPRESENTACAO.md` (este com CRLF e LF misturados, preservados);
- testes: novo `tests/assistente-manuais-acesso-20261117.test.cjs`; alterados `tests/financeiro-onda2-e1e5.test.cjs` (CRLF) e `tests/assistente-ia-eficaz-20261117.test.cjs`.

Ferramentas e evidências (`output/assistente-manuais-20261117/`): `patch_*.py` e `docs_util.py` (as trocas exatas, reaplicáveis), `pares-duplicados.cjs/.json`, `comparar-bases.cjs` e `comparacao-bases.json`, `SGO_AssistenteManuais.antes.js`, `docs-antes/`, cópias `.antes` dos arquivos do legado, `suite.txt` e `suite-execucao.log`.

**Para publicar:** a camada é a lista do legado acima, sobre a imagem `documentos-pastas-20261117`. A importação do servidor regenera `SGO_AssistenteManuais.js` a partir do `docs/` que vai junto. Ela precisa do `docs/` e do gerador deste trabalho: sem o gerador novo, os três manuais voltam para fora, e com um gerador antigo e o `docs/` novo as marcas não valeriam. Antes de publicar, confira o hash da produção, como sempre.

## Riscos

- **Três bases em vez de uma.** A primeira pergunta de quem é da lista de sigilo, ou da Diretoria fora dela, em cada janela de 10 minutos monta a base daquele nível. No teste local, cada montagem leva alguns segundos, o mesmo custo da base geral, que já existia. São poucas pessoas.
- **Conferência de Ganhos e Portal.** Ela lê o cadastro e as caixas da pessoa uma vez por pergunta, e só quando um trecho desses manuais aparece na busca.
- **A ajuda da tela de Ganhos mudou o texto que todos os usuários da tela leem**: saíram as faixas da Mônica. O cadastro do contrato continua mostrando o quadro "Modelo disponível" a quem tem a caixa de contratos, como antes.

## Placar

Referência: `output/documentos-pastas-20261117/suite.txt`, com 2426 aprovados e 0 falhas em 254 arquivos.

Rodada completa (`suite.txt`, 255 arquivos): **2430 aprovados e 2 falhas**.
- `financeiro-onda2-e1e5` E1: falha verdadeira. O texto novo do manual do assistente citava "Painel financeiro" e "lista de sigilo" na base geral. O texto foi reescrito (patch_manual_assistente2.py) e o teste passou a dar 12/0 sozinho. O teste cumpriu o papel de proteger o sigilo.
- `email-outlook-20261117` (navegador): estourou o tempo com tudo rodando junto, como na rodada anterior. Sozinho deu 14/0. Este trabalho não mexeu no E-mail.

Depois da correção, foram rodados de novo os 5 arquivos do assistente e os outros 80 arquivos que leem a ajuda das telas, a base ou os manuais. Todos deram 0 falhas.

| Arquivo | Referência | Agora |
|---|---|---|
| assistente-manuais-acesso-20261117 (novo) | - | 6/0 |
| financeiro-onda2-e1e5 | 12/0 | 12/0 (ajustado, mais forte) |
| assistente-ia-eficaz-20261117 | 12/0 | 12/0 (teste 6 na regra nova) |
| assistente-duvidas | 12/0 | 12/0 |
| ajuda-sem-recurso-admin | 1/0 | 1/0 |
| email-outlook-20261117 | 14/0 | 14/0 sozinho (13/1 só na rodada completa, por tempo) |
| demais 249 arquivos | iguais | iguais |

Resultado: **2432 aprovados e 0 falhas** (2430 da rodada, mais as 2 conferidas sozinhas). Nenhum arquivo piorou.

</div>
