# Pacote 3 de 18/11/2026 (pendências, bate-papo e e-mail): relatório

Base: `output/financeiro-20261116/cand28`, igual à cand27 (produção atual com os pacotes 1 e 2) antes deste trabalho (`diff -rq` vazio). Nada foi publicado e nada foi gravado na produção. Houve leituras no banco com `default_transaction_read_only=on` (abas `ATEC_CHAMADOS`, `ATEC_OS`, `ATEC_EVENTOS`, `ATEC_CONFIG`, `AUVO_PENDENCIAS`, `AUVO_TAREFAS`, `ATV_ATIVIDADES` e `CAD_USUARIOS`, copiadas para a pasta temporária da sessão, fora do projeto) e a leitura do `htmlSeguro.ts` de dentro do contêiner, para conferir o que o servidor faz com o HTML do e-mail. Nenhum e-mail, WhatsApp ou notificação real; os testes usam os simuladores.

Placar: **2653 aprovados / 0 falhas, 290 arquivos, todos com saída 0** (referência anterior: 2641 / 0) (`suite.txt`). Testes novos: `tests/pedidos-20261118-p3-{pendencias,chat,email,telas}.test.cjs`, com 4, 3, 4 e 1 testes, todos verdes.

## 1. O que foi feito, por item

### Item 9: atendimento reagendado continuava com "prazo estourado"

**Causa.** O alerta "Prazo estourado: chamado ..." (`ast_sla`, em `SGO_Assistencia_Painel.js`) olhava só o estado do prazo do contrato (`Ast_slaEstado_`). O agendamento e o reagendamento mudam a data da visita (`AGENDADO_PARA`), mas não o prazo, então o chamado com a visita já marcada para outro dia continuava como pendência crítica de quem já tinha agido.

**Regra nova.**
- Chamado "Agendado" com a visita marcada para depois de agora (no primeiro agendamento ou num reagendamento) **sai das pendências** do Início e da Caixa de decisões (a mesma fonte, `SGO_Alertas_Central.js`) até a data marcada. Vale para "estourado" e para "em risco".
- **O prazo não é apagado.** `Ast_slaEstado_` não mudou: o selo "Prazo estourado em ..." continua na ficha e na lista, o contador "estourados" da tela da Assistência e os indicadores do relatório mensal continuam contando o chamado, e o reagendamento já ficava no histórico com o motivo.
- A ficha mostra a faixa "Visita reagendada para ..." (ou "Visita marcada para ..."), com o prazo que estourou e a explicação de que o chamado volta à lista se a chegada não for registrada.
- **Passada a data sem a chegada**, o chamado volta à lista com "Prazo estourado: chamado ...: a visita marcada não foi registrada", o técnico e a data no detalhe e o que fazer (registrar a chegada pelo aplicativo ou reagendar com o motivo). Chamado aberto em campo pelo técnico não usa esse texto.
- **Auvo** (`auvo_os_aberta`): a lista é uma foto da última varredura (na produção, a última é de 12/11). A O.S. que a sincronização das tarefas (`AUVO_TAREFAS`, mais frequente) leu **depois** da foto já finalizada, ou com a data passada para um dia depois de hoje (reagendada no Auvo), sai da lista. Leitura mais antiga que a foto não muda nada. Nada é apagado.
- Conferidos e sem mudança: `atividade_atrasada` (a atividade do atendimento de O.S. já era cobrada pela O.S., e o reagendamento já muda o prazo da atividade), `plano_atrasado` (replanejar muda o prazo do plano) e `ast_agendar` (é do chamado ainda sem agenda).

**Antes × depois na produção** (foto das abas lida em 18/11/2026 às 15:48, contada com o código real da cand27 e da cand28 pelo script `contar-producao.cjs`; resultados em `producao-item9-cand27.json` e `producao-item9-cand28.json`):

| | Antes (cand27) | Depois (cand28) |
|---|---|---|
| Itens "Prazo" (`ast_sla`) | 8 | 6 |
| ... com "Prazo estourado" | 5 | 3 |
| ... de chamados com a visita marcada para o futuro | **2** | **0** |
| O.S. abertas no Auvo (`auvo_os_aberta`) | 197 | 197 |

