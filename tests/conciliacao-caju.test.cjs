// Conciliação Caju (11/11/2026, pedido do dono): cliente da API do Caju (token, sponsorId, erros, registro sem segredo), colaboradores
// (vínculo pelo CPF, cadastro, arquivar), carga do depósito de viagem pelo Caju (pedido, saldo da conta, PIX, idempotência,
// acompanhamento até creditado e registro automático da carga), extrato CSV de formato desconhecido (mapeamento assistido),
// cruzamento com a prestação de contas e as divergências com dono e motivo, fechamento por período e centro de custo e os relatórios
// A4 (fechamento, divergências, créditos, individual e geral). Caju SIMULADO (tests/_caju_ambiente.cjs); nada sai para a rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambienteCaju, CRED, CPF } = require('./_caju_ambiente.cjs');

const recusa = (r, re) => { assert.equal(r.ok, false, 'esperava recusa, veio ok: ' + JSON.stringify(r).slice(0, 200)); if (re) assert.match(r.message, re); return r; };
let nArq = 0;
const comp = (a) => a.pdf('comprovante-' + (++nArq) + '.pdf');
const desc = 'almoço da equipe no atendimento do Hospital Teste Alfa';
/** Carga pelo Caju até creditada (produção simulada). */
function comCargaCaju(a, extra) {
  a.vincularEquipe();
  const s = a.aprovada(extra);
  a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE' }));
  a.sim.avancar(5);
  a.ok(a.c('wanessa', 'pedidoAtualizarTodos'));
  return a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id);
}
const gasto = (a, s, x) => a.ok(a.v('tiago', 'lancarGasto', Object.assign({ id: s.ID || s.id, data: '2026-10-27', pagoCom: 'CAJU', arquivo: comp(a), descricao: desc }, x)));
const CAB = 'Data;Colaborador;CPF;Estabelecimento;Tipo;Valor;Centro de custo;ID da transação';

test('caixas do lote 13: registradas pelo módulo, Financeiro tem todas, Diretoria só vê, demais nada', () => {
  const a = ambienteCaju();
  const cat = JSON.parse(JSON.stringify(a.rodar('SGO_poderesCatalogo_()'), (k, v) => (typeof v === 'function' ? undefined : v)));
  const caju = cat.lista.filter((p) => p.modulo === 'Conciliação Caju');
  assert.deepEqual(caju.map((p) => p.codigo), ['CAJU_VER', 'CAJU_CONFIGURAR', 'CAJU_COLABORADORES', 'CAJU_CARGA', 'CAJU_CONCILIAR', 'CAJU_FECHAR']);
  assert.ok(caju.every((p) => p.ligado && p.lote === 13));
  const pod = (l) => a.c(l, 'iniciar').poderes;
  assert.ok(Object.values(pod('wanessa')).every(Boolean));
  const d = pod('dora'); assert.equal(d.CAJU_VER, true); assert.equal(d.CAJU_CARGA, false); assert.equal(d.CAJU_CONCILIAR, false);
  const t = pod('tiago'); assert.ok(!t.CAJU_VER && !t.CAJU_CARGA);
  recusa(a.c('tiago', 'painel'), /módulo é do Financeiro[\s\S]*relatório individual das suas viagens/);
  recusa(a.c('matheusgodoi', 'creditos'), /Ver a conciliação Caju/);
  assert.equal(a.c('dora', 'painel').ok, true);
  recusa(a.c('dora', 'conciliar'), /Conciliar o extrato do Caju/);
  recusa(a.c('hcli', 'iniciar'), /equipe interna/);
});

