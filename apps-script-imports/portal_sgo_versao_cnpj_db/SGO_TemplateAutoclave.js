/****************************************************
 * "Preencher modelo" — Autoclave (e o motor comum usado também pela Lavadora).
 *
 * Fase 2 (16/10): a geração passou a ser feita pelo próprio SGO+, sem depender
 * do aplicativo antigo do Google (que o SGO+ chamava por UrlFetch e que não
 * existe no servidor próprio). A ordem de tentativa é:
 *   1. Modelo oficial (documento-modelo com os campos {{...}}) lido do
 *      armazenamento do SGO+: copia, preenche, salva o documento e o PDF na
 *      pasta do cliente.
 *   2. Se o modelo existe, mas o preenchimento direto não está disponível neste
 *      ambiente (Google sem permissão de Documentos), usa o aplicativo antigo
 *      como antes.
 *   3. Sem o modelo oficial (ou se as opções acima falharem), gera a folha de
 *      identificação no modelo padrão do SGO+ (HTML A4 + PDF), na pasta do
 *      cliente, e avisa o operador do motivo e de como passar a usar o oficial.
 * Nenhuma função devolve Date: só strings.
 ****************************************************/

var SGO_TPLMODELO = (function () {
  function txt(v) { return String(v == null ? '' : v).trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function escRegex(t) { return String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function msg(e) { return String(e && e.message ? e.message : e).replace(/[.\s]+$/, ''); }

  function sanitizarNomeArquivo(valor) {
    return txt(valor)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /** dd/mm/aaaa válida? */
  function dataValida(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt(s));
    if (!m) return false;
    var d = Number(m[1]), mes = Number(m[2]), a = Number(m[3]);
    var dt = new Date(a, mes - 1, d);
    return dt.getFullYear() === a && dt.getMonth() === mes - 1 && dt.getDate() === d && a >= 2000 && a <= 2100;
  }

  function cnpjFormatado(c) {
    var d = txt(c).replace(/\D/g, '');
    return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : txt(c);
  }

  function propriedade(chave) {
    try { return txt(PropertiesService.getScriptProperties().getProperty(chave)); } catch (e) { return ''; }
  }

  function idModelo(def) { return propriedade(def.propModelo) || def.modeloId; }

  function lerModelo(def) {
    var id = idModelo(def);
    if (!id) return null;
    try {
      var f = DriveApp.getFileById(id);
      if (f && typeof f.isTrashed === 'function' && f.isTrashed()) return null;
      return f;
    } catch (e) { return null; }
  }

  function pastaBase(def) {
    var id = propriedade(def.propPasta) || def.pastaId;
    if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* cai na pasta própria */ } }
    return SGO_DocSalvar_pastaPersistente_(def.propPastaCriada, def.nomePasta, '');
  }

  function carimbo() {
    try { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); } catch (e) { return ''; }
  }

  /** Folha de identificação do relatório (modelo padrão do SGO+), no padrão comum SGO_DocA4. */
  function htmlPadrao(def, dados) {
    var resultado = txt(dados.resultado);
    var st = resultado === 'APROVADO' || resultado === 'REPROVADO' ? resultado : '';
    var empresa = null, assinaturas = [];
    try { if (typeof AutoRel_UCFG !== 'undefined') { empresa = AutoRel_UCFG.EMPRESA_EXECUTANTE; assinaturas = (AutoRel_UCFG.ASSINATURAS_PADRAO || []).slice(0, 1); } } catch (e) {}
    var data = carimbo();
    var h = SGO_DocA4_inicioDocumento_({
      titulo: def.titulo,
      subtitulo: 'Folha de identificação do relatório de qualificação. Os dados de medição, os critérios de aceitação e a análise do ensaio constam do relatório de dados e do relatório de ensaio emitidos para este equipamento.',
      tituloCurto: def.titulo,
      rotuloNumero: 'Relatório nº',
      numero: txt(dados.numero) || 'sem número',
      revisao: '0',
      empresa: empresa || undefined,
      ficha: [['Data do ciclo', txt(dados.data) || '—'], ['Emissão', data ? data.substring(0, 10) : '—']],
      resultado: st ? { status: st, rotulo: 'Resultado informado pelo técnico', texto: 'Resultado registrado no preenchimento do modelo; a fundamentação está no relatório de ensaio do mesmo ciclo.' } : null
    });
    h += '<h2>1. Identificação</h2>' + SGO_DocA4_tabelaIdent_(def.linhas.map(function (l) { return [l[0], txt(l[1]) || '—']; }));
    if (txt(dados.observacoes)) h += '<h2>2. Observações</h2>' + SGO_DocA4_paragrafos_(dados.observacoes);
    h += '<div class="manter"><h2>' + (txt(dados.observacoes) ? '3' : '2') + '. Responsabilidade técnica</h2>' +
      '<p>Documento gerado pelo SGO+ em ' + esc(data) + '. Esta folha identifica o relatório e não substitui o relatório de ensaio nem o relatório de dados do ciclo.</p>' +
      SGO_DocA4_assinaturas_(assinaturas.concat([{ nome: ' ', cargo: 'Responsável pelo aceite — cliente' }])) + '</div>';
    return h + SGO_DocA4_fimDocumento_();
  }

  function viaModeloOficial(def, dados, modelo, pasta, nome) {
    // Confere antes de copiar se este ambiente consegue abrir o documento-modelo
    // (sem a permissão de Documentos, não deixa uma cópia sem preencher na pasta).
    DocumentApp.openById(modelo.getId());
    var copia = modelo.makeCopy(nome, pasta);
    var doc = DocumentApp.openById(copia.getId());
    var body = doc.getBody();
    var mapa = def.mapa;
    Object.keys(mapa).forEach(function (chave) {
      body.replaceText(escRegex(chave), txt(mapa[chave]));
    });
    doc.saveAndClose();
    var pdfBlob = copia.getBlob().getAs(MimeType.PDF);
    pdfBlob.setName(nome + '.pdf');
    var pdf = pasta.createFile(pdfBlob);
    return { ok: true, modelo: 'OFICIAL', nomeArquivo: nome, docUrl: copia.getUrl(), pdfUrl: pdf.getUrl(), folderUrl: pasta.getUrl() };
  }

  /**
   * def: { titulo, nomeArquivo, modeloId, propModelo, pastaId, propPasta, propPastaCriada, nomePasta,
   *        mapa: { '{{CAMPO}}': valor }, linhas: [[rótulo, valor]], proxy: function () -> resposta do app antigo }
   * dados: { numero, data, cliente, cnpj, resultado, observacoes }
   */
  function gerar(def, dados) {
    var base = pastaBase(def);
    var pasta = SGO_DocSalvar_pastaClienteEm_(base, dados.cnpj, dados.cliente);
    var nome = def.nomeArquivo;
    var modelo = lerModelo(def);
    var motivo = '';
    if (modelo) {
      try {
        return viaModeloOficial(def, dados, modelo, pasta, nome);
      } catch (e1) {
        motivo = 'o preenchimento direto do modelo oficial falhou (' + msg(e1) + ')';
        if (typeof def.proxy === 'function') {
          try {
            var r = def.proxy();
            if (r && r.ok) { r.modelo = 'OFICIAL'; return r; }
            if (r && r.erro) motivo += '; o aplicativo antigo respondeu: ' + msg(r.erro);
          } catch (e2) { motivo += '; o aplicativo antigo não respondeu'; }
        }
      }
    } else {
      motivo = 'o modelo oficial do relatório não está no armazenamento do SGO+';
    }
    var html = htmlPadrao(def, dados);
    var s = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, html, {});
    return {
      ok: true, modelo: 'PADRAO', nomeArquivo: nome,
      docUrl: s.htmlUrl, pdfUrl: s.pdfUrl, folderUrl: pasta.getUrl(),
      aviso: 'Saiu a folha de identificação no modelo padrão do SGO+, porque ' + motivo + '. ' +
        'Para usar o modelo oficial, peça ao administrador para importar o documento-modelo.'
    };
  }

  function situacao(def) {
    var m = lerModelo(def);
    return {
      ok: true,
      modeloOficial: !!m,
      texto: m
        ? 'Modelo oficial disponível. O documento e o PDF serão gravados na pasta do cliente.'
        : 'O modelo oficial não está no armazenamento do SGO+. Ao gerar, sai a folha de identificação no modelo padrão do SGO+ (documento e PDF na pasta do cliente). Para usar o modelo oficial, peça ao administrador para importar o documento-modelo.'
    };
  }

  return { txt: txt, dataValida: dataValida, cnpjFormatado: cnpjFormatado, sanitizarNomeArquivo: sanitizarNomeArquivo, gerar: gerar, situacao: situacao, msg: msg };
})();

