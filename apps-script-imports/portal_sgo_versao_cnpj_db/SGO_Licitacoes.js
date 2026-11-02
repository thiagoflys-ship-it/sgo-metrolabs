/****************************************************
 * SGO+ LICITAÇÕES — API DAS TELAS, SINCRONIZAÇÃO COM O COLETOR E AÇÕES (etapa 1, 01/11/2026)
 *
 * google.script.run: Licitacoes_api(sessionId, acao, dados). Nunca lança; toda recusa diz o quê, por quê e o que fazer.
 * O servidor confere a permissão em toda chamada (Diretoria e Administrador; SGO_Licitacoes_Config.js).
 *
 * Sincronização: o coletor do servidor chama Lic_aposColeta_(resumo) depois de cada rodada com mudança; o legado lê
 * pela global SGO_LICITACOES.listar({ desde }) as contratações com triagem CANDIDATA, TRAVADA ou DESCARTADA e espelha
 * em LIC_OPORTUNIDADES:
 *   - nova: entra como RADAR (candidata ou travada) ou DESCARTADA (descartada pela regra, com o motivo da regra);
 *   - versão nova da fonte (retificação): atualiza os campos da fonte e grava no histórico o que mudou (de → para),
 *     com a versão e o hash; a versão anterior continua no servidor (lic_contratacoes);
 *   - triagem mudou: atualiza os campos da triagem; só muda a situação enquanto ninguém mexeu (RADAR, ou DESCARTADA
 *     pela regra). O que a Diretoria decidiu (análise, descarte com motivo) nunca é desfeito pela regra.
 *
 * Etapa 2 (02/11/2026): arquivos do edital e nota 0–100 pela IA (SGO_Licitacoes_Analise.js). A ficha traz as abas
 * "Arquivos" (lista com SHA-256, abrir e baixar, situação da extração) e "Análise" (nota, critérios, fatos com fonte,
 * inferências, pendências, versão); a lista mostra a nota no cartão e ordena por nota.
 *
 * Etapa 3 (02/11/2026): agenda de prazos (SGO_Licitacoes_Agenda.js) e alertas com ciência e escalonamento
 * (SGO_Licitacoes_Alertas.js). Depois de cada sincronia, as oportunidades novas ou com versão nova da fonte têm a agenda
 * refeita (retificação = versão nova do prazo + alerta de mudança); a ficha ganha a aba "Prazos"; telas novas "Agenda e
 * prazos" e "Central de alertas"; "Regras dos alertas" em Portais e configurações.
 ****************************************************/

var LIC_CAMPOS_RETIFICACAO = { OBJETO: 'Objeto', ABERTURA_PROPOSTAS: 'Abertura das propostas', ENCERRAMENTO_PROPOSTAS: 'Encerramento das propostas', VALOR_ESTIMADO: 'Valor estimado',
  SITUACAO_FONTE: 'Situação na fonte', MODALIDADE: 'Modalidade', AMPARO_LEGAL: 'Amparo legal', LINK_ORIGEM: 'Link do sistema de origem' };
var LIC_UFS_PRIORIDADE = ['GO', 'DF', 'MG', 'BA', 'TO', 'MT', 'MS', 'RJ'];

var LIC_ACOES = {
  acesso: function (eu) { return { nivel: eu.nivel, nome: eu.nome }; },
  hoje: function (eu) { return Lic_hoje_(eu); },
  oportunidades: function (eu, d) { return Lic_oportunidades_(eu, d); },
  ficha: function (eu, d) { return Lic_ficha_(eu, d); },
  descartar: function (eu, d) { return Lic_descartar_(eu, d); },
  enviarAnalise: function (eu, d) { return Lic_enviarAnalise_(eu, d); },
  reabrir: function (eu, d) { return Lic_reabrir_(eu, d); },
  sincronizar: function (eu) { return { sincronia: Lic_sincronizar_(eu, { voltas: 5 }) }; },
  coletarAgora: function (eu) { return Lic_coletarAgora_(eu); },
  portais: function (eu) { return Lic_portais_(eu); },
  portalSalvar: function (eu, d) { return Lic_portalSalvar_(eu, d); },
  portalTestar: function (eu, d) { return Lic_portalTestar_(eu, d); },
  conexoes: function (eu, d) { return Lic_conexoes_(eu, d); },
  radarSalvar: function (eu, d) { return Lic_radarSalvar_(eu, d); },
  // etapa 2 (02/11/2026)
  arquivos: function (eu, d) { return Lic_arquivosAcao_(eu, d); },
  buscarArquivos: function (eu, d) { return Lic_buscarArquivos_(eu, d); },
  arquivoBaixar: function (eu, d) { return Lic_arquivoBaixar_(eu, d); },
  analise: function (eu, d) { return Lic_analiseAcao_(eu, d); },
  analisar: function (eu, d) { return Lic_analisarAcao_(eu, d); },
  // etapa 3 (02/11/2026)
  agenda: function (eu, d) { return Lic_agenda_(eu, d); },
  eventoConfirmar: function (eu, d) { return Lic_eventoConfirmar_(eu, d); },
  eventoAta: function (eu, d) { return Lic_eventoAta_(eu, d); },
  alertas: function (eu, d) { return Lic_alertasCentral_(eu, d); },
  alertaCiente: function (eu, d) { return Lic_alertaCienteTela_(eu, d); },
  alertaReenviar: function (eu, d) { return Lic_alertaReenviar_(eu, d); },
  alertasCfg: function (eu) { return { cfg: Lic_alertasCfgTela_() }; },
  alertasCfgSalvar: function (eu, d) { return Lic_alertasCfgSalvar_(eu, d); }
};

