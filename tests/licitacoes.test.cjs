// SGO+ Licitações, etapa 1 (01/11/2026): permissões (só Diretoria e Administrador; o servidor confere), os 33 portais,
// parametrização com merge e versão, teste de conexão real (simulado), sincronização com o coletor do servidor
// (deduplicação, retificação como versão nova, triagem refeita sem desfazer decisão da Diretoria), histórico com
// rastreabilidade, telas estruturais (computador e celular de 390 px) e ajuda presente.
// Código real do SGO+ num contexto isolado; o coletor do servidor (SGO_LICITACOES) é simulado com dados públicos do PNCP
// (IMBEL, ANSN e Cajamar, os mesmos de docs/LICITACOES_02 e 03). Nenhuma chamada de rede.
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

const USUARIOS = [
  ['u_dir', 'dora', 'DORA DIRETORA TESTE', 'DIRETORIA'], ['u_adm', 'admin', 'Administrador', 'ADMIN'], ['u_ges', 'gil', 'GIL GESTOR TESTE', 'GESTOR'],
  ['u_com', 'vera', 'VERA COMERCIAL TESTE', 'COMERCIAL'], ['u_fin', 'fabio', 'FABIO FINANCEIRO TESTE', 'FINANCEIRO'], ['u_tec', 'tiago', 'TIAGO TECNICO TESTE', 'TECNICO'],
  ['u_met', 'mara', 'MARA METROLOGIA TESTE', 'METROLOGIA'], ['u_rh', 'rita', 'RITA RH TESTE', 'RH'], ['u_cli', 'cliente', 'CLIENTE TESTE', 'CLIENTE']
];

/** Item como o servidor devolve em lic.listar (servicos/licitacoes/consulta.ts). */
function item(chave, versao, c, t, extra) {
  const hash = crypto.createHash('sha256').update(JSON.stringify([chave, versao, c])).digest('hex');   // como no servidor: só a contratação (a triagem não muda a versão)
  return Object.assign({ chave, versao, motivoVersao: versao > 1 ? 'RETIFICACAO' : 'PRIMEIRA', hash, brutoHash: 'b' + hash.slice(0, 63), portalOrigem: 'PNCP', rotaOrigem: 'publicacao',
    alteradoEm: '2026-11-01T22:00:0' + versao + '.000Z', primeiraColetaEm: '2026-11-01T21:00:00.000Z', idComprasGov: c.idComprasGov || '', contratacao: c, triagem: t }, extra || {});
}
const IMBEL = { numeroControlePncp: '00444232000139-1-001311/2026', orgaoCnpj: '00444232000139', orgaoNome: 'INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL', unidadeNome: 'INDUSTRIA DE MATERIAL BELICO DO BRASIL/FE',
  uf: 'RJ', municipio: 'Magé', modalidadeNome: 'Pregão - Eletrônico', modoDisputa: 'Aberto', amparoNome: 'Lei 13.303/2016, Art. 32, IV', lei: '13303', srp: true,
  objeto: 'Contratação de empresa especializada em Inspeção de Segurança, NR-13, em vasos de Pressão instalados na dependências da IMBEL - Fábrica da Estrela', valorEstimado: 100553.73,
  aberturaTexto: '2026-10-20T08:00:00', encerramentoTexto: '2026-11-13T08:00:00', encerramentoEm: '2026-11-13T11:00:00.000Z', fuso: 'America/Sao_Paulo', fusoPresumido: true,
  fusoAlerta: 'Horário presumido de Brasília (a fonte não informa o fuso).', situacaoNome: 'Divulgada no PNCP', linkSistemaOrigem: 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=16800805002352026',
  linkPncp: 'https://pncp.gov.br/app/editais/00444232000139/2026/1311', usuarioNome: 'Compras.gov.br', portalSessao: 'PUB-002', atualizacaoGlobalTexto: '2026-10-19T04:01:00', idComprasGov: '16800805002352026' };
const TRI_IMBEL = { resultado: 'CANDIDATA', motivo: 'Termo de interesse: NR-13 (no objeto).', regra: 'termo_interesse', trecho: '…em Inspeção de Segurança, NR-13, em vasos de Pressão instalados…', termo: 'NR-13', fonteTrecho: 'objeto',
  selos: [{ tipo: 'lei', cor: 'azul', texto: 'Lei 13.303/2016 (estatal)' }], pendencias: [], prioridade: 6, versao: '2026-11-01.1:abc' };
const ANSN = Object.assign({}, IMBEL, { numeroControlePncp: '62759595000110-1-000048/2026', orgaoCnpj: '62759595000110', orgaoNome: 'AUTORIDADE NACIONAL DE SEGURANCA NUCLEAR', municipio: 'Rio de Janeiro', modalidadeNome: 'Dispensa', lei: '14133', amparoNome: 'Lei 14.133/2021, Art. 75, II',
  objeto: 'Calibrações das balanças da DIRAD, com contratação de empresa pertencente à rede brasileira de calibração.', valorEstimado: 10000, encerramentoTexto: '2026-11-09T08:00:00', encerramentoEm: '2026-11-09T11:00:00.000Z', linkPncp: 'https://pncp.gov.br/app/editais/62759595000110/2026/48', linkSistemaOrigem: '', idComprasGov: '' });
const TRI_ANSN = { resultado: 'TRAVADA', motivo: 'Travada: exige acreditação RBC. A Metrolabs faz calibração rastreável, não acreditada (ISO/IEC 17025).', regra: 'rbc', trecho: '…com contratação de empresa pertencente à rede brasileira de calibração.', termo: 'rede brasileira de calibração', fonteTrecho: 'objeto',
  selos: [{ tipo: 'inmetro', cor: 'verde', texto: 'Autorizada Inmetro (balanças)' }, { tipo: 'rbc', cor: 'vermelho', texto: 'Exige acreditação RBC — não atendemos' }], pendencias: ['O edital aceita calibração rastreável ou subcontratação de laboratório acreditado? (confirmar no edital)'], prioridade: 6, versao: '2026-11-01.1:abc' };
const CAJAMAR = Object.assign({}, IMBEL, { numeroControlePncp: '46523023000181-1-000171/2026', orgaoCnpj: '46523023000181', orgaoNome: 'MUNICIPIO DE CAJAMAR', uf: 'SP', municipio: 'Cajamar', lei: '14133', usuarioNome: 'BLL Compras', portalSessao: 'PUB-004',
  objeto: 'Contratação de empresa especializada para a prestação de serviços de manejo populacional de cães e gatos, por meio de procedimentos cirúrgicos de esterilização', valorEstimado: 1195500, encerramentoTexto: '2026-11-03T08:30:00', encerramentoEm: '2026-11-03T11:30:00.000Z', linkSistemaOrigem: '', idComprasGov: '' });
