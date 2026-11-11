# Programa de Conduta: quem vê o quê hoje

Levantamento feito em 10/11/2026 somente por leitura do código de produção em
`output/comercial-20261110/base/legado`. Nada foi alterado nem publicado. As
referências `arquivo:linha` estão no anexo. A tela do computador fica gravada
como texto dentro de `SGO_Conduta_ConteudoModulo.js` (linha 1). Para citar
trechos dela, o texto foi decodificado e as linhas indicadas como "tela:N"
correspondem a esse texto decodificado.

---

## 1. Resumo para o dono

1. **O colaborador vê as próprias ocorrências**, com código, situação, nível e
   pontos, a foto da evidência e os prazos, e pode **contestar** (3 dias úteis)
   e **recorrer** uma vez (2 dias úteis). Também gera o **próprio extrato
   mensal** em A4, com bônus, incentivo de missão, ocorrências, reconhecimentos
   e placar.
2. **O colaborador não vê o porquê das decisões.** A tela não mostra quem
   registrou, quem homologou ou julgou, a fundamentação do julgamento da
   contestação dele nem o histórico. No computador, também não aparece o texto
   "o que aconteceu". Quando a contestação é julgada, ele não recebe nenhum
   aviso: só percebe que a situação mudou se voltar à lista. Esses pontos são
   os que mais geram desconfiança.
3. **Sigilo.** Quem foi o envolvido em uma ocorrência só fica à vista da
   Diretoria (charles), do dono do sistema (admin) e de quem é Gestor ou
   Administrador da **área Qualidade** (matheusgodoi). O próprio envolvido e
   quem registrou também veem. Os demais gestores (elisa, bruna, priscilla e
   ricardo) **não** veem as ocorrências dos outros, e quem confere isso é o
   servidor, não só a tela.
4. **Mas qualquer GESTOR, de qualquer área, vê e mexe em muita coisa da equipe
   inteira:** missões de todos, com nomes, ausências de todos, a prévia e o
   fechamento com o **valor de cada pessoa**, o painel de quem leu cada aviso e
   o relatório de missões. Também pode **aprovar missões** (R$ 300 cada),
   **lançar e remover ausências**, o que muda o índice da equipe, cadastrar
   distâncias de destino e **fechar o mês**. Hoje isso vale para elisa (RH),
   bruna e priscilla (Metrologia) e ricardo (Comercial).
5. **Falhas de checagem no servidor encontradas:**
   - **Qualquer gestor pode se tornar "Gestor de Qualidade".** A troca de área
     de uma pessoa é aceita de ADMIN, DIRETORIA, GESTOR, RH e FINANCEIRO, para
     qualquer usuário, inclusive a própria conta. Basta um gestor mudar a
     própria área para QUALIDADE para passar a ver todas as ocorrências, os
     nomes e as fotos, e a decidir. Fica só um registro no log.
   - **O relatório de missões revela quem teve infração gravíssima.** A linha
     traz "Infração gravíssima própria no mês" ao lado do nome do executante. O
     relatório é aberto por qualquer gestor, o que fura o sigilo.
   - **O fechamento e a prévia permitem deduzir quem teve gravíssima.** A linha
     de cada pessoa mostra "missões elegíveis > 0" com "incentivo = R$ 0", e
     isso só acontece com quem teve gravíssima no mês.
   - **O servidor entrega dados que a tela esconde.** A lista de ocorrências
     manda ao navegador do envolvido o nome de quem registrou, o histórico com
     o nome de quem decidiu e o texto do julgamento. Ao navegador de quem
     registrou, manda o **texto da defesa do acusado**. Nada disso aparece na
     tela, mas está no navegador e pode ser lido por quem souber abrir as
     ferramentas do navegador.
   - **Telas oferecem o que o servidor recusa.** A aba de relatórios oferece a
     todo gestor o "extrato de qualquer pessoa" e o "relatório da equipe"; o
     celular oferece "Sugestões" e "Kanban" a gestão e RH. Na hora o servidor
     recusa, e a pessoa recebe um erro.
6. **Contas de representada não entram no cálculo (conferido).** A leitura
   de usuários do sistema esconde as contas REPRESENTADA (`SGO_Data.js:88-95`),
   então `qualidade`/Brasmedical e `energiza2209` não contam no número de
   pessoas da equipe nem ganham linha de bônus.
7. **Para dar transparência sem quebrar o sigilo, quase tudo é mudança de
   código, e pequena.** Os dados já existem: histórico, fundamentação, prazos e
   autoria. Falta mostrá-los ao próprio envolvido, avisá-lo do resultado do
   julgamento e fechar as brechas acima. A seção 8 traz a tabela de opções.

---

## 2. Colaborador (perfil TECNICO, METROLOGIA, COMERCIAL, FINANCEIRO e também qualquer gestor sobre si mesmo)

### 2.1 O que ele vê

