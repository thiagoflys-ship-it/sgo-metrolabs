/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — REDAÇÃO DAS ANÁLISES E CONCLUSÕES
 *
 * A IA recebe SÓ os resultados já calculados pelo motor (sem nome de cliente,
 * sem fabricante, sem leituras brutas) e redige as análises e as conclusões.
 * Cada seção passa pelo verificador comum (SGO_QualIA_Verificador.js):
 * número fora dos resultados, norma fora da lista, veredito diferente do motor,
 * fabricante citado ou texto de "IA" → a seção é descartada e entra o texto
 * padrão. Raciocínio do modelo ligado (SGO_DocA4_chamarGemini_), temperatura baixa.
 * Sem chave de IA, o módulo funciona do mesmo jeito com o texto padrão.
 ****************************************************/

var BAIXATEMP_IA_SECOES = [
  { chave: 'analiseQI', marcador: 'ANALISE_QI', etapa: 'QI', titulo: 'Análise da qualificação de instalação' },
  { chave: 'analiseQO', marcador: 'ANALISE_QO', etapa: 'QO', titulo: 'Análise da qualificação de operação' },
  { chave: 'analiseQD', marcador: 'ANALISE_QD', etapa: 'QD', titulo: 'Análise da qualificação de desempenho' },
  { chave: 'conclusaoTecnica', marcador: 'CONCLUSAO_TECNICA', titulo: 'Conclusão técnica' },
  { chave: 'conclusaoLeigo', marcador: 'CONCLUSAO_LEIGO', titulo: 'Conclusão em linguagem de fácil compreensão' }
];

function BaixaTempIA_f_(v, casas, u) { return BaixaTempMotor_fmt_(v, casas, u); }

function BaixaTempIA_situacao_(c) { return c === true ? 'atendido' : (c === false ? 'NÃO atendido' : 'informativo (sem limite declarado)'); }

/** Contexto enviado à IA: só resultados, em texto pt-BR. */
function BaixaTempIA_contexto_(dados, av) {
  var tipo = BaixaTemp_tipoCfg_(dados.tipo), P = BaixaTempMotor_parametros_(dados.programa);
  var inc = av.incertezas || {};
  return {
    processo: tipo.rotuloLongo,
    etapasExecutadas: av.etapas.map(function (e) { return { QI: 'qualificação de instalação (QI)', QO: 'qualificação de operação (QO)', QD: 'qualificação de desempenho (QD)' }[e]; }),
    resultadoCalculadoPeloMotor: av.resultado === 'CONFORME' ? 'CONFORME' : 'NÃO CONFORME',
    cicloProgramado: {
      temperatura: BaixaTempIA_f_(P.temperaturaProgramada, 2, '°C'),
      faixaDeAceitacao: P.temperaturaProgramada !== null && P.tolInf !== null && P.tolSup !== null ? BaixaTempIA_f_(P.temperaturaProgramada - P.tolInf, 1, '°C') + ' a ' + BaixaTempIA_f_(P.temperaturaProgramada + P.tolSup, 1, '°C') : '—',
      tempoDeExposicao: BaixaTempIA_f_(P.tempoExposicaoMin, 2, 'min'),
      pulsos: P.pulsosProgramados === null ? 'não declarado' : String(P.pulsosProgramados),
      pressaoDeVacuo: P.pressaoVacuoMbar === null ? 'não declarada' : BaixaTempIA_f_(P.pressaoVacuoMbar + (P.tolVacuoMbar || 0), 2, 'mbar'),
      uniformidadeMaxima: P.uniformidadeMax === null ? 'não declarada' : BaixaTempIA_f_(P.uniformidadeMax, 2, '°C'),
      origemDosParametros: 'especificação do ciclo declarada pelo fabricante do equipamento'
    },
    criteriosGerais: (av.criteriosEnsaio || []).map(function (c) { return { criterio: c.codigo + ' ' + c.titulo, requisito: c.requisito, obtido: c.obtido, situacao: BaixaTempIA_situacao_(c.conforme), fonte: c.fonte }; }),
    ciclos: (av.ciclos || []).map(function (a) {
      var t = a.temperatura || {};
      return {
        ciclo: a.rotulo, etapa: a.etapa, resultadoDoCiclo: a.resultado === 'CONFORME' ? 'CONFORME' : 'NÃO CONFORME',
        janelaDeExposicao: a.janela ? a.janela.inicioTxt + ' a ' + a.janela.fimTxt + ' (' + BaixaTempIA_f_(a.janela.duracaoMin, 2, 'min') + ')' : '—',
        sensoresAtivos: String((a.sensores || []).filter(function (s) { return s.ativo; }).length),
        temperaturaNaCarga: t.carga ? 'mínima ' + BaixaTempIA_f_(t.carga.min, 2, '°C') + ', média ' + BaixaTempIA_f_(t.carga.media, 2, '°C') + ', máxima ' + BaixaTempIA_f_(t.carga.max, 2, '°C') : 'sem sensor na carga',
        temperaturaNaCamara: t.camara ? 'mínima ' + BaixaTempIA_f_(t.camara.min, 2, '°C') + ', média ' + BaixaTempIA_f_(t.camara.media, 2, '°C') + ', máxima ' + BaixaTempIA_f_(t.camara.max, 2, '°C') : 'sem sensor na câmara',
        maiorDiferencaEntreSensores: t.uniformidade && t.uniformidade.valor !== null ? BaixaTempIA_f_(t.uniformidade.valor, 2, '°C') : '—',
        pressao: a.pressao ? 'mínima do ciclo ' + BaixaTempIA_f_(a.pressao.minCiclo, 2, 'mbar') + '; ' + a.pressao.pulsosJanela + ' pulso(s) na exposição' : 'sem registro de pressão',
        criterios: a.criterios.map(function (c) { return { criterio: c.codigo + ' ' + c.titulo, requisito: c.requisito, obtido: c.obtido, situacao: BaixaTempIA_situacao_(c.conforme) }; })
      };
    }),
    incertezas: {
      temperatura: inc.temperatura ? BaixaTempIA_f_(inc.temperatura.U, 2, '°C') + ' (k = 2)' : 'não aplicável',
      tempoDeExposicao: inc.tempo ? BaixaTempIA_f_(inc.tempo.Umin, 2, 'min') + ' (k = 2)' : 'não aplicável',
      regraDeDecisao: av.regraDecisao === 'BANDA_GUARDA' ? 'limites reduzidos pela incerteza expandida' : 'aceitação simples (a incerteza é declarada e não reduz o limite)'
    },
    naoConformidades: av.naoConformidades || [],
    normasPermitidas: BaixaTemp_normasDoTipo_(dados.tipo).map(function (n) { return n.codigo + ' — ' + n.titulo; })
  };
}

