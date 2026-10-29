// Módulo Representação (29/10/2026): visão da representada (perfil REPRESENTADA) e da Metrolabs, isolamento entre duas
// representadas, busca só por documento completo e série exata, cadastro com "Ciente", pedido na fila da Assistência,
// complemento, aceite, recusa, conversa com nota interna, linha do tempo com três públicos e alertas de prazo.
// Código real do SGO+ no ambiente da Assistência (tests/_assistencia_ambiente.cjs). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js'];
const CNPJ_A = '11.444.777/0001-61', CNPJ_B = '04.252.011/0001-10';
const foto = (nome) => ({ nome: nome || 'foto.jpg', tipo: 'image/jpeg', base64: FOTO });

function amb(extra) {
  const a = ambiente(Object.assign({ extras: EXTRAS }, extra || {}));
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }
  ];
  a.tabelas.REP_MODELOS = [
    { ID: 'mA', REPRESENTADA_ID: 'repA', CODIGO: 'AC21', NOME: 'AUTOCLAVE ALFA 21', TIPO_EQUIPAMENTO: 'Autoclave', GARANTIA_MESES: 12, ATIVO: 'SIM' },
    { ID: 'mB', REPRESENTADA_ID: 'repB', CODIGO: 'LV10', NOME: 'LAVADORA BETA 10', TIPO_EQUIPAMENTO: 'Lavadora ultrassônica', GARANTIA_MESES: 24, ATIVO: 'SIM' }
  ];
  const us = [
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'beto.beta', NOME: 'BETO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' },
    { ID: 'rb_le', USUARIO: 'lia.beta', NOME: 'LIA BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'lia@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'LEITURA' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  return a;
}
const CLIENTE_B = { RAZAO_SOCIAL: 'HOSPITAL SIGILOSO BETA LTDA', CNPJ: CNPJ_B, CEP: '74000-000', LOGRADOURO: 'Rua Beta', NUMERO: '10', BAIRRO: 'Centro', CIDADE: 'Goiânia', UF: 'GO',
  CONTATO: 'Carla Contato Teste', EMAIL: 'carla@hospbeta.exemplo.test', TELEFONE: '(62) 99999-0000', CIENTE: true };
const RELATO = { setor: 'CME', contatoNome: 'Carla Contato Teste', contatoTelefone: '62999990000', contatoEmail: 'carla@hospbeta.exemplo.test', sintoma: 'A lavadora não aquece a água e para no meio do ciclo com alarme sonoro.',
  inicio: 'ontem à tarde', codigoErro: 'E07', parada: 'TOTAL', risco: 'Sem lavagem do instrumental', tentado: 'Religamos o equipamento', enquadramento: 'GARANTIA' };

/** B cadastra cliente, equipamento e abre o pedido; a Metrolabs aceita e conversa (com nota interna). */
function cenarioB(a) {
  const cli = ok(a.rep('s_beto.beta', 'cadastrarCliente', { dados: CLIENTE_B })).cliente;
  const eq = ok(a.rep('s_beto.beta', 'cadastrarEquipamento', { clienteId: cli.id, unidadeId: cli.unidades[0].id, modeloCodigo: 'LV10', serie: 'SERIE-SIGILO-B1', dataInstalacao: '2026-03-10', ciente: true, fotoEtiqueta: foto('etq.jpg') })).equipamento;
  const sol = ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: cli.id, unidadeId: cli.unidades[0].id, equipamentoId: eq.id, fotos: [foto()], fotosEtiqueta: [foto('etq2.jpg')] }, RELATO))).solicitacao;
  ok(a.rep('s_beto.beta', 'enviarMensagem', { refTipo: 'SOLICITACAO', refId: sol.id, texto: 'MENSAGEM SIGILOSA DA BETA' }));
  const ac = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: sol.id, prioridade: 'P2' }));
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: ac.chamado.id, texto: 'NOTA INTERNA SIGILOSA', interna: true }));
  a.tabelas.ATEC_ORCAMENTOS = [{ ID: 'orcB', CHAMADO_ID: ac.chamado.id, NUMERO: 'OA-SIGILO', VALOR_TOTAL: 98765.43, SITUACAO: 'EMITIDO' }];
  return { cli, eq, sol, chamado: ac.chamado, anexos: a.tabelas.REP_ANEXOS.filter((x) => x.REPRESENTADA_ID === 'repB') };
}

