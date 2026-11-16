/**
 * Nota de saúde financeira (Onda 2 do Financeiro, E5, 16/11/2026). Especificação: ESPEC_ONDA2_FINANCEIRO.md, seção 3.3.
 *
 * Nota de 0 a 100, soma de seis critérios. Cada critério dá pontos por interpolação linear entre o "ruim" (0 ponto) e o "bom"
 * (pontuação cheia), com limite nas pontas. Critério que não pôde ser calculado fica fora e os pesos dos demais são reescalados
 * ("nota calculada com 5 de 6 critérios: <qual faltou e por quê>"). Faixas: 80 a 100 Saudável, 60 a 79 Atenção, 40 a 59
 * Alerta, abaixo de 40 Crítica. A frase de cada critério é do SISTEMA (nunca da IA).
 *
 * Os limites e os pesos são PROPOSTAS INICIAIS da especificação (decisão do dono com o contador) e ficam configuráveis em
 * Administração > Chaves e senhas > Regras do Financeiro: FIN_SAUDE_PESOS e FIN_SAUDE_LIMITES. Sem valor = o padrão abaixo.
 * FinSaude_calcular_ é pura (não lê planilha nem propriedade): a mesma função servirá à aba Indicadores e ao relatório semanal.
 */
var FIN_SAUDE_PADRAO = {
  C1: { nome: 'Fôlego do caixa', indicador: 'I12', ruim: 10, bom: 60, peso: 25, unidade: 'dias' },
  C2: { nome: 'Compromissos de 30 dias', indicador: 'I13', ruim: 0.8, bom: 1.3, peso: 20, unidade: 'vezes' },
  C3: { nome: 'Inadimplência acima de 30 dias', indicador: 'I05', ruim: 15, bom: 3, peso: 20, unidade: '%' },
  C4: { nome: 'Margem de caixa (3 meses fechados)', indicador: 'I08', ruim: 0, bom: 15, peso: 20, unidade: '%' },
  C5: { nome: 'Concentração de recebíveis', indicador: 'I14', ruim: 70, bom: 35, peso: 5, unidade: '%' },
  C6: { nome: 'Disciplina operacional', indicador: '', ruim: null, bom: null, peso: 10, unidade: '' }
};
var FIN_SAUDE_ORDEM = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
var FIN_SAUDE_FAIXAS = [[80, 'Saudável', 'ok'], [60, 'Atenção', 'atencao'], [40, 'Alerta', 'alerta'], [0, 'Crítica', 'critica']];

