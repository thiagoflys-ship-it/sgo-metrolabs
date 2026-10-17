/****************************************************
 * METROLABS — AUTOCLAVE — MEMÓRIA DE CÁLCULO DO F0
 * Terceira forma de documento do módulo (além do Relatório de Auditoria
 * em Planilha/PDF e da Interpretação Técnica do Ensaio em
 * SGO_AutoRel_CertificadoRelatorio.js): mostra, leitura a leitura e por
 * sensor ativo, exatamente como o F0 certificado foi calculado — pra o
 * técnico usar na explicação ao cliente de por que o F0 (ex.: 117,55 min)
 * é muito maior que o tempo relógio de exposição (ex.: 4,5 min).
 *
 * REGRA DE OURO (pedido explícito do usuário, 2026-08-21): os números
 * aqui têm que ser IDÊNTICOS aos do certificado/relatório de auditoria,
 * nunca uma segunda conta em paralelo. Por isso este arquivo nunca
 * recalcula F0 — ele só formata analise.memoriaF0PorSensor e
 * analise.f0PorSensor, que SGO_AutoRel_AnaliseCiclo.js já monta dentro do
 * mesmíssimo laço que soma o F0 oficial (ver comentário lá, PASSO 4).
 *
 * Documento só existe pra CICLO_TERMICO — Leak Test não tem F0/sensores
 * de temperatura, então essa opção nem aparece nesse modo.
 ****************************************************/

/**
 * Monta o "pacote de fatos" da memória de F0 a partir do mesmo payload já
 * usado pela Interpretação Técnica (reaproveita
 * AutoRel_acExecutarAnaliseCompleta_ — nunca uma segunda leitura/análise
 * dos dados brutos).
 */
function AutoRel_mf0MontarContexto_(payload) {
  payload = payload || {};

  if (String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST') {
    throw new Error('A Memória de Cálculo do F0 está disponível apenas para ciclos térmicos (não se aplica ao Leak Test).');
  }

  const resultado = AutoRel_acExecutarAnaliseCompleta_(payload);
  const a = resultado.analise;
  const cicloCfg = resultado.cicloCfg || {};

  const f0MinNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.f0MinNormativo === 'number'
    ? a.limitesAprovacao.f0MinNormativo
    : AutoRel_parseFloatSeguro_(cicloCfg.f0MinNormativo, 0);

  const sensores = [];
  (a.sensoresAtivos || []).forEach(function(ativo, s) {
    if (!ativo) return;
    const f0 = (a.f0PorSensor || [])[s];
    sensores.push({
      sensor: 'S' + (s + 1),
      f0: (f0 === null || f0 === undefined) ? null : f0,
      leituras: (a.memoriaF0PorSensor && a.memoriaF0PorSensor[s]) || [],
      conforme: (f0 !== null && f0 !== undefined) ? (f0 >= f0MinNormativo) : null
    });
  });

  return {
    equipamentoLabel: AutoRel_acLabelCiclo_(resultado.motor, cicloCfg),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      setor: String(payload.setor || payload.localizacao || payload.local || '').trim(),
      tag: String(payload.tag || payload.tagEquipamento || '').trim(),
      dataDoEnsaio: AutoRel_acExtrairDataDoTexto_(a.tempoInicioExposicao || a.tempoInicioCiclo || ''),
      tecnicoExecutor: String(payload.responsavelTecnico || payload.respTecnico || payload.operador || '').trim(),
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim() || '0',
      empresaExecutante: AutoRel_UCFG.EMPRESA_EXECUTANTE
    },
    tBase: a.configuracaoCiclo.tBase,
    z: a.configuracaoCiclo.z,
    dtMin: a.deltaMinutosEstimado,
    f0MinNormativo: f0MinNormativo,
    piorSensorF0: a.piorSensorF0 || null,
    tempoInicioExposicao: a.tempoInicioExposicao || '',
    tempoFimExposicao: a.tempoFimExposicao || '',
    tempoExposicaoMinutos: a.tempoExposicaoMinutos,
    statusAprovacao: a.statusAprovacao,
    quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
    sensores: sensores
  };
}

// ------------------------------------------------------------
// FORMATAÇÃO (pt-BR, vírgula decimal)
// ------------------------------------------------------------
function AutoRel_mf0Num_(v, casas) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return Number(v).toFixed(casas == null ? 2 : casas).replace('.', ',');
}

function AutoRel_mf0SoTempo_(tempoStr) {
  const s = String(tempoStr || '').trim();
  if (!s) return '—';
  const partes = s.split(' ');
  return partes.length > 1 ? partes[partes.length - 1] : s;
}

function AutoRel_mf0MediaLeituras_(leituras) {
  if (!leituras || !leituras.length) return null;
  let soma = 0;
  leituras.forEach(function(r) { soma += r.temperatura; });
  return soma / leituras.length;
}

function AutoRel_mf0MediaFator_(leituras) {
  if (!leituras || !leituras.length) return null;
  let soma = 0;
  leituras.forEach(function(r) { soma += r.fator; });
  return soma / leituras.length;
}

