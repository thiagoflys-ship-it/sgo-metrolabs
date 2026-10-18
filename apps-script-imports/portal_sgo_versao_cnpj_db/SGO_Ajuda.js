/**
 * SGO_Ajuda.js — ajuda "Como usar esta tela" e manual completo do módulo (17/10/2026).
 *
 * Contrato do conteúdo: docs/AJUDA_CONTRATO_20261017.md.
 * Cada grupo escreve SGO_Ajuda_<Grupo>.js com a função global SGO_ajudaTelas_<Grupo>_(),
 * que devolve { "<chaveDaTela>": { titulo, paraQueServe, antesDeComecar, passos, cores,
 * problemas, quemPode, perguntas, secoesManual } }. A chave é a mesma de abrir(mod) no menu.
 * Grupo que ainda não existe não quebra nada: a tela mostra "Ajuda desta tela em preparação".
 *
 * Chamadas do navegador:
 *   SGO_Ajuda_apiTela(sessionId, chave)    -> { ok, chave, existe, ajuda, subtelas, perfil, ... }
 *   SGO_Ajuda_apiManual(sessionId, modulo) -> { ok, html, titulo } (A4 no padrão SGO_DocA4)
 * Nenhuma função devolve Date: só strings.
 */

var SGO_AJUDA_PERFIS = {
  ADMIN: 'Administrador', DIRETORIA: 'Diretoria', GESTOR: 'Gestor', TECNICO: 'Técnico',
  METROLOGIA: 'Metrologia', COMERCIAL: 'Comercial', FINANCEIRO: 'Financeiro', CLIENTE: 'Cliente', TODOS: 'Todos'
};

/** Nome de cada tela (igual ao menu), para o título quando a ajuda ainda não existe. */
var SGO_AJUDA_NOMES = {
  dashboard: 'Início', mobile_home: 'Início do celular', busca: 'Busca rápida',
  minhas_atividades: 'Minhas atividades', atividades_equipe: 'Atividades da equipe', avisos: 'Avisos',
  autoclave: 'Autoclaves', lavadora: 'Lavadoras', cadeia_frio: 'Cadeia de frio',
  estufa_banhomaria: 'Estufa, banho-maria e secadora', declaracao_qiqo: 'Relatório QI/QO/QD', nr13: 'Laudo NR-13',
  certificado_calibracao: 'Certificado de calibração', relatorio_calibracao: 'Relatório de calibração',
  padroes: 'Padrões de referência', declaracao_exec: 'Declaração de execução', pgt_pop: 'PGT e POP',
  reg_op: 'Registros operacionais', planejamento_cme: 'Planejamento CME', cronograma_execucao: 'Cronograma de execução',
  auvo: 'Integração Auvo', frota: 'Frota', qualidade: 'Painel de qualidade', conduta: 'Programa de conduta',
  inventario: 'Inventário de equipamentos', clientes: 'Clientes', unidades: 'Unidades', equipamentos: 'Equipamentos',
  vinculos: 'Vínculos', documentos: 'Arquivo de documentos', usuarios: 'Usuários', admin: 'Configurações',
  chaves: 'Chaves e senhas'
};

/**
 * Junta o conteúdo de todos os grupos existentes. A conferência typeof precisa do nome literal
 * de cada função (não há como procurar por texto no escopo global do Apps Script).
 * Um grupo com erro é ignorado (e registrado no log); os outros continuam.
 */
