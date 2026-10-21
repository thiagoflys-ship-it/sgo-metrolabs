// Assistência técnica nativa do SGO+ (21/10/2026): chamado, triagem, prazo (SLA), agenda com conflito, O.S. com trava de
// encerramento, API do aplicativo do técnico (sincronização idempotente), portal do cliente, orçamento, fonte única.
// Código real num contexto isolado (tests/_assistencia_ambiente.cjs); só dados de teste; relógio fixo; trava não reentrante.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA, abrirChamado, triarVisita, agendar, chamadoAgendado, PREPARO } = require('./_assistencia_ambiente.cjs');

const ev = (tipo, osId, n, dados, em) => ({ tipo, osId, idLocal: 'apar1-' + String(n).padStart(4, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
function sync(amb, sid, eventos, pedido) { return amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: pedido || 'p-' + Math.random().toString(36).slice(2), eventos }); }
/** Documentação completa do tipo Manutenção corretiva pelo aplicativo. */
function documentar(amb, osId, base) {
  base = base || 100;
  const r = sync(amb, 's_tiago', [
    ev('RESPOSTA', osId, base + 1, { perguntaId: 'identificado', valor: 'SIM' }),
    ev('RESPOSTA', osId, base + 2, { perguntaId: 'defeito', valor: 'Resistência aberta' }),
    ev('RESPOSTA', osId, base + 3, { perguntaId: 'teste_ok', valor: 'SIM' }),
    ev('RESPOSTA', osId, base + 4, { perguntaId: 'liberado', valor: 'SIM' }),
    ev('RELATO', osId, base + 5, { relato: 'Troca da resistência e teste de três ciclos completos', condicaoEncontrada: 'Parada com erro de aquecimento', causa: 'Resistência queimada', servicoRealizado: 'Troca da resistência da câmara', testeFuncional: 'Três ciclos completos sem erro', serieConfirmada: 'S-100', identificadoPor: 'QR' }),
    ev('PECA', osId, base + 6, { descricao: 'Resistência da câmara', quantidade: 1, situacao: 'APLICADA' })
  ]);
  ok(r);
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId, idLocal: 'foto-' + base + '-' + i, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-10-20T09:30:00' })));
}

// ------------------------------------------------------------------ prazos e triagem
test('SLA: P1 4 h úteis, P2 1 dia útil, P3 3 dias úteis, P4 7 dias úteis; fora do expediente conta da próxima abertura; contrato prevalece', () => {
  const amb = ambiente();
  const p = (pr, cli) => abrirChamado(amb, { prioridade: pr, clienteId: cli || 'c1', equipamentoId: cli === 'c2' ? 'eq3' : 'eq1', unidadeId: cli === 'c2' ? 'un2' : 'un1', confirmarDuplicado: true });
  assert.equal(p('P1').sla.ate, '2026-10-19T14:00:00');
  assert.equal(p('P2').sla.ate, '2026-10-20T10:00:00');
  assert.equal(p('P3').sla.ate, '2026-10-22T10:00:00');
  assert.equal(p('P4').sla.ate, '2026-10-28T10:00:00');
  // sexta 16h + 4 h úteis = segunda 10h30 (expediente 08:00 a 17:30)
  amb.mudar('2026-10-23T16:00:00-03:00');
  assert.equal(p('P1').sla.ate, '2026-10-26T10:30:00');
  // contrato do cliente c2: P1 em 2 horas úteis
  const reg = ok(amb.api('s_dora', 'regras', {})).regras;
  reg.contratos = [{ clienteId: 'c2', clienteNome: 'Clínica Teste Beta', prazos: { P1: { atendimentoMin: 120 } } }];
  ok(amb.api('s_dora', 'regras', { salvar: reg, motivo: 'Contrato de teste da Clínica Beta' }));
  amb.mudar('2026-10-19T10:00:00-03:00');
  const c = p('P1', 'c2');
  assert.equal(c.sla.ate, '2026-10-19T12:00:00');
  assert.equal(c.slaFonte, 'Contrato do cliente');
  // estado do prazo: em risco com 25% e estourado depois
  amb.mudar('2026-10-19T11:40:00-03:00');
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado.sla.estado, 'EM_RISCO');
  amb.mudar('2026-10-19T12:30:00-03:00');
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado.sla.estado, 'ESTOURADO');
  const itens = amb.pend('s_gil').filter((i) => i.tipo === 'ast_sla');
  assert.ok(itens.some((i) => /estourado/.test(i.titulo) && i.gravidade === 'CRITICO'), JSON.stringify(itens.map((i) => i.titulo)));
});

