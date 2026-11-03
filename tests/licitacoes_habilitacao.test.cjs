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
  const pastaFalsa = { getFoldersByName: () => ({ hasNext: () => true, next: () => pastaFalsa }), createFolder: () => pastaFalsa, createFile: (blob) => { const id = 'arq' + (++n); arquivos[id] = { bytes: blob.bytes.slice(), tipo: blob.tipo, nome: blob.nome, compart: '' }; return { getId: () => id, getUrl: () => 'https://drive/' + id, setSharing: (x, y) => { if (a.recusaRestrito && x === 'RESTRITO') throw new Error('não existe no Drive'); arquivos[id].compart = x + ':' + y; } }; } };
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
  assert.equal(a.arquivos[reg.ARQUIVO_ID].compart, 'RESTRITO:SISTEMA', 'arquivo guardado RESTRITO (não abre por /arquivos/:id)');
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
  const fichaDe = () => { const x = a.tabelas.LIC_OPORTUNIDADES.find((y) => y.ID === 'op_hab1'); return J(a.ctx.Lic_analiseFicha_(x, a.ctx.Lic_lerFonteServidor_(x))); };
  assert.equal(fichaDe().desatualizada, false);
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
  assert.equal(s.length, 2, 'a CNDT não tem responsável: os dois integrantes'); assert.equal(s[0].OPORTUNIDADE_ID, 'op_hab1', 'uma licitação só: o link abre a ficha');
  assert.ok(s.every((x) => x.PAPEL === 'AVISO' && x.NIVEL === 'IMPORTANTE'));
  assert.equal(s[0].EVENTO_ID, a.tabelas.LIC_HAB_DOCUMENTOS.find((d) => d.TIPO === 'CNDT').ID); assert.equal(s[0].SITUACAO, 'ENVIADO');
  const f = a.al({ TIPO: 'DOCUMENTO', EVENTO_TIPO: 'HAB_FALTA' });
  assert.equal(f.length, 1); assert.match(f[0].TITULO, /documentos de habilitação faltando/); assert.equal(f[0].CANAIS, 'email');
  a.esquecerProgramacao(); a.rodada('2026-11-02T11:00:00-03:00');
  assert.equal(a.al({ TIPO: 'DOCUMENTO', OPORTUNIDADE_ID: 'op_hab1' }).length, 3, 'sem repetir');
  assert.equal(a.al({ TIPO: 'DOCUMENTO', PAPEL: (p) => p === 'ESCALONAMENTO' || p === 'REENVIO' }).length, 0, 'avisos de documento não escalonam');
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
  assert.equal(a.ctx.LicH_alertaSemValer_(f[0], { op_hab1: a.tabelas.LIC_OPORTUNIDADES[0] }, a.ctx.Lic_alertasCfg_(), Date.now()), 'Sem alerta: oportunidade descartada pela Diretoria.');
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

// ---------------------------------------------------------------- revisão independente de 6d6a652 (cada caso do script de prova vira teste)
const docsProva = (tipos, extra) => tipos.map((t, i) => Object.assign({ ID: 'd' + i, CODIGO: 'HAB-00' + (10 + i), TIPO: t, NOME: t, ATIVO: 'SIM', VERSAO: 1, ARQUIVO_ID: 'x', VALIDADE: '2027-06-01', ORGAO_EMISSOR: 'Caixa' }, (extra || {})[t] || {}));
const efetivo = (a, frase, docs, padroes) => {
  const l = { ID: 'opx', CODIGO: 'LIC-X', ENCERRAMENTO_ISO: '2026-11-20T12:00:00.000Z' };
  const ctx = { hoje: '2026-11-02', docs, padroes: padroes || { ativos: 0, lista: [] }, leituras: {}, checklist: {}, analises: { opx: [{ SITUACAO: 'CONCLUIDA', VERSAO: 1, EXIGENCIAS_JSON: JSON.stringify([{ texto: frase }]) }] }, conferencias: {}, eventos: {} };
  const it = a.ctx.LicH_cruzar_(l, ctx).itens[0];
  return J({ efetivo: it.efetivo, texto: it.efetivoTexto, tipos: it.tiposAvaliados.map((t) => t.codigo) });
};

