// Processo do chamado da representada (16/11/2026; ESPEC_FLUXO_REPRESENTACAO.md, decisões D1 a D13, e ESPEC_LINHA_DO_TEMPO.md):
// o chamado de representada nunca encerra sozinho ao fechar a O.S.; laudo por rodada, decisão da representada (ou da Metrolabs em
// nome dela com evidência), execução, confirmação do encerramento com prazo, dossiê uma vez; marcos com ordem, evidências,
// peças e testes; avisos; regularização do caso real. Código real do SGO+ (tests/_assistencia_ambiente.cjs). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA, chamadoAgendado, em } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js',
  'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Regua.js', 'SGO_Representacao_Midia.js', 'SGO_Representacao_Fluxo.js', 'SGO_Representacao_Marcos.js'];
const foto = (nome) => ({ nome: nome || 'foto.jpg', tipo: 'image/jpeg', base64: FOTO });
const PDF = { nome: 'email-da-fabrica.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 e-mail da fabrica').toString('base64') };
const CHECK = { sintomas_confirmados: 'Confirmado com o cliente', risco_operar: 'Baixo', diagnostico_preliminar: 'Falha de cavitação' };
const PREPARO = { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: false, pecasJustificativa: 'visita de diagnóstico', risco: 'baixo' };
const ev = (tipo, osId, n, dados, quando) => ({ tipo, osId, idLocal: 'rf-' + osId + '-' + String(n).padStart(4, '0'), em: quando || '2026-10-20T09:10:00', dados: dados || {} });
const sync = (a, eventos) => a.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });

function amb(op) {
  const a = ambiente(Object.assign({ extras: EXTRAS }, op || {}));
  a.tabelas.REP_REPRESENTADAS = [{ ID: 'repB', NOME: 'BRASMEDICAL TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '', CONTATO_NOME: 'Comercial Teste', CONTATO_EMAIL: 'comercial@brasmedical.exemplo.test' },
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }];
  const us = [
    { ID: 'rb_adm', USUARIO: 'qualidade', NOME: 'QUALIDADE BRASMEDICAL TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'qualidade@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'atendente', NOME: 'ATENDENTE BRASMEDICAL TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'atendente@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' },
    { ID: 'rb_fin', USUARIO: 'garantia', NOME: 'GARANTIA BRASMEDICAL TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'garantia@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'FINANCEIRO' },
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.api('s_dora', 'iniciar', {});
  a.rep = (sid, acao, d) => { const r = a.ctx.Representacao_api(sid, acao, d || {}); if (a.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
  return a;
}
const linha = (a, id) => a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === id);
/** Pedido da Brasmedical aceito (chamado com o prazo da representada), triado e agendado para 20/10 09:00. */
function chamadoRep(a) {
  ok(a.rep('s_qualidade', 'buscarCliente', { documento: '11.222.333/0001-81' }));
  ok(a.rep('s_qualidade', 'buscarEquipamento', { clienteId: 'c1', serie: 'S-200' }));
  const p = ok(a.rep('s_qualidade', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', protocolo: 'BM-9', setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777',
    contatoEmail: 'rui@alfa.exemplo.test', sintoma: 'Lavadora com falha de cavitação e ruído no ciclo.', inicio: 'ontem', codigoErro: 'E04', parada: 'TOTAL', risco: 'Sem lavagem', tentado: 'Religamos',
    enquadramento: 'GARANTIA', fotos: [foto()], fotosEtiqueta: [foto('e.jpg')] })).solicitacao;
  a.mudar('2026-10-19T11:00:00-03:00');
  const c = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: p.id, prioridade: 'P2' })).chamado;
  ok(a.api('s_gil', 'triagem', { id: c.id, checklist: CHECK, acao: 'PLANEJADO', tipoCodigo: 'MANUTENCAO_CORRETIVA' }));
  const ag = ok(a.api('s_gil', 'agendar', { id: c.id, tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 90, tipoCodigo: 'MANUTENCAO_CORRETIVA', preparo: PREPARO }));
  return { c, os: ag.os };
}
/** O.S. documentada e encerrada pelo aplicativo. */
function encerrarOs(a, osId) {
  a.mudar('2026-10-20T10:40:00-03:00');
  ok(sync(a, [ev('CHEGUEI', osId, 1, {}, '2026-10-20T09:05:00'), ev('RESPOSTA', osId, 2, { perguntaId: 'identificado', valor: 'SIM' }), ev('RESPOSTA', osId, 3, { perguntaId: 'defeito', valor: 'Transdutor sem cavitação' }),
    ev('RESPOSTA', osId, 4, { perguntaId: 'teste_ok', valor: 'NAO' }), ev('RESPOSTA', osId, 5, { perguntaId: 'liberado', valor: 'NAO' }),
    ev('RELATO', osId, 6, { condicaoEncontrada: 'Sem cavitação no teste da folha', causa: 'Transdutor', servicoRealizado: 'Inspeção e testes; aguardo orientação do fabricante', testeFuncional: 'Folha de alumínio sem perfuração', serieConfirmada: 'S-200', identificadoPor: 'SERIE' })]));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(a.app('Ast_appEnviarFoto', 's_tiago', { osId, idLocal: 'rff-' + i + '-' + osId, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-10-20T09:30:00' })));
  const r = ok(sync(a, [ev('ASSINATURA', osId, 7, { nome: 'Rui Responsável Teste', documento: '', imagem: ASSINATURA }), ev('CONCLUI', osId, 8, {}, '2026-10-20T10:30:00')]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0]).slice(0, 300));
}
/** Foto e vídeo da galeria do chamado já liberados à representada (o vídeo sobe pela rota do servidor; aqui, a linha pronta). */
function midias(a, c, pub) {
  const base = { REPRESENTADA_ID: 'repB', REF_TIPO: 'CHAMADO', REF_ID: c.id, PUBLICO: pub || 'REPRESENTADA', POR_LADO: 'METROLABS', POR_NOME: 'GIL GESTOR TECNICO TESTE', EM: '2026-10-20T10:35:00', SHA256: 'abcdef0123456789' };
  a.tabelas.REP_ANEXOS = a.tabelas.REP_ANEXOS || [];
  a.tabelas.REP_ANEXOS.push(Object.assign({ ID: 'img-' + c.id, TIPO: 'IMAGEM', NOME: 'falha.jpg', MIME: 'image/jpeg', ARQUIVO_ID: 'arq-img', LEGENDA: 'Folha de alumínio sem perfuração' }, base),
    Object.assign({ ID: 'vid-' + c.id, TIPO: 'VIDEO', NOME: 'falha.mp4', MIME: 'video/mp4', ARQUIVO_ID: 'arq-vid', LEGENDA: 'Ciclo com ruído e sem cavitação' }, base));
  return ['AN:img-' + c.id, 'AN:vid-' + c.id];
}
const LAUDO = (c, fotos, extra) => Object.assign({ id: c.id, testes: 'Teste da folha de alumínio: sem perfuração (esperado: perfurações uniformes). Corrente do gerador 0,2 A (esperado 1,1 A).', defeito: 'Sem cavitação no tanque.', causa: 'FABRICACAO',
  recomendacao: 'Troca do transdutor em garantia.', pecas: 'TR-25 Transdutor 40 kHz', pergunta: 'Aprovar a troca do transdutor em garantia?', situacaoEq: 'PARADO', risco: 'NAO', fotos }, extra || {});
/** Processo até "aguardando a decisão": O.S. encerrada -> laudo enviado. */
function ateDecisao(a) {
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  const f = midias(a, k.c);
  a.mudar('2026-10-20T11:00:00-03:00');
  ok(a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, f)));
  return Object.assign(k, { fotos: f });
}
const proc = (a, sid, id) => j(ok(a.rep(sid, 'processo', { id })).processo);
/** Objetos que vêm do contexto isolado viram objetos daqui (deepEqual compara o protótipo). */
const j = (x) => JSON.parse(JSON.stringify(x));

