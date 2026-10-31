/****************************************************
 * RELATÓRIO DO CICLO DA LAVADORA — MÓDULO (31/10/2026)
 *
 * Pedido do dono (31/10/2026): "a lavadora ultrassônica gera, a cada ciclo, um arquivo .sgolav [...] criar no SGO+ um
 * módulo que importa esse arquivo e gera um relatório A4 HTML de uma única folha, que fica salvo", com a fita da
 * impressora, gráfico, indicadores, conclusão por IA e a assinatura do responsável pelo local feita na tela; pelo QR code
 * do equipamento ("Gerar relatório do ciclo") e por tela própria no computador e no celular; a Metrolabs e o cliente com
 * o login dele (só os equipamentos dele).
 *
 * Uma chamada do navegador: LavCiclo_api(sessionId, acao, dados). Ações:
 *  iniciar · equipamento · conferir · gerar · listar · abrir · assinar · novaVersao · referencias
 * Decisões do dono que este arquivo garante:
 *  - o arquivo não traz a série da máquina: a ligação com o equipamento vem do QR ou da escolha na tela, e a tela mostra
 *    lote, data, horário, receita e resultado para conferir antes de confirmar ("conferir" não grava nada);
 *  - o mesmo lote nunca é importado duas vezes para o mesmo equipamento: devolve o relatório que já existe;
 *  - campo futuro SERIE=/EQUIPAMENTO= do firmware: se vier e não bater com o equipamento, recusa (LavCicL_conferirEquipamento_);
 *  - ciclo reprovado ou cancelado também gera relatório, com a falha em destaque;
 *  - dados do cliente e do equipamento vêm do cadastro do SGO+ (instantâneo na geração); faltou campo importante, o
 *    relatório sai e a tela avisa o que falta, com o atalho para quem pode completar o cadastro;
 *  - depois de assinado, o documento fica travado: correção só em nova versão, com motivo, mantendo a anterior.
 * Acesso: equipe interna (todos os perfis da Metrolabs) vê e gera para qualquer equipamento; o perfil CLIENTE só para os
 * equipamentos do cliente dele, também nos arquivos (Representacao_arquivoClientePermitido_ consulta
 * LavCic_arquivoClientePermitido_ na rota /arquivos do servidor). Referências por receita: Administrador, Diretoria,
 * Gestor e Metrologia.
 * Abas: LAVCIC_RELATORIOS e LAVCIC_HISTORICO. Propriedade: LAVCIC_REFERENCIAS (JSON) e LAVCIC_PASTA_RAIZ.
 * Nenhuma função devolve Date cru: datas em texto.
 ****************************************************/

var LAVCIC_TZ = 'America/Sao_Paulo';
var LAVCIC_ABAS = { RELATORIOS: 'LAVCIC_RELATORIOS', HISTORICO: 'LAVCIC_HISTORICO' };
var LAVCIC_COLUNAS = {
  LAVCIC_RELATORIOS: ['ID', 'NUMERO', 'VERSAO', 'SITUACAO', 'EQUIPAMENTO_ID', 'CLIENTE_ID', 'UNIDADE_ID', 'CHAVE_LOTE', 'LOTE', 'RECEITA', 'OPERADOR',
    'DATA_CICLO', 'HORA_CICLO', 'INICIO_TEXTO', 'FIM_TEXTO', 'RESULTADO', 'RESULTADO_CLASSE', 'COD_FALHA', 'FALHA', 'TEMP_FINAL', 'DURACAO_SEG',
    'DESINF_SEG', 'DESINF_TEMP_MAX', 'MANUT_VENCIDA', 'FASES_QTD', 'EVENTOS_QTD', 'PAUSAS', 'FORMATO_ARQUIVO', 'DADOS_JSON', 'CADASTRO_JSON',
    'CADASTRO_FALTANDO', 'REFERENCIA_JSON', 'CONCLUSAO_TEXTO', 'CONCLUSAO_ORIGEM', 'CONCLUSAO_MOTIVO', 'ARQUIVO_NOME', 'ARQUIVO_SHA256', 'ARQUIVO_ID',
    'HTML_ID', 'HTML_URL', 'PDF_ID', 'PDF_URL', 'PASTA_URL', 'PAGINAS', 'SALVO', 'HASH_DOCUMENTO', 'HTML_ID_SEM_ASSINATURA', 'PDF_ID_SEM_ASSINATURA',
    'ASSINADO', 'ASSINATURA_ID', 'ASSINATURA_SHA256', 'ASSINANTE_NOME', 'ASSINANTE_CARGO', 'ASSINADO_EM', 'ASSINADO_POR_ID', 'ASSINADO_POR_NOME',
    'HASH_ASSINADO', 'VERSAO_ANTERIOR_ID', 'SUBSTITUIDO_POR_ID', 'MOTIVO_VERSAO', 'GERADO_POR_ID', 'GERADO_POR_NOME', 'GERADO_POR_PERFIL', 'EMITIDO_EM', 'ATUALIZADO_EM'],
  LAVCIC_HISTORICO: ['ID', 'RELATORIO_ID', 'NUMERO', 'TIPO', 'TEXTO', 'USUARIO_ID', 'USUARIO_NOME', 'PERFIL', 'DATA']
};
var LAVCIC_COLUNAS_TEXTO = { LAVCIC_RELATORIOS: ['NUMERO', 'LOTE', 'CHAVE_LOTE', 'DATA_CICLO', 'HORA_CICLO', 'COD_FALHA', 'ARQUIVO_SHA256', 'HASH_DOCUMENTO', 'HASH_ASSINADO'] };
/** Tipos de equipamento que aparecem para gerar relatório (o cadastro usa texto livre em TIPO). */
var LAVCIC_TIPOS_ACEITOS = /LAVADORA|TERMODESINF|ULTRASS/i;
var LAVCIC_PERFIS_REFERENCIA = ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'];
var LAVCIC_ASSINATURA_MAX = 260000;

function LavCic_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function LavCic_up_(v) { return LavCic_s_(v).toUpperCase(); }
function LavCic_agora_() { return Utilities.formatDate(new Date(), LAVCIC_TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function LavCic_br_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(LavCic_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : LavCic_s_(iso); }
function LavCic_json_(t, padrao) { try { var v = JSON.parse(LavCic_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function LavCic_hex_(bytes) { return bytes.map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length === 1 ? '0' + h : h; }).join(''); }
/** CNPJ com a máscara (o cadastro guarda às vezes só os 14 dígitos); outro formato passa como está. */
function LavCic_cnpj_(v) { var d = LavCic_s_(v).replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : LavCic_s_(v); }
function LavCic_sha_(texto) { return LavCic_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset.UTF_8)); }
function LavCic_shaBytes_(bytes) { return LavCic_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)); }

function LavCic_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LAVCIC_ABAS_OK_V1')) return; } catch (e) {}
  Object.keys(LAVCIC_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LAVCIC_COLUNAS[aba]);
    LAVCIC_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LAVCIC_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LAVCIC_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
function LavCic_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}
function LavCic_historico_(rel, tipo, texto, eu) {
  try {
    SGO_DATA.insert(LAVCIC_ABAS.HISTORICO, { RELATORIO_ID: rel ? LavCic_s_(rel.ID) : '', NUMERO: rel ? LavCic_s_(rel.NUMERO) : '', TIPO: tipo, TEXTO: String(texto || '').slice(0, 3000),
      USUARIO_ID: eu ? eu.id : '', USUARIO_NOME: eu ? eu.nome : '', PERFIL: eu ? eu.perfil : '', DATA: LavCic_agora_() });
  } catch (e) { try { console.error('Relatório do ciclo, histórico: ' + ((e && e.message) || e)); } catch (x) {} }
}
function LavCic_comTrava_(fn) {
  var trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { throw new Error('Não foi possível concluir agora: outra pessoa está gerando um relatório neste momento. Por quê: a numeração e a conferência do lote repetido precisam de um de cada vez. O que fazer: aguarde alguns segundos e toque de novo; nada foi gravado'); }
  try { return fn(); } finally { try { trava.releaseLock(); } catch (e) {} }
}

