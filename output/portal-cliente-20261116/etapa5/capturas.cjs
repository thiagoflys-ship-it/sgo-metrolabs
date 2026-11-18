// Capturas das telas REAIS da etapa 5 (Index.html com os includes da cópia de trabalho) a 1366, 390 e 320 px, com os dados fictícios do teste
// tests/portal-cliente-etapa5-20261118.test.cjs e o servidor simulado. Telas: "Indicadores" do Gestor do cliente (todas as unidades, só a
// Filial e com o relatório do período gerado), do Solicitante (só a unidade dele) e da Consulta (recusa com o caminho); "Uso do portal" da
// equipe (lista, pessoas e avisos de um cliente e a linha do tempo de uma pessoa). Confere a rolagem lateral da página, os erros de
// JavaScript e o botão do menu (aparece para Gestor e Solicitante; não para a Consulta). Uso (na raiz do repositório):
//   DEST=output/financeiro-20261116/cand18 node --require ./output/lote-20261111n/fontes.cjs output/portal-cliente-20261116/etapa5/capturas.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const AST = require('../../../tests/_assistencia_ambiente.cjs');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const BASE = path.resolve(__dirname, '../../../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8');
const j = (x) => JSON.parse(JSON.stringify(x));
const SAIDA = path.join(__dirname, 'capturas');
const IP = '200.1.2.3', NAV = 'Mozilla/5.0 (Windows NT 10.0) Chrome/130 Teste';

