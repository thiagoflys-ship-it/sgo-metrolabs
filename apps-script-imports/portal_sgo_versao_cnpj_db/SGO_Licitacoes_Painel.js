/****************************************************
 * SGO+ LICITAÇÕES — KANBAN, GANTT E PAINEL (DASHBOARD) (etapa 4, 02/11/2026)
 *
 * Pedido do dono (docs/LICITACOES_00, 01/11/2026): "Quero karban e gantt quero índice Dashboard" — nomes "Kanban" e "Gantt"
 * obrigatórios. Protótipos: docs/prototipos_licitacoes/kanban.html, gantt.html e painel.html (LICITACOES_04). As telas usam os
 * componentes que já existem no SGO+ (Kanban e Gantt do Comercial: cmk-*, cmg-*; barras de indicador das Atividades:
 * atv-barra-ind; números: cm-kpis/cm-kpi). Telas em JS_Licitacoes.html; ações em Licitacoes_api (SGO_Licitacoes.js).
 *
 * Desempenho (200+ oportunidades, 500+ prazos): cada tela lê cada aba UMA vez e agrega aqui no servidor; nada de uma chamada
 * por cartão. Kanban: LIC_OPORTUNIDADES. Gantt: LIC_OPORTUNIDADES + LIC_EVENTOS. Painel: LIC_OPORTUNIDADES, LIC_EVENTOS,
 * LIC_ALERTAS, LIC_ANALISES, LIC_PORTAIS e duas leituras do coletor do servidor (situação e registro das chamadas).
 *
 * Kanban (etapas = LIC_OPORTUNIDADES.SITUACAO): Radar → Em análise → Decisão → Proposta → Disputa → Resultado → Contrato.
 *   - Radar: candidatas e travadas (SITUACAO RADAR). Em análise: ANALISE. Decisão: as descartadas pela Diretoria (com o motivo)
 *     e, quando existir, "Participar" (SITUACAO DECISAO). Descartadas só pela regra do radar ficam fora do quadro (Lista ›
 *     Descartadas), com a contagem.
 *   - Mover de coluna só nas transições que já existem: Radar → Em análise (enviar para análise), Radar ou Em análise → Decisão
 *     (descartar), Decisão (descartada) → Radar (reabrir). Sempre com motivo (10 letras ou mais) e histórico (LIC_HISTORICO,
 *     fonte "Kanban"). As demais ficam desabilitadas com o porquê (Proposta, Disputa, Resultado e Contrato chegam nas
 *     próximas etapas; "Participar" exige o preço mínimo aprovado).
 *   - Central de disputas (02/11/2026, SGO_Licitacoes_Disputa.js): a entrada em Disputa é pela aba Disputa da ficha (exige a proposta
 *     emitida, a simulação e o piso de cada item; o Kanban explica e abre a ficha); Disputa → Resultado ("Concluir o resultado")
 *     funciona também no Kanban, com motivo, quando todos os itens têm o resultado registrado.
 * Gantt: os prazos de LIC_EVENTOS (etapa 3) no tempo, com a natureza (Confirmado, Calculado, Pendente de confirmação), o dia de
 *   hoje, zoom semana ou mês; o recebimento das propostas como barra (abertura → fim das propostas).
 * Painel: números reais, cada um com a fonte (aba e regra da contagem) e o destino do clique (a lista filtrada).
 ****************************************************/

var LIC_KANBAN_COLUNAS = [
  { codigo: 'RADAR', nome: 'Radar', dica: 'Candidatas e travadas da triagem por regras, ainda sem decisão da Diretoria.' },
  { codigo: 'ANALISE', nome: 'Em análise', dica: 'Enviadas para análise: arquivos do edital e nota da IA na ficha.' },
  { codigo: 'DECISAO', nome: 'Decisão', dica: 'Participar ou descartar. Aqui ficam as descartadas pela Diretoria, com o motivo; "Participar" chega com a etapa de preços e proposta.' },
  { codigo: 'PROPOSTA', nome: 'Proposta', futura: 'Chega na etapa de preços e proposta (tabela de preços de licitação, simulador e proposta em A4 aprovada pela Diretoria).' },
  { codigo: 'DISPUTA', nome: 'Disputa', dica: 'Disputa aberta na Central de disputas (aba Disputa da ficha): lances digitados pela Diretoria, nunca abaixo do piso autorizado. O SGO+ não envia lance.' },
  { codigo: 'RESULTADO', nome: 'Resultado', dica: 'Resultado de cada item registrado com a fonte (ganho, perdido, fracassado, deserto, desclassificado, habilitação pendente, recurso).' },
  { codigo: 'CONTRATO', nome: 'Contrato', dica: 'Contrato registrado (aba Contrato da ficha e tela Contratos): vigência, valores, versões e aditivos, prazos na agenda e a integração com os módulos.' }
];
var LIC_KANBAN_MAX_COLUNA = 120;
var LIC_GANTT_MAX_LINHAS = 150;
var LIC_UFS_GRUPO = { GO: 'GO e DF (sede)', DF: 'GO e DF (sede)', MG: 'Vizinho de GO', BA: 'Vizinho de GO', TO: 'Vizinho de GO', MT: 'Vizinho de GO', MS: 'Vizinho de GO', RJ: 'RJ (filial)' };

// ------------------------------------------------------------ regras de passagem do Kanban
/** Coluna do Kanban de uma linha de LIC_OPORTUNIDADES (null = fora do quadro: descartada só pela regra do radar). */
function Lic_colunaKanban_(l) {
  var s = Lic_s_(l.SITUACAO);
  if (s === 'DESCARTADA') return Lic_s_(l.DESCARTE_ORIGEM) === 'PESSOA' ? 'DECISAO' : null;
  return LIC_KANBAN_COLUNAS.some(function (c) { return c.codigo === s; }) ? s : null;
}
/**
 * O que acontece ao levar uma oportunidade da situação `de` para a coluna `para`: { acao, nome } (transição que existe) ou
 * { porque } (desabilitada, com o motivo escrito para a Diretoria). Uma só tabela para a tela e para o servidor.
 */
