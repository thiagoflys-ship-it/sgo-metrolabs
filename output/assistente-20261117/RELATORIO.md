# Assistente "Tire sua dúvida" mais eficaz, regra das atividades e ordem do catálogo — 17/11/2026

Cópia de trabalho: `output/financeiro-20261116/candH` (idêntica à produção estufa-simulador-20261117 antes deste trabalho).
Nada foi publicado, nada foi lido nem gravado no servidor ou no banco, nenhum commit foi feito.

## Resumo

1. **Assistente (pedido do dono: "ajudar a buscar e entender o erro e orientar o usuário").**
   - **Base em dia sem perder nada.** A base nova (`SGO_AssistenteManuais.js`, versão `d8344a6d4cee`) é a união de todo o `docs/` atual com os trechos que só existiam na base de produção (`0a0b5125a2fe`). Foram recuperados **88 parágrafos** de 9 manuais (23 seções novas e 9 parágrafos ampliados ou acrescentados), gravados de volta em `docs/` com a marca de origem. A conferência automática dá **0 parágrafo da produção faltando e 0 parágrafo do `docs/` faltando**.
   - **Entender o erro.** O assistente reconhece **3.676 mensagens reais** do sistema, lidas do próprio código na hora, sem lista para manter. Ele explica cada uma em quatro partes (a mensagem, o que aconteceu, por quê e o que fazer), diz quem resolve quando depende de outra pessoa e oferece a tela certa. A casca guarda a última mensagem de falha. A faixa vermelha de erro ganhou o botão **"Perguntar ao assistente sobre este erro"**. Ao abrir, o assistente oferece **"Entender esta mensagem"**.
   - **Buscar melhor.** A busca ignora acento e maiúscula e tolera erro de digitação, com aviso de "Entendi X como Y". Ela entende o vocabulário da empresa, com 12 grupos (O.S./OS/ordem de serviço, CME, NR-13, QI/QO/QD etc.), e os sinônimos da equipe. A fonte cita a seção do manual ou a tarefa da ajuda. O "não sei" diz a quem perguntar. O Financeiro não vaza: nada do Omie nem das telas do Financeiro de Compras chega a quem está fora da lista de sigilo.
2. **Regra das atividades (o dono decidiu que não vale).** A regra saiu da ajuda da tela Minhas atividades. O manual da gestão registra a regra atual. O teste foi reescrito para a regra atual, com comentário datado.
3. **Ordem do catálogo oficial (o dono decidiu corrigir).** A calibração de centrífuga (CAL-011) aparece logo depois de QUA-003, pelo código, e não mais no meio das etapas da autoclave. Só a ordem mudou. O teste de "Comercial idêntico à produção" continua protegendo o resto do arquivo.

Placar: ver "Placar, arquivo a arquivo" no fim.

## 1. Base do assistente: união `docs/` + produção

### Como a base é gerada

`_tools/gerar_base_assistente.cjs` lê `docs/MANUAL_*.md` e grava `SGO_AssistenteManuais.js`. A importação do servidor chama o mesmo gerador a cada publicação (`sgo_servidor/scripts/base_assistente.mjs`). O teste `assistente-duvidas` exige que o arquivo gravado seja exatamente o que o gerador produz a partir de `docs/`.

### Método (sem inventar texto)

Ferramentas em `output/assistente-20261117/`:

1. `SGO_AssistenteManuais.producao.js`: cópia da base em produção, guardada antes de qualquer mudança. `docs-antes/` guarda os manuais antes deste trabalho.
2. `recuperar-trechos-producao.cjs`: remonta as seções da produção (junta as "(parte N)") e acha cada parágrafo que não está no texto que `docs/` gera. Depois confere no git, em todas as ramificações, se o parágrafo já existiu em alguma versão do manual:
   - **existiu:** o `docs/` trocou o parágrafo de propósito. O texto antigo **não volta** e fica listado (53 parágrafos, "superados");
   - **todas as palavras já estão na seção do `docs/`:** é redação antiga cortada, sem informação nova. Também não volta e fica listado;
   - **nunca existiu:** é trecho só da produção e **volta** para o manual em `docs/`, com a marca `<!-- recuperado da base do assistente em produção (versão 0a0b5125a2fe) em 17/11/2026: texto publicado que não estava em docs/ -->`. O gerador ignora a marca, que não aparece no texto.
   - Colocação: seção que o `docs/` não tem entra inteira, com o título da produção, logo depois da seção vizinha. Parágrafo da produção que **contém** o parecido do `docs/` (todas as palavras do `docs/` estão nele) **substitui** o do `docs/`, sem perder nada. Nos demais casos, o parágrafo entra no fim da seção, sem apagar nada.
