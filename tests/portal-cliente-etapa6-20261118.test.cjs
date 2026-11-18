// 18/11/2026 — Portal do cliente, ETAPA 6 (troca definitiva; output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md, "Etapa 6" e item 0.1).
// Código real (SGO_Auth.js com o exigirSessao de verdade, SGO_PortalCliente*.js, a ajuda) num vm, com planilha e propriedades simuladas.
// Prova: (1) menu antes -> depois sem perda (cada item antigo tem a tela nova, e cada ação antiga do cliente continua alcançável pela
// entrada do Portal); (2) a trava do legado nasce DESLIGADA e, assim, nada muda; (3) ligada, recusa a sessão CLIENTE fora de SGO_PCL_MODULO
// com o quê, por quê e o que fazer, e o Portal (inclusive a ponte e a trava de arquivo) continua funcionando; (4) o painel "Pronto para
// ligar?" e a lista fechada mínima (preparada, desligada); (5) Início, Unidades e o manual do cliente. Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa6-20261118.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_usuarios_ambiente.cjs');
const NAV = require('./_portal_cliente_navegador.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const RAIZ = path.resolve(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const j = (x) => JSON.parse(JSON.stringify(x));
const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 Teste', aparelho: '' };
const QPQ = /Por quê:[\s\S]*O que fazer:/;

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const DIR = { ID: 'u-dir', USUARIO: 'dora', SENHA: 'Dora2026xx', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
const CLIA = { ID: 'u-cla', USUARIO: 'carla', SENHA: 'Cliente2026x', NOME: 'CARLA CLIENTE A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospital-a.test', CLIENTE_ID: 'cA' };
const REPU = { ID: 'u-rep', USUARIO: 'ana', SENHA: 'Repres2026x', NOME: 'ANA REPRESENTADA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@rep.test', REPRESENTADA_ID: 'rep1' };

function aba(a, nome, cab, linhas) { a.abas.set(nome, { cab: cab.slice(), linhas: (linhas || []).map((o) => cab.map((c) => (o[c] === undefined ? '' : o[c]))) }); }
/** Login de verdade (SGO_Auth.js) e o exigirSessao de verdade: é aqui que a trava do legado vale. */
function amb() {
  const a = ambiente();
  [ADMIN, DIR, TEC, CLIA, REPU].forEach((u) => a.add(Object.assign({}, u)));
  a.abas.get('CAD_USUARIOS').cab.push('AREA');
  aba(a, 'CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'RAZAO_SOCIAL', 'CNPJ', 'STATUS'], [{ ID: 'cA', NOME_FANTASIA: 'HOSPITAL A TESTE', RAZAO_SOCIAL: 'HOSPITAL A LTDA', CNPJ: '11222333000181', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_UNIDADES', ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'STATUS'], [{ ID: 'uA1', CLIENTE_ID: 'cA', NOME_UNIDADE: 'A MATRIZ', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_EQUIPAMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TIPO', 'TAG', 'STATUS'], [{ ID: 'eA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'AUTOCLAVE', TAG: 'AC-01', STATUS: 'ATIVO' }]);
  aba(a, 'DOC_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK_ARQUIVO', 'STATUS', 'CRIADO_EM'], [
    { ID: 'dA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', TIPO_DOCUMENTO: '2. Certificados de Calibração', NOME_ARQUIVO: 'CERT A', LINK_ARQUIVO: '/arquivos/arqCertA123456', STATUS: 'ATIVO', CRIADO_EM: '2026-11-01T10:00:00' }]);
  aba(a, 'REP_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'PUBLICO', 'HTML_ID', 'PDF_ID', 'DESLIGADO_EM'], []);
  a.abas.get('REP_REPRESENTADAS').cab.push('VIGENCIA_FIM');
  a.abas.set('LIC_CONTRATOS', { cab: ['ID', 'CODIGO', 'NUMERO', 'NUMERO_CONTRATO', 'SITUACAO', 'CLIENTE_ID', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'ORGAO_NOME', 'ATUALIZADO_EM'], linhas: [] });
  a.ctx.SGO_CFG.SHEETS.CAD_UNIDADES = 'CAD_UNIDADES';
  a.ctx.SGO_CFG.SHEETS.CAD_EQUIPAMENTOS = 'CAD_EQUIPAMENTOS';
  a.ctx.SGO_DATA.getByField = () => null;
  for (const f of ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente.js', 'SGO_PortalCliente_Troca.js', 'SGO_PortalCliente_Manual.js',
    'SGO_Representacao_Documentos.js', 'SGO_Representacao_Config.js', 'SGO_Ajuda.js', 'SGO_Ajuda_PortalCliente.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  const s = (u) => { const r = a.ctx.login(u.EMAIL, u.SENHA, CTX); assert.equal(r.success, true, u.EMAIL + ': ' + r.message); return r.sessionId; };
  a.sAdm = s(ADMIN); a.sDir = s(DIR); a.sTec = s(TEC); a.sA = s(CLIA); a.sRep = s(REPU);
  a.api = (sid, acao, d) => j(a.ctx.PortalCliente_api(sid, acao, d || {}));
  a.linhas = (n) => (a.abas.get(n) ? a.ctx.SGO_DATA.getAll(n) : []);
  a.modulo = () => vm.runInContext('typeof SGO_PCL_MODULO === "undefined" ? false : SGO_PCL_MODULO', a.ctx);
  return a;
}

test('T6.1 menu antes -> depois sem perda: cada item antigo do cliente abre a tela do Portal que o substitui; tela fora do Portal vai ao Início; a equipe não muda', () => {
  const tela = ler('JS_PortalCliente_Inicio.html');
  const js = /<script>([\s\S]*?)<\/script>/.exec(tela)[1];
  const c = vm.createContext({ USER_CONTEXT: { perfil: 'CLIENTE' }, document: { querySelectorAll: () => [] }, console });
  vm.runInContext(js + '\nvar PCLD = { irAba: "" };', c);
  // a tabela "antes -> depois" do relatório
  const antes = { dashboard: ['portal_cliente_inicio', ''], mobile_home: ['portal_cliente_inicio', ''], assistencia_portal: ['portal_cliente_chamados', ''],
    unidades: ['portal_cliente_equipamentos', 'unidades'], equipamentos: ['portal_cliente_equipamentos', 'equipamentos'], documentos: ['portal_cliente_documentos', 'pastas'],
    lavadora_ciclos: ['portal_cliente_ciclos', ''], meus_avisos: ['portal_cliente_conta', ''] };
  Object.keys(antes).forEach((m) => {
    c.PCLD.irAba = '';
    assert.equal(c.SGO_clienteRota_(m), antes[m][0], m);
    assert.equal(c.PCLD.irAba, antes[m][1], m + ' abre a aba certa');
    assert.ok(c.SGO_TELAS_CLIENTE.indexOf(antes[m][0]) >= 0, m + ': a tela nova é do Portal');
  });
  // as telas do Portal ficam como estão; qualquer outra (atalho, busca, link antigo de e-mail) vai ao Início do Portal; trocar senha continua
  c.SGO_TELAS_CLIENTE.forEach((m) => assert.equal(c.SGO_clienteRota_(m), m));
  ['comercial', 'certificado_calibracao', 'clientes', 'gestao_decisoes', 'minhas_atividades', 'avisos', 'omie', 'xyz'].forEach((m) => assert.equal(c.SGO_clienteRota_(m), 'portal_cliente_inicio', m));
  assert.equal(c.SGO_clienteRota_('trocar_senha'), 'trocar_senha');
  // equipe: nenhuma troca
  c.USER_CONTEXT = { perfil: 'GESTOR' };
  ['dashboard', 'unidades', 'documentos', 'assistencia_portal', 'lavadora_ciclos'].forEach((m) => assert.equal(c.SGO_clienteRota_(m), m, 'equipe: ' + m));
  // a ponte do navegador e a do servidor têm a MESMA lista fechada
  const a = amb();
  assert.deepEqual(j(c.SGO_PCL_PONTE.slice().sort()), j(Object.keys(a.ctx.PCL_LEGADO_CLIENTE).sort()), 'ponte do navegador = ponte do servidor');
  // nada que o cliente fazia sumiu: cada ação antiga do cliente continua alcançável pela entrada do Portal
  const L = a.ctx.PCL_LEGADO_CLIENTE;
  vm.runInContext('var AST_ACOES_CLIENTE = ' + JSON.stringify(['acesso', 'iniciar', 'portal', 'solicitar', 'relatorio', 'avisosLidos', 'responderOrcamento', 'relatorioAtendimento', 'relatorioPeriodoCliente', 'documentosGerados', 'previaAtendimento', 'confirmarAtendimento']) + ';', a.ctx);
  a.ctx.AST_ACOES_CLIENTE.forEach((ac) => assert.equal(L.Assistencia_api.confere([ac]), '', 'Meus chamados: ' + ac));
  assert.notEqual(L.Assistencia_api.confere(['triagem']), '', 'ação interna da Assistência fica de fora');
  ['iniciar', 'buscar', 'equipamento', 'conferir', 'gerar', 'listar', 'abrir', 'assinar', 'novaVersao'].forEach((ac) => assert.equal(L.LavCiclo_api.confere([ac]), '', 'Relatórios de ciclo: ' + ac));
  assert.notEqual(L.LavCiclo_api.confere(['referencias']), '');
  ['cliente', 'unidade', 'equipamento'].forEach((e) => assert.equal(L.documentosPastas.confere([{ escopo: e, id: 'x' }]), '', 'pastas: ' + e));
  assert.equal(L.SGO_Ajuda_apiTela.confere(['portal_cliente_documentos']), ''); assert.notEqual(L.SGO_Ajuda_apiTela.confere(['comercial']), '');
  // as telas novas que recebem o que saiu dos itens antigos existem: casca, menu, ações e textos
  const idx = ler('Index.html'), core = ler('JS_Core.html'), docs = ler('JS_PortalCliente_Documentos.html'), cham = ler('JS_PortalCliente_Chamados.html');
  ['portal_cliente_inicio', 'portal_cliente_ciclos'].forEach((m) => { assert.match(idx, new RegExp('id="menu-btn-' + m + '"')); assert.match(core, new RegExp('mod === "' + m + '"')); });
  assert.match(idx, /include\('JS_PortalCliente_Inicio'\)/);
  assert.match(core, /SGO_clienteRota_\(mod\)/); assert.match(core, /SGO_iniciarClientePortal_\(\); return; \}/); assert.match(core, /SGO_aplicarMenuCliente_\(\)/);
  assert.match(docs, /\["pastas", "Por pastas \(prontuário\)"\]/); assert.match(docs, /\["unidades", "Unidades"\]/); assert.match(docs, /data-dc="eqPastas"/); assert.match(docs, /data-dc="unDocs"/);
  assert.match(cham, /data-ch="relAtend"/); assert.match(cham, /data-ch="previa"/);
  assert.ok(a.ctx.PCL_ACOES_CLIENTE.inicio && a.ctx.PCL_ACOES_CLIENTE.unidades && a.ctx.PCL_ACOES_CLIENTE.legado && a.ctx.PCL_ACOES_CLIENTE.manual);
  // a tela do cliente chama só PortalCliente_api, que está nas duas listas (transição e mínima)
  assert.ok(a.ctx.PCL_FUNCOES_CLIENTE.indexOf('PortalCliente_api') >= 0 && a.ctx.PCL_FUNCOES_CLIENTE_MINIMA.indexOf('PortalCliente_api') >= 0);
  // decisão: as 5 etapas antigas continuam só nos documentos A4 e na Representação (as telas do cliente usam as 8)
  assert.match(ler('SGO_Assistencia_Config.js'), /var AST_ETAPAS_CLIENTE = \[/);
});

test('T6.2 trava do legado DESLIGADA por padrão: nada muda (exigirSessao aceita o cliente, a lista e o portão ficam como estavam)', () => {
  const a = amb();
  const cfg = a.ctx.PCl_funcoesCfg_();
  assert.equal(cfg.travaLegado, false); assert.equal(cfg.listaMinima, false); assert.equal(cfg.modo, 'OBSERVAR');
  assert.equal(a.ctx.PCl_travaLegadoLigada_(), false);
  assert.equal(a.ctx.exigirSessao(a.sA).perfil, 'CLIENTE', 'o cliente continua passando no exigirSessao');
  assert.equal(j(a.ctx.SGO_Ajuda_apiTela(a.sA, 'portal_cliente_documentos')).ok, true, 'função antiga chamada direto continua respondendo');
  for (const fn of ['Assistencia_api', 'documentosPastas', 'cadastrosPainel', 'LavCiclo_api']) {
    const r = j(a.ctx.PortalCliente_portaoFuncao_(a.sA, fn, ''));
    assert.equal(r.permitir, true, fn); assert.equal(r.naLista, true, fn + ' continua na lista de transição');
  }
  assert.equal(a.modulo(), false);
  // a representada segue a trava dela, igual
  assert.throws(() => a.ctx.exigirSessao(a.sRep), /só o módulo Representação/);
});

test('T6.3 trava do legado LIGADA: recusa a sessão CLIENTE fora de SGO_PCL_MODULO (quê, por quê, o que fazer) e o Portal continua funcionando', () => {
  const a = amb();
  // só Administrador e Diretoria (caixa «Alterar as regras do portal»), com motivo
  const t = a.api(a.sTec, 'salvarSeguranca', { travaLegado: 'LIGADA', motivo: 'tentativa do técnico de ligar' });
  assert.equal(t.ok, false); assert.match(t.message, /permissão «Alterar as regras do portal»/);
  const curto = a.api(a.sDir, 'salvarSeguranca', { travaLegado: 'LIGADA', motivo: 'curto' });
  assert.equal(curto.ok, false); assert.equal(curto.faltam[0].campo, 'pclSegMotivo');
  const lig = a.api(a.sDir, 'salvarSeguranca', { travaLegado: 'LIGADA', motivo: 'Observação de 7 dias concluída sem funções fora da lista' });
  assert.equal(lig.ok, true, lig.message); assert.match(lig.message, /trava do legado LIGADA[\s\S]*vale na hora/);
  assert.equal(lig.seguranca.travaLegado, true); assert.equal(lig.seguranca.prontidao.travaLegado, true);
  assert.ok(a.linhas('PCL_REGRAS_HIST').some((h) => h.CHAVE === 'FUNCOES_CLIENTE' && /"travaLegado":true/.test(h.DEPOIS_JSON) && h.POR_NOME === 'DORA DIRETORA TESTE' && /Observação/.test(h.MOTIVO)));
  // fora do Portal: recusa com o caminho
  assert.throws(() => a.ctx.exigirSessao(a.sA), (e) => /não faz parte do Portal do cliente/.test(e.message) && QPQ.test(e.message) && /Conversa geral/.test(e.message));
  const direta = j(a.ctx.SGO_Ajuda_apiTela(a.sA, 'portal_cliente_documentos'));
  assert.equal(direta.ok, false, 'função antiga chamada direto pela conta de cliente é recusada');
  // dentro do Portal: funciona (entrada única, ponte e trava de arquivo)
  const sit = a.api(a.sA, 'situacao'); assert.equal(sit.ok, true, sit.message);
  const aj = a.api(a.sA, 'legado', { fn: 'SGO_Ajuda_apiTela', args: ['portal_cliente_documentos'] });
  assert.equal(aj.ok, true, aj.message); assert.equal(aj.resultado.ok, true); assert.match(aj.resultado.ajuda.titulo, /Documentos técnicos/);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_(a.sA, 'arqCertA123456'), true, 'o documento do próprio cliente abre');
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_(a.sA, 'arquivo-de-outro'), false, 'negar por padrão continua');
  assert.equal(a.ctx.Representacao_arquivoClientePermitido_(a.sA, 'arqCertA123456'), true, 'a rota /arquivos do servidor passa pela trava de arquivo');
  assert.equal(a.modulo(), false, 'a marca do módulo volta ao estado anterior depois de cada entrada');
  // equipe e representada não mudam
  assert.equal(a.ctx.exigirSessao(a.sAdm).perfil, 'ADMIN'); assert.equal(a.ctx.exigirSessao(a.sTec).perfil, 'TECNICO');
  assert.throws(() => a.ctx.exigirSessao(a.sRep), /só o módulo Representação/);
  // a equipe continua chamando as funções antigas (nenhuma recusa)
  assert.equal(j(a.ctx.SGO_Ajuda_apiTela(a.sDir, 'portal_cliente_contratos')).ok, true);
  // voltar atrás: desligar com motivo
  const des = a.api(a.sDir, 'salvarSeguranca', { travaLegado: 'DESLIGADA', motivo: 'Voltar atrás durante o piloto, por precaução' });
  assert.equal(des.ok, true, des.message);
  assert.equal(a.ctx.exigirSessao(a.sA).perfil, 'CLIENTE');
});

