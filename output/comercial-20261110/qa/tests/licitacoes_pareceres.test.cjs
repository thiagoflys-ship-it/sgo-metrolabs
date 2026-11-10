// SGO+ Licitações, pareceres por área e alçadas de decisão (03/11/2026): pedido de parecer com atividade em Minhas atividades (sem
// duplicar, recuperada pela marca), permissão da área (só a oportunidade do pedido, só com o pedido aberto, sem custo), parecer
// imutável com versão e histórico, divergências calculadas pelo código, alçada padrão = comportamento de antes (um diretor basta),
// alçada configurada recusando com o que falta, duas aprovações, Kanban e Central de disputas conferindo a alçada, alertas pela fila de
// Licitações (expediente, modelo aprovado, sem escalonamento) e as telas no computador e no celular. Código real do SGO+ num contexto
// isolado com relógio controlado; pessoas e órgãos fictícios. Nenhuma chamada de rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente, OP, USUARIOS, J, ler } = require('./_licitacoes_alertas_ambiente.cjs');
const { ambienteProposta } = require('./_licitacoes_proposta_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const lerCru = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');

const EXTRA = [
  { ID: 'u_fab', USUARIO: 'fabio', NOME: 'FABIO FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'fabio@exemplo.test', CELULAR: '62999990025', VINCULO_TRABALHO: 'CLT', AREA: 'FINANCEIRO' },
  { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', CELULAR: '62999990026', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' }
];
/** Põe em vigor já a última versão das alçadas (no SGO+ ela vale a partir das 00:00 do dia seguinte). */
const vigorar = (tabelas) => { const l = tabelas.LIC_CONFIG.find((c) => c.CHAVE === 'ALCADAS'); const v = JSON.parse(l.VALOR_JSON); v.valeAPartirDe = '2026-01-01T03:00:00.000Z'; l.VALOR_JSON = JSON.stringify(v); };
const CRIT = (cap) => JSON.stringify({ capacidade: { pontos: cap, peso: 20, origem: 'CODIGO', como: 'Serviços do catálogo cobrem o objeto' }, margem: { pontos: 10, peso: 15, origem: 'SIMULACAO', como: 'Sobra de 38% sobre o piso de R$ 80.000,00' } });

/** op1 em análise (valor estimado R$ 98.765,43, propostas até 04/11 08:30), op2 no radar. Segunda-feira 26/10/2026 10:00 (expediente). */
function amb(o) {
  o = o || {};
  const a = ambiente({ agora: o.agora || '2026-10-26T10:00:00-03:00', tabelas: { CAD_USUARIOS: USUARIOS.concat(EXTRA).map((u) => Object.assign({}, u)) },
    ops: [OP('op1', { SITUACAO: 'ANALISE', NOTA: o.nota === undefined ? 72 : o.nota, NOTA_CLASSE: o.classe || 'MEDIA', ANALISE_ID: 'an1', ANALISE_VERSAO: 1 }),
      OP('op2', { CODIGO: 'LIC-2026-0002', ORGAO_NOME: 'HOSPITAL ESTADUAL TESTE', NUMERO_CONTROLE_PNCP: '11222333000181-1-000020/2026' })] });
  for (const f of ['SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Pareceres.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  Object.assign(a.sessoes, { s_fab: { userId: 'u_fab', usuario: 'fabio', nome: 'FABIO FINANCEIRO TESTE', perfil: 'FINANCEIRO' }, s_tec: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO TESTE', perfil: 'TECNICO' } });
  a.tabelas.LIC_ANALISES = [{ ID: 'an1', OPORTUNIDADE_ID: 'op1', VERSAO: 1, SITUACAO: 'CONCLUIDA', RESUMO: 'Calibração de equipamentos de laboratório no Paraná.', CRITERIOS_JSON: CRIT(o.cap === undefined ? 18 : o.cap) }];
  a.par = (sid, op, d) => J(a.ctx.Licitacoes_api(sid, 'pareceres', Object.assign({ op }, d || {})));
  a.ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
  a.sim = (oid, x) => { a.tabelas.LIC_SIMULACOES = a.tabelas.LIC_SIMULACOES || []; const v = a.tabelas.LIC_SIMULACOES.filter((s) => s.OPORTUNIDADE_ID === oid).length + 1;
    a.tabelas.LIC_SIMULACOES.push(Object.assign({ ID: 'sim' + oid + v, OPORTUNIDADE_ID: oid, VERSAO: v, TOTAL_PROPOSTA: 95000, TOTAL_PISO: 80000, TOTAL_EDITAL: 98765.43, TOTAL_CUSTO: 52000, MARGEM_PROPOSTA_PCT: 45.3, ITENS_ABAIXO_PISO_PROPOSTA: 0, PENDENCIAS: 0, POR_NOME: 'CHARLES DIRETOR TESTE', CRIADO_EM: '2026-10-26T12:00:00.000Z' }, x || {})); };
  a.pedir = (area, uid, d) => a.ok(a.par('s_cha', 'pedir', Object.assign({ id: 'op1', area, usuarioId: uid }, d || {})));
  a.registrar = (sid, pedidoId, posicao, motivo, extra) => a.par(sid, 'registrar', Object.assign({ pedidoId, posicao, motivo: motivo || 'Conferi o edital, a equipe e os padrões disponíveis para o prazo' }, extra || {}));
  a.atvs = () => (a.tabelas.ATV_ATIVIDADES || []).filter((x) => /pedido de parecer/.test(x.DESCRICAO || ''));
  a.op = (id) => a.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === id);
  // revisão de bf3860b: a versão nova vale a partir do dia seguinte; vigorar() a põe em vigor já (o teste próprio da data está no fim)
  a.cfgSemVigorar = (faixas, extra) => a.ok(a.par('s_thi', 'cfgSalvar', Object.assign({ faixas, motivo: 'Decisão do dono para os testes das alçadas' }, extra || {})));
  a.cfg = (faixas, extra) => { const r = a.cfgSemVigorar(faixas, extra); vigorar(a.tabelas); return r; };
  return a;
}

// ------------------------------------------------------------------ pedido de parecer e a atividade
test('pedido de parecer: lança a atividade em Minhas atividades para a pessoa (prazo 1 dia útil antes do fim das propostas, 18:00) e não duplica', () => {
  const a = amb();
  const r = a.pedir('TECNICA', 'u_gil', { pergunta: 'Temos padrão e equipe para os equipamentos no prazo?' });
  assert.equal(r.pedido.prazoDia, '2026-11-03', '1 dia útil antes de 04/11');
  assert.match(r.pedido.prazoRegra, /1 dia útil antes do fim das propostas/);
  assert.ok(r.atividade.id, 'atividade lançada');
  const at = a.atvs();
  assert.equal(at.length, 1);
  assert.equal(at[0].RESPONSAVEL_ID, 'u_gil'); assert.equal(at[0].RESTRITA, 'SIM'); assert.equal(at[0].MODULO, 'licitacoes');
  assert.match(at[0].PRAZO, /^2026-11-03T18:00/); assert.match(at[0].DESCRICAO, /\[Ref\. Licitações: pedido de parecer /);
  assert.match(at[0].DESCRICAO, /Temos padrão e equipe/); assert.doesNotMatch(at[0].DESCRICAO, /52\.000|custo/i, 'sem custo na atividade');
  // segundo pedido da mesma área: recusado, nada criado
  const dup = a.par('s_cha', 'pedir', { id: 'op1', area: 'TECNICA', usuarioId: 'u_tec' });
  assert.equal(dup.ok, false); assert.match(dup.message, /Já existe um pedido de parecer Técnico aberto para GIL GESTOR TESTE.*Nada foi criado/);
  assert.equal(a.atvs().length, 1);
  assert.equal(a.tabelas.LIC_PARECER_PEDIDOS.length, 1);
  // pessoa fora da área e área vazia: recusados com o que fazer
  assert.match(a.par('s_cha', 'pedir', { id: 'op1', area: 'FINANCEIRA', usuarioId: 'u_vera' }).message, /Escolha na lista quem dá o parecer Financeiro/);
  // prazo no passado: recusado
  assert.match(a.par('s_cha', 'pedir', { id: 'op1', area: 'FINANCEIRA', usuarioId: 'u_fab', prazo: '2026-10-25' }).message, /não pode ficar no passado/);
  // histórico do pedido
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'PARECER_PEDIDO' && /GIL GESTOR TESTE/.test(h.TEXTO)));
});

