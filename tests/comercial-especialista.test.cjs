// Comercial (01/11/2026): a especialista de verdade. Código real num contexto isolado (tests/_comercial_ambiente.cjs), só dados de
// teste. Cobre: o verificador anti-genérico (frase vazia, passo sem data, B igual ao A, número que não confere, repetição de plano que
// falhou), a refação da IA até 2 vezes e a alternativa por regras com A, B e C concretos, a memória dos planos (merge, troca, gatilho
// vencido), a visibilidade do vendedor no prompt, a próxima ação com um toque e a cota de IA por pessoa e hora.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const opo = (amb, id) => amb.tabelas.COM_OPORTUNIDADES.find((o) => o.ID === id);
const SEG = '2026-10-26T09:30:00-03:00'; // segunda-feira
const PROX = { acao: 'Ligar para entender o escopo', data: '2026-10-28', hora: '10:00', tipo: 'LIGACAO' };

/** Oportunidade parada sem resposta: 3 ligações sem resposta e a consulta numa segunda-feira. */
function paradaSemResposta(amb) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  amb.mudar('2026-10-20T09:00:00-03:00');
  ['2026-10-21', '2026-10-22', '2026-10-23'].forEach((dia) => ok(amb.api('s_vera', 'registrarContato', { id: oportunidade.id, tipo: 'LIGACAO', respondeu: false, resumo: 'Liguei para a Ana na CME e ninguém atendeu', proxima: { acao: 'Ligar de novo para a Ana', data: dia, hora: '10:00', tipo: 'LIGACAO' } })));
  amb.mudar(SEG);
  return oportunidade;
}

/** Resposta boa da IA (datas a partir de 26/10/2026, abordagens diferentes, só números dos fatos). */
function respostaBoa(over) {
  const r = {
    diagnostico: 'A OPO-2026-0001 tem 3 tentativas sem resposta, todas por ligação, e nenhuma resposta registrada. A etapa pede dor, decisor e potencial validados, e nada disso está registrado.',
    planos: [
      { letra: 'A', abordagem: 'CANAL', titulo: 'Mensagem curta para a Ana pelo WhatsApp', objetivo: 'Conseguir a primeira resposta da Ana com a data de uma conversa marcada.',
        passos: [{ quando: '26/10/2026', canal: 'WHATSAPP', acao: 'Mandar à Ana a mensagem abaixo com a pergunta fechada sobre a semana' }, { quando: '27/10/2026', canal: 'LIGACAO', acao: 'Ligar à Ana no início da manhã citando a mensagem enviada' }, { quando: '29/10/2026', canal: 'EMAIL', acao: 'E-mail à Ana com o risco de deixar a qualificação da autoclave pendente' }],
        mensagem: { canal: 'WHATSAPP', texto: 'Olá, Ana. Aqui é Vera, da Metrolabs. Podemos falar sobre a qualificação da autoclave nesta semana ou na próxima?' },
        objecoes: [{ objecao: 'Manda por e-mail', resposta: 'Mando, sim. Antes, me diga qual equipamento preocupa mais, para eu personalizar.' }], sucesso: 'A Ana responde e a conversa fica marcada com data.' },
      { letra: 'B', abordagem: 'DECISOR', titulo: 'Chegar à engenharia clínica', objetivo: 'Levar a qualificação a quem aprova a compra e combinar a data de decisão.', gatilho: { texto: 'Sem resposta da Ana até 03/11/2026, 2 dias úteis depois do passo 3.', ate: '03/11/2026' },
        passos: [{ quando: '04/11/2026', canal: 'LIGACAO', acao: 'Ligar para a recepção e pedir o responsável pela engenharia clínica' }, { quando: '05/11/2026', canal: 'EMAIL', acao: 'E-mail ao responsável técnico com o risco operacional em três linhas' }],
        mensagem: { canal: 'EMAIL', assunto: 'Metrolabs: qualificação da autoclave', texto: 'Prezado(a), gostaria de uma conversa curta sobre a qualificação da autoclave da unidade.' }, sucesso: 'Reunião marcada com quem aprova.' },
      { letra: 'C', abordagem: 'VISITA_TECNICA', titulo: 'Visita técnica sem compromisso', objetivo: 'Ver o equipamento e os documentos de perto para trazer fatos novos.', gatilho: { texto: 'O decisor não responde até 10/11/2026.', ate: '10/11/2026' },
        passos: [{ quando: '11/11/2026', canal: 'LIGACAO', acao: 'Oferecer à CME uma visita técnica curta para ver o equipamento' }, { quando: '13/11/2026', canal: 'VISITA', acao: 'Visitar a unidade e levantar o estado e os documentos que vencem' }],
        mensagem: { canal: 'WHATSAPP', texto: 'Olá. Posso passar na unidade nesta semana para ver o equipamento com a equipe?' }, sucesso: 'Visita feita e o resumo enviado.' }
    ],
    proximaAcao: { acao: 'Mandar à Ana a mensagem pelo WhatsApp', data: '26/10/2026', hora: '11:00', canal: 'WHATSAPP' },
    perguntas: ['Quem aprova a compra do serviço?']
  };
  return Object.assign(r, over || {});
}

