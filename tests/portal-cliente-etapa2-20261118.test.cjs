// 18/11/2026 — Portal do cliente, ETAPA 2 (b): ABERTURA DE CHAMADO E ACOMPANHAMENTO (output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md,
// testes T2.1 a T2.12). Código real num vm, com o ambiente da Assistência técnica (tests/_assistencia_ambiente.cjs: planilha, Drive, e-mail e
// relógio simulados; o relógio começa numa segunda-feira às 10h) e o Portal do cliente carregado junto. Nenhum e-mail sai de verdade.
// Clientes fictícios: c1 (Hospital Teste Alfa) com 2 unidades (un1 e un1b), contas Gestor (conta antiga sem papel), Solicitante só da un1,
// Consulta só da un1 e Solicitante só da un1b; c2 (Clínica Teste Beta) com 1 unidade e uma conta. Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa2-20261118.test.cjs
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
const FOTO = { nome: 'visor.jpg', tipo: 'image/jpeg', base64: Buffer.alloc(1200, 9).toString('base64') };
const ETQ = { nome: 'etiqueta.png', tipo: 'image/png', base64: Buffer.alloc(800, 5).toString('base64') };
const PDF = { nome: 'laudo.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 teste').toString('base64') };

function amb(opcoes) {
  const base = AST.ambiente({});
  const usuarios = base.tabelas.CAD_USUARIOS.slice();
  const a = AST.ambiente(Object.assign({
    extras: ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Chamados.js', 'SGO_PortalCliente.js',
      'SGO_Contratos_Regua.js', 'SGO_Contratos_Indices.js', 'SGO_Contratos_Reajuste.js'],
    tabelas: {
      CAD_USUARIOS: usuarios.concat([
        { ID: 'u_sol', USUARIO: 'sonia.alfa', NOME: 'SONIA SOLICITANTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sonia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_con', USUARIO: 'celia.alfa', NOME: 'CELIA CONSULTA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'celia@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'CONSULTA', CLIENTE_UNIDADES_JSON: '["un1"]' },
        { ID: 'u_sol2', USUARIO: 'saulo.alfa', NOME: 'SAULO SOLICITANTE FILIAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'saulo@alfa.exemplo.test', CLIENTE_ID: 'c1', CLIENTE_PAPEL: 'SOLICITANTE', CLIENTE_UNIDADES_JSON: '["un1b"]' }
      ]),
      CAD_UNIDADES: base.tabelas.CAD_UNIDADES.concat([{ ID: 'un1b', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Filial', ENDERECO: 'Rua Filial, 20', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }]),
      CAD_EQUIPAMENTOS: base.tabelas.CAD_EQUIPAMENTOS.concat([{ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1b', TIPO: 'Seladora', MODELO: 'S4', SERIE: 'S-400', TAG: 'SL-04', SETOR: 'CME', STATUS: 'ATIVO' }])
    }
  }, opcoes || {}));
  a.pcl = (sid, acao, d) => { const r = j(a.ctx.PortalCliente_api(sid, acao, d || {})); if (a.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
  a.aceitar = (sid) => { const t = a.pcl(sid, 'minhaConta').termo; const r = a.pcl(sid, 'aceitarTermo', { ciente: true, versao: t.versao }); assert.equal(r.ok, true, r.message); };
  ['s_cliente.alfa', 's_sonia.alfa', 's_celia.alfa', 's_saulo.alfa', 's_cliente.beta'].forEach(a.aceitar);
  a.lin = (n) => a.tabelas[n] || [];
  return a;
}
/** Pedido completo e válido (equipamento eq1 da unidade un1). */
function pedido(extra) {
  return Object.assign({ unidadeId: 'un1', equipamentoId: 'eq1', setor: 'CME', sintoma: 'A autoclave interrompe o ciclo na secagem e mostra alarme de pressão em todos os ciclos desde ontem',
    inicio: 'ontem às 7h', codigoErro: 'E-07', situacao: 'TOTAL', risco: 'Pode não esterilizar a carga', tentado: 'Reiniciamos e limpamos o filtro',
    contatoNome: 'Rui Responsável', contatoTelefone: '(62) 98888-7777', contatoEmail: 'rui@alfa.exemplo.test', horario: 'Seg a sex, 13h às 17h', protocolo: 'HAL-123',
    fotos: [FOTO], etiquetas: [ETQ] }, extra || {});
}
/** Converte o pedido em chamado como a equipe faz (Assistência técnica > Solicitações dos clientes). */
function converter(a, solId, prioridade) {
  const r = a.api('s_gil', 'converter', { solicitacaoId: solId, prioridade: prioridade || 'P2', confirmarDuplicado: true });
  assert.equal(r.ok, true, r.message);
  return r.chamado;
}
/** Contrato vigente do cliente c1 (Portal do cliente > Contratos), registrado pela Diretoria. */
function contrato(a, extra) {
  const r = a.pcl('s_dora', 'salvar', Object.assign({ clienteId: 'c1', unidades: [], numero: 'CT-ALFA-2026', objeto: 'Manutenção preventiva e corretiva das autoclaves', origemTipo: 'ASSINADO',
    servicos: [{ servico: 'MANUTENCAO_CORRETIVA', periodicidade: 'SOB_DEMANDA' }], inicio: '2026-01-01', fim: '2027-06-30', responsavelId: 'u_gt', motivo: 'Contrato assinado com o cliente (teste)' }, extra || {}));
  assert.equal(r.ok, true, r.message);
  return a.lin('CLI_CONTRATOS').find((k) => k.NUMERO === (extra && extra.numero || 'CT-ALFA-2026'));
}
/** Chaves que nunca vão ao cliente (item 3.1.4), procuradas em todo o JSON. */
const PROIBIDAS = ['PRIORIDADE', 'prioridade', 'TRIAGEM_RESPONSAVEL_ID', 'triagemResponsavel', 'filaLivre', 'assumidoPor', 'TECNICO_ID', 'tecnicoId', 'PROXIMA_ACAO', 'proximaAcao',
  'SLA_MIN_UTEIS', 'PRAZO_TRIAGEM_EM', 'prazoTriagem', 'casos', 'compras', 'interna', 'INTERNA', 'autorCompleto', 'VALOR_TOTAL', 'custo', 'POR_ID', 'AUTOR_ID', 'ARQUIVO_ID', 'DESCARTE_MOTIVO'];
function chaves(o, out) { if (Array.isArray(o)) o.forEach((x) => chaves(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach((k) => { out.add(k); chaves(o[k], out); }); return out; }
function semProibidas(o, rotulo) { const k = chaves(o, new Set()); PROIBIDAS.forEach((p) => assert.ok(!k.has(p), rotulo + ': a chave ' + p + ' chegou ao cliente')); }


test('T2.1: pedido com cada campo faltando devolve "faltam" com o campo e o texto; nada é gravado', () => {
  const a = amb();
  const vazio = a.pcl('s_cliente.alfa', 'abrir', {});
  assert.equal(vazio.ok, false); assert.equal(vazio.codigo, 'INCOMPLETO');
  const campos = vazio.faltam.map((f) => f.campo);
  ['pclAbUnidade', 'pclAbEquipamento', 'pclAbSetor', 'pclAbSintoma', 'pclAbInicio', 'pclAbCodigoErro', 'pclAbSituacao', 'pclAbRisco', 'pclAbTentado', 'pclAbContatoNome', 'pclAbContatoTel', 'pclAbContatoEmail']
    .forEach((c) => assert.ok(campos.includes(c), 'falta apontada: ' + c));
  assert.ok(vazio.faltam.every((f) => f.texto && f.texto.length > 15), 'cada falta diz o que fazer');
  // um campo por vez: só ele volta em "faltam"
  const casos = [
    ['pclAbSetor', { setor: 'C' }], ['pclAbSintoma', { sintoma: 'Não liga' }], ['pclAbInicio', { inicio: '' }], ['pclAbCodigoErro', { codigoErro: '', naoExibe: false }],
    ['pclAbSituacao', { situacao: 'URGENTE' }], ['pclAbRisco', { risco: '' }], ['pclAbTentado', { tentado: 'x' }], ['pclAbContatoNome', { contatoNome: 'R' }],
    ['pclAbContatoTel', { contatoTelefone: '9999' }], ['pclAbContatoEmail', { contatoEmail: 'rui@' }], ['pclAbEquipamento', { equipamentoId: '' }],
    ['pclAbForaTexto', { equipamentoId: '', foraLista: true, foraTexto: 'autoclave' }], ['pclAbUnidade', { unidadeId: '', equipamentoId: '', foraLista: true, foraTexto: 'Autoclave Marca X série 123 na CME' }]];
  casos.forEach(([campo, extra]) => {
    const r = a.pcl('s_cliente.alfa', 'abrir', pedido(extra));
    assert.equal(r.ok, false, campo); assert.deepEqual(r.faltam.map((f) => f.campo), [campo], campo + ': ' + JSON.stringify(r.faltam));
    assert.match(r.message, /Não foi possível enviar o pedido: falta 1 informação/);
  });
  // "não exibe código" dispensa o código; a foto é recomendada, não obrigatória (decisão 10a)
  assert.equal(a.pcl('s_cliente.alfa', 'abrir', pedido({ codigoErro: '', naoExibe: true, fotos: [], etiquetas: [] })).ok, true);
  // arquivo de tipo errado: o campo da foto e o tipo aceito
  const ruim = a.pcl('s_cliente.alfa', 'abrir', pedido({ equipamentoId: 'eq2', fotos: [{ nome: 'x.exe', tipo: 'application/x-msdownload', base64: 'AAAA' }] }));
  assert.equal(ruim.ok, false); assert.equal(ruim.faltam[0].campo, 'pclAbFotos'); assert.match(ruim.message, /tipo de arquivo não aceito.*JPEG/);
  assert.equal(a.lin('ATEC_SOLICITACOES').length, 1, 'só o pedido completo foi gravado');
});

test('T2.2: equipamento ou unidade de outro cliente ou de outra unidade dá "não encontrado" (igual ao inexistente) e fica ESCOPO_RECUSADO', () => {
  const a = amb();
  const inex = a.pcl('s_sonia.alfa', 'abrir', pedido({ equipamentoId: 'nao-existe', unidadeId: '' }));
  assert.equal(inex.ok, false); assert.equal(inex.codigo, 'NAO_ENCONTRADO');
  for (const [rot, extra] of [['equipamento da outra unidade', { equipamentoId: 'eq4', unidadeId: '' }], ['equipamento de outro cliente', { equipamentoId: 'eq3', unidadeId: '' }],
    ['unidade de outro cliente', { unidadeId: 'un2', equipamentoId: '', foraLista: true, foraTexto: 'Autoclave fora da lista na CME' }], ['unidade fora do acesso', { unidadeId: 'un1b', equipamentoId: '', foraLista: true, foraTexto: 'Autoclave fora da lista na CME' }]]) {
    const r = a.pcl('s_sonia.alfa', 'abrir', pedido(extra));
    assert.equal(r.ok, false, rot); assert.equal(r.message, inex.message, rot + ': mesma resposta de inexistente');
  }
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === 'eq4'));
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'ESCOPO_RECUSADO' && x.USUARIO_ID === 'u_sol' && x.REF_ID === 'eq3'));
  assert.equal(a.lin('ATEC_SOLICITACOES').length, 0);
  // ficha, conversa e cancelamento de pedido de outra unidade ou de outro cliente: a mesma resposta
  const pf = a.pcl('s_saulo.alfa', 'abrir', pedido({ unidadeId: 'un1b', equipamentoId: 'eq4' }));
  assert.equal(pf.ok, true, pf.message);
  const id = pf.solicitacao.id, inexF = a.pcl('s_sonia.alfa', 'chamado', { tipo: 'SOLICITACAO', id: 'nao-existe' });
  for (const [sid, acao, d] of [['s_sonia.alfa', 'chamado', { tipo: 'SOLICITACAO', id }], ['s_cliente.beta', 'chamado', { tipo: 'SOLICITACAO', id }], ['s_sonia.alfa', 'enviarMensagem', { refTipo: 'SOLICITACAO', refId: id, texto: 'Oi' }],
    ['s_sonia.alfa', 'cancelar', { tipo: 'SOLICITACAO', id, motivo: 'Não preciso mais deste atendimento' }]]) {
    const r = a.pcl(sid, acao, d); assert.equal(r.ok, false, sid + ' ' + acao); assert.equal(r.message, inexF.message, sid + ' ' + acao);
  }
  // o formulário só oferece as unidades e os equipamentos do acesso da pessoa; a lista também
  const fm = a.pcl('s_sonia.alfa', 'formAbrir', {});
  assert.deepEqual(fm.unidades.map((u) => u.id), ['un1']); assert.deepEqual(fm.equipamentos.map((e) => e.id).sort(), ['eq1', 'eq2']);
  assert.equal(a.pcl('s_sonia.alfa', 'chamados', {}).itens.length, 0);
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', {}).itens.length, 1, 'o Gestor vê a filial');
});

test('T2.3: com chamado ou pedido aberto do mesmo equipamento, a pergunta "É o mesmo problema?" aparece antes de gravar', () => {
  const a = amb();
  const p1 = a.pcl('s_cliente.alfa', 'abrir', pedido());
  assert.equal(p1.ok, true, p1.message);
  const rep = a.pcl('s_cliente.alfa', 'abrir', pedido());
  assert.equal(rep.ok, true); assert.equal(rep.repetido, true); assert.match(rep.message, /É o mesmo problema\?/);
  assert.deepEqual(rep.abertos.map((x) => x.numero), [p1.solicitacao.numero]);
  assert.equal(a.lin('ATEC_SOLICITACOES').length, 1, 'nada gravado na pergunta');
  // virou chamado: a pergunta mostra o chamado
  const ch = converter(a, p1.solicitacao.id);
  const rep2 = a.pcl('s_cliente.alfa', 'abrir', pedido());
  assert.equal(rep2.repetido, true); assert.deepEqual(rep2.abertos.map((x) => x.tipo + ':' + x.numero), ['CHAMADO:' + ch.numero]);
  // "Não, é outro problema": abre mesmo assim
  const p2 = a.pcl('s_cliente.alfa', 'abrir', pedido({ confirmarRepetido: true }));
  assert.equal(p2.ok, true); assert.ok(p2.solicitacao && p2.solicitacao.numero); assert.equal(a.lin('ATEC_SOLICITACOES').length, 2);
  // outro equipamento: sem pergunta
  assert.ok(a.pcl('s_cliente.alfa', 'abrir', pedido({ equipamentoId: 'eq2' })).solicitacao);
});

test('T2.4: o pedido entra na fila com contrato, situação, papel e anexos; PC01 por e-mail na hora; nunca WhatsApp', () => {
  const a = amb();
  const k = contrato(a);
  const w0 = a.whats.length;
  const r = a.pcl('s_sonia.alfa', 'abrir', pedido({ video: { nome: 'defeito.mp4', tipo: 'video/mp4', base64: Buffer.alloc(3000, 1).toString('base64') } }));
  assert.equal(r.ok, true, r.message); assert.match(r.message, /Pedido SOL-2026-\d{4} recebido/);
  const s = a.lin('ATEC_SOLICITACOES').find((x) => x.ID === r.solicitacao.id);
  assert.equal(s.ORIGEM, 'PORTAL'); assert.equal(s.SITUACAO, 'NOVA'); assert.equal(s.CONTRATO_ID, k.ID); assert.equal(s.URGENCIA_CLIENTE, 'TOTAL'); assert.equal(s.PARADA, 'TOTAL');
  assert.equal(s.POR_PAPEL, 'SOLICITANTE'); assert.equal(s.POR_ID, 'u_sol'); assert.equal(s.SETOR, 'CME'); assert.equal(s.CONTATO_TELEFONE, '62988887777'); assert.equal(s.HORARIO_PREFERIDO, 'Seg a sex, 13h às 17h');
  assert.equal(s.PROTOCOLO_CLIENTE, 'HAL-123'); assert.equal(s.SEM_CONTRATO, ''); assert.equal(JSON.parse(s.RELATO_JSON).risco, 'Pode não esterilizar a carga'); assert.ok(!s.PRIORIDADE, 'o cliente não escolhe prioridade');
  const anx = a.lin('PCL_ANEXOS').filter((x) => x.REF_ID === s.ID);
  assert.deepEqual(anx.map((x) => x.TIPO).sort(), ['FOTO_EQUIPAMENTO', 'FOTO_ETIQUETA', 'VIDEO']); assert.ok(anx.every((x) => x.CLIENTE_ID === 'c1' && x.PUBLICO === 'CLIENTE' && x.ARQUIVO_ID));
  // fila interna (Assistência técnica > Solicitações dos clientes) com o que o portal acrescentou
  const fila = a.api('s_gil', 'solicitacoes', {}).solicitacoes.find((x) => x.id === s.ID);
  assert.equal(fila.portal.setor, 'CME'); assert.match(fila.portal.contrato, /CT-ALFA-2026/); assert.equal(fila.portal.situacaoInformada, 'Parado'); assert.equal(fila.portal.anexos.length, 3);
  assert.match(fila.portal.aceiteAte, /19\/10\/2026 14:00/, 'prazo de resposta de 4 h úteis');
  // pendência na central para quem faz a triagem; nunca para a conta de cliente
  assert.ok(a.pend('s_gil').some((i) => i.tipo === 'pcl_pedido'));
  assert.ok(!a.pend('s_cliente.alfa').some((i) => /^pcl_/.test(i.tipo)));
  // PC01: quem abriu e o contato no local, só e-mail, sem anexo
  const pc01 = a.emails.filter((e) => /Metrolabs — Pedido SOL-2026-\d{4} recebido/.test(e.subject));
  assert.deepEqual(pc01.map((e) => String(e.to)).sort(), ['rui@alfa.exemplo.test', 'sonia@alfa.exemplo.test']);
  assert.ok(pc01.every((e) => !e.attachments), 'sem anexo');
  assert.equal(a.whats.length, w0, 'nenhum WhatsApp ao cliente');
  assert.ok(a.lin('PCL_ACESSOS').some((x) => x.ACAO === 'PEDIDO' && x.USUARIO_ID === 'u_sol'));
  // fora do expediente: a resposta diz que a análise é no próximo horário útil e mostra o plantão (equipamento parado)
  a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS || '{}'), { plantaoTelefone: '(62) 3333-0000' }));
  a.mudar('2026-10-19T21:00:00-03:00');
  const noite = a.pcl('s_sonia.alfa', 'abrir', pedido({ equipamentoId: 'eq2' }));
  assert.equal(noite.ok, true, noite.message); assert.equal(noite.foraDoExpediente, true);
  assert.match(noite.message, /próximo horário útil/); assert.match(noite.message, /plantão da Metrolabs: \(62\) 3333-0000/);
  assert.ok(a.emails.some((e) => /SOL-2026-0002 recebido/.test(e.subject)), 'PC01 sai na hora mesmo fora do expediente');
});

test('T2.5: a conversão leva o prazo do contrato (SLA_FONTE = CONTRATO) e o CONTRATO_ID; o cliente vê o prazo do contrato, nunca a prioridade', () => {
  const a = amb();
  const k = contrato(a);
  const reg = a.api('s_dora', 'regras', {}).regras;
  reg.contratos = [{ clienteId: 'c1', clienteNome: 'Hospital Teste Alfa', prazos: { P2: { atendimentoMin: 600, chegadaMin: 0 } } }];
  assert.equal(a.api('s_dora', 'regras', { salvar: reg, motivo: 'Prazo de 10 horas úteis do contrato do Hospital Alfa' }).ok, true);
  const r = a.pcl('s_cliente.alfa', 'abrir', pedido());
  const ch = converter(a, r.solicitacao.id, 'P2');
  const linha = a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch.id);
  assert.equal(linha.SLA_FONTE, 'CONTRATO'); assert.equal(Number(linha.SLA_MIN_UTEIS), 600); assert.equal(linha.CONTRATO_ID, k.ID); assert.equal(linha.CANAL, 'PORTAL');
  const f = a.pcl('s_cliente.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id });
  assert.equal(f.ok, true, f.message);
  assert.match(f.item.prazo.texto, /Prazo de atendimento do contrato: até \d{2}\/\d{2}\/2026 \d{2}:\d{2} \(dentro do prazo\)/);
  semProibidas(Object.assign({}, f, { orcamentos: [] }), 'ficha');
  // o pedido aceito aparece para o cliente com o número do chamado; PC02 por e-mail
  const fp = a.pcl('s_cliente.alfa', 'chamado', { tipo: 'SOLICITACAO', id: r.solicitacao.id });
  assert.equal(fp.tipo, 'CHAMADO', 'o pedido aceito abre a ficha do chamado');
  assert.ok(fp.linhaDoTempo.some((e) => /Pedido aceito pela Metrolabs: virou o chamado/.test(e.texto) && e.por === 'Metrolabs'));
  assert.ok(a.emails.some((e) => /Pedido SOL-2026-0001 aceito: chamado CH-2026-0001/.test(e.subject) && String(e.to) === 'cli@alfa.exemplo.test'));
  // sem prazo no contrato (Regras da assistência), o prazo vem da prioridade e o cliente não vê prazo
  const r2 = a.pcl('s_cliente.beta', 'abrir', { unidadeId: 'un2', equipamentoId: 'eq3', setor: 'Laboratório', sintoma: 'A estufa não aquece e o termômetro marca a temperatura ambiente o dia inteiro', inicio: 'hoje', naoExibe: true, situacao: 'PARCIAL', risco: 'Perder as amostras', tentado: 'Nada', contatoNome: 'Bia', contatoTelefone: '62988887777', contatoEmail: 'cli@beta.exemplo.test' });
  assert.equal(r2.ok, true, r2.message);
  const ch2 = converter(a, r2.solicitacao.id, 'P3');
  assert.equal(a.lin('ATEC_CHAMADOS').find((x) => x.ID === ch2.id).SLA_FONTE, 'PADRAO');
  assert.equal(a.pcl('s_cliente.beta', 'chamado', { tipo: 'CHAMADO', id: ch2.id }).item.prazo, null);
});

test('T2.6: as 8 etapas mapeiam todas as situações internas do pedido e do chamado', () => {
  const a = amb();
  const et = (tipo, sit, id) => j(a.ctx.PCl_etapaCliente_(tipo, { ID: id || 'x', SITUACAO: sit }));
  const situacoes = Object.keys(a.ctx.AST_SITUACOES);
  assert.ok(situacoes.length >= 18, 'todas as situações da Assistência');
  situacoes.forEach((s) => { const e = et('CHAMADO', s); assert.ok(e.n >= 0 && e.n <= 8 && e.nome, s + ' sem etapa'); });
  const esperado = { ABERTO: 1, EM_TRIAGEM: 3, AGUARDANDO_CLIENTE: 3, LAUDO: 3, AGUARDANDO_REPRESENTADA: 3, AGUARDANDO_ORCAMENTO: 3, AGUARDANDO_PECA: 5, PLANEJADO: 6, AGENDADO: 6, EM_DESLOCAMENTO: 6,
    NO_LOCAL: 7, EM_EXECUCAO: 7, PAUSADO: 7, DOC_PENDENTE: 7, RESOLVIDO_REMOTO: 8, ENCERRADO: 8, AGUARDANDO_ENCERRAMENTO: 8, CANCELADO: 0 };
  Object.keys(esperado).forEach((s) => assert.equal(et('CHAMADO', s).n, esperado[s], s));
  assert.deepEqual(['NOVA', 'COMPLEMENTO', 'DESCARTADA', 'CANCELADA'].map((s) => et('SOLICITACAO', s).n), [1, 2, 0, 0]);
  assert.equal(et('SOLICITACAO', 'DESCARTADA').nome, 'Recusado'); assert.equal(et('CHAMADO', 'CANCELADO').nome, 'Cancelado');
  // "Aguardando sua aprovação" só com orçamento enviado ao cliente
  a.tabelas.ATEC_ORCAMENTOS = (a.tabelas.ATEC_ORCAMENTOS || []).concat([{ ID: 'o1', CHAMADO_ID: 'chX', SITUACAO: 'EMITIDO', CLIENTE_ID: 'c1' }]);
  a.ctx.PCl_memoLimpar_();
  assert.equal(et('CHAMADO', 'AGUARDANDO_ORCAMENTO', 'chX').n, 4); assert.equal(et('CHAMADO', 'AGUARDANDO_ORCAMENTO', 'chX').nome, 'Aguardando sua aprovação');
  // nomes na ordem da especificação e o Kanban de 8 colunas
  assert.deepEqual(j(a.ctx.PCL_ETAPAS).map((e) => e.nome), ['Recebido', 'Complemento pedido', 'Em análise', 'Aguardando sua aprovação', 'Aguardando peça', 'Visita agendada', 'Em atendimento', 'Concluído']);
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', {}).kanban.length, 8);
  // a tela antiga ("Meus chamados") e os documentos A4 continuam com as 5 etapas até a etapa 6
  assert.equal(j(a.ctx.AST_ETAPAS_CLIENTE).length, 5);
});

test('T2.7: o nome do técnico (nome e sobrenome) só aparece nas etapas 6 e 7, com a visita agendada ou em andamento', () => {
  const a = amb();
  const r = a.pcl('s_cliente.alfa', 'abrir', pedido());
  const ch = converter(a, r.solicitacao.id);
  const linha = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === ch.id);
  Object.assign(linha, { TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE', AGENDADO_PARA: '2026-10-20T09:00:00' });
  const ver = (sit) => { linha.SITUACAO = sit; const f = a.pcl('s_cliente.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id }); assert.equal(f.ok, true, f.message); return f.item; };
  ['ABERTO', 'EM_TRIAGEM', 'AGUARDANDO_PECA', 'PLANEJADO', 'RESOLVIDO_REMOTO', 'ENCERRADO', 'CANCELADO'].forEach((s) => { const it = ver(s); assert.equal(it.tecnico, '', s); });
  ['AGENDADO', 'EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADO', 'DOC_PENDENTE'].forEach((s) => { const it = ver(s); assert.ok(it.etapa === 6 || it.etapa === 7, s); assert.equal(it.tecnico, 'Tiago Tecnico', s); });
  // nunca o telefone nem o identificador do técnico; a lista segue a mesma regra
  linha.SITUACAO = 'AGENDADO';
  const txt = JSON.stringify(a.pcl('s_cliente.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id })) + JSON.stringify(a.pcl('s_cliente.alfa', 'chamados', {}));
  assert.ok(!/u_tec|tiago@exemplo|TIAGO TECNICO TESTE/.test(txt));
  linha.SITUACAO = 'EM_TRIAGEM';
  assert.ok(!JSON.stringify(a.pcl('s_cliente.alfa', 'chamados', {})).includes('Tiago'));
});

test('T2.8: a nota interna nunca chega ao cliente; a mensagem da Metrolabs mostra o primeiro nome seguido de "(Metrolabs)"', () => {
  const a = amb();
  const r = a.pcl('s_sonia.alfa', 'abrir', pedido());
  const ch = converter(a, r.solicitacao.id);
  // cliente escreve no pedido; a Metrolabs responde e grava nota interna no chamado
  let m = a.pcl('s_sonia.alfa', 'enviarMensagem', { refTipo: 'SOLICITACAO', refId: r.solicitacao.id, texto: 'A autoclave voltou a apitar agora há pouco', anexo: { nome: 'foto.jpg', tipo: 'image/jpeg', base64: Buffer.alloc(500, 2).toString('base64') } });
  assert.equal(m.ok, true, m.message);
  assert.equal(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: ch.id, texto: 'NOTA SIGILOSA: cliente atrasou o pagamento', interna: true }).ok, true);
  assert.equal(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: ch.id, texto: 'Recebemos, o técnico liga em seguida.', anexo: { nome: 'interno.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4').toString('base64') }, interna: true }).ok, true);
  assert.equal(a.pcl('s_gil', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: ch.id, texto: 'Recebemos, o técnico liga em seguida.' }).ok, true);
  const f = a.pcl('s_sonia.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id });
  const txt = JSON.stringify(f);
  assert.ok(!txt.includes('NOTA SIGILOSA'), 'a nota interna não aparece na ficha'); assert.ok(!txt.includes('interno.pdf'), 'nem o anexo interno');
  assert.deepEqual(f.mensagens.map((x) => x.autor), ['SONIA SOLICITANTE TESTE', 'Gil (Metrolabs)'], 'a conversa junta o pedido e o chamado');
  assert.ok(f.mensagens[0].anexo && /^\/arquivos\//.test(f.mensagens[0].anexo.url));
  semProibidas(f.mensagens, 'mensagens');
  assert.ok(!JSON.stringify(a.pcl('s_sonia.alfa', 'mensagens', { refTipo: 'CHAMADO', refId: ch.id })).includes('NOTA SIGILOSA'));
  // a equipe vê tudo, com a marca de interna
  const ci = a.pcl('s_gil', 'conversaInterna', { refTipo: 'CHAMADO', refId: ch.id });
  assert.equal(ci.mensagens.filter((x) => x.interna).length, 2);
  assert.equal(a.pcl('s_gil', 'conversas', {}).conversas.length, 2);
  // a trava de arquivo: o anexo do cliente abre para ele, não para outro cliente; o anexo interno não abre para ninguém do cliente
  const anxCli = a.lin('PCL_ANEXOS').find((x) => x.NOME === 'foto.jpg'), anxInt = a.lin('PCL_ANEXOS').find((x) => x.NOME === 'interno.pdf');
  a.ctx.PCl_memoLimpar_();
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', anxCli.ARQUIVO_ID), true);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_cliente.beta', anxCli.ARQUIVO_ID), false);
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_saulo.alfa', anxCli.ARQUIVO_ID), false, 'Solicitante de outra unidade');
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', anxInt.ARQUIVO_ID), false, 'anexo interno');
  // retirada com motivo: o cliente deixa de ver e de abrir; o registro fica
  assert.equal(a.pcl('s_gil', 'retirarAnexo', { id: anxCli.ID, motivo: 'curto' }).faltam[0].campo, 'pclRetirarMotivo');
  assert.equal(a.pcl('s_gil', 'retirarAnexo', { id: anxCli.ID, motivo: 'Foto mostra o rosto de um paciente' }).ok, true);
  a.ctx.PCl_memoLimpar_();
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_('s_sonia.alfa', anxCli.ARQUIVO_ID), false);
  assert.ok(!JSON.stringify(a.pcl('s_sonia.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id })).includes('foto.jpg'));
  assert.ok(a.lin('PCL_ANEXOS').find((x) => x.ID === anxCli.ID).REMOVIDO_MOTIVO);
  // canal geral; Consulta só lê; o cliente nunca chama as ações internas
  assert.equal(a.pcl('s_cliente.alfa', 'enviarMensagem', { refTipo: 'GERAL', texto: 'O certificado da autoclave AC-01 não aparece' }).ok, true);
  const con = a.pcl('s_celia.alfa', 'enviarMensagem', { refTipo: 'GERAL', texto: 'Teste' });
  assert.equal(con.ok, false); assert.match(con.message, /«Consulta»/);
  assert.equal(a.pcl('s_celia.alfa', 'mensagens', { refTipo: 'GERAL' }).mensagens.length, 1);
  assert.equal(a.pcl('s_sonia.alfa', 'conversaInterna', { refTipo: 'CHAMADO', refId: ch.id }).codigo, 'NAO_PERMITIDO');
  // quem não tem a caixa de conversar não responde (Vera é do Comercial)
  assert.match(a.pcl('s_vera', 'enviarMensagemInterna', { refTipo: 'CHAMADO', refId: ch.id, texto: 'oi' }).message, /Responder pedidos e conversas do portal/);
});

test('T2.9: o cancelamento pelo cliente só acontece antes da visita, com motivo e pelo papel certo', () => {
  const a = amb();
  const p = a.pcl('s_sonia.alfa', 'abrir', pedido());
  // motivo obrigatório; Consulta e Solicitante de outro pedido não cancelam
  assert.equal(a.pcl('s_sonia.alfa', 'cancelar', { tipo: 'SOLICITACAO', id: p.solicitacao.id, motivo: 'curto' }).faltam[0].campo, 'pclCancelarMotivo');
  assert.match(a.pcl('s_celia.alfa', 'cancelar', { tipo: 'SOLICITACAO', id: p.solicitacao.id, motivo: 'Não precisa mais do atendimento' }).message, /«Consulta»/);
  const pg = a.pcl('s_cliente.alfa', 'abrir', pedido({ equipamentoId: 'eq2' }));
  assert.match(a.pcl('s_sonia.alfa', 'cancelar', { tipo: 'SOLICITACAO', id: pg.solicitacao.id, motivo: 'Não precisa mais do atendimento' }).message, /não foi aberto por você/);
  // pedido NOVA: cancela
  const c1 = a.pcl('s_sonia.alfa', 'cancelar', { tipo: 'SOLICITACAO', id: p.solicitacao.id, motivo: 'O equipamento voltou a funcionar depois de reiniciar' });
  assert.equal(c1.ok, true, c1.message);
  const s = a.lin('ATEC_SOLICITACOES').find((x) => x.ID === p.solicitacao.id);
  assert.equal(s.SITUACAO, 'CANCELADA'); assert.match(s.CANCELADA_MOTIVO, /voltou a funcionar/);
  assert.equal(a.pcl('s_sonia.alfa', 'chamado', { tipo: 'SOLICITACAO', id: s.ID }).item.etapa, 0);
  // chamado antes da visita (PLANEJADO e AGENDADO) cancela; com o técnico a caminho, não
  const pg2 = a.pcl('s_cliente.alfa', 'abrir', pedido({ confirmarRepetido: true }));
  const ch = converter(a, pg2.solicitacao.id);
  const linha = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === ch.id);
  linha.SITUACAO = 'EM_DESLOCAMENTO';
  const nao = a.pcl('s_cliente.alfa', 'cancelar', { tipo: 'CHAMADO', id: ch.id, motivo: 'Não precisa mais do atendimento' });
  assert.equal(nao.ok, false); assert.match(nao.message, /já está em atendimento.*escreva na conversa do chamado/);
  assert.equal(a.pcl('s_cliente.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id }).pode.cancelar, false);
  linha.SITUACAO = 'PLANEJADO';
  assert.equal(a.pcl('s_cliente.alfa', 'chamado', { tipo: 'CHAMADO', id: ch.id }).pode.cancelar, true);
  const sim = a.pcl('s_cliente.alfa', 'cancelar', { tipo: 'CHAMADO', id: ch.id, motivo: 'Equipamento será substituído pela empresa' });
  assert.equal(sim.ok, true, sim.message);
  assert.equal(linha.SITUACAO, 'CANCELADO'); assert.match(linha.CANCELADO_MOTIVO, /Cancelado pelo cliente/);
  assert.ok(a.lin('ATEC_AVISOS').some((x) => x.TIPO === 'PCL_CANCELADO' && x.DESTINATARIO_ID === 'u_gt'), 'a triagem é avisada');
});

test('T2.10: aceite do atendimento — confirmar, "o problema continua" (pedido ligado, reincidência e PI03) e confirmado por prazo em 5 dias úteis', () => {
  const a = amb();
  a.ctx.PortalCliente_rotinaChamados_({}); // a primeira rotina grava o início da regra (aceiteDesde = hoje)
  assert.equal(JSON.parse(a.props.PCL_REGRAS).aceiteDesde, '2026-10-19');
  const abrirEncerrar = (eq, quando) => {
    const p = a.pcl('s_sonia.alfa', 'abrir', pedido({ equipamentoId: eq, confirmarRepetido: true }));
    const ch = converter(a, p.solicitacao.id);
    Object.assign(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === ch.id), { SITUACAO: 'ENCERRADO', ATENDIDO_EM: quando, ENCERRADO_EM: quando });
    return ch;
  };
  // encerrado antes da regra não pede aceite
  const velho = abrirEncerrar('eq2', '2026-10-15T10:00:00');
  assert.equal(a.pcl('s_sonia.alfa', 'chamado', { tipo: 'CHAMADO', id: velho.id }).pode.confirmar, false);
  // confirmar (comentário opcional); de novo, recusa com o caminho
  const c1 = abrirEncerrar('eq1', '2026-10-20T10:00:00');
  const f1 = a.pcl('s_sonia.alfa', 'chamado', { tipo: 'CHAMADO', id: c1.id });
  assert.equal(f1.pode.confirmar, true); assert.equal(f1.item.aceite.ate, '27/10/2026', '5 dias úteis');
  assert.ok(a.pcl('s_sonia.alfa', 'chamados', {}).precisaDeVoce.some((p) => p.id === c1.id));
  assert.match(a.pcl('s_celia.alfa', 'confirmarAtendimento', { id: c1.id }).message, /«Consulta»/);
  const ok1 = a.pcl('s_sonia.alfa', 'confirmarAtendimento', { id: c1.id, texto: 'Técnico atencioso e rápido' });
  assert.equal(ok1.ok, true, ok1.message);
  const l1 = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c1.id);
  assert.equal(l1.CLIENTE_ACEITE_TIPO, 'CONFIRMADO'); assert.equal(l1.CLIENTE_ACEITE_POR_NOME, 'SONIA SOLICITANTE TESTE'); assert.equal(l1.CLIENTE_ACEITE_TEXTO, 'Técnico atencioso e rápido');
  assert.match(a.pcl('s_sonia.alfa', 'confirmarAtendimento', { id: c1.id }).message, /já foi registrada/);
  // "o problema continua": relato com 30 letras; pedido novo ligado; reincidência na conversão; PI03
  const c2 = abrirEncerrar('eq2', '2026-10-20T11:00:00');
  assert.equal(a.pcl('s_sonia.alfa', 'reabrir', { id: c2.id, texto: 'Voltou' }).faltam[0].campo, 'pclReabrirTexto');
  const e0 = a.emails.length;
  const re = a.pcl('s_sonia.alfa', 'reabrir', { id: c2.id, texto: 'A lavadora voltou a vazar pela porta no segundo ciclo do dia seguinte' });
  assert.equal(re.ok, true, re.message); assert.match(re.message, /ligado ao chamado CH-/);
  const l2 = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c2.id), novo = a.lin('ATEC_SOLICITACOES').find((x) => x.ID === re.solicitacao.id);
  assert.equal(l2.CLIENTE_ACEITE_TIPO, 'REABERTO'); assert.equal(l2.REABERTO_POR_SOL_ID, novo.ID); assert.equal(novo.REABRE_CHAMADO_ID, c2.id); assert.equal(novo.EQUIPAMENTO_ID, 'eq2');
  assert.ok(a.lin('ATEC_AVISOS').some((x) => x.TIPO === 'PCL_REABERTO' && x.DESTINATARIO_ID === 'u_gt'), 'PI03 à gestão Técnica');
  assert.ok(a.emails.slice(e0).some((e) => /O cliente informou que o problema continua/.test(e.subject)));
  assert.ok(a.pend('s_gil').some((i) => i.tipo === 'pcl_reaberto'));
  const ch3 = converter(a, novo.ID);
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === ch3.id).REINCIDENTE, 'SIM', 'a Assistência marca a reincidência (mesmo equipamento em 30 dias)');
  // confirmado por prazo: a rotina só marca depois dos 5 dias úteis (20/10 -> até 27/10)
  const c4 = abrirEncerrar('eq1', '2026-10-20T15:00:00');
  a.mudar('2026-10-27T10:00:00-03:00');
  a.ctx.PortalCliente_rotinaChamados_({});
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c4.id).CLIENTE_ACEITE_TIPO || '', '', 'no último dia ainda vale a resposta do cliente');
  a.mudar('2026-10-28T10:00:00-03:00');
  const rot = a.ctx.PortalCliente_rotinaChamados_({});
  const l4 = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c4.id);
  assert.equal(l4.CLIENTE_ACEITE_TIPO, 'PRAZO'); assert.match(l4.CLIENTE_ACEITE_POR_NOME, /Prazo de 5 dias úteis \(27\/10\/2026\)/);
  assert.ok(rot.aceitesPorPrazo >= 1);
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === velho.id).CLIENTE_ACEITE_TIPO || '', '', 'o encerrado antes da regra não é marcado');
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c1.id).CLIENTE_ACEITE_TIPO, 'CONFIRMADO', 'o confirmado não muda');
  assert.equal(a.pcl('s_sonia.alfa', 'chamado', { tipo: 'CHAMADO', id: c4.id }).item.aceite.nome, 'Confirmado por prazo');
  // o prazo é configurável (Regras do portal) e a rotina da Assistência chama a do portal
  assert.match(a.ctx.Assistencia_rotina_.toString(), /PortalCliente_rotinaChamados_/);
});

