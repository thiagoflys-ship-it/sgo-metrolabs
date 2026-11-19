// 19/11/2026 — Etapa E1 do estudo output/contratos-aditivo-20261119/ESTUDO.md (decisões do dono = recomendações da seção 6).
// E1a: compra de contrato de cliente (fornecimento recorrente, comodato, locação) provisória no Informar compra e na requisição, com as
// conferências (competência repetida, reposição, competência distante) e o "Corrigir o vínculo" com motivo e histórico campo a campo.
// E1b: aditivo de recarga em viagem (CJU_ADITIVOS): pedido do técnico, decisão de UM sócio, gestor só acompanha, avisos a qualquer hora
// quando parado, lembrete de 30 min e tarefa de 60 min, teto de carga = aprovado + aditivos (carga manual e pelo Caju), exceção da carga
// pelo próprio aprovador à noite, prestação com o aditivo e previsto × realizado. Código REAL do SGO+; WhatsApp, e-mail e Caju simulados.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./_compras_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const recusa = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); if (re) assert.match(r.message, re); return r; };
const B64 = (t) => Buffer.from(t).toString('base64');
let nComp = 0;
const comp = () => ({ nome: 'comprovante' + (++nComp) + '.jpg', tipo: 'image/jpeg', base64: B64('comprovante de teste ' + nComp + ' ' + Math.random()) });

// ------------------------------------------------------------------ E1a: compra de contrato
function ambCompras() { const amb = C.ambiente(); C.regrasDeTeste(amb); return amb; }
const CONTRATO = (extra) => Object.assign({ tipo: 'CONTRATO', clienteId: 'c1', unidadeId: 'un1', contratoTipo: 'FORNECIMENTO', contratoRef: 'Contrato de insumos Alfa 2026', competencia: '2026-10', natureza: 'FORNECIMENTO_MES', justificativa: '' }, extra || {});
const informar = (amb, vinculo, extra, sid) => amb.api(sid || 's_tiago', 'informar', Object.assign({ finalidade: 'Insumos do contrato do cliente para o mês', vinculo,
  itens: [{ descricao: 'Caixa de indicador biológico', quantidade: 2, unidade: 'cx.' }], fornecedorNome: 'Distribuidora Teste', valor: '120,00', formaPagamento: 'CARTAO_CREDITO',
  cartaoFinal: '4321', parcelas: 1, dataCompra: '2026-10-19', comprovante: comp(), nfNumero: '555', recebido: true }, extra || {}));

test('E1a-1: o vínculo "Contrato de cliente" existe no Informar compra e na requisição, com as opções de tipo e natureza', () => {
  const amb = ambCompras();
  const o = ok(amb.api('s_tiago', 'opcoesInformar', {}));
  assert.equal(o.vinculos.CONTRATO, 'Contrato de cliente (fornecimento recorrente, comodato, locação)');
  assert.deepEqual(Object.keys(o.contrato.tipos), ['FORNECIMENTO', 'COMODATO', 'LOCACAO', 'SERVICOS', 'OUTRO']);
  assert.deepEqual(Object.keys(o.contrato.naturezas), ['FORNECIMENTO_MES', 'REPOSICAO', 'COMPLEMENTO']);
  assert.equal(ok(amb.api('s_tiago', 'iniciar', {})).vinculos.CONTRATO, 'Contrato de cliente (fornecimento recorrente, comodato, locação)');
  assert.ok(ok(amb.api('s_tiago', 'opcoesVinculo', {})).contrato.naturezas.REPOSICAO);
});

test('E1a-2: cliente e unidade obrigatórios, tipo, referência, competência e natureza conferidos; reposição exige justificativa', () => {
  const amb = ambCompras();
  recusa(informar(amb, CONTRATO({ clienteId: '' })), /escolha o cliente do contrato na lista[\s\S]*Cadastros > Clientes/);
  recusa(informar(amb, CONTRATO({ unidadeId: '' })), /escolha a unidade do cliente atendida pelo contrato[\s\S]*cadastre a unidade em Cadastros > Clientes/);
  recusa(informar(amb, CONTRATO({ contratoTipo: '' })), /tipo do contrato/);
  recusa(informar(amb, CONTRATO({ contratoRef: 'IM' })), /referência do contrato[\s\S]*pelo menos 5 letras/);
  recusa(informar(amb, CONTRATO({ competencia: '13/2026' })), /competência[\s\S]*não é válida/);
  recusa(informar(amb, CONTRATO({ natureza: '' })), /natureza/);
  recusa(informar(amb, CONTRATO({ natureza: 'REPOSICAO', justificativa: 'erro' })), /justificativa da reposição[\s\S]*20 letras/);
  // fornecimento do mês sem justificativa e com a competência vazia (vale o mês da compra)
  const r = ok(informar(amb, CONTRATO({ competencia: '' })));
  assert.equal(r.gravada, true, r.message);
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r.numero);
  assert.equal(req.VINCULO_TIPO, 'CONTRATO'); assert.equal(req.CLIENTE_ID, 'c1'); assert.equal(req.UNIDADE_ID, 'un1');
  assert.equal(req.COMPETENCIA, '2026-10'); assert.equal(req.CONTRATO_TIPO, 'FORNECIMENTO'); assert.equal(req.CONTRATO_NATUREZA, 'FORNECIMENTO_MES');
  assert.equal(req.CONTRATO_ID, '', 'fica vazio até o módulo de Contratos');
  assert.match(r.requisicao.vinculo.texto, /^Contrato de cliente: Hospital Teste Alfa \(Unidade Centro\) · Contrato de insumos Alfa 2026 · competência 10\/2026 · fornecimento do mês$/);
});

