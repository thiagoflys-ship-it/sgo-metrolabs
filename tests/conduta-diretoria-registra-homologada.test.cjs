// 28/10/2026 (dono): "No módulo de conduta, quando um diretor ou eu (Adm) registrar, não precisa de ninguém homologar a
// decisão dele, e pronto." Registro da Diretoria (perfil DIRETORIA) ou do dono do sistema (SGO_DONOS, conta "admin") já
// nasce HOMOLOGADA; o resto do fluxo (ciência, contestação, recurso, FIRME, sigilo, "Não identificado") continua.
// Gestor, Gestor de Qualidade e Administrador comum seguem com a homologação. Só dados de teste (nomes fictícios).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const USUARIOS = () => [
  { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA', PERFIL: 'DIRETORIA', AREA: 'DIRETORIA', STATUS: 'ATIVO' },
  { ID: 'u_dono', USUARIO: 'admin', NOME: 'DONO DO SISTEMA', PERFIL: 'ADMIN', AREA: 'DIRETORIA', STATUS: 'ATIVO' },
  { ID: 'u_qual', USUARIO: 'quintino', NOME: 'QUINTINO QUALIDADE', PERFIL: 'GESTOR', AREA: 'QUALIDADE', STATUS: 'ATIVO' },
  { ID: 'u_met', USUARIO: 'bia', NOME: 'BIA GESTORA METROLOGIA', PERFIL: 'GESTOR', AREA: 'METROLOGIA', STATUS: 'ATIVO' },
  { ID: 'u_rh', USUARIO: 'rosa', NOME: 'ROSA RH', PERFIL: 'GESTOR', AREA: 'RH', STATUS: 'ATIVO' },
  { ID: 'u_fin', USUARIO: 'fabi', NOME: 'FABI FINANCEIRO', PERFIL: 'FINANCEIRO', AREA: 'FINANCEIRO', STATUS: 'ATIVO' },
  { ID: 'u_tec', USUARIO: 'teo', NOME: 'TEO TECNICO', PERFIL: 'TECNICO', AREA: 'TECNICA', STATUS: 'ATIVO' },
  { ID: 'u_dir2', USUARIO: 'duda', NOME: 'DUDA DIRETOR', PERFIL: 'DIRETORIA', AREA: 'DIRETORIA', STATUS: 'ATIVO' },
  { ID: 'u_adm2', USUARIO: 'otavio', NOME: 'OTAVIO ADMIN COMUM', PERFIL: 'ADMIN', AREA: 'QUALIDADE', STATUS: 'ATIVO' },
  { ID: 'u_qual_inativo', USUARIO: 'velho', NOME: 'ANTIGO QUALIDADE', PERFIL: 'GESTOR', AREA: 'QUALIDADE', STATUS: 'INATIVO' }
];
const S = (id) => { const u = USUARIOS().find((x) => x.ID === id); return { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; };

function ambiente(sessaoInicial, registros) {
  const r = registros || {};
  const sessao = { atual: sessaoInicial };
  const arquivos = Object.assign({}, r.arquivos || {});
  const props = {}, logs = [];
  const tabelas = {
    CAD_USUARIOS: USUARIOS(), CAD_AREAS: [],
    qual_ocorrencia: r.ocorrencias || [], qual_ocorrencia_tipo: [{ CODIGO: 'COZ-01', DESCRICAO: 'Louça deixada na pia', GRUPO: 'Cozinha', NIVEL: 'L', REINCIDIVEL: 'TRUE', PONTOS_PLACAR: -2 }],
    qual_missao: [], qual_fechamento: r.fechamentos || [], qual_ciencia: [], qual_evento_positivo: [], qual_evento_positivo_tipo: [], qual_ausencia: []
  };
  let seq = 0;
  const ctx = vm.createContext({
    console, JSON, Object, Array, String, Number, RegExp, Error, Date, Math,
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } },
    SGO_DATA: {
      getAll: (t) => tabelas[t] || [],
      getById: (t, id) => (tabelas[t] || []).find((x) => String(x.ID) === String(id)) || null,
      update: (t, id, campos) => Object.assign((tabelas[t] || []).find((x) => String(x.ID) === String(id)), campos),
      insert: (t, d) => { const reg = Object.assign({ ID: 'novo' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(reg); return reg; },
      log: (acao, usuario, texto) => logs.push({ acao, usuario, texto })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    Utilities: {
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')),
      newBlob: (bytes, tipo, nome) => ({ bytes, tipo, nome })
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' }, Permission: { VIEW: 'VIEW', NONE: 'NONE' },
      getFileById: (id) => {
        const a = arquivos[id];
        if (!a) throw new Error('arquivo não existe');
        return { getBlob: () => ({ getBytes: () => a.bytes }), getMimeType: () => a.tipo, getName: () => a.nome, setSharing: (acesso, perm) => { a.compartilhamento = acesso + ':' + perm; } };
      },
      getFolderById: () => ({ createFile: (blob) => { const id = 'arq' + (++seq) + 'xxxxxxxxxx'; arquivos[id] = { bytes: blob.bytes, tipo: blob.tipo, nome: blob.nome, compartilhamento: '' };
        return { getUrl: () => 'https://sgo.exemplo.test/arquivos/' + id, setSharing: (acesso, perm) => { arquivos[id].compartilhamento = acesso + ':' + perm; } }; } })
    },
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil)
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Chaves.js', 'SGO_Conduta_Calculo.js', 'SGO_Conduta_Setup.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Ciencia.js', 'SGO_Conduta_Fechamento.js']) {
    vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f });
  }
  ctx.Conduta_hojeISO_ = () => '2026-10-28';
  ctx.Conduta_obterParametros_ = () => ({ PRAZO_REGISTRO_DIAS_UTEIS: 2, PRAZO_HOMOLOGACAO_DIAS_UTEIS: 3, PRAZO_CONTESTACAO_DIAS_UTEIS: 3, JANELA_REINCIDENCIA_DIAS: 90 });
  ctx.Conduta_exigirEquipe_ = () => sessao.atual;
  ctx.Conduta_obterPastaFotos_ = () => ctx.DriveApp.getFolderById('pasta');
  return { ctx, tabelas, sessao, arquivos, props, logs };
}