test('T6.4 ponte fechada do Portal: só as funções antigas da lista, com as ações do cliente; a sessão é sempre a da própria pessoa', () => {
  const a = amb();
  vm.runInContext('var AST_ACOES_CLIENTE = ["portal", "responderOrcamento"]; function Inicio_apiBuscar(sid, termo) { return { ok: true, sid: sid, termo: termo }; }', a.ctx);
  const fora = a.api(a.sA, 'legado', { fn: 'Comercial_api', args: ['lista'] });
  assert.equal(fora.ok, false); assert.equal(fora.codigo, 'LEGADO'); assert.match(fora.message, QPQ);
  assert.ok(a.linhas('PCL_ACESSOS').some((r) => r.ACAO === 'FUNCAO_RECUSADA' && /Comercial_api/.test(r.DETALHE) && r.CLIENTE_ID === 'cA'), 'a tentativa fica registrada');
  const interna = a.api(a.sA, 'legado', { fn: 'Assistencia_api', args: ['triagem', {}] });
  assert.equal(interna.ok, false); assert.match(interna.message, /"triagem" da Assistência técnica é da equipe Metrolabs/);
  const ajudaEquipe = a.api(a.sA, 'legado', { fn: 'SGO_Ajuda_apiManual', args: ['comercial'] });
  assert.equal(ajudaEquipe.ok, false);
  // o sessionId vem da sessão, nunca do pedido
  const b = a.api(a.sA, 'legado', { fn: 'Inicio_apiBuscar', args: ['AC-01'] });
  assert.equal(b.ok, true, b.message); assert.equal(b.resultado.sid, a.sA); assert.equal(b.resultado.termo, 'AC-01');
  // a equipe não usa a ponte (ação do cliente)
  const eq = a.api(a.sDir, 'legado', { fn: 'Inicio_apiBuscar', args: ['x'] });
  assert.equal(eq.ok, false); assert.match(eq.message, /Ação desconhecida/);
});

