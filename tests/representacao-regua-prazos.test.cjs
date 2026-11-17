// Régua de prazos do chamado da representada (11/11/2026, decisão do dono): 3 dias úteis para estudar o caso e agendar; 2 dias
// úteis para o relatório de cada atendimento; previsão da peça informada pela representada (o prazo da Metrolabs pausa enquanto
// ela não informa); 2 dias úteis para avaliar depois da chegada da peça; pedido de mais prazo aceito ou recusado pela
// representada. Código real do SGO+ (tests/_assistencia_ambiente.cjs; relógio começa na segunda 19/10/2026 às 10h). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, em } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js',
  'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Regua.js'];
const foto = (nome) => ({ nome: nome || 'foto.jpg', tipo: 'image/jpeg', base64: FOTO });
const CHECK = { sintomas_confirmados: 'Confirmado com o cliente', risco_operar: 'Baixo', diagnostico_preliminar: 'Válvula com vazamento' };
const PREPARO = { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: false, pecasJustificativa: 'visita de diagnóstico, sem peça', risco: 'baixo' };

function amb() {
  const a = ambiente({ extras: EXTRAS });
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repB', NOME: 'BRASMEDICAL TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }
  ];
  const us = [
    { ID: 'rb_adm', USUARIO: 'qualidade', NOME: 'QUALIDADE BRASMEDICAL TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'qualidade@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_lei', USUARIO: 'leitor', NOME: 'LEITOR BRASMEDICAL TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'leitor@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'LEITURA' },
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.api('s_dora', 'iniciar', {});
  a.rep = (sid, acao, d) => { const r = a.ctx.Representacao_api(sid, acao, d || {}); if (a.trava.presa) throw new Error('trava ficou presa depois de ' + acao); return r; };
  return a;
}
/** Pedido da Brasmedical aceito às 11h da segunda (chamado com o prazo da representada). */
function chamado(a, serie) {
  ok(a.rep('s_qualidade', 'buscarCliente', { documento: '11.222.333/0001-81' }));
  ok(a.rep('s_qualidade', 'buscarEquipamento', { clienteId: 'c1', serie: serie || 'S-100' }));
  const p = ok(a.rep('s_qualidade', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: serie === 'S-200' ? 'eq2' : 'eq1', protocolo: 'BM-1', setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777',
    contatoEmail: 'rui@alfa.exemplo.test', sintoma: 'A autoclave interrompe o ciclo com alarme de baixa pressão.', inicio: 'ontem', codigoErro: 'E12', parada: 'TOTAL', risco: 'Sem esterilização', tentado: 'Religamos',
    enquadramento: 'GARANTIA', fotos: [foto()], fotosEtiqueta: [foto('e.jpg')] })).solicitacao;
  a.mudar('2026-10-19T11:00:00-03:00');
  return ok(a.rep('s_gil', 'aceitar', { solicitacaoId: p.id, prioridade: 'P2' })).chamado;
}
const linha = (a, id) => a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === id);
const mudar = (a, id, para, campos, texto) => {
  const eu = a.ctx.Ast_eu_('s_gil');
  a.ctx.Ast_memoLimpar_();
  return a.ctx.Ast_comTrava_(() => a.ctx.AstC_mudar_(eu, a.ctx.Ast_porId_('ATEC_CHAMADOS', id), para, campos || {}, para, texto || ('Para ' + para)));
};
const regua = (a, sid, id) => {
  const r = ok(a.rep(sid, 'chamado', sid === 's_qualidade' || sid === 's_leitor' ? { tipo: 'CHAMADO', id } : { id }));
  return sid === 's_qualidade' || sid === 's_leitor' ? r.regua : r.representacao.regua;
};
const sla = (a, id) => { a.ctx.Ast_memoLimpar_(); return a.ctx.Ast_slaEstado_(a.ctx.Ast_porId_('ATEC_CHAMADOS', id), a.relogio.agora); };
const etapa = (r, chave) => r.etapas.find((e) => e.chave === chave);
const agendar = (a, id, inicio) => {
  ok(a.api('s_gil', 'triagem', { id, checklist: CHECK, acao: 'PLANEJADO', tipoCodigo: 'MANUTENCAO_CORRETIVA' }));
  return ok(a.api('s_gil', 'agendar', { id, tecnicoId: 'u_tec', inicio, duracaoMin: 90, tipoCodigo: 'MANUTENCAO_CORRETIVA', preparo: PREPARO }));
};

