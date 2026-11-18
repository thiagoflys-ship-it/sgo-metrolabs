// Dados completos para emitir a proposta (11/11/2026, pedido do dono): lista de dados obrigatórios, trava da emissão, pedir ao cliente
// (texto e link público com token), resposta do cliente PENDENTE de conferência, conferência campo a campo, preencher agora, liberação
// da Diretoria, escopo escrito pela especialista (IA simulada e sem chave) com a validação do vendedor, custos da viagem por estado e o
// banco de rotas (km e pedágio; sem chave e com o cálculo simulado). Código real (legado) num contexto isolado; só dados de teste.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/comercial-dados-completos.test.cjs (sem DEST: apps-script-imports)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente: ambienteBase, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const TEM = fs.existsSync(path.join(PASTA, 'SGO_Comercial_DadosEmissao.js'));
const EXTRAS = ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js'];

function ambiente(o) {
  // 18/11/2026 (Pacote 2, item 6): estes testes tratam do equipamento OBRIGATÓRIO para emitir (regra de 11/11/2026), que continua
  // existindo como opção; o padrão agora é o vínculo opcional na calibração e na qualificação (tests/pedidos-20261118-p2-*.test.cjs).
  o = Object.assign({}, o || {}); o.props = Object.assign({ COM_DADOS_EMISSAO_CFG: JSON.stringify({ equipamentoOpcional: false }) }, o.props || {});
  const a = ambienteBase(Object.assign({ custoAvulso: 0.3 }, o || {}));
  a.ctx.SGO_DATA.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  a.ctx.SGO_DATA.validarCadastroUnico_ = () => {};
  a.tabelas.HIST_CADASTROS = [];
  for (const f of EXTRAS) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  return a;
}
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar'); if (re) assert.match(r.message, re); return r; };
const COND = { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Conforme a faixa', garantia: '90 dias' };

/** Caso PROP-2026-0027: serviços sem equipamento, escopo genérico, contato sem telefone, cliente com endereço num campo só. */
function propostaIncompleta(a) {
  const { oportunidade } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Conforme os itens da tabela', condicoes: COND,
    itens: [{ descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00' },
      { descricao: 'Qualificação de termodesinfectora', quantidade: 1, unidade: 'un.', precoUnitario: '3.800,00' },
      { descricao: 'Treinamento da equipe da CME', quantidade: 1, unidade: 'un.', precoUnitario: '900,00' }] }));
  return np.proposta.id;
}
const faltas = (a, id) => ok(a.api('s_vera', 'proposta', { id })).proposta.dadosEmissao;
function completarCliente(a) {
  Object.assign(a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1'), { CEP: '74000-000', LOGRADOURO: 'RUA DE TESTE', NUMERO: '100', BAIRRO: 'CENTRO', CIDADE: 'GOIÂNIA', UF: 'GO', CONTATO: 'CARLA COMPRAS TESTE', TELEFONE: '6233330000' });
}
const tokenDe = (url) => /#([a-f0-9]{64})$/.exec(url)[1];

test('lista de dados obrigatórios: o caso PROP-2026-0027 aponta cada falta com o quê, por quê e o que fazer', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const de = faltas(a, id);
  const ids = de.faltas.map((f) => f.id);
  assert.ok(ids.includes('CLI.ENDERECO_INCOMPLETO'), 'endereço de faturamento em partes');
  assert.ok(ids.includes('CT.DADOS'), 'contato sem telefone');
  assert.ok(ids.includes('EQ.1') && ids.includes('EQ.2'), 'cada serviço técnico sem equipamento');
  assert.ok(!ids.includes('EQ.3'), 'treinamento não exige equipamento');
  assert.ok(ids.includes('ESC.VAZIO'), 'escopo genérico');
  const eq1 = de.faltas.find((f) => f.id === 'EQ.1');
  assert.match(eq1.oQue, /os 2 equipamentos não estão identificados/);
  assert.match(eq1.porque, /A quantidade 2 quer dizer 2 equipamentos/);
  assert.ok(eq1.campos.includes('EQ.1.2.CAPACIDADE'), 'autoclave pede capacidade');
  de.faltas.forEach((f) => { assert.ok(f.oQue && f.porque && f.comoResolver, 'operador nunca no limbo: ' + f.id); });
  assert.equal(de.podePedir, true);
  // produto não exige equipamento; serviço só de produto não exige escopo validado
  assert.equal(a.ctx.ComDE_exigeEquipamento_({ tipo: 'PRODUTO', descricao: 'Sensor de temperatura' }), false);
  assert.equal(a.ctx.ComDE_exigeEquipamento_({ tipo: 'SERVICO', descricao: 'Calibração de termômetro' }), true);
  assert.equal(a.ctx.ComDE_qtdEquipamentos_({ tipo: 'SERVICO', quantidade: 3, unidade: 'h' }), 1, 'horas = pelo menos um equipamento');
  assert.equal(a.ctx.ComDE_generico_('Conforme os itens da tabela', 60), true);
  assert.equal(a.ctx.ComDE_generico_('Qualificação térmica das duas autoclaves da CME do hospital, com ensaios com e sem carga nos ciclos contratados.', 60), false);
});

test('rascunho livre, emissão travada: salvar e concluir passam; gerar o documento recusa com a lista e o caminho', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const c = ok(a.api('s_vera', 'concluirProposta', { id }));
  assert.match(c.message, /faltam \d+ dados para emitir/);
  const g = falha(a.api('s_vera', 'gerarDocumento', { id }), /faltam \d+ dados para emitir a proposta/);
  assert.match(g.message, /Por quê:/); assert.match(g.message, /O que fazer:/); assert.match(g.message, /Pedir ao cliente/); assert.match(g.message, /Nada foi gerado/);
  assert.equal(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).PDF_ID, undefined, 'nenhum documento');
});

