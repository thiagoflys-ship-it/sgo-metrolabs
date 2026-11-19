// DIRETORIA INFORMADA, NÃO COBRADA (11/11/2026, decisão do dono): o que escala ou cai na Diretoria vira um resumo diário
// (e-mail com a lista e o link do relatório diário da empresa, WhatsApp curto pelo modelo de utilidade, alerta na tela), no lugar
// do GS03 item a item e da cobrança do GS01, GS02 e da SEDNA; a atividade vencida da Diretoria vira lembrete, sem a janela
// obrigatória de justificativa; relatório diário da empresa em HTML A4 (índice, Kanban, gráficos, setores, ranking) com acesso
// pela caixa GESTAO_RELATORIO_DIA. Funcionários continuam exatamente como antes.
// Código real do SGO+ num contexto isolado (tests/_matriz_ambiente.cjs), relógio controlado, nada sai de verdade. Dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, atividade } = require('./_matriz_ambiente.cjs');

const SEG = (hhmm) => '2026-10-19T' + hhmm + ':00-03:00';   // segunda-feira, dia útil
const EXTRA = ['SGO_Gestao_RelatorioDiario.js'];
const filaG = (amb, filtro) => (amb.tabelas.NTF_GESTAO || []).filter((l) => Object.keys(filtro || {}).every((k) => l[k] === filtro[k]));
const emailsPara = (amb, quem) => amb.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
const FONE = { dora: '5562999990010', gil: '5562999990011' };
const whatsPara = (amb, fone) => amb.whats.filter((w) => w.corpo.to === fone);
const aprovado = (amb, util) => {
  amb.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' || (util && n === 'sgo_gestao_item') ? 'APPROVED' : '');
  amb.ctx.SGO_waModeloCategoria_ = (n) => (util && n === 'sgo_gestao_item' ? 'UTILITY' : 'MARKETING');
};
const CFG_DESLIGADO = JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], ADMINISTRATIVO: ['u_ga'] }, diretoriaResumo: { ligado: false, hora: '08:30' } });

/** Item da central de pendências (padrão vencido da área Técnica), que entra na Caixa de decisões do Gil. */
function fontePadrao(amb, id, titulo, area) {
  const c = amb.ctx;
  c.PEND_FONTES.push({ nome: 'teste ' + id, fn: function (add) {
    add(c.Pend_item_('padrao_vencido', { id: id, nome: titulo, publico: 'GESTAO', gravidade: 'CRITICO', dias: -3, vencimento: '16/10/2026', titulo: titulo, detalhe: 'Padrão de teste.',
      oQueFazer: 'Recalibre o padrão.', extra: { area: area || 'TECNICA' } }));
  } });
}
const linhaCaixa = (itemId, titulo, resp, nomes, extra) => Object.assign({ ID: 'g' + itemId, ITEM_ID: itemId, TIPO: 'PADRAO_VENCIDO', MODULO: 'padroes', TITULO: titulo, AREA: 'TECNICA',
  RESPONSAVEIS_IDS: resp, RESPONSAVEIS_NOMES: nomes, SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-19T09:30', PRAZO_DECISAO: '2026-10-20' }, extra || {});

// ------------------------------------------------------------------ 1. Caixa: GS01, GS02 e GS03
test('Caixa: com o resumo ligado (padrão), GS01 e GS02 não cobram a Diretoria e o GS03 não sai item a item; o gestor continua igual', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: EXTRA, props: { AVG_IMPLANTADO_EM: '2026-10-19T09:00' }, tabelas: {
    GES_DECISOES: [linhaCaixa('COM:DESC:p1', 'Desconto acima da alçada: PROP-1', 'u_gt,u_dir', 'GIL GESTOR TESTE, DORA DIRETORA TESTE', { TIPO: 'COMERCIAL_DESCONTO', MODULO: 'comercial' })] } });
  aprovado(amb);
  const c = amb.ctx;
  assert.equal(c.Ges_diretoriaInformada_(), true, 'padrão ligado');
  let r = c.SGO_avisosGestaoRodada_(new c.Date());
  assert.deepEqual(filaG(amb, { EVENTO: 'GS01' }).map((l) => l.USUARIO_ID), ['u_gt'], 'GS01 só para o gestor');
  assert.ok(r.caixa.diretoriaNoResumo >= 1, JSON.stringify(r.caixa));
  amb.mudar('2026-10-21T10:00:00-03:00'); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.deepEqual(filaG(amb, { EVENTO: 'GS02' }).map((l) => l.USUARIO_ID), ['u_gt'], 'GS02 ("decida agora... sobe à Diretoria") nunca vai à Diretoria');
  amb.tabelas.GES_DECISOES[0].ESCALADO_EM = '2026-10-21T10:05'; amb.tabelas.GES_DECISOES[0].ESCALADO_PARA = 'u_dir';
  amb.mudar('2026-10-21T10:15:00-03:00'); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(filaG(amb, { EVENTO: 'GS03' }).length, 0, 'escalada não vira aviso item a item');
  assert.equal(emailsPara(amb, 'dora').length, 0, 'nenhum e-mail de cobrança para a Diretoria');
  assert.equal(amb.tabelas.GES_DECISOES[0].ESCALADO_EM, '2026-10-21T10:05', 'a escada continua marcando o item como escalado');
});

