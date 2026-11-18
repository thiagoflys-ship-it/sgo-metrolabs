// 18/11/2026 — Portal do cliente, ETAPA 5 (e): INDICADORES (output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md, itens 4.1.8, 4.2.4, 4.6 e
// testes T5.1 a T5.5). Código real num vm, com o ambiente da Assistência técnica (tests/_assistencia_ambiente.cjs: planilha, Drive, e-mail e
// relógio simulados; o relógio fica na segunda-feira 19/10/2026, às 10h; expediente 08:00 às 17:30, dias úteis) e o Portal do cliente, os
// documentos A4 da Representação e o convite de acesso carregados junto. Nenhum e-mail sai de verdade.
// Conjunto fixo de dados (só fictícios): cliente c1 com 2 unidades (un1 Centro, un1b Filial), contas Gestor (conta antiga sem papel),
// Solicitante só da un1 e Consulta só da un1; cliente c2 com uma conta. Os valores esperados de T5.1 foram calculados à mão (comentários).
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa5-20261118.test.cjs
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
const semNaN = (r, rot) => { const s = JSON.stringify(r); assert.doesNotMatch(s, /NaN|Infinity|undefined/, rot + ': NaN, Infinity ou undefined na resposta'); };

test('T5.1: cada índice confere com o cálculo à mão (Gestor do cliente, todas as unidades, 90 dias)', () => {
  const a = amb();
  const r = a.ind('s_cliente.alfa');
  assert.equal(r.ok, true, r.message);
  assert.equal(r.periodo, 90);
  assert.equal(a.card(r, 'abertos').valor, '3', 'chD (etapa 6) + chE (etapa 3) + solF (etapa 1); o pedido convertido, o cancelado e o concluído não contam');
  assert.equal(a.card(r, 'concluidos').valor, '3', 'chA, chB e chC; o chG (junho) e o chI (outro cliente) não');
  assert.equal(a.card(r, 'tempoVisita').valor, '6,3 h úteis', '(210 + 540) / 2 = 375 min = 6,25 h');
  assert.equal(a.card(r, 'tempoConclusao').valor, '10,7 h úteis', '(810 + 930 + 180) / 3 = 640 min');
  assert.equal(a.card(r, 'prazo').valor, '50,0%', '1 de 2 com prazo de contrato (o chC tem prazo padrão)');
  assert.equal(a.card(r, 'prazo').sub, '1 de 2');
  assert.equal(a.card(r, 'reincidencia').valor, '33,3%', 'chB tem o chA do mesmo equipamento 3 dias antes; o chG é de mais de 30 dias antes');
  assert.equal(a.card(r, 'reincidencia').sub, '1 de 3');
  // equipamentos em dia por categoria: CAL eq1 (vence em 20 dias, conta em dia), eq2 em dia, eq4 vencido; QUAL eq1 em dia; NR-13 eq1 vencido; MAN eq2 em dia
  const eq = Object.fromEntries(r.equipamentos.map((e) => [e.categoria, e]));
  assert.deepEqual([eq.CAL.emDia, eq.CAL.total, eq.CAL.vencendo, eq.CAL.vencidos, eq.CAL.pctTxt], [2, 3, 1, 1, '66,7%']);
  assert.deepEqual([eq.QUAL.emDia, eq.QUAL.total, eq.QUAL.pctTxt], [1, 1, '100,0%']);
  assert.deepEqual([eq.NR13.emDia, eq.NR13.total, eq.NR13.pctTxt], [0, 1, '0,0%']);
  assert.deepEqual([eq.MAN.emDia, eq.MAN.total, eq.MAN.pctTxt], [1, 1, '100,0%']);
  assert.equal(a.card(r, 'equipEmDia').valor, '66,7%', '4 de 6 (categoria × equipamento)');
  // vencimentos: 30 dias = d1 (08/11); 60 dias = d1 + d6 (03/12); já vencidos: d3 (CAL) e d5 (NR-13)
  const vc = Object.fromEntries(r.vencimentos.map((v) => [v.categoria, v]));
  assert.deepEqual([vc.CAL.ate30, vc.CAL.ate60, vc.CAL.vencidos], [1, 1, 1]);
  assert.deepEqual([vc.MAN.ate30, vc.MAN.ate60], [0, 1]);
  assert.equal(vc.NR13.vencidos, 1);
  assert.equal(a.card(r, 'vencimentos').valor, '1 / 2');
  assert.deepEqual(r.abertosPorEtapa.filter((x) => x.qtd).map((x) => [x.n, x.qtd]), [[1, 1], [3, 1], [6, 1]]);
  // cada índice leva "como é contado"; nada de NaN
  r.cards.forEach((c) => assert.ok(c.como && c.como.length > 40, c.k + ' sem "como é contado"'));
  semNaN(r, 'Gestor');
  // período de 30 dias: chA (06/10) e chB (09/10) e chC (13/10) estão dentro; de 365 dias, o chG (06/2026) entra
  assert.equal(a.card(a.ind('s_cliente.alfa', { periodo: 365 }), 'concluidos').valor, '4');
  assert.equal(a.ind('s_cliente.alfa', { periodo: 999 }).periodo, 90, 'período fora da lista volta ao padrão');
  // registro: o cliente não recebe nada do Financeiro nem dado interno
  const k = new Set(); (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.keys(o).forEach((x) => { k.add(x); walk(o[x]); }); })(r);
  ['PRIORIDADE', 'prioridade', 'TECNICO_NOME', 'tecnico', 'VALOR_TOTAL', 'valor_total', 'custo', 'IP', 'ip', 'NAVEGADOR', 'navegador', 'SLA_MIN_UTEIS'].forEach((p) => assert.ok(!k.has(p), 'chave ' + p + ' chegou ao cliente'));
});

