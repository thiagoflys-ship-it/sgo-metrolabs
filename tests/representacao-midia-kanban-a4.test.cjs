// Representação, pedidos do dono de 11/11/2026: (1) prazo de 3 dias úteis da representada para estudar o caso e agendar,
// gravado no chamado (SLA_FONTE = REPRESENTACAO) também na troca de prioridade, com o texto em dias úteis; (2) imagens e vídeos
// do pedido e do chamado, dos dois lados, pelo escopo da representada (o vídeo pela rota própria do servidor: aqui, as duas
// funções do legado que a rota chama); (3) Kanban e Gantt dos dois lados com o prazo novo; (4) relatório A4 do atendimento e do
// período, gerado pelos dois lados, com o prazo em dias úteis, as imagens da galeria no escopo de cada um e texto justificado.
// Código real do SGO+ (tests/_assistencia_ambiente.cjs; relógio começa na segunda 19/10/2026 às 10h). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, em } = require('./_assistencia_ambiente.cjs');

// 11/11/2026: o servidor carrega todos os arquivos do legado; a régua de prazos da representada (SGO_Representacao_Regua.js) entra como em produção
const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js',
  'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Midia.js', 'SGO_Representacao_Regua.js'];
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
const JPG = Buffer.alloc(3000, 9).toString('base64');
const img = (nome, legenda) => ({ nome: nome || 'visor.jpg', tipo: 'image/jpeg', base64: JPG, legenda: legenda || '', reduzida: { base64: Buffer.alloc(500, 4).toString('base64') } });
const falha = (r) => { assert.equal(r.ok, false, 'esperava recusa: ' + JSON.stringify(r).slice(0, 300)); return r; };

function amb(prazosB) {
  const a = ambiente({ extras: EXTRAS });
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: prazosB || '' }
  ];
  const us = [
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'beto.beta', NOME: 'BETO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' },
    { ID: 'rb_at2', USUARIO: 'bia.beta', NOME: 'BIA BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'bia@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' },
    { ID: 'rb_adm', USUARIO: 'bruno.beta', NOME: 'BRUNO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'bruno@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_le', USUARIO: 'lia.beta', NOME: 'LIA BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'lia@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'LEITURA' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  a.html = (id) => a.arquivos[id].bytes.toString('utf8');
  return a;
}
/** Pedido da representada B (Hospital Teste Alfa, eq1). */
function pedido(a, extra) {
  ok(a.rep('s_beto.beta', 'buscarCliente', { documento: '11.222.333/0001-81' }));
  ok(a.rep('s_beto.beta', 'buscarEquipamento', { clienteId: 'c1', serie: 'S-100' }));
  return ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', protocolo: 'BM-900', setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777',
    contatoEmail: 'rui@alfa.exemplo.test', sintoma: 'A autoclave interrompe o ciclo com alarme de baixa pressão de vapor.', inicio: 'ontem', codigoErro: 'E12', parada: 'TOTAL', risco: 'Sem esterilização', tentado: 'Religamos',
    enquadramento: 'GARANTIA', fotos: [{ nome: 'abertura.png', tipo: 'image/png', base64: PNG }], fotosEtiqueta: [{ nome: 'etiqueta.png', tipo: 'image/png', base64: PNG }] }, extra || {}))).solicitacao;
}
function chamadoDaB(a, prioridade) {
  const p = pedido(a);
  a.mudar('2026-10-19T11:00:00-03:00');
  const c = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: p.id, prioridade: prioridade || 'P1' })).chamado;
  return { p, c, reg: () => a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id) };
}