function Lic_kanbanRegra_(de, para) {
  de = Lic_up_(de); para = Lic_up_(para);
  var col = LIC_KANBAN_COLUNAS.filter(function (c) { return c.codigo === para; })[0];
  if (!col) return { porque: 'Essa etapa não existe no Kanban.' };
  var deCol = de === 'DESCARTADA' ? 'DECISAO' : de;
  if (deCol === para) return { porque: 'A oportunidade já está em ' + col.nome + '.' };
  // Central de disputas (SGO_Licitacoes_Disputa.js)
  if (para === 'DISPUTA') return de === 'DESCARTADA' ? { porque: 'Reabra primeiro (volta para o Radar, com o motivo); depois abra a disputa na ficha, aba Disputa.' }
    : de === 'RESULTADO' || de === 'CONTRATO' ? { porque: 'A disputa desta licitação já terminou: o resultado fica na ficha, aba Disputa.' }
    : { porque: 'A disputa abre na ficha, aba Disputa: ela exige a proposta emitida, a simulação de preço e o piso de cada item. O Kanban não abre disputa sem esses dados.', aba: 'disputa' };
  if (para === 'RESULTADO') return de === 'DISPUTA' ? { acao: 'resultado', nome: 'Concluir o resultado (todos os itens registrados)' } : { porque: 'Só uma licitação em Disputa vai para Resultado: registre o resultado de cada item na ficha, aba Disputa.', aba: de === 'CONTRATO' ? '' : 'disputa' };
  // contratos (02/11/2026, SGO_Licitacoes_Contratos.js): o contrato é registrado na aba Contrato (número, vigência, valores e o arquivo assinado)
  if (para === 'CONTRATO') return de === 'RESULTADO' ? { porque: 'O contrato é registrado na ficha, aba Contrato (número, vigência, valores e o arquivo assinado). Ao gravar, com o motivo, a licitação vai para Contrato.', aba: 'contrato' }
    : de === 'DESCARTADA' ? { porque: 'Reabra primeiro (volta para o Radar, com o motivo).' } : de === 'DISPUTA' ? { porque: 'Conclua o resultado na aba Disputa; depois registre o contrato na aba Contrato.', aba: 'disputa' }
    : { porque: 'Sem o resultado da disputa no SGO+, o contrato é registrado manualmente na ficha, aba Contrato (com o motivo e a fonte do resultado).', aba: 'contrato' };
  if (de === 'CONTRATO') return { porque: 'O contrato está registrado: a licitação fica em Contrato. Mudanças são versões (correção, aditivo, apostilamento, encerramento) na aba Contrato.', aba: 'contrato' };
  if (de === 'DISPUTA') return { porque: 'A disputa está aberta: registre o resultado de cada item na ficha, aba Disputa (item que a Diretoria desistiu também recebe o resultado, por exemplo "perdido"). Depois, "Concluir o resultado" leva para Resultado.', aba: 'disputa' };
  if (col.futura) return { porque: col.futura + ' Até lá, nenhuma licitação entra em ' + col.nome + ' pelo SGO+.' };
  if (de === 'RADAR' && para === 'ANALISE') return { acao: 'enviarAnalise', nome: 'Enviar para análise' };
  if ((de === 'RADAR' || de === 'ANALISE') && para === 'DECISAO') return { acao: 'descartar', nome: 'Descartar (decisão da Diretoria)' };
  if (de === 'DESCARTADA' && para === 'RADAR') return { acao: 'reabrir', nome: 'Reabrir (volta para o radar)' };
  if (de === 'ANALISE' && para === 'RADAR') return { porque: 'Não há volta direta de Em análise para o Radar. Se a oportunidade não serve, descarte com o motivo (vai para Decisão); se mudar de ideia, reabra depois.' };
  if (de === 'DESCARTADA' && para === 'ANALISE') return { porque: 'Reabra primeiro (volta para o Radar, com o motivo) e depois envie para análise.' };
  if (de === 'DECISAO') return { porque: '"Participar" e as etapas seguintes chegam com a etapa de preços e proposta.' };
  return { porque: 'Essa passagem ainda não existe no SGO+.' };
}
/** Todas as combinações (situação × coluna), para a tela desenhar o "Mover para" sem perguntar ao servidor a cada cartão. */
function Lic_kanbanRegras_() {
  var m = {};
  ['RADAR', 'ANALISE', 'DECISAO', 'DESCARTADA', 'PROPOSTA', 'DISPUTA', 'RESULTADO', 'CONTRATO'].forEach(function (de) {
    LIC_KANBAN_COLUNAS.forEach(function (c) { m[de + '>' + c.codigo] = Lic_kanbanRegra_(de, c.codigo); });
  });
  m.participar = { porque: '"Participar" chega na etapa de preços e proposta: exige a tabela de preços de licitação e o preço mínimo aprovado pela Diretoria. Por enquanto a decisão registrável é descartar, com o motivo.' };
  return m;
}

