// SGO+ Licitações, contratos conquistados e integração com os módulos (02/11/2026): contrato a partir do resultado homologado
// (LIC_DISPUTAS.CONTRATO_JSON) ou registrado manualmente com motivo, versões com hash encadeado (aditivo como versão nova, nada apagado),
// arquivo assinado restrito com SHA-256, prazos na agenda com os alertas, cliente localizado pelo CNPJ ou criado só por ação explícita
// (sem duplicar o CNPJ), Comercial (oportunidade ganha, sem proposta), agenda única, planejamento da execução sem O.S., previsão de
// faturamento, relatório A4 imutável, permissão e telas (computador e 390 px). Código real num contexto isolado. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambienteContratos, PDF, ok } = require('./_licitacoes_contratos_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));
const contar = (a) => ({ cli: (a.tabelas.CAD_CLIENTES || []).length, un: (a.tabelas.CAD_UNIDADES || []).length, opo: (a.tabelas.COM_OPORTUNIDADES || []).length, prop: (a.tabelas.COM_PROPOSTAS || []).length,
  atv: (a.tabelas.ATV_ATIVIDADES || []).length, os: (a.tabelas.ATEC_OS || []).length, cham: (a.tabelas.ATEC_CHAMADOS || []).length, req: (a.tabelas.CMP_REQUISICOES || []).length });

test('contrato a partir do CONTRATO_JSON: itens e valores do resultado homologado, versão 1 com hash, Kanban Resultado → Contrato com motivo e histórico; nada criado em outro módulo', () => {
  // disputa sem resultado concluído: a prévia diz o que fazer e criar recusa sem gravar
  const s = ambienteContratos({ concluir: false });
  const p0 = s.tela().previa;
  assert.equal(p0.resultado.pode, false); assert.ok(p0.resultado.bloqueios.some((b) => /Concluir o resultado.*aba Disputa/.test(b)));
  assert.match(s.c('criar', { origem: 'RESULTADO', motivo: 'Contrato assinado recebido', campos: s.CAMPOS() }).message, /Não foi possível registrar pelo resultado.*Nada foi gravado/);
  assert.equal((s.tabelas.LIC_CONTRATOS || []).length, 0);
  // homologação pendente: não está pronto; o registro manual continua possível
  const h = ambienteContratos({ homologacao: '' });
  const ph = h.tela().previa;
  assert.equal(ph.resultado.pode, false); assert.ok(ph.resultado.bloqueios.some((b) => /Falta a data da homologação.*registro manual/.test(b))); assert.equal(ph.manual.pode, true);
  const a = ambienteContratos();
  const antes = contar(a);
  const pv = a.tela().previa;
  assert.equal(pv.resultado.pode, true); assert.deepEqual(J(pv.resultado.base.itens.map((i) => [i.item, i.codigo, i.quantidade, i.valorUnit, i.homologacao])), [['1', 'CAL-001', 100, 185, '2026-11-24']]);
  assert.equal(pv.resultado.base.orgaoNome, 'HOSPITAL MUNICIPAL TESTE');
  // validações: nada gravado
  const cam = a.CAMPOS();
  const recusa = (campos, rx, extra) => { const r = a.c('criar', Object.assign({ origem: 'RESULTADO', motivo: 'Contrato assinado recebido do órgão', campos: Object.assign(a.CAMPOS(), campos) }, extra || {})); assert.equal(r.ok, false, String(rx)); assert.match(r.message, rx); };
  recusa({}, /motivo do registro/, { motivo: 'curto' });
  recusa({ numeroContrato: '' }, /número do contrato/);
  recusa({ fim: '2026-11-01' }, /não pode ser antes do início/);
  recusa({ fim: '2037-12-31' }, /passa de 10 anos/);
  recusa({ itens: [{ item: '1', codigo: 'CAL-001', quantidade: 100, valorUnit: '190,00' }] }, /diferente do homologado.*Nada foi gravado/);
  recusa({ itens: [{ item: '1', codigo: 'CAL-001', quantidade: 120, valorUnit: 185 }] }, /passa da ganha no resultado/);
  recusa({ itens: [{ item: '2', codigo: 'CAL-002', quantidade: 10, valorUnit: 390 }] }, /não é um item ganho/);
  recusa({ reajusteDataBase: '' }, /índice.*e a data-base/);
  recusa({ reajusteFonte: '' }, /de onde vem o reajuste/);
  recusa({ garantiaValidade: '' }, /validade da garantia/);
  recusa({ garantiaValor: '925.00' }, /use vírgula para os centavos/);
  recusa({ entregas: [{ descricao: 'Lote sem data' }] }, /prazo da entrega 1/);
  recusa({ responsavelId: 'u_ven' }, /responsável pelo contrato na lista/);
  recusa({ renovacaoDecidirAte: '2027-12-31' }, /antes do fim da vigência/);
  const ruim = { nome: 'contrato.pdf', base64: Buffer.from('texto qualquer').toString('base64') };
  assert.match(a.c('criar', { origem: 'RESULTADO', motivo: 'Contrato assinado recebido do órgão', campos: cam, arquivo: ruim }).message, /não é um PDF de verdade/);
  assert.equal((a.tabelas.LIC_CONTRATOS || []).length, 0); assert.equal(a.op().SITUACAO, 'RESULTADO');
  // registra
  const r = a.criar({ arquivo: PDF() });
  assert.match(r.texto, /Contrato LIC-2026-0001-CT registrado \(versão 1\).*"Contrato" no Kanban; 8 prazo\(s\)/);
  const ct = a.tabelas.LIC_CONTRATOS[0], v = a.tabelas.LIC_CONTRATO_VERSOES[0], dados = JSON.parse(v.DADOS_JSON);
  assert.equal(ct.NUMERO, 'LIC-2026-0001-CT'); assert.equal(ct.ORIGEM, 'RESULTADO'); assert.equal(ct.VALOR_TOTAL, 18500); assert.equal(ct.VIGENCIA_FIM, '2027-11-30'); assert.equal(ct.VERSAO, 1); assert.equal(ct.VERSAO_HASH, v.HASH);
  assert.equal(ct.DISPUTA_ID, a.tabelas.LIC_DISPUTAS[0].ID);
  assert.equal(v.TIPO, 'ORIGINAL'); assert.equal(v.HASH_ANTERIOR, ''); assert.equal(v.DADOS_HASH, a.ctx.Lic_hash_(v.DADOS_JSON)); assert.equal(v.ARQUIVO_SHA256.length, 64);
  assert.deepEqual(dados.itens.map((i) => [i.item, i.quantidade, i.valorUnit, i.total, i.homologacao]), [['1', 100, 185, 18500, '2026-11-24']]);
  assert.equal(dados.origem.tipo, 'RESULTADO'); assert.equal(dados.responsavelNome, 'DORA DIRETORA TESTE'); assert.equal(dados.garantiaValor, 925);
  assert.equal(a.arquivos[v.ARQUIVO_ID].acesso, 'RESTRITO', 'arquivo restrito');
  // Kanban e histórico
  assert.equal(a.op().SITUACAO, 'CONTRATO');
  const hs = a.hist('CONTRATO_REGISTRADO');
  assert.equal(hs.length, 1); assert.equal(hs[0].DE, 'RESULTADO'); assert.equal(hs[0].PARA, 'CONTRATO'); assert.equal(hs[0].FONTE, 'Contratos');
  assert.match(hs[0].TEXTO, /resultado homologado.*contrato 012\/2026, vigência 01\/12\/2026 a 30\/11\/2027, 1 item\(ns\), total R\$\s18\.500,00.*SHA-256.*Motivo: Contrato assinado recebido/);
  const kb = a.ctx.Lic_kanban_({ id: 'u_dir', gestao: true }, {});
  assert.deepEqual(J(kb.colunas.find((c) => c.codigo === 'CONTRATO').cartoes.map((c) => c.id)), ['op1']); assert.equal(kb.colunas.find((c) => c.codigo === 'CONTRATO').futura, '');
  // nenhum registro em outro módulo sem ação explícita
  assert.deepEqual(contar(a), antes);
  // um contrato por licitação
  assert.match(a.c('criar', { origem: 'RESULTADO', motivo: 'Registrar de novo por engano', campos: cam }).message, /já tem contrato registrado/);
  // tela da ficha
  const t = a.tela().contrato;
  assert.equal(t.cadeia.integra, true); assert.equal(t.situacaoTela.codigo, 'AGUARDANDO'); assert.equal(t.versoes.length, 1); assert.equal(t.arquivo.sha256, v.ARQUIVO_SHA256);
});

