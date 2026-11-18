// 18/11/2026 — Portal do cliente, ETAPA 4 (d): AVISOS AO CLIENTE POR E-MAIL (output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md, "Etapa 4 (d)",
// itens 4.1.10 e 4.7, testes T4.1 a T4.8). Código real num vm, com o ambiente da Assistência técnica (tests/_assistencia_ambiente.cjs: planilha,
// Drive, e-mail e relógio simulados; o relógio começa numa segunda-feira, 19/10/2026, às 10h) e o Portal do cliente inteiro carregado junto.
// Nenhum e-mail sai de verdade: o MailApp do ambiente só guarda a mensagem numa lista.
// Clientes fictícios: c1 (Hospital Teste Alfa) com 2 unidades (un1 e un1b) e contas Gestor antigo (todas as unidades), Solicitante (un1),
// Consulta (un1), Solicitante (un1b) e Gestor só da un1b; c2 (Clínica Teste Beta) com uma conta; c3 (Laboratório Teste Gama) SEM portal,
// com o e-mail no cadastro da unidade. Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa4-20261118.test.cjs
// Com PCL_MODELOS_DIR=<pasta>, o último teste grava a prévia HTML de cada modelo de e-mail ao cliente nessa pasta.
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
const ok = AST.ok;
const FOTO = { nome: 'visor.jpg', tipo: 'image/jpeg', base64: Buffer.alloc(1200, 9).toString('base64') };
const CLIENTE_DOM = /@(alfa|beta|gama)\.exemplo\.test$/;