test('pedido de parecer: atividade que falhou é lançada de novo pela marca sem repetir; reserva vale contra dois toques', () => {
  const a = amb();
  const criar = a.ctx.Atividades_apiCriar;
  a.ctx.Atividades_apiCriar = () => ({ ok: false, message: 'Minhas atividades ocupado' });
  const r = a.pedir('FINANCEIRA', 'u_fab');
  assert.equal(r.atividade.id, undefined); assert.match(r.texto, /NÃO foi lançada.*Lançar a atividade de novo/);
  assert.equal(a.tabelas.LIC_PARECER_PEDIDOS[0].ATIVIDADE_ERRO, 'Minhas atividades ocupado');
  // a execução "caiu" depois de criar: a atividade existe com a marca, sem vínculo
  a.ctx.Atividades_apiCriar = criar;
  const pid = r.pedido.id;
  criar('s_cha', { titulo: 'Parecer Financeiro (gravação interrompida)', descricao: 'texto\n[Ref. Licitações: pedido de parecer ' + pid + ']', prazo: '2026-11-03T18:00', responsavelId: 'u_fab' });
  const d1 = a.ok(a.par('s_cha', 'atividadeDeNovo', { pedidoId: pid }));
  assert.equal(d1.atividade.recuperada, true); assert.match(d1.texto, /achada pela marca/);
  assert.equal(a.atvs().length, 1, 'nada foi repetido');
  const d2 = a.ok(a.par('s_cha', 'atividadeDeNovo', { pedidoId: pid }));
  assert.equal(d2.atividade.ja, true); assert.equal(a.atvs().length, 1);
  // reserva viva (outra gravação lançando agora): recusa com o que fazer
  const b = amb();
  b.ctx.Atividades_apiCriar = () => ({ ok: false, message: 'fora' });
  const rb = b.pedir('FINANCEIRA', 'u_fab');
  b.tabelas.LIC_PARECER_PEDIDOS[0].ATIVIDADE_RESERVA_ATE = '2026-10-26T13:04:00.000Z';
  const rr = b.ok(b.par('s_cha', 'atividadeDeNovo', { pedidoId: rb.pedido.id }));
  assert.match(rr.texto, /outra gravação está lançando/);
});

test('prazo do pedido nunca no passado: fim das propostas amanhã cedo vira hoje às 18:00; depois das 18:00 vira o próximo dia útil', () => {
  const a = amb();
  a.op('op1').ENCERRAMENTO_ISO = '2026-10-27T11:00:00.000Z';   // terça 08:00
  assert.equal(a.pedir('TECNICA', 'u_gil').pedido.prazoDia, '2026-10-26', 'hoje às 18:00');
  const b = amb({ agora: '2026-10-26T19:00:00-03:00' });
  b.op('op1').ENCERRAMENTO_ISO = '2026-10-27T11:00:00.000Z';
  const p = b.pedir('TECNICA', 'u_gil').pedido;
  assert.equal(p.prazoDia, '2026-10-27'); assert.match(p.prazoRegra, /nunca no passado/);
});

// ------------------------------------------------------------------ permissão da área
test('permissão: a pessoa vê só a oportunidade do pedido dela, só com o pedido aberto e antes da decisão, e sem custo', () => {
  const a = amb();
  a.sim('op1');
  const r = a.pedir('TECNICA', 'u_gil');
  // menu e acesso
  assert.equal(a.ok(a.par('s_gil', 'meus')).abertos.length, 1);
  assert.equal(J(a.api('s_gil', 'acesso')).pareceresAbertos, 1);
  assert.equal(J(a.api('s_vera', 'acesso')).pareceresAbertos, 0);
  // o resto do módulo continua fechado para ele
  for (const acao of ['ficha', 'oportunidades', 'kanban', 'hoje']) { const x = J(a.api('s_gil', acao, { id: 'op1' })); assert.equal(x.ok, false, acao); assert.equal(x.semAcesso, true); }
  for (const op of ['ficha', 'pedir', 'aprovar', 'cfg', 'cfgSalvar', 'cancelar', 'atividadeDeNovo']) { const x = a.par('s_gil', op, { id: 'op1', area: 'TECNICA', usuarioId: 'u_gil', motivo: 'tentativa sem permissão alguma' }); assert.equal(x.ok, false, op); assert.equal(x.semAcesso, true, op); }
  // tela do pedido: resumo, nota, preço SEM custo, piso nem margem
  const t = a.ok(a.par('s_gil', 'tela', { pedidoId: r.pedido.id }));
  assert.equal(t.op.codigo, 'LIC-2026-op1'); assert.equal(t.nota.nota, 72); assert.equal(t.podeRegistrar, true);
  assert.equal(t.preco, null, 'Técnica não vê preço nenhum'); assert.equal(t.nivelPreco, 'NENHUM');
  assert.equal(t.nota.criterios.find((c) => c.codigo === 'margem').como, '', 'o cálculo da margem cita o piso');
  assert.doesNotMatch(JSON.stringify(t), /52000|80000|80\.000|45\.3|95000|acimaDoPiso/, 'nenhum preço, custo, piso ou margem');
  // a Diretoria acompanhando vê o custo
  const tg = a.ok(a.par('s_cha', 'tela', { pedidoId: r.pedido.id }));
  assert.equal(tg.preco.totalPiso, 80000); assert.equal(tg.podeRegistrar, false);
  // outra pessoa (mesmo da área) não abre
  assert.match(a.par('s_tec', 'tela', { pedidoId: r.pedido.id }).message, /é de GIL GESTOR TESTE/);
  assert.match(a.par('s_vera', 'registrar', { pedidoId: r.pedido.id, posicao: 'FAVORAVEL', motivo: 'Tentativa de quem não recebeu o pedido' }).message, /é de GIL GESTOR TESTE/);
  // respondido: a oportunidade sai da tela dele
  a.ok(a.registrar('s_gil', r.pedido.id, 'FAVORAVEL'));
  assert.match(a.par('s_gil', 'tela', { pedidoId: r.pedido.id }).message, /respondido.*saiu da sua tela/);
  assert.equal(a.ok(a.par('s_gil', 'meus')).abertos.length, 0);
  assert.equal(J(a.api('s_gil', 'acesso')).pareceresAbertos, 0);
  // pedido aberto e a Diretoria decidiu (descartou): o pedido é cancelado e sai da tela (revisão de e361160)
  const p2 = a.pedir('FINANCEIRA', 'u_fab');
  a.ok(J(a.api('s_cha', 'descartar', { id: 'op1', motivo: 'Desistimos desta licitação agora' })));
  assert.match(a.par('s_fab', 'tela', { pedidoId: p2.pedido.id }).message, /cancelado \(descartada pela Diretoria/);
  assert.match(a.par('s_fab', 'registrar', { pedidoId: p2.pedido.id, posicao: 'FAVORAVEL', motivo: 'Parecer depois do descarte não vale mais' }).message, /cancelado/);
  // cliente nunca entra
  a.sessoes.s_cli = { userId: 'u_cli', usuario: 'cli', nome: 'CLIENTE TESTE', perfil: 'CLIENTE' };
  assert.equal(a.par('s_cli', 'meus').ok, false);
});

// ------------------------------------------------------------------ parecer imutável
test('parecer: motivo de 20 letras, versão e histórico; não muda depois; versão nova só por pedido novo, com o que mudou; alterado fora do SGO+ não vale', () => {
  const a = amb();
  const r = a.pedir('FINANCEIRA', 'u_fab');
  assert.match(a.registrar('s_fab', r.pedido.id, 'FAVORAVEL', 'Ok, pode ir').message, /pelo menos 20 letras/);
  assert.match(a.registrar('s_fab', r.pedido.id, 'TALVEZ').message, /Escolha o parecer/);
  const x = a.ok(a.registrar('s_fab', r.pedido.id, 'CONTRARIO', 'Margem apertada para o deslocamento até Cascavel'));
  assert.equal(x.parecer.versao, 1); assert.equal(x.parecer.integra, true);
  const linha = J(a.tabelas.LIC_PARECERES[0]);
  // o mesmo pedido não aceita outro parecer
  assert.match(a.registrar('s_fab', r.pedido.id, 'FAVORAVEL').message, /respondido/);
  // pedido novo: versão 2 exige o que mudou
  const r2 = a.pedir('FINANCEIRA', 'u_fab');
  assert.match(a.registrar('s_fab', r2.pedido.id, 'FAVORAVEL').message, /Já existe o parecer Financeiro versão 1.*escreva o que mudou/);
  const x2 = a.ok(a.registrar('s_fab', r2.pedido.id, 'FAVORAVEL', 'Com a simulação nova o piso fica coberto em todos os itens', { motivoNovaVersao: 'Simulação refeita com o pedágio correto' }));
  assert.equal(x2.parecer.versao, 2);
  assert.deepEqual(J(a.tabelas.LIC_PARECERES[0]), linha, 'a versão 1 não mudou');
  assert.equal(a.tabelas.LIC_PARECERES[1].SUBSTITUI_ID, a.tabelas.LIC_PARECERES[0].ID);
  const f = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })), fin = f.areas.find((z) => z.codigo === 'FINANCEIRA');
  assert.equal(fin.parecer.versao, 2); assert.equal(fin.versoes.length, 2);
  assert.equal(a.tabelas.LIC_HISTORICO.filter((h) => h.TIPO === 'PARECER_REGISTRADO').length, 2);
  // alterado fora do SGO+: não vale, e aparece como divergência
  a.tabelas.LIC_PARECERES[1].POSICAO = 'CONTRARIO';
  const f2 = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })), fin2 = f2.areas.find((z) => z.codigo === 'FINANCEIRA');
  assert.equal(fin2.parecer.versao, 1, 'vale a última íntegra');
  assert.ok(f2.consolidacao.divergencias.some((d) => d.codigo === 'ALTERADO'));
  // atividade concluída ao registrar
  assert.ok(a.atvs().some((t) => t.SITUACAO === 'Concluída'));
});