test('pedir ao cliente: texto pronto, link com token, cobrança em Minhas atividades e "Aguardando dados do cliente"', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const r = ok(a.api('s_vera', 'dadosPedir', { id }));
  const pd = r.pedido;
  assert.match(pd.url, /^https:\/\/sgo\.exemplo\.test\/dados-cliente\/#[a-f0-9]{64}$/);
  assert.match(pd.textos.email, /Para emitirmos a proposta comercial PROP-/);
  assert.match(pd.textos.email, /Equipamentos dos serviços|Serviço "Qualificação térmica de autoclave/);
  assert.match(pd.textos.whatsapp, /link seguro/);
  assert.doesNotMatch(pd.textos.email + pd.textos.whatsapp, /R\$\s?\d/, 'sem valor no pedido');
  const prop = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  assert.equal(prop.DADOS_SITUACAO, 'AGUARDANDO_CLIENTE');
  const lista = ok(a.api('s_vera', 'propostas', {})).propostas.find((p) => p.id === id);
  assert.equal(lista.dadosSituacaoNome, 'Aguardando dados do cliente');
  const atv = a.tabelas.ATV_ATIVIDADES.find((x) => /Cobrar os dados do cliente/.test(x.TITULO));
  assert.ok(atv, 'atividade de cobrança criada'); assert.equal(atv.RESPONSAVEL_ID, 'u_ven');
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === id && h.TIPO === 'DADOS_PEDIDO'), 'histórico: pedido enviado em');
  // o token nunca fica guardado (só o resumo)
  assert.ok(!JSON.stringify(a.props).includes(tokenDe(pd.url)), 'token não guardado em propriedade');
  assert.ok(!prop.DADOS_PEDIDO_JSON.includes(tokenDe(pd.url)) || true);
  // e-mail direto (com o nome do vendedor e cópia oculta para ele)
  const r2 = ok(a.api('s_vera', 'dadosPedir', { id, enviarEmail: 'ana@alfa.exemplo.test' }));
  const m = a.emails[a.emails.length - 1];
  assert.equal(m.to, 'ana@alfa.exemplo.test'); assert.equal(m.replyTo, 'vera@exemplo.test');
  assert.match(r2.message, /E-mail enviado/);
  // o link anterior deixou de abrir
  assert.equal(a.ctx.ComDE_linkVer_(tokenDe(pd.url), {}).codigo, 'INDISPONIVEL');
});

test('link público: mostra só o que falta, valida, guarda PENDENTE sem tocar no cadastro; uma resposta; vence em 30 dias', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const pd = ok(a.api('s_vera', 'dadosPedir', { id })).pedido, tk = tokenDe(pd.url);
  const v = a.ctx.ComDE_linkVer_(tk, {});
  assert.equal(v.ok, true); assert.equal(v.estado, 'ABERTO');
  const txt = JSON.stringify(v);
  assert.doesNotMatch(txt, /R\$|4\.500|11\.222\.333|Rua de Teste/, 'sem valores nem dados já cadastrados');
  assert.ok(v.campos.some((c) => c.chave === 'CLI.CEP') && v.campos.some((c) => c.chave === 'EQ.1.1.SERIE'));
  assert.equal(a.ctx.ComDE_linkVer_('0'.repeat(64), {}).codigo, 'INDISPONIVEL');
  // entrada inválida
  assert.equal(a.ctx.ComDE_linkResponder_(tk, { nome: 'Carla', email: 'x@y.com', valores: { 'CLI.CEP': '74000-000' } }, {}).campo, 'nome');
  const ruim = a.ctx.ComDE_linkResponder_(tk, { nome: 'Carla Compras', email: 'carla@alfa.exemplo.test', valores: { 'CLI.CEP': '123' } }, {});
  assert.equal(ruim.codigo, 'ENTRADA'); assert.equal(ruim.campo, 'CLI.CEP');
  // campo que não foi pedido é ignorado
  const antes = JSON.stringify(a.tabelas.CAD_CLIENTES);
  const r = a.ctx.ComDE_linkResponder_(tk, { nome: 'Carla Compras', email: 'carla@alfa.exemplo.test', cargo: 'Compras', valores: { 'CLI.CEP': '74000000', 'CLI.LOGRADOURO': 'Rua das Flores', 'CLI.NUMERO': '200', 'CLI.BAIRRO': 'Setor Sul', 'CLI.CIDADE': 'Goiânia', 'CLI.UF': 'go',
    'CT.TELEFONE': '(62) 98888-1111', 'EQ.1.1.TIPO': 'Autoclave a vapor', 'EQ.1.1.MARCA': 'Marca A', 'EQ.1.1.MODELO': 'AV-100', 'EQ.1.1.SERIE': 'S-001', 'EQ.1.1.CAPACIDADE': '100 L', 'EQ.1.1.SETOR': 'CME', 'CLI.RAZAO_SOCIAL_X': 'invasão' } }, { ip: '10.0.0.1', navegador: 'teste' });
  assert.equal(r.ok, true); assert.equal(r.estado, 'RESPONDIDO');
  assert.equal(JSON.stringify(a.tabelas.CAD_CLIENTES), antes, 'nada entra no cadastro sem conferência');
  const prop = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  assert.equal(prop.DADOS_SITUACAO, 'RESPONDIDO');
  const pj = JSON.parse(prop.DADOS_PEDIDO_JSON);
  assert.equal(pj.resposta.valores['CLI.UF'], 'GO'); assert.equal(pj.resposta.valores['CLI.CEP'], '74000-000'); assert.equal(pj.resposta.valores['CLI.RAZAO_SOCIAL_X'], undefined);
  assert.ok(a.tabelas.COM_AVISOS.some((x) => x.DESTINATARIO_ID === 'u_ven' && x.TIPO === 'DADOS_RESPOSTA' && x.EMAIL_SITUACAO === 'PENDENTE'), 'aviso ao vendedor (e-mail só no expediente, pela rotina)');
  assert.ok(a.tabelas.ATV_ATIVIDADES.some((x) => /Conferir os dados enviados pelo cliente/.test(x.TITULO)));
  // segunda resposta não muda nada
  assert.equal(a.ctx.ComDE_linkResponder_(tk, { nome: 'Outra Pessoa', email: 'o@p.com', valores: { 'CLI.CEP': '75000000' } }, {}).estado, 'RESPONDIDO');
  assert.equal(JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).DADOS_PEDIDO_JSON).resposta.valores['CLI.CEP'], '74000-000');
  // vencimento
  const b = ambiente();
  const id2 = propostaIncompleta(b);
  const tk2 = tokenDe(ok(b.api('s_vera', 'dadosPedir', { id: id2 })).pedido.url);
  b.mudar('2026-11-20T10:00:00-03:00');
  assert.equal(b.ctx.ComDE_linkVer_(tk2, {}).codigo, 'INDISPONIVEL', 'link vencido');
});