// ------------------------------------------------------------ 1. PRAZO
test('prazo: chamado da representada nasce com 3 dias úteis (SLA_FONTE REPRESENTACAO) no lugar das 4 h úteis da P1, e a troca de prioridade mantém', () => {
  const a = amb();
  const k = chamadoDaB(a, 'P1');
  const c = k.reg();
  assert.equal(Number(c.SLA_MIN_UTEIS), 1710);
  assert.equal(c.SLA_FONTE, 'REPRESENTACAO');
  assert.equal(c.CHEGADA_MIN_UTEIS, 0);
  // triagem continua pela prioridade (P1 = 30 min), sem passar do prazo
  assert.ok(Number(c.TRIAGEM_MIN_UTEIS) <= 1710);
  // prazo vence 3 dias úteis depois da abertura (seg 11h -> qui 11h)
  assert.equal(c.PRAZO_ATENDIMENTO_EM.slice(0, 16), '2026-10-22T11:00');
  // ficha da Assistência: fonte em texto, em dias úteis
  const f = ok(a.api('s_gil', 'chamado', { id: c.ID }));
  assert.match(f.chamado.slaFonte, /Prazo da representada REPRESENTADA BETA TESTE \(3 dias úteis\)/);
  // troca de prioridade na triagem: o prazo continua o da representada
  ok(a.api('s_gil', 'triagem', { id: c.ID, prioridade: 'P3', prioridadeMotivo: 'Equipamento reserva disponível', checklist: { sintomas_confirmados: 'Confirmado por telefone' } }));
  const c2 = k.reg();
  assert.equal(c2.PRIORIDADE, 'P3');
  assert.equal(Number(c2.SLA_MIN_UTEIS), 1710);
  assert.equal(c2.SLA_FONTE, 'REPRESENTACAO');
  // chamado comum (sem representada) segue a prioridade
  const comum = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', sintoma: 'Lavadora não completa o ciclo e apita', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P1', parada: 'TOTAL', canal: 'TELEFONE' })).chamado;
  const rc = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === comum.id);
  assert.notEqual(rc.SLA_FONTE, 'REPRESENTACAO');
  assert.ok(Number(rc.SLA_MIN_UTEIS) < 1710);
});

test('prazo: o prazo configurado na representada vale (e convive com o ajuste manual já feito em produção); chamado ligado depois mantém o prazo de nascimento', () => {
  const a = amb(JSON.stringify({ aceiteMin: 1710, atendimentoMin: 1140 }));
  const k = chamadoDaB(a, 'P2');
  assert.equal(Number(k.reg().SLA_MIN_UTEIS), 1140);
  // pedido nasce com o aceite de 3 dias úteis gravado à mão em PRAZOS_JSON
  assert.equal(Number(a.tabelas.ATEC_SOLICITACOES.find((s) => s.ID === k.p.id).ACEITE_MIN_UTEIS), 1710);
  assert.match(a.ctx.Rep_prazoTxt_(1710), /^3 dias úteis$/);
  assert.equal(a.ctx.Rep_prazoTxt_(570), '1 dia útil');
  assert.equal(a.ctx.Rep_prazoTxt_(240), '4 h úteis');
  assert.equal(a.ctx.Rep_prazoTxt_(1740), '29 h úteis');
  // ajuste manual (como o CH-2026-0030): chamado ligado depois, mas já com SLA_FONTE REPRESENTACAO -> troca de prioridade mantém
  const lig = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', sintoma: 'Lavadora não completa o ciclo e apita', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P2', parada: 'NAO', canal: 'TELEFONE' })).chamado;
  a.ctx.SGO_DATA.update('ATEC_CHAMADOS', lig.id, { REPRESENTADA_ID: 'repB', REPRESENTADA_NOME: 'REPRESENTADA BETA TESTE', REP_LIGADO_EM: '2026-10-19T12:00:00', SLA_MIN_UTEIS: 1710, SLA_FONTE: 'REPRESENTACAO' });
  ok(a.api('s_gil', 'triagem', { id: lig.id, prioridade: 'P1', prioridadeMotivo: 'Equipamento parou de vez', checklist: { sintomas_confirmados: 'Confirmado' } }));
  let r = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === lig.id);
  assert.equal(r.SLA_FONTE, 'REPRESENTACAO'); assert.equal(Number(r.SLA_MIN_UTEIS), 1140);
  // ligado depois SEM o prazo da representada: a prioridade continua decidindo
  const lig2 = ok(a.api('s_gil', 'abrir', { clienteId: 'c2', unidadeId: 'un2', equipamentoId: 'eq3', sintoma: 'Estufa não aquece até a temperatura', solicitante: 'Contato Beta', contato: '62988887777', prioridade: 'P3', parada: 'NAO', canal: 'TELEFONE' })).chamado;
  a.ctx.SGO_DATA.update('ATEC_CHAMADOS', lig2.id, { REPRESENTADA_ID: 'repB', REPRESENTADA_NOME: 'REPRESENTADA BETA TESTE', REP_LIGADO_EM: '2026-10-19T12:00:00' });
  ok(a.api('s_gil', 'triagem', { id: lig2.id, prioridade: 'P2', prioridadeMotivo: 'Cliente pediu urgência', checklist: { sintomas_confirmados: 'Confirmado' } }));
  r = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === lig2.id);
  assert.notEqual(r.SLA_FONTE, 'REPRESENTACAO');
});