// ------------------------------------------------------------------ verificador
test('verificador: recusa frase vazia, passo sem data, B igual ao A, número que não confere e fabricante; aceita a resposta concreta', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  const eu = amb.ctx.Com_eu_('s_vera');
  const fx = amb.ctx.ComEsp_fatos_(eu, amb.ctx.ComOpo_obter_(eu, o.id, 'teste'));
  const ctx = { fatos: fx.fatos, x: fx.x, mem: { falhos: [] }, fabricantes: amb.ctx.ComEsp_fabricantes_() };
  const v = (j) => amb.ctx.ComEsp_verificar_(j, ctx);
  const boa = v(respostaBoa());
  assert.equal(boa.ok, true, boa.problemas.join(' | '));
  assert.equal(boa.saida.planos.length, 3);
  assert.equal(boa.saida.planos[1].gatilho.ateIso, '2026-11-03');
  assert.equal(boa.saida.planos[0].saida.ateIso, '2026-11-03', 'o prazo do plano A é o gatilho do B');
  assert.equal(boa.saida.proximaAcao.dataIso, '2026-10-26');
  // frase vazia
  const r1 = respostaBoa(); r1.planos[0].passos[1].acao = 'Manter contato com a Ana e agregar valor';
  assert.ok(v(r1).problemas.some((p) => /frase vazia \("Manter contato"/i.test(p) || /frase vazia \("manter contato/i.test(p)));
  const r1b = respostaBoa(); r1b.planos[0].passos[2].acao = 'Fazer follow-up com a Ana pelo e-mail';
  assert.ok(v(r1b).problemas.some((p) => /follow-up/i.test(p)));
  const r1c = respostaBoa(); r1c.planos[1].objetivo = 'Entender a necessidade do cliente.';
  assert.ok(v(r1c).problemas.some((p) => /entender a necessidade/i.test(p)));
  // passo sem data, data no passado e fim de semana
  const r2 = respostaBoa(); delete r2.planos[0].passos[0].quando; r2.planos[0].passos[1].quando = '20/10/2026'; r2.planos[0].passos[2].quando = '31/10/2026';
  const p2 = v(r2).problemas.join(' | ');
  assert.match(p2, /passo 1: sem data/); assert.match(p2, /passo 2: data no passado/); assert.match(p2, /31\/10\/2026 não é dia útil/);
  // B igual ao A (mesma abordagem) e B variação do A (mesmos passos com outra abordagem)
  const r3 = respostaBoa(); r3.planos[1].abordagem = 'CANAL';
  assert.ok(v(r3).problemas.some((p) => /plano B: mesma abordagem do plano A/.test(p)));
  const r3b = respostaBoa(); r3b.planos[2] = Object.assign({}, r3b.planos[0], { letra: 'C', abordagem: 'URGENCIA', gatilho: { texto: 'Sem resposta até 10/11/2026.', ate: '10/11/2026' } });
  assert.ok(v(r3b).problemas.some((p) => /plano C: é variação do plano A/.test(p)));
  // número que não confere com o sistema
  const r4 = respostaBoa(); r4.diagnostico = 'A OPO-2026-0001 vale R$ 9.870,00 e tem 3 tentativas sem resposta. Falta o decisor.';
  assert.ok(v(r4).problemas.some((p) => /diagnóstico: número que não está nos resultados: 9\.870,00/.test(p)));
  // diagnóstico sem fato, gatilho vago, plano faltando, abordagem inventada
  const r5 = respostaBoa(); r5.diagnostico = 'A oportunidade precisa de atenção. O cliente está distante.'; r5.planos[1].gatilho = { texto: 'Se não funcionar.', ate: '' };
  const p5 = v(r5).problemas.join(' | ');
  assert.match(p5, /diagnóstico: sem fato concreto/); assert.match(p5, /gatilho: condição vaga/); assert.match(p5, /gatilho: sem a data limite/);
  const r6 = respostaBoa(); r6.planos = r6.planos.slice(0, 2); r6.planos[1].abordagem = 'MAGICA';
  const p6 = v(r6).problemas.join(' | ');
  assert.match(p6, /exatamente 3/); assert.match(p6, /abordagem fora da lista \(MAGICA\)/);
  // fabricante do cadastro de equipamentos
  const r7 = respostaBoa(); r7.planos[2].objetivo = 'Mostrar que conhecemos a linha do Fabricante X por dentro.';
  assert.ok(v(r7).problemas.some((p) => /cita fabricante/.test(p)));
});

test('IA genérica é refeita até 2 vezes com os problemas apontados; depois valem os planos pelas regras (A, B e C concretos)', () => {
  const generica = JSON.stringify({ diagnostico: 'Cliente importante.', planos: [{ letra: 'A', abordagem: 'CANAL', titulo: 'Manter contato', objetivo: 'Agregar valor', passos: [{ acao: 'Fazer follow-up' }] }], proximaAcao: { acao: 'Manter contato' } });
  const amb = ambiente({ ia: (p) => (/ESPECIALISTA em vendas B2B/.test(p) ? generica : '{}') });
  const o = paradaSemResposta(amb);
  const atvAntes = amb.tabelas.ATV_ATIVIDADES.length;
  const antes = JSON.stringify(opo(amb, o.id));
  const r = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  const chamadas = amb.iaPrompts.filter((p) => /ESPECIALISTA em vendas B2B/.test(p));
  assert.equal(chamadas.length, 3, '1 chamada + 2 refações');
  assert.match(chamadas[1], /SUA RESPOSTA ANTERIOR FOI RECUSADA[\s\S]*frase vazia/);
  assert.equal(r.origem, 'REGRAS');
  assert.equal(r.tentativasIA, 3);
  assert.match(r.aviso, /Planos montados pelas regras da metodologia/);
  const s = r.sugestao;
  assert.equal(s.planos.map((p) => p.letra).join(''), 'ABC');
  assert.equal(new Set(s.planos.map((p) => p.abordagem)).size, 3, 'três abordagens diferentes');
  assert.equal(s.planos[0].abordagem, 'CANAL');
  assert.ok(s.planos[0].passos.length >= 3 && s.planos[0].passos.every((p) => /^\d{2}\/\d{2}\/2026$/.test(p.quando)));
  assert.ok(s.planos.slice(1).every((p) => p.gatilho && /\d{2}\/\d{2}\/2026/.test(p.gatilho.texto)));
  assert.match(s.diagnostico, /3 tentativas sem resposta/);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.length, atvAntes, 'nenhuma atividade criada sem o toque');
  assert.equal(JSON.stringify(opo(amb, o.id)), antes, 'oportunidade intacta');
  assert.equal(amb.emails.length + amb.whats.length, 0, 'nada enviado');
  const reg = amb.tabelas.COM_IA_SUGESTOES.find((x) => x.ID === r.sugestaoId);
  assert.equal(reg.TIPO, 'ESPECIALISTA');
  assert.match(reg.VERIFICACAO, /Recusas/);
});

test('IA boa passa inteira; a resposta só com o plano A ruim é recusada e refeita', () => {
  let n = 0;
  const amb = ambiente({ ia: (p) => { if (!/ESPECIALISTA em vendas B2B/.test(p)) return '{}'; n++; if (n === 1) { const r = respostaBoa(); r.planos[0].passos[0].acao = 'Agregar valor'; return JSON.stringify(r); } return JSON.stringify(respostaBoa()); } });
  const o = paradaSemResposta(amb);
  const r = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  assert.equal(r.origem, 'IA');
  assert.equal(r.tentativasIA, 2);
  assert.equal(r.aviso, '');
  assert.equal(r.sugestao.planos[1].abordagem, 'DECISOR');
  assert.equal(r.sugestao.proximaAcao.hora, '11:00');
});

// ------------------------------------------------------------------ alternativa por regras
test('regras: sem resposta e desconto acima da alçada com concorrente mais barato dão A, B e C diferentes, datados e que passam no próprio verificador', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  const eu = amb.ctx.Com_eu_('s_vera');
  const conferir = (oid) => {
    const fx = amb.ctx.ComEsp_fatos_(eu, amb.ctx.ComOpo_obter_(eu, oid, 'teste'));
    const mem = amb.ctx.ComEsp_memoria_(oid);
    const s = amb.ctx.ComEsp_planosRegras_(fx.x, mem);
    const v = amb.ctx.ComEsp_verificar_(JSON.parse(JSON.stringify(s)), { fatos: fx.fatos, x: fx.x, mem, fabricantes: [] });
    assert.equal(v.ok, true, 'as regras também não são genéricas: ' + v.problemas.join(' | '));
    return { s, fx };
  };
  const a = conferir(o.id);
  assert.equal(a.fx.x.cenario, 'SEM_RESPOSTA');
  assert.equal(a.s.planos.map((p) => p.abordagem).join(','), ['CANAL', 'DECISOR', 'USUARIO'].join(','));
  assert.match(a.s.planos[0].titulo, /WhatsApp/);
  // desconto acima do limite (15%) com o concorrente mais barato citado no contato
  const o2 = oportunidadeDeTeste(amb, 's_vera', { titulo: 'Calibração de 4 seladoras', etapa: 'ENG_4', proxima: PROX }).oportunidade;
  ok(amb.api('s_vera', 'registrarContato', { id: o2.id, tipo: 'REUNIAO', respondeu: true, resumo: 'A Ana pediu 25% de desconto: o concorrente ofereceu R$ 3.900,00 pelo mesmo serviço.', proxima: { acao: 'Responder o pedido de desconto', data: '2026-10-27', hora: '10:00', tipo: 'LIGACAO' } }));
  const b = conferir(o2.id);
  assert.equal(b.fx.x.cenario, 'DESCONTO');
  assert.equal(b.fx.fatos.pedidoDeDesconto.acimaDoLimiteDoVendedor, true);
  assert.equal(b.s.planos.map((p) => p.abordagem).join(','), ['VALOR_TECNICO', 'ESCOPO', 'PACOTE_ANUAL'].join(','));
  assert.match(b.s.diagnostico, /pediu 25% de desconto .*acima do limite de 15%.*R\$ 3\.900,00/);
  assert.match(b.s.planos[1].gatilho.texto, /acima do limite de 15%/);
  assert.ok(b.s.planos[0].objecoes.some((x) => /mais barato/.test(x.objecao)));
  assert.ok(!JSON.stringify(b.s).match(/ofere[cç]a\s+(um\s+)?desconto/i), 'regras nunca oferecem desconto');
});

// ------------------------------------------------------------------ memória de planos
test('memória: usar, trocar (com motivo), não deu certo e a próxima consulta proibida de repetir; gravação com merge', () => {
  let resposta = JSON.stringify(respostaBoa());
  const amb = ambiente({ ia: (p) => (/ESPECIALISTA em vendas B2B/.test(p) ? resposta : '{}') });
  const o = paradaSemResposta(amb);
  // schema: aba própria criada de forma idempotente, colunas sem repetição
  const cols = amb.ctx.COM_COLUNAS.COM_PLANOS_ESPECIALISTA;
  assert.equal(new Set(cols).size, cols.length);
  assert.ok(['OPORTUNIDADE_ID', 'LETRA', 'ABORDAGEM', 'SITUACAO', 'MOTIVO', 'GATILHO_ATE', 'PLANO_JSON'].every((c) => cols.includes(c)));
  assert.equal(amb.ctx.COM_ABAS.PLANOS, 'COM_PLANOS_ESPECIALISTA');
  const r1 = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  assert.equal(r1.origem, 'IA');
  ok(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r1.sugestaoId, letra: 'A' }));
  const linhaA = amb.tabelas.COM_PLANOS_ESPECIALISTA[0];
  assert.equal(linhaA.SITUACAO, 'EM_USO'); assert.equal(linhaA.ABORDAGEM, 'CANAL'); assert.equal(linhaA.GATILHO_ATE, '2026-11-03');
  // trocar para B sem motivo: barrado com o que fazer
  assert.match(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r1.sugestaoId, letra: 'B' }).message, /diga em poucas palavras por que o plano A não andou/);
  ok(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r1.sugestaoId, letra: 'B', motivo: 'Três mensagens sem resposta no WhatsApp' }));
  assert.equal(linhaA.SITUACAO, 'TROCADO');
  assert.match(linhaA.MOTIVO, /troquei para o plano B\. Três mensagens sem resposta/);
  assert.equal(linhaA.TITULO, 'Mensagem curta para a Ana pelo WhatsApp', 'merge: o título continua');
  const linhaB = amb.tabelas.COM_PLANOS_ESPECIALISTA[1];
  assert.equal(linhaB.SITUACAO, 'EM_USO');
  // não deu certo sem motivo: barrado; com motivo: registrado
  assert.match(amb.api('s_vera', 'especialistaDecidirPlano', { planoId: linhaB.ID, resultado: 'NAO_DEU_CERTO' }).message, /por que não deu certo/);
  const dec = ok(amb.api('s_vera', 'especialistaDecidirPlano', { planoId: linhaB.ID, resultado: 'NAO_DEU_CERTO', motivo: 'A recepção não passa a ligação para a engenharia clínica' }));
  assert.match(dec.message, /não repete este/);
  assert.equal(linhaB.SITUACAO, 'NAO_DEU_CERTO');
  assert.equal(dec.memoria.falhos.length, 2);
  // merge direto: campo vazio não apaga, motivo se acumula
  amb.ctx.ComEsp_gravarPlano_(linhaB.ID, { TITULO: '', RESUMO: null, MOTIVO: '01/11/2026: a gestão confirmou' });
  assert.equal(linhaB.TITULO, 'Chegar à engenharia clínica');
  assert.match(linhaB.MOTIVO, /engenharia clínica\n01\/11\/2026: a gestão confirmou/);
  // a próxima consulta recebe os falhos e é proibida de repetir: a IA insiste no CANAL e no DECISOR -> recusada -> regras sem eles
  const r2 = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  const ult = amb.iaPrompts.filter((p) => /ESPECIALISTA em vendas B2B/.test(p)).pop();
  assert.match(ult, /PLANOS QUE FALHARAM[^\n]*CANAL[^\n]*Três mensagens sem resposta/);
  assert.match(ult, /SUA RESPOSTA ANTERIOR FOI RECUSADA[\s\S]*repete a abordagem CANAL/);
  assert.equal(r2.origem, 'REGRAS');
  assert.ok(r2.sugestao.planos.every((p) => p.abordagem !== 'CANAL' && p.abordagem !== 'DECISOR'), 'nada do que falhou volta');
  assert.match(r2.sugestao.diagnostico, /não repete/);
  // com uma resposta nova que não repete, a IA passa
  const nova = respostaBoa();
  nova.planos[0] = Object.assign({}, nova.planos[0], { abordagem: 'USUARIO', titulo: 'Ouvir a equipe da CME', objetivo: 'Fazer quem usa a autoclave contar o problema ao decisor.', passos: [{ quando: '26/10/2026', canal: 'LIGACAO', acao: 'Ligar para a coordenação da CME e perguntar o que acontece numa parada' }, { quando: '28/10/2026', canal: 'VISITA', acao: 'Visita curta à CME para ver a autoclave com a equipe' }, { quando: '30/10/2026', canal: 'EMAIL', acao: 'Mandar o relato da equipe e pedir a reunião com quem aprova' }] });
  nova.planos[1] = Object.assign({}, nova.planos[1], { abordagem: 'CONFORMIDADE', titulo: 'Mostrar o risco na fiscalização', objetivo: 'Mostrar os documentos de qualificação que a vigilância sanitária cobra.', passos: [{ quando: '04/11/2026', canal: 'EMAIL', acao: 'Enviar a lista dos documentos de qualificação que a fiscalização pede' }, { quando: '06/11/2026', canal: 'LIGACAO', acao: 'Conferir com a qualidade o que vence primeiro' }] });
  resposta = JSON.stringify(nova);
  const r3 = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  assert.equal(r3.origem, 'IA');
  assert.equal(r3.sugestao.planos.map((p) => p.abordagem).join(','), 'USUARIO,CONFORMIDADE,VISITA_TECNICA');
  // a mesma abordagem do plano em uso = atualização, sem motivo e sem contar como falha
  ok(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r3.sugestaoId, letra: 'A' }));
  ok(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r3.sugestaoId, letra: 'A' }));
  assert.equal(amb.tabelas.COM_PLANOS_ESPECIALISTA.filter((x) => x.SITUACAO === 'EM_USO').length, 1);
  const r4 = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  ok(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r4.sugestaoId, letra: 'A' }));
  assert.equal(amb.tabelas.COM_PLANOS_ESPECIALISTA.filter((x) => x.SITUACAO === 'ATUALIZADO').length, 1);
  assert.equal(ok(amb.api('s_vera', 'especialistaPlanos', { id: o.id })).memoria.falhos.length, 2, 'atualizar não é falhar');
  // outro vendedor não mexe
  assert.equal(amb.api('s_vito', 'especialistaUsarPlano', { sugestaoId: r4.sugestaoId, letra: 'B', motivo: 'tentando mexer' }).ok, false);
  assert.equal(amb.api('s_vito', 'especialistaPlanos', { id: o.id }).ok, false);
});

