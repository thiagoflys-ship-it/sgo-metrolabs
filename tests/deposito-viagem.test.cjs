// Depósito de viagem, etapa 1 (11/11/2026, decisões do dono): solicitação discriminada com o total pela soma, anexos obrigatórios,
// centro de custo, relatório A4 com revisão, aprovação do Matheus (GS05 pela fila da gestão; urgente a qualquer hora), Diretoria
// nas exceções, ninguém aprova a si mesmo, revisão nova depois da aprovação, carga no cartão Caju registrada pelo Financeiro com
// comprovante e nunca acima do aprovado, caixas de acesso (lote 12), tetos vazios e preenchidos, tela na página completa.
// Código real do SGO+ (tests/_viagem_ambiente.cjs); nada sai de verdade; dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, solicitacaoBase, criarCompleta, PASTA } = require('./_viagem_ambiente.cjs');

const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const recusa = (r, re) => { assert.equal(r.ok, false, 'esperava recusa'); if (re) assert.match(r.message, re); return r; };
const gs05 = (a) => (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS05');
const emailsPara = (a, quem) => a.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
const solic = (a, id) => a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === id);

// ------------------------------------------------------------------ 1. total pela soma
test('total sai da soma das linhas; total digitado diferente é recusado; base de cálculo em cada linha', () => {
  const a = ambiente();
  const s = criarCompleta(a);
  assert.equal(s.totalCalculado, 2660);
  assert.equal(s.totalCalculadoTxt, 'R$ 2.660,00');
  assert.equal(solic(a, s.id).TOTAL, 2660);
  const hotel = s.linhas.find((l) => l.id === 'Lhotel');
  assert.equal(hotel.valor, 1500); assert.equal(hotel.base, '2 quartos × 3 noites × R$ 250,00');
  assert.equal(s.linhas.find((l) => l.id === 'Lcomb').base, '600 km ÷ 10 km/L × R$ 6,00 por litro');
  // total digitado que não bate com a soma: recusado, nada muda
  recusa(a.v('gil', 'salvar', Object.assign(solicitacaoBase(a), { id: s.id, total: '9.999,00' })), /o total não é digitado[\s\S]*R\$ 2\.660,00/);
  assert.equal(solic(a, s.id).TOTAL, 2660);
  recusa(a.v('gil', 'enviar', { id: s.id, total: 100 }), /total não é digitado/);
  // igual à soma: aceito (e continua sendo a soma)
  a.ok(a.v('gil', 'salvar', Object.assign(solicitacaoBase(a), { id: s.id, total: '2.660,00' })));
  // mudar uma linha muda o total
  const mais = solicitacaoBase(a, { id: s.id }); mais.linhas[1].q2 = 5;
  assert.equal(a.ok(a.v('gil', 'salvar', mais)).solicitacao.totalCalculado, 2860);
});

