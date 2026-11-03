// SGO+ Licitações, proposta técnica e comercial em A4 e relatórios em A4 (02/11/2026): montagem do rascunho (itens, catálogo,
// edital, empresa, não cotados), preço = a simulação salva (versão e hash), verificador da IA (afirmação técnica inventada, RBC,
// fabricante, superlativo, número, trecho, Inmetro), revisão com de → para, aprovação e emissão imutável (HTML guardado com
// SHA-256), relatórios com a fonte de cada número e versão imutável, permissão e telas (computador e celular de 390 px).
// Código real do Comercial e de Licitações num contexto isolado (tests/_licitacoes_proposta_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambienteProposta } = require('./_licitacoes_proposta_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const J = (x) => JSON.parse(JSON.stringify(x));
const ITENS = [{ numero: '1', descricao: 'Calibração de termômetro digital com certificado', codigo: 'CAL-001', quantidade: 100, precoEdital: '200,00', precoProposta: '199,00', origem: 'PNCP' },
  { numero: '2', descricao: 'Locação de veículo utilitário', codigo: '', quantidade: 1, precoEdital: '1000', origem: 'PNCP' },
  { numero: '3', descricao: 'Calibração de termômetro tipo espeto', codigo: 'CAL-002', quantidade: 10, precoEdital: '180,00', origem: 'PNCP' }];
const LEITURA = [{ tema: 'PRAZOS', temaNome: 'Prazo de execução e entrega', trecho: 'O prazo de execução dos serviços será de 30 (trinta) dias corridos contados da ordem de serviço.' },
  { tema: 'PAGAMENTO', temaNome: 'Pagamento', trecho: 'O pagamento será efetuado em até 30 dias após a apresentação da nota fiscal atestada.', pagina: 9 },
  { tema: 'HAB_FISCAL', temaNome: 'Habilitação fiscal', trecho: 'Certidão negativa de débitos relativos aos tributos federais.' }];
/** Oportunidade 1 com a leitura e a simulação salva (itens 1 cotado, 2 fora do catálogo, 3 sem preço da proposta). */
function base(o) {
  const a = ambienteProposta(o);
  a.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eq_t', CLIENTE_ID: 'c1', TIPO: 'Termômetro', FABRICANTE: 'TERMOPRECISA', STATUS: 'ATIVO' });
  a.comLeitura('op1', LEITURA);
  a.sim = a.simular('op1', ITENS, 'Simulação para a proposta');
  return a;
}
const tela = (a, id) => ok(a.prop('s_dora', 'tela', { id: id || 'op1' })).proposta;
const montar = (a, d) => ok(a.prop('s_dora', 'montar', Object.assign({ id: 'op1' }, d || {})));
const frase = (texto, fontes, trecho) => ({ texto, fontes, trecho });
const BOA_AP = frase('A Metrolab Soluções em Engenharia Clínica LTDA, matriz de Goiânia/GO, apresenta proposta para a calibração de termômetros digitais com emissão de certificado.', ['EMPRESA', 'CAMPO:objeto'], 'calibração de termômetros digitais com emissão de certificado');
const BOA_MET = frase('A calibração da indicação de temperatura contempla os pontos contratados de -10 °C, 2 °C e 8 °C, com emissão de certificado.', ['CAT:CAL-001'], 'calibração da indicação de temperatura, contemplando os pontos contratados');

test('montagem do rascunho: itens cotados e não cotados com o motivo, catálogo técnico, frase literal do edital, matriz EPP, validade e o aviso das imagens', () => {
  const a = base();
  const m = montar(a, { validadeDias: '90' });
  assert.equal(m.versao, 1); assert.match(m.texto, /LIC-2026-0001-P01/);
  const p = tela(a), at = p.atual, c = at.conteudo;
  assert.equal(at.situacao, 'RASCUNHO'); assert.equal(at.numero, 'LIC-2026-0001-P01'); assert.equal(at.integra, true);
  assert.equal(c.cotados, 1); assert.equal(c.naoCotados, 2);
  const it = (n) => c.itens.find((i) => i.numero === n);
  assert.equal(it('1').situacao, 'COTADO'); assert.equal(it('1').precoUnit, 199); assert.equal(it('1').total, 19900);
  assert.equal(it('2').situacao, 'NAO_COTADO'); assert.match(it('2').motivo, /fora do catálogo/); assert.match(it('2').motivoDoc, /fora do escopo/);
  assert.equal(it('3').situacao, 'NAO_COTADO'); assert.match(it('3').motivo, /Sem preço da proposta na simulação versão 1/);
  const t = c.tecnicos['CAL-001'];
  assert.match(t.descricao, /calibração da indicação de temperatura/); assert.deepEqual(t.pontos, ['-10 °C', '2 °C', '8 °C']); assert.ok(t.entregaveis.includes('Certificado de calibração por equipamento'));
  assert.ok(!c.tecnicos['CAL-002'], 'item não cotado não entra na proposta técnica');
  assert.equal(c.edital.prazos.length, 1); assert.match(c.edital.prazos[0].trecho, /30 \(trinta\) dias corridos/); assert.match(c.edital.pagamento[0].fonte, /página 9/);
  assert.equal(c.edital.prazos.concat(c.edital.pagamento).length, 2, 'a habilitação fica fora das condições');
  assert.equal(c.empresa.unidade, 'Matriz Goiânia/GO'); assert.equal(c.empresa.porte, 'EPP'); assert.equal(c.validadeDias, 90);
  assert.ok(at.avisos.some((x) => /não tem fotos nem ícones/.test(x))); assert.ok(at.avisos.some((x) => /falta a chave da IA/.test(x)));
  assert.equal(c.ia.situacao, 'SEM_IA'); assert.equal(c.trechos.apresentacao.origem, 'SISTEMA'); assert.match(c.trechos.apresentacao.texto, /empresa de pequeno porte \(EPP\)/);
  assert.deepEqual(at.bloqueios, []); assert.equal(at.podeAprovar, true); assert.equal(at.podeEmitir, false);
  const h = a.tabelas.LIC_HISTORICO.filter((x) => x.TIPO === 'PROPOSTA_RASCUNHO');
  assert.equal(h.length, 1); assert.match(h[0].TEXTO, /1 item\(ns\) cotado\(s\), 2 não cotado\(s\), total R\$\s19\.900,00 \(simulação de preço versão 1\)/); assert.match(h[0].VERSAO, /proposta 1 · simulação 1 · leitura 1/);
  // validade fora da faixa: nada gravado
  assert.match(a.prop('s_dora', 'montar', { id: 'op1', validadeDias: '500', motivo: 'Outra versão qualquer' }).message, /de 1 a 365/);
  assert.match(a.prop('s_dora', 'montar', { id: 'op1', motivo: 'curto' }).message, /motivo/);
  assert.equal(a.tabelas.LIC_PROPOSTAS.length, 1);
});