test('gatilho vencido sem resposta do cliente: a ficha e a especialista sugerem a troca; resposta do cliente desarma', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  const r = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  ok(amb.api('s_vera', 'especialistaUsarPlano', { sugestaoId: r.sugestaoId, letra: 'A' }));
  assert.equal(ok(amb.api('s_vera', 'oportunidade', { id: o.id })).planoEspecialista.gatilhoVencido, false);
  amb.mudar('2026-11-05T09:00:00-03:00'); // gatilho do plano A: 03/11/2026
  const f = ok(amb.api('s_vera', 'oportunidade', { id: o.id })).planoEspecialista;
  assert.equal(f.gatilhoVencido, true);
  assert.match(f.sugestaoTroca, /venceu em 03\/11\/2026 sem resposta do cliente: troque de plano/);
  const r2 = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  assert.equal(r2.memoria.gatilhoVencido, true);
  assert.ok(r2.sugestao.planos.every((p) => p.abordagem !== 'CANAL'), 'plano vencido conta como falho');
  // o cliente respondeu depois que o plano começou: não venceu
  ok(amb.api('s_vera', 'registrarContato', { id: o.id, tipo: 'WHATSAPP', respondeu: true, resumo: 'A Ana respondeu e pediu para falar na semana que vem', proxima: { acao: 'Ligar para a Ana', data: '2026-11-10', hora: '10:00', tipo: 'LIGACAO' } }));
  assert.equal(ok(amb.api('s_vera', 'oportunidade', { id: o.id })).planoEspecialista.gatilhoVencido, false);
});