test('T2.11: em modo consulta, o botão vira "Pedir atendimento avulso" e o pedido entra com SEM_CONTRATO, sem contrato, para orçamento', () => {
  const a = amb();
  // contrato do cliente c2 terminou há 40 dias: carência de 30 vencida -> CONSULTA
  assert.equal(a.pcl('s_dora', 'salvar', { clienteId: 'c2', unidades: [], numero: 'CT-BETA-2025', objeto: 'Manutenção da estufa do laboratório', origemTipo: 'ASSINADO', servicos: [{ servico: 'MANUTENCAO_CORRETIVA', periodicidade: 'SOB_DEMANDA' }],
    inicio: '2025-09-01', fim: '2026-09-09', responsavelId: 'u_gt', motivo: 'Contrato encerrado (teste do modo consulta)' }).ok, true);
  assert.equal(a.ctx.PCl_situacaoAcesso_('c2', '', '').situacao, 'CONSULTA');
  const lista = a.pcl('s_cliente.beta', 'chamados', {});
  assert.equal(lista.acesso.podeAbrir, true); assert.equal(lista.acesso.avulso, true); assert.match(lista.acesso.motivoAbrir, /modo consulta.*atendimento avulso/);
  const fm = a.pcl('s_cliente.beta', 'formAbrir', {});
  assert.equal(fm.avulso, true);
  const r = a.pcl('s_cliente.beta', 'abrir', { unidadeId: 'un2', equipamentoId: 'eq3', setor: 'Laboratório', sintoma: 'A estufa não aquece e o termômetro marca a temperatura ambiente o dia inteiro', inicio: 'hoje', naoExibe: true, situacao: 'PARCIAL', risco: 'Perder as amostras', tentado: 'Nada', contatoNome: 'Bia', contatoTelefone: '62988887777', contatoEmail: 'cli@beta.exemplo.test' });
  assert.equal(r.ok, true, r.message); assert.equal(r.avulso, true); assert.match(r.message, /atendimento avulso: a Metrolabs envia o orçamento antes de atender/);
  const s = a.lin('ATEC_SOLICITACOES').find((x) => x.ID === r.solicitacao.id);
  assert.equal(s.SEM_CONTRATO, 'SIM'); assert.equal(s.CONTRATO_ID, ''); assert.match(s.DESCRICAO, /Atendimento avulso, sem contrato: orçar antes/);
  const fila = a.api('s_gil', 'solicitacoes', {}).solicitacoes.find((x) => x.id === s.ID);
  assert.equal(fila.portal.semContrato, true);
  const ch = converter(a, s.ID, 'P3');
  assert.ok(a.lin('ATEC_EVENTOS').some((e) => e.ENTIDADE_ID === ch.id && e.TIPO === 'AVULSO'), 'o chamado avisa a equipe: orçar antes');
  assert.equal(a.pcl('s_cliente.beta', 'chamado', { tipo: 'CHAMADO', id: ch.id }).item.semContrato, true);
  // SUSPENSO/SEM_ACESSO não abre (nem entra); papel Consulta nunca abre, mesmo em PLENO
  const pc = a.pcl('s_celia.alfa', 'abrir', pedido());
  assert.equal(pc.ok, false); assert.equal(pc.codigo, 'PAPEL'); assert.match(pc.message, /«Consulta».*Por quê: .*O que fazer: /);
  assert.equal(a.pcl('s_celia.alfa', 'formAbrir', {}).pode, false);
});