/** google.script.run: Licitacoes_api(sessionId, acao, dados). Nunca lança. */
function Licitacoes_api(sessionId, acao, dados) {
  try {
    var fn = LIC_ACOES[Lic_s_(acao)];
    if (!fn) return { ok: false, message: 'Ação de Licitações desconhecida (' + Lic_s_(acao) + '). Atualize a página (F5) e tente de novo.' };
    var eu = Lic_eu_(sessionId);
    if (acao !== 'acesso') Lic_exigir_(eu, 'abrir');
    if (eu.gestao) { try { Lic_garantirAbas_(); } catch (e) {} try { if (typeof Lic_garantirRotinaTalvez_ === 'function') Lic_garantirRotinaTalvez_(); } catch (e) {} }
    var r = fn(eu, dados || {});
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, semAcesso: /Diretoria e do Administrador/.test(m), message: (/^Não foi possível|^Escreva|^Escolha/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  }
}

function Lic_comTrava_(fn) {
  var trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { throw new Error('Não foi possível gravar agora: outra gravação de Licitações está em andamento. Espere alguns segundos e tente de novo; nada foi alterado'); }
  try { return fn(); } finally { try { trava.releaseLock(); } catch (e) {} }
}
function Lic_temColetor_() { return typeof SGO_LICITACOES !== 'undefined' && SGO_LICITACOES && typeof SGO_LICITACOES.listar === 'function'; }
var LIC_MSG_SEM_COLETOR = 'O coletor de licitações roda só no servidor próprio do SGO+ (sgo.metrolabs.com.br). Neste ambiente não há coleta; os portais e o histórico continuam disponíveis';

// ------------------------------------------------------------ sincronização com o coletor
/** O servidor chama depois de cada rodada do coletor (servicos/licitacoes/coletor.ts). Só execução interna. */
function Lic_aposColeta_(resumo) {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  try { Lic_garantirAbas_(); } catch (e) {}
  var r = Lic_sincronizar_(null);
  try { PropertiesService.getScriptProperties().setProperty('LIC_ULTIMA_COLETA', JSON.stringify({ em: Lic_agora_(), resumo: resumo || null, sincronia: r })); } catch (e) {}
  return r;
}

function Lic_camposFonte_(it) {
  var c = it.contratacao || {};
  return {
    CHAVE_FONTE: Lic_s_(it.chave), NUMERO_CONTROLE_PNCP: Lic_s_(c.numeroControlePncp), ID_COMPRAS_GOV: Lic_s_(it.idComprasGov || c.idComprasGov), PORTAL_ORIGEM: Lic_s_(it.portalOrigem),
    PORTAL_SESSAO: Lic_s_(c.portalSessao), PORTAL_SESSAO_NOME: Lic_s_(c.usuarioNome), ORGAO_CNPJ: Lic_s_(c.orgaoCnpj), ORGAO_NOME: Lic_texto_(c.orgaoNome, 300),
    UNIDADE_NOME: Lic_texto_(c.unidadeNome, 300), UF: Lic_up_(c.uf), MUNICIPIO: Lic_s_(c.municipio), MODALIDADE: Lic_s_(c.modalidadeNome), MODO_DISPUTA: Lic_s_(c.modoDisputa),
    AMPARO_LEGAL: Lic_s_(c.amparoNome), LEI: Lic_s_(c.lei), SRP: c.srp === true ? 'SIM' : c.srp === false ? 'NAO' : '', OBJETO: Lic_texto_(c.objeto, 4000),
    VALOR_ESTIMADO: c.valorEstimado === null || c.valorEstimado === undefined ? '' : Number(c.valorEstimado),
    ABERTURA_PROPOSTAS: Lic_s_(c.aberturaTexto), ENCERRAMENTO_PROPOSTAS: Lic_s_(c.encerramentoTexto), ENCERRAMENTO_ISO: Lic_s_(c.encerramentoEm),
    FUSO: Lic_s_(c.fuso), FUSO_PRESUMIDO: c.fusoPresumido ? 'SIM' : 'NAO', FUSO_ALERTA: Lic_s_(c.fusoAlerta), SITUACAO_FONTE: Lic_s_(c.situacaoNome),
    LINK_ORIGEM: Lic_url_(c.linkSistemaOrigem) || Lic_url_(c.linkProcesso), LINK_PNCP: Lic_url_(c.linkPncp), VERSAO_FONTE: Number(it.versao) || 1, VERSAO_HASH: Lic_s_(it.hash),
    BRUTO_HASH: Lic_s_(it.brutoHash), ATUALIZACAO_FONTE: Lic_s_(c.atualizacaoGlobalTexto), PRIMEIRA_COLETA_EM: Lic_s_(it.primeiraColetaEm), PUBLICACAO_EM: Lic_s_(c.publicacaoEm)
  };
}
function Lic_camposTriagem_(t) {
  t = t || {};
  return { TRIAGEM: Lic_s_(t.resultado), TRIAGEM_MOTIVO: Lic_texto_(t.motivo, 1000), TRIAGEM_TRECHO: Lic_texto_(t.trecho, 1000), TRIAGEM_TERMO: Lic_texto_(t.termo, 200), TRIAGEM_FONTE_TRECHO: Lic_s_(t.fonteTrecho),
    TRIAGEM_REGRA: Lic_s_(t.regra), TRIAGEM_VERSAO: Lic_s_(t.versao), SELOS_JSON: JSON.stringify(Array.isArray(t.selos) ? t.selos : []),
    PENDENCIAS_JSON: JSON.stringify(Array.isArray(t.pendencias) ? t.pendencias : []), PRIORIDADE_UF: Number(t.prioridade) || 0 };
}
function Lic_proximoCodigo_(lista) {
  var ano = Lic_agora_().slice(0, 4), chave = 'LIC_SEQ_' + ano, props = PropertiesService.getScriptProperties();
  var seq = Number(props.getProperty(chave)) || 0, re = new RegExp('^LIC-' + ano + '-(\\d+)$');
  (lista || Lic_ler_(LIC_ABAS.OPORTUNIDADES)).forEach(function (r) { var m = re.exec(Lic_s_(r.CODIGO)); if (m && Number(m[1]) > seq) seq = Number(m[1]); });
  seq++;
  props.setProperty(chave, String(seq));
  var n = String(seq); while (n.length < 4) n = '0' + n;
  return 'LIC-' + ano + '-' + n;
}

/**
 * Traz do coletor o que mudou desde a última sincronia (LIC_SYNC_DESDE). Idempotente: a mesma versão não gera nada.
 * eu = quem pediu (tela) ou null (rotina do servidor). o.voltas = páginas de 200 (padrão 25; a tela usa 5).
 *
 * Revisão de 01/11/2026: a trava do script (a mesma de todos os módulos) fica presa só durante UMA página, e o cursor
 * é gravado ao fim de cada página. Antes a sincronia inteira (até 5.000 linhas) segurava a trava — as gravações dos
 * outros módulos esperavam e desistiam — e o cursor só era gravado no fim: uma execução cortada pelo limite de tempo
 * recomeçava do zero. As linhas são relidas dentro da trava a cada página, para não decidir com a situação velha de
 * algo que a Diretoria mudou entre uma página e outra.
 */
function Lic_sincronizar_(eu, o) {
  if (!Lic_temColetor_()) return { ok: false, motivo: LIC_MSG_SEM_COLETOR + '.' };
  o = o || {};
  var props = PropertiesService.getScriptProperties();
  var maxVoltas = Math.max(1, Math.min(25, Number(o.voltas) || 25));
  var r = { ok: true, lidas: 0, novas: 0, retificadas: 0, triagemMudou: 0, situacaoMudou: 0, paginas: 0, mais: false, ate: Lic_s_(props.getProperty('LIC_SYNC_DESDE')) };
  var sistema = { id: '', nome: 'Coletor de licitações (servidor)' }, mexidas = {};
  for (var volta = 0; volta < maxVoltas; volta++) {
    var continuar = Lic_comTrava_(function () {
      var desde = Lic_s_(props.getProperty('LIC_SYNC_DESDE'));   // relido na trava: duas sincronias seguem o mesmo cursor
      var pag = SGO_LICITACOES.listar({ desde: desde, limite: 200 }) || {};
      var itens = Array.isArray(pag.itens) ? pag.itens : [];
      if (!itens.length) { r.ate = desde; return false; }
      var linhas = Lic_ler_(LIC_ABAS.OPORTUNIDADES), porChave = {}, agora = Lic_agora_();
      linhas.forEach(function (l) { if (Lic_s_(l.CHAVE_FONTE)) porChave[Lic_s_(l.CHAVE_FONTE)] = l; });
      itens.forEach(function (it) {
        r.lidas++;
        var fonte = Lic_camposFonte_(it), tri = Lic_camposTriagem_(it.triagem), atual = porChave[fonte.CHAVE_FONTE];
        var origem = (fonte.PORTAL_ORIGEM === 'COMPRAS_GOV' ? 'Compras.gov.br' : 'PNCP') + ' ' + Lic_s_(it.rotaOrigem);
        if (!atual) {
          var desc = tri.TRIAGEM === 'DESCARTADA';
          var nova = Object.assign({}, fonte, tri, { CODIGO: Lic_proximoCodigo_(linhas), SITUACAO: desc ? 'DESCARTADA' : 'RADAR', SITUACAO_DESDE: agora,
            DESCARTE_ORIGEM: desc ? 'REGRA' : '', DESCARTE_MOTIVO: desc ? tri.TRIAGEM_MOTIVO : '', DESCARTE_POR_NOME: desc ? 'Regra do radar' : '', DESCARTE_EM: desc ? agora : '',
            ULTIMA_SINCRONIA_EM: agora, CRIADO_POR_NOME: sistema.nome, ATUALIZADO_EM: agora, CRIADO_EM: agora });
          var ins = SGO_DATA.insert(LIC_ABAS.OPORTUNIDADES, nova);
          nova.ID = ins && ins.ID ? ins.ID : nova.ID;
          linhas.push(nova); porChave[fonte.CHAVE_FONTE] = nova; r.novas++; mexidas[Lic_s_(nova.ID)] = true;
          Lic_historico_('OPORTUNIDADE', nova.ID, nova.CODIGO, desc ? 'DESCARTADA_PELA_REGRA' : 'ENTROU_NO_RADAR', sistema,
            { para: nova.SITUACAO, texto: (desc ? 'Descartada pela regra do radar: ' : 'Entrou no radar (' + tri.TRIAGEM.toLowerCase() + '): ') + tri.TRIAGEM_MOTIVO + (tri.TRIAGEM_TRECHO ? ' Trecho: "' + tri.TRIAGEM_TRECHO + '"' : ''),
              versao: fonte.VERSAO_FONTE, fonte: origem, hash: fonte.VERSAO_HASH });
          return;
        }
        var mud = { ULTIMA_SINCRONIA_EM: agora };
        // versão nova da fonte (retificação): os campos da fonte acompanham a fonte; o que mudou vai para o histórico
        if (Number(atual.VERSAO_FONTE) !== fonte.VERSAO_FONTE || Lic_s_(atual.VERSAO_HASH) !== fonte.VERSAO_HASH) {
          var difs = [];
          Object.keys(LIC_CAMPOS_RETIFICACAO).forEach(function (k) { if (Lic_s_(atual[k]) !== Lic_s_(fonte[k])) difs.push(LIC_CAMPOS_RETIFICACAO[k] + ': "' + Lic_texto_(atual[k], 160) + '" → "' + Lic_texto_(fonte[k], 160) + '"'); });
          Object.keys(fonte).forEach(function (k) { mud[k] = fonte[k]; });
          mud.RETIFICADA_EM = agora; r.retificadas++;
          Lic_historico_('OPORTUNIDADE', atual.ID, atual.CODIGO, 'VERSAO_DA_FONTE', sistema,
            { de: 'versão ' + Lic_s_(atual.VERSAO_FONTE), para: 'versão ' + fonte.VERSAO_FONTE, texto: (Lic_s_(it.motivoVersao) === 'FONTE_PNCP' ? 'O PNCP (fonte de verdade) substituiu o espelho do Compras.gov.br. ' : 'Retificação na fonte. ') + (difs.length ? difs.join('; ') : 'Mudança em campo não exibido (itens, arquivos ou dados secundários).'),
              versao: fonte.VERSAO_FONTE, fonte: origem, hash: fonte.VERSAO_HASH });
        }
        if (Lic_s_(atual.TRIAGEM) !== tri.TRIAGEM || Lic_s_(atual.TRIAGEM_MOTIVO) !== tri.TRIAGEM_MOTIVO || Lic_s_(atual.SELOS_JSON) !== tri.SELOS_JSON) {
          Object.keys(tri).forEach(function (k) { mud[k] = tri[k]; });
          r.triagemMudou++;
          Lic_historico_('OPORTUNIDADE', atual.ID, atual.CODIGO, 'TRIAGEM', sistema, { de: Lic_s_(atual.TRIAGEM), para: tri.TRIAGEM, texto: tri.TRIAGEM_MOTIVO, versao: fonte.VERSAO_FONTE, fonte: 'Regras do radar ' + tri.TRIAGEM_VERSAO, hash: fonte.VERSAO_HASH });
          var sit = Lic_s_(atual.SITUACAO), novaSit = '';
          // reaberta pela Diretoria (DESCARTE_ORIGEM = REABERTA): a regra não descarta de novo; a triagem nova fica só no histórico
          if (sit === 'RADAR' && tri.TRIAGEM === 'DESCARTADA' && Lic_s_(atual.DESCARTE_ORIGEM) !== 'REABERTA') novaSit = 'DESCARTADA';
          if (sit === 'DESCARTADA' && Lic_s_(atual.DESCARTE_ORIGEM) === 'REGRA' && tri.TRIAGEM !== 'DESCARTADA') novaSit = 'RADAR';
          if (novaSit) {
            mud.SITUACAO = novaSit; mud.SITUACAO_DESDE = agora; r.situacaoMudou++;
            if (novaSit === 'DESCARTADA') { mud.DESCARTE_ORIGEM = 'REGRA'; mud.DESCARTE_MOTIVO = tri.TRIAGEM_MOTIVO; mud.DESCARTE_POR_NOME = 'Regra do radar'; mud.DESCARTE_POR_ID = ''; mud.DESCARTE_EM = agora; }
            else { mud.DESCARTE_ORIGEM = ''; }
            Lic_historico_('OPORTUNIDADE', atual.ID, atual.CODIGO, 'SITUACAO', sistema, { de: sit, para: novaSit, texto: novaSit === 'DESCARTADA' ? 'A regra do radar passou a descartar: ' + tri.TRIAGEM_MOTIVO : 'A regra do radar deixou de descartar (regras ou fonte mudaram); volta para o radar.', versao: fonte.VERSAO_FONTE, fonte: 'Regras do radar ' + tri.TRIAGEM_VERSAO, hash: fonte.VERSAO_HASH });
          }
        }
        if (Object.keys(mud).length > 1) { mud.ATUALIZADO_EM = agora; mexidas[Lic_s_(atual.ID)] = true; }
        SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, atual.ID, mud);
        Object.keys(mud).forEach(function (k) { atual[k] = mud[k]; });
      });
      var ate = pag.ate ? Lic_s_(pag.ate) : desde;
      props.setProperty('LIC_SYNC_DESDE', ate);
      r.ate = ate; r.paginas++;
      return !!pag.mais;
    });
    if (!continuar) break;
    if (volta === maxVoltas - 1) r.mais = true;
  }
  // etapa 3: agenda das novas e das que mudaram na fonte (fora da trava da página: cada oportunidade pega a trava sozinha)
  var ids = Object.keys(mexidas);
  if (ids.length && typeof Lic_agendaAtualizar_ === 'function') {
    try { var ag = Lic_agendaAtualizar_({ ids: ids, limite: ids.length }); r.agenda = { atualizadas: ag.atualizadas, retificados: ag.retificados, mudancas: ag.mudancas }; }
    catch (e) { r.agendaAviso = 'A agenda será refeita na próxima rodada dos alertas (' + Lic_s_(e && e.message) + ').'; }
  }
  return r;
}