test('preço = a simulação salva: total, versão e hash na planilha; simulação mais nova, alterada ou sem custo bloqueia; sem simulação não há proposta comercial', () => {
  const a = base();
  montar(a);
  let at = tela(a).atual;
  const s = a.tabelas.LIC_SIMULACOES[0];
  assert.equal(at.total, Number(s.TOTAL_PROPOSTA)); assert.equal(at.simulacaoVersao, 1); assert.equal(at.simulacaoHash, s.HASH);
  const prev = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: at.id }));
  assert.match(prev.html, /RASCUNHO PARA REVISÃO INTERNA/); assert.match(prev.html, /R\$\s199,00/); assert.match(prev.html, /R\$\s19\.900,00/);
  assert.doesNotMatch(prev.html, /Referência interna|registro [0-9a-f]{16}/, 'a referência interna da simulação fica só na aba');
  assert.match(prev.html, /Itens não cotados/); assert.match(prev.html, /Locação de veículo utilitário/);
  // simulação nova depois do rascunho: aprovar recusa e diz o que fazer
  a.simular('op1', ITENS.map((i) => Object.assign({}, i, i.numero === '1' ? { precoProposta: '210,00' } : {})), 'Preço revisto pela Diretoria');
  at = tela(a).atual;
  assert.ok(at.bloqueios.some((b) => /simulação de preço mais nova \(versão 2\).*Montar de novo/.test(b))); assert.equal(at.podeAprovar, false);
  assert.match(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Tentativa de aprovar velha' }).message, /mais nova.*Nada foi alterado/);
  montar(a, { motivo: 'Planilha com a simulação versão 2' });
  at = tela(a).atual;
  assert.equal(at.versao, 2); assert.equal(at.total, 21000); assert.deepEqual(at.bloqueios, []);
  assert.equal(a.tabelas.LIC_PROPOSTAS.find((x) => x.VERSAO === 1).SITUACAO, 'SUBSTITUIDA', 'o rascunho anterior não é apagado');
  // simulação alterada fora do SGO+
  a.tabelas.LIC_SIMULACOES[1].RESULTADO_JSON = a.tabelas.LIC_SIMULACOES[1].RESULTADO_JSON.replace('21000', '1');
  assert.ok(tela(a).atual.bloqueios.some((b) => /não confere com o hash gravado/.test(b)));
  // item com preço e sem custo conferido: a planilha não fecharia com a simulação
  const b2 = ambienteProposta();
  b2.simular('op1', [{ numero: '1', codigo: 'CAL-001', quantidade: 5, precoProposta: '199,00' }, { numero: '2', codigo: 'CAL-MONITOR', quantidade: 2, precoProposta: '900,00' }], 'Parceiro sem custo informado');
  ok(b2.prop('s_dora', 'montar', { id: 'op1', usarIA: false }));
  assert.ok(tela(b2).atual.bloqueios.some((x) => /Item\(ns\) 2 com preço da proposta, mas sem custo conferido/.test(x)));
  // sem simulação: rascunho existe, aprovação não
  const b3 = ambienteProposta();
  ok(b3.prop('s_dora', 'montar', { id: 'op1' }));
  const a3 = tela(b3).atual;
  assert.ok(a3.bloqueios.some((x) => /Sem simulação de preço salva: não há proposta comercial/.test(x))); assert.equal(a3.total, 0);
  assert.match(b3.prop('s_dora', 'aprovar', { id: 'op1', propostaId: a3.id, motivo: 'Sem preço, só para testar' }).message, /não há proposta comercial/);
  assert.equal(tela(b3).simulacao, null);
});

test('verificador da IA: frase conferida passa; afirmação técnica inventada, RBC, fabricante, superlativo, número fora, trecho que não está na fonte e Inmetro são retirados com o motivo', () => {
  const ruins = [frase('A Metrolabs é líder de mercado e oferece o melhor serviço da região.', ['EMPRESA'], 'Metrolab Soluções em Engenharia Clínica'),
    frase('A Metrolabs é acreditada pela RBC para calibração de temperatura.', ['EMPRESA'], 'As calibrações são rastreáveis')];
  const met = [BOA_MET, frase('O serviço inclui ajuste eletrônico, reparo da sonda e laudo de conformidade metrológica.', ['CAT:CAL-001'], 'Serviço de calibração da indicação de temperatura'),
    frase('A calibração é feita em 5 pontos de temperatura.', ['CAT:CAL-001'], 'Serviço de calibração da indicação de temperatura'),
    frase('A calibração da indicação de temperatura atende termômetros Termoprecisa.', ['CAT:CAL-001'], 'Serviço de calibração da indicação de temperatura'),
    frase('A calibração da indicação de temperatura contempla os pontos contratados e emissão de certificado.', ['CAT:CAL-001'], 'contempla pontos inventados pela IA'),
    frase('A calibração da indicação de temperatura é autorizada pelo Inmetro.', ['CAT:CAL-001'], 'Serviço de calibração da indicação de temperatura'),
    frase('A calibração da indicação de temperatura contempla os pontos contratados.', ['CAT:CAL-999'], 'Serviço de calibração da indicação de temperatura')];
  const a = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP].concat(ruins), metodologia: [{ codigo: 'CAL-001', frases: met }] }) });
  montar(a);
  const at = tela(a).atual, c = at.conteudo, ia = c.ia;
  assert.equal(ia.situacao, 'PARCIAL'); assert.equal(ia.tentativas, 2, 'com recusa, a IA recebe os problemas e tenta de novo');
  assert.match(a.prompts[1], /A resposta anterior foi recusada nestes pontos/);
  assert.match(a.prompts[0], /<<<FONTE-[0-9a-f]+ INICIO DADOS>>>/); assert.match(a.prompts[0], /CAT:CAL-001 \(Catálogo CAL-001\)/); assert.match(a.prompts[0], /NÃO é acreditada RBC/);
  assert.equal(c.trechos.apresentacao.origem, 'IA'); assert.equal(c.trechos.apresentacao.frases[0].texto, BOA_AP.texto); assert.equal(c.trechos.apresentacao.frases[0].aceita, false);
  assert.equal(c.trechos['metodologia:CAL-001'].frases[0].texto, BOA_MET.texto); assert.equal(c.trechos['metodologia:CAL-001'].frases[0].trechoRef, 'CAT:CAL-001');
  const mot = (re) => ia.retiradas.find((r) => re.test(r.texto));
  assert.match(mot(/líder/).motivo, /superlativo/);
  assert.match(mot(/acreditada/).motivo, /acreditação/);
  assert.match(mot(/ajuste eletrônico/).motivo, /afirmação fora das fontes citadas.*ajuste/);
  assert.match(mot(/5 pontos/).motivo, /o número 5 não está/);
  assert.match(mot(/Termoprecisa/).motivo, /fabricante/);
  assert.match(mot(/contempla os pontos contratados e emissão/).motivo, /não está, literalmente, em nenhuma das fontes citadas/);
  assert.match(mot(/Inmetro/).motivo, /Inmetro.*balanças e esfigmomanômetros/);
  assert.match(mot(/contempla os pontos contratados\.$/).motivo, /fonte que não existe/);
  assert.equal(ia.retiradas.length, 8);
  // o que foi retirado não chega ao documento; a frase conferida só chega depois do aceite da Diretoria
  let html = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: at.id })).html;
  assert.doesNotMatch(html, /líder|acreditada|Termoprecisa|ajuste eletrônico/i); assert.doesNotMatch(html, /Metodologia:<\/b>/, 'sem aceite, a frase da IA fica fora');
  ok(a.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: at.id, trecho: 'metodologia:CAL-001', indice: 0, aceitar: true }));
  html = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: at.id })).html;
  assert.match(html, /Metodologia:<\/b> A calibração da indicação de temperatura contempla/);
  // tudo retirado: vale o texto do sistema
  const b = base({ ia: () => JSON.stringify({ apresentacao: ruins, metodologia: [] }) });
  montar(b);
  const cb = tela(b).atual.conteudo;
  assert.equal(cb.ia.situacao, 'RECUSADA'); assert.equal(cb.trechos.apresentacao.origem, 'SISTEMA'); assert.match(cb.ia.aviso, /retirou todas as frases/);
  // IA fora do ar: rascunho sai do mesmo jeito
  const e = base({ ia: () => { throw new Error('serviço fora'); } });
  assert.match(montar(e).texto, /Rascunho/);
  // montar sem a IA, a pedido
  const n = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP], metodologia: [] }) });
  montar(n, { usarIA: false });
  assert.equal(tela(n).atual.conteudo.ia.situacao, 'NAO_PEDIDA'); assert.equal(n.prompts.length, 0);
});

