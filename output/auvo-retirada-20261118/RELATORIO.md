# Retirada do Auvo do SGO+ (18/11/2026)

<div style="text-align: justify">

Decisão do dono (18/11/2026): "O Auvo não faz mais parte do sistema, quero que retire tudo, cancelamos com eles; quero que todas pendências ou qualquer outra coisa seja retirado do sistema, dos avisos e dos alertas."

Cópia de trabalho: `output/financeiro-20261116/cand31` (partiu da `cand30`, igual à produção). Nada foi publicado, nada foi gravado na produção, a API do Auvo não foi chamada, o servidor Node e o cofre (`/opt/metrolabs/sgo/cofre`) não foram tocados e nenhum valor de segredo foi lido. Nenhum commit foi feito.

## Resumo

1. **Nenhuma rotina do Auvo roda mais.** As seis funções de gatilho (`Auvo_dispararSincronizacaoIncremental_`, `Auvo_dispararSincronizacaoReversaDiaria_`, `Auvo_pendDispararDiario_`, `Auvo_continuarViaTrigger_`, `Auvo_pendContinuarViaTrigger_` e `AuvoAcervo_loteGatilho`) ficaram no lugar só para se remover da agenda na primeira execução, sem chamar a API. Nenhum código cria mais gatilho do Auvo. `Auvo_apiFetch_`, `Auvo_autenticar_`, `AuvoAcervo_getAuvo_` e `Auvo_criarTarefa_` recusam antes de qualquer rede. Arquivo novo `SGO_Auvo_Retirada.js` com `Auvo_retirarGatilhos_()` para o coordenador rodar uma vez na publicação.
2. **Pendências, alertas, avisos e Caixa de decisões sem o Auvo.** A fonte `Pend_fonteAuvo_` saiu da central (`auvo_os_aberta`, `auvo_sem_vinculo`, `auvo_importacao`); a qualidade não cobra mais O.S. do Auvo; os eventos S54, S55 e S56 saíram da matriz de avisos e ficam registrados na trilha; aviso do Auvo guardado para o resumo não sai mais; item do Auvo que estava aberto na Caixa sai como **RETIRADA** (não conta como decisão, nem como resolvido, nem na nota); sugestão pendente do Programa de conduta vinda do Auvo é encerrada pelo sistema, sem cobrança, com o motivo.
3. **Telas.** "Integração Auvo" e "Transição do Auvo" saíram do menu; o polling e os balões de atendimento do Auvo saíram; Chaves e senhas não mostra mais o grupo Auvo; 4 caixas de Acessos saíram. Ficou o **"Histórico do Auvo (sistema descontinuado em 18/11/2026) — somente consulta"**, só para Administrador e Diretoria.
4. **Dados misturados passam a ser só do SGO+.** A fonte única de atendimentos (`SGO_Atendimentos_linhas_`), sem origem, devolve só as O.S. do SGO+: agenda dos técnicos, conflito de horário, Atividades da equipe, Início (bloco de atendimentos), Painel de qualidade, Programa de conduta, ponto, Frota (rota e reservas) e a Recarga semanal ("Puxar da minha agenda").
5. **Histórico guardado.** Nenhuma tabela nem registro do Auvo foi apagado. O histórico do Auvo ligado ao equipamento continua aparecendo onde já aparecia (ficha do equipamento, prontuário/pastas, QR e Portal do cliente), pela mesma função (`SGO_Atendimentos_doEquipamento_`, agora com origem `TODAS`).
6. **Ajuda, manuais e assistente** atualizados; base do assistente regerada (49 manuais, 1.534 seções, versão `09bfddc0ffbb`).
7. **Testes:** novo `tests/auvo-retirada-20261118.test.cjs` (12 testes) e 25 arquivos de teste ajustados de propósito, com comentário datado. Placar no fim.

## 1. Levantamento (antes de mexer)

Contagem de arquivos do legado com "Auvo" na `cand30`: 136. Agrupado por papel:

| Grupo | Arquivos | O que fazia |
|---|---|---|
| Integração (núcleo) | `SGO_Auvo_Config.js`, `SGO_Auvo_Main.js`, `SGO_Auvo_Push.js`, `SGO_Auvo_Reverso.js`, `SGO_Auvo_Incremental.js`, `SGO_Auvo_Pendencias.js`, `SGO_Auvo_Auditoria.js`, `SGO_Auvo_Relatorio.js`, `SGO_Auvo_RelatorioIA.js`, `SGO_Auvo_ConteudoModulo.js` (tela), `JS_Auvo.html` | API, login, envio de clientes/técnicos/equipamentos, importação reversa (04:00), sincronização de tarefas (30 min), varredura de O.S. abertas (05:00), auditoria, relatório e a tela "Integração Auvo" |
| Acervo | `SGO_AuvoAcervo.js`, `SGO_AuvoAcervo_Tela.js` | cópia do Auvo (contagem, lotes, conferência) e consulta |
| Gatilhos | criadores em Incremental, Pendencias, Reverso e AuvoAcervo; leitura em `SGO_Alertas_Central.js` | agendamento pela tabela `gatilhos` |
| Menus e casca | `Index.html` (Integração Auvo, Transição do Auvo, busca de Vínculos), `JS_Core.html` (rota, títulos, polling/balões, dashboard, modal da O.S.), `JS_Navegacao.html`, `UI_Estilos.html` | menu, rota `auvo`, notificações |
| Acessos | `SGO_Poderes.js` | caixas `AUVO_INTEGRACAO`, `AUVO_IMPLANTACAO`, `AUVO_ACERVO`, `AST_DESLIGAR_AUVO`, `AST_ACEITAR_FALTAS_ACERVO` e textos |
| Chaves | `SGO_Chaves.js`, `JS_Chaves.html` | grupo Auvo (API Key, Token, avisos de O.S., gestão que recebe) e o teste de conexão |
| Central de pendências | `SGO_Alertas_Central.js` | `Pend_fonteAuvo_` (O.S. abertas, sem vínculo, importação parada), qualidade das O.S. do Auvo |
| Matriz de avisos | `SGO_Avisos_Matriz.js` | S54, S55, S56; módulo silenciável `auvo`; tipo técnico `auvo_importacao` |
| Caixa, escada, painéis | `SGO_Gestao_Decisoes.js`, `SGO_Gestao_Painel.js`, `SGO_Gestao_Avaliacao.js`, `SGO_Gestao_RelatorioDiario.js`, `JS_Gestao.html` | tipos `auvo_*`, área padrão, saneamento do acúmulo |
| Conduta e Qualidade | `SGO_Conduta_Qualidade.js`, `SGO_Conduta_TelaQualidade.js`, `SGO_Qualidade_Auvo.js`, `SGO_Qualidade_Main.js`, `SGO_Qualidade_ConteudoModulo.js`, `SGO_Qualidade_IA.js` | sugestões de ocorrência e indicadores dos técnicos a partir das O.S. do Auvo; aviso "Auvo: conexão não configurada" (lia a presença das chaves) |
| Assistência e agenda | `SGO_Assistencia_Fonte.js`, `SGO_Assistencia_Agenda.js`, `SGO_Assistencia_Painel.js` (transição, importação de questionários), `SGO_Assistencia_Relatorio.js`, `SGO_Assistencia_ServicoAtividade.js`, `SGO_Assistencia_Questionarios.js`, `JS_Assistencia.html`, `SGO_Atividades.js`, `JS_Atividades.html` | fonte única Auvo + SGO+, agenda com tarefas do Auvo, transição, indicadores "uso em paralelo" |
| Cadastros e vínculos | `SGO_Vinculos.js`, `JS_Vinculos.html`, `SGO_Unidades.js`, `SGO_CadastroQualidade.js`, `JS_CadastroCorrecoes.html`, `SGO_Equipamentos.js`, `JS_Equipamentos.html` | trava "vale o original", tarefa do Auvo aberta impedindo troca de cliente, histórico do equipamento |
| Emissão de documentos | `SGO_CertCal_Main.js`, `SGO_NR13_Main.js`, `SGO_PgtPop_Main.js`, `SGO_RegOp_Main.js` | `Auvo_criarTarefa_` em cada emissão (o certificado mostrava o aviso "a integração com o Auvo não foi concluída") |
| Recarga, ponto, Frota | `SGO_RecargaCaju_Semanal.js`, `JS_RecargaCaju.html`, `SGO_Ponto_Config.js`, `SGO_Ponto_Rodada.js`, `JS_Ponto.html`, `SGO_Frota_Rastreamento*.js`, `SGO_Frota_Reservas*.js`, `SGO_Frota_ConteudoModulo.js` | tarefas do Auvo na agenda da semana, em atendimento/evidência do ponto, rota do condutor, ligação de reserva |
| Início | `SGO_Main.js`, `JS_Core.html` | bloco "Atendimentos abertos (Auvo)" |
| Ajuda, manuais, assistente | `SGO_Ajuda_Auvo.js` e mais 12 `SGO_Ajuda_*.js`, `SGO_EnviarDoc_Ajuda.js`, `SGO_Assistente.js`, `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js`; 17 `docs/MANUAL_*.md` | textos |
| Outros textos | `SGO_Compras_*`, `JS_Compras.html`, `SGO_Notificar.js`, `SGO_WhatsappPiloto.js`, `JS_WhatsappPiloto.html`, `JS_DocumentosPastas.html`, `SGO_Conduta_Biblioteca.js`, `SGO_Conduta_ConteudoModulo.js`, `SGO_Assistencia_Chamados.js` | rótulos e explicações |
| Perfil técnico | `AUVO_SYNC` em `SGO_Auth.js`, `SGO_Utilis.js`, `SGO_SegurancaAcesso.js`, `SGO_Usuarios*.js` e listas "de fora" de vários módulos | conta técnica que a integração usava; listas mantidas (ver riscos) |