// ------------------------------------------------------------
// QUEM ESTÁ USANDO
// ------------------------------------------------------------
function LavCic_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); } catch (e) { u = null; }
  var perfil = LavCic_up_(s.perfil);
  var eu = { id: LavCic_s_(s.userId), nome: LavCic_s_(s.nome) || LavCic_s_(u && u.NOME) || 'Usuário', email: LavCic_s_(u && u.EMAIL).toLowerCase(), perfil: perfil,
    clienteId: LavCic_s_(s.clienteId) || LavCic_s_(u && u.CLIENTE_ID) };
  eu.cliente = perfil === 'CLIENTE';
  eu.interno = !eu.cliente && perfil !== 'REPRESENTADA' && !!perfil;
  eu.gestao = ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(perfil) >= 0;
  eu.referencias = LAVCIC_PERFIS_REFERENCIA.indexOf(perfil) >= 0;
  eu.cadastro = eu.interno; // o cadastro de equipamento é da equipe interna (SGO_Equipamentos recusa o perfil CLIENTE)
  return eu;
}
function LavCic_exigirAcesso_(eu) {
  if (eu.interno) return;
  if (eu.cliente && eu.clienteId) return;
  if (eu.cliente) throw new Error('Não foi possível abrir os relatórios de ciclo: o seu usuário de cliente não está ligado a nenhum cliente no cadastro. Por quê: o cliente só vê os equipamentos da empresa dele, e o sistema não sabe qual é a sua. O que fazer: peça à Metrolabs para ligar o seu usuário ao cadastro da sua empresa');
  throw new Error('Não foi possível abrir: os relatórios de ciclo da lavadora são da equipe da Metrolabs e dos clientes donos dos equipamentos. Por quê: o seu perfil não está entre eles. O que fazer: se precisa deste relatório, peça à Metrolabs');
}

// ------------------------------------------------------------
// CADASTRO (fonte única: CAD_CLIENTES, CAD_UNIDADES, CAD_EQUIPAMENTOS)
// ------------------------------------------------------------
function LavCic_mapa_(aba) { var m = {}; LavCic_ler_(aba).forEach(function (r) { m[LavCic_s_(r.ID)] = r; }); return m; }
function LavCic_ativo_(r) { var s = LavCic_up_(r && r.STATUS); return !s || s === 'ATIVO'; }
function LavCic_podeEquip_(eu, eq) { return !!eq && (eu.interno || (eu.cliente && !!eu.clienteId && LavCic_s_(eq.CLIENTE_ID) === eu.clienteId)); }
function LavCic_equip_(eu, id) {
  var eq = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, LavCic_s_(id));
  if (!eq) throw new Error('Não foi possível abrir o equipamento: ele não está no cadastro. Por quê: o QR code ou o link aponta para um equipamento que foi excluído ou que nunca foi cadastrado. O que fazer: volte à lista de equipamentos e escolha de novo; se não encontrar, peça à Metrolabs para cadastrar');
  if (!LavCic_podeEquip_(eu, eq)) throw new Error('Acesso negado: este equipamento não pertence à sua empresa. Por quê: o seu usuário só vê e gera relatórios dos equipamentos do seu cliente. O que fazer: confira se leu o QR code da máquina certa; se for da sua empresa e o cadastro estiver errado, peça à Metrolabs para corrigir');
  return eq;
}
function LavCic_rotuloEquip_(eq) {
  return [LavCic_s_(eq.TIPO) || 'Equipamento', LavCic_s_(eq.TAG) ? 'TAG ' + LavCic_s_(eq.TAG) : '', LavCic_s_(eq.SERIE) ? 'série ' + LavCic_s_(eq.SERIE) : ''].filter(Boolean).join(' · ');
}
/** Instantâneo do cadastro para o documento + lista do que falta. */
function LavCic_cadastro_(eq) {
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, LavCic_s_(eq.CLIENTE_ID)) || {};
  var uni = LavCic_s_(eq.UNIDADE_ID) ? (SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, LavCic_s_(eq.UNIDADE_ID)) || {}) : {};
  var cidade = [LavCic_s_(uni.CIDADE), LavCic_s_(uni.UF)].filter(Boolean).join('/');
  var endUni = LavCic_s_(uni.ENDERECO);
  // a cidade só entra quando o endereço ainda não a traz (cadastro vindo do Auvo já escreve "RUA..., TRINDADE - GO")
  var end = [endUni, cidade && LavCic_up_(endUni).indexOf(LavCic_up_(uni.CIDADE)) < 0 ? cidade : ''].filter(Boolean).join(', ');
  var cad = {
    cliente: LavCic_s_(cli.RAZAO_SOCIAL) || LavCic_s_(cli.NOME_FANTASIA), cnpj: LavCic_cnpj_(LavCic_s_(uni.CNPJ_UNIDADE) || LavCic_s_(cli.CNPJ)),
    unidade: [LavCic_s_(uni.NOME_UNIDADE), end].filter(Boolean).join(' · '), setor: LavCic_s_(eq.SETOR),
    equipamento: LavCic_s_(eq.TIPO), fabricante: LavCic_s_(eq.FABRICANTE), modelo: LavCic_s_(eq.MODELO), serie: LavCic_s_(eq.SERIE), patrimonio: LavCic_s_(eq.PATRIMONIO), tag: LavCic_s_(eq.TAG)
  };
  var faltam = [];
  if (!cad.cliente) faltam.push('cliente');
  if (!cad.cnpj) faltam.push('CNPJ do cliente');
  if (!LavCic_s_(eq.UNIDADE_ID)) faltam.push('unidade');
  if (!cad.setor) faltam.push('setor onde está instalado');
  if (!cad.fabricante) faltam.push('fabricante');
  if (!cad.modelo) faltam.push('modelo');
  if (!cad.serie) faltam.push('número de série');
  if (!cad.patrimonio && !cad.tag) faltam.push('patrimônio ou TAG');
  return { cad: cad, faltam: faltam };
}
function LavCic_equipParaTela_(eu, eq, rels) {
  var c = LavCic_cadastro_(eq), deste = (rels || []).filter(function (r) { return LavCic_s_(r.EQUIPAMENTO_ID) === LavCic_s_(eq.ID) && LavCic_up_(r.SITUACAO) !== 'SUBSTITUIDO'; });
  deste.sort(function (a, b) { return (LavCic_s_(b.DATA_CICLO) + LavCic_s_(b.HORA_CICLO)).localeCompare(LavCic_s_(a.DATA_CICLO) + LavCic_s_(a.HORA_CICLO)); });
  return { id: LavCic_s_(eq.ID), rotulo: LavCic_rotuloEquip_(eq), tipo: c.cad.equipamento, fabricante: c.cad.fabricante, modelo: c.cad.modelo, serie: c.cad.serie, tag: c.cad.tag, patrimonio: c.cad.patrimonio,
    setor: c.cad.setor, cliente: c.cad.cliente, unidade: c.cad.unidade, ativo: LavCic_ativo_(eq), faltam: c.faltam, podeCompletar: eu.cadastro,
    relatorios: deste.length, semAssinatura: deste.filter(function (r) { return LavCic_up_(r.ASSINADO) !== 'SIM'; }).length,
    ultimo: deste[0] ? { lote: LavCic_s_(deste[0].LOTE), data: LavCic_br_(deste[0].DATA_CICLO), resultado: LavCic_s_(deste[0].RESULTADO), classe: LavCic_s_(deste[0].RESULTADO_CLASSE) } : null };
}
function LavCic_equipamentosVisiveis_(eu, rels) {
  var comRel = {};
  (rels || []).forEach(function (r) { comRel[LavCic_s_(r.EQUIPAMENTO_ID)] = 1; });
  return LavCic_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) {
    if (!LavCic_podeEquip_(eu, e)) return false;
    return (LAVCIC_TIPOS_ACEITOS.test(LavCic_s_(e.TIPO)) && LavCic_ativo_(e)) || comRel[LavCic_s_(e.ID)];
  });
}

