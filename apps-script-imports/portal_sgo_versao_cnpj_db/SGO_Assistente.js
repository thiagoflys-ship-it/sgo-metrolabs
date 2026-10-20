/**
 * SGO_Assistente.js — assistente "Tire sua dúvida" do SGO+ (20/10/2026).
 *
 * Um especialista no sistema a quem o colaborador pergunta "como faço…?" e recebe o passo a passo do perfil dele,
 * com o caminho no menu, o botão "Abrir esta tela" e a fonte. Só orienta: não grava nada além do registro da pergunta.
 *
 * De onde vêm as respostas (base gerada na hora, sem dado de cliente nem de pessoa):
 *   - ajuda "Como usar esta tela" de todas as telas (SGO_Ajuda.js › SGO_Ajuda_todas_, os arquivos SGO_Ajuda_*.js);
 *   - manuais docs/MANUAL_*.md, transformados em SGO_AssistenteManuais.js por _tools/gerar_base_assistente.cjs
 *     (a importação do servidor gera de novo a cada publicação);
 *   - catálogo do menu lido do próprio Index.html (grupo e nome de cada tela) e as regras de acesso do menu.
 * A busca e as regras ficam no núcleo comum (SGO_AssistenteNucleo.js, idêntico ao AssistenteNucleo.js do COMMAND).
 *
 * Perfil: o assistente só ensina o passo a passo do que o perfil de quem pergunta pode fazer. Telas e tarefas de
 * outro perfil chegam ao modelo só com o título e quem faz (para explicar como pedir). Recursos de administração não
 * aparecem para quem não é Administrador. O perfil Cliente não usa o assistente (ele é da equipe interna).
 *
 * Chamada única do navegador: SGO_Assist_api(sessionId, acao, dados)
 *   iniciar · perguntar { pergunta, tela } · avaliar { id, resolveu } · painel { dias } · sugerir { grupo } · base
 * Registro: ASSIST_PERGUNTAS (texto da pergunta com e-mail, telefone, documento e placa mascarados; tela; perfil;
 * tipo da resposta; "Isso resolveu?"). Quem perguntou não é gravado: só uma referência cifrada para conferir que o
 * "Isso resolveu?" é de quem perguntou. Limite de perguntas por pessoa por hora (ASSISTENTE_LIMITE_HORA, padrão 20).
 */

var SGO_ASSIST_ABA = 'ASSIST_PERGUNTAS';
var SGO_ASSIST_COLUNAS = ['ID', 'CRIADO_EM', 'PERFIL', 'TELA', 'PERGUNTA', 'GRUPO', 'TIPO', 'ORIGEM', 'FONTES', 'RESOLVEU', 'AVALIADO_EM', 'REF'];
var SGO_ASSIST_LIMITE_PADRAO = 20;
var SGO_ASSIST_GESTAO = ['ADMIN', 'GESTOR', 'DIRETORIA'];
var SGO_ASSIST_PAINEL = ['ADMIN', 'DIRETORIA'];
var SGO_ASSIST_PERFIS = ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH'];

/**
 * Telas do menu com acesso restrito (as demais: todo perfil interno). Mesmas regras de JS_Core.html ›
 * aplicarRegrasDeAcesso_ (Usuários, Auvo, Qualidade), JS_Gestao.html (Caixa de decisões e Desempenho da gestão),
 * JS_Chaves.html (Chaves e senhas: só a conta do responsável) e deste painel.
 */
var SGO_ASSIST_ACESSO = {
  usuarios: ['ADMIN', 'GESTOR', 'DIRETORIA', 'RH'],
  auvo: ['ADMIN', 'GESTOR', 'DIRETORIA'],
  qualidade: ['ADMIN', 'GESTOR', 'DIRETORIA'],
  gestao_decisoes: ['ADMIN', 'GESTOR', 'DIRETORIA'],
  gestao_desempenho: ['ADMIN', 'GESTOR', 'DIRETORIA'],
  chaves: ['ADMIN'],
  assistente: ['ADMIN', 'DIRETORIA']
};
/** Cópia de SGO_TELAS_RH (JS_Core.html), usada só se a leitura do arquivo falhar. */
var SGO_ASSIST_TELAS_RH = ['dashboard', 'mobile_home', 'minhas_atividades', 'atividades_equipe', 'avisos', 'email', 'frota', 'conduta', 'usuarios'];
/** Telas e janelas que não ficam no menu, com o lugar onde se chega a elas. */
var SGO_ASSIST_FORA_DO_MENU = {
  mobile_home: { nome: 'Início do celular', caminho: 'Celular: tela inicial (Início)', abrir: true },
  busca: { nome: 'Busca rápida', caminho: 'Campo de busca no topo da tela', abrir: false },
  enviar_documento: { nome: 'Enviar documento', caminho: 'Botão "Enviar" ao lado de qualquer documento salvo', abrir: false },
  bate_papo: { nome: 'Bate-papo', caminho: 'Balão de conversas, no canto da tela', abrir: false },
  assistente_duvidas: { nome: 'Tire sua dúvida', caminho: 'Botão "Tire sua dúvida", no canto da tela', abrir: false }
};

