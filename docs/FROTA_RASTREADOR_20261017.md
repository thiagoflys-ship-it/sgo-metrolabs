# Frota — rastreador (iTracker / Tarkan sobre Traccar), 17/10/2026

Não publicado. **Desligado por padrão** (`RASTREADOR_LIGADO` vazio = nenhuma chamada). Nenhuma chamada foi feita à iTracker real: tudo foi testado contra um Traccar falso local.

## O que foi feito

| Parte | Onde |
|---|---|
| Cliente da API Traccar (login por usuário/senha ou token, cookie de sessão em cache por 20 min, novo login se der 401), dispositivos, posições, tipos de comando, envio de `engineStop`/`engineResume` | `SGO_Frota_Rastreador.js` |
| Chaves (só o dono): `RASTREADOR_URL` (padrão `https://acesso.itrackergo.com.br`; só https, http apenas para localhost), `RASTREADOR_USUARIO`, `RASTREADOR_SENHA`, `RASTREADOR_TOKEN`, `RASTREADOR_LIGADO` (1/0), `RASTREADOR_BLOQUEIO_LIGADO` (1/0); botão "Testar conexão" lista os dispositivos (ID, nome, situação), sem segredo; ligar instala a rotina | `SGO_Chaves.js`, `JS_Chaves.html` |
| Vínculo veículo e dispositivo: colunas novas em `CAD_VEICULOS` (`RASTREADOR_DEVICE_ID`, `_DEVICE_NOME`, `_ACEITA_BLOQUEIO`, `_COMANDOS_CONFERIDOS_EM`, `_VINCULADO_EM/_POR`); sugestão pela placa no nome/identificador; conferência por `/api/commands/types`; campo no "Editar veículo" | `Rastreador_vincular_`, painel |
| Ganchos isolados (try/catch próprio): `Frota_rastreadorAoRetirar_(sessao, veiculoId, movId)` e `Frota_rastreadorAoDevolver_(sessao, veiculoId, movId)`, chamados depois de gravar e soltar a trava. Devolvem `{ ativo, liberado/bloqueado, aviso, texto, km }` no campo `rastreador` da resposta | `SGO_Frota_Rastreador.js`, `SGO_Frota_Main.js` |
| Retirada: `engineResume`. Falhou: a retirada vale, a tela mostra "Partida não liberada pelo rastreador: <motivo>. Peça à gestão para liberar.", alerta crítico (gestão e condutor), aviso à gestão; a rotina tenta de novo enquanto a retirada estiver aberta | |
| Devolução: bloqueio PENDENTE; só envia `engineStop` com a última posição de até 30 min, abaixo de 3 km/h (velocidade do Traccar em nós x 1,852), sem `motion` e ignição desligada. Ignição não informada = não bloqueia. Nova retirada cancela o pendente; 30 min pendente = alerta e aviso à gestão (uma vez) | |
| Gestão: aba "Rastreador" (computador) e "Partida do veículo (rastreador)" (celular): Liberar partida / Bloquear agora com justificativa (15+) e confirmação; Bloquear segue a regra do veículo parado; "Ler o rastreador agora"; comandos dos últimos 40; alertas com "Conferido" | `SGO_Frota_ConteudoModulo.js`, `JS_Core.html` |
| Rotina `Frota_rastreadorRotina` (a cada 2 min no servidor, 1 min no Google com intervalo interno de ~2 min; recusada vinda do navegador): uma leitura de `/api/positions` por rodada, comandos pendentes (orçamento de 45 s), uso sem registro, hodômetro que faltou | `scripts/instalar_gatilhos.ts` (sgo_servidor) |
| Uso sem registro: ignição ligada ou veículo andando sem retirada aberta (posição dos últimos 15 min; carência de 10 min depois de uma devolução) = alerta crítico único por veículo, com placa, hora, local e mapa; aviso à gestão ao abrir | |
| Hodômetro (`odometer`, ou `totalDistance`, em metros) x KM digitado na retirada/devolução: diferença acima de 20 km **ou** acima de 5% vai para o painel "KM a conferir" (etapas `RASTREADOR_SAIDA/CHEGADA`) | `Frota_kmAConferir_`, `Frota_apiConferirKm` |
| Falha de conexão (rede ou HTTP 5xx): um alerta único (contador de ocorrências), resolvido sozinho quando volta | |
| Central de pendências: `frota_rastreador_uso`, `_liberar`, `_bloqueio`, `_conexao` | `SGO_Alertas_Central.js` |
| Trilha `REG_FROTA_AUDITORIA`: vínculo, comandos conferidos, pedidos da gestão, envio/falha de cada comando, uso sem registro, bloqueio atrasado, hodômetro divergente, alerta conferido. Abas novas `REG_FROTA_RASTREADOR_COMANDOS` e `REG_FROTA_RASTREADOR_ALERTAS` (nada é apagado; comandos e alertas mudam de situação) | |
| Manual do operador: seção 17 (bloqueio, emergência, nunca em movimento) + avisos nas seções 5 e 6 + glossário | |