function SGO_Ajuda_todas_() {
  var fontes = [];
  if (typeof SGO_ajudaTelas_Principal_ === 'function') fontes.push(['Principal', SGO_ajudaTelas_Principal_]);
  if (typeof SGO_ajudaTelas_Cadastros_ === 'function') fontes.push(['Cadastros', SGO_ajudaTelas_Cadastros_]);
  if (typeof SGO_ajudaTelas_Administracao_ === 'function') fontes.push(['Administracao', SGO_ajudaTelas_Administracao_]);
  if (typeof SGO_ajudaTelas_Qualificacao_ === 'function') fontes.push(['Qualificacao', SGO_ajudaTelas_Qualificacao_]);
  if (typeof SGO_ajudaTelas_Calibracao_ === 'function') fontes.push(['Calibracao', SGO_ajudaTelas_Calibracao_]);
  if (typeof SGO_ajudaTelas_Documentos_ === 'function') fontes.push(['Documentos', SGO_ajudaTelas_Documentos_]);
  if (typeof SGO_ajudaTelas_Planejamento_ === 'function') fontes.push(['Planejamento', SGO_ajudaTelas_Planejamento_]);
  if (typeof SGO_ajudaTelas_Frota_ === 'function') fontes.push(['Frota', SGO_ajudaTelas_Frota_]);
  if (typeof SGO_ajudaTelas_Auvo_ === 'function') fontes.push(['Auvo', SGO_ajudaTelas_Auvo_]);
  if (typeof SGO_ajudaTelas_Qualidade_ === 'function') fontes.push(['Qualidade', SGO_ajudaTelas_Qualidade_]);
  if (typeof SGO_ajudaTelas_Conduta_ === 'function') fontes.push(['Conduta', SGO_ajudaTelas_Conduta_]);
  if (typeof SGO_ajudaTelas_Inventario_ === 'function') fontes.push(['Inventario', SGO_ajudaTelas_Inventario_]);
  var todas = {}, ordem = [];
  fontes.forEach(function (f) {
    var obj;
    try { obj = f[1](); } catch (e) { try { console.error('Ajuda do grupo ' + f[0] + ' com erro: ' + (e && e.message ? e.message : e)); } catch (x) {} return; }
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (k) {
      var chave = String(k || '').trim();
      if (!chave || !obj[k] || typeof obj[k] !== 'object') return;
      if (!todas[chave]) ordem.push(chave);
      todas[chave] = obj[k];
      todas[chave].__grupo = f[0];
    });
  });
  return { telas: todas, ordem: ordem };
}

function SGO_Ajuda_txt_(v) {
  return v === null || v === undefined ? '' : String(v).replace(/\r\n/g, '\n').trim();
}

function SGO_Ajuda_lista_(v) {
  if (!v) return [];
  if (!Array.isArray(v)) v = [v];
  return v.map(SGO_Ajuda_txt_).filter(Boolean);
}

function SGO_Ajuda_perfisDe_(texto) {
  return String(texto || '').toUpperCase().split(/[,;\/]/).map(function (p) { return p.trim(); }).filter(Boolean);
}

function SGO_Ajuda_rotuloPerfis_(texto) {
  var lista = SGO_Ajuda_perfisDe_(texto);
  if (!lista.length) return SGO_Ajuda_txt_(texto);
  return lista.map(function (p) { return SGO_AJUDA_PERFIS[p] || (p.charAt(0) + p.slice(1).toLowerCase()); }).join(', ');
}

/**
 * Normaliza uma entrada (só texto puro, listas sempre listas) e marca as linhas de "quemPode"
 * do perfil de quem está vendo. O perfil Cliente só vê a própria linha e a linha "Todos".
 */
