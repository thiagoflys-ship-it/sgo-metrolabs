# Frota — travas de retirada, devolução, hora e KM (17/10/2026)

Não publicado (sem clasp, sem servidor de produção). Testado no servidor próprio em modo ensaio, com cópia da base dev e só dados de teste.

## Problema

Qualquer pessoa da equipe conseguia registrar a devolução de um veículo que estava com outra pessoa: `Frota_apiFinalizarViagem` não conferia quem devolvia. A data/hora e o KM também eram livres.

## Decisões do dono aplicadas

| Regra | Onde |
|---|---|
| Devolução só pelo condutor da retirada; a gestão (ADMIN, GESTOR, DIRETORIA, mesma regra de `Frota_exigirGestor_`) registra no lugar dele com justificativa (mínimo de 15 caracteres), marca, auditoria e aviso ao condutor. Demais recebem: "Esta retirada está com <nome>. Só <nome> ou a gestão podem registrar a devolução." + o que fazer | `Frota_apiFinalizarViagem` |
| Retirada em nome de outro condutor: só a gestão, com justificativa, marca, auditoria e aviso | `Frota_apiIniciarViagem` |
| Data/hora: equipe = hora do servidor (America/Sao_Paulo), o payload é ignorado e a tela mostra "Registro com a hora atual". Gestão pode informar outra; diferença acima de 10 min exige justificativa; futuro acima de 5 min é recusado; retirada retroativa não pode começar antes da última devolução do veículo | `Frota_quandoRegistro_`, `Frota_ultimaChegadaVeiculo_` |
| KM de saída diferente do registrado: não trava; exige foto do painel, grava `KM_VEICULO_NA_SAIDA` e `KM_DIVERGENCIA_SAIDA`, alerta a gestão. KM menor continua recusado para quem não é gestão (a gestão pode, com justificativa e foto) | `Frota_apiIniciarViagem` |
| Devolução absurda (mais de 1.500 km, ou média acima de 120 km/h; tempo mínimo considerado 15 min): foto do painel obrigatória, grava `KM_ALERTA_CHEGADA`, alerta a gestão | `Frota_kmChegadaAbsurdo_` |
| Ajuste de KM só pela gestão, com justificativa, antes/depois na trilha; veículo em uso só depois da devolução. O "Editar veículo" não muda mais o KM (recusa e indica o "Ajustar KM") | `Frota_apiAjustarKm`, `Frota_apiAtualizarVeiculo` |
| Conferência de KM pela gestão (tira o alerta) | `Frota_apiConferirKm`, `Frota_apiListarKmAConferir` |
| Trilha consultável pela gestão | `Frota_apiListarAuditoria` |

## Dados (só colunas e aba novas; nada existente foi apagado ou reescrito)

`REG_FROTA_MOVIMENTACAO` (colunas novas, criadas por `Frota_bootstrap_`): `REGISTRADO_SAIDA_POR_ID/NOME`, `REGISTRO_GESTAO_SAIDA` ("SIM"), `REGISTRO_GESTAO_SAIDA_EM`, `JUSTIFICATIVA_SAIDA`, `MOTIVO_GESTAO_SAIDA`, `KM_VEICULO_NA_SAIDA`, `KM_DIVERGENCIA_SAIDA`, `FOTOS_PAINEL_SAIDA_JSON`, `KM_CONFERIDO_SAIDA_EM/POR` e as equivalentes de chegada (`..._CHEGADA_...`, `KM_ALERTA_CHEGADA`, `FOTOS_PAINEL_CHEGADA_JSON`).

`REG_FROTA_AUDITORIA` (aba nova): `QUANDO, ACAO, VEICULO_ID, PLACA, MOVIMENTACAO_ID, CONDUTOR_ID, CONDUTOR_NOME, USUARIO_ID, USUARIO_NOME, PERFIL, CAMPO, VALOR_ANTES, VALOR_DEPOIS, JUSTIFICATIVA, DETALHE`. Ações: `RETIRADA_PELA_GESTAO`, `DEVOLUCAO_PELA_GESTAO`, `KM_DIVERGENTE_SAIDA`, `KM_DIVERGENTE_CHEGADA`, `KM_CONFERIDO_SAIDA/CHEGADA`, `AJUSTE_KM`. Cada linha também vai para `SGO_DATA.log` (`FROTA_<ACAO>`).

Aviso ao condutor: `SGO_notificar_` (canais sgo, e-mail, WhatsApp; no SGO+ o aviso é o item informativo da central). O condutor sem login não recebe aviso (não há destino).

## Alertas na central (`SGO_Alertas_Central.js`)