test('isolamento: a representada A não lê, por nenhuma ação do módulo, chamado, pedido, anexo, mensagem, cliente, equipamento ou valor da B', () => {
  const a = amb();
  const b = cenarioB(a);
  assert.ok(b.anexos.length >= 3);
  const sentinelas = ['HOSPITAL SIGILOSO', 'SERIE-SIGILO-B1', 'MENSAGEM SIGILOSA', 'NOTA INTERNA SIGILOSA', '98765', b.chamado.numero, b.sol.numero].concat(b.anexos.map((x) => x.ARQUIVO_ID));
  const tentativas = [];
  const ids = [b.chamado.id, b.sol.id, b.cli.id, b.eq.id, 'repB'];
  for (const acao of Object.keys(a.ctx.REP_ACOES_REPRESENTADA)) {
    tentativas.push([acao, {}]);
    for (const id of ids) {
      for (const tipo of ['CHAMADO', 'SOLICITACAO', 'GERAL', 'EQUIPAMENTO']) {
        tentativas.push([acao, { id, tipo, refTipo: tipo, refId: id, clienteId: b.cli.id, unidadeId: b.cli.unidades[0].id, equipamentoId: b.eq.id, documento: CNPJ_B, serie: 'SERIE-SIGILO-B1', texto: 'tentativa de leitura', motivo: 'tentativa de cancelamento indevido', resposta: 'tentativa de resposta indevida' }]);
      }
    }
  }
  // a busca por CNPJ completo e série exata acha o cadastro (é a regra: quem tem o documento do cliente chega a ele);
  // aqui ela roda sem documento e sem série, e logo abaixo, de propósito, com eles
  const semBusca = (acao, d) => /^buscar/.test(acao) ? Object.assign({}, d, { documento: '', serie: '' }) : d;
  for (const [acao, d0] of tentativas) {
    const d = semBusca(acao, d0);
    const r = a.rep('s_ana.alfa', acao, d);
    const txt = JSON.stringify(r);
    for (const s of sentinelas) assert.ok(!txt.includes(s), `${acao} ${JSON.stringify(d).slice(0, 80)} devolveu "${s}": ${txt.slice(0, 300)}`);
  }
  // mesmo achando o cliente e o equipamento pela busca exata, a A não chega aos pedidos, chamados nem conversas da B
  delete a.cache.REP_BUSCAS_ra_adm; // as tentativas acima (consulta da Receita) contaram no limite de buscas
  assert.equal(ok(a.rep('s_ana.alfa', 'buscarCliente', { documento: CNPJ_B })).encontrado, true);
  assert.equal(ok(a.rep('s_ana.alfa', 'buscarEquipamento', { clienteId: b.cli.id, serie: 'SERIE-SIGILO-B1' })).encontrado, true);
  for (const [acao, d] of [['chamados', {}], ['inicio', {}], ['chamado', { tipo: 'CHAMADO', id: b.chamado.id }], ['chamado', { tipo: 'SOLICITACAO', id: b.sol.id }],
    ['mensagens', { refTipo: 'CHAMADO', refId: b.chamado.id }], ['mensagens', { refTipo: 'SOLICITACAO', refId: b.sol.id }], ['mensagens', { refTipo: 'EQUIPAMENTO', refId: b.eq.id }], ['equipamentos', {}]]) {
    const txt = JSON.stringify(a.rep('s_ana.alfa', acao, d));
    for (const s of ['MENSAGEM SIGILOSA', 'NOTA INTERNA SIGILOSA', '98765', b.chamado.numero, b.sol.numero].concat(b.anexos.map((x) => x.ARQUIVO_ID))) assert.ok(!txt.includes(s), acao + ' devolveu ' + s);
  }
  // nada da B foi alterado pela A
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((c) => c.ID === b.chamado.id).SITUACAO, 'ABERTO');
  assert.equal(a.tabelas.REP_MENSAGENS.filter((m) => m.AUTOR_ID === 'ra_adm' && (m.REPRESENTADA_ID !== 'repA' || m.REF_TIPO !== 'GERAL')).length, 0); // só caiu no canal geral da própria A
  // arquivo: a B abre o anexo dela; a A não abre (rota /arquivos do servidor)
  const arq = b.anexos[0].ARQUIVO_ID;
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', arq), true);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', arq), false);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_gil', arq), false); // colaborador interno usa o /arquivos normal
  // a própria B não vê nota interna nem valor
  const fichaB = JSON.stringify(ok(a.rep('s_beto.beta', 'chamado', { tipo: 'CHAMADO', id: b.chamado.id })));
  assert.ok(fichaB.includes('MENSAGEM SIGILOSA DA BETA'));
  assert.ok(!fichaB.includes('NOTA INTERNA SIGILOSA'));
  assert.ok(!fichaB.includes('98765'));
});