test('Caixa: com o resumo desligado nas regras, volta o comportamento anterior (GS01 e GS03 para a Diretoria)', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: EXTRA, props: { AVG_IMPLANTADO_EM: '2026-10-19T09:00', GESTAO_DECISOES_CFG: CFG_DESLIGADO }, tabelas: {
    GES_DECISOES: [linhaCaixa('COM:DESC:p1', 'Desconto: PROP-1', 'u_gt,u_dir', 'GIL GESTOR TESTE, DORA DIRETORA TESTE', { ESCALADO_EM: '2026-10-19T09:40', ESCALADO_PARA: 'u_dir' })] } });
  aprovado(amb);
  const c = amb.ctx;
  assert.equal(c.Ges_diretoriaInformada_(), false);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.deepEqual(filaG(amb, { EVENTO: 'GS01' }).map((l) => l.USUARIO_ID).sort(), ['u_dir', 'u_gt']);
  assert.deepEqual(filaG(amb, { EVENTO: 'GS03' }).map((l) => l.USUARIO_ID), ['u_dir']);
  assert.equal(c.SGO_resumoDiretoriaRodada_(null, new c.Date()).fora, 'resumo diário da Diretoria desligado em Regras e responsáveis');
});

test('pedido que só a Diretoria decide continua na hora (GS06) e o irreversível também (GI)', () => {
  const amb = ambiente({ agora: Date.parse('2026-10-31T22:00:00-03:00'), extras: EXTRA });
  aprovado(amb);
  const c = amb.ctx;
  c.SGO_avisoDiretoriaNaHora_({ evento: 'GS06', modulo: 'compras', quem: { id: 'u_tec', nome: 'TIAGO' }, refId: 'CMP:1', marco: 'm1', titulo: 'Compra a aprovar: RC-1', texto: 'Compra de R$ 5.000,00.' });
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_tec', nome: 'TIAGO' }, oque: 'Chamado cancelado', item: 'CH-1', motivo: 'teste', refId: 'AST-1' });
  assert.equal(emailsPara(amb, 'dora').length, 2, 'na hora, mesmo no sábado à noite');
});

// ------------------------------------------------------------------ 2. SEDNA
test('SEDNA: a Diretoria não recebe S72/S73 nem S71 da própria atividade; o gestor recebe o S72; o histórico diz que a Diretoria é informada', () => {
  const amb = ambiente({ agora: Date.parse(SEG('16:00')), extras: EXTRA });
  aprovado(amb);
  const c = amb.ctx;
  // Urgente vencida há mais de 4 h: nível 3 (Diretoria); lançada pela Dora (quem lançou também receberia o nível 2)
  atividade(amb, 'urg', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:00', { PRIORIDADE: 'Urgente' });
  atividade(amb, 'alta', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T10:30', { PRIORIDADE: 'Alta' });
  atividade(amb, 'dira', 'u_dir', 'DORA DIRETORA TESTE', '2026-10-19T09:00', { PRIORIDADE: 'Urgente', CRIADO_POR_ID: 'u_dir' });
  c.Sedna_escalonar_();
  const paraDora = amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID === 'u_dir' && /^S7[123]$/.test(l.EVENTO || ''));
  assert.equal(paraDora.length, 0, 'nada de S71/S72/S73 para a Diretoria: ' + JSON.stringify(paraDora.map((l) => l.EVENTO)));
  assert.equal(emailsPara(amb, 'dora').length, 0);
  assert.ok(filaG(amb, { EVENTO: 'S72', USUARIO_ID: 'u_gt' }).length >= 1, 'o gestor da área continua cobrado');
  const esc = amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'SEDNA_ESCALA' && /^urg\|/.test(e.REFERENCIA));
  assert.equal(esc[0].SITUACAO, 'DIRETORIA_RESUMO');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === 'urg' && /Diretoria fica sabendo pelo resumo diário/.test(h.TEXTO)));
});