test('revisão: trecho editado com motivo e de → para; o verificador recusa superlativo, RBC e número fora; editar a aprovada tira a aprovação; emitida não edita', () => {
  const a = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP], metodologia: [{ codigo: 'CAL-001', frases: [BOA_MET] }] }) });
  montar(a);
  let at = tela(a).atual;
  const ed = (d) => a.prop('s_dora', 'trechoEditar', Object.assign({ id: 'op1', propostaId: at.id }, d));
  assert.match(ed({ trecho: 'apresentacao', texto: 'Texto novo da apresentação.', motivo: 'curto' }).message, /motivo/);
  assert.match(ed({ trecho: 'apresentacao', texto: 'A Metrolabs oferece a melhor calibração do Brasil.', motivo: 'Ajuste da Diretoria' }).message, /superlativo.*Nada foi alterado/);
  assert.match(ed({ trecho: 'apresentacao', texto: 'A Metrolabs é acreditada RBC.', motivo: 'Ajuste da Diretoria' }).message, /acreditação/);
  assert.match(ed({ trecho: 'metodologia:CAL-001', texto: 'A calibração é feita em 7 pontos por equipamento.', motivo: 'Ajuste da Diretoria' }).message, /7 ponto não está no edital, no catálogo nem na simulação/);
  assert.match(ed({ trecho: 'inventado', texto: 'x', motivo: 'Ajuste da Diretoria' }).message, /não existe nesta versão/);
  assert.match(ed({ trecho: 'apresentacao', texto: '', motivo: 'Ajuste da Diretoria' }).message, /não pode ficar vazia/);
  assert.equal(a.tabelas.LIC_PROPOSTA_EDICOES.length, 0, 'recusas não gravam');
  const novo = 'A licitante apresenta proposta para a calibração de termômetros digitais com emissão de certificado, no prazo de 30 dias corridos previsto no edital.';
  ok(ed({ trecho: 'apresentacao', texto: novo, motivo: 'Texto mais direto para o órgão' }));
  at = tela(a).atual;
  assert.equal(at.situacao, 'REVISAO'); assert.equal(at.integra, true);
  const tr = at.trechos.find((t) => t.chave === 'apresentacao');
  assert.equal(tr.texto, novo); assert.equal(tr.origem, 'DIRETORIA'); assert.equal(tr.editadoPor, 'DORA DIRETORA TESTE');
  const e1 = a.tabelas.LIC_PROPOSTA_EDICOES[0];
  // o "de" é o que estava no documento: a frase da IA não aceita não estava, valia o texto do sistema
  assert.match(e1.DE, /apresenta proposta técnica e comercial ao órgão/); assert.equal(e1.PARA, novo); assert.equal(e1.MOTIVO, 'Texto mais direto para o órgão'); assert.ok(at.edicoes[0].integra);
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'PROPOSTA_TRECHO_EDITADO' && h.DE === e1.DE.slice(0, 480) && h.PARA === novo));
  assert.equal(ok(ed({ trecho: 'apresentacao', texto: novo, motivo: 'Mesmo texto de novo' })).semMudanca, true);
  // aprovar e editar: a aprovação deixa de valer
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Conferida pela Diretoria' }));
  assert.equal(tela(a).atual.podeEmitir, true);
  const r = ok(ed({ trecho: 'observacoes', texto: 'Proposta elaborada conforme o edital.', motivo: 'Observação pedida pelo órgão' }));
  assert.equal(r.aprovacaoPerdida, true);
  at = tela(a).atual;
  assert.equal(at.situacao, 'REVISAO'); assert.equal(at.aprovadoPor, ''); assert.equal(at.podeEmitir, false);
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'PROPOSTA_TRECHO_EDITADO' && /aprovação de DORA DIRETORA TESTE deixou de valer/.test(h.TEXTO)));
  assert.match(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }).message, /aprove antes/);
});

test('aprovação e emissão: motivo, HTML A4 guardado com SHA-256, a linha emitida nunca muda, nova versão para mudar, PDF e conferência na abertura', () => {
  const a = base();
  montar(a);
  let at = tela(a).atual;
  assert.match(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'curto' }).message, /motivo/);
  assert.match(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }).message, /aprove antes/);
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Preços e escopo conferidos' }));
  assert.match(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Aprovar de novo sem mudar' }).message, /Aprovada pela Diretoria/);
  const em = ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }));
  const crypto = require('node:crypto');
  assert.equal(em.sha256, crypto.createHash('sha256').update(em.html, 'utf8').digest('hex'));
  assert.match(em.html, /Proposta técnica e comercial/); assert.match(em.html, /Nº LIC-2026-0001-P01 · Revisão 00/); assert.doesNotMatch(em.html, /RASCUNHO PARA REVISÃO/);
  assert.match(em.html, /data:image\/jpeg;base64,/, 'logomarca oficial'); assert.equal((em.html.match(/<img /g) || []).length, 1, 'nenhuma outra imagem');
  assert.match(em.html, /Conforme o edital: «O prazo de execução dos serviços será de 30 \(trinta\) dias corridos/); assert.match(em.html, /90|60 dias, contados da data de emissão/);
  const textoDoc = em.html.slice(em.html.indexOf('<main')).replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(textoDoc, /custo|margem|piso|sobra/i, 'o documento do órgão não leva custo nem margem');
  assert.doesNotMatch(em.html, /[\u{1F300}-\u{1FAFF}]/u);
  const linha = a.tabelas.LIC_PROPOSTAS[0];
  assert.equal(linha.SITUACAO, 'EMITIDA'); assert.equal(linha.HTML_SHA256, em.sha256); assert.ok(linha.PDF_ARQUIVO_ID); assert.equal(linha.EMITIDO_POR_NOME, 'DORA DIRETORA TESTE');
  assert.equal(a.arquivos[linha.HTML_ARQUIVO_ID].bytes.toString('utf8'), em.html, 'o HTML exato foi guardado');
  const congelada = JSON.stringify(linha);
  const v = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: linha.ID }));
  assert.equal(v.html, em.html); assert.equal(v.integra, true); assert.equal(v.emitida, true);
  assert.match(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: linha.ID }).message, /já foi emitida \(não muda nunca\)/);
  assert.match(a.prop('s_dora', 'trechoEditar', { id: 'op1', propostaId: linha.ID, trecho: 'apresentacao', texto: 'Outro texto qualquer aqui.', motivo: 'Tentar mudar a emitida' }).message, /não muda nunca.*Nova versão/);
  for (const op of ['apagar', 'alterar', 'reabrir', 'desemitir']) assert.match(a.prop('s_dora', op, { id: 'op1', propostaId: linha.ID }).message, /desconhecida/);
  // nova versão: a emitida continua igual
  ok(a.prop('s_dora', 'montar', { id: 'op1', motivo: 'Órgão pediu nova proposta com prazo novo' }));
  assert.equal(JSON.stringify(a.tabelas.LIC_PROPOSTAS[0]), congelada);
  const p = tela(a);
  assert.equal(p.atual.versao, 2); assert.equal(p.atual.situacao, 'RASCUNHO'); assert.deepEqual(p.versoes.map((x) => x.situacao), ['RASCUNHO', 'EMITIDA']);
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'PROPOSTA_NOVA_VERSAO'));
  // PDF com o SHA-256 conferido
  const pdf = ok(a.prop('s_dora', 'pdf', { id: 'op1', propostaId: linha.ID }));
  assert.equal(pdf.integra, true); assert.match(pdf.nome, /Proposta LIC-2026-0001-P01\.pdf/);
  // arquivo mexido fora do SGO+: a abertura avisa
  a.arquivos[linha.HTML_ARQUIVO_ID].bytes = Buffer.from(em.html.replace('199,00', '1,00'));
  assert.equal(ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: linha.ID })).integra, false);
  // histórico completo, com o hash
  const tipos = a.tabelas.LIC_HISTORICO.filter((h) => /^PROPOSTA_/.test(h.TIPO)).map((h) => h.TIPO);
  assert.deepEqual(tipos, ['PROPOSTA_RASCUNHO', 'PROPOSTA_APROVADA', 'PROPOSTA_EMITIDA', 'PROPOSTA_NOVA_VERSAO']);
  const he = a.tabelas.LIC_HISTORICO.find((h) => h.TIPO === 'PROPOSTA_EMITIDA');
  assert.match(he.TEXTO, new RegExp('SHA-256 ' + em.sha256)); assert.match(he.TEXTO, /Nada foi enviado a portal/); assert.equal(he.HASH, linha.HASH);
  // sem o serviço de arquivos: nada é emitido
  const b = base(); montar(b); const bt = tela(b).atual;
  ok(b.prop('s_dora', 'aprovar', { id: 'op1', propostaId: bt.id, motivo: 'Preços e escopo conferidos' }));
  b.ctx.SGO_DocSalvar_pastaPersistente_ = () => { throw new Error('Drive fora do ar'); };
  assert.match(b.prop('s_dora', 'emitir', { id: 'op1', propostaId: bt.id }).message, /Não foi possível guardar a cópia.*nada foi gravado/);
  assert.equal(b.tabelas.LIC_PROPOSTAS[0].SITUACAO, 'APROVADA');
});

