/**
 * INÍCIO — faixa "o que depende de você hoje" e busca rápida (Ctrl K).
 *
 * Pendências: lidas da central (SGO_Alertas_Central.js, SGO_Pendencias_listar) — a mesma fonte
 * do painel de alertas, do balão de padrões, da janela ao entrar, do Painel de qualidade e da
 * ponte com o COMMAND; aqui só vira cartão da faixa.
 * Busca: SGO_CLIENTES/SGO_EQUIPAMENTOS/SGO_DOCUMENTOS.pesquisar, que já aplicam a trava do cliente.
 * Devolve só texto (datas já formatadas) para o google.script.run.
 */

var INICIO_FUSO = 'America/Sao_Paulo';
var INICIO_BUSCA_LIMITE = 6;      // por grupo
var INICIO_BUSCA_TERMO_MAX = 80;

function Inicio_dataBr_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, INICIO_FUSO, 'dd/MM/yyyy');
  }
  var s = String(v).trim();
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  var br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? br[0] : '';
}

// ------------------------------------------------------------
// PENDÊNCIAS — 17/10/2026: lidas da central (SGO_Alertas_Central.js), a mesma fonte do
// painel de alertas, do balão de padrões, da janela ao entrar, do Painel de qualidade e da
// ponte com o COMMAND. Aqui só se converte cada grupo da central para o cartão da faixa.
// ------------------------------------------------------------
var INICIO_NIVEL = { CRITICO: 'critico', ATENCAO: 'atencao', INFO: 'info' };

function Inicio_cartaoDoGrupo_(g) {
  var nivel = INICIO_NIVEL[g.gravidade] || 'info';
  if (nivel === 'atencao' && g.rotulo === 'Revisar') nivel = 'revisar';
  return { nivel: nivel, rotulo: g.rotulo, titulo: g.titulo, detalhe: g.detalhe, oQueFazer: g.oQueFazer, qtd: g.qtd, tipo: g.tipo, modulo: g.modulo, acao: g.tela || null };
}

function Inicio_apiPendencias(sessionId) {
  try {
    var r = SGO_Pendencias_listar(sessionId, { limite: 400 });
    var cartoes = (r.grupos || []).map(Inicio_cartaoDoGrupo_);
    return JSON.parse(JSON.stringify({
      ok: true,
      total: r.resumo.total,           // pendências (não cartões): o mesmo número do Painel de qualidade e da janela ao entrar
      resumo: r.resumo,
      itens: cartoes,                  // cartões da faixa, um por tipo, do mais grave para o menos grave
      pendencias: r.itens,             // lista completa para "Ver todas"
      geradoEm: r.geradoEm,
      cortado: !!r.cortado,
      naoVerificado: r.naoVerificado || []
    }));
  } catch (e) {
    return { ok: false, message: 'Não foi possível verificar as pendências: ' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '. O restante do Início continua valendo; atualize a página para tentar de novo.' };
  }
}