test('revisão GRAVE 1: o arquivo é gravado RESTRITO (como os relatórios de ciclo); PRIVATE só quando RESTRITO não existe', () => {
  const a = amb();
  a.novo({ tipo: 'CNDT', validade: '2026-12-01' }, PDF('cndt'));
  assert.equal(Object.values(a.arquivos)[0].compart, 'RESTRITO:SISTEMA');
  a.recusaRestrito = true;
  a.novo({ tipo: 'CRF_FGTS', validade: '2026-12-01' }, PDF('crf'));
  assert.equal(Object.values(a.arquivos)[1].compart, 'PRIVATE:NONE', 'reserva do Google Drive');
  assert.match(ler('SGO_Licitacoes_Habilitacao.js'), /f\.setSharing\('RESTRITO', 'SISTEMA'\)/);
});

test('revisão GRAVE 2: várias esferas ou esfera fora da matriz não "atendem" só com a federal', () => {
  const a = amb();
  const tres = docsProva(['CND_FEDERAL', 'CND_ESTADUAL', 'CND_MUNICIPAL']), so = docsProva(['CND_FEDERAL']);
  const r1 = efetivo(a, 'Prova de regularidade fiscal perante a Fazenda Nacional, Estadual e Municipal do domicílio ou sede do licitante', so);
  assert.equal(r1.efetivo, 'A_CONFERIR', 'antes: ATENDE só com a federal'); assert.deepEqual(r1.tipos, ['CND_FEDERAL', 'CND_ESTADUAL', 'CND_MUNICIPAL']);
  assert.equal(efetivo(a, 'Prova de regularidade fiscal perante a Fazenda Nacional, Estadual e Municipal', so).efetivo, 'FALTA', 'só a federal no cadastro: faltam a estadual e a municipal');
  const r2 = efetivo(a, 'Prova de regularidade fiscal perante a Fazenda Nacional, Estadual e Municipal', tres);
  assert.equal(r2.efetivo, 'A_CONFERIR'); assert.match(r2.texto, /mais de uma esfera \(federal, estadual, municipal\)/);
  assert.equal(efetivo(a, 'Certidão de regularidade relativa aos tributos federais e estaduais', tres).efetivo, 'A_CONFERIR');
  assert.equal(efetivo(a, 'Prova de regularidade junto à Receita Federal, Estadual e Municipal', tres).efetivo, 'A_CONFERIR');
  const r3 = efetivo(a, 'Certidão Negativa de Débitos com a Fazenda Pública do Município de Aparecida do Rio Doce', tres);
  assert.equal(r3.efetivo, 'A_CONFERIR'); assert.match(r3.texto, /município de aparecida do rio doce, fora da matriz/);
  assert.equal(efetivo(a, 'Prova de regularidade com a Fazenda Federal (certidão conjunta da Receita Federal e PGFN)', tres).efetivo, 'ATENDE', 'uma esfera só, a da certidão: atende');
  assert.equal(efetivo(a, 'Certidão negativa de débitos municipais do Município de Goiânia', tres).efetivo, 'ATENDE', 'Goiânia é a matriz');
});

test('revisão MÉDIO 3: conselho, responsável técnico, cadastro e alvará genéricos ficam "a conferir"; CRF do conselho não é o FGTS', () => {
  const a = amb();
  const docs = docsProva(['REGISTRO_CONSELHO', 'CADASTRO_FORNECEDOR', 'ALVARA', 'RESPONSAVEL_TECNICO', 'CRF_FGTS']);
  for (const [frase, tipo] of [['Registro da empresa no Conselho Regional de Química (CRQ)', 'REGISTRO_CONSELHO'], ['Inscrição no Conselho Regional de Farmácia - CRF', 'REGISTRO_CONSELHO'],
    ['Certificado de Registro Cadastral (CRC) emitido pela Prefeitura Municipal de Anápolis', 'CADASTRO_FORNECEDOR'], ['Licença sanitária emitida pela vigilância sanitária', 'ALVARA'],
    ['Indicação de engenheiro eletricista como responsável técnico', 'RESPONSAVEL_TECNICO']]) {
    const r = efetivo(a, frase, docs);
    assert.deepEqual(r.tipos, [tipo], frase); assert.equal(r.efetivo, 'A_CONFERIR', frase); assert.match(r.texto, /Confira/);
  }
  assert.deepEqual(efetivo(a, 'Certificado de Regularidade do FGTS (CRF)', docs).tipos, ['CRF_FGTS']);
});

