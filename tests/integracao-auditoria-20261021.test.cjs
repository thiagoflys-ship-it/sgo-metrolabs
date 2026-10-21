// Auditoria de integração de 21/10/2026 (SGO+ no servidor de ensaio local, banco novo, só dados de teste): defeitos que
// só apareciam com os módulos juntos. Código real do SGO+ num contexto isolado; nada sai de verdade.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

/** Lê só a configuração (const/var de topo) de um arquivo, sem executar o resto. */
function cfgDe(arquivo, nome) {
  const ctx = vm.createContext({});
  vm.runInContext(ler(arquivo), ctx, { filename: arquivo });
  return vm.runInContext(nome, ctx);
}
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

test('tipo do equipamento: cada módulo de qualificação aceita só o seu tipo (baixa temperatura não é autoclave; lavadora ultrassônica não é cadeia de frio)', () => {
  const re = {
    autoclave: cfgDe('SGO_AutoRel_ModeloOficialNovo.js', 'AUTOFICIAL_CFG').TIPO_EQUIPAMENTO_RE,
    lavadora: cfgDe('SGO_LavRel_ModeloOficialNovo.js', 'LAVOFICIAL_CFG').TIPO_EQUIPAMENTO_RE,
    frio: cfgDe('SGO_CadeiaFrioRel_Qualificacao.js', 'CADEIAFRIO_QCFG').TIPO_EQUIPAMENTO_RE,
    estufa: cfgDe('SGO_EstufaBanhoRel_Qualif.js', 'ESTUFAQ_CFG').TIPO_EQUIPAMENTO_RE
  };
  const esperado = {
    'AUTOCLAVE': ['autoclave'], 'ESTERILIZADOR A VAPOR': ['autoclave'], 'Autoclave de bancada': ['autoclave'],
    'ESTERILIZADOR A BAIXA TEMPERATURA': [], 'ESTERILIZADOR A BAIXA TEMPERATURA (PERÓXIDO DE HIDROGÊNIO)': [], 'Esterilizador a plasma': [], 'Esterilizador por óxido de etileno': [],
    'LAVADORA TERMODESINFECTORA': ['lavadora'], 'LAVADORA ULTRASSÔNICA': ['lavadora'], 'Lavadora ultrasônica': ['lavadora'],
    'REFRIGERADOR': ['frio'], 'CÂMARA FRIA': ['frio'], 'ULTRACONGELADOR': ['frio'], 'Ultrafreezer': ['frio'], 'CAIXA TÉRMICA': ['frio'],
    'ESTUFA': ['estufa'], 'BANHO-MARIA': ['estufa'], 'SECADORA': ['estufa']
  };
  for (const [tipo, mods] of Object.entries(esperado)) {
    const achou = Object.keys(re).filter((k) => re[k].test(semAcento(tipo)));
    assert.deepEqual(achou, mods, tipo);
  }
  // a lista de tipos do cadastro tem o esterilizador a baixa temperatura (para o fluxo cliente → unidade → equipamento)
  assert.match(ler('JS_Equipamentos.html'), /"ESTERILIZADOR A BAIXA TEMPERATURA"/);
});

test('seletor de arquivo em português: a varredura não regrava o nome sem mudança (sem laço que impedia o botão de ajuda)', () => {
  const core = ler('JS_Core.html');
  const ini = core.indexOf('SELETOR DE ARQUIVO EM PORTUGUÊS');
  assert.ok(ini > 0);
  const trecho = core.slice(ini, core.indexOf('</script>', ini));
  assert.doesNotMatch(trecho, /if \(i && n\) n\.textContent = SGO_arquivoTexto_\(i\);/, 'gravação sem conferir o texto (gerava mutação a cada 120 ms)');
  assert.match(trecho, /if \(n\.textContent !== t\) n\.textContent = t;/);
  // simulação: com o nome já certo, a varredura não muda nada (nenhuma mutação, nenhuma nova varredura)
  let gravacoes = 0;
  const nome = { _t: 'Nenhum arquivo escolhido', get textContent() { return this._t; }, set textContent(v) { gravacoes++; this._t = v; } };
  const input = { files: [], closest: () => null };
  const caixa = { querySelector: (s) => (/file/.test(s) ? input : nome) };
  let agendados = 0;
  const ctx = vm.createContext({
    window: { getComputedStyle: () => ({ display: 'inline', visibility: 'visible' }) },
    document: { readyState: 'complete', body: {}, querySelectorAll: (s) => (/^\.sgo-arquivo$/.test(s) ? [caixa] : []), addEventListener() {} },
    MutationObserver: function () { this.observe = () => {}; },
    setTimeout: () => { agendados++; }
  });
  const js = trecho.slice(trecho.indexOf('function SGO_arquivoTexto_'));
  vm.runInContext(js, ctx);
  assert.equal(gravacoes, 0, 'nome já certo: nada é gravado');
  // arquivo escolhido: o nome muda uma vez
  input.files = [{ name: 'orcamento.pdf' }];
  ctx.document.querySelectorAll = (s) => (/^\.sgo-arquivo$/.test(s) ? [caixa] : []);
  vm.runInContext(js.replace(/function SGO_arquivoTexto_[\s\S]*?\n  \}\n/, ''), ctx);
  assert.equal(gravacoes, 1);
  assert.equal(nome.textContent, 'orcamento.pdf');
  void agendados;
});
