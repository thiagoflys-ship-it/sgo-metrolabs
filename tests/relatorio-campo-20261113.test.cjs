// Relatório da O.S. de excelência (13/11/2026, pedido do dono a partir da OS-2026-0032): resultado do atendimento obrigatório e
// honesto (teste funcional e situação do equipamento ao final), mínimos do relato em palavras, medições estruturadas, rastreabilidade
// legível (um marco por fato, fotos agrupadas, sem nome de arquivo nem id interno), checklist sem linhas repetidas, fotos numeradas
// com legenda e a revisão do texto com IA (sem inventar nada). O.S. antiga continua fechando e gerando o relatório como antes.
// Código real num contexto isolado (tests/_assistencia_ambiente.cjs); só dados de teste; relógio fixo; trava não reentrante.
// Com AMOSTRA_DIR definido, grava as amostras HTML (O.S. nova e O.S. antiga) nessa pasta.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { ambiente, ok, ASSINATURA } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Equipamentos.js', 'SGO_CadastroQualidade.js'];
const amb0 = (o) => ambiente(Object.assign({ extras: EXTRAS, agora: Date.parse('2026-11-12T17:57:00-03:00') }, o || {}));
let seq = 0;
const ev = (tipo, osId, dados, em) => ({ tipo, osId, idLocal: 'rc13-' + String(++seq).padStart(5, '0'), em, dados: dados || {} });
const sync = (amb, eventos) => ok(amb.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p-rc13-' + (++seq), eventos }));

/** PNG de teste (faixas de cor), para a foto aparecer de verdade na amostra. */
function png(cor) {
  const w = 160, h = 120, linhas = [];
  for (let y = 0; y < h; y++) {
    const l = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) { const f = ((x >> 4) + (y >> 4)) % 2 ? 1 : 0.82; l[1 + x * 3] = cor[0] * f; l[2 + x * 3] = cor[1] * f; l[3 + x * 3] = cor[2] * f; }
    linhas.push(l);
  }
  const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const bloco = (t, d) => { const n = Buffer.alloc(4); n.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([n, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))]).toString('base64');
}
const CORES = [[90, 110, 130], [150, 120, 80], [70, 130, 90], [130, 80, 80]];

/**
 * Atendimento parecido com a OS-2026-0032: corretiva aberta em campo, saída e chegada no mesmo minuto, assinatura do técnico logo no
 * começo, 16 fotos (2 da pergunta do checklist), 3 resistências, relato e respostas atualizados várias vezes, assinatura do cliente e Concluí.
 * novo: preenche o resultado e as medições como o aplicativo novo faz; senão, como a O.S. real (sem resultado e com textos curtos).
 */
