/****************************************************
 * Autoclave a vapor — documento A4 do RELATÓRIO DE QUALIFICAÇÃO (modelo oficial novo, 20/10/2026).
 *
 * Monta o HTML (retrato, padrão SGO_DocA4: capa, sumário, cabeçalho e rodapé corridos, texto
 * justificado) a partir do contexto de SGO_AutoRel_ModeloOficialNovo.js. Só apresenta: resultado,
 * critérios e números vêm do contexto; o texto fixo foi redigido para não repetir o que as tabelas
 * já mostram, sem citar cláusula de norma nem fabricante, e sem tratar de pressão quando nenhum
 * ciclo a analisou.
 *
 * AutoOficialDoc_montar_(o) → HTML. o: { ctx, textos:{conclusao, conclusaoSimples}, numero, revisao,
 *   aprovacao:{nome, perfil, em}|null, minuta, enviadoPor, motivoRevisao, historico:[...], assinaturas:[...], emitidoEm }
 ****************************************************/

function AutoOficialDoc_esc_(s) { return SGO_DocA4_esc_(s); }
function AutoOficialDoc_p_(t) { return '<p>' + SGO_DocA4_esc_(t) + '</p>'; }
function AutoOficialDoc_lista_(itens) { return SGO_DocA4_lista_(itens); }

function AutoOficialDoc_etapasLista_(et) {
  var l = [];
  if (et.QI) l.push('qualificação de instalação (QI)');
  if (et.QO) l.push('qualificação de operação (QO)');
  if (et.QD) l.push('qualificação de desempenho (QD)');
  return l;
}

/** Quantidade por extenso até dez ("dois ciclos"), em algarismos acima disso. */
function AutoOficialDoc_qtd_(n, um, varios, fem) {
  var m = fem ? ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'] : ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
  return (n <= 10 ? m[n] : String(n)) + ' ' + (n === 1 ? um : varios);
}

function AutoOficialDoc_juntar_(l) { return l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }

function AutoOficialDoc_rotuloEnsaio_(c) {
  var r = c.resumo || {};
  if (r.tipoRelatorio === 'LEAK_TEST') return 'Teste de estanqueidade';
  var t = (r.identificacao || {}).tipoEnsaio;
  return typeof AutoRel_acTextoTipoEnsaio_ === 'function' ? AutoRel_acTextoTipoEnsaio_(t) : (t || '—');
}

