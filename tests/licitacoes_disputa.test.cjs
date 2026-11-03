// SGO+ Licitações, Central de disputas no modo assistido e resultado (02/11/2026): abrir a disputa da proposta emitida e da simulação
// (valor inicial, piso por item, custo + impostos, intervalo), piso autorizado com motivo (abaixo do custo só com "assumo"), sugestão
// determinística do próximo lance, lance abaixo do piso recusado, registro imutável com hash encadeado, resultado por item movendo o
// Kanban, prazos de recurso e contrarrazões pendentes de confirmação, relatório A4 imutável, permissão e telas (computador e 390 px).
// Código real do Comercial e de Licitações num contexto isolado (tests/_licitacoes_proposta_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { ambienteProposta } = require('./_licitacoes_proposta_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const J = (x) => JSON.parse(JSON.stringify(x));
const ITENS = [{ numero: '1', descricao: 'Calibração de termômetro digital com certificado', codigo: 'CAL-001', quantidade: 100, precoEdital: '200,00', precoProposta: '199,00', origem: 'PNCP' },
  { numero: '2', descricao: 'Calibração de termômetro tipo espeto', codigo: 'CAL-002', quantidade: 10, precoEdital: '400,00', precoProposta: '390,00', origem: 'PNCP' },
  { numero: '3', descricao: 'Locação de veículo utilitário', codigo: '', quantidade: 1, precoEdital: '1000', origem: 'PNCP' }];

/** op1 (Lei 14.133) com a simulação salva e a proposta emitida; op2 sem proposta. */
function base(o) {
  o = o || {};
  const a = ambienteProposta();
  for (const f of ['SGO_Licitacoes_Disputa.js', 'SGO_Licitacoes_Painel.js']) vm.runInContext(a.ler(f), a.ctx, { filename: f });
  a.tabelas.LIC_OPORTUNIDADES[0].LEI = '14133';
  a.simular('op1', ITENS, 'Simulação para a disputa');
  if (o.emitir !== false) {
    ok(a.prop('s_dora', 'montar', { id: 'op1', usarIA: false }));
    const pid = ok(a.prop('s_dora', 'tela', { id: 'op1' })).proposta.atual.id;
    ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: pid, motivo: 'Preços e escopo conferidos' }));
    ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: pid }));
  }
  a.dsp = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'disputa', Object.assign({ op }, d || {}));
  a.d = (op, d) => a.dsp('s_dora', op, Object.assign({ id: 'op1' }, d || {}));
  a.tela = () => ok(a.d('tela')).disputa;
  a.item = (k) => a.tela().disputa.itens.find((i) => i.item === k);
  a.abrir = (d) => ok(a.d('abrir', Object.assign({ motivo: 'Proposta emitida e piso conferido pela Diretoria' }, d || {})));
  a.reg = () => a.tabelas.LIC_DISPUTA_LANCES || [];
  a.hist = (tipo) => (a.tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo);
  a.op = (id) => a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === (id || 'op1'));
  return a;
}

test('abrir: exige proposta emitida e simulação conferida; valor inicial da proposta, piso da simulação por item, custo + impostos, intervalo; Kanban vai para Disputa com motivo e histórico', () => {
  // sem proposta emitida: a prévia diz o que fazer e abrir recusa sem gravar
  const s = base({ emitir: false });
  const p0 = s.tela().previa;
  assert.equal(p0.podeAbrir, false); assert.ok(p0.bloqueios.some((b) => /Sem proposta emitida.*aba Proposta/.test(b)));
  assert.match(s.d('abrir', { motivo: 'Tentativa sem proposta emitida' }).message, /Sem proposta emitida.*Nada foi gravado/);
  assert.equal((s.tabelas.LIC_DISPUTAS || []).length, 0); assert.equal(s.op().SITUACAO, 'ANALISE');
  const a = base();
  const pv = a.tela().previa;
  assert.equal(pv.podeAbrir, true); assert.deepEqual(pv.bloqueios, []);
  assert.deepEqual(pv.itens.map((i) => i.item), ['1', '2'], 'só os itens cotados entram');
  const sim = JSON.parse(a.tabelas.LIC_SIMULACOES[0].RESULTADO_JSON), si = sim.itens[0];
  const i1 = pv.itens[0];
  assert.equal(i1.valorInicial, 199); assert.equal(i1.pisoSimulacao, si.pisoUnit); assert.equal(i1.margemMinPct, 35); assert.equal(i1.sobraPiso.pct, 35);
  const imp = sim.politica.comercial.impostosServicoPct;
  assert.equal(i1.pisoCusto, Math.ceil(si.custoUnitTotal / (1 - imp / 100) * 100 - 1e-7) / 100, 'custo + impostos = preço de sobra zero');
  // motivo curto, intervalo sem fonte, sessão sem fonte: nada gravado
  assert.match(a.d('abrir', { motivo: 'curto' }).message, /motivo da abertura/);
  assert.match(a.d('abrir', { motivo: 'Motivo suficiente aqui', intervaloValor: '1,00' }).message, /de onde veio o intervalo/);
  assert.match(a.d('abrir', { motivo: 'Motivo suficiente aqui', sessaoData: '2026-11-20', sessaoHora: '09:00' }).message, /de onde veio a data da sessão/);
  assert.match(a.d('abrir', { motivo: 'Motivo suficiente aqui', intervaloTipo: 'PERCENTUAL', intervaloValor: '80', intervaloFonte: 'edital item 7' }).message, /menor que 50/);
  assert.equal((a.tabelas.LIC_DISPUTAS || []).length, 0);
  const r = a.abrir({ sessaoData: '2026-11-20', sessaoHora: '09:00', sessaoFonte: 'edital, preâmbulo', portal: 'Compras.gov.br', intervaloValor: '1,00', intervaloFonte: 'edital, item 7.3' });
  assert.match(r.texto, /Disputa aberta com 2 item\(ns\).*Disputa.*não envia lance/);
  assert.equal(a.op().SITUACAO, 'DISPUTA');
  const h = a.hist('DISPUTA_ABERTA');
  assert.equal(h.length, 1); assert.equal(h[0].DE, 'ANALISE'); assert.equal(h[0].PARA, 'DISPUTA'); assert.equal(h[0].FONTE, 'Central de disputas'); assert.equal(h[0].USUARIO_NOME, 'DORA DIRETORA TESTE');
  assert.match(h[0].TEXTO, /modo assistido.*LIC-2026-0001-P01.*item 1 R\$\s199,00 \(piso R\$\s172,66\).*Intervalo mínimo: R\$\s1,00 \(edital, item 7\.3\).*Motivo: Proposta emitida/);
  const t = a.tela().disputa;
  assert.equal(t.situacao, 'ABERTA'); assert.equal(t.modo, 'ASSISTIDO'); assert.equal(t.integra, true); assert.equal(t.cadeia.integra, true);
  assert.equal(t.proposta.numero, 'LIC-2026-0001-P01'); assert.equal(t.simulacao.versao, 1); assert.equal(t.sessaoIso, '2026-11-20T12:00:00.000Z'); assert.equal(t.portal, 'Compras.gov.br');
  assert.equal(t.itens[0].piso, i1.pisoSimulacao); assert.equal(t.itens[0].intervaloTxt, 'R$ 1,00'); assert.match(t.itens[0].pisoOrigem, /simulação versão 1 \(sobra mínima de 35%\)/);
  // não abre duas vezes; a situação no Kanban
  assert.match(a.d('abrir', { motivo: 'Abrir de novo por engano' }).message, /já tem disputa/);
  const kb = a.ctx.Lic_kanban_({ id: 'u_dora', gestao: true }, {});
  assert.deepEqual(J(kb.colunas.find((c) => c.codigo === 'DISPUTA').cartoes.map((c) => c.id)), ['op1']);
  assert.equal(kb.colunas.find((c) => c.codigo === 'DISPUTA').futura, '');
  // proposta emitida alterada fora do SGO+: não abre
  const b = base();
  b.tabelas.LIC_PROPOSTAS[0].TOTAL = 1;
  assert.ok(b.tela().previa.bloqueios.some((x) => /não confere com o hash/.test(x)));
});