| Item | Onde | Como funciona hoje |
|---|---|---|
| Menu "Programa de conduta" | Index.html:296 | Aparece para todos, exceto cliente (JS_Core.html:840-849). |
| Farol do mês (índice, farol, pontos da equipe, quanto falta para sair do verde, evolução) | aba Farol, Início | Qualquer pessoa da equipe (Fechamento.js:257-307). Mostra o total da equipe, sem nomes. |
| Balão de aviso de cada ocorrência homologada | JS_Core.html:7489 | Toda a equipe recebe o aviso **sem o nome**: código, descrição, nível, pontos, data do fato e situação (Ciencia.js:144-167). O envolvido recebe também "Esta ocorrência foi lançada em seu nome", o prazo para contestar e a legenda da foto (Ciencia.js:218-223). |
| Dar ciente | balão | Botões "ciente" e "fechar sem confirmar". Os dois ficam registrados, com quantas vezes viu (Ciencia.js:209-271). |
| Lista "Ocorrências" | tela:182-196 | Mostra só as ocorrências **em seu nome** e as que **ele registrou** (Ocorrencias.js:667-696). Colunas: código e descrição do tipo, envolvido, data, competência, situação, nível/peso e ações. |
| Foto da evidência | botão "Ver foto" | Abre só para o envolvido, quem registrou, a Diretoria e o Gestor de Qualidade (Ocorrencias.js:470-495). |
| Contestar | botão com o prazo ao lado | Só quando a ocorrência está HOMOLOGADA e dentro do prazo (Ocorrencias.js:736; 831-856). |
| Recorrer | botão com o prazo ao lado | Só quando está FIRME, dentro do prazo e sem recurso anterior (Ocorrencias.js:737; 924-946). |
| Celular | JS_Core.html:5641-5668 | Mesma lista e mesmos botões. **No celular aparecem também até 160 caracteres de "o que aconteceu"**, que o computador não mostra. |
| Extrato do mês em A4 | aba Relatórios e extratos | Só o próprio (Extrato.js:174-181). Traz o índice da equipe, se recebe o bônus coletivo e quanto, o incentivo de missão, o total, as ocorrências do mês com situação e pontos, os reconhecimentos, as missões com a aprovação, as ausências e o placar individual (Extrato.js:118-149). |
| Missões | aba Missões | Só as dele: como executante ou como quem lançou (Missao.js:234-245). Mostra quem aprovou e o motivo da recusa. Ele recebe aviso da decisão (Missao.js:191-197). |
| Ausências | aba Ausências | Só as dele (Ausencia.js:45-47). |
| Fechamentos e relatório mensal | aba Fechamentos | Lista de meses com índice e farol (Fechamento.js:242-250) e relatório mensal **agregado, sem nomes** (Relatorio.js:45-125, 470-503). |
| Relatórios semanais | aba Relatórios | Qualquer pessoa abre o semanal: motivos agregados, sem nomes (RelatoriosGerenciais.js:268-284). |
| Reconhecimentos | aba Reconhecimentos | Todos veem todos, com nomes (Ocorrencias.js:986-998; gravados com VISIBILIDADE "TODOS", :980). |

### 2.2 O que ele NÃO vê na tela, embora o dado exista

| Informação | Existe no sistema? | Mostrada ao envolvido? |
|---|---|---|
| Quem registrou (fiscal) | Sim: FISCAL_ID e FISCAL_NOME (Ocorrencias.js:623, 741) | **Não.** Só a janela de homologar e julgar, dos decisores, mostra "Registrada por" (tela:519). **O servidor envia o nome mesmo assim** (ver seção 7). |
| "O que aconteceu" (DESCRICAO) | Sim (Ocorrencias.js:635) | Computador: **não** (o detalhe só abre para quem decide, tela:508-538). Celular: sim, 160 caracteres (JS_Core.html:5660). |
| Quem homologou, quem julgou e quando | Sim: HOMOLOGADA_POR, JULGADA_POR e HISTORICO_JSON com nome e perfil (Ocorrencias.js:242-249, 799, 893, 903) | **Não**, em nenhuma tela. |
| Fundamentação da rejeição ou do julgamento | Sim: TEXTO_JULGAMENTO (Ocorrencias.js:800, 894, 904) | **Não.** O extrato só mostra a fundamentação quando a decisão é "da Diretoria sobre ocorrência em que é envolvida" (Extrato.js:151-172). |
| Histórico completo (registro, homologação, contestação, julgamento, passos automáticos) | Sim (HISTORICO_JSON) | **Não.** |
| O texto da contestação que ele mesmo enviou | Sim: TEXTO_CONTESTACAO e TEXTO_RECURSO | **Não.** Depois de enviada, a defesa some da tela dele. |
| Prazo de julgamento da contestação | Sim: PRAZO_JULGAMENTO (Ocorrencias.js:853) | **Não.** A tela diz só "Em julgamento pela gestão" (tela:270). |
| Aviso do resultado do julgamento | Não existe | **Não.** O julgamento avisa só a Diretoria (Ocorrencias.js:915-917). O balão da ocorrência não volta depois do "ciente" (Ciencia.js:214-217). |
| Por que o nível subiu (reincidência) | Sim: REINCIDENCIA_DE_ID (Ocorrencias.js:629) | Aparece só "LR" ou "MR", sem dizer a qual ocorrência anterior se refere. |
| A própria linha do fechamento congelado na tela | A função existe e devolve só a linha dele (Fechamento.js:222-240) | Nenhuma tela chama essa função. O resultado chega só pelo extrato. |
| Quanto cada ocorrência dos colegas pesou no bônus dele | Somente agregado | Por desenho, ele vê o total da equipe e o aviso anônimo de cada ocorrência. |

---

## 3. Sigilo do envolvido

### 3.1 Regra (decisão de 28/10/2026, Ocorrencias.js:170-178)

A identidade do envolvido fica restrita a:

