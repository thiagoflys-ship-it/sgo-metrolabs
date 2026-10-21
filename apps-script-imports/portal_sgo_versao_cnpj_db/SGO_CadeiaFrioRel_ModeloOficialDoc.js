/****************************************************
 * Cadeia de frio — documento A4 do relatório de qualificação (modelo oficial novo, 21/10/2026).
 * Padrão comum SGO_DocA4 (capa, sumário, cabeçalho e rodapé em todas as páginas). Mesma estrutura do
 * relatório de qualificação da Autoclave a vapor (SGO_AutoRel_ModeloOficialDoc.js), com os estudos da
 * cadeia de frio. Nunca cita marca, fabricante nem modelo comercial: a rastreabilidade é pela TAG e
 * pelo número de série do cadastro.
 ****************************************************/

function CadeiaFrioOficialDoc_p_(t) { return '<p>' + SGO_DocA4_esc_(t) + '</p>'; }
function CadeiaFrioOficialDoc_juntar_(l) { l = (l || []).filter(Boolean); return l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }

/** Valor principal de um estudo para a tabela-resumo. */
function CadeiaFrioOficialDoc_principal_(e) {
  var f = e.fatos || {}, val = SGO_DocA4_val_;
  if (e.tipoEstudo === 'ABERTURA_PORTA' || e.tipoEstudo === 'QUEDA_ENERGIA') return f.rompeu ? 'Saiu da faixa após ' + val(f.tempoAteRupturaMinutos, 1, 'min') : 'Permaneceu na faixa';
  if (e.tipoEstudo === 'AUTONOMIA') return f.rompeu ? 'Autonomia de ' + val(f.autonomiaMinutos, 1, 'min') : 'Sem saída da faixa no período gravado';
  return 'Mínima ' + val(f.min, 2, '°C') + ', máxima ' + val(f.max, 2, '°C') + (f.mkt !== null && f.mkt !== undefined ? '; MKT ' + val(f.mkt, 2, '°C') : '');
}