// ------------------------------------------------------------
// REFERÊNCIAS POR RECEITA (a confirmar pelo responsável técnico)
// ------------------------------------------------------------
/**
 * Padrão documentado: NENHUMA referência. O arquivo não traz a temperatura nem o tempo programados na receita (o alvo
 * fica na memória da lavadora e pode ser mudado pelo operador), então o sistema não presume valor. Quem tem o perfil de
 * referência cadastra, por receita, a temperatura mínima e o tempo mínimo esperados da desinfecção térmica; até o
 * responsável técnico marcar "confirmada", o documento escreve "a confirmar pelo responsável técnico".
 */
function LavCic_referencias_() { var r = LavCic_json_(PropertiesService.getScriptProperties().getProperty('LAVCIC_REFERENCIAS'), {}); r.receitas = r.receitas || {}; return r; }
function LavCic_chaveReceita_(nome) { return LavCic_up_(nome).replace(/\s+/g, ' '); }
function LavCic_referenciaDe_(receita) { var r = LavCic_referencias_().receitas[LavCic_chaveReceita_(receita)]; return r && (r.tempMin || r.tempoMinSeg) ? r : null; }
function LavCic_numBr_(v) { var s = LavCic_s_(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); if (!s) return null; var n = Number(s); return isFinite(n) ? n : NaN; }
function LavCic_acaoReferencias_(eu, sid, d) {
  var cfg = LavCic_referencias_();
  if (d && d.salvar) {
    if (!eu.referencias) throw new Error('Não foi possível salvar a referência: ela é cadastrada pelo Administrador, pela Diretoria, pela gestão ou pela Metrologia. Por quê: o valor aparece no relatório entregue ao cliente. O que fazer: peça a uma dessas pessoas');
    var x = d.salvar, receita = LavCic_chaveReceita_(x.receita);
    if (!receita) throw new Error('Não foi possível salvar: escreva o nome da receita exatamente como aparece na fita da lavadora (por exemplo, INSTRUMENTAL PADRÃO)');
    var antes = cfg.receitas[receita] || null;
    if (x.remover) {
      delete cfg.receitas[receita];
    } else {
      var t = LavCic_numBr_(x.tempMin), m = LavCic_numBr_(x.tempoMinMin);
      if ((t !== null && (isNaN(t) || t < 20 || t > 100)) || (m !== null && (isNaN(m) || m < 0.5 || m > 120))) throw new Error('Não foi possível salvar: a temperatura precisa ficar entre 20 e 100 °C e o tempo entre 0,5 e 120 minutos. Por quê: fora disso não é um valor de desinfecção térmica de lavadora. O que fazer: confira os números e salve de novo');
      if (t === null && m === null) throw new Error('Não foi possível salvar: informe a temperatura mínima, o tempo mínimo ou os dois. Para tirar a referência, use "Remover"');
      var motivo = LavCic_s_(x.motivo);
      if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o motivo ou a fonte do valor (pelo menos 10 letras), por exemplo "parâmetro validado na qualificação de 10/2026". Por quê: o valor sai no relatório do cliente e precisa de origem');
      var confirmar = !!x.confirmado && (eu.perfil === 'METROLOGIA' || eu.gestao);
      cfg.receitas[receita] = { receita: receita, tempMin: t === null ? null : Math.round(t * 10) / 10, tempoMinSeg: m === null ? null : Math.round(m * 60), motivo: motivo.slice(0, 300),
        confirmado: confirmar, confirmadoPor: confirmar ? eu.nome : '', confirmadoEm: confirmar ? LavCic_br_(LavCic_agora_()).slice(0, 10) : '', alteradoPor: eu.nome, em: LavCic_agora_() };
    }
    PropertiesService.getScriptProperties().setProperty('LAVCIC_REFERENCIAS', JSON.stringify(cfg));
    LavCic_historico_(null, 'REFERENCIA', 'Receita ' + receita + ': ' + (x.remover ? 'referência removida' : JSON.stringify(cfg.receitas[receita])) + (antes ? ' (antes: ' + JSON.stringify(antes) + ')' : ''), eu);
  }
  var receitasVistas = {};
  LavCic_ler_(LAVCIC_ABAS.RELATORIOS).forEach(function (r) { var k = LavCic_chaveReceita_(r.RECEITA); if (k) receitasVistas[k] = 1; });
  Object.keys(cfg.receitas).forEach(function (k) { receitasVistas[k] = 1; });
  return { podeEditar: eu.referencias, receitas: Object.keys(receitasVistas).sort().map(function (k) {
    var r = cfg.receitas[k] || null;
    return { receita: k, tem: !!r, tempMin: r && r.tempMin !== null ? r.tempMin : null, tempMinTxt: r && r.tempMin ? LavCicD_num_(r.tempMin, 1) + ' °C' : '', tempoMinTxt: r && r.tempoMinSeg ? LavCicD_dur_(r.tempoMinSeg) : '',
      tempoMinMin: r && r.tempoMinSeg ? r.tempoMinSeg / 60 : null, confirmado: !!(r && r.confirmado), confirmadoPor: r ? LavCic_s_(r.confirmadoPor) : '', motivo: r ? LavCic_s_(r.motivo) : '', alteradoPor: r ? LavCic_s_(r.alteradoPor) : '', em: r ? LavCic_br_(r.em) : '' };
  }), message: d && d.salvar ? 'Referência da receita ' + LavCic_chaveReceita_(d.salvar.receita) + (d.salvar.remover ? ' removida.' : ' salva. Vale para os relatórios gerados daqui em diante; os já emitidos não mudam.') : '' };
}

