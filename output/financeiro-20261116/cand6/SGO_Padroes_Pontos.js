/****************************************************
 * PADRÕES DE REFERÊNCIA — PONTOS CALIBRADOS (13/11/2026, pedido do dono)
 *
 * "Quando mandamos calibrar um padrão, às vezes tem mais de uma faixa (0, 5, 10, 50 e 100 graus) e cada um tem seu
 * erro, U95, Veff. No SGO hoje eu só consigo escolher um." Cada padrão passa a ter uma tabela de 1 a N pontos do
 * certificado vigente (coluna CAD_PADROES.PONTOS_JSON). Sem tabela, o cadastro antigo (INCERTEZA_U95, FATOR_K, VEFF)
 * vale como 1 ponto, exatamente como antes.
 *
 * Este arquivo só tem lógica pura (sem planilha, sem Drive): o servidor usa PadPontos e a tela recebe o MESMO código
 * pelo CertCal_obterConteudoModulo (PadPontos_fabrica_.toString()), para que a conferência na tela e a validação no
 * servidor sejam idênticas. Por isso a fábrica não pode depender de nada de fora dela.
 *
 * Regra metrológica (detalhes e justificativa em output/padroes-faixas-20261113/RELATORIO_FAIXAS.md):
 *  - valor igual a um ponto calibrado: U95, k e νeff desse ponto (EXATO);
 *  - valor dentro de uma faixa declarada no certificado (De/Até): os dados dessa faixa (FAIXA);
 *  - valor entre dois pontos calibrados: os dados do vizinho com a MAIOR incerteza-padrão u = U95/k (conservador);
 *    a correção (erro) é interpolada linearmente entre os dois vizinhos (ENTRE);
 *  - tabela de 1 ponto sem De/Até: vale para o bloco inteiro, como o cadastro antigo (UNICO);
 *  - fora da faixa calibrada, ou em outra unidade: não escolhe nada e a emissão é bloqueada com mensagem clara.
 ****************************************************/