test('1 e 15: O.S. encerrada de chamado de representada vai ao laudo (nunca a "Encerrado"); AT08 diz "o caso segue"; chamado comum continua encerrando com o texto de sempre', () => {
  const a = amb();
  const k = chamadoRep(a);
  const antes = a.emails.length;
  encerrarOs(a, k.os.id);
  assert.equal(linha(a, k.c.id).SITUACAO, 'LAUDO');
  assert.equal(linha(a, k.c.id).ENCERRADO_EM || '', '');
  const novos = a.emails.slice(antes);
  assert.ok(novos.some((e) => /Visita técnica concluída/.test(e.subject) && /O caso segue em análise; avisaremos o próximo passo/.test(e.body)), 'AT08 com o texto novo');
  assert.ok(!novos.some((e) => /Atendimento concluído/.test(e.subject)), 'sem "Atendimento concluído" ao cliente');
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === k.c.id && e.TIPO === 'MARCO' && /\[M11\]/.test(e.TEXTO)), 'marco M11');
  // regressão: chamado comum
  const b = amb();
  const comum = chamadoAgendado(b, { inicio: '2026-10-20T09:00' });
  const ab = b.emails.length;
  encerrarOs(b, comum.os.id);
  assert.equal(b.tabelas.ATEC_CHAMADOS.find((x) => x.ID === comum.chamado.id).SITUACAO, 'ENCERRADO');
  assert.ok(b.emails.slice(ab).some((e) => /Atendimento concluído: O.S./.test(e.subject)), 'texto de sempre no chamado comum');
});

test('2 e 3: Laudo e Aguardando a representada não vão a "Encerrado"; o encerramento é recusado com cada falta nomeada', () => {
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  const mudar = (para) => { const eu = a.ctx.Ast_eu_('s_gil'); a.ctx.Ast_memoLimpar_(); return a.ctx.Ast_comTrava_(() => a.ctx.AstC_mudar_(eu, a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), para, {}, 'X', 'x')); };
  assert.throws(() => mudar('ENCERRADO'), /não encerra direto de "Laudo técnico em elaboração".*Processo do chamado/);
  const f = midias(a, k.c); ok(a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, f)));
  assert.throws(() => mudar('ENCERRADO'), /não encerra direto de "Aguardando a decisão da representada"/);
  const faltas = a.ctx.RepF_faltasEncerrar_(a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), Date.now()).filter((x) => !x.feito).map((x) => x.k);
  assert.deepEqual(j(faltas), ['decisao', 'cliente', 'representada']);
});

test('5: "Ver prévia" não grava documento, não cria evento e não manda e-mail (dos dois lados)', () => {
  const a = amb();
  const k = chamadoRep(a);
  const d0 = (a.tabelas.REP_DOCUMENTOS || []).length, e0 = a.tabelas.ATEC_EVENTOS.length, m0 = a.emails.length;
  const r1 = ok(a.rep('s_gil', 'previaAtendimento', { id: k.c.id, publico: 'REPRESENTADA' }));
  const r2 = ok(a.rep('s_qualidade', 'previaAtendimento', { id: k.c.id }));
  assert.ok(r1.previa && /<html/i.test(r1.html) && r2.previa);
  assert.equal((a.tabelas.REP_DOCUMENTOS || []).length, d0); assert.equal(a.tabelas.ATEC_EVENTOS.length, e0); assert.equal(a.emails.length, m0);
});