// ------------------------------------------------------------
// RELATÓRIOS
// ------------------------------------------------------------
function LavCic_chaveLote_(equipId, lote) { return LavCic_s_(equipId) + '|' + LavCic_up_(lote); }
function LavCic_relParaTela_(eu, r) {
  var assinado = LavCic_up_(r.ASSINADO) === 'SIM', subst = LavCic_up_(r.SITUACAO) === 'SUBSTITUIDO';
  return { id: LavCic_s_(r.ID), numero: LavCic_s_(r.NUMERO), versao: Number(r.VERSAO) || 1, substituido: subst, equipamentoId: LavCic_s_(r.EQUIPAMENTO_ID),
    lote: LavCic_s_(r.LOTE), receita: LavCic_s_(r.RECEITA), data: LavCic_br_(r.DATA_CICLO), dataIso: LavCic_s_(r.DATA_CICLO), hora: LavCic_s_(r.HORA_CICLO).slice(0, 5),
    resultado: LavCic_s_(r.RESULTADO), classe: LavCic_s_(r.RESULTADO_CLASSE), falha: LavCic_s_(r.FALHA), codFalha: LavCic_s_(r.COD_FALHA),
    desinfeccao: LavCic_s_(r.DESINF_SEG) ? LavCicD_temp_(Number(r.DESINF_TEMP_MAX)) + ' · ' + LavCicD_dur_(Number(r.DESINF_SEG)) : '',
    duracao: LavCicD_dur_(Number(r.DURACAO_SEG) || 0), htmlUrl: LavCic_s_(r.HTML_URL), pdfUrl: LavCic_s_(r.PDF_URL), salvo: LavCic_up_(r.SALVO) === 'SIM',
    assinado: assinado, assinante: LavCic_s_(r.ASSINANTE_NOME), cargo: LavCic_s_(r.ASSINANTE_CARGO), assinadoEm: LavCic_br_(r.ASSINADO_EM),
    conclusaoOrigem: LavCic_s_(r.CONCLUSAO_ORIGEM), faltam: LavCic_json_(r.CADASTRO_FALTANDO, []), por: LavCic_s_(r.GERADO_POR_NOME), em: LavCic_br_(r.EMITIDO_EM),
    podeAssinar: !assinado && !subst, podeNovaVersao: !subst && eu.interno, motivoVersao: LavCic_s_(r.MOTIVO_VERSAO) };
}
function LavCic_relVisivel_(eu, r) { return eu.interno || (eu.cliente && !!eu.clienteId && LavCic_s_(r.CLIENTE_ID) === eu.clienteId); }
function LavCic_relatoriosVisiveis_(eu) { return LavCic_ler_(LAVCIC_ABAS.RELATORIOS).filter(function (r) { return LavCic_relVisivel_(eu, r); }); }
function LavCic_relatorio_(eu, id) {
  var r = SGO_DATA.getById(LAVCIC_ABAS.RELATORIOS, LavCic_s_(id));
  if (!r || !LavCic_relVisivel_(eu, r)) throw new Error('Não foi possível abrir o relatório: ele não existe ou não é de um equipamento da sua empresa. O que fazer: volte à lista de relatórios e abra de novo');
  return r;
}
function LavCic_proximoNumero_() {
  var ano = Utilities.formatDate(new Date(), LAVCIC_TZ, 'yyyy'), maior = 0, re = new RegExp('^RCL-' + ano + '-(\\d+)$');
  LavCic_ler_(LAVCIC_ABAS.RELATORIOS).forEach(function (r) { var m = re.exec(LavCic_s_(r.NUMERO)); if (m) maior = Math.max(maior, parseInt(m[1], 10)); });
  return 'RCL-' + ano + '-' + ('000' + (maior + 1)).slice(-4);
}
function LavCic_pasta_(cad) {
  var raiz = SGO_DocSalvar_pastaPersistente_('LAVCIC_PASTA_RAIZ', 'Relatórios de ciclo da lavadora', '');
  var cliente = SGO_DocSalvar_pastaClienteEm_(raiz, cad.cnpj, cad.cliente || 'Cliente sem nome');
  var eq = RelA4_subpasta_(cliente, [cad.tag || cad.patrimonio || cad.serie || 'Sem TAG', cad.equipamento || 'Lavadora'].join(' - '));
  return RelA4_subpasta_(eq, 'Relatórios de ciclo');
}
function LavCic_idArquivo_(url) { return typeof SGO_DocSalvar_idDaUrl_ === 'function' ? SGO_DocSalvar_idDaUrl_(url) : ''; }
function LavCic_restrito_(arquivo) { try { arquivo.setSharing('RESTRITO', 'SISTEMA'); } catch (e) { try { if (DriveApp.Access && DriveApp.Access.PRIVATE) arquivo.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (x) {} } }
function LavCic_contarPaginas_(pdfUrl) {
  try { var id = LavCic_idArquivo_(pdfUrl); if (!id || typeof SGO_DocA4_paginasDoPdf_ !== 'function') return 0; return SGO_DocA4_paginasDoPdf_(DriveApp.getFileById(id).getBlob())._total || 0; } catch (e) { return 0; }
}
/** Grava HTML + PDF do documento. Nunca lança: devolve o resultado de RelA4_salvar_ com os IDs. */
function LavCic_gravarDocumento_(cad, nome, html) {
  var g = RelA4_salvar_(function () { return LavCic_pasta_(cad); }, nome, html, { compartilhar: false });
  g.htmlId = LavCic_idArquivo_(g.htmlUrl); g.pdfId = LavCic_idArquivo_(g.pdfUrl);
  g.paginas = g.salvo ? (LavCic_contarPaginas_(g.pdfUrl) || g.paginas || 0) : 0;
  return g;
}
function LavCic_nomeArquivo_(numero, versao, lote, sufixo) {
  return SGO_DocSalvar_sanitizarNome_(['Relatório do ciclo', numero, 'v' + versao, lote, sufixo].filter(Boolean).join(' - '));
}

/** Lê e confere o arquivo para um equipamento (não grava). */
function LavCic_lerParaEquip_(eq, d) {
  var texto = LavCic_s_(d.texto) ? String(d.texto) : '';
  var nome = LavCic_s_(d.nomeArquivo).slice(0, 120);
  if (!texto) throw new Error('Não foi possível ler: nenhum arquivo chegou ao servidor. O que fazer: toque em "Escolher o arquivo do ciclo" e escolha o arquivo .sgolav de novo');
  if (nome && !/\.sgolav$/i.test(nome)) throw new Error('Não foi possível ler: o arquivo escolhido (' + nome + ') não é um arquivo de ciclo. Por quê: a lavadora grava três arquivos por ciclo (.csv, .txt e .sgolav) e só o .sgolav traz os dados completos para o relatório. O que fazer: escolha o arquivo do mesmo lote com final .sgolav');
  var r = LavCicL_ler_(texto);
  if (!r.ok) throw new Error('Não foi possível ler o arquivo ' + (nome || '') + ': ' + r.message.replace(/[.\s]+$/, ''));
  var conf = LavCicL_conferirEquipamento_(r.ciclo, eq);
  if (!conf.ok) throw new Error(conf.message.replace(/[.\s]+$/, ''));
  var avisos = r.avisos.slice();
  if (conf.aviso) avisos.push(conf.aviso);
  return { ciclo: r.ciclo, avisos: avisos, nome: nome || (r.ciclo.lote + '.sgolav'), texto: texto, sha: LavCic_sha_(texto) };
}
function LavCic_existente_(equipId, lote) {
  var chave = LavCic_chaveLote_(equipId, lote);
  var todos = LavCic_ler_(LAVCIC_ABAS.RELATORIOS).filter(function (r) { return LavCic_s_(r.CHAVE_LOTE) === chave; });
  if (!todos.length) return null;
  return todos.filter(function (r) { return LavCic_up_(r.SITUACAO) !== 'SUBSTITUIDO'; })[0] || todos.sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0];
}
function LavCic_resumoConferencia_(ciclo) {
  return { lote: ciclo.lote, data: ciclo.data, horaInicio: ciclo.inicio ? ciclo.inicio.hora.slice(0, 5) + (ciclo.inicio.estimado ? ' (calculado)' : '') : '—', horaFim: ciclo.fim ? ciclo.fim.hora.slice(0, 5) : ciclo.hora.slice(0, 5),
    receita: ciclo.receita, resultado: ciclo.resultado, classe: ciclo.resultadoClasse, falha: ciclo.codFalha ? ciclo.falha + ' (código ' + ciclo.codFalha + ')' : '', duracao: LavCicD_dur_(ciclo.duracaoSeg),
    fases: ciclo.fases.length, eventos: ciclo.eventos.length, desinfeccao: ciclo.desinfeccao ? LavCicD_temp_(ciclo.desinfeccao.tempMax) + ' por ' + LavCicD_dur_(ciclo.desinfeccao.duracaoSeg) : '',
    manutVencida: ciclo.manutVencida, operador: ciclo.operador, formato: ciclo.formato };
}

/**
 * Monta o documento (sem gravar). base: linha atual (para nova versão ou assinatura) ou null.
 * o: { eu, eq, ciclo, nomeArquivo, sha, numero, versao, cadastro, referencia, conclusao, emitidoEm, versaoAnterior, assinatura }
 */
