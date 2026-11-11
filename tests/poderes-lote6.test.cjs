// Acessos por caixas — LOTE 6 (11/11/2026): Frota — localização/rastreamento e bloqueio da partida.
// FrotaCx_excecao_ / Frota_cx_ / Frota_cxGestao_ / Frota_cxMsg_ (SGO_Frota_Main.js); FrotaBlq_exigirGestao_ recebe a caixa e a
// exigência de perfil de antes (liberar agora, roubo, hodômetro); Rastreador_exigirGestao_ e FrotaR_exigirGestao_ recebem a caixa.
//  1) equivalência: sem exceções, as 23 contas reais recebem, em cada ação do lote, o mesmo resultado e a mesma mensagem
//     do legado de antes (output/poderes-20261110/lote6-antes-legado);
//  2) exceção NÃO tira o poder (inclusive da gestão e da Diretoria);
//  3) exceção SIM dá o poder, sem pular motivo, dupla confirmação, modo e condições do carro;
//  4) tela: painel do bloqueio (podeLiberar/podeRoubo/podeOdometro) segue a caixa; 6 caixas ligadas; ajuda atualizada.
// Rodar: cd C:\Users\venda\projetos\google-script-dev && FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs tests/poderes-lote6.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_poderes_ambiente.cjs');

const pastaPoderes = path.join(__dirname, '../output/poderes-20261110');
const pastaAntes = path.join(pastaPoderes, 'lote6-antes-legado');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const lerLegado = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const lerAntes = (f) => fs.readFileSync(path.join(pastaAntes, f), 'utf8');
const EXTRAS = ['SGO_Frota_Main.js', 'SGO_Frota_Bloqueio.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Rastreamento.js', 'SGO_Frota_RastreamentoGestao.js'];
const LOTE6 = ['FROTA_LOCALIZAR', 'FROTA_RASTREADOR_CONFIGURAR', 'FROTA_BLOQUEAR_PARTIDA', 'FROTA_LIBERAR_PARTIDA', 'FROTA_BLOQUEIO_ROUBO', 'FROTA_ODOMETRO_CORRIGIR'];
const j = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));

