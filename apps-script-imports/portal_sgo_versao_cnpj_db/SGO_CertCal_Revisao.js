/****************************************************
 * Certificado de calibração — corrigir um certificado emitido e usar como base (21/10/2026)
 *
 * Usa o registro comum de revisões (SGO_DocRevisao.js):
 *  - a emissão (CertCal_apiGerarCertificado) chama CertCal_registrarRevisao_: guarda o formulário usado (blocos, leituras,
 *    padrões, fotos, condições ambientais), o cliente e o equipamento; na correção, o certificado corrigido fica com
 *    STATUS SUBSTITUIDO na aba CERT_CALIBRACAO (não aparece mais como vigente na busca) e o arquivo não é apagado;
 *  - CertCal_apiPrepararCorrecao abre também certificados emitidos antes do registro: o formulário é remontado a partir
 *    do snapshot do certificado (blocos, leituras, padrões, fotos, datas); temperatura e umidade digitadas não foram
 *    guardadas no snapshot antigo (só a frase pronta) e a tela pede só esses dois campos.
 * Nenhuma função devolve objeto Date.
 ****************************************************/

/** Cliente e equipamento no formato que a tela usa para escolher (só textos). */
function CertCal_revCadastros_(clienteId, equipamentoId) {
  var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, SGO_UTILS.safe(clienteId)) || {};
  var e = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, SGO_UTILS.safe(equipamentoId)) || {};
  var s = function (v) { return v === null || v === undefined ? '' : String(v); };
  return {
    cliente: { ID: s(c.ID), RAZAO_SOCIAL: s(c.RAZAO_SOCIAL || c.NOME_FANTASIA), CNPJ: s(c.CNPJ), ENDERECO: s(c.ENDERECO) },
    equipamento: { ID: s(e.ID), TIPO: s(e.TIPO), TAG: s(e.TAG), FABRICANTE: s(e.FABRICANTE), MODELO: s(e.MODELO), SERIE: s(e.SERIE), UNIDADE_ID: s(e.UNIDADE_ID), CLIENTE_ID: s(e.CLIENTE_ID) }
  };
}

/** Depois da emissão: registro da revisão e, na correção, o certificado corrigido passa a SUBSTITUIDO. Nunca lança. */
function CertCal_registrarRevisao_(docRev, payload, ctx, registro, arquivo, htmlSalvo, sessao) {
  try {
    var cad = CertCal_revCadastros_(ctx.cliente.id, ctx.equipamento.id);
    var guardar = Object.assign({}, payload, { _certificadoId: registro.ID, _cliente: cad.cliente, _equipamento: cad.equipamento });
    var r = SGO_DocRev_registrar_('CERTIFICADO_CALIBRACAO', docRev, {
      numero: ctx.numeroCertificado, payload: guardar, titulo: 'Certificado de calibração — ' + (ctx.equipamento.descricao || ''),
      cliente: ctx.cliente.razaoSocial, cnpj: ctx.cliente.cnpj, tag: ctx.equipamento.tag, equipamentoId: ctx.equipamento.id,
      pdfId: arquivo.getId(), htmlId: (htmlSalvo && htmlSalvo.htmlId) || '', pdfUrl: arquivo.getUrl(), htmlUrl: (htmlSalvo && htmlSalvo.htmlUrl) || ''
    }, sessao);
    if (docRev && docRev.ehRevisao) {
      var origem = SGO_DocRev_payloadOrigem_(docRev);
      var idAntigo = SGO_UTILS.safe(origem && origem._certificadoId);
      if (idAntigo && idAntigo !== registro.ID) {
        try { SGO_DATA.update(SGO_CFG.SHEETS.CERT_CALIBRACAO, idAntigo, { STATUS: 'SUBSTITUIDO' }); } catch (e) { /* o registro de revisões já marca a substituição */ }
      }
    }
    return r;
  } catch (e) {
    return { ok: false, rotulo: '', aviso: 'O certificado foi emitido, mas o registro para corrigir depois não foi gravado (' + String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + ').' };
  }
}