test('relatórios: oportunidade e período com a fonte de cada número, versão imutável com SHA-256, abertura conferida e histórico', () => {
  const a = base();
  montar(a); const at = tela(a).atual;
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Preços e escopo conferidos' })); ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }));
  const r1 = ok(a.rel('s_dora', 'gerarOportunidade', { id: 'op1' }));
  assert.equal(r1.relatorio.versao, 1); assert.match(r1.relatorio.numero, /REL-LIC-2026-0001-V01/);
  const h = r1.html;
  for (const s of ['Resumo', 'Nota da análise', 'Leitura do edital', 'Habilitação', 'Preço', 'Propostas', 'Decisões e histórico']) assert.match(h, new RegExp('<h2>\\d+\\. ' + s + '</h2>'), s);
  assert.ok((h.match(/<b>Fonte:<\/b>/g) || []).length >= 7, 'cada parte com a fonte');
  assert.match(h, /O prazo de execução dos serviços será de 30 \(trinta\) dias corridos/, 'frase literal do checklist');
  assert.match(h, new RegExp('LIC_SIMULACOES versão 1 .*hash ' + a.tabelas.LIC_SIMULACOES[0].HASH.slice(0, 16)));
  assert.match(h, new RegExp(a.tabelas.LIC_PROPOSTAS[0].HTML_SHA256.slice(0, 24)));
  assert.match(h, /proposta emitida/i); assert.match(h, /Lidas 12 de 12 página/);
  const r2 = ok(a.rel('s_dora', 'gerarOportunidade', { id: 'op1' }));
  assert.equal(r2.relatorio.versao, 2);
  const v1 = a.tabelas.LIC_RELATORIOS[0];
  const ver1 = ok(a.rel('s_dora', 'ver', { relatorioId: v1.ID }));
  assert.equal(ver1.html, r1.html, 'a versão 1 continua igual'); assert.equal(ver1.integra, true);
  a.arquivos[v1.HTML_ARQUIVO_ID].bytes = Buffer.from(r1.html.replace('Resumo', 'Resum0'));
  assert.equal(ok(a.rel('s_dora', 'ver', { relatorioId: v1.ID })).integra, false);
  // período
  assert.match(a.rel('s_dora', 'gerarPeriodo', { de: '2026-11-30', ate: '2026-10-01' }).message, /antes do começo/);
  assert.match(a.rel('s_dora', 'gerarPeriodo', { de: '', ate: '2026-10-01' }).message, /Escolha as datas/);
  assert.match(a.rel('s_dora', 'gerarPeriodo', { de: '2024-01-01', ate: '2026-10-01' }).message, /até 400 dias/);
  const p = ok(a.rel('s_dora', 'gerarPeriodo', { de: '2026-10-01', ate: '2026-11-30' }));
  const hp = p.html;
  for (const s of ['Resumo do período', 'Oportunidades por etapa', 'Oportunidades por UF', 'Notas', 'Prazos de proposta no período', 'Alertas', 'Propostas emitidas', 'Resultados']) assert.match(hp, new RegExp('<h2>\\d+\\. ' + s + '</h2>'), s);
  assert.ok((hp.match(/<b>Fonte:<\/b>/g) || []).length >= 8);
  assert.match(hp, /2 ativas; 1 com a primeira coleta entre 01\/10\/2026 a 30\/11\/2026/, 'só a op1 entrou no período');
  assert.match(hp, /LIC-2026-0001-P01/, 'a proposta emitida no período'); assert.match(hp, /LIC-2026-0002/, 'fim de proposta da op2 no período');
  assert.match(hp, /ainda não registra o vencedor/);
  const tl = ok(a.rel('s_dora', 'tela'));
  assert.equal(tl.total, 3); assert.equal(tl.relatorios[0].tipo, 'PERIODO'); assert.ok(tl.relatorios.every((r) => r.sha256.length === 64));
  assert.ok(tl.oportunidades.some((o) => o.codigo === 'LIC-2026-0001'));
  const hist = a.tabelas.LIC_HISTORICO.filter((x) => x.TIPO === 'RELATORIO_GERADO');
  assert.equal(hist.length, 3); assert.equal(hist[2].ENTIDADE, 'RELATORIO'); assert.match(hist[0].TEXTO, new RegExp(v1.HTML_SHA256)); assert.equal(hist[0].HASH, v1.HASH);
  assert.match(a.rel('s_dora', 'ver', { relatorioId: 'nao_existe' }).message, /não foi encontrado/);
});

test('permissão: só Diretoria e Administrador; os outros perfis são recusados em toda ação e nada é gravado', () => {
  const a = base();
  montar(a);
  const pid = tela(a).atual.id;
  const antes = JSON.stringify([a.tabelas.LIC_PROPOSTAS, a.tabelas.LIC_PROPOSTA_EDICOES || [], a.tabelas.LIC_RELATORIOS || []]);
  for (const sid of ['s_gaspar', 's_vera', 's_tiago', 's_fabio', 's_rita', 's_mara']) {
    for (const op of ['tela', 'montar', 'trechoEditar', 'aprovar', 'emitir', 'ver', 'pdf']) {
      const r = a.prop(sid, op, { id: 'op1', propostaId: pid, trecho: 'apresentacao', texto: 'x', motivo: 'tentativa sem permissão' });
      assert.equal(r.ok, false, sid + ' ' + op); assert.equal(r.semAcesso, true, sid + ' ' + op);
    }
    for (const op of ['tela', 'gerarOportunidade', 'gerarPeriodo', 'ver']) { const r = a.rel(sid, op, { id: 'op1', de: '2026-10-01', ate: '2026-11-01' }); assert.equal(r.semAcesso, true, sid + ' ' + op); }
  }
  assert.equal(JSON.stringify([a.tabelas.LIC_PROPOSTAS, a.tabelas.LIC_PROPOSTA_EDICOES || [], a.tabelas.LIC_RELATORIOS || []]), antes);
  ok(a.prop('s_admin', 'tela', { id: 'op1' })); ok(a.rel('s_admin', 'tela'));
  // oportunidade descartada: não monta proposta, e diz o que fazer
  a.tabelas.LIC_OPORTUNIDADES[1].SITUACAO = 'DESCARTADA';
  assert.match(a.prop('s_dora', 'montar', { id: 'op2' }).message, /descartada\. Reabra antes/);
});

// ---------------------------------------------------------------- telas
function telaCliente() {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('licCorpo'); el('licProposta');
  const chamadas = [];
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => false, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push(acao + ':' + (d && d.op)); } }; } }; } } } } });
  const html = {};
  for (const f of ['JS_Licitacoes.html', 'JS_Licitacoes_Proposta.html', 'JS_Licitacoes_Relatorios.html']) {
    html[f] = fs.readFileSync(path.join(pasta, f), 'utf8');
    vm.runInContext(html[f].slice(html[f].indexOf('<script>') + 8, html[f].lastIndexOf('</script>')), ctx);
  }
  return { ctx, els, chamadas, html };
}

