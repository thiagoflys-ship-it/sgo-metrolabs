// Correções da revisão independente (15/11/2026, ~00:20). Uso: node patch-revisao.cjs <pasta do legado>
//  1) Ganhos: referência do Omie não fica presa no formulário (limpa ao abrir a aba, ao marcar "sem proposta" e ao escolher proposta na busca).
//  2) Ganhos: referência por pagamento (OMIE:<título>:<data>) e sugestão descontando o que já foi lançado do mesmo título
//     (título pago em parcelas em meses diferentes). Referência antiga OMIE:<título> continua aceita.
//  3) Ganhos: consultar o Omie exige também a caixa «Consultar o Financeiro no SGO+ (Omie)».
//  4) Gravações: a prévia lê o título sem memória e a confirmação espera 61 s dessa leitura (o Omie recusa a mesma consulta em
//     menos de 1 minuto), dizendo quantos segundos faltam, sem chamar o Omie.
//  5) Lista vazia ("não existem registros") também fica na memória de 60 s.
//  8) Vínculo pedido -> título: referência exata ou exata + "-<número da parcela>"; propostas excluídas fora.
//  9) Aviso "já existe no Omie" também reconhece as parcelas (-1, -2...).
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
function ed(f, a, b) {
  f = path.join(pasta, f);
  let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
  a = a.replace(/\r?\n/g, nl); b = b.replace(/\r?\n/g, nl);
  if (t.split(a).length !== 2) throw new Error('trecho não encontrado uma vez em ' + f + ': ' + a.slice(0, 80));
  fs.writeFileSync(f, t.replace(a, () => b));
}
// 5) lista vazia na memória
ed('SGO_Omie.js', `    if (motivo && /^Listar/.test(chamada) && /não existem registros para a página|nao existem registros para a pagina/i.test(motivo)) return {};`,
  `    if (motivo && /^Listar/.test(chamada) && /não existem registros para a página|nao existem registros para a pagina/i.test(motivo)) {
      if (leitura && cache && chave) { try { cache.put(chave, '{}', 60); } catch (e3) {} } // 15/11/2026: lista vazia também fica 60 s
      return {};
    }`);
// 4) espera entre a leitura da prévia e a releitura da confirmação
ed('SGO_Omie.js', `var OMIE_INTERVALO_MS = 5000;`, `var OMIE_INTERVALO_MS = 5000;
// 15/11/2026: o Omie só responde à mesma consulta uma vez por minuto; a confirmação relê o título da prévia depois disso.
var OMIE_ESPERA_RECONSULTA_MS = 61000;
function Omie_faltaReconsulta_(desde) {
  var espera = typeof OMIE_ESPERA_RECONSULTA_MS === 'number' ? OMIE_ESPERA_RECONSULTA_MS : 0;
  return desde ? Math.max(0, Math.ceil((espera - (Date.now() - Number(desde))) / 1000)) : 0;
}
function Omie_msgReconsulta_(seg) { return 'Para conferir que o título não mudou desde a prévia, o Omie exige 1 minuto entre duas consultas do mesmo título. Nada foi enviado; toque em Confirmar de novo daqui a ' + seg + ' segundo(s). A prévia continua valendo.'; }`);
ed('SGO_Omie_Operacoes.js', `    var original = OmieOps_consultar_(tipo, p.id);`, `    var original = typeof Omie_semCache_ === 'function' ? Omie_semCache_(function () { return OmieOps_consultar_(tipo, p.id); }) : OmieOps_consultar_(tipo, p.id);
    var consultaEm = Date.now(); // 15/11/2026: a confirmação só relê o título 1 minuto depois (regra do Omie)`);
ed('SGO_Omie_Operacoes.js', `  return { acao: acao, tipo: tipo, caminho: caminho, call: call, param: param, resumo: resumo, anterior: anterior, snapshot: snapshot };`,
  `  return { acao: acao, tipo: tipo, caminho: caminho, call: call, param: param, resumo: resumo, anterior: anterior, snapshot: snapshot, consultaEm: typeof consultaEm === 'number' ? consultaEm : 0 };`);
