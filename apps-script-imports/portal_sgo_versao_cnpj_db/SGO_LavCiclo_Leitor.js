/****************************************************
 * RELATÓRIO DO CICLO DA LAVADORA — LEITOR DO ARQUIVO .sgolav (31/10/2026)
 *
 * Pedido do dono (31/10/2026): importar o arquivo que a lavadora ultrassônica grava a cada ciclo e gerar o relatório A4
 * de uma folha. Este arquivo só LÊ e confere o arquivo; não grava nada e não depende de serviço do Apps Script (roda
 * igual no servidor, no Google e nos testes em Node).
 *
 * Formato (conferido no firmware da IHM, sgolavGravar, e em 59 arquivos reais do cartão da máquina):
 *  - linha 1: "SGOLAV1";
 *  - resto: Base64 de um texto "CHAVE=valor" por linha, embaralhado com XOR pela chave METROLABS-SGOLAV-2026. É só
 *    ofuscação (não é criptografia nem assinatura): quem tem o arquivo e a chave consegue alterar o conteúdo. O leitor
 *    recusa o que não tem a estrutura certa (linha fora do padrão, chave repetida, contagem de fases ou de eventos que
 *    não bate, número inválido), o que pega arquivo corrompido, truncado ou mexido à mão;
 *  - o texto vem em UTF-8 nos arquivos reais; arquivo em Latin-1/Windows-1252 também é aceito (acentos convertidos);
 *  - campos: LOTE, RECEITA, OPERADOR, DATA (dd/mm/aaaa), HORA, RESULTADO, TEMPFINAL (ou INDISPONIVEL), MANUTVENCIDA
 *    (SIM/NAO), INICIOEPOCH, FIMEPOCH, CODFALHA, FALHA, FASES=n e FASEi=nome|duraçãoSeg|tempMax|inícioEpoch (o 4º campo
 *    falta nos arquivos antigos; tempMax e o 4º campo podem ser INDISPONIVEL), EVENTOS=n e EVTi=HH:MM|texto|dd/mm/aaaa
 *    (a data falta nos arquivos antigos). Arquivos antigos também não trazem INICIOEPOCH, FIMEPOCH, CODFALHA e FALHA;
 *  - campo futuro: SERIE= ou EQUIPAMENTO= (próxima revisão do firmware). Quem confere contra o cadastro é
 *    LavCicL_conferirEquipamento_; campo desconhecido fica guardado em "extras" e não derruba a leitura.
 *
 * Relógio: a lavadora grava o relógio local de parede como se fosse UTC (o firmware usa localtime_r sem fuso). Por isso
 * as épocas são formatadas sem deslocamento: INICIOEPOCH 1793385724 = 30/10/2026 18:42:04, o mesmo horário do evento
 * "CICLO INICIADO" do arquivo.
 * Nenhuma função devolve Date: só texto e número.
 ****************************************************/

var LAVCIC_CABECALHO = 'SGOLAV1';
var LAVCIC_CHAVE_XOR = 'METROLABS-SGOLAV-2026';
var LAVCIC_TAMANHO_MAX = 65536;
var LAVCIC_FASES_MAX = 64;
var LAVCIC_EVENTOS_MAX = 300;
var LAVCIC_OBRIGATORIOS = ['LOTE', 'RECEITA', 'OPERADOR', 'DATA', 'HORA', 'RESULTADO', 'FASES', 'EVENTOS'];
var LAVCIC_CONHECIDOS = ['LOTE', 'RECEITA', 'OPERADOR', 'DATA', 'HORA', 'RESULTADO', 'TEMPFINAL', 'MANUTVENCIDA', 'INICIOEPOCH', 'FIMEPOCH',
  'CODFALHA', 'FALHA', 'FASES', 'EVENTOS', 'SERIE', 'EQUIPAMENTO'];
/** Windows-1252 de 0x80 a 0x9F (o resto do Latin-1 é igual ao Unicode). */
var LAVCIC_CP1252 = { 128: 8364, 130: 8218, 131: 402, 132: 8222, 133: 8230, 134: 8224, 135: 8225, 136: 710, 137: 8240, 138: 352, 139: 8249, 140: 338,
  142: 381, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226, 150: 8211, 151: 8212, 152: 732, 153: 8482, 154: 353, 155: 8250, 156: 339, 158: 382, 159: 376 };