function LavCic_montar_(o) {
  var html = '';
  // folha única: gera, conta as páginas do PDF e, se passar de uma, reduz a escala do miolo (até 3 níveis). Sem o gerador de PDF, fica no nível 0.
  for (var nivel = 0; nivel <= 3; nivel++) {
    html = LavCicD_html_({ numero: o.numero, versao: o.versao, ciclo: o.ciclo, cadastro: o.cadastro, referencia: o.referencia, conclusao: o.conclusao, emitidoEm: o.emitidoEm, emitidoPor: o.emitidoPor,
      arquivo: { nome: o.nomeArquivo, sha256: o.sha, importadoPor: o.importadoPor, importadoEm: o.emitidoEm }, versaoAnterior: o.versaoAnterior || null, assinatura: o.assinatura || null, encaixe: nivel });
    if (nivel === 3 || typeof o.contarPaginas !== 'function') break;
    var n = o.contarPaginas(html);
    if (!n || n <= 1) break;
  }
  return html;
}
/** Páginas do PDF de um HTML (0 se não der para medir). */
function LavCic_paginasDoHtml_(html) {
  try { if (typeof SGO_DocA4_pdfDeHtml_ !== 'function' || typeof SGO_DocA4_paginasDoPdf_ !== 'function') return 0; return SGO_DocA4_paginasDoPdf_(SGO_DocA4_pdfDeHtml_(html, 'Relatório do ciclo'))._total || 0; } catch (e) { return 0; }
}
function LavCic_avisosTela_(g, conclusao, faltam, extras) {
  var av = typeof RelA4_avisosPadrao_ === 'function' ? RelA4_avisosPadrao_({ salvo: g.salvo, pdfUrl: g.pdfUrl, pastaUrl: '', aviso: g.salvo ? '' : g.aviso }, []) : [];
  if (conclusao && conclusao.origem === 'REGRA' && conclusao.motivo) av.push({ tipo: 'alerta', html: LavCicD_esc_('Conclusão escrita pela regra fixa do sistema (' + conclusao.motivo + ').') });
  if (faltam && faltam.length) av.push({ tipo: 'alerta', html: LavCicD_esc_('O cadastro do equipamento está sem: ' + faltam.join(', ') + '. O relatório saiu assim mesmo; depois de completar o cadastro, gere uma nova versão.') });
  (extras || []).forEach(function (t) { av.push({ tipo: 'alerta', html: LavCicD_esc_(t) }); });
  return av;
}
function LavCic_comAvisos_(html, av) {
  var faixas = (av || []).filter(function (a) { return a && a.html; }).map(function (a) { return '<div class="aviso-tela no-print so-tela ' + (a.tipo === 'ok' ? 'ok' : 'alerta') + '">' + a.html + '</div>'; }).join('');
  return String(html || '').replace('<!--LAVCIC_AVISOS-->', faixas);
}

function LavCic_acaoGerar_(eu, sid, d) {
  var eq = LavCic_equip_(eu, d.equipamentoId);
  var lido = LavCic_lerParaEquip_(eq, d);
  var c = lido.ciclo;
  return LavCic_comTrava_(function () {
    var ja = LavCic_existente_(eq.ID, c.lote);
    if (ja) return { duplicado: true, relatorio: LavCic_relParaTela_(eu, ja), message: 'O lote ' + c.lote + ' já foi importado para este equipamento em ' + LavCic_br_(ja.EMITIDO_EM) + ' (relatório ' + LavCic_s_(ja.NUMERO) + '). Por quê: o mesmo ciclo não pode ter dois relatórios. O que fazer: abra o relatório que já existe; se precisar corrigir, use "Gerar nova versão".' };
    var cadInfo = LavCic_cadastro_(eq), ref = LavCic_referenciaDe_(c.receita);
    var numero = LavCic_proximoNumero_(), emitidoEm = LavCic_br_(LavCic_agora_());
    var conclusao = LavCicD_conclusao_(c, ref);
    var html = LavCic_montar_({ contarPaginas: LavCic_paginasDoHtml_, numero: numero, versao: 1, ciclo: c, cadastro: cadInfo.cad, referencia: ref, conclusao: conclusao, emitidoEm: emitidoEm, emitidoPor: eu.nome, importadoPor: eu.nome, nomeArquivo: lido.nome, sha: lido.sha });
    var g = LavCic_gravarDocumento_(cadInfo.cad, LavCic_nomeArquivo_(numero, 1, c.lote), html);
    var arquivoId = '';
    if (g.salvo) {
      try { var f = LavCic_pasta_(cadInfo.cad).createFile(Utilities.newBlob(lido.texto, 'text/plain', SGO_DocSalvar_sanitizarNome_(lido.nome))); LavCic_restrito_(f); arquivoId = f.getId(); } catch (eA) { arquivoId = ''; }
    }
    var linha = LavCic_linhaCiclo_(c);
    Object.assign(linha, { NUMERO: numero, VERSAO: 1, SITUACAO: 'ATIVO', EQUIPAMENTO_ID: LavCic_s_(eq.ID), CLIENTE_ID: LavCic_s_(eq.CLIENTE_ID), UNIDADE_ID: LavCic_s_(eq.UNIDADE_ID), CHAVE_LOTE: LavCic_chaveLote_(eq.ID, c.lote),
      CADASTRO_JSON: JSON.stringify(cadInfo.cad), CADASTRO_FALTANDO: JSON.stringify(cadInfo.faltam), REFERENCIA_JSON: ref ? JSON.stringify(ref) : '',
      CONCLUSAO_TEXTO: conclusao.texto, CONCLUSAO_ORIGEM: conclusao.origem, CONCLUSAO_MOTIVO: conclusao.motivo || '', ARQUIVO_NOME: lido.nome, ARQUIVO_SHA256: lido.sha, ARQUIVO_ID: arquivoId,
      HTML_ID: g.htmlId || '', HTML_URL: g.htmlUrl || '', PDF_ID: g.pdfId || '', PDF_URL: g.pdfUrl || '', PASTA_URL: g.pastaUrl || '', PAGINAS: g.paginas || '', SALVO: g.salvo ? 'SIM' : '',
      HASH_DOCUMENTO: LavCic_sha_(g.html), ASSINADO: '', GERADO_POR_ID: eu.id, GERADO_POR_NOME: eu.nome, GERADO_POR_PERFIL: eu.perfil, EMITIDO_EM: LavCic_agora_(), ATUALIZADO_EM: LavCic_agora_() });
    var rel = SGO_DATA.insert(LAVCIC_ABAS.RELATORIOS, linha);
    LavCic_historico_(rel, 'GERADO', 'Relatório gerado do arquivo ' + lido.nome + ' (SHA-256 ' + lido.sha + '), lote ' + c.lote + ', resultado ' + c.resultado + '. Conclusão: ' + (conclusao.origem === 'IA' ? 'IA conferida' : 'regra fixa' + (conclusao.motivo ? ' (' + conclusao.motivo + ')' : '')) + '.' + (g.paginas > 1 ? ' Atenção: o PDF saiu com ' + g.paginas + ' páginas.' : '') + (lido.avisos.length ? ' Avisos: ' + lido.avisos.join(' ') : ''), eu);
    return { relatorio: LavCic_relParaTela_(eu, rel), avisos: lido.avisos, faltam: cadInfo.faltam,
      html: LavCic_comAvisos_(g.html, LavCic_avisosTela_(g, conclusao, cadInfo.faltam, lido.avisos)),
      message: 'Relatório ' + numero + ' do lote ' + c.lote + (g.salvo ? ' gerado e salvo no histórico do equipamento (HTML e PDF).' : ' gerado, mas a cópia não foi gravada: ' + g.aviso) + (cadInfo.faltam.length ? ' O cadastro do equipamento está sem ' + cadInfo.faltam.join(', ') + '.' : '') };
  });
}
function LavCic_linhaCiclo_(c) {
  return { LOTE: c.lote, RECEITA: c.receita, OPERADOR: c.operador, DATA_CICLO: c.dataIso, HORA_CICLO: c.inicio && !c.inicio.estimado ? c.inicio.hora : (c.fim ? c.fim.hora : c.hora),
    INICIO_TEXTO: c.inicio ? c.inicio.data + ' ' + c.inicio.hora : '', FIM_TEXTO: c.fim ? c.fim.data + ' ' + c.fim.hora : '', RESULTADO: c.resultado, RESULTADO_CLASSE: c.resultadoClasse,
    COD_FALHA: c.codFalha === null ? '' : String(c.codFalha), FALHA: c.falha, TEMP_FINAL: c.tempFinal === null ? '' : c.tempFinal, DURACAO_SEG: c.duracaoSeg,
    DESINF_SEG: c.desinfeccao ? c.desinfeccao.duracaoSeg : '', DESINF_TEMP_MAX: c.desinfeccao && c.desinfeccao.tempMax !== null ? c.desinfeccao.tempMax : '',
    MANUT_VENCIDA: c.manutVencida === null ? '' : (c.manutVencida ? 'SIM' : 'NAO'), FASES_QTD: c.fases.length, EVENTOS_QTD: c.eventos.length, PAUSAS: c.pausas,
    FORMATO_ARQUIVO: c.formato, DADOS_JSON: JSON.stringify(c) };
}