// ------------------------------------------------------------------ 3. Atividades da Diretoria
test('atividades: Diretoria sem janela obrigatória (lembrete), remarca sem justificativa; funcionário continua com a janela e o pedido', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: EXTRA });
  const c = amb.ctx;
  // ATRASO_AVISADO_PREV vazio: o atraso ainda não foi avisado (o e-mail de atraso sai na próxima conferência)
  atividade(amb, 'ad', 'u_dir', 'DORA DIRETORA TESTE', '2026-10-19T08:00', { CRIADO_POR_ID: 'u_gt', CRIADO_POR_NOME: 'GIL GESTOR TESTE', ATRASO_AVISADO_PREV: '' });
  atividade(amb, 'at', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T08:00', { ATRASO_AVISADO_PREV: '' });
  const vd = c.Atividades_apiVerificar('s_dir', {});
  assert.equal(vd.ok, true, vd.message);
  assert.equal(vd.pendentes.length, 0, 'a janela obrigatória não abre para a Diretoria');
  assert.equal(vd.diretoria, true);
  assert.deepEqual(vd.lembretes.map((a) => a.ID), ['ad']);
  const vt = c.Atividades_apiVerificar('s_tec', {});
  assert.deepEqual(vt.pendentes.map((a) => a.ID), ['at'], 'funcionário: igual a antes');
  assert.equal(vt.diretoria, false);
  // "quem age": lembrete e remarcar para a Diretoria; pedir nova data para o técnico
  const det = c.Atividades_apiDetalhe('s_dir', { id: 'ad' });
  assert.equal(det.item.AGIR.codigo, 'LEMBRETE'); assert.equal(det.item.AGIR.acao, 'remarcar');
  assert.equal(c.Atividades_apiDetalhe('s_tec', { id: 'at' }).item.AGIR.acao, 'pedir');
  // e-mail de atraso: só o técnico
  c.Atividades_notificarAtrasos_();
  const avisosAtraso = amb.tabelas.ATV_AVISOS.filter((v) => v.TIPO === 'ATRASO');
  assert.deepEqual(avisosAtraso.map((v) => v.DESTINATARIO_ID), ['u_tec']);
  // remarcar sem justificativa (só a Diretoria, só a própria)
  const rr = c.Atividades_apiRemarcar('s_dir', { id: 'ad', novaPrevisao: '2026-10-23T17:00' });
  assert.equal(rr.ok, true, rr.message);
  const a = amb.tabelas.ATV_ATIVIDADES.find((x) => x.ID === 'ad');
  assert.equal(a.PREVISAO_ATUAL, '2026-10-23T17:00');
  assert.equal(String(a.QTD_JUSTIFICATIVAS || 0), '0', 'não conta como justificativa');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === 'ad' && h.TIPO === 'REPLANEJAMENTO' && /sem justificativa obrigatória/.test(h.TEXTO)));
  assert.equal(c.Atividades_apiRemarcar('s_tec', { id: 'at', novaPrevisao: '2026-10-23T17:00' }).ok, false, 'funcionário continua com o pedido de nova data');
  assert.match(c.Atividades_apiRemarcar('s_tec', { id: 'at', novaPrevisao: '2026-10-23T17:00' }).message, /só para a Diretoria/);
  assert.equal(c.Atividades_apiRemarcar('s_dir', { id: 'at', novaPrevisao: '2026-10-23T17:00' }).ok, false, 'a Diretoria remarca só a própria (a de outro é por Editar)');
});

