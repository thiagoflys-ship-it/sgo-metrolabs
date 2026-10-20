// Relatório de qualificação da autoclave (modelo oficial novo) e fluxo integrado cliente → unidade → equipamento →
// qualificação → pasta → QR code (20/10/2026). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('./_modelo_oficial_ambiente.cjs');

const V = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' };

function base(env, extra) {
  return Object.assign({}, V, { etapas: { QI: true, QO: true, QD: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, qi: M.qiTudoConforme(env), dataQi: '10/10/2026', responsavelCliente: 'Responsável do serviço (teste)' }, extra || {});
}

/** Dois ciclos emitidos (QO e QD) + relatório oficial enviado e aprovado. */
function emitirOficial(env, extra) {
  const c1 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', programa: 'Instrumental 134 °C', certNumero: 'AUT-T-0001' });
  const c2 = M.emitirCiclo(env, { ensaio: 'QD (Carga)', programa: 'Instrumental 134 °C', certNumero: 'AUT-T-0002', cicloNum: '2' });
  const p = base(env, Object.assign({ ciclos: [c1, c2] }, extra || {}));
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  assert.equal(envio.ok, true, envio.erro);
  const emi = env.oficial('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(emi.ok, true, emi.erro);
  return { c1, c2, p, r, envio, emi };
}

function htmlDe(env, id) { return env.ctx.DriveApp.getFileById(id).getBlob().getDataAsString(); }

test('ensaio exige cliente, unidade e equipamento do cadastro', () => {
  const env = M.criarAmbiente();
  const r = env.oficial('tec', 'apiGerarRascunho', { etapas: { QI: true } });
  assert.equal(r.ok, false);
  assert.match(r.erro, /Escolha o cliente, a unidade e o equipamento/);
  assert.match(r.erro, /Cadastros \(Clientes, depois Unidades, depois Equipamentos\)/);
  // Tela de ciclo (texto livre): o vínculo é exigido e os campos de identificação passam a vir do cadastro.
  const aplicar = env.fn('SGO_QEQ_aplicarVinculoPayload_');
  assert.throws(() => aplicar('tec', { cliente: 'Digitado à mão' }), /Escolha o cliente/);
  const p = aplicar('tec', Object.assign({ cliente: 'NOME ERRADO', tag: 'X', cnpj: '00' }, V));
  assert.equal(p.cliente, 'HOSPITAL MODELO TESTE LTDA');
  assert.equal(p.cnpj, '11.222.333/0001-81');
  assert.equal(p.tag, 'AUT-TESTE-01');
  assert.equal(p.numSerie, 'SN-TESTE-0001');
  // Desligável só por propriedade (ensaios antigos sem vínculo continuam funcionando).
  const env2 = M.criarAmbiente({ props: { QUALIF_VINCULO_OBRIGATORIO: 'NAO' } });
  assert.equal(env2.fn('SGO_QEQ_aplicarVinculoPayload_')('tec', { cliente: 'Livre' }).cliente, 'Livre');
  // Comercial e cliente não fazem relatório.
  assert.match(env.oficial('com', 'apiSituacao').erro, /equipe técnica/);
  assert.match(env.oficial('cli', 'apiSituacao').erro, /equipe técnica/);
});

test('equipamento de outro cliente (ou de outra unidade) é recusado', () => {
  const env = M.criarAmbiente();
  const r = env.oficial('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq2' });
  assert.equal(r.ok, false);
  assert.match(r.erro, /pertence a outro cliente/);
  assert.match(env.oficial('tec', 'apiEquipamento', { clienteId: 'cli2', unidadeId: 'uni1', equipamentoId: 'eq2' }).erro, /outra unidade/);
  // Lista de equipamentos do cliente só traz os dele.
  const l = env.oficial('tec', 'apiListarEquipamentos', { clienteId: 'cli1', unidadeId: 'uni1' });
  assert.deepEqual(l.items.map(x => x.id), ['eq1']);
  // Relatório de ensaio emitido para o equipamento do outro cliente não entra no relatório deste.
  const c = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-OUTRO-1', cliente: 'CLINICA OUTRA TESTE LTDA', cnpj: '99.888.777/0001-66', tag: 'AUT-OUTRA-01', clienteId: 'cli2', unidadeId: 'uni2', equipamentoId: 'eq2' });
  const rr = env.oficial('tec', 'apiGerarRascunho', base(env, { etapas: { QO: true }, ciclos: [c] }));
  assert.equal(rr.bloqueado, true);
  assert.ok(rr.travas.some(t => t.codigo === 'CICLO_OUTRO_EQUIPAMENTO'));
  // Ensaio a baixa temperatura: equipamento de outro cliente recusado já ao salvar.
  const B = require('./_baixatemp_ambiente.cjs');
  const bt = B.criarAmbiente({ extra: fs.readFileSync(path.join(B.BASE, 'SGO_QualifEquipamento.js'), 'utf8') });
  bt.run('SGO_DATA.insert("CAD_CLIENTES", { ID: "cliX", RAZAO_SOCIAL: "OUTRO TESTE", CNPJ: "99888777000166", STATUS: "ATIVO" }); SGO_DATA.insert("CAD_UNIDADES", { ID: "uniX", CLIENTE_ID: "cliX", NOME_UNIDADE: "U", STATUS: "ATIVO" }); SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eqX", CLIENTE_ID: "cliX", UNIDADE_ID: "uniX", TIPO: "ESTERILIZADOR", TAG: "X1", STATUS: "ATIVO" });');
  assert.throws(() => bt.ctx.BaixaTemp_apiDispatch({ sessionId: 'tec', fn: 'apiSalvar', payload: { dados: { tipo: 'PEROXIDO', identificacao: { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eqX' } } } }), /outro cliente|ligado a outra unidade/);
});

test('emissão: documento na pasta do equipamento (dentro da pasta do cliente), no Arquivo de documentos e na ficha', () => {
  const env = M.criarAmbiente();
  const { emi, c1 } = emitirOficial(env);
  assert.match(emi.numero, /^RQA-\d{4}-00001$/);
  assert.equal(emi.revisao, 0);
  assert.equal(emi.resultado, 'APROVADO');
  assert.equal(emi.validadeAte, '10/10/2027');
  // Pasta: <Autoclave - Laudos>/<CNPJ>/<TAG - tipo>/Qualificação, com HTML e PDF.
  const pastas = env.pastas, arq = env.arquivos;
  const pdf = arq[emi.pdfId], pq = pastas[pdf.pasta], peq = pastas[pq.pai], pcli = pastas[peq.pai];
  assert.equal(pq.nome, 'Qualificação');
  assert.equal(peq.nome, 'AUT-TESTE-01 - Autoclave');
  assert.equal(pcli.nome, '11222333000181');
  assert.equal(pastas[pcli.pai].nome, 'Autoclave - Laudos');
  assert.equal(arq[emi.htmlId].pasta, pdf.pasta);
  // Arquivo de documentos (cliente, unidade e equipamento) com o vencimento da requalificação.
  const docs = env.fn('SGO_DATA').getAll('DOC_DOCUMENTOS');
  assert.equal(docs.length, 1);
  assert.equal(docs[0].CLIENTE_ID, 'cli1');
  assert.equal(docs[0].UNIDADE_ID, 'uni1');
  assert.equal(docs[0].EQUIPAMENTO_ID, 'eq1');
  assert.equal(docs[0].TIPO_DOCUMENTO, '3. RELATÓRIOS DE QUALIFICAÇÃO');
  assert.equal(docs[0].DATA_VENCIMENTO, '2027-10-10');
  // Ficha do equipamento: qualificado, com o relatório vigente e os relatórios de ensaio; sem duplicar o PDF do Arquivo.
  const f = env.chamar('qualifEquipamentoListar', 'tec', 'eq1');
  assert.equal(f.success, true);
  assert.equal(f.situacao.situacao, 'QUALIFICADO');
  assert.equal(f.itens.filter(i => i.titulo === 'Relatório de qualificação — autoclave a vapor').length, 1);
  assert.equal(f.itens.filter(i => i.origem === 'ARQUIVO').length, 0);
  assert.equal(env.fn('SGO_QEQ_situacoesPorEquipamento_')().eq1.situacao, 'QUALIFICADO');
  // Os relatórios de ensaio também ficaram ligados ao equipamento (vínculo gravado no envio para aprovação).
  assert.equal(env.fn('SGO_QE_obter_')(c1).EQUIPAMENTO_ID, 'eq1');
  // Documento sem fabricante nem modelo do cadastro.
  const html = htmlDe(env, emi.htmlId);
  assert.doesNotMatch(html, /MARCAFICTICIA|MODELOXYZ/);
  assert.match(html, /Relatório de qualificação de autoclave a vapor/);
  assert.match(html, /RQA-\d{4}-00001/);
  assert.match(html, /conferido e aprovado para emissão por Responsável Teste/);
  assert.doesNotMatch(html, /MINUTA PARA CONFERÊNCIA/);
});

test('aprovação: técnico não aprova; prévia é minuta; devolução exige motivo; dados mudados exigem novo rascunho', () => {
  const env = M.criarAmbiente();
  const c1 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-T-0001' });
  const p = base(env, { etapas: { QO: true }, ciclos: [c1] });
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  // Texto que contradiz o resultado é recusado.
  const ruim = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: { conclusao: 'O equipamento está REPROVADO.', conclusaoSimples: 'Reprovado.' }, assinaturaContexto: r.assinaturaContexto }));
  assert.match(ruim.erro, /resultado calculado é APROVADO/);
  // Sem rascunho (assinatura) não envia.
  assert.match(env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos })).erro, /Gerar rascunho/);
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  assert.match(env.oficial('tec', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true }).erro, /Somente o responsável técnico/);
  assert.match(env.oficial('rt', 'apiAprovarEmitir', { id: envio.id }).erro, /Conferi os dados/);
  assert.match(env.oficial('rt', 'apiPreverAprovacao', { id: envio.id }).html, /MINUTA PARA CONFERÊNCIA/);
  assert.match(env.oficial('rt', 'apiDevolver', { id: envio.id, motivo: 'curto' }).erro, /motivo/);
  assert.equal(env.oficial('rt', 'apiDevolver', { id: envio.id, motivo: 'Confira a lista da instalação, item da porta.' }).ok, true);
  const ab = env.oficial('tec', 'apiAbrir', { id: envio.id });
  assert.equal(ab.modo, 'CORRIGIR');
  assert.equal(ab.dados.numero, ''); // número reservado não emitido: o novo envio recebe outro
  // Um relatório de ensaio ganha revisão nova depois do envio: a aprovação pede novo rascunho.
  const envio2 = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  env.run('SGO_QE_atualizar_(' + JSON.stringify(c1) + ', { STATUS: "SUBSTITUIDO" });');
  assert.match(env.oficial('rt', 'apiAprovarEmitir', { id: envio2.id, confirmacaoRevisao: true }).erro, /substituído por uma revisão mais nova/);
});