// ------------------------------------------------------------ filtros comuns
function Lic_temNota_(l) { return !(l.NOTA === '' || l.NOTA === null || l.NOTA === undefined || !isFinite(Number(l.NOTA))); }
function Lic_faixaNota_(l) {
  if (Number(l.TRAVAS_A_CONFIRMAR) > 0 || Lic_s_(l.NOTA_CLASSE) === 'TRAVA_A_CONFIRMAR') return 'TRAVA';
  if (!Lic_temNota_(l)) return 'SEM';
  var c = Lic_s_(l.NOTA_CLASSE);
  return ['ALTA', 'MEDIA', 'BAIXA', 'DESCARTE'].indexOf(c) >= 0 ? c : (Number(l.NOTA) >= 75 ? 'ALTA' : Number(l.NOTA) >= 50 ? 'MEDIA' : Number(l.NOTA) >= 30 ? 'BAIXA' : 'DESCARTE');
}
/** f = { uf: ''|'PRIO'|UF, nota: ''|ALTA|MEDIA|BAIXA|DESCARTE|TRAVA|SEM, prazo: ''|'7'|'30'|'VENCIDO'|'SEM', responsavel: ''|'SEM'|id, busca }. */
function Lic_filtrosKanban_(d) {
  d = d || {};
  // revisão de 02/11/2026: andamento = '1' esconde as descartadas (os números do Painel contam só as em andamento; o clique
  // tem de abrir a mesma lista); ia = situação da última análise por IA da oportunidade (CONCLUIDA, RECUSADA, ERRO)
  var f = { uf: Lic_up_(d.uf), nota: Lic_up_(d.nota), prazo: Lic_up_(d.prazo), responsavel: Lic_s_(d.responsavel), busca: Lic_texto_(d.busca, 100).toLowerCase(),
    andamento: Lic_s_(d.andamento) === '1' || d.andamento === true ? '1' : '', ia: Lic_up_(d.ia) };
  if (f.uf && f.uf !== 'PRIO' && LIC_UFS.indexOf(f.uf) < 0) f.uf = '';
  if (['ALTA', 'MEDIA', 'BAIXA', 'DESCARTE', 'TRAVA', 'SEM'].indexOf(f.nota) < 0) f.nota = '';
  if (['7', '30', 'VENCIDO', 'SEM'].indexOf(f.prazo) < 0) f.prazo = '';
  if (['CONCLUIDA', 'RECUSADA', 'ERRO'].indexOf(f.ia) < 0) f.ia = '';
  return f;
}
function Lic_passaFiltro_(l, f, agoraMs) {
  var uf = Lic_up_(l.UF);
  if (f.andamento && Lic_s_(l.SITUACAO) === 'DESCARTADA') return false;
  if (f.ia && Lic_up_(l.ANALISE_SITUACAO) !== f.ia) return false;
  if (f.uf === 'PRIO' && LIC_UFS_PRIORIDADE.indexOf(uf) < 0) return false;
  if (f.uf && f.uf !== 'PRIO' && uf !== f.uf) return false;
  if (f.nota && Lic_faixaNota_(l) !== f.nota) return false;
  if (f.prazo) {
    var enc = Date.parse(Lic_s_(l.ENCERRAMENTO_ISO));
    if (f.prazo === 'SEM') { if (isFinite(enc)) return false; }
    else if (!isFinite(enc)) return false;
    else if (f.prazo === 'VENCIDO' && enc >= agoraMs) return false;
    else if (f.prazo === '7' || f.prazo === '30') {
      // revisão de 02/11/2026: por dia de calendário em Brasília, de hoje até hoje + 7 (ou + 30), como a Agenda
      var hoje = Lic_brDe_(agoraMs).dia, dia = Lic_brDe_(enc).dia;
      if (dia < hoje || dia > Lic_somarDia_(hoje, Number(f.prazo))) return false;
    }
  }
  if (f.responsavel === 'SEM' && Lic_s_(l.RESPONSAVEL_ID)) return false;
  if (f.responsavel && f.responsavel !== 'SEM' && Lic_s_(l.RESPONSAVEL_ID) !== f.responsavel) return false;
  if (f.busca && [l.ORGAO_NOME, l.OBJETO, l.NUMERO_CONTROLE_PNCP, l.MUNICIPIO, l.CODIGO].join(' ').toLowerCase().indexOf(f.busca) < 0) return false;
  return true;
}

// ------------------------------------------------------------ Kanban
function Lic_cartaoKanban_(l, agoraMs) {
  var desde = Date.parse(Lic_s_(l.SITUACAO_DESDE)), obj = Lic_s_(l.OBJETO), est = typeof Lic_estadoFonte_ === 'function' ? Lic_estadoFonte_(l.SITUACAO_FONTE) : '';
  return {
    id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 160), objeto: obj.length > 160 ? obj.slice(0, 159) + '…' : obj, uf: Lic_up_(l.UF), municipio: Lic_s_(l.MUNICIPIO),
    situacao: Lic_s_(l.SITUACAO), coluna: Lic_colunaKanban_(l), travada: Lic_s_(l.SITUACAO) === 'RADAR' && Lic_s_(l.TRIAGEM) === 'TRAVADA', estadoFonte: est || '',
    encerramento: Lic_s_(l.ENCERRAMENTO_PROPOSTAS), encerramentoIso: Lic_s_(l.ENCERRAMENTO_ISO), fusoPresumido: Lic_s_(l.FUSO_PRESUMIDO) === 'SIM',
    nota: Lic_temNota_(l) ? Number(l.NOTA) : null, notaClasse: Lic_s_(l.NOTA_CLASSE), travasAConfirmar: Number(l.TRAVAS_A_CONFIRMAR) || 0, faixaNota: Lic_faixaNota_(l),
    responsavelId: Lic_s_(l.RESPONSAVEL_ID), responsavel: Lic_s_(l.RESPONSAVEL_NOME), valor: l.VALOR_ESTIMADO === '' || l.VALOR_ESTIMADO === null || l.VALOR_ESTIMADO === undefined ? null : Number(l.VALOR_ESTIMADO),
    diasNaEtapa: isFinite(desde) ? Math.max(0, Math.floor((agoraMs - desde) / 864e5)) : null, prioridade: Number(l.PRIORIDADE_UF) || 0,
    descarte: Lic_s_(l.SITUACAO) === 'DESCARTADA' ? { motivo: Lic_texto_(l.DESCARTE_MOTIVO, 300), por: Lic_s_(l.DESCARTE_POR_NOME), em: Lic_s_(l.DESCARTE_EM) } : null
  };
}
/** Ordem dentro da coluna: prazo mais perto primeiro (vencidos e sem prazo no fim); na Decisão, o descarte mais recente primeiro. */
function Lic_ordemKanban_(agora) {
  return function (a, b) {
  if (a.coluna === 'DECISAO' && a.descarte && b.descarte) return (b.descarte.em || '') < (a.descarte.em || '') ? -1 : (b.descarte.em || '') > (a.descarte.em || '') ? 1 : 0;
  var ea = a.encerramentoIso && a.encerramentoIso >= agora ? a.encerramentoIso : '9' + (a.encerramentoIso || '999'), eb = b.encerramentoIso && b.encerramentoIso >= agora ? b.encerramentoIso : '9' + (b.encerramentoIso || '999');
  if (ea !== eb) return ea < eb ? -1 : 1;
  return b.prioridade - a.prioridade;
  };
}