test('6 e 11: laudo enviado grava LAUDO (representada e interno), REP_DECISOES com prazo em dias úteis, evento público, RP13 e pausa o prazo da Metrolabs; exige 1 foto e 1 vídeo e a pergunta de tecnovigilância', () => {
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  const f = midias(a, k.c);
  a.mudar('2026-10-20T11:00:00-03:00');
  const sem = a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, [f[0]], { risco: '' }));
  assert.equal(sem.ok, false); assert.deepEqual(j(sem.faltam.map((x) => x.campo).sort()), ['laudo_fotos', 'laudo_risco']);
  const antes = a.emails.length;
  ok(a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, f)));
  const docs = a.tabelas.REP_DOCUMENTOS.filter((d) => d.CHAMADO_ID === k.c.id && d.TIPO === 'LAUDO');
  assert.deepEqual(docs.map((d) => d.PUBLICO).sort(), ['INTERNO', 'REPRESENTADA']); assert.equal(docs[0].NUMERO, 'LTR-' + linha(a, k.c.id).NUMERO.replace('CH-', '') + '-1');
  const dec = a.tabelas.REP_DECISOES.find((d) => d.CHAMADO_ID === k.c.id);
  assert.equal(dec.RODADA, 1); assert.equal(Date.parse(dec.PRAZO_ATE + '-03:00'), a.ctx.Ast_somarMinUteis_(em('2026-10-20T11:00:00-03:00'), 5 * 570));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_REPRESENTADA');
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === k.c.id && e.TIPO === 'LAUDO_ENVIADO' && e.PUBLICO === 'REPRESENTADA'));
  assert.ok(a.tabelas.NTF_ENVIOS.some((n) => n.EVENTO === 'RP13' && n.REF_ID === k.c.id), 'RP13 em NTF_ENVIOS');
  assert.ok(a.emails.slice(antes).some((e) => e.to === 'qualidade@brasmedical.exemplo.test' && /Sua decisão é necessária/.test(e.subject)));
  a.mudar('2026-11-05T10:00:00-03:00');
  a.ctx.Ast_memoLimpar_();
  const s = a.ctx.Ast_slaEstado_(a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), a.relogio.agora);
  assert.notEqual(s.estado, 'ESTOURADO'); assert.equal(s.estado, 'PAUSADO');
  assert.equal(proc(a, 's_gil', k.c.id).comQuem.lado, 'REPRESENTADA');
});

test('7 e 10: decisão pelo Atendente recusada; pelo Financeiro de garantia aceita; em nome dela sem evidência recusada; outra representada não acha o chamado', () => {
  const a = amb();
  const k = ateDecisao(a);
  const D = { id: k.c.id, resultado: 'APROVADA', acoes: ['PECA_FABRICANTE'], peca: 'TR-25', protocolo: 'RMA-777' };
  assert.match(a.rep('s_atendente', 'decidir', D).message, /Administrador e do Financeiro de garantia/);
  assert.match(a.rep('s_ana.alfa', 'decidir', D).message, /Não encontramos este registro/);
  assert.match(a.rep('s_ana.alfa', 'processo', { id: k.c.id }).message, /Não encontramos este registro/);
  const semEv = a.rep('s_gil', 'decidirEmNome', Object.assign({ canal: 'EMAIL', informadoPor: 'Carla Brasmedical' }, D));
  assert.equal(semEv.ok, false); assert.ok(semEv.faltam.some((x) => x.campo === 'dec_evidencia'));
  ok(a.rep('s_garantia', 'decidir', D));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_PECA');
  assert.equal(a.tabelas.REP_DECISOES.find((d) => d.CHAMADO_ID === k.c.id).RESULTADO, 'APROVADA');
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === k.c.id && e.PUBLICO === 'SIM' && /Coberto pela garantia do fabricante/.test(e.TEXTO) && !/BRASMEDICAL/i.test(e.TEXTO)), 'D5: frase ao cliente sem o nome');
});

test('4 (D4): decisão em nome da representada com o e-mail anexado é aceita e fica com canal e evidência', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_gil', 'decidirEmNome', { id: k.c.id, resultado: 'NEGADA', acoes: ['ORCAMENTO'], orcamentoPara: 'CLIENTE', motivo: 'Uso fora do manual: detergente não indicado danificou o transdutor.', canal: 'EMAIL', informadoPor: 'Carla Brasmedical', evidencia: PDF }));
  const d = a.tabelas.REP_DECISOES.find((x) => x.CHAMADO_ID === k.c.id);
  assert.equal(d.POR_LADO, 'METROLABS'); assert.equal(d.CANAL, 'EMAIL'); assert.ok(d.EVIDENCIA_ANEXO_ID); assert.equal(d.ORCAMENTO_PARA, 'CLIENTE');
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ORCAMENTO');
});

test('8: "mais informação" abre a rodada 2 e volta ao laudo; o laudo v2 sai com o número da rodada 2', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'MAIS_INFORMACAO', pergunta: 'Enviar o vídeo do teste com o tanque cheio e a corrente do gerador.' }));
  assert.equal(linha(a, k.c.id).SITUACAO, 'LAUDO');
  const p = proc(a, 's_gil', k.c.id);
  assert.equal(p.rodada, 2); assert.match(p.perguntaRepresentada, /tanque cheio/);
  ok(a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, k.fotos, { pergunta: 'Com o vídeo pedido: aprovar a troca do transdutor em garantia?' })));
  assert.ok(a.tabelas.REP_DOCUMENTOS.some((d) => d.CHAMADO_ID === k.c.id && d.TIPO === 'LAUDO' && /-2$/.test(d.NUMERO)));
});

test('9: garantia negada com orçamento ao cliente; orçamento recusado com o equipamento no cliente leva à confirmação do encerramento', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'NEGADA', acoes: ['ORCAMENTO'], orcamentoPara: 'CLIENTE', motivo: 'Dano externo: queda constatada nas fotos do laudo.' }));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ORCAMENTO');
  const acao = proc(a, 's_gil', k.c.id).acoes.find((x) => x.codigo === 'ORCAMENTO');
  ok(a.rep('s_gil', 'concluirAcao', { id: k.c.id, acaoId: acao.id, resultado: 'RECUSADO', obs: 'Cliente recusou o orçamento por telefone.' }));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ENCERRAMENTO');
});

