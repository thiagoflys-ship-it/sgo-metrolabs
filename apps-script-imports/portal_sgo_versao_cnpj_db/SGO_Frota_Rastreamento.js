/****************************************************
 * FROTA — RASTREAMENTO (20/10/2026)
 *
 * Amplia o rastreador (SGO_Frota_Rastreador.js: leitura da API, vínculo veículo x aparelho, KM por variação,
 * uso sem registro, ponto de chegada) com:
 *   1. Mapa ao vivo (só gestão): cor por situação, condutor da retirada aberta, km/h, última atualização.
 *      Com a tela aberta a leitura é a cada 30 s (limite da API para /positions); a rotina continua a cada 2 min.
 *   2. Rotas guardadas: cada posição lida vira um ponto da rota do veículo. No servidor próprio os pontos ficam
 *      numa tabela nativa do PostgreSQL (global SGO_ROTAS, src/compat/rotas.ts do sgo_servidor), não em aba de
 *      planilha (volume: um veículo gera milhares de pontos por mês). A rotina também importa a rota completa do
 *      período pelo /reports/route quando a API oferece (no máximo 2 veículos por rodada, um a cada 15 min);
 *      sem o relatório, a rota fica com os pontos das leituras.
 *      Retenção: RASTREADOR_RETENCAO_DIAS (padrão 90, a gestão muda na tela), apagamento automático diário.
 *   3. "Tráfego": a API do rastreador não informa trânsito. O SGO+ mostra o que os pontos permitem: excesso de
 *      velocidade, tempo em movimento x parado, paradas, horários de uso e uso fora do expediente.
 *   4. Combustível e KM: consumo (km/L) por veículo pelos abastecimentos (método do tanque cheio), comparado com
 *      a média do próprio veículo; litros acima da capacidade do tanque; abastecimento x posição do veículo no
 *      horário; KM rodado por veículo e por condutor; pedido de comprovante ao condutor (vira atividade em Minhas
 *      atividades: cobrança no sistema até anexar, e-mail no expediente, WhatsApp só no resumo do dia).
 *   5. Integrações: central de pendências, Programa de conduta (sugestões), ponte do COMMAND (frota.*).
 * Gantt, copiloto e relatórios A4: SGO_Frota_RastreamentoGestao.js. Tela: SGO_Frota_RastreamentoTela.js.
 *
 * LGPD: o dado é do veículo, não da pessoa. Só a gestão (ADMIN, GESTOR, DIRETORIA) vê localização e rotas; cada
 * consulta de mapa, rota ou relatório com localização fica na trilha de consultas (quem, quando, o quê). O
 * condutor é avisado na tela de retirada e no manual. Nada aqui manda comando ao veículo (a API é só leitura).
 ****************************************************/

var FROTAR_ABA_PEDIDOS = 'REG_FROTA_PEDIDO_COMPROVANTE';
var FROTAR_COLUNAS_PEDIDOS = ['ID', 'VEICULO_ID', 'PLACA', 'CONDUTOR_ID', 'CONDUTOR_NOME', 'USUARIO_ID', 'DATA_REF', 'VALOR_REF', 'MOTIVO', 'SITUACAO',
  'PRAZO', 'ATIVIDADE_ID', 'ABASTECIMENTO_ID', 'PEDIDO_POR_ID', 'PEDIDO_POR_NOME', 'PEDIDO_EM', 'ENVIADO_EM', 'CANCELADO_EM', 'CANCELADO_POR', 'CANCELADO_MOTIVO', 'CRIADO_EM'];
var FROTAR_ABA_CONSULTAS = 'REG_FROTA_RASTREADOR_CONSULTAS';
var FROTAR_COLUNAS_CONSULTAS = ['ID', 'QUANDO', 'USUARIO_ID', 'USUARIO_NOME', 'PERFIL', 'ACAO', 'VEICULO_ID', 'PLACA', 'PERIODO', 'ORIGEM', 'DETALHE', 'CRIADO_EM'];

var FROTAR_MAPA_INTERVALO_SEG = 30;        // tela do mapa aberta: no máximo uma leitura de /positions a cada 30 s (limite da API)
var FROTAR_SEM_SINAL_MIN = 30;             // posição mais velha que isso = "sem sinal" no mapa
var FROTAR_PARADA_MIN = 5;                 // parado por 5 min ou mais = parada
var FROTAR_SALTO_MAX_KMH = 250;            // trecho que exigiria mais que isso entre dois pontos = salto do GPS (fora da distância)
var FROTAR_EXCESSO_JUNTAR_MIN = 5;         // pontos acima do limite com menos de 5 min entre eles = um excesso só
var FROTAR_ROTA_IMPORTAR_MIN = 15;         // /reports/route de cada veículo no máximo a cada 15 min
var FROTAR_ROTA_POR_RODADA = 2;            // no máximo 2 veículos por rodada (2 req/s e orçamento da rodada)
var FROTAR_ROTA_PRIMEIRA_HORAS = 24;       // primeira importação: as últimas 24 h
var FROTAR_ROTA_MAX_PONTOS_TELA = 2500;    // desenho no mapa: pontos reduzidos a este número
var FROTAR_CONSULTA_MAPA_MIN = 30;         // trilha: uma linha por pessoa a cada 30 min de mapa aberto
var FROTAR_TANQUE_FOLGA = 1.05;            // litros acima de 105% da capacidade = conferir
var FROTAR_ABAST_JANELA_MIN = 40;          // abastecimento x posição: 40 min antes e depois da hora informada
var FROTAR_ABAST_PARADA_MIN = 3;           // parada mínima no horário do abastecimento
var FROTAR_CONSUMO_MIN_INTERVALOS = 3;     // média do veículo só com 3 intervalos entre abastecimentos
var FROTAR_CONSUMO_INTERVALO_MAX_KM = 3000; // intervalo maior que isso = abastecimento faltando (fora da média)
var FROTAR_CONSUMO_ESTRANHO_PCT = 40;      // um intervalo 40% pior que a média do veículo = abastecimento a conferir
var FROTAR_PRAZO_COMPROVANTE_DIAS = 2;
var FROTAR_FUSO_MIN = -180;                // Brasília (sem horário de verão desde 2019): UTC-3
var FROTAR_SISTEMA = { userId: '', usuario: 'sistema', nome: 'Rotina do rastreamento', perfil: 'SISTEMA' };

// ------------------------------------------------------------
// CONFIGURAÇÃO DA GESTÃO (tela Rastreamento > Configuração)
// ------------------------------------------------------------
function FrotaR_cfg_() {
  var p = PropertiesService.getScriptProperties();
  var g = function (k) { return String(p.getProperty(k) || '').trim(); };
  var num = function (k, pad, min, max) { var n = Number(g(k).replace(',', '.')); return isFinite(n) && g(k) !== '' && n >= min && n <= max ? n : pad; };
  var exp = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(g('FROTA_RASTR_EXPEDIENTE'));
  var ret = parseInt(g('RASTREADOR_RETENCAO_DIAS'), 10);
  return {
    retencaoDias: ret >= 7 && ret <= 1825 ? ret : (typeof RASTR_RETENCAO_PADRAO_DIAS !== 'undefined' ? RASTR_RETENCAO_PADRAO_DIAS : 90),
    limiteKmh: num('FROTA_RASTR_VEL_LIMITE', 110, 40, 160),
    expedienteInicio: exp ? exp[1] + ':' + exp[2] : '07:00',
    expedienteFim: exp ? exp[3] + ':' + exp[4] : '19:00',
    sabadoExpediente: g('FROTA_RASTR_SABADO') === '1',
    desvioConsumoPct: num('FROTA_CONSUMO_DESVIO_PCT', 15, 5, 60)
  };
}

function FrotaR_minutosDoTexto_(hhmm) { var m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }

// ------------------------------------------------------------
// TEMPO (Brasília, UTC-3 fixo) — sem depender do fuso do servidor
// ------------------------------------------------------------
function FrotaR_local_(ms) {
  var d = new Date(Number(ms) + FROTAR_FUSO_MIN * 60000);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), semana: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(),
    data: ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '/' + d.getUTCFullYear(),
    hora: ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2), iso: d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2) };
}
function FrotaR_textoMs_(ms) { if (!ms) return ''; var l = FrotaR_local_(ms); return l.data + ' ' + l.hora; }
/** "dd/mm/aaaa" + "hh:mm" (Brasília) -> ms UTC; null se inválido. */
function FrotaR_msDe_(data, hora) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(data || '').trim());
  if (!m) return null;
  var h = /^(\d{1,2}):(\d{2})$/.exec(String(hora || '00:00').trim());
  if (!h) return null;
  var ms = Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(h[1]), Number(h[2])) - FROTAR_FUSO_MIN * 60000;
  return isFinite(ms) ? ms : null;
}
function FrotaR_inicioDia_(data) { return FrotaR_msDe_(data, '00:00'); }
function FrotaR_fimDia_(data) { var i = FrotaR_inicioDia_(data); return i === null ? null : i + 86400000 - 1; }
function FrotaR_hojeBr_() { return FrotaR_local_(Date.now()).data; }
function FrotaR_diasAtrasBr_(n) { return FrotaR_local_(Date.now() - n * 86400000).data; }
/** "aaaa-mm" -> { de, ate } (dd/mm/aaaa) do mês inteiro. */
function FrotaR_mes_(comp) {
  var m = /^(\d{4})-(\d{2})$/.exec(String(comp || ''));
  if (!m) return null;
  var ano = Number(m[1]), mes = Number(m[2]);
  var ult = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { de: '01/' + m[2] + '/' + ano, ate: ('0' + ult).slice(-2) + '/' + m[2] + '/' + ano };
}
/** Período { de, ate } em dd/mm/aaaa -> { deMs, ateMs, texto }. Lança com orientação se inválido. */
function FrotaR_periodo_(de, ate, maxDias) {
  var a = FrotaR_inicioDia_(de), b = FrotaR_fimDia_(ate);
  if (a === null || b === null) throw new Error('Informe o período com as datas no formato dd/mm/aaaa (exemplo: 01/10/2026 a 31/10/2026) e tente de novo.');
  if (b < a) throw new Error('A data final (' + ate + ') está antes da inicial (' + de + '). Corrija o período e tente de novo.');
  if (maxDias && (b - a) > maxDias * 86400000) throw new Error('O período pode ter no máximo ' + maxDias + ' dias. Escolha um intervalo menor e tente de novo.');
  return { deMs: a, ateMs: b, de: de, ate: ate, texto: de + ' a ' + ate };
}

/** Dentro do expediente da frota? (dias úteis e faixa de horário da configuração; feriados do SGO+ quando existirem). */
function FrotaR_noExpediente_(ms, cfg) {
  var l = FrotaR_local_(ms);
  if (l.semana === 0) return false;
  if (l.semana === 6 && !cfg.sabadoExpediente) return false;
  // feriados do SGO+ (nacionais, móveis e cadastrados em Avisos e horários), lidos uma vez por dia analisado
  var dias = cfg._feriado || (cfg._feriado = {});
  if (dias[l.iso] === undefined) {
    dias[l.iso] = false;
    try {
      if (typeof SGO_expedienteMotivoDia_ === 'function' && typeof SGO_expediente_ === 'function') {
        var exp = cfg._exp || (cfg._exp = SGO_expediente_());
        dias[l.iso] = /feriad/i.test(String(SGO_expedienteMotivoDia_(l.iso, 1, exp) || ''));
      }
    } catch (e) {}
  }
  if (dias[l.iso]) return false;
  var ini = FrotaR_minutosDoTexto_(cfg.expedienteInicio), fim = FrotaR_minutosDoTexto_(cfg.expedienteFim);
  return l.min >= ini && l.min < fim;
}

