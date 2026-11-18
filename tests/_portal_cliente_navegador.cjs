// Portal do cliente, etapa 6 (18/11/2026): o SGO+ de verdade no navegador (Index.html com os includes do legado indicado em DEST) com o
// servidor simulado do ambiente de teste da Assistência (tests/_assistencia_ambiente.cjs) e os dados fictícios do Portal. Usado pelo teste
// tests/portal-cliente-etapa6-navegador-20261118.test.cjs e pelas capturas da etapa 6 (output/portal-cliente-20261116/etapa6/capturas.cjs).
// "servir" decide quais funções o servidor simulado aceita (por exemplo, só a lista fechada mínima): as demais respondem com a recusa 403
// do servidor, como na produção com a recusa ligada. Só dados de teste.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const AST = require('./_assistencia_ambiente.cjs');
const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8');
const j = (x) => JSON.parse(JSON.stringify(x));

const EXTRAS = ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
  'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js', 'SGO_DocumentosPastas.js', 'SGO_PortalCliente_Documentos.js', 'SGO_PortalCliente_Avisos.js', 'SGO_PortalCliente_Painel.js',
  'SGO_PortalCliente_Troca.js', 'SGO_PortalCliente_Manual.js', 'SGO_Usuarios_AcessoCliente.js', 'SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js',
  'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js', 'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Regua.js',
  'SGO_LavCiclo_Main.js', 'SGO_LavCiclo_Leitor.js', 'SGO_LavCiclo_Documento.js', 'SGO_Inicio.js', 'SGO_Ajuda.js', 'SGO_Ajuda_PortalCliente.js', 'SGO_Ajuda_LavCiclo.js'];

/** Lista fechada mínima da etapa 6 (a mesma de PCL_FUNCOES_CLIENTE_MINIMA). */
function listaMinima(a) { return a.ctx.PCL_FUNCOES_CLIENTE_MINIMA.slice(); }