test('telas: aba Proposta (bloqueios, itens, trechos com a origem, retiradas, versões), tela Relatórios, escape do que vem do edital, ficha e celular de 390 px', () => {
  const a = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP, frase('A Metrolabs é líder de mercado.', ['EMPRESA'], 'Metrolab Soluções em Engenharia Clínica')], metodologia: [{ codigo: 'CAL-001', frases: [BOA_MET] }] }) });
  a.simular('op1', ITENS.map((i) => Object.assign({}, i, i.numero === '2' ? { descricao: '<img src=x onerror=alert(1)>' } : {})), 'Com descrição perigosa');
  montar(a);
  const t = telaCliente();
  const p = J(tela(a));
  const h = t.ctx.LicPp_htmlAbaDados_(p);
  assert.doesNotMatch(h, /<img src=x/); assert.match(h, /&lt;img src=x/);
  assert.match(h, /Proposta LIC-2026-0001-P01 · versão 1/); assert.match(h, /Aprovar \(Diretoria\)/); assert.match(h, /Ver a prévia em A4/); assert.match(h, /Relatório desta oportunidade \(A4\)/);
  assert.match(h, /Não cotado/); assert.match(h, /fora do catálogo/); assert.match(h, /Redigido pela IA e conferido nas fontes/); assert.match(h, /Frases da IA retiradas pelo verificador \(1\)/); assert.match(h, /superlativo/);
  assert.match(h, /data-lpp-editar="apresentacao"/); assert.match(h, /não tem fotos nem ícones/);
  const tds = h.match(/<td[^>]*>/g) || []; assert.ok(tds.length > 10 && tds.every((x) => /data-r="/.test(x)), 'células viram cartão no celular');
  // sem simulação: o caminho para a aba Preço
  const semSim = t.ctx.LicPp_htmlAbaDados_({ simulacao: null, atual: null, versoes: [], iaDisponivel: false });
  assert.match(semSim, /Sem simulação de preço salva: não há proposta comercial/); assert.match(semSim, /data-lpp-ir-preco/); assert.match(semSim, /Montar rascunho/);
  // emitida: sem aprovar nem emitir, com o aviso de que não muda
  const pe = J(p); Object.assign(pe.atual, { situacao: 'EMITIDA', situacaoNome: 'Emitida (congelada)', podeAprovar: false, podeEmitir: false, editavel: false, emitidoEm: '2026-11-02T13:00:00Z', emitidoPor: 'Dora', htmlSha256: 'a'.repeat(64), pdf: true, bloqueios: [] });
  const he = t.ctx.LicPp_htmlAbaDados_(pe);
  assert.match(he, /não muda nunca/); assert.match(he, /Nova versão/); assert.match(he, /Baixar o PDF/); assert.doesNotMatch(he, /data-lpp-editar|data-lpp-aprovar|data-lpp-emitir/);
  // ficha: a aba Proposta existe e chama o servidor só quando aberta
  const ficha = t.ctx.Lic_htmlFicha_({ op: { id: 'op1', codigo: 'LIC-2026-0001', uf: 'GO', selos: [], pendencias: [] }, historico: [] }, 'proposta');
  assert.match(ficha, /aria-selected="true" data-lic-fab="proposta">Proposta<\/button>/); assert.match(ficha, /id="licProposta"/);
  t.ctx.LicPp_ligarAba_({}, {}, 'op1'); assert.deepEqual(t.chamadas, ['proposta:tela']);
  // tela Relatórios
  ok(a.rel('s_dora', 'gerarPeriodo', { de: '2026-10-01', ate: '2026-11-30' }));
  const dr = J(ok(a.rel('s_dora', 'tela')));
  dr.oportunidades[0].orgao = '<script>alert(1)</script>';
  const hr = t.ctx.LicRl_htmlTela_(dr);
  assert.doesNotMatch(hr, /<script>alert/); assert.match(hr, /&lt;script&gt;/);
  assert.match(hr, /Relatório da oportunidade/); assert.match(hr, /Relatório do período/); assert.match(hr, /type="date"/); assert.match(hr, /data-lrl-ver=/); assert.match(hr, /Relatórios gerados \(1\)/);
  // celular de 390 px: nada de largura fixa maior que a tela; toque de 44 px; sem atualização automática; CRLF
  for (const f of ['JS_Licitacoes_Proposta.html', 'JS_Licitacoes_Relatorios.html']) {
    const css = t.html[f];
    for (const m of css.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, f + ' largura fixa ' + m[0]);
    for (const m of css.matchAll(/minmax\((\d+)px/g)) assert.ok(Number(m[1]) <= 300, f + ' minmax ' + m[0]);
    assert.doesNotMatch(css, /setInterval/); assert.match(css, /\r\n/, f + ' em CRLF');
  }
  assert.match(t.html['JS_Licitacoes_Proposta.html'], /\.lpp-det summary \{[^}]*min-height: 44px/);
  // o A4 da moldura tem o ajuste de tela pequena (folha e tabela)
  const doc = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: p.atual.id })).html;
  assert.match(doc, /@media screen and \(max-width:640px\)\{\.folha\{padding:6mm 4mm\}/); assert.match(doc, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.doesNotMatch(doc, /<img src=x/);
});

test('integração na casca: menu, rota, inclusão dos arquivos novos, navegação, ações do servidor, ajuda das telas e manual', () => {
  const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
  const idx = ler('Index.html');
  assert.match(idx, /data-mod="licitacoes_relatorios"[^>]*onclick="abrir\('licitacoes_relatorios'\)"[^>]*>.*Relatórios<\/button>/);
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Proposta'\); \?>/); assert.match(idx, /<\?!= include\('JS_Licitacoes_Relatorios'\); \?>/);
  const js = ler('JS_Licitacoes.html');
  assert.match(js, /\["licitacoes_relatorios", "Relatórios"\]/); assert.match(js, /licitacoes_relatorios: "Relatórios de Licitações"/);
  assert.match(js, /LIC\.mod === "licitacoes_relatorios"\) \{ if \(typeof LicRl_renderTela_ === "function"\)/);
  assert.match(js, /\["proposta", "Proposta"\]/); assert.match(js, /LicPp_ligarAba_\(c, d, id\)/);
  const srv = ler('SGO_Licitacoes.js');
  assert.match(srv, /proposta: function \(eu, d\) \{ return LicProp_acao_\(eu, d\); \}/); assert.match(srv, /relatorios: function \(eu, d\) \{ return LicRel_acao_\(eu, d\); \}/);
  const a = ambienteProposta();
  for (const f of ['SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_Ajuda_LicitacoesRelatorios.js']) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), a.ctx);
  const t = a.ctx.SGO_ajudaTelas_LicitacoesRelatorios_().licitacoes_relatorios;
  assert.ok(t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length);
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_relatorios); assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_relatorios);
  assert.ok(a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades.passos.some((p) => p.titulo === 'Proposta (A4)'));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /## Proposta \(aba Proposta da ficha\)/); assert.match(manual, /## Relatórios \(Licitações › Relatórios\)/); assert.match(manual, /LIC_PROPOSTA_EDICOES/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Proposta \(aba Proposta da ficha\)/, 'base do assistente regerada');
  const textos = ['SGO_Licitacoes_Proposta.js', 'SGO_Licitacoes_Relatorios.js', 'JS_Licitacoes_Proposta.html', 'JS_Licitacoes_Relatorios.html', 'SGO_Ajuda_LicitacoesRelatorios.js'].map(ler).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sem emoji');
  for (const f of ['SGO_Licitacoes_Proposta.js', 'SGO_Licitacoes_Relatorios.js', 'SGO_Ajuda_LicitacoesRelatorios.js']) assert.match(ler(f), /\r\n/, f + ' em CRLF');
});

// ---------------------------------------------------------------- revisão independente de 9dc456f (um teste para cada ataque)
const OBJ = 'calibração de termômetros digitais com emissão de certificado';
const fAp = (texto) => frase(texto, ['EMPRESA', 'CAMPO:objeto'], OBJ);