// ------------------------------------------------------------
// ARMAZÉM DAS ROTAS (tabela nativa no servidor; ausente = rotas não guardadas)
// ------------------------------------------------------------
function FrotaR_armazem_() {
  return typeof SGO_ROTAS !== 'undefined' && SGO_ROTAS && typeof SGO_ROTAS.gravar === 'function' ? SGO_ROTAS : null;
}
var FROTAR_TEXTO_SEM_ARMAZEM = 'As rotas só ficam guardadas no servidor próprio do SGO+ (tabela própria no banco de dados). Nesta instalação, o mapa ao vivo funciona, mas o histórico de rotas não é gravado.';

/** km/h a partir da velocidade em nós da API (1 nó = 1,852 km/h), uma casa decimal. */
function FrotaR_kmh_(nos) {
  var n = Number(nos);
  if (nos === null || nos === undefined || nos === '' || !isFinite(n)) return null;
  return Math.round(n * 1.852 * 10) / 10;
}

/** Posição já convertida (Rastreador_posicao_) -> ponto do armazém. */
function FrotaR_ponto_(pos, veiculoId, fonte) {
  if (!pos || !pos.quandoMs || pos.lat === null || pos.lon === null || pos.lat === undefined || pos.lon === undefined) return null;
  if (pos.valida === false) return null;
  return { deviceId: String(pos.deviceId), veiculoId: String(veiculoId || ''), em: new Date(pos.quandoMs).toISOString(), lat: Number(pos.lat), lon: Number(pos.lon),
    kmh: pos.kmh === null || pos.kmh === undefined ? null : Number(pos.kmh), ignicao: pos.ignicao === true ? true : (pos.ignicao === false ? false : null),
    odometroKm: pos.odometroKm === null || pos.odometroKm === undefined ? null : Number(pos.odometroKm), endereco: String(pos.endereco || '').slice(0, 300), fonte: fonte || 'posicao' };
}

/** Grava as posições lidas (mapa deviceId -> posição). Nunca lança. */
function FrotaR_gravarPosicoes_(posicoes, veiculoPorDevice, fonte) {
  var arm = FrotaR_armazem_();
  if (!arm || !posicoes) return 0;
  var lista = [];
  Object.keys(posicoes).forEach(function (dev) {
    var v = veiculoPorDevice[dev];
    if (!v) return; // só aparelhos ligados a um veículo da frota
    var p = FrotaR_ponto_(posicoes[dev], v.ID, fonte);
    if (p) lista.push(p);
  });
  if (!lista.length) return 0;
  try { var r = arm.gravar(lista); return Number(r && r.inseridos) || 0; }
  catch (e) { console.error('Rotas: falha ao gravar posições: ' + ((e && e.message) || e)); return 0; }
}

function FrotaR_veiculosPorDevice_() {
  var out = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { var d = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID); if (d) out[d] = v; });
  return out;
}

/**
 * GET /reports/route (formato Traccar: lista de posições do período). Dependente de confirmação com a API real:
 * se a API não tiver o relatório (404), o SGO+ para de pedir por 24 h e a rota fica com os pontos das leituras.
 */
function FrotaR_lerRotaApi_(c, deviceId, deMs, ateMs) {
  var res = Rastreador_exigirOk_(Rastreador_chamar_(c, 'get', '/reports/route', [['deviceId', deviceId], ['from', new Date(deMs).toISOString()], ['to', new Date(ateMs).toISOString()]]), c, 'a rota do período');
  return Rastreador_lista_(res.j).filter(function (p) { return p && (p.deviceId === undefined || String(p.deviceId) === String(deviceId)); })
    .map(function (p) { if (p.deviceId === undefined) p.deviceId = deviceId; return Rastreador_posicao_(p); });
}

/** Rodada: importa a rota completa de até 2 veículos (um a cada 15 min). Devolve quantos pontos novos. */
function FrotaR_importarRotas_(c, veiculos, prazoMs) {
  var arm = FrotaR_armazem_();
  if (!arm) return { pontos: 0 };
  var props = PropertiesService.getScriptProperties();
  if (Number(props.getProperty('FROTA_RASTR_ROTA_SEM_RELATORIO_ATE') || 0) > Date.now()) return { pontos: 0, semRelatorio: true };
  var agora = Date.now(), feitos = 0, pontos = 0;
  var lista = veiculos.filter(function (v) { return SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID) && SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .map(function (v) { var k = 'FROTA_RASTR_ROTA_ATE_' + SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID); return { v: v, k: k, ate: Number(props.getProperty(k) || 0) }; })
    .sort(function (a, b) { return a.ate - b.ate; });
  for (var i = 0; i < lista.length && feitos < FROTAR_ROTA_POR_RODADA; i++) {
    if (Date.now() > prazoMs) break;
    var it = lista[i];
    if (it.ate && agora - it.ate < FROTAR_ROTA_IMPORTAR_MIN * 60000) continue;
    var de = it.ate ? it.ate - 60000 : agora - FROTAR_ROTA_PRIMEIRA_HORAS * 3600000;
    if (agora - de > 7 * 86400000) de = agora - 7 * 86400000;
    feitos++;
    try {
      var dev = SGO_UTILS.safe(it.v.RASTREADOR_DEVICE_ID);
      var lidas = FrotaR_lerRotaApi_(c, dev, de, agora);
      var pts = lidas.map(function (p) { return FrotaR_ponto_(p, it.v.ID, 'rota'); }).filter(Boolean);
      if (pts.length) { var r = arm.gravar(pts); pontos += Number(r && r.inseridos) || 0; }
      props.setProperty(it.k, String(agora));
    } catch (e) {
      if (e && e.rastreadorHttp === 404) { props.setProperty('FROTA_RASTR_ROTA_SEM_RELATORIO_ATE', String(agora + 86400000)); break; }
      if (e && e.rastreadorRede) break;
      props.setProperty(it.k, String(agora));
    }
  }
  return { pontos: pontos };
}

/** Chamado pela rodada do rastreador depois de ler /positions (nunca lança). */
function FrotaR_aposLeitura_(c, posicoes, veiculos, inicio) {
  try {
    var porDev = {};
    (veiculos || []).forEach(function (v) { var d = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID); if (d) porDev[d] = v; });
    var n = FrotaR_gravarPosicoes_(posicoes, porDev, 'posicao');
    var r = FrotaR_importarRotas_(c, veiculos || [], (inicio || Date.now()) + 40000);
    return { pontos: n + (r.pontos || 0) };
  } catch (e) { console.error('Rastreamento após leitura: ' + ((e && e.message) || e)); return { pontos: 0 }; }
}

/** Retenção: apaga os pontos de rota mais velhos que o prazo. Só o vencido. */
function FrotaR_limparRotas_(retencaoDias) {
  var arm = FrotaR_armazem_();
  if (!arm) return 0;
  var limite = new Date(Date.now() - retencaoDias * 86400000).toISOString();
  var r = arm.apagarAntes(limite);
  return Number(r && r.apagados) || 0;
}