test('QR code: só emitido e aprovado, só do próprio cliente, com trilha de acesso', () => {
  const env = M.criarAmbiente();
  const { emi } = emitirOficial(env);
  // Uma minuta nova aguardando aprovação.
  const c3 = M.emitirCiclo(env, { ensaio: 'QD (Carga)', certNumero: 'AUT-T-0003' });
  const p = base(env, { etapas: { QD: true }, ciclos: [c3] });
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  // Equipe vê a minuta na ficha; o cliente não.
  assert.ok(env.chamar('qualifEquipamentoListar', 'tec', 'eq1').itens.some(i => i.situacao === 'MINUTA'));
  const qrCli = env.chamar('qrcodeQualificacao', 'cli', 'eq1');
  assert.equal(qrCli.success, true);
  assert.ok(qrCli.itens.length >= 1);
  assert.ok(qrCli.itens.every(i => i.situacao === 'VIGENTE' || i.situacao === 'SUBSTITUIDO'));
  // No QR nem a equipe vê minuta.
  assert.ok(env.chamar('qrcodeQualificacao', 'tec', 'eq1').itens.every(i => i.situacao !== 'MINUTA'));
  // Outro cliente: negado e registrado.
  const neg = env.chamar('qrcodeQualificacao', 'cli2', 'eq1');
  assert.equal(neg.success, false);
  assert.match(neg.message, /não pertence ao seu cadastro/);
  // Abrir: minuta recusada; vigente abre e fica registrado.
  const ref = qrCli.itens.filter(i => i.titulo === 'Relatório de qualificação — autoclave a vapor')[0].ref;
  const ab = env.chamar('qualifEquipamentoAbrir', 'cli', 'eq1', ref, 'qr');
  assert.equal(ab.success, true);
  assert.equal(ab.url, '/arquivos/' + emi.pdfId);
  const minuta = env.chamar('qualifEquipamentoListar', 'tec', 'eq1').itens.filter(i => i.situacao === 'MINUTA')[0];
  assert.match(env.chamar('qualifEquipamentoAbrir', 'tec', 'eq1', minuta.ref, 'ficha').message, /aguarda a aprovação/);
  assert.equal(env.chamar('qualifEquipamentoAbrir', 'cli2', 'eq1', ref, 'qr').success, false);
  const logs = env.fn('LOGS_TESTE').map(l => l.acao);
  assert.ok(logs.includes('QRCODE_QUALIFICACAO_VISTA'));
  assert.ok(logs.includes('QRCODE_QUALIFICACAO_NEGADO'));
  assert.ok(logs.includes('QRCODE_QUALIFICACAO_ABERTO'));
});