function BaixaTempIA_prompt_(ctx, secoes, problemasAnteriores) {
  var r = [];
  r.push('Você é engenheiro sênior de validação de processos de esterilização a baixa temperatura em centrais de material e esterilização, com prática em qualificação de instalação, operação e desempenho e em metrologia. Redija as seções narrativas de um relatório de qualificação a partir dos resultados abaixo. Pense com cuidado antes de escrever e confira cada número com o contexto.');
  r.push(SGO_DocA4_regrasRedacaoIA_());
  r.push('- O resultado (CONFORME ou NÃO CONFORME) já foi decidido pelo cálculo e está em "resultadoCalculadoPeloMotor". Não reavalie, não suavize e não contradiga esse resultado nem o resultado de cada ciclo.');
  r.push('- Critério "informativo" não aprova nem reprova: diga que é informativo.');
  r.push('- Não atribua causa a nenhuma não conformidade: registre o fato e diga que a causa deve ser investigada pelo responsável técnico antes de nova qualificação.');
  r.push('- Cite normas somente da lista "normasPermitidas", com o código exatamente como escrito. Não cite cláusulas, itens ou valores de norma.');
  r.push('- Não use nomes de cliente, pessoas, marcas ou modelos (eles não estão no contexto e não devem aparecer).');
  r.push('- A CONCLUSÃO TÉCNICA termina com a frase exata "Resultado da qualificação: ' + ctx.resultadoCalculadoPeloMotor + '."');
  r.push('- A CONCLUSÃO EM LINGUAGEM DE FÁCIL COMPREENSÃO comunica o mesmo resultado para quem não é da área (enfermagem, administração), com tom respeitoso, sem jargão sem explicação, em 1 a 2 parágrafos.');
  r.push('- Cada análise de etapa: 2 a 4 parágrafos, citando requisito e valor obtido dos critérios dessa etapa.');
  if (problemasAnteriores && problemasAnteriores.length) r.push('ATENÇÃO: a versão anterior foi recusada pela conferência automática por: ' + problemasAnteriores.join('; ') + '. Corrija sem repetir esses problemas.');
  r.push('CONTEXTO (única fonte de fatos):\n' + JSON.stringify(ctx, null, 1));
  r.push('FORMATO DA RESPOSTA: escreva cada seção depois do seu marcador, na ordem, e termine com ###FIM###. Marcadores: ' + secoes.map(function (s) { return '###' + s.marcador + '###'; }).join(' ') + ' ###FIM###');
  return r.join('\n');
}