// ------------------------------------------------------------
// ANÁLISE DA ROTA (função pura: pontos -> distância, paradas, excessos, horários)
// ------------------------------------------------------------
function FrotaR_rad_(g) { return g * Math.PI / 180; }
function FrotaR_distKm_(a, b) {
  var R = 6371.0088, dLat = FrotaR_rad_(b.lat - a.lat), dLon = FrotaR_rad_(b.lon - a.lon);
  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(FrotaR_rad_(a.lat)) * Math.cos(FrotaR_rad_(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
/** Parado? Mesma regra do rastreador: abaixo de 5 km/h; ignição desligada abaixo de 20 km/h é oscilação do GPS. */
function FrotaR_parado_(p) {
  var v = p.kmh === null || p.kmh === undefined ? 0 : Number(p.kmh);
  if (p.ignicao === false) return v < 20;
  return v < 5;
}

/**
 * pontos: [{ em (ISO), lat, lon, kmh, ignicao, endereco }] em qualquer ordem.
 * cfg: FrotaR_cfg_(). Devolve números já arredondados e listas para tela e relatório.
 */
function FrotaR_analisarRota_(pontos, cfg) {
  cfg = cfg || FrotaR_cfg_();
  var ps = (pontos || []).map(function (p) { return { ms: new Date(p.em).getTime(), lat: Number(p.lat), lon: Number(p.lon), kmh: p.kmh === null || p.kmh === undefined || p.kmh === '' ? null : Number(p.kmh), ignicao: p.ignicao, endereco: p.endereco || '' }; })
    .filter(function (p) { return isFinite(p.ms) && isFinite(p.lat) && isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180; })
    .sort(function (a, b) { return a.ms - b.ms; });
  var out = { pontos: ps.length, distanciaKm: 0, movimentoMin: 0, paradoMin: 0, ligadoParadoMin: 0, velMaxKmh: 0, excessos: [], paradas: [],
    foraExpediente: { km: 0, min: 0, trechos: [] }, inicio: ps.length ? ps[0].ms : 0, fim: ps.length ? ps[ps.length - 1].ms : 0, porDia: {}, saltosIgnorados: 0 };
  if (!ps.length) return FrotaR_fecharAnalise_(out);
  var paradaAtual = null, excessoAtual = null, foraAtual = null;
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i];
    var parado = FrotaR_parado_(p);
    if (p.kmh !== null && !parado && p.kmh > out.velMaxKmh) out.velMaxKmh = p.kmh;
    // excesso de velocidade (pontos acima do limite, juntando os próximos)
    if (p.kmh !== null && p.kmh > cfg.limiteKmh && !parado) {
      if (excessoAtual && p.ms - excessoAtual.fimMs <= FROTAR_EXCESSO_JUNTAR_MIN * 60000) { excessoAtual.fimMs = p.ms; if (p.kmh > excessoAtual.velMax) { excessoAtual.velMax = p.kmh; excessoAtual.lat = p.lat; excessoAtual.lon = p.lon; } }
      else { excessoAtual = { inicioMs: p.ms, fimMs: p.ms, velMax: p.kmh, lat: p.lat, lon: p.lon }; out.excessos.push(excessoAtual); }
    }
    if (i === 0) { if (parado) paradaAtual = { inicioMs: p.ms, fimMs: p.ms, lat: p.lat, lon: p.lon, endereco: p.endereco, ligado: p.ignicao === true }; continue; }
    var a = ps[i - 1];
    var dt = (p.ms - a.ms) / 60000;
    var d = FrotaR_distKm_(a, p);
    var salto = dt > 0 ? d / (dt / 60) > FROTAR_SALTO_MAX_KMH : d > 0.5;
    if (salto) out.saltosIgnorados++;
    var aParado = FrotaR_parado_(a);
    var trechoParado = aParado && parado;
    if (!salto && !trechoParado) out.distanciaKm += d;
    // tempo: o intervalo vale o estado do ponto anterior (lacunas maiores que 30 min só contam se os dois lados estão parados)
    if (dt > 0 && (dt <= 30 || trechoParado)) {
      if (aParado) { out.paradoMin += dt; if (a.ignicao === true) out.ligadoParadoMin += dt; } else out.movimentoMin += dt;
      var dia = FrotaR_local_(a.ms).data;
      var pd = out.porDia[dia] || (out.porDia[dia] = { km: 0, movimentoMin: 0 });
      if (!aParado) pd.movimentoMin += dt;
      if (!salto && !trechoParado) pd.km += d;
      // fora do expediente: só o tempo e o km em movimento
      if (!aParado && !FrotaR_noExpediente_(a.ms, cfg)) {
        out.foraExpediente.min += dt;
        if (!salto) out.foraExpediente.km += d;
        if (foraAtual && a.ms - foraAtual.fimMs <= 20 * 60000) { foraAtual.fimMs = p.ms; foraAtual.km += salto ? 0 : d; }
        else { foraAtual = { inicioMs: a.ms, fimMs: p.ms, km: salto ? 0 : d }; out.foraExpediente.trechos.push(foraAtual); }
      }
    }
    // paradas
    if (parado) {
      if (!paradaAtual) paradaAtual = { inicioMs: p.ms, fimMs: p.ms, lat: p.lat, lon: p.lon, endereco: p.endereco, ligado: p.ignicao === true };
      else { paradaAtual.fimMs = p.ms; if (!paradaAtual.endereco && p.endereco) paradaAtual.endereco = p.endereco; }
    } else if (paradaAtual) {
      paradaAtual.fimMs = p.ms; // o veículo saiu neste ponto
      if (paradaAtual.fimMs - paradaAtual.inicioMs >= FROTAR_PARADA_MIN * 60000) out.paradas.push(paradaAtual);
      paradaAtual = null;
    }
  }
  if (paradaAtual && paradaAtual.fimMs - paradaAtual.inicioMs >= FROTAR_PARADA_MIN * 60000) { paradaAtual.ultima = true; out.paradas.push(paradaAtual); }
  out._ps = ps;
  return FrotaR_fecharAnalise_(out);
}

function FrotaR_fecharAnalise_(out) {
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  out.distanciaKm = r1(out.distanciaKm);
  out.movimentoMin = Math.round(out.movimentoMin); out.paradoMin = Math.round(out.paradoMin); out.ligadoParadoMin = Math.round(out.ligadoParadoMin);
  out.velMaxKmh = Math.round(out.velMaxKmh);
  out.excessos = out.excessos.map(function (e) { return { inicio: FrotaR_textoMs_(e.inicioMs), fim: FrotaR_textoMs_(e.fimMs), inicioMs: e.inicioMs, duracaoMin: Math.max(1, Math.round((e.fimMs - e.inicioMs) / 60000)), velMaxKmh: Math.round(e.velMax), lat: e.lat, lon: e.lon }; });
  out.paradas = out.paradas.map(function (p) { return { inicio: FrotaR_textoMs_(p.inicioMs), fim: p.ultima ? '' : FrotaR_textoMs_(p.fimMs), inicioMs: p.inicioMs, fimMs: p.fimMs, duracaoMin: Math.round((p.fimMs - p.inicioMs) / 60000), lat: p.lat, lon: p.lon, endereco: p.endereco || '', ligado: !!p.ligado, emCurso: !!p.ultima }; });
  out.foraExpediente = { km: r1(out.foraExpediente.km), min: Math.round(out.foraExpediente.min), trechos: out.foraExpediente.trechos.map(function (t) { return { inicio: FrotaR_textoMs_(t.inicioMs), fim: FrotaR_textoMs_(t.fimMs), inicioMs: t.inicioMs, fimMs: t.fimMs, km: r1(t.km), duracaoMin: Math.max(1, Math.round((t.fimMs - t.inicioMs) / 60000)) }; }) };
  Object.keys(out.porDia).forEach(function (k) { out.porDia[k] = { km: r1(out.porDia[k].km), movimentoMin: Math.round(out.porDia[k].movimentoMin) }; });
  out.inicioTexto = FrotaR_textoMs_(out.inicio); out.fimTexto = FrotaR_textoMs_(out.fim);
  return out;
}

/** Pontos reduzidos para o desenho (mantém início, fim, paradas e o ponto mais rápido de cada trecho). */
function FrotaR_reduzir_(ps, max) {
  if (!ps || ps.length <= max) return ps || [];
  var passo = ps.length / max, out = [];
  for (var i = 0; i < max; i++) {
    var ini = Math.floor(i * passo), fim = Math.min(ps.length, Math.floor((i + 1) * passo));
    var melhor = ps[ini];
    for (var k = ini; k < fim; k++) if ((ps[k].kmh || 0) > (melhor.kmh || 0)) melhor = ps[k];
    out.push(melhor);
  }
  if (out[out.length - 1] !== ps[ps.length - 1]) out.push(ps[ps.length - 1]);
  return out;
}

// ------------------------------------------------------------
// ACESSO E TRILHA DE CONSULTAS (LGPD)
// ------------------------------------------------------------
function FrotaR_exigirGestao_(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) {
    throw new Error('Localização, mapa e rotas dos veículos são só da gestão (Administrador, Gestor ou Diretoria): é o que a política de privacidade da frota garante a quem dirige. Para retirar e devolver o veículo, use a aba Situação e retiradas; em caso de dúvida, procure a gestão.');
  }
  Frota_bootstrap_();
  return sessao;
}

function FrotaR_garantirAbas_() {
  CertCal_garantirTabela_(FROTAR_ABA_PEDIDOS, FROTAR_COLUNAS_PEDIDOS);
  CertCal_garantirTabela_(FROTAR_ABA_CONSULTAS, FROTAR_COLUNAS_CONSULTAS);
  CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, 'HORA');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, 'ORIGEM');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, 'PEDIDO_ID');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_VEICULOS, 'CAPACIDADE_TANQUE_L');
}

/**
 * Trilha de quem consultou localização. acao: MAPA, ROTA_VEICULO, ROTA_RETIRADA, RELATORIO, COMMAND_MAPA...
 * O mapa aberto grava uma linha por pessoa a cada 30 min (não uma por atualização).
 */
function FrotaR_registrarConsulta_(sessao, acao, o) {
  o = o || {};
  try {
    if (acao === 'MAPA' || acao === 'COMMAND_MAPA') {
      var k = 'FROTAR_CONSULTA_' + acao + '_' + SGO_UTILS.safe(sessao && sessao.userId);
      var cache = CacheService.getScriptCache();
      if (cache.get(k)) return false;
      cache.put(k, '1', FROTAR_CONSULTA_MAPA_MIN * 60);
    }
    FrotaR_garantirAbas_();
    SGO_DATA.insert(FROTAR_ABA_CONSULTAS, SGO_DATA.normalizarObjetoParaSheet(FROTAR_ABA_CONSULTAS, SGO_DATA.gerarRegistroBase({
      QUANDO: FrotaR_textoMs_(Date.now()), USUARIO_ID: SGO_UTILS.safe(sessao && sessao.userId), USUARIO_NOME: SGO_UTILS.safe(sessao && (sessao.nome || sessao.usuario)),
      PERFIL: SGO_UTILS.safeUpper(sessao && sessao.perfil), ACAO: acao, VEICULO_ID: o.veiculoId || '', PLACA: o.placa || '', PERIODO: o.periodo || '', ORIGEM: o.origem || 'SGO+',
      DETALHE: String(o.detalhe || '').slice(0, 500)
    })));
    return true;
  } catch (e) { console.error('Trilha de consultas: ' + ((e && e.message) || e)); return false; }
}

var FROTAR_ACOES_CONSULTA = { MAPA: 'Abriu o mapa ao vivo', ROTA_VEICULO: 'Consultou a rota do veículo', ROTA_RETIRADA: 'Consultou a rota da retirada', RELATORIO: 'Gerou relatório com localização',
  COMMAND_MAPA: 'Abriu a frota no COMMAND', CONFIG: 'Mudou a configuração do rastreamento', ABAST_POSICAO: 'Conferiu abastecimento x posição' };

function Frota_apiRastrConsultas(sessionId, payload) {
  FrotaR_exigirGestao_(sessionId);
  FrotaR_garantirAbas_();
  var lista = Frota_lerSeExistir_(FROTAR_ABA_CONSULTAS).sort(function (a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); }).slice(0, 200);
  return { ok: true, itens: lista.map(function (x) {
    return { quando: SGO_UTILS.safe(x.QUANDO), quem: SGO_UTILS.safe(x.USUARIO_NOME), perfil: SGO_UTILS.safe(x.PERFIL), acao: FROTAR_ACOES_CONSULTA[SGO_UTILS.safeUpper(x.ACAO)] || SGO_UTILS.safe(x.ACAO),
      placa: SGO_UTILS.safe(x.PLACA), periodo: SGO_UTILS.safe(x.PERIODO), origem: SGO_UTILS.safe(x.ORIGEM), detalhe: SGO_UTILS.safe(x.DETALHE) };
  }) };
}

// ------------------------------------------------------------
// MAPA AO VIVO
// ------------------------------------------------------------
var FROTAR_SITUACOES = {
  EM_USO: { rotulo: 'Em uso (retirada registrada)', cor: '#1f5fa8' },
  USO_SEM_REGISTRO: { rotulo: 'Andando sem retirada registrada', cor: '#a61b1b' },
  IGNICAO_LIGADA: { rotulo: 'Ignição ligada, parado, sem retirada', cor: '#c98a12' },
  PARADO: { rotulo: 'Parado', cor: '#1d6b3f' },
  SEM_SINAL: { rotulo: 'Sem sinal recente', cor: '#7b8794' }
};

/** Situação do veículo no mapa. pos: posição convertida; aberta: retirada aberta (ou null). */
function FrotaR_situacaoMapa_(pos, aberta, agoraMs) {
  if (!pos || !pos.quandoMs || (agoraMs - pos.quandoMs) > FROTAR_SEM_SINAL_MIN * 60000 || pos.lat === null) return 'SEM_SINAL';
  if (aberta) return 'EM_USO';
  var mv = Rastreador_movimento_(pos);
  if (mv.estado === 'ANDANDO') return 'USO_SEM_REGISTRO';
  if (mv.estado === 'LIGADO') return 'IGNICAO_LIGADA';
  return 'PARADO';
}

function FrotaR_estadoRastreador_() {
  var c = Rastreador_cfg_();
  var configurado = Rastreador_temCredencial_(c);
  var msg = '';
  if (!configurado) msg = 'Rastreador não configurado: falta a chave de acesso. Quem configura é o responsável pelo sistema, em Configurações > Chaves e senhas > Rastreador da frota (grave a "Chave de acesso (Bearer)" e clique em Testar conexão). Depois volte aqui e clique em Atualizar.';
  else if (!c.ligado) msg = 'Rastreador desligado no SGO+: a chave está gravada, mas a leitura está desligada. O responsável pelo sistema liga em Configurações > Chaves e senhas > Rastreador da frota ("Rastreador ligado no SGO+" = Ligado). Depois volte aqui e clique em Atualizar.';
  return { c: c, pronto: configurado && c.ligado, configurado: configurado, ligado: c.ligado, mensagem: msg };
}

/** Lê as posições para o mapa: guardadas de até 30 s, senão uma leitura nova (se o limite da API deixar). */
function FrotaR_posicoesParaMapa_(c) {
  var guardadas = Rastreador_posicoesGuardadas_(c, FROTAR_MAPA_INTERVALO_SEG);
  if (guardadas) return { posicoes: guardadas, nova: false };
  try {
    var mapa = Rastreador_lerPosicoes_(c, '', {});
    try { Rastreador_conexaoOk_(); } catch (e0) {}
    try { FrotaR_gravarPosicoes_(mapa, FrotaR_veiculosPorDevice_(), 'mapa'); } catch (e1) {}
    return { posicoes: mapa, nova: true };
  } catch (e) {
    var g = Rastreador_posicoesGuardadas_(c, 900);
    // outra tela (ou a rotina) está lendo agora: espera até 4 s pela leitura dela, sem chamar a API de novo
    for (var t = 0; !g && e && e.rastreadorIntervalo && t < 8; t++) { Utilities.sleep(500); g = Rastreador_posicoesGuardadas_(c, 900); }
    if (g) return { posicoes: g, nova: false, aviso: e && e.rastreadorIntervalo ? '' : 'Última leitura não deu certo (' + Rastreador_limpar_(e && e.message, c) + '); o mapa mostra a leitura anterior.' };
    if (e && e.rastreadorIntervalo) return { posicoes: {}, nova: false, aviso: 'A primeira leitura do rastreador ainda está chegando; o mapa se atualiza sozinho em 30 segundos.' };
    throw new Error('Não foi possível ler o rastreador agora: ' + Rastreador_limpar_(e && e.message, c) + '. O mapa tenta de novo sozinho em 30 segundos.');
  }
}

