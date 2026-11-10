// Assistência técnica, 27/10/2026 (decisões do dono): triagem "Alerta + fila livre" e exclusão lógica de chamado de teste ou
// simulação. Código real num contexto isolado (tests/_assistencia_ambiente.cjs); só dados de teste; relógio fixo (segunda 10h);
// trava não reentrante.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, abrirChamado, triarVisita, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const chamadoDe = (amb, id) => amb.tabelas.ATEC_CHAMADOS.find((c) => c.ID === id);
const avisos = (amb, tipo) => amb.tabelas.ATEC_AVISOS.filter((a) => a.TIPO === tipo);
const falha = (r, rx) => { assert.equal(r.ok, false, 'esperava recusa: ' + JSON.stringify(r).slice(0, 200)); assert.match(r.message, rx); return r; };
const CHECK = { sintomas_confirmados: 'Confirmado por telefone com o responsável', risco_operar: 'Médio: não usar até o conserto', diagnostico_preliminar: 'Provável falha na resistência' };

test('chamado novo: alerta "pendente de triagem" para quem faz a triagem (AT01) e para a gestão (AT18, só no sistema), contador e pendência', () => {
  const amb = ambiente();
  const c = abrirChamado(amb, { prioridade: 'P3' }, 's_mara');
  assert.equal(c.pendenteTriagem, true); assert.equal(c.filaLivre, false); assert.equal(c.filaLivreAs, '19/10/2026 10:30');
  // quem faz a triagem hoje (Caixa de decisões: u_gt) recebe o aviso de sempre; a Diretoria recebe o alerta da gestão
  assert.ok(avisos(amb, 'CHAMADO_NOVO').some((a) => a.DESTINATARIO_ID === 'u_gt' && /fila livre/.test(a.TEXTO)));
  const g = avisos(amb, 'TRIAGEM_PENDENTE');
  assert.deepEqual(g.map((a) => a.DESTINATARIO_ID), ['u_dir']);
  assert.match(g[0].TITULO, /^Chamado pendente de triagem: CH-/);
  const ntf18 = amb.tabelas.NTF_ENVIOS.filter((n) => n.EVENTO === 'AT18');
  assert.ok(ntf18.length >= 1 && ntf18.every((n) => n.SITUACAO !== 'OK'), 'AT18 fica só no sistema (sem e-mail nem WhatsApp de partida)');
  assert.equal(amb.whats.length, 0);
  // matriz: eventos novos registrados, só no sistema
  const mtz = amb.ctx.MTZ_PADRAO.filter((e) => e.cod === 'AT18' || e.cod === 'AT19');
  assert.equal(mtz.length, 2); assert.ok(mtz.every((e) => e.email === 'NAO' && e.whatsapp === 'NAO'));
  // contador: o gestor pode assumir; o técnico ainda não (reservado)
  const kg = ok(amb.api('s_gil', 'contadorTriagem')).triagem;
  assert.equal(kg.pendentes, 1); assert.equal(kg.paraMim, 1); assert.equal(kg.filaLivre, 0); assert.equal(kg.minutos, 30);
  const kt = ok(amb.api('s_tiago', 'contadorTriagem')).triagem;
  assert.equal(kt.paraMim, 0);
  const lista = ok(amb.api('s_gil', 'lista', { grupo: 'TRIAGEM' }));
  assert.equal(lista.contagem.pendentesTriagem, 1); assert.equal(lista.chamados[0].podeAssumir, true);
  // pendência na central para quem faz a triagem e para a Diretoria
  const p = amb.pend('s_gil').filter((i) => i.tipo === 'ast_triagem');
  assert.equal(p.length, 1); assert.match(p[0].titulo, /Chamado pendente de triagem/); assert.match(p[0].detalhe, /vai para a fila livre/); assert.match(p[0].oQueFazer, /Assumir chamado/);
  assert.equal(amb.pend('s_dora').filter((i) => i.tipo === 'ast_triagem').length, 1);
  // o técnico não assume antes da hora: o quê, por quê, o que fazer
  amb.mudar('2026-10-19T10:10:00-03:00');
  falha(amb.api('s_tiago', 'assumir', { id: c.id }), /gestão da área Técnica/);
  assert.equal(ok(amb.api('s_tiago', 'lista', { grupo: 'TRIAGEM' })).chamados.length, 0, 'reservado: o técnico ainda não vê');
});