/****************************************************
 * AUTOCLAVE
 ****************************************************/
var SGO_TEMPLATE_AUTOCLAVE = (function () {
  var T = SGO_TPLMODELO;
  var MODELO_ID = '10yOcEVhCXO3lsmCIBHeF8yY_gVdpzVzxuSD9jZPdM04';
  var PASTA_ID = '1FiWs9EmnnOBnFNqmXYF2oF-8flfRDgiQ';

  function definicao(dados, payloadOriginal) {
    return {
      titulo: 'Relatório de qualificação térmica — Autoclave',
      nomeArquivo: ['RELATORIO', 'AUTOCLAVE', T.sanitizarNomeArquivo(dados.numero), T.sanitizarNomeArquivo(dados.cliente), T.sanitizarNomeArquivo(dados.data)].filter(Boolean).join('_'),
      modeloId: MODELO_ID, propModelo: 'TPL_AUTOCLAVE_MODELO_ID',
      pastaId: PASTA_ID, propPasta: 'TPL_AUTOCLAVE_PASTA_ID', propPastaCriada: 'TPL_AUTOCLAVE_PASTA_CRIADA', nomePasta: 'Relatórios de autoclave (modelo)',
      mapa: {
        '{{NUMERO_RELATORIO}}': dados.numero,
        '{{DATA_CICLO}}': dados.data,
        '{{CLIENTE}}': dados.cliente,
        '{{UNIDADE_LOCAL}}': dados.unidade,
        '{{EQUIPAMENTO}}': dados.equipamento,
        '{{MARCA_MODELO}}': dados.marcaModelo,
        '{{NUMERO_SERIE}}': dados.numeroSerie,
        '{{TAG}}': dados.tag,
        '{{APROVADO}}': dados.status
      },
      linhas: [
        ['Número do relatório', dados.numero],
        ['Data do ciclo', dados.data],
        ['Cliente', dados.cliente],
        ['CNPJ', T.cnpjFormatado(dados.cnpj)],
        ['Unidade / local', dados.unidade],
        ['Equipamento', dados.equipamento],
        ['Marca / modelo', dados.marcaModelo],
        ['Número de série', dados.numeroSerie],
        ['TAG', dados.tag]
      ],
      proxy: function () { return chamarProxy_('gerarRelatorio', payloadOriginal); }
    };
  }

  function chamarProxy_(action, payload) {
    var url = SGO_CFG.MOTORES && SGO_CFG.MOTORES.AUTOCLAVE_TEMPLATE;
    if (!url) return { ok: false, erro: 'endereço do aplicativo antigo não configurado' };
    var resposta = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ action: action, payload: payload || null }), muteHttpExceptions: true
    });
    return JSON.parse(resposta.getContentText());
  }

  function normalizar(payload) {
    payload = payload || {};
    return {
      numero: T.txt(payload.numero), data: T.txt(payload.data), cliente: T.txt(payload.cliente), cnpj: T.txt(payload.cnpj),
      unidade: T.txt(payload.unidade), equipamento: T.txt(payload.equipamento), marcaModelo: T.txt(payload.marcaModelo),
      numeroSerie: T.txt(payload.numeroSerie), tag: T.txt(payload.tag), status: T.txt(payload.status).toUpperCase(),
      resultado: T.txt(payload.status).toUpperCase()
    };
  }

  function validar(d) {
    var faltam = [];
    if (!d.numero) faltam.push('Número do relatório');
    if (!d.data) faltam.push('Data do ciclo');
    if (!d.cliente) faltam.push('Cliente');
    if (!d.unidade) faltam.push('Unidade / local');
    if (!d.equipamento) faltam.push('Equipamento');
    if (!d.marcaModelo) faltam.push('Marca / modelo');
    if (!d.numeroSerie) faltam.push('Número de série');
    if (!d.tag) faltam.push('TAG');
    if (faltam.length) return 'Preencha: ' + faltam.join(', ') + '.';
    if (!T.dataValida(d.data)) return 'Data do ciclo inválida: use dia/mês/ano, por exemplo 20/03/2026.';
    if (['APROVADO', 'REPROVADO'].indexOf(d.status) < 0) return 'Escolha o resultado: Aprovado ou Reprovado.';
    return '';
  }

  function gerarRelatorio(payload) {
    var d = normalizar(payload);
    var erro = validar(d);
    if (erro) return { ok: false, erro: erro };
    return T.gerar(definicao(d, payload), d);
  }

  function situacaoModelo() { return T.situacao(definicao(normalizar({}), {})); }

  return { gerarRelatorio: gerarRelatorio, situacaoModelo: situacaoModelo };
})();