test('T2.12: o limite de 20 pedidos por pessoa por dia é respeitado (configurável); no dia seguinte volta ao normal', () => {
  const a = amb();
  for (let i = 0; i < 20; i++) { const r = a.pcl('s_cliente.alfa', 'abrir', pedido({ confirmarRepetido: true, fotos: [], etiquetas: [] })); assert.equal(r.ok, true, 'pedido ' + (i + 1) + ': ' + r.message); }
  const r21 = a.pcl('s_cliente.alfa', 'abrir', pedido({ confirmarRepetido: true, fotos: [], etiquetas: [] }));
  assert.equal(r21.ok, false); assert.equal(r21.codigo, 'LIMITE'); assert.match(r21.message, /20 pedidos hoje.*Por quê: .*O que fazer: /);
  assert.equal(a.lin('ATEC_SOLICITACOES').length, 20);
  // outra pessoa do mesmo cliente não é afetada
  assert.equal(a.pcl('s_sonia.alfa', 'abrir', pedido({ confirmarRepetido: true, fotos: [], etiquetas: [] })).ok, true);
  // no dia seguinte, volta
  a.mudar('2026-10-20T09:00:00-03:00');
  assert.equal(a.pcl('s_cliente.alfa', 'abrir', pedido({ confirmarRepetido: true, fotos: [], etiquetas: [] })).ok, true);
  // a regra é configurável em Regras do portal (Administrador e Diretoria), com motivo e sem perder as outras regras
  const g = a.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', limitePedidosDia: 1, plantaoTelefone: '(62) 3333-0000', motivo: 'Teste do limite de pedidos' });
  assert.equal(g.ok, true, g.message);
  const rg = a.pcl('s_dora', 'regras', {}).chamados;
  assert.equal(rg.limitePedidosDia, 1); assert.equal(rg.plantaoTelefone, '(62) 3333-0000'); assert.equal(rg.aceiteDiasUteis, 5);
  assert.equal(a.pcl('s_cliente.alfa', 'abrir', pedido({ confirmarRepetido: true, fotos: [], etiquetas: [] })).codigo, 'LIMITE');
  assert.equal(a.pcl('s_dora', 'salvarRegras', { carenciaDias: 30, consultaMeses: 12, transicao: 'CONSULTA', contatoComercial: 'o Comercial da Metrolabs', limitePedidosDia: 500, motivo: 'Valor fora da faixa' }).faltam[0].campo, 'pclRgLimitePedidos');
  // limite de mensagens por hora
  a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS), { limiteMensagensHora: 5 }));
  for (let i = 0; i < 5; i++) assert.equal(a.pcl('s_sonia.alfa', 'enviarMensagem', { refTipo: 'GERAL', texto: 'Mensagem ' + i }).ok, true);
  assert.equal(a.pcl('s_sonia.alfa', 'enviarMensagem', { refTipo: 'GERAL', texto: 'Mais uma' }).codigo, 'LIMITE');
});

