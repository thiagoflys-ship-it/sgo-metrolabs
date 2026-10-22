/****************************************************
 * FROTA — BLOQUEIO E LIBERAÇÃO DA PARTIDA (21/10/2026)
 *
 * Construído a partir do estudo aprovado (docs/BLOQUEIO_PARTIDA_ESTUDO_20261021.md, simulação de 12.000
 * situações) e das decisões do dono. Substitui o caminho antigo de comandos de SGO_Frota_Rastreador.js:
 * nada lá envia comando ao rastreador; tudo passa por FrotaBlq_executar_, com as regras abaixo.
 *
 * API da iTracker (carta de 21/10/2026), só do IP do servidor, chave RASTREADOR_TOKEN_COMANDOS:
 *   POST /commands {"id":35,"deviceId":N} = bloquear; {"id":36,"deviceId":N} = liberar.
 *     200 = entregue ao aparelho; 202 = aparelho desconectado, FICA NA FILA e executa ao reconectar
 *     (o SGO+ trata como NÃO executado, avisa e nunca conta com a fila para bloquear); 401/403/429/503 = recusado.
 *   Confirmação: attributes.blocked na posição seguinte (1 a 2 min) e GET /reports/events?type=commandResult.
 *   Hodômetro: PUT /devices/<id>/accumulators {"deviceId":N,"totalDistance":km x 1000} -> 204.
 *   Limite 30 por minuto (rajada de 10); o mesmo comando não é reenviado em sequência sem resultado.
 *   O relé corta a bomba de combustível e só efetiva abaixo de 20 km/h.
 *
 * REGRAS (estudo + dono)
 *  1. Retirada aberta = carro liberado, sempre (mesmo em viagem de dias). A retirada envia LIBERAR e confere;
 *     sem sinal (202) avisa o condutor e a gestão ("liberação aguardando sinal").
 *  2. Devolução só com o carro desligado e parado (Frota_apiFinalizarViagem consulta FrotaBlq_conferirDevolucao_).
 *     A devolução PEDE o bloqueio; ele só é ENVIADO com o aparelho CONECTADO AGORA (GET /devices: situação "online" e
 *     último contato, lastUpdate, de até 2 minutos), a última posição parada (menos de 5 km/h, sem movimento) com a
 *     ignição desligada e nenhuma retirada aberta. Senão espera e reconfere a cada 2 minutos. Nova retirada cancela.
 *     22/10/2026 (medido em produção): com o carro desligado o rastreador entra em economia e PARA de mandar posição
 *     (a próxima pode vir horas depois), mas continua conectado e com lastUpdate de poucos minutos. Por isso
 *     "conectado" vem do /devices e a última posição pode ser antiga: se o carro ligasse ou andasse, o aparelho
 *     conectado mandaria posição nova. Aparelho offline ou situação desconhecida = nunca bloqueia.
 *  3. Devolução fora da área da base: não bloqueia sozinho; a gestão decide na Caixa de decisões (bloquear ou
 *     não), e o bloqueio autorizado segue as mesmas condições de segurança.
 *  4. "Passar o carro": troca de responsável sem devolução e sem comando, só para condutor ativo com CNH válida.
 *     Funciona sem internet (guardado no celular com a hora; o servidor aceita uma vez só pelo código do celular).
 *  5. Retirada esquecida: parado na base há 1 h com retirada aberta = pergunta ao condutor no aplicativo;
 *     sem resposta em mais 1 h = Caixa de decisões; a gestão só encerra com o carro parado, desligado, na base e com
 *     sinal, e aí pede o bloqueio. Enquanto aberta, ninguém retira o carro (pede "Assumir o carro").
 *  6. Carro andando sem retirada: nunca recebe bloqueio andando; a gestão é avisada na hora (uso sem registro, S35).
 *  7. Conferência a cada 2 min (rotina do rastreador): estado desejado x relé real (attributes.blocked).
 *  8. Emergência: "Liberar agora" (Administrador, Diretoria, Gestor, RH) com motivo; bloqueio de roubo só a
 *     Diretoria, com dupla confirmação e as condições seguras (ou aceite explícito do risco).
 *  9. Hodômetro: a gestão informa o KM do painel e o SGO+ grava no aparelho (PUT accumulators, confirma 204).
 * 10. Triagem do sinal por veículo: "Bloqueio ativo" ou "Só avisa" (nunca envia bloqueio). 22/10/2026: mede a CONEXÃO do
 *     aparelho (situação e último contato no /devices, uma amostra por rodada guardada como resumo de 14 dias na linha do
 *     veículo), não o intervalo entre posições, que confundia a economia do rastreador desligado com falta de sinal.
 * 11. Modos por veículo: ATIVO (comando real), SIMULACAO (faz tudo, registra "teria bloqueado/liberado" e não
 *     envia), DESLIGADO. Padrão: SIMULACAO; o piloto começa com o aparelho FBLQ_PILOTO_INICIAL em ATIVO. ATIVO só
 *     envia de verdade com RASTREADOR_LIGADO = 1, RASTREADOR_BLOQUEIO_LIGADO = 1 e a chave dos comandos gravada;
 *     sem isso o veículo ATIVO trabalha em simulação e a tela diz o porquê.
 * 12. Registro inviolável (REG_FROTA_BLOQUEIO_EVENTOS): só inclusão, cada linha com o resumo (SHA-256) da anterior;
 *     painel "Bloqueio da partida" e relatório diário do piloto às 18h por e-mail.
 *
 * Abas (criadas sob demanda; nada é apagado): REG_FROTA_BLOQUEIO_ESTADO (uma linha por veículo),
 * REG_FROTA_BLOQUEIO_EVENTOS (registro), REG_FROTA_PASSAGENS (passar o carro).
 * Tela: SGO_Frota_BloqueioTela.js (gestão) e JS_Core.html (celular do condutor).
 ****************************************************/

var FBLQ_ABA_ESTADO = 'REG_FROTA_BLOQUEIO_ESTADO';
var FBLQ_ABA_EVENTOS = 'REG_FROTA_BLOQUEIO_EVENTOS';
var FBLQ_ABA_PASSAGENS = 'REG_FROTA_PASSAGENS';
var FBLQ_COLUNAS_ESTADO = ['ID', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'MODO', 'MODO_EM', 'MODO_POR', 'MODO_MOTIVO',
  'TRIAGEM', 'TRIAGEM_EM', 'TRIAGEM_RESUMO', 'TRIAGEM_MANUAL', 'TRIAGEM_MANUAL_POR', 'TRIAGEM_MANUAL_MOTIVO',
  'RELE_REAL', 'RELE_REAL_EM', 'RELE_SIMULADO', 'RELE_SIMULADO_EM',
  'PEDIDO_ACAO', 'PEDIDO_ORIGEM', 'PEDIDO_DESDE', 'PEDIDO_MOV_ID', 'PEDIDO_SITUACAO', 'PEDIDO_MOTIVO', 'PEDIDO_POR', 'PEDIDO_DECISAO_POR', 'PEDIDO_DECISAO_EM', 'PEDIDO_AVISADO_EM',
  'ULT_CMD_ACAO', 'ULT_CMD_EM', 'ULT_CMD_HTTP', 'ULT_CMD_RESULTADO', 'ULT_CMD_REAL', 'ULT_CMD_CONSULTADO_EM', 'ULT_CMD_CONFIRMADO_EM', 'ULT_CMD_MOV_ID',
  'EMERGENCIA_ATE', 'EMERGENCIA_MOTIVO', 'EMERGENCIA_POR',
  'ESQ_MOV_ID', 'ESQ_PARADO_DESDE', 'ESQ_PERGUNTA_EM', 'ESQ_RESPOSTA', 'ESQ_RESPOSTA_EM', 'ESQ_GESTAO_EM',
  'LIB_SINAL_AVISO_MOV_ID', 'ODO_DIVERGENCIA_MOV_ID', 'ODO_PAINEL_KM', 'ODO_RASTREADOR_KM', 'ODO_DIVERGENCIA_EM', 'ODO_FOTO', 'ODO_ACERTO_EM', 'ODO_ACERTO_POR', 'ODO_ACERTO_DE', 'ODO_ACERTO_PARA', 'ODO_ACERTO_REAL',
  'CON_ONLINE', 'CON_ULTIMO_EM', 'CON_OFF_DESDE', 'CON_INICIO', 'CON_RESUMO', 'ATUALIZADO_EM', 'CRIADO_EM'];
var FBLQ_COLUNAS_EVENTOS = ['ID', 'QUANDO', 'QUANDO_EM', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'MODO', 'TIPO', 'ACAO', 'ORIGEM',
  'QUEM_ID', 'QUEM_NOME', 'PERFIL', 'MOVIMENTACAO_ID', 'CONDICAO', 'HTTP', 'RESPOSTA', 'RESULTADO', 'DETALHE', 'HASH_ANTERIOR', 'HASH', 'CRIADO_EM'];
var FBLQ_COLUNAS_PASSAGENS = ['ID', 'CODIGO_LOCAL', 'VEICULO_ID', 'PLACA', 'MOV_ORIGEM_ID', 'MOV_NOVA_ID', 'DE_CONDUTOR_ID', 'DE_NOME', 'PARA_CONDUTOR_ID', 'PARA_NOME',
  'PEDIDO_POR', 'DE_CONFIRMOU_EM', 'PARA_CONFIRMOU_EM', 'GESTAO_AUTORIZOU_POR', 'GESTAO_AUTORIZOU_EM', 'GESTAO_JUSTIFICATIVA', 'KM', 'QUANDO_LOCAL', 'SEM_INTERNET',
  'SITUACAO', 'MOTIVO', 'CONCLUIDA_EM', 'CRIADO_EM'];

// Piloto até segunda-feira (decisão do dono, 21/10/2026): só o aparelho abaixo começa em ATIVO; os outros em SIMULACAO.
var FBLQ_PILOTO_INICIAL = ['1039'];
var FBLQ_MODOS = { ATIVO: 'Ativo (envia comandos)', SIMULACAO: 'Simulação (só registra)', DESLIGADO: 'Desligado' };
var FBLQ_CMD_ID = { BLOQUEAR: 35, LIBERAR: 36 };
var FBLQ_POS_NO_MINUTO_MS = 2 * 60000;      // "conectado agora": aparelho online e último contato (lastUpdate) de até 2 minutos
var FBLQ_CON_TRIAGEM_MS = 5 * 60000;        // triagem: amostra "conectada" = online e último contato de até 5 minutos
var FBLQ_CON_CACHE = 'FBLQ_CONEXOES_V1';    // lista de aparelhos guardada 45 s (uma chamada por rodada para todos)
var FBLQ_CON_DIAS = 14;                     // resumo de conexão: últimos 14 dias
var FBLQ_PROP_TRIAGEM_V2 = 'FROTA_BLQ_TRIAGEM_CONEXAO_EM';
var FBLQ_PARADO_KMH = 5;
var FBLQ_SEM_REPETIR_MS = 4 * 60000;        // o mesmo comando não é reenviado antes disso sem resultado
var FBLQ_SEM_CONFIRMACAO_MS = 10 * 60000;   // comando entregue sem confirmação depois disso = alerta e pode reenviar
var FBLQ_LIMITE_MINUTO = 25;                // abaixo do limite da iTracker (30 por minuto)
var FBLQ_ESQ_PARADO_MIN = 60;               // retirada esquecida: parado na base há 1 h
var FBLQ_ESQ_RESPOSTA_MIN = 60;             // sem resposta em mais 1 h: Caixa de decisões
var FBLQ_EMERGENCIA_HORAS = 24;
var FBLQ_RAIO_BASE_PADRAO_M = 300;
var FBLQ_PROP_AREAS = 'FROTA_BASES_AREA';
var FBLQ_PROP_HASH = 'FROTA_BLQ_ULTIMO_HASH';
var FBLQ_PROP_RELATORIO = 'FROTA_BLQ_RELATORIO_DIA';
var FBLQ_PROP_TRIAGEM_DIA = 'FROTA_BLQ_TRIAGEM_DIA';
var FBLQ_PROP_MIGRADO = 'FROTA_BLQ_REGRA_NOVA_EM';
var FBLQ_HORA_RELATORIO = 18;
// Triagem do sinal (22/10/2026: pela conexão do aparelho; local frequente = 3 h ou mais de carro parado)
var FBLQ_TRI_PCT_MIN = 0.8;                 // local frequente com menos de 80% do tempo conectado = ruim (ou reconexão média acima de 30 min)
var FBLQ_TRI_PARTE_MIN = 0.05;              // só conta local com pelo menos 5% do tempo parado do veículo
var FBLQ_SISTEMA = { userId: '', usuario: 'sistema', nome: 'Rotina do bloqueio da partida', perfil: 'SISTEMA' };

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function FrotaBlq_s_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function FrotaBlq_ms_(iso) { var t = new Date(FrotaBlq_s_(iso)).getTime(); return isFinite(t) ? t : 0; }
function FrotaBlq_txt_(ms) { return ms ? Rastreador_agoraTexto_(new Date(ms)) : ''; }
function FrotaBlq_hhmm_(ms) { return ms ? FrotaBlq_txt_(ms).slice(-5) : ''; }
function FrotaBlq_rotulo_(v) {
  try { if (typeof Frota_rotuloVeiculo_ === 'function') return Frota_rotuloVeiculo_(v) || FrotaBlq_s_(v.PLACA); } catch (e) {}
  return FrotaBlq_s_(v && v.PLACA);
}
function FrotaBlq_nome_(sessao) { return FrotaBlq_s_(sessao && (sessao.nome || sessao.usuario)) || 'sistema'; }

function FrotaBlq_hash_(texto) {
  try {
    if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
      var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8);
      return b.map(function (x) { var h = (x < 0 ? x + 256 : x).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
    }
  } catch (e) {}
  // sem o resumo do Google (não deve acontecer): FNV-1a de 32 bits, só para não deixar a corrente vazia
  var h = 0x811c9dc5, s = String(texto);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return 'fnv' + h.toString(16);
}

// ------------------------------------------------------------
// TABELAS
// ------------------------------------------------------------
function FrotaBlq_bootstrapSemTrava_() {
  CertCal_garantirTabela_(FBLQ_ABA_ESTADO, FBLQ_COLUNAS_ESTADO);
  CertCal_garantirTabela_(FBLQ_ABA_EVENTOS, FBLQ_COLUNAS_EVENTOS);
  CertCal_garantirTabela_(FBLQ_ABA_PASSAGENS, FBLQ_COLUNAS_PASSAGENS);
  ['PASSAGEM_ID', 'ENCERRADA_POR_PASSAGEM', 'ENCERRADA_ESQUECIDA'].forEach(function (c) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, c); });
}

/** Configuração do rastreador vista pelo bloqueio: o que falta para o modo ATIVO enviar de verdade. */
function FrotaBlq_cfg_() {
  var c = Rastreador_cfg_();
  var faltas = [];
  if (!c.ligado) faltas.push('o rastreador está desligado no SGO+ (Chaves e senhas > Rastreador da frota > "Rastreador ligado no SGO+")');
  if (!c.tokenComandos) faltas.push('falta gravar a "Chave de acesso dos comandos" (Chaves e senhas > Rastreador da frota)');
  if (!c.bloqueioPedido) faltas.push('o "Bloqueio da partida pelo SGO+" está Desligado (Chaves e senhas > Rastreador da frota)');
  c.podeEnviar = !faltas.length;
  c.faltasEnvio = faltas;
  return c;
}

/** Modo gravado -> modo que vale agora (ATIVO sem chave/liga = SIMULACAO com o porquê). */
function FrotaBlq_modoEfetivo_(modo, cfg) {
  modo = FrotaBlq_s_(modo).toUpperCase();
  if (!FBLQ_MODOS[modo]) modo = 'SIMULACAO';
  if (modo === 'ATIVO' && !cfg.podeEnviar) return { modo: 'SIMULACAO', gravado: 'ATIVO', motivo: 'Ativo aguardando a liberação: ' + cfg.faltasEnvio.join('; ') + '. Até lá o veículo trabalha em simulação (nada é enviado).' };
  return { modo: modo, gravado: modo, motivo: '' };
}

function FrotaBlq_modoInicial_(deviceId) { return FBLQ_PILOTO_INICIAL.indexOf(FrotaBlq_s_(deviceId)) >= 0 ? 'ATIVO' : 'SIMULACAO'; }

function FrotaBlq_estados_() {
  var out = {};
  Frota_lerSeExistir_(FBLQ_ABA_ESTADO).forEach(function (e) { var k = FrotaBlq_s_(e.VEICULO_ID); if (k && !out[k]) out[k] = e; });
  return out;
}

/** Linha de estado do veículo (criada na primeira vez com o modo inicial do piloto). */
function FrotaBlq_estadoDe_(veiculo, estados) {
  var vid = FrotaBlq_s_(veiculo.ID);
  var e = (estados || FrotaBlq_estados_())[vid];
  if (e) return e;
  var dev = FrotaBlq_s_(veiculo.RASTREADOR_DEVICE_ID);
  var modo = FrotaBlq_modoInicial_(dev);
  var reg = SGO_DATA.normalizarObjetoParaSheet(FBLQ_ABA_ESTADO, SGO_DATA.gerarRegistroBase({
    VEICULO_ID: vid, PLACA: FrotaBlq_s_(veiculo.PLACA), DEVICE_ID: dev, MODO: modo, MODO_EM: SGO_UTILS.nowIso(), MODO_POR: 'configuração inicial',
    MODO_MOTIVO: modo === 'ATIVO' ? 'Piloto do bloqueio (decisão do dono, 21/10/2026): começa em Ativo.' : 'Padrão: simulação até a gestão mudar.',
    TRIAGEM: 'SEM_DADOS', ATUALIZADO_EM: SGO_UTILS.nowIso()
  }));
  SGO_DATA.insert(FBLQ_ABA_ESTADO, reg);
  if (estados) estados[vid] = reg;
  FrotaBlq_evento_({ veiculo: veiculo, modo: modo, tipo: 'MODO', acao: modo, origem: 'CONFIGURACAO_INICIAL', quem: FBLQ_SISTEMA, detalhe: reg.MODO_MOTIVO });
  return reg;
}

function FrotaBlq_gravarEstado_(e, upd) {
  var mudou = Object.keys(upd).some(function (k) { return String(e[k] === undefined || e[k] === null ? '' : e[k]) !== String(upd[k] === undefined || upd[k] === null ? '' : upd[k]); });
  if (!mudou) return false;
  upd.ATUALIZADO_EM = SGO_UTILS.nowIso();
  SGO_DATA.update(FBLQ_ABA_ESTADO, e.ID, upd);
  Object.assign(e, upd);
  return true;
}

// ------------------------------------------------------------
// REGISTRO INVIOLÁVEL (só inclusão; cada linha leva o resumo da anterior)
// ------------------------------------------------------------
function FrotaBlq_camposHash_(r) {
  return [r.ID, r.QUANDO_EM, r.VEICULO_ID, r.PLACA, r.DEVICE_ID, r.MODO, r.TIPO, r.ACAO, r.ORIGEM, r.QUEM_ID, r.QUEM_NOME, r.MOVIMENTACAO_ID, r.CONDICAO, r.HTTP, r.RESPOSTA, r.RESULTADO, r.DETALHE, r.HASH_ANTERIOR]
    .map(function (x) { return String(x === undefined || x === null ? '' : x); }).join('|');
}

/**
 * o: { veiculo, modo, tipo (PEDIDO|ENVIO|SIMULACAO|CONFIRMACAO|DECISAO|AVISO|CANCELADO|MODO|TRIAGEM|PASSAGEM|EMERGENCIA|HODOMETRO|ESPERA),
 *      acao, origem, quem (sessão), movId, condicao, http, resposta, resultado, detalhe }
 */
function FrotaBlq_evento_(o) {
  var v = o.veiculo || {};
  var lock = null;
  try { lock = LockService.getScriptLock(); if (lock.hasLock && lock.hasLock()) lock = null; else lock.waitLock(10000); } catch (eL) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var anterior = String(props.getProperty(FBLQ_PROP_HASH) || 'INICIO');
    var agora = new Date();
    var r = SGO_DATA.gerarRegistroBase({
      QUANDO: Rastreador_agoraTexto_(agora), QUANDO_EM: agora.toISOString(),
      VEICULO_ID: FrotaBlq_s_(v.ID || v.VEICULO_ID), PLACA: FrotaBlq_s_(v.PLACA), DEVICE_ID: FrotaBlq_s_(v.RASTREADOR_DEVICE_ID || v.DEVICE_ID),
      MODO: FrotaBlq_s_(o.modo), TIPO: FrotaBlq_s_(o.tipo), ACAO: FrotaBlq_s_(o.acao), ORIGEM: FrotaBlq_s_(o.origem),
      QUEM_ID: FrotaBlq_s_(o.quem && o.quem.userId), QUEM_NOME: FrotaBlq_nome_(o.quem), PERFIL: FrotaBlq_s_(o.quem && o.quem.perfil).toUpperCase(),
      MOVIMENTACAO_ID: FrotaBlq_s_(o.movId), CONDICAO: String(o.condicao || '').slice(0, 500), HTTP: o.http ? String(o.http) : '',
      RESPOSTA: String(o.resposta || '').slice(0, 300), RESULTADO: FrotaBlq_s_(o.resultado), DETALHE: String(o.detalhe || '').slice(0, 1000),
      HASH_ANTERIOR: anterior
    });
    r.HASH = FrotaBlq_hash_(FrotaBlq_camposHash_(r));
    SGO_DATA.insert(FBLQ_ABA_EVENTOS, SGO_DATA.normalizarObjetoParaSheet(FBLQ_ABA_EVENTOS, r));
    props.setProperty(FBLQ_PROP_HASH, r.HASH);
    return r;
  } catch (e) {
    console.error('Bloqueio da partida, registro: ' + ((e && e.message) || e));
    return null;
  } finally { if (lock) try { lock.releaseLock(); } catch (e2) {} }
}