function Frota_apiRastrMapa(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  var est = FrotaR_estadoRastreador_();
  var out = { ok: true, pronto: est.pronto, configurado: est.configurado, ligado: est.ligado, mensagem: est.mensagem, intervaloSeg: FROTAR_MAPA_INTERVALO_SEG,
    situacoes: FROTAR_SITUACOES, veiculos: [], aviso: '', atualizadoEm: FrotaR_textoMs_(Date.now()), rotasGuardadas: !!FrotaR_armazem_(), retencaoDias: FrotaR_cfg_().retencaoDias };
  if (!est.pronto) return out;
  var lido = FrotaR_posicoesParaMapa_(est.c);
  out.aviso = lido.aviso || '';
  FrotaR_registrarConsulta_(sessao, 'MAPA', { detalhe: 'Mapa ao vivo da frota' });
  out.veiculos = FrotaR_veiculosMapa_(lido.posicoes);
  return out;
}

/** Lista dos veículos para o mapa (também usada pela ponte do COMMAND). */
function FrotaR_veiculosMapa_(posicoes) {
  var agora = Date.now();
  var alertas = {};
  try { Rastreador_alertasAbertos_().forEach(function (a) { if (SGO_UTILS.safeUpper(a.TIPO) === 'USO_SEM_REGISTRO') alertas[SGO_UTILS.safe(a.VEICULO_ID)] = a; }); } catch (e) {}
  return Frota_veiculosComSituacao_().filter(function (v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO' && SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID); })
    .sort(function (a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); })
    .map(function (v) {
      var pos = (posicoes || {})[SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID)] || null;
      var aberta = !!v.MOVIMENTACAO_ID;
      var sit = FrotaR_situacaoMapa_(pos, aberta, agora);
      var mv = pos ? Rastreador_movimento_(pos) : null;
      return {
        id: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), situacao: sit, situacaoTexto: FROTAR_SITUACOES[sit].rotulo, cor: FROTAR_SITUACOES[sit].cor,
        condutorNome: aberta ? SGO_UTILS.safe(v.CONDUTOR_NOME) : '', retiradaDesde: aberta ? (SGO_UTILS.safe(v.DATA_SAIDA) + ' ' + SGO_UTILS.safe(v.HORA_SAIDA)).trim() : '',
        finalidade: aberta ? SGO_UTILS.safe(v.FINALIDADE) : '',
        lat: pos && pos.lat !== null ? pos.lat : null, lon: pos && pos.lon !== null ? pos.lon : null, kmh: pos ? pos.kmh : null,
        ignicao: pos ? pos.ignicao : null, estadoTexto: mv ? mv.texto : 'sem posição', local: pos ? Rastreador_localTexto_(pos) : '',
        atualizadoEm: pos ? pos.quandoTexto : '', idadeMin: pos && pos.quandoMs ? Math.max(0, Math.round((agora - pos.quandoMs) / 60000)) : null,
        alertaUsoSemRegistro: !!alertas[SGO_UTILS.safe(v.ID)]
      };
    });
}

// ------------------------------------------------------------
// ROTAS (por veículo e período, ou por retirada)
// ------------------------------------------------------------
/** Pontos do armazém + análise. Lança com orientação quando não há armazém. */
function FrotaR_rotaDe_(veiculoId, deMs, ateMs, cfg) {
  var arm = FrotaR_armazem_();
  if (!arm) throw new Error(FROTAR_TEXTO_SEM_ARMAZEM);
  var pts = arm.ler({ veiculoId: veiculoId, de: new Date(deMs).toISOString(), ate: new Date(ateMs).toISOString(), limite: 60000 }) || [];
  var an = FrotaR_analisarRota_(pts, cfg || FrotaR_cfg_());
  var desenho = FrotaR_reduzir_(an._ps || [], FROTAR_ROTA_MAX_PONTOS_TELA).map(function (p) { return [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lon * 1e6) / 1e6, p.kmh === null ? null : Math.round(p.kmh), p.ms]; });
  delete an._ps;
  an.desenho = desenho;
  return an;
}

/** Período da retirada em ms (hora digitada ou do registro, o mais largo; em andamento = até agora). */
function FrotaR_periodoMov_(m) {
  var per = Rastreador_periodoRetirada_(m);
  var ate = SGO_UTILS.safeUpper(m.STATUS) === 'EM_ANDAMENTO' ? Date.now() : per.ate.getTime();
  return { deMs: per.de.getTime(), ateMs: ate };
}

function FrotaR_condutores_() {
  var out = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { out[SGO_UTILS.safe(c.ID)] = c; });
  return out;
}

/** Atendimentos do Auvo do condutor no período (check-in/check-out) com o deslocamento até cada um, pela rota. */
function FrotaR_atendimentosAuvo_(usuarioId, deMs, ateMs, an) {
  if (!usuarioId || !SGO_CFG.SHEETS.AUVO_TAREFAS) return [];
  var ps = an && an._todos ? an._todos : null;
  var lista = [];
  Frota_lerSeExistir_(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function (t) {
    if (SGO_UTILS.safe(t.TECNICO_ID_SGO) !== String(usuarioId)) return;
    var ci = FrotaR_msAuvo_(t.CHECKIN_EM);
    if (ci === null || ci < deMs || ci > ateMs) return;
    lista.push({ os: SGO_UTILS.safe(t.AUVO_TASK_ID), cliente: SGO_UTILS.safe(t.CLIENTE_NOME_AUVO), endereco: SGO_UTILS.safe(t.ENDERECO), checkinMs: ci, checkoutMs: FrotaR_msAuvo_(t.CHECKOUT_EM) });
  });
  lista.sort(function (a, b) { return a.checkinMs - b.checkinMs; });
  var anterior = deMs;
  return lista.map(function (x) {
    var km = null;
    if (ps && ps.length) {
      var trecho = ps.filter(function (p) { return p.ms >= anterior && p.ms <= x.checkinMs; });
      var d = 0;
      for (var i = 1; i < trecho.length; i++) if (!(FrotaR_parado_(trecho[i - 1]) && FrotaR_parado_(trecho[i]))) d += FrotaR_distKm_(trecho[i - 1], trecho[i]);
      km = trecho.length > 1 ? Math.round(d * 10) / 10 : null;
    }
    var r = { os: x.os, cliente: x.cliente, endereco: x.endereco, checkin: FrotaR_textoMs_(x.checkinMs), checkout: x.checkoutMs ? FrotaR_textoMs_(x.checkoutMs) : '',
      deslocamentoMin: Math.round((x.checkinMs - anterior) / 60000), deslocamentoKm: km };
    anterior = x.checkoutMs && x.checkoutMs > x.checkinMs ? x.checkoutMs : x.checkinMs;
    return r;
  });
}
/** Data do Auvo ("2026-10-19T08:30:00", sem fuso = horário de Brasília). */
function FrotaR_msAuvo_(v) {
  var s = String(v || '').trim();
  if (!s) return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?/.exec(s);
  if (!m) { var d = new Date(s).getTime(); return isFinite(d) ? d : null; }
  if (m[7]) { var t = new Date(s).getTime(); return isFinite(t) ? t : null; }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0)) - FROTAR_FUSO_MIN * 60000;
}

/** Rota de uma retirada: análise + dados da retirada + atendimentos do Auvo. Sem trilha (quem chama registra). */
function FrotaR_rotaRetirada_(movId, cfg) {
  var m = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, SGO_UTILS.safe(movId));
  if (!m) throw new Error('Retirada não encontrada. Atualize a lista de retiradas e escolha de novo.');
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, SGO_UTILS.safe(m.VEICULO_ID)) || {};
  var per = FrotaR_periodoMov_(m);
  cfg = cfg || FrotaR_cfg_();
  var arm = FrotaR_armazem_();
  if (!arm) throw new Error(FROTAR_TEXTO_SEM_ARMAZEM);
  var pts = arm.ler({ veiculoId: SGO_UTILS.safe(v.ID), de: new Date(per.deMs).toISOString(), ate: new Date(per.ateMs).toISOString(), limite: 60000 }) || [];
  var an = FrotaR_analisarRota_(pts, cfg);
  an._todos = an._ps;
  var cnd = FrotaR_condutores_()[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
  var atend = FrotaR_atendimentosAuvo_(SGO_UTILS.safe(cnd.USUARIO_ID), per.deMs, per.ateMs, an);
  an.desenho = FrotaR_reduzir_(an._ps || [], FROTAR_ROTA_MAX_PONTOS_TELA).map(function (p) { return [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lon * 1e6) / 1e6, p.kmh === null ? null : Math.round(p.kmh), p.ms]; });
  delete an._ps; delete an._todos;
  var ks = Frota_num_(m.KM_SAIDA, NaN), kc = Frota_num_(m.KM_CHEGADA, NaN);
  return { mov: m, veiculo: v, condutor: cnd, analise: an, atendimentos: atend,
    retirada: { id: SGO_UTILS.safe(m.ID), placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), condutor: SGO_UTILS.safe(cnd.NOME) || 'Condutor não localizado',
      saida: (Frota_textoData_(m.DATA_SAIDA) + ' ' + Frota_textoHora_(m.HORA_SAIDA)).trim(), chegada: SGO_UTILS.safe(m.DATA_CHEGADA) ? (Frota_textoData_(m.DATA_CHEGADA) + ' ' + Frota_textoHora_(m.HORA_CHEGADA)).trim() : 'em andamento',
      finalidade: SGO_UTILS.safe(m.FINALIDADE), kmSaida: isFinite(ks) ? ks : null, kmChegada: isFinite(kc) ? kc : null, kmInformado: isFinite(ks) && isFinite(kc) ? kc - ks : null,
      kmRastreador: Rastreador_numOuNulo_(m.KM_RASTREADOR_RODADO), situacao: SGO_UTILS.safeUpper(m.STATUS) },
    periodo: { deMs: per.deMs, ateMs: per.ateMs, texto: FrotaR_textoMs_(per.deMs) + ' a ' + FrotaR_textoMs_(per.ateMs) } };
}

function Frota_apiRastrRota(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  var cfg = FrotaR_cfg_();
  if (SGO_UTILS.safe(payload.movimentacaoId)) {
    var r = FrotaR_rotaRetirada_(payload.movimentacaoId, cfg);
    FrotaR_registrarConsulta_(sessao, 'ROTA_RETIRADA', { veiculoId: SGO_UTILS.safe(r.veiculo.ID), placa: r.retirada.placa, periodo: r.periodo.texto, detalhe: 'Retirada de ' + r.retirada.condutor });
    return { ok: true, tipo: 'RETIRADA', retirada: r.retirada, analise: r.analise, atendimentos: r.atendimentos, periodo: r.periodo.texto, limiteKmh: cfg.limiteKmh,
      vazio: !r.analise.pontos ? 'Nenhum ponto de rota guardado neste período. A rota só existe depois que o rastreador foi ligado e o aparelho foi ligado ao veículo; pontos com mais de ' + cfg.retencaoDias + ' dias são apagados.' : '' };
  }
  var v = Rastreador_veiculo_(payload.veiculoId);
  var per = FrotaR_periodo_(payload.de, payload.ate, 31);
  var an = FrotaR_rotaDe_(SGO_UTILS.safe(v.ID), per.deMs, per.ateMs, cfg);
  FrotaR_registrarConsulta_(sessao, 'ROTA_VEICULO', { veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), periodo: per.texto });
  return { ok: true, tipo: 'VEICULO', placa: SGO_UTILS.safe(v.PLACA), analise: an, periodo: per.texto, limiteKmh: cfg.limiteKmh,
    vazio: !an.pontos ? 'Nenhum ponto de rota guardado para o veículo ' + v.PLACA + ' neste período. Confira se o aparelho está ligado ao veículo (aba Aparelhos e alertas) e lembre que pontos com mais de ' + cfg.retencaoDias + ' dias são apagados.' : '' };
}

