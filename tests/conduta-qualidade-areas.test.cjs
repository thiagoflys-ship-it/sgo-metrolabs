// Programa de conduta, pente fino de qualidade (19/10/2026): área da pessoa (CAD_USUARIOS.AREA),
// sugestões de ocorrência vindas dos outros módulos (nunca automáticas), análise de causa,
// plano de ação 5W2H com PDCA (ações em Minhas atividades), Kanban e indicadores por área.
// Código real do SGO+ num contexto isolado, com tabelas em memória.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const HOJE = '2026-10-19';

function ambiente(tabelasIniciais, sessao) {
  const tabelas = Object.assign({
    CAD_USUARIOS: [], CAD_AREAS: [], qual_ocorrencia: [], qual_ocorrencia_tipo: [], qual_sugestao: [], qual_plano_acao: [], qual_analise_causa: [],
    qual_fechamento: [], qual_parametro: [], CAD_CONDUTORES: [], CAD_VEICULOS: [], REG_FROTA_MULTA: [], REG_FROTA_MOVIMENTACAO: [],
    AUVO_TAREFAS: [], AUVO_PENDENCIAS: [], QUALIDADE_OCORRENCIAS: [], ATV_ATIVIDADES: [], AVS_AVISOS: [], AVS_CIENCIA: []
  }, tabelasIniciais || {});
  let seq = 0;
  const props = {}, cache = {}, logs = [], atividadesCriadas = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      _headersCache: {}, _headerMapCache: {},
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: HOJE + 'T10:00:00' }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq), CRIADO_EM: HOJE + 'T10:00:00' }, d))); },
      log: (acao, usuario, texto) => logs.push({ acao, usuario, texto })
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_VEICULOS: 'CAD_VEICULOS', REG_FROTA_MULTA: 'REG_FROTA_MULTA',
      REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO', AUVO_TAREFAS: 'AUVO_TAREFAS', AUVO_PENDENCIAS: 'AUVO_PENDENCIAS', AVS_AVISOS: 'AVS_AVISOS', AVS_CIENCIA: 'AVS_CIENCIA', CAD_CLIENTES: 'CAD_CLIENTES' },
      PROFILES: ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH', 'CLIENTE'] },
    SGO_textoFalhaOperador_: (acao, e) => 'Não foi possível ' + acao + ': ' + String((e && e.message) || e),
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil),
    SGO_podeConsultarPessoas_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA', 'RH'].includes(String(p).toUpperCase()),
    SGO_ehPerfilRH_: (p) => String(p).toUpperCase() === 'RH',
    Atividades_apiCriar: (sid, p) => { const item = { ID: 'atv' + (atividadesCriadas.length + 1), TITULO: p.titulo, RESPONSAVEL_ID: p.responsavelId, RESPONSAVEL_NOME: 'R', PRAZO: p.prazo, PREVISAO_ATUAL: p.prazo, SITUACAO: 'A fazer', MODULO: p.modulo }; atividadesCriadas.push(item); return { ok: true, item }; },
    Atividades_todas_: () => atividadesCriadas.map((a) => Object.assign({}, a)),
    Atividades_agora_: () => HOJE + 'T10:00'
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Conduta_Calculo.js', 'SGO_Conduta_Setup.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Ciencia.js', 'SGO_Conduta_Qualidade.js', 'SGO_Areas.js', 'SGO_Qualidade_Auvo.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8'), ctx);
  }
  ctx.Conduta_hojeISO_ = () => HOJE;
  ctx.Conduta_setup_ = () => {};
  ctx.Conduta_obterParametros_ = () => ({ PRAZO_REGISTRO_DIAS_UTEIS: 2, PRAZO_HOMOLOGACAO_DIAS_UTEIS: 3, JANELA_REINCIDENCIA_DIAS: 90 });
  ctx.Conduta_exigirEquipe_ = () => sessao.atual;
  ctx.Conduta_exigirGestor_ = () => { if (!ctx.isAdminSession()) throw new Error('Acesso restrito a Gestor/Administrador/Diretoria.'); return sessao.atual; };
  ctx.Conduta_podeConsultarTodos_ = () => ['ADMIN', 'GESTOR', 'DIRETORIA', 'RH'].includes(sessao.atual.perfil);
  return { ctx, tabelas, props, logs, atividadesCriadas };
}