/** Tela Kanban: d = filtros (Lic_filtrosKanban_). Uma leitura de LIC_OPORTUNIDADES. */
function Lic_kanban_(eu, d) {
  var t0 = Date.now(), agoraMs = t0, f = Lic_filtrosKanban_(d), todas = Lic_ativas_();
  var cols = {}, fora = { descartadasRegra: 0, situacaoDesconhecida: 0 }, resp = {}, ufs = {}, total = 0, semFiltro = 0;
  LIC_KANBAN_COLUNAS.forEach(function (c) { cols[c.codigo] = []; });
  todas.forEach(function (l) {
    var col = Lic_colunaKanban_(l);
    // revisão de 02/11/2026: situação que não é etapa do Kanban também é contada (nunca some sem aviso)
    if (!col) { if (Lic_s_(l.SITUACAO) === 'DESCARTADA') fora.descartadasRegra++; else fora.situacaoDesconhecida++; return; }
    semFiltro++;
    if (Lic_s_(l.RESPONSAVEL_ID)) resp[Lic_s_(l.RESPONSAVEL_ID)] = Lic_s_(l.RESPONSAVEL_NOME) || Lic_s_(l.RESPONSAVEL_ID);
    if (Lic_up_(l.UF)) ufs[Lic_up_(l.UF)] = (ufs[Lic_up_(l.UF)] || 0) + 1;
    if (!Lic_passaFiltro_(l, f, agoraMs)) return;
    cols[col].push(Lic_cartaoKanban_(l, agoraMs)); total++;
  });
  var ordem = Lic_ordemKanban_(new Date(agoraMs).toISOString());
  var colunas = LIC_KANBAN_COLUNAS.map(function (c) {
    var l = cols[c.codigo].sort(ordem);
    return { codigo: c.codigo, nome: c.nome, dica: c.dica || '', futura: c.futura || '', qtd: l.length, cartoes: l.slice(0, LIC_KANBAN_MAX_COLUNA), cortados: Math.max(0, l.length - LIC_KANBAN_MAX_COLUNA) };
  });
  return { colunas: colunas, total: total, semFiltro: semFiltro, foraDoQuadro: fora, filtros: f, regras: Lic_kanbanRegras_(),
    responsaveis: Object.keys(resp).map(function (k) { return { id: k, nome: resp[k] }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
    ufs: Object.keys(ufs).sort(), linhasLidas: todas.length, ms: Date.now() - t0, geradoEm: Lic_agora_() };
}

/**
 * Mover no Kanban: d = { id, para (coluna), situacao (a que a tela viu), motivo }. Só as transições que existem; motivo
 * obrigatório (10 letras ou mais) em todas; histórico com a fonte "Kanban". Recusa sempre diz o porquê e "Nada foi alterado".
 */
function Lic_kanbanMover_(eu, d) {
  d = d || {};
  var l = Lic_acharOp_(d.id), de = Lic_s_(l.SITUACAO), para = Lic_up_(d.para);
  if (Lic_s_(d.situacao) && Lic_s_(d.situacao) !== de) throw new Error('Não foi possível mover: a oportunidade ' + Lic_s_(l.CODIGO) + ' está agora em "' + (LIC_SITUACAO_NOMES[de] || de) + '" (alguém mudou agora há pouco). Toque em "Atualizar" e confira. Nada foi alterado');
  var regra = Lic_kanbanRegra_(de, para);
  if (!regra.acao) throw new Error('Não foi possível mover: ' + regra.porque.replace(/[.\s]+$/, '') + '. Nada foi alterado');
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva o motivo da mudança de etapa (pelo menos 10 letras): ele fica no histórico com o seu nome e a data. Nada foi alterado');
  var r;
  if (regra.acao === 'enviarAnalise') r = Lic_enviarAnalise_(eu, { id: l.ID, obs: motivo, fonte: 'Kanban' });
  else if (regra.acao === 'descartar') r = Lic_descartar_(eu, { id: l.ID, motivo: motivo, fonte: 'Kanban' });
  else if (regra.acao === 'resultado') {
    if (typeof LicD_concluir_ !== 'function') throw new Error('Não foi possível mover: a Central de disputas não está disponível neste ambiente. Nada foi alterado');
    try { LicD_garantirAbas_(); } catch (e) {}
    r = LicD_concluir_(eu, { id: l.ID, motivo: motivo, fonte: 'Kanban' });
  }
  else r = Lic_reabrir_(eu, { id: l.ID, motivo: motivo, fonte: 'Kanban' });
  var nomes = {}; LIC_KANBAN_COLUNAS.forEach(function (c) { nomes[c.codigo] = c.nome; });
  return Object.assign({}, r, { de: de, para: para, acao: regra.acao, texto: Lic_s_(l.CODIGO) + ' foi de ' + (nomes[Lic_colunaKanban_(l)] || de) + ' para ' + (nomes[para] || para) + '. Registrado no histórico com o motivo.' });
}

// ------------------------------------------------------------ Gantt
/**
 * Dia e hora em Brasília de um instante, por deslocamento fixo (-03:00; sem horário de verão desde 2019, como a agenda e
 * Lic_hojeSp_ assumem). O mesmo resultado de Lic_diaSp_/Lic_horaSp_, sem formatar data a data (500+ prazos por tela).
 */
function Lic_brDe_(ms) { var t = new Date(ms - 3 * 3600e3).toISOString(); return { dia: t.slice(0, 10), hora: t.slice(11, 16) }; }
/** Dia "aaaa-mm-dd" que existe no calendário (31/02 ou 13º mês caem no padrão: ''). */
function Lic_diaValido_(v) {
  var t = Lic_s_(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  var ms = Date.parse(t + 'T12:00:00Z');
  return isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === t ? t : '';
}
/**
 * Tela Gantt: d = { zoom: 'semana'|'mes', inicio: 'aaaa-mm-dd' (opcional), uf, etapa (situação), natureza }. Uma leitura de
 * LIC_OPORTUNIDADES e uma de LIC_EVENTOS. Linhas = oportunidades (sem as descartadas) com prazo dentro da janela (com a barra
 * do recebimento das propostas; as que só estão recebendo propostas, sem prazo na janela, são contadas); marcos = prazos valendo (sem as versões substituídas e os cancelados; suspensos riscados).
 */
function Lic_gantt_(eu, d) {
  d = d || {};
  var t0 = Date.now(), agoraMs = t0, hoje = Lic_diaSp_(new Date(t0).toISOString()), zoom = Lic_s_(d.zoom) === 'mes' ? 'mes' : 'semana';
  var dias = zoom === 'mes' ? 35 : 9, de = Lic_diaValido_(d.inicio) || Lic_somarDia_(hoje, zoom === 'mes' ? -3 : -1), ate = Lic_somarDia_(de, dias - 1);
  var f = Lic_filtrosKanban_({ uf: d.uf }), etapa = Lic_up_(d.etapa), natureza = Lic_up_(d.natureza);
  if (['RADAR', 'ANALISE', 'DECISAO', 'PROPOSTA', 'DISPUTA', 'RESULTADO', 'CONTRATO', 'TRAVADAS'].indexOf(etapa) < 0) etapa = '';
  if (['CONFIRMADO', 'CALCULADO', 'PREVISTO'].indexOf(natureza) < 0) natureza = '';
  var ops = {}, linhas = {}, ordem = [], pendentes = [], cont = { eventosLidos: 0, marcos: 0, foraDaJanela: 0 };
  var todas = Lic_ativas_(), janIni = Date.parse(de + 'T00:00:00Z') - 864e5, janFim = Date.parse(ate + 'T00:00:00Z') + 2 * 864e5;
  todas.forEach(function (l) {
    if (Lic_s_(l.SITUACAO) === 'DESCARTADA') return;
    var travada = Lic_s_(l.SITUACAO) === 'RADAR' && Lic_s_(l.TRIAGEM) === 'TRAVADA';
    if (etapa === 'TRAVADAS' ? !travada : etapa && Lic_s_(l.SITUACAO) !== etapa) return;
    if (!Lic_passaFiltro_(l, f, agoraMs)) return;
    ops[Lic_s_(l.ID)] = l;
  });
  var linhaDe = function (l) {
    var id = Lic_s_(l.ID);
    if (!linhas[id]) {
      var ab = /^(\d{4}-\d{2}-\d{2})/.exec(Lic_s_(l.ABERTURA_PROPOSTAS)), em = Date.parse(Lic_s_(l.ENCERRAMENTO_ISO)), fim = isFinite(em) ? Lic_brDe_(em).dia : '';
      linhas[id] = { id: id, codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 120), uf: Lic_up_(l.UF), municipio: Lic_s_(l.MUNICIPIO), situacao: Lic_s_(l.SITUACAO),
        situacaoNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || '', travada: Lic_s_(l.SITUACAO) === 'RADAR' && Lic_s_(l.TRIAGEM) === 'TRAVADA', nota: Lic_temNota_(l) ? Number(l.NOTA) : null, notaClasse: Lic_s_(l.NOTA_CLASSE),
        inicio: ab ? ab[1] : '', fim: fim, marcos: [], proximo: '' };
      ordem.push(id);
    }
    return linhas[id];
  };
  Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) {
    cont.eventosLidos++;
    var l = ops[Lic_s_(e.OPORTUNIDADE_ID)], sit = Lic_up_(e.SITUACAO);
    if (!l || sit === 'RETIFICADO' || sit === 'CANCELADO') return;
    var nat = Lic_up_(e.NATUREZA);
    if (natureza && nat !== natureza) return;
    var iso = Lic_s_(e.QUANDO_ISO);
    if (!iso) { if (pendentes.length < 60) pendentes.push({ opId: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 120), nome: Lic_s_(e.NOME), obs: Lic_texto_(e.OBS, 300) }); cont.semData = (cont.semData || 0) + 1; return; }
    // pré-filtro pelo instante (barato) antes de converter o dia em Brasília (o dia exato decide nas bordas)
    var ms = Date.parse(iso);
    if (!isFinite(ms) || ms < janIni || ms > janFim) { cont.foraDaJanela++; return; }
    var br = Lic_brDe_(ms), dia = br.dia;
    if (dia < de || dia > ate) { cont.foraDaJanela++; return; }
    var diaTodo = Lic_up_(e.DIA_TODO) === 'SIM';
    var m = { id: Lic_s_(e.ID), tipo: Lic_s_(e.TIPO), nome: Lic_s_(e.NOME), natureza: nat, situacao: sit, nivel: Lic_up_(e.NIVEL), iso: iso, dia: dia, hora: diaTodo ? '' : br.hora, diaTodo: diaTodo,
      fusoPresumido: Lic_up_(e.FUSO_PRESUMIDO) === 'SIM', passou: isFinite(ms) && ms < agoraMs, versao: Number(e.VERSAO) || 1 };
    var ln = linhaDe(l);
    ln.marcos.push(m); cont.marcos++;
    if (!m.passou && sit === 'ATIVO' && (!ln.proximo || iso < ln.proximo)) ln.proximo = iso;
  });
  // recebimento das propostas que cruza a janela sem nenhum prazo dentro dela: não vira linha (seria só a barra, sem nada a
  // fazer na janela); só é contado, e a tela diz quantas são (aparecem quando a janela chegar ao prazo)
  cont.soRecebimento = 0;
  Object.keys(ops).forEach(function (id) {
    if (linhas[id]) return;
    var l = ops[id], ab = /^(\d{4}-\d{2}-\d{2})/.exec(Lic_s_(l.ABERTURA_PROPOSTAS)), em = Date.parse(Lic_s_(l.ENCERRAMENTO_ISO)), fim = isFinite(em) ? Lic_brDe_(em).dia : '';
    if (ab && fim && ab[1] <= ate && fim >= de) cont.soRecebimento++;
  });
  var lista = ordem.map(function (id) { var x = linhas[id]; x.marcos.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; }); return x; })
    .sort(function (a, b) { var pa = a.proximo || '9' + (a.fim || ''), pb = b.proximo || '9' + (b.fim || ''); return pa < pb ? -1 : pa > pb ? 1 : 0; });
  var fer = typeof Lic_feriadosEntre_ === 'function' ? Lic_feriadosEntre_(de, ate) : [];
  return { zoom: zoom, de: de, ate: ate, hoje: hoje, dias: dias, linhas: lista.slice(0, LIC_GANTT_MAX_LINHAS), cortadas: Math.max(0, lista.length - LIC_GANTT_MAX_LINHAS), total: lista.length,
    pendentes: pendentes, contagens: cont, feriados: fer, filtros: { uf: f.uf, etapa: etapa, natureza: natureza }, naturezas: LIC_NATUREZAS,
    linhasLidas: todas.length, ms: Date.now() - t0, geradoEm: Lic_agora_() };
}

