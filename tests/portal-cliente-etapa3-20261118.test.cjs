// 18/11/2026 — Portal do cliente, ETAPA 3 (c): DOCUMENTOS, EQUIPAMENTOS, HISTÓRICO, VENCIMENTOS E CRONOGRAMA
// (output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md, testes T3.1 a T3.9, mais as três pendências de filtro por unidade deixadas pela
// etapa 1: prontuário pelo QR Code, relatórios de ciclo da lavadora e vencimentos da central de pendências).
// Código real num vm, com o ambiente da Assistência técnica (tests/_assistencia_ambiente.cjs: planilha, Drive, e-mail e relógio simulados; o
// relógio começa numa segunda-feira, 19/10/2026, às 10h) e o Portal do cliente, "Documentos em pastas", o QR Code, a qualificação do
// equipamento e o relatório do ciclo da lavadora carregados junto. Nenhum e-mail sai de verdade.
// Clientes fictícios: c1 (Hospital Teste Alfa) com 2 unidades (un1 e un1b), contas Gestor (conta antiga sem papel), Solicitante só da un1 e
// Consulta só da un1; c2 (Clínica Teste Beta) com 1 unidade e uma conta. Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa3-20261118.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const AST = require('./_assistencia_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const lerDoc = (f) => fs.readFileSync(path.join(__dirname, '../docs', f), 'utf8').replace(/\r\n/g, '\n');
const j = (x) => JSON.parse(JSON.stringify(x));