const pessoas = () => [
  { ID: 'u_com', USUARIO: 'carla', NOME: 'CARLA COMERCIAL', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', AREA: '' },
  { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO', PERFIL: 'TECNICO', STATUS: 'ATIVO', AREA: '' },
  { ID: 'u_ges', USUARIO: 'gil', NOME: 'GIL GESTOR', PERFIL: 'GESTOR', STATUS: 'ATIVO', AREA: '' },
  { ID: 'u_ges2', USUARIO: 'gaby', NOME: 'GABY GESTORA', PERFIL: 'GESTOR', STATUS: 'ATIVO', AREA: 'QUALIDADE' },
  { ID: 'u_fin', USUARIO: 'fabio', NOME: 'FABIO', PERFIL: 'ADMIN', STATUS: 'ATIVO', AREA: '', SETOR: 'Financeiro' },
  { ID: 'u_cli', USUARIO: 'cli', NOME: 'CLIENTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', AREA: '' }
];
const GESTOR = { userId: 'u_ges', usuario: 'gil', nome: 'GIL GESTOR', perfil: 'GESTOR' };
const GESTOR2 = { userId: 'u_ges2', usuario: 'gaby', nome: 'GABY GESTORA', perfil: 'GESTOR' };
const RH = { userId: 'u_rh', usuario: 'rh', nome: 'RH', perfil: 'RH' };

test('áreas: lista padrão com Comercial e as demais; migração só preenche vazio e lista quem não deu para deduzir', () => {
  const sessao = { atual: GESTOR };
  const { ctx, tabelas, props } = ambiente({ CAD_USUARIOS: pessoas() }, sessao);
  ctx.Areas_garantir_();
  const codigos = tabelas.CAD_AREAS.map((a) => a.CODIGO);
  for (const c of ['DIRETORIA', 'ADMINISTRATIVO', 'COMERCIAL', 'FINANCEIRO', 'RH', 'QUALIDADE', 'METROLOGIA', 'TECNICA', 'LOGISTICA']) assert.ok(codigos.includes(c), c);
  const u = Object.fromEntries(tabelas.CAD_USUARIOS.map((x) => [x.ID, x.AREA]));
  assert.equal(u.u_com, 'COMERCIAL');
  assert.equal(u.u_tec, 'TECNICA');
  assert.equal(u.u_ges2, 'QUALIDADE', 'o que já estava preenchido não muda');
  assert.equal(u.u_fin, 'FINANCEIRO', 'deduzido pela coluna antiga SETOR');
  assert.equal(u.u_ges, '', 'gestor não diz a área');
  assert.equal(u.u_cli, '', 'cliente não recebe área');
  const r = JSON.parse(props.USR_AREA_MIGRACAO_V1_RESULTADO);
  assert.deepEqual(r.semDeducao.map((x) => x.id), ['u_ges']);
  // segunda execução não refaz nada
  tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_com').AREA = 'FINANCEIRO';
  ctx.Areas_migrarUmaVez_();
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_com').AREA, 'FINANCEIRO');
  assert.equal(ctx.Areas_codigoDeTexto_('Técnica/Campo'), 'TECNICA');
  assert.equal(ctx.Areas_codigoDeTexto_('comercial'), 'COMERCIAL');
  assert.equal(ctx.Areas_codigoDeTexto_('Recursos Humanos'), 'RH');
  assert.equal(ctx.Areas_codigoDeTexto_('Marte'), '');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.SGO_areaDoUsuario_({ AREA: 'TECNICA' }))), { codigo: 'TECNICA', nome: 'Técnica/Campo' });
  assert.equal(ctx.SGO_areaDoUsuario_({ AREA: '' }).nome, 'Sem área definida');
});

