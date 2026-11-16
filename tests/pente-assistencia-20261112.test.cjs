// Pente fino da Assistência técnica (12/11/2026): defeitos que só aparecem no uso real. Cada teste falha na base de produção
// (imagem campo-fotos-20261112) e passa na candidata. Código real num contexto isolado (tests/_assistencia_ambiente.cjs);
// só dados de teste; relógio fixo; trava não reentrante. A "chamada concorrente" é simulada assim: quando a primeira chamada
// pede a trava, uma segunda chamada completa roda antes (como no servidor, com dois navegadores ou dois toques).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { ambiente, ok, abrirChamado, triarVisita, agendar, ASSINATURA } = require('./_assistencia_ambiente.cjs');

const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const plano = (x) => JSON.parse(JSON.stringify(x));
const ITENS = [{ tipo: 'SERVICO', descricao: 'Mão de obra de troca', quantidade: 1, valorUnitario: 350 }, { tipo: 'PECA', descricao: 'Placa de controle', codigo: 'PC-1', quantidade: 1, valorUnitario: 900 }];
const CTX = { ip: '203.0.113.7', navegador: 'teste' };
const APROVA = { decisao: 'APROVADO', nome: 'Rui Responsável Teste', cargo: 'Gerente de enfermagem', email: 'rui@alfa.exemplo.test', concordo: true, assinatura: ASSINATURA };

function amb0(o) {
  const amb = ambiente(Object.assign({ extras: ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Equipamentos.js', 'SGO_CadastroQualidade.js'] }, o || {}));
  amb.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://sgo.teste/' });
  return amb;
}
/** Na próxima vez que alguém pedir a trava, roda antes a "outra chamada" (uma vez só). */
function concorrente(amb, outra) {
  const original = amb.ctx.LockService.getScriptLock;
  let usado = false;
  amb.ctx.LockService.getScriptLock = function () {
    const l = original();
    const espera = l.waitLock.bind(l);
    l.waitLock = function (ms) {
      if (!usado) { usado = true; amb.ctx.LockService.getScriptLock = original; outra(); }
      return espera(ms);
    };
    return l;
  };
}
function orcEmitido(amb) {
  const c = abrirChamado(amb);
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Placa queimada' }, acao: 'AGUARDANDO_ORCAMENTO', orcamentoDescricao: 'Troca da placa de controle' }));
  const orc = amb.tabelas.ATEC_ORCAMENTOS.filter((o) => o.CHAMADO_ID === c.id).pop();
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, condicoes: 'Pagamento em 28 dias.' }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  return { c, orc };
}

test('"Nova revisão" tocada duas vezes (ou por duas pessoas) abre UMA revisão; a segunda diz para atualizar a ficha', () => {
  const amb = amb0();
  const { orc } = orcEmitido(amb);
  concorrente(amb, () => ok(amb.api('s_gaspar', 'revisarOrcamento', { id: orc.ID })));
  const r = amb.api('s_gaspar', 'revisarOrcamento', { id: orc.ID });
  assert.equal(r.ok, false, 'a segunda revisão é recusada');
  assert.match(r.message, /acabou de mudar.*Atualize a ficha do chamado/);
  const rasc = amb.tabelas.ATEC_ORCAMENTOS.filter((o) => o.NUMERO === orc.NUMERO && o.SITUACAO === 'RASCUNHO');
  assert.equal(rasc.length, 1, 'uma revisão em rascunho, não duas');
});

test('dois agendamentos do mesmo chamado ao mesmo tempo: uma O.S. só, ligada ao chamado; o segundo é recusado', () => {
  const amb = amb0();
  const c = abrirChamado(amb);
  triarVisita(amb, c.id);
  concorrente(amb, () => ok(agendar(amb, c.id, '2026-10-20T09:00')));
  const r = agendar(amb, c.id, '2026-10-20T14:00', { tecnicoId: 'u_tec2' });
  assert.equal(r.ok, false, 'o segundo agendamento é recusado');
  assert.match(r.message, /acabou de ser alterado/);
  const oss = amb.tabelas.ATEC_OS.filter((o) => o.CHAMADO_ID === c.id);
  assert.equal(oss.length, 1, 'uma O.S. só (antes ficavam duas, a primeira sem ligação)');
  assert.equal(amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id).OS_ID, oss[0].ID);
});

test('reagendar continua funcionando (mesma situação e mesma O.S.)', () => {
  const amb = amb0();
  const c = abrirChamado(amb);
  triarVisita(amb, c.id);
  ok(agendar(amb, c.id, '2026-10-20T09:00'));
  const r = ok(agendar(amb, c.id, '2026-10-21T09:00', { motivo: 'Cliente pediu outro dia' }));
  assert.equal(amb.tabelas.ATEC_OS.filter((o) => o.CHAMADO_ID === c.id).length, 1);
  assert.match(r.message || '', /./);
});

test('triagem recusada (prioridade sem motivo, tipo inexistente) não grava nada: nem início da triagem, nem histórico', () => {
  const amb = amb0();
  const c = abrirChamado(amb);
  const ev0 = amb.tabelas.ATEC_EVENTOS.length;
  const r1 = amb.api('s_gil', 'triagem', { id: c.id, prioridade: 'P1', checklist: { sintomas_confirmados: 'Confirmado' } });
  assert.equal(r1.ok, false); assert.match(r1.message, /escreva o motivo/);
  const r2 = amb.api('s_gil', 'triagem', { id: c.id, tipoCodigo: 'NAO_EXISTE' });
  assert.equal(r2.ok, false); assert.match(r2.message, /não existe mais/);
  const linha = amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id);
  assert.equal(linha.SITUACAO, 'ABERTO', 'continua aberto (antes ia para "Em triagem" mesmo com o erro)');
  assert.equal(amb.tabelas.ATEC_EVENTOS.length, ev0, 'nenhum evento no histórico');
});

