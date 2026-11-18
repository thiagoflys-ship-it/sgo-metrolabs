// 17/11/2026 — Documentos organizados por pasta (pedido da Priscilla, repassado pelo dono): QR Code / prontuário do equipamento,
// ficha do cliente nos Cadastros, Portal do cliente e "Documentos gerados e envios" com as mesmas pastas, num ponto central
// (SGO_DocumentosPastas.js). Código real (SGO_Auth.js, SGO_PortalCliente*.js, cadastros, SGO_QualifEmissao.js, SGO_QualifEquipamento.js,
// SGO_DocRevisao.js, SGO_PgtPop_*.js, SGO_EnviarDoc.js, SGO_DocumentosPastas.js) num vm, com planilha e propriedades simuladas.
// Confere: classificação dos tipos reais de todos os módulos; prontuário com as pastas (PGT e POP da unidade, O.S., qualificação,
// certificados, NR-13); ficha agrupada sem repetição e sem perder documento (versões anteriores guardadas); a conta de cliente só
// vê o que é liberado a ela e nada de outro cliente; a trava de arquivo; a contagem por equipamento (o "0 documento(s)").
// Telas reais a 390/320 px (prontuário), 1366 px (ficha do cliente) e a visão do cliente, com capturas para o dono conferir.
// Só dados de teste. Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/documentos-pastas-20261117.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_usuarios_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const j = (x) => JSON.parse(JSON.stringify(x));
const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 Teste', aparelho: '' };
const hoje = new Date();
const dia = (n) => new Date(hoje.getTime() + n * 86400000).toISOString().slice(0, 10);
const br = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const PRI = { ID: 'u-pri', USUARIO: 'priscilla', SENHA: 'Pri2026xyz', NOME: 'PRISCILLA GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'pri@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
const COM = { ID: 'u-com', USUARIO: 'vera', SENHA: 'Vera2026xx', NOME: 'VERA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test' };
const CLIA = { ID: 'u-cla', USUARIO: 'carla', SENHA: 'Cliente2026x', NOME: 'CARLA CLIENTE A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospital-a.test', CLIENTE_ID: 'cA' };
const CLIB = { ID: 'u-clb', USUARIO: 'bia', SENHA: 'Cliente2026y', NOME: 'BIA CLIENTE B TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'bia@hospital-b.test', CLIENTE_ID: 'cB' };

function aba(a, nome, cab, linhas) { a.abas.set(nome, { cab: cab.slice(), linhas: (linhas || []).map((o) => cab.map((c) => (o[c] === undefined ? '' : o[c]))) }); }
const CNPJ_A = '11222333000181', CNPJ_A2 = '11222333000262', CNPJ_B = '22333444000172';

function amb(opcoes) {
  opcoes = opcoes || {};
  const a = ambiente();
  [ADMIN, PRI, TEC, COM, CLIA, CLIB].forEach((u) => a.add(Object.assign({}, u)));
  a.abas.get('CAD_USUARIOS').cab.push('AREA');
  aba(a, 'CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'RAZAO_SOCIAL', 'CNPJ', 'STATUS'], [
    { ID: 'cA', NOME_FANTASIA: 'HOSPITAL SANTA TESTE', RAZAO_SOCIAL: 'HOSPITAL SANTA TESTE LTDA', CNPJ: CNPJ_A, STATUS: 'ATIVO' },
    { ID: 'cB', NOME_FANTASIA: 'HOSPITAL B TESTE', RAZAO_SOCIAL: 'HOSPITAL B LTDA', CNPJ: CNPJ_B, STATUS: 'ATIVO' }]);
  aba(a, 'CAD_UNIDADES', ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'CNPJ_UNIDADE', 'CIDADE', 'UF', 'STATUS'], [
    { ID: 'uA1', CLIENTE_ID: 'cA', NOME_UNIDADE: 'MATRIZ', CNPJ_UNIDADE: CNPJ_A, CIDADE: 'GOIANIA', UF: 'GO', STATUS: 'ATIVO' },
    { ID: 'uA2', CLIENTE_ID: 'cA', NOME_UNIDADE: 'FILIAL NORTE', CNPJ_UNIDADE: CNPJ_A2, CIDADE: 'ANAPOLIS', UF: 'GO', STATUS: 'ATIVO' },
    { ID: 'uB1', CLIENTE_ID: 'cB', NOME_UNIDADE: 'B UNICA', CNPJ_UNIDADE: CNPJ_B, CIDADE: 'CAMPINAS', UF: 'SP', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_EQUIPAMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TIPO', 'FABRICANTE', 'MODELO', 'SERIE', 'TAG', 'SETOR', 'STATUS', 'QR_TOKEN'], [
    { ID: 'eA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'AUTOCLAVE', FABRICANTE: 'FAB', MODELO: 'M1', SERIE: 'S1', TAG: 'AC-01', SETOR: 'CME', STATUS: 'ATIVO', QR_TOKEN: 'tok' },
    { ID: 'eA2', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'LAVADORA TERMODESINFECTORA', TAG: 'LV-01', STATUS: 'ATIVO' },
    { ID: 'eA3', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', TIPO: 'TERMOMETRO', TAG: 'TER-01', STATUS: 'ATIVO' },
    { ID: 'eA4', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', TIPO: 'VASO DE PRESSAO', TAG: 'VP-01', STATUS: 'ATIVO' },
    { ID: 'eB1', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', TIPO: 'AUTOCLAVE', TAG: 'AC-B1', STATUS: 'ATIVO' }]);
  aba(a, 'DOC_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK_ARQUIVO', 'DATA_EMISSAO', 'DATA_VENCIMENTO', 'STATUS', 'CRIADO_EM'], [
    // o certificado que o CertCal registra (sem vencimento), duas vezes com o MESMO arquivo (o print da Priscilla)
    { ID: 'd1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', EQUIPAMENTO_ID: 'eA3', TIPO_DOCUMENTO: 'CERTIFICADO DE CALIBRACAO', NOME_ARQUIVO: 'CERTIFICADO DE CALIBRACAO - 202600258 - TER-01.PDF', LINK_ARQUIVO: 'https://sgo.metrolabs.com.br/arquivos/certTer01aaa', STATUS: 'ATIVO', CRIADO_EM: '2026-10-02T10:00:00' },
    { ID: 'd2', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', EQUIPAMENTO_ID: 'eA3', TIPO_DOCUMENTO: 'CERTIFICADO DE CALIBRACAO', NOME_ARQUIVO: 'CERTIFICADO DE CALIBRACAO - 202600258 - TER-01.PDF', LINK_ARQUIVO: 'https://sgo.metrolabs.com.br/arquivos/certTer01aaa', STATUS: 'ATIVO', CRIADO_EM: '2026-10-02T10:05:00' },
    // mesmo nome, arquivo novo (reenvio): vira versão anterior, não some
    { ID: 'd3', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', TIPO_DOCUMENTO: '1. Relatórios de Manutenção', NOME_ARQUIVO: 'Relatorio preventiva AC-01.pdf', LINK_ARQUIVO: '/arquivos/manutAntiga01', STATUS: 'ATIVO', CRIADO_EM: '2026-06-01T09:00:00' },
    { ID: 'd4', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', TIPO_DOCUMENTO: '1. Relatórios de Manutenção', NOME_ARQUIVO: 'Relatorio preventiva AC-01.pdf', LINK_ARQUIVO: '/arquivos/manutNova0002', STATUS: 'ATIVO', CRIADO_EM: '2026-11-01T09:00:00' },
    { ID: 'd5', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: '5. Contratos', NOME_ARQUIVO: 'Contrato assinado 2026.pdf', LINK_ARQUIVO: '/arquivos/contratoDoc01', STATUS: 'ATIVO', CRIADO_EM: '2026-01-10T09:00:00' },
    { ID: 'd6', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', TIPO_DOCUMENTO: 'Outros Documentos', NOME_ARQUIVO: 'foto da placa.jpg', LINK_ARQUIVO: '/arquivos/fotoPlaca001', STATUS: 'INATIVO', CRIADO_EM: '2026-03-10T09:00:00' },
    { ID: 'dB', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', EQUIPAMENTO_ID: 'eB1', TIPO_DOCUMENTO: '2. Certificados de Calibração', NOME_ARQUIVO: 'CERT B', LINK_ARQUIVO: '/arquivos/certClienteB1', STATUS: 'ATIVO', CRIADO_EM: '2026-11-02T10:00:00' }]);
  aba(a, 'CERT_CALIBRACAO', ['ID', 'NUMERO_CERTIFICADO', 'CLIENTE_ID', 'EQUIPAMENTO_ID', 'DATA_CALIBRACAO', 'DATA_EMISSAO', 'DATA_VALIDADE', 'LINK_PDF_CERTIFICADO', 'STATUS', 'CRIADO_EM'], [
    { ID: 'cc1', NUMERO_CERTIFICADO: '202600258', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA3', DATA_EMISSAO: '2026-10-02', DATA_VALIDADE: dia(12), LINK_PDF_CERTIFICADO: 'https://sgo.metrolabs.com.br/arquivos/certTer01aaa', STATUS: 'ATIVO' },
    { ID: 'cc2', NUMERO_CERTIFICADO: '202600301', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA1', DATA_EMISSAO: '2025-09-01', DATA_VALIDADE: dia(-20), LINK_PDF_CERTIFICADO: '/arquivos/certAc01soCert', STATUS: 'ATIVO' },
    { ID: 'ccB', NUMERO_CERTIFICADO: '202600400', CLIENTE_ID: 'cB', EQUIPAMENTO_ID: 'eB1', DATA_EMISSAO: '2026-10-05', DATA_VALIDADE: dia(200), LINK_PDF_CERTIFICADO: '/arquivos/certSoDoB0001', STATUS: 'ATIVO' }]);
  aba(a, 'NR13_LAUDOS', ['ID', 'NUMERO_LAUDO', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'DATA_PROXIMA_INSPECAO', 'STATUS', 'LINK_PDF', 'CRIADO_EM'], [
    { ID: 'n1', NUMERO_LAUDO: 'NR13-2026-0007', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', EQUIPAMENTO_ID: 'eA4', DATA_PROXIMA_INSPECAO: dia(400), STATUS: 'EMITIDO', LINK_PDF: '/arquivos/laudoNr13vp01', CRIADO_EM: '2026-09-01T10:00:00' },
    { ID: 'n2', NUMERO_LAUDO: 'NR13-2026-0009', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', EQUIPAMENTO_ID: 'eA4', STATUS: 'RASCUNHO', LINK_PDF: '/arquivos/rascunhoNr13' }]);
  aba(a, 'ATEC_OS', ['ID', 'NUMERO', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'SITUACAO', 'TIPO_NOME', 'RELATORIO_PDF_ID', 'RELATORIO_PDF_URL', 'RELATORIO_EM', 'EXCLUIDO_EM'], [
    { ID: 'os1', NUMERO: 'OS-2026-0032', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', SITUACAO: 'ENCERRADA', TIPO_NOME: 'Manutenção corretiva', RELATORIO_PDF_ID: 'relOs0032pdf', RELATORIO_PDF_URL: '/arquivos/relOs0032pdf', RELATORIO_EM: '2026-11-13T15:00:00' },
    { ID: 'os2', NUMERO: 'OS-2026-0040', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', SITUACAO: 'EM_EXECUCAO', RELATORIO_PDF_ID: 'relOsRascunho' }]);
  aba(a, 'ATEC_RELATORIOS', ['ID', 'OS_ID', 'OS_NUMERO', 'VERSAO', 'REVISAO', 'RASCUNHO', 'PDF_ID', 'EMITIDO_EM', 'MOTIVO'], [
    { ID: 'r1', OS_ID: 'os1', OS_NUMERO: 'OS-2026-0032', VERSAO: '1', REVISAO: '0', RASCUNHO: '', PDF_ID: 'relOs0032rev0', EMITIDO_EM: '2026-11-12T15:00:00' },
    { ID: 'r2', OS_ID: 'os1', OS_NUMERO: 'OS-2026-0032', VERSAO: '2', REVISAO: '1', RASCUNHO: '', PDF_ID: 'relOs0032pdf', EMITIDO_EM: '2026-11-13T15:00:00' }]);
  aba(a, 'REP_DOCUMENTOS', ['ID', 'TIPO', 'PUBLICO', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'NUMERO', 'VERSAO', 'HTML_ID', 'PDF_ID', 'EM', 'DESLIGADO_EM'], [
    { ID: 'rp1', TIPO: 'RELATORIO_ATENDIMENTO', PUBLICO: 'CLIENTE', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA2', NUMERO: 'CH-2026-0030', VERSAO: '1', PDF_ID: 'repCliPdf001', EM: '2026-11-16T22:00:00' },
    { ID: 'rp2', TIPO: 'RELATORIO_ATENDIMENTO', PUBLICO: 'INTERNO', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA2', NUMERO: 'CH-2026-0030', VERSAO: '1', PDF_ID: 'repIntPdf001', EM: '2026-11-16T22:00:00' }]);
  aba(a, 'CLI_CONTRATOS', ['ID', 'CLIENTE_ID', 'NUMERO', 'SITUACAO', 'ARQUIVO_ID', 'VERSAO', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'PARTE_TIPO', 'CRIADO_EM'], [
    { ID: 'ct1', CLIENTE_ID: 'cA', NUMERO: 'CT-2026-01', SITUACAO: 'VIGENTE', ARQUIVO_ID: 'contratoPdfAss', VERSAO: '1', VIGENCIA_INICIO: '2026-01-01', VIGENCIA_FIM: '2026-12-31', CRIADO_EM: '2026-01-05T10:00:00' }]);
  a.ctx.SGO_CFG.SHEETS.CAD_UNIDADES = 'CAD_UNIDADES';
  a.ctx.SGO_CFG.SHEETS.CAD_EQUIPAMENTOS = 'CAD_EQUIPAMENTOS';
  a.ctx.SGO_CFG.SHEETS.DOC_DOCUMENTOS = 'DOC_DOCUMENTOS';
  a.ctx.SGO_CFG.SHEETS.CERT_CALIBRACAO = 'CERT_CALIBRACAO';
  a.ctx.SGO_DATA.getByField = () => null;
  a.ctx.Session = { getScriptTimeZone: () => 'America/Sao_Paulo' };
  a.logs = [];
  a.ctx.SGO_DATA.log = (...x) => { a.logs.push(x); return true; };
  for (const f of ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente.js', 'SGO_Equipamentos.js', 'SGO_Documentos.js',
    'SGO_Unidades.js', 'SGO_Clientes.js', 'SGO_CadastrosPainel.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Config.js',
    'SGO_QualifEmissao.js', 'SGO_QualifEquipamento.js', 'SGO_DocRevisao.js', 'SGO_PgtPop_Config.js', 'SGO_PgtPop_Main.js', 'SGO_EnviarDoc.js', 'SGO_QRCode.js', 'SGO_DocumentosPastas.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  // QUALIF_EMISSOES (autoclave: qualificação Rev. 00 substituída pela Rev. 01, minuta, relatório de ensaio de ciclo; lavadora sem equipamento ligado)
  aba(a, 'QUALIF_EMISSOES', a.ctx.SGO_QE_CAMPOS, [
    { ID: 'q1', MODULO: 'AUTOCLAVE_OFICIAL', STATUS: 'SUBSTITUIDO', NUMERO: 'QA-2026-0011', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', CNPJ: CNPJ_A, APROVADO_EM: '2026-08-10T10:00:00', PDF_ID: 'qualAc01rev0', VALIDADE_ATE: '2027-08-10' },
    { ID: 'q2', MODULO: 'AUTOCLAVE_OFICIAL', STATUS: 'EMITIDO', NUMERO: 'QA-2026-0011', REVISAO: '1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', CNPJ: CNPJ_A, APROVADO_EM: '2026-08-20T10:00:00', PDF_ID: 'qualAc01rev1', VALIDADE_ATE: dia(25) },
    { ID: 'q3', MODULO: 'AUTOCLAVE_OFICIAL', STATUS: 'AGUARDANDO_APROVACAO', NUMERO: 'QA-2026-0020', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', ENVIADO_EM: '2026-11-15T10:00:00', PDF_ID: 'minutaAc01' },
    { ID: 'q4', MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'EA-2026-0031', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', APROVADO_EM: '2026-08-05T10:00:00', PDF_ID: 'ensaioAc01' },
    { ID: 'q5', MODULO: 'LAVADORA_OFICIAL', STATUS: 'EMITIDO', NUMERO: 'QL-2026-0002', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: '', EQUIPAMENTO_ID: 'eA2', APROVADO_EM: '2026-10-20T10:00:00', PDF_ID: 'qualLv01', VALIDADE_ATE: dia(330) },
    { ID: 'q6', MODULO: 'AUTOCLAVE_OFICIAL', STATUS: 'EMITIDO', NUMERO: 'QA-2026-0099', REVISAO: '0', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', EQUIPAMENTO_ID: 'eB1', APROVADO_EM: '2026-10-20T10:00:00', PDF_ID: 'qualSoDoB01', VALIDADE_ATE: dia(330) }]);
  // DOC_REVISOES: PGT/POP pelo CNPJ da unidade (um da geração revisada, um suspenso), declaração de execução, registro operacional
  aba(a, 'DOC_REVISOES', a.ctx.SGO_DOCREV_CAMPOS, [
    { ID: 'v1', MODULO: 'PGT_POP', NUMERO: 'PGTS', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-15T09:00:00', TITULO: 'PGT - Plano de Gerenciamento das Tecnologias em Saúde', CLIENTE: 'HOSPITAL SANTA TESTE', CNPJ: CNPJ_A, PDF_ID: 'pgtsNovo0001' },
    { ID: 'v2', MODULO: 'PGT_POP', NUMERO: 'POP008', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-15T09:10:00', TITULO: 'POP008 - Operação da autoclave a vapor', CNPJ: CNPJ_A, PDF_ID: 'pop008Novo01' },
    { ID: 'v3', MODULO: 'PGT_POP', NUMERO: 'POP001', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-10T09:00:00', TITULO: 'POP001 - Recepção de materiais', CNPJ: CNPJ_A, PDF_ID: 'pop001Velho1' },
    { ID: 'v4', MODULO: 'DECLARACAO_EXECUCAO', NUMERO: 'DE-2026-0005', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-10-01T09:00:00', TITULO: '', CNPJ: CNPJ_A2, PDF_ID: 'declExec0005' },
    { ID: 'v5', MODULO: 'REGISTROS_OPERACIONAIS', NUMERO: 'RO-0003', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-01T09:00:00', TITULO: 'Registro diário do teste de Bowie-Dick', CNPJ: CNPJ_A, PDF_ID: 'regOpBowie01' },
    { ID: 'v6', MODULO: 'PGT_POP', NUMERO: 'POP002', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-15T09:00:00', TITULO: 'POP002 do B', CNPJ: CNPJ_B, PDF_ID: 'popDoB00001' }]);
  // lista própria do PGT/POP (planilha do módulo): POP028 em duas versões
  a.props.set('PGTPOP_DB_ID', 'planilha-pgtpop');
  aba(a, 'MOV_DOCUMENTOS', ['ID', 'DATA', 'HOSPITAL', 'CNPJ', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'URL', 'REGISTRO_ID'], [
    { ID: 'm1', DATA: '15/11/2026 10:00:00', HOSPITAL: 'HOSPITAL SANTA TESTE', CNPJ: CNPJ_A, TIPO_DOCUMENTO: 'POP', NOME_ARQUIVO: 'POP028_v1.pdf', URL: '/arquivos/pop028versao1' },
    { ID: 'm2', DATA: '16/11/2026 10:00:00', HOSPITAL: 'HOSPITAL SANTA TESTE', CNPJ: CNPJ_A, TIPO_DOCUMENTO: 'POP', NOME_ARQUIVO: 'POP028_v2.pdf', URL: '/arquivos/pop028versao2' },
    { ID: 'm3', DATA: '15/11/2026 09:10:00', HOSPITAL: 'HOSPITAL SANTA TESTE', CNPJ: CNPJ_A, TIPO_DOCUMENTO: 'POP', NOME_ARQUIVO: 'POP008.pdf', URL: '/arquivos/pop008Novo01' }]);
  if (opcoes.cfg) a.props.set('DOCP_CFG', JSON.stringify(opcoes.cfg));
  const s = (u) => { const r = a.ctx.login(u.EMAIL, u.SENHA, CTX); assert.equal(r.success, true, u.EMAIL + ': ' + r.message); return r.sessionId; };
  a.sAdm = s(ADMIN); a.sPri = s(PRI); a.sTec = s(TEC); a.sCom = s(COM); a.sA = s(CLIA); a.sB = s(CLIB);
  a.docs = (sid, escopo, id, via) => j(a.ctx.documentosPastas(sid, { escopo, id, via }));
  a.pasta = (r, id) => r.pastas.find((p) => p.id === id);
  a.todos = (r) => r.pastas.flatMap((p) => p.itens.flatMap((i) => [i].concat(i.anteriores || [])));
  return a;
}

test('classificação única: os tipos reais de todos os módulos caem na pasta certa; sem tipo, pelo nome; senão "Outros"', () => {
  const a = amb();
  const c = (d) => a.ctx.Docs_classificar_(d);
  const casos = [
    [{ tipo: 'CERTIFICADO DE CALIBRACAO' }, 'CALIBRACAO'], [{ tipo: '2. CERTIFICADOS DE CALIBRAÇÃO' }, 'CALIBRACAO'], [{ tipo: 'Relatório de calibração' }, 'CALIBRACAO'],
    [{ tipo: '3. RELATÓRIOS DE QUALIFICAÇÃO' }, 'QUALIFICACAO'], [{ tipo: 'Relatório de qualificação térmica' }, 'QUALIFICACAO'], [{ tipo: 'Relatório de qualificação do esterilizador' }, 'QUALIFICACAO'],
    [{ tipo: 'LAUDO NR13 - VASO DE PRESSAO' }, 'NR13'], [{ tipo: 'Laudo de inspeção NR-13' }, 'NR13'],
    [{ tipo: 'ORDEM DE SERVIÇO' }, 'OS'], [{ tipo: 'RELATÓRIO DE RONDA' }, 'OS'], [{ tipo: 'RELATÓRIO DE ATENDIMENTO' }, 'OS'], [{ tipo: '4. Ordens de Serviço' }, 'OS'], [{ tipo: 'Relatório de atendimento técnico' }, 'OS'],
    [{ tipo: '1. Relatórios de Manutenção' }, 'MANUTENCAO'], [{ tipo: 'Cronograma de execução' }, 'MANUTENCAO'],
    [{ tipo: '5. Contratos' }, 'CONTRATOS'], [{ tipo: 'Proposta comercial' }, 'CONTRATOS'], [{ tipo: 'Orçamento de assistência técnica' }, 'CONTRATOS'],
    [{ tipo: 'PGT / POP' }, 'PGT_POP'], [{ tipo: 'Planejamento técnico do CME' }, 'PGT_POP'], [{ tipo: 'Registro operacional' }, 'REGISTROS'],
    [{ tipo: 'Relatório de ensaio da autoclave' }, 'RELATORIOS_TECNICOS'], [{ tipo: 'Inventário de equipamentos' }, 'RELATORIOS_TECNICOS'],
    [{ tipo: 'Declaração de execução de serviço' }, 'LAUDOS'],
    // documento antigo sem tipo útil: pelo nome do arquivo
    [{ tipo: 'Outros Documentos', nome: 'POP008 - Limpeza da autoclave.pdf' }, 'PGT_POP'], [{ nome: 'POP028_v1.pdf' }, 'PGT_POP'], [{ nome: 'PGTS_HOSPITAL_SANTA.pdf' }, 'PGT_POP'],
    [{ nome: 'OS-2026-0032 relatorio.pdf' }, 'OS'], [{ nome: 'Certificado 202600258.pdf' }, 'CALIBRACAO'],
    [{ nome: 'foto da placa.jpg' }, 'OUTROS'], [{}, 'OUTROS'],
    // pelo módulo que gerou (vale antes do tipo)
    [{ modulo: 'AUTOCLAVE_OFICIAL', tipo: 'Relatório de ensaio' }, 'QUALIFICACAO'], [{ modulo: 'AUTOCLAVE' }, 'RELATORIOS_TECNICOS'], [{ modulo: 'LAVADORA_DADOS' }, 'RELATORIOS_TECNICOS'],
    [{ modulo: 'DECLARACAO_QIQO' }, 'QUALIFICACAO'], [{ modulo: 'CRONOGRAMA_EXECUCAO' }, 'MANUTENCAO'], [{ modulo: 'BAIXA_TEMPERATURA' }, 'QUALIFICACAO']
  ];
  for (const [d, p] of casos) assert.equal(c(d), p, JSON.stringify(d));
  // todo módulo que registra revisão (DOC_REVISOES) e toda pasta de cliente do envio de documentos tem pasta própria (nada cai em "Outros")
  for (const m of Object.keys(a.ctx.SGO_DOCREV_MODULOS)) assert.notEqual(c({ modulo: m }), 'OUTROS', 'módulo ' + m);
  for (const r of a.ctx.ENVDOC_RAIZES.filter((x) => x.classe === 'CLIENTE')) assert.notEqual(c({ tipo: r.tipo }), 'OUTROS', 'pasta de envio ' + r.tipo);
  // configurável: regra extra e nome da pasta (Script Property DOCP_CFG)
  const b = amb({ cfg: { regras: [{ contem: 'FOTO DA PLACA', pasta: 'RELATORIOS_TECNICOS' }], pastas: { PGT_POP: { nome: 'PGT, POP e planejamento' } } } });
  assert.equal(b.ctx.Docs_classificar_({ nome: 'foto da placa.jpg' }), 'RELATORIOS_TECNICOS');
  assert.equal(b.ctx.Docs_cfg_().pastas.PGT_POP.nome, 'PGT, POP e planejamento');
  assert.equal(b.ctx.Docs_cfg_().pastas.CONTRATOS.clienteVe, false, 'pasta interna nunca vai ao cliente');
  // a ordem das pastas é a combinada
  assert.deepEqual(j(a.ctx.DOCP_PASTAS.map((p) => p.id)), ['CALIBRACAO', 'QUALIFICACAO', 'RELATORIOS_TECNICOS', 'OS', 'MANUTENCAO', 'PGT_POP', 'REGISTROS', 'NR13', 'LAUDOS', 'CONTRATOS', 'OUTROS']);
});

test('prontuário pelo QR Code (equipe): pastas com contagem, PGT e POP da unidade, qualificação vigente com a revisão anterior guardada, O.S., sem minuta nem interno', () => {
  const a = amb();
  const r = a.docs(a.sPri, 'equipamento', 'eA1', 'qr');
  assert.equal(r.success, true, r.message);
  assert.deepEqual(r.pastas.map((p) => p.id), ['CALIBRACAO', 'QUALIFICACAO', 'RELATORIOS_TECNICOS', 'OS', 'MANUTENCAO', 'PGT_POP', 'REGISTROS', 'NR13', 'LAUDOS', 'OUTROS'], 'todas as pastas, sem a interna');
  // qualificação: Rev. 01 vigente na frente, Rev. 00 em "versões anteriores", minuta fora
  const q = a.pasta(r, 'QUALIFICACAO');
  assert.equal(q.total, 1);
  assert.match(q.itens[0].titulo, /QA-2026-0011 · Rev\. 01/);
  assert.equal(q.itens[0].venc.s, 'vencendo');
  assert.match(q.itens[0].venc.texto, /^Vence em 25 dias/);
  assert.equal(q.itens[0].anteriores.length, 1);
  assert.equal(q.itens[0].anteriores[0].situacao, 'SUBSTITUIDO');
  assert.ok(!JSON.stringify(r).includes('minutaAc01'), 'minuta nunca no QR');
  // relatório de ensaio de ciclo em Relatórios técnicos
  assert.match(a.pasta(r, 'RELATORIOS_TECNICOS').itens[0].titulo, /ensaio de ciclo/);
  // O.S.: o relatório da O.S. encerrada com a revisão anterior; a O.S. em execução fica fora
  const os = a.pasta(r, 'OS');
  assert.equal(os.total, 1);
  assert.match(os.itens[0].titulo, /OS-2026-0032/);
  assert.equal(os.itens[0].anteriores.length, 1);
  assert.ok(!JSON.stringify(r).includes('relOsRascunho'));
  // certificado vencido
  const cal = a.pasta(r, 'CALIBRACAO');
  assert.equal(cal.itens[0].venc.s, 'vencido');
  assert.equal(r.vencidos >= 1, true);
  // PGT e POP: os da unidade (CNPJ da matriz), marcados "da unidade"; o POP de autoclave vem primeiro (deste tipo de equipamento)
  const pgt = a.pasta(r, 'PGT_POP');
  const titulos = pgt.itens.map((i) => i.titulo);
  assert.ok(titulos.some((t) => /PGT - Plano de Gerenciamento/.test(t)), titulos.join(' | '));
  assert.ok(titulos.some((t) => /POP028/.test(t)), 'POP da lista própria do módulo');
  assert.equal(pgt.itens[0].relacionado, true, 'POP de autoclave primeiro');
  assert.match(pgt.itens[0].titulo, /POP008/);
  assert.ok(pgt.itens.every((i) => i.daUnidade));
  const pop028 = pgt.itens.find((i) => /POP028/.test(i.titulo));
  assert.match(pop028.titulo, /POP028_v2/, 'a versão mais nova na frente');
  assert.equal(pop028.anteriores.length, 1, 'a v1 guardada como anterior');
  assert.ok(!titulos.some((t) => /POP002 do B/.test(t)), 'nada de outro cliente');
  // POP001 emitido antes da geração revisada: suspenso, marcado só para a equipe
  const pop001 = pgt.itens.find((i) => /POP001/.test(i.titulo));
  assert.equal(pop001 && pop001.situacao, 'SUSPENSO');
  // registros operacionais da unidade também valem para o equipamento
  assert.equal(a.pasta(r, 'REGISTROS').total, 1);
  // documento interno (contrato) e versão interna da Representação nunca no QR
  assert.ok(!JSON.stringify(r).includes('contratoDoc01') && !JSON.stringify(r).includes('contratoPdfAss'));
  // manutenção: a versão nova na frente e a antiga guardada (mesmo nome, outro arquivo)
  const man = a.pasta(r, 'MANUTENCAO');
  assert.equal(man.total, 1);
  assert.equal(man.itens[0].url, '/arquivos/manutNova0002');
  assert.equal(man.itens[0].anteriores[0].url, '/arquivos/manutAntiga01');
  // inativo do Arquivo de documentos fora do QR; a situação da qualificação vai junto; o acesso fica registrado
  assert.ok(!JSON.stringify(r).includes('fotoPlaca001'));
  assert.match(r.qualificacao.rotulo, /Requalificação vence em|Qualificado até/);
  assert.ok(a.logs.some((l) => l[0] === 'QRCODE_DOCUMENTOS_VISTA' && /eA1/.test(l[2])));
  // perfil que não abre o QR (Comercial): recusa com o quê, por quê e o que fazer
  const neg = a.docs(a.sCom, 'equipamento', 'eA1', 'qr');
  assert.equal(neg.success, false);
  assert.match(neg.message, /Acesso negado.*Por quê.*O que fazer/);
});

test('conta de cliente: só os documentos dela, só o liberado (sem minuta, suspenso, inativo, interno ou contrato), link pela rota do SGO+', () => {
  const a = amb();
  const r = a.docs(a.sA, 'equipamento', 'eA1', 'qr');
  assert.equal(r.success, true, r.message);
  const txt = JSON.stringify(r);
  for (const proibido of ['minutaAc01', 'pop001Velho1', 'fotoPlaca001', 'contratoDoc01', 'contratoPdfAss', 'repIntPdf001', 'certClienteB1', 'qualSoDoB01', 'popDoB00001', 'drive.google.com'])
    assert.ok(!txt.includes(proibido), 'não pode ir ao cliente: ' + proibido);
  assert.ok(!/"arquivoId"|"docDocumentoId"|"repeticoes"/.test(txt), 'campos internos fora');
  assert.ok(a.todos(r).every((i) => /^\/arquivos\//.test(i.url)), 'sempre /arquivos/<id>');
  assert.ok(!r.pastas.some((p) => p.id === 'CONTRATOS'));
  assert.ok(a.pasta(r, 'PGT_POP').itens.length >= 3, 'PGT e POP da unidade aparecem para o cliente');
  // Arquivo de documentos do cliente (portal): a empresa inteira, sem dizer o id
  const p = a.docs(a.sA, 'cliente', '', 'portal');
  assert.equal(p.success, true, p.message);
  assert.equal(p.alvo.id, 'cA');
  assert.ok(a.todos(p).length >= 10);
  assert.ok(!JSON.stringify(p).includes('HOSPITAL B'));
  assert.ok(p.unidades.length === 2 && p.equipamentos.length >= 3, 'filtros por unidade e equipamento');
  // equipamento, unidade ou cliente de outra empresa: recusado
  for (const [e, id] of [['equipamento', 'eB1'], ['unidade', 'uB1'], ['cliente', 'cB']]) {
    const n = a.docs(a.sA, e, id, 'portal');
    assert.equal(n.success, false, e);
    assert.match(n.message, /Acesso negado/);
  }
  // o cliente B não vê nada do A
  const b = a.docs(a.sB, 'cliente', '', 'portal');
  assert.ok(!JSON.stringify(b).includes('SANTA'));
  assert.ok(a.todos(b).some((i) => /202600400|CERT B/.test(i.titulo)));
});

test('trava de arquivo: o cliente abre o documento emitido do prontuário dele; minuta, suspenso, interno e de outro cliente dão não; desligável', () => {
  const a = amb();
  const p = (sid, id) => a.ctx.PortalCliente_arquivoPermitido_(sid, id);
  assert.equal(p(a.sA, 'qualAc01rev1'), true, 'qualificação emitida (só em QUALIF_EMISSOES)');
  assert.equal(p(a.sA, 'qualAc01rev0'), true, 'revisão anterior também (o cliente vê as substituídas)');
  assert.equal(p(a.sA, 'laudoNr13vp01'), true, 'laudo NR-13');
  assert.equal(p(a.sA, 'pgtsNovo0001'), true, 'PGT da geração revisada');
  assert.equal(p(a.sA, 'pop028versao2'), true, 'POP da lista do módulo');
  assert.equal(p(a.sA, 'certTer01aaa'), true, 'certificado (Arquivo de documentos)');
  assert.equal(p(a.sA, 'minutaAc01'), false, 'minuta');
  assert.equal(p(a.sA, 'pop001Velho1'), false, 'PGT/POP suspenso');
  assert.equal(p(a.sA, 'contratoPdfAss'), false, 'contrato');
  assert.equal(p(a.sA, 'rascunhoNr13'), false, 'laudo em rascunho');
  assert.equal(p(a.sA, 'repIntPdf001'), false, 'versão interna');
  assert.equal(p(a.sA, 'qualSoDoB01'), false, 'do cliente B');
  assert.equal(p(a.sB, 'qualAc01rev1'), false, 'B não abre o do A');
  assert.equal(p(a.sB, 'qualSoDoB01'), true);
  // desligado na configuração: só as regras de antes valem (Arquivo de documentos continua)
  const b = amb({ cfg: { clienteAbreProntuario: false } });
  assert.equal(b.ctx.PortalCliente_arquivoPermitido_(b.sA, 'qualAc01rev1'), false);
  assert.equal(b.ctx.PortalCliente_arquivoPermitido_(b.sA, 'certTer01aaa'), true);
  const r = j(b.ctx.documentosPastas(b.sA, { escopo: 'equipamento', id: 'eA1', via: 'qr' }));
  const q = r.pastas.find((x) => x.id === 'QUALIFICACAO').itens[0];
  assert.equal(q.podeAbrir, false);
  assert.match(q.semAbrirTexto, /Peça a cópia à Metrolabs/);
});

test('ficha do cliente (equipe): agrupada por pasta, sem repetição e sem perder documento; contratos só para quem vê contratos', () => {
  const a = amb();
  const r = a.docs(a.sPri, 'cliente', 'cA', 'ficha');
  assert.equal(r.success, true, r.message);
  // o certificado TER-01 registrado duas vezes com o mesmo arquivo + a linha do CertCal = um documento só, com o número e a validade
  const cal = a.pasta(r, 'CALIBRACAO');
  const ter = cal.itens.filter((i) => /202600258/.test(i.titulo));
  assert.equal(ter.length, 1, 'uma vez só');
  assert.equal(ter[0].titulo, 'Certificado de calibração nº 202600258');
  assert.equal(ter[0].repeticoes, 2);
  assert.equal(ter[0].venc.s, 'vencendo', 'validade vem do CertCal (o Arquivo dizia "sem vencimento")');
  assert.equal(ter[0].equipamentoNome, 'TER-01 · TERMOMETRO');
  // nada se perde: todos os arquivos do cliente A estão na resposta (principais e versões anteriores)
  const ids = a.todos(r).map((i) => i.arquivoId);
  for (const id of ['certTer01aaa', 'certAc01soCert', 'manutAntiga01', 'manutNova0002', 'contratoDoc01', 'fotoPlaca001', 'qualAc01rev0', 'qualAc01rev1', 'ensaioAc01', 'qualLv01',
    'laudoNr13vp01', 'relOs0032pdf', 'relOs0032rev0', 'repCliPdf001', 'repIntPdf001', 'pgtsNovo0001', 'pop008Novo01', 'pop001Velho1', 'pop028versao1', 'pop028versao2', 'declExec0005', 'regOpBowie01', 'contratoPdfAss'])
    assert.ok(ids.includes(id), 'faltou ' + id);
  assert.equal(new Set(ids).size, ids.length, 'cada arquivo uma vez');
  // pasta interna com o contrato do Arquivo e o PDF do contrato (a Priscilla é Gestor: vê contratos)
  const ct = a.pasta(r, 'CONTRATOS');
  assert.equal(ct.interna, true);
  assert.equal(ct.total, 2);
  // a minuta aparece para a equipe, marcada; o inativo aparece marcado e não conta
  const minuta = a.todos(r).find((i) => i.numero === 'QA-2026-0020');
  assert.equal(minuta && minuta.situacao, 'MINUTA');
  assert.equal(minuta.podeAbrir, false, 'minuta não abre por aqui (como na aba Qualificações)');
  assert.match(minuta.semAbrirTexto, /Aguardando aprovação/);
  assert.equal(a.pasta(r, 'OUTROS').total, 0);
  // filtros: unidades com contagem e equipamentos com documento
  assert.deepEqual(r.unidades.map((u) => u.nome), ['FILIAL NORTE', 'MATRIZ']);
  assert.ok(r.equipamentos.find((e) => e.id === 'eA1').qtd >= 4);
  // o técnico não tem a caixa de contratos: vê o contrato registrado no Arquivo (como antes), mas não o PDF do contrato do portal
  const t = a.docs(a.sTec, 'cliente', 'cA', 'ficha');
  const idsT = a.todos(t).map((i) => i.arquivoId);
  assert.ok(idsT.includes('contratoDoc01') && !idsT.includes('contratoPdfAss'));
  // ordem: o mais novo primeiro dentro da pasta
  const pg = a.pasta(r, 'PGT_POP').itens.map((i) => i.emitidoIso);
  assert.deepEqual(pg.slice().sort().reverse(), pg);
});

test('"0 documento(s)": a árvore cliente → unidade → equipamento passa a contar os documentos de todos os módulos', () => {
  const a = amb();
  const det = j(a.ctx.cadastrosDetalhe(a.sPri, 'clientes', 'cA'));
  assert.equal(det.success, true, det.message);
  // antes: só o Arquivo de documentos com equipamento (a lavadora LV-01 e o vaso VP-01 ficavam com 0)
  const antes = {};
  det.documentos.forEach((d) => { if (d.EQUIPAMENTO_ID) antes[d.EQUIPAMENTO_ID] = (antes[d.EQUIPAMENTO_ID] || 0) + 1; });
  assert.equal(antes.eA2 || 0, 0);
  assert.equal(antes.eA4 || 0, 0);
  const c = det.contagemDocs.porEquipamento;
  assert.equal(c.eA2, 3, 'lavadora: qualificação + relatório de atendimento (versão do cliente e a interna, que a equipe vê)');
  assert.equal(c.eA4, 1, 'vaso de pressão: laudo NR-13');
  assert.equal(c.eA3, 1, 'termômetro: o certificado registrado duas vezes conta uma');
  assert.ok(c.eA1 >= 5);
  assert.equal(c.eB1, undefined, 'nada do outro cliente');
  // a tela usa a contagem nova
  const js = ler('JS_Cadastros.html');
  assert.match(js, /det\.contagemDocs && det\.contagemDocs\.porEquipamento/);
  assert.match(js, /Nenhum documento ligado a este equipamento/);
  // a unidade e a conta de cliente também recebem a contagem (só do próprio cliente)
  assert.ok(j(a.ctx.cadastrosDetalhe(a.sPri, 'unidades', 'uA2')).contagemDocs.porEquipamento.eA4 === 1);
  const dc = j(a.ctx.cadastrosDetalhe(a.sA, 'clientes', 'cA'));
  assert.equal(dc.success, true, dc.message);
  assert.equal(dc.contagemDocs.porEquipamento.eA2, 2, 'o cliente não conta a versão interna da Representação');
});

test('"Documentos gerados e envios": as versões do mesmo POP ficam juntas na pasta PGT e POP; as telas usam o componente único', () => {
  const a = amb();
  const cfg = a.ctx.Docs_cfg_();
  const docs = [
    { arquivoId: 'x1', nome: 'POP028_v1.pdf', titulo: 'POP028_v1', tipo: 'PGT / POP', quando: '2026-11-15T10:00:00' },
    { arquivoId: 'x2', nome: 'POP028_v2.pdf', titulo: 'POP028_v2', tipo: 'PGT / POP', quando: '2026-11-16T10:00:00' },
    { arquivoId: 'x3', nome: 'POP008.pdf', titulo: 'POP008', tipo: 'PGT / POP', quando: '2026-11-15T09:00:00' },
    { arquivoId: 'x4', nome: 'CERTIFICADO DE CALIBRACAO - 202600258 - TER-01.PDF', titulo: 'x', tipo: 'Certificado de calibração', quando: '2026-10-02T10:00:00' }
  ].map((d) => { const p = a.ctx.Docs_classificar_({ tipo: d.tipo, nome: d.nome }, cfg); return Object.assign(d, { pasta: p, chave: p + ':' + a.ctx.Docs_chaveNome_(d.nome) }); });
  const g = j(a.ctx.Docs_agruparLista_(docs, cfg, { soComItens: true }));
  assert.deepEqual(g.map((p) => p.id), ['CALIBRACAO', 'PGT_POP']);
  const pg = g.find((p) => p.id === 'PGT_POP');
  assert.equal(pg.itens.length, 2);
  assert.equal(pg.itens[0].arquivoId, 'x2');
  assert.deepEqual(pg.itens[0].anteriores.map((x) => x.arquivoId), ['x1']);
  // servidor do envio devolve as pastas; tela do envio, ficha, unidade, equipamento, QR e portal usam o mesmo componente
  assert.match(ler('SGO_EnviarDoc.js'), /pastas = Docs_agruparLista_\(/);
  assert.match(ler('JS_EnviarDoc.html'), /SGO_DocPastas\.desenhar\(el\.querySelector\("\.envdoc-pastas"\)/);
  assert.match(ler('Index.html'), /include\('JS_DocumentosPastas'\)/);
  assert.match(ler('JS_Core.html'), /SGO_DocPastas\.carregar\(document\.getElementById\("qrDocPastas"\), \{ escopo: "equipamento", id: eqp\.ID, via: "qr" \}/);
  assert.match(ler('JS_Cadastros.html'), /escopo: "cliente", id: c\.ID, via: "ficha"/);
  assert.match(ler('JS_Cadastros.html'), /escopo: "unidade", id: u\.ID, via: "ficha"/);
  assert.match(ler('JS_Equipamentos.html'), /escopo: "equipamento", id: e\.ID, via: "ficha"/);
  assert.match(ler('JS_Admin.html'), /escopo: "cliente", id: "", via: "portal"/);
  // a conta de cliente pode chamar a função (lista fechada do portal)
  assert.ok(a.ctx.PCL_FUNCOES_CLIENTE.includes('documentosPastas'));
});

test('ajuda e manual: explicação, "Como fazer nesta aba" e texto justificado em toda tela; manual em docs/ atualizado', () => {
  const comp = ler('JS_DocumentosPastas.html');
  for (const ctx of ['qr', 'portal', 'ficha_cliente', 'ficha_unidade', 'ficha_equipamento', 'envios']) assert.match(comp, new RegExp('\\n    ' + ctx + ': \\{'), 'guia da tela ' + ctx);
  assert.match(comp, /Como fazer nesta aba/);
  assert.match(comp, /\.dpst-just \{ text-align: justify/);
  assert.match(comp, /Por quê.*O que fazer/, 'toda falha diz o quê, por quê e o que fazer');
  assert.ok(!/setInterval/.test(comp), 'sem atualização automática');
  const aj = ler('SGO_Ajuda_Cadastros.js');
  assert.match(aj, /Documentos por pasta/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md'), 'utf8');
  assert.match(man, /## Documentos organizados por pasta/);
  assert.match(man, /QR Code/);
  assert.ok(!/antiburro/i.test(comp + aj + man));
});

// Telas reais: prontuário pelo QR Code a 390 e 320 px, ficha do cliente a 1366 px e a visão do cliente (Arquivo de documentos).
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
test('telas: prontuário no celular (390/320 px), ficha do cliente (1366 px) e visão do cliente, sem rolagem lateral e com texto justificado', { skip: !chromium && 'Playwright indisponível', timeout: 240000 }, async () => {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  const saida = path.join(__dirname, '../output/documentos-pastas-20261117/capturas'); // fixo: o rodar-lista.sh aponta CAPTURAS para outra pasta
  fs.mkdirSync(saida, { recursive: true });
  const a = amb();
  const sess = { equipe: a.sPri, cliente: a.sA };
  const browser = await chromium.launch({ headless: true });
  const abrirPagina = async (largura, altura, quem) => {
    const page = await browser.newPage({ viewport: { width: largura, height: altura }, isMobile: largura < 800, hasTouch: largura < 800 });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
    const usuario = quem === 'cliente' ? CLIA : PRI;
    await page.exposeFunction('qaRun', (fn, args) => {
      const sid = sess[quem];
      if (fn === 'getSessaoAtual' || fn === 'validarSessao') return { ok: true, valor: { success: true, valid: true, session: { sessionId: sid, email: usuario.EMAIL, nome: usuario.NOME, perfil: usuario.PERFIL, clienteId: usuario.CLIENTE_ID || '' } } };
      if (['documentosPastas', 'cadastrosPainel', 'cadastrosDetalhe', 'qrcodeAcessar', 'qualifEquipamentoListar'].includes(fn)) { try { return { ok: true, valor: j(a.ctx[fn].apply(null, [sid].concat(args.slice(1)))) }; } catch (e) { return { ok: false, erro: e.message }; } }
      // 18/11/2026 (Portal do cliente, etapa 6): a conta de cliente chama as pastas e o QR Code pela entrada do Portal (PortalCliente_api, ação
      // "legado", ponte fechada); o servidor simulado repassa à mesma função, como faz PClT_legado_
      if (fn === 'PortalCliente_api' && args[1] === 'legado' && ['documentosPastas', 'qrcodeAcessar', 'qrcodeQualificacao'].includes((args[2] || {}).fn)) { try { return { ok: true, valor: { ok: true, resultado: j(a.ctx[args[2].fn].apply(null, [sid].concat(args[2].args || []))) } }; } catch (e) { return { ok: false, erro: e.message }; } }
      return { ok: true, valor: { success: true } };
    });
    await page.addInitScript((sid) => {
      try { sessionStorage.setItem('SGO_SESSION', sid); } catch (e) {}
      const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
        (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
      window.google = { script: { run: corredor(null, null) } };
    }, sess[quem]);
    await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof renderProntuarioDigital_ === 'function' && !!window.SGO_DocPastas);
    await page.evaluate((u) => { try { window.SESSION = u.sid; } catch (e) {} try { USER_CONTEXT = Object.assign(USER_CONTEXT || {}, { perfil: u.perfil, clienteId: u.cli, nome: u.nome }); } catch (e) {} },
      { sid: sess[quem], perfil: usuario.PERFIL, cli: usuario.CLIENTE_ID || '', nome: usuario.NOME });
    return { page, erros };
  };
  const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  try {
    // 1) prontuário pelo QR Code no celular, conta da equipe e conta de cliente
    for (const largura of [390, 320]) {
      for (const quem of ['equipe', 'cliente']) {
        const { page, erros } = await abrirPagina(largura, 844, quem);
        const eqp = j(a.ctx.qrcodeAcessar(sess[quem], 'eA1')).equipamento;
        await page.evaluate((e) => { document.querySelectorAll('#loginScreen, .login-etapa').forEach((x) => { x.style.display = 'none'; }); const m = document.querySelector('.main-layout'); if (m) m.style.display = ''; renderProntuarioDigital_('', e, ''); }, eqp);
        await page.waitForFunction(() => document.querySelectorAll('#qrDocPastas .dpst-pasta').length > 0, null, { timeout: 15000 });
        const txt = await page.locator('#qrDocPastas').innerText();
        assert.match(txt, /PGT e POP/); assert.match(txt, /Ordens de serviço e relatórios de atendimento/); assert.match(txt, /Qualificações/);
        assert.ok(!/Contratos e propostas/.test(txt), 'pasta interna fora do QR');
        assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('#qrDocPastas .dpst-como-corpo p')).textAlign === 'justify'), 'guia justificado');
        assert.ok(await semRolagem(page), 'sem rolagem lateral (' + largura + ', ' + quem + ')');
        assert.ok((await page.locator('#qrDocPastas .dpst-pasta > summary').first().boundingBox()).height >= 44, 'toque grande na pasta');
        await page.screenshot({ path: path.join(saida, largura + '-prontuario-qr-' + quem + '.png'), fullPage: true });
        // abre a pasta PGT e POP e a de qualificação
        await page.evaluate(() => { document.querySelector('#qrDocPastas .dpst-como').open = false; ['PGT_POP', 'QUALIFICACAO'].forEach((id) => { const d = document.querySelector('#qrDocPastas .dpst-pasta[data-pasta="' + id + '"]'); if (d) d.open = true; }); });
        const txt2 = await page.locator('#qrDocPastas').innerText();
        assert.match(txt2, /POP008/); assert.match(txt2, /Da unidade/); assert.match(txt2, /Versões anteriores/);
        if (quem === 'cliente') assert.ok(!/POP001/.test(txt2), 'suspenso fora para o cliente');
        assert.ok(await semRolagem(page), 'sem rolagem lateral com as pastas abertas');
        await page.screenshot({ path: path.join(saida, largura + '-prontuario-qr-' + quem + '-pastas-abertas.png'), fullPage: true });
        assert.deepEqual(erros, []);
        await page.close();
      }
    }
    // 2) ficha do cliente na tela grande (equipe): aba Documentos por pasta e a árvore com a contagem nova
    {
      const { page, erros } = await abrirPagina(1366, 900, 'equipe');
      await page.evaluate(() => { document.querySelectorAll('#loginScreen, .login-etapa').forEach((x) => { x.style.display = 'none'; }); const m = document.querySelector('.main-layout'); if (m) m.style.display = ''; abrir('clientes'); });
      await page.waitForFunction(() => typeof CadTela_item_ === 'function' && !!CadTela_item_('clientes', 'cA'), null, { timeout: 15000 });
      await page.evaluate(() => Clientes_detalhe_(CadTela_item_('clientes', 'cA'), 'documentos'));
      await page.waitForFunction(() => document.querySelectorAll('#cadxPainelCorpo .dpst-pasta').length > 0, null, { timeout: 15000 });
      await page.evaluate(() => { ['CALIBRACAO', 'PGT_POP'].forEach((id) => { const d = document.querySelector('#cadxPainelCorpo .dpst-pasta[data-pasta="' + id + '"]'); if (d) d.open = true; }); });
      const txt = await page.locator('#cadxPainel').innerText();
      assert.match(txt, /Documentos por pasta/); assert.match(txt, /Contratos e propostas/); assert.match(txt, /Certificado de calibração nº 202600258/);
      assert.match(txt, /registrado em 3 lugares/);
      assert.equal((txt.match(/Certificado de calibração nº 202600258/g) || []).length, 1, 'sem repetição');
      assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('#cadxPainelCorpo .dpst-desc')).textAlign === 'justify'));
      await page.screenshot({ path: path.join(saida, '1366-ficha-cliente-documentos-por-pasta.png'), fullPage: false });
      // busca: redesenha só a lista (o campo continua com o texto e o foco)
      await page.fill('#cadxPainelCorpo .dpst-busca', 'TER-01');
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('dpst-busca') && document.activeElement.value), 'TER-01');
      const tb = await page.locator('#cadxPainelCorpo .dpst-lista').innerText();
      assert.match(tb, /202600258/); assert.ok(!/POP008/.test(tb));
      await page.screenshot({ path: path.join(saida, '1366-ficha-cliente-busca-TER-01.png'), fullPage: false });
      await page.evaluate(() => Clientes_detalhe_(CadTela_item_('clientes', 'cA'), 'vinculos'));
      await page.waitForFunction(() => /documento/.test((document.querySelector('#cadxPainelCorpo .cadx-arvore') || {}).textContent || ''), null, { timeout: 15000 });
      const arv = await page.locator('#cadxPainelCorpo').innerText();
      assert.match(arv, /LV-01[\s\S]*3 documentos/); assert.match(arv, /VP-01[\s\S]*1 documento/);
      await page.screenshot({ path: path.join(saida, '1366-ficha-cliente-arvore-contagem.png'), fullPage: false });
      assert.deepEqual(erros, []);
      await page.close();
    }
    // 3) visão do cliente: Arquivo de documentos com as pastas (1366 e 390)
    for (const [largura, altura] of [[1366, 900], [390, 844]]) {
      const { page, erros } = await abrirPagina(largura, altura, 'cliente');
      await page.evaluate(() => { document.querySelectorAll('#loginScreen, .login-etapa').forEach((x) => { x.style.display = 'none'; }); const m = document.querySelector('.main-layout'); if (m) m.style.display = ''; renderDocumentosModulo_(); });
      await page.waitForFunction(() => document.querySelectorAll('#cadxDocPastasClienteCorpo .dpst-pasta').length > 0, null, { timeout: 15000 });
      const txt = await page.locator('#cadxDocPastasClienteCorpo').innerText();
      assert.match(txt, /PGT e POP/); assert.ok(!/Contratos e propostas/.test(txt)); assert.ok(!/HOSPITAL B/.test(txt));
      assert.ok(await semRolagem(page), 'sem rolagem lateral (cliente ' + largura + ')');
      await page.screenshot({ path: path.join(saida, largura + '-cliente-arquivo-de-documentos-por-pasta.png'), fullPage: largura < 800 });
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