test('triagem: gestão da área Técnica (Caixa de decisões); sem gestor, a Diretoria; mínimo do checklist; mudança de prioridade com motivo refaz o prazo', () => {
  const amb = ambiente();
  const c = abrirChamado(amb, {}, 's_mara');
  assert.match(amb.api('s_tiago', 'triagem', { id: c.id, acao: 'PLANEJADO' }).message, /gestão da área Técnica/);
  const pend = amb.pend('s_gil').filter((i) => i.tipo === 'ast_triagem');
  assert.equal(pend.length, 1);
  assert.match(pend[0].oQueFazer, /Assistência técnica > Chamados/);
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.DESTINATARIO_ID === 'u_gt' && /Chamado novo/.test(a.TITULO)));
  let r = amb.api('s_gil', 'triagem', { id: c.id, acao: 'PLANEJADO', tipoCodigo: 'MANUTENCAO_CORRETIVA' });
  assert.match(r.message, /falta preencher sintomas confirmados/);
  r = amb.api('s_gil', 'triagem', { id: c.id, prioridade: 'P1' });
  assert.match(r.message, /escreva o motivo/);
  r = ok(amb.api('s_gil', 'triagem', { id: c.id, prioridade: 'P1', prioridadeMotivo: 'Equipamento único da CME' }));
  assert.equal(r.chamado.prioridade, 'P1');
  assert.equal(r.chamado.sla.ate, '2026-10-19T14:00:00');
  triarVisita(amb, c.id);
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado.situacao, 'PLANEJADO');
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_triagem').length, 0);
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_agendar').length, 1);
  // sem gestor da área Técnica: a triagem vai para a Diretoria
  const amb2 = ambiente({ props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: {} }) }, tabelas: { CAD_USUARIOS: ambiente().tabelas.CAD_USUARIOS.filter((u) => u.ID !== 'u_gt') } });
  const c2 = ok(amb2.api('s_dora', 'abrir', { clienteId: 'c1', equipamentoId: 'eq1', sintoma: 'Lavadora não seca a carga no final', solicitante: 'Rui', prioridade: 'P3', canal: 'TELEFONE' })).chamado;
  assert.equal(c2.triagemResponsavel, 'DORA DIRETORA TESTE');
});

test('abertura: equipamento do cliente, duplicado pede confirmação, reincidência em 30 dias, mensagens completas', () => {
  const amb = ambiente();
  assert.match(amb.api('s_gil', 'abrir', { clienteId: 'c1', equipamentoId: 'eq3', sintoma: 'Teste de equipamento de outro cliente', solicitante: 'Rui', prioridade: 'P3' }).message, /não é do cliente/);
  assert.match(amb.api('s_gil', 'abrir', { clienteId: 'c1', sintoma: 'Sem equipamento escolhido aqui', solicitante: 'Rui', prioridade: 'P3' }).message, /Equipamento não identificado/);
  assert.match(amb.api('s_gil', 'abrir', { clienteId: 'c1', equipamentoId: 'eq1', sintoma: 'curto', solicitante: 'Rui', prioridade: 'P3' }).message, /pelo menos 10 letras/);
  const c = abrirChamado(amb);
  const dup = amb.api('s_gil', 'abrir', { clienteId: 'c1', equipamentoId: 'eq1', sintoma: 'Outro problema no mesmo equipamento', solicitante: 'Rui', prioridade: 'P3' });
  assert.equal(dup.duplicado, true);
  assert.match(dup.message, new RegExp(c.numero));
  // depois de encerrar (remoto), o novo chamado do mesmo equipamento é reincidência
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Baixo', diagnostico_preliminar: 'Configuração errada' }, acao: 'RESOLVIDO_REMOTO', orientacao: 'Orientado a refazer a configuração do ciclo' }));
  ok(amb.api('s_gil', 'encerrarRemoto', { id: c.id, confirmadoPor: 'Rui Responsável Teste', testeFuncional: 'Ciclo completo depois da orientação' }));
  amb.mudar('2026-11-05T10:00:00-03:00');
  const c2 = abrirChamado(amb);
  assert.equal(c2.reincidente, true);
  assert.equal(c2.reincidenciaDe, c.numero);
  const c3 = abrirChamado(amb, { equipamentoId: 'eq2' });
  assert.equal(c3.reincidente, false);
});