test('E1a-3: a segunda compra "Fornecimento do mês" da mesma competência vira apontamento (não bloqueia); reposição marca o custo de erro', () => {
  const amb = ambCompras();
  const a = ok(informar(amb, CONTRATO()));
  const b = ok(informar(amb, CONTRATO({ contratoRef: 'contrato de INSUMOS alfa  2026' }), { valor: '130,00', cartaoFinal: '9876' }));
  assert.equal(b.gravada, true, b.message);
  const rb = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === b.numero);
  const ap = JSON.parse(rb.INF_APONTAMENTOS);
  assert.ok(ap.some((x) => x.tipo === 'CONTRATO_REPETIDO' && x.texto.indexOf(a.numero) >= 0 && /competência \(10\/2026\)/.test(x.texto)), JSON.stringify(ap));
  assert.match(b.message, /competência do contrato já fornecida/);
  // outra competência não acusa
  const c = ok(informar(amb, CONTRATO({ competencia: '11/2026' }), { valor: '140,00', cartaoFinal: '1111' }));
  assert.equal(String(amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === c.numero).INF_APONTAMENTOS || '').indexOf('CONTRATO_REPETIDO'), -1);
  const d = ok(informar(amb, CONTRATO({ natureza: 'REPOSICAO', justificativa: 'Repor itens enviados errados ao cliente, erro na separação do pedido' }), { valor: '150,00', cartaoFinal: '2222' }));
  const apd = JSON.parse(amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === d.numero).INF_APONTAMENTOS);
  assert.ok(apd.some((x) => x.tipo === 'REPOSICAO_CONTRATO' && /custo de erro/.test(x.texto)));
});

test('E1a-4: competência a mais de 2 meses do mês da compra pergunta o motivo (o quê, por quê, o que fazer) e grava com a resposta', () => {
  const amb = ambCompras();
  const r1 = ok(informar(amb, CONTRATO({ competencia: '2027-02' })));
  assert.equal(r1.gravada, false);
  assert.equal(r1.precisa, 'COMPETENCIA');
  assert.match(r1.pendentes[0].message, /competência 02\/2027 está a 4 meses depois do mês da compra \(10\/2026\)[\s\S]*escreva o motivo/);
  const r2 = ok(informar(amb, CONTRATO({ competencia: '2027-02' }), { competenciaMotivo: 'Fornecimento antecipado a pedido do cliente' }));
  assert.equal(r2.gravada, true, r2.message);
  const ap = JSON.parse(amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r2.numero).INF_APONTAMENTOS);
  assert.ok(ap.some((x) => x.tipo === 'COMPETENCIA_DISTANTE' && /Fornecimento antecipado/.test(x.texto)));
});

test('E1a-5: a requisição (pedido pela tela) aceita o vínculo de contrato com as mesmas regras', () => {
  const amb = ambCompras();
  recusa(amb.api('s_tiago', 'salvarRequisicao', { urgencia: 'NORMAL', finalidade: 'Insumos do contrato do mês para o cliente', vinculo: CONTRATO({ unidadeId: '' }), itens: [{ categoria: 'INSUMO', descricao: 'Indicador biológico', quantidade: 2, unidade: 'cx.' }] }), /unidade do cliente atendida pelo contrato/);
  recusa(amb.api('s_tiago', 'salvarRequisicao', { urgencia: 'NORMAL', finalidade: 'Insumos do contrato do mês para o cliente', vinculo: CONTRATO({ competencia: '2026-06' }), itens: [{ categoria: 'INSUMO', descricao: 'Indicador biológico', quantidade: 2, unidade: 'cx.' }] }), /Motivo da competência/);
  const r = ok(amb.api('s_tiago', 'salvarRequisicao', { urgencia: 'NORMAL', finalidade: 'Insumos do contrato do mês para o cliente', vinculo: CONTRATO(), itens: [{ categoria: 'INSUMO', descricao: 'Indicador biológico', quantidade: 2, unidade: 'cx.' }] }));
  assert.equal(r.requisicao.vinculo.tipo, 'CONTRATO');
  assert.equal(r.requisicao.vinculo.competenciaBr, '10/2026');
  assert.equal(r.requisicao.vinculo.contratoTipoNome, 'Fornecimento de insumos');
});