test('a sessão REPRESENTADA não entra na Assistência técnica nem nas ações internas do módulo; o colaborador não usa as ações da representada', () => {
  const a = amb();
  const r = a.api('s_beto.beta', 'lista', {});
  assert.equal(r.ok, false); assert.equal(r.semAcesso, true);
  assert.equal(a.ctx.Ast_nivelDe_({ perfil: 'REPRESENTADA', id: 'rb_at' }).nivel, 'NENHUM');
  assert.equal(a.ctx.Ast_nivelDe_({ perfil: 'REPRESENTADA' }).interno, false);
  for (const acao of ['solicitacoes', 'aceitar', 'recusar', 'complemento', 'salvarRepresentada', 'acessos', 'usuarios', 'conversas']) {
    const x = a.rep('s_beto.beta', acao, {});
    assert.equal(x.ok, false, acao); assert.match(x.message, /desconhecida/);
  }
  assert.match(a.rep('s_gil', 'buscarCliente', { documento: CNPJ_A }).message, /desconhecida/);
  // cliente do portal também não entra no módulo interno
  assert.equal(a.rep('s_cliente.alfa', 'solicitacoes', {}).ok, false);
});

test('busca: só CNPJ ou CPF completo e válido; série exata no cliente; mesma forma de resposta e limite para achou e não achou', () => {
  const a = amb();
  assert.match(a.rep('s_ana.alfa', 'buscarCliente', { documento: '11222333' }).message, /completo/);
  assert.match(a.rep('s_ana.alfa', 'buscarCliente', { documento: 'HOSPITAL' }).message, /completo/);
  const achou = ok(a.rep('s_ana.alfa', 'buscarCliente', { documento: '11222333000181' }));
  assert.equal(achou.encontrado, true); assert.equal(achou.cliente.razaoSocial, 'HOSPITAL TESTE ALFA LTDA');
  assert.deepEqual(Object.keys(achou.cliente).sort(), ['cidade', 'id', 'razaoSocial', 'uf', 'unidades']);
  const nao = ok(a.rep('s_ana.alfa', 'buscarCliente', { documento: CNPJ_A }));
  assert.equal(nao.encontrado, false);
  // série: no cliente achado; série de outro cliente avisa sem dizer qual
  ok(a.rep('s_ana.alfa', 'buscarCliente', { documento: '11222333000181' }));
  assert.equal(ok(a.rep('s_ana.alfa', 'buscarEquipamento', { clienteId: 'c1', serie: 's-100' })).encontrado, true);
  const outro = ok(a.rep('s_ana.alfa', 'buscarEquipamento', { clienteId: 'c1', serie: 'S-300' }));
  assert.equal(outro.outroCliente, true); assert.ok(!JSON.stringify(outro).includes('BETA'));
  // cliente não consultado nesta sessão não pode ser usado
  assert.equal(a.rep('s_ana.alfa', 'buscarEquipamento', { clienteId: 'c2', serie: 'S-300' }).ok, false);
  // limite: 20 buscas em 15 minutos, contando as que acharam e as que não
  let bloqueou = null;
  for (let i = 0; i < 25 && !bloqueou; i++) { const x = a.rep('s_ana.alfa', 'buscarCliente', { documento: i % 2 ? '11222333000181' : CNPJ_A }); if (!x.ok) bloqueou = x; }
  assert.ok(bloqueou); assert.equal(bloqueou.codigo, 'LIMITE'); assert.match(bloqueou.message, /espere \d+ minuto/);
  assert.ok(a.tabelas.REP_ACESSOS.some((x) => x.ACAO === 'BUSCA_CLIENTE' && /11222333000181/.test(x.DETALHE)));
});