// ------------------------------------------------------------------ agenda
test('agenda: técnico da lista, preparo, conflito avisado (confirma com motivo), reagendar exige motivo e avisa', () => {
  const amb = ambiente();
  const a = chamadoAgendado(amb);
  assert.equal(a.os.numero, 'OS-2026-0001');
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((x) => x.RESPONSAVEL_ID === 'u_tec' && /OS-2026-0001/.test(x.TITULO)), 'atividade do técnico criada');
  const c2 = abrirChamado(amb, { equipamentoId: 'eq2' });
  triarVisita(amb, c2.id);
  assert.match(agendar(amb, c2.id, '2026-10-20T09:00', { tecnicoId: 'u_ven' }).message, /escolha um técnico da lista/);
  assert.match(agendar(amb, c2.id, '2026-10-20T09:00', { preparo: { ferramentas: true } }).message, /confirme no preparo/);
  const conf = agendar(amb, c2.id, '2026-10-20T10:00');
  assert.equal(conf.conflito, true);
  assert.match(conf.message, /OS-2026-0001/);
  assert.equal(amb.tabelas.ATEC_OS.length, 1, 'com conflito sem confirmação nada é gravado');
  assert.match(agendar(amb, c2.id, '2026-10-20T10:00', { confirmarConflito: true }).message, /escreva o motivo/);
  const r = ok(agendar(amb, c2.id, '2026-10-20T10:00', { confirmarConflito: true, motivoConflito: 'O primeiro atendimento é curto' }));
  assert.equal(r.conflitos.length, 1);
  assert.ok(amb.tabelas.ATEC_AVISOS.some((x) => x.TIPO === 'CONFLITO' && x.DESTINATARIO_ID === 'u_gt') === false, 'quem confirmou (gestor) não recebe o próprio aviso');
  // reagendar
  assert.match(agendar(amb, a.chamado.id, '2026-10-21T14:00').message, /escreva o motivo/);
  const re = ok(agendar(amb, a.chamado.id, '2026-10-21T14:00', { motivo: 'Cliente pediu outro dia', tecnicoId: 'u_tec2' }));
  assert.equal(re.os.numero, 'OS-2026-0001', 'reagendar mantém a mesma O.S.');
  assert.equal(re.os.tecnicoId, 'u_tec2');
  assert.ok(amb.tabelas.ATEC_AVISOS.some((x) => x.DESTINATARIO_ID === 'u_tec' && /passou para/.test(x.TITULO)), 'técnico anterior avisado');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'REAGENDADO' && /Cliente pediu outro dia/.test(e.TEXTO)));
  const ag = ok(amb.api('s_gil', 'agenda', { inicio: '2026-10-20', dias: 7 }));
  assert.ok(ag.tecnicos.find((t) => t.id === 'u_tec2').itens.some((i) => i.numero === 'OS-2026-0001'));
  // técnico vê só a própria agenda
  const agT = ok(amb.api('s_tiago', 'agenda', { inicio: '2026-10-20', dias: 7 }));
  assert.deepEqual(JSON.parse(JSON.stringify(agT.tecnicos.map((t) => t.id))), ['u_tec']);
  const rota = ok(amb.api('s_tales', 'rota', { dia: '2026-10-21' }));
  assert.equal(rota.paradas.length, 1);
  assert.match(rota.linkRota, /google\.com\/maps/);
});

