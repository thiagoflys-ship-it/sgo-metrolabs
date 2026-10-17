/****************************************************
 * FROTA — CONSULTAS DA GESTÃO (17/10/2026)
 *
 * 1. Despesas (decisão do dono: o painel volta como consulta): reúne
 *    abastecimentos, manutenções, multas e as despesas avulsas antigas,
 *    por veículo e período, com totais por categoria e por veículo.
 *    Só leitura; exige Gestor, Diretoria ou Administrador.
 *
 * 2. Levantamento de valores suspeitos (só Administrador, SOMENTE
 *    LEITURA): o SGO_UTILS.toNumber antigo apagava todo ponto, então
 *    "350.90" virava 35090 e "12345.5" km virava 123455. Esta função
 *    lista os registros que parecem ter passado por isso e sugere o valor
 *    provável. NÃO ALTERA NENHUM DADO, não cria aba nem coluna e não grava
 *    log: a correção será decidida pelo dono depois.
 ****************************************************/

function Frota_dataNoPeriodo_(data, inicio, fim) {
  var d = Frota_parseDataHora_(data, '12:00');
  if (!d) return false;
  return d.getTime() >= inicio.getTime() && d.getTime() <= fim.getTime();
}

function Frota_apiConsultarDespesas(sessionId, payload) {
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var dataInicio = String(payload.dataInicio || '').trim(), dataFim = String(payload.dataFim || '').trim();
  var inicio = Frota_parseDataHora_(dataInicio, '00:00'), fim = Frota_parseDataHora_(dataFim, '23:59');
  if (!inicio || !fim) throw new Error('Informe o período com as datas no formato dd/mm/aaaa (por exemplo 01/10/2026 a 31/10/2026).');
  if (fim.getTime() < inicio.getTime()) throw new Error('A data final é anterior à inicial. Corrija o período e consulte de novo.');
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var categoria = SGO_UTILS.safeUpper(payload.categoria);

  var veiculos = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });
  var tiposManut = {};
  FROTA_CFG.TIPOS_MANUTENCAO.forEach(function(t) { tiposManut[t.codigo] = t.label; });

  var linhas = [];
  function incluir(cat, r, data, valor, descricao, comprovante) {
    var vid = SGO_UTILS.safe(r.VEICULO_ID);
    if (veiculoId && vid !== veiculoId) return;
    if (categoria && categoria !== cat) return;
    if (!Frota_dataNoPeriodo_(data, inicio, fim)) return;
    var v = veiculos[vid] || {};
    linhas.push({ id: r.ID, categoria: cat, data: Frota_textoData_(data), veiculoId: vid, placa: v.PLACA || 'Veículo não localizado', modelo: v.MODELO || '',
      descricao: descricao, valor: Frota_num_(valor, 0), comprovante: comprovante || '' });
  }
  Frota_registrosValidos_existentes_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO).forEach(function(a) {
    var litros = Frota_num_(a.LITROS, 0);
    incluir('ABASTECIMENTO', a, a.DATA, a.VALOR, [litros ? SGO_DocA4_num_(litros, 2) + ' L' : '', a.TIPO_COMBUSTIVEL || '', a.POSTO ? 'posto ' + a.POSTO : '',
      a.KM ? 'km ' + SGO_DocA4_num_(Frota_num_(a.KM, 0), 0) : '', (condutores[SGO_UTILS.safe(a.CONDUTOR_ID)] || {}).NOME || ''].filter(Boolean).join(' · '), a.COMPROVANTE_LINK);
  });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).forEach(function(m) {
    incluir('MANUTENCAO', m, m.DATA, m.CUSTO, [tiposManut[m.TIPO] || m.TIPO || 'Manutenção', m.OFICINA || '', m.DESCRICAO || ''].filter(Boolean).join(' · '), '');
  });
  Frota_registrosValidos_existentes_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function(mu) {
    var cond = (condutores[SGO_UTILS.safe(mu.CONDUTOR_ID)] || {}).NOME;
    incluir('MULTA', mu, mu.DATA_INFRACAO, mu.VALOR, [mu.ORGAO_AUTUADOR ? 'órgão ' + mu.ORGAO_AUTUADOR : '', mu.NUMERO_AIT ? 'AIT ' + mu.NUMERO_AIT : '', mu.LOCAL || '',
      cond ? 'condutor ' + cond : 'condutor não identificado', FrotaRel_rotuloMulta_(mu.STATUS || 'ABERTA')].filter(Boolean).join(' · '), mu.LINK_DOCUMENTO);
  });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_DESPESA).forEach(function(d) {
    incluir('OUTRA', d, d.DATA, d.VALOR, [d.TIPO || 'Outra despesa', d.DESCRICAO || ''].filter(Boolean).join(' · '), '');
  });

  linhas.sort(function(a, b) {
    var da = Frota_parseDataHora_(a.data, '00:00'), db = Frota_parseDataHora_(b.data, '00:00');
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });
  var totais = { ABASTECIMENTO: 0, MANUTENCAO: 0, MULTA: 0, OUTRA: 0, geral: 0, quantidade: linhas.length };
  var porVeiculo = {};
  linhas.forEach(function(l) {
    totais[l.categoria] += l.valor; totais.geral += l.valor;
    var pv = porVeiculo[l.veiculoId] = porVeiculo[l.veiculoId] || { placa: l.placa, modelo: l.modelo, ABASTECIMENTO: 0, MANUTENCAO: 0, MULTA: 0, OUTRA: 0, total: 0 };
    pv[l.categoria] += l.valor; pv.total += l.valor;
  });
  return {
    ok: true, periodo: { inicio: dataInicio, fim: dataFim }, linhas: linhas, totais: totais,
    porVeiculo: Object.keys(porVeiculo).map(function(k) { return porVeiculo[k]; }).sort(function(a, b) { return b.total - a.total; })
  };
}

