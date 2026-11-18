// Capturas das telas REAIS da etapa 3 (Index.html com os includes da cópia de trabalho) a 1366, 390 e 320 px, com dados de teste e o
// servidor simulado (o mesmo ambiente de tests/portal-cliente-etapa3-20261118.test.cjs: Assistência técnica + Portal do cliente + Documentos
// em pastas). Confere a rolagem lateral da página e os erros de JavaScript. Uso (na raiz do repositório):
//   DEST=output/financeiro-20261116/cand16 node --require ./output/lote-20261111n/fontes.cjs output/portal-cliente-20261116/etapa3/capturas.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const AST = require('../../../tests/_assistencia_ambiente.cjs');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');

const BASE = path.resolve(__dirname, '../../../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8');
const SAIDA = path.join(__dirname, 'capturas');

function montar() {
  const base = AST.ambiente({});
  const a = AST.ambiente({
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
      'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js', 'SGO_DocumentosPastas.js', 'SGO_PortalCliente_Documentos.js'],
    tabelas: {
      CAD_USUARIOS: base.tabelas.CAD_USUARIOS.concat([{ ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' }]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.map((e) => (e.ID === 'eq1' ? Object.assign({}, e, { FABRICANTE: 'FABRICANTE TESTE', PATRIMONIO: 'PAT-1001' }) : e))
        .concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  });
  const pcl = (sid, acao, d) => JSON.parse(JSON.stringify(a.ctx.PortalCliente_api(sid, acao, d || {})));
  ['s_cliente.alfa', 's_sonia.alfa'].forEach((sid) => { const t = pcl(sid, 'minhaConta').termo; pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); });
  pcl('s_dora', 'salvar', { clienteId: 'c1', unidades: [], numero: 'CT-ALFA-2026', objeto: 'Calibração anual e manutenção preventiva mensal das autoclaves', origemTipo: 'ASSINADO',
    servicos: [{ servico: 'CALIBRACAO', periodicidade: 'ANUAL' }, { servico: 'MANUTENCAO_PREVENTIVA', periodicidade: 'MENSAL' }], inicio: '2026-01-01', fim: '2027-06-30', responsavelId: 'u_gt', motivo: 'Contrato de teste para as capturas' });
  const hoje = a.ctx.PCl_hoje_(), d = (n) => a.ctx.PCl_diaMais_(hoje, n);
  const doc = (o) => Object.assign({ STATUS: 'ATIVO', CRIADO_EM: d(-40) + 'T10:00:00' }, o);
  a.tabelas.DOC_DOCUMENTOS.push(
    doc({ ID: 'd1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado de calibração AC-01 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCert1xxxx', DATA_EMISSAO: d(-30), DATA_VENCIMENTO: d(20) }),
    doc({ ID: 'd1a', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado de calibração AC-01 2026 Rev. 01.pdf', LINK_ARQUIVO: '/arquivos/arqCert1rev1x', DATA_EMISSAO: d(-2), DATA_VENCIMENTO: d(363) }),
    doc({ ID: 'd2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Relatórios de qualificação', NOME_ARQUIVO: 'Qualificação térmica AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqQual1xxxx', DATA_EMISSAO: d(-60), DATA_VENCIMENTO: d(200) }),
    doc({ ID: 'd3', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Laudo NR-13', NOME_ARQUIVO: 'Laudo de inspeção NR-13 AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqNr131xxx', DATA_EMISSAO: d(-400), DATA_VENCIMENTO: d(-5) }),
    doc({ ID: 'd4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '1. Manutenção preventiva', NOME_ARQUIVO: 'Relatório de manutenção preventiva LV-02.pdf', LINK_ARQUIVO: '/arquivos/arqMan2xxxxx', DATA_EMISSAO: d(-20), DATA_VENCIMENTO: d(45) }),
    doc({ ID: 'd5', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: 'PGT', NOME_ARQUIVO: 'PGT Unidade Centro.pdf', LINK_ARQUIVO: '/arquivos/arqPgt1xxxxx', DATA_EMISSAO: d(-10) }),
    doc({ ID: 'd6', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado LV-02 registrado por engano.pdf', LINK_ARQUIVO: '/arquivos/arqCert2xxxx', DATA_EMISSAO: d(-5), DATA_VENCIMENTO: d(10), PORTAL: 'OCULTO', PORTAL_MOTIVO: 'Registrado por engano no cliente errado', PORTAL_POR_NOME: 'GIL GESTOR TECNICO TESTE', PORTAL_EM: d(-1) + 'T15:00:00' }),
    doc({ ID: 'd7', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado de calibração SL-04.pdf', LINK_ARQUIVO: '/arquivos/arqCert4xxxx', DATA_EMISSAO: d(-370), DATA_VENCIMENTO: d(-2) }),
    doc({ ID: 'd10', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: '1. Cronograma de execução', NOME_ARQUIVO: 'Cronograma de execução 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCron1xxxx', DATA_EMISSAO: d(-50) }));
  a.tabelas.ATEC_OS = (a.tabelas.ATEC_OS || []).concat([
    { ID: 'os9', NUMERO: 'OS-0009', SITUACAO: 'ENCERRADA', TIPO_CODIGO: 'MANUTENCAO_CORRETIVA', TIPO_NOME: 'Manutenção corretiva', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', AGENDADO_PARA: d(-15) + 'T09:00:00',
      SERVICO_REALIZADO: 'Troca da resistência', RELATO: 'Teste de ciclo aprovado após a troca', RELATORIO_PDF_ID: 'arqOs9xxxxxx', RELATORIO_PDF_URL: '/arquivos/arqOs9xxxxxx', RELATORIO_EM: d(-15) + 'T16:00:00' },
    { ID: 'osR', NUMERO: 'OS-0010', SITUACAO: 'ENCERRADA', TIPO_CODIGO: 'RONDA_EC', TIPO_NOME: 'Ronda de engenharia clínica', RONDA_PLANO_ID: 'rp-1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', AGENDADO_PARA: d(-20) + 'T08:00:00', RELATORIO_PDF_ID: 'arqRondaxxxx', RELATORIO_EM: d(-20) + 'T12:00:00' },
    { ID: 'osR2', NUMERO: 'OS-0011', SITUACAO: 'AGENDADA', TIPO_CODIGO: 'RONDA_EC', TIPO_NOME: 'Ronda de engenharia clínica', RONDA_PLANO_ID: 'rp-1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', AGENDADO_PARA: d(7) + 'T08:00:00' },
    { ID: 'osB', NUMERO: 'OS-0012', SITUACAO: 'AGENDADA', TIPO_CODIGO: 'MANUTENCAO_PREVENTIVA', TIPO_NOME: 'Manutenção preventiva', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', AGENDADO_PARA: d(3) + 'T14:00:00' }]);
  a.tabelas.AUVO_TAREFAS = [{ ID: 't1', AUVO_TASK_ID: '7001', EQUIPAMENTOS_ID_SGO: 'eq1', CLIENTE_ID_SGO: 'c1', FINALIZADA: 'SIM', DATA_TAREFA: d(-90) + 'T09:00:00', TIPO_TAREFA: 'Manutenção preventiva', RELATO_SERVICO: 'Limpeza da câmara e troca da vedação da porta' }];
  a.tabelas.LAVCIC_RELATORIOS = [{ ID: 'lr1', NUMERO: 'RCL-0001', VERSAO: 1, SITUACAO: 'ATIVO', EQUIPAMENTO_ID: 'eq2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', LOTE: '11', DATA_CICLO: d(-9), PDF_ID: 'lavPdf1xxxx', EMITIDO_EM: d(-9) + 'T10:00:00' }];
  a.ctx.SGO_Atendimentos_invalidar_();
  AST.chamadoAgendado(a, {});
  return a;
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const a = montar();
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  const browser = await chromium.launch({ headless: true });
  const problemas = [];
  const sessao = (sid) => { const s = a.sessoes[sid]; return Object.assign({ sessionId: sid }, s); };
  try {
    for (const largura of [1366, 390, 320]) {
      for (const quem of ['s_cliente.alfa', 's_sonia.alfa', 's_dora']) {
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
          await page.waitForTimeout(800);
          const lat = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (lat > 1) problemas.push(largura + ' ' + nome + ': rolagem lateral de ' + lat + ' px');
          await page.screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png'), fullPage: true });
        };
        if (quem === 's_cliente.alfa') {
          await page.evaluate(() => abrir('portal_cliente_documentos')); await foto('cliente-documentos');
          await page.evaluate(() => { const b = document.querySelector('[data-dc="abrirDoc"]'); if (b) b.click(); }); await foto('cliente-documentos-aberto');
          await page.evaluate(() => abrir('portal_cliente_equipamentos')); await foto('cliente-equipamentos');
          await page.evaluate(() => PclD_ficha_('eq1')); await foto('cliente-ficha-equipamento');
          await page.evaluate(() => abrir('portal_cliente_vencimentos')); await foto('cliente-vencimentos');
          await page.evaluate(() => PclD_irAba_('cronograma')); await foto('cliente-cronograma');
        } else if (quem === 's_sonia.alfa') {
          await page.evaluate(() => abrir('portal_cliente_documentos')); await foto('solicitante-documentos');
          await page.evaluate(() => abrir('portal_cliente_equipamentos')); await foto('solicitante-equipamentos');
        } else {
          await page.evaluate(() => abrir('portal_cliente_contratos')); await page.waitForTimeout(900);
          await page.evaluate(() => PortalCli_render_('docsportal')); await page.waitForTimeout(900);
          await page.evaluate(() => { PCLDI.cliente = { id: 'c1', nome: 'Hospital Teste Alfa' }; PclDI_render_(); }); await page.waitForTimeout(600);
          await page.evaluate(() => { const d = document.querySelector('#pclDpLista details'); if (d) d.open = true; }); await foto('equipe-documentos-no-portal');
          await page.evaluate(() => PortalCli_render_('regras')); await page.waitForTimeout(900);
          await page.evaluate(() => { const e = document.getElementById('pclRgDocTipos'); if (e) e.scrollIntoView(); }); await foto('equipe-regras-tipos');
        }
        if (erros.length) problemas.push(largura + ' ' + quem + ': erros de JavaScript: ' + erros.join(' | '));
        await page.close();
      }
    }
  } finally { await browser.close(); }
  console.log(problemas.length ? 'PROBLEMAS:\n' + problemas.join('\n') : 'Capturas sem rolagem lateral e sem erro de JavaScript.');
  fs.writeFileSync(path.join(SAIDA, 'conferencia.txt'), (problemas.length ? problemas.join('\n') : 'Capturas sem rolagem lateral e sem erro de JavaScript.') + '\n');
})().catch((e) => { console.error(e); process.exit(1); });