test('4 (D7) e 16: confirmação vencida por prazo encerra como PRAZO e gera o dossiê uma vez (três versões; a do cliente sem o nome da representada); repetir a rotina não gera outro', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'APROVADA', acoes: ['NENHUMA'], textoCliente: 'Coberto pela garantia da BRASMEDICAL TESTE; sem ação.' }));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ENCERRAMENTO');
  ok(a.api('s_cliente.alfa', 'confirmarAtendimento', { id: k.c.id }));
  assert.equal(linha(a, k.c.id).CLIENTE_ACEITE_TIPO, 'CONFIRMADO'); assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ENCERRAMENTO');
  a.mudar('2026-11-03T10:00:00-03:00');
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  assert.equal(linha(a, k.c.id).SITUACAO, 'ENCERRADO'); assert.equal(linha(a, k.c.id).REP_ACEITE_TIPO, 'PRAZO');
  const dos = () => a.tabelas.REP_DOCUMENTOS.filter((d) => d.CHAMADO_ID === k.c.id && d.TIPO === 'DOSSIE');
  assert.deepEqual(dos().map((d) => d.PUBLICO).sort(), ['CLIENTE', 'INTERNO', 'REPRESENTADA']);
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  assert.equal(dos().length, 3, 'uma vez só');
  const html = (d) => { const id = d.HTML_ID; return a.arquivos[id] ? a.arquivos[id].bytes.toString('utf8') : ''; };
  const hc = html(dos().find((d) => d.PUBLICO === 'CLIENTE')), hi = html(dos().find((d) => d.PUBLICO === 'INTERNO'));
  assert.ok(hc && !/BRASMEDICAL/i.test(hc), 'cliente sem o nome da representada');
  // 16/11/2026 (dossiê único): seções do dossiê definitivo (Montagem e testes virou Reparo + Testes; conclusão técnica; controle e rastreabilidade)
  for (const sec of ['Resumo executivo', 'Identificação do serviço', 'Linha do tempo', 'Diagnóstico e laudos', 'Decisões do fabricante', 'Peças', 'Reparo', 'Testes', 'Evidências fotográficas', 'Logística e guarda', 'Documentos relacionados', 'Confirmações e assinaturas', 'Conclusão técnica', 'Controle e rastreabilidade do documento']) assert.ok(hi.includes(sec), 'seção ' + sec);
  assert.ok(a.tabelas.NTF_ENVIOS.some((n) => n.EVENTO === 'AT27' && n.REF_ID === k.c.id), 'L9: dossiê ao hospital por e-mail');
  // a linha do tempo do dossiê está em ordem
  const L = a.ctx.RepF_linha_(a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), 'INTERNO').map((x) => x.emIso);
  assert.deepEqual(L, L.slice().sort());
});

test('12: regularização (D9) só do dono/Administrador/Diretoria, com motivo; reabre no laudo sem perder histórico, sem reincidência e sem reenviar e-mail antigo', () => {
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  // simula o encerramento antigo (antes desta versão)
  Object.assign(linha(a, k.c.id), { SITUACAO: 'ENCERRADO', ENCERRADO_EM: '2026-10-20T10:31:00' });
  a.tabelas.ATEC_CONFIG.push({ ID: 'cfg-fluxo', CHAVE: 'REP_FLUXO_DESDE', VALOR_JSON: JSON.stringify('2026-10-21T00:00:00'), VERSAO: 1 });
  a.mudar('2026-10-22T10:00:00-03:00');
  const ev0 = a.tabelas.ATEC_EVENTOS.length, m0 = a.emails.length, ch0 = a.tabelas.ATEC_CHAMADOS.length;
  assert.match(a.rep('s_gil', 'regularizar', { chamadoId: k.c.id, motivo: 'Encerrado automaticamente antes da decisão do fabricante.' }).message, /só do dono, do Administrador e da Diretoria/);
  const curto = a.rep('s_dora', 'regularizar', { chamadoId: k.c.id, motivo: 'curto' });
  assert.equal(curto.ok, false); assert.ok(curto.faltam.some((x) => x.campo === 'rg_motivo'));
  ok(a.ctx.Representacao_regularizarChamado('s_dora', { chamadoNumero: linha(a, k.c.id).NUMERO, motivo: 'Encerrado automaticamente ao fechar a O.S., antes da decisão do fabricante.',
    retirada: { em: '2026-10-20T10:35', porNome: 'Tiago Técnico Teste', termoMotivo: 'Retirada feita no fim da visita, sem termo impresso.' }, bancada: { texto: 'Bancada: folha de alumínio sem perfuração; aguardo orientação do fabricante.', em: '2026-10-21T09:00' } }));
  const c = linha(a, k.c.id);
  assert.equal(c.SITUACAO, 'LAUDO'); assert.equal(c.ENCERRADO_EM, ''); assert.ok(c.REGULARIZADO_EM);
  assert.equal(a.tabelas.ATEC_CHAMADOS.length, ch0, 'nenhum chamado novo (sem reincidência)');
  assert.ok(a.tabelas.ATEC_EVENTOS.slice(0, ev0).every((e, i) => e === a.tabelas.ATEC_EVENTOS[i]), 'histórico anterior intacto');
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'REGULARIZACAO' && /REABERTO PARA O FLUXO NOVO/.test(e.TEXTO) && /20\/10\/2026 10:31/.test(e.TEXTO)));
  assert.equal(a.emails.length, m0, 'nenhum e-mail (destino laudo)');
  const p = proc(a, 's_gil', k.c.id);
  assert.equal(p.guarda.onde, 'OFICINA'); assert.equal(p.guarda.comTermo, false);
  assert.ok(p.pendencias.some((x) => x.tipo === 'TERMO_RETIRADA'));
  assert.deepEqual(p.marcos.map((x) => x.cod).filter((x) => /^M1[1-5]$/.test(x)), ['M11', 'M12', 'M13', 'M14', 'M15']);
  // não gera prazo vencido retroativo: o laudo regularizado tem o prazo contado da regularização
  a.ctx.Ast_memoLimpar_();
  assert.notEqual(a.ctx.Ast_slaEstado_(a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), a.relogio.agora).estado, 'ESTOURADO');
  // chamado comum não é regularizável
  const b = amb(); const comum = chamadoAgendado(b, { inicio: '2026-10-20T09:00' }); encerrarOs(b, comum.os.id);
  assert.match(b.rep('s_dora', 'regularizar', { chamadoId: comum.chamado.id, motivo: 'Teste com chamado comum que não muda.' }).message, /não é de representada/);
});