/** Confere a corrente inteira (botão "Conferir a integridade" do painel). */
function FrotaBlq_conferirIntegridade_() {
  var lista = Frota_lerSeExistir_(FBLQ_ABA_EVENTOS).slice().sort(function (a, b) { return String(a.QUANDO_EM).localeCompare(String(b.QUANDO_EM)) || String(a.CRIADO_EM).localeCompare(String(b.CRIADO_EM)); });
  var anterior = 'INICIO', problemas = [];
  var porAnterior = {};
  lista.forEach(function (r) { porAnterior[FrotaBlq_s_(r.HASH_ANTERIOR)] = r; });
  // segue a corrente pelo resumo (a ordem da aba pode mudar por ordenação manual)
  var vistos = 0, atual = porAnterior['INICIO'];
  while (atual && vistos <= lista.length) {
    vistos++;
    var calc = FrotaBlq_hash_(FrotaBlq_camposHash_(atual));
    if (calc !== FrotaBlq_s_(atual.HASH)) problemas.push('Linha ' + FrotaBlq_s_(atual.ID) + ' (' + FrotaBlq_s_(atual.QUANDO) + '): o conteúdo não bate com o resumo gravado (linha alterada depois de registrada).');
    anterior = FrotaBlq_s_(atual.HASH);
    atual = porAnterior[anterior];
  }
  if (vistos < lista.length) problemas.push((lista.length - vistos) + ' linha(s) fora da corrente (linha apagada, incluída à mão ou alterada no resumo).');
  var ultimo = String(PropertiesService.getScriptProperties().getProperty(FBLQ_PROP_HASH) || 'INICIO');
  if (lista.length && anterior !== ultimo) problemas.push('O último resumo guardado não é o fim da corrente (linha do fim apagada ou alterada).');
  return { ok: !problemas.length, total: lista.length, problemas: problemas,
    texto: problemas.length ? 'Registro com problema: ' + problemas.join(' ') : 'Registro íntegro: ' + lista.length + ' linha(s) conferidas, nenhuma alterada ou apagada.' };
}

// ------------------------------------------------------------
// ÁREA DAS BASES (centro + raio, configurável pela gestão)
// ------------------------------------------------------------
function FrotaBlq_areas_() {
  try { var j = JSON.parse(PropertiesService.getScriptProperties().getProperty(FBLQ_PROP_AREAS) || '{}'); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; }
}
function FrotaBlq_distM_(a, b) {
  var rad = function (g) { return g * Math.PI / 180; };
  var dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * 6371008.8 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
/** Na base? { naBase: true|false|null, base, distanciaM, motivo }. null = sem posição ou nenhuma área configurada. */
function FrotaBlq_naBase_(pos, areas) {
  areas = areas || FrotaBlq_areas_();
  var nomes = Object.keys(areas).filter(function (k) { var a = areas[k]; return a && isFinite(Number(a.lat)) && isFinite(Number(a.lon)); });
  if (!nomes.length) return { naBase: null, motivo: 'nenhuma área de base configurada (Frota > Rastreamento > Bloqueio da partida > Áreas das bases)' };
  if (!pos || pos.lat === null || pos.lon === null || pos.lat === undefined) return { naBase: null, motivo: 'posição sem coordenadas' };
  var melhor = null;
  nomes.forEach(function (k) {
    var a = areas[k], d = FrotaBlq_distM_({ lat: Number(pos.lat), lon: Number(pos.lon) }, { lat: Number(a.lat), lon: Number(a.lon) });
    var raio = Number(a.raioM) > 0 ? Number(a.raioM) : FBLQ_RAIO_BASE_PADRAO_M;
    if (!melhor || d - raio < melhor.folga) melhor = { base: k, distanciaM: Math.round(d), raio: raio, folga: d - raio };
  });
  return { naBase: melhor.folga <= 0, base: melhor.base, distanciaM: melhor.distanciaM,
    motivo: melhor.folga <= 0 ? 'na base ' + melhor.base : 'fora das bases (a ' + Rastreador_num_(melhor.distanciaM, 0) + ' m do centro de ' + melhor.base + ', raio de ' + Rastreador_num_(melhor.raio, 0) + ' m)' };
}

// ------------------------------------------------------------
// REGRA (funções puras: as mesmas que os testes e o simulador conferem)
// ------------------------------------------------------------
/** Conectado agora: aparelho "online" na iTracker e último contato (lastUpdate) de até 2 minutos. Função pura. */
function FrotaBlq_conectado_(con, agoraMs, limiteMs) {
  return !!(con && con.online === true && con.ultimoMs && agoraMs - con.ultimoMs <= (limiteMs || FBLQ_POS_NO_MINUTO_MS));
}
function FrotaBlq_textoConexao_(con, agoraMs) {
  if (!con) return 'situação do aparelho desconhecida (lista de aparelhos da iTracker não lida)';
  var min = con.ultimoMs ? Math.max(0, Math.round((agoraMs - con.ultimoMs) / 60000)) : null;
  var quando = min === null ? 'sem registro de contato' : (min <= 1 ? 'último contato agora' : 'último contato há ' + (typeof Frota_duracaoTexto_ === 'function' ? Frota_duracaoTexto_(min) : min + ' min'));
  return (con.online ? 'aparelho online' : 'aparelho offline') + ', ' + quando;
}

/**
 * GET /devices (uma chamada para todos os aparelhos): mapa deviceId -> { online, ultimoMs, situacao }. A lista é guardada
 * por maxIdadeSeg (padrão 45 s) para não repetir a chamada na mesma rodada. null = a lista não pôde ser lida (desconhecido).
 * O casamento é só pelo ID do aparelho (o nome/placa cadastrado na iTracker não é usado: pode estar diferente do SGO+).
 */
function FrotaBlq_conexoes_(c, maxIdadeSeg) {
  var lim = (maxIdadeSeg === undefined ? 45 : maxIdadeSeg) * 1000;
  try { var g = JSON.parse(CacheService.getScriptCache().get(FBLQ_CON_CACHE) || 'null'); if (g && Date.now() - g.em <= lim) return g.mapa; } catch (e) {}
  if (!c.ligado || !Rastreador_temCredencial_(c)) return null;
  var lista;
  try { lista = Rastreador_lerDispositivos_(c, false); } catch (e2) { return null; }
  var mapa = {};
  (lista || []).forEach(function (d) { mapa[String(d.id)] = { online: String(d.situacao || '').toLowerCase() === 'online', ultimoMs: FrotaBlq_ms_(d.ultimaAtualizacao), situacao: String(d.situacao || '') }; });
  try { CacheService.getScriptCache().put(FBLQ_CON_CACHE, JSON.stringify({ em: Date.now(), mapa: mapa }), 300); } catch (e3) {}
  return mapa;
}
function FrotaBlq_conAgora_(c, veiculo) {
  var m = FrotaBlq_conexoes_(c, 45);
  return m ? m[FrotaBlq_s_(veiculo.RASTREADOR_DEVICE_ID)] || null : null;
}

/**
 * Pode ENVIAR bloqueio agora? Aparelho conectado agora (online e último contato de até 2 min) e a última posição parada,
 * com a ignição desligada. A posição pode ser antiga (economia do rastreador desligado): com o aparelho conectado, se o
 * carro ligasse ou andasse viria posição nova. Aparelho offline ou desconhecido = não.
 */
function FrotaBlq_seguro_(pos, agoraMs, con) {
  if (!con) return { ok: false, semSinal: true, motivo: 'a situação do aparelho na iTracker é desconhecida agora; o bloqueio só sai com o aparelho conectado' };
  if (con.online !== true) return { ok: false, semSinal: true, motivo: 'o aparelho está offline na iTracker (' + FrotaBlq_textoConexao_(con, agoraMs) + '); o bloqueio só sai com o aparelho conectado' };
  if (!FrotaBlq_conectado_(con, agoraMs)) return { ok: false, semSinal: true, motivo: 'o aparelho não fala com a iTracker há mais de 2 minutos (' + FrotaBlq_textoConexao_(con, agoraMs) + ')' };
  if (!pos) return { ok: false, motivo: 'o rastreador ainda não mandou posição deste veículo' };
  if (pos.kmh === null || pos.kmh === undefined || !isFinite(Number(pos.kmh))) return { ok: false, motivo: 'a posição não informa a velocidade' };
  if (Number(pos.kmh) >= FBLQ_PARADO_KMH || pos.movimento === true) return { ok: false, andando: true, motivo: 'o carro está andando (' + Rastreador_num_(pos.kmh, 0) + ' km/h)' };
  if (pos.ignicao !== false) return { ok: false, ligado: pos.ignicao === true, motivo: pos.ignicao === true ? 'a ignição está ligada' : 'o rastreador não informa a ignição' };
  return { ok: true, motivo: 'aparelho conectado (último contato ' + FrotaBlq_hhmm_(con.ultimoMs) + '), parado e com a ignição desligada (última posição ' + (pos.quandoTexto || FrotaBlq_txt_(pos.quandoMs)) + ')' };
}

/**
 * Decide o que fazer com o veículo agora. Função pura.
 * e = { agora, modo ('ATIVO'|'SIMULACAO'|'DESLIGADO'), triagem ('BLOQUEIO_ATIVO'|'SO_AVISA'|'SEM_DADOS'),
 *       aberta (retirada aberta), emergencia (liberação de emergência valendo), desdeRetiradaMs,
 *       pedido: null | { situacao: 'AGUARDANDO'|'AGUARDANDO_GESTAO'|'AUTORIZADO'|'NAO_BLOQUEAR', origem, desdeMs },
 *       pos, conexao: null | { online, ultimoMs } (GET /devices), naBase (true|false|null), rele ('BLOQUEADO'|'LIBERADO'|''),
 *       ultimo: null | { acao, emMs, resultado } }
 * Devolve { acao: 'LIBERAR'|'BLOQUEAR'|'', espera, decisaoGestao, soAvisa, conferencia }.
 */
function FrotaBlq_decidir_(e) {
  var nada = function (espera, x) { return Object.assign({ acao: '', espera: espera || '', decisaoGestao: false, soAvisa: false, conferencia: false }, x || {}); };
  if (e.modo === 'DESLIGADO') return nada('bloqueio desligado neste veículo');
  var u = e.ultimo || null;
  var semResultado = u && ['ENTREGUE', 'INCERTO', 'SIMULADO_PENDENTE'].indexOf(u.resultado) >= 0;
  var recente = function (acao) { return u && u.acao === acao && e.agora - u.emMs < FBLQ_SEM_REPETIR_MS && (semResultado || u.resultado === 'NA_FILA'); };
  var conectado = FrotaBlq_conectado_(e.conexao, e.agora);

  // 1) retirada aberta (ou emergência): liberado, sempre
  if (e.aberta || e.emergencia) {
    if (e.rele === 'LIBERADO') return nada('');
    if (u && u.acao === 'LIBERAR' && u.resultado === 'CONFIRMADO' && u.emMs >= (e.desdeRetiradaMs || 0) && e.rele !== 'BLOQUEADO') return nada('');
    if (recente('LIBERAR')) return nada('liberação enviada às ' + FrotaBlq_hhmm_(u.emMs) + ', aguardando o resultado');
    if (u && u.acao === 'LIBERAR' && u.resultado === 'NA_FILA' && !conectado) return nada('liberação aguardando sinal do carro (o comando está na fila do rastreador)');
    if (!e.rele && u && u.acao === 'LIBERAR' && u.emMs >= (e.desdeRetiradaMs || 0) && (u.resultado === 'ENTREGUE' || u.resultado === 'SEM_CONFIRMACAO')) return nada('liberação entregue ao aparelho (o rastreador não informa o relé)');
    return { acao: 'LIBERAR', espera: '', decisaoGestao: false, soAvisa: false, conferencia: !e.aberta && !e.emergencia };
  }
  // 2) sem retirada: bloqueio só com pedido (devolução, gestão) ou na conferência de carro liberado sem dono
  var p = e.pedido;
  if (p && p.situacao === 'NAO_BLOQUEAR') return nada('a gestão decidiu não bloquear até a próxima retirada');
  if (e.rele === 'BLOQUEADO') return nada('');
  var conferencia = !p;
  if (conferencia && e.rele !== 'LIBERADO') return nada('');
  var seg = FrotaBlq_seguro_(e.pos, e.agora, e.conexao);
  if (!seg.ok) return nada('aguardando: ' + seg.motivo);
  if (e.triagem === 'SO_AVISA') return nada('veículo em "Só avisa" (triagem do sinal): o SGO+ não envia bloqueio, só avisa a gestão', { soAvisa: true });
  var autorizado = p && p.situacao === 'AUTORIZADO';
  if (e.naBase !== true && !autorizado) {
    if (conferencia) return nada('fora da área da base: a conferência não bloqueia sozinha');
    return nada(e.naBase === false ? 'devolução fora da base: aguardando a decisão da gestão' : 'sem área de base configurada: aguardando a decisão da gestão', { decisaoGestao: true });
  }
  if (recente('BLOQUEAR')) return nada('bloqueio enviado às ' + FrotaBlq_hhmm_(u.emMs) + ', aguardando o resultado');
  if (!e.rele && p && u && u.acao === 'BLOQUEAR' && u.emMs >= (p.desdeMs || 0) && (u.resultado === 'ENTREGUE' || u.resultado === 'SEM_CONFIRMACAO')) return nada('bloqueio entregue ao aparelho (o rastreador não informa o relé)');
  return { acao: 'BLOQUEAR', espera: '', decisaoGestao: false, soAvisa: false, conferencia: conferencia, condicao: seg.motivo };
}

// ------------------------------------------------------------
// API DA iTRACKER (comandos, resultado, hodômetro)
// ------------------------------------------------------------
/** Limite da iTracker: no máximo FBLQ_LIMITE_MINUTO comandos por minuto, contando todas as execuções. */
function FrotaBlq_vez_() {
  try {
    var cache = CacheService.getScriptCache(), k = 'FBLQ_CMD_MIN_' + Math.floor(Date.now() / 60000);
    var n = Number(cache.get(k) || 0);
    if (n >= FBLQ_LIMITE_MINUTO) return false;
    cache.put(k, String(n + 1), 120);
  } catch (e) {}
  return true;
}

/** POST /commands. Nunca lança. { situacao: ENTREGUE|NA_FILA|FALHOU|INCERTO, http, motivo, resposta }. */
function FrotaBlq_enviarApi_(c, deviceId, acao) {
  if (!c.tokenComandos) return { situacao: 'FALHOU', http: 0, motivo: 'falta a chave de acesso dos comandos' };
  if (!FrotaBlq_vez_()) return { situacao: 'FALHOU', http: 0, motivo: 'limite de comandos por minuto do rastreador; a próxima rodada tenta de novo' };
  var dev = /^\d+$/.test(String(deviceId)) ? Number(deviceId) : String(deviceId);
  var res;
  try { res = Rastreador_chamar_(c, 'post', '/commands', [], { id: FBLQ_CMD_ID[acao], deviceId: dev }, { comando: true }); }
  catch (e) {
    // sem resposta: não se sabe se chegou. Não reenvia por 4 min e confere o relé.
    return { situacao: e && e.rastreadorRede ? 'INCERTO' : 'FALHOU', http: 0, motivo: Rastreador_limpar_(e && e.message, c) };
  }
  var h = res.http, txt = Rastreador_limpar_(String(res.txt || '').slice(0, 200), c);
  if (h === 200 || h === 201 || h === 204) return { situacao: 'ENTREGUE', http: h, resposta: txt, motivo: '' };
  if (h === 202) return { situacao: 'NA_FILA', http: h, resposta: txt, motivo: 'o carro está sem conexão: o comando ficou na fila do rastreador e só executa quando o carro reconectar (tratado como NÃO executado)' };
  var m = h === 401 ? 'a iTracker recusou a chave dos comandos (HTTP 401); grave a chave certa em Chaves e senhas > Rastreador da frota'
    : h === 403 ? 'a iTracker negou o comando (HTTP 403: chave sem permissão de comando ou chamada fora do IP do servidor)'
    : h === 429 ? 'limite de comandos da iTracker (HTTP 429); a próxima rodada tenta de novo'
    : h === 503 ? 'plataforma da iTracker indisponível (HTTP 503); a próxima rodada tenta de novo'
    : 'a iTracker respondeu HTTP ' + h + ' ao comando';
  return { situacao: 'FALHOU', http: h, resposta: txt, motivo: m };
}

/** GET /reports/events?type=commandResult do período. Devolve o texto do último resultado ou ''. Nunca lança. */
function FrotaBlq_resultadoApi_(c, deviceId, deMs, ateMs) {
  try {
    var res = Rastreador_chamar_(c, 'get', '/reports/events', [['deviceId', deviceId], ['type', 'commandResult'], ['from', new Date(deMs).toISOString()], ['to', new Date(ateMs).toISOString()]], undefined, { comando: !c.token });
    if (res.http < 200 || res.http >= 300) return '';
    var lista = Rastreador_lista_(res.j);
    var ult = lista.filter(function (x) { return x && x.attributes && x.attributes.result !== undefined; }).pop();
    return ult ? Rastreador_limpar_(String(ult.attributes.result), c).slice(0, 200) : '';
  } catch (e) { return ''; }
}

/** PUT /devices/<id>/accumulators. { ok, http, motivo }. */
function FrotaBlq_hodometroApi_(c, deviceId, km) {
  if (!c.tokenComandos) return { ok: false, motivo: 'falta a chave de acesso dos comandos (Chaves e senhas > Rastreador da frota)' };
  var dev = /^\d+$/.test(String(deviceId)) ? Number(deviceId) : String(deviceId);
  try {
    var res = Rastreador_chamar_(c, 'put', '/devices/' + encodeURIComponent(String(deviceId)) + '/accumulators', [], { deviceId: dev, totalDistance: Math.round(km * 1000) }, { comando: true });
    if (res.http === 204 || res.http === 200) return { ok: true, http: res.http };
    return { ok: false, http: res.http, motivo: 'a iTracker respondeu HTTP ' + res.http + (res.txt ? ' (' + Rastreador_limpar_(res.txt.slice(0, 160), c) + ')' : '') };
  } catch (e) { return { ok: false, motivo: Rastreador_limpar_(e && e.message, c) }; }
}

// ------------------------------------------------------------
// EXECUÇÃO (real ou simulada) — único ponto que fala com o relé
// ------------------------------------------------------------
/**
 * Executa a ação no veículo. modo = efetivo. Grava o estado e o registro. Devolve { situacao, texto, http }.
 * Em SIMULACAO nada sai do servidor: registra "teria bloqueado/liberado" e muda só o relé simulado.
 */
function FrotaBlq_executar_(c, veiculo, est, acao, o) {
  o = o || {};
  var agora = Date.now(), quem = o.quem || FBLQ_SISTEMA;
  var verbo = acao === 'BLOQUEAR' ? 'bloquear' : 'liberar';
  if (o.modo === 'SIMULACAO') {
    FrotaBlq_gravarEstado_(est, { RELE_SIMULADO: acao === 'BLOQUEAR' ? 'BLOQUEADO' : 'LIBERADO', RELE_SIMULADO_EM: new Date(agora).toISOString(),
      ULT_CMD_ACAO: acao, ULT_CMD_EM: new Date(agora).toISOString(), ULT_CMD_HTTP: '', ULT_CMD_RESULTADO: 'CONFIRMADO', ULT_CMD_REAL: 'NAO', ULT_CMD_CONSULTADO_EM: '', ULT_CMD_CONFIRMADO_EM: new Date(agora).toISOString(), ULT_CMD_MOV_ID: FrotaBlq_s_(o.movId) });
    FrotaBlq_evento_({ veiculo: veiculo, modo: 'SIMULACAO', tipo: 'SIMULACAO', acao: acao, origem: o.origem, quem: quem, movId: o.movId, condicao: o.condicao, resultado: 'TERIA_' + (acao === 'BLOQUEAR' ? 'BLOQUEADO' : 'LIBERADO'),
      detalhe: 'Simulação: o SGO+ teria mandado ' + verbo + ' a partida agora (' + (o.motivo || o.origem || '') + '). Nada foi enviado ao rastreador.' });
    return { situacao: 'SIMULADO', texto: 'Simulação: o SGO+ teria mandado ' + verbo + ' a partida (nada foi enviado ao carro).' };
  }
  var r = FrotaBlq_enviarApi_(c, FrotaBlq_s_(veiculo.RASTREADOR_DEVICE_ID), acao);
  var upd = { ULT_CMD_ACAO: acao, ULT_CMD_EM: new Date(agora).toISOString(), ULT_CMD_HTTP: r.http ? String(r.http) : '', ULT_CMD_RESULTADO: r.situacao, ULT_CMD_REAL: 'SIM',
    ULT_CMD_CONSULTADO_EM: '', ULT_CMD_CONFIRMADO_EM: '', ULT_CMD_MOV_ID: FrotaBlq_s_(o.movId) };
  if (r.situacao === 'FALHOU') { upd.ULT_CMD_ACAO = est.ULT_CMD_ACAO || ''; upd.ULT_CMD_EM = est.ULT_CMD_EM || ''; upd.ULT_CMD_RESULTADO = est.ULT_CMD_RESULTADO || ''; upd.ULT_CMD_REAL = est.ULT_CMD_REAL || ''; upd.ULT_CMD_MOV_ID = est.ULT_CMD_MOV_ID || ''; upd.ULT_CMD_CONFIRMADO_EM = est.ULT_CMD_CONFIRMADO_EM || ''; }
  FrotaBlq_gravarEstado_(est, upd);
  FrotaBlq_evento_({ veiculo: veiculo, modo: 'ATIVO', tipo: 'ENVIO', acao: acao, origem: o.origem, quem: quem, movId: o.movId, condicao: o.condicao, http: r.http, resposta: r.resposta, resultado: r.situacao,
    detalhe: (acao === 'BLOQUEAR' ? 'Bloqueio' : 'Liberação') + ' enviado ao rastreador (' + (o.motivo || o.origem || '') + '): ' +
      (r.situacao === 'ENTREGUE' ? 'entregue ao aparelho; o SGO+ confere o relé na próxima posição.' : r.situacao === 'NA_FILA' ? r.motivo + '.' : r.situacao === 'INCERTO' ? 'sem resposta da iTracker (' + r.motivo + '); o SGO+ confere o relé e não reenvia por 4 minutos.' : 'não enviado: ' + r.motivo + '.') });
  try { if (r.situacao === 'FALHOU' && /HTTP 5|indispon|limite/.test(r.motivo)) Rastreador_falhaConexao_(r.motivo); else if (r.situacao === 'ENTREGUE') Rastreador_conexaoOk_(); } catch (eC) {}
  if (r.situacao === 'NA_FILA' && acao === 'BLOQUEAR') {
    FrotaBlq_avisarGestao_('Bloqueio na fila do rastreador: ' + FrotaBlq_rotulo_(veiculo),
      'O bloqueio da partida do ' + FrotaBlq_rotulo_(veiculo) + ' foi aceito pela iTracker com o carro sem conexão (HTTP 202). Ele fica na fila e executa quando o carro reconectar.\n' +
      'O SGO+ trata como NÃO executado. Se alguém retirar o carro antes, o SGO+ manda a liberação logo em seguida. Confira o carro em Frota > Rastreamento > Bloqueio da partida.', FrotaBlq_s_(est.ID), 'S63');
  }
  return { situacao: r.situacao, http: r.http, motivo: r.motivo,
    texto: r.situacao === 'ENTREGUE' ? (acao === 'BLOQUEAR' ? 'Partida bloqueada pelo rastreador.' : 'Partida liberada pelo rastreador.')
      : r.situacao === 'NA_FILA' ? (acao === 'BLOQUEAR' ? 'Bloqueio aguardando sinal do carro.' : 'Liberação aguardando sinal do carro: o rastreador está sem conexão agora e libera quando o carro reconectar.')
      : r.situacao === 'INCERTO' ? 'Comando enviado sem resposta da iTracker; o SGO+ confere em seguida.' : (acao === 'BLOQUEAR' ? 'Bloqueio não enviado: ' : 'Liberação não enviada: ') + r.motivo + '.' };
}

// ------------------------------------------------------------
// AVISOS
// ------------------------------------------------------------
function FrotaBlq_avisarGestao_(titulo, texto, refId, evento) {
  if (typeof Rastreador_avisarGestao_ === 'function') Rastreador_avisarGestao_(titulo, texto, refId, evento);
}
function FrotaBlq_avisarUsuario_(uid, titulo, texto, refId, evento, canais) {
  if (!uid || typeof SGO_notificar_ !== 'function') return;
  try { SGO_notificar_({ usuarios: [uid], titulo: titulo, texto: texto, canais: canais || ['sgo', 'email'], origem: 'FROTA', refId: refId, evento: evento }); }
  catch (e) { console.error('Bloqueio, aviso: ' + ((e && e.message) || e)); }
}
function FrotaBlq_usuarioDoCondutor_(condutorId) {
  var c = condutorId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, condutorId) : null;
  return c ? FrotaBlq_s_(c.USUARIO_ID) : '';
}