function BaixaTempIA_extrair_(texto, secoes) {
  var t = String(texto || ''), saida = {};
  secoes.forEach(function (s, i) {
    var a = t.indexOf('###' + s.marcador + '###');
    if (a < 0) return;
    a += s.marcador.length + 6;
    var b = t.length;
    secoes.slice(i + 1).concat([{ marcador: 'FIM' }]).forEach(function (o) { var p = t.indexOf('###' + o.marcador + '###', a); if (p >= 0 && p < b) b = p; });
    saida[s.chave] = SGO_DocA4_limparTextoIA_(t.substring(a, b));
  });
  return saida;
}

/** Regras do verificador para este ensaio. */
function BaixaTempIA_regras_(dados, av, ctx, nomesProibidos) {
  return {
    contexto: ctx,
    normas: BaixaTemp_normasDoTipo_(dados.tipo).map(function (n) { return n.codigo; }),
    veredito: av.resultado,
    nomesProibidos: nomesProibidos || []
  };
}

/**
 * Textos das análises e conclusões. Nunca lança.
 * Devolve { textos, origem: 'IA'|'PADRAO'|'MISTO', aviso, problemas:[...] }.
 */
function BaixaTempIA_redigir_(dados, av, nomesProibidos) {
  var padrao = BaixaTempIA_textoPadrao_(dados, av);
  if (!av || !av.resultado) return { textos: padrao, origem: 'PADRAO', aviso: 'O resultado ainda não pode ser calculado (há pendências); os textos ficam no padrão até as pendências serem resolvidas.', problemas: [] };
  var secoes = BAIXATEMP_IA_SECOES.filter(function (s) { return !s.etapa || av.etapas.indexOf(s.etapa) >= 0; });
  var ctx = BaixaTempIA_contexto_(dados, av), regras = BaixaTempIA_regras_(dados, av, ctx, nomesProibidos);
  var problemas = [], aceitos = {}, motivoFalha = '';
  for (var tent = 0; tent < BAIXATEMP_CFG.IA.TENTATIVAS; tent++) {
    var faltam = secoes.filter(function (s) { return !aceitos[s.chave]; });
    if (!faltam.length) break;
    var bruto;
    try { bruto = SGO_DocA4_chamarGemini_(BaixaTempIA_prompt_(ctx, faltam, problemas), { tokens: BAIXATEMP_CFG.IA.TOKENS, temperatura: BAIXATEMP_CFG.IA.TEMPERATURA }); }
    catch (e) { motivoFalha = String(e && e.message ? e.message : e).replace(/[.\s]+$/, ''); break; }
    var partes = BaixaTempIA_extrair_(bruto, faltam);
    problemas = [];
    faltam.forEach(function (s) {
      var txt = partes[s.chave];
      if (!txt) { problemas.push(s.titulo + ': seção não veio na resposta'); return; }
      var v = QualIA_verificar_(txt, Object.assign({}, regras, { exigirVeredito: s.chave === 'conclusaoTecnica', vereditoGlobal: !s.etapa }));
      if (v.ok) aceitos[s.chave] = txt;
      else v.problemas.forEach(function (p) { problemas.push(s.titulo + ': ' + p); });
    });
  }
  var textos = {}, nIA = 0;
  secoes.forEach(function (s) { if (aceitos[s.chave]) { textos[s.chave] = aceitos[s.chave]; nIA++; } else textos[s.chave] = padrao[s.chave]; });
  var origem = nIA === secoes.length ? 'IA' : (nIA ? 'MISTO' : 'PADRAO');
  var aviso = '';
  if (motivoFalha && !nIA) aviso = 'A redação automática não está disponível (' + motivoFalha + '). Os textos abaixo são o texto padrão, montado a partir dos resultados calculados; revise e complete se precisar.';
  else if (origem !== 'IA') aviso = 'Parte da redação automática foi descartada pela conferência (' + problemas.slice(0, 4).join('; ') + '). Essas seções saíram com o texto padrão, montado a partir dos resultados calculados.';
  return { textos: textos, origem: origem, aviso: aviso, problemas: problemas };
}

/* ============================================================ texto padrão (determinístico) */