test('cliente da API: token guardado e renovado, sponsorId da claim, 401 renova uma vez, erros em português, nada secreto no registro', () => {
  const a = ambienteCaju({ credenciais: false });
  recusa(a.c('wanessa', 'testarConexao'), /ainda não está configurada \(falta: Ambiente[\s\S]*Chaves e senhas, grupo "Caju"/);
  a.credenciais({ CAJU_CLIENT_SECRET: 'errado-errado' });
  recusa(a.c('wanessa', 'testarConexao'), /recusou o Client ID ou o Client Secret/);
  a.credenciais({ CAJU_INTEGRACAO_SENHA: 'senha-errada' });
  recusa(a.c('wanessa', 'testarConexao'), /recusou o ID ou a senha da integração/);
  a.credenciais();
  const t = a.ok(a.c('wanessa', 'testarConexao'));
  assert.match(t.message, /funcionando \(Produção[\s\S]*terminada em s-0001/);
  // várias chamadas, um token só
  a.sim.empregado(CPF.tiago, 'TIAGO TECNICO TESTE', { email: 't@x.test' });
  const antes = a.sim.emitidos;
  a.ok(a.c('wanessa', 'lerColaboradoresCaju')); a.ok(a.c('wanessa', 'lerColaboradoresCaju'));
  assert.equal(a.sim.emitidos, antes, 'reaproveita o token guardado');
  // 9 min e meio depois: renova antes de vencer (folga de 60 s)
  a.mudar('2026-10-19T10:09:30-03:00');
  a.ok(a.c('wanessa', 'lerColaboradoresCaju'));
  assert.equal(a.sim.emitidos, antes + 1);
  // o Caju recusa o token (revogado): renova uma vez e segue
  a.sim.tokens = {};
  a.ok(a.c('wanessa', 'lerColaboradoresCaju'));
  assert.equal(a.sim.emitidos, antes + 2);
  // 500 e rede
  a.sim.falharUmaVez('GET', '/v1/employee', { code: 503, corpo: { message: 'upstream down' } });
  recusa(a.c('wanessa', 'lerColaboradoresCaju'), /Caju está com erro do lado dele \(código 503\)[\s\S]*Nada foi alterado/);
  a.sim.falharUmaVez('GET', '/v1/employee', 'rede');
  recusa(a.c('wanessa', 'lerColaboradoresCaju'), /o Caju não respondeu \(rede/);
  const reg = JSON.stringify(a.tabelas.CJU_CHAMADAS);
  for (const s of [CRED.CAJU_CLIENT_SECRET, CRED.CAJU_INTEGRACAO_SENHA, 'eyJhbGci', CPF.tiago]) assert.ok(reg.indexOf(s) < 0, 'registro sem ' + s);
  assert.ok(a.tabelas.CJU_CHAMADAS.some((c) => c.HTTP === 503 && c.RESULTADO === 'ERRO'));
  // cabeçalho Bearer em toda chamada da API; o token nunca na URL
  a.sim.chamadas.filter((c) => /services\.caju/.test(c.url)).forEach((c) => { assert.match(c.headers.Authorization, /^Bearer eyJ/); assert.ok(c.url.indexOf('eyJ') < 0); });
  const ch = a.ok(a.c('wanessa', 'chamadas')).chamadas;
  assert.ok(ch.length >= 8 && ch.every((c) => c.mensagem.indexOf(CRED.CAJU_CLIENT_SECRET) < 0));
  recusa(a.c('dora', 'chamadas'), /Configurar a integração/);
});

test('colaboradores: lista paginada do Caju, vínculo pelo CPF, sugestão por nome, cadastro com confirmação, arquivar e desarquivar', () => {
  const a = ambienteCaju();
  recusa(a.c('wanessa', 'vincular', { usuarioId: 'u_tec', cpf: CPF.tiago }), /lista do Caju ainda não foi lida/);
  a.sim.empregado(CPF.tiago, 'Tiago Técnico Teste', { email: 't@x.test' });
  a.sim.empregado('98765432100', 'PESSOA QUE SAIU', { archived: true });
  a.sim.empregado(CPF.gil, 'GIL GESTOR TECNICO TESTE', {});
  const l = a.ok(a.c('wanessa', 'lerColaboradoresCaju'));
  assert.equal(l.lidos, 3, 'leu as duas páginas');
  assert.match(l.message, /3 colaboradores\. 3 sem vínculo/);
  const tiago = l.pessoas.find((p) => p.usuarioId === 'u_tec');
  assert.equal(tiago.sugestoes.length, 1, 'sugere pelo nome, sem acento e sem diferenciar maiúsculas');
  assert.ok(!JSON.stringify(l).includes(CPF.tiago), 'CPF nunca vai inteiro para a tela');
  recusa(a.c('wanessa', 'vincular', { usuarioId: 'u_tec', cpf: '12345678900' }), /CPF de TIAGO TECNICO TESTE não é válido/);
  const nao = a.ok(a.c('wanessa', 'vincular', { usuarioId: 'u_tec2', cpf: CPF.paulo }));
  assert.equal(nao.naoEncontrado, true); assert.match(nao.message, /não está na lista do Caju[\s\S]*Cadastrar no Caju/);
  a.ok(a.c('wanessa', 'vincular', { usuarioId: 'u_tec', employeeId: tiago.sugestoes[0].employeeId }));
  recusa(a.c('wanessa', 'vincular', { usuarioId: 'u_gt', cpf: CPF.tiago }), /já está ligado a TIAGO TECNICO TESTE/);
  // cadastro: validação, confirmação, contato obrigatório, celular no formato do Caju
  const base = { usuarioId: 'u_tec2', cpf: CPF.paulo, nome: 'Paulo Técnico Teste', email: '', celular: '', confirmar: true };
  recusa(a.c('wanessa', 'cadastrarColaborador', base), /exige pelo menos um contato/);
  recusa(a.c('wanessa', 'cadastrarColaborador', Object.assign({}, base, { celular: '6233334444' })), /DDD \+ 9 \+ 8 números/);
  recusa(a.c('wanessa', 'cadastrarColaborador', Object.assign({}, base, { celular: '62988887777', confirmar: false })), /confirme os dados/);
  recusa(a.c('wanessa', 'cadastrarColaborador', Object.assign({}, base, { nome: 'Paulo', celular: '62988887777' })), /nome completo/);
  recusa(a.c('fabio', 'cadastrarColaborador', Object.assign({}, base, { cpf: CPF.tiago, celular: '62988887777' })), /já tem vínculo|já está no Caju/);
  const cad = a.ok(a.c('fabio', 'cadastrarColaborador', Object.assign({}, base, { celular: '(62) 98888-7777' })));
  assert.match(cad.message, /cadastrado no Caju e vinculado/);
  const criado = Object.values(a.sim.empregados).find((e) => e.cpf === CPF.paulo);
  assert.equal(criado.fullName, 'Paulo Técnico Teste');
  assert.equal(a.sim.chamadas.filter((c) => c.metodo === 'POST' && /\/v1\/employee$/.test(c.url)).length, 1);
  // arquivar / desarquivar com motivo, refletido no Caju e na tela
  recusa(a.c('wanessa', 'arquivarColaborador', { usuarioId: 'u_tec2', arquivar: true, motivo: 'curto' }), /motivo/);
  a.ok(a.c('wanessa', 'arquivarColaborador', { usuarioId: 'u_tec2', arquivar: true, motivo: 'saiu da empresa em outubro' }));
  assert.equal(criado.archived, true);
  assert.equal(a.ok(a.c('wanessa', 'colaboradores')).pessoas.find((p) => p.usuarioId === 'u_tec2').arquivado, true);
  a.ok(a.c('wanessa', 'arquivarColaborador', { usuarioId: 'u_tec2', arquivar: false, motivo: 'voltou para a equipe técnica' }));
  assert.equal(criado.archived, false);
  // pessoa inativa no SGO+ e ativa no Caju vira alerta (nada é arquivado sozinho)
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_tec2').STATUS = 'INATIVO';
  assert.match(a.ok(a.c('wanessa', 'colaboradores')).pessoas.find((p) => p.usuarioId === 'u_tec2').alerta, /arquive no Caju/);
  recusa(a.c('dora', 'vincular', { usuarioId: 'u_tec', cpf: CPF.tiago }), /Manter os colaboradores no Caju/);
});

test('carga pelo Caju: categoria na primeira vez, pedido pelo aprovado, saldo da conta, acompanha até creditado e registra a carga sozinha', () => {
  const a = ambienteCaju();
  a.vincularEquipe();
  const s = a.aprovada();
  const tela = a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao;
  assert.equal(tela.acoes.cargaCaju.pode, true); assert.equal(tela.caju.pode, true); assert.equal(tela.caju.categoria, '');
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id }), /escolha antes a categoria do crédito/);
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE', valor: '2.660,01' }), /passa do que falta carregar \(R\$ 2\.660,00/);
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id, valor: '1.000,00' }), /carga é parcial/);
  recusa(a.c('matheusgodoi', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE' }), /Fazer a carga do depósito de viagem pelo Caju/);
  const r = a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE', daViagem: true }));
  assert.equal(a.tabelas.CJU_CONFIG.length, 2, 'categoria gravada como versão nova da configuração (a 1 é o modo)');
  assert.equal(JSON.parse(a.tabelas.CJU_CONFIG[1].VALOR_JSON).modoCarga, 'API', 'a versão nova mantém o modo');
  const ped = Object.values(a.sim.pedidos)[0];
  assert.equal(ped.name, 'VIAGEM VIA-2026-0001'); assert.ok(ped.name.length <= 27);
  assert.deepEqual(ped.allowances[0].amounts, [{ category: 'FLEXIBLE', amount: 266000 }]);
  const efet = a.sim.chamadas.find((c) => c.metodo === 'POST' && /allowance_order\/ord-/.test(c.url));
  assert.deepEqual(JSON.parse(efet.payload), { paymentStrategies: [{ paymentType: 'EXISTING_BALANCE', amount: 266150 }] }, 'paga o total com a taxa');
  assert.equal(r.pedido.situacao, 'PROCESSANDO'); assert.equal(r.pedido.taxaTxt, 'R$ 1,50');
  assert.equal(a.gatilhos.filter((g) => g.fn === 'CajuConc_rotinaGatilho').length, 1, 'rotina de 15 minutos instalada');
  // com pedido em andamento: nada de outro pedido, carga manual, edição ou cancelamento
  const t2 = a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao;
  assert.equal(t2.acoes.carga.pode, false); assert.match(t2.acoes.carga.motivo, /pedido de crédito no Caju em andamento/);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: comp(a) }), /pedido de crédito no Caju em andamento/);
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id }), /pedido de crédito no Caju em andamento/);
  assert.equal(a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao.acoes.cancelar.pode, false);
  // a rotina acompanha: anda, credita, registra a carga com o pedido, a taxa e o comprovante
  a.sim.avancar(2); a.mudar('2026-10-19T10:20:00-03:00');
  a.rodar('CajuConc_rotinaGatilho()');
  assert.equal(a.tabelas.CJU_PEDIDOS[0].SITUACAO, 'PROCESSANDO'); assert.equal(a.tabelas.VIA_CARGAS.length, 0);
  a.sim.avancar(3); a.mudar('2026-10-19T10:40:00-03:00');
  a.rodar('CajuConc_rotinaGatilho()');
  const p = a.tabelas.CJU_PEDIDOS[0], g = a.tabelas.VIA_CARGAS[0], sol = a.tabelas.VIA_SOLICITACOES[0];
  assert.equal(p.SITUACAO, 'CREDITADO'); assert.equal(p.CARGA_ID, g.ID);
  assert.equal(g.ORIGEM, 'CAJU_API'); assert.equal(g.PEDIDO_CAJU_ID, ped.allowanceOrderId); assert.equal(g.TAXA_CAJU, 1.5); assert.equal(g.TOTAL_CAJU, 2661.5); assert.equal(g.VALOR, 2660);
  assert.equal(g.CENTRO_CUSTO_CAJU, 'GO-TECNICA');
  assert.equal(sol.SITUACAO, 'CARGA_FEITA'); assert.equal(sol.CARREGADO_TOTAL, 2660);
  const html = a.arquivos[g.COMPROVANTE_URL.split('/').pop()].bytes.toString('utf8');
  assert.match(html, /Comprovante de carga no cartão Caju[\s\S]*Taxa de serviço do Caju[\s\S]*R\$ 1,50[\s\S]*NF-0003/);
  assert.ok(a.emails.some((m) => /tiago@/.test(m.to) && /Carga no cartão Caju/.test(m.subject)), 'responsável avisado');
  // nunca dois pedidos: tudo carregado, nada mais a pedir
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id }), /já foi todo carregado/);
  assert.equal(Object.keys(a.sim.pedidos).length, 1);
});

