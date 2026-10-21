/****************************************************
 * FROTA — IDENTIFICAÇÃO FÁCIL DOS VEÍCULOS (21/10/2026, pedido do dono)
 *
 * "Temos carros, modelos e cores iguais": cada veículo ganha um APELIDO
 * (nome de animal brasileiro, ex.: Onça, Tucano) e uma BASE (Goiânia, Rio
 * de Janeiro...). O veículo passa a aparecer em todo lugar como
 * "Onça · PQB4394 · Onix branco · Goiânia" (completo) ou "Onça · PQB4394"
 * (curto, em tabelas e listas apertadas). Sem apelido, aparece a placa,
 * como antes.
 *
 *  - Colunas novas em CAD_VEICULOS: APELIDO e BASE (COR já existia). Só
 *    acrescentadas; nada é apagado nem reescrito.
 *  - Apelido único entre os veículos ativos, sem diferenciar maiúscula,
 *    acento, hífen ou espaço ("Lobo-guará" = "lobo guara").
 *  - Bases: lista configurável pela gestão (propriedade FROTA_BASES); padrão
 *    Goiânia e Rio de Janeiro. O SGO+ não tem cadastro de filial da
 *    Metrolabs (CAD_UNIDADES são os locais dos clientes; CAD_AREAS são
 *    departamentos), por isso a lista fica aqui. Base em uso por veículo
 *    ativo não sai da lista.
 *  - Toda resposta da Frota (Frota_apiDispatch) e da ponte do COMMAND passa
 *    por FrotaId_enfeitarResposta_: objeto com "placa" ganha apelido,
 *    baseFrota, rotuloVeiculo (curto) e identVeiculo (completo); com
 *    "veiculoPlaca", os mesmos com o prefixo "veiculo"; linha do cadastro
 *    (PLACA) ganha ROTULO_VEICULO e IDENT_VEICULO. Nenhum campo existente é
 *    trocado (a placa continua a mesma em todo objeto).
 ****************************************************/

var FROTA_ID_PROP_BASES = 'FROTA_BASES';
var FROTA_ID_BASES_PADRAO = ['Goiânia', 'Rio de Janeiro'];
var FROTA_ID_APELIDO_MAX = 30;

// Nomes de animais brasileiros fáceis de lembrar e de falar ao telefone.
var FROTA_ID_ANIMAIS = [
  'Onça', 'Tucano', 'Arara', 'Capivara', 'Tatu', 'Jacaré', 'Tamanduá', 'Lobo-guará', 'Mico', 'Sabiá',
  'Bem-te-vi', 'Quati', 'Jabuti', 'Boto', 'Peixe-boi', 'Ariranha', 'Anta', 'Seriema', 'Gavião', 'Coruja',
  'Beija-flor', 'Papagaio', 'Periquito', 'Sucuri', 'Jiboia', 'Preguiça', 'Cutia', 'Paca', 'Veado', 'Jaguatirica',
  'Gralha', 'Carcará', 'Tuiuiú', 'Ema', 'Pirarucu', 'Tambaqui', 'Sagui', 'Bugio', 'Tartaruga', 'Golfinho',
  'Baleia', 'Garça', 'Canário', 'João-de-barro', 'Pica-pau', 'Curió', 'Azulão', 'Mutum', 'Lontra', 'Raposa',
  'Suçuarana', 'Cervo', 'Pintado', 'Dourado', 'Tucunaré', 'Marreco', 'Andorinha', 'Pardal', 'Jandaia', 'Uirapuru'
];

/** Chave de comparação: sem acento, maiúscula, só letras e números separados por um espaço. */
function FrotaId_chave_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}
function FrotaId_s_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
function FrotaId_ativo_(v) { return String((v && v.STATUS) || '').trim().toUpperCase() !== 'INATIVO'; }

// ---------------- bases ----------------
function FrotaId_bases_() {
  var lista = null;
  try {
    var bruto = PropertiesService.getScriptProperties().getProperty(FROTA_ID_PROP_BASES);
    if (bruto) lista = JSON.parse(bruto);
  } catch (e) { lista = null; }
  if (!Array.isArray(lista) || !lista.length) lista = FROTA_ID_BASES_PADRAO.slice();
  var vistas = {};
  return lista.map(FrotaId_s_).filter(function (b) { var k = FrotaId_chave_(b); if (!k || vistas[k]) return false; vistas[k] = 1; return true; });
}