/** Retiradas de um veículo (ou de todos) num período, para escolher qual rota ver. Sem localização. */
function Frota_apiRastrRetiradas(sessionId, payload) {
  FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  var per = FrotaR_periodo_(payload.de || FrotaR_diasAtrasBr_(30), payload.ate || FrotaR_hojeBr_(), 400);
  var vid = SGO_UTILS.safe(payload.veiculoId);
  var cnd = FrotaR_condutores_();
  var vs = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { vs[SGO_UTILS.safe(v.ID)] = v; });
  var itens = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(function (m) {
    if (vid && SGO_UTILS.safe(m.VEICULO_ID) !== vid) return false;
    var p = FrotaR_periodoMov_(m);
    return p.deMs <= per.ateMs && p.ateMs >= per.deMs;
  }).map(function (m) {
    var p = FrotaR_periodoMov_(m);
    return { id: SGO_UTILS.safe(m.ID), placa: SGO_UTILS.safe((vs[SGO_UTILS.safe(m.VEICULO_ID)] || {}).PLACA), condutor: SGO_UTILS.safe((cnd[SGO_UTILS.safe(m.CONDUTOR_ID)] || {}).NOME),
      saida: FrotaR_textoMs_(p.deMs), chegada: SGO_UTILS.safeUpper(m.STATUS) === 'EM_ANDAMENTO' ? 'em andamento' : FrotaR_textoMs_(p.ateMs), inicioMs: p.deMs,
      km: isFinite(Frota_num_(m.KM_CHEGADA, NaN) - Frota_num_(m.KM_SAIDA, NaN)) ? Frota_num_(m.KM_CHEGADA, 0) - Frota_num_(m.KM_SAIDA, 0) : null, finalidade: SGO_UTILS.safe(m.FINALIDADE) };
  }).sort(function (a, b) { return b.inicioMs - a.inicioMs; }).slice(0, 300);
  return { ok: true, itens: itens };
}

// ------------------------------------------------------------
// COMBUSTÍVEL E KM
// ------------------------------------------------------------
function FrotaR_abastecimentos_(veiculoId) {
  return Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO).filter(function (a) { return !veiculoId || SGO_UTILS.safe(a.VEICULO_ID) === veiculoId; });
}

/**
 * Consumo pelo método do tanque cheio: cada abastecimento fecha o intervalo desde o anterior
 * (km = KM deste - KM do anterior; litros = os deste). Intervalos sem KM, com KM voltando ou acima de 3.000 km
 * (abastecimento faltando) ficam fora. abast: registros de UM veículo.
 * Devolve { intervalos: [{data, km, litros, kmL, abastecimentoId}], mediana }.
 */
function FrotaR_intervalosConsumo_(abast) {
  var lista = (abast || []).map(function (a) {
    return { id: SGO_UTILS.safe(a.ID), data: Frota_textoData_(a.DATA), hora: SGO_UTILS.safe(a.HORA), km: Frota_num_(a.KM, NaN), litros: Frota_num_(a.LITROS, NaN), valor: Frota_num_(a.VALOR, 0),
      ms: FrotaR_msDe_(Frota_textoData_(a.DATA), SGO_UTILS.safe(a.HORA) || '12:00') };
  }).filter(function (a) { return isFinite(a.km) && a.km > 0; }).sort(function (a, b) { return a.km - b.km || (a.ms || 0) - (b.ms || 0); });
  var ints = [];
  for (var i = 1; i < lista.length; i++) {
    var km = lista[i].km - lista[i - 1].km, l = lista[i].litros;
    if (!(km > 0) || km > FROTAR_CONSUMO_INTERVALO_MAX_KM || !(l > 0)) continue;
    ints.push({ abastecimentoId: lista[i].id, data: lista[i].data, ms: lista[i].ms, km: km, litros: l, kmL: Math.round(km / l * 100) / 100 });
  }
  var ord = ints.map(function (x) { return x.kmL; }).sort(function (a, b) { return a - b; });
  var med = ord.length ? (ord.length % 2 ? ord[(ord.length - 1) / 2] : (ord[ord.length / 2 - 1] + ord[ord.length / 2]) / 2) : null;
  return { intervalos: ints, mediana: med === null ? null : Math.round(med * 100) / 100 };
}

/**
 * Consumo do veículo no período x média do próprio veículo (mediana de todo o histórico).
 * desvioPct > 0 = gastando MAIS combustível que o normal (km/L menor). alerta quando passa do limite da configuração.
 */
function FrotaR_consumoVeiculo_(abastVeiculo, periodo, cfg) {
  var h = FrotaR_intervalosConsumo_(abastVeiculo);
  var noPer = h.intervalos.filter(function (x) { return x.ms !== null && x.ms >= periodo.deMs && x.ms <= periodo.ateMs; });
  var km = 0, l = 0;
  noPer.forEach(function (x) { km += x.km; l += x.litros; });
  var kmLPer = l > 0 ? Math.round(km / l * 100) / 100 : null;
  var ref = h.intervalos.length >= FROTAR_CONSUMO_MIN_INTERVALOS ? h.mediana : null;
  var desvio = kmLPer !== null && ref ? Math.round((ref / kmLPer - 1) * 1000) / 10 : null;
  var estranhos = ref ? noPer.filter(function (x) { return x.kmL < ref * (1 - FROTAR_CONSUMO_ESTRANHO_PCT / 100); }).map(function (x) {
    return { abastecimentoId: x.abastecimentoId, data: x.data, kmL: x.kmL, km: x.km, litros: x.litros };
  }) : [];
  return { kmLPeriodo: kmLPer, kmLReferencia: ref, desvioPct: desvio, alerta: desvio !== null && desvio > cfg.desvioConsumoPct, intervalosPeriodo: noPer.length, intervalosHistorico: h.intervalos.length,
    kmIntervalos: km, litrosIntervalos: Math.round(l * 100) / 100, estranhos: estranhos };
}

/** Abastecimento x posição do veículo: estava parado perto da hora informada? */
function FrotaR_abastecimentoPosicao_(abast, pontos) {
  var t = FrotaR_msDe_(Frota_textoData_(abast.DATA), SGO_UTILS.safe(abast.HORA));
  if (!SGO_UTILS.safe(abast.HORA) || t === null) return { situacao: 'SEM_HORA', texto: 'Sem a hora do abastecimento: não dá para conferir com a posição do veículo.' };
  var janela = FROTAR_ABAST_JANELA_MIN * 60000;
  var ps = (pontos || []).map(function (p) { return { ms: new Date(p.em).getTime(), lat: Number(p.lat), lon: Number(p.lon), kmh: p.kmh, ignicao: p.ignicao, endereco: p.endereco || '' }; })
    .filter(function (p) { return isFinite(p.ms) && p.ms >= t - janela && p.ms <= t + janela; }).sort(function (a, b) { return a.ms - b.ms; });
  if (ps.length < 2) return { situacao: 'SEM_DADO', texto: 'Sem posições do veículo entre ' + FrotaR_textoMs_(t - janela).slice(-5) + ' e ' + FrotaR_textoMs_(t + janela).slice(-5) + ' (rastreador sem sinal, aparelho não ligado ou rota já apagada).' };
  var melhor = null, atual = null;
  ps.forEach(function (p) {
    if (FrotaR_parado_(p)) { if (!atual) atual = { ini: p.ms, fim: p.ms, p: p }; else atual.fim = p.ms; }
    else if (atual) { atual.fim = p.ms; if (!melhor || atual.fim - atual.ini > melhor.fim - melhor.ini) melhor = atual; atual = null; }
  });
  if (atual && (!melhor || atual.fim - atual.ini > melhor.fim - melhor.ini)) melhor = atual;
  if (melhor && melhor.fim - melhor.ini >= FROTAR_ABAST_PARADA_MIN * 60000) {
    return { situacao: 'COMPATIVEL', texto: 'Veículo parado de ' + FrotaR_textoMs_(melhor.ini).slice(-5) + ' a ' + FrotaR_textoMs_(melhor.fim).slice(-5) + (melhor.p.endereco ? ', em ' + melhor.p.endereco : '') + ': compatível com o abastecimento.',
      lat: melhor.p.lat, lon: melhor.p.lon, endereco: melhor.p.endereco };
  }
  return { situacao: 'CONFERIR', texto: 'O veículo não ficou parado por ' + FROTAR_ABAST_PARADA_MIN + ' minutos ou mais entre ' + FrotaR_textoMs_(t - janela).slice(-5) + ' e ' + FrotaR_textoMs_(t + janela).slice(-5) + ': confira a hora informada e o comprovante.' };
}

/** Situação de cada abastecimento do período (tanque, consumo estranho, posição, comprovante). */
function FrotaR_conferirAbastecimentos_(veiculos, periodo, cfg, comPosicao) {
  var arm = comPosicao ? FrotaR_armazem_() : null;
  var out = [];
  veiculos.forEach(function (v) {
    var vid = SGO_UTILS.safe(v.ID);
    var lista = FrotaR_abastecimentos_(vid);
    var cons = FrotaR_consumoVeiculo_(lista, periodo, cfg);
    var estranho = {};
    cons.estranhos.forEach(function (e) { estranho[e.abastecimentoId] = e; });
    var cap = Frota_num_(v.CAPACIDADE_TANQUE_L, NaN);
    lista.forEach(function (a) {
      var ms = FrotaR_msDe_(Frota_textoData_(a.DATA), SGO_UTILS.safe(a.HORA) || '12:00');
      if (ms === null || ms < periodo.deMs || ms > periodo.ateMs) return;
      var litros = Frota_num_(a.LITROS, NaN);
      var itens = [];
      if (isFinite(cap) && cap > 0 && isFinite(litros) && litros > cap * FROTAR_TANQUE_FOLGA) itens.push({ tipo: 'TANQUE', texto: 'Litros (' + Rastreador_num_(litros, 2) + ' L) acima da capacidade do tanque (' + Rastreador_num_(cap, 0) + ' L).' });
      if (estranho[SGO_UTILS.safe(a.ID)]) { var e = estranho[SGO_UTILS.safe(a.ID)]; itens.push({ tipo: 'CONSUMO', texto: 'Rendeu ' + Rastreador_num_(e.kmL, 2) + ' km/L desde o abastecimento anterior (' + Rastreador_num_(e.km, 0) + ' km com ' + Rastreador_num_(e.litros, 2) + ' L); a média do veículo é ' + Rastreador_num_(cons.kmLReferencia, 2) + ' km/L.' }); }
      if (!SGO_UTILS.safe(a.COMPROVANTE_LINK)) itens.push({ tipo: 'COMPROVANTE', texto: 'Sem comprovante anexado.' });
      var pos = null;
      if (arm && SGO_UTILS.safe(a.HORA)) {
        try {
          var t = FrotaR_msDe_(Frota_textoData_(a.DATA), SGO_UTILS.safe(a.HORA));
          var pts = arm.ler({ veiculoId: vid, de: new Date(t - FROTAR_ABAST_JANELA_MIN * 60000).toISOString(), ate: new Date(t + FROTAR_ABAST_JANELA_MIN * 60000).toISOString(), limite: 2000 }) || [];
          pos = FrotaR_abastecimentoPosicao_(a, pts);
          if (pos.situacao === 'CONFERIR') itens.push({ tipo: 'POSICAO', texto: pos.texto });
        } catch (eP) {}
      }
      out.push({ id: SGO_UTILS.safe(a.ID), veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), data: Frota_textoData_(a.DATA), hora: SGO_UTILS.safe(a.HORA), km: Frota_num_(a.KM, null), litros: litros,
        valor: Frota_num_(a.VALOR, 0), condutorId: SGO_UTILS.safe(a.CONDUTOR_ID), comprovante: SGO_UTILS.safe(a.COMPROVANTE_LINK), origem: SGO_UTILS.safe(a.ORIGEM) || 'GESTAO',
        posicao: pos ? { situacao: pos.situacao, texto: pos.texto } : null, apontamentos: itens });
    });
  });
  return out.sort(function (a, b) { return String(b.data.split('/').reverse().join('')).localeCompare(String(a.data.split('/').reverse().join(''))); });
}

