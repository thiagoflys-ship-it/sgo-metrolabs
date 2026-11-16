// Painel financeiro (15/11/2026): vínculo pedido aprovado -> conta a receber criada pelo SGO+ no Omie (registrado na confirmação
// do lançamento com referência SGO-...). A aba Pedidos aprovados mostra "Lançado no Omie pelo SGO+" e filtra os que faltam.
// Uso: node patch-pedidos-vinculo.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
function ed(f, a, b) {
  f = path.join(pasta, f);
  let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
  a = a.replace(/\r?\n/g, nl); b = b.replace(/\r?\n/g, nl);
  if (t.split(a).length !== 2) throw new Error('trecho não encontrado uma vez em ' + f + ': ' + a.slice(0, 70));
  fs.writeFileSync(f, t.replace(a, () => b));
}
ed('SGO_Omie_Pedidos.js', `/** Propostas aprovadas pelo cliente (mais recentes primeiro)`, `// 15/11/2026: vínculo pedido -> conta a receber criada pelo SGO+ (gravado na confirmação do lançamento com referência SGO-...).
// Títulos lançados direto no Omie, fora do SGO+, não aparecem aqui.
var OMIE_PED_ABA = 'FIN_OMIE_PEDIDOS';
var OMIE_PED_COLUNAS = ['ID', 'PROPOSTA_ID', 'PROPOSTA_NUMERO', 'REFERENCIA', 'TITULO_OMIE', 'DOCUMENTO', 'VALOR', 'VENCIMENTO', 'POR', 'EM'];
function OmiePed_ref_(p) { return ('SGO-' + OmiePed_rotulo_(p).replace(/\\s+rev\\.\\s+/, '-R')).replace(/[^A-Za-z0-9-]/g, '').slice(0, 60); }
function OmiePed_vinculos_() { try { return SGO_DATA.getAll(OMIE_PED_ABA) || []; } catch (e) { return []; } }
/** Chamado por OmieOps_apiConfirmar depois de criar conta a receber no Omie. Falha aqui não desfaz nem marca o envio como incerto. */
function OmiePed_registrar_(param, resposta, eu) {
  var ref = OmiePed_s_(param && param.codigo_lancamento_integracao);
  if (!/^SGO-/.test(ref)) return null;
  var alvo = null;
  SGO_DATA.getAll('COM_PROPOSTAS').forEach(function (p) {
    if (alvo || OmiePed_s_(p.SITUACAO).toUpperCase() !== 'APROVADA') return;
    var r = OmiePed_ref_(p);
    if (ref === r || ref.indexOf(r + '-') === 0) alvo = p;
  });
  if (!alvo) return null;
  var db = SGO_DATA.getDB(), sh = db.getSheetByName(OMIE_PED_ABA);
  if (!sh) { sh = db.insertSheet(OMIE_PED_ABA); sh.getRange(1, 1, 1, OMIE_PED_COLUNAS.length).setValues([OMIE_PED_COLUNAS]); }
  var linha = { ID: Utilities.getUuid(), PROPOSTA_ID: OmiePed_s_(alvo.ID), PROPOSTA_NUMERO: OmiePed_rotulo_(alvo), REFERENCIA: ref, TITULO_OMIE: String(Number(resposta && resposta.codigo_lancamento_omie) || ''),
    DOCUMENTO: OmiePed_s_(param.numero_documento), VALOR: Number(param.valor_documento) || 0, VENCIMENTO: OmiePed_s_(param.data_vencimento), POR: OmiePed_s_(eu && (eu.nome || eu.usuario)), EM: new Date().toISOString() };
  SGO_DATA.insert(OMIE_PED_ABA, linha);
  return linha;
}
/** Propostas aprovadas pelo cliente (mais recentes primeiro)`);
ed('SGO_Omie_Pedidos.js', `    var q = OmiePed_s_((payload || {}).q)`, `    var soPendentes = !!(payload || {}).soPendentes, vinc = {};
    OmiePed_vinculos_().forEach(function (v) { var k = OmiePed_s_(v.PROPOSTA_ID); (vinc[k] = vinc[k] || []).push(v); });
    var q = OmiePed_s_((payload || {}).q)`);
ed('SGO_Omie_Pedidos.js', `      if (termos.some(function (t) { return texto.indexOf(t) < 0; })) return;
      var f = OmiePed_faturamento_(p);`, `      if (termos.some(function (t) { return texto.indexOf(t) < 0; })) return;
      var vs = vinc[OmiePed_s_(p.ID)] || [];
      if (soPendentes && vs.length) return;
      var f = OmiePed_faturamento_(p);`);
