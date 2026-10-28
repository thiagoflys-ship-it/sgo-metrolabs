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
 *     Orçamento da cota (27/10/2026, dono: nada de 26.000 automático): sem orçamento CONFIRMADO por um diretor ou pelo
 *     Administrador (limite do pacote, período mensal ou único com início e fim, orçamento = valor escolhido, sugestão 50% do
 *     limite), o SGO+ fica no modo econômico. Com ele: 70% aviso; 90% MODO ECONÔMICO automático (AUT_ECONOMICO: só comandos
 *     pedidos por pessoa e a abertura automática por evento; leituras automáticas param); teto do dia = 2 vezes a cota diária
 *     média do período. Sai no período novo ou quando a Diretoria sai ou ajusta o orçamento.
 *     Bloqueio (cota, plano): a sonda verifica a volta com UMA chamada, no horário do recuo (15 min, 30 min, 1 h, depois de
 *     hora em hora; só no expediente); a volta abre 60 min de recuperação (SGO_Automacao_Tuya.js, Tuya_portao_).
 *     Abertura automática da porta: item próprio; suspensa (sem eventos vivos, sem evento da fechadura, sem validação por
 *     eventos ou nuvem bloqueada) vira incidente com aviso único e aviso de normalização.
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
  ponte_portoes: 'Ponte local dos portões (celular na rede da empresa)',
  auto_abertura: 'Abertura automática da porta (campainha)',
  agendador: 'Rotinas agendadas do servidor', rotina_minuto: 'Rotina de 1 minuto da automação', rotina_rapida: 'Abertura automática (rotina rápida)',
  servidor: 'Servidor do SGO+', sentinela: 'Sentinela'
};
var AUT_SAUDE_TOM = { ok: 'verde', atencao: 'amarelo', falha: 'vermelho', desligado: 'cinza' };
var AUT_ORIGENS_USO = { COMANDO: 'Comandos de pessoas', MANUAL: 'Leituras pedidas na tela', TELA: 'Releitura automática das telas', AUTOMATICA: 'Consultas das rotinas',
  EVENTO: 'Abertura automática (resposta à campainha)', SENTINELA: 'Sentinela', SINCRONIZAR: 'Sincronização', TOKEN: 'Token de acesso', OUTRA: 'Outras' };

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
  // 27/10/2026: nuvem bloqueada (cota ou plano): o SGO+ nem enviou; a equipe vê o "fora do ar", a gestão o detalhe
  if (e.tuyaBloqueioLocal) {
    AutPred_registrarFalhaNuvem_({ codigo: e.tuyaCodigo, http: 0, incerto: false, msg: e.message });
    var xb = new Error(AutPred_textoForaDoAr_() + (sessao && AutPred_administra_(sessao) ? ' Detalhe para a gestão: ' + Tuya_textoErro_(e.tuyaCodigo, '', 0, 'a chamada') + ' ' + Tuya_limpar_(e.message) + '.' : ''));
    xb.autAmigavel = true; xb.foraDoAr = true;
    return xb;
  }
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
  // 27/10/2026: com a nuvem fora, os portões seguem pelo SGO+ se TODOS os portões ativos estiverem na ponte local
  if (fora && typeof Tuya_localAtende_ === 'function') {
    try {
      var portoes = AutPred_dispositivos_().filter(function (d) { return d.TIPO !== 'FECHADURA' && AutPred_s_(d.ATIVO).toUpperCase() === 'SIM'; });
      if (portoes.length && portoes.every(function (d) { return Tuya_localAtende_(d.DEVICE_ID); })) fora = false;
    } catch (eL) {}
  }
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

// ------------------------------------------------------------
// ORÇAMENTO DA COTA (27/10/2026, dono: "não usar automaticamente 26.000"; depois: "sem confirmação não pode degradar")
// Contexto real: o painel da Tuya mostra "Free of charge within monthly usage limits of $0.20" e o pacote "Cloud Develop Base
// Resource Trial" cortou em 53.909 chamadas CLOUD_API_FOREIGN; a documentação diz que a cota do Trial renova todo mês (o
// serviço fica suspenso até a renovação). Referência PROVISÓRIA: limite de ~53.900 por mês e orçamento de 50% (26.950),
// marcada "provisório — confirmar no painel" até um diretor ou o Administrador confirmar (limite do pacote, período mensal
// ou pacote único com início e fim, orçamento escolhido). Sem confirmação o SGO+ opera normalmente (nada de modo econômico
// por falta de confirmação). Modo econômico só como emergência: 90% do orçamento confirmado, ou 90% do LIMITE de
// referência enquanto provisório. Consumo do dia acima da média diária: a releitura dos portões parados (sem eventos) passa
// a 60 s; acima do teto do dia (2 vezes a média), 120 s e aviso na Saúde; comandos, eventos e abertura automática não mudam.
// ------------------------------------------------------------
var AUT_ORC_TETO_FATOR = 2;     // teto do dia = 2 vezes a cota diária média do período (nunca gastar tudo num dia)
var AUT_ORC_TETO_MIN = 50;
var AUT_ORC_REF_LIMITE = 53900; // pacote Trial cortou em 53.909 chamadas (27/10/2026); renova por mês segundo a documentação
var AUT_ORC_REF_VALOR = 26950;  // 50% do limite de referência
var AUT_ORC_PASSOS = 'No painel da Tuya (platform.tuya.com), entre com a conta de desenvolvedor da Metrolabs; abra Cloud › Cloud Services (ou My Services) › IoT Core e veja o pacote em uso (resource pack): o limite de chamadas de API, se ele renova todo mês ou se é único, e as datas de início e fim. Depois, em Segurança predial › Saúde da infraestrutura › Orçamento da cota, informe o limite, o período e o orçamento (sugestão: metade do limite) e grave com o motivo.';