function amb(opcoes) {
  const base = AST.ambiente({});
  const a = AST.ambiente(Object.assign({
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
      'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js', 'SGO_DocumentosPastas.js', 'SGO_PortalCliente_Documentos.js',
      'SGO_Equipamentos.js', 'SGO_QRCode.js', 'SGO_QualifEquipamento.js', 'SGO_LavCiclo_Leitor.js', 'SGO_LavCiclo_Documento.js', 'SGO_LavCiclo_Main.js'],
    tabelas: {
      CAD_USUARIOS: base.tabelas.CAD_USUARIOS.concat([
        { ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_con', USUARIO: 'celia.alfa', NOME: 'CELIA CONSULTA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]' }
      ]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', ENDERECO: 'Rua Filial, 20', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.map((e) => (e.ID === 'eq1' ? Object.assign({}, e, { QR_TOKEN: 'tok-interno-123', NF_VENDA_ARQUIVO_ID: 'nfInterna999', OBSERVACOES: 'nota interna da equipe' }) : e))
        .concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  }, opcoes || {}));
  a.pcl = (sid, acao, d) => { a.ctx.PCl_memoLimpar_(); const r = j(a.ctx.PortalCliente_api(sid, acao, d || {})); if (a.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
  a.aceitar = (sid) => { const t = a.pcl(sid, 'minhaConta').termo; const r = a.pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); assert.equal(r.ok, true, r.message); };
  ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_cliente.beta'].forEach(a.aceitar);
  a.lin = (n) => a.tabelas[n] || [];
  a.hoje = a.ctx.PCl_hoje_();
  a.dia = (n) => a.ctx.PCl_diaMais_(a.hoje, n);
  a.ctx.SGO_DATA.getByField = () => null;
  semear(a);
  return a;
}
/** Documentos, O.S., rondas, relatórios, qualificação em minuta, tarefas do Auvo e relatórios de ciclo de teste. */
function semear(a) {
  const d = a.dia, doc = (o) => Object.assign({ STATUS: 'ATIVO', CRIADO_EM: d(-40) + 'T10:00:00' }, o);
  a.tabelas.DOC_DOCUMENTOS.push(
    doc({ ID: 'd1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCert1xxxx', DATA_EMISSAO: d(-30), DATA_VENCIMENTO: d(20) }),
    doc({ ID: 'd2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Relatórios de qualificação', NOME_ARQUIVO: 'Qualificação térmica AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqQual1xxxx', DATA_EMISSAO: d(-60), DATA_VENCIMENTO: d(200) }),
    doc({ ID: 'd3', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Laudo NR-13', NOME_ARQUIVO: 'Laudo NR-13 AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqNr131xxx', DATA_EMISSAO: d(-400), DATA_VENCIMENTO: d(-5) }),
    doc({ ID: 'd4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '1. Manutenção preventiva', NOME_ARQUIVO: 'Relatório de manutenção preventiva LV-02.pdf', LINK_ARQUIVO: '/arquivos/arqMan2xxxxx', DATA_EMISSAO: d(-20), DATA_VENCIMENTO: d(45) }),
    doc({ ID: 'd5', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: 'PGT', NOME_ARQUIVO: 'PGT Unidade Centro.pdf', LINK_ARQUIVO: '/arquivos/arqPgt1xxxxx', DATA_EMISSAO: d(-10) }),
    doc({ ID: 'd6', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado LV-02 interno.pdf', LINK_ARQUIVO: '/arquivos/arqCert2xxxx', DATA_EMISSAO: d(-5), DATA_VENCIMENTO: d(10), PORTAL: 'OCULTO', PORTAL_MOTIVO: 'Registrado por engano no cliente errado', PORTAL_POR_NOME: 'GIL GESTOR TECNICO TESTE' }),
    doc({ ID: 'd7', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado SL-04.pdf', LINK_ARQUIVO: '/arquivos/arqCert4xxxx', DATA_EMISSAO: d(-370), DATA_VENCIMENTO: d(-2) }),
    doc({ ID: 'd8', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado ES-03.pdf', LINK_ARQUIVO: '/arquivos/arqCert3xxxx', DATA_EMISSAO: d(-30), DATA_VENCIMENTO: d(15) }),
    doc({ ID: 'd9', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '9. Outros documentos', NOME_ARQUIVO: 'Parecer técnico da autoclave.pdf', LINK_ARQUIVO: '/arquivos/arqPar1xxxxx', DATA_EMISSAO: d(-3), PORTAL: 'VISIVEL', PORTAL_MOTIVO: 'Cliente pediu para a auditoria' }),
    doc({ ID: 'd10', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: '1. Cronograma de execução', NOME_ARQUIVO: 'Cronograma de execução 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCron1xxxx', DATA_EMISSAO: d(-50) }),
    doc({ ID: 'd11', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Declaração', NOME_ARQUIVO: 'Declaração de execução de serviço.pdf', LINK_ARQUIVO: '/arquivos/arqDecl1xxxx', DATA_EMISSAO: d(-7) }));
  a.tabelas.REP_DOCUMENTOS = [
    { ID: 'rp1', TIPO: 'RELATORIO_ATENDIMENTO', NUMERO: 'RA-9', PUBLICO: 'INTERNO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', PDF_ID: 'arqRepInt1xx', EM: d(-8) + 'T10:00:00' },
    { ID: 'rp2', TIPO: 'RELATORIO_ATENDIMENTO', NUMERO: 'RA-9', PUBLICO: 'CLIENTE', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', PDF_ID: 'arqRepCli1xx', EM: d(-8) + 'T10:00:00' }];
  a.tabelas.ATEC_OS = (a.tabelas.ATEC_OS || []).concat([
    { ID: 'os9', NUMERO: 'OS-0009', SITUACAO: 'ENCERRADA', TIPO_CODIGO: 'MANUTENCAO_CORRETIVA', TIPO_NOME: 'Manutenção corretiva', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE',
      AGENDADO_PARA: d(-15) + 'T09:00:00', RELATO: 'Troca da resistência e teste de ciclo aprovado', RELATORIO_PDF_ID: 'arqOs9xxxxxx', RELATORIO_PDF_URL: '/arquivos/arqOs9xxxxxx', RELATORIO_EM: d(-15) + 'T16:00:00' },
    { ID: 'osR', NUMERO: 'OS-0010', SITUACAO: 'ENCERRADA', TIPO_CODIGO: 'RONDA_EC', TIPO_NOME: 'Ronda de engenharia clínica', RONDA_PLANO_ID: 'rp-1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '',
      AGENDADO_PARA: d(-20) + 'T08:00:00', RELATORIO_PDF_ID: 'arqRondaxxxx', RELATORIO_PDF_URL: '/arquivos/arqRondaxxxx', RELATORIO_EM: d(-20) + 'T12:00:00' },
    { ID: 'osR2', NUMERO: 'OS-0011', SITUACAO: 'AGENDADA', TIPO_CODIGO: 'RONDA_EC', TIPO_NOME: 'Ronda de engenharia clínica', RONDA_PLANO_ID: 'rp-1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: '', AGENDADO_PARA: d(7) + 'T08:00:00', TECNICO_NOME: 'TIAGO TECNICO TESTE' },
    { ID: 'osB', NUMERO: 'OS-0012', SITUACAO: 'AGENDADA', TIPO_CODIGO: 'MANUTENCAO_PREVENTIVA', TIPO_NOME: 'Manutenção preventiva', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', AGENDADO_PARA: d(3) + 'T14:00:00' },
    { ID: 'osVelha', NUMERO: 'OS-0013', SITUACAO: 'AGENDADA', TIPO_CODIGO: 'MANUTENCAO_PREVENTIVA', TIPO_NOME: 'Manutenção preventiva', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', AGENDADO_PARA: d(-3) + 'T14:00:00' }]);
  a.tabelas.ATEC_RELATORIOS = [
    { ID: 'rr1', OS_ID: 'os9', OS_NUMERO: 'OS-0009', REVISAO: 1, RASCUNHO: 'SIM', PDF_ID: 'arqRascxxxxx', EMITIDO_EM: d(-14) + 'T10:00:00' },
    { ID: 'rr2', OS_ID: 'os9', OS_NUMERO: 'OS-0009', REVISAO: 2, MOTIVO: 'Versão interna para a garantia', PDF_ID: 'arqRelIntxxx', EMITIDO_EM: d(-13) + 'T10:00:00' }];
  a.tabelas.QUALIF_EMISSOES = [{ ID: 'qe1', MODULO: 'AUTOCLAVE_OFICIAL', STATUS: 'AGUARDANDO_APROVACAO', NUMERO: 'QA-77', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', PDF_ID: 'arqMinutaxxx', ENVIADO_EM: d(-1) + 'T10:00:00' }];
  a.tabelas.AUVO_TAREFAS = [
    { ID: 't1', AUVO_TASK_ID: '7001', EQUIPAMENTOS_ID_SGO: 'eq1', CLIENTE_ID_SGO: 'c1', FINALIZADA: 'SIM', DATA_TAREFA: d(-90) + 'T09:00:00', TIPO_TAREFA: 'Manutenção preventiva', TECNICO_NOME_AUVO: 'JOAO TECNICO AUVO', RELATO_SERVICO: 'Limpeza da câmara e troca da vedação da porta', TASK_URL: 'https://app.auvo.exemplo/tarefa/7001', RELATORIO_URL: 'https://app.auvo.exemplo/rel/7001' },
    { ID: 't2', AUVO_TASK_ID: '7002', EQUIPAMENTOS_ID_SGO: 'eq1', CLIENTE_ID_SGO: 'c1', FINALIZADA: 'NAO', DATA_TAREFA: d(-1) + 'T09:00:00', TIPO_TAREFA: 'Corretiva em andamento', TECNICO_NOME_AUVO: 'JOAO TECNICO AUVO', RELATO_SERVICO: '' }];
  a.tabelas.LAVCIC_RELATORIOS = [
    { ID: 'lr1', NUMERO: 'RCL-0001', VERSAO: 1, SITUACAO: 'ATIVO', EQUIPAMENTO_ID: 'eq2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', LOTE: '11', DATA_CICLO: d(-9), PDF_ID: 'lavPdf1xxxx', EMITIDO_EM: d(-9) + 'T10:00:00' },
    { ID: 'lr2', NUMERO: 'RCL-0002', VERSAO: 1, SITUACAO: 'ATIVO', EQUIPAMENTO_ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: '', LOTE: '12', DATA_CICLO: d(-8), PDF_ID: 'lavPdf2xxxx', EMITIDO_EM: d(-8) + 'T10:00:00' }];
  a.ctx.SGO_Atendimentos_invalidar_();
}
/** Contrato vigente do cliente c1, registrado pela Diretoria, com calibração anual e manutenção preventiva mensal. */
function contrato(a, extra) {
  const r = a.pcl('s_dora', 'salvar', Object.assign({ clienteId: 'c1', unidades: [], numero: 'CT-ALFA-2026', objeto: 'Calibração anual e manutenção preventiva mensal das autoclaves', origemTipo: 'ASSINADO',
    servicos: [{ servico: 'CALIBRACAO', periodicidade: 'ANUAL' }, { servico: 'MANUTENCAO_PREVENTIVA', periodicidade: 'MENSAL' }, { servico: 'MANUTENCAO_CORRETIVA', periodicidade: 'SOB_DEMANDA' }],
    inicio: '2026-01-01', fim: '2027-06-30', responsavelId: 'u_gt', motivo: 'Contrato assinado com o cliente (teste)' }, extra || {}));
  assert.equal(r.ok, true, r.message);
  return a.lin('CLI_CONTRATOS').find((k) => k.NUMERO === ((extra && extra.numero) || 'CT-ALFA-2026'));
}
/** Chaves que nunca vão ao cliente (item 3.1.4 e 4.4), procuradas em todo o JSON. */
const PROIBIDAS = ['PRIORIDADE', 'prioridade', 'TECNICO_ID', 'tecnicoId', 'TECNICO_NOME', 'tecnico', 'interna', 'INTERNA', 'VALOR_TOTAL', 'custo', 'POR_ID', 'POR_NOME', 'AUTOR_ID', 'ARQUIVO_ID', 'arquivoId',
  'arquivoInterno', 'docDocumentoId', 'LINK_ARQUIVO', 'link', 'relatorioUrl', 'QR_TOKEN', 'NF_VENDA_ARQUIVO_ID', 'OBSERVACOES', 'pasta', 'origens', 'origemNome', 'repeticoes', 'PORTAL', 'portal', 'PORTAL_MOTIVO'];
function chaves(o, out) { if (Array.isArray(o)) o.forEach((x) => chaves(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach((k) => { out.add(k); chaves(o[k], out); }); return out; }
function semProibidas(o, rotulo) { const k = chaves(o, new Set()); PROIBIDAS.forEach((p) => assert.ok(!k.has(p), rotulo + ': a chave ' + p + ' chegou ao cliente')); }
const titulos = (r) => r.documentos.map((x) => x.titulo);
const kDe = (arq) => 'ARQUIVO:' + arq;

test('T3.1: documento com PORTAL = OCULTO não aparece nem abre, em nenhuma tela do cliente; a equipe continua vendo', () => {
  const a = amb(); contrato(a);
  const r = a.pcl('s_cliente.alfa', 'documentos', {});
  assert.equal(r.ok, true, r.message);
  assert.ok(!titulos(r).some((t) => /LV-02 interno/.test(t)), 'oculto fora da lista');
  const inex = a.pcl('s_cliente.alfa', 'abrirDocumento', { k: 'ARQUIVO:naoexiste123' });
  const oc = a.pcl('s_cliente.alfa', 'abrirDocumento', { k: kDe('arqCert2xxxx') });
  assert.equal(oc.ok, false); assert.equal(oc.codigo, 'NAO_ENCONTRADO'); assert.equal(oc.message, inex.message, 'a mesma resposta de inexistente');
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', 'arqCert2xxxx'), false, 'a rota /arquivos nega');
  // o Arquivo de documentos antigo (listar/obter) e o índice por pasta do cliente também escondem
  const lista = j(a.ctx.PCl_publicoSeCliente_('s_cliente.alfa', 'DOC_DOCUMENTOS', { success: true, items: a.lin('DOC_DOCUMENTOS').filter((x) => x.CLIENTE_ID === 'c1') }));
  assert.ok(!lista.items.some((x) => x.ID === 'd6')); assert.ok(lista.items.some((x) => x.ID === 'd1'));
  const item = j(a.ctx.PCl_publicoSeCliente_('s_cliente.alfa', 'DOC_DOCUMENTOS', { success: true, item: a.lin('DOC_DOCUMENTOS').find((x) => x.ID === 'd6') }));
  assert.equal(item.success, false); assert.equal(item.message, 'Documento não encontrado.');
  const pastas = JSON.stringify(j(a.ctx.documentosPastas('s_cliente.alfa', { escopo: 'cliente', via: 'portal' })));
  assert.doesNotMatch(pastas, /LV-02 interno/); assert.match(pastas, /Certificado AC-01/);
  // central de vencimentos: o cliente não recebe; a equipe recebe
  assert.ok(!a.pend('s_cliente.alfa').some((i) => i.id === 'CAL:eq2'), 'cliente não vê o vencimento do oculto');
  assert.ok(a.pend('s_dora').some((i) => i.id === 'CAL:eq2'), 'a Diretoria continua vendo');
  // a ficha da equipe continua mostrando, com a marca
  const ficha = JSON.stringify(j(a.ctx.documentosPastas('s_dora', { escopo: 'cliente', id: 'c1', via: 'ficha' })));
  assert.match(ficha, /LV-02 interno/); assert.match(ficha, /"portal":"OCULTO"/);
  // tirar a marca (com motivo) devolve o documento ao cliente
  const g = a.pcl('s_gil', 'portalDocumento', { docId: 'd6', portal: '', motivo: 'Conferido: o certificado é deste cliente' });
  assert.equal(g.ok, true, g.message);
  assert.ok(titulos(a.pcl('s_cliente.alfa', 'documentos', {})).some((t) => /LV-02 interno/.test(t)));
  assert.equal(a.pcl('s_cliente.alfa', 'abrirDocumento', { k: kDe('arqCert2xxxx') }).ok, true);
});

test('T3.2: tipo fora da lista visível não aparece; liberado um a um aparece; a lista é configurável em Regras do portal', () => {
  const a = amb(); contrato(a);
  const r = a.pcl('s_cliente.alfa', 'documentos', {});
  const t = titulos(r);
  ['Certificado AC-01 2026', 'Qualificação térmica AC-01', 'Laudo NR-13 AC-01', 'Relatório de manutenção preventiva LV-02', 'Cronograma de execução 2026', 'Certificado SL-04'].forEach((x) => assert.ok(t.includes(x) || (x === 'Relatório de manutenção preventiva LV-02'), x));
  assert.ok(!t.includes('PGT Unidade Centro'), 'PGT/POP fora da lista recomendada');
  assert.ok(!t.includes('Declaração de execução de serviço'), 'declaração fora da lista');
  assert.ok(!t.includes('Relatório de manutenção preventiva LV-02'), 'relatório de manutenção fora da lista recomendada');
  assert.ok(t.includes('Parecer técnico da autoclave'), 'liberado um a um (PORTAL = VISIVEL)');
  const tipos = new Set(r.documentos.map((x) => x.tipo));
  ['CALIBRACAO', 'QUALIFICACAO', 'NR13', 'CRONOGRAMA', 'ATENDIMENTO', 'RONDA'].forEach((x) => assert.ok(tipos.has(x), 'tipo presente: ' + x));
  assert.ok(r.documentos.every((x) => ['CALIBRACAO', 'QUALIFICACAO', 'NR13', 'ATENDIMENTO', 'CRONOGRAMA', 'CICLO_LAVADORA', 'RONDA'].includes(x.tipo) || x.titulo === 'Parecer técnico da autoclave'));
  assert.equal(a.pcl('s_cliente.alfa', 'abrirDocumento', { k: kDe('arqPgt1xxxxx') }).message, 'Não encontrado. Atualize a lista.');
  // Regras do portal: lista com pelo menos um tipo; o merge mantém as outras regras
  const reg = a.pcl('s_dora', 'regras', {});
  assert.deepEqual(reg.documentos.tipos.filter((x) => x.visivel).map((x) => x.codigo).sort(), ['ATENDIMENTO', 'CALIBRACAO', 'CICLO_LAVADORA', 'CRONOGRAMA', 'NR13', 'QUALIFICACAO', 'RONDA']);
  const base = { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'Comercial Metrolabs, (62) 3333-0000', plantaoTelefone: '(62) 99999-0000', motivo: 'Plantão informado pelo dono (teste)' };
  assert.equal(a.pcl('s_dora', 'salvarRegras', base).ok, true);
  const vazio = a.pcl('s_dora', 'salvarRegras', Object.assign({}, base, { docTiposVisiveis: [], motivo: 'Teste da lista vazia de tipos' }));
  assert.equal(vazio.ok, false); assert.deepEqual(vazio.faltam.map((f) => f.campo), ['pclRgDocTipos']);
  const ok = a.pcl('s_dora', 'salvarRegras', Object.assign({}, base, { docTiposVisiveis: ['CALIBRACAO', 'QUALIFICACAO', 'NR13', 'ATENDIMENTO', 'CRONOGRAMA', 'CICLO_LAVADORA', 'RONDA', 'PGT_POP'], motivo: 'Cliente pediu PGT e POP no portal (teste)' }));
  assert.equal(ok.ok, true, ok.message); assert.match(ok.message, /tipos de documento visíveis no portal mudaram/);
  assert.ok(titulos(a.pcl('s_cliente.alfa', 'documentos', {})).includes('PGT Unidade Centro'));
  assert.equal(a.pcl('s_dora', 'regras', {}).chamados.plantaoTelefone, '(62) 99999-0000', 'as outras regras ficaram');
  assert.equal(a.pcl('s_gil', 'salvarRegras', Object.assign({}, base, { docTiposVisiveis: ['CALIBRACAO'] })).codigo, 'SEM_PERMISSAO', 'só Administrador e Diretoria');
});

test('T3.3: rascunho, minuta e versão interna nunca aparecem nem abrem; só a versão do cliente', () => {
  const a = amb(); contrato(a);
  const r = a.pcl('s_cliente.alfa', 'documentos', {});
  const ks = JSON.stringify(r);
  ['arqRascxxxxx', 'arqRelIntxxx', 'arqRepInt1xx', 'arqMinutaxxx'].forEach((arq) => {
    assert.ok(!ks.includes(arq), arq + ' não aparece');
    assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', arq), false, arq + ' não abre');
    assert.equal(a.pcl('s_cliente.alfa', 'abrirDocumento', { k: 'REP_DOCUMENTOS:' + arq }).codigo, 'NAO_ENCONTRADO');
  });
  assert.doesNotMatch(ks, /versão interna/i);
  assert.ok(r.documentos.some((x) => x.tipo === 'ATENDIMENTO' && /RA-9/.test(x.titulo)), 'a versão do cliente do relatório A4 aparece');
  assert.ok(r.documentos.some((x) => x.tipo === 'ATENDIMENTO' && /OS-0009/.test(x.titulo)), 'o relatório da O.S. encerrada aparece');
  assert.ok(r.documentos.some((x) => x.tipo === 'RONDA' && /OS-0010/.test(x.titulo)), 'o relatório de ronda aparece como ronda');
  assert.ok(!r.documentos.some((x) => /QA-77/.test(x.titulo)), 'a qualificação em minuta não aparece');
  semProibidas(r, 'documentos');
  r.documentos.forEach((x) => assert.ok(!Object.prototype.hasOwnProperty.call(x, 'url'), 'sem link direto na lista'));
});

test('T3.4: o farol bate com o motor de vencimentos (central de pendências) para os mesmos dados', () => {
  const a = amb(); contrato(a);
  const eqs = a.pcl('s_cliente.alfa', 'equipamentos', {});
  assert.equal(eqs.ok, true, eqs.message);
  const farol = {}; eqs.equipamentos.forEach((e) => { farol[e.id] = {}; e.farol.forEach((c) => { farol[e.id][c.categoria] = c; }); });
  assert.equal(farol.eq1.CAL.s, 'vencendo'); assert.equal(farol.eq1.QUAL.s, 'em_dia'); assert.equal(farol.eq1.NR13.s, 'vencido'); assert.equal(farol.eq1.MAN.s, 'sem_registro');
  assert.equal(farol.eq2.MAN.s, 'em_dia'); assert.equal(farol.eq2.CAL.s, 'sem_registro', 'o certificado oculto não conta para o cliente');
  assert.equal(farol.eq4.CAL.s, 'vencido');
  // mesma data e mesma situação que a central mostra ao cliente (a central lista só o que vence em até 30 dias ou já venceu)
  const central = {}; a.pend('s_cliente.alfa').filter((i) => i.vencimentoTipo).forEach((i) => { central[i.id] = i; });
  ['CAL', 'QUAL', 'NR13'].forEach((cat) => Object.keys(farol).forEach((eq) => {
    const f = farol[eq][cat], c = central[cat + ':' + eq];
    if (c) { assert.equal(f.venc, c.vencimento, cat + ':' + eq + ' data'); assert.equal(f.s, c.dias < 0 ? 'vencido' : 'vencendo', cat + ':' + eq + ' situação'); }
    else assert.ok(['em_dia', 'sem_registro'].includes(f.s), cat + ':' + eq + ' fora da central = em dia ou sem registro');
  }));
  // o motor é o mesmo: Pend_vencimentosBase_ dá as mesmas datas que o farol
  const base = j(a.ctx.Pend_vencimentosBase_()).filter((c) => c.clienteId === 'c1' && !c.ocultoCliente);
  base.filter((c) => ['CAL', 'QUAL', 'NR13'].includes(c.cat)).forEach((c) => assert.equal(farol[c.equipId][c.cat].venc, a.ctx.PCl_br_(c.venc), c.chave));
  // Solicitante só da un1: sem a seladora da filial, na lista e no resumo
  const s = a.pcl('s_sonia.alfa', 'equipamentos', {});
  assert.deepEqual(s.equipamentos.map((e) => e.id).sort(), ['eq1', 'eq2']);
  const v = a.pcl('s_sonia.alfa', 'vencimentos', { janela: 'todos' });
  assert.ok(v.vencimentos.every((x) => x.unidadeId === 'un1')); assert.ok(!v.vencimentos.some((x) => x.equipamentoId === 'eq4'));
  // filtro do farol e janela dos vencimentos
  assert.deepEqual(a.pcl('s_cliente.alfa', 'equipamentos', { farol: 'vencido' }).equipamentos.map((e) => e.id).sort(), ['eq1', 'eq4']);
  const v30 = a.pcl('s_cliente.alfa', 'vencimentos', { janela: '30' }).vencimentos.map((x) => x.chave).sort();
  assert.deepEqual(v30, ['CAL:eq1', 'CAL:eq4', 'NR13:eq1']);
  semProibidas(eqs, 'equipamentos'); semProibidas(v, 'vencimentos');
});

test('T3.5: o histórico do equipamento em modo cliente mostra só atendimentos encerrados, sem técnico nem link de outro sistema', () => {
  const a = amb(); contrato(a);
  AST.chamadoAgendado(a, {}); // O.S. agendada do eq1: não entra no histórico
  a.ctx.SGO_Atendimentos_invalidar_();
  const f = a.pcl('s_cliente.alfa', 'equipamento', { id: 'eq1' });
  assert.equal(f.ok, true, f.message);
  const h = f.historico;
  assert.ok(h.some((x) => x.numero === 'OS-0009'), 'O.S. encerrada do SGO+');
  assert.ok(h.some((x) => x.numero === '7001'), 'tarefa encerrada do Auvo');
  assert.ok(!h.some((x) => x.numero === '7002'), 'tarefa do Auvo em andamento fica de fora');
  assert.equal(h.length, 2, JSON.stringify(h));
  assert.doesNotMatch(JSON.stringify(h), /TIAGO|JOAO|auvo\.exemplo/i, 'sem técnico e sem link do Auvo');
  semProibidas(f, 'ficha do equipamento');
  // a ficha traz dados públicos, documentos, chamados e o texto da correção
  assert.equal(f.equipamento.tag, 'AC-01'); assert.ok(f.documentos.some((d) => d.tipo === 'CALIBRACAO'));
  assert.ok(f.chamados.length >= 1, 'o chamado do equipamento aparece'); assert.match(f.correcaoTexto, /^Correção de cadastro do equipamento AC-01/);
  assert.equal(f.pode.abrirChamado, true);
  // fora do escopo: a mesma resposta de inexistente, com ESCOPO_RECUSADO
  const inex = a.pcl('s_sonia.alfa', 'equipamento', { id: 'naoexiste' });
  for (const [sid, id] of [['s_sonia.alfa', 'eq4'], ['s_sonia.alfa', 'eq3'], ['s_cliente.beta', 'eq1']]) {
    const r = a.pcl(sid, 'equipamento', { id }); assert.equal(r.ok, false); assert.equal(r.message, inex.message, sid + ' ' + id);
  }
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === 'eq4'));
  // Consulta lê, mas não abre chamado nem envia correção
  const c = a.pcl('s_celia.alfa', 'equipamento', { id: 'eq1' });
  assert.equal(c.ok, true); assert.equal(c.pode.abrirChamado, false); assert.equal(c.pode.conversar, false);
});

test('T3.6: o cronograma separa Agendado, Previsto e Documento; previsto nunca vira compromisso; periodicidade do contrato', () => {
  const a = amb(); contrato(a);
  const ag = AST.chamadoAgendado(a, {});
  const r = a.pcl('s_cliente.alfa', 'cronograma', {});
  assert.equal(r.ok, true, r.message);
  assert.equal(r.explicacao, 'Previsto é calculado pela validade dos documentos e pela periodicidade do contrato. A data só fica confirmada quando aparece em Agendado.');
  // Agendado: ronda agendada, visita do chamado e O.S. da filial (o Gestor vê todas); a O.S. de data passada ainda "agendada" não
  const tipos = r.agendado.map((x) => x.tipo);
  assert.ok(tipos.includes('Ronda de engenharia clínica')); assert.ok(tipos.includes('Visita do chamado ' + ag.chamado.numero)); assert.ok(r.agendado.some((x) => x.os === 'OS-0012'));
  assert.ok(!r.agendado.some((x) => x.os === 'OS-0013'), 'agendada com data passada não é compromisso futuro');
  assert.ok(r.agendado.every((x) => !('fonte' in x)));
  // Previsto: pela validade e pela periodicidade do contrato (mensal a partir de 01/01/2026 -> 01/11/2026; anual -> 01/01/2027)
  assert.ok(r.previsto.every((x) => ['VALIDADE', 'CONTRATO'].includes(x.fonte)));
  const cal = r.previsto.find((x) => x.fonte === 'VALIDADE' && /calibração/.test(x.servico) && /AC-01/.test(x.equipamento));
  assert.ok(cal); assert.equal(cal.quando, a.ctx.PCl_br_(a.dia(20))); assert.match(cal.contrato, /CT-ALFA-2026: anual/);
  assert.ok(r.previsto.some((x) => x.fonte === 'VALIDADE' && /inspeção NR-13/.test(x.servico) && x.atrasado), 'o vencido aparece como a programar');
  const prev = r.previsto.filter((x) => x.fonte === 'CONTRATO');
  assert.deepEqual(prev.map((x) => x.quando + ' ' + x.servico).sort(), ['01/01/2027 Calibração', '01/11/2026 Manutenção preventiva']);
  assert.ok(!prev.some((x) => /corretiva/i.test(x.servico)), 'sob demanda não gera previsto');
  // nada do previsto repete o agendado
  const agKeys = new Set(r.agendado.map((x) => x.quandoIso.slice(0, 10) + x.servico));
  assert.ok(r.previsto.every((x) => !agKeys.has(x.quandoIso + x.servico)));
  // Documento: o cronograma de execução emitido
  assert.deepEqual(r.documento.map((x) => x.titulo), ['Cronograma de execução 2026']);
  // Solicitante da un1: sem a O.S. da filial nem o vencido da seladora
  const s = a.pcl('s_sonia.alfa', 'cronograma', {});
  assert.ok(!s.agendado.some((x) => x.os === 'OS-0012')); assert.ok(!s.previsto.some((x) => /SL-04/.test(x.equipamento)));
  semProibidas(r, 'cronograma');
  assert.doesNotMatch(JSON.stringify(r), /TIAGO/, 'o cronograma não mostra técnico');
});

test('T3.7: abrir um documento passa pela trava de arquivo e grava DOCUMENTO_ABERTO em PCL_ACESSOS', () => {
  const a = amb(); contrato(a);
  const r = a.pcl('s_sonia.alfa', 'abrirDocumento', { k: kDe('arqCert1xxxx') });
  assert.equal(r.ok, true, r.message); assert.equal(r.url, '/arquivos/arqCert1xxxx');
  const reg = a.lin('PCL_ACESSOS').filter((x) => x.ACAO === 'DOCUMENTO_ABERTO');
  assert.equal(reg.length, 1); assert.equal(reg[0].USUARIO_ID, 'u_sol'); assert.equal(reg[0].REF_ID, 'arqCert1xxxx'); assert.equal(reg[0].CLIENTE_ID, 'c1');
  assert.match(reg[0].DETALHE, /Certificado de calibração/);
  // versão anterior também abre (guardada junto do documento)
  a.tabelas.DOC_DOCUMENTOS.push({ ID: 'd1v', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01 2026 Rev. 01.pdf', LINK_ARQUIVO: '/arquivos/arqCert1rev1x', DATA_EMISSAO: a.dia(-1), DATA_VENCIMENTO: a.dia(360), STATUS: 'ATIVO' });
  const l = a.pcl('s_cliente.alfa', 'documentos', { tipo: 'CALIBRACAO', unidadeId: 'un1' });
  const cert = l.documentos.find((x) => /AC-01 2026/.test(x.titulo));
  assert.ok(cert && cert.anteriores.length === 1, JSON.stringify(l.documentos.map((x) => [x.titulo, (x.anteriores || []).length])));
  assert.equal(a.pcl('s_cliente.alfa', 'abrirDocumento', { k: cert.anteriores[0].k }).ok, true);
  // documento de outra unidade (Solicitante) e de outro cliente: "Não encontrado", com ESCOPO_RECUSADO
  for (const [sid, arq] of [['s_sonia.alfa', 'arqCert4xxxx'], ['s_cliente.alfa', 'arqCert3xxxx']]) {
    const x = a.pcl(sid, 'abrirDocumento', { k: kDe(arq) }); assert.equal(x.ok, false); assert.equal(x.message, 'Não encontrado. Atualize a lista.');
    assert.ok(a.lin('PCL_ACESSOS').some((z) => z.ACAO === 'ESCOPO_RECUSADO' && z.REF_ID === kDe(arq)), arq);
  }
  assert.equal(a.lin('PCL_ACESSOS').filter((x) => x.ACAO === 'DOCUMENTO_ABERTO').length, 2, 'as recusas não contam como abertura');
  // filtros: unidade, equipamento, vence até, período e busca
  const fil = ['Certificado SL-04', 'Relatório de ciclo da lavadora nº RCL-0002 · lote 12'].sort(); // o relatório de ciclo sem unidade vale pela unidade do equipamento
  assert.deepEqual(titulos(a.pcl('s_cliente.alfa', 'documentos', { unidadeId: 'un1b' })).sort(), fil);
  assert.ok(titulos(a.pcl('s_cliente.alfa', 'documentos', { venceAte: a.dia(25) })).every((t) => /AC-01 2026$|NR-13|SL-04/.test(t)));
  assert.deepEqual(titulos(a.pcl('s_cliente.alfa', 'documentos', { busca: 'sl-04' })).sort(), fil, 'busca pela TAG do equipamento');
  assert.ok(!titulos(a.pcl('s_cliente.alfa', 'documentos', { periodo: '30' })).includes('Cronograma de execução 2026'));
  assert.deepEqual(a.pcl('s_sonia.alfa', 'documentos', { unidadeId: 'un1b' }).documentos, [], 'unidade fora do acesso: nada');
});

test('T3.8: em CONSULTA (contrato terminado, depois da carência), os documentos continuam abrindo e a faixa avisa', () => {
  const a = amb(); const k = contrato(a);
  a.ctx.SGO_DATA.update('CLI_CONTRATOS', k.ID, { VIGENCIA_INICIO: a.dia(-400), VIGENCIA_FIM: a.dia(-40) }); a.ctx.PCl_memoLimpar_();
  assert.equal(a.ctx.PCl_situacaoAcesso_('c1', '', '').situacao, 'CONSULTA');
  const r = a.pcl('s_cliente.alfa', 'documentos', {});
  assert.equal(r.ok, true, r.message); assert.ok(r.documentos.length >= 5); assert.match(r.acesso.faixa, /modo consulta/);
  assert.equal(a.pcl('s_cliente.alfa', 'abrirDocumento', { k: kDe('arqCert1xxxx') }).ok, true);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', 'arqCert1xxxx'), true);
  ['equipamentos', 'vencimentos', 'cronograma'].forEach((ac) => assert.equal(a.pcl('s_cliente.alfa', ac, {}).ok, true, ac));
  assert.equal(a.pcl('s_cliente.alfa', 'equipamento', { id: 'eq1' }).pode.avulso, true, 'em consulta o botão vira atendimento avulso');
  // no previsto não entra o contrato terminado
  assert.ok(!a.pcl('s_cliente.alfa', 'cronograma', {}).previsto.some((x) => x.fonte === 'CONTRATO'));
});

test('T3.9: em SEM_ACESSO (e suspenso), nada abre nem é listado', () => {
  const a = amb(); const k = contrato(a);
  a.ctx.SGO_DATA.update('CLI_CONTRATOS', k.ID, { VIGENCIA_INICIO: a.dia(-900), VIGENCIA_FIM: a.dia(-500) }); a.ctx.PCl_memoLimpar_();
  assert.equal(a.ctx.PCl_situacaoAcesso_('c1', '', '').situacao, 'SEM_ACESSO');
  ['documentos', 'equipamentos', 'vencimentos', 'cronograma'].forEach((ac) => { const r = a.pcl('s_cliente.alfa', ac, {}); assert.equal(r.ok, false, ac); assert.equal(r.codigo, 'SEM_ACESSO'); assert.match(r.message, /não tem contrato vigente/); });
  assert.equal(a.pcl('s_cliente.alfa', 'equipamento', { id: 'eq1' }).codigo, 'SEM_ACESSO');
  assert.equal(a.pcl('s_cliente.alfa', 'abrirDocumento', { k: kDe('arqCert1xxxx') }).codigo, 'SEM_ACESSO');
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', 'arqCert1xxxx'), false);
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ACESSO_RECUSADO' && x.USUARIO_ID === 'u_cli'));
  // suspenso pela Metrolabs: a mesma trava, com o texto neutro (sem o motivo interno)
  const b = amb(); contrato(b);
  assert.equal(b.pcl('s_dora', 'suspender', { clienteId: 'c1', motivo: 'Pendência interna de teste (não vai ao cliente)' }).ok, true);
  const s = b.pcl('s_cliente.alfa', 'documentos', {});
  assert.equal(s.codigo, 'SEM_ACESSO'); assert.match(s.message, /suspenso/); assert.doesNotMatch(s.message, /Pendência interna/);
  assert.equal(b.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', 'arqCert1xxxx'), false);
});

test('pendências da etapa 1: filtro por unidade no prontuário pelo QR Code (equipamento e qualificação) e projeção pública', () => {
  const a = amb(); contrato(a);
  const inex = j(a.ctx.qrcodeAcessar('s_sonia.alfa', 'naoexiste'));
  const fora = j(a.ctx.qrcodeAcessar('s_sonia.alfa', 'eq4'));
  assert.equal(fora.success, false); assert.equal(fora.message, inex.message, 'outra unidade = inexistente');
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === 'eq4'));
  const dentro = j(a.ctx.qrcodeAcessar('s_sonia.alfa', 'eq1'));
  assert.equal(dentro.success, true, dentro.message);
  ['QR_TOKEN', 'NF_VENDA_ARQUIVO_ID', 'OBSERVACOES'].forEach((c) => assert.ok(!(c in dentro.equipamento), c + ' não vai ao cliente'));
  assert.equal(dentro.equipamento.TAG, 'AC-01');
  assert.equal(j(a.ctx.qrcodeAcessar('s_cliente.alfa', 'eq4')).success, true, 'o Gestor com todas as unidades abre');
  assert.equal(j(a.ctx.qrcodeAcessar('s_gil', 'eq1')).equipamento.QR_TOKEN, 'tok-interno-123', 'a equipe continua recebendo o cadastro completo');
  // lista de qualificações e abertura de documento do prontuário
  const qInex = j(a.ctx.qrcodeQualificacao('s_sonia.alfa', 'naoexiste')), qFora = j(a.ctx.qrcodeQualificacao('s_sonia.alfa', 'eq4'));
  assert.equal(qFora.success, false); assert.equal(qFora.message, qInex.message);
  assert.equal(j(a.ctx.qualifEquipamentoListar('s_sonia.alfa', 'eq4')).message, j(a.ctx.qualifEquipamentoListar('s_sonia.alfa', 'naoexiste')).message);
  assert.equal(j(a.ctx.qualifEquipamentoAbrir('s_sonia.alfa', 'eq4', 'x', 'qr')).success, false);
  assert.equal(j(a.ctx.qrcodeQualificacao('s_sonia.alfa', 'eq1')).success, true);
  assert.equal(j(a.ctx.qrcodeQualificacao('s_cliente.alfa', 'eq4')).success, true);
  // documentos do prontuário pelo QR Code (já filtrados na etapa 1) seguem filtrados
  assert.equal(j(a.ctx.documentosPastas('s_sonia.alfa', { escopo: 'equipamento', id: 'eq4', via: 'qr' })).success, false);
});

test('pendências da etapa 1: filtro por unidade nos relatórios de ciclo da lavadora e nos vencimentos da central', () => {
  const a = amb(); contrato(a);
  const eu = (sid) => a.ctx.LavCic_eu_(sid);
  assert.deepEqual(j(a.ctx.LavCic_relatoriosVisiveis_(eu('s_sonia.alfa'))).map((r) => r.ID), ['lr1'], 'Solicitante: só a da un1 (a outra pela unidade do equipamento)');
  assert.deepEqual(j(a.ctx.LavCic_relatoriosVisiveis_(eu('s_cliente.alfa'))).map((r) => r.ID).sort(), ['lr1', 'lr2'], 'Gestor: todas');
  const busca = j(a.ctx.LavCiclo_api('s_sonia.alfa', 'buscar', { todas: true }));
  assert.equal(busca.ok, true, busca.message); assert.ok(!JSON.stringify(busca).includes('SL-04'), 'a lavadora da filial não aparece');
  const ini = j(a.ctx.LavCiclo_api('s_sonia.alfa', 'iniciar', {}));
  assert.equal(ini.totalRelatorios, 1);
  const inex = j(a.ctx.LavCiclo_api('s_sonia.alfa', 'equipamento', { id: 'naoexiste' }));
  assert.equal(j(a.ctx.LavCiclo_api('s_sonia.alfa', 'equipamento', { id: 'eq4' })).message, inex.message, 'outra unidade = inexistente');
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === 'eq4'));
  assert.ok(/Acesso negado|não está no cadastro/.test(j(a.ctx.LavCiclo_api('s_sonia.alfa', 'equipamento', { id: 'eq3' })).message), 'outro cliente continua negado');
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', 'lavPdf2xxxx'), false); assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', 'lavPdf2xxxx'), true);
  // central de pendências: Solicitante da un1 não vê o vencimento da seladora da filial; Gestor e equipe veem
  const ids = (sid) => a.pend(sid).map((i) => i.id);
  assert.ok(!ids('s_sonia.alfa').includes('CAL:eq4')); assert.ok(ids('s_sonia.alfa').includes('CAL:eq1'));
  assert.ok(ids('s_cliente.alfa').includes('CAL:eq4')); assert.ok(ids('s_dora').includes('CAL:eq4'));
  assert.ok(!ids('s_cliente.beta').some((x) => /eq1|eq4/.test(x)), 'outro cliente nunca');
});

test('Documentos no portal (equipe): lista com o porquê, marca com motivo, histórico e caixa PORTAL_CLIENTE_DOC_LIBERAR', () => {
  const a = amb(); contrato(a);
  const l = a.pcl('s_dora', 'documentosPortal', { clienteId: 'c1' });
  assert.equal(l.ok, true, l.message);
  const por = (t) => l.documentos.find((x) => x.titulo === t);
  assert.equal(por('PGT Unidade Centro').explicacao, 'Não aparece: o tipo está fora da lista');
  assert.equal(por('Certificado LV-02 interno').explicacao, 'Não aparece: oculto no portal'); assert.match(por('Certificado LV-02 interno').marcaMotivo, /cliente errado/);
  assert.equal(por('Parecer técnico da autoclave').explicacao, 'Aparece: liberado um a um');
  assert.equal(por('Certificado AC-01 2026').explicacao, 'Aparece: o tipo está na lista');
  assert.ok(!l.documentos.some((x) => /QA-77|versão interna/i.test(x.titulo)), 'minuta e versão interna não entram');
  assert.deepEqual(a.pcl('s_dora', 'documentosPortal', { clienteId: 'c1', filtro: 'oculto' }).documentos.map((x) => x.titulo), ['Certificado LV-02 interno']);
  // marca: motivo obrigatório; nada mudou; liberar um a um
  const sem = a.pcl('s_gil', 'portalDocumento', { docId: 'd5', portal: 'VISIVEL', motivo: 'curto' });
  assert.equal(sem.ok, false); assert.deepEqual(sem.faltam.map((f) => f.campo), ['pclDpMotivo']);
  assert.equal(a.pcl('s_gil', 'portalDocumento', { docId: 'd9', portal: 'VISIVEL', motivo: 'Mesma marca de antes (teste)' }).codigo, 'NADA');
  const ok = a.pcl('s_gil', 'portalDocumento', { docId: 'd5', portal: 'VISIVEL', motivo: 'Cliente pediu o PGT para a auditoria' });
  assert.equal(ok.ok, true, ok.message);
  const d5 = a.lin('DOC_DOCUMENTOS').find((x) => x.ID === 'd5');
  assert.equal(d5.PORTAL, 'VISIVEL'); assert.equal(d5.PORTAL_POR_NOME, 'GIL GESTOR TECNICO TESTE'); assert.match(d5.PORTAL_EM, /^\d{4}-\d{2}-\d{2}T/); assert.equal(d5.NOME_ARQUIVO, 'PGT Unidade Centro.pdf', 'merge: o resto da linha fica');
  assert.ok(titulos(a.pcl('s_cliente.alfa', 'documentos', {})).includes('PGT Unidade Centro'));
  assert.ok(a.lin('PCL_REGRAS_HIST').some((h) => h.CHAVE === 'DOCUMENTO_PORTAL' && /auditoria/.test(h.MOTIVO)));
  assert.ok(a.pcl('s_dora', 'regras', {}).historico.some((h) => h.chave === 'Documento no portal'));
  // caixa: gestor comercial, técnico e cliente não marcam; a aba aparece para quem tem a caixa
  assert.equal(a.pcl('s_gaspar', 'portalDocumento', { docId: 'd5', portal: '', motivo: 'Tentativa sem a caixa certa' }).codigo, 'SEM_PERMISSAO');
  assert.match(a.pcl('s_gaspar', 'documentosPortal', { clienteId: 'c1' }).message, /Ocultar ou liberar documento no portal/);
  assert.equal(a.pcl('s_tiago', 'documentosPortal', { clienteId: 'c1' }).codigo, 'SEM_PERMISSAO');
  assert.equal(a.pcl('s_cliente.alfa', 'documentosPortal', { clienteId: 'c1' }).codigo, 'NAO_PERMITIDO');
  assert.equal(a.pcl('s_gil', 'iniciar', {}).docLiberar, true); assert.equal(a.pcl('s_gaspar', 'iniciar', {}).docLiberar, false);
  assert.ok(a.ctx.PCL_PODERES_ITENS.some((x) => x[0] === 'PORTAL_CLIENTE_DOC_LIBERAR'));
});

test('portão e projeção: tudo pela entrada única PortalCliente_api (já na lista do cliente) e nada proibido nas respostas', () => {
  const a = amb(); contrato(a);
  const tela = ler('JS_PortalCliente_Documentos.html');
  const fns = [...tela.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)\(SGO_getSessionId\(\)/g)].map((m) => m[1]);
  assert.ok(fns.length >= 2); fns.forEach((f) => assert.ok(a.ctx.PCL_FUNCOES_CLIENTE.includes(f), f + ' está na lista fechada do cliente'));
  ['documentos', 'abrirDocumento', 'equipamentos', 'equipamento', 'vencimentos', 'cronograma'].forEach((ac) => assert.ok(a.ctx.PCL_ACOES_CLIENTE[ac], ac));
  for (const sid of ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa']) {
    semProibidas(a.pcl(sid, 'documentos', {}), sid + ' documentos'); semProibidas(a.pcl(sid, 'equipamentos', {}), sid + ' equipamentos');
    semProibidas(a.pcl(sid, 'equipamento', { id: 'eq1' }), sid + ' ficha'); semProibidas(a.pcl(sid, 'cronograma', {}), sid + ' cronograma');
  }
  // nenhuma data crua (Date) nas respostas: tudo texto
  const r = a.ctx.PortalCliente_api('s_cliente.alfa', 'documentos', {});
  (function semDate(o) { if (o instanceof Date) assert.fail('Date cru na resposta'); if (o && typeof o === 'object') Object.keys(o).forEach((k) => semDate(o[k])); })(r);
  // a equipe chamando ação do cliente recebe a recusa de sempre
  assert.equal(a.pcl('s_dora', 'documentos', {}).codigo, 'ACAO');
});

test('tela, ajuda e manual: menu, rotas, celular, explicação de cada campo, guias, ajuda das telas, manual e nenhum alert', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html'), tela = ler('JS_PortalCliente_Documentos.html'), aj = ler('JS_PortalCliente_Ajuda.html'), pcl = ler('JS_PortalCliente.html'), ac = ler('JS_PortalCliente_Acessos.html');
  ['portal_cliente_documentos', 'portal_cliente_equipamentos', 'portal_cliente_vencimentos'].forEach((m) => {
    assert.match(idx, new RegExp('id="menu-btn-' + m + '"')); assert.match(core, new RegExp(m + ': "')); assert.match(ac, new RegExp('"' + m + '"'));
  });
  assert.match(idx, /include\('JS_PortalCliente_Documentos'\)/); assert.match(core, /PclD_render_\(mod\.replace\("portal_cliente_", ""\)\)/);
  assert.match(core, /legenda: "Documentos técnicos", mod: "portal_cliente_documentos"/); assert.match(core, /legenda: "Meus equipamentos", mod: "portal_cliente_equipamentos"/);
  assert.match(pcl, /\["docsportal", "Documentos no portal"\]/); assert.match(pcl, /PclDI_regrasHtml_/); assert.match(pcl, /docTiposVisiveis: PclDI_tiposMarcados_\(\)/);
  const ids = [...tela.matchAll(/<(?:input|select|textarea)[^>]* id="(pcl[A-Za-z]+)"/g)].map((m) => m[1]).concat(['pclRgDocTipos']);
  assert.ok(ids.length >= 18, 'campos na tela: ' + ids.length);
  const semDica = [...new Set(ids)].filter((id) => !new RegExp('\\b' + id + ':').test(aj));
  assert.deepEqual(semDica, [], 'todo campo tem explicação');
  ['documentos', 'equipamentos', 'fichaEquipamento', 'vencimentos', 'cronograma', 'documentosPortal'].forEach((g) => assert.match(aj, new RegExp('\\b' + g + ': \\[')));
  assert.match(aj, /div\[id="pclRgDocTipos"\]/);
  assert.doesNotMatch(tela, /window\.(confirm|prompt|alert)\(|\balert\(/);
  assert.match(tela, /text-align: ?justify/);
  assert.match(tela, /Previsto|PCLD_TITULOS/);
  const ctx = vm.createContext({}); vm.runInContext(ler('SGO_Ajuda_PortalCliente.js'), ctx);
  const telas = ctx.SGO_ajudaTelas_PortalCliente_();
  ['portal_cliente_documentos', 'portal_cliente_equipamentos', 'portal_cliente_vencimentos'].forEach((k) => {
    const t = telas[k]; assert.ok(t && t.titulo && t.paraQueServe && t.passos.length >= 2 && t.problemas.length >= 2, k);
    assert.doesNotMatch(JSON.stringify(t), /Administração|caixa|PORTAL_CLIENTE_|nota interna|DOC_DOCUMENTOS|OCULTO/i, k + ': texto do cliente sem recurso administrativo');
  });
  assert.match(JSON.stringify(telas.portal_cliente_contratos), /Documentos no portal/);
  const aju = ler('SGO_Ajuda.js');
  assert.match(aju, /portal_cliente_documentos: 'Documentos técnicos'/); assert.match(aju, /portal_cliente_vencimentos: 'Vencimentos e cronograma'/);
  assert.match(ler('SGO_AssistenteErros.js'), /JS_PortalCliente_Documentos: 'portal_cliente_documentos'/);
  const man = lerDoc('MANUAL_MODULO_PORTAL_CLIENTE.md');
  assert.match(man, /## 25\. Documentos, equipamentos, vencimentos e cronograma/); assert.match(man, /PORTAL_CLIENTE_DOC_LIBERAR/); assert.match(man, /DOCUMENTO_ABERTO/);
  assert.match(man, /Previsto é calculado pela validade dos documentos e pela periodicidade do contrato/); assert.match(man, /prontuário pelo QR Code/); assert.match(man, /`PORTAL`/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Documentos no portal \(equipe\)/, 'base do assistente regerada');
});