test('piso por item: menor só com motivo e registro; abaixo do custo + impostos mostra o prejuízo e só grava com "assumo"; acima da proposta recusado', () => {
  const a = base(); a.abrir();
  const it = a.item('1'), n0 = a.reg().length, h0 = a.hist().length;
  assert.match(a.d('piso', { item: '1', valor: '160,00', motivo: 'curto' }).message, /motivo do piso/);
  assert.match(a.d('piso', { item: '1', valor: '250,00', motivo: 'Subir o piso acima da proposta' }).message, /não pode passar do valor da proposta/);
  const abaixo = LicPisoAbaixo(it);
  const rec = a.d('piso', { item: '1', valor: String(abaixo).replace('.', ','), motivo: 'Quero ganhar este hospital a qualquer custo' });
  assert.equal(rec.ok, false); assert.match(rec.message, /abaixo do custo mais os impostos.*prejuízo de R\$\s[\d.,]+ por unidade.*Assumo o prejuízo.*Nada foi gravado/);
  assert.equal(a.reg().length, n0); assert.equal(a.hist().length, h0, 'recusa não grava nada');
  // menor que o da simulação, acima do custo: motivo basta
  ok(a.d('piso', { item: '1', valor: '160,00', motivo: 'Diretoria aceita sobra menor neste órgão' }));
  let x = a.item('1');
  assert.equal(x.piso, 160); assert.match(x.pisoOrigem, /Autorizado por DORA DIRETORA TESTE.*Diretoria aceita sobra menor/); assert.equal(x.pisoAssumido, false);
  let rg = a.reg().slice(-1)[0];
  assert.equal(rg.TIPO, 'PISO'); assert.equal(rg.VALOR, 160); assert.equal(rg.VALOR_ANTERIOR, it.piso); assert.equal(rg.ASSUMO, 'NAO'); assert.match(rg.TEXTO, /abaixo do piso da simulação/);
  assert.equal(a.hist('DISPUTA_PISO').length, 1);
  // abaixo do custo com "assumo": grava, marca e avisa em vermelho
  ok(a.d('piso', { item: '1', valor: String(abaixo).replace('.', ','), motivo: 'Contrato estratégico: Diretoria assume o prejuízo', assumo: true }));
  x = a.item('1'); rg = a.reg().slice(-1)[0];
  assert.equal(x.piso, abaixo); assert.equal(x.pisoAssumido, true); assert.equal(rg.ASSUMO, 'SIM'); assert.match(rg.TEXTO, /ABAIXO DO CUSTO MAIS OS IMPOSTOS.*assumido pela Diretoria/);
  assert.ok(x.alertas.some((al) => al.tipo === 'PREJUIZO' && /prejuízo/.test(al.texto)));
  // o piso de um item não mexe no outro
  assert.equal(a.item('2').piso, a.item('2').pisoSimulacao);
  assert.match(a.d('piso', { item: '9', valor: '100', motivo: 'Item que não existe aqui' }).message, /não está nesta disputa/);
});
function LicPisoAbaixo(it) { return Math.round((it.pisoCusto - 5) * 100) / 100; }

test('sugestão determinística: melhor lance − intervalo (R$ ou %), nunca abaixo do piso; na frente não sugere; sem concorrente pede o lance; parar sugestões', () => {
  const a = base(); a.abrir({ intervaloValor: '1,00', intervaloFonte: 'edital, item 7.3' });
  assert.equal(a.item('1').sugestao.tipo, 'SEM_CONCORRENTE');
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '190,00', concorrente: 'Fornecedor 3' }));
  let s = a.item('1').sugestao;
  assert.equal(s.tipo, 'LANCE'); assert.equal(s.valor, 189); assert.match(s.texto, /Próximo lance: R\$\s189,00 \(melhor lance R\$\s190,00 − intervalo R\$\s1,00\), sobra de/);
  // a mesma entrada dá a mesma saída (função pura)
  const it = a.ctx.LicD_estado_(a.tabelas.LIC_DISPUTAS[0], a.ctx.LicD_lancesDe_(a.tabelas.LIC_DISPUTAS[0].ID), []).itens['1'];
  assert.deepEqual(J(a.ctx.LicD_sugestao_(it, false)), J(a.ctx.LicD_sugestao_(it, false)));
  // intervalo em %: 0,5% de 190 = 0,95
  ok(a.d('intervalo', { item: '1', tipo: 'PERCENTUAL', valor: '0,5', fonte: 'aviso do pregoeiro no chat', motivo: 'Pregoeiro fixou o intervalo em %' }));
  assert.equal(a.item('1').sugestao.valor, 189.05); assert.equal(a.item('2').intervaloTxt, 'R$ 1,00', 'o do item 2 continua');
  // nosso lance pela sugestão: SUGERIDO = SIM; ficamos na frente: sem sugestão de valor
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '189,05' }));
  assert.equal(a.reg().slice(-1)[0].SUGERIDO, 'SIM'); assert.equal(a.reg().slice(-1)[0].SUGESTAO, 189.05);
  s = a.item('1').sugestao; assert.equal(s.tipo, 'NA_FRENTE'); assert.equal(s.valor, null); assert.equal(a.item('1').posicao, 'NA_FRENTE');
  // concorrente cobre perto do piso: cobrir passaria do piso, sem valor sugerido
  const piso = a.item('1').piso;
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: String(Math.round((piso + 0.5) * 100) / 100).replace('.', ',') }));
  s = a.item('1').sugestao; assert.equal(s.tipo, 'NO_PISO'); assert.equal(s.valor, null); assert.match(s.texto, /abaixo do piso autorizado.*não cobrir/);
  // parar sugestões (botão de interrupção) e voltar
  assert.match(a.d('sugestoes', { parar: true, motivo: 'x' }).message, /motivo/);
  ok(a.d('sugestoes', { parar: true, motivo: 'Diretoria decide sozinha a partir daqui' }));
  assert.equal(a.item('2').sugestao.tipo, 'PARADA'); assert.equal(a.tela().disputa.paradas, true);
  ok(a.d('sugestoes', { parar: false, motivo: 'Voltar a usar a sugestão do sistema' }));
  assert.equal(a.item('2').sugestao.tipo, 'SEM_CONCORRENTE');
  // a sugestão não vem de IA: o código não chama a IA
  assert.doesNotMatch(ler('SGO_Licitacoes_Disputa.js'), /Gemini|chamarGemini|UrlFetchApp|RelA4_gemini_/);
});

