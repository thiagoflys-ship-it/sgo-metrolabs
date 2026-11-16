/****************************************************
 * CONCILIAÇÃO CAJU — IMPORTAÇÃO DO EXTRATO CSV DO PORTAL DO CAJU (11/11/2026)
 *
 * A API do Caju não tem extrato nem transações do cartão (ESTUDO_API_CAJU.md). O Financeiro exporta o extrato de despesas em
 * CSV no Portal do RH do Caju e importa aqui. O FORMATO EXATO DO ARQUIVO É DESCONHECIDO: o importador lê qualquer CSV
 * (separador ; , ou tabulação; com ou sem aspas; UTF-8 ou Latin-1; linhas de título antes do cabeçalho), adivinha o que é cada
 * coluna pelo nome e mostra a PRÉVIA com o mapeamento para o Financeiro conferir e trocar. O mapeamento confirmado fica guardado
 * pela "assinatura" do cabeçalho: o próximo arquivo igual já vem mapeado.
 *
 * Campos: data* e valor* (obrigatórios), pessoa ou CPF* (um dos dois), estabelecimento, descrição, tipo, CNPJ, final do cartão,
 * centro de custo, categoria, identificador da transação e hora. O sinal do valor diz o que é gasto (gasto negativo, gasto
 * positivo ou pela coluna tipo); o tipo de cada linha sai do texto (carga/crédito, recolhimento do saldo, estorno de compra) e,
 * na falta, do sinal. O valor é guardado sem sinal, com o tipo.
 *
 * Nada entra duas vezes: o mesmo arquivo (marca SHA-256) é recusado; a mesma transação (identificador ou a combinação data, hora,
 * valor, tipo, estabelecimento e pessoa, contando as repetições dentro do arquivo) é pulada como repetida. O arquivo original fica
 * guardado na pasta "Conciliação Caju - Extratos". Desfazer uma importação tira as linhas dela (com motivo), se nenhuma estiver em
 * período fechado. Depois de importar, a conciliação roda sozinha. Caixa: CAJU_CONCILIAR. Só funções.
 ****************************************************/

var CJU_EXTRATO_MAX_BASE64 = 7 * 1024 * 1024;
var CJU_PASTA_EXTRATOS = 'Conciliação Caju - Extratos';
var CJU_CAMPOS_EXTRATO = [
  { cod: 'data', nome: 'Data da transação', obrig: true, sin: ['data', 'data da transacao', 'data transacao', 'data e hora', 'data hora', 'data da compra', 'data do lancamento', 'dt transacao', 'date', 'datetime', 'created at', 'data/hora'] },
  { cod: 'hora', nome: 'Hora', sin: ['hora', 'horario', 'time'] },
  { cod: 'valor', nome: 'Valor', obrig: true, sin: ['valor', 'valor r', 'valor da transacao', 'valor total', 'montante', 'amount', 'value', 'valor brl', 'quantia'] },
  { cod: 'pessoa', nome: 'Colaborador (nome)', sin: ['colaborador', 'nome', 'nome do colaborador', 'funcionario', 'portador', 'usuario', 'titular', 'employee', 'nome completo', 'beneficiario'] },
  { cod: 'cpf', nome: 'CPF do colaborador', sin: ['cpf', 'cpf do colaborador', 'documento', 'document'] },
  { cod: 'estabelecimento', nome: 'Estabelecimento', sin: ['estabelecimento', 'comerciante', 'loja', 'merchant', 'nome do estabelecimento', 'fornecedor', 'local'] },
  { cod: 'descricao', nome: 'Descrição', sin: ['descricao', 'historico', 'detalhe', 'description', 'observacao', 'lancamento'] },
  { cod: 'tipo', nome: 'Tipo da operação', sin: ['tipo', 'tipo de transacao', 'tipo da transacao', 'operacao', 'natureza', 'type', 'movimento', 'tipo de lancamento'] },
  { cod: 'cnpj', nome: 'CNPJ do estabelecimento', sin: ['cnpj', 'cnpj do estabelecimento', 'documento do estabelecimento'] },
  { cod: 'cartao', nome: 'Final do cartão', sin: ['cartao', 'final do cartao', 'numero do cartao', 'card', 'ultimos digitos'] },
  { cod: 'centro', nome: 'Centro de custo', sin: ['centro de custo', 'centro custo', 'cost center', 'departamento', 'area'] },
  { cod: 'categoria', nome: 'Categoria (MCC)', sin: ['categoria', 'mcc', 'categoria do estabelecimento', 'segmento', 'category', 'carteira'] },
  { cod: 'identificador', nome: 'Identificador da transação', sin: ['id', 'identificador', 'id da transacao', 'codigo', 'nsu', 'autorizacao', 'codigo de autorizacao', 'transaction id', 'transacao'] }
];
var CJU_SINAIS = { NEGATIVO_GASTO: 'Gasto vem com sinal de menos (crédito sem sinal)', POSITIVO_GASTO: 'Gasto vem sem sinal (crédito e estorno com sinal de menos)', TIPO: 'Pelo texto da coluna tipo ou descrição' };
var CJU_TIPOS_LINHA = { GASTO: 'Gasto no cartão', CREDITO: 'Carga (crédito no cartão)', RECOLHIMENTO: 'Recolhimento do saldo', ESTORNO: 'Estorno de compra' };

