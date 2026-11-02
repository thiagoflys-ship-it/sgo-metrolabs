// SGO+ Licitações, etapa 2 (02/11/2026): arquivos do edital e nota 0–100 pela IA.
// Permissão (só Diretoria e Administrador), análise sem a chave da IA ("indisponível: falta a chave", nada inventado),
// verificador que recusa resposta sem fonte, com trecho que não está na fonte, com frase de decisão ou promessa de RBC,
// refação com os problemas apontados, nota calculada pelo código (prazo com feriados reais, localização, valor, margem),
// trava = nota 0, versão nova a cada análise (nada sobrescrito), histórico com versão, fonte e hash, análise automática só
// quando a base muda, ordenação por nota e as telas (computador e celular de 390 px).
// Código real do SGO+ num contexto isolado; o servidor (SGO_LICITACOES) e a IA (SGO_DocA4_chamarGemini_) são simulados.
// Dados da oportunidade: os públicos do PNCP (Aparecida do Rio Doce/GO, LIC-2026-0097); o texto do edital é de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

const AGORA = Date.parse('2026-11-01T13:00:00-03:00');   // domingo; segunda 02/11 é Finados
class DataFixa extends Date { constructor(...a) { if (a.length) super(...a); else super(AGORA); } static now() { return AGORA; } }

const USUARIOS = [['u_dir', 'dora', 'DORA DIRETORA TESTE', 'DIRETORIA'], ['u_adm', 'admin', 'Administrador', 'ADMIN'], ['u_ges', 'gil', 'GIL GESTOR TESTE', 'GESTOR'],
  ['u_com', 'vera', 'VERA COMERCIAL TESTE', 'COMERCIAL'], ['u_tec', 'tiago', 'TIAGO TECNICO TESTE', 'TECNICO'], ['u_cli', 'cliente', 'CLIENTE TESTE', 'CLIENTE']];
const CHAVE = 'PNCP:24859316000100-1-000276/2026';
const OP = { ID: 'op1', CODIGO: 'LIC-2026-0097', CHAVE_FONTE: CHAVE, NUMERO_CONTROLE_PNCP: '24859316000100-1-000276/2026', PORTAL_ORIGEM: 'PNCP', ORGAO_CNPJ: '24859316000100',
  ORGAO_NOME: 'MUNICIPIO DE APARECIDA DO RIO DOCE', UNIDADE_NOME: 'FMS', UF: 'GO', MUNICIPIO: 'Aparecida do Rio Doce', MODALIDADE: 'Dispensa', MODO_DISPUTA: 'Dispensa Com Disputa',
  AMPARO_LEGAL: 'Lei 14.133/2021, Art. 75, II', LEI: '14133', SRP: 'NAO',
  OBJETO: 'DISPENSA DE LICITAÇÃO PARA CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA PRESTAÇÃO DE SERVIÇOS DE DIAGNÓSTICO TÉCNICO E MANUTENÇÃO CORRETIVA DE 04 (QUATRO) EQUIPAMENTOS MÉDICOS E FISIOTERAPÊUTICOS, SENDO',
  VALOR_ESTIMADO: 8431.44, ABERTURA_PROPOSTAS: '2026-11-03T07:00:00', ENCERRAMENTO_PROPOSTAS: '2026-11-05T11:00:00', ENCERRAMENTO_ISO: '2026-11-05T14:00:00.000Z', SITUACAO_FONTE: 'Divulgada no PNCP',
  LINK_PNCP: 'https://pncp.gov.br/app/editais/24859316000100/2026/276', TRIAGEM: 'CANDIDATA', TRIAGEM_MOTIVO: 'Termo de interesse: manutenção de equipamentos de saúde ou laboratório (no objeto).',
  SELOS_JSON: '[]', PENDENCIAS_JSON: '[]', PRIORIDADE_UF: 8, SITUACAO: 'RADAR', VERSAO_FONTE: 1, VERSAO_HASH: 'bdf13a67b217f2fdf2c100e443cb527540f1b89b18ea99466e929589d452322d' };
const OP2 = Object.assign({}, OP, { ID: 'op2', CODIGO: 'LIC-2026-0004', CHAVE_FONTE: 'PNCP:46612032000149-1-000296/2026', NUMERO_CONTROLE_PNCP: '46612032000149-1-000296/2026', ORGAO_NOME: 'MUNICIPIO DE MIRASSOL', UF: 'SP', MUNICIPIO: 'Mirassol',
  OBJETO: 'CONTRATACAO DE EMPRESA ESPECIALIZADA EM SERVICO DE CALIBRACAO DE MEDIDOR DE NIVEL SONORO E CALIBRADOR ACUSTICO', VALOR_ESTIMADO: 1650, PRIORIDADE_UF: 3, NOTA: 41.5, NOTA_CLASSE: 'BAIXA', ANALISE_VERSAO: 1 });
