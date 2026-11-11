/****************************************************
 * FROTA — RELATÓRIO MENSAL A4 (30/10/2026, leva 2)
 *
 * HTML A4 + PDF no modelo dos relatórios gerenciais (SGO_Documentos_RelatorioA4.js), guardado na pasta da Frota
 * ("Frota - Relatorios Gerados" / "Relatórios mensais"). Conteúdo, todo calculado pelo servidor:
 *  1. Resumo do mês (gastos, km, custo por km, consumo, lançamentos a conferir, manutenção vencida);
 *  2. Gastos por veículo e por tipo (conferência de gastos: lançamento divergente fica fora do total);
 *  3. Consumo (km/L) por veículo: mediana dos intervalos entre abastecimentos do mês e km das retiradas ÷ litros;
 *  4. Manutenções feitas no mês e paradas agendadas;
 *  5. Plano de manutenção: itens vencidos, a vencer e sem a última vez informada;
 *  6. Lançamentos a conferir e divergentes, com o apontamento; problemas informados na retirada em aberto.
 * O texto é montado dos números (sem análise por IA), em frases curtas.
 ****************************************************/

var FROTAMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function FrotaMes_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/** Junta os números do mês. comp: "aaaa-mm". */
function FrotaMes_dados_(comp) {
  var mes = FrotaR_mes_(comp);
  if (!mes) throw new Error('Escolha o mês do relatório (por exemplo, outubro de 2026) e toque em Gerar de novo.');
  var per = FrotaGas_periodo_(mes.de, mes.ate);
  var g = FrotaGas_coletar_({ ini: per.ini, fim: per.fim });
  var veiculos = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return FrotaMes_s_(v.STATUS).toUpperCase() !== 'INATIVO'; })
    .sort(function (a, b) { return FrotaMes_s_(a.PLACA).localeCompare(FrotaMes_s_(b.PLACA)); });
  var tiposManut = {};
  FROTA_CFG.TIPOS_MANUTENCAO.forEach(function (t) { tiposManut[t.codigo] = t.label; });
  var porVeiculo = {};
  g.totais.porVeiculo.forEach(function (x) { porVeiculo[x.veiculoId] = x; });
  var kmMes = FrotaGas_kmPeriodo_({ ini: per.ini, fim: per.fim });
  var linhasVeic = veiculos.map(function (v) {
    var vid = FrotaMes_s_(v.ID), t = porVeiculo[vid] || { total: 0, categorias: {}, litros: 0 };
    var h = FrotaR_intervalosConsumo_(FrotaAb_abastValidos_(vid));
    var noMes = h.intervalos.filter(function (x) { return x.ms !== null && x.ms >= per.ini && x.ms <= per.fim; }).map(function (x) { return x.kmL; }).sort(function (a, b) { return a - b; });
    var med = noMes.length ? (noMes.length % 2 ? noMes[(noMes.length - 1) / 2] : (noMes[noMes.length / 2 - 1] + noMes[noMes.length / 2]) / 2) : null;
    var km = kmMes[vid] || 0;
    return { id: vid, placa: FrotaMes_s_(v.PLACA), rotulo: FrotaGas_rotuloPlaca_(FrotaMes_s_(v.PLACA)), modelo: FrotaMes_s_(v.MODELO), total: t.total, categorias: t.categorias, litros: t.litros, km: km,
      custoKm: km > 0 ? t.total / km : null, kmLIntervalos: med, kmLSoma: km > 0 && t.litros > 0 ? km / t.litros : null, intervalos: noMes.length };
  });
  var manut = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).filter(function (m) {
    if (FrotaMes_s_(m.EXCLUIDO_EM)) return false;
    var ms = FrotaR_msDe_(Frota_textoData_(m.DATA), '12:00');
    return ms !== null && ms >= per.ini && ms <= per.fim;
  }).map(function (m) {
    var v = veiculos.filter(function (x) { return FrotaMes_s_(x.ID) === FrotaMes_s_(m.VEICULO_ID); })[0] || {};
    return { data: Frota_textoData_(m.DATA), rotulo: FrotaGas_rotuloPlaca_(FrotaMes_s_(v.PLACA) || '—'), tipo: tiposManut[FrotaMes_s_(m.TIPO).toUpperCase()] || FrotaMes_s_(m.TIPO), km: Frota_num_(m.KM, null), custo: Frota_num_(m.CUSTO, 0), oficina: FrotaMes_s_(m.OFICINA), nota: !!FrotaMes_s_(m.NOTA_LINK) };
  }).sort(function (a, b) { return FrotaPar_iso_(a.data).localeCompare(FrotaPar_iso_(b.data)); });
  var plano = [];
  var linhasPlano = FrotaPlano_linhas_();
  veiculos.forEach(function (v) {
    FrotaPlano_doVeiculo_(v, linhasPlano).forEach(function (i) {
      if (['VENCIDO', 'VENCENDO', 'AVISO', 'SEM_HISTORICO'].indexOf(i.situacao) < 0) return;
      plano.push({ rotulo: FrotaGas_rotuloPlaca_(FrotaMes_s_(v.PLACA)), item: i.rotulo, situacao: i.situacao, proxima: [i.proximaKm !== null ? Frota_kmTexto_(i.proximaKm) + ' km' : '', i.proximaData].filter(Boolean).join(' ou '),
        falta: i.situacao === 'SEM_HISTORICO' ? 'sem a última vez informada' : [i.faltamKm !== null ? (i.faltamKm < 0 ? 'passou ' + Frota_kmTexto_(-i.faltamKm) + ' km' : 'faltam ' + Frota_kmTexto_(i.faltamKm) + ' km') : '', i.faltamDias !== null ? (i.faltamDias < 0 ? 'venceu há ' + (-i.faltamDias) + ' dias' : 'faltam ' + i.faltamDias + ' dias') : ''].filter(Boolean).join('; ') });
    });
  });
  // itens sem a última vez: uma linha por veículo (a lista inteira fica no plano, na tela)
  var semHist = {};
  plano = plano.filter(function (i) { if (i.situacao !== 'SEM_HISTORICO') return true; (semHist[i.rotulo] = semHist[i.rotulo] || []).push(i.item.toLowerCase()); return false; });
  Object.keys(semHist).forEach(function (r) { var l = semHist[r]; plano.push({ rotulo: r, item: l.length === 1 ? l[0].charAt(0).toUpperCase() + l[0].slice(1) : l.length + ' itens: ' + l.join(', '), situacao: 'SEM_HISTORICO', qtd: l.length, proxima: '', falta: 'sem a última vez informada' }); });
  var ordemSit = { VENCIDO: 0, SEM_HISTORICO: 1, VENCENDO: 2, AVISO: 3 };
  plano.sort(function (a, b) { return ordemSit[a.situacao] - ordemSit[b.situacao] || a.rotulo.localeCompare(b.rotulo); });
  var paradas = typeof FrotaPar_todas_ === 'function' ? FrotaPar_todas_().filter(function (p) { return FrotaMes_s_(p.SITUACAO).toUpperCase() === 'AGENDADA'; }).map(FrotaPar_paraTela_) : [];
  var conferir = g.linhas.filter(function (l) { return l.situacao === 'A_CONFERIR' || l.situacao === 'DIVERGENTE'; });
  var pendentes = g.linhas.filter(function (l) { return l.situacao === 'PENDENTE'; }).length;
  var checklist = typeof FrotaChk_abertas_ === 'function' ? FrotaChk_abertas_().map(function (p) { return { rotulo: FrotaGas_rotuloPlaca_(FrotaMes_s_(p.PLACA)), item: FrotaMes_s_(p.ITEM), obs: FrotaMes_s_(p.OBSERVACAO), vezes: Number(p.OCORRENCIAS) || 1 }; }) : [];
  var m = /^(\d{4})-(\d{2})$/.exec(comp);
  return { comp: comp, mesTexto: FROTAMES_MESES[Number(m[2]) - 1] + ' de ' + m[1], periodo: mes, totais: g.totais, veiculos: linhasVeic, manutencoes: manut, plano: plano, paradas: paradas,
    conferir: conferir, pendentes: pendentes, checklist: checklist, semComprovante: g.linhas.filter(function (l) { return !l.comprovante && l.valor > 0; }).length };
}