/** Registros não excluídos de uma aba que pode ainda não existir (consulta não cria aba). */
function Frota_registrosValidos_existentes_(aba) {
  return Frota_lerSeExistir_(aba).filter(function(r) { return !SGO_UTILS.safe(r.EXCLUIDO_EM); });
}

// ------------------------------------------------------------
// LEVANTAMENTO DE VALORES SUSPEITOS — SOMENTE LEITURA
// ------------------------------------------------------------
var FROTA_LEVANT_CAMPOS = [
  { aba: 'REG_FROTA_ABASTECIMENTO', tabela: 'Abastecimentos', campo: 'VALOR', rotulo: 'Valor', tipo: 'moeda', faixa: [20, 1500], data: 'DATA' },
  { aba: 'REG_FROTA_ABASTECIMENTO', tabela: 'Abastecimentos', campo: 'LITROS', rotulo: 'Litros', tipo: 'litros', faixa: [1, 120], data: 'DATA' },
  { aba: 'REG_FROTA_ABASTECIMENTO', tabela: 'Abastecimentos', campo: 'KM', rotulo: 'Km', tipo: 'km', data: 'DATA' },
  { aba: 'REG_FROTA_MANUTENCAO', tabela: 'Manutenções', campo: 'CUSTO', rotulo: 'Custo', tipo: 'moeda', faixa: [0, 15000], data: 'DATA' },
  { aba: 'REG_FROTA_MANUTENCAO', tabela: 'Manutenções', campo: 'KM', rotulo: 'Km', tipo: 'km', data: 'DATA' },
  { aba: 'REG_FROTA_MANUTENCAO', tabela: 'Manutenções', campo: 'PROXIMA_KM', rotulo: 'Próxima troca (km)', tipo: 'km', data: 'DATA' },
  { aba: 'REG_FROTA_MULTA', tabela: 'Multas', campo: 'VALOR', rotulo: 'Valor', tipo: 'moeda', faixa: [50, 3000], data: 'DATA_INFRACAO' },
  { aba: 'REG_FROTA_DESPESA', tabela: 'Outras despesas', campo: 'VALOR', rotulo: 'Valor', tipo: 'moeda', faixa: [1, 5000], data: 'DATA' },
  { aba: 'REG_FROTA_MOVIMENTACAO', tabela: 'Retiradas e devoluções', campo: 'KM_SAIDA', rotulo: 'Km de saída', tipo: 'km', data: 'DATA_SAIDA' },
  { aba: 'REG_FROTA_MOVIMENTACAO', tabela: 'Retiradas e devoluções', campo: 'KM_CHEGADA', rotulo: 'Km de chegada', tipo: 'km', data: 'DATA_CHEGADA' },
  { aba: 'CAD_VEICULOS', tabela: 'Cadastro de veículos', campo: 'KM_ATUAL', rotulo: 'Km atual', tipo: 'km', data: 'CRIADO_EM' }
];