function atendimento(amb, novo) {
  const r = ok(amb.app('Ast_appAbrirOS', 's_tiago', { idLocal: 'rc13-os-' + (++seq), clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', tipoCodigo: 'MANUTENCAO_CORRETIVA',
    sintoma: 'Substituição das resistências do gerador de vapor', solicitante: 'Álax Solicitante Teste', prioridade: 'P1', parada: 'TOTAL', em: '2026-11-12T17:57:00' }));
  const id = r.os.id;
  amb.mudar('2026-11-12T18:56:00-03:00');
  sync(amb, [ev('SAIU', id, {}, '2026-11-12T17:57:10'), ev('CHEGUEI', id, { lat: -16.6869, lng: -49.2648 }, '2026-11-12T17:57:30'),
    ev('RELATO', id, { condicaoEncontrada: 'Parada' }, '2026-11-12T17:58:00'),
    ev('ASSINATURA', id, { papel: 'COLABORADOR', nome: 'Tiago Tecnico Teste', documento: '', imagem: ASSINATURA, versaoApp: 'teste' }, '2026-11-12T17:59:00')]);
  const legendas = { 4: 'Medição de tensão entre fases na entrada do quadro', 5: 'Medição de corrente na fase L1 durante o aquecimento' };
  for (let i = 0; i < 16; i++) {
    const min = i < 12 ? '0' + Math.floor(i / 4) : (i < 13 ? '33' : '41');
    ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'rc13-foto-' + id + '-' + String(i).padStart(3, '0'), nome: 'OS-2026-0001-2026-11-12T21-' + min + '-0' + (i % 10) + '.png', base64: png(CORES[i % 4]),
      perguntaId: i === 12 ? 'foto_defeito' : i >= 13 && i <= 14 ? 'foto_servico' : '', legenda: novo ? legendas[i] || '' : '', em: '2026-11-12T18:' + min + ':' + String(10 + i).padStart(2, '0') }));
  }
  const textoLongo = 'Histórico e serviço executado\nEm 10/11/2026 foi realizada a substituição das resistências. Em 12/11/2026, após novo chamado, a equipe técnica retornou à unidade, constatou a queima de todas as resistências substituídas no atendimento anterior e efetuou nova troca. Foram deixadas três resistências de reserva na unidade.\n\nConstatações em campo\nForam identificados desequilíbrio acentuado entre as fases, baixo fator de potência, oscilações e quedas recorrentes de energia.';
  const rel = novo ? {
    condicaoEncontrada: 'Autoclave parada, sem aquecimento do gerador de vapor. O cliente relatou que o equipamento parou durante o ciclo da manhã; o painel indicava falha de aquecimento.',
    causa: 'Três resistências do gerador de vapor queimadas (circuito aberto no teste de continuidade). Há forte suspeita de origem na alimentação elétrica: desequilíbrio entre as fases medido na entrada do quadro.',
    servicoRealizado: 'Substituídas as três resistências do gerador de vapor, com reaperto dos bornes de ligação e conferência da isolação para a carcaça. Deixadas três resistências de reserva na unidade.',
    testeResultado: 'NAO_REALIZADO', testeFuncional: 'Ciclo de teste não realizado: houve nova queda de energia da rede do hospital durante o atendimento e as fases continuavam desequilibradas.',
    resultadoFinal: 'NAO_LIBERADO', resultadoDetalhe: 'Aguardando a correção da alimentação elétrica pela infraestrutura do hospital; depois disso, retorno técnico para o teste funcional e a liberação.',
    recomendacoes: 'Corrigir com urgência o desequilíbrio entre as fases e as quedas de energia antes de voltar a operar o equipamento. Desobstruir a tubulação de drenagem da outra autoclave da CME.',
    relato: 'Durante o atendimento houve nova queda de energia com os dois equipamentos da CME em ciclo.',
    medicoes: [{ grandeza: 'Tensão entre fases', obs: 'L1-L2, entrada do quadro', valor: '221', unidade: 'V' }, { grandeza: 'Tensão entre fases', obs: 'L2-L3, entrada do quadro', valor: '198', unidade: 'V' },
      { grandeza: 'Tensão entre fases', obs: 'L1-L3, entrada do quadro', valor: '214', unidade: 'V' }, { grandeza: 'Corrente', obs: 'Fase L1, aquecimento ligado', valor: '18,4', unidade: 'A' },
      { grandeza: 'Resistência ôhmica', obs: 'Resistência nova, antes de ligar', valor: '7,1', unidade: 'Ω' }, { grandeza: '', valor: '', unidade: '' }]
  } : { relato: 'Metrolabs está responsável pelas funcionamento das máquinas, para que isso ocorra bem, a energia precisa chegar de qualidade para alimentação da máquina.', causa: 'Resistência',
    servicoRealizado: 'Substituição das 3 resistências', testeFuncional: 'Não foi possível testa equipamento por conta de problemas de energia da infraestruturas interna do hospital.', recomendacoes: 'Verificar as fases de chegada na máquina.' };
  sync(amb, [ev('PECA', id, { descricao: 'Resistência 7kv', quantidade: 3, unidade: 'un.' }, '2026-11-12T18:04:00'),
    ev('RESPOSTA', id, { perguntaId: 'identificado', valor: 'SIM' }, '2026-11-12T18:05:00'),
    ev('RESPOSTA', id, { perguntaId: 'defeito', valor: textoLongo }, '2026-11-12T18:34:00'),
    ev('RESPOSTA', id, { perguntaId: 'teste_ok', valor: 'NAO' }, '2026-11-12T18:35:00'),
    ev('RESPOSTA', id, { perguntaId: 'liberado', valor: 'NAO' }, '2026-11-12T18:35:30'),
    ev('RELATO', id, Object.assign({ serieConfirmada: 'S-100', identificadoPor: 'TAG' }, rel), '2026-11-12T18:40:00'),
    ev('ASSINATURA', id, { nome: 'Mariana Sousa Teste', imagem: ASSINATURA, versaoApp: 'teste' }, '2026-11-12T18:54:00'),
    ev('CONCLUI', id, { lat: -16.6869, lng: -49.2648 }, '2026-11-12T18:54:30')]);
  return id;
}
const osDe = (amb, id) => amb.tabelas.ATEC_OS.find((o) => o.ID === id);
const htmlDe = (amb, id) => amb.ctx.AstR_htmlOS_(osDe(amb, id), { marca: 'marca-de-teste' });
const texto = (h) => h.replace(/<img[^>]*>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
function secao(h, titulo) { const t = texto(h), i = t.indexOf(titulo); assert.ok(i >= 0, 'seção ' + titulo); return t.slice(i, i + 4000); }

test('resultado obrigatório (O.S. depois da regra): não fecha sem teste e situação do equipamento; cada falta diz o quê e como', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const r = ok(amb.app('Ast_appAbrirOS', 's_tiago', { idLocal: 'rc13-os-falta', clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', tipoCodigo: 'MANUTENCAO_CORRETIVA',
    sintoma: 'Autoclave não aquece e para no meio do ciclo', solicitante: 'Rui Responsável Teste', prioridade: 'P2', parada: 'TOTAL', em: '2026-11-12T17:57:00' }));
  const id = r.os.id;
  for (let i = 0; i < 2; i++) ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'rc13-f-falta-' + i, nome: 'f' + i + '.png', base64: png(CORES[i]), perguntaId: i ? 'foto_servico' : 'foto_defeito', em: '2026-11-12T17:58:00' })); // antes do Cheguei: a foto é aceita (regra de hoje)
  const s = sync(amb, [ev('CHEGUEI', id, {}, '2026-11-12T17:57:30'), ev('RESPOSTA', id, { perguntaId: 'identificado', valor: 'SIM' }, '2026-11-12T17:58:00'), ev('RESPOSTA', id, { perguntaId: 'defeito', valor: 'Resistência queimada' }, '2026-11-12T17:58:00'),
    ev('RESPOSTA', id, { perguntaId: 'teste_ok', valor: 'SIM' }, '2026-11-12T17:58:00'), ev('RESPOSTA', id, { perguntaId: 'liberado', valor: 'SIM' }, '2026-11-12T17:58:00'),
    ev('RELATO', id, { condicaoEncontrada: 'Parada', causa: 'Resistência', servicoRealizado: 'Troca da resistência', testeFuncional: 'Ok', serieConfirmada: 'S-100' }, '2026-11-12T18:00:00'),
    ev('ASSINATURA', id, { papel: 'COLABORADOR', nome: 'Tiago Tecnico Teste', imagem: ASSINATURA, versaoApp: 't' }, '2026-11-12T18:01:00'),
    ev('ASSINATURA', id, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: 't' }, '2026-11-12T18:02:00'), ev('CONCLUI', id, {}, '2026-11-12T18:03:00')]);
  assert.equal(s.os[0].situacao, 'DOC_PENDENTE');
  const p = s.os[0].pendencias.join(' | ');
  assert.match(p, /condição encontrada mais completo \(escreveu 1 palavra; mínimo 4\): como o equipamento estava/);
  assert.match(p, /causa ou o diagnóstico mais completo \(escreveu 1 palavra; mínimo 3\)/);
  assert.match(p, /serviço realizado mais completo \(escreveu 3 palavras; mínimo 5\)/);
  assert.match(p, /resultado do teste funcional \(aprovado, reprovado ou não realizado\)/);
  assert.match(p, /situação do equipamento ao final \(liberado para uso, liberado com restrição ou não liberado\)/);
  // liberado sem teste aprovado: incoerente, e diz o caminho
  let s2 = sync(amb, [ev('RELATO', id, { condicaoEncontrada: 'Autoclave parada, sem aquecer no ciclo', causa: 'Resistência do gerador queimada', servicoRealizado: 'Troca da resistência do gerador de vapor e reaperto',
    testeResultado: 'NAO_REALIZADO', testeFuncional: 'Sem energia', resultadoFinal: 'LIBERADO' }, '2026-11-12T18:04:00')]);
  const p2 = s2.os[0].pendencias.join(' | ');
  assert.match(p2, /motivo de o teste não ter sido feito \(pelo menos 5 palavras\)/);
  assert.match(p2, /está como "liberado para uso" mas o teste funcional não foi feito\. Escolha "liberado com restrição" ou "não liberado"/);
  // não liberado pede o que falta
  s2 = sync(amb, [ev('RELATO', id, { testeFuncional: 'Teste não feito: queda de energia da rede do hospital durante o atendimento', resultadoFinal: 'NAO_LIBERADO', resultadoDetalhe: 'Aguardando' }, '2026-11-12T18:05:00')]);
  assert.match(s2.os[0].pendencias.join(' | '), /o que falta para o equipamento ser liberado \(pelo menos 4 palavras\)/);
  s2 = sync(amb, [ev('RELATO', id, { resultadoDetalhe: 'Aguardando a correção elétrica da rede do hospital' }, '2026-11-12T18:06:00')]);
  assert.equal(s2.os[0].situacao, 'ENCERRADA', JSON.stringify(s2.os[0].pendencias));
  const o = osDe(amb, id);
  assert.equal(o.TESTE_RESULTADO, 'NAO_REALIZADO'); assert.equal(o.RESULTADO_FINAL, 'NAO_LIBERADO');
  // o encerramento diz a situação; a gestão é avisada; o e-mail ao cliente diz que não foi liberado
  const enc = amb.tabelas.ATEC_EVENTOS.find((e) => e.TIPO === 'ENCERRADA' && e.ENTIDADE_ID === id);
  assert.match(enc.TEXTO, /documentação completa · equipamento não liberado para uso: Aguardando a correção elétrica/);
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.TIPO === 'RESULTADO_RESTRICAO' && a.DESTINATARIO_ID === 'u_gt' && /não liberado para uso/.test(a.TITULO)), 'aviso à gestão técnica');
  assert.ok(amb.emails.some((m) => /Atendimento concluído/.test(m.subject || '') && /Atenção: ao final do atendimento o equipamento ficou não liberado para uso \(Aguardando a correção elétrica da rede do hospital\)/.test(m.body || m.htmlBody || '')), 'e-mail ao cliente com o aviso');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('valores fora da lista são recusados com o caminho; apagar o resultado volta a falta', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const r = ok(amb.app('Ast_appAbrirOS', 's_tiago', { idLocal: 'rc13-os-inv', clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', tipoCodigo: 'MANUTENCAO_PREVENTIVA',
    sintoma: 'Preventiva mensal da autoclave da CME', solicitante: 'Rui Responsável Teste', prioridade: 'P3', parada: 'NAO', em: '2026-11-12T17:57:00' }));
  const s = ok(amb.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p-inv', eventos: [ev('CHEGUEI', r.os.id, {}, '2026-11-12T17:58:00'), ev('RELATO', r.os.id, { testeResultado: 'TALVEZ' }, '2026-11-12T17:59:00'), ev('RELATO', r.os.id, { resultadoFinal: 'OK' }, '2026-11-12T17:59:10')] }));
  assert.equal(s.recusados.length, 2);
  assert.match(s.recusados[0].motivo, /resultado do teste funcional não aceito \(TALVEZ\)/);
  assert.equal(s.recusados[0].definitivo, true);
  assert.match(s.recusados[1].corrigir, /liberado, liberado com restrição ou não liberado/);
});