// ------------------------------------------------------------------ 2. anexos e checklist
test('anexo obrigatório no hotel, na passagem e em "Outros"; cada categoria com linha ou "não se aplica"; centro de custo obrigatório', () => {
  const a = ambiente();
  const base = solicitacaoBase(a);
  base.linhas.push({ id: 'Lout', categoria: 'OUTROS', q1: 1, unitario: '80', descricao: 'Lavanderia', justificativa: 'curta' });
  const r = a.ok(a.v('gil', 'salvar', base)).solicitacao;
  assert.ok(r.faltas.some((f) => /Hospedagem: anexe o orçamento ou o print \(do hotel/.test(f)), r.faltas.join(' | '));
  assert.ok(r.faltas.some((f) => /Outros: escreva a justificativa \(20 letras/.test(f)));
  assert.ok(r.faltas.some((f) => /Outros: anexe o orçamento/.test(f)));
  recusa(a.v('gil', 'enviar', { id: r.id }), /Não foi possível enviar[\s\S]*Hospedagem: anexe/);
  // passagem sem anexo também trava
  const b2 = solicitacaoBase(a, { id: r.id }); delete b2.naoSeAplica.PASSAGENS; b2.linhas.push({ id: 'Lpas', categoria: 'PASSAGENS', q1: 1, unitario: '900', descricao: 'GYN-GIG ida e volta' });
  assert.ok(a.ok(a.v('gil', 'salvar', b2)).solicitacao.faltas.some((f) => /Passagens: anexe o orçamento ou o print \(da cotação/.test(f)));
  // categoria sem linha e sem "não se aplica"
  const b3 = solicitacaoBase(a); delete b3.naoSeAplica.PEDAGIO; b3.centroCustoId = '';
  const r3 = a.ok(a.v('gil', 'salvar', b3)).solicitacao;
  assert.ok(r3.faltas.some((f) => /Pedágio: inclua a linha ou marque "Não se aplica"/.test(f)));
  assert.ok(r3.faltas.some((f) => /Escolha o centro de custo \(obrigatório/.test(f)));
  a.ok(a.v('gil', 'anexar', { id: r3.id, linhaId: 'Lhotel', arquivo: a.pdf() }));
  recusa(a.v('gil', 'enviar', { id: r3.id }), /centro de custo/);
  // arquivo que não é PDF nem imagem
  recusa(a.v('gil', 'anexar', { id: r3.id, linhaId: 'Lhotel', arquivo: { nome: 'planilha.exe', tipo: 'x', base64: 'AAAA' } }), /PDF ou imagem/);
  // com o anexo do hotel, a primeira solicitação (sem "Outros") fica pronta
  const ok = criarCompleta(a);
  assert.deepEqual(ok.faltas, []);
  assert.equal(ok.linhas.find((l) => l.id === 'Lhotel').anexos.length, 1);
});

test('centros de custo: lista inicial por unidade e área (CAD_AREAS), mais Frota e Sede; só Diretoria e Financeiro alteram', () => {
  const a = ambiente();
  const c = a.ok(a.v('gil', 'centros'));
  const cod = c.centros.map((x) => x.codigo);
  for (const k of ['GO-TECNICA', 'GO-METROLOGIA', 'RJ-TECNICA', 'RJ-METROLOGIA', 'GO-FROTA', 'RJ-FROTA', 'GO-SEDE', 'RJ-SEDE', 'GO-COMERCIAL', 'RJ-FINANCEIRO']) assert.ok(cod.includes(k), k);
  assert.equal(cod.length, 2 * (9 + 2));
  assert.equal(c.podeAlterar, false);
  recusa(a.v('gil', 'salvarCentro', { codigo: 'GO-TESTE', nome: 'Teste', motivo: 'teste de permissão' }), /permissão «Manter os centros de custo»/);
  const n = a.ok(a.v('wanessa', 'salvarCentro', { codigo: 'GO-EVENTOS', nome: 'Goiânia · Eventos', unidade: 'GO', motivo: 'Feira anual de engenharia clínica' }));
  assert.ok(n.centros.some((x) => x.codigo === 'GO-EVENTOS'));
  recusa(a.v('dora', 'salvarCentro', { codigo: 'GO-EVENTOS', nome: 'Repetido', motivo: 'repetido de propósito' }), /já existe/);
  const ev = n.centros.find((x) => x.codigo === 'GO-EVENTOS');
  a.ok(a.v('dora', 'salvarCentro', { id: ev.id, nome: 'Goiânia · Eventos', ativo: 'NAO', motivo: 'feira cancelada' }));
  assert.ok(!a.v('gil', 'opcoes').centros.some((x) => x.codigo === 'GO-EVENTOS'), 'inativo some da escolha');
  assert.ok(a.tabelas.VIA_HISTORICO.some((h) => h.ENTIDADE === 'CENTRO' && h.ACAO === 'CENTRO_ALTERADO' && /feira cancelada/.test(h.TEXTO)));
  // Compras continua com o texto livre (nada migrado)
  assert.match(ler('SGO_Compras_Informar.js'), /CENTRO_CUSTO/);
});

// ------------------------------------------------------------------ 3. relatório A4
test('relatório A4: prévia do rascunho; revisão 00 com as linhas, a base de cálculo, os anexos e a marca do conteúdo', () => {
  const a = ambiente();
  const s = criarCompleta(a);
  const previa = a.ok(a.v('gil', 'documento', { id: s.id })).html;
  assert.match(previa, /Prévia\./);
  assert.match(previa, /não autoriza carga no cartão/);
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  const h = a.ok(a.v('gil', 'documento', { id: s.id })).html;
  assert.match(h, /^<!DOCTYPE html>/);
  assert.match(h, /Solicitação de depósito de viagem/);
  assert.match(h, /VIA-2026-0001 · Revisão 00/);
  assert.match(h, /Página " counter\(page\) " de " counter\(pages\)/);
  assert.match(h, /2 quartos × 3 noites × R\$ 250,00/);
  assert.match(h, /600 km ÷ 10 km\/L × R\$ 6,00 por litro/);
  assert.match(h, /R\$ 2\.660,00/);
  assert.match(h, /hotel\.pdf/);
  assert.match(h, /viagem de carro/, 'motivo do "não se aplica"');
  assert.match(h, /Aguardando a decisão de quem aprova/);
  assert.match(h, /SHA-256\): [0-9a-f]{64}/);
  assert.doesNotMatch(h, /Prévia\./);
  // quem não pode ver a solicitação não abre o A4
  recusa(a.v('mara', 'documento', { id: s.id }), /Não foi possível abrir a solicitação VIA-2026-0001/);
  // quem viaja abre
  a.ok(a.v('tiago', 'documento', { id: s.id }));
});

// ------------------------------------------------------------------ 4. aviso GS05 e aprovação do Matheus
test('envio avisa o Matheus (GS05) na hora dentro do expediente; aprovação com fundamentação; quem pediu e o Financeiro são avisados', () => {
  const a = ambiente();
  const s = criarCompleta(a);
  const e = a.ok(a.v('gil', 'enviar', { id: s.id }));
  assert.equal(e.solicitacao.situacao, 'AGUARDANDO_APROVACAO');
  assert.match(e.message, /enviada para aprovação de MATHEUS GERENTE TESTE/);
  const g = gs05(a);
  assert.deepEqual(g.map((l) => l.USUARIO_ID), ['u_mat'], 'só o aprovador, nunca quem pediu');
  assert.equal(g[0].SITUACAO, 'ENVIADO');
  assert.equal(emailsPara(a, 'matheus').length, 1);
  assert.match(emailsPara(a, 'matheus')[0].body, /O que você aprova: a solicitação VIA-2026-0001 revisão 0, total R\$ 2\.660,00/);
  assert.ok(a.whats.some((w) => w.corpo && w.corpo.to === '5562999990030'), 'WhatsApp da gestão');
  // a regra GS05 está na matriz, como GS01/GS04: e-mail e WhatsApp NAO (a fila da gestão envia por outro caminho)
  const regra = a.ctx.SGO_avisoRegra_('GS05');
  assert.equal(regra.email, 'NAO'); assert.equal(regra.whatsapp, 'NAO'); assert.equal(regra.gestao, 'PENDENCIA'); assert.equal(regra.modulo, 'viagem');
  // fundamentação obrigatória
  recusa(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'ok' }), /fundamentação \(15 letras/);
  // quem não é aprovador não decide
  recusa(a.v('wanessa', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'valores dentro do praticado' }), /aprovador da política/);
  const d = a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde', revisao: 0 }));
  assert.equal(d.solicitacao.situacao, 'APROVADA');
  assert.equal(d.solicitacao.aprovacao.valida, true); assert.equal(d.solicitacao.aprovacao.total, 2660);
  assert.equal(emailsPara(a, 'gil').length, 1, 'quem pediu é avisado');
  assert.match(emailsPara(a, 'gil')[0].body, /aprovada por MATHEUS GERENTE TESTE[\s\S]*Fundamentação: Valores dentro do praticado/);
  assert.ok(emailsPara(a, 'wanessa').some((m) => /Carga a fazer no cartão Caju/.test(m.subject)), 'Financeiro avisado da carga');
  const dec = a.tabelas.VIA_DECISOES[0];
  assert.deepEqual([dec.ETAPA, dec.DECISAO, dec.POR_ID, Number(dec.REVISAO)], ['GERENCIA', 'APROVAR', 'u_mat', 0]);
  const h = a.ok(a.v('gil', 'documento', { id: s.id })).html;
  assert.match(h, /Aprovado pela gerência/); assert.match(h, /Valores dentro do praticado em Rio Verde/); assert.match(h, /Total aprovado/);
});

test('fora do expediente: gestor recebe na abertura do próximo dia útil; urgente (menos de 2 dias úteis) sai na hora', () => {
  // sexta 20:00: sem urgência, o aviso fica na fila até segunda 08:00
  const a = ambiente({ agora: Date.parse('2026-10-23T20:00:00-03:00') });
  const s = criarCompleta(a, 'gil', { saidaEm: '2026-11-03T07:00', chegadaEm: '2026-11-05T18:00' });
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  let g = gs05(a);
  assert.equal(g.length, 1); assert.equal(g[0].SITUACAO, 'NA_FILA'); assert.equal(g[0].LIBERAR_EM, '2026-10-26T08:00:00');
  assert.equal(emailsPara(a, 'matheus').length, 0, 'nada à noite para o gestor');
  // urgente: viagem na segunda (1 dia útil): sai já, mesmo às 20:00 de sexta
  const b = ambiente({ agora: Date.parse('2026-10-23T20:00:00-03:00') });
  const u = criarCompleta(b, 'gil', { saidaEm: '2026-10-26T07:00', chegadaEm: '2026-10-28T18:00' });
  assert.ok(u.apontamentos.some((x) => x.codigo === 'URGENTE'));
  const eu = b.ok(b.v('gil', 'enviar', { id: u.id }));
  assert.match(eu.message, /Urgente: o aviso saiu na hora/);
  g = gs05(b);
  assert.equal(g[0].SITUACAO, 'ENVIADO'); assert.equal(g[0].ORIGEM, 'APROVACAO_URGENTE');
  assert.equal(emailsPara(b, 'matheus').length, 1);
  assert.match(emailsPara(b, 'matheus')[0].subject, /URGENTE · Aprovação · Depósito de viagem/);
  // a rodada da gestão às 20:15 não manda o não urgente de outra solicitação
  b.mudar('2026-10-23T20:15:00-03:00');
  b.ctx.SGO_avisosGestaoRodada_(new b.ctx.Date());
  assert.equal(emailsPara(b, 'matheus').length, 1);
});

test('Matheus nega ou devolve com fundamentação; devolvida volta para quem pediu ajustar e reenviar', () => {
  const a = ambiente();
  const s = criarCompleta(a);
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  const dv = a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'DEVOLVER', fundamentacao: 'Troque o hotel por um mais perto do cliente' }));
  assert.equal(dv.solicitacao.situacao, 'DEVOLVIDA');
  assert.equal(dv.solicitacao.acoes.editar.pode, false, 'Matheus não edita');
  const doGil = a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao;
  assert.equal(doGil.acoes.enviar.pode, true);
  // reenviar sem mudar: mesma revisão
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  assert.equal(solic(a, s.id).REVISAO, 0);
  const n = a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'NEGAR', fundamentacao: 'Viagem desnecessária: o cliente adiou a visita' }));
  assert.equal(n.solicitacao.situacao, 'NEGADA');
  recusa(a.v('gil', 'salvar', solicitacaoBase(a, { id: s.id })), /não muda mais/);
  assert.match(emailsPara(a, 'gil').pop().body, /negada por MATHEUS[\s\S]*cliente adiou/);
});