**Produção (só leitura, 18/11/2026, SELECT no Postgres):**

- Tabela `gatilhos` (sistema `sgo`): **3 gatilhos do Auvo** — `Auvo_dispararSincronizacaoIncremental_` (próximo 18/11 21:00), `Auvo_dispararSincronizacaoReversaDiaria_` (19/11 04:00) e `Auvo_pendDispararDiario_` (19/11 05:00).
- `AUVO_PENDENCIAS`: 198 linhas, **195 com a data no último ano** (era a base de `auvo_os_aberta`). `AUVO_TAREFAS`: 388 linhas, **386 sem cliente ou técnico do SGO+** (era a base de `auvo_sem_vinculo` para a gestão).
- `GES_DECISOES` com tipo do Auvo: **64 ABERTA** (vão para RETIRADA na primeira atualização da Caixa depois da publicação), 323 RESOLVIDA e 415 SANEADA (ficam como estão).
- `qual_sugestao` com origem AUVO: **2 PENDENTE** (serão encerradas pelo sistema na próxima coleta), 24 DESCARTADA e 19 SUPERADA.
- `NTF_RESUMO_FILA` do módulo auvo: nenhuma.
- Abas do Auvo guardadas (não mexer): `AUVO_ACERVO_ARQUIVOS` 24.881, `AUVO_ACERVO_JSON` 5.494, `AUVO_ACERVO_TAREFAS` 5.491, `AUVO_LOG` 35.504, `AUVO_SYNC` 1.324, `AUVO_TAREFAS` 388, `AUVO_PENDENCIAS` 198, `AUVO_VINCULOS` 51, `AUVO_DECISOES` 1, `AUVO_SERVICOS` 1.

## 2. O que saiu

### Rotinas e chamadas ao Auvo

