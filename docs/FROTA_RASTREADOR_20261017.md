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