function FrotaMes_texto_(d) {
  var t = d.totais, p = [];
  var cat = t.porCategoria.slice(0, 3).map(function (c) { return c.rotulo.toLowerCase() + ' ' + RelA4_moeda_(c.valor); }).join(', ');
  p.push('Em ' + d.mesTexto + ' a frota lançou ' + RelA4_moeda_(t.geral) + ' em ' + RelA4_plural_(t.quantidade, 'lançamento', 'lançamentos') + (cat ? ' (principais: ' + cat + ')' : '') + '. ' +
    'As retiradas devolvidas no mês somam ' + RelA4_num_(t.km, 0) + ' km' + (t.custoKm !== null ? ', custo de ' + RelA4_moeda_(t.custoKm) + ' por km.' : '; sem quilometragem, o custo por km não foi calculado.'));
  var maior = d.veiculos.filter(function (v) { return v.custoKm !== null; }).sort(function (a, b) { return b.custoKm - a.custoKm; })[0];
  if (maior && d.veiculos.filter(function (v) { return v.custoKm !== null; }).length > 1) p.push('Maior custo por km: ' + maior.rotulo + ' (' + RelA4_moeda_(maior.custoKm) + ').');
  var venc = d.plano.filter(function (i) { return i.situacao === 'VENCIDO'; }).length, sem = d.plano.filter(function (i) { return i.situacao === 'SEM_HISTORICO'; }).reduce(function (s, i) { return s + (i.qtd || 1); }, 0);
  p.push(venc ? RelA4_plural_(venc, 'item de manutenção está vencido', 'itens de manutenção estão vencidos') + ' na emissão' + (d.paradas.length ? ' e ' + RelA4_plural_(d.paradas.length, 'parada está agendada', 'paradas estão agendadas') : '') + '.' : 'Nenhum item do plano de manutenção vencido na emissão.');
  if (sem) p.push(RelA4_plural_(sem, 'item do plano está', 'itens do plano estão') + ' sem a última vez informada: sem esse dado o sistema não calcula o vencimento.');
  p.push(d.conferir.length ? RelA4_plural_(d.conferir.length, 'lançamento está', 'lançamentos estão') + ' a conferir ou divergentes e ' + RelA4_plural_(d.pendentes, 'aguarda', 'aguardam') + ' a conferência de rotina.' : (d.pendentes ? RelA4_plural_(d.pendentes, 'lançamento aguarda', 'lançamentos aguardam') + ' a conferência de rotina, sem apontamento.' : 'Todos os lançamentos do mês estão conferidos.'));
  if (d.checklist.length) p.push(RelA4_plural_(d.checklist.length, 'problema informado na retirada continua', 'problemas informados na retirada continuam') + ' em aberto.');
  return p.join(' ');
}

