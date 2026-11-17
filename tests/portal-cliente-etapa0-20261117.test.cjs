// 17/11/2026 — Portal do cliente, ETAPA 0 (output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md): segurança da conta de cliente
// e cadastro de contratos. Código real (SGO_Auth.js, SGO_SegurancaAcesso.js, SGO_Usuarios.js, SGO_PortalCliente*.js, cadastros e
// a trava de arquivo) num vm, com planilha, propriedades e e-mail simulados. Confere: cliente A não abre arquivo nem registro do
// cliente B; colunas internas nunca vão ao cliente; a observação registra sem bloquear; com a chave ligada, função fora da lista
// é recusada com mensagem clara; contratos e as situações PLENO/CARENCIA/CONSULTA/SUSPENSO/SEM_ACESSO; contas antigas em consulta;
// a Representação respeita o fim do contrato; contas internas e a representada seguem iguais. Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa0-20261117.test.cjs
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

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const DIR = { ID: 'u-dir', USUARIO: 'dora', SENHA: 'Dora2026xx', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
const GER = { ID: 'u-ger', USUARIO: 'gil', SENHA: 'Gil2026xxx', NOME: 'GIL GESTOR TECNICO TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test' };
const CLIA = { ID: 'u-cla', USUARIO: 'carla', SENHA: 'Cliente2026x', NOME: 'CARLA CLIENTE A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospital-a.test', CLIENTE_ID: 'cA' };
const CLIB = { ID: 'u-clb', USUARIO: 'bia', SENHA: 'Cliente2026y', NOME: 'BIA CLIENTE B TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'bia@hospital-b.test', CLIENTE_ID: 'cB' };
const CLIX = { ID: 'u-clx', USUARIO: 'xavier', SENHA: 'Cliente2026z', NOME: 'XAVIER CLIENTE INATIVO TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'x@inativa.test', CLIENTE_ID: 'cX' };
const REPU = { ID: 'u-rep', USUARIO: 'ana', SENHA: 'Repres2026x', NOME: 'ANA REPRESENTADA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@rep.test', REPRESENTADA_ID: 'rep1' };

function aba(a, nome, cab, linhas) { a.abas.set(nome, { cab: cab.slice(), linhas: (linhas || []).map((o) => cab.map((c) => (o[c] === undefined ? '' : o[c]))) }); }
const PROIBIDAS = ['QR_TOKEN', 'QRCODE_LINK', 'ORIGEM', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'NF_VENDA_ARQUIVO_ID', 'OBS_INTERNA', 'OBSERVACOES', 'PASTA_ID', 'RESPONSAVEL', 'OMIE_CODIGO', 'VENDEDOR_ID', 'CUSTO', 'LINK_DRIVE'];
function chavesProibidas(x, achadas) {
  achadas = achadas || [];
  if (Array.isArray(x)) x.forEach((y) => chavesProibidas(y, achadas));
  else if (x && typeof x === 'object') Object.keys(x).forEach((k) => { if (PROIBIDAS.indexOf(k) >= 0) achadas.push(k); chavesProibidas(x[k], achadas); });
  else if (typeof x === 'string' && /drive\.google\.com/.test(x)) achadas.push('link do Drive: ' + x);
  return achadas;
}

function amb() {
  const a = ambiente();
  [ADMIN, DIR, TEC, GER, CLIA, CLIB, CLIX, REPU].forEach((u) => a.add(Object.assign({}, u)));
  a.abas.get('CAD_USUARIOS').cab.push('AREA');
  aba(a, 'CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'RAZAO_SOCIAL', 'CNPJ', 'STATUS', 'EMAIL', 'OMIE_CODIGO', 'VENDEDOR_ID', 'ORIGEM'], [
    { ID: 'cA', NOME_FANTASIA: 'HOSPITAL A TESTE', RAZAO_SOCIAL: 'HOSPITAL A LTDA', CNPJ: '11222333000181', STATUS: 'ATIVO', EMAIL: 'a@hospital-a.test', OMIE_CODIGO: '999', VENDEDOR_ID: 'u-ven', ORIGEM: 'CRM' },
    { ID: 'cB', NOME_FANTASIA: 'HOSPITAL B TESTE', RAZAO_SOCIAL: 'HOSPITAL B LTDA', CNPJ: '22333444000172', STATUS: 'ATIVO' },
    { ID: 'cX', NOME_FANTASIA: 'CLINICA INATIVA TESTE', CNPJ: '33444555000163', STATUS: 'INATIVO' },
    { ID: 'cP', NOME_FANTASIA: 'CENTRAL PILOTO TESTE', RAZAO_SOCIAL: 'CENTRAL PILOTO LTDA', CNPJ: '44555666000154', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_UNIDADES', ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'CIDADE', 'UF', 'STATUS', 'RESPONSAVEL', 'ORIGEM'], [
    { ID: 'uA1', CLIENTE_ID: 'cA', NOME_UNIDADE: 'A MATRIZ', CIDADE: 'SAO PAULO', UF: 'SP', STATUS: 'ATIVO', RESPONSAVEL: 'Fulano interno', ORIGEM: 'AUVO' },
    { ID: 'uA2', CLIENTE_ID: 'cA', NOME_UNIDADE: 'A FILIAL', CIDADE: 'SANTOS', UF: 'SP', STATUS: 'ATIVO' },
    { ID: 'uB1', CLIENTE_ID: 'cB', NOME_UNIDADE: 'B UNICA', CIDADE: 'CAMPINAS', UF: 'SP', STATUS: 'ATIVO' },
    { ID: 'uP1', CLIENTE_ID: 'cP', NOME_UNIDADE: 'PILOTO UNIDADE', CIDADE: 'SAO PAULO', UF: 'SP', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_EQUIPAMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TIPO', 'FABRICANTE', 'MODELO', 'SERIE', 'TAG', 'SETOR', 'STATUS', 'QR_TOKEN', 'QRCODE_LINK', 'ORIGEM', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'NF_VENDA_ARQUIVO_ID', 'OBS_INTERNA'], [
    { ID: 'eA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'AUTOCLAVE', FABRICANTE: 'FAB', MODELO: 'M1', SERIE: 'S1', TAG: 'AC-01', SETOR: 'CME', STATUS: 'ATIVO', QR_TOKEN: 'tok-secreto', QRCODE_LINK: 'https://x/qr', ORIGEM: 'AUVO', CRIADO_POR_ID: 'u-admin', CRIADO_POR_NOME: 'ADMINISTRADOR', NF_VENDA_ARQUIVO_ID: 'nf-1', OBS_INTERNA: 'cliente atrasa pagamento' },
    { ID: 'eB1', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', TIPO: 'LAVADORA', TAG: 'LV-01', STATUS: 'ATIVO', QR_TOKEN: 'tok-b' }]);
  aba(a, 'DOC_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK_ARQUIVO', 'DATA_EMISSAO', 'DATA_VENCIMENTO', 'STATUS', 'CRIADO_EM', 'PASTA_ID', 'CRIADO_POR_NOME'], [
    { ID: 'dA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', TIPO_DOCUMENTO: '2. Certificados de Calibração', NOME_ARQUIVO: 'CERT A', LINK_ARQUIVO: 'https://drive.google.com/file/d/arqCertA123456/view', STATUS: 'ATIVO', CRIADO_EM: '2026-11-01T10:00:00', PASTA_ID: 'pasta-x', CRIADO_POR_NOME: 'MARA' },
    { ID: 'dB1', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', EQUIPAMENTO_ID: 'eB1', TIPO_DOCUMENTO: '2. Certificados de Calibração', NOME_ARQUIVO: 'CERT B', LINK_ARQUIVO: 'https://sgo.metrolabs.com.br/arquivos/arqCertB123456', STATUS: 'ATIVO', CRIADO_EM: '2026-11-02T10:00:00' }]);
  aba(a, 'ATEC_OS', ['ID', 'NUMERO', 'CLIENTE_ID', 'SITUACAO', 'RELATORIO_PDF_ID', 'RELATORIO_PDF_URL', 'RELATORIO_HTML_ID'], [
    { ID: 'osA', NUMERO: 'OS-2026-1', CLIENTE_ID: 'cA', SITUACAO: 'ENCERRADA', RELATORIO_PDF_ID: 'relOsA', RELATORIO_PDF_URL: '/arquivos/relOsA', RELATORIO_HTML_ID: 'relOsAhtml' },
    { ID: 'osA2', NUMERO: 'OS-2026-2', CLIENTE_ID: 'cA', SITUACAO: 'EM_EXECUCAO', RELATORIO_PDF_ID: 'relOsA2rascunho' },
    { ID: 'osB', NUMERO: 'OS-2026-3', CLIENTE_ID: 'cB', SITUACAO: 'ENCERRADA', RELATORIO_PDF_ID: 'relOsB', RELATORIO_PDF_URL: '/arquivos/relOsB' }]);
  aba(a, 'ATEC_ORCAMENTOS', ['ID', 'NUMERO', 'CLIENTE_ID', 'PAGADOR_ID', 'SITUACAO', 'PDF_ID', 'PDF_URL', 'ACEITE_ARQUIVO_ID'], [
    { ID: 'oA', NUMERO: 'ORC-1', CLIENTE_ID: 'cA', SITUACAO: 'EMITIDO', PDF_ID: 'orcA' },
    { ID: 'oA2', NUMERO: 'ORC-2', CLIENTE_ID: 'cA', SITUACAO: 'RASCUNHO', PDF_ID: 'orcArascunho' },
    { ID: 'oB', NUMERO: 'ORC-3', CLIENTE_ID: 'cB', SITUACAO: 'EMITIDO', PDF_ID: 'orcB' }]);
  aba(a, 'ATEC_FOTOS', ['ID', 'OS_ID', 'ARQUIVO_ID', 'RELATORIO_ARQUIVO_ID', 'PUBLICO', 'ATIVA'], [
    { ID: 'f1', OS_ID: 'osA', ARQUIVO_ID: 'fotoLiberadaA', PUBLICO: 'SIM', ATIVA: 'SIM' },
    { ID: 'f2', OS_ID: 'osA', ARQUIVO_ID: 'fotoInternaA', PUBLICO: '', ATIVA: 'SIM' }]);
  aba(a, 'REP_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'PUBLICO', 'HTML_ID', 'PDF_ID', 'DESLIGADO_EM'], [
    { ID: 'rd1', CLIENTE_ID: 'cA', PUBLICO: 'CLIENTE', HTML_ID: 'repCliA', PDF_ID: 'repCliApdf' },
    { ID: 'rd2', CLIENTE_ID: 'cA', PUBLICO: 'INTERNO', HTML_ID: 'repIntA', PDF_ID: 'repIntApdf' }]);
  const rr = a.abas.get('REP_REPRESENTADAS'); rr.cab.push('VIGENCIA_FIM');
  a.abas.set('LIC_CONTRATOS', { cab: ['ID', 'CODIGO', 'NUMERO', 'NUMERO_CONTRATO', 'SITUACAO', 'CLIENTE_ID', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'ORGAO_NOME', 'ATUALIZADO_EM'], linhas: [] });
  a.ctx.SGO_CFG.SHEETS.CAD_UNIDADES = 'CAD_UNIDADES';
  a.ctx.SGO_CFG.SHEETS.CAD_EQUIPAMENTOS = 'CAD_EQUIPAMENTOS';
  a.ctx.SGO_DATA.getByField = () => null;
  for (const f of ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente.js', 'SGO_Equipamentos.js', 'SGO_Documentos.js',
    'SGO_Unidades.js', 'SGO_Clientes.js', 'SGO_CadastrosPainel.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Config.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  const s = (u) => { const r = a.ctx.login(u.EMAIL, u.SENHA, CTX); assert.equal(r.success, true, u.EMAIL + ': ' + r.message); return r.sessionId; };
  a.s = s;
  a.sAdm = s(ADMIN); a.sDir = s(DIR); a.sTec = s(TEC); a.sGer = s(GER); a.sA = s(CLIA); a.sB = s(CLIB);
  a.api = (sid, acao, d) => j(a.ctx.PortalCliente_api(sid, acao, d || {}));
  a.hoje = a.ctx.PCl_hoje_();
  a.dia = (n) => a.ctx.PCl_diaMais_(a.hoje, n);
  a.linhas = (n) => (a.abas.get(n) ? a.ctx.SGO_DATA.getAll(n) : []);
  a.contrato = (o) => Object.assign({ clienteId: 'cA', unidades: [], numero: 'CT-2026-01', objeto: 'Manutenção preventiva e corretiva de 2 autoclaves', origemTipo: 'ASSINADO',
    servicos: [{ servico: 'MANUTENCAO_PREVENTIVA', periodicidade: 'MENSAL' }], inicio: a.dia(-100), fim: a.dia(200), responsavelId: 'u-ger', motivo: 'Contrato assinado em reunião com o cliente' }, o || {});
  return a;
}

test('T0.3/T0.4: cliente A abre só os arquivos ligados aos registros dele; os do cliente B e os internos dão 403 (negar por padrão)', () => {
  const a = amb(), p = (sid, id) => a.ctx.PortalCliente_arquivoPermitido_(sid, id);
  // os dele
  assert.equal(p(a.sA, 'arqCertA123456'), true, 'certificado do Arquivo de documentos (link do Drive)');
  assert.equal(p(a.sA, 'relOsA'), true, 'relatório da O.S. encerrada');
  assert.equal(p(a.sA, 'relOsAhtml'), true);
  assert.equal(p(a.sA, 'orcA'), true, 'orçamento enviado');
  assert.equal(p(a.sA, 'fotoLiberadaA'), true, 'foto liberada ao cliente');
  assert.equal(p(a.sA, 'repCliA'), true, 'documento A4 da Representação, versão do cliente');
  // do outro cliente, com o código na mão
  assert.equal(p(a.sA, 'arqCertB123456'), false, 'certificado do cliente B');
  assert.equal(p(a.sA, 'relOsB'), false);
  assert.equal(p(a.sA, 'orcB'), false);
  assert.equal(p(a.sB, 'arqCertA123456'), false);
  assert.equal(p(a.sB, 'arqCertB123456'), true);
  // internos, mesmo do próprio cliente
  assert.equal(p(a.sA, 'repIntA'), false, 'versão interna do relatório');
  assert.equal(p(a.sA, 'relOsA2rascunho'), false, 'relatório de O.S. não encerrada');
  assert.equal(p(a.sA, 'orcArascunho'), false, 'orçamento não enviado');
  assert.equal(p(a.sA, 'fotoInternaA'), false, 'foto não liberada');
  assert.equal(p(a.sA, 'nf-1'), false, 'nota fiscal do equipamento');
  assert.equal(p(a.sA, 'arquivo-de-outro-modulo'), false, 'qualquer outro arquivo: antes abria, agora nega');
  assert.equal(p(a.sA, ''), false);
  // a função que o servidor chama hoje entrega a decisão à nova (sem mudar o servidor)
  assert.equal(a.ctx.Representacao_arquivoClientePermitido_(a.sA, 'arqCertB123456'), false);
  assert.equal(a.ctx.Representacao_arquivoClientePermitido_(a.sA, 'arqCertA123456'), true);
  assert.equal(a.ctx.Representacao_arquivoClientePermitido_(a.sA, 'arquivo-de-outro-modulo'), false);
  // a recusa fica registrada (tentativa de acesso a dado alheio)
  const reg = a.linhas('PCL_ACESSOS').filter((r) => r.ACAO === 'ESCOPO_RECUSADO');
  assert.ok(reg.some((r) => r.CLIENTE_ID === 'cA' && /arqCertB123456/.test(r.DETALHE)), 'ESCOPO_RECUSADO gravado');
  // contrato assinado (PDF interno) nunca abre para o cliente
  const c = a.api(a.sAdm, 'salvar', a.contrato({ arquivo: null }));
  assert.equal(c.ok, true, c.message);
  a.ctx.SGO_DATA.update('CLI_CONTRATOS', c.contratoId, { ARQUIVO_ID: 'contratoAssinadoA' });
  assert.equal(p(a.sA, 'contratoAssinadoA'), false);
});

test('T0.5: equipamentos, documentos, unidades, clientes e o painel de cadastros vão ao cliente só com as colunas públicas; a equipe recebe tudo', () => {
  const a = amb();
  const respostas = {
    equipamentosListar: j(a.ctx.equipamentosListar(a.sA)), equipamentosObter: j(a.ctx.equipamentosObter(a.sA, 'eA1')), equipamentosPesquisar: j(a.ctx.equipamentosPesquisar(a.sA, 'AC')),
    documentosListar: j(a.ctx.documentosListar(a.sA)), documentosObter: j(a.ctx.documentosObter(a.sA, 'dA1')), documentosPesquisar: j(a.ctx.documentosPesquisar(a.sA, 'CERT')),
    unidadesListar: j(a.ctx.unidadesListar(a.sA)), unidadesObter: j(a.ctx.unidadesObter(a.sA, 'uA1')), clientesListar: j(a.ctx.clientesListar(a.sA)), clientesObter: j(a.ctx.clientesObter(a.sA, 'cA')),
    painelEquip: j(a.ctx.cadastrosPainel(a.sA, 'equipamentos')), painelDocs: j(a.ctx.cadastrosPainel(a.sA, 'documentos')), painelClientes: j(a.ctx.cadastrosPainel(a.sA, 'clientes')),
    detalheCliente: j(a.ctx.cadastrosDetalhe(a.sA, 'clientes', 'cA')), detalheEquip: j(a.ctx.cadastrosDetalhe(a.sA, 'equipamentos', 'eA1'))
  };
  Object.keys(respostas).forEach((k) => {
    const r = respostas[k];
    assert.notEqual(r.success, false, k + ': ' + r.message);
    assert.deepEqual(chavesProibidas(r), [], k + ' levou campo interno');
    assert.ok(!JSON.stringify(r).includes('HOSPITAL B'), k + ' levou dado do cliente B');
  });
  assert.equal(respostas.equipamentosListar.items.length, 1);
  assert.equal(respostas.equipamentosObter.item.TAG, 'AC-01'); assert.equal(respostas.equipamentosObter.item.UNIDADE_NOME, 'A MATRIZ');
  assert.equal(respostas.documentosObter.item.LINK_ARQUIVO, '/arquivos/arqCertA123456', 'o link vira a rota com sessão');
  assert.equal(respostas.painelEquip.items[0].SETOR, 'CME');
  // registro do cliente B pelo código: recusado como antes
  assert.equal(j(a.ctx.equipamentosObter(a.sA, 'eB1')).success, false);
  assert.equal(j(a.ctx.documentosObter(a.sA, 'dB1')).success, false);
  // equipe interna: nada muda
  const int = j(a.ctx.equipamentosObter(a.sAdm, 'eA1'));
  assert.equal(int.item.QR_TOKEN, 'tok-secreto'); assert.equal(int.item.OBS_INTERNA, 'cliente atrasa pagamento');
  assert.equal(j(a.ctx.documentosObter(a.sAdm, 'dA1')).item.PASTA_ID, 'pasta-x');
  assert.equal(j(a.ctx.equipamentosListar(a.sTec)).items.length, 2);
  assert.ok(j(a.ctx.cadastrosPainel(a.sAdm, 'equipamentos')).items.some((e) => e.QR_TOKEN === 'tok-secreto'));
});

test('T0.2: modo observação (padrão) registra as funções chamadas por contas de cliente e não recusa nada', () => {
  const a = amb();
  const cfg0 = a.ctx.PCl_funcoesCfg_();
  assert.equal(cfg0.modo, 'OBSERVAR', 'a chave de recusa nasce desligada'); assert.equal(cfg0.dias, 7);
  for (const fn of ['Comercial_api', 'Omie_api', 'Assistencia_api', 'Assistencia_api', 'Licitacoes_api']) {
    const r = j(a.ctx.PortalCliente_portaoFuncao_(a.sA, fn, '200.1.2.3'));
    assert.equal(r.permitir, true, fn); assert.equal(r.modo, 'OBSERVAR');
  }
  const obs = a.linhas('PCL_FUNCOES_OBSERVADAS');
  assert.equal(obs.find((o) => o.FUNCAO === 'Assistencia_api').CHAMADAS, 2, 'uma linha por dia, função e pessoa, com a contagem');
  assert.equal(obs.find((o) => o.FUNCAO === 'Comercial_api').NA_LISTA, 'NAO');
  assert.equal(obs.find((o) => o.FUNCAO === 'Assistencia_api').NA_LISTA, 'SIM');
  assert.ok(obs.every((o) => o.CLIENTE_ID === 'cA' && o.USUARIO_ID === 'u-cla'));
  assert.ok(a.ctx.PCl_funcoesCfg_().desde, 'o período começa na primeira chamada');
  // conta interna: não passa pelo portão
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sAdm, 'Comercial_api', '')).permitir, true);
  assert.equal(a.linhas('PCL_FUNCOES_OBSERVADAS').filter((o) => o.USUARIO_ID === 'u-admin').length, 0);
  // resumo da aba Segurança: diz o período e como ligar
  const seg = a.api(a.sAdm, 'seguranca');
  assert.equal(seg.ok, true, seg.message);
  assert.equal(seg.seguranca.modo, 'OBSERVAR'); assert.ok(seg.seguranca.foraDaLista >= 3);
  assert.match(seg.seguranca.instrucao, /recusa está DESLIGADA.*vai até \d{2}\/\d{2}\/\d{4}.*Para ligar a recusa: .*escolha "Ligada"/);
});

test('T0.1: com a chave ligada (Diretoria, com motivo), função fora da lista é recusada com o quê, por quê e o que fazer; a lista continua passando', () => {
  const a = amb();
  // técnico e gestor não ligam a chave
  const t = a.api(a.sTec, 'salvarSeguranca', { modo: 'RECUSAR', motivo: 'tentativa do técnico' });
  assert.equal(t.ok, false); assert.match(t.message, /permissão «Alterar as regras do portal».*Por quê: .*O que fazer: /);
  const semMotivo = a.api(a.sDir, 'salvarSeguranca', { modo: 'RECUSAR', motivo: 'curto' });
  assert.equal(semMotivo.ok, false); assert.equal(semMotivo.faltam[0].campo, 'pclSegMotivo');
  const interna = a.api(a.sDir, 'salvarSeguranca', { acrescentar: 'Comercial_api', motivo: 'cliente pediu para ver o comercial' });
  assert.equal(interna.ok, false); assert.match(interna.message, /módulo interno.*nunca entra/);
  const lig = a.api(a.sDir, 'salvarSeguranca', { modo: 'RECUSAR', motivo: 'Período de observação concluído e lista revisada' });
  assert.equal(lig.ok, true, lig.message); assert.match(lig.message, /recusa LIGADA/);
  for (const fn of ['Comercial_api', 'Omie_api', 'Conduta_api', 'Comunicacao_listarConversas', 'Licitacoes_api', 'CronExec_apiDispatch', 'GanhosVendedores_api', 'Usuarios_listar']) {
    const r = j(a.ctx.PortalCliente_portaoFuncao_(a.sA, fn, '200.1.2.3'));
    assert.equal(r.permitir, false, fn + ' deveria ser recusada');
    assert.match(r.mensagem, /Esta função é da equipe Metrolabs.*Por quê: .*O que fazer: /);
  }
  for (const fn of ['Assistencia_api', 'documentosListar', 'equipamentosObter', 'getSessaoAtual', 'logout', 'PortalCliente_api']) assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sA, fn, '')).permitir, true, fn);
  // a recusa fica registrada
  assert.ok(a.linhas('PCL_ACESSOS').some((r) => r.ACAO === 'FUNCAO_RECUSADA' && r.DETALHE === 'Comercial_api'));
  assert.ok(a.linhas('PCL_FUNCOES_OBSERVADAS').find((o) => o.FUNCAO === 'Comercial_api').RECUSADAS >= 1);
  // a Diretoria acrescenta uma função que o cliente precisa (fora dos módulos internos)
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sA, 'SGO_Pendencias_api', '')).permitir, false);
  const add = a.api(a.sDir, 'salvarSeguranca', { acrescentar: 'SGO_Pendencias_api', motivo: 'Vencimentos do cliente usam esta função' });
  assert.equal(add.ok, true, add.message);
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sA, 'SGO_Pendencias_api', '')).permitir, true);
  // contas internas nunca são recusadas pelo portão
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sAdm, 'Comercial_api', '')).permitir, true);
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(a.sTec, 'Omie_api', '')).permitir, true);
  // histórico das regras com antes, depois e motivo
  const h = a.linhas('PCL_REGRAS_HIST');
  assert.ok(h.some((x) => x.CHAVE === 'FUNCOES_CLIENTE' && /RECUSAR/.test(x.DEPOIS_JSON) && x.POR_NOME === 'DORA DIRETORA TESTE'));
  // o patch do servidor está pronto e consulta esta função
  const patch = path.join(__dirname, '../output/portal-cliente-20261116/etapa0/servidor/etapa0-servidor.patch');
  if (fs.existsSync(patch)) { const t2 = fs.readFileSync(patch, 'utf8'); assert.match(t2, /PortalCliente_portaoFuncao_/); assert.match(t2, /rep\.code\(403\)/); }
});