// ------------------------------------------------------------
// LEITURA DO ARQUIVO
// ------------------------------------------------------------
function Cju_textoDoArquivo_(b64) {
  var bytes = Utilities.base64Decode(String(b64).replace(/^data:[^,]+,/, ''));
  var u = [];
  for (var i = 0; i < bytes.length; i++) u.push(bytes[i] & 255);
  var utf = '';
  try { utf = Utilities.newBlob(bytes).getDataAsString('UTF-8'); } catch (e) { utf = ''; }
  var t = utf;
  if (!utf || utf.indexOf('�') >= 0) { t = ''; for (var j = 0; j < u.length; j++) t += String.fromCharCode(u[j]); } // Latin-1
  return t.replace(/^﻿/, '');
}
/** Separador: o que mais aparece fora de aspas nas primeiras linhas. */
function Cju_separador_(texto) {
  var linhas = texto.split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 15), melhor = ';', mx = -1;
  [';', ',', '\t', '|'].forEach(function (sep) {
    var n = 0;
    linhas.forEach(function (l) { var dentro = false; for (var i = 0; i < l.length; i++) { var c = l[i]; if (c === '"') dentro = !dentro; else if (c === sep && !dentro) n++; } });
    if (n > mx) { mx = n; melhor = sep; }
  });
  return melhor;
}
function Cju_csv_(texto, sep) {
  var linhas = [], cel = '', lin = [], dentro = false;
  for (var i = 0; i < texto.length; i++) {
    var c = texto[i];
    if (dentro) {
      if (c === '"') { if (texto[i + 1] === '"') { cel += '"'; i++; } else dentro = false; }
      else cel += c;
    } else if (c === '"') dentro = true;
    else if (c === sep) { lin.push(cel); cel = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; lin.push(cel); linhas.push(lin); lin = []; cel = ''; }
    else cel += c;
  }
  if (cel !== '' || lin.length) { lin.push(cel); linhas.push(lin); }
  // linhas vazias ficam (como linhas sem conteúdo) para o número da linha do arquivo continuar certo nas mensagens
  return linhas.map(function (l) { return l.map(function (x) { return String(x).trim(); }); });
}
function Cju_linhaVazia_(l) { return !l || !l.some(function (x) { return x !== ''; }); }
function Cju_cabNorm_(t) { return Cju_norm_(t).replace(/\s+/g, ' '); }
/** Qual campo é esta coluna (pela lista de sinônimos)? */
function Cju_campoDaColuna_(nome) {
  var n = Cju_cabNorm_(nome), achado = '', nota = 0;
  if (!n) return '';
  CJU_CAMPOS_EXTRATO.forEach(function (f) {
    f.sin.forEach(function (s) {
      var pts = n === s ? 100 : (n.indexOf(s) === 0 || (' ' + n + ' ').indexOf(' ' + s + ' ') >= 0) ? 40 + s.length : 0;
      if (pts > nota) { nota = pts; achado = f.cod; }
    });
  });
  return achado;
}
/** Linha do cabeçalho: a primeira (entre as 10 primeiras) com 2 ou mais colunas reconhecidas. */
function Cju_acharCabecalho_(linhas) {
  for (var i = 0; i < Math.min(10, linhas.length); i++) {
    if (Cju_linhaVazia_(linhas[i])) continue;
    var rec = linhas[i].filter(function (c) { return Cju_campoDaColuna_(c); }).length;
    if (rec >= 2 && linhas[i].length >= 2) return i;
  }
  for (var j = 0; j < linhas.length; j++) if (!Cju_linhaVazia_(linhas[j])) return j;
  return 0;
}
function Cju_assinatura_(cab) { return Via_marca_(cab.map(Cju_cabNorm_).join('|')).slice(0, 16); }
/** Mapeamento sugerido: { campo: índice da coluna } (cada coluna usada uma vez; o mais específico ganha). */
function Cju_mapaSugerido_(cab) {
  var m = {}, usadas = {};
  CJU_CAMPOS_EXTRATO.forEach(function (f) {
    var melhor = -1, nota = 0;
    cab.forEach(function (c, i) {
      if (usadas[i]) return;
      var n = Cju_cabNorm_(c);
      f.sin.forEach(function (s) { var pts = n === s ? 100 : (n.indexOf(s) === 0 || (' ' + n + ' ').indexOf(' ' + s + ' ') >= 0) ? 40 + s.length : 0; if (pts > nota) { nota = pts; melhor = i; } });
    });
    if (melhor >= 0 && Cju_campoDaColuna_(cab[melhor]) === f.cod) { m[f.cod] = melhor; usadas[melhor] = true; }
  });
  return m;
}