const TRI_CAJAMAR = { resultado: 'DESCARTADA', motivo: 'Descartada pela regra: esterilização de animais (castração): não é serviço da Metrolabs (termo "manejo populacional").', regra: 'termo_negativo', trecho: '…prestação de serviços de manejo populacional de cães e gatos…', termo: 'manejo populacional', fonteTrecho: 'objeto', selos: [], pendencias: [], prioridade: 3, versao: '2026-11-01.1:abc' };

function ambiente(o) {
  o = o || {};
  const tabelas = { CAD_USUARIOS: USUARIOS.map((u) => ({ ID: u[0], USUARIO: u[1], NOME: u[2], PERFIL: u[3], STATUS: 'ATIVO' })) };
  const props = Object.assign({}, o.props || {}), cache = {}, sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  let seq = 0;
  const coletor = { itens: [], testes: [], pedidos: 0, obter: null, conexoes: [], situacao: { ligado: true, falhasSeguidasPncp: 0, ultimaRodadaEm: '2026-11-01T21:30:00.000Z', ultimoSucessoEm: '2026-11-01T21:30:00.000Z', ultimoErro: '', resumo: { lidos: 50, novas: 3, candidatas: 1, travadas: 1, descartadas: 1 } } };
  const SGO_LICITACOES = o.semColetor ? undefined : {
    listar: (f) => { const d = String((f && f.desde) || ''); const l = coletor.itens.filter((i) => i.alteradoEm > d); return { itens: l, ate: l.length ? l[l.length - 1].alteradoEm : d, mais: false }; },
    obter: (f) => coletor.obter || { atual: coletor.itens.find((i) => i.chave === f.chave) || null, versoes: [{ versao: 1, motivo: 'PRIMEIRA', hash: 'h'.repeat(64), coletadaEm: '2026-11-01T21:00:00.000Z', substituidaEm: '', encerramento: '2026-11-13T08:00:00', situacao: 'Divulgada no PNCP' }], itens: [{ numeroItem: 1, descricao: 'Inspeção de Segurança NR-13 em vasos de pressão', materialServico: 'S', quantidade: 1, unidade: 'UNIDADE', valorUnitario: 100553.73, valorTotal: 100553.73, beneficio: 'Sem benefício', sigiloso: false }] },
    conexoes: () => coletor.conexoes, situacao: () => coletor.situacao,
    testar: (f) => { coletor.testes.push(f.portal); return o.testeFalha ? { ok: false, portal: f.portal, status: 503, ms: 900, quantidade: 0, total: 0, rota: '/v1/contratacoes/proposta', erro: 'HTTP 503: No server is available to handle this request' } : { ok: true, portal: f.portal, status: 200, ms: 430, quantidade: 10, total: 17727, rota: '/v1/contratacoes/proposta', erro: '' }; },
    coletarAgora: () => { coletor.pedidos++; return { pedido: true }; }
  };
  const ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
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
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq) }, d))); }
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada. Entre de novo'); return sessoes[sid]; },
    SGO_execucaoInterna_: () => true,
    SGO_LICITACOES
  });
  for (const f of ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js']) vm.runInContext(ler(f), ctx, { filename: f });
  const api = (sid, acao, d) => ctx.Licitacoes_api(sid, acao, d || {});
  return { ctx, tabelas, props, coletor, api, hist: (tipo) => (tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo) };
}
const portal = (a, cod) => a.tabelas.LIC_PORTAIS.find((p) => p.CODIGO === cod);
const op = (a, nc) => a.tabelas.LIC_OPORTUNIDADES.find((l) => l.NUMERO_CONTROLE_PNCP === nc);

test('permissões: só Diretoria e Administrador entram; os demais perfis ficam sem menu e o servidor recusa toda ação', () => {
  const a = ambiente();
  for (const sid of ['s_dora', 's_admin']) {
    assert.equal(a.api(sid, 'acesso').nivel, 'GESTAO');
    assert.equal(a.api(sid, 'portais').ok, true, sid);
  }
  const antes = JSON.stringify(a.tabelas.LIC_PORTAIS);
  for (const sid of ['s_gil', 's_vera', 's_fabio', 's_tiago', 's_mara', 's_rita', 's_cliente']) {
    assert.equal(a.api(sid, 'acesso').nivel, 'NENHUM', sid);
    for (const acao of ['hoje', 'oportunidades', 'ficha', 'portais', 'conexoes', 'descartar', 'enviarAnalise', 'portalSalvar', 'portalTestar', 'radarSalvar', 'coletarAgora', 'sincronizar']) {
      const r = a.api(sid, acao, { codigo: 'PUB-001', campos: { ufs: 'GO' }, motivo: 'tentativa sem permissão', id: 'x' });
      assert.equal(r.ok, false, sid + ' ' + acao);
      assert.equal(r.semAcesso, true);
      assert.match(r.message, /Diretoria e do Administrador/);
    }
  }
  assert.equal(JSON.stringify(a.tabelas.LIC_PORTAIS), antes, 'nada foi gravado pelas recusas');
  assert.equal(a.api('s_inexistente', 'acesso').ok, false, 'sessão inválida não lança');
  assert.match(a.api('s_dora', 'naoExiste').message, /desconhecida/);
  // nome terminado em "_" é privado (o navegador não chama): a entrada do servidor e a sincronização
  assert.match(ler('SGO_Licitacoes.js'), /function Lic_aposColeta_\(resumo\)/);
});