test('prazo: tela de prazos da representada valida e grava o prazo de atendimento; a representada vê os prazos combinados em dias úteis', () => {
  const a = amb();
  const ini = ok(a.rep('s_gil', 'iniciar'));
  assert.equal(ini.prazosPadrao.atendimentoMin, 1710);
  assert.equal(ini.minDia, 570);
  const rep = ini.representadas.find((r) => r.id === 'repB');
  const base = { id: 'repB', nome: rep.nome, situacao: 'ATIVA', prazos: Object.assign({}, rep.prazos) };
  let r = falha(a.rep('s_dora', 'salvarRepresentada', Object.assign({}, base, { prazos: Object.assign({}, base.prazos, { atendimentoMin: 20 }) })));
  assert.ok(r.faltam.some((f) => f.campo === 'atendimentoMin'));
  assert.match(r.message, /60 \(1 hora útil\)/);
  r = falha(a.rep('s_dora', 'salvarRepresentada', Object.assign({}, base, { prazos: Object.assign({}, base.prazos, { atendimentoMin: 99999 }) })));
  assert.ok(r.faltam.some((f) => f.campo === 'atendimentoMin'));
  ok(a.rep('s_dora', 'salvarRepresentada', Object.assign({}, base, { prazos: Object.assign({}, base.prazos, { atendimentoMin: 2280 }) })));
  assert.equal(JSON.parse(a.tabelas.REP_REPRESENTADAS.find((x) => x.ID === 'repB').PRAZOS_JSON).atendimentoMin, 2280);
  const i2 = ok(a.rep('s_beto.beta', 'inicio'));
  // 11/11/2026 (régua de prazos): também os prazos do relatório do atendimento e da avaliação depois da peça (padrão 2 dias úteis)
  assert.deepEqual(i2.prazosTexto, { aceite: '4 h úteis', atendimento: '4 dias úteis', relatorio: '2 dias úteis', avaliacao: '2 dias úteis' });
});