function AutPred_diaUtc_(ymd) { var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : 0; }
function AutPred_dataCurta_(ymd) { var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }

/** Orçamento gravado e válido, ou null (função pura sobre AUT_SAUDE_CFG.orcamento). */
function AutPred_orcamentoNormalizar_(o) {
  if (!o || typeof o !== 'object' || o.confirmado !== true) return null;
  var valor = Math.round(Number(o.valor)), limite = Math.round(Number(o.limitePacote));
  if (!(valor >= 100) || !(limite >= valor)) return null;
  var periodo = o.periodo === 'UNICO' ? 'UNICO' : 'MENSAL', ini = String(o.inicio || ''), fim = String(o.fim || '');
  if (periodo === 'UNICO' && !(AutPred_diaUtc_(ini) && AutPred_diaUtc_(fim) && ini <= fim)) return null;
  return { confirmado: true, valor: valor, limitePacote: limite, periodo: periodo, inicio: periodo === 'UNICO' ? ini : '', fim: periodo === 'UNICO' ? fim : '',
    jaUsado: Math.max(0, Math.round(Number(o.jaUsado) || 0)), mesConfirmacao: String(o.mesConfirmacao || ''), mesBase: Math.max(0, Number(o.mesBase) || 0),
    por: String(o.por || ''), em: Number(o.em) || 0, motivo: String(o.motivo || '') };
}

/**
 * Orçamento agora: { confirmado, provisorio, avisoProvisorio, chave (período: "aaaa-mm" ou "U<início>"), periodo, valor,
 * limitePacote, usado, pct, pctLimite, tetoDia, diaUsado, diasPeriodo, inicio, fim, texto }. Sem confirmação (ou com o pacote
 * único fora das datas), vale a referência provisória mensal. Função pura com cfg, u e agoraMs (os testes passam).
 */
function AutPred_orcamentoAgora_(cfg, u, agoraMs) {
  cfg = cfg || AutPred_saudeCfg_(); u = u || Tuya_uso_(); agoraMs = agoraMs || Date.now();
  var hoje = Tuya_diaDe_(agoraMs), mes = hoje.slice(0, 7), o = cfg.orcamento;
  var a = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7));
  var r = { confirmado: false, provisorio: false, avisoProvisorio: '', chave: mes, periodo: 'MENSAL', valor: AUT_ORC_REF_VALOR, limitePacote: AUT_ORC_REF_LIMITE, usado: u.mesTotal,
    diaUsado: u.diaTotal, diasPeriodo: new Date(Date.UTC(a, m, 0)).getUTCDate(), inicio: '', fim: '' };
  var foraDoPacote = o && o.periodo === 'UNICO' && (hoje < o.inicio || hoje > o.fim);
  if (!o || foraDoPacote) {
    r.provisorio = true;
    r.avisoProvisorio = foraDoPacote ? (hoje < o.inicio ? 'O pacote confirmado só começa em ' + AutPred_dataCurta_(o.inicio) : 'O período do pacote confirmado terminou em ' + AutPred_dataCurta_(o.fim)) + ': vale a referência provisória até confirmar o pacote em uso'
      : 'Orçamento provisório — confirmar no painel da Tuya o limite do pacote';
  } else {
    r.confirmado = true;
    Object.assign(r, { periodo: o.periodo, valor: o.valor, limitePacote: o.limitePacote, inicio: o.inicio, fim: o.fim, por: o.por, em: o.em });
    if (o.periodo === 'UNICO') {
      r.chave = 'U' + o.inicio;
      r.diasPeriodo = Math.round((AutPred_diaUtc_(o.fim) - AutPred_diaUtc_(o.inicio)) / 86400000) + 1;
      r.usado = o.jaUsado + (u.periodo && u.periodo.chave === r.chave ? Number(u.periodo.total) || 0 : 0);
    } else {
      // "já usado" (lido no painel da Tuya na confirmação) inclui o que o SGO+ contou até ali: soma só o que veio depois
      r.usado = o.jaUsado && o.mesConfirmacao === mes ? o.jaUsado + Math.max(0, u.mesTotal - o.mesBase) : u.mesTotal;
    }
  }
  r.pct = Math.floor(r.usado / r.valor * 1000) / 10;
  r.pctLimite = Math.floor(r.usado / r.limitePacote * 1000) / 10;
  r.tetoDia = Math.max(AUT_ORC_TETO_MIN, Math.ceil(r.valor / Math.max(1, r.diasPeriodo) * AUT_ORC_TETO_FATOR));
  r.texto = AutPred_milhar_(r.usado) + ' de ' + AutPred_milhar_(r.valor) + ' chamadas ' + (r.periodo === 'UNICO' ? 'no pacote (' + AutPred_dataCurta_(r.inicio) + ' a ' + AutPred_dataCurta_(r.fim) + ')' : 'no mês') +
    ' (' + r.pct + '%)' + (r.provisorio ? ' — orçamento provisório, confirmar no painel' : '');
  return r;
}