test('lance: o nosso abaixo do piso é recusado com o porquê e nada é gravado; lance não menor que o atual recusado; cada lance com hora, quem e origem digitada no registro e no histórico', () => {
  const a = base(); a.abrir();
  const it = a.item('1'), n0 = a.reg().length, h0 = a.hist().length;
  const r = a.d('lance', { item: '1', autor: 'NOS', valor: String(Math.round((it.piso - 0.01) * 100) / 100).replace('.', ',') });
  assert.equal(r.ok, false); assert.match(r.message, /^Não foi possível registrar, lance recusado: R\$\s[\d.,]+ fica abaixo do piso autorizado do item 1 \(R\$\s172,66\).*não dê esse lance no portal.*Nada foi gravado/);
  assert.equal(a.reg().length, n0); assert.equal(a.hist().length, h0);
  assert.match(a.d('lance', { item: '1', autor: 'NOS', valor: '199,00' }).message, /menor que o atual.*valor da proposta/);
  assert.match(a.d('lance', { item: '1', autor: 'NOS', valor: 'abc' }).message, /em reais/);
  assert.match(a.d('lance', { item: '1', valor: '190' }).message, /de quem é o lance/);
  const lr = ok(a.d('lance', { item: '1', autor: 'NOS', valor: '180,00' }));
  assert.match(lr.texto, /Nosso lance de R\$\s180,00 registrado no item 1 \(registro 1, \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\)/);
  const x = a.reg()[0];
  assert.equal(x.SEQ, 1); assert.equal(x.TIPO, 'LANCE'); assert.equal(x.AUTOR, 'NOS'); assert.equal(x.ORIGEM, 'DIGITADO'); assert.equal(x.POR_NOME, 'DORA DIRETORA TESTE'); assert.equal(x.VALOR, 180); assert.equal(x.VALOR_ANTERIOR, 199);
  assert.equal(x.PISO, it.piso); assert.match(x.QUANDO, /^\d{4}-\d{2}-\d{2}T/); assert.equal(x.HASH_ANTERIOR, ''); assert.match(x.HASH, /^[0-9a-f]{64}$/);
  const h = a.hist('DISPUTA_LANCE').pop();
  assert.equal(h.DE, 'R$ 199,00'); assert.equal(h.PARA, 'R$ 180,00'); assert.equal(h.FONTE, 'Central de disputas (valor digitado)'); assert.equal(h.HASH, x.HASH); assert.match(h.TEXTO, /valor digitado por DORA DIRETORA TESTE/);
  assert.equal(a.item('1').nossoAtual, 180); assert.equal(a.item('1').sobra.pct, a.ctx.LicP_sobra_(180, it.custoUnit, 'SERVICO', it.pc).pct, 'a mesma conta da simulação');
  // concorrente maior que o anterior: aviso, grava; desistência: depois dela não grava mais lance
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '178,00' }));
  assert.match(ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '185,00' })).texto, /maior que o melhor anterior/);
  assert.match(a.d('desistir', { item: '1', motivo: 'curto' }).message, /motivo da desistência/);
  ok(a.d('desistir', { item: '1', motivo: 'Concorrente abaixo do nosso custo real' }));
  assert.equal(a.item('1').desistiu, true); assert.equal(a.item('1').sugestao.tipo, 'DESISTIU');
  assert.match(a.d('lance', { item: '1', autor: 'NOS', valor: '175,00' }).message, /desistiu do item 1/);
  assert.equal(a.hist('DISPUTA_DESISTENCIA').length, 1); assert.equal(a.reg().slice(-1)[0].TIPO, 'DESISTENCIA');
});

test('registro imutável: sem ação de alterar ou apagar; cadeia de hash; linha mudada ou apagada fora do SGO+ é detectada e o SGO+ para de gravar', () => {
  const a = base(); a.abrir();
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '195,00' }));
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '194,00' }));
  ok(a.d('lance', { item: '2', autor: 'NOS', valor: '380,00' }));
  const rs = a.reg();
  assert.deepEqual(rs.map((x) => x.SEQ), [1, 2, 3]); assert.equal(rs[1].HASH_ANTERIOR, rs[0].HASH); assert.equal(rs[2].HASH_ANTERIOR, rs[1].HASH);
  assert.equal(a.tabelas.LIC_DISPUTAS[0].ULTIMO_SEQ, 3); assert.equal(a.tabelas.LIC_DISPUTAS[0].ULTIMO_HASH, rs[2].HASH);
  for (const op of ['apagar', 'alterar', 'lanceEditar', 'excluir', 'reabrir']) assert.match(a.d(op, { item: '1' }).message, /desconhecida/);
  assert.equal(a.tela().disputa.cadeia.integra, true);
  // valor mudado na planilha
  const antes = rs[1].VALOR; rs[1].VALOR = 150;
  let t = a.tela().disputa;
  assert.equal(t.cadeia.integra, false); assert.match(t.cadeia.problema, /registro 2 foi alterado/); assert.equal(t.lances.find((x) => x.seq === 2).integra, false);
  const n0 = a.reg().length;
  assert.match(a.d('lance', { item: '2', autor: 'NOS', valor: '370,00' }).message, /mexido fora do SGO\+ \(o registro 2 foi alterado\).*nada foi gravado/);
  assert.equal(a.reg().length, n0);
  rs[1].VALOR = antes; assert.equal(a.tela().disputa.cadeia.integra, true);
  // última linha apagada
  const ult = a.tabelas.LIC_DISPUTA_LANCES.pop();
  t = a.tela().disputa; assert.equal(t.cadeia.integra, false); assert.match(t.cadeia.problema, /registra 3 registro\(s\) e há 2/);
  a.tabelas.LIC_DISPUTA_LANCES.push(ult);
  // dados da abertura (piso da simulação) mudados: a disputa não confere e não grava
  const d = a.tabelas.LIC_DISPUTAS[0]; const bj = d.BASE_JSON; d.BASE_JSON = bj.replace('"pisoSimulacao":172.66', '"pisoSimulacao":1');
  assert.equal(a.tela().disputa.integra, false);
  assert.match(a.d('lance', { item: '1', autor: 'NOS', valor: '100,00' }).message, /não conferem com o hash.*Nada foi gravado/);
  d.BASE_JSON = bj;
});

