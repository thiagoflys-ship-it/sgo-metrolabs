/**
 * PGT (Plano de Gerenciamento de Tecnologias em Saúde) e POP — documento A4.
 * Padrão de 18/10/2026 (docs/DOCUMENTOS_PADRAO_A4_20261018.md): moldura SGO_RelTecA4
 * (cabeçalho e rodapé corridos, "Página X de Y"), tipografia e tabelas da SGO_DocA4.
 * PGT: capa (documento longo, sem veredito), sumário com páginas, seções numeradas e
 * subseções ("Requisitos específicos" → 6.1, 6.2...). POP: abertura com título e ficha,
 * sumário só quando passa de 3 páginas. Os dois: controle de revisões (Tabela 1), figuras
 * numeradas e aprovação com as quatro assinaturas na mesma folha.
 */

/** Título vindo da IA: sem numeração própria, sem caixa alta e sem "Title Case". */
function PgtPopDoc_tituloSecao_(t) {
  let s = String(t || '').replace(/^\s*(?:\d+(?:\.\d+)*[.)]?|[IVX]+[.)])\s+/, '').replace(/[.:\s]+$/, '').trim();
  const siglas = /^(PGTS|PGT|POP|POPs|RDC|ABNT|NBR|ISO|IEC|EPI|EPIs|EPC|EPCs|MP|CME|UTI|ANVISA|Anvisa|SUS|CNES|EAS|RH|TI)$/;
  const palavras = s.split(/\s+/);
  const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const caixaAlta = letras.length > 3 && letras === letras.toUpperCase();
  const longas = palavras.filter(function (p) { return p.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4; });
  const capitalizadas = longas.filter(function (p) { return /^[A-ZÀ-Ý]/.test(p); });
  const titleCase = longas.length >= 2 && capitalizadas.length / longas.length >= 0.6;
  if (caixaAlta || titleCase) {
    s = palavras.map(function (p, i) {
      const limpa = p.replace(/[^A-Za-zÀ-ÿ]/g, '');
      if (siglas.test(limpa) || (!caixaAlta && limpa.length >= 2 && limpa === limpa.toUpperCase())) return p;
      const min = p.toLowerCase();
      return i === 0 ? min.charAt(0).toUpperCase() + min.slice(1) : min;
    }).join(' ');
    // depois de dois-pontos, a parte seguinte começa com maiúscula (vira subtítulo)
    s = s.replace(/:\s*([a-zà-ÿ])/, function (m, c) { return ': ' + c.toUpperCase(); });
  }
  return s;
}

/**
 * Corpo gerado pela IA (texto com marcadores "## Título ##") → seções
 * [{ titulo, paragrafos[] }]. Títulos repetidos entre os blocos do PGT viram uma seção só.
 */
function PgtPopDoc_secoes_(corpo) {
  const linhas = String(corpo || '').replace(/\r\n/g, '\n').split('\n');
  const secoes = [];
  const porTitulo = {};
  let atual = null;
  let paragrafoAtual = [];

  function flushParagrafo() {
    const texto = paragrafoAtual.join(' ').replace(/\s+/g, ' ').trim();
    if (texto) {
      if (!atual) { atual = { titulo: '', paragrafos: [] }; secoes.push(atual); }
      atual.paragrafos.push(texto);
    }
    paragrafoAtual = [];
  }

  linhas.forEach(function (linhaRaw) {
    const linha = linhaRaw.trim();
    const m = linha.match(/^##\s*(.+?)\s*##$/);
    if (m) {
      flushParagrafo();
      const titulo = PgtPopDoc_tituloSecao_(m[1]);
      const chave = titulo.toLowerCase();
      if (porTitulo[chave]) { atual = porTitulo[chave]; return; }
      atual = { titulo: titulo, paragrafos: [] };
      porTitulo[chave] = atual;
      secoes.push(atual);
    } else if (!linha) {
      flushParagrafo();
    } else if (/^\d{1,2}[.)]\s/.test(linha) || /^[A-ZÀ-Ý][^:.;]{1,50}:\s+\S/.test(linha)) {
      // Passo numerado ("1. ...") ou termo de glossário ("Termo: definição") em linha própria vira item próprio.
      flushParagrafo();
      paragrafoAtual.push(linha);
    } else {
      paragrafoAtual.push(linha);
    }
  });
  flushParagrafo();
  return secoes.filter(function (s) { return s.titulo || s.paragrafos.length; });
}