- perfil **DIRETORIA**;
- **dono do sistema** (`SGO_DONOS = ['admin']`, SGO_Chaves.js:32);
- **GESTOR ou ADMIN com área QUALIDADE** em CAD_USUARIOS.AREA;
- e, naturalmente, ao **próprio envolvido** e a **quem registrou**.

A implementação está em `Conduta_veIdentidadeUsuario_` (Ocorrencias.js:180-188)
e `Conduta_veIdentidade_` (:191-195). Para ver tudo e decidir, o servidor exige
`isAdminSession` (perfil ADMIN, DIRETORIA ou GESTOR, SGO_Auth.js:695-708) **e**
`Conduta_veIdentidade_`. Com os usuários de hoje, isso deixa: **charles, admin
e matheusgodoi**.

O motivo, registrado no código, é educar sem expor ninguém e sem criar
culpados pela perda do bônus coletivo (Ocorrencias.js:176-177).

### 3.2 Onde o servidor aplica o sigilo (checagem real, não só de tela)

| Função | Quem passa | Evidência |
|---|---|---|
| Listar ocorrências de todos | ADMIN/GESTOR/DIRETORIA **e** com identidade; os demais recebem só as próprias e as que registraram | Ocorrencias.js:667-696 |
| Homologar, julgar, aceitar ou descartar sugestão, análise de causa, plano de ação | `Conduta_exigirDecisor_` | Ocorrencias.js:198-205, 763, 862; Qualidade.js:494, 524, 585, 684, 720, 749 |
| Foto | envolvido, quem registrou ou decisor | Ocorrencias.js:470-495 |
| Extrato de outra pessoa | decisor | Extrato.js:179-181 |
| Relatório da equipe (nomes e ocorrências por pessoa) | decisor | RelatorioEquipe.js:197-200 |
| Sugestões, planos, indicadores | decisor | Qualidade.js:135-141, 446, 854, 877 |
| Kanban de qualidade | decisor vê tudo; os demais, só as próprias | Qualidade.js:804, 822 |
| Prévia do fechamento | qualquer gestor, mas sem placar nem gravíssimas para quem não é decisor | Fechamento.js:115-128, 110-113 |
| Fechamento congelado por pessoa | gestão e RH veem todos, sem placar e sem gravíssima para quem não é decisor | Fechamento.js:222-240 |
| Aviso para a equipe | todos, sem o nome | Ciencia.js:14-17, 144-167, 218-225 |
| Relatório mensal e semanal | todos, agregados e sem nomes | Relatorio.js:22-23, 45; RelatoriosGerenciais.js:35-69 |

### 3.3 Onde o sigilo vaza ou pode ser contornado

1. **O relatório de missões traz o nome junto com "Infração gravíssima própria
   no mês".** Ele é gerado por qualquer GESTOR (`Conduta_exigirGestor_`) e
   aberto por gestão e RH (RelatoriosGerenciais.js:181, 204-207, 252-258,
   268-284). Aparece também "Ocorrência firme vinculada à missão" com o nome.
2. **A conta permite deduzir a gravíssima no fechamento e na prévia.** A linha
   "sem ocorrências" mantém `qtdMissoesElegiveis` e `valorIncentivo`
   (Fechamento.js:110-113). O incentivo só é zerado quando há gravíssima
   própria (Calculo.js:119-122), então "elegíveis > 0 e incentivo 0" identifica
   a pessoa.
3. **A troca de área dá acesso de "Gestor de Qualidade".** `areasDefinirDoUsuario`
   aceita quem passa em `SGO_podeConsultarPessoas_` (ADMIN, DIRETORIA, GESTOR,
   RH e FINANCEIRO), sem impedir mudar a **própria** área nem a de outro
   gestor (SGO_Areas.js:187-193, 291-307; SGO_Auth.js:774-776). Um GESTOR que
   se coloca na área QUALIDADE passa a ver tudo e a decidir. Fica só o log
   `USUARIOS_AREA`.
4. **Inferência pelo aviso coletivo.** O balão para todos traz código,
   descrição e **data do fato**, por exemplo "VEI-06 Multa de trânsito,
   12/10". Em uma equipe de cerca de 17 pessoas, dá para deduzir quem foi
   (Ciencia.js:155-163). Isso é inerente ao desenho atual.
5. **O servidor manda campos sensíveis ao navegador.** Detalhes na seção 7.

---

## 4. Gestão, RH e Diretoria: o que cada um vê e faz

Legenda: **D** = Diretoria/dono (charles, admin); **Q** = Gestor da área
Qualidade (matheusgodoi); **G** = GESTOR de outras áreas (elisa-RH,
bruna/priscilla-Metrologia, ricardo-Comercial); **RH** = perfil RH (nenhum
usuário hoje); **C** = colaborador.

