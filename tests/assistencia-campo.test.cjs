// Assistência técnica, etapa 1 do estudo de 22/10/2026: o técnico, pelo aplicativo SGO+ Campo, localiza ou cadastra cliente,
// unidade e equipamento e abre a O.S. em campo, fora da agenda (contrato versão 2: Ast_appBuscarCadastro, Ast_appConsultarCnpj,
// Ast_appCadastrar, Ast_appAbrirOS). Código real num contexto isolado (tests/_assistencia_ambiente.cjs) com as funções de criar da
// tela Cadastros carregadas; só dados de teste; relógio fixo; trava não reentrante.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Equipamentos.js'];
const amb0 = (o) => ambiente(Object.assign({ extras: EXTRAS }, o || {}));
const ev = (tipo, osId, n, dados, em) => ({ tipo, osId, idLocal: 'apar9-' + String(n).padStart(4, '0'), em: em || '2026-10-19T10:10:00', dados: dados || {} });
const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
/** CNPJ de teste com dígitos conferentes (base fictícia). */
function cnpjTeste(base12) {
  const d = String(base12).replace(/\D/g, '').padStart(12, '0').slice(0, 12).split('').map(Number);
  const dv = (nums, pesos) => { const s = nums.reduce((a, n, i) => a + n * pesos[i], 0) % 11; return s < 2 ? 0 : 11 - s; };
  const d1 = dv(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]), d2 = dv(d.concat(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.join('') + d1 + d2;
}
const CNPJ_NOVO = cnpjTeste('123456780001');

// ------------------------------------------------------------------ Meu dia v2 e busca com limite
test('Meu dia versão 2: tipos com checklist e exigências, prioridades e regras do campo; só o técnico abre em campo', () => {
  const amb = amb0();
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', {}));
  assert.equal(md.versaoContrato, 2);
  assert.ok(md.tipos.length >= 20 && md.tipos.every((t) => t.codigo && t.nome && t.exige && Array.isArray(t.exige.relatoCampos)));
  const cor = md.tipos.find((t) => t.codigo === 'MANUTENCAO_CORRETIVA');
  assert.ok(cor.checklist.perguntas.length >= 5 && cor.checklist.perguntas.some((p) => p.id === 'foto_defeito'));
  assert.deepEqual(JSON.parse(JSON.stringify(cor.exige.relatoCampos)), ['servicoRealizado', 'condicaoEncontrada', 'testeFuncional']);
  assert.ok(!md.tipos.some((t) => t.codigo === 'ENVIO_ORCAMENTO'), 'tipo sem visita não entra na lista do campo');
  assert.equal(md.campo.podeAbrir, true);
  assert.equal(md.campo.limiteBusca, 20);
  assert.ok(md.campo.prioridades.some((p) => p.codigo === 'P3'));
  assert.equal(ok(amb.app('Ast_appMeuDia', 's_mara', {})).campo.podeAbrir, false, 'quem não é técnico nem gestão não abre em campo');
});

test('busca no cadastro: cliente por nome e CNPJ, equipamento por série ou TAG, unidades e equipamentos do cliente; nunca mais de 20 por busca', () => {
  const amb = amb0();
  for (let i = 1; i <= 30; i++) amb.tabelas.CAD_CLIENTES.push({ ID: 'cx' + i, RAZAO_SOCIAL: 'CLIENTE TESTE LOTE ' + i + ' LTDA', NOME_FANTASIA: 'Cliente Teste Lote ' + i, CNPJ: '', STATUS: 'ATIVO' });
  amb.tabelas.CAD_CLIENTES.push({ ID: 'cina', RAZAO_SOCIAL: 'INATIVO TESTE ALFA', NOME_FANTASIA: 'Inativo Alfa', CNPJ: '', STATUS: 'INATIVO' });
  let r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { termo: 'alfa' }));
  assert.deepEqual(JSON.parse(JSON.stringify(r.clientes.map((c) => c.id))), ['c1'], 'inativo não aparece');
  assert.equal(r.clientes[0].nome, 'Hospital Teste Alfa');
  r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { termo: '11.222.333' }));
  assert.equal(r.clientes[0].id, 'c1', 'por CNPJ');
  r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { termo: 'S-200' }));
  assert.equal(r.equipamentos.length, 1);
  assert.equal(r.equipamentos[0].id, 'eq2');
  assert.equal(r.equipamentos[0].clienteNome, 'Hospital Teste Alfa');
  assert.equal(r.equipamentos[0].unidadeNome, 'Unidade Centro');
  r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { termo: 'LV-02' }));
  assert.equal(r.equipamentos[0].id, 'eq2', 'por TAG');
  r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { clienteId: 'c1' }));
  assert.equal(r.cliente.id, 'c1');
  assert.deepEqual(JSON.parse(JSON.stringify(r.unidades.map((u) => u.id))), ['un1']);
  assert.equal(r.equipamentos.length, 2);
  r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { clienteId: 'c1', unidadeId: 'un1', termo: 'lavadora' }));
  assert.deepEqual(JSON.parse(JSON.stringify(r.equipamentos.map((e) => e.id))), ['eq2']);
  // limite: 30 clientes batem, 20 voltam, o total diz quantos há
  r = ok(amb.app('Ast_appBuscarCadastro', 's_tiago', { termo: 'cliente teste lote' }));
  assert.equal(r.clientes.length, 20);
  assert.equal(r.total.clientes, 30);
  assert.equal(r.limite, 20);
  assert.match(amb.app('Ast_appBuscarCadastro', 's_tiago', { termo: 'a' }).message, /pelo menos 2 letras/);
  assert.equal(amb.app('Ast_appBuscarCadastro', 's_cliente.alfa', { termo: 'alfa' }).codigo, 'SEM_ACESSO');
});