Segurança: credenciais só nas propriedades do script; `Rastreador_limpar_` tira usuário, senha, token, `token=` de URL e cookie de todo texto que vai para tela, log, alerta ou aviso; só ADMIN/GESTOR/DIRETORIA usam as APIs `apiRastreador*`/`apiListarRastreador`; o técnico só aciona pela retirada/devolução.

## Testes (Traccar falso)

- Falso: `%TEMP%\sgo_rastreador\h\traccar_falso.mjs` (5 dispositivos, posições controláveis, comandos registrados com o estado do veículo no momento, falha por dispositivo, modo HTTP 500, sessões que vencem).
- Cópia da base dev em `%TEMP%\sgo_rastreador\pglite` (sem SMTP_SENHA nem chaves de WhatsApp; a cópia já não tinha), `SGO_ENSAIO=0`.
- Pool do legado (`zz.js`): **63 de 63** — chave desligada sem nenhuma chamada; testar conexão sem segredo; validação das chaves; sugestão e vínculo; retirada → engineResume; devolução andando → nada enviado, pendente; parado com ignição ligada, posição velha → nada; parado → engineStop uma vez; falha no engineResume → aviso exato, alerta crítico, aviso à gestão, nova tentativa; uso sem registro com alerta único; KM divergente → KM a conferir; falha de conexão → alerta único, resolvido sozinho; técnico recusado; Liberar/Bloquear da gestão; bloqueio desligado; dispositivo sem comandos; 30 min pendente; sessão vencida; token; nenhum segredo em log/auditoria/alertas/avisos/retornos; nenhum engineStop com o veículo andando.
- HTTP (servidor 8160, `SGO_AGENDADOR=0`): 10 de 10 — técnico recusado nas APIs; `Frota_rastreadorRotina` pelo navegador devolve nada; instalador barrado (403); nenhuma chamada ao falso.
- Playwright: computador 1440 (gestão: aba, sugestões, vínculo dos 4 veículos, liberar, bloquear andando = pendente, ler agora = engineStop, editar veículo, manual seção 17; técnico: aviso de partida não liberada) e iPhone 13 (gestão: Partida do veículo, liberar; campos 16 px, botões 44 px, sem rolagem lateral). Único erro: o 404 do logo da base dev, que já existia. Fotos em `%TEMP%\sgo_rastreador\shots`.
- `npx vitest run` no sgo_servidor: 100 de 100. Servidor e falso parados no fim.

## Ficou para depois (parado a pedido, para a frente de simplificação da Frota)

- Playwright do técnico no celular (retirada com aviso e devolução com bloqueio pendente): roteiro `tecBCel` escrito em `ui.mjs`, não rodado.
- Teste vitest no sgo_servidor: não criado (o legado do repositório do servidor ainda não tem o arquivo novo).
- Antes de rodar `scripts/instalar_gatilhos.ts` em produção, importar o legado novo (`npm run legado:importar`), senão `Frota_rastreadorGarantirRotina_` falha por não existir.

## Checklist do que pedir à iTracker

