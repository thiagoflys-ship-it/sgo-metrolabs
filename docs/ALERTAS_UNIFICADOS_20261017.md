# Alertas unificados do SGO+ — central de pendências (17/10/2026)

Pedido do dono: os alertas não se conversavam. Cada lugar calculava os próprios avisos com regra, janela e perfil diferentes. Agora há uma fonte única, `SGO_Pendencias_listar(sessão)` (arquivo `SGO_Alertas_Central.js`), e todos os lugares leem dela.

Não publicado (sem clasp). Testado no servidor próprio em modo ensaio, com cópia do banco de desenvolvimento e dados de teste para cada fonte.

## 1. Mapa ANTES

| Lugar | De onde vinha | Regra de prazo | Quem via | Problema |
|---|---|---|---|---|
| Painel "Alertas e pendências" + KPI "alertas vencidos" + faixa da Frota (dashboard, JS_Core) | `alertasObterDashboard` (SGO_Alertas.js): DOC_DOCUMENTOS, CAD_PADROES, Frota | documento: "vence hoje" = atenção; padrão: classificador do CertCal (vence hoje = vencido, mas o alerta comparava `< 0`) | toda a equipe via tudo | documento renovado continuava "vencido" (contava todo documento ATIVO); CERT_CALIBRACAO e NR13_LAUDOS não entravam; técnico via tudo da empresa |
| Balões Padrões/Frota do menu (JS_Core) | mesmo `alertasObterDashboard`, chamada separada | idem | idem | idem |
| Bloco "Vencimentos" do Início: "N documentos vencidos ou vencendo em 30 dias" | `obterDashboardDetalhado` (SGO_Main.js), regra própria | `<= 30` dias, sem documento renovado | trava de cliente | número diferente do painel de alertas logo abaixo |
| Faixa do Início "o que depende de você hoje" | `Inicio_apiPendencias`: chamava alertasObterDashboard + Atividades + Conduta + Auvo, e reagrupava pelo texto da mensagem | herdada | gestor via Auvo | contava CARTÕES, não pendências ("Há 3 itens" com 7 padrões vencidos); sem avisos com ciência, cobranças, CNH, NR-13, calibrações, importação do Auvo |
| Balão / alerta crítico de padrões (Admin > alertas globais de calibração) | `alertasPadroesObterEstado`: lia CAD_PADROES de novo | antecedência configurável (padrão 30) e `< 0` = vencido | GESTOR, METROLOGIA | "vence hoje" contado como "vencendo" aqui e "vencido" na emissão |
| Janela ao entrar (Qualidade_apiObterAvisosLogin) | só cobranças e elogios do Painel de qualidade | — | a pessoa | nenhuma pendência crítica (CNH vencida, documento vencido) aparecia ao entrar |
| Painel de qualidade "Itens que exigem ação" | soma das faltas por dimensão (sem relato + sem foto + questionário + checkout + vínculo + Frota) nos últimos N dias | período escolhido | gestão | a mesma O.S. contava 2 ou 3 vezes; O.S. sem vínculo contava de novo; manutenção de veículo vencida não entrava (dizia OK com a Frota pendente) |
| Ponte COMMAND `alertas.painel` / `alertas.padroes` | cópia do cálculo de SGO_Alertas.js dentro de SGO_PonteCommand.js | cópia (3ª versão da regra) | visão interna | mensagem com "há N dias": o COMMAND avisa no sino tudo que tem mensagem nova, então o mesmo vencimento era avisado de novo todo dia |
| Atividades (balão do menu, janela de justificativa) | Atividades_apiVerificar | previsão < agora | responsável | ok, mas fora do Início só como "atividades" agrupadas |
| Avisos com ciência | Avisos_apiPendentes | prazo de ciência | destinatários | não aparecia no Início |
| Conduta (ciência e fechamento) | Conduta_apiObterAvisos, farol | — | equipe | fechamento do mês não aparecia no Início |
| Auvo (O.S. abertas, sem vínculo, importação parada) | Auvo_apiListarPendencias, tela do Auvo | — | gestão | O.S. sem vínculo e importação parada só dentro da tela do Auvo |
| E-mail / WhatsApp (NTF_ENVIOS) | SGO_notificar_ chamado por Atividades, Avisos, Auvo, Conduta | — | — | duplo clique em Publicar ou Reenviar mandava duas vezes; sem proteção contra o mesmo envio por dois caminhos ao mesmo tempo |
| Sino da Comunicação (balão do chat) | Comunicacao.js (planilha compartilhada com o COMMAND) | — | — | canal de mensagens; não carrega pendências; ficou como está (arquivo idêntico nos dois sistemas) |