test('33 portais com os endereços validados; PNCP e Compras.gov começam "Em teste"; o cadastro nunca sobrescreve', () => {
  const a = ambiente();
  a.api('s_dora', 'portais');
  const ps = a.tabelas.LIC_PORTAIS;
  assert.equal(ps.length, 33);
  assert.equal(new Set(ps.map((p) => p.CODIGO)).size, 33);
  assert.deepEqual(['PUB', 'EST', 'SAU', 'IND'].map((c) => ps.filter((p) => p.CATEGORIA === c).length), [10, 9, 9, 5]);
  assert.equal(portal(a, 'PUB-001').SITUACAO, 'Em teste');
  assert.equal(portal(a, 'PUB-002').SITUACAO, 'Em teste');
  assert.equal(portal(a, 'PUB-003').SITUACAO, 'Aguardando credenciais');
  assert.equal(portal(a, 'PUB-008').URL, 'https://bbmnet.com.br', 'endereço corrigido no doc 02');
  assert.equal(portal(a, 'PUB-010').URL, 'https://comprasbr.com.br');
  assert.ok(ps.filter((p) => p.TIPO === 'E').every((p) => p.SITUACAO === 'Não configurado' || p.SITUACAO === 'Aguardando documentação'));
  assert.ok(ps.every((p) => /^https:\/\//.test(p.URL)));
  assert.equal(ps.filter((p) => p.LIGADO === 'SIM').length, 2);
  portal(a, 'PUB-004').OBS = 'anotação da Diretoria';
  assert.equal(a.ctx.Lic_garantirPortais_(), 0);
  assert.equal(a.tabelas.LIC_PORTAIS.length, 33);
  assert.equal(portal(a, 'PUB-004').OBS, 'anotação da Diretoria');
});

test('parametrizar com merge: só o campo enviado muda, versão + 1, motivo obrigatório, histórico de → para e o servidor recebe a configuração', () => {
  const a = ambiente();
  let r = a.api('s_dora', 'portalSalvar', { codigo: 'PUB-001', campos: { positivas: 'gasometria, aferição' }, motivo: 'Incluir termos pedidos pela Diretoria' });
  assert.equal(r.ok, true, r.message);
  r = a.api('s_dora', 'portalSalvar', { codigo: 'PUB-001', campos: { ufs: 'go, df' }, motivo: 'Teste com prioridade regional' });
  assert.equal(r.ok, true, r.message);
  const p = portal(a, 'PUB-001');
  assert.equal(p.UFS, 'GO, DF');
  assert.equal(p.PALAVRAS_POSITIVAS, 'gasometria, aferição', 'campo não enviado continua como estava');
  assert.equal(p.VERSAO, 3);
  assert.equal(p.ATUALIZADO_POR_NOME, 'DORA DIRETORA TESTE');
  const h = a.hist('PARAMETRO').filter((x) => x.CODIGO === 'PUB-001');
  assert.deepEqual(h.map((x) => [x.DE, x.PARA, x.VERSAO]), [['', 'gasometria, aferição', '2'], ['', 'GO, DF', '3']]);
  assert.ok(h.every((x) => /^[0-9a-f]{64}$/.test(x.HASH) && x.USUARIO_NOME === 'DORA DIRETORA TESTE' && x.DATA));
  const cfg = JSON.parse(a.props.LIC_CFG_COLETOR);
  assert.deepEqual(cfg.portais['PUB-001'], { ligado: true, frequenciaMin: 120, positivas: ['gasometria', 'aferição'], negativas: [], ufs: ['GO', 'DF'], valorMinimo: 0 });
  assert.equal(cfg.porte, 'EPP');
  assert.equal(a.props.LIC_COLETOR_LIGADO, undefined, 'sem versão das regras do radar, a chave geral não é mexida');
  // mesmos valores: nada muda, nenhuma versão nova
  r = a.api('s_dora', 'portalSalvar', { codigo: 'PUB-001', campos: { ufs: 'GO, DF' }, motivo: 'Conferência sem mudança' });
  assert.equal(r.semMudanca, true);
  assert.equal(portal(a, 'PUB-001').VERSAO, 3);
});

test('parametrizar: recusas dizem o quê, por quê e o que fazer, sem gravar nada', () => {
  const a = ambiente({ props: { LIC_PCP_PUBLICKEY: 'valor-secreto-da-chave-123' } });
  const tentar = (cod, campos, motivo) => a.api('s_dora', 'portalSalvar', { codigo: cod, campos, motivo: motivo === undefined ? 'Motivo de teste' : motivo });
  assert.match(tentar('PUB-001', { ufs: 'GO' }, '').message, /Escreva o motivo da mudança/);
  assert.match(tentar('PUB-001', { ufs: 'GO, XX' }).message, /Não reconhecidas: XX/);
  assert.match(tentar('PUB-004', { ligado: true }).message, /tipo E .*não tem API para coleta automática.*Nada foi alterado/);
  assert.match(tentar('PUB-003', { credencialRef: 'valor-secreto-da-chave-123' }).message, /NOME da chave.*nunca o valor/);
  assert.match(tentar('PUB-001', { situacao: 'Operacional' }).message, /teste de conexão real bem-sucedido antes/);
  assert.match(tentar('PUB-001', { responsavelId: 'u_com' }).message, /Diretoria ou Administrador ativos/);
  assert.match(tentar('PUB-001', { frequenciaMin: 5 }).message, /Escolha a frequência/);
  assert.match(tentar('PUB-001', { valorMinimo: 'abc' }).message, /valor mínimo em reais/);
  assert.equal(portal(a, 'PUB-001').VERSAO, 1);
  assert.equal(a.hist('PARAMETRO').length, 0);
  // credencial por referência: a tela sabe que a chave existe, mas o valor nunca sai do servidor
  const r = a.api('s_dora', 'portais');
  const pcp = r.portais.find((x) => x.codigo === 'PUB-003');
  assert.equal(pcp.credencialRef, 'LIC_PCP_PUBLICKEY');
  assert.equal(pcp.credencialExiste, true);
  assert.doesNotMatch(JSON.stringify(r), /valor-secreto-da-chave-123/);
  assert.equal(tentar('PUB-001', { responsavelId: 'u_dir', valorMinimo: '5.000,50', frequenciaMin: 240 }).ok, true);
  assert.equal(portal(a, 'PUB-001').RESPONSAVEL_NOME, 'DORA DIRETORA TESTE');
  assert.equal(portal(a, 'PUB-001').VALOR_MINIMO, 5000.5);
});

test('teste de conexão real (pelo servidor): sucesso marca "Operacional" e registra; falha marca "Falha"; portal sem API não testa', () => {
  const a = ambiente();
  let r = a.api('s_admin', 'portalTestar', { codigo: 'PUB-001' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(a.coletor.testes, ['PUB-001']);
  assert.equal(portal(a, 'PUB-001').SITUACAO, 'Operacional');
  assert.match(portal(a, 'PUB-001').ULTIMO_TESTE_RESULTADO, /^OK · HTTP 200 · 430 ms · 17727 registros na fonte/);
  assert.equal(a.hist('TESTE_CONEXAO')[0].PARA, 'Operacional');
  assert.match(a.api('s_admin', 'portalTestar', { codigo: 'PUB-004' }).message, /só o PNCP e o Compras.gov.br têm API configurada/);
  const b = ambiente({ testeFalha: true });
  b.api('s_dora', 'portalTestar', { codigo: 'PUB-002' });
  assert.equal(portal(b, 'PUB-002').SITUACAO, 'Em teste', 'falha não promove');
  assert.match(portal(b, 'PUB-002').ULTIMO_TESTE_RESULTADO, /^FALHA · HTTP 503/);
  const c = ambiente({ semColetor: true });
  assert.match(c.api('s_dora', 'portalTestar', { codigo: 'PUB-001' }).message, /roda só no servidor próprio/);
});

test('sincronização: candidata e travada entram no radar, descartada pela regra entra descartada; repetir não duplica; histórico com versão, fonte e hash', () => {
  const a = ambiente();
  a.coletor.itens = [item('PNCP:' + IMBEL.numeroControlePncp, 1, IMBEL, TRI_IMBEL), item('PNCP:' + ANSN.numeroControlePncp, 1, ANSN, TRI_ANSN), item('PNCP:' + CAJAMAR.numeroControlePncp, 1, CAJAMAR, TRI_CAJAMAR)];
  const s1 = a.ctx.Lic_aposColeta_({ novas: 3 });
  assert.equal(s1.novas, 3);
  const im = op(a, IMBEL.numeroControlePncp), an = op(a, ANSN.numeroControlePncp), ca = op(a, CAJAMAR.numeroControlePncp);
  assert.deepEqual([im.SITUACAO, an.SITUACAO, ca.SITUACAO], ['RADAR', 'RADAR', 'DESCARTADA']);
  assert.deepEqual([im.TRIAGEM, an.TRIAGEM, ca.TRIAGEM], ['CANDIDATA', 'TRAVADA', 'DESCARTADA']);
  assert.match(im.CODIGO, /^LIC-\d{4}-0001$/);
  assert.equal(ca.DESCARTE_ORIGEM, 'REGRA');
  assert.equal(ca.DESCARTE_POR_NOME, 'Regra do radar');
  assert.equal(im.ORGAO_CNPJ, '00444232000139');
  assert.equal(im.FUSO_PRESUMIDO, 'SIM');
  assert.equal(im.PORTAL_SESSAO, 'PUB-002');
  const h = a.hist('ENTROU_NO_RADAR').find((x) => x.ENTIDADE_ID === im.ID);
  assert.equal(h.HASH, a.coletor.itens[0].hash, 'o hash do histórico é o da versão da fonte');
  assert.equal(h.VERSAO, '1');
  assert.match(h.FONTE, /^PNCP publicacao/);
  assert.match(h.TEXTO, /Trecho: "…em Inspeção de Segurança, NR-13/);
  assert.equal(a.hist('DESCARTADA_PELA_REGRA').length, 1);
  assert.ok(JSON.parse(a.props.LIC_ULTIMA_COLETA).sincronia.ok);
  // de novo (com o "desde" e mesmo forçando a releitura): nada novo
  const n = a.tabelas.LIC_HISTORICO.length;
  a.ctx.Lic_sincronizar_(null);
  delete a.props.LIC_SYNC_DESDE;
  const s3 = a.ctx.Lic_sincronizar_(null);
  assert.equal(s3.novas, 0);
  assert.equal(a.tabelas.LIC_OPORTUNIDADES.length, 3);
  assert.equal(a.tabelas.LIC_HISTORICO.length, n);
});

test('retificação na fonte: campos da fonte acompanham a versão nova e o histórico diz o que mudou; triagem refeita não desfaz decisão da Diretoria', () => {
  const a = ambiente();
  a.coletor.itens = [item('PNCP:' + IMBEL.numeroControlePncp, 1, IMBEL, TRI_IMBEL), item('PNCP:' + CAJAMAR.numeroControlePncp, 1, CAJAMAR, TRI_CAJAMAR), item('PNCP:' + ANSN.numeroControlePncp, 1, ANSN, TRI_ANSN)];
  a.ctx.Lic_sincronizar_(null);
  const im = op(a, IMBEL.numeroControlePncp), an = op(a, ANSN.numeroControlePncp);
  // a Diretoria descarta a ANSN (RBC) com motivo
  assert.equal(a.api('s_dora', 'descartar', { id: an.ID, motivo: 'Exige laboratório da RBC para massa' }).ok, true);
  // versão 2 da IMBEL (prazo prorrogado) e regras novas: Cajamar deixa de ser descartada, ANSN passa a candidata
  const imbel2 = Object.assign({}, IMBEL, { encerramentoTexto: '2026-11-20T08:00:00', encerramentoEm: '2026-11-20T11:00:00.000Z', atualizacaoGlobalTexto: '2026-10-25T10:00:00' });
  a.coletor.itens = [item('PNCP:' + IMBEL.numeroControlePncp, 2, imbel2, TRI_IMBEL),
    item('PNCP:' + CAJAMAR.numeroControlePncp, 1, CAJAMAR, Object.assign({}, TRI_CAJAMAR, { resultado: 'CANDIDATA', motivo: 'Termo de interesse: esterilização (no objeto).', regra: 'termo_interesse' }), { alteradoEm: '2026-11-01T23:00:00.000Z' }),
    item('PNCP:' + ANSN.numeroControlePncp, 1, ANSN, Object.assign({}, TRI_ANSN, { resultado: 'CANDIDATA', motivo: 'Termo de interesse: calibração (no objeto).' }), { alteradoEm: '2026-11-01T23:00:01.000Z' })];
  const s = a.ctx.Lic_sincronizar_(null);
  assert.equal(s.retificadas, 1);
  assert.equal(im.ENCERRAMENTO_PROPOSTAS, '2026-11-20T08:00:00');
  assert.equal(im.VERSAO_FONTE, 2);
  assert.ok(im.RETIFICADA_EM);
  const v = a.hist('VERSAO_DA_FONTE')[0];
  assert.equal(v.DE, 'versão 1'); assert.equal(v.PARA, 'versão 2');
  assert.match(v.TEXTO, /Encerramento das propostas: "2026-11-13T08:00:00" → "2026-11-20T08:00:00"/);
  assert.equal(v.HASH, a.coletor.itens[0].hash);
  assert.equal(op(a, CAJAMAR.numeroControlePncp).SITUACAO, 'RADAR', 'descartada pela regra volta quando a regra muda');
  assert.equal(an.SITUACAO, 'DESCARTADA', 'o descarte da Diretoria não é desfeito pela regra');
  assert.equal(an.TRIAGEM, 'CANDIDATA');
  assert.equal(an.DESCARTE_ORIGEM, 'PESSOA');
  assert.ok(a.hist('TRIAGEM').some((h) => h.ENTIDADE_ID === an.ID && h.DE === 'TRAVADA' && h.PARA === 'CANDIDATA'));
});

test('revisão: reaberta pela Diretoria não é descartada de novo pela regra; link que não é http/https não é gravado', () => {
  const a = ambiente();
  a.coletor.itens = [item('PNCP:' + CAJAMAR.numeroControlePncp, 1, Object.assign({}, CAJAMAR, { linkSistemaOrigem: 'javascript:alert(1)', linkPncp: 'https://pncp.gov.br/app/editais/46523023000181/2026/171' }), TRI_CAJAMAR)];
  a.ctx.Lic_sincronizar_(null);
  const ca = op(a, CAJAMAR.numeroControlePncp);
  assert.equal(ca.SITUACAO, 'DESCARTADA');
  assert.equal(ca.LINK_ORIGEM, '', 'javascript: não vira link');
  assert.equal(ca.LINK_PNCP, 'https://pncp.gov.br/app/editais/46523023000181/2026/171');
  assert.equal(a.api('s_dora', 'reabrir', { id: ca.ID, motivo: 'O edital inclui qualificação da autoclave do centro cirúrgico' }).ok, true);
  assert.equal(ca.DESCARTE_ORIGEM, 'REABERTA');
  // regras novas (outro motivo de descarte): a regra não desfaz a reabertura; a triagem nova fica no histórico
  a.coletor.itens = [item('PNCP:' + CAJAMAR.numeroControlePncp, 1, CAJAMAR, Object.assign({}, TRI_CAJAMAR, { motivo: 'Descartada pela regra: prazo vencido.', regra: 'prazo_vencido', versao: '2026-11-01.2:def' }), { alteradoEm: '2026-11-02T10:00:00.000Z' })];
  const s = a.ctx.Lic_sincronizar_(null);
  assert.equal(s.triagemMudou, 1);
  assert.equal(s.situacaoMudou, 0);
  assert.equal(ca.SITUACAO, 'RADAR', 'decisão da Diretoria (reabrir) não é desfeita pela regra');
  assert.equal(ca.TRIAGEM_REGRA, 'prazo_vencido');
  assert.ok(a.hist('TRIAGEM').some((h) => h.ENTIDADE_ID === ca.ID && /prazo vencido/.test(h.TEXTO)));
  // descartar de novo é decisão de pessoa e vale
  assert.equal(a.api('s_dora', 'descartar', { id: ca.ID, motivo: 'Prazo encerrado, não dá para participar' }).ok, true);
  assert.equal(ca.DESCARTE_ORIGEM, 'PESSOA');
});

test('revisão: sincronia por página grava o cursor a cada página e solta a trava entre elas (falha no meio não perde o que já entrou)', () => {
  const a = ambiente();
  const travas = [];
  a.ctx.LockService = { getScriptLock: () => ({ waitLock() { travas.push('pega'); }, releaseLock() { travas.push('solta'); } }) };
  const base = [IMBEL, ANSN, CAJAMAR].map((c, i) => item('PNCP:' + c.numeroControlePncp, 1, c, [TRI_IMBEL, TRI_ANSN, TRI_CAJAMAR][i], { alteradoEm: '2026-11-01T22:00:0' + i + '.000Z' }));
  let chamadas = 0;
  a.ctx.SGO_LICITACOES.listar = (f) => {
    chamadas++;
    if (chamadas === 3) throw new Error('ponte caiu');
    const d = String((f && f.desde) || ''); const resto = base.filter((i) => i.alteradoEm > d), l = resto.slice(0, 1);
    return { itens: l, ate: l.length ? l[0].alteradoEm : d, mais: resto.length > 1 };
  };
  assert.throws(() => a.ctx.Lic_sincronizar_(null), /ponte caiu/);
  assert.equal(a.tabelas.LIC_OPORTUNIDADES.length, 2, 'as duas primeiras páginas ficaram');
  assert.equal(a.props.LIC_SYNC_DESDE, '2026-11-01T22:00:01.000Z', 'cursor gravado na última página concluída');
  assert.deepEqual(travas, ['pega', 'solta', 'pega', 'solta', 'pega', 'solta'], 'uma trava curta por página');
  const s = a.ctx.Lic_sincronizar_(null);
  assert.equal(s.novas, 1);
  assert.equal(a.tabelas.LIC_OPORTUNIDADES.length, 3, 'continua de onde parou, sem duplicar');
  // a tela traz no máximo 5 páginas e avisa que há mais
  const b = ambiente();
  let n = 0;
  b.ctx.SGO_LICITACOES.listar = () => {
    n++;
    const nc = '00000000000000-1-00000' + n + '/2026', em = '2026-11-01T22:00:' + String(n).padStart(2, '0') + '.000Z';
    return { itens: [item('PNCP:' + nc, 1, Object.assign({}, IMBEL, { numeroControlePncp: nc }), TRI_IMBEL, { alteradoEm: em })], ate: em, mais: true };
  };
  const r = b.api('s_dora', 'sincronizar', {});
  assert.equal(r.sincronia.paginas, 5);
  assert.equal(r.sincronia.mais, true);
});

test('ações da Diretoria: descartar exige motivo; enviar para análise; reabrir; situação concorrente é recusada; tudo no histórico', () => {
  const a = ambiente();
  a.coletor.itens = [item('PNCP:' + IMBEL.numeroControlePncp, 1, IMBEL, TRI_IMBEL)];
  a.ctx.Lic_sincronizar_(null);
  const im = op(a, IMBEL.numeroControlePncp);
  let r = a.api('s_dora', 'descartar', { id: im.ID, motivo: 'curto' });
  assert.match(r.message, /pelo menos 10 letras.*Nada foi alterado/);
  assert.equal(im.SITUACAO, 'RADAR');
  r = a.api('s_dora', 'enviarAnalise', { id: im.ID, obs: 'Conferir quantidade e PMTA dos vasos no termo de referência' });
  assert.equal(r.ok, true);
  assert.equal(im.SITUACAO, 'ANALISE');
  assert.equal(im.RESPONSAVEL_NOME, 'DORA DIRETORA TESTE');
  assert.match(a.api('s_admin', 'enviarAnalise', { id: im.ID }).message, /está "Em análise" \(alguém mudou agora há pouco\)/);
  r = a.api('s_admin', 'descartar', { id: im.ID, motivo: 'Vasos fora do escopo da NR-13 atendida' });
  assert.equal(r.ok, true);
  assert.equal(im.DESCARTE_POR_NOME, 'Administrador');
  assert.match(a.api('s_dora', 'reabrir', { id: im.ID, motivo: '' }).message, /pelo menos 10 letras/);
  assert.equal(a.api('s_dora', 'reabrir', { id: im.ID, motivo: 'Edital esclarece que são vasos categoria V' }).situacao, 'RADAR');
  const tipos = a.hist().filter((h) => h.ENTIDADE_ID === im.ID).map((h) => h.TIPO);
  assert.deepEqual(tipos, ['ENTROU_NO_RADAR', 'ENVIADA_PARA_ANALISE', 'DESCARTADA_PELA_DIRETORIA', 'REABERTA']);
  assert.ok(a.hist('DESCARTADA_PELA_DIRETORIA').every((h) => /^[0-9a-f]{64}$/.test(h.HASH) && h.USUARIO_NOME === 'Administrador'));
  assert.match(a.api('s_dora', 'ficha', { id: 'nao-existe' }).message, /não foi encontrada/);
});

test('listas, filtros, ficha básica, Hoje, coletar agora e regras do radar', () => {
  const a = ambiente();
  a.coletor.itens = [item('PNCP:' + IMBEL.numeroControlePncp, 1, IMBEL, TRI_IMBEL), item('PNCP:' + ANSN.numeroControlePncp, 1, ANSN, TRI_ANSN), item('PNCP:' + CAJAMAR.numeroControlePncp, 1, CAJAMAR, TRI_CAJAMAR)];
  a.ctx.Lic_sincronizar_(null);
  let r = a.api('s_dora', 'oportunidades', { aba: 'analisar' });
  assert.deepEqual(r.contagens, { analisar: 1, travadas: 1, analise: 0, descartadas: 1 });
  assert.equal(r.lista[0].numeroControle, IMBEL.numeroControlePncp);
  assert.equal(r.lista[0].sessao, 'Compras.gov.br (dados abertos)');
  assert.equal(r.lista[0].termo, 'NR-13');
  assert.equal(a.api('s_dora', 'oportunidades', { aba: 'travadas', selo: 'rbc' }).lista.length, 1);
  assert.equal(a.api('s_dora', 'oportunidades', { aba: 'descartadas', uf: 'PRIO' }).lista.length, 0, 'SP não é UF de prioridade');
  assert.equal(a.api('s_dora', 'oportunidades', { aba: 'descartadas', sessao: 'PUB-004' }).lista.length, 1);
  const f = a.api('s_dora', 'ficha', { id: op(a, IMBEL.numeroControlePncp).ID });
  assert.equal(f.ok, true, f.message);
  assert.equal(f.op.versaoHash, a.coletor.itens[0].hash);
  assert.equal(f.fonte.itens[0].tipo, 'Serviço');
  assert.equal(f.historico[0].tipo, 'ENTROU_NO_RADAR');
  const h = a.api('s_dora', 'hoje');
  assert.equal(h.kpis.analisar, 1); assert.equal(h.kpis.travadas, 1);
  assert.equal(h.coletor.ligado, true);
  assert.equal(a.api('s_dora', 'coletarAgora').pedido, true);
  assert.equal(a.coletor.pedidos, 1);
  assert.match(a.api('s_dora', 'radarSalvar', { coletorLigado: true, porte: 'EPP', motivo: '' }).message, /Escreva o motivo/);
  r = a.api('s_dora', 'radarSalvar', { coletorLigado: true, porte: 'EPP', motivo: 'Ligar o coletor para o piloto' });
  assert.equal(r.versao, 1);
  assert.equal(a.props.LIC_COLETOR_LIGADO, '1');
  assert.equal(a.hist('REGRAS_DO_RADAR')[0].PARA, 'coletor ligado, porte EPP');
  r = a.api('s_dora', 'radarSalvar', { coletorLigado: false, porte: 'EPP', motivo: 'Pausa pedida pela Diretoria' });
  assert.equal(a.props.LIC_COLETOR_LIGADO, '0');
  assert.equal(a.api('s_dora', 'radarSalvar', { coletorLigado: false, porte: 'EPP', motivo: 'Sem mudança' }).semMudanca, true);
  // fora do servidor próprio: a tela diz o porquê, sem quebrar
  const g = ambiente({ semColetor: true });
  assert.match(g.api('s_dora', 'sincronizar').sincronia.motivo, /roda só no servidor próprio/);
  assert.equal(g.api('s_dora', 'hoje').coletor.noServidor, false);
});

// ---------------- telas (estrutura, computador e celular de 390 px) ----------------
function tela(o) {
  o = o || {};
  const html = fs.readFileSync(path.join(pasta, 'JS_Licitacoes.html'), 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('menu-secao-licitacoes'); el('licCorpo');
  const chamadas = [];
  const ctx = vm.createContext({
    console, window: {}, setTimeout, USER_CONTEXT: { perfil: o.perfil || 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push(acao); if (o.respostas && o.respostas[acao]) ok(Object.assign({ ok: true }, o.respostas[acao])); } }; } }; } } } }
  });
  vm.runInContext(script, ctx);
  return { ctx, els, chamadas, html };
}
const CARTAO = { id: 'id1', codigo: 'LIC-2026-0001', orgao: 'INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL', municipio: 'Magé', uf: 'RJ', modalidade: 'Pregão - Eletrônico', modo: 'Aberto', srp: 'SIM', sessao: 'Compras.gov.br (dados abertos)', sessaoCodigo: 'PUB-002',
  objeto: IMBEL.objeto, termo: 'NR-13', valor: 100553.73, encerramento: '2026-11-13T08:00:00', encerramentoIso: '2026-11-13T11:00:00.000Z', fusoPresumido: true, numeroControle: IMBEL.numeroControlePncp, triagem: 'CANDIDATA',
  motivo: TRI_IMBEL.motivo, trecho: TRI_IMBEL.trecho, fonteTrecho: 'objeto', selos: TRI_IMBEL.selos, pendencias: ['Quantidade, categoria e PMTA dos vasos: ler o termo de referência'], prioridade: 6, situacao: 'RADAR', situacaoNome: 'No radar',
  linkOrigem: IMBEL.linkSistemaOrigem, linkPncp: IMBEL.linkPncp, versao: 2, lei: '13303' };