/** Erro com código e a mensagem completa para o operador (o quê, por quê, o que fazer). */
function LavCicL_erro_(codigo, oque, porque, fazer) {
  var e = new Error(oque + ' Por quê: ' + porque + ' O que fazer: ' + fazer);
  e.codigo = codigo;
  return e;
}

var LAVCIC_FAZER_ARQUIVO = 'copie de novo o arquivo .sgolav do ciclo direto da lavadora (pelo Wi-Fi da máquina ou pelo cartão) e escolha o arquivo sem abrir nem editar; se o problema continuar com o arquivo novo, avise a Metrolabs.';

/** Base64 -> bytes (0..255). Lança se tiver caractere fora do alfabeto ou tamanho impossível. */
function LavCicL_base64_(s) {
  var alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var limpo = String(s || '').replace(/\s+/g, '');
  if (!limpo) throw LavCicL_erro_('VAZIO', 'O arquivo não traz os dados do ciclo.', 'depois da primeira linha (SGOLAV1) não há conteúdo.', LAVCIC_FAZER_ARQUIVO);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(limpo) || limpo.length % 4 === 1) {
    throw LavCicL_erro_('ALTERADO', 'O conteúdo do arquivo está corrompido ou foi alterado.', 'o bloco codificado tem caracteres que a lavadora não grava.', LAVCIC_FAZER_ARQUIVO);
  }
  var sem = limpo.replace(/=+$/, ''), bytes = [], buf = 0, bits = 0;
  for (var i = 0; i < sem.length; i++) {
    buf = (buf << 6) | alfabeto.indexOf(sem.charAt(i));
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); }
  }
  return bytes;
}

/** Bytes -> texto UTF-8; devolve null se a sequência não for UTF-8 válido. */
function LavCicL_utf8_(b) {
  var out = '', i = 0;
  while (i < b.length) {
    var c = b[i], n = 0, cp = 0;
    if (c < 0x80) { out += String.fromCharCode(c); i++; continue; }
    if (c >= 0xC2 && c <= 0xDF) { n = 1; cp = c & 0x1F; }
    else if (c >= 0xE0 && c <= 0xEF) { n = 2; cp = c & 0x0F; }
    else if (c >= 0xF0 && c <= 0xF4) { n = 3; cp = c & 0x07; }
    else return null;
    for (var k = 1; k <= n; k++) {
      var cc = b[i + k];
      if (cc === undefined || (cc & 0xC0) !== 0x80) return null;
      cp = (cp << 6) | (cc & 0x3F);
    }
    if ((n === 2 && cp < 0x800) || (n === 3 && (cp < 0x10000 || cp > 0x10FFFF)) || (cp >= 0xD800 && cp <= 0xDFFF)) return null;
    out += cp > 0xFFFF ? String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10), 0xDC00 + ((cp - 0x10000) & 0x3FF)) : String.fromCharCode(cp);
    i += n + 1;
  }
  return out;
}

/** Bytes -> texto Windows-1252 (Latin-1 com os símbolos de 0x80 a 0x9F). */
function LavCicL_cp1252_(b) {
  var out = '';
  for (var i = 0; i < b.length; i++) out += String.fromCharCode(LAVCIC_CP1252[b[i]] || b[i]);
  return out;
}

/**
 * Tira o cabeçalho, o Base64 e o XOR. Devolve { texto, codificacao: 'UTF-8'|'WINDOWS-1252' }. Lança erro com código.
 */
function LavCicL_decodificar_(conteudo) {
  var txt = String(conteudo == null ? '' : conteudo).replace(/^﻿/, '');
  if (!txt.trim()) throw LavCicL_erro_('VAZIO', 'O arquivo escolhido está vazio.', 'não há nenhum conteúdo para ler.', LAVCIC_FAZER_ARQUIVO);
  if (txt.length > LAVCIC_TAMANHO_MAX) throw LavCicL_erro_('GRANDE', 'O arquivo é grande demais para ser o arquivo de um ciclo.', 'o arquivo .sgolav de um ciclo tem poucos kilobytes; este passa de 64 KB.', 'confira se escolheu o arquivo .sgolav do ciclo (e não outro arquivo da máquina).');
  var linhas = txt.split(/\r?\n/);
  if (String(linhas[0]).trim() !== LAVCIC_CABECALHO) {
    throw LavCicL_erro_('FORMATO', 'Este arquivo não é o arquivo de ciclo da lavadora (.sgolav).', 'a primeira linha deveria ser "SGOLAV1" e não é. Os arquivos .csv e .txt que a lavadora também grava não servem aqui.', 'escolha o arquivo com final .sgolav do mesmo lote.');
  }
  var bytes = LavCicL_base64_(linhas.slice(1).join(''));
  var chave = LAVCIC_CHAVE_XOR;
  for (var i = 0; i < bytes.length; i++) bytes[i] = bytes[i] ^ chave.charCodeAt(i % chave.length);
  var utf = LavCicL_utf8_(bytes);
  return utf !== null ? { texto: utf, codificacao: 'UTF-8' } : { texto: LavCicL_cp1252_(bytes), codificacao: 'WINDOWS-1252' };
}