test('resultado por item (fonte, motivo, piso) e "Concluir o resultado" move o Kanban para Resultado com motivo e histórico; prepara o dado do Contrato; também pelo Kanban', () => {
  const a = base(); a.abrir();
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '185,00' }));
  assert.match(a.d('concluir', { motivo: 'Sessão encerrada hoje à tarde' }).message, /falta o resultado do\(s\) item\(ns\) 1, 2.*Nada foi alterado/);
  assert.match(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '185,00' }).message, /fonte do resultado/);
  assert.match(a.d('resultado', { item: '1', situacao: 'QUALQUER', fonte: 'ata da sessão' }).message, /Escolha a situação/);
  assert.match(a.d('resultado', { item: '1', situacao: 'GANHO', fonte: 'ata da sessão' }).message, /valor final unitário/);
  assert.match(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '100,00', fonte: 'ata da sessão' }).message, /abaixo do piso autorizado.*Nada foi gravado/);
  assert.match(a.d('resultado', { item: '2', situacao: 'DESCLASSIFICADO', fonte: 'ata da sessão' }).message, /motivo da desclassificação/);
  assert.match(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '185', fonte: 'ata da sessão', adjudicacao: '2026-11-25', homologacao: '2026-11-20' }).message, /homologação não pode ser antes/);
  assert.match(a.d('resultado', { item: '2', situacao: 'PERDIDO', fonte: 'ata da sessão', vencedorCnpj: '123' }).message, /14 números/);
  assert.equal((a.tabelas.LIC_RESULTADOS || []).length, 0);
  ok(a.d('resultado', { item: '1', situacao: 'HABILITACAO_PENDENTE', colocacao: '1', valorFinal: '185,00', fonte: 'ata da sessão no Compras.gov.br' }));
  ok(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '185,00', adjudicacao: '2026-11-21', homologacao: '2026-11-24', fonte: 'termo de homologação no PNCP' }));
  ok(a.d('resultado', { item: '2', situacao: 'DESCLASSIFICADO', motivo: 'Atestado de capacidade técnica não aceito pelo pregoeiro', vencedor: 'Empresa Concorrente Teste', vencedorCnpj: '11.222.333/0001-81', fonte: 'ata da sessão' }));
  const rs = a.tabelas.LIC_RESULTADOS;
  assert.deepEqual(rs.map((x) => [x.ITEM, x.VERSAO, x.SITUACAO]), [['1', 1, 'HABILITACAO_PENDENTE'], ['1', 2, 'GANHO'], ['2', 1, 'DESCLASSIFICADO']], 'versão nova, nada alterado');
  assert.equal(rs[1].VALOR_TOTAL, 18500); assert.equal(rs[1].VENCEDOR, 'Metrolabs (nós)'); assert.equal(rs[2].VENCEDOR_CNPJ, '11222333000181');
  const hr = a.hist('DISPUTA_RESULTADO_ITEM');
  assert.equal(hr.length, 3); assert.equal(hr[1].DE, 'Habilitação pendente (versão 1)'); assert.match(hr[1].TEXTO, /Ganho, 1º lugar, valor final R\$\s185,00 \(total R\$\s18\.500,00\).*Homologação em 24\/11\/2026.*Fonte: termo de homologação no PNCP/);
  assert.equal(a.item('1').resultado.situacao, 'GANHO'); assert.equal(a.tela().disputa.podeConcluir, true);
  // Kanban: Disputa > Resultado existe; as outras saídas dizem o porquê e levam à aba Disputa
  const g = a.ctx.Lic_kanbanRegras_();
  assert.equal(g['DISPUTA>RESULTADO'].acao, 'resultado'); assert.match(g['DISPUTA>RADAR'].porque, /aba Disputa/); assert.equal(g['DISPUTA>RADAR'].aba, 'disputa');
  assert.match(g['ANALISE>DISPUTA'].porque, /A disputa abre na ficha, aba Disputa/); assert.equal(g['ANALISE>DISPUTA'].aba, 'disputa');
  assert.match(g['ANALISE>RESULTADO'].porque, /Só uma licitação em Disputa vai para Resultado/);
  assert.match(a.ctx.Licitacoes_api('s_dora', 'kanbanMover', { id: 'op1', para: 'RESULTADO', situacao: 'DISPUTA', motivo: 'curto' }).message, /pelo menos 10 letras/);
  const c = ok(a.d('concluir', { motivo: 'Ata da sessão publicada e homologação' }));
  assert.match(c.texto, /Resultado concluído \(1 ganho, 1 desclassificado\).*Resultado.*pronto para a etapa de Contrato/);
  assert.equal(a.op().SITUACAO, 'RESULTADO');
  const h = a.hist('RESULTADO_REGISTRADO');
  assert.equal(h.length, 1); assert.equal(h[0].DE, 'DISPUTA'); assert.equal(h[0].PARA, 'RESULTADO'); assert.equal(h[0].FONTE, 'Central de disputas'); assert.match(h[0].TEXTO, /total R\$\s18\.500,00.*Motivo: Ata da sessão/);
  const ct = JSON.parse(a.tabelas.LIC_DISPUTAS[0].CONTRATO_JSON);
  assert.equal(ct.pronto, true); assert.equal(ct.total, 18500); assert.deepEqual(ct.itens.map((i) => [i.item, i.valorFinal, i.homologacao]), [['1', 185, '2026-11-24']]); assert.equal(ct.orgao, 'HOSPITAL MUNICIPAL TESTE');
  assert.equal(a.tabelas.LIC_DISPUTAS[0].SITUACAO, 'RESULTADO');
  // depois do resultado: sem lances nem decisões da sessão; o resultado ainda pode ser atualizado
  assert.match(a.d('lance', { item: '2', autor: 'NOS', valor: '300' }).message, /Resultado registrado.*não recebe mais lances/);
  ok(a.d('resultado', { item: '2', situacao: 'PERDIDO', vencedor: 'Empresa Concorrente Teste', fonte: 'decisão do recurso no portal' }));
  assert.equal(a.op().SITUACAO, 'RESULTADO', 'atualizar o resultado não mexe no Kanban');
  assert.equal(a.ctx.Lic_kanban_({ gestao: true }, {}).colunas.find((k) => k.codigo === 'RESULTADO').cartoes[0].id, 'op1');
  // pelo Kanban: a mesma regra, fonte "Kanban"
  const b = base(); b.abrir();
  ok(b.d('resultado', { item: '1', situacao: 'PERDIDO', fonte: 'ata da sessão' })); ok(b.d('resultado', { item: '2', situacao: 'FRACASSADO', fonte: 'ata da sessão' }));
  const km = ok(b.ctx.Licitacoes_api('s_dora', 'kanbanMover', { id: 'op1', para: 'RESULTADO', situacao: 'DISPUTA', motivo: 'Sessão encerrada sem vitória' }));
  assert.equal(km.acao, 'resultado'); assert.match(km.texto, /foi de Disputa para Resultado/);
  assert.equal(b.op().SITUACAO, 'RESULTADO'); assert.equal(b.hist('RESULTADO_REGISTRADO')[0].FONTE, 'Kanban');
  assert.equal(JSON.parse(b.tabelas.LIC_DISPUTAS[0].CONTRATO_JSON).itens.length, 0);
});

test('recurso e contrarrazões: prazos na agenda como PENDENTE de confirmação (sem alerta), não somem no recálculo da agenda e são confirmados pela tela de prazos', () => {
  const a = base(); a.abrir();
  assert.match(a.d('resultado', { item: '1', situacao: 'RECURSO', fonte: 'ata da sessão' }).message, /Diga quem recorre/);
  const r = ok(a.d('resultado', { item: '1', situacao: 'RECURSO', recursoParte: 'AMBOS', ata: '2026-10-20', colocacao: '2', fonte: 'ata da sessão no Compras.gov.br' }));
  assert.match(r.texto, /Prazos na agenda, pendentes de confirmação: Razões de recurso .*23\/10\/2026.*Contrarrazões de recurso .*28\/10\/2026.*Confirme as datas na aba Prazos/);
  const ev = (t) => a.tabelas.LIC_EVENTOS.filter((e) => e.OPORTUNIDADE_ID === 'op1' && e.TIPO === t && e.SITUACAO === 'ATIVO');
  const rz = ev('PRAZO_RECURSO'), cr = ev('PRAZO_CONTRARRAZOES');
  assert.equal(rz.length, 1); assert.equal(cr.length, 1);
  assert.equal(rz[0].NATUREZA, 'PREVISTO'); assert.equal(cr[0].NATUREZA, 'PREVISTO');
  assert.equal(rz[0].QUANDO_ISO, '2026-10-24T02:59:00.000Z'); assert.equal(cr[0].QUANDO_ISO, '2026-10-29T02:59:00.000Z');
  assert.match(rz[0].REGRA, /Lei 14\.133\/2021, art\. 165: razões de recurso em 3 dias úteis/); assert.match(cr[0].REGRA, /contrarrazões no mesmo prazo do recurso.*estimativa/);
  assert.match(rz[0].OBS, /Pendente de confirmação: sem alerta/);
  assert.equal((a.tabelas.LIC_ALERTAS || []).filter((x) => x.EVENTO_ID === rz[0].ID || x.EVENTO_ID === cr[0].ID).length, 0, 'pendente de confirmação não gera alerta');
  assert.equal(a.hist('AGENDA_RECURSO').length, 2);
  // recálculo da agenda (a situação mudou para Disputa, a fonte foi retificada): os prazos de pessoa ficam
  a.op().VERSAO_FONTE = 2; a.op().VERSAO_HASH = 'h2';
  a.ctx.Lic_agendaAtualizar_({ ids: ['op1'] });
  assert.equal(ev('PRAZO_RECURSO').length, 1); assert.equal(ev('PRAZO_CONTRARRAZOES').length, 1);
  // mesmo resultado de novo não duplica o prazo
  ok(a.d('resultado', { item: '2', situacao: 'RECURSO', recursoParte: 'AMBOS', ata: '2026-10-20', fonte: 'ata da sessão no Compras.gov.br' }));
  assert.equal(a.tabelas.LIC_EVENTOS.filter((e) => e.OPORTUNIDADE_ID === 'op1' && e.TIPO === 'PRAZO_CONTRARRAZOES').length, 1);
  // confirmar a data pela tela de prazos: vira CONFIRMADO (versão nova)
  ok(a.ctx.Licitacoes_api('s_dora', 'eventoConfirmar', { eventoId: cr[0].ID, data: '2026-10-28', hora: '23:59', fuso: 'America/Sao_Paulo', onde: 'portal Compras.gov.br, aviso de recurso' }));
  assert.equal(ev('PRAZO_CONTRARRAZOES')[0].NATUREZA, 'CONFIRMADO');
  assert.equal(a.ctx.LIC_EVENTO_TIPOS.PRAZO_CONTRARRAZOES.nome, 'Contrarrazões de recurso'); assert.ok(a.ctx.Lic_alertasCfg_().antecedencias.PRAZO_CONTRARRAZOES.length > 0);
  // sem a data da ata: o prazo fica sem data, a informar
  const b = base(); b.abrir();
  ok(b.d('resultado', { item: '1', situacao: 'RECURSO', recursoParte: 'NOS', fonte: 'intenção de recurso na sessão' }));
  const e2 = b.tabelas.LIC_EVENTOS.filter((e) => e.TIPO === 'PRAZO_RECURSO');
  assert.equal(e2.length, 1); assert.equal(e2[0].QUANDO_ISO, ''); assert.equal(e2[0].NATUREZA, 'PREVISTO'); assert.match(e2[0].REGRA, /Sem a data da ata/);
  assert.equal(b.tabelas.LIC_EVENTOS.filter((e) => e.TIPO === 'PRAZO_CONTRARRAZOES').length, 0);
});