- Gatilhos: `Auvo_configurarTriggerIncremental_`, `Auvo_pendConfigurarTriggerDiario_` e `Auvo_configurarTriggerDiarioReverso_` removem o que existir e recusam; `Auvo_pendAgendarContinuacao_`, `Auvo_agendarContinuacaoReversa_` e `AuvoAcervo_agendar_` só removem. As seis funções de gatilho chamam `Auvo_retirarGatilhos_(<própria função>)` e saem.
- `Auvo_retirarGatilhos_()`: sem argumento, remove todos os gatilhos das seis funções; devolve `{ ok, removidos, porFuncao, erro }` e nunca lança. `Auvo_gatilhosRestantes_()` conta o que sobrou (só leitura).
- `Auvo_apiDispatch` recusa tudo com "O Auvo foi descontinuado em 18/11/2026...", menos a consulta de uma O.S. já copiada (`apiObterOS`, leitura da aba, usada no histórico do equipamento) e `apiVerificarNovosEventos`, que responde vazio para navegador com a página antiga aberta. `Auvo_obterConteudoModulo` devolve vazio (a tela não é mais servida; o arquivo fica como registro).
- `AuvoAcervo_apiDispatch`: só `apiStatus`, `apiListarFalhas` e `apiConsultarTarefa` (e `apiPodeVer`); contar, copiar, pausar, continuar, repetir e conferir recusam.
- Emissões: as chamadas a `Auvo_criarTarefa_` saíram do certificado de calibração, do laudo NR-13, do PGT/POP e do registro operacional (o certificado deixou de mostrar o aviso do Auvo).

### Pendências, alertas, avisos, Caixa, Conduta e Qualidade

- Central: `Pend_fonteAuvo_`, `Pend_tarefasAuvoRecentes_` e `Pend_auvoJaTratada_` saíram; tipos `auvo_os_aberta`, `auvo_sem_vinculo`, `auvo_importacao` e o módulo `auvo` saíram. A qualidade (`qualidade_os`) lê só a origem SGO.
- Matriz de avisos: S54, S55 e S56 saíram de `MTZ_PADRAO` e foram para `MTZ_RETIRADOS` (registro), que aparece na trilha de mudanças com a data 18/11/2026 e o motivo. `auvo` saiu dos módulos silenciáveis e `auvo_importacao` dos tipos técnicos. Item da fila do resumo com módulo `auvo` vai para PULADO com o motivo "Auvo descontinuado em 18/11/2026; não foi enviado".
- Caixa de decisões: tipos `auvo_*` saíram de `GES_TIPOS`; área padrão e lista de módulos sem `auvo`; nova situação `RETIRADA` ("Retirada (Auvo descontinuado)"): item do Auvo que some da central sai como RETIRADA, não como RESOLVIDA. `GesP_foraDaAvaliacao_` exclui RETIRADA e qualquer item do Auvo; o painel do Desempenho não mostra RETIRADA. Botões "Saneamento" da Caixa e do Desempenho, o campo de dias do saneamento na Regra da nota e os textos sobre o acúmulo do Auvo saíram (o bloco condicional do saneamento só aparece se houver item do Auvo aberto, o que não acontece mais; o histórico `GES_SANEAMENTO` fica).
- Programa de conduta: `Cndq_coletarAuvo_` virou `Cndq_coletarAtendimentos_` (só O.S. do SGO+); a leitura de `AUVO_PENDENCIAS` saiu; sugestão PENDENTE de origem AUVO vira DESCARTADA pelo "Sistema" com o motivo "O Auvo foi descontinuado em 18/11/2026: sugestões vindas do Auvo foram encerradas sem cobrança. O registro fica guardado." Ocorrências já registradas a partir do Auvo não mudam.
- Painel de qualidade: área de atendimentos lê só as O.S. do SGO+ (rótulos "Assistência técnica"); o aviso "Auvo: conexão não configurada" saiu (ele lia a presença de `AUVO_API_KEY`/`AUVO_API_TOKEN`); `auvo` saiu dos módulos acompanhados; texto da IA ajustado.

### Telas, menus, botões, chaves