function LavCicL_inteiro_(v) { var s = String(v == null ? '' : v).trim(); return /^-?\d+$/.test(s) ? parseInt(s, 10) : null; }
function LavCicL_numero_(v) { var s = String(v == null ? '' : v).trim(); return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null; }
function LavCicL_indisp_(v) { return /^INDISPON[IÍ]VEL$/i.test(String(v == null ? '' : v).trim()); }
function LavCicL_2_(n) { return (n < 10 ? '0' : '') + n; }

/** Época da lavadora (relógio local gravado como UTC) -> { data: 'dd/mm/aaaa', hora: 'HH:MM:SS', iso: 'aaaa-mm-ddTHH:MM:SS' }. */
function LavCicL_epoca_(ep) {
  if (ep === null || ep === undefined || !isFinite(ep) || ep <= 0) return null;
  var d = new Date(Number(ep) * 1000);
  var data = LavCicL_2_(d.getUTCDate()) + '/' + LavCicL_2_(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  var hora = LavCicL_2_(d.getUTCHours()) + ':' + LavCicL_2_(d.getUTCMinutes()) + ':' + LavCicL_2_(d.getUTCSeconds());
  return { data: data, hora: hora, iso: d.getUTCFullYear() + '-' + LavCicL_2_(d.getUTCMonth() + 1) + '-' + LavCicL_2_(d.getUTCDate()) + 'T' + hora, ano: d.getUTCFullYear() };
}

/** 'dd/mm/aaaa' + 'HH:MM[:SS]' -> segundos na mesma escala das épocas da lavadora (ou null). */
function LavCicL_segundosDe_(data, hora) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(data || '')), h = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(hora || ''));
  if (!m || !h) return null;
  var ms = Date.UTC(+m[3], +m[2] - 1, +m[1], +h[1], +h[2], +(h[3] || 0));
  return isFinite(ms) ? Math.round(ms / 1000) : null;
}

/** Grupo da fase para o gráfico e o texto (nomes curtos do firmware). */
function LavCicL_grupoFase_(nome) {
  var n = String(nome || '').toUpperCase();
  if (/^(ABORT|CANCEL)/.test(n)) return 'CANCELAMENTO';
  if (/^DESINFETANDO/.test(n)) return 'DESINFECCAO';
  if (/^DESINF/.test(n)) return 'PREPARO_DESINFECCAO';
  if (/^ENX/.test(n)) return 'ENXAGUE';
  if (/^(DRENANDO|ARREFEC|SECAND|RESFRI)/.test(n)) return 'FINAL';
  return 'LAVAGEM';
}

/**
 * Lê o conteúdo do arquivo (texto). Nunca lança: devolve { ok: true, ciclo, avisos } ou { ok: false, codigo, message }.
 */
function LavCicL_ler_(conteudo) {
  try {
    var dec = LavCicL_decodificar_(conteudo);
    return LavCicL_interpretar_(dec.texto, dec.codificacao);
  } catch (e) {
    return { ok: false, codigo: (e && e.codigo) || 'ERRO', message: String((e && e.message) || e) };
  }
}

