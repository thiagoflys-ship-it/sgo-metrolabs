/****************************************************
 * COMERCIAL — ROTAS DA VIAGEM: KM DO TRECHO E PEDÁGIO (11/11/2026)
 *
 * Pedido do dono (11/11/2026): o vendedor informa a cidade de ORIGEM (pré-preenchida pela unidade de onde sai o veículo) e a de
 * DESTINO, e o sistema calcula o km do trecho e o pedágio e preenche as linhas da viagem; "cada estado vamos criando o nosso banco
 * de dados".
 *
 * Ordem da sugestão (ComRo_sugerir_), sempre com a fonte dita ao vendedor:
 *  1. BANCO DE ROTAS (COM_ROTAS): rota já conferida por alguém da equipe (a mais recente; a volta vale a mesma distância).
 *  2. CÁLCULO (Google Routes API, computeRoutes com tollInfo em BRL): só com a chave GOOGLE_ROUTES_API_KEY cadastrada pelo dono em
 *     Administração > Chaves e senhas. Chamada pelo servidor; a chave nunca vai ao navegador. Pedágio = estimativa de ida x 2.
 *  3. REFERÊNCIA DA CONDUTA (qual_distancia_referencia): km do trecho a partir da sede de Goiânia, quando a origem é Goiânia/GO.
 *  4. Estimativa pública (OpenStreetMap: Nominatim + OSRM), só com a propriedade COM_ROTAS_ESTIMATIVA_PUBLICA = SIM (desligada por
 *     padrão: serviço público sem garantia de tempo de resposta). Só km; pedágio fica para o vendedor ou o banco de rotas.
 *  Sem nada disso: o vendedor digita (nunca bloqueia a proposta).
 * O número sugerido é sempre editável. "Conferir e guardar no banco de rotas" grava a rota (quem e quando); a anterior da mesma rota
 * fica SUBSTITUIDA (nada é apagado). Nunca devolve Date cru.
 ****************************************************/

var COM_RO_ABA = 'COM_ROTAS';
var COM_RO_FONTES = { BANCO_ROTAS: 'banco de rotas (conferida pela equipe)', CALCULO_GOOGLE: 'cálculo automático da rota (Google)', REFERENCIA_CONDUTA: 'tabela de distâncias do Programa de conduta',
  ESTIMATIVA_OSM: 'estimativa pública (OpenStreetMap)', DIGITADO: 'informado pelo vendedor', '': 'não informado' };

function ComRo_uf_(texto) {
  var s = Com_s_(texto).trim(), m = /[\/\-,]\s*([A-Za-z]{2})\s*$/.exec(s) || /\s([A-Z]{2})$/.exec(s);
  return m ? Com_up_(m[1]) : '';
}
function ComRo_chave_(origem, destino) { return Com_normBusca_(origem) + '|' + Com_normBusca_(destino); }

/** Linhas ativas do banco de rotas. */
function ComRo_lerAtivas_() {
  return Com_ler_(COM_RO_ABA).filter(function (r) { return Com_up_(r.SITUACAO || 'ATIVA') === 'ATIVA'; });
}
/** Rota do banco (ida ou volta). null se não houver. */
function ComRo_doBanco_(origem, destino) {
  var k1 = ComRo_chave_(origem, destino), k2 = ComRo_chave_(destino, origem);
  var l = ComRo_lerAtivas_().filter(function (r) { return Com_s_(r.CHAVE) === k1 || Com_s_(r.CHAVE) === k2; })
    .sort(function (a, b) { return String(b.CONFERIDO_EM).localeCompare(String(a.CONFERIDO_EM)); });
  if (!l.length) return null;
  var r = l[0], ped = Com_s_(r.PEDAGIO_IDA_VOLTA) === '' ? null : Number(r.PEDAGIO_IDA_VOLTA);
  return { km: Number(r.KM_TRECHO), pedagio: ped, fonteKm: 'BANCO_ROTAS', fontePedagio: ped === null ? '' : 'BANCO_ROTAS', conferidoPor: Com_s_(r.CONFERIDO_POR_NOME), conferidoEm: Com_br_(r.CONFERIDO_EM),
    textoFonte: 'Banco de rotas: conferida por ' + Com_s_(r.CONFERIDO_POR_NOME) + ' em ' + Com_brDia_(r.CONFERIDO_EM) + (Com_s_(r.CHAVE) === k2 ? ' (rota de volta; a distância é a mesma)' : '') };
}

