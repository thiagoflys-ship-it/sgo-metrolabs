/**
 * 16/11/2026: Painel financeiro > Ficha do cliente (cobrança). Só leitura no Omie, sob a trava de sigilo do Financeiro.
 * Busca do cliente no cadastro do SGO+ (nome ou CNPJ; sem Omie). A ficha lê no Omie, pelo CNPJ:
 *   - ListarClientes (clientesFiltro.cnpj_cpf formatado): nome e código do cliente no Omie (até 3 cadastros ativos);
 *   - ListarMovimentos (cTpLancamento CR, nCodCliente): saldo EM ABERTO de cada título (desconta pagamento parcial) e os
 *     recebimentos dos últimos 12 meses (data do pagamento). Até 5 páginas de 100 movimentos por cadastro; acima, a ficha avisa.
 * Nada é gravado. A lista devolvida ao navegador é explícita (nunca a resposta crua do Omie). Título que o Omie devolver de
 * outro cliente fica fora; se só vierem títulos de outros clientes, a ficha recusa (não mistura clientes).
 */
var OMIE_CLI_PAGINAS = 5;
function OmieCli_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function OmieCli_iso_(br) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(OmieCli_s_(br)); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
function OmieCli_hoje_() { try { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function OmieCli_dias_(de, ate) { return Math.round((Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10)) - Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) / 86400000); }
function OmieCli_abaClientes_() { return (typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_CLIENTES) || 'CAD_CLIENTES'; }

/** Busca no cadastro de clientes do SGO+ (até 15). Não consulta o Omie. */
function Omie_apiClienteBuscar(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var q = OmieCli_s_((payload || {}).q).toLowerCase(), dig = q.replace(/\D/g, '');
    if (q.length < 3) Omie_erroPublico_('Digite pelo menos 3 letras do nome ou os números do CNPJ.');
    var achados = [];
    SGO_DATA.getAll(OmieCli_abaClientes_()).forEach(function (c) {
      var cnpj = OmieCli_s_(c.CNPJ).replace(/\D/g, ''), nome = (OmieCli_s_(c.RAZAO_SOCIAL) + ' ' + OmieCli_s_(c.NOME_FANTASIA)).toLowerCase();
      if ((dig.length >= 5 && cnpj.indexOf(dig) >= 0) || nome.indexOf(q) >= 0) achados.push({ id: OmieCli_s_(c.ID), nome: OmieCli_s_(c.RAZAO_SOCIAL) || OmieCli_s_(c.NOME_FANTASIA), fantasia: OmieCli_s_(c.NOME_FANTASIA), cnpj: cnpj, situacao: OmieCli_s_(c.STATUS) });
    });
    achados.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    return { ok: true, total: achados.length, clientes: achados.slice(0, 15) };
  } catch (e) { return { ok: false, mensagem: e && e.omieOpsPublica ? e.message : 'Não foi possível buscar o cliente. Tente novamente.' }; }
}