// ------------------------------------------------------------
// ESTADO DO VEÍCULO PARA A REGRA
// ------------------------------------------------------------
function FrotaBlq_triagemVale_(est) {
  var m = FrotaBlq_s_(est.TRIAGEM_MANUAL).toUpperCase();
  if (m === 'BLOQUEIO_ATIVO' || m === 'SO_AVISA') return m;
  var t = FrotaBlq_s_(est.TRIAGEM).toUpperCase();
  return t === 'SO_AVISA' ? 'SO_AVISA' : (t === 'BLOQUEIO_ATIVO' ? 'BLOQUEIO_ATIVO' : 'SEM_DADOS');
}
function FrotaBlq_releDe_(est, modo) {
  return FrotaBlq_s_(modo === 'SIMULACAO' ? est.RELE_SIMULADO : est.RELE_REAL).toUpperCase();
}
function FrotaBlq_ultimo_(est, modo) {
  if (!FrotaBlq_s_(est.ULT_CMD_ACAO)) return null;
  // comando real não conta na simulação e vice-versa
  if ((modo === 'SIMULACAO') !== (FrotaBlq_s_(est.ULT_CMD_REAL) === 'NAO')) return null;
  return { acao: FrotaBlq_s_(est.ULT_CMD_ACAO).toUpperCase(), emMs: FrotaBlq_ms_(est.ULT_CMD_EM), resultado: FrotaBlq_s_(est.ULT_CMD_RESULTADO).toUpperCase() };
}
function FrotaBlq_pedidoDe_(est) {
  if (FrotaBlq_s_(est.PEDIDO_ACAO).toUpperCase() !== 'BLOQUEAR') return null;
  var s = FrotaBlq_s_(est.PEDIDO_SITUACAO).toUpperCase();
  if (['AGUARDANDO', 'AGUARDANDO_GESTAO', 'AUTORIZADO', 'NAO_BLOQUEAR'].indexOf(s) < 0) return null;
  return { situacao: s, origem: FrotaBlq_s_(est.PEDIDO_ORIGEM), desdeMs: FrotaBlq_ms_(est.PEDIDO_DESDE) };
}
function FrotaBlq_encerrarPedido_(est, veiculo, situacao, motivo, quem) {
  if (!FrotaBlq_s_(est.PEDIDO_ACAO)) return;
  var antes = FrotaBlq_s_(est.PEDIDO_SITUACAO);
  FrotaBlq_gravarEstado_(est, { PEDIDO_ACAO: '', PEDIDO_ORIGEM: '', PEDIDO_DESDE: '', PEDIDO_MOV_ID: '', PEDIDO_SITUACAO: '', PEDIDO_MOTIVO: '', PEDIDO_POR: '', PEDIDO_DECISAO_POR: '', PEDIDO_DECISAO_EM: '', PEDIDO_AVISADO_EM: '' });
  FrotaBlq_evento_({ veiculo: veiculo, modo: FrotaBlq_s_(est.MODO), tipo: situacao, acao: 'BLOQUEAR', origem: 'PEDIDO', quem: quem || FBLQ_SISTEMA, detalhe: 'Pedido de bloqueio (' + antes.toLowerCase() + ') encerrado: ' + motivo });
}
function FrotaBlq_novoPedido_(est, veiculo, origem, movId, quem, situacao, motivo) {
  FrotaBlq_gravarEstado_(est, { PEDIDO_ACAO: 'BLOQUEAR', PEDIDO_ORIGEM: origem, PEDIDO_DESDE: SGO_UTILS.nowIso(), PEDIDO_MOV_ID: FrotaBlq_s_(movId), PEDIDO_SITUACAO: situacao || 'AGUARDANDO',
    PEDIDO_MOTIVO: motivo || '', PEDIDO_POR: FrotaBlq_nome_(quem), PEDIDO_DECISAO_POR: '', PEDIDO_DECISAO_EM: '', PEDIDO_AVISADO_EM: '' });
  FrotaBlq_evento_({ veiculo: veiculo, modo: FrotaBlq_s_(est.MODO), tipo: 'PEDIDO', acao: 'BLOQUEAR', origem: origem, quem: quem, movId: movId, detalhe: 'Bloqueio pedido (' + origem.toLowerCase() + ')' + (motivo ? ': ' + motivo : '') + '.' });
}

/** Avalia e age (retirada, devolução, rotina, gestão). Devolve { decisao, exec }. */
function FrotaBlq_avaliar_(c, veiculo, est, ctx) {
  var me = FrotaBlq_modoEfetivo_(est.MODO, c);
  var agora = ctx.agora || Date.now();
  var areas = ctx.areas || FrotaBlq_areas_();
  var nb = FrotaBlq_naBase_(ctx.pos, areas);
  var e = { agora: agora, modo: me.modo, triagem: FrotaBlq_triagemVale_(est), aberta: !!ctx.aberta, emergencia: FrotaBlq_ms_(est.EMERGENCIA_ATE) > agora,
    desdeRetiradaMs: ctx.aberta ? (FrotaBlq_ms_(ctx.aberta.CRIADO_EM) || 0) : 0, pedido: FrotaBlq_pedidoDe_(est), pos: ctx.pos || null, naBase: nb.naBase,
    conexao: 'con' in ctx ? ctx.con : FrotaBlq_conAgora_(c, veiculo),
    rele: FrotaBlq_releDe_(est, me.modo), ultimo: FrotaBlq_ultimo_(est, me.modo) };
  var d = FrotaBlq_decidir_(e);
  var out = { decisao: d, modo: me, naBase: nb, exec: null };
  if (d.acao) {
    var origem = d.acao === 'LIBERAR' ? (ctx.origem || (e.aberta ? 'CONFERENCIA_RETIRADA' : 'EMERGENCIA')) : (d.conferencia ? 'CONFERENCIA' : (e.pedido ? e.pedido.origem : 'CONFERENCIA'));
    if (d.acao === 'BLOQUEAR' && d.conferencia) FrotaBlq_novoPedido_(est, veiculo, 'CONFERENCIA', '', FBLQ_SISTEMA, 'AGUARDANDO', 'carro sem retirada e com a partida liberada (conferência de 2 minutos)');
    out.exec = FrotaBlq_executar_(c, veiculo, est, d.acao, { modo: me.modo, origem: origem, quem: ctx.quem, movId: ctx.aberta ? ctx.aberta.ID : FrotaBlq_s_(est.PEDIDO_MOV_ID),
      condicao: d.acao === 'BLOQUEAR' ? d.condicao + '; ' + nb.motivo : (ctx.pos ? 'posição das ' + FrotaBlq_hhmm_(ctx.pos.quandoMs) : 'sem posição'), motivo: ctx.motivo || origem.toLowerCase().replace(/_/g, ' ') });
    if (d.acao === 'BLOQUEAR' && out.exec.situacao === 'SIMULADO') FrotaBlq_encerrarPedido_(est, veiculo, 'CONFIRMADO', 'simulação: o SGO+ teria bloqueado agora', FBLQ_SISTEMA);
    else if (d.acao === 'BLOQUEAR' && out.exec.situacao !== 'FALHOU') FrotaBlq_gravarEstado_(est, { PEDIDO_MOTIVO: 'Enviado às ' + FrotaBlq_hhmm_(Date.now()) + '; conferindo o relé.' });
  } else if (est.PEDIDO_ACAO) {
    FrotaBlq_gravarEstado_(est, { PEDIDO_MOTIVO: d.espera ? d.espera.charAt(0).toUpperCase() + d.espera.slice(1) + '.' : est.PEDIDO_MOTIVO });
    if (d.decisaoGestao && FrotaBlq_s_(est.PEDIDO_SITUACAO) === 'AGUARDANDO') {
      FrotaBlq_gravarEstado_(est, { PEDIDO_SITUACAO: 'AGUARDANDO_GESTAO', PEDIDO_AVISADO_EM: SGO_UTILS.nowIso() });
      FrotaBlq_evento_({ veiculo: veiculo, modo: me.modo, tipo: 'DECISAO', acao: 'BLOQUEAR', origem: 'FORA_DA_BASE', quem: FBLQ_SISTEMA, movId: est.PEDIDO_MOV_ID, condicao: nb.motivo,
        detalhe: 'Devolução fora da base: o SGO+ não bloqueia sozinho; a gestão decide na Caixa de decisões.' });
      FrotaBlq_avisarGestao_('Decidir o bloqueio: ' + FrotaBlq_rotulo_(veiculo) + (nb.naBase === false ? ' devolvido fora da base' : ' devolvido (área da base não configurada)'),
        'O ' + FrotaBlq_rotulo_(veiculo) + ' foi devolvido: ' + nb.motivo + '. O SGO+ não bloqueia sozinho fora da área da base.\n' +
        'Decida em Caixa de decisões ou em Frota > Rastreamento > Bloqueio da partida: "Bloquear" (só sai com o carro conectado, parado e desligado) ou "Não bloquear" (vale até a próxima retirada).', FrotaBlq_s_(est.ID), 'S60');
    }
    if (d.soAvisa && !FrotaBlq_s_(est.PEDIDO_AVISADO_EM)) {
      FrotaBlq_gravarEstado_(est, { PEDIDO_AVISADO_EM: SGO_UTILS.nowIso() });
      FrotaBlq_evento_({ veiculo: veiculo, modo: me.modo, tipo: 'AVISO', acao: 'BLOQUEAR', origem: 'SO_AVISA', quem: FBLQ_SISTEMA, movId: est.PEDIDO_MOV_ID, detalhe: 'Carro devolvido em "Só avisa": o bloqueio não é enviado (o sinal deste carro cai onde ele costuma ficar). A chave fica sob a guarda da base.' });
    }
  }
  return out;
}

// ------------------------------------------------------------
// GANCHOS DA RETIRADA E DA DEVOLUÇÃO (chamados por SGO_Frota_Rastreador.js; nunca lançam)
// ------------------------------------------------------------
function FrotaBlq_aoRetirar_(c, sessao, veiculo, mov, pos) {
  try {
    FrotaBlq_bootstrapSemTrava_();
    var est = FrotaBlq_estadoDe_(veiculo);
    // nova retirada: pedido de bloqueio que ainda não saiu não vale mais (regra 2); esquecida recomeça
    if (est.PEDIDO_ACAO) FrotaBlq_encerrarPedido_(est, veiculo, 'CANCELADO', 'nova retirada registrada antes de o bloqueio sair', sessao);
    FrotaBlq_gravarEstado_(est, { ESQ_MOV_ID: '', ESQ_PARADO_DESDE: '', ESQ_PERGUNTA_EM: '', ESQ_RESPOSTA: '', ESQ_RESPOSTA_EM: '', ESQ_GESTAO_EM: '', LIB_SINAL_AVISO_MOV_ID: '' });
    var me = FrotaBlq_modoEfetivo_(est.MODO, c);
    if (me.modo === 'DESLIGADO') return { ativo: false, modo: 'DESLIGADO', texto: '' };
    var u = FrotaBlq_ultimo_(est, me.modo);
    // retirada sempre libera (exceto liberação idêntica há menos de 4 min sem resultado: não repetir em sequência)
    var exec;
    if (u && u.acao === 'LIBERAR' && Date.now() - u.emMs < FBLQ_SEM_REPETIR_MS && ['ENTREGUE', 'INCERTO', 'NA_FILA'].indexOf(u.resultado) >= 0) {
      exec = { situacao: u.resultado, texto: 'Liberação já enviada às ' + FrotaBlq_hhmm_(u.emMs) + '; o SGO+ confere o relé.' };
    } else {
      exec = FrotaBlq_executar_(c, veiculo, est, 'LIBERAR', { modo: me.modo, origem: 'RETIRADA', quem: sessao, movId: mov.ID, condicao: pos ? 'posição das ' + FrotaBlq_hhmm_(pos.quandoMs) : 'sem posição', motivo: 'retirada registrada' });
    }
    var out = { ativo: true, modo: me.modo, situacao: exec.situacao, texto: exec.texto, liberado: exec.situacao === 'ENTREGUE' || exec.situacao === 'SIMULADO' || exec.situacao === 'CONFIRMADO' };
    if (exec.situacao === 'NA_FILA' || exec.situacao === 'FALHOU') {
      FrotaBlq_avisoLiberacaoSemSinal_(veiculo, est, mov, exec);
      out.aviso = exec.situacao === 'NA_FILA'
        ? 'Liberação aguardando sinal do carro: o rastreador está sem conexão agora. Ligue o carro em alguns minutos; se não pegar, fale com a gestão (ela pode usar "Liberar agora").'
        : 'Partida não liberada agora (' + exec.motivo + '). O SGO+ tenta de novo a cada 2 minutos; se precisar sair já, fale com a gestão.';
    }
    if (me.motivo) out.observacao = me.motivo;
    return out;
  } catch (e) {
    console.error('Bloqueio na retirada: ' + Rastreador_limpar_(e && e.message, c));
    return { ativo: true, liberado: false, aviso: 'Partida: falha interna do SGO+ ao liberar (' + Rastreador_limpar_(e && e.message, c) + '). Se o carro não pegar, fale com a gestão.' };
  }
}

function FrotaBlq_avisoLiberacaoSemSinal_(veiculo, est, mov, exec) {
  if (FrotaBlq_s_(est.LIB_SINAL_AVISO_MOV_ID) === FrotaBlq_s_(mov.ID)) return;
  FrotaBlq_gravarEstado_(est, { LIB_SINAL_AVISO_MOV_ID: FrotaBlq_s_(mov.ID) });
  var condUid = FrotaBlq_usuarioDoCondutor_(FrotaBlq_s_(mov.CONDUTOR_ID));
  var rot = FrotaBlq_rotulo_(veiculo);
  FrotaBlq_avisarGestao_('Liberação aguardando sinal: ' + rot,
    'A retirada do ' + rot + ' foi registrada, mas a liberação da partida não chegou ao carro (' + (exec.motivo || 'sem conexão') + ').\n' +
    'O SGO+ confere a cada 2 minutos. Se o condutor precisar sair já, use "Liberar agora" em Frota > Rastreamento > Bloqueio da partida (com o motivo) ou a central da iTracker.', FrotaBlq_s_(mov.ID), 'S36');
  FrotaBlq_avisarUsuario_(condUid, 'Liberação aguardando sinal: ' + rot,
    'A sua retirada do ' + rot + ' está registrada. O rastreador ainda não recebeu a liberação (carro sem conexão). Tente ligar em alguns minutos; se não pegar, fale com a gestão.', FrotaBlq_s_(mov.ID), 'S59', ['sgo']);
}

/** Devolução: pede o bloqueio (fora da base = decisão da gestão) e tenta já, com a posição lida na hora. */
function FrotaBlq_aoDevolver_(c, sessao, veiculo, mov, pos, pelaGestao) {
  try {
    FrotaBlq_bootstrapSemTrava_();
    var est = FrotaBlq_estadoDe_(veiculo);
    FrotaBlq_gravarEstado_(est, { EMERGENCIA_ATE: '', EMERGENCIA_MOTIVO: '', EMERGENCIA_POR: '', ESQ_MOV_ID: '', ESQ_PARADO_DESDE: '', ESQ_PERGUNTA_EM: '', ESQ_RESPOSTA: '', ESQ_RESPOSTA_EM: '', ESQ_GESTAO_EM: '' });
    try { FrotaBlq_conferirOdometro_(veiculo, est, mov, pos); } catch (eO) { console.error('Bloqueio, odômetro: ' + ((eO && eO.message) || eO)); }
    var me = FrotaBlq_modoEfetivo_(est.MODO, c);
    if (me.modo === 'DESLIGADO') return { ativo: false, modo: 'DESLIGADO', texto: '' };
    var nb = FrotaBlq_naBase_(pos);
    var origem = pelaGestao ? 'DEVOLUCAO_GESTAO' : 'DEVOLUCAO';
    FrotaBlq_novoPedido_(est, veiculo, origem, mov.ID, sessao, 'AGUARDANDO', nb.motivo);
    var r = FrotaBlq_avaliar_(c, veiculo, est, { pos: pos, aberta: null, quem: sessao, origem: origem });
    var pref = me.modo === 'SIMULACAO' ? 'Simulação: ' : '';
    var texto;
    if (r.exec) texto = r.exec.texto;
    else if (r.decisao.decisaoGestao) texto = pref + 'Devolução fora da base: o bloqueio da partida aguarda a decisão da gestão.';
    else if (r.decisao.soAvisa) texto = pref + 'Este carro está em "Só avisa": o bloqueio não é enviado. Deixe a chave no local combinado.';
    else texto = pref + 'Bloqueio da partida pedido: sai assim que o rastreador mostrar o carro conectado, parado e desligado (' + (r.decisao.espera || 'aguardando') + ').';
    return { ativo: true, modo: me.modo, bloqueado: !!(r.exec && (r.exec.situacao === 'ENTREGUE' || r.exec.situacao === 'SIMULADO')), texto: texto };
  } catch (e) {
    console.error('Bloqueio na devolução: ' + Rastreador_limpar_(e && e.message, c));
    return { ativo: true, bloqueado: false, texto: 'Bloqueio da partida: o pedido não foi registrado por uma falha interna; a conferência de 2 minutos tenta de novo.' };
  }
}

