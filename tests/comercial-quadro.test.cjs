// Comercial nativo do SGO+ (21/10/2026): quadro do funil (Kanban), Gantt comercial e a especialista (IA) integrada.
// Código real num contexto isolado (tests/_comercial_ambiente.cjs), relógio fixo (não depende da hora real). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const LISTA_ENG1 = ['Hospital ou clínica no perfil de cliente (CME, engenharia clínica, centro cirúrgico, UTI)', 'Dor técnica identificada', 'Decisor técnico e financeiro mapeados', 'Origem e dono registrados'];
const opo = (amb, id) => amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === id);

function contato(amb, id, sid, data) {
  ok(amb.api(sid || 's_vera', 'registrarContato', { id, tipo: 'LIGACAO', respondeu: true, resumo: 'Falei com a coordenação da CME sobre o escopo', proxima: { acao: 'Ligar para combinar a visita', data: data || '2026-10-22', hora: '10:00' } }));
}
function decisor(amb, o, sid) {
  const atual = opo(amb, o.id);
  ok(amb.api(sid || 's_vera', 'salvarOportunidade', { id: o.id, titulo: atual.TITULO, clienteId: 'c1', unidadeId: 'un1', contatoId: atual.CONTATO_ID, funil: 'ENGENHARIA', origem: atual.ORIGEM,
    valor: '4.500,00', qualificacao: { DECISOR: 'Diretor administrativo aprova; coordenadora da CME valida' } }));
}
function enviarProposta(amb, oportunidadeId) {
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId }));
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Qualificação térmica (QI, QO e QD) da autoclave da CME, com relatório e certificados.',
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'A combinar', garantia: '90 dias' } }));
  ok(amb.api('s_vera', 'concluirProposta', { id: np.proposta.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: np.proposta.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: np.proposta.id, como: 'Entregue na reunião com a CME (teste)' }));
  return np.proposta.id;
}

// ------------------------------------------------------------------ quadro e permissões
test('quadro: colunas do funil, cartão com próxima ação e selos; valores só para quem vê; técnico, metrologia, RH e Financeiro não abrem; vendedor só as próprias', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  const q = ok(amb.api('s_vera', 'quadro', { funil: 'ENGENHARIA' }));
  assert.deepEqual(q.colunas.map((c) => c.codigo), ['ENG_1', 'ENG_2', 'ENG_3', 'ENG_4', 'ENG_5']);
  const col = q.colunas[0];
  assert.equal(col.qtd, 1);
  assert.equal(col.valorTxt, 'R$ 4.500,00');
  const c = col.cartoes[0];
  assert.equal(c.id, oportunidade.id);
  assert.equal(c.cliente, 'Hospital Teste Alfa');
  assert.match(c.proximaAcao, /Ligar para entender o escopo/);
  assert.equal(c.proximaEm, '20/10/2026 10:00');
  assert.equal(c.valorTxt, 'R$ 4.500,00');
  assert.equal(c.podeMover, true);
  assert.ok(c.selos.some((s) => /Proposta/.test(s.texto)) === false, 'sem proposta, sem selo de proposta');
  assert.ok(q.areas.includes('Autoclave'), 'área vem do tipo do equipamento ligado');
  assert.equal(ok(amb.api('s_vera', 'quadro', { funil: 'ENGENHARIA', area: 'Lavadora' })).colunas[0].qtd, 0, 'filtro de área');
  assert.equal(ok(amb.api('s_vera', 'quadro', { funil: 'ENGENHARIA', busca: 'beta' })).colunas[0].qtd, 0, 'filtro de cliente');
  assert.equal(ok(amb.api('s_vera', 'quadro', { funil: 'ENGENHARIA', de: '2026-11-01', ate: '2026-12-31' })).colunas[0].qtd, 0, 'período: a barra (criação até hoje, sem previsão) não cruza um período futuro');
  for (const sid of ['s_tiago', 's_mara', 's_rita', 's_gil']) {
    for (const acao of ['quadro', 'gantt', 'especialista', 'leituraFunil', 'criteriosEtapa']) assert.equal(amb.api(sid, acao, { id: oportunidade.id }).ok, false, sid + ' ' + acao);
  }
  assert.match(amb.api('s_fabio', 'quadro', {}).message, /Financeiro vê só os pedidos aprovados/);
  assert.equal(ok(amb.api('s_vito', 'quadro', { funil: 'ENGENHARIA' })).colunas[0].qtd, 0, 'outro vendedor não vê');
  assert.equal(ok(amb.api('s_vito', 'gantt', {})).linhas.length, 0);
  const g = ok(amb.api('s_gaspar', 'quadro', { funil: 'ENGENHARIA', responsavelId: 'u_ven2' }));
  assert.equal(g.colunas[0].qtd, 0, 'gestão filtra por vendedor');
  assert.equal(ok(amb.api('s_gaspar', 'quadro', { funil: 'ENGENHARIA' })).colunas[0].qtd, 1);
  assert.equal(ok(amb.api('s_vito', 'quadro', { responsavelId: 'u_ven' })).filtros.responsavelId, '', 'vendedor não usa filtro de outro vendedor');
  assert.match(amb.api('s_vera', 'quadro', { de: '2026-12-01', ate: '2026-11-01' }).message, /período começa depois de terminar/);
});