test('relatório A4 da disputa: lances, decisões e resultado com a fonte; versão imutável com SHA-256; escape do que foi digitado', () => {
  const a = base(); a.abrir();
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '190,00', concorrente: '<script>alert(1)</script>' }));
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '189,99' }));
  ok(a.d('piso', { item: '2', valor: '300,00', motivo: 'Subir o piso do espeto por segurança' }));
  ok(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '189,99', homologacao: '2026-11-24', fonte: 'termo de homologação' }));
  const r = ok(a.d('relatorio'));
  assert.equal(r.relatorio.tipo, 'DISPUTA'); assert.equal(r.relatorio.tipoNome, 'Relatório da disputa'); assert.match(r.relatorio.numero, /^REL-DISP-LIC-2026-0001-V01$/);
  assert.equal(r.relatorio.sha256, crypto.createHash('sha256').update(r.html, 'utf8').digest('hex'));
  for (const s of ['Identificação', 'Itens, valores e piso', 'Decisões da Diretoria', 'Histórico de lances', 'Resultado']) assert.match(r.html, new RegExp('<h2>\\d+\\. ' + s + '</h2>'), s);
  assert.ok((r.html.match(/<b>Fonte:<\/b>/g) || []).length >= 5);
  assert.match(r.html, /não envia lance nem acessa o portal/); assert.match(r.html, /Subir o piso do espeto por segurança/); assert.match(r.html, /Digitado \(= sugestão\)/); assert.match(r.html, /Cadeia do registro conferida: 3 registro\(s\)/);
  assert.match(r.html, /termo de homologação · versão 1/); assert.match(r.html, /24\/11\/2026/);
  assert.doesNotMatch(r.html, /<script>alert/); assert.match(r.html, /&lt;script&gt;alert/);
  const lin = a.tabelas.LIC_RELATORIOS[0];
  assert.equal(lin.TIPO, 'DISPUTA'); assert.equal(lin.OPORTUNIDADE_ID, 'op1'); assert.equal(a.arquivos[lin.HTML_ARQUIVO_ID].bytes.toString('utf8'), r.html);
  const v = ok(a.rel('s_dora', 'ver', { relatorioId: lin.ID })); assert.equal(v.integra, true); assert.equal(v.html, r.html);
  const r2 = ok(a.d('relatorio')); assert.match(r2.relatorio.numero, /-V02$/); assert.equal(a.tabelas.LIC_RELATORIOS[0].HTML_SHA256, lin.HTML_SHA256, 'a versão 1 não muda');
  assert.ok(a.hist('RELATORIO_GERADO').some((h) => /Relatório da disputa gerado em A4/.test(h.TEXTO)));
  assert.equal(ok(a.rel('s_dora', 'tela')).relatorios.filter((x) => x.tipo === 'DISPUTA').length, 2);
  assert.match(base().d('relatorio').message, /ainda não tem disputa/);
});

test('permissão: só Diretoria e Administrador; os outros perfis são recusados em toda ação e nada é gravado', () => {
  const a = base(); a.abrir();
  const antes = JSON.stringify([a.tabelas.LIC_DISPUTAS, a.reg(), a.tabelas.LIC_RESULTADOS || [], a.tabelas.LIC_OPORTUNIDADES]);
  for (const sid of ['s_gaspar', 's_vera', 's_tiago', 's_fabio', 's_rita', 's_mara']) {
    for (const op of ['central', 'tela', 'abrir', 'piso', 'intervalo', 'lance', 'desistir', 'sugestoes', 'resultado', 'concluir', 'relatorio']) {
      const r = a.dsp(sid, op, { id: 'op1', item: '1', autor: 'NOS', valor: '180', motivo: 'tentativa sem permissão', situacao: 'GANHO', fonte: 'ata da sessão', valorFinal: '180' });
      assert.equal(r.ok, false, sid + ' ' + op); assert.equal(r.semAcesso, true, sid + ' ' + op);
    }
  }
  assert.equal(JSON.stringify([a.tabelas.LIC_DISPUTAS, a.reg(), a.tabelas.LIC_RESULTADOS || [], a.tabelas.LIC_OPORTUNIDADES]), antes);
  ok(a.dsp('s_admin', 'central')); ok(a.dsp('s_admin', 'tela', { id: 'op1' }));
  // descartada: a prévia diz o que fazer
  a.tabelas.LIC_OPORTUNIDADES[1].SITUACAO = 'DESCARTADA';
  assert.ok(ok(a.dsp('s_dora', 'tela', { id: 'op2' })).disputa.previa.bloqueios.some((b) => /descartada: reabra antes/.test(b)));
});

// ---------------------------------------------------------------- telas
function telaCliente() {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('licCorpo'); el('licDisputa');
  const chamadas = [];
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => false, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push(acao + ':' + (d && d.op)); } }; } }; } } } } });
  const html = {};
  for (const f of ['JS_Licitacoes.html', 'JS_Licitacoes_Proposta.html', 'JS_Licitacoes_Disputa.html']) {
    html[f] = ler(f);
    vm.runInContext(html[f].slice(html[f].indexOf('<script>') + 8, html[f].lastIndexOf('</script>')), ctx);
  }
  return { ctx, els, chamadas, html };
}