/**
 * Regra 2: só devolve com o carro desligado e parado. Recusa só quando o rastreador mostra, numa posição de até
 * 3 minutos, o carro ligado ou andando. Sem sinal, a devolução passa (o bloqueio espera o carro desligado).
 */
function FrotaBlq_conferirDevolucao_(veiculo) {
  var c = Rastreador_cfg_();
  if (!c.ligado || !Rastreador_temCredencial_(c)) return null;
  var dev = FrotaBlq_s_(veiculo && veiculo.RASTREADOR_DEVICE_ID);
  if (!dev) return null;
  var est = FrotaBlq_estados_()[FrotaBlq_s_(veiculo.ID)];
  if (est && FrotaBlq_s_(est.MODO).toUpperCase() === 'DESLIGADO') return null;
  var pos = null;
  try { pos = Rastreador_lerPosicoes_(c, dev, { aceitarCacheSeg: 60 })[dev] || null; } catch (e) { return null; }
  if (!pos || !pos.quandoMs || Date.now() - pos.quandoMs > 3 * 60000) return null;
  var andando = (pos.kmh !== null && Number(pos.kmh) >= FBLQ_PARADO_KMH) || pos.movimento === true;
  if (!andando && pos.ignicao !== true) return null;
  throw new Error('Devolução não registrada: o rastreador mostra o ' + FrotaBlq_rotulo_(veiculo) + (andando ? ' andando (' + Rastreador_num_(pos.kmh, 0) + ' km/h)' : ' com a ignição ligada') + ' às ' + FrotaBlq_hhmm_(pos.quandoMs) + '. ' +
    'Por segurança só se devolve com o carro parado e DESLIGADO (o bloqueio da partida sai depois da devolução). Estacione, desligue o carro, espere 1 minuto e toque em Confirmar de novo. ' +
    'Se outra pessoa vai seguir com o carro, use "Passar o carro" em vez de devolver.');
}

// ------------------------------------------------------------
// ROTINA (chamada pela rodada do rastreador, a cada 2 minutos, depois de ler /positions)
// ------------------------------------------------------------
function FrotaBlq_rodada_(c, posicoes, veiculos, movs, inicio) {
  var out = { enviados: [], simulados: [], esperando: [], erros: 0 };
  try {
    FrotaBlq_bootstrapSemTrava_();
    FrotaBlq_migrarAntigo_();
    var estados = FrotaBlq_estados_();
    FrotaBlq_migrarTriagemConexao_(estados);
    // uma leitura do /devices por rodada, para todos (situação e último contato de cada aparelho)
    var conexoes = FrotaBlq_conexoes_(c, 45);
    var areas = FrotaBlq_areas_();
    var abertas = {};
    (movs || []).forEach(function (m) { if (Frota_movimentoAberto_(m)) abertas[FrotaBlq_s_(m.VEICULO_ID)] = m; });
    var agora = Date.now();
    (veiculos || []).forEach(function (v) {
      var dev = FrotaBlq_s_(v.RASTREADOR_DEVICE_ID);
      if (!dev || FrotaBlq_s_(v.STATUS).toUpperCase() === 'INATIVO') return;
      if (Date.now() - (inicio || agora) > 50000) return;
      try {
        var est = FrotaBlq_estadoDe_(v, estados);
        if (FrotaBlq_s_(est.DEVICE_ID) !== dev) FrotaBlq_gravarEstado_(est, { DEVICE_ID: dev, PLACA: FrotaBlq_s_(v.PLACA) });
        var pos = posicoes ? posicoes[dev] || null : null;
        var aberta = abertas[FrotaBlq_s_(v.ID)] || null;
        var con = conexoes ? conexoes[dev] || null : null;
        FrotaBlq_registrarConexao_(v, est, con, pos, agora, !!conexoes);
        FrotaBlq_atualizarRele_(c, v, est, pos, agora);
        if (aberta && est.PEDIDO_ACAO) FrotaBlq_encerrarPedido_(est, v, 'CANCELADO', 'retirada aberta (registrada pelo celular depois)', FBLQ_SISTEMA);
        if (!aberta && FrotaBlq_ms_(est.EMERGENCIA_ATE) && FrotaBlq_ms_(est.EMERGENCIA_ATE) <= agora) {
          FrotaBlq_gravarEstado_(est, { EMERGENCIA_ATE: '', EMERGENCIA_MOTIVO: '', EMERGENCIA_POR: '' });
          FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'EMERGENCIA', acao: 'FIM', origem: 'PRAZO', quem: FBLQ_SISTEMA, detalhe: 'Liberação de emergência venceu (' + FBLQ_EMERGENCIA_HORAS + ' h) sem retirada: o carro volta à regra normal.' });
        }
        if (aberta) FrotaBlq_esquecida_(c, v, est, aberta, pos, areas, agora, con);
        var r = FrotaBlq_avaliar_(c, v, est, { pos: pos, con: con, aberta: aberta, quem: FBLQ_SISTEMA, areas: areas, agora: agora, origem: aberta ? 'CONFERENCIA_RETIRADA' : '' });
        if (r.exec) (r.exec.situacao === 'SIMULADO' ? out.simulados : out.enviados).push(r.decisao.acao + ' ' + FrotaBlq_rotulo_(v));
        else if (r.decisao.espera && est.PEDIDO_ACAO) out.esperando.push(FrotaBlq_rotulo_(v) + ': ' + r.decisao.espera);
        if (aberta && r.exec && (r.exec.situacao === 'NA_FILA' || r.exec.situacao === 'FALHOU')) FrotaBlq_avisoLiberacaoSemSinal_(v, est, aberta, r.exec);
      } catch (eV) { out.erros++; console.error('Bloqueio, rodada (' + FrotaBlq_s_(v.PLACA) + '): ' + ((eV && eV.message) || eV)); }
    });
    try { FrotaBlq_triagemDiaria_(veiculos, estados); } catch (eT) { console.error('Bloqueio, triagem: ' + ((eT && eT.message) || eT)); }
    try { FrotaBlq_relatorioDiario_(); } catch (eR) { console.error('Bloqueio, relatório: ' + ((eR && eR.message) || eR)); }
  } catch (e) { out.erros++; console.error('Bloqueio, rodada: ' + ((e && e.message) || e)); }
  return out;
}

/** Relé real pela posição (attributes.blocked) e confirmação do último comando. */
function FrotaBlq_atualizarRele_(c, v, est, pos, agora) {
  var upd = {};
  var ult = FrotaBlq_ultimo_(est, 'ATIVO');
  if (pos && pos.bloqueado !== null && pos.bloqueado !== undefined) {
    var rele = pos.bloqueado ? 'BLOQUEADO' : 'LIBERADO';
    if (rele !== FrotaBlq_s_(est.RELE_REAL)) {
      FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'CONFIRMACAO', acao: rele, origem: 'POSICAO', quem: FBLQ_SISTEMA, condicao: 'posição das ' + FrotaBlq_hhmm_(pos.quandoMs),
        detalhe: 'O rastreador informa a partida ' + (rele === 'BLOQUEADO' ? 'BLOQUEADA' : 'LIBERADA') + ' (relé lido na posição).' });
    }
    upd.RELE_REAL = rele; upd.RELE_REAL_EM = new Date(pos.quandoMs || agora).toISOString();
    // simulação começa do relé real quando ainda não tem estado próprio
    if (!FrotaBlq_s_(est.RELE_SIMULADO)) upd.RELE_SIMULADO = rele;
    if (ult && ['ENTREGUE', 'INCERTO', 'NA_FILA'].indexOf(ult.resultado) >= 0 && pos.quandoMs > ult.emMs && rele === (ult.acao === 'BLOQUEAR' ? 'BLOQUEADO' : 'LIBERADO')) {
      upd.ULT_CMD_RESULTADO = 'CONFIRMADO'; upd.ULT_CMD_CONFIRMADO_EM = new Date(pos.quandoMs).toISOString();
      if (ult.acao === 'BLOQUEAR' && est.PEDIDO_ACAO) FrotaBlq_encerrarPedido_(est, v, 'CONFIRMADO', 'bloqueio confirmado pelo relé', FBLQ_SISTEMA);
    }
  }
  if (ult && ult.resultado === 'ENTREGUE' && !upd.ULT_CMD_RESULTADO) {
    var idade = agora - ult.emMs;
    if (idade >= 60000 && !FrotaBlq_s_(est.ULT_CMD_CONSULTADO_EM) && idade < FBLQ_SEM_CONFIRMACAO_MS) {
      var res = FrotaBlq_resultadoApi_(c, FrotaBlq_s_(v.RASTREADOR_DEVICE_ID), ult.emMs - 60000, agora);
      upd.ULT_CMD_CONSULTADO_EM = new Date(agora).toISOString();
      if (res) FrotaBlq_evento_({ veiculo: v, modo: 'ATIVO', tipo: 'CONFIRMACAO', acao: ult.acao, origem: 'COMMAND_RESULT', quem: FBLQ_SISTEMA, resposta: res, detalhe: 'Resultado do comando informado pelo aparelho: ' + res + '.' });
    } else if (idade >= FBLQ_SEM_CONFIRMACAO_MS) {
      upd.ULT_CMD_RESULTADO = 'SEM_CONFIRMACAO';
      FrotaBlq_evento_({ veiculo: v, modo: 'ATIVO', tipo: 'AVISO', acao: ult.acao, origem: 'CONFERENCIA', quem: FBLQ_SISTEMA, detalhe: 'Comando entregue sem confirmação do relé em 10 minutos; a conferência pode reenviar nas condições seguras.' });
    }
  }
  if (Object.keys(upd).length) FrotaBlq_gravarEstado_(est, upd);
}

/** Regra 5: retirada esquecida. */
function FrotaBlq_esquecida_(c, v, est, aberta, pos, areas, agora, con) {
  var movId = FrotaBlq_s_(aberta.ID);
  if (FrotaBlq_s_(est.ESQ_MOV_ID) !== movId) FrotaBlq_gravarEstado_(est, { ESQ_MOV_ID: movId, ESQ_PARADO_DESDE: '', ESQ_PERGUNTA_EM: '', ESQ_RESPOSTA: '', ESQ_RESPOSTA_EM: '', ESQ_GESTAO_EM: '' });
  // com o carro desligado a posição pode ser antiga (economia do rastreador): vale o aparelho conectado agora.
  // Aparelho offline ou desconhecido: não se sabe, nada muda nesta rodada.
  if (!pos || !pos.quandoMs || !FrotaBlq_conectado_(con, agora)) return;
  var parado = pos.ignicao === false && (pos.kmh === null || Number(pos.kmh) < FBLQ_PARADO_KMH) && pos.movimento !== true;
  var nb = FrotaBlq_naBase_(pos, areas);
  if (!parado || nb.naBase !== true) {
    // andou (ou saiu da base): a contagem recomeça; quem respondeu "Continuar" pode ser perguntado de novo depois
    if (FrotaBlq_s_(est.ESQ_PARADO_DESDE) || FrotaBlq_s_(est.ESQ_RESPOSTA)) FrotaBlq_gravarEstado_(est, { ESQ_PARADO_DESDE: '', ESQ_PERGUNTA_EM: '', ESQ_RESPOSTA: '', ESQ_RESPOSTA_EM: '', ESQ_GESTAO_EM: '' });
    return;
  }
  if (!FrotaBlq_s_(est.ESQ_PARADO_DESDE)) { FrotaBlq_gravarEstado_(est, { ESQ_PARADO_DESDE: new Date(pos.quandoMs).toISOString() }); return; }
  if (FrotaBlq_s_(est.ESQ_RESPOSTA) === 'CONTINUAR') return;
  var parado1h = agora - FrotaBlq_ms_(est.ESQ_PARADO_DESDE) >= FBLQ_ESQ_PARADO_MIN * 60000;
  var rot = FrotaBlq_rotulo_(v);
  if (parado1h && !FrotaBlq_s_(est.ESQ_PERGUNTA_EM)) {
    FrotaBlq_gravarEstado_(est, { ESQ_PERGUNTA_EM: new Date(agora).toISOString() });
    FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'AVISO', acao: 'PERGUNTA', origem: 'ESQUECIDA', quem: FBLQ_SISTEMA, movId: movId, condicao: nb.motivo + ', parado e desligado desde ' + FrotaBlq_hhmm_(FrotaBlq_ms_(est.ESQ_PARADO_DESDE)),
      detalhe: 'Carro parado na base há 1 hora com a retirada aberta: o SGO+ perguntou ao condutor se ainda está com o carro.' });
    FrotaBlq_avisarUsuario_(FrotaBlq_usuarioDoCondutor_(FrotaBlq_s_(aberta.CONDUTOR_ID)), 'Você ainda está com o ' + rot + '?',
      'O ' + rot + ' está parado na base há 1 hora e a retirada continua aberta no seu nome. Abra a Frota no SGO+ e toque em "Devolver" (se já terminou) ou "Continuar" (se ainda vai usar).', movId, 'S61', ['sgo']);
    return;
  }
  if (FrotaBlq_s_(est.ESQ_PERGUNTA_EM) && !FrotaBlq_s_(est.ESQ_GESTAO_EM) && agora - FrotaBlq_ms_(est.ESQ_PERGUNTA_EM) >= FBLQ_ESQ_RESPOSTA_MIN * 60000) {
    FrotaBlq_gravarEstado_(est, { ESQ_GESTAO_EM: new Date(agora).toISOString() });
    FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'DECISAO', acao: 'ESQUECIDA', origem: 'ESQUECIDA', quem: FBLQ_SISTEMA, movId: movId, detalhe: 'Condutor não respondeu em 1 hora: retirada esquecida vai para a Caixa de decisões da gestão.' });
    FrotaBlq_avisarGestao_('Retirada esquecida: ' + rot, 'O ' + rot + ' está parado na base há mais de 2 horas com a retirada aberta e o condutor não respondeu à pergunta do SGO+.\n' +
      'Em Caixa de decisões ou em Frota > Rastreamento > Bloqueio da partida: "Encerrar a retirada" (só com o carro parado, desligado, na base e com sinal; depois o bloqueio é pedido) ou passe a retirada para quem precisa do carro.', movId, 'S62');
  }
}

/** Uma vez: pedidos pendentes do caminho antigo (REG_FROTA_RASTREADOR_COMANDOS) são encerrados — a regra nova manda. */
function FrotaBlq_migrarAntigo_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(FBLQ_PROP_MIGRADO)) return;
  props.setProperty(FBLQ_PROP_MIGRADO, SGO_UTILS.nowIso());
  try { if (typeof Rastreador_pendentes_ === 'function') Rastreador_pendentes_().forEach(function (cmd) { Rastreador_encerrar_(cmd, 'CANCELADO', 'Substituído pela regra nova do bloqueio da partida (21/10/2026).'); }); } catch (e) {}
}

// ------------------------------------------------------------
// TRIAGEM DO SINAL (regra 10)
// ------------------------------------------------------------
/** Estacionado = ignição desligada e menos de 20 km/h (oscilação do GPS), como em FrotaR_parado_. */
function FrotaBlq_estacionado_(p) {
  return p && p.ignicao === false && (p.kmh === null || p.kmh === undefined || Number(p.kmh) < 20);
}
function FrotaBlq_celula_(lat, lon) { return (Math.round(Number(lat) * 1000) / 1000).toFixed(3) + ',' + (Math.round(Number(lon) * 1000) / 1000).toFixed(3); }

function FrotaBlq_lerResumoConexao_(est) {
  var r = null;
  try { r = JSON.parse(FrotaBlq_s_(est.CON_RESUMO) || 'null'); } catch (e) { r = null; }
  if (!r || typeof r !== 'object' || !r.dias) r = { dias: {}, end: {} };
  r.end = r.end || {};
  return r;
}

/**
 * Uma amostra de conexão por rodada (2 min), por aparelho. Fica no próprio estado do veículo (CON_RESUMO), como resumo por
 * dia e por local de estacionamento: [amostras, conectadas, reconexões, soma dos minutos até reconectar, maior]. Só os
 * últimos 14 dias e no máximo 12 locais por dia: o tamanho não cresce. Sem a lista de aparelhos (falha da iTracker ou do
 * servidor) não há amostra: falha da plataforma não é falta de sinal do carro.
 */
function FrotaBlq_registrarConexao_(v, est, con, pos, agora, leituraOk) {
  if (!leituraOk) return;
  var on = FrotaBlq_conectado_(con, agora, FBLQ_CON_TRIAGEM_MS);
  var r = FrotaBlq_lerResumoConexao_(est);
  var dia = Utilities.formatDate(new Date(agora), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var cel = FrotaBlq_estacionado_(pos) && pos.lat !== null && pos.lat !== undefined ? FrotaBlq_celula_(pos.lat, pos.lon) : 'EM_USO';
  if (cel !== 'EM_USO' && pos.endereco) r.end[cel] = String(pos.endereco).slice(0, 80);
  var d = r.dias[dia] || (r.dias[dia] = {});
  var x = d[cel] || (d[cel] = [0, 0, 0, 0, 0]);
  x[0]++; if (on) x[1]++;
  var upd = { CON_ONLINE: con ? (con.online ? 'SIM' : 'NAO') : 'DESCONHECIDO', CON_ULTIMO_EM: con && con.ultimoMs ? new Date(con.ultimoMs).toISOString() : '' };
  var offDesde = FrotaBlq_ms_(est.CON_OFF_DESDE);
  if (!on && !offDesde) upd.CON_OFF_DESDE = new Date(con && con.ultimoMs ? Math.min(con.ultimoMs, agora) : agora).toISOString();
  if (on && offDesde) {
    var rec = Math.round((agora - offDesde) / 6000) / 10;
    x[2]++; x[3] = Math.round((x[3] + rec) * 10) / 10; x[4] = Math.max(x[4], rec);
    upd.CON_OFF_DESDE = '';
  }
  var dias = Object.keys(r.dias).sort();
  while (dias.length > FBLQ_CON_DIAS) delete r.dias[dias.shift()];
  Object.keys(r.dias).forEach(function (k) {
    var cs = Object.keys(r.dias[k]);
    if (cs.length > 12) cs.sort(function (a, b) { return r.dias[k][b][0] - r.dias[k][a][0]; }).slice(12).forEach(function (cc) { delete r.dias[k][cc]; });
  });
  var vivos = {};
  Object.keys(r.dias).forEach(function (k) { Object.keys(r.dias[k]).forEach(function (cc) { vivos[cc] = 1; }); });
  Object.keys(r.end).forEach(function (cc) { if (!vivos[cc]) delete r.end[cc]; });
  if (!FrotaBlq_s_(est.CON_INICIO)) upd.CON_INICIO = new Date(agora).toISOString();
  upd.CON_RESUMO = JSON.stringify(r);
  FrotaBlq_gravarEstado_(est, upd);
}

/**
 * Resumo de conexão -> classificação do veículo. Função pura. Até 24 h de histórico novo: SEM_DADOS (vale a regra normal,
 * bloqueio só com o aparelho conectado, parado e desligado). Local frequente (3 h ou mais de carro parado) com menos de
 * 80% do tempo conectado, ou que demora em média mais de 30 min para reconectar = "Só avisa".
 */
function FrotaBlq_classificarConexao_(r, inicioIso, agoraMs) {
  var inicio = FrotaBlq_ms_(inicioIso);
  var horasHist = inicio ? (agoraMs - inicio) / 3600000 : 0;
  if (!inicio || horasHist < 24) {
    return { triagem: 'SEM_DADOS', locais: [], motivo: 'histórico de conexão do aparelho com ' + Rastreador_num_(Math.max(0, horasHist), 0) + ' h (a triagem precisa de 24 h). Até lá vale a regra normal: o bloqueio só sai com o aparelho conectado agora, o carro parado e desligado.' };
  }
  var cels = {};
  Object.keys((r && r.dias) || {}).forEach(function (dia) {
    Object.keys(r.dias[dia]).forEach(function (cel) {
      if (cel === 'EM_USO') return;
      var x = r.dias[dia][cel], a = cels[cel] || (cels[cel] = [0, 0, 0, 0, 0]);
      a[0] += x[0]; a[1] += x[1]; a[2] += x[2]; a[3] += x[3]; a[4] = Math.max(a[4], x[4]);
    });
  });
  var total = Object.keys(cels).reduce(function (s, k) { return s + cels[k][0]; }, 0);
  if (total < 30) return { triagem: 'SEM_DADOS', locais: [], motivo: 'o carro ficou pouco tempo estacionado com o aparelho acompanhado (' + Rastreador_num_(total * 2 / 60, 1) + ' h). Até lá vale a regra normal.' };
  var lista = Object.keys(cels).map(function (k) {
    var a = cels[k], pct = a[0] ? a[1] / a[0] : 1, rec = a[2] ? a[3] / a[2] : 0, parte = a[0] / total;
    var frequente = a[0] >= 90;
    var ruim = frequente && parte >= FBLQ_TRI_PARTE_MIN && (pct < FBLQ_TRI_PCT_MIN || rec > 30);
    return { local: (r.end && r.end[k]) || k, celula: k, horas: Math.round(a[0] * 2 / 6) / 10, pctSinal: Math.round(pct * 100), parte: Math.round(parte * 100),
      reconexoes: a[2], reconexaoMin: Math.round(rec), maiorLacunaMin: Math.round(a[4]), frequente: frequente, ruim: ruim };
  }).sort(function (a, b) { return b.horas - a.horas; });
  var ruins = lista.filter(function (x) { return x.ruim; });
  return { triagem: ruins.length ? 'SO_AVISA' : 'BLOQUEIO_ATIVO', locais: lista.slice(0, 6),
    motivo: ruins.length ? 'o aparelho perde a conexão onde o carro costuma ficar: ' + ruins.slice(0, 3).map(function (x) { return x.local + ' (conectado ' + x.pctSinal + '% do tempo, reconexão média de ' + x.reconexaoMin + ' min)'; }).join('; ') +
      '. Um bloqueio enviado ali pode ficar na fila e cair quando o carro sair: o SGO+ só avisa.' : 'aparelho conectado nos locais em que o carro costuma ficar (' + lista.filter(function (x) { return x.frequente; }).length + ' local(is) frequente(s), conexão medida na iTracker).' };
}

function FrotaBlq_triagemVeiculo_(veiculo, est, quem) {
  var cl = FrotaBlq_classificarConexao_(FrotaBlq_lerResumoConexao_(est), est.CON_INICIO, Date.now());
  var antes = FrotaBlq_s_(est.TRIAGEM);
  FrotaBlq_gravarEstado_(est, { TRIAGEM: cl.triagem, TRIAGEM_EM: SGO_UTILS.nowIso(), TRIAGEM_RESUMO: JSON.stringify({ motivo: cl.motivo, locais: cl.locais, base: 'conexao' }).slice(0, 4000) });
  if (antes !== cl.triagem) FrotaBlq_evento_({ veiculo: veiculo, modo: est.MODO, tipo: 'TRIAGEM', acao: cl.triagem, origem: quem ? 'GESTAO' : 'ROTINA', quem: quem || FBLQ_SISTEMA, detalhe: 'Triagem do sinal: ' + cl.motivo });
  return cl;
}

/**
 * Uma vez (22/10/2026): a triagem da versão anterior media o intervalo entre posições e marcou "Só avisa" carros que estavam
 * conectados na base (economia do rastreador desligado). Toda triagem automática volta para SEM_DADOS, com o porquê no
 * registro; a escolha manual da gestão (TRIAGEM_MANUAL) não é mexida.
 */
function FrotaBlq_migrarTriagemConexao_(estados) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(FBLQ_PROP_TRIAGEM_V2)) return;
  props.setProperty(FBLQ_PROP_TRIAGEM_V2, SGO_UTILS.nowIso());
  var motivo = 'triagem refeita em 22/10/2026: a medição anterior contava o intervalo entre posições e confundiu o modo de economia do rastreador (carro desligado deixa de mandar posição, mas continua conectado) com falta de sinal. Agora a triagem mede a conexão do aparelho (situação online e último contato na iTracker); até 24 h desse histórico novo vale a regra normal: o bloqueio só sai com o aparelho conectado agora, o carro parado e desligado.';
  Object.keys(estados || {}).forEach(function (k) {
    var est = estados[k];
    var antes = FrotaBlq_s_(est.TRIAGEM);
    FrotaBlq_gravarEstado_(est, { TRIAGEM: 'SEM_DADOS', TRIAGEM_EM: SGO_UTILS.nowIso(), TRIAGEM_RESUMO: JSON.stringify({ motivo: motivo, locais: [], base: 'conexao' }), CON_INICIO: '', CON_RESUMO: '', CON_OFF_DESDE: '' });
    FrotaBlq_evento_({ veiculo: est, modo: est.MODO, tipo: 'TRIAGEM', acao: 'CORRECAO', origem: 'ROTINA', quem: FBLQ_SISTEMA,
      detalhe: 'Triagem do sinal: ' + (antes || 'vazia') + ' -> SEM_DADOS. ' + motivo.charAt(0).toUpperCase() + motivo.slice(1) });
  });
}