test('revisão MÉDIO 4: "emitida há no máximo N dias" confere a data de emissão contra a sessão', () => {
  const a = amb();
  const frase = 'Certidão negativa de falência emitida há no máximo 60 dias da data da sessão';
  assert.equal(efetivo(a, frase, docsProva(['CERT_FALENCIA'], { CERT_FALENCIA: { EMISSAO: '2026-11-01' } })).efetivo, 'ATENDE');
  const velho = efetivo(a, frase, docsProva(['CERT_FALENCIA'], { CERT_FALENCIA: { EMISSAO: '2026-08-01' } }));
  assert.equal(velho.efetivo, 'VENCE_ANTES'); assert.match(velho.texto, /emitido em 01\/08\/2026, mais de 60 dias antes da sessão \(20\/11\/2026\)/);
  const sem = efetivo(a, 'Certidão simplificada da Junta Comercial emitida nos últimos 30 dias', docsProva(['CERTIDAO_JUNTA']));
  assert.equal(sem.efetivo, 'A_CONFERIR'); assert.match(sem.texto, /escreva a data de emissão/);
});

test('revisão MÉDIO 5: Inmetro sem documento fica "a conferir" (o dono ainda manda); "rastreável ao Inmetro" é rastreabilidade', () => {
  const a = amb();
  const r = efetivo(a, 'A empresa deverá ser autorizada pelo Inmetro para manutenção de balanças', []);
  assert.equal(r.efetivo, 'A_CONFERIR'); assert.match(r.texto, /ainda não está no cadastro/);
  const p = efetivo(a, 'Os serviços deverão ser executados com padrões rastreáveis ao INMETRO', [], { ativos: 1, lista: [{ validade: '2027-01-01' }] });
  assert.deepEqual(p.tipos, ['CERT_PADROES']);
  assert.deepEqual(efetivo(a, 'Calibração rastreável ao Inmetro com certificado da RBC', []).tipos, ['CERT_PADROES']);
});

test('revisão MÉDIO 6: "vence antes da sessão" juntado por documento, das 8h às 18h, importante e sem escalonamento', () => {
  const a = cenario({ agora: '2026-11-02T20:00:00-03:00' });
  // a segunda licitação, com a mesma leitura (a CNDT vence antes nas duas)
  const op2 = Object.assign({}, a.tabelas.LIC_OPORTUNIDADES[0], { ID: 'op_hab2', CODIGO: 'LIC-2026-hab2', CHAVE_FONTE: 'PNCP:op_hab2' });
  a.tabelas.LIC_OPORTUNIDADES.push(op2);
  a.tabelas.LIC_EVENTOS.push({ ID: 'ev_s2', OPORTUNIDADE_ID: 'op_hab2', TIPO: 'SESSAO_PUBLICA', SITUACAO: 'ATIVO', NATUREZA: 'CONFIRMADO', QUANDO_ISO: '2026-11-25T12:00:00.000Z', VERSAO: 1 });
  a.tabelas.LIC_LEITURAS.push(Object.assign({}, a.tabelas.LIC_LEITURAS[0], { ID: 'le2', OPORTUNIDADE_ID: 'op_hab2', CHECKLIST_CHAVE: 'ck2' }));
  a.tabelas.LIC_LEITURA_CHECKLIST.filter((c) => c.CHAVE === 'ck1').forEach((c) => a.tabelas.LIC_LEITURA_CHECKLIST.push(Object.assign({}, c, { ID: c.ID + 'b', OPORTUNIDADE_ID: 'op_hab2', CHAVE: 'ck2' })));
  a.tabelas.LIC_ALERTAS.length = 0;
  a.esquecerProgramacao(); a.rodada('2026-11-02T20:00:00-03:00');
  const s = a.al({ EVENTO_TIPO: 'HAB_SESSAO' });
  assert.equal(s.length, 2, 'um por integrante, não um por licitação'); assert.ok(s.every((x) => x.OPORTUNIDADE_ID === '' && /2 licitações/.test(x.TITULO)));
  assert.match(s[0].TEXTO, /LIC-2026-hab1 .* \| LIC-2026-hab2/); assert.equal(s[0].NIVEL, 'IMPORTANTE'); assert.equal(s[0].PAPEL, 'AVISO');
  assert.equal(s[0].SITUACAO, 'PROGRAMADO'); assert.equal(s[0].LIBERAR_EM, '2026-11-03T11:00:00.000Z', 'às 8h do dia seguinte');
  a.rodada('2026-11-03T08:05:00-03:00'); a.rodada('2026-11-03T10:00:00-03:00');
  assert.ok(a.al({ EVENTO_TIPO: 'HAB_SESSAO' }).every((x) => x.PAPEL === 'AVISO'), 'sem escalonamento nem reenvio');
  assert.equal(a.al({ EVENTO_TIPO: 'HAB_SESSAO' }).length, 2);
  // sem licitação única, o link abre o cadastro
  assert.equal(J(a.ctx.Lic_avisoAbrir_({ userId: 'u_cha', usuario: 'charles', perfil: 'DIRETORIA' }, s[0].AVISO_ID).tela).mod, 'licitacoes_habilitacao');
});