test('O.S. antes da regra: fecha como antes, sem resultado; o relatório não afirma o que não foi registrado e a marca das antigas não muda', () => {
  const amb = amb0();   // regra a partir de 20/11 (padrão do ambiente): a O.S. de 12/11 é anterior
  const id = atendimento(amb, false);
  const o = osDe(amb, id);
  assert.equal(o.SITUACAO, 'ENCERRADA', o.FALTAS);
  assert.equal(o.RESULTADO_FINAL || '', '');
  const h = htmlDe(amb, id), t = texto(h);
  // o checklist respondeu "liberado = Não": o topo diz isso, e diz que veio do checklist
  assert.match(t, /Resultado do atendimento: equipamento não liberado para uso\. \(Conforme a resposta do checklist\.\)/);
  assert.ok(/class="caixa critico"/.test(h), 'caixa vermelha');
  assert.doesNotMatch(t, /Teste funcional: aprovado/);
  assert.match(secao(h, 'Teste funcional'), /Não foi possível testa equipamento/, 'texto do técnico como foi escrito (nada é reescrito)');
  // marca: mesma conta de antes para a O.S. sem os campos novos
  const rel = amb.tabelas.ATEC_RELATORIOS.find((x) => x.OS_ID === id && !x.RASCUNHO);
  const conta = amb.ctx.Ast_marca_(JSON.stringify([o.NUMERO, 1, o.RESPOSTAS_JSON, o.RELATO, o.SERVICO_REALIZADO, o.ASSINATURA_ARQUIVO_ID, o.QTD_FOTOS, o.QTD_PECAS, o.ENCERRADA_EM, o.LOGISTICA_JSON, o.COLAB_ASSINATURA_ARQUIVO_ID, o.COLAB_DISPENSA_JUSTIFICATIVA]));
  assert.equal(rel.MARCA, conta);
  // sem checklist "liberado": nada é afirmado no topo e a seção diz que não foi registrado
  const semLib = JSON.parse(o.RESPOSTAS_JSON); delete semLib.liberado; delete semLib.teste_ok;
  const h2 = amb.ctx.AstR_htmlOS_(Object.assign({}, o, { RESPOSTAS_JSON: JSON.stringify(semLib) }), { marca: 'x' }), t2 = texto(h2);
  assert.doesNotMatch(t2, /Resultado do atendimento:/);
  assert.match(t2, /Situação do equipamento ao final Não registrada de forma estruturada nesta O\.S\./);
  if (process.env.AMOSTRA_DIR) fs.writeFileSync(path.join(process.env.AMOSTRA_DIR, 'AMOSTRA_RELATORIO_OS_ANTIGA.html'), h);
});