// ------------------------------------------------------------------ visibilidade
test('visibilidade: o prompt do vendedor não traz oportunidade nem preço de outro vendedor, custo, margem, preço de compra ou a regra do preço; o da gestão traz', () => {
  const amb = ambiente({ ia: () => '{}' });
  const o = paradaSemResposta(amb);
  // outro vendedor perdeu uma oportunidade do mesmo cliente para um concorrente
  const ov = oportunidadeDeTeste(amb, 's_vito', { titulo: 'Manutenção da lavadora LV-77', valor: '7.777,00', proxima: PROX }).oportunidade;
  ok(amb.api('s_vito', 'perder', { id: ov.id, motivo: 'Concorrente escolhido', aprendizado: 'Perdemos no preço para um concorrente local', concorrente: 'Empresa Concorrente Teste', valorVencedor: '6.543,21' }));
  // proposta da vendedora com custo e margem gravados
  const pid = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: o.id })).proposta.id;
  const p = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === pid);
  Object.assign(p, { ITENS_JSON: JSON.stringify([{ ordem: 1, tipo: 'SERVICO', descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: 4500, custoUnitario: 2345.67 }]), SUBTOTAL: 4500, TOTAL: 4500, CUSTO_TOTAL: 2345.67, MARGEM_PCT: 31.4 });
  // preço de compra no banco (só a gestão vê)
  amb.tabelas.COM_PRECOS = [{ ID: 'bp1', CHAVE: 'X1', ITEM_CHAVE: amb.ctx.ComBP_itemChave_('', 'Qualificação térmica de autoclave'), DESCRICAO: 'Qualificação térmica de autoclave', VALOR_UNITARIO: 1234.56, ORIGEM: 'COTACAO_FORNECEDOR', RESULTADO: 'REFERENCIA', DATA: '2026-09-01', FORNECEDOR: 'Fornecedor Teste' }];
  amb.iaPrompts.length = 0;
  ok(amb.api('s_vera', 'especialista', { id: o.id }));
  const pv = amb.iaPrompts.find((x) => /ESPECIALISTA em vendas B2B/.test(x));
  assert.ok(pv, 'o prompt foi montado');
  ['OPO-2026-0002', 'Manutenção da lavadora', '7.777,00', '6.543,21', 'Empresa Concorrente Teste', 'VITO', '2.345,67', 'custoTotal', 'margemPct', '31,4', '1.234,56', 'precoDeCompra', 'Fornecedor Teste', 'REGRA DO PREÇO'].forEach((proib) => {
    assert.ok(!pv.includes(proib), 'o vendedor não pode receber: ' + proib);
  });
  assert.match(pv, /nenhuma outra oportunidade sua com este cliente/);
  // revisão 01/11/2026: a gestão na oportunidade da vendedora usa a visão da responsável (o plano pode ser gravado e ela lê)
  amb.iaPrompts.length = 0;
  const rg = ok(amb.api('s_dora', 'especialista', { id: o.id }));
  const pgv = amb.iaPrompts.find((x) => /ESPECIALISTA em vendas B2B/.test(x));
  ['OPO-2026-0002', '6.543,21', 'Empresa Concorrente Teste', '2.345,67', 'custoTotal', '31,4', '1.234,56', 'REGRA DO PREÇO'].forEach((proib) => assert.ok(!pgv.includes(proib), 'gestão na oportunidade da vendedora, sem: ' + proib));
  assert.match(rg.aviso, /montados com a visão de quem é responsável/);
  // na oportunidade da própria gestão, a visão completa
  const od = oportunidadeDeTeste(amb, 's_dora', { titulo: 'Contrato de calibração da UTI', proxima: PROX }).oportunidade;
  const pd = ok(amb.api('s_dora', 'novaProposta', { oportunidadeId: od.id })).proposta.id;
  Object.assign(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === pd), { CUSTO_TOTAL: 2345.67, MARGEM_PCT: 31.4, TOTAL: 4500 });
  amb.iaPrompts.length = 0;
  ok(amb.api('s_dora', 'especialista', { id: od.id }));
  const pg = amb.iaPrompts.find((x) => /ESPECIALISTA em vendas B2B/.test(x));
  ['OPO-2026-0002', '6.543,21', 'Empresa Concorrente Teste', '2.345,67', 'custoTotal', 'REGRA DO PREÇO'].forEach((visto) => assert.ok(pg.includes(visto), 'a gestão na própria vê: ' + visto));
});