test('consulta do CNPJ: inválido recusado; já cadastrado é dito; consulta pública preenche razão social e endereço', () => {
  const amb = amb0();
  assert.match(amb.app('Ast_appConsultarCnpj', 's_tiago', { cnpj: '123' }).message, /14 números/);
  let r = ok(amb.app('Ast_appConsultarCnpj', 's_tiago', { cnpj: '11.222.333/0001-81' }));
  assert.equal(r.jaCadastrado.tipo, 'CLIENTE');
  assert.equal(r.jaCadastrado.cliente.id, 'c1');
  assert.equal(r.consultado, false, 'sem a consulta pública carregada: avisa e deixa preencher à mão');
  assert.ok(r.aviso);
  amb.ctx.SGO_CNPJ_consultarDados_ = () => ({ razao_social: 'CLINICA NOVA TESTE LTDA', nome_fantasia: 'Clínica Nova Teste', descricao_tipo_de_logradouro: 'Rua', logradouro: 'das Flores', numero: '10', bairro: 'Centro', municipio: 'Anápolis', uf: 'GO', cep: '75000-000', ddd_telefone_1: '6230000000', email: 'CONTATO@NOVA.EXEMPLO.TEST' });
  r = ok(amb.app('Ast_appConsultarCnpj', 's_tiago', { cnpj: CNPJ_NOVO }));
  assert.equal(r.consultado, true);
  assert.equal(r.razaoSocial, 'CLINICA NOVA TESTE LTDA');
  assert.equal(r.endereco, 'Rua das Flores 10 - Centro');
  assert.equal(r.cidade, 'Anápolis');
  assert.equal(r.email, 'contato@nova.exemplo.test');
  assert.equal(r.jaCadastrado, null);
});