test('áreas: gestão e RH gerem; técnico é recusado; área com gente ativa não é inativada; nada é apagado', () => {
  const sessao = { atual: RH };
  const { ctx, tabelas } = ambiente({ CAD_USUARIOS: pessoas() }, sessao);
  const r = ctx.areasDefinirDoUsuario('s', { usuarioId: 'u_ges', area: 'DIRETORIA' });
  assert.equal(r.success, true, r.message);
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_ges').AREA, 'DIRETORIA');
  const com = tabelas.CAD_AREAS.find((a) => a.CODIGO === 'COMERCIAL');
  const ina = ctx.areasAlterarSituacao('s', { id: com.ID, ativo: false });
  assert.equal(ina.success, false);
  assert.match(ina.message, /Mude a área delas/);
  const nova = ctx.areasSalvar('s', { nome: 'Compras' });
  assert.equal(nova.success, true);
  assert.equal(ctx.areasSalvar('s', { nome: 'compras' }).success, false, 'nome repetido');
  const compras = tabelas.CAD_AREAS.find((a) => a.CODIGO === 'COMPRAS');
  assert.equal(ctx.areasAlterarSituacao('s', { id: compras.ID, ativo: false }).success, true);
  assert.equal(tabelas.CAD_AREAS.find((a) => a.CODIGO === 'COMPRAS').ATIVO, 'NAO', 'inativada, não apagada');
  assert.equal(ctx.areasDefinirDoUsuario('s', { usuarioId: 'u_tec', area: 'COMPRAS' }).success, false, 'área inativa não é escolhida');
  sessao.atual = { userId: 'u_tec', usuario: 'tiago', perfil: 'TECNICO' };
  const neg = ctx.areasPainel('s');
  assert.equal(neg.success, false);
  assert.match(neg.message, /gestão .* e pelo RH/);
});

function dados(extra) {
  const tabelas = Object.assign({
    CAD_USUARIOS: pessoas().map((p) => Object.assign(p, { AREA: { u_com: 'COMERCIAL', u_tec: 'TECNICA', u_ges: 'DIRETORIA', u_ges2: 'QUALIDADE' }[p.ID] || '' })),
    qual_ocorrencia_tipo: [
      { CODIGO: 'VEI-06', GRUPO: 'Veiculos', DESCRICAO: 'Multa de trânsito', NIVEL: 'G', PESO_ICO: 30, REINCIDIVEL: false, ATIVO: true },
      { CODIGO: 'VEI-04', GRUPO: 'Veiculos', DESCRICAO: 'Check não realizado', NIVEL: 'M', PESO_ICO: 8, REINCIDIVEL: true, ATIVO: true },
      { CODIGO: 'CAM-01', GRUPO: 'Campo', DESCRICAO: 'Sem foto', NIVEL: 'M', PESO_ICO: 8, REINCIDIVEL: true, ATIVO: true },
      { CODIGO: 'COM-01', GRUPO: 'Comercial', DESCRICAO: 'Demanda fora do canal', NIVEL: 'M', PESO_ICO: 8, REINCIDIVEL: true, ATIVO: true }
    ],
    CAD_CONDUTORES: [{ ID: 'c1', NOME: 'Tiago', USUARIO_ID: 'u_tec' }, { ID: 'c2', NOME: 'Sem login', USUARIO_ID: '' }],
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A11' }],
    REG_FROTA_MULTA: [
      { ID: 'm1', VEICULO_ID: 'v1', DATA_INFRACAO: '20/09/2026', CONDUTOR_ID: 'c1', STATUS_CRUZAMENTO: 'ENCONTRADO', STATUS: 'ABERTA', DESCRICAO: 'Excesso de velocidade' },
      { ID: 'm2', VEICULO_ID: 'v1', DATA_INFRACAO: '21/09/2026', CONDUTOR_ID: 'c1', STATUS_CRUZAMENTO: 'MULTIPLOS', STATUS: 'ABERTA' },
      { ID: 'm3', VEICULO_ID: 'v1', DATA_INFRACAO: '22/09/2026', CONDUTOR_ID: 'c2', STATUS_CRUZAMENTO: 'ENCONTRADO', STATUS: 'ABERTA' },
      { ID: 'm4', VEICULO_ID: 'v1', DATA_INFRACAO: '23/09/2026', CONDUTOR_ID: 'c1', STATUS_CRUZAMENTO: 'ENCONTRADO', STATUS: 'CANCELADA' }
    ],
    AUVO_TAREFAS: [{ ID: 't1', AUVO_TASK_ID: '9001', FINALIZADA: 'SIM', DATA_TAREFA: '2026-10-10', TECNICO_ID_SGO: 'u_tec', RELATO_SERVICO: 'ok', QTD_FOTOS: 0, CHECKIN_EM: 'x', CHECKOUT_EM: 'y', QUESTIONARIO_JSON: '[1]', TASK_URL: 'https://app.auvo.com.br/x' }]
  }, extra || {});
  return tabelas;
}