- `Index.html`: "Integração Auvo" e "Transição do Auvo" saíram; entrou "Histórico do Auvo" (`data-mod="auvo_historico"`, escondido; `JS_Core.html` mostra só para ADMIN e DIRETORIA). A palavra "auvo" saiu da busca de Vínculos.
- `JS_Core.html`: rota `auvo` e `auvo_historico` abrem o Histórico (quem não é Administrador ou Diretoria vê a explicação da retirada, nunca uma tela vazia); polling e balões do Auvo removidos; bloco do Início virou "Atendimentos abertos" (O.S. do SGO+, "Ver todos" leva às O.S.); link "Abrir no Auvo" do modal saiu.
- `JS_Auvo.html` reescrito: só carrega o Histórico (somente consulta).
- `SGO_AuvoAcervo_Tela.js`: título "Histórico do Auvo (sistema descontinuado em 18/11/2026) — somente consulta"; botões Contar, Iniciar cópia, Pausar, Continuar, Tentar de novo e Conferir saíram; ficam Atualizar, falhas e consulta de tarefa.
- `JS_Assistencia.html` e `SGO_Assistencia_Painel.js`: tela e funções da Transição do Auvo removidas; botões "Trazer os questionários do Auvo" e "Montar os checklists a partir das tarefas do Auvo" saíram (as ações recusam); textos "uso em paralelo ao Auvo" saíram; agenda e indicadores sem o Auvo.
- Chaves e senhas: grupo Auvo, as quatro chaves, as validações e o teste de conexão saíram da tela. **Os valores gravados não foram lidos nem apagados.**
- Acessos: saíram `AUVO_INTEGRACAO`, `AUVO_IMPLANTACAO`, `AST_DESLIGAR_AUVO` e `AST_ACEITAR_FALTAS_ACERVO` (150 → 146 caixas). `AUVO_ACERVO` virou "Histórico do Auvo (somente consulta)" no grupo "Painel de qualidade e histórico do Auvo". Textos de 6 outras caixas ajustados.
- Vínculos: tarefa do Auvo aberta não trava mais troca de cliente; "vale o original" do Auvo deixou de impedir a exclusão (a ligação fica guardada como CADASTRO_EXCLUIDO, só histórico); textos e nomes de tabela viraram "Histórico do Auvo".

### Ajuda, manuais e assistente

- `SGO_Ajuda_Auvo.js` reescrito: só `auvo_historico`. `SGO_Ajuda.js` (nomes), e textos em Administração, Assistência (a ajuda da Transição saiu), Cadastros, Compras, Conduta, Frota, Gestão (saneamento e itens do Auvo), Ponto, Principal, Qualidade, Recarga Caju e Enviar documento.
- `docs/MANUAL_*.md` (17 manuais; cópias anteriores em `docs-antes/`): Assistência (seções "Fonte única e o histórico do Auvo" e "Fim do Auvo (18/11/2026)"), App de campo, Clientes/unidades/vínculos, Conduta (fiscal), Enviar documento, Matriz de avisos, Compras, E-mail, Frota, Caixa de decisões, Ponto, Portal do cliente, Representação, Navegação, Painel financeiro (só a frase da recarga semanal), Recarga Caju e Segurança do acesso (gestão).
- `SGO_Assistente.js` (tela restrita `auvo_historico`: Administrador e Diretoria) e `SGO_AssistenteErros.js` (erros do Auvo levam à tela do histórico). Base `SGO_AssistenteManuais.js` regerada com `_tools/gerar_base_assistente.cjs` (cópia anterior em `SGO_AssistenteManuais.antes.js`).

## 3. O que ficou como histórico e onde

| O quê | Onde fica | Quem vê |
|---|---|---|
| Abas `AUVO_*` (tarefas, pendências, sync, acervo, log, vínculos) e a pasta "Acervo Auvo" | banco e Drive do servidor, sem alteração | — |
| Histórico do Auvo ligado ao equipamento (tarefas sincronizadas e acervo indexado) | ficha do equipamento (aba Atendimentos, selo "Auvo (histórico)" e "Não finalizado no Auvo" para a tarefa que ficou aberta lá), modal "Ver O.S." | equipe interna |
| O mesmo histórico, sem link e só do próprio cliente | prontuário/pastas do equipamento, QR e Portal do cliente | cliente e equipe, como antes |
| Fotos do acervo | botão "Fotos do Auvo" no histórico do equipamento | equipe interna |
| Cópia completa (situação, relatório de conferência, falhas, tarefa com arquivos e registro completo) | "Histórico do Auvo" | Administrador e Diretoria |
| Itens antigos da Caixa | `GES_DECISOES` (RESOLVIDA/SANEADA como estavam; as abertas viram RETIRADA) e `GES_SANEAMENTO` | — |
| Sugestões e ocorrências antigas do Programa de conduta | `qual_sugestao` (a pendente vira DESCARTADA pelo Sistema) e `qual_ocorrencia` sem mudança | gestão |
| Eventos S54–S56 | trilha da Matriz de avisos | Administrador e Diretoria |
| Modelos de checklist que vieram do Auvo | Regras da assistência, como os demais | gestão |
| Código da integração | `SGO_Auvo_*.js` ficam no projeto como código inerte (sem rede, sem gatilho, sem tela) | — |