function FrotaMes_html_(d, emitidoPor) {
  var t = d.totais, c = [];
  var venc = d.plano.filter(function (i) { return i.situacao === 'VENCIDO'; }).length;
  c.push(RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [RelA4_moeda_(t.geral), 'Gastos lançados'], [RelA4_num_(t.km, 0) + ' km', 'Km das retiradas'], [t.custoKm !== null ? RelA4_moeda_(t.custoKm) : '—', 'Custo por km'],
    [RelA4_num_(d.conferir.length, 0), 'A conferir ou divergentes', d.conferir.length ? 'aviso' : 'ok'], [RelA4_num_(venc, 0), 'Manutenção vencida', venc ? 'critico' : 'ok'],
    [RelA4_num_(d.checklist.length, 0), 'Problemas da retirada em aberto', d.checklist.length ? 'aviso' : 'ok']
  ]) + RelA4_paragrafos_(FrotaMes_texto_(d))));
  var cats = Object.keys(FROTAGAS_CATEGORIAS);
  var usadas = cats.filter(function (k) { return t.porCategoria.some(function (x) { return x.categoria === k; }); });
  c.push(RelA4_secao_('Gastos por tipo', RelA4_barras_(t.porCategoria.map(function (x) { return { rotulo: x.rotulo, valor: x.valor, rotuloValor: RelA4_moeda_(x.valor) }; }), { titulo: 'Gastos do mês por tipo', cor: RELA4_CORES.azul, vazio: 'Sem gastos lançados no mês.' }) +
    RelA4_tabela_([{ t: 'Combustível' }, { t: 'Litros', num: true }, { t: 'Valor', num: true }, { t: 'Preço médio por litro', num: true }],
      t.combustivel.map(function (x) { return [x.tipo, RelA4_num_(x.litros, 2), RelA4_moeda_(x.valor), x.precoMedio !== null ? RelA4_moeda_(x.precoMedio) : '—']; }), { legenda: 'Combustível do mês por tipo', vazio: 'Sem abastecimento no mês.' })));
  c.push(RelA4_paisagem_(RelA4_secao_('Gastos e consumo por veículo', RelA4_tabela_(
    [{ t: 'Veículo' }].concat(usadas.map(function (k) { return { t: FROTAGAS_CATEGORIAS[k], num: true }; })).concat([{ t: 'Total', num: true }, { t: 'Km', num: true }, { t: 'Custo/km', num: true }, { t: 'km/L (intervalos)', num: true }, { t: 'km/L (km ÷ litros)', num: true }]),
    d.veiculos.map(function (v) {
      return [v.rotulo + (v.modelo ? ' · ' + v.modelo : '')].concat(usadas.map(function (k) { return v.categorias[k] ? RelA4_moeda_(v.categorias[k]) : '—'; }))
        .concat([RelA4_moeda_(v.total), RelA4_num_(v.km, 0), v.custoKm !== null ? RelA4_moeda_(v.custoKm) : '—', v.kmLIntervalos !== null ? RelA4_num_(v.kmLIntervalos, 1) : '—', v.kmLSoma !== null ? RelA4_num_(v.kmLSoma, 1) : '—']);
    }), { legenda: 'Gastos, quilometragem e consumo por veículo no mês', vazio: 'Nenhum veículo ativo.',
      total: ['Total da frota'].concat(usadas.map(function (k) { var x = t.porCategoria.filter(function (q) { return q.categoria === k; })[0]; return x ? RelA4_moeda_(x.valor) : '—'; })).concat([RelA4_moeda_(t.geral), RelA4_num_(t.km, 0), t.custoKm !== null ? RelA4_moeda_(t.custoKm) : '—', '', '']) }) +
    '<p class="nota">Km: retiradas devolvidas com saída no mês. km/L (intervalos): mediana dos intervalos entre abastecimentos coerentes (entre 2 e 30 km/L, sem lançamento a conferir ou divergente). km/L (km ÷ litros): segunda leitura, que não depende de tanque cheio. Lançamento divergente fica fora dos totais.</p>')));
  c.push(RelA4_secao_('Manutenção', RelA4_subsecao_('Feitas no mês', RelA4_tabela_([{ t: 'Data' }, { t: 'Veículo' }, { t: 'Serviço' }, { t: 'Km', num: true }, { t: 'Custo', num: true }, { t: 'Oficina' }, { t: 'Nota' }],
      d.manutencoes.map(function (m) { return [m.data, m.rotulo, m.tipo, m.km !== null ? RelA4_num_(m.km, 0) : '—', RelA4_moeda_(m.custo), m.oficina || '—', m.nota ? 'anexada' : (m.custo > 0 ? 'falta' : '—')]; }), { legenda: 'Manutenções registradas no mês', vazio: 'Nenhuma manutenção registrada no mês.' })) +
    RelA4_subsecao_('Paradas agendadas', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Período' }, { t: 'Oficina' }, { t: 'O que fazer' }, { t: 'Quem leva' }],
      d.paradas.map(function (p) { return [p.rotulo, p.inicio + ' a ' + p.fim, p.oficina, p.oQueFazer, p.responsavel]; }), { vazio: 'Nenhuma parada agendada na emissão.' })) +
    RelA4_subsecao_('Plano de manutenção na emissão', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Item' }, { t: 'Situação' }, { t: 'Próxima' }, { t: 'Quanto falta' }],
      d.plano.map(function (i) { return [i.rotulo, i.item, RelA4_marca_({ VENCIDO: 'Vencido', VENCENDO: 'A vencer', AVISO: 'Próximo', SEM_HISTORICO: 'Sem a última vez' }[i.situacao], i.situacao === 'VENCIDO' || i.situacao === 'SEM_HISTORICO' ? 'critico' : 'aviso'), i.proxima || '—', i.falta || '—']; }),
      { legenda: 'Itens vencidos, a vencer (até 1.000 km ou 30 dias) e sem a última vez informada', vazio: 'Todos os itens do plano em dia.' }))));
  c.push(RelA4_secao_('Lançamentos a conferir', RelA4_tabela_([{ t: 'Data' }, { t: 'Veículo' }, { t: 'Tipo' }, { t: 'Valor', num: true }, { t: 'Situação' }, { t: 'Apontamento' }],
    d.conferir.map(function (l) { return [l.data, l.rotulo, l.categoriaRotulo, RelA4_moeda_(l.valor), l.situacao === 'DIVERGENTE' ? RelA4_marca_('Divergente', 'critico') : RelA4_marca_('A conferir', 'aviso'), (l.apontamentos || []).map(function (a) { return a.texto; }).join(' ') || l.conferenciaMotivo || '—']; }),
    { legenda: 'Lançamentos do mês com apontamento da conferência ou marcados como divergentes', vazio: 'Nenhum lançamento a conferir no mês.' }) +
    (d.semComprovante ? RelA4_caixa_(RelA4_plural_(d.semComprovante, 'lançamento do mês está', 'lançamentos do mês estão') + ' sem comprovante anexado (registros antigos ou manutenção sem nota).', 'aviso') : '') +
    (d.checklist.length ? RelA4_subsecao_('Problemas informados na retirada, em aberto', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Item' }, { t: 'O que o condutor viu' }, { t: 'Vezes', num: true }],
      d.checklist.map(function (x) { return [x.rotulo, x.item, x.obs || '—', RelA4_num_(x.vezes, 0)]; }))) : '')));
  return RelA4_documento_({ titulo: 'Relatório mensal da frota', subtitulo: 'Gastos, consumo, manutenção e conferência do mês', tituloArquivo: 'Relatório mensal da frota',
    identificacao: d.mesTexto.charAt(0).toUpperCase() + d.mesTexto.slice(1) + ' (' + d.periodo.de + ' a ' + d.periodo.ate + ')', sigla: 'FRM', corpo: c.join('\n'), emitidoPor: emitidoPor });
}