test('carga pelo Caju: saldo insuficiente oferece PIX, código aparece, pago o PIX credita; cancelar enquanto o Caju deixa', () => {
  const a = ambienteCaju();
  a.vincularEquipe();
  a.sim.saldo = 1000;
  const s = a.aprovada();
  const r = a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE', daViagem: true }));
  assert.equal(r.pedido.situacao, 'SALDO_INSUFICIENTE'); assert.match(r.message, /NÃO foi pago[\s\S]*Pagar por PIX/);
  assert.equal(r.pedido.podePix, true); assert.equal(r.solicitacao.caju.pedidos[0].situacao, 'SALDO_INSUFICIENTE');
  assert.ok(a.emails.some((m) => /wanessa@|fabio@/.test(m.to) && /Saldo insuficiente/.test(m.subject)));
  const pix = a.ok(a.c('wanessa', 'pedidoPagarPix', { pedidoId: r.pedido.id }));
  assert.equal(pix.pedido.situacao, 'AGUARDANDO_PIX'); assert.match(pix.pedido.pix, /^00020126/); assert.match(pix.message, /copie o código/);
  assert.equal(a.ok(a.c('dora', 'creditos')).pedidos[0].pix, '', 'a Diretoria vê o pedido, mas não o código do PIX');
  recusa(a.c('wanessa', 'pedidoPagarSaldo', { pedidoId: r.pedido.id }), /aguardando o pagamento do pix/);
  a.sim.pagarPix(r.pedido.id && Object.keys(a.sim.pedidos)[0]); a.sim.avancar(5);
  const at = a.ok(a.c('wanessa', 'pedidoAtualizar', { pedidoId: r.pedido.id }));
  assert.equal(at.pedido.situacao, 'CREDITADO'); assert.equal(a.tabelas.VIA_CARGAS.length, 1);
  // segundo pedido, cancelado no rascunho
  const s2 = a.aprovada({ saidaEm: '2026-11-03T07:00', chegadaEm: '2026-11-05T18:00' });
  a.sim.saldo = 0;
  const r2 = a.ok(a.c('wanessa', 'pedidoCriar', { id: s2.id }));
  recusa(a.c('wanessa', 'pedidoCancelar', { pedidoId: r2.pedido.id, motivo: 'x' }), /motivo/);
  const c = a.ok(a.c('wanessa', 'pedidoCancelar', { pedidoId: r2.pedido.id, motivo: 'viagem adiada pelo cliente' }));
  assert.equal(c.pedido.situacao, 'CANCELADO'); assert.equal(a.sim.pedidos[c.pedido.pedidoCaju].status, 'CANCELED');
  assert.equal(a.ok(a.v('wanessa', 'abrir', { id: s2.id })).solicitacao.acoes.carga.pode, true, 'cancelado, a carga manual volta');
});

