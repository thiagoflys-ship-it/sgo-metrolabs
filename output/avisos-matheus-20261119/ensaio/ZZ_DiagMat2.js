/** 19/11/2026, somente leitura: propostas aguardando aprovação e a situação do aprovador delegado; rodada sem gravar. */
function Ensaio_diagMat2_() {
  var out = { propostas: [], precos: [] };
  Com_ler_(COM_ABAS.PROPOSTAS).forEach(function (p) {
    if (Com_up_(p.SITUACAO) !== 'AGUARDANDO_APROVACAO') return;
    var x = { num: ComP_rotulo_(p), resp: Com_s_(p.RESPONSAVEL_NOME), pedidoEm: Com_s_(p.DESCONTO_PEDIDO_EM), descSit: Com_s_(p.DESCONTO_SITUACAO) };
    try { var av = ComP_avaliarProposta_(p); x.exigeDiretoria = !!av.pol.exigeDiretoria; x.codigos = av.pol.codigos; var s = ComDel_proposta_(p, av); x.delegado = s ? { liberado: s.liberado, liberaEm: s.liberaEmTxt, criteriosOk: s.criteriosOk, pendentes: s.pendentes } : null; } catch (e) { x.erro = String(e && e.stack || e).slice(0, 400); }
    out.propostas.push(x);
  });
  try { Com_ler_(COM_ABAS.CATALOGO || COM_ABAS.PRODUTOS).forEach(function (p) { if (Com_s_(p.PRECO_PEDIDO_EM) >= '2026-11-15') out.precos.push({ cod: p.CODIGO, em: p.PRECO_PEDIDO_EM, por: p.PRECO_PEDIDO_POR_NOME, sit: p.PRECO_SITUACAO || p.SITUACAO }); }); } catch (e) { out.precoErr = String(e); }
  return out;
}