/** KM rodado por veículo e por condutor no período (retiradas concluídas; rastreador quando houver a rota). */
function FrotaR_kmPeriodo_(periodo, veiculos) {
  var cnd = FrotaR_condutores_();
  var porVeic = {}, porCond = {};
  veiculos.forEach(function (v) { porVeic[SGO_UTILS.safe(v.ID)] = { veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), kmInformado: 0, kmRastreador: null, retiradas: 0 }; });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return;
    var p = FrotaR_periodoMov_(m);
    if (p.ateMs < periodo.deMs || p.ateMs > periodo.ateMs) return;
    var k = Frota_num_(m.KM_CHEGADA, NaN) - Frota_num_(m.KM_SAIDA, NaN);
    if (!isFinite(k) || k < 0) return;
    var pv = porVeic[SGO_UTILS.safe(m.VEICULO_ID)];
    if (pv) { pv.kmInformado += k; pv.retiradas++; }
    var cid = SGO_UTILS.safe(m.CONDUTOR_ID);
    var pc = porCond[cid] || (porCond[cid] = { condutorId: cid, nome: SGO_UTILS.safe((cnd[cid] || {}).NOME) || 'Condutor não localizado', km: 0, retiradas: 0 });
    pc.km += k; pc.retiradas++;
  });
  var arm = FrotaR_armazem_();
  if (arm) {
    Object.keys(porVeic).forEach(function (vid) {
      try {
        var pts = arm.ler({ veiculoId: vid, de: new Date(periodo.deMs).toISOString(), ate: new Date(periodo.ateMs).toISOString(), limite: 60000 }) || [];
        if (pts.length > 1) porVeic[vid].kmRastreador = FrotaR_analisarRota_(pts).distanciaKm;
      } catch (e) {}
    });
  }
  return { porVeiculo: Object.keys(porVeic).map(function (k) { return porVeic[k]; }), porCondutor: Object.keys(porCond).map(function (k) { return porCond[k]; }).sort(function (a, b) { return b.km - a.km; }) };
}

function Frota_apiRastrCombustivel(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  FrotaR_garantirAbas_();
  payload = payload || {};
  var cfg = FrotaR_cfg_();
  var per = FrotaR_periodo_(payload.de || FrotaR_diasAtrasBr_(30), payload.ate || FrotaR_hojeBr_(), 400);
  var veiculos = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function (a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  var km = FrotaR_kmPeriodo_(per, veiculos);
  var kmPorV = {};
  km.porVeiculo.forEach(function (x) { kmPorV[x.veiculoId] = x; });
  var consumo = veiculos.map(function (v) {
    var lista = FrotaR_abastecimentos_(SGO_UTILS.safe(v.ID));
    var c = FrotaR_consumoVeiculo_(lista, per, cfg);
    var litros = 0, valor = 0, n = 0;
    lista.forEach(function (a) { var ms = FrotaR_msDe_(Frota_textoData_(a.DATA), SGO_UTILS.safe(a.HORA) || '12:00'); if (ms !== null && ms >= per.deMs && ms <= per.ateMs) { litros += Frota_num_(a.LITROS, 0); valor += Frota_num_(a.VALOR, 0); n++; } });
    var kv = kmPorV[SGO_UTILS.safe(v.ID)] || {};
    var kmBase = kv.kmRastreador !== null && kv.kmRastreador !== undefined ? kv.kmRastreador : kv.kmInformado;
    return { veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), capacidadeTanque: Frota_num_(v.CAPACIDADE_TANQUE_L, null),
      abastecimentos: n, litros: Math.round(litros * 100) / 100, valor: Math.round(valor * 100) / 100, kmInformado: kv.kmInformado || 0, kmRastreador: kv.kmRastreador === undefined ? null : kv.kmRastreador,
      custoPorKm: kmBase > 0 && valor > 0 ? Math.round(valor / kmBase * 100) / 100 : null,
      kmLPeriodo: c.kmLPeriodo, kmLReferencia: c.kmLReferencia, desvioPct: c.desvioPct, alertaConsumo: c.alerta, intervalosHistorico: c.intervalosHistorico };
  });
  var conferencia = FrotaR_conferirAbastecimentos_(veiculos, per, cfg, !!payload.comPosicao);
  if (payload.comPosicao) FrotaR_registrarConsulta_(sessao, 'ABAST_POSICAO', { periodo: per.texto });
  return { ok: true, periodo: per.texto, cfg: { desvioConsumoPct: cfg.desvioConsumoPct }, consumo: consumo, kmPorCondutor: km.porCondutor, abastecimentos: conferencia,
    pedidos: FrotaR_listarPedidos_(null), rotasGuardadas: !!FrotaR_armazem_(),
    metodo: 'Consumo pelo método do tanque cheio: os km entre dois abastecimentos divididos pelos litros do segundo. A média do veículo é a mediana de todos os intervalos dele (a partir de ' + FROTAR_CONSUMO_MIN_INTERVALOS + '); acima de ' + cfg.desvioConsumoPct + '% de gasto a mais que a média, o veículo é sinalizado. Abastecimento parcial (sem completar o tanque) distorce o intervalo dele.' };
}

/** Capacidade do tanque (litros) do veículo — a gestão informa na aba Combustível e KM. */
function Frota_apiRastrCapacidadeTanque(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  FrotaR_garantirAbas_();
  payload = payload || {};
  var v = Rastreador_veiculo_(payload.veiculoId);
  var txt = String(payload.litros === undefined || payload.litros === null ? '' : payload.litros).trim();
  var n = txt === '' ? '' : Frota_num_(txt, NaN);
  if (n !== '' && (!isFinite(n) || n < 20 || n > 500)) throw new Error('Informe a capacidade do tanque em litros, entre 20 e 500 (exemplo: 55). Deixe vazio para não conferir os litros deste veículo.');
  var antes = SGO_UTILS.safe(v.CAPACIDADE_TANQUE_L);
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, v.ID, { CAPACIDADE_TANQUE_L: n });
  Frota_auditar_(sessao, { acao: 'CAPACIDADE_TANQUE', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), campo: 'CAPACIDADE_TANQUE_L', antes: antes, depois: n, detalhe: 'Capacidade do tanque do veículo ' + v.PLACA + ': ' + (n === '' ? 'não informada' : n + ' L') + '.' });
  return { ok: true, mensagem: 'Capacidade do tanque do veículo ' + v.PLACA + (n === '' ? ' apagada: os litros deste veículo não são mais conferidos.' : ' gravada: ' + Rastreador_num_(n, 0) + ' L.') };
}

// ------------------------------------------------------------
// PEDIDO DE COMPROVANTE DE ABASTECIMENTO (cobrança ao condutor)
// ------------------------------------------------------------
function FrotaR_listarPedidos_(usuarioId) {
  return Frota_lerSeExistir_(FROTAR_ABA_PEDIDOS).filter(function (p) { return !usuarioId || SGO_UTILS.safe(p.USUARIO_ID) === String(usuarioId); })
    .sort(function (a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); }).slice(0, 200)
    .map(function (p) {
      var sit = SGO_UTILS.safeUpper(p.SITUACAO);
      var prazoMs = FrotaR_fimDia_(SGO_UTILS.safe(p.PRAZO));
      return { id: SGO_UTILS.safe(p.ID), placa: SGO_UTILS.safe(p.PLACA), veiculoId: SGO_UTILS.safe(p.VEICULO_ID), condutor: SGO_UTILS.safe(p.CONDUTOR_NOME), condutorId: SGO_UTILS.safe(p.CONDUTOR_ID), dataRef: SGO_UTILS.safe(p.DATA_REF),
        valorRef: SGO_UTILS.safe(p.VALOR_REF), motivo: SGO_UTILS.safe(p.MOTIVO), situacao: sit, prazo: SGO_UTILS.safe(p.PRAZO), atrasado: sit === 'PENDENTE' && prazoMs !== null && prazoMs < Date.now(),
        pedidoPor: SGO_UTILS.safe(p.PEDIDO_POR_NOME), pedidoEm: SGO_UTILS.safe(p.PEDIDO_EM) ? FrotaR_textoMs_(new Date(p.PEDIDO_EM).getTime()) : '',
        enviadoEm: SGO_UTILS.safe(p.ENVIADO_EM) ? FrotaR_textoMs_(new Date(p.ENVIADO_EM).getTime()) : '', abastecimentoId: SGO_UTILS.safe(p.ABASTECIMENTO_ID), atividadeId: SGO_UTILS.safe(p.ATIVIDADE_ID) };
    });
}