test('telas: prévia (bloqueios com o caminho, itens, sessão e intervalo), painel por item (sugestão, piso, sobra, lances, desistir, resultado), registro, Central de disputas, ficha e celular de 390 px', () => {
  const t = telaCliente();
  const s = base({ emitir: false });
  const hs = t.ctx.LicDp_htmlAbaDados_(J(s.tela()));
  assert.match(hs, /Sem proposta emitida/); assert.match(hs, /data-ldp-ir="proposta"/); assert.match(hs, /disabled aria-disabled="true">Abrir a disputa/);
  const a = base();
  a.comLeitura('op1', [{ tema: 'OUTRO', temaNome: 'Disputa', trecho: 'O intervalo mínimo de diferença de valores entre os lances será de R$ 1,00 (um real).' }]);
  const pv = J(a.tela());
  assert.equal(pv.previa.intervaloEdital.sugestao.valor, 1); assert.equal(pv.previa.intervaloEdital.sugestao.tipo, 'VALOR');
  const hp = t.ctx.LicDp_htmlAbaDados_(pv);
  assert.match(hp, /data-ldp-abrir/); assert.match(hp, /id="ldpIvValor" inputmode="decimal" value="1"/); assert.match(hp, /Frase do edital sobre o intervalo: «O intervalo mínimo/); assert.match(hp, /Piso \(simulação\)/); assert.match(hp, /Custo \+ impostos/);
  a.abrir({ intervaloValor: '1', intervaloFonte: 'edital, leitura I1' });
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '190,00', concorrente: '<img src=x onerror=alert(1)>' }));
  ok(a.d('desistir', { item: '2', motivo: 'Fora da nossa logística na data' }));
  const d = J(a.tela());
  const h = t.ctx.LicDp_htmlAbaDados_(d);
  assert.doesNotMatch(h, /<img src=x/); assert.match(h, /&lt;img src=x/);
  assert.match(h, /não envia lance nem acessa o portal/); assert.match(h, /Sugestão do SGO\+:<\/b> Próximo lance: R\$\s189,00/); assert.match(h, /data-ldp-usar="1" data-valor="189"/);
  assert.match(h, /data-ldp-reg-nos="1"/); assert.match(h, /data-ldp-reg-con="1"/); assert.match(h, /data-ldp-piso="1"/); assert.match(h, /data-ldp-desistir="1"/); assert.match(h, /data-ldp-resultado="2"/);
  assert.doesNotMatch(h, /data-ldp-reg-nos="2"/, 'item desistido sem campo de lance'); assert.match(h, /desistiu deste item: Fora da nossa logística/);
  assert.match(h, /Distância ao piso/); assert.match(h, /Custo \+ impostos \(sobra zero\)/); assert.match(h, /Parar sugestões/); assert.match(h, /disabled aria-disabled="true">Concluir o resultado/); assert.match(h, /Relatório da disputa \(A4\)/);
  assert.match(h, /Registro de lances e decisões \(2\)/);
  const tds = h.match(/<td[^>]*>/g) || []; assert.ok(tds.length > 6 && tds.every((x) => /data-r="/.test(x)), 'células viram cartão no celular');
  // a sobra da tela é a mesma conta do servidor
  const it = d.disputa.itens[0];
  assert.deepEqual(J(t.ctx.LicDp_sobra_(it, 180)), { sobra: a.ctx.LicP_sobra_(180, it.custoUnit, 'SERVICO', it.pc).sobra, pct: a.ctx.LicP_sobra_(180, it.custoUnit, 'SERVICO', it.pc).pct });
  assert.equal(t.ctx.LicDp_num_('1.234,56'), 1234.56); assert.equal(t.ctx.LicDp_num_('185,4'), 185.4); assert.equal(t.ctx.LicDp_num_('abc'), null);
  // Central de disputas
  const c = J(ok(a.dsp('s_dora', 'central')));
  assert.equal(c.contagens.abertas, 1); assert.equal(c.disputas[0].codigo, 'LIC-2026-0001'); assert.equal(c.disputas[0].lances, 1);
  const hc = t.ctx.LicDp_htmlCentral_(c);
  assert.match(hc, /Disputas abertas/); assert.match(hc, /data-ldp-ficha="op1"/); assert.match(hc, /Sessões: prontas para abrir/);
  // ficha: a aba Disputa existe e chama o servidor só quando aberta
  const ficha = t.ctx.Lic_htmlFicha_({ op: { id: 'op1', codigo: 'LIC-2026-0001', uf: 'GO', selos: [], pendencias: [] }, historico: [] }, 'disputa');
  assert.match(ficha, /aria-selected="true" data-lic-fab="disputa">Disputa<\/button>/); assert.match(ficha, /id="licDisputa"/);
  t.ctx.LicDp_ligarAba_({}, {}, 'op1'); assert.deepEqual(t.chamadas, ['disputa:tela']);
  // celular de 390 px: nada de largura fixa maior que a tela; toque de 44 px; sem atualização automática; CRLF
  const css = t.html['JS_Licitacoes_Disputa.html'];
  for (const m of css.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  for (const m of css.matchAll(/minmax\((\d+)px/g)) assert.ok(Number(m[1]) <= 300, 'minmax ' + m[0]);
  assert.match(css, /\.ldp-lance input \{[^}]*min-height: 44px/); assert.match(css, /\.ldp-det summary \{[^}]*min-height: 44px/);
  assert.doesNotMatch(css, /setInterval/); assert.match(css, /\r\n/, 'em CRLF');
  // Kanban: a explicação de "Concluir o resultado" e o atalho para a aba Disputa
  assert.ok(t.ctx.LIC_KB_EXPLICA.resultado[0] === 'Concluir o resultado');
  assert.match(t.html['JS_Licitacoes.html'], /Lic_irFicha_\(c\.id, g\.aba \|\| "resumo"\)/);
});

test('integração na casca: menu, rota, inclusão do arquivo novo, ação do servidor, Kanban sem "etapa futura" em Disputa e Resultado, ajuda das telas, manual e base do assistente', () => {
  const idx = ler('Index.html');
  assert.match(idx, /data-mod="licitacoes_disputas"[^>]*onclick="abrir\('licitacoes_disputas'\)"[^>]*>.*Central de disputas<\/button>/);
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Disputa'\); \?>/);
  const js = ler('JS_Licitacoes.html');
  assert.match(js, /\["licitacoes_disputas", "Disputas"\]/); assert.match(js, /licitacoes_disputas: "Central de disputas"/);
  assert.match(js, /LIC\.mod === "licitacoes_disputas"\) \{ if \(typeof LicDp_renderCentral_ === "function"\)/); assert.match(js, /\["disputa", "Disputa"\]/); assert.match(js, /LicDp_ligarAba_\(c, d, id\)/);
  assert.match(ler('SGO_Licitacoes.js'), /disputa: function \(eu, d\) \{ return LicD_acao_\(eu, d\); \}/);
  const pn = ler('SGO_Licitacoes_Painel.js');
  assert.doesNotMatch(pn, /codigo: 'DISPUTA', nome: 'Disputa', futura/); assert.doesNotMatch(pn, /codigo: 'RESULTADO', nome: 'Resultado', futura/);
  const a = ambienteProposta();
  for (const f of ['SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_Ajuda_LicitacoesDisputas.js']) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), a.ctx);
  const t = a.ctx.SGO_ajudaTelas_LicitacoesDisputas_().licitacoes_disputas;
  assert.ok(t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length);
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_disputas); assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_disputas);
  assert.ok(a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades.passos.some((p) => p.titulo === 'Disputa (modo assistido)'));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /## Disputas \(Central de disputas e aba Disputa da ficha\)/); assert.match(manual, /LIC_DISPUTA_LANCES/); assert.match(manual, /nunca envia lance/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Disputas \(Central de disputas e aba Disputa da ficha\)/, 'base do assistente regerada');
  const textos = ['SGO_Licitacoes_Disputa.js', 'JS_Licitacoes_Disputa.html', 'SGO_Ajuda_LicitacoesDisputas.js'].map(ler).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sem emoji');
  for (const f of ['SGO_Licitacoes_Disputa.js', 'JS_Licitacoes_Disputa.html', 'SGO_Ajuda_LicitacoesDisputas.js']) assert.match(ler(f), /\r\n/, f + ' em CRLF');
});

// ---------------------------------------------------------------- revisão independente de bddf933 (um teste para cada ataque)
test('revisão ALTA 1a: a gravação da linha deu certo e a da disputa falhou: a cadeia confere e retoma sozinha na próxima gravação, com histórico', () => {
  const a = base(); a.abrir();
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '195,00' }));
  const orig = a.ctx.SGO_DATA.update; let falhar = true;
  a.ctx.SGO_DATA.update = function (aba, id, mud) { if (falhar && aba === 'LIC_DISPUTAS' && mud.ULTIMO_SEQ !== undefined) { falhar = false; throw new Error('serviço de dados fora do ar'); } return orig.apply(this, arguments); };
  assert.equal(a.d('lance', { item: '1', autor: 'NOS', valor: '194,00' }).ok, false, 'a segunda escrita falhou');
  a.ctx.SGO_DATA.update = orig;
  assert.equal(a.reg().length, 2); assert.equal(a.tabelas.LIC_DISPUTAS[0].ULTIMO_SEQ, 1, 'a disputa ficou no registro 1');
  let t = a.tela().disputa;
  assert.equal(t.integra, true); assert.equal(t.cadeia.integra, true); assert.deepEqual(J(t.cadeia.ajustar), { de: 1, seq: 2, hash: a.reg()[1].HASH });
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '193,00' }));
  assert.deepEqual(a.reg().map((x) => x.SEQ), [1, 2, 3]); assert.equal(a.reg()[2].HASH_ANTERIOR, a.reg()[1].HASH);
  assert.equal(a.tabelas.LIC_DISPUTAS[0].ULTIMO_SEQ, 3);
  t = a.tela().disputa; assert.equal(t.cadeia.integra, true); assert.equal(t.cadeia.ajustar, null); assert.equal(a.item('1').nossoAtual, 194, 'o lance da linha que ficou vale');
  const h = a.hist('DISPUTA_REGISTRO_RETOMADO'); assert.equal(h.length, 1); assert.equal(h[0].DE, 'registro 1'); assert.equal(h[0].PARA, 'registro 2'); assert.match(h[0].TEXTO, /falha no meio da gravação/);
});

