// Ganhos dos vendedores (15/11/2026): recebimentos do Omie como sugestões (SGO_Omie_Ganhos.js). O Financeiro escolhe a proposta
// sugerida e lança pelo formulário de sempre; ORIGEM 'OMIE' e REF_EXTERNA 'OMIE:<título>' impedem lançar o mesmo título duas vezes.
// Uso: node patch-ganhos-omie.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
let arq = '', t = '';
function abrir(f) { arq = path.join(pasta, f); t = fs.readFileSync(arq, 'utf8'); }
function gravar() { fs.writeFileSync(arq, t); }
function trocar(de, para, rotulo) {
  const tentativas = [[de, para], [de.replace(/\r?\n/g, '\r\n'), para.replace(/\r?\n/g, '\r\n')]];
  for (const [a, b] of tentativas) {
    const n = t.split(a).length - 1;
    if (n === 1) { t = t.replace(a, () => b); return; }
    if (n > 1) throw new Error('trecho repetido: ' + rotulo);
  }
  throw new Error('trecho não encontrado: ' + rotulo + ' em ' + arq);
}

abrir('SGO_Ganhos_Vendedores.js');
trocar(`    var linha = { ID: GV_id_(), ORIGEM: 'MANUAL', REF_EXTERNA: GV_texto_(d.refExterna, 120), DATA_RECEBIMENTO: dia,`,
  `    // 15/11/2026: recebimento sugerido pelo Omie (SGO_Omie_Ganhos.js): origem OMIE e o mesmo título do Omie não entra duas vezes.
    var ref = GV_texto_(d.refExterna, 120), doOmie = /^OMIE:\\d+$/.test(ref);
    if (ref && !doOmie) ref = '';
    if (doOmie) {
      var jaOmie = GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) !== 'ANULADO' && GV_s_(r.REF_EXTERNA) === ref; })[0];
      if (jaOmie) throw new Error('Não foi possível lançar: este recebimento do Omie já foi lançado' + (GV_s_(jaOmie.PROPOSTA_NUMERO) ? ' na proposta ' + GV_s_(jaOmie.PROPOSTA_NUMERO) : ' (a classificar)') + ' por ' + GV_s_(jaOmie.LANCADO_POR_NOME) + ' em ' + GV_br_(jaOmie.LANCADO_EM) + '. Se o lançamento está errado, anule-o com o motivo e lance de novo.');
    }
    var linha = { ID: GV_id_(), ORIGEM: doOmie ? 'OMIE' : 'MANUAL', REF_EXTERNA: ref, DATA_RECEBIMENTO: dia,`, 'lancar');
trocar(`  return { recebimentos: l.slice(0, 300).map(GV_recParaTela_), total: l.length, aClassificar: aClass, podeLancar: !!pod.GANHOS_RECEBIMENTOS };`,
  `  return { recebimentos: l.slice(0, 300).map(GV_recParaTela_), total: l.length, aClassificar: aClass, podeLancar: !!pod.GANHOS_RECEBIMENTOS,
    omie: !!pod.GANHOS_RECEBIMENTOS && typeof GV_omieDisponivel_ === 'function' && GV_omieDisponivel_() };`, 'listar');
trocar(`      case 'lancarRecebimento': r = GV_lancarRecebimento_(eu, dados); break;`, `      case 'lancarRecebimento': r = GV_lancarRecebimento_(eu, dados); break;
      case 'omieRecebimentos': // 15/11/2026: SGO_Omie_Ganhos.js
        if (typeof GV_omieRecebimentos_ !== 'function') throw new Error('Não foi possível consultar o Omie: o módulo do Painel financeiro não está carregado. Lance pelo formulário.');
        r = GV_omieRecebimentos_(eu, dados); break;`, 'api');
gravar();

abrir('JS_GanhosVendedores.html');
trocar(`      if (r.aClassificar) h += '<div class="vg-faixa is-alerta">'`, `      // 15/11/2026: recebimentos do Omie como sugestões (o lançamento continua sendo feito e conferido pelo Financeiro)
      if (r.podeLancar && r.omie) h += '<div class="vg-bloco" id="gvOmieBloco"><h3>Recebimentos do Omie</h3><p class="vg-sub">O que entrou na conta pelo Omie no mês, com as propostas aprovadas do mesmo cliente (pelo CNPJ). Toque em "Usar esta proposta" para preencher o formulário acima; confira e toque em Lançar. Nada é lançado sozinho.</p>' +
        '<div class="gv-filtros"><label for="gvOmieComp">Mês do pagamento<input type="month" id="gvOmieComp" value="' + GvT_esc_(GV.rec.omieComp || (GV.ini && GV.ini.competenciaAtual) || "") + '"></label>' + GvT_bt_("Ver recebimentos do Omie", "omieVer", "", "", ' data-livre="1"') + '</div><div id="gvOmieLista">' + GvT_omieHtml_() + '</div></div>';
      if (r.aClassificar) h += '<div class="vg-faixa is-alerta">'`, 'bloco');
