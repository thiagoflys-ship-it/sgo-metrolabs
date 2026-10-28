// 28/10/2026 (decisão do dono, caso de constrangimento de uma colaboradora): quem é o envolvido numa ocorrência só a
// Diretoria e o Gestor de Qualidade sabem (além da própria pessoa e de quem registrou); só eles decidem. Ocorrência
// "Não identificado" quando não se sabe quem foi (conta no D da equipe). Foto da evidência sem link público, aberta
// pela API só para quem pode ver a ocorrência. Só dados de teste (nomes fictícios).
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

const OC = (extra) => Object.assign({ ID: 'oc1', TIPO_CODIGO: 'COZ-01', COLABORADOR_ID: 'u_fin', FISCAL_ID: 'u_qual', DATA_FATO: '2026-10-26', COMPETENCIA: '2026-10',
  STATUS: 'REGISTRADA', FOTO_URL: 'https://sgo.exemplo.test/arquivos/FOTO123456789', FOTO_LEGENDA: 'Vasilha na mesa' }, extra || {});
const FOTO = () => ({ FOTO123456789: { bytes: [0xff, 0xd8, 0xff, 0xe0], tipo: 'image/jpeg', nome: 'image.jpg', compartilhamento: 'ANYONE_WITH_LINK:VIEW' } });

test('quem sabe quem é o envolvido: Diretoria, dono e Gestor de Qualidade ativo; os demais gestores e o RH não', () => {
  const { ctx } = ambiente(S('u_dir'));
  const ve = (id) => ctx.Conduta_veIdentidadeUsuario_(USUARIOS().find((u) => u.ID === id));
  assert.equal(ve('u_dir'), true);
  assert.equal(ve('u_dono'), true);
  assert.equal(ve('u_qual'), true);
  for (const id of ['u_met', 'u_rh', 'u_fin', 'u_tec', 'u_qual_inativo']) assert.equal(ve(id), false, id);
  assert.equal(ctx.Conduta_veIdentidade_(S('u_dono')), true, 'dono pela sessão');
  assert.equal(ctx.Conduta_veIdentidade_(S('u_met')), false);
});

test('lista: gestora de outra área e RH veem só as próprias; Qualidade e Diretoria veem todas, com o nome; o endereço da foto não vai à tela', () => {
  const ocs = [OC(), OC({ ID: 'oc2', COLABORADOR_ID: 'u_tec', FISCAL_ID: 'u_met' }), OC({ ID: 'oc3', COLABORADOR_ID: 'u_rh', FISCAL_ID: 'u_tec', FOTO_URL: '' })];
  const amb = ambiente(S('u_met'), { ocorrencias: ocs });
  assert.deepEqual(amb.ctx.Conduta_apiListarOcorrencias('s', {}).map((o) => o.ID), ['oc2'], 'Bia vê só a que registrou');
  amb.sessao.atual = S('u_rh');
  assert.deepEqual(amb.ctx.Conduta_apiListarOcorrencias('s', {}).map((o) => o.ID), ['oc3'], 'RH vê só a em seu nome');
  for (const quem of ['u_qual', 'u_dir']) {
    amb.sessao.atual = S(quem);
    const l = amb.ctx.Conduta_apiListarOcorrencias('s', {});
    assert.equal(l.length, 3, quem);
    const o1 = l.find((o) => o.ID === 'oc1');
    assert.equal(o1.COLABORADOR_NOME, 'FABI FINANCEIRO');
    assert.equal(o1.TEM_FOTO, true);
    assert.equal(o1.FOTO_URL, undefined, 'sem link na tela');
    assert.equal(l.find((o) => o.ID === 'oc3').TEM_FOTO, false);
  }
  amb.sessao.atual = S('u_dir');
  assert.equal(amb.ctx.Conduta_apiObterSigilo('s').veIdentidade, true);
  amb.sessao.atual = S('u_met');
  assert.equal(amb.ctx.Conduta_apiObterSigilo('s').veIdentidade, false);
});