function amb(opcoes) {
  const base = AST.ambiente({});
  const a = AST.ambiente(Object.assign({}, {
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
      'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js', 'SGO_DocumentosPastas.js', 'SGO_PortalCliente_Documentos.js', 'SGO_Equipamentos.js',
      'SGO_PortalCliente_Avisos.js'],
    tabelas: {
      CAD_USUARIOS: base.tabelas.CAD_USUARIOS.concat([
        { ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_con', USUARIO: 'celia.alfa', NOME: 'CELIA CONSULTA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_sol2', USUARIO: 'saulo.alfa', NOME: 'SAULO SOLICITANTE FILIAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'saulo@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1b"]' },
        { ID: 'u_ges2', USUARIO: 'gina.alfa', NOME: 'GINA GESTORA FILIAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'gina@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'GESTOR', CLIENTE_UNIDADES_JSON: '["un1b"]' }
      ]),
      CAD_CLIENTES: base.tabelas.CAD_CLIENTES.concat([{ ID: 'c3', RAZAO_SOCIAL: 'LABORATORIO TESTE GAMA', NOME_FANTASIA: 'Laboratório Teste Gama', CNPJ: '', ENDERECO: 'Rua Gama, 3', EMAIL: 'compras@gama.exemplo.test', STATUS: 'ATIVO' }]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([
        { ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', ENDERECO: 'Rua Filial, 20', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO', EMAIL: 'filial@alfa.exemplo.test' },
        { ID: 'un3', CLIENTE_ID: 'c3', NOME_UNIDADE: 'Sede Gama', ENDERECO: 'Rua Gama, 3', CIDADE: 'Goiânia', UF: 'GO', RESPONSAVEL: 'Lara Responsável Teste', TELEFONE: '62977776666', EMAIL: 'lab@gama.exemplo.test', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.concat([
        { ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' },
        { ID: 'eq5', CLIENTE_ID: 'c3', UNIDADE_ID: 'un3', TIPO: 'Estufa', MODELO: 'E5', SERIE: 'S-500', TAG: 'ES-05', SETOR: 'Laboratório', STATUS: 'ATIVO' }])
    }
  }, opcoes && opcoes.ambiente || {}));
  // as cenas dos testes T4.1 a T4.8 olham só as pessoas do portal: a cópia ao cadastro (ligada por padrão na transição) fica desligada aqui;
  // o teste 'ajustes de transição' prova o padrão ligado
  if (!(opcoes && opcoes.copiaPadrao)) a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS || '{}'), { copiaCadastro: false }));
  a.pcl = (sid, acao, d) => { a.ctx.PCl_memoLimpar_(); const r = j(a.ctx.PortalCliente_api(sid, acao, d || {})); if (a.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
  a.aceitar = (sid) => { const t = a.pcl(sid, 'minhaConta').termo; const r = a.pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); assert.equal(r.ok, true, r.message); };
  ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_saulo.alfa', 's_gina.alfa', 's_cliente.beta'].forEach(a.aceitar);
  a.lin = (n) => a.tabelas[n] || [];
  a.hoje = () => a.ctx.PCl_hoje_();
  a.ctx.SGO_DATA.getByField = () => null;
  a.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://sgo.teste/' });
  /** E-mails a clientes (domínios de teste dos clientes) a partir da posição n. */
  a.cli = (n) => a.emails.slice(n || 0).filter((e) => CLIENTE_DOM.test(String(e.to)));
  a.para = (lista) => lista.map((e) => String(e.to)).sort();
  a.rotina = () => j(a.ctx.PortalCliente_rotinaChamados_({}));
  return a;
}
function pedido(extra) {
  return Object.assign({ unidadeId: 'un1', equipamentoId: 'eq1', setor: 'CME', sintoma: 'A autoclave interrompe o ciclo na secagem e mostra alarme de pressão em todos os ciclos desde ontem',
    inicio: 'ontem às 7h', codigoErro: 'E-07', situacao: 'TOTAL', risco: 'Pode não esterilizar a carga', tentado: 'Reiniciamos e limpamos o filtro',
    contatoNome: 'Rui Responsável', contatoTelefone: '(62) 98888-7777', contatoEmail: 'rui@alfa.exemplo.test', horario: 'Seg a sex, 13h às 17h', fotos: [FOTO] }, extra || {});
}
function converter(a, solId) { return ok(a.api('s_gil', 'converter', { solicitacaoId: solId, prioridade: 'P2', confirmarDuplicado: true })).chamado; }
function triar(a, chId, acao, extra) {
  return ok(a.api('s_gil', 'triagem', Object.assign({ id: chId, checklist: { sintomas_confirmados: 'Confirmado com o responsável', risco_operar: 'Médio: não usar até o conserto', diagnostico_preliminar: 'Provável falha na resistência' },
    tipoCodigo: 'MANUTENCAO_CORRETIVA', acao: acao || 'PLANEJADO' }, extra || {})));
}
/** Chamado do portal de Sonia (un1), aceito e triado para visita. */
function chamadoDoPortal(a, sid, extra) {
  const p = a.pcl(sid || 's_sonia.alfa', 'abrir', pedido(Object.assign({ confirmarRepetido: true }, extra || {})));
  assert.equal(p.ok, true, p.message);
  const ch = converter(a, p.solicitacao.id);
  return { p, ch };
}
/** Contrato vigente do cliente c1 (Portal do cliente > Contratos). */
function contrato(a, extra) {
  const r = a.pcl('s_dora', 'salvar', Object.assign({ clienteId: 'c1', unidades: [], numero: 'CT-ALFA-2026', objeto: 'Manutenção preventiva e corretiva das autoclaves', origemTipo: 'ASSINADO',
    servicos: [{ servico: 'MANUTENCAO_CORRETIVA', periodicidade: 'SOB_DEMANDA' }], inicio: '2026-01-01', fim: '2027-06-30', responsavelId: 'u_gc', motivo: 'Contrato assinado com o cliente (teste)' }, extra || {}));
  assert.equal(r.ok, true, r.message);
  return a.lin('CLI_CONTRATOS').find((k) => k.NUMERO === ((extra && extra.numero) || 'CT-ALFA-2026'));
}
/** Documentos do Arquivo de documentos (datas relativas ao dia de hoje do relógio). */
function semearDocs(a) {
  const d = (n) => a.ctx.PCl_diaMais_(a.hoje(), n), doc = (o) => Object.assign({ STATUS: 'ATIVO', CRIADO_EM: d(-40) + 'T10:00:00' }, o);
  a.tabelas.DOC_DOCUMENTOS.push(
    doc({ ID: 'd1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01 2025.pdf', LINK_ARQUIVO: '/arquivos/arqCert1xxxx', DATA_EMISSAO: d(-30), DATA_VENCIMENTO: d(20) }),
    doc({ ID: 'd3', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: 'Laudo NR-13', NOME_ARQUIVO: 'Laudo NR-13 AC-01.pdf', LINK_ARQUIVO: '/arquivos/arqNr131xxx', DATA_EMISSAO: d(-400), DATA_VENCIMENTO: d(-5) }),
    doc({ ID: 'd4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '1. Manutenção preventiva', NOME_ARQUIVO: 'Relatório de manutenção preventiva LV-02.pdf', LINK_ARQUIVO: '/arquivos/arqMan2xxxxx', DATA_EMISSAO: d(-20), DATA_VENCIMENTO: d(45) }),
    doc({ ID: 'd7', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado SL-04.pdf', LINK_ARQUIVO: '/arquivos/arqCert4xxxx', DATA_EMISSAO: d(-370), DATA_VENCIMENTO: d(-2) }),
    doc({ ID: 'd8', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado ES-03.pdf', LINK_ARQUIVO: '/arquivos/arqCert3xxxx', DATA_EMISSAO: d(-30), DATA_VENCIMENTO: d(15) }));
  a.ctx.PCl_memoLimpar_();
}
const corpo = (e) => String(e.body || '') + '\n' + String(e.htmlBody || '');

test('T4.1: cada evento chega às pessoas certas por papel e unidade (PC02, PC03, PC01 da equipe, PC04, PC05, PC03 cancelada)', () => {
  const a = amb();
  // PC02: pedido aceito — quem abriu (Solicitante da un1) e o Gestor do cliente da un1; nunca a Consulta, o Solicitante e a Gestora da filial
  const e0 = a.emails.length;
  const { p, ch } = chamadoDoPortal(a);
  const pc02 = a.cli(e0).filter((e) => /aceito: chamado/.test(e.subject));
  assert.deepEqual(a.para(pc02), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  assert.ok(pc02.every((e) => e.subject.indexOf('Metrolabs — Pedido ' + p.solicitacao.numero) === 0 && e.name === 'Metrolabs'), 'assunto "Metrolabs — <número>" sem o prefixo do sistema');
  assert.ok(!a.cli(e0).some((e) => /Recebemos o seu chamado/.test(e.subject)), 'a conversão do pedido do portal não manda o e-mail antigo ao cadastro');
  // PC03: visita agendada — quem abriu e o Gestor da unidade; o e-mail da unidade no cadastro (rui@) não recebe
  triar(a, ch.id);
  const e1 = a.emails.length;
  ok(AST.agendar(a, ch.id, '2026-10-21T09:00'));
  const pc03 = a.cli(e1);
  assert.deepEqual(a.para(pc03), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  assert.match(pc03[0].subject, /^Metrolabs — Chamado CH-2026-\d{4}: visita agendada para 21\/10\/2026$/);
  assert.match(corpo(pc03[0]), /21\/10\/2026 às 09:00/); assert.match(corpo(pc03[0]), /Técnico: Tiago Tecnico\./);
  assert.ok(pc03.every((e) => !/rui@|compras@/.test(String(e.to))));
  // PC01 de chamado registrado pela equipe (telefone) na filial: os gestores com a filial (Gestor antigo e Gestora da filial), na hora
  const e2 = a.emails.length;
  const chF = AST.abrirChamado(a, { unidadeId: 'un1b', equipamentoId: 'eq4' });
  const pc01 = a.cli(e2);
  assert.deepEqual(a.para(pc01), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test']);
  assert.match(pc01[0].subject, /^Metrolabs — Chamado CH-2026-\d{4} registrado$/);
  assert.ok(!pc01.some((e) => /filial@|saulo@/.test(String(e.to))), 'nem o e-mail do cadastro da unidade nem o Solicitante (não é gestor)');
  // PC04: orçamento para aprovação — só o Gestor do cliente da unidade, sem valores
  triar(a, chF.id, 'AGUARDANDO_ORCAMENTO', { orcamentoDescricao: 'Troca da placa (fora do contrato)' });
  const orc = a.lin('ATEC_ORCAMENTOS').filter((o) => o.CHAMADO_ID === chF.id).pop();
  ok(a.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Mão de obra', quantidade: 1, valorUnitario: 350 }], condicoes: 'Pagamento em 28 dias' }));
  const e3 = a.emails.length;
  ok(a.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  const pc04 = a.cli(e3);
  assert.deepEqual(a.para(pc04), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test']);
  assert.match(pc04[0].subject, /orçamento para aprovação$/);
  assert.ok(pc04.every((e) => !/350|R\$/.test(corpo(e))), 'sem valores');
  // PC05: atendimento concluído (gancho do relatório da O.S.) — quem abriu e o Gestor da unidade
  const e4 = a.emails.length;
  const linha = a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch.id);
  a.ctx.Ast_avisarCliente_(linha, 'Atendimento concluído: O.S. OS-0099', 'Texto antigo do cadastro', 'AT08', { cod: 'PC05', tipo: 'CONCLUIDO', osId: 'osX', osNumero: 'OS-0099', encerradaEm: '2026-10-19T09:40:00' });
  const pc05 = a.cli(e4);
  assert.deepEqual(a.para(pc05), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  assert.match(pc05[0].subject, /: atendimento concluído$/); assert.match(corpo(pc05[0]), /O problema continua/);
  assert.match(ler('SGO_Assistencia_Relatorio.js'), /cod: 'PC05', tipo: 'CONCLUIDO'/, 'o relatório da O.S. chama o aviso do portal');
  assert.match(ler('SGO_Assistencia_Relatorio.js'), /cod: 'PC05', tipo: 'LOGISTICA'/);
  // PC03 cancelada: a Metrolabs cancela o chamado com visita marcada; o motivo interno não vai ao e-mail
  const e5 = a.emails.length;
  ok(a.api('s_gil', 'cancelar', { id: ch.id, motivo: 'Cliente desistiu por telefone, combinado com o setor' }));
  const canc = a.cli(e5);
  assert.deepEqual(a.para(canc), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  assert.match(canc[0].subject, /: visita cancelada$/); assert.doesNotMatch(corpo(canc[0]), /desistiu/);
  // cliente que cancela pelo Portal não recebe "visita cancelada" de volta
  const { ch: ch2 } = chamadoDoPortal(a, 's_sonia.alfa', { equipamentoId: 'eq2' });
  triar(a, ch2.id); ok(AST.agendar(a, ch2.id, '2026-10-22T09:00'));
  const e6 = a.emails.length;
  const cc = a.pcl('s_sonia.alfa', 'cancelar', { tipo: 'CHAMADO', id: ch2.id, motivo: 'O equipamento voltou a funcionar depois de reiniciar' });
  assert.equal(cc.ok, true, cc.message);
  assert.equal(a.cli(e6).filter((e) => /visita cancelada/.test(e.subject)).length, 0);
  assert.equal(a.whats.length, 0, 'nunca WhatsApp');
});

test('T4.2: endereço repetido recebe uma vez só (no mesmo envio, entre caminhos e na repetição do mesmo aviso)', () => {
  const a = amb();
  // o Gestor do cliente abre o pedido: é "quem abriu" e "gestor da unidade" — um e-mail só no aceite
  const e0 = a.emails.length;
  const { ch } = chamadoDoPortal(a, 's_cliente.alfa', { contatoEmail: 'cli@alfa.exemplo.test' });
  assert.equal(a.cli(e0).filter((e) => /recebido/.test(e.subject)).length, 1, 'contato no local com o mesmo e-mail de quem abriu: um PC01');
  assert.equal(a.cli(e0).filter((e) => /aceito/.test(e.subject)).length, 1, 'quem abriu e gestor ao mesmo tempo: um PC02');
  // o mesmo aviso de novo (mesma chave): nada sai, e fica uma linha por endereço no registro
  const linha = a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch.id);
  const pc = { cod: 'PC05', tipo: 'CONCLUIDO', osId: 'osDup', osNumero: 'OS-0077', encerradaEm: '2026-10-19T09:40:00' };
  const e1 = a.emails.length;
  a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT08', pc);
  a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT08', pc);
  assert.equal(a.cli(e1).length, 1);
  assert.equal(a.lin('PCL_AVISOS_ENVIOS').filter((r) => r.CHAVE === 'PC05:osDup').length, 1);
  // cópia ao cadastro ligada, com o e-mail da unidade igual ao de uma pessoa do portal: continua um e-mail por endereço
  a.tabelas.CAD_UNIDADES.find((u) => u.ID === 'un1').EMAIL = 'cli@alfa.exemplo.test';
  a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS || '{}'), { copiaCadastro: true }));
  const e2 = a.emails.length;
  a.ctx.PCl_memoLimpar_();
  a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT08', { cod: 'PC05', tipo: 'CONCLUIDO', osId: 'osDup2', osNumero: 'OS-0078', encerradaEm: '2026-10-19T09:50:00' });
  assert.deepEqual(a.para(a.cli(e2)), ['cli@alfa.exemplo.test']);
  // envio central: lista com o mesmo endereço em maiúsculas e minúsculas
  const r = j(a.ctx.PCl_enviarCliente_({ evento: 'PC03', clienteId: 'c1', refId: 'x', titulo: 'Metrolabs — Teste', texto: 'Texto', imediato: true,
    pessoas: [{ email: 'Sonia@Alfa.Exemplo.Test', nome: 'Sonia' }, { email: 'sonia@alfa.exemplo.test', nome: 'Sonia' }] }));
  assert.equal(r.destinos.length, 1); assert.equal(r.repetidos, 1);
});

test('T4.3: preferência desligada bloqueia só PC06, PC07 e PC08; PC06 resume as mensagens a cada 2 horas úteis, sem o texto e sem nota interna', () => {
  const a = amb();
  semearDocs(a);
  // a Gestora da filial desliga PC08 antes da primeira rodada (que marca o início dos avisos e manda os vencimentos da semana)
  ok(a.pcl('s_gina.alfa', 'salvarMeusDados', { nome: 'GINA GESTORA FILIAL TESTE', cargo: '', telefone: '', avisos: { PC08: false } }));
  const e00 = a.emails.length;
  a.rotina();
  assert.deepEqual(a.para(a.cli(e00).filter((e) => /Vencimentos/.test(e.subject) && /@alfa./.test(String(e.to)))), ['cli@alfa.exemplo.test'], 'PC08 desligado pela Gestora da filial');
  // Sonia desliga os três opcionais; tentar desligar um obrigatório não tem efeito (não está na lista)
  const g = a.pcl('s_sonia.alfa', 'salvarMeusDados', { nome: 'SONIA SOLICITANTE TESTE', cargo: '', telefone: '', avisos: { PC06: false, PC07: false, PC08: false, PC03: false } });
  assert.equal(g.ok, true, g.message);
  const conta = a.pcl('s_sonia.alfa', 'minhaConta');
  assert.deepEqual(conta.avisos, { PC06: false, PC07: false, PC08: false });
  assert.equal(conta.avisosInfo.horario, '08:00 às 18:00'); assert.equal(conta.avisosInfo.gestor, false);
  // obrigatório continua: PC03 chega para Sonia
  const { p, ch } = chamadoDoPortal(a);
  triar(a, ch.id);
  const e0 = a.emails.length;
  ok(AST.agendar(a, ch.id, '2026-10-21T09:00'));
  assert.ok(a.cli(e0).some((e) => String(e.to) === 'sonia@alfa.exemplo.test'), 'PC03 é obrigatório');
  // PC06 desligado: a Metrolabs responde na conversa do pedido de Sonia e ninguém recebe o resumo
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p.solicitacao.id, texto: 'Bom dia. O técnico leva a peça de reposição.' }));
  a.mudar('2026-10-19T10:20:00-03:00');
  const e1 = a.emails.length;
  a.rotina();
  assert.equal(a.cli(e1).filter((e) => /mensagem/i.test(e.subject)).length, 0, 'Sonia desligou PC06');
  // PC06 ligado (Gestor que abriu o pedido): duas mensagens e uma nota interna -> um resumo, sem o texto
  const p2 = a.pcl('s_cliente.alfa', 'abrir', pedido({ equipamentoId: 'eq2', confirmarRepetido: true }));
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p2.solicitacao.id, texto: 'Pode enviar a foto da etiqueta?' }));
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p2.solicitacao.id, texto: 'Nota: cliente com histórico de reincidência', interna: true }));
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p2.solicitacao.id, texto: 'E também a do visor, por favor.' }));
  a.mudar('2026-10-19T10:40:00-03:00');
  const e2 = a.emails.length;
  a.rotina();
  const res = a.cli(e2).filter((e) => /mensagem/i.test(e.subject));
  assert.equal(res.length, 1); assert.equal(String(res[0].to), 'cli@alfa.exemplo.test');
  assert.match(res[0].subject, /^Metrolabs — Pedido SOL-2026-\d{4}: nova mensagem da Metrolabs$/);
  assert.match(corpo(res[0]), /2 mensagens/); assert.doesNotMatch(corpo(res[0]), /etiqueta|visor|reincid/);
  assert.match(corpo(res[0]), /Para deixar de receber este aviso/);
  // nova mensagem 20 minutos depois: espera completar 2 horas úteis desde o último resumo
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p2.solicitacao.id, texto: 'Chegou?' }));
  a.mudar('2026-10-19T11:00:00-03:00');
  const e3 = a.emails.length; a.rotina();
  assert.equal(a.cli(e3).filter((e) => /mensagem/i.test(e.subject)).length, 0, 'dentro das 2 horas úteis: espera');
  a.mudar('2026-10-19T12:45:00-03:00');
  const e4 = a.emails.length; a.rotina();
  const r2 = a.cli(e4).filter((e) => /mensagem/i.test(e.subject));
  assert.equal(r2.length, 1); assert.match(corpo(r2[0]), /1 mensagem, em 19\/10\/2026 10:40/);
  // PC07 e PC08 obedecem à preferência; o resto do cliente recebe
  a.tabelas.DOC_DOCUMENTOS.push({ ID: 'dNovo', STATUS: 'ATIVO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCertNovo1', DATA_EMISSAO: '2026-10-20', DATA_VENCIMENTO: '2027-10-20', CRIADO_EM: '2026-10-20T08:00:00' });
  a.mudar('2026-10-20T08:40:00-03:00');
  const e5 = a.emails.length; a.rotina();
  const pc07 = a.cli(e5).filter((e) => /Documentos novos/.test(e.subject));
  assert.deepEqual(a.para(pc07), ['celia@alfa.exemplo.test', 'cli@alfa.exemplo.test'], 'Sonia desligou PC07; a filial não vê a un1');
});