test('revisão MÉDIO 7: avisos de documento não gastam o teto diário dos alertas de prazo (e têm o teto próprio)', () => {
  const a = amb();
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { tetoDia: 1 }, motivo: 'teste do teto diário' }).ok, true);
  const hojeIso = new Date().toISOString(); // 03/11/2026: data de hoje (fixa em 02/11 o teste quebrava depois da meia-noite)
  const enviado = (i, tipo) => ({ ID: 'env' + i, AVISO_ID: 'LA00000e' + String(i).padStart(4, '0'), CHAVE: 'X|' + i, GRUPO: 'X|' + i, TIPO: tipo, USUARIO_ID: 'u_cha', USUARIO_NOME: 'CHARLES', SITUACAO: 'ENVIADO', EMAIL_EM: hojeIso, CRIADO_EM: hojeIso, CIENTE_EM: hojeIso });
  a.tabelas.LIC_ALERTAS.push(enviado(1, 'DOCUMENTO'));
  a.tabelas.LIC_OPORTUNIDADES.push(OP('op_mud', { SITUACAO: 'ANALISE' }));
  a.tabelas.LIC_ALERTAS.push({ ID: 'mud1', AVISO_ID: 'LA0000mud01', CHAVE: 'M|op_mud|x|u_cha', GRUPO: 'M|op_mud|x', OPORTUNIDADE_ID: 'op_mud', CODIGO: 'LIC-mud', TIPO: 'MUDANCA', PAPEL: 'TITULAR', ANTECEDENCIA: 'RETIFICACAO', NIVEL: 'IMPORTANTE', USUARIO_ID: 'u_cha', USUARIO_NOME: 'CHARLES DIRETOR TESTE', TITULO: 'Prazo alterado na fonte', TEXTO: 'mudou', ALVO_ISO: '', LIBERAR_EM: hojeIso, SITUACAO: 'PROGRAMADO', TENTATIVAS: 0 });
  a.ctx.Lic_alertasEnviar_(new Date());
  assert.equal(a.al({ ID: 'mud1' })[0].SITUACAO, 'ENVIADO', 'o aviso de documento de hoje não conta no teto de 1 dos alertas de prazo');
  // teto próprio: com 10 avisos de documento hoje, o 11º vai para o resumo
  for (let i = 2; i <= 10; i++) a.tabelas.LIC_ALERTAS.push(enviado(i, 'DOCUMENTO'));
  a.novo({ tipo: 'CRF_FGTS', validade: '2026-11-05', responsavelId: 'u_cha' }, PDF('crf'));
  const novo = a.al({ EVENTO_TIPO: 'HAB_VALIDADE' })[0];
  assert.equal(novo.SITUACAO, 'PROGRAMADO'); a.ctx.Lic_alertasEnviar_(new Date());
  assert.equal(a.al({ ID: novo.ID })[0].SITUACAO, 'NO_RESUMO'); assert.match(a.al({ ID: novo.ID })[0].CANCELADO_MOTIVO, /Teto de 10 avisos de documento de habilitação/);
});

