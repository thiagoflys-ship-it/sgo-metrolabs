/****************************************************
 * SEGURANÇA E AUTOMAÇÃO PREDIAL — SAÚDE DA INFRAESTRUTURA E SENTINELA (27/10/2026)
 *
 * O que aconteceu: às 07:45 de 27/10/2026 toda chamada à Tuya passou a voltar {"code":28841004,"msg":"No permissions. Your
 * quota of Trial Edition is used up."} (HTTP 200). A cota do plano de teste acabou por consumo: a abertura automática da
 * campainha lia a fechadura a cada 3 s o dia todo (~28.800 chamadas/dia), mais a rotina de 1 minuto e as telas. A equipe viu
 * o erro técnico e achou que o módulo inteiro (inclusive o alarme) tinha parado.
 *
 * O que este arquivo faz (aprovado pelo dono, 27/10/2026):
 *  1. Sentinela (AutPred_sentinela): chamada pelo servidor a cada 5 min (src/servicos/sentinela.ts), com a situação do que
 *     o servidor confere (alarme Intelbras, rotinas, eventos da Tuya, o próprio servidor). Aqui ela confere a Tuya SEM gastar
 *     chamada à toa: usa o contador, o último erro, o bloqueio e a idade da última resposta; chamada real (lista de
 *     dispositivos) no máximo 1 vez por hora, na janela de consulta, e só se nenhuma outra chamada deu certo na última hora.
 *     Orçamento da cota (AUT_SAUDE_CFG.orcamentoMes, padrão 26.000 chamadas/mês = Trial Edition): 70% aviso; 90% MODO
 *     ECONÔMICO automático (AUT_ECONOMICO: só comandos pedidos por pessoa e a abertura automática por evento; leituras
 *     automáticas e consulta da campainha param). Sai na virada do mês ou quando a Diretoria sai ou ajusta o orçamento.
 *     Autocorreção: renovar o token, repetir falha passageira com recuo; o servidor reinstala rotina parada e reconecta os
 *     eventos. Cada ação vira linha em AUT_INCIDENTES.
 *  2. Incidente: falha que não se corrige avisa o responsável pelo sistema e a Diretoria (SGO_notificar_, evento S74 da
 *     matriz: sistema, e-mail e WhatsApp na hora), UMA vez por incidente, e de novo quando normaliza. Texto o quê / por quê /
 *     o que fazer.
 *  3. Tela da equipe: falha da nuvem vira "Portões pelo SGO+ fora do ar no momento: use o controle ou o aplicativo Smart
 *     Life. A gestão já foi avisada." (AutPred_erroNuvem_); o alarme não depende da Tuya e fica separado.
 *  4. Tela "Saúde da infraestrutura" (AutPred_saudePainel_): Diretoria e Administrador.
 *
 * Abas: AUT_INCIDENTES (só inclusão). Propriedades: AUT_SAUDE_CFG, AUT_SAUDE_ESTADO, AUT_SAUDE_ABERTOS, AUT_SAUDE_SONDA_EM,
 * AUT_ECONOMICO, AUT_ECONOMICO_DISPENSA; do servidor: SENTINELA_SERVIDOR, TUYA_MSG_ESTADO. Nenhum segredo em planilha ou log.
 ****************************************************/

var AUT_ABA_INCIDENTES = 'AUT_INCIDENTES';
var AUT_COLUNAS_INCIDENTES = ['ID', 'INCIDENTE', 'CHAVE', 'ITEM', 'EVENTO', 'SITUACAO', 'QUANDO', 'QUANDO_EM', 'TEXTO', 'PORQUE', 'O_QUE_FAZER', 'ACAO', 'AVISADOS', 'POR', 'CRIADO_EM'];
var AUT_PROP_ABERTOS = 'AUT_SAUDE_ABERTOS';
var AUT_PROP_SAUDE = 'AUT_SAUDE_ESTADO';
var AUT_PROP_SONDA = 'AUT_SAUDE_SONDA_EM';
var AUT_PROP_DISPENSA = 'AUT_ECONOMICO_DISPENSA';
var AUT_PROP_SERVIDOR = 'SENTINELA_SERVIDOR';
var AUT_SONDA_MS = 3600000;           // chamada real de conferência: no máximo 1 por hora
var AUT_ERRO_RECENTE_MS = 1800000;    // último erro vale como situação atual por 30 min (se não houve sucesso depois)
var AUT_SENTINELA_ATRASO_MS = 900000; // a tela avisa quando a sentinela não roda há 15 min
var AUT_TEXTO_FORA_DO_AR = 'Portões pelo SGO+ fora do ar no momento: use o controle ou o aplicativo Smart Life. A gestão já foi avisada.';
var AUT_TEXTO_SEM_RESPOSTA = 'A nuvem dos portões não respondeu agora: tente de novo em alguns segundos. Se continuar, use o controle ou o aplicativo Smart Life.';
var AUT_SAUDE_NOMES = {
  tuya_nuvem: 'Nuvem dos portões e da porta (Tuya)', tuya_dispositivos: 'Portões e porta conectados à internet', tuya_cota: 'Consumo da cota da Tuya',
  tuya_economico: 'Modo econômico', tuya_mensagens: 'Eventos da Tuya (serviço de mensagens)', alarme: 'Central de alarme Intelbras',
  agendador: 'Rotinas agendadas do servidor', rotina_minuto: 'Rotina de 1 minuto da automação', rotina_rapida: 'Abertura automática (rotina rápida)',
  servidor: 'Servidor do SGO+', sentinela: 'Sentinela'
};
var AUT_SAUDE_TOM = { ok: 'verde', atencao: 'amarelo', falha: 'vermelho', desligado: 'cinza' };
var AUT_ORIGENS_USO = { COMANDO: 'Comandos de pessoas', MANUAL: 'Leituras pedidas na tela', TELA: 'Releitura automática das telas', AUTOMATICA: 'Consultas das rotinas',
  EVENTO: 'Abertura automática por evento', SENTINELA: 'Sentinela', SINCRONIZAR: 'Sincronização', TOKEN: 'Token de acesso', OUTRA: 'Outras' };