test('T6.5 lista fechada mínima: preparada e DESLIGADA; escolhida (com a recusa ligada), só a entrada do Portal e o básico passam', () => {
  const a = amb();
  const min = a.ctx.PCL_FUNCOES_CLIENTE_MINIMA;
  ['PortalCliente_api', 'getSessaoAtual', 'validarSessao', 'logout', 'login', 'getPublicConfig', 'trocarSenhaAcesso', 'comApi'].forEach((f) => assert.ok(min.indexOf(f) >= 0, f));
  ['Assistencia_api', 'LavCiclo_api', 'documentosPastas', 'cadastrosPainel', 'equipamentosListar', 'SGO_Ajuda_apiTela'].forEach((f) => assert.ok(min.indexOf(f) < 0, f + ' fica fora da mínima'));
  assert.equal(a.ctx.PCl_funcoesCfg_().listaMinima, false, 'nasce desligada');
  const r = a.api(a.sDir, 'salvarSeguranca', { modo: 'RECUSAR', lista: 'MINIMA', motivo: 'Fim da observação e telas antigas trocadas pelo Portal' });
  assert.equal(r.ok, true, r.message); assert.match(r.message, /lista usada: mínima/);
  for (const fn of ['Assistencia_api', 'documentosPastas', 'cadastrosPainel', 'LavCiclo_api']) {
    const p = j(a.ctx.PortalCliente_portaoFuncao_(a.sA, fn, '')); assert.equal(p.permitir, false, fn); assert.match(p.mensagem, QPQ);
    assert.match(p.mensagem, /Meus equipamentos, Vencimentos e cronograma/, 'a mensagem cita as telas do Portal');
  }
  for (const fn of ['PortalCliente_api', 'getSessaoAtual', 'logout', 'comApi']) assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sA, fn, '')).permitir, true, fn);
  assert.deepEqual(a.api(a.sDir, 'seguranca').seguranca.lista.sort(), j(min.slice().sort()), 'a aba mostra a lista em uso');
  const volta = a.api(a.sDir, 'salvarSeguranca', { lista: 'TRANSICAO', motivo: 'Voltar à lista de transição durante o piloto' });
  assert.equal(volta.ok, true, volta.message);
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sA, 'Assistencia_api', '')).permitir, true, 'de volta à transição');
});