test('complemento e recusa do pedido do portal: o cliente vê a pergunta e o motivo, responde, e o aviso (PC02) espera o horário comercial', () => {
  const a = amb();
  const p = a.pcl('s_sonia.alfa', 'abrir', pedido());
  // a equipe pede complemento fora do expediente: o e-mail espera a fila
  a.mudar('2026-10-19T19:30:00-03:00');
  const e0 = a.emails.length;
  assert.equal(a.api('s_gil', 'complemento', { solicitacaoId: p.solicitacao.id, pergunta: 'Envie a foto do visor com o código de erro' }).ok, true);
  assert.equal(a.emails.length, e0, 'fora do horário comercial: nada sai agora');
  assert.equal(a.lin('PCL_AVISOS_FILA').filter((f) => f.SITUACAO === 'PENDENTE').length, 1);
  const f = a.pcl('s_sonia.alfa', 'chamado', { tipo: 'SOLICITACAO', id: p.solicitacao.id });
  assert.equal(f.item.etapa, 2); assert.equal(f.pode.responderComplemento, true); assert.match(f.item.complementoPergunta, /foto do visor/);
  assert.ok(a.pcl('s_sonia.alfa', 'chamados', {}).precisaDeVoce.some((x) => /mais informações/.test(x.texto)));
  // na manhã seguinte a rotina envia
  a.mudar('2026-10-20T08:30:00-03:00');
  a.ctx.PortalCliente_rotinaChamados_({});
  assert.ok(a.emails.slice(e0).some((e) => /SOL-2026-0001: falta uma informação/.test(e.subject) && String(e.to) === 'sonia@alfa.exemplo.test'));
  assert.equal(a.lin('PCL_AVISOS_FILA').filter((x) => x.SITUACAO === 'ENVIADO').length, 1);
  // o cliente responde; volta para a fila da Metrolabs
  assert.equal(a.pcl('s_sonia.alfa', 'responderComplemento', { id: p.solicitacao.id, resposta: 'curta' }).faltam[0].campo, 'pclComplTexto');
  assert.equal(a.pcl('s_sonia.alfa', 'responderComplemento', { id: p.solicitacao.id, resposta: 'O visor mostra E-07 e depois apaga', fotos: [FOTO] }).ok, true);
  assert.equal(a.lin('ATEC_SOLICITACOES').find((x) => x.ID === p.solicitacao.id).SITUACAO, 'NOVA');
  // recusa: o cliente vê o motivo e recebe o e-mail
  assert.equal(a.api('s_gil', 'descartar', { solicitacaoId: p.solicitacao.id, motivo: 'O mesmo problema já está no chamado CH-2026-0009' }).ok, true);
  const fr = a.pcl('s_sonia.alfa', 'chamado', { tipo: 'SOLICITACAO', id: p.solicitacao.id });
  assert.equal(fr.item.etapa, 0); assert.match(fr.item.recusaMotivo, /CH-2026-0009/);
  assert.ok(a.emails.some((e) => /não pôde ser atendido/.test(e.subject)));
  assert.equal(a.whats.length, 0, 'nada de WhatsApp');
});