// ------------------------------------------------------------
// FALHA DA NUVEM NA TELA DA EQUIPE
// ------------------------------------------------------------
/**
 * Erro para a tela: falha da nuvem inteira (cota, plano, credencial) vira AUT_TEXTO_FORA_DO_AR e abre o incidente na hora
 * (a gestão é avisada); falha passageira (rede) vira AUT_TEXTO_SEM_RESPOSTA. Administrador e diretores veem também o detalhe.
 * Outros erros: padrao (quando informado) ou o próprio erro.
 */
function AutPred_erroNuvem_(e, padrao, sessao) {
  if (!e) return new Error(padrao || 'Não foi possível concluir. Tente de novo.');
  if (e.autAmigavel) return e;
  if (e.tuyaPausa) { var p = new Error('Leitura automática pausada: ' + String(e.message || '').replace(/^leitura automática pausada: /, '') + '. Toque em "Ler estado" para ler agora.'); p.autAmigavel = true; return p; }
  var temTuya = !!(e.tuyaCodigo || e.tuyaHttp || e.tuyaRede);
  var tipo = temTuya ? Tuya_tipoFalha_(e.tuyaCodigo, e.tuyaHttp, e.tuyaRede) : '';
  // falha passageira com mensagem própria do ponto (ex.: "nenhum pulso foi enviado"): a mensagem do ponto é mais útil
  if (tipo === 'REDE' && padrao) return new Error(padrao);
  if (tipo && Tuya_falhaDaNuvem_(tipo)) {
    AutPred_registrarFalhaNuvem_({ codigo: e.tuyaCodigo, http: e.tuyaHttp, incerto: e.tuyaRede, msg: e.message });
    var x = new Error((tipo === 'REDE' ? AUT_TEXTO_SEM_RESPOSTA : AutPred_textoForaDoAr_()) + (sessao && AutPred_administra_(sessao) ? ' Detalhe para a gestão: ' + Tuya_limpar_(e.message) + '.' : ''));
    x.autAmigavel = true; x.foraDoAr = tipo !== 'REDE';
    return x;
  }
  return padrao ? new Error(padrao) : e;
}

/** Texto para a equipe; "A gestão já foi avisada" só quando o aviso do incidente saiu de fato. */
function AutPred_textoForaDoAr_() {
  var ab = AutPred_saudeAbertos_().tuya_nuvem;
  return ab && ab.avisado ? AUT_TEXTO_FORA_DO_AR : AUT_TEXTO_FORA_DO_AR.replace('A gestão já foi avisada.', 'A gestão é avisada automaticamente.');
}

/**
 * Falha de um comando ou leitura: se for da nuvem inteira (não passageira), abre o incidente na hora e avisa. Devolve o tipo
 * quando é falha da nuvem (COTA, PLANO, CREDENCIAL, REDE) ou ''. r = { codigo, http, incerto, msg }.
 */
function AutPred_registrarFalhaNuvem_(r) {
  try {
    var tipo = Tuya_tipoFalha_(r && r.codigo, r && r.http, r && r.incerto);
    if (!Tuya_falhaDaNuvem_(tipo)) return '';
    if (tipo !== 'REDE') AutPred_saudeProcessar_([AutPred_itemNuvem_(tipo, r.codigo, r.msg)]);
    return tipo;
  } catch (e) { console.error('Saúde da infraestrutura, falha da nuvem: ' + ((e && e.message) || e)); return ''; }
}

/** Situação da nuvem para as telas: portões fora do ar (cota, plano, credencial) e o modo econômico. */
function AutPred_infraTela_() {
  var u = Tuya_uso_(), ab = AutPred_saudeAbertos_().tuya_nuvem;
  var fora = !!u.bloqueio || !!(ab && ab.id && ab.critico);
  return { portoesForaDoAr: fora, texto: fora ? AutPred_textoForaDoAr_() : '', economico: !!Tuya_economico_(),
    alarmeTexto: fora ? 'O alarme não depende da nuvem dos portões e continua funcionando pelo bloco "Alarme Intelbras".' : '' };
}