test('T0.6: situação de acesso nas datas-limite; contrato privado e de licitação na mesma unidade (vale o melhor); unidade fora do contrato', () => {
  const a = amb();
  // 17/11/2026 (pedido do dono): o cliente sem nenhum contrato fica com a vigência provisória até 31/12/2026 (coberto em
  // contratos-vigencia-reajuste-20261117.test.cjs). Aqui ela fica desligada, para conferir a transição das contas antigas, que continua valendo.
  a.props.set('PCL_REGRAS', JSON.stringify({ provisoriaAte: '' }));
  const r = a.api(a.sAdm, 'salvar', a.contrato({ inicio: '2026-01-01', fim: '2026-06-30', unidades: ['uA1'] }));
  assert.equal(r.ok, true, r.message);
  const sit = (dia, un) => a.ctx.PCl_situacaoAcesso_('cA', un || 'uA1', dia).situacao;
  assert.equal(sit('2025-12-31'), 'CONSULTA', 'antes de começar o contrato não conta: conta antiga fica em transição');
  assert.equal(sit('2026-01-01'), 'PLENO');
  assert.equal(sit('2026-06-30'), 'PLENO', 'no dia do fim');
  assert.equal(sit('2026-07-01'), 'CARENCIA', 'dia + 1');
  assert.equal(sit('2026-07-30'), 'CARENCIA', 'dia + 30');
  assert.equal(sit('2026-07-31'), 'CONSULTA', 'dia + 31');
  assert.equal(sit('2027-07-30'), 'CONSULTA', 'último dia da consulta (12 meses)');
  assert.equal(sit('2027-07-31'), 'SEM_ACESSO', 'fim da consulta');
  const car = a.ctx.PCl_situacaoAcesso_('cA', 'uA1', '2026-07-10');
  assert.equal(car.ateBr, '30/07/2026'); assert.match(car.textoCliente, /terminou em 30\/06\/2026.*vai até 30\/07\/2026/);
  // a unidade uA2 não está no contrato privado: sem contrato que a cubra e com conta antiga, transição
  assert.equal(sit('2026-03-01', 'uA2'), 'CONSULTA');
  // contrato de licitação vigente do mesmo cliente (todas as unidades): vale o melhor
  a.abas.get('LIC_CONTRATOS').linhas.push(['lic1', 'LIC-2026-7', 'PE 12/2026', 'CT 45/2026', 'VIGENTE', 'cA', '2026-07-15', '2027-12-31', 'PREFEITURA TESTE', '']);
  a.ctx.PCl_memoLimpar_();
  assert.equal(sit('2026-07-20'), 'PLENO', 'licitação vigente supera a carência do privado');
  assert.equal(a.ctx.PCl_situacaoAcesso_('cA', 'uA1', '2026-07-20').contrato.fonte, 'LIC');
  assert.equal(sit('2026-07-20', 'uA2'), 'PLENO');
  assert.equal(sit('2028-01-15'), 'CARENCIA', 'depois do fim da licitação, a carência dela');
  // licitação rescindida: termina na data da rescisão
  a.abas.get('LIC_CONTRATOS').linhas[0][4] = 'RESCINDIDO'; a.abas.get('LIC_CONTRATOS').linhas[0][9] = '2026-08-01T10:00:00';
  a.ctx.PCl_memoLimpar_();
  assert.equal(sit('2026-08-20'), 'CARENCIA');
  // contrato de licitação de outro cliente não conta
  assert.equal(a.ctx.PCl_situacaoAcesso_('cB', '', '2026-08-20').situacao, 'CONSULTA');
});