function AutoOficialDoc_montar_(o) {
  var ctx = o.ctx, id = ctx.identificacao, et = ctx.etapas, esc = AutoOficialDoc_esc_, P = AutoOficialDoc_p_;
  var empresa = id.empresaExecutante || {};
  var ciclos = ctx.ciclos || [];
  var termicos = ciclos.filter(function (c) { return c.resumo.tipoRelatorio !== 'LEAK_TEST'; });
  var leaks = ciclos.filter(function (c) { return c.resumo.tipoRelatorio === 'LEAK_TEST'; });
  var comPressao = ctx.comPressao;
  var etapas = AutoOficialDoc_etapasLista_(et);
  var status = ctx.statusConsolidado;
  var periodo = ctx.inicio ? (ctx.inicio === ctx.fim ? ctx.inicio : ctx.inicio + ' a ' + ctx.fim) : '—';
  var n = 0, tab = 0;
  function sec(titulo) { n++; return '<h2>' + n + '. ' + esc(titulo) + '</h2>'; }
  function sub(k, titulo) { return '<h3>' + n + '.' + k + ' ' + esc(titulo) + '</h3>'; }
  function legenda(t) { tab++; return SGO_DocA4_legendaTabela_(tab, t); }

  var h = SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de qualificação de autoclave a vapor',
    subtitulo: AutoOficialDoc_juntar_(etapas).replace(/^./, function (c) { return c.toUpperCase(); }),
    tituloCurto: 'Relatório de qualificação — autoclave a vapor',
    rotuloNumero: 'Relatório nº', numero: o.numero, revisao: o.revisao,
    empresa: empresa,
    simulado: !!o.minuta,
    avisoSimulado: 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO. Sem validade e sem aprovação: não deve ser entregue ao cliente.',
    capa: {
      tipo: 'Qualificação térmica e validação de processo',
      linhas: [
        ['Cliente', id.cliente], ['Unidade', id.unidade + (id.setor ? ' — ' + id.setor : '')],
        ['Equipamento', [id.tipo, id.tag ? 'TAG ' + id.tag : '', id.numeroSerie ? 'nº de série ' + id.numeroSerie : ''].filter(Boolean).join(' · ')],
        ['Período dos ensaios', periodo], ['Emissão', o.minuta ? 'Minuta (não emitido)' : o.emitidoEm]
      ]
    },
    ficha: [['Cliente', id.cliente], ['CNPJ', id.cnpj], ['Equipamento', (id.tag || '—') + ' · ' + id.tipo], ['Período dos ensaios', periodo],
      ['Motivo', ctx.motivo], ['Requalificação até', status === 'APROVADO' ? (ctx.validadeAte || '—') : 'Não se aplica (reprovado)']],
    resultado: {
      status: status, rotulo: 'Resultado da qualificação',
      texto: status === 'APROVADO'
        ? 'Todos os critérios de aceitação aplicáveis foram atendidos nos ensaios relacionados neste relatório.'
        : 'Há não conformidade registrada (seção ' + '__SEC_NC__' + '); o equipamento não deve ser liberado nos programas avaliados até nova qualificação aprovada.'
    },
    sumario: true
  });

  // 1. Objetivo
  h += sec('Objetivo');
  h += P('Este relatório registra a ' + AutoOficialDoc_juntar_(etapas) + ' da autoclave a vapor identificada na seção 3, instalada em ' + (id.unidade || 'unidade do contratante') + ', de ' + (id.cliente || 'contratante') + '. ' +
    'A qualificação reúne evidências medidas e rastreáveis de que o equipamento, nas condições de instalação e de uso informadas, reproduz o processo de esterilização por calor úmido dentro dos critérios de aceitação estabelecidos.');
  h += P('O documento serve de base para a liberação do equipamento para uso, para as auditorias internas e externas do serviço de processamento de produtos para saúde e para o planejamento da requalificação.');

  // 2. Escopo e limitações
  h += sec('Escopo e limitações');
  var escopo = [];
  if (ciclos.length) escopo.push('Abrange ' + AutoOficialDoc_juntar_([termicos.length ? AutoOficialDoc_qtd_(termicos.length, 'ciclo instrumentado', 'ciclos instrumentados') : '', leaks.length ? AutoOficialDoc_qtd_(leaks.length, 'teste de estanqueidade', 'testes de estanqueidade') : ''].filter(Boolean)) + ', executados no período de ' + periodo + ' e documentados nos relatórios de ensaio do Anexo A, cada um aprovado pelo responsável técnico antes desta consolidação.');
  if (et.QI) escopo.push('A qualificação de instalação baseia-se na verificação documental e visual registrada na seção de resultados' + (ctx.dataQi ? ', feita em ' + ctx.dataQi : '') + '. Não inclui as inspeções de segurança regulamentares do equipamento nem ensaios de segurança elétrica, que têm regras e responsáveis próprios.');
  escopo.push('Os resultados valem para o equipamento identificado, nos programas e nas configurações de carga ensaiados. Não se estendem a outros programas, a outras cargas nem a outra condição de instalação.');
  if (termicos.length) escopo.push('O ensaio térmico e o F0 não demonstram, isoladamente, a remoção completa do ar da câmara e da carga nem a ausência de gases não condensáveis; essas condições são acompanhadas pelos ensaios e indicadores do controle de rotina do serviço.');
  escopo.push('Os critérios de aceitação foram configurados pela empresa executante a partir das referências indicadas na seção de critérios e são revisáveis pelo responsável técnico. ' + (ctx.regraDecisao || ''));
  if (ctx.indicadores.length) escopo.push('Os resultados de indicadores químicos e biológicos registrados neste relatório foram informados durante os ensaios; a leitura, a incubação e a guarda desses registros seguem os procedimentos do serviço.');
  if (ctx.semPressao.length) {
    if (ctx.semPressao.length === ciclos.length) escopo.push('Este relatório considera somente a temperatura: ' + ctx.semPressao.map(function (s) { return String(s.justificativa || '').replace(/[.\s]+$/, ''); }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join('; ') + '.');
    else escopo.push('Os relatórios de ensaio ' + AutoOficialDoc_juntar_(ctx.semPressao.map(function (s) { return s.numero; })) + ' consideraram somente a temperatura: ' + ctx.semPressao.map(function (s) { return String(s.justificativa || '').replace(/[.\s]+$/, ''); }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join('; ') + '.');
  }
  h += AutoOficialDoc_lista_(escopo);

  // 3. Identificação
  h += sec('Identificação');
  h += sub(1, 'Contratante e local de instalação');
  h += SGO_DocA4_tabelaIdent_([['Razão social', id.cliente], ['CNPJ', id.cnpj], ['Unidade', id.unidade], ['Setor ou local', id.setor],
    ['Endereço', [id.endereco, id.cidadeUf].filter(Boolean).join(' — '), { largo: true }], ['Acompanhamento', id.responsavelCliente || 'Não informado', { largo: true }]]);
  h += sub(2, 'Equipamento');
  h += SGO_DocA4_tabelaIdent_([['Tipo', id.tipo], ['TAG', id.tag], ['Número de série', id.numeroSerie], ['Programas ensaiados', AutoOficialDoc_juntar_(id.programas) || (et.QI && !ciclos.length ? 'Não se aplica' : '—')]]
    .concat(id.patrimonio ? [['Patrimônio', id.patrimonio]] : []).concat(id.capacidade ? [['Capacidade ou volume', id.capacidade]] : []).concat(id.numCamaras ? [['Câmaras ou portas', id.numCamaras]] : []).concat(id.anoFabricacao ? [['Ano de fabricação', id.anoFabricacao]] : []));
  h += '<p class="nota">A identificação vem do cadastro do equipamento no SGO+. Este relatório não registra marca nem modelo comercial: a rastreabilidade do equipamento é feita pela TAG e pelo número de série.</p>';
  h += sub(3, 'Empresa executante e qualificação');
  h += SGO_DocA4_tabelaIdent_([['Empresa', empresa.nome], ['CNPJ', empresa.cnpj], ['Motivo', ctx.motivo], ['Período', periodo],
    ['Etapas', AutoOficialDoc_juntar_(etapas), { largo: true }], ['Técnicos executores', AutoOficialDoc_juntar_(id.tecnicos) || (o.enviadoPor || '—'), { largo: true }]]);

  // 4. Referências normativas
  h += sec('Referências normativas');
  h += P('Foram adotadas as referências abaixo. Cada critério de aceitação indica, na seção correspondente, a referência que o fundamenta.');
  h += AutoOficialDoc_lista_(ctx.normas);

  // 5. Definições
  h += sec('Definições');
  var defs = [
    ['Qualificação de instalação (QI)', 'verificação documentada de que o equipamento e as utilidades que o atendem estão instalados conforme a especificação aplicável.'],
    ['Qualificação de operação (QO)', 'verificação documentada de que o equipamento, em câmara vazia, opera dentro dos limites previstos para os programas ensaiados.'],
    ['Qualificação de desempenho (QD)', 'verificação documentada de que o processo, com a carga de uso, produz resultados que atendem aos critérios de aceitação.'],
    ['Fase de exposição', 'intervalo em que os pontos monitorados permanecem na faixa de temperatura de esterilização do programa.'],
    ['Tempo de equilíbrio', 'intervalo entre o momento em que o ponto de referência da câmara atinge a temperatura de esterilização e o momento em que todos os pontos a atingem.'],
    ['Diferença entre sensores', 'maior diferença de temperatura entre os pontos monitorados num mesmo instante da fase de exposição.'],
    ['F0 (letalidade)', 'tempo equivalente, em minutos a 121,1 °C, do efeito letal acumulado pelo calor úmido, calculado com z = 10 °C.'],
    ['Ponto de menor letalidade', 'sensor com o menor F0 acumulado no ciclo; é o valor usado na decisão sobre o critério de letalidade.'],
    ['Incerteza expandida (U)', 'intervalo associado ao resultado da medição, declarado com fator de abrangência k = 2, para nível de confiança de aproximadamente 95 %.'],
    ['Regra de decisão', 'forma de comparar o valor medido com o limite de aceitação, considerando ou não a incerteza de medição.']
  ];
  if (comPressao) {
    defs.push(['Temperatura do vapor saturado', 'temperatura calculada a partir da pressão absoluta medida na câmara, comparada às temperaturas medidas na fase de exposição.']);
    if (leaks.length) defs.push(['Teste de estanqueidade', 'medição da elevação da pressão na câmara mantida em vácuo e isolada, expressa como taxa de vazamento.']);
  }
  h += '<ul class="lista">' + defs.map(function (d) { return '<li><b>' + esc(d[0]) + ':</b> ' + esc(d[1]) + '</li>'; }).join('') + '</ul>';

  // 6. Responsabilidades
  h += sec('Responsabilidades');
  h += sub(1, 'Empresa executante');
  h += AutoOficialDoc_lista_([
    'Planejar e executar os ensaios conforme a metodologia deste relatório, com pessoal treinado.',
    'Utilizar instrumentos calibrados, com rastreabilidade metrológica demonstrada e certificado válido na data do ensaio.',
    'Registrar as condições de cada ensaio, os dados obtidos e as não conformidades, e manter esses registros.',
    'Emitir este relatório somente após a conferência e a aprovação do responsável técnico, e guardar as revisões anteriores.',
    'Tratar como confidenciais as informações técnicas e institucionais obtidas durante o serviço.'
  ]);
  h += sub(2, 'Contratante');
  h += AutoOficialDoc_lista_([
    'Disponibilizar o equipamento, as utilidades e cargas representativas da rotina, além de pessoal para acompanhar os ensaios.',
    'Informar os programas e as configurações de carga utilizados na rotina do serviço.',
    'Manter o controle de rotina do processo de esterilização, com os indicadores e ensaios previstos em seus procedimentos.',
    'Comunicar à empresa executante as mudanças que exijam requalificação antes do prazo, descritas na seção de recomendações.'
  ]);

  // 7. Metodologia
  h += sec('Metodologia');
  var k = 0;
  if (et.QI) {
    h += sub(++k, 'Qualificação de instalação');
    h += P('Com o equipamento instalado, foram conferidos os itens da lista de verificação apresentada nos resultados: documentação técnica, identificação, local de instalação, utilidades, dispositivos de segurança, indicação e registro do processo e programas disponíveis. Cada item recebe a situação conforme, não conforme ou não aplicável; o item não conforme traz a descrição do que foi encontrado.');
  }
  if (termicos.length) {
    h += sub(++k, 'Ensaios térmicos');
    h += P('Em cada ciclo, sensores de temperatura foram distribuídos ' + (et.QO && et.QD ? 'na câmara vazia, nos ensaios de operação, e na carga, nos ensaios de desempenho, ' : (et.QD ? 'na carga, nos pontos de maior dificuldade de penetração do calor, ' : 'pela câmara vazia, ')) +
      'sem contato com superfícies metálicas, com um sensor junto ao sensor de controle do equipamento sempre que acessível. ' +
      (comPressao ? 'A pressão absoluta da câmara foi registrada pelo mesmo registrador, quando analisada. ' : '') +
      'As leituras foram tomadas durante todo o ciclo, no intervalo indicado no relatório de cada ensaio.');
    h += P('Os dados de cada ciclo foram tratados pelo sistema de cálculo da empresa executante, que identifica a fase de exposição, verifica a qualidade dos dados (leituras fora da faixa física, sensores sem variação, picos isolados, leituras faltando e intervalos irregulares) e impede a emissão do relatório de ensaio quando há dado inválido. Os critérios de cada ciclo foram avaliados nesse relatório e consolidados aqui sem novo arredondamento.');
    h += sub(++k, 'Cálculo da letalidade (F0)');
    h += P('A taxa letal em cada leitura e o F0 acumulado são calculados por:');
    h += '<p class="formula">L = 10<sup>(T − T<sub>ref</sub>) / z</sup> &nbsp;&nbsp;&nbsp; F<sub>0</sub> = Σ ½ (L<sub>i</sub> + L<sub>i+1</sub>) · Δt<sub>i</sub></p>';
    h += P('em que T é a temperatura medida no ponto, em °C; Tref = 121,1 °C; z = 10 °C; e Δt é o intervalo real entre leituras consecutivas, em minutos (regra dos trapézios). O F0 é somado na fase de exposição de cada sensor, e a decisão usa o ponto de menor letalidade. A incerteza do F0 é estimada pela propagação da incerteza do registrador.');
  }
  if (leaks.length && comPressao) {
    h += sub(++k, 'Teste de estanqueidade');
    h += P('A câmara foi evacuada e isolada, e a elevação da pressão foi registrada durante a janela de medição. A taxa de vazamento, em mbar/min, é a variação da pressão dividida pela duração da janela, comparada ao limite configurado.');
  }
  h += sub(++k, 'Regra de decisão');
  h += P((ctx.regraDecisao || 'O valor medido é comparado diretamente ao limite de aceitação.') + ' A qualificação é aprovada quando todos os ciclos e verificações relacionados neste relatório atendem aos critérios; uma única não conformidade reprova a qualificação.');

  // 8. Instrumentos
  if (ctx.instrumentos.length) {
    h += sec('Instrumentos de medição e rastreabilidade');
    h += P('Os instrumentos abaixo foram usados nos ensaios. A rastreabilidade metrológica é demonstrada pelos certificados de calibração indicados, conferidos no cadastro de padrões na data de cada ensaio.');
    h += legenda('Instrumentos utilizados');
    // Sem análise de pressão, a descrição do cadastro (que pode citar o canal de pressão) fica de fora.
    var comDescricao = comPressao;
    h += SGO_DocA4_tabela_([{ t: 'Identificação' }].concat(comDescricao ? [{ t: 'Descrição' }] : []).concat([{ t: 'Certificado' }, { t: 'Validade', cls: 'cen' }, { t: 'U (k = 2)', cls: 'num' }, { t: 'Situação' }]),
      ctx.instrumentos.map(function (it) {
        return [it.tag].concat(comDescricao ? [it.descricao || '—'] : []).concat([it.certificado || '—', { t: it.validade || '—', cls: 'cen' },
          { t: isFinite(it.incertezaU95) && it.incertezaU95 !== null ? SGO_DocA4_val_(it.incertezaU95, 2, '°C') : '—', cls: 'num' },
          it.conforme === true ? { html: '<span class="ok-txt">' + esc(it.situacao) + '</span>' } : (it.conforme === false ? { html: '<span class="nok-txt">' + esc(it.situacao) + '</span>' } : (it.situacao || '—'))]);
      }), { classe: 'compacta' });
  }

  // 9. Critérios de aceitação
  h += sec('Critérios de aceitação');
  // Coluna "Aplicação" só quando há programas com critérios diferentes (por exemplo, 121 °C e 134 °C).
  var aplicacoes = {};
  ctx.criterios.forEach(function (c) { c.aplicacao.forEach(function (a) { aplicacoes[a] = true; }); });
  var variasAplic = Object.keys(aplicacoes).length > 1;
  var crit = ctx.criterios.map(function (c) { var l = [c.criterio, c.requisito, c.referencia]; if (variasAplic) l.push(AutoOficialDoc_juntar_(c.aplicacao)); return l; });
  if (et.QI) crit.push(['Qualificação de instalação', 'Todos os itens aplicáveis da lista de verificação conformes', 'Especificação de instalação do equipamento'].concat(variasAplic ? ['Instalação'] : []));
  if (ctx.indicadores.length) crit.push(['Indicadores informados', 'Resultado conforme em todos os indicadores registrados', 'ABNT NBR ISO 11140 e ABNT NBR ISO 11138, conforme o indicador'].concat(variasAplic ? ['Ciclos indicados'] : []));
  if (crit.length) {
    var unica = Object.keys(aplicacoes)[0];
    h += legenda('Critérios de aceitação e fontes' + (!variasAplic && unica ? ' (' + unica + ')' : ''));
    h += SGO_DocA4_tabela_([{ t: 'Critério' }, { t: 'Requisito' }, { t: 'Referência' }].concat(variasAplic ? [{ t: 'Aplicação' }] : []), crit, { classe: 'compacta' });
  } else {
    h += P('Sem critérios de ciclo: este relatório contém somente a qualificação de instalação.');
  }

  // 10. Resultados
  h += sec('Resultados');
  var kr = 0;
  if (et.QI) {
    h += sub(++kr, 'Qualificação de instalação');
    h += legenda('Lista de verificação da instalação' + (ctx.dataQi ? ' (' + ctx.dataQi + ')' : ''));
    h += SGO_DocA4_tabela_([{ t: 'Item verificado' }, { t: 'Situação', cls: 'cen' }, { t: 'Observação' }], ctx.qi.map(function (x) {
      var sit = x.situacao === 'C' ? { html: '<span class="ok-txt">Conforme</span>', cls: 'cen' } : (x.situacao === 'NC' ? { html: '<span class="nok-txt">Não conforme</span>', cls: 'cen' } : { t: x.situacao === 'NA' ? 'Não aplicável' : '—', cls: 'cen' });
      return [x.texto, sit, x.observacao || '—'];
    }), { classe: 'compacta' });
  }
  if (ciclos.length) {
    h += sub(++kr, 'Resumo dos ensaios');
    h += legenda('Relatórios de ensaio consolidados');
    h += SGO_DocA4_tabela_([{ t: 'Ensaio' }, { t: 'Relatório', cls: 'cen' }, { t: 'Data', cls: 'cen' }, { t: 'Programa' }, { t: 'Resultado principal' }, { t: 'Situação', cls: 'cen' }],
      ciclos.map(function (c) {
        var r = c.resumo, f = r.fatos || {};
        var principal = r.tipoRelatorio === 'LEAK_TEST'
          ? 'Taxa de vazamento ' + SGO_DocA4_val_(f.taxaVazamentoMbarMin, 2, 'mbar/min') + ' (limite ' + SGO_DocA4_val_(f.limiteTaxaVazamentoMbarMin, 2, 'mbar/min') + ')'
          : ((f.exigeF0 && isFinite(f.minF0) ? 'F0 mínimo ' + SGO_DocA4_val_(f.minF0, 2, 'min') + (f.piorSensorF0 ? ' (' + f.piorSensorF0.sensor + ')' : '') + '; ' : '') + 'exposição ' + SGO_DocA4_val_(f.tempoExposicaoMinutos, 2, 'min'));
        return [AutoOficialDoc_rotuloEnsaio_(c), { t: c.numero + (c.revisao !== '0' ? ' rev ' + c.revisao : ''), cls: 'cen' }, { t: r.identificacao.dataDoEnsaio || '—', cls: 'cen' },
          r.tipoRelatorio === 'LEAK_TEST' ? '—' : (r.identificacao.programa || r.equipamentoLabel), principal, Object.assign(SGO_DocA4_celSituacao_(c.resultado === 'APROVADO', 'Aprovado', 'Reprovado'), { cls: 'cen' })];
      }), { classe: 'compacta' });
    h += sub(++kr, 'Verificação dos critérios por ensaio');
    h += P('Valores obtidos em cada ensaio, como constam do relatório de ensaio aprovado. Os requisitos e as referências estão na tabela de critérios de aceitação.');
    ciclos.forEach(function (c) {
      var r = c.resumo;
      var linhas = (r.criterios || []).map(function (kk) {
        return [kk.criterio, kk.obtido || '—', Object.assign(kk.naoAvaliado ? { html: '<span class="info-txt">Não avaliado</span>' } : SGO_DocA4_celSituacao_(kk.conforme), { cls: 'cen' })];
      });
      h += '<div class="manter">' + legenda(AutoOficialDoc_rotuloEnsaio_(c) + ' — relatório ' + c.numero + (c.revisao !== '0' ? ' rev ' + c.revisao : '') + (r.identificacao.dataDoEnsaio ? ', ' + r.identificacao.dataDoEnsaio : '') + (r.tipoRelatorio === 'LEAK_TEST' ? '' : ' — ' + r.equipamentoLabel));
      h += SGO_DocA4_tabela_([{ t: 'Critério' }, { t: 'Obtido' }, { t: 'Situação', cls: 'cen' }], linhas, { classe: 'compacta' }) + '</div>';
    });
  }
  if (ctx.indicadores.length) {
    h += sub(++kr, 'Indicadores informados');
    h += legenda('Indicadores químicos e biológicos registrados nos ensaios');
    h += SGO_DocA4_tabela_([{ t: 'Indicador' }, { t: 'Ciclo' }, { t: 'Resultado', cls: 'cen' }, { t: 'Observação' }], ctx.indicadores.map(function (x) {
      return [x.tipo, x.ciclo || '—', Object.assign(SGO_DocA4_celSituacao_(x.resultado === 'CONFORME'), { cls: 'cen' }), x.observacao || '—'];
    }), { classe: 'compacta' });
  }

  // 11. Não conformidades e observações
  h += sec('Não conformidades e observações');
  var secNc = n;
  if (ctx.naoConformidades.length) {
    h += P('Não conformidades que determinam o resultado:');
    h += AutoOficialDoc_lista_(ctx.naoConformidades.map(function (x) { return x.origem + ': ' + x.texto.replace(/[.\s]+$/, '') + '.'; }));
  } else {
    h += P('Não foram registradas não conformidades nos ensaios e verificações deste relatório.');
  }
  var obs = ctx.observacoes.slice();
  if (ctx.observacaoLivre) obs.push(ctx.observacaoLivre);
  if (obs.length) { h += P('Observações, sem efeito sobre o resultado:'); h += AutoOficialDoc_lista_(obs); }

  // 12. Conclusão
  h += sec('Conclusão');
  h += SGO_DocA4_paragrafos_(o.textos.conclusao);
  h += '<div class="leigo"><p><b>Em termos práticos:</b> ' + esc(String(o.textos.conclusaoSimples || '').replace(/\s*\n\s*/g, ' ')) + '</p></div>';
  h += SGO_DocA4_linhaParecer_(status, 'Resultado da qualificação', 'Aprovado', 'Reprovado');

  // 13. Recomendações e requalificação
  h += sec('Recomendações e requalificação');
  var rec = [];
  if (status === 'APROVADO') rec.push('Realizar a requalificação até ' + (ctx.validadeAte || '—') + ', o que corresponde à periodicidade de ' + ctx.periodicidadeMeses + (Number(ctx.periodicidadeMeses) === 1 ? ' mês' : ' meses') + ' contada a partir da conclusão dos ensaios' + (ctx.fim ? ' (' + ctx.fim + ')' : '') + '.');
  else rec.push('Investigar as causas das não conformidades, corrigir e repetir a qualificação dos programas reprovados antes de liberar o equipamento para uso nesses programas.');
  rec.push('Antecipar a requalificação depois de manutenção que afete a câmara, a porta e sua vedação, o sistema de controle ou a instrumentação' + (comPressao ? ', a remoção de ar ou a geração de vapor' : '') + '; de mudança do local de instalação; de alteração de programa, de parâmetros ou da configuração de carga; e de resultado insatisfatório no controle de rotina.');
  rec.push('Manter o controle de rotina com indicadores químicos e biológicos' + (comPressao ? ' e, nos equipamentos com remoção dinâmica do ar, com o ensaio de Bowie-Dick no início de cada dia de uso' : '') + ', conforme os procedimentos do serviço.');
  rec.push('Manter a calibração dos instrumentos de controle do equipamento e o registro de cada ciclo, para comparação com os resultados desta qualificação.');
  h += AutoOficialDoc_lista_(rec);

  // 14. Responsabilidade técnica
  h += '<div class="manter">' + sec('Responsabilidade técnica e assinaturas');
  if (o.aprovacao) h += P('Relatório conferido e aprovado para emissão por ' + o.aprovacao.nome + ' em ' + o.aprovacao.em + ', com registro no sistema da empresa executante.');
  else h += P('Minuta aguardando a conferência e a aprovação do responsável técnico.');
  h += SGO_DocA4_assinaturas_(o.assinaturas) + '</div>';

  // Anexo A — relatórios de ensaio
  if (ciclos.length) {
    h += '<h2 class="quebra">Anexo A — Relatórios de ensaio que fundamentam este relatório</h2>';
    h += P('Cada relatório de ensaio traz os dados completos do ciclo: gráficos, tabela de critérios, memória do cálculo do F0 e dados do registrador. A coluna "Conferência" traz o código dos dados aprovados de cada ensaio, para confirmar que o relatório consultado é o mesmo consolidado aqui.');
    h += SGO_DocA4_tabela_([{ t: 'Relatório', cls: 'cen' }, { t: 'Ensaio' }, { t: 'Data', cls: 'cen' }, { t: 'Aprovado por' }, { t: 'Resultado', cls: 'cen' }, { t: 'Conferência', cls: 'cen' }],
      ciclos.map(function (c) {
        return [{ t: c.numero + ' · rev. ' + SGO_DocA4_revisao_(c.revisao), cls: 'cen' }, AutoOficialDoc_rotuloEnsaio_(c), { t: c.resumo.identificacao.dataDoEnsaio || '—', cls: 'cen' },
          [c.aprovadoPor, String(c.aprovadoEm || '').slice(0, 10)].filter(Boolean).join(', ') || '—', Object.assign(SGO_DocA4_celSituacao_(c.resultado === 'APROVADO', 'Aprovado', 'Reprovado'), { cls: 'cen' }),
          { t: String(c.hash || '').slice(0, 12).toUpperCase() || '—', cls: 'cen' }];
      }), { classe: 'compacta' });
  }

  // Anexo B — revisões
  h += '<h2>' + (ciclos.length ? 'Anexo B' : 'Anexo A') + ' — Registro de revisões</h2>';
  var revs = (o.historico || []).map(function (r) { return [{ t: SGO_DocA4_revisao_(r.revisao), cls: 'cen' }, { t: r.em || '—', cls: 'cen' }, r.por || '—', r.motivo || (r.revisao === '0' ? 'Emissão inicial' : '—')]; });
  revs.push([{ t: SGO_DocA4_revisao_(o.revisao), cls: 'cen' }, { t: o.minuta ? '—' : String((o.aprovacao && o.aprovacao.em) || o.emitidoEm || '').slice(0, 10), cls: 'cen' }, o.aprovacao ? o.aprovacao.nome : 'Aguardando aprovação', o.motivoRevisao || ((o.historico || []).length ? '—' : 'Emissão inicial')]);
  h += SGO_DocA4_tabela_([{ t: 'Revisão', cls: 'cen' }, { t: 'Data', cls: 'cen' }, { t: 'Aprovado por' }, { t: 'Motivo' }], revs, { classe: 'compacta' });
  if ((o.historico || []).length) h += '<p class="nota">As revisões anteriores ficam guardadas na pasta do equipamento e marcadas como substituídas; vale a revisão mais recente.</p>';

  h += SGO_DocA4_fimDocumento_();
  return h.replace('__SEC_NC__', String(secNc));
}
