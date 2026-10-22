# Segurança e automação predial no SGO+ (Smart Life / Tuya Cloud API) — diagnóstico, construção e relatório (22/10/2026)

Responsável pela execução: Claude, a pedido do dono (ordem de desenvolvimento de 22/10/2026). Nada foi publicado em produção; nenhum comando físico foi executado; nenhuma credencial foi recebida, gravada ou exposta. Ambiente de desenvolvimento = repositório + testes + ensaio local com a nuvem da Tuya simulada.

## 1. Resposta curta

O módulo "Segurança e automação predial" está construído e testado em desenvolvimento: cliente da Tuya Cloud API com a assinatura conferida bit a bit contra o exemplo oficial, descoberta dos dispositivos com matriz de compatibilidade, tela por unidade e localização, permissões conferidas no servidor (a porta da Diretoria não existe para quem não é Diretoria), comando com os três estados (solicitado, aceito, execução confirmada), idempotência e limites, registro só-inclusão encadeado por SHA-256, pendências no Início e aviso S66 na matriz. Até a homologação tudo roda em simulação: nada sai do servidor sem TUYA_LIGADO = 1 e sem o dispositivo homologado pela Diretoria.

Depende do dono: criar o projeto cloud no portal da Tuya, ligar a conta do Smart Life, autorizar os serviços, gravar o Access ID e o Access Secret em Chaves e senhas e clicar em "Testar conexão" (seção 9). Depende da Diretoria: homologação presencial (seção 10). Limitação principal: a abertura remota da fechadura pela nuvem só existe nos modelos que a Tuya habilita para isso; a tela diz "não disponível pela API" com o porquê quando não existe (seção 7).

## 2. Diagnóstico da arquitetura do SGO+ (Fase 1)

Auditado antes de escrever qualquer linha (código em apps-script-imports/portal_sgo_versao_cnpj_db, rodando no servidor próprio Node/Fastify/PostgreSQL de projetos/sgo_servidor pelo importador do legado).

| O que existe | Onde | Como foi usado |
|---|---|---|
| Sessão e perfis (ADMIN, DIRETORIA, GESTOR, RH, FINANCEIRO, TECNICO, METROLOGIA, COMERCIAL, CLIENTE) | SGO_Auth.js: exigirSessao, validarSessao, isAdminPerfilAuth_, SGO_ehGestaoRotina_ | Toda chamada do módulo passa por exigirSessao; o perfil decide administração (ADMIN e DIRETORIA) e a visibilidade do restrito (só DIRETORIA). isAdminPerfilAuth_ inclui GESTOR e por isso não foi usado para administrar. |
| Chaves e senhas | SGO_Chaves.js (CHV_ITENS, Chaves_validarValor_, Chaves_aposAlterar_, Chaves_apiTestar) e JS_Chaves.html | Grupo novo "Automação predial (Tuya)" com TUYA_ACCESS_ID, TUYA_ACCESS_SECRET (tipo senha: nunca volta à tela), TUYA_REGIAO e TUYA_LIGADO; "Testar conexão" pede token e lista dispositivos sem comando; troca de chave esquece o token. |
| Comando solicitado → aceito → confirmado, registro só-inclusão com hash encadeado, limite por minuto, sem repetir sem resultado | SGO_Frota_Bloqueio.js (FrotaBlq_evento_, FrotaBlq_conferirIntegridade_, FrotaBlq_vez_, FrotaBlq_decidir_) | Padrão reaproveitado (mesmo desenho de corrente, propriedade do último hash, trava LockService, conferência por corrente) no domínio próprio AUT_*, sem tocar no motor da Frota. |
| Chamadas HTTP com limite de frequência, erros traduzidos e limpeza de segredos | SGO_Frota_Rastreador.js (Rastreador_chamar_, Rastreador_limpar_, Rastreador_exigirOk_) | Mesmo desenho em SGO_Automacao_Tuya.js (Tuya_chamar_, Tuya_limpar_, Tuya_exigirOk_), com a assinatura HMAC-SHA256 que a Tuya exige. |
| Tabelas sob demanda | CertCal_garantirTabela_ / CertCal_garantirColuna_ (SGO_CertCal_Main.js), SGO_DATA | AUT_DISPOSITIVOS, AUT_PERMISSOES, AUT_COMANDOS, AUT_AUDITORIA criadas na primeira chamada; nada é apagado. |
| Pendências do Início | SGO_Alertas_Central.js (PEND_TIPOS, PEND_FONTES, Pend_item_) | Tipo automacao_sem_confirmacao e fonte AutPred_fontePendencias_. |
| Matriz de avisos e canais | SGO_Avisos_Matriz.js, SGO_Notificar.js (SGO_notificar_) | Evento S66 "comando aceito pela API sem confirmação do dispositivo" (e-mail na hora; porta da Diretoria só para a Diretoria). |
| Ajuda por tela e manual | SGO_Ajuda.js (SGO_Ajuda_todas_, SGO_AJUDA_NOMES), docs/MANUAL_*.md, _tools/gerar_base_assistente.cjs | SGO_Ajuda_AutomacaoPredial.js, docs/MANUAL_MODULO_AUTOMACAO_PREDIAL.md, base do assistente regerada. |
| Casca, menu e padrão visual | Index.html (grupos do menu), JS_Core.html (abrirModulo_, ganchos de login/logout, atalhos do celular), UI_Estilos.html, JS_Cadastros.html (CadUI_*) | Grupo "Segurança predial" com o item "Segurança e automação predial" (escondido até o servidor liberar), JS_AutomacaoPredial.html com as classes cadx/bc e a janela de confirmação CadUI_confirmar_. |
| Cadastro de unidades | CAD_UNIDADES (SGO_Setup.js) | Seleção da unidade no dispositivo (ou texto livre, ex.: METROLABS — MATRIZ GOIÂNIA, já que a Metrolabs não é cliente de si mesma no cadastro). |
| Servidor próprio | sgo_servidor: PropertiesService = tabela "propriedades"; CacheService = memória; Utilities.computeHmacSha256Signature disponível; funções chamáveis = nome sem "_" final e fora do filtro BLOQUEADAS_SGO | Token da Tuya só em CacheService; única função pública AutPred_api(sessionId, acao, dados). |