test('fila livre: 30 minutos úteis sem ninguém assumir, qualquer colaborador assume ("Assumir chamado"), com registro de quem e quando; aviso uma vez só (AT19)', () => {
  const amb = ambiente();
  const c = abrirChamado(amb, { prioridade: 'P3' }, 's_mara');
  amb.mudar('2026-10-19T10:31:00-03:00');
  const fila = ok(amb.api('s_tiago', 'lista', { grupo: 'FILA_LIVRE' }));
  assert.equal(fila.chamados.length, 1); assert.equal(fila.chamados[0].filaLivre, true); assert.equal(fila.chamados[0].podeAssumir, true);
  assert.equal(fila.contagem.filaLivre, 1);
  const ch = chamadoDe(amb, c.id);
  assert.equal(ch.FILA_LIVRE_EM, '2026-10-19T10:31:00'); assert.match(ch.PROXIMA_ACAO, /fila livre/);
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === c.id && e.TIPO === 'FILA_LIVRE'));
  const dest = avisos(amb, 'FILA_LIVRE').map((a) => a.DESTINATARIO_ID).sort();
  assert.ok(['u_tec', 'u_tec2', 'u_gt', 'u_dir'].every((id) => dest.includes(id)), dest.join(','));
  assert.match(avisos(amb, 'FILA_LIVRE')[0].TEXTO, /Se já está em outro atendimento, não precisa fazer nada/);
  assert.ok(amb.tabelas.NTF_ENVIOS.filter((n) => n.EVENTO === 'AT19').every((n) => n.SITUACAO !== 'OK'), 'AT19 só no sistema de partida');
  // a rotina e outra abertura da lista não avisam de novo
  const n = amb.tabelas.ATEC_AVISOS.length;
  amb.ctx.Assistencia_rotinaGatilho();
  ok(amb.api('s_gil', 'lista', {}));
  assert.equal(amb.tabelas.ATEC_AVISOS.length, n);
  // pendência da fila livre para os técnicos
  assert.equal(amb.pend('s_tiago').filter((i) => i.tipo === 'ast_fila_livre').length, 1);
  // triagem sem assumir: explica o caminho
  falha(amb.api('s_tiago', 'triagem', { id: c.id, checklist: CHECK }), /Assumir chamado/);
  // assume: vai a "Em triagem" com quem e quando; quem fazia a triagem é avisado só no sistema
  const a = ok(amb.api('s_tiago', 'assumir', { id: c.id }));
  assert.equal(a.chamado.situacao, 'EM_TRIAGEM'); assert.equal(a.chamado.assumidoPor, 'TIAGO TECNICO TESTE'); assert.equal(a.chamado.assumidoEm, '19/10/2026 10:31');
  const ch2 = chamadoDe(amb, c.id);
  assert.equal(ch2.ASSUMIDO_POR_ID, 'u_tec'); assert.equal(ch2.ASSUMIDO_EM, '2026-10-19T10:31:00'); assert.equal(ch2.TRIAGEM_RESPONSAVEL_ID, 'u_tec');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === c.id && e.TIPO === 'ASSUMIDO' && /TIAGO TECNICO TESTE na fila livre/.test(e.TEXTO)));
  assert.deepEqual(avisos(amb, 'TRIAGEM_ASSUMIDA').map((x) => x.DESTINATARIO_ID), ['u_gt']);
  // outro colaborador não assume o mesmo chamado
  falha(amb.api('s_tales', 'assumir', { id: c.id }), /já foi assumido por TIAGO TECNICO TESTE em 19\/10\/2026 10:31/);
  // quem assumiu faz a triagem até o fim
  const t = ok(amb.api('s_tiago', 'triagem', { id: c.id, checklist: CHECK, tipoCodigo: 'MANUTENCAO_CORRETIVA', acao: 'PLANEJADO' }));
  assert.equal(t.chamado.situacao, 'PLANEJADO');
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_triagem' || i.tipo === 'ast_fila_livre').length, 0);
});