// ------------------------------------------------------------------ divergências
test('divergências calculadas pelo código: Técnico favorável × capacidade baixa, Financeiro contrário × acima do piso, contrário de qualquer área, opostos', () => {
  const a = amb({ cap: 4 });
  a.sim('op1');
  const t = a.pedir('TECNICA', 'u_gil'), f = a.pedir('FINANCEIRA', 'u_fab'), c = a.pedir('COMERCIAL', 'u_vera');
  a.ok(a.registrar('s_gil', t.pedido.id, 'FAVORAVEL'));
  a.ok(a.registrar('s_fab', f.pedido.id, 'CONTRARIO', 'Não vejo margem para esta distância e este prazo'));
  a.ok(a.registrar('s_vera', c.pedido.id, 'RESSALVA', 'Cliente novo, sem histórico de pagamento conhecido'));
  const d = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).consolidacao.divergencias, cod = d.map((x) => x.codigo);
  assert.ok(cod.includes('TECNICO_CAPACIDADE')); assert.match(d.find((x) => x.codigo === 'TECNICO_CAPACIDADE').texto, /capacidade técnica da análise \(versão 1\) é 4 de 20/);
  assert.ok(cod.includes('FINANCEIRO_PISO')); assert.match(d.find((x) => x.codigo === 'FINANCEIRO_PISO').texto, /contrário, mas a simulação versão 1 está acima do piso/);
  assert.ok(cod.includes('CONTRARIO')); assert.ok(cod.includes('OPOSTOS'));
  // simulação nova abaixo do piso: o contrário deixa de divergir do piso; o parecer fica sobre a simulação antiga
  a.sim('op1', { ITENS_ABAIXO_PISO_PROPOSTA: 2, TOTAL_PROPOSTA: 70000 });
  const d2 = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).consolidacao.divergencias;
  assert.ok(!d2.some((x) => x.codigo === 'FINANCEIRO_PISO'));
  assert.ok(d2.some((x) => x.codigo === 'BASE_ANTIGA' && x.area === 'FINANCEIRA'));
  // sem nenhum parecer: nenhuma divergência
  const b = amb();
  assert.deepEqual(b.ok(b.par('s_cha', 'ficha', { id: 'op1' })).consolidacao.divergencias, []);
  // Financeiro favorável sem simulação; Comercial favorável com nota baixa; Licitações favorável com trava a confirmar
  const e = amb({ nota: 35, classe: 'BAIXA' });
  e.op('op1').TRAVAS_A_CONFIRMAR = 1;
  e.ok(e.registrar('s_fab', e.pedir('FINANCEIRA', 'u_fab').pedido.id, 'FAVORAVEL'));
  e.ok(e.registrar('s_vera', e.pedir('COMERCIAL', 'u_vera').pedido.id, 'FAVORAVEL'));
  e.ok(e.registrar('s_thi', e.pedir('LICITACOES', 'u_thi').pedido.id, 'FAVORAVEL'));
  const c3 = e.ok(e.par('s_cha', 'ficha', { id: 'op1' })).consolidacao.divergencias.map((x) => x.codigo);
  for (const k of ['FINANCEIRO_SEM_SIMULACAO', 'COMERCIAL_NOTA', 'LICITACOES_TRAVA']) assert.ok(c3.includes(k), k);
});

// ------------------------------------------------------------------ alçadas
test('alçada padrão = comportamento de antes: um diretor aprova sozinho, sem parecer obrigatório; vai para Decisão com o histórico', () => {
  const a = amb();
  const f = a.ok(a.par('s_cha', 'ficha', { id: 'op1' }));
  assert.equal(f.alcada.padrao, true); assert.equal(f.alcada.necessarias, 1); assert.deepEqual(f.alcada.obrigatorios, []); assert.deepEqual(f.alcada.faltas, []);
  // sem a simulação salva (o preço mínimo), recusa
  assert.match(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Nota boa e equipe disponível' }).message, /falta a simulação de preço salva/);
  assert.equal(a.op('op1').SITUACAO, 'ANALISE');
  a.sim('op1');
  assert.match(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'curto' }).message, /pelo menos 10 letras/);
  const r = a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Nota boa, piso coberto e equipe disponível' }));
  assert.equal(r.transicao, true); assert.equal(a.op('op1').SITUACAO, 'DECISAO');
  const h = a.tabelas.LIC_HISTORICO.find((x) => x.TIPO === 'PARTICIPACAO_APROVADA');
  assert.match(h.TEXTO, /CHARLES DIRETOR TESTE \(1 de 1/); assert.equal(h.FONTE, 'Pareceres e alçadas');
  assert.equal(a.tabelas.LIC_APROVACOES.length, 1);
  // Kanban: Decisão mostra a aprovada; a regra de "Participar" existe e diz o que confere
  const kb = J(a.api('s_cha', 'kanban'));
  assert.ok(kb.colunas.find((c) => c.codigo === 'DECISAO').cartoes.some((c) => c.id === 'op1'));
  assert.equal(kb.regras.participar.acao, 'participar'); assert.match(kb.regras.participar.porque, /preço mínimo aprovado/);
  // descartar depois de aprovado (desistir) continua com um diretor; a aprovação antiga não conta depois de reabrir
  a.mudar('2026-10-26T11:00:00-03:00');
  a.ok(J(a.api('s_thi', 'descartar', { id: 'op1', motivo: 'O órgão mudou o escopo, desistimos' })));
  a.mudar('2026-10-26T11:10:00-03:00');
  a.ok(J(a.api('s_thi', 'reabrir', { id: 'op1', motivo: 'Escopo voltou ao original na errata' })));
  assert.equal(a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada.aprovacoes.length, 0);
  // Central de disputas: no padrão, abrir direto de Em análise nunca é recusado pela alçada
  assert.doesNotThrow(() => a.ctx.LicPar_conferirAbertura_({ id: 'u_cha', nome: 'CHARLES DIRETOR TESTE' }, a.op('op2')));
});