1. Usuário de integração só para o SGO+ (e-mail e senha) **ou** token desse usuário, com acesso só aos veículos da Metrolabs.
2. Permissão para enviar comandos (`engineStop` e `engineResume`) a esses dispositivos, pela API (`/api/commands/send`), e confirmação de que os dois aparecem em `/api/commands/types` de cada dispositivo (se usarem outro tipo, por exemplo comando personalizado, avisar: o SGO+ só envia esses dois).
3. Confirmar o endereço da API (`https://acesso.itrackergo.com.br/api/...`) e se aceita login por `POST /api/session` ou token.
4. Confirmar que os aparelhos informam ignição (`ignition`) e movimento; sem ignição o SGO+ nunca bloqueia.
5. Calibrar o hodômetro de cada veículo com o painel (o SGO+ compara o KM digitado com `odometer`/`totalDistance`; descalibrado gera "KM a conferir" a cada registro).
6. Nome do dispositivo com a placa (facilita a sugestão do vínculo).
7. Como o aparelho trata comando enviado com ele desconectado (fila / HTTP 202) e se o próprio rastreador recusa o corte acima de alguma velocidade.
8. Contato e procedimento de emergência para liberar a partida pelo app deles.

## Como ativar em produção

1. Importar o legado e publicar a versão (quando o dono decidir).
2. Chaves e senhas > Rastreador da frota: gravar `RASTREADOR_URL` (ou deixar vazio), o token ou usuário + senha; clicar em "Testar conexão" e conferir a lista.
3. Frota > aba Rastreador: com `RASTREADOR_LIGADO` = 1 e `RASTREADOR_BLOQUEIO_LIGADO` = 0 (só monitoramento), vincular cada veículo (sugestão pela placa), clicar em "Conferir comandos", conferir hodômetro x KM registrado e acompanhar alguns dias (uso sem registro, KM a conferir).
4. Testar com um veículo parado no pátio: "Bloquear agora" e "Liberar partida".
5. Gravar `RASTREADOR_BLOQUEIO_LIGADO` = 1. Avisar a equipe (manual, seção 17) e combinar o telefone de emergência da gestão.
6. Conferir que o gatilho `Frota_rastreadorRotina` existe (no servidor: `npx tsx scripts/instalar_gatilhos.ts`; ligar a chave também instala).

---

# 19/10/2026 — API real da iTracker (Bearer, somente leitura) e envio de comando configurável

Não publicado. Nenhuma chamada à iTracker real: tudo testado contra uma API falsa local no formato da documentação da iTracker.

## O que mudou

| Parte | Onde |
|---|---|
| Cliente HTTP novo: URL base `https://api.itrackergo.com.br/v1/` (a URL antiga `acesso.itrackergo.com.br` vira esta), `Authorization: Bearer` em toda chamada, `Accept: application/json`; `GET /devices`, `GET /positions[?deviceId=]`, `GET /reports/summary?deviceId=&from=&to=` (até 7 dias). Login, cookie e usuário/senha do Traccar saíram | `Rastreador_chamar_`, `Rastreador_exigirOk_` |
| Limites: no mínimo 600 ms entre chamadas (2 por segundo por IP, contando todas as execuções); `/positions` no máximo a cada 30 s (a rotina espera o que falta; tela e ganchos usam a leitura guardada ou deixam para a rotina); uma leitura de `/positions` por rodada; "Ler o rastreador agora" com intervalo de 30 s; HTTP 429 = espera o `Retry-After` (até 10 s) e tenta mais 2 vezes | |
| Erros com mensagem própria: 401 (chave inválida), 403 (acesso negado ou sem HTTPS), 404 (confira RASTREADOR_URL), 429, 503, outros 5xx; falha = um alerta único de conexão, resolvido sozinho | |
| Chaves e senhas, grupo Rastreador: `RASTREADOR_URL`, `RASTREADOR_TOKEN` ("Chave de acesso (Bearer)"), `RASTREADOR_LIGADO`, `RASTREADOR_RETENCAO_DIAS` (7 a 1825; vazio = 90), `RASTREADOR_BLOQUEIO_LIGADO`, `RASTREADOR_CMD_BLOQUEIO_URL`, `RASTREADOR_CMD_LIBERACAO_URL`, `RASTREADOR_TOKEN_COMANDOS` (opcionais). "Testar conexão" chama `GET /devices` e diz quantos veículos achou, sem a chave | `SGO_Chaves.js`, `JS_Chaves.html` |
| Bloqueio da partida: caminho completo mantido (retirada libera, devolução deixa pendente, nunca em movimento, só parado com ignição desligada e posição dos últimos 30 min, liberação de emergência pela gestão). Só age com os DOIS endereços de comando preenchidos; envio `POST` com `{deviceId, type: engineStop|engineResume}`, endereço completo ou caminho a partir da base, `{deviceId}` substituído no endereço. Sem os endereços: aviso "O acesso da iTracker é somente leitura..." na tela da gestão (computador e celular), Liberar/Bloquear recusados com esse texto, pendências antigas canceladas e o cliente recusa qualquer método que não seja GET. Decisão de bloqueio sempre com leitura nova da posição (nunca a guardada) | `Rastreador_cfg_`, seção COMANDOS |
| A API não informa quais aparelhos aceitam o corte: "Conferir comandos" virou "Marcar: usa o bloqueio" / "Marcar: só monitoramento" (gestão, depois do teste no pátio) | `Frota_apiRastreadorConferirComandos` |
| KM: com `odometer`/`totalDistance`, KM digitado x hodômetro (20 km ou 5%); sem hodômetro, KM rodado digitado x distância do `/reports/summary` no período da retirada (o mais largo entre a hora digitada e a hora do registro, com 5 min de margem; o critério de 5% só conta acima de 2 km). Colunas novas `KM_RASTREADOR_RODADO` e `KM_RASTREADOR_OBS`; "KM a conferir" diz "distância medida pelo rastreador no período" | `Rastreador_conferirKmPorResumo_`, `Frota_kmAConferir_` |
| Ponto de chegada na devolução (hora, endereço, mapa) na aba nova `REG_FROTA_RASTREADOR_PONTOS`; a gestão vê "Última chegada (devolução)" no painel | `Rastreador_gravarChegada_` |
| LGPD: sem histórico de rota (última posição só no cache, 15 min); auditoria e avisos por e-mail/WhatsApp sem endereço nem mapa; limpeza diária pela rotina (mesmo com o rastreador desligado, sem chamar a iTracker): pontos mais velhos que o prazo apagados, local retirado dos alertas; só a gestão vê localização; o técnico não vê (nem na própria retirada) | `Rastreador_limparRetencao_` |
| Ajuda (`frota/rastreador`, retirada/devolução, Chaves e senhas), manual dentro do módulo (seção 17) e `docs/MANUAL_MODULO_FROTA.md` | |

