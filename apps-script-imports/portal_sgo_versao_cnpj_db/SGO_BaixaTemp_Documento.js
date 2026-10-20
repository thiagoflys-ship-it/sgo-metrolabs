/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — DOCUMENTO A4 (relatório de qualificação)
 *
 * Usa o padrão comum SGO_DocA4 (capa, cabeçalho e rodapé corridos, sumário com
 * números de página, tabelas, gráficos em SVG estático, assinaturas).
 * Ordem: capa; ficha e resultado; sumário; 1 identificação; 2 objetivo e escopo;
 * 3 referências; 4 metodologia; 5 instrumentação; 6 critérios (com fonte);
 * 7 QI; 8 QO; 9 QD; 10 consolidação; 11 incertezas; 12 não conformidades e
 * observações; 13 conclusão; 14 responsabilidades e assinaturas; anexos.
 * Cada informação aparece uma vez (o requisito fica na seção 6; as seções de
 * resultado mostram o obtido e a situação).
 *
 *  BaixaTempDoc_montar_(o) → HTML completo
 *   o = { dados, av, series:{cicloId: serie}, textos, numero, revisao, geradoEm,
 *         empresa:{nome,cnpj}, elaborador:{nome}, aprovacao:{nome,cargo,registro,imagemSvg,quando,parecer,usuario},
 *         historico:[{acao,usuario,quando,detalhe}], arquivos:{cicloId:[{nome,leituras}]}, simulado }
 ****************************************************/

function BaixaTempDoc_esc_(s) { return SGO_DocA4_esc_(s); }
function BaixaTempDoc_f_(v, c, u) { return BaixaTempMotor_fmt_(v, c, u); }