/** Parágrafos de uma seção: passos numerados viram lista numerada; glossário vira termo em negrito. */
function PgtPopDoc_corpoSecao_(sec) {
  const esc = PgtPop_escaparHtml_;
  const ps = sec.paragrafos || [];
  const reTermo = /^([A-ZÀ-Ý][^:.;]{1,70}?)\s*(?::|—|–)\s+(\S.*)$/;
  const glossario = /defini|gloss|termos/i.test(sec.titulo || '') ||
    (ps.length >= 6 && ps.filter(function (p) { return reTermo.test(p); }).length / ps.length >= 0.6);
  const out = [];
  let lista = null;
  function fecharLista() { if (lista) { out.push('<ol class="passos" start="' + lista.inicio + '">' + lista.itens.join('') + '</ol>'); lista = null; } }
  ps.forEach(function (p) {
    const mp = /^(\d{1,2})[.)]\s+(.*)$/.exec(p);
    if (mp) {
      if (!lista) lista = { inicio: Number(mp[1]) || 1, itens: [] };
      lista.itens.push('<li>' + esc(mp[2]) + '</li>');
      return;
    }
    fecharLista();
    const mt = glossario ? reTermo.exec(p) : null;
    if (mt) out.push('<p class="termo"><b>' + esc(mt[1]) + ':</b> ' + esc(mt[2]) + '</p>');
    else out.push('<p>' + esc(p) + '</p>');
  });
  fecharLista();
  return out.join('\n');
}

/**
 * Seções numeradas. Seções seguidas com o mesmo prefixo ("Requisitos específicos: Aquisição",
 * "Requisitos específicos: Instalação"...) viram uma seção com subseções (6.1, 6.2...).
 * n0 = número da última seção já usada no documento. Devolve { html, ultimo }.
 */
function PgtPopDoc_secoesHtml_(secoes, n0) {
  const esc = PgtPop_escaparHtml_;
  let n = n0;
  const out = [];
  let i = 0;
  const prefixo = function (t) { const m = /^([^:]{3,60}):\s*(.+)$/.exec(t || ''); return m ? { p: m[1].trim(), sub: m[2].trim() } : null; };
  while (i < secoes.length) {
    const s = secoes[i];
    if (!s.titulo) { out.push(PgtPopDoc_corpoSecao_(s)); i++; continue; }
    const pf = prefixo(s.titulo);
    if (pf) {
      const grupo = [];
      let j = i;
      while (j < secoes.length) {
        const pj = prefixo(secoes[j].titulo);
        if (!pj || pj.p.toLowerCase() !== pf.p.toLowerCase()) break;
        grupo.push({ titulo: pj.sub, paragrafos: secoes[j].paragrafos });
        j++;
      }
      n++;
      out.push('<section><h2>' + n + '. ' + esc(pf.p) + '</h2>');
      grupo.forEach(function (g, k) { out.push('<h3>' + n + '.' + (k + 1) + ' ' + esc(g.titulo.charAt(0).toUpperCase() + g.titulo.slice(1)) + '</h3>' + PgtPopDoc_corpoSecao_(g)); });
      out.push('</section>');
      i = j;
      continue;
    }
    n++;
    out.push('<section><h2>' + n + '. ' + esc(s.titulo) + '</h2>' + PgtPopDoc_corpoSecao_(s) + '</section>');
    i++;
  }
  return { html: out.join('\n'), ultimo: n };
}

/** Compatibilidade: corpo → HTML de seções numeradas (a partir de 1). */
function PgtPopDoc_corpoParaHtml_(corpo) {
  return PgtPopDoc_secoesHtml_(PgtPopDoc_secoes_(corpo), 0).html;
}