// ------------------------------------------------------------ 2. IMAGENS E VÍDEOS
test('imagens: a representada anexa no pedido dela (miniatura, legenda); outra representada não vê nem anexa; Leitura só consulta', () => {
  const a = amb();
  const p = pedido(a);
  const r = ok(a.rep('s_beto.beta', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p.id, imagens: [img('visor.jpg', 'Visor com E12'), img('porta.jpg')] }));
  assert.match(r.message, /2 imagens anexadas no pedido SOL-/);
  const g = r.galeria;
  // as fotos da abertura também são imagens da galeria
  assert.equal(g.itens.length, 4);
  const v = g.itens.find((x) => x.legenda === 'Visor com E12');
  assert.ok(v.miniaturaUrl.startsWith('/arquivos/'));
  assert.equal(v.midia, 'IMAGEM');
  assert.equal(v.podeRetirar, true);
  assert.equal(g.podeEnviar, true);
  assert.equal(a.tabelas.REP_ANEXOS.filter((x) => x.TIPO === 'IMAGEM').length, 2);
  // a outra representada recebe a mesma resposta de "não encontrado"
  const fora = falha(a.rep('s_ana.alfa', 'midias', { refTipo: 'SOLICITACAO', refId: p.id }));
  assert.match(fora.message, /Não encontramos este registro/);
  falha(a.rep('s_ana.alfa', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p.id, imagens: [img()] }));
  // a cópia reduzida abre para a dona e não abre para a outra
  const red = a.tabelas.REP_ANEXOS.find((x) => x.LEGENDA === 'Visor com E12').REDUZIDA_ARQUIVO_ID;
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', red), true);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', red), false);
  // Leitura: vê a galeria, não envia
  const le = ok(a.rep('s_lia.beta', 'midias', { refTipo: 'SOLICITACAO', refId: p.id }));
  assert.equal(le.galeria.podeEnviar, false);
  assert.match(falha(a.rep('s_lia.beta', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p.id, imagens: [img()] })).message, /papel \(Leitura\) não permite/);
  // limites: mais de 10 por envio e formato errado
  assert.match(falha(a.rep('s_beto.beta', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p.id, imagens: Array.from({ length: 11 }, () => img()) })).message, /limite é de 10 por envio/);
  assert.match(falha(a.rep('s_beto.beta', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: p.id, imagens: [{ nome: 'x.gif', tipo: 'image/gif', base64: JPG }] })).message, /tipo de arquivo não aceito/);
});

test('imagens: a Metrolabs anexa (pública ou "só para a Metrolabs"); a representada só vê a pública; pedido aceito manda para o chamado; retirar exige motivo e quem pode', () => {
  const a = amb();
  const k = chamadoDaB(a, 'P2');
  const envAntes = a.tabelas.NTF_ENVIOS.length + a.emails.length;
  ok(a.rep('s_gil', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img('bancada.jpg', 'FOTO INTERNA DE BANCADA')], interna: true }));
  ok(a.rep('s_gil', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img('valvula.jpg', 'Válvula trocada')] }));
  assert.ok(a.tabelas.NTF_ENVIOS.length + a.emails.length > envAntes, 'a representada recebe o aviso da imagem pública');
  const gi = ok(a.rep('s_gil', 'midias', { refTipo: 'CHAMADO', refId: k.c.id })).galeria;
  assert.ok(gi.itens.some((x) => x.legenda === 'FOTO INTERNA DE BANCADA' && x.interna));
  const gr = ok(a.rep('s_beto.beta', 'midias', { refTipo: 'CHAMADO', refId: k.c.id })).galeria;
  assert.ok(!gr.itens.some((x) => x.legenda === 'FOTO INTERNA DE BANCADA'));
  const pub = gr.itens.find((x) => x.legenda === 'Válvula trocada');
  assert.match(pub.por, /\(Metrolabs\)$/);
  assert.equal(pub.podeRetirar, false);
  const interna = a.tabelas.REP_ANEXOS.find((x) => x.LEGENDA === 'FOTO INTERNA DE BANCADA');
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', interna.ARQUIVO_ID), false);
  // pela ficha do pedido aceito, a representada envia e vai para o chamado
  const r = ok(a.rep('s_beto.beta', 'enviarImagens', { refTipo: 'SOLICITACAO', refId: k.p.id, imagens: [img('depois.jpg', 'Enviada pelo pedido aceito')] }));
  assert.match(r.message, /no chamado CH-/);
  assert.equal(a.tabelas.REP_ANEXOS.find((x) => x.LEGENDA === 'Enviada pelo pedido aceito').REF_TIPO, 'CHAMADO');
  // retirar: outra atendente da mesma representada não pode; sem motivo não vai; o administrador dela pode
  const minha = gr.itens.length ? a.tabelas.REP_ANEXOS.find((x) => x.LEGENDA === 'Enviada pelo pedido aceito') : null;
  assert.match(falha(a.rep('s_bia.beta', 'retirarMidia', { id: minha.ID, motivo: 'Imagem repetida no chamado' })).message, /só quem enviou/);
  assert.match(falha(a.rep('s_beto.beta', 'retirarMidia', { id: minha.ID, motivo: 'curto' })).message, /pelo menos 10 letras/);
  const ret = ok(a.rep('s_bruno.beta', 'retirarMidia', { id: minha.ID, motivo: 'Aparece o rosto de um paciente' }));
  assert.ok(!ret.galeria.itens.some((x) => x.id === minha.ID));
  const reg = a.tabelas.REP_ANEXOS.find((x) => x.ID === minha.ID);
  assert.ok(reg.REMOVIDO_EM); assert.match(reg.REMOVIDO_POR_NOME, /BRUNO BETA TESTE/);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', reg.ARQUIVO_ID), false);
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'MIDIA_RETIRADA' && /paciente/.test(e.TEXTO)));
  // chamado encerrado não recebe anexo da representada (a Metrolabs ainda pode)
  a.ctx.SGO_DATA.update('ATEC_CHAMADOS', k.c.id, { SITUACAO: 'ENCERRADO' });
  assert.match(falha(a.rep('s_beto.beta', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img()] })).message, /está encerrado/);
  assert.equal(ok(a.rep('s_beto.beta', 'midias', { refTipo: 'CHAMADO', refId: k.c.id })).galeria.podeEnviar, false);
  ok(a.rep('s_gil', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img('final.jpg', 'Foto final')] }));
});