// ------------------------------------------------------------ Painel (Dashboard)
function Lic_conexoesPainel_(agoraMs) {
  if (!Lic_temColetor_() || typeof SGO_LICITACOES.conexoes !== 'function') return null;
  try {
    var desde = agoraMs - 864e5, l = SGO_LICITACOES.conexoes({ limite: 300 }) || [], r = { chamadas24h: 0, erros24h: 0, lidas: l.length, ultimoErro: '' };
    l.forEach(function (c) {
      if (!(Date.parse(Lic_s_(c.inicio)) >= desde)) return;
      r.chamadas24h++;
      var st = Number(c.status), erro = Lic_s_(c.erro) || !(st >= 200 && st < 300);
      if (erro) { r.erros24h++; if (!r.ultimoErro) r.ultimoErro = Lic_texto_(Lic_s_(c.portal) + ' ' + Lic_s_(c.rota) + ': ' + (Lic_s_(c.erro) || 'HTTP ' + (c.status === null ? 'sem resposta' : c.status)), 300); }
    });
    // revisão de 02/11/2026: a leitura traz as 300 mais recentes; se a 300ª ainda é das últimas 24 h, o número real é maior
    r.noLimite = l.length >= 300 && Date.parse(Lic_s_(l[l.length - 1].inicio)) >= desde;
    return r;
  } catch (e) { return { erroLeitura: 'Não foi possível ler o registro das chamadas agora (' + Lic_s_(e && e.message) + ').' }; }
}