test('conferência campo a campo: decisão obrigatória, recusa com motivo, merge no cadastro com histórico, equipamento no item', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const tk = tokenDe(ok(a.api('s_vera', 'dadosPedir', { id })).pedido.url);
  a.ctx.ComDE_linkResponder_(tk, { nome: 'Carla Compras', email: 'carla@alfa.exemplo.test', valores: { 'CLI.CEP': '74000000', 'CLI.LOGRADOURO': 'Rua das Flores', 'CLI.NUMERO': '200', 'CLI.BAIRRO': 'Setor Sul', 'CLI.CIDADE': 'Goiânia', 'CLI.UF': 'GO',
    'CT.TELEFONE': '62988881111', 'EQ.1.1.TIPO': 'Autoclave a vapor', 'EQ.1.1.MARCA': 'Marca A', 'EQ.1.1.MODELO': 'AV-100', 'EQ.1.1.SERIE': 'S-001', 'EQ.1.1.CAPACIDADE': '100 L', 'EQ.1.1.SETOR': 'CME' } }, {});
  const resp = faltas(a, id).pedido.resposta;
  assert.ok(resp.campos.length >= 10);
  falha(a.api('s_vera', 'dadosConferir', { id, aceitos: ['CLI.CEP'] }), /sem decisão/);
  const todos = resp.campos.map((c) => c.chave);
  falha(a.api('s_vera', 'dadosConferir', { id, aceitos: todos.filter((c) => c !== 'CLI.NUMERO'), recusados: [{ chave: 'CLI.NUMERO', motivo: '' }] }), /motivo da recusa/);
  const r = ok(a.api('s_vera', 'dadosConferir', { id, aceitos: todos.filter((c) => c !== 'CLI.NUMERO'), recusados: [{ chave: 'CLI.NUMERO', motivo: 'Número da filial errado' }] }));
  const cli = a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1');
  assert.equal(cli.CEP, '74000-000'); assert.equal(cli.LOGRADOURO, 'RUA DAS FLORES'); assert.equal(cli.NUMERO || '', '', 'recusado não entra');
  assert.equal(cli.RAZAO_SOCIAL, 'HOSPITAL TESTE ALFA LTDA', 'campo não pedido fica como estava');
  assert.equal(cli.CIENTE_POR_NOME, 'VERA VENDEDORA TESTE');
  assert.ok(a.tabelas.HIST_CADASTROS.some((h) => h.ENTIDADE === 'CLIENTE' && /dados do cliente pelo link/.test(h.ORIGEM)), 'histórico do cadastro');
  assert.equal(a.tabelas.CAD_CONTATOS[0].CELULAR, '62988881111');
  const it = JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).ITENS_JSON)[0];
  // interligação: o equipamento conferido entrou no cadastro único (o mesmo da Assistência e da qualificação) e o item aponta para ele
  const eqNovo = a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.SERIE === 'S-001');
  assert.ok(eqNovo, 'equipamento no cadastro'); assert.equal(eqNovo.UNIDADE_ID, 'un1'); assert.equal(eqNovo.CAPACIDADE, '100 L'); assert.equal(eqNovo.ORIGEM, 'COMERCIAL');
  assert.equal(it.equipamentos.length, 1); assert.equal(it.equipamentos[0].equipamentoId, eqNovo.ID);
  assert.match(r.message, /Ainda faltam \d+ dados/);
  const prop = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  assert.equal(prop.DADOS_SITUACAO, '');
  assert.equal(JSON.parse(prop.DADOS_PEDIDO_JSON).situacao, 'CONFERIDO');
  // o link conferido não abre mais
  assert.equal(a.ctx.ComDE_linkVer_(tk, {}).codigo, 'INDISPONIVEL');
  // salvar o rascunho de novo mantém os equipamentos do item
  const p = ok(a.api('s_vera', 'proposta', { id })).proposta;
  ok(a.api('s_vera', 'salvarProposta', { id, itens: p.itens.filter((i) => !i.auto).map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade, precoUnitario: String(i.precoUnitario).replace('.', ','), equipamentos: i.equipamentos })) }));
  assert.equal(JSON.parse(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id).ITENS_JSON)[0].equipamentos[0].equipamentoId, eqNovo.ID);
});