function FrotaLev_valor_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return null;
  return Frota_num_(s, null);
}
function FrotaLev_mediana_(lista) {
  var l = lista.filter(function(x) { return isFinite(x) && x > 0; }).sort(function(a, b) { return a - b; });
  if (!l.length) return null;
  var m = Math.floor(l.length / 2);
  return l.length % 2 ? l[m] : (l[m - 1] + l[m]) / 2;
}
function FrotaLev_formatar_(tipo, n) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  if (tipo === 'moeda') return 'R$ ' + SGO_DocA4_num_(n, 2);
  if (tipo === 'litros') return SGO_DocA4_num_(n, 2) + ' L';
  return SGO_DocA4_num_(n, Math.round(n) === n ? 0 : 1) + ' km';
}
/** Melhor divisor (10, 100 ou 1000) que aproxima n da referência; null se nenhum chega a 3x. */
function FrotaLev_melhorDivisor_(n, ref) {
  var melhor = null;
  [10, 100, 1000].forEach(function(d) {
    var s = n / d, dist = Math.abs(Math.log(s / ref));
    if (!melhor || dist < melhor.dist) melhor = { divisor: d, sugestao: s, dist: dist };
  });
  return melhor && melhor.dist < Math.log(3) ? melhor : null;
}

function Frota_apiLevantamentoValoresSuspeitos(sessionId) {
  var sessao = exigirSessao(sessionId);
  if (SGO_UTILS.safeUpper(sessao.perfil) !== 'ADMIN') {
    throw new Error('Este levantamento é exclusivo do Administrador do sistema. Peça a ele, se precisar da lista.');
  }
  var veiculos = {};
  var cadVeiculos = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS);
  cadVeiculos.forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var cache = {};
  function ler(aba) {
    if (!cache[aba]) cache[aba] = Frota_lerSeExistir_(SGO_CFG.SHEETS[aba] || aba).filter(function(r) { return !SGO_UTILS.safe(r.EXCLUIDO_EM); });
    return cache[aba];
  }
  var achados = [], vistos = {};
  function registrar(cfg, r, n, sugestao, motivo, confianca) {
    var chave = cfg.aba + '|' + r.ID + '|' + cfg.campo;
    if (vistos[chave]) return;
    vistos[chave] = true;
    var vid = cfg.aba === 'CAD_VEICULOS' ? SGO_UTILS.safe(r.ID) : SGO_UTILS.safe(r.VEICULO_ID);
    var v = veiculos[vid] || {};
    achados.push({ tabela: cfg.tabela, aba: cfg.aba, id: SGO_UTILS.safe(r.ID), placa: v.PLACA || '—', data: Frota_textoData_(r[cfg.data] || ''),
      campo: cfg.rotulo, valorGravado: n, valorGravadoTexto: FrotaLev_formatar_(cfg.tipo, n),
      sugestao: sugestao, sugestaoTexto: FrotaLev_formatar_(cfg.tipo, sugestao), motivo: motivo, confianca: confianca,
      criadoEm: Frota_textoData_(r.CRIADO_EM || '') });
  }

  FROTA_LEVANT_CAMPOS.forEach(function(cfg) {
    var linhas = ler(cfg.aba);
    var porVeiculo = {}, todos = [];
    linhas.forEach(function(r) {
      var n = FrotaLev_valor_(r[cfg.campo]);
      if (n === null) return;
      var vid = cfg.aba === 'CAD_VEICULOS' ? '_frota' : SGO_UTILS.safe(r.VEICULO_ID);
      (porVeiculo[vid] = porVeiculo[vid] || []).push({ r: r, n: n });
      todos.push(n);
    });
    // km do veículo: junta km de todas as tabelas para ter referência mesmo com poucos registros
    Object.keys(porVeiculo).forEach(function(vid) {
      var grupo = porVeiculo[vid];
      grupo.forEach(function(item) {
        var n = item.n;
        if (!(Math.round(n) === n && n >= 100)) return; // o defeito só produz inteiros grandes
        var outros = grupo.filter(function(o) { return o !== item; }).map(function(o) { return o.n; });
        var ref = null, base = '';
        if (cfg.tipo === 'km') {
          var kmVeic = FrotaLev_kmReferencia_(vid === '_frota' ? SGO_UTILS.safe(item.r.ID) : vid, ler, item.r, cfg);
          ref = kmVeic; base = 'quilometragem do próprio veículo nos outros registros';
        } else if (outros.length >= 2) {
          ref = FrotaLev_mediana_(outros); base = 'mediana dos outros ' + outros.length + ' lançamentos deste veículo';
        } else {
          var frota = todos.filter(function(x) { return x !== n; });
          if (frota.length >= 3) { ref = FrotaLev_mediana_(frota); base = 'mediana dos lançamentos da frota'; }
        }
        if (ref && n / ref >= 8) {
          var m = FrotaLev_melhorDivisor_(n, ref);
          if (m) {
            registrar(cfg, item.r, n, m.sugestao, 'Valor ' + SGO_DocA4_num_(n / ref, 0) + ' vezes maior que a ' + base + ' (' + FrotaLev_formatar_(cfg.tipo, ref) + '). ' +
              'Dividido por ' + SGO_DocA4_num_(m.divisor, 0) + ' fica dentro do padrão: típico de "' + FrotaLev_comoDigitado_(n, m.divisor) + '" gravado sem o ponto decimal.',
              m.dist < Math.log(1.5) ? 'alta' : 'média');
            return;
          }
        }
        if (cfg.faixa && n > cfg.faixa[1]) {
          // dinheiro costuma ter 2 casas (350.90 -> 35090): tenta primeiro dividir por 100
          var cand = (cfg.tipo === 'moeda' ? [100, 10, 1000] : [10, 100, 1000]).map(function(d) { return { d: d, s: n / d }; }).filter(function(c) { return c.s >= cfg.faixa[0] && c.s <= cfg.faixa[1]; })[0];
          if (cand) registrar(cfg, item.r, n, cand.s, 'Acima do limite esperado para ' + cfg.tabela.toLowerCase() + ' (' + FrotaLev_formatar_(cfg.tipo, cfg.faixa[1]) + ') e sem histórico suficiente do veículo para comparar. ' +
            'Dividido por ' + SGO_DocA4_num_(cand.d, 0) + ' fica na faixa usual: possível "' + FrotaLev_comoDigitado_(n, cand.d) + '" gravado sem o ponto decimal.', 'média');
        }
      });
    });
  });

  // Preço por litro do abastecimento: a evidência mais forte (valor e litros do mesmo registro).
  ler('REG_FROTA_ABASTECIMENTO').forEach(function(a) {
    var valor = FrotaLev_valor_(a.VALOR), litros = FrotaLev_valor_(a.LITROS);
    if (!(valor > 0 && litros > 0)) return;
    var preco = valor / litros;
    if (preco > 15 && Math.round(valor) === valor) {
      var c = [10, 100, 1000].map(function(d) { return { d: d, p: valor / d / litros }; }).filter(function(x) { return x.p >= 3 && x.p <= 12; })[0];
      if (c) registrar(FROTA_LEVANT_CAMPOS[0], a, valor, valor / c.d, 'Preço por litro de R$ ' + SGO_DocA4_num_(preco, 2) + ', fora de qualquer preço de combustível. Com o valor dividido por ' + SGO_DocA4_num_(c.d, 0) +
        ' o preço fica em R$ ' + SGO_DocA4_num_(c.p, 2) + ' por litro.', 'alta');
    } else if (preco < 1 && Math.round(litros) === litros) {
      var c2 = [10, 100, 1000].map(function(d) { return { d: d, p: valor / (litros / d) }; }).filter(function(x) { return x.p >= 3 && x.p <= 12; })[0];
      if (c2) registrar(FROTA_LEVANT_CAMPOS[1], a, litros, litros / c2.d, 'Preço por litro de R$ ' + SGO_DocA4_num_(preco, 2) + ' (litros altos demais para o valor pago). Com os litros divididos por ' + SGO_DocA4_num_(c2.d, 0) +
        ' o preço fica em R$ ' + SGO_DocA4_num_(c2.p, 2) + ' por litro.', 'alta');
    }
  });

  // Retirada com km de chegada muito maior que o de saída (uma viagem com milhares de km).
  ler('REG_FROTA_MOVIMENTACAO').forEach(function(m) {
    var s = FrotaLev_valor_(m.KM_SAIDA), c = FrotaLev_valor_(m.KM_CHEGADA);
    if (!(s > 0 && c > 0) || c - s < 3000 || Math.round(c) !== c) return;
    var sug = c / 10;
    if (sug >= s && sug - s < 2000) registrar(FROTA_LEVANT_CAMPOS[9], m, c, sug, 'A devolução registra ' + SGO_DocA4_num_(c - s, 0) + ' km rodados numa única retirada (saída ' + SGO_DocA4_num_(s, 0) + ' km). Dividido por 10 a viagem fica com ' +
      SGO_DocA4_num_(sug - s, 1) + ' km.', 'alta');
  });

  var ordem = { alta: 0, 'média': 1 };
  achados.sort(function(a, b) { return (ordem[a.confianca] - ordem[b.confianca]) || a.tabela.localeCompare(b.tabela) || a.placa.localeCompare(b.placa); });
  return {
    ok: true, somenteLeitura: true, geradoEm: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
    total: achados.length, itens: achados,
    nota: 'Levantamento somente de leitura: nenhum registro foi alterado. A sugestão é o valor provável antes do defeito (ponto decimal apagado na gravação) e precisa ser conferida no comprovante antes de qualquer correção, que será decidida pela diretoria.'
  };
}