// ------------------------------------------------------------ leitura para as telas
function Lic_selos_(l) { var s = Lic_json_(l.SELOS_JSON, []); return Array.isArray(s) ? s : []; }
function Lic_portaisPorCodigo_() { var m = {}; Lic_ler_(LIC_ABAS.PORTAIS).forEach(function (p) { m[Lic_up_(p.CODIGO)] = p; }); return m; }
function Lic_cartao_(l, portais) {
  var p = portais[Lic_up_(l.PORTAL_SESSAO)];
  return {
    id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), chave: Lic_s_(l.CHAVE_FONTE), numeroControle: Lic_s_(l.NUMERO_CONTROLE_PNCP), orgao: Lic_s_(l.ORGAO_NOME), unidade: Lic_s_(l.UNIDADE_NOME),
    uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), modalidade: Lic_s_(l.MODALIDADE), modo: Lic_s_(l.MODO_DISPUTA), lei: Lic_s_(l.LEI), amparo: Lic_s_(l.AMPARO_LEGAL), srp: Lic_s_(l.SRP),
    sessao: p ? Lic_s_(p.NOME) : '', sessaoCodigo: p ? Lic_up_(p.CODIGO) : '', publicadoPor: Lic_s_(l.PORTAL_SESSAO_NOME),
    objeto: Lic_texto_(l.OBJETO, 1200), valor: l.VALOR_ESTIMADO === '' || l.VALOR_ESTIMADO === null || l.VALOR_ESTIMADO === undefined ? null : Number(l.VALOR_ESTIMADO),
    abertura: Lic_s_(l.ABERTURA_PROPOSTAS), encerramento: Lic_s_(l.ENCERRAMENTO_PROPOSTAS), encerramentoIso: Lic_s_(l.ENCERRAMENTO_ISO), fusoAlerta: Lic_s_(l.FUSO_ALERTA), fusoPresumido: Lic_s_(l.FUSO_PRESUMIDO) === 'SIM',
    situacaoFonte: Lic_s_(l.SITUACAO_FONTE), triagem: Lic_s_(l.TRIAGEM), motivo: Lic_s_(l.TRIAGEM_MOTIVO), trecho: Lic_s_(l.TRIAGEM_TRECHO), termo: Lic_s_(l.TRIAGEM_TERMO), fonteTrecho: Lic_s_(l.TRIAGEM_FONTE_TRECHO),
    regra: Lic_s_(l.TRIAGEM_REGRA), selos: Lic_selos_(l), pendencias: Lic_json_(l.PENDENCIAS_JSON, []), prioridade: Number(l.PRIORIDADE_UF) || 0,
    situacao: Lic_s_(l.SITUACAO), situacaoNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO), situacaoDesde: Lic_s_(l.SITUACAO_DESDE),
    descarteOrigem: Lic_s_(l.DESCARTE_ORIGEM), descarteMotivo: Lic_s_(l.DESCARTE_MOTIVO), descartePor: Lic_s_(l.DESCARTE_POR_NOME), descarteEm: Lic_s_(l.DESCARTE_EM), analiseObs: Lic_s_(l.ANALISE_OBS),
    linkOrigem: Lic_url_(l.LINK_ORIGEM), linkPncp: Lic_url_(l.LINK_PNCP), versao: Number(l.VERSAO_FONTE) || 1, retificadaEm: Lic_s_(l.RETIFICADA_EM), responsavel: Lic_s_(l.RESPONSAVEL_NOME),
    // etapa 2: nota da última análise concluída (null = sem nota) e a situação da última tentativa
    nota: l.NOTA === '' || l.NOTA === null || l.NOTA === undefined || !isFinite(Number(l.NOTA)) ? null : Number(l.NOTA), notaClasse: Lic_s_(l.NOTA_CLASSE), notaTrava: Lic_s_(l.NOTA_TRAVA),
    analiseVersao: Number(l.ANALISE_VERSAO) || 0, analiseEm: Lic_s_(l.ANALISE_EM), analiseSituacao: Lic_s_(l.ANALISE_SITUACAO), arquivosQtd: l.ARQUIVOS_QTD === '' || l.ARQUIVOS_QTD === undefined ? null : Number(l.ARQUIVOS_QTD)
  };
}
function Lic_abaDe_(l) {
  var s = Lic_s_(l.SITUACAO);
  if (s === 'DESCARTADA') return 'descartadas';
  if (s === 'RADAR') return Lic_s_(l.TRIAGEM) === 'TRAVADA' ? 'travadas' : 'analisar';
  return 'analise';
}
function Lic_ativas_() { return Lic_ler_(LIC_ABAS.OPORTUNIDADES).filter(function (l) { return !Lic_s_(l.EXCLUIDO_EM); }); }
/** Ordem "nota": maior nota primeiro; sem nota no fim; empate pela ordem padrão. */
function Lic_ordenarNota_(a, b) {
  var na = a.nota === null || a.nota === undefined ? -1 : a.nota, nb = b.nota === null || b.nota === undefined ? -1 : b.nota;
  return nb !== na ? nb - na : Lic_ordenar_(a, b);
}
function Lic_ordenarPrazo_(a, b) { var ea = a.encerramentoIso || '9999', eb = b.encerramentoIso || '9999'; return ea < eb ? -1 : ea > eb ? 1 : 0; }
function Lic_ordenar_(a, b) {
  if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
  var ea = a.encerramentoIso || '9999', eb = b.encerramentoIso || '9999';
  return ea < eb ? -1 : ea > eb ? 1 : 0;
}