test('revisão menores 8 e 9: 30/15 dias nunca vão para o WhatsApp, quem desligou o e-mail fica só no SGO+; {{2}} é a Metrolabs e o emissor vai no {{4}}', () => {
  const us = require('./_licitacoes_alertas_ambiente.cjs').USUARIOS.map((u) => Object.assign({}, u)); us[0].EMAIL = '';
  const a = amb({ tabelas: { CAD_USUARIOS: us } });
  a.novo({ tipo: 'CRF_FGTS', validade: '2026-11-25', orgao: 'Caixa Econômica Federal', responsavelId: 'u_cha' }, PDF('crf'));   // 23 dias, Charles sem e-mail
  a.rodada('2026-11-02T10:00:00-03:00');
  const x = a.al({ EVENTO_TIPO: 'HAB_VALIDADE' })[0];
  assert.equal(a.zap().length, 0, 'e-mail falhou e o WhatsApp não entra como alternativo'); assert.notEqual(x.WA_SITUACAO, 'ACEITO');
  // pessoa que desligou o e-mail: o aviso de 15 dias fica só no SGO+
  const b = amb();
  assert.equal(b.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_cha: { email: false } } }, motivo: 'Charles sem e-mail de licitação' }).ok, true);
  b.novo({ tipo: 'CRF_FGTS', validade: '2026-11-12', responsavelId: 'u_cha' }, PDF('crf'));
  b.rodada('2026-11-02T10:00:00-03:00');
  const y = b.al({ EVENTO_TIPO: 'HAB_VALIDADE' })[0];
  assert.equal(y.SITUACAO, 'ENVIADO'); assert.equal(b.emails.length, 0); assert.equal(b.zap().length, 0); assert.match(y.CANAL_ALTERNATIVO, /Só no SGO\+/);
  // 7 dias: parâmetros do modelo
  const c = amb();
  c.novo({ tipo: 'CRF_FGTS', validade: '2026-11-06', orgao: 'Caixa Econômica Federal', responsavelId: 'u_cha' }, PDF('crf'));
  c.rodada('2026-11-02T10:00:00-03:00');
  const p = c.zap()[0].corpo.template.components[0].parameters.map((q) => q.text);
  assert.equal(p[1], 'Metrolabs (documento de habilitação)'); assert.match(p[3], /emissor: Caixa Econômica Federal/);
});

test('revisão menores 10 e 12: aviso de falta reconfere antes de sair; aviso mais novo e renovação tiram os anteriores da faixa "sem ciência"', () => {
  const a = cenario({ agora: '2026-11-02T20:00:00-03:00' });
  a.tabelas.LIC_ALERTAS.length = 0;
  a.esquecerProgramacao(); a.rodada('2026-11-02T20:00:00-03:00');
  const f = a.al({ EVENTO_TIPO: 'HAB_FALTA' })[0];
  assert.equal(f.SITUACAO, 'PROGRAMADO');
  // de madrugada a Diretoria resolve todas as faltas
  const fichaDe = () => { const x = a.tabelas.LIC_OPORTUNIDADES.find((y) => y.ID === 'op_hab1'); return J(a.ctx.Lic_analiseFicha_(x, a.ctx.Lic_lerFonteServidor_(x))); };
  assert.equal(fichaDe().desatualizada, false);
  const aba = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })).habilitacao;
  aba.itens.filter((e) => e.efetivo === 'FALTA').forEach((e) => a.ok(a.hab('s_cha', 'conferir', { id: 'op_hab1', chave: e.chave, decisao: 'ATENDE', motivo: 'conferido no edital, dispensado' })));
  a.rodada('2026-11-03T08:05:00-03:00');
  assert.equal(a.al({ ID: f.ID })[0].SITUACAO, 'CANCELADO'); assert.match(a.al({ ID: f.ID })[0].CANCELADO_MOTIVO, /Não falta mais documento/);
  // 12: o de 30 dias enviado sem ciência sai da faixa quando sai o de 15
  const b = amb();
  b.novo({ tipo: 'CRF_FGTS', validade: '2026-11-25', responsavelId: 'u_cha' }, PDF('crf'));
  b.rodada('2026-11-02T10:00:00-03:00');
  const trinta = b.al({ ANTECEDENCIA: '30 dias' })[0];
  assert.equal(trinta.SITUACAO, 'ENVIADO'); assert.ok(b.ctx.Lic_alertasSemCiencia_(null).some((x) => x.ID === trinta.ID));
  b.esquecerProgramacao(); b.rodada('2026-11-11T10:00:00-03:00');
  assert.equal(b.al({ ID: trinta.ID })[0].SITUACAO, 'CONCLUIDO'); assert.ok(!b.ctx.Lic_alertasSemCiencia_(null).some((x) => x.ID === trinta.ID));
  assert.equal(b.ctx.Lic_alertasSemCiencia_(null).filter((x) => x.TIPO === 'DOCUMENTO').length, 1, 'só o mais novo espera a ciência');
});