test('Kanban: Resultado → Contrato pelas regras (explica e abre a aba Contrato); Contrato não sai pelo quadro; registro manual com motivo e fonte', () => {
  const a = ambienteContratos();
  const g = a.ctx.Lic_kanbanRegras_();
  assert.equal(g['RESULTADO>CONTRATO'].acao, undefined); assert.match(g['RESULTADO>CONTRATO'].porque, /aba Contrato.*Ao gravar, com o motivo/); assert.equal(g['RESULTADO>CONTRATO'].aba, 'contrato');
  assert.match(g['ANALISE>CONTRATO'].porque, /registrado manualmente.*aba Contrato/); assert.match(g['DESCARTADA>CONTRATO'].porque, /Reabra primeiro/); assert.equal(g['DISPUTA>CONTRATO'].aba, 'disputa');
  assert.match(g['CONTRATO>RADAR'].porque, /fica em Contrato.*versões/);
  assert.match(a.ctx.Licitacoes_api('s_dora', 'kanbanMover', { id: 'op1', para: 'CONTRATO', situacao: 'RESULTADO', motivo: 'Contrato assinado hoje cedo' }).message, /aba Contrato.*Nada foi alterado/);
  assert.equal(a.op().SITUACAO, 'RESULTADO');
  // manual (op2 sem disputa, em análise)
  const m = (d) => a.ct('s_dora', 'criar', Object.assign({ id: 'op2', origem: 'MANUAL', motivo: 'Resultado da disputa feito fora do SGO+, no portal do órgão', fonte: 'termo de homologação publicado no PNCP em 20/11/2026',
    campos: { numeroContrato: 'CT 45/2026', inicio: '2026-12-01', fim: '2027-05-31', itens: [{ item: '1', codigo: 'QUA-001', nome: 'Qualificação de autoclave', quantidade: '2', valorUnit: '3.200,00' }] } }, d));
  assert.match(m({ motivo: 'Motivo curto demais' }).message, /pelo menos 20 letras/);
  assert.match(m({ fonte: '' }).message, /fonte do resultado/);
  assert.match(m({ campos: { numeroContrato: 'CT 45/2026', inicio: '2026-12-01', fim: '2027-05-31', itens: [] } }).message, /pelo menos um item/);
  assert.match(m({ campos: { numeroContrato: 'CT 45/2026', inicio: '2026-12-01', fim: '2027-05-31', itens: [{ item: '1', nome: 'X', quantidade: '1.0', valorUnit: '10,00' }] } }).message, /quantidade do item 1/);
  a.tabelas.LIC_OPORTUNIDADES[1].SITUACAO = 'DESCARTADA';
  assert.match(m().message, /descartada: reabra antes/);
  a.tabelas.LIC_OPORTUNIDADES[1].SITUACAO = 'ANALISE';
  const r = ok(m());
  assert.match(r.texto, /LIC-2026-0002-CT registrado/); assert.match(r.texto, /Falta anexar o contrato assinado/);
  const ct = a.tabelas.LIC_CONTRATOS.find((x) => x.OPORTUNIDADE_ID === 'op2'), d = JSON.parse(a.tabelas.LIC_CONTRATO_VERSOES.find((x) => x.CONTRATO_ID === ct.ID).DADOS_JSON);
  assert.equal(ct.ORIGEM, 'MANUAL'); assert.equal(ct.VALOR_TOTAL, 6400); assert.equal(d.origem.fonte, 'termo de homologação publicado no PNCP em 20/11/2026'); assert.equal(d.tipo, 'CONTRATO');
  assert.equal(a.op('op2').SITUACAO, 'CONTRATO');
  assert.equal(a.hist('CONTRATO_REGISTRADO').filter((x) => x.ENTIDADE_ID === 'op2')[0].DE, 'ANALISE');
  // disputa aberta: conclua antes
  const b = ambienteContratos({ concluir: false });
  assert.match(b.c('criar', { origem: 'MANUAL', motivo: 'Tentar registrar com a disputa ainda aberta', fonte: 'ata da sessão', campos: b.CAMPOS() }).message, /disputa está aberta: conclua o resultado/);
});

test('prazos na agenda: marcos do contrato (início, fim, renovação, reajuste, garantia, entregas, obrigações) confirmados, com alertas da Diretoria; o recálculo pela fonte não mexe neles', () => {
  const a = ambienteContratos();
  a.criar();
  const ev = a.evs();
  assert.deepEqual(J(ev.map((e) => [e.TIPO, e.QUANDO_TEXTO]).sort()), [['CONTRATO_ENTREGA', '2027-01-15'], ['CONTRATO_ENTREGA', '2027-06-15'], ['CONTRATO_FIM', '2027-11-30'], ['CONTRATO_GARANTIA', '2028-02-28'], ['CONTRATO_INICIO', '2026-12-01'],
    ['CONTRATO_OBRIGACAO', '2026-12-05'], ['CONTRATO_REAJUSTE', '2027-11-20'], ['CONTRATO_RENOVACAO', '2027-10-01']]);
  const fim = ev.find((e) => e.TIPO === 'CONTRATO_FIM');
  assert.equal(fim.NATUREZA, 'CONFIRMADO'); assert.equal(fim.FONTE, 'CONTRATO'); assert.equal(fim.DIA_TODO, 'SIM'); assert.equal(fim.QUANDO_ISO, '2027-12-01T02:59:00.000Z'); assert.equal(fim.LIMITE_INTERNO_ISO, '2027-11-30T12:00:00.000Z');
  assert.equal(fim.CONFIRMADO_POR_NOME, 'DORA DIRETORA TESTE'); assert.match(fim.FONTE_REF, /Contrato 012\/2026 \(LIC-2026-0001-CT\), versão 1/); assert.match(fim.REGRA, /Lei 14\.133\/2021, arts\. 106 e 107/);
  assert.match(ev.find((e) => e.TIPO === 'CONTRATO_RENOVACAO').REGRA, /60 dias antes do fim/); assert.match(ev.find((e) => e.TIPO === 'CONTRATO_REAJUSTE').NOME, /Reajuste \(IPCA\).*1º ano da data-base/);
  assert.equal(a.hist('AGENDA_CONTRATO').length, 1);
  // alertas programados para a Diretoria (antecedências dos tipos de contrato)
  const al = (a.tabelas.LIC_ALERTAS || []).filter((x) => /^CONTRATO_/.test(x.EVENTO_TIPO));
  assert.ok(al.length > 0); assert.ok(al.some((x) => x.EVENTO_TIPO === 'CONTRATO_FIM' && x.ANTECEDENCIA_MIN === 43200)); assert.ok(al.every((x) => x.USUARIO_ID === 'u_dir' || x.USUARIO_ID === 'u_adm'));
  assert.deepEqual(J(a.ctx.LIC_ALERTAS_PADRAO.antecedencias.CONTRATO_FIM.map((x) => x.min)), [43200, 10080, 1440]);
  assert.match(a.ctx.Lic_acaoAlerta_({ TIPO: 'PRAZO', EVENTO_TIPO: 'CONTRATO_RENOVACAO' }, a.op()), /decidir se renova/);
  // a fonte revogou a licitação e a agenda foi recalculada: os marcos do contrato continuam valendo
  a.op().SITUACAO_FONTE = 'Revogada';
  a.ctx.Lic_agendaAtualizar_({ ids: ['op1'] });
  assert.ok(a.evs().every((e) => e.SITUACAO === 'ATIVO'), 'contrato fora do alcance da fonte');
  const pz = a.ctx.Lic_prazosFicha_(a.op());
  assert.ok(pz.eventos.some((e) => e.tipo === 'CONTRATO_FIM'));
});

