// SGO+ Licitações, documentos de habilitação (02/11/2026): cálculo de vencimento, avisos sem repetir, versão e histórico,
// arquivo restrito com SHA-256, cruzamento com o edital (atende, vence antes da sessão, falta, a conferir), decisão da
// Diretoria, relação para conferência, permissão, Hoje e Painel, telas. Código real do notificador e dos alertas
// (tests/_licitacoes_alertas_ambiente.cjs); serviço de arquivos simulado em memória; e-mail e WhatsApp simulados (nada sai).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { ambiente, OP, ler } = require('./_licitacoes_alertas_ambiente.cjs');

const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const PDF = (txt) => Buffer.from('%PDF-1.4\n' + (txt || 'certidao de teste') + '\n%%EOF');
const b64 = (buf) => buf.toString('base64');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Ambiente: alertas reais + leitura, painel e habilitação; Drive em memória; hoje = 02/11/2026 10:00 (Brasília). */
function amb(o) {
  o = o || {};
  const a = ambiente({ agora: o.agora || '2026-11-02T10:00:00-03:00', ops: o.ops || [], tabelas: o.tabelas });
  const arquivos = {}; let n = 0;
  const bytesDe = (v) => (typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(Array.from(v, (x) => x & 255)));
  Object.assign(a.ctx.Utilities, {
    computeDigest: (alg, v) => Array.from(crypto.createHash('sha256').update(bytesDe(v)).digest()).map((x) => (x > 127 ? x - 256 : x)),
    base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')).map((x) => (x > 127 ? x - 256 : x)),
    base64Encode: (v) => bytesDe(v).toString('base64'),
    newBlob: (bytes, tipo, nome) => ({ bytes: Array.from(bytes), tipo, nome })
  });
  const pastaFalsa = { getFoldersByName: () => ({ hasNext: () => true, next: () => pastaFalsa }), createFolder: () => pastaFalsa, createFile: (blob) => { const id = 'arq' + (++n); arquivos[id] = { bytes: blob.bytes.slice(), tipo: blob.tipo, nome: blob.nome, compart: '' }; return { getId: () => id, getUrl: () => 'https://drive/' + id, setSharing: (x) => { arquivos[id].compart = x; } }; } };
  a.ctx.SGO_DocSalvar_pastaPersistente_ = () => pastaFalsa;
  a.ctx.SGO_DocSalvar_sanitizarNome_ = (s) => String(s);
  a.ctx.DriveApp = { Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' }, getFileById: (id) => { const f = arquivos[id]; if (!f) throw new Error('não existe'); return { getBlob: () => ({ getBytes: () => f.bytes.slice(), getContentType: () => f.tipo }) }; } };
  for (const f of ['SGO_Licitacoes_Leitura.js', 'SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Habilitacao.js', 'SGO_Ajuda_LicitacoesHabilitacao.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  a.ctx.LicLeit_garantirAbas_(); a.ctx.LicH_garantirAbas_();
  a.tabelas.CAD_PADROES = o.padroes || [];
  a.arquivos = arquivos;
  a.hab = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'habilitacao', Object.assign({ op }, d || {}));
  a.ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
  a.novo = (campos, arquivo, sid) => a.ok(a.hab(sid || 's_cha', 'salvar', { campos, arquivo: arquivo ? { nome: arquivo.nome || 'doc.pdf', tipo: 'application/pdf', base64: b64(arquivo.buf || arquivo) } : null })).documento;
  a.esquecerProgramacao = () => { delete a.props.LICH_PROGRAMADO_EM; };
  return a;
}
const J = (x) => JSON.parse(JSON.stringify(x));

test('vencimento: faixas de 30, 15 e 7 dias, vencido, sem validade, regra do documento e o dia de Brasília', () => {
  const a = amb();
  const s = (validade, tipo, hoje) => J(a.ctx.LicH_situacao_({ TIPO: tipo || 'CND_FEDERAL', VALIDADE: validade }, hoje || '2026-11-02'));
  assert.equal(s('2026-11-01').codigo, 'VENCIDO'); assert.match(s('2026-11-01').texto, /Venceu em 01\/11\/2026 \(há 1 dia\)/);
  assert.equal(s('2026-11-02').codigo, 'VENCE_7'); assert.match(s('2026-11-02').texto, /Vence hoje/);
  assert.equal(s('2026-11-09').codigo, 'VENCE_7');
  assert.equal(s('2026-11-10').codigo, 'VENCE_15'); assert.equal(s('2026-11-17').codigo, 'VENCE_15');
  assert.equal(s('2026-11-18').codigo, 'VENCE_30'); assert.equal(s('2026-12-02').codigo, 'VENCE_30');
  assert.equal(s('2026-12-03').codigo, 'VIGENTE'); assert.match(s('2026-12-03').texto, /Vale até 03\/12\/2026 \(31 dias\)/);
  assert.equal(s('02/12/2026').codigo, 'VENCE_30', 'aceita dd/mm/aaaa');
  const semData = s('', 'CND_FEDERAL'); assert.equal(semData.codigo, 'SEM_VALIDADE'); assert.equal(semData.faltaData, true); assert.match(semData.texto, /Validade não informada/);
  assert.match(s('', 'DECL_MENOR').texto, /Por certame/); assert.ok(!s('', 'DECL_MENOR').faltaData);
  assert.match(s('', 'CONTRATO_SOCIAL').texto, /vale a versão vigente/);
  assert.equal(J(a.ctx.LicH_faixa_({ codigo: 'VENCE_15' })), 15); assert.equal(J(a.ctx.LicH_faixa_({ codigo: 'VIGENTE' })), null);
  // 23:30 de Brasília ainda é o mesmo dia (02:30 UTC do dia seguinte)
  assert.equal(a.ctx.LicH_hoje_(Date.parse('2026-11-02T23:30:00-03:00')), '2026-11-02');
  // aviso de validade sai das 8h às 18h de Brasília
  assert.equal(a.ctx.LicH_liberar_(Date.parse('2026-11-02T22:00:00-03:00')), '2026-11-03T11:00:00.000Z');
  assert.equal(a.ctx.LicH_liberar_(Date.parse('2026-11-02T06:10:00-03:00')), '2026-11-02T11:00:00.000Z');
  assert.equal(a.ctx.LicH_liberar_(Date.parse('2026-11-02T10:00:00-03:00')), '2026-11-02T13:00:00.000Z');
});

test('cadastro: arquivo restrito com SHA-256, versão nova com motivo, nada é apagado, histórico íntegro, conferência na abertura', () => {
  const a = amb();
  const buf = PDF('CRF FGTS 2026');
  const d = a.novo({ tipo: 'CRF_FGTS', numero: '2026110212345', emissao: '2026-10-20', validade: '2026-11-18', orgao: 'Caixa Econômica Federal', link: 'https://consulta-crf.caixa.gov.br', responsavelId: 'u_cha' }, buf);
  assert.equal(d.codigo, 'HAB-0001'); assert.equal(d.versao, 1); assert.equal(d.categoria, 'FISCAL', 'a categoria vem do documento da lista');
  assert.equal(d.arquivo.sha256, sha(buf), 'SHA-256 dos bytes do arquivo');
  assert.equal(d.situacao, 'VENCE_30'); assert.equal(d.responsavel, 'CHARLES DIRETOR TESTE');
  const reg = a.tabelas.LIC_HAB_DOCUMENTOS[0];
  assert.equal(a.arquivos[reg.ARQUIVO_ID].compart, 'PRIVATE', 'arquivo guardado restrito');
  assert.equal(a.tabelas.LIC_HAB_VERSOES.length, 1);
  // recusas: sem motivo, link que não é http(s), PDF falso, data inválida, emissão depois da validade, padrões, sem acesso
  assert.match(a.hab('s_cha', 'salvar', { id: d.id, campos: { numero: 'x' } }).message, /Escreva o motivo da mudança/);
  assert.match(a.hab('s_cha', 'salvar', { id: d.id, campos: { link: 'javascript:alert(1)' }, motivo: 'troca do link oficial' }).message, /precisa começar com http/);
  assert.match(a.hab('s_cha', 'salvar', { campos: { tipo: 'CNDT' }, arquivo: { nome: 'falso.pdf', base64: b64(Buffer.from('<html>oi</html>')) } }).message, /não é um PDF de verdade/);
  assert.match(a.hab('s_cha', 'salvar', { campos: { tipo: 'CNDT', validade: '31/02/2026' } }).message, /data válida/);
  assert.match(a.hab('s_cha', 'salvar', { campos: { tipo: 'CNDT', emissao: '2026-10-10', validade: '2026-10-01' } }).message, /antes da emissão/);
  assert.match(a.hab('s_cha', 'salvar', { campos: { tipo: 'CERT_PADROES' } }).message, /Padrões de referência/);
  assert.match(a.hab('s_cha', 'salvar', { campos: { tipo: 'ATESTADO' } }).message, /contratante e o objeto/);
  assert.equal(a.tabelas.LIC_HAB_DOCUMENTOS.length, 1, 'nenhuma recusa gravou nada');
  // mesmo valor e mesmo arquivo: nada muda
  const igual = a.ok(a.hab('s_cha', 'salvar', { id: d.id, campos: { numero: '2026110212345' }, arquivo: { nome: 'doc.pdf', base64: b64(buf) }, motivo: 'conferindo sem mudar nada' }));
  assert.equal(igual.semMudanca, true); assert.equal(a.tabelas.LIC_HAB_VERSOES.length, 1);
  // renovação: validade e arquivo novos = versão 2; o arquivo anterior fica na versão 1
  const buf2 = PDF('CRF FGTS renovado');
  const v2 = a.ok(a.hab('s_thi', 'salvar', { id: d.id, campos: { validade: '2026-12-20', emissao: '2026-11-02' }, arquivo: { nome: 'crf-novo.pdf', base64: b64(buf2) }, motivo: 'renovação do CRF na Caixa' }));
  assert.equal(v2.versao, 2); assert.ok(v2.mudou.some((m) => /Validade: 18\/11\/2026 → 20\/12\/2026/.test(m)));
  assert.ok(v2.mudou.some((m) => /o anterior continua guardado na versão 1/.test(m)));
  const vs = a.ok(a.hab('s_cha', 'versoes', { id: d.id })).versoes;
  assert.equal(vs.length, 2); assert.ok(vs.every((v) => v.integra));
  assert.equal(vs[1].arquivo.sha256, sha(buf), 'a versão 1 guarda o arquivo antigo'); assert.equal(vs[0].arquivo.sha256, sha(buf2));
  // abrir: atual e versão antiga, SHA-256 conferido
  const ab = a.ok(a.hab('s_cha', 'arquivo', { id: d.id }));
  assert.equal(Buffer.from(ab.base64, 'base64').toString(), buf2.toString()); assert.equal(ab.tipo, 'application/pdf');
  const abV1 = a.ok(a.hab('s_cha', 'arquivo', { id: d.id, versaoId: vs[1].id }));
  assert.equal(abV1.sha256, sha(buf));
  // arquivo mexido fora do SGO+: não entrega e registra
  a.arquivos[a.tabelas.LIC_HAB_DOCUMENTOS[0].ARQUIVO_ID].bytes[10] ^= 1;
  assert.match(a.hab('s_cha', 'arquivo', { id: d.id }).message, /não confere com o SHA-256/);
  assert.ok(a.hist('ARQUIVO_NAO_CONFERE').length === 1);
  // versão alterada fora do sistema aparece
  a.tabelas.LIC_HAB_VERSOES[0].MOTIVO = 'mexido na planilha';
  assert.equal(a.ok(a.hab('s_cha', 'versoes', { id: d.id })).versoes[1].integra, false);
  // retirar de uso é versão (com motivo); não existe apagar
  assert.match(a.hab('s_cha', 'retirar', { id: d.id, motivo: 'curto' }).message, /pelo menos 10 letras/);
  const r3 = a.ok(a.hab('s_cha', 'retirar', { id: d.id, motivo: 'substituída por outra certidão' }));
  assert.equal(r3.versao, 3); assert.equal(a.tabelas.LIC_HAB_DOCUMENTOS[0].ATIVO, 'NAO');
  assert.match(a.hab('s_cha', 'salvar', { id: d.id, campos: { numero: '1' }, motivo: 'tentando mudar retirado' }).message, /retirado de uso/);
  assert.match(a.hab('s_cha', 'apagar', { id: d.id }).message, /ação de habilitação desconhecida/);
  assert.equal(a.tabelas.LIC_HAB_DOCUMENTOS.length, 1); assert.equal(a.tabelas.LIC_HAB_VERSOES.length, 3);
  assert.equal(a.ok(a.hab('s_cha', 'reativar', { id: d.id, motivo: 'retirado por engano, volta' })).versao, 4);
  assert.ok(a.hist().filter((h) => h.ENTIDADE === 'HABILITACAO').length >= 4, 'tudo no LIC_HISTORICO');
  // atestado com serviços e quantidades
  const at = a.novo({ tipo: 'ATESTADO', contratante: 'Hospital Teste', contratanteCnpj: '00.000.000/0001-91', objeto: 'Calibração de termômetros e qualificação de autoclaves', periodoInicio: '2025-01-01', periodoFim: '2025-12-31',
    servicos: 'Calibração de termômetros; 120; equipamentos\nQualificação térmica de autoclave; 4,5; ensaios', cat: 'CAT 123/2025' }, PDF('atestado'));
  assert.deepEqual(J(at.servicos), [{ servico: 'Calibração de termômetros', quantidade: 120, unidade: 'equipamentos' }, { servico: 'Qualificação térmica de autoclave', quantidade: 4.5, unidade: 'ensaios' }]);
  assert.match(a.hab('s_cha', 'salvar', { id: at.id, campos: { servicos: 'Calibração; muitos; un' }, motivo: 'quantidade errada aqui' }).message, /só com número/);
  // texto que começaria fórmula na planilha
  const f = a.novo({ tipo: 'OUTRO', nome: '=HYPERLINK("x")', categoria: 'TECNICA' });
  assert.equal(f.nome, 'HYPERLINK("x")'); assert.equal(f.arquivo, null);
});

test('permissão: só Diretoria e Administrador; os demais perfis são recusados em toda ação', () => {
  const a = amb();
  for (const sid of ['s_gil', 's_vera']) {
    for (const op of ['tela', 'salvar', 'aba', 'arquivo', 'conferir', 'pacoteGerar']) {
      const r = a.hab(sid, op, { campos: { tipo: 'CNDT' }, id: 'x' });
      assert.equal(r.ok, false); assert.equal(r.semAcesso, true, op + ' para ' + sid);
    }
  }
  assert.equal(a.tabelas.LIC_HAB_DOCUMENTOS.length, 0);
  assert.equal(a.ok(a.hab('s_thi', 'tela')).documentos.length, 0);
  assert.ok(a.ok(a.hab('s_cha', 'tela')).faltamTipos.some((t) => t.codigo === 'CRF_FGTS'));
  assert.ok(!a.ok(a.hab('s_cha', 'tela')).faltamTipos.some((t) => t.codigo === 'CERT_PADROES'), 'os padrões vêm da Metrologia');
});

/** Oportunidade em análise com a sessão em 20/11/2026, leitura consolidada (checklist em linhas) e uma análise concluída. */
function cenario(o) {
  o = o || {};
  const op = OP('op_hab1', { SITUACAO: 'ANALISE', RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', ENCERRAMENTO_PROPOSTAS: '2026-11-20T09:00:00', ENCERRAMENTO_ISO: '2026-11-20T12:00:00.000Z' });
  const a = amb({ ops: [op], agora: o.agora, padroes: [{ ID: 'p1', TAG: 'TP-01', DESCRICAO: 'Termômetro padrão', CERTIFICADO_NUMERO: 'C-1', VALIDADE: '2027-03-01', STATUS: 'ATIVO' }, { ID: 'p2', TAG: 'BAL-01', DESCRICAO: 'Massa padrão', VALIDADE: '2026-11-10', STATUS: 'ATIVO' }] });
  a.tabelas.LIC_EVENTOS.push({ ID: 'ev_s', OPORTUNIDADE_ID: 'op_hab1', TIPO: 'SESSAO_PUBLICA', SITUACAO: 'ATIVO', NATUREZA: 'CONFIRMADO', QUANDO_ISO: '2026-11-20T12:00:00.000Z', VERSAO: 1 });
  const fonte = (p) => [{ arquivo: { nome: 'edital.pdf', titulo: 'Edital', sha256: 'e'.repeat(64) }, pagina: p, rotulo: 'p. ' + p, linha: 12 }];
  const itens = [
    { id: 'I1', tema: 'HAB_FISCAL', temaNome: 'Habilitação fiscal, social e trabalhista', trecho: 'Prova de regularidade relativa ao Fundo de Garantia por Tempo de Serviço (FGTS).', tipo: 'EXIGENCIA', fontes: fonte(31) },
    { id: 'I2', tema: 'HAB_FISCAL', temaNome: 'Habilitação fiscal, social e trabalhista', trecho: 'Certidão Negativa de Débitos Trabalhistas (CNDT), emitida pela Justiça do Trabalho.', tipo: 'EXIGENCIA', fontes: fonte(31) },
    { id: 'I3', tema: 'HAB_ECONOMICA', temaNome: 'Habilitação econômico-financeira', trecho: 'Balanço patrimonial e demonstrações contábeis dos dois últimos exercícios sociais.', tipo: 'EXIGENCIA', fontes: fonte(32) },
    { id: 'I4', tema: 'ATESTADOS', temaNome: 'Atestado de capacidade técnica', trecho: 'Atestado de capacidade técnica que comprove a calibração de termômetros em quantidade mínima de 50 unidades.', tipo: 'EXIGENCIA', fontes: fonte(33) },
    { id: 'I5', tema: 'RBC_INMETRO', temaNome: 'RBC, acreditação e Inmetro', trecho: 'A calibração deverá ser executada por laboratório acreditado pela Cgcre na RBC.', tipo: 'EXIGENCIA', fontes: fonte(34) },
    { id: 'I6', tema: 'RBC_INMETRO', temaNome: 'RBC, acreditação e Inmetro', trecho: 'Os certificados dos padrões utilizados deverão ser rastreáveis à RBC.', tipo: 'EXIGENCIA', fontes: fonte(34) },
    { id: 'I7', tema: 'PRAZOS', temaNome: 'Prazo de execução e entrega', trecho: 'O prazo de execução será de 30 dias.', tipo: 'EXIGENCIA', fontes: fonte(40) },
    { id: 'I8', tema: 'HAB_JURIDICA', temaNome: 'Habilitação jurídica', trecho: 'Ato constitutivo, estatuto ou contrato social em vigor <script>alert(1)</script>, salvo se já apresentado no SICAF.', tipo: 'PENDENCIA', alerta: 'salvo', fontes: fonte(30) }
  ];
  a.tabelas.LIC_LEITURAS.push({ ID: 'le1', OPORTUNIDADE_ID: 'op_hab1', VERSAO: 1, SITUACAO: 'CONCLUIDA', CHECKLIST_CHAVE: 'ck1', CHECKLIST_QTD: itens.length, CONSOLIDACAO_EM: '2026-11-01T12:00:00Z' });
  itens.forEach((it, i) => a.tabelas.LIC_LEITURA_CHECKLIST.push({ ID: 'c' + i, LEITURA_ID: 'le1', OPORTUNIDADE_ID: 'op_hab1', CHAVE: 'ck1', ORDEM: i + 1, ITEM_ID: it.id, TEMA: it.tema, ITEM_JSON: JSON.stringify(it) }));
  a.tabelas.LIC_ANALISES.push({ ID: 'an1', OPORTUNIDADE_ID: 'op_hab1', VERSAO: 1, SITUACAO: 'CONCLUIDA', CRIADO_EM: '2026-11-01T10:00:00Z', EXIGENCIAS_JSON: JSON.stringify([
    { texto: 'Exige FGTS', fonte: { ref: 'A1', trecho: 'Prova de regularidade relativa ao Fundo de Garantia por Tempo de Serviço (FGTS).' } },
    { texto: 'Exige comprovante de inscrição no CNPJ', fonte: { ref: 'A1', rotulo: 'Edital', trecho: 'Prova de inscrição no Cadastro Nacional de Pessoas Jurídicas (CNPJ).' } }]) });
  // cadastro: FGTS vale depois da sessão; CNDT vence antes; contrato social sem validade; atestado de termômetros
  a.novo({ tipo: 'CRF_FGTS', numero: 'CRF-1', validade: '2026-12-15', orgao: 'Caixa' }, PDF('crf'));
  a.novo({ tipo: 'CNDT', numero: 'CNDT-1', validade: '2026-11-15', orgao: 'TST' }, PDF('cndt'));
  a.novo({ tipo: 'CONTRATO_SOCIAL' }, PDF('contrato'));
  a.novo({ tipo: 'ATESTADO', contratante: 'Hospital Teste', objeto: 'Calibração de termômetros clínicos', servicos: 'Calibração de termômetros; 120; unidades' }, PDF('atestado'));
  return a;
}
const ex = (r, ref) => r.habilitacao.itens.find((e) => e.ref === ref);

test('cruzamento: atende, vence antes da sessão (com a nota da EPP), falta, a conferir, RBC e padrões; só temas de habilitação; sem duplicar a análise', () => {
  const a = cenario();
  const r = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' }));
  const hb = r.habilitacao;
  assert.equal(hb.sessao.dia, '2026-11-20'); assert.match(hb.sessao.fonte, /Agenda: abertura da sessão pública \(confirmada\)/);
  assert.deepEqual(hb.itens.map((e) => e.ref), ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I8', 'E2'], 'prazo (I7) fora; a exigência E1 da análise repete o I1 e não entra');
  assert.equal(ex(r, 'I1').efetivo, 'ATENDE'); assert.match(ex(r, 'I1').efetivoTexto, /HAB-0001 vale até 15\/12\/2026, depois da sessão/);
  assert.equal(ex(r, 'I2').efetivo, 'VENCE_ANTES'); assert.match(ex(r, 'I2').efetivoTexto, /antes da sessão \(20\/11\/2026\)/); assert.match(ex(r, 'I2').efetivoTexto, /LC 123\/2006, art\. 43/);
  assert.equal(ex(r, 'I3').efetivo, 'FALTA'); assert.match(ex(r, 'I3').efetivoTexto, /Não há "Balanço patrimonial/);
  assert.equal(ex(r, 'I4').efetivo, 'A_CONFERIR'); assert.match(ex(r, 'I4').efetivoTexto, /calibracao, termometros/); assert.match(ex(r, 'I4').efetivoTexto, /parcela de maior relevância/);
  assert.equal(ex(r, 'I5').efetivo, 'FALTA'); assert.match(ex(r, 'I5').efetivoTexto, /não é acreditada RBC/);
  assert.equal(ex(r, 'I6').efetivo, 'A_CONFERIR'); assert.deepEqual(ex(r, 'I6').tiposAvaliados.map((t) => t.codigo), ['CERT_PADROES'], '"rastreáveis à RBC" é rastreabilidade, não acreditação');
  assert.match(ex(r, 'I6').efetivoTexto, /2 padrões ativos em Padrões de referência; 1 com o certificado válido na data da sessão/);
  assert.equal(ex(r, 'I8').efetivo, 'A_CONFERIR', 'documento existe, mas a leitura marcou exceção ("salvo") perto do trecho');
  assert.equal(ex(r, 'E2').efetivo, 'FALTA'); assert.equal(ex(r, 'E2').origem, 'ANALISE');
  assert.equal(hb.contagens.pendencias, 4); assert.deepEqual([hb.contagens.ATENDE, hb.contagens.VENCE_ANTES, hb.contagens.FALTA, hb.contagens.A_CONFERIR], [1, 1, 3, 3]);
  // palavras extras do documento: a Diretoria ensina o sistema (regra de palavras, não IA)
  const bal = a.novo({ tipo: 'BALANCO', validade: '2027-05-31', palavras: 'exercícios sociais' }, PDF('balanco'));
  assert.equal(ex(a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })), 'I3').efetivo, 'ATENDE');
  assert.equal(a.ctx.LicH_tiposDaExigencia_('apresentar os dois exercícios sociais', a.tabelas.LIC_HAB_DOCUMENTOS).indexOf('BALANCO') >= 0, true);
  assert.ok(bal.palavras.includes('exercícios sociais'));
  // sem leitura nem análise: aba vazia, com a orientação
  a.tabelas.LIC_OPORTUNIDADES.push(OP('op_vaz', { SITUACAO: 'ANALISE' }));
  const v = a.ok(a.hab('s_cha', 'aba', { id: 'op_vaz' })).habilitacao;
  assert.equal(v.itens.length, 0); assert.equal(v.info.leitura, null);
});

test('decisão da Diretoria: "não atende" e "atende" com motivo e documento, histórico por versão, a validade continua conferida', () => {
  const a = cenario();
  const r0 = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' }));
  const ch1 = ex(r0, 'I1').chave, ch3 = ex(r0, 'I3').chave;
  assert.match(a.hab('s_cha', 'conferir', { id: 'op_hab1', chave: ch1, decisao: 'NAO_ATENDE', motivo: 'curto' }).message, /pelo menos 10 letras/);
  assert.match(a.hab('s_cha', 'conferir', { id: 'op_hab1', chave: 'Xnaoexiste', decisao: 'ATENDE', motivo: 'motivo bem escrito' }).message, /não está mais na leitura/);
  a.ok(a.hab('s_cha', 'conferir', { id: 'op_hab1', chave: ch1, decisao: 'NAO_ATENDE', motivo: 'o edital pede o CRF da filial também' }));
  let r = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' }));
  assert.equal(ex(r, 'I1').efetivo, 'NAO_ATENDE'); assert.equal(ex(r, 'I1').sugestao.situacao, 'ATENDE', 'a sugestão do sistema continua visível');
  // "atende" com um documento que vence antes da sessão: a pendência continua (vence antes)
  const cndt = a.tabelas.LIC_HAB_DOCUMENTOS.find((d) => d.TIPO === 'CNDT');
  a.ok(a.hab('s_thi', 'conferir', { id: 'op_hab1', chave: ch1, decisao: 'ATENDE', documentoId: cndt.ID, motivo: 'conferi no edital, vale a certidão' }));
  r = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' }));
  assert.equal(ex(r, 'I1').efetivo, 'VENCE_ANTES'); assert.match(ex(r, 'I1').efetivoTexto, /Marcado "atende" por THIAGO DONO TESTE com HAB-0002, mas ele vale até 15\/11\/2026/);
  assert.equal(ex(r, 'I1').historico.length, 2); assert.equal(ex(r, 'I1').historico[0].versao, 2); assert.ok(ex(r, 'I1').historico.every((h) => h.integra));
  // "atende" sem documento do cadastro (justificado) resolve a falta
  a.ok(a.hab('s_cha', 'conferir', { id: 'op_hab1', chave: ch3, decisao: 'ATENDE', motivo: 'o edital dispensa o balanço para ME e EPP' }));
  assert.equal(ex(a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })), 'I3').efetivo, 'ATENDE');
  assert.equal(a.tabelas.LIC_HAB_CONFERENCIAS.length, 3, 'uma linha por decisão; nada sobrescrito');
  assert.equal(a.hist('HABILITACAO_CONFERENCIA').length, 3);
  // registro mexido fora do SGO+
  a.tabelas.LIC_HAB_CONFERENCIAS[0].MOTIVO = 'alterado';
  assert.equal(ex(a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })), 'I1').historico[1].integra, false);
});