| Ação ou visão | D | Q | G | RH | C | Checagem no servidor |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Registrar ocorrência contra qualquer colega | sim | sim | sim | sim | sim | `Conduta_exigirEquipe_` (Ocorrencias.js:535-538) |
| Registro já nasce homologado | sim | não | não | não | não | Ocorrencias.js:599-618 |
| Ver ocorrências e nomes de todos | sim | sim | **não** | não | não | Ocorrencias.js:667-696 |
| Homologar e julgar | sim | sim | **não** | não | não | Ocorrencias.js:198-205 |
| Sugestões, Kanban, planos, indicadores | sim | sim | não | não | não | Qualidade.js:135-141 |
| Extrato de qualquer pessoa / relatório da equipe | sim | sim | não | não | não | Extrato.js:179; RelatorioEquipe.js:200 |
| Ver missões de todos (com nomes) | sim | sim | **sim** | sim | só as dele | Missao.js:234 (`Conduta_podeConsultarTodos_`, Ocorrencias.js:157-160) |
| Aprovar ou recusar missão (R$ 300 cada) | sim | sim | **sim** | não | não | Missao.js:157-158 (`Conduta_exigirGestor_` = isAdminSession) |
| Lançar missão para outro já aprovada | sim | sim | **sim** | não | não | Missao.js:61-63 |
| Remover missão | sim | sim | **sim** | não | não | Missao.js:270-271 |
| Cadastrar destino e km (define se a missão paga) | sim | sim | **sim** | não | não | Ocorrencias.js:370-381 |
| Ver ausências de todos | sim | sim | **sim** | sim | só as dele | Ausencia.js:41-47 |
| Lançar e remover ausência (tira a pessoa do divisor do índice) | sim | sim | **sim** | não | não | Ausencia.js:13-14, 55-56. **A inclusão não grava log**; só a remoção grava (:62). |
| Prévia do fechamento com valor por pessoa | sim | sim | **sim** (sem placar e sem gravíssima) | não | não | Fechamento.js:115-128 |
| Fechamento congelado, valor por pessoa | sim | sim | **sim** (sem placar e sem gravíssima) | sim | só a dele | Fechamento.js:222-240 |
| Fechar o mês / rodar a rotina e fechar meses vencidos | sim | sim | **sim** | não | não | Fechamento.js:16-17; Ciencia.js:383-406 |
| Processar prazos, ligar e desligar a checagem diária | sim | sim | **sim** | não | não | Ocorrencias.js:1087-1120 |
| Painel de ciência (quem leu cada aviso, por nome) | sim | sim | **sim** | não | não | Ciencia.js:274-299 |
| Gerar relatório mensal, semanal e de missões | sim | sim | **sim** | não | não | Relatorio.js:445-446; RelatoriosGerenciais.js:251-258 |
| Abrir relatório de missões (nomes, valores, gravíssima) | sim | sim | **sim** | sim | não | RelatoriosGerenciais.js:268-284 |

**Resposta direta:** um GESTOR de qualquer área **não** vê as ocorrências nem a
identidade dos envolvidos de toda a empresa. A checagem está no servidor e
está correta. Mas ele **vê os dados financeiros e operacionais do programa de
todos** (missões, ausências, valores por pessoa, ciência) e **decide o que tem
efeito financeiro**: aprova missão, lança ausência, cadastra km e fecha o mês.
O relatório de missões e a conta do fechamento ainda permitem deduzir quem
teve gravíssima. E qualquer gestor pode se tornar "Qualidade" trocando a
própria área.

O FINANCEIRO (wanessa) **não** abre o relatório de missões nem os valores por
pessoa: `Conduta_podeConsultarTodos_` aceita só gestão e RH (Ocorrencias.js:157-160).
O comentário do arquivo diz "gestão e Financeiro" (RelatoriosGerenciais.js:2-3),
mas o código não libera o Financeiro.

---

## 5. Como a pontuação é calculada

**Fluxo da ocorrência** (Ocorrencias.js:7-28): REGISTRADA, depois homologação,
depois HOMOLOGADA, depois o prazo de contestação, depois FIRME. A contestação
vai a julgamento, que termina em ANULADA ou FIRME. Depois de FIRME cabe um
recurso (EM_RECURSO), que vai ao mesmo julgamento. Sem homologação no prazo, a
ocorrência vira DESCARTADA; a rejeição na homologação vira REJEITADA.
**Só FIRME conta** (Ocorrencias.js:18-20, 1005-1009).

**Pesos por nível** (Calculo.js:23): L=2, LR=5, M=8, MR=15, G=30, GG=0. A
gravíssima não soma pontos: ela derruba o farol para vermelho sozinha
(Calculo.js:50-57).

**Reincidência** (Calculo.js:64-97; Ocorrencias.js:582-587): o mesmo código,
com ocorrência FIRME anterior em até 90 dias, sobe L para LR e os demais para
MR, sem nunca rebaixar.

**Índice da equipe (ICO)** (Calculo.js:43-48): `ICO = max(0, round(100 − (D/n) × K, 1))`.

- D = soma dos pesos FIRMES do mês, de todos, inclusive "Não identificado"
  (Ocorrencias.js:551-555, 1005-1009).
- n = usuários ativos, exceto CLIENTE e a conta genérica admin, menos quem tem
  ausência no mês (Fechamento.js:174-179).
- K = 5. Farol verde com 85 ou mais; amarelo de 70 a 85; abaixo disso,
  vermelho (Setup.js:224-226).

**Benefícios** (Calculo.js:111-140; Fechamento.js:190-212):

- **Bônus coletivo:** R$ 300 para cada pessoa se o farol fechar **verde**. É
  tudo ou nada para todos: uma gravíssima de qualquer pessoa tira o bônus de
  todo mundo.
- **Incentivo de missão:** R$ 300 por missão aprovada com 200 km ou mais.
  Independe do farol. É zerado só para quem tem gravíssima **própria** no mês,
  e não conta a missão com ocorrência FIRME do próprio executante vinculada a
  ela (Missao.js:290-307).