trocar(`  function GvT_formRec_() {`, `  // 15/11/2026: lista dos recebimentos do Omie (GV.rec.omie guarda a última consulta, para sobreviver ao redesenho da aba)
  function GvT_omieHtml_() {
    var o = GV.rec.omie; if (!o) return "";
    var h = '<p class="vg-sub">' + GvT_esc_(o.de) + " a " + GvT_esc_(o.ate) + ": recebido " + GvT_esc_(o.totais.recebidoBr) + ", já lançado " + GvT_esc_(o.totais.lancadoBr) + ", falta lançar " + GvT_esc_(o.totais.pendenteBr) + " (" + o.pendentes + "). Consultado em " + GvT_esc_(o.atualizadoEm) + ".</p>";
    if (!o.itens.length) return h + GvT_vazio_("Nenhum recebimento no Omie neste mês.", "");
    return h + o.itens.map(function (i, k) {
      var cab = '<div class="vg-item-cab"><b>' + GvT_esc_(i.dataBr) + ' · <span class="gv-num">' + GvT_esc_(i.valorBr) + "</span></b>" + (i.jaLancado ? GvT_sit_("VALIDO", "Já lançado") : GvT_sit_("A_CLASSIFICAR", "Falta lançar")) + "</div>";
      var sub = '<div class="vg-sub">' + GvT_esc_(i.cliente || "cliente sem nome no Omie") + " · " + GvT_esc_(i.documento) + (i.parcial ? " · pagamento parcial" : "") + "</div>";
      var corpo = "";
      if (i.jaLancado) corpo = '<div class="vg-sub">' + (i.jaLancado.proposta ? "Proposta " + GvT_esc_(i.jaLancado.proposta) : "Sem proposta") + " · " + GvT_esc_(i.jaLancado.situacao) + " · lançado por " + GvT_esc_(i.jaLancado.lancadoPor) + "</div>";
      else if (i.propostas.length) corpo = '<div class="gv-props">' + i.propostas.map(function (p) {
        return '<button type="button" class="cadx-btn gv-prop" data-gv="omieUsar" data-id="' + k + ":" + GvT_esc_(p.id) + '" data-livre="1"><span>Usar esta proposta: <b>' + GvT_esc_(p.numero) + "</b> · saldo " + GvT_esc_(p.saldoBr) + (p.cabe ? "" : " (menor que o valor)") + " · " + GvT_esc_(p.semVendedor ? "sem vendedor responsável" : "vendedor " + p.vendedor) + "</span></button>";
      }).join("") + "</div>";
      else corpo = '<div class="vg-sub">' + (i.clienteNoSgo ? "O cliente não tem proposta aprovada no SGO+." : "O CNPJ deste cliente não está no cadastro de clientes do SGO+.") + " Busque a proposta no formulário ou lance sem proposta.</div>" +
        '<div class="gv-acoes">' + GvT_bt_("Preencher o formulário sem proposta", "omieSemProp", String(k), "", ' data-livre="1"') + "</div>";
      return '<div class="vg-item" style="margin-bottom:8px">' + cab + sub + corpo + "</div>";
    }).join("");
  }
  function GvT_omieVer_() {
    GV.rec.omieComp = GvT_v_("gvOmieComp");
    var alvo = GvT_$("gvOmieLista"); if (alvo) alvo.innerHTML = '<p class="vg-sub">Consultando o Omie…</p>';
    GvT_chamar_("omieRecebimentos", { competencia: GV.rec.omieComp }, function (r) { GV.rec.omie = r; var a = GvT_$("gvOmieLista"); if (a) a.innerHTML = GvT_omieHtml_(); },
      function (m) { var a = GvT_$("gvOmieLista"); if (a) a.innerHTML = '<div class="vg-faixa is-erro">' + GvT_esc_(m) + "</div>"; }, { livre: true });
  }
  /** Preenche o formulário de lançamento com o recebimento do Omie (e a proposta escolhida, se houver). */
  function GvT_omiePreencher_(k, propId) {
    var i = GV.rec.omie && GV.rec.omie.itens[Number(k)]; if (!i) return;
    var form = GvT_$("gvRecData"), bl = form ? form.closest(".vg-bloco") : null; if (!bl) return;
    GV.rec.semProp = !propId; GV.rec.prop = propId ? (i.propostas.filter(function (p) { return p.id === propId; })[0] || null) : null; GV.rec.omieRef = i.ref;
    bl.innerHTML = '<h3>Lançar recebimento</h3><div class="vg-faixa is-ok">Preenchido com o recebimento do Omie: ' + GvT_esc_(i.documento) + ", " + GvT_esc_(i.valorBr) + " em " + GvT_esc_(i.dataBr) + ". Confira e toque em Lançar.</div>" + GvT_formRec_();
    GvT_$("gvRecData").value = i.data; GvT_$("gvRecValor").value = GvT_numBr_(i.valor, 2); GvT_$("gvRecDoc").value = i.documento;
    if (!propId && GvT_$("gvRecCli")) GvT_$("gvRecCli").value = i.cliente;
    if (!propId) GvT_$("gvRecObs").value = "Recebimento do Omie sem proposta encontrada no SGO+ (" + i.documento + ").";
    try { bl.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {}
  }
  function GvT_formRec_() {`, 'omieTela');
trocar(`    if (GV.rec.semProp) { d.semProposta = true; d.clienteNome = GvT_v_("gvRecCli"); }`, `    if (GV.rec.omieRef) d.refExterna = GV.rec.omieRef; // 15/11/2026: recebimento sugerido pelo Omie
    if (GV.rec.semProp) { d.semProposta = true; d.clienteNome = GvT_v_("gvRecCli"); }`, 'lancarRef');
trocar(`    GvT_chamar_("lancarRecebimento", d, function (r) {
      GV.rec.prop = null;`, `    GvT_chamar_("lancarRecebimento", d, function (r) {
      GV.rec.prop = null; GV.rec.omieRef = ""; GV.rec.omie = null; GV.rec.semProp = false;`, 'lancarLimpa');
trocar(`      case "lancar": GvT_lancar_(); break;`, `      case "lancar": GvT_lancar_(); break;
      case "omieVer": GvT_omieVer_(); break;
      case "omieUsar": { var pp = id.split(":"); GvT_omiePreencher_(pp[0], pp.slice(1).join(":")); break; }
      case "omieSemProp": GvT_omiePreencher_(id, ""); break;`, 'cliques');
gravar();
console.log('ok');