test('pendências no Hoje e no Painel com a fonte; relação para conferência versionada, escapada e sem envio', () => {
  const a = cenario();
  const aba = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })).habilitacao;
  const hoje = a.ok(a.api('s_cha', 'hoje')).habilitacao;
  assert.equal(hoje.licitacoes.pendencias, aba.contagens.pendencias); assert.equal(hoje.licitacoes.comPendencia, 1);
  assert.equal(hoje.licitacoes.ops[0].id, 'op_hab1'); assert.match(hoje.fonteLicitacoes, /LIC_HAB_CONFERENCIAS/); assert.match(hoje.fonteDocumentos, /LIC_HAB_DOCUMENTOS \(4 documentos em uso\)/);
  assert.equal(hoje.documentos.VENCE_15, 1, 'a CNDT vence em 13 dias');
  const painel = a.ok(a.api('s_cha', 'painel')).habilitacao;
  assert.equal(painel.licitacoes.pendencias, aba.contagens.pendencias);
  // sessão que já passou sai da conta
  a.mudar('2026-11-21T10:00:00-03:00');
  assert.equal(a.ok(a.api('s_cha', 'hoje')).habilitacao.licitacoes.pendencias, 0);
  a.mudar('2026-11-02T10:00:00-03:00');
  // relação
  const p1 = a.ok(a.hab('s_cha', 'pacoteGerar', { id: 'op_hab1' }));
  assert.equal(p1.pacote.versao, 1);
  const crf = a.tabelas.LIC_HAB_DOCUMENTOS.find((d) => d.TIPO === 'CRF_FGTS');
  assert.ok(p1.html.includes(crf.ARQUIVO_SHA256), 'SHA-256 do arquivo na relação');
  assert.ok(!/<script/i.test(p1.html), 'sem script'); assert.match(p1.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(p1.html, /Nada foi enviado a portal/); assert.match(p1.html, /Pendências \(4\)/); assert.match(p1.html, /@page\{size:A4/);
  assert.equal(a.ok(a.hab('s_cha', 'pacoteGerar', { id: 'op_hab1' })).pacote.versao, 2);
  const lista = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })).habilitacao.pacotes;
  assert.equal(lista.length, 2); assert.ok(lista.every((p) => p.integra));
  assert.equal(a.ok(a.hab('s_cha', 'pacoteVer', { id: 'op_hab1', pacoteId: lista[1].id })).integra, true);
  a.tabelas.LIC_HAB_PACOTES[0].ITENS_JSON = '[]';
  const mexido = a.ok(a.hab('s_cha', 'pacoteVer', { id: 'op_hab1', pacoteId: a.tabelas.LIC_HAB_PACOTES[0].ID }));
  assert.equal(mexido.integra, false); assert.match(mexido.html, /não confere com o hash gravado/);
  assert.match(a.hab('s_cha', 'pacoteGerar', { id: 'op_vazia_inexistente' }).message, /não foi encontrada/);
  assert.equal(a.hist('HABILITACAO_RELACAO').length, 2);
});

