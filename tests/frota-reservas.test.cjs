// Frota, reservas de veículo (20/10/2026): sobreposição recusada, retirada que respeita a reserva (folga, dono da reserva,
// liberação só pela gestão com justificativa e aviso), não comparecimento, manutenção programada, conferência da véspera,
// devolução atrasada com reserva a seguir, concorrência (trava do sistema) e nada apagado. Código real do SGO+ num contexto
// isolado, com tabelas em memória e horários relativos a agora (horário de Brasília). Dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession, formatDate } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

/** Data e hora (Brasília) daqui a n minutos. */
const em = (min) => { const d = new Date(Date.now() + min * 60000); return { data: formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy'), hora: formatDate(d, 'America/Sao_Paulo', 'HH:mm') }; };
const dia = (n) => em(n * 1440).data;

function ambiente(tabelasIniciais, sessao, opcoes) {
  opcoes = opcoes || {};
  const tabelas = Object.assign({ CAD_VEICULOS: [], CAD_CONDUTORES: [], CAD_USUARIOS: [], REG_FROTA_MOVIMENTACAO: [], REG_FROTA_MANUTENCAO: [], REG_FROTA_PARADA: [],
    REG_FROTA_DOCUMENTO: [], REG_FROTA_AUDITORIA: [], REG_FROTA_MULTA: [], REG_FROTA_ABASTECIMENTO: [], REG_FROTA_DESPESA: [] }, tabelasIniciais || {});
  let seq = 0;
  const atividades = [], mudancas = [], notificacoes = [], apagados = [];
  let travada = false;
  const props = {};
  const ganchos = { aoLer: null };
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    // trava de verdade: um pedido de cada vez (o segundo, se chegar com a trava presa, falha)
    LockService: { getScriptLock: () => ({ waitLock() { if (travada) throw new Error('trava ocupada'); travada = true; }, releaseLock() { travada = false; }, hasLock: () => travada, tryLock: () => { if (travada) return false; travada = true; return true; } }) },
    SpreadsheetApp: { flush() {} },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail() {} },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => { const copia = (tabelas[t] || []).map((r) => Object.assign({}, r)); if (ganchos.aoLer) ganchos.aoLer(t); return copia; },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, ls) => ls.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq) }, d))),
      deleteById: (t, id) => { apagados.push([t, id]); throw new Error('apagar é proibido'); },
      deleteRow: (t, id) => { apagados.push([t, id]); throw new Error('apagar é proibido'); },
      gerarRegistroBase: (o) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date(Date.now() - (opcoes.criadoHaMin || 0) * 60000).toISOString() }, o),
      normalizarObjetoParaSheet: (t, o) => o,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO',
      REG_FROTA_MULTA: 'REG_FROTA_MULTA', REG_FROTA_MANUTENCAO: 'REG_FROTA_MANUTENCAO', REG_FROTA_DESPESA: 'REG_FROTA_DESPESA', REG_FROTA_PARADA: 'REG_FROTA_PARADA',
      REG_FROTA_ABASTECIMENTO: 'REG_FROTA_ABASTECIMENTO', REG_FROTA_DOCUMENTO: 'REG_FROTA_DOCUMENTO', AUVO_TAREFAS: 'AUVO_TAREFAS' } },
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil),
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    SGO_notificar_: (o) => { notificacoes.push(o); return { ok: 1, erro: 0, pulado: 0 }; },
    Atividades_apiCriar: (token, p) => { const eu = ctx.ATV_PONTE_CTX && ctx.ATV_PONTE_CTX.token === token ? ctx.ATV_PONTE_CTX.eu : null; const item = { ID: 'atv' + (atividades.length + 1), TITULO: p.titulo, RESPONSAVEL_ID: p.responsavelId, PRAZO: p.prazo, PRIORIDADE: p.prioridade, MODULO: p.modulo, SITUACAO: 'A fazer', criadoPor: eu && eu.nome }; atividades.push(item); return { ok: true, item }; },
    Atividades_apiMudarSituacao: (token, p) => { mudancas.push(p); const a = atividades.find((x) => x.ID === p.id); if (a) a.SITUACAO = p.situacao; return { ok: true }; },
    Atividades_todas_: () => atividades.map((a) => Object.assign({}, a)),
    SGO_DocA4_num_: (v, c) => Number(v).toFixed(c || 0).replace('.', ',')
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Expediente.js', 'SGO_Alertas_Central.js', 'SGO_Frota_Reservas.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx);
  }
  return { ctx, tabelas, atividades, mudancas, notificacoes, apagados, ganchos, props, trava: () => travada };
}