// ------------------------------------------------------------
// MONTAGEM DO DOCUMENTO HTML (A4) — mesma linguagem visual do módulo
// (folha branca A4, topo azul/verde) já usada em Certificado.html
// ------------------------------------------------------------
function AutoRel_mf0MontarDocumentoHtml_(ctx) {
  // Padrão comum SGO_DocA4 (17/10/2026): cabeçalho e rodapé em todas as
  // páginas, numeração, tabelas que repetem o cabeçalho na quebra de página.
  const id = ctx.identificacao;
  const empresa = id.empresaExecutante || { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
  const geradoEm = Utilities.formatDate(new Date(), AutoRel_UCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const st = AutoRel_acNormalizarStatus_(ctx.statusAprovacao);
  const n = SGO_DocA4_num_;
  const esc = SGO_DocA4_esc_;

  const h = [];
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Memória de cálculo do F0',
    subtitulo: 'Demonstração, leitura a leitura e por sensor, do F0 apurado no relatório de ensaio térmico do mesmo ciclo. Os valores são os mesmos do relatório: nada é recalculado aqui.',
    tituloCurto: 'Memória de cálculo do F0 — Autoclave',
    rotuloNumero: 'Relatório nº',
    numero: id.certificadoNumero || 'sem número',
    revisao: id.revisao || '0',
    empresa: empresa,
    ficha: [['Data do ensaio', id.dataDoEnsaio || '—'], ['Emissão', geradoEm]],
    resultado: { status: st, rotulo: 'Resultado do ensaio (pior sensor)', texto: ctx.piorSensorF0 ? ('F0 mínimo de ' + SGO_DocA4_val_(ctx.piorSensorF0.valor, 2, 'min') + ' no sensor ' + ctx.piorSensorF0.sensor + '; mínimo exigido ' + SGO_DocA4_val_(ctx.f0MinNormativo, 2, 'min') + '.') : '' }
  }));

  h.push('<h2>1. Identificação</h2>');
  h.push(SGO_DocA4_tabelaIdent_([
    ['Cliente', id.cliente], ['Setor', id.setor],
    ['Equipamento', 'Autoclave a vapor — ' + ctx.equipamentoLabel], ['TAG', id.tag],
    ['Janela de exposição', AutoRel_mf0SoTempo_(ctx.tempoInicioExposicao) + ' a ' + AutoRel_mf0SoTempo_(ctx.tempoFimExposicao) + ' (' + SGO_DocA4_val_(ctx.tempoExposicaoMinutos, 2, 'min') + ')'],
    ['Técnico executor', id.tecnicoExecutor]
  ]));

  h.push('<h2>2. Fundamentação</h2>');
  h.push('<p>O F<sub>0</sub> não mede tempo de relógio. Ele converte o efeito letal obtido na temperatura real do ensaio para uma escala de referência fixa em ' + esc(SGO_DocA4_val_(ctx.tBase, 1, '°C')) + ', conforme a ABNT NBR ISO 17665-1. O efeito do calor sobre os microrganismos cresce de forma multiplicativa com a temperatura: cada ' + esc(SGO_DocA4_val_(ctx.z, 0, '°C')) + ' acima da referência multiplica a taxa de inativação por dez. Por isso um minuto de exposição acima da referência vale mais do que um minuto de F<sub>0</sub>, e um minuto abaixo dela vale menos.</p>');
  h.push('<p class="formula">F<sub>0</sub> = Σ 10<sup>(T − ' + esc(n(ctx.tBase, 1)) + ') / ' + esc(n(ctx.z, 0)) + '</sup> · Δt &nbsp;&nbsp; (Δt = ' + esc(SGO_DocA4_val_(ctx.dtMin, 2, 'min')) + ')</p>');
  const linhasEscala = [
    { t: ctx.tBase, c: [SGO_DocA4_val_(ctx.tBase, 1, '°C'), 'temperatura de referência', '1,0×'] },
    { t: ctx.tBase + 10, c: [SGO_DocA4_val_(ctx.tBase + 10, 1, '°C'), '+10 °C', '10×'] },
    { t: ctx.tBase + 20, c: [SGO_DocA4_val_(ctx.tBase + 20, 1, '°C'), '+20 °C', '100×'] }
  ];
  let mediaFatorPior = null;
  const piorSensorObj = ctx.sensores.find(function(sv) { return ctx.piorSensorF0 && sv.sensor === ctx.piorSensorF0.sensor; });
  if (piorSensorObj && piorSensorObj.leituras.length) {
    const mediaTempPior = AutoRel_mf0MediaLeituras_(piorSensorObj.leituras);
    mediaFatorPior = AutoRel_mf0MediaFator_(piorSensorObj.leituras);
    linhasEscala.push({ t: mediaTempPior, c: [SGO_DocA4_val_(mediaTempPior, 1, '°C'), 'média do pior sensor (' + piorSensorObj.sensor + ') na exposição', '≈ ' + n(mediaFatorPior, 1) + '×'] });
  }
  h.push(SGO_DocA4_tabela_([{ t: 'Temperatura', cls: 'num' }, { t: 'Relação com a referência' }, { t: 'Fator de equivalência', cls: 'num' }],
    linhasEscala.sort(function(x, y) { return x.t - y.t; }).map(function(l) { return l.c; })));
  if (mediaFatorPior !== null && isFinite(mediaFatorPior)) {
    h.push('<p class="nota">No ponto mais frio do ciclo, cada minuto real de exposição equivaleu, em média, a ' + esc(n(mediaFatorPior, 1)) + ' minuto(s) na escala de referência' +
      (mediaFatorPior > 1 ? '; por isso o F0 final é maior que o tempo de relógio da exposição.' : (mediaFatorPior < 1 ? '; por isso o F0 final é menor que o tempo de relógio da exposição.' : '.')) + '</p>');
  }

  h.push('<h2>3. Comparativo entre sensores</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'F0 obtido (min)', cls: 'num' }, { t: 'Mínimo exigido (min)', cls: 'num' }, { t: 'Múltiplo do mínimo', cls: 'num' }, { t: 'Situação' }],
    ctx.sensores.map(function(sv) {
      const ehPior = ctx.piorSensorF0 && sv.sensor === ctx.piorSensorF0.sensor;
      const multiplo = (sv.f0 !== null && ctx.f0MinNormativo) ? (sv.f0 / ctx.f0MinNormativo) : null;
      return [sv.sensor + (ehPior ? ' (pior)' : ''), SGO_DocA4_val_(sv.f0, 2), SGO_DocA4_val_(ctx.f0MinNormativo, 2), multiplo !== null ? n(multiplo, 1) + '×' : '—',
        sv.conforme === null ? '—' : SGO_DocA4_celSituacao_(sv.conforme, 'Conforme', 'Não conforme')];
    })));

  h.push('<h2>4. Memória de cálculo por sensor</h2>');
  h.push('<p>Para cada leitura da janela de exposição: fator = 10<sup>(T − ' + esc(n(ctx.tBase, 1)) + ') / ' + esc(n(ctx.z, 0)) + '</sup>; contribuição = fator × Δt; o F<sub>0</sub> do sensor é a soma das contribuições.</p>');
  ctx.sensores.forEach(function(sv) {
    h.push('<h3>Sensor ' + esc(sv.sensor) + ' — F<sub>0</sub> = ' + esc(SGO_DocA4_val_(sv.f0, 2, 'min')) + '</h3>');
    if (!sv.leituras.length) {
      h.push('<p class="nota">Sem leituras válidas deste sensor na janela de exposição identificada.</p>');
      return;
    }
    h.push(SGO_DocA4_tabela_([{ t: 'Horário' }, { t: 'Temperatura (°C)', cls: 'num' }, { t: 'Fator', cls: 'num' }, { t: 'Contribuição (min)', cls: 'num' }, { t: 'F0 acumulado (min)', cls: 'num' }],
      sv.leituras.map(function(r) { return [AutoRel_mf0SoTempo_(r.tempoStr), n(r.temperatura, 2), n(r.fator, 2) + '×', n(r.contribuicao, 3), n(r.acumulado, 2)]; }),
      { classe: 'compacta', rodape: [{ t: 'Soma das ' + sv.leituras.length + ' leituras da janela de exposição', colspan: 4 }, { t: n(sv.f0, 2), cls: 'num' }] }));
  });

  h.push('<h2>5. Observações</h2>');
  h.push(SGO_DocA4_lista_([
    'O F0 mínimo exigido é o piso abaixo do qual o ciclo é reprovado; um valor acima dele, mesmo que próximo, aprova o ciclo e é registrado como observação de acompanhamento.',
    'O F0 é somado apenas na janela de exposição (patamar de esterilização); as fases de aquecimento, despressurização e secagem não entram no cálculo.',
    'Os valores deste documento são os mesmos do relatório de dados e do relatório de ensaio térmico deste ciclo; este documento os demonstra e não os substitui.'
  ]));
  h.push(SGO_DocA4_assinaturas_(AutoRel_acListaAssinaturas_({ identificacao: id })));
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}

// ------------------------------------------------------------
// API — chamada única (sem IA, sem etapa de rascunho: é cálculo puro)
// ------------------------------------------------------------
function AutoRel_apiGerarMemoriaF0(payload) {
  payload = payload || {};
  const ctx = AutoRel_mf0MontarContexto_(payload);
  const html = AutoRel_mf0MontarDocumentoHtml_(ctx);
  // Regra do dono: HTML A4 + PDF na pasta do cliente (mesma pasta do relatório de ensaio).
  return SGO_DocSalvar_finalizarCertificado_(html, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', AutoRel_UCFG.LAUDOS_FOLDER_ID);
  }, 'Memória de cálculo F0 Autoclave', AutoRel_UCFG.TZ);
}