function AutPred_itemNuvem_(tipo, codigo, msg) {
  msg = Tuya_limpar_(msg);
  var mapa = {
    COTA: { texto: 'Cota da Tuya esgotada', porque: 'A Tuya respondeu o código ' + (codigo || 28841004) + ': a cota de chamadas do plano acabou' + (msg ? ' (' + msg + ')' : '') + '.',
      oQueFazer: 'Renove em iot.tuya.com › Cloud › Cloud Services › IoT Core (estender o período de teste ou assinar um plano). Enquanto isso, a equipe usa o controle ou o aplicativo Smart Life. O SGO+ volta sozinho quando a Tuya responder.' },
    PLANO: { texto: 'Plano do projeto na Tuya vencido', porque: 'A Tuya respondeu o código ' + codigo + (msg ? ' (' + msg + ')' : '') + '.',
      oQueFazer: 'Em iot.tuya.com › Cloud › Cloud Services › IoT Core, peça a extensão do período de teste ou assine o plano. Enquanto isso, use o controle ou o aplicativo Smart Life.' },
    CREDENCIAL: { texto: 'A Tuya recusou as credenciais ou a autorização do projeto', porque: msg || ('Código ' + codigo + '.'),
      oQueFazer: 'Confira o Access ID e o Access Secret em Administração › Chaves e senhas › Automação predial (Tuya) e, no portal da Tuya, os serviços autorizados do projeto (IoT Core, Authorization Token Management, Smart Lock Open Service).' },
    REDE: { texto: 'A nuvem da Tuya não responde', porque: msg || 'Sem resposta da plataforma.',
      oQueFazer: 'O SGO+ tenta de novo sozinho. Se continuar, confira a internet do servidor e a situação da plataforma da Tuya.' }
  };
  var m = mapa[tipo] || mapa.REDE;
  return { chave: 'tuya_nuvem', situacao: 'falha', texto: m.texto, porque: m.porque, oQueFazer: m.oQueFazer, confirmar: tipo === 'REDE' ? 2 : 1, critico: tipo !== 'REDE' };
}

// ------------------------------------------------------------
// INCIDENTES (AUT_INCIDENTES, só inclusão) E AVISOS (S74)
// ------------------------------------------------------------
function AutPred_saudeAbertos_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_PROP_ABERTOS) || '{}') || {}; } catch (e) { return {}; }
}
function AutPred_saudeLinha_(o) {
  try {
    CertCal_garantirTabela_(AUT_ABA_INCIDENTES, AUT_COLUNAS_INCIDENTES);
    var agora = new Date();
    SGO_DATA.insert(AUT_ABA_INCIDENTES, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_INCIDENTES, SGO_DATA.gerarRegistroBase({
      INCIDENTE: AutPred_s_(o.incidente), CHAVE: AutPred_s_(o.chave), ITEM: AUT_SAUDE_NOMES[o.chave] || AutPred_s_(o.chave), EVENTO: AutPred_s_(o.evento),
      SITUACAO: AutPred_s_(o.situacao), QUANDO: AutPred_agoraTexto_(agora), QUANDO_EM: agora.toISOString(), TEXTO: String(o.texto || '').slice(0, 500),
      PORQUE: String(o.porque || '').slice(0, 800), O_QUE_FAZER: String(o.oQueFazer || '').slice(0, 800), ACAO: String(o.acao || '').slice(0, 500),
      AVISADOS: o.avisados === undefined ? '' : String(o.avisados), POR: AutPred_s_(o.por) || 'Sentinela'
    })));
  } catch (e) { console.error('Saúde da infraestrutura, registro: ' + ((e && e.message) || e)); }
}

/** Aviso ao responsável pelo sistema e à Diretoria (S74). Nunca derruba a sentinela. Devolve quantas pessoas. */
function AutPred_saudeAvisar_(titulo, texto, textoWhatsapp, refId, comWhatsapp) {
  try {
    if (typeof SGO_notificar_ !== 'function') return 0;
    var ids = AutPred_usuariosGestao_(true);
    if (!ids.length) return 0;
    SGO_notificar_({ usuarios: ids, titulo: titulo, texto: texto, textoWhatsapp: textoWhatsapp, canais: comWhatsapp ? ['sgo', 'email', 'whatsapp'] : ['sgo', 'email'],
      origem: 'AUTOMACAO', refId: refId, evento: 'S74' });
    return ids.length;
  } catch (e) { console.error('Saúde da infraestrutura, aviso: ' + ((e && e.message) || e)); return 0; }
}

/**
 * Processa os itens conferidos. Item = { chave, situacao: ok|atencao|falha|desligado, texto, porque, oQueFazer, acoes: [{ texto, ok }],
 * confirmar (rodadas seguidas antes de abrir; padrão 1), incidente (atenção que vira incidente), critico (WhatsApp), avisar (false = sem aviso) }.
 * Abre o incidente uma vez, avisa uma vez, registra cada ação automática e avisa quando normaliza. Só mexe nas chaves recebidas.
 */