test('alçada configurada: recusa com o que falta (parecer Financeiro, 2ª aprovação acima de R$ X); duas aprovações distintas levam a Decisão', () => {
  const a = amb();
  a.sim('op1');
  // configuração: versão, motivo e validação
  assert.match(a.par('s_thi', 'cfgSalvar', { faixas: [{ ate: '50.000,00', aprovacoes: 1 }, { aprovacoes: 3 }], motivo: 'Teste de três aprovações' }).message, /só há 2 pessoa\(s\) ativa\(s\) da Diretoria/);
  assert.match(a.par('s_thi', 'cfgSalvar', { faixas: [{ ate: '50.000', aprovacoes: 1 }, { ate: '10.000', aprovacoes: 1 }, { aprovacoes: 2 }], motivo: 'Tetos fora de ordem' }).message, /têm de crescer/);
  assert.match(a.par('s_thi', 'cfgSalvar', { faixas: [{ aprovacoes: 1 }], motivo: 'curto' }).message, /pelo menos 10 letras/);
  const c = a.cfg([{ ate: '50.000', aprovacoes: 1, pareceres: [] }, { aprovacoes: 2, pareceres: ['FINANCEIRA'] }]);
  assert.equal(c.versao, 1);
  assert.deepEqual(J(a.ctx.LicPar_cfg_().faixas), [{ ate: 50000, aprovacoes: 1, pareceres: [] }, { ate: null, aprovacoes: 2, pareceres: ['FINANCEIRA'] }]);
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'ALCADAS' && /acima de R\$ 50\.000,00: 2 aprovação/.test(h.PARA)));
  assert.equal(a.par('s_thi', 'cfgSalvar', { faixas: [{ ate: 50000, aprovacoes: 1, pareceres: [] }, { aprovacoes: 2, pareceres: ['FINANCEIRA'] }], motivo: 'Mesma coisa de novo' }).semMudanca, true);
  // R$ 98.765,43 está acima de R$ 50.000: falta o parecer Financeiro
  const r0 = a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Nota boa e equipe disponível' });
  assert.equal(r0.ok, false); assert.match(r0.message, /falta o parecer Financeiro \(obrigatório na faixa acima de R\$ 50\.000,00: R\$ 98\.765,43, valor estimado do edital\).*Nada foi alterado/);
  assert.equal((a.tabelas.LIC_APROVACOES || []).length, 0);
  a.ok(a.registrar('s_fab', a.pedir('FINANCEIRA', 'u_fab').pedido.id, 'FAVORAVEL'));
  // 1ª aprovação: registrada, passagem recusada com a 2ª
  const r1 = a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Parecer Financeiro favorável e nota boa' }));
  assert.equal(r1.transicao, false); assert.match(r1.texto, /Sua aprovação ficou registrada \(1 de 2\).*falta a 2ª aprovação da Diretoria, valor acima de R\$ 50\.000,00/);
  assert.equal(a.op('op1').SITUACAO, 'ANALISE');
  // a mesma pessoa de novo: recusa
  assert.match(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Aprovando de novo por engano' }).message, /Você já aprovou.*de outra pessoa da Diretoria/);
  assert.equal(a.tabelas.LIC_APROVACOES.length, 1);
  // Central de disputas: abrir direto também confere (quem abre conta como uma aprovação)
  const b = amb(); b.sim('op1');
  b.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2 }]);
  assert.throws(() => b.ctx.LicPar_conferirAbertura_({ id: 'u_thi', nome: 'THIAGO DONO TESTE' }, b.op('op1')), /abrir a disputa.*falta a 2ª aprovação da Diretoria, valor acima de R\$ 50\.000,00/);
  b.ok(b.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Primeira aprovação para a disputa' }));
  assert.doesNotThrow(() => b.ctx.LicPar_conferirAbertura_({ id: 'u_thi', nome: 'THIAGO DONO TESTE' }, b.op('op1')));
  // 2ª pessoa: vai para Decisão, com os dois nomes no histórico
  const r2 = a.ok(a.par('s_thi', 'aprovar', { id: 'op1', motivo: 'De acordo com a Diretoria e o Financeiro' }));
  assert.equal(r2.transicao, true); assert.equal(a.op('op1').SITUACAO, 'DECISAO');
  assert.match(a.tabelas.LIC_HISTORICO.find((h) => h.TIPO === 'PARTICIPACAO_APROVADA').TEXTO, /CHARLES DIRETOR TESTE e THIAGO DONO TESTE \(2 de 2/);
  // faixa de baixo continua com um diretor; valor sigiloso vale a faixa mais alta
  const v = amb(); v.sim('op1', { TOTAL_PROPOSTA: 9000 }); v.op('op1').VALOR_ESTIMADO = 30000;
  v.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2 }]);
  assert.equal(v.ok(v.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Valor pequeno, um diretor basta' })).transicao, true);
  const s = amb(); s.op('op1').VALOR_ESTIMADO = ''; s.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2 }]);
  const fs0 = s.ok(s.par('s_cha', 'ficha', { id: 'op1' })).alcada;
  assert.equal(fs0.necessarias, 2); assert.match(fs0.valorOrigem, /vale a faixa mais alta/);
});

test('Central de disputas: abrir direto de Em análise com a alçada padrão continua; com duas aprovações, recusa e diz o que falta', () => {
  const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
  const prep = () => {
    const a = ambienteProposta();
    for (const f of ['SGO_Licitacoes_Disputa.js', 'SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Pareceres.js']) vm.runInContext(a.ler(f), a.ctx, { filename: f });
    a.tabelas.LIC_OPORTUNIDADES[0].LEI = '14133';
    a.simular('op1', [{ numero: '1', descricao: 'Calibração de termômetro digital com certificado', codigo: 'CAL-001', quantidade: 100, precoEdital: '200,00', precoProposta: '199,00', origem: 'PNCP' }], 'Simulação para a disputa');
    ok(a.prop('s_dora', 'montar', { id: 'op1', usarIA: false }));
    const pid = ok(a.prop('s_dora', 'tela', { id: 'op1' })).proposta.atual.id;
    ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: pid, motivo: 'Preços e escopo conferidos' }));
    ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: pid }));
    a.abrir = (sid) => a.ctx.Licitacoes_api(sid, 'disputa', { op: 'abrir', id: 'op1', motivo: 'Proposta emitida e piso conferido pela Diretoria' });
    a.par = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'pareceres', Object.assign({ op }, d || {}));
    return a;
  };
  const a = prep();
  ok(a.abrir('s_dora'));
  assert.equal(a.tabelas.LIC_OPORTUNIDADES[0].SITUACAO, 'DISPUTA', 'padrão: um diretor abre, como antes');
  const b = prep();
  ok(b.par('s_admin', 'cfgSalvar', { faixas: [{ ate: '10.000', aprovacoes: 1 }, { aprovacoes: 2 }], motivo: 'Acima de dez mil, duas aprovações' })); vigorar(b.tabelas);
  const r = b.abrir('s_dora');
  assert.equal(r.ok, false); assert.match(r.message, /falta a 2ª aprovação da Diretoria, valor acima de R\$ 10\.000,00.*Nada foi gravado/);
  assert.equal(b.tabelas.LIC_OPORTUNIDADES[0].SITUACAO, 'ANALISE'); assert.equal((b.tabelas.LIC_DISPUTAS || []).length, 0);
  ok(b.par('s_admin', 'aprovar', { id: 'op1', motivo: 'Primeira aprovação do Administrador' }));
  ok(b.abrir('s_dora'));
  assert.equal(b.tabelas.LIC_OPORTUNIDADES[0].SITUACAO, 'DISPUTA');
});

