const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
function setup() {
  const props = new Map([["OMIE_APP_KEY", "app"]]),
    cache = new Map(),
    calls = [];
  let detail = {
    cabecalho: { numero_pedido: "42", codigo_cliente: 8 },
    det: [{}],
    total_pedido: { valor_total_pedido: 50 },
  };
  const ctx = {
    Date,
    Number,
    JSON,
    Utilities: {
      DigestAlgorithm: { MD5: "md5", SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (alg, s) =>
        Array.from(crypto.createHash(alg).update(s).digest()),
      newBlob: (s) => ({ getBytes: () => Array.from(Buffer.from(s)) }),
      getUuid: () => crypto.randomUUID(),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => props.get(k) || null,
        setProperty: (k, v) => props.set(k, v),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        put: (k, v) => cache.set(k, v),
        get: (k) => cache.get(k) || null,
        remove: (k) => cache.delete(k),
      }),
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
    },
    Omie_exigirAcesso_: (s) => {
      if (s !== "valid") throw Error("secret error");
    },
    Omie_requisitar_: (p, c, param) => {
      calls.push({ p, c, param });
      if (c === "ConsultarPedido") return detail;
      return { cCodStatus: "0", listaPedidosVenda: [] };
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Omie_Faturamento.js",
      ),
      "utf8",
    ),
    ctx,
  );
  return { ctx, props, cache, calls, setDetail: (d) => (detail = d) };
}
test("acesso negado não consulta e não revela erro interno", () => {
  const s = setup(),
    r = s.ctx.OmieFat_apiListar("bad", { tipo: "produtos" });
  assert.equal(r.ok, false);
  assert.equal(s.calls.length, 0);
  assert.ok(!r.mensagem.includes("secret"));
});
test("faturamento exige prévia da mesma sessão e bloqueia repetição", () => {
  const s = setup(),
    pre = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  assert.equal(pre.ok, true);
  const p = { token: pre.token, confirmacao: "CONFIRMAR" };
  assert.equal(s.ctx.OmieFat_apiConfirmar("valid", p).ok, true);
  assert.equal(s.ctx.OmieFat_apiConfirmar("valid", p).ok, false);
  assert.equal(s.calls.filter((c) => c.c === "FaturarPedidoVenda").length, 1);
  const pre2 = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  assert.equal(
    s.ctx.OmieFat_apiConfirmar("valid", {
      token: pre2.token,
      confirmacao: "CONFIRMAR",
    }).jaProcessado,
    true,
  );
});
test("mudança após prévia impede envio", () => {
  const s = setup(),
    pre = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  s.setDetail({ cabecalho: { numero_pedido: "alterado" } });
  assert.equal(
    s.ctx.OmieFat_apiConfirmar("valid", {
      token: pre.token,
      confirmacao: "CONFIRMAR",
    }).ok,
    false,
  );
  assert.equal(s.calls.filter((c) => c.c === "FaturarPedidoVenda").length, 0);
});
test("timeout guarda marcador e impede novo envio", () => {
  const s = setup(),
    original = s.ctx.Omie_requisitar_;
  s.ctx.Omie_requisitar_ = (p, c, a) => {
    if (c === "FaturarPedidoVenda") {
      s.calls.push({ c });
      throw Error("credential secret");
    }
    return original(p, c, a);
  };
  const pre = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  const r = s.ctx.OmieFat_apiConfirmar("valid", {
    token: pre.token,
    confirmacao: "CONFIRMAR",
  });
  assert.equal(r.ok, false);
  assert.ok(!r.mensagem.includes("secret"));
  const pre2 = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  assert.equal(
    s.ctx.OmieFat_apiConfirmar("valid", {
      token: pre2.token,
      confirmacao: "CONFIRMAR",
    }).ok,
    false,
  );
  assert.equal(s.calls.filter((c) => c.c === "FaturarPedidoVenda").length, 1);
});
test("rejeita XML com DTD antes do parser e conversão produz hash correto", () => {
  const s = setup();
  assert.equal(
    s.ctx.OmieFat_apiPreviaXml("valid", { xml: "<!DOCTYPE x><x/>" }).ok,
    false,
  );
  assert.equal(
    s.ctx.OmieFat_xmlConverter_("<x>ação &</x>"),
    "&lt;x&gt;acao &amp;&lt;/x&gt;",
  );
  assert.equal(
    s.ctx.OmieFat_hash_("abc", true),
    "900150983cd24fb0d6963f7d28e17f72",
  );
});
test("scripts frontend são sintaticamente válidos", () => {
  new vm.Script(
    fs
      .readFileSync(
        path.join(
          __dirname,
          "../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Omie_Faturamento.html",
        ),
        "utf8",
      )
      .replace(/^<script>\s*/, "")
      .replace(/<\/script>\s*$/, ""),
  );
});

