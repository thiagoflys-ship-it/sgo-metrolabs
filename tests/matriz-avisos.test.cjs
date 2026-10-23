// MATRIZ DE AVISOS (21/10/2026, aprovada pelo dono): tabela única de regras, resumo do dia único (e-mail 08:00, WhatsApp 09:30
// só CLT e só para quem não abriu o sistema), PJ sem WhatsApp em todas as fontes, as quatro exceções da Frota, "vira histórico"
// sem aviso, central filtrada pela área do gestor, preferências de cada pessoa e medição antes/depois.
// Código real do SGO+ num contexto isolado (tests/_matriz_ambiente.cjs), relógio controlado, nada sai de verdade. Dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, atividade, em } = require('./_matriz_ambiente.cjs');

const SEG = (hhmm) => '2026-10-19T' + hhmm + ':00-03:00';   // segunda-feira, dia útil
const TER = (hhmm) => '2026-10-20T' + hhmm + ':00-03:00';
const notificar = (amb, o) => amb.ctx.SGO_notificar_(Object.assign({ titulo: 'Aviso de teste', texto: 'Texto de teste.', canais: ['sgo', 'email', 'whatsapp'], refId: 'ref' + Math.random() }, o));
const sit = (amb, uid, canal) => amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID === uid && l.CANAL === canal).map((l) => l.SITUACAO);