// ------------------------------------------------------------------ O.S. e aplicativo
test('API do aplicativo: Meu dia, sincronização idempotente por idLocal, trava por técnico responsável e sessão', () => {
  const amb = ambiente();
  const { os } = chamadoAgendado(amb);
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' }));
  assert.equal(md.os.length, 1);
  const o = md.os[0];
  assert.equal(o.numero, os.numero);
  assert.equal(o.cliente.nome, 'Hospital Teste Alfa');
  assert.equal(o.equipamento.serie, 'S-100');
  assert.ok(o.checklist.perguntas.length >= 5);
  assert.match(o.enderecoMapa, /google\.com\/maps/);
  assert.equal(ok(amb.app('Ast_appMeuDia', 's_tales', { dia: '2026-10-20' })).os.length, 0, 'outro técnico não vê');
  assert.equal(amb.app('Ast_appMeuDia', 's_inexistente', {}).codigo, 'SESSAO');
  assert.equal(amb.app('Ast_appMeuDia', 's_cliente.alfa', {}).codigo, 'SEM_ACESSO');
  // fila do aparelho
  const eventos = [ev('CHEGUEI', os.id, 1, { lat: -16.6870, lng: -49.2650, precisao: 15 }, '2026-10-20T09:05:00'), ev('RESPOSTA', os.id, 2, { perguntaId: 'identificado', valor: 'SIM' })];
  const r1 = ok(sync(amb, 's_tiago', eventos, 'pedido-1'));
  assert.equal(r1.aceitos.length, 2);
  assert.equal(r1.aceitos.filter((a) => a.duplicado).length, 0);
  const n1 = amb.tabelas.ATEC_EVENTOS.length;
  const r2 = ok(sync(amb, 's_tiago', eventos, 'pedido-1-repetido'));
  assert.equal(r2.aceitos.length, 2);
  assert.ok(r2.aceitos.every((a) => a.duplicado), 'reenvio não duplica');
  assert.equal(amb.tabelas.ATEC_EVENTOS.length, n1, 'nenhum evento novo no histórico');
  assert.equal(amb.tabelas.ATEC_SYNC.filter((s) => s.RESULTADO === 'ACEITO').length, 2);
  // mesmo idLocal duas vezes no mesmo envio
  const r3 = ok(sync(amb, 's_tiago', [ev('RESPOSTA', os.id, 9, { perguntaId: 'teste_ok', valor: 'SIM' }), ev('RESPOSTA', os.id, 9, { perguntaId: 'teste_ok', valor: 'SIM' })]));
  assert.equal(r3.aceitos.filter((a) => !a.duplicado).length, 1);
  // outro técnico: recusado definitivo
  const r4 = ok(sync(amb, 's_tales', [ev('RESPOSTA', os.id, 50, { perguntaId: 'liberado', valor: 'SIM' })]));
  assert.equal(r4.recusados.length, 1);
  assert.equal(r4.recusados[0].definitivo, true);
  assert.match(r4.recusados[0].motivo, /é de TIAGO/);
  // recusa corrigível não consome o idLocal
  const r5 = ok(sync(amb, 's_tiago', [ev('RESPOSTA', os.id, 60, { perguntaId: 'liberado', valor: 'TALVEZ' })]));
  assert.equal(r5.recusados[0].definitivo, false);
  assert.match(r5.recusados[0].motivo, /SIM, NAO ou NA/);
  const r6 = ok(sync(amb, 's_tiago', [ev('RESPOSTA', os.id, 60, { perguntaId: 'liberado', valor: 'SIM' })]));
  assert.equal(r6.aceitos.length, 1);
  assert.equal(r6.aceitos[0].duplicado, false);
  // localização só em Cheguei/Concluí; distância calculada (unidade com coordenadas)
  const reg = amb.tabelas.ATEC_OS.find((x) => x.ID === os.id);
  assert.ok(reg.CHEGOU_LAT && Number(reg.CHEGOU_DIST_M) < 1000);
  assert.equal(reg.SITUACAO, 'EM_EXECUCAO');
  assert.equal(amb.tabelas.ATEC_CHAMADOS[0].SITUACAO, 'EM_EXECUCAO');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('trava de encerramento: CONCLUI sem a documentação fica em "documentação pendente"; completar encerra sozinho, gera o A4 e conclui a atividade', () => {
  const amb = ambiente();
  const { os, chamado } = chamadoAgendado(amb);
  let r = ok(sync(amb, 's_tiago', [ev('CONCLUI', os.id, 1)]));
  assert.match(r.recusados[0].motivo, /chegada não foi registrada/);
  r = ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 2), ev('CONCLUI', os.id, 3, {}, '2026-10-20T10:30:00')]));
  const resumo = r.os[0];
  assert.equal(resumo.situacao, 'DOC_PENDENTE');
  assert.ok(resumo.pendencias.some((p) => /assinatura/.test(p)) && resumo.pendencias.some((p) => /foto/.test(p)), JSON.stringify(resumo.pendencias));
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: chamado.id })).chamado.situacao, 'DOC_PENDENTE');
  assert.match(amb.api('s_tiago', 'osEncerrar', { osId: os.id }).message, /falta/);
  const p1 = amb.pend('s_tiago').filter((i) => i.tipo === 'ast_doc_pendente');
  assert.equal(p1.length, 1);
  documentar(amb, os.id);
  // ainda falta a assinatura
  assert.equal(amb.tabelas.ATEC_OS.find((x) => x.ID === os.id).SITUACAO, 'DOC_PENDENTE');
  // sem assinatura só com a exceção completa
  r = ok(sync(amb, 's_tiago', [ev('ASSINATURA', os.id, 200, { semAssinatura: true, motivo: 'RESPONSAVEL_AUSENTE', recebidoPor: 'Ana', justificativa: 'curta' })]));
  assert.match(r.recusados[0].motivo, /justificativa está curta/);
  r = ok(sync(amb, 's_tiago', [ev('ASSINATURA', os.id, 201, { nome: 'Rui Responsável Teste', documento: 'CPF 000', imagem: ASSINATURA })]));
  assert.equal(r.os[0].situacao, 'ENCERRADA');
  assert.ok(r.os[0].relatorioUrl, 'relatório A4 gerado no encerramento');
  const o = amb.tabelas.ATEC_OS.find((x) => x.ID === os.id);
  assert.equal(o.RELATORIO_VERSAO, 1);
  assert.equal(amb.tabelas.ATEC_CHAMADOS[0].SITUACAO, 'ENCERRADO');
  assert.equal(amb.tabelas.ATEC_RELATORIOS.length, 1);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === o.ATIVIDADE_ID).SITUACAO, 'Concluída');
  assert.equal(amb.pend('s_tiago').filter((i) => i.tipo === 'ast_doc_pendente').length, 0);
  // depois de encerrada não aceita mais nada
  r = ok(sync(amb, 's_tiago', [ev('RELATO', os.id, 300, { relato: 'Tentativa de mudar depois do fim do atendimento' })]));
  assert.equal(r.recusados[0].definitivo, true);
  // assinatura guardada em pasta privada; o PDF do relatório foi gravado
  const ass = amb.arquivos[o.ASSINATURA_ARQUIVO_ID];
  assert.equal(ass.compartilhado, 'PRIVATE');
  assert.ok(Object.values(amb.arquivos).some((a) => /Relatorio da OS - OS-2026-0001 v1/.test(a.nome) && /\.pdf$/.test(a.nome)));
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('série divergente: aceita, avisa a gestão, vira pendência até a conferência; o cadastro não muda sozinho', () => {
  const amb = ambiente();
  const { os } = chamadoAgendado(amb);
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1), ev('RELATO', os.id, 2, { serieConfirmada: 'S-999', identificadoPor: 'SERIE' })]));
  const o = amb.tabelas.ATEC_OS.find((x) => x.ID === os.id);
  assert.equal(o.SERIE_DIVERGENTE, 'SIM');
  assert.equal(amb.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === 'eq1').SERIE, 'S-100');
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.DESTINATARIO_ID === 'u_gt' && /Série divergente/.test(a.TITULO)));
  documentar(amb, os.id);
  ok(sync(amb, 's_tiago', [ev('RELATO', os.id, 400, { serieConfirmada: 'S-999' }), ev('ASSINATURA', os.id, 401, { nome: 'Rui', imagem: ASSINATURA }), ev('CONCLUI', os.id, 402, {}, '2026-10-20T11:00:00')]));
  assert.equal(amb.tabelas.ATEC_OS.find((x) => x.ID === os.id).SITUACAO, 'ENCERRADA');
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_serie').length, 1);
  ok(amb.api('s_gil', 'serieTratada', { osId: os.id, texto: 'Cadastro conferido com a placa no local' }));
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_serie').length, 0);
});