const EDITAL = 'AVISO DE DISPENSA ELETRÔNICA Nº 12/2026\nObjeto: manutenção corretiva de 04 equipamentos: 01 autoclave horizontal 21 litros, 01 aparelho de ultrassom fisioterapêutico, 01 eletroestimulador e 01 bicicleta ergométrica.\n' +
  'Habilitação: certidão negativa de débitos federais, estaduais e municipais; certificado de regularidade do FGTS; atestado de capacidade técnica.\nO atendimento deverá ocorrer em até 24 horas após a abertura do chamado.\nAs peças serão fornecidas pela contratada sem custo adicional.';
const ARQS = { chave: CHAVE, rodando: false, estado: { listaEm: '2026-11-01T15:00:00.000Z', listaOk: true, listaStatus: 200, listaErro: '', falhasSeguidas: 0, proximaTentativaEm: '', pedidoEm: '', pedidoPor: '', quantidade: 2 },
  arquivos: [{ id: 11, sequencial: 1, versao: 1, titulo: 'Aviso de dispensa', tipoDocumento: 'Aviso de Contratação Direta', nome: 'aviso.pdf', sha256: 'a'.repeat(64), tamanho: 183420, guardado: true, repetidoDe: null, baixadoEm: '2026-11-01T15:00:05.000Z', situacao: 'BAIXADO', tentativas: 0, ultimoErro: '', proximaTentativaEm: '', textoSituacao: 'EXTRAIDO', textoMotivo: '', textoPaginas: 3, textoCaracteres: EDITAL.length, textoHash: 'b'.repeat(64), ativoNaFonte: true, substituidoEm: '' },
    { id: 12, sequencial: 2, versao: 1, titulo: 'Termo de referência (digitalizado)', tipoDocumento: 'Termo de Referência', nome: 'tr.pdf', sha256: 'c'.repeat(64), tamanho: 2048000, guardado: true, repetidoDe: null, baixadoEm: '2026-11-01T15:00:09.000Z', situacao: 'BAIXADO', tentativas: 0, ultimoErro: '', proximaTentativaEm: '', textoSituacao: 'NAO_EXTRAIDO', textoMotivo: 'PDF sem texto em nenhuma das 4 páginas (provavelmente imagem escaneada; precisa de OCR, que o SGO+ não faz). Abra o arquivo e leia à mão.', textoPaginas: 4, textoCaracteres: 0, textoHash: '', ativoNaFonte: true, substituidoEm: '' }],
  baseHash: 'd'.repeat(64) };