function AutPred_saudeProcessar_(itens) {
  var lock = null;
  try { lock = LockService.getScriptLock(); if (lock.hasLock && lock.hasLock()) lock = null; else lock.waitLock(10000); } catch (eL) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var abertos = AutPred_saudeAbertos_();
    var hora = Utilities.formatDate(new Date(), AUT_FUSO, 'dd/MM HH:mm');
    (itens || []).forEach(function (item) {
      if (!item || !item.chave) return;
      var nome = AUT_SAUDE_NOMES[item.chave] || item.chave;
      var ab = abertos[item.chave];
      (item.acoes || []).forEach(function (a) {
        AutPred_saudeLinha_({ incidente: ab && ab.id, chave: item.chave, evento: a.ok === false ? 'ACAO_SEM_SUCESSO' : 'ACAO_AUTOMATICA', situacao: item.situacao, texto: a.texto, acao: a.texto });
      });
      var ruim = item.situacao === 'falha' || (item.situacao === 'atencao' && item.incidente);
      if (ruim) {
        ab = ab || { rodadas: 0 };
        ab.rodadas = (Number(ab.rodadas) || 0) + 1;
        ab.texto = item.texto; ab.situacao = item.situacao; ab.critico = !!item.critico;
        if (!ab.id && ab.rodadas >= (Number(item.confirmar) || 1)) {
          ab.id = 'INC-' + Utilities.formatDate(new Date(), AUT_FUSO, 'yyyyMMdd-HHmmss') + '-' + item.chave;
          ab.desde = Date.now();
          AutPred_saudeLinha_({ incidente: ab.id, chave: item.chave, evento: 'ABERTO', situacao: item.situacao, texto: item.texto, porque: item.porque, oQueFazer: item.oQueFazer });
          if (item.avisar !== false) {
            var n = AutPred_saudeAvisar_('SGO+: ' + item.texto,
              'O quê: ' + item.texto + ' (' + nome + ', desde ' + hora + '). Por quê: ' + (item.porque || 'não informado') + ' O que fazer: ' + (item.oQueFazer || 'acompanhe em Segurança predial › Saúde da infraestrutura.'),
              'SGO+: ' + item.texto + '. ' + (item.oQueFazer || ''), ab.id, item.situacao === 'falha');
            ab.avisado = n > 0; ab.comWhatsapp = item.situacao === 'falha';
            AutPred_saudeLinha_({ incidente: ab.id, chave: item.chave, evento: 'AVISO_ENVIADO', situacao: item.situacao, texto: n ? 'Aviso enviado ao responsável pelo sistema e à Diretoria.' : 'Nenhum destinatário ativo para o aviso.', avisados: n });
          }
        }
        abertos[item.chave] = ab;
      } else if (ab) {
        if (ab.id && (item.situacao === 'ok' || item.situacao === 'desligado' || (item.situacao === 'atencao' && !item.incidente))) {
          AutPred_saudeLinha_({ incidente: ab.id, chave: item.chave, evento: 'NORMALIZADO', situacao: item.situacao, texto: item.texto || 'Normalizado.' });
          if (ab.avisado) {
            var n2 = AutPred_saudeAvisar_('SGO+ normalizado: ' + nome, 'Normalizado às ' + hora + ': ' + nome + '. Antes: ' + (ab.texto || '') + '. Agora: ' + (item.texto || 'funcionando') + '.',
              'SGO+: normalizado — ' + nome + '.', ab.id + '-N', !!ab.comWhatsapp);
            AutPred_saudeLinha_({ incidente: ab.id, chave: item.chave, evento: 'AVISO_NORMALIZADO', situacao: item.situacao, texto: 'Aviso de normalização enviado.', avisados: n2 });
          }
        }
        delete abertos[item.chave];
      }
    });
    props.setProperty(AUT_PROP_ABERTOS, JSON.stringify(abertos));
    return abertos;
  } finally { if (lock) try { lock.releaseLock(); } catch (e2) {} }
}