test('peça em falta: abre pedido em Compras ligado ao cliente e ao chamado, O.S. aguardando peça; liberar e reagendar retoma', () => {
  const amb = ambiente();
  amb.api('s_dora', 'iniciar', {});
  amb.ctx.Compras_api('s_dora', 'regras', { salvar: Object.assign({}, amb.ctx.Compras_api('s_dora', 'regras', {}).regras, { compradores: ['u_cmp'] }), motivo: 'Regras de compras do ensaio' });
  const { os, chamado } = chamadoAgendado(amb);
  const r = ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1), ev('PECA', os.id, 2, { descricao: 'Resistência da câmara 220 V', codigo: 'RS-220', quantidade: 1, situacao: 'FALTA' })]));
  assert.equal(r.aceitos.length, 2);
  const o = amb.tabelas.ATEC_OS.find((x) => x.ID === os.id);
  assert.equal(o.SITUACAO, 'PAUSADA');
  const c = amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === chamado.id);
  assert.equal(c.SITUACAO, 'AGUARDANDO_PECA');
  const req = (amb.tabelas.CMP_REQUISICOES || [])[0];
  assert.ok(req, 'pedido de compra aberto');
  assert.equal(req.CLIENTE_ID, 'c1');
  assert.equal(req.OS_AUVO, chamado.numero);
  assert.equal(c.REQUISICAO_NUMERO, req.NUMERO);
  assert.ok(!amb.trava.aninhamentos, 'Compras rodou fora da trava da Assistência');
  ok(amb.api('s_gil', 'retomar', { id: chamado.id, texto: 'Peça chegou e foi separada' }));
  const ag = ok(agendar(amb, chamado.id, '2026-10-22T09:00'));
  assert.equal(ag.os.numero, os.numero);
  assert.equal(ag.os.situacao, 'AGENDADA');
});