/** CSS: padrão SGO_DocA4 + ajustes do PGT/POP + moldura SGO_RelTecA4 (por último). */
function PgtPop_getCss_(opcoes) {
  const o = opcoes || {};
  const docA4 = (typeof SGO_DocA4_estilos_ === 'function')
    ? SGO_DocA4_estilos_({ tituloCurto: o.titulo, numero: o.numero, revisao: o.revisao })
    : SGO_DocA4_css_();
  const proprio = [
    '.abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin:0 0 6mm}',
    '.abertura img{height:13mm;width:auto;display:block}',
    '.abertura .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}',
    'ol.passos{margin:0 0 2.4mm 6mm;padding:0 0 0 2mm}',
    'ol.passos li{margin:0 0 1.2mm;padding-left:1mm;text-align:justify;hyphens:auto}',
    'p.termo{margin:0 0 1.6mm}',
    'p.termo b{color:#243b53}',
    '.figuras figure{margin:2mm 0 5mm}',
    '.figuras .q{border:.5pt solid #bcc5cf;background:#fafbfc;display:flex;align-items:center;justify-content:center;height:78mm}',
    '.figuras .q img{max-width:100%;max-height:78mm;display:block}',
    '.figuras .interp{font-size:8.6pt;color:#3e4c59;margin:1mm 0 0}',
    '.assinaturas.quatro .assinatura{flex:1 1 70mm}',
    '.assinatura .papel{font-size:7.8pt;color:#52606d;margin:0 0 .6mm;text-transform:none}',
    '.reltec-fecho .assinaturas{margin-top:4mm}',
    '.capa .base{margin-top:5mm;font-size:9pt;color:#3e4c59;text-align:left}'
  ].join('');
  return docA4 + proprio + RelTecA4_css_({ titulo: o.titulo, numero: o.numero, revisao: o.revisao });
}

function PgtPopDoc_logo_() {
  try { if (typeof SGO_DocA4_logoDataUri_ === 'function') return SGO_DocA4_logoDataUri_(); } catch (e) { /* reserva */ }
  return PgtPop_getLogoDataUri_();
}

/** Bloco de assinatura no padrão SGO_DocA4, com o papel (Elaborado por...) em cima. */
function PgtPopDoc_assinatura_(papel, pessoa) {
  const esc = PgtPop_escaparHtml_;
  const p = pessoa || {};
  const img = (p.imagemSvg && /^\s*<svg[\s>]/i.test(p.imagemSvg)) ? p.imagemSvg : '';
  return '<div class="assinatura"><div class="papel">' + esc(papel) + '</div><div class="img">' + img + '</div>' +
    '<div class="linha">' + esc(p.nome || ' ') + '</div>' +
    '<div class="cargo">' + [p.cargo, p.registro].filter(Boolean).map(esc).join('<br>') + '</div></div>';
}

/**
 * Monta o documento (PGT ou POP) no padrão de controle de documento da Metrolabs
 * (código, revisão, histórico, 4 assinaturas — Elaborado por [variável, sem rubrica],
 * Revisado por [fixo, com rubrica], Aprovado pela Metrolabs [fixo, com rubrica] e Aprovado
 * pelo responsável técnico do hospital [variável, sem rubrica]) + o corpo gerado pela IA
 * (ou o texto padrão do POP com roteiro) + figuras, quando houver imagens anexadas.
 * @param {object} dados { tipo, titulo, textoGerado, hospital, roteiro, pop, codigoDocumento,
 *   versaoAtual, historico, imagens, elaboradoPorNome/Cargo/Registro }
 */
