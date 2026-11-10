// Cadeia de frio — emissão do relatório de ensaio e da planilha de dados (21/10/2026): vínculo com o cadastro
// (cliente → unidade → equipamento), travas, conferência do texto da IA, aprovação do responsável técnico,
// revisões, pastas próprias do módulo e modelos anteriores preservados. Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./_cadeiafrio_ambiente.cjs');

const T0 = new Date(2026, 9, 12, 8, 0, 0);
const L24 = C.leituras({ inicio: T0, n: 1441, temp: (s) => [4.5, 5, 5.5][s] });

function pDist(extra) {
  return C.payload(Object.assign({ textoColado: C.csv(L24), estudos: { distribuicao: { tipo: 'DISTRIBUICAO_VAZIO', inicio: C.quando(L24[0].d), fim: C.quando(L24[L24.length - 1].d) } } }, extra || {}));
}

/** Resposta do serviço de IA simulada com o texto informado. */
function iaResponde(texto) {
  return () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) });
}

function rascunhoEEnvio(env, p) {
  const r = env.dispatch('tec', 'apiGerarRascunhoCertificado', p);
  return Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos });
}

/** HTML sem as imagens embutidas (base64 pode conter qualquer sequência de letras). */
function semImagens(html) { return String(html).replace(/data:[^"')]+/g, ''); }

function caminho(env, arqId) {
  const a = env.arquivos[arqId]; const nomes = [a.nome];
  let p = env.pastas[a.pasta];
  while (p) { nomes.unshift(p.nome); p = env.pastas[p.pai]; }
  return nomes.join(' / ');
}

test('vínculo: identificação vem do cadastro; equipamento de outro cliente e falta de escolha são recusados', () => {
  const env = C.criarAmbiente();
  const r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  const id = r.contexto.identificacao;
  assert.equal(id.tag, 'CF-TESTE-01');
  assert.equal(id.cliente, 'HOSPITAL MODELO TESTE LTDA');
  assert.equal(id.cnpj, '11.222.333/0001-81');
  assert.equal(id.numeroSerie, 'SN-FRIO-0001');
  assert.equal(id.equipamentoTipo, 'Câmara de conservação');
  assert.throws(() => env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist({ equipamentoId: 'eq2' })), /pertence a outro cliente/);
  assert.throws(() => env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist({ clienteId: '', unidadeId: '', equipamentoId: '' })), /Escolha o cliente, a unidade e o equipamento/);
  assert.throws(() => env.dispatch('rh', 'apiPing', {}), /RH/);
  // Componente de escolha: lista de equipamentos com o tipo da cadeia de frio primeiro.
  const eqs = env.dispatch('tec', 'apiListarEquipamentos', { clienteId: 'cli1', unidadeId: 'uni1' });
  assert.equal(eqs.items.length, 2);
  assert.ok(eqs.items.every(e => e.compativel));
});

test('rascunho com dado ruim: bloqueado, com o que corrigir, e nada é redigido', () => {
  const env = C.criarAmbiente();
  const r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist({ certDataLogger: '' }));
  assert.equal(r.bloqueado, true);
  assert.equal(r.travas[0].codigo, 'REGISTRADOR_NAO_INFORMADO');
  assert.ok(r.travas[0].comoCorrigir.length > 20);
  assert.equal(r.textos.conclusaoGeral, '');
  // Emitir mesmo assim: recusado com a lista do que corrigir.
  assert.throws(() => env.dispatch('rt', 'apiMontarCertificadoFinal', Object.assign(pDist({ certDataLogger: '' }), { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: { conclusaoGeral: 'x', conclusaoLeigo: 'x', analisePorEstudo: { DISTRIBUICAO_VAZIO: 'x' } }, confirmacaoRevisao: true })), /problema\(s\) a corrigir/);
});