Não existia nenhuma integração com Tuya, Smart Life ou automação predial no SGO+, no servidor ou no COMMAND (busca por "tuya" e "smart life" em código, docs e testes: nada). Nenhum motor foi duplicado: o módulo reutiliza os padrões acima e cria só o domínio próprio.

## 3. Requisitos da Tuya conferidos (Fase 1, pesquisa em 22/10/2026)

Fontes: documentação oficial da Tuya (Sign requests, Error codes, Device control, Device management, Smart Lock Open API, API request) e relatos de comunidade sobre o período de teste do IoT Core.

- Assinatura: cabeçalhos client_id, t (13 dígitos), nonce (UUID), sign_method = HMAC-SHA256, sign e access_token (fora do token). stringToSign = MÉTODO + "\n" + SHA256(corpo) + "\n" + cabeçalhos assinados + "\n" + caminho[?consulta ordenada por chave]. Token: sign = HMAC-SHA256(client_id + t + nonce + stringToSign, secret); negócio: client_id + access_token + t + nonce + stringToSign; hexadecimal maiúsculo. O exemplo oficial (client_id 1KAD46OrT9HafiKdsXeg, secret 4OHBOnWOqaEC1mWXOpVL3yV50s0qGSRC, t 1588925778000, nonce 5138cc3a9033d69856923fd07b491173) produz 9E48A3E93B302EEECC803C7241985D0A34EB944F40FB573C7B5C2A82158AF13E no token e AE4481C692AA80B25F3A7E12C3A5FD9BBF6251539DD78E565A1A72A508A88784 no pedido de negócio; o SGO+ reproduz os dois (teste automatizado).
- Centros de dados: openapi.tuyaus.com (América Oeste; contas do Brasil), openapi-ueaz.tuyaus.com, openapi.tuyaeu.com, openapi-weaz.tuyaeu.com, openapi.tuyain.com, openapi.tuyacn.com, openapi-sg.iotbing.com. O centro de dados do projeto precisa ser o mesmo da conta do Smart Life; caso contrário o QR Code de vínculo falha.
- Token: GET /v1.0/token?grant_type=1 → access_token, refresh_token, expire_time (s), uid; renovação em GET /v1.0/token/{refresh_token}. Expira em 2 h; códigos 1010/1011/1400 pedem token novo.
- Dispositivos: GET /v1.0/iot-01/associated-users/devices (contas do app ligadas ao projeto, paginado por last_row_key) e, alternativa, GET /v1.0/users/{uid}/devices; GET /v1.0/devices/{id}; /functions; /status; POST /commands {"commands":[{"code","value"}]}; GET /logs.
- Fechadura (Smart Lock Open API, serviço à parte): POST /door-lock/password-ticket → ticket_id; POST /door-lock/password-free/open-door {ticket_id} (modelos Wi-Fi integrados, Zigbee, Bluetooth, Wi-Fi sempre ativo, com vídeo); GET /door-lock/remote-unlocks (métodos de abertura remota e se estão ligados); GET /v1.1/.../door-lock/open-logs. A própria documentação registra que a abertura remota "requer os pontos remote_no_dp_key ou remote_no_dp_setkey" e que "só fechaduras Wi-Fi integradas suportam abertura remota". A abertura com senha (open-door) é só Zigbee e exige AES com a chave local: não usada.
- Erros: 1004 assinatura, 1010/1011/1400 token, 1013 relógio, 1100/1109 parâmetro, 1106 sem permissão (API não autorizada ou dispositivo fora da conta), 2001 offline, 2002 conta sem dispositivos, 2008 comando não suportado, 2009/2010 dispositivo, 28841001/28841002 plano ausente ou vencido, 28841101/28841106 API não assinada, 28841104 cota, 28841105 projeto não autorizado. Todos traduzidos no SGO+ com o que fazer.
- Limitações comerciais: o IoT Core tem período de teste (trial) que vence e precisa ser estendido no portal (Cloud > My Services > Extend Trial Period, aprovação em 1 ou 2 dias úteis, relatado pela comunidade) ou assinado; vencido, tudo responde 28841002. A Smart Lock Open API é serviço separado que precisa ser autorizado no projeto. Limite de chamadas: não há QPS publicado na página de pedido; o SGO+ se impõe 30 por minuto e 300 ms entre chamadas.
- Vínculo do app: Devices > Link Tuya App Account > Add App Account > ler o QR Code com o Smart Life (conta que tem os dispositivos). Ligar pela aba Users não funciona (relato recorrente).