test('lista, Kanban e Gantt da conta de cliente; filtros; portão de funções; nada proibido nas respostas', () => {
  const a = amb();
  const p1 = a.pcl('s_cliente.alfa', 'abrir', pedido());
  const p2 = a.pcl('s_cliente.alfa', 'abrir', pedido({ unidadeId: 'un1b', equipamentoId: 'eq4', setor: 'Centro cirúrgico' }));
  converter(a, p1.solicitacao.id);
  const r = a.pcl('s_cliente.alfa', 'chamados', {});
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(r.itens.map((x) => x.tipo).sort(), ['CHAMADO', 'SOLICITACAO'], 'o pedido aceito aparece como chamado (sem repetir)');
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', { unidadeId: 'un1b' }).itens.length, 1);
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', { busca: 'sl-04' }).itens[0].numero, p2.solicitacao.numero, 'busca pela TAG');
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', { busca: 'centro cir' }).itens.length, 1, 'busca pelo setor');
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', { etapa: 1 }).itens.length, 2);
  assert.equal(r.gantt.length, 2); assert.ok(r.kanban[0].itens.length === 2);
  semProibidas(r, 'lista');
  // as ações que a tela do cliente chama estão na lista fechada do servidor (PortalCliente_api)
  assert.equal(a.ctx.PCl_funcaoNaLista_('PortalCliente_api'), true);
  ['chamados', 'chamado', 'formAbrir', 'abrir', 'responderComplemento', 'cancelar', 'confirmarAtendimento', 'reabrir', 'mensagens', 'enviarMensagem', 'enviarImagens'].forEach((k) => assert.equal(a.ctx.PCL_ACOES_CLIENTE[k], true, k));
  // fotos depois da abertura
  const fg = a.pcl('s_cliente.alfa', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p2.solicitacao.id, fotos: [FOTO, FOTO] });
  assert.equal(fg.ok, true, fg.message); assert.equal(fg.galeria.length, 4);
  assert.equal(a.pcl('s_cliente.alfa', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p2.solicitacao.id, fotos: [] }).faltam[0].campo, 'pclGalFotos');
  // termo pendente trava o que grava (lista continua)
  a.props.PCL_REGRAS = JSON.stringify(Object.assign(JSON.parse(a.props.PCL_REGRAS || '{}'), { termoVersao: '2099-01-01' }));
  assert.equal(a.pcl('s_cliente.alfa', 'abrir', pedido({ equipamentoId: 'eq2' })).codigo, 'TERMO_PENDENTE');
  assert.equal(a.pcl('s_cliente.alfa', 'chamados', {}).ok, true);
});