// ------------------------------------------------------------------ tabela de regras
test('tabela de regras: matriz aprovada como padrão, ajuste com motivo e trilha, travas das exceções e do obrigatório, voltar ao padrão', () => {
  const amb = ambiente();
  const c = amb.ctx;
  const r = c.SGO_AvisosMatriz_api('s_dir', 'carregar', {});
  assert.equal(r.ok, true, r.message);
  assert.equal(r.regras.length, 68);
  const por = Object.fromEntries(r.regras.map((x) => [x.cod, x]));
  assert.equal(por.S01.email, 'RESUMO'); assert.equal(por.S01.whatsapp, 'RESUMO');
  assert.equal(por.S19.email, 'HORA'); assert.equal(por.S19.whatsapp, 'RESUMO');
  assert.equal(por.S55.decisao, 'HISTORICO');
  assert.deepEqual(Array.from(r.regras.filter((x) => x.whatsapp === 'HORA').map((x) => x.cod)).sort(), ['S35', 'S36', 'S41', 'S44', 'S67', 'S68']); // S67 (22/10/2026): campainha da Porta da Diretoria; S68 (23/10/2026): abertura automática; pedidos do dono
  assert.equal(por.S56.whatsapp, 'NAO', 'WhatsApp ao cliente só depois do piloto');
  assert.deepEqual(JSON.parse(JSON.stringify(r.cfg)), { horaEmail: '08:00', horaEmailAlternativa: '12:00', horaWhats: '09:30', whatsResumo: true, centralPorArea: true });
  // só Administrador e Diretoria
  assert.match(c.SGO_AvisosMatriz_api('s_gt', 'carregar', {}).message, /Administrador e da Diretoria.*Meus avisos/);
  // sem motivo, recusa
  assert.match(c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S33', email: 'HORA', whatsapp: 'NAO', decisao: 'AVISA', motivo: 'x' }).message, /motivo/);
  // WhatsApp na hora fora das exceções, recusa com o caminho
  assert.match(c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S33', email: 'RESUMO', whatsapp: 'HORA', decisao: 'AVISA', motivo: 'teste de trava' }).message, /exceções aprovadas pelo dono/);
  // obrigatório não desliga
  assert.match(c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S19', email: 'NAO', whatsapp: 'RESUMO', decisao: 'AVISA', motivo: 'teste de trava' }).message, /obrigatório/);
  assert.match(c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S36', email: 'NAO', whatsapp: 'NAO', decisao: 'AVISA', motivo: 'teste de trava' }).message, /obrigatório/);
  // mudança válida: S33 passa a e-mail na hora; vale no próximo aviso e fica na trilha
  const s = c.SGO_AvisosMatriz_api('s_adm', 'salvarRegra', { cod: 'S33', email: 'HORA', whatsapp: 'NAO', decisao: 'AVISA', motivo: 'condutor pediu para saber na hora' });
  assert.equal(s.ok, true, s.message);
  assert.equal(c.SGO_avisoRegra_('S33').email, 'HORA');
  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha;
  assert.equal(t[0].codigo, 'S33'); assert.equal(t[0].antes.email, 'RESUMO'); assert.equal(t[0].depois.email, 'HORA'); assert.equal(t[0].por, 'ADAO ADMINISTRADOR TESTE');
  // voltar ao padrão: nova linha na trilha, nada apagado
  assert.equal(c.SGO_AvisosMatriz_api('s_dir', 'restaurar', { cod: 'S33', motivo: 'voltar ao combinado' }).ok, true);
  assert.equal(c.SGO_avisoRegra_('S33').email, 'RESUMO');
  assert.equal(amb.tabelas.NTF_REGRAS.length, 2);
  // horários com motivo; fora do expediente recusa
  assert.match(c.SGO_AvisosMatriz_api('s_dir', 'salvarCfg', { horaEmail: '07:00', horaWhats: '09:30', motivo: 'teste de horário' }).message, /dentro do expediente/);
  assert.equal(c.SGO_AvisosMatriz_api('s_dir', 'salvarCfg', { horaEmail: '08:30', horaWhats: '10:00', whatsResumo: true, centralPorArea: true, motivo: 'pedido do dono' }).ok, true);
  assert.equal(c.Mtz_cfg_().horaEmail, '08:30');
});

// ------------------------------------------------------------------ PJ sem WhatsApp em todas as fontes
test('vínculo: PJ e vínculo vazio nunca recebem WhatsApp, venha de onde vier (Frota, Avisos, Conduta, Auvo, Comercial, bate-papo, resumo); só CLT', () => {
  const amb = ambiente();
  const fontes = [
    { origem: 'FROTA', evento: 'S35' }, { origem: 'FROTA', evento: 'S36' }, { origem: 'FROTA_RESERVAS', evento: 'S41', categoria: 'FROTA_RESERVAS' },
    { origem: 'FROTA_RESERVAS', evento: 'S44', categoria: 'FROTA_RESERVAS' }, { origem: 'AVISOS', evento: 'S19' }, { origem: 'CONDUTA', evento: 'S51' },
    { origem: 'AUVO_OS', evento: 'S54' }, { origem: 'COMERCIAL' }, { origem: 'BATE_PAPO' }, { origem: 'FROTA' }, { origem: 'RESUMO_DIA', categoria: 'RESUMO_DIA' }
  ];
  fontes.forEach((f) => notificar(amb, Object.assign({ usuarios: ['u_pj', 'u_sem'], canais: ['whatsapp'] }, f)));
  assert.equal(amb.whats.length, 0, 'nenhum WhatsApp a PJ ou vínculo vazio');
  const motivos = amb.tabelas.NTF_ENVIOS.filter((l) => l.CANAL === 'whatsapp');
  assert.equal(motivos.length, fontes.length * 2);
  assert.ok(motivos.filter((l) => l.USUARIO_ID === 'u_pj').every((l) => l.SITUACAO === 'PULADO' && /PJ/.test(l.MOTIVO)), JSON.stringify(motivos));
  assert.ok(motivos.filter((l) => l.USUARIO_ID === 'u_sem').every((l) => l.SITUACAO === 'PULADO' && /não informado/.test(l.MOTIVO)));
  // o e-mail continua para eles (S35 na hora, no expediente)
  notificar(amb, { usuarios: ['u_pj'], canais: ['email'], origem: 'FROTA', evento: 'S35' });
  assert.deepEqual(sit(amb, 'u_pj', 'email'), ['OK']);
  // assistente do ponto: regra própria (categoria PONTO) — a matriz não interfere
  assert.equal(amb.ctx.SGO_avisoMotivoWhatsapp_({ id: 'u_tec', vinculo: 'CLT' }, { categoria: 'PONTO', origem: 'PONTO' }), '');
  assert.equal(amb.ctx.SGO_avisoMatrizPreparar_({ categoria: 'PONTO', origem: 'PONTO', titulo: 't' }, ['u_tec'], ['email']), null);
});

// ------------------------------------------------------------------ as 4 exceções
test('WhatsApp na hora: só as 4 exceções da Frota, só no expediente, uma por pessoa por dia em cada exceção; o resto não vai', () => {
  const amb = ambiente({ agora: em(SEG('10:00')) });
  ['S35', 'S36', 'S41', 'S44'].forEach((ev) => {
    const r = notificar(amb, { usuarios: ['u_tec'], canais: ['whatsapp'], origem: 'FROTA', evento: ev });
    assert.equal(r.ok, 1, ev + ' ' + r.motivo);
  });
  assert.equal(amb.whats.length, 4);
  // segunda vez no mesmo dia, na mesma exceção: não
  const r2 = notificar(amb, { usuarios: ['u_tec'], canais: ['whatsapp'], origem: 'FROTA', evento: 'S36' });
  assert.equal(r2.ok, 0); assert.match(r2.motivo, /um WhatsApp por pessoa por dia nesta exceção \(S36\)/);
  // eventos que não são exceção: WhatsApp avulso não sai (Frota S33/S37, Avisos, Conduta, sem evento)
  ['S33', 'S37', 'S19', 'S51', 'S52', 'S54', ''].forEach((ev) => notificar(amb, { usuarios: ['u_tec'], canais: ['whatsapp'], origem: 'FROTA', evento: ev }));
  assert.equal(amb.whats.length, 4);
  // dia seguinte: libera de novo
  amb.mudar(TER('10:00'));
  assert.equal(notificar(amb, { usuarios: ['u_tec'], canais: ['whatsapp'], origem: 'FROTA', evento: 'S36' }).ok, 1);
  // fora do expediente: não sai; uso sem registro (S35) vai no e-mail de resumo do dia seguinte
  amb.mudar(TER('21:30'));
  const fora = notificar(amb, { usuarios: ['u_gt'], origem: 'FROTA', evento: 'S35', titulo: 'Uso sem registro: veículo TST0A00' });
  assert.equal(amb.whats.length, 5);
  assert.match(amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID === 'u_gt' && l.CANAL === 'whatsapp').pop().MOTIVO, /Fora do expediente.*resumo do dia seguinte/);
  assert.equal(fora.guardados, 1);
  const fila = amb.tabelas.NTF_RESUMO_FILA.filter((v) => v.USUARIO_ID === 'u_gt');
  assert.equal(fila.length, 1); assert.equal(fila[0].MODO, 'RESUMO'); assert.equal(fila[0].EVENTO, 'S35');
  // partida não liberada fora do expediente: nada pelo WhatsApp, nada por e-mail (S36 é só WhatsApp; fica no sistema)
  const s36 = notificar(amb, { usuarios: ['u_gt'], origem: 'FROTA', evento: 'S36' });
  assert.equal(s36.ok, 0);
  assert.equal(amb.emails.length, 0);
});

// ------------------------------------------------------------------ histórico sem aviso e "só no sistema"
test('vira histórico: chamado do Auvo concluído (S55) não avisa ninguém; missão cadastrada (S53) fica só no sistema', () => {
  const amb = ambiente();
  const r = notificar(amb, { usuarios: ['u_tec', 'u_gt'], canais: ['email', 'whatsapp'], origem: 'AUVO_OS', evento: 'S55' });
  assert.deepEqual([r.ok, r.erro, r.pulado], [0, 0, 0]);
  assert.equal(amb.tabelas.NTF_ENVIOS.length, 0, 'nenhum envio, nenhuma linha');
  assert.equal(amb.emails.length + amb.whats.length, 0);
  const r2 = notificar(amb, { usuarios: ['u_tec'], canais: ['sgo', 'email'], origem: 'CONDUTA', evento: 'S53' });
  assert.equal(r2.ok, 0);
  assert.match(amb.tabelas.NTF_ENVIOS[0].MOTIVO, /só no sistema/);
  assert.equal(amb.emails.length, 0);
  // o Administrador pode transformar um evento em histórico (com motivo) e ele para de avisar
  amb.ctx.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S43', email: 'RESUMO', whatsapp: 'NAO', decisao: 'HISTORICO', motivo: 'reserva não usada vira só registro' });
  notificar(amb, { usuarios: ['u_tec'], canais: ['email'], origem: 'FROTA_RESERVAS', evento: 'S43' });
  assert.equal(amb.emails.length, 0);
  assert.equal((amb.tabelas.NTF_RESUMO_FILA || []).length, 0);
});

// ------------------------------------------------------------------ e-mail na hora x resumo
test('e-mail: "na hora" sai no expediente; fora dele espera e sai agrupado na primeira rodada; "no resumo" vai para a fila do resumo', () => {
  const amb = ambiente({ agora: em(SEG('10:00')) });
  notificar(amb, { usuarios: ['u_tec'], canais: ['email'], origem: 'FROTA_RESERVAS', evento: 'S39', titulo: 'Sua reserva foi cancelada pela gestão' });
  assert.equal(amb.emails.length, 1);
  const r = notificar(amb, { usuarios: ['u_tec'], canais: ['email'], origem: 'FROTA', evento: 'S33', titulo: 'Retirada registrada em seu nome' });
  assert.equal(r.ok, 1); assert.equal(r.guardados, 1);
  assert.equal(amb.emails.length, 1, 'S33 não sai na hora');
  assert.deepEqual(sit(amb, 'u_tec', 'email'), ['OK', 'NO_RESUMO']);
  // fora do expediente: S39 e S40 esperam e saem num e-mail só na primeira rodada do dia seguinte
  amb.mudar(SEG('19:00'));
  notificar(amb, { usuarios: ['u_gt'], canais: ['email'], origem: 'FROTA_RESERVAS', evento: 'S39', titulo: 'Reserva cancelada' });
  notificar(amb, { usuarios: ['u_gt'], canais: ['email'], origem: 'FROTA_RESERVAS', evento: 'S40', titulo: 'Reserva mudou de veículo' });
  assert.equal(amb.emails.length, 1);
  amb.mudar(TER('07:40'));
  assert.match(amb.ctx.SGO_resumoDiaRodada_().fora, /antes do início/);
  amb.mudar(TER('08:01'));
  amb.ctx.SGO_resumoDiaRodada_();
  const doGil = amb.emails.filter((e) => e.to === 'gil@exemplo.test');
  assert.equal(doGil.filter((e) => /Avisos do SGO\+ \(2\)/.test(e.subject)).length, 1, doGil.map((e) => e.subject).join(' | '));
  assert.ok(amb.tabelas.NTF_RESUMO_FILA.filter((v) => v.MODO === 'HORA').every((v) => v.SITUACAO === 'ENVIADO'));
  // Comercial: pedido de apoio sai na hora; o resto do Comercial vai no resumo (pelo tipo do aviso guardado)
  amb.mudar(TER('10:00'));
  amb.tabelas.COM_AVISOS = [{ ID: 'ca1', TIPO: 'APOIO_GESTAO' }, { ID: 'ca2', TIPO: 'GANHA' }];
  amb.ctx.COM_ABAS = { AVISOS: 'COM_AVISOS' };
  const antes = amb.emails.length;
  notificar(amb, { usuarios: ['u_sem'], canais: ['email'], origem: 'COMERCIAL', refId: 'ca1' });
  assert.equal(amb.emails.length, antes + 1);
  const rc = notificar(amb, { usuarios: ['u_sem'], canais: ['email'], origem: 'COMERCIAL', refId: 'ca2' });
  assert.equal(amb.emails.length, antes + 1); assert.equal(rc.ok, 1, 'o Comercial marca o aviso como entregue (vai no resumo)');
  assert.equal(amb.tabelas.NTF_RESUMO_FILA.filter((v) => v.USUARIO_ID === 'u_sem' && v.EVENTO === 'S32').length, 1);
});

// ------------------------------------------------------------------ resumo do dia único (e-mail)
test('resumo do dia único: um e-mail por pessoa a partir das 08:00 juntando atividades, Caixa de decisões, avisos guardados, avisos com ciência (contagem) e bate-papo (contagem)', () => {
  const amb = ambiente({ agora: em(SEG('16:00')) });
  const c = amb.ctx;
  atividade(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');     // atrasada (técnico)
  atividade(amb, 'a2', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-20T17:00');     // vence amanhã (terça)
  amb.tabelas.ATV_AVISOS.push({ ID: 'av1', DESTINATARIO_ID: 'u_tec', ATIVIDADE_ID: 'a2', TIPO: 'NOVA', TITULO: 'Nova atividade para você', TEXTO: 'DORA lançou "Atividade de teste a2".', DATA: '2026-10-19T15:00:00', LIDO_EM: '', EMAIL_SITUACAO: 'PENDENTE' });
  notificar(amb, { usuarios: ['u_tec'], canais: ['email'], origem: 'FROTA', evento: 'S33', titulo: 'Retirada registrada em seu nome: veículo TST0A00', texto: 'Confira os dados na Frota.' });
  notificar(amb, { usuarios: ['u_tec'], canais: ['email'], origem: 'CONDUTA', evento: 'S52', titulo: 'Missão aprovada: Cidade Teste', texto: 'Ela passa a contar para o incentivo.' });
  // aviso com ciência publicado para todos (e-mail na hora; WhatsApp não)
  const pub = c.Avisos_apiPublicar('s_dir', { titulo: 'Comunicado de teste', texto: 'Texto do comunicado de teste.', publicoTipo: 'PESSOAS', pessoas: ['u_tec', 'u_pj'] });
  assert.equal(pub.ok, true, pub.message);
  assert.equal(amb.whats.length, 0, 'aviso com ciência não vai por WhatsApp');
  const emailsAntes = amb.emails.length;
  // segunda 16:00 já passou das 08:00, mas o resumo de segunda... avaliado agora (primeira rodada do dia)
  amb.mudar(TER('07:59'));
  assert.ok(c.SGO_resumoDiaRodada_().fora);
  amb.mudar(TER('08:03'));
  const r = c.SGO_resumoDiaRodada_();
  assert.ok(r.email.avaliados >= 8, JSON.stringify(r));
  const tiago = amb.emails.slice(emailsAntes).filter((e) => e.to === 'tiago@exemplo.test');
  assert.equal(tiago.length, 1, 'um e-mail só');
  const corpo = tiago[0].body;
  assert.match(tiago[0].subject, /Resumo do dia: 2 atividades, 1 aviso/, 'a atrasada e a que vence hoje');
  assert.match(corpo, /SUAS ATIVIDADES[\s\S]*Atividade de teste a1/);
  assert.match(corpo, /AVISOS DE ATIVIDADES[\s\S]*Nova atividade para você/);
  assert.match(corpo, /FROTA[\s\S]*Retirada registrada em seu nome/);
  assert.match(corpo, /1 aviso do Programa de conduta \(o detalhe fica só no sistema\)/, 'conduta só como contagem');
  assert.doesNotMatch(corpo, /incentivo|Cidade Teste/);
  assert.match(corpo, /Você tem 1 aviso para confirmar a leitura/);
  assert.doesNotMatch(corpo, /Texto do comunicado de teste/, 'aviso com ciência: só a contagem no resumo');
  // itens marcados: não saem de novo
  assert.ok(amb.tabelas.NTF_RESUMO_FILA.every((v) => v.SITUACAO === 'ENVIADO'));
  assert.equal(amb.tabelas.ATV_AVISOS[0].EMAIL_SITUACAO, 'ENVIADO');
  // gestor: decisões da caixa no mesmo e-mail; GES_ENVIOS registra para a escada
  const gil = amb.emails.slice(emailsAntes).filter((e) => e.to === 'gil@exemplo.test');
  assert.equal(gil.length, 1);
  assert.match(gil[0].body, /DECISÕES QUE DEPENDEM DE VOCÊ \(1\)[\s\S]*Atividade de teste a1/);
  assert.ok(amb.tabelas.GES_ENVIOS.some((e) => e.TIPO === 'EMAIL_GESTOR' && e.USUARIO_ID === 'u_gt'));
  // quem não tem nada não recebe; segunda rodada no mesmo dia não repete
  assert.equal(amb.emails.slice(emailsAntes).filter((e) => e.to === 'mara@exemplo.test').length, 0);
  const total = amb.emails.length;
  amb.mudar(TER('08:20'));
  c.SGO_resumoDiaRodada_();
  amb.mudar(TER('11:00'));
  c.SGO_resumoDiaRodada_();
  assert.equal(amb.emails.length, total, 'no máximo um e-mail de resumo por pessoa por dia');
  // nada mais sai pelos e-mails antigos: atividades guardadas, Caixa e resumo de atividades ficam no resumo único
  assert.equal(c.Atividades_resumoDiario_().fora, 'substituído pelo resumo do dia único (matriz de avisos)');
  assert.match(c.Gestao_whatsDiario_().fora, /resumo do dia único/);
  // sábado: nada
  amb.mudar('2026-10-24T09:00:00-03:00');
  assert.match(c.SGO_resumoDiaRodada_().fora, /sábado/);
});

// ------------------------------------------------------------------ resumo do dia (WhatsApp)
test('resumo do dia no WhatsApp: a partir das 09:30, só CLT, só quem não abriu o sistema, só com item para hoje, atrasado ou decisão parada; preferência e ponto respeitados', () => {
  const amb = ambiente({ agora: em(TER('09:00')) });
  const c = amb.ctx;
  atividade(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');   // atrasada
  atividade(amb, 'a2', 'u_pj', 'PAULO PJ TESTE', '2026-10-16T18:00');         // atrasada, mas PJ
  atividade(amb, 'a3', 'u_gs', 'GAEL GESTOR SEM AREA TESTE', '2026-10-20T16:00'); // vence hoje
  atividade(amb, 'a4', 'u_ad2', 'ADAO ADMINISTRADOR TESTE', '2026-10-20T16:00'); // vence hoje, mas vai abrir o sistema
  c.SGO_resumoDiaRodada_();
  assert.equal(amb.whats.length, 0, 'antes das 09:30 não sai WhatsApp');
  // Adão abriu o sistema (a central marca a presença)
  c.SGO_Pendencias_listar('s_adm', {});
  // Gael desligou o WhatsApp de resumo em Meus avisos
  assert.equal(c.SGO_MeusAvisos_api('s_gs', 'salvar', { whatsResumo: false }).ok, true);
  amb.mudar(TER('09:31'));
  c.SGO_avisoMarcarPresenca_('u_ad2'); // a marca do dia vale o dia todo (o cache foi limpo pela troca de hora do teste)
  c.SGO_resumoDiaRodada_();
  const regs = Object.fromEntries(amb.tabelas.NTF_RESUMOS.filter((l) => l.CANAL === 'whatsapp').map((l) => [l.USUARIO_ID, l]));
  assert.equal(regs.u_tec.SITUACAO, 'ENVIADO');
  assert.equal(regs.u_pj.SITUACAO, 'SEM_WHATSAPP');
  assert.equal(regs.u_sem.SITUACAO, 'SEM_WHATSAPP');
  assert.equal(regs.u_gs.SITUACAO, 'DESLIGADO_PELA_PESSOA');
  assert.equal(regs.u_ad2.SITUACAO, 'ABRIU_O_SISTEMA');
  assert.equal(regs.u_met.SITUACAO, 'SEM_NOVIDADE');
  assert.equal(regs.u_gt.SITUACAO, 'SEM_NOVIDADE', 'decisão nova (não parada) não dispara o WhatsApp do gestor');
  assert.equal(amb.whats.length, 1, 'só o Tiago');
  const textos = amb.whats.map((w) => w.corpo.template.components[0].parameters[1].text);
  assert.ok(textos.some((t) => /Bom dia, Tiago\. Resumo do dia no SGO\+: 1 atividade atrasada\./.test(t)), textos.join(' | '));
  assert.ok(textos.every((t) => !/R\$|TIAGO TECNICO|conduta|ponto/i.test(t.replace('Bom dia, Tiago', ''))));
  // uma por dia: a rodada seguinte não repete
  amb.mudar(TER('10:30'));
  c.SGO_resumoDiaRodada_();
  assert.equal(amb.whats.length, 1);
  // decisão parada há 2 dias úteis: no dia seguinte o gestor (CLT, sem abrir o sistema) recebe a contagem
  c.Ges_sincronizar_(); // a rotina da gestão sincroniza a caixa antes do resumo
  amb.tabelas.GES_DECISOES.forEach((d) => { if (d.ITEM_ID === 'ATV:a1') d.ENTROU_EM = '2026-10-16T09:00'; });
  amb.mudar('2026-10-21T09:40:00-03:00');
  c.SGO_resumoDiaRodada_();
  const doGil = amb.whats.filter((w) => w.corpo.to === '5562999990011');
  assert.equal(doGil.length, 1, JSON.stringify(amb.tabelas.NTF_RESUMOS.filter((l) => l.USUARIO_ID === 'u_gt')));
  assert.match(doGil[0].corpo.template.components[0].parameters[1].text, /decisão parada na Caixa de decisões/);
  assert.ok(amb.tabelas.GES_ENVIOS.some((e) => e.TIPO === 'WHATS_GESTOR' && e.USUARIO_ID === 'u_gt'));
  amb.tabelas.NTF_RESUMOS.filter((l) => l.USUARIO_ID === 'u_tec' && l.DIA === '2026-10-21').forEach((l) => { l.DIA = 'x'; });
  // perto de um lembrete do ponto da mesma pessoa: adia para a próxima rodada
  amb.tabelas.PONTO_PESSOAS = [{ ID: 'p1', USUARIO_ID: 'u_tec', PARTICIPA: 'SIM', ENTRADA: '08:00', ALMOCO: '11:00', RETORNO_MIN: 60, SAIDA: '17:30' }];
  amb.mudar('2026-10-21T10:55:00-03:00');
  c.SGO_resumoDiaRodada_();
  assert.ok(!amb.tabelas.NTF_RESUMOS.some((l) => l.USUARIO_ID === 'u_tec' && l.CANAL === 'whatsapp' && l.DIA === '2026-10-21'), 'adiado: 5 minutos antes do almoço');
  amb.mudar('2026-10-21T11:20:00-03:00');
  c.SGO_resumoDiaRodada_();
  assert.equal(amb.tabelas.NTF_RESUMOS.filter((l) => l.USUARIO_ID === 'u_tec' && l.CANAL === 'whatsapp' && l.DIA === '2026-10-21')[0].SITUACAO, 'ENVIADO');
});

// ------------------------------------------------------------------ central por área
test('central de pendências: gestor vê a sua área e o que é dele; Diretoria vê tudo; Administrador sem área vê as falhas técnicas; gestor sem área vê tudo', () => {
  const amb = ambiente();
  const c = amb.ctx;
  atividade(amb, 'a_tec', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  atividade(amb, 'a_sem', 'u_sem', 'SARA SEM VINCULO TESTE', '2026-10-16T18:00');
  atividade(amb, 'a_ga', 'u_ga', 'ANA GESTORA TESTE', '2026-10-16T18:00');
  const ids = (sid) => c.SGO_Pendencias_listar(sid, { semCache: true }).itens.filter((i) => i.tipo === 'atividade_atrasada').map((i) => i.id).sort();
  assert.deepEqual(ids('s_gt'), ['ATV:a_tec'], 'Gil (Técnica) vê só a da área dele');
  assert.deepEqual(ids('s_ga'), ['ATV:a_ga'], 'Ana (Administrativo) vê só a dela');
  assert.deepEqual(ids('s_dir'), ['ATV:a_ga', 'ATV:a_sem', 'ATV:a_tec']);
  assert.deepEqual(ids('s_gs'), ['ATV:a_ga', 'ATV:a_sem', 'ATV:a_tec'], 'gestor sem área continua vendo tudo');
  assert.deepEqual(ids('s_adm'), [], 'Administrador sem área: só falhas técnicas e o que é dele');
  // item técnico do Administrador (publico ADMIN) continua com ele
  assert.equal(c.SGO_avisoCentralVe_({ tipo: 'auvo_importacao', modulo: 'auvo', publico: 'ADMIN' }, { userId: 'u_ad2', perfil: 'ADMIN', gestao: true }), true);
  // filtro desligado na Matriz: volta a ver tudo
  c.SGO_AvisosMatriz_api('s_dir', 'salvarCfg', { horaEmail: '08:00', horaWhats: '09:30', whatsResumo: true, centralPorArea: false, motivo: 'teste do filtro desligado' });
  assert.deepEqual(ids('s_gt'), ['ATV:a_ga', 'ATV:a_sem', 'ATV:a_tec']);
});

// ------------------------------------------------------------------ gestor da área no lugar de toda a gestão
test('gestor da área: Frota vai ao gestor do Administrativo; área sem gestor vai à Diretoria; ninguém decide sobre si', () => {
  const amb = ambiente();
  const c = amb.ctx;
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('frota')), ['u_ga']);
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('auvo')), ['u_gt']);
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('metrologia', { area: 'METROLOGIA' })), ['u_dir'], 'sem gestor: Diretoria');
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('conduta', { responsavelId: 'u_tec' })), ['u_gt'], 'missão do técnico: gestor da Técnica');
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('conduta', { responsavelId: 'u_gt' })), ['u_dir'], 'missão de gestor: Diretoria');
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('frota', { area: 'LOGISTICA' })), ['u_dir'], 'Compras (Logística) sem gestor: Diretoria');
});