test('T6.6 painel "Pronto para ligar?": dias de observação, funções fora da lista nos últimos dias, as duas travas e o passo a passo', () => {
  const a = amb();
  let p = a.api(a.sDir, 'seguranca').seguranca.prontidao;
  assert.equal(p.diasObservacao, 0); assert.equal(p.prontoTrava, false); assert.equal(p.travaLegado, false); assert.equal(p.recusaServidor, false); assert.equal(p.listaMinima, false);
  assert.equal(p.itens.find((i) => i.k === 'observacao').ok, false);
  assert.ok(p.itens.find((i) => i.k === 'telas').ok, 'telas antigas já trocadas');
  assert.ok(p.passos.length >= 5 && p.passos.some((x) => /voltar atrás/i.test(x)) && p.passos.some((x) => /Trava do legado/.test(x)));
  // 8 dias de observação, só o que o Portal usa
  const hoje = a.ctx.PCl_hoje_(), dia = (n) => a.ctx.PCl_diaMais_(hoje, n);
  a.props.set('PCL_FUNCOES_CFG', JSON.stringify({ modo: 'OBSERVAR', dias: 7, desde: dia(-8) + 'T00:16:00' }));
  const obs = (fn, d, n) => a.ctx.SGO_DATA.insert('PCL_FUNCOES_OBSERVADAS', { ID: 'o' + fn + d, DIA: dia(d), FUNCAO: fn, USUARIO_ID: 'u-cla', USUARIO_NOME: 'CARLA', CLIENTE_ID: 'cA', CHAMADAS: n, RECUSADAS: 0, NA_LISTA: 'SIM', MODO: 'OBSERVAR', PRIMEIRA_EM: dia(d) + 'T09:00:00', ULTIMA_EM: dia(d) + 'T10:00:00' });
  a.ctx.PCl_garantirAbas_ && a.ctx.PCl_garantirAbas_();
  obs('PortalCliente_api', -1, 40); obs('getSessaoAtual', -1, 5); obs('Comercial_api', -20, 3);
  p = a.api(a.sDir, 'seguranca').seguranca.prontidao;
  assert.equal(p.diasObservacao, 8); assert.equal(p.prontoTrava, true, 'observação cumprida e nada fora da lista nos últimos 7 dias'); assert.equal(p.prontoMinima, true);
  assert.ok(p.fora.some((f) => f.funcao === 'Comercial_api' && f.recentes === 0 && f.interna), 'chamada antiga aparece, sem contar no período');
  // uma tela antiga ainda em uso aparece e segura a lista mínima; uma função interna recente segura a trava
  obs('Assistencia_api', -2, 4);
  p = a.api(a.sDir, 'seguranca').seguranca.prontidao;
  assert.equal(p.prontoTrava, true, 'Assistencia_api está na lista de transição'); assert.equal(p.prontoMinima, false, 'mas não na mínima');
  obs('Omie_api', -1, 1);
  p = a.api(a.sDir, 'seguranca').seguranca.prontidao;
  assert.equal(p.prontoTrava, false); assert.match(p.itens.find((i) => i.k === 'foraTransicao').texto, /fora da lista chamadas por clientes/);
  assert.ok(p.fora[0].recentes > 0);
});