test('T5.1 (divisão por zero): sem base, o índice mostra "—" com o motivo, nunca NaN nem Infinity', () => {
  const a = amb();
  // só a Filial: um concluído (chC), sem visita e sem prazo de contrato
  const f = a.ind('s_cliente.alfa', { unidadeId: 'un1b' });
  assert.equal(f.ok, true, f.message);
  assert.equal(a.card(f, 'concluidos').valor, '1');
  assert.equal(a.card(f, 'tempoVisita').valor, '—'); assert.match(a.card(f, 'tempoVisita').motivo, /chegada do técnico/);
  assert.equal(a.card(f, 'prazo').valor, '—'); assert.match(a.card(f, 'prazo').motivo, /prazo de atendimento do contrato/);
  assert.equal(a.card(f, 'tempoConclusao').valor, '3,0 h úteis');
  semNaN(f, 'Filial');
  // cliente sem nada no período e sem documento com validade: tudo zero ou "—", cada "—" com motivo
  a.tabelas.ATEC_CHAMADOS = a.tabelas.ATEC_CHAMADOS.filter((c) => c.CLIENTE_ID !== 'c2');
  a.tabelas.DOC_DOCUMENTOS = a.tabelas.DOC_DOCUMENTOS.filter((d) => d.CLIENTE_ID !== 'c2');
  a.tabelas.ATEC_SOLICITACOES = a.tabelas.ATEC_SOLICITACOES.filter((s) => s.CLIENTE_ID !== 'c2');
  const b = a.ind('s_cliente.beta');
  assert.equal(b.ok, true, b.message);
  assert.equal(a.card(b, 'abertos').valor, '0'); assert.equal(a.card(b, 'concluidos').valor, '0');
  b.cards.filter((c) => c.valor === '—').forEach((c) => assert.ok(c.motivo && c.motivo.length > 20, c.k + ': "—" sem motivo'));
  assert.deepEqual(b.cards.filter((c) => c.valor === '—').map((c) => c.k).sort(), ['equipEmDia', 'prazo', 'reincidencia', 'tempoConclusao', 'tempoVisita']);
  b.equipamentos.forEach((e) => { assert.equal(e.pctTxt, '—'); assert.ok(e.motivo); });
  semNaN(b, 'cliente vazio');
});

