/**
 * INÍCIO — faixa "o que depende de você hoje" e busca rápida (Ctrl K).
 *
 * Só AGREGA o que os módulos já calculam (não repete regra de negócio):
 *   - atividades: Atividades_apiListarMinhas (SGO_Atividades.js)
 *   - padrões / documentos a vencer: alertasObterDashboard (SGO_Alertas.js)
 *   - ciência do Conduta: Conduta_avisosVigentes_ + Conduta_cienciasDe_ (SGO_Conduta_Ciencia.js),
 *     a mesma regra de Conduta_apiObterAvisos, mas sem registrar "exibição" do aviso
 *   - O.S. Auvo pendentes: Auvo_apiListarPendencias (SGO_Auvo_Pendencias.js), só gestores
 *   - busca: SGO_CLIENTES/SGO_EQUIPAMENTOS/SGO_DOCUMENTOS.pesquisar, que já aplicam a trava do cliente
 * Devolve só texto (datas já formatadas) para o google.script.run.
 */

var INICIO_FUSO = 'America/Sao_Paulo';
var INICIO_BUSCA_LIMITE = 6;      // por grupo
var INICIO_BUSCA_TERMO_MAX = 80;

function Inicio_plural_(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

function Inicio_listaCurta_(nomes, max) {
  var m = max || 3;
  nomes = nomes.map(function (n) { n = String(n || ''); return n.length > 44 ? n.slice(0, 42).replace(/\s+\S*$/, '') + '…' : n; });
  if (nomes.length <= m) return nomes.join(', ');
  return nomes.slice(0, m).join(', ') + ' e mais ' + (nomes.length - m);
}

/** Nome entre aspas simples na mensagem do alerta ("O padrão de referência 'PS-01' ..."). */
function Inicio_nomeDoAlerta_(msg) {
  var m = String(msg || '').match(/'([^']+)'/);
  return m ? m[1] : '';
}

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

function Inicio_horaDe_(isoDataHora) {
  var m = String(isoDataHora || '').match(/T(\d{2}):(\d{2})/);
  return m ? m[1] + ':' + m[2] : '';
}