const base = () => ({
  CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A11', MODELO: 'Hatch teste', KM_ATUAL: 1000, STATUS: 'ATIVO' }, { ID: 'v2', PLACA: 'TST2B22', MODELO: 'Sedan teste', KM_ATUAL: 5000, STATUS: 'ATIVO' }, { ID: 'v3', PLACA: 'TST3C33', MODELO: 'Utilitário teste', KM_ATUAL: 9000, STATUS: 'ATIVO' }],
  CAD_CONDUTORES: [
    { ID: 'cA', NOME: 'CONDUTORA ANA', USUARIO_ID: 'uA', CNH_VALIDADE: dia(400), STATUS: 'ATIVO' },
    { ID: 'cB', NOME: 'CONDUTOR BRUNO', USUARIO_ID: 'uB', CNH_VALIDADE: dia(400), STATUS: 'ATIVO' },
    { ID: 'cG', NOME: 'GESTORA TESTE', USUARIO_ID: 'uG', CNH_VALIDADE: dia(400), STATUS: 'ATIVO' },
    { ID: 'cV', NOME: 'CONDUTOR VENCIDO', USUARIO_ID: 'uV', CNH_VALIDADE: dia(-1), STATUS: 'ATIVO' }],
  CAD_USUARIOS: [{ ID: 'uA', NOME: 'CONDUTORA ANA', PERFIL: 'TECNICO', STATUS: 'ATIVO' }, { ID: 'uB', NOME: 'CONDUTOR BRUNO', PERFIL: 'TECNICO', STATUS: 'ATIVO' },
    { ID: 'uG', NOME: 'GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO' }, { ID: 'uV', NOME: 'CONDUTOR VENCIDO', PERFIL: 'TECNICO', STATUS: 'ATIVO' }]
});
const ANA = { userId: 'uA', usuario: 'ana', nome: 'CONDUTORA ANA', perfil: 'TECNICO' };
const BRUNO = { userId: 'uB', usuario: 'bruno', nome: 'CONDUTOR BRUNO', perfil: 'TECNICO' };
const GESTORA = { userId: 'uG', usuario: 'gestora', nome: 'GESTORA TESTE', perfil: 'GESTOR' };
const VENCIDO = { userId: 'uV', usuario: 'vencido', nome: 'CONDUTOR VENCIDO', perfil: 'TECNICO' };

const reservar = (ctx, veiculoId, iniMin, fimMin, extra) => {
  const a = em(iniMin), b = em(fimMin);
  return ctx.Frota_apiReservaCriar('s', Object.assign({ veiculoId, dataInicio: a.data, horaInicio: a.hora, dataFim: b.data, horaFim: b.hora, destino: 'Cliente de teste', motivo: 'visita técnica de teste' }, extra || {}));
};
const ck = () => [{ grupo: 'Frente', item: 'Faróis', ok: true, observacao: '' }];
const retirar = (ctx, veiculoId, previstaMin, extra) => {
  const p = em(previstaMin);
  return ctx.Frota_apiIniciarViagem('s', Object.assign({ veiculoId, kmSaida: '1000', checklist: ck(), fotosSalvas: [{ link: '/arquivos/foto-teste', legenda: 'frente' }],
    devolucaoPrevistaData: p.data, devolucaoPrevistaHora: p.hora }, extra || {}));
};
const devolver = (ctx, movId, km) => ctx.Frota_apiFinalizarViagem('s', { movimentacaoId: movId, kmChegada: String(km || 1010), checklist: ck(), fotosSalvas: [{ link: '/arquivos/painel', legenda: 'painel' }], fotosPainelSalvas: [{ link: '/arquivos/painel' }] });

test('Sobreposição: o mesmo veículo não tem duas reservas no mesmo horário; o sistema sugere os livres; a mesma pessoa não segura dois veículos', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas } = ambiente(base(), sessao);
  const r1 = reservar(ctx, 'v1', 24 * 60, 24 * 60 + 240);
  assert.equal(r1.ok, true);
  assert.match(r1.codigo, /^RV-\d{4}-0001$/);
  sessao.atual = BRUNO;
  const r2 = reservar(ctx, 'v1', 24 * 60 + 120, 24 * 60 + 360);
  assert.equal(r2.ok, false);
  assert.equal(r2.conflito, true);
  assert.match(r2.message, /TST1A11 não está livre .*reserva RV-\d{4}-0001 de CONDUTORA ANA/);
  assert.deepEqual(Array.from(r2.livres.map((l) => l.placa)), ['TST2B22', 'TST3C33']);
  assert.match(r2.message, /Livres no mesmo período: TST2B22 \(Sedan teste\), TST3C33/);
  assert.equal(tabelas.REG_FROTA_RESERVA.length, 1);
  assert.ok(tabelas.REG_FROTA_RESERVA_EVENTO.some((e) => e.TIPO === 'RECUSA_SOBREPOSICAO'));
  // encostada (termina às 4 h, a outra começa às 4 h): pode
  assert.equal(reservar(ctx, 'v1', 24 * 60 + 240, 24 * 60 + 300).ok, true);
  // a mesma pessoa, outro veículo, no mesmo horário: recusado
  sessao.atual = ANA;
  const r3 = reservar(ctx, 'v2', 24 * 60 + 60, 24 * 60 + 120);
  assert.equal(r3.ok, false);
  assert.match(r3.message, /você já tem a reserva RV-\d{4}-0001/);
  // CNH vencida não reserva; técnico não reserva em nome de outro (o condutor é sempre o do login)
  sessao.atual = VENCIDO;
  assert.throws(() => reservar(ctx, 'v3', 60, 120), /CNH de CONDUTOR VENCIDO vence em .* antes do fim da reserva/);
  sessao.atual = BRUNO;
  const r4 = reservar(ctx, 'v3', 600, 660, { condutorId: 'cA' });
  assert.equal(r4.ok, true);
  assert.equal(tabelas.REG_FROTA_RESERVA.find((r) => r.ID === r4.id).CONDUTOR_ID, 'cB');
});