/** Emergência perto de esgotar: 90% do orçamento confirmado; provisório, 90% do limite de referência (nunca por falta de confirmação). */
function AutPred_orcamentoEmergencia_(cfg, orc) { return orc.confirmado ? orc.pct >= cfg.economicoPct : orc.pctLimite >= cfg.economicoPct; }
/** Passou do teto do dia: a releitura dos portões parados fica mais espaçada (60 s). */
function AutPred_acimaDoTetoDia_(orc) { orc = orc || AutPred_orcamentoAgora_(); return !!orc.tetoDia && orc.diaUsado >= orc.tetoDia; }

/**
 * Confirmação do orçamento (diretor ou Administrador), com o limite do pacote lido no painel da Tuya. dados = { limitePacote,
 * periodo: MENSAL|UNICO, inicio, fim (aaaa-mm-dd; obrigatórios no único), orcamento, jaUsado (opcional), motivo }.
 */
function AutPred_saudeOrcamento_(sessao, dados) {
  AutPred_exigirSaude_(sessao);
  dados = dados || {};
  var num = function (v) { return Math.round(Number(String(v === undefined || v === null ? '' : v).replace(/\./g, '').replace(',', '.'))); };
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível confirmar o orçamento: escreva o motivo (mínimo de 5 caracteres). Fica registrado com o seu nome.');
  var limite = num(dados.limitePacote), valor = num(dados.orcamento), ja = AutPred_s_(dados.jaUsado) ? num(dados.jaUsado) : 0;
  if (!(limite >= 100 && limite <= 100000000)) throw new Error('Não foi possível confirmar o orçamento: informe o limite de chamadas do pacote, como aparece no painel da Tuya (Cloud › Cloud Services › IoT Core). ' + AUT_ORC_PASSOS);
  if (!(valor >= 100 && valor <= limite)) throw new Error('Não foi possível confirmar o orçamento: o orçamento precisa ficar entre 100 e o limite do pacote (' + AutPred_milhar_(limite) + '). Sugestão: ' + AutPred_milhar_(Math.floor(limite / 2)) + ' (metade do limite), para sobrar folga.');
  if (!(ja >= 0 && ja <= limite)) throw new Error('Não foi possível confirmar o orçamento: o consumo já usado precisa ficar entre 0 e o limite do pacote.');
  var periodo = AutPred_s_(dados.periodo).toUpperCase() === 'UNICO' ? 'UNICO' : 'MENSAL', ini = AutPred_s_(dados.inicio), fim = AutPred_s_(dados.fim), hoje = Tuya_diaDe_();
  if (periodo === 'UNICO') {
    if (!AutPred_diaUtc_(ini) || !AutPred_diaUtc_(fim) || ini > fim) throw new Error('Não foi possível confirmar o orçamento: no pacote único, informe a data de início e a de fim (a do painel da Tuya), com o início antes do fim.');
    if (fim < hoje) throw new Error('Não foi possível confirmar o orçamento: o pacote informado já terminou (' + AutPred_dataCurta_(fim) + '). Confira no painel da Tuya o pacote em uso.');
  }
  var props = PropertiesService.getScriptProperties();
  var atual = AutPred_propJson_(AUT_SAUDE_CFG, {}) || {};
  var u = Tuya_uso_();
  atual.orcamento = { confirmado: true, limitePacote: limite, periodo: periodo, inicio: periodo === 'UNICO' ? ini : '', fim: periodo === 'UNICO' ? fim : '', valor: valor, jaUsado: ja,
    mesConfirmacao: hoje.slice(0, 7), mesBase: u.mesTotal, por: AutPred_nome_(sessao), em: Date.now(), motivo: motivo.slice(0, 300) };
  props.setProperty(AUT_SAUDE_CFG, JSON.stringify(atual));
  // pacote único: o consumo do período é somado a partir de agora (o "já usado" do painel cobre o que veio antes)
  u.periodo = periodo === 'UNICO' ? { chave: 'U' + ini, inicio: ini, fim: fim, total: 0 } : null;
  Tuya_usoGravar_(u);
  var texto = 'Orçamento confirmado: ' + AutPred_milhar_(valor) + ' chamadas ' + (periodo === 'UNICO' ? 'no pacote único de ' + AutPred_dataCurta_(ini) + ' a ' + AutPred_dataCurta_(fim) : 'por mês') +
    ' (limite do pacote: ' + AutPred_milhar_(limite) + (ja ? '; já usado: ' + AutPred_milhar_(ja) : '') + '). Motivo: ' + motivo;
  AutPred_saudeLinha_({ chave: 'tuya_cota', evento: 'ACAO_MANUAL', situacao: 'ok', texto: texto + ' Por ' + AutPred_nome_(sessao) + '.', acao: 'orçamento confirmado', por: AutPred_nome_(sessao) });
  AutPred_auditar_({ evento: 'ORCAMENTO_CONFIRMADO', quem: sessao, resultado: 'OK', detalhe: texto });
  var cfg = AutPred_saudeCfg_(), orc = AutPred_orcamentoAgora_(cfg), extra = '';
  var ecoGravado = AutPred_propJson_(TUYA_PROP_ECONOMICO, null);
  if (ecoGravado && !AutPred_orcamentoEmergencia_(cfg, orc)) {
    props.deleteProperty(TUYA_PROP_ECONOMICO);
    extra = ' Com o orçamento confirmado, o consumo ficou abaixo de ' + cfg.economicoPct + '% e o modo econômico foi desligado.';
  }
  AutPred_saudeProcessar_([AutPred_itemCota_(cfg, orc)]);
  return Object.assign(AutPred_saudePainel_(sessao), { mensagem: texto + extra });
}