test('E1a-6: "Corrigir o vínculo" (caso da REQ-0017: uso interno que era reposição de contrato) grava só o vínculo, com antes, depois e motivo', () => {
  const amb = ambCompras();
  const r = ok(informar(amb, { tipo: 'INTERNO', centroCusto: 'Administrativo', motivoInterno: 'Para o cliente, repor itens enviados errados' }));
  const req0 = Object.assign({}, amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r.numero));
  const ficha = ok(amb.api('s_tiago', 'requisicao', { id: req0.ID })).requisicao;
  assert.equal(ficha.acoes.corrigirVinculo, true, 'quem informou corrige');
  // quem não informou nem é de Compras/Financeiro/gestão não corrige (e nem vê a compra)
  recusa(amb.api('s_mara', 'corrigirVinculo', { id: req0.ID, vinculo: CONTRATO(), motivo: 'Correção feita por outra pessoa de teste' }));
  recusa(amb.api('s_tiago', 'corrigirVinculo', { id: req0.ID, vinculo: CONTRATO(), motivo: 'curto' }), /motivo da correção[\s\S]*15 letras/);
  recusa(amb.api('s_tiago', 'corrigirVinculo', { id: req0.ID, vinculo: CONTRATO({ natureza: 'REPOSICAO', justificativa: '' }), motivo: 'Reposição do contrato de insumos, informada antes como uso interno' }), /corrigir o vínculo: escreva a justificativa da reposição/);
  const c = ok(amb.api('s_fabio', 'corrigirVinculo', { id: req0.ID, vinculo: CONTRATO({ natureza: 'REPOSICAO', justificativa: 'Repor itens enviados errados ao cliente, erro na separação do pedido' }), motivo: 'Reposição do contrato de insumos, informada antes como uso interno' }));
  assert.match(c.message, /Vínculo da REQ-2026-\d+ corrigido: Contrato de cliente/);
  const req1 = amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === req0.ID);
  assert.equal(req1.VINCULO_TIPO, 'CONTRATO'); assert.equal(req1.CONTRATO_NATUREZA, 'REPOSICAO'); assert.equal(req1.USO_INTERNO_MOTIVO, ''); assert.equal(req1.CENTRO_CUSTO, '');
  // os outros campos não mudam
  for (const k of ['VALOR_TOTAL', 'FINALIDADE', 'SITUACAO', 'PEDIDO_ID', 'SOLICITANTE_ID', 'TITULO', 'NUMERO']) assert.equal(String(req1[k]), String(req0[k]), k);
  const ap = JSON.parse(req1.INF_APONTAMENTOS);
  assert.ok(ap.some((x) => x.tipo === 'REPOSICAO_CONTRATO'));
  const h = amb.tabelas.CMP_HISTORICO.filter((x) => x.ENTIDADE_ID === req0.ID && x.TIPO === 'VINCULO_CORRIGIDO');
  assert.equal(h.length, 1);
  assert.match(h[0].TEXTO, /Motivo: Reposição do contrato[\s\S]*Antes: Uso interno: Para o cliente[\s\S]*Depois: Contrato de cliente[\s\S]*Vínculo: "Uso interno \(ferramenta, estoque, administrativo\)" para "Contrato de cliente[\s\S]*Centro de custo: "Administrativo" para \(vazio\)/);
  assert.equal(h[0].USUARIO_NOME, 'FABIO FINANCEIRO TESTE');
  recusa(amb.api('s_fabio', 'corrigirVinculo', { id: req0.ID, vinculo: CONTRATO({ natureza: 'REPOSICAO', justificativa: 'Repor itens enviados errados ao cliente, erro na separação do pedido' }), motivo: 'Mesma correção de novo, sem mudança' }), /igual ao que já está gravado/);
});

test('E1a-7: relatório "Compras de contrato de cliente" agrupa por cliente, referência e competência, com as reposições', () => {
  const amb = ambCompras();
  ok(informar(amb, CONTRATO()));
  ok(informar(amb, CONTRATO({ natureza: 'REPOSICAO', justificativa: 'Repor itens enviados errados ao cliente, erro na separação do pedido' }), { valor: '80,00', cartaoFinal: '7777' }));
  ok(informar(amb, { tipo: 'INTERNO', centroCusto: 'Administrativo', motivoInterno: 'Material de escritório da sede de teste' }, { valor: '50,00', cartaoFinal: '8888' }));
  const g = ok(amb.api('s_fabio', 'gerarRelatorio', { tipo: 'CONTRATO', de: '2026-10-01', ate: '2026-10-31' }));
  assert.match(g.html, /Compras de contrato de cliente/);
  assert.match(g.html, /Contrato de insumos Alfa 2026/);
  assert.match(g.html, /10\/2026/);
  assert.match(g.html, /Reposições \(erro, avaria ou falta\)/);
  assert.ok(g.html.indexOf('Material de escritório') < 0, 'uso interno fora do relatório de contrato');
});