/** Uma vez por dia, um veículo por rodada (rotina leve). */
function FrotaBlq_triagemDiaria_(veiculos, estados) {
  var props = PropertiesService.getScriptProperties();
  var hoje = Rastreador_agoraTexto_().slice(0, 10);
  var feito = {};
  try { feito = JSON.parse(props.getProperty(FBLQ_PROP_TRIAGEM_DIA) || '{}') || {}; } catch (e) { feito = {}; }
  if (feito.dia !== hoje) feito = { dia: hoje, ids: [] };
  var v = (veiculos || []).filter(function (x) { return FrotaBlq_s_(x.RASTREADOR_DEVICE_ID) && FrotaBlq_s_(x.STATUS).toUpperCase() !== 'INATIVO' && feito.ids.indexOf(FrotaBlq_s_(x.ID)) < 0; })[0];
  if (!v) return;
  feito.ids.push(FrotaBlq_s_(v.ID));
  props.setProperty(FBLQ_PROP_TRIAGEM_DIA, JSON.stringify(feito));
  FrotaBlq_triagemVeiculo_(v, FrotaBlq_estadoDe_(v, estados), null);
}

// ------------------------------------------------------------
// PASSAR O CARRO (regra 4)
// ------------------------------------------------------------
/** Condutor com autorização de dirigir: ativo, com usuário e CNH válida hoje. */
function FrotaBlq_condutorAutorizado_(c) {
  if (!c || FrotaBlq_s_(c.STATUS).toUpperCase() === 'INATIVO') return { ok: false, motivo: 'condutor inativo ou não cadastrado' };
  var dias = typeof Frota_diasAte_ === 'function' ? Frota_diasAte_(c.CNH_VALIDADE) : null;
  if (dias === null || dias === undefined || !isFinite(dias)) return { ok: false, motivo: 'CNH sem validade cadastrada' };
  if (dias < 0) return { ok: false, motivo: 'CNH vencida em ' + Frota_textoData_(c.CNH_VALIDADE) };
  return { ok: true };
}
function FrotaBlq_elegiveis_() {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function (c) { return FrotaBlq_condutorAutorizado_(c).ok; })
    .map(function (c) { return { id: FrotaBlq_s_(c.ID), nome: FrotaBlq_s_(c.NOME), usuarioId: FrotaBlq_s_(c.USUARIO_ID) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}
function FrotaBlq_movAbertaDoVeiculo_(veiculoId) {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(function (m) { return FrotaBlq_s_(m.VEICULO_ID) === FrotaBlq_s_(veiculoId) && Frota_movimentoAberto_(m); })[0] || null;
}

/** Hora informada pelo celular (sem internet: a hora do toque). Entre a retirada e agora; senão, agora. */
function FrotaBlq_quandoLocal_(texto, movInicioMs) {
  var t = FrotaBlq_ms_(texto);
  var agora = Date.now();
  if (!t || t > agora + 2 * 60000 || (movInicioMs && t < movInicioMs)) return { ms: agora, informado: false };
  return { ms: Math.min(t, agora), informado: agora - t > 2 * 60000 };
}

function FrotaBlq_passagemPorCodigo_(codigo) {
  if (!codigo) return null;
  return Frota_lerSeExistir_(FBLQ_ABA_PASSAGENS).filter(function (p) { return FrotaBlq_s_(p.CODIGO_LOCAL) === codigo; })[0] || null;
}
function FrotaBlq_respostaPassagem_(p, texto) {
  return { ok: true, passagemId: FrotaBlq_s_(p.ID), situacao: FrotaBlq_s_(p.SITUACAO), placa: FrotaBlq_s_(p.PLACA), veiculoId: FrotaBlq_s_(p.VEICULO_ID), texto: texto };
}

/** Conclui: encerra a retirada de quem passa e abre a de quem recebe, sem devolução e sem comando ao carro. */
function FrotaBlq_concluirPassagem_(p, quem, comoTexto) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var veiculo, novo, movA;
  try {
    p = SGO_DATA.getById(FBLQ_ABA_PASSAGENS, p.ID) || p;
    if (FrotaBlq_s_(p.SITUACAO) === 'CONCLUIDA') return { jaFeita: true };
    movA = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, p.MOV_ORIGEM_ID);
    if (!movA || !Frota_movimentoAberto_(movA) || FrotaBlq_s_(movA.CONDUTOR_ID) !== FrotaBlq_s_(p.DE_CONDUTOR_ID)) {
      SGO_DATA.update(FBLQ_ABA_PASSAGENS, p.ID, { SITUACAO: 'RECUSADA', MOTIVO: 'A retirada de ' + FrotaBlq_s_(p.DE_NOME) + ' já não está aberta (foi devolvida ou passada antes).' });
      throw new Error('A passagem do carro não foi feita: a retirada de ' + FrotaBlq_s_(p.DE_NOME) + ' já não está aberta (foi devolvida ou passada antes). Atualize a tela. Se o carro está livre, faça a retirada normal; se está com outra pessoa, peça "Assumir o carro" de novo.');
    }
    var para = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, p.PARA_CONDUTOR_ID);
    var aut = FrotaBlq_condutorAutorizado_(para);
    if (!aut.ok) {
      SGO_DATA.update(FBLQ_ABA_PASSAGENS, p.ID, { SITUACAO: 'RECUSADA', MOTIVO: 'Quem recebe não tem autorização de dirigir: ' + aut.motivo + '.' });
      throw new Error('A passagem não foi feita: ' + FrotaBlq_s_(p.PARA_NOME) + ' não está autorizado a dirigir (' + aut.motivo + '). A gestão regulariza em Frota > Veículos e condutores > Condutores; depois peça de novo.');
    }
    veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, movA.VEICULO_ID) || {};
    var km = Frota_num_(p.KM, NaN);
    var kmSaidaA = Frota_num_(movA.KM_SAIDA, 0);
    var kmAlerta = '';
    if (!isFinite(km) || km < kmSaidaA) { kmAlerta = 'KM da passagem não informado ou menor que a saída: ficou o KM de saída; confira o painel'; km = kmSaidaA; }
    var quando = new Date(FrotaBlq_ms_(p.QUANDO_LOCAL) || Date.now());
    var data = Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy'), hora = Utilities.formatDate(quando, 'America/Sao_Paulo', 'HH:mm');
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movA.ID, {
      DATA_CHEGADA: data, HORA_CHEGADA: hora, KM_CHEGADA: km, STATUS: 'FINALIZADO', FINALIZADO_EM: SGO_UTILS.nowIso(),
      REGISTRADO_CHEGADA_POR_ID: FrotaBlq_s_(quem.userId), REGISTRADO_CHEGADA_POR_NOME: FrotaBlq_nome_(quem),
      OBSERVACOES: ('Carro passado para ' + FrotaBlq_s_(p.PARA_NOME) + ' (passar o carro, sem devolução). ' + FrotaBlq_s_(movA.OBSERVACOES)).slice(0, 500),
      KM_ALERTA_CHEGADA: kmAlerta, PASSAGEM_ID: p.ID, ENCERRADA_POR_PASSAGEM: 'SIM'
    });
    novo = SGO_DATA.normalizarObjetoParaSheet(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, SGO_DATA.gerarRegistroBase({
      VEICULO_ID: FrotaBlq_s_(movA.VEICULO_ID), CONDUTOR_ID: FrotaBlq_s_(p.PARA_CONDUTOR_ID), DATA_SAIDA: data, HORA_SAIDA: hora, KM_SAIDA: km,
      CHECKLIST_SAIDA_JSON: '[]', FOTOS_SAIDA_JSON: '[]', FINALIDADE: FrotaBlq_s_(movA.FINALIDADE), DATA_CHEGADA: '', HORA_CHEGADA: '', KM_CHEGADA: '',
      CHECKLIST_CHEGADA_JSON: '', FOTOS_CHEGADA_JSON: '', OBSERVACOES: 'Carro recebido de ' + FrotaBlq_s_(p.DE_NOME) + ' (passar o carro).', STATUS: 'EM_ANDAMENTO',
      REGISTRADO_SAIDA_POR_ID: FrotaBlq_s_(quem.userId), REGISTRADO_SAIDA_POR_NOME: FrotaBlq_nome_(quem), KM_VEICULO_NA_SAIDA: km,
      DEVOLUCAO_PREVISTA_DATA: FrotaBlq_s_(movA.DEVOLUCAO_PREVISTA_DATA), DEVOLUCAO_PREVISTA_HORA: FrotaBlq_s_(movA.DEVOLUCAO_PREVISTA_HORA), DEVOLUCAO_PREVISTA_ORIGEM: FrotaBlq_s_(movA.DEVOLUCAO_PREVISTA_ORIGEM),
      PASSAGEM_ID: p.ID
    }));
    SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, novo);
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, movA.VEICULO_ID, { KM_ATUAL: km, STATUS: 'EM_USO' });
    SGO_DATA.update(FBLQ_ABA_PASSAGENS, p.ID, { SITUACAO: 'CONCLUIDA', CONCLUIDA_EM: SGO_UTILS.nowIso(), MOV_NOVA_ID: novo.ID, MOTIVO: comoTexto || '' });
  } finally { try { SpreadsheetApp.flush(); } catch (eF) {} lock.releaseLock(); }
  var rot = FrotaBlq_rotulo_(veiculo);
  FrotaBlq_evento_({ veiculo: veiculo, modo: '', tipo: 'PASSAGEM', acao: 'PASSAR', origem: FrotaBlq_s_(p.PEDIDO_POR), quem: quem, movId: novo.ID,
    detalhe: 'Carro passado de ' + FrotaBlq_s_(p.DE_NOME) + ' para ' + FrotaBlq_s_(p.PARA_NOME) + ' às ' + FrotaBlq_txt_(FrotaBlq_ms_(p.QUANDO_LOCAL) || Date.now()) + (FrotaBlq_s_(p.SEM_INTERNET) === 'SIM' ? ' (registrado sem internet e sincronizado depois)' : '') + (comoTexto ? '; ' + comoTexto : '') + '. Sem devolução e sem comando ao carro (continua liberado).' });
  Frota_auditar_(quem, { acao: 'PASSAR_O_CARRO', veiculoId: FrotaBlq_s_(movA.VEICULO_ID), placa: FrotaBlq_s_(veiculo.PLACA), movimentacaoId: novo.ID, condutorId: FrotaBlq_s_(p.PARA_CONDUTOR_ID), condutorNome: FrotaBlq_s_(p.PARA_NOME),
    campo: 'CONDUTOR', antes: FrotaBlq_s_(p.DE_NOME), depois: FrotaBlq_s_(p.PARA_NOME), detalhe: 'Passar o carro: retirada ' + FrotaBlq_s_(movA.ID) + ' encerrada e ' + novo.ID + ' aberta, sem devolução e sem comando.' });
  [FrotaBlq_usuarioDoCondutor_(FrotaBlq_s_(p.DE_CONDUTOR_ID)), FrotaBlq_usuarioDoCondutor_(FrotaBlq_s_(p.PARA_CONDUTOR_ID))].forEach(function (uid) {
    if (uid && uid !== FrotaBlq_s_(quem.userId)) FrotaBlq_avisarUsuario_(uid, 'Carro passado: ' + rot, 'O ' + rot + ' passou de ' + FrotaBlq_s_(p.DE_NOME) + ' para ' + FrotaBlq_s_(p.PARA_NOME) + ' no SGO+. Quem recebeu é o responsável a partir de agora e faz a devolução.', novo.ID, 'S64', ['sgo']);
  });
  return { ok: true, movNovaId: novo.ID, texto: 'Pronto: o ' + rot + ' agora está com ' + FrotaBlq_s_(p.PARA_NOME) + '. A partida continua liberada; quem recebeu faz a devolução no fim.' };
}

function FrotaBlq_meuCondutor_(sessao) {
  var c = typeof Frota_obterCondutorPorUsuario_ === 'function' ? Frota_obterCondutorPorUsuario_(sessao.userId) : null;
  return c && FrotaBlq_s_(c.STATUS).toUpperCase() !== 'INATIVO' ? c : null;
}

/** "Passar o carro" (quem está com o carro) ou "Assumir o carro" (quem vai receber). */
function Frota_apiPassagemPedir(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var codigo = FrotaBlq_s_(payload.codigoLocal).slice(0, 60);
  var ja = FrotaBlq_passagemPorCodigo_(codigo);
  if (ja) return FrotaBlq_respostaPassagem_(ja, 'Este pedido já tinha chegado ao SGO+ (situação: ' + FrotaBlq_s_(ja.SITUACAO).toLowerCase().replace(/_/g, ' ') + ').');
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaBlq_s_(payload.veiculoId));
  if (!veiculo) throw new Error('Veículo não encontrado. Atualize a tela e escolha de novo.');
  var rot = FrotaBlq_rotulo_(veiculo);
  var mov = FrotaBlq_movAbertaDoVeiculo_(veiculo.ID);
  if (!mov) throw new Error('O ' + rot + ' não tem retirada aberta: não há o que passar. Se você vai usar o carro, faça a retirada normal em Frota > Retirar.');
  var eu = FrotaBlq_meuCondutor_(sessao);
  if (!eu) throw new Error('Seu login não tem condutor vinculado, então o carro não pode ser passado para você nem por você. Peça à gestão para vincular em Frota > Veículos e condutores > Condutores.');
  var de = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, mov.CONDUTOR_ID) || {};
  var souAtual = FrotaBlq_s_(de.ID) === FrotaBlq_s_(eu.ID);
  var para;
  if (souAtual) {
    para = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, FrotaBlq_s_(payload.paraCondutorId));
    if (!para) throw new Error('Escolha para quem você vai passar o ' + rot + ' (a lista mostra só quem tem autorização de dirigir).');
    if (FrotaBlq_s_(para.ID) === FrotaBlq_s_(eu.ID)) throw new Error('O ' + rot + ' já está com você.');
  } else {
    para = eu;
  }
  var aut = FrotaBlq_condutorAutorizado_(para);
  if (!aut.ok) throw new Error((souAtual ? FrotaBlq_s_(para.NOME) + ' não pode receber o carro' : 'Você não pode assumir o carro') + ': ' + aut.motivo + '. Só recebe o carro quem tem autorização de dirigir no SGO+ (condutor ativo e CNH válida). A gestão regulariza em Frota > Veículos e condutores > Condutores.');
  var quando = FrotaBlq_quandoLocal_(payload.quandoLocal, FrotaBlq_ms_(mov.CRIADO_EM));
  var km = String(payload.km === undefined || payload.km === null ? '' : payload.km).trim();
  if (!souAtual && (km === '' || !isFinite(Frota_num_(km, NaN)))) throw new Error('Informe o KM do painel agora (só números) para assumir o ' + rot + '.');
  var reg = SGO_DATA.normalizarObjetoParaSheet(FBLQ_ABA_PASSAGENS, SGO_DATA.gerarRegistroBase({
    CODIGO_LOCAL: codigo, VEICULO_ID: FrotaBlq_s_(veiculo.ID), PLACA: FrotaBlq_s_(veiculo.PLACA), MOV_ORIGEM_ID: FrotaBlq_s_(mov.ID), MOV_NOVA_ID: '',
    DE_CONDUTOR_ID: FrotaBlq_s_(de.ID), DE_NOME: FrotaBlq_s_(de.NOME), PARA_CONDUTOR_ID: FrotaBlq_s_(para.ID), PARA_NOME: FrotaBlq_s_(para.NOME),
    PEDIDO_POR: souAtual ? 'ATUAL' : 'RECEBEDOR', DE_CONFIRMOU_EM: souAtual ? SGO_UTILS.nowIso() : '', PARA_CONFIRMOU_EM: souAtual ? '' : SGO_UTILS.nowIso(),
    KM: km === '' ? '' : Frota_num_(km, ''), QUANDO_LOCAL: new Date(quando.ms).toISOString(), SEM_INTERNET: payload.semInternet === true || quando.informado ? 'SIM' : '',
    SITUACAO: souAtual ? 'AGUARDANDO_RECEBEDOR' : 'AGUARDANDO_ATUAL', MOTIVO: ''
  }));
  SGO_DATA.insert(FBLQ_ABA_PASSAGENS, reg);
  FrotaBlq_evento_({ veiculo: veiculo, tipo: 'PASSAGEM', acao: souAtual ? 'PASSAR_PEDIDO' : 'ASSUMIR_PEDIDO', origem: reg.PEDIDO_POR, quem: sessao, movId: mov.ID,
    detalhe: (souAtual ? FrotaBlq_s_(de.NOME) + ' quer passar o carro para ' + FrotaBlq_s_(para.NOME) : FrotaBlq_s_(para.NOME) + ' pediu para assumir o carro de ' + FrotaBlq_s_(de.NOME)) + '.' });
  var alvoUid = souAtual ? FrotaBlq_s_(para.USUARIO_ID) : FrotaBlq_s_(de.USUARIO_ID);
  FrotaBlq_avisarUsuario_(alvoUid, souAtual ? FrotaBlq_s_(de.NOME) + ' quer passar o ' + rot + ' para você' : FrotaBlq_s_(para.NOME) + ' pediu para assumir o ' + rot,
    souAtual ? 'Abra a Frota no SGO+ e toque em "Assumi o carro" quando estiver com a chave (informe o KM do painel).' : 'Abra a Frota no SGO+ e toque em "Confirmar" se você passou o carro, ou "Recusar". A gestão também pode autorizar.', reg.ID, 'S64', ['sgo']);
  return FrotaBlq_respostaPassagem_(reg, souAtual ? 'Pedido registrado: quando ' + FrotaBlq_s_(para.NOME) + ' tocar em "Assumi o carro", o ' + rot + ' passa para ' + (FrotaBlq_s_(para.NOME).split(' ')[0] || 'essa pessoa') + '. Até lá o carro continua com você.'
    : 'Pedido registrado: falta ' + FrotaBlq_s_(de.NOME) + ' confirmar no aplicativo ou a gestão autorizar. Até lá o carro continua com ' + (FrotaBlq_s_(de.NOME).split(' ')[0] || 'quem retirou') + '.');
}

