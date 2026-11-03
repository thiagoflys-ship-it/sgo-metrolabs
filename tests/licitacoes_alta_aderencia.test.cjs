// SGO+ Licitações, 03/11/2026: alerta de NOVA OPORTUNIDADE DE ALTA ADERÊNCIA (pedido da missão: "órgão, objeto resumido, valor
// estimado, prazo, classificação, link"). Análise concluída com nota maior ou igual ao limite das regras (padrão 70), sem trava e
// com o prazo em aberto cria UM alerta ALTA_ADERENCIA pela fila dos alertas (agrupamento por licitação e pessoa, tetos, lembrete,
// ciência). Código real da análise (Lic_analisar_ grava a análise e a nota), dos alertas, do notificador, da matriz e do piloto;
// só a resposta da IA e a soma da nota são simuladas (a nota que o teste quer). E-mail e WhatsApp simulados; o relógio é o do
// ambiente (nunca o real).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ambiente, OP, IMBEL, ler } = require('./_licitacoes_alertas_ambiente.cjs');

const SAIDA = (travas) => ({
  resumo: 'Manutenção e calibração de equipamentos de laboratório.', caidos: 0,
  capacidade: { pontos: 20, justificativa: 'Itens do catálogo.', como: '', itens: [] },
  documentacao: { pontos: 10, justificativa: 'Exigências comuns.', exigencias: [] },
  riscos: [], travas: travas || [], afirmacoes: []
});
const TRAVA = { codigo: 'EXIGE_RBC', nome: 'Exige acreditação RBC', texto: 'O edital exige laboratório acreditado.', fonte: { ref: 'CAMPO:objeto', trecho: 'calibração' }, chave: 'TTESTE1', assinatura: 'ass1', assinaturaFonte: 'af1', excecao: '' };

/** Ambiente com a análise simulada: a.analisar(opId, nota, { travas, origem }) roda o Lic_analisar_ real com a nota pedida. */
function amb(o) {
  const a = ambiente(Object.assign({ props: { GEMINI_API_KEY: 'chave-de-teste' } }, o));
  let pedido = null;
  a.ctx.SGO_DocA4_chamarGemini_ = () => '{}';
  a.ctx.Lic_verificarAnalise_ = () => ({ ok: true, saida: SAIDA(pedido.travas) });
  const orig = a.ctx.Lic_notaFinal_;
  a.ctx.Lic_notaFinal_ = function () {
    const r = orig.apply(null, arguments), r2 = a.ctx.Lic_notaPelasTravas_(pedido.nota, r.travas, arguments[3]);
    return Object.assign(r, { soma: pedido.nota, nota: r2.nota, classe: r2.classe, classeNome: r2.classeNome, travas: r2.travas, efetivas: r2.efetivas, aConfirmar: r2.aConfirmar });
  };
  a.analisar = (opId, nota, x) => {
    pedido = Object.assign({ nota }, x || {});
    const l = a.ctx.Lic_acharOp_(opId);
    return a.ctx.Lic_analisar_({ id: 'u_cha', nome: 'CHARLES DIRETOR TESTE' }, l, { origem: (x && x.origem) || 'PEDIDO', motivo: 'teste da alta aderência', forcar: true });
  };
  a.op = (id) => a.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === id);
  a.alta = (f) => a.al(Object.assign({ TIPO: 'ALTA_ADERENCIA' }, f || {}));
  return a;
}
const CANDIDATA = (extra) => OP('op_alta', Object.assign({ UF: 'GO', MUNICIPIO: 'Goiânia', ORGAO_NOME: 'HOSPITAL ESTADUAL DE GOIANIA TESTE', VALOR_ESTIMADO: 250000,
  ENCERRAMENTO_PROPOSTAS: '2026-11-20T09:00:00', ENCERRAMENTO_ISO: '2026-11-20T12:00:00.000Z' }, extra || {}));