test('Retirada respeita a reserva: bloqueada se a devolução prevista + folga de 1 h passa do início da reserva de outra pessoa', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas } = ambiente(base(), sessao);
  assert.equal(reservar(ctx, 'v1', 90, 240).ok, true); // Ana reserva daqui a 1h30
  sessao.atual = BRUNO;
  const b = retirar(ctx, 'v1', 40); // devolve em 40 min + 60 de folga = 100 min > 90
  assert.equal(b.ok, false);
  assert.equal(b.bloqueadoPorReserva, true);
  assert.equal(b.podeLiberar, false);
  assert.match(b.message, /reservado por CONDUTORA ANA de .* \(RV-\d{4}-0001\)/);
  assert.match(b.message, /retire um veículo livre agora \(TST2B22 \(Sedan teste\), TST3C33/);
  assert.match(b.message, /só a gestão \(Administrador, Gestor ou Diretoria\) pode liberar/);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO.length, 0);
  // repetir não conta duas vezes
  retirar(ctx, 'v1', 40);
  assert.equal(tabelas.REG_FROTA_RESERVA_EVENTO.filter((e) => e.TIPO === 'RETIRADA_BLOQUEADA').length, 1);
  // técnico pedindo liberação continua bloqueado
  assert.equal(retirar(ctx, 'v1', 40, { liberarReserva: true, justificativa: 'preciso muito do carro agora para o cliente' }).ok, false);
  // devolve em 20 min + 60 = 80 < 90: pode
  const ok = retirar(ctx, 'v1', 20);
  assert.equal(ok.ok, true);
  const mov = tabelas.REG_FROTA_MOVIMENTACAO[0];
  assert.equal(mov.DEVOLUCAO_PREVISTA_ORIGEM, 'INFORMADA');
  assert.equal(mov.RESERVA_ID, '');
  assert.equal(tabelas.REG_FROTA_RESERVA[0].SITUACAO, 'RESERVADA');
});

test('Dono da reserva retira normalmente: a reserva vira "iniciada" e, na devolução, "concluída"', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas } = ambiente(base(), sessao);
  const r = reservar(ctx, 'v1', 30, 300);
  sessao.atual = BRUNO;
  assert.equal(reservar(ctx, 'v1', 330, 400).ok, true); // reserva de Bruno logo depois
  sessao.atual = ANA;
  const ret = retirar(ctx, 'v1', 300); // devolução prevista no fim da reserva; a de Bruno começa 30 min depois (dentro da folga)
  assert.equal(ret.ok, false, 'a folga vale também para quem tem reserva: a reserva seguinte é de outra pessoa');
  const ret2 = retirar(ctx, 'v1', 260);
  assert.equal(ret2.ok, true);
  assert.equal(ret2.reservaIniciada, r.codigo);
  const res = tabelas.REG_FROTA_RESERVA.find((x) => x.ID === r.id);
  assert.equal(res.SITUACAO, 'INICIADA');
  assert.equal(res.MOVIMENTACAO_ID, ret2.movimentacaoId);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].RESERVA_ID, r.id);
  assert.equal(devolver(ctx, ret2.movimentacaoId).ok, true);
  assert.equal(tabelas.REG_FROTA_RESERVA.find((x) => x.ID === r.id).SITUACAO, 'CONCLUIDA');
});