function PgtPop_montarDocumentoHtml_(dados) {
  dados = dados || {};
  const esc = PgtPop_escaparHtml_;
  const hospital = dados.hospital || {};
  const tipo = dados.tipo === 'POP' ? 'POP' : 'PGT';
  const historico = dados.historico || [];
  // "Data desta revisão" é a data em que ESTA revisão foi emitida (registrada no histórico),
  // não a data em que o documento é reaberto.
  const entradaRevisao = historico.filter(function (h) { return String(h && h.versao) === String(dados.versaoAtual || 1); }).pop() || historico[historico.length - 1];
  const dataRevisao = (entradaRevisao && entradaRevisao.data) ? String(entradaRevisao.data) : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  const revisao = String(dados.versaoAtual || 1) + '.0';
  const codigo = String(dados.codigoDocumento || '').trim();
  const imagens = (dados.imagens || []).filter(function (im) { return im && im.base64; });
  // Nome/cargo/registro de "Elaborado por" são do formulário; cargo e registro nunca herdam
  // o registro profissional fixo de outra pessoa (achado real de 2026-08-13).
  const elaborado = {
    nome: dados.elaboradoPorNome || PGTPOP_CFG.ENGENHEIRO_ELABORADO.nome,
    cargo: dados.elaboradoPorCargo || PGTPOP_CFG.ENGENHEIRO_ELABORADO.cargo,
    registro: dados.elaboradoPorRegistro || PGTPOP_CFG.ENGENHEIRO_ELABORADO.registro
  };
  const revisado = PGTPOP_CFG.ENGENHEIRO_REVISADO;
  const aprovadorMetrolabs = PGTPOP_CFG.APROVADOR_METROLABS;

  // Título: "Plano ... (PGTS) — Hospital" → título + subtítulo com a instituição
  const tituloBruto = String(dados.titulo || (tipo === 'PGT' ? 'Plano de Gerenciamento de Tecnologias em Saúde (PGTS)' : ((dados.pop && dados.pop.nome) || 'Procedimento operacional padrão'))).trim();
  const tituloDoc = tituloBruto.split(/\s+—\s+/)[0];
  const tituloCurto = tipo === 'PGT' ? 'Plano de Gerenciamento de Tecnologias em Saúde' : 'Procedimento operacional padrão';
  const subtitulo = (tipo === 'PGT' ? '' : 'Procedimento operacional padrão' + (codigo ? ' ' + codigo : '') + ' — ') + (hospital.razaoSocial || '');
  const secoes = PgtPopDoc_secoes_(dados.textoGerado);
  const comCapa = tipo === 'PGT';
  const numDoc = codigo || (tipo === 'POP' ? 'POP' : 'PGTS');

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  html.push('<title>' + esc(numDoc) + ' — ' + esc(tituloDoc) + '</title>');
  html.push('<style>' + PgtPop_getCss_({ titulo: tituloCurto, numero: numDoc, revisao: revisao }) + '</style></head><body>');
  html.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  html.push('<main class="folha">');

  const ficha = [['Código', codigo || '—'], ['Revisão', revisao], ['Data desta revisão', dataRevisao]]; // quem elaborou fica nas assinaturas
  if (comCapa) {
    html.push('<section class="capa"><div class="logo"><img src="' + PgtPopDoc_logo_() + '" alt="Metrolabs"></div>' +
      '<div class="meio"><p class="tipo">Engenharia clínica</p><h1>' + esc(tituloDoc) + '</h1>' +
      (hospital.razaoSocial ? '<p class="sub">' + esc(hospital.razaoSocial) + '</p>' : '') +
      '<table class="t ident ficha"><tbody>' + ficha.map(function (l) { return '<tr><th>' + esc(l[0]) + '</th><td>' + esc(l[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="base">' + esc(PGTPOP_CFG.BASE_NORMATIVA_EXTENSO || PGTPOP_CFG.BASE_NORMATIVA) + '</p></div>' +
      '<div class="pe"><p>' + esc(RelTecA4_empresa_()) + '</p><p>' + esc(numDoc + ' · Revisão ' + revisao) + '</p></div></section>');
  } else {
    html.push('<header class="abertura"><img src="' + PgtPopDoc_logo_() + '" alt="Metrolabs"><div class="meta">' + esc(tituloCurto) + '<br>Nº ' + esc(numDoc) + ' · Revisão ' + esc(revisao) + '</div></header>');
    html.push('<h1>' + esc(tituloDoc) + '</h1>');
    html.push('<p class="subtitulo">' + esc(subtitulo) + '</p>');
    html.push(SGO_DocA4_tabelaIdent_(ficha, 'ficha'));
  }
  // PGT: sumário sempre (documento longo). POP: só se passar de 3 páginas (PgtPopDoc_sumarioSeLongo_).
  html.push(tipo === 'PGT' ? SGO_DocA4_marcadorSumario_() : '<!--sgo-sumario-->');

  let n = 0;
  // 1. Identificação
  n++;
  const ident = [['Instituição', hospital.razaoSocial || '—', { largo: true }], ['CNPJ', hospital.cnpj || '—'], ['Tipo de documento', tipo === 'PGT' ? 'Plano de Gerenciamento de Tecnologias em Saúde (PGTS)' : 'Procedimento Operacional Padrão (POP)'],
    ['Endereço', PgtPop_montarEnderecoDoc_(hospital) || '—', { largo: true }]];
  if (hospital.porte) ident.push(['Porte / tipo', hospital.porte]);
  if (hospital.leitos) ident.push(['Leitos', hospital.leitos]);
  if (!comCapa) ident.push(['Base normativa', String(PGTPOP_CFG.BASE_NORMATIVA || '').replace(/^Conforme /, ''), { largo: true }]); // no PGT ela está na capa
  html.push('<section><h2>' + n + '. Identificação</h2>' + SGO_DocA4_tabelaIdent_(ident) + '</section>');

  // 2. Controle de revisões (Tabela 1)
  n++;
  html.push('<section><h2>' + n + '. Controle de revisões</h2>');
  html.push(SGO_DocA4_legendaTabela_(1, 'Histórico de revisões'));
  html.push(SGO_DocA4_tabela_([{ t: 'Revisão', cls: 'num' }, { t: 'Descrição' }, { t: 'Data' }],
    (historico.length ? historico : [{ versao: dados.versaoAtual || 1, descricao: 'Emissão inicial', data: dataRevisao }]).map(function (h) {
      return [String(h.versao || '') + (String(h.versao || '').indexOf('.') < 0 ? '.0' : ''), h.descricao || '—', h.data || '—'];
    })));
  html.push('</section>');

  // 3... Corpo (IA ou texto padrão do POP com roteiro)
  const corpo = PgtPopDoc_secoesHtml_(secoes, n);
  html.push(corpo.html);
  n = corpo.ultimo;

  if (imagens.length) {
    n++;
    html.push('<section><h2>' + n + '. Registros fotográficos</h2><div class="figuras">');
    imagens.forEach(function (img, i) {
      const mimeSeguro = /^image\/[a-z0-9.+-]+$/i.test(String(img.mimeType || '')) ? img.mimeType : 'image/jpeg';
      html.push('<figure><div class="q"><img src="data:' + mimeSeguro + ';base64,' + String(img.base64 || '').replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Figura ' + (i + 1) + '"></div>' +
        '<figcaption><b>Figura ' + (i + 1) + '</b>' + (img.legenda ? ' — ' + esc(img.legenda) : '') + '</figcaption>' +
        (img.interpretacao ? '<p class="interp">' + esc(img.interpretacao) + '</p>' : '') + '</figure>');
    });
    html.push('</div></section>');
  }

  // Aprovação: parágrafo e as quatro assinaturas na mesma folha
  n++;
  html.push('<section class="reltec-fecho"><h2>' + n + '. Aprovação</h2>');
  html.push('<p>Esta revisão (' + esc(revisao) + ', de ' + esc(dataRevisao) + ') entra em vigor na data da aprovação pelo responsável técnico da instituição e substitui as revisões anteriores listadas na Tabela 1.</p>');
  html.push('<div class="assinaturas quatro">' +
    PgtPopDoc_assinatura_('Elaborado por', elaborado) +
    PgtPopDoc_assinatura_('Revisado por', revisado) +
    PgtPopDoc_assinatura_('Aprovado por (Metrolabs)', aprovadorMetrolabs) +
    PgtPopDoc_assinatura_('Aprovado por (responsável técnico da instituição)', { nome: hospital.aprovadorNome || '', cargo: hospital.aprovadorCargo || '' }) +
    '</div>');
  html.push('</section>');

  html.push('</main></body></html>');
  return html.join('\n');
}

/** Monta o HTML para a tela. Com sumário, os números de página já vêm preenchidos (duas passagens). */
function PgtPop_apiMontarDocumentoFinal(dados) {
  try {
    let html = PgtPopDoc_sumarioSeLongo_(PgtPop_montarDocumentoHtml_(dados || {}), 'POP');
    if (/data-sgo-sumario><\/nav>/.test(html)) {
      const pag = RelTecA4_paginar_(html, 'PGT e POP');
      if (pag && pag.html) html = pag.html;
    }
    return { ok: true, html: html };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }
}


/**
 * Sumário só quando o documento passa de 3 páginas (padrão A4, item 3): converte uma vez
 * para contar as folhas; se passar, põe o sumário no lugar do marcador e pagina (duas
 * passagens). Sem conversor de PDF (ou se falhar), sai sem sumário. Nunca lança.
 */
function PgtPopDoc_sumarioSeLongo_(html, nome) {
  const marca = '<!--sgo-sumario-->';
  const h = String(html || '');
  if (h.indexOf(marca) < 0) return h;
  try {
    if (typeof SGO_DocA4_pdfDeHtml_ === 'function' && typeof SGO_DocA4_paginasDoPdf_ === 'function') {
      const total = (SGO_DocA4_paginasDoPdf_(SGO_DocA4_pdfDeHtml_(h.replace(marca, ''), nome)) || {})._total || 0;
      if (total > 3) {
        const pag = RelTecA4_paginar_(h.replace(marca, SGO_DocA4_marcadorSumario_()), nome);
        if (pag && pag.html) return pag.html;
      }
    }
  } catch (e) { /* segue sem sumário */ }
  return h.replace(marca, '');
}

/**
 * Nome do arquivo no padrão A4: "<PGT|POP> - <código> rev <n.0> - <identificador> - <aaaa-MM-dd HHmm>".
 * Identificador: nome do POP; no PGT, a instituição.
 */
function PgtPop_nomeArquivo_(registro) {
  const tipo = registro.tipo === 'POP' ? 'POP' : 'PGT';
  const codigo = String(registro.codigoDocumento || '').trim() || (tipo === 'POP' ? 'avulso' : 'PGTS');
  const ident = tipo === 'POP' ? ((registro.pop && registro.pop.nome) || registro.titulo || 'POP') : ((registro.hospital && registro.hospital.razaoSocial) || 'Instituicao');
  return tipo + ' - ' + codigo + ' rev ' + String(registro.versaoAtual || 1) + '.0 - ' + String(ident).substring(0, 60).trim() + ' - ' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HHmm");
}

/** Arquivo já salvo para este registro (gravação automática ou "Salvar" anterior), ou null. */
function PgtPop_documentoJaSalvo_(registroId) {
  if (!registroId) return null;
  try {
    const aba = PgtPop_getDB_().getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.DOCUMENTOS);
    const dados = aba.getDataRange().getValues();
    for (let i = dados.length - 1; i >= 1; i--) {
      if (String(dados[i][7] || '') === String(registroId) && dados[i][6]) {
        const r = { url: String(dados[i][6]), fileName: String(dados[i][5] || ''), htmlUrl: '', htmlId: '' };
        try {
          const id = SGO_DocSalvar_idDaUrl_(r.url);
          const pais = id ? DriveApp.getFileById(id).getParents() : null;
          if (pais && pais.hasNext()) {
            const pasta = pais.next();
            r.pastaUrl = pasta.getUrl();
            const it = pasta.getFilesByName(r.fileName.replace(/\.pdf$/i, '') + '.html');
            if (it.hasNext()) { const h = it.next(); r.htmlUrl = h.getUrl(); r.htmlId = h.getId(); }
          }
        } catch (eH) { /* só o PDF */ }
        return r;
      }
    }
  } catch (e) { /* sem registro: salva de novo */ }
  return null;
}

/**
 * Grava HTML + PDF na pasta do CNPJ e registra na planilha (MOV_DOCUMENTOS). Usado pela
 * gravação automática (PgtPop_salvarPdfAutomatico_) e pelo "Salvar" manual. Lança erro.
 */
function PgtPop_gravarNaPasta_(registro, html) {
  const hospital = registro.hospital || {};
  const pasta = PgtPop_obterPastaPorCnpj_(hospital.cnpj || '', hospital.razaoSocial || '');
  const salvo = SGO_DocSalvar_salvarHtmlEPdf_(pasta, PgtPop_nomeArquivo_(registro), html, { compartilhar: true });
  const arquivo = DriveApp.getFileById(salvo.pdfId);
  PgtPop_registrarDocumento_({ hospital: hospital.razaoSocial || '', cnpj: hospital.cnpj || '', registroId: registro.registroId || '' }, arquivo, registro.tipo === 'POP' ? 'POP' : 'PGT');
  return { url: salvo.pdfUrl, pdfId: salvo.pdfId, fileName: salvo.pdfNome, htmlId: salvo.htmlId, htmlUrl: salvo.htmlUrl, pastaUrl: pasta.getUrl(), html: salvo.html };
}

/**
 * "Salvar na pasta do cliente" (botão). Se este registro já foi gravado (a geração grava
 * sozinha), devolve o arquivo existente em vez de criar um segundo PDF com o mesmo nome.
 */
function PgtPop_apiSalvarDocumento(payload) {
  try {
    payload = payload || {};
    const html = String(payload.html || "");
    if (!html) throw new Error("Nenhum conteúdo de documento recebido para salvar.");
    const existente = PgtPop_documentoJaSalvo_(payload.registroId);
    if (existente) {
      existente.ok = true;
      existente.jaSalvo = true;
      existente.mensagem = 'Este documento já estava salvo na pasta do cliente (' + existente.fileName + '). Nenhuma cópia nova foi criada.';
      return existente;
    }
    const registro = {
      tipo: String(payload.tipo || 'PGT').toUpperCase() === 'POP' ? 'POP' : 'PGT',
      hospital: { razaoSocial: payload.hospital || '', cnpj: payload.cnpj || '' },
      codigoDocumento: payload.codigoDocumento || '',
      versaoAtual: payload.versaoAtual || 1,
      pop: payload.pop || { nome: payload.titulo || '' },
      titulo: payload.titulo || '',
      registroId: payload.registroId || ''
    };
    const r = PgtPop_gravarNaPasta_(registro, html);
    return { ok: true, url: r.url, fileName: r.fileName, htmlId: r.htmlId, htmlUrl: r.htmlUrl, pastaUrl: r.pastaUrl };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o documento na pasta do cliente: " + e.message };
  }
}

/**
 * Pasta do Drive PARA ESTE HOSPITAL, chaveada pelo CNPJ (dígitos, sem
 * máscara) — não pelo nome digitado, que pode variar entre gerações
 * (maiúsculas, espaços, pequenas diferenças de digitação). Nome do
 * hospital vira só a descrição da pasta, pra navegação manual no
 * Drive ficar legível. (v14, 2026-08-14 — pedido do usuário: pasta por
 * CNPJ com todos os PDFs juntos, pra "consultar documentos já gerados"
 * virar simplesmente listar os arquivos da pasta, sem reconstruir nada
 * via servidor toda vez que abrir um documento antigo.)
 */
function PgtPop_obterPastaPorCnpj_(cnpj, nomeHospital) {
  const props = PropertiesService.getScriptProperties();
  let pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");
  if (!pastaPdfId) {
    PgtPop_setupModulo();
    pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");
  }
  const pastaPdf = DriveApp.getFolderById(pastaPdfId);
  const cnpjLimpo = PgtPop_normalizarCnpj_(cnpj) || PgtPop_sanitizarNomeArquivo_(nomeHospital || "SEM_CNPJ");
  const existentes = pastaPdf.getFoldersByName(cnpjLimpo);
  if (existentes.hasNext()) return existentes.next();
  const nova = pastaPdf.createFolder(cnpjLimpo);
  if (nomeHospital) {
    try { nova.setDescription(String(nomeHospital).substring(0, 500)); } catch (e) {}
  }
  return nova;
}

/** Mesma pasta de PgtPop_obterPastaPorCnpj_, mas NUNCA cria — usada só pra consulta (retorna null se não existir ainda). */
function PgtPop_obterPastaPorCnpjSeExistir_(cnpjNormalizado) {
  const props = PropertiesService.getScriptProperties();
  const pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");
  if (!pastaPdfId) return null;
  const pastaPdf = DriveApp.getFolderById(pastaPdfId);
  const it = pastaPdf.getFoldersByName(cnpjNormalizado);
  return it.hasNext() ? it.next() : null;
}

function PgtPop_registrarDocumento_(dados, arquivo, tipoDocumento) {
  const db = PgtPop_getDB_();
  const aba = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.DOCUMENTOS);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    PgtPop_gerarId_(),
    agora,
    dados.hospital || "",
    dados.cnpj || "",
    tipoDocumento || "DOCUMENTO",
    arquivo.getName(),
    arquivo.getUrl(),
    dados.registroId || ""
  ]);
}