test('contratos: registrar (faltas por campo), corrigir (versão e histórico), encerrar, suspender e reativar, quem pode; o cliente vê só o texto neutro', () => {
  const a = amb();
  const vazio = a.api(a.sAdm, 'salvar', { clienteId: 'cA' });
  assert.equal(vazio.ok, false); assert.equal(vazio.codigo, 'INCOMPLETO');
  const campos = vazio.faltam.map((f) => f.campo);
  ['pclCtNumero', 'pclCtObjeto', 'pclCtOrigem', 'pclCtServicos', 'pclCtInicio', 'pclCtFim', 'pclCtResponsavel', 'pclCtMotivo'].forEach((c) => assert.ok(campos.indexOf(c) >= 0, 'falta ' + c));
  assert.equal(a.api(a.sAdm, 'salvar', a.contrato({ fim: '2020-01-01', inicio: '2021-01-01' })).faltam[0].campo, 'pclCtFim');
  assert.equal(a.api(a.sAdm, 'salvar', a.contrato({ clienteId: 'cX' })).faltam[0].campo, 'pclCtCliente');
  assert.equal(a.api(a.sAdm, 'salvar', a.contrato({ unidades: ['uB1'] })).faltam[0].campo, 'pclCtUnidades');
  // técnico não registra nem vê; gestor vê, não registra
  assert.match(a.api(a.sTec, 'lista').message, /permissão «Ver contratos de clientes»/);
  assert.equal(a.api(a.sGer, 'lista').ok, true);
  assert.match(a.api(a.sGer, 'salvar', a.contrato()).message, /permissão «Registrar e alterar contrato de cliente».*gestão comercial/);
  const ok = a.api(a.sDir, 'salvar', a.contrato());
  assert.equal(ok.ok, true, ok.message); assert.match(ok.message, /Contrato CT-2026-01 registrado\. Situação de acesso do cliente agora: acesso completo/);
  assert.equal(a.api(a.sDir, 'salvar', a.contrato()).faltam[0].campo, 'pclCtNumero', 'número repetido no mesmo cliente');
  const k = a.linhas('CLI_CONTRATOS')[0];
  assert.equal(k.VERSAO, 1); assert.equal(k.SITUACAO, 'VIGENTE'); assert.equal(k.RESPONSAVEL_NOME, 'GIL GESTOR TECNICO TESTE');
  const cor = a.api(a.sDir, 'salvar', a.contrato({ id: k.ID, fim: a.dia(300), motivo: 'Aditivo de prazo assinado' }));
  assert.equal(cor.ok, true, cor.message); assert.match(cor.message, /versão 2/);
  const hist = a.linhas('CLI_CONTRATOS_HIST').filter((h) => h.CONTRATO_ID === k.ID);
  assert.deepEqual(hist.map((h) => h.ACAO), ['REGISTRO', 'CORRECAO']);
  assert.equal(JSON.parse(hist[1].ANTES_JSON).VIGENCIA_FIM, a.dia(200)); assert.equal(JSON.parse(hist[1].DEPOIS_JSON).VIGENCIA_FIM, a.dia(300));
  const ficha = a.api(a.sGer, 'ficha', { clienteId: 'cA' });
  assert.equal(ficha.ok, true, ficha.message); assert.equal(ficha.situacao.situacao, 'PLENO'); assert.equal(ficha.contratos[0].versao, 2);
  assert.ok(ficha.historico.some((h) => h.mudou.some((m) => /^Fim: /.test(m))));
  // o cliente lê só o texto neutro (sem motivo interno); não chama ações internas
  assert.equal(a.api(a.sA, 'situacao').situacao, 'PLENO');
  const cl = a.api(a.sA, 'lista');
  assert.equal(cl.ok, false); assert.match(cl.message, /Esta ação é da equipe Metrolabs\. Por quê: .*O que fazer: /);
  // suspender: só Administrador e Diretoria; motivo interno nunca vai ao cliente
  assert.match(a.api(a.sGer, 'suspender', { clienteId: 'cA', motivo: 'pagamento em atraso há 90 dias' }).message, /Administrador e da Diretoria/);
  const sus = a.api(a.sDir, 'suspender', { clienteId: 'cA', motivo: 'pagamento em atraso há 90 dias' });
  assert.equal(sus.ok, true, sus.message);
  const vis = a.ctx.PCl_situacaoAcesso_('cA', '', '');
  assert.equal(vis.situacao, 'SUSPENSO'); assert.match(vis.motivoInterno, /pagamento em atraso/);
  assert.doesNotMatch(vis.textoCliente, /pagamento|atraso/); assert.match(vis.textoCliente, /está suspenso\. Fale com a Metrolabs/);
  assert.equal(a.api(a.sDir, 'suspender', { clienteId: 'cA', motivo: 'de novo para conferir' }).codigo, 'JA');
  assert.equal(a.api(a.sDir, 'reativar', { clienteId: 'cA', motivo: 'Acordo de pagamento fechado' }).ok, true);
  assert.equal(a.ctx.PCl_situacaoAcesso_('cA', '', '').situacao, 'PLENO');
  // encerrar antes do fim: carência a partir do encerramento
  const enc = a.api(a.sDir, 'encerrar', { id: k.ID, data: a.dia(-5), motivo: 'Distrato assinado pelas partes' });
  assert.equal(enc.ok, true, enc.message); assert.equal(a.ctx.PCl_situacaoAcesso_('cA', '', '').situacao, 'CARENCIA');
  assert.equal(a.api(a.sDir, 'salvar', a.contrato({ id: k.ID, motivo: 'tentativa depois de encerrado' })).codigo, 'ENCERRADO');
  // renovação liga o contrato anterior
  const ren = a.api(a.sDir, 'salvar', a.contrato({ numero: 'CT-2026-02', origemTipo: 'RENOVACAO', anteriorId: k.ID, inicio: a.dia(-4), fim: a.dia(361), motivo: 'Renovação por mais um ano' }));
  assert.equal(ren.ok, true, ren.message); assert.equal(a.ctx.PCl_situacaoAcesso_('cA', '', '').situacao, 'PLENO');
  assert.ok(a.linhas('CLI_CONTRATOS_HIST').some((h) => h.ACAO === 'RENOVACAO'));
  // nenhuma resposta da tela leva Date cru
  assert.doesNotMatch(JSON.stringify(a.api(a.sDir, 'ficha', { clienteId: 'cA' })), /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
});

test('T0.7 + decisão 4: contas antigas sem contrato entram em consulta; suspenso, sem acesso e cliente inativo são recusados com a mensagem certa; a sessão aberta cai', () => {
  const a = amb();
  // 17/11/2026: vigência provisória desligada neste teste (a regra nova está em contratos-vigencia-reajuste-20261117.test.cjs)
  a.props.set('PCL_REGRAS', JSON.stringify({ provisoriaAte: '' }));
  // conta antiga, sem contrato e sem revisão: consulta (transição) e entra
  const s0 = a.ctx.PCl_situacaoAcesso_('cA', '', '');
  assert.equal(s0.situacao, 'CONSULTA'); assert.equal(s0.transicao, true); assert.equal(s0.podeEntrar, true);
  assert.equal(a.ctx.login(CLIA.EMAIL, CLIA.SENHA, CTX).success, true);
  // a pré-carga lista o cliente com conta, sem contrato, como pendente
  const pc = a.api(a.sAdm, 'preCarga');
  assert.equal(pc.ok, true, pc.message);
  const linhaA = pc.preCarga.find((x) => x.clienteId === 'cA');
  assert.equal(linhaA.revisado, false); assert.equal(linhaA.contas, 1); assert.equal(linhaA.situacao, 'CONSULTA');
  assert.ok(pc.pendentes >= 2);
  // cliente com cadastro inativo
  const ina = a.ctx.login(CLIX.EMAIL, CLIX.SENHA, CTX);
  assert.equal(ina.success, false); assert.match(ina.message, /cadastro da sua empresa está inativo.*O que fazer: /);
  // suspenso
  a.api(a.sDir, 'suspender', { clienteId: 'cA', motivo: 'auditoria de acessos em andamento' });
  const sus = a.ctx.login(CLIA.EMAIL, CLIA.SENHA, CTX);
  assert.equal(sus.success, false); assert.match(sus.message, /^Não foi possível entrar\. O acesso da sua empresa ao Portal está suspenso\. Fale com a Metrolabs/);
  assert.doesNotMatch(sus.message, /auditoria/);
  assert.ok(a.linhas('PCL_ACESSOS').some((r) => r.ACAO === 'LOGIN_RECUSADO' && r.CLIENTE_ID === 'cA'));
  // a sessão que já estava aberta cai na reconferência (5 minutos)
  const chave = 'SGO_SESSION_' + a.sA, dados = JSON.parse(a.props.get(chave));
  dados.conferidoEm = new Date(Date.now() - 600000).toISOString(); a.props.set(chave, JSON.stringify(dados)); a.cache.set(a.sA, JSON.stringify(dados));
  const v = a.ctx.validarSessao(a.sA);
  assert.equal(v.valid, false); assert.match(v.message, /^Sua sessão terminou\. O acesso da sua empresa ao Portal está suspenso/);
  a.api(a.sDir, 'reativar', { clienteId: 'cA', motivo: 'auditoria concluída sem achados' });
  assert.equal(a.ctx.login(CLIA.EMAIL, CLIA.SENHA, CTX).success, true);
  // revisado sem contrato: sem acesso
  const rv = a.api(a.sAdm, 'revisar', { clienteId: 'cB', motivo: 'Cliente avulso, atende por orçamento' });
  assert.equal(rv.ok, true, rv.message); assert.match(rv.message, /não entram mais/);
  const semAc = a.ctx.login(CLIB.EMAIL, CLIB.SENHA, CTX);
  assert.equal(semAc.success, false); assert.match(semAc.message, /não tem contrato vigente.*Para contratar ou renovar, fale com/);
  // contrato encerrado há mais de 30 dias: consulta, entra; terminada a consulta: sem acesso
  a.api(a.sAdm, 'revisar', { clienteId: 'cB', motivo: 'Contrato encontrado na pasta', desfazer: true });
  const kB = a.api(a.sAdm, 'salvar', a.contrato({ clienteId: 'cB', numero: 'CT-B-1', inicio: a.dia(-400), fim: a.dia(-40) }));
  assert.equal(kB.ok, true, kB.message);
  assert.equal(a.ctx.PCl_situacaoAcesso_('cB', '', '').situacao, 'CONSULTA');
  assert.equal(a.ctx.login(CLIB.EMAIL, CLIB.SENHA, CTX).success, true);
  a.api(a.sAdm, 'salvar', a.contrato({ id: a.linhas('CLI_CONTRATOS').find((x) => x.NUMERO === 'CT-B-1').ID, clienteId: 'cB', numero: 'CT-B-1', inicio: a.dia(-900), fim: a.dia(-500), motivo: 'Datas corrigidas pelo contrato' }));
  assert.equal(a.ctx.PCl_situacaoAcesso_('cB', '', '').situacao, 'SEM_ACESSO');
  assert.equal(a.ctx.login(CLIB.EMAIL, CLIB.SENHA, CTX).success, false);
  // regra alternativa (decisão 4): completo por 60 dias para as contas antigas
  const rg = a.api(a.sDir, 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'PLENO', contatoComercial: 'comercial@metrolabs.test', motivo: 'Transição mais suave pedida pelo dono' });
  assert.equal(rg.ok, true, rg.message);
  const sT = a.ctx.PCl_situacaoAcesso_('cA', '', '');
  assert.equal(sT.situacao, 'PLENO'); assert.equal(sT.transicao, true);
  assert.match(a.ctx.PCl_situacaoAcesso_('cB', '', '').textoCliente, /comercial@metrolabs\.test/);
});