function Lic_oportunidades_(eu, d) {
  var portais = Lic_portaisPorCodigo_(), aba = Lic_s_(d.aba) || 'analisar', busca = Lic_s_(d.busca).toLowerCase(), uf = Lic_up_(d.uf), selo = Lic_s_(d.selo), sessao = Lic_up_(d.sessao);
  var todas = Lic_ativas_(), contagens = { analisar: 0, travadas: 0, analise: 0, descartadas: 0 }, sessoes = {};
  todas.forEach(function (l) { contagens[Lic_abaDe_(l)]++; var c = Lic_up_(l.PORTAL_SESSAO); if (c && portais[c]) sessoes[c] = Lic_s_(portais[c].NOME); });
  var lista = todas.filter(function (l) { return Lic_abaDe_(l) === aba; }).map(function (l) { return Lic_cartao_(l, portais); }).filter(function (o) {
    if (busca && [o.orgao, o.objeto, o.numeroControle, o.municipio, o.codigo, o.unidade].join(' ').toLowerCase().indexOf(busca) < 0) return false;
    if (uf === 'PRIO' && LIC_UFS_PRIORIDADE.indexOf(o.uf) < 0) return false;
    if (uf && uf !== 'PRIO' && o.uf !== uf) return false;
    if (selo && !o.selos.some(function (s) { return s && s.tipo === selo; }) && !(selo === 'lei' && o.lei === '13303')) return false;
    if (sessao === 'OUTRO' && o.sessaoCodigo) return false;
    if (sessao && sessao !== 'OUTRO' && o.sessaoCodigo !== sessao) return false;
    return true;
  }).sort(Lic_s_(d.ordem) === 'nota' ? Lic_ordenarNota_ : Lic_s_(d.ordem) === 'prazo' ? Lic_ordenarPrazo_ : Lic_ordenar_);
  var total = lista.length;
  return { aba: aba, ordem: ['nota', 'prazo'].indexOf(Lic_s_(d.ordem)) >= 0 ? Lic_s_(d.ordem) : 'prioridade', iaDisponivel: Lic_iaDisponivel_(), contagens: contagens, total: total, lista: lista.slice(0, 300), cortada: total > 300, sessoes: sessoes, coletorNoServidor: Lic_temColetor_(), ultimaColeta: Lic_json_(PropertiesService.getScriptProperties().getProperty('LIC_ULTIMA_COLETA'), null) };
}