test('avisos de validade: uma vez por faixa e por versão, 30/15 só e-mail, 7 dias e vencido com WhatsApp, horário, renovação encerra os antigos', () => {
  const a = amb();
  const d = a.novo({ tipo: 'CRF_FGTS', validade: '2026-11-22', orgao: 'Caixa', responsavelId: 'u_cha' }, PDF('crf'));   // 20 dias
  a.rodada('2026-11-02T10:00:00-03:00');
  let al = a.al({ TIPO: 'DOCUMENTO' });
  assert.equal(al.length, 1, 'só o responsável (integrante da Diretoria de Licitações)'); assert.equal(al[0].USUARIO_ID, 'u_cha');
  assert.equal(al[0].ANTECEDENCIA, '30 dias'); assert.equal(al[0].SITUACAO, 'ENVIADO'); assert.equal(al[0].EMAIL_SITUACAO, 'ENVIADO');
  assert.equal(a.zap().length, 0, '30 dias: sem WhatsApp'); assert.ok(a.emails.some((e) => /Habilitação HAB-0001/.test(e.subject || e.assunto || JSON.stringify(e))));
  // rodadas seguidas não repetem
  for (const h of ['10:40', '11:20', '14:00']) { a.esquecerProgramacao(); a.rodada('2026-11-02T' + h + ':00-03:00'); }
  assert.equal(a.al({ TIPO: 'DOCUMENTO' }).length, 1);
  // 15 dias, depois 7 dias (com WhatsApp pelo modelo aprovado sgo_licitacao_prazo); cada um uma vez
  a.esquecerProgramacao(); a.rodada('2026-11-08T09:00:00-03:00'); a.esquecerProgramacao(); a.rodada('2026-11-08T15:00:00-03:00');
  assert.deepEqual(a.al({ TIPO: 'DOCUMENTO' }).map((x) => x.ANTECEDENCIA), ['30 dias', '15 dias']);
  a.esquecerProgramacao(); a.rodada('2026-11-15T09:00:00-03:00'); a.esquecerProgramacao(); a.rodada('2026-11-16T09:00:00-03:00');
  al = a.al({ TIPO: 'DOCUMENTO' });
  assert.deepEqual(al.map((x) => x.ANTECEDENCIA), ['30 dias', '15 dias', '7 dias']);
  assert.equal(a.zap().length, 1); assert.equal(a.zap()[0].corpo.template.components[0].parameters.length, 9, 'os 9 parâmetros do modelo');
  assert.equal(al[2].NIVEL, 'IMPORTANTE');
  // ciência pela tela
  a.ok(a.api('s_cha', 'alertaCiente', { id: al[2].ID }));
  // fora do horário: o aviso de vencido espera as 8h
  a.esquecerProgramacao(); a.rodada('2026-11-22T23:30:00-03:00');
  assert.equal(a.al({ TIPO: 'DOCUMENTO', ANTECEDENCIA: 'vencido' }).length, 0, 'no último dia de validade ainda vale');
  a.esquecerProgramacao(); a.rodada('2026-11-23T05:30:00-03:00');
  const venc = () => a.al({ TIPO: 'DOCUMENTO', ANTECEDENCIA: 'vencido' });
  assert.equal(venc().length, 1); assert.equal(venc()[0].SITUACAO, 'PROGRAMADO'); assert.equal(venc()[0].LIBERAR_EM, '2026-11-23T11:00:00.000Z');
  a.rodada('2026-11-23T08:05:00-03:00');
  assert.equal(venc()[0].SITUACAO, 'ENVIADO'); assert.equal(venc()[0].ALVO_ISO, '', 'vencido fica pendente de ciência até alguém ver');
  // renovação = versão nova: o vencido sem ciência fica concluído; nada novo sai (vigente)
  a.mudar('2026-11-23T09:00:00-03:00');
  a.ok(a.hab('s_cha', 'salvar', { id: d.id, campos: { validade: '2027-05-23' }, arquivo: { nome: 'crf2.pdf', base64: b64(PDF('crf novo')) }, motivo: 'CRF renovado na Caixa' }));
  assert.equal(venc()[0].SITUACAO, 'CONCLUIDO'); assert.match(venc()[0].CANCELADO_MOTIVO, /versão 2/);
  const sete = a.al({ TIPO: 'DOCUMENTO', ANTECEDENCIA: '7 dias' })[0];
  assert.ok(sete.CIENTE_EM && sete.CIENTE_POR_NOME === 'CHARLES DIRETOR TESTE', 'o que já tinha ciência fica com a ciência'); assert.doesNotMatch(String(sete.CANCELADO_MOTIVO || ''), /versão 2/);
  a.esquecerProgramacao(); a.rodada('2026-11-23T10:00:00-03:00');
  assert.equal(a.al({ TIPO: 'DOCUMENTO' }).length, 4);
  // sem responsável: os dois integrantes; documento retirado de uso: o programado é cancelado
  a.mudar('2026-11-23T20:00:00-03:00');
  const d2 = a.novo({ tipo: 'CNDT', validade: '2026-12-10' }, PDF('cndt'));
  a.esquecerProgramacao(); a.rodada();
  const doD2 = a.al({ EVENTO_ID: d2.id });
  assert.equal(doD2.length, 2); assert.ok(doD2.every((x) => x.SITUACAO === 'PROGRAMADO' && x.CANAIS === 'email'));
  a.ok(a.hab('s_cha', 'retirar', { id: d2.id, motivo: 'cadastrada em duplicidade' }));
  a.rodada('2026-11-24T08:10:00-03:00');
  assert.ok(a.al({ EVENTO_ID: d2.id }).every((x) => x.SITUACAO === 'CANCELADO'));
});