test('fila livre conta só o expediente: chamado aberto às 17:20 entra na fila livre às 08:20 do dia útil seguinte', () => {
  const amb = ambiente({ agora: Date.parse('2026-10-19T17:20:00-03:00') });
  const c = abrirChamado(amb, { prioridade: 'P3' }, 's_mara');
  assert.equal(c.filaLivreAs, '20/10/2026 08:20');
  amb.mudar('2026-10-19T20:00:00-03:00'); amb.ctx.Assistencia_rotinaGatilho();
  amb.mudar('2026-10-20T08:15:00-03:00'); amb.ctx.Assistencia_rotinaGatilho();
  assert.equal(chamadoDe(amb, c.id).FILA_LIVRE_EM || '', '');
  amb.mudar('2026-10-20T08:21:00-03:00'); amb.ctx.Assistencia_rotinaGatilho();
  assert.equal(chamadoDe(amb, c.id).FILA_LIVRE_EM, '2026-10-20T08:21:00');
  assert.ok(avisos(amb, 'FILA_LIVRE').length > 0);
});

test('quem faz a triagem é configurável pela gestão (Regras da assistência), sem quebrar o atual; tempo da fila livre validado', () => {
  const amb = ambiente();
  const reg = ok(amb.api('s_dora', 'regras', {}));
  assert.equal(reg.triagem.nome, 'GIL GESTOR TECNICO TESTE'); assert.equal(reg.triagem.configurado, false);
  assert.ok(reg.internos.some((u) => u.id === 'u_met') && !reg.internos.some((u) => u.id === 'u_cli'), 'só equipe interna');
  assert.deepEqual(reg.regras.triagem, { responsaveis: [], filaLivreLigada: true, filaLivreMin: 30 });
  falha(amb.api('s_dora', 'regras', { salvar: Object.assign({}, reg.regras, { triagem: { responsaveis: [], filaLivreLigada: true, filaLivreMin: 2 } }), motivo: 'Teste de validação do tempo' }), /5 a 480 minutos/);
  falha(amb.api('s_dora', 'regras', { salvar: Object.assign({}, reg.regras, { triagem: { responsaveis: ['u_cli'], filaLivreMin: 30 } }), motivo: 'Teste de validação de pessoa' }), /login de cliente/);
  falha(amb.api('s_tiago', 'regras', { salvar: reg.regras, motivo: 'Técnico tentando mudar a triagem' }), /Administrador, pela Diretoria e pelos gestores/);
  ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, reg.regras, { triagem: { responsaveis: ['u_met'], filaLivreLigada: true, filaLivreMin: 60 } }), motivo: 'Triagem passa para a Mara (teste)' }));
  const reg2 = ok(amb.api('s_gil', 'regras', {}));
  assert.equal(reg2.triagem.nome, 'MARA METROLOGIA TESTE'); assert.equal(reg2.triagem.configurado, true);
  const c = abrirChamado(amb, { prioridade: 'P3' }, 's_vera');
  assert.equal(c.filaLivreAs, '19/10/2026 11:00');
  assert.ok(avisos(amb, 'CHAMADO_NOVO').some((a) => a.DESTINATARIO_ID === 'u_met'));
  assert.ok(avisos(amb, 'TRIAGEM_PENDENTE').some((a) => a.DESTINATARIO_ID === 'u_gt'), 'a gestão da área Técnica acompanha');
  // a responsável configurada (sem perfil de gestão) faz a triagem direto; começar a triagem é assumir
  const r = ok(amb.api('s_mara', 'triagem', { id: c.id, checklist: CHECK }));
  assert.equal(r.chamado.situacao, 'EM_TRIAGEM'); assert.equal(r.chamado.assumidoPor, 'MARA METROLOGIA TESTE');
  ok(amb.api('s_mara', 'triagem', { id: c.id, checklist: CHECK, tipoCodigo: 'MANUTENCAO_CORRETIVA', acao: 'PLANEJADO' }));
  // lista vazia volta ao de antes (Caixa de decisões)
  ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, reg2.regras, { triagem: { responsaveis: [], filaLivreLigada: false, filaLivreMin: 30 } }), motivo: 'Volta ao responsável da Caixa' }));
  const c2 = abrirChamado(amb, { prioridade: 'P3', equipamentoId: 'eq2' }, 's_vera');
  assert.equal(c2.filaLivreAs, '', 'fila livre desligada');
  amb.mudar('2026-10-19T15:00:00-03:00');
  assert.equal(ok(amb.api('s_tiago', 'contadorTriagem')).triagem.filaLivre, 0);
  assert.ok(avisos(amb, 'CHAMADO_NOVO').some((a) => a.DESTINATARIO_ID === 'u_gt' && a.REF_ID === c2.id));
});