## Testes

- API falsa: `%TEMP%\sgo_rastreador2\h\itracker_falso.mjs` (Bearer, `/v1/devices`, `/v1/positions`, `/v1/reports/summary`, 401, 429 forçado com `Retry-After`, 2 por segundo, 30 s do `/positions`, 500/503, modo "com comandos" com `POST /v1/commands` e `/v1/devices/{id}/block|unblock`).
- Cópia da base dev em `%TEMP%\sgo_rastreador2\pglite` (sem SMTP_SENHA nem chaves de WhatsApp; a cópia já não tinha), `SGO_ENSAIO=0`.
- Bateria do legado (`zz.js`): 71 de 71, entre eles: desligado sem nenhuma chamada (inclusive a rotina como gatilho); Testar conexão; Chaves; 401; vínculo e sugestão; KM pelo hodômetro e pelo resumo; ponto de chegada; uso sem registro; 429/503/500/404; espaçamento; 30 s; somente leitura; modo com comandos (liberação, bloqueio pendente andando, ignição ligada, posição velha, engineStop parado, emergência, endereço com {deviceId}, chave própria dos comandos); retenção 90 e 7 dias; técnico sem localização; chave fora de tudo.
- HTTP (servidor 8160, `SGO_AGENDADOR=0`): 14 de 14.
- Playwright: computador 1440 (gestão somente leitura e com comandos; dono em Chaves e senhas; técnico) e iPhone 13 (gestão somente leitura e com comandos; técnico); sem rolagem lateral; único erro, o 404 do logo da base dev, que já existia.
- `npx vitest run` no sgo_servidor: 110 de 110. Servidor e API falsa parados no fim.

## Para ativar

1. Gravar a "Chave de acesso (Bearer)" em Chaves e senhas > Rastreador da frota e clicar em "Testar conexão".
2. Ligar "Rastreador ligado no SGO+", vincular os veículos na aba Rastreador e acompanhar uso sem registro e KM a conferir.
3. Quando a iTracker liberar o acesso com comandos: preencher os dois endereços de comando (e a chave dos comandos, se for outra), testar "Bloquear agora" e "Liberar partida" com o veículo parado no pátio, marcar cada veículo "usa o bloqueio" e ligar "Bloqueio da partida pelo SGO+".