test('cadastro pela representada: completo, com "Ciente", origem REPRESENTADA e histórico; documento repetido não cria outro', () => {
  const a = amb();
  const inc = a.rep('s_beto.beta', 'cadastrarCliente', { dados: Object.assign({}, CLIENTE_B, { EMAIL: '', CEP: '' }) });
  assert.equal(inc.ok, false); assert.equal(inc.codigo, 'INCOMPLETO');
  assert.ok(inc.faltam.some((f) => f.campo === 'EMAIL')); assert.ok(inc.faltam.some((f) => f.campo === 'CEP'));
  const semCiente = a.rep('s_beto.beta', 'cadastrarCliente', { dados: Object.assign({}, CLIENTE_B, { CIENTE: false }) });
  assert.equal(semCiente.codigo, 'SEM_CIENTE');
  const c = ok(a.rep('s_beto.beta', 'cadastrarCliente', { dados: CLIENTE_B }));
  const reg = a.tabelas.CAD_CLIENTES.find((x) => x.ID === c.cliente.id);
  assert.equal(reg.ORIGEM, 'REPRESENTADA'); assert.equal(reg.ORIGEM_REPRESENTADA_ID, 'repB'); assert.match(reg.CIENTE_POR_NOME, /BETO BETA TESTE \(REPRESENTADA BETA TESTE\)/);
  assert.equal(c.cliente.unidades.length, 1);
  assert.ok(a.tabelas.HIST_CADASTROS.some((h) => h.ENTIDADE === 'CLIENTE' && h.ACAO === 'CRIAR' && h.PERFIL === 'REPRESENTADA' && /Representação/.test(h.ORIGEM)));
  assert.equal(a.rep('s_beto.beta', 'cadastrarCliente', { dados: CLIENTE_B }).codigo, 'JA_EXISTE');
  // equipamento: modelo do catálogo dela, foto da etiqueta e garantia calculada
  const sem = a.rep('s_beto.beta', 'cadastrarEquipamento', { clienteId: c.cliente.id, unidadeId: c.cliente.unidades[0].id, modeloCodigo: 'AC21', serie: 'X1', ciente: true });
  assert.equal(sem.ok, false); assert.ok(sem.faltam.some((f) => f.campo === 'modeloCodigo')); assert.ok(sem.faltam.some((f) => f.campo === 'fotoEtiqueta'));
  const eq = ok(a.rep('s_beto.beta', 'cadastrarEquipamento', { clienteId: c.cliente.id, unidadeId: c.cliente.unidades[0].id, modeloCodigo: 'LV10', serie: 'BT-555', dataInstalacao: '2026-01-31', ciente: true, fotoEtiqueta: foto() }));
  const e = a.tabelas.CAD_EQUIPAMENTOS.find((x) => x.ID === eq.equipamento.id);
  assert.equal(e.GARANTIA_ATE, '2028-01-31'); assert.equal(e.FABRICANTE, 'REPRESENTADA BETA TESTE'); assert.equal(e.ORIGEM_REPRESENTADA_ID, 'repB'); assert.ok(e.FOTO_ETIQUETA_ARQUIVO_ID);
  assert.equal(eq.equipamento.garantia.estado, 'EM_GARANTIA');
  assert.equal(a.rep('s_beto.beta', 'cadastrarEquipamento', { clienteId: c.cliente.id, unidadeId: c.cliente.unidades[0].id, modeloCodigo: 'LV10', serie: 'bt-555', ciente: true, fotoEtiqueta: foto() }).codigo, 'SERIE_EXISTE');
  // papel Leitura não cadastra nem abre
  assert.equal(a.rep('s_lia.beta', 'cadastrarCliente', { dados: CLIENTE_B }).codigo, 'PAPEL');
  assert.equal(a.rep('s_lia.beta', 'abrir', {}).codigo, 'PAPEL');
});