test('homologar, julgar e contestar em nome: gestora de outra área recusada com o motivo; Gestor de Qualidade decide; quem registrou continua sem decidir', () => {
  const oc = OC({ FISCAL_ID: 'u_tec' });
  const amb = ambiente(S('u_met'), { ocorrencias: [oc] });
  assert.throws(() => amb.ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR' }), /sigilo do colaborador, quem decide .* Diretoria e o Gestor de Qualidade/);
  assert.equal(oc.STATUS, 'REGISTRADA');
  amb.sessao.atual = S('u_qual');
  amb.ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR' });
  assert.equal(oc.STATUS, 'HOMOLOGADA');
  amb.sessao.atual = S('u_met');
  assert.throws(() => amb.ctx.Conduta_apiContestarOcorrencia('s', { id: 'oc1', texto: 'em nome dela' }), /Diretoria e o Gestor de Qualidade em nome dele/);
  amb.sessao.atual = S('u_fin');
  amb.ctx.Conduta_apiContestarOcorrencia('s', { id: 'oc1', texto: 'Não concordo: faltou o feedback antes.' });
  assert.equal(oc.STATUS, 'CONTESTADA');
  amb.sessao.atual = S('u_rh');
  assert.throws(() => amb.ctx.Conduta_apiJulgarOcorrencia('s', { id: 'oc1', decisao: 'ANULAR', textoJulgamento: 'x' }), /sigilo do colaborador/);
  amb.sessao.atual = S('u_dir');
  amb.ctx.Conduta_apiJulgarOcorrencia('s', { id: 'oc1', decisao: 'MANTER', textoJulgamento: 'Fato comprovado pela foto.' });
  assert.equal(oc.STATUS, 'FIRME');
  // Regra 12 continua: o Gestor de Qualidade que registrou não decide
  const oc2 = OC({ ID: 'oc9', FISCAL_ID: 'u_qual' });
  amb.tabelas.qual_ocorrencia.push(oc2);
  amb.sessao.atual = S('u_qual');
  assert.throws(() => amb.ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc9', decisao: 'APROVAR' }), /fiscal que registrou/);
});

test('"Não identificado": registra sem pessoa, sem reincidência, conta no D da equipe e o aviso não aponta ninguém', () => {
  const anterior = OC({ ID: 'oc0', COLABORADOR_ID: '', STATUS: 'FIRME', DATA_FATO: '2026-10-20', PESO_APLICADO: 2, NIVEL_APLICADO: 'L' });
  const amb = ambiente(S('u_tec'), { ocorrencias: [anterior] });
  const r = amb.ctx.Conduta_apiRegistrarOcorrencia('s', { colaboradorId: 'NAO_IDENTIFICADO', tipoCodigo: 'COZ-01', dataFato: '2026-10-27', descricao: 'Louça deixada na pia da copa.' });
  assert.equal(r.success, true);
  const nova = amb.tabelas.qual_ocorrencia.find((o) => o.ID === r.item.ID);
  assert.equal(nova.COLABORADOR_ID, '');
  assert.equal(nova.REINCIDENCIA_DE_ID, '', 'sem pessoa não há reincidência');
  assert.equal(nova.NIVEL_APLICADO, 'L');
  assert.throws(() => amb.ctx.Conduta_apiRegistrarOcorrencia('s', { colaboradorId: '', tipoCodigo: 'COZ-01', dataFato: '2026-10-27', descricao: 'Louça deixada na pia.' }), /Não identificado/);
  // na lista de quem decide aparece "Não identificado", sem área
  amb.sessao.atual = S('u_qual');
  const l = amb.ctx.Conduta_apiListarOcorrencias('s', {}).find((o) => o.ID === nova.ID);
  assert.equal(l.COLABORADOR_NOME, 'Não identificado');
  assert.equal(l.COLABORADOR_AREA_NOME, '');
  // conta no D da equipe quando ficar firme
  nova.STATUS = 'FIRME'; nova.PESO_APLICADO = 2; nova.COMPETENCIA = '2026-10';
  assert.equal(amb.ctx.Conduta_calcularDCompetencia_('2026-10'), 4);
  // ninguém é "o envolvido": o aviso da equipe diz que foi sem pessoa identificada
  nova.STATUS = 'HOMOLOGADA'; nova.HOMOLOGADA_EM = '2026-10-28';
  amb.sessao.atual = S('u_fin');
  const aviso = amb.ctx.Conduta_apiObterAvisos('s').avisos.find((a) => a.ref === nova.ID);
  assert.ok(aviso);
  assert.equal(aviso.minha, false);
  assert.ok(aviso.linhas.some((t) => /sem pessoa identificada/.test(t)));
  assert.ok(!aviso.linhas.some((t) => /em seu nome/.test(t)));
});

test('foto da evidência: sem link público, abre pela API para envolvido, quem registrou, Qualidade e Diretoria; recusada para os demais', () => {
  const amb = ambiente(S('u_fin'), { ocorrencias: [OC({ FISCAL_ID: 'u_tec' })], arquivos: FOTO() });
  for (const quem of ['u_fin', 'u_tec', 'u_qual', 'u_dir']) {
    amb.sessao.atual = S(quem);
    const r = amb.ctx.Conduta_apiObterFotoOcorrencia('s', { id: 'oc1' });
    assert.match(r.data, /^data:image\/jpeg;base64,/, quem);
    assert.equal(r.legenda, 'Vasilha na mesa');
    assert.equal(r.codigo, 'COZ-01');
    assert.ok(!JSON.stringify(r).includes('FOTO123456789'), 'o ID do arquivo não vai ao navegador');
  }
  for (const quem of ['u_met', 'u_rh']) {
    amb.sessao.atual = S(quem);
    assert.throws(() => amb.ctx.Conduta_apiObterFotoOcorrencia('s', { id: 'oc1' }), /sigilo do colaborador/, quem);
  }
  // foto antiga do Google Drive também abre (o ID sai do endereço antigo)
  amb.tabelas.qual_ocorrencia[0].FOTO_URL = 'https://drive.google.com/file/d/FOTO123456789/view?usp=drivesdk';
  amb.sessao.atual = S('u_qual');
  assert.match(amb.ctx.Conduta_apiObterFotoOcorrencia('s', { id: 'oc1' }).data, /^data:image\/jpeg/);
  // foto nova: gravada RESTRITO
  amb.sessao.atual = S('u_tec');
  const up = amb.ctx.Conduta_apiUploadFoto('s', { base64: 'data:image/jpeg;base64,' + Buffer.from([1, 2, 3]).toString('base64'), mimeType: 'image/jpeg', nomeArquivo: 'x.jpg' });
  const idNovo = /arquivos\/(\w+)/.exec(up.url)[1];
  assert.equal(amb.arquivos[idNovo].compartilhamento, 'RESTRITO:SISTEMA');
});

test('fotos antigas viram RESTRITO uma vez só (flag) e o saneamento fica na auditoria', () => {
  const amb = ambiente(S('u_dir'), { ocorrencias: [OC(), OC({ ID: 'oc2', FOTO_URL: '' })], arquivos: FOTO() });
  const r = amb.ctx.Conduta_restringirFotosAntigas_();
  assert.equal(r.feitas, 1);
  assert.equal(amb.arquivos.FOTO123456789.compartilhamento, 'RESTRITO:SISTEMA');
  assert.ok(amb.props.CONDUTA_FOTOS_RESTRITAS_20261028);
  assert.equal(amb.ctx.Conduta_restringirFotosAntigas_().jaFeito, true);
  assert.ok(amb.logs.some((l) => l.acao === 'CONDUTA_FOTOS_RESTRITAS'));
});

test('fechamento do mês: quem não é da Diretoria nem da Qualidade vê a linha de cada pessoa sem placar nem gravíssima', () => {
  const linhas = [{ colaboradorId: 'u_fin', nome: 'FABI FINANCEIRO', ggPropria: false, placar: -2, recebeBonus: true, valorBonus: 300, valorIncentivo: 0, qtdMissoesElegiveis: 0 },
    { colaboradorId: 'u_met', nome: 'BIA GESTORA METROLOGIA', ggPropria: false, placar: 0, recebeBonus: true, valorBonus: 300, valorIncentivo: 0, qtdMissoesElegiveis: 0 }];
  const amb = ambiente(S('u_met'), { fechamentos: [{ COMPETENCIA: '2026-09', D: 2, N: 18, ICO: 99.4, FAROL: 'VERDE', RESULTADO_JSON: JSON.stringify(linhas) }] });
  amb.ctx.Conduta_podeConsultarTodos_ = () => true;
  const f = amb.ctx.Conduta_apiObterFechamento('s', { competencia: '2026-09' });
  const fabi = f.porColaborador.find((l) => l.colaboradorId === 'u_fin');
  assert.equal(fabi.valorBonus, 300);
  assert.equal(fabi.placar, undefined);
  assert.equal(fabi.ggPropria, undefined);
  assert.equal(f.porColaborador.find((l) => l.colaboradorId === 'u_met').placar, 0, 'a própria linha vem inteira');
  amb.sessao.atual = S('u_qual');
  assert.equal(amb.ctx.Conduta_apiObterFechamento('s', { competencia: '2026-09' }).porColaborador.find((l) => l.colaboradorId === 'u_fin').placar, -2);
});

test('telas: foto abre na própria tela (sem link), "Não identificado" no registro e aviso de sigilo para quem não decide', () => {
  const raw = fs.readFileSync(path.join(base, 'SGO_Conduta_ConteudoModulo.js'), 'utf8');
  const html = vm.runInNewContext(raw + ';CONDUTA_CONTEUDO_MODULO');
  assert.ok(!/FOTO_URL/.test(html), 'a tela do computador não usa mais o endereço da foto');
  assert.match(html, /SGO_condutaVerFoto_\(/);
  assert.match(html, /value="NAO_IDENTIFICADO">Não identificado/);
  assert.match(html, /apiObterSigilo/);
  assert.match(html, /nunca a pessoa/);
  const core = fs.readFileSync(path.join(base, 'JS_Core.html'), 'utf8');
  assert.match(core, /function SGO_verImagem_\(/);
  assert.match(core, /function SGO_condutaVerFoto_\(/);
  assert.ok(!/oc\.FOTO_URL/.test(core), 'o celular também não usa o endereço');
  assert.match(core, /value="NAO_IDENTIFICADO"/);
});