const REGISTRO = (extra) => Object.assign({ tipoCodigo: 'COZ-01', colaboradorId: 'u_tec', dataFato: '2026-10-27', descricao: 'Louça deixada na pia da copa depois do almoço.' }, extra || {});
const so = (tabelas, id) => tabelas.qual_ocorrencia.find((o) => o.ID === id);
function sessaoQualidade(ctx) { ctx.Conduta_exigirEquipe_ = () => S('u_qual'); ctx.exigirSessao = () => S('u_qual'); ctx.isAdminSession = () => true; }

test('Diretoria registra: a ocorrência já nasce homologada (mesmo estado da homologação), com o registro no histórico e na auditoria; não há o que homologar', () => {
  const { ctx, tabelas, logs } = ambiente(S('u_dir'));
  const r = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO());
  assert.equal(r.success, true); assert.equal(r.homologadaNoRegistro, true);
  const oc = so(tabelas, r.item.ID);
  assert.equal(oc.STATUS, 'HOMOLOGADA');
  assert.equal(oc.HOMOLOGADA_EM, '2026-10-28'); assert.equal(oc.HOMOLOGADA_POR, 'u_dir'); assert.equal(oc.FISCAL_ID, 'u_dir');
  assert.equal(oc.PRAZO_CONTESTACAO, '2026-11-02', '3 dias úteis a partir de hoje, como na homologação');
  assert.equal(oc.PRAZO_HOMOLOGACAO, '', 'sem prazo de homologação');
  assert.equal(oc.DECISAO_DIRETORIA, undefined, 'não é caso próprio');
  const hist = JSON.parse(oc.HISTORICO_JSON);
  assert.equal(hist.length, 1); assert.equal(hist[0].acao, 'HOMOLOGACAO_NO_REGISTRO'); assert.equal(hist[0].decisao, 'APROVAR');
  assert.match(hist[0].texto, /^Homologada no registro: lançada pela Diretoria \(DORA DIRETORA, \d{2}\/\d{2}\/\d{4}/);
  assert.equal(hist[0].marca, 'Homologada no registro: lançada pela Diretoria ou pela Administração');
  assert.ok(logs.some((l) => l.acao === 'CONDUTA_OCORRENCIA_HOMOLOGADA' && /Homologada no registro/.test(l.texto)));
  assert.match(r.message, /já homologada: lançada pela Diretoria, não passa por homologação nem pela Caixa de decisões\. O colaborador vê a ocorrência e pode contestar até 02\/11\/2026/);
  // ninguém mais homologa: a tela só oferece Homologar para Registrada e o servidor recusa
  sessaoQualidade(ctx);
  assert.equal(ctx.Conduta_apiListarOcorrencias('s', {}).find((o) => o.ID === oc.ID).STATUS, 'HOMOLOGADA');
  assert.throws(() => ctx.Conduta_apiHomologarOcorrencia('s', { id: oc.ID, decisao: 'APROVAR' }), /status REGISTRADA/);
});