test('pedido: relato obrigatório, fila da Assistência com REPRESENTADA_ID; complemento pausa; aceite vira chamado; recusa avisa', () => {
  const a = amb();
  const c = ok(a.rep('s_beto.beta', 'cadastrarCliente', { dados: CLIENTE_B })).cliente;
  const eq = ok(a.rep('s_beto.beta', 'cadastrarEquipamento', { clienteId: c.id, unidadeId: c.unidades[0].id, modeloCodigo: 'LV10', serie: 'BT-1', ciente: true, fotoEtiqueta: foto() })).equipamento;
  const falta = a.rep('s_beto.beta', 'abrir', { clienteId: c.id, unidadeId: c.unidades[0].id, equipamentoId: eq.id, sintoma: 'curto' });
  assert.equal(falta.ok, false);
  for (const k of ['sintoma', 'setor', 'contatoNome', 'contatoTelefone', 'contatoEmail', 'inicio', 'codigoErro', 'parada', 'risco', 'tentado', 'enquadramento', 'fotos', 'fotosEtiqueta']) assert.ok(falta.faltam.some((f) => f.campo === k), k);
  assert.match(falta.message, /Nada foi gravado/);
  const grande = a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: c.id, unidadeId: c.unidades[0].id, equipamentoId: eq.id, fotos: [{ nome: 'g.jpg', tipo: 'image/jpeg', base64: Buffer.alloc(2.2 * 1024 * 1024).toString('base64') }], fotosEtiqueta: [foto()] }, RELATO));
  assert.match(grande.message, /passa de 2 MB/);
  const sol = ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: c.id, unidadeId: c.unidades[0].id, equipamentoId: eq.id, fotos: [foto()], fotosEtiqueta: [foto()], protocolo: 'BETA-77' }, RELATO))).solicitacao;
  const s = a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === sol.id);
  assert.equal(s.REPRESENTADA_ID, 'repB'); assert.equal(s.ORIGEM, 'REPRESENTACAO'); assert.equal(s.SITUACAO, 'NOVA'); assert.equal(Number(s.ACEITE_MIN_UTEIS), 240);
  assert.ok(a.tabelas.ATV_AVISOS !== undefined);
  assert.ok(a.tabelas.ATEC_AVISOS.some((v) => v.TIPO === 'REP_PEDIDO' && v.DESTINATARIO_ID === 'u_gt')); // sem responsável configurado: quem faz a triagem
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'SOLICITACAO' && e.ENTIDADE_ID === sol.id && e.PUBLICO === 'REPRESENTADA'));
  // a fila interna da Assistência mostra o pedido com a marca da representada
  const fila = ok(a.api('s_gil', 'solicitacoes', {})).solicitacoes;
  assert.equal(fila.find((x) => x.id === sol.id).representadaNome, 'REPRESENTADA BETA TESTE');
  // complemento: pausa o prazo; a representada responde
  ok(a.api('s_gil', 'complemento', { solicitacaoId: sol.id, pergunta: 'Envie a foto do visor com o código de erro' }));
  assert.equal(a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === sol.id).SITUACAO, 'COMPLEMENTO');
  assert.equal(ok(a.rep('s_beto.beta', 'inicio')).pendencias.length, 1);
  assert.ok(a.emails.some((m) => m.to === 'beto@beta.exemplo.test' && /complemento/i.test(m.subject)));
  a.mudar('2026-10-20T10:00:00-03:00');
  assert.equal(a.ctx.Rep_prazoAceite_(a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === sol.id), Date.now()).estado, 'PAUSADO');
  ok(a.rep('s_beto.beta', 'responderComplemento', { id: sol.id, resposta: 'O visor mostra E07 e depois apaga.' }));
  const s2 = a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === sol.id);
  assert.equal(s2.SITUACAO, 'NOVA'); assert.ok(Number(s2.PAUSA_MIN) >= 9 * 60);
  // aceite: chamado com REPRESENTADA_ID, canal Representação; a representada vê a etapa
  const ac = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: sol.id }));
  const ch = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === ac.chamado.id);
  assert.equal(ch.REPRESENTADA_ID, 'repB'); assert.equal(ch.CANAL, 'REPRESENTACAO'); assert.equal(ch.PROTOCOLO_REPRESENTADA, 'BETA-77'); assert.equal(ch.PRIORIDADE, 'P2');
  assert.equal(ac.chamado.representadaNome, 'REPRESENTADA BETA TESTE');
  assert.equal(ok(a.api('s_gil', 'lista', { grupo: 'TODOS', representadaId: 'repB' })).chamados.length, 1);
  assert.equal(ok(a.api('s_gil', 'lista', { grupo: 'TODOS', representadaId: 'repA' })).chamados.length, 0);
  const lista = ok(a.rep('s_beto.beta', 'chamados')).itens;
  assert.equal(lista.length, 1); assert.equal(lista[0].tipo, 'CHAMADO'); assert.equal(lista[0].etapaNome, 'Aceito, em análise');
  const ficha = ok(a.rep('s_beto.beta', 'chamado', { tipo: 'CHAMADO', id: ch.ID }));
  assert.ok(ficha.linhaDoTempo.some((e) => /aceito/i.test(e.texto))); assert.ok(ficha.anexos.length >= 2);
  assert.ok(ficha.linhaDoTempo.every((e) => e.por === 'Metrolabs' || /\(REPRESENTADA BETA TESTE\)$/.test(e.por)));
  assert.ok(a.emails.some((m) => m.to === 'beto@beta.exemplo.test' && /aceito/i.test(m.subject)));
  // aba Representação na ficha do chamado (lado da Metrolabs)
  const aba = ok(a.api('s_gil', 'representacao', { id: ch.ID })).representacao;
  assert.equal(aba.representadaNome, 'REPRESENTADA BETA TESTE'); assert.equal(aba.solicitacao.relato.codigoErro, 'E07');
  // cancelamento pela representada antes da visita, com motivo
  assert.equal(a.rep('s_beto.beta', 'cancelar', { tipo: 'CHAMADO', id: ch.ID, motivo: 'curto' }).ok, false);
  ok(a.rep('s_beto.beta', 'cancelar', { tipo: 'CHAMADO', id: ch.ID, motivo: 'O cliente resolveu com a equipe dele' }));
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === ch.ID).SITUACAO, 'CANCELADO');
  // recusa com motivo: a representada vê o motivo e recebe e-mail
  const sol2 = ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: c.id, unidadeId: c.unidades[0].id, equipamentoId: eq.id, fotos: [foto()], fotosEtiqueta: [foto()] }, RELATO))).solicitacao;
  assert.equal(a.rep('s_gil', 'recusar', { solicitacaoId: sol2.id, motivo: 'curto' }).ok, false);
  ok(a.rep('s_gil', 'recusar', { solicitacaoId: sol2.id, motivo: 'Cliente fora da área de atendimento' }));
  const it = ok(a.rep('s_beto.beta', 'chamados')).itens.find((x) => x.id === sol2.id);
  assert.equal(it.etapaNome, 'Recusado'); assert.equal(it.recusaMotivo, 'Cliente fora da área de atendimento');
});