/** Nome da base como está na lista (grafia da lista), '' se vazio; erro se não estiver na lista. */
function FrotaId_baseValida_(texto) {
  var k = FrotaId_chave_(texto);
  if (!k) return '';
  var achada = FrotaId_bases_().filter(function (b) { return FrotaId_chave_(b) === k; })[0];
  if (!achada) throw new Error('A base "' + FrotaId_s_(texto) + '" não está na lista de bases da Frota (' + FrotaId_bases_().join(', ') + '). Escolha uma da lista ou peça à gestão para incluir em Frota > Veículos e condutores > Bases da frota.');
  return achada;
}

// ---------------- apelido ----------------
function FrotaId_apelidoLimpo_(texto) {
  var a = FrotaId_s_(texto);
  if (!a) return '';
  if (a.length > FROTA_ID_APELIDO_MAX) throw new Error('O apelido tem no máximo ' + FROTA_ID_APELIDO_MAX + ' letras. Use um nome curto, fácil de falar (ex.: Onça, Tucano).');
  if (!/[A-Za-zÀ-ÿ]/.test(a)) throw new Error('O apelido precisa ter letras (ex.: Onça, Tucano).');
  if (/[<>"]/.test(a)) throw new Error('O apelido não pode ter os sinais < > ou aspas.');
  return a.charAt(0).toUpperCase() + a.slice(1);
}

/** Recusa apelido já usado por outro veículo ativo (sem diferenciar maiúscula/acento). */
function FrotaId_conferirApelidoUnico_(apelido, idIgnorar, veiculos) {
  var k = FrotaId_chave_(apelido);
  if (!k) return;
  var lista = veiculos || Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS);
  var outro = lista.filter(function (v) {
    return String(v.ID) !== String(idIgnorar || '') && FrotaId_ativo_(v) && FrotaId_chave_(v.APELIDO) === k;
  })[0];
  if (outro) throw new Error('O apelido "' + FrotaId_s_(apelido) + '" já é do veículo ' + FrotaId_s_(outro.PLACA) + '. Cada veículo ativo tem um apelido diferente: escolha outro ou clique em "Sugerir apelido".');
}

/** Até "quantos" nomes da lista que nenhum veículo usa (ativo ou inativo), em ordem embaralhada. */
function FrotaId_sugestoes_(quantos, veiculos, excluir) {
  var usados = {};
  (veiculos || Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS)).forEach(function (v) { var k = FrotaId_chave_(v.APELIDO); if (k) usados[k] = 1; });
  (excluir || []).forEach(function (x) { var k = FrotaId_chave_(x); if (k) usados[k] = 1; });
  var livres = FROTA_ID_ANIMAIS.filter(function (a) { return !usados[FrotaId_chave_(a)]; });
  for (var i = livres.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = livres[i]; livres[i] = livres[j]; livres[j] = t; }
  return livres.slice(0, Math.max(1, quantos || 5));
}

// ---------------- rótulo ----------------
/** Rótulo do veículo. completo: "Onça · PQB4394 · Onix branco · Goiânia"; curto: "Onça · PQB4394". Sem apelido: a placa. */
function Frota_rotuloVeiculo_(v, completo) {
  v = v || {};
  var apelido = FrotaId_s_(v.APELIDO !== undefined ? v.APELIDO : v.apelido);
  var placa = FrotaId_s_(v.PLACA !== undefined ? v.PLACA : v.placa).toUpperCase();
  var partes = [apelido, placa].filter(Boolean);
  if (completo) {
    var modelo = FrotaId_s_(v.MODELO !== undefined ? v.MODELO : v.modelo);
    var cor = FrotaId_s_(v.COR !== undefined ? v.COR : v.cor).toLowerCase();
    var base = FrotaId_s_(v.BASE !== undefined ? v.BASE : (v.baseFrota !== undefined ? v.baseFrota : v.base));
    var mc = [modelo, cor].filter(Boolean).join(' ');
    if (mc) partes.push(mc);
    if (base) partes.push(base);
  }
  return partes.join(' · ');
}