test('portal do cliente: só os chamados e equipamentos do próprio cliente; pedido entra na fila e vira chamado; relatório só depois de encerrado', () => {
  const amb = ambiente();
  const s = ok(amb.api('s_cliente.alfa', 'solicitar', { equipamentoId: 'eq1', descricao: 'A autoclave apita no final do ciclo', contato: '62999990000' }));
  assert.match(s.message, /SOL-2026-0001/);
  assert.match(amb.api('s_cliente.alfa', 'solicitar', { equipamentoId: 'eq3', descricao: 'Equipamento de outro cliente aqui', contato: '62999990000' }).message, /não é do cliente/);
  assert.equal(amb.api('s_cliente.alfa', 'lista', {}).semAcesso, true, 'cliente não usa a lista interna');
  assert.equal(amb.api('s_cliente.alfa', 'chamado', { id: 'x' }).semAcesso, true);
  const fila = ok(amb.api('s_gil', 'solicitacoes', {})).solicitacoes;
  assert.equal(fila.length, 1);
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_solicitacao').length, 1);
  const conv = ok(amb.api('s_gil', 'converter', { solicitacaoId: fila[0].id, prioridade: 'P2' }));
  assert.equal(conv.chamado.canal, 'PORTAL');
  const outro = abrirChamado(amb, { clienteId: 'c2', unidadeId: 'un2', equipamentoId: 'eq3' });
  const p = ok(amb.api('s_cliente.alfa', 'portal', {}));
  assert.equal(p.chamados.length, 1);
  assert.equal(p.chamados[0].numero, conv.chamado.numero);
  assert.ok(p.equipamentos.every((e) => e.id !== 'eq3'));
  assert.equal(p.chamados[0].etapaNome, 'Recebido');
  assert.ok(!('tecnicoNome' in p.chamados[0]) && !('sla' in p.chamados[0]), 'sem dados internos');
  const p2 = ok(amb.api('s_cliente.beta', 'portal', {}));
  assert.deepEqual(JSON.parse(JSON.stringify(p2.chamados.map((c) => c.numero))), [outro.numero]);
  assert.equal(p2.relatorios.length, 0);
});