test('12b (correção do dono, CH-2026-0030): regularizar para "aguardando a orientação do fabricante" sobre o relatório já recebido, com o prazo contado de hoje', () => {
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  ok(a.rep('s_gil', 'relatorioAtendimento', { id: k.c.id, publico: 'REPRESENTADA' })); // como aconteceu em 12/11 (RAT ...-R)
  Object.assign(linha(a, k.c.id), { SITUACAO: 'ENCERRADO', ENCERRADO_EM: '2026-10-20T10:31:00' });
  a.tabelas.ATEC_CONFIG.push({ ID: 'cfg-fluxo', CHAVE: 'REP_FLUXO_DESDE', VALOR_JSON: JSON.stringify('2026-10-21T00:00:00'), VERSAO: 1 });
  a.mudar('2026-10-22T10:00:00-03:00');
  const r = ok(a.rep('s_dora', 'regularizar', { chamadoId: k.c.id, destino: 'AGUARDANDO_REPRESENTADA', pergunta: 'Qual a orientação do fabricante: troca do transdutor em garantia, envio de peça ou envio à fábrica?',
    motivo: 'Encerrado automaticamente; o equipamento está na oficina aguardando a orientação do fabricante.', retirada: { em: '2026-10-20T10:35', porNome: 'Tiago Técnico Teste', termoMotivo: 'Sem termo impresso na visita.' } }));
  assert.match(r.message, /Aguardando a orientação\/decisão do fabricante/);
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_REPRESENTADA');
  const d = a.tabelas.REP_DECISOES.find((x) => x.CHAMADO_ID === k.c.id);
  assert.ok(Date.parse(d.PRAZO_ATE + '-03:00') > em('2026-10-28T00:00:00-03:00'), 'prazo de 5 dias úteis a partir da regularização');
  assert.ok(proc(a, 's_gil', k.c.id).marcos.some((x) => x.cod === 'M20'));
});

test('13 (F11): representada sem conta ativa: o aviso fica PULADO em NTF_ENVIOS e a central mostra "rep_sem_conta"', () => {
  const a = amb();
  const k = chamadoRep(a);
  a.tabelas.CAD_USUARIOS.filter((u) => u.REPRESENTADA_ID === 'repB').forEach((u) => { u.STATUS = 'INATIVO'; });
  a.ctx.Ast_memoLimpar_(); a.ctx.Rep_memoLimpar_();
  a.ctx.Rep_avisarRepresentada_('repB', '', 'Teste', 'Texto', k.c.id, 'RP06');
  assert.ok(a.tabelas.NTF_ENVIOS.some((n) => n.SITUACAO === 'PULADO' && /sem conta ativa/i.test(n.MOTIVO)), JSON.stringify(a.tabelas.NTF_ENVIOS.slice(-2)));
  assert.ok(a.pend('s_gil').some((p) => /REP:SEMCONTA:repB/.test(p.id)));
});

test('14: as situações novas não são "em campo" e o técnico não as escolhe', () => {
  const a = amb();
  for (const s of ['LAUDO', 'AGUARDANDO_REPRESENTADA', 'AGUARDANDO_ENCERRAMENTO']) assert.equal(a.ctx.AST_EM_CAMPO.indexOf(s), -1);
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  assert.match(a.rep('s_tiago', 'enviarLaudo', LAUDO(k.c, [])).message, /gestão da área Técnica e por quem responde pela representação/);
  // chamado comum: as situações da representada nunca entram nas transições
  assert.deepEqual(j(a.ctx.Ast_transicoesDe_({}, 'DOC_PENDENTE')), ['ENCERRADO', 'EM_TRIAGEM']);
});

test('marcos: fora de ordem recusado com a falta nomeada; sem evidência recusado; vídeo obrigatório nos testes; reprovado abre a rodada 2 de peças sem apagar a 1; 2ª reprovação avisa a gestão', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'APROVADA', acoes: ['PECA_FABRICANTE'], peca: 'TR-25' }));
  const fora = a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M44', testes: [] });
  assert.equal(fora.ok, false); assert.match(fora.message, /falta antes um destes passos: M42/);
  const semFoto = a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M30', pecas: 'TR-25 | Transdutor 40 kHz | 1', devolverFabrica: 'SIM' });
  ok(semFoto); // M30 não exige foto
  const p1 = proc(a, 's_gil', k.c.id).pecas;
  assert.equal(p1.length, 1); assert.equal(p1[0].rodada, 1);
  ok(a.rep('s_qualidade', 'marcar', { id: k.c.id, cod: 'M32', rastreio: 'BR123', transportadora: 'Transportadora Teste' }));
  const conf = a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M33', conferencia: [{ id: p1[0].id, confere: true, serieLote: 'L-1' }] });
  assert.equal(conf.ok, false); assert.ok(conf.faltam.some((x) => x.campo === 'mk_midias'), 'M33 exige fotos');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M33', conferencia: [{ id: p1[0].id, confere: true, serieLote: 'L-1' }], arquivos: [Object.assign(foto('emb.jpg'), { legenda: 'Embalagem fechada', publico: 'REPRESENTADA' }), Object.assign(foto('pc.jpg'), { legenda: 'Peça com o código', publico: 'REPRESENTADA' })] }));
  assert.equal(linha(a, k.c.id).SITUACAO, 'PLANEJADO');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M40', arquivos: [Object.assign(foto('antes.jpg'), { legenda: 'Antes: transdutor antigo' })] }));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M41', instaladas: 'TR-25 lote L-1', arquivos: [Object.assign(foto('depois.jpg'), { legenda: 'Depois: transdutor novo' })] }));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M42' }));
  const roteiro = a.ctx.REPM_ROTEIRO_PADRAO;
  const testes = (aprov) => roteiro.map((t, i) => ({ teste: t, valor: i === 4 ? (aprov ? 'Perfurações uniformes' : 'Sem perfuração') : 'Conforme', aprovado: aprov || i !== 4 }));
  const semVideo = a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M43', testes: testes(false), decisao: 'PECAS' });
  assert.equal(semVideo.ok, false); assert.match(semVideo.message, /vídeo é obrigatório/);
  const vid = { midias: [{ id: 'vid-' + k.c.id, legenda: 'Teste reprovado: sem cavitação', publico: 'REPRESENTADA' }] };
  ok(a.rep('s_gil', 'marcar', Object.assign({ id: k.c.id, cod: 'M43', testes: testes(false), decisao: 'PECAS' }, vid)));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_PECA');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M30', pecas: 'GER-1 | Placa do gerador | 1', devolverFabrica: 'NAO' }));
  const pp = proc(a, 's_gil', k.c.id).pecas;
  assert.deepEqual(pp.map((x) => x.rodada), [1, 2], 'rodada 2 sem apagar a 1');
  const p2 = pp.find((x) => x.rodada === 2);
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M33', conferencia: [{ id: p2.id, confere: true }], arquivos: [Object.assign(foto('e2.jpg'), { legenda: 'Embalagem' }), Object.assign(foto('p2.jpg'), { legenda: 'Placa' })] }));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M42' }));
  const av0 = a.tabelas.ATEC_AVISOS.length;
  ok(a.rep('s_gil', 'marcar', Object.assign({ id: k.c.id, cod: 'M43', testes: testes(false), decisao: 'AVALIACAO' }, vid)));
  assert.ok(a.tabelas.ATEC_AVISOS.slice(av0).some((x) => /2ª reprovação/.test(x.TITULO) && x.DESTINATARIO_ID === 'u_gt'), 'L7');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M42' }));
  const incompleto = a.rep('s_gil', 'marcar', Object.assign({ id: k.c.id, cod: 'M44', testes: testes(true).slice(0, 3) }, vid));
  assert.equal(incompleto.ok, false); assert.match(incompleto.message, /faltam testes do roteiro/);
  ok(a.rep('s_gil', 'marcar', Object.assign({ id: k.c.id, cod: 'M44', testes: testes(true) }, vid)));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M45', liberadoUso: 'SIM', responsavel: 'Gil Gestor Teste' }));
  // equipamento no cliente (reparo no local), ações concluídas: vai para a confirmação
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ENCERRAMENTO');
});