test('etapa 1: 3 dias úteis do aceite até o atendimento AGENDADO (a 75% fica em risco; cumprida ao agendar, não na conclusão)', () => {
  const a = amb();
  const c = chamado(a);
  assert.equal(linha(a, c.id).SLA_FONTE, 'REPRESENTACAO');
  assert.equal(Number(linha(a, c.id).SLA_MIN_UTEIS), 1710);
  const ate = a.ctx.Ast_somarMinUteis_(em('2026-10-19T11:00:00-03:00'), 1710);
  assert.equal(ate, em('2026-10-22T11:00:00-03:00'), 'seg 11h + 3 dias úteis = qui 11h');
  a.mudar('2026-10-20T10:00:00-03:00');
  let r = regua(a, 's_gil', c.id);
  assert.equal(r.atual.chave, 'ESTUDO'); assert.equal(r.atual.estado, 'NO_PRAZO'); assert.equal(r.atual.ateMs, ate); assert.equal(r.atual.resp, 'METROLABS');
  assert.match(r.atual.falta, /estudar o caso e agendar o atendimento .* até 22\/10\/2026 11:00/);
  assert.equal(sla(a, c.id).estado, 'EM_DIA');
  a.mudar('2026-10-21T15:00:00-03:00');
  assert.equal(regua(a, 's_gil', c.id).atual.estado, 'EM_RISCO');
  assert.equal(sla(a, c.id).estado, 'EM_RISCO');
  // agendou na quarta 15h10 para a quinta 9h: etapa 1 cumprida (antes, a conta ia até a conclusão)
  a.mudar('2026-10-21T15:10:00-03:00');
  agendar(a, c.id, '2026-10-22T09:00');
  r = regua(a, 's_gil', c.id);
  assert.equal(etapa(r, 'ESTUDO').estado, 'CUMPRIDO'); assert.equal(etapa(r, 'ESTUDO').fimMs, em('2026-10-21T15:10:00-03:00'));
  assert.equal(r.atual.codigo, 'VISITA'); assert.match(r.atual.falta, /Atendimento marcado para 22\/10\/2026 09:00/);
  assert.equal(sla(a, c.id).estado, 'EM_DIA');
  // muito depois do prazo da etapa 1, o chamado agendado não fica "estourado" (só a etapa em aberto vale)
  a.mudar('2026-10-27T10:00:00-03:00');
  assert.notEqual(sla(a, c.id).estado, 'ESTOURADO');
  // a representada vê a mesma etapa, com o texto dela, sem os botões da Metrolabs
  const rr = regua(a, 's_qualidade', c.id);
  assert.equal(etapa(rr, 'ESTUDO').estado, 'CUMPRIDO'); assert.equal(rr.etapas.some((e) => e.podeProrrogar), false);
});

test('etapa 1 vencida: Assistência mostra o prazo estourado; a rotina avisa uma vez (RP12, com a gestão) e a central lista', () => {
  const a = amb();
  const c = chamado(a);
  a.mudar('2026-10-22T14:00:00-03:00');
  const r = regua(a, 's_gil', c.id);
  assert.equal(r.atual.estado, 'VENCIDO');
  const s = sla(a, c.id);
  assert.equal(s.estado, 'ESTOURADO'); assert.match(s.texto, /Estudar o caso e agendar/);
  const antes = a.emails.length;
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  const novos = a.emails.slice(antes).filter((e) => /VENCIDO na régua/.test(e.subject));
  assert.ok(novos.length >= 1, 'e-mail do vencido');
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  assert.equal(a.emails.slice(antes).filter((e) => /VENCIDO na régua/.test(e.subject)).length, novos.length, 'uma vez por etapa e marco');
  const pend = a.pend('s_gil');
  assert.ok(pend.some((p) => /AST:SLA:/.test(p.id) && /Estudar o caso/.test(p.detalhe || '')), 'central: prazo estourado pela régua');
});