// ------------------------------------------------------------------ 5. Diretoria e "ninguém aprova a si mesmo"
test('Matheus pedindo ou viajando: vai direto à Diretoria; ele nunca aprova a própria', () => {
  const a = ambiente();
  // Matheus solicitante
  const s = criarCompleta(a, 'matheusgodoi', { centroCustoId: a.v('gil', 'opcoes').centros.find((c) => c.codigo === 'GO-QUALIDADE').id });
  const e = a.ok(a.v('matheusgodoi', 'enviar', { id: s.id }));
  assert.equal(e.solicitacao.situacao, 'AGUARDANDO_DIRETORIA');
  assert.match(e.solicitacao.motivosDiretoria, /MATHEUS GERENTE TESTE pediu \(ninguém aprova a própria despesa\)/);
  assert.deepEqual(gs05(a).map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  recusa(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Aprovando a minha própria viagem' }), /ninguém aprova a própria despesa/);
  a.ok(a.v('dora', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Auditoria interna necessária nesta semana' }));
  assert.equal(solic(a, s.id).SITUACAO, 'APROVADA');
  // Matheus viajando (pedido do Gil)
  const b = ambiente();
  const v = criarCompleta(b, 'gil', { equipe: [{ id: 'u_tec', funcao: 'TECNICO' }, { id: 'u_mat', funcao: 'GESTOR' }] });
  b.ok(b.v('gil', 'enviar', { id: v.id }));
  assert.equal(solic(b, v.id).SITUACAO, 'AGUARDANDO_DIRETORIA');
  recusa(b.v('matheusgodoi', 'decidir', { id: v.id, decisao: 'APROVAR', fundamentacao: 'Aprovando a viagem em que vou' }), /Você viaja nesta solicitação/);
  // Diretoria que viaja também não aprova (o dono sim)
  const c = ambiente();
  const w = criarCompleta(c, 'gil', { equipe: [{ id: 'u_tec', funcao: 'TECNICO' }, { id: 'u_dir', funcao: 'OUTRO' }] });
  c.ok(c.v('gil', 'enviar', { id: w.id }));
  c.ok(c.v('matheusgodoi', 'decidir', { id: w.id, decisao: 'APROVAR', fundamentacao: 'Dentro do praticado' }));
  assert.equal(solic(c, w.id).SITUACAO, 'APROVADA', 'Diretoria viajando não muda a etapa da gerência');
  // o próprio dono: pede, não aprova
  const d = ambiente();
  const x = criarCompleta(d, 'admin');
  d.ok(d.v('admin', 'enviar', { id: x.id }));
  recusa(d.v('admin', 'decidir', { id: x.id, decisao: 'APROVAR', fundamentacao: 'Aprovando o meu próprio pedido' }), /ninguém aprova a própria despesa/);
});

test('total acima do limite (R$ 5.000,00): Matheus aprova e sobe à Diretoria; a Diretoria tem de ser outra pessoa', () => {
  const a = ambiente();
  const base = solicitacaoBase(a); base.linhas[0].unitario = '700,00'; // 2 × 3 × 700 = 4.200 + 800 + 360 = 5.360
  const s = a.ok(a.v('gil', 'salvar', base)).solicitacao;
  a.ok(a.v('gil', 'anexar', { id: s.id, linhaId: 'Lhotel', arquivo: a.pdf() }));
  const e = a.ok(a.v('gil', 'enviar', { id: s.id }));
  assert.equal(e.solicitacao.situacao, 'AGUARDANDO_APROVACAO');
  assert.match(e.message, /Depois ela vai também à Diretoria: total de R\$ 5\.360,00 acima do limite da política \(R\$ 5\.000,00\)/);
  recusa(a.v('dora', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Diretoria aprovando antes da gerência' }), /aprovador da política/);
  const m = a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Hotel caro, mas é o único na cidade' }));
  assert.equal(m.solicitacao.situacao, 'AGUARDANDO_DIRETORIA');
  assert.deepEqual(gs05(a).filter((l) => /DIR/.test(l.REF_ID)).map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  recusa(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Tentando aprovar a etapa da Diretoria' }), /etapa é da Diretoria/);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '100', data: '2026-10-19', comprovante: a.pdf('c.pdf') }), /Só depois da aprovação/);
  const d = a.ok(a.v('dora', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'De acordo com a gerência' }));
  assert.equal(d.solicitacao.situacao, 'APROVADA');
  assert.equal(d.solicitacao.decisoes.length, 2);
  const h = a.ok(a.v('dora', 'documento', { id: s.id })).html;
  assert.match(h, /Aprovado pela Diretoria/); assert.match(h, /Aprovado pela gerência/);
});

// ------------------------------------------------------------------ 6. revisão nova depois da aprovação
test('mudança depois de aprovada: aprovação cai, volta a rascunho, revisão 01 pede o que mudou e nova aprovação; carga só depois', () => {
  const a = ambiente();
  const s = criarCompleta(a);
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' }));
  // salvar sem mudar nada: continua aprovada
  assert.equal(a.ok(a.v('gil', 'salvar', solicitacaoBase(a, { id: s.id }))).solicitacao.situacao, 'APROVADA');
  const mud = solicitacaoBase(a, { id: s.id }); mud.linhas[1].q2 = 5;
  const r = a.ok(a.v('gil', 'salvar', mud));
  assert.equal(r.solicitacao.situacao, 'RASCUNHO');
  assert.match(r.message, /a aprovação deixou de valer/);
  assert.equal(r.solicitacao.aprovacao.valida, false);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '100', data: '2026-10-19', comprovante: a.pdf('c.pdf') }), /espere a nova aprovação/);
  assert.equal(r.solicitacao.proximaRevisao.numero, 1); assert.equal(r.solicitacao.proximaRevisao.pedeMotivo, true);
  recusa(a.v('gil', 'enviar', { id: s.id }), /é a revisão 1[\s\S]*Escreva o que mudou/);
  a.ok(a.v('gil', 'enviar', { id: s.id, motivoRevisao: 'Um dia a mais de alimentação' }));
  assert.equal(solic(a, s.id).REVISAO, 1);
  assert.equal(a.tabelas.VIA_REVISOES.length, 2);
  assert.ok(gs05(a).length >= 2, 'nova aprovação avisada');
  a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'De acordo com o dia a mais', revisao: 1 }));
  const fim = a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao;
  assert.equal(fim.aprovacao.revisao, '1'); assert.equal(fim.aprovacao.total, 2860);
  // o A4 da revisão 00 continua disponível e diz que foi substituída
  const h0 = a.ok(a.v('gil', 'documento', { id: s.id, revisao: 0 })).html;
  assert.match(h0, /Revisão substituída pela revisão 1/); assert.match(h0, /R\$ 2\.660,00/);
  const h1 = a.ok(a.v('gil', 'documento', { id: s.id })).html;
  assert.match(h1, /O que mudou nesta revisão:<\/b> Um dia a mais de alimentação/); assert.match(h1, /R\$ 2\.860,00/);
  // anexo novo depois da aprovação também derruba a aprovação
  a.ok(a.v('gil', 'anexar', { id: s.id, linhaId: 'Lhotel', arquivo: a.pdf('segundo-orcamento.pdf') }));
  assert.equal(solic(a, s.id).SITUACAO, 'RASCUNHO');
  // decisão com a tela desatualizada (revisão antiga) é recusada
  a.ok(a.v('gil', 'enviar', { id: s.id, motivoRevisao: 'Segundo orçamento de hotel anexado' }));
  recusa(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Aprovando pela tela antiga', revisao: 1 }), /mudou para a revisão 2/);
});

// ------------------------------------------------------------------ 7. carga no cartão Caju
test('Financeiro registra a carga com comprovante, nunca acima do aprovado; parcial pede motivo; quem aprovou ou viaja não registra', () => {
  const a = ambiente();
  const s = criarCompleta(a);
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' }));
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19' }), /anexe o comprovante da carga/);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,01', data: '2026-10-19', comprovante: a.pdf('caju.pdf') }), /passa do que falta carregar \(R\$ 2\.660,00/);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '1.000,00', data: '2026-10-19', comprovante: a.pdf('caju.pdf') }), /carga é parcial/);
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '100', data: '2026-10-25', comprovante: a.pdf('caju.pdf') }), /é futura/);
  recusa(a.v('gil', 'registrarCarga', { id: s.id, valor: '100', data: '2026-10-19', comprovante: a.pdf('caju.pdf') }), /registrada pelo Financeiro/);
  // o aprovador com a caixa do Financeiro (por exceção) não registra a carga do que aprovou
  a.props.OMIE_SIGILO_CONTAS = JSON.stringify(JSON.parse(a.props.OMIE_SIGILO_CONTAS).concat('u_mat')); // 16/11/2026: caixa do Financeiro só para a lista de sigilo
  a.ok(a.ctx.Poderes_api('s_admin', 'salvar', { usuarioId: 'u_mat', motivo: 'teste de separação de funções', mudancas: [{ codigo: 'VIAGEM_DEPOSITAR', valor: 'SIM' }] }));
  recusa(a.v('matheusgodoi', 'registrarCarga', { id: s.id, valor: '100', data: '2026-10-19', comprovante: a.pdf('caju.pdf') }), /quem aprova não registra a carga/);
  const p = a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '1.000,00', data: '2026-10-19', centroCustoCaju: 'GO-TECNICA', observacao: 'Limite diário do portal do Caju', comprovante: a.pdf('caju-1.pdf') }));
  assert.equal(p.solicitacao.situacao, 'CARGA_FEITA'); assert.match(p.message, /Falta carregar R\$ 1\.660,00/);
  assert.ok(emailsPara(a, 'tiago').some((m) => /Carga no cartão Caju/.test(m.subject)), 'responsável pelo dinheiro avisado');
  recusa(a.v('fabio', 'registrarCarga', { id: s.id, valor: '1.660,01', data: '2026-10-19', comprovante: a.pdf('caju-2.pdf') }), /passa do que falta carregar \(R\$ 1\.660,00/);
  const t = a.ok(a.v('fabio', 'registrarCarga', { id: s.id, valor: '1.660,00', data: '2026-10-19', comprovante: a.pdf('caju-2.pdf') }));
  assert.match(t.message, /todo carregado/);
  assert.equal(t.solicitacao.carregado, 2660);
  assert.equal(a.tabelas.VIA_CARGAS.length, 2);
  assert.ok(a.tabelas.VIA_CARGAS.every((g) => g.COMPROVANTE_ID && g.COMPROVANTE_URL));
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '1', data: '2026-10-19', comprovante: a.pdf('x.pdf') }), /já foi todo carregado/);
  recusa(a.v('gil', 'cancelar', { id: s.id, motivo: 'cliente cancelou a visita' }), /Já houve carga no cartão/);
  const h = a.ok(a.v('wanessa', 'documento', { id: s.id })).html;
  assert.match(h, /Carga registrada \(Financeiro\)/); assert.match(h, /caju-1\.pdf/);
  // Wanessa viajando: outra pessoa do Financeiro registra
  const b = ambiente();
  const v = criarCompleta(b, 'gil', { equipe: [{ id: 'u_fin', funcao: 'OUTRO' }], responsavelId: 'u_fin' });
  b.ok(b.v('gil', 'enviar', { id: v.id }));
  b.ok(b.v('matheusgodoi', 'decidir', { id: v.id, decisao: 'APROVAR', fundamentacao: 'Visita ao banco do cliente' }));
  recusa(b.v('wanessa', 'registrarCarga', { id: v.id, valor: '2.660,00', data: '2026-10-19', comprovante: b.pdf() }), /carga do seu próprio cartão/);
  b.ok(b.v('fabio', 'registrarCarga', { id: v.id, valor: '2.660,00', data: '2026-10-19', comprovante: b.pdf() }));
});