/** Mapa do cadastro: por ID e por placa (chave sem acento). Lido uma vez por resposta. */
function FrotaId_mapa_(veiculos) {
  var m = { porId: {}, porPlaca: {} };
  (veiculos || Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS)).forEach(function (v) {
    var info = { id: String(v.ID || ''), placa: FrotaId_s_(v.PLACA).toUpperCase(), apelido: FrotaId_s_(v.APELIDO), base: FrotaId_s_(v.BASE),
      modelo: FrotaId_s_(v.MODELO), cor: FrotaId_s_(v.COR) };
    info.rotulo = Frota_rotuloVeiculo_({ APELIDO: info.apelido, PLACA: info.placa });
    info.ident = Frota_rotuloVeiculo_({ APELIDO: info.apelido, PLACA: info.placa, MODELO: info.modelo, COR: info.cor, BASE: info.base }, true);
    if (info.id) m.porId[info.id] = info;
    if (info.placa) m.porPlaca[FrotaId_chave_(info.placa)] = info;
  });
  return m;
}

/** Rótulo curto pela placa (texto de aviso, relatório, alerta); a placa crua se o veículo não estiver no cadastro. */
function FrotaId_rotuloPorPlaca_(placa, mapa, completo) {
  var m = mapa || FrotaId_mapa_();
  var info = m.porPlaca[FrotaId_chave_(placa)];
  if (!info) return FrotaId_s_(placa);
  return completo ? info.ident : info.rotulo;
}
/** O mesmo rótulo curto para textos montados em laço (central de pendências, Caixa de decisões, qualidade): cadastro lido no máximo a cada 5 s. */
var FROTA_ID_CACHE_ = null;
function FrotaId_rotuloRapido_(placa) {
  try {
    var agora = Date.now();
    if (!FROTA_ID_CACHE_ || agora - FROTA_ID_CACHE_.em > 5000) FROTA_ID_CACHE_ = { em: agora, m: FrotaId_mapa_() };
    return FrotaId_rotuloPorPlaca_(placa, FROTA_ID_CACHE_.m);
  } catch (e) { return FrotaId_s_(placa); }
}
function FrotaId_rotuloPorId_(id, mapa, completo, placaReserva) {
  var m = mapa || FrotaId_mapa_();
  var info = m.porId[String(id || '')];
  if (!info) return placaReserva ? FrotaId_rotuloPorPlaca_(placaReserva, m, completo) : '';
  return completo ? info.ident : info.rotulo;
}

/**
 * Acrescenta a identificação a toda resposta (sem trocar campo existente). Falha aqui nunca derruba a resposta.
 */
function FrotaId_enfeitarResposta_(res, mapa) {
  if (!res || typeof res !== 'object') return res;
  var m;
  try { m = mapa || FrotaId_mapa_(); } catch (e) { return res; }
  var vistos = 0;
  var andar = function (o, prof) {
    if (!o || typeof o !== 'object' || prof > 8 || ++vistos > 20000) return;
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) andar(o[i], prof + 1); return; }
    if (Object.prototype.toString.call(o) !== '[object Object]') return;
    var info;
    if (typeof o.placa === 'string' && o.placa && o.rotuloVeiculo === undefined) {
      info = (o.veiculoId && m.porId[String(o.veiculoId)]) || m.porPlaca[FrotaId_chave_(o.placa)];
      if (info) {
        if (o.apelido === undefined) o.apelido = info.apelido;
        if (o.baseFrota === undefined) o.baseFrota = info.base;
        o.rotuloVeiculo = info.rotulo;
        o.identVeiculo = Frota_rotuloVeiculo_({ APELIDO: info.apelido, PLACA: info.placa, MODELO: o.modelo || info.modelo, COR: o.cor && !/^#/.test(o.cor) ? o.cor : info.cor, BASE: info.base }, true);
      }
    }
    if (typeof o.veiculoPlaca === 'string' && o.veiculoPlaca && o.veiculoRotulo === undefined) {
      info = (o.veiculoId && m.porId[String(o.veiculoId)]) || m.porPlaca[FrotaId_chave_(o.veiculoPlaca)];
      if (info) {
        o.veiculoApelido = info.apelido; o.veiculoBase = info.base; o.veiculoRotulo = info.rotulo; o.veiculoIdent = info.ident;
      }
    }
    if (typeof o.PLACA === 'string' && o.PLACA && o.ROTULO_VEICULO === undefined) {
      info = (o.ID && m.porId[String(o.ID)]) || m.porPlaca[FrotaId_chave_(o.PLACA)];
      if (info) { o.ROTULO_VEICULO = info.rotulo; o.IDENT_VEICULO = info.ident; }
    }
    for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k) && o[k] && typeof o[k] === 'object') andar(o[k], prof + 1); }
  };
  try { andar(res, 0); } catch (e2) { console.error('Frota, identificação: ' + ((e2 && e2.message) || e2)); }
  return res;
}