test('carga pelo Caju: rede caiu na criação (VERIFICAR, informar o número ou liberar), recusa 422, quem aprova ou viaja não faz, homologação não registra carga', () => {
  const a = ambienteCaju();
  a.vincularEquipe();
  const s = a.aprovada();
  a.sim.falharUmaVez('POST', '/v1/voucher/allowance_order', 'rede');
  const r = a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE' }));
  assert.equal(r.pedido.situacao, 'VERIFICAR'); assert.match(r.message, /Confira no portal do Caju/);
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id }), /em andamento/);
  recusa(a.c('wanessa', 'pedidoLiberar', { pedidoId: r.pedido.id, motivo: 'curto' }), /10 letras/);
  a.ok(a.c('wanessa', 'pedidoLiberar', { pedidoId: r.pedido.id, motivo: 'não há pedido com este nome no portal do Caju' }));
  // o Caju recusa os dados (422): o pedido fica recusado, sem pagar
  a.sim.empregados[Object.keys(a.sim.empregados)[0]].archived = true;
  recusa(a.c('wanessa', 'pedidoCriar', { id: s.id }), /o Caju recusou os dados \(employee archived\)/);
  assert.equal(a.tabelas.CJU_PEDIDOS[1].SITUACAO, 'RECUSADO');
  a.sim.empregados[Object.keys(a.sim.empregados)[0]].archived = false;
  // número informado: liga ao pedido existente no Caju
  a.sim.falharUmaVez('POST', '/v1/voucher/allowance_order', 'rede');
  const r3 = a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id }));
  const idCaju = a.sim.fetch('https://services.caju.com.br/partners/v1/voucher/allowance_order', { method: 'post', headers: { Authorization: 'Bearer ' + Object.keys(a.sim.tokens)[0] }, payload: JSON.stringify({ sponsorId: a.sim.sponsor, name: 'VIAGEM VIA-2026-0001', allowances: [{ employeeId: Object.keys(a.sim.empregados)[0], amounts: [{ category: 'FLEXIBLE', amount: 266000 }] }] }) });
  const num = JSON.parse(idCaju.getContentText()).allowanceOrderId;
  recusa(a.c('wanessa', 'pedidoInformar', { pedidoId: r3.pedido.id, pedidoCajuId: 'abc' }), /copie do portal/);
  const inf = a.ok(a.c('wanessa', 'pedidoInformar', { pedidoId: r3.pedido.id, pedidoCajuId: num }));
  assert.equal(inf.pedido.situacao, 'RASCUNHO');
  a.ok(a.c('wanessa', 'pedidoPagarSaldo', { pedidoId: r3.pedido.id }));
  // separação de funções: a Wanessa viajando não faz a carga do próprio cartão; o Fabio faz
  const b = ambienteCaju();
  b.sim.empregado(CPF.tiago, 'WANESSA FINANCEIRO TESTE', {}); b.ok(b.c('fabio', 'lerColaboradoresCaju')); b.ok(b.c('fabio', 'vincular', { usuarioId: 'u_fin', cpf: CPF.tiago }));
  const sw = b.aprovada({ equipe: [{ id: 'u_fin', funcao: 'OUTRO' }], responsavelId: 'u_fin' });
  recusa(b.c('wanessa', 'pedidoCriar', { id: sw.id, categoria: 'FLEXIBLE' }), /Você viaja nesta solicitação/);
  b.ok(b.c('fabio', 'pedidoCriar', { id: sw.id, categoria: 'FLEXIBLE' }));
  // homologação: o pedido corre, mas a carga NÃO entra no depósito
  const h = ambienteCaju(); h.credenciais({ CAJU_AMBIENTE: 'homologacao' });
  h.vincularEquipe(); const sh = h.aprovada();
  h.ok(h.c('wanessa', 'pedidoCriar', { id: sh.id, categoria: 'MEAL' })); h.sim.avancar(5);
  h.ok(h.c('wanessa', 'pedidoAtualizarTodos'));
  assert.equal(h.tabelas.CJU_PEDIDOS[0].SITUACAO, 'CREDITADO'); assert.match(h.tabelas.CJU_PEDIDOS[0].MENSAGEM, /Homologação: crédito fictício/);
  assert.equal((h.tabelas.VIA_CARGAS || []).length, 0); assert.equal(h.tabelas.VIA_SOLICITACOES[0].SITUACAO, 'APROVADA');
  assert.ok(h.sim.chamadas.some((c) => /auth-staging\.caju\.com\.br/.test(c.url)), 'homologação usa o acesso de staging');
});

/** Viagem creditada pelo Caju, prestação com 3 gastos, extrato com tudo o que pode acontecer. */
function cenarioConciliacao() {
  const a = ambienteCaju();
  const s = comCargaCaju(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  gasto(a, s, { categoria: 'HOSPEDAGEM', linhaId: 'Lhotel', data: '2026-10-29', valor: '1.500,00', estabelecimento: 'Hotel Centro Rio Verde', descricao: 'hospedagem de 2 quartos por 3 noites no atendimento' });
  gasto(a, s, { categoria: 'ALIMENTACAO', data: '2026-10-27', valor: '187,50', estabelecimento: 'Restaurante Sabor' });
  gasto(a, s, { categoria: 'ALIMENTACAO', data: '2026-10-28', valor: '95,00', estabelecimento: 'Padaria Pão Bom' });
  gasto(a, s, { categoria: 'COMBUSTIVEL', data: '2026-10-26', valor: '320,00', estabelecimento: 'Posto Estrada' });
  const csv = a.csv(['Extrato de despesas Caju', '', CAB,
    '19/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';Caju;Carga de saldo;2.660,00;GO-TECNICA;t-carga',
    '29/10/2026 20:10;TIAGO TECNICO TESTE;' + CPF.tiago + ';HOTEL CENTRO RIO VERDE LTDA;Compra;-1.500,00;GO-TECNICA;t1',
    '27/10/2026;Tiago Tecnico Teste;;Restaurante Sabor;Compra;-197,50;GO-TECNICA;t2',
    '28/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';PADARIA PAO BOM;Compra;-95,00;GO-TECNICA;t3',
    '28/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';LOJA DE CONVENIENCIA;Compra;-42,00;GO-TECNICA;t4',
    '27/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';ESTACIONAMENTO CENTRAL;Compra;-15,00;GO-ADMINISTRATIVO;t5',
    '10/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';LOJA ONLINE;Compra;-80,00;GO-TECNICA;t6',
    '26/10/2026;PAULO TECNICO TESTE;' + CPF.paulo + ';POSTO ESTRADA;Compra;-320,00;GO-TECNICA;t7',
    '28/10/2026;JOAO DESCONHECIDO;;BAR;Compra;-30,00;;t8']);
  return { a, s, csv };
}

test('extrato CSV de formato desconhecido: prévia com o mapeamento adivinhado, faltas apontadas, importa, guarda o arquivo e não repete', () => {
  const { a, csv } = cenarioConciliacao();
  recusa(a.c('wanessa', 'extratoPrevia', { arquivo: { nome: 'extrato.xlsx', base64: 'AAAA' } }), /precisa ser CSV/);
  const p = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv }));
  assert.equal(p.linhaCabecalho, 3, 'pula as linhas de título');
  assert.equal(p.separador, ';');
  assert.deepEqual(p.mapa, { data: 0, valor: 5, pessoa: 1, cpf: 2, estabelecimento: 3, tipo: 4, centro: 6, identificador: 7 });
  assert.equal(p.sinal, 'NEGATIVO_GASTO'); assert.equal(p.total, 9); assert.equal(p.validas, 9); assert.equal(p.semPessoa, 1);
  assert.deepEqual(p.porTipo.map((x) => x.tipo + ':' + x.qtd).sort(), ['CREDITO:1', 'GASTO:8']);
  assert.deepEqual(p.faltas, []);
  // sem a coluna do valor: aponta o que falta e não importa
  const semValor = Object.assign({}, p.mapa); delete semValor.valor;
  assert.deepEqual(a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv, mapa: semValor })).faltas, ['a coluna do VALOR']);
  recusa(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: semValor, confirmar: true }), /falta a coluna do VALOR/);
  recusa(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa }), /confira a prévia/);
  const imp = a.ok(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, sinal: p.sinal, confirmar: true }));
  assert.match(imp.message, /9 linhas novas/);
  assert.equal(a.tabelas.CJU_EXTRATO.length, 9);
  const original = Object.values(a.arquivos).find((f) => /extrato-caju\.csv$/.test(f.nome));
  assert.ok(original && original.bytes.toString('utf8').indexOf('HOTEL CENTRO') >= 0, 'arquivo original guardado');
  recusa(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, confirmar: true }), /já foi importado/);
  // mesmo conteúdo em outro arquivo (com uma linha a mais): só a nova entra
  const csv2 = a.csv(Buffer.from(csv.base64, 'base64').toString('utf8').split('\r\n').concat(['30/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';ESTACIONAMENTO X;Compra;-12,00;GO-TECNICA;t9']), 'extrato-2.csv');
  const p2 = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv2 }));
  assert.equal(p2.mapaGuardado, true, 'o mapeamento confirmado volta sozinho para o arquivo igual'); assert.equal(p2.repetidas, 9);
  const i2 = a.ok(a.c('wanessa', 'extratoImportar', { arquivo: csv2, mapa: p2.mapa, confirmar: true }));
  assert.match(i2.message, /1 linha nova, 9 já existiam/);
  // Latin-1, vírgula como separador, gasto positivo, data com ano curto
  const lat = Buffer.from(['Dt Transação,Funcionário,Valor R$,Descrição', '01/11/26,TIAGO TECNICO TESTE,"25,90",Padaria São João'].join('\n'), 'latin1');
  const p3 = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: { nome: 'outro.csv', base64: lat.toString('base64') } }));
  assert.equal(p3.separador, ','); assert.equal(p3.amostra[0].data, '01/11/2026'); assert.equal(p3.amostra[0].valorTxt, 'R$ 25,90');
  assert.equal(p3.amostra[0].estabelecimento, 'Padaria São João'); assert.equal(p3.amostra[0].tipo, 'GASTO'); assert.equal(p3.amostra[0].reconhecida, 'TIAGO TECNICO TESTE');
  // desfazer a importação (com motivo)
  recusa(a.c('wanessa', 'importacaoDesfazer', { id: i2.importacao.id, motivo: 'errado' }), /15 letras/);
  a.ok(a.c('wanessa', 'importacaoDesfazer', { id: i2.importacao.id, motivo: 'arquivo exportado em dobro por engano' }));
  assert.equal(a.tabelas.CJU_EXTRATO.filter((x) => !x.REMOVIDA_EM).length, 9);
});