3. `conferir-uniao.cjs`: confere que todo parágrafo da produção está na base nova (salvo os superados) e que todo parágrafo que o `docs/` tinha continua nela (salvo os substituídos por um que o contém e os 3 do manual do próprio assistente, reescritos de propósito). Resultado: `{"faltaProd":0,"faltaDocs":0}` (`conferencia-uniao.json`).

### Trechos recuperados da produção e para onde foram

| Manual em `docs/` | O que voltou |
|---|---|
| MANUAL_MODULO_CADEIA_FRIO.md | Seções novas: "Onde começar", "Como registrar e conferir", **"Quando aparece Inconclusivo"**, "Emitir e localizar", "Atividades do módulo" e "Tire sua dúvida". Parágrafos acrescentados em "O que mudou em 22/10/2026", "O que mudou em 21/10/2026" e "Erros comuns e o que fazer" (a versão da produção cita "Novo certificado" e a leitura por IA do certificado do registrador). |
| MANUAL_MODULO_GESTAO_DECISOES.md | Seções novas: **"Diretoria informada, não cobrada (11/11/2026)"** (7 parágrafos) e "Painel do Desempenho, Caixa agrupada e saneamento (11/11/2026)" (12 parágrafos). |
| MANUAL_MODULO_REPRESENTACAO.md | Seções novas: "Introdução" (versão de 11/11 com imagens e vídeos), "Régua de prazos do chamado da representada (11/11/2026)" (10), "Prazo de atendimento do chamado da representada (11/11/2026)" (6) e "Imagens e vídeos do pedido e do chamado (11/11/2026)" (8). Um parágrafo acrescentado em "Primeira configuração". |
| MANUAL_MODULO_COMERCIAL.md | Seções novas em Propostas: "Nova proposta guiada" (7), "Dados completos para emitir (11/11/2026)" (3), "Pedir os dados ao cliente e conferir a resposta" (2), "Escopo escrito pela especialista e validado pelo vendedor" (2), "Liberação excepcional da emissão" (1), "Responsável técnico, intermediário e unidade de execução" (3) e "Viagem: origem, destino, km, pedágio e valores por estado" (2). Parágrafos acrescentados em "Precificação", "Catálogo pela equipe comercial" e "Problemas comuns". |
| MANUAL_MATRIZ_DE_AVISOS.md | Seções novas: "GS07: resumo diário da Diretoria (11/11/2026)" e "3B. Pedido que depende da Diretoria, na hora aos dois (11/11/2026, regra do dono)". |
| MANUAL_MINHAS_ATIVIDADES.md | Seção nova: "Diretoria: lembrete, sem justificativa (11/11/2026)". |
| MANUAL_MODULO_ESTUFA_BANHOMARIA.md | Seção nova: "O que mudou em 11/11/2026: do relatório de ensaio ao relatório de qualificação". |
| MANUAL_MODULO_COMPRAS.md | Parágrafo ampliado em "Escolha e aprovação por valor" (GS06, aviso na hora aos dois da Diretoria). |
| MANUAL_MODULO_FROTA.md | Parágrafo ampliado em "Responder um abastecimento pendente" ("Confirmar Não abasteci", mínimo de 15 caracteres). Só o manual mudou; nenhum código da Frota foi mexido. |

Não recuperados, porque o `docs/` já os tinha trocado de propósito (estão no git): PGT/POP (27), Comercial (8), App de campo (5), Assistência (5), Conduta do colaborador (3), Certificado de calibração (3) e E-mail (2). A lista completa, com o texto, está em `recuperacao-trechos.json`.

Mapa do gerador (`_tools/gerar_base_assistente.cjs`):
- **MANUAL_MODULO_PORTAL_CLIENTE.md** ficou em `IGNORAR`. Ele chegou a entrar (tela `portal_cliente_contratos`, perfis Administrador, Diretoria e Gestor), mas traz a parte do reajuste dos contratos, aprovado pelo Painel financeiro e pela lista de sigilo, e o teste `financeiro-onda2-e1e5` ("nada do Financeiro na base geral") recusou. O manual fica fora até ser separado em parte de uso e parte do Financeiro. A ajuda da tela continua valendo.
- **MANUAL_PAINEL_FINANCEIRO.md** ficou em `IGNORAR`: o Financeiro é sigiloso, e a decisão da onda 2 foi "assistente geral sem manuais do Financeiro".
- **MANUAL_GANHOS_VENDEDORES.md** ficou em `IGNORAR` até o dono decidir quais perfis o leem. O manual traz o contrato de comissão de uma vendedora e os recebimentos do Omie. A ajuda da própria tela continua valendo.