// ------------------------------------------------------------
// SENTINELA (a cada 5 min, chamada pelo servidor)
// ------------------------------------------------------------
function AutPred_mesAtual_() { return Tuya_diaDe_().slice(0, 7); }
function AutPred_propJson_(k, padrao) { try { var v = JSON.parse(PropertiesService.getScriptProperties().getProperty(k) || 'null'); return v === null ? padrao : v; } catch (e) { return padrao; } }
function AutPred_horaCurta_(ms) { return ms ? Utilities.formatDate(new Date(ms), AUT_FUSO, 'dd/MM HH:mm') : ''; }
function AutPred_milhar_(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

/** Itens da Tuya. Chamada real só na conferência de hora em hora (ou para renovar o token quando ele falhou). */
function AutPred_sentinelaTuya_(agoraMs) {
  agoraMs = agoraMs || Date.now();
  var props = PropertiesService.getScriptProperties();
  var c = AutPred_cfg_(), cfg = AutPred_saudeCfg_(), itens = [], acoes = [];
  var u = Tuya_uso_();
  var ligada = c.temCredencial && c.ligado;

  // modo econômico: virada do mês, entrada automática em economicoPct
  var mes = AutPred_mesAtual_(), ecoBruto = AutPred_propJson_(TUYA_PROP_ECONOMICO, null), acoesEco = [];
  if (ecoBruto && ecoBruto.mes !== mes) { props.deleteProperty(TUYA_PROP_ECONOMICO); acoesEco.push({ texto: 'Modo econômico desligado na virada do mês (cota nova).', ok: true }); }
  var pct = Math.floor(u.mesTotal / cfg.orcamentoMes * 1000) / 10;
  var dispensa = AutPred_propJson_(AUT_PROP_DISPENSA, null);
  var dispensado = !!(dispensa && dispensa.mes === mes);
  if (pct >= cfg.economicoPct && !Tuya_economico_() && !dispensado) {
    props.setProperty(TUYA_PROP_ECONOMICO, JSON.stringify({ mes: mes, desde: agoraMs, por: 'Sentinela', motivo: 'automático: ' + AutPred_milhar_(u.mesTotal) + ' de ' + AutPred_milhar_(cfg.orcamentoMes) + ' chamadas no mês (' + pct + '%)' }));
    acoesEco.push({ texto: 'Modo econômico ligado automaticamente: ' + AutPred_milhar_(u.mesTotal) + ' de ' + AutPred_milhar_(cfg.orcamentoMes) + ' chamadas no mês (' + pct + '%). Leituras automáticas e consulta da campainha pausadas; comandos de pessoas continuam.', ok: true });
  }
  var eco = Tuya_economico_();

  if (!ligada) {
    itens.push({ chave: 'tuya_nuvem', situacao: 'desligado', texto: 'Automação predial desligada no SGO+ (Chaves e senhas)', porque: (c.faltas || []).join('; '), oQueFazer: 'Nada a fazer enquanto a automação estiver desligada.' });
  } else {
    // autocorreção: token recusado (1010/1011/1400) -> pede outro (1 chamada)
    var e = u.ultimoErro, recente = e && Number(e.em) > u.ultimoOkEm && agoraMs - Number(e.em) < AUT_ERRO_RECENTE_MS;
    if (recente && e.tipo === 'TOKEN') {
      try { Tuya_esquecerToken_(); Tuya_comOrigem_('SENTINELA', function () { Tuya_token_(c, true); }); acoes.push({ texto: 'Token de acesso da Tuya renovado automaticamente.', ok: true }); }
      catch (eT) { acoes.push({ texto: 'Tentou renovar o token de acesso da Tuya: ' + Tuya_limpar_(eT && eT.message, c), ok: false }); }
      u = Tuya_uso_();
    }
    // conferência real: no máximo 1 por hora e só na janela. Com a nuvem normal, só se nenhuma chamada deu certo na última
    // hora e sem modo econômico; com bloqueio ou falha da nuvem depois do último sucesso, para ver se ela voltou.
    var sondaEm = Number(props.getProperty(AUT_PROP_SONDA) || 0), lista = null;
    var falhaAberta = !!u.bloqueio || !!(recente && Tuya_falhaDaNuvem_(e.tipo));
    var devido = agoraMs - sondaEm >= AUT_SONDA_MS && AutPred_naJanela_(cfg, agoraMs) && (falhaAberta || (agoraMs - u.ultimoOkEm >= AUT_SONDA_MS && !eco));
    if (devido) {
      props.setProperty(AUT_PROP_SONDA, String(agoraMs));
      for (var t = 0; t < 2 && !lista; t++) {
        try { lista = Tuya_comOrigem_('SENTINELA', function () { return Tuya_listarDispositivos_(c); }); }
        catch (eS) {
          if (!(eS && eS.tuyaRede) || t === 1) break;
          acoes.push({ texto: 'Conferência da Tuya sem resposta; repetida depois de 2 segundos.', ok: true });
          Utilities.sleep(2000);
        }
      }
      u = Tuya_uso_();
    }
    e = u.ultimoErro; recente = e && Number(e.em) > u.ultimoOkEm && agoraMs - Number(e.em) < AUT_ERRO_RECENTE_MS;
    var item;
    if (u.bloqueio) item = AutPred_itemNuvem_(u.bloqueio.tipo, u.bloqueio.codigo, u.bloqueio.texto);
    else if (recente && Tuya_falhaDaNuvem_(e.tipo)) item = AutPred_itemNuvem_(e.tipo, e.codigo, e.texto);
    else item = { chave: 'tuya_nuvem', situacao: 'ok', texto: 'Respondendo' + (u.ultimoOkEm ? ' (última resposta em ' + AutPred_horaCurta_(u.ultimoOkEm) + ')' : ''), porque: '', oQueFazer: '' };
    item.acoes = acoes;
    itens.push(item);

    // dispositivos: pela conferência (quando houve), senão pelo que telas e eventos já gravaram
    var porId = {};
    (lista || []).forEach(function (d) { porId[d.deviceId] = d; });
    var offline = [];
    AutPred_dispositivos_().forEach(function (d) {
      if (AutPred_s_(d.ATIVO).toUpperCase() === 'NAO' || AutPred_s_(d.HOMOLOGADO).toUpperCase() !== 'SIM') return;
      var l = porId[AutPred_s_(d.DEVICE_ID)];
      if (l) { var on = l.online ? 'SIM' : 'NAO'; if (on !== AutPred_s_(d.ONLINE)) { try { SGO_DATA.update(AUT_ABA_DISPOSITIVOS, d.ID, { ONLINE: on, ATUALIZADO_EM: SGO_UTILS.nowIso() }); } catch (eU) {} d.ONLINE = on; } }
      if (AutPred_s_(d.ONLINE).toUpperCase() === 'NAO') offline.push(AutPred_s_(d.NOME || d.NOME_PROVEDOR));
    });
    itens.push(offline.length
      ? { chave: 'tuya_dispositivos', situacao: 'falha', confirmar: 2, texto: offline.join(', ') + (offline.length > 1 ? ' sem internet' : ' sem internet'),
        porque: 'A Tuya informa o dispositivo desligado da internet; pelo SGO+ ele não recebe comando.', oQueFazer: 'Confira no local a energia e a rede sem fio do dispositivo. Enquanto isso, use o controle ou a própria porta.' }
      : { chave: 'tuya_dispositivos', situacao: 'ok', texto: 'Todos os dispositivos homologados conectados' + (lista ? ' (conferido agora)' : '') });
  }

  // cota
  var base = AutPred_milhar_(u.mesTotal) + ' de ' + AutPred_milhar_(cfg.orcamentoMes) + ' chamadas no mês (' + pct + '%)';
  if (pct >= cfg.avisoPct) itens.push({ chave: 'tuya_cota', situacao: 'atencao', incidente: true, texto: 'Consumo da cota da Tuya em ' + pct + '%: ' + base,
    porque: 'O orçamento configurado é de ' + AutPred_milhar_(cfg.orcamentoMes) + ' chamadas por mês (plano da Tuya). Aviso em ' + cfg.avisoPct + '%; modo econômico automático em ' + cfg.economicoPct + '%.',
    oQueFazer: 'Acompanhe em Segurança predial › Saúde da infraestrutura. Para mais folga, ligue o serviço de mensagens da Tuya (a campainha deixa de ser consultada) ou assine um plano maior e ajuste o orçamento na tela.' });
  else itens.push({ chave: 'tuya_cota', situacao: 'ok', texto: base });
  if (eco) itens.push({ chave: 'tuya_economico', situacao: 'atencao', incidente: true, acoes: acoesEco, texto: 'Modo econômico ligado (' + AutPred_s_(eco.motivo) + ')',
    porque: 'O consumo do mês chegou a ' + cfg.economicoPct + '% do orçamento. Para não esgotar a cota, só saem os comandos pedidos por pessoas e a abertura automática por evento.',
    oQueFazer: 'A posição dos portões e a campainha não são relidas sozinhas: use "Ler estado" e "Verificar campainha agora". Volta ao normal na virada do mês; a Diretoria pode sair antes em Saúde da infraestrutura.' });
  else itens.push({ chave: 'tuya_economico', situacao: 'ok', acoes: acoesEco, texto: dispensado ? 'Desligado pela Diretoria neste mês (' + AutPred_s_(dispensa.por) + ')' : 'Desligado' });
  return itens;
}

/** Item vindo do servidor, só com os campos conhecidos (nada de texto livre além do previsto). */
function AutPred_itemServidor_(x) {
  if (!x || !AUT_SAUDE_NOMES[x.chave] || !AUT_SAUDE_TOM[x.situacao]) return null;
  return { chave: x.chave, situacao: x.situacao, texto: String(x.texto || '').slice(0, 300), porque: String(x.porque || '').slice(0, 500), oQueFazer: String(x.oQueFazer || '').slice(0, 500),
    confirmar: Number(x.confirmar) || 1, incidente: !!x.incidente, critico: !!x.critico, avisar: x.avisar !== false,
    acoes: (Array.isArray(x.acoes) ? x.acoes : []).slice(0, 5).map(function (a) { return { texto: String((a && a.texto) || '').slice(0, 300), ok: !(a && a.ok === false) }; }) };
}

/**
 * Sentinela (o servidor chama a cada 5 min com o relatório dele; sem relatório, usa o último gravado em SENTINELA_SERVIDOR).
 * Grava AUT_SAUDE_ESTADO para a tela e processa os incidentes.
 */
function AutPred_sentinela(rel) {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  rel = rel && typeof rel === 'object' && Array.isArray(rel.itens) ? rel : AutPred_propJson_(AUT_PROP_SERVIDOR, { itens: [] });
  var servidor = (rel.itens || []).map(AutPred_itemServidor_).filter(Boolean);
  var tuya = AutPred_sentinelaTuya_(Date.now());
  var todos = tuya.concat(servidor);
  AutPred_saudeProcessar_(todos);
  var estado = { em: Date.now(), servidorEm: Number(rel.em) || 0, itens: todos.map(function (i) { return { chave: i.chave, situacao: i.situacao, texto: i.texto || '', porque: i.porque || '', oQueFazer: i.oQueFazer || '' }; }) };
  PropertiesService.getScriptProperties().setProperty(AUT_PROP_SAUDE, JSON.stringify(estado));
  return { itens: todos.length, falhas: todos.filter(function (i) { return i.situacao === 'falha'; }).length };
}

// ------------------------------------------------------------
// TELA "SAÚDE DA INFRAESTRUTURA" (Diretoria e Administrador)
// ------------------------------------------------------------
function AutPred_exigirSaude_(sessao) {
  if (!AutPred_administra_(sessao)) throw new Error('Não foi possível abrir: a Saúde da infraestrutura é da Diretoria e do Administrador. Se os portões não respondem, use o controle ou o aplicativo Smart Life e avise a gestão.');
}

function AutPred_saudePainel_(sessao) {
  AutPred_exigirSaude_(sessao);
  var est = AutPred_propJson_(AUT_PROP_SAUDE, {}), u = Tuya_uso_(), cfg = AutPred_saudeCfg_(), eco = Tuya_economico_(), msg = AutPred_msgEstado_(), abertos = AutPred_saudeAbertos_();
  var itens = (est.itens || []).map(function (i) {
    return { chave: i.chave, nome: AUT_SAUDE_NOMES[i.chave] || i.chave, situacao: i.situacao, tom: AUT_SAUDE_TOM[i.situacao] || 'cinza', texto: i.texto, porque: i.porque, oQueFazer: i.oQueFazer,
      incidente: abertos[i.chave] && abertos[i.chave].id ? AutPred_s_(abertos[i.chave].id) : '', avisado: !!(abertos[i.chave] && abertos[i.chave].avisado) };
  });
  if (!est.em || Date.now() - Number(est.em) > AUT_SENTINELA_ATRASO_MS) itens.unshift({ chave: 'sentinela', nome: AUT_SAUDE_NOMES.sentinela, situacao: 'atencao', tom: 'amarelo',
    texto: est.em ? 'A sentinela não roda desde ' + AutPred_horaCurta_(Number(est.em)) : 'A sentinela ainda não rodou neste servidor',
    porque: 'A conferência de 5 em 5 minutos é feita pelo servidor do SGO+.', oQueFazer: 'Se continuar, avise o responsável pelo sistema: a rotina do servidor pode estar parada.' });
  var lista = AutPred_ler_(AUT_ABA_INCIDENTES).sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, 120);
  var EVT = { ABERTO: 'Incidente aberto', AVISO_ENVIADO: 'Aviso enviado', ACAO_AUTOMATICA: 'Ação automática', ACAO_SEM_SUCESSO: 'Ação automática sem sucesso',
    NORMALIZADO: 'Normalizado', AVISO_NORMALIZADO: 'Aviso de normalização', ACAO_MANUAL: 'Ação da gestão' };
  var hoje = new Date(), diaMes = Number(Utilities.formatDate(hoje, AUT_FUSO, 'd'));
  var ano = Number(Utilities.formatDate(hoje, AUT_FUSO, 'yyyy')), mesN = Number(Utilities.formatDate(hoje, AUT_FUSO, 'M'));
  var diasNoMes = new Date(Date.UTC(ano, mesN, 0)).getUTCDate();
  var dias = Object.keys(u.porDia || {}).sort().slice(-14).map(function (k) { return { dia: k.slice(8, 10) + '/' + k.slice(5, 7), total: Number(u.porDia[k]) || 0 }; });
  var porOrigem = function (m) { return Object.keys(m || {}).sort(function (a, b) { return (m[b] || 0) - (m[a] || 0); }).map(function (k) { return { origem: AUT_ORIGENS_USO[k] || k, total: Number(m[k]) || 0 }; }); };
  return {
    agora: AutPred_agoraTexto_(), sentinelaEm: est.em ? AutPred_horaCurta_(Number(est.em)) : '', itens: itens,
    uso: { dia: u.diaTotal, ontem: u.ontemTotal, mes: u.mesTotal, orcamento: cfg.orcamentoMes, pct: Math.floor(u.mesTotal / cfg.orcamentoMes * 1000) / 10,
      projecaoMes: diaMes ? Math.round(u.mesTotal / diaMes * diasNoMes) : 0, avisoPct: cfg.avisoPct, economicoPct: cfg.economicoPct,
      porOrigemDia: porOrigem(u.diaPor), porOrigemMes: porOrigem(u.mesPor), dias: dias,
      mensagensDia: Number(msg.mensagensDia) || 0, mensagensMes: Number(msg.mensagensMes) || 0,
      ultimoErro: u.ultimoErro ? AutPred_horaCurta_(Number(u.ultimoErro.em)) + ' — ' + Tuya_textoErro_(u.ultimoErro.codigo, '', u.ultimoErro.http, 'a chamada') : '',
      bloqueio: u.bloqueio ? AutPred_itemNuvem_(u.bloqueio.tipo, u.bloqueio.codigo, u.bloqueio.texto).texto + ' desde ' + AutPred_horaCurta_(Number(u.bloqueio.desde)) : '' },
    eventos: { conectado: AutPred_eventosVivos_(msg), texto: AutPred_eventosVivos_(msg) ? 'Recebendo eventos da Tuya desde ' + AutPred_horaCurta_(Number(msg.desde)) : (msg.erro ? 'Sem eventos: ' + AutPred_s_(msg.erro) : 'Sem eventos da Tuya: consulta econômica em uso') },
    economico: { ligado: !!eco, desde: eco ? AutPred_horaCurta_(Number(eco.desde)) : '', motivo: eco ? AutPred_s_(eco.motivo) : '', por: eco ? AutPred_s_(eco.por) : '' },
    cfg: cfg, podeSairEconomico: AutPred_ehDiretor_(sessao), podeConfigurar: AutPred_ehDiretor_(sessao),
    incidentes: lista.map(function (r) { return { quando: AutPred_quandoCompleto_(r.QUANDO_EM), dia: AutPred_diaChave_(r.QUANDO_EM), evento: EVT[AutPred_s_(r.EVENTO)] || AutPred_s_(r.EVENTO), item: AutPred_s_(r.ITEM),
      texto: AutPred_s_(r.TEXTO), porque: AutPred_s_(r.PORQUE), oQueFazer: AutPred_s_(r.O_QUE_FAZER), incidente: AutPred_s_(r.INCIDENTE), por: AutPred_s_(r.POR), situacao: AutPred_s_(r.SITUACAO) }; })
  };
}