test('sugestões: multa com condutor identificado vira sugestão (nunca ocorrência); ambígua, sem login e cancelada não; coleta não duplica', () => {
  const sessao = { atual: GESTOR };
  const { ctx, tabelas } = ambiente(dados(), sessao);
  ctx.Cndq_menosDias_ = () => '2026-08-20';
  const r1 = ctx.Conduta_coletarSugestoes_('gil');
  const chaves = tabelas.qual_sugestao.map((s) => s.CHAVE).sort();
  assert.deepEqual(chaves, ['AUVO|SEM_FOTO|9001', 'FROTA|MULTA|m1']);
  assert.equal(tabelas.qual_ocorrencia.length, 0, 'nada vira ocorrência sozinho');
  assert.ok(r1.avisos.some((a) => /sem login/.test(a)));
  const s = tabelas.qual_sugestao.find((x) => x.CHAVE === 'FROTA|MULTA|m1');
  assert.equal(s.TIPO_CODIGO, 'VEI-06');
  assert.equal(s.COLABORADOR_ID, 'u_tec');
  assert.equal(s.DATA_FATO, '2026-09-20');
  ctx.Conduta_coletarSugestoes_('gil');
  assert.equal(tabelas.qual_sugestao.length, 2, 'segunda coleta não repete');
});