test('T5.2: o Solicitante vê só as unidades dele; outra unidade ou outro cliente = "não encontrado" com ESCOPO_RECUSADO; a Consulta não vê', () => {
  const a = amb();
  const r = a.ind('s_sonia.alfa');
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(r.unidades.map((u) => u.id), ['un1']);
  assert.match(r.escopo, /Unidade Centro/); assert.doesNotMatch(r.escopo, /Filial/);
  assert.equal(a.card(r, 'abertos').valor, '2', 'chD + solF (a Filial fica de fora)');
  assert.equal(a.card(r, 'concluidos').valor, '2', 'chA e chB');
  assert.equal(a.card(r, 'tempoConclusao').valor, '14,5 h úteis', '(810 + 930) / 2 = 870 min');
  assert.equal(a.card(r, 'reincidencia').valor, '50,0%');
  assert.deepEqual(r.equipamentos.find((e) => e.categoria === 'CAL').total, 2, 'o eq4 (Filial) não entra');
  // pedir a Filial ou a unidade de outro cliente direto: a mesma resposta de inexistente + ESCOPO_RECUSADO
  const fora = a.pcl('s_sonia.alfa', 'indicadores', { unidadeId: 'un1b' }), outro = a.pcl('s_sonia.alfa', 'indicadores', { unidadeId: 'un2' }), inex = a.pcl('s_sonia.alfa', 'indicadores', { unidadeId: 'nao-existe' });
  assert.equal(fora.ok, false); assert.equal(fora.codigo, 'NAO_ENCONTRADO'); assert.equal(fora.message, inex.message); assert.equal(outro.message, inex.message);
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === 'un1b'));
  // o Gestor do cliente escolhe a Filial normalmente
  assert.equal(a.ind('s_cliente.alfa', { unidadeId: 'un1b' }).ok, true);
  // Consulta: recusa com o papel, o porquê e o caminho, mesmo chamando a ação direto; o PDF também
  const c = a.pcl('s_celia.alfa', 'indicadores', {});
  assert.equal(c.ok, false); assert.equal(c.codigo, 'PAPEL'); assert.match(c.message, /«Consulta».*Por quê: .*O que fazer: /);
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'PAPEL_RECUSADO' && x.USUARIO_ID === 'u_con'));
  const cp = a.pcl('s_celia.alfa', 'relatorioPeriodo', {});
  assert.equal(cp.ok, false); assert.equal(cp.codigo, 'PAPEL');
  assert.match(j(a.api('s_celia.alfa', 'relatorioPeriodoCliente', { dias: 90 })).message, /«Consulta»/, '"Meus chamados" também recusa');
  // acesso suspenso: nada é lido
  const su = a.pcl('s_dora', 'suspender', { clienteId: 'c1', motivo: 'Teste de suspensão do acesso' });
  assert.equal(su.ok, true, su.message);
  const s = a.pcl('s_cliente.alfa', 'indicadores', {});
  assert.equal(s.ok, false); assert.equal(s.codigo, 'SEM_ACESSO'); assert.match(s.message, /suspenso/i);
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ACESSO_RECUSADO' && /Indicadores/.test(x.DETALHE)));
});