function FinSaude_num_(t) {
  var s = String(t == null ? '' : t).trim().replace(/\s+/g, '');
  if (!s) return NaN;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
function FinSaude_fmt_(n, casas) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  casas = casas === undefined ? 1 : casas;
  var f = Math.abs(Number(n)).toFixed(casas).split('.'), i = f[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var t = i + (f[1] && /[1-9]/.test(f[1]) ? ',' + f[1] : '');
  return (Number(n) < 0 && /[1-9]/.test(t) ? '-' : '') + t;
}
/** "25;20;20;20;5;10" -> o mesmo texto normalizado. Erro com o que fazer. */
function FinSaude_validarPesos_(v) {
  var p = String(v || '').split(/[;|]/).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
  if (p.length !== 6 || p.some(function (x) { return !/^\d{1,3}$/.test(x); })) throw new Error('Não foi possível gravar: escreva seis números inteiros separados por ponto e vírgula, na ordem C1 a C6 (ex.: 25;20;20;20;5;10).');
  var n = p.map(Number), soma = n.reduce(function (a, b) { return a + b; }, 0);
  if (soma !== 100) throw new Error('Não foi possível gravar: os seis pesos precisam somar 100 (a soma deu ' + soma + '). Ajuste e grave de novo.');
  return n.join(';');
}
/** "C1: 10 a 60; C2: 0,8 a 1,3" -> mesmo texto normalizado (só os critérios C1 a C5 informados). */
function FinSaude_validarLimites_(v) {
  var lim = FinSaude_lerLimites_(v, true), ks = Object.keys(lim);
  if (!ks.length) throw new Error('Não foi possível gravar: escreva cada critério como "Cn: ruim a bom", separados por ponto e vírgula (ex.: C1: 10 a 60; C3: 15 a 3). Vale de C1 a C5.');
  return ks.sort().map(function (k) { return k + ': ' + String(lim[k].ruim).replace('.', ',') + ' a ' + String(lim[k].bom).replace('.', ','); }).join('; ');
}
function FinSaude_lerLimites_(v, estrito) {
  var out = {}, partes = String(v || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean);
  partes.forEach(function (t) {
    var m = /^C([1-5])\s*[:=]\s*(-?[\d.,]+)\s*a\s*(-?[\d.,]+)$/i.exec(t);
    var ruim = m ? FinSaude_num_(m[2]) : NaN, bom = m ? FinSaude_num_(m[3]) : NaN;
    if (!m || !isFinite(ruim) || !isFinite(bom) || ruim === bom) {
      if (estrito) throw new Error('Não foi possível gravar: "' + t.slice(0, 40) + '" não está no formato "Cn: ruim a bom" com dois números diferentes (ex.: C1: 10 a 60).');
      return;
    }
    out['C' + m[1]] = { ruim: ruim, bom: bom };
  });
  return out;
}
/** Configuração em vigor: padrão + o que estiver em Chaves e senhas (valor estranho = padrão). */
function FinSaude_config_() {
  var cfg = {}, prop = function (k) { try { return String(PropertiesService.getScriptProperties().getProperty(k) || '').trim(); } catch (e) { return ''; } };
  FIN_SAUDE_ORDEM.forEach(function (k) { cfg[k] = Object.assign({}, FIN_SAUDE_PADRAO[k]); });
  var origemPesos = 'padrão', origemLimites = 'padrão';
  try { var pe = prop('FIN_SAUDE_PESOS'); if (pe) { FinSaude_validarPesos_(pe).split(';').forEach(function (n, i) { cfg[FIN_SAUDE_ORDEM[i]].peso = Number(n); }); origemPesos = 'Chaves e senhas'; } } catch (e) {}
  try { var li = prop('FIN_SAUDE_LIMITES'); if (li) { var l = FinSaude_lerLimites_(li, true); Object.keys(l).forEach(function (k) { cfg[k].ruim = l[k].ruim; cfg[k].bom = l[k].bom; }); if (Object.keys(l).length) origemLimites = 'Chaves e senhas'; } } catch (e) {}
  cfg.origem = { pesos: origemPesos, limites: origemLimites };
  return cfg;
}
/** Pontos por interpolação linear entre ruim (0) e bom (peso); funciona nos dois sentidos (ruim > bom, como na inadimplência). */
function FinSaude_pontos_(valor, ruim, bom, peso) {
  if (valor === Infinity) return peso;
  var f = (valor - ruim) / (bom - ruim);
  if (!isFinite(f)) return 0;
  return Math.max(0, Math.min(1, f)) * peso;
}
function FinSaude_faixa_(nota) {
  for (var i = 0; i < FIN_SAUDE_FAIXAS.length; i++) if (nota >= FIN_SAUDE_FAIXAS[i][0]) return { nome: FIN_SAUDE_FAIXAS[i][1], classe: FIN_SAUDE_FAIXAS[i][2] };
  return { nome: 'Crítica', classe: 'critica' };
}
/**
 * entrada: { I12: {valor|null, infinito, motivo}, I13: {...}, I05: {...}, I08: { margem3m, motivo3m }, I14: {...},
 *            disciplina: [{ nome, ok: true|false|null, motivo }] } — os indicadores da fotografia (SGO_Financeiro_Indicadores.js).
 * cfg: FinSaude_config_() (ou um objeto igual, nos testes). Devolve { nota, faixa, classe, criterios:[...], calculados, total,
 * faltou: [textos], texto }.
 */
function FinSaude_calcular_(ind, cfg) {
  ind = ind || {}; cfg = cfg || FinSaude_config_();
  var f = function (n, c) { return FinSaude_fmt_(n, c); };
  var crit = [];
  var linha = function (k, valor, motivo, frase) {
    var c = cfg[k], ok = valor !== null && valor !== undefined && (isFinite(valor) || valor === Infinity);
    var pontos = ok ? FinSaude_pontos_(valor, c.ruim, c.bom, c.peso) : null;
    var u = c.unidade === '%' ? ' %' : ' ' + c.unidade;
    var faixaTxt = 'Entre ' + f(c.ruim, 2) + u + ' (0 ponto) e ' + f(c.bom, 2) + u + ' (pontuação cheia) a nota cresce proporcionalmente';
    crit.push({ codigo: k, nome: c.nome, indicador: c.indicador, peso: c.peso, ruim: c.ruim, bom: c.bom, valor: ok ? (valor === Infinity ? null : valor) : null,
      pontos: pontos === null ? null : Math.round(pontos * 10) / 10, calculado: ok, motivo: ok ? '' : (motivo || 'sem dado'),
      explicacao: ok ? frase + ' ' + faixaTxt + ': ' + f(Math.round(pontos * 10) / 10, 1) + ' de ' + c.peso + ' pontos.' : c.nome + ': não calculado (' + (motivo || 'sem dado') + '). Fica fora da nota e os pesos dos demais critérios são reescalados.' });
  };
  var v = function (k) { var x = ind[k] || {}; return x.infinito ? Infinity : (x.valor === null || x.valor === undefined ? null : Number(x.valor)); };
  var mot = function (k) { return (ind[k] || {}).motivo || ''; };
  // C1 fôlego do caixa (I12)
  var c1 = v('I12');
  linha('C1', c1, mot('I12'), 'Cobertura de caixa: o saldo de hoje paga ' + f(c1, 0) + ' dias de despesas, pela média dos últimos 90 dias.');
  // C2 compromissos de 30 dias (I13)
  var c2 = v('I13');
  linha('C2', c2, mot('I13'), c2 === Infinity ? 'Compromissos de 30 dias: não há contas a pagar nos próximos 30 dias; o critério vale a pontuação cheia.'
    : 'Compromissos de 30 dias: o saldo mais o que deve entrar em 30 dias cobre ' + f(c2, 2) + ' vez(es) o que vence a pagar no mesmo prazo.');
  // C3 inadimplência acima de 30 dias (I05)
  var c3 = v('I05');
  linha('C3', c3, mot('I05'), 'Inadimplência acima de 30 dias: ' + f(c3, 1) + ' % do que os clientes devem está vencido há mais de 30 dias.');
  // C4 margem de caixa, 3 meses fechados (I08, média ponderada)
  var i08 = ind.I08 || {}, c4 = i08.margem3m === null || i08.margem3m === undefined ? null : Number(i08.margem3m);
  linha('C4', c4, i08.motivo3m || mot('I08'), 'Margem de caixa dos 3 últimos meses fechados: de cada R$ 100 recebidos, sobraram R$ ' + f(c4, 2) + ' depois dos pagamentos.');
  // C5 concentração (I14)
  var c5 = v('I14');
  linha('C5', c5, mot('I14'), 'Concentração de recebíveis: os 5 maiores clientes somam ' + f(c5, 1) + ' % do que há a receber.');
  // C6 disciplina: 4 conferências de 2,5 pontos; as que não puderam ser feitas ficam fora (proporcional)
  var disc = Array.isArray(ind.disciplina) ? ind.disciplina : [], feitas = disc.filter(function (d) { return d.ok === true || d.ok === false; });
  var c6 = cfg.C6;
  if (!feitas.length) {
    crit.push({ codigo: 'C6', nome: c6.nome, indicador: 'I17, I18, I19, I06', peso: c6.peso, ruim: null, bom: null, valor: null, pontos: null, calculado: false, motivo: 'nenhuma das quatro conferências pôde ser feita',
      explicacao: c6.nome + ': não calculado (nenhuma das quatro conferências pôde ser feita). Fica fora da nota e os pesos dos demais critérios são reescalados.' });
  } else {
    var passou = feitas.filter(function (d) { return d.ok === true; }).length, pts = Math.round(c6.peso * passou / feitas.length * 10) / 10;
    var falhou = feitas.filter(function (d) { return d.ok === false; }).map(function (d) { return d.nome; });
    var fora = disc.filter(function (d) { return d.ok !== true && d.ok !== false; }).map(function (d) { return d.nome + ' (' + (d.motivo || 'sem dado') + ')'; });
    crit.push({ codigo: 'C6', nome: c6.nome, indicador: 'I17, I18, I19, I06', peso: c6.peso, ruim: null, bom: null, valor: passou, pontos: pts, calculado: true, motivo: '',
      explicacao: 'Disciplina operacional: ' + passou + ' de ' + feitas.length + ' conferência(s) em dia' + (falhou.length ? ' (falhou: ' + falhou.join('; ') + ')' : '') + (fora.length ? '; fora da conta: ' + fora.join('; ') : '') +
        '. Cada conferência em dia vale a mesma parte dos ' + c6.peso + ' pontos: ' + f(pts, 1) + ' de ' + c6.peso + ' pontos.' });
  }
  var calc = crit.filter(function (c) { return c.calculado; });
  var pesoCalc = calc.reduce(function (a, c) { return a + c.peso; }, 0), soma = calc.reduce(function (a, c) { return a + c.pontos; }, 0);
  var faltou = crit.filter(function (c) { return !c.calculado; }).map(function (c) { return c.codigo + ' ' + c.nome + ': ' + c.motivo; });
  if (!calc.length || pesoCalc <= 0) {
    return { nota: null, faixa: 'Não calculada', classe: 'sem', criterios: crit, calculados: 0, total: crit.length, faltou: faltou,
      texto: 'A nota não pôde ser calculada: nenhum critério tem dado. Veja o motivo em cada linha; a fotografia do dia completa costuma resolver.' };
  }
  var nota = Math.round(soma / pesoCalc * 100);
  var fx = FinSaude_faixa_(nota);
  return { nota: nota, faixa: fx.nome, classe: fx.classe, criterios: crit, calculados: calc.length, total: crit.length, faltou: faltou,
    texto: 'Nota ' + nota + ' de 100 (' + fx.nome + '), calculada com ' + calc.length + ' de ' + crit.length + ' critérios' + (faltou.length ? ': ' + faltou.join('; ') + '.' : '.') + (calc.length < crit.length ? ' Os pesos dos critérios calculados foram reescalados para somar 100.' : '') };
}