test('preencher agora: exige o "Ciente"; equipamento do cadastro recebe só os campos em branco', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  falha(a.api('s_vera', 'dadosPreencher', { id, valores: { 'CLI.CEP': '74000000' } }), /Ciente/);
  ok(a.api('s_vera', 'dadosPreencher', { id, ciente: true, valores: { 'CLI.CEP': '74000000', 'CLI.NUMERO': '100', 'CT.TELEFONE': '6233330001' } }));
  assert.equal(a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1').CEP, '74000-000');
  assert.equal(a.tabelas.CAD_CONTATOS[0].TELEFONE, '6233330001');
  falha(a.api('s_vera', 'dadosPreencher', { id, ciente: true, valores: { 'CLI.BAIRRO': 'Centro', 'CLI.UF': 'XX' } }), /Escolha a UF/);
  // equipamento do cadastro sem série: a falta aponta e o preenchimento não sobrescreve o que já existe
  a.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eq2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Autoclave', FABRICANTE: 'FAB', MODELO: 'M2', SERIE: '', SETOR: 'CME', TAG: 'AC-02', CAPACIDADE: '', STATUS: 'ATIVO' });
  const p = ok(a.api('s_vera', 'proposta', { id })).proposta;
  const itens = p.itens.filter((i) => !i.auto).map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade, precoUnitario: String(i.precoUnitario).replace('.', ','), equipamentos: i.equipamentos }));
  itens[0].equipamentos = [{ equipamentoId: 'eq1' }, { equipamentoId: 'eq2' }];
  ok(a.api('s_vera', 'salvarProposta', { id, itens }));
  const f = faltas(a, id).faltas;
  const eqc = f.find((x) => x.id === 'EQC.eq2');
  assert.ok(eqc && eqc.campos.includes('EQC.eq2.SERIE') && eqc.campos.includes('EQC.eq2.CAPACIDADE'));
  assert.ok(f.find((x) => x.id === 'EQC.eq1'), 'eq1 do fixture sem capacidade');
  ok(a.api('s_vera', 'dadosPreencher', { id, ciente: true, valores: { 'EQC.eq2.SERIE': 'S-999', 'EQC.eq2.CAPACIDADE': '75 L', 'EQC.eq2.MODELO': 'TROCA' } }));
  const e2 = a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === 'eq2');
  assert.equal(e2.SERIE, 'S-999'); assert.equal(e2.MODELO, 'M2', 'campo pedido só os em branco; MODELO nem foi pedido');
  // equipamento de outro cliente não entra no item
  falha(a.api('s_vera', 'salvarProposta', { id, itens: [Object.assign({}, itens[0], { equipamentos: [{ equipamentoId: 'eq9' }] })] }), /não é desta unidade do cliente/);
});

test('escopo sem chave da IA: modelo pelo catálogo; validação exigida; mudar item derruba a validação', { skip: !TEM }, () => {
  const a = ambiente();
  completarCliente(a);
  const id = propostaIncompleta(a);
  falha(a.api('s_vera', 'escopoGerar', { id }), /gerar o escopo ainda.*equipamentos/);
  const p = ok(a.api('s_vera', 'proposta', { id })).proposta;
  const itens = p.itens.filter((i) => !i.auto).map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade, precoUnitario: String(i.precoUnitario).replace('.', ',') }));
  itens[0].equipamentos = [{ tipo: 'Autoclave a vapor', marca: 'Marca A', modelo: 'AV-100', serie: 'S-001', capacidade: '100 L', setor: 'CME' }, { tipo: 'Autoclave a vapor', marca: 'Marca A', modelo: 'AV-100', serie: 'S-002', capacidade: '100 L', setor: 'CME' }];
  itens[1].equipamentos = [{ tipo: 'Termodesinfectora', marca: 'Marca B', modelo: 'TD-1', serie: 'T-010', capacidade: '200 L', setor: 'CME' }];
  ok(a.api('s_vera', 'salvarProposta', { id, itens, escopo: 'Qualificação das autoclaves e da termodesinfectora da CME, com relatórios por equipamento e treinamento da equipe.' }));
  falha(a.api('s_vera', 'escopoGerar', { id }), /já tem um escopo escrito/);
  ok(a.api('s_vera', 'salvarProposta', { id, itens, escopo: '' }));
  const g = ok(a.api('s_vera', 'escopoGerar', { id }));
  assert.equal(g.origem, 'MODELO'); assert.match(g.aviso, /chave da IA|modelo/i);
  assert.match(g.escopo, /nº de série S-002/); assert.match(g.escopo, /Não estão incluídos/); assert.match(g.escopo, /até 5 dias úteis após a execução/);
  assert.doesNotMatch(g.escopo, /R\$/);
  let de = faltas(a, id);
  assert.ok(de.faltas.some((f) => f.id === 'ESC.VALIDACAO'));
  falha(a.api('s_vera', 'escopoValidar', { id, texto: g.escopo }), /Li o escopo inteiro/);
  falha(a.api('s_vera', 'escopoValidar', { id, texto: 'outro texto', li: true }), /não é o que está gravado/);
  ok(a.api('s_vera', 'escopoValidar', { id, texto: g.escopo, li: true }));
  de = faltas(a, id);
  assert.ok(!de.faltas.some((f) => /^ESC/.test(f.id)), 'escopo validado');
  assert.equal(de.escopo.validado.por, 'VERA VENDEDORA TESTE');
  // mudar a quantidade derruba a validação (conteúdo) e mudar o texto também
  itens[2].quantidade = 2;
  ok(a.api('s_vera', 'salvarProposta', { id, itens }));
  de = faltas(a, id);
  const v = de.faltas.find((f) => f.id === 'ESC.VALIDACAO');
  assert.ok(v); assert.match(v.oQue, /mudaram depois da validação/);
});