// ------------------------------------------------------------------ 8. perfis sem poder
test('perfis sem a caixa recebem recusa clara (o quê, por quê, o que fazer); cliente fora do módulo; técnico vê a viagem em que está', () => {
  const a = ambiente();
  recusa(a.v('tiago', 'salvar', solicitacaoBase(a)), /Não foi possível montar a solicitação[\s\S]*«Montar solicitação de depósito de viagem»[\s\S]*gestor da área/);
  recusa(a.v('mara', 'salvar', solicitacaoBase(a)), /«Montar solicitação de depósito de viagem»/);
  recusa(a.v('tiago', 'listar', { aba: 'carga' }), /é do Financeiro[\s\S]*Minhas solicitações/);
  recusa(a.v('tiago', 'listar', { aba: 'todas' }), /«Ver todas as solicitações de viagem»/);
  recusa(a.v('gil', 'salvarPolitica', { politica: {}, motivo: 'mudança qualquer' }), /«Alterar a política de viagem»[\s\S]*Diretoria/);
  recusa(a.v('hcli', 'iniciar'), /equipe interna/);
  const s = criarCompleta(a);
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  recusa(a.v('tiago', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'eu aprovo a minha viagem' }), /Você viaja/);
  recusa(a.v('mara', 'abrir', { id: s.id }), /é de quem pediu, de quem viaja, de quem aprova e do Financeiro/);
  const minhas = a.ok(a.v('tiago', 'listar', { aba: 'minhas' })).itens;
  assert.equal(minhas.length, 1);
  const t = a.ok(a.v('tiago', 'abrir', { id: s.id })).solicitacao;
  assert.equal(t.acoes.editar.pode, false); assert.match(t.acoes.editar.motivo, /Só quem pediu/);
  // a lista "Aguardando minha decisão" mostra só o que a pessoa pode decidir
  assert.equal(a.ok(a.v('matheusgodoi', 'listar', { aba: 'decidir' })).itens.length, 1);
  assert.equal(a.ok(a.v('dora', 'listar', { aba: 'decidir' })).itens.length, 0);
  // caixas efetivas de cada papel
  const pod = (l) => a.ok(a.v(l, 'iniciar')).poderes;
  assert.equal(pod('gil').VIAGEM_SOLICITAR, true); assert.equal(pod('tiago').VIAGEM_SOLICITAR, false);
  assert.equal(pod('matheusgodoi').VIAGEM_APROVAR, true); assert.equal(pod('gil').VIAGEM_APROVAR, false);
  assert.equal(pod('dora').VIAGEM_APROVAR_DIRETORIA, true); assert.equal(pod('matheusgodoi').VIAGEM_APROVAR_DIRETORIA, false);
  assert.equal(pod('wanessa').VIAGEM_DEPOSITAR, true); assert.equal(pod('gil').VIAGEM_DEPOSITAR, false);
  assert.equal(pod('dora').VIAGEM_POLITICA, true); assert.equal(pod('wanessa').VIAGEM_POLITICA, false);
  assert.equal(pod('wanessa').VIAGEM_CENTRO_CUSTO, true); assert.equal(pod('gil').VIAGEM_CENTRO_CUSTO, false);
  assert.equal(pod('wanessa').VIAGEM_SOLICITAR, true, 'responsável de área (Regras e responsáveis) também monta');
  const tudo = pod('admin'); assert.ok(Object.values(tudo).every(Boolean), 'o dono tem todas');
});