## 4. O que foi construído (Fases 2 a 6)

Arquivos novos (apps-script-imports/portal_sgo_versao_cnpj_db):

- SGO_Automacao_Tuya.js — cliente da API: configuração, assinatura (funções puras), token em cache de memória com renovação (60 s de folga; 1010/1011/1400 renovam e repetem uma vez), limite de frequência, chamada HTTP com limpeza de segredos, erros traduzidos, leituras (lista, detalhe, funções, estado), comando, fechadura (métodos remotos, bilhete, abertura, registros), matriz de compatibilidade e teste de conexão.
- SGO_Automacao_Predial.js — módulo: tabelas AUT_*, registro encadeado e integridade, visibilidade e direitos (função pura AutPred_direitos_), sincronização, estado e confirmação (AutPred_confirmarPorEstado_ pura), execução (AutPred_executar_), administração do dispositivo, homologação, permissões, pendências e a API da tela AutPred_api(sessionId, acao, dados).
- JS_AutomacaoPredial.html — tela: cartões por unidade, botões por direito, janela de confirmação (ABRIR na fechadura), histórico, administração, permissões, auditoria e integridade; nunca se atualiza sozinha com formulário aberto.
- SGO_Ajuda_AutomacaoPredial.js, docs/MANUAL_MODULO_AUTOMACAO_PREDIAL.md, base do assistente regerada.
- tests/automacao-predial-tuya.test.cjs (9) e tests/automacao-predial.test.cjs (10).

Arquivos existentes alterados (trechos pequenos, sem reformatar): Index.html (grupo e item do menu, include), JS_Core.html (ganchos de login e logout, despacho, lista do RH, atalho do celular), SGO_Chaves.js e JS_Chaves.html (grupo Tuya e teste), SGO_Ajuda.js (nome e fonte), SGO_Alertas_Central.js (tipo e fonte), SGO_Avisos_Matriz.js (S66 e módulo), tests/matriz-avisos.test.cjs (66 regras), _tools/gerar_base_assistente.cjs (mapa do manual).