test('revisão menores 11, 13 e 14: arquivo só é gravado quando entra; data do banco como Date; LIC_EVENTOS lido uma vez', () => {
  const a = amb();
  const buf = PDF('cndt');
  const d = a.novo({ tipo: 'CNDT', validade: '2026-12-01' }, buf);
  assert.equal(Object.keys(a.arquivos).length, 1);
  a.ok(a.hab('s_cha', 'salvar', { id: d.id, campos: { numero: '' }, arquivo: { nome: 'x.pdf', base64: b64(buf) }, motivo: 'mesmo arquivo de novo' }));
  a.ok(a.hab('s_cha', 'salvar', { id: d.id, campos: { numero: 'N-2' }, arquivo: { nome: 'x.pdf', base64: b64(buf) }, motivo: 'número novo, mesmo arquivo' }));
  assert.equal(Object.keys(a.arquivos).length, 1, 'nenhum arquivo órfão gravado');
  assert.match(a.hab('s_cha', 'salvar', { id: d.id, campos: { validade: 'xx' }, arquivo: { nome: 'y.pdf', base64: b64(PDF('outro')) }, motivo: 'data errada com arquivo novo' }).message, /data válida/);
  assert.equal(Object.keys(a.arquivos).length, 1, 'recusa não deixa arquivo');
  // 13
  assert.equal(a.ctx.LicH_dia_(new Date('2026-11-02T01:00:00Z')), '2026-11-01', 'Date do banco no dia de Brasília');
  assert.equal(a.ctx.LicH_situacao_({ TIPO: 'CNDT', VALIDADE: new Date('2026-11-01T15:00:00Z') }, '2026-11-02').codigo, 'VENCIDO');
  // 14
  const c = cenario();
  const ops = { op_hab1: c.tabelas.LIC_OPORTUNIDADES[0] }, cfg = c.ctx.Lic_alertasCfg_(), ms = Date.now();
  const al = [1, 2, 3].map((i) => ({ ID: 'f' + i, TIPO: 'DOCUMENTO', GRUPO: 'D|F|op_hab1|2026-11-20', OPORTUNIDADE_ID: 'op_hab1', SITUACAO: 'PROGRAMADO' }));
  const getAll = c.ctx.SGO_DATA.getAll; let leituras = 0;
  c.ctx.SGO_DATA.getAll = (t) => { if (t === 'LIC_EVENTOS') leituras++; return getAll(t); };
  c.ctx.LICH_CACHE_AV = { ms: null, docs: null, ctx: null };
  al.forEach((x) => assert.equal(c.ctx.LicH_alertaSemValer_(x, ops, cfg, ms), ''));
  c.ctx.SGO_DATA.getAll = getAll;
  assert.equal(leituras, 1, 'uma leitura de LIC_EVENTOS para os três avisos');
});

// ---------------------------------------------------------------- reconferência de 14fb85b
test('reconferência 1 (GRAVE): "Distrito Federal" é a esfera distrital, não a certidão federal', () => {
  const a = amb();
  const so = docsProva(['CND_FEDERAL']), tres = docsProva(['CND_FEDERAL', 'CND_ESTADUAL', 'CND_MUNICIPAL']);
  const r = efetivo(a, 'Certidão negativa de débitos com a Fazenda Pública do Distrito Federal', so);
  assert.notEqual(r.efetivo, 'ATENDE'); assert.deepEqual(r.tipos, ['CND_ESTADUAL'], 'antes: CND_FEDERAL (casava "federal")'); assert.equal(r.efetivo, 'FALTA');
  const r2 = efetivo(a, 'Certidão negativa de débitos com a Fazenda Pública do Distrito Federal', tres);
  assert.equal(r2.efetivo, 'A_CONFERIR'); assert.match(r2.texto, /Distrito Federal, fora da matriz/);
  assert.equal(efetivo(a, 'Certidão conjunta da Receita Federal e da Procuradoria-Geral da Fazenda Nacional', so).efetivo, 'ATENDE', 'a federal continua valendo');
});