function Lic_acharOp_(id) {
  var l = SGO_DATA.getById(LIC_ABAS.OPORTUNIDADES, Lic_s_(id));
  if (!l || Lic_s_(l.EXCLUIDO_EM)) throw new Error('Não foi possível abrir: a oportunidade não foi encontrada (pode ter sido trocada por outra aba). Atualize a lista e tente de novo');
  return l;
}

function Lic_ficha_(eu, d) {
  var l = Lic_acharOp_(d.id), portais = Lic_portaisPorCodigo_();
  var hist = Lic_ler_(LIC_ABAS.HISTORICO).filter(function (h) { return Lic_s_(h.ENTIDADE) === 'OPORTUNIDADE' && Lic_s_(h.ENTIDADE_ID) === Lic_s_(l.ID); })
    .sort(function (a, b) { return Lic_s_(b.DATA) < Lic_s_(a.DATA) ? -1 : Lic_s_(b.DATA) > Lic_s_(a.DATA) ? 1 : 0; })
    .map(function (h) { return { tipo: Lic_s_(h.TIPO), de: Lic_s_(h.DE), para: Lic_s_(h.PARA), texto: Lic_s_(h.TEXTO), versao: Lic_s_(h.VERSAO), fonte: Lic_s_(h.FONTE), hash: Lic_s_(h.HASH), quem: Lic_s_(h.USUARIO_NOME), quando: Lic_s_(h.DATA) }; });
  var fonte = null, fonteAviso = '', srv = Lic_lerFonteServidor_(l);
  if (Lic_temColetor_()) {
    try {
      var o = srv.fonte;
      if (srv.aviso && !o) throw new Error(srv.aviso);
      if (o) fonte = { versoes: o.versoes || [], itens: (o.itens || []).map(function (i) { return { numero: i.numeroItem, descricao: Lic_texto_(i.descricao, 600), tipo: i.materialServico === 'M' ? 'Material' : i.materialServico === 'S' ? 'Serviço' : '', quantidade: i.quantidade, unidade: i.unidade, valorUnitario: i.valorUnitario, valorTotal: i.valorTotal, beneficio: i.beneficio, sigiloso: !!i.sigiloso, situacao: i.situacao }; }), coletadaEm: o.atual ? o.atual.primeiraColetaEm : '', itensEm: o.atual ? o.atual.itensColetadosEm : '' };
    } catch (e) { fonteAviso = 'Não foi possível ler as versões da fonte agora (' + Lic_s_(e && e.message) + '). O resumo e o histórico abaixo continuam valendo.'; }
  } else fonteAviso = LIC_MSG_SEM_COLETOR + '.';
  var c = Lic_cartao_(l, portais);
  c.portalOrigem = Lic_s_(l.PORTAL_ORIGEM) === 'COMPRAS_GOV' ? 'Compras.gov.br dados abertos' : 'PNCP (API de consulta)';
  c.versaoHash = Lic_s_(l.VERSAO_HASH); c.brutoHash = Lic_s_(l.BRUTO_HASH); c.atualizacaoFonte = Lic_s_(l.ATUALIZACAO_FONTE); c.primeiraColeta = Lic_s_(l.PRIMEIRA_COLETA_EM);
  c.ultimaSincronia = Lic_s_(l.ULTIMA_SINCRONIA_EM); c.orgaoCnpj = Lic_s_(l.ORGAO_CNPJ); c.idComprasGov = Lic_s_(l.ID_COMPRAS_GOV); c.triagemVersao = Lic_s_(l.TRIAGEM_VERSAO);
  // etapa 2: arquivos do edital (servidor) e a análise por IA
  var arquivos = srv.arquivos, analise = null;
  try { analise = Lic_analiseFicha_(l, srv); } catch (e) { analise = { erro: 'Não foi possível montar a análise agora (' + Lic_s_(e && e.message) + ').' }; }
  // etapa 3: prazos (todas as versões) e os alertas de cada um
  var prazos = null;
  // agenda ainda não montada (oportunidade nova entre duas rodadas) ou com base velha: monta agora
  try { if (typeof Lic_agendaBase_ === 'function' && Lic_s_(l.EVENTOS_BASE_HASH) !== Lic_agendaBase_(l)) { Lic_agendaAposSituacao_(l.ID); l = Lic_acharOp_(l.ID); } } catch (e) {}
  try { prazos = typeof Lic_prazosFicha_ === 'function' ? Lic_prazosFicha_(l) : null; } catch (e) { prazos = { erro: 'Não foi possível montar os prazos agora (' + Lic_s_(e && e.message) + ').' }; }
  return { op: c, historico: hist, fonte: fonte, fonteAviso: fonteAviso, arquivos: arquivos, arquivosAviso: Lic_temArquivos_() ? '' : LIC_MSG_SEM_COLETOR + '.', analise: analise, prazos: prazos };
}

function Lic_mudarSituacao_(eu, d, de, para, tipo, extra, texto) {
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id);
    if (de.indexOf(Lic_s_(l.SITUACAO)) < 0) throw new Error('Não foi possível ' + texto + ': a oportunidade está "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '" (alguém mudou agora há pouco). Atualize a lista e confira');
    var agora = Lic_agora_(), mud = Object.assign({ SITUACAO: para, SITUACAO_DESDE: agora, ATUALIZADO_EM: agora }, extra || {});
    SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, l.ID, mud);
    var h = Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, tipo, eu, { de: l.SITUACAO, para: para, texto: d.textoHistorico, versao: l.VERSAO_FONTE, fonte: 'Tela Oportunidades' });
    return { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), situacao: para, hash: h.HASH };
  });
}