// ------------------------------------------------------------------ E1b: aditivo de recarga em viagem
const { ambienteCaju } = require('./_caju_ambiente.cjs');
const gs = (a, ev) => (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === ev);
const pend = (a, uid, perfil) => { const l = []; a.ctx.Viagem_fontePendencias_((x) => l.push(x), { userId: uid, perfil }); return l; };
let nPdf = 0;
const pdf = (a) => a.pdf('comprovante-aditivo-' + (++nPdf) + '.pdf');
/** Viagem de 26 a 29/10 aprovada e carregada (R$ 2.660,00) pelo Financeiro; o relógio vai para a noite de 27/10 (fora do expediente). */
function viagemEmAndamento(o) {
  o = o || {};
  const a = ambienteCaju(Object.assign({ credenciais: false }, o.amb || {}));
  const s = a.aprovada();
  a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: pdf(a) }));
  a.mudar(o.quando || '2026-10-27T21:00:00-03:00');
  return { a, s };
}
const pedir = (a, s, x, login) => a.v(login || 'tiago', 'aditivoPedir', Object.assign({ viagemId: s.id, categoria: 'PECA', valor: '350,00', urgencia: 'PARADO',
  justificativa: 'Usinagem do eixo da bomba da autoclave, peça quebrada na desmontagem; sem ela o equipamento não volta a operar.' }, x || {}));

test('E1b-1: o técnico pede o aditivo no meio da viagem (parado, à noite); os sócios recebem na hora; a aprovação da viagem não muda', () => {
  const { a, s } = viagemEmAndamento({ quando: '2026-10-24T21:00:00-03:00' });
  // antes da janela da viagem: recusado com o caminho
  const ctx0 = a.ok(a.v('tiago', 'aditivoContexto'));
  assert.equal(ctx0.viagens.length, 0);
  assert.match(ctx0.indisponiveis[0].motivo, /começa em 26\/10\/2026[\s\S]*peça a quem pediu a viagem para ajustar/);
  recusa(pedir(a, s), /começa em 26\/10\/2026/);
  a.mudar('2026-10-27T21:00:00-03:00');
  const antes = Object.assign({}, a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id));
  const ctx = a.ok(a.v('tiago', 'aditivoContexto'));
  assert.equal(ctx.viagens.length, 1); assert.equal(ctx.viagens[0].numero, s.numero);
  recusa(pedir(a, s, { justificativa: 'peça' }), /para que é o dinheiro \(20 letras ou mais\)/);
  recusa(pedir(a, s, { valor: '0' }), /valor em reais, maior que zero/);
  recusa(pedir(a, s, { categoria: 'OUTRO' }), /na categoria "Outro" a foto/);
  recusa(pedir(a, s, {}, 'rita'), /não está na equipe da viagem/);
  const r = a.ok(pedir(a, s));
  assert.match(r.message, new RegExp('^Aditivo ' + s.numero + '/A1 enviado às 21:00\\. .+ e .+ foram avisados por WhatsApp e e-mail, a qualquer hora\\. Lembrete automático às 21:30\\.'));
  const ad = a.tabelas.CJU_ADITIVOS[0];
  assert.equal(ad.NUMERO, s.numero + '/A1'); assert.equal(ad.SITUACAO, 'AGUARDANDO'); assert.equal(ad.PORTADOR_ID, 'u_tec'); assert.equal(ad.REPASSAR_CLIENTE, 'A_DEFINIR');
  recusa(pedir(a, s), /já há um pedido igual aguardando os sócios/);
  // a viagem continua aprovada e carregada, com a mesma marca
  const depois = a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id);
  for (const k of ['SITUACAO', 'APROVACAO_VALIDA', 'APROVADO_HASH', 'APROVADO_REVISAO', 'APROVADO_TOTAL', 'CONTEUDO_HASH', 'REVISAO', 'CARREGADO_TOTAL']) assert.equal(String(depois[k]), String(antes[k]), k);
  // GS12: sócios (dono e Diretoria) na hora, à noite; o gestor da área (Gil) fica para o expediente, sem decisão
  const g = gs(a, 'GS12');
  const soc = g.filter((l) => /^URGENTE · parado aguardando · Aditivo de recarga/.test(l.TITULO));
  assert.deepEqual(soc.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  soc.forEach((l) => { assert.equal(l.WA_SITUACAO, 'ENVIADO', 'WhatsApp na hora à noite'); assert.match(l.TEXTO, /R\$ 350,00[\s\S]*ESTÁ PARADO AGUARDANDO/); });
  const gest = g.filter((l) => l.USUARIO_ID === 'u_gt');
  assert.equal(gest.length, 1); assert.match(gest[0].TITULO, /^Para acompanhar/); assert.equal(gest[0].SITUACAO, 'NA_FILA', 'gestor: no expediente');
  assert.match(gest[0].LIBERAR_EM, /^2026-10-28T/);
  // na central: decidir é dos sócios (o técnico e o gestor não)
  assert.ok(pend(a, 'u_adm', 'ADMIN').some((p) => p.tipo === 'aditivo_decidir'));
  assert.ok(!pend(a, 'u_tec', 'TECNICO').some((p) => p.tipo === 'aditivo_decidir' && (p.paraUsuarios || []).includes('u_tec')));
  // o técnico vê o andamento
  const meu = a.ok(a.v('tiago', 'aditivoContexto')).aditivos[0];
  assert.match(meu.andamento, /enviado às 21:00[\s\S]*foram avisados por WhatsApp e e-mail\. Lembrete automático às 21:30\./);
  assert.equal(meu.acoes.cancelar.pode, true); assert.equal(meu.acoes.decidir.pode, false);
});