test('IA: texto conferido (número, norma, veredito e grandeza não medida); recusado vira texto padrão', () => {
  const marc = (a, t, l) => '###ANALISE:DISTRIBUICAO_VAZIO###\n' + a + '\n###CONCLUSAO_TECNICA###\n' + t + '\n###CONCLUSAO_LEIGO###\n' + l + '\n###FIM###';
  const bom = marc('As leituras ficaram entre 4,50 °C e 5,50 °C, com média de 5,00 °C, dentro da faixa de 2,0 °C a 8,0 °C, conforme a ABNT NBR 16328:2024.',
    'O estudo de distribuição atendeu ao critério de aceitação. O ensaio está aprovado.', 'O equipamento manteve a temperatura na faixa. O resultado é aprovado.');
  let env = C.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: iaResponde(bom) });
  let r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  assert.equal(r.origemTexto, 'IA', r.avisoIA);
  assert.match(r.textos.conclusaoGeral, /aprovado/);
  // Número que não está nos resultados.
  env = C.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: iaResponde(bom.replace('5,50 °C', '6,37 °C')) });
  r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  assert.equal(r.origemTexto, 'PADRAO');
  assert.match(r.avisoIA, /não passou na conferência.*6,37/);
  // Umidade não medida não pode aparecer no texto; veredito intermediário é proibido.
  env = C.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: iaResponde(bom.replace('dentro da faixa', 'com umidade estável, dentro da faixa')) });
  r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  assert.match(r.avisoIA, /umidade/);
  env = C.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: iaResponde(bom.replace('O ensaio está aprovado.', 'O ensaio está aprovado com ressalvas.')) });
  r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  assert.equal(r.origemTexto, 'PADRAO');
  // Sem chave: texto padrão determinístico com o veredito do motor.
  env = C.criarAmbiente();
  r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  assert.equal(r.origemTexto, 'PADRAO');
  assert.match(r.textos.conclusaoGeral, /O ensaio está APROVADO\./);
});

test('emissão direta só pelo responsável técnico, com confirmação; nova emissão do mesmo número vira revisão 1', () => {
  const env = C.criarAmbiente();
  const p = rascunhoEEnvio(env, pDist());
  assert.throws(() => env.dispatch('tec', 'apiMontarCertificadoFinal', p), /aprovação do responsável técnico/);
  assert.throws(() => env.dispatch('rt', 'apiMontarCertificadoFinal', p), /Conferi os dados/);
  const r = env.dispatch('rt', 'apiMontarCertificadoFinal', Object.assign({}, p, { confirmacaoRevisao: true }));
  assert.equal(r.revisao, 0);
  assert.equal(r.salvoNaPasta, true);
  assert.match(caminho(env, r.pdfId), /^raiz \/ Cadeia de Frio - Laudos \/ 11222333000181 \/ CF-TESTE-01 - Câmara de conservação \/ Qualificação \/ Relatório de ensaio Cadeia de Frio - CF-T-0001/);
  const reg = env.fn('SGO_QE_obter_')(r.emissaoId);
  assert.equal(reg.STATUS, 'EMITIDO');
  assert.equal(reg.MODULO, 'CADEIA_FRIO');
  assert.equal(reg.EQUIPAMENTO_ID, 'eq1');
  assert.equal(reg.APROVADO_POR, 'Responsável Teste');
  assert.equal(JSON.parse(reg.RESUMO_JSON).statusConsolidado, 'APROVADO');
  // HTML: modelo novo, sem fabricante nem modelo comercial, norma na edição certa, aprovação registrada.
  const html = r.html;
  assert.match(html, /Relatório de ensaio térmico — Cadeia de frio/);
  assert.match(html, /ABNT NBR 16328:2024/);
  assert.match(html, /Revisado e aprovado para emissão por<\/b> Responsável Teste/);
  assert.ok(!/undefined|NaN|16328:2023/.test(semImagens(html)));
  assert.match(html, /Fabricante \(marca\)<\/th><td>MARCAFICTICIA/, 'fabricante do cadastro (22/10/2026)');
  const p2 = rascunhoEEnvio(env, pDist());
  const r2 = env.dispatch('rt', 'apiMontarCertificadoFinal', Object.assign({}, p2, { confirmacaoRevisao: true }));
  assert.equal(r2.revisao, 1);
  assert.equal(env.fn('SGO_QE_obter_')(r.emissaoId).STATUS, 'SUBSTITUIDO');
});