// Planilhas da Frota em memória: um veículo com rastreador (V1) e um pedido de passagem aberto (PS1).
function amb(pasta) {
  const a = ambiente(Object.assign({ extras: EXTRAS }, pasta ? { pasta } : {}));
  const c = a.ctx;
  c.Frota_bootstrap_ = () => {};
  ['FrotaR_garantirAbas_', 'FrotaAb_garantirAbas_', 'FrotaBlq_garantirAbas_', 'Rastreador_garantirAbas_'].forEach((f) => { if (typeof c[f] === 'function') c[f] = () => {}; });
  const S = c.SGO_CFG && c.SGO_CFG.SHEETS ? c.SGO_CFG.SHEETS : {};
  c.SGO_DATA.gerarRegistroBase = (x) => Object.assign({ ID: 'g' + Math.random().toString(36).slice(2), CRIADO_EM: '2026-11-11T08:00:00.000Z' }, x);
  Object.keys(S).forEach((k) => { if (typeof S[k] === 'string' && !a.tabelas[S[k]]) a.tabelas[S[k]] = []; });
  vm.runInContext('Object.keys(this)', c).filter((k) => /_ABA_/.test(k) && typeof c[k] === 'string').forEach((k) => { if (!a.tabelas[c[k]]) a.tabelas[c[k]] = []; });
  const tv = S.CAD_VEICULOS || 'CAD_VEICULOS';
  a.tabelas[tv] = [{ ID: 'V1', PLACA: 'ABC1D23', MODELO: 'TESTE', STATUS: 'ATIVO', RASTREADOR_DEVICE_ID: 'dev1', KM_ATUAL: 1000 }];
  if (typeof c.FBLQ_ABA_PASSAGENS === 'string') a.tabelas[c.FBLQ_ABA_PASSAGENS] = [{ ID: 'PS1', VEICULO_ID: 'V1', PLACA: 'ABC1D23', SITUACAO: 'AGUARDANDO_ATUAL', DE_CONDUTOR_ID: 'cX', PARA_CONDUTOR_ID: 'cY', DE_NOME: 'A', PARA_NOME: 'B' }];
  return a;
}
const salvarExc = (a, login, mudancas, motivo) => {
  const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: motivo || 'Teste do lote 6 (exceção)', mudancas });
  assert.ok(r && r.ok, 'gravar exceção: ' + JSON.stringify(r));
  a.limparMemo();
};
/** Chama a API e devolve só o que decide o acesso: a mensagem da recusa (ou do erro seguinte) ou "passou". */
const chamar = (a, login, fn, payload) => {
  try { const r = a.ctx[fn]('s_' + login, j(payload || {})); return { passou: true, ok: r && r.ok !== undefined ? r.ok : null, erro: (r && r.erro) || '' }; }
  catch (e) { return { lancou: String(e && e.message || e) }; }
};
const API = [
  ['Frota_apiBloqueioDecidirForaBase', { veiculoId: 'V1' }, 'FROTA_BLOQUEAR_PARTIDA'], ['Frota_apiBloqueioModo', { veiculoId: 'V1' }, 'FROTA_BLOQUEAR_PARTIDA'],
  ['Frota_apiBloqueioTriagem', { veiculoId: 'V1' }, 'FROTA_BLOQUEAR_PARTIDA'], ['Frota_apiBloqueioLiberarAgora', { veiculoId: 'V1' }, 'FROTA_LIBERAR_PARTIDA'],
  ['Frota_apiBloqueioEncerrarEmergencia', { veiculoId: 'V1' }, 'FROTA_BLOQUEAR_PARTIDA'], ['Frota_apiBloqueioRoubo', { veiculoId: 'V1' }, 'FROTA_BLOQUEIO_ROUBO'],
  ['Frota_apiBloqueioHodometro', { veiculoId: 'V1' }, 'FROTA_ODOMETRO_CORRIGIR'], ['Frota_apiBloqueioAreaBase', {}, 'FROTA_BLOQUEAR_PARTIDA'],
  ['Frota_apiBloqueioIntegridade', {}, 'FROTA_BLOQUEAR_PARTIDA'], ['Frota_apiBloqueioPainel', {}, 'FROTA_BLOQUEAR_PARTIDA'],
  ['Frota_apiBloqueioRelatorio', {}, 'FROTA_BLOQUEAR_PARTIDA'], ['Frota_apiBloqueioEncerrarEsquecida', { movimentacaoId: 'M-nao-existe' }, 'FROTA_BLOQUEAR_PARTIDA'],
  ['Frota_apiPassagemDecidir', { id: 'PS1', passagemId: 'PS1' }, 'FROTA_BLOQUEAR_PARTIDA'], ['Frota_apiPassagemDecidir', { id: 'PS1', passagemId: 'PS1', decisao: 'RECUSAR' }, 'FROTA_BLOQUEAR_PARTIDA'],
  ['Frota_apiListarRastreador', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastreadorVincular', {}, 'FROTA_RASTREADOR_CONFIGURAR'],
  ['Frota_apiRastreadorConferirComandos', {}, 'FROTA_RASTREADOR_CONFIGURAR'], ['Frota_apiRastreadorBloquear', {}, 'FROTA_BLOQUEAR_PARTIDA'],
  ['Frota_apiRastreadorConferirAlerta', {}, 'FROTA_RASTREADOR_CONFIGURAR'], ['Frota_apiRastreadorAtualizarAgora', {}, 'FROTA_LOCALIZAR'],
  ['Frota_apiRastrConsultas', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrMapa', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrRota', {}, 'FROTA_LOCALIZAR'],
  ['Frota_apiRastrRetiradas', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrCombustivel', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrCapacidadeTanque', {}, 'FROTA_LOCALIZAR'],
  ['Frota_apiRastrPedirComprovante', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrCancelarPedido', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrConfig', {}, 'FROTA_RASTREADOR_CONFIGURAR'],
  ['Frota_apiRastrGantt', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrCopiloto', {}, 'FROTA_LOCALIZAR'], ['Frota_apiRastrCopilotoDecidir', {}, 'FROTA_LOCALIZAR'],
  ['Frota_apiRastrRelatorio', {}, 'FROTA_LOCALIZAR']];
const ehGate = (r) => !!(r && r.lancou && /(é|são) (só )?(da gestão|do Administrador|do Gestor|da Diretoria)|só da Diretoria|só da gestão|Só quem passa|Administração > Acessos/.test(r.lancou));
const painel = (a, login) => { const r = a.ctx.Frota_apiBloqueioPainel('s_' + login, {}); return { podeLiberar: r.podeLiberar, podeRoubo: r.podeRoubo, podeOdometro: r.podeOdometro }; };

test('1) equivalência: 23 contas reais × ações do lote 6, sem exceções = legado de antes (resultado e mensagem)', () => {
  assert.ok(fs.existsSync(path.join(pastaAntes, 'SGO_Frota_Bloqueio.js')), 'cópia de antes: ' + pastaAntes);
  assert.ok(!/FrotaCx_excecao_/.test(lerAntes('SGO_Frota_Main.js')), 'a cópia de antes precisa ser anterior ao lote 6');
  const contas = amb().contas.map((u) => u.login);
  assert.equal(contas.length, 23);
  const lista = API.map(([fn, p]) => [fn + ' ' + JSON.stringify(p), (a, u) => chamar(a, u, fn, p)])
    .concat([['FrotaR_ponte_ frota.painel (sessão de usuário)', (a, u) => { try { const r = a.ctx.FrotaR_ponte_ ? 'existe' : 'sem'; return { r }; } catch (e) { return { lancou: e.message }; } }]]);
  const divergencias = [];
  let comparacoes = 0, recusadas = 0;
  const antes = amb(pastaAntes), depois = amb();
  for (const u of contas) {
    for (const [rotulo, fn] of lista) {
      antes.limparMemo(); depois.limparMemo();
      const ra = j(fn(antes, u)), rd = j(fn(depois, u));
      comparacoes++;
      if (ehGate(ra)) recusadas++;
      if (JSON.stringify(ra) !== JSON.stringify(rd)) divergencias.push(u + ' · ' + rotulo + '\n   antes:  ' + JSON.stringify(ra).slice(0, 300) + '\n   depois: ' + JSON.stringify(rd).slice(0, 300));
    }
  }
  fs.writeFileSync(path.join(pastaPoderes, 'lote6-equivalencia.txt'),
    'Lote 6 — equivalência (sem exceções) em ' + new Date().toISOString() + '\ncontas=' + contas.length + ' ações=' + lista.length + ' comparações=' + comparacoes +
    ' recusadas_pela_trava(antes)=' + recusadas + ' divergências=' + divergencias.length + '\nações: ' + lista.map((x) => x[0]).join(' | ') + '\n' + divergencias.join('\n') + '\n');
  assert.equal(divergencias.length, 0, divergencias.slice(0, 5).join('\n'));
  assert.ok(recusadas > 200 && recusadas < comparacoes - 100, 'a sequência precisa ter recusas e liberações: ' + recusadas + '/' + comparacoes);
});

test('2) exceção NÃO tira o poder, inclusive da gestão e da Diretoria', () => {
  const a = amb();
  // elisa é da gestão (rotina): padrão passa nas travas
  assert.equal(ehGate(chamar(a, 'elisa', 'Frota_apiRastrMapa')), false, 'padrão: gestão vê o mapa');
  assert.equal(ehGate(chamar(a, 'elisa', 'Frota_apiBloqueioModo', { veiculoId: 'V1' })), false);
  salvarExc(a, 'elisa', LOTE6.map((codigo) => ({ codigo, valor: 'NAO' })), 'Teste: gestão sem rastreamento e bloqueio');
  API.forEach(([fn, p, cod]) => {
    const r = chamar(a, 'elisa', fn, p);
    if (fn === 'Frota_apiPassagemDecidir' && p.decisao === 'RECUSAR') return;   // envolvido (dono do uso) continua fora; aqui não é envolvido
    assert.ok(r.lancou && /Administração > Acessos/.test(r.lancou), fn + ': ' + JSON.stringify(r));
    const nome = a.ctx.Poderes_poder_(cod).nome;
    assert.ok(r.lancou.includes('«' + nome + '»'), fn + ' cita a caixa ' + nome + ': ' + r.lancou);
  });
  // Diretoria com NÃO no roubo
  salvarExc(a, 'charles', [{ codigo: 'FROTA_BLOQUEIO_ROUBO', valor: 'NAO' }], 'Teste: Diretoria sem bloqueio de roubo');
  assert.match(chamar(a, 'charles', 'Frota_apiBloqueioRoubo', { veiculoId: 'V1' }).lancou, /«Bloqueio de roubo»/);
  assert.equal(painel(a, 'charles').podeRoubo, false);
  // o dono do sistema não perde caixa e mantém o espelho (admin não tem roubo hoje)
  LOTE6.forEach((c) => assert.equal(a.ctx.SGO_pode_('s_admin', c), true, c));
  assert.match(chamar(a, 'admin', 'Frota_apiBloqueioRoubo', { veiculoId: 'V1' }).lancou, /O bloqueio de roubo é só da Diretoria/, 'espelho: admin continua sem o roubo');
});

test('3) exceção SIM dá o poder, sem pular motivo, dupla confirmação, modo e condições', () => {
  const a = amb();
  const L = 'joaopedro';
  assert.match(chamar(a, L, 'Frota_apiRastrMapa').lancou, /Localização, mapa e rotas dos veículos são só da gestão/, 'padrão: mensagem de antes');
  assert.match(chamar(a, L, 'Frota_apiBloqueioRoubo', { veiculoId: 'V1' }).lancou, /O bloqueio da partida é da gestão/);
  salvarExc(a, L, LOTE6.map((codigo) => ({ codigo, valor: 'SIM' })), 'Técnico responsável pela frota na filial');
  API.forEach(([fn, p]) => assert.equal(ehGate(chamar(a, L, fn, p)), false, fn + ': ' + JSON.stringify(chamar(a, L, fn, p))));
  // proteções continuam: motivo obrigatório, dupla confirmação do roubo, modo DESLIGADO
  const roubo = chamar(a, L, 'Frota_apiBloqueioRoubo', { veiculoId: 'V1' });
  assert.ok(roubo.lancou && !ehGate(roubo), 'roubo sem motivo é recusado pelo motivo: ' + JSON.stringify(roubo));
  const roubo2 = chamar(a, L, 'Frota_apiBloqueioRoubo', { veiculoId: 'V1', motivo: 'carro levado do estacionamento do cliente, boletim feito', confirmacao1: true, confirmacao2: 'BLOQUEAR XXX' });
  assert.match(roubo2.lancou || '', /falta a dupla confirmação/, JSON.stringify(roubo2));
  const lib = chamar(a, L, 'Frota_apiBloqueioLiberarAgora', { veiculoId: 'V1' });
  assert.ok(lib.lancou && !ehGate(lib), 'liberar sem motivo é recusado pelo motivo: ' + JSON.stringify(lib));
  const odo = chamar(a, L, 'Frota_apiBloqueioHodometro', { veiculoId: 'V1', km: -5 });
  assert.match(odo.lancou || '', /Informe o KM do painel/);
  // painel mostra os botões pela caixa
  assert.deepEqual(painel(a, L), { podeLiberar: true, podeRoubo: true, podeOdometro: true });
  // passagem: quem está envolvido não autoriza a si mesmo (proteção fixa) — a caixa não muda isso
  assert.match(lerLegado('SGO_Frota_Bloqueio.js'), /ninguém autoriza a si mesmo/);
  // conta de fora nunca ganha
  const fora = a.contas.find((c) => ['CLIENTE', 'REPRESENTADA'].includes(c.perfil));
  if (fora) LOTE6.forEach((cod) => assert.equal(a.ctx.SGO_pode_('s_' + fora.login, cod), false));
});

test('4) tela: sinais do painel seguem a caixa; 6 caixas ligadas; proteções e ajuda', () => {
  const a = amb();
  const cat = a.ctx.SGO_poderesCatalogo_().mapa;
  LOTE6.forEach((c) => assert.equal(cat[c].ligado, true, c));
  // sinal = recusa do servidor, com e sem exceção
  const casos = [['elisa', []], ['wanessa', []], ['charles', []], ['joaopedro', [{ codigo: 'FROTA_LIBERAR_PARTIDA', valor: 'SIM' }, { codigo: 'FROTA_BLOQUEAR_PARTIDA', valor: 'SIM' }]],
    ['elisa', [{ codigo: 'FROTA_LIBERAR_PARTIDA', valor: 'NAO' }]], ['wanessa', [{ codigo: 'FROTA_ODOMETRO_CORRIGIR', valor: 'SIM' }]]];
  casos.forEach(([login, exc]) => {
    const b = amb();
    if (!b.idDe(login)) return;
    if (exc.length) salvarExc(b, login, exc);
    const p = painel(b, login);
    assert.equal(p.podeLiberar, !ehGate(chamar(b, login, 'Frota_apiBloqueioLiberarAgora', { veiculoId: 'V1' })), login + ' liberar ' + JSON.stringify(exc));
    assert.equal(p.podeOdometro, !ehGate(chamar(b, login, 'Frota_apiBloqueioHodometro', { veiculoId: 'V1' })), login + ' odômetro ' + JSON.stringify(exc));
    assert.equal(p.podeRoubo, !ehGate(chamar(b, login, 'Frota_apiBloqueioRoubo', { veiculoId: 'V1' })), login + ' roubo ' + JSON.stringify(exc));
  });
  // proteções do bloqueio intactas (texto igual ao de antes)
  const depois = lerLegado('SGO_Frota_Bloqueio.js'), antes = lerAntes('SGO_Frota_Bloqueio.js');
  ['falta a dupla confirmação', 'FBLQ_EMERGENCIA_HORAS', 'Frota_exigirJustificativa_(payload.motivo, [\'bloqueio de roubo do', 'var FBLQ_ODO_PERFIS = [\'ADMIN\', \'GESTOR\'];', 'me.modo === \'DESLIGADO\'']
    .forEach((s) => assert.equal(depois.split(s).length, antes.split(s).length, s));
  const paginas = fs.readdirSync(pastaLegado).filter((f) => /\.html$/.test(f) || f === 'SGO_Frota_BloqueioTela.js').map((f) => lerLegado(f)).join('\n');
  assert.match(paginas, /podeRoubo/, 'a tela usa o sinal podeRoubo');
  const ajudaAdm = lerLegado('SGO_Ajuda_Administracao.js');
  assert.match(ajudaAdm, /Lote 6/); assert.match(ajudaAdm, /«Bloqueio de roubo»/);
  assert.match(lerLegado('SGO_Ajuda_Frota.js'), /Administração > Acessos/);
});