/** Reabre o documento gravado (para assinar ou nova versão): ciclo, cadastro e conclusão do instantâneo da linha. */
function LavCic_dadosDaLinha_(r) {
  var c = LavCic_json_(r.DADOS_JSON, null);
  if (!c || !c.lote) throw new Error('Não foi possível reabrir os dados do relatório ' + LavCic_s_(r.NUMERO) + ': o registro do ciclo está incompleto. O que fazer: importe o arquivo .sgolav de novo pela ficha do equipamento e avise a Metrolabs');
  return { ciclo: c, cad: LavCic_json_(r.CADASTRO_JSON, {}), ref: LavCic_json_(r.REFERENCIA_JSON, null), conclusao: { texto: LavCic_s_(r.CONCLUSAO_TEXTO), origem: LavCic_s_(r.CONCLUSAO_ORIGEM) || 'REGRA', motivo: LavCic_s_(r.CONCLUSAO_MOTIVO) } };
}
function LavCic_versaoAnteriorDe_(r) {
  if (!LavCic_s_(r.VERSAO_ANTERIOR_ID)) return null;
  var a = SGO_DATA.getById(LAVCIC_ABAS.RELATORIOS, LavCic_s_(r.VERSAO_ANTERIOR_ID));
  return { versao: a ? Number(a.VERSAO) || 1 : (Number(r.VERSAO) || 2) - 1, motivo: LavCic_s_(r.MOTIVO_VERSAO) };
}

function LavCic_acaoAssinar_(eu, sid, d) {
  var nome = LavCic_s_(d.nome).replace(/\s+/g, ' '), cargo = LavCic_s_(d.cargo).replace(/\s+/g, ' '), img = LavCic_s_(d.imagem);
  var faltas = [];
  if (nome.length < 3) faltas.push({ campo: 'nome', texto: 'Escreva o nome completo de quem assina.' });
  if (cargo.length < 2) faltas.push({ campo: 'cargo', texto: 'Escreva o cargo de quem assina (por exemplo, Enfermeira responsável pela CME).' });
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(img)) faltas.push({ campo: 'assinatura', texto: 'Faça a assinatura no quadro, com o dedo ou com o mouse.' });
  else if (img.length > LAVCIC_ASSINATURA_MAX) faltas.push({ campo: 'assinatura', texto: 'A imagem da assinatura ficou grande demais. Toque em "Limpar" e assine de novo.' });
  if (!d.conferi) faltas.push({ campo: 'conferi', texto: 'Marque que conferiu os dados do relatório antes de assinar.' });
  if (faltas.length) return { ok: false, faltam: faltas, message: 'Não foi possível assinar: ' + faltas.map(function (f) { return f.texto.replace(/\.$/, '').toLowerCase(); }).join('; ') + '.' };
  return LavCic_comTrava_(function () {
    var r = LavCic_relatorio_(eu, d.id);
    if (LavCic_up_(r.SITUACAO) === 'SUBSTITUIDO') throw new Error('Não foi possível assinar: esta versão foi substituída por uma mais nova. Por quê: só a versão em vigor pode ser assinada. O que fazer: abra a versão mais nova do lote ' + LavCic_s_(r.LOTE) + ' e assine nela');
    if (LavCic_up_(r.ASSINADO) === 'SIM') throw new Error('Não foi possível assinar: o relatório ' + LavCic_s_(r.NUMERO) + ' já foi assinado por ' + LavCic_s_(r.ASSINANTE_NOME) + ' em ' + LavCic_br_(r.ASSINADO_EM) + '. Por quê: depois de assinado, o documento fica travado. O que fazer: se for preciso corrigir, a Metrolabs gera uma nova versão com o motivo, e a nova versão é assinada');
    var x = LavCic_dadosDaLinha_(r);
    var bytes = Utilities.base64Decode(img.replace(/^data:image\/png;base64,/, ''));
    var shaAss = LavCic_shaBytes_(bytes), assId = '';
    try { var fa = LavCic_pasta_(x.cad).createFile(Utilities.newBlob(bytes, 'image/png', 'Assinatura ' + LavCic_s_(r.NUMERO) + ' v' + (Number(r.VERSAO) || 1) + '.png')); LavCic_restrito_(fa); assId = fa.getId(); } catch (eF) { assId = ''; }
    var agora = LavCic_agora_(), br = LavCic_br_(agora);
    var assinatura = { imagem: img, nome: nome, cargo: cargo, data: br.slice(0, 10), hora: agora.slice(11, 16), usuario: eu.nome + (eu.email ? ' (' + eu.email + ')' : '') + ' · perfil ' + (typeof SGO_AJUDA_PERFIS !== 'undefined' && SGO_AJUDA_PERFIS[eu.perfil] ? SGO_AJUDA_PERFIS[eu.perfil] : eu.perfil), hashDocumento: LavCic_s_(r.HASH_DOCUMENTO) };
    var html = LavCic_montar_({ contarPaginas: LavCic_paginasDoHtml_, numero: LavCic_s_(r.NUMERO), versao: Number(r.VERSAO) || 1, ciclo: x.ciclo, cadastro: x.cad, referencia: x.ref, conclusao: x.conclusao, emitidoEm: LavCic_br_(r.EMITIDO_EM), emitidoPor: LavCic_s_(r.GERADO_POR_NOME),
      importadoPor: LavCic_s_(r.GERADO_POR_NOME), nomeArquivo: LavCic_s_(r.ARQUIVO_NOME), sha: LavCic_s_(r.ARQUIVO_SHA256), versaoAnterior: LavCic_versaoAnteriorDe_(r), assinatura: assinatura });
    var g = LavCic_gravarDocumento_(x.cad, LavCic_nomeArquivo_(LavCic_s_(r.NUMERO), Number(r.VERSAO) || 1, LavCic_s_(r.LOTE), 'assinado'), html);
    if (!g.salvo) throw new Error('Não foi possível gravar o documento assinado: ' + String(g.aviso || '').replace(/[.\s]+$/, '') + '. A assinatura não foi registrada; tente de novo em instantes');
    var mud = { ASSINADO: 'SIM', ASSINATURA_ID: assId, ASSINATURA_SHA256: shaAss, ASSINANTE_NOME: nome, ASSINANTE_CARGO: cargo, ASSINADO_EM: agora, ASSINADO_POR_ID: eu.id, ASSINADO_POR_NOME: eu.nome,
      HTML_ID_SEM_ASSINATURA: LavCic_s_(r.HTML_ID), PDF_ID_SEM_ASSINATURA: LavCic_s_(r.PDF_ID), HTML_ID: g.htmlId, HTML_URL: g.htmlUrl, PDF_ID: g.pdfId, PDF_URL: g.pdfUrl, PAGINAS: g.paginas || '', HASH_ASSINADO: LavCic_sha_(g.html), ATUALIZADO_EM: agora };
    SGO_DATA.update(LAVCIC_ABAS.RELATORIOS, r.ID, mud);
    Object.keys(mud).forEach(function (k) { r[k] = mud[k]; });
    LavCic_historico_(r, 'ASSINADO', 'Assinado na tela por ' + nome + ' (' + cargo + '), registrado por ' + eu.nome + ' (' + eu.perfil + '). Documento conferido SHA-256 ' + LavCic_s_(r.HASH_DOCUMENTO) + '; assinatura SHA-256 ' + shaAss + '.', eu);
    return { relatorio: LavCic_relParaTela_(eu, r), html: LavCic_comAvisos_(g.html, LavCic_avisosTela_(g, null, [], [])), message: 'Relatório ' + LavCic_s_(r.NUMERO) + ' assinado por ' + nome + ' e salvo. A partir de agora ele fica travado; uma correção só por nova versão.' };
  });
}

