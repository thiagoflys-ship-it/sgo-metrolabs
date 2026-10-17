/**
 * SGO_RelTecA4.js — padrão visual comum dos documentos técnicos impressos em A4
 * (Certificado e Relatório de calibração, relatórios gerenciais de padrões, Laudo NR-13,
 * Declaração de execução, Relatório QI/QO/QD, PGT, POP, Planejamento CME, Cronograma de
 * execução e Registros operacionais).
 *
 * RelTecA4_css_(opcoes) → CSS de página com cabeçalho e rodapé corridos em todas as páginas:
 *   à esquerda do cabeçalho, o título do documento; à direita, número e revisão;
 *   no rodapé, a empresa e "Página X de Y". A primeira página fica sem o cabeçalho corrido
 *   (ela já traz a logo e o título). Concatenar DEPOIS de SGO_DocA4_css_(): o rodapé
 *   "Página X de Y" daqui substitui o dele, sem duplicar.
 *   opcoes: { titulo, numero, revisao, empresa }
 *
 * RelTecA4_revisao_(valor) → revisão com dois dígitos ("00", "01"...); vazio vira "00".
 * RelTecA4_empresa_()      → nome da empresa executante da configuração dos documentos.
 */

function RelTecA4_textoCss_(s) {
  return '"' + String(s == null ? '' : s)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"') + '"';
}

function RelTecA4_revisao_(valor) {
  var s = String(valor == null ? '' : valor).trim();
  if (!s) return '00';
  if (/^\d+$/.test(s)) { var n = String(Number(s)); return n.length < 2 ? '0' + n : n; }
  return s;
}

function RelTecA4_empresa_() {
  try {
    var cfg = (typeof CadeiaFrioRel_CFCFG !== 'undefined') ? CadeiaFrioRel_CFCFG : null;
    var e = cfg && cfg.EMPRESA_EXECUTANTE;
    if (e && e.nome) return String(e.nome) + (e.cnpj ? ' — CNPJ ' + e.cnpj : '');
  } catch (err) { /* sem configuração: usa o nome padrão */ }
  return 'Metrolab Soluções em Engenharia Clínica LTDA';
}

function RelTecA4_css_(opcoes) {
  var o = opcoes || {};
  var direita = [
    o.numero ? 'Nº ' + o.numero : '',
    (o.revisao !== undefined && o.revisao !== null) ? 'Revisão ' + RelTecA4_revisao_(o.revisao) : ''
  ].filter(Boolean).join(' · ');
  var fonte = 'font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#6b7280;';
  var topo = fonte + 'vertical-align:bottom;padding-bottom:4mm;';
  var pe = fonte + 'vertical-align:top;padding-top:4mm;';
  return '' +
    '@page{' +
      '@top-left{content:' + RelTecA4_textoCss_(o.titulo || '') + ';' + topo + 'text-align:left}' +
      '@top-right{content:' + RelTecA4_textoCss_(direita) + ';' + topo + 'text-align:right}' +
      '@bottom-left{content:' + RelTecA4_textoCss_(o.empresa || RelTecA4_empresa_()) + ';' + pe + 'text-align:left}' +
      '@bottom-right{content:"Página " counter(page) " de " counter(pages);' + pe + 'text-align:right}' +
    '}' +
    '@page:first{@top-left{content:none}@top-right{content:none}}';
}