## 2. Mapa DEPOIS

Fonte única: `SGO_Pendencias_listar(sessionId)` em `SGO_Alertas_Central.js`.

| Lugar | Agora lê | Observação |
|---|---|---|
| Faixa do Início (computador e celular) | `Inicio_apiPendencias` = central agrupada por tipo | "Há N pendências (X críticas)" conta pendências; botão "Ver todas as pendências (N)" abre a lista completa com motivo, o que fazer, responsável e botão para a tela |
| Painel de alertas, KPI, faixa da Frota, balões do menu | `alertasObterDashboard` = itens de VENCIMENTO da central | um alerta por pendência (o balão conta as linhas); selo pelo rótulo ("Bloqueia emissão", "Vencida", "A vencer", "Revisar"); botão "Abrir" leva à tela |
| "N documentos vencidos ou vencendo em 30 dias" (bloco Vencimentos) | contagem dos itens de documento da central (JS_Core, trecho de alertas) | documento renovado substitui o anterior |
| Balão / alerta crítico de padrões | `alertasPadroesObterEstado` = contagem da central por tipo | a antecedência configurada pelo administrador continua valendo, agora para todos |
| Janela ao entrar | `Qualidade_apiObterAvisosLogin`: cobranças + um item "Pendências críticas" da central | só tipos sem janela própria; "Estou ciente" esconde o mesmo conjunto por 20 h (sem gravar na planilha); se mudar, volta |
| Painel de qualidade | `resumo.pendencias` = central nos módulos Frota + Auvo + Qualidade | mesmo número do Início; não depende do período (o período continua valendo para os rankings) |
| Ponte COMMAND `alertas.painel` | `SGO_Pendencias_interno_()` (visão da gestão, sem nada pessoal), só vencimentos de documentos, padrões e Frota | mensagem estável ("venceu em 12/10/2026"); campos novos `id`, `modulo`, `gravidade`, `titulo`, `detalhe`, `oQueFazer`, `vencimento`, `porModulo` |
| Ponte COMMAND `alertas.padroes` | central | mesmo formato de antes + `id`, `titulo`, `oQueFazer` na lista |
| Celular | `SGO_Pendencias_apiListar` (ver seção 5) e a faixa do Início, que o celular já usa | |

### Números conferidos no ensaio (Playwright, servidor local, modo ensaio)

| Perfil | Início | Ver todas | KPI alertas vencidos | Balão Padrões | Balão Frota | Painel de qualidade |
|---|---|---|---|---|---|---|
| ADMIN | 22 (7 críticas) | 22 | 5 | 4 | 5 | 11 = Frota 6 + Auvo 3 + Registros 2 |
| GESTOR | 23 (7 críticas) | 23 | 5 | 4 | 5 | 10 = Frota 6 + Auvo 2 + Registros 2 |
| TÉCNICO | 15 (5 críticas) | 15 | 3 | 4 | 1 (a própria CNH) | sem acesso |
| METROLOGIA | 8 (3 críticas) | 8 | 3 | 4 | 0 | sem acesso |
| CLIENTE | 1 | 1 | 0 | 0 | 0 | sem acesso |

A ponte devolveu 12 vencimentos (5 críticos), igual ao painel de alertas da gestão. Sem erros de JavaScript. Celular em 390 e 360 px conferido.

Dados de teste: padrão vencido, vencendo em 10 dias, sem validade e vencendo hoje; documento vencido já renovado (não aparece), contrato vencendo hoje, laudo NR-13 com cópia em Documentos (aparece uma vez), certificado antigo vencido já substituído (não aparece) e calibração vencendo; CNH vencida de condutor com login e CNH vencendo de condutor sem login; CRLV vencido; troca de óleo em 5 dias; multa sem condutor; veículo fora há 3 dias sem checklist; atividade atrasada do técnico e da gestora, atividade vencendo hoje, justificativa não lida; aviso importante sem ciência e aviso com prazo de ciência vencido; O.S. concluída sem relato e foto; O.S. aberta há 40 dias sem vínculo de cliente; importação do Auvo parada; cobrança da gestão sem ciência; ocorrência do Conduta homologada em nome do técnico.

## 3. Regras (iguais em todos os lugares)