// ------------------------------------------------------------
// BUSCA RÁPIDA
// ------------------------------------------------------------
function Inicio_apiBuscar(sessionId, termo) {
  try {
    var sessao = exigirSessao(sessionId);
    var ehCliente = SGO_UTILS.safeUpper(sessao.perfil) === 'CLIENTE';
    var q = String(termo || '').trim().slice(0, INICIO_BUSCA_TERMO_MAX);
    if (q.length < 2) return { ok: true, termo: q, grupos: [] };
    var ql = q.toLowerCase();
    var qDig = q.replace(/\D/g, '');
    var grupos = [];
    var falhas = [];

    function grupo(nome, lista, total) {
      if (lista.length) grupos.push({ grupo: nome, itens: lista.slice(0, INICIO_BUSCA_LIMITE), total: total });
    }
    // começa com o termo vem antes de "contém"
    function ordenarPor(lista, campo) {
      return lista.sort(function (a, b) {
        var pa = SGO_UTILS.safeLower(a[campo]).indexOf(ql) === 0 ? 0 : 1;
        var pb = SGO_UTILS.safeLower(b[campo]).indexOf(ql) === 0 ? 0 : 1;
        return pa - pb || SGO_UTILS.safe(a[campo]).localeCompare(SGO_UTILS.safe(b[campo]));
      });
    }

    // Equipamentos (TAG primeiro) — listar() já aplica a trava do cliente
    try {
      var re = SGO_EQUIPAMENTOS.pesquisar(sessionId, q);
      var eqs = ordenarPor((re && re.items) || [], 'TAG');
      grupo('Equipamentos', eqs.map(function (e) {
        return {
          titulo: [SGO_UTILS.safe(e.TAG), SGO_UTILS.safe(e.TIPO)].filter(Boolean).join(' · '),
          detalhe: [SGO_UTILS.safe(e.CLIENTE_NOME), SGO_UTILS.safe(e.UNIDADE_NOME)].filter(Boolean).join(' · '),
          acao: { tipo: 'equipamento', id: SGO_UTILS.safe(e.ID), termo: SGO_UTILS.safe(e.TAG) || q }
        };
      }), eqs.length);
    } catch (e1) { falhas.push('equipamentos'); }

    // Clientes (razão social, fantasia, CNPJ) — só para a equipe; o cliente já é ele mesmo
    if (!ehCliente) {
      try {
        var rc = SGO_CLIENTES.pesquisar(sessionId, q);
        var cls = ordenarPor((rc && rc.items) || [], 'RAZAO_SOCIAL');
        grupo('Clientes', cls.map(function (c) {
          var nome = SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL);
          var cnpj = SGO_UTILS.safe(c.CNPJ);
          try { if (cnpj && SGO_UTILS.formatCnpj) cnpj = SGO_UTILS.formatCnpj(cnpj) || cnpj; } catch (ig) {}
          return {
            titulo: nome,
            detalhe: [SGO_UTILS.safe(c.RAZAO_SOCIAL) !== nome ? SGO_UTILS.safe(c.RAZAO_SOCIAL) : '', cnpj, SGO_UTILS.safe(c.STATUS) && SGO_UTILS.safeUpper(c.STATUS) !== 'ATIVO' ? 'Inativo' : ''].filter(Boolean).join(' · '),
            acao: { tipo: 'cliente', id: SGO_UTILS.safe(c.ID), termo: SGO_UTILS.safe(c.RAZAO_SOCIAL) || nome }
          };
        }), cls.length);
      } catch (e2) { falhas.push('clientes'); }
    }

    // Certificados de calibração (número) — trava do cliente igual à consulta por CNPJ
    try {
      var ss = SGO_DATA.getDB();
      if (SGO_CFG.SHEETS.CERT_CALIBRACAO && ss.getSheetByName(SGO_CFG.SHEETS.CERT_CALIBRACAO)) {
        var clientesMapa = {};
        SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { clientesMapa[SGO_UTILS.safe(c.ID)] = c; });
        var equipMapa = {};
        SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { equipMapa[SGO_UTILS.safe(e.ID)] = e; });
        var certs = SGO_DATA.getAll(SGO_CFG.SHEETS.CERT_CALIBRACAO).filter(function (r) {
          if (SGO_UTILS.safeUpper(r.STATUS) !== 'ATIVO') return false;
          if (ehCliente && SGO_UTILS.safe(r.CLIENTE_ID) !== SGO_UTILS.safe(sessao.clienteId)) return false;
          var num = SGO_UTILS.safeLower(r.NUMERO_CERTIFICADO);
          return num && (num.indexOf(ql) >= 0 || (qDig.length >= 3 && String(r.NUMERO_CERTIFICADO).replace(/\D/g, '').indexOf(qDig) >= 0));
        }).sort(function (a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });
        grupo('Certificados de calibração', certs.map(function (r) {
          var cli = clientesMapa[SGO_UTILS.safe(r.CLIENTE_ID)] || {};
          var eq = equipMapa[SGO_UTILS.safe(r.EQUIPAMENTO_ID)] || {};
          return {
            titulo: 'Certificado ' + SGO_UTILS.safe(r.NUMERO_CERTIFICADO),
            detalhe: [SGO_UTILS.safe(eq.TAG), SGO_UTILS.safe(cli.NOME_FANTASIA) || SGO_UTILS.safe(cli.RAZAO_SOCIAL), Inicio_dataBr_(r.DATA_CALIBRACAO) ? 'calibrado em ' + Inicio_dataBr_(r.DATA_CALIBRACAO) : ''].filter(Boolean).join(' · '),
            acao: { tipo: 'certificado', cnpj: String(cli.CNPJ || '').replace(/\D/g, ''), numero: SGO_UTILS.safe(r.NUMERO_CERTIFICADO) }
          };
        }), certs.length);
      }
    } catch (e3) { falhas.push('certificados'); }

    // Documentos — pesquisar() já aplica a trava do cliente
    try {
      var rd = SGO_DOCUMENTOS.pesquisar(sessionId, q);
      var docs = ((rd && rd.items) || []).filter(function (d) { return SGO_UTILS.safeUpper(d.STATUS) !== 'EXCLUIDO'; });
      grupo('Documentos', docs.map(function (d) {
        return {
          titulo: SGO_UTILS.safe(d.NOME_ARQUIVO) || 'Documento sem nome',
          detalhe: [SGO_UTILS.safe(d.TIPO_DOCUMENTO), SGO_UTILS.safe(d.CLIENTE_NOME), Inicio_dataBr_(d.DATA_VENCIMENTO) ? 'vence ' + Inicio_dataBr_(d.DATA_VENCIMENTO) : ''].filter(Boolean).join(' · '),
          acao: { tipo: 'documento', termo: SGO_UTILS.safe(d.NOME_ARQUIVO) || q }
        };
      }), docs.length);
    } catch (e4) { falhas.push('documentos'); }

    // Padrões de referência — ativo interno do laboratório, só para a equipe
    if (!ehCliente) {
      try {
        var ss2 = SGO_DATA.getDB();
        if (ss2.getSheetByName(SGO_CFG.SHEETS.CAD_PADROES)) {
          var pads = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES).filter(function (p) {
            return [p.TAG, p.DESCRICAO, p.NUMERO_CERTIFICADO].some(function (v) { return SGO_UTILS.safeLower(v).indexOf(ql) >= 0; });
          });
          pads = ordenarPor(pads, 'TAG');
          grupo('Padrões de referência', pads.map(function (p) {
            var val = '';
            try { val = typeof CertCal_classificarValidadePadrao_ === 'function' ? CertCal_classificarValidadePadrao_(p.VALIDADE).label : ''; } catch (ig) {}
            return {
              titulo: [SGO_UTILS.safe(p.TAG), SGO_UTILS.safe(p.DESCRICAO)].filter(Boolean).join(' · '),
              detalhe: [SGO_UTILS.safeUpper(p.STATUS) === 'ATIVO' ? '' : 'Inativo', val].filter(Boolean).join(' · '),
              acao: { tipo: 'atalho', alvo: 'padroes' }
            };
          }), pads.length);
        }
      } catch (e5) { falhas.push('padrões'); }
    }

    return JSON.parse(JSON.stringify({ ok: true, termo: q, grupos: grupos, falhas: falhas }));
  } catch (e) {
    return { ok: false, message: 'Não foi possível buscar: ' + ((e && e.message) || e) + '. Verifique a conexão e tente de novo.' };
  }
}