test('caixas no motor (lote 12): no catálogo e ligadas com o módulo; exceção gravada em Acessos vale; aprovador por configuração', () => {
  const a = ambiente();
  const cat = a.ctx.SGO_poderesCatalogo_();
  const v = cat.lista.filter((p) => p.modulo === 'Depósito de viagem');
  assert.deepEqual(Array.from(v, (p) => p.codigo), ['VIAGEM_SOLICITAR', 'VIAGEM_VER_TODAS', 'VIAGEM_APROVAR', 'VIAGEM_APROVAR_DIRETORIA', 'VIAGEM_DEPOSITAR', 'VIAGEM_CONFERIR', 'VIAGEM_POLITICA', 'VIAGEM_CENTRO_CUSTO']);
  assert.ok(v.every((p) => p.ligado && p.lote === 12));
  assert.equal(cat.lista.length, 158, '150 do catálogo congelado + 8 do lote 12 (E2: VIAGEM_CONFERIR)');
  // sem o módulo, o catálogo do lote 0 fica como era (150)
  const b = ambiente({ semArquivos: ['SGO_Viagem.js', 'SGO_Viagem_Documento.js', 'SGO_Viagem_Painel.js', 'SGO_Viagem_Prestacao.js', 'SGO_Viagem_Fechamento.js'] });
  assert.equal(b.ctx.SGO_poderesCatalogo_().lista.length, 150);
  // exceção: tirar VIAGEM_APROVAR do Matheus -> ninguém da gerência -> Diretoria
  a.ok(a.ctx.Poderes_api('s_admin', 'salvar', { usuarioId: 'u_mat', motivo: 'Matheus de férias em novembro', mudancas: [{ codigo: 'VIAGEM_APROVAR', valor: 'NAO' }] }));
  const s = criarCompleta(a);
  const e = a.ok(a.v('gil', 'enviar', { id: s.id }));
  assert.equal(e.solicitacao.situacao, 'AGUARDANDO_DIRETORIA');
  recusa(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Aprovando sem a caixa' }), /Esta etapa é da Diretoria/);
  // aprovador por configuração: a Diretoria troca o aprovador na política
  const c = ambiente();
  c.ok(c.v('dora', 'salvarPolitica', { politica: { aprovadores: ['u_gt'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {} }, motivo: 'Gil aprova enquanto o Matheus viaja' }));
  assert.equal(c.ok(c.v('gil', 'iniciar')).poderes.VIAGEM_APROVAR, true);
  assert.equal(c.ok(c.v('matheusgodoi', 'iniciar')).poderes.VIAGEM_APROVAR, false);
  const w = criarCompleta(c, 'wanessa');
  c.ok(c.v('wanessa', 'enviar', { id: w.id }));
  assert.deepEqual(gs05(c).map((l) => l.USUARIO_ID), ['u_gt']);
  c.ok(c.v('gil', 'decidir', { id: w.id, decisao: 'APROVAR', fundamentacao: 'Aprovação pelo substituto configurado' }));
  assert.equal(solic(c, w.id).SITUACAO, 'APROVADA');
});

// ------------------------------------------------------------------ 9. tetos da política
test('tetos começam vazios e não bloqueiam; preenchidos, acima do teto exige justificativa e sobe à Diretoria', () => {
  const a = ambiente();
  const pol = a.ok(a.v('gil', 'politica'));
  assert.equal(pol.politica.semTetos, true); assert.equal(pol.politica.versao, 0); assert.equal(pol.politica.limiteDiretoria, 5000); assert.equal(pol.politica.urgenteDiasUteis, 2);
  assert.equal(pol.politica.aprovadores[0].nome, 'MATHEUS GERENTE TESTE');
  assert.ok(pol.politica.tetos.every((t) => t.valor === null));
  const s0 = criarCompleta(a);
  assert.deepEqual(s0.faltas, []);
  assert.ok(s0.apontamentos.some((x) => x.codigo === 'SEM_TETOS' && x.tipo === 'INFO'));
  // validação da gravação
  recusa(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5000', urgenteDiasUteis: 2, tetos: { HOSPEDAGEM: 'abc' } }, motivo: 'teto inválido de teste' }), /teto de Hospedagem/);
  recusa(a.v('dora', 'salvarPolitica', { politica: { aprovadores: [], limiteDiretoria: '5000', urgenteDiasUteis: 2 }, motivo: 'sem aprovador nenhum' }), /pelo menos um aprovador/);
  recusa(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5000', urgenteDiasUteis: 2 }, motivo: 'curto' }), /motivo da mudança/);
  const g = a.ok(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: { HOSPEDAGEM: '200,00' } }, motivo: 'Teto de hotel decidido pela Diretoria' }));
  assert.match(g.message, /versão 1/);
  assert.equal(g.versoes.length, 1);
  const s = a.ok(a.v('gil', 'salvar', solicitacaoBase(a, { saidaEm: '2026-11-09T07:00', chegadaEm: '2026-11-12T18:00' }))).solicitacao;
  a.ok(a.v('gil', 'anexar', { id: s.id, linhaId: 'Lhotel', arquivo: a.pdf() }));
  const r = a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao;
  assert.ok(r.faltas.some((f) => /R\$ 250,00 passa do teto da política \(R\$ 200,00 diária por quarto\)/.test(f)), r.faltas.join(' | '));
  recusa(a.v('gil', 'enviar', { id: s.id }), /passa do teto/);
  const comJ = solicitacaoBase(a, { id: s.id, saidaEm: '2026-11-09T07:00', chegadaEm: '2026-11-12T18:00' });
  comJ.linhas[0].justificativaTeto = 'Único hotel com vaga na semana da feira agropecuária';
  a.ok(a.v('gil', 'salvar', comJ));
  const e = a.ok(a.v('gil', 'enviar', { id: s.id }));
  assert.equal(e.solicitacao.situacao, 'AGUARDANDO_APROVACAO');
  assert.match(e.message, /Depois ela vai também à Diretoria: Hospedagem acima do teto da política/);
  assert.equal(solic(a, s.id).POLITICA_VERSAO, 1, 'guarda a versão conferida');
  a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'De acordo, semana de feira na cidade' }));
  assert.equal(solic(a, s.id).SITUACAO, 'AGUARDANDO_DIRETORIA');
  const h = a.ok(a.v('dora', 'documento', { id: s.id })).html;
  assert.match(h, /R\$ 200,00 diária por quarto \(acima\)/); assert.match(h, /Único hotel com vaga/);
});

