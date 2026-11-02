/****************************************************
 * SGO+ LICITAÇÕES — REGRA DE GUARDA (aprovada pelo dono em 02/11/2026; docs/LICITACOES_00, decisões de 02/11)
 *
 *   1. Oportunidade em que a Diretoria mexeu (qualquer ato de pessoa no histórico: análise, descarte manual, reabertura,
 *      arquivos pedidos ou abertos, análise por IA pedida; ou situação fora de "No radar"/"Descartada pela regra"):
 *      PARA SEMPRE, com o histórico e os arquivos do edital.
 *   2. Candidata ou travada nunca tocada por pessoa: 2 anos a partir da publicação (na falta da data de publicação, a
 *      primeira coleta, que é sempre depois); depois sai de LIC_OPORTUNIDADES.
 *   3. Descartada só pela regra, nunca tocada: a linha (resumo) fica 1 ano; depois sai de LIC_OPORTUNIDADES.
 *   Toda saída grava no LIC_HISTORICO o resumo do que saiu (órgão, objeto, valor, UF, modalidade, datas, número de controle,
 *   hash) e a regra. O histórico antigo da oportunidade não é apagado.
 *
 * O servidor (sgo_servidor/src/servicos/licitacoes/guarda.ts) faz a parte das tabelas lic_* (bruto em 30 dias, resumo em
 * 1 ano, registro das chamadas em 6 meses, arquivos com a vida da oportunidade) e SÓ apaga o que não está na lista de
 * protegidas que esta função devolve. Sem esta lista (legado falhou), o servidor não apaga nada das licitações.
 * Roda uma vez por semana, DENTRO do servidor principal (rota /interno/licitacoes/guarda, chamada pela manutenção de segunda
 * 06:30), em lotes; prévia = conta sem apagar.
 ****************************************************/

var LIC_GUARDA_VERSAO = 'GUARDA-2026-11-02';
/** Revisão de 02/11/2026: lotes pequenos (a trava geral é solta entre eles; outros módulos não esperam) e tempo máximo por
 *  execução (o resto fica para a semana seguinte; a execução no servidor tem 300 s). */
var LIC_GUARDA_LOTE = 20;
var LIC_GUARDA_TEMPO_MS = 200000;

/**
 * Reconciliação no início de cada execução: "SAIU_PELA_GUARDA" de linha que AINDA existe (execução cortada entre o registro
 * e a remoção) ganha um estorno no histórico ("GUARDA_ESTORNO"), uma vez só. Devolve quantas foram estornadas.
 */
function Lic_guardaReconciliar_(sistema) {
  var hist = Lic_ler_(LIC_ABAS.HISTORICO), ultimo = {};
  hist.forEach(function (h) {
    if (Lic_s_(h.ENTIDADE) !== 'OPORTUNIDADE' || ['SAIU_PELA_GUARDA', 'GUARDA_FALHOU', 'GUARDA_ESTORNO'].indexOf(Lic_s_(h.TIPO)) < 0) return;
    var id = Lic_s_(h.ENTIDADE_ID), a = ultimo[id];
    if (!a || Lic_s_(h.DATA) >= Lic_s_(a.DATA)) ultimo[id] = h;
  });
  var existe = {};
  Lic_ler_(LIC_ABAS.OPORTUNIDADES).forEach(function (l) { existe[Lic_s_(l.ID)] = l; });
  var n = 0;
  Object.keys(ultimo).forEach(function (id) {
    var h = ultimo[id];
    if (Lic_s_(h.TIPO) !== 'SAIU_PELA_GUARDA' || !existe[id]) return;
    Lic_historico_('OPORTUNIDADE', id, existe[id].CODIGO, 'GUARDA_ESTORNO', sistema, { texto: 'Estorno: o registro de saída pela guarda (' + Lic_s_(h.DATA) + ') não chegou a remover a linha (execução cortada). A oportunidade continua em LIC_OPORTUNIDADES e protegida.', versao: existe[id].VERSAO_FONTE, fonte: LIC_GUARDA_VERSAO });
    n++;
  });
  return n;
}