test('reconferência 2 (MÉDIO): INSS, previdência e seguridade são da certidão federal; regularidade com órgão não reconhecido fica "a conferir"', () => {
  const a = amb();
  const r = efetivo(a, 'CNDT e prova de regularidade com o INSS', docsProva(['CNDT']));
  assert.deepEqual(r.tipos.sort(), ['CNDT', 'CND_FEDERAL']); assert.equal(r.efetivo, 'FALTA', 'antes: ATENDE só com a CNDT');
  assert.equal(efetivo(a, 'CNDT e prova de regularidade com o INSS', docsProva(['CNDT', 'CND_FEDERAL'])).efetivo, 'ATENDE', 'com a CNDT e a certidão federal (conjunta, que cobre o INSS)');
  assert.deepEqual(efetivo(a, 'Certidão negativa de débitos relativos às contribuições previdenciárias', docsProva(['CND_FEDERAL'])).tipos, ['CND_FEDERAL']);
  assert.equal(efetivo(a, 'Certidão negativa de débitos relativos às contribuições previdenciárias', docsProva(['CND_FEDERAL'])).efetivo, 'ATENDE');
  const d = efetivo(a, 'Certidão negativa de débitos trabalhistas e prova de regularidade junto ao SEST/SENAT', docsProva(['CNDT']));
  assert.equal(d.efetivo, 'A_CONFERIR'); assert.match(d.texto, /regularidade com "sest", que o sistema não reconhece/);
});

test('reconferência 3 (MENOR): procuração com poderes específicos ou firma reconhecida fica "a conferir"', () => {
  const a = amb();
  const docs = docsProva(['PROCURACAO']);
  assert.equal(efetivo(a, 'Procuração do representante legal da empresa', docs).efetivo, 'ATENDE');
  for (const frase of ['Procuração com poderes específicos para formular lances e praticar todos os atos', 'Instrumento de mandato (procuração) com firma reconhecida em cartório']) {
    const r = efetivo(a, frase, docs);
    assert.equal(r.efetivo, 'A_CONFERIR', frase); assert.match(r.texto, /poderes específicos ou firma reconhecida/);
  }
});

test('ajuste final 1: a documentação da nota sai do cruzamento da habilitação (código), sem reanálise em massa; sem documento, vale a regra antiga', () => {
  const a = cenario();
  const l = a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === 'op_hab1');
  // cruzamento do cenário: 1 atende, 3 a conferir, 3 falta, 1 vence antes da sessão (8 exigências)
  const d = J(a.ctx.Lic_docHabilitacao_(l, null));
  assert.deepEqual(d.criterio.contagens, { total: 8, atende: 1, aConferir: 3, falta: 3, venceAntes: 1, naoAtende: 0 });
  assert.equal(d.criterio.pontos, 4.7, '15 × (1 + 3 × 0,5) / 8');
  assert.equal(d.criterio.origem, 'HABILITACAO');
  assert.match(d.criterio.como, /Calculado pelo sistema, não pela IA/);
  assert.equal(d.afirmacoes.length, 2);
  assert.ok(d.afirmacoes.every((x) => x.tipo === 'PENDENCIA' && x.origem === 'SISTEMA' && x.criterio === 'documentacao'));
  // a nota usa o critério do código (os 7,5 da IA são ignorados)
  const saida = { capacidade: { pontos: 10, como: '', justificativa: '' }, documentacao: { pontos: 7.5, justificativa: 'da IA', exigencias: [] }, riscos: [], travas: [] };
  const codigo = { criterios: { margem: { pontos: 5, peso: 15 }, localizacao: { pontos: 0, peso: 15 }, prazo: { pontos: 0, peso: 10 }, valor: { pontos: 0, peso: 10 } }, prazo: { vencido: false } };
  const pesos = J(a.ctx.LIC_NOTA_PADRAO);
  assert.equal(J(a.ctx.Lic_notaFinal_(saida, codigo, pesos, {}, d)).criterios.documentacao.pontos, 4.7);
  assert.equal(J(a.ctx.Lic_notaFinal_(saida, codigo, pesos, {})).criterios.documentacao.pontos, 7.5, 'sem o cruzamento: a regra antiga (IA, metade)');
  // base: análise antiga (sem assinatura) não muda de base, mesmo com documentos no cadastro (nada de reanálise em massa)
  const antiga = a.tabelas.LIC_ANALISES.find((x) => x.ID === 'an1');
  assert.equal(a.ctx.Lic_habBase_(l, antiga), '');
  assert.equal(a.ctx.Lic_baseAnalise_(l, null, null, pesos, ''), a.ctx.Lic_baseAnalise_(l, null, null, pesos));
  // análise já pontuada pelo cruzamento: a base acompanha a habilitação DESTA oportunidade
  antiga.CRITERIOS_JSON = JSON.stringify({ documentacao: d.criterio });
  assert.equal(a.ctx.Lic_habBase_(l, antiga), d.assinatura);
  const bal = a.novo({ tipo: 'BALANCO', validade: '2027-05-31', palavras: 'exercícios sociais' }, PDF('balanco'));
  const d2 = J(a.ctx.Lic_docHabilitacao_(l, null));
  assert.equal(d2.criterio.contagens.atende, 2); assert.notEqual(d2.assinatura, d.assinatura, 'o balanço cadastrado muda a habilitação desta oportunidade');
  assert.equal(a.ctx.Lic_habBase_(l, antiga), d2.assinatura);
  // outra oportunidade sem exigências: o cruzamento não pontua (vale a regra antiga)
  a.tabelas.LIC_OPORTUNIDADES.push(OP('op_vaz', { SITUACAO: 'ANALISE' }));
  assert.equal(a.ctx.Lic_docHabilitacao_(a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === 'op_vaz'), null), null);
  // sem nenhum documento em uso: comportamento atual
  a.tabelas.LIC_HAB_DOCUMENTOS.forEach((x) => { x.ATIVO = 'NAO'; });
  assert.equal(a.ctx.Lic_docHabilitacao_(l, null), null);
  void bal;
});