/** Caminhos certos das recusas no SGO+ (o núcleo tem o texto geral). */
var SGO_ASSIST_CAMINHOS = {
  apagar_registro: 'Ocorrências, multas, faltas e a trilha de auditoria não são apagadas por quem usa o sistema: esses registros dão transparência a todos e protegem você também. Se não concorda com uma ocorrência em seu nome, conteste dentro do prazo em Menu > Gestão > Programa de conduta (botão "Contestar"). Se algo foi lançado por engano, peça a correção à gestão, que faz o ajuste com o motivo registrado.',
  evitar_conduta: 'Os pontos do Programa de conduta seguem as regras publicadas e não há como evitá-los, apagá-los ou zerá-los. Se você não concorda com uma ocorrência, conteste dentro do prazo em Menu > Gestão > Programa de conduta (botão "Contestar") e explique o que aconteceu; quem decide é a gestão, com fundamentação. Para melhorar o farol, o caminho é cumprir os prazos e as regras do programa.',
  esconder_km: 'O KM é registrado como está no painel do veículo, na retirada e na devolução (Menu > Operação de campo > Frota). Não há como esconder, reduzir ou aumentar o número. Se você digitou errado ou o painel mostrou outro valor, avise a gestão: ela confere em "KM a conferir" e ajusta o KM com o motivo registrado.',
  carro_reservado: 'Um veículo reservado para outra pessoa não pode ser retirado nem ter a reserva cancelada por você. Veja a agenda em Menu > Operação de campo > Frota > Reservas e reserve outro veículo disponível; se for urgente, fale com quem reservou ou peça à gestão, que pode remanejar as reservas.',
  alterar_data_hora: 'A data e a hora de retiradas, devoluções e demais registros não são mudadas por quem registrou: elas valem como comprovante e qualquer ajuste fica na trilha. Se algo foi registrado errado, peça a correção à gestão pelo bate-papo, explicando o que aconteceu; a gestão faz o ajuste com o motivo registrado. Atividade atrasada se resolve com a justificativa, na janela que o SGO+ abre sozinho.',
  burlar_ponto: 'O ponto é pessoal e registra onde e quando cada pessoa trabalhou. Não há como registrar por outra pessoa, em outro local ou em outro horário. Se esqueceu de registrar ou registrou errado, faça o pedido de ajuste no COMMAND (Assistente do ponto) com a justificativa; quem aprova é a gestão ou o RH.'
};

var SGO_ASSIST_MEMO_ = null;

function SGO_Assist_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/* ------------------------------------------------------------
 * Quem pergunta
 * ------------------------------------------------------------ */
function SGO_Assist_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = SGO_UTILS.safeUpper(s.perfil);
  if (perfil === 'CLIENTE') throw new Error('O assistente "Tire sua dúvida" é da equipe interna da Metrolabs. Para falar com a Metrolabs, use os contatos do seu portal.');
  if (SGO_ASSIST_PERFIS.indexOf(perfil) < 0) perfil = perfil || 'TECNICO';
  var rot = (typeof SGO_AJUDA_PERFIS !== 'undefined' && SGO_AJUDA_PERFIS[perfil]) || perfil;
  return { id: SGO_Assist_s_(s.userId || s.usuario), nome: SGO_Assist_s_(s.nome), perfil: perfil, rotulo: rot,
    admin: perfil === 'ADMIN', gestao: SGO_ASSIST_GESTAO.indexOf(perfil) >= 0, painel: SGO_ASSIST_PAINEL.indexOf(perfil) >= 0 };
}

/* ------------------------------------------------------------
 * Catálogo do menu (lido do Index.html) e acesso por perfil
 * ------------------------------------------------------------ */
function SGO_Assist_lerArquivo_(nome) {
  try { return HtmlService.createHtmlOutputFromFile(nome).getContent(); } catch (e) { return ''; }
}