/** Datas em ISO aaaa-mm-dd a partir de hoje (fuso de Brasília). */
function Lic_guardaLimite_(hojeIso, anos) { var d = new Date(hojeIso + 'T12:00:00Z'); d.setUTCFullYear(d.getUTCFullYear() - anos); return d.toISOString().slice(0, 10); }
/** Data que conta para a guarda: publicação; na falta, a primeira coleta; na falta, a criação da linha. */
function Lic_guardaData_(l) { return (Lic_s_(l.PUBLICACAO_EM) || Lic_s_(l.PRIMEIRA_COLETA_EM) || Lic_s_(l.CRIADO_EM)).slice(0, 10); }

/** Ids das oportunidades com ato de pessoa no histórico (USUARIO_ID preenchido). */
function Lic_guardaTocadas_() {
  var t = {};
  Lic_ler_(LIC_ABAS.HISTORICO).forEach(function (h) { if (Lic_s_(h.ENTIDADE) === 'OPORTUNIDADE' && Lic_s_(h.USUARIO_ID)) t[Lic_s_(h.ENTIDADE_ID)] = 1; });
  return t;
}
/** Regra de cada linha: 1 (para sempre), 2 (candidata/travada intocada) ou 3 (descartada só pela regra, intocada). */
function Lic_guardaRegra_(l, tocadas) {
  var s = Lic_s_(l.SITUACAO), dor = Lic_s_(l.DESCARTE_ORIGEM);
  if (tocadas[Lic_s_(l.ID)] || Lic_s_(l.RESPONSAVEL_ID) || (s !== 'RADAR' && s !== 'DESCARTADA') || dor === 'PESSOA' || dor === 'REABERTA') return 1;
  if (s === 'DESCARTADA') return 3;
  return 2;
}

/**
 * A regra de guarda nas abas do legado. o: { previa, hoje (aaaa-mm-dd) }. Só execução interna: a rota do servidor principal
 * (/interno/licitacoes/guarda) chama no MESMO pool e com a MESMA trava (Lic_comTrava_) da sincronização do coletor.
 * Revisão de 02/11/2026:
 *   - o histórico é lido uma vez por lote, dentro da trava (não uma vez por linha);
 *   - o registro "SAIU_PELA_GUARDA" é gravado ANTES de remover (se a remoção falhar, fica "GUARDA_FALHOU" logo depois);
 *   - as listas que vão ao servidor são montadas no FIM, relendo LIC_OPORTUNIDADES: tudo que ainda existe vai em
 *     "existentes" (o servidor nunca apaga a contratação, os itens nem os arquivos delas) e o que é regra 1 ou 2 vai em
 *     "protegidas" (o bruto também fica). Linha que estava para sair e não saiu (tocada agora há pouco, remoção falhou)
 *     continua protegida.
 * Devolve { ok, protegidas, existentes, linhasLegado, saem, ficam, saiu, falhas, texto }.
 */