test('caminho comum: visita -> retirada (M12 com termo não colhido) -> conferência -> bancada -> laudo -> decisão -> devolução obrigatória antes de encerrar', () => {
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  const semMotivo = a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M12', dataFato: '2026-10-20T10:40', quemRetirou: 'Tiago Técnico Teste', acessorios: 'Cesto e tampa', termo: 'NAO_COLHIDO', arquivos: [Object.assign(foto(), { legenda: 'Frente' })] });
  assert.equal(semMotivo.ok, false); assert.ok(semMotivo.faltam.some((x) => x.campo === 'mk_termoMotivo'));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M12', dataFato: '2026-10-20T10:40', quemRetirou: 'Tiago Técnico Teste', acessorios: 'Cesto e tampa', termo: 'NAO_COLHIDO', termoMotivo: 'Responsável ausente; colher na devolução.', arquivos: [Object.assign(foto(), { legenda: 'Frente' })] }));
  a.mudar('2026-10-20T16:00:00-03:00');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M13', dataFato: '2026-10-20T15:00', serieConfere: 'SIM', acessoriosConferem: 'SIM', avariaTransporte: 'NAO', arquivos: [Object.assign(foto(), { legenda: 'Chegada' })] }));
  assert.equal(proc(a, 's_gil', k.c.id).guarda.onde, 'OFICINA');
  const f = midias(a, k.c);
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M14', texto: 'Teste de cavitação e corrente do gerador.', defeitoFuncional: 'SIM', midias: [{ id: f[1].slice(3), legenda: 'Falha reproduzida' }] }));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M15', texto: 'Transdutor sem cavitação.', liberadoUso: 'NAO' }));
  ok(a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, f)));
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'APROVADA', acoes: ['REPARO_OFICINA'] }));
  const p = proc(a, 's_gil', k.c.id);
  assert.ok(p.acoes.some((x) => x.codigo === 'DEVOLVER' && x.situacao === 'ABERTA'), 'devolução incluída sozinha (equipamento na oficina)');
  const rep = p.acoes.find((x) => x.codigo === 'REPARO_OFICINA');
  ok(a.rep('s_gil', 'concluirAcao', { id: k.c.id, acaoId: rep.id, obs: 'Transdutor trocado na oficina.' }));
  const dev = proc(a, 's_gil', k.c.id).acoes.find((x) => x.codigo === 'DEVOLVER');
  assert.match(a.rep('s_gil', 'concluirAcao', { id: k.c.id, acaoId: dev.id, obs: 'Entregue.' }).message, /ainda está na oficina/);
  assert.notEqual(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_ENCERRAMENTO');
});

test('avisos dos marcos: informativos agrupados em um aviso; WhatsApp só a contato com consentimento, com teto; sem modelo aprovado, só e-mail', () => {
  const a = amb({ props: { WA_TESTE: '1' } });
  const k = ateDecisao(a);
  const sem = a.rep('s_qualidade', 'salvarContatosAviso', { contatos: [{ nome: 'Carla Garantia Teste', email: 'carla@brasmedical.exemplo.test', celular: '62999990000', whatsapp: true }] });
  assert.equal(sem.ok, false); assert.ok(sem.faltam.some((x) => /ct_aceito/.test(x.campo)));
  ok(a.rep('s_qualidade', 'salvarContatosAviso', { contatos: [{ nome: 'Carla Garantia Teste', email: 'carla@brasmedical.exemplo.test', celular: '62999990000', whatsapp: true, aceito: true }, { nome: 'Davi Sem Consentimento', email: 'davi@brasmedical.exemplo.test' }] }));
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'APROVADA', acoes: ['PECA_FABRICANTE'], peca: 'TR-25' }));
  a.mudar('2026-10-20T14:00:00-03:00');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M30', pecas: 'TR-25 | Transdutor | 1', devolverFabrica: 'SIM' }));
  a.ctx.Ast_memoLimpar_(); a.ctx.RepM_rotinaAvisos_(a.relogio.agora); // sai o que já estava na fila (a decisão, de 11:00)
  const m0 = a.emails.length;
  // dois marcos informativos em sequência ficam na fila e saem num aviso só depois de 30 min
  const p1 = proc(a, 's_gil', k.c.id).pecas[0];
  ok(a.rep('s_qualidade', 'marcar', { id: k.c.id, cod: 'M31', previsao: '2026-10-25' }));
  ok(a.rep('s_qualidade', 'marcar', { id: k.c.id, cod: 'M32', rastreio: 'BR999' }));
  a.ctx.Ast_memoLimpar_(); a.ctx.RepM_rotinaAvisos_(a.relogio.agora);
  assert.equal(a.emails.slice(m0).filter((e) => /\(chamado|: CH-/.test(e.subject) && e.to === 'carla@brasmedical.exemplo.test').length, 0, 'antes de 30 min nada sai');
  a.mudar('2026-10-20T14:40:00-03:00');
  a.ctx.Ast_memoLimpar_(); a.ctx.RepM_rotinaAvisos_(a.relogio.agora);
  const paraCarla = a.emails.slice(m0).filter((e) => e.to === 'carla@brasmedical.exemplo.test');
  assert.equal(paraCarla.length, 1, 'um e-mail agrupado'); assert.match(paraCarla[0].subject, /\(\+1\)/);
  assert.ok(p1);
  // WhatsApp: modelo não aprovado = PULADO com o motivo; o contato sem consentimento não entra no WhatsApp
  const wa = a.tabelas.NTF_ENVIOS.filter((n) => n.CANAL === 'whatsapp' && /REPWA_/.test(n.USUARIO_ID));
  assert.ok(wa.length >= 1); assert.ok(wa.every((n) => !/Davi/.test(n.USUARIO_NOME)));
  // fora do expediente nada sai
  a.mudar('2026-10-20T19:00:00-03:00');
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M33', conferencia: [{ id: p1.id, confere: true }], arquivos: [Object.assign(foto('e.jpg'), { legenda: 'Emb' }), Object.assign(foto('p.jpg'), { legenda: 'Peça' })] }));
  const m1 = a.emails.length;
  a.mudar('2026-10-20T20:00:00-03:00'); a.ctx.Ast_memoLimpar_(); a.ctx.RepM_rotinaAvisos_(a.relogio.agora);
  assert.equal(a.emails.slice(m1).filter((e) => e.to === 'carla@brasmedical.exemplo.test').length, 0, 'fora do expediente fica para o próximo dia útil');
  a.mudar('2026-10-21T08:05:00-03:00'); a.ctx.Ast_memoLimpar_(); a.ctx.RepM_rotinaAvisos_(a.relogio.agora);
  assert.equal(a.emails.slice(m1).filter((e) => e.to === 'carla@brasmedical.exemplo.test').length, 1);
  // o hospital nunca recebe o nome da representada
  assert.ok(a.emails.filter((e) => e.to === 'rui@alfa.exemplo.test').every((e) => !/BRASMEDICAL/i.test(e.subject + e.body)));
});