test('ajuste final 1: a análise grava a documentação do cruzamento e a base com a assinatura; a habilitação mudada desatualiza só esta oportunidade', () => {
  const a = cenario();
  a.props.GEMINI_API_KEY = 'chave-de-teste';
  a.ctx.SGO_LICITACOES = { listar: () => ({ itens: [] }), obter: () => ({ itens: [] }), arquivos: () => ({ arquivos: [], baseHash: 'b'.repeat(64) }), textos: () => [] };
  a.ctx.SGO_DocA4_chamarGemini_ = () => '{}';
  const exig = [{ texto: 'Exige FGTS', fonte: { ref: 'A1', trecho: 'Prova de regularidade relativa ao Fundo de Garantia por Tempo de Serviço (FGTS).' } }];
  // o verificador é o da etapa 2 (testado em licitacoes_analise); aqui a resposta aceita é simulada
  a.ctx.Lic_verificarAnalise_ = () => ({ ok: true, saida: { resumo: 'Resumo. Teste.', capacidade: { pontos: 0, itens: [], justificativa: '', como: '' }, documentacao: { pontos: 7.5, justificativa: 'da IA', exigencias: exig }, riscos: [], travas: [], afirmacoes: [] } });
  const l = a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === 'op_hab1');
  const r = J(a.ctx.Lic_analisar_({ id: 'u_cha', nome: 'CHARLES DIRETOR TESTE' }, l, { origem: 'PEDIDO', motivo: 'teste do cruzamento', forcar: true }));
  assert.equal(r.analisada, true);
  const an = a.tabelas.LIC_ANALISES.filter((x) => x.OPORTUNIDADE_ID === 'op_hab1').sort((x, y) => y.VERSAO - x.VERSAO)[0];
  const crit = JSON.parse(an.CRITERIOS_JSON);
  assert.equal(crit.documentacao.origem, 'HABILITACAO');
  assert.ok(crit.documentacao.habAssinatura);
  assert.ok(JSON.parse(an.AFIRMACOES_JSON).some((x) => x.origem === 'SISTEMA' && /^Habilitação:/.test(x.texto)));
  const op = a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === 'op_hab1');
  assert.equal(op.ANALISE_BASE_HASH, an.BASE_HASH);
  // de novo, sem forçar: a base é a mesma (a assinatura gravada é a das exigências desta análise)
  assert.equal(J(a.ctx.Lic_analisar_(null, op, { origem: 'AUTOMATICA' })).semMudanca, true);
  // a Diretoria marca "não atende" numa exigência: só então a base desta oportunidade muda
  const fichaDe = () => { const x = a.tabelas.LIC_OPORTUNIDADES.find((y) => y.ID === 'op_hab1'); return J(a.ctx.Lic_analiseFicha_(x, a.ctx.Lic_lerFonteServidor_(x))); };
  assert.equal(fichaDe().desatualizada, false);
  const aba = a.ok(a.hab('s_cha', 'aba', { id: 'op_hab1' })).habilitacao;
  const alvo = aba.itens.find((x) => x.efetivo === 'ATENDE');
  a.ok(a.hab('s_cha', 'conferir', { id: 'op_hab1', chave: alvo.chave, decisao: 'NAO_ATENDE', motivo: 'Documento não serve para este edital' }));
  assert.equal(fichaDe().desatualizada, true);
});