test('cruzamento: concilia gasto a gasto e cria as divergências com dono e motivo; colunas reservadas do depósito preenchidas', () => {
  const { a, s, csv } = cenarioConciliacao();
  const p = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv }));
  const imp = a.ok(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, sinal: p.sinal, confirmar: true }));
  const lin = (id) => a.tabelas.CJU_EXTRATO.find((x) => x.IDENTIFICADOR === id);
  const divs = () => a.tabelas.CJU_DIVERGENCIAS.filter((d) => d.SITUACAO === 'ABERTA');
  const tipos = divs().map((d) => d.TIPO).sort();
  assert.deepEqual(tipos, ['CARTAO_OUTRA_PESSOA', 'CENTRO_DIFERENTE', 'FORA_DO_PERIODO', 'PESSOA_DESCONHECIDA', 'SEM_COMPROVANTE', 'SEM_COMPROVANTE', 'VALOR_DIFERENTE']);
  assert.equal(lin('t-carga').SITUACAO, 'CONCILIADO'); assert.equal(lin('t-carga').CARGA_ID, a.tabelas.VIA_CARGAS[0].ID);
  assert.equal(a.tabelas.VIA_CARGAS[0].EXTRATO_ID, lin('t-carga').ID, 'carga confirmada pelo extrato');
  assert.equal(lin('t1').SITUACAO, 'CONCILIADO'); assert.equal(lin('t3').SITUACAO, 'CONCILIADO');
  const hotel = a.tabelas.VIA_PRESTACOES.find((g) => g.CATEGORIA === 'HOSPEDAGEM');
  assert.equal(hotel.TRANSACAO_ID, lin('t1').ID); assert.equal(hotel.CONCILIACAO_SITUACAO, 'CONCILIADO');
  const vd = divs().find((d) => d.TIPO === 'VALOR_DIFERENTE');
  assert.equal(vd.DIFERENCA, 10); assert.equal(vd.DONO_ID, 'u_tec'); assert.match(vd.DESCRICAO, /R\$ 197,50[\s\S]*R\$ 187,50/);
  const co = divs().find((d) => d.TIPO === 'CARTAO_OUTRA_PESSOA'); assert.match(co.DESCRICAO, /aparece no cartão de PAULO TECNICO TESTE/);
  const sc = divs().filter((d) => d.TIPO === 'SEM_COMPROVANTE'); assert.ok(sc.every((d) => d.DONO_NOME === 'TIAGO TECNICO TESTE'));
  assert.match(divs().find((d) => d.TIPO === 'FORA_DO_PERIODO').DESCRICAO, /fora do período de qualquer viagem/);
  assert.equal(divs().find((d) => d.TIPO === 'PESSOA_DESCONHECIDA').DONO_NOME, 'Financeiro');
  assert.match(divs().find((d) => d.TIPO === 'CENTRO_DIFERENTE').DESCRICAO, /GO-ADMINISTRATIVO[\s\S]*GO-TECNICA/);
  assert.equal(a.tabelas.VIA_SOLICITACOES[0].CONCILIACAO_SITUACAO, 'DIVERGENCIA');
  // a tela da viagem junta tudo
  const v = a.ok(a.c('wanessa', 'viagem', { id: s.ID }));
  assert.equal(v.viagem.coluna, 'DIVERGENCIA'); assert.equal(v.gastos.length, 4); assert.ok(v.gastos.every((g) => g.descricao.length >= 10));
  // definir a pessoa da linha desconhecida, lembrando o nome
  a.ok(a.c('wanessa', 'definirPessoa', { linhaId: lin('t8').ID, usuarioId: 'u_tec2', lembrar: true }));
  assert.equal(divs().filter((d) => d.TIPO === 'PESSOA_DESCONHECIDA').length, 0, 'sanada sozinha');
  assert.equal(a.rodar('Cju_config_().apelidos["joao desconhecido"]'), 'u_tec2');
  // quem viaja não resolve a própria; resolver pede motivo
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_tec').PERFIL = 'FINANCEIRO';
  a.sessoes.s_tiago.perfil = 'FINANCEIRO';
  recusa(a.c('tiago', 'resolverDivergencia', { id: vd.ID, resolucao: 'JUSTIFICADA', motivo: 'gorjeta de dez reais paga à parte' }), /ninguém concilia a própria despesa/);
  recusa(a.c('wanessa', 'resolverDivergencia', { id: vd.ID, resolucao: 'JUSTIFICADA', motivo: 'ok' }), /15 letras/);
  const rs = a.ok(a.c('wanessa', 'resolverDivergencia', { id: vd.ID, resolucao: 'JUSTIFICADA', motivo: 'gorjeta de dez reais paga à parte, aceita' }));
  assert.match(rs.message, /Divergência resolvida/);
  assert.equal(a.tabelas.CJU_DIVERGENCIAS.find((d) => d.ID === vd.ID).SITUACAO, 'RESOLVIDA', 'continua resolvida depois de conciliar de novo');
  assert.equal(lin('t2').SITUACAO, 'RESOLVIDO');
  // avisar o dono: uma vez por dia; a do Financeiro não tem a quem avisar
  const semC = divs().find((d) => d.TIPO === 'SEM_COMPROVANTE' && d.EXTRATO_ID === lin('t4').ID);
  a.ok(a.c('wanessa', 'avisarDono', { id: semC.ID }));
  assert.ok(a.emails.some((m) => /tiago@/.test(m.to) && /Conciliação do cartão Caju/.test(m.subject) && /O que fazer: Quem levou o dinheiro lança o gasto/.test(m.body || m.htmlBody || '')));
  recusa(a.c('wanessa', 'avisarDono', { id: semC.ID }), /já foi avisado hoje/);
  recusa(a.c('wanessa', 'avisarDono', { id: divs().find((d) => d.TIPO === 'CENTRO_DIFERENTE').ID }), /do próprio Financeiro/);
  // o Tiago lança o gasto que faltava: a divergência é sanada sozinha
  gasto(a, s, { categoria: 'ALIMENTACAO', data: '2026-10-28', valor: '42,00', estabelecimento: 'Loja de conveniência', descricao: 'água e lanche da equipe na estrada' });
  a.ok(a.c('wanessa', 'conciliar'));
  assert.equal(lin('t4').SITUACAO, 'CONCILIADO');
  assert.equal(a.tabelas.CJU_DIVERGENCIAS.find((d) => d.ID === semC.ID).SITUACAO, 'SANADA');
  // ligar à mão com valor diferente pede motivo; desconsiderar pede motivo
  recusa(a.c('wanessa', 'ignorarLinha', { linhaId: lin('t6').ID, motivo: 'curto' }), /15 letras/);
  a.ok(a.c('wanessa', 'ignorarLinha', { linhaId: lin('t6').ID, motivo: 'compra pessoal, já descontada em folha com acordo' }));
  assert.equal(divs().filter((d) => d.EXTRATO_ID === lin('t6').ID).length, 0, 'a divergência da linha desconsiderada fica resolvida com o motivo');
  assert.match(a.tabelas.CJU_DIVERGENCIAS.find((d) => d.EXTRATO_ID === lin('t6').ID).MOTIVO, /desconsiderada: compra pessoal/);
  assert.ok(divs().some((d) => d.TIPO === 'FORA_DO_PERIODO' && d.EXTRATO_ID === lin('t8').ID), 'a linha do Paulo (sem viagem) fica fora do período');
  const comb = a.tabelas.VIA_PRESTACOES.find((g) => g.CATEGORIA === 'COMBUSTIVEL');
  const est = lin('t5');
  recusa(a.c('wanessa', 'ligar', { linhaId: est.ID, gastoId: comb.ID }), /valores são diferentes[\s\S]*15 letras/);
  // linhas e divergências para a tela
  assert.ok(a.ok(a.c('wanessa', 'linhas', { situacao: 'DIVERGENTE' })).linhas.length >= 1);
  const dv = a.ok(a.c('dora', 'divergencias', {}));
  assert.ok(dv.divergencias.every((d) => d.situacao === 'ABERTA')); assert.equal(dv.podeConciliar, false);
});