test('dono do sistema (conta admin) registra: homologada no registro "pela Administração"; Gestor, Gestor de Qualidade, Administrador comum e técnico seguem com a homologação', () => {
  const a = ambiente(S('u_dono'));
  const r = a.ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO());
  assert.equal(so(a.tabelas, r.item.ID).STATUS, 'HOMOLOGADA');
  assert.match(JSON.parse(so(a.tabelas, r.item.ID).HISTORICO_JSON)[0].texto, /lançada pela Administração \(DONO DO SISTEMA, /);
  for (const id of ['u_qual', 'u_adm2', 'u_met', 'u_tec']) {
    const b = ambiente(S(id));
    const x = b.ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO({ colaboradorId: id === 'u_tec' ? 'u_fin' : 'u_tec' }));
    const oc = so(b.tabelas, x.item.ID);
    assert.equal(oc.STATUS, 'REGISTRADA', id); assert.equal(oc.PRAZO_HOMOLOGACAO, '2026-11-02', id); assert.equal(oc.HOMOLOGADA_EM, undefined, id);
    assert.equal(x.homologadaNoRegistro, false);
    assert.match(x.message, /segue para a homologação da Diretoria ou do Gestor de Qualidade \(quem registrou não homologa\); sem decisão até 02\/11\/2026, é descartada pelo sistema\./);
  }
});

test('o resto do fluxo continua: ciência do colaborador, contestação julgada por outra pessoa (Regra 12), firme no fim do prazo e só então conta no D', () => {
  const { ctx, tabelas, sessao } = ambiente(S('u_dir'));
  vm.runInContext('CONDUTA_AVISOS_JANELA_DIAS = 100000;', ctx);
  const a = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO());
  const b = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO({ colaboradorId: 'u_fin' }));
  // ciência: o colaborador recebe o aviso em seu nome, com o prazo para contestar
  sessao.atual = S('u_tec');
  const av = ctx.Conduta_apiObterAvisos('s').avisos.find((x) => x.tipo === 'OCORRENCIA' && x.ref === a.item.ID);
  assert.ok(av, 'aviso da ocorrência para o colaborador'); assert.equal(av.minha, true);
  assert.match(av.linhas[0], /lançada em seu nome\. Se não concordar, conteste no módulo Conduta até 02\/11\/2026/);
  assert.equal(ctx.Conduta_calcularDCompetencia_('2026-10'), 0, 'homologada ainda não conta');
  // contestação pelo colaborador
  ctx.Conduta_apiContestarOcorrencia('s', { id: a.item.ID, texto: 'A louça não era minha, eu estava em campo.' });
  assert.equal(so(tabelas, a.item.ID).STATUS, 'CONTESTADA');
  // quem registrou (Diretoria) não julga: Regra 12; o Gestor de Qualidade julga
  sessao.atual = S('u_dir');
  assert.throws(() => ctx.Conduta_apiJulgarOcorrencia('s', { id: a.item.ID, decisao: 'MANTER', textoJulgamento: 'Mantida.' }), /Você é o fiscal que registrou/);
  sessao.atual = S('u_qual');
  ctx.Conduta_apiJulgarOcorrencia('s', { id: a.item.ID, decisao: 'ANULAR', textoJulgamento: 'Agenda mostra o colaborador em campo no horário.' });
  assert.equal(so(tabelas, a.item.ID).STATUS, 'ANULADA');
  // a outra, sem contestação: firme no fim do prazo e passa a contar
  ctx.Conduta_hojeISO_ = () => '2026-11-03';
  ctx.Conduta_processarPrazosVencidos_();
  assert.equal(so(tabelas, b.item.ID).STATUS, 'FIRME');
  assert.ok(ctx.Conduta_calcularDCompetencia_('2026-10') > 0, 'firme conta no D');
});