/** Interpreta o texto já decodificado. Lança erro com código. */
function LavCicL_interpretar_(texto, codificacao) {
  var alterado = function (porque) { return LavCicL_erro_('ALTERADO', 'O conteúdo do arquivo está corrompido, incompleto ou foi alterado.', porque, LAVCIC_FAZER_ARQUIVO); };
  var campos = {}, ordem = [];
  String(texto || '').split(/\r?\n/).forEach(function (linha, i) {
    if (!linha.trim()) return;
    var m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(linha);
    if (!m) throw alterado('a linha ' + (i + 1) + ' dos dados não está no formato que a lavadora grava (CHAVE=valor).');
    if (Object.prototype.hasOwnProperty.call(campos, m[1])) throw alterado('o campo ' + m[1] + ' aparece duas vezes.');
    campos[m[1]] = m[2].replace(/\s+$/, '');
    ordem.push(m[1]);
  });
  var faltam = LAVCIC_OBRIGATORIOS.filter(function (k) { return !Object.prototype.hasOwnProperty.call(campos, k); });
  if (faltam.length) throw alterado('faltam os campos ' + faltam.join(', ') + ', que toda lavadora grava.');
  var avisos = [];
  var lote = String(campos.LOTE).trim();
  if (!/^[A-Za-z0-9._\-\/ ]{1,40}$/.test(lote)) throw alterado('o número do lote (' + lote.slice(0, 50) + ') tem caracteres que a lavadora não usa.');
  var data = String(campos.DATA).trim(), hora = String(campos.HORA).trim();
  var md = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  if (!md || +md[2] < 1 || +md[2] > 12 || +md[1] < 1 || +md[1] > 31) throw alterado('a data do ciclo (' + data + ') não é uma data válida.');
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) throw alterado('o horário do ciclo (' + hora + ') não é um horário válido.');
  var resultado = String(campos.RESULTADO).trim().toUpperCase();
  if (!resultado) throw alterado('o resultado do ciclo está vazio.');
  var classe = /^APROVAD/.test(resultado) ? 'APROVADO' : /^REPROVAD/.test(resultado) ? 'REPROVADO' : /^CANCELAD|^ABORTAD|^INTERROMP/.test(resultado) ? 'CANCELADO' : 'OUTRO';
  if (classe === 'OUTRO') avisos.push('O resultado gravado pela lavadora ("' + resultado + '") não é um dos conhecidos (aprovado, reprovado ou cancelado). O relatório mostra o texto como veio.');

  var num = function (k, inteiro) {
    if (!Object.prototype.hasOwnProperty.call(campos, k)) return null;
    var v = campos[k];
    if (LavCicL_indisp_(v) || String(v).trim() === '') return null;
    var n = inteiro ? LavCicL_inteiro_(v) : LavCicL_numero_(v);
    if (n === null) throw alterado('o campo ' + k + ' (' + String(v).slice(0, 30) + ') deveria ser um número.');
    return n;
  };
  var tempFinal = num('TEMPFINAL', false);
  var inicioEp = num('INICIOEPOCH', true), fimEp = num('FIMEPOCH', true), codFalha = num('CODFALHA', true);
  if (inicioEp !== null && inicioEp <= 0) inicioEp = null;
  if (fimEp !== null && fimEp <= 0) fimEp = null;
  var manut = Object.prototype.hasOwnProperty.call(campos, 'MANUTVENCIDA') ? String(campos.MANUTVENCIDA).trim().toUpperCase() : '';
  if (manut && manut !== 'SIM' && manut !== 'NAO' && manut !== 'NÃO') throw alterado('o campo MANUTVENCIDA (' + manut.slice(0, 20) + ') deveria ser SIM ou NAO.');
  var falha = Object.prototype.hasOwnProperty.call(campos, 'FALHA') ? String(campos.FALHA).trim() : '';
  if (/^SEM FALHA$/i.test(falha)) falha = '';
  if (codFalha === 0 && falha) avisos.push('O arquivo traz o texto de falha "' + falha + '" com o código 0.');

  // fases
  var nFases = LavCicL_inteiro_(campos.FASES);
  if (nFases === null || nFases < 0 || nFases > LAVCIC_FASES_MAX) throw alterado('a quantidade de fases (' + campos.FASES + ') não é válida.');
  var fases = [], rel = 0;
  for (var i = 1; i <= nFases; i++) {
    var bruto = campos['FASE' + i];
    if (bruto === undefined) throw alterado('o arquivo diz que tem ' + nFases + ' fases, mas a fase ' + i + ' não está lá.');
    var p = String(bruto).split('|');
    if (p.length < 3 || p.length > 4) throw alterado('a fase ' + i + ' não tem os campos nome|duração|temperatura.');
    var dur = LavCicL_inteiro_(p[1]);
    if (dur === null || dur < 0) throw alterado('a duração da fase ' + i + ' (' + p[1] + ') não é válida.');
    var tmax = LavCicL_indisp_(p[2]) ? null : LavCicL_numero_(p[2]);
    if (tmax === null && !LavCicL_indisp_(p[2])) throw alterado('a temperatura da fase ' + i + ' (' + p[2] + ') não é válida.');
    var ini = null;
    if (p.length === 4 && !LavCicL_indisp_(p[3])) {
      ini = LavCicL_inteiro_(p[3]);
      if (ini === null) throw alterado('o início da fase ' + i + ' (' + p[3] + ') não é válido.');
    }
    var nome = String(p[0]).trim();
    if (!nome) throw alterado('a fase ' + i + ' está sem nome.');
    fases.push({ n: i, nome: nome, duracaoSeg: dur, tempMax: tmax, inicioEpoch: ini, inicioRelSeg: rel, grupo: LavCicL_grupoFase_(nome) });
    rel += dur;
  }
  if (campos['FASE' + (nFases + 1)] !== undefined) throw alterado('há mais fases gravadas do que a quantidade informada (' + nFases + ').');
  // eventos
  var nEv = LavCicL_inteiro_(campos.EVENTOS);
  if (nEv === null || nEv < 0 || nEv > LAVCIC_EVENTOS_MAX) throw alterado('a quantidade de eventos (' + campos.EVENTOS + ') não é válida.');
  var eventos = [];
  for (var j = 1; j <= nEv; j++) {
    var be = campos['EVT' + j];
    if (be === undefined) throw alterado('o arquivo diz que tem ' + nEv + ' eventos, mas o evento ' + j + ' não está lá.');
    var q = String(be).split('|');
    if (q.length < 2) throw alterado('o evento ' + j + ' não tem horário e texto.');
    var hEv = String(q[0]).trim();
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hEv)) throw alterado('o horário do evento ' + j + ' (' + hEv + ') não é válido.');
    var dEv = q.length >= 3 ? String(q[q.length - 1]).trim() : '';
    var textoEv = (q.length >= 3 ? q.slice(1, q.length - 1) : q.slice(1)).join('|').trim();
    if (dEv && !/^\d{2}\/\d{2}\/\d{4}$/.test(dEv)) { if (LavCicL_indisp_(dEv)) dEv = ''; else { textoEv = q.slice(1).join('|').trim(); dEv = ''; } }
    eventos.push({ n: j, hora: hEv, texto: textoEv, data: dEv });
  }
  if (campos['EVT' + (nEv + 1)] !== undefined) throw alterado('há mais eventos gravados do que a quantidade informada (' + nEv + ').');
  // eventos antigos vinham do mais novo para o mais velho: põe em ordem de acontecimento
  var semData = eventos.length > 1 && eventos.every(function (e) { return !e.data; });
  if (semData && /CONCLU|CANCEL|FINALIZ/i.test(eventos[0].texto) && /INICIAD/i.test(eventos[eventos.length - 1].texto)) eventos.reverse();

  var extras = {};
  ordem.forEach(function (k) { if (LAVCIC_CONHECIDOS.indexOf(k) < 0 && !/^FASE\d+$/.test(k) && !/^EVT\d+$/.test(k)) extras[k] = campos[k]; });
  var serie = Object.prototype.hasOwnProperty.call(campos, 'SERIE') ? String(campos.SERIE).trim() : '';
  var equipRef = Object.prototype.hasOwnProperty.call(campos, 'EQUIPAMENTO') ? String(campos.EQUIPAMENTO).trim() : '';

  // derivados
  var somaFases = rel;
  var duracao = (inicioEp !== null && fimEp !== null && fimEp > inicioEp) ? fimEp - inicioEp : somaFases;
  var fonteDur = (inicioEp !== null && fimEp !== null && fimEp > inicioEp) ? 'EPOCAS' : 'FASES';
  if (inicioEp !== null && fimEp !== null && fimEp < inicioEp) avisos.push('O horário de término gravado é anterior ao de início; o tempo total foi calculado pela soma das fases.');
  var fimSeg = fimEp !== null ? fimEp : LavCicL_segundosDe_(data, hora);
  var inicioSeg = inicioEp !== null ? inicioEp : (fimSeg !== null && somaFases ? fimSeg - somaFases : null);
  var ini0 = LavCicL_epoca_(inicioSeg), fim0 = LavCicL_epoca_(fimSeg);
  var desinf = null;
  fases.forEach(function (f) {
    if (f.grupo !== 'DESINFECCAO') return;
    if (!desinf) desinf = { nome: f.nome, duracaoSeg: 0, tempMax: null, fases: 0 };
    desinf.duracaoSeg += f.duracaoSeg; desinf.fases++;
    if (f.tempMax !== null && (desinf.tempMax === null || f.tempMax > desinf.tempMax)) desinf.tempMax = f.tempMax;
  });
  var temps = fases.map(function (f) { return f.tempMax; }).filter(function (t) { return t !== null; });
  var pausas = eventos.filter(function (e) { return /PAUSAD/i.test(e.texto); }).length;
  var ocorrencias = eventos.filter(function (e) { return !/^FIM DE FASE|^CICLO INICIADO|^CICLO CONCLU/i.test(e.texto); });
  var dataIso = md[3] + '-' + md[2] + '-' + md[1];
  var ciclo = {
    formato: (inicioEp !== null && Object.prototype.hasOwnProperty.call(campos, 'CODFALHA')) ? 'COMPLETO' : 'ANTIGO',
    codificacao: codificacao || 'UTF-8',
    lote: lote, receita: String(campos.RECEITA).trim(), operador: String(campos.OPERADOR).trim(),
    data: data, dataIso: dataIso, hora: hora, resultado: resultado, resultadoClasse: classe,
    tempFinal: tempFinal, manutVencida: manut ? manut === 'SIM' : null,
    inicioEpoch: inicioEp, fimEpoch: fimEp, codFalha: codFalha, falha: falha,
    fases: fases, eventos: eventos, serie: serie, equipamentoRef: equipRef, extras: extras,
    duracaoSeg: duracao, duracaoFonte: fonteDur, somaFasesSeg: somaFases,
    inicio: ini0 ? { data: ini0.data, hora: ini0.hora, estimado: inicioEp === null } : null,
    fim: fim0 ? { data: fim0.data, hora: fim0.hora, estimado: fimEp === null } : null,
    desinfeccao: desinf, tempMaxCiclo: temps.length ? Math.max.apply(null, temps) : null,
    pausas: pausas, ocorrencias: ocorrencias.map(function (e) { return e.hora + ' ' + e.texto; }),
    ultimaFase: (fases.filter(function (f) { return f.grupo !== 'CANCELAMENTO'; }).pop() || { nome: '' }).nome
  };
  if (ciclo.formato === 'ANTIGO') avisos.push('Arquivo de uma revisão anterior do firmware: sem os horários exatos de início e término e sem o código de falha. O início foi calculado pela soma das fases.');
  return { ok: true, ciclo: ciclo, avisos: avisos };
}