/** Confirma a passagem: quem recebe ("Assumi o carro", com KM) ou quem passa ("Confirmar"). */
function Frota_apiPassagemConfirmar(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FBLQ_ABA_PASSAGENS, FrotaBlq_s_(payload.passagemId));
  if (!p) throw new Error('Pedido de passagem não encontrado. Atualize a tela.');
  if (FrotaBlq_s_(p.SITUACAO) === 'CONCLUIDA') return FrotaBlq_respostaPassagem_(p, 'Esta passagem já estava concluída.');
  if (['AGUARDANDO_RECEBEDOR', 'AGUARDANDO_ATUAL'].indexOf(FrotaBlq_s_(p.SITUACAO)) < 0) throw new Error('Este pedido não está mais aberto (situação: ' + FrotaBlq_s_(p.SITUACAO).toLowerCase().replace(/_/g, ' ') + '). Atualize a tela e, se for o caso, peça de novo.');
  var eu = FrotaBlq_meuCondutor_(sessao);
  var souPara = eu && FrotaBlq_s_(eu.ID) === FrotaBlq_s_(p.PARA_CONDUTOR_ID), souDe = eu && FrotaBlq_s_(eu.ID) === FrotaBlq_s_(p.DE_CONDUTOR_ID);
  var upd = {};
  if (souPara && FrotaBlq_s_(p.SITUACAO) === 'AGUARDANDO_RECEBEDOR') {
    var km = String(payload.km === undefined || payload.km === null ? '' : payload.km).trim();
    if (km === '' || !isFinite(Frota_num_(km, NaN))) throw new Error('Informe o KM do painel agora (só números) e toque em "Assumi o carro" de novo.');
    var q = FrotaBlq_quandoLocal_(payload.quandoLocal, FrotaBlq_ms_(p.CRIADO_EM));
    upd = { PARA_CONFIRMOU_EM: SGO_UTILS.nowIso(), KM: Frota_num_(km, ''), QUANDO_LOCAL: new Date(q.ms).toISOString() };
    if (payload.semInternet === true || q.informado) upd.SEM_INTERNET = 'SIM';
  } else if (souDe && FrotaBlq_s_(p.SITUACAO) === 'AGUARDANDO_ATUAL') {
    upd = { DE_CONFIRMOU_EM: SGO_UTILS.nowIso() };
  } else {
    throw new Error(souDe || souPara ? 'Falta a outra pessoa confirmar: ' + (FrotaBlq_s_(p.SITUACAO) === 'AGUARDANDO_RECEBEDOR' ? FrotaBlq_s_(p.PARA_NOME) + ' toca em "Assumi o carro".' : FrotaBlq_s_(p.DE_NOME) + ' confirma no aplicativo (ou a gestão autoriza).')
      : 'Só quem passa ou quem recebe o carro confirma este pedido. A gestão autoriza em Frota > Rastreamento > Bloqueio da partida.');
  }
  SGO_DATA.update(FBLQ_ABA_PASSAGENS, p.ID, upd);
  Object.assign(p, upd);
  var r = FrotaBlq_concluirPassagem_(p, sessao, souPara ? 'quem recebeu tocou em "Assumi o carro"' : 'quem passou confirmou no aplicativo');
  return Object.assign(FrotaBlq_respostaPassagem_(p, r.texto || 'Passagem concluída.'), { situacao: 'CONCLUIDA' });
}

/** A gestão autoriza (quem passa não pode confirmar) ou recusa. */
function Frota_apiPassagemDecidir(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FBLQ_ABA_PASSAGENS, FrotaBlq_s_(payload.passagemId));
  if (!p) throw new Error('Pedido de passagem não encontrado. Atualize a tela.');
  var recusar = FrotaBlq_s_(payload.decisao).toUpperCase() === 'RECUSAR';
  var eu = FrotaBlq_meuCondutor_(sessao);
  var envolvido = eu && (FrotaBlq_s_(eu.ID) === FrotaBlq_s_(p.DE_CONDUTOR_ID) || FrotaBlq_s_(eu.ID) === FrotaBlq_s_(p.PARA_CONDUTOR_ID));
  if (['AGUARDANDO_RECEBEDOR', 'AGUARDANDO_ATUAL'].indexOf(FrotaBlq_s_(p.SITUACAO)) < 0) throw new Error('Este pedido não está mais aberto. Atualize a tela.');
  if (recusar) {
    if (!envolvido && !Frota_ehGestao_(sessionId)) throw new Error('Só quem passa, quem recebe ou a gestão recusa este pedido.');
    SGO_DATA.update(FBLQ_ABA_PASSAGENS, p.ID, { SITUACAO: 'RECUSADA', MOTIVO: ('Recusado por ' + FrotaBlq_nome_(sessao) + (payload.motivo ? ': ' + String(payload.motivo).slice(0, 200) : '')) });
    FrotaBlq_evento_({ veiculo: { ID: p.VEICULO_ID, PLACA: p.PLACA }, tipo: 'PASSAGEM', acao: 'RECUSADA', quem: sessao, movId: p.MOV_ORIGEM_ID, detalhe: 'Passagem recusada por ' + FrotaBlq_nome_(sessao) + '.' });
    return { ok: true, texto: 'Pedido recusado. O carro continua com ' + FrotaBlq_s_(p.DE_NOME) + '.' };
  }
  if (!Frota_ehGestao_(sessionId)) throw new Error('A autorização da passagem é da gestão (Administrador, Diretoria, Gestor, RH ou Financeiro).');
  if (envolvido) throw new Error('Você está envolvido nesta passagem: confirme pelo seu lado no aplicativo (ninguém autoriza a si mesmo).');
  var just = Frota_exigirJustificativa_(payload.justificativa, ['autorização da gestão para passar o carro'], 'condutor sem sinal no celular, confirmado por telefone');
  if (FrotaBlq_s_(p.SITUACAO) === 'AGUARDANDO_RECEBEDOR' && !FrotaBlq_s_(p.KM)) {
    var km = String(payload.km === undefined || payload.km === null ? '' : payload.km).trim();
    if (km !== '' && isFinite(Frota_num_(km, NaN))) p.KM = Frota_num_(km, '');
  }
  SGO_DATA.update(FBLQ_ABA_PASSAGENS, p.ID, { GESTAO_AUTORIZOU_POR: FrotaBlq_nome_(sessao), GESTAO_AUTORIZOU_EM: SGO_UTILS.nowIso(), GESTAO_JUSTIFICATIVA: just, KM: p.KM });
  var r = FrotaBlq_concluirPassagem_(p, sessao, 'autorizada pela gestão (' + FrotaBlq_nome_(sessao) + '): ' + just);
  return { ok: true, texto: r.texto };
}

// ------------------------------------------------------------
// RETIRADA ESQUECIDA: resposta do condutor e decisão da gestão
// ------------------------------------------------------------
function Frota_apiBloqueioResponderEsquecida(sessionId, payload) {
  var sessao = Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, FrotaBlq_s_(payload.movimentacaoId));
  if (!mov || !Frota_movimentoAberto_(mov)) return { ok: true, texto: 'Esta retirada já foi encerrada.' };
  var eu = FrotaBlq_meuCondutor_(sessao);
  if (!eu || FrotaBlq_s_(eu.ID) !== FrotaBlq_s_(mov.CONDUTOR_ID)) throw new Error('Só quem está com o carro responde esta pergunta.');
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, mov.VEICULO_ID) || {};
  var est = FrotaBlq_estadoDe_(veiculo);
  FrotaBlq_gravarEstado_(est, { ESQ_MOV_ID: mov.ID, ESQ_RESPOSTA: 'CONTINUAR', ESQ_RESPOSTA_EM: SGO_UTILS.nowIso(), ESQ_GESTAO_EM: '' });
  FrotaBlq_evento_({ veiculo: veiculo, modo: est.MODO, tipo: 'DECISAO', acao: 'CONTINUAR', origem: 'ESQUECIDA', quem: sessao, movId: mov.ID, detalhe: 'O condutor respondeu que continua com o carro.' });
  return { ok: true, texto: 'Anotado: o ' + FrotaBlq_rotulo_(veiculo) + ' continua com você. Lembre de devolver pelo SGO+ quando terminar.' };
}

/** Gestão encerra a retirada esquecida: só com o carro parado, desligado, na base e com sinal; depois pede o bloqueio. */
function Frota_apiBloqueioEncerrarEsquecida(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) throw new Error('Encerrar a retirada de outra pessoa é da gestão (Administrador, Diretoria, Gestor, RH ou Financeiro).');
  payload = payload || {};
  var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, FrotaBlq_s_(payload.movimentacaoId));
  if (!mov || !Frota_movimentoAberto_(mov)) throw new Error('Esta retirada já foi encerrada. Atualize a tela.');
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, mov.VEICULO_ID) || {};
  var rot = FrotaBlq_rotulo_(veiculo);
  var just = Frota_exigirJustificativa_(payload.justificativa, ['encerramento da retirada esquecida do ' + rot], 'condutor esqueceu de devolver; carro na base desde a tarde');
  var c = Rastreador_cfg_();
  var dev = FrotaBlq_s_(veiculo.RASTREADOR_DEVICE_ID);
  if (!c.ligado || !dev) throw new Error('Sem o rastreador não dá para conferir que o carro está parado na base. Registre a devolução no lugar do condutor pela tela normal (Frota > Situação e retiradas), com a justificativa.');
  var pos = null;
  try { pos = Rastreador_lerPosicoes_(c, dev, { aceitarCacheSeg: 60 })[dev] || null; } catch (e) { throw new Error('Não foi possível ler o rastreador agora (' + Rastreador_limpar_(e && e.message, c) + '). Tente de novo em 1 minuto.'); }
  var conE = FrotaBlq_conAgora_(c, veiculo);
  var seg = FrotaBlq_seguro_(pos, Date.now(), conE);
  var nb = FrotaBlq_naBase_(pos);
  if (!seg.ok || nb.naBase !== true) {
    throw new Error('A retirada não foi encerrada: ' + (!seg.ok ? seg.motivo : nb.motivo) + '. A gestão só encerra a retirada de outra pessoa com o carro parado, desligado, na base e com sinal (regra para não tirar o carro de quem está usando). ' +
      'Se alguém precisa do carro agora, use "Passar o carro" (a gestão autoriza) em vez de encerrar.');
  }
  var odo = pos.odometroKm;
  var kmSaida = Frota_num_(mov.KM_SAIDA, 0), odoSaida = Rastreador_numOuNulo_(mov.KM_RASTREADOR_SAIDA);
  var km = odo !== null && odoSaida !== null && odo >= odoSaida ? kmSaida + (odo - odoSaida) : kmSaida;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID);
    if (!mov || !Frota_movimentoAberto_(mov)) throw new Error('Esta retirada acabou de ser encerrada. Atualize a tela.');
    var agora = new Date();
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, {
      DATA_CHEGADA: Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy'), HORA_CHEGADA: Utilities.formatDate(agora, 'America/Sao_Paulo', 'HH:mm'), KM_CHEGADA: km,
      STATUS: 'FINALIZADO', FINALIZADO_EM: SGO_UTILS.nowIso(), REGISTRADO_CHEGADA_POR_ID: FrotaBlq_s_(sessao.userId), REGISTRADO_CHEGADA_POR_NOME: FrotaBlq_nome_(sessao),
      REGISTRO_GESTAO_CHEGADA: 'SIM', REGISTRO_GESTAO_CHEGADA_EM: SGO_UTILS.nowIso(), JUSTIFICATIVA_CHEGADA: just, MOTIVO_GESTAO_CHEGADA: 'retirada esquecida encerrada pela gestão',
      KM_ALERTA_CHEGADA: 'retirada esquecida encerrada pela gestão: KM ' + (km === kmSaida ? 'igual ao da saída' : 'estimado pelo rastreador') + '; confira o painel', ENCERRADA_ESQUECIDA: 'SIM'
    });
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, veiculo.ID, { KM_ATUAL: km, STATUS: FrotaBlq_s_(veiculo.STATUS).toUpperCase() === 'INATIVO' ? 'INATIVO' : 'ATIVO' });
  } finally { lock.releaseLock(); }
  var cond = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, mov.CONDUTOR_ID) || {};
  Frota_auditar_(sessao, { acao: 'DEVOLUCAO_ESQUECIDA_GESTAO', veiculoId: veiculo.ID, placa: veiculo.PLACA, movimentacaoId: mov.ID, condutorId: cond.ID, condutorNome: cond.NOME, justificativa: just,
    detalhe: 'Retirada esquecida encerrada pela gestão com o carro ' + seg.motivo + ' e ' + nb.motivo + '.' });
  if (typeof Frota_avisarCondutor_ === 'function') Frota_avisarCondutor_(cond, sessao, 'Retirada encerrada pela gestão: ' + rot, FrotaBlq_nome_(sessao) + ' encerrou a sua retirada do ' + rot + ' (o carro estava parado na base e você não respondeu).\nJustificativa: ' + just, mov.ID, 'S34');
  if (typeof FrotaRes_aposDevolucao_ === 'function') { try { FrotaRes_aposDevolucao_(sessao, mov, veiculo); } catch (eR) {} }
  var est = FrotaBlq_estadoDe_(veiculo);
  FrotaBlq_gravarEstado_(est, { ESQ_MOV_ID: '', ESQ_PARADO_DESDE: '', ESQ_PERGUNTA_EM: '', ESQ_RESPOSTA: '', ESQ_RESPOSTA_EM: '', ESQ_GESTAO_EM: '', EMERGENCIA_ATE: '' });
  FrotaBlq_novoPedido_(est, veiculo, 'ESQUECIDA', mov.ID, sessao, 'AUTORIZADO', 'retirada esquecida encerrada pela gestão');
  var r = FrotaBlq_avaliar_(Object.assign(c, FrotaBlq_cfg_()), veiculo, est, { pos: pos, con: conE, aberta: null, quem: sessao, origem: 'ESQUECIDA' });
  return { ok: true, texto: 'Retirada encerrada (KM ' + Frota_kmTexto_(km) + ', a conferir no painel). ' + (r.exec ? r.exec.texto : 'Bloqueio pedido: ' + (r.decisao.espera || 'aguardando') + '.') };
}

// ------------------------------------------------------------
// GESTÃO: fora da base, modo, triagem, emergência, roubo, hodômetro, áreas
// ------------------------------------------------------------
function FrotaBlq_exigirGestao_(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) throw new Error('O bloqueio da partida é da gestão da Frota (Administrador, Diretoria, Gestor, RH ou Financeiro). Para retirar, devolver ou passar o carro, use a tela normal da Frota.');
  Frota_bootstrap_();
  return sessao;
}
function FrotaBlq_veiculo_(id) {
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaBlq_s_(id));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela e escolha de novo.');
  if (!FrotaBlq_s_(v.RASTREADOR_DEVICE_ID)) throw new Error('O ' + FrotaBlq_rotulo_(v) + ' não tem aparelho do rastreador ligado. Ligue em Frota > Rastreamento > Aparelhos e alertas.');
  return v;
}
function FrotaBlq_posAgora_(c, v) {
  var dev = FrotaBlq_s_(v.RASTREADOR_DEVICE_ID);
  try { return Rastreador_lerPosicoes_(c, dev, { aceitarCacheSeg: 60 })[dev] || null; } catch (e) { return null; }
}

function Frota_apiBloqueioDecidirForaBase(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  if (FrotaBlq_s_(est.PEDIDO_SITUACAO) !== 'AGUARDANDO_GESTAO') throw new Error('O ' + FrotaBlq_rotulo_(v) + ' não tem decisão de bloqueio pendente (pode ter sido retirado ou decidido por outra pessoa). Atualize a tela.');
  var bloquear = FrotaBlq_s_(payload.decisao).toUpperCase() === 'BLOQUEAR';
  var just = Frota_exigirJustificativa_(payload.justificativa, [(bloquear ? 'bloqueio' : 'não bloquear') + ' do ' + FrotaBlq_rotulo_(v) + ' devolvido fora da base'], bloquear ? 'carro ficou no cliente, chave com o porteiro' : 'carro fica no hotel para a equipe seguir amanhã');
  FrotaBlq_gravarEstado_(est, { PEDIDO_SITUACAO: bloquear ? 'AUTORIZADO' : 'NAO_BLOQUEAR', PEDIDO_DECISAO_POR: FrotaBlq_nome_(sessao), PEDIDO_DECISAO_EM: SGO_UTILS.nowIso(), PEDIDO_MOTIVO: just });
  FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'DECISAO', acao: bloquear ? 'BLOQUEAR' : 'NAO_BLOQUEAR', origem: 'FORA_DA_BASE', quem: sessao, movId: est.PEDIDO_MOV_ID, detalhe: 'Gestão decidiu ' + (bloquear ? 'bloquear' : 'não bloquear') + ': ' + just });
  if (!bloquear) return { ok: true, texto: 'Anotado: o ' + FrotaBlq_rotulo_(v) + ' não será bloqueado até a próxima retirada.' };
  var c = FrotaBlq_cfg_();
  var r = FrotaBlq_avaliar_(c, v, est, { pos: FrotaBlq_posAgora_(c, v), aberta: FrotaBlq_movAbertaDoVeiculo_(v.ID), quem: sessao, origem: 'FORA_DA_BASE' });
  return { ok: true, texto: r.exec ? r.exec.texto : 'Bloqueio autorizado: sai quando o carro estiver conectado, parado e desligado (' + (r.decisao.espera || 'aguardando') + ').' };
}

function Frota_apiBloqueioModo(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  var modo = FrotaBlq_s_(payload.modo).toUpperCase();
  if (!FBLQ_MODOS[modo]) throw new Error('Escolha o modo: Ativo, Simulação ou Desligado.');
  var just = Frota_exigirJustificativa_(payload.motivo, ['mudança do modo do bloqueio do ' + FrotaBlq_rotulo_(v)], 'piloto aprovado pela diretoria para esta semana');
  var antes = FrotaBlq_s_(est.MODO);
  FrotaBlq_gravarEstado_(est, { MODO: modo, MODO_EM: SGO_UTILS.nowIso(), MODO_POR: FrotaBlq_nome_(sessao), MODO_MOTIVO: just });
  FrotaBlq_evento_({ veiculo: v, modo: modo, tipo: 'MODO', acao: modo, origem: 'GESTAO', quem: sessao, detalhe: 'Modo do bloqueio: ' + (antes || 'vazio') + ' -> ' + modo + '. ' + just });
  var me = FrotaBlq_modoEfetivo_(modo, FrotaBlq_cfg_());
  return { ok: true, texto: 'Modo do ' + FrotaBlq_rotulo_(v) + ': ' + FBLQ_MODOS[modo] + '.' + (me.motivo ? ' ' + me.motivo : '') };
}

function Frota_apiBloqueioTriagem(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  if (payload.refazer) { var cl = FrotaBlq_triagemVeiculo_(v, est, sessao); return { ok: true, texto: 'Triagem refeita: ' + (cl.triagem === 'SO_AVISA' ? 'Só avisa' : cl.triagem === 'BLOQUEIO_ATIVO' ? 'Bloqueio ativo' : 'sem dados') + ' (' + cl.motivo + ')' }; }
  var m = FrotaBlq_s_(payload.triagemManual).toUpperCase();
  if (m && m !== 'BLOQUEIO_ATIVO' && m !== 'SO_AVISA') throw new Error('Escolha: automática, Bloqueio ativo ou Só avisa.');
  var just = Frota_exigirJustificativa_(payload.motivo, ['escolha da triagem do sinal do ' + FrotaBlq_rotulo_(v)], 'carro dorme na garagem subterrânea do cliente no Rio');
  FrotaBlq_gravarEstado_(est, { TRIAGEM_MANUAL: m, TRIAGEM_MANUAL_POR: FrotaBlq_nome_(sessao), TRIAGEM_MANUAL_MOTIVO: just });
  FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'TRIAGEM', acao: m || 'AUTOMATICA', origem: 'GESTAO', quem: sessao, detalhe: 'Triagem escolhida pela gestão: ' + (m || 'automática') + '. ' + just });
  return { ok: true, texto: 'Triagem do ' + FrotaBlq_rotulo_(v) + ': ' + (m === 'SO_AVISA' ? 'Só avisa (nunca envia bloqueio)' : m === 'BLOQUEIO_ATIVO' ? 'Bloqueio ativo' : 'automática (pelo histórico)') + '.' };
}