test('linha do tempo com três públicos: interno, representada e cliente final ("sim" continua valendo como cliente final)', () => {
  const a = amb();
  a.ctx.Ast_evento_('CHAMADO', 'x1', 'T1', { id: 'u', nome: 'N' }, 'interno', {});
  a.ctx.Ast_evento_('CHAMADO', 'x1', 'T2', { id: 'u', nome: 'N' }, 'cliente', { publico: true });
  a.ctx.Ast_evento_('CHAMADO', 'x1', 'T3', { id: 'u', nome: 'N' }, 'representada', { publico: 'REPRESENTADA' });
  const ev = a.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE_ID === 'x1');
  assert.deepEqual(ev.map((e) => e.PUBLICO), ['', 'SIM', 'REPRESENTADA']);
  assert.deepEqual(ev.filter((e) => a.ctx.Ast_sim_(e.PUBLICO)).map((e) => e.TIPO), ['T2']); // o cliente final (relatório) só lê o "SIM"
  assert.deepEqual(a.ctx.Rep_linhaDoTempo_([{ tipo: 'CHAMADO', id: 'x1' }]).map((e) => e.tipo), ['T2', 'T3']);
});

test('conversa: canal geral e por pedido; nota interna fica só com a Metrolabs; leitura incremental', () => {
  const a = amb();
  ok(a.rep('s_ana.alfa', 'enviarMensagem', { refTipo: 'GERAL', texto: 'Precisamos incluir um usuário novo' }));
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'GERAL', refId: 'repA', texto: 'Combinado, cadastramos hoje' }));
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'GERAL', refId: 'repA', texto: 'Conferir contrato antes', interna: true }));
  const m = ok(a.rep('s_ana.alfa', 'mensagens', { refTipo: 'GERAL' })).mensagens;
  assert.deepEqual(m.map((x) => x.texto), ['Precisamos incluir um usuário novo', 'Combinado, cadastramos hoje']);
  const interno = ok(a.rep('s_gil', 'mensagens', { refTipo: 'GERAL', refId: 'repA' })).mensagens;
  assert.equal(interno.length, 3); assert.equal(interno[2].interna, true);
  assert.equal(ok(a.rep('s_ana.alfa', 'mensagens', { refTipo: 'GERAL', depoisDe: a.tabelas.REP_MENSAGENS[1].EM })).mensagens.length, 0);
  assert.ok(a.emails.some((x) => x.to === 'ana@alfa.exemplo.test' && /Mensagem da Metrolabs/.test(x.subject)));
  assert.equal(a.emails.filter((x) => /Conferir contrato/.test(x.body || '')).length, 0);
  assert.equal(ok(a.rep('s_gil', 'conversas', {})).conversas.length, 1);
  // B não vê o canal da A (o canal geral é sempre o da representada da sessão)
  assert.equal(ok(a.rep('s_beto.beta', 'mensagens', { refTipo: 'GERAL', refId: 'repA' })).mensagens.length, 0);
});