Ensaio local (sgo_servidor/ensaios_locais/automacao_20261022, pasta fora do git do servidor): simulador_tuya.mjs (nuvem simulada que confere a assinatura de cada pedido e devolve 1004/1010/1013 como a Tuya), ZZ_SemearAut.js (dados fictícios: 3 usuários, 3 dispositivos, permissões, 2 homologações), servidor.mts (porta 8151) e ver_visual.mjs (Playwright).

## 5. Estruturas de dados (aditivas; nada do que existia foi alterado)

- AUT_DISPOSITIVOS: ID, PROVEDOR, DEVICE_ID, NOME, NOME_PROVEDOR, CATEGORIA, CATEGORIA_NOME, PRODUTO_ID, PRODUTO_NOME, TIPO (PORTAO, FECHADURA, OUTRO), UNIDADE_ID, UNIDADE_NOME, LOCALIZACAO, RESTRITO_DIRETORIA, HOMOLOGADO, HOMOLOGADO_POR, HOMOLOGADO_EM, ATIVO, ONLINE, ESTADO_JSON, ESTADO_EM, FUNCOES_JSON, COMANDO_ABRIR_JSON, ESTADO_CODIGOS, COMPAT_OK, COMPAT_MOTIVO, REMOTO_FECHADURA, ULT_CMD_ID, ULT_CMD_EM, ULT_CMD_SITUACAO, SINCRONIZADO_EM, ATUALIZADO_EM, CRIADO_EM.
- AUT_PERMISSOES: ID, USUARIO_ID, USUARIO_LOGIN, USUARIO_NOME, USUARIO_PERFIL, DISPOSITIVO_ID, DEVICE_ID, DISPOSITIVO_NOME, PERMISSAO (VER, ACIONAR), VIGENCIA_INICIO, VIGENCIA_FIM, CONCEDIDA_POR_ID, CONCEDIDA_POR, CONCEDIDA_EM, MOTIVO, STATUS (ATIVA, REVOGADA), REVOGADA_POR, REVOGADA_EM, REVOGADA_MOTIVO, CRIADO_EM.
- AUT_COMANDOS: ID, OPERACAO_ID (idempotência), QUANDO, QUANDO_EM, SOLICITANTE_ID, SOLICITANTE, PERFIL, UNIDADE, DISPOSITIVO_ID, DEVICE_ID, DISPOSITIVO_NOME, TIPO, COMANDO, COMANDO_JSON, MODO (REAL, SIMULACAO), AUTORIZACAO (AUTORIZADO, NEGADO), AUTORIZACAO_MOTIVO, SITUACAO (SOLICITADO, ACEITO, CONFIRMADO, RECUSADO, INCERTO, NEGADO, SIMULADO), API_HTTP, API_CODIGO, API_TID, API_RESPOSTA, ESTADO_ANTES_JSON, ESTADO_DEPOIS_JSON, CONFIRMADO_EM, CONFIRMACAO_DETALHE, CORRELACAO (comando anterior do dispositivo), ATUALIZADO_EM, CRIADO_EM.
- AUT_AUDITORIA (só inclusão): ID, QUANDO, QUANDO_EM, EVENTO, USUARIO_ID, USUARIO, PERFIL, UNIDADE, DISPOSITIVO_ID, DEVICE_ID, DISPOSITIVO_NOME, RESTRITO, OPERACAO_ID, RESULTADO, DETALHE, DADOS_JSON, HASH_ANTERIOR, HASH, CRIADO_EM. Último hash em AUT_AUDITORIA_ULTIMO_HASH (propriedade).

Nenhuma senha de fechadura, código de abertura, bilhete (ticket) ou token é gravado em tabela; o teste confere.

## 6. Permissões e segurança operacional