function BaixaTempIA_textoPadrao_(dados, av) {
  av = av || { etapas: [], ciclos: [], criteriosEnsaio: [] };
  var tipo = BaixaTemp_tipoCfg_(dados.tipo), P = BaixaTempMotor_parametros_(dados.programa), f = BaixaTempIA_f_;
  var porEtapa = function (e) { return (av.criteriosEnsaio || []).filter(function (c) { return c.etapa === e; }); };
  var ciclosDe = function (e) { return (av.ciclos || []).filter(function (a) { return a.etapa === e; }); };
  var minus = function (s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); };
  var txtCriterios = function (lista) {
    return lista.map(function (c) { return 'No critério "' + c.titulo + '", o requisito é: ' + minus(c.requisito) + '; o resultado obtido foi ' + minus(c.obtido) + ' (' + BaixaTempIA_situacao_(c.conforme) + ').'; }).join(' ');
  };
  var faixa = function (lista, un, casas) {
    var v = lista.filter(function (x) { return x !== null && x !== undefined && isFinite(x); });
    if (!v.length) return '—';
    var a = Math.min.apply(null, v), b = Math.max.apply(null, v), c = casas === undefined ? 2 : casas;
    return a === b ? f(a, c, un) : f(a, c, un) + ' a ' + f(b, c, un);
  };
  var resumoCiclos = function (lista) {
    if (!lista.length) return '';
    var p = [];
    var tc = lista.map(function (a) { return a.temperatura && a.temperatura.carga; }).filter(Boolean);
    var tm = lista.map(function (a) { return a.temperatura && a.temperatura.camara; }).filter(Boolean);
    p.push('Nos ' + lista.length + ' ciclo(s), a exposição durou ' + faixa(lista.map(function (a) { return a.janela ? a.janela.duracaoMin : null; }), 'min') + '.');
    if (tc.length) p.push('Na carga, as temperaturas mínimas ficaram em ' + faixa(tc.map(function (x) { return x.min; }), '°C') + ' e as máximas em ' + faixa(tc.map(function (x) { return x.max; }), '°C') + '.');
    if (tm.length) p.push('Na câmara, as mínimas ficaram em ' + faixa(tm.map(function (x) { return x.min; }), '°C') + ' e as máximas em ' + faixa(tm.map(function (x) { return x.max; }), '°C') + '.');
    var un = lista.map(function (a) { return a.temperatura && a.temperatura.uniformidade ? a.temperatura.uniformidade.valor : null; });
    if (un.some(function (x) { return x !== null; })) p.push('A maior diferença entre sensores no mesmo instante ficou em ' + faixa(un, '°C') + '.');
    var pr = lista.filter(function (a) { return a.pressao; });
    if (pr.length) p.push('A pressão mínima do ciclo ficou em ' + faixa(pr.map(function (a) { return a.pressao.minCiclo; }), 'mbar') + ', com ' + faixa(pr.map(function (a) { return a.pressao.pulsosJanela; }), '', 0) + ' pulso(s) de injeção na exposição.');
    var nok = lista.filter(function (a) { return a.resultado !== 'CONFORME'; });
    if (!nok.length) p.push('Todos os critérios avaliados foram atendidos em todos os ciclos.');
    else nok.forEach(function (a) { p.push('\n\nNo ' + a.rotulo + ', não atenderam ao requisito: ' + a.criterios.filter(function (c) { return c.conforme === false; }).map(function (c) { return minus(c.titulo) + ' (obtido ' + minus(c.obtido) + '; requisito: ' + minus(c.requisito) + ')'; }).join('; ') + '. A causa deve ser investigada pelo responsável técnico.'); });
    p.push('\n\nResultado por ciclo: ' + lista.map(function (a) { return a.rotulo + ', ' + (a.resultado === 'CONFORME' ? 'CONFORME' : 'NÃO CONFORME'); }).join('; ') + '.');
    return p.join(' ').replace(/ \n\n/g, '\n\n');
  };
  var t = {};
  if (av.etapas.indexOf('QI') >= 0) {
    t.analiseQI = 'A qualificação de instalação verificou os requisitos de instalação do esterilizador definidos pelo fabricante do equipamento e pela lista de verificação do laboratório. ' + txtCriterios(porEtapa('QI'));
  }
  if (av.etapas.indexOf('QO') >= 0) {
    t.analiseQO = 'A qualificação de operação verificou as funções do equipamento e a execução do ciclo com a câmara vazia, comparando os valores medidos com a especificação do ciclo declarada pelo fabricante. ' + txtCriterios(porEtapa('QO')) +
      '\n\n' + resumoCiclos(ciclosDe('QO'));
  }
  if (av.etapas.indexOf('QD') >= 0) {
    var qd = ciclosDe('QD');
    t.analiseQD = 'A qualificação de desempenho avaliou ' + qd.length + ' ciclo(s) com carga, com sensores de temperatura na carga e indicadores químicos e biológicos posicionados nos pontos definidos no plano de validação. ' +
      'A faixa de aceitação de temperatura na exposição é de ' + (P.temperaturaProgramada !== null && P.tolInf !== null && P.tolSup !== null ? f(P.temperaturaProgramada - P.tolInf, 1, '°C') + ' a ' + f(P.temperaturaProgramada + P.tolSup, 1, '°C') : '—') + ' e o tempo mínimo de exposição é de ' + f(P.tempoExposicaoMin, 2, 'min') + '.' +
      '\n\n' + resumoCiclos(qd) + (porEtapa('QD').length ? '\n\n' + txtCriterios(porEtapa('QD')) : '');
  }
  if (!av.resultado) {
    t.conclusaoTecnica = 'O resultado da qualificação será declarado depois que as pendências listadas na tela forem resolvidas.';
    t.conclusaoLeigo = t.conclusaoTecnica;
    return t;
  }
  var conforme = av.resultado === 'CONFORME';
  var rotuloRes = conforme ? 'CONFORME' : 'NÃO CONFORME';
  var etapasNomes = av.etapas.map(function (e) { return { QI: 'instalação', QO: 'operação', QD: 'desempenho' }[e]; });
  var etapasTxt = etapasNomes.length <= 1 ? (etapasNomes[0] || '') : etapasNomes.slice(0, -1).join(', ') + ' e ' + etapasNomes[etapasNomes.length - 1];
  t.conclusaoTecnica = 'Foram executadas as etapas de qualificação de ' + (etapasTxt || '—') + ' do ' + tipo.rotuloFrase + ', com os critérios de aceitação e as fontes indicados neste relatório. ' +
    (conforme ? 'Todos os critérios avaliados foram atendidos em todas as etapas e ciclos.' : 'Os critérios não atendidos estão listados na seção de não conformidades; a causa deve ser investigada pelo responsável técnico e as etapas afetadas devem ser repetidas após a correção.') +
    (av.incertezas && av.incertezas.temperatura ? ' A incerteza expandida da medição de temperatura é de ' + f(av.incertezas.temperatura.U, 2, '°C') + ' (k = 2).' : '') +
    '\n\nResultado da qualificação: ' + rotuloRes + '.';
  t.conclusaoLeigo = conforme
    ? 'O esterilizador foi testado nas condições de uso previstas. As temperaturas, os tempos e os indicadores colocados junto ao material mostraram que o ciclo programado foi cumprido como o fabricante especifica. Por isso, o resultado desta qualificação é conforme. O equipamento deve continuar com a manutenção e os testes de rotina e ser qualificado de novo no prazo definido ou após manutenção relevante.'
    : 'O esterilizador foi testado nas condições de uso previstas e pelo menos um dos requisitos verificados não foi cumprido, conforme a lista de não conformidades deste relatório. Por isso, o resultado desta qualificação é não conforme. A equipe técnica deve investigar a causa, corrigir e repetir os ensaios antes de considerar o processo qualificado.';
  return t;
}