/** Item "Consumo da cota" da sentinela. Provisório é informação (amarelo sem incidente): nada fica mais lento por isso. */
function AutPred_itemCota_(cfg, orc) {
  var prov = orc.provisorio ? ' ' + orc.avisoProvisorio + '. ' + AUT_ORC_PASSOS : '';
  if (orc.pct >= cfg.avisoPct) return { chave: 'tuya_cota', situacao: 'atencao', incidente: true, texto: 'Consumo da cota da Tuya em ' + orc.pct + '%: ' + orc.texto,
    porque: 'Orçamento ' + (orc.provisorio ? 'provisório' : 'confirmado') + ' de ' + AutPred_milhar_(orc.valor) + ' chamadas (' + (orc.periodo === 'UNICO' ? 'pacote único' : 'por mês') + '; limite do pacote ' + AutPred_milhar_(orc.limitePacote) + '). Aviso em ' + cfg.avisoPct + '%; modo econômico de emergência em ' + cfg.economicoPct + '%' + (orc.provisorio ? ' do limite' : '') + '.',
    oQueFazer: 'Acompanhe em Segurança predial › Saúde da infraestrutura e veja em "Chamadas por origem" o que mais gasta. Para mais folga, ligue o serviço de mensagens da Tuya ou amplie o pacote.' + prov };
  if (AutPred_acimaDoTetoDia_(orc)) return { chave: 'tuya_cota', situacao: 'atencao', avisar: false, texto: 'Acima do teto do dia: ' + AutPred_milhar_(orc.diaUsado) + ' de ' + AutPred_milhar_(orc.tetoDia) + ' chamadas hoje (' + orc.texto + ')',
    porque: 'O teto do dia é ' + AUT_ORC_TETO_FATOR + ' vezes a média diária do orçamento, para não gastar tudo num dia. Até a virada do dia, a posição dos portões parados (sem eventos) é relida a cada 120 s (acima da média diária, 60 s); comandos, eventos e a abertura automática não mudam.',
    oQueFazer: 'Veja em "Chamadas por origem" o que mais gastou hoje.' + prov };
  if (orc.provisorio) return { chave: 'tuya_cota', situacao: 'atencao', avisar: false, texto: orc.texto, porque: orc.avisoProvisorio + '. O SGO+ funciona normalmente com a referência provisória (pacote de cerca de 53.900 chamadas por mês, orçamento de 50%).', oQueFazer: AUT_ORC_PASSOS };
  return { chave: 'tuya_cota', situacao: 'ok', texto: orc.texto + ' · teto do dia ' + AutPred_milhar_(orc.tetoDia) };
}

/**
 * Sonda do bloqueio: UMA chamada barata (detalhe de um dispositivo) para ver se a Tuya voltou. Só a SENTINELA e só no horário
 * do recuo (Tuya_portao_). Sem token guardado, o pedido do token vai antes (mais uma chamada). Nunca envia comando.
 */