// ------------------------------------------------------------
// PENDÊNCIAS
// ------------------------------------------------------------
function Inicio_apiPendencias(sessionId) {
  try {
    var sessao = exigirSessao(sessionId);
    var perfil = SGO_UTILS.safeUpper(sessao.perfil);
    var ehCliente = perfil === 'CLIENTE';
    var gestor = typeof isAdminPerfilAuth_ === 'function' ? isAdminPerfilAuth_(perfil) : false;
    var itens = [];
    var naoVerificado = [];

    // 1) Atividades minhas: atrasadas e vencendo hoje
    if (!ehCliente && typeof Atividades_apiListarMinhas === 'function') {
      try {
        var ra = Atividades_apiListarMinhas(sessionId, {});
        if (ra && ra.ok) {
          var agora = String(ra.agora || '');
          var hoje = agora.slice(0, 10);
          var abertas = (ra.itens || []).filter(function (a) {
            return a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada' && a.PREVISAO_ATUAL;
          });
          var atrasadas = abertas.filter(function (a) { return a.PREVISAO_ATUAL < agora; })
            .sort(function (a, b) { return String(a.PREVISAO_ATUAL).localeCompare(String(b.PREVISAO_ATUAL)); });
          var hojeLista = abertas.filter(function (a) { return a.PREVISAO_ATUAL >= agora && a.PREVISAO_ATUAL.slice(0, 10) === hoje; });
          if (atrasadas.length) {
            var a0 = atrasadas[0];
            itens.push({
              prioridade: 2, nivel: 'critico', rotulo: 'Atrasada',
              titulo: atrasadas.length === 1 ? SGO_UTILS.safe(a0.TITULO) : Inicio_plural_(atrasadas.length, 'atividade atrasada', 'atividades atrasadas'),
              detalhe: atrasadas.length === 1
                ? 'Previsão era ' + Inicio_dataHoraBr_(a0.PREVISAO_ATUAL) + ' · justifique ou conclua'
                : 'A mais antiga: ' + SGO_UTILS.safe(a0.TITULO) + ' (' + Inicio_dataHoraBr_(a0.PREVISAO_ATUAL) + ')',
              acao: atrasadas.length === 1 ? { tipo: 'atividade', id: SGO_UTILS.safe(a0.ID) } : { tipo: 'modulo', mod: 'minhas_atividades' }
            });
          }
          if (hojeLista.length) {
            var h0 = hojeLista[0];
            itens.push({
              prioridade: 4, nivel: 'atencao', rotulo: 'Vence hoje',
              titulo: hojeLista.length === 1 ? SGO_UTILS.safe(h0.TITULO) : Inicio_plural_(hojeLista.length, 'atividade vence hoje', 'atividades vencem hoje'),
              detalhe: hojeLista.length === 1 ? 'Previsão para hoje às ' + Inicio_horaDe_(h0.PREVISAO_ATUAL) : 'Primeira às ' + Inicio_horaDe_(h0.PREVISAO_ATUAL) + ': ' + SGO_UTILS.safe(h0.TITULO),
              acao: hojeLista.length === 1 ? { tipo: 'atividade', id: SGO_UTILS.safe(h0.ID) } : { tipo: 'modulo', mod: 'minhas_atividades' }
            });
          }
        } else {
          naoVerificado.push('atividades');
        }
      } catch (e) { naoVerificado.push('atividades'); }
    }

    // 2) Padrões de referência e documentos (mesma regra do painel de alertas)
    try {
      var rAl = alertasObterDashboard(sessionId);
      var alertas = (rAl && rAl.success && rAl.items) ? rAl.items : [];
      if (rAl && rAl.success === false) naoVerificado.push('vencimentos');

      var padVenc = alertas.filter(function (x) { return x.origem === 'PADRAO' && x.tipo === 'CRÍTICO'; });
      var padAVencer = alertas.filter(function (x) { return x.origem === 'PADRAO' && x.tipo !== 'CRÍTICO' && x.dias !== null; });
      var padSemData = alertas.filter(function (x) { return x.origem === 'PADRAO' && x.dias === null; });
      var docVenc = alertas.filter(function (x) { return x.origem === 'DOCUMENTO' && x.tipo === 'CRÍTICO'; });
      var docAVencer = alertas.filter(function (x) { return x.origem === 'DOCUMENTO' && x.tipo !== 'CRÍTICO'; });
      var nomes = function (lista) { return lista.map(function (x) { return Inicio_nomeDoAlerta_(x.mensagem) || '—'; }); };

      if (padVenc.length) {
        itens.push({
          prioridade: 1, nivel: 'critico', rotulo: 'Bloqueia emissão',
          titulo: padVenc.length === 1 ? 'Padrão ' + nomes(padVenc)[0] + ' vencido' : Inicio_plural_(padVenc.length, 'padrão vencido', 'padrões vencidos'),
          detalhe: padVenc.length === 1
            ? 'Vencido há ' + Inicio_plural_(Math.abs(Number(padVenc[0].dias) || 0), 'dia', 'dias') + ' · não pode ser usado em certificado'
            : Inicio_listaCurta_(nomes(padVenc), 3),
          acao: { tipo: 'atalho', alvo: 'padroes' }
        });
      }
      if (padAVencer.length) {
        var maisPerto = padAVencer.slice().sort(function (a, b) { return a.dias - b.dias; })[0];
        itens.push({
          prioridade: 5, nivel: 'atencao', rotulo: 'A vencer',
          titulo: padAVencer.length === 1 ? 'Padrão ' + nomes(padAVencer)[0] + ' a vencer' : Inicio_plural_(padAVencer.length, 'padrão a vencer', 'padrões a vencer'),
          detalhe: 'O mais próximo vence em ' + Inicio_plural_(Number(maisPerto.dias) || 0, 'dia', 'dias') + ' (' + (Inicio_nomeDoAlerta_(maisPerto.mensagem) || '—') + ')',
          acao: { tipo: 'atalho', alvo: 'padroes' }
        });
      }
      if (padSemData.length) {
        itens.push({
          prioridade: 7, nivel: 'revisar', rotulo: 'Revisar',
          titulo: Inicio_plural_(padSemData.length, 'padrão sem validade válida', 'padrões sem validade válida'),
          detalhe: Inicio_listaCurta_(nomes(padSemData), 3) + ' · corrija o cadastro',
          acao: { tipo: 'atalho', alvo: 'padroes' }
        });
      }
      if (docVenc.length) {
        itens.push({
          prioridade: 6, nivel: 'revisar', rotulo: 'Revisar',
          titulo: Inicio_plural_(docVenc.length, 'documento vencido', 'documentos vencidos'),
          detalhe: Inicio_listaCurta_(nomes(docVenc), 1),
          acao: { tipo: 'modulo', mod: 'documentos' }
        });
      }
      if (docAVencer.length) {
        var dPerto = docAVencer.slice().sort(function (a, b) { return a.dias - b.dias; })[0];
        itens.push({
          prioridade: 8, nivel: 'atencao', rotulo: 'A vencer',
          titulo: Inicio_plural_(docAVencer.length, 'documento a vencer', 'documentos a vencer'),
          detalhe: 'O mais próximo vence em ' + Inicio_plural_(Number(dPerto.dias) || 0, 'dia', 'dias') + ' (' + (Inicio_nomeDoAlerta_(dPerto.mensagem) || '—') + ')',
          acao: { tipo: 'modulo', mod: 'documentos' }
        });
      }
    } catch (e) { naoVerificado.push('vencimentos'); }

    // 3) Ciência pendente do Programa de Conduta (sem registrar exibição)
    if (!ehCliente && typeof Conduta_avisosVigentes_ === 'function' && typeof Conduta_cienciasDe_ === 'function') {
      try {
        var eu = String(sessao.userId);
        var ciencias = Conduta_cienciasDe_(eu);
        var pend = Conduta_avisosVigentes_().filter(function (a) {
          var c = ciencias[a.tipo + '|' + a.ref + '|' + eu];
          return !(c && Conduta_soData_(c.CIENTE_EM));
        });
        if (pend.length) {
          itens.push({
            prioridade: 3, nivel: 'info', rotulo: 'Ciência pendente',
            titulo: pend.length === 1 ? 'Aviso do Programa de Conduta' : Inicio_plural_(pend.length, 'aviso do Programa de Conduta', 'avisos do Programa de Conduta'),
            detalhe: pend.length === 1 ? String(pend[0].titulo || '').slice(0, 90) : 'Confirme a leitura para registrar sua ciência',
            acao: { tipo: 'conduta_ciencia' }
          });
        }
      } catch (e) { naoVerificado.push('avisos do Conduta'); }
    }

    // 4) O.S. Auvo pendentes (só gestores, mesma trava do módulo)
    if (gestor && typeof Auvo_apiListarPendencias === 'function') {
      try {
        var rv = Auvo_apiListarPendencias(sessionId);
        if (rv && rv.ok && rv.total) {
          var maisAntiga = (rv.items || []).reduce(function (m, i) { return Math.max(m, Number(i.DIAS_ABERTA) || 0); }, 0);
          itens.push({
            prioridade: 6, nivel: 'revisar', rotulo: 'Revisar',
            titulo: Inicio_plural_(rv.total, 'O.S. Auvo pendente', 'O.S. Auvo pendentes'),
            detalhe: Inicio_plural_(rv.semEvidencia || 0, 'sem evidência', 'sem evidência') + (maisAntiga ? ' · mais antiga aberta há ' + Inicio_plural_(maisAntiga, 'dia', 'dias') : ''),
            acao: { tipo: 'modulo', mod: 'auvo' }
          });
        }
      } catch (e) { naoVerificado.push('O.S. Auvo'); }
    }

    itens.sort(function (a, b) { return a.prioridade - b.prioridade; });
    itens.forEach(function (i) { delete i.prioridade; });
    return JSON.parse(JSON.stringify({ ok: true, total: itens.length, itens: itens, naoVerificado: naoVerificado }));
  } catch (e) {
    return { ok: false, message: 'Não foi possível verificar as pendências: ' + ((e && e.message) || e) + '. O restante do Início continua valendo; atualize a página para tentar de novo.' };
  }
}

/** Usa Atividades_dataBr_ (módulo de atividades) se existir; senão formata aqui. */
function Inicio_dataHoraBr_(s) {
  if (typeof Atividades_dataBr_ === 'function') { var r = Atividades_dataBr_(s); if (r) return r; }
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : '';
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