test('E1b-2: basta UM sócio; valor maior recusado; menor exige fundamentação; aprovado soma ao teto e a carga do Financeiro marca "carregado"', () => {
  const { a, s } = viagemEmAndamento();
  a.ok(pedir(a, s));
  const id = a.tabelas.CJU_ADITIVOS[0].ID;
  recusa(a.v('tiago', 'aditivoDecidir', { id, decisao: 'APROVAR' }), /decidido por um dos sócios/);
  recusa(a.v('gil', 'aditivoDecidir', { id, decisao: 'APROVAR' }), /decidido por um dos sócios/);
  recusa(a.v('wanessa', 'aditivoDecidir', { id, decisao: 'APROVAR' }), /decidido por um dos sócios/);
  recusa(a.v('admin', 'aditivoDecidir', { id, decisao: 'APROVAR', valor: '400,00' }), /maior que o pedido/);
  recusa(a.v('admin', 'aditivoDecidir', { id, decisao: 'APROVAR', valor: '300,00' }), /fundamentação \(15 letras ou mais\)/);
  const r = a.ok(a.v('admin', 'aditivoDecidir', { id, decisao: 'APROVAR', valor: '300,00', fundamentacao: 'Usinagem até R$ 300,00, conforme a tabela da oficina' }));
  assert.match(r.message, /aprovado \(R\$ 300,00\)/);
  recusa(a.v('dora', 'aditivoDecidir', { id, decisao: 'NEGAR', fundamentacao: 'Segunda decisão não deve passar' }), /já está "aprovado, aguardando a carga"/);
  const sol = a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id);
  assert.equal(a.ctx.Via_tetoCarga_(sol), 2960); assert.equal(a.ctx.Via_aCarregar_(sol), 300);
  assert.equal(sol.APROVADO_TOTAL, 2660, 'o aprovado da viagem não muda');
  // o técnico recebe a decisão (VG01, parado = a qualquer hora: o WhatsApp não é barrado pelo expediente)
  const nt = a.tabelas.NTF_ENVIOS.filter((x) => x.EVENTO === 'VG01' && x.USUARIO_ID === 'u_tec');
  assert.ok(nt.some((x) => x.CANAL === 'email'), 'e-mail ao técnico: ' + JSON.stringify(nt.map((x) => [x.CANAL, x.SITUACAO, x.MOTIVO])));
  assert.ok(!nt.some((x) => /Fora do expediente/.test(x.MOTIVO || '')), 'parado aguardando: não barra pelo expediente');
  // o Financeiro vê a carga a fazer (lista e pendência) com o saldo do aditivo
  assert.equal(a.ok(a.v('wanessa', 'listar', { aba: 'carga' })).itens.length, 1);
  assert.equal(a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao.acoes.carga.saldo, 300);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '301,00', data: '2026-10-27', comprovante: pdf(a) }), /passa do que falta carregar \(R\$ 300,00 de R\$ 2\.960,00 aprovados[\s\S]*com os aditivos aprovados/);
  a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '300,00', data: '2026-10-27', comprovante: pdf(a) }));
  const ad = a.tabelas.CJU_ADITIVOS[0];
  assert.equal(ad.SITUACAO, 'CARREGADO'); assert.equal(ad.CARREGADO_TOTAL, 300);
  assert.equal(a.tabelas.VIA_CARGAS[a.tabelas.VIA_CARGAS.length - 1].ADITIVO_ID, id);
  assert.ok(a.tabelas.NTF_ENVIOS.some((x) => x.EVENTO === 'VG01' && x.USUARIO_ID === 'u_tec' && /Crédito do aditivo/.test(x.ASSUNTO)));
});

test('E1b-3: lembrete aos 30 minutos uma vez; aos 60 minutos tarefa à Wanessa e ao gestor para ligar; nada é aprovado por tempo', () => {
  const { a, s } = viagemEmAndamento();
  a.ok(pedir(a, s));
  const rodar = (iso) => { a.mudar(iso); return JSON.parse(JSON.stringify(a.ctx.Adt_rodada_(new a.ctx.Date()))); };
  assert.deepEqual(rodar('2026-10-27T21:20:00-03:00'), { lembretes: 0, escalados: 0 });
  assert.equal(rodar('2026-10-27T21:31:00-03:00').lembretes, 1);
  const lemb = gs(a, 'GS12').filter((l) => /Lembrete: aditivo/.test(l.TITULO));
  assert.deepEqual(lemb.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  assert.equal(rodar('2026-10-27T21:46:00-03:00').lembretes, 0, 'uma vez só');
  assert.equal(rodar('2026-10-27T22:01:00-03:00').escalados, 1);
  assert.ok(pend(a, 'u_fin', 'FINANCEIRO').some((p) => p.tipo === 'aditivo_ligar' && /Ligar para os sócios/.test(p.titulo)), 'tarefa da Wanessa na central');
  assert.ok(pend(a, 'u_gt', 'GESTOR').some((p) => p.tipo === 'aditivo_ligar'), 'tarefa do gestor');
  assert.ok(a.emails.some((m) => /wanessa@/.test(m.to) && /Ligar para os sócios/.test(m.subject)) || gs(a, 'GS12').some((l) => l.USUARIO_ID === 'u_fin' && /Ligar/.test(l.TITULO)), 'Wanessa avisada');
  assert.equal(rodar('2026-10-28T09:00:00-03:00').escalados, 0, 'uma vez só');
  assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, 'AGUARDANDO', 'nada é aprovado por tempo');
});