/**
 * Grava HTML + PDF na pasta do CNPJ assim que o documento é gerado (com sumário paginado,
 * via SGO_DocSalvar_salvarHtmlEPdf_). Nunca lança: se falhar, o documento já está na planilha.
 */
function PgtPop_salvarPdfAutomatico_(registro) {
  try {
    return PgtPop_gravarNaPasta_(registro, PgtPopDoc_sumarioSeLongo_(PgtPop_montarDocumentoHtml_(registro), registro.tipo || 'PGT'));
  } catch (e) {
    return { url: '', fileName: '', erro: e.message };
  }
}

/**
 * Lista os PDFs já salvos na pasta de um CNPJ — usado por "Consultar
 * documentos já gerados" no lugar de reconstruir cada documento via
 * apiObterDocumentoPorId/apiMontarDocumentoFinal (fluxo antigo, trocado
 * a pedido do usuário em 2026-08-14 por ser frágil demais). Resposta
 * sempre com campos simples (strings) — nada de objeto Date cru ou
 * estrutura aninhada, pra não repetir o bug de payload que quebrava o
 * canal do google.script.run.
 */
function PgtPop_apiListarArquivosPdf(payload) {
  payload = payload || {};
  const cnpjBusca = PgtPop_normalizarCnpj_(payload.cnpj);
  if (!cnpjBusca) {
    return { ok: false, mensagem: "Informe um CNPJ pra consultar." };
  }
  try {
    const pasta = PgtPop_obterPastaPorCnpjSeExistir_(cnpjBusca);
    if (!pasta) {
      return { ok: true, arquivos: [] };
    }
    const arquivos = [];
    const it = pasta.getFilesByType(MimeType.PDF);
    while (it.hasNext()) {
      const f = it.next();
      arquivos.push({
        nome: f.getName(),
        url: f.getUrl(),
        data: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
      });
    }
    arquivos.sort(function (a, b) { return a.nome < b.nome ? -1 : (a.nome > b.nome ? 1 : 0); });
    return { ok: true, arquivos: arquivos, pastaUrl: pasta.getUrl() };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao listar arquivos: " + e.message };
  }
}