/** Cria o pedido e a atividade do condutor. Usado pela tela e pelo copiloto. */
function FrotaR_pedirComprovante_(sessionId, sessao, payload) {
  FrotaR_garantirAbas_();
  var v = Rastreador_veiculo_(payload.veiculoId);
  var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, SGO_UTILS.safe(payload.condutorId));
  if (!c) throw new Error('Escolha o condutor que deve enviar o comprovante (lista de condutores da frota).');
  var uid = SGO_UTILS.safe(c.USUARIO_ID);
  if (!uid) throw new Error('O condutor ' + SGO_UTILS.safe(c.NOME) + ' não tem login do SGO+ ligado, então não tem como receber o pedido. Ligue o login dele em Frota > Veículos e condutores > Editar condutor (campo Login) e peça de novo.');
  var dataRef = String(payload.dataRef || '').trim();
  if (dataRef && !/^\d{2}\/\d{2}\/\d{4}$/.test(dataRef)) throw new Error('Informe a data do abastecimento no formato dd/mm/aaaa (ou deixe vazio se não souber).');
  var motivo = String(payload.motivo || '').replace(/\s+/g, ' ').trim();
  if (motivo.length < 10) throw new Error('Escreva em "O que pedir" o que o condutor deve enviar (mínimo de 10 caracteres), por exemplo: "Nota do abastecimento de 18/10 no cartão da empresa, R$ 250,00".');
  var dias = Math.max(1, Math.min(10, parseInt(payload.prazoDias, 10) || FROTAR_PRAZO_COMPROVANTE_DIAS));
  var prazo = FrotaR_local_(Date.now() + dias * 86400000).data;
  var ja = Frota_lerSeExistir_(FROTAR_ABA_PEDIDOS).filter(function (p) { return SGO_UTILS.safeUpper(p.SITUACAO) === 'PENDENTE' && SGO_UTILS.safe(p.VEICULO_ID) === SGO_UTILS.safe(v.ID) && SGO_UTILS.safe(p.CONDUTOR_ID) === SGO_UTILS.safe(c.ID) && SGO_UTILS.safe(p.DATA_REF) === dataRef; })[0];
  if (ja) return { ok: true, jaExistia: true, id: SGO_UTILS.safe(ja.ID), mensagem: 'Já existe um pedido pendente para ' + c.NOME + ' (veículo ' + v.PLACA + (dataRef ? ', ' + dataRef : '') + '). Nada foi criado em dobro.' };
  var atv = null;
  if (typeof Atividades_apiCriar === 'function') {
    var r = Atividades_apiCriar(sessionId, { titulo: 'Enviar comprovante de abastecimento: veículo ' + v.PLACA + (dataRef ? ' (' + dataRef + ')' : ''),
      descricao: 'A gestão da frota pediu o comprovante de abastecimento.\nO que enviar: ' + motivo + '\nComo enviar: Frota > Abastecimentos e despesas > "Comprovantes pedidos a você" > Enviar comprovante (foto da nota ou PDF, litros e KM). Esta atividade é concluída sozinha quando o comprovante chega.',
      prazo: prazo.split('/').reverse().join('-') + 'T18:00', prioridade: 'Normal', responsavelId: uid, modulo: 'frota', moduloNome: 'Frota',
      porQue: 'Conferência do consumo e dos custos da frota', onde: 'Frota > Abastecimentos e despesas', como: 'Foto da nota ou PDF do comprovante, com litros e KM' });
    if (!r || r.ok !== true) throw new Error('O pedido não foi criado: Minhas atividades recusou (' + ((r && r.message) || 'sem resposta') + '). Nada foi gravado; corrija e tente de novo.');
    atv = r.item;
  }
  var reg = SGO_DATA.normalizarObjetoParaSheet(FROTAR_ABA_PEDIDOS, SGO_DATA.gerarRegistroBase({
    VEICULO_ID: SGO_UTILS.safe(v.ID), PLACA: SGO_UTILS.safe(v.PLACA), CONDUTOR_ID: SGO_UTILS.safe(c.ID), CONDUTOR_NOME: SGO_UTILS.safe(c.NOME), USUARIO_ID: uid, DATA_REF: dataRef,
    VALOR_REF: String(payload.valorRef || '').trim().slice(0, 40), MOTIVO: motivo.slice(0, 500), SITUACAO: 'PENDENTE', PRAZO: prazo, ATIVIDADE_ID: atv ? SGO_UTILS.safe(atv.ID) : '',
    ABASTECIMENTO_ID: '', PEDIDO_POR_ID: SGO_UTILS.safe(sessao.userId), PEDIDO_POR_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario), PEDIDO_EM: SGO_UTILS.nowIso(),
    ENVIADO_EM: '', CANCELADO_EM: '', CANCELADO_POR: '', CANCELADO_MOTIVO: ''
  }));
  SGO_DATA.insert(FROTAR_ABA_PEDIDOS, reg);
  Frota_auditar_(sessao, { acao: 'COMPROVANTE_PEDIDO', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), condutorId: SGO_UTILS.safe(c.ID), condutorNome: SGO_UTILS.safe(c.NOME),
    detalhe: 'Comprovante de abastecimento pedido a ' + c.NOME + ' (prazo ' + prazo + '): ' + motivo.slice(0, 300) });
  return { ok: true, id: reg.ID, mensagem: 'Pedido enviado para ' + c.NOME + ' com prazo ' + prazo + '. Ele vê em Minhas atividades e na Frota; a atividade é concluída sozinha quando o comprovante chegar.' };
}

function Frota_apiRastrPedirComprovante(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  return FrotaR_pedirComprovante_(sessionId, sessao, payload || {});
}

function Frota_apiRastrCancelarPedido(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAR_ABA_PEDIDOS, SGO_UTILS.safe(payload.id));
  if (!p || SGO_UTILS.safeUpper(p.SITUACAO) !== 'PENDENTE') throw new Error('Este pedido já foi respondido ou cancelado. Atualize a tela.');
  var motivo = String(payload.motivo || '').replace(/\s+/g, ' ').trim();
  if (motivo.length < 10) throw new Error('Escreva o motivo do cancelamento (mínimo de 10 caracteres), por exemplo: "Comprovante entregue em papel à gestão".');
  SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: SGO_UTILS.nowIso(), CANCELADO_POR: SGO_UTILS.safe(sessao.nome || sessao.usuario), CANCELADO_MOTIVO: motivo.slice(0, 500) });
  if (SGO_UTILS.safe(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') {
    try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Cancelada', motivo: 'Pedido de comprovante cancelado pela gestão: ' + motivo }); } catch (e) {}
  }
  Frota_auditar_(sessao, { acao: 'COMPROVANTE_CANCELADO', veiculoId: SGO_UTILS.safe(p.VEICULO_ID), placa: SGO_UTILS.safe(p.PLACA), condutorId: SGO_UTILS.safe(p.CONDUTOR_ID), condutorNome: SGO_UTILS.safe(p.CONDUTOR_NOME), justificativa: motivo, detalhe: 'Pedido de comprovante cancelado.' });
  return { ok: true, mensagem: 'Pedido cancelado; a atividade do condutor também foi cancelada.' };
}

/** Pedidos do próprio usuário (qualquer perfil da equipe). Sem localização. */
function Frota_apiRastrMeusPedidos(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_bootstrap_();
  return { ok: true, itens: FrotaR_listarPedidos_(SGO_UTILS.safe(sessao.userId)).filter(function (p) { return p.situacao === 'PENDENTE'; }) };
}

/** O condutor responde o pedido: anexa o comprovante, informa litros e KM. Vira abastecimento (origem CONDUTOR). */
function Frota_apiRastrEnviarComprovante(sessionId, payload) {
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_bootstrap_();
  FrotaR_garantirAbas_();
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAR_ABA_PEDIDOS, SGO_UTILS.safe(payload.pedidoId));
  if (!p) throw new Error('Pedido não encontrado. Atualize a tela.');
  if (SGO_UTILS.safe(p.USUARIO_ID) !== SGO_UTILS.safe(sessao.userId) && !Frota_ehGestao_(sessionId)) throw new Error('Este pedido é de ' + p.CONDUTOR_NOME + '. Só ele (ou a gestão) envia o comprovante.');
  if (SGO_UTILS.safeUpper(p.SITUACAO) !== 'PENDENTE') return { ok: true, jaEnviado: true, mensagem: 'Este pedido já foi respondido em ' + (SGO_UTILS.safe(p.ENVIADO_EM) ? FrotaR_textoMs_(new Date(p.ENVIADO_EM).getTime()) : 'data anterior') + '. Nada foi gravado em dobro.' };
  var data = String(payload.data || p.DATA_REF || '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) throw new Error('Informe a data do abastecimento no formato dd/mm/aaaa.');
  var hora = String(payload.hora || '').trim();
  if (hora && !/^\d{1,2}:\d{2}$/.test(hora)) throw new Error('Informe a hora no formato hh:mm (exemplo: 14:35) ou deixe vazio.');
  var litros = Frota_num_(payload.litros, NaN);
  if (!isFinite(litros) || litros <= 0 || litros > 500) throw new Error('Informe os litros abastecidos (como estão na nota, exemplo: 42,35).');
  var km = Frota_num_(payload.km, NaN);
  if (!isFinite(km) || km <= 0) throw new Error('Informe o KM do painel no momento do abastecimento.');
  if (!payload.base64) throw new Error('Anexe a foto da nota ou o PDF do comprovante. Sem o comprovante o pedido continua aberto.');
  var link = Frota_uploadFoto_(p.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || 'comprovante-abastecimento');
  var reg = SGO_DATA.normalizarObjetoParaSheet(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, SGO_DATA.gerarRegistroBase({
    VEICULO_ID: SGO_UTILS.safe(p.VEICULO_ID), CONDUTOR_ID: SGO_UTILS.safe(p.CONDUTOR_ID), DATA: data, HORA: hora, KM: km, TIPO_COMBUSTIVEL: SGO_UTILS.safe(payload.tipoCombustivel) || 'Outro',
    LITROS: litros, VALOR: Frota_num_(payload.valor, 0), POSTO: SGO_UTILS.safe(payload.posto).slice(0, 200), COMPROVANTE_LINK: link, ORIGEM: 'CONDUTOR', PEDIDO_ID: SGO_UTILS.safe(p.ID)
  }));
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, reg);
  SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, { SITUACAO: 'ENVIADO', ENVIADO_EM: SGO_UTILS.nowIso(), ABASTECIMENTO_ID: reg.ID });
  if (SGO_UTILS.safe(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') {
    try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Concluída', observacao: 'Comprovante enviado pela Frota (abastecimento de ' + data + ', ' + litros + ' L).' }); } catch (e) {}
  }
  Frota_auditar_(sessao, { acao: 'COMPROVANTE_ENVIADO', veiculoId: SGO_UTILS.safe(p.VEICULO_ID), placa: SGO_UTILS.safe(p.PLACA), condutorId: SGO_UTILS.safe(p.CONDUTOR_ID), condutorNome: SGO_UTILS.safe(p.CONDUTOR_NOME),
    detalhe: 'Comprovante enviado: abastecimento de ' + data + (hora ? ' ' + hora : '') + ', ' + litros + ' L, KM ' + Frota_kmTexto_(km) + '.' });
  return { ok: true, mensagem: 'Comprovante enviado. Obrigado: o pedido foi encerrado e a atividade marcada como concluída.' };
}