test('aditivo como versão nova: hash encadeado, versão 1 intacta, prazos retificados por versão, aviso de 25%; correção, encerramento e cadeia quebrada', () => {
  const a = ambienteContratos();
  a.criar();
  const v1 = Object.assign({}, a.tabelas.LIC_CONTRATO_VERSOES[0]);
  const ver = (d) => a.c('versao', d);
  assert.match(ver({ tipo: 'ADITIVO', motivo: 'Prorrogação por mais 12 meses', fonte: 'termo aditivo no PNCP', campos: { fim: '2028-11-30' } }).message, /número do termo aditivo/);
  assert.match(ver({ tipo: 'ADITIVO', aditivoNumero: '1º', motivo: 'Prorrogação por mais 12 meses', campos: { fim: '2028-11-30' } }).message, /Escreva a fonte/);
  assert.match(ver({ tipo: 'QUALQUER', motivo: 'Tipo que não existe aqui' }).message, /Escolha o tipo da versão/);
  assert.match(ver({ tipo: 'APOSTILAMENTO', motivo: 'Reajuste com prazo junto', fonte: 'apostila 1', campos: { fim: '2028-11-30' } }).message, /apostilamento registra o reajuste/);
  // nada mudou: nenhuma versão
  const sm = ok(ver({ tipo: 'CORRECAO', motivo: 'Conferência sem mudança', campos: { numeroContrato: '012/2026' } }));
  assert.equal(sm.semMudanca, true); assert.equal(a.tabelas.LIC_CONTRATO_VERSOES.length, 1);
  // aditivo: prorrogação e acréscimo acima de 25%
  const r = ok(ver({ tipo: 'ADITIVO', aditivoNumero: '1º termo aditivo', motivo: 'Prorrogação por 12 meses e acréscimo de quantidade', fonte: 'termo aditivo publicado no PNCP em 10/11/2027',
    campos: { fim: '2028-11-30', itens: [{ item: '1', codigo: 'CAL-001', nome: 'Calibração de termômetro digital', quantidade: 130, valorUnit: 185 }] }, arquivo: PDF('aditivo 1') }));
  assert.match(r.texto, /1º termo aditivo gravado como versão 2.*Atenção: Valor total R\$\s24\.050,00 passa de 25% acima do valor inicial \(R\$\s18\.500,00\)/);
  const vs = a.tabelas.LIC_CONTRATO_VERSOES;
  assert.equal(vs.length, 2); assert.deepEqual(vs[0], v1, 'a versão 1 não muda');
  assert.equal(vs[1].VERSAO, 2); assert.equal(vs[1].TIPO, 'ADITIVO'); assert.equal(vs[1].HASH_ANTERIOR, v1.HASH); assert.equal(vs[1].ADITIVO_NUMERO, '1º termo aditivo');
  assert.match(vs[1].MUDOU, /Fim da vigência: 30\/11\/2027 → 30\/11\/2028.*Valor total: R\$\s18\.500,00 → R\$\s24\.050,00.*Arquivo: contrato-assinado\.pdf \(SHA-256 [0-9a-f]{64}\)\. Avisos: Valor total/);
  assert.match(vs[1].MUDOU, /Itens: 1 item\(ns\): 1 100 × R\$\s185,00 → 1 item\(ns\): 1 130 × R\$\s185,00/);
  const ct = a.tabelas.LIC_CONTRATOS[0];
  assert.equal(ct.VERSAO, 2); assert.equal(ct.VIGENCIA_FIM, '2028-11-30'); assert.equal(ct.VALOR_TOTAL, 24050); assert.equal(ct.VERSAO_HASH, vs[1].HASH);
  assert.equal(a.hist('CONTRATO_VERSAO').length, 1); assert.match(a.hist('CONTRATO_VERSAO')[0].PARA, /versão 2 \(1º termo aditivo\)/);
  // prazos: o fim antigo fica RETIFICADO e o novo é a versão 2; o reajuste do 2º ano entra
  const fins = a.evs(true).filter((e) => e.TIPO === 'CONTRATO_FIM').map((e) => [e.VERSAO, e.SITUACAO, e.QUANDO_TEXTO]);
  assert.deepEqual(J(fins), [[1, 'RETIFICADO', '2027-11-30'], [2, 'ATIVO', '2028-11-30']]);
  assert.match(a.evs(true).find((e) => e.TIPO === 'CONTRATO_FIM' && e.VERSAO === 2).MOTIVO_MUDANCA, /1º termo aditivo \(versão 2\): Fim da vigência.*para/);
  assert.equal(a.evs().filter((e) => e.TIPO === 'CONTRATO_REAJUSTE').length, 2);
  assert.equal(a.evs().find((e) => e.TIPO === 'CONTRATO_RENOVACAO').QUANDO_TEXTO, '2028-10-01');
  // correção de valor de contrato do resultado: aviso de diferente do homologado
  const c = ok(ver({ tipo: 'CORRECAO', motivo: 'Valor do contrato assinado é outro', campos: { itens: [{ item: '1', codigo: 'CAL-001', nome: 'Calibração', quantidade: 130, valorUnit: '186,00' }] } }));
  assert.match(c.texto, /Item 1: valor unitário R\$\s186,00 diferente do homologado \(R\$\s185,00\)/);
  // apostilamento: só o reajuste (o que a tela manda)
  const ap = ok(ver({ tipo: 'APOSTILAMENTO', motivo: 'Reajuste anual pelo IPCA', fonte: 'apostila 1 publicada no PNCP', campos: { itens: [{ item: '1', codigo: 'CAL-001', nome: 'Calibração', quantidade: 130, valorUnit: '192,40' }], reajusteIndice: 'IPCA', reajusteDataBase: '2026-11-20', reajusteFonte: 'cláusula 8 do contrato', obs: '' } }));
  assert.match(ap.texto, /Apostilamento \(reajuste\) gravado como versão 4/); assert.equal(a.tabelas.LIC_CONTRATOS[0].VALOR_TOTAL, 25012);
  // encerramento cancela os prazos; depois só correção
  assert.match(ver({ tipo: 'ENCERRAMENTO', motivo: 'Contrato cumprido antes do prazo', fonte: 'termo de encerramento', campos: {} }).message, /encerrado \(cumprido\) ou rescindido/);
  const e = ok(ver({ tipo: 'ENCERRAMENTO', motivo: 'Rescisão amigável pedida pelo órgão', fonte: 'termo de rescisão publicado no PNCP', campos: { situacao: 'RESCINDIDO' } }));
  assert.match(e.texto, /Encerramento gravado como versão 5.*cancelado/);
  assert.equal(a.evs().filter((x) => x.SITUACAO === 'ATIVO').length, 0); assert.ok(a.evs().every((x) => x.SITUACAO === 'CANCELADO' && /Contrato rescindido/.test(x.MOTIVO_MUDANCA)));
  assert.match(ver({ tipo: 'ADITIVO', aditivoNumero: '2º', motivo: 'Aditivo depois da rescisão', fonte: 'termo', campos: { fim: '2029-11-30' } }).message, /está rescindido: só cabe correção/);
  assert.equal(a.tela().contrato.situacaoTela.codigo, 'RESCINDIDO');
  // cadeia quebrada: a versão mexida na planilha para as gravações
  a.tabelas.LIC_CONTRATO_VERSOES[1].MOTIVO = 'mexido na planilha';
  assert.match(ver({ tipo: 'CORRECAO', motivo: 'Correção depois da quebra', campos: { obs: 'teste' } }).message, /alterado fora do SGO\+ \(a versão 2 foi mudada\).*avise o Administrador/);
  const t = a.tela().contrato; assert.equal(t.cadeia.integra, false); assert.equal(t.versoes.find((v) => v.versao === 2).integra, false);
});

test('arquivo assinado: restrito com SHA-256; abrir confere o hash; alterado fora do SGO+ não é entregue', () => {
  const a = ambienteContratos();
  a.criar({ arquivo: PDF('contrato original') });
  const v = a.tabelas.LIC_CONTRATO_VERSOES[0];
  const r = ok(a.c('arquivo'));
  assert.equal(r.sha256, v.ARQUIVO_SHA256); assert.equal(r.tipo, 'application/pdf'); assert.equal(Buffer.from(r.base64, 'base64').toString('utf8'), '%PDF-1.4\ncontrato original\n%%EOF');
  assert.ok(a.hist('CONTRATO_ARQUIVO_ABERTO').length === 1);
  a.arquivos[v.ARQUIVO_ID].bytes = Buffer.from('%PDF-1.4\nalterado\n%%EOF');
  assert.match(a.c('arquivo').message, /não confere com o SHA-256 registrado.*Nada foi entregue/);
  assert.equal(a.hist('CONTRATO_ARQUIVO_NAO_CONFERE').length, 1);
  // não ficou restrito: nada gravado
  const b = ambienteContratos(); b.compartilhamentoIgnorado = true;
  assert.match(b.c('criar', { origem: 'RESULTADO', motivo: 'Contrato assinado recebido do órgão', campos: b.CAMPOS(), arquivo: PDF() }).message, /não ficou restrito/);
  assert.equal((b.tabelas.LIC_CONTRATO_VERSOES || []).length, 0); assert.equal((b.tabelas.LIC_CONTRATOS || []).length, 0); assert.equal(b.op().SITUACAO, 'RESULTADO');
});