Base nova: 45 manuais, 1.266 seções, versão `d8344a6d4cee` (a produção tinha 45 manuais, `0a0b5125a2fe`).

## 2. Entender o erro

### Índice de mensagens do sistema (`SGO_AssistenteErros.js`, novo)

- **De onde vem:** na hora, do próprio código, guardado por 10 minutos. Entram as funções carregadas no servidor (`Function.prototype.toString` de cada função global) e as telas `JS_*.html` incluídas no `Index.html`. O índice nunca fica desatualizado e não há arquivo para gerar.
- **O que entra:** `throw new Error('...')`; ajudantes `throw X_erro_('...')`, inclusive os que recebem um código antes da mensagem (`Rep_erro_('CODIGO', '...')`); `{ ok: false, message: '...' }`; e `alert('...')` nas telas. Partes variáveis viram "…". Não entram as funções da ajuda e do próprio assistente, nem os avisos de sucesso escritos com `message:`.
- **Tela de cada mensagem:** pelo prefixo da função (49 regras, por exemplo `Atividades_` → Minhas atividades, `Com*_` → Comercial, `Lic*_` → Licitações) ou pelo arquivo da tela.
- **Marcas:** Financeiro (`Omie*`, `Fin*`, `Caju*`, `CmpFin/CmpFat/CmpCart/CmpPag`, `CtRj/CtIdx/CtRg/CtIA`, `GV`/Ganhos e as telas do Financeiro): só para a lista de sigilo. A recusa "O Financeiro é sigiloso" vale para todos. Mensagens com recurso de administração ficam só para o Administrador.
- **Números** (retrato estático em `indice-erros.json`, pelo mesmo código): 3.676 mensagens, 326 do Financeiro e 35 de administração. Por tela: Comercial 477, Licitações 396, Frota 310, Assistência 291, Representação 134, Compras 133, Conduta 126, Autoclave 114, Depósito de viagem 99, Conciliação Caju 94, Minhas atividades 91 e as demais. 268 mensagens ficam sem tela (funções gerais `SGO_*`).
- **Reconhecimento** (`avaliar-indice.cjs`, cada mensagem colada com valores no lugar de "…"): **3.622 voltam como primeira candidata, 17 empatadas com a certa e 0 erradas**. 37 mensagens curtas demais não têm candidata.

### Como reconhece e explica

- O texto da pessoa vira trincas de palavras (sem acento) e é comparado com as trincas de cada mensagem, com peso maior para as raras. As trincas genéricas ("não foi possível", "foi possível salvar") não identificam nenhuma mensagem.
- **Mensagem colada:** a maior parte da mensagem está no texto, e o texto é quase só ela. **Mensagem descrita** ("apareceu que o prazo não foi informado"): pelo menos 4 palavras seguidas do motivo ou do "o que fazer", e o texto parece falar de um erro (ou veio do botão). Mensagem que o sistema não tem nunca vira explicação inventada: vira "não sei", com a quem perguntar.
- **Partes:** no padrão do SGO+ (`Não foi possível X: motivo. O que fazer.`). As frases de ação ("Peça...", "Preencha...", "Para trocar o veículo, use...", "; peça à gestão comercial...") viram os passos. **Quem resolve** só aparece quando a mensagem manda pedir, falar, avisar ou esperar alguém, ou quando diz "só X pode, vê ou faz". Ele pode ser o responsável pelo sistema, o administrador, a Diretoria, o Financeiro, o RH, a gestão da área, Compras, a Qualidade, o responsável técnico, quem lançou ou a representada.
- **Telas:** a tela da mensagem e as telas que a mensagem manda abrir ("use Frota > Reservas"). Só aparecem as telas que o perfil abre.
- **Ajuda junto:** os trechos "Se algo der errado" e de manuais que falam desta mensagem, com pelo menos duas trincas do motivo em comum. Quando a mensagem não diz o que fazer, os passos vêm desse trecho. A fonte cita a mensagem ("Mensagem do sistema da tela X (origem técnica: função Y)") e a situação da ajuda usada.
- **IA:** com a chave do Gemini (a mesma de `SGO_Assist_iaConfig_` e `ASN_gemini_`), o modelo recebe só a mensagem, a análise e os trechos. A pergunta vai como dado, nunca como instrução. A resposta é conferida: fontes e telas só as entregues, sem termos de administração. Se não passar, fica a explicação local. Sem chave, ou com a IA fora do ar, a explicação local sai com o aviso.

