// Dossiê do atendimento da representada e documentos do hospital (16/11/2026). Pedido do dono: "um dossiê único, muito bem
// elaborado [...] O do cliente pode ser resumido ou até mesmo só um termo de retirada e outro de devolução". Decisão combinada:
// Metrolabs e representada recebem o MESMO dossiê (a da representada sem as anotações internas); o hospital recebe o Resumo do
// serviço com o Termo de retirada e o Termo de entrega, sem o nome da representada e sem dados comerciais. Retirada sem termo (caso
// real CH-2026-0030) não finge assinatura. Código real do SGO+ (tests/_assistencia_ambiente.cjs). Só dados fictícios.
// Capturas A4 (PDF do Chromium, páginas em PNG): output/representacao-fluxo-20261116/dossie/capturas (CAPTURAS_DOSSIE muda a pasta).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), zlib = require('node:zlib');
const { ambiente, FOTO } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js',
  'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Regua.js', 'SGO_Representacao_Midia.js', 'SGO_Representacao_Fluxo.js', 'SGO_Representacao_Marcos.js'];
// fotos e vídeos de ensaio (desenhos), quando a pasta existe; senão, a foto mínima do ambiente
const MIDIA = path.join(__dirname, '..', 'output', 'representacao-fluxo-20261116', 'telas-para-o-dono', 'ensaio', 'midia');
const b64 = (n) => { try { return fs.readFileSync(path.join(MIDIA, n)).toString('base64'); } catch (e) { return FOTO; } };
const img = (n, legenda, publico) => ({ nome: n, tipo: 'image/jpeg', base64: b64(n), legenda, publico });

/** PNG de verdade com um rabisco (assinatura de ensaio), para o A4 mostrar a assinatura colhida no aparelho. */
function pngAssinatura() {
  const w = 300, h = 90, px = Buffer.alloc((w * 3 + 1) * h, 255);
  for (let y = 0; y < h; y++) px[y * (w * 3 + 1)] = 0;
  const ponto = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const xx = Math.round(x + dx), yy = Math.round(y + dy); if (xx >= 0 && xx < w && yy >= 0 && yy < h) { const o = yy * (w * 3 + 1) + 1 + xx * 3; px[o] = 20; px[o + 1] = 40; px[o + 2] = 110; } } };
  for (let t = 0; t < 1; t += 0.0005) ponto(20 + t * 260, 45 + 25 * Math.sin(t * 19) * Math.cos(t * 5) + 8 * Math.sin(t * 61));
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const bloco = (tipo, dados) => { const t = Buffer.from(tipo), l = Buffer.alloc(4), cr = Buffer.alloc(4); l.writeUInt32BE(dados.length); cr.writeUInt32BE(crc(Buffer.concat([t, dados]))); return Buffer.concat([l, t, dados, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(px)), bloco('IEND', Buffer.alloc(0))]).toString('base64');
}
const ASSINATURA = pngAssinatura();

// 16/11/2026 (opção B do dono): o aplicativo do técnico mostra a declaração do termo de entrega antes do quadro de assinatura.
// A cópia do aplicativo com a mudança fica em output/representacao-fluxo-20261116/dossie/app-campo (o aplicativo é publicado no
// servidor, fora do cand10); aqui as funções da tela são carregadas da própria cópia, num contexto isolado.
const APP_DIR = path.join(__dirname, '..', 'output', 'representacao-fluxo-20261116', 'dossie', 'app-campo');
const APP_OK = fs.existsSync(path.join(APP_DIR, 'app.js')) && fs.existsSync(path.join(APP_DIR, 'regras.js'));
let APP = null;
function app() {
  if (APP) return APP;
  const vm = require('node:vm');
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(APP_DIR, 'regras.js'), 'utf8').replace(/^export /gm, '') + '\n;globalThis.__R = { termoDeDados, termoParaEnvio, normalizarOs, rotulosLogistica };', ctx);
  const src = fs.readFileSync(path.join(APP_DIR, 'app.js'), 'utf8');
  const fn = (nome) => { const i = src.indexOf('function ' + nome + '('); const j = src.indexOf('\n}\n', i); if (i < 0 || j < 0) throw new Error('sem ' + nome); return src.slice(i, j + 2); };
  ctx.X = null;
  vm.runInContext('const R = __R; const E = { regras: {} }; const esc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"\']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" }[c]));' +
    'const execDe = () => X; const fechada = () => false; const seguirOuVoltar = () => "";\n' + ['declaracaoEntregaTexto', 'dadosDeclaracao', 'blocoDeclaracao', 'telaAssinatura'].map(fn).join('\n') +
    '\n;globalThis.__A = { declaracaoEntregaTexto, dadosDeclaracao, blocoDeclaracao, telaAssinatura };', ctx);
  APP = { ctx, R: ctx.__R, A: ctx.__A, src };
  return APP;
}
/** O que o aparelho tem na hora da assinatura: a O.S. que veio do servidor (normalizada pelo app) e o termo e a conferência locais. */
function aparelho(a, osId, logistica, respostas) {
  const os = JSON.parse(JSON.stringify(a.ok(a.app('Ast_appOS', 's_tiago', { osId }), 'Ast_appOS').os));
  const P = app(), o = P.R.normalizarOs(os, 0);
  const x = { termo: P.R.termoDeDados(logistica), respostas: Object.fromEntries(Object.entries(respostas).map(([k, v]) => [k, { valor: v }])) };
  const texto = o.declaracaoEntrega ? P.A.declaracaoEntregaTexto(P.A.dadosDeclaracao(o, x)) : null;
  return { os, o, x, texto, marca: texto ? require('node:crypto').createHash('sha256').update(texto.join('\n'), 'utf8').digest('hex').slice(0, 12) : '' };
}
const TELA = {};