test("pr?via n?o ? utiliz?vel por outra sess?o autorizada", () => {
  const s = setup(),
    pre = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  s.ctx.Omie_exigirAcesso_ = () => ({});
  assert.equal(
    s.ctx.OmieFat_apiConfirmar("outra", {
      token: pre.token,
      confirmacao: "CONFIRMAR",
    }).ok,
    false,
  );
  assert.equal(s.calls.filter((c) => c.c === "FaturarPedidoVenda").length, 0);
});
test("NFS-e com estrutura desconhecida n?o ? recebida", () => {
  const s = setup();
  s.ctx.XmlService = {
    parse: () => ({
      getRootElement: () => ({
        getName: () => "qualquer",
        getChildren: () => [],
      }),
    }),
  };
  assert.equal(
    s.ctx.OmieFat_apiPreviaDocumento("valid", {
      tipo: "nfse",
      xml: "<qualquer/>",
    }).ok,
    false,
  );
});

test("troca de empresa invalida previa", () => {
  const s = setup(),
    pre = s.ctx.OmieFat_apiPrevia("valid", { tipo: "produtos", id: 42 });
  s.props.set("OMIE_APP_KEY", "outra empresa");
  assert.equal(
    s.ctx.OmieFat_apiConfirmar("valid", {
      token: pre.token,
      confirmacao: "CONFIRMAR",
    }).ok,
    false,
  );
  assert.equal(s.calls.filter((c) => c.c === "FaturarPedidoVenda").length, 0);
});

test("notas renderiza seletor de tipo documental", () => {
  const corpo = { innerHTML: "" };
  const ctx = {
    document: { getElementById: (id) => (id === "omieCorpo" ? corpo : null) },
    CadUI_esc_: (s) => s,
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs
      .readFileSync(
        path.join(
          __dirname,
          "../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Omie_Faturamento.html",
        ),
        "utf8",
      )
      .replace(/^<script>\s*/, "")
      .replace(/<\/script>\s*$/, ""),
    ctx,
  );
  ctx.OmieFat_render_("notas");
  assert.ok(corpo.innerHTML.includes('id="omieFatTipo"'));
  assert.ok(corpo.innerHTML.includes('value="compra"'));
  assert.ok(corpo.innerHTML.includes('value="nfse"'));
});
test("callback antigo nao atua depois de trocar tela ou sessao", () => {
  let success,
    rendered = 0,
    sessao = "s1",
    elemento = {};
  const run = {
    withSuccessHandler: (fn) => {
      success = fn;
      return run;
    },
    withFailureHandler: () => run,
    consultar: () => {},
  };
  const ctx = {
    document: { getElementById: () => elemento },
    SGO_getSessionId: () => sessao,
    google: { script: { run } },
    OMIE_TELA: { pedido: 1 },
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs
      .readFileSync(
        path.join(
          __dirname,
          "../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Omie_Faturamento.html",
        ),
        "utf8",
      )
      .replace(/^<script>\s*/, "")
      .replace(/<\/script>\s*$/, ""),
    ctx,
  );
  ctx.OmieFat_chamar_("consultar", {}, () => rendered++);
  ctx.OMIE_TELA.pedido = 2;
  success({ ok: true });
  assert.equal(rendered, 0);
  ctx.OmieFat_chamar_("consultar", {}, () => rendered++);
  sessao = "s2";
  success({ ok: true });
  assert.equal(rendered, 0);
});
