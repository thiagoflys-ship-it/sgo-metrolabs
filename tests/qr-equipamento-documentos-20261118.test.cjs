// 18/11/2026 — Vazamento no QR Code do equipamento (pedido urgente do dono): "Nos equipamentos, quando lemos o QR code aparece 29 POP e
// PGT e mais 3 documentos, para todos os equipamentos repetidos; qualquer QR de equipamento que abre aparece. Nunca, jamais, dado de
// nenhum equipamento pode cruzar com outro: todo equipamento só deve ter e abrir só o que é pertinente a ele. E documentos gerados mais
// de uma vez e repetidos não podem jamais ser vistos: nas pastas do equipamento só pode ser visto o último documento gerado, que é o oficial."
// Causas (output/qr-equipamento-20261118/RELATORIO.md): (1) o prontuário do equipamento juntava o PGT, os POP e os registros operacionais
// da unidade; (2) a chave de versão não tinha o equipamento, e o ensaio "Ciclo 1 de 3" de um equipamento virava "versão anterior" de outro;
// (3) os módulos de ensaio e de revisões marcavam SUBSTITUIDO só pelo número (o POP003 de um cliente substituía o de outro); (4) o mesmo
// certificado gerado várias vezes (números diferentes) aparecia várias vezes; (5) o QR abria a pasta de arquivos achada pelo NOME
// "TAG - TIPO", a mesma para equipamentos com TAG e tipo iguais.
// Código real num vm (SGO_Auth.js, cadastros, SGO_QualifEmissao.js, SGO_QualifEquipamento.js, SGO_DocRevisao.js, SGO_PgtPop_*.js,
// SGO_QRCode.js, SGO_DocumentosPastas.js, Portal do cliente), com planilha e propriedades simuladas. Só dados de teste.
// Falha na cand31 e passa na cand32. Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/qr-equipamento-documentos-20261118.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_usuarios_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const j = (x) => JSON.parse(JSON.stringify(x));
const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 Teste', aparelho: '' };
// dia de Brasília, como o servidor (Docs_hoje_)
const hojeBrasilia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dia = (n) => { const [y, m, d] = hojeBrasilia.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const GES = { ID: 'u-pri', USUARIO: 'priscilla', SENHA: 'Pri2026xyz', NOME: 'PRISCILLA GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'pri@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
const CLIA = { ID: 'u-cla', USUARIO: 'carla', SENHA: 'Cliente2026x', NOME: 'CARLA CLIENTE A TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospital-a.test', CLIENTE_ID: 'cA' };
const CNPJ_A = '11222333000181', CNPJ_A2 = '11222333000262', CNPJ_B = '22333444000172';

function aba(a, nome, cab, linhas) { a.abas.set(nome, { cab: cab.slice(), linhas: (linhas || []).map((o) => cab.map((c) => (o[c] === undefined ? '' : o[c]))) }); }
const blocos = (...t) => JSON.stringify({ blocos: t.map((x) => ({ titulo: x, unidade: 'ºC', quantidadePontos: 3 })) });

function amb() {
  const a = ambiente();
  [ADMIN, GES, TEC, CLIA].forEach((u) => a.add(Object.assign({}, u)));
  a.abas.get('CAD_USUARIOS').cab.push('AREA');
  aba(a, 'CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'RAZAO_SOCIAL', 'CNPJ', 'STATUS'], [
    { ID: 'cA', NOME_FANTASIA: 'HOSPITAL SANTA TESTE', RAZAO_SOCIAL: 'HOSPITAL SANTA TESTE LTDA', CNPJ: CNPJ_A, STATUS: 'ATIVO' },
    { ID: 'cB', NOME_FANTASIA: 'CLINICA B TESTE', RAZAO_SOCIAL: 'CLINICA B LTDA', CNPJ: CNPJ_B, STATUS: 'ATIVO' }]);
  aba(a, 'CAD_UNIDADES', ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'CNPJ_UNIDADE', 'STATUS'], [
    { ID: 'uA1', CLIENTE_ID: 'cA', NOME_UNIDADE: 'MATRIZ', CNPJ_UNIDADE: CNPJ_A, STATUS: 'ATIVO' },
    { ID: 'uA2', CLIENTE_ID: 'cA', NOME_UNIDADE: 'FILIAL', CNPJ_UNIDADE: CNPJ_A2, STATUS: 'ATIVO' },
    { ID: 'uB1', CLIENTE_ID: 'cB', NOME_UNIDADE: 'B UNICA', CNPJ_UNIDADE: CNPJ_B, STATUS: 'ATIVO' }]);
  aba(a, 'CAD_EQUIPAMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TIPO', 'TAG', 'SERIE', 'STATUS'], [
    { ID: 'eA1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'AUTOCLAVE', TAG: 'AC-01', SERIE: 'S1', STATUS: 'ATIVO' },
    { ID: 'eA2', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', TIPO: 'AUTOCLAVE', TAG: 'AC-02', SERIE: 'S2', STATUS: 'ATIVO' },
    { ID: 'eA3', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', TIPO: 'TERMOMETRO', TAG: 'N/P', STATUS: 'ATIVO' },
    { ID: 'eA4', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA2', TIPO: 'TERMOMETRO', TAG: 'N/P', STATUS: 'ATIVO' },
    { ID: 'eB1', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', TIPO: 'AUTOCLAVE', TAG: 'AC-01', STATUS: 'ATIVO' }]);
  aba(a, 'DOC_DOCUMENTOS', ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK_ARQUIVO', 'DATA_EMISSAO', 'DATA_VENCIMENTO', 'STATUS', 'CRIADO_EM'], [
    { ID: 'd1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: '', TIPO_DOCUMENTO: 'PGT / POP', NOME_ARQUIVO: 'PGTS MATRIZ.pdf', LINK_ARQUIVO: '/arquivos/pgtMatrizDoc1', STATUS: 'ATIVO', CRIADO_EM: '2026-11-01T10:00:00' }]);
  aba(a, 'CERT_CALIBRACAO', ['ID', 'NUMERO_CERTIFICADO', 'CLIENTE_ID', 'EQUIPAMENTO_ID', 'DATA_CALIBRACAO', 'DATA_EMISSAO', 'DATA_VALIDADE', 'DADOS_JSON', 'LINK_PDF_CERTIFICADO', 'STATUS', 'CRIADO_EM'], [
    // o mesmo certificado do termômetro N/P (eA3) gerado 3 vezes em 10 minutos (o caso real do TER-5: 202600269 a 202600273)
    { ID: 'c269', NUMERO_CERTIFICADO: '202600269', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA3', DATA_CALIBRACAO: '13/10/2026', DATA_EMISSAO: '13/10/2026', DATA_VALIDADE: dia(200), DADOS_JSON: blocos('Sensor Externo'), LINK_PDF_CERTIFICADO: '/arquivos/cert269aaaa', STATUS: 'ATIVO', CRIADO_EM: '2026-10-13T18:12:42.151Z' },
    { ID: 'c270', NUMERO_CERTIFICADO: '202600270', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA3', DATA_CALIBRACAO: '13/10/2026', DATA_EMISSAO: '13/10/2026', DATA_VALIDADE: dia(200), DADOS_JSON: blocos('Sensor Externo'), LINK_PDF_CERTIFICADO: '/arquivos/cert270aaaa', STATUS: 'ATIVO', CRIADO_EM: '2026-10-13T18:14:19.223Z' },
    { ID: 'c273', NUMERO_CERTIFICADO: '202600273', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA3', DATA_CALIBRACAO: '13/10/2026', DATA_EMISSAO: '13/10/2026', DATA_VALIDADE: dia(200), DADOS_JSON: blocos('Sensor Externo'), LINK_PDF_CERTIFICADO: '/arquivos/cert273aaaa', STATUS: 'ATIVO', CRIADO_EM: '2026-10-13T18:22:40.702Z' },
    // a autoclave AC-01 tem dois instrumentos calibrados no mesmo dia: são dois certificados (não é repetição)
    { ID: 'cm1', NUMERO_CERTIFICADO: '202600003', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA1', DATA_CALIBRACAO: '22/08/2026', DATA_EMISSAO: '22/08/2026', DATA_VALIDADE: dia(100), DADOS_JSON: blocos('MANOMETRO CAMARA INTERNA'), LINK_PDF_CERTIFICADO: '/arquivos/certManInt01', STATUS: 'ATIVO', CRIADO_EM: '2026-08-22T23:09:00Z' },
    { ID: 'cm2', NUMERO_CERTIFICADO: '202600007', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA1', DATA_CALIBRACAO: '22/08/2026', DATA_EMISSAO: '22/08/2026', DATA_VALIDADE: dia(100), DADOS_JSON: blocos('MANOMETRO GERADORA DE VAPOR'), LINK_PDF_CERTIFICADO: '/arquivos/certManGer01', STATUS: 'ATIVO', CRIADO_EM: '2026-08-23T00:06:00Z' },
    // o termômetro eA4 tem a mesma TAG e o mesmo tipo do eA3: o certificado dele é só dele
    { ID: 'c4', NUMERO_CERTIFICADO: '202600300', CLIENTE_ID: 'cA', EQUIPAMENTO_ID: 'eA4', DATA_CALIBRACAO: '13/10/2026', DATA_EMISSAO: '13/10/2026', DATA_VALIDADE: dia(200), DADOS_JSON: blocos('Sensor Externo'), LINK_PDF_CERTIFICADO: '/arquivos/certEa4aaaaa', STATUS: 'ATIVO', CRIADO_EM: '2026-10-13T19:00:00Z' }]);
  for (const f of ['SGO_PortalCliente_Config.js', 'SGO_PortalCliente_Contratos.js', 'SGO_PortalCliente_Seguranca.js', 'SGO_PortalCliente.js', 'SGO_Equipamentos.js', 'SGO_Documentos.js',
    'SGO_Unidades.js', 'SGO_Clientes.js', 'SGO_CadastrosPainel.js', 'SGO_QualifEmissao.js', 'SGO_QualifEquipamento.js', 'SGO_DocRevisao.js', 'SGO_PgtPop_Config.js', 'SGO_PgtPop_Main.js',
    'SGO_EnviarDoc.js', 'SGO_QRCode.js', 'SGO_DocumentosPastas.js', 'SGO_PortalCliente_Acessos.js', 'SGO_PortalCliente_Documentos.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  a.ctx.SGO_CFG.SHEETS.CAD_UNIDADES = 'CAD_UNIDADES';
  a.ctx.SGO_CFG.SHEETS.CAD_EQUIPAMENTOS = 'CAD_EQUIPAMENTOS';
  a.ctx.SGO_CFG.SHEETS.DOC_DOCUMENTOS = 'DOC_DOCUMENTOS';
  a.ctx.SGO_CFG.SHEETS.CERT_CALIBRACAO = 'CERT_CALIBRACAO';
  a.ctx.SGO_DATA.getByField = () => null;
  a.ctx.SGO_DATA.log = () => true;
  a.ctx.Session = { getScriptTimeZone: () => 'America/Sao_Paulo' };
  // Ensaios da autoclave (QUALIF_EMISSOES). O número "Ciclo 1 de 3 - Sem Carga" é o mesmo nos dois equipamentos: o módulo marcou o do
  // AC-01 como SUBSTITUIDO quando o AC-02 emitiu o dele (marcação só pelo número). O AC-01 também tem o "Ciclo 2" gerado duas vezes,
  // com espaços diferentes no número ("Ciclo 2  de 3" e "Ciclo 2 de 3").
  aba(a, 'QUALIF_EMISSOES', a.ctx.SGO_QE_CAMPOS, [
    { ID: 'q1', MODULO: 'AUTOCLAVE', STATUS: 'SUBSTITUIDO', NUMERO: 'Ciclo 1 de 3 - Sem Carga', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', CNPJ: CNPJ_A, APROVADO_EM: '2026-10-27T10:00:00', PDF_ID: 'ensC1ac01', VALIDADE_ATE: '' },
    { ID: 'q2', MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'Ciclo 1 de 3 - Sem Carga', REVISAO: '1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA2', CNPJ: CNPJ_A, APROVADO_EM: '2026-10-28T10:00:00', PDF_ID: 'ensC1ac02', VALIDADE_ATE: '' },
    { ID: 'q3', MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'Ciclo 2  de 3 - Sem  Carga', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', CNPJ: CNPJ_A, APROVADO_EM: '2026-10-27T11:00:00', PDF_ID: 'ensC2ac01v', VALIDADE_ATE: '' },
    { ID: 'q4', MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'Ciclo 2 de 3 - Sem Carga', REVISAO: '0', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA1', CNPJ: CNPJ_A, APROVADO_EM: '2026-10-27T15:00:00', PDF_ID: 'ensC2ac01n', VALIDADE_ATE: '' },
    { ID: 'q5', MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'Ciclo 1 de 3 - Sem Carga', REVISAO: '0', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB1', EQUIPAMENTO_ID: 'eB1', CNPJ: CNPJ_B, APROVADO_EM: '2026-10-20T10:00:00', PDF_ID: 'ensC1doB1', VALIDADE_ATE: '' }]);
  // PGT/POP do cliente A (unidade matriz, pelo CNPJ) e do cliente B. O POP003 do A ficou SUBSTITUIDO quando o B emitiu o POP003 dele.
  aba(a, 'DOC_REVISOES', a.ctx.SGO_DOCREV_CAMPOS, [
    { ID: 'v1', MODULO: 'PGT_POP', NUMERO: 'PGTS', REVISAO: '0', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-15T09:00:00', TITULO: 'PGT - Plano de Gerenciamento', CNPJ: CNPJ_A, PDF_ID: 'pgtsDoA0001' },
    { ID: 'v2', MODULO: 'PGT_POP', NUMERO: 'POP003', REVISAO: '0', STATUS: 'SUBSTITUIDO', EMITIDO_EM: '2026-11-15T09:10:00', TITULO: 'POP003 - Inventário', CNPJ: CNPJ_A, PDF_ID: 'pop003DoA01' },
    { ID: 'v3', MODULO: 'PGT_POP', NUMERO: 'POP003', REVISAO: '1', STATUS: 'EMITIDO', EMITIDO_EM: '2026-11-16T09:10:00', TITULO: 'POP003 - Inventário', CNPJ: CNPJ_B, PDF_ID: 'pop003DoB01' }]);
  a.props.set('PGTPOP_SUSPENSO_ANTES_DE', '');
  const s = (u) => { const r = a.ctx.login(u.EMAIL, u.SENHA, CTX); assert.equal(r.success, true, u.EMAIL + ': ' + r.message); return r.sessionId; };
  a.sAdm = s(ADMIN); a.sGes = s(GES); a.sTec = s(TEC); a.sA = s(CLIA);
  a.docs = (sid, escopo, id, via) => { const r = j(a.ctx.documentosPastas(sid, { escopo, id, via })); assert.equal(r.success, true, r.message); return r; };
  a.itens = (r) => r.pastas.flatMap((p) => p.itens);
  a.todos = (r) => r.pastas.flatMap((p) => p.itens.flatMap((i) => [i].concat(i.anteriores || [])));
  return a;
}

test('QR do equipamento: só o que tem o ID dele — nada de PGT, POP ou registro da unidade, nada de outro equipamento (equipe e cliente)', () => {
  const a = amb();
  for (const [sid, quem] of [[a.sTec, 'técnico'], [a.sGes, 'gestor'], [a.sA, 'cliente']]) {
    for (const eq of ['eA1', 'eA2', 'eA3', 'eA4']) {
      const r = a.docs(sid, 'equipamento', eq, 'qr');
      const txt = JSON.stringify(r);
      for (const proibido of ['pgtsDoA0001', 'pop003DoA01', 'pop003DoB01', 'pgtMatrizDoc1', 'PGTS MATRIZ']) assert.ok(!txt.includes(proibido), quem + ' / ' + eq + ': documento da unidade no equipamento (' + proibido + ')');
      assert.ok(!r.pastas.some((p) => p.id === 'PGT_POP' || p.id === 'REGISTROS'), quem + ' / ' + eq + ': pasta da unidade no equipamento');
      assert.ok(a.todos(r).every((i) => i.equipamentoId === eq), quem + ' / ' + eq + ': documento de outro equipamento: ' + a.todos(r).filter((i) => i.equipamentoId !== eq).map((i) => i.titulo).join(' | '));
    }
  }
  // AC-01 e AC-02 têm o mesmo número de ensaio ("Ciclo 1 de 3 - Sem Carga"): cada um vê o seu, e o do AC-01 é o vigente dele
  const r1 = a.docs(a.sA, 'equipamento', 'eA1', 'qr'), r2 = a.docs(a.sA, 'equipamento', 'eA2', 'qr');
  const c1 = a.itens(r1).find((i) => /Ciclo 1 de 3/.test(i.titulo)), c2 = a.itens(r2).find((i) => /Ciclo 1 de 3/.test(i.titulo));
  assert.ok(c1 && c2, 'cada autoclave mostra o próprio ensaio');
  assert.equal(c1.situacao, 'VIGENTE', 'o ensaio do AC-01 não foi substituído por nada do AC-01 (a marca era do AC-02)');
  assert.equal(c1.url, '/arquivos/ensC1ac01'); assert.equal(c2.url, '/arquivos/ensC1ac02');
  // os dois termômetros com a mesma TAG e o mesmo tipo: cada um com o seu certificado
  assert.deepEqual(a.itens(a.docs(a.sA, 'equipamento', 'eA4', 'qr')).map((i) => i.numero), ['202600300']);
  // o PGT e os POP continuam na pasta da unidade e na do cliente
  const un = a.docs(a.sA, 'unidade', 'uA1', 'portal');
  assert.ok(JSON.stringify(un).includes('PGT - Plano de Gerenciamento'));
  assert.ok(!JSON.stringify(a.docs(a.sA, 'unidade', 'uA2', 'portal')).includes('PGT - Plano'), 'o PGT da matriz não vai para a filial');
});

test('documento gerado mais de uma vez: no QR, na ficha de quem não é Admin/Diretoria e no Portal só o último; Admin vê os substituídos', () => {
  const a = amb();
  // certificado do termômetro gerado 3 vezes: só o 202600273 (o último gerado)
  for (const [sid, via] of [[a.sA, 'qr'], [a.sTec, 'qr'], [a.sGes, 'ficha'], [a.sA, 'portal']]) {
    const r = a.docs(sid, 'equipamento', 'eA3', via);
    assert.deepEqual(a.todos(r).map((i) => i.numero), ['202600273'], via + ': só o último gerado');
  }
  // os dois instrumentos da autoclave calibrados no mesmo dia continuam dois certificados
  const cal = a.itens(a.docs(a.sA, 'equipamento', 'eA1', 'qr')).filter((i) => i.pasta === 'CALIBRACAO').map((i) => i.numero).sort();
  assert.deepEqual(cal, ['202600003', '202600007']);
  // "Ciclo 2  de 3" e "Ciclo 2 de 3" do AC-01 são o mesmo ensaio gerado de novo: só o mais novo
  const c2 = a.itens(a.docs(a.sA, 'equipamento', 'eA1', 'qr')).filter((i) => /Ciclo 2/.test(i.titulo));
  assert.equal(c2.length, 1); assert.equal(c2[0].url, '/arquivos/ensC2ac01n');
  // Gestor: só o oficial, com o aviso de quantos ficaram fora; Admin: o oficial com os substituídos guardados embaixo
  const g = a.docs(a.sGes, 'equipamento', 'eA3', 'ficha');
  assert.equal(g.substituidosOcultos, 2);
  const ad = a.docs(a.sAdm, 'equipamento', 'eA3', 'ficha');
  const of = a.itens(ad).find((i) => i.numero === '202600273');
  assert.deepEqual(of.anteriores.map((x) => x.numero), ['202600270', '202600269']);
  assert.ok(of.anteriores.every((x) => x.situacao === 'SUBSTITUIDO' && x.equipamentoId === 'eA3'));
  // nada se perde: o Admin vê todos os arquivos do cliente A (oficiais e substituídos) e nenhum do B
  const ids = a.todos(a.docs(a.sAdm, 'cliente', 'cA', 'ficha')).map((i) => i.arquivoId);
  for (const id of ['cert269aaaa', 'cert270aaaa', 'cert273aaaa', 'certManInt01', 'certManGer01', 'certEa4aaaaa', 'ensC1ac01', 'ensC1ac02', 'ensC2ac01v', 'ensC2ac01n', 'pgtsDoA0001', 'pop003DoA01']) assert.ok(ids.includes(id), 'faltou ' + id);
  assert.ok(!ids.includes('ensC1doB1') && !ids.includes('pop003DoB01'), 'nada do cliente B');
});

test('ficha do cliente: versão anterior nunca é de outro equipamento, de outra unidade ou de outro cliente (chave com o vínculo)', () => {
  const a = amb();
  const r = a.docs(a.sAdm, 'cliente', 'cA', 'ficha');
  for (const it of a.itens(r)) for (const ant of it.anteriores || []) {
    assert.equal(ant.equipamentoId, it.equipamentoId, it.titulo + ' <- ' + ant.titulo);
    assert.equal(ant.unidadeId, it.unidadeId, it.titulo + ' <- ' + ant.titulo);
  }
  // o "Ciclo 1 de 3" do AC-01 e o do AC-02 são dois documentos, cada um no seu equipamento
  const c1 = a.itens(r).filter((i) => /Ciclo 1 de 3/.test(i.titulo)).map((i) => i.equipamentoId).sort();
  assert.deepEqual(c1, ['eA1', 'eA2']);
  // o POP003 do cliente A (marcado SUBSTITUIDO pela emissão do cliente B) é o vigente do A
  const pop = a.itens(r).find((i) => /POP003/.test(i.titulo));
  assert.equal(pop && pop.situacao, 'VIGENTE');
  // a contagem por equipamento soma só o oficial de cada documento
  const det = j(a.ctx.cadastrosDetalhe(a.sGes, 'clientes', 'cA'));
  assert.equal(det.contagemDocs.porEquipamento.eA3, 1, 'o certificado gerado 3 vezes conta uma');
});

test('Portal do cliente (lista de documentos e ficha do equipamento): só o oficial, sem versões anteriores', () => {
  const a = amb();
  const sessao = a.ctx.exigirSessao(a.sA);
  const b = a.ctx.PClD_base_({ cid: 'cA', eu: { sessao: sessao }, esc: { todas: true } });
  const nums = b.docs.map((d) => d.numero);
  assert.ok(nums.includes('202600273'));
  assert.ok(!nums.includes('202600269') && !nums.includes('202600270'), 'certificado repetido fora do Portal');
  assert.ok(b.docs.every((d) => !(d.anteriores || []).length), 'nenhuma versão anterior no Portal');
  assert.ok(b.docs.every((d) => d.situacao !== 'SUBSTITUIDO'));
});

test('gravação: o módulo de ensaios e o de revisões só substituem o documento do MESMO equipamento (ou do mesmo CNPJ)', () => {
  const a = amb();
  // AC-02 emite de novo o "Ciclo 1 de 3 - Sem Carga": o do AC-01 e o do cliente B continuam como estavam
  a.ctx.SGO_QE_registrar_({ ID: 'q9', MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'Ciclo 1 de 3 - Sem Carga', REVISAO: '2', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA1', EQUIPAMENTO_ID: 'eA2', CNPJ: CNPJ_A, APROVADO_EM: '2026-11-18T10:00:00', PDF_ID: 'ensC1ac02r2' });
  a.ctx.SGO_QE_marcarSubstituidas_('AUTOCLAVE', 'Ciclo 1 de 3 - Sem Carga', 'q9');
  const st = (id) => a.ctx.SGO_QE_obter_(id).STATUS;
  assert.equal(st('q2'), 'SUBSTITUIDO', 'a emissão anterior do próprio AC-02 é substituída');
  assert.equal(st('q5'), 'EMITIDO', 'a do cliente B não é tocada');
  assert.equal(st('q9'), 'EMITIDO');
  // revisões (PGT/POP): só o mesmo CNPJ; sem dado para comparar, como antes
  const m = a.ctx.SGO_DocRev_mesmoAlvo_;
  assert.equal(m({ CNPJ: CNPJ_A }, { cnpj: '11.222.333/0001-81' }), true);
  assert.equal(m({ CNPJ: CNPJ_A }, { cnpj: CNPJ_B }), false);
  assert.equal(m({ EQUIPAMENTO_ID: 'eA1', CNPJ: CNPJ_A }, { equipamentoId: 'eA2', cnpj: CNPJ_A }), false);
  assert.equal(m({ CNPJ: '' }, { cnpj: CNPJ_B }), true);
  assert.match(ler('SGO_DocRevisao.js'), /r\.STATUS === 'EMITIDO' && SGO_DocRev_mesmoAlvo_\(r, info\)/);
});

test('QR Code: a pasta de arquivos achada pelo nome "TAG - TIPO" não é mais aberta; a qualificação do QR mostra só o oficial', () => {
  const a = amb();
  const q = j(a.ctx.qrcodeAcessar(a.sA, 'eA3'));
  assert.equal(q.success, true, q.message);
  assert.equal(q.redirectUrl, '', 'sem link da pasta (eA3 e eA4 têm a mesma TAG e o mesmo tipo e cairiam na mesma pasta)');
  const fonte = ler('SGO_QRCode.js');
  const corpo = fonte.slice(fonte.indexOf('function acessarViaQR'), fonte.indexOf('return {', fonte.indexOf('function acessarViaQR')));
  assert.ok(!/obterLinkPastaEquipamento_\(/.test(corpo), 'acessarViaQR não procura a pasta pelo nome');
  // reserva do QR (seção Qualificação): sem versão substituída, também para a equipe
  a.tabelasQe = null;
  const ql = j(a.ctx.qrcodeQualificacao(a.sTec, 'eA1'));
  assert.equal(ql.success, true, ql.message);
  assert.ok(ql.itens.every((i) => i.situacao !== 'SUBSTITUIDO' && i.situacao !== 'MINUTA'));
  const lc = j(a.ctx.qualifEquipamentoListar(a.sA, 'eA2'));
  assert.ok(lc.itens.every((i) => i.situacao !== 'SUBSTITUIDO'), 'a conta de cliente não vê versão substituída');
});

test('telas, ajuda e manual: sem o selo "Da unidade", textos novos justificados, regra explicada na ajuda e no manual', () => {
  const comp = ler('JS_DocumentosPastas.html');
  assert.ok(!/Da unidade: vale para todos os equipamentos/.test(comp));
  assert.match(comp, /só os documentos deste equipamento/);
  assert.match(comp, /Substituídos: gerados antes do oficial/);
  assert.match(comp, /Por quê: versão repetida não pode ser vista/);
  const aj = ler('SGO_Ajuda_Cadastros.js');
  assert.match(aj, /só o último gerado/);
  assert.match(aj, /PGT e os POP são documentos da unidade/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md'), 'utf8');
  assert.match(man, /### Cada equipamento só com o que é dele/);
  assert.match(man, /último gerado/);
  assert.ok(!/antiburro/i.test(comp + aj + man));
});

// 18/11/2026 — pedido do Matheus (extrema urgência): "Colocar um botão de excluir dentro da aba de equipamentos > documentos por pasta:
// dentro de cada pasta, poder excluir um documento cadastrado. Existem documentos cadastrados dentro de alguns clientes que não pertencem
// a eles, e pode nos trazer problemas com fiscalização." Exclusão lógica (DOCP_EXCLUSOES), com motivo; restaurar só Admin e Diretoria.
test('excluir documento da pasta: lógico, com motivo; some do QR, das pastas, do Portal e da trava; Admin/Diretoria veem e restauram', () => {
  const a = amb();
  aba(a, 'DOCP_EXCLUSOES', a.ctx.DOCP_COLUNAS_EXCLUSOES, []);
  const acao = (sid, ac, d) => j(a.ctx.documentosPastasAcao(sid, ac, d));
  const f = a.docs(a.sAdm, 'equipamento', 'eA4', 'ficha');
  assert.equal(f.podeExcluir, true, 'Administrador tem o botão');
  assert.equal(f.veExcluidos, true);
  const cert = a.itens(f).find((i) => i.numero === '202600300');
  assert.ok(cert && cert.kExcl, 'o documento leva a chave da exclusão');
  // conta de cliente e QR Code nunca recebem o botão
  assert.ok(!a.docs(a.sA, 'equipamento', 'eA4', 'qr').podeExcluir);
  assert.ok(!a.docs(a.sTec, 'equipamento', 'eA4', 'qr').podeExcluir);
  assert.ok(!JSON.stringify(a.docs(a.sA, 'equipamento', 'eA4', 'qr')).includes('kExcl'));
  // sem motivo: recusa com o quê, por quê
  const semMotivo = acao(a.sAdm, 'excluir', { k: cert.kExcl, motivo: 'curto' });
  assert.equal(semMotivo.success, false); assert.match(semMotivo.message, /Falta o motivo.*Por quê/);
  // cliente e técnico sem a caixa: recusa
  assert.match(acao(a.sA, 'excluir', { k: cert.kExcl, motivo: 'nao e da minha empresa' }).message, /Acesso negado.*Por quê.*O que fazer/);
  assert.match(acao(a.sTec, 'excluir', { k: cert.kExcl, motivo: 'certificado de outro cliente' }).message, /Acesso negado.*Excluir documento da pasta/);
  const ok = acao(a.sAdm, 'excluir', { k: cert.kExcl, motivo: 'Certificado de outro cliente, registrado por engano' });
  assert.equal(ok.success, true, ok.message); assert.match(ok.message, /Nada foi apagado/);
  // some de tudo: QR (cliente e equipe), ficha do Gestor, ficha do cliente, Portal e a trava de arquivo
  for (const [sid, esc, id, via] of [[a.sA, 'equipamento', 'eA4', 'qr'], [a.sTec, 'equipamento', 'eA4', 'qr'], [a.sGes, 'equipamento', 'eA4', 'ficha'], [a.sGes, 'cliente', 'cA', 'ficha'], [a.sA, 'cliente', '', 'portal']])
    assert.ok(!JSON.stringify(a.docs(sid, esc, id, via)).includes('certEa4aaaaa'), 'excluído ainda aparece: ' + esc + ' ' + via);
  const b = a.ctx.PClD_base_({ cid: 'cA', eu: { sessao: a.ctx.exigirSessao(a.sA) }, esc: { todas: true } });
  assert.ok(!b.docs.some((d) => d.numero === '202600300'));
  assert.equal(a.ctx.PortalCliente_arquivoPermitido_(a.sA, 'certEa4aaaaa'), false, 'o cliente não abre mais o arquivo');
  // nada apagado: a linha do certificado continua e a exclusão é uma linha nova com quem, quando e motivo
  assert.ok(a.abas.get('CERT_CALIBRACAO').linhas.some((l) => l.includes('202600300')));
  const ex = a.ctx.SGO_DATA.getAll('DOCP_EXCLUSOES');
  assert.equal(ex.length, 1); assert.equal(ex[0].SITUACAO, 'EXCLUIDO'); assert.equal(ex[0].EQUIPAMENTO_ID, 'eA4'); assert.match(String(ex[0].MOTIVO), /outro cliente/); assert.ok(ex[0].POR_NOME && ex[0].EM);
  // a lista de excluídos: Administrador vê (na ficha e pela ação); Gestor não
  const fa = a.docs(a.sAdm, 'equipamento', 'eA4', 'ficha');
  assert.equal(fa.excluidos.length, 1); assert.match(fa.excluidos[0].motivo, /outro cliente/);
  assert.ok(!a.docs(a.sGes, 'equipamento', 'eA4', 'ficha').excluidos.length);
  assert.equal(acao(a.sAdm, 'excluidos', { clienteId: 'cA' }).excluidos.length, 1);
  assert.match(acao(a.sGes, 'excluidos', {}).message, /só o Administrador e a Diretoria/);
  assert.match(acao(a.sGes, 'restaurar', { id: ex[0].ID, motivo: 'era deste equipamento mesmo' }).message, /Acesso negado/);
  // restaurar: com motivo; o documento volta
  assert.equal(acao(a.sAdm, 'restaurar', { id: ex[0].ID, motivo: 'x' }).success, false);
  const rs = acao(a.sAdm, 'restaurar', { id: ex[0].ID, motivo: 'Conferido: o certificado é deste equipamento' });
  assert.equal(rs.success, true, rs.message);
  assert.ok(JSON.stringify(a.docs(a.sA, 'equipamento', 'eA4', 'qr')).includes('202600300'));
  assert.equal(a.ctx.SGO_DATA.getAll('DOCP_EXCLUSOES')[0].SITUACAO, 'RESTAURADO');
});

test('caixa «Excluir documento da pasta»: registrada em Acessos, padrão Administrador, Diretoria e gestores da Técnica, Qualidade e Comercial', () => {
  const a = amb();
  const m = a.ctx.SGO_PODERES_MODULOS.find((x) => x.item[0] === 'DOCP_EXCLUIR');
  assert.ok(m, 'caixa registrada');
  assert.equal(m.item[2], 'Excluir documento da pasta');
  const p = m.padrao;
  assert.equal(p({}, { admin: true }), true);
  assert.equal(p({}, { diretoria: true }), true);
  assert.equal(p({ area: 'QUALIDADE' }, { p: 'GESTOR' }), true, 'gestor da Qualidade (o Matheus)');
  assert.equal(p({ area: 'TECNICA' }, { p: 'GESTOR' }), true);
  assert.equal(p({ area: 'COMERCIAL' }, { p: 'GESTOR' }), true);
  assert.equal(p({ area: 'TECNICA' }, { p: 'TECNICO' }), false);
  assert.equal(p({ area: 'FINANCEIRO' }, { p: 'GESTOR' }), false);
  // tela: botão, confirmação que diz o quê, de onde e que some do QR, motivo obrigatório, lista de excluídos e restaurar
  const comp = ler('JS_DocumentosPastas.html');
  assert.match(comp, /data-dpst-excluir/);
  assert.match(comp, /O documento some do QR Code, das pastas, das fichas e do Portal do cliente/);
  assert.match(comp, /Motivo \(obrigatório, fica registrado\)/);
  assert.match(comp, /Documentos excluídos \(/); assert.match(comp, /data-dpst-restaurar/);
  assert.ok(!/\b(alert|confirm)\(/.test(comp), 'sem alert/confirm do navegador');
  const aj = ler('SGO_Ajuda_Cadastros.js');
  assert.match(aj, /Excluir documento da pasta/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md'), 'utf8');
  assert.match(man, /### Excluir documento da pasta/);
});