function CadeiaFrioOficialDoc_montar_(o) {
  var ctx = o.ctx, id = ctx.identificacao, et = ctx.etapas, esc = SGO_DocA4_esc_, P = CadeiaFrioOficialDoc_p_, J = CadeiaFrioOficialDoc_juntar_;
  var empresa = id.empresaExecutante || {};
  var ensaios = ctx.ensaios || [];
  var etapas = [et.QI ? 'qualificação de instalação' : '', et.QO ? 'qualificação de operação' : '', et.QD ? 'qualificação de desempenho' : ''].filter(Boolean);
  var status = ctx.statusConsolidado;
  var periodo = ctx.inicio ? (ctx.inicio === ctx.fim ? ctx.inicio : ctx.inicio + ' a ' + ctx.fim) : '—';
  var estudos = [];
  ensaios.forEach(function (c) { (c.resumo.estudos || []).forEach(function (e) { estudos.push({ c: c, e: e }); }); });
  var tipos = {};
  estudos.forEach(function (x) { tipos[x.e.tipoEstudo] = true; });
  var faixaTxt = ctx.faixa ? SGO_DocA4_val_(ctx.faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(ctx.faixa.tMax, 1, '°C') : '—';
  var n = 0, tab = 0;
  function sec(t) { n++; return '<h2>' + n + '. ' + esc(t) + '</h2>'; }
  function sub(k, t) { return '<h3>' + n + '.' + k + ' ' + esc(t) + '</h3>'; }
  function legenda(t) { tab++; return SGO_DocA4_legendaTabela_(tab, t); }

  var h = SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de qualificação de equipamento da cadeia de frio',
    subtitulo: J(etapas).replace(/^./, function (c) { return c.toUpperCase(); }),
    tituloCurto: 'Relatório de qualificação — cadeia de frio',
    rotuloNumero: 'Relatório nº', numero: o.numero, revisao: o.revisao, empresa: empresa,
    simulado: !!o.minuta, avisoSimulado: 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO. Sem validade e sem aprovação: não deve ser entregue ao cliente.',
    capa: { tipo: 'Qualificação térmica — cadeia de frio', linhas: [['Cliente', id.cliente], ['Unidade', id.unidade + (id.setor ? ' — ' + id.setor : '')],
      ['Equipamento', [id.tipo, id.tag ? 'TAG ' + id.tag : '', id.numeroSerie ? 'nº de série ' + id.numeroSerie : ''].filter(Boolean).join(' · ')], ['Período dos ensaios', periodo], ['Emissão', o.minuta ? 'Minuta (não emitido)' : o.emitidoEm]] },
    ficha: [['Cliente', id.cliente], ['CNPJ', id.cnpj], ['Equipamento', (id.tag || '—') + ' · ' + id.tipo], ['Período dos ensaios', periodo], ['Motivo', ctx.motivo], ['Requalificação até', status === 'APROVADO' ? (ctx.validadeAte || '—') : 'Não se aplica (reprovado)']],
    resultado: { status: status, rotulo: 'Resultado da qualificação', texto: status === 'APROVADO' ? 'Todos os critérios de aceitação aplicáveis foram atendidos nos ensaios e verificações relacionados neste relatório.' : 'Há não conformidade registrada (seção __SEC_NC__); o equipamento não deve ser usado para conservar os produtos até nova qualificação aprovada.' },
    sumario: true
  });

  h += sec('Objetivo');
  h += P('Este relatório registra a ' + J(etapas) + ' do equipamento da cadeia de frio identificado na seção 3, instalado em ' + (id.unidade || 'unidade do contratante') + ', de ' + (id.cliente || 'contratante') + '. A qualificação reúne evidências medidas e rastreáveis de que o equipamento, nas condições de instalação e de uso informadas, mantém a temperatura dentro da faixa de aceitação.');
  h += P('O documento serve de base para a liberação do equipamento para uso, para as auditorias internas e externas do serviço e para o planejamento da requalificação.');

  h += sec('Escopo e limitações');
  var escopo = [];
  if (ensaios.length) escopo.push('Abrange ' + (estudos.length === 1 ? '1 estudo' : estudos.length + ' estudos') + ' (' + estudos.map(function (x) { return x.e.label.toLowerCase(); }).join('; ') + '), executados no período de ' + periodo + ' e documentados nos relatórios de ensaio do Anexo A, cada um aprovado pelo responsável técnico antes desta consolidação.');
  if (et.QI) escopo.push('A qualificação de instalação baseia-se na verificação documental e visual registrada nos resultados' + (ctx.dataQi ? ', feita em ' + ctx.dataQi : '') + '. Não inclui inspeções de segurança elétrica, que têm regras e responsáveis próprios.');
  escopo.push('Os resultados valem para o equipamento identificado, na faixa de aceitação (' + faixaTxt + ') e nas condições de carga e de uso ensaiadas. Não se estendem a outra faixa, a outro arranjo interno nem a outra condição de instalação.');
  escopo.push('Os estudos seguem o método do Anexo G (informativo) da ABNT NBR 16328:2024. Os critérios de aceitação foram configurados pela empresa executante a partir das referências indicadas e são revisáveis pelo responsável técnico. ' + (ctx.regraDecisao || ''));
  var justs = [];
  ensaios.forEach(function (c) {
    var g = c.resumo.grandezas || {};
    if (g.umidade && !g.umidade.medida && g.umidade.justificativa) justs.push('umidade relativa não medida no relatório ' + c.numero + ' (' + CadeiaFrioRel_qFrase_(g.umidade.justificativa) + ')');
    if (g.aberturaPorta && g.aberturaPorta.aplicavel && !g.aberturaPorta.realizado && g.aberturaPorta.justificativa) justs.push('abertura de porta não realizada no relatório ' + c.numero + ' (' + CadeiaFrioRel_qFrase_(g.aberturaPorta.justificativa) + ')');
    if (g.quedaEnergia && g.quedaEnergia.aplicavel && !g.quedaEnergia.realizado && g.quedaEnergia.justificativa) justs.push('queda de energia não realizada no relatório ' + c.numero + ' (' + CadeiaFrioRel_qFrase_(g.quedaEnergia.justificativa) + ')');
  });
  if (justs.length) escopo.push('Grandezas e estudos fora do escopo: ' + justs.join('; ') + '.');
  h += SGO_DocA4_lista_(escopo);

  h += sec('Identificação');
  h += sub(1, 'Contratante e local de instalação');
  h += SGO_DocA4_tabelaIdent_([['Razão social', id.cliente], ['CNPJ', id.cnpj], ['Unidade', id.unidade], ['Setor ou local', id.setor], ['Endereço', [id.endereco, id.cidadeUf].filter(Boolean).join(' — '), { largo: true }], ['Acompanhamento', id.responsavelCliente || 'Não informado', { largo: true }]]);
  h += sub(2, 'Equipamento');
  h += SGO_DocA4_tabelaIdent_([['Tipo', id.tipo], ['TAG', id.tag], ['Número de série', id.numeroSerie], ['Perfil ensaiado', J(id.perfis) || '—'], ['Faixa de aceitação', faixaTxt, { largo: true }]]);
  h += '<p class="nota">A identificação vem do cadastro do equipamento no SGO+. Este relatório não registra marca nem modelo comercial: a rastreabilidade do equipamento é feita pela TAG e pelo número de série.</p>';
  h += sub(3, 'Empresa executante e qualificação');
  h += SGO_DocA4_tabelaIdent_([['Empresa', empresa.nome], ['CNPJ', empresa.cnpj], ['Motivo', ctx.motivo], ['Período', periodo], ['Etapas', J(etapas), { largo: true }], ['Técnicos executores', J(id.tecnicos) || (o.enviadoPor || '—'), { largo: true }]]);

  h += sec('Referências normativas');
  h += P('Foram adotadas as referências abaixo. Cada critério de aceitação indica, na seção correspondente, a referência que o fundamenta.');
  h += SGO_DocA4_lista_(ctx.normas);

  h += sec('Definições');
  var defs = [
    ['Qualificação de instalação (QI)', 'verificação documentada de que o equipamento e a instalação que o atende estão conforme a especificação aplicável.'],
    ['Qualificação de operação (QO)', 'verificação documentada de que o equipamento, em vazio e nos eventos de abertura de porta e de falta de energia, mantém a temperatura dentro dos limites previstos.'],
    ['Qualificação de desempenho (QD)', 'verificação documentada de que o equipamento, com a carga de uso, mantém a temperatura dentro dos critérios de aceitação.'],
    ['Faixa de aceitação', 'intervalo de temperatura em que os produtos devem ser conservados; cada ponto monitorado é comparado a ele.'],
    ['Estabilização', 'período inicial, depois de ligar ou carregar o equipamento, até a temperatura de todos os pontos entrar na faixa; fica registrado, mas não entra no julgamento.'],
    ['Distribuição de temperatura', 'registro contínuo da temperatura em pontos distribuídos no volume útil, por 24 h a partir da estabilização.'],
    ['Abertura de porta e queda de energia', 'estudos que medem o tempo até o primeiro ponto sair da faixa durante o evento e, na abertura de porta, o tempo para todos voltarem à faixa.'],
    ['Temperatura cinética média (MKT)', 'temperatura constante que teria o mesmo efeito acumulado sobre um produto que as temperaturas registradas; valor informativo.'],
    ['Incerteza expandida (U)', 'intervalo associado ao resultado da medição, declarado com fator de abrangência k = 2, para nível de confiança de aproximadamente 95 %.'],
    ['Regra de decisão', 'forma de comparar o valor medido com o limite de aceitação, considerando ou não a incerteza de medição.']
  ];
  h += '<ul class="lista">' + defs.map(function (d) { return '<li><b>' + esc(d[0]) + ':</b> ' + esc(d[1]) + '</li>'; }).join('') + '</ul>';

  h += sec('Responsabilidades');
  h += sub(1, 'Empresa executante');
  h += SGO_DocA4_lista_(['Planejar e executar os ensaios conforme a metodologia deste relatório, com pessoal treinado.', 'Utilizar registradores calibrados, com rastreabilidade metrológica demonstrada e certificado válido na data do ensaio.',
    'Registrar as condições de cada ensaio, os dados obtidos, os desvios do método e as não conformidades, e manter esses registros.', 'Emitir este relatório somente após a conferência e a aprovação do responsável técnico, e guardar as revisões anteriores.',
    'Tratar como confidenciais as informações técnicas e institucionais obtidas durante o serviço.']);
  h += sub(2, 'Contratante');
  h += SGO_DocA4_lista_(['Disponibilizar o equipamento, a carga representativa da rotina e pessoal para acompanhar os ensaios.', 'Informar a faixa de conservação dos produtos e a forma de uso do equipamento.',
    'Manter o monitoramento de rotina da temperatura do equipamento, conforme os procedimentos do serviço.', 'Comunicar à empresa executante as mudanças que exijam requalificação antes do prazo, descritas na seção de recomendações.']);

  h += sec('Metodologia');
  var k = 0;
  if (et.QI) { h += sub(++k, 'Qualificação de instalação'); h += P('Com o equipamento instalado, foram conferidos os itens da lista de verificação apresentada nos resultados. Cada item recebe a situação conforme, não conforme ou não aplicável; o item não conforme traz a descrição do que foi encontrado.'); }
  if (tipos.DISTRIBUICAO_VAZIO || tipos.DISTRIBUICAO_CARGA) { h += sub(++k, 'Distribuição de temperatura'); h += P('Sensores de temperatura foram distribuídos geometricamente no volume útil, sem tocar as superfícies internas, com um sensor junto ao sensor de controle do equipamento, ' + (tipos.DISTRIBUICAO_CARGA ? 'na carga (estudo com carga) ' : '') + (tipos.DISTRIBUICAO_VAZIO ? (tipos.DISTRIBUICAO_CARGA ? 'e na câmara vazia (estudo em vazio) ' : 'na câmara vazia ') : '') + 'e registraram a temperatura por 24 h consecutivas a partir da estabilização do equipamento.'); }
  if (tipos.ABERTURA_PORTA || tipos.QUEDA_ENERGIA) { h += sub(++k, 'Abertura de porta e queda de energia'); h += P('Com a mesma montagem de sensores e todos os pontos na faixa, a porta foi aberta (ou a energia interrompida) pelo tempo previsto; mediu-se o tempo até o primeiro sensor sair da faixa e, depois do evento, o tempo para todos voltarem à faixa.'); }
  if (tipos.AUTONOMIA) { h += sub(++k, 'Autonomia da caixa térmica'); h += P('Com a caixa térmica preparada para o transporte, mediu-se o tempo em que todos os pontos permaneceram na faixa de aceitação.'); }
  h += sub(++k, 'Tratamento dos dados e regra de decisão');
  h += P('Os dados de cada ensaio foram tratados pelo sistema de cálculo da empresa executante, que verifica a qualidade das leituras (leituras impossíveis, sensores parados, picos isolados, leituras faltando e lacunas) e impede a emissão do relatório de ensaio quando há dado inválido. Os critérios de cada estudo foram avaliados no relatório de ensaio e consolidados aqui sem novo arredondamento. ' + (ctx.regraDecisao || '') + ' A qualificação é aprovada quando todos os ensaios e verificações relacionados atendem aos critérios; uma única não conformidade reprova a qualificação. Desvio do método é registrado e não muda o resultado.');

  if (ctx.instrumentos.length) {
    h += sec('Instrumentos de medição e rastreabilidade');
    h += P('Os registradores abaixo foram usados nos ensaios. A rastreabilidade metrológica é demonstrada pelos certificados de calibração indicados, conferidos no cadastro de padrões na data de cada ensaio.');
    h += legenda('Instrumentos utilizados');
    h += SGO_DocA4_tabela_([{ t: 'Identificação' }, { t: 'Certificado' }, { t: 'Validade', cls: 'cen' }, { t: 'U (k = 2)', cls: 'num' }, { t: 'Situação' }, { t: 'Relatórios' }], ctx.instrumentos.map(function (it) {
      return [it.tag, it.certificado || '—', { t: it.validade || '—', cls: 'cen' }, { t: isFinite(it.incertezaU95) && it.incertezaU95 !== null ? SGO_DocA4_val_(it.incertezaU95, 2, '°C') : '—', cls: 'num' },
        it.conforme === true ? { html: '<span class="ok-txt">' + esc(it.situacao) + '</span>' } : (it.conforme === false ? { html: '<span class="nok-txt">' + esc(it.situacao) + '</span>' } : (it.situacao || '—')), J(it.ensaios)];
    }), { classe: 'compacta' });
  }

  h += sec('Critérios de aceitação');
  var crit = ctx.criterios.map(function (c) { return [c.estudo, c.criterio, c.requisito, { t: c.metodo ? 'Método' : 'Decide', cls: 'cen' }, c.referencia]; });
  if (et.QI) crit.push(['Instalação', 'Qualificação de instalação', 'Todos os itens aplicáveis da lista de verificação conformes', { t: 'Decide', cls: 'cen' }, 'Lista de verificação da empresa executante']);
  if (crit.length) { h += legenda('Critérios de aceitação e fontes'); h += SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Requisito' }, { t: 'Tipo', cls: 'cen' }, { t: 'Referência' }], crit, { classe: 'compacta' }); }

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
  if (estudos.length) {
    h += sub(++kr, 'Resumo dos estudos');
    h += legenda('Estudos dos relatórios de ensaio consolidados');
    h += SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Relatório', cls: 'cen' }, { t: 'Data', cls: 'cen' }, { t: 'Resultado principal' }, { t: 'Situação', cls: 'cen' }], estudos.map(function (x) {
      var s = x.e.statusAprovacao;
      return [x.e.label, { t: x.c.numero + (x.c.revisao !== '0' ? ' rev ' + x.c.revisao : ''), cls: 'cen' }, { t: x.c.resumo.identificacao.dataDoEnsaio || '—', cls: 'cen' }, CadeiaFrioOficialDoc_principal_(x.e),
        s === 'INFORMATIVO' ? { html: '<span class="info-txt">Informativo</span>', cls: 'cen' } : Object.assign(SGO_DocA4_celSituacao_(s === 'APROVADO', 'Aprovado', 'Reprovado'), { cls: 'cen' })];
    }), { classe: 'compacta' });
    h += sub(++kr, 'Verificação dos critérios por estudo');
    h += P('Valores obtidos em cada estudo, como constam do relatório de ensaio aprovado. Os requisitos e as referências estão na tabela de critérios de aceitação.');
    estudos.forEach(function (x) {
      h += '<div class="manter">' + legenda(x.e.label + ' — relatório ' + x.c.numero + (x.c.revisao !== '0' ? ' rev ' + x.c.revisao : '') + (x.c.resumo.identificacao.dataDoEnsaio ? ', ' + x.c.resumo.identificacao.dataDoEnsaio : ''));
      h += SGO_DocA4_tabela_([{ t: 'Critério' }, { t: 'Obtido' }, { t: 'Situação', cls: 'cen' }], (x.e.criterios || []).map(function (kk) {
        return [kk.criterio, kk.obtido || '—', Object.assign(CadeiaFrioRel_reCelSituacao_(kk), { cls: 'cen' })];
      }), { classe: 'compacta' }) + '</div>';
    });
  }

  h += sec('Não conformidades e observações');
  var secNc = n;
  if (ctx.naoConformidades.length) { h += P('Não conformidades que determinam o resultado:'); h += SGO_DocA4_lista_(ctx.naoConformidades.map(function (x) { return x.origem + ': ' + x.texto.replace(/[.\s]+$/, '') + '.'; })); }
  else h += P('Não foram registradas não conformidades nos ensaios e verificações deste relatório.');
  var obs = ctx.observacoes.slice();
  if (ctx.observacaoLivre) obs.push(ctx.observacaoLivre);
  if (obs.length) { h += P('Observações e desvios do método, sem efeito sobre o resultado:'); h += SGO_DocA4_lista_(obs); }

  h += sec('Conclusão');
  h += SGO_DocA4_paragrafos_(o.textos.conclusao);
  h += '<div class="leigo"><p><b>Em termos práticos:</b> ' + esc(String(o.textos.conclusaoSimples || '').replace(/\s*\n\s*/g, ' ')) + '</p></div>';
  h += SGO_DocA4_linhaParecer_(status, 'Resultado da qualificação', 'Aprovado', 'Reprovado');

  h += sec('Recomendações e requalificação');
  var rec = [];
  if (status === 'APROVADO') rec.push('Realizar a requalificação até ' + (ctx.validadeAte || '—') + ', o que corresponde à periodicidade de ' + ctx.periodicidadeMeses + (Number(ctx.periodicidadeMeses) === 1 ? ' mês' : ' meses') + ' contada a partir da conclusão dos ensaios' + (ctx.fim ? ' (' + ctx.fim + ')' : '') + '.');
  else rec.push('Investigar as causas das não conformidades, corrigir e repetir a qualificação antes de usar o equipamento para conservar os produtos.');
  rec.push('Antecipar a requalificação depois de manutenção que afete o sistema de refrigeração, o controle de temperatura ou a vedação da porta; de mudança do local de instalação; de alteração do arranjo interno ou da carga; e de resultado insatisfatório no monitoramento de rotina.');
  rec.push('Manter o monitoramento de rotina da temperatura do equipamento e o registro das ocorrências, para comparação com os resultados desta qualificação.');
  rec.push('Não usar para guardar produtos as posições que ficaram fora da faixa nos estudos, quando houver, até a correção e a nova qualificação.');
  h += SGO_DocA4_lista_(rec);

  h += '<div class="manter">' + sec('Responsabilidade técnica e assinaturas');
  h += o.aprovacao ? P('Relatório conferido e aprovado para emissão por ' + o.aprovacao.nome + ' em ' + o.aprovacao.em + ', com registro no sistema da empresa executante.') : P('Minuta aguardando a conferência e a aprovação do responsável técnico.');
  h += SGO_DocA4_assinaturas_(o.assinaturas) + '</div>';

  if (ensaios.length) {
    h += '<h2 class="quebra">Anexo A — Relatórios de ensaio que fundamentam este relatório</h2>';
    h += P('Cada relatório de ensaio traz os dados completos dos estudos: gráficos, tabelas por sensor, critérios e a planilha de dados do registrador. A coluna "Conferência" traz o código dos dados aprovados de cada ensaio, para confirmar que o relatório consultado é o mesmo consolidado aqui.');
    h += SGO_DocA4_tabela_([{ t: 'Relatório', cls: 'cen' }, { t: 'Estudos' }, { t: 'Data', cls: 'cen' }, { t: 'Aprovado por' }, { t: 'Resultado', cls: 'cen' }, { t: 'Conferência', cls: 'cen' }], ensaios.map(function (c) {
      return [{ t: c.numero + ' · rev. ' + SGO_DocA4_revisao_(c.revisao), cls: 'cen' }, (c.resumo.estudos || []).map(function (e) { return e.label; }).join('; '), { t: c.resumo.identificacao.dataDoEnsaio || '—', cls: 'cen' },
        [c.aprovadoPor, String(c.aprovadoEm || '').slice(0, 10)].filter(Boolean).join(', ') || '—', Object.assign(SGO_DocA4_celSituacao_(c.resultado === 'APROVADO', 'Aprovado', 'Reprovado'), { cls: 'cen' }), { t: String(c.hash || '').slice(0, 12).toUpperCase() || '—', cls: 'cen' }];
    }), { classe: 'compacta' });
  }
  h += '<h2>' + (ensaios.length ? 'Anexo B' : 'Anexo A') + ' — Registro de revisões</h2>';
  var revs = (o.historico || []).map(function (r) { return [{ t: SGO_DocA4_revisao_(r.revisao), cls: 'cen' }, { t: r.em || '—', cls: 'cen' }, r.por || '—', r.motivo || (r.revisao === '0' ? 'Emissão inicial' : '—')]; });
  revs.push([{ t: SGO_DocA4_revisao_(o.revisao), cls: 'cen' }, { t: o.minuta ? '—' : String((o.aprovacao && o.aprovacao.em) || o.emitidoEm || '').slice(0, 10), cls: 'cen' }, o.aprovacao ? o.aprovacao.nome : 'Aguardando aprovação', o.motivoRevisao || ((o.historico || []).length ? '—' : 'Emissão inicial')]);
  h += SGO_DocA4_tabela_([{ t: 'Revisão', cls: 'cen' }, { t: 'Data', cls: 'cen' }, { t: 'Aprovado por' }, { t: 'Motivo' }], revs, { classe: 'compacta' });
  if ((o.historico || []).length) h += '<p class="nota">As revisões anteriores ficam guardadas na pasta do equipamento e marcadas como substituídas; vale a revisão mais recente.</p>';
  h += SGO_DocA4_fimDocumento_();
  return h.replace('__SEC_NC__', String(secNc));
}