function AutPred_sondaNuvem_(c) {
  var lista = AutPred_dispositivos_().filter(function (d) { return AutPred_s_(d.DEVICE_ID) && AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO'; });
  lista.sort(function (a, b) { return (AutPred_s_(b.HOMOLOGADO) === 'SIM' ? 1 : 0) - (AutPred_s_(a.HOMOLOGADO) === 'SIM' ? 1 : 0); });
  if (lista.length) return Tuya_dispositivo_(c, lista[0].DEVICE_ID);
  var r = Tuya_exigirOk_(Tuya_chamar_(c, 'GET', '/v1.0/iot-01/associated-users/devices', { size: 1 }), c, 'a conferência da nuvem');
  return r.result;
}

/** Itens da Tuya. Chamada real só na sonda do bloqueio ou na conferência de hora em hora (ou para renovar o token quando ele falhou). */
function AutPred_sentinelaTuya_(agoraMs) {
  agoraMs = agoraMs || Date.now();
  var props = PropertiesService.getScriptProperties();
  var c = AutPred_cfg_(), cfg = AutPred_saudeCfg_(), itens = [], acoes = [];
  var u = Tuya_uso_();
  var ligada = c.temCredencial && c.ligado;

  // modo econômico: período novo do orçamento (virada do mês ou pacote novo), entrada automática em economicoPct
  var orc = AutPred_orcamentoAgora_(cfg, u, agoraMs), ecoBruto = AutPred_propJson_(TUYA_PROP_ECONOMICO, null), acoesEco = [];
  if (ecoBruto && ecoBruto.mes !== orc.chave) { props.deleteProperty(TUYA_PROP_ECONOMICO); acoesEco.push({ texto: orc.periodo === 'UNICO' ? 'Modo econômico desligado: período novo do pacote.' : 'Modo econômico desligado na virada do mês (cota nova).', ok: true }); }
  var dispensa = AutPred_propJson_(AUT_PROP_DISPENSA, null);
  var dispensado = !!(dispensa && dispensa.mes === orc.chave);
  if (AutPred_orcamentoEmergencia_(cfg, orc) && !AutPred_propJson_(TUYA_PROP_ECONOMICO, null) && !dispensado) {
    props.setProperty(TUYA_PROP_ECONOMICO, JSON.stringify({ mes: orc.chave, desde: agoraMs, por: 'Sentinela', motivo: 'automático: ' + orc.texto }));
    acoesEco.push({ texto: 'Modo econômico ligado automaticamente: ' + orc.texto + '. Leituras automáticas pausadas; comandos de pessoas e eventos continuam.', ok: true });
  }
  var eco = Tuya_economico_();

  if (!ligada) {
    itens.push({ chave: 'tuya_nuvem', situacao: 'desligado', texto: 'Automação predial desligada no SGO+ (Chaves e senhas)', porque: (c.faltas || []).join('; '), oQueFazer: 'Nada a fazer enquanto a automação estiver desligada.' });
  } else {
    // autocorreção: token recusado (1010/1011/1400) -> pede outro (1 chamada); com bloqueio, não (a sonda cuida)
    var e = u.ultimoErro, recente = e && Number(e.em) > u.ultimoOkEm && agoraMs - Number(e.em) < AUT_ERRO_RECENTE_MS;
    if (recente && e.tipo === 'TOKEN' && !u.bloqueio) {
      try { Tuya_esquecerToken_(); Tuya_comOrigem_('SENTINELA', function () { Tuya_token_(c, true); }); acoes.push({ texto: 'Token de acesso da Tuya renovado automaticamente.', ok: true }); }
      catch (eT) { acoes.push({ texto: 'Tentou renovar o token de acesso da Tuya: ' + Tuya_limpar_(eT && eT.message, c), ok: false }); }
      u = Tuya_uso_();
    }
    var lista = null, fase = Tuya_fase_(u, agoraMs);
    if (u.bloqueio) {
      // 27/10/2026 (dono): bloqueado, só a sonda, com UMA chamada, no horário do recuo e no expediente; nunca repetida aqui
      if (agoraMs >= Number(u.bloqueio.proximaSondaEm || 0) && AutPred_naJanela_(cfg, agoraMs)) {
        var sondaOk = false;
        try { Tuya_comOrigem_('SENTINELA', function () { return AutPred_sondaNuvem_(c); }); sondaOk = true; } catch (eSo) {}
        u = Tuya_uso_();
        acoes.push(sondaOk && !u.bloqueio ? { texto: 'Sonda da nuvem: a Tuya voltou a responder. Recuperação gradual de 60 minutos começou.', ok: true }
          : { texto: 'Sonda da nuvem: a Tuya continua recusando' + (u.bloqueio ? '; próxima conferência às ' + AutPred_horaCurta_(Number(u.bloqueio.proximaSondaEm)) + ' (recuo de ' + Math.round(Number(u.bloqueio.recuoMs) / 60000) + ' min)' : '') + '.', ok: false });
      }
    } else if (fase === 'NORMAL') {
      // conferência real com a nuvem normal: no máximo 1 por hora, na janela, sem modo econômico e só se nenhuma chamada deu
      // certo na última hora (ou se a última falha foi da nuvem inteira)
      var sondaEm = Number(props.getProperty(AUT_PROP_SONDA) || 0);
      var falhaAberta = !!(recente && Tuya_falhaDaNuvem_(e.tipo));
      var devido = agoraMs - sondaEm >= AUT_SONDA_MS && AutPred_naJanela_(cfg, agoraMs) && !eco && (falhaAberta || agoraMs - u.ultimoOkEm >= AUT_SONDA_MS);
      if (devido) {
        props.setProperty(AUT_PROP_SONDA, String(agoraMs));
        for (var t = 0; t < 2 && !lista; t++) {
          try { lista = Tuya_comOrigem_('SENTINELA', function () { return Tuya_listarDispositivos_(c); }); }
          catch (eS) {
            // só falha passageira (sem resposta, 429, 5xx) é repetida; código de bloqueio nunca
            if (!(eS && eS.tuyaRede) || t === 1) break;
            acoes.push({ texto: 'Conferência da Tuya sem resposta; repetida depois de 2 segundos.', ok: true });
            Utilities.sleep(2000);
          }
        }
        u = Tuya_uso_();
      }
    }
    e = u.ultimoErro; recente = e && Number(e.em) > u.ultimoOkEm && agoraMs - Number(e.em) < AUT_ERRO_RECENTE_MS;
    fase = Tuya_fase_(u, agoraMs);
    var item;
    if (u.bloqueio) {
      item = AutPred_itemNuvem_(u.bloqueio.tipo, u.bloqueio.codigo, u.bloqueio.texto);
      item.porque += ' Nada é enviado à Tuya enquanto isso. Próxima conferência automática às ' + AutPred_horaCurta_(Number(u.bloqueio.proximaSondaEm)) + ' (recuo de ' + Math.round(Number(u.bloqueio.recuoMs) / 60000) + ' min' + (u.bloqueio.rebloqueio ? '; voltou a bloquear depois de uma volta, o recuo dobrou' : '') + ').';
    } else if (fase === 'RECUPERACAO_1' || fase === 'RECUPERACAO_2') {
      item = { chave: 'tuya_nuvem', situacao: 'atencao', texto: 'A nuvem voltou às ' + AutPred_horaCurta_(Number(u.recuperacao.desde)) + ': em recuperação até ' + AutPred_horaCurta_(Number(u.recuperacao.ate)),
        porque: 'Depois de um bloqueio o SGO+ volta aos poucos: nos primeiros 30 minutos só saem comandos de pessoas e eventos; depois, as leituras automáticas, com no máximo ' + TUYA_LIMITE_MINUTO_RECUPERACAO + ' chamadas por minuto. Se a Tuya recusar de novo, o bloqueio volta na hora e a próxima conferência espera o dobro.',
        oQueFazer: 'Nada a fazer. Se o bloqueio voltar, confira o pacote no painel da Tuya.' };
    }
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

  // cota (orçamento confirmado ou provisório) e modo econômico de emergência
  itens.push(AutPred_itemCota_(cfg, AutPred_orcamentoAgora_(cfg, Tuya_uso_(), agoraMs)));
  if (eco) itens.push({ chave: 'tuya_economico', situacao: 'atencao', incidente: true, acoes: acoesEco, texto: 'Modo econômico ligado (' + AutPred_s_(eco.motivo) + ')',
    porque: 'O consumo chegou a ' + cfg.economicoPct + '% (emergência, perto de esgotar o pacote). Continuam: comandos pedidos por pessoas, os eventos da Tuya e a abertura automática por evento.',
    oQueFazer: 'Ficam mais lentos: a posição dos portões sem eventos (use "Ler estado") e, sem eventos, a campainha e a abertura automática (use "Verificar campainha agora" ou o aplicativo Smart Life). Volta ao normal no período novo; a Diretoria pode sair antes em Saúde da infraestrutura.' });
  else itens.push({ chave: 'tuya_economico', situacao: 'ok', acoes: acoesEco, texto: dispensado ? 'Desligado pela Diretoria neste período (' + AutPred_s_(dispensa.por) + ')' : 'Desligado' });
  itens.push(AutPred_itemAutoAbertura_(agoraMs));
  return itens;
}

/**
 * Item "Abertura automática da porta" (27/10/2026, dono: a preferência da Diretoria nunca é apagada nem suspensa). Mostra por
 * qual caminho ela está funcionando: eventos (zero consulta) ou consulta da fechadura a cada 60 s (sem eventos), e a
 * validação por eventos, que é só informativa. Sem nome do dispositivo (o Administrador vê a Saúde e não vê a porta).
 */
function AutPred_itemAutoAbertura_(agoraMs) {
  var lista = AutPred_dispositivos_().filter(function (d) { return AutPred_autoAbrir_(d) && AutPred_ehPedido_(d) && AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO'; });
  if (!lista.length) return { chave: 'auto_abertura', situacao: 'desligado', texto: 'Abertura automática desligada' };
  var cfg = AutPred_saudeCfg_(), textos = [], semCaminho = [], semDireito = [];
  lista.forEach(function (d) {
    var cam = AutPred_caminhoFechadura_(d, cfg, agoraMs);
    if (cam.via === 'EVENTOS') textos.push('Ligada: pelos eventos da Tuya (na hora, sem consulta)');
    else if (cam.via === 'CONSULTA') textos.push('Ligada: sem eventos, pela consulta da fechadura a cada ' + cam.intervaloS + ' s (abre em até ' + cam.intervaloS + ' s depois do toque)');
    else { textos.push('Ligada, mas sem eventos e sem consulta agora (' + cam.motivo + ')'); semCaminho.push(cam.motivo); }
    var resp = AutPred_autoResponsavel_(d);
    if (!resp.ok) { textos.push('atenção: ' + resp.motivo); semDireito.push(resp.motivo); }
    textos.push(AutPred_eventosValidado_(d) ? 'validada por eventos em ' + AutPred_dataBr_(d.EVENTOS_VALIDADO_EM) + ' (informativo)' : 'ainda não validada por eventos (informativo)');
  });
  if (!semCaminho.length && !semDireito.length) return { chave: 'auto_abertura', situacao: 'ok', texto: textos.join('; ') };
  return { chave: 'auto_abertura', situacao: 'atencao', incidente: true, confirmar: semDireito.length ? 1 : 2, texto: textos.join('; '),
    porque: (semCaminho.length ? 'Sem os eventos da Tuya, a porta só abre sozinha pela consulta da fechadura, que agora não roda: ' + semCaminho.join('; ') + '. ' : '') +
      (semDireito.length ? 'A abertura automática continua agindo, mas ' + semDireito.join('; ') + '. ' : '') + 'A preferência da Diretoria continua ligada.',
    oQueFazer: (semCaminho.length ? 'Quando tocarem a campainha, use "Verificar campainha agora" e "Abrir agora", ou o aplicativo Smart Life. Para voltar ao normal: ligue o serviço de mensagens da Tuya (manual do módulo) ou ajuste o horário da consulta em Saúde da infraestrutura. ' : '') +
      (semDireito.length ? 'Um diretor que destrava a porta decide: desligar e ligar de novo (fica no nome dele) ou desligar.' : '') };
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
  var orc = AutPred_orcamentoAgora_(cfg, u), fase = Tuya_fase_(u);
  // 27/10/2026: fechaduras (só para diretores: o Administrador não vê a porta da Diretoria)
  var fechaduras = !AutPred_ehDiretor_(sessao) ? [] : AutPred_dispositivos_().filter(function (d) { return AutPred_ehPedido_(d) && AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO'; }).map(function (d) {
    var cam = AutPred_caminhoFechadura_(d, cfg), ev = AutPred_eventoGuardado_(d.DEVICE_ID), pe = AutPred_pedidoEventoEm_(ev);
    return { nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), autoAbrir: AutPred_autoAbrir_(d), autoAbrirPor: AutPred_s_(d.AUTO_ABRIR_POR),
      caminho: cam.via, caminhoTexto: cam.via === 'EVENTOS' ? 'Pelos eventos da Tuya (na hora, sem consulta)' : cam.via === 'CONSULTA' ? 'Sem eventos: consulta da fechadura a cada ' + cam.intervaloS + ' s' : 'Sem eventos e sem consulta agora (' + cam.motivo + ')',
      validado: AutPred_eventosValidado_(d), validadoEm: AutPred_dataBr_(d.EVENTOS_VALIDADO_EM), validadoPor: AutPred_s_(d.EVENTOS_VALIDADO_POR), validadoDetalhe: AutPred_s_(d.EVENTOS_VALIDADO_DETALHE),
      eventoRecebido: !!ev, pedidoEventoEm: pe ? AutPred_horaCurta_(pe) : '', responsavel: AutPred_autoAbrir_(d) ? AutPred_autoResponsavel_(d) : { ok: true, motivo: '' } };
  });
  return {
    agora: AutPred_agoraTexto_(), sentinelaEm: est.em ? AutPred_horaCurta_(Number(est.em)) : '', itens: itens, fechaduras: fechaduras,
    orcamento: { confirmado: orc.confirmado, provisorio: orc.provisorio, avisoProvisorio: orc.avisoProvisorio, periodo: orc.periodo, valor: orc.valor, limitePacote: orc.limitePacote,
      inicio: AutPred_dataCurta_(orc.inicio), fim: AutPred_dataCurta_(orc.fim), usado: orc.usado, pct: orc.pct, tetoDia: orc.tetoDia, diaUsado: orc.diaUsado, texto: orc.texto, por: AutPred_s_(orc.por),
      em: orc.em ? AutPred_horaCurta_(orc.em) : '', sugestao: Math.floor(orc.limitePacote / 2), passos: AUT_ORC_PASSOS, podeConfirmar: AutPred_administra_(sessao) },
    nuvem: { fase: fase, bloqueio: u.bloqueio ? { desde: AutPred_horaCurta_(Number(u.bloqueio.desde)), proximaSonda: AutPred_horaCurta_(Number(u.bloqueio.proximaSondaEm)), recuoMin: Math.round(Number(u.bloqueio.recuoMs) / 60000), sondas: Number(u.bloqueio.sondas) || 0, rebloqueio: !!u.bloqueio.rebloqueio } : null,
      recuperacaoAte: u.recuperacao && fase !== 'NORMAL' ? AutPred_horaCurta_(Number(u.recuperacao.ate)) : '' },
    uso: { dia: u.diaTotal, ontem: u.ontemTotal, mes: u.mesTotal, orcamento: orc.valor, pct: orc.pct, provisorio: orc.provisorio,
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
  props.setProperty(AUT_PROP_DISPENSA, JSON.stringify({ mes: AutPred_orcamentoAgora_().chave, por: AutPred_nome_(sessao), em: Date.now(), motivo: motivo.slice(0, 300) }));
  AutPred_saudeLinha_({ chave: 'tuya_economico', evento: 'ACAO_MANUAL', situacao: 'ok', texto: 'Modo econômico desligado por ' + AutPred_nome_(sessao) + '. Motivo: ' + motivo, acao: 'sair do modo econômico', por: AutPred_nome_(sessao) });
  AutPred_auditar_({ evento: 'MODO_ECONOMICO_DESLIGADO', quem: sessao, resultado: 'OK', detalhe: 'Saiu do modo econômico. Motivo: ' + motivo });
  AutPred_saudeProcessar_([{ chave: 'tuya_economico', situacao: 'ok', texto: 'Desligado pela Diretoria (' + AutPred_nome_(sessao) + ')' }]);
  return Object.assign(AutPred_saudePainel_(sessao), { mensagem: 'Modo econômico desligado. As leituras automáticas voltam agora e, neste mês, o SGO+ não religa o modo sozinho; o aviso de consumo continua.' });
}

/**
 * Consulta sem eventos (diretor): horário e dias da consulta da fechadura, intervalo dela (30 a 85 s, sempre menor que a
 * janela de ~90 s do pedido) e intervalo da posição do portão parado com tela visível (10 a 600 s). O orçamento é à parte
 * (AutPred_saudeOrcamento_) e é preservado aqui.
 */
function AutPred_saudeSalvarCfg_(sessao, dados) {
  AutPred_exigirSaude_(sessao);
  if (!AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível gravar: só um diretor muda o horário e os intervalos da consulta sem eventos.');
  dados = dados || {};
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível gravar: escreva o motivo (mínimo de 5 caracteres).');
  var iv = Math.round(Number(dados.consultaIntervaloS));
  if (!(iv >= 30 && iv <= 85)) throw new Error('Não foi possível gravar: o intervalo da consulta da fechadura precisa ser de 30 a 85 segundos (menor que os cerca de 90 segundos do pedido da campainha, para nenhum toque passar sem ser visto).');
  var pp = AutPred_s_(dados.portaoParadoS) ? Math.round(Number(dados.portaoParadoS)) : AutPred_saudeCfg_().portaoParadoS;
  if (!(pp >= 10 && pp <= 600)) throw new Error('Não foi possível gravar: o intervalo da posição do portão parado precisa ser de 10 a 600 segundos.');
  var ini = AutPred_s_(dados.consultaInicio), fim = AutPred_s_(dados.consultaFim);
  if (!/^\d{2}:\d{2}$/.test(ini) || !/^\d{2}:\d{2}$/.test(fim) || ini >= fim) throw new Error('Não foi possível gravar: informe o início e o fim do horário no formato hh:mm, com o início antes do fim (24 horas: 00:00 às 23:59).');
  var diasSem = (Array.isArray(dados.consultaDias) ? dados.consultaDias : []).map(Number).filter(function (n) { return n >= 0 && n <= 6; });
  if (!diasSem.length) throw new Error('Não foi possível gravar: marque pelo menos um dia da semana para a consulta da fechadura.');
  var props = PropertiesService.getScriptProperties();
  var bruto = AutPred_propJson_(AUT_SAUDE_CFG, {}) || {};
  Object.assign(bruto, { consultaInicio: ini, consultaFim: fim, consultaDias: diasSem, consultaIntervaloS: iv, portaoParadoS: pp });
  delete bruto.orcamentoMes;
  props.setProperty(AUT_SAUDE_CFG, JSON.stringify(bruto));
  var horas = AutPred_horasJanela_(ini, fim) * diasSem.length;
  var texto = 'Consulta da fechadura sem eventos das ' + ini + ' às ' + fim + ' (' + diasSem.length + ' dia(s) da semana), a cada ' + iv + ' s (cerca de ' + AutPred_milhar_(horas * 3600 / iv * 4.3) + ' chamadas por mês); portão parado a cada ' + pp + ' s com tela visível. Motivo: ' + motivo;
  AutPred_saudeLinha_({ chave: 'tuya_cota', evento: 'ACAO_MANUAL', situacao: 'ok', texto: 'Configuração alterada por ' + AutPred_nome_(sessao) + ': ' + texto, acao: 'configuração', por: AutPred_nome_(sessao) });
  AutPred_auditar_({ evento: 'SAUDE_CONFIGURADA', quem: sessao, resultado: 'OK', detalhe: texto });
  return Object.assign(AutPred_saudePainel_(sessao), { mensagem: 'Configuração gravada. ' + texto });
}
function AutPred_horasJanela_(ini, fim) { var m = function (t) { return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); }; return Math.max(0, (m(fim) - m(ini) + (fim === '23:59' ? 1 : 0)) / 60); }