test('T5.3: o PDF do período sai filtrado pelas unidades da pessoa (e pela unidade escolhida); a trava de arquivo segue o filtro', () => {
  const a = amb();
  const html = (doc) => a.arquivos[doc.htmlUrl.split('/').pop()].bytes.toString('utf8');
  // Solicitante: só a unidade Centro
  const rs = a.pcl('s_sonia.alfa', 'relatorioPeriodo', { periodo: 90 });
  assert.equal(rs.ok, true, rs.message);
  const hs = html(rs.documento);
  assert.match(hs, /CH-2026-0101/); assert.match(hs, /CH-2026-0102/);
  assert.doesNotMatch(hs, /CH-2026-0103|CH-2026-0105/, 'nada da Filial');
  assert.doesNotMatch(hs, /CH-2026-0107|CLINICA TESTE BETA/, 'nada de outro cliente');
  assert.match(hs, /unidade Unidade Centro/);
  const regS = a.lin('REP_DOCUMENTOS').find((x) => x.ID === rs.documento.id);
  assert.equal(regS.UNIDADES_JSON, '["un1"]'); assert.equal(regS.UNIDADE_ID, 'un1'); assert.equal(regS.PUBLICO, 'CLIENTE'); assert.equal(regS.GERADO_POR_LADO, 'CLIENTE');
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'RELATORIO_PERIODO' && x.USUARIO_ID === 'u_sol'));
  // Gestor: todas as unidades; e só a Filial quando escolhe
  const rg = a.pcl('s_cliente.alfa', 'relatorioPeriodo', { periodo: 90 });
  assert.equal(rg.ok, true, rg.message);
  const hg = html(rg.documento);
  assert.match(hg, /CH-2026-0103/); assert.match(hg, /CH-2026-0101/);
  assert.equal(a.lin('REP_DOCUMENTOS').find((x) => x.ID === rg.documento.id).UNIDADES_JSON || '', '', 'sem filtro, nada gravado');
  const rf = a.pcl('s_cliente.alfa', 'relatorioPeriodo', { periodo: 30, unidadeId: 'un1b' });
  assert.equal(rf.ok, true, rf.message);
  assert.doesNotMatch(html(rf.documento), /CH-2026-0101/); assert.match(html(rf.documento), /CH-2026-0103/);
  // trava da rota /arquivos: o Solicitante abre o dele e não abre o de todas as unidades nem o da Filial; o Gestor abre todos
  const id = (d, k) => d[k].split('/').pop();
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', id(rs.documento, 'pdfUrl')), true);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', id(rg.documento, 'pdfUrl')), false);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', id(rf.documento, 'htmlUrl')), false);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.alfa', id(rs.documento, 'pdfUrl')), true);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.beta', id(rs.documento, 'pdfUrl')), false, 'outro cliente nunca');
  // a lista "Relatórios do período já gerados": a Solicitante vê só o dela
  const li = a.ind('s_sonia.alfa').relatorios;
  assert.deepEqual(li.map((x) => x.numero), [rs.documento.numero]);
  assert.equal(a.ind('s_cliente.alfa').relatorios.length, 3);
  // "Meus chamados" (Assistência): o mesmo relatório filtrado para a Solicitante; "Relatórios gerados" mostra o dela e não o do Gestor
  const mc = j(a.api('s_sonia.alfa', 'relatorioPeriodoCliente', { dias: 90 }));
  assert.equal(mc.ok, true, mc.message);
  assert.doesNotMatch(html(mc.documento), /CH-2026-0103/);
  const dg = j(a.api('s_sonia.alfa', 'documentosGerados', {}));
  assert.ok(dg.documentos.some((d) => d.id === mc.documento.id)); assert.ok(!dg.documentos.some((d) => d.id === rg.documento.id));
  // unidade de outro cliente pelo caminho antigo: inexistente
  assert.match(j(a.api('s_sonia.alfa', 'relatorioPeriodoCliente', { dias: 90, unidadeId: 'un2' })).message, /Não encontrado/);
  assert.match(j(a.api('s_cliente.alfa', 'relatorioPeriodoCliente', { dias: 90, unidadeId: 'un2' })).message, /Não encontrado/);
});