test('orçamento do chamado: Comercial recebe a atividade; técnico não vê valores; aprovar exige o aceite; aprovado vai a Planejado', () => {
  const amb = ambiente();
  const c = abrirChamado(amb);
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Placa de controle queimada' }, acao: 'AGUARDANDO_ORCAMENTO', orcamentoDescricao: 'Troca da placa de controle (fora do contrato)' }));
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((a) => a.RESPONSAVEL_ID === 'u_gc' && /Orçamento do chamado/.test(a.TITULO)));
  const orc = amb.tabelas.ATEC_ORCAMENTOS[0];
  assert.match(amb.api('s_tiago', 'salvarOrcamento', { id: orc.ID, itens: [] }).message, /valores de orçamento/);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Mão de obra', quantidade: 1, valorUnitario: 350 }], condicoes: 'Pagamento em 28 dias' }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  assert.match(amb.api('s_tiago', 'chamado', { id: c.id }).message, /de outro técnico/, 'técnico só vê os chamados dele');
  const vistoInt = ok(amb.api('s_mara', 'chamado', { id: c.id }));
  assert.equal(vistoInt.chamado.situacao, 'AGUARDANDO_ORCAMENTO');
  assert.equal(vistoInt.orcamentos[0].valorTotal, undefined, 'sem valores para quem não é da gestão, Comercial ou Financeiro');
  const vistoGes = ok(amb.api('s_gaspar', 'chamado', { id: c.id }));
  assert.equal(vistoGes.orcamentos[0].valorTotal, 350);
  assert.match(amb.api('s_gaspar', 'decidirOrcamento', { id: orc.ID, decisao: 'APROVADO', aceitePor: 'Rui Responsável Teste' }).message, /anexe o aceite/);
  ok(amb.api('s_gaspar', 'decidirOrcamento', { id: orc.ID, decisao: 'APROVADO', aceitePor: 'Rui Responsável Teste', aceite: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') } }));
  assert.equal(amb.tabelas.ATEC_CHAMADOS[0].SITUACAO, 'PLANEJADO');
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => /Orçamento do chamado/.test(a.TITULO)).SITUACAO, 'Concluída');
});

test('fonte única: Auvo e O.S. do SGO+ na mesma lista, com os campos de sempre; ficha do equipamento junta as duas e o acervo', () => {
  const amb = ambiente({ tabelas: { AUVO_TAREFAS: [{ ID: 'a1', AUVO_TASK_ID: '45123', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME_AUVO: 'TIAGO', TIPO_TAREFA: 'Manutenção Preventiva',
    DATA_TAREFA: '2026-10-10T08:00:00', FINALIZADA: 'SIM', CHECKIN_EM: '2026-10-10T08:10:00', CHECKOUT_EM: '2026-10-10T09:00:00', RELATO_SERVICO: 'Preventiva feita', QTD_FOTOS: 2, EQUIPAMENTOS_ID_SGO: 'eq1', TASK_URL: 'https://app.auvo.exemplo/45123' }] } });
  const { os } = chamadoAgendado(amb);
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1, {}, '2026-10-20T09:05:00')]));
  amb.mudar('2026-10-20T09:30:00-03:00');
  const l = amb.ctx.SGO_Atendimentos_linhas_();
  assert.equal(l.length, 2);
  const sgo = l.find((x) => x.ORIGEM === 'SGO');
  assert.equal(sgo.AUVO_TASK_ID, os.numero);
  assert.equal(sgo.TECNICO_ID_SGO, 'u_tec');
  assert.equal(sgo.FINALIZADA, 'NAO');
  assert.ok(sgo.CHECKIN_EM && !sgo.CHECKOUT_EM);
  assert.equal(l.find((x) => x.ORIGEM === 'AUVO').AUVO_TASK_ID, '45123');
  // técnico em atendimento (ponto)
  assert.equal(amb.ctx.SGO_Atendimentos_emAtendimento_('u_tec').AUVO_TASK_ID, os.numero);
  // ficha do equipamento: as duas origens + o acervo indexado
  amb.tabelas.ATEC_ACERVO_EQUIP = [{ ID: 'ix1', AUVO_TASK_ID: '30001', DATA_TAREFA: '2025-03-01T08:00:00', TIPO_TAREFA: 'Manutenção Corretiva', TECNICO_NOME: 'Técnico antigo', FINALIZADA: 'SIM', EQUIPAMENTO_ID_SGO: 'eq1', CLIENTE_ID_SGO: 'c1', RESUMO: 'Troca de vedação' }];
  const h = amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', { sessao: { perfil: 'GESTOR' } });
  assert.deepEqual(JSON.parse(JSON.stringify(h.map((x) => x.origem))), ['SGO', 'AUVO', 'AUVO_ACERVO']);
  // cliente: só O.S. do SGO+ encerrada e sem link do Auvo
  const hc = amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', { sessao: { perfil: 'CLIENTE', clienteId: 'c1' } });
  assert.ok(hc.every((x) => x.origem !== 'SGO') && hc.every((x) => !x.link));
  assert.equal(amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', { sessao: { perfil: 'CLIENTE', clienteId: 'c2' } }).length, 0);
  // qualidade lê a fonte única sem quebrar: motivos da O.S. do SGO+ aparecem pelo mesmo formato
  assert.deepEqual(JSON.parse(JSON.stringify(amb.ctx.QualidadeAuvo_motivosTarefa_(Object.assign({}, sgo, { FINALIZADA: 'SIM' }), {}).sort())), ['check-out ausente', 'foto ausente', 'questionário vazio', 'relato ausente'].sort());
});