// ------------------------------------------------------------------ 10. sobreposição, cancelamento, retirada, pendências
test('mesma pessoa em duas viagens nas mesmas datas é recusada; retirar e cancelar com motivo; pendências e Caixa de decisões', () => {
  const a = ambiente();
  const s1 = criarCompleta(a);
  a.ok(a.v('gil', 'enviar', { id: s1.id }));
  const s2 = criarCompleta(a, 'gil', { saidaEm: '2026-10-28T07:00', chegadaEm: '2026-10-30T18:00' });
  assert.ok(s2.faltas.some((f) => /TIAGO TECNICO TESTE, PAULO TECNICO TESTE já estão na viagem VIA-2026-0001/.test(f)), s2.faltas.join(' | '));
  recusa(a.v('gil', 'enviar', { id: s2.id }), /mesmas datas/);
  // pendência na central para o aprovador (com o decisor da Caixa) e entra nos tipos da Caixa de decisões
  const itens = []; a.ctx.Viagem_fontePendencias_((x) => itens.push(x), { userId: 'u_mat', perfil: 'GESTOR', gestao: true });
  const ap = itens.find((x) => x.tipo === 'viagem_aprovar');
  assert.deepEqual(Array.from(ap.paraUsuarios), ['u_mat']); assert.equal(ap.extra.decisor, 'u_mat'); assert.ok(a.ctx.GES_TIPOS.viagem_aprovar);
  assert.equal(ap.id, gs05(a)[0].REF_ID, 'o GS01 da Caixa reconhece o aviso na hora (mesmo item)');
  assert.doesNotMatch(ap.titulo, /R\$/, 'sem valor no título da pendência');
  // retirar volta a rascunho; cancelar pede motivo
  a.ok(a.v('gil', 'retirar', { id: s1.id }));
  assert.equal(solic(a, s1.id).SITUACAO, 'RASCUNHO');
  recusa(a.v('gil', 'cancelar', { id: s1.id, motivo: 'curto' }), /motivo \(10 letras/);
  a.ok(a.v('gil', 'cancelar', { id: s1.id, motivo: 'Cliente adiou a visita para dezembro' }));
  assert.equal(solic(a, s1.id).SITUACAO, 'CANCELADA');
  // cancelada não ocupa mais as datas
  assert.deepEqual(a.ok(a.v('gil', 'abrir', { id: s2.id })).solicitacao.faltas, []);
  // aprovada: pendência da carga para o Financeiro
  a.ok(a.v('gil', 'enviar', { id: s2.id }));
  a.ok(a.v('matheusgodoi', 'decidir', { id: s2.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' }));
  const it2 = []; a.ctx.Viagem_fontePendencias_((x) => it2.push(x), { userId: 'u_fin', perfil: 'FINANCEIRO' });
  const cg = it2.find((x) => x.tipo === 'viagem_carga');
  assert.deepEqual(Array.from(cg.paraUsuarios).sort(), ['u_fin', 'u_fin2']);
  assert.equal(cg.tela.tipo, 'viagem');
});

// ------------------------------------------------------------------ 11. tela, ajuda e manual
function paginaCompleta() {
  return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));
}
test('tela na página completa: item do menu (escondido até o servidor responder), include, ganchos da casca, scripts válidos, sem confirm/prompt', () => {
  const pg = paginaCompleta();
  assert.ok(!/<\?!=\s*include/.test(pg));
  const botao = /<button[^>]*data-mod="deposito_viagem"[^>]*>/.exec(pg);
  assert.ok(botao); assert.match(botao[0], /id="menu-btn-deposito_viagem"/); assert.match(botao[0], /style="display:none;"/);
  assert.ok(pg.indexOf('id="menu-btn-deposito_viagem"') > pg.indexOf('id="menu-grupo-itens-operacao"') && pg.indexOf('id="menu-btn-deposito_viagem"') < pg.indexOf('data-grupo="comercial"'), 'no grupo Operação de campo');
  for (const fn of ['function Viagem_iniciar_', 'function Viagem_render_', 'function Viagem_irPara_']) assert.ok(pg.includes(fn), fn);
  const core = ler('JS_Core.html');
  assert.equal((core.match(/Viagem_iniciar_\(\);/g) || []).length, 2, 'login e entrada automática');
  assert.match(core, /mod === "deposito_viagem" && typeof Viagem_render_ === "function"/);
  assert.match(ler('JS_Inicio.html'), /case "viagem":[\s\S]{0,200}Viagem_irPara_\(acao\)/);
  // todos os <script> da página completa compilam
  const re = /<script>([\s\S]*?)<\/script>/g; let m, n = 0;
  while ((m = re.exec(pg))) { n++; new vm.Script(m[1], { filename: 'pagina#' + n }); }
  assert.ok(n > 10);
  const tela = ler('JS_DepositoViagem.html');
  const js = /<script>([\s\S]*)<\/script>/.exec(tela)[1];
  assert.doesNotMatch(js, /\b(window\.)?(confirm|prompt|alert)\s*\(/, 'sem window.confirm/prompt/alert');
  assert.match(tela, /\.vg-texto \{[^}]*text-align: justify/);
  assert.match(tela, /@media \(max-width: 760px\)/);
  assert.ok(!/width:\s*\d{4,}px/.test(tela));
  assert.doesNotMatch(js, /setInterval/, 'sem atualização automática que redesenhe o formulário');
  assert.match(js, /data-sgo-sujo/);
  // o item do menu só aparece para quem o servidor responde ok (equipe interna)
  for (const [login, deve] of [['gil', true], ['tiago', true], ['hcli', false]]) {
    const a = ambiente();
    const botaoEl = { style: { display: 'none' } };
    const janela = {
      document: { getElementById: (id) => (id === 'menu-btn-deposito_viagem' ? botaoEl : null), querySelectorAll: () => [] }, console,
      SGO_getSessionId: () => 's_' + login,
      google: { script: { run: (function mk(ok, falha) { return new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => mk(f, falha) : k === 'withFailureHandler' ? (f) => mk(ok, f) : (...args) => { try { ok(JSON.parse(JSON.stringify(a.ctx[k](...args)))); } catch (e) { falha(e); } } }); })(() => {}, () => {}) } }
    };
    vm.createContext(janela);
    vm.runInContext(js, janela);
    vm.runInContext('Viagem_iniciar_()', janela);
    assert.equal(botaoEl.style.display === '', deve, login);
  }
});

test('ajuda da tela, manual e base do assistente: registrados e sem recurso de administração', () => {
  const a = ambiente();
  const t = a.ctx.SGO_Ajuda_todas_().telas.deposito_viagem;
  assert.ok(t && t.titulo === 'Depósito de viagem' && t.passos.length >= 5 && t.problemas.length >= 8 && t.quemPode.length >= 4 && t.secoesManual.length >= 2);
  assert.match(JSON.stringify(t), /O total não é digitado/);
  assert.match(ler('SGO_Ajuda.js'), /deposito_viagem: 'Depósito de viagem'/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_DEPOSITO_VIAGEM.md'), 'utf8');
  assert.match(man, /## 8\. Registrar a carga no cartão Caju/);
  assert.ok(!/relat[óo]rio interno|modo personalizado|senha administrativa/i.test(man + JSON.stringify(t)));
  const c = {}; vm.createContext(c); vm.runInContext(ler('SGO_AssistenteManuais.js') + ';this.M=SGO_ASSIST_MANUAIS', c);
  const e = c.M.manuais.find((m) => m.arquivo === 'MANUAL_DEPOSITO_VIAGEM.md');
  assert.ok(e && e.tela === 'deposito_viagem' && e.secoes.length >= 10);
  assert.ok(c.M.manuais.some((m) => m.arquivo === 'MANUAL_MODULO_FROTA.md'), 'o resto da base continua lá');
});


// ------------------------------------------------------------------ 12. organização (11/11/2026): tetos, Kanban, Gantt, relatórios, centros
test('política: só hospedagem e alimentação têm teto; valor antigo em outra categoria é ignorado e não confere nada', () => {
  const a = ambiente();
  const pol = a.ok(a.v('dora', 'politica')).politica;
  assert.deepEqual(pol.tetos.map((t) => t.cod), ['HOSPEDAGEM', 'ALIMENTACAO']);
  // gravar com chaves de outras categorias: descartadas (nem um texto inválido nelas recusa)
  const g = a.ok(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: { HOSPEDAGEM: '150,00', ALIMENTACAO: '100,00', COMBUSTIVEL: '1,00', PEDAGIO: 'abc' } }, motivo: 'Tetos de hotel e alimentação do dono' }));
  assert.deepEqual(g.politica.tetos.map((t) => t.cod + ':' + t.valor), ['HOSPEDAGEM:150', 'ALIMENTACAO:100']);
  const gravada = JSON.parse(a.tabelas.VIA_POLITICA[0].VALOR_JSON).tetos;
  assert.equal(gravada.COMBUSTIVEL, null); assert.equal(gravada.PEDAGIO, null);
  // versão antiga gravada direto com teto de combustível: ignorada na conferência
  a.tabelas.VIA_POLITICA.push({ ID: 'p_velha', VERSAO: 9, VALOR_JSON: JSON.stringify({ aprovadores: ['matheusgodoi'], limiteDiretoria: 5000, urgenteDiasUteis: 2, tetos: { COMBUSTIVEL: 1, PEDAGIO: 1, HOSPEDAGEM: 300 } }), MOTIVO: 'versão antiga', POR_NOME: 'x', EM: '2026-10-19T09:00:00' });
  const s = criarCompleta(a, 'gil', { saidaEm: '2026-11-09T07:00', chegadaEm: '2026-11-12T18:00' });
  const comb = s.linhas.find((l) => l.categoria === 'COMBUSTIVEL');
  assert.equal(comb.acimaTeto, false); assert.equal(comb.teto, null);
  assert.deepEqual(s.faltas, [], s.faltas.join(' | '));
  assert.deepEqual(a.ok(a.v('dora', 'politica')).politica.tetos.map((t) => t.cod + ':' + t.valor), ['HOSPEDAGEM:300', 'ALIMENTACAO:null']);
  const h = a.ok(a.v('gil', 'documento', { id: s.id })).html;
  assert.match(h, /não tem teto/); assert.match(h, /Só hospedagem \(diária por quarto\) e alimentação/);
});