test('alertas: 75% do prazo de aceite ao responsável; vencido à gestão e à Caixa de decisões; chamado sem registro em 3 dias úteis', () => {
  const a = amb();
  const regras = JSON.parse(JSON.stringify(a.ctx.AST_REGRAS_PADRAO)); regras.representacao = { responsaveis: ['u_tec2'] };
  a.tabelas.ATEC_CONFIG = [{ ID: 'cfg1', CHAVE: 'REGRAS', VERSAO: 2, VALOR_JSON: JSON.stringify(regras), ATUALIZADO_EM: '2026-10-19T09:00:00' }];
  a.ctx.Ast_regrasInvalidar_();
  const b = cenarioB(a);
  const sol2 = ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: b.cli.id, unidadeId: b.cli.unidades[0].id, equipamentoId: b.eq.id, fotos: [foto()], fotosEtiqueta: [foto()] }, RELATO))).solicitacao;
  assert.ok(a.tabelas.ATEC_AVISOS.some((v) => v.TIPO === 'REP_PEDIDO' && v.DESTINATARIO_ID === 'u_tec2'));
  a.mudar('2026-10-19T13:05:00-03:00'); // 3h05 úteis de 4h: passou de 75%
  assert.equal(a.ctx.Representacao_rotina_(), 1);
  assert.equal(a.ctx.Representacao_rotina_(), 0); // uma vez por marco
  assert.ok(a.tabelas.ATEC_AVISOS.some((v) => v.TIPO === 'REP_ACEITE_RISCO' && v.DESTINATARIO_ID === 'u_tec2'));
  let pend = a.ctx.SGO_Pendencias_listar('s_gil', { semCache: true }).itens;
  assert.ok(pend.some((p) => p.tipo === 'rep_aceite' && p.id === 'REP:ACEITE:' + sol2.id));
  a.mudar('2026-10-19T15:30:00-03:00');
  a.ctx.Representacao_rotina_();
  assert.ok(a.tabelas.ATEC_AVISOS.some((v) => v.TIPO === 'REP_ACEITE_VENCIDO' && v.DESTINATARIO_ID === 'u_gt'));
  pend = a.ctx.SGO_Pendencias_listar('s_gil', { semCache: true }).itens;
  assert.ok(pend.some((p) => p.tipo === 'rep_aceite_vencido'));
  assert.ok(a.ctx.GES_TIPOS.rep_aceite_vencido && a.ctx.GES_TIPOS.rep_sem_registro && !a.ctx.GES_TIPOS.rep_aceite);
  // chamado aceito no dia 19 sem nenhum registro até sexta 24 (4 dias úteis)
  a.mudar('2026-10-24T10:00:00-03:00');
  a.ctx.Representacao_rotina_();
  assert.ok(a.tabelas.ATEC_AVISOS.some((v) => v.TIPO === 'REP_SEM_REGISTRO' && v.REF_ID === b.chamado.id));
  pend = a.ctx.SGO_Pendencias_listar('s_gil', { semCache: true }).itens;
  assert.ok(pend.some((p) => p.tipo === 'rep_sem_registro' && p.id === 'REP:SEMREG:' + b.chamado.id));
  assert.ok(a.ctx.MTZ_PADRAO ? a.ctx.MTZ_PADRAO.some((x) => x.cod === 'RP07') : true);
});