- **Modo de teste (valores simulados):** parâmetro MODO_SOMBRA_ATE. Uma rotina
  de 15/10/2026 desligou o modo de teste ("o programa passa a valer de vez",
  Ciencia.js:441-453). **Os valores são reais pelo código.** O estado atual da
  planilha não foi conferido.

**Placar individual** (Ocorrencias.js:1017-1045): soma de PONTOS_PLACAR do
catálogo, negativo nas ocorrências FIRMES (ex.: −3, −10, −30) e positivo nos
reconhecimentos. **Não afeta dinheiro.** Aparece só no extrato e, para os
decisores, no fechamento.

**Ausência** (Ausencia.js:1-11, 66-78): tira a pessoa do divisor n, e ela
continua recebendo o bônus. Não há aprovação: qualquer gestor lança.

**Fechamento mensal** (Fechamento.js:16-88; Ciencia.js:409-437):

- manual por qualquer gestor, ou automático 7 dias úteis após o fim do mês;
- bloqueado se houver defesa pendente ou missão aguardando aprovação;
- congela o resultado (`RESULTADO_JSON`), que não muda mais;
- avisa a equipe pelo balão e gera o relatório mensal.

**Onde aparece:**

- farol: todos, ao vivo;
- aviso de fechamento: todos, com ciência registrada;
- relatório mensal: todos, agregado;
- extrato: o próprio;
- prévia, fechamento por pessoa e relatório de missões: gestão.

**Contas de representada (conferido):** `Conduta_apurarCompetenciaSemCache_`
exclui o perfil CLIENTE e a conta genérica (Fechamento.js:174-176). As contas
REPRESENTADA não aparecem porque a própria leitura de CAD_USUARIOS as esconde
(`SGO_Data.js:88-95`, `SGO_DATA_REP_VISIVEL`). O mesmo vale para a lista de
colegas (Ocorrencias.js:364). Não há efeito no índice nem no bônus.

---

## 6. Contestação e recurso

| Ponto | Como está |
|---|---|
| Existe? | Sim: contestação na HOMOLOGADA e um único recurso na FIRME (Ocorrencias.js:831-856, 924-946, 933). |
| Prazos | Registro: 2 dias úteis. Homologação: 3. Contestação: 3. Julgamento: 5. Recurso: 2. Fechamento: 7 (Setup.js:231-236). Os dias são úteis, sem calendário de feriados (Ocorrencias.js:252-255). |
| Quem contesta | O envolvido, ou um decisor em nome dele (Ocorrencias.js:836-838). |
| Quem julga | Diretoria, dono ou Gestor de Qualidade, nunca quem registrou (Regra 12, Ocorrencias.js:870-872). O envolvido não julga a própria ocorrência, salvo a Diretoria, que julga com fundamentação obrigatória e marca gravada (Ocorrencias.js:875-884). |
| Resposta registrada? | Sim: TEXTO_JULGAMENTO, JULGADA_POR, JULGADA_EM, histórico e log de auditoria (Ocorrencias.js:887-913, 820-826). |
| Fundamentação obrigatória? | Para **rejeitar** na homologação, sim (Ocorrencias.js:790). Para **julgar** a contestação, **não**: o campo pode ficar vazio, salvo na decisão da Diretoria sobre ocorrência própria (Ocorrencias.js:882-884; tela:597). |
| Prazo de julgamento vencido | Nada automático: a ocorrência fica pendente e trava o fechamento do mês (Ocorrencias.js:1079-1082; Fechamento.js:91-103). |
| O colaborador fica sabendo do resultado? | **Não há aviso.** O balão do julgamento vai só para a Diretoria, sem detalhe (Ocorrencias.js:915-917). A fundamentação não aparece na tela dele. |
| Ocorrência "Não identificado" | Ninguém pode contestar, e ela conta no índice de todos (Ocorrencias.js:551-555). |
| Registro fora do prazo | Recusado: mais de 2 dias úteis após o fato ou após a data em que a sugestão foi encontrada (Ocorrencias.js:573-579). |

---

## 7. Inconsistências entre a tela e o servidor

1. **A lista de ocorrências manda a linha inteira da planilha.**
   `Conduta_apiListarOcorrencias` faz `Object.assign({}, lido)` e só apaga
   FOTO_URL (Ocorrencias.js:698, 754). O navegador recebe:
   - **do envolvido:** FISCAL_ID, **FISCAL_NOME** (quem o denunciou),
     HOMOLOGADA_POR, JULGADA_POR, TEXTO_JULGAMENTO, DESCRICAO e HISTORICO_JSON
     com o nome e o perfil de cada decisor;
   - **de quem registrou** (qualquer colega): **TEXTO_CONTESTACAO e
     TEXTO_RECURSO do acusado**, o julgamento e o histórico.

   A tela não mostra nada disso, mas qualquer pessoa pode ler pelas ferramentas
   do navegador. É preciso decidir o que deve ser visível e cortar o resto no
   servidor.
2. **A aba "Relatórios e extratos" promete mais do que o servidor entrega.**
   Ela diz "A gestão e o RH geram o extrato de qualquer pessoa" e mostra o
   seletor de colaborador e o cartão "Relatório da equipe" a todo
   gestor/RH (tela:832-835). O servidor recusa quem não é decisor
   (Extrato.js:179; RelatorioEquipe.js:200).
3. **O celular oferece "Sugestões de ocorrência" e "Kanban"** a qualquer gestão
   e RH (JS_Core.html:5612-5613). O servidor recusa (Qualidade.js:135-141).