Nada que o cliente ou a equipe já use como documento quebra: `SGO_Atendimentos_doEquipamento_` (usada pela ficha, pelo prontuário/pastas, pelo QR e pelo Portal do cliente) lê `origem: 'TODAS'` e o índice do acervo; os relatórios de O.S. e de acervo continuam nos mesmos arquivos. Teste 4 do arquivo novo e o teste do Portal do cliente (etapas 0 e 3) passam.

## 4. Testes

- **Novo** `tests/auvo-retirada-20261118.test.cjs` (12 testes, código real): (1a) nenhum arquivo cria gatilho do Auvo; (1b) ligar sincronização/agendar continuação não cria gatilho, telas antigas recusam, sem rede; (1c) cada uma das seis funções de gatilho se remove sem chamar a API, e `Auvo_apiFetch_`/`Auvo_autenticar_`/`AuvoAcervo_getAuvo_`/`Auvo_criarTarefa_` recusam sem rede; (1d) `Auvo_retirarGatilhos_` com o simulador de agenda (remove 7, mantém os outros, idempotente, falha da agenda devolvida sem lançar); (2a) nenhuma pendência/alerta `auvo_*` para nenhuma sessão e nenhuma cobrança de qualidade por O.S. do Auvo; (2b) Caixa: itens do Auvo abertos viram RETIRADA, fora da nota; (2c) matriz sem S54–S56 e com a retirada na trilha; (2d) Conduta sem sugestão do Auvo; (3) nenhum menu, aba, chave ou caixa do Auvo, Histórico só ADMIN/DIRETORIA, sem botões de cópia, ajuda nova; (4) histórico do equipamento continua (equipe e cliente); (5) recarga semanal só com O.S. do SGO+; (6) emissões sem tarefa no Auvo. Contra a `cand30` os 12 falham (prova de que o teste mede a mudança).
- **Ajustados de propósito** (cada um com comentário "18/11/2026: Auvo descontinuado pelo dono"; versões anteriores em `tests-antes/`):
  - `auvo-acervo` — os 12 testes da cópia (contagem, lotes, idempotência, falhas, 403, conferência, paginação, pausa, trava, download pendurado, arquivo grande, 25 mil linhas, retomada) **foram retirados**: a cópia dependia da API e não existe mais. Ficaram 5: recusa sem rede e sem gatilho, gatilho antigo que se remove, acesso, consulta do que foi copiado e a tela somente consulta.
  - `auvo-gestao-envio-cliente` — os três testes de quem podia enviar o quê viraram um: ninguém envia nada ao Auvo.
  - `auvo-reconhecer-existente`, `auvo-tabelas-celular`, `etapa6-administracao-configuracao` — a ajuda da Integração Auvo saiu; a tela antiga continua conferida como registro; `Auvo_obterConteudoModulo` devolve vazio.
  - `auvo-pendencias-um-ano` — a central não usa mais o corte (não lê o Auvo).
  - `vinculos-auvo-unidade` — "vale o original" não impede mais a exclusão.
  - `assistencia`, `assistencia-fonte-integracao`, `assistencia-questionarios-tarefas`, `assistencia-tela`, `agenda-unica-os` — fonte única só SGO+ (histórico com `TODAS`), transição e importação recusam, agenda sem Auvo, 9 telas da Assistência.
  - `pedidos-20261118-p3-pendencias` — nenhuma O.S. do Auvo é cobrada (o item 9 do pacote 3 deixou de se aplicar no mesmo dia).
  - `matriz-avisos` — 99 → 96 eventos; o teste dos avisos de chamado do Auvo saiu e virou a conferência da retirada na trilha; exemplos com S55 trocados.
  - `gestao-desempenho` — o volume e o saneamento eram feitos de O.S. do Auvo: avaliação, painel e caixa reescritos com as sobras do Auvo virando RETIRADA e volume de atividades; os dois testes do saneamento viraram um (nada a sanear; marcar recusa; histórico fica).
  - `conduta-qualidade-areas` (tarefa do Auvo não vira sugestão; a pendente do Auvo é encerrada pelo sistema), `certcal-emissao-parcial` (a emissão não chama nem avisa o Auvo), `ponto` (em atendimento e evidência só pela O.S. do SGO+), `sedna` (exemplo de "maiores grupos" com tipos que continuam existindo).
  - `poderes-lote0` (catálogo de referência lido sem as 4 caixas retiradas, 150 → 146; as 8 caixas com texto ajustado são conferidas sem citar a integração), `deposito-viagem`, `deposito-viagem-prestacao` e `diretoria-informada` (totais do catálogo 150 → 146, 158 → 154, 151 → 147).
  - `avisos-gestao-celular` (a trilha da matriz também traz a retirada de S54 a S56) e `assistente-manuais-acesso-20261117` (teste 6: os parágrafos dos manuais que citavam o Auvo ou a lista dos seis critérios entram na lista de saídas justificadas).