// ------------------------------------------------------------
// INTERPRETAÇÃO DE CADA LINHA
// ------------------------------------------------------------
function Cju_dataExtrato_(v) {
  var s = Via_s_(v), m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?/.exec(s))) return { dia: m[1] + '-' + m[2] + '-' + m[3], hora: m[4] ? m[4] + ':' + m[5] : '' };
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:[^\d]+(\d{1,2}):(\d{2})(?::\d{2})?)?/.exec(s))) {
    var ano = m[3].length === 2 ? '20' + m[3] : m[3], d = ('0' + m[1]).slice(-2), mes = ('0' + m[2]).slice(-2);
    if (Number(mes) < 1 || Number(mes) > 12 || Number(d) < 1 || Number(d) > 31) return null;
    return { dia: ano + '-' + mes + '-' + d, hora: m[4] ? ('0' + m[4]).slice(-2) + ':' + m[5] : '' };
  }
  return null;
}
/** Valor com sinal: "-R$ 1.234,56", "(12,30)", "12.30", "1,234.56". null = ilegível. */
function Cju_valorExtrato_(v) {
  var s = Via_s_(v).replace(/\s+/g, '');
  if (!s) return null;
  var neg = /^-|-$|^\(.*\)$|^R\$-|D$/i.test(s);
  s = s.replace(/[()R$\-+DC]/gi, '');
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{1,2}$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(/[.,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s);
  return isFinite(n) ? (neg ? -n : n) : null;
}
function Cju_tipoLinha_(valor, tipoTxt, descTxt, sinal) {
  var t = Cju_norm_(tipoTxt + ' ' + descTxt);
  if (/recolh|resgate|devolucao de saldo|devolucao do saldo|retirada de saldo|estorno de saldo|saldo devolvido|expirad/.test(t)) return 'RECOLHIMENTO';
  if (/estorn|cancelamento da compra|compra cancelada|chargeback|reembolso de compra/.test(t)) return 'ESTORNO';
  if (/\bcarga\b|recarga|credito|deposito|aporte|adiantamento|allowance/.test(t) && !/compra|debito/.test(t)) return 'CREDITO';
  if (/compra|debito|pagamento|saque|gasto|despesa/.test(t)) return 'GASTO';
  if (sinal === 'POSITIVO_GASTO') return valor >= 0 ? 'GASTO' : 'ESTORNO';
  return valor < 0 ? 'GASTO' : 'CREDITO';
}
/** Pessoa da linha: CPF do vínculo > apelido gravado > nome do vínculo/cadastro. { id, nome, regra } ou null. */
function Cju_pessoaDaLinha_(nome, cpf, ctx) {
  cpf = Cju_cpf_(cpf);
  if (cpf.length === 11) { var v = ctx.porCpf[cpf]; if (v) return { id: Via_s_(v.USUARIO_ID), nome: Via_s_(v.USUARIO_NOME), regra: 'CPF' }; }
  var n = Cju_norm_(nome);
  if (!n) return null;
  if (ctx.apelidos[n] && ctx.us[ctx.apelidos[n]]) return { id: ctx.apelidos[n], nome: ctx.us[ctx.apelidos[n]].nome, regra: 'APELIDO' };
  var achados = Object.keys(ctx.vinc).filter(function (k) { return Cju_nomeBate_(ctx.vinc[k].CAJU_NOME, nome) || Cju_nomeBate_(ctx.vinc[k].USUARIO_NOME, nome); });
  if (achados.length === 1) return { id: achados[0], nome: Via_s_(ctx.vinc[achados[0]].USUARIO_NOME), regra: 'NOME' };
  var us = Object.keys(ctx.us).filter(function (k) { return Cju_nomeBate_(ctx.us[k].nome, nome); });
  if (us.length === 1) return { id: us[0], nome: ctx.us[us[0]].nome, regra: 'NOME' };
  return null;
}
function Cju_ctxPessoas_() {
  var vinc = Cju_vinculos_(), porCpf = {};
  Object.keys(vinc).forEach(function (k) { var c = Cju_cpf_(vinc[k].CPF); if (c) porCpf[c] = vinc[k]; });
  return { vinc: vinc, porCpf: porCpf, us: Cju_usuariosTodos_(), apelidos: Cju_config_().apelidos || {} };
}
/** Interpreta o arquivo com o mapeamento: { cab, linhas: [{ n, ok, erros, ... }], periodo }. */
function Cju_interpretar_(texto, mapa, sinal) {
  var sep = Cju_separador_(texto), todas = Cju_csv_(texto, sep), iCab = Cju_acharCabecalho_(todas), cab = todas[iCab] || [];
  mapa = mapa || Cju_mapaSugerido_(cab);
  var col = function (l, k) { return mapa[k] === undefined || mapa[k] === null || mapa[k] === '' ? '' : Via_s_(l[Number(mapa[k])]); };
  var ctx = Cju_ctxPessoas_(), vistos = {}, out = [], de = '', ate = '';
  var corpo = todas.slice(iCab + 1), numeros = [];
  corpo = corpo.filter(function (l, i) { if (Cju_linhaVazia_(l)) return false; numeros.push(iCab + 2 + i); return true; });
  if (!sinal) {
    var vals = corpo.map(function (l) { return Cju_valorExtrato_(col(l, 'valor')); }).filter(function (x) { return x; });
    sinal = vals.filter(function (x) { return x < 0; }).length > vals.length / 2 ? 'NEGATIVO_GASTO' : 'POSITIVO_GASTO';
  }
  corpo.forEach(function (l, i) {
    var erros = [], dt = Cju_dataExtrato_(col(l, 'data')), v = Cju_valorExtrato_(col(l, 'valor'));
    if (!dt) erros.push('data ilegível ("' + col(l, 'data').slice(0, 20) + '")');
    if (v === null) erros.push('valor ilegível ("' + col(l, 'valor').slice(0, 20) + '")');
    else if (v === 0) erros.push('valor zero');
    var nome = col(l, 'pessoa'), cpf = Cju_cpf_(col(l, 'cpf'));
    if (!nome && !cpf) erros.push('sem colaborador (nome ou CPF)');
    var tipo = v === null ? '' : Cju_tipoLinha_(v, col(l, 'tipo'), col(l, 'descricao') + ' ' + col(l, 'estabelecimento'), sinal);
    var hora = col(l, 'hora') ? (Cju_dataExtrato_('2000-01-01 ' + col(l, 'hora')) || {}).hora || '' : dt ? dt.hora : '';
    var p = erros.length ? null : Cju_pessoaDaLinha_(nome, cpf, ctx);
    var ident = col(l, 'identificador');
    var base = ident ? 'ID:' + ident : [dt ? dt.dia : '', hora, v === null ? '' : Math.round(Math.abs(v) * 100), tipo, Cju_norm_(col(l, 'estabelecimento') || col(l, 'descricao')), cpf || Cju_norm_(nome)].join('|');
    vistos[base] = (vistos[base] || 0) + 1;
    var chave = ident ? base : Via_marca_(base).slice(0, 24) + '#' + vistos[base];
    if (dt && !erros.length) { if (!de || dt.dia < de) de = dt.dia; if (!ate || dt.dia > ate) ate = dt.dia; }
    var orig = {}; cab.forEach(function (c, k) { orig[c || ('coluna ' + (k + 1))] = Via_s_(l[k]).slice(0, 200); });
    out.push({ n: numeros[i], ok: !erros.length, erros: erros, dia: dt ? dt.dia : '', hora: hora, valor: v === null ? null : Math.abs(v), valorOriginal: v, tipo: tipo, tipoNome: CJU_TIPOS_LINHA[tipo] || '',
      estabelecimento: col(l, 'estabelecimento').slice(0, 160), descricao: col(l, 'descricao').slice(0, 300), cnpj: col(l, 'cnpj').replace(/\D/g, ''), pessoaTexto: nome.slice(0, 120), cpf: cpf,
      cartao: col(l, 'cartao').replace(/\D/g, '').slice(-4), centro: Via_up_(col(l, 'centro')).slice(0, 40), categoria: col(l, 'categoria').slice(0, 80), identificador: ident.slice(0, 120),
      usuarioId: p ? p.id : '', usuarioNome: p ? p.nome : '', pessoaRegra: p ? p.regra : '', chave: chave, original: orig });
  });
  return { separador: sep, cab: cab, linhaCabecalho: iCab + 1, mapa: mapa, sinal: sinal, linhas: out, de: de, ate: ate };
}
function Cju_validarArquivo_(arq) {
  if (!arq || !Via_s_(arq.base64) || !Via_s_(arq.nome)) throw new Error('Não foi possível ler o extrato: escolha o arquivo CSV exportado do portal do Caju.');
  if (!/\.(csv|txt)$/i.test(Via_s_(arq.nome))) throw new Error('Não foi possível ler o extrato: o arquivo precisa ser CSV (no portal do Caju, exporte o extrato de despesas em CSV). Planilha do Excel: salve como "CSV UTF-8".');
  if (String(arq.base64).length > CJU_EXTRATO_MAX_BASE64) throw new Error('Não foi possível ler o extrato: o arquivo passa de 5 MB. Exporte um período menor (por exemplo, um mês).');
}
function Cju_mapaDeDados_(d, cab) {
  if (!d.mapa || typeof d.mapa !== 'object') return null;
  var m = {};
  CJU_CAMPOS_EXTRATO.forEach(function (f) { var v = d.mapa[f.cod]; if (v !== undefined && v !== null && v !== '' && Number(v) >= 0 && Number(v) < cab.length) m[f.cod] = Number(v); });
  return m;
}
function Cju_faltasMapa_(m) {
  var f = [];
  if (m.data === undefined) f.push('a coluna da DATA');
  if (m.valor === undefined) f.push('a coluna do VALOR');
  if (m.pessoa === undefined && m.cpf === undefined) f.push('a coluna do COLABORADOR (nome ou CPF)');
  return f;
}

// ------------------------------------------------------------
// PRÉVIA E IMPORTAÇÃO
// ------------------------------------------------------------
/** d: { arquivo: { nome, base64 }, mapa (opcional), sinal (opcional) }. Não grava nada. */
function Cju_extratoPrevia_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'importar o extrato do Caju');
  d = d || {};
  Cju_validarArquivo_(d.arquivo);
  var texto = Cju_textoDoArquivo_(d.arquivo.base64);
  var sep = Cju_separador_(texto), todas = Cju_csv_(texto, sep), iCab = Cju_acharCabecalho_(todas), cab = todas[iCab] || [];
  if (cab.length < 2) throw new Error('Não foi possível ler o extrato: o arquivo não tem colunas reconhecíveis (separadas por ponto e vírgula, vírgula ou tabulação). Confira se é o CSV do extrato de despesas do Caju.');
  var assin = Cju_assinatura_(cab), guardado = (Cju_config_().mapeamentos || {})[assin] || null;
  var mapa = Cju_mapaDeDados_(d, cab) || (guardado ? Cju_mapaDeDados_({ mapa: guardado.mapa }, cab) : null) || Cju_mapaSugerido_(cab);
  var sinal = CJU_SINAIS[Via_up_(d.sinal)] ? Via_up_(d.sinal) : (guardado && CJU_SINAIS[guardado.sinal] ? guardado.sinal : '');
  var it = Cju_interpretar_(texto, mapa, sinal);
  var sha = Via_marca_(String(d.arquivo.base64).replace(/^data:[^,]+,/, ''));
  var ja = Cju_ler_(CJU_ABAS.IMPORTACOES).filter(function (x) { return Via_s_(x.SHA) === sha && !Via_s_(x.DESFEITA_EM); })[0];
  var chaves = {};
  Cju_ler_(CJU_ABAS.EXTRATO).forEach(function (x) { if (!Via_s_(x.REMOVIDA_EM)) chaves[Via_s_(x.CHAVE)] = true; });
  var validas = it.linhas.filter(function (l) { return l.ok; }), repetidas = validas.filter(function (l) { return chaves[l.chave]; }).length;
  var porTipo = {}; validas.forEach(function (l) { porTipo[l.tipo] = (porTipo[l.tipo] || 0) + 1; });
  return { cabecalho: it.cab.map(function (c, i) { return { indice: i, nome: c || ('coluna ' + (i + 1)) }; }), linhaCabecalho: it.linhaCabecalho, separador: it.separador === '\t' ? 'tabulação' : it.separador,
    mapa: it.mapa, sinal: it.sinal, sinais: CJU_SINAIS, campos: CJU_CAMPOS_EXTRATO.map(function (f) { return { cod: f.cod, nome: f.nome, obrig: !!f.obrig }; }), faltas: Cju_faltasMapa_(it.mapa),
    mapaGuardado: !!guardado, assinatura: assin, jaImportado: ja ? 'Este arquivo já foi importado em ' + Via_br_(ja.EM) + ' por ' + Via_s_(ja.POR_NOME) + '.' : '',
    total: it.linhas.length, validas: validas.length, invalidas: it.linhas.length - validas.length, repetidas: repetidas, semPessoa: validas.filter(function (l) { return !l.usuarioId; }).length,
    porTipo: Object.keys(porTipo).map(function (k) { return { tipo: k, nome: CJU_TIPOS_LINHA[k], qtd: porTipo[k] }; }), de: Via_brDia_(it.de), ate: Via_brDia_(it.ate),
    amostra: it.linhas.slice(0, 25).map(function (l) { return { n: l.n, ok: l.ok, erros: l.erros, data: Via_brDia_(l.dia) + (l.hora ? ' ' + l.hora : ''), valorTxt: l.valor === null ? '' : Via_moeda_(l.valor), tipo: l.tipo, tipoNome: l.tipoNome,
      estabelecimento: l.estabelecimento || l.descricao, pessoa: l.pessoaTexto || Cju_cpfMascara_(l.cpf), reconhecida: l.usuarioNome, repetida: !!chaves[l.chave] }; }),
    erros: it.linhas.filter(function (l) { return !l.ok; }).slice(0, 30).map(function (l) { return 'Linha ' + l.n + ': ' + l.erros.join(', '); }) };
}
/** d: { arquivo, mapa, sinal, confirmar: true }. Grava o arquivo, as linhas, o mapeamento e roda a conciliação. */
function Cju_extratoImportar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'importar o extrato do Caju');
  d = d || {};
  Cju_validarArquivo_(d.arquivo);
  if (d.confirmar !== true) throw new Error('Não foi possível importar: confira a prévia e toque em "Importar estas linhas".');
  var texto = Cju_textoDoArquivo_(d.arquivo.base64);
  var todas = Cju_csv_(texto, Cju_separador_(texto)), cab = todas[Cju_acharCabecalho_(todas)] || [];
  var mapa = Cju_mapaDeDados_(d, cab) || Cju_mapaSugerido_(cab), faltas = Cju_faltasMapa_(mapa);
  if (faltas.length) throw new Error('Não foi possível importar: no mapeamento falta ' + faltas.join(', ') + '. Escolha na prévia qual coluna do arquivo é cada uma.');
  var sinal = CJU_SINAIS[Via_up_(d.sinal)] ? Via_up_(d.sinal) : '';
  var it = Cju_interpretar_(texto, mapa, sinal);
  var b64 = String(d.arquivo.base64).replace(/^data:[^,]+,/, ''), sha = Via_marca_(b64), assin = Cju_assinatura_(cab);
  var res = Via_comTrava_(function () {
    Cju_garantirAbas_(); Cju_memoLimpar_();
    var ja = Via_ler_(CJU_ABAS.IMPORTACOES).filter(function (x) { return Via_s_(x.SHA) === sha && !Via_s_(x.DESFEITA_EM); })[0];
    if (ja) throw new Error('Não foi possível importar: este arquivo já foi importado em ' + Via_br_(ja.EM) + ' por ' + Via_s_(ja.POR_NOME) + '. Nada mudou. Para importar de novo, desfaça a importação anterior (com motivo).');
    var chaves = {};
    Via_ler_(CJU_ABAS.EXTRATO).forEach(function (x) { if (!Via_s_(x.REMOVIDA_EM)) chaves[Via_s_(x.CHAVE)] = true; });
    var raiz = SGO_DocSalvar_pastaPersistente_('CJU_PASTA_EXTRATOS_ID', CJU_PASTA_EXTRATOS, '');
    var f = raiz.createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'text/csv', SGO_DocSalvar_sanitizarNome_(Via_hoje_() + ' - ' + Via_s_(d.arquivo.nome))));
    var impId = Via_id_(), agora = Via_agora_(), novas = [], repetidas = 0, ignoradas = [], gastos = 0;
    it.linhas.forEach(function (l) {
      if (!l.ok) { ignoradas.push('linha ' + l.n + ' (' + l.erros.join(', ') + ')'); return; }
      if (chaves[l.chave]) { repetidas++; return; }
      chaves[l.chave] = true;
      if (l.tipo === 'GASTO') gastos += Math.round(l.valor * 100);
      novas.push({ ID: Via_id_(), IMPORTACAO_ID: impId, CHAVE: l.chave, LINHA_NUMERO: l.n, IDENTIFICADOR: l.identificador, DATA: l.dia, HORA: l.hora, VALOR: Via_r2_(l.valor), TIPO: l.tipo,
        DESCRICAO: l.descricao, ESTABELECIMENTO: l.estabelecimento, CNPJ: l.cnpj, PESSOA_TEXTO: l.pessoaTexto, CPF: l.cpf, CARTAO_FINAL: l.cartao, USUARIO_ID: l.usuarioId, USUARIO_NOME: l.usuarioNome,
        PESSOA_REGRA: l.pessoaRegra, CENTRO_CUSTO_CAJU: l.centro, CATEGORIA_TXT: l.categoria, SOLICITACAO_ID: '', NUMERO: '', GASTO_ID: '', CARGA_ID: '', ACERTO_ID: '', SITUACAO: 'PENDENTE', REGRA: '',
        CONCILIADO_EM: '', CONCILIADO_POR_NOME: '', MOTIVO: '', FECHAMENTO_ID: '', REMOVIDA_EM: '', LINHA_ORIGINAL_JSON: JSON.stringify(l.original).slice(0, 4000) });
    });
    if (typeof SGO_DATA.insertMany === 'function' && novas.length) SGO_DATA.insertMany(CJU_ABAS.EXTRATO, novas); else novas.forEach(function (x) { SGO_DATA.insert(CJU_ABAS.EXTRATO, x); });
    Cju_inserir_(CJU_ABAS.IMPORTACOES, { ID: impId, ARQUIVO_NOME: Via_s_(d.arquivo.nome).slice(0, 200), ARQUIVO_ID: f.getId(), ARQUIVO_URL: f.getUrl(), SHA: sha, ASSINATURA: assin, MAPEAMENTO_JSON: JSON.stringify({ mapa: mapa, sinal: it.sinal }),
      LINHAS: it.linhas.length, IMPORTADAS: novas.length, REPETIDAS: repetidas, IGNORADAS: ignoradas.length, PERIODO_DE: it.de, PERIODO_ATE: it.ate, TOTAL_GASTOS: gastos / 100, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora,
      DESFEITA_EM: '', DESFEITA_POR_NOME: '', DESFEITA_MOTIVO: '' });
    var maps = Object.assign({}, Cju_config_().mapeamentos || {}); maps[assin] = { mapa: mapa, sinal: it.sinal, em: agora };
    Cju_gravarConfig_(eu, { mapeamentos: maps }, 'Mapeamento do extrato guardado (arquivo ' + Via_s_(d.arquivo.nome).slice(0, 80) + ')');
    Cju_historico_('IMPORTACAO', impId, 'EXTRATO_IMPORTADO', eu, 'Extrato ' + Via_s_(d.arquivo.nome) + ': ' + novas.length + ' linhas novas, ' + repetidas + ' repetidas, ' + ignoradas.length + ' ignoradas (' + Via_brDia_(it.de) + ' a ' + Via_brDia_(it.ate) + ').');
    return { id: impId, novas: novas.length, repetidas: repetidas, ignoradas: ignoradas, de: it.de, ate: it.ate };
  });
  var conc = Cju_conciliar_(eu);
  return { importacao: res, resumo: conc, importacoes: Cju_importacoesTela_(),
    message: 'Extrato importado: ' + res.novas + (res.novas === 1 ? ' linha nova' : ' linhas novas') + (res.repetidas ? ', ' + res.repetidas + ' já existiam (puladas)' : '') + (res.ignoradas.length ? ', ' + res.ignoradas.length + ' ignoradas por erro (' + res.ignoradas.slice(0, 3).join('; ') + (res.ignoradas.length > 3 ? '…' : '') + ')' : '') + '. ' + Cju_resumoConciliacaoTxt_(conc) };
}
function Cju_importacoesTela_() {
  return Cju_ler_(CJU_ABAS.IMPORTACOES).slice().sort(function (a, b) { return Via_s_(b.EM).localeCompare(Via_s_(a.EM)); }).map(function (x) {
    return { id: Via_s_(x.ID), arquivo: Via_s_(x.ARQUIVO_NOME), url: Via_s_(x.ARQUIVO_URL), em: Via_br_(x.EM), por: Via_s_(x.POR_NOME), linhas: Number(x.LINHAS) || 0, importadas: Number(x.IMPORTADAS) || 0,
      repetidas: Number(x.REPETIDAS) || 0, ignoradas: Number(x.IGNORADAS) || 0, de: Via_brDia_(x.PERIODO_DE), ate: Via_brDia_(x.PERIODO_ATE), gastosTxt: Via_moeda_(x.TOTAL_GASTOS),
      desfeita: !!Via_s_(x.DESFEITA_EM), desfeitaEm: Via_br_(x.DESFEITA_EM), desfeitaPor: Via_s_(x.DESFEITA_POR_NOME), desfeitaMotivo: Via_s_(x.DESFEITA_MOTIVO) };
  });
}
function Cju_importacaoDesfazer_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'desfazer a importação do extrato');
  d = d || {};
  var motivo = Via_texto_(d.motivo, 400);
  if (motivo.length < 15) throw new Error('Não foi possível desfazer a importação: escreva o motivo (15 letras ou mais), por exemplo "arquivo do mês errado".');
  var n = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var imp = Cju_porId_(CJU_ABAS.IMPORTACOES, d.id);
    if (!imp || Via_s_(imp.DESFEITA_EM)) throw new Error('Não foi possível desfazer: importação não encontrada ou já desfeita. Atualize a tela.');
    var linhas = Via_ler_(CJU_ABAS.EXTRATO).filter(function (x) { return Via_s_(x.IMPORTACAO_ID) === Via_s_(imp.ID) && !Via_s_(x.REMOVIDA_EM); });
    var fechada = linhas.filter(function (x) { return Via_s_(x.FECHAMENTO_ID); })[0];
    if (fechada) throw new Error('Não foi possível desfazer: há linhas desta importação em período fechado (fechamento ' + Via_s_((Cju_porId_(CJU_ABAS.FECHAMENTOS, fechada.FECHAMENTO_ID) || {}).NUMERO) + '). Reabra o fechamento antes, com o motivo.');
    var agora = Via_agora_();
    linhas.forEach(function (x) { Cju_desfazerLigacoes_(x); SGO_DATA.update(CJU_ABAS.EXTRATO, x.ID, { REMOVIDA_EM: agora, SITUACAO: 'REMOVIDA' }); });
    Cju_atualizar_(CJU_ABAS.IMPORTACOES, imp.ID, { DESFEITA_EM: agora, DESFEITA_POR_NOME: eu.nome, DESFEITA_MOTIVO: motivo });
    Cju_historico_('IMPORTACAO', imp.ID, 'IMPORTACAO_DESFEITA', eu, 'Importação de ' + Via_s_(imp.ARQUIVO_NOME) + ' desfeita (' + linhas.length + ' linhas). Motivo: ' + motivo);
    return linhas.length;
  });
  var conc = Cju_conciliar_(eu);
  return { importacoes: Cju_importacoesTela_(), resumo: conc, message: 'Importação desfeita: ' + n + ' linhas saíram da conciliação (o arquivo original continua guardado). ' + Cju_resumoConciliacaoTxt_(conc) };
}