### Casca

- `JS_Assistente.html`: guarda a última mensagem de falha (`window.SGO_ULTIMO_ERRO`), sem mudar o comportamento de nenhuma tela. As fontes são as falhas do servidor (`withFailureHandler`), as respostas `{ ok: false }` com mensagem, os `alert` de erro e as faixas de erro. A observação de `google.script.run` segue o mesmo modelo já publicado no `JS_EnviarDoc`. As chamadas do próprio assistente, do bate-papo e dos avisos periódicos ficam de fora.
- `JS_Core.html` (`SGO_cascoAvisoFaixa_`): a faixa vermelha dos módulos técnicos ganhou "Perguntar ao assistente sobre este erro". A faixa amarela de aviso fica como estava.
- `AssistenteWidget.html`: resposta do tipo ERRO (barra vermelha; Mensagem, O que aconteceu, Por que o sistema não deixou, O que fazer, Quem resolve, Abrir esta tela, Falar com o administrador, Isso resolveu?), o quadro "Apareceu uma mensagem de erro há pouco" com "Entender esta mensagem" (últimos 15 minutos), "A quem perguntar" no "não sei", o aviso "Entendi X como Y" e textos justificados. No painel da gestão, a aba "Base do assistente" mostra quantas mensagens o assistente explica.
- `UI_Estilos.html`: a faixa quebra a linha em tela estreita, e o botão novo tem 44 px.
- Telas conferidas no navegador, na página completa, em 1366, 390 e 320 px: sem rolagem lateral, botões de 44 px, sem erro de JavaScript nem diálogo do navegador. Capturas em `output/assistente-20261117/capturas/` (`*-assistente-erro.png`, `*-faixa-erro.png`, `*-faixa-explicacao.png`).

## 3. Buscar melhor

- **Vocabulário da empresa** (`SGO_ASSIST_VOCABULARIO`, 12 grupos): O.S./OS/ordem de serviço; CME/central de material; autoclave/esterilizador a vapor; termodesinfectora/lavadora; NR-13/NR13/vaso de pressão; QI/QO/QD/qualificação de instalação, operação e desempenho; cadeia fria/câmara fria; POP/PGT/procedimento operacional padrão; data logger/registrador de temperatura; NF/NF-e/nota fiscal; app/aplicativo; bater, marcar ou registrar o ponto. As siglas conferem maiúsculas ("os documentos" continua sendo o artigo). Cada grupo vira uma palavra única na pergunta e nos trechos do índice.
- **Sinônimos da equipe:** chefe, chefia, supervisor, coordenador e gerente viram gestor; ticket vira chamado; logar e login viram entrar.
- **Erro de digitação:** só quando a pergunta, como veio, não tem base. A palavra que não existe vira a mais parecida, com a mesma primeira letra, 1 letra de diferença (2 em palavras de 8 letras ou mais), no máximo 2 correções, e só se a pergunta corrigida tiver base. Assim, "bolo de cenoura" e "copa do mundo" continuam "não sei".
- **Tela atual:** continua com peso a mais. **Perfil:** o que já existia (o assistente não ensina o que é de outro perfil, o modo personalizado fica só com o Administrador etc.). Mais duas regras: tarefa marcada "(Financeiro)" é do Financeiro, e Ganhos dos vendedores só para Administrador, Diretoria, Financeiro e Comercial.
- **Financeiro:** além do que já ficava fora (telas e manuais do Painel financeiro, Conciliação Caju, conferência de Compras e Recarga Caju), duas coisas só chegam a quem está em `OMIE_SIGILO_CONTAS`: todo trecho que fala do Omie e as telas "Conferência" e "A pagar" de Compras. O perfil Financeiro sozinho não basta.
- **Fonte com a seção:** 'Manual: X, seção "Y"', 'Ajuda da tela X, tarefa "Y"' e 'situação "Y"'.
- **Não sei:** "Pergunte ao gestor da sua área ou ao administrador do sistema (nomes) pelo bate-papo, dizendo que a dúvida é da tela X e o que você tentou fazer."