// ---------------- colunas ----------------
function FrotaId_garantirColunas_() {
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_VEICULOS, 'APELIDO');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_VEICULOS, 'BASE');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_VEICULOS, 'COR');
}

// ---------------- APIs ----------------
/** Bases, quantos veículos ativos estão sem apelido/sem base e sugestões de apelido. Toda a equipe (as listas e o mapa usam). */
function Frota_apiListarIdentificacao(sessionId) {
  Frota_exigirEquipe_(sessionId);
  var veics = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS);
  var ativos = veics.filter(FrotaId_ativo_);
  var gestao = Frota_ehGestao_(sessionId);
  return {
    ok: true, bases: FrotaId_bases_(), podeEditar: gestao,
    semApelido: ativos.filter(function (v) { return !FrotaId_s_(v.APELIDO); }).length,
    semBase: ativos.filter(function (v) { return !FrotaId_s_(v.BASE); }).length,
    sugestoes: gestao ? FrotaId_sugestoes_(8, veics) : []
  };
}

/** Sugestões de apelido que ninguém usa (payload.excluir: as que a pessoa já viu e recusou). Só a gestão. */
function Frota_apiListarSugestoesApelido(sessionId, payload) {
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  var ex = (payload && payload.excluir) || [];
  var s = FrotaId_sugestoes_(8, null, Array.isArray(ex) ? ex : []);
  if (!s.length) s = FrotaId_sugestoes_(8, null, []);
  return { ok: true, sugestoes: s, esgotou: !FrotaId_sugestoes_(1, null, []).length };
}

/** Grava a lista de bases (só a gestão). Base em uso por veículo ativo não sai. */
function Frota_apiSalvarBasesFrota(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  var entrada = payload && payload.bases;
  if (typeof entrada === 'string') entrada = entrada.split(/[\n;,]+/);
  if (!Array.isArray(entrada)) throw new Error('Informe as bases, uma por linha.');
  var vistas = {}, nova = [];
  entrada.forEach(function (b) {
    var s = FrotaId_s_(b); var k = FrotaId_chave_(s);
    if (!k || vistas[k]) return;
    if (s.length > 40) throw new Error('Nome de base muito longo: "' + s.slice(0, 40) + '..." (máximo 40 letras).');
    vistas[k] = 1; nova.push(s);
  });
  if (!nova.length) throw new Error('A lista precisa de pelo menos uma base (ex.: Goiânia).');
  if (nova.length > 20) throw new Error('No máximo 20 bases.');
  var emUso = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(FrotaId_ativo_).forEach(function (v) {
    var k = FrotaId_chave_(v.BASE); if (k && !vistas[k]) (emUso[FrotaId_s_(v.BASE)] = emUso[FrotaId_s_(v.BASE)] || []).push(FrotaId_s_(v.PLACA));
  });
  var faltam = Object.keys(emUso);
  if (faltam.length) {
    throw new Error('A base ' + faltam.map(function (b) { return '"' + b + '" (veículos ' + emUso[b].join(', ') + ')'; }).join(' e ') +
      ' ainda está em uso. Troque a base desses veículos em Editar e depois tire da lista.');
  }
  PropertiesService.getScriptProperties().setProperty(FROTA_ID_PROP_BASES, JSON.stringify(nova));
  SGO_DATA.log('FROTA_BASES_SALVAR', sessao.usuario, 'Bases da Frota: ' + nova.join(', '), 'FROTA');
  return { ok: true, bases: nova };
}