ed('SGO_Omie_Operacoes.js', `      if (op.anterior) {
        // Consulta nova e sem cache: qualquer alteração externa exige outra prévia.`, `      if (op.anterior && typeof Omie_faltaReconsulta_ === 'function') { var faltam = Omie_faltaReconsulta_(op.consultaEm); if (faltam > 0) OmieOps_erro_(Omie_msgReconsulta_(faltam)); }
      if (op.anterior) {
        // Consulta nova e sem cache: qualquer alteração externa exige outra prévia.`);
ed('SGO_Omie_Faturamento.js', `    var d = OmieFat_detalhe_(p.tipo, id);
    OmieFat_status_(Omie_requisitar_(c.path, c.validar, param));`, `    var d = typeof Omie_semCache_ === "function" ? Omie_semCache_(function () { return OmieFat_detalhe_(p.tipo, id); }) : OmieFat_detalhe_(p.tipo, id);
    var consultaEm = Date.now(); // 15/11/2026: a confirmação só relê o documento 1 minuto depois (regra do Omie)
    OmieFat_status_(Omie_requisitar_(c.path, c.validar, param));`);
ed('SGO_Omie_Faturamento.js', `        hash: OmieFat_hash_(JSON.stringify(d)),
        resumo: resumo,
      }),`, `        hash: OmieFat_hash_(JSON.stringify(d)),
        resumo: resumo,
        consultaEm: consultaEm,
      }),`);
ed('SGO_Omie_Faturamento.js', `      if (d.tipo !== "xml") {
        c = OmieFat_config_(d.tipo);
        if (`, `      if (d.tipo !== "xml") {
        c = OmieFat_config_(d.tipo);
        if (typeof Omie_faltaReconsulta_ === "function" && Omie_faltaReconsulta_(d.consultaEm) > 0)
          OmieFat_erro_(Omie_msgReconsulta_(Omie_faltaReconsulta_(d.consultaEm)));
        if (`);
// 2) Ganhos: referência por pagamento e desconto do já lançado
ed('SGO_Omie_Ganhos.js', `      itens.push({ ref: 'OMIE:' + x.nCodTitulo,`, `      itens.push({ ref: 'OMIE:' + x.nCodTitulo + ':' + dia, titulo: String(x.nCodTitulo),`);
ed('SGO_Omie_Ganhos.js', `  var lancados = {};
  GV_recebimentos_().forEach(function (x) { if (GV_up_(x.SITUACAO) !== 'ANULADO' && /^OMIE:/.test(GV_s_(x.REF_EXTERNA))) lancados[GV_s_(x.REF_EXTERNA)] = x; });`,
  `  // 15/11/2026: referência por pagamento (OMIE:<título>:<data>); o que já foi lançado do mesmo título (em qualquer data, inclusive
  // a referência antiga OMIE:<título>) é descontado da sugestão, porque o Omie dá o valor pago acumulado do título.
  var lancados = {}, porTitulo = {};
  GV_recebimentos_().forEach(function (x) {
    var r = GV_s_(x.REF_EXTERNA), m = /^OMIE:(\\d+)/.exec(r);
    if (GV_up_(x.SITUACAO) === 'ANULADO' || !m) return;
    lancados[r] = x; porTitulo[m[1]] = (porTitulo[m[1]] || 0) + GV_cent_(x.VALOR);
  });`);
ed('SGO_Omie_Ganhos.js', `    var ja = lancados[i.ref];`, `    var ja = lancados[i.ref] || lancados['OMIE:' + i.titulo], antes = porTitulo[i.titulo] || 0;
    if (!ja && antes > 0) {
      i.jaLancadoAntes = GV_moeda_(antes / 100);
      i.valor = GV_r2_(Math.max(0, GV_cent_(i.valor) - antes) / 100); i.valorBr = GV_moeda_(i.valor);
      if (!(i.valor > 0)) ja = { PROPOSTA_NUMERO: '', SITUACAO: 'VALIDO', LANCADO_POR_NOME: 'lançamentos anteriores deste título' };
    }
    delete i.titulo;`);