- Os dois que saem: **CH-2026-0027** (prazo em 13/11; reagendado em 17/11 de 16/11 para 30/11, "equipamento do cliente com defeito") e **CH-2026-0029** (P1, prazo em 10/11; agendado em 17/11 para 23/11).
- Continuam, como devem: CH-2026-0037, -0039 e -0040 (estourados, sem visita marcada) e os três em risco. O CH-2026-0042 (aberto em campo em 16/11, sem chegada registrada) continua "em risco" com o texto de sempre.
- Auvo: nenhuma das 197 O.S. da foto tem leitura mais nova finalizada ou reagendada (52 estão nas duas listas e com a mesma data). A queda depende da próxima varredura completa, que está parada desde 12/11; ver Riscos.

### Item 10: bate-papo mais visível

O botão redondo do balão fica escondido desde 11/11; o bate-papo abre pelo botão "Bate-papo" do topo (computador) e pelo ícone da barra do topo (celular), em todas as telas. Mudou:
- **Com não lidas:** o botão fica vermelho (fundo, borda e texto), o número fica maior, com borda branca, e no computador aparece "Bate-papo · N novas". O título e o `aria-label` dizem "N novidades não lidas".
- **Quando o número sobe:** pulso discreto de três vezes (1,1 s cada). Com "menos movimento" ligado no sistema, um contorno no lugar da animação.
- **Título da aba:** já mostrava "(n)" e já alternava com "Nova mensagem" com a aba em segundo plano. Continua e foi conferido no teste.
- **Notificação do navegador:** nova, em «Preferências», **desmarcada por padrão** e guardada só no aparelho (`comw_notif`). A permissão do navegador só é pedida quando a pessoa marca a caixa. Aparece só com a página em outra aba ou com o bate-papo fechado; tocar nela abre a conversa. Se o navegador bloquear, a tela explica como liberar.
- **Som:** o padrão continua "só avisos críticos" (mensagem não toca). A preferência agora diz isso ("só avisos críticos (mensagens sem som)", "mensagens e avisos", "desligado").
- A ordem cronológica da conversa (09/11) não mudou (`ordenarMsgs`) e foi conferida no teste. O chat do RH360 não foi tocado.

### Item 11: e-mail

- **Leitura** (`JS_Email.html`): no computador, ao abrir a mensagem, a coluna das pastas sai e a lista fica com até 300 px; a leitura ocupa o resto, com assunto em 19 px e texto em 15 px. A 1366 px (`capturas/medidas-email-1366.json`), a leitura passa de 462 px para 754 px de largura, e para 1.066 px em "Tela cheia". "Tela cheia" deixa só a mensagem (a escolha fica guardada no navegador); "Voltar à lista" traz pastas e lista. Se a leitura começa abaixo do meio da tela, a página rola até ela. No celular a leitura já era a tela toda e continua.
- **Janela de escrever, responder e encaminhar:** até 1.120 px de largura (antes 820; medida: 1.120 px, e 1.366 px maximizada) e texto com pelo menos 320 px de altura; "Maximizar" usa a tela toda (escolha guardada no navegador) e "Restaurar" volta.
- **Formatação:** além de negrito, itálico e sublinhado, agora há Fonte (9 fontes comuns no Outlook e no Gmail), Tamanho (10 a 36 px), cor da fonte, cor de destaque e "limpar formatação". A seleção do texto é guardada enquanto a pessoa escolhe na barra. O resultado é `style` em linha (`font-family`, `font-size` em px, `color`, `background-color`), sem `<font size>`.
- **HTML seguro:** antes de enviar ou salvar o rascunho, a tela limpa o HTML (`Email_htmlSeguro_`). Tira script, formulário e estilo de página, os atributos `on*`, links que não são http(s), mailto ou tel, e CSS fora da lista de aparência (sem `position`, `url()` externo ou `expression`). O servidor de produção já higieniza de novo (`htmlSeguro.ts`, lido no contêiner) e mantém `style`, `<font>` e as marcas de texto. **Não foi preciso mudar o servidor.**
- **Anexos:** "Anexar" fica na linha do Assunto (no celular, só o clipe). Os anexos aparecem logo abaixo do assunto, antes da barra e do texto, um por linha, com ícone pelo tipo, nome em negrito, tamanho e "× Remover". Os da mensagem original (contorno tracejado, com a caixinha) e os do rascunho ficam no mesmo lugar. Os limites e os avisos (o quê, por quê e o que fazer) não mudaram.