function SGO_Assist_textoHtml_(h) {
  return String(h || '').replace(/<span class="menu-badge"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<span class="menu-btn-icon"[^>]*>[\s\S]*?<\/span><\/span>|<span class="menu-btn-icon"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

/** { chave: { nome, grupo, caminho } } na ordem do menu. */
function SGO_Assist_catalogo_() {
  var html = SGO_Assist_lerArquivo_('Index');
  var cat = {}, ordem = [];
  var partes = html.split('class="sidebar-section menu-grupo"');
  for (var i = 1; i < partes.length; i++) {
    var p = partes[i];
    var mg = /<span class="menu-grupo-nome">([^<]+)<\/span>/.exec(p);
    var grupo = mg ? SGO_Assist_textoHtml_(mg[1]) : '';
    var re = /<button[^>]*class="menu-btn"[^>]*data-mod="([a-z0-9_]+)"[^>]*>([\s\S]*?)<\/button>/g, m;
    while ((m = re.exec(p))) {
      var nome = SGO_Assist_textoHtml_(m[2]);
      if (!nome || cat[m[1]]) continue;
      cat[m[1]] = { nome: nome, grupo: grupo, caminho: 'Menu > ' + (grupo ? grupo + ' > ' : '') + nome };
      ordem.push(m[1]);
    }
  }
  if (!ordem.length && typeof SGO_AJUDA_NOMES !== 'undefined') {
    Object.keys(SGO_AJUDA_NOMES).forEach(function (k) { cat[k] = { nome: SGO_AJUDA_NOMES[k], grupo: '', caminho: 'Menu > ' + SGO_AJUDA_NOMES[k] }; ordem.push(k); });
  }
  if (!cat.assistente) { cat.assistente = { nome: 'Perguntas ao assistente', grupo: 'Administração', caminho: 'Menu > Administração > Perguntas ao assistente' }; ordem.push('assistente'); }
  return { telas: cat, ordem: ordem };
}

/** Telas do perfil RH, lidas de JS_Core.html (SGO_TELAS_RH); sem o arquivo, a cópia acima. */
function SGO_Assist_telasRH_() {
  var js = SGO_Assist_lerArquivo_('JS_Core');
  var m = /var SGO_TELAS_RH\s*=\s*\[([^\]]*)\]/.exec(js);
  if (!m) return SGO_ASSIST_TELAS_RH.slice();
  var l = m[1].split(',').map(function (x) { return x.replace(/["'\s]/g, ''); }).filter(Boolean);
  return l.length ? l : SGO_ASSIST_TELAS_RH.slice();
}

/** O perfil abre a tela pelo menu? */
function SGO_Assist_acessaTela_(base, modulo, perfil) {
  if (perfil === 'RH' && base.telasRH.indexOf(modulo) < 0 && !SGO_ASSIST_FORA_DO_MENU[modulo]) return false;
  var l = SGO_ASSIST_ACESSO[modulo];
  return !l || l.indexOf(perfil) >= 0;
}

/** Tarefa ou seção que, pelo título, é de outro perfil (a ajuda escreve assim: "(só Administrador)", "Gestão: ..."). */
function SGO_Assist_perfisDoTitulo_(titulo) {
  var t = String(titulo || '');
  if (/\(\s*s[óo] (o )?administrador\s*\)|s[óo] (o )?administrador\b|\bdo administrador\b|\badministra[çc][ãa]o\b/i.test(t)) return ['ADMIN'];
  if (/^\s*gest[ãa]o\b|\(\s*gest[ãa]o\s*\)|op[çc][õo]es da gest[ãa]o|s[óo] (a )?gest[ãa]o|\bpara a gest[ãa]o\b|\bgestor(es)?\b|\bdiretoria\b|\bfiscal\b/i.test(t)) return SGO_ASSIST_GESTAO.slice();
  return null;
}

/* ------------------------------------------------------------
 * Base de conhecimento (montada na hora, guardada por 10 minutos)
 * ------------------------------------------------------------ */
function SGO_Assist_base_() {
  var agora = Date.now();
  if (SGO_ASSIST_MEMO_ && agora - SGO_ASSIST_MEMO_.em < 600000) return SGO_ASSIST_MEMO_.base;
  var cat = SGO_Assist_catalogo_();
  var ajuda = typeof SGO_Ajuda_todas_ === 'function' ? SGO_Ajuda_todas_() : { telas: {}, ordem: [] };
  var trechos = [], telasComAjuda = 0;
  var caminhoDe = function (chave, tituloSub) {
    var mod = String(chave).split('/')[0];
    var c = cat.telas[mod], f = SGO_ASSIST_FORA_DO_MENU[mod];
    var base = c ? c.caminho : (f ? f.caminho : '');
    if (chave.indexOf('/') > 0 && tituloSub) base = base ? base + ' > ' + tituloSub : tituloSub;
    return base;
  };
  var nomeDe = function (mod) { return (cat.telas[mod] && cat.telas[mod].nome) || (SGO_ASSIST_FORA_DO_MENU[mod] && SGO_ASSIST_FORA_DO_MENU[mod].nome) || (typeof SGO_AJUDA_NOMES !== 'undefined' && SGO_AJUDA_NOMES[mod]) || mod; };
  var abrivel = function (mod) { return !!cat.telas[mod] || !!(SGO_ASSIST_FORA_DO_MENU[mod] && SGO_ASSIST_FORA_DO_MENU[mod].abrir); };
  var quemDe = {};
  ajuda.ordem.forEach(function (k) {
    var e = ajuda.telas[k];
    if (!e) return;
    telasComAjuda++;
    var n = SGO_Ajuda_normalizar_(k, e, '');
    var mod = k.split('/')[0];
    var quem = (Array.isArray(e.quemPode) ? e.quemPode : []).map(function (q) {
      q = q || {};
      return { perfis: SGO_Ajuda_perfisDe_(q.perfil), rotulo: SGO_Ajuda_rotuloPerfis_(q.perfil), pode: SGO_Ajuda_txt_(q.pode) };
    }).filter(function (q) { return q.perfis.length || q.pode; });
    quemDe[k] = quem;
    var comum = { tela: k, modulo: mod, nomeTela: n.titulo, caminho: caminhoDe(k, n.titulo), fonte: 'Ajuda da tela ' + n.titulo, telaAbrir: abrivel(mod) ? mod : '', quemTela: k };
    var add = function (id, tipo, titulo, texto, extra) {
      if (!SGO_Assist_s_(texto) && !SGO_Assist_s_(titulo)) return;
      trechos.push(Object.assign({ id: id, tipo: tipo, titulo: titulo, texto: texto }, comum, extra || {}));
    };
    add(k + '#visao', 'visao', n.titulo, [n.paraQueServe, n.antesDeComecar.length ? 'Antes de começar: ' + n.antesDeComecar.join(' ') : '', comum.caminho ? 'Onde fica: ' + comum.caminho + '.' : ''].filter(Boolean).join('\n'));
    // títulos sem o nome da tela (ele já está na fonte e no caminho; a busca dá peso ao nome da tela quando a pergunta cita)
    n.passos.forEach(function (p, i) { add(k + '#p' + i, 'passo', p.titulo || n.titulo, p.itens.join('\n'), { itens: p.itens, perfisTarefa: SGO_Assist_perfisDoTitulo_(p.titulo) }); });
    if (n.cores.length) add(k + '#cores', 'cores', 'O que significa cada cor e cada selo', n.cores.map(function (c) { return c.nome + ': ' + c.significado; }).join('\n'));
    n.problemas.forEach(function (c, i) { add(k + '#e' + i, 'problema', 'Se algo der errado: ' + c.situacao, c.oQueFazer); });
    n.perguntas.forEach(function (c, i) { add(k + '#q' + i, 'pergunta', c.p, c.r); });
    // quem pode: as linhas que citam recurso de administração ficam num trecho só do Administrador
    var quemComum = quem.filter(function (q) { return !ASN_TERMOS_ADMIN.test(q.pode); }), quemAdm = quem.filter(function (q) { return ASN_TERMOS_ADMIN.test(q.pode); });
    if (quemComum.length) add(k + '#quem', 'quem', 'Quem pode fazer', quemComum.map(function (q) { return q.rotulo + ': ' + q.pode; }).join('\n'));
    if (quemAdm.length) add(k + '#quemadm', 'quem', 'Recursos do Administrador', quemAdm.map(function (q) { return q.rotulo + ': ' + q.pode; }).join('\n'), { soAdmin: true });
    n.secoesManual.forEach(function (s, i) { add(k + '#m' + i, 'manual', s.titulo, s.paragrafos.join('\n'), { perfisTarefa: SGO_Assist_perfisDoTitulo_(s.titulo) }); });
  });
  var manuais = (typeof SGO_ASSIST_MANUAIS !== 'undefined' && SGO_ASSIST_MANUAIS && SGO_ASSIST_MANUAIS.manuais) || [];
  manuais.forEach(function (m) {
    var mod = m.tela;
    (m.secoes || []).forEach(function (s, i) {
      trechos.push({ id: 'man:' + m.arquivo.replace(/\.md$/, '') + '#' + i, tipo: 'manual', titulo: s.titulo, texto: s.texto, tela: mod, modulo: mod, nomeTela: nomeDe(mod),
        caminho: caminhoDe(mod, ''), fonte: 'Manual: ' + m.titulo, telaAbrir: abrivel(mod) ? mod : '', quemTela: mod, perfisManual: m.perfis || null,
        perfisTarefa: SGO_Assist_perfisDoTitulo_(s.titulo), soAdmin: ASN_TERMOS_ADMIN.test(s.titulo + ' ' + s.texto) });
    });
  });
  cat.ordem.forEach(function (mod) {
    var c = cat.telas[mod], aj = ajuda.telas[mod];
    var serve = aj ? SGO_Ajuda_txt_(aj.paraQueServe).split(/(?<=\.)\s/)[0] : '';
    trechos.push({ id: 'menu:' + mod, tipo: 'menu', titulo: 'Onde fica a tela ' + c.nome, texto: 'A tela "' + c.nome + '" fica em ' + c.caminho + '.' + (serve ? ' ' + serve : ''),
      tela: mod, modulo: mod, nomeTela: c.nome, caminho: c.caminho, fonte: 'Catálogo do menu do SGO+', telaAbrir: mod, quemTela: mod });
  });
  var base = { trechos: trechos, indice: ASN_indexar_(trechos), catalogo: cat, quem: quemDe, telasRH: SGO_Assist_telasRH_(), ajuda: ajuda, telasComAjuda: telasComAjuda,
    manuais: manuais.length, versaoManuais: (typeof SGO_ASSIST_MANUAIS !== 'undefined' && SGO_ASSIST_MANUAIS && SGO_ASSIST_MANUAIS.versao) || '', montadaEm: new Date().toISOString() };
  SGO_ASSIST_MEMO_ = { em: agora, base: base };
  return base;
}

/** O que a ajuda diz sobre o perfil numa tela: 'TOTAL' (pode usar), 'RESTRITO' (é de outro perfil). */
function SGO_Assist_nivelQuem_(quem, perfil) {
  if (!quem || !quem.length) return 'TOTAL';
  var naoUsa = /n[ãa]o (usa|usam|v[êe]|veem|abre|abrem|acessa|acessam) (esta|essa) tela|o item .* n[ãa]o aparece/i;
  var meu = quem.filter(function (q) { return q.perfis.indexOf(perfil) >= 0; });
  if (meu.length) return meu.some(function (q) { return !naoUsa.test(q.pode); }) ? 'TOTAL' : 'RESTRITO';
  var todos = quem.filter(function (q) { return q.perfis.indexOf('TODOS') >= 0; });
  if (todos.length) return todos.some(function (q) { return !naoUsa.test(q.pode) && !/s[óo] a conta do respons[áa]vel/i.test(q.pode); }) ? 'TOTAL' : 'RESTRITO';
  return 'RESTRITO';
}

/** Situação de um trecho para o perfil: null (não entra), { restrito: bool }. */
function SGO_Assist_situacao_(base, t, eu) {
  if (t.soAdmin && !eu.admin) return null;
  if (!eu.admin && ASN_TERMOS_ADMIN.test(t.titulo + ' ' + t.texto)) return null;
  var mod = t.modulo;
  var acessa = SGO_Assist_acessaTela_(base, mod, eu.perfil);
  var restrito = !acessa;
  if (!restrito && SGO_Assist_nivelQuem_(base.quem[t.quemTela], eu.perfil) === 'RESTRITO') restrito = true;
  if (!restrito && t.perfisManual && t.perfisManual.indexOf(eu.perfil) < 0) restrito = true;
  if (!restrito && t.perfisTarefa && t.perfisTarefa.indexOf(eu.perfil) < 0) restrito = true;
  // tela fora do perfil: só o que diz onde fica e quem faz (nada de passo a passo)
  if (!acessa && ['menu', 'quem', 'visao'].indexOf(t.tipo) < 0) return null;
  return { restrito: restrito, acessa: acessa };
}

/** Quem pode, numa linha (para o modelo explicar quem faz). Sem recursos de administração para quem não é Administrador. */
function SGO_Assist_quemTexto_(base, t, eu) {
  var rot = function (l) { return l.map(function (p) { return SGO_AJUDA_PERFIS[p] || p; }).join(', '); };
  var linhas = [];
  if (t.perfisTarefa) linhas.push('Esta parte é feita por: ' + rot(t.perfisTarefa) + '.');
  else if (t.perfisManual) linhas.push('Este manual é de: ' + rot(t.perfisManual) + '.');
  var q = base.quem[t.quemTela] || base.quem[t.modulo] || [];
  q.filter(function (x) { return eu.admin || !ASN_TERMOS_ADMIN.test(x.pode); }).forEach(function (x) { linhas.push(x.rotulo + ': ' + x.pode); });
  if (!q.length && SGO_ASSIST_ACESSO[t.modulo]) linhas.push('Usam esta tela: ' + rot(SGO_ASSIST_ACESSO[t.modulo]) + '.');
  return linhas.join(' | ').slice(0, 700);
}

/** Trecho como vai ao modelo e à tela: restrito leva só o título e quem faz. */
function SGO_Assist_paraPerfil_(base, t, eu) {
  var sit = SGO_Assist_situacao_(base, t, eu);
  if (!sit) return null;
  var c = Object.assign({}, t);
  c.restrito = sit.restrito;
  c.quemPode = SGO_Assist_quemTexto_(base, t, eu);
  if (!sit.acessa) c.telaAbrir = '';
  if (sit.restrito && t.tipo !== 'quem' && t.tipo !== 'menu') { c.texto = t.titulo + '. Esta parte é feita por outro perfil.'; c.itens = []; }
  return c;
}

/* ------------------------------------------------------------
 * Limite, registro e IA
 * ------------------------------------------------------------ */
function SGO_Assist_limite_() {
  var v = Number(PropertiesService.getScriptProperties().getProperty('ASSISTENTE_LIMITE_HORA'));
  return isFinite(v) && v >= 1 && v <= 500 ? Math.floor(v) : SGO_ASSIST_LIMITE_PADRAO;
}
function SGO_Assist_chaveHora_(eu) {
  var h = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMddHH');
  return 'ASSIST_H_' + eu.id + '_' + h;
}
function SGO_Assist_usadas_(eu) { var n = Number(CacheService.getScriptCache().get(SGO_Assist_chaveHora_(eu))); return isFinite(n) ? n : 0; }
function SGO_Assist_contar_(eu) { var c = CacheService.getScriptCache(), k = SGO_Assist_chaveHora_(eu); var n = SGO_Assist_usadas_(eu) + 1; c.put(k, String(n), 3700); return n; }

function SGO_Assist_hash_(t) {
  var h = 0x811c9dc5;
  t = String(t);
  for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}
/** Referência de quem perguntou (sem nome, sem id): só confere o "Isso resolveu?". */
function SGO_Assist_ref_(eu) {
  var p = PropertiesService.getScriptProperties();
  var sal = p.getProperty('ASSIST_SAL');
  if (!sal) { sal = Utilities.getUuid(); p.setProperty('ASSIST_SAL', sal); }
  return SGO_Assist_hash_(sal + ':' + eu.id) + SGO_Assist_hash_(eu.id + ':' + sal);
}

function SGO_Assist_garantirAba_() {
  if (typeof CertCal_garantirTabela_ === 'function') {
    CertCal_garantirTabela_(SGO_ASSIST_ABA, SGO_ASSIST_COLUNAS);
    SGO_ASSIST_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(SGO_ASSIST_ABA, c); });
  }
}

function SGO_Assist_registrar_(eu, pergunta, tela, r, base) {
  try {
    SGO_Assist_garantirAba_();
    var reg = SGO_DATA.insert(SGO_ASSIST_ABA, {
      CRIADO_EM: new Date().toISOString(), PERFIL: eu.perfil, TELA: SGO_Assist_s_(tela).slice(0, 60),
      PERGUNTA: ASN_mascarar_(pergunta).slice(0, ASN_LIMITE_PERGUNTA), GRUPO: ASN_grupoDe_(pergunta, base && base.indice),
      TIPO: r.tipo, ORIGEM: r.origem || '', FONTES: (r.fontes || []).map(function (f) { return f.id || f; }).join(' ').slice(0, 400),
      RESOLVEU: '', AVALIADO_EM: '', REF: SGO_Assist_ref_(eu)
    });
    return reg && reg.ID ? String(reg.ID) : '';
  } catch (e) {
    try { console.error('Assistente: não registrou a pergunta: ' + (e && e.message ? e.message : e)); } catch (x) { }
    return '';
  }
}

function SGO_Assist_iaConfig_() {
  if (typeof RelA4_iaConfig_ === 'function') { var c = RelA4_iaConfig_(); return { chave: c.chave, modelos: c.modelos }; }
  var p = PropertiesService.getScriptProperties();
  return { chave: SGO_Assist_s_(p.getProperty('GEMINI_API_KEY')), modelos: [SGO_Assist_s_(p.getProperty('IA_MODEL')) || 'gemini-2.5-flash', 'gemini-2.0-flash'] };
}
/** IA ligada? (chave cadastrada e o assistente não foi desligado em ASSISTENTE_IA = NAO). */
function SGO_Assist_iaLigada_() {
  var desligada = SGO_Assist_s_(PropertiesService.getScriptProperties().getProperty('ASSISTENTE_IA')).toUpperCase() === 'NAO';
  return !desligada && !!SGO_Assist_iaConfig_().chave;
}

/** Administradores ativos (nome), para "Falar com o administrador". */
function SGO_Assist_contatos_() {
  var nomes = [];
  try {
    (SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS) || []).forEach(function (u) {
      if (SGO_UTILS.safeUpper(u.PERFIL) === 'ADMIN' && SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_Assist_s_(u.NOME)) nomes.push(SGO_Assist_s_(u.NOME));
    });
  } catch (e) { nomes = []; }
  return nomes.slice(0, 5);
}

/** Tela que pode ganhar o botão "Abrir esta tela" para este perfil. */
function SGO_Assist_telaParaAbrir_(base, chave, eu) {
  var mod = String(chave || '').split('/')[0];
  if (!mod) return null;
  var c = base.catalogo.telas[mod], f = SGO_ASSIST_FORA_DO_MENU[mod];
  if (!c && !(f && f.abrir)) return null;
  if (!SGO_Assist_acessaTela_(base, mod, eu.perfil)) return null;
  return { chave: mod, nome: c ? c.nome : f.nome, caminho: c ? c.caminho : f.caminho };
}

/* ------------------------------------------------------------
 * Perguntar
 * ------------------------------------------------------------ */
function SGO_Assist_perguntar_(eu, dados) {
  var pergunta = ASN_limparPergunta_(dados && dados.pergunta);
  var tela = SGO_Assist_s_(dados && dados.tela).toLowerCase().replace(/[^a-z0-9_\/]/g, '').slice(0, 60);
  var contato = SGO_Assist_contatos_();
  var saida = function (r) { r.contato = contato; r.perfilRotulo = eu.rotulo; return r; };
  if (pergunta.length < 3) return saida({ tipo: 'VAZIA', origem: 'REGRA', resumo: 'Escreva a sua dúvida com algumas palavras, por exemplo "Como reservo um veículo?".', passos: [], telas: [], fontes: [] });
  var limite = SGO_Assist_limite_();
  if (SGO_Assist_usadas_(eu) >= limite) {
    var rl = { tipo: 'LIMITE', origem: 'REGRA', resumo: 'Você já fez ' + limite + ' perguntas nesta hora, que é o limite por pessoa. Volte a perguntar na próxima hora; enquanto isso, use o botão "Como usar esta tela" ou fale com o administrador pelo bate-papo.', passos: [], telas: [], fontes: [] };
    rl.id = SGO_Assist_registrar_(eu, pergunta, tela, rl, null);
    return saida(rl);
  }
  SGO_Assist_contar_(eu);
  var base = SGO_Assist_base_();
  var rec = ASN_classificar_(pergunta, { gestao: eu.gestao, caminhos: SGO_ASSIST_CAMINHOS });
  if (rec) {
    var rr = { tipo: 'RECUSA', origem: 'REGRA', categoria: rec.categoria, resumo: rec.mensagem, passos: [], telas: [], fontes: [] };
    rr.id = SGO_Assist_registrar_(eu, pergunta, tela, rr, base);
    return saida(rr);
  }
  var busca = ASN_buscar_(base.indice, ASN_semDados_(pergunta), { telaAtual: tela, limite: 30, filtro: function (t) { return !!SGO_Assist_situacao_(base, t, eu); } });
  var vistos = 0, total = 0, trechos = [];
  busca.itens.forEach(function (x) {
    if (vistos >= ASN_MAX_TRECHOS) return;
    var c = SGO_Assist_paraPerfil_(base, x.trecho, eu);
    if (!c) return;
    var tam = String(c.texto || '').length;
    if (total + tam > ASN_MAX_CARACTERES_TRECHOS && trechos.length) return;
    total += tam; vistos++;
    trechos.push(c);
  });
  var buscaPerfil = { itens: trechos.map(function (t) { return { trecho: t }; }) };
  var r;
  if (!busca.temBase || !trechos.length) {
    r = { tipo: 'NAO_SEI', origem: 'BUSCA', resumo: '', passos: [], telas: [], fontes: [] };
  } else if (SGO_Assist_iaLigada_()) {
    try {
      var cfg = SGO_Assist_iaConfig_();
      var bruto = ASN_gemini_({ chave: cfg.chave, modelos: cfg.modelos, sistema: ASN_instrucoes_('SGO+'), esquema: ASN_esquema_(),
        pedido: ASN_pedido_({ sistema: 'SGO+', perfil: eu.perfil, perfilRotulo: eu.rotulo, telaAtual: tela ? (base.catalogo.telas[tela.split('/')[0]] || {}).nome || tela : '', trechos: trechos, pergunta: ASN_mascarar_(pergunta) }) });
      r = ASN_conferir_(bruto, trechos, { admin: eu.admin, telaValida: function (k) { return !!SGO_Assist_telaParaAbrir_(base, k, eu); } });
      r.origem = 'IA';
    } catch (e) {
      r = ASN_respostaBusca_(buscaPerfil, 3);
      r.origem = 'BUSCA';
      r.aviso = 'A resposta automática não está disponível agora (' + (e && e.message ? e.message : e) + '). Estes são os trechos da ajuda mais próximos da sua pergunta.';
    }
  } else {
    r = ASN_respostaBusca_(buscaPerfil, 3);
    r.origem = 'BUSCA';
    r.aviso = 'Estes são os trechos da ajuda e dos manuais mais próximos da sua pergunta.';
  }
  if (r.tipo === 'RECUSA' && !r.resumo) r.resumo = ASN_RECUSAS.burla_generica;
  // telas para "Abrir esta tela" e fontes legíveis
  r.telas = (r.telas || []).map(function (k) { return SGO_Assist_telaParaAbrir_(base, k, eu); }).filter(Boolean);
  if (r.tipo === 'BUSCA') {
    r.trechos = (r.trechos || []).map(function (t) { var a = t.tela ? SGO_Assist_telaParaAbrir_(base, t.tela, eu) : null; t.abrir = a; return t; });
  }
  var fontesObj = r.fontes || [];
  r.id = SGO_Assist_registrar_(eu, pergunta, tela, { tipo: r.tipo, origem: r.origem, fontes: fontesObj.length ? fontesObj : (r.trechos || []) }, base);
  var nomesFonte = [];
  fontesObj.forEach(function (f) { var n = f.fonte || ''; if (n && nomesFonte.indexOf(n) < 0) nomesFonte.push(n); });
  r.fontes = nomesFonte;
  return saida(r);
}

/* ------------------------------------------------------------
 * Painel da gestão (Administrador e Diretoria)
 * ------------------------------------------------------------ */
function SGO_Assist_registros_() {
  var l = [];
  try { l = SGO_DATA.getAll(SGO_ASSIST_ABA) || []; } catch (e) { l = []; }
  return l.map(function (r) {
    var em = r.CRIADO_EM instanceof Date ? r.CRIADO_EM.toISOString() : SGO_Assist_s_(r.CRIADO_EM);
    return { id: SGO_Assist_s_(r.ID), em: em, perfil: SGO_Assist_s_(r.PERFIL), tela: SGO_Assist_s_(r.TELA), pergunta: SGO_Assist_s_(r.PERGUNTA), grupo: SGO_Assist_s_(r.GRUPO),
      tipo: SGO_Assist_s_(r.TIPO), origem: SGO_Assist_s_(r.ORIGEM), resolveu: SGO_Assist_s_(r.RESOLVEU).toUpperCase() };
  });
}

function SGO_Assist_exigirPainel_(eu) {
  if (!eu.painel) throw new Error('O painel de perguntas ao assistente é do Administrador e da Diretoria. Se você quer sugerir uma melhoria na ajuda, escreva para o administrador pelo bate-papo.');
}

function SGO_Assist_nomeTela_(base, k) {
  var mod = String(k || '').split('/')[0];
  return (base.catalogo.telas[mod] && base.catalogo.telas[mod].nome) || (SGO_ASSIST_FORA_DO_MENU[mod] && SGO_ASSIST_FORA_DO_MENU[mod].nome) || (k ? k : 'Sem tela');
}

function SGO_Assist_painel_(eu, dados) {
  SGO_Assist_exigirPainel_(eu);
  var dias = Number(dados && dados.dias);
  if ([7, 30, 90, 365].indexOf(dias) < 0) dias = 30;
  var base = SGO_Assist_base_();
  var p = ASN_painel_(SGO_Assist_registros_(), { dias: dias });
  var rotPerfil = function (x) { return (typeof SGO_AJUDA_PERFIS !== 'undefined' && SGO_AJUDA_PERFIS[x]) || x; };
  p.grupos.forEach(function (g) { g.telasNomes = g.telas.map(function (k) { return SGO_Assist_nomeTela_(base, k); }); g.perfisNomes = g.perfis.map(rotPerfil); });
  p.semResposta.forEach(function (s) { s.telaNome = SGO_Assist_nomeTela_(base, s.tela); s.perfilNome = rotPerfil(s.perfil); });
  p.porTela.forEach(function (t) { t.nome = SGO_Assist_nomeTela_(base, t.tela); });
  p.dias = dias;
  p.base = SGO_Assist_infoBase_(base);
  p.ia = SGO_Assist_iaLigada_();
  p.limite = SGO_Assist_limite_();
  return p;
}

function SGO_Assist_infoBase_(base) {
  var porTipo = {};
  base.trechos.forEach(function (t) { porTipo[t.tipo] = (porTipo[t.tipo] || 0) + 1; });
  return { trechos: base.trechos.length, telasComAjuda: base.telasComAjuda, telasNoMenu: base.catalogo.ordem.length, manuais: base.manuais, versaoManuais: base.versaoManuais,
    montadaEm: base.montadaEm, porTipo: porTipo };
}

/** Rascunho de texto de ajuda para um grupo de perguntas (o administrador revisa; nada é publicado). */
function SGO_Assist_sugerir_(eu, dados) {
  SGO_Assist_exigirPainel_(eu);
  var grupo = SGO_Assist_s_(dados && dados.grupo);
  var regs = SGO_Assist_registros_().filter(function (r) { return r.grupo === grupo && r.tipo !== 'LIMITE'; });
  if (!regs.length) throw new Error('Não há perguntas registradas neste assunto. Atualize o painel e escolha outro assunto.');
  var exemplos = [];
  regs.slice(-30).reverse().forEach(function (r) { if (exemplos.length < 8 && exemplos.indexOf(r.pergunta) < 0) exemplos.push(r.pergunta); });
  var base = SGO_Assist_base_();
  var euAdmin = { perfil: 'ADMIN', admin: true, gestao: true };
  var busca = ASN_buscar_(base.indice, exemplos.join(' '), { limite: 6, filtro: function (t) { return !!SGO_Assist_situacao_(base, t, euAdmin); } });
  var trechos = busca.itens.map(function (x) { return x.trecho; });
  var rascunho, origem = 'MODELO';
  if (SGO_Assist_iaLigada_()) {
    try {
      var cfg = SGO_Assist_iaConfig_();
      var b = ASN_gemini_({ chave: cfg.chave, modelos: cfg.modelos, sistema: ASN_instrucoesSugestao_('SGO+'), esquema: ASN_esquemaSugestao_(),
        pedido: 'Escreva o rascunho conforme as regras. Os dados vêm em JSON.\n\nDADOS:\n' + JSON.stringify({ perguntas: exemplos, trechos: trechos.map(function (t) { return { fonte: t.fonte, caminho: t.caminho, titulo: t.titulo, texto: t.texto }; }) }) });
      rascunho = { titulo: ASN_textoLimpo_(b.titulo, 200), paraQueServe: ASN_textoLimpo_(b.paraQueServe, 600), passos: (b.passos || []).map(function (x) { return ASN_textoLimpo_(x, 400); }).filter(Boolean).slice(0, 15),
        faltaConfirmar: (b.faltaConfirmar || []).map(function (x) { return ASN_textoLimpo_(x, 400); }).filter(Boolean).slice(0, 10) };
      origem = 'IA';
    } catch (e) { rascunho = null; }
  }
  if (!rascunho) rascunho = ASN_sugestaoSemIa_(exemplos, trechos);
  return { grupo: grupo, exemplos: exemplos, rascunho: rascunho, origem: origem, trechos: trechos.map(function (t) { return { fonte: t.fonte, titulo: t.titulo, caminho: t.caminho }; }),
    aviso: 'Rascunho para revisar. Nada foi publicado: para valer, o texto revisado entra na ajuda da tela e no manual do módulo na próxima atualização do sistema.' };
}

/* ------------------------------------------------------------
 * Avaliação ("Isso resolveu?")
 * ------------------------------------------------------------ */
function SGO_Assist_avaliar_(eu, dados) {
  var id = SGO_Assist_s_(dados && dados.id);
  if (!id) throw new Error('Não foi possível registrar a sua avaliação: a resposta não tem número. Faça a pergunta de novo.');
  var reg = SGO_DATA.getById(SGO_ASSIST_ABA, id);
  if (!reg || SGO_Assist_s_(reg.REF) !== SGO_Assist_ref_(eu)) throw new Error('Não foi possível registrar a avaliação: esta resposta não é de uma pergunta sua.');
  var v = dados.resolveu === true || String(dados.resolveu).toUpperCase() === 'SIM' ? 'SIM' : 'NAO';
  SGO_DATA.update(SGO_ASSIST_ABA, id, { RESOLVEU: v, AVALIADO_EM: new Date().toISOString() });
  return { resolveu: v, contato: v === 'NAO' ? SGO_Assist_contatos_() : [] };
}

/* ------------------------------------------------------------
 * Abertura do painel de conversa
 * ------------------------------------------------------------ */
function SGO_Assist_iniciar_(eu, dados) {
  var tela = SGO_Assist_s_(dados && dados.tela).toLowerCase().replace(/[^a-z0-9_\/]/g, '');
  var base = SGO_Assist_base_();
  var sugestoes = [];
  var mod = tela.split('/')[0];
  var aj = base.ajuda.telas[tela] || base.ajuda.telas[mod];
  if (aj && SGO_Assist_acessaTela_(base, mod, eu.perfil)) {
    (aj.perguntas || []).forEach(function (q) { var p = SGO_Assist_s_(q && q.p); if (p && sugestoes.length < 3 && !(ASN_TERMOS_ADMIN.test(p) && !eu.admin)) sugestoes.push(p); });
  }
  ['Como reservo um veículo?', 'Como justifico uma atividade atrasada?', 'Como envio um documento ao cliente?'].forEach(function (p) { if (sugestoes.length < 4) sugestoes.push(p); });
  var limite = SGO_Assist_limite_();
  return { perfil: eu.perfil, perfilRotulo: eu.rotulo, ia: SGO_Assist_iaLigada_(), limite: limite, restantes: Math.max(0, limite - SGO_Assist_usadas_(eu)),
    sugestoes: sugestoes, contato: SGO_Assist_contatos_(), painel: eu.painel, nomeTela: tela ? SGO_Assist_nomeTela_(base, tela) : '' };
}

/* ------------------------------------------------------------
 * Chamada única do navegador
 * ------------------------------------------------------------ */
function SGO_Assist_api(sessionId, acao, dados) {
  try {
    var eu = SGO_Assist_eu_(sessionId);
    var fn = { iniciar: SGO_Assist_iniciar_, perguntar: SGO_Assist_perguntar_, avaliar: SGO_Assist_avaliar_, painel: SGO_Assist_painel_, sugerir: SGO_Assist_sugerir_,
      base: function (e) { SGO_Assist_exigirPainel_(e); return SGO_Assist_infoBase_(SGO_Assist_base_()); } }[String(acao || '')];
    if (!fn) throw new Error('Ação desconhecida do assistente. Recarregue a página e tente de novo.');
    var r = fn(eu, dados || {}) || {};
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