test('E1b-4: à noite o aprovador só carrega como EXCEÇÃO (com motivo) e a Wanessa confere no dia seguinte; no expediente, não', () => {
  const { a, s } = viagemEmAndamento();
  a.ok(pedir(a, s));
  const id = a.tabelas.CJU_ADITIVOS[0].ID;
  a.ok(a.v('admin', 'aditivoDecidir', { id, decisao: 'APROVAR' }));
  // o dono tem a caixa de carga (todas), mas aprovou: o caminho comum recusa
  recusa(a.v('admin', 'registrarCarga', { id: s.id, valor: '350,00', data: '2026-10-27', comprovante: pdf(a) }), /que você aprovou: a carga é do Financeiro ou do outro sócio/);
  recusa(a.v('admin', 'aditivoCarga', { id, comprovante: pdf(a) }), /a carga por você é exceção\. Escreva o motivo/);
  // o outro sócio (Diretoria) pode carregar normalmente, sem exceção
  const dora = a.ok(a.v('dora', 'aditivoContexto')).aditivos.find((x) => x.id === id);
  assert.equal(dora.acoes.carga.pode, true); assert.equal(dora.acoes.carga.excecao, false);
  const r = a.ok(a.v('admin', 'aditivoCarga', { id, comprovante: pdf(a), excecaoMotivo: 'Financeiro fora do expediente e Diretoria sem acesso ao portal; técnico parado no cliente' }));
  assert.match(r.message, /marcada como exceção/);
  const ad = a.tabelas.CJU_ADITIVOS[0], carga = a.tabelas.VIA_CARGAS[a.tabelas.VIA_CARGAS.length - 1];
  assert.equal(ad.SITUACAO, 'CARREGADO'); assert.equal(ad.MESMA_PESSOA, 'SIM'); assert.equal(carga.MESMA_PESSOA, 'SIM'); assert.equal(carga.ADITIVO_ID, id); assert.equal(carga.ORIGEM, 'ADITIVO');
  assert.equal(a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id).CARREGADO_TOTAL, 3010);
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').filter((p) => p.tipo === 'aditivo_excecao').length, 1, 'a Wanessa confere');
  recusa(a.v('admin', 'aditivoConferirExcecao', { id }), /você aprovou o aditivo/);
  a.ok(a.v('wanessa', 'aditivoConferirExcecao', { id, texto: 'Comprovante do portal confere com o valor aprovado' }));
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').filter((p) => p.tipo === 'aditivo_excecao').length, 0);
  // no expediente, o aprovador não usa a exceção
  const b = viagemEmAndamento({ quando: '2026-10-27T10:00:00-03:00' });
  b.a.ok(pedir(b.a, b.s));
  const idb = b.a.tabelas.CJU_ADITIVOS[0].ID;
  b.a.ok(b.a.v('admin', 'aditivoDecidir', { id: idb, decisao: 'APROVAR' }));
  recusa(b.a.v('admin', 'aditivoCarga', { id: idb, comprovante: pdf(b.a), excecaoMotivo: 'Tentativa no expediente, deve ser recusada' }), /no expediente, a carga é do Financeiro/);
});

test('E1b-5: carga pelo Caju (API): o pedido se chama "ADT <número>/A1", leva o aditivo e, creditado, marca o aditivo como carregado', () => {
  const a = ambienteCaju();
  a.vincularEquipe();
  const s = a.aprovada();
  a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE' }));
  a.sim.avancar(5); a.ok(a.c('wanessa', 'pedidoAtualizarTodos'));
  a.mudar('2026-10-27T21:00:00-03:00');
  a.ok(pedir(a, s));
  const id = a.tabelas.CJU_ADITIVOS[0].ID;
  a.ok(a.v('dora', 'aditivoDecidir', { id, decisao: 'APROVAR' }));
  a.mudar('2026-10-28T09:00:00-03:00');
  a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id }));
  const ped = Object.values(a.sim.pedidos).pop();
  assert.equal(ped.name, 'ADT ' + s.numero + '/A1'); assert.ok(ped.name.length <= 27);
  assert.deepEqual(ped.allowances[0].amounts, [{ category: 'FLEXIBLE', amount: 35000 }]);
  assert.equal(a.tabelas.CJU_PEDIDOS[a.tabelas.CJU_PEDIDOS.length - 1].ADITIVO_ID, id);
  a.sim.avancar(5); a.ok(a.c('wanessa', 'pedidoAtualizarTodos'));
  assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, 'CARREGADO');
  const sol = a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id);
  assert.equal(sol.CARREGADO_TOTAL, 3010);
  assert.equal(a.ctx.Cju_recargaAprovada_(sol), 3010, 'a conciliação usa o mesmo teto (sem "crédito acima do aprovado")');
});