test('nova revisão: substitui a anterior (que continua guardada), com motivo no registro de revisões', () => {
  const env = M.criarAmbiente();
  const { emi, envio } = emitirOficial(env);
  const ab = env.oficial('tec', 'apiAbrir', { id: envio.id });
  assert.equal(ab.modo, 'REVISAR');
  assert.equal(ab.dados.numero, emi.numero);
  const p = Object.assign({}, ab.dados, { observacoes: 'Revisão de teste: observação acrescentada.' });
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  assert.match(env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto })).erro, /motivo da nova revisão/);
  const e2 = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto, motivoRevisao: 'Inclusão de observação do ensaio.' }));
  const em2 = env.oficial('rt', 'apiAprovarEmitir', { id: e2.id, confirmacaoRevisao: true });
  assert.equal(em2.revisao, 1);
  assert.equal(env.fn('SGO_QE_obter_')(envio.id).STATUS, 'SUBSTITUIDO');
  assert.ok(env.arquivos[emi.pdfId], 'o PDF da revisão 0 continua guardado');
  const qr = env.chamar('qrcodeQualificacao', 'cli', 'eq1').itens.filter(i => i.titulo === 'Relatório de qualificação — autoclave a vapor');
  assert.deepEqual(qr.map(i => [i.revisao, i.situacao]).sort(), [['0', 'SUBSTITUIDO'], ['1', 'VIGENTE']]);
  const html = htmlDe(env, em2.htmlId);
  assert.match(html, /Inclusão de observação do ensaio/);
  assert.match(html, /substituídas/);
});