test('revisão: a gestão usa um plano na oportunidade da vendedora e nenhum custo, margem ou dado de outro vendedor chega ao que a vendedora vê', () => {
  let n = 0;
  const amb = ambiente({ ia: (p) => { if (!/ESPECIALISTA em vendas B2B/.test(p)) return '{}'; n++; const r = respostaBoa();
    if (n === 1) r.planos[0].objetivo = 'Mostrar que a margem de 31,4% sobre o custo de R$ 2.345,67 ainda permite negociar com a Ana.';
    return JSON.stringify(r); } });
  const o = paradaSemResposta(amb);
  const ov = oportunidadeDeTeste(amb, 's_vito', { titulo: 'Manutenção da lavadora LV-77', valor: '7.777,00', proxima: PROX }).oportunidade;
  ok(amb.api('s_vito', 'perder', { id: ov.id, motivo: 'Concorrente escolhido', aprendizado: 'Perdemos no preço para um concorrente local', concorrente: 'Empresa Concorrente Teste', valorVencedor: '6.543,21' }));
  const pid = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: o.id })).proposta.id;
  Object.assign(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === pid), { CUSTO_TOTAL: 2345.67, MARGEM_PCT: 31.4, TOTAL: 4500 });
  const r = ok(amb.api('s_dora', 'especialista', { id: o.id }));
  assert.equal(r.origem, 'IA');
  assert.equal(r.tentativasIA, 2, 'a resposta com custo e margem foi recusada: não estão nos fatos da visão da vendedora');
  ok(amb.api('s_dora', 'especialistaUsarPlano', { sugestaoId: r.sugestaoId, letra: 'A' }));
  ok(amb.api('s_dora', 'especialistaCriarAcao', { id: o.id, sugestaoId: r.sugestaoId, letra: 'A', acao: r.sugestao.proximaAcao.acao, data: r.sugestao.proximaAcao.dataIso, hora: r.sugestao.proximaAcao.hora, tipo: r.sugestao.proximaAcao.canal }));
  const visto = JSON.stringify([amb.tabelas.COM_PLANOS_ESPECIALISTA, amb.tabelas.COM_HISTORICO.filter((h) => h.ENTIDADE_ID === o.id), ok(amb.api('s_vera', 'especialistaPlanos', { id: o.id })),
    ok(amb.api('s_vera', 'oportunidade', { id: o.id })).planoEspecialista, amb.tabelas.COM_IA_SUGESTOES.find((x) => x.ID === r.sugestaoId).CONTEUDO_JSON]);
  ['2.345,67', '2345.67', '31,4', '31.4', 'margemPct', 'custoTotal', 'precoDeCompra', 'OPO-2026-0002', '6.543,21', 'Empresa Concorrente Teste', 'Manutenção da lavadora'].forEach((proib) => assert.ok(!visto.includes(proib), 'chegou à vendedora: ' + proib));
});