test('triagem: troca de equipamento e de prioridade vão ao histórico só depois de gravadas', () => {
  const amb = amb0();
  const c = abrirChamado(amb);
  ok(amb.api('s_gil', 'triagem', { id: c.id, equipamentoId: 'eq2', prioridade: 'P1', prioridadeMotivo: 'Equipamento único da CME' }));
  const linha = amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id);
  assert.equal(linha.EQUIPAMENTO_ID, 'eq2'); assert.equal(linha.PRIORIDADE, 'P1');
  const tipos = amb.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE_ID === c.id).map((e) => e.TIPO);
  assert.ok(tipos.includes('EQUIPAMENTO') && tipos.includes('PRIORIDADE'));
});

test('conclusão da triagem em dobro (dois toques em "Precisa de peça"): um pedido só; a segunda é recusada', () => {
  const amb = amb0();
  const c = abrirChamado(amb);
  const d = { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Placa' }, acao: 'AGUARDANDO_PECA', pecaDescricao: 'Placa de controle' };
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: d.checklist }));   // triagem iniciada
  concorrente(amb, () => ok(amb.api('s_gil', 'triagem', d)));
  const r = amb.api('s_gil', 'triagem', d);
  assert.equal(r.ok, false, 'a segunda conclusão é recusada');
  assert.equal(amb.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE_ID === c.id && e.TIPO === 'AGUARDANDO_PECA').length, 1, 'um "aguardando peça" só');
});