test('regras da assistência: Administrador, Diretoria e Gestor; tipo e modelo de checklist com versão; interruptor desliga o aplicativo sem apagar', () => {
  const amb = ambiente();
  const r = ok(amb.api('s_gil', 'regras', {}));
  assert.equal(r.tipos.length, 29);
  assert.ok(r.modelos.length >= 7);
  assert.match(amb.api('s_tiago', 'salvarTipo', { tipo: { nome: 'X' }, motivo: 'teste de permissão' }).message, /Regras da assistência/);
  ok(amb.api('s_gil', 'salvarTipo', { tipo: { codigo: 'TREINAMENTO', nome: 'Treinamento', grupo: 'OUTROS', exige: { relato: true, assinatura: true, fotosMin: 1 }, modeloCodigo: 'MOD_TREINAMENTO' }, motivo: 'Qualidade pediu uma foto da lista de presença' }));
  assert.equal(amb.tabelas.ATEC_TIPOS.find((t) => t.CODIGO === 'TREINAMENTO').FOTOS_MIN, 1);
  const m = ok(amb.api('s_gil', 'salvarModelo', { modelo: { codigo: 'MOD_TREINAMENTO', nome: 'Treinamento', perguntas: [{ id: 'conteudo', texto: 'Conteúdo', tipo: 'TEXTO', obrigatoria: true }] }, motivo: 'Reduzir o checklist do treinamento' }));
  assert.equal(m.modelos.find((x) => x.codigo === 'MOD_TREINAMENTO').versao, 2);
  assert.match(amb.api('s_gil', 'salvarModelo', { modelo: { nome: 'Novo', perguntas: [{ texto: 'Estado', tipo: 'OPCAO', opcoes: ['Bom'] }] }, motivo: 'Modelo de teste com opção única' }).message, /duas opções/);
  const { os } = chamadoAgendado(amb);
  ok(amb.api('s_dora', 'ligar', { ligada: false, motivo: 'Pausa do piloto de teste' }));
  assert.equal(amb.app('Ast_appMeuDia', 's_tiago', {}).codigo, 'DESLIGADA');
  assert.equal(amb.tabelas.ATEC_OS.length, 1, 'nada apagado');
  ok(amb.api('s_dora', 'ligar', { ligada: true, motivo: 'Retomada do piloto de teste' }));
  assert.equal(ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' })).os[0].id, os.id);
});

test('transição do Auvo: seis critérios; só o Administrador marca "Auvo desligado" e só com todos cumpridos', () => {
  const amb = ambiente({ tabelas: { AUVO_TAREFAS: [{ ID: 'a1', AUVO_TASK_ID: '45123', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TIPO_TAREFA: 'Visita', DATA_TAREFA: '2026-10-15T08:00:00', FINALIZADA: 'NAO', EQUIPAMENTOS_ID_SGO: 'eq1' }] } });
  let t = ok(amb.api('s_gil', 'transicao', {})).transicao;
  assert.equal(t.criterios.length, 6);
  assert.equal(t.todosCumpridos, false);
  assert.equal(t.criterios[3].abertas.length, 1);
  assert.match(amb.api('s_gil', 'auvoDesligado', { texto: 'Tentativa sem ser administrador' }).message, /só o Administrador/);
  assert.match(amb.api('s_admin', 'auvoDesligado', { texto: 'Tentativa antes dos critérios' }).message, /ainda falta cumprir/);
  assert.match(amb.api('s_gil', 'confirmarCriterio', { chave: 'faltasAceitas', texto: 'Aceito as faltas do relatório' }).message, /decisão do dono/);
  const d = ok(amb.api('s_gil', 'destinoAuvo', { taskId: '45123', destino: 'RECRIAR', texto: 'Continua no SGO+' }));
  assert.match(d.message, /chamado CH-2026-0001/);
  assert.equal(d.transicao.criterios[3].cumprido, true);
});