4. **"O que aconteceu" aparece no celular e não no computador** para o mesmo
   colaborador (JS_Core.html:5660; tela:182-196).
5. **O cartão de sigilo** só aparece para gestão e RH (tela:177-182). O
   colaborador comum não recebe explicação de por que não vê quem registrou.
6. **A ajuda diz que a gestão "vê tudo da equipe"** (Ajuda_Conduta.js:109) e a
   aba Fechamentos descreve o RH vendo "valores de cada pessoa"
   (Ajuda_Conduta.js:363). Está coerente com o servidor, mas não avisa que o
   relatório de missões revela gravíssima.
7. **Nenhuma função de servidor do módulo responde sem sessão.** Todas as
   `Conduta_api*` chamam uma guarda, menos `apiPing`. As únicas funções
   públicas sem guarda devolvem só o HTML estático da tela
   (ConteudoModulo.js:2; TelaQualidade.js:47).

---

## 8. Lacunas que geram desconfiança no colaborador

1. Não sabe **por que** a ocorrência foi mantida: não vê a fundamentação.
2. Não sabe **quem decidiu**, nem se a decisão foi da Diretoria ou do Gestor de
   Qualidade, exceto pelo selo "Decisão da Diretoria" em caso próprio da
   Diretoria.
3. **Não é avisado** quando a contestação é julgada nem quando a ocorrência fica
   firme. Descobre olhando a lista ou o extrato.
4. Não vê **o próprio texto de defesa** depois de enviar, nem o **prazo** que a
   gestão tem para julgar.
5. Perde o bônus por ocorrência de terceiros sem conseguir ver **quais**
   ocorrências do mês derrubaram o farol, mesmo anonimizadas. Só tem o total
   no farol, os balões soltos e o relatório mensal agregado por código.
6. No computador, não vê **o que foi descrito** sobre ele.
7. Não vê a **trilha de reincidência**: por que a ocorrência saiu LR ou MR.
8. Não há canal para questionar **missão recusada** além do texto "fale com a
   gestão antes do fechamento" (Missao.js:194-195), sem registro formal.
9. Ocorrência "Não identificado" tira pontos de todos **sem defesa possível**.
10. **Ausência lançada por qualquer gestor muda o índice de todos sem deixar
    log** da inclusão.

---

## 9. Riscos de acesso (resumo técnico)

| # | Risco | Gravidade | Evidência |
|---|---|---|---|
| R1 | Qualquer ADMIN/DIRETORIA/GESTOR/RH/FINANCEIRO troca a área de qualquer pessoa, inclusive a própria. Um gestor vira "Qualidade" e passa a ver nomes e fotos e a decidir. | Alta | SGO_Areas.js:187-193, 291-307; Ocorrencias.js:185-187 |
| R2 | O relatório de missões mostra "Infração gravíssima própria" com o nome a qualquer gestor e ao RH. | Alta (fura o sigilo) | RelatoriosGerenciais.js:181, 206, 252-258, 280-284 |
| R3 | A prévia e o fechamento permitem deduzir a gravíssima (elegíveis > 0 com incentivo 0). | Média | Fechamento.js:110-113, 126-128, 237-238; Calculo.js:119-122 |
| R4 | A lista de ocorrências envia nome de quem registrou, histórico e julgamento ao envolvido, e a defesa ao denunciante. | Média | Ocorrencias.js:698-756 |
| R5 | Qualquer gestor aprova missão (dinheiro), lança missão para colega já aprovada, cadastra km, lança e remove ausência e fecha o mês. A inclusão de ausência e o cadastro de destino não têm log. | Média (efeito financeiro) | Missao.js:61-63, 157-158; Ocorrencias.js:370-381; Ausencia.js:13-38; Fechamento.js:16-17 |
| R7 | O julgamento não exige fundamentação, e o envolvido não recebe o resultado. | Média (transparência) | Ocorrencias.js:882-884, 915-917 |
| R8 | Telas oferecem funções que o servidor nega, gerando erro e sensação de "sistema escondendo algo". | Baixa | tela:832-835; JS_Core.html:5612 |

---

## 10. Opções de transparência sem quebrar o sigilo