test('resposta pelo link: se a decisão falha, o link continua ativo e a nova tentativa registra (antes: "já foi respondido" e nada andava)', () => {
  const amb = amb0();
  const { orc } = orcEmitido(amb);
  ok(amb.api('s_gaspar', 'enviarOrcamento', { id: orc.ID, para: [{ nome: 'Rui', email: 'rui@alfa.exemplo.test' }], pedidoId: 'orc-pente-0001' }));
  const em = amb.emails[amb.emails.length - 1];
  const token = /https:\/\/sgo\.teste\/orcamento\/#([a-f0-9]{64})/.exec(em.body + ' ' + em.htmlBody)[1];
  // o banco recusa a gravação do orçamento uma vez (queda no meio da resposta)
  const original = amb.ctx.SGO_DATA.update;
  amb.ctx.SGO_DATA.update = (t, id, d) => { if (t === 'ATEC_ORCAMENTOS') throw new Error('falha simulada do banco'); return original(t, id, d); };
  const r1 = plano(amb.ctx.Assistencia_orcLinkResponder_(token, APROVA, CTX));
  assert.equal(r1.ok, false);
  assert.doesNotMatch(r1.message, /Nada foi registrado/, 'não afirma o que não sabe');
  amb.ctx.SGO_DATA.update = original;
  assert.equal(amb.tabelas.ATEC_ORC_LINKS.find((l) => l.ORCAMENTO_ID === orc.ID).SITUACAO, 'ATIVO', 'o link continua ativo');
  const r2 = plano(amb.ctx.Assistencia_orcLinkResponder_(token, APROVA, CTX));
  assert.equal(r2.ok, true, 'a nova tentativa registra: ' + JSON.stringify(r2.message));
  assert.equal(amb.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === orc.ID).SITUACAO, 'APROVADO');
});

test('abertura em campo reenviada pela fila depois de a O.S. ser excluída: recusada (antes abria outra O.S. com outro número)', () => {
  const amb = amb0();
  const NOVA = { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', tipoCodigo: 'MANUTENCAO_CORRETIVA', sintoma: 'Autoclave apitando erro E04 no fim do ciclo', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P3', parada: 'NAO', em: '2026-10-19T10:02:00' };
  const r1 = ok(amb.app('Ast_appAbrirOS', 's_tiago', Object.assign({ idLocal: 'pente-os-0001' }, NOVA)));
  ok(amb.app('Ast_appExcluirOS', 's_tiago', { osId: 'pente-os-0001', motivo: 'Abri em dobro por engano' }));
  const r2 = amb.app('Ast_appAbrirOS', 's_tiago', Object.assign({ idLocal: 'pente-os-0001', confirmarOutra: true }, NOVA));
  assert.equal(r2.ok, false, 'recusada');
  assert.equal(r2.codigo, 'ENTRADA', 'recusa definitiva: o aparelho tira o que dependia dela');
  assert.match(r2.message, new RegExp(r1.os.numero + ', que foi excluída'));
  assert.equal(amb.tabelas.ATEC_OS.length, 1, 'nenhuma O.S. nova');
  assert.equal(amb.tabelas.ATEC_CHAMADOS.length, 1, 'nenhum chamado novo');
});

test('sugestão de veículo do agendamento usa o apelido da Frota (a função chamada antes não existia)', () => {
  const amb = amb0();
  amb.ctx.FrotaRes_livres_ = () => [{ id: 'v1', placa: 'ABC1D23', modelo: 'Strada' }];
  amb.ctx.FrotaId_rotuloRapido_ = (placa) => (placa === 'ABC1D23' ? 'Branquinha (ABC1D23)' : placa);
  const s = plano(amb.ctx.AstA_sugerirVeiculo_('u_tec', Date.now(), Date.now() + 3600000, null));
  assert.equal(s.veiculo.rotulo, 'Branquinha (ABC1D23)');
  amb.ctx.FrotaId_rotuloRapido_ = (placa) => placa;   // sem apelido: continua placa e modelo
  assert.equal(plano(amb.ctx.AstA_sugerirVeiculo_('u_tec', Date.now(), Date.now() + 3600000, null)).veiculo.rotulo, 'ABC1D23 (Strada)');
});