function LavCic_acaoNovaVersao_(eu, sid, d) {
  if (!eu.interno) throw new Error('Não foi possível gerar nova versão: a correção do relatório é feita pela Metrolabs. Por quê: a versão nova substitui a anterior no histórico do equipamento. O que fazer: peça pela conversa com a Metrolabs, dizendo o que precisa corrigir');
  var motivo = LavCic_s_(d.motivo);
  if (motivo.length < 10) return { ok: false, faltam: [{ campo: 'motivo', texto: 'Escreva o motivo da nova versão (pelo menos 10 letras).' }], message: 'Não foi possível gerar nova versão: escreva o motivo (pelo menos 10 letras), por exemplo "série da máquina completada no cadastro". Por quê: o motivo sai na nova versão e fica no histórico.' };
  return LavCic_comTrava_(function () {
    var r = LavCic_relatorio_(eu, d.id);
    if (LavCic_up_(r.SITUACAO) === 'SUBSTITUIDO') throw new Error('Não foi possível gerar nova versão: esta versão já foi substituída. O que fazer: abra a versão mais nova do lote ' + LavCic_s_(r.LOTE) + ' e gere a nova versão a partir dela');
    var x = LavCic_dadosDaLinha_(r);
    var eq = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, LavCic_s_(r.EQUIPAMENTO_ID));
    var cadInfo = eq ? LavCic_cadastro_(eq) : { cad: x.cad, faltam: LavCic_json_(r.CADASTRO_FALTANDO, []) };
    var ref = LavCic_referenciaDe_(x.ciclo.receita), conclusao = LavCicD_conclusao_(x.ciclo, ref);
    var versao = (Number(r.VERSAO) || 1) + 1, emitidoEm = LavCic_br_(LavCic_agora_());
    var html = LavCic_montar_({ contarPaginas: LavCic_paginasDoHtml_, numero: LavCic_s_(r.NUMERO), versao: versao, ciclo: x.ciclo, cadastro: cadInfo.cad, referencia: ref, conclusao: conclusao, emitidoEm: emitidoEm, emitidoPor: eu.nome,
      importadoPor: LavCic_s_(r.GERADO_POR_NOME), nomeArquivo: LavCic_s_(r.ARQUIVO_NOME), sha: LavCic_s_(r.ARQUIVO_SHA256), versaoAnterior: { versao: Number(r.VERSAO) || 1, motivo: motivo } });
    var g = LavCic_gravarDocumento_(cadInfo.cad, LavCic_nomeArquivo_(LavCic_s_(r.NUMERO), versao, LavCic_s_(r.LOTE)), html);
    var linha = LavCic_linhaCiclo_(x.ciclo);
    Object.assign(linha, { NUMERO: LavCic_s_(r.NUMERO), VERSAO: versao, SITUACAO: 'ATIVO', EQUIPAMENTO_ID: LavCic_s_(r.EQUIPAMENTO_ID), CLIENTE_ID: LavCic_s_(r.CLIENTE_ID), UNIDADE_ID: eq ? LavCic_s_(eq.UNIDADE_ID) : LavCic_s_(r.UNIDADE_ID),
      CHAVE_LOTE: LavCic_s_(r.CHAVE_LOTE), CADASTRO_JSON: JSON.stringify(cadInfo.cad), CADASTRO_FALTANDO: JSON.stringify(cadInfo.faltam), REFERENCIA_JSON: ref ? JSON.stringify(ref) : '',
      CONCLUSAO_TEXTO: conclusao.texto, CONCLUSAO_ORIGEM: conclusao.origem, CONCLUSAO_MOTIVO: conclusao.motivo || '', ARQUIVO_NOME: LavCic_s_(r.ARQUIVO_NOME), ARQUIVO_SHA256: LavCic_s_(r.ARQUIVO_SHA256), ARQUIVO_ID: LavCic_s_(r.ARQUIVO_ID),
      HTML_ID: g.htmlId || '', HTML_URL: g.htmlUrl || '', PDF_ID: g.pdfId || '', PDF_URL: g.pdfUrl || '', PASTA_URL: g.pastaUrl || '', PAGINAS: g.paginas || '', SALVO: g.salvo ? 'SIM' : '',
      HASH_DOCUMENTO: LavCic_sha_(g.html), ASSINADO: '', VERSAO_ANTERIOR_ID: LavCic_s_(r.ID), MOTIVO_VERSAO: motivo.slice(0, 500), GERADO_POR_ID: eu.id, GERADO_POR_NOME: eu.nome, GERADO_POR_PERFIL: eu.perfil, EMITIDO_EM: LavCic_agora_(), ATUALIZADO_EM: LavCic_agora_() });
    var novo = SGO_DATA.insert(LAVCIC_ABAS.RELATORIOS, linha);
    SGO_DATA.update(LAVCIC_ABAS.RELATORIOS, r.ID, { SITUACAO: 'SUBSTITUIDO', SUBSTITUIDO_POR_ID: LavCic_s_(novo.ID), ATUALIZADO_EM: LavCic_agora_() });
    LavCic_historico_(r, 'SUBSTITUIDO', 'Versão ' + (Number(r.VERSAO) || 1) + ' substituída pela versão ' + versao + '. Motivo: ' + motivo, eu);
    LavCic_historico_(novo, 'NOVA_VERSAO', 'Versão ' + versao + ' gerada. Motivo: ' + motivo + '. Conclusão: ' + (conclusao.origem === 'IA' ? 'IA conferida' : 'regra fixa') + '.', eu);
    return { relatorio: LavCic_relParaTela_(eu, novo), html: LavCic_comAvisos_(g.html, LavCic_avisosTela_(g, conclusao, cadInfo.faltam, [])),
      message: 'Versão ' + versao + ' do relatório ' + LavCic_s_(r.NUMERO) + ' gerada. A versão ' + (Number(r.VERSAO) || 1) + ' continua guardada no histórico, marcada como substituída.' + (g.salvo ? '' : ' A cópia não foi gravada: ' + g.aviso) };
  });
}