// ------------------------------------------------------------------ cadastro em campo
test('cadastro em campo: cria pelas funções da tela Cadastros, marcado "criado em campo", com pendência e aviso à gestão; nunca duplica; idempotente por idLocal', () => {
  const amb = amb0();
  // cliente novo (com CNPJ válido)
  let r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0001', tipo: 'CLIENTE', dados: { nome: 'Clínica Nova Teste', razaoSocial: 'Clinica Nova Teste Ltda', cnpj: CNPJ_NOVO, contato: 'Nina', telefone: '(62) 9 8888-0000', email: 'nina@nova.exemplo.test', endereco: 'Rua das Flores, 10' }, em: '2026-10-19T10:05:00' }));
  assert.equal(r.existente, false);
  assert.equal(r.cliente.nome, 'CLÍNICA NOVA TESTE');
  assert.equal(r.cliente.criadoEmCampo, true);
  const cli = amb.tabelas.CAD_CLIENTES.find((c) => c.ID === r.cliente.id);
  assert.equal(cli.RAZAO_SOCIAL, 'CLINICA NOVA TESTE LTDA', 'regras da tela Cadastros (maiúsculas)');
  assert.equal(cli.CNPJ, CNPJ_NOVO);
  assert.equal(cli.TELEFONE, '62988880000');
  assert.equal(cli.ORIGEM_CADASTRO, 'CAMPO');
  assert.equal(cli.CAMPO_CRIADO_POR_NOME, 'TIAGO TECNICO TESTE');
  assert.ok(cli.CAMPO_CRIADO_EM);
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.DESTINATARIO_ID === 'u_gt' && a.TIPO === 'CADASTRO_CAMPO'), 'gestão avisada');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'CADASTRO' && e.TIPO === 'CRIADO_EM_CAMPO' && e.ID_LOCAL === 'cad-cli-0001'));
  let pend = amb.pend('s_gil').filter((i) => i.tipo === 'ast_cadastro_campo');
  assert.equal(pend.length, 1);
  assert.match(pend[0].oQueFazer, /Cadastros criados em campo/);
  const clienteId = r.cliente.id;
  // repetido (mesmo idLocal): nada em dobro
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0001', tipo: 'CLIENTE', dados: { nome: 'Clínica Nova Teste', cnpj: CNPJ_NOVO } }));
  assert.equal(r.duplicado, true);
  assert.equal(r.cliente.id, clienteId);
  assert.equal(amb.tabelas.CAD_CLIENTES.filter((c) => c.CNPJ === CNPJ_NOVO).length, 1);
  // mesmo CNPJ com outro idLocal: devolve o existente ("já cadastrado como ...")
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0002', tipo: 'CLIENTE', dados: { nome: 'Nova Teste Outro Nome', cnpj: '12.345.678/0001-95' } }));
  assert.equal(r.existente, true);
  assert.equal(r.cliente.id, clienteId);
  assert.match(r.message, /Já cadastrado como cliente/);
  // CNPJ do cliente existente c1: devolve c1 (e as unidades dele para o próximo passo)
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0003', tipo: 'CLIENTE', dados: { nome: 'Alfa', cnpj: '11.222.333/0001-81' } }));
  assert.equal(r.existente, true); assert.equal(r.cliente.id, 'c1'); assert.equal(r.unidades[0].id, 'un1');
  // só pelo nome, sem CNPJ: igual ao existente (sem acento e sem caixa)
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0004', tipo: 'CLIENTE', dados: { nome: 'HOSPITAL TESTE ALFA' } }));
  assert.equal(r.existente, true); assert.equal(r.cliente.id, 'c1');
  // CNPJ inválido: recusa com o que fazer
  assert.match(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0005', tipo: 'CLIENTE', dados: { nome: 'Qualquer', cnpj: '11.111.111/1111-11' } }).message, /não é válido/);
  assert.equal(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-cli-0005', tipo: 'CLIENTE', dados: { nome: 'Qualquer', cnpj: '11.111.111/1111-11' } }).codigo, 'ENTRADA');
  // unidade do cliente novo, com o id PROVISÓRIO do aparelho (idLocal do cadastro do cliente) e a localização do aparelho
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-un-0001', tipo: 'UNIDADE', dados: { clienteId: 'cad-cli-0001', nome: 'Sede Nova', endereco: 'Rua das Flores, 10', cidade: 'Anápolis', uf: 'go', responsavel: 'Nina', telefone: '62988880000', lat: -16.33, lng: -48.95, precisao: 20 } }));
  assert.equal(r.existente, false);
  assert.equal(r.unidade.clienteId, clienteId, 'id provisório virou o id real');
  const un = amb.tabelas.CAD_UNIDADES.find((u) => u.ID === r.unidade.id);
  assert.equal(un.NOME_UNIDADE, 'SEDE NOVA'); assert.equal(un.UF, 'GO'); assert.equal(un.ORIGEM_CADASTRO, 'CAMPO'); assert.equal(un.LATITUDE, -16.33);
  // unidade repetida pelo nome no mesmo cliente
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-un-0002', tipo: 'UNIDADE', dados: { clienteId: clienteId, nome: 'sede nova' } }));
  assert.equal(r.existente, true); assert.equal(r.unidade.id, un.ID);
  // equipamento com a série de um já cadastrado no cliente c1: devolve o existente, não cria
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-eq-0001', tipo: 'EQUIPAMENTO', dados: { clienteId: 'c1', unidadeId: 'un1', tipo: 'Autoclave', serie: 's 100' } }));
  assert.equal(r.existente, true); assert.equal(r.equipamento.id, 'eq1');
  assert.equal(amb.tabelas.CAD_EQUIPAMENTOS.length, 3);
  // equipamento novo na unidade nova (ids provisórios)
  r = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-eq-0002', tipo: 'EQUIPAMENTO', dados: { clienteId: 'cad-cli-0001', unidadeId: 'cad-un-0001', tipo: 'Estufa', fabricante: 'Fabricante Teste', modelo: 'E-9', serie: 'EST-9001', tag: 'ES-09', setor: 'Laboratório', patrimonio: '4455' } }));
  assert.equal(r.existente, false);
  const eq = amb.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === r.equipamento.id);
  assert.equal(eq.CLIENTE_ID, clienteId); assert.equal(eq.UNIDADE_ID, un.ID); assert.equal(eq.TIPO, 'ESTUFA'); assert.ok(eq.QR_TOKEN, 'QR do equipamento gerado como na tela'); assert.equal(eq.ORIGEM_CADASTRO, 'CAMPO');
  // três cadastros em campo a conferir; o técnico não marca; a gestão marca e a pendência sai
  pend = amb.pend('s_gil').filter((i) => i.tipo === 'ast_cadastro_campo');
  assert.equal(pend.length, 3);
  assert.match(amb.api('s_tiago', 'cadastroConferido', { tipo: 'CLIENTE', id: clienteId, texto: 'Conferido por mim' }).message, /gestão da área Técnica/);
  const lista = ok(amb.api('s_gil', 'cadastrosCampo', {})).cadastros;
  assert.equal(lista.length, 3);
  assert.ok(lista.some((x) => x.tipo === 'EQUIPAMENTO' && /ESTUFA/.test(x.texto)));
  ok(amb.api('s_gil', 'cadastroConferido', { tipo: 'CLIENTE', id: clienteId, texto: 'Não é repetido; CNPJ conferido' }));
  assert.equal(amb.tabelas.CAD_CLIENTES.find((c) => c.ID === clienteId).CAMPO_CONFERIDO_POR_NOME, 'GIL GESTOR TECNICO TESTE');
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_cadastro_campo').length, 2);
  assert.equal(ok(amb.api('s_gil', 'iniciar', {})).cadastrosCampo, 2);
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
  // quem não é técnico não cadastra pelo aplicativo
  assert.match(amb.app('Ast_appCadastrar', 's_mara', { idLocal: 'cad-cli-0009', tipo: 'CLIENTE', dados: { nome: 'Outro' } }).message, /é do técnico/);
});