test('Metrolabs: cadastro da representada e do catálogo com validação; só a gestão e os responsáveis', () => {
  const a = amb();
  assert.equal(a.rep('s_tiago', 'salvarRepresentada', { nome: 'NOVA' }).codigo, 'PERFIL');
  const r = a.rep('s_gil', 'salvarRepresentada', { nome: 'BRASMEDICAL TESTE', cnpj: '11.444.777/0001-62', prazos: { aceiteMin: 10 } });
  assert.equal(r.ok, false); assert.ok(r.faltam.some((f) => f.campo === 'cnpj')); assert.ok(r.faltam.some((f) => f.campo === 'aceiteMin'));
  const ok1 = ok(a.rep('s_gil', 'salvarRepresentada', { nome: 'BRASMEDICAL TESTE', cnpj: CNPJ_A, prazos: { aceiteMin: 300 } }));
  assert.equal(ok1.representada.prazos.aceiteMin, 300); assert.equal(ok1.representada.prazos.alertaFracao, 0.75);
  assert.equal(a.rep('s_gil', 'salvarModelo', { representadaId: ok1.representada.id, codigo: 'X', nome: 'Y', tipo: 'Autoclave', garantiaMeses: 1.5 }).ok, false);
  ok(a.rep('s_gil', 'salvarModelo', { representadaId: ok1.representada.id, codigo: 'BM1', nome: 'AUTOCLAVE BM1', tipo: 'Autoclave', garantiaMeses: 12 }));
  assert.equal(ok(a.rep('s_gil', 'modelos', { representadaId: ok1.representada.id })).modelos.length, 1);
  // representada inativa: os usuários dela não abrem o módulo
  ok(a.rep('s_gil', 'salvarRepresentada', { id: 'repB', nome: 'REPRESENTADA BETA TESTE', situacao: 'INATIVA' }));
  assert.equal(a.rep('s_beto.beta', 'inicio').codigo, 'REP_INATIVA');
});