function LavCic_acaoListar_(eu, sid, d) {
  d = d || {};
  var busca = LavCic_up_(d.busca), de = LavCic_s_(d.de), ate = LavCic_s_(d.ate), res = LavCic_up_(d.resultado), eqId = LavCic_s_(d.equipamentoId), ass = LavCic_up_(d.assinatura);
  var eqs = LavCic_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
  var l = LavCic_relatoriosVisiveis_(eu).filter(function (r) {
    if (!d.substituidos && LavCic_up_(r.SITUACAO) === 'SUBSTITUIDO') return false;
    if (eqId && LavCic_s_(r.EQUIPAMENTO_ID) !== eqId) return false;
    if (de && LavCic_s_(r.DATA_CICLO) < de) return false;
    if (ate && LavCic_s_(r.DATA_CICLO) > ate) return false;
    if (res && LavCic_up_(r.RESULTADO_CLASSE) !== res) return false;
    if (ass === 'SIM' && LavCic_up_(r.ASSINADO) !== 'SIM') return false;
    if (ass === 'NAO' && LavCic_up_(r.ASSINADO) === 'SIM') return false;
    if (busca) { var e = eqs[LavCic_s_(r.EQUIPAMENTO_ID)] || {}; if ([r.LOTE, r.NUMERO, r.RECEITA, e.TAG, e.SERIE, e.TIPO, e.PATRIMONIO].map(LavCic_up_).join(' ').indexOf(busca) < 0) return false; }
    return true;
  });
  l.sort(function (a, b) { return (LavCic_s_(b.DATA_CICLO) + LavCic_s_(b.HORA_CICLO) + LavCic_s_(b.VERSAO)).localeCompare(LavCic_s_(a.DATA_CICLO) + LavCic_s_(a.HORA_CICLO) + LavCic_s_(a.VERSAO)); });
  var total = l.length;
  return { total: total, relatorios: l.slice(0, 300).map(function (r) { var t = LavCic_relParaTela_(eu, r), e = eqs[t.equipamentoId]; t.equipamento = e ? LavCic_rotuloEquip_(e) : 'Equipamento fora do cadastro'; return t; }),
    resumo: { aprovados: l.filter(function (r) { return LavCic_up_(r.RESULTADO_CLASSE) === 'APROVADO'; }).length, naoAprovados: l.filter(function (r) { return LavCic_up_(r.RESULTADO_CLASSE) !== 'APROVADO'; }).length,
      semAssinatura: l.filter(function (r) { return LavCic_up_(r.ASSINADO) !== 'SIM'; }).length } };
}
function LavCic_acaoAbrir_(eu, sid, d) {
  var r = LavCic_relatorio_(eu, d.id);
  var t = LavCic_relParaTela_(eu, r);
  var eq = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, t.equipamentoId);
  t.equipamento = eq ? LavCic_rotuloEquip_(eq) : '';
  t.versoes = LavCic_ler_(LAVCIC_ABAS.RELATORIOS).filter(function (x) { return LavCic_s_(x.CHAVE_LOTE) === LavCic_s_(r.CHAVE_LOTE) && LavCic_relVisivel_(eu, x); })
    .sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); }).map(function (x) { return LavCic_relParaTela_(eu, x); });
  t.historico = LavCic_ler_(LAVCIC_ABAS.HISTORICO).filter(function (h) { return t.versoes.some(function (v) { return v.id === LavCic_s_(h.RELATORIO_ID); }); })
    .sort(function (a, b) { return LavCic_s_(b.DATA).localeCompare(LavCic_s_(a.DATA)); }).slice(0, 40)
    .map(function (h) { return { tipo: LavCic_s_(h.TIPO), texto: eu.interno ? LavCic_s_(h.TEXTO) : LavCic_s_(h.TEXTO).replace(/\s*Conclusão:[^.]*\.?/, '').replace(/\s*Avisos:.*$/, ''), por: LavCic_s_(h.USUARIO_NOME), em: LavCic_br_(h.DATA) }; });
  return { relatorio: t };
}
function LavCic_acaoEquipamento_(eu, sid, d) {
  var eq = LavCic_equip_(eu, d.id);
  var rels = LavCic_relatoriosVisiveis_(eu);
  var t = LavCic_equipParaTela_(eu, eq, rels);
  t.tipoAceito = LAVCIC_TIPOS_ACEITOS.test(LavCic_s_(eq.TIPO));
  t.lista = LavCic_acaoListar_(eu, sid, { equipamentoId: t.id }).relatorios;
  return { equipamento: t };
}
function LavCic_acaoConferir_(eu, sid, d) {
  var eq = LavCic_equip_(eu, d.equipamentoId);
  var lido = LavCic_lerParaEquip_(eq, d);
  var ja = LavCic_existente_(eq.ID, lido.ciclo.lote);
  var c = LavCic_cadastro_(eq);
  return { conferencia: LavCic_resumoConferencia_(lido.ciclo), avisos: lido.avisos, faltam: c.faltam, podeCompletar: eu.cadastro, equipamento: LavCic_rotuloEquip_(eq), arquivo: lido.nome,
    duplicado: ja ? LavCic_relParaTela_(eu, ja) : null,
    message: ja ? 'O lote ' + lido.ciclo.lote + ' já foi importado para este equipamento (relatório ' + LavCic_s_(ja.NUMERO) + '). Abra o relatório que já existe.' : '' };
}
function LavCic_acaoIniciar_(eu) {
  var rels = LavCic_relatoriosVisiveis_(eu);
  var eqs = LavCic_equipamentosVisiveis_(eu, rels).map(function (e) { return LavCic_equipParaTela_(eu, e, rels); });
  eqs.sort(function (a, b) { return (a.cliente + a.rotulo).localeCompare(b.cliente + b.rotulo, 'pt-BR'); });
  var cliNome = '';
  if (eu.cliente) { var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, eu.clienteId) || {}; cliNome = LavCic_s_(cli.NOME_FANTASIA) || LavCic_s_(cli.RAZAO_SOCIAL); }
  return { eu: { nome: eu.nome, perfil: eu.perfil, cliente: eu.cliente, interno: eu.interno, gestao: eu.gestao, referencias: eu.referencias, cadastro: eu.cadastro, clienteNome: cliNome },
    equipamentos: eqs, totalRelatorios: rels.filter(function (r) { return LavCic_up_(r.SITUACAO) !== 'SUBSTITUIDO'; }).length };
}

var LAVCIC_ACOES = {
  iniciar: function (eu, sid, d) { return LavCic_acaoIniciar_(eu, d); },
  equipamento: LavCic_acaoEquipamento_, conferir: LavCic_acaoConferir_, gerar: LavCic_acaoGerar_, listar: LavCic_acaoListar_, abrir: LavCic_acaoAbrir_,
  assinar: LavCic_acaoAssinar_, novaVersao: LavCic_acaoNovaVersao_, referencias: LavCic_acaoReferencias_
};

/** Ponto único do navegador. */
function LavCiclo_api(sessionId, acao, dados) {
  try {
    var fn = LAVCIC_ACOES[LavCic_s_(acao)];
    if (!fn) return { ok: false, message: 'Ação do relatório do ciclo desconhecida (' + LavCic_s_(acao) + '). Atualize a página (F5) e tente de novo.' };
    var eu = LavCic_eu_(sessionId);
    LavCic_exigirAcesso_(eu);
    try { LavCic_garantirAbas_(); } catch (e) {}
    var r = fn(eu, sessionId, dados || {});
    if (r && r.ok === false) return JSON.parse(JSON.stringify(r));
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    if (/Sessão inválida|sessão expirada/i.test(m)) return { ok: false, sessao: true, message: 'A sua sessão terminou. Entre no sistema de novo e repita a operação; nada foi gravado.' };
    return { ok: false, message: (/^Não foi possível|^Acesso negado|^Este arquivo|^O conteúdo|^O arquivo/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  }
}

/**
 * Rota /arquivos do servidor (perfil CLIENTE), chamada por Representacao_arquivoClientePermitido_. Devolve null quando o
 * arquivo não é deste módulo (segue a regra de sempre); true/false quando é. O cliente abre só o HTML e o PDF dos
 * relatórios dos equipamentos dele; o arquivo .sgolav original e a imagem da assinatura não abrem por link para ninguém
 * (gravados como RESTRITO).
 */
function LavCic_arquivoClientePermitido_(sessionId, arquivoId) {
  try {
    var id = LavCic_s_(arquivoId);
    if (!id) return null;
    var docs = ['HTML_ID', 'PDF_ID', 'HTML_ID_SEM_ASSINATURA', 'PDF_ID_SEM_ASSINATURA'], todos = docs.concat(['ARQUIVO_ID', 'ASSINATURA_ID']);
    var regs = LavCic_ler_(LAVCIC_ABAS.RELATORIOS).filter(function (r) { return todos.some(function (k) { return LavCic_s_(r[k]) === id; }); });
    if (!regs.length) return null;
    var eu = LavCic_eu_(sessionId);
    if (!eu.cliente || !eu.clienteId) return false;
    return regs.some(function (r) { return LavCic_s_(r.CLIENTE_ID) === eu.clienteId && docs.some(function (k) { return LavCic_s_(r[k]) === id; }); });
  } catch (e) { return false; }
}