- **Prazo:** vencido ou vence hoje = CRÍTICO; vence em até 30 dias = ATENÇÃO; além disso não é pendência. "Vence hoje" é crítico porque a emissão de certificado já bloqueia o padrão nesse dia e o Inventário já mostrava "Vence hoje" como vencido. Padrões usam a antecedência configurada nos alertas globais de calibração (padrão 30).
- **Renovado substitui o anterior:** por equipamento e categoria (documento do mesmo tipo, calibração, NR-13) vale o vencimento mais recente. O laudo NR-13 e a cópia dele em Documentos são uma pendência só; a calibração vem do último certificado do equipamento (DATA_VALIDADE ou próxima calibração gravada no certificado).
- **Falha de registro** (O.S. concluída sem relato/foto/check-in/check-out/questionário; retirada de veículo sem checklist, foto ou KM) conta por 30 dias.
- **Sem duplicar:** cada pendência tem um id estável; a mesma coisa por dois caminhos fica uma vez (vale a mais grave). O.S. sem vínculo é pendência própria do Auvo e não se repete em "registro incompleto".
- **Gravidades sem prazo:** atividade atrasada = crítica; atividade que vence hoje = atenção; aviso com prazo de ciência vencido = crítico, aviso importante = atenção, demais = informação; ocorrência do Conduta em seu nome = atenção, demais avisos do Conduta = informação; fechamento do Conduta com prazo vencido e defesas pendentes = crítico; O.S. aberta no Auvo, O.S. sem vínculo, importação parada, multa a conferir, veículo fora sem devolução, registro incompleto, cobrança = atenção.
- **Quem vê:** CLIENTE só vencimentos de documentos, calibrações e NR-13 do próprio cliente. ADMIN, GESTOR e DIRETORIA: tudo da equipe e o que é pessoal dele (importação do Auvo só para o ADMIN). METROLOGIA: padrões, vencimentos dos clientes e o que é dele. TÉCNICO, COMERCIAL e FINANCEIRO: padrões de referência (bloqueiam o trabalho de todos, decisão antiga do dono) e o que é dele: atividades, avisos, a própria CNH, as próprias O.S. do Auvo, cobranças e retiradas.
- **Operador nunca no limbo:** todo item traz título (o quê), detalhe (por quê), "o que fazer" e a tela; para quem não é o responsável, o texto diz como acompanhar.
- **Desempenho:** cada aba é lida uma vez por cálculo (memória da chamada, inclusive pelas funções dos módulos) e o resultado de cada pessoa fica 60 s no cache. Gravações em Avisos, Atividades, Qualidade, configuração de padrões e atualização das pendências do Auvo invalidam o cache. Nada da central grava na planilha e nenhuma data sai como Date.

## 4. Notificações (e-mail e WhatsApp)

- `SGO_notificar_` (SGO_Notificar.js): a mesma mensagem (título + texto + modelo) para a mesma pessoa pelo mesmo canal não sai duas vezes em 10 minutos, venha de onde vier. A vaga é reservada antes do envio (dois caminhos ao mesmo tempo não mandam os dois) e liberada se o envio falhar. O repetido fica em NTF_ENVIOS como PULADO com "Mesma mensagem já enviada a esta pessoa por este canal às HH:MM (origem X); não foi repetida." Testado: primeiro envio OK, segundo PULADO.
- Avisos: publicar de novo o mesmo aviso (mesma pessoa, título e texto) em até 10 minutos devolve o aviso já publicado, sem novo envio; "Reenviar" em menos de 10 minutos do último reenvio é recusado com a hora do anterior.
- Atividades: o aviso de atraso continua uma vez por previsão (ATRASO_AVISADO_PREV), pela verificação das telas ou pela rotina de hora em hora, sob trava; a proteção acima cobre a corrida entre os dois.
- Auvo: abertura e fechamento continuam uma vez por evento (AVISO_ABERTURA_EM / AVISO_FECHAMENTO_EM); a proteção acima cobre duas sincronizações ao mesmo tempo. Observação: O.S. vista pela primeira vez já concluída gera "aberto" e "concluído" na mesma sincronização (dois eventos, comportamento mantido).
- Ponte com o COMMAND: mensagem estável evita o sino do COMMAND repetir o mesmo vencimento todo dia.

## 5. Contrato da função central