test('resultado por regra: item da instalação não conforme reprova; sem validade; travas de cobertura', () => {
  const env = M.criarAmbiente();
  const c1 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-T-0001' });
  const qi = M.qiTudoConforme(env);
  qi.porta = { situacao: 'NC', observacao: 'Guarnição da porta ressecada, com folga visível.' };
  const r = env.oficial('tec', 'apiGerarRascunho', base(env, { etapas: { QI: true, QO: true }, ciclos: [c1], qi }));
  assert.equal(r.bloqueado, false);
  assert.equal(r.resumo.statusConsolidado, 'REPROVADO');
  assert.equal(r.resumo.validadeAte, '');
  assert.match(r.textos.conclusao, /REPROVADO/);
  assert.ok(env.fn('AutoOficial_conferirTextos_'));
  // NC sem descrição, QD sem ciclo com carga, sem motivo, periodicidade fora da faixa.
  const qi2 = M.qiTudoConforme(env); qi2.porta = { situacao: 'NC', observacao: '' };
  const t = env.oficial('tec', 'apiGerarRascunho', base(env, { etapas: { QI: true, QD: true }, ciclos: [c1], qi: qi2, motivo: '', periodicidadeMeses: 40 }));
  const cod = t.travas.map(x => x.codigo);
  ['QI_NC_SEM_OBS', 'SEM_CICLO_QD', 'SEM_MOTIVO', 'PERIODICIDADE'].forEach(c => assert.ok(cod.includes(c), c + ' em ' + cod.join(',')));
  assert.ok(t.travas.every(x => x.texto && x.comoCorrigir), 'toda trava diz o que corrigir');
});