/**
 * "Abrir para corrigir" / "Usar como base" a partir da busca de certificados por CNPJ. Certificado já registrado: vale a
 * revisão vigente. Certificado anterior ao registro: o formulário é remontado do snapshot e a tela pede o que faltar.
 */
function CertCal_apiPrepararCorrecao(sessionId, payload) {
  payload = payload || {};
  var sessao = exigirSessao(sessionId);
  CertCal_bootstrap_();
  var registro = SGO_DATA.getById(SGO_CFG.SHEETS.CERT_CALIBRACAO, SGO_UTILS.safe(payload.certificadoId));
  if (!registro) throw new Error('Certificado não encontrado. Busque os certificados do CNPJ de novo.');
  CertCal_exigirAcessoCliente_(sessionId, registro.CLIENTE_ID);
  if (String(registro.STATUS || '').toUpperCase() === 'SUBSTITUIDO') throw new Error('Este certificado já foi substituído por uma revisão. Use a revisão vigente, na lista de documentos gerados.');
  var ctx = CertCal_lerSnapshot_(registro);
  var cad = CertCal_revCadastros_(registro.CLIENTE_ID, registro.EQUIPAMENTO_ID);
  var blocos = (ctx.blocos || []).map(function (b) {
    return {
      titulo: b.titulo || '', unidade: b.unidade || '', resolucao: b.resolucaoInferida ? '' : (b.resolucao === undefined || b.resolucao === null ? '' : String(b.resolucao)),
      padroesIds: (b.padroesUsados || []).map(function (p) { return String(p.id || ''); }).filter(Boolean),
      pontos: (b.resultados || []).map(function (r) { return { nominal: r.nominal === undefined || r.nominal === null ? '' : String(r.nominal), leituras: (r.leituras || []).map(function (l) { return l === undefined || l === null ? '' : String(l); }) }; })
    };
  });
  var dados = {
    clienteId: String(registro.CLIENTE_ID || ''), equipamentoId: String(registro.EQUIPAMENTO_ID || ''), tecnicoId: String(registro.TECNICO_ID || ''),
    tecnicoExecutorLivre: registro.TECNICO_ID ? '' : String(ctx.tecnicoExecutor || ''), dataCalibracao: String(ctx.dataCalibracao || ''),
    proximaCalibracao: ctx.proximaCalibracao || { solicitada: false }, localCalibracao: ctx.localCalibracao === 'CLIENTE' ? 'CLIENTE' : 'LABORATORIO',
    temperaturaAmbiente: '', umidadeRelativa: '', blocos: blocos,
    fotos: (ctx.fotos || []).map(function (f) { return { base64: f.base64, mimeType: f.mimeType || 'image/jpeg', legenda: f.legenda || '' }; }),
    _certificadoId: registro.ID, _cliente: cad.cliente, _equipamento: cad.equipamento
  };
  var id = SGO_DocRev_registrarAntigo_('CERTIFICADO_CALIBRACAO', {
    numero: registro.NUMERO_CERTIFICADO, revisao: ctx.revisao || 0, titulo: 'Certificado de calibração — ' + ((ctx.equipamento && ctx.equipamento.descricao) || ''),
    cliente: (ctx.cliente && ctx.cliente.razaoSocial) || '', cnpj: (ctx.cliente && ctx.cliente.cnpj) || '', tag: (ctx.equipamento && ctx.equipamento.tag) || '',
    equipamentoId: registro.EQUIPAMENTO_ID, pdfUrl: registro.LINK_PDF_CERTIFICADO, emitidoEm: ctx.dataEmissao || '', payload: dados,
    faltam: ['temperatura ambiente e umidade relativa (o certificado antigo guardou só a frase "' + String(ctx.condicoesAmbientais || 'não informadas') + '"; digite os valores na seção de calibração)']
  }, sessao);
  return { ok: true, id: id };
}