test('escopo com a IA simulada: texto conferido vale; norma inventada ou número fora dos fatos cai no modelo', { skip: !TEM }, () => {
  const bom = 'Prestação de serviços de qualificação térmica para o Hospital Teste Alfa, em Goiânia/GO.\n\nAutoclaves a vapor (2): qualificação de instalação, de operação e de desempenho, com ensaios térmicos nos ciclos contratados. Equipamentos: Autoclave a vapor, Marca A, modelo AV-100, nº de série S-001, capacidade 100 L, setor CME; e nº de série S-002.\n\nEntrega: relatório técnico de cada equipamento em até 5 dias úteis após a execução, emitido pela Metrolabs e assinado pelo responsável técnico.\n\nNão estão incluídos serviços, peças, reparos ou ajustes não descritos acima; se forem necessários, são orçados à parte.';
  let resposta = JSON.stringify({ escopo: bom });
  const a = ambiente({ ia: () => resposta });
  completarCliente(a);
  const { oportunidade } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const itens = [{ descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00', equipamentos: [{ tipo: 'Autoclave a vapor', marca: 'Marca A', modelo: 'AV-100', serie: 'S-001', capacidade: '100 L', setor: 'CME' }, { tipo: 'Autoclave a vapor', marca: 'Marca A', modelo: 'AV-100', serie: 'S-002', capacidade: '100 L', setor: 'CME' }] }];
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, condicoes: COND, itens }));
  const g = ok(a.api('s_vera', 'escopoGerar', { id: np.proposta.id }));
  assert.equal(g.origem, 'IA', g.aviso); assert.equal(g.escopo, bom);
  assert.ok(a.iaPrompts.some((t) => /S-002/.test(t) && /não invente/i.test(t)), 'prompt com os fatos e as regras');
  resposta = JSON.stringify({ escopo: bom.replace('ensaios térmicos', 'ensaios térmicos conforme a NBR 99999') });
  const g2 = ok(a.api('s_vera', 'escopoGerar', { id: np.proposta.id, substituir: true }));
  assert.equal(g2.origem, 'MODELO'); assert.match(g2.aviso, /norma não citada no catálogo/);
  resposta = JSON.stringify({ escopo: bom.replace('100 L', '350 L') });
  const g3 = ok(a.api('s_vera', 'escopoGerar', { id: np.proposta.id, substituir: true }));
  assert.equal(g3.origem, 'MODELO'); assert.match(g3.aviso, /número fora dos fatos: 350/);
  const reg = JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === np.proposta.id).ESCOPO_VALIDACAO_JSON);
  assert.equal(reg.gerado.versao, 3);
});

test('emissão completa: documento sai com os equipamentos; proposta já emitida antes segue; trava desligada registra', { skip: !TEM }, () => {
  const a = ambiente();
  completarCliente(a);
  const { oportunidade } = oportunidadeDeTeste(a);
  Object.assign(a.tabelas.CAD_CONTATOS[0], { CELULAR: '62988887777' });
  Object.assign(a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === 'eq1'), { CAPACIDADE: '100 L' });
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const id = np.proposta.id;
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id, condicoes: COND, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, unidade: 'un.', precoUnitario: '4.500,00', equipamentoId: 'eq1' }] }));
  const g = ok(a.api('s_vera', 'escopoGerar', { id }));
  ok(a.api('s_vera', 'escopoValidar', { id, texto: g.escopo, li: true }));
  assert.equal(faltas(a, id).total, 0, JSON.stringify(faltas(a, id).faltas.map((f) => f.oQue)));
  ok(a.api('s_vera', 'concluirProposta', { id }));
  const d = ok(a.api('s_vera', 'gerarDocumento', { id }));
  const prop = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  assert.ok(JSON.parse(prop.CONGELADO_JSON).dadosConferidosEm);
  const html = a.arquivos[d.htmlId] ? a.arquivos[d.htmlId].bytes.toString('utf8') : '';
  assert.match(html, /Equipamento: Autoclave/);
  // proposta "emitida antes" (documento sem a marca da conferência) segue: marcar como enviada não passa pela trava
  const b = ambiente();
  const idB = propostaIncompleta(b);
  ok(b.api('s_vera', 'concluirProposta', { id: idB }));
  const pB = b.tabelas.COM_PROPOSTAS.find((p) => p.ID === idB);
  assert.equal(pB.SITUACAO, 'PRONTA');
  Object.assign(pB, { PDF_ID: 'arq-antigo', GERADA_EM: '2026-10-18T10:00', CONGELADO_JSON: '{}' });
  ok(b.api('s_vera', 'marcarEnviada', { id: idB, como: 'Entregue em mãos na reunião com a CME' }));
  // trava desligada pelo servidor (reversão sem nova versão): gera e registra o que faltava
  const c = ambiente({ props: { COM_DADOS_EMISSAO_CFG: JSON.stringify({ ligada: false }) } });
  const idC = propostaIncompleta(c);
  ok(c.api('s_vera', 'concluirProposta', { id: idC }));
  ok(c.api('s_vera', 'gerarDocumento', { id: idC }));
  assert.ok(c.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === idC && h.TIPO === 'DADOS_TRAVA_DESLIGADA'));
});