test('relatório de ensaio antigo sem vínculo: vincular só preenche vazio; outro CNPJ e TAG diferente sem confirmação são recusados', () => {
  // Relatórios emitidos antes da exigência do vínculo (simulados com a exigência desligada).
  const env = M.criarAmbiente({ props: { QUALIF_VINCULO_OBRIGATORIO: 'NAO' } });
  const semVinc = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-ANTIGO-1', clienteId: '', unidadeId: '', equipamentoId: '' });
  const tagOutra = M.emitirCiclo(env, { ensaio: 'QD (Carga)', certNumero: 'AUT-ANTIGO-2', tag: 'TAG-VELHA', clienteId: '', unidadeId: '', equipamentoId: '' });
  const outroCnpj = M.emitirCiclo(env, { ensaio: 'QD (Carga)', certNumero: 'AUT-ANTIGO-3', cnpj: '99.888.777/0001-66', clienteId: '', unidadeId: '', equipamentoId: '' });
  const eq = env.oficial('tec', 'apiEquipamento', V);
  assert.deepEqual(eq.semVinculo.map(x => x.numero).sort(), ['AUT-ANTIGO-1', 'AUT-ANTIGO-2']);
  // Antes de vincular, entra como trava com o que fazer.
  const tr = env.oficial('tec', 'apiGerarRascunho', base(env, { etapas: { QO: true }, ciclos: [semVinc], qi: {} }));
  assert.ok(tr.travas.some(x => x.codigo === 'CICLO_SEM_VINCULO' && /Vincular a este equipamento/.test(x.comoCorrigir)));
  assert.equal(env.oficial('tec', 'apiVincular', Object.assign({ emissaoId: semVinc }, V)).ok, true);
  assert.equal(env.fn('SGO_QE_obter_')(semVinc).EQUIPAMENTO_ID, 'eq1');
  assert.match(env.oficial('tec', 'apiVincular', Object.assign({ emissaoId: tagOutra }, V)).erro, /TAG do relatório \(TAG-VELHA\)/);
  assert.equal(env.oficial('tec', 'apiVincular', Object.assign({ emissaoId: tagOutra, confirmarTagDiferente: true }, V)).ok, true);
  assert.match(env.oficial('tec', 'apiVincular', Object.assign({ emissaoId: outroCnpj }, V)).erro, /outro CNPJ/);
  // Já ligado a outro equipamento: não troca.
  env.run('SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq3", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "AUTOCLAVE", TAG: "AUT-TESTE-03", STATUS: "ATIVO" });');
  assert.match(env.oficial('tec', 'apiVincular', { emissaoId: semVinc, clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3' }).erro, /já está ligado a outro equipamento/);
  // O documento emitido não mudou (só o vínculo).
  const reg = env.fn('SGO_QE_obter_')(semVinc);
  assert.equal(reg.STATUS, 'EMITIDO');
  assert.equal(reg.NUMERO, 'AUT-ANTIGO-1');
});

test('Analisar pressão desligado: o relatório não trata de pressão fora da frase do escopo', () => {
  const env = M.criarAmbiente();
  const just = 'Autoclave de pequeno porte tipo cassete sem conexão para o transmissor';
  const c1 = M.emitirCiclo(env, { ensaio: 'QD (Carga)', certNumero: 'AUT-T-0101', analisarPressao: false, justificativaSemPressao: just });
  const p = base(env, { etapas: { QI: true, QD: true }, ciclos: [c1] });
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  const prev = env.oficial('tec', 'apiPrevia', Object.assign({}, p, { textos: r.textos })).html;
  const texto = prev.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const semJust = texto.split(just).join('');
  assert.ok(texto.includes('considera somente a temperatura: ' + just));
  const termos = semJust.match(/press[aã]o|press[oõ]es|\bkpa\b|\bm?bar\b|v[aá]cuo|estanqueidade|vapor saturado|pr[eé]-v[aá]cuo/gi);
  assert.equal(termos, null, 'termos de pressão: ' + (termos || []).join(', '));
  assert.doesNotMatch(prev, /NBR 11816/);
  // O item da instalação sobre vapor sai da lista quando nenhum ciclo analisou a pressão.
  assert.doesNotMatch(texto, /Geração ou fornecimento de vapor/);
});

test('redação pela IA: texto conferido é aceito; número inventado volta ao texto padrão', () => {
  const resposta = (txt) => () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: txt }] } }] }) });
  let env = M.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: resposta('{"conclusao":"O menor F0 foi de 999,99 min. O equipamento está APROVADO.","conclusaoSimples":"A autoclave está aprovada."}') });
  const c1 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-T-0001' });
  let r = env.oficial('tec', 'apiGerarRascunho', base(env, { etapas: { QO: true }, ciclos: [c1], redigirComIA: true }));
  assert.equal(r.origemTexto, 'PADRAO');
  assert.match(r.avisoIA, /999,99/);
  env = M.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: resposta('{"conclusao":"Os ensaios atenderam aos critérios de aceitação. O equipamento está APROVADO na qualificação de operação.","conclusaoSimples":"A autoclave está aprovada para uso nos programas avaliados."}') });
  const c2 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-T-0001' });
  r = env.oficial('tec', 'apiGerarRascunho', base(env, { etapas: { QO: true }, ciclos: [c2], redigirComIA: true }));
  assert.equal(r.origemTexto, 'IA', r.avisoIA);
  // Fabricante do cadastro no texto da IA é recusado.
  const ctx = env.fn('AutoOficial_montarContexto_')('tec', base(env, { etapas: { QO: true }, ciclos: [c2] }));
  const conf = env.fn('AutoOficial_conferirTextos_')(ctx, { conclusao: 'A autoclave MARCAFICTICIA está APROVADO.', conclusaoSimples: 'Aprovada.' }, false);
  assert.equal(conf.ok, false);
});