## 2. Arquivos (relativos à cand28)

**Novos:** nenhum.

**Alterados.** O fim de linha foi conferido arquivo a arquivo: o único CRLF (`ComunicacaoWidget.html`) continua CRLF em todas as linhas e os LF continuam LF.

| Arquivo | Fim de linha | O que mudou |
|---|---|---|
| `SGO_Assistencia_Config.js` | LF | `Ast_visitaMarcada_` (visita marcada para o futuro e se houve reagendamento) |
| `SGO_Assistencia_Painel.js` | LF | `ast_sla` não é criado com a visita marcada para o futuro; texto e o que fazer quando a visita marcada passou sem chegada |
| `SGO_Assistencia_Chamados.js` | LF | `visitaMarcada` na ficha do chamado |
| `JS_Assistencia.html` | LF | faixa "Visita reagendada para ..." na ficha |
| `SGO_Alertas_Central.js` | LF | `Pend_ms_`, `Pend_tarefasAuvoRecentes_`, `Pend_auvoJaTratada_`; O.S. do Auvo finalizada ou reagendada depois da foto não é cobrada |
| `ComunicacaoWidget.html` | CRLF | notificação do navegador opcional, rótulos do som, texto da ajuda do balão |
| `JS_Core.html` | LF | `Topo_estadoChat_`: destaque, "N novas", pulso e `aria-label` do botão do topo |
| `Index.html` | LF | `<span class="topo-novas">` no botão "Bate-papo" |
| `UI_Estilos.html` | LF | `.topo-chat-novo`, `.topo-chat-chegou` e a alternativa sem animação |
| `JS_Email.html` | LF | leitura larga e em tela cheia, janela grande com Maximizar, barra de formatação, HTML seguro, anexos abaixo do assunto |
| `SGO_Ajuda_Email.js` | LF | 4 passos novos, 2 cores e 2 perguntas |
| `SGO_Ajuda_Assistencia.js` | LF | selo "Prazo estourado", faixa "Visita reagendada" e pergunta |
| `SGO_Ajuda_Principal.js` | LF | Início (computador e celular): cor do botão do bate-papo e duas perguntas (reagendado e mensagem nova) |
| `SGO_AssistenteManuais.js` | LF | base do assistente regerada do `docs/` (versão `7d49201d30c3`; `--conferir` em dia) |

**Fora da cand28:**

- Manuais:
  - `docs/MANUAL_MODULO_ASSISTENCIA.md`: seção "Visita marcada com o prazo estourado (18/11/2026)".
  - `docs/MANUAL_BATE_PAPO.md`: seção "1A. Mensagem nova à vista (18/11/2026)".
  - `docs/MANUAL_MODULO_EMAIL.md`: seção "6D. Leitura, janela de escrever, formatação e anexos (18/11/2026)" e o trecho de 6B.
  - `docs/MANUAL_MATRIZ_DE_AVISOS.md`: nota na ordem da janela ao entrar.
- Testes novos: os 4 acima.
- Ambientes de teste novos, cópias fiéis dos que já existiam, para não duplicar código nos testes:
  - `tests/_p3_chat_ambiente.cjs`, tirado de `chat-documentos-20261116.test.cjs`;
  - `tests/_p3_email_ambiente.cjs`, tirado de `email-outlook-20261117.test.cjs`.
  - Os testes de origem não mudaram.
- `output/pedidos-20261118/p3/contar-producao.cjs`: conta o item 9 sobre a foto da produção com o código de qualquer cópia (não grava nada).
- Nenhum teste antigo foi ajustado.