test('Liberação só pela gestão, com justificativa; o reservante é avisado na hora com os veículos livres; não vira registro "pela gestão"', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas, notificacoes } = ambiente(base(), sessao);
  const r = reservar(ctx, 'v1', 60, 300);
  sessao.atual = GESTORA;
  const b = retirar(ctx, 'v1', 120);
  assert.equal(b.ok, false);
  assert.equal(b.podeLiberar, true);
  assert.match(b.message, /Você é da gestão: para liberar mesmo assim, marque "Liberar mesmo com a reserva"/);
  assert.throws(() => retirar(ctx, 'v1', 120, { liberarReserva: true, justificativa: 'curta' }), /Justificativa obrigatória: liberação do veículo reservado \(RV-/);
  const ok = retirar(ctx, 'v1', 120, { liberarReserva: true, justificativa: 'viagem urgente ao hospital de teste, combinado com a diretoria' });
  assert.equal(ok.ok, true);
  assert.equal(ok.reservaLiberada, r.codigo);
  const mov = tabelas.REG_FROTA_MOVIMENTACAO[0];
  assert.equal(mov.RESERVA_LIBERADA_ID, r.id);
  assert.notEqual(mov.REGISTRO_GESTAO_SAIDA, 'SIM', 'liberação não marca "registrado pela gestão" (não vira sugestão no Programa de conduta)');
  const res = tabelas.REG_FROTA_RESERVA.find((x) => x.ID === r.id);
  assert.equal(res.SITUACAO, 'RESERVADA');
  assert.match(res.LIBERADA_JUSTIFICATIVA, /viagem urgente/);
  const aviso = tabelas.REG_FROTA_RESERVA_AVISO.find((a) => a.TIPO === 'LIBERACAO_GESTAO');
  assert.equal(aviso.DESTINATARIO_ID, 'uA');
  assert.match(aviso.TEXTO, /Veículos livres no seu horário: TST2B22/);
  assert.match(aviso.TEXTO, /Trocar veículo/);
  // WhatsApp só quando a reserva é no mesmo dia: a reserva começa 60 min depois de agora, o que depois das 23h cai no dia
  // seguinte (aí o certo é não pedir WhatsApp). O teste confere a regra nos dois casos, sem depender da hora em que roda.
  const mesmoDia = em(0).data === em(60).data;
  const pediuWhats = notificacoes.some((n) => n.categoria === 'FROTA_RESERVAS' && (n.canais || []).includes('whatsapp'));
  assert.equal(pediuWhats, mesmoDia, mesmoDia ? 'WhatsApp pedido ao notificador com a regra sutil (reserva no mesmo dia)' : 'reserva no dia seguinte não pede WhatsApp');
  assert.ok(tabelas.REG_FROTA_RESERVA_EVENTO.some((e) => e.TIPO === 'LIBERACAO_GESTAO'));
  // na central: aviso para a Ana
  const itens = []; ctx.FrotaRes_pendencias_((i) => itens.push(i));
  assert.ok(itens.some((i) => i.tipo === 'frota_reserva_aviso' && Array.from(i.paraUsuarios).includes('uA') && /liberado pela gestão/.test(i.titulo)));
});

test('Não comparecimento: sem retirada até 1 h depois do início a reserva vira "não utilizada" e libera o veículo; com o veículo fora com outra pessoa, espera', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas } = ambiente(base(), sessao);
  const r = reservar(ctx, 'v1', 30, 180);
  const rB = (sessao.atual = BRUNO, reservar(ctx, 'v2', 30, 180));
  // veículo v2 está fora com a Ana (retirada antiga, sem reserva) e atrasado
  tabelas.REG_FROTA_MOVIMENTACAO.push({ ID: 'mFora', VEICULO_ID: 'v2', CONDUTOR_ID: 'cA', STATUS: 'EM_ANDAMENTO', DATA_SAIDA: em(-300).data, HORA_SAIDA: em(-300).hora, KM_SAIDA: 5000,
    DEVOLUCAO_PREVISTA_DATA: em(-60).data, DEVOLUCAO_PREVISTA_HORA: em(-60).hora });
  const ini = ctx.FrotaRes_ms_(em(30).data, em(30).hora);
  const r0 = ctx.FrotaRes_rodada_({ forcar: true, agora: ini + 59 * 60000, expediente: false });
  assert.equal(r0.naoUtilizadas, 0);
  const r1 = ctx.FrotaRes_rodada_({ forcar: true, agora: ini + 61 * 60000, expediente: false });
  assert.equal(r1.naoUtilizadas, 1);
  assert.equal(tabelas.REG_FROTA_RESERVA.find((x) => x.ID === r.id).SITUACAO, 'NAO_UTILIZADA');
  assert.equal(tabelas.REG_FROTA_RESERVA.find((x) => x.ID === rB.id).SITUACAO, 'RESERVADA', 'o veículo ainda está fora com outra pessoa: a reserva espera');
  const aviso = tabelas.REG_FROTA_RESERVA_AVISO.find((a) => a.TIPO === 'NAO_UTILIZADA');
  assert.equal(aviso.DESTINATARIO_ID, 'uA');
  assert.equal(aviso.EMAIL_SITUACAO, 'PENDENTE', 'fora do expediente o e-mail fica guardado');
  // o veículo ficou livre: Bruno reserva o mesmo horário
  sessao.atual = BRUNO;
  const livres = ctx.FrotaRes_livres_(ini, ini + 60 * 60000, { agora: ini + 61 * 60000 });
  assert.ok(livres.some((l) => l.placa === 'TST1A11'));
  // no expediente, o e-mail sai
  ctx.FrotaRes_enviarEmails_({ expediente: true });
  assert.equal(tabelas.REG_FROTA_RESERVA_AVISO.find((a) => a.TIPO === 'NAO_UTILIZADA').EMAIL_SITUACAO, 'ENVIADO');
  // cancelamento pelo próprio reservante antes do início
  const rc = reservar(ctx, 'v3', 600, 700);
  const c = ctx.Frota_apiReservaCancelar('s', { id: rc.id, motivo: 'visita remarcada' });
  assert.match(c.mensagem, /cancelada.*continua no histórico/);
});