/** Google Routes API (com chave). { km, pedagio, aviso } ou null. Nunca lança. */
function ComRo_google_(origem, destino) {
  var chave = '';
  try { chave = Com_s_(PropertiesService.getScriptProperties().getProperty('GOOGLE_ROUTES_API_KEY')); } catch (e) { chave = ''; }
  if (!chave) return { semChave: true };
  try {
    var r = UrlFetchApp.fetch('https://routes.googleapis.com/directions/v2:computeRoutes', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.travelAdvisory.tollInfo' },
      payload: JSON.stringify({ origin: { address: Com_s_(origem) + ', Brasil' }, destination: { address: Com_s_(destino) + ', Brasil' }, travelMode: 'DRIVE', extraComputations: ['TOLLS'],
        routeModifiers: { vehicleInfo: { emissionType: 'GASOLINE' } }, languageCode: 'pt-BR', regionCode: 'BR', units: 'METRIC' }) });
    var cod = r.getResponseCode();
    if (cod >= 400) return { erro: 'o serviço de rotas respondeu ' + cod };
    var j = JSON.parse(r.getContentText() || '{}'), rota = (j.routes || [])[0];
    if (!rota || !(Number(rota.distanceMeters) > 0)) return { erro: 'o serviço de rotas não achou a rota entre ' + origem + ' e ' + destino };
    var km = Math.round(Number(rota.distanceMeters) / 100) / 10, ped = null;
    var precos = rota.travelAdvisory && rota.travelAdvisory.tollInfo && rota.travelAdvisory.tollInfo.estimatedPrice;
    if (Array.isArray(precos)) { var brl = precos.filter(function (x) { return Com_up_(x.currencyCode) === 'BRL'; })[0]; if (brl) ped = Com_r2_(2 * ((Number(brl.units) || 0) + (Number(brl.nanos) || 0) / 1e9)); }
    else if (rota.travelAdvisory && rota.travelAdvisory.tollInfo) ped = null; else ped = 0;
    return { km: km, pedagio: ped, aviso: ped === null ? 'O serviço indica pedágio na rota, mas sem o valor: informe o pedágio.' : '' };
  } catch (e) { return { erro: 'o serviço de rotas não respondeu (' + String((e && e.message) || e).slice(0, 120) + ')' }; }
}

/** Estimativa pública (Nominatim + OSRM), só ligada por propriedade. Só km. Nunca lança. */
function ComRo_osm_(origem, destino) {
  try { if (Com_up_(PropertiesService.getScriptProperties().getProperty('COM_ROTAS_ESTIMATIVA_PUBLICA')) !== 'SIM') return null; } catch (e) { return null; }
  try {
    var geo = function (q) {
      var r = UrlFetchApp.fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(q), { muteHttpExceptions: true, headers: { 'User-Agent': 'SGO-Metrolabs/1.0 (comercial)' } });
      var l = JSON.parse(r.getContentText() || '[]'); return l && l[0] ? [Number(l[0].lon), Number(l[0].lat)] : null;
    };
    var a = geo(origem), b = geo(destino);
    if (!a || !b) return null;
    var r = UrlFetchApp.fetch('https://router.project-osrm.org/route/v1/driving/' + a.join(',') + ';' + b.join(',') + '?overview=false', { muteHttpExceptions: true });
    var j = JSON.parse(r.getContentText() || '{}'), rota = (j.routes || [])[0];
    return rota && Number(rota.distance) > 0 ? { km: Math.round(Number(rota.distance) / 100) / 10 } : null;
  } catch (e) { return null; }
}

/**
 * Sugestão de km e pedágio para a rota. { km, pedagio (ida e volta), fonteKm, fontePedagio, textoFonte, avisos[] }. Nunca lança por falta
 * do serviço: sem sugestão, km e pedágio vêm null e o texto diz o que fazer.
 */