function SGO_Ajuda_normalizar_(chave, e, perfil) {
  e = e || {};
  var quem = (Array.isArray(e.quemPode) ? e.quemPode : []).map(function (q) {
    q = q || {};
    var lista = SGO_Ajuda_perfisDe_(q.perfil);
    return {
      perfil: SGO_Ajuda_rotuloPerfis_(q.perfil), pode: SGO_Ajuda_txt_(q.pode),
      voce: !!perfil && (lista.indexOf(perfil) !== -1), todos: lista.indexOf('TODOS') !== -1
    };
  }).filter(function (q) { return q.perfil || q.pode; });
  if (perfil === 'CLIENTE') quem = quem.filter(function (q) { return q.voce || q.todos; });
  // as linhas de quem está vendo primeiro
  quem.sort(function (a, b) { return (a.voce === b.voce) ? 0 : (a.voce ? -1 : 1); });
  return {
    chave: chave,
    titulo: SGO_Ajuda_txt_(e.titulo) || SGO_AJUDA_NOMES[chave] || chave,
    paraQueServe: SGO_Ajuda_txt_(e.paraQueServe),
    antesDeComecar: SGO_Ajuda_lista_(e.antesDeComecar),
    passos: (Array.isArray(e.passos) ? e.passos : []).map(function (p) {
      p = p || {};
      return { titulo: SGO_Ajuda_txt_(p.titulo), itens: SGO_Ajuda_lista_(p.itens) };
    }).filter(function (p) { return p.titulo || p.itens.length; }),
    cores: (Array.isArray(e.cores) ? e.cores : []).map(function (c) {
      c = c || {};
      return { nome: SGO_Ajuda_txt_(c.nome), significado: SGO_Ajuda_txt_(c.significado) };
    }).filter(function (c) { return c.nome || c.significado; }),
    problemas: (Array.isArray(e.problemas) ? e.problemas : []).map(function (c) {
      c = c || {};
      return { situacao: SGO_Ajuda_txt_(c.situacao), oQueFazer: SGO_Ajuda_txt_(c.oQueFazer) };
    }).filter(function (c) { return c.situacao || c.oQueFazer; }),
    quemPode: quem,
    perguntas: (Array.isArray(e.perguntas) ? e.perguntas : []).map(function (c) {
      c = c || {};
      return { p: SGO_Ajuda_txt_(c.p), r: SGO_Ajuda_txt_(c.r) };
    }).filter(function (c) { return c.p || c.r; }),
    secoesManual: (Array.isArray(e.secoesManual) ? e.secoesManual : []).map(function (s) {
      s = s || {};
      return { titulo: SGO_Ajuda_txt_(s.titulo), paragrafos: SGO_Ajuda_lista_(s.paragrafos) };
    }).filter(function (s) { return s.titulo || s.paragrafos.length; })
  };
}

/** Chave da tela: só letras minúsculas, números, "_" e "/" (sub-tela). */
function SGO_Ajuda_chave_(v) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9_\/]/g, '').slice(0, 80);
}

function SGO_Ajuda_perfilSessao_(sessionId) {
  var s = exigirSessao(sessionId);
  return { perfil: SGO_UTILS.safeUpper(s.perfil), nome: SGO_UTILS.safe(s.nome) || SGO_UTILS.safe(s.usuario) };
}

/** Telas de um módulo: a própria chave e as "<modulo>/...", na ordem do conteúdo. */
function SGO_Ajuda_doModulo_(base, modulo) {
  return base.ordem.filter(function (k) { return k === modulo || k.indexOf(modulo + '/') === 0; });
}

function SGO_Ajuda_apiTela(sessionId, chave) {
  try {
    var eu = SGO_Ajuda_perfilSessao_(sessionId);
    var k = SGO_Ajuda_chave_(chave);
    if (!k) return { ok: false, message: 'Não foi possível abrir a ajuda: a tela não foi informada. Feche o painel e abra a tela pelo menu antes de tocar em "Como usar esta tela".' };
    var base = SGO_Ajuda_todas_();
    var modulo = k.split('/')[0];
    var chaves = SGO_Ajuda_doModulo_(base, modulo);
    var principal = base.telas[k] ? k : (base.telas[modulo] ? modulo : '');
    var subtelas = chaves.filter(function (c) { return c !== principal; }).map(function (c) {
      return SGO_Ajuda_normalizar_(c, base.telas[c], eu.perfil);
    });
    return {
      ok: true,
      chave: k,
      modulo: modulo,
      existe: !!principal || subtelas.length > 0,
      nomeTela: SGO_AJUDA_NOMES[modulo] || '',
      ajuda: principal ? SGO_Ajuda_normalizar_(principal, base.telas[principal], eu.perfil) : null,
      subtelas: subtelas,
      perfil: eu.perfil,
      perfilRotulo: SGO_AJUDA_PERFIS[eu.perfil] || eu.perfil,
      temManual: chaves.length > 0
    };
  } catch (e) {
    return { ok: false, message: 'Não foi possível abrir a ajuda desta tela: ' + (e && e.message ? e.message : e) + '. Tente de novo em instantes.' };
  }
}