function Lic_guarda_(o) {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  o = o || {};
  try { Lic_garantirAbas_(); } catch (e) {}
  var hoje = Lic_s_(o.hoje) || Lic_hojeSp_(), lim2 = Lic_guardaLimite_(hoje, 2), lim1 = Lic_guardaLimite_(hoje, 1);
  var vence = function (l, regra) { var data = Lic_guardaData_(l); return regra === 2 ? !!data && data < lim2 : regra === 3 ? !!data && data < lim1 : false; };
  var tocadas = Lic_guardaTocadas_(), linhas = Lic_ler_(LIC_ABAS.OPORTUNIDADES);
  var r = { ok: true, previa: !!o.previa, versao: LIC_GUARDA_VERSAO, hoje: hoje, protegidas: [], existentes: [], linhasLegado: 0, saem: { regra2: 0, regra3: 0 }, ficam: { regra1: 0, regra2: 0, regra3: 0 }, saiu: [], falhas: [], estornos: 0, cortada: 0 };
  var inicio = Date.now(), limite = Number(o.tempoMs) || LIC_GUARDA_TEMPO_MS;
  if (!o.previa) r.estornos = Lic_comTrava_(function () { return Lic_guardaReconciliar_({ id: '', nome: 'Regra de guarda (manutenção semanal)' }); });
  var sair = [];
  linhas.forEach(function (l) {
    var regra = Lic_guardaRegra_(l, tocadas);
    if (vence(l, regra)) { sair.push({ id: Lic_s_(l.ID), regra: regra }); r.saem['regra' + regra]++; }
    else r.ficam['regra' + regra]++;
  });
  if (!o.previa) {
    var sistema = { id: '', nome: 'Regra de guarda (manutenção semanal)' };
    r.saem = { regra2: 0, regra3: 0 };
    // de baixo para cima (a remoção de uma linha não desloca as que ainda vão sair)
    var posicao = {};
    linhas.forEach(function (l, k) { posicao[Lic_s_(l.ID)] = k; });
    sair.sort(function (a, b) { return posicao[b.id] - posicao[a.id]; });
    for (var i = 0; i < sair.length; i += LIC_GUARDA_LOTE) {
      if (Date.now() - inicio > limite) { r.cortada = sair.length - i; break; }
      var lote = sair.slice(i, i + LIC_GUARDA_LOTE);
      Lic_comTrava_(function () {
        // relidos na trava, uma vez por lote: se alguém mexeu agora há pouco, a linha não sai
        var tocadasAgora = Lic_guardaTocadas_(), porId = {}, pos = {};
        Lic_ler_(LIC_ABAS.OPORTUNIDADES).forEach(function (l, k) { porId[Lic_s_(l.ID)] = l; pos[Lic_s_(l.ID)] = k; });
        // etapa 3 (revisão 02/11/2026): os prazos e os alertas da oportunidade saem junto (sem órfãos), com o resumo no histórico
        var filhos = { LIC_EVENTOS: {}, LIC_ALERTAS: {} };
        [LIC_ABAS.EVENTOS, LIC_ABAS.ALERTAS].forEach(function (aba) { if (!aba) return; Lic_ler_(aba).forEach(function (x) { var k = Lic_s_(x.OPORTUNIDADE_ID); (filhos[aba][k] = filhos[aba][k] || []).push(x); }); });
        lote.slice().sort(function (a, b) { return (pos[b.id] || 0) - (pos[a.id] || 0); }).forEach(function (x) {
          var l = porId[x.id];
          if (!l) return;
          var regra = Lic_guardaRegra_(l, tocadasAgora);
          if (regra !== x.regra || !vence(l, regra)) return;
          var resumo = { orgao: Lic_s_(l.ORGAO_NOME), objeto: Lic_texto_(l.OBJETO, 600), valor: l.VALOR_ESTIMADO, uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), modalidade: Lic_s_(l.MODALIDADE),
            publicacao: Lic_s_(l.PUBLICACAO_EM), primeiraColeta: Lic_s_(l.PRIMEIRA_COLETA_EM), encerramento: Lic_s_(l.ENCERRAMENTO_PROPOSTAS), numeroControlePncp: Lic_s_(l.NUMERO_CONTROLE_PNCP), hash: Lic_s_(l.VERSAO_HASH), triagem: Lic_s_(l.TRIAGEM), situacao: Lic_s_(l.SITUACAO) };
          // o registro vem ANTES da remoção (nunca sai sem deixar o resumo)
          Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'SAIU_PELA_GUARDA', sistema, { de: Lic_s_(l.SITUACAO), para: 'fora de LIC_OPORTUNIDADES',
            texto: (regra === 2 ? 'Regra 2 da guarda: candidata ou travada nunca tocada pela Diretoria, publicada há mais de 2 anos. ' : 'Regra 3 da guarda: descartada só pela regra do radar, nunca tocada, há mais de 1 ano. ') + 'Resumo: ' + JSON.stringify(resumo),
            versao: l.VERSAO_FONTE, fonte: LIC_GUARDA_VERSAO, hash: Lic_s_(l.VERSAO_HASH) });
          var saiu = false, erro = '';
          try { saiu = SGO_DATA.remove(LIC_ABAS.OPORTUNIDADES, l.ID) !== false; } catch (e) { erro = Lic_s_(e && e.message); }
          if (saiu) {
            r.saiu.push(Lic_s_(l.CODIGO)); r.saem['regra' + regra]++;
            var qt = {};
            [LIC_ABAS.EVENTOS, LIC_ABAS.ALERTAS].forEach(function (aba) {
              if (!aba) return;
              qt[aba] = 0;
              (filhos[aba][Lic_s_(l.ID)] || []).forEach(function (x) { try { if (SGO_DATA.remove(aba, x.ID) !== false) qt[aba]++; } catch (e) {} });
              r.filhos = r.filhos || {}; r.filhos[aba] = (r.filhos[aba] || 0) + qt[aba];
            });
            if (qt[LIC_ABAS.EVENTOS] || qt[LIC_ABAS.ALERTAS]) Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'SAIU_PELA_GUARDA_AGENDA', sistema, { texto: 'Junto com a oportunidade saíram ' + (qt[LIC_ABAS.EVENTOS] || 0) + ' prazo(s) de LIC_EVENTOS e ' + (qt[LIC_ABAS.ALERTAS] || 0) + ' alerta(s) de LIC_ALERTAS (regra ' + regra + ' da guarda).', versao: l.VERSAO_FONTE, fonte: LIC_GUARDA_VERSAO });
          }
          else {
            r.falhas.push(Lic_s_(l.CODIGO) + ': ' + (erro || 'a linha não foi removida'));
            Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'GUARDA_FALHOU', sistema, { texto: 'A remoção pela regra de guarda falhou (' + (erro || 'linha não removida') + '); a oportunidade continua em LIC_OPORTUNIDADES e protegida.', versao: l.VERSAO_FONTE, fonte: LIC_GUARDA_VERSAO });
          }
        });
      });
    }
  }
  // as listas para o servidor saem do que REALMENTE ficou (relido)
  var tocadasFim = Lic_guardaTocadas_(), saindo = {};
  if (o.previa) sair.forEach(function (x) { saindo[x.id] = 1; });
  Lic_ler_(LIC_ABAS.OPORTUNIDADES).forEach(function (l) {
    r.linhasLegado++;
    var chave = Lic_s_(l.CHAVE_FONTE);
    if (!chave) return;
    // na prévia, o que sairia conta como saído (o servidor conta o que sairia junto)
    if (o.previa && saindo[Lic_s_(l.ID)]) return;
    r.existentes.push(chave);
    if (Lic_guardaRegra_(l, tocadasFim) !== 3) r.protegidas.push(chave);
  });
  r.texto = 'Licitações (legado): ' + (o.previa ? 'prévia, nada apagado. ' : '') + 'Ficam: para sempre (Diretoria mexeu) ' + r.ficam.regra1 + '; candidatas e travadas dentro dos 2 anos ' + r.ficam.regra2 + '; descartadas pela regra dentro de 1 ano ' + r.ficam.regra3 +
    '. ' + (o.previa ? 'Sairiam' : 'Saíram') + ' de LIC_OPORTUNIDADES: ' + r.saem.regra2 + ' pela regra 2 e ' + r.saem.regra3 + ' pela regra 3' + (r.cortada ? '; ' + r.cortada + ' ficaram para a próxima semana (tempo máximo da execução)' : '') + (r.estornos ? '; ' + r.estornos + ' registro(s) de saída sem remoção estornado(s)' : '') + (r.falhas.length ? '; ' + r.falhas.length + ' falha(s), que continuam protegidas: ' + r.falhas.slice(0, 3).join(' | ') : '') + '.';
  return r;
}