test('T5.4: o uso do portal conta entradas, convites, documentos abertos, pedidos, aceite, avisos e contas paradas (caixa PORTAL_CLIENTE_USO_VER)', () => {
  const a = amb();
  const r = a.pcl('s_gil', 'uso', { periodo: 90, atualizar: true });
  assert.equal(r.ok, true, r.message);
  const c1 = r.clientes.find((c) => c.id === 'c1'), c2 = r.clientes.find((c) => c.id === 'c2');
  assert.ok(c1 && c2);
  assert.equal(c1.contasAtivas, 5);
  assert.deepEqual(c1.porPapel, { GESTOR: 0, SOLICITANTE: 2, CONSULTA: 2, NAO_REVISADO: 1 });
  assert.equal(c1.convitesPendentes, 1, 'Nina, dentro da validade'); assert.equal(c1.convitesVencidos, 1, 'Vito, vencido');
  assert.equal(c1.entradas30, 2, 'Sonia em 16/10 e 01/10; a de 09/09 passou dos 30 dias');
  assert.equal(c1.ultimaEntrada, '16/10/2026 09:00');
  assert.equal(c1.docsAbertos, 3, 'três no período de 90 dias; o de maio não');
  assert.equal(c1.recusas, 1);
  assert.equal(c1.pedidosPortal, 2); assert.equal(c1.pedidosTotal, 6, 'solA e solF (portal), chB, chE e chH (telefone; o cancelado foi pedido), chC (e-mail); a preventiva do contrato, o chamado do pedido e o de junho não contam');
  assert.equal(c1.pctPortalTxt, '33,3%');
  assert.equal(c1.aceiteTxt, '1,0 h úteis', 'solA: sex 16:00 -> seg 08:00 = 90 min úteis, menos 30 de pausa');
  assert.equal(c1.avisosEnviados, 2); assert.equal(c1.avisosFalharam, 1); assert.equal(c1.emailsInvalidos, 1);
  assert.equal(c1.semEntrada, 1, 'Celia, sem entrar desde 01/06');
  assert.equal(c2.entradas30, 1); assert.equal(c2.avisosEnviados, 1); assert.equal(c2.pctPortalTxt, '50,0%', 'solZ pelo portal e chI por telefone');
  assert.ok(r.como.length >= 8 && r.como.every((x) => x[1].length > 30), 'cada coluna com "como é contado"');
  semNaN(r, 'uso');
  // detalhe do cliente: as pessoas, os avisos enviados e a falha
  const d = a.pcl('s_gil', 'uso', { periodo: 90, clienteId: 'c1' }).detalhe;
  const sonia = d.contas.find((x) => x.id === 'u_sol');
  assert.equal(sonia.entradas30, 2); assert.equal(sonia.docsAbertos, 1);
  assert.equal(d.contas.find((x) => x.id === 'u_con').parada, true);
  assert.equal(d.contas.find((x) => x.id === 'u_venc').emailOk, false);
  assert.deepEqual(d.avisos.map((x) => x.evento), ['PC05', 'PC03']);
  assert.equal(d.falhas.length, 1); assert.match(d.falhas[0].motivo, /recusado/);
  // linha do tempo da pessoa, com IP e navegador (só a equipe)
  const p = a.pcl('s_gil', 'usoPessoa', { usuarioId: 'u_sol' });
  assert.equal(p.ok, true, p.message);
  assert.ok(p.linhas.length >= 5); assert.ok(p.linhas.every((l) => l.ip === IP || l.ip === ''));
  assert.ok(p.linhas.some((l) => l.em === '17/10/2026 10:00' && l.acao === 'ESCOPO_RECUSADO' && l.ip === IP && l.navegador === NAV));
  assert.equal(a.pcl('s_gil', 'usoPessoa', { usuarioId: 'u_tec' }).codigo, 'NAO_ENCONTRADO', 'conta da equipe não é linha do tempo de cliente');
  // caixa: o técnico não tem; a conta de cliente nunca chama ação interna; o iniciar diz quem vê a aba
  const t = a.pcl('s_tiago', 'uso', {});
  assert.equal(t.ok, false); assert.equal(t.codigo, 'SEM_PERMISSAO'); assert.match(t.message, /«Ver o uso do portal e o registro de acessos».*Por quê: .*O que fazer: /);
  assert.equal(a.pcl('s_cliente.alfa', 'uso', {}).codigo, 'NAO_PERMITIDO');
  assert.equal(a.pcl('s_cliente.alfa', 'usoPessoa', { usuarioId: 'u_sol' }).codigo, 'NAO_PERMITIDO');
  assert.equal(a.pcl('s_gil', 'iniciar', {}).usoVer, true); assert.equal(a.pcl('s_dora', 'iniciar', {}).usoVer, true); assert.equal(a.pcl('s_tiago', 'iniciar', {}).usoVer, false);
  const cx = a.ctx.PCL_PODERES_ITENS.find((x) => x[0] === 'PORTAL_CLIENTE_USO_VER');
  assert.ok(cx); assert.equal(cx[1], 'Portal do cliente');
  // o cache de 2 minutos não esconde mudança quando se pede "Atualizar agora"
  a.tabelas.PCL_ACESSOS.push({ ID: 'ac10', CLIENTE_ID: 'c1', USUARIO_ID: 'u_sol', ACAO: 'DOCUMENTO_ABERTO', EM: '2026-10-19T09:00:00' });
  assert.equal(a.pcl('s_gil', 'uso', { periodo: 90 }).clientes.find((c) => c.id === 'c1').docsAbertos, 3, 'do cache');
  assert.equal(a.pcl('s_gil', 'uso', { periodo: 90, atualizar: true }).clientes.find((c) => c.id === 'c1').docsAbertos, 4);
});