// ------------------------------------------------------------------ alertas
test('alertas: pedido de parecer e parecer recebido pela fila de Licitações, só no expediente, modelo aprovado, sem escalonamento; cancelado não sai', () => {
  const a = amb({ agora: '2026-10-26T20:00:00-03:00' });
  const r = a.pedir('TECNICA', 'u_gil');
  const al = () => a.al({ TIPO: 'PARECER_PEDIDO' });
  assert.equal(al().length, 1); assert.equal(al()[0].USUARIO_ID, 'u_gil'); assert.equal(al()[0].PAPEL, 'AVISO');
  assert.equal(al()[0].LIBERAR_EM, '2026-10-27T11:00:00.000Z', 'fora do expediente: fica para 08:00 do próximo dia útil');
  a.rodada('2026-10-26T20:05:00-03:00');
  assert.equal(al()[0].SITUACAO, 'PROGRAMADO');
  a.rodada('2026-10-27T08:05:00-03:00');
  const x = al()[0];
  assert.equal(x.SITUACAO, 'ENVIADO'); assert.equal(x.EMAIL_SITUACAO, 'ENVIADO'); assert.equal(x.ESCALONAR_EM || '', '', 'sem escalonamento para a Diretoria');
  const mail = a.emails.find((m) => /parecer Técnico pedido/.test(m.subject || ''));
  assert.ok(mail, 'e-mail do pedido'); assert.equal(mail.to, 'gil@exemplo.test');
  assert.doesNotMatch(String(mail.body || mail.htmlBody), /52\.000|custo/i);
  // WhatsApp: só pelo modelo aprovado
  assert.ok(a.whats.every((w) => w.corpo.type !== 'text'), 'nenhum texto livre');
  assert.ok(a.whats.filter((w) => w.corpo.template).every((w) => w.corpo.template.name === 'sgo_licitacao_prazo' || w.corpo.template.name === 'sgo_gestao_acao'));
  // registrar: ciência do aviso, aviso "recebido" para quem pediu
  a.ok(a.registrar('s_gil', r.pedido.id, 'RESSALVA'));
  assert.equal(al()[0].SITUACAO, 'CIENTE');
  const rec = a.al({ TIPO: 'PARECER_RECEBIDO' });
  assert.equal(rec.length, 1); assert.equal(rec[0].USUARIO_ID, 'u_cha');
  a.rodada('2026-10-27T08:10:00-03:00');
  assert.equal(a.al({ TIPO: 'PARECER_RECEBIDO' })[0].SITUACAO, 'ENVIADO');
  assert.ok(a.emails.some((m) => m.to === 'charles@exemplo.test' && /parecer Técnico recebido \(com ressalva\)/.test(m.subject || '')));
  // link do aviso: a pessoa do pedido abre "Meus pareceres"; outra pessoa, recusado
  const lk = a.ctx.Lic_avisoAbrir_({ userId: 'u_gil', usuario: 'gil', perfil: 'GESTOR' }, x.AVISO_ID);
  assert.equal(lk.ok, true); assert.equal(lk.tela.mod, 'licitacoes_pareceres'); assert.equal(lk.tela.pedido, r.pedido.id);
  assert.equal(a.ctx.Lic_avisoAbrir_({ userId: 'u_vera', usuario: 'vera', perfil: 'COMERCIAL' }, x.AVISO_ID).outraPessoa, true);
  // pedido cancelado antes do aviso sair: o aviso é cancelado com o motivo
  const b = amb({ agora: '2026-10-31T10:00:00-03:00' });   // sábado
  const p = b.pedir('FINANCEIRA', 'u_fab');
  b.ok(b.par('s_cha', 'cancelar', { pedidoId: p.pedido.id, motivo: 'Fabio está de férias esta semana' }));
  const bx = b.al({ TIPO: 'PARECER_PEDIDO' })[0];
  assert.equal(bx.SITUACAO, 'CANCELADO'); assert.match(bx.CANCELADO_MOTIVO, /cancelado por CHARLES/);
  assert.ok(b.atvs().every((t) => t.SITUACAO === 'Cancelada'));
});