test('Manutenção programada ocupa a agenda: bloqueia reserva e retirada; só a gestão lança', () => {
  const sessao = { atual: ANA };
  const { ctx } = ambiente(base(), sessao);
  assert.throws(() => reservar(ctx, 'v1', 60, 600, { tipo: 'MANUTENCAO', motivo: 'revisão de teste na oficina' }), /só pela gestão/);
  sessao.atual = GESTORA;
  const m = reservar(ctx, 'v1', 60, 600, { tipo: 'MANUTENCAO', motivo: 'revisão de teste na oficina' });
  assert.equal(m.ok, true);
  assert.match(m.mensagem, /bloqueado para reserva e retirada/);
  sessao.atual = BRUNO;
  const r = reservar(ctx, 'v1', 120, 180);
  assert.equal(r.ok, false);
  assert.match(r.message, /manutenção programada \(revisão de teste na oficina\)/);
  const ret = retirar(ctx, 'v1', 30); // 30 min + 60 de folga passa do início da manutenção
  assert.equal(ret.ok, false);
  assert.match(ret.message, /bloqueado para manutenção programada/);
  // parada registrada (sem data de fim) também bloqueia
  const t2 = base(); t2.REG_FROTA_PARADA = [{ ID: 'p1', VEICULO_ID: 'v2', DATA_INICIO: dia(0), DATA_FIM: '', MOTIVO: 'oficina' }];
  const e2 = ambiente(t2, { atual: BRUNO });
  const r2 = reservar(e2.ctx, 'v2', 24 * 60, 24 * 60 + 60);
  assert.equal(r2.ok, false);
  assert.match(r2.message, /parada registrada \(oficina\)/);
});

test('Véspera: lembrete ao reservante e conferência que acha parada e documento vencido; a gestão é avisada; problema novo avisa de novo', () => {
  const t = base();
  t.REG_FROTA_DOCUMENTO = [{ ID: 'd1', VEICULO_ID: 'v1', TIPO_DOCUMENTO: 'CRLV', VALIDADE: dia(1) }];
  const sessao = { atual: ANA };
  const { ctx, tabelas } = ambiente(t, sessao, { criadoHaMin: 120 });
  const r = reservar(ctx, 'v1', 2 * 1440, 2 * 1440 + 240);
  const ini = ctx.FrotaRes_ms_(em(2 * 1440).data, em(2 * 1440).hora);
  const vespera = ctx.FrotaRes_vesperaMs_(ini, ctx.FrotaRes_cfg_());
  assert.ok(vespera < ini && ini - vespera < 5 * 86400000);
  // antes da hora da véspera: nada
  assert.equal(ctx.FrotaRes_rodada_({ forcar: true, agora: vespera - 60000, expediente: true }).lembretes, 0);
  const x = ctx.FrotaRes_rodada_({ forcar: true, agora: vespera + 60000, expediente: true });
  assert.equal(x.lembretes, 1);
  assert.equal(x.problemas, 1);
  const lemb = tabelas.REG_FROTA_RESERVA_AVISO.find((a) => a.TIPO === 'LEMBRETE');
  assert.equal(lemb.DESTINATARIO_ID, 'uA');
  assert.match(lemb.TEXTO, /documento CRLV vence em .* antes do fim da reserva/);
  assert.match(lemb.TEXTO, /Veículos livres no mesmo período: TST2B22/);
  assert.ok(tabelas.REG_FROTA_RESERVA_AVISO.some((a) => a.TIPO === 'CONFERENCIA_GESTAO' && a.DESTINATARIO_ID === 'uG'));
  assert.ok(tabelas.REG_FROTA_RESERVA_EVENTO.some((e) => e.TIPO === 'CONFERENCIA_PROBLEMA'));
  // rodar de novo não repete
  assert.equal(ctx.FrotaRes_rodada_({ forcar: true, agora: vespera + 120000, expediente: true }).lembretes, 0);
  const antes = tabelas.REG_FROTA_RESERVA_AVISO.length;
  ctx.FrotaRes_rodada_({ forcar: true, agora: vespera + 180000, expediente: true });
  assert.equal(tabelas.REG_FROTA_RESERVA_AVISO.length, antes);
  // parada registrada depois: problema novo, avisa de novo
  tabelas.REG_FROTA_PARADA.push({ ID: 'p9', VEICULO_ID: 'v1', DATA_INICIO: em(2 * 1440).data, DATA_FIM: em(2 * 1440).data, MOTIVO: 'pane elétrica' });
  ctx.FrotaRes_rodada_({ forcar: true, agora: vespera + 240000, expediente: true });
  const novo = tabelas.REG_FROTA_RESERVA_AVISO.find((a) => a.TIPO === 'CONFERENCIA_PROBLEMA');
  assert.match(novo.TEXTO, /parada registrada \(pane elétrica\)/);
  // central de pendências: reserva com problema para a Ana e a gestão
  const itens = []; ctx.FrotaRes_pendencias_((i) => itens.push(i));
  const p = itens.find((i) => i.tipo === 'frota_reserva_problema');
  assert.ok(p && Array.from(p.paraUsuarios).includes('uA') && p.publico === 'GESTAO');
  assert.equal(r.ok, true);
});