test('T4.4: fora do horário comercial o aviso espera o próximo horário útil, exceto PC01, PC03 no mesmo dia e PC09', () => {
  const a = amb();
  const { ch } = chamadoDoPortal(a);
  triar(a, ch.id);
  // segunda 19:30: visita para quarta -> fila (nada sai)
  a.mudar('2026-10-19T19:30:00-03:00');
  const e0 = a.emails.length;
  ok(AST.agendar(a, ch.id, '2026-10-21T09:00'));
  assert.equal(a.cli(e0).length, 0, 'PC03 de outro dia espera');
  assert.equal(a.lin('PCL_AVISOS_FILA').filter((f) => f.EVENTO === 'PC03' && f.SITUACAO === 'PENDENTE').length, 2);
  // PC01 sai na hora mesmo à noite
  const e1 = a.emails.length;
  ok(a.pcl('s_sonia.alfa', 'abrir', pedido({ equipamentoId: 'eq2', confirmarRepetido: true })));
  assert.ok(a.cli(e1).some((e) => /recebido/.test(e.subject)), 'PC01 na hora');
  // PC09 sai na hora mesmo à noite
  const e2 = a.emails.length;
  a.ctx.PClA_avisarAcesso_(a.lin('CAD_USUARIOS').find((u) => u.ID === 'u_sol2'), 'PAPEL', { papelNome: 'Consulta', unidades: 'Unidade Filial' });
  assert.ok(a.cli(e2).some((e) => String(e.to) === 'saulo@alfa.exemplo.test' && /^Metrolabs — Acesso ao Portal do cliente alterado$/.test(e.subject)), 'PC09 na hora');
  // terça 07:00 (antes das 08:00): visita no mesmo dia (15h) sai na hora; a fila ainda espera
  a.mudar('2026-10-20T07:00:00-03:00');
  const { ch: ch2 } = chamadoDoPortal(a, 's_sonia.alfa', { equipamentoId: 'eq1', confirmarRepetido: true });
  triar(a, ch2.id);
  const e3 = a.emails.length;
  ok(AST.agendar(a, ch2.id, '2026-10-20T15:00', { confirmarConflito: true, motivoConflito: 'Encaixe combinado com o técnico' }));
  assert.ok(a.cli(e3).some((e) => /visita agendada para 20\/10\/2026/.test(e.subject)), 'PC03 no mesmo dia sai na hora');
  a.rotina();
  assert.equal(a.lin('PCL_AVISOS_FILA').filter((f) => f.SITUACAO === 'PENDENTE').length >= 2, true, 'antes das 08:00 a fila não sai');
  // terça 08:05: a rotina envia a fila, uma vez cada
  a.mudar('2026-10-20T08:05:00-03:00');
  const e4 = a.emails.length; a.rotina();
  const saiu = a.cli(e4).filter((e) => /visita agendada para 21\/10\/2026/.test(e.subject));
  assert.deepEqual(a.para(saiu), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  assert.ok(saiu.every((e) => e.subject.indexOf('SGO+') < 0 && e.name === 'Metrolabs'));
  const e5 = a.emails.length; a.rotina();
  assert.equal(a.cli(e5).filter((e) => /21\/10\/2026/.test(e.subject)).length, 0, 'a fila sai uma vez');
  // 17:59 dentro; 18:00 fora (horário comercial do cliente, diferente do expediente da equipe, 17:30)
  a.mudar('2026-10-20T17:59:00-03:00'); assert.equal(a.ctx.PCl_horarioCliente_().dentro, true);
  a.mudar('2026-10-20T18:00:00-03:00'); assert.equal(a.ctx.PCl_horarioCliente_().dentro, false);
  // sábado e feriado nacional (02/11, Finados): fila
  a.mudar('2026-10-24T10:00:00-03:00'); assert.equal(a.ctx.PCl_horarioCliente_().dentro, false);
  a.mudar('2026-11-02T10:00:00-03:00'); assert.equal(a.ctx.PCl_horarioCliente_().dentro, false);
  // configurável em Regras do portal (com motivo e histórico)
  const rg = a.pcl('s_dora', 'regras', {});
  assert.equal(rg.avisos.avisosFim, '18:00'); assert.equal(rg.avisos.resumoHora, '08:30');
  const ruim = a.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', avisosIni: '19:00', avisosFim: '08:00', motivo: 'Teste de horário inválido' });
  assert.equal(ruim.ok, false); assert.equal(ruim.faltam[0].campo, 'pclRgAvIni');
  const bom = a.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', avisosIni: '07:30', avisosFim: '18:30', resumoHora: '09:00', conversaIntervaloMin: 90, motivo: 'Horário pedido pelos clientes (teste)' });
  assert.equal(bom.ok, true, bom.message);
  const r2 = a.pcl('s_dora', 'regras', {}).avisos;
  assert.equal(r2.avisosIni, '07:30'); assert.equal(r2.conversaIntervaloMin, 90); assert.ok(r2.avisosDesde, 'o início dos avisos continua gravado');
  assert.ok(a.lin('PCL_REGRAS_HIST').some((h) => /Horário pedido/.test(h.MOTIVO)));
});

test('T4.5: nenhum e-mail ao cliente leva anexo, valor, dado interno ou nome de outro cliente', () => {
  const a = amb();
  semearDocs(a);
  a.rotina();
  const { p, ch } = chamadoDoPortal(a);
  triar(a, ch.id);
  ok(AST.agendar(a, ch.id, '2026-10-21T09:00'));
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p.solicitacao.id, texto: 'O orçamento da peça é de R$ 900,00' }));
  const chB = AST.abrirChamado(a, { clienteId: 'c2', unidadeId: 'un2', equipamentoId: 'eq3' });
  triar(a, chB.id, 'AGUARDANDO_ORCAMENTO', { orcamentoDescricao: 'Troca do sensor' });
  const orc = a.lin('ATEC_ORCAMENTOS').filter((o) => o.CHAMADO_ID === chB.id).pop();
  ok(a.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'PECA', descricao: 'Sensor', quantidade: 1, valorUnitario: 900 }], condicoes: 'Pagamento em 28 dias' }));
  ok(a.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  a.mudar('2026-10-19T10:30:00-03:00'); a.rotina();
  const todos = a.cli(0);
  assert.ok(todos.length >= 6, 'e-mails ao cliente: ' + todos.length);
  todos.forEach((e) => {
    const t = e.subject + '\n' + corpo(e);
    assert.ok(!e.attachments, 'sem anexo: ' + e.subject);
    assert.doesNotMatch(t, /R\$|900|350|SGO\+ \|/, e.subject);
    assert.doesNotMatch(t, /u_sol|u_tec|tiago@|PRIORIDADE|P2\b|triagem/i, e.subject);
    if (/@alfa\./.test(String(e.to))) assert.doesNotMatch(t, /Beta|Gama/, 'nome de outro cliente');
    if (/@beta\./.test(String(e.to))) assert.doesNotMatch(t, /Alfa|Gama/, 'nome de outro cliente');
    assert.match(corpo(e), /Você recebe este e-mail porque/);
    assert.match(String(e.htmlBody), /Abrir no Portal do cliente/);
  });
  assert.ok(todos.some((e) => /@beta\./.test(String(e.to)) && /orçamento para aprovação/.test(e.subject)), 'PC04 da Beta');
  assert.equal(a.whats.length, 0, 'nunca WhatsApp para o cliente');
});