test('tela, ajuda e manual: menu, rotas, explicação de cada campo, guias, ajuda das telas, manual e nenhum alert', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html'), tela = ler('JS_PortalCliente_Chamados.html'), aj = ler('JS_PortalCliente_Ajuda.html'), pcl = ler('JS_PortalCliente.html'), ast = ler('JS_Assistencia.html');
  assert.match(idx, /id="menu-btn-portal_cliente_chamados"/); assert.match(idx, /id="menu-btn-portal_cliente_conversas"/); assert.match(idx, /include\('JS_PortalCliente_Chamados'\)/);
  assert.match(core, /mod === "portal_cliente_chamados"/); assert.match(core, /mod === "portal_cliente_conversas"/); assert.match(core, /portal_cliente_chamados: "Chamados"/);
  assert.match(core, /legenda: "Chamados", mod: "portal_cliente_chamados"/);
  assert.match(ast, /PclCh_abrirNovo_/); assert.match(ast, /PclChI_parte_/); assert.match(ast, /PclChI_solHtml_/);
  // todo campo de formulário da tela nova e das regras novas tem explicação (PCL_DICAS)
  const ids = [...tela.matchAll(/<(?:input|select|textarea)[^>]* id="(pcl[A-Za-z]+)"/g)].map((m) => m[1]).concat([...pcl.matchAll(/id="(pclRg(?:Plantao|AceitePedido|AceiteDias|LimitePedidos|LimiteMensagens))"/g)].map((m) => m[1]));
  assert.ok(ids.length >= 35, 'campos na tela: ' + ids.length);
  const semDica = [...new Set(ids)].filter((id) => !new RegExp('\\b' + id + ':').test(aj));
  assert.deepEqual(semDica, [], 'todo campo tem explicação');
  ['chamados', 'abrirChamado', 'fichaChamado', 'conversaGeral', 'conversas'].forEach((g) => assert.match(aj, new RegExp('\\b' + g + ': \\[')));
  assert.doesNotMatch(tela, /window\.(confirm|prompt|alert)\(|\balert\(/);
  assert.match(tela, /text-align: ?justify/);
  // ajuda das telas (cliente sem recurso administrativo) e nomes no índice da ajuda
  const ctx = vm.createContext({}); vm.runInContext(ler('SGO_Ajuda_PortalCliente.js'), ctx);
  const telas = ctx.SGO_ajudaTelas_PortalCliente_();
  ['portal_cliente_chamados', 'portal_cliente_conversas'].forEach((k) => { const t = telas[k]; assert.ok(t && t.titulo && t.paraQueServe && t.passos.length >= 3 && t.problemas.length >= 3, k); });
  assert.doesNotMatch(JSON.stringify(telas.portal_cliente_chamados), /Administração|caixa|PORTAL_CLIENTE_|nota interna/i);
  assert.match(ler('SGO_Ajuda.js'), /portal_cliente_chamados: 'Chamados'/);
  assert.match(ler('SGO_AssistenteErros.js'), /JS_PortalCliente_Chamados: 'portal_cliente_chamados'/);
  const man = lerDoc('MANUAL_MODULO_PORTAL_CLIENTE.md');
  assert.match(man, /## 24\. Chamados pelo Portal/); assert.match(man, /Aguardando sua aprovação/); assert.match(man, /Pedir atendimento avulso/); assert.match(man, /O problema continua/);
  assert.match(man, /PCL_MENSAGENS/); assert.match(man, /PORTAL_CLIENTE_CONVERSAR/); assert.match(man, /5 dias úteis/);
});