```
SGO_Pendencias_listar(sessionId, opcoes) -> resposta        // servidor (lança só se a sessão for inválida)
SGO_Pendencias_apiListar(sessionId, payload) -> resposta    // google.script.run; erro vem em { ok:false, message }
SGO_Pendencias_interno_(opcoes) -> resposta                 // sem sessão: visão da gestão, sem itens pessoais (ponte COMMAND)
SGO_Pendencias_invalidar_()                                 // chamar depois de gravar algo que muda pendência

opcoes: { semCache: true } recalcula; { limite: n } corta a lista de itens (padrão 500)

resposta = {
  ok: true,
  geradoEm: "dd/mm/aaaa hh:mm",
  resumo: {
    total, criticos, atencao, info, meus,
    porModulo: { <modulo>: { nome, total, criticos } },
    porTipo: { <tipo>: n },
    vencimentos: { total, criticos }          // o que entra no painel de alertas
  },
  grupos: [ {                                 // um por tipo, do mais grave para o menos grave
    tipo, modulo, moduloNome, gravidade, rotulo, qtd, criticos, meus,
    titulo,                                   // "3 padrões de referência vencidos" ou o título do item, se for um só
    detalhe, oQueFazer, tela, ids: [...]
  } ],
  itens: [ {
    id,            // estável: "PADRAO:<id>", "DOC:<id>", "CAL:<equipamento>", "NR13:<equipamento>",
                   // "FROTA:CNH:<condutor>", "FROTA:DOC:<veiculo>:<tipo>", "FROTA:MAN:<veiculo>:<tipo>",
                   // "FROTA:MULTA:<id>", "FROTA:VIAGEM:<mov>", "ATV:<id>", "ATV_AVISO:<id>", "AVISO:<id>",
                   // "AVISO_LEITURA:<id>", "CONDUTA:<tipo>|<ref>", "CONDUTA:FECHAMENTO:<aaaa-mm>",
                   // "QUAL:OS:<os>", "QUAL:MOV:<mov>", "QUAL:COB:<id>", "AUVO:OS:<os>", "AUVO:VINC:<os>", "AUVO:IMPORTACAO"
    tipo,          // padrao_vencido | padrao_vencendo | padrao_sem_validade | documento_vencido | documento_vencendo |
                   // calibracao_vencida | calibracao_vencendo | nr13_vencida | nr13_vencendo | cnh_vencida | cnh_vencendo |
                   // veiculo_doc_vencido | veiculo_doc_vencendo | manutencao_vencida | manutencao_vencendo | multa_conferir |
                   // frota_viagem_aberta | atividade_atrasada | atividade_hoje | atividade_aviso | aviso_ciencia |
                   // aviso_leitura_atrasada | conduta_ciencia | conduta_fechamento | qualidade_cobranca | qualidade_os |
                   // qualidade_mov | auvo_os_aberta | auvo_sem_vinculo | auvo_importacao
    modulo,        // padroes | documentos | certificados | nr13 | frota | atividades | avisos | conduta | qualidade | auvo
    moduloNome, gravidade ("CRITICO" | "ATENCAO" | "INFO"), rotulo,
    titulo,        // o quê
    detalhe,       // por quê
    oQueFazer,     // o que fazer (texto para quem está vendo: responsável, gestão ou cliente)
    nome,          // rótulo curto (TAG, placa, nome) para listas agrupadas
    vencimento,    // "dd/mm/aaaa" ou ""
    dias,          // número (negativo = vencido) ou null
    tela,          // ação de navegação (ver abaixo) ou null
    responsavel, responsavelId, meu (bool), clienteId,
    origem,        // formato antigo: PADRAO | DOCUMENTO | FROTA | ATIVIDADES | AVISOS | CONDUTA | QUALIDADE | AUVO
    vencimentoTipo (bool), textoEstavel
  } ],
  naoVerificado: ["frota", ...],              // fonte que falhou agora (o resto continua valendo)
  regras: { diasAtencao: 30, diasRegistro: 30, venceHojeCritico: true },
  cortado: true                               // só quando a lista passou do limite
}

tela = { tipo: "modulo", mod } | { tipo: "atalho", alvo } | { tipo: "atividade", id } |
       { tipo: "documento", termo } | { tipo: "certificado", cnpj, numero } | { tipo: "conduta_ciencia" } |
       { tipo: "qualidade_ciencia" } | { tipo: "link", url, rotulo }
       -> executar com Inicio_executarAcao_(tela) (JS_Inicio.html)
```

### Como a frente do celular deve chamar

```
google.script.run
  .withSuccessHandler(function (r) {
    if (!r || !r.ok) { /* mostrar r.message (já diz o que fazer) */ return; }
    // contador do sino/ícone: r.resumo.total (r.resumo.criticos em vermelho)
    // lista: r.grupos (um cartão por tipo) ou r.itens (um por pendência), cada um com titulo, detalhe, oQueFazer
    // tocar no item: Inicio_executarAcao_(item.tela)  — a mesma ação do computador
    // r.naoVerificado não vazio: "Não foi possível verificar agora: ... Atualize para tentar de novo."
  })
  .withFailureHandler(function () { /* "Não foi possível verificar as pendências. Verifique a conexão e atualize." */ })
  .SGO_Pendencias_apiListar(SESSION, {});
```

