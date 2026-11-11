// Scanner v1: chamadas de funções-porteiro + checagens em linha (perfil/eu.flag/listas).
// Saída: JSON com uma linha por ocorrência.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const gates = fs.readFileSync(process.argv[3], 'utf8').trim().split(',');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reCall = new RegExp('\\b(' + gates.map(esc).join('|') + ')\\s*\\(', 'g');
// checagens em linha
const reInline = [
  { id: 'perfil_literal', re: /(perfil[A-Za-z]*\)?|\.perfil\)?|PERFIL\)?|\bp\b|perfilNr|perfilAuvo)\s*[!=]==?\s*['"](ADMIN|DIRETORIA|GESTOR|FINANCEIRO|COMERCIAL|METROLOGIA|TECNICO|RH)['"]/ },
  { id: 'perfil_lista', re: /\[\s*['"](ADMIN|DIRETORIA|GESTOR|RH|FINANCEIRO|TECNICO|METROLOGIA|COMERCIAL)['"][^\]]*\]\s*\.\s*(indexOf|includes)\s*\(\s*(perfil|p\b|FrotaBlq|Ges_up_|SGO_UTILS)/ },
  { id: 'perfis_cfg', re: /\b(PERFIS_[A-Z_]+|perfisAprovadores|WAP_PERFIS_TELA|FBLQ_ODO_PERFIS|AUT_PERFIS_INTERNOS|SGO_ASSIST_PAINEL|SGO_ASSIST_GESTAO|LAVCIC_PERFIS_REFERENCIA|SGO_QEQ_PERFIS_EQUIPE)\b.*\.indexOf\(/ },
  { id: 'eu_flag', re: /\bif\s*\(\s*!?\s*\(?\s*!?\s*(eu|u|ctx)\.(gestao|gestor|catalogo|catalogoVenda|veCusto|veValores|veFila|diretoria|admin|financeiro|vendedor|comprador|regras|valores|excluir|configurar|verTodos|tratar|rh|ligaDesliga|painel|veRestritas|interno|tecnico)\b/ },
  { id: 'eu_flag_throw', re: /\b(eu|u)\.(gestao|admin|diretoria|catalogo|veCusto|ligaDesliga)\b.*(throw|comFalha_)/ },
  { id: 'perfil_cliente', arq: /^SGO_(Clientes|Unidades|Equipamentos|Documentos)\.js$/, re: /perfil\)?\s*[!=]==\s*"CLIENTE"/ },
  { id: 'id_fixo', re: /['"](b36756b2-d5e1-474d-9ae3-f5e5826a6c13|f5c4cb0e-a3bf-4988-9a78-94738cd3f912|2263e0c4-e5d2-48f4-bf2c-86badf283993)['"]/ },
  { id: 'lista_cfg', re: /\b(compradores|triagem\)?\.responsaveis|gestoresPorArea|Rep_responsaveis_\(\)|Rep_emNomeCfg_\(\)|rhIds|SGO_MP_responsaveis_\(\)|COM_ACOES_ADMIN_)\b[^;]*\.indexOf\(/ },
];
const out = [];
for (const f of fs.readdirSync(dir).sort()) {
  if (!/\.js$/.test(f) || /Ajuda|AssistenteManuais|_ConteudoModulo|MigracaoExportar/.test(f)) continue;
  const L = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
  let fn = '', kase = '';
  L.forEach((l, i) => {
    if (l.length > 3000) return; // linhas minificadas tratadas à parte
    const mf = /^\s*function\s+([A-Za-z0-9_$]+)\s*\(/.exec(l) || /^\s*(?:var|const|let)\s+([A-Za-z0-9_$]+)\s*=\s*function/.exec(l) || /^\s{0,6}([A-Za-z0-9_$]+)\s*:\s*function\s*\(/.exec(l);
    if (mf) { fn = mf[1]; kase = ''; }
    const mc = /case\s+['"]([^'"]+)['"]\s*:/.exec(l); if (mc) kase = mc[1];
    const trecho = l.trim().slice(0, 240);
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    let achou = false, m; reCall.lastIndex = 0;
    while ((m = reCall.exec(l))) {
      if (new RegExp('function\\s+' + esc(m[1]) + '\\s*\\(').test(l)) continue;
      const resto = l.slice(m.index, m.index + 260);
      const acao = (/,\s*'([^']{3,110})'\s*\)/.exec(resto) || /,\s*"([^"]{3,110})"\s*\)/.exec(resto) || [])[1] || '';
      const nivel = (/^[A-Za-z_]+\s*\(\s*[A-Za-z_.]+\s*,\s*'([A-Za-z_]+)'/.exec(resto) || [])[1] || '';
      out.push({ arquivo: f, linha: i + 1, funcao: fn, caso: kase, gate: m[1], nivel, acao, trecho });
      achou = true;
    }
    if (achou) return;
    for (const r of reInline) {
      if (r.arq && !r.arq.test(f)) continue;
      if (r.re.test(l)) { out.push({ arquivo: f, linha: i + 1, funcao: fn, caso: kase, gate: 'inline:' + r.id, nivel: '', acao: '', trecho }); break; }
    }
  });
}
// arquivos minificados (uma linha só): CertCal_Main, RelCal_Main, DeclaracaoExec_Main
const mini = [
  ['SGO_CertCal_Main.js', /CertCal_exigirPerfilEmissor_\(sessionId,fn\)|SGO_bloquearRH_\(sessaoCertCalRH|CertCal_exigirAcessoCliente_\(/g],
  ['SGO_RelCal_Main.js', /RelCal_exigirEquipe_\(req\.sessionId\)/g],
  ['SGO_DeclaracaoExec_Main.js', /DeclExecQIQO_exigirEquipe_\(String/g],
];
module.exports = out;
if (require.main === module) fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 0));