test('relatório novo: resultado no topo, medições, teste com resultado, rastreabilidade legível, checklist e fotos limpos', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const id = atendimento(amb, true);
  const o = osDe(amb, id);
  assert.equal(o.SITUACAO, 'ENCERRADA', o.FALTAS);
  const h = htmlDe(amb, id), t = texto(h);
  if (process.env.AMOSTRA_DIR) fs.writeFileSync(path.join(process.env.AMOSTRA_DIR, 'AMOSTRA_RELATORIO_OS.html'), h);
  // topo e ficha
  assert.match(t, /Resultado do atendimento: equipamento não liberado para uso\. Pendência para a liberação: Aguardando a correção da alimentação elétrica[^.]*\. Teste funcional: não realizado\./);
  assert.match(t, /Equipamento ao final Não liberado para uso/);
  // atendimento: aberta em campo não finge agendamento; campo vazio não aparece
  assert.match(t, /Agendamento Aberta em campo pelo técnico, sem agendamento prévio/);
  assert.doesNotMatch(t, /Agendado para/);
  assert.doesNotMatch(t, /Observação da localização/);
  // serviço: medições em tabela (linha vazia descartada), teste com resultado, situação ao final
  const sv = secao(h, 'Medições realizadas');
  assert.match(sv, /Tensão entre fases L1-L2, entrada do quadro 221 V/);
  assert.match(sv, /Corrente Fase L1, aquecimento ligado 18,4 A/);
  assert.equal(JSON.parse(o.MEDICOES_JSON).length, 5);
  assert.match(t, /Teste funcional Resultado: não realizado\. Ciclo de teste não realizado: houve nova queda de energia/);
  assert.match(t, /Situação do equipamento ao final Não liberado para uso\. Aguardando a correção/);
  assert.match(t, /Observações do técnico Durante o atendimento/);
  // checklist: sem linhas de assinatura, foto com referência numerada, texto longo fora da tabela
  const ck = secao(h, 'Checklist');
  assert.doesNotMatch(ck.slice(0, 600), /Assinatura/);
  assert.match(ck, /Foto do defeito ou da peça com problema 1 foto \(Foto 13\)/);
  assert.match(ck, /Foto depois do conserto 2 fotos \(Fotos 14 e 15\)/);
  assert.match(ck, /Defeito constatado Texto completo logo abaixo da tabela/);
  assert.ok(/Defeito constatado<\/h3><div class="analise"><p>Histórico e serviço executado<\/p><p>Em 10\/11\/2026/.test(h), 'texto longo fora da tabela, com o título em parágrafo próprio');
  // peças: unidade normalizada só na exibição (o banco continua "un.")
  assert.match(t, /Resistência 7kv — 3 un Aplicada/);
  assert.equal(amb.tabelas.ATEC_PECAS.find((p) => p.OS_ID === id).UNIDADE, 'un.');
  // fotos: as 16 no PDF, numeradas, com a legenda do técnico ou a pergunta; sem "Mais N fotos guardadas no SGO+"
  assert.equal((h.match(/<div class="foto">/g) || []).length, 16);
  assert.match(t, /Foto 5 — Medição de tensão entre fases na entrada do quadro · 12\/11\/2026 18:01/);
  assert.match(t, /Foto 13 — Foto do defeito ou da peça com problema · 12\/11\/2026 18:33/);
  assert.match(t, /Foto 1 — 12\/11\/2026 18:00/);
  assert.doesNotMatch(t, /Foto \d+ — ·|guardadas no SGO\+/);
  // rastreabilidade: um marco por fato, nada de arquivo, id interno ou dois-pontos dobrado; sem coluna "Por"
  const rs = secao(h, 'Rastreabilidade do atendimento');
  assert.doesNotMatch(t, /Linha do tempo/);
  assert.match(rs, /Atendimento de 12\/11\/2026\. Responsável pelo atendimento: Tiago Tecnico Teste\./);
  for (const r of [/17:57 Chamado CH-2026-\d+ e O\.S\. OS-2026-\d+ abertos em campo, sem agendamento prévio/, /17:57 Saída para o atendimento/, /17:57 Chegada ao local/, /17:59 Assinatura do técnico responsável: Tiago Tecnico Teste/,
    /18:00 16 fotos registradas entre 18:00 e 18:41/, /18:04 Peça aplicada: 3 un de Resistência 7kv/, /18:40 Última atualização do checklist e do relato técnico/, /18:54 Assinatura do cliente: Mariana Sousa Teste/,
    /18:54 Execução concluída/, /O\.S\. encerrada; equipamento não liberado para uso/]) assert.match(rs, r);
  assert.doesNotMatch(rs, /\.png|\.jpg|pergunta q|::|Foto recebida|Técnico saiu|Saiu para o atendimento|Registro de abertura|aberta em campo ·|Relato atualizado/);
  assert.equal((rs.match(/Chegada ao local/g) || []).length, 1, 'uma chegada só');
  assert.equal((rs.match(/Execução concluída/g) || []).length, 1, 'uma conclusão só');
  assert.doesNotMatch(h, /<th[^>]*>Por<\/th>/);
  assert.match(t, /Reincidência|Chamado CH-/);
  // a trilha completa continua no banco (nenhum evento apagado)
  assert.ok(amb.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE_ID === id && e.TIPO === 'FOTO').length === 16);
  // marca da O.S. nova inclui o resultado (qualquer mudança nele muda a marca)
  const rel = amb.tabelas.ATEC_RELATORIOS.find((x) => x.OS_ID === id && !x.RASCUNHO);
  const semRes = amb.ctx.Ast_marca_(JSON.stringify([o.NUMERO, 1, o.RESPOSTAS_JSON, o.RELATO, o.SERVICO_REALIZADO, o.ASSINATURA_ARQUIVO_ID, o.QTD_FOTOS, o.QTD_PECAS, o.ENCERRADA_EM, o.LOGISTICA_JSON, o.COLAB_ASSINATURA_ARQUIVO_ID, o.COLAB_DISPENSA_JUSTIFICATIVA]));
  assert.notEqual(rel.MARCA, semRes);
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('aplicativo: o Meu dia diz o que o tipo pede (resultado e mínimos; causa só na corretiva) e devolve o que já subiu', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', {}));
  const t = (c) => md.tipos.find((x) => x.codigo === c);
  assert.equal(t('MANUTENCAO_CORRETIVA').exige.resultado, true);
  assert.deepEqual(JSON.parse(JSON.stringify(t('MANUTENCAO_CORRETIVA').exige.qualidade)), { condicaoEncontrada: 4, causa: 3, servicoRealizado: 5, testeMotivo: 5, resultadoDetalhe: 4 });
  assert.equal(t('MANUTENCAO_PREVENTIVA').exige.qualidade.causa, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(t('MANUTENCAO_CORRETIVA').exige.relatoCampos)), ['servicoRealizado', 'condicaoEncontrada', 'testeFuncional'], 'contrato antigo igual');
  assert.equal(t('RETIRADA').exige.resultado, false);
  assert.equal(t('RETIRADA').exige.qualidade, null);
  const id = atendimento(amb, true);
  const os = ok(amb.app('Ast_appOS', 's_tiago', { osId: id })).os;
  assert.equal(os.registrado.relato.testeResultado, 'NAO_REALIZADO');
  assert.equal(os.registrado.relato.resultadoFinal, 'NAO_LIBERADO');
  assert.equal(os.registrado.relato.medicoes.length, 5);
  // ficha da tela do computador
  const pub = ok(amb.api('s_gil', 'os', { id })).os;
  assert.equal(pub.resultadoFinal, 'NAO_LIBERADO'); assert.equal(pub.comResultado, true);
  assert.equal(pub.opcoesResultado.final.LIBERADO_RESTRICAO, 'Liberado para uso com restrição');
});