## 4. Regra das atividades (decisão do dono, 17/11/2026)

- `SGO_Ajuda_Principal.js` (ajuda de Minhas atividades): saiu a situação "é o responsável pelo sistema e só ele lança atividades para si". Em "Quem pode", a gestão lança "para qualquer pessoa da equipe (inclusive o responsável pelo sistema, por decisão do dono de 17/11/2026)".
- `docs/`: nenhum manual citava a regra (nem no git). No `MANUAL_ATIVIDADES_GESTAO.md` entrou um parágrafo com a regra atual e a data da decisão, para o assistente responder certo.
- `tests/atividades-equipe-avisos.test.cjs`: o teste foi reescrito para a regra atual, com comentário datado. A gestão lança e passa atividade para o responsável pelo sistema; ele aparece na lista de responsáveis; a ponte do COMMAND segue a mesma regra; a rotina automática continua; o técnico continua lançando só para si; a ajuda não ensina mais a regra antiga.

## 5. Ordem do catálogo oficial (decisão do dono, 17/11/2026)

- `SGO_Comercial_CatalogoOficial.js`: `L.splice(13, …)` foi trocado pela posição achada pelo código (logo depois de `QUA-003`, a ordem de antes das 9 etapas QI/QO/QD). Preço e código não mudaram.
- `tests/comercial-legendas-20261113.test.cjs` ("arquivos do Comercial idênticos à produção"): com o trecho da ordem desfeito, o arquivo tem de ser byte a byte o da base. Os outros 22 arquivos do Comercial seguem exigidos iguais. O comentário está datado.
- `tests/comercial-catalogo-oficial.test.cjs`: teste novo da ordem. São os mesmos 35 itens, sem código repetido; CAL-011 vem logo depois de QUA-003; as etapas de QUA-001, QUA-002 e QUA-005 ficam juntas e em ordem; o preço é 194,23.
- Manual `MANUAL_COMERCIAL_PRECOS_GESTAO.md`: uma linha sobre a ordem.

## Decisões tomadas sem perguntar (padrão seguro)

1. Trecho da produção que já existiu no git e foi trocado no `docs/` não volta: ele é texto antigo, e o `docs/` é a versão mais nova. A lista está guardada.
2. Quando a produção e o `docs/` têm versões diferentes do mesmo parágrafo e as duas têm informação própria, as duas ficam, com a da produção marcada. Exemplos: o registrador vencido ("Editar" no `docs/`, "Novo certificado" e leitura por IA na produção) e a régua de prazos da representada (tabela no `docs/`, lista na produção). **O dono ou o Codex devem conferir qual descreve a tela de hoje e apagar a outra.**
3. O índice de erros é montado do código na hora, e não por um arquivo gerado. Assim ele não fica desatualizado e não exige regerar a cada publicação.
4. O componente e o núcleo eram "idênticos ao COMMAND". O núcleo continua idêntico e não foi mexido. O componente mudou só no SGO+, porque o COMMAND foi descontinuado em 27/10. O teste `assistente-duvidas` passou a conferir as entregas do componente, com comentário datado.
5. Ganhos dos vendedores, Painel financeiro e Portal do cliente (manual interno) ficaram fora da base geral. Os dois primeiros e a parte de uso do Portal precisam de decisão do dono sobre quem lê.
6. Mensagens do Financeiro são explicadas só a quem está na lista de sigilo. Quem está na lista recebe a explicação da mensagem, sem os manuais do Financeiro.

## Riscos

- **Observação de `google.script.run` e de `alert`:** é transparente (a tela recebe o mesmo resultado, e o teste de navegador confere), mas é mais uma camada sobre o `run`, como as do `JS_EnviarDoc` e do `JS_DocRevisao`. Sem `Proxy`, nada é observado.
- **"Último erro":** pode guardar uma resposta `{ ok: false }` de uma rotina em segundo plano que a tela não mostrou. O quadro mostra o texto, e a pessoa decide se é o dela.
- **Primeira pergunta depois de 10 minutos:** monta o índice em cerca de 0,2 s (medido com os 428 arquivos carregados).
- **Parágrafos da produção em duplicidade parcial:** ver a decisão 2.
- **Mensagens em funções gerais (`SGO_*`, 268):** são explicadas sem a tela.

## Placar, arquivo a arquivo