test('cliente: localizado pelo CNPJ do PNCP (cliente ou unidade) e vinculado; sem cadastro, criado só por ação explícita com a regra do cadastro; CNPJ nunca duplicado', () => {
  // órgão já cadastrado (cliente c1 com o CNPJ formatado antigo)
  const a = ambienteContratos({ cnpj: '11222333000181' });
  a.criar();
  let cl = a.tela().integracao.cliente;
  assert.equal(cl.podeCriar, false); assert.deepEqual(J(cl.encontrados.map((x) => [x.id, x.onde])), [['c1', 'Cliente']]);
  assert.match(a.c('clienteCriar', { cliente: { RAZAO_SOCIAL: 'DUPLICADO' } }).message, /Já existe no cadastro o CNPJ 11\.222\.333\/0001-81.*vincule.*Nada foi criado/);
  const n0 = a.tabelas.CAD_CLIENTES.length;
  assert.match(a.c('clienteVincular', { clienteId: 'c2' }).message, /não é o do órgão.*motivo/);
  ok(a.c('clienteVincular', { clienteId: 'c1' }));
  assert.equal(a.tabelas.CAD_CLIENTES.length, n0); assert.equal(a.tabelas.LIC_CONTRATOS[0].CLIENTE_ID, 'c1'); assert.equal(a.tabelas.LIC_CONTRATOS[0].HASH, a.ctx.LicC_hashLinha_(a.tabelas.LIC_CONTRATOS[0]));
  const vin = a.tabelas.LIC_CONTRATO_VINCULOS[0]; assert.equal(vin.MODULO, 'CLIENTES'); assert.equal(vin.ACAO, 'VINCULADO'); assert.match(vin.REF_TEXTO, /mesmo CNPJ do órgão/);
  assert.match(a.c('clienteVincular', { clienteId: 'c1' }).message, /já está vinculado/);
  // CNPJ só numa unidade: também é encontrado
  const u = ambienteContratos({ cnpj: '11444777000161' });
  u.tabelas.CAD_UNIDADES.push({ ID: 'un9', CLIENTE_ID: 'c2', NOME_UNIDADE: 'Hospital Municipal', CNPJ_UNIDADE: '11444777000161', CIDADE: 'Rio Verde', UF: 'GO', STATUS: 'ATIVO' });
  u.criar();
  assert.deepEqual(J(u.tela().integracao.cliente.encontrados.map((x) => [x.id, x.onde])), [['c2', 'Unidade "Hospital Municipal" com este CNPJ']]);
  // órgão novo: criar só por ação explícita, com o cadastro completo
  const b = ambienteContratos({ cnpj: '11444777000161' });
  b.criar();
  const nCli = b.tabelas.CAD_CLIENTES.length;
  cl = b.tela().integracao.cliente;
  assert.equal(cl.podeCriar, true); assert.equal(cl.sugestao.RAZAO_SOCIAL, 'HOSPITAL MUNICIPAL TESTE'); assert.equal(cl.sugestao.CNPJ, '11444777000161'); assert.equal(cl.sugestao.UF, 'GO');
  assert.equal(b.tabelas.CAD_CLIENTES.length, nCli, 'abrir a tela não cria nada');
  const inc = ok(b.c('clienteCriar', { cliente: { RAZAO_SOCIAL: 'HOSPITAL MUNICIPAL TESTE', CIDADE: 'RIO VERDE', UF: 'GO', CIENTE: true } }));
  assert.equal(inc.criado, false); assert.ok(inc.faltam.some((f) => f.campo === 'CEP')); assert.match(inc.texto, /cadastro precisa estar completo/);
  assert.equal(b.tabelas.CAD_CLIENTES.length, nCli);
  const completo = { RAZAO_SOCIAL: 'HOSPITAL MUNICIPAL TESTE', CNPJ: '99999999999999', CEP: '75900000', LOGRADOURO: 'Rua do Hospital', NUMERO: '10', BAIRRO: 'Centro', CIDADE: 'RIO VERDE', UF: 'GO', CONTATO: 'Fiscal do Contrato Teste', EMAIL: 'fiscal@hospital.exemplo.test', TELEFONE: '64999990000', CIENTE: true };
  const cr = ok(b.c('clienteCriar', { cliente: completo }));
  assert.equal(cr.criado, true); assert.match(cr.texto, /cadastrado.*vinculado/);
  const novo = b.tabelas.CAD_CLIENTES.find((x) => x.ID === cr.clienteId);
  assert.equal(novo.CNPJ, '11444777000161', 'o CNPJ é o do órgão, não o digitado'); assert.equal(b.tabelas.CAD_CLIENTES.length, nCli + 1);
  assert.equal(b.tabelas.LIC_CONTRATOS[0].CLIENTE_ID, cr.clienteId); assert.equal(b.tabelas.LIC_CONTRATO_VINCULOS.find((x) => x.MODULO === 'CLIENTES').ACAO, 'CRIADO');
  assert.match(b.c('clienteCriar', { cliente: completo }).message, /já está vinculado/);
  assert.equal(b.tabelas.CAD_CLIENTES.filter((x) => x.CNPJ === '11444777000161').length, 1, 'nunca duplica');
  // sem CNPJ válido no PNCP: explica o caminho
  const z = ambienteContratos({ cnpj: '123' }); z.criar();
  assert.match(z.tela().integracao.cliente.semCnpj, /vazio ou inválido.*vincule escolhendo da lista/);
  assert.match(z.c('clienteCriar', { cliente: completo }).message, /CNPJ do órgão no PNCP está vazio ou inválido/);
});

test('Comercial: oportunidade ganha (origem Licitação, referência do contrato) só por ação explícita, sem proposta e sem duplicar', () => {
  const a = ambienteContratos({ cnpj: '11222333000181' });
  a.criar();
  let co = a.tela().integracao.comercial;
  assert.match(co.porque, /Vincule \(ou cadastre\) primeiro o cliente/);
  assert.match(a.c('comercial', {}).message, /Vincule \(ou cadastre\) primeiro o cliente/);
  ok(a.c('clienteVincular', { clienteId: 'c1' }));
  co = a.tela().integracao.comercial;
  assert.match(co.porque, /não tem contato no Comercial/);
  ok(a.api('s_dora', 'salvarContato', { clienteId: 'c1', unidadeId: 'un1', nome: 'Fiscal do Contrato Teste', cargo: 'Fiscal', papel: 'USA', email: 'fiscal@alfa.exemplo.test' }));
  co = a.tela().integracao.comercial;
  assert.equal(co.porque, ''); assert.equal(co.contatos.length, 1); assert.deepEqual(J(co.unidades.map((x) => x.id)), ['un1']);
  const antes = contar(a);
  const r = ok(a.c('comercial', { unidadeId: 'un1', contatoId: co.contatos[0].id, motivo: 'Contrato assinado' }));
  assert.match(r.texto, /registrada como ganha no Comercial \(origem "Licitação"\).*Nenhuma proposta/);
  const o = a.tabelas.COM_OPORTUNIDADES.find((x) => x.ORIGEM_REF === 'LIC-CONTRATO:LIC-2026-0001-CT');
  assert.equal(o.SITUACAO, 'GANHA'); assert.equal(o.ORIGEM, 'Licitação'); assert.equal(o.VALOR_ESTIMADO, 18500); assert.equal(o.CLIENTE_ID, 'c1'); assert.match(o.TITULO, /Contrato de licitação 012\/2026/);
  const depois = contar(a);
  assert.equal(depois.opo, antes.opo + 1); assert.equal(depois.prop, antes.prop, 'nenhuma proposta no Comercial');
  assert.equal(a.tabelas.LIC_CONTRATOS[0].COMERCIAL_OPO_CODIGO, o.CODIGO);
  assert.equal(a.tabelas.LIC_CONTRATO_VINCULOS.find((x) => x.MODULO === 'COMERCIAL').ACAO, 'GANHA');
  assert.match(a.c('comercial', { unidadeId: 'un1', contatoId: co.contatos[0].id }).message, /já está no Comercial/);
  // oportunidade que já existe com a referência: só vincula
  const b = ambienteContratos({ cnpj: '11222333000181' }); b.criar(); ok(b.c('clienteVincular', { clienteId: 'c1' }));
  b.tabelas.COM_OPORTUNIDADES = (b.tabelas.COM_OPORTUNIDADES || []).concat([{ ID: 'opoX', CODIGO: 'OPO-0099', ORIGEM_REF: 'LIC-CONTRATO:LIC-2026-0001-CT', SITUACAO: 'GANHA', CLIENTE_ID: 'c1' }]);
  assert.equal(b.tela().integracao.comercial.jaExiste.codigo, 'OPO-0099');
  assert.match(b.c('comercial', {}).message, /Já existe a oportunidade OPO-0099.*vincule/);
  ok(b.c('comercial', { vincularId: 'opoX' }));
  assert.equal(b.tabelas.COM_OPORTUNIDADES.length, 1); assert.equal(b.tabelas.LIC_CONTRATO_VINCULOS.find((x) => x.MODULO === 'COMERCIAL').ACAO, 'VINCULADA');
});