test('telas: menu e casca no computador e no celular (390 px), cartão no padrão do protótipo, links em nova aba, tabelas viram cartões', () => {
  const pc = tela({ respostas: { acesso: { nivel: 'GESTAO' } } });
  pc.ctx.Licitacoes_iniciar_();
  assert.equal(pc.els['menu-secao-licitacoes'].style.display, '', 'Diretoria vê o grupo');
  const rh = tela({ perfil: 'RH' });
  rh.ctx.Licitacoes_iniciar_();
  assert.equal(rh.els['menu-secao-licitacoes'].style.display, 'none');
  assert.deepEqual(rh.chamadas, [], 'RH nem pergunta ao servidor');
  const com = tela({ perfil: 'COMERCIAL', respostas: { acesso: { nivel: 'NENHUM' } } });
  com.ctx.Licitacoes_iniciar_();
  assert.equal(com.els['menu-secao-licitacoes'].style.display, 'none', 'o servidor decide: sem nível, sem menu');

  const cel = tela({ celular: true, respostas: { acesso: { nivel: 'GESTAO' } } });
  cel.ctx.Licitacoes_iniciar_();
  cel.ctx.Licitacoes_render_('licitacoes_oportunidades');
  const h = cel.els.conteudo.innerHTML;
  assert.match(h, /<nav class="cm-nav-mob" aria-label="Seções de Licitações">/);
  for (const r of ['Hoje', 'Oportunidades', 'Portais e configurações']) assert.match(h, new RegExp('>' + r + '</button>'));
  assert.match(h, /cm-nav-mob-btn ativo" aria-current="page" data-lic-nav="licitacoes_oportunidades"/);
  pc.ctx.Licitacoes_render_('licitacoes');
  assert.doesNotMatch(pc.els.conteudo.innerHTML, /cm-nav-mob/, 'computador sem a barra do celular');
  // "Abrir ficha" em Hoje leva direto à ficha na tela Oportunidades (um pedido só, sem cair na lista)
  const fh = tela({ respostas: { acesso: { nivel: 'GESTAO' } } });
  fh.ctx.Licitacoes_iniciar_();
  vm.runInContext('LIC.abrirFicha = "id1";', fh.ctx);
  fh.ctx.Licitacoes_render_('licitacoes_oportunidades');
  assert.deepEqual(fh.chamadas, ['acesso', 'ficha']);
  assert.equal(vm.runInContext('LIC.abrirFicha', fh.ctx), '');
  assert.match(pc.els.conteudo.innerHTML, /<h2 class="content-title">Hoje em Licitações<\/h2>/);

  const c = pc.ctx.Lic_cartaoHtml_(CARTAO);
  assert.match(c, /<article class="cm-card p3 lic-op"/);
  assert.match(c, /<div class="lic-nota media" aria-label="UF RJ, prioridade 6 de 8, No radar"><b>RJ<\/b><span>radar<\/span>/);
  assert.match(c, /<mark>NR-13<\/mark>/);
  assert.match(c, /<blockquote class="lic-trecho">"…em Inspeção de Segurança, NR-13/);
  assert.match(c, /class="lic-motivo pend">PENDENTE: Quantidade/);
  assert.match(c, /cm-selo azul">Lei 13.303\/2016 \(estatal\)/);
  assert.match(c, /cm-selo laranja">Versão 2 da fonte/);
  assert.match(c, /href="https:\/\/cnetmobile[^"]+" target="_blank" rel="noopener noreferrer"[^>]*>Abrir no portal<\/a>/);
  assert.match(c, /href="https:\/\/pncp.gov.br\/app\/editais\/00444232000139\/2026\/1311" target="_blank" rel="noopener noreferrer"[^>]*>Ver no PNCP<\/a>/);
  assert.match(c, /data-lic-analise="id1">Enviar para análise/);
  assert.match(c, /data-lic-descartar="id1">Descartar/);
  assert.match(c, /\(Brasília, presumido\)/);
  const trava = pc.ctx.Lic_cartaoHtml_(Object.assign({}, CARTAO, { triagem: 'TRAVADA', selos: TRI_ANSN.selos }));
  assert.match(trava, /cm-card p1 lic-op/);
  assert.match(trava, /lic-nota trava/);
  assert.match(trava, /cm-selo vermelho">Exige acreditação RBC — não atendemos/);

  const ficha = pc.ctx.Lic_htmlFicha_({ op: Object.assign({}, CARTAO, { versaoHash: 'a'.repeat(64), portalOrigem: 'PNCP (API de consulta)' }), historico: [{ tipo: 'ENTROU_NO_RADAR', quem: 'Coletor', quando: '2026-11-01T22:00:00Z', texto: 'Entrou no radar', versao: 1, fonte: 'PNCP publicacao', hash: 'b'.repeat(64) }],
    fonte: { versoes: [{ versao: 1, motivo: 'PRIMEIRA', hash: 'c'.repeat(64), coletadaEm: '2026-11-01T21:00:00Z', substituidaEm: '', encerramento: '2026-11-13T08:00:00', situacao: 'Divulgada no PNCP' }], itens: [] } }, 'fonte');
  assert.match(ficha, /class="lic-ficha-cab"/);
  assert.match(ficha, /role="tablist" aria-label="Partes da ficha"/);
  assert.match(ficha, /aria-selected="true" data-lic-fab="fonte"/);
  const tds = ficha.match(/<td[^>]*>/g) || [];
  assert.ok(tds.length > 10 && tds.every((t) => /data-r="/.test(t)), 'toda célula com data-r (vira cartão no celular)');
  assert.match(ficha, /Hash da versão \(SHA-256\)/);
  assert.match(pc.ctx.Lic_htmlFicha_({ op: CARTAO, historico: [{ tipo: 'DESCARTADA_PELA_DIRETORIA', quem: 'Dora', quando: '2026-11-01T22:00:00Z', texto: 'x', versao: 1, fonte: 'Tela', hash: 'd'.repeat(64) }] }, 'historico'), /descartada pela diretoria/);

  const portais = pc.ctx.Lic_htmlPortais_({ porTipo: { A: 2, B: 1, C: 7, E: 23 }, coletor: { noServidor: true, ligado: false }, portais: [
    { codigo: 'PUB-001', nome: 'PNCP', categoria: 'PUB', tipo: 'A', tipoNome: 'API pública', situacao: 'Em teste', ligado: true, url: 'https://pncp.gov.br', testavel: true },
    { codigo: 'PUB-004', nome: 'BLL Compras', categoria: 'PUB', tipo: 'E', tipoNome: 'Operação manual assistida', situacao: 'Não configurado', ligado: false, url: 'https://bllcompras.com', testavel: false, alternativo: 'Publicação pelo PNCP' }] }, '');
  assert.match(portais, /href="https:\/\/pncp.gov.br" target="_blank" rel="noopener noreferrer" title="Abre o portal em nova aba">Acessar<\/a>/);
  assert.match(portais, /data-lic-testar="PUB-001">Testar conexão/);
  assert.doesNotMatch(portais, /data-lic-testar="PUB-004"/);
  assert.match(portais, /Coletor <b>desligado<\/b>/);
  assert.match(portais, /<span class="lic-tipo E"/);

  // revisão de 01/11/2026: link vindo do PNCP (dado do órgão) só vai a um href se for http/https
  const mau = pc.ctx.Lic_cartaoHtml_(Object.assign({}, CARTAO, { linkOrigem: 'javascript:alert(document.cookie)', linkPncp: 'data:text/html,<script>x</script>' }));
  assert.doesNotMatch(mau, /javascript:|data:text/i);
  assert.doesNotMatch(mau, />Abrir no portal<|>Ver no PNCP</);
  const fichaMa = pc.ctx.Lic_htmlFicha_({ op: Object.assign({}, CARTAO, { linkOrigem: ' JavaScript:alert(1)', linkPncp: 'https://x/"onmouseover="alert(1)' }), historico: [], fonte: null }, 'fonte');
  assert.doesNotMatch(fichaMa, /href="[^"]*(javascript|onmouseover)/i);
  const portalMau = pc.ctx.Lic_htmlPortais_({ porTipo: {}, portais: [{ codigo: 'SAU-009', nome: 'X', categoria: 'SAU', tipo: 'E', situacao: 'Não configurado', url: 'javascript:alert(1)', testavel: false }] }, '');
  assert.doesNotMatch(portalMau, /javascript:/);
  assert.match(pc.ctx.Lic_motivosHtml_(Object.assign({}, CARTAO, { situacao: 'RADAR', triagem: 'DESCARTADA', descarteOrigem: 'REABERTA', motivo: 'Descartada pela regra: x', pendencias: [] })), /Reaberta pela Diretoria[\s\S]*class="lic-motivo ">Descartada pela regra/);

  // celular de 390 px: nada com largura fixa maior que a tela; ações e cartões quebram linha; toque de 44 px
  const css = pc.html.slice(pc.html.indexOf('<style>'), pc.html.indexOf('</style>'));
  for (const m of pc.html.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.lic-op-acoes \{ grid-column: 1 \/ -1; flex-direction: row; flex-wrap: wrap; min-width: 0; \}/);
  assert.match(css, /\.lic-op-acoes button, \.lic-op-acoes a \{ min-height: 44px;/);
  assert.match(css, /\.lic-ficha-num \{ grid-template-columns: 1fr 1fr; \}/);
  assert.doesNotMatch(pc.html, /setInterval/, 'sem atualização automática (nada redesenha formulário aberto)');
  assert.match(pc.html, /\r\n/, 'JS_*.html em CRLF como os demais');
});

test('integração na casca: menu só da Diretoria, rota, atalho do celular, ajuda das 3 telas, manual do assistente e item da sentinela', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html');
  assert.match(idx, /id="menu-secao-licitacoes" style="display:none;"/);
  for (const m of ['licitacoes', 'licitacoes_oportunidades', 'licitacoes_agenda', 'licitacoes_alertas', 'licitacoes_portais']) assert.match(idx, new RegExp('data-mod="' + m + '"'));
  // etapa 3 (02/11/2026): agenda e alertas; etapa 4 (02/11/2026): Painel, Kanban e Gantt (tests/licitacoes_painel.test.cjs). Disputas ficam para as próximas etapas
  for (const m of ['licitacoes_painel', 'licitacoes_kanban', 'licitacoes_gantt']) assert.match(idx, new RegExp('data-mod="' + m + '"'));
  // Central de disputas, modo assistido (02/11/2026, tests/licitacoes_disputa.test.cjs); contratos ficam para a próxima etapa
  assert.match(idx, /data-mod="licitacoes_disputas"/);
  assert.doesNotMatch(idx, /data-mod="licitacoes_contratos"/, 'contratos ficam para a próxima etapa');
  assert.match(idx, /<\?!= include\('JS_Licitacoes'\); \?>/);
  assert.match(core, /if \(\(mod === "licitacoes" \|\| mod\.indexOf\("licitacoes_"\) === 0\) && typeof Licitacoes_render_ === "function"\)/);
  assert.equal((core.match(/Licitacoes_iniciar_\(\);/g) || []).length, 2);
  assert.match(core, /Licitacoes_parar_\(\);/);
  assert.match(core, /legenda: "Licitações", mod: "licitacoes"/);
  const a = ambiente();
  const telas = a.ctx.SGO_ajudaTelas_Licitacoes_();
  for (const k of ['licitacoes', 'licitacoes_oportunidades', 'licitacoes_portais']) {
    const t = telas[k];
    assert.ok(t && t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length, k);
    assert.ok(a.ctx.SGO_AJUDA_NOMES[k], k);
    const n = a.ctx.SGO_Ajuda_normalizar_(k, t, 'DIRETORIA');
    assert.ok(n.passos.length, k);
  }
  assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_portais);
  const gerador = fs.readFileSync(path.join(__dirname, '../_tools/gerar_base_assistente.cjs'), 'utf8');
  assert.match(gerador, /"MANUAL_MODULO_LICITACOES\.md": \{ tela: "licitacoes", perfis: \["ADMIN", "DIRETORIA"\] \}/);
  assert.match(ler('SGO_AssistenteManuais.js'), /MANUAL_MODULO_LICITACOES/);
  assert.match(ler('SGO_Automacao_Saude.js'), /licitacoes: 'Coletor de licitações \(PNCP e Compras\.gov\.br\)'/);
  // texto do sistema: tom profissional, sem a palavra proibida e sem prometer acreditação
  const textos = ['SGO_Licitacoes.js', 'SGO_Licitacoes_Config.js', 'SGO_Ajuda_Licitacoes.js', 'JS_Licitacoes.html'].map(ler).join('\n') + fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /somos acreditad|Metrolabs é acreditad|laboratório acreditado RBC da Metrolabs/i);
});