test('E1b-6: pedido de informação, resposta, negar com motivo, cancelar; parecer do gestor sem valor quando ele não vê a viagem', () => {
  const { a, s } = viagemEmAndamento({ amb: { props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_met'], FINANCEIRO: ['u_fin'] } }) } } });
  a.ok(pedir(a, s));
  const id = a.tabelas.CJU_ADITIVOS[0].ID;
  // a gestora da área (Mara, que não vê a viagem) recebe sem valor e registra o parecer
  const vm = a.ok(a.v('mara', 'aditivoContexto')).aditivos.find((x) => x.id === id);
  assert.ok(vm, 'a gestora vê o aditivo para dar o parecer');
  assert.equal(vm.valorTxt, ''); assert.equal(vm.acoes.parecer.pode, true);
  const avisoG = a.tabelas.NTF_ENVIOS.filter((x) => x.USUARIO_ID === 'u_met').concat(gs(a, 'GS12').filter((l) => l.USUARIO_ID === 'u_met').map((l) => ({ ASSUNTO: l.TITULO + ' ' + l.TEXTO })));
  assert.ok(avisoG.length, 'gestora avisada'); assert.ok(avisoG.every((x) => !/R\$/.test(String(x.ASSUNTO))), 'sem valor para quem não vê a viagem');
  recusa(a.v('mara', 'aditivoParecer', { id, parecer: 'NAO_VEJO', texto: 'não' }), /por que não vê necessidade/);
  a.ok(a.v('mara', 'aditivoParecer', { id, parecer: 'CONFIRMO', texto: 'Peça necessária para devolver a autoclave' }));
  recusa(a.v('gil', 'aditivoParecer', { id, parecer: 'CONFIRMO' }), /gestor da área de quem pediu/);
  // pedido de informação e resposta
  recusa(a.v('dora', 'aditivoDecidir', { id, decisao: 'INFO' }), /o que falta/);
  a.ok(a.v('dora', 'aditivoDecidir', { id, decisao: 'INFO', fundamentacao: 'Mande a foto do orçamento da oficina' }));
  assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, 'INFORMACAO');
  assert.ok(pend(a, 'u_tec', 'TECNICO').some((p) => p.tipo === 'aditivo_info'));
  recusa(a.v('tiago', 'aditivoComplementar', { id, texto: 'ok' }), /10 letras ou mais/);
  a.ok(a.v('tiago', 'aditivoComplementar', { id, texto: 'Segue a foto do orçamento da oficina', foto: pdf(a) }));
  const ad = a.tabelas.CJU_ADITIVOS[0];
  assert.equal(ad.SITUACAO, 'AGUARDANDO'); assert.equal(JSON.parse(ad.ANEXOS_JSON).length, 1); assert.equal(JSON.parse(ad.COMPLEMENTOS_JSON)[0].respostaInfo, true);
  assert.equal(a.ok(a.v('admin', 'aditivoContexto')).aditivos.find((x) => x.id === id).parecer.nome, 'Confirmo que é necessário');
  recusa(a.v('admin', 'aditivoDecidir', { id, decisao: 'NEGAR', fundamentacao: 'caro' }), /motivo \(15 letras ou mais\)/);
  a.ok(a.v('admin', 'aditivoDecidir', { id, decisao: 'NEGAR', fundamentacao: 'Fora do contrato do cliente, avaliar na volta' }));
  assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, 'NEGADO');
  assert.ok(a.tabelas.NTF_ENVIOS.some((x) => x.EVENTO === 'VG01' && x.USUARIO_ID === 'u_tec' && /negado/.test(x.ASSUNTO)));
  assert.equal(a.ctx.Via_aCarregar_(a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s.id)), 0, 'negado não soma ao teto');
  a.ok(pedir(a, s, { valor: '120,00', categoria: 'ALIMENTACAO_EXTRA', urgencia: 'HOJE', justificativa: 'Jantar da equipe que ficou até mais tarde no cliente' }));
  const id2 = a.tabelas.CJU_ADITIVOS[1].ID;
  recusa(a.v('paulo', 'aditivoCancelar', { id: id2, motivo: 'Não precisa mais do dinheiro' }), /é de TIAGO/);
  a.ok(a.v('tiago', 'aditivoCancelar', { id: id2, motivo: 'O cliente pagou o jantar da equipe' }));
  assert.equal(a.tabelas.CJU_ADITIVOS[1].SITUACAO, 'CANCELADO');
});