test('avisos da licitação: documento que vence antes da sessão e documentos que faltam; link abre a aba Habilitação', () => {
  const a = cenario();
  a.rodada('2026-11-02T10:00:00-03:00');
  const s = a.al({ TIPO: 'DOCUMENTO', EVENTO_TIPO: 'HAB_SESSAO' });
  assert.equal(s.length, 1, 'para o responsável da licitação'); assert.equal(s[0].OPORTUNIDADE_ID, 'op_hab1'); assert.equal(s[0].USUARIO_ID, 'u_cha');
  assert.equal(s[0].EVENTO_ID, a.tabelas.LIC_HAB_DOCUMENTOS.find((d) => d.TIPO === 'CNDT').ID); assert.equal(s[0].SITUACAO, 'ENVIADO');
  const f = a.al({ TIPO: 'DOCUMENTO', EVENTO_TIPO: 'HAB_FALTA' });
  assert.equal(f.length, 1); assert.match(f[0].TITULO, /documentos de habilitação faltando/); assert.equal(f[0].CANAIS, 'email');
  a.esquecerProgramacao(); a.rodada('2026-11-02T11:00:00-03:00');
  assert.equal(a.al({ TIPO: 'DOCUMENTO', OPORTUNIDADE_ID: 'op_hab1', PAPEL: (p) => p !== 'ESCALONAMENTO' && p !== 'REENVIO' }).length, 2, 'sem repetir');
  assert.equal(a.al({ TIPO: 'DOCUMENTO', EVENTO_TIPO: 'HAB_SESSAO', PAPEL: 'ESCALONAMENTO' })[0].USUARIO_ID, 'u_thi', 'sem ciência em 15 min (importante): escalona para o outro integrante');
  assert.equal(a.al({ TIPO: 'DOCUMENTO', EVENTO_TIPO: 'HAB_FALTA', PAPEL: 'ESCALONAMENTO' }).length, 0, 'o aviso de falta não escalona');
  // o link do alerta abre a aba Habilitação da ficha; o de validade, o cadastro
  const t = a.ctx.Lic_avisoAbrir_({ userId: 'u_cha', usuario: 'charles', perfil: 'DIRETORIA' }, s[0].AVISO_ID);
  assert.deepEqual(J(t.tela), { tipo: 'licitacao', id: 'op_hab1', aba: 'habilitacao', alerta: s[0].ID });
  const v = a.al({ EVENTO_TIPO: 'HAB_VALIDADE' })[0];
  assert.equal(J(a.ctx.Lic_avisoAbrir_({ userId: 'u_cha', usuario: 'charles', perfil: 'DIRETORIA' }, v.AVISO_ID).tela).mod, 'licitacoes_habilitacao');
  // Central de alertas mostra o texto dos avisos de documento
  const central = a.ok(a.api('s_cha', 'alertas', { filtro: 'todos' }));
  assert.ok(central.lista.some((x) => x.tipo === 'DOCUMENTO' && x.abrirAba === 'habilitacao'));
  // descartada: o aviso da licitação que ainda não saiu é cancelado
  a.ok(a.api('s_cha', 'descartar', { id: 'op_hab1', motivo: 'decidimos não participar desta' }));
  assert.equal(a.ctx.LicH_alertaSemValer_(s[0], { op_hab1: a.tabelas.LIC_OPORTUNIDADES[0] }, a.ctx.Lic_alertasCfg_(), Date.now()), 'Sem alerta: oportunidade descartada pela Diretoria.');
});