test('exclusão de chamado de teste: só Gestor, Diretoria e Administrador; vínculos e efeito antes; motivo e confirmação; some de tudo; auditoria; restaurar', () => {
  const amb = ambiente();
  const { chamado, os } = chamadoAgendado(amb);
  const avulso = abrirChamado(amb, { prioridade: 'P3', equipamentoId: 'eq2' });
  // quem não pode: o quê, por quê, o que fazer
  falha(amb.api('s_tiago', 'previaExclusao', { id: chamado.id }), /só do Gestor, da Diretoria e do Administrador/);
  falha(amb.api('s_mara', 'excluir', { id: chamado.id, motivo: 'Chamado de teste da equipe', confirmado: true }), /só do Gestor, da Diretoria e do Administrador/);
  assert.equal(ok(amb.api('s_tiago', 'chamado', { id: chamado.id })).chamado.podeExcluir, false);
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: chamado.id })).chamado.podeExcluir, true);
  // prévia: a O.S. agendada e o efeito; chamado sem vínculo diz que não tem
  const pv = ok(amb.api('s_gil', 'previaExclusao', { id: chamado.id }));
  const vOs = pv.vinculos.find((v) => v.tipo === 'OS');
  assert.ok(vOs && vOs.texto.includes(os.numero), JSON.stringify(pv.vinculos)); assert.match(vOs.efeito, /agenda/); assert.match(vOs.efeito, /Minhas atividades é cancelada/);
  assert.match(pv.vinculos.find((v) => v.tipo === 'CLIENTE').efeito, /portal/);
  const pv2 = ok(amb.api('s_gil', 'previaExclusao', { id: avulso.id }));
  assert.equal(pv2.vinculos.filter((v) => v.tipo !== 'CLIENTE').length, 0);
  // motivo e confirmação obrigatórios; vínculos que mudaram exigem nova leitura
  falha(amb.api('s_gil', 'excluir', { id: chamado.id, motivo: 'teste', confirmado: true }), /pelo menos 10 letras/);
  falha(amb.api('s_gil', 'excluir', { id: chamado.id, motivo: 'Chamado de teste do treinamento' }), /falta a confirmação/);
  falha(amb.api('s_gil', 'excluir', { id: chamado.id, motivo: 'Chamado de teste do treinamento', confirmado: true, vinculosVistos: 0 }), /vínculos do chamado .* mudaram/);
  assert.equal(chamadoDe(amb, chamado.id).EXCLUIDO_EM || '', '', 'nada foi alterado nas recusas');
  const atvId = amb.tabelas.ATEC_OS.find((o) => o.ID === os.id).ATIVIDADE_ID;
  const r = ok(amb.api('s_gil', 'excluir', { id: chamado.id, motivo: 'Chamado de teste do treinamento da equipe', confirmado: true, vinculosVistos: pv.vinculos.length }));
  assert.match(r.message, new RegExp('junto com a O.S. ' + os.numero)); assert.match(r.message, /Nada foi apagado/);
  // nada apagado: as linhas continuam, marcadas
  const ch = chamadoDe(amb, chamado.id), o = amb.tabelas.ATEC_OS.find((x) => x.ID === os.id);
  assert.ok(ch && ch.EXCLUIDO_EM && ch.EXCLUIDO_POR_NOME === 'GIL GESTOR TECNICO TESTE' && ch.EXCLUIDO_MOTIVO === 'Chamado de teste do treinamento da equipe');
  assert.ok(o && o.EXCLUIDO_EM && o.EXCLUSAO_ID === ch.EXCLUSAO_ID);
  // auditoria: quem, quando, motivo
  const aud = amb.tabelas.ATEC_EVENTOS.find((e) => e.ENTIDADE_ID === chamado.id && e.TIPO === 'EXCLUSAO');
  assert.ok(aud); assert.equal(aud.USUARIO_NOME, 'GIL GESTOR TECNICO TESTE'); assert.ok(aud.EM); assert.match(aud.TEXTO, /Motivo: Chamado de teste do treinamento da equipe/);
  if (atvId) { const atv = amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === atvId); assert.equal(atv.SITUACAO, 'Cancelada'); }
  // some de listas, contadores, pendências, agenda, O.S., portal e fonte única de atendimentos
  const todos = ok(amb.api('s_gil', 'lista', { grupo: 'TODOS' }));
  assert.ok(!todos.chamados.some((x) => x.id === chamado.id)); assert.equal(todos.total, 1);
  falha(amb.api('s_gil', 'chamado', { id: chamado.id }), /não foi encontrado/);
  assert.ok(!ok(amb.api('s_gil', 'listaOs', { grupo: 'TODAS' })).os.some((x) => x.id === os.id));
  assert.ok(!amb.pend('s_gil').some((i) => String(i.id).includes(chamado.id) || String(i.id).includes(os.id)));
  assert.ok(!ok(amb.api('s_cliente.alfa', 'portal')).chamados.some((x) => x.id === chamado.id));
  assert.ok(!amb.ctx.SGO_Atendimentos_linhas_({ origem: 'SGO' }).some((t) => String(t.AUVO_TASK_ID) === os.numero || String(t.OS_ID || '') === os.id));
  assert.ok(!amb.tabelas.ATEC_AVISOS.some((a) => [chamado.id, os.id].includes(a.REF_ID) && !a.LIDO_EM), 'avisos do chamado não cobram mais');
  // número nunca se repete
  const novo = abrirChamado(amb, { prioridade: 'P3', equipamentoId: 'eq1' });
  assert.notEqual(novo.numero, chamado.numero);
  // gestão vê os excluídos e restaura (com motivo); técnico não vê
  falha(amb.api('s_tiago', 'excluidos', {}), /só do Gestor, da Diretoria e do Administrador/);
  const exc = ok(amb.api('s_dora', 'lista', { grupo: 'EXCLUIDOS' }));
  assert.equal(exc.excluidos, true); assert.equal(exc.chamados.length, 1);
  assert.equal(exc.chamados[0].excluidoMotivo, 'Chamado de teste do treinamento da equipe'); assert.deepEqual(exc.chamados[0].osExcluidas, [os.numero]);
  falha(amb.api('s_dora', 'restaurar', { id: chamado.id, motivo: 'curto' }), /pelo menos 10 letras/);
  const rs = ok(amb.api('s_dora', 'restaurar', { id: chamado.id, motivo: 'Excluído por engano: é atendimento real' }));
  assert.match(rs.message, /restaurado com a O.S./); assert.match(rs.message, /reagende/);
  assert.equal(chamadoDe(amb, chamado.id).EXCLUIDO_EM, ''); assert.equal(chamadoDe(amb, chamado.id).RESTAURADO_POR_NOME, 'DORA DIRETORA TESTE');
  assert.equal(amb.tabelas.ATEC_OS.find((x) => x.ID === os.id).EXCLUIDO_EM, '');
  assert.ok(ok(amb.api('s_gil', 'lista', { grupo: 'TODOS' })).chamados.some((x) => x.id === chamado.id));
  assert.ok(ok(amb.api('s_gil', 'listaOs', { grupo: 'TODAS' })).os.some((x) => x.id === os.id));
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === chamado.id && e.TIPO === 'RESTAURACAO' && e.USUARIO_NOME === 'DORA DIRETORA TESTE'));
  assert.equal(ok(amb.api('s_dora', 'lista', { grupo: 'EXCLUIDOS' })).chamados.length, 0);
  falha(amb.api('s_dora', 'restaurar', { id: chamado.id, motivo: 'De novo, por engano mesmo' }), /não foi encontrado|não está excluído/);
});

test('tela: badge do menu, faixa de pendentes, "Assumir chamado", aba Fila livre e Excluídos e caixa "Triagem e fila livre" nas regras; ajuda e manual atualizados', () => {
  const fs = require('node:fs'), path = require('node:path');
  const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const js = fs.readFileSync(path.join(pasta, 'JS_Assistencia.html'), 'utf8'), idx = fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8');
  assert.match(idx, /id="menuBadgeAssistencia"/);
  ['At_badgeTriagem_', 'At_faixaTriagem_', 'Assumir chamado', '"FILA_LIVRE", "Fila livre"', '"EXCLUIDOS", "Excluídos"', 'Triagem e fila livre', 'Excluir (teste ou simulação)', 'previaExclusao', 'at-btn44', 'visibilityState']
    .forEach((t) => assert.ok(js.includes(t), 'falta na tela: ' + t));
  const ajuda = fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Assistencia.js'), 'utf8');
  assert.match(ajuda, /fila livre/i); assert.match(ajuda, /Excluídos/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_ASSISTENCIA.md'), 'utf8');
  assert.match(manual, /Fila livre/i); assert.match(manual, /teste ou simulação/);
});