function FrotaBlq_perfil_(sessionId) {
  try { return FrotaBlq_s_(exigirSessao(sessionId).perfil).toUpperCase(); } catch (e) { return ''; }
}

/** Emergência: "Liberar agora" (Administrador, Diretoria, Gestor, RH), com motivo. Vale 24 h ou até a devolução. */
function Frota_apiBloqueioLiberarAgora(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  var perfil = FrotaBlq_perfil_(sessionId);
  if (['ADMIN', 'DIRETORIA', 'GESTOR', 'RH'].indexOf(perfil) < 0) throw new Error('"Liberar agora" é do Administrador, da Diretoria, do Gestor e do RH. Peça a uma dessas pessoas ou use a central 24 h da iTracker.');
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  var just = Frota_exigirJustificativa_(payload.motivo || payload.justificativa, ['liberação de emergência do ' + FrotaBlq_rotulo_(v)], 'condutor sem sinal no celular, retirada confirmada por telefone');
  var c = FrotaBlq_cfg_();
  var me = FrotaBlq_modoEfetivo_(est.MODO, c);
  if (me.modo === 'DESLIGADO') throw new Error('O bloqueio está desligado neste veículo: o SGO+ não manda comando. Se o carro não pega, use a central 24 h da iTracker.');
  if (est.PEDIDO_ACAO) FrotaBlq_encerrarPedido_(est, v, 'CANCELADO', 'liberação de emergência pela gestão', sessao);
  FrotaBlq_gravarEstado_(est, { EMERGENCIA_ATE: new Date(Date.now() + FBLQ_EMERGENCIA_HORAS * 3600000).toISOString(), EMERGENCIA_MOTIVO: just, EMERGENCIA_POR: FrotaBlq_nome_(sessao) });
  FrotaBlq_evento_({ veiculo: v, modo: me.modo, tipo: 'EMERGENCIA', acao: 'LIBERAR', origem: 'GESTAO', quem: sessao, detalhe: 'Liberar agora (emergência, vale ' + FBLQ_EMERGENCIA_HORAS + ' h ou até a próxima devolução): ' + just });
  var exec = FrotaBlq_executar_(c, v, est, 'LIBERAR', { modo: me.modo, origem: 'EMERGENCIA', quem: sessao, motivo: 'liberação de emergência: ' + just });
  return { ok: true, situacao: exec.situacao, texto: exec.texto + (exec.situacao === 'NA_FILA' ? ' Se for urgente, ligue para a central 24 h da iTracker.' : '') };
}

function Frota_apiBloqueioEncerrarEmergencia(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  if (!FrotaBlq_s_(est.EMERGENCIA_ATE)) return { ok: true, texto: 'Não havia liberação de emergência valendo.' };
  FrotaBlq_gravarEstado_(est, { EMERGENCIA_ATE: '', EMERGENCIA_MOTIVO: '', EMERGENCIA_POR: '' });
  FrotaBlq_evento_({ veiculo: v, modo: est.MODO, tipo: 'EMERGENCIA', acao: 'FIM', origem: 'GESTAO', quem: sessao, detalhe: 'Liberação de emergência encerrada pela gestão.' });
  if (!FrotaBlq_movAbertaDoVeiculo_(v.ID)) FrotaBlq_novoPedido_(est, v, 'FIM_EMERGENCIA', '', sessao, 'AGUARDANDO', 'fim da liberação de emergência sem retirada aberta');
  return { ok: true, texto: 'Emergência encerrada. Sem retirada aberta, o bloqueio é pedido e só sai com o carro conectado, parado, desligado e na base.' };
}

/** Bloqueio de roubo: só a Diretoria, dupla confirmação, condições seguras ou aceite explícito do risco. */
function Frota_apiBloqueioRoubo(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  if (FrotaBlq_perfil_(sessionId) !== 'DIRETORIA') throw new Error('O bloqueio de roubo é só da Diretoria. Em caso de roubo, ligue para a Diretoria e para a central 24 h da iTracker; registre o boletim de ocorrência.');
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  var rot = FrotaBlq_rotulo_(v);
  var just = Frota_exigirJustificativa_(payload.motivo, ['bloqueio de roubo do ' + rot], 'carro levado do estacionamento do cliente, boletim em andamento');
  var esperado = 'BLOQUEAR ' + FrotaBlq_s_(v.PLACA).toUpperCase();
  if (payload.confirmacao1 !== true || FrotaBlq_s_(payload.confirmacao2).toUpperCase().replace(/\s+/g, ' ') !== esperado) {
    throw new Error('Bloqueio de roubo não enviado: falta a dupla confirmação. Marque "Confirmo que é roubo ou furto" e digite exatamente ' + esperado + ' no segundo campo.');
  }
  var c = FrotaBlq_cfg_();
  var me = FrotaBlq_modoEfetivo_(est.MODO, c);
  if (me.modo === 'DESLIGADO') throw new Error('O bloqueio está desligado neste veículo. Use a central 24 h da iTracker.');
  var pos = FrotaBlq_posAgora_(c, v);
  var seg = FrotaBlq_seguro_(pos, Date.now(), FrotaBlq_conAgora_(c, v));
  if (!seg.ok && payload.aceitarRisco !== true) {
    return { ok: true, enviado: false, precisaAceitarRisco: true, condicao: seg.motivo,
      texto: 'Bloqueio de roubo NÃO enviado: ' + seg.motivo + '. Com o carro andando, o corte da bomba pode parar o carro no meio do trânsito (o relé só efetiva abaixo de 20 km/h). ' +
        'Para enviar mesmo assim, marque "Aceito o risco" e toque em Bloquear de novo; ou acompanhe pelo mapa e envie quando o carro parar.' };
  }
  FrotaBlq_gravarEstado_(est, { EMERGENCIA_ATE: '', EMERGENCIA_MOTIVO: '', EMERGENCIA_POR: '' });
  FrotaBlq_novoPedido_(est, v, 'ROUBO', '', sessao, 'AUTORIZADO', just);
  FrotaBlq_evento_({ veiculo: v, modo: me.modo, tipo: 'EMERGENCIA', acao: 'BLOQUEAR', origem: 'ROUBO', quem: sessao, condicao: seg.motivo,
    detalhe: 'Bloqueio de roubo pela Diretoria (dupla confirmação' + (!seg.ok ? '; RISCO ACEITO: ' + seg.motivo : '') + '): ' + just });
  var exec = FrotaBlq_executar_(c, v, est, 'BLOQUEAR', { modo: me.modo, origem: 'ROUBO', quem: sessao, condicao: seg.motivo + (seg.ok ? '' : ' (risco aceito pela Diretoria)'), motivo: 'roubo: ' + just });
  return { ok: true, enviado: exec.situacao !== 'FALHOU', situacao: exec.situacao, texto: exec.texto + ' Avise a central 24 h da iTracker e registre o boletim de ocorrência.' };
}

/**
 * Regra 9 (hodômetro do rastreador). O aparelho conta os km pelo GPS; o SGO+ lê em cada posição (odometroKm).
 * Na devolução, compara o KM digitado (com a foto do painel) com o do rastreador: diferença acima de 2% e de 50 km
 * vira aviso à gestão (só no sistema). O acerto NUNCA é automático (erro de digitação estragaria o hodômetro):
 * a gestão (Gestor ou Administrador) confere a foto e toca em "Acertar o odômetro do rastreador", já preenchido.
 */
var FBLQ_ODO_TOL_PCT = 2;
var FBLQ_ODO_TOL_KM = 50;
var FBLQ_ODO_PERFIS = ['ADMIN', 'GESTOR'];

/** Diferença do KM do painel x hodômetro do rastreador. Função pura. */
function FrotaBlq_odometroDivergente_(kmPainel, kmRastreador) {
  var a = Number(kmPainel), b = Number(kmRastreador);
  if (!isFinite(a) || !isFinite(b) || a <= 0) return null;
  var dif = a - b;
  var pct = b > 0 ? Math.abs(dif) / b * 100 : 100;
  return { dif: Math.round(dif), pct: Math.round(pct * 10) / 10, divergente: Math.abs(dif) > FBLQ_ODO_TOL_KM && pct > FBLQ_ODO_TOL_PCT };
}

/** Chamado na devolução: grava a divergência para a gestão conferir (nunca acerta sozinho). */
function FrotaBlq_conferirOdometro_(veiculo, est, mov, pos) {
  if (!pos || pos.odometroKm === null || pos.odometroKm === undefined || !mov) return null;
  var d = FrotaBlq_odometroDivergente_(Frota_num_(mov.KM_CHEGADA, NaN), pos.odometroKm);
  if (!d || !d.divergente) return d;
  var foto = '';
  try { var f = JSON.parse(FrotaBlq_s_(mov.FOTOS_PAINEL_CHEGADA_JSON) || '[]'); foto = f && f[0] ? FrotaBlq_s_(f[0].link || f[0].url || f[0]) : ''; } catch (e) {}
  FrotaBlq_gravarEstado_(est, { ODO_DIVERGENCIA_MOV_ID: FrotaBlq_s_(mov.ID), ODO_PAINEL_KM: Frota_num_(mov.KM_CHEGADA, ''), ODO_RASTREADOR_KM: pos.odometroKm, ODO_DIVERGENCIA_EM: SGO_UTILS.nowIso(), ODO_FOTO: foto.slice(0, 500) });
  FrotaBlq_evento_({ veiculo: veiculo, modo: est.MODO, tipo: 'AVISO', acao: 'ODOMETRO', origem: 'DEVOLUCAO', quem: FBLQ_SISTEMA, movId: mov.ID,
    detalhe: 'Hodômetro do rastreador ' + Frota_kmTexto_(pos.odometroKm) + ' km e KM do painel na devolução ' + Frota_kmTexto_(mov.KM_CHEGADA) + ' km (diferença de ' + Frota_kmTexto_(d.dif) + ' km, ' + Rastreador_num_(d.pct, 1) + '%). A gestão confere a foto e acerta, se for o caso.' });
  return d;
}

/**
 * "Acertar o odômetro do rastreador" (Gestor ou Administrador), a qualquer momento. payload: { veiculoId, km, confirmado: true,
 * motivo (obrigatório se o valor for menor que o atual), confirmacaoMenor: true }. Nunca com o carro andando.
 * SIMULACAO = só registra o que mandaria; ATIVO = PUT accumulators e espera o 204. Com retirada aberta, a referência da
 * conferência do KM rodado (KM_RASTREADOR_SAIDA) é deslocada junto, para a conferência da devolução continuar certa.
 */
function Frota_apiBloqueioHodometro(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  if (FBLQ_ODO_PERFIS.indexOf(FrotaBlq_perfil_(sessionId)) < 0) throw new Error('Acertar o odômetro do rastreador é do Gestor ou do Administrador. Peça a uma dessas pessoas (Frota > Rastreamento > Bloqueio da partida).');
  payload = payload || {};
  var v = FrotaBlq_veiculo_(payload.veiculoId), est = FrotaBlq_estadoDe_(v);
  var rot = FrotaBlq_rotulo_(v);
  var km = Frota_num_(payload.km, NaN);
  if (!isFinite(km) || km <= 0 || km > 3000000) throw new Error('Informe o KM do painel (o número do odômetro, só números).');
  if (payload.confirmado !== true) throw new Error('Confirme o acerto: o hodômetro do rastreador do ' + rot + ' passa a ser ' + Frota_kmTexto_(km) + ' km.');
  var c = FrotaBlq_cfg_();
  if (!c.ligado) throw new Error('O rastreador está desligado no SGO+ (Chaves e senhas > Rastreador da frota). Nada foi enviado.');
  var pos = FrotaBlq_posAgora_(c, v);
  if (pos && pos.quandoMs && Date.now() - pos.quandoMs <= 5 * 60000 && ((pos.kmh !== null && Number(pos.kmh) >= FBLQ_PARADO_KMH) || pos.movimento === true)) {
    throw new Error('O ' + rot + ' está andando (' + Rastreador_num_(pos.kmh, 0) + ' km/h às ' + FrotaBlq_hhmm_(pos.quandoMs) + '): o hodômetro só é acertado com o carro parado. Tente quando ele estiver estacionado.');
  }
  var atual = pos && pos.odometroKm !== null && pos.odometroKm !== undefined ? Number(pos.odometroKm) : null;
  var motivo = String(payload.motivo || '').replace(/\s+/g, ' ').trim();
  if (atual !== null && km < atual) {
    if (payload.confirmacaoMenor !== true || motivo.length < 15) throw new Error('O valor informado (' + Frota_kmTexto_(km) + ' km) é MENOR que o hodômetro atual do rastreador (' + Frota_kmTexto_(atual) + ' km). Confirme de novo marcando "O valor menor está certo" e escreva o motivo (mínimo de 15 caracteres), por exemplo: "aparelho trocado de carro, painel conferido na revisão".');
  }
  var me = FrotaBlq_modoEfetivo_(est.MODO, c);
  var de = atual === null ? 'desconhecido' : Frota_kmTexto_(atual) + ' km';
  if (me.modo !== 'ATIVO') {
    FrotaBlq_evento_({ veiculo: v, modo: me.modo, tipo: 'SIMULACAO', acao: 'HODOMETRO', origem: 'GESTAO', quem: sessao, resultado: 'TERIA_ACERTADO',
      detalhe: 'Simulação: o SGO+ teria acertado o hodômetro do rastreador de ' + de + ' para ' + Frota_kmTexto_(km) + ' km' + (motivo ? ' (' + motivo + ')' : '') + '. Nada foi enviado.' + (me.motivo ? ' ' + me.motivo : '') });
    FrotaBlq_gravarEstado_(est, { ODO_DIVERGENCIA_MOV_ID: '', ODO_ACERTO_EM: SGO_UTILS.nowIso(), ODO_ACERTO_POR: FrotaBlq_nome_(sessao), ODO_ACERTO_DE: atual === null ? '' : atual, ODO_ACERTO_PARA: km, ODO_ACERTO_REAL: 'NAO' });
    return { ok: true, simulado: true, texto: 'Simulação: o hodômetro do ' + rot + ' teria sido acertado de ' + de + ' para ' + Frota_kmTexto_(km) + ' km (o veículo está em ' + (me.modo === 'DESLIGADO' ? 'Desligado' : 'Simulação') + '; nada foi enviado).' };
  }
  if (!FrotaBlq_vez_()) throw new Error('Limite de comandos por minuto do rastreador atingido. Tente de novo em 1 minuto.');
  var r = FrotaBlq_hodometroApi_(c, FrotaBlq_s_(v.RASTREADOR_DEVICE_ID), km);
  FrotaBlq_evento_({ veiculo: v, modo: 'ATIVO', tipo: 'HODOMETRO', acao: 'ACERTAR', origem: 'GESTAO', quem: sessao, http: r.http, resultado: r.ok ? 'OK' : 'FALHOU',
    detalhe: 'Hodômetro do rastreador de ' + de + ' para ' + Frota_kmTexto_(km) + ' km' + (motivo ? ' (' + motivo + ')' : '') + ': ' + (r.ok ? 'gravado (HTTP ' + r.http + ').' : 'não gravado, ' + r.motivo + '.') });
  if (!r.ok) throw new Error('O hodômetro não foi gravado: ' + r.motivo + '. Tente de novo em alguns minutos; o pedido ficou registrado.');
  FrotaBlq_gravarEstado_(est, { ODO_DIVERGENCIA_MOV_ID: '', ODO_ACERTO_EM: SGO_UTILS.nowIso(), ODO_ACERTO_POR: FrotaBlq_nome_(sessao), ODO_ACERTO_DE: atual === null ? '' : atual, ODO_ACERTO_PARA: km, ODO_ACERTO_REAL: 'SIM' });
  var aberta = FrotaBlq_movAbertaDoVeiculo_(v.ID);
  if (aberta && atual !== null && Rastreador_numOuNulo_(aberta.KM_RASTREADOR_SAIDA) !== null) {
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, aberta.ID, { KM_RASTREADOR_SAIDA: Rastreador_numOuNulo_(aberta.KM_RASTREADOR_SAIDA) + (km - atual) });
  }
  try { CacheService.getScriptCache().remove(RASTR_CACHE_POSICOES); } catch (eC) {}
  Frota_auditar_(sessao, { acao: 'RASTREADOR_HODOMETRO', veiculoId: v.ID, placa: v.PLACA, campo: 'HODOMETRO_RASTREADOR', antes: atual === null ? '' : atual, depois: km, justificativa: motivo,
    detalhe: 'Hodômetro do rastreador acertado de ' + de + ' para ' + Frota_kmTexto_(km) + ' km (KM do painel).' });
  return { ok: true, texto: 'Hodômetro do rastreador do ' + rot + ' acertado de ' + de + ' para ' + Frota_kmTexto_(km) + ' km.' };
}

function Frota_apiBloqueioAreaBase(sessionId, payload) {
  var sessao = FrotaBlq_exigirGestao_(sessionId);
  payload = payload || {};
  var base = typeof FrotaId_baseValida_ === 'function' ? FrotaId_baseValida_(payload.base) : FrotaBlq_s_(payload.base);
  if (!base) throw new Error('Escolha a base.');
  var areas = FrotaBlq_areas_();
  var lat, lon;
  if (payload.veiculoId) {
    var v = FrotaBlq_veiculo_(payload.veiculoId);
    var pos = FrotaBlq_posAgora_(FrotaBlq_cfg_(), v);
    if (!pos || pos.lat === null) throw new Error('O rastreador não tem a posição do ' + FrotaBlq_rotulo_(v) + ' agora. Informe a latitude e a longitude à mão.');
    lat = pos.lat; lon = pos.lon;
  } else {
    lat = Number(String(payload.lat).replace(',', '.')); lon = Number(String(payload.lon).replace(',', '.'));
  }
  if (payload.remover) { delete areas[base]; }
  else {
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Latitude e longitude inválidas (ex.: -16,6869 e -49,2648).');
    var raio = Number(payload.raioM) || FBLQ_RAIO_BASE_PADRAO_M;
    if (raio < 50 || raio > 3000) throw new Error('O raio da base vai de 50 a 3.000 metros.');
    areas[base] = { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, raioM: Math.round(raio) };
  }
  PropertiesService.getScriptProperties().setProperty(FBLQ_PROP_AREAS, JSON.stringify(areas));
  FrotaBlq_evento_({ veiculo: {}, tipo: 'DECISAO', acao: 'AREA_BASE', origem: 'GESTAO', quem: sessao, detalhe: 'Área da base ' + base + (payload.remover ? ' removida.' : ': centro ' + areas[base].lat + ', ' + areas[base].lon + ', raio ' + areas[base].raioM + ' m.') });
  return { ok: true, areas: areas, texto: payload.remover ? 'Área da base ' + base + ' removida.' : 'Área da base ' + base + ' gravada (raio de ' + areas[base].raioM + ' m).' };
}

function Frota_apiBloqueioIntegridade(sessionId) { FrotaBlq_exigirGestao_(sessionId); return Object.assign({ ok: true }, FrotaBlq_conferirIntegridade_()); }

// ------------------------------------------------------------
// PAINEL "BLOQUEIO DA PARTIDA"
// ------------------------------------------------------------
function FrotaBlq_textoPedido_(est) {
  if (!FrotaBlq_s_(est.PEDIDO_ACAO)) return '';
  var s = FrotaBlq_s_(est.PEDIDO_SITUACAO);
  var r = { AGUARDANDO: 'Bloqueio pedido', AGUARDANDO_GESTAO: 'Aguardando a decisão da gestão', AUTORIZADO: 'Bloqueio autorizado', NAO_BLOQUEAR: 'Gestão decidiu não bloquear' }[s] || s;
  return r + ' (' + FrotaBlq_s_(est.PEDIDO_ORIGEM).toLowerCase().replace(/_/g, ' ') + ', desde ' + FrotaBlq_txt_(FrotaBlq_ms_(est.PEDIDO_DESDE)) + ')' + (FrotaBlq_s_(est.PEDIDO_MOTIVO) ? ': ' + FrotaBlq_s_(est.PEDIDO_MOTIVO) : '');
}