test('valores escondidos: sem permissão de ver valores, nem coluna, nem cartão, nem leitura levam R$', () => {
  const amb = ambiente();
  oportunidadeDeTeste(amb);
  const eu = { id: 'u_gc', nome: 'GASPAR', gestao: true, vendedor: false, financeiro: false, veValores: false, veCusto: false, nivel: 'GESTAO' };
  const m = amb.ctx.ComQ_quadro_(eu, { funil: 'ENGENHARIA' });
  const txt = JSON.stringify(m);
  assert.doesNotMatch(txt, /R\$|"valor"|ponderado/, txt.slice(0, 300));
  const gt = JSON.stringify(amb.ctx.ComQ_gantt_(eu, {}));
  assert.doesNotMatch(gt, /R\$|valorTxt/);
});

// ------------------------------------------------------------------ mover respeita os critérios
test('mover no quadro: avanço confere lista da etapa, decisor e contato; falta algo = explica e não move; confirmação fica gravada sem apagar', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  const c = ok(amb.api('s_vera', 'criteriosEtapa', { id: oportunidade.id, etapa: 'ENG_2' }));
  assert.equal(c.sentido, 'AVANCO');
  assert.deepEqual(c.confirmar.map((x) => x.texto), LISTA_ENG1);
  assert.deepEqual(c.faltas.map((x) => x.codigo).sort(), ['CONTATO', 'DECISOR']);
  assert.ok(c.faltas.every((x) => /Abra a oportunidade/.test(x.oQueFazer)), 'diz o caminho na tela');
  const r = amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2', confirmados: { ENG_1: LISTA_ENG1 } });
  assert.equal(r.ok, false);
  assert.match(r.message, /decisor não está mapeado[\s\S]*Nenhum contato[\s\S]*continua na etapa Prospecção e qualificação/);
  assert.equal(opo(amb, oportunidade.id).ETAPA, 'ENG_1', 'não moveu');
  decisor(amb, oportunidade); contato(amb, oportunidade.id);
  const sem = amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2', confirmados: { ENG_1: LISTA_ENG1.slice(0, 3) } });
  assert.equal(sem.ok, false);
  assert.match(sem.message, /Faltam 1 item da lista[\s\S]*Origem e dono registrados/);
  ok(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2', confirmados: { ENG_1: LISTA_ENG1 } }));
  const o = opo(amb, oportunidade.id);
  assert.equal(o.ETAPA, 'ENG_2');
  assert.deepEqual(JSON.parse(o.CRITERIOS_JSON).ENG_1.itens, LISTA_ENG1);
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === oportunidade.id && h.TIPO === 'ETAPA' && /Itens confirmados por VERA/.test(h.TEXTO)));
  // pular a etapa de proposta sem proposta enviada: recusa
  const pulo = ok(amb.api('s_vera', 'criteriosEtapa', { id: oportunidade.id, etapa: 'ENG_4' }));
  assert.ok(pulo.faltas.some((x) => x.codigo === 'PROPOSTA'));
  assert.ok(pulo.confirmar.some((x) => x.etapa === 'ENG_3'), 'lista da etapa pulada também');
  assert.match(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_4' }).message, /precisa de proposta enviada/);
  // 100% sem aceite
  assert.ok(ok(amb.api('s_vera', 'criteriosEtapa', { id: oportunidade.id, etapa: 'ENG_5' })).faltas.some((x) => x.codigo === 'ACEITE'));
  // voltar pede motivo
  assert.match(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_1' }).message, /escreva o motivo/);
  ok(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_1', motivo: 'Cliente pediu para refazer o diagnóstico' }));
  assert.equal(opo(amb, oportunidade.id).ETAPA, 'ENG_1');
  // avançar de novo: a lista já confirmada vale (não pede outra vez) e nada se perde
  ok(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2' }));
  assert.deepEqual(JSON.parse(opo(amb, oportunidade.id).CRITERIOS_JSON).ENG_1.itens, LISTA_ENG1);
});

test('mover no quadro: permissões (outro vendedor não move; gestão move) e proposta enviada libera a negociação', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  decisor(amb, oportunidade); contato(amb, oportunidade.id);
  assert.match(amb.api('s_vito', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2', confirmados: { ENG_1: LISTA_ENG1 } }).message, /é de VERA VENDEDORA TESTE/);
  assert.equal(amb.api('s_fabio', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2' }).ok, false);
  assert.equal(amb.api('s_tiago', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2' }).ok, false);
  assert.equal(opo(amb, oportunidade.id).ETAPA, 'ENG_1');
  ok(amb.api('s_gaspar', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2', confirmados: { ENG_1: LISTA_ENG1 } }));
  enviarProposta(amb, oportunidade.id);
  assert.equal(opo(amb, oportunidade.id).ETAPA, 'ENG_3', 'envio leva à etapa de proposta (rotina)');
  const lista3 = ['Resumo da dor', 'Escopo claro e responsabilidades', 'Prazo, condição e validade', 'Retorno agendado antes de terminar o dia'];
  ok(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_4', confirmados: { ENG_3: lista3, ENG_2: ['Equipamento, modelo e número de série', 'Impacto operacional e urgência', 'Histórico e fornecedor atual', 'Escopo e prazo entendidos'] } }));
  assert.equal(opo(amb, oportunidade.id).ETAPA, 'ENG_4');
});

// ------------------------------------------------------------------ Gantt
test('Gantt: barra da criação à previsão, marcos de proposta enviada, validade, retornos, pedido aprovado e passagem; atraso marcado', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vera', { previsao: '2026-11-30' });
  const pid = enviarProposta(amb, oportunidade.id);
  let g = ok(amb.api('s_vera', 'gantt', {}));
  let l = g.linhas.find((x) => x.id === oportunidade.id);
  assert.equal(l.inicio, '2026-10-19');
  assert.equal(l.previsao, '2026-11-30');
  assert.equal(l.atrasada, false);
  const tipos = l.marcos.map((m) => m.tipo);
  assert.ok(tipos.includes('ENVIO') && tipos.includes('VALIDADE') && tipos.includes('RETORNO'), tipos.join(','));
  assert.equal(l.marcos.find((m) => m.tipo === 'ENVIO').dia, '2026-10-19');
  assert.equal(l.marcos.find((m) => m.tipo === 'VALIDADE').dia, '2026-11-03', '15 dias de validade');
  assert.ok(l.marcos.some((m) => m.tipo === 'RETORNO' && m.dia === '2026-10-21' && !m.concluido), 'retorno da proposta no 2º dia útil');
  assert.ok(l.marcos.some((m) => m.tipo === 'RETORNO' && m.concluido), 'retorno anterior concluído aparece');
  assert.equal(l.valorTxt, 'R$ 4.500,00');
  // aprovação e passagem
  ok(amb.api('s_vera', 'respostaCliente', { id: pid, resposta: 'APROVADA', texto: 'Aprovado pela coordenação', arquivo: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') } }));
  amb.mudar('2026-10-21T10:00:00-03:00');
  g = ok(amb.api('s_vera', 'gantt', {}));
  l = g.linhas.find((x) => x.id === oportunidade.id);
  assert.equal(l.situacao, 'GANHA');
  assert.ok(l.marcos.some((m) => m.tipo === 'APROVADO' && m.dia === '2026-10-19'));
  assert.ok(l.marcos.some((m) => m.tipo === 'PASSAGEM' && m.pendente && m.atrasado), 'pedido sem passagem há 2 dias úteis: marco em vermelho');
  ok(amb.api('s_vera', 'passarSetores', { id: pid }));
  l = ok(amb.api('s_vera', 'gantt', {})).linhas.find((x) => x.id === oportunidade.id);
  assert.ok(l.marcos.some((m) => m.tipo === 'PASSAGEM' && m.dia === '2026-10-21' && !m.atrasado));
  // previsão vencida em aberta = atrasada
  const o2 = oportunidadeDeTeste(amb, 's_vera', { previsao: '2026-10-20', titulo: 'Calibração de termômetros da CME', proxima: { acao: 'Ligar para confirmar a coleta', data: '2026-10-22', hora: '10:00', tipo: 'LIGACAO' } }).oportunidade;
  amb.mudar('2026-10-23T10:00:00-03:00');
  l = ok(amb.api('s_vera', 'gantt', { agrupar: 'vendedor' })).linhas.find((x) => x.id === o2.id);
  assert.equal(l.atrasada, true);
  assert.ok(l.marcos.some((m) => m.tipo === 'RETORNO' && m.atrasado), 'retorno combinado vencido em vermelho');
});

test('tempo por etapa: média pelo histórico contra o máximo de dias da metodologia; leitura das regras aponta o gargalo', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  decisor(amb, oportunidade); contato(amb, oportunidade.id);
  amb.mudar('2026-10-29T10:00:00-03:00'); // 10 dias na etapa 1 (meta 7)
  contato(amb, oportunidade.id, 's_vera', '2026-10-30');
  ok(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2', confirmados: { ENG_1: LISTA_ENG1 } }));
  const q = ok(amb.api('s_vera', 'quadro', { funil: 'ENGENHARIA' }));
  const t1 = q.tempos.find((t) => t.codigo === 'ENG_1');
  assert.equal(t1.passagens, 1);
  assert.equal(t1.mediaDias, 10);
  assert.equal(t1.mediaTxt, '10,0 dias');
  assert.equal(t1.acimaDaMeta, true);
  assert.match(q.leitura.texto, /Etapa Prospecção e qualificação: média de 10,0 dias para sair \(meta: até 7 dias/);
  assert.equal(q.tempos.find((t) => t.codigo === 'ENG_2').atuais, 1);
});

// ------------------------------------------------------------------ especialista e leitura do funil (IA)
test('especialista: IA conferida; número inventado e promessa recusados (vale a regra); nada muda de etapa; decisão do vendedor registrada', () => {
  const amb = ambiente({ ia: (prompt) => {
    if (/estrategia":\{"texto/.test(prompt)) return JSON.stringify({ proximoPasso: 'Ligue hoje e ofereça desconto de 30% para fechar.', porque: 'A dor técnica ainda não está registrada e o decisor não foi mapeado.',
      estrategia: { texto: 'Cumpra o critério da etapa: valide dor, decisor e potencial antes de propor.', passos: ['Pergunte quem aprova a compra.', 'Confirme o prazo de 45 dias para a auditoria.'] },
      objecoes: [{ objecao: 'Já tenho fornecedor', resposta: 'Pergunte onde o atendimento atual falha e ofereça ser a reserva para urgência.' }, { objecao: 'Está caro', resposta: 'Custa R$ 12.345,00 a menos que a parada.' }],
      perguntas: ['Quem participa da decisão técnica?'], mensagem: 'Olá, Ana. Podemos conversar hoje sobre a qualificação da autoclave?', emailAssunto: 'Metrolabs: qualificação da autoclave', emailCorpo: 'Prezada Ana, enviei a proposta ontem.' });
    return '{}';
  } });
  const { oportunidade } = oportunidadeDeTeste(amb);
  const antes = JSON.stringify(opo(amb, oportunidade.id));
  const hist = amb.tabelas.COM_HISTORICO.length;
  const r = ok(amb.api('s_vera', 'especialista', { id: oportunidade.id }));
  assert.equal(r.origem, 'IA');
  assert.doesNotMatch(r.sugestao.proximoPasso, /30%/, 'promessa de desconto recusada');
  assert.match(r.sugestao.porque, /decisor não foi mapeado/);
  assert.equal(r.sugestao.estrategia.passos.length, 1, 'passo com número inventado (45 dias) sai');
  assert.deepEqual(r.sugestao.objecoes.map((o) => o.objecao), ['Já tenho fornecedor'], 'objeção com valor inventado sai');
  assert.doesNotMatch(r.sugestao.emailCorpo, /enviei/, 'afirmação de envio recusada');
  assert.match(r.aviso, /verificador recusou/);
  assert.match(r.lembrete, /nada é enviado ao cliente e a etapa não muda/);
  assert.equal(JSON.stringify(opo(amb, oportunidade.id)), antes, 'oportunidade intacta');
  assert.equal(amb.tabelas.COM_HISTORICO.length, hist, 'nada no histórico da oportunidade');
  assert.equal(amb.emails.length + amb.whats.length, 0, 'nada enviado');
  const s = amb.tabelas.COM_IA_SUGESTOES.find((x) => x.ID === r.sugestaoId);
  assert.equal(s.TIPO, 'ESPECIALISTA');
  ok(amb.api('s_vera', 'decidirSugestao', { sugestaoId: r.sugestaoId, decisao: 'USEI' }));
  assert.equal(amb.tabelas.COM_IA_SUGESTOES.find((x) => x.ID === r.sugestaoId).DECISAO, 'USEI');
  assert.equal(amb.api('s_vito', 'especialista', { id: oportunidade.id }).ok, false, 'outro vendedor não pede sobre a oportunidade alheia');
  // sem IA: regras completas (estratégia com o que falta para avançar e objeções da metodologia)
  const amb2 = ambiente();
  const o2 = oportunidadeDeTeste(amb2).oportunidade;
  const r2 = ok(amb2.api('s_vera', 'especialista', { id: o2.id }));
  assert.equal(r2.origem, 'REGRAS');
  assert.ok(r2.sugestao.estrategia.passos.some((p) => /decisor/.test(p)));
  assert.ok(r2.sugestao.objecoes.length >= 1);
});

test('leitura do funil: números do sistema; IA com número fora dos dados é recusada e vale o texto das regras; não muda etapa', () => {
  let resposta = null;
  const amb = ambiente({ ia: (prompt) => (/NÚMEROS DO FUNIL/.test(prompt) ? resposta : '{}') });
  const { oportunidade } = oportunidadeDeTeste(amb);
  amb.mudar('2026-11-03T10:00:00-03:00'); // 15 dias sem contato: parada e acima do prazo
  const antes = JSON.stringify(amb.tabelas.COM_OPORTUNIDADES);
  resposta = JSON.stringify({ texto: 'O funil tem 47 oportunidades paradas e perde 80% na proposta.', gargalos: ['Etapa 1 com 99 dias.'], riscos: [] });
  const r = ok(amb.api('s_vera', 'leituraFunil', { funil: 'ENGENHARIA', comIA: true }));
  assert.equal(r.origem, 'REGRAS');
  assert.match(r.aviso, /verificador recusou a leitura/);
  assert.match(r.leitura.texto, /OPO-2026-0001 \(Hospital Teste Alfa: [^)]*parada há 15 dias/);
  resposta = JSON.stringify({ texto: 'A OPO-2026-0001 está parada há 15 dias sem contato: reaqueça nesta semana ou registre a perda com o motivo real.', gargalos: ['Prospecção e qualificação concentra a única oportunidade aberta.'], riscos: ['OPO-2026-0001: parada há 15 dias.'] });
  const r2 = ok(amb.api('s_vera', 'leituraFunil', { funil: 'ENGENHARIA', comIA: true }));
  assert.equal(r2.origem, 'IA');
  assert.match(r2.leitura.texto, /reaqueça nesta semana/);
  assert.equal(JSON.stringify(amb.tabelas.COM_OPORTUNIDADES), antes, 'nada mudou nas oportunidades');
  assert.equal(amb.tabelas.COM_IA_SUGESTOES.filter((x) => x.TIPO === 'LEITURA_FUNIL').length, 2);
  ok(amb.api('s_vera', 'decidirSugestao', { sugestaoId: r2.sugestaoId, decisao: 'DESCARTEI', motivo: 'Já tinha falado com o cliente' }));
});
