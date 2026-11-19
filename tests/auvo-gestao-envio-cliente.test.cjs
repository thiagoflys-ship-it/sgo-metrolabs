// Integração Auvo (26/10/2026, pedido do dono): a gestão (Gestor e Diretoria) enviava ao Auvo a correção de UM cliente
// e o cadastro pendente; lote, técnicos, importação completa e auditoria eram só do Administrador.
// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Ninguém envia mais nada ao Auvo: os três testes de quem podia
// enviar o quê viraram um só, que confere a recusa para todos os perfis; a consulta de uma O.S. já copiada continua da gestão.
// Código real do despacho (SGO_Auvo_Main.js) num contexto isolado; as funções de outros arquivos são simuladas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');

function ambiente() {
  const fonte = fs.readFileSync(path.join(base, 'SGO_Auvo_Main.js'), 'utf8');
  const retirada = fs.readFileSync(path.join(base, 'SGO_Auvo_Retirada.js'), 'utf8');
  const chamadas = [];
  const sessoes = { s_adm: 'ADMIN', s_dir: 'DIRETORIA', s_ges: 'GESTOR', s_tec: 'TECNICO' };
  const ctx = vm.createContext({
    SGO_UTILS: { safe: (v) => (v === null || v === undefined ? '' : String(v)) },
    exigirSessao: (id) => { if (!sessoes[id]) throw new Error('Sessão inválida'); return {}; },
    validarSessao: (id) => ({ valid: !!sessoes[id], data: { perfil: sessoes[id] } }),
    isAdminSession: (id) => ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(sessoes[id]) !== -1
  });
  // as funções do despacho que moram em outros arquivos viram simulações que só registram a chamada
  const nomes = new Set(fonte.match(/\bAuvo_api\w+/g));
  vm.runInContext(retirada, ctx, { filename: 'SGO_Auvo_Retirada.js' });
  vm.runInContext(fonte, ctx, { filename: 'SGO_Auvo_Main.js' });
  // o despacho e o "sincronizar um cliente" são os reais; o resto (inclusive o que mora no próprio arquivo) só registra a chamada
  nomes.forEach((n) => {
    if (n === 'Auvo_apiDispatch' || n === 'Auvo_apiSincronizarCliente') return;
    ctx[n] = (sid, p) => { chamadas.push(n); return { ok: true, simulado: n }; };
  });
  // o envio em si é simulado
  ctx.Auvo_sincronizarCliente_ = (id) => { chamadas.push('sincronizarCliente:' + id); return { ok: true }; };
  ctx.Auvo_bootstrap_ = () => {};
  const api = (s, fn, payload) => ctx.Auvo_apiDispatch({ sessionId: s, fn, payload: payload || {} });
  return { api, chamadas };
}

test('18/11/2026: ninguém envia nada ao Auvo (nenhum perfil, nenhuma função de envio, sincronização ou implantação)', () => {
  for (const s of ['s_ges', 's_dir', 's_adm', 's_tec']) {
    const { api, chamadas } = ambiente();
    for (const fn of ['apiSincronizarCliente', 'apiSimularEnvioCadastro', 'apiEnviarUnidadesPendentes', 'apiIniciarEnvioEquipamentos', 'apiContinuarEnvioEquipamentos',
      'apiSincronizarTodosClientes', 'apiSincronizarTodosTecnicos', 'apiSincronizarTecnico', 'apiBuscarTecnicoParaSync', 'apiIniciarSincronizacaoReversa',
      'apiAuditarNomesParecidos', 'apiDefinirEmailUsuario', 'apiTestarConexao', 'apiAtivarSincronizacaoIncremental', 'apiListarPendencias', 'apiGerarRelatorio']) {
      assert.throws(() => api(s, fn, { clienteId: 'c1' }), /O Auvo foi descontinuado em 18\/11\/2026/, s + ' ' + fn);
    }
    assert.deepEqual(chamadas, [], 'nenhuma função de envio foi chamada');
  }
});

test('a tela mostra os dois quadros fora das ferramentas de implantação; o lote de clientes só para o Administrador', () => {
  const c = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Auvo_ConteudoModulo.js'), 'utf8'), c);
  const html = c.AUVO_CONTEUDO_MODULO;
  const iCorrecao = html.indexOf('Enviar correção de cliente para o Auvo');
  const iPendente = html.indexOf('<h2>Enviar cadastro pendente para o Auvo');
  const iAvancado = html.indexOf('<div id="tplAuvo_avancado"');
  assert.ok(iCorrecao > 0 && iPendente > 0 && iCorrecao < iAvancado && iPendente < iAvancado);
  assert.equal(html.split('<h2>Enviar cadastro pendente para o Auvo').length, 2, 'o quadro aparece uma vez só');
  assert.match(html, /\(ehAdminAuvo \? '<button[^']*tplAuvo_sincronizarTodosClientes\(\)/);
});