test('agenda única e planejamento da execução: só com confirmação; uma atividade por marco futuro; planejamento por área no Cronograma de execução, sem O.S.', () => {
  const a = ambienteContratos();
  a.criar();
  let ag = a.tela().integracao.agendaUnica;
  assert.equal(ag.aLevar, 8); assert.equal(ag.responsavel, 'DORA DIRETORA TESTE');
  const antes = contar(a);
  assert.match(a.c('agendaUnica', {}).message, /Confirme na janela.*8 atividade\(s\).*Nada foi criado/);
  assert.equal(contar(a).atv, antes.atv);
  const r = ok(a.c('agendaUnica', { confirmar: true }));
  assert.match(r.texto, /8 atividade\(s\) lançada\(s\) em Minhas atividades/);
  const atvs = a.tabelas.ATV_ATIVIDADES.filter((x) => x.MODULO === 'licitacoes');
  assert.equal(atvs.length, 8); assert.ok(atvs.every((x) => x.RESPONSAVEL_ID === 'u_dir' && x.RESTRITA === 'SIM'));
  assert.ok(atvs.some((x) => /Fim da vigência do contrato 012\/2026/.test(x.TITULO) && x.PRAZO === '2027-11-30T09:00' && x.PRIORIDADE === 'Alta'));
  assert.equal(a.tabelas.LIC_CONTRATO_VINCULOS.filter((x) => x.MODULO === 'ATIVIDADES').length, 8);
  // de novo: nada repetido
  assert.match(ok(a.c('agendaUnica', { confirmar: true })).texto, /Nenhuma atividade nova/);
  assert.equal(a.tabelas.ATV_ATIVIDADES.filter((x) => x.MODULO === 'licitacoes').length, 8);
  // contrato mudou (revisão de 42a2c1f, ALTA 1): a atividade do fim é replanejada pela API de Minhas atividades, com o motivo; o marco novo é levado depois
  const atvFim = atvs.find((x) => /Fim da vigência/.test(x.TITULO));
  const va = ok(a.c('versao', { tipo: 'ADITIVO', aditivoNumero: '1º termo aditivo', motivo: 'Prorrogação por 12 meses', fonte: 'termo aditivo no PNCP', campos: { fim: '2028-11-30' } }));
  assert.match(va.texto, /Minhas atividades replanejadas: .*Fim da vigência do contrato 012\/2026 para 30\/11\/2028/);
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === atvFim.ID).PRAZO, '2028-11-30T09:00');
  assert.ok((a.tabelas.ATV_HISTORICO || []).some((h) => h.ATIVIDADE_ID === atvFim.ID), 'pelo histórico do próprio módulo');
  assert.ok(a.tabelas.LIC_CONTRATO_VINCULOS.some((x) => x.ACAO === 'REPLANEJADA' && x.REF_ID === atvFim.ID && x.REF_CODIGO === '2028-11-30'));
  ag = a.tela().integracao.agendaUnica;
  assert.ok(ag.marcos.every((x) => !x.atividade || !x.atividade.desatualizada), 'nenhuma atividade com o prazo antigo');
  const r2 = ok(a.c('agendaUnica', { confirmar: true }));
  assert.match(r2.texto, /^1 atividade\(s\) lançada\(s\)/, 'só o reajuste do 2º ano é novo');
  // planejamento da execução: CAL = Metrologia, no Cronograma de execução
  const ex = a.tela().integracao.execucao;
  assert.deepEqual(J(ex.grupos.map((g) => [g.area, g.itens.map((i) => i.item)])), [['METROLOGIA', ['1']]]);
  assert.match(ex.aviso, /não cria O\.S\./); assert.ok(ex.usuarios.some((u) => u.id === 'u_gt'));
  const c0 = contar(a);
  assert.match(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt' }).message, /Confirme na janela/);
  assert.match(a.c('execucao', { area: 'METROLOGIA', confirmar: true }).message, /Escolha quem planeja/);
  assert.match(a.c('execucao', { area: 'NR13', responsavelId: 'u_gt', confirmar: true }).message, /não tem item da área NR-13/);
  assert.equal(contar(a).atv, c0.atv);
  const e = ok(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', obs: 'Levar os padrões de temperatura', confirmar: true }));
  assert.match(e.texto, /Planejamento de Metrologia \(calibração\) lançado.*prazo 01\/12\/2026.*Nenhuma O\.S\./);
  const atv = a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === e.atividadeId);
  assert.equal(atv.MODULO, 'cronograma_execucao'); assert.equal(atv.RESPONSAVEL_ID, 'u_gt'); assert.equal(atv.PRAZO, '2026-12-01T17:00');
  assert.match(atv.DESCRICAO, /Item 1: 100 · CAL-001/); assert.doesNotMatch(atv.DESCRICAO, /R\$/, 'sem valores');
  const c1 = contar(a);
  assert.equal(c1.atv, c0.atv + 1); assert.equal(c1.os, c0.os); assert.equal(c1.cham, c0.cham); assert.equal(c1.req, c0.req);
  assert.match(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', confirmar: true }).message, /já foi criado/);
});

test('previsão de faturamento: por entrega (por mês) ou estimativa linear; só leitura, com a dependência declarada', () => {
  const a = ambienteContratos();
  a.criar();
  const pv = a.tela().contrato.previsao;
  assert.equal(pv.base, 'ENTREGAS'); assert.deepEqual(J(pv.meses.map((m) => [m.rotulo, m.valor])), [['jan/2027', 9250], ['jun/2027', 9250]]); assert.equal(pv.total, 18500); assert.equal(pv.aviso, '');
  assert.match(pv.dependencia, /não tem módulo de faturamento.*só leitura/);
  const lin = a.ctx.LicC_previsao_({ entregas: [], inicio: '2026-12-01', fim: '2027-02-28', valorTotal: 1000 });
  assert.equal(lin.base, 'LINEAR'); assert.deepEqual(J(lin.meses.map((m) => [m.mes, m.valor])), [['2026-12', 333.33], ['2027-01', 333.33], ['2027-02', 333.34]]); assert.equal(lin.total, 1000); assert.match(lin.aviso, /Estimativa linear/);
  const dif = a.ctx.LicC_previsao_({ entregas: [{ descricao: 'Lote', prazo: '2027-01-10', valor: 100 }], inicio: '2026-12-01', fim: '2027-02-28', valorTotal: 1000 });
  assert.match(dif.aviso, /diferente do valor total/);
});

test('relatório A4 do contrato: versão imutável com SHA-256, número REL-CTR, fonte de cada parte e escape do que foi digitado', () => {
  const a = ambienteContratos();
  a.criar({ campos: Object.assign(a.CAMPOS(), { obs: '<script>alert(1)</script> cláusula especial' }) });
  const r = ok(a.c('relatorio'));
  assert.match(r.relatorio.numero, /^REL-CTR-LIC-2026-0001-V01$/);
  assert.doesNotMatch(r.html, /<script>alert/); assert.match(r.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  for (const s of ['Identificação', 'Itens e valores', 'Condições', 'Prazos na agenda', 'Previsão de faturamento', 'Integração com os módulos', 'Versões']) assert.match(r.html, new RegExp(s));
  assert.match(r.html, /LIC_CONTRATO_VERSOES/); assert.match(r.html, /Cadeia de versões conferida/);
  const lin = a.tabelas.LIC_RELATORIOS[0];
  assert.equal(lin.TIPO, 'CONTRATO'); assert.equal(a.arquivos[lin.HTML_ARQUIVO_ID].bytes.toString('utf8'), r.html); assert.equal(a.arquivos[lin.HTML_ARQUIVO_ID].acesso, 'RESTRITO');
  const r2 = ok(a.c('relatorio')); assert.match(r2.relatorio.numero, /-V02$/); assert.equal(a.tabelas.LIC_RELATORIOS[0].HTML_SHA256, lin.HTML_SHA256, 'a versão 1 não muda');
  const v = ok(a.rel('s_dora', 'ver', { relatorioId: lin.ID })); assert.equal(v.integra, true);
  assert.equal(ok(a.rel('s_dora', 'tela')).relatorios.filter((x) => x.tipo === 'CONTRATO' && x.tipoNome === 'Relatório do contrato').length, 2);
  assert.ok(a.hist('RELATORIO_GERADO').some((h) => /Relatório do contrato gerado em A4/.test(h.TEXTO)));
  assert.match(ambienteContratos().c('relatorio').message, /ainda não tem contrato registrado/);
});

test('permissão: só Diretoria e Administrador; os outros perfis são recusados em toda ação e nada é gravado', () => {
  const a = ambienteContratos({ cnpj: '11222333000181' });
  a.criar();
  const foto = () => JSON.stringify([a.tabelas.LIC_CONTRATOS, a.tabelas.LIC_CONTRATO_VERSOES, a.tabelas.LIC_CONTRATO_VINCULOS || [], a.tabelas.LIC_OPORTUNIDADES, a.tabelas.CAD_CLIENTES, a.tabelas.ATV_ATIVIDADES, a.tabelas.COM_OPORTUNIDADES || []]);
  const antes = foto();
  for (const sid of ['s_gaspar', 's_vera', 's_tiago', 's_fabio', 's_rita', 's_mara', 's_gil']) {
    for (const op of ['lista', 'tela', 'criar', 'versao', 'arquivo', 'clienteVincular', 'clienteCriar', 'comercial', 'agendaUnica', 'execucao', 'relatorio']) {
      const r = a.ct(sid, op, { id: 'op1', clienteId: 'c1', confirmar: true, area: 'METROLOGIA', responsavelId: 'u_gt', tipo: 'CORRECAO', motivo: 'tentativa sem permissão', campos: { obs: 'x' } });
      assert.equal(r.ok, false, sid + ' ' + op); assert.equal(r.semAcesso, true, sid + ' ' + op);
    }
  }
  assert.equal(foto(), antes);
  ok(a.ct('s_admin', 'lista')); ok(a.ct('s_admin', 'tela', { id: 'op1' }));
  assert.match(a.ct('s_dora', 'qualquer', { id: 'op1' }).message, /ação de contrato desconhecida/);
});

// ---------------------------------------------------------------- telas
function telaCliente() {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('licCorpo'); el('licContrato');
  const chamadas = [];
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => false, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push(acao + ':' + (d && d.op)); } }; } }; } } } } });
  const html = {};
  for (const f of ['JS_Licitacoes.html', 'JS_Licitacoes_Proposta.html', 'JS_Licitacoes_Contratos.html']) {
    html[f] = ler(f);
    vm.runInContext(html[f].slice(html[f].indexOf('<script>') + 8, html[f].lastIndexOf('</script>')), ctx);
  }
  return { ctx, els, chamadas, html };
}