function amb() {
  const base = AST.ambiente({});
  const a = AST.ambiente({
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
      'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js', 'SGO_DocumentosPastas.js', 'SGO_PortalCliente_Documentos.js', 'SGO_PortalCliente_Avisos.js', 'SGO_PortalCliente_Painel.js',
      'SGO_Usuarios_AcessoCliente.js', 'SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js',
      'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js', 'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Regua.js'],
    tabelas: {
      CAD_USUARIOS: base.tabelas.CAD_USUARIOS.concat([
        { ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]', CLIENTE_ULTIMA_ENTRADA_EM: '2026-10-16T09:00:00' },
        { ID: 'u_con', USUARIO: 'celia.alfa', NOME: 'CELIA CONSULTA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]', CLIENTE_ULTIMA_ENTRADA_EM: '2026-06-01T09:00:00' },
        { ID: 'u_novo', USUARIO: 'nina.alfa', NOME: 'NINA CONVIDADA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'nina@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1b"]', CRIADO_EM: '2026-10-18T10:00:00' },
        { ID: 'u_venc', USUARIO: 'vito.alfa', NOME: 'VITO CONVITE VENCIDO TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'vito@alfa', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]', CRIADO_EM: '2026-10-10T10:00:00' }
      ]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', ENDERECO: 'Rua Filial, 20', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  });
  a.pcl = (sid, acao, d) => { a.ctx.PCl_memoLimpar_(); const r = j(a.ctx.PortalCliente_api(sid, acao, d || {})); if (a.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
  a.aceitar = (sid) => { const t = a.pcl(sid, 'minhaConta').termo; const r = a.pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); assert.equal(r.ok, true, r.message); };
  ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_cliente.beta'].forEach(a.aceitar);
  a.lin = (n) => a.tabelas[n] || [];
  a.ctx.SGO_DATA.getByField = () => null;
  a.ind = (sid, d) => a.pcl(sid, 'indicadores', Object.assign({ atualizar: true }, d || {}));
  a.card = (r, k) => r.cards.find((c) => c.k === k);
  semear(a);
  return a;
}
const ch = (o) => Object.assign({ CLIENTE_NOME: 'HOSPITAL TESTE ALFA LTDA', PRIORIDADE: 'P2', CANAL: 'TELEFONE' }, o);
/**
 * Conjunto fixo (fora de feriado; o expediente é 08:00–17:30, 570 min por dia útil). Contas à mão:
 *  chA (un1, eq1, do pedido solA de sex 02/10 16:00): aberto seg 05/10 08:00, chegada seg 05/10 10:00, atendido ter 06/10 12:00, prazo do
 *      contrato de 1.200 min (vai até qua 07/10 09:00) -> visita = 90 (sex 16:00–17:30) + 120 = 210 min; conclusão = 570 + 240 = 810 min; NO PRAZO.
 *  chB (un1, eq1, telefone): aberto qui 08/10 09:00, chegada sex 09/10 08:30, atendido sex 09/10 15:00, prazo do contrato de 300 min (até qui
 *      14:00) -> visita = 510 + 30 = 540; conclusão = 510 + 420 = 930; FORA DO PRAZO; REINCIDENTE (chA do mesmo eq1, 3 dias antes).
 *  chC (un1b, eq4, e-mail): aberto ter 13/10 08:00, resolvido a distância às 11:00, sem visita e com prazo padrão -> conclusão = 180.
 *  chD (un1, eq2, preventiva do contrato): agendado (etapa 6). chE (un1b, eq4): em triagem (etapa 3). solF (un1): pedido novo (etapa 1).
 *  chG (un1, eq1): concluído em 06/2026, fora do período (e mais de 30 dias antes do chA: não faz o chA reincidente). chH (un1, eq2): cancelado.
 *  chI: de outro cliente (c2), concluído no período: nunca entra na conta do c1.
 */
function semear(a) {
  a.tabelas.ATEC_SOLICITACOES = [
    { ID: 'solA', NUMERO: 'SOL-0001', ORIGEM: 'PORTAL', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', SITUACAO: 'CONVERTIDA', CHAMADO_ID: 'chA', CRIADO_EM: '2026-10-02T16:00:00', TRATADA_EM: '2026-10-05T08:00:00', PAUSA_MIN: 30, POR_ID: 'u_sol' },
    { ID: 'solF', NUMERO: 'SOL-0002', ORIGEM: 'PORTAL', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', SITUACAO: 'NOVA', CRIADO_EM: '2026-10-16T09:00:00', POR_ID: 'u_sol' },
    { ID: 'solZ', NUMERO: 'SOL-0003', ORIGEM: 'PORTAL', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', SITUACAO: 'NOVA', CRIADO_EM: '2026-10-16T09:00:00' }];
  a.tabelas.ATEC_CHAMADOS = [
    ch({ ID: 'chA', NUMERO: 'CH-2026-0101', SITUACAO: 'ENCERRADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', SOLICITACAO_ID: 'solA', CANAL: 'PORTAL', ABERTO_EM: '2026-10-05T08:00:00', ATENDIDO_EM: '2026-10-06T12:00:00', ENCERRADO_EM: '2026-10-06T14:00:00', SLA_FONTE: 'CONTRATO', SLA_MIN_UTEIS: 1200, OS_ID: 'osA' }),
    ch({ ID: 'chB', NUMERO: 'CH-2026-0102', SITUACAO: 'ENCERRADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', ABERTO_EM: '2026-10-08T09:00:00', ATENDIDO_EM: '2026-10-09T15:00:00', ENCERRADO_EM: '2026-10-09T16:00:00', SLA_FONTE: 'CONTRATO', SLA_MIN_UTEIS: 300, OS_ID: 'osB' }),
    ch({ ID: 'chC', NUMERO: 'CH-2026-0103', SITUACAO: 'RESOLVIDO_REMOTO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', CANAL: 'EMAIL', ABERTO_EM: '2026-10-13T08:00:00', ATENDIDO_EM: '2026-10-13T11:00:00', SLA_FONTE: 'PADRAO', SLA_MIN_UTEIS: 960 }),
    ch({ ID: 'chD', NUMERO: 'CH-2026-0104', SITUACAO: 'AGENDADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', CANAL: 'CONTRATO', ABERTO_EM: '2026-10-15T08:00:00', AGENDADO_PARA: '2026-10-21T09:00:00' }),
    ch({ ID: 'chE', NUMERO: 'CH-2026-0105', SITUACAO: 'EM_TRIAGEM', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', ABERTO_EM: '2026-10-16T08:00:00' }),
    ch({ ID: 'chG', NUMERO: 'CH-2026-0090', SITUACAO: 'ENCERRADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', ABERTO_EM: '2026-06-01T08:00:00', ATENDIDO_EM: '2026-06-02T10:00:00', ENCERRADO_EM: '2026-06-02T11:00:00' }),
    ch({ ID: 'chH', NUMERO: 'CH-2026-0106', SITUACAO: 'CANCELADO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', ABERTO_EM: '2026-10-10T08:00:00', CANCELADO_EM: '2026-10-10T09:00:00' }),
    ch({ ID: 'chI', NUMERO: 'CH-2026-0107', SITUACAO: 'ENCERRADO', CLIENTE_ID: 'c2', CLIENTE_NOME: 'CLINICA TESTE BETA', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', ABERTO_EM: '2026-10-05T08:00:00', ATENDIDO_EM: '2026-10-05T09:00:00', ENCERRADO_EM: '2026-10-05T10:00:00', SLA_FONTE: 'CONTRATO', SLA_MIN_UTEIS: 60 })];
  a.tabelas.ATEC_OS = [
    { ID: 'osA', NUMERO: 'OS-2026-0101', CHAMADO_ID: 'chA', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', SITUACAO: 'ENCERRADA', CHEGOU_EM: '2026-10-05T10:00:00', TIPO_NOME: 'Manutenção corretiva' },
    { ID: 'osB', NUMERO: 'OS-2026-0102', CHAMADO_ID: 'chB', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', SITUACAO: 'ENCERRADA', CHEGOU_EM: '2026-10-09T08:30:00', TIPO_NOME: 'Manutenção corretiva' },
    { ID: 'osB0', NUMERO: 'OS-2026-0100', CHAMADO_ID: 'chB', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', SITUACAO: 'ENCERRADA', CHEGOU_EM: '2026-10-09T11:00:00', TIPO_NOME: 'Retorno' },
    { ID: 'osI', NUMERO: 'OS-2026-0107', CHAMADO_ID: 'chI', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', SITUACAO: 'ENCERRADA', CHEGOU_EM: '2026-10-05T08:10:00' }];
  // documentos com validade (o motor da central: CAL, QUAL, NR13 e manutenção) — "hoje" é 19/10/2026
  const doc = (o) => Object.assign({ STATUS: 'ATIVO', CRIADO_EM: '2026-09-01T10:00:00', DATA_EMISSAO: '2026-09-01' }, o);
  a.tabelas.DOC_DOCUMENTOS = [
    doc({ ID: 'd1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqC1xxxxxxx', DATA_VENCIMENTO: '2026-11-08' }),
    doc({ ID: 'd2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado LV-02.pdf', LINK_ARQUIVO: '/arquivos/arqC2xxxxxxx', DATA_VENCIMENTO: '2027-01-27' }),
    doc({ ID: 'd3', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado SL-04.pdf', LINK_ARQUIVO: '/arquivos/arqC4xxxxxxx', DATA_VENCIMENTO: '2026-10-17' }),
    doc({ ID: 'd4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Relatórios de qualificação', NOME_ARQUIVO: 'Qualificação AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqQ1xxxxxxx', DATA_VENCIMENTO: '2027-05-07' }),
    doc({ ID: 'd5', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Laudo NR-13', NOME_ARQUIVO: 'Laudo NR-13 AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqN1xxxxxxx', DATA_VENCIMENTO: '2026-10-14' }),
    doc({ ID: 'd6', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '1. Manutenção preventiva', NOME_ARQUIVO: 'Preventiva LV-02.pdf', LINK_ARQUIVO: '/arquivos/arqM2xxxxxxx', DATA_VENCIMENTO: '2026-12-03' }),
    doc({ ID: 'd7', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado ES-03.pdf', LINK_ARQUIVO: '/arquivos/arqC3xxxxxxx', DATA_VENCIMENTO: '2026-10-25' })];
  // registro de acessos (com IP e navegador gravados pelo servidor no login)
  const ac = (o) => Object.assign({ CLIENTE_ID: 'c1', IP: IP, NAVEGADOR: NAV, REF_TIPO: '', REF_ID: '', DETALHE: '' }, o);
  a.tabelas.PCL_ACESSOS = (a.tabelas.PCL_ACESSOS || []).concat([
    ac({ ID: 'ac1', USUARIO_ID: 'u_sol', USUARIO_NOME: 'SONIA SOLICITANTE TESTE', ACAO: 'ENTRADA', DETALHE: 'Entrou no Portal', EM: '2026-10-16T09:00:00' }),
    ac({ ID: 'ac2', USUARIO_ID: 'u_sol', USUARIO_NOME: 'SONIA SOLICITANTE TESTE', ACAO: 'ENTRADA', DETALHE: 'Entrou no Portal', EM: '2026-10-01T09:00:00' }),
    ac({ ID: 'ac3', USUARIO_ID: 'u_sol', USUARIO_NOME: 'SONIA SOLICITANTE TESTE', ACAO: 'ENTRADA', DETALHE: 'Entrou no Portal', EM: '2026-09-09T09:00:00' }),
    ac({ ID: 'ac4', USUARIO_ID: 'u_sol', USUARIO_NOME: 'SONIA SOLICITANTE TESTE', ACAO: 'DOCUMENTO_ABERTO', DETALHE: 'Certificado AC-01', EM: '2026-10-16T09:05:00' }),
    ac({ ID: 'ac5', USUARIO_ID: 'u_cli', USUARIO_NOME: 'CLIENTE ALFA TESTE', ACAO: 'DOCUMENTO_ABERTO', DETALHE: 'Laudo NR-13', EM: '2026-09-20T10:00:00' }),
    ac({ ID: 'ac6', USUARIO_ID: 'u_cli', USUARIO_NOME: 'CLIENTE ALFA TESTE', ACAO: 'DOCUMENTO_ABERTO', DETALHE: 'Qualificação', EM: '2026-10-18T10:00:00' }),
    ac({ ID: 'ac7', USUARIO_ID: 'u_cli', USUARIO_NOME: 'CLIENTE ALFA TESTE', ACAO: 'DOCUMENTO_ABERTO', DETALHE: 'Antigo', EM: '2026-05-01T10:00:00' }),
    ac({ ID: 'ac8', USUARIO_ID: 'u_sol', USUARIO_NOME: 'SONIA SOLICITANTE TESTE', ACAO: 'ESCOPO_RECUSADO', DETALHE: 'CHAMADO chE: fora das unidades', EM: '2026-10-17T10:00:00' }),
    ac({ ID: 'ac9', CLIENTE_ID: 'c2', USUARIO_ID: 'u_cli2', USUARIO_NOME: 'CLIENTE BETA TESTE', ACAO: 'ENTRADA', EM: '2026-10-18T10:00:00' })]);
  // convites: Nina com o convite dentro da validade; Vito com o convite vencido (e e-mail em formato inválido)
  a.tabelas.SYS_ACESSO_CLIENTE_ENVIOS = [
    { ID: 'env1', QUANDO: '2026-10-18T10:00:00', USUARIO_ID: 'u_novo', CLIENTE_ID: 'c1', EMAIL: 'nina@alfa.exemplo.test', VALIDO_ATE: '2026-10-21T10:00:00', SITUACAO: 'ENVIADO' },
    { ID: 'env2', QUANDO: '2026-10-10T10:00:00', USUARIO_ID: 'u_venc', CLIENTE_ID: 'c1', EMAIL: 'vito@alfa', VALIDO_ATE: '2026-10-13T10:00:00', SITUACAO: 'ENVIADO' }];
  // avisos ao cliente enviados (etapa 4) e uma falha de envio registrada pelo serviço de avisos
  a.tabelas.PCL_AVISOS_ENVIOS = [
    { ID: 'av1', CHAVE: 'PC03:chA:AGENDADA', EVENTO: 'PC03', CLIENTE_ID: 'c1', USUARIO_ID: 'u_sol', EMAIL: 'sonia@alfa.exemplo.test', REF_ID: 'chA', SITUACAO: 'ENVIADO', EM: '2026-10-05T08:30:00' },
    { ID: 'av2', CHAVE: 'PC05:chA', EVENTO: 'PC05', CLIENTE_ID: 'c1', USUARIO_ID: 'u_cli', EMAIL: 'cli@alfa.exemplo.test', REF_ID: 'chA', SITUACAO: 'NA_FILA', EM: '2026-10-06T18:30:00' },
    { ID: 'av3', CHAVE: 'PC05:chI', EVENTO: 'PC05', CLIENTE_ID: 'c2', USUARIO_ID: 'u_cli2', EMAIL: 'cli@beta.exemplo.test', REF_ID: 'chI', SITUACAO: 'ENVIADO', EM: '2026-10-05T10:30:00' }];
  a.tabelas.NTF_ENVIOS.push({ ID: 'ntf1', QUANDO: '2026-10-05T08:30:00', CANAL: 'email', DESTINO: 'sonia@alfa.exemplo.test', ASSUNTO: 'Metrolabs — CH-2026-0101: visita agendada', ORIGEM: 'PORTAL_CLIENTE', SITUACAO: 'ERRO', MOTIVO: 'Endereço recusado pelo servidor de e-mail', EVENTO: 'PC03' });
  a.ctx.SGO_Atendimentos_invalidar_();
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const a = amb();
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  const browser = await chromium.launch({ headless: true });
  const problemas = [];
  try {
    for (const largura of [1366, 390, 320]) {
      for (const quem of ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_dora']) {
        const sessao = (sid) => Object.assign({ sessionId: sid }, a.sessoes[sid]);
        const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
        const erros = [];
        page.on('pageerror', (e) => erros.push(e.message));
        page.on('popup', (p) => p.close().catch(() => {}));
        await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
        await page.exposeFunction('qaRun', (fn, args) => {
          try {
            if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: sessao(args[0]) } };
            if (fn === 'validarSessao') return { ok: true, valor: { valid: true, data: sessao(args[0]) } };
            if (/^(PortalCliente_api|Assistencia_api)$/.test(fn)) { a.ctx.PCl_memoLimpar_(); return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) }; }
          } catch (e) { return { ok: false, erro: String(e && e.message || e) }; }
          return { ok: false, erro: 'indisponível na captura: ' + fn };
        });
        await page.addInitScript((sid) => {
          try { sessionStorage.setItem('SGO_SESSION', sid); } catch (e) {}
          const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
            (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
          window.google = { script: { run: corredor(null, null) } };
        }, quem);
        await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const foto = async (nome) => {
          await page.waitForTimeout(900);
          const lat = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (lat > 1) problemas.push(largura + ' ' + nome + ': rolagem lateral de ' + lat + ' px');
          await page.screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png'), fullPage: true });
        };
        const botaoMenu = () => page.evaluate(() => { const b = document.getElementById('menu-btn-portal_cliente_indicadores'); return !!b && b.style.display !== 'none'; });
        if (quem === 's_dora') {
          await page.evaluate(() => abrir('portal_cliente_uso')); await page.waitForTimeout(1200);
          await foto('equipe-uso-do-portal');
          await page.evaluate(() => { const b = document.querySelector('[data-pcl="ppCliente"][data-cid="c1"]'); if (b) b.click(); }); await page.waitForTimeout(1000);
          await foto('equipe-uso-cliente');
          await page.evaluate(() => { const b = document.querySelector('[data-pcl="ppPessoa"][data-uid="u_sol"]'); if (b) b.click(); }); await page.waitForTimeout(1000);
          await foto('equipe-uso-linha-do-tempo');
        } else {
          const nome = quem === 's_cliente.alfa' ? 'gestor' : quem === 's_sonia.alfa' ? 'solicitante' : 'consulta';
          // a Consulta não tem o botão no menu; a tela é aberta direto para mostrar a recusa do servidor
          await page.evaluate(() => abrir('portal_cliente_indicadores')); await page.waitForTimeout(1200);
          const vis = await botaoMenu();
          if (quem !== 's_celia.alfa' && !vis) problemas.push(largura + ' ' + quem + ': o botão Indicadores não apareceu no menu');
          if (quem === 's_celia.alfa' && vis) problemas.push(largura + ' Consulta: o botão Indicadores apareceu no menu');
          await foto(nome + '-indicadores');
          if (quem === 's_cliente.alfa') {
            await page.evaluate(() => { const s = document.getElementById('pclIndUnidade'); if (s) s.value = 'un1b'; const b = document.querySelector('[data-pp="filtrar"]'); if (b) b.click(); }); await page.waitForTimeout(1000);
            await foto('gestor-indicadores-filial');
            await page.evaluate(() => { const b = document.querySelector('[data-pp="pdf"]'); if (b) b.click(); }); await page.waitForTimeout(1500);
            await page.evaluate(() => { const v = document.querySelector('.sgo-nav-doc, .sgonav-doc, [data-sgo-doc]'); if (v && v.remove) v.remove(); });
            await foto('gestor-relatorio-do-periodo');
          }
        }
        if (erros.length) problemas.push(largura + ' ' + quem + ': erros de JavaScript: ' + erros.join(' | '));
        await page.close();
      }
    }
  } finally { await browser.close(); }
  console.log(problemas.length ? 'PROBLEMAS:\n' + problemas.join('\n') : 'Capturas sem rolagem lateral e sem erro de JavaScript.');
  fs.writeFileSync(path.join(SAIDA, 'conferencia.txt'), (problemas.length ? problemas.join('\n') : 'Capturas sem rolagem lateral e sem erro de JavaScript.') + '\n');
})().catch((e) => { console.error(e); process.exit(1); });