test('vídeo: a rota própria do servidor confere e registra pelo escopo (formato, tamanho, papel, outra representada); o vídeo em base64 do pedido fica limitado', () => {
  const a = amb();
  const p = pedido(a);
  const prep = a.ctx.Representacao_midiaPreparar_('s_beto.beta', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'defeito.mp4', mime: 'video/mp4', bytes: 30 * 1048576 });
  assert.equal(prep.ok, true, JSON.stringify(prep));
  assert.ok(prep.pastaId);
  // o servidor grava o arquivo na pasta indicada (aqui, simulado) e registra
  const arq = a.ctx.DriveApp.getFolderById(prep.pastaId).createFile(a.ctx.Utilities.newBlob([1, 2, 3, 4], 'video/mp4', 'defeito.mp4'));
  const reg = a.ctx.Representacao_midiaRegistrar_('s_beto.beta', { refTipo: prep.refTipo, refId: prep.refId, nome: prep.nome, mime: 'video/mp4', bytes: 30 * 1048576, sha256: 'ab'.repeat(32), arquivoId: arq.getId(), legenda: 'Alarme no início do ciclo' });
  assert.equal(reg.ok, true, JSON.stringify(reg));
  assert.equal(reg.item.midia, 'VIDEO');
  assert.match(reg.message, /Vídeo anexado no pedido SOL-/);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', arq.getId()), true);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', arq.getId()), false);
  const g = ok(a.rep('s_beto.beta', 'midias', { refTipo: 'SOLICITACAO', refId: p.id })).galeria;
  assert.ok(g.itens.some((x) => x.midia === 'VIDEO' && x.legenda === 'Alarme no início do ciclo'));
  assert.equal(g.limites.videoMb, 100);
  // recusas com o código HTTP que a rota devolve
  const r1 = a.ctx.Representacao_midiaPreparar_('s_beto.beta', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'x.avi', mime: 'video/x-msvideo', bytes: 1000 });
  assert.equal(r1.ok, false); assert.equal(r1.status, 415);
  const r2 = a.ctx.Representacao_midiaPreparar_('s_beto.beta', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'x.mp4', mime: 'video/mp4', bytes: 101 * 1048576 });
  assert.equal(r2.status, 413); assert.match(r2.message, /limite é de 100 MB/);
  const r3 = a.ctx.Representacao_midiaPreparar_('s_ana.alfa', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'x.mp4', mime: 'video/mp4', bytes: 1000 });
  assert.equal(r3.status, 404);
  const r4 = a.ctx.Representacao_midiaPreparar_('s_lia.beta', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'x.mp4', mime: 'video/mp4', bytes: 1000 });
  assert.equal(r4.status, 403);
  const r5 = a.ctx.Representacao_midiaPreparar_('sessao-que-nao-existe', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'x.mp4', mime: 'video/mp4', bytes: 1000 });
  assert.equal(r5.ok, false); assert.equal(r5.status, 401);
  // a Metrolabs também envia vídeo (inclusive "só para a Metrolabs")
  const pi = a.ctx.Representacao_midiaPreparar_('s_gil', { refTipo: 'SOLICITACAO', refId: p.id, nome: 'bancada.mov', mime: 'video/quicktime', bytes: 5 * 1048576 });
  assert.equal(pi.ok, true);
  const arq2 = a.ctx.DriveApp.getFolderById(pi.pastaId).createFile(a.ctx.Utilities.newBlob([5, 6], 'video/quicktime', 'bancada.mov'));
  assert.equal(a.ctx.Representacao_midiaRegistrar_('s_gil', { refTipo: pi.refTipo, refId: pi.refId, nome: pi.nome, mime: 'video/quicktime', bytes: 5 * 1048576, arquivoId: arq2.getId(), interna: true }).ok, true);
  assert.ok(!ok(a.rep('s_beto.beta', 'midias', { refTipo: 'SOLICITACAO', refId: p.id })).galeria.itens.some((x) => x.nome === 'bancada.mov'));
  // vídeo grande dentro do pedido (base64 pelo /api/run) é recusado com o caminho certo
  const grande = { nome: 'grande.mp4', tipo: 'video/mp4', base64: Buffer.alloc(9 * 1048576, 1).toString('base64') };
  ok(a.rep('s_beto.beta', 'buscarCliente', { documento: '11.222.333/0001-81' }));
  const rv = falha(a.rep('s_beto.beta', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777', contatoEmail: 'rui@alfa.exemplo.test',
    sintoma: 'A autoclave interrompe o ciclo com alarme de baixa pressão de vapor.', inicio: 'ontem', codigoErro: 'E12', parada: 'TOTAL', risco: 'Sem esterilização', tentado: 'Religamos', enquadramento: 'GARANTIA',
    fotos: [{ nome: 'a.png', tipo: 'image/png', base64: PNG }], fotosEtiqueta: [{ nome: 'e.png', tipo: 'image/png', base64: PNG }], video: grande }));
  assert.match(rv.message, /Imagens e vídeos/);
});