test('atividades: com a regra desligada, a Diretoria volta à janela obrigatória (como antes)', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: EXTRA, props: { GESTAO_DECISOES_CFG: CFG_DESLIGADO } });
  atividade(amb, 'ad', 'u_dir', 'DORA DIRETORA TESTE', '2026-10-19T08:00', { CRIADO_POR_ID: 'u_gt' });
  const vd = amb.ctx.Atividades_apiVerificar('s_dir', {});
  assert.deepEqual(vd.pendentes.map((a) => a.ID), ['ad']);
});

// ------------------------------------------------------------------ 4. Resumo diário da Diretoria
function cenarioResumo(agoraIso, util) {
  const amb = ambiente({ agora: Date.parse(agoraIso), extras: EXTRA, tabelas: {
    GES_DECISOES: [linhaCaixa('PAD:1', 'Padrão vencido: termômetro T-01', 'u_gt', 'GIL GESTOR TESTE', { ENTROU_EM: '2026-10-09T09:00', PRAZO_DECISAO: '2026-10-12', ESCALADO_EM: '2026-10-16T09:00', ESCALADO_PARA: 'u_dir' })] } });
  aprovado(amb, util);
  fontePadrao(amb, 'PAD:1', 'Padrão vencido: termômetro T-01');
  atividade(amb, 'at1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-15T17:00', { PRIORIDADE: 'Alta', MODULO: 'assistencia' });
  atividade(amb, 'ad1', 'u_dir', 'DORA DIRETORA TESTE', '2026-10-16T17:00', { CRIADO_POR_ID: 'u_dir' });
  return amb;
}

test('resumo diário: um por dia útil a partir das 08:30, e-mail com a lista por setor e o link do relatório, WhatsApp curto (utilidade), alerta na tela', () => {
  const amb = cenarioResumo(SEG('08:15'), true);
  const c = amb.ctx;
  let r = c.SGO_resumoDiretoriaRodada_(null, new c.Date());
  assert.match(r.fora, /antes da hora do resumo da Diretoria \(08:30\)/);
  amb.mudar(SEG('08:30')); aprovado(amb, true);
  r = c.SGO_resumoDiretoriaRodada_(null, new c.Date());
  assert.equal(r.enviados, 1, JSON.stringify(r));
  const em = emailsPara(amb, 'dora');
  assert.equal(em.length, 1);
  assert.match(em[0].subject, /Resumo do dia da empresa/);
  assert.match(em[0].body, /para conhecimento/);
  assert.match(em[0].body, /O QUE ESTÁ PARADO NA EMPRESA, POR SETOR/);
  assert.match(em[0].body, /Metrologia e Calibração \(1\)/);
  assert.match(em[0].body, /Padrão vencido: termômetro T-01\. Com: GIL GESTOR TESTE\. Parado há \d+ dias úteis\./);
  assert.match(em[0].body, /ATIVIDADES DA EQUIPE ATRASADAS/);
  assert.match(em[0].body, /SUAS ATIVIDADES COM A PREVISÃO VENCIDA \(lembrete, sem justificativa\)/);
  assert.match(em[0].body, /tela=gestao_relatorio_dia/);
  assert.doesNotMatch(em[0].body, /decida agora|com o seu nome|justifique/i, 'texto informativo, sem cobrança');
  const wa = whatsPara(amb, FONE.dora);
  assert.equal(wa.length, 1);
  assert.equal(wa[0].corpo.template.name, 'sgo_gestao_item');
  const ps = wa[0].corpo.template.components[0].parameters.map((p) => p.text);
  assert.equal(ps[1], 'resumo do dia da empresa, para conhecimento');
  assert.match(ps[2], /itens parados/); assert.ok(ps[2].length <= 560);
  assert.match(ps[3], /tela=gestao_relatorio_dia/);
  assert.ok(amb.tabelas.ATV_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_dir' && v.TIPO === 'DIRETORIA' && /Relatório diário da empresa/.test(v.TEXTO)), 'alerta na tela');
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'RESUMO_DIRETORIA' && e.USUARIO_ID === 'u_dir').length, 1);
  assert.equal(emailsPara(amb, 'gil').length, 0, 'o gestor não recebe o resumo da Diretoria');
  // a mesma rodada de novo no dia: nada repete
  amb.mudar(SEG('09:00')); aprovado(amb, true);
  r = c.SGO_resumoDiretoriaRodada_(null, new c.Date());
  assert.equal(r.feito, true);
  assert.equal(emailsPara(amb, 'dora').length, 1);
});