test('Devolução atrasada com reserva a seguir: cobrança em Minhas atividades, avisos ao condutor, ao reservante e à gestão; atraso que afetou vira sugestão no Programa de conduta', () => {
  const sessao = { atual: BRUNO };
  const { ctx, tabelas, atividades, mudancas } = ambiente(base(), sessao);
  const r = reservar(ctx, 'v1', 120, 300); // Bruno reserva daqui a 2 h
  sessao.atual = ANA;
  const ret = retirar(ctx, 'v1', 30); // Ana devolve em 30 min (30 + 60 < 120)
  assert.equal(ret.ok, true);
  // a devolução prevista passou (10 min atrás) e o veículo não voltou
  const mv = tabelas.REG_FROTA_MOVIMENTACAO[0]; mv.DEVOLUCAO_PREVISTA_DATA = em(-10).data; mv.DEVOLUCAO_PREVISTA_HORA = em(-10).hora;
  const ini = ctx.FrotaRes_ms_(em(120).data, em(120).hora);
  const a = ctx.FrotaRes_rodada_({ forcar: true, expediente: false });
  assert.equal(a.atrasos, 1);
  assert.equal(atividades.length, 1);
  assert.equal(atividades[0].RESPONSAVEL_ID, 'uA');
  assert.equal(atividades[0].MODULO, 'frota');
  assert.equal(atividades[0].PRIORIDADE, 'Urgente');
  assert.equal(atividades[0].criadoPor, 'Frota (reservas)');
  assert.match(atividades[0].TITULO, /^Devolver o veículo TST1A11: reserva de CONDUTOR BRUNO/);
  const tipos = tabelas.REG_FROTA_RESERVA_AVISO.map((x) => x.TIPO + ':' + x.DESTINATARIO_ID).sort();
  assert.deepEqual(tipos, ['ATRASO_DEVOLUCAO:uA', 'ATRASO_GESTAO:uG', 'ATRASO_RESERVANTE:uB']);
  // a central cobra até resolver (condutor atual e reservante)
  const itens = []; ctx.FrotaRes_pendencias_((i) => itens.push(i));
  const atr = itens.find((i) => i.tipo === 'frota_reserva_atraso');
  assert.ok(atr && Array.from(atr.paraUsuarios).includes('uA') && Array.from(atr.paraUsuarios).includes('uB'));
  // de novo: não repete
  assert.equal(ctx.FrotaRes_rodada_({ forcar: true, expediente: false }).atrasos, 0);
  // a reserva começou com o veículo fora: atraso que afetou a reserva
  assert.equal(ctx.FrotaRes_rodada_({ forcar: true, agora: ini + 5 * 60000, expediente: false }).afetadas, 1);
  const sug = ctx.FrotaRes_sugestoesConduta_('2000-01-01', () => 'uA');
  assert.equal(sug.length, 1);
  assert.equal(sug[0].colaboradorId, 'uA');
  assert.equal(sug[0].tipoCodigo, '');
  assert.match(sug[0].titulo, /prejudicou a reserva RV-/);
  // devolução: a atividade é concluída sozinha e o reservante sabe que o veículo voltou
  assert.equal(devolver(ctx, ret.movimentacaoId).ok, true);
  assert.equal(mudancas[0].situacao, 'Concluída');
  assert.ok(tabelas.REG_FROTA_RESERVA_AVISO.some((x) => x.TIPO === 'DEVOLVIDO' && x.DESTINATARIO_ID === 'uB'));
  assert.equal(tabelas.REG_FROTA_RESERVA.find((x) => x.ID === r.id).SITUACAO, 'RESERVADA', 'a reserva de Bruno continua para ele retirar');
  // indicadores
  sessao.atual = GESTORA;
  const ind = ctx.Frota_apiReservaIndicadores('s', { de: dia(-1), ate: dia(2) });
  assert.equal(ind.atrasosComReserva, 1);
  assert.equal(ind.atrasosAfetaram, 1);
});

test('Concorrência: dois pedidos para o mesmo veículo e horário ao mesmo tempo gravam só uma reserva (conferência de novo dentro da trava)', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas, ganchos, trava } = ambiente(base(), sessao);
  let disparou = false, resultadoB = null;
  // O pedido A lê as reservas (fora da trava, ainda vazias); nesse instante o pedido B chega e grava a dele.
  ganchos.aoLer = (t) => {
    if (t !== 'REG_FROTA_RESERVA' || disparou || trava()) return;
    disparou = true;
    const atual = sessao.atual; sessao.atual = BRUNO;
    resultadoB = reservar(ctx, 'v1', 600, 700);
    sessao.atual = atual;
  };
  const resultadoA = reservar(ctx, 'v1', 600, 700);
  ganchos.aoLer = null;
  assert.equal(resultadoB.ok, true);
  assert.equal(resultadoA.ok, false);
  assert.match(resultadoA.message, /reserva RV-\d{4}-0001 de CONDUTOR BRUNO/);
  assert.equal(tabelas.REG_FROTA_RESERVA.length, 1);
  assert.equal(trava(), false, 'a trava foi solta');
});