test('rotina da decisão: lembrete 1 dia útil antes, vencimento ao contato comercial, escalada à gestão (RP16) em 3 dias úteis e à Diretoria em 10; nunca encerra sozinho', () => {
  const a = amb();
  const k = ateDecisao(a);
  const roda = (iso) => { a.mudar(iso); a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora); };
  roda('2026-10-26T12:00:00-03:00');
  assert.ok(a.emails.some((e) => /Lembrete: decisão do laudo/.test(e.subject)));
  roda('2026-10-28T10:00:00-03:00');
  assert.ok(a.emails.some((e) => e.to === 'comercial@brasmedical.exemplo.test' && /Prazo da decisão vencido/.test(e.subject)));
  roda('2026-11-03T10:00:00-03:00');
  assert.ok(a.tabelas.ATEC_AVISOS.some((x) => x.TIPO === 'REP_DECISAO_VENCIDA' && x.DESTINATARIO_ID === 'u_gt'));
  roda('2026-11-12T10:00:00-03:00');
  assert.ok(a.tabelas.ATEC_AVISOS.some((x) => x.TIPO === 'REP_DECISAO_VENCIDA' && x.DESTINATARIO_ID === 'u_dir' && /10 dias úteis/.test(x.TITULO)));
  assert.equal(linha(a, k.c.id).SITUACAO, 'AGUARDANDO_REPRESENTADA');
});

test('"o problema continua" na confirmação volta à triagem no mesmo chamado (sem chamado novo)', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'APROVADA', acoes: ['NENHUMA'] }));
  const n0 = a.tabelas.ATEC_CHAMADOS.length;
  ok(a.rep('s_atendente', 'confirmarEncerramento', { id: k.c.id, confirmo: false, texto: 'O ruído voltou no segundo ciclo.' }));
  assert.equal(linha(a, k.c.id).SITUACAO, 'EM_TRIAGEM'); assert.equal(a.tabelas.ATEC_CHAMADOS.length, n0);
});