test('aprovação em duas pessoas: enviar, listar, prever, devolver e aprovar; dados alterados depois do envio barram', () => {
  const env = C.criarAmbiente();
  const p = rascunhoEEnvio(env, pDist());
  const envio = env.dispatch('tec', 'apiEnviarParaAprovacao', p);
  assert.ok(envio.id);
  assert.match(envio.html, /MINUTA PARA CONFERÊNCIA/);
  let lista = env.dispatch('rt', 'apiListarAprovacoes', {});
  assert.equal(lista.podeAprovar, true);
  assert.equal(lista.itens[0].documento, 'Relatório de ensaio');
  assert.throws(() => env.dispatch('tec', 'apiPreverAprovacao', { id: envio.id }), /Somente o responsável técnico/);
  assert.match(env.dispatch('rt', 'apiPreverAprovacao', { id: envio.id }).html, /MINUTA/);
  assert.throws(() => env.dispatch('rt', 'apiAprovarEmitir', { id: envio.id }), /Conferi os dados/);
  const em = env.dispatch('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(env.fn('SGO_QE_obter_')(envio.id).STATUS, 'EMITIDO');
  assert.equal(em.revisao, 0);
  // Devolução com motivo.
  const envio2 = env.dispatch('tec', 'apiEnviarParaAprovacao', rascunhoEEnvio(env, pDist({ certNumero: 'CF-T-0002' })));
  assert.throws(() => env.dispatch('rt', 'apiDevolverAprovacao', { id: envio2.id, motivo: 'curto' }), /motivo/);
  env.dispatch('rt', 'apiDevolverAprovacao', { id: envio2.id, motivo: 'Faltou a foto da montagem dos sensores.' });
  lista = env.dispatch('tec', 'apiListarAprovacoes', {});
  assert.ok(lista.itens.some(i => i.status === 'DEVOLVIDO' && /foto/.test(i.motivoDevolucao)));
  // Cadastro do registrador alterado depois do envio: a aprovação é barrada.
  const envio3 = env.dispatch('tec', 'apiEnviarParaAprovacao', rascunhoEEnvio(env, pDist({ certNumero: 'CF-T-0003' })));
  env.run('__ABAS.CAD_PADROES[0].VALIDADE = "30/11/2027";');
  assert.throws(() => env.dispatch('rt', 'apiAprovarEmitir', { id: envio3.id, confirmacaoRevisao: true }), /mudaram/);
});

test('texto revisado pelo técnico: veredito diferente do motor ou forma intermediária é recusado', () => {
  const env = C.criarAmbiente();
  const p = rascunhoEEnvio(env, pDist());
  const t = Object.assign({}, p.textosCertificado, { conclusaoGeral: 'O ensaio está aprovado com alerta.' });
  assert.throws(() => env.dispatch('rt', 'apiMontarCertificadoFinal', Object.assign({}, p, { textosCertificado: t, confirmacaoRevisao: true })), /não podem ser emitidos/);
  const t2 = Object.assign({}, p.textosCertificado, { conclusaoGeral: 'O ensaio está reprovado.' });
  assert.throws(() => env.dispatch('rt', 'apiMontarCertificadoFinal', Object.assign({}, p, { textosCertificado: t2, confirmacaoRevisao: true })), /resultado calculado é APROVADO/);
  // Rascunho velho (dados mudaram): pede um rascunho novo.
  assert.throws(() => env.dispatch('rt', 'apiMontarCertificadoFinal', Object.assign({}, p, { assinaturaContextoCertificado: 'antiga', confirmacaoRevisao: true })), /Gerar rascunho/);
});

test('planilha de dados em A4 paisagem: emitida pelo responsável técnico; técnico envia e recebe a minuta', () => {
  const env = C.criarAmbiente();
  assert.throws(() => env.dispatch('rt', 'apiGerarPlanilhaDados', pDist()), /Confirme que conferiu/);
  const r = env.dispatch('rt', 'apiGerarPlanilhaDados', Object.assign(pDist(), { confirmacaoRevisao: true }));
  assert.equal(r.emitido, true);
  assert.equal(r.revisao, 0);
  assert.match(caminho(env, r.pdfId), /Qualificação \/ Planilha de dados Cadeia de Frio - CF-T-0001/);
  const html = r.html;
  assert.match(html, /Planilha de dados do ensaio térmico — Cadeia de frio/);
  ['1. Quadro-resumo dos resultados', '2. Condições do ensaio', '3. Resultados por estudo', '4. Gráficos', '5. Memória de cálculo', '8. Leituras do registrador', 'Temperatura cinética média'].forEach(t => assert.ok(html.includes(t), 'falta ' + t));
  assert.ok(html.includes('<svg'), 'gráficos em SVG');
  assert.ok(!/undefined|NaN/.test(semImagens(html)));
  // 1441 leituras: abaixo do limite de impressão, todas na tabela (12/10 08:00:00 até 13/10 08:00:00).
  assert.ok(html.includes('12/10 08:00:00') && html.includes('13/10 08:00:00'));
  // Apiconverter (botão antigo) segue para o modelo novo.
  const t = env.dispatch('tec', 'apiConverter', pDist({ certNumero: 'CF-T-0009' }));
  assert.equal(t.aguardandoAprovacao, true);
  assert.match(t.html, /MINUTA/);
  const lista = env.dispatch('rt', 'apiListarAprovacoes', {});
  assert.ok(lista.itens.some(i => i.documento === 'Planilha de dados'));
  const ap = env.dispatch('rt', 'apiAprovarEmitir', { id: t.id, confirmacaoRevisao: true });
  assert.equal(ap.revisao, 0);
});

test('modelos anteriores preservados: só voltam pela propriedade do módulo (Administrador)', () => {
  const env = C.criarAmbiente();
  assert.throws(() => env.dispatch('rt', 'apiDefinirModelos', { relatorio: 'ANTERIOR' }), /Administrador/);
  env.dispatch('adm', 'apiDefinirModelos', { relatorio: 'ANTERIOR' });
  const r = env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist());
  assert.ok('introducao' in r.textos, 'certificado anterior (introdução e objetivo)');
  env.dispatch('adm', 'apiDefinirModelos', { relatorio: 'NOVO', planilha: 'ANTERIOR' });
  assert.equal(env.dispatch('tec', 'apiPing', {}).planilhaModelo, 'ANTERIOR');
  assert.equal(env.dispatch('tec', 'apiGerarRascunhoCertificado', pDist()).modeloRelatorio, 'NOVO');
});