test('editor do orçamento: código da peça e unidade vão escondidos (o Salvar não apaga); cortesia salva aparece como 0', () => {
  const tela = ler('JS_Assistencia.html');
  const ini = tela.indexOf('function At_editarOrcamento_('), fim = tela.indexOf('ov.querySelector("[data-x]")', ini);
  const trecho = tela.slice(ini, fim);
  assert.match(trecho, /type="hidden" data-f="codigo"/);
  assert.match(trecho, /type="hidden" data-f="unidade"/);
  // a função de linha, de verdade, com uma cortesia num orçamento já com valores
  const ctx = vm.createContext({ At_campo_: (r, h) => h, At_opcoes_: () => '', At_esc_: (v) => String(v === 0 ? '0' : v == null ? '' : v), At_modal_: () => { throw new Error('parar'); } });
  vm.runInContext(trecho.replace(/var ov = At_modal_[\s\S]*$/, '') + ' this.__l = linha; }', ctx);
  vm.runInContext('At_editarOrcamento_({ itens: [{ descricao: "a", valorUnitario: 100 }, { descricao: "b", valorUnitario: 0, codigo: "PC-9", unidade: "pç" }] })', ctx);
  const h = ctx.__l({ descricao: 'b', valorUnitario: 0, codigo: 'PC-9', unidade: 'pç' });
  assert.match(h, /data-f="codigo" value="PC-9"/); assert.match(h, /data-f="unidade" value="pç"/);
  assert.match(h, /data-f="valorUnitario" inputmode="decimal" value="0"/);
  vm.runInContext('At_editarOrcamento_({ itens: [{ descricao: "rascunho da triagem", valorUnitario: 0 }] })', ctx);
  assert.match(ctx.__l({ descricao: 'x', valorUnitario: 0 }), /data-f="valorUnitario" inputmode="decimal" value=""/, 'rascunho novo continua vazio para preencher');
});

test('mensagem de falha de conexão não afirma "nada foi alterado"', () => {
  const tela = ler('JS_Assistencia.html');
  assert.doesNotMatch(tela, /tente de novo; nada foi alterado/);
  assert.match(tela, /A resposta não chegou: o pedido pode ter sido registrado ou não/);
});