test('duplicidade, gasto sem transação, recolhimento do saldo e saldo no cartão', () => {
  const a = ambienteCaju();
  const s = comCargaCaju(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  gasto(a, s, { categoria: 'ALIMENTACAO', data: '2026-10-27', valor: '50,00', estabelecimento: 'Lanchonete Boa' });
  gasto(a, s, { categoria: 'COMBUSTIVEL', data: '2026-10-28', valor: '200,00', estabelecimento: 'Posto Amigo' });
  const csv = a.csv([CAB,
    '27/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';LANCHONETE BOA;Compra;-50,00;GO-TECNICA;',
    '27/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';LANCHONETE BOA;Compra;-50,00;GO-TECNICA;',
    '02/11/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';Caju;Recolhimento de saldo;2.410,00;GO-TECNICA;']);
  const p = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv }));
  assert.equal(p.repetidas, 0, 'duas compras iguais no mesmo arquivo não são "repetidas": entram as duas');
  a.ok(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, sinal: p.sinal, confirmar: true }));
  const ab = a.tabelas.CJU_DIVERGENCIAS.filter((d) => d.SITUACAO === 'ABERTA').map((d) => d.TIPO).sort();
  assert.deepEqual(ab, ['DEVOLUCAO_SEM_REGISTRO', 'DUPLICIDADE', 'SEM_TRANSACAO']);
  assert.equal(a.tabelas.VIA_PRESTACOES.find((g) => g.CATEGORIA === 'COMBUSTIVEL').CONCILIACAO_SITUACAO, 'SEM_TRANSACAO');
  // o acerto de devolução registrado na viagem liga ao recolhimento do extrato
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.ID }));
  a.tabelas.VIA_PRESTACOES.forEach((g) => a.ok(a.v('wanessa', 'conferirItem', { id: s.ID, itemId: g.ID, decisao: 'ACEITAR' })));
  a.ok(a.v('wanessa', 'concluirConferencia', { id: s.ID }));
  a.mudar('2026-11-03T10:00:00-03:00');
  a.ok(a.v('wanessa', 'registrarAcerto', { id: s.ID, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-11-02', valor: '2.410,00', comprovante: a.pdf('recolhimento.pdf') }));
  a.ok(a.c('wanessa', 'conciliar'));
  const ac = a.tabelas.VIA_ACERTOS[0];
  assert.ok(ac.TRANSACAO_ID, 'acerto ligado à transação do extrato'); assert.ok(ac.CONCILIADO_EM);
  assert.ok(!a.tabelas.CJU_DIVERGENCIAS.some((d) => d.SITUACAO === 'ABERTA' && d.TIPO === 'DEVOLUCAO_SEM_REGISTRO'));
  const v = a.ok(a.c('wanessa', 'viagem', { id: s.ID })).viagem;
  assert.equal(v.saldoCartaoTxt, 'R$ 150,00', 'carregado 2.660 − gasto 100 − recolhido 2.410');
});

test('fechamento por período e centro: prévia com pendências, ressalva obrigatória, trava o período, reabre com motivo; A4', () => {
  const { a, csv } = cenarioConciliacao();
  const p = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv }));
  a.ok(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, sinal: p.sinal, confirmar: true }));
  const per = { de: '2026-10-01', ate: '2026-10-31', centro: 'GO-TECNICA' };
  const pv = a.ok(a.c('wanessa', 'fechamentoPrevia', per));
  assert.equal(pv.exigeRessalva, true); assert.ok(pv.resumo.pendencias.some((x) => /divergências abertas/.test(x)));
  assert.equal(pv.resumo.carregadoTxt, 'R$ 2.660,00');
  recusa(a.c('dora', 'fechar', Object.assign({ ressalva: 'fechamento da Diretoria sem conferir' }, per)), /Fechar o período da conciliação/);
  recusa(a.c('wanessa', 'fechar', per), /sem ressalva[\s\S]*20 letras/);
  const f = a.ok(a.c('wanessa', 'fechar', Object.assign({ ressalva: 'divergências repassadas ao gestor para cobrança dos comprovantes' }, per)));
  assert.match(f.message, /FCJ-2026-0001 \(com ressalva\)/);
  const linhaFechada = a.tabelas.CJU_EXTRATO.find((x) => x.IDENTIFICADOR === 't2');
  assert.ok(linhaFechada.FECHAMENTO_ID);
  assert.equal(a.tabelas.VIA_SOLICITACOES[0].CONCILIACAO_SITUACAO, 'FECHADA');
  const dv = a.tabelas.CJU_DIVERGENCIAS.find((d) => d.SITUACAO === 'ABERTA' && d.FECHAMENTO_ID);
  recusa(a.c('wanessa', 'resolverDivergencia', { id: dv.ID, resolucao: 'JUSTIFICADA', motivo: 'tentando mudar depois de fechado' }), /período fechado/);
  recusa(a.c('wanessa', 'fechar', Object.assign({ ressalva: 'de novo o mesmo período fechado' }, per)), /sobrepõe ao fechamento FCJ-2026-0001/);
  const a4 = a.ok(a.c('dora', 'relatorio', { tipo: 'FECHAMENTO', id: f.fechamento.id }));
  assert.match(a4.html, /Fechamento da conciliação do cartão Caju[\s\S]*FCJ-2026-0001[\s\S]*Fechado com ressalva[\s\S]*Divergências[\s\S]*SHA-256/);
  recusa(a.c('wanessa', 'reabrirFechamento', { id: f.fechamento.id, motivo: 'curto' }), /15 letras/);
  a.ok(a.c('wanessa', 'reabrirFechamento', { id: f.fechamento.id, motivo: 'comprovante do hotel chegou depois do fechamento' }));
  assert.equal(a.tabelas.CJU_EXTRATO.find((x) => x.IDENTIFICADOR === 't2').FECHAMENTO_ID, '');
  assert.notEqual(a.tabelas.VIA_SOLICITACOES[0].CONCILIACAO_SITUACAO, 'FECHADA');
});