test('"Abrir para corrigir": a gestão corrige a situação do equipamento (com motivo); valor fora da lista é recusado', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const id = atendimento(amb, true);
  amb.ctx.AstR_emitirRelatorioOS_({ id: 'u_gt', nome: 'GIL GESTOR TECNICO TESTE' }, id, {});
  const ruim = amb.api('s_gil', 'corrigirRelatorio', { osId: id, motivo: 'Correção depois do retorno técnico', relato: { resultadoFinal: 'TALVEZ' } });
  assert.equal(ruim.ok, false); assert.match(ruim.message, /valor não aceito para a situação do equipamento ao final \(TALVEZ\)/);
  const r = ok(amb.api('s_gil', 'corrigirRelatorio', { osId: id, motivo: 'Retorno técnico fez o teste e liberou o equipamento', relato: { resultadoFinal: 'LIBERADO', testeResultado: 'APROVADO', resultadoDetalhe: '' } }));
  assert.equal(r.revisao, 1);
  assert.equal(osDe(amb, id).RESULTADO_FINAL, 'LIBERADO');
  assert.match(amb.tabelas.ATEC_EVENTOS.filter((e) => e.TIPO === 'CORRECAO').pop().TEXTO, /resultado final, teste resultado|teste resultado, resultado final|resultado final/);
});