| Opção | Já existe | Falta | Tipo de mudança | Esforço |
|---|---|---|---|---|
| **A. Ficha da ocorrência para o envolvido**: o que aconteceu, a foto, a situação e os prazos (contestação, julgamento, recurso) | Os dados existem (DESCRICAO, prazos, foto; Ocorrencias.js:635, 706-737). A janela de detalhe existe para decisores (tela:508-538). | Abrir a janela também para o envolvido, sem o "Registrada por", e incluir o PRAZO_JULGAMENTO. | Código (tela) | Pequeno |
| **B. Trilha de decisões para o envolvido**: datas e papel de quem decidiu ("Diretoria" ou "Gestor de Qualidade") e a fundamentação | HISTORICO_JSON com data, perfil, ação e texto (Ocorrencias.js:242-249). TEXTO_JULGAMENTO. | O servidor montar uma versão "para o envolvido": papel em vez de nome, se o dono preferir, sem o fiscal. A tela exibir a trilha. Incluir no extrato. | Código (servidor e tela) | Pequeno a médio |
| **C. Fundamentação obrigatória no julgamento** | Obrigatória só para rejeitar e na decisão da Diretoria em caso próprio (Ocorrencias.js:790, 883). | Exigir texto mínimo também para ANULAR e MANTER. | Código (servidor e tela) | Pequeno |
| **D. Aviso do resultado ao envolvido** (julgamento, ficou firme, rejeitada ou descartada) | Mecanismo de aviso SGO_notificar_ (usado em Missões, Missao.js:193). Balão de ciência. | Chamar o aviso no julgamento e na mudança automática para FIRME, sem detalhes no e-mail, com ciência registrada. | Código (servidor) | Pequeno |
| **E. "Minha defesa"**: mostrar ao envolvido o texto que ele enviou e a resposta | TEXTO_CONTESTACAO, TEXTO_RECURSO e TEXTO_JULGAMENTO gravados. | Exibir na ficha da opção A. | Código (tela) | Pequeno |
| **F. Composição anônima do mês**: lista das ocorrências FIRMES do mês com código, pontos e data, **sem nome**, marcando "sua" quando for dele, e o impacto no índice | Relatório mensal agregado por código (Relatorio.js:45-125). Aviso anônimo por ocorrência (Ciencia.js:144-167). Farol com a série diária (Fechamento.js:316-344). | Uma lista "o que pesou no índice deste mês", anônima, no farol ou no extrato, com "suas: X pontos / equipe: Y pontos". Avaliar se a data exata deve aparecer: semana ou mês reduz a chance de deduzir quem foi. | Código (servidor e tela) | Médio |
| **G. Extrato com o "porquê"**: no extrato, cada ocorrência própria com a fundamentação final, o papel de quem decidiu e o motivo de reincidência | Extrato com a tabela de ocorrências (Extrato.js:137-139) e a fundamentação só da Diretoria em caso próprio (:151-172). | Acrescentar colunas e notas. | Código (servidor) | Pequeno |
| **H. Mostrar ou não quem registrou** | Hoje o nome não aparece na tela, mas **é enviado** (Ocorrencias.js:741). | **Decisão do dono**: (a) ocultar de vez, cortando no servidor; ou (b) mostrar. Em qualquer dos casos, parar de enviar o que não se mostra. | Decisão, depois código (servidor) | Pequeno |
| **I. Cortar campos sensíveis da resposta da lista** (R4) | Já existe o corte da FOTO_URL (Ocorrencias.js:752-754). | Para quem não decide: remover FISCAL_* (se H = ocultar), HISTORICO_JSON bruto, *_POR. Para o fiscal: remover TEXTO_CONTESTACAO e TEXTO_RECURSO. | Código (servidor) | Pequeno |
| **J. Tirar a gravíssima do relatório de missões e da conta da prévia** (R2, R3) | O sigilo já é aplicado à prévia e ao fechamento, mas incompleto. | Na visão de quem não decide: trocar o motivo por "Não elegível" e não mostrar `qtdMissoesElegiveis` junto com incentivo 0, ou mostrar só o valor final. | Código (servidor) | Pequeno |
| **K. Travar a troca de área** (R1) | A troca de área tem log (SGO_Areas.js:303). | Impedir mudar a própria área. Exigir Diretoria ou dono para pôr alguém na área QUALIDADE ou tirar dela. Opcional: lista explícita de "decisores do programa" em parâmetro, em vez de depender da área. | Código (servidor), depois configuração | Pequeno |
| **L. Restringir decisões financeiras a quem deve decidir** (R5) | Tudo depende de `isAdminSession` (qualquer gestor). | Definir se aprovar missão, lançar ausência, cadastrar km e fechar o mês ficam com a Diretoria e o RH (elisa) ou com o gestor da área do colaborador. Gravar log na inclusão de ausência e no cadastro de destino. | Decisão, depois código | Médio |
| **M. Canal formal para missão recusada** | Motivo da recusa gravado e avisado (Missao.js:180-197). | Botão "pedir revisão" com prazo antes do fechamento e resposta registrada (mesmo modelo da contestação). | Código | Médio |
| **N. Alinhar as telas ao servidor** (seção 7, itens 2 a 5) | Funções de servidor corretas. | Esconder o seletor de extrato, o relatório da equipe e os botões de Sugestões e Kanban de quem não decide. Mostrar "o que aconteceu" também no computador. Explicar ao colaborador comum por que não vê quem registrou. Atualizar a ajuda e o manual no mesmo pacote. | Código (tela e ajuda) | Pequeno |

Nenhuma dessas opções é só mudança de configuração. O único ajuste possível
hoje sem código é **administrativo**: garantir que só matheusgodoi esteja na
área QUALIDADE entre os GESTOR/ADMIN e acompanhar o log `USUARIOS_AREA`. Isso
não fecha a brecha R1.

---

## Anexo: evidências (arquivo:linha)

Base: `output/comercial-20261110/base/legado/`.

**Acesso e perfis**
- SGO_Auth.js:695-708: `isAdminSession` = ADMIN, DIRETORIA ou GESTOR (de qualquer área).
- SGO_Auth.js:726-728, 774-776: perfil RH; `SGO_podeConsultarPessoas_` = gestão, RH e rotina (inclui FINANCEIRO, :750).
- SGO_Chaves.js:32, 135-138: `SGO_DONOS = ['admin']`.
- SGO_Areas.js:116-126: área vem de CAD_USUARIOS.AREA.
- SGO_Areas.js:187-193, 291-307: qualquer perfil de rotina troca a área de qualquer pessoa, sem impedir a própria.
- Index.html:296: menu Conduta. JS_Core.html:840-849: escondido só para cliente. JS_Core.html:815: RH tem a tela.