test('revisão ALTA 1: afirmação inventada é recusada (palavra fora das fontes, lista de bloqueio, número por extenso); só o que a Diretoria aceita entra no documento emitido', () => {
  const ataques = [
    ['A Metrolabs presta serviço ótimo e ágil na ' + OBJ + '.', /"ótimo".*|"ágil"/],
    ['A Metrolabs é credenciada no órgão para a ' + OBJ + '.', /"credenciada"/],
    ['A Metrolabs é a única no estado com este serviço de ' + OBJ + '.', /"única"/],
    ['A ' + OBJ + ' segue a norma ANVISA.', /"ANVISA"/],
    ['A ' + OBJ + ' tem garantia de um ano.', /"garantia"/],
    ['A ' + OBJ + ' usa padrões RBC rastreáveis.', /RBC só na forma fixa/],
    ['A ' + OBJ + ' é homologada pela Cgcre.', /"homologada"/],
    ['A ' + OBJ + ' é exclusiva da Metrolabs, a líder e a melhor do setor.', /"exclusiva"/],
    ['A ' + OBJ + ' segue a ISO aplicável.', /ISO sem o número completo/],
    ['A ' + OBJ + ' é o mais completo.', /"o mais"/],
    ['A ' + OBJ + ' é rápida.', /a palavra rapida não está/],
    ['A ' + OBJ + ' ocorre em dois dias.', /dois dia/]];
  for (let k = 0; k < ataques.length; k += 5) {
    const lote = ataques.slice(k, k + 5);
    const x = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP].concat(lote.map((y) => fAp(y[0]))), metodologia: [{ codigo: 'CAL-001', frases: [BOA_MET] }] }) });
    montar(x);
    const cx = tela(x).atual.conteudo;
    for (const [t, re] of lote) { const r = cx.ia.retiradas.find((y) => y.texto === t); assert.ok(r, 'passou: ' + t); assert.match(r.motivo, re, t); }
    assert.equal(cx.trechos.apresentacao.frases.length, 1, 'só a frase boa fica'); assert.equal(cx.trechos.apresentacao.frases[0].texto, BOA_AP.texto);
  }
  const a = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP], metodologia: [{ codigo: 'CAL-001', frases: [BOA_MET] }] }) });
  montar(a);
  // número por extenso: "um/uma" só antes de unidade; algarismo na fonte vale
  const X = (t, f) => J(a.ctx.LicProp_extensosFora_(t, [f]));
  assert.deepEqual(X('garantia de um ano', 'texto sem número'), ['um ano']); assert.deepEqual(X('uma calibração por equipamento', 'texto'), []);
  assert.deepEqual(X('em trinta dias corridos', 'prazo de 30 dias'), []); assert.deepEqual(X('em quinze dias', 'prazo de 30 dias'), ['quinze dias']);
  // entregável do catálogo não é "certificada"; ISO com número não cai na regra do ISO
  const R = (t) => { const p = []; a.ctx.LicProp_conferirRegras_('x', t, p, {}); return p; };
  assert.deepEqual(R('A calibração tem emissão de certificado de calibração por equipamento.'), []);
  assert.match(R('A Metrolabs é certificada.').join(), /"certificada"/);
  assert.ok(!R('Conforme a ISO 9001.').some((p) => /ISO sem/.test(p)));
  // decisão do coordenador: a frase conferida espera o aceite; emitida sem aceite = texto do sistema
  const at = tela(a).atual;
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Aprovada sem aceitar a IA' }));
  const em = ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }));
  assert.doesNotMatch(em.html, /apresenta proposta para a calibração de termômetros digitais/); assert.match(em.html, /apresenta proposta técnica e comercial ao órgão/);
  assert.doesNotMatch(em.html, /Metodologia:<\/b>/);
  // aceite e retirada, com histórico; aceitar depois de aprovar tira a aprovação
  const b = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP], metodologia: [{ codigo: 'CAL-001', frases: [BOA_MET] }] }) });
  montar(b); let bt = tela(b).atual;
  ok(b.prop('s_dora', 'aprovar', { id: 'op1', propostaId: bt.id, motivo: 'Primeira aprovação' }));
  const ac = ok(b.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: bt.id, trecho: 'apresentacao', indice: 0, aceitar: true }));
  assert.equal(ac.aprovacaoPerdida, true);
  assert.equal(ok(b.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: bt.id, trecho: 'apresentacao', indice: 0, aceitar: true })).semMudanca, true);
  assert.match(b.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: bt.id, trecho: 'apresentacao', indice: 7, aceitar: true }).message, /Escolha uma frase da IA/);
  bt = tela(b).atual;
  const tAp = bt.trechos.find((x) => x.chave === 'apresentacao');
  assert.equal(tAp.aceitas, 1); assert.equal(tAp.noDocumento, BOA_AP.texto); assert.equal(bt.situacao, 'REVISAO');
  const e = b.tabelas.LIC_PROPOSTA_EDICOES.find((x) => x.TRECHO === 'apresentacao#0');
  assert.match(e.PARA, /^aceita: A Metrolab/); assert.equal(e.POR_NOME, 'DORA DIRETORA TESTE'); assert.match(e.TRECHO_NOME, /Apresentação, frase 1/);
  ok(b.prop('s_dora', 'aprovar', { id: 'op1', propostaId: bt.id, motivo: 'Aprovada com a frase aceita' }));
  const em2 = ok(b.prop('s_dora', 'emitir', { id: 'op1', propostaId: bt.id }));
  assert.match(em2.html, /apresenta proposta para a calibração de termômetros digitais com emissão de certificado/); assert.doesNotMatch(em2.html, /Metodologia:<\/b>/, 'a metodologia não aceita ficou fora');
  assert.match(b.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: bt.id, trecho: 'apresentacao', indice: 0, aceitar: false }).message, /não muda nunca/);
});

test('revisão ALTA 2: RBC só na forma fixa do sistema (frase da IA e da Diretoria); "As calibrações são rastreáveis" deixou de ser fonte; a calibração traz a frase pronta', () => {
  const fixa = frase('A calibração da indicação de temperatura usa padrões com rastreabilidade a laboratórios da RBC.', ['CAT:CAL-001'], 'Padrões com rastreabilidade a laboratórios da RBC');
  const outra = frase('A calibração da indicação de temperatura é rastreável à RBC.', ['CAT:CAL-001'], 'Padrões com rastreabilidade a laboratórios da RBC');
  const a = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP], metodologia: [{ codigo: 'CAL-001', frases: [fixa, outra] }] }) });
  montar(a);
  const at = tela(a).atual, c = at.conteudo;
  assert.equal(c.trechos['metodologia:CAL-001'].frases.length, 1); assert.equal(c.trechos['metodologia:CAL-001'].frases[0].texto, fixa.texto);
  assert.match(c.ia.retiradas.find((r) => r.texto === outra.texto).motivo, /RBC só na forma fixa/);
  assert.equal(c.tecnicos['CAL-001'].rastreabilidade, 'Padrões com rastreabilidade a laboratórios da RBC.');
  const ctx = a.ctx.LicProp_ctx_(c);
  assert.doesNotMatch(ctx.fontesCons.EMPRESA.texto, /rastreáve/i, 'a fonte genérica que liberava RBC saiu');
  const html = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: at.id })).html;
  assert.match(html, /Rastreabilidade<\/th><td colspan="3">Padrões com rastreabilidade a laboratórios da RBC\./);
  // Diretoria: RBC fora da forma fixa e acreditação recusados, mesmo com "assumo este texto"
  const ed = (texto, assumo) => a.prop('s_dora', 'trechoEditar', { id: 'op1', propostaId: at.id, trecho: 'observacoes', texto, motivo: 'Texto da Diretoria aqui', assumo });
  assert.match(ed('As calibrações são rastreáveis à RBC.', true).message, /RBC só na forma fixa.*não pode ser assumido/);
  assert.match(ed('A Metrolabs é acreditada.', true).message, /não pode ser assumido/);
  ok(ed('A calibração usa padrões com rastreabilidade a laboratórios da RBC.', false));
});

test('revisão MÉDIA 3: a edição da Diretoria passa pela lista de bloqueio; texto que fura só com "assumo este texto" e motivo, registrado no histórico e na aprovação', () => {
  const a = base(); montar(a);
  let at = tela(a).atual;
  const ed = (texto, assumo) => a.prop('s_dora', 'trechoEditar', { id: 'op1', propostaId: at.id, trecho: 'observacoes', texto, motivo: 'O edital pede esta declaração', assumo });
  for (const t of ['A Metrolabs é credenciada no órgão.', 'O serviço tem garantia de um ano.', 'A Metrolabs é a única no estado.', 'Segue a norma ANVISA.'])
    assert.match(ed(t, false).message, /palavra bloqueada|número por extenso.*Assumo este texto/, t);
  assert.equal(a.tabelas.LIC_PROPOSTA_EDICOES.length, 0);
  const r = ok(ed('O serviço tem garantia de um ano.', true));
  assert.equal(r.assumido, true);
  at = tela(a).atual;
  const t = at.trechos.find((x) => x.chave === 'observacoes');
  assert.ok(t.assumido && t.assumido.problemas.some((p) => /garantia/.test(p))); assert.ok(at.avisos.some((x) => /assumido pela Diretoria fora das regras/.test(x)));
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'PROPOSTA_TRECHO_EDITADO' && /ASSUMIDO pela Diretoria fora das regras/.test(h.TEXTO)));
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Aprovada com o texto assumido' }));
  assert.match(a.tabelas.LIC_HISTORICO.find((h) => h.TIPO === 'PROPOSTA_APROVADA').TEXTO, /1 trecho\(s\) assumido\(s\) pela Diretoria fora das regras do verificador: Observações da Diretoria/);
});