test('T4.6: cliente sem portal continua recebendo pelo e-mail do cadastro (AT08 e AT15); com portal, sem duplicar', () => {
  const a = amb();
  // c3 sem portal: e-mails antigos para a unidade no cadastro
  const e0 = a.emails.length;
  const c3 = AST.abrirChamado(a, { clienteId: 'c3', unidadeId: 'un3', equipamentoId: 'eq5' });
  triar(a, c3.id);
  ok(AST.agendar(a, c3.id, '2026-10-21T09:00'));
  const gama = a.emails.slice(e0).filter((e) => String(e.to) === 'lab@gama.exemplo.test');
  assert.ok(gama.some((e) => /Recebemos o seu chamado/.test(e.subject)), 'AT08 abertura');
  assert.ok(gama.some((e) => /Visita técnica agendada/.test(e.subject)), 'AT08 visita');
  assert.equal(a.lin('PCL_AVISOS_ENVIOS').filter((r) => r.CLIENTE_ID === 'c3').length, 0, 'o portal não entra');
  // AT15 (peça recebida) sem portal e com portal
  Object.assign(a.lin('ATEC_CHAMADOS').find((x) => x.ID === c3.id), { REQUISICAO_ID: 'req3', SITUACAO: 'AGUARDANDO_PECA' });
  const { ch } = chamadoDoPortal(a); triar(a, ch.id);
  Object.assign(a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch.id), { REQUISICAO_ID: 'req1', SITUACAO: 'AGUARDANDO_PECA' });
  const e1 = a.emails.length;
  a.ctx.Assistencia_pecaDisponivel_({ ID: 'req3', NUMERO: 'RC-0003' }, { id: 'u_cmp', nome: 'Carlos' });
  a.ctx.Assistencia_pecaDisponivel_({ ID: 'req1', NUMERO: 'RC-0001' }, { id: 'u_cmp', nome: 'Carlos' });
  const depois = a.emails.slice(e1);
  assert.ok(depois.some((e) => String(e.to) === 'lab@gama.exemplo.test' && /Peça recebida/.test(e.subject)), 'AT15 ao cadastro de quem não tem portal');
  assert.deepEqual(a.para(depois.filter((e) => /@alfa\./.test(String(e.to)))), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test'], 'com portal: PC03 peça às pessoas, nada ao cadastro');
  // com portal, a unidade sem nenhuma pessoa do portal (nenhum gestor com a unidade e nenhum pedido do portal) volta para o cadastro
  a.lin('CAD_USUARIOS').forEach((u) => { if (u.ID === 'u_cli') u.CLIENTE_PAPEL = 'GESTOR', u.CLIENTE_UNIDADES_JSON = '["un1"]'; if (u.ID === 'u_ges2') u.STATUS = 'INATIVO'; });
  const e2 = a.emails.length;
  AST.abrirChamado(a, { unidadeId: 'un1b', equipamentoId: 'eq4' });
  assert.deepEqual(a.para(a.emails.slice(e2).filter((e) => /@alfa\./.test(String(e.to)))), ['filial@alfa.exemplo.test'], 'sem pessoa do portal na filial: o cadastro recebe');
  // acesso suspenso: o portal não recebe, o cadastro sim
  a.lin('CAD_USUARIOS').find((u) => u.ID === 'u_ges2').STATUS = 'ATIVO';
  ok(a.pcl('s_dora', 'suspender', { clienteId: 'c1', motivo: 'Teste de suspensão do portal' }));
  const e3 = a.emails.length;
  AST.abrirChamado(a, { unidadeId: 'un1', equipamentoId: 'eq2' });
  assert.deepEqual(a.para(a.emails.slice(e3).filter((e) => /@alfa\./.test(String(e.to)))), ['rui@alfa.exemplo.test'], 'suspenso: e-mail do cadastro, como antes');
  // avisos pelo portal desligados em Regras do portal: volta ao cadastro
  ok(a.pcl('s_dora', 'reativar', { clienteId: 'c1', motivo: 'Fim do teste de suspensão' }));
  a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS || '{}'), { avisosLigados: false }));
  const e4 = a.emails.length;
  AST.abrirChamado(a, { unidadeId: 'un1', equipamentoId: 'eq2', confirmarDuplicado: true });
  assert.deepEqual(a.para(a.emails.slice(e4).filter((e) => /@alfa\./.test(String(e.to)))), ['rui@alfa.exemplo.test']);
});