Placar: ver o fim.

## 5. Riscos e pontos de atenção

1. **Gatilhos na produção.** Até alguém rodar `Auvo_retirarGatilhos_()`, os 3 gatilhos continuam na tabela; com o código novo, cada um se remove sozinho na primeira execução (sem chamar o Auvo). Rodar a função na publicação evita até essa execução.
2. **64 itens abertos da Caixa** viram RETIRADA na primeira sincronização da Caixa (a tela chama a cada 3 minutos; a rotina também). Não contam como resolvidos; a nota do mês em curso deixa de considerá-los. Meses já fechados (congelados em `GES_AVALIACOES`) não mudam.
3. **Indicadores dos técnicos** (Painel de qualidade, Início, Conduta) deixam de mostrar o Auvo também para períodos anteriores a 18/11/2026, porque a leitura passou a ser só das O.S. do SGO+. O histórico registrado em ocorrências não muda. Se o dono quiser os números antigos, o histórico está nas abas.
4. **Servidor Node fora do escopo:** a tela `/_sgo/segredos` (`src/servicos/segredos.ts`) ainda lista `AUVO_API_KEY` e `AUVO_API_TOKEN`; o `mesclarPacote.ts` cita as abas do Auvo. Não foi alterado (regra da tarefa). Recomendo, numa próxima publicação do servidor, tirar o Auvo dessa tela.
5. **Conta técnica `AUVO_SYNC`:** as listas de perfis "de fora" continuam reconhecendo esse perfil (para não quebrar a conta existente). A conta não é mais usada; recomendo que o Administrador a inative em Usuários (é gravação de produção, não foi feita aqui).
6. **Código inerte:** os arquivos `SGO_Auvo_*.js` ficam (o histórico do equipamento usa `Auvo_apiObterOS` e o acervo usa as funções de leitura). Classes CSS `auvo-toast*` continuam: são o contêiner de balões usado também pela Frota, Avisos, Atividades e E-mail.
7. **Duas falhas que não são desta mudança (relógio):** `portal-cliente-etapa1-20261118` (T1.8) e `documentos-pastas-20261117` (prontuário pelo QR: "Vence em 26 dias" em vez de 25). O T1.8 falha quando a suíte roda entre 21h e 24h de Brasília (o dia em UTC já é o seguinte e a data da última entrada fica um dia à frente do aviso). Falha igual na `cand30`; com o relógio do processo em 18/11/2026 15h (`relogio-meio-da-tarde.cjs`, só para conferir, sem mudar arquivo) os dois passam na `cand30` e na `cand31` (11/0 e 9/0). O teste do prontuário também falha na `cand30` com o relógio real. Ficam registrados para quem cuida do Portal do cliente e do prontuário. Fica registrado para quem cuida do Portal do cliente.
8. **Capturas** foram feitas com o servidor simulado do ambiente de teste (`tests/_assistencia_ambiente.cjs`): blocos do Início que dependem de funções não carregadas no ensaio mostram "Não foi possível carregar"; isso é do ensaio, não da mudança. O que importa nelas: menu sem Auvo para gestor e técnico, só "Histórico do Auvo" para o Administrador, Início sem nenhuma menção ao Auvo, link antigo `auvo` explicando a retirada e a tela do histórico sem botões de cópia.