test('revisão MÉDIA 4: o documento do órgão não leva as observações internas do catálogo nem a referência interna da simulação (ficam na aba)', () => {
  const a = ambienteProposta();
  a.simular('op1', [{ numero: '1', codigo: 'CAL-001', quantidade: 10, precoProposta: '199,00' }, { numero: '2', codigo: 'QUA-001', quantidade: 1, precoProposta: '6.900,00' }]);
  montar(a, { usarIA: false });
  const at = tela(a).atual;
  assert.ok(at.conteudo.tecnicos['QUA-001'].avisos.some((x) => /NR-13 não está incluída/.test(x)), 'o aviso continua no conteúdo da aba');
  assert.ok(at.simulacaoHash);
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Conferida pela Diretoria' }));
  const html = ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id })).html;
  assert.doesNotMatch(html, /Observações técnicas|NR-13 não está incluída|protocolo define as repetições/);
  assert.doesNotMatch(html, /Referência interna|simulação de preço versão/); assert.doesNotMatch(html, new RegExp(at.simulacaoHash.slice(0, 16)));
});

test('revisão MÉDIA 5: versão nova da fonte ou leitura mais nova depois do rascunho bloqueia aprovar e emitir ("o edital mudou")', () => {
  const a = base(); montar(a);
  let at = tela(a).atual;
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Conferida pela Diretoria' }));
  a.tabelas.LIC_OPORTUNIDADES[0].VERSAO_HASH = 'h2'; a.tabelas.LIC_OPORTUNIDADES[0].VERSAO_FONTE = 2;
  assert.match(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }).message, /O edital mudou: há versão nova da fonte.*Monte de novo/);
  montar(a, { motivo: 'Edital retificado na fonte' });
  at = tela(a).atual; assert.deepEqual(at.bloqueios, []);
  // leitura nova (versão 2)
  a.tabelas.LIC_LEITURAS.push(Object.assign({}, a.tabelas.LIC_LEITURAS[0], { ID: 'le2', VERSAO: 2 }));
  at = tela(a).atual;
  assert.ok(at.bloqueios.some((b) => /leitura do edital mais nova \(versão 2\).*Monte de novo/.test(b)));
  assert.match(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Tentar com leitura velha' }).message, /O edital mudou/);
});

