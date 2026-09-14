const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..", "apps-script-imports", "portal_sgo_versao_cnpj_db");
function read(name) { return fs.readFileSync(path.join(base, name), "utf8"); }

const backend = read("SGO_AlertasPadroes.js");
new Function(backend);

["JS_Core.html", "JS_Admin.html"].forEach((name) => {
  const blocks = [...read(name).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (!blocks.length) throw new Error("Nenhum bloco script em " + name);
  blocks.forEach((code, i) => {
    try { new Function(code); } catch (e) { throw new Error(name + " bloco " + i + ": " + e.message); }
  });
});

const core = read("JS_Core.html");
const admin = read("JS_Admin.html");
const css = read("UI_Estilos.html");
const checks = {
  autorizacaoAdminServidor: backend.includes('SGO_UTILS.safeUpper(sessao.perfil) !== "ADMIN"'),
  usaClassificacaoReal: backend.includes("CertCal_classificarValidadePadrao_"),
  configuracaoPersistente: backend.includes("SGO_ALERTAS_PADROES_CONFIG_V1"),
  iniciaNosDoisLogins: (core.match(/iniciarAlertasPadroesGlobais_\(\);/g) || []).length === 2,
  paraNoLogout: core.includes("pararAlertasPadroesGlobais_();"),
  preservaConteudo: !core.includes('document.getElementById("conteudo").innerHTML =') || core.includes("padroes-critico-overlay"),
  abreCertCal: core.includes('abrir("certificado_calibracao")'),
  bloqueiaSalvamentoRepetido: admin.includes('btn.disabled = true; btn.textContent = "Salvando..."'),
  adminSomenteAdmin: admin.includes('perfil !== "ADMIN"'),
  estilosResponsivos: css.includes(".padroes-critico-overlay") && css.includes("@media(max-width:600px)")
};
const falhas = Object.keys(checks).filter((k) => !checks[k]);
if (falhas.length) throw new Error("Falhas: " + falhas.join(", "));
console.log("OK:", Object.keys(checks).join(", "));