// ------------------------------------------------------------------ telas
function tela(o) {
  o = o || {};
  const script = (f) => { const h = lerCru(f); return h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>')); };
  const els = {}, el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('menu-secao-licitacoes'); el('licCorpo');
  const chamadas = [];
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: o.perfil || 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push([acao, d && d.op]); const k = acao + (d && d.op ? ':' + d.op : ''); if (o.respostas && o.respostas[k]) ok(Object.assign({ ok: true }, o.respostas[k])); } }; } }; } } } } });
  vm.runInContext(script('JS_Licitacoes.html'), ctx); vm.runInContext(script('JS_Licitacoes_Pareceres.html'), ctx);
  return { ctx, els, chamadas };
}
test('telas: aba Pareceres (quadro, divergências, alçada, pedir por área), Meus pareceres e a tela do pedido, Alçadas e pareceres; computador e celular 390 px; escape', () => {
  const a = amb({ cap: 4 });
  a.sim('op1');
  const ped = a.pedir('TECNICA', 'u_gil', { pergunta: '<script>alert(1)</script> temos equipe?' });
  a.ok(a.registrar('s_gil', ped.pedido.id, 'FAVORAVEL', 'Equipe ok <img src=x onerror=alert(1)> e padrões calibrados'));
  a.pedir('FINANCEIRA', 'u_fab');
  const ficha = a.ok(a.par('s_cha', 'ficha', { id: 'op1' }));
  for (const cel of [false, true]) {
    const t = tela({ celular: cel });
    const h = t.ctx.LicPa_htmlFicha_(ficha);
    assert.match(h, /Decisão pela alçada/); assert.match(h, /Pareceres e divergências/); assert.match(h, /Pedir parecer às áreas/);
    assert.match(h, /data-lpa-aprovar/); assert.match(h, /Divergências apontadas pelo sistema/); assert.match(h, /capacidade técnica da análise/);
    assert.match(h, /data-lpa-cancelar="/); assert.match(h, /data-lpa-pedir="COMERCIAL"/); assert.match(h, /Pedido aberto/);
    assert.doesNotMatch(h, /<img src=x/); assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.equal((h.match(/data-r="Área"/g) || []).length, 4, 'tabela vira cartões no celular (data-r)');
  }
  const meus = a.ok(a.par('s_fab', 'meus'));
  const t = tela({ perfil: 'FINANCEIRO' });
  const hm = t.ctx.LicPa_htmlMeus_(meus);
  assert.match(hm, /Pedidos de parecer para você \(1\)/); assert.match(hm, /data-lpa-abrir="/); assert.doesNotMatch(hm, /Todos os pedidos em aberto/);
  const tp = a.ok(a.par('s_fab', 'tela', { pedidoId: meus.abertos[0].id }));
  const ht = t.ctx.LicPa_htmlTela_(tp);
  for (const s of ['Resumo', 'Nota da análise', 'Leitura do edital', 'Preço', 'Habilitação', 'Registrar o parecer', 'name="lpaPos" value="CONTRARIO"']) assert.ok(ht.includes(s), s);
  assert.equal(tp.nivelPreco, 'COMPLETO'); assert.match(ht, />Custo</); assert.match(ht, />Margem da proposta</); assert.match(ht, /Piso da Diretoria/);
  // Técnica: o quadro do preço diz que o preço não faz parte do parecer
  const tt = a.ok(a.par('s_cha', 'tela', { pedidoId: ped.pedido.id }));
  assert.match(t.ctx.LicPa_htmlTela_(Object.assign({}, tt, { gestao: false, nivelPreco: 'NENHUM', preco: null })), /O preço não faz parte do parecer da sua área/);
  // a Diretoria vê todos os abertos
  assert.match(t.ctx.LicPa_htmlMeus_(a.ok(a.par('s_cha', 'meus'))), /Todos os pedidos em aberto \(Diretoria\) \(1\)/);
  // Alçadas e pareceres (Portais e configurações)
  const cfg = a.ok(a.par('s_cha', 'cfg'));
  const hc = t.ctx.LicPa_htmlCfg_(cfg);
  assert.match(hc, /Em uso o padrão: um diretor basta/); assert.match(hc, /id="lpaBase"/); assert.match(hc, /Quem dá o parecer de cada área/); assert.match(hc, /Só o Administrador muda as alçadas/); assert.doesNotMatch(hc, /data-lpa-salvar/);
  assert.match(t.ctx.LicPa_htmlCfg_(a.ok(a.par('s_thi', 'cfg'))), /data-lpa-salvar/, 'o Administrador grava');
  // menu: quem não é da Diretoria e tem pedido aberto vê o grupo; sem pedido, não
  const m1 = tela({ perfil: 'FINANCEIRO', respostas: { acesso: { nivel: 'NENHUM', pareceresAbertos: 1 } } }); m1.ctx.Licitacoes_iniciar_();
  assert.equal(m1.els['menu-secao-licitacoes'].style.display, '');
  const m2 = tela({ perfil: 'FINANCEIRO', respostas: { acesso: { nivel: 'NENHUM', pareceresAbertos: 0 } } }); m2.ctx.Licitacoes_iniciar_();
  assert.equal(m2.els['menu-secao-licitacoes'].style.display, 'none');
  // "Meus pareceres" para quem não é da Diretoria: casca sem a navegação do módulo e a chamada "meus"
  const m3 = tela({ perfil: 'FINANCEIRO', celular: true, respostas: { acesso: { nivel: 'NENHUM', pareceresAbertos: 1 }, 'pareceres:meus': meus } });
  m3.ctx.Licitacoes_render_('licitacoes_pareceres');
  assert.doesNotMatch(m3.els.conteudo.innerHTML, /cm-nav-mob/); assert.match(m3.els.conteudo.innerHTML, /Meus pareceres/);
  assert.ok(m3.chamadas.some((c) => c[0] === 'pareceres' && c[1] === 'meus'));
  // Kanban: o botão "Participar" fica ligado quando a regra existe
  const kb = a.ok(J(a.api('s_cha', 'kanban')));
  assert.equal(kb.regras.participar.acao, 'participar');
  // CSS sem largura fixa maior que a tela do celular e sem atualização automática
  const css = lerCru('JS_Licitacoes_Pareceres.html');
  for (const m of css.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  assert.doesNotMatch(css, /setInterval/);
});

// ------------------------------------------------------------------ integração
test('integração: arquivos ligados no Index, menu, ajuda da tela, manual e base do assistente, CRLF, sem emoji', () => {
  const idx = lerCru('Index.html');
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Pareceres'\); \?>/);
  const grupo = idx.slice(idx.indexOf('id="menu-secao-licitacoes"'), idx.indexOf('<!-- 29/10/2026: módulo Representação'));
  assert.match(grupo, /data-mod="licitacoes_pareceres"[^>]*onclick="abrir\('licitacoes_pareceres'\)"/);
  const a = amb();
  for (const f of ['SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_Ajuda_LicitacoesPareceres.js']) vm.runInContext(ler(f), a.ctx);
  const t = a.ctx.SGO_ajudaTelas_LicitacoesPareceres_().licitacoes_pareceres;
  assert.ok(t && t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length);
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_pareceres); assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_pareceres);
  const opo = a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades;
  assert.ok(opo.passos.some((p) => /Pareceres/.test(p.titulo)), 'ajuda da ficha cita a aba Pareceres');
  assert.ok(a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_portais.passos.some((p) => /Alçadas e pareceres/.test(p.titulo)));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /## Pareceres por área e alçadas de decisão/); assert.match(manual, /LIC_PARECER_PEDIDOS/); assert.match(manual, /LIC_APROVACOES/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Pareceres por área e alçadas de decisão/, 'base do assistente regerada');
  const textos = ['SGO_Licitacoes_Pareceres.js', 'JS_Licitacoes_Pareceres.html', 'SGO_Ajuda_LicitacoesPareceres.js'].map(lerCru).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sem emoji');
  for (const f of ['SGO_Licitacoes_Pareceres.js', 'JS_Licitacoes_Pareceres.html', 'SGO_Ajuda_LicitacoesPareceres.js', 'JS_Licitacoes.html', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Alertas.js', 'SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Disputa.js']) {
    assert.match(lerCru(f), /\r\n/, f + ' em CRLF'); assert.doesNotMatch(lerCru(f), /[^\r]\n/, f + ' sem LF solto');
  }
});

// ------------------------------------------------------------------ revisão de e361160 (um teste para cada ponto)
test('revisão ALTA 1: aprovar a participação e descartar cancelam os pedidos abertos e as atividades (Minhas atividades, com o motivo); reabrir não traz o pedido de volta', () => {
  const a = amb();
  a.sim('op1');
  const t = a.pedir('TECNICA', 'u_gil'), f = a.pedir('FINANCEIRA', 'u_fab');
  const r = a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Nota boa, piso coberto e equipe disponível' }));
  assert.equal(r.pedidosCancelados, 2); assert.match(r.texto, /2 pedido\(s\) de parecer aberto\(s\) foram cancelados/);
  assert.ok(a.tabelas.LIC_PARECER_PEDIDOS.every((p) => p.SITUACAO === 'CANCELADO' && /participação aprovada/.test(p.CANCELADO_MOTIVO)));
  assert.equal(a.atvs().length, 2); assert.ok(a.atvs().every((x) => x.SITUACAO === 'Cancelada'), 'atividades canceladas pela função de Minhas atividades');
  assert.ok((a.tabelas.ATV_HISTORICO || []).some((h) => /Pedido de parecer encerrado pela decisão/.test(h.TEXTO || '')), 'com o motivo no histórico da atividade');
  assert.ok(a.al({ TIPO: 'PARECER_PEDIDO' }).every((x) => x.SITUACAO === 'CANCELADO'));
  assert.match(a.par('s_gil', 'tela', { pedidoId: t.pedido.id }).message, /cancelado/);
  // descartar e reabrir
  const b = amb();
  const p = b.pedir('COMERCIAL', 'u_vera');
  b.ok(J(b.api('s_cha', 'descartar', { id: 'op1', motivo: 'O órgão exige acreditação que não temos' })));
  assert.equal(b.tabelas.LIC_PARECER_PEDIDOS[0].SITUACAO, 'CANCELADO'); assert.equal(b.atvs()[0].SITUACAO, 'Cancelada');
  b.ok(J(b.api('s_cha', 'reabrir', { id: 'op1', motivo: 'Errata tirou a exigência de acreditação' })));
  assert.equal(b.tabelas.LIC_PARECER_PEDIDOS[0].SITUACAO, 'CANCELADO', 'o pedido antigo não volta');
  assert.equal(b.ok(b.par('s_vera', 'meus')).abertos.length, 0);
  assert.match(b.par('s_vera', 'tela', { pedidoId: p.pedido.id }).message, /cancelado/);
  assert.ok(b.pedir('COMERCIAL', 'u_vera').pedido.id, 'a Diretoria pede de novo');
  assert.equal(b.atvs().filter((x) => x.SITUACAO !== 'Cancelada').length, 1);
});

test('revisão ALTA 1 e MÉDIA 2: abrir a disputa e registrar o contrato manual cancelam os pedidos; o contrato manual de Em análise confere a alçada', () => {
  const { ambienteContratos } = require('./_licitacoes_contratos_ambiente.cjs');
  const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
  // disputa aberta na preparação do ambiente: o pedido feito antes precisa de um ambiente sem a disputa aberta
  const a = ambienteProposta();
  for (const x of ['SGO_Licitacoes_Disputa.js', 'SGO_Licitacoes_Painel.js']) vm.runInContext(a.ler(x), a.ctx, { filename: x });
  a.tabelas.LIC_OPORTUNIDADES[0].LEI = '14133';
  a.simular('op1', [{ numero: '1', descricao: 'Calibração de termômetro digital com certificado', codigo: 'CAL-001', quantidade: 100, precoEdital: '200,00', precoProposta: '199,00', origem: 'PNCP' }], 'Simulação para a disputa');
  ok(a.prop('s_dora', 'montar', { id: 'op1', usarIA: false }));
  const pid = ok(a.prop('s_dora', 'tela', { id: 'op1' })).proposta.atual.id;
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: pid, motivo: 'Preços e escopo conferidos' })); ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: pid }));
  const ped = ok(a.ctx.Licitacoes_api('s_dora', 'pareceres', { op: 'pedir', id: 'op1', area: 'LICITACOES', usuarioId: 'u_adm' }));
  const rd = ok(a.ctx.Licitacoes_api('s_dora', 'disputa', { op: 'abrir', id: 'op1', motivo: 'Proposta emitida e piso conferido pela Diretoria' }));
  assert.match(rd.texto, /1 pedido\(s\) de parecer aberto\(s\) foram cancelados/);
  assert.equal(a.tabelas.LIC_PARECER_PEDIDOS.find((x) => x.ID === ped.pedido.id).SITUACAO, 'CANCELADO');
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === ped.atividade.id).SITUACAO, 'Cancelada');
  // BAIXA 5: quem abriu a disputa direto de Em análise gravou a aprovação dele
  const ap = a.tabelas.LIC_APROVACOES.find((x) => x.OPORTUNIDADE_ID === 'op1');
  assert.equal(ap.USUARIO_ID, 'u_dir'); assert.equal(ap.ORIGEM, 'DISPUTA'); assert.equal(Number(ap.SIMULACAO_VERSAO), 1);
  // contrato manual de op2 (Em análise): com duas aprovações acima de R$ 1.000, recusa; com a aprovação do Administrador, passa e fecha o pedido
  const c = ambienteContratos();
  ok(c.ctx.Licitacoes_api('s_admin', 'pareceres', { op: 'cfgSalvar', faixas: [{ ate: '1.000', aprovacoes: 1 }, { aprovacoes: 2 }], motivo: 'Acima de mil reais, duas aprovações' })); vigorar(c.tabelas);
  const pedC = ok(c.ctx.Licitacoes_api('s_dora', 'pareceres', { op: 'pedir', id: 'op2', area: 'LICITACOES', usuarioId: 'u_adm' }));
  const m = () => c.ct('s_dora', 'criar', { id: 'op2', origem: 'MANUAL', motivo: 'Resultado da disputa feito fora do SGO+, no portal do órgão', fonte: 'termo de homologação publicado no PNCP em 20/11/2026',
    campos: { numeroContrato: 'CT 45/2026', inicio: '2026-12-01', fim: '2027-05-31', itens: [{ item: '1', codigo: 'QUA-001', nome: 'Qualificação de autoclave', quantidade: '2', valorUnit: '3.200,00' }] } });
  const r0 = m();
  assert.equal(r0.ok, false); assert.match(r0.message, /registrar o contrato: a participação ainda não passou pela alçada \(falta a 2ª aprovação da Diretoria, valor acima de R\$ 1\.000,00/);
  assert.equal(c.op('op2').SITUACAO, 'ANALISE'); assert.equal((c.tabelas.LIC_CONTRATOS || []).filter((x) => x.OPORTUNIDADE_ID === 'op2').length, 0);
  c.simular('op2', [{ numero: '1', descricao: 'Qualificação de autoclave', codigo: 'QUA-001', quantidade: 2, precoEdital: '3.500,00', precoProposta: '3.200,00', origem: 'PNCP' }], 'Simulação da qualificação');
  ok(c.ctx.Licitacoes_api('s_admin', 'pareceres', { op: 'aprovar', id: 'op2', motivo: 'Primeira aprovação do Administrador' }));
  ok(m());
  assert.equal(c.op('op2').SITUACAO, 'CONTRATO');
  assert.equal(c.tabelas.LIC_PARECER_PEDIDOS.find((x) => x.ID === pedC.pedido.id).SITUACAO, 'CANCELADO');
  assert.ok(c.tabelas.LIC_APROVACOES.some((x) => x.OPORTUNIDADE_ID === 'op2' && x.ORIGEM === 'CONTRATO' && x.USUARIO_ID === 'u_dir'));
});