// ------------------------------------------------------------------ Meus avisos
test('Meus avisos: só a própria pessoa altera; 12:00 atrasa o e-mail; silenciar Comercial tira do resumo; travados com motivo; prévia sem enviar', () => {
  const amb = ambiente({ agora: em(SEG('10:00')) });
  const c = amb.ctx;
  const meu = c.SGO_MeusAvisos_api('s_tec', 'carregar', {});
  assert.equal(meu.ok, true); assert.equal(meu.whatsLiberado, true);
  assert.deepEqual(Array.from(meu.excecoesWhats).length, 4);
  assert.equal(c.SGO_MeusAvisos_api('s_pj', 'carregar', {}).whatsLiberado, false);
  assert.match(c.SGO_MeusAvisos_api('s_tec', 'salvar', { horaEmail: '10:00' }).message, /08:00 ou 12:00/);
  assert.equal(c.SGO_MeusAvisos_api('s_tec', 'salvar', { horaEmail: '12:00', silenciar: ['comercial', 'atividades'], whatsResumo: true }).ok, true);
  const p = c.Mtz_prefsDe_('u_tec');
  assert.equal(p.horaEmail, '12:00'); assert.deepEqual(Array.from(p.silenciar), ['comercial'], 'atividades não pode ser silenciado');
  // a gestão vê as preferências, mas não tem como alterar as de outra pessoa (a API grava só para a sessão)
  const visto = c.SGO_AvisosMatriz_api('s_dir', 'carregar', {}).prefsEquipe;
  assert.equal(visto[0].nome, 'TIAGO TECNICO TESTE'); assert.equal(visto[0].horaEmail, '12:00');
  assert.equal(amb.tabelas.NTF_PREFERENCIAS.length, 1); assert.equal(amb.tabelas.NTF_PREFERENCIAS[0].USUARIO_ID, 'u_tec');
  // Comercial silenciado: o aviso do Comercial não entra no resumo; e-mail só às 12:00
  amb.tabelas.COM_AVISOS = [{ ID: 'ca9', TIPO: 'GANHA' }]; c.COM_ABAS = { AVISOS: 'COM_AVISOS' };
  notificar(amb, { usuarios: ['u_tec'], canais: ['email'], origem: 'COMERCIAL', refId: 'ca9', titulo: 'Comercial: venda ganha' });
  atividade(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  const prev = c.SGO_MeusAvisos_api('s_tec', 'previa', {});
  assert.equal(prev.ok, true);
  assert.doesNotMatch(prev.previa.texto, /venda ganha/);
  assert.match(prev.previa.texto, /Atividade de teste a1/);
  const antes = amb.emails.length;
  amb.mudar(TER('08:05'));
  c.SGO_resumoDiaRodada_();
  assert.equal(amb.emails.filter((e) => e.to === 'tiago@exemplo.test').length - amb.emails.slice(0, antes).filter((e) => e.to === 'tiago@exemplo.test').length, 0, 'às 08:05 ainda não');
  amb.mudar(TER('12:05'));
  c.SGO_resumoDiaRodada_();
  assert.equal(amb.emails.slice(antes).filter((e) => e.to === 'tiago@exemplo.test').length, 1);
  assert.equal(c.SGO_MeusAvisos_api('s_rh', 'carregar', {}).ok, true, 'RH também ajusta os próprios avisos');
});

// ------------------------------------------------------------------ Avisos com ciência
test('avisos com ciência: e-mail na hora, sem WhatsApp avulso; reenvio no máximo uma vez por dia', () => {
  const amb = ambiente({ agora: em(SEG('10:00')) });
  const c = amb.ctx;
  const pub = c.Avisos_apiPublicar('s_dir', { titulo: 'Comunicado de teste', texto: 'Texto do comunicado de teste.', publicoTipo: 'PESSOAS', pessoas: ['u_tec', 'u_gt'] });
  assert.equal(pub.ok, true);
  assert.equal(amb.emails.length, 2); assert.equal(amb.whats.length, 0);
  assert.match(pub.message, /não vai WhatsApp|só a contagem/);
  amb.mudar(SEG('11:00'));
  const re1 = c.Avisos_apiReenviar('s_dir', { id: pub.id });
  assert.equal(re1.ok, true, re1.message); assert.equal(re1.reenviados, 2);
  amb.mudar(SEG('15:00'));
  assert.match(c.Avisos_apiReenviar('s_dir', { id: pub.id }).message, /uma vez por dia/);
  amb.mudar(TER('10:00'));
  assert.equal(c.Avisos_apiReenviar('s_dir', { id: pub.id }).ok, true);
  assert.equal(amb.whats.length, 0);
  assert.ok(amb.tabelas.NTF_ENVIOS.every((l) => l.EVENTO === 'S19' || l.EVENTO === 'S20'));
});

// ------------------------------------------------------------------ medição e estimativa antes/depois
test('medição: avisos por pessoa por dia antes e depois (NTF_ENVIOS), WhatsApp fora do expediente e para PJ; estimativa de um dia típico', () => {
  const amb = ambiente({ agora: em('2026-10-23T10:00:00-03:00') });
  const c = amb.ctx;
  const linha = (uid, canal, quando, sitx, origem) => amb.tabelas.NTF_ENVIOS.push({ ID: 'n' + Math.random(), USUARIO_ID: uid, CANAL: canal, QUANDO: quando, SITUACAO: sitx || 'OK', ORIGEM: origem || 'X' });
  // antes: Tiago 4 e-mails e 3 WhatsApp num dia (um às 21h); Paulo (PJ) 1 WhatsApp
  ['08:10', '10:00', '13:00', '16:00'].forEach((h) => linha('u_tec', 'email', '2026-10-19T' + h + ':00'));
  ['09:00', '14:00', '21:00'].forEach((h) => linha('u_tec', 'whatsapp', '2026-10-19T' + h + ':00'));
  linha('u_pj', 'whatsapp', '2026-10-19T11:00:00');
  // depois: Tiago 1 e-mail de resumo + 1 na hora, 1 WhatsApp de resumo; 2 retidos pelo piloto
  linha('u_tec', 'email', '2026-10-22T08:03:00'); linha('u_tec', 'email', '2026-10-22T11:00:00'); linha('u_tec', 'whatsapp', '2026-10-22T09:31:00');
  linha('u_gt', 'whatsapp', '2026-10-22T09:31:00', 'RETIDO'); linha('u_gt', 'email', '2026-10-22T10:00:00', 'NO_RESUMO');
  const m = c.SGO_AvisosMatriz_api('s_dir', 'medicao', {}).medicao;
  assert.equal(m.antes.maxEmail, 4); assert.equal(m.antes.maxWhatsapp, 3);
  assert.equal(m.antes.whatsForaExpediente, 1); assert.equal(m.antes.whatsPjOuVazio, 1);
  assert.equal(m.depois.maxEmail, 2); assert.equal(m.depois.maxWhatsapp, 1);
  assert.equal(m.depois.whatsForaExpediente, 0); assert.equal(m.depois.whatsPjOuVazio, 0);
  assert.equal(m.depois.retidos, 1); assert.equal(m.depois.noResumo, 1);
  assert.equal(m.depois.pessoasDiasAcimaMetaEmail, 0); assert.equal(m.depois.pessoasDiasAcimaMetaWhatsapp, 0);
  assert.equal(m.antes.porPessoa.find((p) => p.nome === 'TIAGO TECNICO TESTE').mediaEmail, 4);
});

test('estimativa de um dia típico: os mesmos fatos antes e depois da matriz (e-mails e WhatsApp por pessoa)', () => {
  // Dia típico de um técnico CLT que é condutor: 2 atividades novas, 1 atrasada, 1 aviso com ciência publicado, retirada registrada
  // pela gestão, reserva cancelada, missão aprovada, chamado do Auvo aberto e concluído, 1 aviso do Comercial.
  const amb = ambiente({ agora: em(SEG('09:00')) });
  const c = amb.ctx;
  const fatos = [
    { canais: ['email'], origem: 'ATIVIDADES', evento: 'S01' }, { canais: ['email'], origem: 'ATIVIDADES', evento: 'S02' }, { canais: ['email'], origem: 'ATIVIDADES', evento: 'S08' },
    { canais: ['sgo', 'email'], origem: 'AVISOS', evento: 'S19' }, { canais: ['sgo', 'email'], origem: 'FROTA', evento: 'S33' }, { canais: ['email'], origem: 'FROTA_RESERVAS', evento: 'S39' },
    { canais: ['sgo', 'email'], origem: 'CONDUTA', evento: 'S52' }, { canais: ['email'], origem: 'AUVO_OS', evento: 'S54' }, { canais: ['email'], origem: 'AUVO_OS', evento: 'S55' },
    { canais: ['email'], origem: 'COMERCIAL', evento: 'S32' }
  ];
  // ANTES (como era: cada módulo mandava por conta própria; WhatsApp em Avisos, Frota, Conduta e Auvo, sem olhar vínculo)
  const antesEmail = fatos.length - 2 /* e-mails de atividades saíam agrupados por rodada: 3 viravam ~1 */ ;
  const antesWhats = 4 /* aviso com ciência, retirada, missão, chamado aberto */ + 1 /* chamado concluído */ + 1 /* resumo de atividades */;
  // DEPOIS (com a matriz)
  fatos.forEach((f) => notificar(amb, Object.assign({ usuarios: ['u_tec'] }, f, { canais: f.canais.concat(['whatsapp']) })));
  amb.mudar(SEG('09:00'));
  atividade(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  amb.mudar(TER('08:05')); c.SGO_resumoDiaRodada_();
  amb.mudar(TER('09:35')); c.SGO_resumoDiaRodada_();
  const doTiago = (lista) => lista.filter((e) => e.to === 'tiago@exemplo.test').length;
  const depoisEmail = doTiago(amb.emails);
  const depoisWhats = amb.whats.length;
  console.log('ESTIMATIVA dia típico (técnico CLT): antes ' + antesEmail + ' e-mails e ' + antesWhats + ' WhatsApp; depois ' + depoisEmail + ' e-mails (' + (depoisEmail - 1) + ' na hora + 1 resumo) e ' + depoisWhats + ' WhatsApp');
  assert.ok(depoisEmail <= 3, 'na hora só o que exige ciência ou muda algo de hoje, mais o resumo: ' + depoisEmail);
  assert.ok(depoisWhats <= 1, 'no máximo um WhatsApp de resumo');
});

// ------------------------------------------------------------------ Auvo
test('Auvo: chamado aberto vai só ao técnico, no resumo do dia (gestão não recebe um aviso por chamado); concluído vira histórico; cliente por e-mail, sem WhatsApp até o fim do piloto', () => {
  const amb = ambiente({ extras: ['SGO_Auvo_Incremental.js'] });
  const c = amb.ctx;
  amb.tabelas.CAD_CLIENTES.push({ ID: 'cl1', NOME_FANTASIA: 'Clínica Exemplo', EMAIL: 'cliente@exemplo.test', CELULAR: '62988887777' });
  const av = { anteriores: {}, agora: '2026-10-19T10:00:00' };
  c.Auvo_avisosEnviar_(av, { tipo: 'abertura' }, { AUVO_TASK_ID: 123, TECNICO_ID_SGO: 'u_tec', DATA_TAREFA: '2026-10-20', TIPO_TAREFA: 'Preventiva' }, { clienteId: 'cl1' });
  c.Auvo_avisosEnviar_(av, { tipo: 'fechamento', quando: '2026-10-19T09:00:00' }, { AUVO_TASK_ID: 124, TECNICO_ID_SGO: 'u_tec' }, { clienteId: 'cl1' });
  const internos = amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID.indexOf('EXT:') !== 0);
  assert.deepEqual(internos.map((l) => [l.USUARIO_ID, l.SITUACAO, l.EVENTO]), [['u_tec', 'NO_RESUMO', 'S54']], 'gestão fora; conclusão sem aviso interno');
  assert.deepEqual(amb.emails.map((e) => e.to), ['cliente@exemplo.test', 'cliente@exemplo.test']);
  assert.equal(amb.whats.length, 0);
  assert.ok(amb.tabelas.NTF_ENVIOS.filter((l) => l.CANAL === 'whatsapp').every((l) => /até o fim do piloto/.test(l.MOTIVO)));
});

// ------------------------------------------------------------------ piloto do WhatsApp continua valendo
test('piloto do WhatsApp: o resumo do dia só sai para quem está na lista; os demais ficam RETIDO (e-mail normal)', () => {
  const amb = ambiente({ agora: em(TER('09:00')), extras: ['SGO_WhatsappPiloto.js'], props: { WA_PILOTO: JSON.stringify({ ligado: true, usuarios: ['u_tec'] }) } });
  const c = amb.ctx;
  atividade(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  atividade(amb, 'a2', 'u_dir', 'DORA DIRETORA TESTE', '2026-10-16T18:00');
  amb.mudar(TER('09:31'));
  c.SGO_resumoDiaRodada_();
  const regs = Object.fromEntries(amb.tabelas.NTF_RESUMOS.filter((l) => l.CANAL === 'whatsapp').map((l) => [l.USUARIO_ID, l.SITUACAO]));
  assert.equal(regs.u_tec, 'ENVIADO');
  assert.equal(regs.u_dir, 'RETIDO');
  assert.equal(amb.whats.length, 1);
  assert.ok(amb.tabelas.NTF_ENVIOS.some((l) => l.USUARIO_ID === 'u_dir' && l.CANAL === 'whatsapp' && l.SITUACAO === 'RETIDO'));
  assert.ok(amb.emails.some((e) => e.to === 'dora@exemplo.test'), 'o e-mail de resumo segue normal');
});

// ------------------------------------------------------------------ auditoria de integração (21/10/2026)
test('resumo do dia: item que está na Caixa de decisões não se repete em "Outras pendências suas"', () => {
  const amb = ambiente({ agora: em(TER('08:05')) });
  const c = amb.ctx;
  const item = { id: 'CMP:APROVAR:r1', tipo: 'compras_aprovar', modulo: 'compras', moduloNome: 'Compras e peças', meu: true, gravidade: 'ATENCAO', titulo: 'Aprovar a compra REQ-2026-0001 (item de teste)', oQueFazer: 'Abra a ficha e aprove ou reprove.' };
  const outro = { id: 'COM:X', tipo: 'comercial_sem_proxima', modulo: 'comercial', moduloNome: 'Comercial', meu: true, gravidade: 'ATENCAO', titulo: 'Oportunidade de teste sem próximo passo' };
  const cx = { cfg: { escada: { whatsDiasUteis: 2, diretoriaDiasUteis: 4 } }, us: { u_gt: { id: 'u_gt', nome: 'GIL GESTOR TESTE' } },
    itens: [{ id: item.id, titulo: item.titulo, modulo: 'compras', responsaveis: ['u_gt'], acompanhamento: false, diasParado: 0, etapa: 'NA_HORA' }] };
  const u = { id: 'u_gt', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR', gestao: true };
  const m = c.Mtz_montarResumo_(u, { pend: () => [item, outro], filaPorPessoa: {}, atvPorPessoa: {}, cx, rel: null, ex: { dia: '2026-10-20', hora: '08:05', dentro: true } });
  assert.match(m.texto, /DECISÕES QUE DEPENDEM DE VOCÊ \(1\)/);
  assert.equal(m.texto.split('Aprovar a compra REQ-2026-0001').length - 1, 1, 'a compra aparece uma vez só');
  assert.match(m.texto, /OUTRAS PENDÊNCIAS SUAS[\s\S]*Oportunidade de teste sem próximo passo/, 'o que não está na Caixa continua');
  assert.equal(m.contagens.outros, 1);
});