- Toda função do módulo confere sessão e perfil no servidor; a única função pública é AutPred_api. Perfil CLIENTE é recusado.
- Restrito à Diretoria (fechaduras entram assim): só DIRETORIA lista, consulta, aciona, administra, concede e audita. Para ADMIN o dispositivo não existe (só a contagem "n restrito(s)"); a auditoria e a lista de permissões também o escondem. Acionar exige permissão ACIONAR expressa, concedida por DIRETORIA a usuário DIRETORIA, e a confirmação adicional "ABRIR".
- Portões: ADMIN e DIRETORIA veem e acionam; os demais pelo que foi concedido (VER ou ACIONAR), com vigência.
- Idempotência por OPERACAO_ID (uuid gerado a cada clique; o mesmo id devolve o resultado anterior, nunca executa de novo). 1 comando por dispositivo a cada 10 s; 5 por pessoa por minuto; sem repetir enquanto o anterior está sem resultado há menos de 60 s; 30 chamadas por minuto à Tuya.
- Execução real só com TUYA_LIGADO = 1 e HOMOLOGADO = SIM; senão simulação registrada.
- Segredos só em PropertiesService (tabela de propriedades do servidor, tela exclusiva do responsável pelo sistema); token só em CacheService; Tuya_limpar_ tira Access ID, Access Secret e tokens de qualquer texto de erro; nada de segredo no HTML/JS.
- Sem endpoint público: tudo passa por google.script.run autenticado (POST /api/run com sessão).

## 7. Matriz de compatibilidade dos dispositivos

| Categoria Tuya | Tipo no SGO+ | Comando de abertura | Confirmação | Observação |
|---|---|---|---|---|
| ckmkzq (abridor de portão/garagem), kg, cz, pc, tdq, dlq, szjqr | Portão ou acesso | switch_1: true (ou switch: true), pulso | switch_1 / doorcontact_state no estado | O próprio acionador volta ao repouso; se o dispositivo não informa switch_1/switch/control, "não disponível pela API" e o Administrador pode definir o comando dentro da lista de funções. |
| cl, clkg (motor de portão ou cortina) | Portão ou acesso | control: open | control / percent_control | open/close/stop. |
| ms, jtmspro, mk, hotelms, gyms, jtmsbh, videolock, photolock, bxx, ms_category | Fechadura | password-ticket + password-free/open-door (bilhete) só quando há remote_no_dp_key / remote_no_dp_setkey / unlock_remote ou método remoto ligado em /door-lock/remote-unlocks | lock_motor_state / closed_opened no estado ou registro em open-logs | Sem abertura remota no modelo: "Não disponível pela API" com o porquê; estado e registros continuam quando a API fornece. Serviço Smart Lock Open API precisa estar autorizado no projeto. |
| Outras | Outro | nenhum | — | Só consulta. |

A matriz é calculada na sincronização a partir de /functions (e /door-lock/remote-unlocks nas fechaduras), nunca presumida.

## 8. Relatório de testes

Automatizados (node --test, API da Tuya simulada, nenhuma chamada real):

- tests/automacao-predial-tuya.test.cjs (9): assinatura bit a bit contra o exemplo oficial (token e negócio) e SHA-256 do corpo; token sem access_token, em cache, nunca em propriedades; 1010 renova uma vez e repete; 1106/28841105/28841002 traduzidos sem segredo; sem resposta = erro de rede; 31ª chamada do minuto não sai; descoberta e matriz (portão switch_1, fechadura sem abertura remota, jtmspro com bilhete, motor control, categoria desconhecida); POST assinado e 2008 sem lançar; teste de conexão só GET; região desconhecida e endereço alternativo.
- tests/automacao-predial.test.cjs (10): sincronização (3 dispositivos, fechadura restrita, só leitura, sem duplicar); porta da Diretoria ausente para GESTOR, TECNICO e ADMIN na lista, por id, na auditoria e nas permissões; permissões no servidor (negado e registrado, VER não aciona, ACIONAR aciona, vigência vencida, revogação, só interno ativo); porta da Diretoria (ACIONAR expresso, concedida só a DIRETORIA, ABRIR obrigatório, homologação só DIRETORIA com HOMOLOGAR, bilhete + abertura, confirmação pelo registro, eventos solicitado/aceito/confirmada com RESTRITO=SIM, bilhete nunca gravado); fechadura sem API; portão real solicitado → aceito → confirmado, aceito sem confirmação avisa S66 (Diretoria e Administrador) e "Conferir agora" confirma depois, pendência só após 2 min; idempotência, 10 s, 5 por minuto, sem resultado não repete, id curto recusado; simulação (desligado não lê, não homologado não envia), 2008 vira RECUSADO, sem resposta vira INCERTO, segredo nunca em tabela; registro íntegro e detecção de linha alterada ou apagada; administração (unidade do cadastro, comando conferido contra as funções, restrito só pela Diretoria, menu só para quem tem direito).
- tests/matriz-avisos.test.cjs ajustado para 66 regras.