/**
 * Só as colunas pedidas de uma aba (03/11/2026, revisão independente): o Painel conta LIC_ANALISES sem trazer RESPOSTAS_IA_JSON,
 * AFIRMACOES_JSON e os outros textos grandes (uma leitura por coluna, a partir da linha 2). Linha toda vazia fica fora, como em
 * SGO_DATA.getAll; data vira texto pelo mesmo formato. Sem a planilha (ou qualquer erro): a leitura inteira de sempre (Lic_ler_).
 */
function Lic_lerColunas_(aba, colunas) {
  try {
    if (typeof SGO_DATA.getSheet !== 'function' || typeof SGO_DATA.getHeaders !== 'function') return Lic_ler_(aba);
    var sh = SGO_DATA.getSheet(aba), cab = SGO_DATA.getHeaders(aba), n = sh.getLastRow() - 1;
    if (n < 1) return [];
    var cols = colunas.filter(function (c) { return cab.indexOf(c) >= 0; });
    var vals = cols.map(function (c) { return sh.getRange(2, cab.indexOf(c) + 1, n, 1).getValues(); });
    var out = [];
    for (var i = 0; i < n; i++) {
      var row = {}, vazia = true;
      cols.forEach(function (c, k) {
        var v = vals[k][i][0];
        if (Object.prototype.toString.call(v) === "[object Date]") v = typeof SGO_DATA.formatDateForOutput_ === 'function' ? SGO_DATA.formatDateForOutput_(v) : v.toISOString();
        row[c] = v; if (v !== '' && v !== null && v !== undefined) vazia = false;
      });
      if (!vazia) out.push(row);
    }
    return out;
  } catch (e) {
    if (/Aba não encontrada/i.test(String((e && e.message) || e))) return [];
    return Lic_ler_(aba);
  }
}
/** Tela Painel: números reais, cada um com a fonte e o destino do clique. */
function Lic_painel_(eu) {
  var t0 = Date.now(), agoraMs = t0, agoraIso = new Date(t0).toISOString(), hoje = Lic_diaSp_(agoraIso);
  var todas = Lic_ativas_(), ops = {}, etapas = {}, ufs = {}, notas = { ALTA: 0, MEDIA: 0, BAIXA: 0, DESCARTE: 0, TRAVA: 0, SEM: 0 }, k = { andamento: 0, descartadasRegra: 0, descartadasPessoa: 0, travadas: 0, travasAConfirmar: 0, comNota: 0, situacaoDesconhecida: 0 }, iaOp = { CONCLUIDA: 0, RECUSADA: 0, ERRO: 0 };
  LIC_KANBAN_COLUNAS.forEach(function (c) { etapas[c.codigo] = 0; });
  todas.forEach(function (l) {
    ops[Lic_s_(l.ID)] = l;
    var col = Lic_colunaKanban_(l), s = Lic_s_(l.SITUACAO);
    if (s === 'DESCARTADA') { if (col) k.descartadasPessoa++; else k.descartadasRegra++; }
    if (col) etapas[col]++; else if (s !== 'DESCARTADA') k.situacaoDesconhecida++;
    // revisão de 02/11/2026: análise por IA contada por oportunidade (a situação da última tentativa), só as do Kanban
    if (col && iaOp[Lic_up_(l.ANALISE_SITUACAO)] !== undefined) iaOp[Lic_up_(l.ANALISE_SITUACAO)]++;
    if (s === 'DESCARTADA') return;
    k.andamento++;
    if (s === 'RADAR' && Lic_s_(l.TRIAGEM) === 'TRAVADA') k.travadas++;
    var uf = Lic_up_(l.UF) || '—'; ufs[uf] = (ufs[uf] || 0) + 1;
    var fx = Lic_faixaNota_(l); notas[fx]++;
    if (fx === 'TRAVA') k.travasAConfirmar++;
    if (Lic_temNota_(l)) k.comNota++;
  });
  // prazos: a MESMA regra da Agenda (Hoje até hoje + 7 ou + 30, sem descartadas e sem travadas), para o número bater com a lista
  var ate7 = Lic_somarDia_(hoje, 7), ate30 = Lic_somarDia_(hoje, 30), janIni = Date.parse(hoje + 'T00:00:00Z') - 864e5, janFim = Date.parse(ate30 + 'T00:00:00Z') + 2 * 864e5, pz = { d7: 0, d30: 0, criticos7: 0, pendentes30: 0, porTipo7: {}, eventosLidos: 0, valendo: 0 };
  Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) {
    pz.eventosLidos++;
    var l = ops[Lic_s_(e.OPORTUNIDADE_ID)], sit = Lic_up_(e.SITUACAO);
    if (!l || sit === 'RETIFICADO') return;
    if (Lic_s_(l.SITUACAO) === 'DESCARTADA' || (Lic_s_(l.SITUACAO) === 'RADAR' && Lic_s_(l.TRIAGEM) === 'TRAVADA')) return;
    var iso = Lic_s_(e.QUANDO_ISO);
    // revisão de 02/11/2026: prazo sem data e não cancelado conta como pendente de confirmação (a mesma conta da Agenda)
    if (!iso) { if (sit !== 'CANCELADO') pz.pendentes30++; return; }
    var ms = Date.parse(iso);
    if (!isFinite(ms) || ms < janIni || ms > janFim) return;
    var dia = Lic_brDe_(ms).dia;
    if (dia < hoje || dia > ate30) return;
    if (sit === 'CANCELADO' && isFinite(ms) && ms < agoraMs) return;
    if (sit === 'ATIVO') pz.valendo++;
    pz.d30++;
    if (Lic_up_(e.NATUREZA) === 'PREVISTO' && sit === 'ATIVO') pz.pendentes30++;
    if (dia <= ate7) {
      pz.d7++;
      if (Lic_up_(e.NIVEL) === 'CRITICO' && sit === 'ATIVO') pz.criticos7++;
      // 03/11/2026: agrupado pelo código do tipo (o clique abre a Agenda filtrada por ele)
      var tp = Lic_s_(e.TIPO), nm = (LIC_EVENTO_TIPOS[tp] || {}).nome || Lic_s_(e.NOME) || tp; if (!pz.porTipo7[tp]) pz.porTipo7[tp] = { nome: nm, n: 0 }; pz.porTipo7[tp].n++;
    }
  });
  var semC = typeof Lic_alertasSemCiencia_ === 'function' ? Lic_alertasSemCiencia_(null) : [];
  // análises por IA: uma linha por tentativa registrada (LIC_ANALISES); tempo médio só das que têm a medida (DURACAO_MS, desde 02/11/2026)
  var ia = { concluidas: iaOp.CONCLUIDA, recusadas: iaOp.RECUSADA, erro: iaOp.ERRO, total: 0, tentativas: { CONCLUIDA: 0, RECUSADA: 0, ERRO: 0 }, medidas: 0, somaMs: 0, ultima: '' };
  Lic_lerColunas_(LIC_ABAS.ANALISES, ['OPORTUNIDADE_ID', 'SITUACAO', 'DURACAO_MS', 'CRIADO_EM']).forEach(function (a) {
    ia.total++;
    var s = Lic_up_(a.SITUACAO);
    if (ia.tentativas[s] !== undefined) ia.tentativas[s]++;
    var dur = Number(a.DURACAO_MS); if (a.DURACAO_MS !== '' && a.DURACAO_MS !== null && a.DURACAO_MS !== undefined && isFinite(dur) && dur > 0) { ia.medidas++; ia.somaMs += dur; }
    if (Lic_s_(a.CRIADO_EM) > ia.ultima) ia.ultima = Lic_s_(a.CRIADO_EM);
  });
  ia.tempoMedioMs = ia.medidas ? Math.round(ia.somaMs / ia.medidas) : null; delete ia.somaMs;
  var portais = { total: 0, operacionais: 0, restricoes: 0, falha: 0, ligados: 0, emTeste: 0 };
  Lic_ler_(LIC_ABAS.PORTAIS).forEach(function (p) {
    portais.total++;
    var s = Lic_s_(p.SITUACAO);
    if (s === 'Operacional') portais.operacionais++; else if (s === 'Operacional com restrições') portais.restricoes++; else if (s === 'Falha') portais.falha++; else if (s === 'Em teste') portais.emTeste++;
    if (Lic_up_(p.LIGADO) === 'SIM') portais.ligados++;
  });
  var col = Lic_situacaoColetor_(), cx = Lic_conexoesPainel_(agoraMs);
  var rotasFalha = col && col.rotas ? col.rotas.filter(function (r) { return Number(r.falhasSeguidas) > 0; }).length : 0;
  var nomes = {}; LIC_KANBAN_COLUNAS.forEach(function (c) { nomes[c.codigo] = c.nome; });
  var ordemUf = function (a, b) { var pa = LIC_UFS_PRIORIDADE.indexOf(a), pb = LIC_UFS_PRIORIDADE.indexOf(b); if (pa >= 0 || pb >= 0) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb); return ufs[b] - ufs[a] || (a < b ? -1 : 1); };
  var listaUf = LIC_UFS_PRIORIDADE.concat(Object.keys(ufs).filter(function (u) { return LIC_UFS_PRIORIDADE.indexOf(u) < 0; })).sort(ordemUf)
    .map(function (u) { return { uf: u, n: ufs[u] || 0, prioridade: LIC_UFS_PRIORIDADE.indexOf(u) >= 0, grupo: LIC_UFS_GRUPO[u] || '' }; });
  var linhasOp = todas.length;
  return {
    hoje: hoje, geradoEm: agoraIso, ms: Date.now() - t0,
    etapas: { itens: LIC_KANBAN_COLUNAS.map(function (c) { return { codigo: c.codigo, nome: c.nome, n: etapas[c.codigo], futura: !!c.futura }; }), andamento: k.andamento, travadas: k.travadas, descartadasRegra: k.descartadasRegra, descartadasPessoa: k.descartadasPessoa, situacaoDesconhecida: k.situacaoDesconhecida,
      fonte: 'LIC_OPORTUNIDADES, coluna SITUACAO (' + linhasOp + ' oportunidades lidas). Decisão = descartadas pela Diretoria; as descartadas só pela regra ficam fora do Kanban.' },
    ufs: { itens: listaUf, total: k.andamento, fonte: 'LIC_OPORTUNIDADES, coluna UF, das ' + k.andamento + ' em andamento (sem as descartadas). Prioridade da pontuação: GO e DF, vizinhos (MG, BA, TO, MT, MS) e RJ (decisão do dono, 01/11/2026).' },
    notas: { faixas: [{ codigo: 'ALTA', nome: 'Alta (75 a 100)', n: notas.ALTA }, { codigo: 'MEDIA', nome: 'Média (50 a 74)', n: notas.MEDIA }, { codigo: 'BAIXA', nome: 'Baixa (30 a 49)', n: notas.BAIXA },
      { codigo: 'DESCARTE', nome: 'Descarte (abaixo de 30 ou trava confirmada)', n: notas.DESCARTE }, { codigo: 'TRAVA', nome: 'Trava a confirmar', n: notas.TRAVA }, { codigo: 'SEM', nome: 'Sem nota da IA', n: notas.SEM }],
      comNota: k.comNota, fonte: 'LIC_OPORTUNIDADES, colunas NOTA, NOTA_CLASSE e TRAVAS_A_CONFIRMAR (nota da última análise por IA concluída), das ' + k.andamento + ' em andamento.' },
    prazos: { d7: pz.d7, d30: pz.d30, criticos7: pz.criticos7, pendentes30: pz.pendentes30, porTipo7: Object.keys(pz.porTipo7).map(function (t) { return { tipo: t, nome: pz.porTipo7[t].nome, n: pz.porTipo7[t].n }; }).sort(function (a, b) { return b.n - a.n; }),
      fonte: 'LIC_EVENTOS (' + pz.eventosLidos + ' linhas lidas): prazos com data de hoje até ' + Lic_somarDia_(hoje, 7).split('-').reverse().join('/') + ' (7 dias) e até ' + ate30.split('-').reverse().join('/') + ' (30 dias), horário de Brasília, sem versões substituídas, sem descartadas e sem travadas (a mesma regra da Agenda). Pendentes de confirmação: os da janela de 30 dias e os sem data (não cancelados), como no contador da Agenda.' },
    alertas: { semCiencia: semC.length, fonte: 'LIC_ALERTAS: enviados, sem ciência e com o prazo ainda por vir (a mesma regra da Central de alertas, aba "Sem ciência").' },
    // documentos de habilitação (SGO_Licitacoes_Habilitacao.js): vencimentos e pendências das licitações, com a fonte
    habilitacao: typeof LicH_resumo_ === 'function' ? LicH_resumo_() : null,
    travas: { n: k.travasAConfirmar, fonte: 'LIC_OPORTUNIDADES, coluna TRAVAS_A_CONFIRMAR maior que zero (a IA apontou trava e a Diretoria ainda não decidiu), das ' + k.andamento + ' em andamento.' },
    coletor: { noServidor: !!(col && col.noServidor), ligado: !!(col && col.ligado), ultimaRodadaEm: (col && col.ultimaRodadaEm) || '', ultimoSucessoEm: (col && col.ultimoSucessoEm) || '', ultimoErro: (col && col.ultimoErro) || '',
      falhasSeguidasPncp: col && col.falhasSeguidasPncp ? Number(col.falhasSeguidasPncp) : 0, rotasComFalha: rotasFalha, rotas: col && col.rotas ? col.rotas.length : 0, aviso: (col && (col.erroLeitura || (!col.noServidor ? col.texto : ''))) || '',
      conexoes: cx, portais: portais,
      fonte: 'Coletor do servidor (lic_coleta_estado: última rodada e falhas seguidas por rota), registro das chamadas (lic_conexoes_log: as 300 mais recentes, janela de 24 h; quando as 300 são todas das últimas 24 h, a tela mostra "300 ou mais") e LIC_PORTAIS (situação de cada um dos ' + portais.total + ' portais).' },
    // 03/11/2026: fila da análise automática (colunas ANALISE_PENDENTE_* de LIC_OPORTUNIDADES)
    ia: Object.assign(ia, { fila: typeof Lic_filaContagem_ === 'function' ? Lic_filaContagem_(todas) : null, fonte: 'LIC_OPORTUNIDADES, coluna ANALISE_SITUACAO (situação da última análise por IA de cada oportunidade do Kanban): concluída, recusada pelo verificador ou erro da IA. Total e tempo médio: LIC_ANALISES (' + ia.total + ' linhas, uma por tentativa). Tempo médio só das análises com a duração medida (gravada desde a etapa 4, 02/11/2026).' })
  };
}