function ComRo_sugerir_(origem, destino) {
  origem = Com_texto_(origem, 200).trim(); destino = Com_texto_(destino, 300).trim();
  var r = { origem: origem, destino: destino, ufOrigem: ComRo_uf_(origem), ufDestino: ComRo_uf_(destino), km: null, pedagio: null, fonteKm: '', fontePedagio: '', textoFonte: '', avisos: [] };
  if (!origem || !destino) { r.avisos.push('Informe a cidade de origem e a de destino (Cidade/UF).'); return r; }
  if (Com_normBusca_(origem) === Com_normBusca_(destino)) { r.km = 0; r.pedagio = 0; r.fonteKm = 'DIGITADO'; r.fontePedagio = 'DIGITADO'; r.textoFonte = 'Mesma cidade: 0 km e sem pedágio.'; return r; }
  var b = ComRo_doBanco_(origem, destino);
  if (b) { Object.assign(r, b); if (b.pedagio === null) r.avisos.push('O banco de rotas tem o km, mas não o pedágio desta rota: informe o pedágio e guarde a rota.'); return r; }
  var g = ComRo_google_(origem, destino);
  if (g && !g.semChave && !g.erro && g.km !== undefined) {
    r.km = g.km; r.pedagio = g.pedagio; r.fonteKm = 'CALCULO_GOOGLE'; r.fontePedagio = g.pedagio === null ? '' : 'CALCULO_GOOGLE';
    r.textoFonte = 'Cálculo automático da rota (Google): ' + String(g.km).replace('.', ',') + ' km o trecho' + (g.pedagio === null ? '' : '; pedágio estimado ida e volta ' + Com_moeda_(g.pedagio)) + '. Confira e guarde no banco de rotas.';
    if (g.aviso) r.avisos.push(g.aviso);
    return r;
  }
  if (g && g.erro) r.avisos.push('Cálculo automático indisponível: ' + g.erro + '.');
  if (Com_normBusca_(origem) === Com_normBusca_('Goiânia/GO') && typeof ComPr_referencias_ === 'function') {
    var ref = ComPr_referencias_().filter(function (x) { return Com_normBusca_(x.destino) === Com_normBusca_(destino); })[0];
    if (ref) { r.km = ref.km; r.fonteKm = 'REFERENCIA_CONDUTA'; r.textoFonte = 'Km pela tabela de distâncias do Programa de conduta (a partir de Goiânia).'; }
  }
  if (r.km === null) { var o = ComRo_osm_(origem, destino); if (o) { r.km = o.km; r.fonteKm = 'ESTIMATIVA_OSM'; r.textoFonte = 'Estimativa pública do km (OpenStreetMap): confira antes de usar.'; } }
  if (r.km === null) r.avisos.push((g && g.semChave ? 'O cálculo automático de km e pedágio está desligado (falta a chave do serviço de rotas, que o dono cadastra em Administração > Chaves e senhas). ' : '') + 'Informe o km do trecho (só a ida) e o pedágio; ao guardar a rota, a próxima proposta já usa.');
  if (r.pedagio === null) r.avisos.push('Pedágio: informe o valor de ida e volta (ou 0 se a rota não tem pedágio).');
  return r;
}

/** Tela: sugerir para a proposta. d: { origem, destino } */
function ComRo_calcular_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'calcular a rota');
  var r = ComRo_sugerir_(d && d.origem, d && d.destino);
  r.fonteKmNome = COM_RO_FONTES[r.fonteKm] || ''; r.fontePedagioNome = COM_RO_FONTES[r.fontePedagio] || '';
  return { rota: r, message: r.km === null ? r.avisos.join(' ') : (r.textoFonte || 'Rota sugerida.') + (r.avisos.length ? ' ' + r.avisos.join(' ') : '') };
}