test('telas: lista (vigência, a vencer, valor, prontos para virar contrato), prévia com bloqueios e formulário, contrato com integração e versões, escape, ficha e celular de 390 px', () => {
  const t = telaCliente();
  // prévia sem resultado concluído
  const s = ambienteContratos({ concluir: false });
  const hs = t.ctx.LicCt_htmlAbaDados_(J(s.tela()));
  assert.match(hs, /Antes de registrar pelo resultado/); assert.match(hs, /data-lct-ir="disputa"/); assert.match(hs, /disabled aria-disabled="true">Registrar o contrato/);
  // prévia pronta: o formulário com os itens do resultado
  const a = ambienteContratos({ cnpj: '11444777000161' });
  const hp = t.ctx.LicCt_htmlAbaDados_(J(a.tela()));
  assert.match(hp, /id="lctRNum"/); assert.match(hp, /data-lct-criar="RESULTADO"/); assert.match(hp, /Itens \(do resultado homologado\)/); assert.match(hp, /Registro manual/); assert.match(hp, /id="lctRArq" type="file"/);
  t.ctx.LicCt_formHtml_('lctR', J(a.tela().previa.resultado.base), J(a.tela()), { itensEditaveis: false });
  assert.match(t.ctx.LicCt_linhasHtml_('lctR', 'itens'), /Valor unitário homologado<\/span><br><b>R\$\s185,00/);
  // contrato registrado
  a.criar({ campos: Object.assign(a.CAMPOS(), { numeroContrato: '<img src=x onerror=alert(1)>' }) });
  const d = J(a.tela());
  const h = t.ctx.LicCt_htmlAbaDados_(d);
  assert.doesNotMatch(h, /<img src=x/); assert.match(h, /&lt;img src=x/);
  assert.match(h, /data-lct-versao/); assert.match(h, /Relatório do contrato \(A4\)/); assert.match(h, /Prazos na agenda \(8\)/); assert.match(h, /Previsão de faturamento \(Por entrega\)/);
  assert.match(h, /Integração com os módulos do SGO\+/); assert.match(h, /data-lct-cli-criar/); assert.match(h, /Levar 8 marco\(s\) à agenda única/); assert.match(h, /data-lct-exec="METROLOGIA"/);
  assert.match(h, /Módulos sem integração \(dependência declarada\)/); assert.match(h, /Financeiro \(faturamento/);
  const tds = h.match(/<td[^>]*>/g) || []; assert.ok(tds.length > 6 && tds.every((x) => /data-r="/.test(x)), 'células viram cartão no celular');
  // lista do menu
  const l = J(ok(a.ct('s_dora', 'lista')));
  assert.equal(l.contagens.aguardando, 1); assert.equal(l.contagens.valorVigente, 18500); assert.equal(l.contratos[0].situacao.codigo, 'AGUARDANDO');
  const hl = t.ctx.LicCt_htmlLista_(l);
  assert.match(hl, /Vigentes/); assert.match(hl, /A vencer em 90 dias/); assert.match(hl, /data-lct-ficha="op1"/); assert.match(hl, /Resultados prontos para virar contrato/);
  // situação a vencer e vencido
  assert.equal(a.ctx.LicC_situacaoTela_({ situacao: 'VIGENTE', inicio: '2026-01-01', fim: '2026-12-01' }, '2026-10-19').codigo, 'A_VENCER');
  assert.equal(a.ctx.LicC_situacaoTela_({ situacao: 'VIGENTE', inicio: '2025-01-01', fim: '2026-10-01' }, '2026-10-19').codigo, 'VENCIDO');
  const b = ambienteContratos(); const lb = J(ok(b.ct('s_dora', 'lista')));
  assert.equal(lb.prontos.length, 1); assert.equal(lb.prontos[0].pronto, true); assert.match(t.ctx.LicCt_htmlLista_(lb), /Registrar o contrato/);
  // ficha: a aba Contrato existe e chama o servidor só quando aberta
  const ficha = t.ctx.Lic_htmlFicha_({ op: { id: 'op1', codigo: 'LIC-2026-0001', uf: 'GO', selos: [], pendencias: [] }, historico: [] }, 'contrato');
  assert.match(ficha, /aria-selected="true" data-lic-fab="contrato">Contrato<\/button>/); assert.match(ficha, /id="licContrato"/);
  t.ctx.LicCt_ligarAba_({}, {}, 'op1'); assert.deepEqual(t.chamadas, ['contratos:tela']);
  // celular de 390 px: nada de largura fixa maior que a tela; toque de 44 px; sem atualização automática; CRLF
  const css = t.html['JS_Licitacoes_Contratos.html'];
  for (const m of css.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  for (const m of css.matchAll(/minmax\((\d+)px/g)) assert.ok(Number(m[1]) <= 300, 'minmax ' + m[0]);
  assert.match(css, /\.lct-grade input, \.lct-grade select, \.lct-grade textarea \{[^}]*min-height: 44px/); assert.match(css, /\.lct-det summary \{[^}]*min-height: 44px/);
  assert.doesNotMatch(css, /setInterval/); assert.match(css, /\r\n/, 'em CRLF');
});

test('integração na casca: menu, rota, inclusão do arquivo novo, ação do servidor, Kanban sem "etapa futura" em Contrato, ajuda das telas, manual com o levantamento e base do assistente', () => {
  const idx = ler('Index.html');
  assert.match(idx, /data-mod="licitacoes_contratos"[^>]*onclick="abrir\('licitacoes_contratos'\)"[^>]*>.*Contratos<\/button>/);
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Contratos'\); \?>/);
  const js = ler('JS_Licitacoes.html');
  assert.match(js, /\["licitacoes_contratos", "Contratos"\]/); assert.match(js, /licitacoes_contratos: "Contratos"/);
  assert.match(js, /LIC\.mod === "licitacoes_contratos"\) \{ if \(typeof LicCt_renderLista_ === "function"\)/); assert.match(js, /\["contrato", "Contrato"\]/); assert.match(js, /LicCt_ligarAba_\(c, d, id\)/);
  assert.match(ler('SGO_Licitacoes.js'), /contratos: function \(eu, d\) \{ return LicC_acao_\(eu, d\); \}/);
  assert.doesNotMatch(ler('SGO_Licitacoes_Painel.js'), /codigo: 'CONTRATO', nome: 'Contrato', futura/);
  const a = ambienteContratos();
  for (const f of ['SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_Ajuda_LicitacoesContratos.js']) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), a.ctx);
  const t = a.ctx.SGO_ajudaTelas_LicitacoesContratos_().licitacoes_contratos;
  assert.ok(t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length);
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_contratos); assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_contratos);
  assert.ok(a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades.passos.some((p) => p.titulo === 'Contrato'));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /## Contratos \(tela Contratos e aba Contrato da ficha\)/); assert.match(manual, /### Levantamento dos módulos do SGO\+ \(02\/11\/2026\)/);
  for (const m of ['Comercial', 'CRM e Clientes', 'Contratos', 'Assistência e engenharia clínica', 'Metrologia', 'Qualificação', 'NR-13', 'Estoque e Compras', 'Financeiro', 'RH', 'Logística e Veículos', 'Documentos e Qualidade', 'Notificações']) assert.match(manual, new RegExp('\\| ' + m), m);
  assert.match(manual, /LIC_CONTRATO_VERSOES/); assert.match(manual, /dependência declarada/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Contratos \(tela Contratos e aba Contrato da ficha\)/, 'base do assistente regerada');
  const textos = ['SGO_Licitacoes_Contratos.js', 'JS_Licitacoes_Contratos.html', 'SGO_Ajuda_LicitacoesContratos.js'].map(ler).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sem emoji');
  for (const f of ['SGO_Licitacoes_Contratos.js', 'JS_Licitacoes_Contratos.html', 'SGO_Ajuda_LicitacoesContratos.js']) assert.match(ler(f), /\r\n/, f + ' em CRLF');
});

// ---------------------------------------------------------------- revisão independente de 42a2c1f (um teste para cada ataque)
const vinc = (a, f) => (a.tabelas.LIC_CONTRATO_VINCULOS || []).filter((x) => Object.keys(f).every((k) => x[k] === f[k]));
const atv = (a, id) => a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === id);