test('"Revisar o texto" (IA): sem a chave diz que não está ligada; com a chave devolve a revisão e descarta a que inventou número', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const campos = { condicaoEncontrada: 'autoclave parada nao esquenta', servicoRealizado: 'troquei as 3 resistencia 7kv', causa: 'resistencia queimada' };
  let r = ok(amb.app('Ast_appRevisarTexto', 's_tiago', { campos }));
  assert.equal(r.semIa, true); assert.match(r.message, /não está ligada neste servidor \(falta a chave da IA/);
  assert.equal(amb.app('Ast_appRevisarTexto', 's_tiago', { campos: { causa: 'x' } }).codigo, 'ENTRADA');
  amb.props.GEMINI_API_KEY = 'chave-de-teste';
  const pedidos = [];
  amb.ctx.UrlFetchApp.fetch = (url, op) => {
    pedidos.push({ url, corpo: JSON.parse(op.payload) });
    const resp = { condicaoEncontrada: 'Autoclave parada, sem aquecimento.', servicoRealizado: 'Substituídas as 3 resistências de 7 kV.', causa: 'Resistência queimada, com 220 V medidos na entrada.' };
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(resp) }] } }] }) };
  };
  r = ok(amb.app('Ast_appRevisarTexto', 's_tiago', { campos }));
  assert.equal(r.semIa, false);
  assert.equal(r.revisado.condicaoEncontrada, 'Autoclave parada, sem aquecimento.');
  assert.equal(r.revisado.servicoRealizado, 'Substituídas as 3 resistências de 7 kV.');
  assert.equal(r.revisado.causa, undefined, 'número novo (220): descartado');
  assert.match(r.descartados[0].motivo, /número que não estava no seu texto \(220\)/);
  assert.match(pedidos[0].corpo.contents[0].parts[0].text, /NÃO acrescente fato, número/);
  assert.match(pedidos[0].url, /key=chave-de-teste/);
  // IA fora do ar: o relato segue sem a revisão
  amb.ctx.UrlFetchApp.fetch = () => ({ getResponseCode: () => 503, getContentText: () => '{}' });
  r = ok(amb.app('Ast_appRevisarTexto', 's_tiago', { campos }));
  assert.equal(r.semIa, true); assert.match(r.message, /a IA não respondeu \(HTTP 503\)/);
});