test('régua completa: atendimento com falta de peça, previsão pela representada, relatório, prorrogação recusada e aceita, chegada, avaliação e conclusão', () => {
  const a = amb();
  const c = chamado(a);
  a.mudar('2026-10-20T09:00:00-03:00');
  agendar(a, c.id, '2026-10-22T09:00');
  a.mudar('2026-10-22T09:05:00-03:00');
  mudar(a, c.id, 'NO_LOCAL'); mudar(a, c.id, 'EM_EXECUCAO');
  // no meio do atendimento: falta a válvula (a representada é avisada para informar a previsão: RP09)
  a.mudar('2026-10-22T10:00:00-03:00');
  const antes = a.emails.length;
  mudar(a, c.id, 'AGUARDANDO_PECA', { PECA_DESCRICAO: 'Válvula solenoide de vapor 1/2' });
  const rp09 = a.emails.slice(antes).filter((e) => /Informe a previsão da peça/.test(e.subject));
  assert.equal(rp09.length, 1); assert.equal(rp09[0].to, 'qualidade@brasmedical.exemplo.test');
  let r = regua(a, 's_gil', c.id);
  const ateRel = a.ctx.Ast_somarMinUteis_(em('2026-10-22T10:00:00-03:00'), 1140);
  assert.equal(etapa(r, 'RELATORIO:1').ateMs, ateRel, 'relatório: 2 dias úteis depois do atendimento');
  assert.equal(etapa(r, 'PECA_PREVISAO:1').estado, 'AGUARDANDO'); assert.equal(etapa(r, 'PECA_PREVISAO:1').resp, 'REPRESENTADA');
  assert.equal(r.atual.chave, 'RELATORIO:1', 'a etapa da Metrolabs com prazo vem primeiro');
  // representada: pendência na ficha, no início e no painel; leitura não informa; outra representada não acha o chamado
  let rr = regua(a, 's_qualidade', c.id);
  assert.equal(rr.pendencias.length, 1); assert.equal(rr.pendencias[0].tipo, 'PECA_PREVISAO'); assert.match(rr.pendencias[0].texto, /Válvula solenoide/);
  assert.ok(ok(a.rep('s_qualidade', 'inicio', {})).pendencias.some((p) => p.regua === 'PECA_PREVISAO'));
  assert.ok(ok(a.rep('s_qualidade', 'painel', {})).painel.pendencias.some((p) => p.regua === 'PECA_PREVISAO'));
  assert.match(a.rep('s_leitor', 'informarPrevisaoPeca', { id: c.id, previsao: '2026-10-28' }).message, /papel \(Leitura\) não permite/);
  assert.match(a.rep('s_ana.alfa', 'informarPrevisaoPeca', { id: c.id, previsao: '2026-10-28' }).message, /Não encontramos este registro/);
  const passado = a.rep('s_qualidade', 'informarPrevisaoPeca', { id: c.id, previsao: '2026-10-20' });
  assert.equal(passado.ok, false); assert.equal(passado.faltam[0].campo, 'pcPrevisao');
  a.mudar('2026-10-22T11:00:00-03:00');
  const antes2 = a.emails.length;
  rr = ok(a.rep('s_qualidade', 'informarPrevisaoPeca', { id: c.id, previsao: '2026-10-28', obs: 'Envio pela transportadora' })).regua;
  assert.equal(etapa(rr, 'PECA_PREVISAO:1').estado, 'FEITO'); assert.equal(etapa(rr, 'PECA_CHEGADA:1').previsao, '28/10/2026');
  assert.ok(a.emails.slice(antes2).some((e) => /Previsão da peça: /.test(e.subject)), 'RP11 à Metrolabs');
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'REP_PECA_PREVISAO' && e.PUBLICO === 'REPRESENTADA'));
  // pedido de mais prazo para o relatório: técnico não pede; motivo obrigatório; data depois do prazo atual
  assert.match(a.rep('s_tiago', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-28', motivo: 'Aguardando o laudo do fabricante' }).message, /gestão da área Técnica/);
  assert.equal(a.rep('s_gil', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-28', motivo: 'curto' }).faltam[0].campo, 'prMotivo');
  assert.match(a.rep('s_gil', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-23', hora: '08:00', motivo: 'Aguardando o laudo do fabricante' }).message, /depois do prazo atual/);
  const antes3 = a.emails.length;
  r = ok(a.rep('s_gil', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-28', motivo: 'Aguardando o laudo do fabricante da válvula' })).regua;
  assert.ok(etapa(r, 'RELATORIO:1').prorrogacaoPendente); assert.equal(etapa(r, 'RELATORIO:1').ateMs, ateRel, 'pendente: vale o prazo atual');
  assert.ok(a.emails.slice(antes3).some((e) => /Pedido de mais prazo/.test(e.subject) && e.to === 'qualidade@brasmedical.exemplo.test'), 'RP10 à representada');
  assert.match(a.rep('s_gil', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-29', motivo: 'Outro pedido em cima do anterior' }).message, /já há um pedido/);
  // a representada recusa (motivo obrigatório): segue o prazo vigente
  rr = regua(a, 's_qualidade', c.id);
  const pr = rr.pendencias.find((p) => p.tipo === 'PRORROGACAO');
  assert.ok(pr); assert.match(pr.texto, /laudo do fabricante/);
  assert.equal(a.rep('s_qualidade', 'responderProrrogacao', { id: c.id, prorrogacaoId: pr.prorrogacaoId, aceitar: false, motivo: '' }).faltam[0].campo, 'prMotivo');
  rr = ok(a.rep('s_qualidade', 'responderProrrogacao', { id: c.id, prorrogacaoId: pr.prorrogacaoId, aceitar: false, motivo: 'O cliente precisa do relatório para a auditoria' })).regua;
  assert.equal(etapa(rr, 'RELATORIO:1').ateMs, ateRel); assert.equal(rr.prorrogacoes[0].situacao, 'RECUSADA');
  assert.match(a.rep('s_qualidade', 'responderProrrogacao', { id: c.id, prorrogacaoId: pr.prorrogacaoId, aceitar: true }).message, /já foi recusado/);
  // novo pedido, aceito: vale a nova data (fim do expediente do dia)
  const p2 = ok(a.rep('s_gil', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-27', motivo: 'Laudo do fabricante chega na segunda' })).regua;
  const id2 = etapa(p2, 'RELATORIO:1').prorrogacaoPendente.id;
  rr = ok(a.rep('s_qualidade', 'responderProrrogacao', { id: c.id, prorrogacaoId: id2, aceitar: true })).regua;
  assert.equal(etapa(rr, 'RELATORIO:1').ateMs, em('2026-10-27T17:30:00-03:00')); assert.equal(etapa(rr, 'RELATORIO:1').prorrogada, true);
  // relatório na versão da representada gerado pela Metrolabs: etapa 2 cumprida, a representada é avisada e vê na linha do tempo
  a.mudar('2026-10-27T09:00:00-03:00');
  const antes4 = a.emails.length;
  ok(a.rep('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'REPRESENTADA' }));
  assert.ok(a.emails.slice(antes4).some((e) => /Relatório do atendimento: /.test(e.subject) && e.to === 'qualidade@brasmedical.exemplo.test'));
  r = regua(a, 's_gil', c.id);
  assert.equal(etapa(r, 'RELATORIO:1').estado, 'CUMPRIDO');
  assert.equal(r.atual.chave, 'PECA_CHEGADA:1'); assert.equal(r.comQuem, 'REPRESENTADA');
  assert.equal(sla(a, c.id).estado, 'PAUSADO', 'pendência da representada: prazo da Metrolabs pausado');
  // a data prevista passou sem chegada: pendência dela (atualizar a previsão)
  a.mudar('2026-10-29T10:00:00-03:00');
  rr = regua(a, 's_qualidade', c.id);
  assert.equal(etapa(rr, 'PECA_CHEGADA:1').estado, 'ATRASADA'); assert.ok(rr.pendencias.some((p) => p.tipo === 'PECA_ATRASADA'));
  assert.equal(a.rep('s_qualidade', 'informarPrevisaoPeca', { id: c.id, previsao: '2026-10-30' }).faltam[0].campo, 'pcObs', 'mudar a data pede o motivo');
  ok(a.rep('s_qualidade', 'informarPrevisaoPeca', { id: c.id, previsao: '2026-10-30', obs: 'Atraso na transportadora' }));
  // chegada registrada pela Metrolabs: o chamado volta a "Planejado" e começa a avaliação (2 dias úteis)
  a.mudar('2026-10-29T14:00:00-03:00');
  r = ok(a.rep('s_gil', 'registrarChegadaPeca', { id: c.id, obs: 'Conferida no almoxarifado' })).regua;
  assert.equal(linha(a, c.id).SITUACAO, 'PLANEJADO');
  assert.equal(etapa(r, 'PECA_CHEGADA:1').estado, 'CUMPRIDO');
  const ateAv = a.ctx.Ast_somarMinUteis_(em('2026-10-29T14:00:00-03:00'), 1140);
  assert.equal(etapa(r, 'AVALIACAO:1').ateMs, ateAv); assert.equal(r.atual.chave, 'AVALIACAO:1');
  assert.match(a.rep('s_gil', 'registrarChegadaPeca', { id: c.id }).message, /não tem peça aguardando/);
  // avaliação registrada (próximo passo): etapa 4 cumprida
  a.mudar('2026-10-30T09:00:00-03:00');
  assert.equal(a.rep('s_gil', 'registrarAvaliacao', { id: c.id, texto: 'curto' }).faltam[0].campo, 'avTexto');
  r = ok(a.rep('s_gil', 'registrarAvaliacao', { id: c.id, texto: 'Peça testada em bancada; retorno para troca agendado' })).regua;
  assert.equal(etapa(r, 'AVALIACAO:1').estado, 'CUMPRIDO');
  // retorno, troca e conclusão: o relatório do 2º atendimento abre e fecha
  ok(a.api('s_gil', 'agendar', { id: c.id, tecnicoId: 'u_tec', inicio: '2026-10-30T14:00', duracaoMin: 60, tipoCodigo: 'MANUTENCAO_CORRETIVA', preparo: Object.assign({}, PREPARO, { pecas: true }) }));
  a.mudar('2026-10-30T14:05:00-03:00');
  mudar(a, c.id, 'NO_LOCAL'); mudar(a, c.id, 'EM_EXECUCAO');
  a.mudar('2026-10-30T15:00:00-03:00');
  mudar(a, c.id, 'DOC_PENDENTE');
  r = regua(a, 's_gil', c.id);
  assert.equal(etapa(r, 'RELATORIO:2').estado, 'NO_PRAZO'); assert.equal(r.atual.chave, 'RELATORIO:2');
  a.mudar('2026-10-30T16:00:00-03:00');
  ok(a.rep('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'REPRESENTADA' }));
  // 16/11/2026 (decisão D1 do dono): chamado de representada não encerra direto de "documentação pendente" (passa pelo laudo, pela decisão
  // e pelas confirmações: tests/representacao-fluxo-20261116.test.cjs). Aqui simula o chamado encerrado antes da versão nova.
  Object.assign(linha(a, c.id), { SITUACAO: 'ENCERRADO', ENCERRADO_EM: '2026-10-30T16:05:00' });
  r = regua(a, 's_gil', c.id);
  assert.ok(r.etapas.filter((e) => e.resp === 'METROLABS' && e.ateMs).every((e) => e.estado === 'CUMPRIDO'), JSON.stringify(r.etapas.map((e) => [e.chave, e.estado])));
  assert.equal(sla(a, c.id).estado, 'CUMPRIDO');
  // histórico: tudo na linha do tempo da representada
  const ficha = ok(a.rep('s_qualidade', 'chamado', { tipo: 'CHAMADO', id: c.id }));
  const tl = ficha.linhaDoTempo.map((e) => e.texto).join(' | ');
  for (const t of ['Previsão de chegada da peça informada', 'pediu mais prazo', 'RECUSADO pela representada', 'ACEITO pela representada', 'Peça recebida', 'Avaliação depois da peça', 'Relatório do atendimento enviado à representada']) assert.ok(tl.includes(t), t);
  // marcos com a régua (agendamento, visita, relatórios, peça, avaliação, conclusão)
  assert.deepEqual(ficha.marcos.map((m) => m.nome).slice(0, 3), ['Pedido enviado', 'Aceite pela Metrolabs', 'Agendamento do atendimento']);
  assert.ok(ficha.marcos.some((m) => m.nome === 'Chegada da peça' && m.atrasado === false), 'chegou até a última previsão (30/10)');
  assert.ok(ficha.marcos.some((m) => m.nome === 'Avaliação depois da chegada da peça' && m.atrasado === false));
});

test('A4 (versão da representada e interna): seção "Régua de prazos" com etapas, prazo vigente e pedidos de mais prazo; o cliente não vê', () => {
  const a = amb();
  const c = chamado(a);
  a.mudar('2026-10-20T09:00:00-03:00');
  agendar(a, c.id, '2026-10-21T09:00');
  a.mudar('2026-10-21T09:05:00-03:00');
  mudar(a, c.id, 'NO_LOCAL'); mudar(a, c.id, 'EM_EXECUCAO');
  a.mudar('2026-10-21T10:00:00-03:00');
  mudar(a, c.id, 'AGUARDANDO_PECA', { PECA_DESCRICAO: 'Placa de controle' });
  ok(a.rep('s_gil', 'pedirProrrogacao', { id: c.id, etapa: 'RELATORIO:1', novaData: '2026-10-26', motivo: 'Aguardando o laudo do fabricante' }));
  const html = (doc) => a.arquivos[doc.htmlUrl.split('/').pop()].bytes.toString('utf8');
  const hR = html(ok(a.rep('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'REPRESENTADA' })).documento);
  assert.ok(hR.includes('Régua de prazos'), 'seção na versão da representada');
  assert.ok(hR.includes('Previsão de chegada da peça') && hR.includes('Pedidos de mais prazo') && hR.includes('Aguardando o laudo do fabricante'));
  assert.ok(html(ok(a.rep('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'INTERNO' })).documento).includes('3 dias úteis (prazo da representada para estudar o caso e agendar); depois, régua de prazos: 2 dias úteis para o relatório'));
  const hC = html(ok(a.rep('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'CLIENTE' })).documento);
  assert.ok(!hC.includes('Régua de prazos') && !hC.includes('Pedidos de mais prazo'), 'o cliente final não lê a régua');
});

test('Kanban e Gantt dos dois lados mostram a etapa da régua e o prazo vigente; com a representada quando a pendência é dela', () => {
  const a = amb();
  const c = chamado(a);
  a.mudar('2026-10-20T09:00:00-03:00');
  agendar(a, c.id, '2026-10-21T09:00');
  a.mudar('2026-10-21T09:05:00-03:00');
  mudar(a, c.id, 'NO_LOCAL'); mudar(a, c.id, 'EM_EXECUCAO');
  a.mudar('2026-10-21T10:00:00-03:00');
  mudar(a, c.id, 'AGUARDANDO_PECA', { PECA_DESCRICAO: 'Placa de controle' });
  ok(a.rep('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'REPRESENTADA' }));
  const cartao = (p) => [].concat(...p.kanban.map((k) => k.itens)).find((x) => x.id === c.id);
  const ext = cartao(ok(a.rep('s_qualidade', 'painel', {})).painel), int = cartao(ok(a.rep('s_gil', 'painel', {})).painel);
  for (const x of [ext, int]) {
    assert.equal(x.regua.etapa, 'Previsão de chegada da peça'); assert.equal(x.regua.resp, 'REPRESENTADA'); assert.equal(x.comQuem, 'REPRESENTADA'); assert.equal(x.acaoRepresentada, true);
    assert.equal(x.prazo.estado, 'PAUSADO');
  }
  assert.match(ext.regua.falta, /sua empresa informar a data prevista/); assert.match(int.regua.falta, /Com a representada desde/);
  const g = ok(a.rep('s_qualidade', 'painel', {})).painel.gantt.find((x) => x.id === c.id);
  assert.equal(g.regua.etapa, 'Previsão de chegada da peça');
  // lista de chamados da representada traz a etapa da régua
  assert.equal(ok(a.rep('s_qualidade', 'chamados', {})).itens.find((x) => x.id === c.id).regua.pendente, 1);
});

test('migração: chamado aberto em execução (como o CH-2026-0030) agendado dentro dos 3 dias não fica vencido; registro sem histórico também não', () => {
  const a = amb();
  const c = chamado(a);
  a.mudar('2026-10-20T09:00:00-03:00');
  agendar(a, c.id, '2026-10-21T09:00');
  a.mudar('2026-10-21T09:05:00-03:00');
  mudar(a, c.id, 'NO_LOCAL'); mudar(a, c.id, 'EM_EXECUCAO');
  a.mudar('2026-11-11T09:00:00-03:00');
  // a conta antiga (até a conclusão, ATENDIDO_EM) daria estourado
  const antiga = a.ctx.Ast_slaEstado_(Object.assign({}, linha(a, c.id), { REPRESENTADA_ID: '' }), a.relogio.agora);
  assert.equal(antiga.estado, 'ESTOURADO');
  const r = regua(a, 's_gil', c.id);
  assert.equal(etapa(r, 'ESTUDO').estado, 'CUMPRIDO'); assert.equal(r.atual.codigo, 'VISITA'); assert.match(r.atual.nome, /em andamento no local/);
  assert.equal(sla(a, c.id).estado, 'EM_DIA');
  // registro antigo sem as mudanças de situação no histórico, já agendado: a etapa 1 conta como cumprida (sem a hora)
  const id2 = 'ch_sem_hist';
  a.tabelas.ATEC_CHAMADOS.push(Object.assign({}, linha(a, c.id), { ID: id2, NUMERO: 'CH-2026-9030', SITUACAO: 'EM_EXECUCAO', REP_REGUA_JSON: '' }));
  const R2 = a.ctx.RepR_calcular_(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === id2), a.relogio.agora);
  assert.equal(R2.etapas[0].estado, 'CUMPRIDO'); assert.match(R2.etapas[0].comoTexto, /não guarda a hora/);
  assert.notEqual(R2.sla.estado, 'ESTOURADO');
});

test('chamados que não são da régua não mudam: comum (prazo pela prioridade) e comum ligado depois à representada', () => {
  const a = amb();
  const comum = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', equipamentoId: 'eq2', sintoma: 'Lavadora não seca a carga no final', solicitante: 'Rui', prioridade: 'P3', canal: 'TELEFONE' })).chamado;
  a.mudar('2026-10-30T10:00:00-03:00');
  const l = linha(a, comum.id);
  assert.equal(a.ctx.RepR_calcular_(l, a.relogio.agora), null);
  assert.equal(sla(a, comum.id).estado, 'ESTOURADO', 'P3 pela conta da Assistência');
  // chamado comum ligado depois mantém o prazo com que nasceu
  const ligado = Object.assign({}, l, { ID: 'ch_lig', REPRESENTADA_ID: 'repB', REP_LIGADO_EM: '2026-10-20T10:00:00', SLA_FONTE: 'PADRAO' });
  assert.equal(a.ctx.RepR_calcular_(ligado, a.relogio.agora), null);
  assert.equal(a.ctx.Ast_slaEstado_(ligado, a.relogio.agora).estado, a.ctx.Ast_slaEstado_(l, a.relogio.agora).estado);
});

test('prazos configuráveis por representada: relatório e avaliação em dias úteis (1 a 15), usados nos chamados', () => {
  const a = amb();
  const base = { id: 'repB', nome: 'BRASMEDICAL TESTE', situacao: 'ATIVA', prazos: { aceiteMin: 240, atendimentoMin: 1710, alertaFracao: 0.75, semRegistroDiasUteis: 3, relatorioDiasUteis: 0, avaliacaoDiasUteis: 2 } };
  const e = a.rep('s_dora', 'salvarRepresentada', base);
  assert.equal(e.ok, false); assert.ok(e.faltam.some((f) => f.campo === 'relatorioDiasUteis'));
  ok(a.rep('s_dora', 'salvarRepresentada', Object.assign({}, base, { prazos: Object.assign({}, base.prazos, { relatorioDiasUteis: 3, avaliacaoDiasUteis: 1 }) })));
  const ini = ok(a.rep('s_qualidade', 'inicio', {}));
  assert.equal(ini.prazosTexto.relatorio, '3 dias úteis'); assert.equal(ini.prazosTexto.avaliacao, '1 dia útil');
  const c = chamado(a);
  a.mudar('2026-10-20T09:00:00-03:00');
  agendar(a, c.id, '2026-10-21T09:00');
  a.mudar('2026-10-21T09:05:00-03:00');
  mudar(a, c.id, 'NO_LOCAL');
  a.mudar('2026-10-21T10:00:00-03:00');
  mudar(a, c.id, 'DOC_PENDENTE');
  const r = regua(a, 's_gil', c.id);
  assert.equal(etapa(r, 'RELATORIO:1').ateMs, a.ctx.Ast_somarMinUteis_(em('2026-10-21T10:00:00-03:00'), 3 * 570));
  assert.equal(r.prazos.relatorio, '3 dias úteis');
});

test('Metrolabs registra a previsão informada por outro canal (com quem informou); peça dispensada abre a reavaliação', () => {
  const a = amb();
  const c = chamado(a);
  a.mudar('2026-10-20T09:00:00-03:00');
  ok(a.api('s_gil', 'triagem', { id: c.id, checklist: CHECK, acao: 'AGUARDANDO_PECA', pecaDescricao: 'Sensor de temperatura PT100', tipoCodigo: 'MANUTENCAO_CORRETIVA' }));
  let r = regua(a, 's_gil', c.id);
  assert.equal(etapa(r, 'ESTUDO').estado, 'CUMPRIDO'); assert.match(etapa(r, 'ESTUDO').como, /precisa de peça/);
  assert.equal(r.atual.chave, 'PECA_PREVISAO:1'); assert.equal(sla(a, c.id).estado, 'PAUSADO');
  assert.equal(a.rep('s_gil', 'registrarPrevisaoPeca', { id: c.id, previsao: '2026-10-23' }).faltam[0].campo, 'pcObs');
  r = ok(a.rep('s_gil', 'registrarPrevisaoPeca', { id: c.id, previsao: '2026-10-23', obs: 'Qualidade da Brasmedical, por telefone' })).regua;
  assert.equal(etapa(r, 'PECA_CHEGADA:1').previsao, '23/10/2026');
  // a peça não resolve: volta à triagem (peça dispensada) e abre a reavaliação com 2 dias úteis
  a.mudar('2026-10-21T10:00:00-03:00');
  mudar(a, c.id, 'EM_TRIAGEM', {}, 'Peça não resolve: refazer o diagnóstico');
  r = regua(a, 's_gil', c.id);
  assert.equal(r.atual.codigo, 'AVALIACAO'); assert.match(r.atual.nome, /Reavaliação/);
  assert.equal(r.atual.ateMs, a.ctx.Ast_somarMinUteis_(em('2026-10-21T10:00:00-03:00'), 1140));
});