test('revisão MÉDIA 6: o HTML e o PDF só ficam guardados se o acesso conferido for RESTRITO (PRIVATE só no Google); senão lixeira e nada é emitido', () => {
  const prep = () => { const a = base(); montar(a); const at = tela(a).atual; ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Conferida pela Diretoria' })); return { a, at }; };
  const x = prep();
  ok(x.a.prop('s_dora', 'emitir', { id: 'op1', propostaId: x.at.id }));
  const l = x.a.tabelas.LIC_PROPOSTAS[0];
  assert.equal(x.a.arquivos[l.HTML_ARQUIVO_ID].acesso, 'RESTRITO'); assert.equal(x.a.arquivos[l.PDF_ARQUIVO_ID].acesso, 'RESTRITO');
  // o serviço aceitou o pedido mas não restringiu: lixeira e erro
  const y = prep(); y.a.compartilhamentoIgnorado = true;
  assert.match(y.a.prop('s_dora', 'emitir', { id: 'op1', propostaId: y.at.id }).message, /não ficou restrito.*lixeira.*nada foi gravado/);
  assert.ok(Object.values(y.a.arquivos).length >= 1 && Object.values(y.a.arquivos).every((f) => f.lixeira)); assert.equal(y.a.tabelas.LIC_PROPOSTAS[0].SITUACAO, 'APROVADA');
  assert.match(y.a.rel('s_dora', 'gerarOportunidade', { id: 'op1' }).message, /não ficou restrito/);
  // Google Drive (sem RESTRITO): PRIVATE conferido vale
  const z = prep(); z.a.semRestrito = true;
  ok(z.a.prop('s_dora', 'emitir', { id: 'op1', propostaId: z.at.id }));
  assert.equal(z.a.arquivos[z.a.tabelas.LIC_PROPOSTAS[0].HTML_ARQUIVO_ID].acesso, 'PRIVATE');
});

test('revisão MÉDIA 7: documento que não confere não é entregue nem aberto; o A4 abre num iframe sandbox sem allow-same-origin', () => {
  const a = base(); montar(a); const at = tela(a).atual;
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: at.id, motivo: 'Conferida pela Diretoria' }));
  const em = ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: at.id }));
  const l = a.tabelas.LIC_PROPOSTAS[0];
  a.arquivos[l.HTML_ARQUIVO_ID].bytes = Buffer.from(em.html.replace('199,00', '1,00'));
  const v = ok(a.prop('s_dora', 'ver', { id: 'op1', propostaId: l.ID }));
  assert.equal(v.integra, false); assert.equal(v.html, ''); assert.match(v.aviso, /não foi aberto/);
  const r = ok(a.rel('s_dora', 'gerarOportunidade', { id: 'op1' })), rr = a.tabelas.LIC_RELATORIOS[0];
  a.arquivos[rr.HTML_ARQUIVO_ID].bytes = Buffer.from(r.html + ' ');
  const vr = ok(a.rel('s_dora', 'ver', { relatorioId: rr.ID }));
  assert.equal(vr.integra, false); assert.equal(vr.html, '');
  // rascunho com o registro mexido também não abre
  const b = base(); montar(b); const bt = tela(b).atual;
  b.tabelas.LIC_PROPOSTAS[0].TOTAL = 1;
  assert.equal(ok(b.prop('s_dora', 'ver', { id: 'op1', propostaId: bt.id })).html, '');
  // cliente: página segura e nada aberto quando não confere
  const t = telaCliente();
  const pag = t.ctx.LicPp_paginaSegura_('<!DOCTYPE html><title>Doc "x"</title><script>alert(1)</script>');
  assert.match(pag, /<iframe sandbox="allow-scripts allow-modals allow-popups"/); assert.doesNotMatch(pag, /allow-same-origin/);
  assert.match(pag, /srcdoc="&lt;!DOCTYPE html&gt;&lt;title&gt;Doc &quot;x&quot;/); assert.doesNotMatch(pag, /<script>alert/);
  const src = t.html['JS_Licitacoes_Proposta.html'], srcR = t.html['JS_Licitacoes_Relatorios.html'];
  assert.match(src, /if \(!r\.integra\) \{ LicPp_fecharJanela_\(j\); Lic_toast_\(r\.aviso/); assert.match(srcR, /if \(!r\.integra\) \{ LicRl_fechar_\(j\); Lic_toast_\(r\.aviso/);
  assert.doesNotMatch(srcR, /j\.document\.write\(html\)/, 'o caminho de reserva também usa a página segura');
});

test('revisão BAIXA 8: o hash da proposta cobre total, itens, validade, arquivos e substituição; o do relatório, o arquivo, a oportunidade e o período', () => {
  const a = base(); montar(a);
  const campos = { TOTAL: 1, ITENS_COTADOS: 9, ITENS_NAO_COTADOS: 0, VALIDADE_DIAS: 365, HTML_ARQUIVO_ID: 'outro', PDF_ARQUIVO_ID: 'outro', SUBSTITUIDA_POR_ID: 'outra' };
  for (const k of Object.keys(campos)) {
    const r = Object.assign({}, a.tabelas.LIC_PROPOSTAS[0]);
    assert.equal(a.ctx.LicProp_integra_(r), true);
    r[k] = campos[k]; assert.equal(a.ctx.LicProp_integra_(r), false, k);
  }
  const r0 = Object.assign({}, a.tabelas.LIC_PROPOSTAS[0], { TOTAL: String(a.tabelas.LIC_PROPOSTAS[0].TOTAL) });
  assert.equal(a.ctx.LicProp_integra_(r0), true, 'número lido da planilha como texto continua íntegro');
  ok(a.rel('s_dora', 'gerarPeriodo', { de: '2026-10-01', ate: '2026-11-30' }));
  for (const k of ['HTML_ARQUIVO_ID', 'OPORTUNIDADE_ID', 'PERIODO_DE', 'PERIODO_ATE', 'HTML_TAMANHO']) {
    const rr = Object.assign({}, a.tabelas.LIC_RELATORIOS[0]); rr[k] = k === 'HTML_TAMANHO' ? 1 : 'x';
    assert.notEqual(a.ctx.LicRel_hashReg_(rr), rr.HASH, k);
  }
});

test('revisão BAIXA 9: relatório do período com as definições do Painel (sem ciência, médias sem descartadas e travadas, mudanças de etapa reais com REABERTA)', () => {
  const a = base();
  a.tabelas.LIC_OPORTUNIDADES.push({ ID: 'op3', CODIGO: 'LIC-2026-0003', SITUACAO: 'RADAR', TRIAGEM: 'TRAVADA', NOTA: 0, NOTA_CLASSE: 'DESCARTE', UF: 'GO', PRIMEIRA_COLETA_EM: '2026-10-21T13:00:00.000Z', VERSAO_FONTE: 1, VERSAO_HASH: 'h1' },
    { ID: 'op4', CODIGO: 'LIC-2026-0004', SITUACAO: 'DESCARTADA', NOTA: 10, NOTA_CLASSE: 'DESCARTE', UF: 'GO', PRIMEIRA_COLETA_EM: '2026-10-22T13:00:00.000Z', VERSAO_FONTE: 1, VERSAO_HASH: 'h1' });
  a.tabelas.LIC_ALERTAS = [{ ID: 'al1', SITUACAO: 'ENVIADO', CRIADO_EM: '2026-10-25T12:00:00.000Z', ALVO_ISO: '2026-12-30T12:00:00.000Z', NIVEL: 'NORMAL' },
    { ID: 'al2', SITUACAO: 'ENVIADO', CRIADO_EM: '2026-10-25T12:00:00.000Z', ALVO_ISO: '2026-10-01T12:00:00.000Z', NIVEL: 'NORMAL' },
    { ID: 'al3', SITUACAO: 'ENVIADO', CRIADO_EM: '2026-10-25T12:00:00.000Z', ALVO_ISO: '2026-12-30T12:00:00.000Z', CIENTE_EM: '2026-10-25T13:00:00.000Z', NIVEL: 'NORMAL' }];
  for (const [tipo, data] of [['ENVIADA_PARA_ANALISE', '2026-10-20'], ['DESCARTADA_PELA_DIRETORIA', '2026-10-21'], ['REABERTA', '2026-10-22'], ['REABERTA', '2026-09-01']])
    a.tabelas.LIC_HISTORICO.push({ ID: 'h' + tipo + data, ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: 'op1', TIPO: tipo, DATA: data + 'T13:00:00.000Z' });
  const d = J(a.ctx.LicRel_dadosPeriodo_('2026-10-01', '2026-11-30'));
  assert.equal(d.novas, 3); assert.equal(d.notas.qtd, 1, 'travada e descartada fora das notas'); assert.equal(d.notas.media, 72);
  assert.equal(d.alertas.total, 3); assert.equal(d.alertas.semCiencia, 1, 'a regra da Central: enviado, sem ciência e com o prazo por vir');
  assert.deepEqual(d.etapas, { ENVIADA_PARA_ANALISE: 1, DESCARTADA_PELA_DIRETORIA: 1, REABERTA: 1 }); assert.equal(d.mudancasEtapa, 3);
  const h = ok(a.rel('s_dora', 'gerarPeriodo', { de: '2026-10-01', ate: '2026-11-30' })).html;
  assert.match(h, /1 envio\(s\) para análise, 1 descarte\(s\) pela Diretoria e 1 reabertura\(s\)/); assert.match(h, /sem as descartadas e as travadas \(a mesma regra do Painel\)/);
});

test('revisão BAIXA 10: número negativo no começo do texto fica; mais frases da IA do que o limite viram aviso', () => {
  const a = base({ ia: () => JSON.stringify({ apresentacao: Array.from({ length: 8 }, () => BOA_AP), metodologia: [{ codigo: 'CAL-001', frases: Array.from({ length: 10 }, () => BOA_MET) }] }) });
  assert.equal(a.ctx.LicProp_txt_('-10 °C é o primeiro ponto'), '-10 °C é o primeiro ponto');
  assert.equal(a.ctx.LicProp_txt_('=SOMA(A1)'), 'SOMA(A1)'); assert.equal(a.ctx.LicProp_txt_('- item de lista'), 'item de lista'); assert.equal(a.ctx.LicProp_txt_('@x'), 'x');
  montar(a);
  const av = tela(a).atual.avisos;
  assert.ok(av.some((x) => /A IA mandou 8 frases na apresentação; só as 6 primeiras foram conferidas/.test(x)));
  assert.ok(av.some((x) => /A IA mandou 10 frases na metodologia de CAL-001; só as 8 primeiras/.test(x)));
});

// ---------------------------------------------------------------- conferência de 94beba7
test('conferência 1 (ALTA): "Rede Brasileira de Calibração" e variações contam como RBC, para a IA e para a Diretoria, sem "assumo"', () => {
  const a = base(); montar(a); const at = tela(a).atual;
  const ed = (texto, assumo) => a.prop('s_dora', 'trechoEditar', { id: 'op1', propostaId: at.id, trecho: 'observacoes', texto, motivo: 'Texto da Diretoria aqui', assumo });
  for (const t of ['A Metrolabs integra a Rede Brasileira de Calibração.', 'A Metrolabs integra a rede brasileira de calibracao.', 'Padrões da Rede Brasileira de Laboratórios de Calibração.']) {
    assert.match(ed(t, false).message, /RBC só na forma fixa/, t); assert.match(ed(t, true).message, /não pode ser assumido/, t);
  }
  assert.equal(a.tabelas.LIC_PROPOSTA_EDICOES.length, 0);
  const p = []; a.ctx.LicProp_conferirRegras_('x', 'A Metrolabs integra a Rede Brasileira de Calibração.', p, {});
  assert.ok(p.some((x) => /Rede Brasileira de Calibração \(RBC\)/.test(x)) && p.some((x) => /RBC só na forma fixa/.test(x)));
});

test('conferência 2 (MÉDIA): Cgcre, credenciamento e Inmetro fora de balança e esfigmomanômetro não podem ser assumidos', () => {
  const a = base(); montar(a); const at = tela(a).atual;
  const ed = (trecho, texto) => a.prop('s_dora', 'trechoEditar', { id: 'op1', propostaId: at.id, trecho, texto, motivo: 'Texto da Diretoria aqui', assumo: true });
  for (const t of ['A Metrolabs é credenciada pela Cgcre.', 'A Metrolabs tem credenciamento no órgão.', 'O serviço é autorizado pelo Inmetro.', 'A calibração é aprovada pelo Inmetro.'])
    assert.match(ed('observacoes', t).message, /não pode ser assumido/, t);
  assert.equal(a.tabelas.LIC_PROPOSTA_EDICOES.length, 0);
  ok(ed('observacoes', 'O serviço tem garantia de um ano.'));   // o que não é duro continua podendo ser assumido
});

test('conferência 3 (BAIXA): fraseAceitar só aceita índice com dígitos ("" não vira a frase 0)', () => {
  const a = base({ ia: () => JSON.stringify({ apresentacao: [BOA_AP], metodologia: [] }) }); montar(a); const at = tela(a).atual;
  for (const indice of ['', ' ', null, '0.0', '-1', 'x', true]) assert.match(a.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: at.id, trecho: 'apresentacao', indice, aceitar: true }).message, /Escolha uma frase da IA/, String(indice));
  assert.equal(tela(a).atual.trechos.find((x) => x.chave === 'apresentacao').aceitas, 0);
  ok(a.prop('s_dora', 'fraseAceitar', { id: 'op1', propostaId: at.id, trecho: 'apresentacao', indice: '0', aceitar: true }));
});