test('Nada é apagado: cancelada (pela gestão, com justificativa e aviso), não utilizada e concluída ficam no histórico', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas, apagados } = ambiente(base(), sessao);
  const r1 = reservar(ctx, 'v1', 30, 120);
  const r2 = reservar(ctx, 'v2', 600, 700);
  sessao.atual = BRUNO;
  assert.throws(() => ctx.Frota_apiReservaCancelar('s', { id: r2.id, motivo: 'quero o carro' }), /Só quem reservou ou a gestão/);
  sessao.atual = GESTORA;
  assert.throws(() => ctx.Frota_apiReservaCancelar('s', { id: r2.id, motivo: 'oficina' }), /justificativa do cancelamento \(mínimo de 15/);
  ctx.Frota_apiReservaCancelar('s', { id: r2.id, motivo: 'veículo vai para a oficina por defeito no freio' });
  const avisoCanc = tabelas.REG_FROTA_RESERVA_AVISO.find((a) => a.TIPO === 'CANCELADA_GESTAO');
  assert.equal(avisoCanc.DESTINATARIO_ID, 'uA');
  assert.match(avisoCanc.TEXTO, /defeito no freio/);
  const ini = ctx.FrotaRes_ms_(em(30).data, em(30).hora);
  ctx.FrotaRes_rodada_({ forcar: true, agora: ini + 2 * 3600000, expediente: false });
  const sit = tabelas.REG_FROTA_RESERVA.map((r) => r.SITUACAO).sort();
  assert.deepEqual(sit, ['CANCELADA', 'NAO_UTILIZADA']);
  assert.equal(tabelas.REG_FROTA_RESERVA.length, 2);
  assert.equal(apagados.length, 0);
  assert.ok(JSON.parse(tabelas.REG_FROTA_RESERVA.find((r) => r.ID === r2.id).HISTORICO_JSON).some((h) => h.acao === 'CANCELADA'));
  // o código do módulo não chama nenhuma função de apagar
  const fonte = fs.readFileSync(path.join(pastaLegado, 'SGO_Frota_Reservas.js'), 'utf8');
  assert.doesNotMatch(fonte, /SGO_DATA\.(delete|remove|clear)/);
  assert.equal(r1.ok, true);
});

test('Tela inicial e agenda: próxima reserva por veículo, minhas reservas; agenda sem instante cru; COMMAND pela ponte com as mesmas regras', () => {
  const sessao = { atual: ANA };
  const { ctx } = ambiente(base(), sessao);
  reservar(ctx, 'v1', 90, 200);
  sessao.atual = BRUNO;
  const ini = ctx.Frota_apiInicioFrota('s');
  const v1 = ini.veiculos.find((v) => v.placa === 'TST1A11');
  assert.equal(v1.reserva.quem, 'CONDUTORA ANA');
  assert.equal(v1.reserva.minha, false);
  assert.equal(ini.reservas.folgaMin, 60);
  const painel = ctx.Frota_apiReservaPainel('s', { dias: 7 });
  assert.equal(painel.veiculos.length, 3);
  const item = painel.veiculos.find((v) => v.placa === 'TST1A11').itens[0];
  assert.equal(item.tipo, 'RESERVA');
  assert.equal(typeof item.a, 'number');
  assert.ok(item.a >= 0 && item.b <= painel.totalMin);
  assert.equal(item.minha, false);
  assert.doesNotMatch(item.detalhe, /visita técnica/, 'quem não é dono nem gestão não vê o motivo');
  // ponte do COMMAND: Bruno reserva o mesmo horário -> recusa com os livres; reserva outro veículo
  const recusa = ctx.FrotaRes_ponte_('frota.reservas.criar', { sgoUsuarioId: 'uB', payload: { veiculoId: 'v1', dataInicio: em(100).data, horaInicio: em(100).hora, dataFim: em(150).data, horaFim: em(150).hora, destino: 'Cliente teste', motivo: 'entrega de teste' } });
  assert.equal(recusa.ok, false);
  assert.match(recusa.erro, /não está livre/);
  const ok = ctx.FrotaRes_ponte_('frota.reservas.criar', { sgoUsuarioId: 'uB', payload: { veiculoId: 'v2', dataInicio: em(100).data, horaInicio: em(100).hora, dataFim: em(150).data, horaFim: em(150).hora, destino: 'Cliente teste', motivo: 'entrega de teste' } });
  assert.equal(ok.ok, true);
  const p2 = ctx.FrotaRes_ponte_('frota.reservas.painel', { sgoUsuarioId: 'uB', payload: {} });
  assert.equal(p2.minhas.length, 1);
  assert.equal(p2.veiculos.length, 0, 'no COMMAND só a gestão vê a agenda de todos');
  assert.equal(ctx.FrotaRes_ponte_('frota.reservas.painel', { sgoUsuarioId: 'uG', payload: {} }).veiculos.length, 3);
  assert.equal(ctx.FrotaRes_ponte_('frota.reservas.painel', { sgoUsuarioId: 'naoexiste' }).ok, false);
});