/** Gráfico de pressão em escala logarítmica (o vácuo de fração de mbar e a pressão ambiente no mesmo gráfico). */
function BaixaTempDoc_graficoPressao_(o) {
  var tempos = o.tempos || [], p = o.pressao || [];
  var pts = [];
  for (var i = 0; i < tempos.length; i++) if (p[i] !== null && p[i] > 0 && isFinite(p[i])) pts.push([(tempos[i] - tempos[0]) / 60000, p[i]]);
  if (pts.length < 2) return '';
  pts = SGO_DocA4_reduzir_(pts, 400);
  var W = 680, H = 250, mL = 56, mR = 14, mT = 12, mB = 40, pw = W - mL - mR, ph = H - mT - mB;
  var xmin = pts[0][0], xmax = pts[pts.length - 1][0];
  if (xmax === xmin) xmax = xmin + 1;
  var lmin = Infinity, lmax = -Infinity;
  pts.forEach(function (q) { var l = Math.log(q[1]) / Math.LN10; if (l < lmin) lmin = l; if (l > lmax) lmax = l; });
  if (o.limiar && o.limiar > 0) { var ll = Math.log(o.limiar) / Math.LN10; if (ll < lmin) lmin = ll; if (ll > lmax) lmax = ll; }
  var d0 = Math.floor(lmin), d1 = Math.ceil(lmax); if (d1 === d0) d1 = d0 + 1;
  function X(x) { return mL + (x - xmin) / (xmax - xmin) * pw; }
  function Y(v) { return mT + (1 - ((Math.log(v) / Math.LN10) - d0) / (d1 - d0)) * ph; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  var s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="9.5">');
  s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');
  if (o.janela) {
    var a = X((o.janela.inicio - tempos[0]) / 60000), b = X((o.janela.fim - tempos[0]) / 60000);
    if (b > a) { s.push('<rect x="' + f1(a) + '" y="' + mT + '" width="' + f1(b - a) + '" height="' + ph + '" fill="#eef3fb"/>'); s.push('<text x="' + f1((a + b) / 2) + '" y="' + (mT + 10) + '" text-anchor="middle" fill="#3e4c59" font-size="8.5">Exposição</text>'); }
  }
  for (var d = d0; d <= d1; d++) {
    var y = Y(Math.pow(10, d));
    s.push('<line x1="' + mL + '" y1="' + f1(y) + '" x2="' + (mL + pw) + '" y2="' + f1(y) + '" stroke="#e1e6ec" stroke-width="0.7"/>');
    s.push('<text x="' + (mL - 5) + '" y="' + f1(y + 3.2) + '" text-anchor="end" fill="#3e4c59">' + BaixaTempDoc_esc_(SGO_DocA4_num_(Math.pow(10, d), d < 0 ? -d : 0)) + '</text>');
  }
  var passoX = SGO_DocA4_passo_(xmax - xmin, 8);
  for (var xv = Math.ceil(xmin / passoX) * passoX; xv <= xmax + 1e-9; xv += passoX) {
    s.push('<text x="' + f1(X(xv)) + '" y="' + (mT + ph + 13) + '" text-anchor="middle" fill="#3e4c59">' + BaixaTempDoc_esc_(SGO_DocA4_num_(xv, passoX < 1 ? 1 : 0)) + '</text>');
  }
  s.push('<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#9aa5b1" stroke-width="0.8"/>');
  s.push('<path d="' + pts.map(function (q, k) { return (k ? 'L' : 'M') + f1(X(q[0])) + ' ' + f1(Y(q[1])); }).join('') + '" fill="none" stroke="#1f5fa8" stroke-width="1.2" stroke-linejoin="round"/>');
  if (o.limiar && o.limiar > 0) {
    s.push('<line x1="' + mL + '" y1="' + f1(Y(o.limiar)) + '" x2="' + (mL + pw) + '" y2="' + f1(Y(o.limiar)) + '" stroke="#a61b1b" stroke-width="1" stroke-dasharray="5 3"/>');
    s.push('<text x="' + (mL + pw - 4) + '" y="' + f1(Y(o.limiar) - 3) + '" text-anchor="end" fill="#a61b1b" font-size="8.5">' + BaixaTempDoc_esc_(o.rotuloLimiar || '') + '</text>');
  }
  s.push('<text transform="translate(12 ' + f1(mT + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#1f2933">Pressão (mbar, escala logarítmica)</text>');
  s.push('<text x="' + f1(mL + pw / 2) + '" y="' + (mT + ph + 28) + '" text-anchor="middle" fill="#1f2933">Tempo desde a primeira leitura (min)</text>');
  s.push('</svg>');
  return s.join('');
}

/** Gráfico de temperatura por sensor ativo com a janela de exposição e a faixa de aceitação. */
function BaixaTempDoc_graficoTemperatura_(serie, analise) {
  if (!serie || !serie.tempos || !serie.tempos.length) return { svg: '', nota: '' };
  var t0 = serie.tempos[0];
  var ativos = (analise.sensores || []).map(function (s, k) { return s.ativo ? k : -1; }).filter(function (k) { return k >= 0; });
  var series = ativos.map(function (k) {
    var pts = [];
    for (var i = 0; i < serie.tempos.length; i++) { var v = serie.temperaturas[k][i]; if (v !== null) pts.push([(serie.tempos[i] - t0) / 60000, v]); }
    var s = analise.sensores[k];
    return { nome: s.nome + (s.papel === 'CAMARA' ? ' (câmara)' : ''), pontos: pts };
  });
  var tt = analise.temperatura || {};
  var o = {
    series: series, rotuloX: 'Tempo desde a primeira leitura (min)', rotuloY: 'Temperatura (°C)',
    referencias: [], faixasX: analise.janela ? [{ x0: (analise.janela.inicio - t0) / 60000, x1: (analise.janela.fim - t0) / 60000, rotulo: 'Exposição' }] : []
  };
  if (tt.limiteInferior !== null && tt.limiteInferior !== undefined) o.referencias.push({ y: tt.limiteInferior, rotulo: 'Limite inferior ' + BaixaTempDoc_f_(tt.limiteInferior, 1, '°C') });
  if (tt.limiteSuperior !== null && tt.limiteSuperior !== undefined) o.referencias.push({ y: tt.limiteSuperior, rotulo: 'Limite superior ' + BaixaTempDoc_f_(tt.limiteSuperior, 1, '°C'), lado: 'esq' });
  var svg = SGO_DocA4_graficoLinhas_(o);
  return { svg: svg, nota: SGO_DocA4_notaCorte_(o, '°C') };
}

/** "a, b e c". */
function BaixaTempDoc_juntar_(l) { l = (l || []).filter(Boolean); return l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }

function BaixaTempDoc_situacao_(c) { return SGO_DocA4_celSituacao_(c, 'Conforme', 'Não conforme'); }

function BaixaTempDoc_rotuloResposta_(v) { return { SIM: 'Sim', NAO: 'Não', NA: 'Não se aplica' }[String(v || '').toUpperCase()] || '—'; }

function BaixaTempDoc_rotuloIndicador_(v) {
  return { CONFORME: 'Conforme', NAO_CONFORME: 'Não conforme', SEM_CRESCIMENTO: 'Sem crescimento', CRESCIMENTO: 'Com crescimento', PENDENTE: 'Pendente' }[String(v || '').toUpperCase()] || '—';
}

function BaixaTempDoc_montar_(o) {
  var dados = o.dados, av = o.av, textos = o.textos || {}, tipo = BaixaTemp_tipoCfg_(dados.tipo);
  var id = dados.identificacao || {}, P = BaixaTempMotor_parametros_(dados.programa), prog = dados.programa || {};
  var esc = BaixaTempDoc_esc_, f = BaixaTempDoc_f_;
  var conforme = av.resultado === 'CONFORME';
  var etapasNome = { QI: 'Qualificação de instalação (QI)', QO: 'Qualificação de operação (QO)', QD: 'Qualificação de desempenho (QD)' };
  var etapasTxt = av.etapas.map(function (e) { return e; }).join(', ');
  var periodo = id.dataInicio + (id.dataFim && id.dataFim !== id.dataInicio ? ' a ' + id.dataFim : '');
  var equipamento = [id.tipoEquipamento || 'Esterilizador', id.tag ? 'TAG ' + id.tag : ''].filter(Boolean).join(' — ');
  var nTab = 0, nFig = 0, sec = 0;
  function tab(texto) { nTab++; return SGO_DocA4_legendaTabela_(nTab, texto); }
  function fig(svg, legenda) { if (!svg) return ''; nFig++; return SGO_DocA4_figura_(svg, nFig, legenda); }
  var subN = 0;
  function h2(t) { sec++; subN = 0; return '<h2>' + sec + '. ' + esc(t) + '</h2>'; }
  function h3(t) { subN++; return '<h3>' + sec + '.' + subN + ' ' + esc(t) + '</h3>'; }
  var h = [];
  var parecer = conforme ? 'Conforme' : 'Não conforme';
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de qualificação de esterilizador a baixa temperatura',
    subtitulo: tipo.rotuloLongo + '. Etapas: ' + etapasTxt + '.',
    tituloCurto: 'Qualificação de esterilizador — ' + tipo.rotuloCurto,
    rotuloNumero: 'Relatório nº', numero: o.numero || 'sem número', revisao: o.revisao || '0',
    empresa: o.empresa,
    capa: {
      tipo: 'Relatório de qualificação',
      linhas: [['Cliente', id.cliente], ['Unidade', id.unidade], ['Equipamento', equipamento], ['Nº de série', id.numeroSerie], ['Processo', tipo.rotuloLongo], ['Etapas', av.etapas.map(function (e) { return etapasNome[e]; }).join('; ')], ['Período do ensaio', periodo], ['Emissão', o.geradoEm]]
    },
    ficha: [['Período do ensaio', periodo], ['Emissão', o.geradoEm]],
    simulado: o.simulado,
    resultado: { status: conforme ? 'CONFORME' : 'NAO_CONFORME', rotulo: 'Resultado da qualificação', valor: parecer, texto: av.resumo },
    sumario: true
  }));

  // 1. Identificação
  h.push(h2('Identificação'));
  var pares = [
    ['Cliente', id.cliente], ['CNPJ', id.cnpj], ['Endereço', id.endereco, { largo: true }], ['Unidade', id.unidade], ['Setor', id.setor],
    ['Equipamento', id.tipoEquipamento || 'Esterilizador'], ['TAG', id.tag], ['Nº de série', id.numeroSerie], ['Processo', tipo.rotuloLongo],
    ['Motivo da qualificação', id.motivo], ['Período do ensaio', periodo], ['Técnico executor', id.tecnicoExecutor], ['Acompanhado por (cliente)', id.responsavelCliente],
    ['Empresa executante', (o.empresa && o.empresa.nome ? o.empresa.nome : '') + (o.empresa && o.empresa.cnpj ? ' — CNPJ ' + o.empresa.cnpj : ''), { largo: true }]
  ];
  h.push(SGO_DocA4_tabelaIdent_(pares));

  // 2. Objetivo e escopo
  h.push(h2('Objetivo e escopo'));
  h.push('<p>Este relatório registra a qualificação do ' + esc(tipo.rotuloFrase) + ' identificado na seção 1, com o objetivo de demonstrar, por medição e por indicadores, que o equipamento está instalado conforme os requisitos aplicáveis e executa o ciclo programado dentro da especificação declarada pelo fabricante do equipamento. ' +
    'Foram executadas as etapas: ' + esc(BaixaTempDoc_juntar_(av.etapas.map(function (e) { return etapasNome[e].charAt(0).toLowerCase() + etapasNome[e].slice(1); }))) + '. ' +
    'O programa avaliado foi "' + esc(prog.nomePrograma || 'não informado') + '". Os resultados referem-se exclusivamente ao equipamento, ao programa, às cargas e às condições descritos neste documento.</p>');

  // 3. Referências
  h.push(h2('Referências normativas e documentos de referência'));
  h.push(SGO_DocA4_lista_(BaixaTemp_normasDoTipo_(dados.tipo).map(function (n) { return n.codigo + ' — ' + n.titulo; }).concat([
    'Especificação do ciclo do fabricante do equipamento: ' + (prog.fonteParametros || '—'),
    'Instruções de uso dos fabricantes dos indicadores químicos e biológicos utilizados'
  ])));

  // 4. Metodologia
  h.push(h2('Metodologia'));
  var elev = BaixaTempMotor_num_(prog.elevacaoPulsoMbar) || tipo.deteccao.elevacaoMinimaPulsoMbar;
  h.push('<p>Os sensores de temperatura dos registradores de dados foram posicionados na câmara, nos ciclos de operação, e na carga e na câmara, nos ciclos de desempenho, nas posições indicadas em cada ciclo. As leituras foram registradas durante todo o ciclo e lidas do arquivo exportado pelo registrador; arquivos de sensores registrados separadamente foram unidos pelo horário, com tolerância de meio intervalo entre leituras.</p>');
  h.push('<p>A janela de exposição é identificada pelos próprios dados: ' + (tipo.janelaAuto === 'PULSOS'
    ? 'do início do primeiro pulso de injeção do agente até o retorno ao vácuo depois do último pulso, ou, sem registro de pressão, pelo maior trecho contínuo em que todos os sensores ativos permanecem no limite inferior da faixa de temperatura.'
    : 'pelo maior trecho contínuo em que todos os sensores ativos permanecem no limite inferior da faixa de temperatura, ou, sem esse patamar, pelos pulsos de pressão.') +
    ' Considera-se pulso a elevação de pressão de pelo menos ' + esc(f(elev, 2, 'mbar')) + ' a partir de um vácuo, sem chegar à pressão ambiente; a elevação até a pressão ambiente é tratada como ventilação. Quando a janela foi informada pelo técnico a partir do registro do equipamento, a justificativa consta do ciclo.</p>');
  h.push('<p>Na janela de exposição calculam-se, para cada sensor ativo, a mínima, a média e a máxima, o número de leituras fora da faixa de aceitação e, entre sensores, a maior diferença no mesmo instante. Registram-se também a duração da exposição, a pressão mínima do ciclo e o número de pulsos. Os indicadores químicos e biológicos foram lidos conforme as instruções de uso dos respectivos fabricantes. A conformidade de cada critério é decidida pelo cálculo, sem interpretação, com a regra de decisão descrita na seção de incertezas.</p>');

  // 5. Instrumentação
  h.push(h2('Instrumentação e rastreabilidade'));
  var instr = Array.isArray(dados.instrumentos) ? dados.instrumentos : [];
  h.push(tab('Instrumentos utilizados e situação do certificado de calibração no período do ensaio'));
  h.push(SGO_DocA4_tabela_([{ t: 'Identificação' }, { t: 'Descrição' }, { t: 'Grandeza' }, { t: 'Certificado' }, { t: 'Validade', cls: 'cen' }, { t: 'U do certificado', cls: 'num' }],
    instr.map(function (i) {
      var un = { TEMPERATURA: '°C', PRESSAO: 'mbar', UMIDADE: '%', CONCENTRACAO: prog.unidadeConcentracao || '' }[String(i.grandeza || '').toUpperCase()] || '';
      return [i.tag || '—', i.descricao || '—', { TEMPERATURA: 'Temperatura', PRESSAO: 'Pressão', UMIDADE: 'Umidade', CONCENTRACAO: 'Concentração' }[String(i.grandeza || '').toUpperCase()] || '—', i.certificado || '—', { t: i.validade || '—', cls: 'cen' }, f(BaixaTempMotor_num_(i.U), 2, un) + ' (k = ' + SGO_DocA4_num_(BaixaTempMotor_num_(i.k) || 2, 2) + ')'];
    })));

  // 6. Critérios de aceitação
  h.push(h2('Critérios de aceitação'));
  h.push('<p>Os parâmetros do ciclo programado e as tolerâncias foram obtidos de: ' + esc(prog.fonteParametros || '—') + '. A tabela a seguir reúne os parâmetros; a tabela seguinte, os critérios avaliados e a fonte de cada um.</p>');
  h.push(tab('Ciclo programado'));
  h.push(SGO_DocA4_tabelaIdent_([
    ['Programa', prog.nomePrograma || '—'], ['Temperatura programada', f(P.temperaturaProgramada, 2, '°C')],
    ['Faixa de aceitação', P.temperaturaProgramada !== null && P.tolInf !== null && P.tolSup !== null ? f(P.temperaturaProgramada - P.tolInf, 1, '°C') + ' a ' + f(P.temperaturaProgramada + P.tolSup, 1, '°C') : '—'],
    ['Tempo de exposição', f(P.tempoExposicaoMin, 2, 'min')], ['Pulsos de injeção', P.pulsosProgramados === null ? 'Não declarado' : String(P.pulsosProgramados)],
    ['Pressão de vácuo', P.pressaoVacuoMbar === null ? 'Não declarada' : '≤ ' + f(P.pressaoVacuoMbar + (P.tolVacuoMbar || 0), 2, 'mbar')],
    ['Uniformidade entre sensores', P.uniformidadeMax === null ? 'Não declarada (informativo)' : '≤ ' + f(P.uniformidadeMax, 2, '°C')],
    ['Concentração ou umidade mínima', P.concentracaoMin === null ? 'Não declarada' : f(P.concentracaoMin, 2, P.unidadeConcentracao)]
  ]));
  var vistos = {}, linhasCrit = [];
  var todosCrit = av.criteriosEnsaio.concat.apply(av.criteriosEnsaio.slice(), av.ciclos.map(function (a) { return a.criterios.map(function (c) { var x = Object.assign({}, c); x.etapa = a.etapa; return x; }); }));
  todosCrit.forEach(function (c) {
    var k = c.codigo + '|' + c.requisito;
    if (vistos[k]) { if (vistos[k].etapas.indexOf(c.etapa) < 0) vistos[k].etapas.push(c.etapa); return; }
    vistos[k] = { c: c, etapas: [c.etapa] };
    linhasCrit.push(vistos[k]);
  });
  linhasCrit.sort(function (a, b) { return a.c.codigo < b.c.codigo ? -1 : (a.c.codigo > b.c.codigo ? 1 : 0); });
  h.push(tab('Critérios de aceitação avaliados, etapa e fonte'));
  h.push(SGO_DocA4_tabela_([{ t: 'Código', cls: 'cen' }, { t: 'Critério' }, { t: 'Requisito' }, { t: 'Etapa', cls: 'cen' }, { t: 'Fonte' }],
    linhasCrit.map(function (x) { return [{ t: x.c.codigo, cls: 'cen' }, x.c.titulo, x.c.requisito, { t: x.etapas.join(', '), cls: 'cen' }, x.c.fonte]; }), { classe: 'compacta' }));

  // Ciclo (QO/QD)
  function blocoCiclo(a) {
    var c = (dados.ciclos || []).filter(function (x) { return x.id === a.cicloId; })[0] || {};
    var b = [];
    b.push(h3(a.rotulo));
    var carga = { VAZIA: 'Câmara vazia', REFERENCIA: 'Carga de referência', REAL: 'Carga de rotina' }[String((c.carga || {}).tipo || '').toUpperCase()] || '—';
    b.push(SGO_DocA4_tabelaIdent_([
      ['Data do ciclo', c.data || '—'], ['Nº do ciclo no equipamento', c.numero || '—'], ['Carga', carga], ['Descrição da carga', (c.carga || {}).descricao || '—'],
      ['Leituras', a.leitura ? String(a.leitura.n) + ' (intervalo típico de ' + f(a.leitura.intervaloS, 0, 's') + ')' : '—'], ['Período registrado', a.leitura ? a.leitura.inicioTxt + ' a ' + BaixaTempParser_fmtHora_(a.leitura.fim) : '—'],
      ['Janela de exposição', a.janela ? a.janela.inicioTxt + ' a ' + a.janela.fimTxt + ' (' + f(a.janela.duracaoMin, 2, 'min') + ')' : '—', { largo: true }],
      ['Origem da janela', a.janela ? (a.janela.origem === 'manual' ? 'Informada pelo técnico: ' + (a.janela.justificativa || '—') : 'Identificada pelos ' + (a.janela.origem === 'pulsos' ? 'pulsos de pressão' : 'dados de temperatura')) : '—', { largo: true }]
    ]));
    if (a.fases && a.fases.length) {
      b.push(tab('Fases do ' + a.rotulo));
      b.push(SGO_DocA4_tabela_([{ t: 'Fase' }, { t: 'Início', cls: 'cen' }, { t: 'Fim', cls: 'cen' }, { t: 'Duração', cls: 'num' }], a.fases.map(function (x) { return [x.nome, { t: x.inicio, cls: 'cen' }, { t: x.fim, cls: 'cen' }, f(x.duracaoMin, 2, 'min')]; })));
    }
    b.push(tab('Temperatura por sensor na janela de exposição — ' + a.rotulo));
    b.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Posição' }, { t: 'Local' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }, { t: 'Fora da faixa', cls: 'num' }],
      (a.sensores || []).map(function (s) {
        if (!s.ativo) return [s.nome, s.posicao || '—', 'Desconsiderado', '—', '—', '—', '—'];
        return [s.nome, s.posicao || '—', s.papel === 'CAMARA' ? 'Câmara' : 'Carga', f(s.min, 2), f(s.media, 2), f(s.max, 2), s.foraFaixa ? s.foraFaixa + ' leitura(s)' : '—'];
      }), { classe: (a.sensores || []).length > 12 ? 'compacta' : '' }));
    var serie = (o.series || {})[a.cicloId];
    var gt = BaixaTempDoc_graficoTemperatura_(serie, a);
    b.push(fig(gt.svg, 'Temperatura por sensor ativo — ' + a.rotulo + '. Faixa sombreada: janela de exposição; linhas tracejadas: limites da faixa de aceitação.' + (gt.nota || '')));
    if (a.pressao && serie && serie.pressao) {
      b.push(fig(BaixaTempDoc_graficoPressao_({ tempos: serie.tempos, pressao: serie.pressao, janela: a.janela, limiar: a.pressao.limiarVacuo, rotuloLimiar: 'Limiar de vácuo ' + f(a.pressao.limiarVacuo, 2, 'mbar') }),
        'Pressão da câmara — ' + a.rotulo + '. Pressão mínima do ciclo ' + f(a.pressao.minCiclo, 2, 'mbar') + '; ' + a.pressao.pulsosJanela + ' pulso(s) na exposição.'));
    }
    var iqs = (c.iqs || []).filter(function (x) { return x && (x.posicao || x.lote); });
    if (iqs.length) {
      b.push(tab('Indicadores químicos — ' + a.rotulo));
      b.push(SGO_DocA4_tabela_([{ t: 'Posição' }, { t: 'Tipo' }, { t: 'Lote' }, { t: 'Validade', cls: 'cen' }, { t: 'Resultado' }], iqs.map(function (x) {
        var r = String(x.resultado || '').toUpperCase();
        return [x.posicao || '—', x.tipo || '—', x.lote || '—', { t: x.validade || '—', cls: 'cen' }, BaixaTempDoc_situacao_(r === 'CONFORME' ? true : (r === 'NAO_CONFORME' ? false : null))];
      })));
    }
    var ibs = (c.ibs || []).filter(function (x) { return x && (x.posicao || x.lote); });
    if (ibs.length) {
      var cp = c.controlePositivo || {}, inc = c.incubacao || {};
      b.push(tab('Indicadores biológicos — ' + a.rotulo));
      b.push(SGO_DocA4_tabela_([{ t: 'Posição' }, { t: 'Microrganismo' }, { t: 'Lote' }, { t: 'Validade', cls: 'cen' }, { t: 'Resultado' }], ibs.map(function (x) {
        var r = String(x.resultado || '').toUpperCase();
        return [x.posicao || '—', x.microrganismo || '—', x.lote || '—', { t: x.validade || '—', cls: 'cen' }, r === 'SEM_CRESCIMENTO' ? { html: '<span class="ok-txt">Sem crescimento</span>' } : (r === 'CRESCIMENTO' ? { html: '<span class="nok-txt">Com crescimento</span>' } : 'Pendente')];
      }).concat([['Controle positivo (não exposto)', ibs[0].microrganismo || '—', cp.lote || '—', { t: cp.validade || '—', cls: 'cen' }, BaixaTempDoc_rotuloIndicador_(cp.resultado)]])));
      b.push('<p class="nota">Incubação: ' + esc(inc.horas ? f(BaixaTempMotor_num_(inc.horas), 0, 'h') : '—') + (inc.temperatura ? ' a ' + esc(f(BaixaTempMotor_num_(inc.temperatura), 1, '°C')) : '') + ', conforme as instruções do fabricante do indicador.</p>');
    }
    b.push(tab('Resultado dos critérios — ' + a.rotulo));
    b.push(SGO_DocA4_tabela_([{ t: 'Código', cls: 'cen' }, { t: 'Critério' }, { t: 'Obtido' }, { t: 'Situação' }], a.criterios.map(function (x) { return [{ t: x.codigo, cls: 'cen' }, x.titulo, x.obtido, BaixaTempDoc_situacao_(x.conforme)]; })));
    b.push('<p class="nota"><b>Resultado do ciclo:</b> ' + (a.resultado === 'CONFORME' ? '<span class="ok-txt">Conforme</span>' : '<span class="nok-txt">Não conforme</span>') + '</p>');
    return b.join('');
  }
  function critEtapa(e) { return av.criteriosEnsaio.filter(function (c) { return c.etapa === e; }); }

  // 7. QI
  if (av.etapas.indexOf('QI') >= 0) {
    h.push(h2('Qualificação de instalação (QI)'));
    var resp = {}; ((dados.qi || {}).itens || []).forEach(function (x) { resp[x.codigo] = x; });
    h.push(tab('Verificações de instalação'));
    h.push(SGO_DocA4_tabela_([{ t: 'Verificação' }, { t: 'Resposta', cls: 'cen' }, { t: 'Observação' }], tipo.checklistQI.map(function (m) {
      var x = resp[m[0]] || {}, v = String(x.resposta || '').toUpperCase();
      return [m[1], v === 'NAO' ? { html: '<span class="nok-txt">Não</span>', cls: 'cen' } : { t: BaixaTempDoc_rotuloResposta_(v), cls: 'cen' }, x.observacao || '—'];
    })));
    h.push(h3('Análise') + SGO_DocA4_paragrafos_(textos.analiseQI));
  }
  // 8. QO
  if (av.etapas.indexOf('QO') >= 0) {
    h.push(h2('Qualificação de operação (QO)'));
    var respO = {}; ((dados.qo || {}).itens || []).forEach(function (x) { respO[x.codigo] = x; });
    h.push(h3('Verificações funcionais'));
    h.push(SGO_DocA4_tabela_([{ t: 'Verificação' }, { t: 'Resposta', cls: 'cen' }, { t: 'Observação' }], tipo.checklistQO.map(function (m) {
      var x = respO[m[0]] || {}, v = String(x.resposta || '').toUpperCase();
      return [m[1], v === 'NAO' ? { html: '<span class="nok-txt">Não</span>', cls: 'cen' } : { t: BaixaTempDoc_rotuloResposta_(v), cls: 'cen' }, x.observacao || '—'];
    })));
    var est = critEtapa('QO').filter(function (c) { return c.chave === 'ESTANQUEIDADE'; })[0];
    if (est) {
      h.push(h3('Estanqueidade da câmara'));
      h.push(SGO_DocA4_tabela_([{ t: 'Obtido' }, { t: 'Situação' }], [[est.obtido, BaixaTempDoc_situacao_(est.conforme)]]));
    }
    av.ciclos.filter(function (a) { return a.etapa === 'QO'; }).forEach(function (a) { h.push(blocoCiclo(a)); });
    h.push(h3('Análise') + SGO_DocA4_paragrafos_(textos.analiseQO));
  }
  // 9. QD
  if (av.etapas.indexOf('QD') >= 0) {
    h.push(h2('Qualificação de desempenho (QD)'));
    av.ciclos.filter(function (a) { return a.etapa === 'QD'; }).forEach(function (a) { h.push(blocoCiclo(a)); });
    h.push(h3('Análise') + SGO_DocA4_paragrafos_(textos.analiseQD));
  }

  // 10. Consolidação
  h.push(h2('Consolidação dos resultados'));
  h.push(tab('Situação de cada critério por etapa e ciclo'));
  var linhasCons = av.criteriosEnsaio.map(function (c) { return [c.etapa, { t: c.codigo, cls: 'cen' }, c.titulo, c.obtido, BaixaTempDoc_situacao_(c.conforme)]; });
  av.ciclos.forEach(function (a) { linhasCons.push([a.rotulo, { t: '—', cls: 'cen' }, 'Resultado do ciclo', String(a.criterios.filter(function (c) { return c.conforme === false; }).length) + ' critério(s) não atendido(s)', BaixaTempDoc_situacao_(a.resultado === 'CONFORME')]); });
  h.push(SGO_DocA4_tabela_([{ t: 'Etapa ou ciclo' }, { t: 'Código', cls: 'cen' }, { t: 'Item' }, { t: 'Obtido' }, { t: 'Situação' }], linhasCons, { classe: 'compacta' }));

  // 11. Incertezas
  h.push(h2('Incertezas de medição e regra de decisão'));
  var inc = av.incertezas || {};
  var linhasInc = [];
  if (inc.temperatura) linhasInc.push(['Temperatura', inc.temperatura.tag || '—', f(inc.temperatura.Ucert, 2, '°C') + ' (k = ' + SGO_DocA4_num_(inc.temperatura.kCert, 2) + ')', f(inc.temperatura.resolucao, 2, '°C'), f(inc.temperatura.U, 2, '°C')]);
  if (inc.pressao) linhasInc.push(['Pressão', inc.pressao.tag || '—', f(inc.pressao.Ucert, 2, 'mbar') + ' (k = ' + SGO_DocA4_num_(inc.pressao.kCert, 2) + ')', f(inc.pressao.resolucao, 2, 'mbar'), f(inc.pressao.U, 2, 'mbar')]);
  if (inc.tempo && inc.tempo.intervaloS) linhasInc.push(['Tempo de exposição', 'Intervalo entre leituras', '—', f(inc.tempo.intervaloS, 0, 's'), f(inc.tempo.Umin, 2, 'min')]);
  h.push(tab('Incerteza expandida (k = 2) das grandezas usadas nos critérios'));
  h.push(SGO_DocA4_tabela_([{ t: 'Grandeza' }, { t: 'Origem' }, { t: 'U do certificado', cls: 'num' }, { t: 'Resolução', cls: 'num' }, { t: 'U expandida', cls: 'num' }], linhasInc));
  h.push('<p>A incerteza padrão combina a incerteza do certificado de calibração (U dividido pelo fator de abrangência do certificado) com a resolução do registrador, tratada como distribuição retangular (resolução dividida por duas vezes a raiz de três); a incerteza expandida usa fator de abrangência k = 2, conforme o JCGM 100:2008. Para o tempo de exposição, cada limite da janela é conhecido com resolução igual ao intervalo entre leituras, e os dois limites são combinados. ' +
    (av.regraDecisao === 'BANDA_GUARDA' ? 'Regra de decisão: os limites de aceitação foram reduzidos pela incerteza expandida (aceitação protegida).' : 'Regra de decisão: aceitação simples — o valor medido é comparado diretamente com o limite e a incerteza é declarada, sem reduzir o limite.') + '</p>');

  // 12. Não conformidades e observações
  h.push(h2('Não conformidades e observações'));
  h.push(h3('Não conformidades') + (av.naoConformidades.length ? SGO_DocA4_lista_(av.naoConformidades) : '<p>Nenhuma não conformidade foi registrada.</p>'));
  var obs = (av.avisos || []).slice();
  (dados.ciclos || []).forEach(function (c) { if (String(c.observacoes || '').trim()) obs.push(BaixaTempMotor_rotuloCiclo_(c) + ': ' + c.observacoes); });
  if (String(dados.observacoes || '').trim()) obs.push(dados.observacoes);
  h.push(h3('Observações') + (obs.length ? SGO_DocA4_lista_(obs) : '<p>Sem observações adicionais.</p>'));

  // 13. Conclusão
  h.push(h2('Conclusão'));
  h.push(SGO_DocA4_paragrafos_(textos.conclusaoTecnica));
  h.push(h3('Em linguagem de fácil compreensão') + '<div class="leigo">' + SGO_DocA4_paragrafos_(textos.conclusaoLeigo) + '</div>');

  // 14. Responsabilidades e assinaturas
  h.push('<div class="manter">' + h2('Responsabilidades e assinaturas'));
  h.push('<p>Os resultados referem-se exclusivamente ao equipamento, ao programa e às cargas aqui identificados. A requalificação é recomendada após manutenção corretiva relevante, mudança de local, alteração do programa ou da carga, ou no prazo definido pelo plano de qualificação do cliente. Este relatório foi revisado e aprovado pelo responsável técnico antes da emissão, conforme o registro do Anexo A. A reprodução parcial depende de autorização da empresa executante.</p>');
  var ass = [];
  if (o.elaborador && o.elaborador.nome) ass.push({ papel: 'Elaborado por', nome: o.elaborador.nome, cargo: 'Técnico executor do ensaio' });
  if (o.aprovacao && o.aprovacao.nome) ass.push({ papel: 'Revisado e aprovado por', nome: o.aprovacao.nome, cargo: o.aprovacao.cargo || 'Responsável técnico', registro: o.aprovacao.registro || '', imagemSvg: o.aprovacao.imagemSvg || '' });
  h.push(SGO_DocA4_assinaturas_(ass) + '</div>');

  // Anexos
  h.push('<h2 class="quebra">Anexo A — Registro de revisão e aprovação</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Quando' }, { t: 'Ação' }, { t: 'Responsável' }, { t: 'Detalhe' }], (o.historico || []).map(function (x) { return [x.quando || '—', x.acao || '—', x.usuario || '—', x.detalhe || '—']; })));
  if (o.aprovacao && o.aprovacao.parecer) h.push('<p><b>Parecer do responsável técnico:</b> ' + esc(o.aprovacao.parecer) + '</p>');
  if (o.assinaturaDados) h.push('<p class="nota">Impressão digital dos dados aprovados (SHA-256): ' + esc(o.assinaturaDados) + '</p>');
  h.push('<h2>Anexo B — Arquivos de dados utilizados</h2>');
  var linhasArq = [];
  (dados.ciclos || []).forEach(function (c) {
    (c.arquivos || []).forEach(function (arq) { linhasArq.push([BaixaTempMotor_rotuloCiclo_(c), arq.nome || '—', arq.leituras ? String(arq.leituras) : '—']); });
  });
  h.push(linhasArq.length ? SGO_DocA4_tabela_([{ t: 'Ciclo' }, { t: 'Arquivo' }, { t: 'Leituras', cls: 'num' }], linhasArq) : '<p>Nenhum arquivo de dados (somente qualificação de instalação).</p>');
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}