**Guardas do módulo**
- Ocorrencias.js:34-136: lista de funções liberadas (`allow`) e sessão obrigatória (:37).
- Ocorrencias.js:145-151: `Conduta_exigirEquipe_` (bloqueia só CLIENTE; REPRESENTADA já é barrada em SGO_Auth.js:670-672).
- Ocorrencias.js:157-160: `Conduta_podeConsultarTodos_` = gestão ou perfil RH.
- Ocorrencias.js:165-168: `Conduta_exigirGestor_` = isAdminSession.
- Ocorrencias.js:180-205: identidade (Diretoria, dono, GESTOR/ADMIN da área QUALIDADE) e `Conduta_exigirDecisor_`.
- Ocorrencias.js:470-474, 477-495: foto.
- Ocorrencias.js:499-503: `apiObterSigilo`.

**Ocorrências**
- Ocorrencias.js:546-654: registro, prazo de registro, homologação no registro pela Diretoria ou dono.
- Ocorrencias.js:661-757: lista (filtro "só minhas" :693-695; campos devolvidos :698-756; FISCAL_NOME :741; FOTO_URL removida :754).
- Ocorrencias.js:762-817: homologar (Regra 12 :770-772; rejeitar exige fundamentação :790).
- Ocorrencias.js:831-856: contestar.
- Ocorrencias.js:861-918: julgar (sem fundamentação obrigatória salvo caso próprio da Diretoria :882-884; aviso só à Diretoria :915-917).
- Ocorrencias.js:924-946: recorrer (um único recurso :933).
- Ocorrencias.js:1005-1045: D, gravíssima e placar.
- Ocorrencias.js:1051-1085: prazos automáticos (DESCARTADA, FIRME).

**Cálculo e fechamento**
- Calculo.js:23, 43-57, 64-97, 111-147: pesos, ICO, farol, reincidência, bônus e incentivo.
- Setup.js:224-238: parâmetros. Setup.js:241-283: catálogo (nível, peso, placar).
- Fechamento.js:16-88: fechar. :91-103: pendências. :110-113: linha "sem ocorrências". :115-135: prévia. :160-220: apuração (filtro de colaboradores :174-176). :222-240: fechamento por pessoa. :257-307: farol.
- Ciencia.js:409-437: fechamento automático. Ciencia.js:441-469: saneamento de 15/10 (fim do modo de teste).
- Ausencia.js:13-38 (lançar, sem log), :41-53 (listar), :55-64 (remover, com log), :71-78 (efeito no divisor).
- Missao.js:19-90 (registrar; aprovação automática quando a gestão lança para outro :61-63), :157-198 (decidir; aviso ao executante :191-197), :231-268 (listar), :290-307 (elegíveis).

**Avisos e ciência**
- Ciencia.js:14-17, 135-193: avisos sem nome para a equipe.
- Ciencia.js:209-241: balão; versão do envolvido :218-223.
- Ciencia.js:244-271: ciente ou fechou.
- Ciencia.js:274-299: painel de ciência (qualquer gestor).

**Extrato e relatórios**
- Extrato.js:22-76 (conteúdo), :118-149 (A4), :151-172 (fundamentação só da Diretoria em caso próprio), :174-190 (acesso).
- RelatorioEquipe.js:197-200: só decisor.
- Relatorio.js:22-23, 45-125: mensal agregado. :445-446: gerar (gestor). :470-503: ver (todos). :515-537: prévia A4 com valores por pessoa.
- RelatoriosGerenciais.js:153-187: missões com nome e motivo, incluindo "Infração gravíssima própria" (:181). :251-258: gerar (gestor). :268-284: listar e abrir (gestão e RH).

**Qualidade e sugestões**
- Qualidade.js:135-141: `Cndq_exigirConsulta_` (decisor).
- Qualidade.js:487-491: sugestão vinda da avaliação de gestor fica só com a Diretoria.
- Qualidade.js:801-822: Kanban (não decisor vê só as próprias).

**Telas**
- JS_Conduta.html:1-63: carrega a tela de `Conduta_obterConteudoModulo` e `Conduta_obterTelaQualidade`.
- Tela decodificada de SGO_Conduta_ConteudoModulo.js:1:
  - tela:177-182: cartão de sigilo, só para gestão e RH;
  - tela:182-196: lista de ocorrências;
  - tela:225-283: botões de ação e prazos;
  - tela:287-300: `podeGerir`/`consultaGeral` (só para a tela);
  - tela:508-538: detalhe com "Registrada por", aberto só em homologar e julgar;
  - tela:578-583: contestar, só com a caixa de texto;
  - tela:832-835: relatórios, que oferecem extrato de qualquer pessoa e relatório da equipe a gestão e RH.
- JS_Core.html:5521-5544: defesa pelo celular. :5596-5617: tela do celular (botões de Sugestões e Kanban :5612-5613). :5641-5668: lista no celular com "o que aconteceu" (:5660).
- JS_Core.html:7489-7500: balão de avisos.

**Ajuda**
- SGO_Ajuda_Conduta.js:108-110, 120, 262, 296, 319, 363, 403-405: quem pode o quê, segundo o manual.

**Dados de usuários (contexto)**
- output/permissoes-20261110/usuarios.txt: perfis e áreas atuais; contas REPRESENTADA ativas (`qualidade`, `energiza2209`).