ed('SGO_Omie_Pedidos.js', `        pagamento: OmiePed_s_(f.pagamento).slice(0, 300), _ord:`, `        pagamento: OmiePed_s_(f.pagamento).slice(0, 300),
        lancado: vs.length ? { titulos: vs.length, valor: Math.round(vs.reduce(function (s, v) { return s + (Number(v.VALOR) || 0); }, 0) * 100) / 100, ultimoEm: OmiePed_dia_(vs.map(function (v) { return OmiePed_s_(v.EM); }).sort().pop()), por: OmiePed_s_(vs[vs.length - 1].POR) } : null,
        _ord:`);
ed('SGO_Omie_Pedidos.js', `    var rot = OmiePed_rotulo_(p), ref = ('SGO-' + rot.replace(/\\s+rev\\.\\s+/, '-R')).replace(/[^A-Za-z0-9-]/g, '').slice(0, 60);`, `    var rot = OmiePed_rotulo_(p), ref = OmiePed_ref_(p);`);
ed('SGO_Omie_Operacoes.js', `        return { mensagem: 'Operação confirmada no Omie. Atualize a consulta para conferir.', id: Number(r.codigo_lancamento_omie || r.nCodTitulo) || 0 };`, `        // 15/11/2026: conta a receber de pedido aprovado (referência SGO-...): registra o vínculo para a aba Pedidos aprovados
        if (op.acao === 'criar' && op.tipo === 'receber' && typeof OmiePed_registrar_ === 'function') { try { OmiePed_registrar_(op.param, r, eu); } catch (_) {} }
        return { mensagem: 'Operação confirmada no Omie. Atualize a consulta para conferir.', id: Number(r.codigo_lancamento_omie || r.nCodTitulo) || 0 };`);
ed('JS_Omie_Pedidos.html', `  var OMIE_PED = { serial: 0, q: '' };`, `  var OMIE_PED = { serial: 0, q: '', soPendentes: false };`);
ed('JS_Omie_Pedidos.html', `<button class="cadx-btn" type="submit">Buscar</button></form>' +`, `<label class="omie-ped-filtro"><input type="checkbox" id="omiePedPend"' + (OMIE_PED.soPendentes ? ' checked' : '') + ' onchange="OmiePed_listar_()"> Só os sem conta a receber pelo SGO+</label><button class="cadx-btn" type="submit">Buscar</button></form>' +`);
ed('JS_Omie_Pedidos.html', `    OMIE_PED.q = (document.getElementById('omiePedBusca') || {}).value || '';`, `    OMIE_PED.q = (document.getElementById('omiePedBusca') || {}).value || '';
    OMIE_PED.soPendentes = !!(document.getElementById('omiePedPend') || {}).checked;`);
ed('JS_Omie_Pedidos.html', `    OmiePed_rpc_('OmiePed_apiListar', { q: OMIE_PED.q }, function (r) {`, `    OmiePed_rpc_('OmiePed_apiListar', { q: OMIE_PED.q, soPendentes: OMIE_PED.soPendentes }, function (r) {`);
ed('JS_Omie_Pedidos.html', `          (p.pagamento ? '<div class="cadx-sub">Pagamento: ' + esc(p.pagamento) + '</div>' : '') +`, `          (p.pagamento ? '<div class="cadx-sub">Pagamento: ' + esc(p.pagamento) + '</div>' : '') +
          (p.lancado ? '<div class="omie-ped-ok">Lançado no Omie pelo SGO+: ' + p.lancado.titulos + ' título(s), ' + esc(OmieGest_moeda_(p.lancado.valor)) + (p.lancado.ultimoEm ? ', último em ' + esc(p.lancado.ultimoEm) : '') + (p.lancado.por ? ' por ' + esc(p.lancado.por) : '') + '.</div>' : '') +`);
ed('JS_Omie_Pedidos.html', `  #omieTela .omie-ped-alerta { color:#9b1c1c; }`, `  #omieTela .omie-ped-alerta { color:#9b1c1c; }
  #omieTela .omie-ped-ok { color:#1e6b3a; font-weight:600; }
  #omieTela .omie-ped-filtro { display:flex; flex-direction:row; align-items:center; gap:6px; white-space:normal; }
  #omieTela .omie-ped-filtro input { min-height:0; width:auto; }`);
ed('SGO_Ajuda_Financeiro.js', `'Se o cliente está sem CNPJ no SGO+ ou sem cadastro no Omie, a tela diz o que corrigir.'] },`, `'Se o cliente está sem CNPJ no SGO+ ou sem cadastro no Omie, a tela diz o que corrigir.', 'Depois de confirmada no Omie, a conta a receber aparece no pedido como "Lançado no Omie pelo SGO+". Marque "Só os sem conta a receber pelo SGO+" para ver o que falta. Títulos lançados direto no Omie, fora do SGO+, não aparecem nesse aviso.'] },`);
console.log('ok');