/** Exemplo de como o valor provavelmente foi digitado ("350.90"). */
function FrotaLev_comoDigitado_(n, divisor) {
  var casas = String(divisor).length - 1;
  var s = String(Math.round(n));
  if (s.length <= casas) return s;
  return s.slice(0, s.length - casas) + '.' + s.slice(s.length - casas);
}

/** Km de referência do veículo: mediana dos km dos outros registros (todas as tabelas). */
function FrotaLev_kmReferencia_(veiculoId, ler, registro, cfg) {
  var kms = [];
  function add(v) { var n = FrotaLev_valor_(v); if (n > 0) kms.push(n); }
  ler('REG_FROTA_ABASTECIMENTO').forEach(function(a) { if (SGO_UTILS.safe(a.VEICULO_ID) === veiculoId && !(cfg.aba === 'REG_FROTA_ABASTECIMENTO' && a === registro)) add(a.KM); });
  ler('REG_FROTA_MANUTENCAO').forEach(function(m) { if (SGO_UTILS.safe(m.VEICULO_ID) === veiculoId && !(cfg.aba === 'REG_FROTA_MANUTENCAO' && m === registro)) add(m.KM); });
  ler('REG_FROTA_MOVIMENTACAO').forEach(function(m) {
    if (SGO_UTILS.safe(m.VEICULO_ID) !== veiculoId) return;
    if (!(m === registro && cfg.campo === 'KM_SAIDA')) add(m.KM_SAIDA);
    if (!(m === registro && cfg.campo === 'KM_CHEGADA')) add(m.KM_CHEGADA);
  });
  ler('CAD_VEICULOS').forEach(function(v) { if (SGO_UTILS.safe(v.ID) === veiculoId && !(cfg.aba === 'CAD_VEICULOS' && v === registro)) add(v.KM_ATUAL); });
  return kms.length >= 2 ? FrotaLev_mediana_(kms) : null;
}