// ------------------------------------------------------------ 3. KANBAN E GANTT
test('Kanban e Gantt: a representada vê só os dela, sem dados internos, com o prazo de 3 dias úteis; a Metrolabs vê todas e filtra', () => {
  const a = amb();
  const k = chamadoDaB(a, 'P1');
  // pedido da representada A
  ok(a.rep('s_ana.alfa', 'buscarCliente', { documento: '11.222.333/0001-81' }));
  ok(a.rep('s_ana.alfa', 'buscarEquipamento', { clienteId: 'c1', serie: 'S-200' }));
  ok(a.rep('s_ana.alfa', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777', contatoEmail: 'rui@alfa.exemplo.test',
    sintoma: 'A lavadora não aquece a água e para no meio do ciclo com alarme.', inicio: 'hoje', codigoErro: 'E07', parada: 'PARCIAL', risco: 'Sem lavagem', tentado: 'Nada', enquadramento: 'NAO_SEI',
    fotos: [{ nome: 'a.png', tipo: 'image/png', base64: PNG }], fotosEtiqueta: [{ nome: 'e.png', tipo: 'image/png', base64: PNG }] }));
  a.mudar('2026-10-20T10:00:00-03:00');
  const pb = ok(a.rep('s_beto.beta', 'painel', { dias: 30 })).painel;
  const cartoes = pb.kanban.flatMap((col) => col.itens);
  assert.ok(cartoes.length >= 1);
  assert.ok(cartoes.every((x) => !('representadaNome' in x) && !('situacao' in x)), 'sem dados internos no cartão da representada');
  assert.ok(!cartoes.some((x) => /S-200/.test(x.equipamento)), 'nada da representada A');
  const cb = pb.gantt.find((x) => x.id === k.c.id);
  // 11/11/2026 (régua de prazos): o prazo do cartão é o da etapa da régua que vale agora (estudar o caso e agendar, 3 dias úteis)
  assert.equal(cb.prazo.de, 'REGUA'); assert.equal(cb.prazo.etapa, 'ESTUDO');
  assert.equal(cb.prazo.ateMs, em('2026-10-22T11:00:00-03:00'), 'prazo de 3 dias úteis da abertura');
  assert.equal(cb.prazo.estado, 'NO_PRAZO');
  const pi = ok(a.rep('s_gil', 'painel', { dias: 30 })).painel;
  const nomes = new Set(pi.gantt.map((x) => x.representadaNome));
  assert.ok(nomes.has('REPRESENTADA ALFA TESTE') && nomes.has('REPRESENTADA BETA TESTE'));
  const pf = ok(a.rep('s_gil', 'painel', { dias: 30, representadaId: 'repA' })).painel;
  assert.ok(pf.gantt.length && pf.gantt.every((x) => x.representadaId === 'repA'));
  // a representada não consegue pedir o painel de outra pelo filtro
  const pt = ok(a.rep('s_ana.alfa', 'painel', { dias: 30, representadaId: 'repB' })).painel;
  assert.ok(!pt.gantt.some((x) => x.id === k.c.id));
});