Referência: `output/falhas-20261117/suite.txt`, 2402 aprovados e 2 falhas em 252 arquivos. Resultado: `output/assistente-20261117/suite.txt`, **2417 aprovados e 0 falhas em 253 arquivos**. Todos os arquivos terminaram com código de saída 0. Nenhum arquivo piorou (`comparar-suite.cjs`).

| Arquivo | Antes (aprovados/falhas) | Depois |
|---|---|---|
| assistente-duvidas | 11/1 | 12/0 |
| atividades-equipe-avisos | 12/1 | 13/0 |
| comercial-catalogo-oficial | 17/0 | 18/0 (teste novo da ordem) |
| assistente-ia-eficaz-20261117 (novo) | - | 12/0 |
| demais 249 arquivos | iguais | iguais |

Na primeira rodada (`suite-rodada1.txt`, 2415/2), dois arquivos falharam:
- `financeiro-onda2-e1e5`: o manual do Portal do cliente cita o Painel financeiro e a lista de sigilo. O manual foi tirado da base (ver a seção 1).
- `email-outlook-20261117`: teste de navegador que estourou o tempo com tudo rodando junto. Sozinho, deu 14/0.

Na rodada final, os dois deram 12/0 e 14/0.

## Arquivos

Legado (`output/financeiro-20261116/candH`), com o fim de linha de cada arquivo preservado e conferido:
- novo: `SGO_AssistenteErros.js` (LF)
- `SGO_Assistente.js` (CRLF), `SGO_AssistenteManuais.js` (regerado, LF), `AssistenteWidget.html` (CRLF), `JS_Assistente.html` (CRLF), `JS_Core.html` (LF), `UI_Estilos.html` (LF)
- `SGO_Ajuda_Assistente.js` (CRLF), `SGO_Ajuda_Principal.js` (LF)
- `SGO_Comercial_CatalogoOficial.js` (LF)
- O núcleo `SGO_AssistenteNucleo.js` não foi mexido e continua idêntico ao do COMMAND.

Repositório:
- `_tools/gerar_base_assistente.cjs` (IGNORAR: Painel financeiro, Ganhos dos vendedores, Portal do cliente)
- `docs/`: `MANUAL_ASSISTENTE_DUVIDAS.md`, `MANUAL_ATIVIDADES_GESTAO.md`, `MANUAL_COMERCIAL_PRECOS_GESTAO.md` e os 9 que receberam os trechos da produção: `MANUAL_MATRIZ_DE_AVISOS.md`, `MANUAL_MINHAS_ATIVIDADES.md`, `MANUAL_MODULO_CADEIA_FRIO.md`, `MANUAL_MODULO_COMERCIAL.md`, `MANUAL_MODULO_COMPRAS.md`, `MANUAL_MODULO_ESTUFA_BANHOMARIA.md`, `MANUAL_MODULO_FROTA.md`, `MANUAL_MODULO_GESTAO_DECISOES.md`, `MANUAL_MODULO_REPRESENTACAO.md`
- testes: novo `tests/assistente-ia-eficaz-20261117.test.cjs`; alterados `tests/assistente-duvidas.test.cjs`, `tests/atividades-equipe-avisos.test.cjs`, `tests/comercial-catalogo-oficial.test.cjs` e `tests/comercial-legendas-20261113.test.cjs`

Ferramentas e evidências (`output/assistente-20261117/`): `recuperar-trechos-producao.cjs`, `conferir-uniao.cjs`, `comparar-base.cjs`, `historico-paragrafos.cjs`, `similares.cjs`, `indice-erros-estatico.cjs`, `avaliar-indice.cjs`, `comparar-suite.cjs`, `patch_assistente.py`, `patch_assistente2.py`, `patch_ajuda.py`; `SGO_AssistenteManuais.producao.js` (a base de produção), `SGO_Assistente.js.antes`, `docs-antes/`; `recuperacao-trechos.json`, `conferencia-uniao.json`, `indice-erros.json`, `avaliacao-indice.json`; `suite.txt`, `suite-rodada1.txt`; `capturas/`.

Para publicar: a camada é a lista do legado acima, sobre a imagem estufa-simulador-20261117. Atenção: a importação do servidor regenera `SGO_AssistenteManuais.js` a partir do `docs/` que vai junto. Ele tem de ser o `docs/` deste trabalho (com os trechos recuperados) e o gerador deste trabalho, senão a base volta a perder os trechos. Antes de publicar, conferir o hash da produção, como sempre.