/**
 * Conferência dos textos finais (depois da revisão humana), na emissão.
 * Veredito diferente, veredito intermediário, norma fora da lista e fabricante: trava.
 * Número que não está nos resultados: aviso para o responsável técnico conferir.
 */
function BaixaTempIA_conferirTextosFinais_(textos, dados, av, nomesProibidos) {
  var travas = [], avisos = [];
  var ctx = BaixaTempIA_contexto_(dados, av), regras = BaixaTempIA_regras_(dados, av, ctx, nomesProibidos);
  BAIXATEMP_IA_SECOES.forEach(function (s) {
    if (s.etapa && av.etapas.indexOf(s.etapa) < 0) return;
    var txt = String((textos || {})[s.chave] || '').trim();
    if (!txt) { travas.push('A seção "' + s.titulo + '" está vazia. Em 7. Textos, escreva o texto ou toque em "Redigir textos" e revise.'); return; }
    var v = QualIA_verificar_(txt, Object.assign({}, regras, { exigirVeredito: s.chave === 'conclusaoTecnica', vereditoGlobal: !s.etapa }));
    v.problemas.forEach(function (p) {
      if (/^números/.test(p)) avisos.push(s.titulo + ': ' + p + '. Confira se esses números estão certos antes de aprovar.');
      else travas.push('A seção "' + s.titulo + '" não pode ser emitida: ' + p + '. Corrija o texto em 7. Textos (o resultado do ensaio é calculado pelo sistema e o texto precisa dizer o mesmo).');
    });
  });
  return { travas: travas, avisos: avisos };
}