/** Ambiente com os dados fictícios do Portal: Gestor (cliente.alfa), Solicitante (sonia, só un1), Consulta (celia), equipe (dora). */
function ambiente() {
  const base = AST.ambiente({});
  const a = AST.ambiente({
    extras: EXTRAS.filter((f) => fs.existsSync(path.join(BASE, f))),
    tabelas: {
      CAD_USUARIOS: base.tabelas.CAD_USUARIOS.concat([
        { ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_con', USUARIO: 'celia.alfa', NOME: 'CELIA CONSULTA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]' }]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', ENDERECO: 'Rua Filial, 20', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO', RESPONSAVEL: 'Pessoa interna teste' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Lavadora ultrassônica', MODELO: 'U4', SERIE: 'S-400', TAG: 'LU-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  });
  a.pcl = (sid, acao, d) => { a.ctx.PCl_memoLimpar_(); return j(a.ctx.PortalCliente_api(sid, acao, d || {})); };
  ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_cliente.beta'].forEach((sid) => {
    const t = a.pcl(sid, 'minhaConta').termo;
    if (t && t.pendente) a.pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao });
  });
  a.ctx.SGO_DATA.getByField = () => null;
  semear(a);
  return a;
}
const ch = (o) => Object.assign({ CLIENTE_NOME: 'HOSPITAL TESTE ALFA LTDA', PRIORIDADE: 'P2', CANAL: 'PORTAL' }, o);
/** "Hoje" do ambiente: segunda-feira 19/10/2026, 10h. */
function semear(a) {
  a.tabelas.ATEC_SOLICITACOES = [
    { ID: 'solF', NUMERO: 'SOL-2026-0002', ORIGEM: 'PORTAL', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', EQUIPAMENTO_TEXTO: 'Lavadora LV-02', SITUACAO: 'COMPLEMENTO', COMPLEMENTO_PERGUNTA: 'Qual o código de alarme no visor?', CRIADO_EM: '2026-10-16T09:00:00', POR_ID: 'u_sol', SINTOMA: 'A lavadora para no meio do ciclo de lavagem e mostra alarme no visor.' }];
  a.tabelas.ATEC_CHAMADOS = [
    ch({ ID: 'chA', NUMERO: 'CH-2026-0101', SITUACAO: 'ENCERRADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', EQUIPAMENTO_TEXTO: 'Autoclave AC-01', ABERTO_EM: '2026-10-05T08:00:00', ATENDIDO_EM: '2026-10-06T12:00:00', ENCERRADO_EM: '2026-10-16T14:00:00', OS_ID: 'osA', SINTOMA: 'Autoclave interrompe o ciclo na secagem com alarme de pressão.' }),
    ch({ ID: 'chD', NUMERO: 'CH-2026-0104', SITUACAO: 'AGENDADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', EQUIPAMENTO_TEXTO: 'Lavadora LV-02', ABERTO_EM: '2026-10-15T08:00:00', AGENDADO_PARA: '2026-10-21T09:00:00', TECNICO_NOME: 'TIAGO TECNICO TESTE', SINTOMA: 'Manutenção preventiva do contrato.' }),
    ch({ ID: 'chE', NUMERO: 'CH-2026-0105', SITUACAO: 'EM_TRIAGEM', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', EQUIPAMENTO_TEXTO: 'Lavadora ultrassônica LU-04', ABERTO_EM: '2026-10-16T08:00:00', SINTOMA: 'Não aquece a água do tanque.' }),
    ch({ ID: 'chZ', NUMERO: 'CH-2026-0199', SITUACAO: 'AGENDADO', CLIENTE_ID: 'c2', CLIENTE_NOME: 'CLINICA TESTE BETA', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', ABERTO_EM: '2026-10-15T08:00:00', AGENDADO_PARA: '2026-10-20T09:00:00' })];
  a.tabelas.ATEC_OS = [{ ID: 'osA', NUMERO: 'OS-2026-0101', CHAMADO_ID: 'chA', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', SITUACAO: 'ENCERRADA', CHEGOU_EM: '2026-10-05T10:00:00', TIPO_NOME: 'Manutenção corretiva' }];
  const doc = (o) => Object.assign({ STATUS: 'ATIVO', CRIADO_EM: '2026-10-10T10:00:00', DATA_EMISSAO: '2026-10-10' }, o);
  a.tabelas.DOC_DOCUMENTOS = [
    doc({ ID: 'd1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqC1xxxxxxx', DATA_VENCIMENTO: '2026-11-08' }),
    doc({ ID: 'd4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Relatórios de qualificação', NOME_ARQUIVO: 'Qualificação AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqQ1xxxxxxx', DATA_VENCIMENTO: '2027-05-07' }),
    doc({ ID: 'd5', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Laudo NR-13', NOME_ARQUIVO: 'Laudo NR-13 AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqN1xxxxxxx', DATA_VENCIMENTO: '2026-10-14' }),
    doc({ ID: 'd8', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: 'PGT - Plano de Gerenciamento das Tecnologias em Saúde', NOME_ARQUIVO: 'PGT Unidade Centro rev 02.pdf', LINK_ARQUIVO: '/arquivos/arqPGTxxxxxx' }),
    doc({ ID: 'd9', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: 'POP - Procedimento Operacional Padrão', NOME_ARQUIVO: 'POP 05 Limpeza da autoclave.pdf', LINK_ARQUIVO: '/arquivos/arqPOPxxxxxx' }),
    doc({ ID: 'd7', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado ES-03.pdf', LINK_ARQUIVO: '/arquivos/arqC3xxxxxxx', DATA_VENCIMENTO: '2026-10-25' })];
  a.tabelas.PCL_ACESSOS = (a.tabelas.PCL_ACESSOS || []).concat([
    { ID: 'acx1', CLIENTE_ID: 'c1', USUARIO_ID: 'u_cli', USUARIO_NOME: 'CLIENTE ALFA TESTE', ACAO: 'ENTRADA', DETALHE: 'Entrou no Portal', EM: '2026-10-19T09:30:00' },
    { ID: 'acx2', CLIENTE_ID: 'c1', USUARIO_ID: 'u_cli', USUARIO_NOME: 'CLIENTE ALFA TESTE', ACAO: 'ENTRADA', DETALHE: 'Entrou no Portal', EM: '2026-10-08T09:00:00' }]);
  if (a.ctx.SGO_Atendimentos_invalidar_) a.ctx.SGO_Atendimentos_invalidar_();
}

/**
 * Abre o SGO+ no navegador como a sessão sid. o.servir(fn) -> true para as funções que o servidor simulado aceita (padrão: todas as que
 * existem no ambiente). Devolve { page, chamadas, erros, fase(n) } — chamadas: "fn" ou "PortalCliente_api:acao[/fn]".
 */
async function abrirPortal(browser, a, sid, o) {
  o = o || {};
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  const largura = o.largura || 1366;
  const page = await browser.newPage({ viewport: { width: largura, height: o.altura || (largura < 500 ? 844 : 900) } });
  const chamadas = [], erros = [], recusadas = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('popup', (p) => p.close().catch(() => {}));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    const det = fn === 'PortalCliente_api' ? ':' + args[1] + (args[1] === 'legado' ? '/' + ((args[2] || {}).fn || '') : '') : '';
    chamadas.push(fn + det);
    if (o.servir && !o.servir(fn)) { recusadas.push(fn); return { ok: false, erro: 'Esta função é da equipe Metrolabs e não faz parte do Portal do cliente (' + fn + ').' }; }
    try {
      const sessao = Object.assign({ sessionId: args[0] }, a.sessoes[args[0]]);
      if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: sessao } };
      if (fn === 'validarSessao') return { ok: true, valor: { valid: true, data: sessao } };
      if (fn === 'comApi') return { ok: true, valor: { ok: false, erro: 'SEM_ACESSO' } };
      if (typeof a.ctx[fn] === 'function') {
        if (a.ctx.PCl_memoLimpar_) a.ctx.PCl_memoLimpar_();
        const v = a.ctx[fn](...args);
        return { ok: true, valor: v === undefined ? null : j(v) };
      }
    } catch (e) { return { ok: false, erro: String((e && e.message) || e) }; }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((s) => {
    try { sessionStorage.setItem('SGO_SESSION', s); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, sid);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(o.espera || 2200);
  return { page, chamadas, erros, recusadas };
}
/** Botões visíveis do menu (data-mod) e grupos visíveis. */
async function menuVisivel(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#menu .menu-btn')).filter((b) => {
    if (b.style.display === 'none') return false;
    const g = b.closest('.menu-grupo'); return !(g && g.style.display === 'none');
  }).map((b) => b.getAttribute('data-mod')));
}
async function rolagemLateral(page) { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }

module.exports = { ambiente, abrirPortal, menuVisivel, rolagemLateral, listaMinima, EXTRAS };