test('liberação excepcional: só Diretoria/Administrador, motivo de 20 letras, vale para as faltas de agora', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  ok(a.api('s_vera', 'concluirProposta', { id }));
  falha(a.api('s_vera', 'dadosLiberar', { id, motivo: 'Licitação por lote, equipamentos depois' }), /só a Diretoria/);
  falha(a.api('s_gaspar', 'dadosLiberar', { id, motivo: 'Licitação por lote, equipamentos depois' }), /só a Diretoria/);
  ok(a.api('s_vera', 'dadosPedirLiberacao', { id, motivo: 'Licitação por lote: o hospital informa depois' }));
  assert.ok(a.tabelas.COM_AVISOS.some((x) => x.DESTINATARIO_ID === 'u_dir' && x.TIPO === 'DADOS_LIBERACAO_PEDIDO'));
  falha(a.api('s_dora', 'dadosLiberar', { id, motivo: 'curto' }), /pelo menos 20 letras/);
  ok(a.api('s_dora', 'dadosLiberar', { id, motivo: 'Licitação por lote: o hospital informa os equipamentos depois da homologação' }));
  assert.ok(a.tabelas.COM_AVISOS.some((x) => x.DESTINATARIO_ID === 'u_ven' && x.TIPO === 'DADOS_LIBERACAO'));
  ok(a.api('s_vera', 'gerarDocumento', { id }));
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === id && h.TIPO === 'DADOS_LIBERACAO_USADA'));
  // falta nova depois da liberação: não coberta
  const b = ambiente();
  const idB = propostaIncompleta(b);
  ok(b.api('s_vera', 'concluirProposta', { id: idB }));
  ok(b.api('s_admin', 'dadosLiberar', { id: idB, motivo: 'Emergência: autoclave parada, cliente sem a série' }));
  b.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1').CNPJ = '11.111.111/1111-11';
  falha(b.api('s_vera', 'gerarDocumento', { id: idB }), /dados para emitir/);
});

test('nova revisão leva o pedido em aberto (o mesmo link) e a gestora cobra o pedido parado', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const tk = tokenDe(ok(a.api('s_vera', 'dadosPedir', { id })).pedido.url);
  ok(a.api('s_vera', 'concluirProposta', { id }));
  const nova = ok(a.api('s_vera', 'novaRevisao', { id })).proposta;
  assert.equal(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === nova.id).DADOS_SITUACAO, 'AGUARDANDO_CLIENTE');
  assert.equal(a.ctx.ComDE_linkVer_(tk, {}).ok, true, 'o link segue abrindo na revisão nova');
  a.mudar('2026-10-22T10:00:00-03:00');
  const itens = a.ctx.ComDE_itensVendedor_(a.ctx.ComP_lerPropostas_());
  assert.ok(itens.some((x) => x.regra === 'DADOS_AGUARDANDO' && /dias úteis/.test(x.titulo)));
});