// ------------------------------------------------------------------ revisão 01/11/2026: pacote, desconto, sugestão de outra oportunidade, tudo falhou
test('pacote: sem política de pacote nada de "% a menos", "abaixo da tabela", abatimento ou parcelas; com a política, só o que ela diz e como dependente de aprovação', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  const eu = amb.ctx.Com_eu_('s_vera');
  const fx = amb.ctx.ComEsp_fatos_(eu, amb.ctx.ComOpo_obter_(eu, o.id, 'teste'));
  const refs = JSON.stringify(fx.fatos.referenciasComerciais);
  assert.doesNotMatch(refs, /10% a menos|12 parcelas/, 'a linha inventada saiu');
  assert.match(refs, /dependem de aprovação da gestão na Caixa de decisões/);
  const v = (frase) => { const j = respostaBoa(); j.planos[2].objetivo = frase; return amb.ctx.ComEsp_verificar_(j, { fatos: fx.fatos, x: fx.x, mem: { falhos: [] }, fabricantes: [] }); };
  for (const f of ['Oferecer o contrato anual com 10% a menos que a tabela.', 'Fechar o pacote abaixo da tabela.', 'Dar um abatimento no pacote anual.', 'Pacote anual em 12 parcelas mensais.', 'Pacote anual pago em 6x.']) {
    const r = v(f);
    assert.equal(r.ok, false, f);
    assert.ok(r.problemas.some((p) => /abaixo da tabela|abatimento|não está na política/.test(p)), f + ': ' + r.problemas.join(' | '));
  }
  assert.equal(v('Propor o pacote anual com as visitas programadas; a condição depende de aprovação da gestão.').ok, true);
  // a regra do PACOTE_ANUAL não promete percentual nem parcelamento
  const pac = amb.ctx.ComEsp_montarAbordagem_('PACOTE_ANUAL', fx.x);
  const tp = JSON.stringify(pac);
  assert.doesNotMatch(tp, /\d+\s*%|parcela|pagamento mensal|abaixo da tabela/i);
  assert.match(pac.objetivo, /depende de aprovação da gestão na Caixa de decisões/);
  // com a política de pacote escrita pela gestão: o número dela pode ser citado, e a referência vem como dependente de aprovação
  fx.x.met.politica.pacote = { texto: 'Contrato anual com até 8% a menos sobre a tabela, em 12 parcelas.' };
  const fx2 = Object.assign({}, fx, { fatos: Object.assign({}, fx.fatos, { referenciasComerciais: amb.ctx.ComEsp_referenciasPacote_(fx.x.met) }) });
  assert.match(JSON.stringify(fx2.fatos.referenciasComerciais), /precisa de aprovação na Caixa de decisões.*8% a menos/);
  const j = respostaBoa(); j.planos[2].objetivo = 'Levar à gestão o contrato anual com 8% a menos em 12 parcelas, pela política.';
  assert.equal(amb.ctx.ComEsp_verificar_(j, { fatos: fx2.fatos, x: fx.x, mem: { falhos: [] }, fabricantes: [] }).ok, true);
  const j2 = respostaBoa(); j2.planos[2].objetivo = 'Contrato anual com 9% a menos em 10 parcelas.';
  assert.equal(amb.ctx.ComEsp_verificar_(j2, { fatos: fx2.fatos, x: fx.x, mem: { falhos: [] }, fabricantes: [] }).ok, false);
});