/** Conferir e guardar no banco de rotas. d: { origem, destino, km, pedagio, propostaId, obs, fonteKm, fontePedagio } */
function ComRo_conferir_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'guardar a rota');
  d = d || {};
  var origem = Com_texto_(d.origem, 200).trim(), destino = Com_texto_(d.destino, 300).trim();
  if (!ComRo_uf_(origem) || !ComRo_uf_(destino)) throw new Error('Não foi possível guardar a rota: escreva a origem e o destino como "Cidade/UF" (ex.: Rio de Janeiro/RJ e Angra dos Reis/RJ), para o banco de rotas achar depois');
  var km = Com_num_(d.km);
  if (!(isFinite(km) && km > 0 && km <= 5000)) throw new Error('Não foi possível guardar a rota: o km do trecho (só a ida) precisa ser um número de 1 a 5.000');
  var ped = Com_s_(d.pedagio) === '' ? null : Com_num_(d.pedagio);
  if (ped !== null && !(isFinite(ped) && ped >= 0 && ped <= 20000)) throw new Error('Não foi possível guardar a rota: o pedágio (ida e volta) precisa ser um valor em reais, ou 0 se não há pedágio');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var chave = ComRo_chave_(origem, destino), agora = Com_agora_();
    ComRo_lerAtivas_().filter(function (r) { return Com_s_(r.CHAVE) === chave; }).forEach(function (r) { SGO_DATA.update(COM_RO_ABA, r.ID, { SITUACAO: 'SUBSTITUIDA', ATUALIZADO_EM: agora }); });
    var fk = COM_RO_FONTES[Com_up_(d.fonteKm)] !== undefined ? Com_up_(d.fonteKm) : 'DIGITADO', fp = COM_RO_FONTES[Com_up_(d.fontePedagio)] !== undefined ? Com_up_(d.fontePedagio) : 'DIGITADO';
    var reg = SGO_DATA.insert(COM_RO_ABA, { CHAVE: chave, ORIGEM: origem, DESTINO: destino, UF_ORIGEM: ComRo_uf_(origem), UF_DESTINO: ComRo_uf_(destino), KM_TRECHO: Math.round(km * 10) / 10,
      PEDAGIO_IDA_VOLTA: ped === null ? '' : Com_r2_(ped), FONTE_KM: fk === 'BANCO_ROTAS' ? 'DIGITADO' : fk, FONTE_PEDAGIO: ped === null ? '' : (fp === 'BANCO_ROTAS' ? 'DIGITADO' : fp), CONFERIDO_POR_ID: eu.id, CONFERIDO_POR_NOME: eu.nome,
      CONFERIDO_EM: agora, PROPOSTA_ID: Com_s_(d.propostaId), OBS: Com_texto_(d.obs, 300), SITUACAO: 'ATIVA', ATUALIZADO_EM: agora });
    if (Com_s_(d.propostaId)) Com_historico_('PROPOSTA', Com_s_(d.propostaId), 'ROTA_CONFERIDA', eu, { texto: 'Rota ' + origem + ' → ' + destino + ' guardada no banco de rotas: ' + String(Math.round(km * 10) / 10).replace('.', ',') + ' km o trecho' + (ped === null ? '' : ', pedágio ida e volta ' + Com_moeda_(ped)) + '.' });
    return { rota: { id: Com_s_(reg.ID), origem: origem, destino: destino, km: Math.round(km * 10) / 10, pedagio: ped }, message: 'Rota guardada no banco de rotas. A próxima proposta com a mesma rota já usa estes números.' };
  });
}

/** Banco de rotas para a tela (gestão e vendedores). d: { busca } */
function ComRo_listar_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'ver o banco de rotas');
  var termos = typeof Com_termosBusca_ === 'function' ? Com_termosBusca_(d && d.busca) : [];
  var l = ComRo_lerAtivas_().filter(function (r) { return !termos.length || Com_casaBusca_(termos, [Com_s_(r.ORIGEM), Com_s_(r.DESTINO)]); })
    .sort(function (a, b) { return String(a.ORIGEM + a.DESTINO).localeCompare(String(b.ORIGEM + b.DESTINO), 'pt-BR'); }).slice(0, 300)
    .map(function (r) { return { origem: Com_s_(r.ORIGEM), destino: Com_s_(r.DESTINO), km: Number(r.KM_TRECHO), pedagio: Com_s_(r.PEDAGIO_IDA_VOLTA) === '' ? null : Number(r.PEDAGIO_IDA_VOLTA),
      pedagioTxt: Com_s_(r.PEDAGIO_IDA_VOLTA) === '' ? 'não informado' : Com_moeda_(r.PEDAGIO_IDA_VOLTA), fonte: COM_RO_FONTES[Com_up_(r.FONTE_KM)] || '', por: Com_s_(r.CONFERIDO_POR_NOME), em: Com_brDia_(r.CONFERIDO_EM) }; });
  var chaveGoogle = false;
  try { chaveGoogle = !!Com_s_(PropertiesService.getScriptProperties().getProperty('GOOGLE_ROUTES_API_KEY')); } catch (e) {}
  return { rotas: l, calculoAutomatico: chaveGoogle };
}