test('termo da logística: conferência sem linhas de assinatura e rastreabilidade no lugar da linha do tempo', () => {
  const amb = amb0({ resultadoDesde: '2026-11-01T00:00:00' });
  const r = ok(amb.app('Ast_appAbrirOS', 's_tiago', { idLocal: 'rc13-os-log', clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', tipoCodigo: 'RETIRADA',
    sintoma: 'Retirar a lavadora para análise em bancada', solicitante: 'Rui Responsável Teste', prioridade: 'P3', parada: 'NAO', em: '2026-11-12T17:57:00' }));
  const id = r.os.id;
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'rc13-log-foto-1', nome: 'retirada.png', base64: png(CORES[0]), perguntaId: 'foto', em: '2026-11-12T18:00:00' }));
  sync(amb, [ev('CHEGUEI', id, {}, '2026-11-12T17:58:00'), ev('RESPOSTA', id, { perguntaId: 'conferido', valor: 'SIM' }, '2026-11-12T17:59:00'), ev('RESPOSTA', id, { perguntaId: 'estado', valor: 'Bom' }, '2026-11-12T17:59:00'),
    ev('RELATO', id, { logistica: { itens: [{ descricao: 'Lavadora L2', quantidade: 1, identificacao: 'Série S-200', estado: 'BOM' }], contraparte: { nome: 'Rui Responsável Teste' }, motivo: 'Análise em bancada', destino: 'ANALISE' } }, '2026-11-12T18:01:00'),
    ev('ASSINATURA', id, { papel: 'COLABORADOR', nome: 'Tiago Tecnico Teste', imagem: ASSINATURA, versaoApp: 't' }, '2026-11-12T18:02:00'),
    ev('ASSINATURA', id, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: 't' }, '2026-11-12T18:03:00'), ev('CONCLUI', id, {}, '2026-11-12T18:04:00')]);
  assert.equal(osDe(amb, id).SITUACAO, 'ENCERRADA', osDe(amb, id).FALTAS);
  const h = htmlDe(amb, id), t = texto(h);
  assert.doesNotMatch(t, /Linha do tempo|Resultado do atendimento:/);
  const rs = secao(h, 'Rastreabilidade do atendimento');
  assert.match(rs, /Chegada ao local/); assert.doesNotMatch(rs, /início do serviço/i);
  assert.match(rs, /Última atualização do termo e da conferência/);
  assert.match(t, /Foto do que foi retirado, entregue ou enviado 1 foto \(Foto 1\)/);
});