// ------------------------------------------------------------------ O.S. aberta em campo
test('O.S. aberta em campo: chamado PRESENCIAL com a triagem feita em campo e a O.S. no nome do técnico, numa trava só; idempotente; mesmo equipamento reaproveita a O.S. aberta', () => {
  const amb = amb0();
  const base = { idLocal: 'nova-os-0001', clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', tipoCodigo: 'MANUTENCAO_CORRETIVA', sintoma: 'Autoclave apitando erro E04 no fim do ciclo', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P2', parada: 'PARCIAL', em: '2026-10-19T10:02:00' };
  assert.match(amb.app('Ast_appAbrirOS', 's_tiago', Object.assign({}, base, { tipoCodigo: 'ENVIO_ORCAMENTO' })).message, /não tem visita/);
  assert.match(amb.app('Ast_appAbrirOS', 's_tiago', Object.assign({}, base, { sintoma: 'curto' })).message, /pelo menos 10 letras/);
  assert.match(amb.app('Ast_appAbrirOS', 's_mara', base).message, /é do técnico/);
  const r = ok(amb.app('Ast_appAbrirOS', 's_tiago', base));
  assert.equal(r.existente, false);
  assert.equal(r.os.numero, 'OS-2026-0001');
  assert.equal(r.os.situacao, 'AGENDADA');
  assert.equal(r.os.abertaEmCampo, true);
  assert.equal(r.os.chamadoNumero, 'CH-2026-0001');
  assert.ok(r.os.checklist.perguntas.some((p) => p.id === 'foto_defeito'), 'checklist do tipo');
  const c = amb.tabelas.ATEC_CHAMADOS[0], os = amb.tabelas.ATEC_OS[0];
  assert.equal(c.CANAL, 'PRESENCIAL'); assert.equal(c.ABERTA_EM_CAMPO, 'SIM'); assert.equal(c.SITUACAO, 'AGENDADO');
  assert.equal(c.TRIAGEM_RESPONSAVEL_ID, 'u_tec'); assert.equal(c.ACAO_DECIDIDA, 'PLANEJADO'); assert.ok(c.TRIAGEM_FIM_EM);
  assert.match(JSON.parse(c.TRIAGEM_JSON).sintomas_confirmados, /no local pelo técnico/);
  assert.equal(c.TECNICO_ID, 'u_tec'); assert.equal(c.OS_ID, os.ID); assert.equal(c.TIPO_CODIGO, 'MANUTENCAO_CORRETIVA');
  assert.equal(os.TECNICO_ID, 'u_tec'); assert.equal(os.ABERTA_EM_CAMPO, 'SIM'); assert.equal(os.AGENDADO_PARA, '2026-10-19T10:02:00'); assert.equal(os.SERIE_CADASTRO, 'S-100');
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((a) => a.RESPONSAVEL_ID === 'u_tec' && /OS-2026-0001/.test(a.TITULO)), 'atividade do técnico');
  const aviso = amb.tabelas.ATEC_AVISOS.find((a) => a.DESTINATARIO_ID === 'u_gt' && a.TIPO === 'CHAMADO_NOVO');
  assert.match(aviso.TITULO, /aberto em campo/i);
  assert.match(aviso.TEXTO, /triagem foi feita em campo/);
  assert.ok(!amb.pend('s_gil').some((i) => i.tipo === 'ast_triagem'), 'não há triagem pendente: foi feita em campo');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'CHAMADO' && e.TIPO === 'TRIAGEM_INICIADA' && /feita em campo/.test(e.TEXTO)));
  // repetido (mesmo idLocal): a mesma O.S.
  const r2 = ok(amb.app('Ast_appAbrirOS', 's_tiago', base));
  assert.equal(r2.duplicado, true); assert.equal(r2.os.id, r.os.id);
  assert.equal(amb.tabelas.ATEC_OS.length, 1);
  // outro idLocal para o mesmo equipamento com O.S. aberta no nome dele: devolve a existente, nada em dobro
  const r3 = ok(amb.app('Ast_appAbrirOS', 's_tiago', Object.assign({}, base, { idLocal: 'nova-os-0002' })));
  assert.equal(r3.existente, true); assert.equal(r3.os.id, r.os.id);
  assert.match(r3.message, /já tem a O.S. OS-2026-0001 aberta com você/);
  assert.equal(amb.tabelas.ATEC_OS.length, 1);
  // na tela da gestão: selo "aberta em campo" na lista de chamados e de O.S.
  assert.equal(ok(amb.api('s_gil', 'lista', {})).chamados[0].abertaEmCampo, true);
  assert.equal(ok(amb.api('s_gil', 'listaOs', {})).os[0].abertaEmCampo, true);
  assert.equal(ok(amb.api('s_gil', 'os', { id: os.ID })).os.abertaEmCampo, true);
  // Meu dia do técnico mostra a O.S. aberta em campo no dia
  assert.equal(ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-19' })).os[0].abertaEmCampo, true);
  // Assistência desligada: recusa sem apagar nada
  ok(amb.api('s_dora', 'ligar', { ligada: false, motivo: 'Pausa de teste do piloto' }));
  assert.equal(amb.app('Ast_appAbrirOS', 's_tiago', Object.assign({}, base, { idLocal: 'nova-os-0003', equipamentoId: 'eq2' })).codigo, 'DESLIGADA');
  assert.equal(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-x-0001', tipo: 'CLIENTE', dados: { nome: 'Qualquer um' } }).codigo, 'DESLIGADA');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('fluxo inteiro sem internet: cadastros e O.S. com ids provisórios do aparelho, eventos pelo id provisório, encerramento com relatório', () => {
  const amb = amb0();
  // o aparelho criou tudo sem sinal: ids provisórios = idLocal de cada cadastro e da O.S.
  ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'ap-cli-0001-aaaa', tipo: 'CLIENTE', dados: { nome: 'Laboratório Novo Teste', telefone: '6230001111' } }));
  ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'ap-un-0001-aaaa', tipo: 'UNIDADE', dados: { clienteId: 'ap-cli-0001-aaaa', nome: 'Matriz', endereco: 'Rua Nova, 1', cidade: 'Goiânia', uf: 'GO' } }));
  ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'ap-eq-0001-aaaa', tipo: 'EQUIPAMENTO', dados: { clienteId: 'ap-cli-0001-aaaa', unidadeId: 'ap-un-0001-aaaa', tipo: 'Lavadora', modelo: 'LX', serie: 'LX-777', tag: 'LV-77', setor: 'CME' } }));
  const r = ok(amb.app('Ast_appAbrirOS', 's_tiago', { idLocal: 'ap-os-0001-aaaa', clienteId: 'ap-cli-0001-aaaa', unidadeId: 'ap-un-0001-aaaa', equipamentoId: 'ap-eq-0001-aaaa', tipoCodigo: 'MANUTENCAO_CORRETIVA',
    sintoma: 'Lavadora não drena no fim do ciclo', solicitante: 'Lia Laboratório', prioridade: 'P3', parada: 'TOTAL', em: '2026-10-19T10:00:00' }));
  const osId = r.os.id;
  assert.equal(r.os.cliente.nome, 'LABORATÓRIO NOVO TESTE');
  assert.equal(r.os.equipamento.serie, 'LX-777');
  assert.equal(amb.tabelas.ATEC_CHAMADOS[0].PRIORIDADE, 'P3');
  // os eventos ainda usam o id provisório da O.S.: o servidor resolve
  let s = ok(sync(amb, [ev('CHEGUEI', 'ap-os-0001-aaaa', 1, { lat: -16.7, lng: -49.3, precisao: 10 }, '2026-10-19T10:05:00'), ev('RESPOSTA', 'ap-os-0001-aaaa', 2, { perguntaId: 'identificado', valor: 'SIM' })]));
  assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados));
  assert.equal(s.aceitos[0].osId, osId, 'resposta já com o id real');
  assert.equal(s.os[0].id, osId);
  assert.equal(amb.tabelas.ATEC_OS[0].SITUACAO, 'EM_EXECUCAO');
  // foto pelo id provisório também
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: 'ap-os-0001-aaaa', idLocal: 'ap-foto-0001-aaaa', nome: 'defeito.jpg', base64: FOTO, perguntaId: 'foto_defeito', em: '2026-10-19T10:20:00' }));
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: osId, idLocal: 'ap-foto-0002-aaaa', nome: 'depois.jpg', base64: FOTO, perguntaId: 'foto_servico', em: '2026-10-19T10:40:00' }));
  s = ok(sync(amb, [
    ev('RESPOSTA', 'ap-os-0001-aaaa', 3, { perguntaId: 'defeito', valor: 'Bomba de drenagem travada' }), ev('RESPOSTA', 'ap-os-0001-aaaa', 4, { perguntaId: 'teste_ok', valor: 'SIM' }), ev('RESPOSTA', 'ap-os-0001-aaaa', 5, { perguntaId: 'liberado', valor: 'SIM' }),
    ev('RELATO', 'ap-os-0001-aaaa', 6, { condicaoEncontrada: 'Parada, sem drenar', causa: 'Bomba travada', servicoRealizado: 'Desobstrução da bomba de drenagem e teste', testeFuncional: 'Dois ciclos completos', serieConfirmada: 'LX-777', identificadoPor: 'SERIE' }),
    ev('ASSINATURA', 'ap-os-0001-aaaa', 7, { nome: 'Lia Laboratório', documento: 'RG 123', imagem: ASSINATURA }),
    ev('CONCLUI', 'ap-os-0001-aaaa', 8, { lat: -16.7, lng: -49.3 }, '2026-10-19T11:00:00')
  ]));
  assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados));
  assert.equal(s.os[0].situacao, 'ENCERRADA');
  assert.ok(s.os[0].relatorioUrl, 'relatório A4 gerado');
  assert.equal(amb.tabelas.ATEC_CHAMADOS[0].SITUACAO, 'ENCERRADO');
  assert.equal(ok(amb.app('Ast_appOS', 's_tiago', { osId: 'ap-os-0001-aaaa' })).os.id, osId, 'Ast_appOS aceita o id provisório');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});