function Frota_apiBloqueioPainel(sessionId, payload) {
  FrotaBlq_exigirGestao_(sessionId);
  payload = payload || {};
  var c = FrotaBlq_cfg_();
  var posicoes = (c.ligado && Rastreador_temCredencial_(c) ? Rastreador_posicoesGuardadas_(c, 900) : null) || {};
  var conexoes = c.ligado && Rastreador_temCredencial_(c) ? FrotaBlq_conexoes_(c, 120) : null;
  var estados = FrotaBlq_estados_();
  var areas = FrotaBlq_areas_();
  var agora = Date.now();
  var veics = Frota_veiculosComSituacao_().filter(function (v) { return FrotaBlq_s_(v.STATUS).toUpperCase() !== 'INATIVO' && FrotaBlq_s_(v.RASTREADOR_DEVICE_ID); })
    .sort(function (a, b) { return FrotaBlq_s_(a.PLACA).localeCompare(FrotaBlq_s_(b.PLACA)); });
  var perfil = FrotaBlq_perfil_(sessionId);
  var lista = veics.map(function (v) {
    var est = FrotaBlq_estadoDe_(v, estados);
    var me = FrotaBlq_modoEfetivo_(est.MODO, c);
    var pos = posicoes[FrotaBlq_s_(v.RASTREADOR_DEVICE_ID)] || null;
    var nb = FrotaBlq_naBase_(pos, areas);
    var tri = {}; try { tri = JSON.parse(FrotaBlq_s_(est.TRIAGEM_RESUMO) || '{}') || {}; } catch (e) {}
    var idade = pos && pos.quandoMs ? Math.round((agora - pos.quandoMs) / 60000) : null;
    var con = conexoes ? conexoes[FrotaBlq_s_(v.RASTREADOR_DEVICE_ID)] || null : null;
    return {
      veiculoId: FrotaBlq_s_(v.ID), placa: FrotaBlq_s_(v.PLACA), deviceId: FrotaBlq_s_(v.RASTREADOR_DEVICE_ID),
      modo: FrotaBlq_s_(est.MODO) || 'SIMULACAO', modoEfetivo: me.modo, modoAviso: me.motivo, modoPor: FrotaBlq_s_(est.MODO_POR), modoMotivo: FrotaBlq_s_(est.MODO_MOTIVO),
      triagem: FrotaBlq_triagemVale_(est), triagemAuto: FrotaBlq_s_(est.TRIAGEM) || 'SEM_DADOS', triagemManual: FrotaBlq_s_(est.TRIAGEM_MANUAL), triagemEm: FrotaBlq_txt_(FrotaBlq_ms_(est.TRIAGEM_EM)), triagemMotivo: tri.motivo || '', triagemLocais: tri.locais || [],
      responsavel: v.MOVIMENTACAO_ID ? FrotaBlq_s_(v.CONDUTOR_NOME) : '', movimentacaoId: FrotaBlq_s_(v.MOVIMENTACAO_ID), desde: v.MOVIMENTACAO_ID ? v.DATA_SAIDA + ' ' + v.HORA_SAIDA : '',
      releReal: FrotaBlq_s_(est.RELE_REAL), releRealEm: FrotaBlq_txt_(FrotaBlq_ms_(est.RELE_REAL_EM)), releSimulado: FrotaBlq_s_(est.RELE_SIMULADO),
      sinal: (FrotaBlq_conectado_(con, agora) ? 'conectado agora: ' : '') + FrotaBlq_textoConexao_(con, agora),
      ultimaPosicao: idade === null ? 'sem posição' : (idade <= 2 ? 'agora' : 'há ' + (typeof Frota_duracaoTexto_ === 'function' ? Frota_duracaoTexto_(idade) : idade + ' min') + (pos && pos.ignicao === false ? ' (carro desligado: o rastreador economiza e manda posição só quando liga)' : '')),
      situacaoCarro: pos ? Rastreador_movimento_(pos).texto : '', naBase: nb.naBase, baseTexto: nb.motivo,
      ultimoComando: FrotaBlq_s_(est.ULT_CMD_ACAO) ? (FrotaBlq_s_(est.ULT_CMD_REAL) === 'NAO' ? 'Simulado: ' : '') + FrotaBlq_s_(est.ULT_CMD_ACAO).toLowerCase() + ' às ' + FrotaBlq_txt_(FrotaBlq_ms_(est.ULT_CMD_EM)) + ' (' + FrotaBlq_s_(est.ULT_CMD_RESULTADO).toLowerCase().replace(/_/g, ' ') + ')' : '',
      pedido: FrotaBlq_textoPedido_(est), pedidoSituacao: FrotaBlq_s_(est.PEDIDO_SITUACAO),
      emergencia: FrotaBlq_ms_(est.EMERGENCIA_ATE) > agora ? 'Liberado em emergência por ' + FrotaBlq_s_(est.EMERGENCIA_POR) + ' até ' + FrotaBlq_txt_(FrotaBlq_ms_(est.EMERGENCIA_ATE)) + ': ' + FrotaBlq_s_(est.EMERGENCIA_MOTIVO) : '',
      odometroAtual: pos && pos.odometroKm !== null && pos.odometroKm !== undefined ? pos.odometroKm : null, kmPainel: Frota_num_(v.KM_ATUAL, 0),
      odoDivergencia: FrotaBlq_s_(est.ODO_DIVERGENCIA_MOV_ID) ? { painel: Frota_num_(est.ODO_PAINEL_KM, 0), rastreador: Frota_num_(est.ODO_RASTREADOR_KM, 0), foto: FrotaBlq_s_(est.ODO_FOTO), em: FrotaBlq_txt_(FrotaBlq_ms_(est.ODO_DIVERGENCIA_EM)) } : null,
      odoAcerto: FrotaBlq_s_(est.ODO_ACERTO_EM) ? (FrotaBlq_s_(est.ODO_ACERTO_REAL) === 'NAO' ? 'Simulado: ' : '') + 'acertado por ' + FrotaBlq_s_(est.ODO_ACERTO_POR) + ' em ' + FrotaBlq_txt_(FrotaBlq_ms_(est.ODO_ACERTO_EM)) + ' (' + (FrotaBlq_s_(est.ODO_ACERTO_DE) ? Frota_kmTexto_(est.ODO_ACERTO_DE) : '?') + ' para ' + Frota_kmTexto_(est.ODO_ACERTO_PARA) + ' km)' : '',
      esquecidaGestao: !!FrotaBlq_s_(est.ESQ_GESTAO_EM),
      esquecida: FrotaBlq_s_(est.ESQ_GESTAO_EM) ? 'Retirada esquecida: o condutor não respondeu desde ' + FrotaBlq_txt_(FrotaBlq_ms_(est.ESQ_PERGUNTA_EM)) : (FrotaBlq_s_(est.ESQ_PERGUNTA_EM) && !FrotaBlq_s_(est.ESQ_RESPOSTA) ? 'Pergunta ao condutor enviada às ' + FrotaBlq_hhmm_(FrotaBlq_ms_(est.ESQ_PERGUNTA_EM)) : '')
    };
  });
  var passagens = Frota_lerSeExistir_(FBLQ_ABA_PASSAGENS).filter(function (p) { return ['AGUARDANDO_RECEBEDOR', 'AGUARDANDO_ATUAL'].indexOf(FrotaBlq_s_(p.SITUACAO)) >= 0; }).map(function (p) {
    return { id: FrotaBlq_s_(p.ID), placa: FrotaBlq_s_(p.PLACA), veiculoId: FrotaBlq_s_(p.VEICULO_ID), de: FrotaBlq_s_(p.DE_NOME), para: FrotaBlq_s_(p.PARA_NOME), situacao: FrotaBlq_s_(p.SITUACAO),
      pedidoEm: FrotaBlq_txt_(FrotaBlq_ms_(p.CRIADO_EM)), km: FrotaBlq_s_(p.KM) };
  });
  var limite = Math.min(300, Number(payload.eventos) || 80);
  var eventos = Frota_lerSeExistir_(FBLQ_ABA_EVENTOS).slice(-limite).reverse().map(function (r) {
    return { quando: FrotaBlq_s_(r.QUANDO), placa: FrotaBlq_s_(r.PLACA), veiculoId: FrotaBlq_s_(r.VEICULO_ID), modo: FrotaBlq_s_(r.MODO), tipo: FrotaBlq_s_(r.TIPO), acao: FrotaBlq_s_(r.ACAO),
      quem: FrotaBlq_s_(r.QUEM_NOME), http: FrotaBlq_s_(r.HTTP), resultado: FrotaBlq_s_(r.RESULTADO), condicao: FrotaBlq_s_(r.CONDICAO), detalhe: FrotaBlq_s_(r.DETALHE) };
  });
  return {
    ok: true, agora: Rastreador_agoraTexto_(),
    config: { rastreadorLigado: c.ligado, chaveComandos: !!c.tokenComandos, bloqueioLigado: c.bloqueioPedido, podeEnviar: c.podeEnviar, faltas: c.faltasEnvio },
    perfil: perfil, podeLiberar: ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH'].indexOf(perfil) >= 0, podeRoubo: perfil === 'DIRETORIA', podeOdometro: FBLQ_ODO_PERFIS.indexOf(perfil) >= 0,
    modos: FBLQ_MODOS, veiculos: lista, passagens: passagens, eventos: eventos,
    bases: typeof FrotaId_bases_ === 'function' ? FrotaId_bases_() : [], areas: areas, raioPadrao: FBLQ_RAIO_BASE_PADRAO_M
  };
}

// ------------------------------------------------------------
// RELATÓRIO DIÁRIO DO PILOTO (18h, e-mail à gestão da Frota e à Diretoria)
// ------------------------------------------------------------
function FrotaBlq_relatorioTexto_(dia, eventos) {
  var doDia = (eventos || Frota_lerSeExistir_(FBLQ_ABA_EVENTOS)).filter(function (r) { return FrotaBlq_s_(r.QUANDO).slice(0, 10) === dia; });
  var reais = doDia.filter(function (r) { return r.TIPO === 'ENVIO'; });
  var sim = doDia.filter(function (r) { return r.TIPO === 'SIMULACAO'; });
  var dec = doDia.filter(function (r) { return ['DECISAO', 'EMERGENCIA', 'PASSAGEM', 'AVISO'].indexOf(r.TIPO) >= 0; });
  var linha = function (r) { return '- ' + FrotaBlq_s_(r.QUANDO).slice(11) + ' ' + (typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(FrotaBlq_s_(r.PLACA)) : FrotaBlq_s_(r.PLACA)) + ': ' + FrotaBlq_s_(r.DETALHE) + (r.HTTP ? ' (HTTP ' + r.HTTP + ')' : ''); };
  var t = 'Relatório do piloto do bloqueio da partida, ' + dia + '.\n\n' +
    'Comandos reais enviados: ' + reais.length + (reais.length ? '\n' + reais.map(linha).join('\n') : '') + '\n\n' +
    'O que a simulação teria feito (nada foi enviado): ' + sim.length + (sim.length ? '\n' + sim.map(linha).join('\n') : '') + '\n\n' +
    'Decisões, avisos, passagens e emergências: ' + dec.length + (dec.length ? '\n' + dec.map(linha).join('\n') : '') + '\n\n' +
    'Detalhe e registro completo: Frota > Rastreamento > Bloqueio da partida.';
  return { texto: t, reais: reais.length, simulados: sim.length, decisoes: dec.length, total: doDia.length };
}

function FrotaBlq_relatorioDiario_(forcar) {
  var agora = new Date();
  var hora = Number(Utilities.formatDate(agora, 'America/Sao_Paulo', 'HH'));
  var dia = Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy');
  var props = PropertiesService.getScriptProperties();
  if (!forcar && (hora < FBLQ_HORA_RELATORIO || props.getProperty(FBLQ_PROP_RELATORIO) === dia)) return null;
  props.setProperty(FBLQ_PROP_RELATORIO, dia);
  var r = FrotaBlq_relatorioTexto_(dia);
  var ids = [];
  try { ids = (typeof Rastreador_gestores_ === 'function' ? Rastreador_gestores_() : []).slice(); } catch (e) {}
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var p = FrotaBlq_s_(u.PERFIL).toUpperCase();
    if (FrotaBlq_s_(u.STATUS).toUpperCase() === 'ATIVO' && (p === 'DIRETORIA') && ids.indexOf(FrotaBlq_s_(u.ID)) < 0) ids.push(FrotaBlq_s_(u.ID));
  });
  if (ids.length && typeof SGO_notificar_ === 'function') {
    try { SGO_notificar_({ usuarios: ids, titulo: 'Bloqueio da partida: relatório do piloto de ' + dia, texto: r.texto, canais: ['email'], origem: 'FROTA', refId: 'BLQ:' + dia, evento: 'S65' }); }
    catch (e2) { console.error('Bloqueio, relatório: ' + ((e2 && e2.message) || e2)); }
  }
  return r;
}

function Frota_apiBloqueioRelatorio(sessionId, payload) {
  FrotaBlq_exigirGestao_(sessionId);
  var dia = FrotaBlq_s_(payload && payload.dia) || Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dia)) throw new Error('Informe o dia no formato dd/mm/aaaa.');
  return Object.assign({ ok: true, dia: dia }, FrotaBlq_relatorioTexto_(dia));
}

// ------------------------------------------------------------
// CELULAR: o que o condutor vê na tela inicial da Frota (apiInicioFrota)
// ------------------------------------------------------------
function FrotaBlq_inicio_(meuCondutor, emAndamento) {
  var out = { elegiveis: [], passagensParaMim: [], pedidosParaConfirmar: [], minhasEnviadas: [], perguntas: [] };
  try {
    out.elegiveis = FrotaBlq_elegiveis_().map(function (c) { return { id: c.id, nome: c.nome }; });
    if (!meuCondutor) return out;
    var meu = FrotaBlq_s_(meuCondutor.ID);
    Frota_lerSeExistir_(FBLQ_ABA_PASSAGENS).forEach(function (p) {
      var s = FrotaBlq_s_(p.SITUACAO);
      var item = { id: FrotaBlq_s_(p.ID), veiculoId: FrotaBlq_s_(p.VEICULO_ID), placa: FrotaBlq_s_(p.PLACA), de: FrotaBlq_s_(p.DE_NOME), para: FrotaBlq_s_(p.PARA_NOME), situacao: s };
      if (s === 'AGUARDANDO_RECEBEDOR' && FrotaBlq_s_(p.PARA_CONDUTOR_ID) === meu) out.passagensParaMim.push(item);
      else if (s === 'AGUARDANDO_ATUAL' && FrotaBlq_s_(p.DE_CONDUTOR_ID) === meu) out.pedidosParaConfirmar.push(item);
      else if ((s === 'AGUARDANDO_RECEBEDOR' && FrotaBlq_s_(p.DE_CONDUTOR_ID) === meu) || (s === 'AGUARDANDO_ATUAL' && FrotaBlq_s_(p.PARA_CONDUTOR_ID) === meu)) out.minhasEnviadas.push(item);
    });
    var estados = FrotaBlq_estados_();
    (emAndamento || []).filter(function (m) { return m.minha; }).forEach(function (m) {
      var e = estados[m.veiculoId];
      if (e && FrotaBlq_s_(e.ESQ_MOV_ID) === m.id && FrotaBlq_s_(e.ESQ_PERGUNTA_EM) && FrotaBlq_s_(e.ESQ_RESPOSTA) !== 'CONTINUAR') out.perguntas.push({ movimentacaoId: m.id, veiculoId: m.veiculoId, placa: m.veiculoPlaca });
    });
  } catch (e) { console.error('Bloqueio, início: ' + ((e && e.message) || e)); }
  return out;
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS / CAIXA DE DECISÕES
// ------------------------------------------------------------
function FrotaBlq_pendencias_(add) {
  if (!Pend_abaExiste_(FBLQ_ABA_ESTADO)) return;
  var rot = function (pl) { return typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(pl) : pl; };
  Pend_ler_(FBLQ_ABA_ESTADO).forEach(function (e) {
    var pl = Pend_s_(e.PLACA), r = rot(pl);
    if (Pend_s_(e.PEDIDO_SITUACAO) === 'AGUARDANDO_GESTAO') {
      add(Pend_item_('frota_bloqueio_decidir', { id: 'FROTA:BLQ:FORA:' + Pend_s_(e.ID) + ':' + Pend_s_(e.PEDIDO_DESDE), nome: r, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: Pend_s_(e.PEDIDO_DESDE).slice(0, 10),
        responsavel: 'Gestão da frota', titulo: 'Decidir o bloqueio: ' + r + ' devolvido fora da base', detalhe: Pend_s_(e.PEDIDO_MOTIVO),
        oQueFazer: 'Em Frota > Rastreamento > Bloqueio da partida, escolha "Bloquear" (sai só com o carro conectado, parado e desligado) ou "Não bloquear" (vale até a próxima retirada), com a justificativa.',
        textoEstavel: 'O bloqueio do veículo \'' + pl + '\' aguarda a decisão da gestão.' }));
    }
    if (Pend_s_(e.ESQ_GESTAO_EM)) {
      add(Pend_item_('frota_bloqueio_esquecida', { id: 'FROTA:BLQ:ESQ:' + Pend_s_(e.ESQ_MOV_ID), nome: r, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: Pend_s_(e.ESQ_GESTAO_EM).slice(0, 10),
        responsavel: 'Gestão da frota', titulo: 'Retirada esquecida: ' + r + ' parado na base sem resposta do condutor',
        detalhe: 'Carro parado na base desde ' + (FrotaBlq_txt_(FrotaBlq_ms_(e.ESQ_PARADO_DESDE)) || 'há mais de 2 h') + '; o condutor não respondeu à pergunta do SGO+.',
        oQueFazer: 'Em Frota > Rastreamento > Bloqueio da partida: "Encerrar a retirada" (só com o carro parado, desligado, na base e com sinal) ou autorize a passagem para quem precisa do carro.',
        textoEstavel: 'A retirada do veículo \'' + pl + '\' parece esquecida.' }));
    }
    if (Pend_s_(e.ULT_CMD_REAL) === 'SIM' && Pend_s_(e.ULT_CMD_RESULTADO) === 'NA_FILA' && Pend_s_(e.ULT_CMD_ACAO) === 'BLOQUEAR') {
      add(Pend_item_('frota_bloqueio_fila', { id: 'FROTA:BLQ:FILA:' + Pend_s_(e.ID) + ':' + Pend_s_(e.ULT_CMD_EM), nome: r, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: Pend_s_(e.ULT_CMD_EM).slice(0, 10),
        responsavel: 'Gestão da frota', titulo: 'Bloqueio na fila do rastreador: ' + r, detalhe: 'O carro estava sem conexão quando o bloqueio foi aceito (HTTP 202). Ele executa quando o carro reconectar; o SGO+ trata como não executado.',
        oQueFazer: 'Confira onde está o carro em Frota > Rastreamento. Se alguém vai usar o carro, a retirada manda a liberação logo depois.', textoEstavel: 'Há um bloqueio na fila do rastreador do veículo \'' + pl + '\'.' }));
    }
  });
  Pend_ler_(FBLQ_ABA_ESTADO).forEach(function (e) {
    if (!Pend_s_(e.ODO_DIVERGENCIA_MOV_ID)) return;
    var pl = Pend_s_(e.PLACA), r = rot(pl);
    add(Pend_item_('frota_bloqueio_odometro', { id: 'FROTA:BLQ:ODO:' + Pend_s_(e.ODO_DIVERGENCIA_MOV_ID), nome: r, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: Pend_s_(e.ODO_DIVERGENCIA_EM).slice(0, 10),
      responsavel: 'Gestão da frota', titulo: 'Odômetro do rastreador diferente do painel: ' + r,
      detalhe: 'Na devolução o painel marcava ' + Frota_kmTexto_(e.ODO_PAINEL_KM) + ' km e o rastreador ' + Frota_kmTexto_(e.ODO_RASTREADOR_KM) + ' km.' + (Pend_s_(e.ODO_FOTO) ? ' Foto do painel: ' + Pend_s_(e.ODO_FOTO) : ''),
      oQueFazer: 'Confira a foto do painel; se o KM digitado estiver certo, toque em "Acertar o odômetro do rastreador" em Frota > Rastreamento > Bloqueio da partida (Gestor ou Administrador). O SGO+ nunca acerta sozinho.',
      textoEstavel: 'O odômetro do rastreador do veículo \'' + pl + '\' está diferente do painel.' }));
  });
  if (!Pend_abaExiste_(FBLQ_ABA_PASSAGENS)) return;
  Pend_ler_(FBLQ_ABA_PASSAGENS).forEach(function (p) {
    if (Pend_s_(p.SITUACAO) !== 'AGUARDANDO_ATUAL') return;
    var pl = Pend_s_(p.PLACA), r = rot(pl);
    var uidDe = '';
    try { uidDe = FrotaBlq_usuarioDoCondutor_(Pend_s_(p.DE_CONDUTOR_ID)); } catch (e) {}
    add(Pend_item_('frota_bloqueio_passagem', { id: 'FROTA:BLQ:PASS:' + Pend_s_(p.ID), nome: r, publico: 'GESTAO', paraUsuarios: [uidDe], gravidade: 'ATENCAO', dias: null, vencimento: Pend_s_(p.CRIADO_EM).slice(0, 10),
      responsavel: 'Gestão da frota', titulo: Pend_s_(p.PARA_NOME) + ' pediu para assumir o ' + r, detalhe: 'O carro está com ' + Pend_s_(p.DE_NOME) + '.',
      oQueFazer: 'Autorize ou recuse em Frota > Rastreamento > Bloqueio da partida (se ' + Pend_s_(p.DE_NOME) + ' não conseguir confirmar no aplicativo).',
      oQueFazerOutro: 'Abra a Frota no SGO+ e toque em "Confirmar" se você passou o carro, ou "Recusar".', textoEstavel: 'Pedido para assumir o veículo \'' + pl + '\'.' }));
  });
}