function semearPainel(a) {
  const s1 = criarCompleta(a, 'gil');
  a.ok(a.v('gil', 'enviar', { id: s1.id }));
  a.ok(a.v('matheusgodoi', 'decidir', { id: s1.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' }));
  a.ok(a.v('wanessa', 'registrarCarga', { id: s1.id, valor: '2.660,00', data: '2026-10-19', comprovante: a.pdf() }));
  const rj = a.v('gil', 'opcoes').centros.find((c) => c.codigo === 'RJ-TECNICA');
  const s2 = criarCompleta(a, 'gil', { centroCustoId: rj.id, destinoCidade: 'Niterói', destinoUf: 'RJ', saidaEm: '2026-11-03T07:00', chegadaEm: '2026-11-06T18:00', equipe: [{ id: 'u_tec2', funcao: 'TECNICO' }], responsavelId: 'u_tec2' });
  a.ok(a.v('gil', 'enviar', { id: s2.id }));
  return { s1, s2 };
}
test('painel (Kanban e Gantt): colunas reais, cores, escopo de cada um, filtro e sobreposição da mesma pessoa', () => {
  const a = ambiente();
  const { s1, s2 } = semearPainel(a);
  const p = a.ok(a.v('wanessa', 'painel'));
  assert.equal(p.escopo, 'todas');
  assert.deepEqual(p.colunas.map((c) => c.cod), ['RASCUNHO', 'DEVOLVIDA', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_DIRETORIA', 'APROVADA', 'CARGA_FEITA', 'PRESTACAO_PENDENTE', 'PRESTACAO_ENVIADA', 'ACERTO', 'ENCERRADA', 'NEGADA_CANCELADA']);
  const i1 = p.itens.find((x) => x.id === s1.id), i2 = p.itens.find((x) => x.id === s2.id);
  assert.equal(i1.coluna, 'CARGA_FEITA'); assert.equal(i2.coluna, 'AGUARDANDO_APROVACAO');
  assert.equal(i1.cor, p.cores.CARGA_FEITA); assert.equal(i1.carregado, 2660); assert.equal(i1.centro, 'GO-TECNICA');
  assert.equal(i1.saidaMs, Date.parse('2026-10-26T07:00:00-03:00')); assert.equal(i1.dias, 4);
  assert.match(p.ganttJs, /SGOGantt/);
  // escopo: técnico vê só as dele; quem não está em nenhuma não vê nada
  assert.equal(a.ok(a.v('tiago', 'painel')).escopo, 'minhas');
  assert.deepEqual(a.ok(a.v('tiago', 'painel')).itens.map((x) => x.id), [s1.id]);
  assert.deepEqual(a.ok(a.v('paulo', 'painel')).itens.map((x) => x.id).sort(), [s1.id, s2.id].sort());
  assert.equal(a.ok(a.v('mara', 'painel')).itens.length, 0);
  // filtro (mesma regra da tela e dos relatórios)
  const f = (filtro) => Array.from(a.ctx.Via_filtrar_(p.itens, filtro), (x) => x.numero);
  assert.deepEqual(f({ centro: 'RJ-TECNICA' }), [i2.numero]);
  assert.deepEqual(f({ pessoa: 'u_tec' }), [i1.numero]);
  assert.deepEqual(f({ de: '2026-10-29', ate: '2026-10-30' }), [i1.numero], 'toca o período pela chegada');
  assert.deepEqual(f({ de: '2026-12-01', ate: '2026-12-31' }), []);
  // sobreposição: Paulo em duas viagens ativas (rascunho não ocupa as datas; enviada ocupa)
  const s3 = a.ok(a.v('gil', 'salvar', solicitacaoBase(a, { saidaEm: '2026-11-04T07:00', chegadaEm: '2026-11-05T18:00', equipe: [{ id: 'u_tec2', funcao: 'TECNICO' }], responsavelId: 'u_tec2' }))).solicitacao;
  assert.equal(a.ok(a.v('wanessa', 'painel')).itens.find((x) => x.id === s2.id).conflitos.length, 0, 'rascunho não ocupa as datas');
  a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s3.id).SITUACAO = 'AGUARDANDO_APROVACAO';
  const c = a.ok(a.v('wanessa', 'painel')).itens.find((x) => x.id === s2.id).conflitos;
  assert.equal(c.length, 1); assert.deepEqual(c[0].pessoas, ['PAULO TECNICO TESTE']);
});

test('relatórios A4 do período, Kanban e Gantt: escopo, filtros, aprovado x carregado por centro e por pessoa; recusas claras', () => {
  const a = ambiente();
  semearPainel(a);
  const per = { de: '2026-10-01', ate: '2026-11-30' };
  const r = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'PERIODO' }, per)));
  assert.match(r.html, /Viagens do período por centro de custo/); assert.match(r.html, /Todas as solicitações da empresa/);
  assert.match(r.html, /GO-TECNICA/); assert.match(r.html, /RJ-TECNICA/);
  assert.match(r.html, /R\$ 5\.320,00/, 'total pedido das duas'); assert.match(r.html, /Carregado no Caju/);
  assert.match(r.html, /<svg/); assert.match(r.html, /TIAGO TECNICO TESTE/);
  assert.equal(r.quantidade, 2); assert.match(r.nomeArquivo, /^Deposito-de-viagem_periodo_2026-10-01_a_2026-11-30\.html$/);
  assert.doesNotMatch(r.html.replace(/data:[^"')]+/g, ''), />[^<]*(undefined|NaN)[^<]*</, 'sem undefined/NaN no texto');
  const rj = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'PERIODO', centro: 'RJ-TECNICA' }, per)));
  assert.equal(rj.quantidade, 1); assert.match(rj.html, /centro de custo RJ-TECNICA/);
  // escopo: o técnico só vê a dele, e o relatório diz isso
  const t = a.ok(a.v('tiago', 'relatorio', Object.assign({ tipo: 'PERIODO' }, per)));
  assert.equal(t.quantidade, 1); assert.match(t.html, /Somente as solicitações que você pediu ou em que viaja/); assert.doesNotMatch(t.html, /Niterói/);
  // Kanban e Gantt
  const k = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'KANBAN' }, per)));
  assert.match(k.html, /Aguardando a gerência/); assert.match(k.html, /Carga feita/);
  const g = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'GANTT', agrupar: 'CENTRO' }, per)));
  assert.match(g.html, /por centro de custo/); assert.match(g.html, /<rect[^>]+fill="#1d6b3f"/, 'carga feita em verde, a mesma cor da tela');
  assert.match(a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'GANTT' }, per))).html, /PAULO TECNICO TESTE/);
  // recusas
  recusa(a.v('wanessa', 'relatorio', { tipo: 'X' }), /escolha o tipo de relatório/);
  recusa(a.v('wanessa', 'relatorio', { tipo: 'PERIODO', de: '2026-11-30', ate: '2026-10-01' }), /é depois da final/);
  recusa(a.v('wanessa', 'relatorio', { tipo: 'PERIODO', de: '2024-01-01', ate: '2026-10-01' }), /passa de 400 dias/);
  recusa(a.v('hcli', 'relatorio', { tipo: 'PERIODO' }), /equipe interna/);
  // sem datas: o mês corrente do relógio do sistema
  assert.match(a.ok(a.v('wanessa', 'relatorio', { tipo: 'PERIODO' })).html, /01\/10\/2026 a 31\/10\/2026/);
});

