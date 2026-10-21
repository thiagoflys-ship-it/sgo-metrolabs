// Esterilização a baixa temperatura — verificador da IA, redação com IA simulada, documento A4 e fluxo
// rascunho → revisão → aprovação → emissão (21/10/2026). IA simulada; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_baixatemp_ambiente.cjs');

const j = (x) => JSON.parse(JSON.stringify(x));

test('verificador: números, normas, veredito, veredito intermediário, fabricante e autorreferência', () => {
  const P = A.criarAmbiente().ctx;
  const ctx = { temperatura: '49,60 °C a 50,50 °C', tempo: '15,00 min', pulsos: '4', data: '20/10/2026', normas: ['ISO 22441:2022', 'RDC ANVISA nº 15/2012'] };
  const regras = { contexto: ctx, normas: ['ISO 22441:2022', 'RDC ANVISA nº 15/2012', 'ISO 11138-1:2017'], veredito: 'CONFORME', nomesProibidos: ['MARCAFICTICIA'] };
  const ok = 'A temperatura ficou de 49,60 °C a 50,50 °C durante 15,00 min, com 4 pulsos, conforme a ISO 22441 e a RDC nº 15/2012. Resultado da qualificação: CONFORME.';
  assert.deepEqual(j(P.QualIA_verificar_(ok, Object.assign({ exigirVeredito: true }, regras))), { ok: true, problemas: [] });
  const r = j(P.QualIA_verificar_('A temperatura chegou a 51,20 °C e 49.6 °C; ver ISO 11138-7 e ISO 11138. O equipamento MarcaFicticia foi reprovado.', regras));
  assert.equal(r.ok, false);
  const t = r.problemas.join(' | ');
  assert.match(t, /51,20/); assert.match(t, /49\.6 \(use vírgula decimal\)/);
  assert.match(t, /ISO 11138-7/); assert.doesNotMatch(t, /normas fora da lista: [^|]*ISO 11138(?!-)/);
  assert.match(t, /veredito diferente/); assert.match(t, /marcaficticia/);
  assert.match(j(P.QualIA_verificar_('O ensaio foi aprovado com ressalvas.', regras)).problemas.join(), /veredito diferente/);
  assert.match(j(P.QualIA_verificar_('Como modelo de linguagem, não tenho acesso.', regras)).problemas.join(), /si mesmo/);
  // NÃO CONFORME: frase afirmando aprovação é recusada na conclusão, aceita na análise por ciclo (vereditoGlobal false)
  const nc = Object.assign({}, regras, { veredito: 'NAO_CONFORME' });
  assert.equal(j(P.QualIA_verificar_('O ensaio está conforme.', nc)).ok, false);
  assert.equal(j(P.QualIA_verificar_('O ciclo 4 está conforme.', Object.assign({ vereditoGlobal: false, contexto: { a: '4' } }, nc))).ok, true);
  assert.equal(j(P.QualIA_verificar_('O ensaio não está conforme: não atendeu ao tempo de 15,00 min.', nc)).ok, true);
  assert.equal(j(P.QualIA_verificar_('Nenhuma leitura não conforme foi registrada.', regras)).ok, true);
  assert.equal(j(P.QualIA_verificar_('Resultado da qualificação: CONFORME.', Object.assign({ exigirVeredito: true }, nc))).ok, false);
});