/* ============================================================
 * Manual completo do módulo (A4)
 * ============================================================ */

function SGO_Ajuda_ancora_(t) { return 'tela-' + t.chave.replace(/[^a-z0-9_]/g, '-'); }

/** Seções de uma tela no manual. sumario (lista) recebe { id, texto } de cada seção, na ordem. */
function SGO_Ajuda_htmlSecoesTela_(t, num, comTitulo, sumario) {
  var esc = SGO_DocA4_esc_;
  var h = [], sub = 0;
  function n(texto) {
    sub++;
    var id = SGO_Ajuda_ancora_(t) + '-' + sub;
    if (sumario) sumario.push({ id: id, texto: num + '.' + sub + ' ' + texto });
    return '<h3 id="' + id + '">' + num + '.' + sub + ' ' + esc(texto) + '</h3>';
  }
  if (comTitulo) h.push('<h2 id="' + SGO_Ajuda_ancora_(t) + '">' + num + '. ' + esc(t.titulo) + '</h2>');
  if (t.paraQueServe) { h.push(n('Para que serve')); h.push(SGO_DocA4_paragrafos_(t.paraQueServe)); }
  if (t.antesDeComecar.length) { h.push(n('Antes de começar')); h.push(SGO_DocA4_lista_(t.antesDeComecar)); }
  if (t.passos.length) {
    h.push(n('Passo a passo'));
    t.passos.forEach(function (p) {
      h.push('<div class="tarefa">' + (p.titulo ? '<h4>' + esc(p.titulo) + '</h4>' : '') +
        '<ol class="passos">' + p.itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ol></div>');
    });
  }
  if (t.cores.length) {
    h.push(n('O que significa cada cor e cada selo'));
    h.push(SGO_DocA4_tabela_([{ t: 'Cor ou selo' }, { t: 'O que significa' }], t.cores.map(function (c) { return [c.nome, c.significado]; }), { classe: 'duas' }));
  }
  if (t.problemas.length) {
    h.push(n('Se algo der errado'));
    h.push(SGO_DocA4_tabela_([{ t: 'O que aconteceu' }, { t: 'O que fazer' }], t.problemas.map(function (c) { return [c.situacao, c.oQueFazer]; }), { classe: 'duas' }));
  }
  if (t.quemPode.length) {
    h.push(n('Quem pode fazer'));
    h.push(SGO_DocA4_tabela_([{ t: 'Perfil' }, { t: 'O que pode fazer' }], t.quemPode.map(function (c) { return [c.perfil, c.pode]; }), { classe: 'duas' }));
  }
  if (t.perguntas.length) {
    h.push(n('Perguntas frequentes'));
    t.perguntas.forEach(function (q) { h.push('<div class="pergunta"><p class="p">' + esc(q.p) + '</p>' + SGO_DocA4_paragrafos_(q.r) + '</div>'); });
  }
  t.secoesManual.forEach(function (s) {
    h.push(n(s.titulo));
    s.paragrafos.forEach(function (p) { h.push(SGO_DocA4_paragrafos_(p)); });
  });
  return h.join('');
}

function SGO_Ajuda_apiManual(sessionId, modulo) {
  try {
    var eu = SGO_Ajuda_perfilSessao_(sessionId);
    var m = SGO_Ajuda_chave_(modulo).split('/')[0];
    if (!m) return { ok: false, message: 'Não foi possível montar o manual: o módulo não foi informado. Abra a tela pelo menu e tente de novo.' };
    var base = SGO_Ajuda_todas_();
    var chaves = SGO_Ajuda_doModulo_(base, m);
    var nome = SGO_AJUDA_NOMES[m] || m;
    if (!chaves.length) return { ok: false, message: 'O manual completo de "' + nome + '" ainda está em preparação. Enquanto isso, use o botão "Manual do operador" da própria tela, quando houver, ou fale com o gestor.' };
    var telas = chaves.map(function (c) { return SGO_Ajuda_normalizar_(c, base.telas[c], eu.perfil); });
    var titulo = (base.telas[m] && SGO_Ajuda_txt_(base.telas[m].titulo)) || nome;
    var esc = SGO_DocA4_esc_;
    var hoje = SGO_DocA4_hoje_('America/Sao_Paulo', 'dd/MM/yyyy');
    var h = [];
    h.push(SGO_DocA4_inicioDocumento_({
      titulo: 'Manual do operador: ' + titulo,
      subtitulo: 'Como usar o módulo no SGO+, passo a passo. Emitido em ' + hoje + (eu.perfil ? ' para o perfil ' + (SGO_AJUDA_PERFIS[eu.perfil] || eu.perfil) : '') + '.',
      tituloCurto: 'Manual do operador',
      rotuloNumero: 'Módulo',
      numero: titulo,
      revisao: hoje
    }));
    h.push('<style>' +
      'ol.passos{margin:0 0 3mm 5mm;padding:0}ol.passos li{margin:0 0 1.2mm;text-align:left}' +
      '.tarefa{break-inside:avoid;page-break-inside:avoid}' +
      '.pergunta{break-inside:avoid;page-break-inside:avoid;margin:0 0 2.6mm}.pergunta .p{font-weight:700;margin:0 0 .8mm;text-align:left}' +
      'table.t.duas td:first-child,table.t.duas th:first-child{width:36%}' +
      '.sumario ul{list-style:none;margin:0 0 4mm;padding:0}.sumario ul ul{margin:.6mm 0 1.6mm 6mm}.sumario li{margin:0 0 .8mm;text-align:left}' +
      '.sum1>li>a{font-weight:700}.sumario a{color:#0b3d6e;text-decoration:none}' +
      '.uso{background:#f5f7fa;border-left:2.5pt solid #9fb3c8;padding:2.6mm 3.6mm;margin:1mm 0 4mm}' +
      '</style>');
    h.push('<div class="uso"><p>Este manual reúne a ajuda "Como usar esta tela" do módulo. A mesma ajuda aparece no SGO+ pelo botão "Como usar esta tela", no cabeçalho da tela (computador) ou na barra do topo (celular). Os nomes entre aspas são os botões exatamente como aparecem na tela.</p></div>');
    var corpo = [], itens = [];
    telas.forEach(function (t, i) {
      var secs = [];
      corpo.push('<section' + (i > 0 ? ' class="quebra"' : '') + '>' + SGO_Ajuda_htmlSecoesTela_(t, i + 1, true, secs) + '</section>');
      itens.push('<li><a href="#' + SGO_Ajuda_ancora_(t) + '">' + (i + 1) + '. ' + esc(t.titulo) + '</a>' +
        (secs.length ? '<ul>' + secs.map(function (s) { return '<li><a href="#' + s.id + '">' + esc(s.texto) + '</a></li>'; }).join('') + '</ul>' : '') + '</li>');
    });
    h.push('<section class="sumario"><h2>Sumário</h2><ul class="sum1">' + itens.join('') + '</ul></section>');
    h.push(corpo.join(''));
    h.push(SGO_DocA4_fimDocumento_());
    // Cabeçalho: "Módulo <nome> · Edição de dd/mm/aaaa" (o padrão escreve "Revisão"); título da aba sem "nº".
    var html = h.join('').split('Revisão ' + hoje).join('Edição de ' + hoje)
      .replace(/<title>[^<]*<\/title>/, '<title>' + esc('Manual do operador: ' + titulo) + '</title>');
    return { ok: true, html: html, titulo: 'Manual do operador: ' + titulo };
  } catch (e) {
    return { ok: false, message: 'Não foi possível montar o manual: ' + (e && e.message ? e.message : e) + '. Tente de novo em instantes.' };
  }
}