test('revisão ALTA 1b: quebra de verdade: mensagem diz o que fazer; só o Administrador reconhece, com motivo, numa âncora; a cadeia recomeça dela e o relatório mostra', () => {
  const a = base(); a.abrir();
  ok(a.d('lance', { item: '1', autor: 'CONCORRENTE', valor: '195,00' })); ok(a.d('lance', { item: '1', autor: 'NOS', valor: '194,00' }));
  assert.match(a.dsp('s_admin', 'reconhecerQuebra', { id: 'op1', motivo: 'Conferi a planilha e não há nada errado' }).message, /Não há quebra/);
  a.reg()[0].VALOR = 150;
  const r = a.d('lance', { item: '1', autor: 'NOS', valor: '193,00' });
  assert.match(r.message, /mexido fora do SGO\+.*Peça ao Administrador para conferir a planilha e tocar em "Reconhecer a quebra"/);
  assert.equal(a.tela().disputa.podeReconhecer, true);
  const n0 = a.reg().length;
  assert.match(a.d('reconhecerQuebra', { motivo: 'A Diretoria quer seguir com a sessão agora' }).message, /só o Administrador/);
  assert.match(a.dsp('s_admin', 'reconhecerQuebra', { id: 'op1', motivo: 'curto demais' }).message, /pelo menos 20 letras/);
  assert.equal(a.reg().length, n0);
  const q = ok(a.dsp('s_admin', 'reconhecerQuebra', { id: 'op1', motivo: 'Conferido: o valor do registro 1 foi digitado na planilha por engano' }));
  assert.match(q.texto, /âncora 3/);
  const anc = a.reg().slice(-1)[0];
  assert.equal(anc.TIPO, 'ANCORA'); assert.equal(anc.SEQ, 3); assert.equal(anc.HASH_ANTERIOR, a.reg()[1].HASH); assert.match(anc.TEXTO, /o registro 1 foi alterado/); assert.equal(anc.POR_NOME, 'Administrador');
  const t = a.tela().disputa;
  assert.equal(t.cadeia.integra, true); assert.equal(t.cadeia.ancora.seq, 3); assert.match(t.cadeia.ancora.motivo, /digitado na planilha por engano/);
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '193,00' }));
  assert.equal(a.reg().slice(-1)[0].SEQ, 4); assert.equal(a.reg().slice(-1)[0].HASH_ANTERIOR, anc.HASH);
  assert.equal(a.hist('DISPUTA_QUEBRA_RECONHECIDA').length, 1);
  const rel = ok(a.d('relatorio')).html;
  assert.match(rel, /Quebra do registro reconhecida pelo Administrador Administrador/); assert.match(rel, /âncora 3/);
  // abertura alterada: a âncora não vale para ela
  const b = base(); b.abrir();
  const d = b.tabelas.LIC_DISPUTAS[0]; d.BASE_JSON = d.BASE_JSON.replace('"pisoSimulacao":177.17', '"pisoSimulacao":1').replace('"pisoSimulacao":172.66', '"pisoSimulacao":1');
  assert.match(b.dsp('s_admin', 'reconhecerQuebra', { id: 'op1', motivo: 'Tentar limpar a abertura alterada' }).message, /dados da abertura da disputa foram alterados/);
});

test('revisão ALTA 1c: com o registro de lances quebrado, o resultado e a conclusão continuam (com o aviso no histórico e no relatório)', () => {
  const a = base(); a.abrir();
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '190,00' }));
  a.reg()[0].POR_NOME = 'OUTRA PESSOA';
  assert.equal(a.d('piso', { item: '1', valor: '180,00', motivo: 'Mudar o piso com o registro quebrado' }).ok, false);
  const r = ok(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '190,00', fonte: 'ata da sessão' }));
  assert.match(r.texto, /Registro de lances com quebra \(o registro 1 foi alterado\): gravado mesmo assim/);
  ok(a.d('resultado', { item: '2', situacao: 'PERDIDO', fonte: 'ata da sessão' }));
  const c = ok(a.d('concluir', { motivo: 'Sessão encerrada; a quebra fica no relatório' }));
  assert.equal(a.op().SITUACAO, 'RESULTADO'); assert.match(a.hist('RESULTADO_REGISTRADO')[0].TEXTO, /Registro de lances com quebra/); assert.ok(c.texto);
  assert.match(ok(a.d('relatorio')).html, /Registro de lances alterado fora do SGO\+: o registro 1 foi alterado/);
});

test('revisão ALTA 2: depois de concluir, o resultado novo (ganho virou perdido no recurso) refaz o dado do Contrato, com histórico', () => {
  const a = base(); a.abrir();
  ok(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '199,00', homologacao: '2026-11-24', fonte: 'ata da sessão' }));
  ok(a.d('resultado', { item: '2', situacao: 'PERDIDO', fonte: 'ata da sessão' }));
  ok(a.d('concluir', { motivo: 'Todos os itens com resultado' }));
  assert.equal(JSON.parse(a.tabelas.LIC_DISPUTAS[0].CONTRATO_JSON).itens.length, 1);
  const r = ok(a.d('resultado', { item: '1', situacao: 'PERDIDO', vencedor: 'Empresa Concorrente Teste', fonte: 'recurso provido, decisão no portal' }));
  assert.match(r.texto, /O dado do Contrato foi refeito: Nenhum item ganho/);
  const ct = JSON.parse(a.tabelas.LIC_DISPUTAS[0].CONTRATO_JSON);
  assert.equal(ct.itens.length, 0); assert.equal(ct.total, 0); assert.equal(ct.pronto, false);
  assert.equal(a.tela().disputa.contrato.itens.length, 0);
  const h = a.hist('DISPUTA_CONTRATO_ATUALIZADO'); assert.equal(h.length, 1); assert.match(h[0].DE, /1 item\(ns\) ganho\(s\), total R\$\s19\.900,00, pronto/); assert.match(h[0].PARA, /0 item\(ns\) ganho\(s\), total R\$\s0,00/);
  // o mesmo resultado de novo não gera histórico novo
  ok(a.d('resultado', { item: '1', situacao: 'PERDIDO', vencedor: 'Empresa Concorrente Teste', fonte: 'recurso provido, decisão no portal' }));
  assert.equal(a.hist('DISPUTA_CONTRATO_ATUALIZADO').length, 1);
  // disputa ainda aberta: o dado só nasce ao concluir
  const b = base(); b.abrir(); ok(b.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '199,00', fonte: 'ata da sessão' }));
  assert.equal(b.tabelas.LIC_DISPUTAS[0].CONTRATO_JSON || '', ''); assert.equal(b.hist('DISPUTA_CONTRATO_ATUALIZADO').length, 0);
});

test('revisão MÉDIA-ALTA 3: ganho acima do nosso último lance só com motivo; item desistido não é ganho; "185.405" recusado (use vírgula)', () => {
  const a = base(); a.abrir();
  const r = a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '250,00', fonte: 'ata da sessão' });
  assert.equal(r.ok, false); assert.match(r.message, /maior que o nosso último lance do item 1 \(R\$\s199,00, o valor da proposta\).*escreva o motivo/);
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '190,00' }));
  assert.match(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '195,00', fonte: 'ata da sessão' }).message, /maior que o nosso último lance do item 1 \(R\$\s190,00\)/);
  const ok2 = ok(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '195,00', motivo: 'Ata registra 195,00 por erro de digitação do pregoeiro', fonte: 'ata da sessão' }));
  assert.match(ok2.texto, /acima do nosso último lance \(R\$\s190,00\), aceito com o motivo/);
  assert.match(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '185.405', fonte: 'ata da sessão' }).message, /use vírgula para os centavos/);
  assert.match(a.d('lance', { item: '1', autor: 'NOS', valor: '185.40' }).message, /use vírgula para os centavos/);
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '185,40' })); assert.equal(a.item('1').nossoAtual, 185.4);
  ok(a.d('desistir', { item: '2', motivo: 'Fora da nossa logística na data' }));
  assert.match(a.d('resultado', { item: '2', situacao: 'GANHO', valorFinal: '380,00', motivo: 'Tentar marcar ganho no desistido', fonte: 'ata da sessão' }).message, /desistiu do item 2.*não pode ficar como ganho/);
  ok(a.d('resultado', { item: '2', situacao: 'PERDIDO', fonte: 'ata da sessão' }));
});