function Lic_descartar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva o motivo do descarte (pelo menos 10 letras): ele fica no histórico com o seu nome e a data, e ajuda a ajustar as regras do radar. Nada foi alterado');
  return Lic_aposSituacao_(d.id, Lic_mudarSituacao_(eu, { id: d.id, textoHistorico: 'Descartada pela Diretoria: ' + motivo }, ['RADAR', 'ANALISE'], 'DESCARTADA', 'DESCARTADA_PELA_DIRETORIA',
    { DESCARTE_ORIGEM: 'PESSOA', DESCARTE_MOTIVO: motivo, DESCARTE_POR_ID: eu.id, DESCARTE_POR_NOME: eu.nome, DESCARTE_EM: Lic_agora_() }, 'descartar'));
}
/** Etapa 3: depois de mudar a situação, a agenda e os alertas acompanham (descartada = alertas pendentes cancelados com o motivo). */
function Lic_aposSituacao_(id, r) { if (typeof Lic_agendaAposSituacao_ === 'function') Lic_agendaAposSituacao_(Lic_s_(id)); return r; }
function Lic_enviarAnalise_(eu, d) {
  var obs = Lic_texto_(d.obs, 1000);
  var r = Lic_mudarSituacao_(eu, { id: d.id, textoHistorico: 'Enviada para análise' + (obs ? ': ' + obs : '.') }, ['RADAR'], 'ANALISE', 'ENVIADA_PARA_ANALISE',
    { ANALISE_OBS: obs, RESPONSAVEL_ID: eu.id, RESPONSAVEL_NOME: eu.nome }, 'enviar para análise');
  Lic_aposSituacao_(d.id, r);
  // etapa 2: em análise, o servidor lê os arquivos do edital (se ainda não leu); falha aqui não desfaz o envio
  if (Lic_temArquivos_()) { try { var l = Lic_acharOp_(d.id); SGO_LICITACOES.arquivosPedir({ chave: Lic_s_(l.CHAVE_FONTE), quem: eu.nome, motivo: 'Enviada para análise' }); r.arquivosPedidos = true; } catch (e) { r.arquivosAviso = Lic_s_(e && e.message); } }
  return r;
}
function Lic_reabrir_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva por que a oportunidade volta para o radar (pelo menos 10 letras). Nada foi alterado');
  return Lic_aposSituacao_(d.id, Lic_mudarSituacao_(eu, { id: d.id, textoHistorico: 'Reaberta: ' + motivo }, ['DESCARTADA'], 'RADAR', 'REABERTA', { DESCARTE_ORIGEM: 'REABERTA' }, 'reabrir'));
}

function Lic_situacaoColetor_() {
  if (!Lic_temColetor_()) return { noServidor: false, texto: LIC_MSG_SEM_COLETOR + '.' };
  try { var s = SGO_LICITACOES.situacao() || {}; s.noServidor = true; return s; }
  catch (e) { return { noServidor: true, erroLeitura: 'Não foi possível ler a situação do coletor agora (' + Lic_s_(e && e.message) + ').' }; }
}

function Lic_hoje_(eu) {
  var todas = Lic_ativas_(), agora = Date.now(), em7 = agora + 7 * 864e5, desde7 = agora - 7 * 864e5, portais = Lic_portaisPorCodigo_();
  var k = { analisar: 0, travadas: 0, analise: 0, prazos7: 0, descartadasRegra7: 0, retificadas7: 0 };
  var prazos = [], novas = [];
  todas.forEach(function (l) {
    var aba = Lic_abaDe_(l); if (k[aba] !== undefined) k[aba]++;
    var enc = Date.parse(Lic_s_(l.ENCERRAMENTO_ISO));
    if (aba !== 'descartadas' && isFinite(enc) && enc >= agora && enc <= em7) { k.prazos7++; prazos.push(Lic_cartao_(l, portais)); }
    if (aba === 'descartadas' && Lic_s_(l.DESCARTE_ORIGEM) === 'REGRA' && Date.parse(Lic_s_(l.DESCARTE_EM)) >= desde7) k.descartadasRegra7++;
    if (Lic_s_(l.RETIFICADA_EM) && Date.parse(Lic_s_(l.RETIFICADA_EM)) >= desde7) k.retificadas7++;
    if (aba === 'analisar' || aba === 'travadas') novas.push(Lic_cartao_(l, portais));
  });
  prazos.sort(function (a, b) { return a.encerramentoIso < b.encerramentoIso ? -1 : 1; });
  novas.sort(function (a, b) { return (b.situacaoDesde || '') < (a.situacaoDesde || '') ? -1 : 1; });
  // etapa 3: alertas enviados e sem ciência (da Diretoria de Licitações inteira), para a faixa de cima
  var semC = [];
  try { if (typeof Lic_alertasSemCiencia_ === 'function') semC = Lic_alertasSemCiencia_(null).map(Lic_alertaParaTela_).sort(function (a, b) { return a.criadoEm < b.criadoEm ? 1 : -1; }); } catch (e) { semC = []; }
  return { semCiencia: semC.slice(0, 5), semCienciaTotal: semC.length, kpis: k, prazos: prazos.slice(0, 12), novas: novas.slice(0, 8), coletor: Lic_situacaoColetor_(), ultimaColeta: Lic_json_(PropertiesService.getScriptProperties().getProperty('LIC_ULTIMA_COLETA'), null), cfg: Lic_cfg_() };
}

function Lic_coletarAgora_(eu) {
  if (!Lic_temColetor_()) throw new Error('Não foi possível pedir a coleta: ' + LIC_MSG_SEM_COLETOR);
  SGO_LICITACOES.coletarAgora();
  Lic_historico_('CONFIG', 'COLETOR', '', 'COLETA_PEDIDA', eu, { texto: 'Coleta pedida pela tela (roda em até 1 minuto, respeitando 1 chamada a cada 3 s no PNCP).', fonte: 'Tela Licitações' });
  return { pedido: true, texto: 'Coleta pedida. O servidor começa em até 1 minuto; a lista se atualiza quando ela terminar (toque em "Atualizar").' };
}

// ------------------------------------------------------------ portais e parametrização
function Lic_portalParaTela_(p) {
  var ref = Lic_s_(p.CREDENCIAL_REF), existe = false;
  if (ref) { try { existe = PropertiesService.getScriptProperties().getProperty(ref) !== null; } catch (e) { existe = false; } }
  return {
    id: Lic_s_(p.ID), codigo: Lic_up_(p.CODIGO), nome: Lic_s_(p.NOME), categoria: Lic_s_(p.CATEGORIA), url: Lic_url_(p.URL), urlApi: Lic_url_(p.URL_API), documentacao: Lic_url_(p.DOCUMENTACAO),
    tipo: Lic_up_(p.TIPO), tipoNome: LIC_TIPOS_PORTAL[Lic_up_(p.TIPO)] || '', autenticacao: Lic_s_(p.AUTENTICACAO), credencialRef: ref, credencialExiste: existe, situacao: Lic_s_(p.SITUACAO),
    prioridade: Lic_s_(p.PRIORIDADE), ligado: Lic_up_(p.LIGADO) === 'SIM', positivas: Lic_s_(p.PALAVRAS_POSITIVAS), negativas: Lic_s_(p.PALAVRAS_NEGATIVAS), ufs: Lic_s_(p.UFS),
    valorMinimo: Lic_num_(p.VALOR_MINIMO) || 0, frequenciaMin: Number(p.FREQUENCIA_MIN) || 0, responsavelId: Lic_s_(p.RESPONSAVEL_ID), responsavelNome: Lic_s_(p.RESPONSAVEL_NOME),
    coberto: Lic_s_(p.COBERTO_PNCP), alternativo: Lic_s_(p.CAMINHO_ALTERNATIVO), ultimoTesteEm: Lic_s_(p.ULTIMO_TESTE_EM), ultimoTeste: Lic_s_(p.ULTIMO_TESTE_RESULTADO),
    obs: Lic_s_(p.OBS), versao: Number(p.VERSAO) || 1, motivo: Lic_s_(p.MOTIVO), atualizadoPor: Lic_s_(p.ATUALIZADO_POR_NOME), atualizadoEm: Lic_s_(p.ATUALIZADO_EM),
    testavel: Lic_up_(p.CODIGO) === 'PUB-001' || Lic_up_(p.CODIGO) === 'PUB-002', automatico: Lic_up_(p.TIPO) === 'A' || Lic_up_(p.TIPO) === 'B'
  };
}
function Lic_portais_(eu) {
  var ordem = { PUB: 1, EST: 2, SAU: 3, IND: 4 };
  var lista = Lic_ler_(LIC_ABAS.PORTAIS).map(Lic_portalParaTela_).sort(function (a, b) { return (ordem[a.categoria] || 9) - (ordem[b.categoria] || 9) || (a.codigo < b.codigo ? -1 : 1); });
  var porTipo = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  lista.forEach(function (p) { if (porTipo[p.tipo] !== undefined) porTipo[p.tipo]++; });
  return { portais: lista, porTipo: porTipo, responsaveis: Lic_responsaveis_(), cfg: Lic_cfg_(), coletor: Lic_situacaoColetor_(), situacoes: LIC_SITUACOES_PORTAL,
    frequencias: LIC_FREQUENCIAS, ufs: LIC_UFS, termos: LIC_TERMOS_PADRAO, tipos: LIC_TIPOS_PORTAL };
}