test('Notificador: WhatsApp das reservas segue a regra sutil (PJ e vínculo vazio não recebem; fora do expediente não; uma por dia)', () => {
  const { ctx } = ambiente(base(), { atual: ANA });
  vm.runInContext(fs.readFileSync(path.join(pastaLegado, 'SGO_Notificar.js'), 'utf8').replace(/\r\n/g, '\n'), ctx);
  const segunda10h = new Date('2026-10-19T13:00:00Z'); // segunda-feira, 10:00 em Brasília
  const domingo = new Date('2026-10-18T13:00:00Z');
  assert.equal(ctx.Notificar_motivoFrotaReservasWhatsapp_({ id: 'u1', vinculo: 'CLT' }, {}, segunda10h), '');
  assert.match(ctx.Notificar_motivoFrotaReservasWhatsapp_({ id: 'u1', vinculo: 'PJ' }, {}, segunda10h), /PJ/);
  assert.match(ctx.Notificar_motivoFrotaReservasWhatsapp_({ id: 'u1', vinculo: '' }, {}, segunda10h), /vínculo de trabalho não informado/);
  assert.match(ctx.Notificar_motivoFrotaReservasWhatsapp_({ id: 'u1', vinculo: 'CLT' }, {}, domingo), /fora do expediente \(domingo\)/);
  assert.equal(ctx.Notificar_motivoFrotaReservasWhatsapp_({ id: 'u1', vinculo: 'CLT' }, { u1: true }, segunda10h), ctx.NTF_MOTIVO_FROTA_LIMITE);
});

test('Indicadores, copiloto (veículo disputado) e relatório A4 do mês; técnico não vê indicadores', () => {
  const sessao = { atual: ANA };
  const { ctx, tabelas } = ambiente(base(), sessao);
  reservar(ctx, 'v1', 600, 700);
  sessao.atual = BRUNO;
  for (let i = 0; i < 3; i++) reservar(ctx, 'v1', 600 + i * 10, 690);
  assert.throws(() => ctx.Frota_apiReservaIndicadores('s', {}), /da gestão/);
  sessao.atual = GESTORA;
  const ind = ctx.Frota_apiReservaIndicadores('s', { de: dia(-1), ate: dia(3) });
  assert.equal(ind.total, 1);
  assert.equal(ind.recusas, 3);
  assert.equal(ind.veiculos.find((v) => v.placa === 'TST1A11').disputas, 3);
  const sug = ctx.FrotaRes_sugestoesCopiloto_(30);
  assert.ok(sug.some((s) => s.tipo === 'USO' && /TST1A11: disputado \(3/.test(s.titulo)));
  // relatório A4: moldura comum dos documentos (simulada aqui), HTML e PDF salvos na pasta "Reservas"
  const salvos = [];
  Object.assign(ctx, {
    RelA4_analise_: (p, padrao) => ({ texto: padrao, origem: 'PADRAO', aviso: '' }), RelA4_secao_: (t, c) => '<section><h2>' + t + '</h2>' + c + '</section>',
    RelA4_kpis_: (l) => l.map((k) => '<b>' + k[0] + '</b> ' + k[1]).join(' '), RelA4_paragrafos_: (t) => '<p>' + t + '</p>', RelA4_tabela_: (c, l) => '<table>' + l.map((x) => '<tr><td>' + x.join('</td><td>') + '</td></tr>').join('') + '</table>',
    RelA4_marca_: (t) => t, RelA4_assinaturas_: () => '', RelA4_documento_: (o) => '<html><title>' + o.titulo + '</title>' + o.corpo + '</html>', RelA4_subpasta_: (p, n) => n,
    FrotaRel_obterPastaRelatorios_: () => 'Frota', RelA4_salvar_: (pasta, id, html) => { salvos.push({ pasta: pasta(), id, html }); return { html, pdfUrl: '/arquivos/pdf', htmlUrl: '/arquivos/html', pastaUrl: '' }; },
    RelA4_injetarAvisos_: (h) => h, RelA4_avisosPadrao_: () => []
  });
  const comp = em(600).data.split('/').reverse().slice(0, 2).join('-');
  const rel = ctx.Frota_apiReservaRelatorio('s', { competencia: comp });
  assert.equal(rel.ok, true);
  assert.equal(salvos[0].pasta, 'Reservas');
  assert.match(salvos[0].html, /Relatório de uso e reservas da frota/);
  assert.match(salvos[0].html, /pedido\(s\) de reserva foram recusados por sobreposição/);
  assert.equal(tabelas.REG_FROTA_RESERVA.length, 1);
});