test('sugestões: aceitar registra a ocorrência com a origem e o prazo contado da descoberta; envolvido não decide; descarte pede motivo', () => {
  const sessao = { atual: GESTOR };
  const { ctx, tabelas } = ambiente(dados(), sessao);
  ctx.Cndq_menosDias_ = () => '2026-08-20';
  ctx.Conduta_coletarSugestoes_('gil');
  const multa = tabelas.qual_sugestao.find((x) => x.CHAVE === 'FROTA|MULTA|m1');
  // o fato é de 20/09 (prazo de registro vencido), mas foi encontrado hoje: aceita
  const r = ctx.Conduta_apiAceitarSugestao('s', { id: multa.ID });
  assert.equal(r.success, true);
  const oc = tabelas.qual_ocorrencia[0];
  assert.equal(oc.STATUS, 'REGISTRADA');
  assert.equal(oc.FISCAL_ID, 'u_ges');
  assert.equal(oc.ORIGEM_MODULO, 'FROTA');
  assert.equal(oc.ORIGEM_ID, 'm1');
  assert.equal(oc.SUGESTAO_ID, multa.ID);
  assert.match(oc.DESCRICAO, /Multa de trânsito/);
  assert.equal(tabelas.qual_sugestao.find((x) => x.ID === multa.ID).STATUS, 'ACEITA');
  assert.throws(() => ctx.Conduta_apiAceitarSugestao('s', { id: multa.ID }), /já foi decidida/);
  // sugestão sobre o próprio gestor
  tabelas.qual_sugestao.push({ ID: 'sx', STATUS: 'PENDENTE', COLABORADOR_ID: 'u_ges', TIPO_CODIGO: 'VEI-04', DATA_FATO: HOJE, DETECTADA_EM: HOJE, ORIGEM_MODULO: 'FROTA' });
  assert.throws(() => ctx.Conduta_apiAceitarSugestao('s', { id: 'sx' }), /é sobre você/);
  assert.throws(() => ctx.Conduta_apiDescartarSugestao('s', { id: 'sx' }), /é sobre você/);
  const auvo = tabelas.qual_sugestao.find((x) => x.CHAVE === 'AUVO|SEM_FOTO|9001');
  assert.throws(() => ctx.Conduta_apiDescartarSugestao('s', { id: auvo.ID, motivo: 'curto' }), /pelo menos 10/);
  assert.equal(ctx.Conduta_apiDescartarSugestao('s', { id: auvo.ID, motivo: 'Fotos enviadas por e-mail ao cliente.' }).success, true);
  assert.equal(tabelas.qual_sugestao.find((x) => x.ID === auvo.ID).STATUS, 'DESCARTADA');
  // prazo pela data do fato quando o dono decidir assim (parâmetro 0)
  tabelas.qual_sugestao.push({ ID: 'sy', STATUS: 'PENDENTE', COLABORADOR_ID: 'u_com', TIPO_CODIGO: 'COM-01', DATA_FATO: '2026-09-01', DETECTADA_EM: HOJE, ORIGEM_MODULO: 'ATIVIDADES' });
  ctx.Conduta_obterParametros_ = () => ({ PRAZO_REGISTRO_DIAS_UTEIS: 2, PRAZO_HOMOLOGACAO_DIAS_UTEIS: 3, JANELA_REINCIDENCIA_DIAS: 90, SUGESTAO_PRAZO_PELA_DESCOBERTA: '0' });
  assert.throws(() => ctx.Conduta_apiAceitarSugestao('s', { id: 'sy' }), /Prazo de registro/);
  // técnico não aceita nem lista
  sessao.atual = { userId: 'u_tec', usuario: 'tiago', perfil: 'TECNICO' };
  assert.throws(() => ctx.Conduta_apiListarSugestoes('s', {}), /gestão e do RH/);
});

test('sugestões: KM a conferir resolvido sai da fila como SUPERADA; registro manual recusa cliente e inativo', () => {
  const sessao = { atual: GESTOR };
  const { ctx, tabelas } = ambiente(dados({ REG_FROTA_MULTA: [], AUVO_TAREFAS: [] }), sessao);
  ctx.Cndq_menosDias_ = () => '2026-08-20';
  let pendente = true;
  ctx.Frota_kmAConferir_ = () => (pendente ? [{ movimentacaoId: 'mv1', etapa: 'CHEGADA', condutorUsuarioId: 'u_tec', data: '18/10/2026', placa: 'TST1A11', motivo: 'KM de chegada alto' }] : []);
  ctx.Conduta_coletarSugestoes_('gil');
  assert.equal(tabelas.qual_sugestao[0].STATUS, 'PENDENTE');
  pendente = false;
  const r = ctx.Conduta_coletarSugestoes_('gil');
  assert.equal(r.superadas, 1);
  assert.equal(tabelas.qual_sugestao[0].STATUS, 'SUPERADA');
  assert.throws(() => ctx.Conduta_apiRegistrarOcorrencia('s', { tipoCodigo: 'VEI-04', colaboradorId: 'u_cli', dataFato: HOJE }), /cliente/);
  tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_com').STATUS = 'INATIVO';
  assert.throws(() => ctx.Conduta_apiRegistrarOcorrencia('s', { tipoCodigo: 'COM-01', colaboradorId: 'u_com', dataFato: HOJE }), /inativa/);
});