/* =========================
   CHAMADAS DA TELA (google.script.run), com sessão obrigatória
========================= */
function tplAutoclaveObterConfig(sessionId) {
  try {
    exigirSessao(String(sessionId || ''));
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_AUTOCLAVE.situacaoModelo()));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('conferir o modelo do relatório', e) };
  }
}

/** Mantida para telas antigas abertas: devolve a situação do modelo (sem lista de campos técnicos). */
function tplAutoclaveObterPlaceholders(sessionId) {
  return tplAutoclaveObterConfig(sessionId);
}

function tplAutoclaveGerarRelatorio(sessionId, payload) {
  try {
    exigirSessao(String(typeof sessionId === 'string' ? sessionId : '')); // tela antiga sem sessão recebe o aviso de login
    // 20/10/2026: o modelo anterior foi desativado (SGO_AutoRel_ModeloOficialNovo.js); só gera se o Administrador o reativou.
    if (typeof AutoOficial_modelo_ === 'function' && AutoOficial_modelo_() !== 'ANTERIOR') {
      return { ok: false, erro: 'O modelo anterior do relatório oficial foi desativado. Atualize a página (F5): a aba "Relatório oficial" usa o modelo novo, com o cliente e o equipamento do cadastro e o resultado calculado dos relatórios de ensaio. Só o Administrador pode reativar o modelo anterior.' };
    }
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_AUTOCLAVE.gerarRelatorio(payload)));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('gerar o relatório pelo modelo', e) };
  }
}
