/****************************************************
 * "Preencher modelo" — Lavadoras (lavadora ultrassônica e termodesinfectora).
 *
 * Fase 2 (16/10): gerado pelo próprio SGO+, com o motor comum SGO_TPLMODELO
 * (SGO_TemplateAutoclave.js): modelo oficial do armazenamento do SGO+ quando
 * existir; senão, folha de identificação no modelo padrão do SGO+ (HTML A4 +
 * PDF) na pasta do cliente, com o aviso do motivo. O aplicativo antigo do
 * Google só é usado se o modelo existir e o preenchimento direto não estiver
 * disponível no ambiente.
 *
 * A tela envia os mesmos campos para os dois tipos de equipamento:
 * { tipo, numeroRelatorio, dataCiclo, cliente, cnpj, setorLocal, equipamento,
 *   tag, marca, modelo, ns, tipoEnsaio, perfil, resultado, observacoes }
 ****************************************************/
var SGO_TEMPLATE_LAVADORA = (function () {
  function T() { return SGO_TPLMODELO; } // carregado em SGO_TemplateAutoclave.js (lido só na hora do uso)

  var TIPOS = {
    LAVADORA: {
      nome: 'Lavadora ultrassônica',
      modeloId: '1tMsIsW5Ng6Mz0KSC5s8ujYyWHi1tWqaio13RHbdSctc',
      pastaId: '1BOKYbVvsuvZYxw56pK-xoi21BG5oOycE',
      sufixo: 'LAVADORA_ULTRASSONICA',
      prop: 'LAVADORA'
    },
    TERMODESINFECTORA: {
      nome: 'Termodesinfectora',
      modeloId: '1nnUGRulKtf9C_rgp_4dnws43YXG5pTg4QOKIBH1wNds',
      pastaId: '18NFqpFosi7mHOwvNxX4grfSM5SDlL9kL',
      sufixo: 'TERMODESINFECTORA',
      prop: 'TERMO'
    }
  };

  function normalizar(payload) {
    payload = payload || {};
    var t = T().txt;
    var tipo = t(payload.tipo).toUpperCase();
    return {
      tipo: TIPOS[tipo] ? tipo : '',
      numero: t(payload.numeroRelatorio), data: t(payload.dataCiclo), cliente: t(payload.cliente), cnpj: t(payload.cnpj),
      setorLocal: t(payload.setorLocal), equipamento: t(payload.equipamento), tag: t(payload.tag),
      marca: t(payload.marca), modelo: t(payload.modelo), ns: t(payload.ns),
      tipoEnsaio: t(payload.tipoEnsaio), perfil: t(payload.perfil),
      resultado: t(payload.resultado).toUpperCase(), observacoes: t(payload.observacoes)
    };
  }

  function validar(d) {
    if (!d.tipo) return 'Escolha o tipo de equipamento: lavadora ultrassônica ou termodesinfectora.';
    var faltam = [];
    if (!d.numero) faltam.push('Número do relatório');
    if (!d.data) faltam.push('Data do ciclo');
    if (!d.cliente) faltam.push('Cliente');
    if (!d.setorLocal) faltam.push('Setor / local');
    if (!d.tag) faltam.push('TAG');
    if (!d.marca) faltam.push('Marca');
    if (!d.modelo) faltam.push('Modelo');
    if (!d.ns) faltam.push('Número de série');
    if (!d.tipoEnsaio) faltam.push('Tipo de ensaio');
    if (faltam.length) return 'Preencha: ' + faltam.join(', ') + '.';
    if (!T().dataValida(d.data)) return 'Data do ciclo inválida: use dia/mês/ano, por exemplo 20/03/2026.';
    if (['APROVADO', 'REPROVADO'].indexOf(d.resultado) < 0) return 'Escolha o resultado: Aprovado ou Reprovado.';
    return '';
  }

  function identificacao(d) {
    return [d.marca, d.modelo, d.ns ? 'NS ' + d.ns : ''].filter(Boolean).join(' / ');
  }

  /** Payload no formato do aplicativo antigo (só usado como reserva). */
  function payloadAntigo(d) {
    if (d.tipo === 'TERMODESINFECTORA') {
      return { tipo: d.tipo, numeroRelatorio: d.numero, dataCiclo: d.data, cliente: d.cliente, cnpjCliente: d.cnpj, tag: d.tag, marca: d.marca, modelo: d.modelo, ns: d.ns, localizacao: d.setorLocal, statusFinal: d.resultado };
    }
    return { tipo: d.tipo, numeroRelatorio: d.numero, cliente: d.cliente, equipamento: d.equipamento || TIPOS.LAVADORA.nome, tag: d.tag, identificacao: identificacao(d), tipoEnsaio: d.tipoEnsaio, perfil: d.perfil || '—', cnpj: d.cnpj || '—', setorLocal: d.setorLocal, observacoes: d.observacoes || '—', dataCiclo: d.data };
  }

  function chamarProxy_(corpo) {
    var url = SGO_CFG.MOTORES && SGO_CFG.MOTORES.LAVADORA_TEMPLATE;
    if (!url) return { ok: false, erro: 'endereço do aplicativo antigo não configurado' };
    var resposta = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(corpo), muteHttpExceptions: true });
    return JSON.parse(resposta.getContentText());
  }

  function definicao(d) {
    var cfg = TIPOS[d.tipo] || TIPOS.LAVADORA;
    var s = T().sanitizarNomeArquivo;
    var mapa;
    if (d.tipo === 'TERMODESINFECTORA') {
      mapa = {
        '{{NUMERO_RELATORIO}}': d.numero, '{{DATA_CICLO}}': d.data, '{{CLIENTE}}': d.cliente, '{{CNPJ_CLIENTE}}': T().cnpjFormatado(d.cnpj),
        '{{TAG}}': d.tag, '{{MARCA}}': d.marca, '{{MODELO}}': d.modelo, '{{NS}}': d.ns, '{{LOCALIZACAO}}': d.setorLocal, '{{STATUS_FINAL}}': d.resultado
      };
    } else {
      mapa = {
        '{{NUMERO_RELATORIO}}': d.numero, '{{CLIENTE}}': d.cliente, '{{EQUIPAMENTO}}': d.equipamento || cfg.nome, '{{TAG}}': d.tag,
        '{{IDENTIFICACAO}}': identificacao(d), '{{TIPO_ENSAIO}}': d.tipoEnsaio, '{{PERFIL}}': d.perfil || '—', '{{CNPJ}}': T().cnpjFormatado(d.cnpj) || '—',
        '{{SETOR_LOCAL}}': d.setorLocal, '{{OBSERVACOES}}': d.observacoes || '—', '{{DATA_CICLO}}': d.data
      };
    }
    return {
      titulo: 'Relatório de qualificação — ' + cfg.nome,
      nomeArquivo: ['RELATORIO', cfg.sufixo, s(d.numero), s(d.cliente), s(d.data)].filter(Boolean).join('_'),
      modeloId: cfg.modeloId, propModelo: 'TPL_' + cfg.prop + '_MODELO_ID',
      pastaId: cfg.pastaId, propPasta: 'TPL_' + cfg.prop + '_PASTA_ID', propPastaCriada: 'TPL_' + cfg.prop + '_PASTA_CRIADA',
      nomePasta: 'Relatórios de ' + cfg.nome.toLowerCase() + ' (modelo)',
      mapa: mapa,
      linhas: [
        ['Número do relatório', d.numero],
        ['Data do ciclo', d.data],
        ['Cliente', d.cliente],
        ['CNPJ', T().cnpjFormatado(d.cnpj)],
        ['Setor / local', d.setorLocal],
        ['Tipo de equipamento', cfg.nome],
        ['Equipamento', d.equipamento],
        ['TAG', d.tag],
        ['Marca', d.marca],
        ['Modelo', d.modelo],
        ['Número de série', d.ns],
        ['Tipo de ensaio', d.tipoEnsaio],
        ['Perfil da carga', d.perfil]
      ],
      proxy: function () { return chamarProxy_({ action: 'gerarRelatorio', payload: payloadAntigo(d) }); }
    };
  }

  function gerarRelatorio(payload) {
    var d = normalizar(payload);
    var erro = validar(d);
    if (erro) return { ok: false, erro: erro };
    var r = T().gerar(definicao(d), d);
    r.tipo = d.tipo;
    return r;
  }

  function situacaoModelo(tipo) {
    var d = normalizar({ tipo: tipo || 'LAVADORA' });
    if (!d.tipo) d.tipo = 'LAVADORA';
    return T().situacao(definicao(d));
  }

  return { gerarRelatorio: gerarRelatorio, situacaoModelo: situacaoModelo };
})();

/* =========================
   CHAMADAS DA TELA (google.script.run), com sessão obrigatória
========================= */
function tplLavadoraObterConfig(sessionId, tipo) {
  try {
    exigirSessao(String(sessionId || ''));
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_LAVADORA.situacaoModelo(tipo)));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('conferir o modelo do relatório', e) };
  }
}

/** Mantida para telas antigas abertas: devolve a situação do modelo. */
function tplLavadoraObterPlaceholders(sessionId, tipo) {
  return tplLavadoraObterConfig(sessionId, tipo);
}

function tplLavadoraGerarRelatorio(sessionId, payload) {
  try {
    exigirSessao(String(typeof sessionId === 'string' ? sessionId : '')); // tela antiga sem sessão recebe o aviso de login
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_LAVADORA.gerarRelatorio(payload)));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('gerar o relatório pelo modelo', e) };
  }
}