test('T5.5: o Gestor do cliente não vê IP nem navegador (equipe, indicadores e relatório); a equipe vê', () => {
  const a = amb();
  const procurar = (o) => { const s = JSON.stringify(o); return s.indexOf(IP) >= 0 || s.indexOf('Chrome/130 Teste') >= 0 || /"(ip|IP|navegador|NAVEGADOR)"\s*:/.test(s); };
  const eq = a.pcl('s_cliente.alfa', 'equipe', {});
  assert.equal(eq.ok, true, eq.message);
  assert.ok(eq.registro.length >= 5, 'o registro da empresa aparece');
  assert.equal(procurar(eq), false, 'IP ou navegador no registro da empresa');
  assert.equal(procurar(a.ind('s_cliente.alfa')), false, 'IP ou navegador nos indicadores');
  assert.equal(procurar(a.ind('s_sonia.alfa')), false);
  assert.equal(procurar(a.pcl('s_cliente.alfa', 'relatorioPeriodo', {})), false);
  assert.equal(procurar(a.pcl('s_gil', 'usoPessoa', { usuarioId: 'u_sol' })), true, 'a equipe vê o IP');
  // o Solicitante não abre "Minha equipe"
  assert.equal(a.pcl('s_sonia.alfa', 'equipe', {}).codigo, 'PAPEL');
});