/**
 * Parametrizar um portal: só os campos enviados mudam (merge); versão + 1, motivo obrigatório, e cada campo alterado vai
 * para o histórico (de → para). A credencial é sempre o NOME de uma chave de Chaves e senhas, nunca o valor.
 */
function Lic_portalSalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500);
  if (motivo.length < 5) throw new Error('Escreva o motivo da mudança (pelo menos 5 letras): ele fica no histórico do portal com o seu nome e a data. Nada foi alterado');
  var c = d.campos || {};
  return Lic_comTrava_(function () {
    var p = Lic_ler_(LIC_ABAS.PORTAIS).filter(function (x) { return Lic_up_(x.CODIGO) === Lic_up_(d.codigo); })[0];
    if (!p) throw new Error('Não foi possível salvar: o portal ' + Lic_s_(d.codigo) + ' não está cadastrado. Atualize a tela');
    var tipo = Lic_up_(p.TIPO), mud = {}, rotulos = {};
    function trocar(col, valor, rotulo) { if (Lic_s_(p[col]) !== Lic_s_(valor)) { mud[col] = valor; rotulos[col] = rotulo; } }
    if (c.ligado !== undefined) {
      var lig = c.ligado === true || c.ligado === 'SIM';
      if (lig && tipo !== 'A' && tipo !== 'B') throw new Error('Não foi possível ligar ' + Lic_s_(p.NOME) + ': o portal é do tipo ' + tipo + ' (' + (LIC_TIPOS_PORTAL[tipo] || '') + ') e não tem API para coleta automática. A publicação chega pelo PNCP; a sessão é acompanhada no próprio portal. Nada foi alterado');
      if (lig && tipo === 'B' && !Lic_s_(c.credencialRef !== undefined ? c.credencialRef : p.CREDENCIAL_REF)) throw new Error('Não foi possível ligar: o portal exige credencial. Cadastre a chave em Chaves e senhas e informe aqui o NOME dela. Nada foi alterado');
      trocar('LIGADO', lig ? 'SIM' : 'NAO', 'Ligado');
    }
    if (c.positivas !== undefined) trocar('PALAVRAS_POSITIVAS', Lic_lista_(c.positivas).join(', ').slice(0, 2000), 'Palavras que interessam');
    if (c.negativas !== undefined) trocar('PALAVRAS_NEGATIVAS', Lic_lista_(c.negativas).join(', ').slice(0, 2000), 'Palavras que descartam');
    if (c.ufs !== undefined) {
      var ufs = Lic_lista_(c.ufs).map(Lic_up_), erradas = ufs.filter(function (u) { return LIC_UFS.indexOf(u) < 0; });
      if (erradas.length) throw new Error('Escreva só siglas de UF válidas (ex.: GO, DF, RJ). Não reconhecidas: ' + erradas.join(', ') + '. Deixe em branco para o Brasil inteiro. Nada foi alterado');
      trocar('UFS', ufs.join(', '), 'UFs');
    }
    if (c.valorMinimo !== undefined) {
      var v = Lic_s_(c.valorMinimo) === '' ? 0 : Lic_num_(c.valorMinimo);
      if (v === null || v < 0) throw new Error('Escreva o valor mínimo em reais (ex.: 5.000,00) ou 0 para sem mínimo. Nada foi alterado');
      trocar('VALOR_MINIMO', v, 'Valor mínimo');
    }
    if (c.frequenciaMin !== undefined) {
      var f = Number(c.frequenciaMin);
      if (LIC_FREQUENCIAS.indexOf(f) < 0) throw new Error('Escolha a frequência na lista (30 min, 1 h, 2 h, 4 h, 12 h ou 1 vez por dia). Nada foi alterado');
      trocar('FREQUENCIA_MIN', f, 'Frequência (min)');
    }
    if (c.responsavelId !== undefined) {
      var resp = Lic_responsaveis_().filter(function (u) { return u.id === Lic_s_(c.responsavelId); })[0];
      if (Lic_s_(c.responsavelId) && !resp) throw new Error('Escolha o responsável na lista (Diretoria ou Administrador ativos). Nada foi alterado');
      trocar('RESPONSAVEL_ID', resp ? resp.id : '', 'Responsável'); if (mud.RESPONSAVEL_ID !== undefined) { mud.RESPONSAVEL_NOME = resp ? resp.nome : ''; rotulos.RESPONSAVEL_NOME = 'Responsável (nome)'; }
    }
    if (c.credencialRef !== undefined) {
      var ref = Lic_s_(c.credencialRef);
      if (ref && !/^[A-Z][A-Z0-9_]{2,63}$/.test(ref)) throw new Error('Escreva o NOME da chave cadastrada em Chaves e senhas (letras maiúsculas, números e _; ex.: LIC_PCP_PUBLICKEY), nunca o valor da chave ou a senha. Nada foi alterado');
      trocar('CREDENCIAL_REF', ref, 'Credencial (nome da chave)');
    }
    if (c.situacao !== undefined) {
      if (LIC_SITUACOES_PORTAL.indexOf(Lic_s_(c.situacao)) < 0) throw new Error('Escolha a situação na lista. Nada foi alterado');
      if (/^Operacional/.test(Lic_s_(c.situacao)) && Lic_s_(p.SITUACAO) !== Lic_s_(c.situacao) && !/^OK/.test(Lic_s_(p.ULTIMO_TESTE_RESULTADO))) throw new Error('Não foi possível marcar como "' + Lic_s_(c.situacao) + '": o portal precisa de um teste de conexão real bem-sucedido antes (botão "Testar conexão"). Nada foi alterado');
      trocar('SITUACAO', Lic_s_(c.situacao), 'Situação');
    }
    if (c.obs !== undefined) trocar('OBS', Lic_texto_(c.obs, 2000), 'Observações');
    var cols = Object.keys(mud);
    if (!cols.length) return { portal: Lic_portalParaTela_(p), semMudanca: true, texto: 'Nada mudou: os valores enviados são iguais aos atuais. Nenhuma versão nova foi criada.' };
    var versao = (Number(p.VERSAO) || 1) + 1, agora = Lic_agora_();
    mud.VERSAO = versao; mud.MOTIVO = motivo; mud.ATUALIZADO_POR_ID = eu.id; mud.ATUALIZADO_POR_NOME = eu.nome; mud.ATUALIZADO_EM = agora;
    SGO_DATA.update(LIC_ABAS.PORTAIS, p.ID, mud);
    cols.filter(function (k) { return k !== 'RESPONSAVEL_NOME'; }).forEach(function (k) {
      Lic_historico_('PORTAL', p.ID, p.CODIGO, 'PARAMETRO', eu, { de: Lic_s_(k === 'RESPONSAVEL_ID' ? p.RESPONSAVEL_NOME : p[k]), para: Lic_s_(k === 'RESPONSAVEL_ID' ? mud.RESPONSAVEL_NOME : mud[k]), texto: rotulos[k] + '. Motivo: ' + motivo, versao: versao, fonte: 'Tela Portais e configurações' });
    });
    Object.keys(mud).forEach(function (k) { p[k] = mud[k]; });
    var cod = Lic_up_(p.CODIGO);
    if (cod === 'PUB-001' || cod === 'PUB-002') Lic_publicarCfgColetor_();
    return { portal: Lic_portalParaTela_(p), versao: versao, mudou: cols.filter(function (k) { return k !== 'RESPONSAVEL_NOME'; }).map(function (k) { return rotulos[k]; }) };
  });
}