Ensaio local com Playwright (capturas em C:\Users\venda\AppData\Local\Temp\claude\c--Users-venda-projetos-google-script-dev\38088561-7377-4972-b573-afb90ff4ba72\scratchpad\automacao_visual\): Diretoria (painel com 3 dispositivos por unidade, janela de confirmação com "Comando real", portão homologado com execução confirmada, portão não homologado em simulação, fechadura barrada sem ABRIR e confirmada pelo registro com ABRIR, segundo comando em sequência recusado, histórico, administrar, permissões, auditoria com integridade), Gestor (só os dois portões, sem a porta no HTML, VER sem botão Abrir, chamada direta por id recusada), Administrador (sem a porta, só a contagem, auditoria sem a porta), Técnico sem permissão (menu escondido, tela à força explica) e celular (sem rolagem lateral). O simulador registrou a assinatura válida em todos os pedidos e os POSTs de comando, bilhete e abertura.

Observação do ensaio: o servidor em SGO_ENSAIO=1 barra todo POST para fora (regra do próprio servidor); na primeira rodada isso fez os comandos reais ficarem "sem resposta (incerto)", exatamente o caminho previsto para falha de rede. A rodada final roda sem SGO_ENSAIO (banco novo, sem credencial real, só 127.0.0.1).

## 9. Procedimento para o dono: credenciais