function ensaioCompleto(amb, opcoes) {
  opcoes = opcoes || {};
  const arq = () => amb.arquivoTexto('ciclo.csv', A.cicloPeroxido(opcoes.ciclo));
  const P = amb.ctx;
  const ci = (id, etapa) => {
    const fileId = arq();
    const pv = amb.api('tec', 'apiLerArquivo', { fileId });
    return { id, etapa, numero: id, data: '20/10/2026', carga: { tipo: etapa === 'QO' ? 'VAZIA' : 'REFERENCIA', descricao: 'Pacote de teste' }, arquivos: [{ fileId, nome: 'ciclo.csv', colunas: pv.colunas, linhaCabecalho: pv.linhaCabecalho }],
      sensores: pv.resumo.sensores.map((n, k) => ({ nome: n, papel: etapa === 'QO' || k === 2 ? 'CAMARA' : 'CARGA', posicao: ['centro', 'porta', 'fundo'][k], ativo: true, instrumento: 'DTL-T1' })),
      janela: { modo: 'AUTO' }, iqs: [{ posicao: 'centro', tipo: 'tipo de teste', lote: 'IQ-T1', validade: '01/12/2027', resultado: 'CONFORME' }],
      ibs: etapa === 'QD' ? [{ posicao: 'centro', microrganismo: 'Microrganismo de teste', lote: 'IB-T1', validade: '01/12/2027', resultado: opcoes.ibCrescimento && id === 'd2' ? 'CRESCIMENTO' : 'SEM_CRESCIMENTO' }] : [],
      controlePositivo: { lote: 'IB-T1', validade: '01/12/2027', resultado: 'CRESCIMENTO' }, incubacao: { horas: '24', temperatura: '56', concluida: true } };
  };
  return {
    tipo: 'PEROXIDO', etapas: { QI: true, QO: true, QD: true },
    identificacao: { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', dataInicio: '20/10/2026', tecnicoExecutor: 'TECNICO DE TESTE', motivo: 'Qualificação inicial' },
    programa: { nomePrograma: 'Programa padrão de teste', temperaturaProgramada: '50', tolInf: '3', tolSup: '3', tempoExposicaoMin: '15', pulsosProgramados: '4', pressaoVacuoMbar: '1', fonteParametros: 'Especificação de teste do fabricante do equipamento' },
    instrumentos: [{ tag: 'DTL-T1', descricao: 'Registrador de teste', grandeza: 'TEMPERATURA', certificado: 'CAL-T1', validade: '01/01/2027', U: '0,2', k: '2', resolucao: '0,1' }, { tag: 'PT-T1', descricao: 'Transdutor de teste', grandeza: 'PRESSAO', certificado: 'CAL-T2', validade: '01/01/2027', U: '0,05', k: '2', resolucao: '0,01' }],
    qi: { itens: P.BAIXATEMP_CFG.TIPOS.PEROXIDO.checklistQI.map((m) => ({ codigo: m[0], resposta: 'SIM' })) },
    qo: { itens: P.BAIXATEMP_CFG.TIPOS.PEROXIDO.checklistQO.map((m) => ({ codigo: m[0], resposta: 'SIM' })), estanqueidade: { aplicavel: false } },
    ciclos: [ci('o1', 'QO'), ci('d1', 'QD'), ci('d2', 'QD'), ci('d3', 'QD')], textos: {}
  };
}

test('redação: IA simulada aceita; número inventado ou veredito trocado caem no texto padrão; sem chave, texto padrão com aviso', () => {
  const amb = A.criarAmbiente();
  const dados = ensaioCompleto(amb);
  // sem chave
  let r = amb.api('tec', 'apiRedigir', { dados });
  assert.equal(r.origem, 'PADRAO');
  assert.match(r.aviso, /redação automática não está disponível \(a chave da IA/);
  assert.match(r.textos.conclusaoTecnica, /Resultado da qualificação: CONFORME\.$/);
  // IA boa: cita só números do contexto
  let prompts = [];
  amb.run('var IA_TESTE = function (p) { PROMPTS_TESTE.push(p); return IA_RESPOSTA; }; var PROMPTS_TESTE = [];');
  const boa = '###ANALISE_QI### A instalação atendeu às verificações do laboratório.\n###ANALISE_QO### O ciclo de operação teve exposição de 15,00 min com 4 pulso(s).\n###ANALISE_QD### Nos ciclos de desempenho a temperatura na carga ficou entre 49,60 °C e 50,50 °C, conforme a ISO 22441:2022.\n###CONCLUSAO_TECNICA### Todos os critérios foram atendidos.\n\nResultado da qualificação: CONFORME.\n###CONCLUSAO_LEIGO### O esterilizador cumpriu o ciclo programado.\n###FIM###';
  amb.ctx.IA_RESPOSTA = boa;
  r = amb.api('tec', 'apiRedigir', { dados });
  assert.equal(r.origem, 'IA', r.aviso);
  assert.match(r.textos.analiseQD, /ISO 22441:2022/);
  const prompt = amb.ctx.PROMPTS_TESTE[0];
  assert.doesNotMatch(prompt, /HOSPITAL TESTE|MARCAFICTICIA|MODELOXYZ|EST-T01|11222333/); // só resultados
  assert.match(prompt, /"resultadoCalculadoPeloMotor": "CONFORME"/);
  // IA ruim: número inventado na QD e veredito trocado na conclusão → essas seções viram texto padrão
  amb.ctx.IA_RESPOSTA = boa.replace('49,60 °C', '47,15 °C').replace('Todos os critérios foram atendidos.', 'O equipamento foi reprovado.');
  amb.ctx.PROMPTS_TESTE.length = 0;
  r = amb.api('tec', 'apiRedigir', { dados });
  assert.equal(r.origem, 'MISTO');
  assert.equal(amb.ctx.PROMPTS_TESTE.length, 2); // 2ª tentativa só das seções recusadas, com os motivos
  assert.match(amb.ctx.PROMPTS_TESTE[1], /recusada pela conferência automática por: .*47,15/);
  assert.doesNotMatch(r.textos.analiseQD, /47,15/);
  assert.doesNotMatch(r.textos.conclusaoTecnica, /reprovado/);
  assert.match(r.aviso, /descartada pela conferência/);
  // com pendências, não redige
  const d2 = JSON.parse(JSON.stringify(dados)); d2.ciclos[1].incubacao.concluida = false;
  r = amb.api('tec', 'apiRedigir', { dados: d2 });
  assert.equal(r.bloqueado, true);
});

test('fluxo completo: salvar, travas no envio, revisão independente, aprovação vinculada aos dados, emissão, imutável', () => {
  const amb = A.criarAmbiente();
  const dados = ensaioCompleto(amb);
  const s1 = amb.api('tec', 'apiSalvar', { dados });
  assert.equal(s1.status, 'RASCUNHO');
  // sem textos: não envia
  assert.throws(() => amb.api('tec', 'apiEnviarRevisao', { id: s1.id }), /seção "Análise da qualificação de instalação" está vazia/);
  const red = amb.api('tec', 'apiRedigir', { dados });
  dados.textos = red.textos;
  const s2 = amb.api('tec', 'apiSalvar', { id: s1.id, versaoDados: s1.versaoDados, dados });
  assert.equal(s2.versaoDados, 2);
  // versão antiga: recusa sobrescrever
  assert.throws(() => amb.api('tec', 'apiSalvar', { id: s1.id, versaoDados: 1, dados }), /alterado por outra pessoa/);
  // nada foi apagado: as duas versões dos dados continuam na pasta
  assert.equal(Object.values(amb.arquivos).filter((a) => /^reg\d+ - v\d\.json$/.test(a.nome)).length, 2);
  const env = amb.api('tec', 'apiEnviarRevisao', { id: s1.id });
  assert.equal(env.status, 'EM_REVISAO');
  // comercial não aprova; técnico não aprova; quem elaborou (mesmo usuário com perfil de gestor) não aprova
  assert.throws(() => amb.api('com', 'apiAprovar', { id: s1.id }), /consulta os ensaios/);
  assert.throws(() => amb.api('tec', 'apiAprovar', { id: s1.id }), /responsável técnico/);
  assert.throws(() => amb.api('rt2', 'apiAprovar', { id: s1.id, rtNome: 'RESPONSAVEL TECNICO DE TESTE', parecer: 'ok' }), /Quem elaborou o ensaio não pode aprová-lo/);
  assert.throws(() => amb.api('rt', 'apiAprovar', { id: s1.id, rtNome: 'RESPONSAVEL TECNICO DE TESTE' }), /parecer da revisão/);
  // emitir antes da aprovação: recusa
  assert.throws(() => amb.api('tec', 'apiEmitir', { id: s1.id }), /depois da revisão e da aprovação/);
  const ap = amb.api('rt', 'apiAprovar', { id: s1.id, rtNome: 'RESPONSAVEL TECNICO DE TESTE', parecer: 'Conferidos dados, critérios e textos.' });
  assert.equal(ap.status, 'APROVADO');
  const em = amb.api('tec', 'apiEmitir', { id: s1.id });
  assert.match(em.numero, /^QBT-\d{4}-00001$/);
  assert.ok(em.pdfId && em.htmlId);
  assert.match(em.html, /Documento salvo na pasta do cliente/);
  // pasta do cliente (CNPJ) dentro de "Baixa Temperatura - Laudos", com HTML
  const pastaLaudos = Object.values(amb.pastas).find((p) => p.nome === 'Baixa Temperatura - Laudos');
  const pastaCli = Object.values(amb.pastas).find((p) => p.pai === pastaLaudos.id);
  assert.equal(pastaCli.nome, '11222333000181');
  // 21/10/2026: dentro da pasta do cliente, a pasta do equipamento (TAG - tipo) e a subpasta Qualificação, como nos outros módulos
  const pastaEq = Object.values(amb.pastas).find((p) => p.pai === pastaCli.id);
  assert.match(pastaEq.nome, /^EST-T01 - Esterilizador/);
  const pastaQ = Object.values(amb.pastas).find((p) => p.pai === pastaEq.id);
  assert.equal(pastaQ.nome, 'Qualificação');
  assert.ok(Object.values(amb.arquivos).some((a) => a.pasta === pastaQ.id &&/^Relatório de qualificação baixa temperatura - QBT-.* - EST-T01 - .*\.html$/.test(a.nome)));
  // Arquivo de documentos
  const doc = j(amb.ctx.DOCS_REGISTRADOS)[0];
  assert.equal(doc.TIPO_DOCUMENTO, '3. RELATÓRIOS DE QUALIFICAÇÃO', 'categoria da NBR 15943, como os outros relatórios de qualificação');
  assert.equal(doc.EQUIPAMENTO_ID, 'eq1');
  // imutável
  assert.throws(() => amb.api('tec', 'apiSalvar', { id: s1.id, versaoDados: 2, dados }), /já foi emitido/);
  const hist = amb.api('tec', 'apiObter', { id: s1.id }).historico.map((h) => h.codigo);
  assert.deepEqual(hist, ['CRIADO', 'SALVO', 'ENVIADO_REVISAO', 'APROVADO', 'EMITIDO']);
  // nova revisão: rascunho novo ligado ao original
  const nr = amb.api('tec', 'apiNovaRevisao', { id: s1.id });
  assert.equal(nr.revisao, '1');
  assert.equal(amb.api('tec', 'apiObter', { id: nr.id }).status, 'RASCUNHO');
});

test('alteração depois do envio anula a revisão; arquivo trocado depois da aprovação impede a emissão', () => {
  const amb = A.criarAmbiente();
  const dados = ensaioCompleto(amb);
  dados.textos = amb.api('tec', 'apiRedigir', { dados }).textos;
  const s = amb.api('tec', 'apiSalvar', { dados });
  amb.api('tec', 'apiEnviarRevisao', { id: s.id });
  const alt = amb.api('tec', 'apiSalvar', { id: s.id, versaoDados: 1, dados: Object.assign({}, dados, { observacoes: 'nota nova' }) });
  assert.equal(alt.status, 'RASCUNHO');
  assert.match(alt.aviso, /voltou para rascunho/);
  amb.api('tec', 'apiEnviarRevisao', { id: s.id });
  amb.api('rt', 'apiAprovar', { id: s.id, rtNome: 'RESPONSAVEL TECNICO DE TESTE', parecer: 'ok' });
  // o arquivo do ciclo d2 muda no armazenamento (outra leitura): a impressão digital não confere
  const fid = dados.ciclos[2].arquivos[0].fileId;
  amb.arquivos[fid].buf = Buffer.from(A.cicloPeroxido({ ajuste: (i, k) => (k === 0 ? 0.01 : 0) }));
  assert.throws(() => amb.api('tec', 'apiEmitir', { id: s.id }), /mudaram depois da aprovação/);
  // texto revisado com veredito trocado: não envia
  const amb2 = A.criarAmbiente();
  const d2 = ensaioCompleto(amb2);
  d2.textos = amb2.api('tec', 'apiRedigir', { dados: d2 }).textos;
  d2.textos.conclusaoTecnica = 'O processo foi reprovado. Resultado da qualificação: CONFORME.';
  const s2 = amb2.api('tec', 'apiSalvar', { dados: d2 });
  assert.throws(() => amb2.api('tec', 'apiEnviarRevisao', { id: s2.id }), /Conclusão técnica" não pode ser emitida: frase com veredito diferente/);
});

test('documento A4: seções, critérios com fonte, gráficos, pt-BR, sem fabricante, sem repetição do veredito, normas a confirmar fora', () => {
  const amb = A.criarAmbiente();
  const dados = ensaioCompleto(amb, { ibCrescimento: true });
  dados.textos = amb.api('tec', 'apiRedigir', { dados }).textos;
  const s = amb.api('tec', 'apiSalvar', { dados });
  const html = amb.api('tec', 'apiPrevia', { id: s.id }).html;
  for (const t of ['Relatório de qualificação', '1. Identificação', '2. Objetivo e escopo', '3. Referências normativas', '4. Metodologia', '5. Instrumentação e rastreabilidade',
    '6. Critérios de aceitação', '7. Qualificação de instalação (QI)', '8. Qualificação de operação (QO)', '9. Qualificação de desempenho (QD)', '10. Consolidação dos resultados',
    '11. Incertezas de medição e regra de decisão', '12. Não conformidades e observações', '13. Conclusão', '14. Responsabilidades e assinaturas', 'Anexo A — Registro de revisão e aprovação', 'Anexo B — Arquivos de dados utilizados',
    'Prévia para revisão', 'data-sgo-sumario', 'Não conforme', 'ISO 22441:2022', 'JCGM 100:2008', 'Especificação do ciclo declarada pelo fabricante do equipamento', 'text-align:justify', '<svg', 'escala logarítmica', '0,21 °C', '15,00 min']) assert.ok(html.includes(t), 'falta: ' + t);
  const semImagens = html.replace(/data:[a-z+\/]+;base64,[A-Za-z0-9+\/=]+/g, '');
  assert.doesNotMatch(semImagens, /MARCAFICTICIA|MODELOXYZ|undefined|NaN|\[object/);
  assert.doesNotMatch(html, /EN 14180|ISO 25424/);                 // normas de VBTF não entram no peróxido
  assert.doesNotMatch(html, /Norma de equipamento para esterilizadores a peróxido/); // a confirmar: fora do documento
  assert.doesNotMatch(html, /\d\.\d{2}\s?°C/);                         // nada de ponto decimal
  assert.equal((html.match(/class="resultado nok"/g) || []).length, 1); // quadro do resultado só na abertura
  // VBTF
  const amb2 = A.criarAmbiente();
  const d2 = ensaioCompleto(amb2);
  d2.tipo = 'FORMALDEIDO';
  d2.programa = { nomePrograma: 'VBTF teste', temperaturaProgramada: '60', tolInf: '2', tolSup: '2', tempoExposicaoMin: '55', pulsosProgramados: '6', fonteParametros: 'Especificação de teste' };
  d2.qi.itens = amb2.ctx.BAIXATEMP_CFG.TIPOS.FORMALDEIDO.checklistQI.map((m) => ({ codigo: m[0], resposta: 'SIM' }));
  d2.ciclos.forEach((c) => { const fid = amb2.arquivoTexto('vbtf.csv', A.cicloFormaldeido()); const pv = amb2.api('tec', 'apiLerArquivo', { fileId: fid }); c.arquivos = [{ fileId: fid, nome: 'vbtf.csv', colunas: pv.colunas, linhaCabecalho: pv.linhaCabecalho }]; c.sensores = pv.resumo.sensores.map((n) => ({ nome: n, papel: c.etapa === 'QO' ? 'CAMARA' : 'CARGA', ativo: true })); c.data = '21/10/2026'; });
  d2.identificacao.dataInicio = '21/10/2026';
  d2.textos = amb2.api('tec', 'apiRedigir', { dados: d2 }).textos;
  const s2 = amb2.api('tec', 'apiSalvar', { dados: d2 });
  const h2 = amb2.api('tec', 'apiPrevia', { id: s2.id }).html;
  assert.match(h2, /ISO 25424:2018/); assert.match(h2, /EN 14180:2014/); assert.match(h2, /Dessorção e secagem/); assert.match(h2, /59,00 min/);
  assert.match(h2, /class="resultado ok"/);
});

test('acesso: cliente e RH bloqueados; comercial só consulta; tela entrega conteúdo e ajuda existe', () => {
  const amb = A.criarAmbiente();
  assert.throws(() => amb.api('cli', 'apiListar', {}), /exclusivo à equipe interna/);
  assert.equal(amb.api('com', 'apiListar', {}).ok, true);
  assert.throws(() => amb.api('com', 'apiSalvar', { dados: { tipo: 'PEROXIDO' } }), /não preenche, aprova nem emite/);
  const tela = amb.ctx.BaixaTemp_obterConteudoModulo();
  assert.match(tela, /^<style>[\s\S]*<\/style><script>[\s\S]*tplBaixaTemp_renderReal_[\s\S]*<\/script>$/);
  const codigo = tela.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new (require('node:vm').Script)(codigo));
  assert.doesNotMatch(tela, /\p{Extended_Pictographic}/u);
  const ajuda = amb.ctx.SGO_ajudaTelas_BaixaTemp_().baixa_temperatura;
  assert.ok(ajuda.passos.length >= 6 && ajuda.problemas.length >= 8 && ajuda.quemPode.length === 4);
  assert.doesNotMatch(JSON.stringify(ajuda), /burr|\p{Extended_Pictographic}/u);
});