Diff completo: `legado-p3.patch` (cand27 → cand28). Capturas: `capturas/` (1366 e 390 px). Os ícones da Font Awesome não aparecem nas capturas porque o ensaio não acessa a internet; no sistema eles carregam normalmente.
- **Item 9:**
  - `antes-*` e `depois-*`, para `inicio-prioridades` e `inicio-prazos`. As capturas `antes-*` foram geradas com a cand27 e `ROTULO=antes`.
  - `depois-*-ficha-visita-reagendada`.
- **Item 10:** `chat-topo-nao-lidas`, `chat-topo-chegou`, `chat-lista-nao-lidas` e `chat-preferencias`.
- **Item 11:**
  - `email-leitura` e `email-leitura-tela-cheia`;
  - `email-responder-anexos-formatacao` e `email-maximizada`;
  - `390-email-responder-anexo`.

## 3. Decisões

- **O que conta como "já reagendado":** chamado na situação "Agendado" com a visita marcada depois de agora, tanto no primeiro agendamento feito depois do prazo quanto no reagendamento. Nos dois casos quem cuida do chamado já agiu, que é o pedido do Matheus.
- **O prazo do contrato não muda.** Sair da lista de pendências não é "zerar" o prazo. O estouro fica no selo, no contador da tela, nos indicadores e no histórico. Não criei um "prazo novo" contado da data reagendada: o contrato com o cliente não mudou.
- **Volta à lista com texto próprio** quando a data marcada passa sem o "Cheguei", para a visita perdida não sumir.
- **Auvo:** só a leitura mais nova que a foto vale, e só para tirar da lista (finalizada ou data num dia depois de hoje). A foto e o Auvo não são alterados.
- **Bate-papo:** a notificação do navegador e o som das mensagens vêm desligados, como pedido. O som "só avisos críticos" continua sendo o padrão, porque já estava publicado. O widget é o mesmo arquivo de antes, sem cópia nova; o COMMAND foi descontinuado e não recebeu nada; o RH360 não foi tocado.
- **E-mail:** "ampla" (lista estreita ao lado) é o padrão da leitura no computador, porque permite seguir para a próxima mensagem sem voltar. "Tela cheia" fica a um toque e é guardada. A formatação usa só `style` em linha com propriedades que o Outlook e o Gmail respeitam.
- **Servidor Node:** não precisou de patch (a higienização de produção já preserva a formatação).

## 4. Riscos

- **Foto do Auvo parada:** a última varredura completa de `AUVO_PENDENCIAS` na produção é de 12/11/2026. Com ela parada, O.S. reagendada no Auvo só sai da lista se a sincronização das tarefas (janela recente) a tiver lido. Vale conferir a rotina da varredura (Integração Auvo).
- **Visita marcada e não feita:** até a data marcada o chamado não aparece nas pendências, mesmo com o prazo estourado. É o comportamento pedido; a faixa na ficha e o selo vermelho continuam à vista.
- **Formatação colada de outros programas:** o que vier com CSS fora da lista perde só essa parte; o texto fica. A seleção guardada depende do navegador (testado no Chromium; `execCommand` é o mesmo usado desde 21/10).
- **Notificação do navegador:** depende da permissão do navegador e do sistema; em janela privada ou com os dados do site limpos, a preferência volta a "desligada".
- **Contador do topo:** soma mensagens, avisos e comunicados do bate-papo (como o número do balão já fazia); o texto diz "novidades".

## 5. Placar

Suíte completa: **2653 aprovados / 0 falhas, 290 arquivos, todos com saída 0** (referência anterior: 2641 / 0) (`suite.txt`, `suite-execucao.log`). Regressão dirigida antes da suíte, toda com 0 falhas:
- e-mail: `email-outlook-20261117`, `email-integrado`, `etapa5-compras-email-cadastros`;
- Assistência: `assistencia`, `assistencia-tela`;
- bate-papo: `bate-papo`, `bate-papo-imagens`, `chat-documentos-20261116`;
- casca e assistente: `assistente-duvidas`, `navegacao-subniveis`;
- os 4 testes do pacote.
