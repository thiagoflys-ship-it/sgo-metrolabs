// 18/11/2026 — Portal do cliente, ETAPA 1 (a): ACESSOS (output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md, testes T1.1 a T1.8).
// Código real num vm, com planilha, propriedades e e-mail simulados (nenhum e-mail sai de verdade). Duas montagens:
//  - contas e acessos: SGO_Auth.js, SGO_SegurancaAcesso.js, SGO_Usuarios.js, SGO_Usuarios_AcessoCliente.js (o convite que já existe),
//    SGO_PortalCliente*.js, cadastros e a trava de arquivo;
//  - "Meus chamados": o ambiente da Assistência técnica (tests/_assistencia_ambiente.cjs) com o Portal do cliente carregado junto.
// Confere: convite só com PLENO ou CARENCIA (T1.1); unidades por pessoa com "não encontrado" e ESCOPO_RECUSADO (T1.2); CONSULTA não abre
// nem aprova, mesmo chamando direto (T1.3); só o Gestor do cliente responde orçamento (T1.4); desligar derruba a sessão na hora (T1.5);
// conta antiga sem papel = Gestor com todas, "papel não revisado" (T1.6); termo exigido e de novo com versão nova, aceite com IP e navegador
// do login (T1.7); inatividade com "manter" (T1.8); pedido do gestor, troca de papel e de e-mail com histórico; tela, ajuda e manual.
// Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa1-20261118.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_usuarios_ambiente.cjs');
const AST = require('./_assistencia_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const lerDoc = (f) => fs.readFileSync(path.join(__dirname, '../docs', f), 'utf8').replace(/\r\n/g, '\n');
const j = (x) => JSON.parse(JSON.stringify(x));
const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130 Teste', aparelho: '' };

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const DIR = { ID: 'u-dir', USUARIO: 'dora', SENHA: 'Dora2026xx', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test' };
const GER = { ID: 'u-ger', USUARIO: 'gil', SENHA: 'Gil2026xxx', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
// cliente A (2 unidades): conta antiga sem papel, Solicitante só da A1 e Consulta só da A1; cliente B (1 unidade)
const CLIA = { ID: 'u-cla', USUARIO: 'carla', SENHA: 'Cliente2026x', NOME: 'CARLA GESTORA A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospital-a.test', CLIENTE_ID: 'cA' };
const SOLA = { ID: 'u-sol', USUARIO: 'sonia', SENHA: 'Cliente2026s', NOME: 'SONIA SOLICITANTE A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@hospital-a.test', CLIENTE_ID: 'cA' };
const CONA = { ID: 'u-con', USUARIO: 'celia', SENHA: 'Cliente2026c', NOME: 'CELIA CONSULTA A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@hospital-a.test', CLIENTE_ID: 'cA' };
const CLIB = { ID: 'u-clb', USUARIO: 'bia', SENHA: 'Cliente2026y', NOME: 'BIA CLIENTE B TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'bia@hospital-b.test', CLIENTE_ID: 'cB' };

function aba(a, nome, cab, linhas) { a.abas.set(nome, { cab: cab.slice(), linhas: (linhas || []).map((o) => cab.map((c) => (o[c] === undefined ? '' : o[c]))) }); }

function amb() {
  const a = ambiente();
  [ADMIN, DIR, GER, TEC, CLIA, SOLA, CONA, CLIB].forEach((u) => a.add(Object.assign({}, u)));
  a.abas.get('CAD_USUARIOS').cab.push('AREA');
  aba(a, 'CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'RAZAO_SOCIAL', 'CNPJ', 'STATUS', 'EMAIL'], [
    { ID: 'cA', NOME_FANTASIA: 'HOSPITAL A TESTE', RAZAO_SOCIAL: 'HOSPITAL A LTDA', CNPJ: '11222333000181', STATUS: 'ATIVO', EMAIL: 'a@hospital-a.test' },
    { ID: 'cB', NOME_FANTASIA: 'HOSPITAL B TESTE', RAZAO_SOCIAL: 'HOSPITAL B LTDA', CNPJ: '22333444000172', STATUS: 'ATIVO' },
    { ID: 'cP', NOME_FANTASIA: 'CENTRAL SEM CONTRATO TESTE', RAZAO_SOCIAL: 'CENTRAL TESTE LTDA', CNPJ: '44555666000154', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_UNIDADES', ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'CIDADE', 'UF', 'STATUS'], [
    { ID: 'uA1', CLIENTE_ID: 'cA', NOME_UNIDADE: 'A MATRIZ', CIDADE: 'SAO PAULO', UF: 'SP', STATUS: 'ATIVO' },
    { ID: 'uA2', CLIENTE_ID: 'cA', NOME_UNIDADE: 'A FILIAL', CIDADE: 'SANTOS', UF: 'SP', STATUS: 'ATIVO' },
    { ID: 'uB1', CLIENTE_ID: 'cB', NOME_UNIDADE: 'B UNICA', CIDADE: 'CAMPINAS', UF: 'SP', STATUS: 'ATIVO' },
    { ID: 'uP1', CLIENTE_ID: 'cP', NOME_UNIDADE: 'CENTRAL UNIDADE', CIDADE: 'SAO PAULO', UF: 'SP', STATUS: 'ATIVO' }]);
  aba(a, 'CAD_EQUIPAMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TIPO', 'MODELO', 'SERIE', 'TAG', 'SETOR', 'STATUS'], [
    { ID: 'eA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'AUTOCLAVE', MODELO: 'M1', SERIE: 'S1', TAG: 'AC-01', SETOR: 'CME', STATUS: 'ATIVO' },
    { ID: 'eA2', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', TIPO: 'LAVADORA', MODELO: 'L2', SERIE: 'S2', TAG: 'LV-02', SETOR: 'CME', STATUS: 'ATIVO' },
    { ID: 'eB1', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', TIPO: 'ESTUFA', TAG: 'ES-01', STATUS: 'ATIVO' }]);
  aba(a, 'DOC_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK_ARQUIVO', 'STATUS', 'CRIADO_EM'], [
    { ID: 'dA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', TIPO_DOCUMENTO: '2. Certificados de Calibração', NOME_ARQUIVO: 'CERT A1', LINK_ARQUIVO: '/arquivos/arqCertA1xxxx', STATUS: 'ATIVO', CRIADO_EM: '2026-11-01T10:00:00' },
    { ID: 'dA2', CLIENTE_ID: 'cA', UNIDADE_ID: '', EQUIPAMENTO_ID: 'eA2', TIPO_DOCUMENTO: '2. Certificados de Calibração', NOME_ARQUIVO: 'CERT A2', LINK_ARQUIVO: '/arquivos/arqCertA2xxxx', STATUS: 'ATIVO', CRIADO_EM: '2026-11-02T10:00:00' }]);
  aba(a, 'ATEC_OS', ['ID', 'NUMERO', 'CLIENTE_ID', 'UNIDADE_ID', 'SITUACAO', 'RELATORIO_PDF_ID', 'RELATORIO_PDF_URL'], [
    { ID: 'osA1', NUMERO: 'OS-1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', SITUACAO: 'ENCERRADA', RELATORIO_PDF_ID: 'relOsA1xxxx', RELATORIO_PDF_URL: '/arquivos/relOsA1xxxx' },
    { ID: 'osA2', NUMERO: 'OS-2', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', SITUACAO: 'ENCERRADA', RELATORIO_PDF_ID: 'relOsA2xxxx', RELATORIO_PDF_URL: '/arquivos/relOsA2xxxx' }]);
  a.abas.set('LIC_CONTRATOS', { cab: ['ID', 'CODIGO', 'NUMERO', 'NUMERO_CONTRATO', 'SITUACAO', 'CLIENTE_ID', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'ORGAO_NOME', 'ATUALIZADO_EM'], linhas: [] });
  a.ctx.SGO_CFG.SHEETS.CAD_UNIDADES = 'CAD_UNIDADES';
  a.ctx.SGO_CFG.SHEETS.CAD_EQUIPAMENTOS = 'CAD_EQUIPAMENTOS';
  a.ctx.SGO_DATA.getByField = () => null;
  for (const f of ['SGO_Usuarios_AcessoCliente.js', 'SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente.js',
    'SGO_Equipamentos.js', 'SGO_Documentos.js', 'SGO_Unidades.js', 'SGO_Clientes.js', 'SGO_CadastrosPainel.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Config.js', 'SGO_DocumentosPastas.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  // papel e unidades gravados como a tela grava (merge na linha da conta)
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-sol', { CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["uA1"]' });
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-con', { CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["uA1"]' });
  const s = (u) => { const r = a.ctx.login(u.EMAIL, u.SENHA, CTX); assert.equal(r.success, true, u.EMAIL + ': ' + r.message); return r.sessionId; };
  a.s = s;
  a.sAdm = s(ADMIN); a.sDir = s(DIR); a.sGer = s(GER); a.sTec = s(TEC); a.sA = s(CLIA); a.sSol = s(SOLA); a.sCon = s(CONA); a.sB = s(CLIB);
  a.api = (sid, acao, d) => j(a.ctx.PortalCliente_api(sid, acao, d || {}));
  a.hoje = a.ctx.PCl_hoje_();
  a.dia = (n) => a.ctx.PCl_diaMais_(a.hoje, n);
  a.linhas = (n) => (a.abas.get(n) ? a.ctx.SGO_DATA.getAll(n) : []);
  a.conta = (id) => a.ctx.SGO_DATA.getById('CAD_USUARIOS', id);
  a.contrato = (o) => Object.assign({ clienteId: 'cA', unidades: [], numero: 'CT-2026-01', objeto: 'Manutenção preventiva e corretiva de 2 autoclaves', origemTipo: 'ASSINADO',
    servicos: [{ servico: 'MANUTENCAO_PREVENTIVA', periodicidade: 'MENSAL' }], inicio: a.dia(-100), fim: a.dia(200), responsavelId: 'u-ger', motivo: 'Contrato assinado em reunião com o cliente' }, o || {});
  a.aceitar = (sid) => { const t = a.api(sid, 'minhaConta').termo; return a.api(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); };
  a.convites = () => a.emails.filter((e) => e.subject === 'Seu acesso ao SGO+ da Metrolabs');
  return a;
}

test('T1.1: convite só com acesso completo (PLENO ou CARENCIA); nas outras situações, recusa com o caminho — pelo portal e pelo "Enviar acesso" de sempre', () => {
  const a = amb();
  const novo = { clienteId: 'cP', nome: 'Paula Enfermeira', email: 'paula@central.test', cargo: 'Enfermeira da CME', papel: 'GESTOR', unidades: [] };
  // sem contrato e sem conta: SEM_ACESSO
  let r = a.api(a.sGer, 'convidar', novo);
  assert.equal(r.ok, false); assert.equal(r.codigo, 'SEM_CONTRATO');
  assert.match(r.message, /situação de acesso deste cliente é «Sem acesso».*Por quê: .*O que fazer: cadastre ou renove o contrato em Portal do cliente > Contratos/);
  const viaUsuarios = j(a.ctx.acessoClienteApi(a.sGer, 'enviar', { clienteId: 'cP', nome: 'Paula', email: 'paula@central.test' }));
  assert.equal(viaUsuarios.success, false); assert.match(viaUsuarios.message, /Portal do cliente > Contratos/);
  assert.equal(a.convites().length, 0); assert.ok(!a.linhas('CAD_USUARIOS').some((u) => u.EMAIL === 'paula@central.test'), 'nenhuma conta criada');
  // a tela mostra a trava antes de preencher
  assert.match(a.api(a.sGer, 'acessos', { clienteId: 'cP' }).trava, /Sem acesso/);
  // contrato vigente: PLENO -> envia e grava papel e unidades
  assert.equal(a.api(a.sDir, 'salvar', a.contrato({ clienteId: 'cP', numero: 'CT-P-1' })).ok, true);
  r = a.api(a.sGer, 'convidar', novo);
  assert.equal(r.ok, true, r.message); assert.match(r.message, /Conta de cliente criada e convite enviado para paula@central\.test.*Papel: Gestor do cliente/);
  const conta = a.linhas('CAD_USUARIOS').find((u) => u.EMAIL === 'paula@central.test');
  assert.equal(conta.CLIENTE_PAPEL, 'GESTOR'); assert.equal(conta.CLIENTE_CARGO, 'Enfermeira da CME'); assert.equal(conta.CLIENTE_CONVIDADO_POR_NOME, 'GIL GESTOR TESTE');
  assert.equal(a.convites().length, 1);
  assert.ok(a.linhas('PCL_CONTAS_HIST').some((h) => h.USUARIO_ID === conta.ID && h.ACAO === 'CONVITE'));
  assert.ok(a.linhas('PCL_ACESSOS').some((x) => x.ACAO === 'CONVITE_ENVIADO' && x.USUARIO_ID === conta.ID));
  // CARENCIA (terminou há 10 dias) envia; CONSULTA (terminou há 40) recusa
  a.api(a.sDir, 'salvar', a.contrato({ clienteId: 'cB', numero: 'CT-B-1', inicio: a.dia(-400), fim: a.dia(-10) }));
  assert.equal(a.ctx.PCl_situacaoAcesso_('cB', '', '').situacao, 'CARENCIA');
  r = a.api(a.sGer, 'convidar', { clienteId: 'cB', nome: 'Bruno Engenharia', email: 'bruno@hospital-b.test', papel: 'SOLICITANTE', unidades: ['uB1'] });
  assert.equal(r.ok, true, r.message);
  const kB = a.linhas('CLI_CONTRATOS').find((x) => x.NUMERO === 'CT-B-1');
  a.api(a.sDir, 'salvar', a.contrato({ id: kB.ID, clienteId: 'cB', numero: 'CT-B-1', inicio: a.dia(-400), fim: a.dia(-40), motivo: 'Data do fim corrigida pelo aditivo' }));
  assert.equal(a.ctx.PCl_situacaoAcesso_('cB', '', '').situacao, 'CONSULTA');
  r = a.api(a.sGer, 'convidar', { clienteId: 'cB', nome: 'Beatriz Farmácia', email: 'beatriz@hospital-b.test', papel: 'CONSULTA', unidades: ['uB1'] });
  assert.equal(r.codigo, 'SEM_CONTRATO'); assert.match(r.message, /«Somente consulta»/);
  // regras do papel e das unidades, com o campo da falta
  assert.equal(a.api(a.sGer, 'convidar', { clienteId: 'cP', nome: 'Pedro', email: 'pedro@central.test', papel: 'SOLICITANTE', unidades: [] }).faltam[0].campo, 'pclAcUnidades');
  assert.equal(a.api(a.sGer, 'convidar', { clienteId: 'cP', nome: 'Pedro', email: 'pedro@central.test', papel: 'SOLICITANTE', unidades: ['uA1'] }).faltam[0].campo, 'pclAcUnidades', 'unidade de outro cliente');
  assert.equal(a.api(a.sGer, 'convidar', { clienteId: 'cP', nome: 'Pedro', email: 'pedro@central.test', papel: 'CHEFE' }).faltam[0].campo, 'pclAcPapel');
  // quem pode: a caixa do convite (técnico não; cliente nunca)
  assert.match(a.api(a.sTec, 'acessos', {}).message, /permissão «Enviar acesso ao cliente»/);
  assert.equal(a.api(a.sA, 'convidar', novo).codigo, 'NAO_PERMITIDO');
  // regra configurável (Regras do portal): desligada, o convite não confere o contrato
  const rg = a.api(a.sDir, 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', conviteExigeContrato: false, motivo: 'Teste da regra do convite' });
  assert.equal(rg.ok, true, rg.message);
  assert.equal(a.api(a.sGer, 'convidar', { clienteId: 'cB', nome: 'Beatriz Farmácia', email: 'beatriz@hospital-b.test', papel: 'CONSULTA', unidades: ['uB1'] }).ok, true);
  assert.equal(a.ctx.PCl_regras_().provisoriaAte, '2026-12-31', 'gravar as regras dos acessos não apaga as outras');
});

test('T1.2: Solicitante da unidade A1 não vê equipamento, documento, unidade nem arquivo da A2; a resposta é a de inexistente e fica ESCOPO_RECUSADO', () => {
  const a = amb();
  const eq = j(a.ctx.equipamentosListar(a.sSol));
  assert.equal(eq.success, true); assert.deepEqual(eq.items.map((x) => x.ID), ['eA1']);
  const fora = j(a.ctx.equipamentosObter(a.sSol, 'eA2')), inexistente = j(a.ctx.equipamentosObter(a.sSol, 'nao-existe'));
  assert.equal(fora.success, false); assert.equal(fora.message, inexistente.message, 'mesma resposta de inexistente');
  assert.deepEqual(j(a.ctx.documentosListar(a.sSol)).items.map((x) => x.ID), ['dA1'], 'documento da A2 (pela unidade do equipamento) some');
  assert.equal(j(a.ctx.documentosObter(a.sSol, 'dA2')).message, j(a.ctx.documentosObter(a.sSol, 'nao-existe')).message);
  assert.deepEqual(j(a.ctx.unidadesListar(a.sSol)).items.map((x) => x.ID), ['uA1']);
  assert.deepEqual(j(a.ctx.cadastrosPainel(a.sSol, 'equipamentos')).items.map((x) => x.ID).sort(), ['eA1']);
  assert.equal(j(a.ctx.cadastrosDetalhe(a.sSol, 'equipamentos', 'eA2')).success, false);
  // Arquivo de documentos por pasta: só a unidade dela; unidade de fora = a mesma resposta de inexistente
  const pastas = j(a.ctx.documentosPastas(a.sSol, { escopo: 'cliente', via: 'portal' }));
  assert.doesNotMatch(JSON.stringify(pastas), /CERT A2/, JSON.stringify(pastas).slice(0, 300));
  assert.match(JSON.stringify(j(a.ctx.documentosPastas(a.sA, { escopo: 'cliente', via: 'portal' }))), /CERT A2/, 'o gestor vê as duas unidades');
  assert.equal(j(a.ctx.documentosPastas(a.sSol, { escopo: 'unidade', id: 'uA2', via: 'portal' })).message, j(a.ctx.documentosPastas(a.sSol, { escopo: 'unidade', id: 'nao-existe', via: 'portal' })).message);
  // arquivos: os da A1 abrem; os da A2 dão 403
  const p = (sid, id) => a.ctx.PortalCliente_arquivoPermitido_(sid, id);
  assert.equal(p(a.sSol, 'arqCertA1xxxx'), true); assert.equal(p(a.sSol, 'relOsA1xxxx'), true);
  assert.equal(p(a.sSol, 'arqCertA2xxxx'), false); assert.equal(p(a.sSol, 'relOsA2xxxx'), false);
  const rec = a.linhas('PCL_ACESSOS').filter((r) => r.ACAO === 'ESCOPO_RECUSADO' && r.USUARIO_ID === 'u-sol');
  assert.ok(rec.length >= 4, 'cada tentativa registrada: ' + rec.length);
  assert.ok(rec.some((r) => /eA2/.test(r.DETALHE)) && rec.some((r) => /arqCertA2xxxx/.test(r.DETALHE)));
  // a conta antiga (Gestor com todas) continua vendo tudo; o cliente B não vê nada de A
  assert.deepEqual(j(a.ctx.equipamentosListar(a.sA)).items.map((x) => x.ID).sort(), ['eA1', 'eA2']);
  assert.equal(p(a.sA, 'arqCertA2xxxx'), true);
  assert.equal(p(a.sB, 'arqCertA1xxxx'), false);
});

test('T1.5: o Gestor do cliente desliga na hora; a sessão aberta cai na próxima chamada, o convite deixa de valer e a Metrolabs vê no histórico', () => {
  const a = amb();
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-cla', { CLIENTE_PAPEL: 'GESTOR', CLIENTE_UNIDADES_JSON: '[]' });
  a.aceitar(a.sA);
  assert.equal(a.api(a.sSol, 'minhaConta').ok, true, 'sessão da Sônia funcionando');
  // sem motivo: recusa com o campo; a si mesma: recusa; pessoa de outra empresa: não encontrado + registro
  assert.equal(a.api(a.sA, 'desligarPessoa', { usuarioId: 'u-sol', motivo: 'curto' }).faltam[0].campo, 'pclEqpMotivoDesligar');
  assert.match(a.api(a.sA, 'desligarPessoa', { usuarioId: 'u-cla', motivo: 'teste de desligar a si mesma' }).message, /seu próprio acesso/);
  const outra = a.api(a.sA, 'desligarPessoa', { usuarioId: 'u-clb', motivo: 'tentativa de desligar outra empresa' });
  assert.equal(outra.ok, false); assert.equal(outra.message, 'Não encontrado. Atualize a lista.');
  assert.ok(a.linhas('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.REF_ID === 'u-clb'));
  assert.equal(a.conta('u-clb').STATUS, 'ATIVO');
  // desligar de verdade
  const r = a.api(a.sA, 'desligarPessoa', { usuarioId: 'u-sol', motivo: 'Saiu da empresa em novembro' });
  assert.equal(r.ok, true, r.message); assert.match(r.message, /desligado agora.*sessões abertas foram encerradas.*A Metrolabs foi avisada/);
  const c = a.conta('u-sol');
  assert.equal(c.STATUS, 'INATIVO'); assert.equal(c.CLIENTE_DESLIGADO_MOTIVO, 'Saiu da empresa em novembro'); assert.match(c.CLIENTE_DESLIGADO_POR_NOME, /CARLA.*Gestor do cliente/);
  // a próxima chamada da Sônia já cai, sem esperar a reconferência de 5 minutos
  const depois = a.api(a.sSol, 'minhaConta');
  assert.equal(depois.ok, false); assert.match(depois.message, /Sessão/i);
  assert.equal(a.ctx.validarSessao(a.sSol).valid, false);
  assert.equal(a.ctx.login(SOLA.EMAIL, SOLA.SENHA, CTX).success, false, 'não entra mais');
  assert.ok(a.linhas('PCL_CONTAS_HIST').some((h) => h.USUARIO_ID === 'u-sol' && h.ACAO === 'DESLIGAMENTO' && h.POR_LADO === 'CLIENTE'));
  // a Metrolabs reativa com motivo (e só com o cliente em situação que entra)
  assert.equal(a.api(a.sGer, 'reativarConta', { usuarioId: 'u-sol', motivo: 'curto' }).faltam[0].campo, 'pclAcMotivo');
  const re = a.api(a.sGer, 'reativarConta', { usuarioId: 'u-sol', motivo: 'Voltou para a CME, pedido do gestor' });
  assert.equal(re.ok, true, re.message); assert.equal(a.conta('u-sol').STATUS, 'ATIVO');
  // desligar pela Metrolabs também derruba na hora
  const s2 = a.s(SOLA);
  assert.equal(a.api(a.sGer, 'desligar', { usuarioId: 'u-sol', motivo: 'Pedido do cliente por telefone' }).ok, true);
  assert.equal(a.ctx.validarSessao(s2).valid, false);
});

test('T1.6: conta antiga sem papel = Gestor do cliente com todas as unidades (nada muda) e aparece como "papel não revisado"; a troca de papel fica no histórico', () => {
  const a = amb();
  const esc = a.ctx.PCl_escopo_('u-cla');
  assert.equal(esc.papel, 'GESTOR'); assert.equal(esc.todas, true); assert.equal(esc.revisado, false);
  const tela = a.api(a.sGer, 'acessos', { clienteId: 'cA' });
  assert.equal(tela.ok, true, tela.message);
  const carla = tela.contas.find((x) => x.id === 'u-cla'), sonia = tela.contas.find((x) => x.id === 'u-sol');
  assert.equal(carla.revisado, false); assert.equal(carla.papelNome, 'Gestor do cliente'); assert.deepEqual(carla.unidades, ['Todas as unidades']);
  assert.equal(sonia.revisado, true); assert.deepEqual(sonia.unidades, ['A MATRIZ']);
  assert.equal(tela.clientes.find((x) => x.id === 'cA').naoRevisadas, 1);
  // a Metrolabs revisa: Solicitante só da A2, com motivo (vale na próxima tela)
  assert.equal(a.api(a.sGer, 'mudarPapel', { usuarioId: 'u-cla', papel: 'SOLICITANTE', unidades: ['uA2'], motivo: 'x' }).faltam[0].campo, 'pclAcMotivo');
  const r = a.api(a.sGer, 'mudarPapel', { usuarioId: 'u-cla', papel: 'SOLICITANTE', unidades: ['uA2'], motivo: 'Revisão do papel com o cliente' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(j(a.ctx.equipamentosListar(a.sA)).items.map((x) => x.ID), ['eA2']);
  const h = a.linhas('PCL_CONTAS_HIST').find((x) => x.USUARIO_ID === 'u-cla' && x.ACAO === 'PAPEL_ALTERADO');
  assert.ok(h); assert.equal(JSON.parse(h.DEPOIS_JSON).CLIENTE_PAPEL, 'SOLICITANTE'); assert.equal(h.MOTIVO, 'Revisão do papel com o cliente');
  assert.equal(a.api(a.sGer, 'mudarPapel', { usuarioId: 'u-cla', papel: 'SOLICITANTE', unidades: ['uA2'], motivo: 'Mesma coisa de novo' }).codigo, 'NADA');
  // nada da linha antiga se perdeu (merge)
  const c = a.conta('u-cla');
  assert.equal(c.EMAIL, CLIA.EMAIL); assert.equal(c.CLIENTE_ID, 'cA'); assert.equal(c.STATUS, 'ATIVO');
  // histórico da conta para a Metrolabs (com IP); a conta do cliente nunca vê IP
  const hc = a.api(a.sGer, 'contaHistorico', { usuarioId: 'u-cla' });
  assert.ok(hc.historico.length >= 1 && hc.acessos.some((x) => x.ip === '200.1.2.3'));
});

test('T1.7: o termo de uso é exigido no primeiro acesso e de novo quando a versão muda; o aceite fica gravado com versão, data, IP e navegador do login', () => {
  const a = amb();
  const mc = a.api(a.sA, 'minhaConta');
  assert.equal(mc.ok, true, mc.message);
  assert.equal(mc.termo.pendente, true); assert.match(mc.termo.texto, /Lei 13\.709\/2018/); assert.ok(mc.termo.versao);
  assert.equal(mc.conta.papelNome, 'Gestor do cliente');
  // antes do aceite, o resto do portal recusa com o caminho
  const eq = a.api(a.sA, 'equipe');
  assert.equal(eq.codigo, 'TERMO_PENDENTE'); assert.match(eq.message, /Termo de uso.*O que fazer: .*Li e estou ciente/);
  assert.equal(a.api(a.sA, 'aceitarTermo', { versao: mc.termo.versao }).ok, false, 'sem marcar "Li e estou ciente"');
  const ac = a.api(a.sA, 'aceitarTermo', { ciente: true, versao: mc.termo.versao, navegador: 'tela tentando mandar outro navegador' });
  assert.equal(ac.ok, true, ac.message);
  const reg = a.linhas('PCL_TERMOS_ACEITE').filter((x) => x.USUARIO_ID === 'u-cla');
  assert.equal(reg.length, 1); assert.equal(reg[0].VERSAO_TERMO, mc.termo.versao); assert.equal(reg[0].IP, '200.1.2.3');
  assert.equal(reg[0].NAVEGADOR, CTX.agente, 'o navegador vem do login (servidor), não da tela'); assert.match(reg[0].EM, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  assert.equal(a.api(a.sA, 'equipe').ok, true);
  assert.match(a.api(a.sA, 'aceitarTermo', { ciente: true, versao: mc.termo.versao }).message, /já estava aceito/);
  // a Diretoria muda o texto (Regras do portal): versão nova, aceite pedido de novo
  const texto = a.ctx.PCL_TERMO_PADRAO.replace('Mudanças.', 'Mudanças e avisos.');
  const rg = a.api(a.sDir, 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', termoTexto: texto, encarregado: 'Encarregado de dados da Metrolabs (canal informado pelo dono)', motivo: 'Termo revisado pelo jurídico' });
  assert.equal(rg.ok, true, rg.message); assert.match(rg.message, /versão .*aceita de novo/);
  const mc2 = a.api(a.sA, 'minhaConta');
  assert.equal(mc2.termo.pendente, true); assert.notEqual(mc2.termo.versao, mc.termo.versao); assert.match(mc2.termo.texto, /Encarregado de dados da Metrolabs/);
  assert.equal(a.api(a.sA, 'equipe').codigo, 'TERMO_PENDENTE');
  assert.equal(a.api(a.sA, 'aceitarTermo', { ciente: true, versao: mc.termo.versao }).codigo, 'VERSAO', 'aceite da versão antiga não vale');
  assert.equal(a.api(a.sA, 'aceitarTermo', { ciente: true, versao: mc2.termo.versao }).ok, true);
  assert.equal(a.linhas('PCL_TERMOS_ACEITE').filter((x) => x.USUARIO_ID === 'u-cla').length, 2, 'só inclusão: os dois aceites ficam');
  assert.ok(a.linhas('PCL_REGRAS_HIST').some((h) => /termoVersao/.test(h.DEPOIS_JSON) && h.MOTIVO === 'Termo revisado pelo jurídico'));
  // meus dados: nome, cargo, telefone e preferências (PC06, PC07, PC08); e-mail só leitura
  const md = a.api(a.sA, 'salvarMeusDados', { nome: 'Carla de Souza', cargo: 'Coordenadora da CME', telefone: '(11) 98888-7777', avisos: { PC06: false, PC07: true, PC08: true } });
  assert.equal(md.ok, true, md.message);
  const c = a.conta('u-cla');
  assert.equal(c.NOME, 'CARLA DE SOUZA'); assert.equal(c.CLIENTE_TELEFONE, '11988887777'); assert.equal(JSON.parse(c.CLIENTE_AVISOS_JSON).PC06, false); assert.equal(c.EMAIL, CLIA.EMAIL);
  assert.equal(a.api(a.sA, 'salvarMeusDados', { nome: 'Carla', telefone: '123' }).faltam[0].campo, 'pclMdTelefone');
});

test('T1.8: aviso aos 90 dias sem entrada e inativação aos 120 só sem a marca "manter"; a contagem começa na publicação; fim do contrato inativa as contas', () => {
  const a = amb();
  assert.equal(a.api(a.sDir, 'salvar', a.contrato({ inicio: a.dia(-10), fim: a.dia(400) })).ok, true);
  // primeira rodada: grava o início da contagem (ninguém cai no primeiro dia, mesmo conta antiga)
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-con', { CLIENTE_ULTIMA_ENTRADA_EM: '2025-01-01T08:00:00' });
  let r = j(a.ctx.PortalCliente_rotinaAcessos_({ hoje: a.hoje }));
  assert.equal(r.inativadasInatividade, 0); assert.equal(r.avisos, 0);
  assert.equal(a.ctx.PClA_regras_().inatividadeDesde, a.hoje);
  // a Metrolabs marca "manter" na Carla (com motivo)
  assert.equal(a.api(a.sGer, 'manter', { usuarioId: 'u-cla', manter: true, motivo: 'Diretora usa o portal só em auditoria' }).ok, true);
  // 95 dias depois: aviso (uma vez) para quem não tem "manter"
  r = j(a.ctx.PortalCliente_rotinaAcessos_({ hoje: a.dia(95) }));
  assert.ok(r.avisos >= 2, JSON.stringify(r)); assert.equal(r.inativadasInatividade, 0);
  assert.ok(a.conta('u-sol').CLIENTE_INATIVIDADE_AVISO_EM); assert.ok(!a.conta('u-cla').CLIENTE_INATIVIDADE_AVISO_EM, 'quem tem "manter" não é avisado');
  r = j(a.ctx.PortalCliente_rotinaAcessos_({ hoje: a.dia(96) }));
  assert.equal(r.avisos, 0, 'o aviso não se repete');
  // 125 dias: inativa só quem não tem "manter"
  r = j(a.ctx.PortalCliente_rotinaAcessos_({ hoje: a.dia(125) }));
  assert.ok(r.inativadasInatividade >= 2, JSON.stringify(r)); assert.equal(r.mantidas, 1);
  assert.equal(a.conta('u-sol').STATUS, 'INATIVO'); assert.match(a.conta('u-sol').CLIENTE_DESLIGADO_MOTIVO, /Sem entrada no Portal há 125 dias/);
  assert.equal(a.conta('u-cla').STATUS, 'ATIVO');
  // entrada recente zera a contagem: quem entrou no dia 100 não é avisado no dia 125 (nem inativado)
  const c = amb();
  c.ctx.PortalCliente_rotinaAcessos_({ hoje: c.hoje });
  c.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-clb', { CLIENTE_ULTIMA_ENTRADA_EM: c.dia(100) + 'T09:00:00' });
  j(c.ctx.PortalCliente_rotinaAcessos_({ hoje: c.dia(125) }));
  assert.equal(c.conta('u-clb').STATUS, 'ATIVO'); assert.ok(!c.conta('u-clb').CLIENTE_INATIVIDADE_AVISO_EM);
  assert.equal(c.conta('u-sol').STATUS, 'INATIVO');
  // fim do contrato (consulta encerrada = SEM_ACESSO): as contas ativas são inativadas com "Fim do contrato" e podem ser reativadas na renovação
  const b = amb();
  b.api(b.sAdm, 'revisar', { clienteId: 'cB', motivo: 'Cliente avulso, atende por orçamento' });
  assert.equal(b.ctx.PCl_situacaoAcesso_('cB', '', '').situacao, 'SEM_ACESSO');
  const rb = j(b.ctx.PortalCliente_rotinaAcessos_({ hoje: b.hoje }));
  assert.equal(rb.inativadasFimContrato, 1);
  assert.equal(b.conta('u-clb').STATUS, 'INATIVO'); assert.match(b.conta('u-clb').CLIENTE_DESLIGADO_MOTIVO, /^Fim do contrato/);
  assert.equal(b.api(b.sGer, 'reativarConta', { usuarioId: 'u-clb', motivo: 'Teste antes da renovação' }).codigo, 'SEM_CONTRATO');
  b.api(b.sAdm, 'revisar', { clienteId: 'cB', motivo: 'Contrato renovado em reunião', desfazer: true });
  b.api(b.sDir, 'salvar', b.contrato({ clienteId: 'cB', numero: 'CT-B-2' }));
  assert.equal(b.api(b.sGer, 'reativarConta', { usuarioId: 'u-clb', motivo: 'Contrato renovado em reunião' }).ok, true);
  assert.equal(b.conta('u-clb').STATUS, 'ATIVO');
  // regra desligável: sem inativar por fim de contrato
  b.api(b.sDir, 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', inativarFimContrato: false, avisoInatividadeDias: 60, inativarDias: 90, motivo: 'Teste das regras de inatividade' });
  const rr = b.ctx.PClA_regras_();
  assert.equal(rr.inativarFimContrato, false); assert.equal(rr.avisoInatividadeDias, 60); assert.equal(rr.inativarDias, 90);
  assert.equal(b.api(b.sDir, 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', avisoInatividadeDias: 60, inativarDias: 50, motivo: 'Teste da validação dos prazos' }).faltam[0].campo, 'pclRgInativar');
});

test('Minha equipe: só o Gestor do cliente; pedido de inclusão na Caixa de quem gere acessos; a Metrolabs envia o convite com um toque ou recusa com resposta', () => {
  const a = amb();
  [a.sA, a.sSol, a.sCon].forEach((s) => a.aceitar(s));
  // Solicitante e Consulta não abrem "Minha equipe" (recusa no servidor)
  const negado = a.api(a.sSol, 'equipe');
  assert.equal(negado.codigo, 'PAPEL'); assert.match(negado.message, /«Solicitante».*Gestor do cliente.*CARLA GESTORA A TESTE/);
  assert.equal(a.api(a.sCon, 'pedirEquipe', { nome: 'X' }).codigo, 'PAPEL');
  // o gestor vê a equipe, sem IP no registro
  const eq = a.api(a.sA, 'equipe');
  assert.equal(eq.ok, true, eq.message);
  assert.deepEqual(eq.pessoas.map((p) => p.id).sort(), ['u-cla', 'u-con', 'u-sol']);
  assert.ok(eq.registro.length > 0 && eq.registro.every((x) => x.ip === undefined && x.navegador === undefined));
  assert.doesNotMatch(JSON.stringify(eq), /200\.1\.2\.3/);
  // pedido de inclusão
  assert.deepEqual(a.api(a.sA, 'pedirEquipe', { nome: 'Rita', email: 'rita@', papel: 'SOLICITANTE', unidades: [], motivo: 'x' }).faltam.map((f) => f.campo), ['pclEqpEmail', 'pclEqpUnidades', 'pclEqpMotivo']);
  assert.match(a.api(a.sA, 'pedirEquipe', { nome: 'Bia', email: CLIB.EMAIL, papel: 'CONSULTA', unidades: ['uA1'], motivo: 'Nova farmacêutica' }).message, /já está em uso no SGO\+/, 'e-mail de outra empresa: não revela de quem é');
  const pd = a.api(a.sA, 'pedirEquipe', { nome: 'Rita Nova', email: 'rita@hospital-a.test', cargo: 'Enfermeira', papel: 'SOLICITANTE', unidades: ['uA2'], motivo: 'Nova responsável pela CME da filial' });
  assert.equal(pd.ok, true, pd.message);
  assert.equal(a.api(a.sA, 'pedirEquipe', { nome: 'Rita Nova', email: 'rita@hospital-a.test', papel: 'SOLICITANTE', unidades: ['uA2'], motivo: 'Nova responsável pela CME da filial' }).codigo, 'JA');
  const ped = a.linhas('PCL_PEDIDOS_EQUIPE')[0];
  assert.equal(ped.SITUACAO, 'PENDENTE'); assert.equal(ped.POR_ID, 'u-cla');
  // a Metrolabs vê e atende com um toque (o convite sai pelo mecanismo de sempre)
  const lista = a.api(a.sGer, 'pedidosEquipe', {});
  assert.equal(lista.pedidos.length, 1); assert.equal(lista.pedidos[0].cliente, 'HOSPITAL A TESTE');
  const at = a.api(a.sGer, 'tratarPedidoEquipe', { pedidoId: ped.ID, decisao: 'ATENDER' });
  assert.equal(at.ok, true, at.message);
  const rita = a.linhas('CAD_USUARIOS').find((u) => u.EMAIL === 'rita@hospital-a.test');
  assert.equal(rita.CLIENTE_PAPEL, 'SOLICITANTE'); assert.equal(rita.CLIENTE_UNIDADES_JSON, '["uA2"]');
  assert.equal(a.convites().length, 1);
  assert.equal(a.linhas('PCL_PEDIDOS_EQUIPE')[0].SITUACAO, 'ATENDIDO');
  assert.equal(a.api(a.sGer, 'tratarPedidoEquipe', { pedidoId: ped.ID, decisao: 'ATENDER' }).codigo, 'JA');
  // recusa exige resposta
  a.api(a.sA, 'pedirEquipe', { nome: 'Tereza Teste', email: 'tereza@hospital-a.test', papel: 'CONSULTA', unidades: ['uA1'], motivo: 'Auditoria interna da qualidade' });
  const p2 = a.linhas('PCL_PEDIDOS_EQUIPE').find((x) => x.EMAIL === 'tereza@hospital-a.test');
  assert.equal(a.api(a.sGer, 'tratarPedidoEquipe', { pedidoId: p2.ID, decisao: 'RECUSAR', resposta: 'não' }).faltam[0].campo, 'pclAcResposta');
  assert.equal(a.api(a.sGer, 'tratarPedidoEquipe', { pedidoId: p2.ID, decisao: 'RECUSAR', resposta: 'Use o e-mail individual dela, não o da qualidade.' }).ok, true);
  assert.equal(a.api(a.sA, 'equipe').pedidos.find((x) => x.email === 'tereza@hospital-a.test').situacao, 'RECUSADO');
  // troca de e-mail: só a Metrolabs; convite novo para o e-mail novo, o antigo deixa de valer; sessões caem
  const sRita = null; // Rita ainda não criou a senha
  const te = a.api(a.sGer, 'trocarEmail', { usuarioId: rita.ID, email: 'rita.nova@hospital-a.test', motivo: 'E-mail corporativo novo' });
  assert.equal(te.ok, true, te.message); assert.match(te.message, /convite novo foi para rita\.nova@hospital-a\.test/);
  assert.equal(a.convites().length, 2); assert.equal(a.convites()[1].to, 'rita.nova@hospital-a.test');
  assert.equal(a.conta(rita.ID).EMAIL, 'rita.nova@hospital-a.test');
  assert.equal(a.api(a.sGer, 'trocarEmail', { usuarioId: rita.ID, email: CLIB.EMAIL, motivo: 'Teste de e-mail repetido' }).codigo, 'EMAIL_EM_USO');
  void sRita;
});

// ------------------------------------------------------------------------------------------------------------------
// "Meus chamados" (Assistência) com o Portal do cliente: T1.2 (chamados), T1.3 e T1.4
// ------------------------------------------------------------------------------------------------------------------
function ambAst() {
  const base = AST.ambiente({});
  const usuarios = base.tabelas.CAD_USUARIOS.slice();
  void base;
  const a = AST.ambiente({
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente.js'],
    tabelas: {
      CAD_USUARIOS: usuarios.concat([
        { ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_con', USUARIO: 'celia.alfa', NOME: 'CELIA CONSULTA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_sol2', USUARIO: 'saulo.alfa', NOME: 'SAULO SOLICITANTE FILIAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'saulo@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1b"]' }
      ]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', ENDERECO: 'Rua Filial, 20', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  });
  a.pcl = (sid, acao, d) => j(a.ctx.PortalCliente_api(sid, acao, d || {}));
  a.aceitar = (sid) => { const t = a.pcl(sid, 'minhaConta').termo; const r = a.pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); assert.equal(r.ok, true, r.message); };
  ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_saulo.alfa'].forEach(a.aceitar);
  return a;
}
const PEDIDO = { descricao: 'A autoclave não completa o ciclo e apita no final da secagem', parada: 'PARCIAL', solicitante: 'Sonia', contato: '62999998888', origem: 'PORTAL' };

test('T1.2 e T1.3 em "Meus chamados": Solicitante só vê e pede nas unidades dele; Consulta não pede nem confirma, mesmo chamando a ação direto', () => {
  const a = ambAst();
  // chamados em duas unidades do mesmo cliente
  const c1 = AST.abrirChamado(a, { equipamentoId: 'eq1', unidadeId: 'un1' });
  const c2 = AST.abrirChamado(a, { equipamentoId: 'eq4', unidadeId: 'un1b' });
  const po = a.api('s_sonia.alfa', 'portal', {});
  assert.equal(po.ok, true, po.message);
  assert.deepEqual(po.chamados.map((c) => c.id), [c1.id], 'só o chamado da unidade dela');
  assert.deepEqual(po.equipamentos.map((e) => e.id).sort(), ['eq1', 'eq2']);
  assert.equal(po.acessoPortal.papel, 'SOLICITANTE'); assert.equal(po.acessoPortal.podeAbrir, true); assert.equal(po.acessoPortal.podeAprovar, false);
  assert.ok(po.painel.kanban.every((k) => k.itens.every((x) => x.id !== c2.id)), 'o painel também é filtrado');
  // o Gestor (conta antiga, todas) vê os dois
  assert.equal(a.api('s_cliente.alfa', 'portal', {}).chamados.length, 2);
  // relatório do chamado de outra unidade: a mesma resposta de inexistente + ESCOPO_RECUSADO
  const fora = a.api('s_sonia.alfa', 'relatorioAtendimento', { id: c2.id }), inexistente = a.api('s_sonia.alfa', 'relatorioAtendimento', { id: 'nao-existe' });
  assert.equal(fora.ok, false); assert.equal(fora.message, inexistente.message);
  assert.ok(a.tabelas.PCL_ACESSOS.some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === c2.id));
  // pedir atendimento: equipamento de outra unidade = inexistente; da unidade dela = entra na fila
  const pfora = a.api('s_sonia.alfa', 'solicitar', Object.assign({ equipamentoId: 'eq4' }, PEDIDO));
  const pinex = a.api('s_sonia.alfa', 'solicitar', Object.assign({ equipamentoId: 'nao-existe' }, PEDIDO));
  assert.equal(pfora.ok, false); assert.equal(pfora.message, pinex.message);
  const pok = a.api('s_sonia.alfa', 'solicitar', Object.assign({ equipamentoId: 'eq1' }, PEDIDO));
  assert.equal(pok.ok, true, pok.message);
  // T1.3: Consulta não pede (mesmo chamando direto), com o papel e o caminho na mensagem
  const pc = a.api('s_celia.alfa', 'solicitar', Object.assign({ equipamentoId: 'eq1' }, PEDIDO));
  assert.equal(pc.ok, false); assert.match(pc.message, /«Consulta».*Por quê: .*O que fazer: /);
  assert.equal(a.tabelas.ATEC_SOLICITACOES.filter((s) => s.POR_ID === 'u_con').length, 0);
  // Consulta não confirma atendimento e não gera o relatório do período; vê o portal só da unidade dela, sem o botão de pedir
  const cf = a.api('s_celia.alfa', 'confirmarAtendimento', { id: c1.id, confirmo: true });
  assert.equal(cf.ok, false); assert.match(cf.message, /«Consulta»/);
  assert.match(a.api('s_celia.alfa', 'relatorioPeriodoCliente', { dias: 90 }).message, /«Consulta»/);
  const pcons = a.api('s_celia.alfa', 'portal', {});
  assert.equal(pcons.acessoPortal.podeAbrir, false); assert.deepEqual(pcons.chamados.map((c) => c.id), [c1.id]);
  // 18/11/2026 (etapa 5, T5.3): o Solicitante deixou de ser recusado; o relatório do período sai filtrado pelas unidades dele
  // (provado em tests/portal-cliente-etapa5-20261118.test.cjs, com os documentos A4 carregados)
  assert.doesNotMatch(String(a.api('s_sonia.alfa', 'relatorioPeriodoCliente', { dias: 90 }).message || ''), /unidades específicas/);
  // termo pendente trava os envios (versão nova do termo)
  a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS || '{}'), { termoVersao: '2099-01-01' }));
  const semTermo = a.api('s_sonia.alfa', 'solicitar', Object.assign({ equipamentoId: 'eq1' }, PEDIDO));
  assert.equal(semTermo.ok, false); assert.match(semTermo.message, /Termo de uso/);
});

test('T1.4: só o Gestor do cliente responde orçamento (aprovar, ajuste ou recusa); o Solicitante recebe o nome do gestor; orçamento de outra unidade é inexistente', () => {
  const a = ambAst();
  const c1 = AST.abrirChamado(a, { equipamentoId: 'eq1', unidadeId: 'un1' });
  const c2 = AST.abrirChamado(a, { equipamentoId: 'eq4', unidadeId: 'un1b' });
  a.tabelas.ATEC_ORCAMENTOS = (a.tabelas.ATEC_ORCAMENTOS || []).concat([
    { ID: 'orc1', NUMERO: 'ORC-2026-0001', REVISAO: 1, CHAMADO_ID: c1.id, CHAMADO_NUMERO: c1.numero, CLIENTE_ID: 'c1', ITENS_JSON: '[]', VALOR_TOTAL: 100, VALIDADE: '2026-12-31', SITUACAO: 'EMITIDO' },
    { ID: 'orc2', NUMERO: 'ORC-2026-0002', REVISAO: 1, CHAMADO_ID: c2.id, CHAMADO_NUMERO: c2.numero, CLIENTE_ID: 'c1', ITENS_JSON: '[]', VALOR_TOTAL: 200, VALIDADE: '2026-12-31', SITUACAO: 'EMITIDO' }]);
  const resp = { id: 'orc1', decisao: 'RECUSADO', nome: 'Carla Gestora Alfa', email: 'sonia@alfa.exemplo.test', texto: 'Valor acima do previsto para este trimestre' };
  const sol = a.api('s_sonia.alfa', 'responderOrcamento', resp);
  assert.equal(sol.ok, false); assert.match(sol.message, /Gestor do cliente.*CLIENTE ALFA TESTE/);
  assert.equal(a.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === 'orc1').SITUACAO, 'EMITIDO', 'nada mudou');
  const con = a.api('s_celia.alfa', 'responderOrcamento', Object.assign({}, resp, { decisao: 'APROVADO' }));
  assert.equal(con.ok, false); assert.match(con.message, /«Consulta»/);
  // o Solicitante da filial nem vê o orçamento da matriz: inexistente
  const filial = a.api('s_saulo.alfa', 'responderOrcamento', resp), inex = a.api('s_saulo.alfa', 'responderOrcamento', Object.assign({}, resp, { id: 'nao-existe' }));
  assert.equal(filial.message, inex.message);
  assert.deepEqual((a.api('s_saulo.alfa', 'portal', {}).orcamentos || []).map((o) => o.id), ['orc2']);
  assert.deepEqual((a.api('s_sonia.alfa', 'portal', {}).orcamentos || []).map((o) => o.id), ['orc1']);
  // o Gestor (conta antiga sem papel = Gestor) responde
  const g = a.api('s_cliente.alfa', 'responderOrcamento', resp);
  assert.equal(g.ok, true, g.message);
  assert.equal(a.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === 'orc1').SITUACAO, 'RECUSADO');
});

test('avisos por e-mail: PI02 a quem gere acessos (pedido e desligamento pelo cliente) e PC09 à pessoa e ao gestor; nunca WhatsApp para o cliente', () => {
  const a = ambAst();
  const antes = a.emails.length, whatsAntes = a.whats.length;
  const pd = a.pcl('s_cliente.alfa', 'pedirEquipe', { nome: 'Rita Nova', email: 'rita@alfa.exemplo.test', papel: 'SOLICITANTE', unidades: ['un1b'], motivo: 'Nova responsável pela CME da filial' });
  assert.equal(pd.ok, true, pd.message);
  const internos = a.emails.slice(antes).filter((e) => /Pedido de acesso ao Portal do cliente/.test(e.subject));
  assert.ok(internos.length >= 1, 'quem gere acessos recebe');
  assert.ok(internos.every((e) => !/alfa\.exemplo\.test$/.test(String(e.to)) || /rita/.test(e.body)), 'não vai para o cliente');
  // pendência na central (Caixa de decisões) para a gestão; nunca para a conta de cliente
  const itensG = a.pend('s_gil');
  assert.ok(itensG.some((x) => x.tipo === 'pcl_pedido_equipe'), JSON.stringify(itensG.map((x) => x.tipo)));
  assert.ok(!a.pend('s_cliente.alfa').some((x) => x.tipo === 'pcl_pedido_equipe'));
  // desligamento pelo gestor do cliente: e-mail à pessoa (PC09, sem motivo interno) e aviso à Metrolabs
  const n2 = a.emails.length;
  const dl = a.pcl('s_cliente.alfa', 'desligarPessoa', { usuarioId: 'u_sol2', motivo: 'Saiu da empresa em novembro' });
  assert.equal(dl.ok, true, dl.message);
  const novos = a.emails.slice(n2);
  const pessoa = novos.find((e) => String(e.to).indexOf('saulo@alfa.exemplo.test') >= 0);
  assert.ok(pessoa, 'a pessoa desligada recebe'); assert.match(pessoa.subject, /Metrolabs — Acesso ao Portal do cliente desligado/); assert.doesNotMatch(pessoa.body || pessoa.htmlBody || '', /Saiu da empresa/);
  assert.ok(novos.some((e) => /Acesso desligado pelo cliente/.test(e.subject)), 'a Metrolabs é avisada');
  assert.equal(a.whats.length, whatsAntes, 'nenhum WhatsApp');
});

test('tela, ajuda e manual: aba Acessos, Minha conta e equipe, termo; explicação de cada campo; manual e ajuda atualizados; sem alert/confirm', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html'), tela = ler('JS_PortalCliente_Acessos.html'), aj = ler('JS_PortalCliente_Ajuda.html'), ast = ler('JS_Assistencia.html');
  assert.match(idx, /id="menu-btn-portal_cliente_acessos"/); assert.match(idx, /id="menu-btn-portal_cliente_conta"/); assert.match(idx, /include\('JS_PortalCliente_Acessos'\)/);
  assert.match(core, /mod === "portal_cliente_acessos"/); assert.match(core, /mod === "portal_cliente_conta"/);
  assert.match(core, /portal_cliente_acessos: "Acessos de clientes"/); assert.match(core, /portal_cliente_conta: "Minha conta e equipe"/);
  // campos de formulário (input, select, textarea) e as caixas de unidades da tela nova, mais os campos novos de Regras do portal
  const ids = [...tela.matchAll(/<(?:input|select|textarea)[^>]* id="(pcl[A-Za-z]+)"/g), ...tela.matchAll(/id="(pcl[A-Za-z]+Unidades)"/g)].map((m) => m[1])
    .concat([...ler('JS_PortalCliente.html').matchAll(/id="(pclRg(?:Convite|AvisoInatividade|Inativar|FimContrato|Encarregado|Termo))"/g)].map((m) => m[1]));
  assert.ok(ids.length >= 12, 'campos na tela: ' + ids.length);
  const semDica = [...new Set(ids)].filter((id) => !new RegExp('\\b' + id + ':').test(aj));
  assert.deepEqual(semDica, [], 'todo campo da tela tem explicação (PCL_DICAS)');
  assert.match(aj, /acessos: \[/); assert.match(aj, /equipe: \[/); assert.match(aj, /conta: \[/);
  assert.doesNotMatch(tela, /window\.(confirm|prompt|alert)\(|\balert\(/);
  assert.match(tela, /text-align: ?justify/);
  assert.match(ast, /acessoPortal/);
  const ctx = vm.createContext({}); vm.runInContext(ler('SGO_Ajuda_PortalCliente.js'), ctx);
  const telas = ctx.SGO_ajudaTelas_PortalCliente_();
  ['portal_cliente_acessos', 'portal_cliente_conta'].forEach((k) => { const t = telas[k]; assert.ok(t && t.titulo && t.paraQueServe && t.passos.length >= 3 && t.problemas.length >= 3, k); });
  const man = lerDoc('MANUAL_MODULO_PORTAL_CLIENTE.md');
  assert.match(man, /## 23\. Acessos de clientes/); assert.match(man, /papel não revisado/); assert.match(man, /Termo de uso/); assert.match(man, /120 dias/);
  assert.match(man, /Gestor do cliente/); assert.match(man, /PCL_PEDIDOS_EQUIPE/);
});