test('Portão de funções, desempenho e cache', () => {
  const a = amb();
  assert.ok(a.ctx.PCL_FUNCOES_CLIENTE.indexOf('PortalCliente_api') >= 0, 'a tela do cliente só chama PortalCliente_api, que está na lista fechada');
  assert.equal(a.ctx.PCL_ACOES_CLIENTE.indicadores, true); assert.equal(a.ctx.PCL_ACOES_CLIENTE.relatorioPeriodo, true);
  assert.equal(a.ctx.PCL_ACOES_INTERNAS.uso, 'PORTAL_CLIENTE_USO_VER'); assert.equal(a.ctx.PCL_ACOES_INTERNAS.usoPessoa, 'PORTAL_CLIENTE_USO_VER');
  // cliente grande: 4.000 chamados, 3.000 pedidos, 1.500 equipamentos e 20.000 registros de acesso
  for (let i = 0; i < 4000; i++) a.tabelas.ATEC_CHAMADOS.push(ch({ ID: 'cg' + i, NUMERO: 'CH-G-' + i, SITUACAO: i % 3 ? 'ENCERRADO' : 'AGENDADO', CLIENTE_ID: 'c1', UNIDADE_ID: i % 2 ? 'un1' : 'un1b', EQUIPAMENTO_ID: 'eg' + (i % 1500),
    ABERTO_EM: '2026-0' + (7 + (i % 3)) + '-1' + (i % 9) + 'T09:00:00', ATENDIDO_EM: '2026-0' + (7 + (i % 3)) + '-2' + (i % 8) + 'T10:00:00', SLA_FONTE: i % 2 ? 'CONTRATO' : 'PADRAO', SLA_MIN_UTEIS: 1200 }));
  for (let i = 0; i < 3000; i++) a.tabelas.ATEC_SOLICITACOES.push({ ID: 'sg' + i, ORIGEM: i % 2 ? 'PORTAL' : 'EMAIL', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', SITUACAO: 'CONVERTIDA', CRIADO_EM: '2026-09-1' + (i % 9) + 'T09:00:00', TRATADA_EM: '2026-09-2' + (i % 9) + 'T09:00:00' });
  for (let i = 0; i < 1500; i++) a.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eg' + i, CLIENTE_ID: 'c1', UNIDADE_ID: i % 2 ? 'un1' : 'un1b', TIPO: 'Autoclave', TAG: 'G-' + i, STATUS: 'ATIVO' });
  for (let i = 0; i < 20000; i++) a.tabelas.PCL_ACESSOS.push({ ID: 'ag' + i, CLIENTE_ID: 'c1', USUARIO_ID: 'u_sol', ACAO: i % 4 ? 'DOCUMENTO_ABERTO' : 'ENTRADA', EM: '2026-10-0' + (1 + (i % 9)) + 'T09:00:00', IP: IP });
  let t0 = Date.now ? process.hrtime.bigint() : 0n;
  const r = a.ind('s_cliente.alfa');
  const ms1 = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(r.ok, true, r.message); semNaN(r, 'cliente grande');
  t0 = process.hrtime.bigint(); a.pcl('s_cliente.alfa', 'indicadores', {}); const ms2 = Number(process.hrtime.bigint() - t0) / 1e6;
  t0 = process.hrtime.bigint(); const u = a.pcl('s_gil', 'uso', { atualizar: true }); const ms3 = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(u.ok, true, u.message);
  if (process.env.PCLP_TEMPOS) console.log('indicadores ' + ms1.toFixed(0) + ' ms; com cache ' + ms2.toFixed(0) + ' ms; uso ' + ms3.toFixed(0) + ' ms');
  assert.ok(ms1 < 8000, 'indicadores de um cliente grande em ' + ms1 + ' ms');
  assert.ok(ms2 < ms1, 'a segunda chamada vem do cache');
  assert.ok(ms3 < 8000, 'uso do portal em ' + ms3 + ' ms');
});

test('Tela, ajuda e manual', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html'), tela = ler('JS_PortalCliente_Painel.html'), aj = ler('JS_PortalCliente_Ajuda.html'), int = ler('JS_PortalCliente.html'), cli = ler('JS_PortalCliente_Acessos.html');
  assert.match(idx, /id="menu-btn-portal_cliente_indicadores"/); assert.match(idx, /id="menu-btn-portal_cliente_uso"/); assert.match(idx, /include\('JS_PortalCliente_Painel'\)/);
  assert.match(core, /mod === "portal_cliente_indicadores" && typeof PclP_render_/); assert.match(core, /PortalCli_render_\("uso"\)/); assert.match(core, /portal_cliente_indicadores: "Indicadores"/);
  assert.match(int, /\["uso", "Uso do portal"\]/); assert.match(int, /PclPI_clique_/); assert.match(cli, /menu-btn-portal_cliente_indicadores/);
  assert.match(tela, /Como é contado:/); assert.match(tela, /Relatório do período \(PDF\)/); assert.match(tela, /Ver no Kanban e no Gantt/); assert.match(tela, /Baixar planilha \(CSV\)/);
  assert.doesNotMatch(tela, /window\.(alert|confirm|prompt)\(/);
  ['pclIndPeriodo', 'pclIndUnidade', 'pclUsoPeriodo', 'pclUsoBusca'].forEach((k) => { assert.match(tela, new RegExp('id="' + k + '"')); assert.match(aj, new RegExp('\\b' + k + ': \'')); });
  assert.match(aj, /pclIndPeriodo: 'Período: os indicadores contam os chamados concluídos neste período; os abertos aparecem sempre\.'/, 'texto da espec (4.1.8)');
  assert.match(aj, /\bindicadores: \['/); assert.match(aj, /\buso: \['/);
  const a = amb();
  vm.runInContext(ler('SGO_Ajuda_PortalCliente.js'), a.ctx, { filename: 'SGO_Ajuda_PortalCliente.js' });
  const telas = a.ctx.SGO_ajudaTelas_PortalCliente_();
  assert.ok(telas && telas.portal_cliente_indicadores && telas.portal_cliente_uso);
  assert.ok(!/Administra|caixa|Diretoria/.test(JSON.stringify(telas.portal_cliente_indicadores)), 'ajuda do cliente sem recurso administrativo');
  assert.match(ler('SGO_Ajuda.js'), /portal_cliente_indicadores: 'Indicadores'/); assert.match(ler('SGO_Ajuda.js'), /portal_cliente_uso: 'Uso do portal'/);
  assert.match(ler('SGO_AssistenteErros.js'), /JS_PortalCliente_Painel: 'portal_cliente_indicadores'/);
  const man = lerDoc('MANUAL_MODULO_PORTAL_CLIENTE.md');
  assert.match(man, /## 27\. Indicadores e uso do portal \(etapa 5, 18\/11\/2026\)/);
  ['PORTAL_CLIENTE_USO_VER', 'Como é contado', 'UNIDADES_JSON', 'h úteis', 'Reincidência'].forEach((t) => assert.ok(man.indexOf(t) >= 0, 'manual sem ' + t));
  assert.match(ler('SGO_AssistenteManuais.js'), /Indicadores e uso do portal/, 'base do assistente regerada');
});