test('resumo diário: sem o modelo de utilidade aprovado, usa o sgo_gestao_acao (como a fila da gestão); fim de semana não sai', () => {
  const amb = cenarioResumo('2026-10-24T09:00:00-03:00', false); // sábado
  const c = amb.ctx;
  const ex = c.SGO_dentroDoExpediente_(new c.Date());
  assert.equal(ex.dentro, false);
  assert.ok(c.SGO_resumoDiretoriaRodada_(ex, new c.Date()).fora);
  assert.equal(emailsPara(amb, 'dora').length, 0);
  amb.mudar(SEG('10:00')); aprovado(amb, false);
  c.SGO_resumoDiretoriaRodada_(null, new c.Date());
  const wa = whatsPara(amb, FONE.dora);
  assert.equal(wa.length, 1);
  assert.equal(wa[0].corpo.template.name, 'sgo_gestao_acao');
});

test('regras da Caixa: liga, desliga e hora do resumo da Diretoria (dentro do expediente); a ponte sem o campo mantém o gravado', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: EXTRA });
  const c = amb.ctx;
  const base = c.Gestao_apiConfig('s_dir', {});
  assert.deepEqual(JSON.parse(JSON.stringify(base.cfg.diretoriaResumo)), { ligado: true, hora: '08:30' });
  const salvar = (dr) => c.Gestao_apiConfig('s_dir', { salvar: { gestoresPorArea: base.cfg.gestoresPorArea, areaPorModulo: {}, escada: base.cfg.escada, automacoes: base.cfg.automacoes, diretoriaResumo: dr } });
  assert.equal(salvar({ ligado: false, hora: '09:15' }).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(c.Ges_cfg_().diretoriaResumo)), { ligado: false, hora: '09:15' });
  const fora = salvar({ ligado: true, hora: '20:00' });
  assert.equal(fora.ok, false); assert.match(fora.message, /dentro do horário de trabalho/);
  assert.equal(salvar(undefined).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(c.Ges_cfg_().diretoriaResumo)), { ligado: false, hora: '09:15' }, 'sem o campo, mantém');
  const g = c.Gestao_apiConfig('s_gt', { salvar: { gestoresPorArea: {}, escada: base.cfg.escada, diretoriaResumo: { ligado: true } } });
  assert.equal(g.ok, false, 'gestor não muda as regras');
});

test('resumo do dia das 08:00 (matriz): a Diretoria não recebe a lista de escaladas nem "vai para a Diretoria com o seu nome"; aponta o resumo da Diretoria', () => {
  // terça: na segunda (dia do relatório semanal) o e-mail da Diretoria espera os relatórios até 10:30, como antes
  const amb = cenarioResumo('2026-10-20T08:05:00-03:00', true);
  const c = amb.ctx;
  c.Mtz_pendenciasCadastroAssinatura_ = () => []; // SGO_CadastroQualidade.js fica fora deste ambiente (a falta já derruba o resumo do dia na bateria da matriz)
  c.SGO_resumoDiaRodada_(new c.Date());
  const em = emailsPara(amb, 'dora');
  assert.equal(em.length, 1, 'o resumo do dia comum continua (atividades, avisos)');
  assert.doesNotMatch(em[0].body, /ESCALADAS PARA A DIRETORIA|com o seu nome/);
  assert.match(em[0].body, /vai no resumo diário da Diretoria, às 08:30/);
  assert.match(em[0].body, /Lembrete: conclua ou, se quiser, remarque a data/);
  // o gestor continua com o texto de sempre
  const gil = emailsPara(amb, 'gil');
  assert.ok(gil.length === 0 || !/resumo diário da Diretoria/.test(gil[0].body));
});