function PgtPop_getLogoDataUri_() {
  // Fase 2 (16/10): no servidor próprio não há Drive do Google; usa a mesma logo embutida do
  // Certificado de calibração (CadeiaFrioRel_CFCFG.LOGO_BASE64). O ID do Drive fica como reserva.
  try {
    const cfgLogo = typeof CadeiaFrioRel_CFCFG !== "undefined" ? CadeiaFrioRel_CFCFG.LOGO_BASE64 : null;
    if (cfgLogo && cfgLogo.data) return "data:" + (cfgLogo.mimeType || "image/png") + ";base64," + cfgLogo.data;
  } catch (e) { /* segue para o Drive */ }
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("PGTPOP_LOGO_ID") || PGTPOP_CFG.LOGO_ID;
    const blob = DriveApp.getFileById(logoId).getBlob();
    const contentType = blob.getContentType();
    const bytes = blob.getBytes();
    const base64 = Utilities.base64Encode(bytes);
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function PgtPop_sanitizarNomeArquivo_(texto) {
  return String(texto || "ARQUIVO")
    .replace(/[\\\/:*?\"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

function PgtPop_montarEnderecoDoc_(hospital) {
  const partes = [];
  if (hospital && hospital.logradouro) partes.push(hospital.logradouro);
  if (hospital && hospital.bairro) partes.push(hospital.bairro);

  let cidadeUf = "";
  if (hospital && hospital.cidade) cidadeUf += hospital.cidade;
  if (hospital && hospital.uf) cidadeUf += (cidadeUf ? "/" : "") + hospital.uf;
  if (cidadeUf) partes.push(cidadeUf);

  return partes.join(" - ");
}

/** "Nome — Cargo (Registro)", omitindo cargo/registro quando vazios (nunca imprime "()"). */
function PgtPop_formatarAssinatura_(pessoa) {
  var partes = [PgtPop_escaparHtml_(pessoa.nome || '—')];
  if (pessoa.cargo) partes.push('— ' + PgtPop_escaparHtml_(pessoa.cargo));
  if (pessoa.registro) partes.push('(' + PgtPop_escaparHtml_(pessoa.registro) + ')');
  return partes.join(' ');
}

/** Bloco de assinatura completo (rubrica SVG, quando a pessoa tiver uma cadastrada, + nome/cargo/registro). */
function PgtPop_montarBlocoAssinatura_(papel, pessoa) {
  var classe = 'assinatura-pop-item' + (pessoa && pessoa.imagemSvg ? ' com-assinatura' : '');
  var svg = (pessoa && pessoa.imagemSvg) ? ('<div class="assinatura-pop-svg">' + pessoa.imagemSvg + '</div>') : '';
  return '<div class="' + classe + '">' + svg + '<div class="assinatura-pop-linha"><div class="papel">' + PgtPop_escaparHtml_(papel) + '</div>' + PgtPop_formatarAssinatura_(pessoa || {}) + '</div></div>';
}

function PgtPop_escaparHtml_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