## 6. Passos de publicação

1. Conferir a cópia contra a produção (hash de tudo) antes de publicar, como de costume; a `cand31` partiu da `cand30`.
2. Publicar o legado da `cand31` (inclui o arquivo novo `SGO_Auvo_Retirada.js` e a base `SGO_AssistenteManuais.js` regerada). Junto: `docs/MANUAL_*.md` alterados e os testes.
3. **Rodar uma vez `Auvo_retirarGatilhos_()`** no servidor (pela execução de função do legado). Esperado: `{ ok: true, removidos: 3, porFuncao: { Auvo_dispararSincronizacaoIncremental_: 1, Auvo_dispararSincronizacaoReversaDiaria_: 1, Auvo_pendDispararDiario_: 1 } }`. Conferir com `select funcao from gatilhos where funcao ilike '%auvo%'` (deve voltar vazio) ou `Auvo_gatilhosRestantes_()` = 0.
4. Abrir a Caixa de decisões uma vez (ou esperar a rotina) e conferir: nenhum item do Auvo aberto; as 64 linhas em RETIRADA.
5. Abrir Programa de conduta > Sugestões uma vez (ou esperar a coleta das 6h): as 2 pendentes do Auvo vão para DESCARTADA com o motivo.
6. Conferir com o Administrador: menu Operação de campo com "Histórico do Auvo" e Frota; com um gestor, só Frota.
7. Opcional, decisão do dono: inativar a conta técnica do Auvo em Usuários; no servidor Node, tirar o Auvo de `/_sgo/segredos` numa próxima publicação.

## 7. Arquivos desta entrega

- `RELATORIO.md` (este), `legado-auvo-retirada.patch` (cand30 → cand31, 85 arquivos), `suite.txt` (suíte completa).
- `capturas/` — 1366 e 390 px: Início com pendências (administrador, gestor, técnico), menu de Operação de campo (1366) e atalhos do Início (390), Histórico do Auvo do administrador e o link antigo `auvo` aberto por um gestor; `relato.json` com o menu visível e a busca por "Auvo" no Início de cada pessoa; `capturas.cjs` para repetir.
- `docs-antes/` (manuais antes), `tests-antes/` (testes antes), `SGO_AssistenteManuais.antes.js`, `edicoes/` (roteiros das edições, com o texto exato de cada troca), `eol.cjs` (conferência de fim de linha: todos os arquivos mantiveram LF/CRLF; `SGO_NR13_Main.js` continua misto como era), `relogio-meio-da-tarde.cjs` (só para a conferência do teste T1.8 do Portal), `suite-rodada1.txt` (primeira rodada, antes dos ajustes dos testes: 2.619/49).

## Placar

Suíte completa da `cand31` (`suite.txt`, 18/11/2026 às 21h48 de Brasília): **295 arquivos, 2.663 aprovados, 2 falhas**. As 2 falhas são as de relógio do item 7 dos riscos (rodada entre 21h e 24h de Brasília), iguais na `cand30` e fora do Auvo; com o relógio do processo em 15h as duas passam nas duas cópias. Sem elas, nenhuma falha. Referência anterior: 2.668/0 (rodada durante o dia; a soma mudou porque 13 testes de cópia do acervo e de saneamento saíram e 12 novos entraram). Arquivo novo `auvo-retirada-20261118`: 12/0; contra a `cand30`: 0/12. Primeira rodada, antes dos ajustes dos testes: 2.619/49 (`suite-rodada1.txt`).

</div>