test('E1b-7: prestação com o aditivo, envio travado com aditivo aguardando, A4 de fechamento com previsto × realizado, repasse e relatórios', () => {
  const { a, s } = viagemEmAndamento();
  a.ok(pedir(a, s, { repassar: 'SIM' }));
  const id = a.tabelas.CJU_ADITIVOS[0].ID;
  const gastoAd = () => a.v('tiago', 'lancarGasto', { id: s.id, categoria: 'OUTROS', data: '2026-10-27', valor: '350,00', estabelecimento: 'Usinagem Teste', pagoCom: 'CAJU', arquivo: pdf(a), descricao: 'usinagem do eixo da bomba da autoclave', aditivoId: id });
  recusa(gastoAd(), /não foi aprovado/);
  a.mudar('2026-10-30T09:00:00-03:00');
  recusa(a.v('tiago', 'enviarPrestacao', { id: s.id }), /aditivo de recarga aguardando decisão[\s\S]*cancele o aditivo/);
  a.ok(a.v('admin', 'aditivoDecidir', { id, decisao: 'APROVAR' }));
  a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '350,00', data: '2026-10-30', comprovante: pdf(a) }));
  const t = a.ok(gastoAd());
  const it = a.tabelas.VIA_PRESTACOES.find((x) => x.ADITIVO_ID === id);
  assert.ok(it); assert.equal(it.FORA_DO_ORCADO, '', 'coberto pelo aditivo');
  assert.equal(t.solicitacao.prestacao.aditivos[0].gastoTxt, 'R$ 350,00');
  assert.equal(t.solicitacao.prestacao.itens.find((x) => x.aditivoId === id).aditivoNumero, s.numero + '/A1');
  const f = a.ok(a.v('wanessa', 'fechamento', { id: s.id }));
  assert.match(f.html, /Previsto × realizado, com os aditivos de recarga[\s\S]*Aditivo A1 · Peça[\s\S]*R\$ 3\.010,00/);
  assert.match(f.html, /\(aditivo A1\)/);
  const rp = pend(a, 'u_fin', 'FINANCEIRO').filter((p) => p.tipo === 'aditivo_repassar');
  assert.equal(rp.length, 1); assert.ok(!/R\$/.test(rp[0].titulo + rp[0].detalhe), 'tarefa de repasse sem valor');
  a.ok(a.v('wanessa', 'aditivoRepasse', { id, texto: 'Incluído no orçamento do chamado do cliente' }));
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').filter((p) => p.tipo === 'aditivo_repassar').length, 0);
  const rel = a.ok(a.v('dora', 'relatorio', { tipo: 'ADITIVOS', de: '2026-10-01', ate: '2026-10-31' }));
  assert.match(rel.html, /Aditivos pedidos[\s\S]*Por técnico e por cliente/);
  const pv = a.ctx.Adt_pecasEmViagem_('2026-10-01', '2026-10-31');
  assert.equal(pv.length, 1); assert.equal(pv[0].estabelecimento, 'Usinagem Teste');
});

test('E1b-8: política do aditivo (lembrete, tarefa e foto) com conferência; sem política, 30 e 60 minutos', () => {
  const { a } = viagemEmAndamento();
  assert.deepEqual(JSON.parse(JSON.stringify(a.ctx.Adt_politica_())), { lembreteMin: 30, escalarMin: 60, fotoAcimaDe: null });
  const POL = { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {} };
  recusa(a.v('dora', 'salvarPolitica', { politica: Object.assign({ aditivoLembreteMin: '2' }, POL), motivo: 'teste do aditivo de recarga' }), /de 5 a 240/);
  recusa(a.v('dora', 'salvarPolitica', { politica: Object.assign({ aditivoLembreteMin: '30', aditivoEscalarMin: '20' }, POL), motivo: 'teste do aditivo de recarga' }), /maior que o lembrete/);
  a.ok(a.v('dora', 'salvarPolitica', { politica: Object.assign({ aditivoLembreteMin: '20', aditivoEscalarMin: '45', aditivoFotoAcimaDe: '500,00' }, POL), motivo: 'tempos do aditivo decididos' }));
  a.rodar('VIA_POLITICA_MEMO = null;');
  assert.deepEqual(JSON.parse(JSON.stringify(a.ctx.Adt_politica_())), { lembreteMin: 20, escalarMin: 45, fotoAcimaDe: 500 });
});

test('E1b-9: "pode ser decidido hoje" pedido à noite: os sócios recebem na abertura do expediente; o lembrete conta a partir daí', () => {
  const { a, s } = viagemEmAndamento();
  const r = a.ok(pedir(a, s, { urgencia: 'HOJE' }));
  assert.match(r.message, /recebem o aviso na abertura do expediente, porque você marcou que pode ser decidido hoje/);
  assert.equal(gs(a, 'GS12').length, 0, 'nada à noite');
  const rodar = (iso) => { a.mudar(iso); return JSON.parse(JSON.stringify(a.ctx.Adt_rodada_(new a.ctx.Date()))); };
  assert.equal(rodar('2026-10-27T23:00:00-03:00').escalados, 0, 'sem tarefa de madrugada: a contagem só começa com o aviso');
  const m = rodar('2026-10-28T08:05:00-03:00');
  assert.equal(m.avisados, 1);
  assert.deepEqual(gs(a, 'GS12').filter((l) => /^Aditivo de recarga/.test(l.TITULO)).map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  assert.equal(rodar('2026-10-28T08:20:00-03:00').lembretes, 0);
  assert.equal(rodar('2026-10-28T08:36:00-03:00').lembretes, 1);
});