No portal da Tuya (https://platform.tuya.com, conta de desenvolvedor da Metrolabs):

1. Cloud > Development > Create Cloud Project (ou abra o existente). Industry: Smart Home; Development Method: Smart Home; Data Center: Western America (contas do Smart Life do Brasil). Anote o centro de dados.
2. Na criação, confira os serviços: IoT Core e Authorization Token Management (vêm por padrão); acrescente Smart Lock Open Service (necessário para a fechadura). Depois, em Service API > Go to Authorize, se algum faltar.
3. Devices > Link Tuya App Account > Add App Account: no celular, Smart Life > Eu > (ícone de leitura de QR Code) e leia o QR Code do portal. Os portões e a fechadura precisam estar nessa conta. Se der erro no QR Code, o centro de dados do projeto não é o da conta.
4. Cloud > My Services: confira o prazo do IoT Core (período de teste). Perto de vencer, Extend Trial Period (formulário; 1 ou 2 dias úteis) ou assinatura. Vencido: código 28841002.
5. Overview do projeto: copie Access ID/Client ID e Access Secret/Client Secret.
6. No SGO+: Administração > Chaves e senhas > Automação predial (Tuya): grave TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, escolha o centro de dados em TUYA_REGIAO e clique em "Testar conexão". Esperado: "Funcionou: ... n dispositivo(s)". Nenhum comando é enviado.
7. Deixe "Automação predial ligada" Desligado até a homologação. Com Ligado, o SGO+ lê dispositivos e estados; os comandos só saem nos dispositivos homologados.

Nunca cole credenciais no chat, em e-mail ou em planilha; o SGO+ não as mostra de novo depois de gravadas.

## 10. Plano de homologação e implantação (Fase 7)

Antes: publicar o código no servidor (só o dono), com TUYA_LIGADO = 0. Tudo em simulação.

1. Credenciais e teste de conexão (seção 9). Em Segurança e automação predial, a Diretoria clica em "Sincronizar com o Smart Life" (só leitura) e confere: os 3 dispositivos aparecem, categorias e comandos lidos, a fechadura entrou restrita. Preencher unidade (METROLABS — MATRIZ GOIÂNIA) e localização de cada um.
2. Ligar TUYA_LIGADO = 1. Ainda sem homologação: "Ler estado" nos portões e na fechadura confirma a leitura real; "Abrir portão" continua em simulação. Conferir o registro na auditoria.
3. Portão secundário primeiro (menor risco), presencialmente, com acompanhamento: a Diretoria homologa (Administrar > Homologar, descreve o teste, digita HOMOLOGAR), clica em "Abrir portão", observa o portão e a faixa "Execução confirmada". Se ficar "aceito, sem confirmação" e o portão abriu, o modelo não informa o estado: registrar a limitação e decidir se mantém (a confirmação passa a ser visual); se não abriu, retirar a homologação e investigar o comando (Administrar > comando de abertura).
4. Portão principal: mesma sequência.
5. Porta da Diretoria: conceder ACIONAR ao diretor responsável; homologar; solicitar o destravamento com ABRIR, presencialmente. Se a sincronização marcou "Não disponível pela API", não há o que testar pela nuvem: a decisão é manter a abertura pelo aplicativo (seção 11).
6. Permissões: conceder aos usuários que operam os portões (quem, qual portão, até quando) e conferir em outro login que a porta da Diretoria não aparece.
7. Voltar atrás: TUYA_LIGADO = 0 em Chaves e senhas (tudo volta à simulação na hora) ou "Retirar a homologação" de um dispositivo só; apagar TUYA_ACCESS_SECRET corta qualquer chamada. Nenhuma tabela precisa ser alterada; nada é apagado.

## 11. Pendências e limitações

- Fechadura: a Tuya só oferece abertura remota pela nuvem em modelos preparados para isso (pontos remote_no_dp_key/remote_no_dp_setkey; "só fechaduras Wi-Fi integradas"), e o serviço Smart Lock Open API precisa estar autorizado. Em muitos modelos Wi-Fi a abertura remota depende de um pedido iniciado na própria fechadura (teclado) e aprovado no aplicativo; isso não é "abrir pelo SGO+". A tela mostra "Não disponível pela API" com o porquê. Até o teste real não dá para afirmar que o modelo da Metrolabs aceita.
- Confirmação: a Tuya não devolve "porta aberta" na resposta do comando. O SGO+ confirma pelo estado (ou registros da fechadura) 2,5 s depois e por "Conferir agora" em até 15 min; modelos que não informam estado ficam em "aceito, sem confirmação" (aviso S66 e pendência). A matriz de avisos em docs/MATRIZ_DE_AVISOS_20261021.md não foi editada (outro trabalho em andamento no mesmo arquivo): acrescentar a linha S66 ao consolidar.
- Lista de dispositivos: o caminho principal é /v1.0/iot-01/associated-users/devices; se o projeto da Metrolabs não o tiver autorizado, a alternativa /v1.0/users/{uid}/devices precisa do UID da conta do app (propriedade TUYA_UID, sem tela; o UID aparece em Devices > Link Tuya App Account). Confirmar na Fase 3 com as credenciais reais.
- Período de teste do IoT Core: vence; sem extensão ou assinatura nada funciona (28841002). Recomendação: lembrete semestral.
- Pulso do portão: switch_1: true confia no retorno automático do acionador (configuração do próprio dispositivo); se o acionador não volta sozinho, definir o comando ou acrescentar o fechamento no cadastro (não implementado de propósito até ver o modelo).
- Sem rotina automática de leitura de estado (não havia pedido); o estado é lido na sincronização, em "Ler estado" e na confirmação. Se a Diretoria quiser o estado ao vivo, uma rotina de 2 min no padrão do rastreador é o próximo passo.
- Avisos por WhatsApp: não usados (S66 só e-mail na hora e sistema), conforme a regra de WhatsApp sutil.
- Testes físicos: nenhum foi feito; dependem de autorização expressa e acompanhamento presencial (seção 10).

## 12. Commits e capturas

Commits no repositório google-script-dev (apenas os trechos deste módulo, gravados com índice temporário, sem tocar no trabalho paralelo de outras frentes):

- ac6a606 — módulo completo (cliente da Tuya, módulo, tela, Chaves e senhas, menu, ajuda, manual, base do assistente, pendências, S66, testes).
- o commit seguinte — esta seção do relatório (hash do primeiro commit e gate).

Gate antes de gravar: node --test sobre a árvore do commit (git archive) e, no servidor, node scripts/importar_legado.mjs --head + npx vitest run --no-file-parallelism, com código de saída 0 (o legado/ do servidor não é gravado por mim).

Capturas do ensaio: diretoria_01_painel.png, diretoria_02_confirmar_portao.png, diretoria_03_portao_confirmado.png, diretoria_04_portao_simulado.png, diretoria_05_fechadura_confirmacao.png, diretoria_06_fechadura_confirmada.png, diretoria_07_limite.png, diretoria_08_historico.png, diretoria_09_administrar.png, diretoria_10_permissoes.png, diretoria_11_auditoria.png, gestor_01_painel.png, admin_01_painel.png, admin_02_auditoria.png, tecnico_01_sem_permissao.png, celular_01_painel.png, na pasta indicada na seção 8.