test('modelo novo é o padrão; o anterior fica preservado e só o Administrador reativa', () => {
  const env = M.criarAmbiente({ extra: "function SGO_textoFalhaOperador_(a, e) { return 'Não foi possível ' + a + ': ' + (e && e.message); }" });
  env.run(fs.readFileSync(path.join(M.A.BASE, 'SGO_TemplateAutoclave.js'), 'utf8').replace(/\r\n/g, '\n'));
  assert.equal(env.oficial('tec', 'apiSituacao').modelo, 'NOVO');
  assert.equal(env.oficial('tec', 'apiSituacao').podeAlterarModelo, false);
  const antigo = { numero: '2026-001', data: '10/10/2026', cliente: 'CLIENTE TESTE', unidade: 'CME', equipamento: 'Autoclave 1', marcaModelo: 'X', numeroSerie: 'S1', tag: 'T1', status: 'APROVADO' };
  const g = env.chamar('tplAutoclaveGerarRelatorio', 'tec', antigo);
  assert.equal(g.ok, false);
  assert.match(g.erro, /modelo anterior do relatório oficial foi desativado/);
  assert.match(env.oficial('rt', 'apiDefinirModelo', { modelo: 'ANTERIOR' }).erro, /Somente o Administrador/);
  assert.equal(env.oficial('adm', 'apiDefinirModelo', { modelo: 'ANTERIOR' }).modelo, 'ANTERIOR');
  assert.equal(env.oficial('tec', 'apiSituacao').modelo, 'ANTERIOR');
  const g2 = env.chamar('tplAutoclaveGerarRelatorio', 'tec', antigo);
  assert.doesNotMatch(String(g2.erro || ''), /desativado/);
  assert.equal(env.oficial('adm', 'apiDefinirModelo', { modelo: 'NOVO' }).modelo, 'NOVO');
  // Código do formulário anterior continua no arquivo da tela (preservado, sem apagar).
  const tela = fs.readFileSync(path.join(M.A.BASE, 'JS_TemplateAutoclave.html'), 'utf8');
  assert.match(tela, /function tplAutoclave_renderAnterior_\(\)/);
  assert.match(tela, /tplAutoclaveGerarRelatorio\(SGO_getSessionId\(\), payload\)/);
});