test('relatórios A4: individual (o próprio colaborador gera o dele), geral com índice, gráficos e quebras; divergências e créditos', () => {
  const { a, s, csv } = cenarioConciliacao();
  const p = a.ok(a.c('wanessa', 'extratoPrevia', { arquivo: csv }));
  a.ok(a.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, sinal: p.sinal, confirmar: true }));
  const per = { de: '2026-10-01', ate: '2026-10-31' };
  // individual: o Tiago gera o dele; não gera o do Paulo; o Financeiro e a Diretoria geram o de qualquer um
  const meu = a.ok(a.c('tiago', 'relatorio', Object.assign({ tipo: 'INDIVIDUAL' }, per)));
  assert.match(meu.nomeArquivo, /^Relatorio_individual_tiago_tecnico_teste_2026-10-01_2026-10-31\.html$/);
  assert.match(meu.html, /Relatório individual de viagens[\s\S]*TIAGO TECNICO TESTE[\s\S]*1\. Resumo[\s\S]*Carregado no cartão Caju[\s\S]*R\$ 2\.660,00/);
  assert.match(meu.html, /4\. Gastos com comprovante e para que foi[\s\S]*almoço da equipe no atendimento do Hospital Teste Alfa[\s\S]*Restaurante Sabor/);
  assert.match(meu.html, /hospedagem de 2 quartos por 3 noites/);
  assert.match(meu.html, /7\. Pendências[\s\S]*Valor do cartão diferente do comprovante/);
  assert.match(meu.html, /8\. Transações do cartão sem comprovante[\s\S]*LOJA DE CONVENIENCIA/);
  assert.match(meu.html, /<svg/); assert.match(meu.html, /Colaborador \(ciente\)/);
  recusa(a.c('tiago', 'relatorio', Object.assign({ tipo: 'INDIVIDUAL', pessoa: 'u_tec2' }, per)), /de outra pessoa/);
  assert.match(a.ok(a.c('dora', 'relatorio', Object.assign({ tipo: 'INDIVIDUAL', pessoa: 'u_tec' }, per))).html, /TIAGO TECNICO TESTE/);
  recusa(a.c('tiago', 'relatorio', Object.assign({ tipo: 'GERAL' }, per)), /módulo é do Financeiro/);
  const g = a.ok(a.c('wanessa', 'relatorio', Object.assign({ tipo: 'GERAL' }, per)));
  assert.match(g.html, /Índice[\s\S]*href="#g1"[\s\S]*href="#g8"/);
  for (const t of ['1. Resumo do período', '2. Por colaborador', '3. Por centro de custo', '4. Por cliente ou O.S.', '5. Por categoria', '6. Divergências abertas', '7. Créditos pelo Caju', '8. Situação de cada viagem']) assert.ok(g.html.indexOf(t) >= 0, t);
  assert.match(g.html, /Cliente: HOSPITAL TESTE ALFA LTDA|Cliente: Hospital Teste Alfa/);
  assert.ok((g.html.match(/<svg/g) || []).length >= 4, 'gráficos do resumo, colaborador, centro e categoria');
  assert.match(g.html, /Hospedagem[\s\S]*Alimentação/);
  assert.match(a.ok(a.c('wanessa', 'relatorio', Object.assign({ tipo: 'DIVERGENCIAS' }, per))).html, /Divergências da conciliação Caju[\s\S]*O que fazer/);
  assert.match(a.ok(a.c('wanessa', 'relatorio', Object.assign({ tipo: 'CREDITOS' }, per))).html, /Créditos pedidos ao Caju[\s\S]*VIA-2026-0001[\s\S]*FLEXIBLE/);
  // o A4 de fechamento da viagem (Depósito de viagem) mostra para que foi cada gasto
  assert.match(a.ok(a.v('wanessa', 'fechamento', { id: s.ID })).html, /Para que foi, estabelecimento e comprovante[\s\S]*almoço da equipe/);
});

test('painel, Kanban e pendências: colunas por situação da conciliação e itens para o Financeiro', () => {
  const a = ambienteCaju();
  a.vincularEquipe();
  const s1 = a.aprovada();
  a.sim.saldo = 0;
  a.ok(a.c('wanessa', 'pedidoCriar', { id: s1.id, categoria: 'FLEXIBLE' }));
  const s2 = a.aprovada({ saidaEm: '2026-11-03T07:00', chegadaEm: '2026-11-05T18:00' });
  const pn = a.ok(a.c('wanessa', 'painel'));
  const col = (id) => pn.viagens.find((v) => v.id === id).coluna;
  assert.equal(col(s1.id), 'CREDITO'); assert.equal(col(s2.id), 'AGUARDANDO_CARGA');
  assert.equal(pn.colunas.length, 8); assert.equal(pn.contagens.pedidosAcao, 1); assert.equal(pn.contagens.aguardandoCarga, 1);
  const ini = a.ok(a.c('wanessa', 'iniciar'));
  assert.equal(ini.contagens.pedidosAcao, 1); assert.equal(ini.integracao.configurada, true); assert.equal(ini.integracao.producao, true);
  // central de pendências: o pedido com saldo insuficiente aparece para quem faz a carga
  const itens = [];
  a.rodar('Viagem_fontePendencias_')((x) => itens.push(x), { cliente: false });
  const it = itens.find((x) => x.tipo === 'caju_pedido');
  assert.ok(it, 'pendência do pedido'); assert.ok(it.paraUsuarios.includes('u_fin') && it.paraUsuarios.includes('u_fin2'));
  assert.match(it.titulo, /colocar saldo na conta Caju ou pagar por PIX/); assert.ok(!/R\$/.test(it.titulo), 'sem valor no título');
});

