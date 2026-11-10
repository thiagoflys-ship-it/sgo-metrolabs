// Frota > Rastreamento redesenhado (31/10/2026, pedido do dono: "quero que o especialista redesenhe essa função lá no frota
// para ficar mais fácil ativar e desativar, cadastrar e outras ferramentas, está muito confusa").
// As 7 partes viraram 4 abas (Visão geral, Mapa e rotas, Consultas e relatórios, Configuração). Estes testes conferem que:
//  - nenhuma ferramenta sumiu (cada parte antiga tem lugar novo e cada chamada ao servidor continua na tela);
//  - as ações do bloqueio mandam ao servidor exatamente os mesmos dados de antes (a regra fica no servidor);
//  - botão que a pessoa não pode usar diz por quê; a carga é em sequência e não manda comando nenhum;
//  - a tela roda num navegador de mentira (DOM mínimo abaixo), só com dados fictícios e sem rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

// ---------------- DOM mínimo: nós por id, espaços de formulário, botões lidos do HTML ----------------
function desescapar(s) { return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
function criarDom() {
  const nos = {};
  const slots = new Set();
  const raizes = [];
  function no(id) {
    if (!nos[id]) {
      let html = '';
      const n = {
        id, value: '', checked: false, disabled: false, textContent: '', onclick: null, onchange: null, oninput: null, classList: { remove() {}, add() {}, toggle() {} },
        get innerHTML() { return html; },
        set innerHTML(v) { html = String(v); registrar(html); },
        focus() {}, scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; },
        querySelector(sel) {
          if (sel === '.fbq-raiz') { const r = { onclick: null, html: () => html }; raizes.push(r); return r; }
          return { focus() {} };
        },
        querySelectorAll() { return []; }
      };
      nos[id] = n;
    }
    return nos[id];
  }
  function registrar(html) {
    for (const m of html.matchAll(/\sid="([^"]+)"/g)) { delete nos[m[1]]; }
    for (const m of html.matchAll(/class="fbq-slot" id="([^"]+)"/g)) slots.add(m[1]);
  }
  const document = {
    getElementById(id) { return existe(id) ? no(id) : null; },
    querySelectorAll(sel) { if (sel === '.fbq-slot') return [...slots].filter(existe).map(no); return []; },
    querySelector() { return null; },
    addEventListener() {}, head: { appendChild() {} }, createElement() { return {}; }
  };
  // um id "existe" se algum HTML gravado o contém (ou se já foi criado à mão)
  function existe(id) { if (nos[id]) return true; return Object.values(nos).some((n) => n.innerHTML.includes('id="' + id + '"')); }
  function todoHtml() { return Object.values(nos).map((n) => n.innerHTML).join('\n'); }
  function botao(filtro) {
    const tags = [...todoHtml().matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
    for (const t of tags) {
      const at = {};
      for (const m of t[1].matchAll(/([\w-]+)="([^"]*)"/g)) at[m[1]] = desescapar(m[2]);
      if (Object.keys(filtro).every((k) => (k === 'texto' ? t[2].includes(filtro[k]) : at[k] === filtro[k]))) {
        const b = { at, texto: t[2], disabled: false, getAttribute: (k) => (k in at ? at[k] : null), closest: () => b };
        return b;
      }
    }
    return null;
  }
  return { document, no, botao, todoHtml, raizes };
}

function contexto(o) {
  const dom = criarDom();
  const chamadas = [];
  const ctx = {
    console, setTimeout, clearTimeout, Promise, Date, Math, JSON, Number, String, Object, Array, RegExp, isFinite, encodeURIComponent,
    document: dom.document,
    confirm: () => true, alert: () => {}, prompt: () => null,
    tplFrota_esc: (v) => String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    tplFrota_num_: (v, c) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c || 0, maximumFractionDigits: c || 0 }),
    tplFrota_chamarApiSilencioso_: (fn, p) => { chamadas.push({ fn, p: JSON.parse(JSON.stringify(p || {})) }); return Promise.resolve(o.respostas[fn] ? o.respostas[fn](p) : { ok: true, texto: 'Feito.' }); }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(ler('SGO_Frota_BloqueioTela.js') + '\n;FrotaBlq_telaNavegador_();', ctx);
  return { ctx, dom, chamadas };
}
const esperar = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };

function painel(perfil) {
  const pode = { podeLiberar: ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH'].includes(perfil), podeRoubo: perfil === 'DIRETORIA', podeOdometro: ['ADMIN', 'GESTOR'].includes(perfil) };
  return Object.assign({
    ok: true, agora: '31/10/2026 10:15', perfil,
    config: { rastreadorLigado: true, chaveComandos: true, bloqueioLigado: true, podeEnviar: true, faltas: [] },
    modos: { ATIVO: 'Ativo (envia comandos)', SIMULACAO: 'Simulação (só registra)', DESLIGADO: 'Desligado' },
    veiculos: [
      { veiculoId: 'v1', placa: 'TST1A11', apelido: 'Onça', baseFrota: 'Goiânia', rotuloVeiculo: 'Onça', deviceId: '101', modo: 'ATIVO', modoEfetivo: 'ATIVO', modoAviso: '', modoPor: 'Gil', modoMotivo: 'piloto',
        triagem: 'BLOQUEIO_ATIVO', triagemManual: '', triagemEm: '', triagemMotivo: '', triagemLocais: [], responsavel: '', movimentacaoId: '', desde: '', releReal: 'BLOQUEADO', releRealEm: '31/10/2026 10:10', releSimulado: '',
        sinal: 'conectado agora: aparelho online, último contato agora', ultimaPosicao: 'agora', situacaoCarro: 'parado, ignição desligada', naBase: true, baseTexto: 'na base Goiânia', ultimoComando: 'bloquear às 31/10/2026 08:00 (confirmado)',
        pedido: '', pedidoSituacao: '', emergencia: '', odometroAtual: 1200, kmPainel: 197130, odoDivergencia: null, odoAcerto: '', esquecidaGestao: false, esquecida: '' },
      { veiculoId: 'v2', placa: 'TST2B22', apelido: 'Lobo-guará', baseFrota: 'Goiânia', rotuloVeiculo: 'Lobo-guará', deviceId: '102', modo: 'SIMULACAO', modoEfetivo: 'SIMULACAO', modoAviso: '',
        triagem: 'SEM_DADOS', triagemManual: '', triagemEm: '', triagemMotivo: '', triagemLocais: [], responsavel: 'TIAGO TESTE', movimentacaoId: 'm1', desde: '31/10/2026 07:50', releReal: 'LIBERADO', releRealEm: '', releSimulado: 'LIBERADO',
        sinal: 'aparelho offline há 2 h', ultimaPosicao: 'há 2 h', situacaoCarro: 'andando', naBase: false, baseTexto: 'fora da base', ultimoComando: '', pedido: '', pedidoSituacao: '', emergencia: '', odometroAtual: null, kmPainel: 189880,
        odoDivergencia: null, odoAcerto: '', esquecidaGestao: false, esquecida: '' }
    ],
    passagens: [], eventos: [{ quando: '31/10/2026 08:00', placa: 'TST1A11', rotuloVeiculo: 'Onça', modo: 'ATIVO', tipo: 'ENVIO', acao: 'BLOQUEAR', quem: 'Rotina', http: '200', detalhe: 'Bloqueio enviado.', condicao: '' }],
    kmNoturno: null, bases: ['Goiânia', 'Rio de Janeiro'], areas: { 'Goiânia': { lat: -10.5, lon: -40.5, raioM: 300 } }, raioPadrao: 300
  }, pode);
}
function rastreador() {
  return {
    ok: true, ligado: true, bloqueio: true, configurado: true, ultimaRodada: '31/10/2026 10:14', ultimaLeituraOk: '31/10/2026 10:14', dispositivosErro: '',
    dispositivos: [{ id: '101', nome: 'TST1A11 teste', vinculadoA: 'TST1A11' }, { id: '102', nome: 'TST2B22 teste', vinculadoA: 'TST2B22' }, { id: '104', nome: 'TST3C33 teste', vinculadoA: '' }],
    veiculos: [
      { id: 'v1', placa: 'TST1A11', apelido: 'Onça', baseFrota: 'Goiânia', rotuloVeiculo: 'Onça', modelo: 'HATCH', situacao: 'DISPONIVEL', deviceId: '101', deviceNome: 'TST1A11 teste', posicao: { quando: '31/10/2026 10:14', estadoTexto: 'parado, ignição desligada', local: 'Rua Teste', parado: true } },
      { id: 'v2', placa: 'TST2B22', apelido: 'Lobo-guará', baseFrota: 'Goiânia', rotuloVeiculo: 'Lobo-guará', modelo: 'PICAPE', situacao: 'EM_USO', condutorNome: 'TIAGO TESTE', deviceId: '102', deviceNome: 'TST2B22 teste', posicao: null },
      { id: 'v3', placa: 'TST3C33', apelido: 'Tucunaré', baseFrota: 'Rio de Janeiro', rotuloVeiculo: 'Tucunaré', modelo: 'COMPACTO', situacao: 'DISPONIVEL', deviceId: '', sugestao: { id: '104', nome: 'TST3C33 teste' }, posicao: null }
    ],
    comandos: [], alertas: [{ id: 'a1', tipo: 'USO_SEM_REGISTRO', placa: 'TST2B22', rotuloVeiculo: 'Lobo-guará', quando: '31/10/2026 03:00', detalhe: 'Andou sem retirada.', ocorrencias: 2 }]
  };
}
async function abrirVisaoGeral(perfil) {
  const t = contexto({ respostas: { apiBloqueioPainel: () => painel(perfil), apiListarRastreador: rastreador } });
  const corpo = t.dom.no('frr_corpo');
  t.ctx.tplFrotaBlq_montar_(corpo);
  await esperar();
  const raiz = t.dom.raizes[t.dom.raizes.length - 1];
  const clicar = async (filtro) => { const b = t.dom.botao(filtro); assert.ok(b, 'botão ' + JSON.stringify(filtro)); raiz.onclick({ target: b }); await esperar(); return b; };
  return Object.assign(t, { corpo, clicar, html: () => t.dom.no('fbq_corpo').innerHTML });
}

// ---------------- estrutura: nada sumiu ----------------
test('Rastreamento: 4 abas, as partes internas e todo nome antigo com lugar novo', () => {
  const rt = ler('SGO_Frota_RastreamentoTela.js');
  assert.match(rt, /var SUBS = \[\['geral', 'Visão geral'\], \['mapa', 'Mapa e rotas'\], \['consultas', 'Consultas e relatórios'\], \['config', 'Configuração'\]\];/);
  for (const p of ["\\['vivo', 'Mapa ao vivo'\\]", "\\['rotas', 'Rotas'\\]", "\\['combustivel', 'Combustível e KM'\\]", "\\['relatorios', 'Relatórios A4'\\]", "\\['registro', 'Registro do bloqueio'\\]",
    "\\['situacao', 'O que falta para funcionar'\\]", "\\['aparelhos', 'Aparelhos'\\]", "\\['areas', 'Áreas das bases'\\]", "\\['regras', 'Regras e alertas'\\]", "\\['privacidade', 'Privacidade'\\]"]) assert.match(rt, new RegExp(p));
  // as 7 partes antigas: mapa e config continuam como abas; as outras 5 vão para o lugar novo
  assert.match(rt, /var ANTIGAS = \{ rotas: \['mapa', 'rotas'\], combustivel: \['consultas', 'combustivel'\], relatorios: \['consultas', 'relatorios'\], aparelhos: \['config', 'aparelhos'\], bloqueio: \['geral', ''\] \};/);
  // o painel antigo do rastreador fica escondido e não lê mais a API com a tela nova montada
  assert.match(rt, /if \(antigo\) antigo\.style\.display = 'none';/);
  assert.match(rt, /window\.tplFrota_rtCarregar = function \(\) \{ if \(!el\('tplFrotaR_raiz'\)\) return rtOriginal\.apply\(this, arguments\); \};/);
  // "Ver no mapa" do cartão centraliza o veículo
  assert.match(rt, /var foco = R\.focar && R\.marcadores\[R\.focar\];/);
});

test('Toda chamada ao servidor das telas antigas continua em alguma tela nova', () => {
  const telas = ler('SGO_Frota_RastreamentoTela.js') + ler('SGO_Frota_BloqueioTela.js');
  const main = ler('SGO_Frota_Main.js');
  const fns = ['apiBloqueioPainel', 'apiBloqueioModo', 'apiBloqueioTriagem', 'apiBloqueioLiberarAgora', 'apiBloqueioEncerrarEmergencia', 'apiBloqueioRoubo', 'apiBloqueioHodometro', 'apiBloqueioAreaBase',
    'apiBloqueioDecidirForaBase', 'apiBloqueioEncerrarEsquecida', 'apiPassagemDecidir', 'apiBloqueioIntegridade', 'apiBloqueioRelatorio',
    // painel antigo "Aparelhos e alertas"
    'apiListarRastreador', 'apiRastreadorVincular', 'apiRastreadorConferirComandos', 'apiRastreadorConferirAlerta', 'apiRastreadorAtualizarAgora',
    // mapa, rotas, combustível, relatórios, configuração e privacidade
    'apiRastrMapa', 'apiRastrRota', 'apiRastrRetiradas', 'apiRastrCombustivel', 'apiRastrCapacidadeTanque', 'apiRastrPedirComprovante', 'apiRastrCancelarPedido', 'apiRastrRelatorio', 'apiRastrConfig', 'apiRastrConsultas'];
  for (const fn of fns) {
    assert.match(telas, new RegExp("'" + fn + "'"), fn + ' na tela');
    assert.match(main, new RegExp(fn + ': Frota_' + fn), fn + ' no despacho');
  }
});

test('Ações do bloqueio: os dados enviados ao servidor são os mesmos de antes', () => {
  const t = ler('SGO_Frota_BloqueioTela.js');
  const iguais = [
    "enviar(f, 'apiBloqueioModo', { veiculoId: v.veiculoId, modo: b.getAttribute('data-modo'), motivo: val(f + 'j') }, b)",
    "enviar(f, 'apiBloqueioTriagem', { veiculoId: v.veiculoId, triagemManual: val(f + 't'), motivo: val(f + 'j') }, b)",
    "enviar(f, 'apiBloqueioTriagem', { veiculoId: v.veiculoId, refazer: true }, b)",
    "enviar(f, 'apiBloqueioLiberarAgora', { veiculoId: v.veiculoId, motivo: val(f + 'j') }, b)",
    "enviar(f, 'apiBloqueioEncerrarEmergencia', { veiculoId: v.veiculoId }, b)",
    "enviar(f, 'apiBloqueioHodometro', { veiculoId: v.veiculoId, km: val(f + 'k'), confirmado: marcado(f + 'c'), confirmacaoMenor: marcado(f + 'menor'), motivo: val(f + 'j') }, b)",
    "enviar(f, 'apiBloqueioRoubo', { veiculoId: v.veiculoId, motivo: val(f + 'j'), confirmacao1: marcado(f + 'c1'), confirmacao2: val(f + 'c2'), aceitarRisco: marcado(f + 'risco') }, b)",
    "'apiBloqueioDecidirForaBase', { veiculoId: v.veiculoId, decisao: acao === 'foraSimOk' ? 'BLOQUEAR' : 'NAO_BLOQUEAR', justificativa: val('fbq_dfora' + pAttr + 'j') }",
    "'apiBloqueioEncerrarEsquecida', { movimentacaoId: v.movimentacaoId, justificativa: val('fbq_desq' + pAttr + 'j') }",
    "'apiPassagemDecidir', { passagemId: pp.id, decisao: acao === 'passAutOk' ? 'AUTORIZAR' : 'RECUSAR', justificativa: val(fq + 'j'), motivo: val(fq + 'j'), km: val(fq + 'k') }",
    "'apiRastreadorVincular', { veiculoId: x.id, deviceId: dev }",
    "'apiRastreadorConferirAlerta', { alertaId: al.id, observacao: obs }"
  ];
  for (const s of iguais) assert.ok(t.includes(s), 'mesmo envio: ' + s.slice(0, 60));
  // o bloqueio de roubo continua com a dupla confirmação e o aceite de risco na tela
  assert.match(t, /Digite BLOQUEAR ' \+ esc\(v\.placa\)/);
  assert.match(t, /Aceito o risco de enviar com o carro andando/);
  assert.match(t, /r && r\.precisaAceitarRisco/);
  // nenhuma chave aparece na tela: só "gravada" ou "faltando"
  assert.doesNotMatch(t, /tokenComandos|RASTREADOR_TOKEN/);
});

// ---------------- a tela rodando ----------------
test('Visão geral: carga em sequência, um cartão por veículo (com e sem aparelho) e nada é enviado ao abrir', async () => {
  const t = await abrirVisaoGeral('GESTOR');
  assert.deepEqual(t.chamadas.map((c) => c.fn), ['apiBloqueioPainel', 'apiListarRastreador'], 'só leituras, uma depois da outra');
  const h = t.html();
  assert.match(h, /Rastreamento e bloqueio da partida funcionando/);
  assert.equal((h.match(/class="fbq-v[ "]/g) || []).length, 3, 'três cartões');
  assert.match(h, /<h4>Onça<\/h4>/);
  assert.match(h, /Partida bloqueada/);
  assert.match(h, /Partida liberada/);
  assert.match(h, /Sem rastreador/);
  assert.match(h, /Sem conexão agora/);
  assert.match(h, /class="m-ATIVO" aria-pressed="true" data-fbq="modoEsc" data-modo="ATIVO" data-i="1"/, 'Onça é o 2º cartão (ordem pelo apelido)');
  // o que precisa da gestão: uso sem registro e aparelho sugerido
  assert.match(h, /Precisa da gestão \(2\)/);
  assert.match(h, /Uso sem registro · Lobo-guará/);
  assert.match(h, /Aparelho sugerido · Tucunaré/);
});

test('Ativar e desativar: o modo só muda depois do motivo, com o aviso da partida bloqueada', async () => {
  const t = await abrirVisaoGeral('GESTOR');
  await t.clicar({ 'data-fbq': 'modoEsc', 'data-modo': 'SIMULACAO', 'data-i': '1' });
  const form = t.dom.no('fbq_f1').innerHTML;
  assert.match(form, /Mudar para Simulação/);
  assert.match(form, /a partida deste carro está bloqueada agora no rastreador/);
  assert.ok(!t.chamadas.some((c) => c.fn === 'apiBloqueioModo'), 'nada enviado antes de confirmar');
  t.dom.no('fbq_f1j').value = 'teste do piloto encerrado pela diretoria';
  await t.clicar({ 'data-fbq': 'modoOk', 'data-i': '1' });
  const env = t.chamadas.find((c) => c.fn === 'apiBloqueioModo');
  assert.deepEqual(env.p, { veiculoId: 'v1', modo: 'SIMULACAO', motivo: 'teste do piloto encerrado pela diretoria' });
  assert.equal(t.chamadas.slice(-2).map((c) => c.fn).join(), 'apiBloqueioPainel,apiListarRastreador', 'relê depois da ação');
  // tocar no modo que já vale só explica
  await t.clicar({ 'data-fbq': 'modoEsc', 'data-modo': 'ATIVO', 'data-i': '1' });
  assert.match(t.dom.no('fbq_f1').innerHTML, /Este carro já está em <b>Ativo<\/b>/);
});

test('Liberar agora: Gestor libera com motivo; Financeiro vê o botão apagado com o porquê', async () => {
  const g = await abrirVisaoGeral('GESTOR');
  await g.clicar({ 'data-fbq': 'liberar', 'data-i': '1' });
  g.dom.no('fbq_f1j').value = 'condutor sem sinal, retirada confirmada por telefone';
  await g.clicar({ 'data-fbq': 'liberarOk', 'data-i': '1' });
  assert.deepEqual(g.chamadas.find((c) => c.fn === 'apiBloqueioLiberarAgora').p, { veiculoId: 'v1', motivo: 'condutor sem sinal, retirada confirmada por telefone' });
  // bloqueio de roubo: só a Diretoria; para o Gestor o botão diz por quê
  const roubo = g.dom.botao({ 'data-fbq': 'porque', 'data-i': '0', texto: 'Bloqueio de roubo' });
  assert.ok(roubo && /só da Diretoria/.test(roubo.at['data-msg']));

  const f = await abrirVisaoGeral('FINANCEIRO');
  assert.equal(f.dom.botao({ 'data-fbq': 'liberar', 'data-i': '0' }), null, 'Financeiro não tem o botão ativo');
  await f.clicar({ 'data-fbq': 'porque', 'data-i': '0', texto: 'Liberar agora' });
  assert.match(f.dom.no('fbq_f0').innerHTML, /do Administrador, da Diretoria, do Gestor e do RH/);
  assert.match(f.html(), /Acertar o odômetro do rastreador/);
  assert.ok(f.dom.botao({ 'data-fbq': 'porque', 'data-i': '0', texto: 'Acertar o odômetro' }), 'odômetro apagado para o Financeiro');
  assert.ok(!f.chamadas.some((c) => !/^api(BloqueioPainel|ListarRastreador)$/.test(c.fn)), 'nada enviado');
});

test('Ligar aparelho pelo cartão do veículo sem rastreador (com a sugestão pela placa)', async () => {
  const t = await abrirVisaoGeral('GESTOR');
  await t.clicar({ 'data-fbq': 'aparelho', 'data-i': '2', texto: 'Ligar aparelho' });
  const form = t.dom.no('fbq_f2').innerHTML;
  assert.match(form, /<option value="104" selected>TST3C33 teste — ID 104 \(sugerido pela placa\)<\/option>/);
  assert.match(form, /<option value="101" disabled>/, 'aparelho de outro carro não pode ser escolhido');
  t.dom.no('fbq_f2dev').value = '104';
  await t.clicar({ 'data-fbq': 'aparelhoOk', 'data-i': '2' });
  assert.deepEqual(t.chamadas.find((c) => c.fn === 'apiRastreadorVincular').p, { veiculoId: 'v3', deviceId: '104' });
});

test('Configuração: lista "o que falta para funcionar" com a situação de cada item e um botão por item', async () => {
  const t = contexto({ respostas: { apiBloqueioPainel: () => { const p = painel('GESTOR'); p.config = { rastreadorLigado: true, chaveComandos: false, bloqueioLigado: true, podeEnviar: false, faltas: ['falta gravar a "Chave de acesso dos comandos"'] }; return p; }, apiListarRastreador: rastreador } });
  t.ctx.tplFrotaBlq_config_(t.dom.no('frr_int'), 'situacao');
  await esperar();
  const h = t.dom.no('fbq_corpo').innerHTML;
  assert.match(h, /Nenhum comando real sai agora/);
  assert.match(h, /Chave de acesso dos comandos<small[^>]*>Faltando/);
  assert.match(h, /Rastreador ligado no SGO\+<small[^>]*>Ligado/);
  assert.match(h, /Aparelhos ligados aos veículos<small[^>]*>2 de 3 veículos/);
  assert.match(h, /Áreas das bases<small[^>]*>1 de 2 bases/);
  assert.match(h, /Sem área: Rio de Janeiro/);
  assert.match(h, /data-fbq="irConfig" data-int="areas">Cadastrar área/);
  assert.match(h, /Quem muda é o responsável pelo sistema, em Chaves e senhas &gt; Rastreador da frota/, 'quem não é o responsável sabe a quem pedir');
  assert.match(h, /Ativo 1 · Simulação 1 · Desligado 0/);
});

test('Configuração > Áreas das bases: editar preenche o formulário e gravar manda os mesmos dados de antes', async () => {
  const t = contexto({ respostas: { apiBloqueioPainel: () => painel('GESTOR'), apiListarRastreador: rastreador } });
  t.ctx.tplFrotaBlq_config_(t.dom.no('frr_int'), 'areas');
  await esperar();
  const raiz = t.dom.raizes[t.dom.raizes.length - 1];
  const h = t.dom.no('fbq_corpo').innerHTML;
  assert.match(h, /<b>Rio de Janeiro<\/b><\/td><td data-rot="Situação"><span class="fbq-chip alerta">Sem área/);
  raiz.onclick({ target: t.dom.botao({ 'data-fbq': 'areaEditar', 'data-base': 'Goiânia' }) });
  assert.equal(t.dom.no('fbq_aLat').value, '-10,5');
  assert.equal(t.dom.no('fbq_aRaio').value, 300);
  t.dom.no('fbq_aBase').value = 'Goiânia';
  raiz.onclick({ target: t.dom.botao({ 'data-fbq': 'areaGravar' }) });
  await esperar();
  assert.deepEqual(t.chamadas.find((c) => c.fn === 'apiBloqueioAreaBase').p, { base: 'Goiânia', veiculoId: '', lat: '-10,5', lon: '-40,5', raioM: '300', remover: false });
});

test('Textos que apontavam para as partes antigas levam ao lugar novo', () => {
  for (const f of ['SGO_Frota_Bloqueio.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Rastreamento.js', 'SGO_Alertas_Central.js', 'SGO_Chaves.js', 'JS_Core.html', 'SGO_Frota_RastreamentoTela.js', 'SGO_Frota_BloqueioTela.js']) {
    const s = ler(f);
    assert.doesNotMatch(s, /Rastreamento > Bloqueio da partida|Aparelhos e alertas"?\.|aba Aparelhos e alertas|Rastreamento > Aparelhos e alertas/, f);
  }
  const ajuda = ler('SGO_Ajuda_Frota.js');
  assert.match(ajuda, /"frota\/rastreamento": \{/);
  assert.match(ajuda, /Visão geral/);
  assert.match(ajuda, /O que falta para funcionar/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_FROTA.md'), 'utf8');
  assert.match(manual, /O que falta para funcionar/);
  assert.match(manual, /Onde ficou cada ferramenta/);
});