A faixa do Início do celular (renderMobileHome_ › Inicio_carregarPendencias_) já usa a central; a lista completa abre por `Inicio_abrirTodas_()`.

## 6. Contratos pedidos a outras frentes (não editei esses arquivos)

- **SGO_Main.js › obterDashboardDetalhado** (dono do dashboard): `docsAVencer` (aba "Documentos em 60 dias") e `vencendo30` ainda contam documento já renovado e usam regra própria. O cartão do bloco Vencimentos já mostra a contagem da central (JS_Core, trecho de alertas). Sugestão: montar `docsAVencer` com `SGO_Pendencias_listar(sessionId, {}).itens.filter(i => i.origem === "DOCUMENTO")` mais os que vencem entre 31 e 60 dias, ou trocar a aba por "Ver todas as pendências".
- **SGO_Frota_Main.js › Frota_situacaoPorDias_ / Frota_statusDocumento_**: na tela da Frota, documento e CNH que vencem hoje aparecem como "Vencendo"; a central conta como vencido (regra única). Para a tela bater: `dias <= 0 ? 'VENCIDO'`.
- **SGO_Main.js › montarAuvoResumoDashboard_**: "relato" conta todas as tarefas (finalizadas ou não); a regra da qualidade é só das finalizadas (`QualidadeAuvo_motivosTarefa_`, SGO_Qualidade_Auvo.js).
- **SGO_Conduta_Ciencia.js › Conduta_apiRegistrarCiencia**: depois de gravar a ciência, chamar `SGO_Pendencias_invalidar_()` (hoje o Início leva até 60 s para tirar o aviso confirmado).
- **SGO_Frota_*.js**: depois de gravar CNH, documento, manutenção, multa ou devolução, chamar `SGO_Pendencias_invalidar_()` (mesmo motivo).
- **JS_Core › verificarAvisosLogin_ / Avisos_renderModal_**: o item "Pendências críticas" chega como cobrança com `ID` começando por `PEND:` e `TIPO: "PENDENCIAS"`. Se quiserem, mostrar com outro título ("Pendências críticas no SGO+") e um botão "Ver no Início" (`Inicio_abrirTodas_()`). O "Estou ciente" já funciona.

## 7. Arquivos alterados

- `SGO_Alertas_Central.js` (novo): a central.
- `SGO_Alertas.js`: painel de alertas pela central.
- `SGO_AlertasPadroes.js`: balão de padrões pela central; salvar a configuração invalida o cache.
- `SGO_Inicio.js` e `JS_Inicio.html`: faixa pela central, total de pendências, "Ver todas", ações `link` e `qualidade_ciencia`; `padroes` na busca do celular e sem o bloqueio "só no computador" (há consulta de padrões no celular).
- `SGO_Qualidade_Main.js`, `SGO_Qualidade_ConteudoModulo.js`: "Itens que exigem ação" pela central, por área e com o que fazer.
- `SGO_Qualidade_Ocorrencias.js`: janela ao entrar com o resumo das pendências críticas; invalidação após gravar.
- `SGO_Qualidade_Frota.js`, `SGO_Qualidade_Auvo.js`: regras de "registro incompleto" viraram funções de topo, usadas pelo painel e pela central (uma regra só).
- `SGO_PonteCommand.js`: `alertas.painel` e `alertas.padroes` pela central, mensagem estável (pedido explícito desta tarefa).
- `SGO_Notificar.js`: proteção contra envio repetido.
- `SGO_Avisos.js`: publicação e reenvio repetidos; invalidação após gravar.
- `SGO_Atividades.js` e `JS_Atividades.html`: invalidação após gravar; celular (título só na barra do topo, abas numa linha, lista em cartões, plural "1 aberta · 1 vencida") e itens P3 da auditoria (Nova atividade / Salvar atividade, Cliente antes da Unidade, "Fazendo agora" com um rótulo só, só "Concluir" primário, "0 a 100" no andamento, coluna "Situação do prazo", "Gantt por" só no Gantt, marca "hoje dd/mm", botões Semana/Mês na mesma altura).
- `SGO_Auvo_Pendencias.js`: invalidação ao terminar a varredura.
- `JS_Core.html` (só o trecho de alertas, liberado pela coordenação): contagem de documentos do bloco Vencimentos pela central, selo pelo rótulo e botão "Abrir".