test('nota 78 sem trava e prazo em aberto: UM alerta importante por pessoa, com órgão, UF, objeto, valor, fim das propostas, nota, classe, critérios do sistema e link', () => {
  const a = amb({ ops: [CANDIDATA()], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();                                    // implantação e agenda (o fim das propostas entra na agenda)
  const e0 = a.emails.length, z0 = a.zap().length;
  const r = a.analisar('op_alta', 78);
  assert.equal(r.analisada, true); assert.equal(r.altaAderencia.criados, 2, JSON.stringify(r.altaAderencia));
  assert.equal(a.op('op_alta').NOTA, 78);
  const linhas = a.alta();
  assert.equal(linhas.length, 2, 'sem responsável e sem titular: os dois da Diretoria');
  assert.ok(linhas.every((x) => x.NIVEL === 'IMPORTANTE' && x.SITUACAO === 'PROGRAMADO' && x.PAPEL === 'TODOS' && x.ANTECEDENCIA === 'NOVA' && x.GRUPO === 'H|op_alta|1'));
  assert.equal(a.op('op_alta').ALTA_ADERENCIA_ESTADO, 'ALTA'); assert.equal(Number(a.op('op_alta').ALTA_ADERENCIA_CICLO), 1);
  assert.equal(a.hist('ALERTA_ALTA_ADERENCIA').length, 1);
  a.rodada('2026-11-03T10:05:00-03:00');
  assert.ok(a.alta().every((x) => x.SITUACAO === 'ENVIADO'), JSON.stringify(a.alta().map((x) => [x.SITUACAO, x.CANCELADO_MOTIVO])));
  const m = a.emails.slice(e0).find((x) => x.to === 'charles@exemplo.test');
  assert.ok(m, 'e-mail para o Charles');
  assert.match(m.subject, /Licitação LIC-2026-alta: nova oportunidade de alta aderência, nota 78 \(propostas em \d+ dias/);
  assert.match(m.body, /NOVA OPORTUNIDADE DE ALTA ADERÊNCIA \(importante\)/);
  assert.match(m.body, /Órgão: HOSPITAL ESTADUAL DE GOIANIA TESTE \(Goiânia\/GO\)/); assert.match(m.body, /\nUF: GO\n/);
  assert.match(m.body, /Objeto: Manutenção preventiva e corretiva/);
  assert.match(m.body, /Valor estimado: R\$\s?250\.000,00/);
  assert.match(m.body, /Fim das propostas: sex 20\/11\/2026 09:00 \(horário de Brasília, presumido\); faltam /);
  assert.match(m.body, /Natureza do prazo: (Confirmado|Calculado)/);
  assert.match(m.body, /Nota: 78 de 100 · classe Alta \(análise versão 1\)\. Alerta a partir de 70, sem trava/);
  assert.match(m.body, /Critérios mais fortes \(calculados pelo sistema, não pela IA\):\n   1\. /);
  const crit = m.body.split('não pela IA):\n')[1].split('\nResponsável:')[0];
  assert.ok(/Localização 15 de 15/.test(crit), crit);
  assert.ok(!/Capacidade|Documentação|Riscos/.test(crit), 'nunca os critérios da IA: ' + crit);
  assert.equal((m.body.match(/licciente=/g) || []).length, 1);
  assert.match(m.body, /Ficha da oportunidade \(aba Análise\): /);
  // WhatsApp: o mesmo modelo, 9 variáveis
  const z = a.zap().slice(z0).find((w) => w.corpo.to === '5562999990021');
  const p = z.corpo.template.components[0].parameters.map((q) => q.text);
  assert.equal(p.length, 9);
  assert.equal(p[0], 'importante'); assert.match(p[1], /HOSPITAL ESTADUAL DE GOIANIA TESTE \(Goiânia\/GO\)/);
  assert.equal(p[4], 'Oportunidade com nota 78 (alta aderência)');
  assert.equal(p[5], 'sex 20/11/2026 09:00 (horário de Brasília, presumido)', 'o fim das propostas inteiro, sem corte'); assert.match(p[7], /^classe Alta; mais fortes: localização 15 de 15/);
  assert.ok(p[7].length <= 200 && p.every((t) => !/[\n\t]/.test(t)));
  // o link abre a ficha na aba Análise
  const aviso = a.alta({ USUARIO_ID: 'u_cha' })[0].AVISO_ID;
  const ab = a.ctx.Lic_avisoAbrir_(a.sessoes.s_cha, aviso);
  assert.equal(ab.tela.aba, 'analise'); assert.equal(ab.tela.id, 'op_alta');
  // ciência: de um encerra a cobrança para os dois
  const tok = (/licciente=(c1e\.L[AG][0-9a-f]{10}\.[0-9a-f]{24})/.exec(m.body) || [])[1];
  assert.equal(a.ctx.Licitacoes_cienciaLink(tok, 'confirmar').ciente, true);
  assert.ok(a.alta().every((x) => x.SITUACAO === 'CIENTE'));
});

test('só com nota maior ou igual ao limite e sem trava: 69 não alerta; trava a confirmar não alerta; "Não é trava" libera o alerta; triagem travada nunca', () => {
  const a = amb({ ops: [CANDIDATA(), CANDIDATA({ ID: 'op_trav', CODIGO: 'LIC-2026-trav', CHAVE_FONTE: 'PNCP:op_trav', TRIAGEM: 'TRAVADA' })], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  let r = a.analisar('op_alta', 69);
  assert.equal(r.altaAderencia.criados, 0); assert.match(r.altaAderencia.motivo, /nota 69 abaixo do limite de 70/);
  r = a.analisar('op_alta', 85, { travas: [TRAVA] });
  assert.equal(a.op('op_alta').NOTA_CLASSE, 'TRAVA_A_CONFIRMAR');
  assert.equal(r.altaAderencia.criados, 0); assert.match(r.altaAderencia.motivo, /trava a confirmar/);
  assert.equal(a.alta().length, 0);
  // a Diretoria decide que não é trava: a nota 85 fica sem trava e o alerta sai (uma vez)
  const d = a.api('s_cha', 'travaDecidir', { id: 'op_alta', chave: 'TTESTE1', decisao: 'NAO_E_TRAVA', motivo: 'o edital aceita certificado rastreável' });
  assert.equal(d.ok, true, d.message);
  assert.equal(a.alta().length, 2);
  assert.match(a.hist('ALERTA_ALTA_ADERENCIA')[0].TEXTO, /depois da decisão da trava/);
  // travada pela triagem (com "alertar travadas" ligado) também não
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { alertarTravadas: true }, motivo: 'teste das travadas' }).ok, true);
  r = a.analisar('op_trav', 90);
  assert.equal(r.altaAderencia.criados, 0); assert.match(r.altaAderencia.motivo, /travada pela triagem/);
});

test('não repete: reanálise com a nota ainda alta não alerta; nota que cai marca a queda sem alerta; voltando, UM alerta "a nota voltou a ficar alta"', () => {
  const a = amb({ ops: [CANDIDATA()], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  a.analisar('op_alta', 78); a.rodada('2026-11-03T10:05:00-03:00');
  // ciência pela tela (sem ela, o lembrete do primeiro alerta sairia junto com o próximo, no mesmo envio agrupado)
  a.ctx.Lic_alertaCiente_(a.alta({ USUARIO_ID: 'u_cha' })[0].ID, { id: 'u_cha', nome: 'CHARLES DIRETOR TESTE' }, 'SGO_TELA');
  const e1 = a.emails.length;
  for (const n of [78, 82, 91]) { const r = a.analisar('op_alta', n, { origem: 'AUTOMATICA' }); assert.equal(r.altaAderencia.criados, 0); assert.equal(r.altaAderencia.repetida, true, n); }
  a.rodada('2026-11-03T10:10:00-03:00');
  assert.equal(a.alta({ PAPEL: (p) => p === 'TODOS' }).length, 2, 'só o primeiro alerta (um por pessoa)');
  assert.equal(a.emails.length - e1, 0, 'nada saiu de novo');
  // a nota cai abaixo do limite: marca a queda, sem alerta
  let r = a.analisar('op_alta', 55);
  assert.equal(r.altaAderencia.caiu, true); assert.equal(a.op('op_alta').ALTA_ADERENCIA_ESTADO, 'CAIU');
  assert.equal(a.hist('ALTA_ADERENCIA_CAIU').length, 1);
  r = a.analisar('op_alta', 60);
  assert.equal(r.altaAderencia.caiu, undefined, 'a queda é marcada uma vez');
  assert.equal(a.hist('ALTA_ADERENCIA_CAIU').length, 1);
  // volta a ficar alta: UM alerta, com o texto próprio
  r = a.analisar('op_alta', 74);
  assert.equal(r.altaAderencia.criados, 2); assert.equal(r.altaAderencia.voltou, true);
  const v = a.alta({ ANTECEDENCIA: 'VOLTOU' });
  assert.equal(v.length, 2); assert.ok(v.every((x) => x.GRUPO === 'H|op_alta|2'));
  a.rodada('2026-11-03T10:20:00-03:00');
  const m = a.emails.slice(e1).find((x) => x.to === 'thiago@exemplo.test' && /voltou/.test(x.subject));
  assert.ok(m); assert.match(m.subject, /a nota voltou a ficar alta, nota 74/);
  assert.match(m.body, /A NOTA VOLTOU A FICAR ALTA/); assert.match(m.body, /classe Média/, 'nota 74: classe média, acima do limite 70');
  assert.equal(a.zap().filter((w) => JSON.stringify(w.corpo).includes('Nota voltou a ficar alta: 74 (alta aderência)')).length, 2);
  r = a.analisar('op_alta', 80);
  assert.equal(r.altaAderencia.repetida, true);
  assert.equal(a.alta({ PAPEL: (p) => p === 'TODOS' }).length, 4);
});

test('prazo encerrado não alerta; nota que cai antes do envio cancela o alerta programado; fim das propostas em até 72 h sai crítico para os dois', () => {
  const ops = [CANDIDATA({ ENCERRAMENTO_PROPOSTAS: '2026-11-02T09:00:00', ENCERRAMENTO_ISO: '2026-11-02T12:00:00.000Z' }),
    CANDIDATA({ ID: 'op_perto', CODIGO: 'LIC-2026-pert', CHAVE_FONTE: 'PNCP:op_perto', RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', SITUACAO: 'ANALISE', ENCERRAMENTO_PROPOSTAS: '2026-11-05T09:00:00', ENCERRAMENTO_ISO: '2026-11-05T12:00:00.000Z' }),
    CANDIDATA({ ID: 'op_resp', CODIGO: 'LIC-2026-resp', CHAVE_FONTE: 'PNCP:op_resp', RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', SITUACAO: 'ANALISE' })];
  const a = amb({ ops, agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  let r = a.analisar('op_alta', 88);
  assert.equal(r.altaAderencia.criados, 0); assert.match(r.altaAderencia.motivo, /^o prazo de propostas encerrou$/);
  // crítico: fim das propostas em 2 dias, vai para os dois mesmo com responsável
  r = a.analisar('op_perto', 80);
  assert.equal(r.altaAderencia.nivel, 'CRITICO');
  assert.deepEqual(a.alta({ OPORTUNIDADE_ID: 'op_perto' }).map((x) => x.USUARIO_ID).sort(), ['u_cha', 'u_thi']);
  // importante com responsável: só para ele (o escalonamento leva ao outro sem ciência)
  r = a.analisar('op_resp', 80);
  assert.equal(r.altaAderencia.nivel, 'IMPORTANTE');
  assert.deepEqual(a.alta({ OPORTUNIDADE_ID: 'op_resp' }).map((x) => [x.USUARIO_ID, x.PAPEL]), [['u_cha', 'TITULAR']]);
  // antes da rodada, a nota cai: o alerta programado é cancelado com o motivo (nada sai)
  a.analisar('op_resp', 50);
  a.rodada('2026-11-03T10:05:00-03:00');
  const c = a.alta({ OPORTUNIDADE_ID: 'op_resp' })[0];
  assert.equal(c.SITUACAO, 'CANCELADO'); assert.match(c.CANCELADO_MOTIVO, /Alta aderência não vale mais: nota 50 abaixo do limite/);
  assert.ok(a.alta({ OPORTUNIDADE_ID: 'op_perto' }).every((x) => x.SITUACAO === 'ENVIADO'));
  assert.ok(a.emails.some((m) => /CRÍTICO|\(crítico\)/.test(m.body) && /LIC-2026-pert/.test(m.subject)));
  // sem ciência: o escalonamento do importante leva ao outro integrante (lembrete da mesma fila)
  a.analisar('op_resp', 76);
  a.rodada('2026-11-03T10:10:00-03:00');
  a.rodada('2026-11-03T10:26:00-03:00');
  assert.equal(a.alta({ OPORTUNIDADE_ID: 'op_resp', PAPEL: 'ESCALONAMENTO', USUARIO_ID: 'u_thi' }).length, 1);
  assert.equal(a.alta({ OPORTUNIDADE_ID: 'op_resp', PAPEL: 'REENVIO', USUARIO_ID: 'u_cha' }).length, 1);
});

test('agrupado com os prazos da mesma licitação: uma mensagem só por pessoa, com o alerta de alta aderência e o aviso do fim das propostas', () => {
  const a = amb({ ops: [IMBEL()], agora: '2026-11-06T07:40:00-03:00' });
  a.rodada();
  const aviso7 = a.al({ TIPO: 'PRAZO', EVENTO_TIPO: 'LIMITE_PROPOSTA', ANTECEDENCIA_MIN: 10080, SITUACAO: 'PROGRAMADO' });
  assert.equal(aviso7.length, 1, 'o aviso de 7 dias do fim das propostas está programado para 08:00');
  a.mudar('2026-11-06T07:55:00-03:00');
  const r = a.analisar('op_imbe', 81);
  assert.equal(r.altaAderencia.criados, 1, 'responsável Charles: só ele');
  const e0 = a.emails.length, z0 = a.zap().length;
  const x = a.rodada('2026-11-06T08:00:30-03:00');
  assert.equal(x.enviar.agrupados, 1);
  const novos = a.emails.slice(e0).filter((m) => m.to === 'charles@exemplo.test');
  assert.equal(novos.length, 1, 'um e-mail só');
  assert.match(novos[0].subject, /Licitação LIC-2026-imbe: 2 alertas/);
  assert.match(novos[0].body, /2 alertas desta licitação nesta mensagem\. O mais urgente: Fim do envio das propostas, sex 13\/11\/2026 08:00/, 'o mais urgente é o prazo, não a nota');
  assert.match(novos[0].body, /\n1\. Oportunidade com nota 81 \(alta aderência\) \(importante\)\n   Fim das propostas: sex 13\/11\/2026 08:00/, 'a alta aderência vem primeiro na lista');
  assert.match(novos[0].body, /Valor estimado: /); assert.match(novos[0].body, /Critérios mais fortes \(calculados pelo sistema\): /);
  assert.match(novos[0].body, /Fim do envio das propostas/);
  const zs = a.zap().slice(z0).filter((w) => w.corpo.to === '5562999990021');
  assert.equal(zs.length, 1);
  assert.equal(zs[0].corpo.template.components[0].parameters[4].text, '2 alertas: alta aderência e fim das propostas');
  const g = a.al({ OPORTUNIDADE_ID: 'op_imbe', ENVIO_GRUPO: (v) => !!v });
  assert.equal(g.length, 2); assert.equal(new Set(g.map((y) => y.ENVIO_GRUPO)).size, 1);
});

test('tetos: o teto do dia segura o importante (vai no resumo, pendente de ciência) e o crítico de 72 h passa', () => {
  const ops = [CANDIDATA(), CANDIDATA({ ID: 'op_b', CODIGO: 'LIC-2026-oprb', CHAVE_FONTE: 'PNCP:op_b' }), CANDIDATA({ ID: 'op_c', CODIGO: 'LIC-2026-oprc', CHAVE_FONTE: 'PNCP:op_c', ENCERRAMENTO_PROPOSTAS: '2026-11-05T09:00:00', ENCERRAMENTO_ISO: '2026-11-05T12:00:00.000Z' })];
  const a = amb({ ops, agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { tetoDia: 1 }, motivo: 'teste do teto da alta aderência' }).ok, true);
  a.analisar('op_alta', 80); a.analisar('op_b', 80); a.analisar('op_c', 80);
  a.rodada('2026-11-03T10:05:00-03:00');
  const porPessoa = (uid) => a.alta({ USUARIO_ID: uid, PAPEL: 'TODOS' });
  for (const uid of ['u_cha', 'u_thi']) {
    const s = porPessoa(uid).map((x) => x.OPORTUNIDADE_ID + ':' + x.SITUACAO).sort();
    assert.deepEqual(s, ['op_alta:ENVIADO', 'op_b:NO_RESUMO', 'op_c:ENVIADO'], uid);
  }
  const nr = a.alta({ SITUACAO: 'NO_RESUMO' })[0];
  assert.match(nr.CANCELADO_MOTIVO, /Teto de 1 mensagens de licitação para esta pessoa hoje atingido/);
  assert.ok(a.emails.some((m) => /no resumo \(teto do dia atingido\)/.test(m.subject) && /nova oportunidade de alta aderência, nota 80/.test(m.body)));
});

test('regras dos alertas: nota mínima com versão, motivo e histórico; fora da faixa recusa; limite mais alto cancela o programado e muda o que alerta', () => {
  const a = amb({ ops: [CANDIDATA(), CANDIDATA({ ID: 'op_b', CODIGO: 'LIC-2026-oprb', CHAVE_FONTE: 'PNCP:op_b' })], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  let cfg = a.api('s_cha', 'alertasCfg', {});
  assert.equal(cfg.ok, true, cfg.message); assert.deepEqual(JSON.parse(JSON.stringify(cfg.cfg.altaAderencia)), { ligado: true, limite: 70 });
  a.analisar('op_alta', 75);
  assert.equal(a.alta({ SITUACAO: 'PROGRAMADO' }).length, 2);
  let x = a.api('s_cha', 'alertasCfgSalvar', { campos: { altaAderencia: { limite: 40 } }, motivo: 'teste de faixa' });
  assert.equal(x.ok, false); assert.match(x.message, /Nota mínima da alta aderência: use um número inteiro de 50 a 100/);
  x = a.api('s_cha', 'alertasCfgSalvar', { campos: { altaAderencia: { limite: 80 } }, motivo: 'só as muito aderentes' });
  assert.equal(x.ok, true, x.message);
  const h = a.hist('REGRAS_DOS_ALERTAS').find((y) => /Nota mínima da alta aderência/.test(y.TEXTO));
  assert.ok(h); assert.equal(String(h.DE), '70'); assert.equal(String(h.PARA), '80'); assert.match(h.TEXTO, /Motivo: só as muito aderentes/);
  assert.equal(a.ctx.Lic_alertasCfg_().altaAderencia.limite, 80);
  assert.ok(a.alta().every((y) => y.SITUACAO === 'CANCELADO' && /abaixo do limite de 80/.test(y.CANCELADO_MOTIVO)), 'o programado de nota 75 saiu da regra nova');
  let r = a.analisar('op_b', 78);
  assert.equal(r.altaAderencia.criados, 0);
  r = a.analisar('op_b', 84);
  assert.equal(r.altaAderencia.criados, 2);
  // desligado nas regras: nada alerta
  x = a.api('s_cha', 'alertasCfgSalvar', { campos: { altaAderencia: { ligado: false } }, motivo: 'pausa do alerta de alta aderência' });
  assert.equal(x.ok, true, x.message);
  r = a.analisar('op_alta', 95);
  assert.match(r.altaAderencia.motivo, /desligado/);
});

test('Hoje e Painel: alta aderência nas últimas 24 h e 7 dias, com a fonte; o clique abre a lista filtrada (nota maior ou igual ao limite)', () => {
  const a = amb({ ops: [CANDIDATA(), CANDIDATA({ ID: 'op_b', CODIGO: 'LIC-2026-oprb', CHAVE_FONTE: 'PNCP:op_b', SITUACAO: 'ANALISE', RESPONSAVEL_ID: 'u_thi', RESPONSAVEL_NOME: 'THIAGO DONO TESTE' }), CANDIDATA({ ID: 'op_c', CODIGO: 'LIC-2026-oprc', CHAVE_FONTE: 'PNCP:op_c' })], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  a.analisar('op_alta', 80);
  a.mudar('2026-11-05T10:00:00-03:00');
  a.analisar('op_b', 77); a.analisar('op_c', 60);
  let hoje = a.api('s_cha', 'hoje');
  assert.equal(hoje.ok, true, hoje.message);
  assert.equal(hoje.altaAderencia.h24, 1); assert.equal(hoje.altaAderencia.d7, 2); assert.equal(hoje.altaAderencia.limite, 70);
  assert.match(hoje.altaAderencia.fonte, /LIC_ALERTAS \(tipo ALTA_ADERENCIA/); assert.match(hoje.altaAderencia.fonte, /LIC_OPORTUNIDADES/);
  vm.runInContext(ler('SGO_Licitacoes_Painel.js'), a.ctx, { filename: 'SGO_Licitacoes_Painel.js' });
  const pn = a.ctx.Lic_painel_({ id: 'u_cha', nome: 'CHARLES' });
  assert.equal(pn.altaAderencia.h24, 1); assert.equal(pn.altaAderencia.d7, 2);
  // a lista filtrada é a mesma conta (de todas as abas: uma no radar, outra em análise)
  let l = a.api('s_cha', 'oportunidades', { aba: 'analisar', alta: 168 });
  assert.equal(l.ok, true, l.message);
  assert.deepEqual(l.lista.map((o) => o.id).sort(), ['op_alta', 'op_b']); assert.equal(l.alta.limite, 70); assert.equal(l.alta.rotulo, 'últimos 7 dias');
  l = a.api('s_cha', 'oportunidades', { aba: 'analisar', alta: 24 });
  assert.deepEqual(l.lista.map((o) => o.id), ['op_b']);
  assert.deepEqual(a.api('s_cha', 'oportunidades', { aba: 'analisar' }).lista.map((o) => o.id).sort(), ['op_alta', 'op_c'], 'sem o filtro, a aba de sempre');
  // a nota da op_b cai: sai da contagem e da lista
  a.analisar('op_b', 40);
  hoje = a.api('s_cha', 'hoje');
  assert.equal(hoje.altaAderencia.h24, 0); assert.equal(hoje.altaAderencia.d7, 1);
  // 8 dias depois, fora da janela
  a.mudar('2026-11-11T11:00:00-03:00');
  assert.equal(a.api('s_cha', 'hoje').altaAderencia.d7, 0);
});

test('tela: Hoje e Painel mostram os dois números com a fonte e o link da lista filtrada; Regras dos alertas têm a nota mínima', () => {
  const fs = require('node:fs'), path = require('node:path');
  const h = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Licitacoes.html'), 'utf8');
  assert.match(h, /Lic_altaKpisHtml_\(d\.altaAderencia\) \+ "<\/div>" \+ Lic_altaFonteHtml_\(d\.altaAderencia\)/, 'Hoje');
  assert.match(h, /kbA\(\{ nota: "TRAVA" \}\), d\.travas\.fonte\) \+ Lic_altaKpisHtml_\(d\.altaAderencia\)/, 'Painel');
  assert.match(h, /\{ mod: "licitacoes_oportunidades", alta: 24 \}/); assert.match(h, /alta: LIC\.alta \|\| 0/);
  assert.match(h, /id="licAAltaLim"/); assert.match(h, /campos\.altaAderencia = alta/);
});

// ---------------------------------------------------------------- revisão de 7401585
// Nota alta gravada direto na oportunidade (como a fila deixa depois de refazer as análises) e avaliada como na rotina.
const NOTA_ALTA = (id, extra) => CANDIDATA(Object.assign({ ID: id, CODIGO: 'LIC-2026-' + id.slice(-4), CHAVE_FONTE: 'PNCP:' + id, RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', SITUACAO: 'ANALISE',
  NOTA: 80, NOTA_CLASSE: 'ALTA', ANALISE_VERSAO: 1, TRAVAS_A_CONFIRMAR: 0, NOTA_TRAVA: '', VALOR_ESTIMADO: 123456.78 }, extra || {}));
const CRIT72 = { ENCERRAMENTO_PROPOSTAS: '2026-11-05T10:00:00', ENCERRAMENTO_ISO: '2026-11-05T13:00:00.000Z' };
const avaliar = (a, id, o) => a.ctx.Lic_altaAvaliar_(id, null, Object.assign({ versao: 1, origem: 'AUTOMATICA' }, o || {}));
const zapsDe = (a, desde, fone) => a.zap().slice(desde).filter((w) => !fone || w.corpo.to === fone);

test('rajada de madrugada (revisão, script alta1): 7 críticos e 8 importantes às 03:00 — o crítico sai na hora, 5 por pessoa na rodada; o importante espera as 08:00 e passa de 5 no dia vai num resumo', () => {
  const ops = [];
  for (let i = 0; i < 15; i++) ops.push(NOTA_ALTA('op_a' + (100 + i), i < 7 ? CRIT72 : {}));
  const a = amb({ ops, agora: '2026-11-03T02:50:00-03:00' });
  a.rodada();
  a.mudar('2026-11-03T03:00:00-03:00');
  const cri = ops.map((o) => avaliar(a, o.ID));
  assert.deepEqual(cri.map((c) => c.nivel[0] + c.criados), Array(7).fill('C2').concat(Array(8).fill('I1')), 'crítico para os dois; importante só para o responsável');
  assert.ok(cri.slice(7).every((c) => c.liberarEm === '2026-11-03T11:00:00.000Z'), 'importante guardado para as 08:00');
  const z0 = a.zap().length, e0 = a.emails.length;
  a.rodada('2026-11-03T03:00:30-03:00');
  assert.equal(a.zap().length - z0, 10, '5 críticos por pessoa na rodada (antes: 20 de 15 oportunidades)');
  for (const uid of ['u_cha', 'u_thi']) {
    const s = a.alta({ USUARIO_ID: uid, NIVEL: 'CRITICO' }).map((x) => x.SITUACAO);
    assert.equal(s.filter((x) => x === 'ENVIADO').length, 5, uid); assert.equal(s.filter((x) => x === 'NO_RESUMO').length, 2, uid);
  }
  const res = a.emails.slice(e0).filter((m) => /2 oportunidades de alta aderência \(resumo\)/.test(m.subject));
  assert.equal(res.length, 2, 'um resumo por pessoa, só por e-mail');
  assert.match(res[0].body, /Valor estimado: R\$\s?123\.456,78/); assert.equal((res[0].body.match(/licciente=/g) || []).length, 2);
  assert.ok(a.alta({ NIVEL: 'IMPORTANTE' }).every((x) => x.SITUACAO === 'PROGRAMADO'), 'nada importante de madrugada');
  // 03:20: só o lembrete dos críticos (o importante não escalona à noite nem sai)
  a.rodada('2026-11-03T03:20:30-03:00');
  assert.ok(a.alta({ NIVEL: 'IMPORTANTE' }).every((x) => x.SITUACAO === 'PROGRAMADO'));
  // 08:00: o Charles já recebeu 5 mensagens de alta aderência hoje (críticos): os 8 importantes vão num resumo só
  const e1 = a.emails.length, z1 = a.zap().length;
  a.rodada('2026-11-03T08:00:30-03:00');
  const imp = a.alta({ NIVEL: 'IMPORTANTE', PAPEL: 'TITULAR' });
  assert.ok(imp.every((x) => x.SITUACAO === 'NO_RESUMO'), JSON.stringify(imp.map((x) => x.SITUACAO)));
  assert.equal(a.emails.slice(e1).filter((m) => m.to === 'charles@exemplo.test' && /8 oportunidades de alta aderência \(resumo\)/.test(m.subject)).length, 1);
  assert.equal(zapsDe(a, z1).filter((w) => JSON.stringify(w.corpo).includes('alta aderência')).length, 0, 'o resumo não vai pelo WhatsApp');
  assert.ok(a.hist('ALERTA_TETO').some((h) => /Teto de 5 alertas de alta aderência por pessoa no dia/.test(h.TEXTO)));
});

test('importante à noite sai às 08:00 do dia útil seguinte, 5 individuais e o resto no resumo; sem escalonamento depois das 18:00', () => {
  const ops = [];
  for (let i = 0; i < 8; i++) ops.push(NOTA_ALTA('op_n' + (100 + i)));
  const a = amb({ ops, agora: '2026-11-03T20:00:00-03:00' });
  a.rodada();
  ops.forEach((o) => avaliar(a, o.ID));
  const z0 = a.zap().length;
  a.rodada('2026-11-03T20:05:00-03:00'); a.rodada('2026-11-04T06:00:00-03:00');
  assert.equal(a.zap().length - z0, 0, 'nada à noite');
  a.rodada('2026-11-04T08:00:30-03:00');
  assert.equal(zapsDe(a, z0, '5562999990021').length, 5);
  assert.equal(a.alta({ SITUACAO: 'NO_RESUMO' }).length, 3);
  assert.ok(a.emails.some((m) => /3 oportunidades de alta aderência \(resumo\)/.test(m.subject)));
  // enviado às 17:55: o escalonamento (15 min) não sai às 18:10; sai na primeira rodada do expediente seguinte
  const b = amb({ ops: [NOTA_ALTA('op_tarde')], agora: '2026-11-04T17:50:00-03:00' });
  b.rodada(); avaliar(b, 'op_tarde');
  b.rodada('2026-11-04T17:55:00-03:00');
  assert.equal(b.alta({ PAPEL: 'TITULAR' })[0].SITUACAO, 'ENVIADO');
  b.rodada('2026-11-04T18:15:00-03:00'); b.rodada('2026-11-04T23:00:00-03:00');
  assert.equal(b.alta({ PAPEL: 'ESCALONAMENTO' }).length, 0, 'sem escalonamento à noite');
  b.rodada('2026-11-05T08:00:30-03:00');
  assert.equal(b.alta({ PAPEL: 'ESCALONAMENTO', USUARIO_ID: 'u_thi' }).length, 1, 'escalona na primeira rodada do expediente');
});

test('histerese: entre o limite menos 5 e o limite não conta como queda; no máximo um "voltou a ficar alta" por semana', () => {
  const a = amb({ ops: [NOTA_ALTA('op_hist')], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  const l = a.op('op_hist'); let v = 1;
  const nota = (n) => { l.NOTA = n; l.ANALISE_VERSAO = ++v; return a.ctx.Lic_altaAvaliar_('op_hist', null, { versao: v }); };
  assert.equal(avaliar(a, 'op_hist').criados, 1);
  let r = nota(67);
  assert.equal(r.caiu, undefined); assert.equal(l.ALTA_ADERENCIA_ESTADO, 'ALTA', '67 está na faixa de 65 a 70: não é queda');
  assert.equal(nota(80).repetida, true, 'sem queda, a volta para 80 não alerta');
  assert.equal(nota(60).caiu, true);
  r = nota(72); assert.equal(r.criados, 1); assert.equal(r.voltou, true);
  assert.equal(nota(60).caiu, true);
  r = nota(72); assert.equal(r.criados, 0); assert.equal(r.semana, true); assert.match(r.motivo, /no máximo um por semana/);
  assert.equal(l.ALTA_ADERENCIA_ESTADO, 'CAIU');
  a.mudar('2026-11-11T10:00:00-03:00');
  r = nota(72); assert.equal(r.criados, 1, 'depois de 7 dias pode voltar de novo'); assert.equal(r.voltou, true);
});

test('só Radar ou Em análise; critério marcado como pendência não é ponto forte; triagem que destrava alerta na rotina, sem reanálise', () => {
  const a = amb({ ops: [NOTA_ALTA('op_prop', { SITUACAO: 'PROPOSTA' }), NOTA_ALTA('op_crit'), NOTA_ALTA('op_trv', { SITUACAO: 'RADAR', TRIAGEM: 'TRAVADA', RESPONSAVEL_ID: '', RESPONSAVEL_NOME: '' })], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada();
  let r = avaliar(a, 'op_prop');
  assert.equal(r.criados, 0); assert.match(r.motivo, /só no radar e em análise/);
  // critérios: margem sem simulação e valor não informado são pendência
  a.tabelas.LIC_ANALISES.push({ ID: 'an_crit', OPORTUNIDADE_ID: 'op_crit', VERSAO: 1, SITUACAO: 'CONCLUIDA', CRITERIOS_JSON: JSON.stringify({
    margem: { pontos: 15, peso: 15, origem: 'CODIGO', como: 'Sem simulação de preço salva: 5 de 15, como pendência.' },
    valor: { pontos: 10, peso: 10, origem: 'CODIGO', como: 'Valor estimado não informado ou sigiloso: 5 de 10, como pendência.' },
    documentacao: { pontos: 15, peso: 15, origem: 'HABILITACAO', como: 'Tudo atende.', pendencia: true },
    prazo: { pontos: 10, peso: 10, origem: 'CODIGO', como: '12 dias úteis.' }, localizacao: { pontos: 12, peso: 15, origem: 'CODIGO', como: 'UF GO.' },
    capacidade: { pontos: 30, peso: 30, origem: 'IA_CODIGO', como: 'IA.' } }) });
  a.op('op_crit').ANALISE_ID = 'an_crit';
  assert.deepEqual(Array.from(a.ctx.Lic_altaCriterios_(a.op('op_crit'))).map((c) => c.nome), ['Prazo', 'Localização']);
  // triagem travada com a nota alta: guarda a espera; quando destrava, a rotina dos alertas avalia
  r = avaliar(a, 'op_trv');
  assert.equal(r.criados, 0); assert.equal(a.op('op_trv').ALTA_ADERENCIA_ESPERA, 'TRIAGEM');
  a.rodada('2026-11-03T10:05:00-03:00');
  assert.equal(a.alta({ OPORTUNIDADE_ID: 'op_trv' }).length, 0, 'ainda travada');
  a.op('op_trv').TRIAGEM = 'CANDIDATA';
  a.rodada('2026-11-03T10:10:00-03:00');
  assert.equal(a.alta({ OPORTUNIDADE_ID: 'op_trv' }).length, 2, 'sem responsável: os dois');
  assert.equal(a.op('op_trv').ALTA_ADERENCIA_ESPERA, '');
  assert.match(a.hist('ALERTA_ALTA_ADERENCIA').find((h) => /a triagem do radar deixou de travar/.test(h.TEXTO)).TEXTO, /nota 80/);
});

test('revisão de d22d75b (caso op_a110 do alta1): nota cai de 80 para 69 com o alerta ainda guardado; o envio cancela e a volta a 72 alerta (nunca "já saiu" sem ter saído)', () => {
  const a = amb({ ops: [NOTA_ALTA('op_a110')], agora: '2026-11-03T03:00:00-03:00' });
  a.rodada();
  const l = a.op('op_a110');
  assert.equal(avaliar(a, 'op_a110').criados, 1, 'importante guardado para as 08:00');
  l.NOTA = 69; l.ANALISE_VERSAO = 2;
  assert.equal(a.ctx.Lic_altaAvaliar_('op_a110', null, { versao: 2 }).caiu, undefined, '69 está na histerese: não é queda');
  a.rodada('2026-11-03T08:00:30-03:00');
  const c = a.alta({ OPORTUNIDADE_ID: 'op_a110' })[0];
  assert.equal(c.SITUACAO, 'CANCELADO'); assert.match(c.CANCELADO_MOTIVO, /nota 69 abaixo do limite de 70/);
  const z0 = a.zap().length;
  l.NOTA = 72; l.ANALISE_VERSAO = 3;
  const r = a.ctx.Lic_altaAvaliar_('op_a110', null, { versao: 3 });
  assert.equal(r.criados, 1, JSON.stringify(r)); assert.equal(r.voltou, false, 'o primeiro nunca saiu: é a nova oportunidade, não "voltou"');
  a.rodada('2026-11-03T08:05:30-03:00');
  assert.equal(a.zap().slice(z0).filter((w) => JSON.stringify(w.corpo).includes('Oportunidade com nota 72 (alta aderência)')).length, 1);
  l.NOTA = 75; l.ANALISE_VERSAO = 4;
  assert.equal(a.ctx.Lic_altaAvaliar_('op_a110', null, { versao: 4 }).repetida, true, 'agora saiu: não repete');
});