const TEXTOS = [{ ref: 'A1', id: 11, titulo: 'Aviso de dispensa', nome: 'aviso.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: EDITAL, cortado: false },
  { ref: 'A2', id: 12, titulo: 'Termo de referência (digitalizado)', nome: 'tr.pdf', sha256: 'c'.repeat(64), situacao: 'NAO_EXTRAIDO', motivo: 'PDF sem texto', texto: '', cortado: false }];

/** Resposta da IA que passa no verificador (trechos copiados das fontes). */
function respostaValida(extra) {
  return Object.assign({
    resumo: 'Dispensa do município de Aparecida do Rio Doce para manutenção corretiva de quatro equipamentos, um deles autoclave. O termo de referência está digitalizado e não foi lido.',
    capacidade: { pontos: 12, justificativa: 'A autoclave casa com a manutenção de autoclave do catálogo; os equipamentos de fisioterapia não estão no catálogo.', itens: [
      { descricao: 'Manutenção corretiva de autoclave horizontal 21 litros', grau: 'MEDIA', servico: 'MP_AUTOCLAVE_BANCADA', fonte: { ref: 'A1', trecho: '01 autoclave horizontal 21 litros' } },
      { descricao: 'Ultrassom fisioterapêutico, eletroestimulador e bicicleta ergométrica', grau: 'NAO_ATENDE', servico: '', fonte: { ref: 'A1', trecho: '01 aparelho de ultrassom fisioterapêutico, 01 eletroestimulador' } }] },
    documentacao: { pontos: 7.5, justificativa: 'Exigências comuns de regularidade fiscal e atestado.', exigencias: [{ texto: 'Certidões negativas e FGTS', fonte: { ref: 'A1', trecho: 'certidão negativa de débitos federais, estaduais e municipais' } }] },
    riscos: [{ codigo: 'SLA_HORAS', texto: 'Atendimento em 24 horas.', fonte: { ref: 'A1', trecho: 'O atendimento deverá ocorrer em até 24 horas' } },
      { codigo: 'PECAS_SEM_TETO', texto: 'Peças por conta da contratada.', fonte: { ref: 'A1', trecho: 'As peças serão fornecidas pela contratada sem custo adicional' } }],
    travas: [],
    afirmacoes: [
      { tipo: 'FATO', criterio: 'capacidade', texto: 'O objeto é manutenção corretiva de quatro equipamentos médicos e fisioterapêuticos.', fonte: { ref: 'CAMPO:objeto', trecho: 'MANUTENÇÃO CORRETIVA DE 04 (QUATRO) EQUIPAMENTOS MÉDICOS' } },
      { tipo: 'INFERENCIA', criterio: 'capacidade', texto: 'Só a autoclave tem serviço no catálogo; o resto depende de parceiro.' },
      { tipo: 'PENDENCIA', criterio: 'documentacao', texto: 'Ler o termo de referência digitalizado (sem texto) para conferir o escopo da autoclave.' }]
  }, extra || {});
}

function ambiente(o) {
  o = o || {};
  const tabelas = { CAD_USUARIOS: USUARIOS.map((u) => ({ ID: u[0], USUARIO: u[1], NOME: u[2], PERFIL: u[3], STATUS: 'ATIVO' })), LIC_OPORTUNIDADES: [Object.assign({}, OP), Object.assign({}, OP2)] };
  const props = Object.assign({}, o.semChave ? {} : { GEMINI_API_KEY: 'chave-de-teste', IA_MODEL: 'gemini-2.5-flash' }, o.props || {}), cache = {}, sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  let seq = 0;
  const srv = { pedidos: [], conteudos: [], arquivos: JSON.parse(JSON.stringify(ARQS)), textos: TEXTOS.map((t) => Object.assign({}, t)) };
  const ia = { respostas: (o.respostas || []).slice(), prompts: [] };
  const SGO_LICITACOES = {
    listar: () => ({ itens: [], ate: '', mais: false }), conexoes: () => [], situacao: () => ({ ligado: true }), testar: () => ({ ok: true }), coletarAgora: () => ({ pedido: true }),
    obter: (f) => ({ atual: null, versoes: [], itens: f.chave === CHAVE ? [{ numeroItem: 1, descricao: 'Manutenção corretiva de equipamentos médicos', materialServico: 'S', quantidade: 4, unidade: 'UNIDADE', valorUnitario: 2107.86, hash: 'i1' }] : [] }),
    arquivos: (f) => (f.chave === CHAVE ? srv.arquivos : { chave: f.chave, rodando: false, estado: null, arquivos: [], baseHash: 'e'.repeat(64) }),
    arquivosPedir: (f) => { srv.pedidos.push(f); return { pedido: true, jaRodando: false }; },
    textos: (f) => (f.chave === CHAVE ? srv.textos : []),
    arquivoConteudo: (f) => { srv.conteudos.push(f.id); return { id: f.id, chave: CHAVE, nome: 'aviso.pdf', tipo: 'application/pdf', sha256: 'a'.repeat(64), tamanho: 10, base64: Buffer.from('%PDF-teste').toString('base64') }; }
  };
  const ctx = vm.createContext({
    console, Date: DataFixa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
    Utilities: criarUtilities({ computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date(AGORA).toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq) }, d))); }
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada. Entre de novo'); return sessoes[sid]; },
    SGO_execucaoInterna_: () => o.interna !== false,
    SGO_DocA4_chamarGemini_: (prompt) => { ia.prompts.push(prompt); if (!ia.respostas.length) throw new Error('A IA está temporariamente indisponível'); const r = ia.respostas.shift(); if (r instanceof Error) throw r; return typeof r === 'string' ? r : JSON.stringify(r); },
    ComEsp_fabricantes_: () => ['marca exemplo'],
    SGO_LICITACOES
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js']) vm.runInContext(ler(f), ctx, { filename: f });
  const api = (sid, acao, d) => ctx.Licitacoes_api(sid, acao, d || {});
  return { ctx, tabelas, props, srv, ia, api, op: (id) => tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === (id || 'op1')), hist: (tipo) => (tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo), analises: () => tabelas.LIC_ANALISES || [] };
}

test('permissão: só Diretoria e Administrador usam arquivos e análise; os demais são recusados sem gravar nada nem chamar a IA', () => {
  const a = ambiente({ respostas: [respostaValida()] });
  for (const sid of ['s_gil', 's_vera', 's_tiago', 's_cliente']) {
    for (const acao of ['arquivos', 'buscarArquivos', 'arquivoBaixar', 'analise', 'analisar']) {
      const r = a.api(sid, acao, { id: 'op1', arquivo: 11, motivo: 'tentativa sem permissão de refazer' });
      assert.equal(r.ok, false, sid + ' ' + acao);
      assert.equal(r.semAcesso, true, sid + ' ' + acao);
    }
  }
  assert.deepEqual(a.analises(), []);
  assert.deepEqual(a.ia.prompts, [], 'a IA não foi chamada');
  assert.deepEqual(a.srv.pedidos, []);
  assert.deepEqual(a.srv.conteudos, []);
  assert.equal(a.hist().length, 0);
  for (const sid of ['s_dora', 's_admin']) assert.equal(a.api(sid, 'arquivos', { id: 'op1' }).ok, true, sid);
});