function LavCicL_normId_(v) { return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

/**
 * Campo futuro SERIE= / EQUIPAMENTO=: se vier e não bater com o equipamento escolhido, a importação é recusada.
 * eq: linha do cadastro (SERIE, TAG, PATRIMONIO, ID). Devolve { ok, message, aviso }.
 */
function LavCicL_conferirEquipamento_(ciclo, eq) {
  var ref = ciclo && (ciclo.serie || ciclo.equipamentoRef);
  if (!ref) return { ok: true };
  var campo = ciclo.serie ? 'SERIE' : 'EQUIPAMENTO';
  eq = eq || {};
  var cad = [eq.SERIE, eq.TAG, eq.PATRIMONIO, eq.ID].map(LavCicL_normId_).filter(Boolean);
  var alvo = LavCicL_normId_(ref);
  if (!cad.length || (!LavCicL_normId_(eq.SERIE) && campo === 'SERIE')) {
    return { ok: true, aviso: 'O arquivo informa o número de série ' + ref + ', mas o cadastro deste equipamento está sem número de série, então a conferência automática não pôde ser feita. Confira na plaqueta da máquina e complete o cadastro.' };
  }
  if (cad.indexOf(alvo) >= 0) return { ok: true, confere: true };
  return { ok: false, codigo: 'OUTRO_EQUIPAMENTO', message: 'Este arquivo é de outro equipamento. Por quê: o arquivo informa ' + (campo === 'SERIE' ? 'o número de série ' : 'o equipamento ') + ref +
    ' e o equipamento escolhido está cadastrado com série ' + (String(eq.SERIE || '').trim() || '(sem série)') + (String(eq.TAG || '').trim() ? ' e TAG ' + String(eq.TAG).trim() : '') +
    '. O que fazer: confira de qual máquina o arquivo foi copiado e importe pelo QR code ou pela ficha dessa máquina; se o cadastro estiver errado, peça à Metrolabs para corrigir.' };
}