test('revisão MÉDIA 3: a aprovação guarda a simulação, o valor, a faixa e as alçadas; simulação nova recomeça a contagem (aprovações e pareceres obrigatórios)', () => {
  const a = amb();
  a.sim('op1');
  a.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2, pareceres: ['FINANCEIRA'] }]);
  a.ok(a.registrar('s_fab', a.pedir('FINANCEIRA', 'u_fab').pedido.id, 'FAVORAVEL'));
  a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Parecer Financeiro favorável e nota boa' }));
  const ap = a.tabelas.LIC_APROVACOES[0];
  assert.equal(Number(ap.SIMULACAO_VERSAO), 1); assert.equal(Number(ap.ALCADA_VERSAO), 1); assert.equal(Number(ap.VALOR_BASE), 98765.43);
  assert.match(ap.FAIXA, /acima de R\$ 50\.000,00/); assert.deepEqual(JSON.parse(ap.ALCADA_JSON).faixas[1], { ate: null, aprovacoes: 2, pareceres: ['FINANCEIRA'] });
  // simulação nova: a aprovação de Charles e o parecer Financeiro deixam de contar
  a.sim('op1', { TOTAL_PROPOSTA: 97000 });
  const al = a.ok(a.par('s_thi', 'ficha', { id: 'op1' })).alcada;
  assert.equal(al.aprovacoes.length, 0); assert.equal(al.simVersao, 2);
  assert.match(al.faltas.join(' '), /falta o parecer Financeiro .*foi dado sobre outra versão da simulação; vale a versão 2/);
  assert.match(a.par('s_thi', 'aprovar', { id: 'op1', motivo: 'Aprovar sobre a simulação nova' }).message, /falta o parecer Financeiro/);
  // parecer novo sobre a simulação 2 e duas aprovações novas
  a.ok(a.registrar('s_fab', a.pedir('FINANCEIRA', 'u_fab').pedido.id, 'FAVORAVEL', 'Com a simulação nova o piso continua coberto em todos os itens', { motivoNovaVersao: 'Simulação refeita com o preço novo' }));
  assert.equal(a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Aprovação sobre a simulação versão dois' })).transicao, false);
  assert.equal(a.ok(a.par('s_thi', 'aprovar', { id: 'op1', motivo: 'Segunda aprovação sobre a versão dois' })).transicao, true);
  // o hash protege os campos novos
  a.tabelas.LIC_APROVACOES[0].SIMULACAO_VERSAO = 2;
  assert.notEqual(a.ctx.LicPar_hashAprovacao_(a.tabelas.LIC_APROVACOES[0]), a.tabelas.LIC_APROVACOES[0].HASH);
});

test('revisão MÉDIA 4: só o Administrador muda as alçadas; a versão nova não se aplica à oportunidade com aprovação em andamento', () => {
  const a = amb();
  a.sim('op1'); a.sim('op2');
  const r = a.par('s_cha', 'cfgSalvar', { faixas: [{ aprovacoes: 1 }], motivo: 'Diretor tentando mudar a regra' });
  assert.equal(r.ok, false); assert.match(r.message, /só o Administrador muda as alçadas.*Nada foi alterado/);
  assert.equal(a.ok(a.par('s_cha', 'cfg')).podeMudar, false); assert.equal(a.ok(a.par('s_thi', 'cfg')).podeMudar, true);
  a.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2 }]);
  a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Primeira aprovação na versão um' }));
  // versão 2: passa a exigir o parecer Financeiro
  a.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2, pareceres: ['FINANCEIRA'] }], { motivo: 'Dono pediu o parecer Financeiro acima de 50 mil' });
  const f1 = a.ok(a.par('s_thi', 'ficha', { id: 'op1' })).alcada;
  assert.equal(f1.versao, 1); assert.equal(f1.congelada, true); assert.deepEqual(f1.obrigatorios, []);
  assert.equal(a.ok(a.par('s_thi', 'aprovar', { id: 'op1', motivo: 'Segunda aprovação, regra da versão um' })).transicao, true, 'vale a versão da primeira aprovação');
  // a outra oportunidade, sem aprovação, já segue a versão 2
  const f2 = a.ok(a.par('s_thi', 'ficha', { id: 'op2' })).alcada;
  assert.equal(f2.versao, 2); assert.deepEqual(f2.obrigatorios, ['Financeira']);
  assert.match(a.par('s_thi', 'aprovar', { id: 'op2', motivo: 'Sem o parecer Financeiro' }).message, /falta o parecer Financeiro/);
});

test('revisão BAIXA 5: preço por área (Técnica e Comercial nada, Licitações o preço da proposta, Financeira tudo); erro na alçada recusa a disputa; operação herdada recusada', () => {
  const a = amb();
  a.sim('op1');
  const vis = (area, uid, sid) => { const p = a.pedir(area, uid); const t = a.ok(a.par(sid, 'tela', { pedidoId: p.pedido.id })); return t; };
  const tc = vis('COMERCIAL', 'u_vera', 's_vera');
  assert.equal(tc.preco, null); assert.equal(tc.nivelPreco, 'NENHUM'); assert.doesNotMatch(JSON.stringify(tc), /95000|acimaDoPiso/);
  const tf = vis('FINANCEIRA', 'u_fab', 's_fab');
  assert.equal(tf.nivelPreco, 'COMPLETO'); assert.equal(tf.preco.totalCusto, 52000); assert.equal(tf.preco.totalPiso, 80000); assert.equal(tf.preco.margemPct, 45.3); assert.equal(tf.preco.acimaDoPiso, true);
  assert.match(tf.nota.criterios.find((c) => c.codigo === 'margem').como, /Sobra/);
  // Licitações: a pessoa da área é da Diretoria; quem não é gestão e foi posta na lista da área vê só o preço da proposta
  a.cfg([{ aprovacoes: 1 }], { areas: { LICITACOES: { pessoas: ['u_gil'] } }, motivo: 'Gil responde pela área de Licitações' });
  const tl = vis('LICITACOES', 'u_gil', 's_gil');
  assert.equal(tl.nivelPreco, 'PROPOSTA'); assert.equal(tl.preco.totalProposta, 95000);
  for (const k of ['totalPiso', 'totalCusto', 'margemPct', 'acimaDoPiso', 'abaixoPiso']) assert.equal(tl.preco[k], undefined, k);
  // erro no cálculo da alçada: a abertura da disputa é recusada
  const orig = a.ctx.LicPar_alcada_;
  a.ctx.LicPar_alcada_ = () => { throw new Error('planilha das alçadas ilegível'); };
  assert.throws(() => a.ctx.LicPar_conferirAbertura_({ id: 'u_cha', nome: 'CHARLES DIRETOR TESTE' }, a.op('op1')), /abrir a disputa: a alçada não pôde ser conferida agora \(planilha das alçadas ilegível\)/);
  a.ctx.LicPar_alcada_ = orig;
  // operação herdada do Object não vira ação
  for (const op of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) { const x = a.par('s_cha', op, {}); assert.equal(x.ok, false, op); assert.match(x.message, /operação de pareceres desconhecida/, op); }
});