// ------------------------------------------------------------------ 5. Relatório diário da empresa (HTML A4)
test('relatório diário: índice clicável, visão geral com gráficos SVG, Kanban de 5 colunas, seção por setor com quem e há quantos dias, ranking, conduta só em números', () => {
  const amb = cenarioResumo(SEG('10:00'), true);
  const c = amb.ctx;
  // Programa de conduta: item sigiloso na central (só número no relatório)
  c.PEND_FONTES.push({ nome: 'conduta teste', fn: function (add) { add(c.Pend_item_('conduta_ciencia', { id: 'CND:1', nome: 'Ocorrência SIGILOSA de Fulano', publico: 'GESTAO', gravidade: 'CRITICO', titulo: 'Ocorrência SIGILOSA de Fulano', responsavel: 'FULANO SIGILO' })); } });
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 'rest', TITULO: 'Plano disciplinar RESTRITO', RESPONSAVEL_ID: 'u_tec', RESPONSAVEL_NOME: 'TIAGO TECNICO TESTE', CRIADO_POR_ID: 'u_dir', PRAZO: '2026-10-15T17:00', PREVISAO_ATUAL: '2026-10-15T17:00', SITUACAO: 'A fazer', RESTRITA: 'SIM', MODULO: 'conduta' });
  const r = c.Gestao_apiRelatorioDiario('s_dir', {});
  assert.equal(r.ok, true, r.message);
  const h = r.html;
  fs.mkdirSync(path.join(__dirname, '../output/diretoria-resumo/capturas'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../output/diretoria-resumo/capturas/relatorio-diario-teste.html'), h);
  assert.match(h, /<!doctype html>|<!DOCTYPE html>/i);
  assert.match(h, /Relatório diário da empresa/);
  // índice clicável: cada link aponta para uma âncora que existe
  const links = Array.from(h.matchAll(/<a href="#(rd-[a-z-]+)"/g)).map((m) => m[1]);
  assert.ok(links.length >= 8, links.join(','));
  links.forEach((id) => assert.match(h, new RegExp('id="' + id + '"'), 'âncora ' + id));
  ['rd-visao', 'rd-kanban', 'rd-setores', 'rd-ranking', 'rd-diretoria', 'rd-irreversiveis', 'rd-conduta'].forEach((id) => assert.ok(links.includes(id), id));
  // gráficos SVG (sem biblioteca externa)
  assert.ok((h.match(/<svg /g) || []).length >= 2, 'pelo menos dois gráficos');
  assert.doesNotMatch(h, /<script[^>]+src=|cdn\.|chart\.js/i);
  // Kanban: as 5 colunas
  ['Aguardando decisão', 'Em andamento', 'Atrasado', 'Escalado', 'Resolvido hoje'].forEach((t) => assert.match(h, new RegExp('<th[^>]*>' + t)));
  assert.match(h, /class="rd-card"/);
  // setor com o item, quem está com ele e há quanto tempo
  assert.match(h, /id="rd-s-metrologia"/);
  assert.match(h, /Padrão vencido: termômetro T-01/);
  assert.match(h, /GIL GESTOR TESTE/);
  assert.match(h, /parado há \d+ dias úteis/);
  assert.match(h, /id="rd-s-tecnica"/, 'atividade da Assistência no setor Técnica');
  assert.match(h, /TIAGO TECNICO TESTE/);
  // ranking (sem a Diretoria)
  const ranking = h.slice(h.indexOf('id="rd-ranking"'), h.indexOf('id="rd-diretoria"'));
  assert.match(ranking, /TIAGO TECNICO TESTE/);
  assert.doesNotMatch(ranking, /DORA DIRETORA TESTE/);
  // conduta: só números, sem nomes nem títulos
  assert.doesNotMatch(h, /SIGILOSA|FULANO SIGILO|Plano disciplinar RESTRITO/);
  const cnd = h.slice(h.indexOf('id="rd-conduta"'));
  assert.match(cnd, /<span class="v">2<\/span><span class="r">Itens abertos/);
  // A4 sem rolagem lateral: tabelas com layout fixo, SVG com largura máxima, nada mais largo que a folha
  assert.match(h, /table-layout:fixed/);
  assert.match(h, /\.reldia svg\{max-width:100%/);
  const larguras = Array.from(h.matchAll(/width="(\d+)"/g)).map((m) => Number(m[1]));
  assert.ok(larguras.every((w) => w <= 700), 'SVG até 700 px (a folha A4 útil tem ~177 mm): ' + larguras.join(','));
  assert.doesNotMatch(h, /width:\s*(2[2-9]\d|[3-9]\d\d)mm/, 'nenhum bloco mais largo que a folha');
  assert.match(h, /text-align:justify/);
});

test('relatório diário: acesso só da Diretoria (e do dono); gestor e técnico recebem o motivo e o caminho', () => {
  const amb = cenarioResumo(SEG('10:00'), true);
  const c = amb.ctx;
  assert.equal(c.Gestao_apiRelatorioDiario('s_dir', {}).ok, true);
  ['s_gt', 's_tec', 's_adm'].forEach((s) => {
    const r = c.Gestao_apiRelatorioDiario(s, {});
    assert.equal(r.ok, false, s);
    assert.match(r.message, /é da Diretoria .*Administração > Acessos/);
  });
  const caixa = c.Gestao_apiCaixa('s_dir', {});
  assert.equal(caixa.eu.relatorioDia, true);
  assert.equal(c.Gestao_apiCaixa('s_gt', {}).eu.relatorioDia, false);
});

test('matriz de avisos: GS07 registrado (informativo, sem tipo de aviso da gestão) e GS03 diz que vai no resumo', () => {
  const amb = ambiente({ extras: EXTRA });
  const c = amb.ctx;
  c.AvG_registrarEventos_(); // em produção roda em toda entrada da fila da gestão (a matriz carrega depois deste arquivo)
  const gs07 = c.MTZ_PADRAO.find((e) => e.cod === 'GS07');
  assert.ok(gs07);
  assert.equal(gs07.gestao, undefined);
  assert.match(gs07.publico, /Diretoria/);
  assert.match(c.MTZ_PADRAO.find((e) => e.cod === 'GS03').obs, /resumo diário \(GS07\)/);
});

// ------------------------------------------------------------------ 6. Caixa de acesso (padrão do lote 12)
// 18/11/2026: Auvo descontinuado pelo dono; 4 caixas do Auvo saíram do catálogo do lote 0 (150 -> 146).
test('caixa GESTAO_RELATORIO_DIA: registrada pelo próprio módulo, ligada, padrão Diretoria e dono; sem o módulo o catálogo continua com 146', () => {
  const amb = require('./_poderes_ambiente.cjs');
  const contas = [{ id: 'p_dono', login: 'admin', perfil: 'ADMIN', area: 'DIRETORIA' }, { id: 'p_dir', login: 'dora', perfil: 'DIRETORIA', area: 'DIRETORIA' },
    { id: 'p_gt', login: 'gil', perfil: 'GESTOR', area: 'TECNICA' }, { id: 'p_tec', login: 'tiago', perfil: 'TECNICO', area: 'TECNICA' }, { id: 'p_fin', login: 'fabi', perfil: 'FINANCEIRO', area: 'FINANCEIRO' }];
  const sem = amb.ambiente({ contas });
  assert.equal(sem.ctx.SGO_poderesCatalogo_().lista.length, 146, 'catálogo do lote 0 sem o módulo');
  const com = amb.ambiente({ contas, extras: ['SGO_Gestao_RelatorioDiario.js'] });
  const cat = com.ctx.SGO_poderesCatalogo_();
  assert.equal(cat.lista.length, 147); // 18/11/2026: 146 do lote 0 (sem as 4 caixas do Auvo) + GESTAO_RELATORIO_DIA
  const p = cat.mapa.GESTAO_RELATORIO_DIA;
  assert.ok(p && p.ligado && p.lote === 12);
  const pode = (login) => com.ctx.SGO_pode_({ userId: contas.find((c) => c.login === login).id, usuario: login, perfil: contas.find((c) => c.login === login).perfil }, 'GESTAO_RELATORIO_DIA');
  assert.equal(pode('admin'), true, 'dono');
  assert.equal(pode('dora'), true, 'Diretoria');
  ['gil', 'tiago', 'fabi'].forEach((l) => assert.equal(pode(l), false, l));
});

test('rodada da gestão (a cada 15 minutos) chama o resumo da Diretoria no expediente', () => {
  const amb = cenarioResumo('2026-10-20T08:45:00-03:00', true);
  const c = amb.ctx;
  c.Mtz_pendenciasCadastroAssinatura_ = () => [];
  const r = c.Ges_rodada_(new c.Date());
  assert.equal(r.resumoDiretoria && r.resumoDiretoria.enviados, 1, JSON.stringify(r.resumoDiretoria));
  assert.equal(emailsPara(amb, 'dora').filter((m) => /Resumo do dia da empresa/.test(m.subject)).length, 1);
});