test('configuração: versões com motivo, categorias do Caju, tolerâncias limitadas; Chaves e senhas: grupo Caju, valores nunca voltam', () => {
  const a = ambienteCaju({ comChaves: true });
  recusa(a.c('wanessa', 'salvarConfig', { categoria: 'FLEXIBLE', motivo: 'curto' }), /10 letras/);
  recusa(a.c('wanessa', 'salvarConfig', { categoria: 'DINHEIRO', motivo: 'categoria inventada para teste' }), /escolha a categoria do crédito na lista/);
  recusa(a.c('dora', 'salvarConfig', { categoria: 'MEAL', motivo: 'Diretoria tentando configurar' }), /Configurar a integração/);
  const c = a.ok(a.c('wanessa', 'salvarConfig', { categoria: 'MEAL', toleranciaDias: '5', janelaDepoisDias: '99', motivo: 'primeira configuração da integração' }));
  assert.equal(c.config.categoria, 'MEAL'); assert.equal(c.config.toleranciaDias, 5); assert.equal(c.config.janelaDepoisDias, 2, 'fora da faixa fica o padrão');
  assert.equal(a.ok(a.c('wanessa', 'config')).config.versoes.length, 2);
  // Chaves e senhas
  const lista = JSON.parse(JSON.stringify(a.rodar('Chaves_lista_()')));
  const caju = lista.itens.filter((i) => i.grupo === 'Caju (cartão de despesas)').map((i) => i.chave);
  assert.deepEqual(caju, ['CAJU_AMBIENTE', 'CAJU_CLIENT_ID', 'CAJU_CLIENT_SECRET', 'CAJU_INTEGRACAO_ID', 'CAJU_INTEGRACAO_SENHA', 'CAJU_URL_AUTH', 'CAJU_URL_API']);
  assert.ok(!JSON.stringify(lista).includes(CRED.CAJU_CLIENT_SECRET) && !JSON.stringify(lista).includes(CRED.CAJU_INTEGRACAO_SENHA));
  const gravar = (chave, valor) => a.ctx.Chaves_apiGravar('s_admin', { chave, valor });
  assert.match(gravar('CAJU_AMBIENTE', 'teste').message, /homologacao ou producao/);
  assert.equal(gravar('CAJU_AMBIENTE', 'Homologação').ok, true); assert.equal(a.props.CAJU_AMBIENTE, 'homologacao');
  assert.match(gravar('CAJU_URL_API', 'http://outro.site').message, /https:\/\//);
  assert.equal(a.ctx.Chaves_apiGravar('s_wanessa', { chave: 'CAJU_CLIENT_SECRET', valor: 'x' }).ok, false, 'só o dono grava');
  const t = a.ctx.Chaves_apiTestar('s_admin', { tipo: 'caju' });
  assert.equal(t.ok, true); assert.equal(t.funcionou, true); assert.match(t.texto, /Homologação/);
});

test('modo da carga (protocolo Caju 02527150): padrão manual; pelo Caju só com credenciais e escolhido pelo Financeiro; o manual continua com a conciliação pelo extrato', () => {
  // sem credenciais: manual, e não dá para escolher a API
  const a = ambienteCaju({ credenciais: false });
  const ini = a.ok(a.c('wanessa', 'iniciar'));
  assert.equal(ini.modoCarga.modo, 'MANUAL'); assert.match(ini.modoCarga.motivo, /credenciais do Caju ainda não existem/);
  recusa(a.c('wanessa', 'salvarConfig', { modoCarga: 'API', motivo: 'tentando usar a API sem credencial' }), /integração ainda não está configurada[\s\S]*a carga é manual/);
  // com credenciais e sem escolha: continua manual; a carga manual funciona e a do Caju não aparece
  const b = ambienteCaju({ modo: 'MANUAL' });
  b.vincularEquipe();
  const s = b.aprovada();
  const t = b.ok(b.v('wanessa', 'abrir', { id: s.id })).solicitacao;
  assert.equal(t.caju.modo, 'MANUAL'); assert.equal(t.acoes.cargaCaju.pode, false); assert.equal(t.acoes.carga.pode, true);
  assert.match(t.caju.modoTexto, /Carga manual \(Caju Despesas ou outro\)/);
  recusa(b.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE' }), /modo manual[\s\S]*Configuração/);
  assert.equal(Object.keys(b.sim.pedidos).length, 0, 'nada vai ao Caju');
  b.ok(b.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: comp(b) }));
  // o Financeiro escolhe a carga pelo Caju (com motivo, versão nova) e o botão aparece na próxima viagem
  recusa(b.c('dora', 'salvarConfig', { modoCarga: 'API', motivo: 'Diretoria tentando mudar o modo' }), /Configurar a integração/);
  const c = b.ok(b.c('wanessa', 'salvarConfig', { modoCarga: 'API', motivo: 'Caju confirmou que a viagem é benefício' }));
  assert.equal(c.config.modoCarga, 'API'); assert.match(c.config.modoTexto, /pedido de benefício pela API/);
  const s2 = b.aprovada({ saidaEm: '2026-11-03T07:00', chegadaEm: '2026-11-05T18:00' });
  assert.equal(b.ok(b.v('wanessa', 'abrir', { id: s2.id })).solicitacao.acoes.cargaCaju.pode, true);
  // a carga manual feita antes é conciliada pelo extrato igual
  b.mudar('2026-10-30T10:00:00-03:00');
  b.ok(b.v('tiago', 'lancarGasto', { id: s.id, categoria: 'ALIMENTACAO', data: '2026-10-27', valor: '80,00', estabelecimento: 'Restaurante Sabor', pagoCom: 'CAJU', arquivo: comp(b), descricao: desc }));
  const csv = b.csv([CAB, '19/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';Caju Despesas;Carga de saldo;2.660,00;GO-TECNICA;m1', '27/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';RESTAURANTE SABOR;Compra;-80,00;GO-TECNICA;m2']);
  const p = b.ok(b.c('wanessa', 'extratoPrevia', { arquivo: csv }));
  b.ok(b.c('wanessa', 'extratoImportar', { arquivo: csv, mapa: p.mapa, sinal: p.sinal, confirmar: true }));
  assert.ok(b.tabelas.CJU_EXTRATO.every((x) => x.SITUACAO === 'CONCILIADO'), 'carga manual e gasto conciliados pelo extrato');
  assert.ok(b.tabelas.VIA_CARGAS[0].EXTRATO_ID);
});