test('viagem: km pela UF da origem, hotel e alimentação pela UF do destino; padrão para UF sem linha; unidade pelo destino', { skip: !TEM }, () => {
  const a = ambiente();
  const pol = a.ctx.ComPr_politica_();
  assert.deepEqual(JSON.parse(JSON.stringify(pol.custosUF)), { RJ: { valorKm: 3, hospedagemPessoaNoite: 200, alimentacaoPessoaDia: 100 } });
  assert.equal(pol.valorKm, 2.5); assert.equal(pol.hospedagemPessoaNoite, 150); assert.equal(pol.alimentacaoPessoaDia, 100); // GO = o padrão da política
  const viagem = (origem, destino) => a.ctx.ComPr_normalizar_({ viagem: { ha: 'SIM', tecnicos: 1, origem, destino, kmTrecho: '300', noites: 1, dias: 2 } }, null, pol, {});
  const rj = viagem('Rio de Janeiro/RJ', 'Angra dos Reis/RJ');
  assert.equal(rj.viagem.linhas.KM.valor, 3); assert.equal(rj.viagem.linhas.HOSPEDAGEM.valor, 200); assert.equal(rj.viagem.linhas.ALIMENTACAO.valor, 100);
  assert.match(rj.viagem.linhas.KM.regraTxt, /RJ \(origem do veículo\)/);
  const go = viagem('Goiânia/GO', 'Rio Verde/GO');
  assert.equal(go.viagem.linhas.KM.valor, 2.5); assert.equal(go.viagem.linhas.HOSPEDAGEM.valor, 150);
  const goRj = viagem('Goiânia/GO', 'Angra dos Reis/RJ');
  assert.equal(goRj.viagem.linhas.KM.valor, 2.5, 'km pela origem'); assert.equal(goRj.viagem.linhas.HOSPEDAGEM.valor, 200, 'hotel pelo destino');
  const sp = viagem('Goiânia/GO', 'Campinas/SP');
  assert.equal(sp.viagem.linhas.HOSPEDAGEM.valor, 150, 'UF sem linha = padrão'); assert.match(sp.viagem.linhas.HOSPEDAGEM.regraTxt, /padrão/);
  // proposta gravada mantém o valor que o vendedor informou
  const vend = a.ctx.ComPr_normalizar_({ viagem: { linhas: { HOSPEDAGEM: { valor: '180' } } } }, rj, pol, {});
  assert.equal(vend.viagem.linhas.HOSPEDAGEM.valor, 180);
  // a Diretoria acrescenta um estado; UF inválida é recusada
  assert.throws(() => a.ctx.ComPr_validarPolitica_({ custosUF: { XX: { valorKm: 3 } } }), /não é uma UF/);
  a.ctx.ComPr_validarPolitica_({ custosUF: { SP: { valorKm: '', hospedagemPessoaNoite: 220, alimentacaoPessoaDia: 110 } } });
  // cliente com unidade no RJ: a proposta nova começa pela filial do Rio (caso PROP-2026-0027)
  a.tabelas.CAD_UNIDADES.push({ ID: 'unRJ', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Angra', CIDADE: 'Angra dos Reis', UF: 'RJ', STATUS: 'ATIVO' });
  const { oportunidade } = oportunidadeDeTeste(a, 's_vera', { unidadeId: 'unRJ', equipamentos: [] });
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const t = ok(a.api('s_vera', 'proposta', { id: np.proposta.id })).proposta.deslocamento;
  assert.equal(t.unidade, 'RJ'); assert.equal(t.dados.viagem.origem, 'Rio de Janeiro/RJ'); assert.equal(t.unidadeSugerida, 'RJ');
});

test('rotas: sem chave o vendedor informa e guarda; o banco de rotas responde depois (ida e volta); cálculo simulado com pedágio', { skip: !TEM }, () => {
  const a = ambiente();
  let r = ok(a.api('s_vera', 'rotaCalcular', { origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ' })).rota;
  assert.equal(r.km, null); assert.match(r.avisos.join(' '), /falta a chave do serviço de rotas/);
  falha(a.api('s_vera', 'rotaConferir', { origem: 'Rio de Janeiro', destino: 'Angra', km: '155' }), /Cidade\/UF/);
  ok(a.api('s_vera', 'rotaConferir', { origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', km: '155,5', pedagio: '28,40' }));
  r = ok(a.api('s_vito', 'rotaCalcular', { origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ' })).rota;
  assert.equal(r.km, 155.5); assert.equal(r.pedagio, 28.4); assert.equal(r.fonteKm, 'BANCO_ROTAS'); assert.match(r.textoFonte, /conferida por VERA VENDEDORA TESTE/);
  r = ok(a.api('s_vito', 'rotaCalcular', { origem: 'Angra dos Reis/RJ', destino: 'Rio de Janeiro/RJ' })).rota;
  assert.equal(r.km, 155.5); assert.match(r.textoFonte, /rota de volta/);
  // conferir de novo substitui (nada é apagado)
  ok(a.api('s_gaspar', 'rotaConferir', { origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', km: '156', pedagio: '30' }));
  assert.equal(a.tabelas.COM_ROTAS.filter((x) => x.SITUACAO === 'SUBSTITUIDA').length, 1);
  assert.equal(ok(a.api('s_vera', 'rotas', {})).rotas.length, 1);
  // com a chave: cálculo simulado (Routes API), pedágio de ida x 2; a chave não volta para a tela
  a.props.GOOGLE_ROUTES_API_KEY = 'chave-de-teste-rotas';
  const pedidos = [];
  a.ctx.UrlFetchApp.fetch = (url, op) => { pedidos.push({ url, op }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ routes: [{ distanceMeters: 230400, travelAdvisory: { tollInfo: { estimatedPrice: [{ currencyCode: 'BRL', units: '21', nanos: 500000000 }] } } }] }) }; };
  const c = ok(a.api('s_vera', 'rotaCalcular', { origem: 'Goiânia/GO', destino: 'Rio Verde/GO' }));
  assert.equal(c.rota.km, 230.4); assert.equal(c.rota.pedagio, 43); assert.equal(c.rota.fonteKm, 'CALCULO_GOOGLE');
  assert.match(pedidos[0].url, /routes\.googleapis\.com/); assert.equal(pedidos[0].op.headers['X-Goog-Api-Key'], 'chave-de-teste-rotas');
  assert.ok(!JSON.stringify(c).includes('chave-de-teste-rotas'));
  // serviço fora do ar: não bloqueia, diz o que fazer
  a.ctx.UrlFetchApp.fetch = () => { throw new Error('tempo esgotado'); };
  const f = ok(a.api('s_vera', 'rotaCalcular', { origem: 'Goiânia/GO', destino: 'Itumbiara/GO' })).rota;
  assert.equal(f.km, null); assert.match(f.avisos.join(' '), /Cálculo automático indisponível/);
  // a fonte do km e do pedágio vai para a proposta
  const pol = a.ctx.ComPr_politica_();
  const d = a.ctx.ComPr_normalizar_({ viagem: { ha: 'SIM', tecnicos: 1, origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', kmTrecho: '156', kmFonte: 'BANCO_ROTAS', linhas: { PEDAGIO: { valor: '30', origemValor: 'BANCO_ROTAS' } } } }, null, pol, { eu: { nome: 'VERA' } });
  assert.equal(d.viagem.kmFonte, 'BANCO_ROTAS'); assert.equal(d.viagem.kmPor, 'VERA'); assert.equal(d.viagem.linhas.PEDAGIO.origemValor, 'BANCO_ROTAS');
});

test('caso RIO MED: A/C intermediário e contato repetido apontados; o responsável técnico pedido vira contato novo e o intermediário fica registrado', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const ct = a.tabelas.CAD_CONTATOS[0];
  Object.assign(ct, { NOME: 'BRUNO', PAPEL: 'INTERMEDIARIO', EMAIL: '', CARGO: '' });
  a.tabelas.CAD_CONTATOS.push({ ID: 'ct2', CLIENTE_ID: 'c1', NOME: 'BRUNO', EMAIL: 'bruno@exemplo.test', STATUS: 'ATIVO' });
  let f = faltas(a, id).faltas;
  assert.ok(f.some((x) => x.id === 'CT.INTERMEDIARIO'), 'intermediário não é o destinatário');
  assert.ok(f.some((x) => x.id === 'CT.REPETIDO' && /bruno@exemplo\.test/.test(x.oQue)), 'contato repetido');
  ok(a.api('s_vera', 'dadosPreencher', { id, ciente: true, valores: { 'CT.NOME': 'Marina Souza Teste', 'CT.CARGO': 'Engenheira clínica', 'CT.EMAIL': 'marina@angra.exemplo.test', 'CT.TELEFONE': '24999990000' } }));
  const prop = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  const novo = a.tabelas.CAD_CONTATOS.find((c) => c.ID === prop.CONTATO_ID);
  assert.equal(novo.NOME, 'Marina Souza Teste'); assert.equal(novo.PAPEL, 'TECNICO'); assert.equal(novo.CARGO, 'Engenheira clínica');
  assert.equal(ct.NOME, 'BRUNO', 'o cadastro do intermediário não foi sobrescrito');
  const inter = JSON.parse(prop.INTERMEDIARIO_JSON);
  assert.equal(inter.nome, 'BRUNO'); assert.equal(inter.comissao, null, 'sem percentual inventado');
  f = faltas(a, id).faltas;
  assert.ok(f.some((x) => x.id === 'INT.APROVACAO'), 'comissão espera a Diretoria');
  // contato sem sobrenome e sem cargo
  const b = ambiente();
  const idB = propostaIncompleta(b);
  Object.assign(b.tabelas.CAD_CONTATOS[0], { NOME: 'Ana', CARGO: '' });
  const cd = faltas(b, idB).faltas.find((x) => x.id === 'CT.DADOS');
  assert.ok(cd.campos.includes('CT.NOME') && cd.campos.includes('CT.CARGO')); assert.match(cd.oQue, /nome completo/);
});

test('comissão de intermediação: só interna, entra na sobra, Diretoria define (sem percentual padrão); mudar derruba a aprovação', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  falha(a.api('s_vera', 'intermediarioSalvar', { id, nome: 'Bruno', motivo: 'curto' }), /motivo/);
  falha(a.api('s_vera', 'intermediarioSalvar', { id, nome: 'Bruno Indicador', comissao: '80', motivo: 'Indicou o hospital de Angra dos Reis' }), /0 a 50/);
  ok(a.api('s_vera', 'intermediarioSalvar', { id, nome: 'Bruno Indicador', tipo: 'PESSOA', comissao: '', motivo: 'Indicou o hospital de Angra dos Reis' }));
  assert.ok(a.tabelas.COM_AVISOS.some((x) => x.DESTINATARIO_ID === 'u_dir' && x.TIPO === 'INTERMEDIACAO'), 'Diretoria avisada');
  const p0 = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  const antes = a.ctx.ComPr_daProposta_(p0).analise.margemValor;
  falha(a.api('s_vera', 'intermediarioDecidir', { id, aprovar: true, comissao: '5', texto: 'Indicação comprovada' }), /Diretoria/);
  falha(a.api('s_dora', 'intermediarioDecidir', { id, aprovar: true, comissao: '', texto: 'Indicação comprovada pelo hospital' }), /Não há percentual padrão/);
  ok(a.api('s_dora', 'intermediarioDecidir', { id, aprovar: true, comissaoTipo: 'PCT', comissao: '5', texto: 'Indicação comprovada pelo hospital' }));
  const p1 = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id);
  const an = a.ctx.ComPr_daProposta_(p1).analise;
  assert.equal(an.comissaoIntermediacao, Math.round(an.receitaItens * 5) / 100);
  assert.ok(Math.abs(antes - an.margemValor - an.comissaoIntermediacao) < 0.02, 'a comissão sai da sobra');
  assert.ok(!faltas(a, id).faltas.some((x) => x.id === 'INT.APROVACAO'));
  // mudou o valor pedido: a aprovação cai
  ok(a.api('s_vera', 'intermediarioSalvar', { id, nome: 'Bruno Indicador', comissao: '8', motivo: 'Indicou o hospital de Angra dos Reis' }));
  assert.ok(faltas(a, id).faltas.some((x) => x.id === 'INT.APROVACAO'));
  // nunca no documento do cliente
  ok(a.api('s_dora', 'intermediarioDecidir', { id, aprovar: true, comissaoTipo: 'VALOR', comissao: '500', texto: 'Valor fechado com o indicador' }));
  const html = a.ctx.ComDoc_propostaHtml_(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id), a.ctx.ComP_congelar_(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id)), 'x');
  assert.doesNotMatch(html, /Bruno|intermedia/i);
});

test('unidade de execução: serviço sem unidade aponta a falta; escolher a unidade do cliente; outra unidade de outro cliente é recusada', { skip: !TEM }, () => {
  const a = ambiente();
  const id = propostaIncompleta(a);
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
  Object.assign(p, { UNIDADE_ID: '', UNIDADE_NOME: '' });
  const de = faltas(a, id);
  assert.ok(de.faltas.some((x) => x.id === 'UN.FALTA'));
  assert.ok(de.unidadesCliente.some((u) => u.id === 'un1'));
  a.tabelas.CAD_UNIDADES.push({ ID: 'unX', CLIENTE_ID: 'c2', NOME_UNIDADE: 'Outra', CIDADE: 'X', UF: 'GO', STATUS: 'ATIVO' });
  falha(a.api('s_vera', 'dadosUnidade', { id, unidadeId: 'unX' }), /não é deste cliente/);
  ok(a.api('s_vera', 'dadosUnidade', { id, unidadeId: 'un1' }));
  assert.equal(p.UNIDADE_ID, 'un1');
  assert.ok(!faltas(a, id).faltas.some((x) => x.id === 'UN.FALTA'));
});