| Tipo | Quem vê | Regra |
|---|---|---|
| `frota_viagem_aberta` (id `FROTA:VIAGEM:<mov>`) | condutor e gestão | retirada aberta há mais de 12 horas (antes: 2 dias), "Possível devolução esquecida", com o que fazer para cada um |
| `frota_km_conferir` (id `FROTA:KM:<mov>:SAIDA|CHEGADA`) | gestão | KM divergente ainda não conferido |
| `frota_registro_gestao` (id `FROTA:GESTAO:<mov>:SAIDA|CHEGADA`) | só o condutor | informativo por 7 dias quando a gestão registrou em nome dele |

"Agora" do alerta de 12 h usa o horário de Brasília na mesma régua das datas digitadas. As gravações passam por `Frota_apiDispatch`, que chama `SGO_Pendencias_invalidar_()`.

## Telas

- Computador (`SGO_Frota_ConteudoModulo.js`): campos de data/hora só para a gestão (vazios = agora; botão "Limpar (usar a hora atual)"), aviso "Registro com a hora atual" para a equipe, campo "Foto do painel (odômetro)" na retirada e na devolução, KM registrado mostrado ao escolher o veículo, justificativa (gestão), aviso "Você está registrando a devolução no lugar de ...", lista de retiradas sem o botão de devolução para quem não pode (mostra "Só <nome> ou a gestão registram a devolução"), painéis novos da gestão: "KM a conferir" (com link da foto e "Conferido"), "Ajustar KM do veículo" e "Trilha de auditoria". KM do "Editar veículo" só leitura. Manual do operador atualizado.
- Celular (`JS_Core.html`, trecho da Frota): mesmas regras; cartão de retirada de outra pessoa explica a regra ao tocar; botão "Ajustar KM do veículo" para a gestão; campos 16 px e alvos de 44 px conferidos.
- Conferência antes de enviar fotos no navegador (`frotaMotivoFotoPainel_`) com a mesma regra do servidor; o servidor decide.

## Correção no servidor próprio (sgo_servidor)

O teste de corrida mostrou que, no servidor próprio com 2 processos, dois técnicos conseguiam retirar o mesmo veículo ao mesmo tempo: a trava (`LockService`) funcionava, mas a leitura feita depois da trava vinha da cópia da planilha guardada no início da chamada. Corrigido em `src/compat/basicos.ts`, `src/compat/spreadsheet.ts` e `src/legado/worker.ts`: ao pegar uma trava, as cópias desta chamada são descartadas e a próxima leitura vai ao banco (como no Apps Script). Vale para todos os módulos que usam trava.

## Como foi testado

- Cópia de `dados/dev/pglite` em `%TEMP%\sgo_frotatrava`; usuários gestort (GESTOR), teca e tecb (TÉCNICO), condutores ligados a eles, veículos TRV1A11 a TRV4D44.
- Pelo pool do legado: 44 verificações, todas passaram (técnico B recusado com a mensagem exigida; gestor sem justificativa e com justificativa curta recusado; gestor com justificativa grava marca, quem, justificativa, auditoria, log e aviso — e-mail OK em `NTF_ENVIOS`, WhatsApp "não configurado" na base de teste; informativo só para o condutor; técnico manda data antiga e vale a hora do servidor; gestor retroativo exige justificativa; futuro recusado; KM divergente exige foto, grava a diferença e alerta só a gestão; KM menor recusado; devolução acima de 120 km/h ou 1.500 km exige foto; conferência tira o alerta; ajuste de KM só pela gestão, com antes/depois; editar veículo não muda KM; trilha só para a gestão; retirada aberta há 13 h alerta condutor e gestão e não o outro técnico; retirada retroativa sobreposta recusada).
- HTTP com `WORKERS=2`: quatro pedidos simultâneos de retirada do mesmo veículo por dois técnicos — antes da correção do servidor passavam dois; depois, 1 em 4 em cinco repetições seguidas; devolução pelo outro técnico recusada.
- Playwright, computador 1440 (técnico A, técnico B, gestor) e celular iPhone 13 com isMobile (técnico B, gestor): fluxos acima pela tela, sem erro de JavaScript (o único 404 é a imagem do logo da base de desenvolvimento, que já faltava). Fotos em `%TEMP%\sgo_frotatrava\shots`.
- `npx vitest run` no sgo_servidor: 100 de 100. Servidor de teste parado no fim.

## Notas

- O "rodou 250 km em 0 minutos" aparece quando a devolução é registrada logo após a retirada; a regra considera no mínimo 15 minutos.
- Condutor sem login (motorista avulso) só pode ter devolução registrada pela gestão, sempre com justificativa.