// Telas em Chromium real (quando o Playwright do sgo_servidor está instalado): o quadro "Processo do chamado" nos dois lados, com os
// estilos do SGO+ (UI_Estilos.html e o bloco de estilos da Assistência), a 1366, 390 e 320 px, sem rolagem lateral. Capturas em
// output/representacao-fluxo-20261116/capturas (ou na pasta de CAPTURAS do pacote).
test('telas: processo do chamado (Metrolabs e representada) e o formulário do laudo a 1366, 390 e 320 px, sem rolagem lateral', async (t) => {
  const path = require('node:path'), fs = require('node:fs');
  let chromium;
  try { chromium = require(path.join(__dirname, '..', '..', 'sgo_servidor', 'node_modules', 'playwright')).chromium; } catch (e) { t.skip('Playwright indisponível'); return; }
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M12', dataFato: '2026-10-20T10:40', quemRetirou: 'Tiago Técnico Teste', acessorios: 'Cesto e tampa', termo: 'NAO_COLHIDO', termoMotivo: 'Responsável ausente; colher na devolução.', arquivos: [Object.assign(foto(), { legenda: 'Frente' })] }));
  const f = midias(a, k.c);
  const pLaudo = j(ok(a.rep('s_gil', 'processo', { id: k.c.id })).processo);
  a.mudar('2026-10-20T11:00:00-03:00');
  ok(a.rep('s_gil', 'enviarLaudo', LAUDO(k.c, f)));
  const pMet = j(ok(a.rep('s_gil', 'processo', { id: k.c.id })).processo), pRep = j(ok(a.rep('s_qualidade', 'processo', { id: k.c.id })).processo);
  const LEG = path.resolve(process.env.DEST || path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db'));
  const ler = (n) => fs.readFileSync(path.join(LEG, n), 'utf8');
  const estilos = ler('UI_Estilos.html'), estAst = (ler('JS_Assistencia.html').match(/<style>[\s\S]*?<\/style>/) || [''])[0], js = ler('JS_Representacao.html');
  const saida = path.resolve(process.env.CAPTURAS ? path.join(process.env.CAPTURAS, '..', '..', 'representacao-fluxo-20261116', 'capturas') : path.join(__dirname, '../output/representacao-fluxo-20261116/capturas'));
  fs.mkdirSync(saida, { recursive: true });
  const pagina = (g, lado, abrirLaudo) => '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + estilos + estAst +
    '<script>var SESSION="x";function escapeHtml_(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}var google={script:{run:{withSuccessHandler:function(){return this;},withFailureHandler:function(){return this;},Representacao_api:function(){}}}};</script>' +
    '</head><body style="margin:0;padding:16px;box-sizing:border-box"><div class="module-shell"><div id="caixa" class="at-caixa"></div></div>' + js +
    '<script>Rp_processoRender_(document.getElementById("caixa"),' + JSON.stringify(g) + ',"' + k.c.id + '","' + lado + '");' + (abrirLaudo ? 'RpF_acao_("laudo");' : '') + '</script></body></html>';
  const nav = await chromium.launch();
  try {
    for (const [nome, g, lado, laudo] of [['metrolabs-aguardando', pMet, 'METROLABS'], ['representada-decisao', pRep, 'REPRESENTADA'], ['metrolabs-laudo', pLaudo, 'METROLABS', true]]) {
      for (const larg of [1366, 390, 320]) {
        const pg = await nav.newPage({ viewport: { width: larg, height: 900 } });
        await pg.setContent(pagina(g, lado, laudo));
        const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(sw <= larg, nome + ' a ' + larg + ' px: rolagem lateral (' + sw + ')');
        assert.ok(await pg.evaluate(() => /Próximo passo com/.test(document.body.innerText) && /Passo a passo/.test(document.body.innerText)));
        await pg.screenshot({ path: path.join(saida, nome + '-' + larg + '.png'), fullPage: larg !== 1366 });
        await pg.close();
      }
    }
  } finally { await nav.close(); }
});

test('visão do hospital: nunca o nome da representada nem de pessoas dela (portal, relatórios gerados, dossiê, e-mails, prévia, linha do tempo), mesmo com o encerramento disparado pela representada', () => {
  const a = amb();
  const k = ateDecisao(a);
  ok(a.rep('s_qualidade', 'decidir', { id: k.c.id, resultado: 'APROVADA', acoes: ['NENHUMA'], textoCliente: 'A QUALIDADE BRASMEDICAL TESTE aprovou a garantia.' }));
  ok(a.api('s_cliente.alfa', 'confirmarAtendimento', { id: k.c.id }));
  ok(a.rep('s_qualidade', 'confirmarEncerramento', { id: k.c.id, confirmo: true })); // quem dispara o encerramento é a representada
  assert.equal(linha(a, k.c.id).SITUACAO, 'ENCERRADO');
  const proibido = /BRASMEDICAL|QUALIDADE|ATENDENTE BRASMEDICAL|GARANTIA BRASMEDICAL/i;
  const docs = a.tabelas.REP_DOCUMENTOS.filter((d) => d.CHAMADO_ID === k.c.id && d.TIPO === 'DOSSIE');
  assert.ok(docs.every((d) => d.GERADO_POR_LADO === 'METROLABS' && d.GERADO_POR_NOME === 'Metrolabs'), 'dossiê emitido pela Metrolabs');
  const portal = JSON.stringify(ok(a.api('s_cliente.alfa', 'portal', {})));
  const gerados = JSON.stringify(ok(a.api('s_cliente.alfa', 'documentosGerados', {})));
  const hc = a.arquivos[docs.find((d) => d.PUBLICO === 'CLIENTE').HTML_ID].bytes.toString('utf8');
  const n0 = (a.tabelas.REP_DOCUMENTOS || []).length;
  const prev = ok(a.api('s_cliente.alfa', 'relatorioAtendimento', { id: k.c.id }));
  assert.equal((a.tabelas.REP_DOCUMENTOS || []).length, n0, 'no chamado de representada o hospital vê só a prévia');
  const linhaCli = JSON.stringify(a.ctx.RepF_linha_(a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), 'CLIENTE'));
  const emails = a.emails.filter((e) => e.to === 'rui@alfa.exemplo.test' || e.to === 'compras@alfa.exemplo.test').map((e) => e.subject + e.body).join('\n');
  for (const [nome, txt] of [['portal', portal], ['relatórios gerados', gerados], ['dossiê do cliente', hc], ['prévia', prev.html], ['linha do tempo', linhaCli], ['e-mails ao hospital', emails]]) assert.ok(!proibido.test(txt), nome + ': ' + (txt.match(proibido) || [''])[0]);
  assert.ok(/Seu equipamento está no seu hospital/.test(portal));
});

test('passo a passo pela data do fato: a visita é datada pela chegada do técnico; o registrado depois mostra "registrado em"', () => {
  const a = amb();
  const k = chamadoRep(a); encerrarOs(a, k.os.id);
  a.mudar('2026-10-21T10:00:00-03:00');
  ok(a.rep('s_gil', 'bancada', { id: k.c.id, texto: 'Bancada: transdutor sem cavitação; aguardo orientação do fabricante.', em: '2026-10-20T15:00' }));
  ok(a.rep('s_gil', 'marcar', { id: k.c.id, cod: 'M12', dataFato: '2026-10-20T10:35', quemRetirou: 'Tiago Técnico Teste', acessorios: 'Cesto', termo: 'NAO_COLHIDO', termoMotivo: 'Sem termo impresso na visita.', arquivos: [Object.assign(foto(), { legenda: 'Frente' })] }));
  const p = proc(a, 's_gil', k.c.id);
  const m11 = p.marcos.find((x) => x.cod === 'M11');
  assert.equal(m11.dataFato, '20/10/2026 09:05', 'chegada do técnico'); assert.match(m11.resumo, /O\.S\. concluída em/);
  assert.deepEqual(p.marcos.map((x) => x.cod).slice(0, 2), ['M11', 'M12']);
  const L = a.ctx.RepF_linha_(a.ctx.Ast_porId_('ATEC_CHAMADOS', k.c.id), 'INTERNO').filter((x) => x.marco);
  assert.deepEqual(j(L.map((x) => x.marco)), ['M11', 'M12']);
  assert.match(L[1].texto, /registrado em 21\/10\/2026/);
});