test('pastas próprias: a chave genérica antiga só é adotada se a pasta for da Cadeia de Frio; envios na pasta do módulo', () => {
  let env = C.criarAmbiente();
  env.run('var __p = DriveApp.getRootFolder().createFolder("Estufa+Banho-maria - Laudos"); PropertiesService.getScriptProperties().setProperty("LAUDOS_FOLDER_ID", __p.getId());');
  let pasta = env.fn('CadeiaFrioRel_pastaLaudos_')();
  assert.equal(pasta.getName(), 'Cadeia de Frio - Laudos');
  assert.notEqual(pasta.getId(), env.props.LAUDOS_FOLDER_ID);
  env = C.criarAmbiente();
  env.run('var __q = DriveApp.getRootFolder().createFolder("Cadeia de Frio - Laudos"); PropertiesService.getScriptProperties().setProperty("LAUDOS_FOLDER_ID", __q.getId());');
  pasta = env.fn('CadeiaFrioRel_pastaLaudos_')();
  assert.equal(pasta.getId(), env.props.LAUDOS_FOLDER_ID);
  assert.equal(env.props.CADEIAFRIO_LAUDOS_FOLDER_ID, env.props.LAUDOS_FOLDER_ID);
  const up = env.dispatch('tec', 'apiUploadArquivo', { fileName: 'registrador.csv', mimeType: 'text/csv', base64: Buffer.from('a;b').toString('base64') });
  assert.match(caminho(env, up.fileId), /^raiz \/ Cadeia de Frio - Uploads \/ registrador\.csv$/);
  const ping = env.dispatch('rt', 'apiPing', {});
  assert.equal(ping.podeAprovarEmissao, true);
  assert.equal(env.dispatch('tec', 'apiPing', {}).podeAprovarEmissao, false);
  assert.ok(ping.aConfirmar.length >= 5);
});