test('piloto: cliente com 1 unidade e sem conta fica sem acesso até o contrato; registrado o contrato, passa a acesso completo', () => {
  const a = amb();
  assert.equal(a.ctx.PCl_situacaoAcesso_('cP', '', '').situacao, 'SEM_ACESSO', 'sem conta e sem contrato');
  const r = a.api(a.sDir, 'salvar', a.contrato({ clienteId: 'cP', numero: 'CT-PILOTO-2026', unidades: [], objeto: 'Manutenção preventiva, corretiva e calibração dos equipamentos da central',
    servicos: [{ servico: 'MANUTENCAO_PREVENTIVA', periodicidade: 'MENSAL' }, { servico: 'CALIBRACAO', periodicidade: 'ANUAL' }], inicio: a.hoje, fim: a.dia(364) }));
  assert.equal(r.ok, true, r.message);
  const s = a.ctx.PCl_situacaoAcesso_('cP', 'uP1', '');
  assert.equal(s.situacao, 'PLENO'); assert.equal(s.contrato.numero, 'CT-PILOTO-2026');
  assert.ok(a.api(a.sGer, 'lista').clientes.some((c) => c.clienteId === 'cP' && c.situacao === 'PLENO'));
});

test('T0.9: a trava da Representação respeita o fim do contrato, com a mesma carência; sem data de fim, nada muda', () => {
  const a = amb();
  const rep = a.abas.get('REP_REPRESENTADAS'), fimCol = rep.cab.indexOf('VIGENCIA_FIM');
  const definir = (v) => { rep.linhas[0][fimCol] = v; };
  definir('');
  assert.equal(a.ctx.login(REPU.EMAIL, REPU.SENHA, CTX).success, true, 'sem VIGENCIA_FIM: como antes');
  definir(a.dia(-10));
  assert.equal(a.ctx.login(REPU.EMAIL, REPU.SENHA, CTX).success, true, 'fim há 10 dias: dentro da carência');
  assert.equal(a.ctx.Rep_ativa_({ NOME: 'R', SITUACAO: 'ATIVA', VIGENCIA_FIM: a.dia(-10) }), true);
  definir(a.dia(-31));
  const r = a.ctx.login(REPU.EMAIL, REPU.SENHA, CTX);
  assert.equal(r.success, false); assert.match(r.message, /contrato de representação da REPRESENTADA TESTE com a Metrolabs terminou em \d{2}\/\d{2}\/\d{4} e o prazo de carência acabou.*O que fazer: /);
  assert.equal(a.ctx.Rep_ativa_({ NOME: 'R', SITUACAO: 'ATIVA', VIGENCIA_FIM: a.dia(-31) }), false);
  assert.match(a.ctx.Rep_motivoInativa_({ NOME: 'R', SITUACAO: 'ATIVA', VIGENCIA_FIM: a.dia(-31) }), /terminou em .* carência acabou/);
  assert.equal(a.ctx.Rep_ativa_({ NOME: 'R', SITUACAO: 'ATIVA', VIGENCIA_FIM: '' }), true);
  assert.equal(a.ctx.Rep_ativa_({ NOME: 'R', SITUACAO: 'INATIVA', VIGENCIA_FIM: '' }), false);
  // formato dd/mm/aaaa e a carência das regras do portal
  const br = a.dia(-31).split('-').reverse().join('/');
  assert.equal(a.ctx.Rep_ativa_({ NOME: 'R', SITUACAO: 'ATIVA', VIGENCIA_FIM: br }), false);
  a.api(a.sDir, 'salvarRegras', { carenciaDias: 60, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', motivo: 'Carência maior para as renovações' });
  assert.equal(a.ctx.Rep_ativa_({ NOME: 'R', SITUACAO: 'ATIVA', VIGENCIA_FIM: a.dia(-31) }), true);
});

test('internos e representada inalterados: login, cadastros completos e o portão; a tela interna mostra a ficha e as caixas registradas no catálogo', () => {
  const a = amb();
  for (const u of [ADMIN, DIR, TEC, GER]) assert.equal(a.ctx.login(u.EMAIL, u.SENHA, CTX).success, true, u.EMAIL);
  assert.equal(j(a.ctx.unidadesObter(a.sGer, 'uA1')).item.RESPONSAVEL, 'Fulano interno');
  assert.equal(j(a.ctx.clientesObter(a.sAdm, 'cA')).item.OMIE_CODIGO, '999');
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_(a.sAdm, 'qualquer'), false, 'a trava do cliente não é usada para a equipe (o servidor só chama para CLIENTE)');
  const sRep = a.s(REPU);
  assert.equal(j(a.ctx.PortalCliente_portaoFuncao_(sRep, 'Representacao_api', '')).permitir, true, 'o portão não mexe na representada (ela tem a trava própria)');
  const ini = a.api(a.sGer, 'iniciar');
  assert.equal(ini.ok, true); assert.equal(ini.ver, true); assert.equal(ini.poderes.PORTAL_CLIENTE_CONTRATOS_EDITAR, false);
  assert.equal(a.api(a.sTec, 'iniciar').ver, false);
  const cods = a.ctx.SGO_PODERES_MODULOS.map((m) => m.item[0]);
  ['PORTAL_CLIENTE_CONTRATOS_VER', 'PORTAL_CLIENTE_CONTRATOS_EDITAR', 'PORTAL_CLIENTE_SUSPENDER', 'PORTAL_CLIENTE_REGRAS'].forEach((c) => assert.ok(cods.indexOf(c) >= 0, c));
  // a representada não usa o Portal do cliente
  const rp = a.api(sRep, 'lista');
  assert.equal(rp.ok, false);
});

test('tela, ajuda e manual: menu, rota, explicação de cada campo (PCL_DICAS) e manual com a chave de recusa', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html'), tela = ler('JS_PortalCliente.html'), aj = ler('JS_PortalCliente_Ajuda.html');
  assert.match(idx, /id="menu-btn-portal_cliente_contratos"/); assert.match(idx, /include\('JS_PortalCliente'\)/); assert.match(idx, /include\('JS_PortalCliente_Ajuda'\)/);
  assert.match(core, /mod === "portal_cliente_contratos" && typeof PortalCli_render_/); assert.match(core, /PortalCli_iniciar_\(\)/);
  const ids = [...tela.matchAll(/id="(pcl(?:Ct|Pc|Seg|Rg|Filtro)[A-Za-z]+)"/g)].map((m) => m[1]).filter((id) => !/Cx$|Res$|Caixa$/.test(id));
  const semDica = [...new Set(ids)].filter((id) => !new RegExp('\\b' + id + ':').test(aj));
  assert.deepEqual(semDica, [], 'todo campo da tela tem explicação');
  assert.doesNotMatch(tela, /window\.(confirm|prompt|alert)\(/);
  const ctx = vm.createContext({}); vm.runInContext(ler('SGO_Ajuda_PortalCliente.js'), ctx);
  const t = ctx.SGO_ajudaTelas_PortalCliente_().portal_cliente_contratos;
  assert.ok(t.titulo && t.paraQueServe && t.passos.length >= 4 && t.problemas.length >= 3);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_PORTAL_CLIENTE.md'), 'utf8');
  assert.match(man, /Como ligar a recusa/); assert.match(man, /PortalCliente_portaoFuncao_/); assert.match(man, /CARENCIA|carência/i);
});