test('plano 5W2H: a ação vira atividade do módulo conduta; PDCA só avança com as ações concluídas e a eficácia escrita', () => {
  const sessao = { atual: GESTOR };
  const oc = { ID: 'oc1', TIPO_CODIGO: 'VEI-06', COLABORADOR_ID: 'u_tec', FISCAL_ID: 'u_ges2', DATA_FATO: '2026-10-01', STATUS: 'FIRME', NIVEL_APLICADO: 'G', PRAZO_RECURSO: '2026-10-08' };
  const { ctx, tabelas, atividadesCriadas } = ambiente(dados({ qual_ocorrencia: [oc] }), sessao);
  assert.throws(() => ctx.Conduta_apiCriarPlanoAcao('s', { ocorrenciaId: 'oc1', oQue: 'Treinar', porQue: 'Falta de atenção', como: 'Curto', quando: '2026-11-10', quemId: 'u_tec' }), /Como/);
  const r = ctx.Conduta_apiCriarPlanoAcao('s', { ocorrenciaId: 'oc1', oQue: 'Treinar direção defensiva', porQue: 'Excesso de velocidade recorrente', como: 'Curso de 4 horas com instrutor', quando: '2026-11-10', quemId: 'u_tec' });
  assert.equal(r.success, true);
  assert.equal(r.codigo, 'PA-2026-001');
  assert.equal(atividadesCriadas.length, 1);
  assert.equal(atividadesCriadas[0].MODULO, 'conduta');
  assert.equal(atividadesCriadas[0].RESPONSAVEL_ID, 'u_tec');
  const p = tabelas.qual_plano_acao[0];
  assert.equal(p.FASE, 'EXECUTAR');
  assert.equal(p.AREA, 'TECNICA');
  assert.throws(() => ctx.Conduta_apiCriarPlanoAcao('s', { ocorrenciaId: 'oc1', oQue: 'Outro', porQue: 'xxxxx', como: 'xxxxxxxxxx', quando: '2026-11-10', quemId: 'u_tec' }), /já tem o plano/);
  assert.throws(() => ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'VERIFICAR' }), /ação\(ões\) em aberto/);
  atividadesCriadas[0].SITUACAO = 'Concluída';
  assert.equal(ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'VERIFICAR' }).success, true);
  assert.throws(() => ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'AGIR', texto: 'ok' }), /verificação/);
  ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'NOVO_CICLO', texto: 'Nova multa em 15/10: a ação não resolveu.' });
  assert.equal(p.FASE, 'PLANEJAR');
  assert.equal(p.CICLO, 2);
  assert.equal(ctx.Conduta_apiAdicionarAcaoPlano('s', { planoId: p.ID, oQue: 'Instalar alerta de velocidade', quemId: 'u_ges2', quando: '2026-11-20' }).success, true);
  assert.equal(p.FASE, 'EXECUTAR');
  atividadesCriadas[1].SITUACAO = 'Concluída';
  ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'VERIFICAR' });
  ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'AGIR', texto: 'Sem multa em 30 dias depois do alerta.' });
  assert.equal(p.EFICAZ, 'SIM');
  ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'CONCLUIDO', texto: 'Alerta incluído no checklist de saída.' });
  assert.equal(p.FASE, 'CONCLUIDO');
  assert.equal(JSON.parse(p.HISTORICO_JSON).length, 7);
  sessao.atual = RH;
  assert.throws(() => ctx.Conduta_apiAvancarPlano('s', { planoId: p.ID, para: 'CANCELADO', texto: 'xxxxxxxxxxxx' }), /Acesso restrito/);
});

test('análise de causa: 5 Porquês exige 3 respostas e a causa raiz; Ishikawa opcional', () => {
  const sessao = { atual: GESTOR };
  const { ctx, tabelas } = ambiente(dados(), sessao);
  assert.throws(() => ctx.Conduta_apiSalvarAnaliseCausa('s', { tipoCodigo: 'CAM-01', problema: 'O.S. sem foto em 4 visitas', porques: ['a', 'b'], causaRaiz: 'Celular sem espaço' }), /3 porquês/);
  const r = ctx.Conduta_apiSalvarAnaliseCausa('s', { tipoCodigo: 'CAM-01', problema: 'O.S. sem foto em 4 visitas', porques: ['Foto não subiu', 'Sem internet', 'App não guarda offline'], causaRaiz: 'Aplicativo sem modo offline configurado', ishikawa: { MAQUINA: 'Celular antigo', METODO: '' } });
  assert.equal(r.success, true);
  assert.deepEqual(JSON.parse(tabelas.qual_analise_causa[0].ISHIKAWA_JSON), { MAQUINA: 'Celular antigo' });
});