test('T6.7 Início do Portal, Unidades da empresa e a ponte com a Assistência (ambiente da Assistência, dados fictícios)', () => {
  const a = NAV.ambiente();
  const g = a.pcl('s_cliente.alfa', 'inicio');
  assert.equal(g.ok, true, g.message);
  assert.deepEqual(g.cartoes.map((c) => c.k), ['abertos', 'visita', 'vencimentos', 'documentos']);
  const card = (r, k) => r.cartoes.find((c) => c.k === k);
  assert.equal(card(g, 'abertos').valor, '3', 'SOL-0002 (complemento), CH-0104 (agendado) e CH-0105 (triagem); o de outro cliente nunca');
  assert.match(card(g, 'visita').valor, /21\/10\/2026/); assert.match(card(g, 'visita').texto, /CH-2026-0104/);
  assert.equal(card(g, 'vencimentos').valor, '2', 'laudo vencido em 14/10 e certificado de 08/11');
  assert.match(card(g, 'documentos').texto, /08\/10\/2026 \(a sua entrada anterior\)/);
  assert.ok(g.precisa.some((x) => x.numero === 'SOL-2026-0002' && /mais informações/.test(x.texto)));
  assert.equal(g.pode.abrir, true); assert.equal(g.pode.indicadores, true); assert.ok(!JSON.stringify(g).includes('CLINICA TESTE BETA'));
  // Solicitante (só un1): não conta a Filial
  const s = a.pcl('s_sonia.alfa', 'inicio');
  assert.equal(s.ok, true, s.message); assert.equal(card(s, 'abertos').valor, '2');
  // Consulta: sem abrir chamado e sem indicadores
  const c = a.pcl('s_celia.alfa', 'inicio');
  assert.equal(c.pode.abrir, false); assert.equal(c.pode.indicadores, false); assert.match(c.pode.motivoAbrir, QPQ);
  // Unidades: só os campos públicos e o escopo da pessoa
  const u = a.pcl('s_cliente.alfa', 'unidades');
  assert.equal(u.ok, true, u.message); assert.deepEqual(u.unidades.map((x) => x.nome), ['Unidade Centro', 'Unidade Filial']);
  assert.equal(u.unidades[0].equipamentos, 2);
  assert.ok(!/RESPONSAVEL|Rui Responsável|Pessoa interna|LATITUDE|rui@alfa/.test(JSON.stringify(u)), 'sem responsável interno, coordenadas ou e-mail interno');
  assert.deepEqual(a.pcl('s_sonia.alfa', 'unidades').unidades.map((x) => x.id), ['un1']);
  // a ponte leva a Assistência com as ações do cliente (Meus chamados)
  const pt = a.pcl('s_cliente.alfa', 'legado', { fn: 'Assistencia_api', args: ['portal', {}] });
  assert.equal(pt.ok, true, pt.message); assert.equal(pt.resultado.ok, true, pt.resultado.message);
  assert.equal(a.pcl('s_cliente.alfa', 'legado', { fn: 'Assistencia_api', args: ['agendar', {}] }).ok, false);
  // documentos por pastas (com PGT e POP) pela ponte
  const pa = a.pcl('s_cliente.alfa', 'legado', { fn: 'documentosPastas', args: [{ escopo: 'cliente', id: '', via: 'portal' }] });
  assert.equal(pa.ok, true, pa.message); assert.equal(pa.resultado.success, true, pa.resultado.message);
  assert.ok(pa.resultado.pastas.some((x) => x.id === 'PGT_POP' && x.total >= 2), 'pasta PGT e POP com os documentos da unidade');
  assert.ok(!JSON.stringify(pa.resultado).includes('ES-03'), 'nada do outro cliente');
  // a outra empresa não vê nada da primeira
  const beta = a.pcl('s_cliente.beta', 'unidades');
  assert.ok(beta.ok === false || !JSON.stringify(beta).includes('Unidade Centro'));
});