/** Teste de conexão real (só PNCP e Compras.gov.br nesta etapa), pelo servidor; o resultado fica no portal e no registro. */
function Lic_portalTestar_(eu, d) {
  var cod = Lic_up_(d.codigo);
  if (cod !== 'PUB-001' && cod !== 'PUB-002') throw new Error('Não foi possível testar: só o PNCP e o Compras.gov.br têm API configurada nesta etapa. Os demais portais não têm API pública (ou aguardam credencial ou contrato): use "Acessar" para abrir o portal');
  if (!Lic_temColetor_()) throw new Error('Não foi possível testar: ' + LIC_MSG_SEM_COLETOR);
  var t = SGO_LICITACOES.testar({ portal: cod }) || {};
  return Lic_comTrava_(function () {
    var p = Lic_ler_(LIC_ABAS.PORTAIS).filter(function (x) { return Lic_up_(x.CODIGO) === cod; })[0];
    var resultado = (t.ok ? 'OK' : 'FALHA') + ' · HTTP ' + (t.status || 'sem resposta') + ' · ' + (Number(t.ms) || 0) + ' ms' + (t.ok ? ' · ' + (Number(t.total) || 0) + ' registros na fonte' : ' · ' + Lic_texto_(t.erro, 200));
    var agora = Lic_agora_(), mud = { ULTIMO_TESTE_EM: agora, ULTIMO_TESTE_RESULTADO: resultado };
    var sitAntes = p ? Lic_s_(p.SITUACAO) : '';
    if (t.ok && (sitAntes === 'Em teste' || sitAntes === 'Falha' || sitAntes === 'Não configurado')) mud.SITUACAO = 'Operacional';
    if (!t.ok && /^Operacional/.test(sitAntes)) mud.SITUACAO = 'Falha';
    if (p) {
      if (mud.SITUACAO) { mud.VERSAO = (Number(p.VERSAO) || 1) + 1; mud.MOTIVO = 'Teste de conexão real (' + (t.ok ? 'sucesso' : 'falha') + ')'; mud.ATUALIZADO_POR_ID = eu.id; mud.ATUALIZADO_POR_NOME = eu.nome; mud.ATUALIZADO_EM = agora; }
      SGO_DATA.update(LIC_ABAS.PORTAIS, p.ID, mud);
      Lic_historico_('PORTAL', p.ID, p.CODIGO, 'TESTE_CONEXAO', eu, { de: sitAntes, para: mud.SITUACAO || sitAntes, texto: resultado + ' · rota ' + Lic_s_(t.rota), versao: mud.VERSAO || p.VERSAO, fonte: 'Servidor (lic_conexoes_log)' });
      Object.keys(mud).forEach(function (k) { p[k] = mud[k]; });
    }
    return { teste: t, resultado: resultado, portal: p ? Lic_portalParaTela_(p) : null };
  });
}

function Lic_conexoes_(eu, d) {
  if (!Lic_temColetor_()) return { conexoes: [], aviso: LIC_MSG_SEM_COLETOR + '.' };
  var lista = SGO_LICITACOES.conexoes({ portal: Lic_up_(d.portal) || undefined, limite: Math.min(200, Number(d.limite) || 60) }) || [];
  return { conexoes: lista, coletor: Lic_situacaoColetor_() };
}

/** Regras do radar: chave geral do coletor e porte da matriz. Versão nova com motivo; o servidor passa a usar na próxima rodada. */
function Lic_radarSalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500);
  if (motivo.length < 5) throw new Error('Escreva o motivo da mudança (pelo menos 5 letras). Nada foi alterado');
  var porte = Lic_up_(d.porte || 'EPP');
  if (['ME', 'EPP', 'DEMAIS'].indexOf(porte) < 0) throw new Error('Escolha o porte da matriz na lista. Nada foi alterado');
  return Lic_comTrava_(function () {
    var antes = Lic_cfg_(), l = Lic_cfgLinha_(), agora = Lic_agora_();
    var novo = Object.assign({}, Lic_json_(l && l.VALOR_JSON, {}), { coletorLigado: d.coletorLigado === true || d.coletorLigado === 'SIM', porte: porte });
    if (novo.coletorLigado === antes.coletorLigado && novo.porte === antes.porte && antes.versao) return { cfg: antes, semMudanca: true, texto: 'Nada mudou. Nenhuma versão nova foi criada.' };
    var versao = (antes.versao || 0) + 1;
    var reg = { CHAVE: 'RADAR', VALOR_JSON: JSON.stringify(novo), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    if (l) SGO_DATA.update(LIC_ABAS.CONFIG, l.ID, reg); else SGO_DATA.insert(LIC_ABAS.CONFIG, Object.assign({ CRIADO_EM: agora }, reg));
    Lic_historico_('CONFIG', 'RADAR', '', 'REGRAS_DO_RADAR', eu, { de: 'coletor ' + (antes.coletorLigado ? 'ligado' : 'desligado') + ', porte ' + antes.porte, para: 'coletor ' + (novo.coletorLigado ? 'ligado' : 'desligado') + ', porte ' + novo.porte, texto: 'Motivo: ' + motivo, versao: versao, fonte: 'Tela Portais e configurações' });
    Lic_publicarCfgColetor_();
    return { cfg: Lic_cfg_(), versao: versao };
  });
}