test('sem a chave da IA: "análise por IA indisponível: falta a chave", nada é inventado nem gravado; os arquivos continuam disponíveis', () => {
  const a = ambiente({ semChave: true });
  const r = a.api('s_dora', 'analisar', { id: 'op1' });
  assert.equal(r.ok, false);
  assert.match(r.message, /análise por IA indisponível: falta a chave da IA \(GEMINI_API_KEY em Administração > Chaves e senhas/);
  assert.match(r.message, /Nada foi alterado\.$/);
  const f = a.api('s_dora', 'ficha', { id: 'op1' });
  assert.equal(f.ok, true, f.message);
  assert.equal(f.analise.iaDisponivel, false);
  assert.match(f.analise.aviso, /^Análise por IA indisponível: falta a chave/);
  assert.equal(f.analise.atual, null);
  assert.equal(f.arquivos.arquivos.length, 2, 'os arquivos aparecem mesmo sem IA');
  // a rotina do servidor registra os arquivos no histórico, mas não analisa
  const x = a.ctx.Lic_aposArquivos_({ chaves: [CHAVE] });
  assert.equal(x.indisponivel, true);
  assert.equal(x.analisadas, 0);
  assert.deepEqual(a.analises(), []);
  assert.equal(a.op().NOTA, undefined, 'nenhuma nota inventada');
  const h = a.hist('ARQUIVOS_DA_FONTE');
  assert.equal(h.length, 1);
  assert.match(h[0].TEXTO, /Aviso de dispensa v1 \(texto extraído, SHA-256 aaaaaaaaaaaaaaaa\)/);
  assert.match(h[0].TEXTO, /Termo de referência \(digitalizado\) v1 \(texto não extraído: PDF sem texto/);
  assert.equal(h[0].HASH, 'd'.repeat(64));
  a.ctx.Lic_aposArquivos_({ chaves: [CHAVE] });
  assert.equal(a.hist('ARQUIVOS_DA_FONTE').length, 1, 'mesma base de arquivos não repete o registro');
});

test('análise com a IA: nota pelo código (prazo com Finados, localização, valor, margem) + critérios da IA conferidos; versão, histórico com fonte e hash', () => {
  const a = ambiente({ respostas: [respostaValida()] });
  const r = a.api('s_dora', 'analisar', { id: 'op1' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.resultado.analisada, true);
  const an = a.analises()[0];
  assert.equal(an.SITUACAO, 'CONCLUIDA');
  assert.equal(an.VERSAO, 1);
  const crit = JSON.parse(an.CRITERIOS_JSON);
  // prazo: de dom 01/11 até qui 05/11 = seg 02 é Finados → 3 dias úteis (03, 04, 05) → 4 pontos
  assert.equal(crit.prazo.pontos, 4);
  assert.match(crit.prazo.como, /3 dias úteis até 05\/11\/2026 \(feriados no caminho: 02\/11\/2026 \(feriado nacional\)\)/);
  assert.equal(crit.localizacao.pontos, 11.5, 'GO 8 + distância 3,5 (pendência)');
  assert.equal(crit.valor.pontos, 5, 'R$ 8.431,44: até R$ 20 mil');
  assert.equal(crit.margem.pontos, 5, 'sem piso: 5 com pendência');
  assert.equal(crit.capacidade.pontos, 12);
  assert.equal(crit.documentacao.pontos, 7.5);
  assert.equal(crit.riscos.pontos, 3, '5 menos 2 riscos provados');
  assert.equal(an.NOTA, 4 + 11.5 + 5 + 5 + 12 + 7.5 + 3);
  assert.equal(an.CLASSE, 'BAIXA');
  assert.equal(an.TRAVADA, 'NAO');
  // fatos com a fonte (o arquivo e o SHA-256), inferências e pendências (do sistema e da IA)
  const af = JSON.parse(an.AFIRMACOES_JSON);
  const fatoIA = af.find((x) => x.tipo === 'FATO' && x.origem === 'IA');
  assert.deepEqual([fatoIA.fonte.ref, fatoIA.fonte.rotulo], ['CAMPO:objeto', 'Objeto da contratação (PNCP)']);
  const itens = JSON.parse(an.ITENS_JSON);
  assert.equal(itens[0].fonte.arquivo.sha256, 'a'.repeat(64));
  assert.equal(itens[0].fonte.ref, 'A1');
  assert.ok(af.some((x) => x.tipo === 'PENDENCIA' && x.origem === 'SISTEMA' && /distância rodoviária/.test(x.texto)));
  assert.ok(af.some((x) => x.tipo === 'INFERENCIA' && x.origem === 'IA'));
  // o prompt leva os dias úteis e os feriados calculados (a IA não conta datas) e as regras do dono
  const p = a.ia.prompts[0];
  assert.match(p, /CALCULADO PELO SISTEMA \(não recalcule\): hoje 01\/11\/2026; 3 dias úteis até 05\/11\/2026 \(feriados no caminho: 02\/11\/2026/);
  assert.match(p, /NÃO é acreditada RBC/);
  assert.match(p, /BALANÇAS e ESFIGMOMANÔMETROS/);
  assert.match(p, /EMPRESA DE PEQUENO PORTE \(EPP\)/);
  assert.match(p, /=== A1 · Aviso de dispensa \(aviso\.pdf\) ===\nAVISO DE DISPENSA/);
  assert.doesNotMatch(p, /=== A2/, 'arquivo sem texto não vira fonte citável');
  // oportunidade: nota e versão por merge (os campos da triagem continuam)
  const op = a.op();
  assert.deepEqual([op.NOTA, op.NOTA_CLASSE, op.ANALISE_VERSAO, op.ANALISE_SITUACAO, op.TRIAGEM], [an.NOTA, 'BAIXA', 1, 'CONCLUIDA', 'CANDIDATA']);
  const h = a.hist('ANALISE_IA')[0];
  assert.equal(h.USUARIO_NOME, 'DORA DIRETORA TESTE');
  assert.equal(h.VERSAO, '1', 'histórico guarda a versão como texto (como na etapa 1)');
  assert.equal(h.HASH, an.HASH);
  assert.match(h.FONTE, /^IA \(gemini-2\.5-flash\) sobre a versão 1 da fonte e 2 arquivo\(s\): A1 aaaaaaaaaaaa, A2 cccccccccccc/);
  assert.match(h.TEXTO, /A decisão continua com a Diretoria\.$/);
  assert.equal(h.DE, 'sem nota');
  // a ficha mostra a análise; a lista ordena por nota
  const f = a.api('s_dora', 'ficha', { id: 'op1' });
  assert.equal(f.analise.atual.nota, an.NOTA);
  assert.equal(f.analise.desatualizada, false);
  assert.equal(f.op.nota, an.NOTA);
  const lista = a.api('s_dora', 'oportunidades', { aba: 'analisar', ordem: 'nota' });
  assert.deepEqual(lista.lista.map((x) => [x.codigo, x.nota]), [['LIC-2026-0004', 41.5], ['LIC-2026-0097', an.NOTA]].sort((x, y) => y[1] - x[1]));
  assert.equal(lista.ordem, 'nota');
  assert.equal(a.api('s_dora', 'oportunidades', { aba: 'analisar' }).lista[0].codigo, 'LIC-2026-0097', 'padrão: prioridade da UF (GO 8 antes de SP 3)');
});

test('verificador recusa: FATO sem fonte, trecho que não está na fonte, frase de decisão, promessa de RBC, fabricante, pontos fora do peso, código fora da lista', () => {
  const a = ambiente();
  const ctx = { fontes: a.ctx.Lic_fontesAnalise_(OP, null, TEXTOS), pesos: a.ctx.Lic_pesos_(), fabricantes: ['marca exemplo'] };
  const v = (j) => a.ctx.Lic_verificarAnalise_(j, ctx);
  assert.equal(v(respostaValida()).ok, true, JSON.stringify(v(respostaValida()).problemas));
  const semFonte = respostaValida(); semFonte.afirmacoes[0] = { tipo: 'FATO', criterio: 'capacidade', texto: 'O edital pede calibração.' };
  assert.match(v(semFonte).problemas.join('\n'), /afirmação 1: FATO sem fonte/);
  const inventado = respostaValida(); inventado.capacidade.itens[0].fonte = { ref: 'A1', trecho: 'calibração de 300 termômetros digitais' };
  assert.match(v(inventado).problemas.join('\n'), /capacidade, item 1: o trecho "calibração de 300 termômetros digitais" não está em A1/);
  const refErrada = respostaValida(); refErrada.riscos[0].fonte = { ref: 'A9', trecho: 'O atendimento deverá ocorrer em até 24 horas' };
  assert.match(v(refErrada).problemas.join('\n'), /risco 1: fonte "A9" não existe/);
  const decide = respostaValida({ resumo: 'O serviço é simples e barato. Recomendo participar desta dispensa pela proximidade.' });
  assert.match(v(decide).problemas.join('\n'), /resumo: a IA não decide/);
  const certo = respostaValida(); certo.afirmacoes[1].texto = 'A Metrolabs não é acreditada RBC; as calibrações são rastreáveis, o que pode bastar se o edital aceitar.';
  assert.equal(v(certo).ok, true, 'a frase certa (não é acreditada) passa: ' + v(certo).problemas.join('; '));
  const rbc = respostaValida(); rbc.afirmacoes[1].texto = 'A Metrolabs é acreditada RBC para massa, o que atende o edital.';
  assert.match(v(rbc).problemas.join('\n'), /não afirme nem prometa acreditação RBC/);
  const fab = respostaValida(); fab.afirmacoes[1].texto = 'A autoclave é da Marca Exemplo, conhecida no mercado.';
  assert.match(v(fab).problemas.join('\n'), /cita fabricante ou marca \(marca exemplo\)/);
  const muito = respostaValida(); muito.capacidade.pontos = 40; muito.documentacao.pontos = 12;
  const pm = v(muito).problemas.join('\n');
  assert.match(pm, /capacidade: 40 pontos fora do peso \(0 a 30\)/);
  assert.match(pm, /documentação: o SGO\+ ainda não tem o cadastro de habilitação; vale no máximo 7,5/);
  const semAlta = respostaValida(); semAlta.capacidade.pontos = 20;
  assert.match(v(semAlta).problemas.join('\n'), /acima de 15 pontos exige item com grau ALTA provado/);
  const cod = respostaValida(); cod.riscos[0].codigo = 'RISCO_INVENTADO'; cod.travas = [{ codigo: 'QUALQUER', texto: 'x', fonte: {} }];
  const pc = v(cod).problemas.join('\n');
  assert.match(pc, /risco 1: código fora da lista \(RISCO_INVENTADO\)/);
  assert.match(pc, /trava 1: código fora da lista \(QUALQUER\)/);
  assert.equal(v('texto solto').ok, false);
  assert.equal(v(null).problemas.join('|'), 'a resposta não é o JSON pedido');
  // trecho com acento, caixa e espaços diferentes ainda é o mesmo trecho (o PDF extraído varia)
  const acento = respostaValida(); acento.capacidade.itens[0].fonte = { ref: 'A1', trecho: '01  AUTOCLAVE horizontal   21 litros' };
  assert.equal(v(acento).ok, true);
});

test('refação: resposta recusada volta à IA com os problemas; recusada de novo fica RECUSADA (versão nova) e a nota anterior continua', () => {
  const ruim = respostaValida(); ruim.afirmacoes[0] = { tipo: 'FATO', texto: 'Sem fonte.' };
  const a = ambiente({ respostas: [ruim, respostaValida()] });
  let r = a.api('s_dora', 'analisar', { id: 'op1' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.resultado.analisada, true);
  assert.equal(a.ia.prompts.length, 2);
  assert.match(a.ia.prompts[1], /SUA RESPOSTA ANTERIOR FOI RECUSADA PELO VERIFICADOR[\s\S]*afirmação 1: FATO sem fonte/);
  const an1 = a.analises()[0];
  assert.equal(an1.TENTATIVAS, 2);
  assert.match(an1.RECUSAS_JSON, /FATO sem fonte/);
  const nota1 = a.op().NOTA;
  // refazer exige motivo
  r = a.api('s_dora', 'analisar', { id: 'op1', motivo: 'curto' });
  assert.equal(r.ok, false);
  assert.match(r.message, /Escreva o motivo para refazer a análise \(pelo menos 10 letras\)[\s\S]*Nada foi alterado/);
  a.ia.respostas.push(ruim, ruim, ruim);
  r = a.api('s_dora', 'analisar', { id: 'op1', motivo: 'O órgão publicou retificação do aviso' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.resultado.recusada, true);
  const an2 = a.analises()[1];
  assert.deepEqual([an2.VERSAO, an2.SITUACAO, an2.TENTATIVAS], [2, 'RECUSADA', 3]);
  assert.equal(a.op().NOTA, nota1, 'a nota da versão 1 continua');
  assert.equal(a.op().ANALISE_SITUACAO, 'RECUSADA');
  assert.equal(a.analises()[0].SITUACAO, 'CONCLUIDA', 'a versão 1 não foi sobrescrita');
  assert.equal(a.hist('ANALISE_IA_RECUSADA')[0].VERSAO, '2');
  const f = a.api('s_dora', 'ficha', { id: 'op1' });
  assert.equal(f.analise.atual.versao, 1);
  assert.equal(f.analise.ultima.situacao, 'RECUSADA');
  // IA fora do ar: ERRO registrado, a base não é marcada (tenta de novo depois)
  r = a.api('s_dora', 'analisar', { id: 'op1', motivo: 'Tentar de novo depois da recusa' });
  assert.equal(r.resultado.erro, true);
  assert.match(r.resultado.texto, /A IA não respondeu agora \(A IA está temporariamente indisponível\)/);
  assert.equal(a.analises()[2].SITUACAO, 'ERRO');
});

test('trava provada com trecho zera a nota (classe "candidata a descarte"); quem descarta é a Diretoria', () => {
  const edital = TEXTOS.map((t) => Object.assign({}, t));
  edital[0].texto = EDITAL + '\nA contratada deverá ser laboratório acreditado pela Cgcre na Rede Brasileira de Calibração para a grandeza massa.';
  const resp = respostaValida({ travas: [{ codigo: 'RBC_OBRIGATORIA', texto: 'Exige laboratório acreditado na RBC e o edital não aceita rastreabilidade.', fonte: { ref: 'A1', trecho: 'deverá ser laboratório acreditado pela Cgcre na Rede Brasileira de Calibração' } }] });
  const a = ambiente({ respostas: [resp] });
  a.srv.textos = edital;
  const r = a.api('s_dora', 'analisar', { id: 'op1' });
  assert.equal(r.ok, true, r.message);
  const an = a.analises()[0];
  assert.deepEqual([an.NOTA, an.CLASSE, an.TRAVADA], [0, 'DESCARTE', 'SIM']);
  assert.ok(Number(an.SOMA) > 0, 'a soma sem a trava fica registrada');
  assert.match(a.op().NOTA_TRAVA, /Exige laboratório acreditado RBC/);
  assert.equal(a.op().SITUACAO, 'RADAR', 'a IA não descarta: a situação não muda');
});

test('rotina do servidor (Lic_aposArquivos_): analisa só quando a base muda, só no radar/em análise com prazo aberto, uma por chamada; só execução interna', () => {
  const a = ambiente({ respostas: [respostaValida(), respostaValida()] });
  let x = a.ctx.Lic_aposArquivos_({ chaves: [CHAVE] });
  assert.deepEqual([x.registradas, x.analisadas], [1, 1]);
  assert.equal(a.analises()[0].ORIGEM_PEDIDO, 'AUTOMATICA');
  assert.equal(a.analises()[0].PEDIDO_POR_NOME, 'Rotina de arquivos (servidor)');
  x = a.ctx.Lic_aposArquivos_({ chaves: [CHAVE] });
  assert.deepEqual([x.analisadas, x.semMudanca], [0, 1], 'mesma base: não chama a IA de novo');
  assert.equal(a.ia.prompts.length, 1);
  // arquivo novo (base dos arquivos mudou): refaz
  a.srv.arquivos.baseHash = 'f'.repeat(64);
  x = a.ctx.Lic_aposArquivos_({ chaves: [CHAVE] });
  assert.equal(x.analisadas, 1);
  assert.equal(a.analises().length, 2);
  assert.equal(a.hist('ARQUIVOS_DA_FONTE').length, 2);
  // descartada não é analisada
  a.op().SITUACAO = 'DESCARTADA'; a.srv.arquivos.baseHash = '1'.repeat(64);
  x = a.ctx.Lic_aposArquivos_({ chaves: [CHAVE] });
  assert.equal(x.analisadas, 0);
  assert.match(a.api('s_dora', 'analisar', { id: 'op1', motivo: 'tentar analisar descartada' }).message, /a oportunidade está descartada \(reabra antes/);
  assert.match(a.api('s_dora', 'buscarArquivos', { id: 'op1' }).message, /está descartada\. Reabra antes/);
  // chamada de fora (navegador) não roda
  const b = ambiente({ interna: false, respostas: [respostaValida()] });
  assert.equal(b.ctx.Lic_aposArquivos_({ chaves: [CHAVE] }), null);
  assert.equal(b.ia.prompts.length, 0);
});

test('arquivos pela tela: buscar pede ao servidor (histórico); abrir só arquivo da própria oportunidade e registra quem abriu com o hash', () => {
  const a = ambiente();
  let r = a.api('s_dora', 'buscarArquivos', { id: 'op1' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(a.srv.pedidos.map((p) => [p.chave, p.quem]), [[CHAVE, 'DORA DIRETORA TESTE']]);
  assert.match(r.texto, /segundo plano/);
  assert.equal(a.hist('ARQUIVOS_PEDIDOS').length, 1);
  r = a.api('s_dora', 'arquivoBaixar', { id: 'op1', arquivo: 11 });
  assert.equal(r.ok, true, r.message);
  assert.equal(Buffer.from(r.base64, 'base64').toString(), '%PDF-teste');
  const h = a.hist('ARQUIVO_ABERTO')[0];
  assert.equal(h.HASH, 'a'.repeat(64));
  assert.match(h.TEXTO, /Abriu o arquivo "Aviso de dispensa" \(aviso\.pdf\)/);
  r = a.api('s_dora', 'arquivoBaixar', { id: 'op2', arquivo: 11 });
  assert.equal(r.ok, false);
  assert.match(r.message, /não é desta oportunidade[\s\S]*Nada foi alterado/);
  // enviar para análise pede os arquivos ao servidor
  a.api('s_dora', 'enviarAnalise', { id: 'op2' });
  assert.equal(a.srv.pedidos[1].chave, 'PNCP:46612032000149-1-000296/2026');
});

// ---------------- telas (estrutura, computador e celular de 390 px) ----------------
function tela(o) {
  o = o || {};
  const html = fs.readFileSync(path.join(pasta, 'JS_Licitacoes.html'), 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('menu-secao-licitacoes'); el('licCorpo');
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's', google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api() {} }; } }; } } } } });
  vm.runInContext(script, ctx);
  return { ctx, html };
}

test('telas: abas Arquivos e Análise (hash, situação da extração, fatos com fonte, indisponível sem a chave), nota no cartão, ordenar por nota, celular 390 px', () => {
  const a = ambiente({ respostas: [respostaValida()] });
  a.api('s_dora', 'analisar', { id: 'op1' });
  const d = a.api('s_dora', 'ficha', { id: 'op1' });
  const t = tela();
  const arq = t.ctx.Lic_htmlFicha_(d, 'arquivos');
  assert.match(arq, /aria-selected="true" data-lic-fab="arquivos">Arquivos \(2\)/);
  assert.match(arq, /data-lic-fab="analise">Análise \(/);
  assert.match(arq, /<span class="lic-hash" title="SHA-256 do conteúdo">a{64}<\/span>/);
  assert.match(arq, /cm-selo verde">Texto extraído<\/span> <span class="cm-meta">3 páginas/);
  assert.match(arq, /cm-selo vermelho">Texto não extraído<\/span> <span class="cm-meta">PDF sem texto em nenhuma das 4 páginas/);
  assert.match(arq, /data-lic-arq-abrir="11">Abrir<\/button><button type="button" class="btn-secondary" data-lic-arq-baixar="11">Baixar/);
  assert.match(arq, /data-lic-buscar-arq>Buscar arquivos agora/);
  assert.match(arq, /Lista lida em .*: 2 arquivo\(s\) na fonte\./);
  const tds = arq.match(/<td[^>]*>/g) || [];
  assert.ok(tds.length >= 12 && tds.every((x) => /data-r="/.test(x)), 'toda célula com data-r (vira cartão no celular)');
  const an = t.ctx.Lic_htmlFicha_(d, 'analise');
  assert.match(an, /Nota 48 de 100 · Baixa/);
  assert.match(an, /data-lic-analisar="refazer">Refazer análise/);
  assert.match(an, /Ela não decide: descartar ou participar é da Diretoria/);
  assert.match(an, /<span class="lic-af-tipo FATO">Fato<\/span>/);
  assert.match(an, /<span class="lic-af-tipo INFERENCIA">Inferência<\/span>/);
  assert.match(an, /<span class="lic-af-tipo PENDENCIA">Pendência<\/span>/);
  assert.match(an, /<blockquote class="lic-trecho">"01 autoclave horizontal 21 litros"<cite>Fonte: A1 · Aviso de dispensa \(aviso\.pdf\) · aviso\.pdf · SHA-256 aaaaaaaaaaaaaaaa…<\/cite>/);
  assert.match(an, /Prazo<\/td><td data-r="Pontos"><b>4<\/b> de 10/);
  assert.match(an, /Sistema \(dados reais\)/);
  assert.match(an, /Análise versão 1 · .* · pedida por DORA DIRETORA TESTE/);
  // sem a chave: aviso e botão desligado; nada de nota inventada
  const b = ambiente({ semChave: true });
  const db = b.api('s_dora', 'ficha', { id: 'op1' });
  const sem = t.ctx.Lic_htmlFicha_(db, 'analise');
  assert.match(sem, /Análise por IA indisponível: falta a chave da IA/);
  assert.match(sem, /data-lic-analisar="primeira" disabled aria-disabled="true">Analisar agora/);
  assert.match(sem, /Sem a chave da IA, a nota não é calculada: nada é inventado/);
  assert.doesNotMatch(sem, /Nota \d/);
  // cartão: nota e classe no lugar da UF; sem nota, a UF como antes
  const c = t.ctx.Lic_cartaoHtml_(Object.assign({}, d.op));
  assert.match(c, /<div class="lic-nota n-baixa" aria-label="Nota 48 de 100, baixa"><b>48<\/b><span>baixa<\/span>/);
  assert.match(c, /Nota da análise por IA \(versão 1, .*\)\. A IA não decide\./);
  assert.match(t.ctx.Lic_cartaoHtml_(Object.assign({}, d.op, { nota: null })), /lic-nota media" aria-label="UF GO/);
  assert.match(t.ctx.Lic_cartaoHtml_(Object.assign({}, d.op, { nota: 0, notaClasse: 'DESCARTE', notaTrava: 'Exige laboratório acreditado RBC' })), /lic-nota n-descarte" aria-label="Nota 0 de 100, descarte, com trava"[\s\S]*trava: Exige laboratório acreditado RBC/);
  const cab = t.ctx.Lic_htmlListaCab_({ contagens: {}, sessoes: {} }, 'analisar', { busca: '', uf: '', selo: '', sessao: '' });
  assert.match(cab, /<label for="licFOrdem">Ordenar por<\/label><select id="licFOrdem"><option value="prioridade" selected>Prioridade da UF e prazo<\/option><option value="nota">Nota \(maior primeiro\)/);
  // celular 390 px: nada com largura fixa maior que a tela; sem atualização automática
  for (const m of t.html.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  for (const m of t.html.matchAll(/min-width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 200, 'largura mínima ' + m[0]);
  assert.doesNotMatch(t.html, /setInterval/);
  assert.match(t.html, /\r\n/, 'JS_*.html em CRLF como os demais');
  assert.doesNotMatch(t.html, /[^\r]\n/, 'nenhuma linha só com LF (edição por script em CRLF)');
});

test('ajuda da tela, manual e base do assistente falam de Arquivos, Análise e da chave da IA', () => {
  const a = ambiente();
  const telas = a.ctx.SGO_ajudaTelas_Licitacoes_();
  const t = JSON.stringify(telas.licitacoes_oportunidades);
  assert.match(t, /Arquivos/);
  assert.match(t, /Refazer análise/);
  assert.match(t, /falta a chave/);
  assert.match(t, /Ordenar por/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  for (const s of ['SHA-256', 'Refazer análise', 'FATO', 'INFERÊNCIA', 'PENDÊNCIA', 'falta a chave', 'texto não extraído']) assert.ok(manual.includes(s), 'manual: ' + s);
  assert.match(ler('SGO_AssistenteManuais.js'), /Refazer análise/);
  const textos = ['SGO_Licitacoes_Analise.js', 'SGO_Ajuda_Licitacoes.js', 'JS_Licitacoes.html'].map(ler).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /somos acreditad|Metrolabs é acreditad/i);
});