// ------------------------------------------------------------------ revisão de bf3860b (um teste para cada ponto)
test('revisão bf3860b 1: a regra do radar não descarta sozinha a oportunidade com parecer pedido; fica no Radar com a anotação no histórico', () => {
  const item = { chave: 'PNCP:op2', versao: 1, hash: 'h1', portalOrigem: 'PNCP', contratacao: { orgaoNome: 'HOSPITAL ESTADUAL TESTE', uf: 'PR', objeto: 'Manutenção com calibração' },
    triagem: { resultado: 'DESCARTADA', motivo: 'Termo que descarta: calibragem de pneus', regra: 'NEG-12', versao: 'TRI-2026-11-03' } };
  const coletor = (a) => { let n = 0; a.ctx.SGO_LICITACOES = { listar: () => (n++ ? { itens: [], ate: 'x2', mais: false } : { itens: [item], ate: 'x1', mais: false }), situacao: () => ({}) }; };
  const a = amb();
  a.pedir('TECNICA', 'u_gil', { id: 'op2' });
  coletor(a); a.ctx.Lic_sincronizar_(null);
  assert.equal(a.op('op2').SITUACAO, 'RADAR', 'continua no Radar');
  assert.equal(a.op('op2').TRIAGEM, 'DESCARTADA', 'a triagem nova fica gravada');
  const h = a.tabelas.LIC_HISTORICO.find((x) => x.TIPO === 'DESCARTE_PELA_REGRA_SUSPENSO');
  assert.ok(h); assert.match(h.TEXTO, /A regra do radar NEG-12 a descartaria \(Termo que descarta: calibragem de pneus\), mas há parecer pedido às áreas: fica no Radar e a Diretoria decide/);
  assert.equal(a.tabelas.LIC_PARECER_PEDIDOS[0].SITUACAO, 'ABERTO', 'o pedido continua aberto');
  // sem pedido de parecer: a regra descarta como antes
  const b = amb(); coletor(b); b.ctx.Lic_sincronizar_(null);
  assert.equal(b.op('op2').SITUACAO, 'DESCARTADA'); assert.equal(b.op('op2').DESCARTE_ORIGEM, 'REGRA');
});

test('revisão bf3860b 2: só a atividade ainda aberta é cancelada (concluída ou cancelada não é mexida), na decisão e no cancelamento do pedido', () => {
  const a = amb();
  a.sim('op1');
  const p1 = a.pedir('TECNICA', 'u_gil'), p2 = a.pedir('FINANCEIRA', 'u_fab');
  a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === p1.atividade.id).SITUACAO = 'Concluída';
  const hist0 = (a.tabelas.ATV_HISTORICO || []).length;
  const ac = a.ctx.Atividades_apiMudarSituacao; let chamadas = 0;
  a.ctx.Atividades_apiMudarSituacao = function () { chamadas++; return ac.apply(this, arguments); };
  const r = a.ok(a.par('s_cha', 'aprovar', { id: 'op1', motivo: 'Nota boa, piso coberto e equipe disponível' }));
  assert.equal(r.pedidosCancelados, 2, 'os dois pedidos fecham');
  assert.equal(chamadas, 1, 'só a atividade aberta foi cancelada');
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === p1.atividade.id).SITUACAO, 'Concluída');
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === p2.atividade.id).SITUACAO, 'Cancelada');
  assert.doesNotMatch(r.texto, /Não foi possível cancelar/);
  // cancelamento do pedido com a atividade já cancelada em Minhas atividades
  const b = amb();
  const p = b.pedir('COMERCIAL', 'u_vera');
  b.tabelas.ATV_ATIVIDADES.find((x) => x.ID === p.atividade.id).SITUACAO = 'Cancelada';
  let n = 0; const bc = b.ctx.Atividades_apiMudarSituacao; b.ctx.Atividades_apiMudarSituacao = function () { n++; return bc.apply(this, arguments); };
  const x = b.ok(b.par('s_cha', 'cancelar', { pedidoId: p.pedido.id, motivo: 'Vera saiu de férias hoje cedo' }));
  assert.equal(n, 0); assert.match(x.texto, /já estava concluída ou cancelada: não foi mexida/);
  assert.ok(hist0 >= 0);
});

test('revisão bf3860b 4: parecer obrigatório sobre a simulação atual vale só para Financeira e Licitações; Técnica e Comercial valem entre simulações', () => {
  const a = amb();
  a.sim('op1');
  a.cfg([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 1, pareceres: ['TECNICA', 'COMERCIAL', 'FINANCEIRA', 'LICITACOES'] }]);
  a.ok(a.registrar('s_gil', a.pedir('TECNICA', 'u_gil').pedido.id, 'FAVORAVEL'));
  a.ok(a.registrar('s_vera', a.pedir('COMERCIAL', 'u_vera').pedido.id, 'FAVORAVEL'));
  a.ok(a.registrar('s_fab', a.pedir('FINANCEIRA', 'u_fab').pedido.id, 'FAVORAVEL'));
  a.ok(a.registrar('s_thi', a.pedir('LICITACOES', 'u_thi').pedido.id, 'FAVORAVEL'));
  assert.deepEqual(a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada.faltas, [], 'todos sobre a simulação 1');
  a.sim('op1', { TOTAL_PROPOSTA: 96000 });
  const faltas = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada.faltas.join(' ');
  assert.match(faltas, /faltam os pareceres de Licitações e Financeiro/);
  assert.doesNotMatch(faltas, /Técnico|Comercial/, 'Técnica e Comercial continuam valendo');
});

test('revisão bf3860b 3: versão nova das alçadas vale a partir das 00:00 de Brasília do dia seguinte; a tela mostra "em vigor" e "vale a partir de"', () => {
  const a = amb();
  a.sim('op1');
  const r = a.cfgSemVigorar([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 2 }]);
  assert.equal(r.valeAPartirDe, '2026-10-27T03:00:00.000Z'); assert.match(r.texto, /Valem a partir de ter 27\/10\/2026 00:00 \(horário de Brasília\).*até lá vale a regra padrão/);
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'ALCADAS' && /Vale a partir de ter 27\/10\/2026 00:00/.test(h.TEXTO)));
  const cfg = a.ok(a.par('s_thi', 'cfg'));
  assert.equal(cfg.emVigor.padrao, true); assert.equal(cfg.pendente.versao, 1); assert.equal(cfg.pendente.valeAPartirDe, '2026-10-27T03:00:00.000Z');
  assert.deepEqual(cfg.editar.faixas.map((f) => f.aprovacoes), [1, 2], 'o formulário parte da última versão gravada');
  // hoje ainda vale o padrão (um diretor)
  assert.equal(a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada.necessarias, 1);
  // a tela
  const t = tela();
  const h = t.ctx.LicPa_htmlCfg_(cfg);
  assert.match(h, /Em vigor<\/span> regra padrão/); assert.match(h, /Vale a partir de ter 27\/10\/2026 00:00<\/span> versão 1/);
  // a partir das 00:00 do dia seguinte vale a versão 1; a segunda versão do dia guarda a 1 como "em vigor" até a meia-noite
  a.mudar('2026-10-27T00:01:00-03:00');
  assert.equal(a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada.necessarias, 2);
  a.cfgSemVigorar([{ ate: 50000, aprovacoes: 1 }, { aprovacoes: 1, pareceres: ['FINANCEIRA'] }], { motivo: 'Uma aprovação com o parecer Financeiro' });
  const c2 = a.ok(a.par('s_thi', 'cfg'));
  assert.equal(c2.emVigor.versao, 1); assert.equal(c2.emVigor.valeAPartirDe, '2026-10-27T03:00:00.000Z'); assert.equal(c2.pendente.versao, 2); assert.equal(c2.pendente.valeAPartirDe, '2026-10-28T03:00:00.000Z');
  const al = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada;
  assert.equal(al.necessarias, 2); assert.deepEqual(al.obrigatorios, []);
  a.mudar('2026-10-28T08:00:00-03:00');
  const al2 = a.ok(a.par('s_cha', 'ficha', { id: 'op1' })).alcada;
  assert.equal(al2.necessarias, 1); assert.deepEqual(al2.obrigatorios, ['Financeira']);
  assert.match(t.ctx.LicPa_htmlCfg_(a.ok(a.par('s_thi', 'cfg'))), /Em vigor<\/span> versão 2 · vale desde qua 28\/10\/2026 00:00/);
});