// ------------------------------------------------------------ 4. RELATÓRIOS A4
test('relatórios A4: atendimento e período gerados pelos dois lados, com o prazo em dias úteis, a galeria no escopo de cada um e texto corrido justificado', () => {
  const a = amb();
  const k = chamadoDaB(a, 'P2');
  ok(a.rep('s_gil', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img('bancada.jpg', 'IMAGEM SO DA METROLABS')], interna: true }));
  ok(a.rep('s_gil', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img('valvula.jpg', 'IMAGEM PUBLICA DA GALERIA')] }));
  ok(a.rep('s_beto.beta', 'enviarImagens', { refTipo: 'CHAMADO', refId: k.c.id, imagens: [img('visor.jpg', 'IMAGEM DA REPRESENTADA NA GALERIA')] }));
  a.mudar('2026-10-20T10:00:00-03:00');
  const dr = ok(a.rep('s_beto.beta', 'relatorioAtendimento', { id: k.c.id })).documento;
  const hr = a.html(dr.htmlUrl.split('/').pop());
  assert.ok(hr.includes('IMAGEM PUBLICA DA GALERIA'));
  assert.ok(hr.includes('IMAGEM DA REPRESENTADA NA GALERIA'));
  assert.ok(!hr.includes('IMAGEM SO DA METROLABS'), 'imagem interna nunca sai na versão da representada');
  assert.ok(hr.includes('prazo de 3 dias úteis'), 'quadro da capa com a duração do prazo');
  assert.ok(/\.rd-texto p\{text-align:justify/.test(hr), 'texto corrido justificado');
  assert.ok(dr.pdfUrl.startsWith('/arquivos/'));
  const hm = a.html(ok(a.rep('s_gil', 'relatorioAtendimento', { id: k.c.id, publico: 'INTERNO' })).documento.htmlUrl.split('/').pop());
  assert.ok(hm.includes('IMAGEM SO DA METROLABS'));
  assert.ok(hm.includes('3 dias úteis (prazo da representada para estudar o caso e agendar)'));
  // período: os dois lados geram e baixam (HTML e PDF), cada um no seu escopo
  const pr = ok(a.rep('s_beto.beta', 'relatorioPeriodo', { dias: 30 })).documento;
  const hpr = a.html(pr.htmlUrl.split('/').pop());
  assert.ok(pr.pdfUrl && hpr.includes(k.c.numero));
  assert.ok(!hpr.includes('REPRESENTADA ALFA TESTE'));
  const pm = ok(a.rep('s_gil', 'relatorioPeriodo', { dias: 30 })).documento;
  assert.ok(pm.htmlUrl && pm.pdfUrl);
  const docsRep = ok(a.rep('s_beto.beta', 'documentos', {})).documentos;
  assert.ok(docsRep.length >= 2 && docsRep.every((d) => d.publico === 'REPRESENTADA'));
});