// ---------------------------------------------------------------- versão nova do SGO+
/** Mesmo compilador de modelos do servidor (sgo_servidor/src/compat/basicos.ts, compilarTemplate). */
function compilarTemplate(fonte) {
  let corpo = '', i = 0; const re = /<\?(!?=)?([\s\S]*?)\?>/g; let m;
  while ((m = re.exec(fonte))) {
    if (m.index > i) corpo += `__o.push(${JSON.stringify(fonte.slice(i, m.index))});\n`;
    const tipo = m[1], bruto = m[2]; const codigo = tipo ? bruto.trim().replace(/;+\s*$/, '') : bruto;
    if (tipo === '=') corpo += `__o.push(__esc(${codigo}));\n`; else if (tipo === '!=') corpo += `__o.push(String((${codigo}) == null ? "" : (${codigo})));\n`; else corpo += codigo + '\n';
    i = re.lastIndex;
  }
  if (i < fonte.length) corpo += `__o.push(${JSON.stringify(fonte.slice(i))});\n`;
  return `(function (__t, __esc) { var __o = []; with (__t) {\n${corpo}} return __o.join(""); })`;
}
function servidorTelas(arquivosHtml) {
  const ctx = vm.createContext({
    HtmlService: { createHtmlOutputFromFile: (n) => { const s = arquivosHtml[n]; if (s === undefined) throw new Error('Nenhum arquivo HTML ' + n); return { getContent: () => s }; } },
    Utilities: { computeDigest: (a, t) => Array.from(crypto.createHash('sha256').update(String(t), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } },
    JSON
  });
  vm.runInContext(ler('SGO_Main.js').split('function doGet')[0], ctx);   // include()
  vm.runInContext(ler('SGO_VersaoTelas.js'), ctx);
  return ctx;
}
function htmlsDoLegado() {
  const m = {}; for (const f of fs.readdirSync(pasta).filter((f) => f.endsWith('.html'))) m[f.replace(/\.html$/, '')] = ler(f); return m;
}

test('versão das telas: a página montada leva o resumo, o servidor devolve o mesmo e ele muda quando uma tela muda', () => {
  const htmls = htmlsDoLegado();
  const ctx = servidorTelas(htmls);
  const pagina = vm.runInContext(compilarTemplate(htmls.Index), ctx).call(undefined, {}, (s) => String(s));
  const m = /window\.SGO_VERSAO_TELAS_PAGINA = "([0-9a-f]{16})";/.exec(pagina);
  assert.ok(m, 'a página traz a versão');
  assert.equal(plano(ctx.SGO_versaoTelas()).versao, m[1]);
  assert.ok(pagina.includes('function SGO_versaoTelasVerificar_'), 'JS_Core incluído com a verificação');
  const outra = Object.assign({}, htmls, { JS_Assistencia: htmls.JS_Assistencia + '\n<!-- mudou -->' });
  assert.notEqual(plano(servidorTelas(outra).SGO_versaoTelas()).versao, m[1], 'tela incluída mudou: versão muda');
  const soServidor = Object.assign({}, htmls, { ArquivoQueNaoEIncluido: 'x' });
  assert.equal(plano(servidorTelas(soServidor).SGO_versaoTelas()).versao, m[1], 'arquivo fora da página não muda a versão');
});

test('aviso de versão nova: faixa discreta com Atualizar e Depois; não recarrega sozinha, não pega o foco, não mexe no que foi digitado', () => {
  const core = ler('JS_Core.html');
  const ini = core.indexOf('// 12/11/2026: AVISO DE VERSÃO NOVA DO SGO+');
  assert.ok(ini > 0);
  const trecho = core.slice(ini, core.lastIndexOf('</script>'));
  const filhos = [];
  const novoEl = () => ({ style: {}, attrs: {}, filhos: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.filhos.push(c); }, focus() { throw new Error('não pode pegar o foco'); } });
  const doc = { visibilityState: 'visible', body: { appendChild: (e) => filhos.push(e) }, getElementById: (id) => filhos.find((e) => e.id === id) || null, createElement: novoEl, addEventListener() {} };
  let recarregou = 0, chamadas = 0, resposta = { ok: true, valor: { ok: true, versao: 'aaaa' } };
  const ctx = vm.createContext({ window: { SGO_VERSAO_TELAS_PAGINA: 'aaaa', location: { reload: () => recarregou++ } }, document: doc, location: { protocol: 'https:' }, Date, Math, String, JSON,
    setTimeout() {}, setInterval() {}, google: {},
    fetch: () => { chamadas++; return Promise.resolve({ ok: true, json: () => Promise.resolve(resposta) }); } });
  vm.runInContext(trecho, ctx);
  return (async () => {
    vm.runInContext('SGO_versaoTelasVerificar_()', ctx); await new Promise((r) => setImmediate(r));
    assert.equal(chamadas, 1); assert.equal(filhos.length, 0, 'mesma versão: nada aparece');
    resposta = { ok: true, valor: { ok: true, versao: 'bbbb' } };
    vm.runInContext('SGO_versaoTelasVerificar_()', ctx); await new Promise((r) => setImmediate(r));
    const faixa = filhos.find((e) => e.id === 'sgoVersaoNova');
    assert.ok(faixa, 'a faixa aparece');
    assert.equal(faixa.style.display, 'flex');
    assert.match(faixa.filhos[0].textContent, /Há uma versão nova do SGO\+\. Salve o que está fazendo e toque em Atualizar\./);
    assert.equal(recarregou, 0, 'não recarrega sozinha');
    faixa.filhos[2].onclick();   // Depois
    assert.equal(faixa.style.display, 'none');
    vm.runInContext('SGO_versaoTelasVerificar_()', ctx);
    assert.equal(faixa.style.display, 'none', '"Depois" segura o aviso por 30 minutos');
    faixa.filhos[1].onclick();   // Atualizar
    assert.equal(recarregou, 1, 'Atualizar recarrega');
    assert.equal(vm.runInContext('SGO_versaoTelasMudou_("", "x")', ctx), false, 'sem referência não avisa');
  })();
});