test('revisão MÉDIA 4: mais de 2 casas decimais recusado ("177,165" não vira 177,17 e não fura o piso); a tela confere igual ao servidor', () => {
  const a = base(); a.abrir();
  const piso = a.item('1').piso, tres = String((piso - 0.005).toFixed(3)).replace('.', ',');
  const r = a.d('lance', { item: '1', autor: 'NOS', valor: tres });
  assert.equal(r.ok, false); assert.match(r.message, /no máximo 2 casas decimais/); assert.equal(a.reg().length, 0);
  assert.match(a.d('piso', { item: '1', valor: '160,005', motivo: 'Piso com três casas decimais' }).message, /no máximo 2 casas/);
  const t = telaCliente();
  for (const v of ['185,40', '1.234,56', '185', '185.40', '185.405', '177,165', '190%', 'R$ 185,40', 'abc', '', '1.234', '12,3', 185.4, 185.405]) {
    assert.deepEqual(J(t.ctx.LicDp_lerReais_(v)), J(a.ctx.LicD_lerReais_(v)), 'mesma leitura: ' + v);
  }
  assert.equal(a.ctx.LicD_lerReais_('1.234,56').valor, 1234.56); assert.equal(a.ctx.LicD_lerReais_('R$ 185,40').valor, 185.4);
});

test('revisão MÉDIA 5: "%" num campo em reais é recusado na disputa; o intervalo em % aceita; o simulador de preços (LicP_n_) não muda', () => {
  const a = base(); a.abrir();
  assert.match(a.d('lance', { item: '1', autor: 'NOS', valor: '190%' }).message, /sem o sinal "%" \(o campo é em reais\)/);
  assert.match(a.d('piso', { item: '1', valor: '160%', motivo: 'Piso em percentual por engano' }).message, /sem o sinal "%"/);
  assert.match(a.d('intervalo', { item: '1', tipo: 'VALOR', valor: '1%', fonte: 'edital, item 7', motivo: 'Intervalo em reais com %' }).message, /sem o sinal "%"/);
  ok(a.d('intervalo', { item: '1', tipo: 'PERCENTUAL', valor: '0,5%', fonte: 'edital, item 7', motivo: 'Intervalo em % com o sinal' }));
  assert.equal(a.item('1').intervalo.valor, 0.5);
  assert.equal(a.ctx.LicP_n_('190%'), 190, 'o simulador continua como era');
});

test('revisão BAIXA 6: recurso que deixa de existir (ganho, ou só um lado recorre) cancela os prazos pendentes que vieram do resultado, com motivo', () => {
  const a = base(); a.abrir();
  ok(a.d('resultado', { item: '1', situacao: 'RECURSO', recursoParte: 'AMBOS', ata: '2026-10-20', fonte: 'ata da sessão' }));
  const ativos = () => a.tabelas.LIC_EVENTOS.filter((e) => /^PRAZO_(RECURSO|CONTRARRAZOES)$/.test(e.TIPO) && e.SITUACAO === 'ATIVO').map((e) => e.TIPO).sort();
  assert.deepEqual(ativos(), ['PRAZO_CONTRARRAZOES', 'PRAZO_RECURSO']);
  const r1 = ok(a.d('resultado', { item: '1', situacao: 'RECURSO', recursoParte: 'NOS', ata: '2026-10-20', fonte: 'só nós recorremos' }));
  assert.deepEqual(ativos(), ['PRAZO_RECURSO']); assert.match(r1.texto, /Prazos pendentes cancelados \(sem recurso\): Contrarrazões de recurso/);
  // outro item ainda em recurso segura o prazo
  ok(a.d('resultado', { item: '2', situacao: 'RECURSO', recursoParte: 'NOS', ata: '2026-10-20', fonte: 'ata da sessão' }));
  ok(a.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '199,00', fonte: 'decisão do recurso' }));
  assert.deepEqual(ativos(), ['PRAZO_RECURSO'], 'o item 2 continua em recurso');
  ok(a.d('resultado', { item: '2', situacao: 'PERDIDO', fonte: 'decisão do recurso' }));
  assert.deepEqual(ativos(), []);
  const canc = a.tabelas.LIC_EVENTOS.filter((e) => e.SITUACAO === 'CANCELADO');
  assert.equal(canc.length, 2); assert.ok(canc.every((e) => /Nenhum item continua em recurso/.test(e.MOTIVO_MUDANCA)));
  assert.equal(a.hist('AGENDA_PRAZO_CANCELADO').length, 2);
  // prazo já confirmado por pessoa não é cancelado pelo resultado
  const b = base(); b.abrir();
  ok(b.d('resultado', { item: '1', situacao: 'RECURSO', recursoParte: 'NOS', ata: '2026-10-20', fonte: 'ata da sessão' }));
  const ev = b.tabelas.LIC_EVENTOS.find((e) => e.TIPO === 'PRAZO_RECURSO' && e.SITUACAO === 'ATIVO');
  ok(b.ctx.Licitacoes_api('s_dora', 'eventoConfirmar', { eventoId: ev.ID, data: '2026-10-23', hora: '23:59', fuso: 'America/Sao_Paulo', onde: 'portal Compras.gov.br, prazo do recurso' }));
  ok(b.d('resultado', { item: '1', situacao: 'GANHO', valorFinal: '199,00', fonte: 'decisão do recurso' }));
  assert.equal(b.tabelas.LIC_EVENTOS.filter((e) => e.TIPO === 'PRAZO_RECURSO' && e.SITUACAO === 'ATIVO' && e.NATUREZA === 'CONFIRMADO').length, 1);
});

test('revisão BAIXA 7: o hash da linha cobre sobra, sobra % e quem registrou; o da disputa cobre o último registro (mexer em ULTIMO_* não muda o que vale)', () => {
  for (const campo of ['SOBRA', 'SOBRA_PCT', 'POR_NOME']) {
    const a = base(); a.abrir(); ok(a.d('lance', { item: '1', autor: 'NOS', valor: '190,00' }));
    a.reg()[0][campo] = campo === 'POR_NOME' ? 'OUTRA PESSOA' : 1;
    assert.match(a.tela().disputa.cadeia.problema, /o registro 1 foi alterado/, campo);
  }
  const a = base(); a.abrir(); ok(a.d('lance', { item: '1', autor: 'NOS', valor: '190,00' }));
  const d = a.tabelas.LIC_DISPUTAS[0];
  assert.notEqual(a.ctx.LicD_hashDisputa_(d), a.ctx.LicD_hashDisputa_(d, { seq: 0, hash: '' }));
  assert.equal(d.HASH, a.ctx.LicD_hashDisputa_(d));
  d.ULTIMO_SEQ = 0; d.ULTIMO_HASH = '';   // "apagar" o último registro pela disputa
  const t = a.tela().disputa;
  assert.equal(t.integra, true); assert.equal(t.cadeia.integra, true, 'vale o último registro assinado pelo hash');
  ok(a.d('lance', { item: '1', autor: 'NOS', valor: '189,00' })); assert.equal(a.reg()[1].SEQ, 2); assert.equal(a.reg()[1].HASH_ANTERIOR, a.reg()[0].HASH);
});

test('revisão BAIXA 8 e 9: colunas de texto livre forçadas como texto; ação com nome de propriedade do objeto é desconhecida', () => {
  const a = base();
  for (const c of ['CONCORRENTE', 'MOTIVO', 'TEXTO', 'POR_ID']) assert.ok(a.ctx.LICD_COLUNAS_TEXTO.LIC_DISPUTA_LANCES.includes(c), c);
  for (const op of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
    const r = a.d(op); assert.equal(r.ok, false, op); assert.match(r.message, /ação de disputa desconhecida/, op);
  }
  for (const sid of ['s_gaspar', 's_vera']) assert.equal(a.dsp(sid, 'reconhecerQuebra', { id: 'op1', motivo: 'tentativa sem permissão nenhuma' }).semAcesso, true);
});