test('gestora: promessa de desconto com qualquer verbo é recusada; o relato do pedido do cliente passa com o número dos fatos', () => {
  const amb = ambiente();
  const fatos = { pedido: 'o cliente pediu 25% de desconto', limites: [10, 15] };
  const rec = ['Posso fazer 10% de desconto se fechar hoje.', 'Consigo 10% de desconto.', 'Fechamos com 15% de desconto.', 'De um desconto de 10%.', 'Dê um desconto de 10%.', 'Ofereça um desconto para fechar.', 'Damos desconto de 15% no pacote.', 'Dê mais desconto.'];
  rec.forEach((f) => { const r = amb.ctx.ComG_verificar_(f, fatos); assert.equal(r.ok, false, f); assert.ok(r.problemas.some((p) => /expressão proibida/.test(p)), f); });
  const passa = ['O pedido de desconto foi registrado na proposta.', 'O cliente pediu 25% de desconto na reunião.', 'A Ana pediu desconto de 25% e citou o concorrente.', 'Leve o pedido de 25% de desconto à gestão.'];
  passa.forEach((f) => { const r = amb.ctx.ComG_verificar_(f, fatos); assert.equal(r.ok, true, f + ': ' + r.problemas.join('; ')); });
  // o relato com número que não está nos fatos continua recusado (pelo número)
  const r = amb.ctx.ComG_verificar_('O cliente pediu 33% de desconto.', fatos);
  assert.equal(r.ok, false);
  assert.ok(r.problemas.some((p) => /número que não está nos resultados: 33/.test(p)));
});