test('revisão ALTA 1: prazo que sai cancela a atividade ligada; encerramento cancela as do contrato e o planejamento aberto; concluída não é mexida; ninguém fica travado', () => {
  const a = ambienteContratos();
  a.criar();
  ok(a.c('agendaUnica', { confirmar: true }));
  const e = ok(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', confirmar: true }));
  const porNome = (rx) => vinc(a, { MODULO: 'ATIVIDADES', ACAO: 'ATIVIDADE' }).find((v) => rx.test(v.REF_TEXTO));
  // a segunda entrega sai do contrato: a atividade dela é cancelada (pela API de Minhas atividades, com o motivo)
  const v2 = porNome(/Segundo lote/);
  const r = ok(a.c('versao', { tipo: 'CORRECAO', motivo: 'Segundo lote não existe no contrato assinado', campos: { entregas: [a.CAMPOS().entregas[0]] } }));
  assert.match(r.texto, /Minhas atividades canceladas: Entrega do contrato 012\/2026: Segundo lote/);
  assert.equal(atv(a, v2.REF_ID).SITUACAO, 'Cancelada');
  assert.ok((a.tabelas.ATV_HISTORICO || []).some((h) => h.ATIVIDADE_ID === v2.REF_ID && /Motivo: Contrato LIC-2026-0001-CT: Correção de digitação/.test(h.TEXTO)));
  assert.equal(vinc(a, { ACAO: 'CANCELADA', REF_ID: v2.REF_ID }).length, 1);
  // a atividade do início foi concluída pela pessoa: o encerramento não mexe nela
  const vIni = porNome(/Início da vigência/);
  a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === vIni.REF_ID).SITUACAO = 'Concluída';
  const enc = ok(a.c('versao', { tipo: 'ENCERRAMENTO', motivo: 'Rescisão amigável pedida pelo órgão', fonte: 'termo de rescisão no PNCP', campos: { situacao: 'RESCINDIDO' } }));
  assert.match(enc.texto, /Minhas atividades canceladas: .*planejamento de Metrologia \(calibração\)/);
  const abertas = a.tabelas.ATV_ATIVIDADES.filter((x) => (x.MODULO === 'licitacoes' || x.ID === e.atividadeId) && x.SITUACAO !== 'Cancelada' && x.SITUACAO !== 'Concluída');
  assert.deepEqual(abertas, [], 'nenhuma atividade aberta de contrato rescindido');
  assert.equal(atv(a, vIni.REF_ID).SITUACAO, 'Concluída'); assert.equal(atv(a, e.atividadeId).SITUACAO, 'Cancelada');
  assert.equal(a.tela().integracao.execucao.grupos[0].cancelado.acao, 'CANCELADA');
  // sem a API de Minhas atividades respondendo: a resposta diz o que ajustar lá
  const b = ambienteContratos(); b.criar(); ok(b.c('agendaUnica', { confirmar: true }));
  b.ctx.Atividades_apiEditar = () => ({ ok: false, message: 'serviço fora do ar' });
  assert.match(ok(b.c('versao', { tipo: 'ADITIVO', aditivoNumero: '1º', motivo: 'Prorrogação do contrato', fonte: 'termo aditivo', campos: { fim: '2028-11-30' } })).texto, /Não foi possível acompanhar em Minhas atividades \(ajuste lá\): .*serviço fora do ar/);
});

test('revisão ALTA 2: Comercial reservado sob a trava (segundo toque recusado); a existente aberta é marcada como ganha; perdida é recusada com o caminho; falha no "ganhar" não duplica', () => {
  const prep = () => { const a = ambienteContratos({ cnpj: '11222333000181' }); a.criar(); ok(a.c('clienteVincular', { clienteId: 'c1' })); ok(a.api('s_dora', 'salvarContato', { clienteId: 'c1', unidadeId: 'un1', nome: 'Fiscal Teste', cargo: 'Fiscal', papel: 'USA', email: 'f@alfa.exemplo.test' })); a.ct0 = a.tela().integracao.comercial.contatos[0].id; return a; };
  const a = prep();
  // outra pessoa registrando agora (reserva recente): recusa; reserva vencida não vale
  const ct = a.tabelas.LIC_CONTRATOS[0];
  a.tabelas.LIC_CONTRATO_VINCULOS.push({ ID: 'res1', CONTRATO_ID: ct.ID, MODULO: 'COMERCIAL', ACAO: 'RESERVA', CHAVE: 'OPORTUNIDADE', POR_NOME: 'CHARLES', EM: new Date(a.relogio.agora - 60000).toISOString() });
  assert.match(a.c('comercial', { unidadeId: 'un1', contatoId: a.ct0 }).message, /CHARLES está registrando este contrato no Comercial neste momento/);
  a.tabelas.LIC_CONTRATO_VINCULOS.find((x) => x.ID === 'res1').EM = new Date(a.relogio.agora - 11 * 60000).toISOString();
  // o "ganhar" falha depois de criar: a reserva é desfeita, nada duplicado, e o caminho é vincular a existente (que vira ganha)
  const ganhar = a.ctx.ComOpo_ganhar_; let falhar = true;
  a.ctx.ComOpo_ganhar_ = function () { if (falhar) { falhar = false; throw new Error('Comercial ocupado'); } return ganhar.apply(this, arguments); };
  assert.match(a.c('comercial', { unidadeId: 'un1', contatoId: a.ct0 }).message, /foi criada no Comercial, mas não foi marcada como ganha \(Comercial ocupado\).*Vincular a existente/);
  const o = a.tabelas.COM_OPORTUNIDADES.find((x) => x.ORIGEM_REF === 'LIC-CONTRATO:LIC-2026-0001-CT');
  assert.equal(o.SITUACAO, 'ABERTA'); assert.equal(a.tabelas.LIC_CONTRATOS[0].COMERCIAL_OPO_ID, '');
  assert.ok(vinc(a, { MODULO: 'COMERCIAL', ACAO: 'RESERVA_DESFEITA' }).some((x) => /Comercial ocupado/.test(x.MOTIVO)));
  const tela = a.tela().integracao.comercial; assert.equal(tela.podeVincular, true); assert.match(tela.porque, /aberta.*marcada como ganha/);
  assert.match(a.c('comercial', { unidadeId: 'un1', contatoId: a.ct0 }).message, /Já existe a oportunidade .*Vincular a existente/);
  const r = ok(a.c('comercial', { vincularId: o.ID }));
  assert.match(r.texto, /marcada como ganha/);
  assert.equal(a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === o.ID).SITUACAO, 'GANHA');
  assert.equal(a.tabelas.COM_OPORTUNIDADES.filter((x) => x.ORIGEM_REF === 'LIC-CONTRATO:LIC-2026-0001-CT').length, 1, 'nunca duplica');
  assert.equal(vinc(a, { MODULO: 'COMERCIAL', ACAO: 'GANHA' }).length, 1); assert.equal(a.tabelas.LIC_CONTRATOS[0].COMERCIAL_OPO_ID, o.ID);
  // perdida: recusa com o caminho da reabertura
  const b = prep();
  b.tabelas.COM_OPORTUNIDADES = (b.tabelas.COM_OPORTUNIDADES || []).concat([{ ID: 'opoP', CODIGO: 'OPO-0077', ORIGEM_REF: 'LIC-CONTRATO:LIC-2026-0001-CT', SITUACAO: 'PERDIDA', CLIENTE_ID: 'c1' }]);
  const tb = b.tela().integracao.comercial; assert.equal(tb.podeVincular, false); assert.match(tb.porque, /está perdida: peça à gestão comercial a reabertura/);
  assert.match(b.c('comercial', { vincularId: 'opoP' }).message, /está perdida: o contrato não é ligado.*Pedir reabertura.*Nada foi vinculado/);
  assert.equal(b.tabelas.LIC_CONTRATOS[0].COMERCIAL_OPO_ID, ''); assert.equal(vinc(b, { MODULO: 'COMERCIAL' }).length, 0);
});

