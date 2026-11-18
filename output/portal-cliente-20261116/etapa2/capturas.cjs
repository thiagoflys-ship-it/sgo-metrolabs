// Capturas das telas REAIS da etapa 2 (Index.html com os includes da cópia de trabalho) a 1366, 390 e 320 px, com dados de teste e o
// servidor simulado (o mesmo ambiente de tests/portal-cliente-etapa2-20261118.test.cjs: Assistência técnica + Portal do cliente). Confere a
// rolagem lateral da página e os erros de JavaScript. Uso (na raiz do repositório):
//   DEST=output/financeiro-20261116/cand15 node --require ./output/lote-20261111n/fontes.cjs output/portal-cliente-20261116/etapa2/capturas.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const AST = require('../../../tests/_assistencia_ambiente.cjs');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');

const BASE = path.resolve(__dirname, '../../../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8');
const SAIDA = path.join(__dirname, 'capturas');
const FOTO = { nome: 'visor.jpg', tipo: 'image/jpeg', base64: Buffer.alloc(1200, 9).toString('base64') };

function montar() {
  const base = AST.ambiente({});
  const a = AST.ambiente({
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
      'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js'],
    tabelas: {
      CAD_USUARIOS: base.tabelas.CAD_USUARIOS.concat([{ ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' }]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  });
  const pcl = (sid, acao, d) => JSON.parse(JSON.stringify(a.ctx.PortalCliente_api(sid, acao, d || {})));
  ['s_cliente.alfa', 's_sonia.alfa'].forEach((sid) => { const t = pcl(sid, 'minhaConta').termo; pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); });
  pcl('s_dora', 'salvar', { clienteId: 'c1', unidades: [], numero: 'CT-ALFA-2026', objeto: 'Manutenção preventiva e corretiva das autoclaves', origemTipo: 'ASSINADO', servicos: [{ servico: 'MANUTENCAO_CORRETIVA', periodicidade: 'SOB_DEMANDA' }], inicio: '2026-01-01', fim: '2027-06-30', responsavelId: 'u_gt', motivo: 'Contrato de teste para as capturas' });
  const reg = a.api('s_dora', 'regras', {}).regras;
  reg.contratos = [{ clienteId: 'c1', clienteNome: 'Hospital Teste Alfa', prazos: { P2: { atendimentoMin: 600, chegadaMin: 0 } } }];
  a.api('s_dora', 'regras', { salvar: reg, motivo: 'Prazo do contrato de teste (capturas)' });
  const ped = (extra) => Object.assign({ unidadeId: 'un1', equipamentoId: 'eq1', setor: 'CME', sintoma: 'A autoclave interrompe o ciclo na secagem e mostra alarme de pressão em todos os ciclos desde ontem', inicio: 'ontem às 7h', codigoErro: 'E-07',
    situacao: 'TOTAL', risco: 'Pode não esterilizar a carga', tentado: 'Reiniciamos e limpamos o filtro', contatoNome: 'Rui Responsável', contatoTelefone: '(62) 98888-7777', contatoEmail: 'rui@alfa.exemplo.test', horario: 'Seg a sex, 13h às 17h', fotos: [FOTO], confirmarRepetido: true }, extra || {});
  const p1 = pcl('s_cliente.alfa', 'abrir', ped());
  const c1 = a.api('s_gil', 'converter', { solicitacaoId: p1.solicitacao.id, prioridade: 'P2' }).chamado;
  Object.assign(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c1.id), { SITUACAO: 'AGENDADO', TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE', AGENDADO_PARA: '2026-10-20T09:00:00' });
  pcl('s_cliente.alfa', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c1.id, texto: 'O setor fica no 2º andar; o acesso é pela portaria B.' });
  pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: c1.id, texto: 'Obrigado. O técnico Tiago chega amanhã às 9h pela portaria B.' });
  pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: c1.id, texto: 'Levar o kit de vedação da porta.', interna: true });
  const p2 = pcl('s_sonia.alfa', 'abrir', ped({ equipamentoId: 'eq2', situacao: 'PARCIAL', sintoma: 'A lavadora vaza água pela porta no início da lavagem e para com alarme de nível', codigoErro: '', naoExibe: true }));
  a.api('s_gil', 'complemento', { solicitacaoId: p2.solicitacao.id, pergunta: 'Envie uma foto da vedação da porta e diga se o vazamento acontece em todos os programas.' });
  pcl('s_cliente.alfa', 'abrir', ped({ unidadeId: 'un1b', equipamentoId: 'eq4', setor: 'Centro cirúrgico', situacao: 'FUNCIONANDO', sintoma: 'Pedido de verificação preventiva da seladora antes da auditoria da vigilância sanitária' }));
  a.ctx.PortalCliente_rotinaChamados_({});
  return { a, c1, p2 };
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const { a, c1, p2 } = montar();
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  const browser = await chromium.launch({ headless: true });
  const problemas = [];
  const sessao = (sid) => { const s = a.sessoes[sid]; return Object.assign({ sessionId: sid }, s); };
  try {
    for (const largura of [1366, 390, 320]) {
      for (const quem of ['s_cliente.alfa', 's_gil']) {
        const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
        const erros = [];
        page.on('pageerror', (e) => erros.push(e.message));
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
          await page.evaluate(() => abrir('portal_cliente_chamados')); await foto('cliente-chamados-lista');
          await page.evaluate(() => { const b = document.querySelector('#pclChVistas [data-pna-aba="kanban"]'); if (b) b.click(); }); await foto('cliente-chamados-kanban');
          await page.evaluate(() => { const b = document.querySelector('#pclChVistas [data-pna-aba="gantt"]'); if (b) b.click(); }); await foto('cliente-chamados-gantt');
          await page.evaluate((id) => PclCh_ficha_('CHAMADO', id), c1.id); await foto('cliente-ficha-visita');
          await page.evaluate((id) => PclCh_ficha_('SOLICITACAO', id), p2.solicitacao.id); await foto('cliente-ficha-complemento');
          await page.evaluate(() => PclCh_irAba_('abrir')); await foto('cliente-abrir-chamado');
          await page.evaluate(() => { const b = document.querySelector('[data-ch="conferir"]'); if (b) b.click(); }); await page.waitForTimeout(300);
          await page.evaluate(() => { const b = document.querySelector('[data-ch="enviarPedido"]'); if (b) b.click(); }); await foto('cliente-abrir-faltas');
          await page.evaluate(() => PclCh_irAba_('geral')); await foto('cliente-conversa-geral');
        } else {
          await page.evaluate(() => abrir('portal_cliente_conversas')); await page.waitForTimeout(900);
          await page.evaluate(() => { const b = document.querySelector('[data-cv-abrir]'); if (b) b.click(); }); await foto('equipe-conversas');
          await page.evaluate(() => abrir('assistencia_solicitacoes')); await page.waitForTimeout(1200);
          await page.evaluate(() => { const b = document.querySelector('[data-pcl-conv]'); if (b) b.click(); }); await foto('equipe-solicitacoes-portal');
        }
        if (erros.length) problemas.push(largura + ' ' + quem + ': erros de JavaScript: ' + erros.join(' | '));
        await page.close();
      }
    }
  } finally { await browser.close(); }
  console.log(problemas.length ? 'PROBLEMAS:\n' + problemas.join('\n') : 'Capturas sem rolagem lateral e sem erro de JavaScript.');
  fs.writeFileSync(path.join(SAIDA, 'conferencia.txt'), (problemas.length ? problemas.join('\n') : 'Capturas sem rolagem lateral e sem erro de JavaScript.') + '\n');
})().catch((e) => { console.error(e); process.exit(1); });