/** payload: { mes: "aaaa-mm" } (padrão: o mês passado). */
function Frota_apiRelatorioMensal(sessionId, payload) {
  var sessao = FrotaGas_exigirGestao_(sessionId);
  payload = payload || {};
  var comp = FrotaMes_s_(payload.mes);
  if (!comp) { var l = FrotaR_local_(Date.now()); var a = l.mes === 1 ? l.ano - 1 : l.ano, me = l.mes === 1 ? 12 : l.mes - 1; comp = a + '-' + ('0' + me).slice(-2); }
  var d = FrotaMes_dados_(comp);
  var emitidoPor = FrotaMes_s_(sessao.nome || sessao.usuario);
  var html = FrotaMes_html_(d, emitidoPor);
  var gravacao = RelA4_salvar_(FrotaRel_pastaDestino_('Relatórios mensais'), 'Frota mensal ' + comp, html, { compartilhar: true });
  if (!gravacao.salvo) SGO_DATA.log('FROTA_RELATORIO_MENSAL_PDF_FALHA', sessao.usuario, gravacao.aviso, 'FROTA');
  SGO_DATA.log('FROTA_RELATORIO_MENSAL', sessao.usuario, 'Relatório mensal da frota ' + comp, 'FROTA');
  return { ok: true, html: RelA4_injetarAvisos_(gravacao.html, RelA4_avisosPadrao_(gravacao, [])), link: gravacao.pdfUrl, htmlUrl: gravacao.htmlUrl, pastaUrl: gravacao.pastaUrl, aviso: gravacao.aviso || '', mes: comp };
}