test('revisão MÉDIA 3: agenda única e planejamento reservam a chave antes de criar; falha desfaz a reserva e permite tentar de novo; reserva de outra pessoa não repete', () => {
  const a = ambienteContratos();
  a.criar();
  const criar = a.ctx.Atividades_apiCriar; let n = 0;
  a.ctx.Atividades_apiCriar = function (sid, p) { n++; if (/Fim da vigência/.test(p.titulo)) return { ok: false, message: 'Minhas atividades ocupado' }; return criar.apply(this, arguments); };
  const r = ok(a.c('agendaUnica', { confirmar: true }));
  assert.match(r.texto, /^7 atividade\(s\).*Não lançadas \(tente de novo\): Fim da vigência.*ocupado/);
  assert.equal(vinc(a, { MODULO: 'ATIVIDADES', ACAO: 'RESERVA_DESFEITA' }).length, 1); assert.equal(vinc(a, { MODULO: 'ATIVIDADES', ACAO: 'RESERVA' }).length, 0);
  a.ctx.Atividades_apiCriar = criar;
  assert.match(ok(a.c('agendaUnica', { confirmar: true })).texto, /^1 atividade\(s\)/);
  assert.equal(a.tabelas.ATV_ATIVIDADES.filter((x) => x.MODULO === 'licitacoes').length, 8, 'uma por marco, sem repetir');
  // planejamento: outra pessoa lançando agora (reserva recente) é recusado; falha desfaz
  const ct = a.tabelas.LIC_CONTRATOS[0];
  a.tabelas.LIC_CONTRATO_VINCULOS.push({ ID: 'resE', CONTRATO_ID: ct.ID, MODULO: 'EXECUCAO', ACAO: 'RESERVA', CHAVE: 'METROLOGIA', POR_NOME: 'CHARLES', EM: new Date(a.relogio.agora).toISOString() });
  assert.match(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', confirmar: true }).message, /sendo lançado agora por outra pessoa/);
  a.tabelas.LIC_CONTRATO_VINCULOS = a.tabelas.LIC_CONTRATO_VINCULOS.filter((x) => x.ID !== 'resE');
  a.ctx.Atividades_apiCriar = () => ({ ok: false, message: 'Não foi possível lançar a atividade: o responsável escolhido não está ativo no SGO+' });
  assert.match(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', confirmar: true }).message, /não está ativo no SGO\+\. Nada foi criado/);
  assert.equal(vinc(a, { MODULO: 'EXECUCAO', ACAO: 'RESERVA_DESFEITA' }).length, 1);
  a.ctx.Atividades_apiCriar = criar;
  ok(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', confirmar: true }));
  assert.equal(vinc(a, { MODULO: 'EXECUCAO', ACAO: 'PLANEJAMENTO' }).length, 1);
});

test('revisão MÉDIA 4: a tela manda a homologação e a fonte de cada item, e o servidor as preserva do resultado (e da versão anterior quando não vêm)', () => {
  const t = telaCliente();
  const a = ambienteContratos();
  const tl = J(a.tela());
  t.ctx.LicCt_formHtml_('lctR', tl.previa.resultado.base, tl, { itensEditaveis: false });
  const campos = J(t.ctx.LicCt_lerForm_('lctR'));
  assert.equal(campos.itens[0].homologacao, '2026-11-24'); assert.equal(campos.itens[0].fonte, 'termo de homologação no PNCP');
  ok(a.c('criar', { origem: 'RESULTADO', motivo: 'Contrato assinado recebido do órgão', campos: Object.assign(a.CAMPOS(), { itens: campos.itens.map((i) => Object.assign({}, i, { homologacao: '', fonte: '' })) }) }));
  const d1 = JSON.parse(a.tabelas.LIC_CONTRATO_VERSOES[0].DADOS_JSON).itens[0];
  assert.equal(d1.homologacao, '2026-11-24', 'do resultado, mesmo que a tela mande vazio'); assert.equal(d1.fonte, 'termo de homologação no PNCP');
  // versão com os itens sem os campos (como a tela antiga mandava): ficam os da versão anterior
  ok(a.c('versao', { tipo: 'CORRECAO', motivo: 'Quantidade do contrato assinado', campos: { itens: [{ item: '1', codigo: 'CAL-001', nome: 'Calibração', quantidade: '90', valorUnit: '185,00' }] } }));
  const d2 = JSON.parse(a.tabelas.LIC_CONTRATO_VERSOES[1].DADOS_JSON).itens[0];
  assert.equal(d2.quantidade, 90); assert.equal(d2.homologacao, '2026-11-24'); assert.equal(d2.fonte, 'termo de homologação no PNCP');
  assert.match(ler('JS_Licitacoes_Contratos.html'), /homologacao: i\.homologacao, fonte: i\.fonte/);
});

test('revisão MÉDIA 5: com o contrato registrado, o resultado da disputa não muda: a mensagem manda fazer a versão do contrato', () => {
  const a = ambienteContratos();
  a.criar();
  const n = a.tabelas.LIC_RESULTADOS.length;
  const r = a.dsp('s_dora', 'resultado', { id: 'op1', item: '1', situacao: 'PERDIDO', fonte: 'decisão do recurso no portal' });
  assert.equal(r.ok, false); assert.match(r.message, /já tem o contrato 012\/2026 registrado.*Nova versão.*correção, aditivo ou encerramento.*Nada foi gravado/);
  assert.equal(a.tabelas.LIC_RESULTADOS.length, n); assert.equal(JSON.parse(a.tabelas.LIC_DISPUTAS[0].CONTRATO_JSON).itens.length, 1);
});

test('revisão MÉDIA 6: encerramento e apostilamento mantêm o responsável que saiu da Diretoria; reabrir contrato encerrado só o Administrador, com motivo, fonte e versão', () => {
  const a = ambienteContratos();
  a.criar();
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_dir').STATUS = 'INATIVO';
  ok(a.c('versao', { tipo: 'APOSTILAMENTO', motivo: 'Reajuste anual pelo IPCA', fonte: 'apostila 1', campos: { reajusteIndice: 'IPCA', reajusteDataBase: '2026-11-20', reajusteFonte: 'cláusula 8' } }));
  ok(a.c('versao', { tipo: 'ENCERRAMENTO', motivo: 'Contrato cumprido antes do prazo', fonte: 'termo de encerramento', campos: { situacao: 'ENCERRADO' } }));
  assert.equal(JSON.parse(a.tabelas.LIC_CONTRATO_VERSOES[2].DADOS_JSON).responsavelId, 'u_dir');
  assert.match(a.c('versao', { tipo: 'CORRECAO', motivo: 'Trocar o responsável sem ser da Diretoria', campos: { responsavelId: 'u_ven' } }).message, /responsável pelo contrato na lista/);
  // reabrir: Diretoria não; Administrador com motivo de 20 letras e fonte
  assert.match(a.c('versao', { tipo: 'REABERTURA', motivo: 'Encerramento registrado por engano', fonte: 'conferido no PNCP' }).message, /só o Administrador reabre/);
  assert.match(a.c('versao', { tipo: 'ADITIVO', aditivoNumero: '1º', motivo: 'Aditivo depois do encerramento', fonte: 'termo', campos: { fim: '2028-11-30' } }).message, /peça ao Administrador a reabertura/);
  assert.match(a.ct('s_admin', 'versao', { id: 'op1', tipo: 'REABERTURA', motivo: 'curto demais aqui', fonte: 'conferido no PNCP' }).message, /pelo menos 20 letras/);
  const r = ok(a.ct('s_admin', 'versao', { id: 'op1', tipo: 'REABERTURA', motivo: 'Encerramento registrado por engano: o contrato segue', fonte: 'conferido no PNCP em 20/12/2026' }));
  assert.match(r.texto, /Reabertura \(Administrador\) gravado como versão 4/);
  assert.equal(a.tabelas.LIC_CONTRATOS[0].SITUACAO, 'VIGENTE'); assert.equal(a.tabelas.LIC_CONTRATO_VERSOES[3].TIPO, 'REABERTURA');
  assert.ok(a.evs().some((e) => e.TIPO === 'CONTRATO_FIM' && e.SITUACAO === 'ATIVO'), 'os prazos voltam');
  assert.match(a.ct('s_admin', 'versao', { id: 'op1', tipo: 'REABERTURA', motivo: 'Reabrir de novo sem estar encerrado', fonte: 'teste' }).message, /já está vigente/);
});

test('revisão BAIXA 7: hash do resumo cobre valor, vigência e CNPJ; cliente inativo orienta a reativar; atividade não nasce atrasada; texto do cadastro escapado na tela', () => {
  const a = ambienteContratos({ cnpj: '11222333000181' });
  a.criar({ campos: Object.assign(a.CAMPOS(), { obrigacoes: [{ descricao: 'Reunião de início com o fiscal', prazo: '2026-10-19' }] }) });
  // hash do resumo
  const ct = a.tabelas.LIC_CONTRATOS[0], orig = ct.VALOR_TOTAL;
  for (const [k, v] of [['VALOR_TOTAL', 1], ['VIGENCIA_FIM', '2030-01-01'], ['ORGAO_CNPJ', '00000000000191']]) { const antes = ct[k]; ct[k] = v; assert.match(a.tela().contrato.cadeia.problema, /resumo do contrato foi mudado/, k); ct[k] = antes; }
  assert.equal(ct.VALOR_TOTAL, orig); assert.equal(a.tela().contrato.cadeia.integra, true);
  // cliente inativo
  a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1').STATUS = 'INATIVO';
  assert.match(a.tela().integracao.cliente.encontrados[0].orientacao, /inativo.*reative em Cadastros › Clientes.*Reativar/);
  assert.match(a.c('clienteVincular', { clienteId: 'c1' }).message, /inativo no cadastro: reative em Cadastros › Clientes/);
  assert.match(a.c('clienteCriar', { cliente: {} }).message, /HOSPITAL TESTE ALFA LTDA|Hospital Teste Alfa.*inativo.*reative em Cadastros/);
  // marco de hoje (segunda 19/10/2026): a atividade vai para o próximo dia útil
  const r = ok(a.c('agendaUnica', { confirmar: true }));
  assert.match(r.texto, /Para o próximo dia útil \(o marco é hoje\): Obrigação do contrato 012\/2026: Reunião de início/);
  const ob = a.tabelas.ATV_ATIVIDADES.find((x) => /Reunião de início/.test(x.TITULO));
  assert.equal(ob.PRAZO, '2026-10-20T09:00');
  assert.ok(a.tabelas.ATV_ATIVIDADES.filter((x) => x.MODULO === 'licitacoes').every((x) => x.PRAZO > '2026-10-19T10:00'), 'nenhuma nasce atrasada');
  assert.match(a.c('execucao', { area: 'METROLOGIA', responsavelId: 'u_gt', prazo: '2026-10-19', confirmar: true }).message, /precisa ser de amanhã em diante/);
  assert.match(ler('JS_Licitacoes_Contratos.html'), /Lic_faixa_\(Lic_esc_\(r\.texto\)/);
});