test('T4.7: PI01 (CT01 da régua) sai em 60, 30 e 15 dias, uma vez cada; PC10 neutro aos gestores em 30 dias, na carência e no modo consulta', () => {
  const a = amb();
  const k = contrato(a, { fim: '2026-12-18', numero: 'CT-ALFA-FIM' });
  const internos = () => a.lin('CLI_CONTRATOS_AVISOS').filter((x) => x.CONTRATO_ID === k.ID && x.PUBLICO === 'INTERNO' && x.TIPO === 'VENCIMENTO' && x.SITUACAO === 'OK');
  const rodar = (dia) => { a.mudar(dia + 'T10:00:00-03:00'); a.ctx.Contratos_rotina_({ forcar: true, hoje: dia }); a.ctx.Contratos_rotina_({ forcar: true, hoje: dia }); a.rotina(); a.rotina(); };
  rodar('2026-10-19'); // 60 dias
  assert.deepEqual(internos().map((x) => x.MARCO), ['60']);
  rodar('2026-11-18'); // 30 dias
  rodar('2026-12-03'); // 15 dias
  rodar('2026-12-03');
  assert.deepEqual(internos().map((x) => x.MARCO).sort(), ['15', '30', '60'], 'uma vez cada marco');
  // PC10 aos 30 dias: gestores do cliente (não o Solicitante nem a Consulta), uma vez, texto neutro
  const pc10 = a.emails.filter((e) => /^Metrolabs — Contrato nº CT-ALFA-FIM: vigência até 18\/12\/2026$/.test(e.subject));
  assert.deepEqual(a.para(pc10), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test']);
  pc10.forEach((e) => { assert.deepEqual(j(a.ctx.PCl_reguaTom_(e.subject + ' ' + e.body)), [], e.subject); assert.doesNotMatch(e.body, /atraso|pagamento|cobran/i); });
  // carência (dia seguinte ao fim) e modo consulta (depois de 30 dias)
  rodar('2026-12-21'); rodar('2026-12-22');
  const car = a.emails.filter((e) => /período de carência até/.test(e.subject));
  assert.deepEqual(a.para(car), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test'], 'carência uma vez');
  rodar('2027-01-19');
  assert.deepEqual(a.para(a.emails.filter((e) => /modo consulta/.test(e.subject))), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test']);
  // a vigência provisória (contrato a cadastrar) não gera PC10 para o cliente
  const b = amb();
  b.mudar('2026-12-10T10:00:00-03:00'); b.rotina();
  assert.equal(b.emails.filter((e) => /^Metrolabs — (Contrato|Portal do cliente em modo)/.test(e.subject)).length, 0);
});

test('PI05: pedido do portal a 75% do prazo de resposta e vencido avisa a triagem (e a gestão no vencido), uma vez cada, sem WhatsApp', () => {
  const a = amb();
  a.rotina();
  ok(a.pcl('s_sonia.alfa', 'abrir', pedido()));
  a.mudar('2026-10-19T12:00:00-03:00'); a.rotina();
  assert.equal(a.lin('PCL_AVISOS_ENVIOS').filter((r) => r.EVENTO === 'PI05').length, 0, 'antes de 75%');
  a.mudar('2026-10-19T13:05:00-03:00');
  const e0 = a.emails.length; a.rotina(); a.rotina();
  const risco = a.emails.slice(e0).filter((e) => /perto do fim do prazo de resposta/.test(e.subject));
  assert.ok(risco.length >= 1 && risco.every((e) => !CLIENTE_DOM.test(String(e.to))), 'só a equipe');
  a.mudar('2026-10-19T14:05:00-03:00');
  const e1 = a.emails.length; a.rotina(); a.rotina();
  assert.ok(a.emails.slice(e1).some((e) => /prazo de resposta vencido/.test(e.subject)));
  assert.deepEqual(a.lin('PCL_AVISOS_ENVIOS').filter((r) => r.EVENTO === 'PI05').map((r) => r.CHAVE.split(':')[2]).sort(), ['RISCO', 'VENCIDO']);
  assert.equal(a.whats.length, 0);
});

test('PC07 diário e PC08 semanal: por unidade, cada documento e cada faixa uma vez, só no primeiro dia útil da semana e não em consulta', () => {
  const a = amb();
  semearDocs(a);
  a.rotina(); // segunda 10h: começa a contar; vencimentos da semana saem
  const v1 = a.emails.filter((e) => /Vencimentos dos equipamentos/.test(e.subject) && /@alfa./.test(String(e.to)));
  assert.deepEqual(a.para(v1), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test'], 'só gestores');
  const cli1 = corpo(v1.find((e) => String(e.to) === 'cli@alfa.exemplo.test'));
  assert.match(cli1, /Vencidos:[\s\S]*AC-01[\s\S]*SL-04/); assert.match(cli1, /Vencem em até 30 dias:[\s\S]*AC-01/); assert.match(cli1, /Vencem em até 60 dias:[\s\S]*LV-02/);
  assert.doesNotMatch(corpo(v1.find((e) => String(e.to) === 'gina@alfa.exemplo.test')), /AC-01|LV-02/, 'a filial vê só a filial');
  assert.doesNotMatch(cli1, /ES-03/, 'nada de outro cliente');
  // documentos emitidos antes do início dos avisos não saem; o novo sai uma vez, para quem tem a unidade
  a.tabelas.DOC_DOCUMENTOS.push({ ID: 'dF', STATUS: 'ATIVO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado SL-04 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCertF1xxx', DATA_EMISSAO: '2026-10-20', DATA_VENCIMENTO: '2027-10-20', CRIADO_EM: '2026-10-20T08:00:00' });
  a.mudar('2026-10-20T08:20:00-03:00'); const e0 = a.emails.length; a.rotina();
  assert.equal(a.cli(e0).filter((e) => /Documentos novos/.test(e.subject)).length, 0, 'antes das 08:30');
  a.mudar('2026-10-20T08:35:00-03:00'); const e1 = a.emails.length; a.rotina();
  const d1 = a.cli(e1).filter((e) => /Documentos novos/.test(e.subject));
  assert.deepEqual(a.para(d1), ['cli@alfa.exemplo.test', 'gina@alfa.exemplo.test', 'saulo@alfa.exemplo.test']);
  assert.match(corpo(d1[0]), /Certificado de calibração[^\n]*SL-04/); assert.doesNotMatch(corpo(d1[0]), /Laudo|AC-01/);
  a.mudar('2026-10-21T09:00:00-03:00'); const e2 = a.emails.length; a.rotina();
  assert.equal(a.cli(e2).filter((e) => /Documentos novos/.test(e.subject)).length, 0, 'o mesmo documento não volta');
  // semana seguinte: só o que entrou numa faixa nova; segunda-feira feriado (02/11) passa para terça
  a.mudar('2026-10-26T09:00:00-03:00'); const e3 = a.emails.length; a.rotina();
  assert.equal(a.cli(e3).filter((e) => /Vencimentos/.test(e.subject)).length, 0, 'nenhuma faixa nova');
  a.mudar('2026-11-02T10:00:00-03:00'); const e4 = a.emails.length; a.rotina();
  assert.equal(a.cli(e4).length, 0, 'feriado: nada sai');
  a.mudar('2026-11-03T09:00:00-03:00'); const e5 = a.emails.length; a.rotina();
  const v2 = a.cli(e5).filter((e) => /Vencimentos/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test');
  assert.equal(v2.length, 1, 'primeiro dia útil da semana');
  assert.match(corpo(v2[0]), /Vencem em até 30 dias:[\s\S]*LV-02/); assert.doesNotMatch(corpo(v2[0]), /SL-04/, 'o vencido não volta');
  // publicação no meio da semana: a primeira rodada só marca a semana; o primeiro resumo sai no primeiro dia útil da semana seguinte
  const w = amb(); w.mudar('2026-10-21T10:00:00-03:00'); semearDocs(w); w.rotina();
  assert.equal(w.cli(0).filter((e) => /Vencimentos/.test(e.subject)).length, 0, 'quarta-feira da publicação: sem resumo semanal');
  w.mudar('2026-10-26T09:00:00-03:00'); w.rotina();
  assert.ok(w.cli(0).some((e) => /Vencimentos/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test'), 'segunda seguinte: resumo');
  // em modo consulta não sai
  const b = amb(); semearDocs(b);
  b.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(b.props.PCL_REGRAS || '{}'), { provisoriaAte: '' }));
  b.rotina();
  assert.equal(b.cli(0).filter((e) => /Vencimentos|Documentos novos/.test(e.subject)).length, 0, 'consulta: sem PC07 e PC08');
});

test('T4.8: o texto de todos os avisos ao cliente passa na régua de tom (sem termos internos, sem cobrança, sem cara de IA)', () => {
  const a = amb();
  semearDocs(a);
  a.rotina();
  const { p, ch } = chamadoDoPortal(a);
  triar(a, ch.id);
  ok(AST.agendar(a, ch.id, '2026-10-21T09:00'));
  ok(AST.agendar(a, ch.id, '2026-10-22T10:00', { motivo: 'Técnico remanejado para urgência P1 na triagem' }));
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'SOLICITACAO', refId: p.solicitacao.id, texto: 'Confirmado.' }));
  const linha = a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch.id);
  a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT08', { cod: 'PC05', tipo: 'CONCLUIDO', osId: 'osT', osNumero: 'OS-0055', encerradaEm: '2026-10-19T09:40:00' });
  a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT15', { cod: 'PC03', tipo: 'PECA' });
  a.mudar('2026-10-19T10:30:00-03:00'); a.rotina();
  const todos = a.cli(0);
  assert.ok(todos.length >= 8);
  todos.forEach((e) => assert.deepEqual(j(a.ctx.PCl_reguaTom_(e.subject + '\n' + e.body)), [], e.subject + ': ' + e.body.slice(0, 200)));
  assert.ok(todos.every((e) => /^Metrolabs — /.test(e.subject)), 'assunto começa com "Metrolabs — "');
  // a régua pega o que não pode ir
  assert.ok(j(a.ctx.PCl_reguaTom_('Seu débito de R$ 10,00 está em atraso!')).length >= 3);
  assert.ok(j(a.ctx.PCl_reguaTom_('Prioridade P1 definida na triagem do SGO+')).length >= 3);
  // o reagendamento não leva o motivo interno
  assert.ok(todos.filter((e) => /reagendada/.test(e.subject)).every((e) => !/remanejado|urgência/.test(e.body)));
});

test('tela, ajuda e manual: preferências explicadas, Regras do portal com os avisos, dicas, ajuda das telas, manual e base do assistente', () => {
  const ac = ler('JS_PortalCliente_Acessos.html'), pcl = ler('JS_PortalCliente.html'), aj = ler('JS_PortalCliente_Ajuda.html');
  assert.match(ac, /PclCli_avisosHtml_/); assert.match(ac, /Sempre enviados/); assert.match(ac, /nunca leva anexos nem valores/);
  ['pclRgAvLigado', 'pclRgAvIni', 'pclRgAvFim', 'pclRgAvResumoHora', 'pclRgAvIntervalo', 'pclRgAvCopia', 'pclRgAvVencidoDias'].forEach((id) => { assert.match(pcl, new RegExp('id="' + id + '"')); assert.match(aj, new RegExp('\\b' + id + ':')); });
  ['pclMdAvisoPC06', 'pclMdAvisoPC07', 'pclMdAvisoPC08'].forEach((id) => assert.match(aj, new RegExp('\\b' + id + ':')));
  assert.doesNotMatch(ac + pcl, /window\.(confirm|prompt|alert)\(|\balert\(/);
  const ctx = vm.createContext({}); vm.runInContext(ler('SGO_Ajuda_PortalCliente.js'), ctx);
  const telas = ctx.SGO_ajudaTelas_PortalCliente_();
  assert.match(JSON.stringify(telas.portal_cliente_conta), /Avisos por e-mail/);
  assert.doesNotMatch(JSON.stringify(telas.portal_cliente_conta), /Administração|caixa|PORTAL_CLIENTE_|nota interna/i);
  assert.match(JSON.stringify(telas.portal_cliente_contratos), /Avisos ao cliente por e-mail/);
  const man = lerDoc('MANUAL_MODULO_PORTAL_CLIENTE.md');
  assert.match(man, /## 26\. Avisos ao cliente por e-mail/);
  ['PC03', 'PC04', 'PC05', 'PC06', 'PC07', 'PC08', 'PC10', 'PI05', 'PCL_AVISOS_ENVIOS', 'Cópia ao e-mail do cadastro'].forEach((t) => assert.ok(man.includes(t), 'manual: ' + t));
  assert.match(ler('SGO_AssistenteManuais.js'), /Avisos ao cliente por e-mail/);
  // nenhuma função nova chamada pela tela do cliente: a tela usa só PortalCliente_api (já na lista fechada)
  assert.match(ler('SGO_PortalCliente_Seguranca.js'), /'PortalCliente_api'/);
  // o assunto ao cliente sai sem o prefixo do sistema; os avisos internos mantêm o prefixo
  const n = ler('SGO_Notificar.js');
  assert.match(n, /subject: paraCliente \? titulo : 'SGO\+ \| ' \+ titulo/);
});

test('prévia renderizada de cada modelo de e-mail ao cliente (grava em PCL_MODELOS_DIR quando informado)', () => {
  const a = amb();
  semearDocs(a);
  a.rotina();
  const modelos = {};
  const guardar = (nome, e) => { if (e && !modelos[nome]) modelos[nome] = e; };
  const ult = (re, n) => a.cli(n).filter((e) => re.test(e.subject))[0];
  let n = a.emails.length;
  const p = a.pcl('s_sonia.alfa', 'abrir', pedido()); guardar('PC01-pedido-recebido', ult(/recebido/, n));
  n = a.emails.length; ok(a.api('s_gil', 'complemento', { solicitacaoId: p.solicitacao.id, pergunta: 'Envie a foto do visor com o código de erro.' })); guardar('PC02-complemento', ult(/falta uma informação/, n));
  ok(a.pcl('s_sonia.alfa', 'responderComplemento', { id: p.solicitacao.id, resposta: 'O visor mostra E-07 e depois apaga.' }));
  n = a.emails.length; const ch = converter(a, p.solicitacao.id); guardar('PC02-pedido-aceito', ult(/aceito/, n));
  triar(a, ch.id);
  n = a.emails.length; ok(AST.agendar(a, ch.id, '2026-10-21T09:00')); guardar('PC03-visita-agendada', ult(/visita agendada/, n));
  n = a.emails.length; ok(AST.agendar(a, ch.id, '2026-10-22T10:00', { motivo: 'Ajuste da agenda do técnico' })); guardar('PC03-visita-reagendada', ult(/reagendada/, n));
  const linha = a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch.id);
  n = a.emails.length; a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT15', { cod: 'PC03', tipo: 'PECA' }); guardar('PC03-peca-recebida', ult(/peça recebida/, n));
  n = a.emails.length; a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT15', { cod: 'PC03', tipo: 'RETORNO', quando: '2026-10-23T14:00:00', tecnico: 'TIAGO TECNICO TESTE', peca: true }); guardar('PC03-retorno-agendado', ult(/retorno técnico/, n));
  n = a.emails.length; a.ctx.Ast_avisarCliente_(linha, 'x', 'x', 'AT08', { cod: 'PC05', tipo: 'CONCLUIDO', osId: 'osM', osNumero: 'OS-0042', encerradaEm: '2026-10-23T16:10:00' }); guardar('PC05-atendimento-concluido', ult(/concluído/, n));
  const chF = AST.abrirChamado(a, { unidadeId: 'un1b', equipamentoId: 'eq4' }); guardar('PC01-chamado-registrado', a.cli(0).filter((e) => /registrado$/.test(e.subject))[0]);
  triar(a, chF.id, 'AGUARDANDO_ORCAMENTO', { orcamentoDescricao: 'Troca da placa' });
  const orc = a.lin('ATEC_ORCAMENTOS').filter((o) => o.CHAMADO_ID === chF.id).pop();
  ok(a.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Mão de obra', quantidade: 1, valorUnitario: 350 }], condicoes: 'Pagamento em 28 dias' }));
  n = a.emails.length; ok(a.api('s_gaspar', 'emitirOrcamento', { id: orc.ID })); guardar('PC04-orcamento-para-aprovacao', ult(/orçamento para aprovação/, n));
  const chC = AST.abrirChamado(a, { unidadeId: 'un1', equipamentoId: 'eq2', confirmarDuplicado: true }); triar(a, chC.id); ok(AST.agendar(a, chC.id, '2026-10-26T09:00'));
  n = a.emails.length; ok(a.api('s_gil', 'cancelar', { id: chC.id, motivo: 'Visita desmarcada a pedido do setor' })); guardar('PC03-visita-cancelada', ult(/visita cancelada/, n));
  ok(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: ch.id, texto: 'Bom dia. A visita está confirmada.' }));
  a.mudar('2026-10-19T10:40:00-03:00'); n = a.emails.length; a.rotina(); guardar('PC06-resumo-das-mensagens', ult(/mensagem/i, n));
  guardar('PC08-vencimentos-semanal', a.cli(0).filter((e) => /Vencimentos/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test')[0]);
  a.tabelas.DOC_DOCUMENTOS.push({ ID: 'dM', STATUS: 'ATIVO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado AC-01 2026.pdf', LINK_ARQUIVO: '/arquivos/arqCertM1xxx', DATA_EMISSAO: '2026-10-20', DATA_VENCIMENTO: '2027-10-20', CRIADO_EM: '2026-10-20T08:00:00' });
  a.mudar('2026-10-20T08:40:00-03:00'); n = a.emails.length; a.rotina(); guardar('PC07-documentos-novos', a.cli(n).filter((e) => /Documentos novos/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test')[0]);
  n = a.emails.length; a.ctx.PClA_avisarAcesso_(a.lin('CAD_USUARIOS').find((u) => u.ID === 'u_sol2'), 'PAPEL', { papelNome: 'Consulta', unidades: 'Unidade Filial' }); guardar('PC09-acesso-alterado', ult(/Acesso ao Portal do cliente alterado/, n));
  const k = contrato(a, { fim: '2026-11-15', numero: 'CT-ALFA-MOD' });
  a.mudar('2026-10-21T10:00:00-03:00'); n = a.emails.length; a.rotina(); guardar('PC10-contrato-30-dias', ult(/vigência até/, n));
  a.mudar('2026-11-17T10:00:00-03:00'); n = a.emails.length; a.rotina(); guardar('PC10-carencia', ult(/carência/, n));
  assert.ok(k);
  const esperados = ['PC01-pedido-recebido', 'PC01-chamado-registrado', 'PC02-complemento', 'PC02-pedido-aceito', 'PC03-visita-agendada', 'PC03-visita-reagendada', 'PC03-peca-recebida', 'PC03-retorno-agendado',
    'PC03-visita-cancelada', 'PC04-orcamento-para-aprovacao', 'PC05-atendimento-concluido', 'PC06-resumo-das-mensagens', 'PC07-documentos-novos', 'PC08-vencimentos-semanal', 'PC09-acesso-alterado', 'PC10-contrato-30-dias', 'PC10-carencia'];
  esperados.forEach((k2) => assert.ok(modelos[k2], 'modelo ' + k2));
  Object.keys(modelos).forEach((k2) => assert.deepEqual(j(a.ctx.PCl_reguaTom_(modelos[k2].subject + '\n' + modelos[k2].body)), [], k2));
  const dir = process.env.PCL_MODELOS_DIR;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const indice = [];
    esperados.forEach((k2) => {
      const e = modelos[k2];
      const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(e.subject) + '</title>' +
        '<style>body{margin:0;background:#eef2ef;font-family:Arial,Helvetica,sans-serif}.cab{max-width:680px;margin:16px auto 0;padding:10px 16px;background:#fff;border:1px solid #d5ddd8;font-size:13px;color:#33413a}.cab b{display:inline-block;min-width:70px}.msg{max-width:680px;margin:0 auto 24px;padding:16px;background:#fff;border:1px solid #d5ddd8;border-top:0}</style></head><body>' +
        '<div class="cab"><div><b>De:</b> ' + esc(e.name) + '</div><div><b>Para:</b> ' + esc(e.to) + ' (pessoa fictícia de teste)</div><div><b>Assunto:</b> ' + esc(e.subject) + '</div><div><b>Anexos:</b> nenhum</div></div>' +
        '<div class="msg">' + e.htmlBody + '</div></body></html>';
      fs.writeFileSync(path.join(dir, k2 + '.html'), html);
      indice.push('<li><a href="' + k2 + '.html">' + esc(k2) + '</a> — ' + esc(e.subject) + '</li>');
    });
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Modelos de e-mail ao cliente</title></head><body style="font-family:Arial,sans-serif;max-width:800px;margin:24px auto"><h1>Avisos ao cliente por e-mail — prévias</h1><p>Geradas pelo teste tests/portal-cliente-etapa4-20261118.test.cjs com dados fictícios. Nenhum e-mail foi enviado.</p><ul>' + indice.join('') + '</ul></body></html>');
  }
});

test('ajustes de transição: cópia ao e-mail do cadastro ligada por padrão (sem repetir endereço) e PC08 sem os vencidos antigos', () => {
  // 1) sem a chave gravada, a cópia ao cadastro vale: o e-mail da unidade continua recebendo a visita, uma vez
  const a = amb({ copiaPadrao: true });
  assert.equal(JSON.parse(a.props.PCL_REGRAS || '{}').copiaCadastro, undefined, 'chave não gravada');
  assert.equal(a.pcl('s_dora', 'regras', {}).avisos.copiaCadastro, true, 'padrão: Sim');
  const { ch } = chamadoDoPortal(a); triar(a, ch.id);
  const e0 = a.emails.length;
  ok(AST.agendar(a, ch.id, '2026-10-21T09:00'));
  assert.deepEqual(a.para(a.cli(e0)), ['cli@alfa.exemplo.test', 'rui@alfa.exemplo.test', 'sonia@alfa.exemplo.test'], 'pessoas do portal e o e-mail da unidade');
  assert.ok(a.cli(e0).every((e) => /^Metrolabs — /.test(e.subject)), 'a cópia sai no modelo novo, sem o prefixo do sistema');
  assert.ok(!a.emails.slice(e0).some((e) => /Visita técnica agendada/.test(e.subject)), 'o e-mail antigo não sai junto (sem duplicar)');
  assert.match(corpo(a.cli(e0).find((e) => String(e.to) === 'rui@alfa.exemplo.test')), /e-mail de contato da sua empresa cadastrado na Metrolabs/);
  // o mesmo endereço (unidade = Gestor) recebe uma vez
  a.tabelas.CAD_UNIDADES.find((u) => u.ID === 'un1').EMAIL = 'cli@alfa.exemplo.test';
  const e1 = a.emails.length;
  ok(AST.agendar(a, ch.id, '2026-10-22T09:00', { motivo: 'Ajuste da agenda' }));
  assert.deepEqual(a.para(a.cli(e1)), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  // a Diretoria desliga com motivo: só as pessoas do portal
  a.tabelas.CAD_UNIDADES.find((u) => u.ID === 'un1').EMAIL = 'rui@alfa.exemplo.test';
  assert.equal(a.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', copiaCadastro: false, motivo: 'Contas revisadas com os clientes (teste)' }).ok, true);
  assert.equal(a.pcl('s_dora', 'regras', {}).avisos.copiaCadastro, false);
  const e2 = a.emails.length;
  ok(AST.agendar(a, ch.id, '2026-10-23T09:00', { motivo: 'Outro ajuste' }));
  assert.deepEqual(a.para(a.cli(e2)), ['cli@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  // 2) PC08: vencido há mais de 30 dias antes do início dos avisos nunca vai no e-mail; o recente vai; o antigo continua no Portal
  const b = amb(); semearDocs(b);
  const d = (n) => b.ctx.PCl_diaMais_(b.hoje(), n);
  b.tabelas.DOC_DOCUMENTOS.push({ ID: 'dVelho', STATUS: 'ATIVO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado LV-02 2024.pdf', LINK_ARQUIVO: '/arquivos/arqVelhoxxxx', DATA_EMISSAO: d(-565), DATA_VENCIMENTO: d(-200), CRIADO_EM: d(-565) + 'T10:00:00' },
    { ID: 'dLimite', STATUS: 'ATIVO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', EQUIPAMENTO_ID: 'eq4', TIPO_DOCUMENTO: 'Laudo NR-13', NOME_ARQUIVO: 'Laudo NR-13 SL-04.pdf', LINK_ARQUIVO: '/arquivos/arqLimitexxx', DATA_EMISSAO: d(-395), DATA_VENCIMENTO: d(-30), CRIADO_EM: d(-395) + 'T10:00:00' });
  b.rotina();
  const v = corpo(b.cli(0).find((e) => /Vencimentos/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test'));
  assert.match(v, /SL-04[^\n]*NR-13, vencido desde/, 'vencido há exatamente 30 dias entra');
  assert.doesNotMatch(v, /LV-02[^\n]*vencido/, 'vencido há 200 dias não entra');
  const tela = JSON.stringify(b.pcl('s_cliente.alfa', 'vencimentos', {}));
  assert.ok(tela.indexOf(b.ctx.PCl_br_(d(-200))) >= 0, 'o vencido antigo continua no Portal');
  // configurável: 365 dias inclui o antigo; fora da faixa é recusado com o campo
  assert.equal(b.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', pc08VencidoDias: 400, motivo: 'Teste fora da faixa' }).faltam[0].campo, 'pclRgAvVencidoDias');
  const c = amb(); semearDocs(c);
  c.tabelas.DOC_DOCUMENTOS.push({ ID: 'dVelho', STATUS: 'ATIVO', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq2', TIPO_DOCUMENTO: '2. Certificados de calibração', NOME_ARQUIVO: 'Certificado LV-02 2024.pdf', LINK_ARQUIVO: '/arquivos/arqVelhoxxxx', DATA_EMISSAO: d(-565), DATA_VENCIMENTO: d(-200), CRIADO_EM: d(-565) + 'T10:00:00' });
  assert.equal(c.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', pc08VencidoDias: 365, motivo: 'Incluir vencidos do último ano (teste)' }).ok, true);
  assert.equal(c.pcl('s_dora', 'regras', {}).avisos.pc08VencidoDias, 365);
  c.rotina();
  assert.match(corpo(c.cli(0).find((e) => /Vencimentos/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test')), /LV-02[^\n]*calibração, vencido desde/);
});