/** A Diretoria sai do modo econômico (com confirmação na tela e motivo). Vale até a virada do mês. */
function AutPred_saudeSairEconomico_(sessao, dados) {
  AutPred_exigirSaude_(sessao);
  if (!AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível sair do modo econômico: só um diretor decide. Peça a um diretor em Segurança predial › Saúde da infraestrutura.');
  var motivo = AutPred_s_(dados && dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível sair do modo econômico: escreva o motivo (mínimo de 5 caracteres). Fica registrado com o seu nome.');
  var eco = Tuya_economico_(), props = PropertiesService.getScriptProperties();
  if (!eco) return Object.assign(AutPred_saudePainel_(sessao), { mensagem: 'O modo econômico já estava desligado.' });
  props.deleteProperty(TUYA_PROP_ECONOMICO);
  props.setProperty(AUT_PROP_DISPENSA, JSON.stringify({ mes: AutPred_mesAtual_(), por: AutPred_nome_(sessao), em: Date.now(), motivo: motivo.slice(0, 300) }));
  AutPred_saudeLinha_({ chave: 'tuya_economico', evento: 'ACAO_MANUAL', situacao: 'ok', texto: 'Modo econômico desligado por ' + AutPred_nome_(sessao) + '. Motivo: ' + motivo, acao: 'sair do modo econômico', por: AutPred_nome_(sessao) });
  AutPred_auditar_({ evento: 'MODO_ECONOMICO_DESLIGADO', quem: sessao, resultado: 'OK', detalhe: 'Saiu do modo econômico. Motivo: ' + motivo });
  AutPred_saudeProcessar_([{ chave: 'tuya_economico', situacao: 'ok', texto: 'Desligado pela Diretoria (' + AutPred_nome_(sessao) + ')' }]);
  return Object.assign(AutPred_saudePainel_(sessao), { mensagem: 'Modo econômico desligado. As leituras automáticas voltam agora e, neste mês, o SGO+ não religa o modo sozinho; o aviso de consumo continua.' });
}

/** Orçamento da cota e janela da consulta econômica (diretor). */
function AutPred_saudeSalvarCfg_(sessao, dados) {
  AutPred_exigirSaude_(sessao);
  if (!AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível gravar: só um diretor muda o orçamento e a consulta econômica.');
  dados = dados || {};
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível gravar: escreva o motivo (mínimo de 5 caracteres).');
  var orc = Math.round(Number(String(dados.orcamentoMes || '').replace(/\./g, '').replace(',', '.')));
  if (!(orc >= 1000 && orc <= 100000000)) throw new Error('Não foi possível gravar: o orçamento precisa ser o número de chamadas por mês do plano da Tuya (de 1.000 para cima; o plano de teste tem 26.000).');
  var iv = Math.round(Number(dados.consultaIntervaloS));
  if (!(iv >= 60 && iv <= 1800)) throw new Error('Não foi possível gravar: o intervalo da consulta econômica precisa ser de 60 a 1.800 segundos.');
  var ini = AutPred_s_(dados.consultaInicio), fim = AutPred_s_(dados.consultaFim);
  if (!/^\d{2}:\d{2}$/.test(ini) || !/^\d{2}:\d{2}$/.test(fim) || ini >= fim) throw new Error('Não foi possível gravar: informe o início e o fim da janela no formato hh:mm, com o início antes do fim.');
  var diasSem = (Array.isArray(dados.consultaDias) ? dados.consultaDias : []).map(Number).filter(function (n) { return n >= 0 && n <= 6; });
  if (!diasSem.length) throw new Error('Não foi possível gravar: marque pelo menos um dia da semana para a consulta econômica.');
  var atual = AutPred_saudeCfg_();
  var novo = { orcamentoMes: orc, avisoPct: atual.avisoPct, economicoPct: atual.economicoPct, consultaInicio: ini, consultaFim: fim, consultaDias: diasSem, consultaIntervaloS: iv };
  var props = PropertiesService.getScriptProperties();
  props.setProperty(AUT_SAUDE_CFG, JSON.stringify(novo));
  var texto = 'Orçamento ' + AutPred_milhar_(orc) + ' chamadas/mês; consulta econômica das ' + ini + ' às ' + fim + ', a cada ' + iv + ' s. Motivo: ' + motivo;
  AutPred_saudeLinha_({ chave: 'tuya_cota', evento: 'ACAO_MANUAL', situacao: 'ok', texto: 'Configuração alterada por ' + AutPred_nome_(sessao) + ': ' + texto, acao: 'configuração', por: AutPred_nome_(sessao) });
  AutPred_auditar_({ evento: 'SAUDE_CONFIGURADA', quem: sessao, resultado: 'OK', detalhe: texto });
  // "volta ao normal quando a gestão ajustar": com o orçamento novo abaixo do limite, o modo econômico sai
  var u = Tuya_uso_(), extra = '';
  if (Tuya_economico_() && u.mesTotal / orc * 100 < atual.economicoPct) {
    props.deleteProperty(TUYA_PROP_ECONOMICO);
    AutPred_saudeLinha_({ chave: 'tuya_economico', evento: 'ACAO_MANUAL', situacao: 'ok', texto: 'Modo econômico desligado pelo orçamento novo.', acao: 'orçamento ajustado', por: AutPred_nome_(sessao) });
    AutPred_saudeProcessar_([{ chave: 'tuya_economico', situacao: 'ok', texto: 'Desligado: orçamento ajustado por ' + AutPred_nome_(sessao) }]);
    extra = ' Com o orçamento novo, o consumo ficou abaixo de ' + atual.economicoPct + '% e o modo econômico foi desligado.';
  }
  return Object.assign(AutPred_saudePainel_(sessao), { mensagem: 'Configuração gravada.' + extra });
}