test('Kanban e indicadores: colunas pelo fluxo, plano recomendado para grave/reincidente, reincidência e tempo de homologação por área', () => {
  const sessao = { atual: RH };
  const ocs = [
    { ID: 'a', TIPO_CODIGO: 'VEI-04', COLABORADOR_ID: 'u_tec', DATA_FATO: '2026-10-10', STATUS: 'REGISTRADA', CRIADO_EM: '2026-10-10' },
    { ID: 'b', TIPO_CODIGO: 'VEI-04', COLABORADOR_ID: 'u_tec', DATA_FATO: '2026-10-05', STATUS: 'CONTESTADA', CRIADO_EM: '2026-10-05', HOMOLOGADA_EM: '2026-10-07', PRAZO_HOMOLOGACAO: '2026-10-08' },
    { ID: 'c', TIPO_CODIGO: 'VEI-06', COLABORADOR_ID: 'u_tec', DATA_FATO: '2026-10-01', STATUS: 'FIRME', NIVEL_APLICADO: 'G', CRIADO_EM: '2026-10-01', HOMOLOGADA_EM: '2026-10-06', PRAZO_HOMOLOGACAO: '2026-10-06', PRAZO_RECURSO: '2026-10-09' },
    { ID: 'd', TIPO_CODIGO: 'COM-01', COLABORADOR_ID: 'u_com', DATA_FATO: '2026-09-25', STATUS: 'FIRME', NIVEL_APLICADO: 'M', CRIADO_EM: '2026-09-25', HOMOLOGADA_EM: '2026-09-28', PRAZO_RECURSO: '2026-10-02' },
    { ID: 'e', TIPO_CODIGO: 'COM-01', COLABORADOR_ID: 'u_com', DATA_FATO: '2026-10-02', STATUS: 'FIRME', NIVEL_APLICADO: 'M', REINCIDENCIA_DE_ID: 'd', CRIADO_EM: '2026-10-02', HOMOLOGADA_EM: '2026-10-05', PRAZO_RECURSO: '2026-10-09' },
    { ID: 'f', TIPO_CODIGO: 'COM-01', COLABORADOR_ID: 'u_com', DATA_FATO: '2026-10-03', STATUS: 'ANULADA', CRIADO_EM: '2026-10-03' }
  ];
  const { ctx } = ambiente(dados({ qual_ocorrencia: ocs }), sessao);
  ctx.Areas_garantir_();
  const k = ctx.Conduta_apiKanbanQualidade('s', { dias: 90 });
  const col = Object.fromEntries(k.colunas.map((c) => [c.id, c.itens.map((i) => i.ID)]));
  assert.deepEqual(JSON.parse(JSON.stringify(col)), { registrada: ['a'], defesa: ['b'], homologada: ['e', 'c'], plano: [], concluida: ['d'] });
  assert.equal(k.encerradasSemEfeito, 1);
  assert.equal(k.colunas[2].itens.find((i) => i.ID === 'c').EXIGE_PLANO, 'grave');
  assert.equal(k.colunas[2].itens.find((i) => i.ID === 'e').EXIGE_PLANO, 'reincidente');
  assert.equal(k.podeGerir, false, 'RH só consulta');
  const ind = ctx.Conduta_apiIndicadoresQualidade('s', { dias: 90 });
  const com = ind.areas.find((a) => a.area === 'COMERCIAL');
  assert.equal(com.firmes, 2);
  assert.equal(com.reincidenciaPct, 50);
  assert.equal(com.tempoMedioHomologacao, 1, "sexta a segunda = 1 dia útil");
  const tec = ind.areas.find((a) => a.area === 'TECNICA');
  assert.equal(tec.homologacaoNoPrazoPct, 100);
  assert.equal(ind.semArea, 0, 'FABIO ganhou Financeiro pela coluna antiga SETOR');
  assert.equal(ind.areas.find((a) => a.area === 'FINANCEIRO').pessoas, 1);
});