function PadPontos_fabrica_() {
  var CAMPOS = ['grandeza', 'unidade', 'nominal', 'de', 'ate', 'indicacao', 'referencia', 'erro', 'u95', 'k', 'veff', 'resolucao'];
  var NUMERICOS = ['nominal', 'de', 'ate', 'indicacao', 'referencia', 'erro', 'u95', 'k', 'veff', 'resolucao'];
  var ROTULOS = { grandeza: 'Grandeza ou canal', unidade: 'Unidade', nominal: 'Ponto', de: 'De', ate: 'Até', indicacao: 'Indicação do padrão',
    referencia: 'Valor de referência', erro: 'Erro', u95: 'U95', k: 'k', veff: 'νeff', resolucao: 'Resolução' };
  var MAX_LINHAS = 200;

  function txt(v) { return v == null ? '' : String(v).trim(); }
  function semAcento(s) { s = txt(s); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* sem normalize */ } return s.toLowerCase(); }
  function arred(n) { return Math.round(n * 1e12) / 1e12; }

  /** Número em pt-BR ou en: "0,05" "0.05" "1.234,5" "-0,02" "−0,02" "±0,05" "+1,2e-3". Vazio: null. Inválido: NaN. */
  function num(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = txt(v).replace(/−/g, '-').replace(/^±\s*/, '').replace(/\s+/g, '');
    if (!s || /^[-—–]+$/.test(s)) return null;
    if (/^[+-]?\d{1,3}(\.\d{3})+,\d+(e[+-]?\d+)?$/i.test(s)) s = s.replace(/\./g, '');
    else if (/^[+-]?\d{1,3}(,\d{3})+\.\d+(e[+-]?\d+)?$/i.test(s)) s = s.replace(/,/g, '');
    if (!/^[+-]?(\d+([.,]\d+)?|[.,]\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    var n = Number(s.replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }
  /** νeff: vazio, "∞", "inf", "infinito" = 0 (convenção do SGO+: 0 = infinito). */
  function numVeff(v) {
    // : o "∞" da fonte Symbol copiado de PDF chega como caractere de uso privado.
    if (typeof v === 'string' && /^\s*([∞]|\+?inf(init[oy])?|infinito)\s*$/i.test(v)) return 0;
    return num(v);
  }
  function casas(v) {
    if (typeof v === 'number') { var t = String(v); if (/e/i.test(t)) return 6; var i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; }
    var s = txt(v), j = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    return j < 0 ? 0 : s.length - j - 1;
  }
  /** Unidade comparável: "ºC", "° C", "graus C" e "C" valem °C; µ grego e micro são o mesmo. */
  function normUnidade(u) {
    var s = txt(u).replace(/[º˚]/g, '°').replace(/μ/g, 'µ').replace(/\s+/g, '').toLowerCase();
    if (/^(°?c|graus?c(elsius)?|degc|°celsius)$/.test(s)) return '°c';
    if (/^(%?ur|%rh|ur%|rh%|%u\.?r\.?)$/.test(s)) return '%ur';
    return s;
  }
  function fmt(n, unidade) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    var t = String(arred(n));
    if (/e/i.test(t)) t = Number(n).toPrecision(6).replace(/\.?0+(e|$)/, '$1');
    return t.replace('.', ',') + (unidade ? ' ' + unidade : '');
  }
  function fmtVeff(v) { return !v ? '∞' : fmt(v); }

  /* ---------- leitura de texto colado (PDF, planilha, CSV) ---------- */
  var SINONIMOS = [
    ['ignorar', /^(leitura\s*\d+.*|l\d+|em|erro\s*max(imo)?.*|\|?\s*tendencia\s*\+\s*u.*|n[ºo°]?|item|#|faixa)$/],
    ['de', /^(de|inicio|faixa\s*de|limite\s*inferior|min(imo)?)$/],
    ['ate', /^(ate|fim|faixa\s*ate|limite\s*superior|max(imo)?)$/],
    ['veff', /(graus?\s*de\s*liberdade|v\s*eff|veff|νeff|^ν$|^gl$|^v$)/],
    ['k', /^(k|fator\s*k|fator\s*(de\s*)?abrangencia.*|k\s*\(.*\))$/],
    ['u95', /(incerteza|^u95|^u\s*\(?95|^u$|^ue$|^u\s*exp|^im$|^i\.m\.?$|^u\s*\()/],
    ['correcao', /(^c$|^corr$|correcao)/],
    ['erro', /(^e$|erro|tendencia|^desvio$)/],
    ['indicacao', /(indica|^(vi|vli|vmli|vml|mm)\b|^media|leitura\s*media|valor\s*indicado|^leitura$|^instrumento)/],
    ['referencia', /(refer|^(vr|vc|vvc)\b|convencional|verdadeiro|^ref\b|valor\s*do\s*padrao|^padrao$)/],
    ['nominal', /(nominal|^ponto|ponto\s*de\s*calibra|^pto$|setpoint|^valor$)/],
    ['unidade', /^(unidade|un|unid|unit)$/],
    ['grandeza', /(grandeza|canal|sensor|escala|faixa\s*\/\s*canal)/],
    ['resolucao', /^(resolucao|res|resol)/]
  ];
  function campoDoTitulo(t) {
    var unidade = '';
    var m = /\(([^()]*)\)\s*$/.exec(t);
    var base = t;
    if (m) { base = t.slice(0, m.index); if (/^[^\d=]{1,8}$/.test(m[1].trim()) && !/^(u|u95|ue|k|veff|vi|vc|vr)$/i.test(m[1].trim())) unidade = m[1].trim(); }
    var s = semAcento(base).replace(/[|*:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    if (/^erro\s*\/\s*corre/.test(s) || /^erro\s*ou\s*corre/.test(s)) return { campo: 'erro', unidade: unidade };
    for (var i = 0; i < SINONIMOS.length; i++) if (SINONIMOS[i][1].test(s)) return { campo: SINONIMOS[i][0], unidade: unidade };
    return null;
  }
  function separar(linha, modo) {
    var l = linha;
    if (modo === 'pipe') { l = l.replace(/^\s*\|/, '').replace(/\|\s*$/, ''); return l.split('|').map(txt); }
    if (modo === 'tab') return l.split('\t').map(txt);
    if (modo === 'pv') return l.split(';').map(txt);
    if (modo === 'virgula') return l.split(',').map(txt);
    // Espaços (PDF copiado): número seguido de unidade vira uma célula só.
    var partes = txt(l).split(/\s+/), cel = [];
    partes.forEach(function (p) {
      var ant = cel.length ? cel[cel.length - 1] : null;
      if (ant !== null && !isNaN(num(ant)) && num(ant) !== null && isNaN(num(p)) && !/^([∞]|inf)/i.test(p) && /^[^\d+\-−±]/.test(p) && p.length <= 6) cel[cel.length - 1] = ant + ' ' + p;
      else cel.push(p);
    });
    return cel;
  }
  function modoDe(linhas) {
    var t = linhas.join('\n');
    if (/\t/.test(t)) return 'tab';
    if (/\|/.test(t)) return 'pipe';
    if (/;/.test(t)) return 'pv';
    // Vírgula como separador só no CSV, reconhecido pela linha de títulos separada por vírgulas (pt-BR usa vírgula como decimal).
    var t0 = linhas[0].split(',').map(function (c) { return campoDoTitulo(txt(c)); }).filter(function (x) { return x && x.campo !== 'ignorar'; });
    return t0.length >= 2 ? 'virgula' : 'espaco';
  }
  /** Número e unidade de uma célula: "0,05 °C" -> {n:0.05, u:"°C"}. */
  function celula(c, campo) {
    c = txt(c);
    var m = /^([+\-−±]?\s*[\d.,]+(?:e[+-]?\d+)?)\s*([^\d\s].*)?$/i.exec(c);
    if (m && !isNaN(num(m[1])) && num(m[1]) !== null) return { bruto: m[1].replace(/\s+/g, ''), unidade: m[2] ? txt(m[2]) : '' };
    if (campo === 'veff' && /^([∞]|\+?inf(init[oy])?|infinito)$/i.test(c)) return { bruto: '∞', unidade: '' };
    return { bruto: c, unidade: '' };
  }
  function ehTitulo(cels) {
    var mapa = cels.map(function (c) { return campoDoTitulo(c); });
    // Mesma informação em duas colunas (antes/após o ajuste, mA e °C, bar e %): vale a coluna na unidade da incerteza,
    // depois a de "após o ajuste"; as outras são ignoradas.
    var colU = mapa.filter(function (x) { return x && x.campo === 'u95'; })[0];
    var uU = colU ? normUnidade(colU.unidade) : '';
    var nota = function (i) { var s = semAcento(cels[i]), x = mapa[i], n = 0;
      if (uU && x.unidade && normUnidade(x.unidade) === uU) n += 4; else if (uU && x.unidade) n -= 4;
      if (/(apos|depois|com\s*ajuste|after)/.test(s)) n += 2; if (/(antes|sem\s*ajuste|before)/.test(s)) n -= 1; return n; };
    var porCampo = {};
    mapa.forEach(function (x, i) { if (x && x.campo !== 'ignorar') (porCampo[x.campo] = porCampo[x.campo] || []).push(i); });
    Object.keys(porCampo).forEach(function (k) {
      var l = porCampo[k]; if (l.length < 2 || k === 'grandeza') return;
      var melhor = l.slice().sort(function (a, b) { return nota(b) - nota(a) || a - b; })[0];
      l.forEach(function (i) { if (i !== melhor) mapa[i] = { campo: 'ignorar', unidade: '' }; });
    });
    var reconhecidos = mapa.filter(function (x) { return x && x.campo !== 'ignorar'; }).map(function (x) { return x.campo; });
    var numericas = cels.filter(function (c) { var n = num(celula(c).bruto); return n !== null && !isNaN(n); }).length;
    var temIncerteza = reconhecidos.indexOf('u95') >= 0;
    var temPonto = ['nominal', 'indicacao', 'referencia', 'de'].some(function (k) { return reconhecidos.indexOf(k) >= 0; });
    return numericas === 0 && reconhecidos.length >= 2 ? { mapa: mapa, completo: temIncerteza && temPonto } : null;
  }

  /**
   * Lê texto colado de um PDF, planilha ou CSV. A primeira linha útil precisa ter os títulos das colunas.
   * Devolve { linhas: [{campo: texto}], avisos: [...], erro: '' }. Não valida: use validar() depois.
   */
  function lerTexto(texto) {
    var brutas = String(texto == null ? '' : texto).replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.replace(/\s+$/, ''); });
    var linhas = brutas.filter(function (l) { return txt(l) && !/^[\s|:\-+=_]+$/.test(l); });
    if (!linhas.length) return { linhas: [], avisos: [], erro: 'Nada para ler: cole a tabela do certificado (com a linha de títulos) no campo e clique de novo.' };
    var modo = modoDe(linhas), ptBR = modo !== 'virgula' && /\d,\d/.test(linhas.join('\n')), saida = [], avisos = [], cab = null, ignoradas = 0, semTitulo = 0, tabelasSemIncerteza = 0, avisoColunas = '', semIncerteza = [];
    linhas.forEach(function (l) {
      var cels = separar(l, modo);
      var tit = ehTitulo(cels);
      if (tit) { if (tit.completo) cab = tit.mapa; else { cab = null; tabelasSemIncerteza++; } return; }
      if (!cab) { semTitulo++; return; }
      var temNumero = cels.some(function (c) { var n = num(celula(c).bruto); return n !== null && !isNaN(n); });
      if (!temNumero) { ignoradas++; return; }
      if (modo === 'espaco' && cels.length !== cab.length && !avisoColunas) avisoColunas = 'Os títulos têm ' + cab.length + ' colunas e a linha "' + txt(l).slice(0, 40) + '" tem ' + cels.length + ' valores: não dá para saber qual número é de qual coluna. Cole de uma planilha (colunas separadas por tabulação) ou separe títulos e valores com ponto e vírgula (;) e leia de novo.';
      if (avisoColunas) return;
      var o = {}, unidadeLinha = '';
      cab.forEach(function (col, i) {
        if (!col || col.campo === 'ignorar' || i >= cels.length) return;
        var cel = txt(cels[i]);
        if (col.campo === 'grandeza' || col.campo === 'unidade') { if (cel && !o[col.campo]) o[col.campo] = cel; return; }
        var c = celula(cel, col.campo);
        if (c.bruto === '' || /^[-—–]+$/.test(c.bruto)) return;
        // Texto em pt-BR (vírgula decimal): "1.000" é mil, não um.
        if (ptBR && /^[+\-−]?\d{1,3}(\.\d{3})+$/.test(c.bruto)) c.bruto = c.bruto.replace(/\./g, '');
        if (o[col.campo] === undefined) o[col.campo] = c.bruto;
        if (!unidadeLinha) unidadeLinha = c.unidade || col.unidade || '';
      });
      if (o.correcao !== undefined) {
        if (o.erro === undefined) { var cn = num(o.correcao); o.erro = cn === null || isNaN(cn) ? o.correcao : String(arred(-cn)).replace('.', ','); }
        delete o.correcao;
      }
      if (!o.unidade && unidadeLinha && !/^%$/.test(unidadeLinha)) o.unidade = unidadeLinha;
      // Linha sem incerteza no certificado (ex.: ponto zero com "---"): não serve para o cálculo; fica de fora com aviso.
      if (o.u95 === undefined) { semIncerteza.push(txt(o.nominal || o.indicacao || o.referencia || '?') + (o.unidade ? ' ' + o.unidade : '')); return; }
      saida.push(o);
    });
    if (avisoColunas) return { linhas: [], avisos: [], erro: avisoColunas };
    if (!saida.length) {
      var e = semTitulo && !cab ? 'Não encontrei a linha de títulos das colunas. Cole a tabela junto com os títulos (ex.: Ponto; Indicação; Erro; U95; k; νeff) ou digite os títulos na primeira linha e leia de novo.'
        : semIncerteza.length ? 'Nenhuma linha da tabela traz a incerteza (U95) preenchida. Confira se colou a tabela de resultados do certificado.'
        : tabelasSemIncerteza ?'A tabela colada não tem a coluna de incerteza (U, U95 ou "Incerteza"). Cole a tabela de resultados do certificado, que traz a incerteza de cada ponto.'
        : 'Nenhuma linha com números foi encontrada abaixo dos títulos. Confira o texto colado.';
      return { linhas: [], avisos: [], erro: e };
    }
    if (semIncerteza.length) avisos.push('Ficaram de fora ' + semIncerteza.length + ' linha(s) sem incerteza no certificado (' + semIncerteza.slice(0, 5).join('; ') + '): sem a incerteza do certificado o ponto não pode entrar no cálculo.');
    if (ignoradas) avisos.push(ignoradas + ' linha(s) sem números foram ignoradas.');
    if (semTitulo) avisos.push(semTitulo + ' linha(s) antes da linha de títulos foram ignoradas.');
    if (tabelasSemIncerteza) avisos.push('Uma tabela sem a coluna de incerteza (por exemplo, só faixas de medição) foi ignorada.');
    return { linhas: saida, avisos: avisos, erro: '' };
  }

  /** Linhas vindas da IA ou do servidor ({campo: texto ou número}) no formato do editor (texto). */
  function deObjetos(lista) {
    return (Array.isArray(lista) ? lista : []).slice(0, MAX_LINHAS).map(function (o) {
      o = o || {};
      var r = {};
      CAMPOS.forEach(function (k) { var v = o[k]; if (v !== null && v !== undefined && txt(v) !== '') r[k] = typeof v === 'number' ? String(v).replace('.', ',') : txt(v).slice(0, 80); });
      if ((r.erro === undefined || r.erro === '') && o.correcao !== undefined && txt(o.correcao) !== '') { var c = num(o.correcao); if (c !== null && !isNaN(c)) r.erro = String(arred(-c)).replace('.', ','); }
      return r;
    }).filter(function (r) { return Object.keys(r).length; });
  }

  /**
   * Confere e normaliza a tabela. Linhas: objetos com os campos de CAMPOS (texto ou número).
   * Devolve { pontos: [números], erros: ['Linha 2: ...'], avisos: [...] }. Com erro, nada deve ser salvo.
   */
  function validar(linhas) {
    var erros = [], avisos = [], pontos = [];
    if (!Array.isArray(linhas) || !linhas.length) return { pontos: [], erros: ['A tabela de pontos está vazia. Informe ao menos 1 ponto com U95 e k do certificado.'], avisos: [] };
    if (linhas.length > MAX_LINHAS) return { pontos: [], erros: ['A tabela tem ' + linhas.length + ' linhas; o limite é ' + MAX_LINHAS + '. Divida o padrão em cadastros por canal, TAG (canal).'], avisos: [] };
    var varias = linhas.length > 1;
    linhas.forEach(function (l, i) {
      l = l || {};
      var n = 'Linha ' + (i + 1), p = { grandeza: txt(l.grandeza).slice(0, 120), unidade: txt(l.unidade).slice(0, 20) }, ok = true;
      NUMERICOS.forEach(function (k) {
        var v = k === 'veff' ? numVeff(l[k]) : num(l[k]);
        if (v !== null && isNaN(v)) { erros.push(n + ': ' + ROTULOS[k] + ' "' + txt(l[k]) + '" não é um número. Use, por exemplo, 0,05 ou 0.05.'); ok = false; v = null; }
        p[k] = v;
      });
      if (!ok) return;
      if (p.u95 === null) { erros.push(n + ': falta a U95 (incerteza expandida) do certificado.'); ok = false; }
      else if (!(p.u95 > 0)) { erros.push(n + ': a U95 precisa ser maior que zero.'); ok = false; }
      if (p.k === null) { erros.push(n + ': falta o fator k. O certificado do padrão informa k junto da incerteza (normalmente 2,00).'); ok = false; }
      else if (!(p.k > 0)) { erros.push(n + ': o fator k precisa ser maior que zero.'); ok = false; }
      if (p.veff === null) p.veff = 0;
      if (p.veff < 0) { erros.push(n + ': νeff não pode ser negativo (deixe vazio ou 0 para infinito).'); ok = false; }
      if (p.resolucao !== null && !(p.resolucao > 0)) { erros.push(n + ': a resolução, quando informada, precisa ser maior que zero.'); ok = false; }
      if ((p.de === null) !== (p.ate === null)) { erros.push(n + ': para uma faixa, informe De e Até (ou deixe os dois vazios).'); ok = false; }
      else if (p.de !== null && p.de > p.ate) { erros.push(n + ': na faixa, De (' + fmt(p.de) + ') precisa ser menor que Até (' + fmt(p.ate) + ').'); ok = false; }
      // Ponto: o valor que o operador lê no padrão. Sem coluna própria, vem da indicação do padrão; sem ela, da referência.
      if (p.nominal === null && p.de === null) {
        if (p.indicacao !== null) p.nominal = p.indicacao;
        else if (p.referencia !== null) p.nominal = p.referencia;
      }
      if (varias && p.nominal === null && p.de === null) { erros.push(n + ': informe o ponto (ou a faixa De/Até). Com mais de um ponto, cada linha precisa dizer a que valor ela vale.'); ok = false; }
      if (p.erro === null && p.indicacao !== null && p.referencia !== null) { p.erro = arred(p.indicacao - p.referencia); p.erroCalculado = true; }
      else if (p.erro !== null && p.indicacao !== null && p.referencia !== null) {
        var dif = Math.abs(p.erro - (p.indicacao - p.referencia)), tol = 0.51 * Math.pow(10, -Math.max(casas(l.erro), casas(l.indicacao), casas(l.referencia)));
        if (dif > tol + 1e-12) avisos.push(n + ': o erro informado (' + fmt(p.erro) + ') difere de indicação − referência (' + fmt(arred(p.indicacao - p.referencia)) + '). Confira o sinal: erro = indicação − referência; correção = −erro.');
      }
      if (ok) { p.linha = i + 1; pontos.push(p); }
    });
    // Uma grandeza por cadastro: todas as linhas na mesma unidade.
    var un = null;
    pontos.forEach(function (p) {
      if (!p.unidade) return;
      if (un === null) { un = p; return; }
      if (normUnidade(p.unidade) !== normUnidade(un.unidade)) erros.push('Linha ' + p.linha + ': unidade "' + p.unidade + '" diferente da linha ' + un.linha + ' ("' + un.unidade + '"). Um cadastro guarda uma grandeza só; para outra grandeza ou canal use outro cadastro com a mesma TAG e o canal entre parênteses, por exemplo THM-002 (U).');
    });
    if (un) pontos.forEach(function (p) { if (!p.unidade) p.unidade = un.unidade; });
    if (pontos.length > 1 && !un) avisos.push('Nenhuma linha informa a unidade. Informe a unidade (ex.: °C) para o sistema conferir se o bloco do ensaio está na mesma unidade do padrão.');
    // Pontos repetidos: permitidos (vários canais no mesmo cadastro), com aviso; o cálculo usa o de maior incerteza.
    var vistos = {};
    pontos.forEach(function (p) {
      var ch = p.de !== null ? 'f' + p.de + '|' + p.ate : (p.nominal !== null ? 'p' + p.nominal : '');
      if (!ch) return;
      if (vistos[ch]) avisos.push('Linhas ' + vistos[ch].linha + ' e ' + p.linha + ': mesmo ponto (' + (p.de !== null ? fmt(p.de) + ' a ' + fmt(p.ate) : fmt(p.nominal)) + '). O cálculo usa a maior incerteza entre elas' + (vistos[ch].erro !== p.erro ? ' e não aplica correção nesse ponto, porque os erros são diferentes' : '') + '. Se são canais diferentes, prefira um cadastro por canal.');
      else vistos[ch] = p;
    });
    if (pontos.length === 1 && linhas.length === 1 && pontos[0].nominal !== null && pontos[0].de === null)
      avisos.push('Ponto único: ele vale para todo o bloco do ensaio, como o cadastro antigo. Se o certificado só garante um ponto ou uma faixa, informe De/Até ou cadastre os demais pontos.');
    if (erros.length) return { pontos: [], erros: erros, avisos: avisos };
    pontos.forEach(function (p) { delete p.linha; delete p.erroCalculado; });
    return { pontos: pontos, erros: [], avisos: avisos };
  }

  function u(p) { return p.u95 / p.k; }
  /** Ponto que representa o padrão nas telas e documentos antigos: o de maior incerteza-padrão (conservador). */
  function resumo(pontos) {
    var m = null;
    (pontos || []).forEach(function (p) { if (!m || u(p) > u(m) + 1e-15 || (Math.abs(u(p) - u(m)) <= 1e-15 && p.u95 > m.u95)) m = p; });
    return m ? { u95: m.u95, k: m.k, veff: m.veff } : null;
  }
  /** Tabela equivalente ao cadastro antigo (1 linha só com U95, k e νeff): não precisa de PONTOS_JSON. */
  function ehLegado(pontos) {
    if (!pontos || pontos.length !== 1) return false;
    var p = pontos[0];
    return !txt(p.grandeza) && !txt(p.unidade) && ['nominal', 'de', 'ate', 'indicacao', 'referencia', 'erro', 'resolucao'].every(function (k) { return p[k] === null || p[k] === undefined; });
  }
  /** JSON gravado em CAD_PADROES.PONTOS_JSON, ligado ao número do certificado. Tabela equivalente ao antigo: ''. */
  function serializar(pontos, certificado) {
    if (ehLegado(pontos)) return '';
    return JSON.stringify({ versao: 1, certificado: txt(certificado), pontos: (pontos || []).map(function (p) {
      var o = {};
      CAMPOS.forEach(function (k) { var v = p[k]; if (v === null || v === undefined || v === '') return; o[k] = typeof v === 'number' ? arred(v) : v; });
      return o;
    }) });
  }
  /**
   * Pontos de um registro de CAD_PADROES (servidor ou tela).
   * { pontos, legado, certificado, defasado, erro }: legado = sem tabela (1 ponto com INCERTEZA_U95/FATOR_K/VEFF);
   * defasado = a tabela é de outro número de certificado (renovação sem conferir os pontos).
   */
  function ler(reg) {
    reg = reg || {};
    var bruto = txt(reg.PONTOS_JSON);
    if (!bruto) {
      var p = { grandeza: '', unidade: '', nominal: null, de: null, ate: null, indicacao: null, referencia: null, erro: null,
        u95: num(reg.INCERTEZA_U95), k: num(reg.FATOR_K), veff: numVeff(reg.VEFF), resolucao: null };
      if (p.k === null) p.k = 2;
      if (p.veff === null) p.veff = 0;
      return { pontos: [p], legado: true, certificado: txt(reg.CERTIFICADO_NUMERO), defasado: false, erro: '' };
    }
    var j;
    try { j = JSON.parse(bruto); } catch (e) { j = null; }
    if (!j || !Array.isArray(j.pontos) || !j.pontos.length) return { pontos: [], legado: false, certificado: '', defasado: false, erro: 'A tabela de pontos gravada está ilegível.' };
    var v = validar(j.pontos.map(function (o) { var r = {}; CAMPOS.forEach(function (k) { r[k] = o[k]; }); return r; }));
    if (v.erros.length) return { pontos: [], legado: false, certificado: txt(j.certificado), defasado: false, erro: 'A tabela de pontos gravada tem problema: ' + v.erros[0] };
    var cert = txt(j.certificado), atual = txt(reg.CERTIFICADO_NUMERO);
    return { pontos: v.pontos, legado: false, certificado: cert, defasado: !!(atual && cert !== atual), erro: '' };
  }
  function valorPonto(p) { return p.de !== null ? null : p.nominal; }
  function rotuloPonto(p) {
    if (!p) return '';
    if (p.de !== null) return 'faixa ' + fmt(p.de) + ' a ' + fmt(p.ate, p.unidade);
    if (p.nominal !== null) return 'ponto ' + fmt(p.nominal, p.unidade);
    return 'valor único do certificado';
  }
  /** "0 a 100 °C (5 pontos)" — onde o padrão foi calibrado. */
  function cobertura(pontos) {
    pontos = pontos || [];
    var lo = Infinity, hi = -Infinity, un = '';
    pontos.forEach(function (p) {
      if (p.unidade && !un) un = p.unidade;
      if (p.de !== null) { lo = Math.min(lo, p.de); hi = Math.max(hi, p.ate); }
      else if (p.nominal !== null) { lo = Math.min(lo, p.nominal); hi = Math.max(hi, p.nominal); }
    });
    var n = pontos.length + (pontos.length === 1 ? ' ponto' : ' pontos');
    if (!isFinite(lo)) return n;
    return (lo === hi ? fmt(lo, un) : fmt(lo) + ' a ' + fmt(hi, un)) + ' (' + n + ')';
  }

  /**
   * Escolhe o ponto do padrão para o valor x do bloco (na unidade do bloco).
   * Sucesso: { ok:true, regra:'EXATO'|'FAIXA'|'ENTRE'|'UNICO', u95, k, veff, ponto, vizinhos, erro (ou null), erroMotivo, rotulo }.
   * Falha:   { ok:false, motivo:'UNIDADE'|'FORA'|'VAZIO', unidades, cobertura }.
   */
  function escolher(pontos, x, unidadeBloco) {
    pontos = pontos || [];
    if (!pontos.length) return { ok: false, motivo: 'VAZIO' };
    var ub = normUnidade(unidadeBloco);
    var comp = pontos.filter(function (p) { return !p.unidade || !ub || normUnidade(p.unidade) === ub; });
    if (!comp.length) return { ok: false, motivo: 'UNIDADE', unidades: pontos.map(function (p) { return p.unidade; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }) };
    var res = function (regra, escolhido, viz, erro, erroMotivo, rotulo) {
      return { ok: true, regra: regra, u95: escolhido.u95, k: escolhido.k, veff: escolhido.veff, ponto: escolhido, vizinhos: viz || [], erro: erro, erroMotivo: erroMotivo || '', rotulo: rotulo };
    };
    var maior = function (l) { return l.reduce(function (a, b) { return u(b) > u(a) + 1e-15 || (Math.abs(u(b) - u(a)) <= 1e-15 && b.u95 > a.u95) ? b : a; }); };
    if (comp.length === 1 && comp[0].de === null && pontos.length === 1)
      return res('UNICO', comp[0], [], comp[0].erro, comp[0].erro === null ? 'o certificado do padrão não traz o erro' : '', 'valor único do certificado (vale para todo o bloco)');
    var tol = function (p) { return 1e-9 * Math.max(1, Math.abs(p)); };
    var exatos = comp.filter(function (p) { return p.nominal !== null && p.de === null && Math.abs(x - p.nominal) <= tol(p.nominal); });
    var erroUnico = function (l) {
      var com = l.filter(function (p) { return p.erro !== null; });
      if (!com.length) return { e: null, m: 'o certificado do padrão não traz o erro neste ponto' };
      if (com.length !== l.length || com.some(function (p) { return Math.abs(p.erro - com[0].erro) > 1e-12; })) return { e: null, m: 'há mais de uma linha neste ponto com erros diferentes' };
      return { e: com[0].erro, m: '' };
    };
    if (exatos.length) {
      var ex = maior(exatos), eu = erroUnico(exatos);
      return res('EXATO', ex, [], eu.e, eu.m, rotuloPonto(ex) + (exatos.length > 1 ? ' (maior incerteza entre ' + exatos.length + ' linhas iguais)' : ''));
    }
    var faixas = comp.filter(function (p) { return p.de !== null && x >= p.de - tol(p.de) && x <= p.ate + tol(p.ate); });
    var discretos = comp.filter(function (p) { return p.de === null && p.nominal !== null; }).slice().sort(function (a, b) { return a.nominal - b.nominal; });
    var abaixo = null, acima = null;
    discretos.forEach(function (p) { if (p.nominal < x) abaixo = abaixo && abaixo.nominal === p.nominal ? maior([abaixo, p]) : p; });
    for (var i = discretos.length - 1; i >= 0; i--) { var q = discretos[i]; if (q.nominal > x) acima = acima && acima.nominal === q.nominal ? maior([acima, q]) : q; }
    // Vizinhos com o mesmo valor: o de maior incerteza (já tratado acima, mantendo o primeiro mais próximo).
    var entre = abaixo && acima ? [abaixo, acima] : [];
    var candidatos = faixas.concat(entre);
    if (!candidatos.length) return { ok: false, motivo: 'FORA', cobertura: cobertura(comp) };
    var esc = maior(candidatos);
    if (faixas.indexOf(esc) >= 0) {
      var ef = faixas.length === 1 && !entre.length ? { e: esc.erro, m: esc.erro === null ? 'o certificado do padrão não traz o erro nesta faixa' : '' } : erroUnico(faixas.length === 1 ? [esc] : faixas);
      return res('FAIXA', esc, faixas, ef.e, ef.m, rotuloPonto(esc));
    }
    // ENTRE: correção interpolada linearmente entre os dois vizinhos (só com o erro dos dois e sem linhas repetidas nesses valores).
    var repetido = function (p) { return discretos.filter(function (o) { return o.nominal === p.nominal && o !== p && Math.abs((o.erro === null ? NaN : o.erro) - (p.erro === null ? NaN : p.erro)) > 1e-12; }).length > 0; };
    var e = null, m = '';
    if (abaixo.erro === null || acima.erro === null) m = 'o certificado do padrão não traz o erro nos dois pontos vizinhos';
    else if (repetido(abaixo) || repetido(acima)) m = 'há linhas repetidas nos pontos vizinhos com erros diferentes';
    else e = arred(abaixo.erro + (acima.erro - abaixo.erro) * (x - abaixo.nominal) / (acima.nominal - abaixo.nominal));
    return res('ENTRE', esc, entre, e, m, 'entre ' + fmt(abaixo.nominal) + ' e ' + fmt(acima.nominal, esc.unidade) + ': dados do ponto ' + fmt(esc.nominal, esc.unidade) + ' (maior incerteza dos dois vizinhos)');
  }

  return { CAMPOS: CAMPOS, ROTULOS: ROTULOS, MAX_LINHAS: MAX_LINHAS, num: num, numVeff: numVeff, normUnidade: normUnidade, fmt: fmt, fmtVeff: fmtVeff,
    lerTexto: lerTexto, deObjetos: deObjetos, validar: validar, resumo: resumo, ehLegado: ehLegado, serializar: serializar, ler: ler,
    escolher: escolher, cobertura: cobertura, rotuloPonto: rotuloPonto, valorPonto: valorPonto };
}
var PadPontos = PadPontos_fabrica_();
if (typeof module !== 'undefined' && module.exports) module.exports = PadPontos;