ed('SGO_Ganhos_Vendedores.js', `    var ref = GV_texto_(d.refExterna, 120), doOmie = /^OMIE:\\d+$/.test(ref);`, `    var ref = GV_texto_(d.refExterna, 120), doOmie = /^OMIE:\\d+(:\\d{4}-\\d{2}-\\d{2})?$/.test(ref);`);
// 3) Ganhos: também a caixa de consulta do Omie
ed('SGO_Ganhos_Vendedores.js', `        if (typeof GV_omieRecebimentos_ !== 'function') throw new Error('Não foi possível consultar o Omie: o módulo do Painel financeiro não está carregado. Lance pelo formulário.');`,
  `        if (typeof GV_omieRecebimentos_ !== 'function') throw new Error('Não foi possível consultar o Omie: o módulo do Painel financeiro não está carregado. Lance pelo formulário.');
        if (typeof Omie_exigirAcesso_ === 'function') Omie_exigirAcesso_(sessionId, 'FIN_OMIE_CONSULTAR', 'ver os recebimentos do Omie');`);
ed('SGO_Ganhos_Vendedores.js', `    omie: !!pod.GANHOS_RECEBIMENTOS && typeof GV_omieDisponivel_ === 'function' && GV_omieDisponivel_() };`,
  `    omie: !!pod.GANHOS_RECEBIMENTOS && typeof GV_omieDisponivel_ === 'function' && GV_omieDisponivel_() && (typeof SGO_pode_ !== 'function' || !!SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) };`);
// 1) tela de Ganhos: a referência do Omie não fica presa
ed('JS_GanhosVendedores.html', `  function GvT_recebimentos_() {
    GvT_carregando_();`, `  function GvT_recebimentos_() {
    GV.rec.omieRef = ""; // 15/11/2026: a referência do Omie vale só para o formulário preenchido por "Usar esta proposta"
    GvT_carregando_();`);
ed('JS_GanhosVendedores.html', `    if (t.id === "gvSemProp") { GV.rec.semProp = !!t.checked; GV.rec.prop = null;`, `    if (t.id === "gvSemProp") { GV.rec.semProp = !!t.checked; GV.rec.prop = null; GV.rec.omieRef = "";`);
ed('JS_GanhosVendedores.html', `      case "escolherProp": { GV.rec.prop = (GV.rec.lista || []).filter(function (p) { return p.id === id; })[0] || null;`, `      case "escolherProp": { GV.rec.omieRef = ""; GV.rec.prop = (GV.rec.lista || []).filter(function (p) { return p.id === id; })[0] || null;`);
ed('JS_GanhosVendedores.html', `(i.retencoesBr ? " · retenções " + GvT_esc_(i.retencoesBr) : "")`, `(i.retencoesBr ? " · retenções " + GvT_esc_(i.retencoesBr) : "") + (i.jaLancadoAntes ? " · já lançado antes deste título: " + GvT_esc_(i.jaLancadoAntes) + " (descontado)" : "")`);
// 8) vínculo pelo número exato da referência
ed('SGO_Omie_Pedidos.js', `  var alvo = null;
  SGO_DATA.getAll('COM_PROPOSTAS').forEach(function (p) {
    if (alvo || OmiePed_s_(p.SITUACAO).toUpperCase() !== 'APROVADA') return;
    var r = OmiePed_ref_(p);
    if (ref === r || ref.indexOf(r + '-') === 0) alvo = p;
  });`, `  // 15/11/2026: referência exata, ou exata + "-<número da parcela>"; propostas excluídas fora.
  var base = ref.replace(/-\\d+$/, ''), alvo = null, porBase = null;
  SGO_DATA.getAll('COM_PROPOSTAS').forEach(function (p) {
    if (OmiePed_s_(p.SITUACAO).toUpperCase() !== 'APROVADA' || OmiePed_s_(p.EXCLUIDA_EM)) return;
    var r = OmiePed_ref_(p);
    if (r === ref) alvo = p; else if (r === base && !porBase) porBase = p;
  });
  alvo = alvo || porBase;`);
// 9) aviso com parcelas
ed('SGO_Omie_Pedidos.js', `    var jaComRef = (existentes || []).filter(function (x) { return x.integracao === ref; }).length > 0;`,
  `    var jaComRef = (existentes || []).filter(function (x) { return x.integracao === ref || (x.integracao.indexOf(ref + '-') === 0 && /^\\d+$/.test(x.integracao.slice(ref.length + 1))); }).length > 0;`);
console.log('ok');