// ------------------------------------------------------------
// CONFIGURAÇÃO PELA GESTÃO
// ------------------------------------------------------------
function Frota_apiRastrConfig(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  var atual = FrotaR_cfg_();
  var arm = FrotaR_armazem_();
  var resumo = null;
  if (arm && typeof arm.resumo === 'function') { try { resumo = arm.resumo(); } catch (e) {} }
  if (!payload.gravar) {
    return { ok: true, cfg: atual, rotasGuardadas: !!arm, armazem: resumo ? { total: Number(resumo.total) || 0, maisAntigo: resumo.maisAntigo ? FrotaR_textoMs_(new Date(resumo.maisAntigo).getTime()) : '' } : null };
  }
  var props = PropertiesService.getScriptProperties();
  var mudou = [];
  var ret = parseInt(payload.retencaoDias, 10);
  if (!(ret >= 7 && ret <= 1825)) throw new Error('O prazo de guarda das rotas vai de 7 a 1.825 dias (5 anos). O padrão é 90 dias. Corrija e grave de novo.');
  var lim = Number(String(payload.limiteKmh || '').replace(',', '.'));
  if (!(lim >= 40 && lim <= 160)) throw new Error('O limite de velocidade vai de 40 a 160 km/h (padrão 110). Corrija e grave de novo.');
  var ini = String(payload.expedienteInicio || ''), fim = String(payload.expedienteFim || '');
  if (FrotaR_minutosDoTexto_(ini) === null || FrotaR_minutosDoTexto_(fim) === null || FrotaR_minutosDoTexto_(fim) <= FrotaR_minutosDoTexto_(ini)) throw new Error('Informe o expediente da frota com início e fim no formato hh:mm, o fim depois do início (padrão 07:00 a 19:00).');
  var desv = Number(String(payload.desvioConsumoPct || '').replace(',', '.'));
  if (!(desv >= 5 && desv <= 60)) throw new Error('O desvio de consumo vai de 5% a 60% (padrão 15%). Corrija e grave de novo.');
  var novo = { RASTREADOR_RETENCAO_DIAS: String(ret), FROTA_RASTR_VEL_LIMITE: String(lim), FROTA_RASTR_EXPEDIENTE: ini + '-' + fim, FROTA_RASTR_SABADO: payload.sabadoExpediente ? '1' : '0', FROTA_CONSUMO_DESVIO_PCT: String(desv) };
  var antes = { RASTREADOR_RETENCAO_DIAS: String(atual.retencaoDias), FROTA_RASTR_VEL_LIMITE: String(atual.limiteKmh), FROTA_RASTR_EXPEDIENTE: atual.expedienteInicio + '-' + atual.expedienteFim, FROTA_RASTR_SABADO: atual.sabadoExpediente ? '1' : '0', FROTA_CONSUMO_DESVIO_PCT: String(atual.desvioConsumoPct) };
  Object.keys(novo).forEach(function (k) { if (novo[k] !== antes[k]) { props.setProperty(k, novo[k]); mudou.push(k + ': ' + antes[k] + ' -> ' + novo[k]); } });
  if (mudou.length) {
    Frota_auditar_(sessao, { acao: 'RASTREAMENTO_CONFIG', campo: 'CONFIG', antes: '', depois: '', detalhe: 'Configuração do rastreamento alterada: ' + mudou.join('; ') + '.' });
    FrotaR_registrarConsulta_(sessao, 'CONFIG', { detalhe: mudou.join('; ') });
  }
  var aviso = ret < atual.retencaoDias ? ' O prazo diminuiu: os pontos com mais de ' + ret + ' dias serão apagados na próxima limpeza (uma vez por dia).' : '';
  return { ok: true, mensagem: mudou.length ? 'Configuração gravada.' + aviso : 'Nada mudou.', cfg: FrotaR_cfg_() };
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS (chamado por Pend_fonteFrota_)
// ------------------------------------------------------------
function FrotaR_pendencias_(add) {
  if (typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.frota_comprovante) return;
  FrotaR_listarPedidos_(null).forEach(function (p) {
    if (p.situacao !== 'PENDENTE' || !p.atrasado) return;
    add(Pend_item_('frota_comprovante', {
      id: 'FROTA:COMPROVANTE:' + p.id, nome: p.placa, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: p.prazo, responsavel: 'Gestão da frota',
      titulo: 'Comprovante de abastecimento não enviado: ' + p.condutor + ' (veículo ' + p.placa + ')',
      detalhe: 'Pedido em ' + p.pedidoEm + ' com prazo ' + p.prazo + '. ' + p.motivo + ' O condutor vê a cobrança em Minhas atividades até enviar.',
      oQueFazer: 'Fale com o condutor. Se o comprovante chegou por outro meio, cancele o pedido em Frota > Rastreamento > Combustível e KM > Pedidos de comprovante (com o motivo).',
      textoEstavel: 'Comprovante de abastecimento pedido a ' + p.condutor + ' ainda não foi enviado.'
    }));
  });
}

// ------------------------------------------------------------
// PROGRAMA DE CONDUTA (sugestões; nada vira ocorrência sozinho)
// ------------------------------------------------------------
/**
 * Chamado por Cndq_coletarFrota_. desdeIso = 'aaaa-mm-dd'. usuarioDoCondutor(condutorId) -> usuário do SGO+.
 * - excesso de velocidade durante uma retirada (o condutor da retirada), um por retirada;
 * - pedido de comprovante vencido há 2 dias ou mais (VEI-05), some quando o comprovante chega (resolvível).
 * Uso sem registro não vira sugestão: o rastreador não sabe quem estava no veículo (o dado é do veículo).
 */
function FrotaR_sugestoesConduta_(desdeIso, usuarioDoCondutor, avisos) {
  var saida = [];
  var cfg = FrotaR_cfg_();
  FrotaR_listarPedidos_(null).forEach(function (p) {
    if (p.situacao !== 'PENDENTE') return;
    var prazoMs = FrotaR_fimDia_(p.prazo);
    if (prazoMs === null || Date.now() - prazoMs < 2 * 86400000) return;
    var uid = usuarioDoCondutor(p.condutorId);
    if (!uid) return;
    var iso = p.prazo.split('/').reverse().join('-');
    if (iso < desdeIso) return;
    saida.push({ chave: 'FROTA|COMPROVANTE|' + p.id, origem: 'FROTA', tipo: 'COMPROVANTE_PENDENTE', origemId: p.id, colaboradorId: uid, dataFato: iso, tipoCodigo: 'VEI-05', resolvivel: true,
      rotulo: 'Comprovante do ' + p.placa + ' (prazo ' + p.prazo + ')',
      titulo: 'Comprovante de abastecimento não enviado no prazo (' + p.placa + ')',
      detalhe: 'Pedido pela gestão em ' + p.pedidoEm + ' com prazo ' + p.prazo + ': ' + p.motivo + '. Se o comprovante foi entregue por outro meio, descarte com o motivo.' });
  });
  var arm = FrotaR_armazem_();
  if (!arm) return saida;
  var desdeMs = new Date(desdeIso + 'T03:00:00Z').getTime();
  var limite = 0;
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
    if (limite >= 40 || SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return;
    var per = FrotaR_periodoMov_(m);
    if (per.ateMs < desdeMs || per.ateMs - per.deMs > 7 * 86400000) return;
    var uid = usuarioDoCondutor(SGO_UTILS.safe(m.CONDUTOR_ID));
    if (!uid) return;
    limite++;
    try {
      var pts = arm.ler({ veiculoId: SGO_UTILS.safe(m.VEICULO_ID), de: new Date(per.deMs).toISOString(), ate: new Date(per.ateMs).toISOString(), limite: 20000 }) || [];
      var an = FrotaR_analisarRota_(pts, cfg);
      if (!an.excessos.length) return;
      var pior = an.excessos.reduce(function (a, b) { return b.velMaxKmh > a.velMaxKmh ? b : a; });
      var data = FrotaR_local_(per.deMs).iso;
      saida.push({ chave: 'FROTA|VELOCIDADE|' + m.ID, origem: 'FROTA', tipo: 'EXCESSO_VELOCIDADE', origemId: String(m.ID), colaboradorId: uid, dataFato: data, tipoCodigo: '',
        rotulo: 'Retirada de ' + FrotaR_local_(per.deMs).data,
        titulo: 'Excesso de velocidade durante a retirada (' + FrotaR_local_(per.deMs).data + ')',
        detalhe: an.excessos.length + (an.excessos.length === 1 ? ' trecho' : ' trechos') + ' acima de ' + cfg.limiteKmh + ' km/h; máxima de ' + pior.velMaxKmh + ' km/h em ' + pior.inicio + '. Medido pelo rastreador do veículo (pode haver erro de GPS em trecho curto). O catálogo não tem código próprio para excesso de velocidade: escolha o código que se aplica ou descarte. Antes de decidir, veja a rota em Frota > Rastreamento > Rotas.' });
    } catch (e) { if (avisos) avisos.push('Rotas da Frota não foram lidas: ' + String((e && e.message) || e)); }
  });
  return saida;
}

// ------------------------------------------------------------
// PONTE DO COMMAND (frota.*): só leitura, em nome do usuário do SGO+ ligado à conta
// ------------------------------------------------------------
/**
 * frota.painel    { sgoUsuarioId } -> mapa (situação, condutor, velocidade, local) e indicadores do mês — só gestão do SGO+
 * frota.pedidos   { sgoUsuarioId } -> pedidos de comprovante pendentes da própria pessoa (sem localização)
 * O ponto do COMMAND não usa nada daqui: localização do veículo não serve para controlar a pessoa.
 */
function FrotaR_ponte_(acao, dados) {
  dados = dados || {};
  var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, SGO_UTILS.safe(dados.sgoUsuarioId));
  if (!u || SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') !== 'ATIVO' || SGO_UTILS.safeUpper(u.PERFIL) === 'CLIENTE') {
    return { ok: false, erro: 'A sua conta do COMMAND não está ligada a um usuário ativo da equipe no SGO+. Peça ao administrador para ligar a conta em Usuários e papéis (Migrar do SGO+).' };
  }
  var perfil = SGO_UTILS.safeUpper(u.PERFIL);
  var sessao = { userId: SGO_UTILS.safe(u.ID), usuario: SGO_UTILS.safe(u.USUARIO), nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), perfil: perfil };
  if (acao === 'frota.pedidos') return { ok: true, itens: FrotaR_listarPedidos_(sessao.userId).filter(function (p) { return p.situacao === 'PENDENTE'; }) };
  if (acao !== 'frota.painel') return { ok: false, erro: 'Ação da frota desconhecida.' };
  if (['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(perfil) < 0) {
    return { ok: false, erro: 'A localização dos veículos é só da gestão (no SGO+, perfil Administrador, Gestor ou Diretoria). O seu usuário do SGO+ é ' + perfil + '.' };
  }
  try { Frota_bootstrap_(); } catch (e0) {}
  var est = FrotaR_estadoRastreador_();
  var out = { ok: true, pronto: est.pronto, mensagem: est.mensagem, veiculos: [], indicadores: null, situacoes: FROTAR_SITUACOES, atualizadoEm: FrotaR_textoMs_(Date.now()) };
  if (est.pronto) {
    try { out.veiculos = FrotaR_veiculosMapa_(FrotaR_posicoesParaMapa_(est.c).posicoes); }
    catch (e) { out.mensagem = String((e && e.message) || e); }
    FrotaR_registrarConsulta_(sessao, 'COMMAND_MAPA', { origem: 'COMMAND', detalhe: 'Frota no COMMAND' });
  }
  try {
    var cfg = FrotaR_cfg_();
    var hoje = FrotaR_local_(Date.now());
    var per = FrotaR_periodo_('01/' + ('0' + hoje.mes).slice(-2) + '/' + hoje.ano, hoje.data);
    var veics = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; });
    var km = FrotaR_kmPeriodo_(per, veics);
    out.indicadores = { periodo: per.texto, porVeiculo: km.porVeiculo.map(function (x) {
      var v = veics.filter(function (y) { return SGO_UTILS.safe(y.ID) === x.veiculoId; })[0] || {};
      var c = FrotaR_consumoVeiculo_(FrotaR_abastecimentos_(x.veiculoId), per, cfg);
      return { placa: x.placa, kmInformado: x.kmInformado, kmRastreador: x.kmRastreador, kmLPeriodo: c.kmLPeriodo, kmLReferencia: c.kmLReferencia, desvioPct: c.desvioPct, alertaConsumo: c.alerta, modelo: SGO_UTILS.safe(v.MODELO) };
    }), comprovantesPendentes: FrotaR_listarPedidos_(null).filter(function (p) { return p.situacao === 'PENDENTE'; }).length };
  } catch (e2) { out.indicadores = null; }
  return out;
}

// ------------------------------------------------------------
// AVISO AO CONDUTOR (tela de retirada e manual)
// ------------------------------------------------------------
function FrotaR_avisoRetirada_() {
  var c = Rastreador_cfg_();
  if (!c.ligado || !Rastreador_temCredencial_(c)) return null;
  var dias = FrotaR_cfg_().retencaoDias;
  return { ativo: true, dias: dias, texto: 'Os veículos da frota têm rastreador. Durante o uso, a posição e a velocidade do veículo ficam registradas para a segurança da frota, a conferência do KM e do consumo e a localização em caso de roubo ou acidente. Só a gestão vê, e o histórico é apagado depois de ' + dias + ' dias. O registro é do veículo, não da pessoa.' };
}