test('conflito de interesse: Diretoria registrando contra si mesma segue a regra de 19/10 (fundamentação mínima e marca da decisão própria); contra outra pessoa da Diretoria, homologa e a pessoa pode contestar', () => {
  const { ctx, tabelas, logs, sessao } = ambiente(S('u_dir'));
  assert.throws(() => ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO({ colaboradorId: 'u_dir', descricao: 'Louça na pia' })), /Você é a pessoa envolvida e registra como Diretoria.*pelo menos 15 caracteres/);
  const r = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO({ colaboradorId: 'u_dir' }));
  const oc = so(tabelas, r.item.ID);
  assert.equal(oc.STATUS, 'HOMOLOGADA');
  assert.equal(oc.DECISAO_DIRETORIA, 'Decisão da Diretoria sobre ocorrência em que é envolvida');
  const h = JSON.parse(oc.HISTORICO_JSON)[0];
  assert.equal(h.marca, 'Decisão da Diretoria sobre ocorrência em que é envolvida');
  assert.match(h.texto, /Fundamentação \(ocorrência própria\): Louça deixada na pia/);
  assert.ok(logs.some((l) => l.acao === 'CONDUTA_DECISAO_DIRETORIA_PROPRIA'));
  // contra outro diretor: homologada sem a marca; ele contesta (quem julga não é quem registrou)
  const d = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO({ colaboradorId: 'u_dir2' }));
  assert.equal(so(tabelas, d.item.ID).STATUS, 'HOMOLOGADA'); assert.equal(so(tabelas, d.item.ID).DECISAO_DIRETORIA, undefined);
  sessao.atual = S('u_dir2');
  ctx.Conduta_apiContestarOcorrencia('s', { id: d.item.ID, texto: 'Não estive na copa nesse dia.' });
  assert.throws(() => { sessao.atual = S('u_dir'); ctx.Conduta_apiJulgarOcorrencia('s', { id: d.item.ID, decisao: 'MANTER', textoJulgamento: 'Mantida pela agenda.' }); }, /Você é o fiscal que registrou/);
  assert.equal(so(tabelas, d.item.ID).STATUS, 'CONTESTADA');
});

test('"Não identificado" registrado pela Diretoria também nasce homologado, sem nome; a lista mantém o sigilo para a gestora de outra área', () => {
  const { ctx, tabelas, sessao } = ambiente(S('u_dir'));
  const r = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO({ colaboradorId: 'NAO_IDENTIFICADO' }));
  const oc = so(tabelas, r.item.ID);
  assert.equal(oc.STATUS, 'HOMOLOGADA'); assert.equal(oc.COLABORADOR_ID, '');
  assert.match(r.message, /Sem pessoa identificada, conta no resultado da equipe quando ficar firme\./);
  const t = ctx.Conduta_apiRegistrarOcorrencia('s', REGISTRO());
  sessao.atual = S('u_met');
  assert.ok(!ctx.Conduta_apiListarOcorrencias('s', {}).some((o) => o.ID === t.item.ID), 'gestora de outra área não vê a ocorrência de outra pessoa');
  assert.equal(ctx.Conduta_apiObterSigilo('s').registraHomologada, false);
  sessao.atual = S('u_dir');
  assert.equal(ctx.Conduta_apiObterSigilo('s').registraHomologada, true);
});

test('tela, celular, ajuda, manuais e base do assistente dizem a regra', () => {
  const tela = fs.readFileSync(path.join(base, 'SGO_Conduta_ConteudoModulo.js'), 'utf8');
  assert.match(tela, /cnd_reg_nota_hom/); assert.match(tela, /registraHomologada/);
  assert.match(fs.readFileSync(path.join(base, 'JS_Core.html'), 'utf8'), /alert\(\(res && res\.message\) \|\| "Ocorrência registrada\. Ela segue para a homologação/);
  const arquivos = [path.join(__dirname, '../docs/MANUAL_CONDUTA_FISCAL.md'), path.join(__dirname, '../docs/MANUAL_CONDUTA_COLABORADOR.md'),
    path.join(base, 'SGO_Conduta_Biblioteca.js'), path.join(base, 'SGO_Ajuda_Conduta.js'), path.join(base, 'SGO_AssistenteManuais.js')];
  for (const f of arquivos) assert.match(fs.readFileSync(f, 'utf8'), /[Hh]omologada no registro/, f);
});