// ---------------------------------------------------------------- telas
function tela() {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('licCorpo'); el('licHab');
  const chamadas = [];
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => false, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push(acao + ':' + (d && d.op)); } }; } }; } } } } });
  const html = {};
  for (const f of ['JS_Licitacoes.html', 'JS_Licitacoes_Habilitacao.html']) {
    html[f] = fs.readFileSync(path.join(pasta, f), 'utf8');
    vm.runInContext(html[f].slice(html[f].indexOf('<script>') + 8, html[f].lastIndexOf('</script>')), ctx);
  }
  return { ctx, els, chamadas, html };
}

test('telas: cadastro, aba Habilitação, Hoje e Painel com escape, link só http/https, celular de 390 px', () => {
  const a = cenario();
  const t = tela();
  const d = a.ok(a.hab('s_cha', 'tela'));
  d.documentos[0].nome = '<img src=x onerror=alert(1)>'; d.documentos[0].link = 'javascript:alert(1)'; d.documentos[1].link = 'https://consulta.tst.jus.br';
  t.ctx.LICHB.tela = d;
  const ht = t.ctx.LicHb_htmlTela_(d);
  assert.doesNotMatch(ht, /<img src=x/); assert.match(ht, /&lt;img src=x/);
  assert.doesNotMatch(ht, /href="javascript/); assert.match(ht, /href="https:\/\/consulta\.tst\.jus\.br" target="_blank" rel="noopener noreferrer"/);
  assert.match(ht, /data-lhb-novo>Cadastrar documento/); assert.match(ht, /Certificados dos padrões \(rastreabilidade\)/); assert.match(ht, /Documentos da lista ainda sem cadastro/);
  assert.match(ht, /SHA-256 [0-9a-f]{64}/); assert.match(ht, /Retirar de uso/); assert.doesNotMatch(ht, /Apagar|Excluir/);
  // aba Habilitação
  const r = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' }));
  const ha = t.ctx.LicHb_htmlAbaDados_(r);
  assert.doesNotMatch(ha, /<script>alert/); assert.match(ha, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(ha, /Vence antes da sessão/); assert.match(ha, /Falta/); assert.match(ha, /A conferir/); assert.match(ha, /Marcar "atende"/); assert.match(ha, /Marcar "não atende"/);
  assert.match(ha, /Gerar relação para conferência \(A4\)/); assert.match(ha, /regra de palavras/); assert.match(ha, /Leitura do edital: Edital, p\. 31, linha 12/);
  const vazio = t.ctx.LicHb_htmlAbaDados_({ op: { acompanhada: true }, habilitacao: { itens: [], contagens: {}, sessao: {}, info: {} } });
  assert.match(vazio, /Ir para a Leitura do edital/); assert.match(vazio, /data-lhb-pacote disabled/);
  // ficha: a aba existe e só chama o servidor quando aberta
  const ficha = t.ctx.Lic_htmlFicha_({ op: { id: 'op_hab1', codigo: 'LIC-2026-0001', uf: 'GO', selos: [], pendencias: [] }, historico: [] }, 'habilitacao');
  assert.match(ficha, /aria-selected="true" data-lic-fab="habilitacao">Habilitação<\/button>/); assert.match(ficha, /id="licHab"/);
  t.ctx.LicHb_ligarAba_({}, {}, 'op_hab1'); assert.deepEqual(t.chamadas, ['habilitacao:aba']);
  // Hoje e Painel
  const hoje = a.ok(a.api('s_cha', 'hoje'));
  const hh = t.ctx.Lic_htmlHoje_(hoje);
  assert.match(hh, /Documentos de habilitação/); assert.match(hh, /Pendências nas licitações/); assert.match(hh, /&quot;ficha&quot;:&quot;op_hab1&quot;/); assert.match(hh, /Fonte:/);
  const pn = t.ctx.LicHb_painelHtml_(a.ok(a.api('s_cha', 'painel')).habilitacao);
  assert.match(pn, /pendências nas licitações/); assert.match(pn, /lic-pn-fonte/);
  assert.match(t.ctx.LicHb_hojeHtml_({ erro: 'falhou <b>' }), /falhou &lt;b&gt;/);
  // celular de 390 px: sem largura fixa maior que a tela; toque de 44 px; sem atualização automática; CRLF
  const css = t.html['JS_Licitacoes_Habilitacao.html'];
  for (const m of css.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  assert.match(css, /minmax\(150px, 1fr\)/); assert.match(css, /\.lhb-det summary \{[^}]*min-height: 44px/);
  assert.doesNotMatch(css, /setInterval/);
  assert.match(css, /\r\n/, 'JS_*.html em CRLF como os demais');
});

test('integração na casca: menu, rota, inclusão do arquivo, navegação, alertas, ajuda da tela e manual', () => {
  const lerF = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
  const idx = lerF('Index.html');
  assert.match(idx, /data-mod="licitacoes_habilitacao"[^>]*onclick="abrir\('licitacoes_habilitacao'\)"[^>]*>.*Documentos de habilitação<\/button>/);
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Habilitacao'\); \?>/);
  const js = lerF('JS_Licitacoes.html');
  assert.match(js, /\["licitacoes_habilitacao", "Habilitação"\]/); assert.match(js, /licitacoes_habilitacao: "Documentos de habilitação"/);
  assert.match(js, /LIC\.mod === "licitacoes_habilitacao"\) \{ if \(typeof LicHb_renderTela_ === "function"\)/);
  assert.match(js, /if \(x\.ficha\) \{ Lic_irFicha_\(x\.ficha, x\.fichaAba \|\| "resumo"\); return; \}/);
  assert.match(lerF('SGO_Licitacoes.js'), /habilitacao: function \(eu, d\) \{ return LicH_acao_\(eu, d\); \}/);
  const al = lerF('SGO_Licitacoes_Alertas.js');
  assert.match(al, /if \(Lic_s_\(a\.TIPO\) === 'DOCUMENTO'\) return typeof LicH_alertaSemValer_ === 'function'/);
  assert.match(al, /passo\('habilitacao', function \(\) \{ return typeof LicH_alertasProgramar_ === 'function'/);
  for (const f of ['SGO_Licitacoes_Habilitacao.js', 'JS_Licitacoes_Habilitacao.html', 'SGO_Ajuda_LicitacoesHabilitacao.js']) assert.match(lerF(f), /\r\n/, f + ' em CRLF');
  const a = amb();
  vm.runInContext(ler('SGO_Ajuda.js'), a.ctx);
  const t = a.ctx.SGO_ajudaTelas_LicitacoesHabilitacao_().licitacoes_habilitacao;
  assert.ok(t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length);
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_habilitacao); assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_habilitacao);
  assert.ok(a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades.passos.some((p) => p.titulo === 'Habilitação (documentos do edital)'));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /## Documentos de habilitação/);
  const textos = ['SGO_Licitacoes_Habilitacao.js', 'JS_Licitacoes_Habilitacao.html', 'SGO_Ajuda_LicitacoesHabilitacao.js'].map(lerF).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
});