function montar(seq) {
  const a = ambiente({ extras: EXTRAS, agora: Date.parse('2026-11-10T11:00:00-03:00') });
  const T = a.tabelas;
  Object.assign(T.CAD_CLIENTES[0], { RAZAO_SOCIAL: 'HOSPITAL OFTALMOCENTER LTDA', NOME_FANTASIA: 'Hospital Oftalmocenter' });
  Object.assign(T.CAD_UNIDADES[0], { NOME_UNIDADE: 'CME', RESPONSAVEL: 'Responsável do CME', EMAIL: 'cme@oftalmocenter.exemplo.test' });
  Object.assign(T.CAD_EQUIPAMENTOS[1], { TIPO: 'Lavadora ultrassônica', MODELO: 'BR 25 AUT C', SERIE: '12.017.00114', TAG: 'LUS-03' });
  const nomes = { u_gt: 'MATHEUS GODOI', u_tec: 'PAULO HENRIQUE NAZARE DOS PASSOS SILVA', u_cli: 'CME HOSPITAL OFTALMOCENTER', u_dir: 'DIRETORIA METROLABS' };
  T.CAD_USUARIOS.forEach((u) => { if (nomes[u.ID]) { u.NOME = nomes[u.ID]; a.sessoes['s_' + u.USUARIO].nome = nomes[u.ID]; } });
  T.REP_REPRESENTADAS = [{ ID: 'repB', NOME: 'BRASMEDICAL', SITUACAO: 'ATIVA', PRAZOS_JSON: '', CONTATO_NOME: 'Comercial Brasmedical', CONTATO_EMAIL: 'comercial@brasmedical.exemplo.test' }];
  [{ ID: 'rb_adm', USUARIO: 'qualidade', NOME: 'QUALIDADE BRASMEDICAL', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'qualidade@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'atendente', NOME: 'ATENDENTE BRASMEDICAL', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'atendente@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' }]
    .forEach((u) => { T.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.api('s_dora', 'iniciar', {});
  Object.assign(a.props, seq);
  a.rep = (sid, acao, d) => { const r = a.ctx.Representacao_api(sid, acao, d || {}); if (a.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
  a.ok = (r, onde) => { if (!r || r.ok !== true) throw new Error((onde || '') + ': ' + JSON.stringify(r && (r.message || r)).slice(0, 600) + (r && r.faltam ? ' faltam=' + JSON.stringify(r.faltam) : '')); return r; };
  return a;
}
let seqEv = 0;
const ev = (tipo, osId, dados, quando) => ({ tipo, osId, idLocal: 'dos-' + osId + '-' + String(++seqEv).padStart(5, '0'), em: quando, dados: dados || {} });
const sync = (a, eventos) => a.ok(a.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p-' + (++seqEv), eventos }), 'sincronizar');
const fotoOs = (a, osId, nome, pergunta, quando) => a.ok(a.app('Ast_appEnviarFoto', 's_tiago', { osId, idLocal: 'dos-foto-' + String(++seqEv).padStart(5, '0'), nome, base64: b64(nome), perguntaId: pergunta, em: quando }), 'foto ' + nome);
function video(a, id, nome, legenda, quando, publico) {
  const arq = 'arqv-' + (++seqEv);
  let bytes; try { bytes = fs.readFileSync(path.join(MIDIA, nome)); } catch (e) { bytes = Buffer.from('video de ensaio'); }
  a.arquivos[arq] = { id: arq, nome, mime: 'video/webm', bytes, pasta: 'raiz' };
  (a.tabelas.REP_ANEXOS = a.tabelas.REP_ANEXOS || []).push({ ID: 'vid' + seqEv, REPRESENTADA_ID: 'repB', REF_TIPO: 'CHAMADO', REF_ID: id, PUBLICO: publico || 'REPRESENTADA', POR_LADO: 'METROLABS', POR_NOME: 'PAULO HENRIQUE NAZARE DOS PASSOS SILVA', EM: quando,
    SHA256: 'ab12cd34ef56aa', TIPO: 'VIDEO', NOME: nome, MIME: 'video/webm', ARQUIVO_ID: arq, TAMANHO: bytes.length, LEGENDA: legenda });
  return 'vid' + seqEv;
}
const chamado = (a, id) => a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === id);
const assinar = (a, os, quem, doc, quando) => sync(a, [ev('ASSINATURA', os, { papel: 'COLABORADOR', nome: 'PAULO HENRIQUE NAZARE DOS PASSOS SILVA', documento: 'Matrícula 0457', imagem: ASSINATURA }, quando),
  ev('ASSINATURA', os, { nome: quem, documento: doc, imagem: ASSINATURA }, quando)]);
function pedidoAteVisita(a, o) {
  a.mudar(o.pedidoEm);
  a.ok(a.rep(o.quemPede, 'buscarCliente', { documento: '11.222.333/0001-81' }), 'buscarCliente');
  a.ok(a.rep(o.quemPede, 'buscarEquipamento', { clienteId: 'c1', serie: '12.017.00114' }), 'buscarEquipamento');
  const p = a.ok(a.rep(o.quemPede, 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', protocolo: o.protocolo || '', setor: 'CME', contatoNome: 'Responsável do CME', contatoTelefone: '62988887777',
    contatoEmail: 'cme@oftalmocenter.exemplo.test', sintoma: o.sintoma, inicio: 'há uma semana', codigoErro: 'não exibe', parada: 'TOTAL', risco: 'CME sem a lavadora ultrassônica', tentado: 'Desligamos e religamos; limpeza do filtro',
    enquadramento: 'GARANTIA', fotos: [img('equipamento-cme.jpg', 'Lavadora no CME')], fotosEtiqueta: [img('etiqueta-serie.jpg', 'Etiqueta de série')] }), 'abrir pedido').solicitacao;
  a.mudar(o.aceiteEm);
  const c = a.ok(a.rep('s_gil', 'aceitar', { solicitacaoId: p.id, prioridade: 'P2' }), 'aceitar').chamado;
  a.mudar(o.triagemEm);
  a.ok(a.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado com o CME por telefone', risco_operar: 'Médio: não usar até a avaliação', diagnostico_preliminar: 'Falha de cavitação' }, acao: 'PLANEJADO', tipoCodigo: 'INSPECAO_TECNICA' }), 'triagem');
  const ag = a.ok(a.api('s_gil', 'agendar', { id: c.id, tecnicoId: 'u_tec', inicio: o.visitaEm, duracaoMin: 120, tipoCodigo: 'INSPECAO_TECNICA',
    preparo: { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: false, pecasJustificativa: 'visita de diagnóstico', risco: 'baixo' } }), 'agendar');
  return { c, os: ag.os };
}
const ROT = ['Identificação e série', 'Inspeção visual e de vedação', 'Enchimento e escoamento (tempo)', 'Aquecimento (temperatura atingida e tempo)', 'Cavitação (folha de alumínio ou indicador do fabricante)', 'Dosagem de detergente', 'Ciclo completo sem alarme', 'Segurança (tampa ou porta, aterramento)'];
const VAL_R = ['Série 12.017.00114 confere', 'Sem vazamento', 'Enchimento 2 min 10 s; escoamento 1 min 40 s', '55 °C em 18 min', 'Perfurações só no centro', 'Bomba dosadora: 12 mL', 'Alarme E07 no minuto 6', 'Tampa e aterramento conformes'];
const VAL_A = ['Série 12.017.00114 confere', 'Sem vazamento', 'Enchimento 2 min 05 s; escoamento 1 min 35 s', '55 °C em 17 min', 'Perfurações uniformes em toda a folha', 'Bomba dosadora: 12 mL', 'Ciclo de 15 min sem alarme', 'Tampa e aterramento conformes'];
const testes = (vals, aprov) => ROT.map((t, i) => ({ teste: t, metodo: i === 4 ? 'Folha de alumínio' : '', instrumento: i === 3 ? 'Termômetro TM-07 (certificado 2026-0388)' : '', criterio: i === 3 ? '55 ± 5 °C em até 20 min' : '', valor: vals[i], aprovado: aprov || (i !== 4 && i !== 6) }));
/** Devolução: O.S. de entrega com o termo assinado pelo hospital no aparelho. */
function entregar(a, id, dia) {
  a.mudar(dia + 'T08:00:00-03:00');
  const oe = a.ok(a.api('s_gil', 'agendar', { id, tecnicoId: 'u_tec', inicio: dia + 'T09:00', duracaoMin: 60, tipoCodigo: 'ENTREGA', preparo: { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: true, risco: 'baixo' } }), 'agendar entrega').os.id;
  a.mudar(dia + 'T09:40:00-03:00');
  sync(a, [ev('CHEGUEI', oe, {}, dia + 'T09:05:00'), ev('RESPOSTA', oe, { perguntaId: 'conferido', valor: 'SIM' }, dia + 'T09:06:00'), ev('RESPOSTA', oe, { perguntaId: 'estado', valor: 'Bom' }, dia + 'T09:07:00')]);
  fotoOs(a, oe, 'instalado-cliente.jpg', 'foto', dia + 'T09:20:00');
  const LOG = { itens: [{ descricao: 'Lavadora ultrassônica BR 25 AUT C', quantidade: 1, identificacao: 'Série 12.017.00114 · TAG LUS-03', estado: 'BOM', acessorios: 'Cesto, tampa e mangueira de dreno' }],
    contraparte: { nome: 'Responsável do CME', documento: 'Matrícula 778', setor: 'CME' }, local: 'CME', embalagem: 'ORIGINAL', observacoes: 'Devolução depois do reparo em garantia (RMA-2026-0457). Ciclo de teste completo feito com a equipe do CME, sem alarme. Avisado: BRASMEDICAL.' };
  sync(a, [ev('RELATO', oe, { logistica: LOG }, dia + 'T09:25:00')]);
  // a tela de assinatura do aparelho monta a declaração e manda a marca junto da assinatura de quem recebe
  const tela = APP_OK ? aparelho(a, oe, LOG, { conferido: 'SIM', estado: 'Bom' }) : null;
  if (tela) TELA[a.tabelas.ATEC_OS.find((x) => x.ID === oe).NUMERO] = tela;
  sync(a, [ev('ASSINATURA', oe, { papel: 'COLABORADOR', nome: 'PAULO HENRIQUE NAZARE DOS PASSOS SILVA', documento: 'Matrícula 0457', imagem: ASSINATURA }, dia + 'T09:30:00'),
    ev('ASSINATURA', oe, Object.assign({ nome: 'Responsável do CME', documento: 'Matrícula 778', imagem: ASSINATURA }, tela && tela.marca ? { declaracaoMarca: tela.marca } : {}), dia + 'T09:30:00')]);
  sync(a, [ev('CONCLUI', oe, {}, dia + 'T09:35:00')]);
  const o = a.tabelas.ATEC_OS.find((x) => x.ID === oe);
  if (o.SITUACAO !== 'ENCERRADA') throw new Error('O.S. de entrega não encerrou: ' + o.SITUACAO + ' ' + JSON.stringify(a.ctx.AstO_faltas_(o)));
  return oe;
}
const M = (a, id) => (sid, cod, d, quando) => { if (quando) a.mudar(quando); return a.ok(a.rep(sid, 'marcar', Object.assign({ id, cod }, d || {})), cod); };

/** Avançado (fictício): retirada com termo em papel, bancada, laudo, garantia, 2 rodadas de peças, teste reprovado e aprovado, entrega com termo, confirmações. */
function cenarioAvancado() {
  const a = montar({ ATEC_SEQ_CH_2026: '9000', ATEC_SEQ_OS_2026: '9000', ATEC_SEQ_SOL_2026: '9000' });
  const k = pedidoAteVisita(a, { quemPede: 's_qualidade', pedidoEm: '2026-11-10T11:14:00-03:00', aceiteEm: '2026-11-10T11:47:00-03:00', triagemEm: '2026-11-10T16:31:00-03:00', visitaEm: '2026-11-11T14:00', protocolo: 'BM-2026-118',
    sintoma: 'Lavadora com ruído alto ao cavitar e sujidade residual nos instrumentais depois do ciclo.' });
  const os = k.os.id, id = k.c.id, m = M(a, id);
  a.mudar('2026-11-11T14:40:00-03:00');
  sync(a, [ev('CHEGUEI', os, {}, '2026-11-11T14:05:00'), ev('RESPOSTA', os, { perguntaId: 'identificado', valor: 'SIM' }, '2026-11-11T14:06:00'), ev('RESPOSTA', os, { perguntaId: 'condicao', valor: 'Funcionando com falha' }, '2026-11-11T14:07:00'), ev('RESPOSTA', os, { perguntaId: 'teste_ok', valor: 'NAO' }, '2026-11-11T14:30:00'),
    ev('RESPOSTA', os, { perguntaId: 'liberado', valor: 'NAO' }, '2026-11-11T14:31:00'),
    ev('RELATO', os, { condicaoEncontrada: 'Ruído alto e cavitação fraca; folha de alumínio sem perfuração.', causa: 'Transdutor', servicoRealizado: 'Inspeção e teste de cavitação; equipamento levado para a oficina.', testeFuncional: 'Folha de alumínio sem perfuração', serieConfirmada: '12.017.00114', identificadoPor: 'SERIE' }, '2026-11-11T14:32:00')]);
  fotoOs(a, os, 'etiqueta-serie.jpg', 'foto_placa', '2026-11-11T14:10:00');
  fotoOs(a, os, 'folha-aluminio.jpg', 'foto_servico', '2026-11-11T14:25:00');
  a.mudar('2026-11-11T14:50:00-03:00');
  assinar(a, os, 'Responsável do CME', 'Matrícula 778', '2026-11-11T14:45:00'); sync(a, [ev('CONCLUI', os, {}, '2026-11-11T14:47:00')]);
  { const o = a.tabelas.ATEC_OS.find((x) => x.ID === os); if (o.SITUACAO !== 'ENCERRADA') throw new Error('O.S. da visita não encerrou: ' + o.SITUACAO + ' ' + JSON.stringify(a.ctx.AstO_faltas_(o))); }
  a.tabelas.ATEC_FOTOS.filter((f) => f.OS_ID === os).forEach((f) => { try { a.ok(a.api('s_gil', 'liberarFoto', { fotoId: f.ID, publico: 'REPRESENTADA' })); } catch (e) { f.PUBLICO = 'REPRESENTADA'; } });
  m('s_gil', 'M12', { dataFato: '2026-11-11T14:50', quemRetirou: 'PAULO HENRIQUE NAZARE DOS PASSOS SILVA', quemEntregou: 'Responsável do CME', acessorios: 'Cesto, tampa e mangueira de dreno', termo: 'ASSINADO',
    arquivos: [img('equipamento-cme.jpg', 'Saída: frente', 'REPRESENTADA'), img('etiqueta-serie.jpg', 'Saída: etiqueta de série', 'REPRESENTADA'), img('termo-entrega.jpg', 'Termo de retirada assinado', 'INTERNO')] }, '2026-11-11T15:00:00-03:00');
  m('s_gil', 'M13', { dataFato: '2026-11-11T16:40', serieConfere: 'SIM', acessoriosConferem: 'SIM', avariaTransporte: 'NAO', arquivos: [img('bancada-aberta.jpg', 'Chegada na oficina', 'REPRESENTADA')] }, '2026-11-11T16:45:00-03:00');
  const vF = video(a, id, 'video-falha.webm', 'Falha reproduzida: ruído e cavitação fraca', '2026-11-12T09:30:00', 'REPRESENTADA');
  m('s_gil', 'M14', { texto: 'Teste de cavitação com folha de alumínio e medição da corrente do gerador.', defeitoFuncional: 'SIM', midias: [{ id: vF, legenda: 'Falha reproduzida: ruído e cavitação fraca', publico: 'REPRESENTADA' }],
    arquivos: [img('folha-aluminio.jpg', 'Folha de alumínio sem perfuração', 'REPRESENTADA')] }, '2026-11-12T09:40:00-03:00');
  m('s_gil', 'M15', { texto: 'Transdutor sem cavitação; corrente do gerador 0,2 A (esperado 1,1 A).', liberadoUso: 'NAO' }, '2026-11-12T11:00:00-03:00');
  a.mudar('2026-11-12T15:00:00-03:00');
  const lib = a.ok(a.rep('s_gil', 'processo', { id })).processo;
  const esc = (lib.fotosLiberadas || []).filter((f) => f.video).slice(0, 1).concat((lib.fotosLiberadas || []).filter((f) => !f.video).slice(0, 3)).map((f) => f.id);
  a.ok(a.rep('s_gil', 'enviarLaudo', { id, testes: 'Teste da folha de alumínio: sem perfuração (esperado: perfurações uniformes). Corrente do gerador 0,2 A (esperado 1,1 A), alicate amperímetro AM-02 (certificado 2026-0412).',
    defeito: 'Sem cavitação no tanque; ruído alto durante o ciclo.', causa: 'FABRICACAO', recomendacao: 'Troca do transdutor ultrassônico em garantia.', pecas: 'TR-25 Transdutor ultrassônico 40 kHz', pergunta: 'Aprovar a troca do transdutor em garantia?',
    situacaoEq: 'PARADO', risco: 'NAO', fotos: esc }), 'laudo');
  a.mudar('2026-11-13T10:20:00-03:00');
  a.ok(a.rep('s_qualidade', 'decidir', { id, resultado: 'APROVADA', acoes: ['PECA_FABRICANTE'], peca: 'O fabricante envia o transdutor', protocolo: 'RMA-2026-0457' }), 'decisão');
  m('s_gil', 'M30', { pecas: 'TR-25 | Transdutor ultrassônico 40 kHz | 1', devolverFabrica: 'SIM' }, '2026-11-13T11:00:00-03:00');
  m('s_qualidade', 'M31', { previsao: '2026-11-17' }, '2026-11-13T15:00:00-03:00');
  m('s_qualidade', 'M32', { nf: '45.871', rastreio: 'BR123456789BR', transportadora: 'Correios (Sedex)' }, '2026-11-16T09:00:00-03:00');
  let pc = a.ok(a.rep('s_gil', 'processo', { id })).processo.pecas;
  m('s_gil', 'M33', { conferencia: [{ id: pc[0].id, confere: true, serieLote: 'L-1188' }], arquivos: [img('embalagem-pecas.jpg', 'Embalagem fechada (rastreio BR123456789BR)', 'REPRESENTADA'), img('transdutor-codigo.jpg', 'Transdutor TR-25, lote L-1188', 'REPRESENTADA')] }, '2026-11-17T10:00:00-03:00');
  m('s_gil', 'M40', { arquivos: [img('peca-antiga.jpg', 'Antes: transdutor original instalado', 'REPRESENTADA')] }, '2026-11-17T13:00:00-03:00');
  m('s_gil', 'M41', { instaladas: 'TR-25 lote L-1188', arquivos: [img('peca-nova.jpg', 'Depois: transdutor novo instalado', 'REPRESENTADA')] }, '2026-11-17T15:00:00-03:00');
  m('s_gil', 'M42', {}, '2026-11-17T15:20:00-03:00');
  const vR = video(a, id, 'video-teste-reprovado.webm', 'Teste reprovado: alarme E07 e cavitação fraca nas bordas', '2026-11-17T16:00:00', 'REPRESENTADA');
  m('s_gil', 'M43', { testes: testes(VAL_R, false), decisao: 'PECAS', midias: [{ id: vR, legenda: 'Teste reprovado: alarme E07 e cavitação fraca nas bordas', publico: 'REPRESENTADA' }] }, '2026-11-17T16:10:00-03:00');
  m('s_gil', 'M30', { pecas: 'GER-25 | Placa do gerador ultrassônico | 1', devolverFabrica: 'NAO' }, '2026-11-17T16:30:00-03:00');
  m('s_qualidade', 'M32', { nf: '45.902', rastreio: 'BR987654321BR', transportadora: 'Correios (Sedex)' }, '2026-11-18T09:00:00-03:00');
  pc = a.ok(a.rep('s_gil', 'processo', { id })).processo.pecas.filter((p) => p.rodada === 2);
  m('s_gil', 'M33', { conferencia: [{ id: pc[0].id, confere: true, serieLote: 'L-0921' }], arquivos: [img('embalagem-pecas.jpg', 'Embalagem fechada (rastreio BR987654321BR)', 'REPRESENTADA'), img('peca-codigo.jpg', 'Placa GER-25, lote L-0921', 'REPRESENTADA')] }, '2026-11-19T10:00:00-03:00');
  m('s_gil', 'M40', { arquivos: [img('bancada-aberta.jpg', 'Antes: placa do gerador original', 'REPRESENTADA')] }, '2026-11-19T11:00:00-03:00');
  m('s_gil', 'M41', { instaladas: 'GER-25 lote L-0921', arquivos: [img('peca-codigo.jpg', 'Depois: placa nova instalada', 'REPRESENTADA')] }, '2026-11-19T14:00:00-03:00');
  m('s_gil', 'M42', {}, '2026-11-19T14:10:00-03:00');
  const vA = video(a, id, 'video-ciclo-aprovado.webm', 'Ciclo completo aprovado, do início ao fim', '2026-11-19T15:00:00', 'CLIENTE');
  m('s_gil', 'M44', { testes: testes(VAL_A, true), midias: [{ id: vA, legenda: 'Ciclo completo aprovado, do início ao fim', publico: 'CLIENTE' }], arquivos: [img('folha-aprovada.jpg', 'Folha de alumínio com perfurações uniformes', 'CLIENTE')] }, '2026-11-19T15:10:00-03:00');
  m('s_gil', 'M45', { liberadoUso: 'SIM', responsavel: 'MATHEUS GODOI' }, '2026-11-19T16:00:00-03:00');
  m('s_gil', 'M50', { arquivos: [img('equipamento-cme.jpg', 'Equipamento embalado para a entrega', 'REPRESENTADA')] }, '2026-11-19T16:30:00-03:00');
  // anotação interna da Metrolabs (não pode chegar à representada nem ao hospital)
  (a.tabelas.REP_MENSAGENS = a.tabelas.REP_MENSAGENS || []).push({ ID: 'msg-int-1', REPRESENTADA_ID: 'repB', REF_TIPO: 'CHAMADO', REF_ID: id, INTERNA: 'SIM', AUTOR_LADO: 'METROLABS', AUTOR_NOME: 'GASPAR GESTOR COMERCIAL TESTE', EM: '2026-11-18T10:00:00', TEXTO: 'Frete da segunda peça pago pela Metrolabs: R$ 180,00 (cobrar do fabricante).' });
  entregar(a, id, '2026-11-20');
  a.mudar('2026-11-20T14:00:00-03:00');
  a.ok(a.api('s_cliente.alfa', 'confirmarAtendimento', { id, confirmo: true }), 'confirmação do cliente');
  a.mudar('2026-11-21T10:00:00-03:00');
  a.ok(a.rep('s_qualidade', 'confirmarEncerramento', { id, confirmo: true, texto: '' }), 'confirmação da representada');
  a.mudar('2026-11-21T10:30:00-03:00');
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  return { a, id, nome: 'avancado' };
}

/** Real (CH-2026-0030): retirada sem termo registrada depois (regularização), decisão, reparo, testes e entrega com termo. */
function cenarioReal(ate) {
  const a = montar({ ATEC_SEQ_CH_2026: '29', ATEC_SEQ_OS_2026: '26', ATEC_SEQ_SOL_2026: '1' });
  const k = pedidoAteVisita(a, { quemPede: 's_atendente', pedidoEm: '2026-11-10T11:14:00-03:00', aceiteEm: '2026-11-10T11:47:00-03:00', triagemEm: '2026-11-10T16:31:00-03:00', visitaEm: '2026-11-11T14:00',
    sintoma: 'Cliente relata falhas sucessivas de ciclo, problema de escoamento, sabão derramando e grades começando a soltar.' });
  const os = k.os.id, id = k.c.id, m = M(a, id);
  a.mudar('2026-11-11T14:31:00-03:00');
  sync(a, [ev('CHEGUEI', os, {}, '2026-11-11T14:25:00'), ev('RESPOSTA', os, { perguntaId: 'identificado', valor: 'SIM' }, '2026-11-11T14:25:30'), ev('RESPOSTA', os, { perguntaId: 'condicao', valor: 'Funcionando' }, '2026-11-11T14:25:40')]);
  fotoOs(a, os, 'etiqueta-serie.jpg', 'foto_placa', '2026-11-11T14:31:00');
  fotoOs(a, os, 'painel-falha.jpg', 'foto_servico', '2026-11-11T14:32:00');
  a.mudar('2026-11-12T14:26:00-03:00');
  sync(a, [ev('RESPOSTA', os, { perguntaId: 'teste_ok', valor: 'SIM' }, '2026-11-12T10:32:30'), ev('RESPOSTA', os, { perguntaId: 'liberado', valor: 'NAO' }, '2026-11-12T14:25:00'),
    ev('RELATO', os, { condicaoEncontrada: 'Falhas sucessivas de ciclo e escoamento lento; detergente transbordando; grades do cesto soltando.', causa: 'Em análise pelo fabricante',
      servicoRealizado: 'Inspeção no local e avaliação na oficina da Metrolabs. Aguardo orientações do fabricante.', testeFuncional: 'Ciclo de teste realizado; falha de escoamento reproduzida.', serieConfirmada: '12.017.00114', identificadoPor: 'SERIE' }, '2026-11-12T14:23:00')]);
  a.mudar('2026-11-12T16:04:00-03:00');
  a.ok(a.rep('s_gil', 'relatorioAtendimento', { id, publico: 'REPRESENTADA' }), 'relatório à representada');
  a.mudar('2026-11-12T16:32:00-03:00');
  assinar(a, os, 'Paulo Henrique', '', '2026-11-12T16:31:00'); sync(a, [ev('CONCLUI', os, {}, '2026-11-12T16:32:00')]);
  { const o = a.tabelas.ATEC_OS.find((x) => x.ID === os); if (o.SITUACAO !== 'ENCERRADA') throw new Error('O.S. da visita não encerrou: ' + o.SITUACAO + ' ' + JSON.stringify(a.ctx.AstO_faltas_(o))); }
  a.tabelas.ATEC_FOTOS.filter((f) => f.OS_ID === os).forEach((f) => { f.PUBLICO = 'REPRESENTADA'; });
  Object.assign(chamado(a, id), { SITUACAO: 'ENCERRADO', ENCERRADO_EM: '2026-11-12T16:32:00' });
  a.tabelas.ATEC_CONFIG.push({ ID: 'cfg-fluxo', CHAVE: 'REP_FLUXO_DESDE', VALOR_JSON: JSON.stringify('2026-11-16T22:00:00'), VERSAO: 1 });
  a.mudar('2026-11-17T09:10:00-03:00');
  a.ok(a.rep('s_dora', 'regularizar', { chamadoId: id, destino: 'AGUARDANDO_REPRESENTADA',
    motivo: 'O chamado foi encerrado automaticamente em 12/11/2026 ao fechar a OS-2026-0027, antes da decisão do fabricante. O equipamento foi retirado e avaliado em bancada na oficina.',
    pergunta: 'Qual a orientação para a lavadora ultrassônica BR 25 AUT C (série 12.017.00114), avaliada em bancada e não liberada para uso?',
    retirada: { em: '2026-11-11T17:30', porNome: 'PAULO HENRIQUE NAZARE DOS PASSOS SILVA', termoMotivo: 'A retirada não foi registrada no sistema na época (a O.S. era de inspeção técnica) e o termo de retirada não foi colhido. A assinatura do hospital será colhida na devolução, no termo de entrega.', obs: 'Data e hora informadas na regularização' },
    bancada: { em: '2026-11-12T14:25', texto: 'Avaliação em bancada registrada na OS-2026-0027: equipamento identificado (série conferida); teste funcional realizado; liberado para uso: não.' } }), 'regularizar');
  if (ate === 'regularizado') return { a, id, nome: 'real' };
  a.mudar('2026-11-18T10:00:00-03:00');
  a.ok(a.rep('s_qualidade', 'decidir', { id, resultado: 'APROVADA', acoes: ['REPARO_OFICINA'], protocolo: 'RMA-2026-0511' }), 'decisão');
  m('s_gil', 'M40', { arquivos: [img('bancada-aberta.jpg', 'Antes: válvula de dreno e grades', 'REPRESENTADA')] }, '2026-11-18T14:00:00-03:00');
  m('s_gil', 'M41', { instaladas: 'Válvula de dreno nova (lote VD-221); grades do cesto refixadas', arquivos: [img('peca-nova.jpg', 'Depois: válvula de dreno nova', 'REPRESENTADA')] }, '2026-11-18T16:00:00-03:00');
  m('s_gil', 'M42', {}, '2026-11-19T09:00:00-03:00');
  const vA = video(a, id, 'video-ciclo-aprovado.webm', 'Ciclo completo aprovado', '2026-11-19T09:40:00', 'CLIENTE');
  m('s_gil', 'M44', { testes: testes(VAL_A, true), midias: [{ id: vA, legenda: 'Ciclo completo aprovado', publico: 'CLIENTE' }] }, '2026-11-19T10:00:00-03:00');
  m('s_gil', 'M45', { liberadoUso: 'SIM', responsavel: 'MATHEUS GODOI' }, '2026-11-19T11:00:00-03:00');
  const rep = a.ok(a.rep('s_gil', 'processo', { id })).processo.acoes.find((x) => x.codigo === 'REPARO_OFICINA');
  if (rep && rep.situacao === 'ABERTA') a.ok(a.rep('s_gil', 'concluirAcao', { id, acaoId: rep.id, obs: 'Válvula de dreno trocada e grades refixadas na oficina.' }), 'reparo');
  entregar(a, id, '2026-11-20');
  a.mudar('2026-11-20T14:00:00-03:00');
  a.ok(a.api('s_cliente.alfa', 'confirmarAtendimento', { id, confirmo: true }), 'confirmação do cliente');
  a.mudar('2026-11-21T10:00:00-03:00');
  a.ok(a.rep('s_qualidade', 'confirmarEncerramento', { id, confirmo: true, texto: '' }), 'confirmação da representada');
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  return { a, id, nome: 'real' };
}

const j = (x) => JSON.parse(JSON.stringify(x));
const dossies = (a, id) => (a.tabelas.REP_DOCUMENTOS || []).filter((d) => d.CHAMADO_ID === id && d.TIPO === 'DOSSIE');
const html = (a, d) => (d && a.arquivos[d.HTML_ID] ? Buffer.from(a.arquivos[d.HTML_ID].bytes).toString('utf8') : '');
const doc = (a, id, pub, versao) => dossies(a, id).filter((d) => d.PUBLICO === pub && (!versao || Number(d.VERSAO) === versao)).pop();
const texto = (h) => h.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ').replace(/data:[^"')]+/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const PROIBIDO_HOSPITAL = /BRASMEDICAL|QUALIDADE|ATENDENTE|representada/i;
const COMERCIAL = /garantia|\bRMA\b|protocolo|nota fiscal|\bNF\b|rastreio|or[çc]amento|R\$/i;
const SECOES = ['Resumo executivo', 'Identificação do serviço (RDC 665/2022, art. 129)', 'Linha do tempo', 'Diagnóstico e laudos', 'Decisões do fabricante', 'Peças', 'Reparo', 'Testes', 'Evidências fotográficas', 'Logística e guarda',
  'Confirmações e assinaturas', 'Conclusão técnica', 'Documentos relacionados', 'Controle e rastreabilidade do documento'];

let AV = null; const avancado = () => (AV = AV || cenarioAvancado());
let RE = null; const real = () => (RE = RE || cenarioReal());

test('dossiê completo (cenário avançado): todas as seções, capa com o equipamento, peças com NF e rastreio, testes reprovados e aprovados, vídeos com QR e código de verificação gravado', () => {
  const { a, id } = avancado();
  const c = chamado(a, id);
  assert.equal(c.SITUACAO, 'ENCERRADO');
  const d = doc(a, id, 'INTERNO'), h = html(a, d), t = texto(h);
  assert.equal(d.NUMERO, 'DOS-2026-9001');
  for (const s of SECOES.concat(['Anotações internas da Metrolabs'])) assert.ok(new RegExp('\\d+\\. ' + s.replace(/[()]/g, '\\$&')).test(t), 'seção ' + s);
  for (const x of ['CH-2026-9001', 'Lavadora ultrassônica BR 25 AUT C', '12.017.00114', 'TAG LUS-03', 'Hospital Oftalmocenter', 'BRASMEDICAL', 'BM-2026-118', '10/11/2026 a 21/11/2026', 'Reparado, testado e liberado para uso'])
    assert.ok(t.includes(x), 'capa/identificação: ' + x);
  assert.match(t, /Sumário/);
  // linha do tempo pela data do fato, com fases e rodadas
  assert.match(t, /Fase 4 — Peças/); assert.match(t, /2ª rodada de peças/); assert.match(t, /2ª bateria de testes/);
  // diagnóstico por rodada com o texto do laudo e a tecnovigilância
  assert.match(t, /Laudo técnico LTR-2026-9001-1/); assert.match(t, /Sem cavitação no tanque/); assert.match(t, /tecnovigilância\) Não relatado/);
  // decisão com fundamentação e protocolo; peças com NF, rastreio, conferência e destino da retirada
  assert.match(t, /Rodada 1: Garantia aprovada/); assert.match(t, /RMA-2026-0457/);
  for (const x of ['NF 45.871', 'BR123456789BR', 'NF 45.902', 'L-1188', 'L-0921', 'Guardada na oficina para devolução à fábrica']) assert.ok(t.includes(x), 'peças: ' + x);
  // testes: os reprovados aparecem, com o próximo passo; a liberação técnica com o responsável
  assert.match(t, /1ª bateria de testes · reprovada/); assert.match(t, /2ª bateria de testes · aprovada/); assert.ok((t.match(/Reprovado/g) || []).length >= 2);
  assert.match(t, /Depois da reprovação: .*pedir mais peças/); assert.match(t, /responsável técnico MATHEUS GODOI/); assert.match(t, /55 ± 5 °C em até 20 min/);
  // evidências por fase, com SHA-256; vídeos com QR (SVG gerado aqui, sem serviço externo) e link com login
  assert.match(t, /Foto 1 —/); assert.match(t, /SHA-256 [0-9a-f]{8}/); assert.ok((h.match(/aria-label="QR code"/g) || []).length === 3, 'um QR por vídeo');
  assert.ok(!/api\.qrserver|chart\.googleapis/.test(h), 'QR sem serviço externo');
  // logística, termos e assinaturas (imagem da assinatura colhida no aparelho)
  assert.match(t, /Assinado em papel; via digitalizada anexada/); assert.match(t, /Período com a Metrolabs 11\/11\/2026 14:50 a 20\/11\/2026 09:35/);
  assert.ok(/class="assinaturas"[\s\S]*data:image\/png;base64/.test(h), 'assinatura do hospital no termo de entrega');
  // anotação interna presente só aqui
  assert.match(t, /Frete da segunda peça pago pela Metrolabs/);
  // código de verificação: impresso e gravado no registro (MARCA)
  const cod = (/data-verificacao="([0-9A-F-]{14})"/.exec(h) || [])[1];
  assert.ok(cod && d.MARCA === cod, 'código ' + cod + ' x ' + d.MARCA);
  assert.ok(t.includes('Código de verificação ' + cod) || t.includes(cod));
  // nenhum Date cru e nenhum "undefined"/"null" no texto
  assert.ok(!/undefined|\bnull\b|NaN|GMT-0|\[object/.test(t), (t.match(/.{40}(undefined|\bnull\b|NaN|GMT-0|\[object).{40}/) || [''])[0]);
});

test('versão da representada: o mesmo dossiê sem as anotações internas (notas, valores, pendências) e sem nomes de colaboradores além do técnico e do responsável técnico', () => {
  const { a, id } = avancado();
  const ti = texto(html(a, doc(a, id, 'INTERNO'))), tr = texto(html(a, doc(a, id, 'REPRESENTADA')));
  for (const s of SECOES) assert.ok(tr.includes(s), 'seção ' + s);
  assert.ok(!/Anotações internas/.test(tr.replace(/sem as anotações internas/g, '')), 'sem a seção interna');
  assert.ok(!/Frete da segunda peça|R\$|GASPAR|cobrar do fabricante/.test(tr), 'nota interna vazou: ' + (tr.match(/Frete da segunda peça|R\$|GASPAR|cobrar do fabricante/) || [''])[0]);
  assert.match(tr, /PAULO HENRIQUE NAZARE DOS PASSOS SILVA/); assert.match(tr, /MATHEUS GODOI/);
  assert.ok(!/DIRETORIA METROLABS/.test(tr));
  // mesma história: mesmos testes, peças e decisão
  for (const x of ['NF 45.871', 'BR987654321BR', 'RMA-2026-0457', '1ª bateria de testes · reprovada', 'Perfurações uniformes em toda a folha']) assert.ok(tr.includes(x) && ti.includes(x), x);
  // a foto interna (termo assinado em papel) não entra na versão da representada
  assert.ok(ti.includes('Termo de retirada assinado') && !/Foto \d+ — Termo de retirada assinado/.test(tr));
  assert.notEqual(doc(a, id, 'REPRESENTADA').MARCA, doc(a, id, 'INTERNO').MARCA);
});

test('hospital: resumo do serviço + termo de retirada + termo de entrega, sem o nome da representada e sem dados comerciais; e-mail do encerramento com o PDF', () => {
  const { a, id } = avancado();
  const d = doc(a, id, 'CLIENTE'), h = html(a, d), t = texto(h);
  assert.equal(d.NUMERO, 'RSV-2026-9001');
  assert.ok(!PROIBIDO_HOSPITAL.test(t), 'nome: ' + (t.match(PROIBIDO_HOSPITAL) || [''])[0]);
  assert.ok(!COMERCIAL.test(t), 'comercial: ' + (t.match(new RegExp('.{50}(' + COMERCIAL.source + ').{30}', 'i')) || [''])[0]);
  for (const x of ['Resumo do serviço', 'Problema relatado', 'O que foi feito', 'Testes que liberaram o equipamento', 'Recomendações', 'Termo de retirada do equipamento', 'Termo de entrega (devolução) do equipamento',
    'Reparado, testado e liberado para uso', 'Entregue ao hospital em 20/11/2026 09:35', 'O equipamento esteve com a Metrolabs de 11/11/2026 14:50', 'Conferência e testes no local', 'Ciclo de teste completo feito com a equipe do CME'])
    assert.ok(t.includes(x), x);
  assert.equal((t.match(/Aprovado/g) || []).length, 8, 'os 8 testes da liberação');
  assert.ok(!/Reprovado/.test(t), 'o hospital lê só a bateria que liberou');
  assert.ok((h.match(/class="ds-parte"/g) || []).length === 2, 'retirada e entrega começam em folha nova');
  assert.match(t, /Termo de retirada assinado em papel no ato da retirada/);
  assert.ok(/data-verificacao="[0-9A-F-]{14}"/.test(h) && d.MARCA === /data-verificacao="([0-9A-F-]{14})"/.exec(h)[1]);
  // no portal: "Resumo do serviço e termos", emitido pela Metrolabs
  const gerados = a.ok(a.api('s_cliente.alfa', 'documentosGerados', {})).documentos.filter((x) => x.chamadoNumero === 'CH-2026-9001');
  assert.deepEqual(gerados.map((x) => [x.tipoNome, x.numero, x.por]), [['Resumo do serviço e termos', 'RSV-2026-9001', 'Metrolabs']]);
  // e-mail AT27 ao hospital com o PDF, sem nome da representada nem assunto comercial
  assert.ok(a.tabelas.NTF_ENVIOS.some((n) => n.EVENTO === 'AT27' && n.REF_ID === id && n.SITUACAO === 'OK'));
  const em = a.emails.filter((e) => e.to === 'cme@oftalmocenter.exemplo.test' && /documento final do chamado/i.test(e.subject));
  assert.equal(em.length, 1); assert.match(em[0].body, /RSV-2026-9001/); assert.ok(!PROIBIDO_HOSPITAL.test(em[0].subject + em[0].body) && !COMERCIAL.test(em[0].body));
  assert.ok(texto(html(a, doc(a, id, 'INTERNO'))).includes('O hospital recebe o Resumo do serviço'));
});

test('retirada sem termo (CH-2026-0030, registrada depois): o termo de retirada não finge assinatura e o termo de entrega cobre o período na oficina', () => {
  // antes da devolução: a prévia do hospital avisa que a assinatura será colhida na devolução
  const r0 = cenarioReal('regularizado');
  const prev = r0.a.ok(r0.a.api('s_cliente.alfa', 'previaAtendimento', { id: r0.id }));
  const tp = texto(prev.html);
  assert.match(tp, /Registro de retirada \(sem assinatura\)/); assert.match(tp, /será colhida na devolução, no Termo de entrega/); assert.ok(!PROIBIDO_HOSPITAL.test(tp), (tp.match(PROIBIDO_HOSPITAL) || [''])[0]);
  // depois: documento oficial do hospital
  const { a, id } = real();
  assert.equal(chamado(a, id).SITUACAO, 'ENCERRADO');
  const h = html(a, doc(a, id, 'CLIENTE')), t = texto(h);
  assert.equal(doc(a, id, 'CLIENTE').NUMERO, 'RSV-2026-0030');
  assert.match(t, /Registro de retirada \(sem assinatura\)/); assert.ok(!/Termo de retirada do equipamento/.test(t));
  assert.match(t, /o termo de retirada não foi colhido no ato/i); assert.match(t, /O registro foi feito depois, em 17\/11\/2026 09:10/);
  assert.match(t, /A assinatura do hospital está no Termo de entrega/);
  const parteRet = h.slice(h.indexOf('Registro de retirada (sem assinatura)'), h.indexOf('Termo de entrega (devolução)'));
  assert.ok(parteRet.length > 100 && !/class="assinaturas"/.test(parteRet), 'nenhuma linha de assinatura na retirada sem termo');
  assert.match(t, /O equipamento esteve com a Metrolabs de 11\/11\/2026 17:30 \(retirada, sem termo assinado\) até esta entrega, em 20\/11\/2026 09:35/);
  assert.match(t, /O equipamento esteve na oficina da Metrolabs de 11\/11\/2026 17:30 até a entrega, retirado sem termo de retirada assinado; esta assinatura confirma também a retirada e esse período\./);
  assert.ok(!PROIBIDO_HOSPITAL.test(t) && !COMERCIAL.test(t), (t.match(PROIBIDO_HOSPITAL) || t.match(COMERCIAL) || [''])[0]);
  // dossiê: "não colhido", registrado depois, e o termo de entrega cobre
  const ti = texto(html(a, doc(a, id, 'INTERNO')));
  assert.match(ti, /Termo de retirada Não colhido \(registrado sem assinatura\): A retirada não foi registrada no sistema na época/); assert.match(ti, /Cobre a retirada sem termo e o período com a Metrolabs/);
  assert.match(ti, /registrado em 17\/11\/2026 09:10/);
  // o termo de entrega da O.S. (Assistência) também diz o período
  const oe = a.tabelas.ATEC_OS.filter((o) => o.CHAMADO_ID === id && o.TIPO_CODIGO === 'ENTREGA').pop();
  const termoOs = a.ctx.AstR_htmlOS_(oe, {});
  assert.match(texto(termoOs), /O equipamento esteve na oficina da Metrolabs de 11\/11\/2026 17:30 até a entrega, retirado sem termo de retirada assinado/);
});

test('geração única no encerramento; nova emissão só como revisão com motivo (as três peças na mesma revisão, as anteriores guardadas)', () => {
  const { a, id } = avancado();
  assert.equal(dossies(a, id).length, 3);
  a.ctx.Ast_memoLimpar_(); a.ctx.Representacao_rotina_(a.relogio.agora);
  assert.equal(dossies(a, id).length, 3, 'a rotina não gera outro');
  const sem = a.rep('s_gil', 'revisarDossie', { id, motivo: 'curto' });
  assert.equal(sem.ok, false); assert.match(sem.message, /motivo/);
  const r = a.ok(a.rep('s_gil', 'revisarDossie', { id, motivo: 'Correção do lote da placa do gerador informado pelo fabricante.' }));
  assert.match(r.message, /revisão 1/);
  assert.equal(dossies(a, id).length, 6);
  const v2 = doc(a, id, 'INTERNO', 2), h2 = html(a, v2), c2 = doc(a, id, 'CLIENTE', 2);
  assert.ok(v2 && c2 && doc(a, id, 'REPRESENTADA', 2));
  assert.match(texto(h2), /Motivo da revisão Correção do lote da placa do gerador/); assert.match(h2, /Revisão 01/);
  assert.match(texto(h2), /Emitido por MATHEUS GODOI/);
  assert.notEqual(v2.MARCA, doc(a, id, 'INTERNO', 1).MARCA);
  assert.match(texto(html(a, c2)), /revisão 1 \(Correção do lote/);
  assert.ok(html(a, doc(a, id, 'INTERNO', 1)), 'a emissão original continua guardada');
  const tc = a.rep('s_qualidade', 'revisarDossie', { id, motivo: 'Tentativa da representada de emitir revisão.' });
  assert.equal(tc.ok, false, 'a representada não emite revisão');
});

test('"Ver prévia" nas três visões mostra o documento final como está agora, sem gravar e sem código de verificação', () => {
  const { a, id } = cenarioReal('regularizado');
  const n0 = (a.tabelas.REP_DOCUMENTOS || []).length, e0 = a.emails.length;
  const pi = a.ok(a.rep('s_gil', 'previaAtendimento', { id, publico: 'INTERNO' })), pr = a.ok(a.rep('s_qualidade', 'previaAtendimento', { id })), pc = a.ok(a.api('s_cliente.alfa', 'previaAtendimento', { id }));
  assert.equal((a.tabelas.REP_DOCUMENTOS || []).length, n0); assert.equal(a.emails.length, e0);
  for (const r of [pi, pr, pc]) { assert.ok(r.previa); assert.ok(!/data-verificacao/.test(r.html)); assert.match(texto(r.html), /PRÉVIA/); }
  assert.match(texto(pi.html), /Dossiê do atendimento/); assert.match(texto(pi.html), /Anotações internas da Metrolabs/);
  assert.match(texto(pr.html), /Dossiê do atendimento/); assert.ok(!/Anotações internas da Metrolabs/.test(texto(pr.html).replace(/sem as anotações internas/g, '')));
  assert.match(texto(pc.html), /Resumo do serviço/); assert.ok(!PROIBIDO_HOSPITAL.test(texto(pc.html)));
  assert.match(texto(pi.html), /Em andamento/);
  // a prévia da representada aberta pela Metrolabs ("ver como") é a mesma da representada
  const pir = a.ok(a.rep('s_gil', 'previaAtendimento', { id, publico: 'REPRESENTADA' }));
  assert.ok(!/Anotações internas da Metrolabs/.test(texto(pir.html).replace(/sem as anotações internas/g, '')));
});

test('QR code gerado no próprio SGO+: padrões de localização e formato com BCH válido', () => {
  const { a } = avancado();
  const Mx = a.ctx.RepDos_qrModulos_('https://sgo.metrolabs.com.br/arquivos/arqv-123');
  const n = Mx.length; assert.ok(n >= 21 && (n - 17) % 4 === 0);
  const finder = (x0, y0) => { for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) { const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3)); if (Mx[y0 + dy][x0 + dx] !== (d !== 2)) return false; } return true; };
  assert.ok(finder(0, 0) && finder(n - 7, 0) && finder(0, n - 7), 'três padrões de localização');
  // formato (cópia 1): bits 0-5 em (8,0..5), 6 em (8,7), 7 em (8,8), 8 em (7,8), 9-14 em (5..0, 8)
  const bit = (x, y) => (Mx[y][x] ? 1 : 0); let f = 0;
  const pos = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  pos.forEach((p, i) => { f |= bit(p[0], p[1]) << i; });
  f ^= 0x5412; const dados = f >>> 10; let r = dados; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  assert.equal(((dados << 10) | (r & 0x3FF)), f, 'BCH do formato');
  assert.equal(dados >>> 3, 0, 'correção de erro nível M');
  assert.match(a.ctx.RepDos_qrSvg_('x', 20), /^<svg[^>]+viewBox="0 0 29 29"/);
});

test('capturas A4 do dossiê e dos documentos do hospital (PDF do Chromium, páginas em PNG)', async (t) => {
  let chromium;
  try { chromium = require(path.join(__dirname, '..', '..', 'sgo_servidor', 'node_modules', 'playwright')).chromium; } catch (e) { t.skip('Playwright indisponível'); return; }
  const saida = process.env.CAPTURAS_DOSSIE || path.join(__dirname, '..', 'output', 'representacao-fluxo-20261116', 'dossie', 'capturas');
  fs.mkdirSync(saida, { recursive: true });
  const A = avancado(), Rl = real(), R0 = cenarioReal('regularizado');
  const lista = [['avancado-dossie-metrolabs', html(A.a, doc(A.a, A.id, 'INTERNO', 1))], ['avancado-dossie-representada', html(A.a, doc(A.a, A.id, 'REPRESENTADA', 1))], ['avancado-hospital', html(A.a, doc(A.a, A.id, 'CLIENTE', 1))],
    ['real-dossie-metrolabs', html(Rl.a, doc(Rl.a, Rl.id, 'INTERNO'))], ['real-hospital-retirada-sem-termo', html(Rl.a, doc(Rl.a, Rl.id, 'CLIENTE'))],
    ['real-previa-metrolabs', R0.a.ok(R0.a.rep('s_gil', 'previaAtendimento', { id: R0.id, publico: 'INTERNO' })).html], ['real-previa-hospital', R0.a.ok(R0.a.api('s_cliente.alfa', 'previaAtendimento', { id: R0.id })).html]];
  const nav = await chromium.launch({ headless: true });
  try {
    for (const [nome, h] of lista) {
      assert.ok(h.length > 1000, nome);
      fs.writeFileSync(path.join(saida, nome + '.html'), h);
      const pg = await nav.newPage();
      await pg.setContent(h, { waitUntil: 'load' });
      await pg.emulateMedia({ media: 'print' });
      await pg.pdf({ path: path.join(saida, nome + '.pdf'), preferCSSPageSize: true, printBackground: true });
      await pg.emulateMedia({ media: 'screen' });
      for (const larg of [390]) { await pg.setViewportSize({ width: larg, height: 800 }); const lat = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(lat <= 2, nome + ' rola para o lado a ' + larg + ' px: ' + lat); }
      await pg.close();
    }
  } finally { await nav.close(); }
  // páginas do PDF em PNG (PyMuPDF), quando houver Python com o módulo
  const { spawnSync } = require('node:child_process');
  const py = 'import sys,os,fitz\nd=sys.argv[1]\nfor f in sorted(os.listdir(d)):\n  if not f.endswith(".pdf"): continue\n  doc=fitz.open(os.path.join(d,f)); n=len(doc); cols=4; sc=0.5\n  pg=[p.get_pixmap(matrix=fitz.Matrix(sc,sc)) for p in doc]; w,h=pg[0].width,pg[0].height; rows=(n+cols-1)//cols\n  sh=fitz.Pixmap(fitz.csRGB,fitz.IRect(0,0,cols*w+(cols+1)*10,rows*h+(rows+1)*10),0); sh.set_rect(sh.irect,(200,205,210))\n  for i,pm in enumerate(pg):\n    pm.set_origin(10+(i%cols)*(w+10),10+(i//cols)*(h+10)); sh.copy(pm,pm.irect)\n  sh.save(os.path.join(d,f[:-4]+"-folhas.png"))\n  for i,p in enumerate(doc): p.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(os.path.join(d,f[:-4]+"-p%02d.png"%(i+1)))\n  print(f,n)\n';
  const r = spawnSync('python', ['-c', py, saida], { encoding: 'utf8' });
  if (r.status !== 0) t.diagnostic('PNG das páginas não gerado (Python/PyMuPDF): ' + String(r.stderr || r.error || '').slice(0, 200));
  else t.diagnostic(r.stdout.trim().replace(/\n/g, ' | '));
});

test('opção B: a tela de assinatura do termo de entrega mostra, antes do quadro, a mesma declaração do PDF (uma função só; sem o nome da representada)', (t) => {
  if (!APP_OK) { t.skip('cópia do aplicativo indisponível'); return; }
  const P = app();
  // uma função só: o corpo de declaracaoEntregaTexto (aplicativo) é idêntico ao de AstR_declaracaoEntregaTexto_ (PDF)
  const srv = fs.readFileSync(path.join(__dirname, '..', process.env.DEST || 'output/financeiro-20261116/cand10', 'SGO_Assistencia_Relatorio.js'), 'utf8');
  const corpo = (src, nome) => { const i = src.indexOf('function ' + nome + '(d) {'); return src.slice(src.indexOf('\n', i), src.indexOf('\n}\n', i)).replace(/\r/g, ''); };
  assert.equal(corpo(P.src, 'declaracaoEntregaTexto'), corpo(srv, 'AstR_declaracaoEntregaTexto_'));
  for (const [nome, cen] of [['avancado', avancado()], ['real', real()]]) {
    const { a, id } = cen;
    const oe = a.tabelas.ATEC_OS.filter((o) => o.CHAMADO_ID === id && o.TIPO_CODIGO === 'ENTREGA').pop(), tela = TELA[oe.NUMERO];
    assert.ok(tela && tela.texto && tela.o.declaracaoEntrega, nome + ': a O.S. de entrega leva a base da declaração ao aparelho');
    const dec = a.ctx.AstR_declaracaoEntrega_(a.ctx.Ast_porId_('ATEC_OS', oe.ID));
    assert.deepEqual(j(tela.texto), j(dec.paragrafos), nome + ': texto da tela = texto do PDF');
    assert.equal(tela.marca, dec.marca);
    // o texto: quem recebe, equipamento com série e TAG, estado, testes no local, período na oficina; sem o nome da representada nem assunto comercial
    const tx = tela.texto.join(' ');
    for (const x of ['Eu, Responsável do CME (Matrícula 778), do setor CME, declaro que recebi da Metrolabs', 'Lavadora ultrassônica BR 25 AUT C (Série 12.017.00114 · TAG LUS-03): em bom estado; acessórios: Cesto, tampa e mangueira de dreno.',
      'Verificações e testes feitos no local, na entrega:', 'Ciclo de teste completo feito com a equipe do CME, sem alarme.', 'O equipamento esteve na oficina da Metrolabs de ']) assert.ok(tx.includes(x), nome + ': ' + x);
    assert.ok(!/BRASMEDICAL|QUALIDADE|garantia|RMA/i.test(tx), nome + ': ' + tx); assert.match(tx, /Avisado: o fabricante\./);
    assert.match(tx, nome === 'real' ? /de 11\/11\/2026 17:30 até a entrega, retirado sem termo de retirada assinado/ : /de 11\/11\/2026 14:50 até a entrega\.$/);
    // a tela: o quadro da declaração vem antes do quadro de assinatura, com cada parágrafo do PDF
    P.ctx.X = tela.x;
    const h = P.A.telaAssinatura(tela.o);
    assert.ok(h.indexOf('class="declaracao"') >= 0 && h.indexOf('class="declaracao"') < h.indexOf('id="quadro"'));
    for (const par of tela.texto) assert.ok(h.includes(par.replace(/&/g, '&amp;')), par);
    // o PDF do termo da O.S. e o documento do hospital trazem os mesmos parágrafos e a nota "mostrada antes de assinar"
    const pdf = texto(a.ctx.AstR_htmlOS_(a.ctx.Ast_porId_('ATEC_OS', oe.ID), {})), hosp = texto(html(a, doc(a, id, 'CLIENTE', 1)));
    for (const par of tela.texto) { assert.ok(pdf.includes(par), 'PDF da O.S.: ' + par); assert.ok(hosp.includes(par), 'hospital: ' + par); }
    assert.ok(pdf.includes('Declaração mostrada a quem recebeu na tela de assinatura do aparelho, antes de assinar (marca ' + dec.marca + ')'));
  }
});

test('opção B: termo comum (entrega sem retirada) e as demais telas de assinatura ficam como estavam', (t) => {
  if (!APP_OK) { t.skip('cópia do aplicativo indisponível'); return; }
  const a = montar({ ATEC_SEQ_CH_2026: '700', ATEC_SEQ_OS_2026: '700', ATEC_SEQ_SOL_2026: '700' });
  a.mudar('2026-11-18T08:00:00-03:00');
  const c = a.ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Entrega de equipamento novo comprado pelo hospital', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P3', parada: 'NAO', canal: 'TELEFONE' }), 'abrir').chamado;
  a.ok(a.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado por telefone', risco_operar: 'Baixo', diagnostico_preliminar: 'Entrega' }, acao: 'PLANEJADO', tipoCodigo: 'ENTREGA' }), 'triagem');
  const oe = a.ok(a.api('s_gil', 'agendar', { id: c.id, tecnicoId: 'u_tec', inicio: '2026-11-19T09:00', duracaoMin: 60, tipoCodigo: 'ENTREGA', preparo: { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: true, risco: 'baixo' } }), 'agendar').os.id;
  const LOG = { itens: [{ descricao: 'Seladora', quantidade: 1, identificacao: 'Série S-1', estado: 'BOM', acessorios: '' }], contraparte: { nome: 'Rui Responsável Teste', documento: '', setor: 'CME' }, observacoes: '' };
  a.mudar('2026-11-19T09:20:00-03:00');
  sync(a, [ev('CHEGUEI', oe, {}, '2026-11-19T09:05:00'), ev('RELATO', oe, { logistica: LOG }, '2026-11-19T09:10:00')]);
  const tela = aparelho(a, oe, LOG, {});
  assert.equal(tela.os.declaracaoEntrega, null); assert.equal(tela.o.declaracaoEntrega, null); assert.equal(tela.texto, null);
  app().ctx.X = tela.x;
  const h = app().A.telaAssinatura(tela.o);
  assert.ok(!/class="declaracao"/.test(h) && /id="quadro"/.test(h), 'tela de assinatura sem o quadro novo');
  const os = a.ctx.Ast_porId_('ATEC_OS', oe);
  assert.equal(a.ctx.AstR_declaracaoEntrega_(os), null);
  assert.match(texto(a.ctx.AstR_htmlOS_(os, {})), /Declaro que recebi os itens relacionados acima, nas condições descritas neste termo\./);
  // O.S. de visita (não logística): sem declaração
  const { a: av, id } = avancado();
  const visita = av.tabelas.ATEC_OS.find((o) => o.CHAMADO_ID === id && o.TIPO_CODIGO !== 'ENTREGA');
  assert.equal(av.ctx.AstR_declaracaoEntregaBase_(visita), null);
});

test('opção B: capturas da tela de assinatura do termo de entrega a 390 e 320 px, sem rolagem lateral', async (t) => {
  if (!APP_OK) { t.skip('cópia do aplicativo indisponível'); return; }
  let chromium;
  try { chromium = require(path.join(__dirname, '..', '..', 'sgo_servidor', 'node_modules', 'playwright')).chromium; } catch (e) { t.skip('Playwright indisponível'); return; }
  const saida = process.env.CAPTURAS_DOSSIE || path.join(__dirname, '..', 'output', 'representacao-fluxo-20261116', 'dossie', 'capturas');
  fs.mkdirSync(saida, { recursive: true });
  const css = fs.readFileSync(path.join(APP_DIR, 'estilo.css'), 'utf8');
  const nav = await chromium.launch({ headless: true });
  try {
    for (const [nome, cen] of [['real', real()], ['avancado', avancado()]]) {
      const oe = cen.a.tabelas.ATEC_OS.filter((o) => o.CHAMADO_ID === cen.id && o.TIPO_CODIGO === 'ENTREGA').pop(), tela = TELA[oe.NUMERO];
      app().ctx.X = tela.x;
      const corpoTela = app().A.telaAssinatura(tela.o);
      const pag = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>' +
        '<header class="topo"><button class="topo-voltar" type="button">Voltar</button><span class="topo-logo" style="font-weight:700;color:#0b3d6e">Metrolabs</span><button class="topo-ajuda" type="button">Ajuda</button></header>' +
        '<h1 class="titulo-tela">Assinatura de quem recebe</h1><main class="tela">' + corpoTela + '</main></body></html>';
      for (const larg of [390, 320]) {
        const pg = await nav.newPage({ viewport: { width: larg, height: 900 } });
        await pg.setContent(pag, { waitUntil: 'load' });
        const lat = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(lat <= 1, nome + ' ' + larg + ' px rola para o lado: ' + lat);
        const just = await pg.evaluate(() => getComputedStyle(document.querySelector('.declaracao p')).textAlign);
        assert.equal(just, 'justify');
        // a barra "Voltar à O.S." é fixa no rodapé: a captura usa a altura da página inteira para ela não cobrir o texto
        await pg.setViewportSize({ width: larg, height: await pg.evaluate(() => document.documentElement.scrollHeight) });
        await pg.screenshot({ path: path.join(saida, 'app-assinatura-entrega-' + nome + '-' + larg + '.png'), fullPage: true });
        await pg.close();
      }
    }
  } finally { await nav.close(); }
});