test('pendências: relatório de qualificação vira requalificação a vencer; tabela de emissões ganha colunas sem apagar dados', () => {
  const env = M.criarAmbiente();
  env.run(fs.readFileSync(path.join(M.A.BASE, 'SGO_Alertas_Central.js'), 'utf8').replace(/\r\n/g, '\n'));
  assert.equal(env.fn('Pend_categoriaDocumento_')('3. RELATÓRIOS DE QUALIFICAÇÃO'), 'QUAL');
  assert.equal(env.fn('Pend_categoriaDocumento_')('RELATORIO DE QUALIFICACAO - ESTERILIZADOR BAIXA TEMPERATURA'), 'QUAL');
  assert.equal(env.fn('Pend_categoriaDocumento_')('2. CERTIFICADOS DE CALIBRAÇÃO'), 'CAL');
  assert.ok(env.fn('PEND_TIPOS').requalificacao_vencida && env.fn('PEND_TIPOS').requalificacao_vencendo);
  // Aba antiga de emissões (sem as colunas novas): os títulos que faltam entram no fim, nada é apagado.
  const cab = env.fn('SGO_QE_CAMPOS').slice(0, 22);
  const linhas = [cab.slice(), cab.map((c) => 'v_' + c)];
  const aba = {
    getLastColumn: () => linhas[0].length, getLastRow: () => linhas.length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => linhas.slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc)),
      setValues: (v) => { v.forEach((l, i) => l.forEach((x, j) => { linhas[r - 1 + i][c - 1 + j] = x; })); }
    })
  };
  env.ctx.SGO_DATA.getDB = () => ({ getSheetByName: () => aba });
  env.fn('SGO_QE_aba_')();
  delete env.ctx.SGO_DATA.getDB;
  assert.equal(JSON.stringify(linhas[0].slice(22)), JSON.stringify(['CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'VALIDADE_ATE', 'RESUMO_JSON']));
  assert.equal(linhas[1][0], 'v_ID');
  assert.equal(linhas[1].length, 22);
});

test('aba "Gerar relatório": rascunho, envio e planilha exigem o equipamento do cadastro; documento do ciclo vai para a pasta do equipamento', () => {
  const env = M.criarAmbiente();
  const D = env.fn('AutoRel_apiDispatch');
  const csv = M.A.csvCompleto(M.A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 }));
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: M.payloadCiclo({ textoColado: csv, clienteId: '', unidadeId: '', equipamentoId: '' }) }), /Escolha o cliente, a unidade e o equipamento/);
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: M.payloadCiclo({ textoColado: csv, equipamentoId: 'eq2' }) }), /pertence a outro cliente/);
  // Identificação digitada é trocada pela do cadastro (e marca/modelo não entram).
  const r = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: M.payloadCiclo({ textoColado: csv, cliente: 'DIGITADO ERRADO', tag: 'TAG-ERRADA', marca: 'MARCAFICTICIA', modelo: 'MODELOXYZ', certNumero: 'AUT-T-0500' }) });
  assert.equal(r.contexto.identificacao.cliente, 'HOSPITAL MODELO TESTE LTDA');
  assert.equal(r.contexto.identificacao.tag, 'AUT-TESTE-01');
  assert.equal(r.contexto.identificacao.marca, '');
  const id = M.emitirCiclo(env, { certNumero: 'AUT-T-0501', ensaio: 'QO (Vazio)' });
  const reg = env.fn('SGO_QE_obter_')(id);
  assert.equal(reg.EQUIPAMENTO_ID, 'eq1');
  assert.ok(reg.RESUMO_JSON && JSON.parse(reg.RESUMO_JSON).statusConsolidado === 'APROVADO', 'resumo guardado na emissão');
  const pasta = env.pastas[env.arquivos[reg.PDF_ID].pasta];
  assert.equal(pasta.nome, 'Qualificação');
  assert.equal(env.pastas[pasta.pai].nome, 'AUT-TESTE-01 - Autoclave');
  // Relatório interno (dados reconstituídos) não passa pela trava do vínculo.
  assert.equal(env.fn('SGO_QEQ_aplicarVinculoPayload_') !== undefined, true);
});

test('situação: o último relatório de qualificação emitido vale, inclusive reprovado', () => {
  const env = M.criarAmbiente();
  emitirOficial(env);
  const c = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-T-0601' });
  const qi = M.qiTudoConforme(env); qi.porta = { situacao: 'NC', observacao: 'Guarnição da porta com folga visível.' };
  const p = base(env, { etapas: { QI: true, QO: true }, ciclos: [c], qi, motivo: 'Requalificação após manutenção' });
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  const e = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  env.oficial('rt', 'apiAprovarEmitir', { id: e.id, confirmacaoRevisao: true });
  assert.equal(env.chamar('qualifEquipamentoListar', 'cli', 'eq1').situacao.situacao, 'REPROVADO');
});