test('criar a próxima ação: sugestaoId de outra oportunidade é recusado e nada é criado', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  const o2 = oportunidadeDeTeste(amb, 's_vera', { titulo: 'Calibração de 4 seladoras', proxima: PROX }).oportunidade;
  const r2 = ok(amb.api('s_vera', 'especialista', { id: o2.id }));
  const atv = amb.tabelas.ATV_ATIVIDADES.length, antes = JSON.stringify(opo(amb, o.id));
  const pa = r2.sugestao.proximaAcao;
  const x = amb.api('s_vera', 'especialistaCriarAcao', { id: o.id, sugestaoId: r2.sugestaoId, letra: 'A', acao: pa.acao, data: pa.dataIso, hora: pa.hora, tipo: pa.canal });
  assert.equal(x.ok, false);
  assert.match(x.message, /a consulta à especialista não é desta oportunidade/);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.length, atv, 'nenhuma atividade criada');
  assert.equal(JSON.stringify(opo(amb, o.id)), antes, 'oportunidade intacta');
  assert.equal((amb.tabelas.COM_PLANOS_ESPECIALISTA || []).length, 0, 'nenhum plano posto em uso');
});

test('todas as abordagens já falharam: sem erro, sai o encerramento educado com o aviso claro', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  amb.tabelas.COM_PLANOS_ESPECIALISTA = Object.keys(amb.ctx.COM_ESP_ABORDAGENS).map((k, i) => ({ ID: 'pf' + i, OPORTUNIDADE_ID: o.id, LETRA: 'A', ABORDAGEM: k, TITULO: 'Plano ' + k, SITUACAO: 'NAO_DEU_CERTO', MOTIVO: '20/10/2026: sem avanço', INICIADO_EM: '2026-10-20T10:00', PLANO_JSON: '{}' }));
  const r = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  assert.equal(r.sugestao.planos.length, 1);
  assert.equal(r.sugestao.planos[0].abordagem, 'ENCERRAR');
  assert.match(r.aviso, /Todas as abordagens já foram tentadas nesta oportunidade e não deram certo: avalie encerrar .* ou pedir ajuda à gestão comercial/);
  assert.ok(r.sugestao.proximaAcao && r.sugestao.proximaAcao.dataIso);
});

// ------------------------------------------------------------------ próxima ação com um toque e cota
test('criar a próxima ação: um toque cria em Minhas atividades, cancela a anterior, troca a próxima ação e põe o plano A em uso', () => {
  const amb = ambiente();
  const o = paradaSemResposta(amb);
  const r = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  const pa = r.sugestao.proximaAcao;
  assert.equal(pa.plano, 'A'); assert.equal(pa.dataIso, '2026-10-26'); assert.equal(pa.hora, '10:00');
  const antiga = opo(amb, o.id).ATIVIDADE_ID;
  assert.match(amb.api('s_vera', 'especialistaCriarAcao', { id: o.id, sugestaoId: r.sugestaoId, letra: 'A', acao: pa.acao, data: '2026-10-20', hora: '10:00', tipo: pa.canal }).message, /não pode ficar no passado/);
  const c = ok(amb.api('s_vera', 'especialistaCriarAcao', { id: o.id, sugestaoId: r.sugestaoId, letra: 'A', acao: pa.acao, data: pa.dataIso, hora: pa.hora, tipo: pa.canal }));
  assert.match(c.message, /Próxima ação criada em Minhas atividades para 26\/10\/2026 10:00\. A anterior \("Ligar de novo para a Ana"\) foi cancelada/);
  const nova = opo(amb, o.id);
  assert.notEqual(nova.ATIVIDADE_ID, antiga);
  assert.equal(nova.PROXIMA_ACAO, pa.acao);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === antiga).SITUACAO, 'Cancelada');
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === nova.ATIVIDADE_ID).RESPONSAVEL_ID, 'u_ven');
  assert.equal(c.memoria.emUso.letra, 'A');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => /Próxima ação criada pelo plano A da especialista/.test(h.TEXTO)));
});

test('cota de IA por pessoa e hora (a mesma do Comercial): sem cota, sai pelas regras com o aviso; sem chave, também', () => {
  const amb = ambiente({ ia: () => JSON.stringify(respostaBoa()) });
  const o = paradaSemResposta(amb);
  amb.cache['COM_O_IAN_u_ven_' + amb.ctx.Com_agora_().slice(0, 13)] = '20';
  amb.iaPrompts.length = 0;
  const r = ok(amb.api('s_vera', 'especialista', { id: o.id }));
  assert.equal(amb.iaPrompts.length, 0, 'nenhuma chamada à IA sem cota');
  assert.equal(r.origem, 'REGRAS');
  assert.match(r.aviso, /já usou 20 análises com IA nesta hora/);
  assert.equal(r.sugestao.planos.length, 3);
  // outra pessoa tem a cota dela
  assert.equal(ok(amb.api('s_dora', 'especialista', { id: o.id })).origem, 'IA');
  // cada refação gasta a cota
  const amb2 = ambiente({ ia: () => '{"diagnostico":"x"}' });
  const o2 = paradaSemResposta(amb2);
  ok(amb2.api('s_vera', 'especialista', { id: o2.id }));
  assert.equal(amb2.cache['COM_O_IAN_u_ven_' + amb2.ctx.Com_agora_().slice(0, 13)], '3');
  const amb3 = ambiente();
  const o3 = paradaSemResposta(amb3);
  const r3 = ok(amb3.api('s_vera', 'especialista', { id: o3.id }));
  assert.match(r3.aviso, /chave da IA não está cadastrada/);
  assert.equal(r3.sugestao.planos.length, 3);
});