test('T6.8 manual do cliente: o mesmo texto no Portal (A4) e em docs/, sem termos internos, com as capturas reais; ajuda, dicas e manual interno', () => {
  const a = amb();
  const m = a.api(a.sA, 'manual');
  assert.equal(m.ok, true, m.message); assert.match(m.html, /Manual do Portal do cliente/);
  const M = a.ctx.PCL_MANUAL_CLIENTE;
  const exigidas = ['Entrar no Portal e aceitar o termo de uso', 'Abrir um chamado', 'Acompanhar os chamados', 'Conversar com a Metrolabs', 'Aprovar um orçamento (Gestor do cliente)',
    'Confirmar o atendimento e o relatório', 'Documentos técnicos', 'Meus equipamentos e unidades', 'Vencimentos e cronograma', 'Indicadores e relatório do período', 'Minha conta e equipe', 'Avisos por e-mail (preferências)'];
  exigidas.forEach((t) => assert.ok(M.secoes.some((s) => s.titulo === t), 'seção: ' + t));
  assert.ok(M.secoes.every((s) => m.html.indexOf('>' + (M.secoes.indexOf(s) + 1) + '. ') >= 0), 'o A4 do Portal traz todas as seções numeradas');
  const texto = JSON.stringify(M);
  // "cargo ou função" é o rótulo da tela do orçamento; termos de código, servidor e banco nunca aparecem
  assert.doesNotMatch(texto, /SGO_|PCL_|PCl|PortalCliente_api|legado|sessionId|perfil CLIENTE|exigirSessao|servidor|planilha|Apps Script|IA\b/, 'sem termos internos');
  assert.ok(a.linhas('PCL_ACESSOS').some((r) => r.ACAO === 'MANUAL_ABERTO'));
  // docs/: o manual do cliente e a versão A4 com capturas reais
  const md = fs.readFileSync(path.join(RAIZ, 'docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.md'), 'utf8');
  exigidas.forEach((t) => assert.ok(md.indexOf(t) >= 0, 'docs: ' + t));
  const imgs = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((x) => x[1]);
  assert.ok(imgs.length >= 15, 'capturas no manual: ' + imgs.length);
  imgs.forEach((i) => assert.ok(fs.existsSync(path.join(RAIZ, 'docs', i)), 'imagem existe: ' + i));
  assert.ok(fs.existsSync(path.join(RAIZ, 'docs/MANUAL_PORTAL_CLIENTE_PARA_O_CLIENTE.html')), 'versão A4 imprimível');
  // ajuda, dicas, guias e o manual interno
  const aj = ler('JS_PortalCliente_Ajuda.html');
  ['pclSegTravaLegado', 'pclSegLista'].forEach((k) => assert.match(aj, new RegExp('  ' + k + ': \'')));
  ['inicio', 'unidades'].forEach((k) => assert.match(aj, new RegExp('\\n  ' + k + ': \\[')));
  const tel = a.ctx.SGO_ajudaTelas_PortalCliente_();
  ['portal_cliente_inicio', 'portal_cliente_ciclos'].forEach((k) => { assert.ok(tel[k], k); assert.ok(a.ctx.SGO_AJUDA_NOMES[k], k); });
  assert.doesNotMatch(JSON.stringify(tel.portal_cliente_inicio) + JSON.stringify(tel.portal_cliente_ciclos), /Administração|caixa «|Administrador/, 'ajuda do cliente sem recurso administrativo');
  assert.match(JSON.stringify(tel.portal_cliente_contratos), /Pronto para ligar\?/);
  const mi = fs.readFileSync(path.join(RAIZ, 'docs/MANUAL_MODULO_PORTAL_CLIENTE.md'), 'utf8');
  assert.match(mi, /## 28\. Troca definitiva \(etapa 6\)/); assert.match(mi, /Pronto para ligar\?/); assert.match(mi, /Trava do legado/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Troca definitiva \(etapa 6\)/, 'base do assistente regerada');
  assert.match(ler('SGO_AssistenteErros.js'), /JS_PortalCliente_Inicio: 'portal_cliente_inicio'/);
});