test('centros de custo: conferência guiada marca quem conferiu, grava o código do Caju e conta o progresso; só Financeiro e Diretoria', () => {
  const a = ambiente();
  const c0 = a.ok(a.v('wanessa', 'centros'));
  assert.deepEqual(c0.resumo, { total: 22, ativos: 22, inativos: 0, conferidos: 0, semConferir: 22, ativosComCaju: 0 });
  assert.ok(c0.centros.every((c) => c.conferido === false), 'a lista inicial do sistema não conta como conferida');
  const alvo = c0.centros.find((c) => c.codigo === 'GO-TECNICA');
  const r = a.ok(a.v('wanessa', 'conferirCentro', { id: alvo.id, codigoCaju: 'CC GO TEC' }));
  assert.match(r.message, /GO-TECNICA marcado como conferido \(código no Caju: CC GO TEC\)/);
  assert.equal(r.resumo.conferidos, 1); assert.equal(r.resumo.ativosComCaju, 1);
  const g = r.centros.find((c) => c.id === alvo.id);
  assert.equal(g.conferido, true); assert.equal(g.conferidoPor, 'WANESSA FINANCEIRO TESTE'); assert.equal(g.codigoCaju, 'CC GO TEC');
  assert.ok(a.tabelas.VIA_HISTORICO.some((h) => h.ACAO === 'CENTRO_CONFERIDO' && h.ENTIDADE_ID === alvo.id && /CC GO TEC/.test(h.TEXTO)));
  // desativar pela conferência também conta como conferido e tira da lista de escolha
  const rh = c0.centros.find((c) => c.codigo === 'RJ-RH');
  const d = a.ok(a.v('wanessa', 'salvarCentro', { id: rh.id, nome: rh.nome, ativo: 'NAO', motivo: 'Desativado na conferência guiada: a empresa não usa este centro.' }));
  assert.equal(d.resumo.inativos, 1); assert.equal(d.resumo.conferidos, 2);
  assert.ok(!a.ok(a.v('gil', 'opcoes')).centros.some((c) => c.codigo === 'RJ-RH'), 'inativo sai da lista de escolha');
  recusa(a.v('gil', 'conferirCentro', { id: alvo.id }), /«Manter os centros de custo»/);
  recusa(a.v('wanessa', 'conferirCentro', { id: 'nao-existe' }), /não foi encontrado/);
  // conferir sem mandar o código não mexe no código
  a.ok(a.v('dora', 'conferirCentro', { id: alvo.id }));
  assert.equal(a.ok(a.v('dora', 'centros')).centros.find((c) => c.id === alvo.id).codigoCaju, 'CC GO TEC');
});

test('tela organizada: Comece por aqui, Kanban, Gantt e relatórios com os componentes comuns; aprovadores por caixas de marcar; sem seleção múltipla', () => {
  const tela = ler('JS_DepositoViagem.html'), js = /<script>([\s\S]*)<\/script>/.exec(tela)[1];
  for (const t of ['"Comece por aqui"', '"Kanban"', '"Gantt"', '"Relatórios A4"']) assert.ok(js.includes(t), t);
  assert.match(js, /PnA_kanbanHtml_\(/); assert.match(js, /PnA_ganttHtml_\(/); assert.match(js, /PnA_prepararGantt_\(/);
  assert.doesNotMatch(tela, /<select[^>]*multiple/, 'sem lista de seleção múltipla (Ctrl+clique)');
  assert.match(js, /vgPolBusca/); assert.match(js, /type="checkbox" value=/); assert.match(js, /Vazio = sem conferência/);
  assert.match(js, /Começar a conferência guiada/); assert.match(js, /Baixar o arquivo \(\.html\)/);
  assert.doesNotMatch(js, /\b(window\.)?(confirm|prompt|alert)\s*\(/);
  assert.doesNotMatch(js, /setInterval/, 'nada redesenha sozinho');
  // as cores da tela são as mesmas do servidor (Kanban, Gantt e A4)
  const a = ambiente();
  const coresTela = JSON.parse(/var VG_CORES = (\{[^}]+\})/.exec(js)[1].replace(/(\w+):/g, '"$1":'));
  assert.deepEqual(coresTela, JSON.parse(JSON.stringify(a.ctx.VIA_CORES)));
  // ajuda da tela cobre as partes novas
  const aj = JSON.stringify(a.ctx.SGO_Ajuda_todas_().telas.deposito_viagem);
  for (const t of ['Comece por aqui', 'Kanban', 'Gantt', 'Relatórios A4', 'conferência guiada', 'Vazio = sem conferência']) assert.ok(aj.includes(t), t);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_DEPOSITO_VIAGEM.md'), 'utf8');
  for (const t of ['## 3. O que é centro de custo', '## 10. Kanban e Gantt', '## 11. Relatórios A4', '## 13. Centros de custo e conferência guiada', 'só a hospedagem (diária por quarto) e a alimentação']) assert.ok(man.includes(t), t);
});