/** Ficha do cliente pelo CNPJ (ou CPF): títulos em aberto, vencidos e recebidos nos últimos 12 meses. Só leitura. */
function Omie_apiClienteFicha(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var doc = OmieCli_s_((payload || {}).cnpj).replace(/\D/g, '');
    if (doc.length !== 14 && doc.length !== 11) Omie_erroPublico_('Este cliente está sem CNPJ válido no cadastro do SGO+. Corrija o cadastro para consultar a ficha no Omie.');
    var fmt = typeof OmiePed_cnpjFmt_ === 'function' ? OmiePed_cnpjFmt_(doc) : doc;
    var c = Omie_requisitar_('geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 5, apenas_importado_api: 'N', clientesFiltro: { cnpj_cpf: fmt } });
    // 16/11/2026 (ensaio real): cliente INATIVO no Omie pode ter título vencido; entra também, com aviso (ativos primeiro)
    var todos = (c.clientes_cadastro || []).slice().sort(function (a, b) { return (OmieCli_s_(a.inativo).toUpperCase() === 'S') - (OmieCli_s_(b.inativo).toUpperCase() === 'S'); });
    // O Omie recusa ListarMovimentos com o código de cadastro INATIVO ('não cadastrado'): cadastro inativo não vai por movimentos.
    // Só inativos: os títulos vêm de ListarContasReceber pelo CNPJ (valor do documento; o saldo em aberto não é informado).
    var ativos = todos.filter(function (x) { return OmieCli_s_(x.inativo).toUpperCase() !== 'S'; }), inativos = todos.length - ativos.length;
    var nomeOmie = todos.length ? OmieCli_s_(todos[0].razao_social || todos[0].nome_fantasia) : '';
    var codigos = ativos.map(function (x) { return Number(x.codigo_cliente_omie); }).filter(function (x) { return x > 0; }).slice(0, 3);
    if (!todos.length) return { ok: true, cnpj: fmt, semCadastroOmie: true, mensagem: 'O CNPJ ' + fmt + ' não tem cadastro no Omie: não há títulos a mostrar.' };
    var hoje = OmieCli_hoje_(), desde = new Date(Date.UTC(+hoje.slice(0, 4) - 1, +hoje.slice(5, 7) - 1, +hoje.slice(8, 10))).toISOString().slice(0, 10);
    var abertos = [], recebidos = [], vistos = {}, cortado = false, outros = 0, lidos = 0, porDocumento = !codigos.length;
    if (porDocumento) {
      var pg = 1, pgs = 1;
      do {
        var k = Omie_requisitar_('financas/contareceber/', 'ListarContasReceber', { pagina: pg, registros_por_pagina: 100, apenas_importado_api: 'N', filtrar_por_cpf_cnpj: doc });
        pgs = Number(k.total_de_paginas) || 1;
        (k.conta_receber_cadastro || []).forEach(function (x) {
          var st = OmieCli_s_(x.status_titulo).toUpperCase(), venc = OmieCli_iso_(x.data_vencimento), id = OmieCli_s_(x.codigo_lancamento_omie);
          if (/^(RECEBIDO|CANCELADO|LIQUIDADO|PAGO)$/.test(st) || vistos['a' + id]) return;
          vistos['a' + id] = 1;
          abertos.push({ documento: OmieCli_s_(x.numero_documento_fiscal || x.numero_documento), parcela: OmieCli_s_(x.numero_parcela), vencimento: venc, aberto: Math.round((Number(x.valor_documento) || 0) * 100) / 100, pagoParcial: st === 'PAGTO PARCIAL', atraso: venc && venc < hoje ? OmieCli_dias_(venc, hoje) : 0 });
        });
        pg++;
        if (pg > OMIE_CLI_PAGINAS && pg <= pgs) { cortado = true; break; }
      } while (pg <= pgs);
    }
    codigos.forEach(function (cod) {
      var pagina = 1, paginas = 1;
      do {
        var j = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: pagina, nRegPorPagina: 100, cTpLancamento: 'CR', nCodCliente: cod });
        paginas = Number(j.nTotPaginas) || 1;
        (j.movimentos || []).forEach(function (m) {
          var d = m.detalhes || {}, r = m.resumo || {};
          lidos++;
          if (Number(d.nCodCliente) && Number(d.nCodCliente) !== cod) { outros++; return; } // título de outro cliente: fora
          if (OmieCli_s_(d.cNatureza) && OmieCli_s_(d.cNatureza) !== 'R') return;
          if (OmieCli_s_(d.cStatus).toUpperCase() === 'CANCELADO') return;
          var titulo = OmieCli_s_(d.nCodTitulo), docTit = OmieCli_s_(d.cNumDocFiscal || d.cNumTitulo), parcela = OmieCli_s_(d.cNumParcela);
          var aberto = Number(r.nValAberto) || 0, pago = Number(r.nValPago) || 0, venc = OmieCli_iso_(d.dDtVenc), pagoEm = OmieCli_iso_(d.dDtPagamento);
          if (aberto > 0.004 && !vistos['a' + titulo]) {
            vistos['a' + titulo] = 1;
            abertos.push({ documento: docTit, parcela: parcela, vencimento: venc, aberto: Math.round(aberto * 100) / 100, pagoParcial: pago > 0.004, atraso: venc && venc < hoje ? OmieCli_dias_(venc, hoje) : 0 });
          }
          if (pago > 0.004 && pagoEm && pagoEm >= desde && !vistos['p' + titulo + pagoEm]) {
            vistos['p' + titulo + pagoEm] = 1;
            recebidos.push({ documento: docTit, parcela: parcela, vencimento: venc, pagoEm: pagoEm, valor: Math.round(pago * 100) / 100, atraso: venc && pagoEm > venc ? OmieCli_dias_(venc, pagoEm) : 0 });
          }
        });
        pagina++;
        if (pagina > OMIE_CLI_PAGINAS && pagina <= paginas) { cortado = true; break; }
      } while (pagina <= paginas);
    });
    if (outros > 0 && outros === lidos) throw new Error('O Omie não filtrou os títulos por cliente. Nada foi mostrado para não misturar clientes; avise o responsável pelo sistema.');
    abertos.sort(function (a, b) { return a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : 0; });
    recebidos.sort(function (a, b) { return a.pagoEm < b.pagoEm ? 1 : a.pagoEm > b.pagoEm ? -1 : 0; });
    var cent = function (l, f) { return l.reduce(function (s, x) { return s + Math.round(x[f] * 100); }, 0) / 100; };
    var vencidos = abertos.filter(function (x) { return x.atraso > 0; });
    var comAtraso = recebidos.filter(function (x) { return x.atraso > 0; });
    var mediaAtraso = recebidos.length ? Math.round(recebidos.reduce(function (s, x) { return s + x.atraso; }, 0) / recebidos.length) : 0;
    // contexto do SGO+: propostas aprovadas do cliente (sem Omie)
    var propostas = 0, totalPropostas = 0;
    try {
      var ids = {};
      SGO_DATA.getAll(OmieCli_abaClientes_()).forEach(function (x) { if (OmieCli_s_(x.CNPJ).replace(/\D/g, '') === doc) ids[OmieCli_s_(x.ID)] = 1; });
      if (SGO_DATA.getDB().getSheetByName('COM_PROPOSTAS')) SGO_DATA.getAll('COM_PROPOSTAS').forEach(function (p) {
        if (ids[OmieCli_s_(p.CLIENTE_ID)] && OmieCli_s_(p.SITUACAO).toUpperCase() === 'APROVADA' && !OmieCli_s_(p.EXCLUIDA_EM)) { propostas++; totalPropostas += Math.round((Number(p.TOTAL) || 0) * 100); }
      });
    } catch (e) {}
    return { ok: true, cnpj: fmt, nomeOmie: nomeOmie, cadastrosOmie: todos.length, inativosOmie: inativos, porDocumento: porDocumento, hoje: hoje, desde: desde, cortado: cortado,
      totais: { aberto: cent(abertos, 'aberto'), titulosAbertos: abertos.length, vencido: cent(vencidos, 'aberto'), titulosVencidos: vencidos.length,
        maisAntigo: vencidos.length ? vencidos[0].vencimento : '', maiorAtraso: vencidos.length ? vencidos[0].atraso : 0,
        recebido12m: cent(recebidos, 'valor'), recebimentos12m: recebidos.length, pagosComAtraso: comAtraso.length, mediaAtraso: mediaAtraso },
      abertos: abertos.slice(0, 200), recebidos: recebidos.slice(0, 30), propostasAprovadas: propostas, totalPropostas: totalPropostas / 100,
      atualizadoEm: new Date().toISOString() };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
