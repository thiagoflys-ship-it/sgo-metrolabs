// SGO+ Licitações — revisão de 501f6aa (03/11/2026): resposta da IA aceita em parte. O script de revisão (parcial.cjs) virou
// este teste, um caso para cada ponto: (1) item ALTA ou MÉDIA que cai recusa a resposta, e com outros pontos caídos o resumo
// ganha o aviso do código na frente; (2) trava que caiu nunca some (fica "não conferida — confirme no edital", a confirmar), e a
// FORA_DO_CATALOGO descartada só libera a recusa se nenhuma outra trava caiu; (3) objeto do ramo não vira "fora do ramo"
// automático; (4) a pendência do que caiu não mostra texto com negação ou termo impeditivo, e o motivo vem da regra, não do trecho.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const ctx = vm.createContext({ console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Uint8Array,
  Utilities: { getUuid: () => '0', computeDigest: (a, t) => Array.from(crypto.createHash('sha256').update(String(t)).digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 } },
  Session: { getScriptTimeZone: () => 'America/Sao_Paulo' }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }, SGO_DATA: { getAll: () => [] }, SGO_CFG: { SHEETS: {} }, ComEsp_fabricantes_: () => [] });
for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js']) vm.runInContext(ler(f), ctx, { filename: f });
const local = (x) => JSON.parse(JSON.stringify(x));

const OBJ = 'Manutenção preventiva e corretiva de autoclaves hospitalares do hospital municipal';
const OBJT = 'Manutenção preventiva e corretiva de autoclaves hospitalares';
const A1 = 'Termo de referência.\n\nA contratada fará a manutenção preventiva e corretiva das autoclaves hospitalares do hospital municipal.\n\nSerá exigido laboratório acreditado RBC para as calibrações dos instrumentos.\n\nO prazo de execução será de 20 dias corridos contados da ordem de serviço.\n';
function montar(objeto, triagem) {
  const OP = { ID: 'op1', CODIGO: 'X', UF: 'GO', MUNICIPIO: 'Goiânia', OBJETO: objeto || OBJ, VALOR_ESTIMADO: 50000, ENCERRAMENTO_PROPOSTAS: '2026-11-30T10:00:00', TRIAGEM: triagem || 'CANDIDATA', TRIAGEM_MOTIVO: 'RBC' };
  const fontes = ctx.Lic_fontesAnalise_(OP, { itens: [] }, [{ ref: 'A1', id: 1, titulo: 'TR', nome: 'tr.pdf', texto: A1 }]);
  ctx.Lic_selecionarTextos_(fontes, 140000);
  const pesos = Object.assign({}, ctx.LIC_NOTA_PADRAO), codigo = ctx.Lic_criteriosCodigo_(OP, pesos, '2026-11-02');
  return { pesos, codigo, cv: ctx.Lic_ctxVerificador_(OP, fontes, pesos, codigo) };
}
function rodar(j, objeto, triagem) {
  const m = montar(objeto, triagem), v = ctx.Lic_verificarAnalise_(j, m.cv);
  return Object.assign(v, { nf: v.ok ? ctx.Lic_notaFinal_(v.saida, m.codigo, m.pesos, {}) : null });
}
const base = () => ({ resumo: 'A capacidade técnica é alta: a Metrolabs atende todos os itens. O edital não tem trava.', capacidade: { justificativa: 'Todos os itens são do catálogo, grau alto.', itens: [] },
  documentacao: { pontos: 5, justificativa: 'A conferir.', exigencias: [] }, riscos: [], travas: [],
  afirmacoes: [{ tipo: 'FATO', criterio: 'capacidade', texto: 'O objeto é manutenção de autoclaves.', fonte: { ref: 'CAMPO:objeto', trecho: OBJT } },
    { tipo: 'PENDENCIA', criterio: 'documentacao', texto: 'Conferir a habilitação.' }, { tipo: 'PENDENCIA', criterio: 'prazo', texto: 'Conferir o prazo.' }] });
const falso = (i) => ({ descricao: 'Calibração de termômetros ' + i, grau: 'ALTA', servico: 'CAL-001', fonte: { ref: 'A1', trecho: 'calibração de termômetros digitais do laboratório central ' + i } });
const real = (g) => ({ descricao: 'Autoclaves', grau: g, servico: 'MP_AUTOCLAVE_GRANDE', fonte: { ref: 'CAMPO:objeto', trecho: OBJT } });
const rbcReticencias = { codigo: 'RBC_OBRIGATORIA', texto: 'Exige RBC.', fonte: { ref: 'A1', trecho: 'Será exigido laboratório acreditado RBC (...) dos instrumentos' }, fonteRegra: { ref: 'REGRA:rbc', trecho: 'A Metrolabs NÃO é acreditada RBC' } };
const foraFalsa = { codigo: 'FORA_DO_CATALOGO', texto: 'Fora.', fonte: { ref: 'A1', trecho: 'O prazo de execução será de 20 dias corridos' } };

test('revisão 501f6aa (1): item de grau ALTA ou MÉDIA que não confere recusa a resposta (o resumo "atende todos os itens" não passa); com outros pontos caídos, o aviso do código vai na frente do resumo', () => {
  const j = base(); j.capacidade.itens = [falso(1), falso(2), falso(3), real('BAIXA')];
  const v = rodar(j);
  assert.equal(v.ok, false);
  assert.match(v.problemas[0], /^capacidade: 3 item\(ns\) com grau ALTA ou MEDIA não conferiram com a fonte \(o resumo e a justificativa não podem afirmar capacidade que não foi provada\)/);
  const m = base(); m.capacidade.itens = [{ descricao: 'Autoclaves', grau: 'MEDIA', servico: 'MP_AUTOCLAVE_GRANDE', fonte: { ref: 'A1', trecho: 'manutenção das autoclaves inventada' } }, real('ALTA')];
  assert.match(rodar(m).problemas[0], /^capacidade: 1 item\(ns\) com grau ALTA ou MEDIA não conferiram/);
  // item BAIXA que cai: passa, com o aviso do código (a capacidade provada) antes do texto da IA
  const b = base(); b.capacidade.itens = [real('ALTA'), { descricao: 'Lavadora', grau: 'BAIXA', servico: '', fonte: { ref: 'A1', trecho: 'lavadora ultrassônica de bancada inventada aqui' } }];
  const vb = rodar(b);
  assert.equal(vb.ok, true, vb.problemas.join('; '));
  assert.equal(vb.saida.resumo, 'Aviso do sistema: 1 ponto da resposta da IA não conferiu com as fontes e ficou fora da nota; capacidade provada: 1 item(ns) de grau alto, 0 médio, 0 baixo e 0 não atende, de 2. ' + base().resumo);
  // sem nada caído, o resumo fica como a IA escreveu
  const c = base(); c.capacidade.itens = [real('ALTA')];
  assert.equal(rodar(c).saida.resumo, base().resumo);
});

test('revisão 501f6aa (2): trava que caiu nunca some (fica "não conferida — confirme no edital", classe trava a confirmar); a FORA descartada só libera a recusa se nenhuma outra caiu', () => {
  // o caso da revisão: RBC real cai por reticências e a FORA é descartada pelo item ALTA → antes: nota 63 sem selo
  const j = base(); j.capacidade.itens = [real('ALTA')]; j.travas = [foraFalsa, rbcReticencias];
  const v = rodar(j);
  assert.equal(v.ok, false, 'nenhuma trava conferiu e uma caiu: recusa (a descartada não libera)');
  assert.match(v.problemas.join('\n'), /^travas: nenhuma das 2 trava\(s\) apontadas conferiu/m);
  // só a RBC, caída: recusa também
  const s = base(); s.capacidade.itens = [real('ALTA')]; s.travas = [rbcReticencias];
  assert.match(rodar(s).problemas.join('\n'), /^travas: nenhuma das 1 trava/m);
  // só a FORA descartada: passa (não caiu nenhuma outra)
  const f = base(); f.capacidade.itens = [real('ALTA')]; f.travas = [foraFalsa];
  const vf = rodar(f);
  assert.equal(vf.ok, true, vf.problemas.join('; '));
  assert.deepEqual(local(vf.saida.travas), []);
  // uma trava conferida e outra caída: passa, e a caída fica na análise, a confirmar, com o motivo
  const rbcOk = { codigo: 'RBC_OBRIGATORIA', texto: 'Exige RBC.', fonte: { ref: 'A1', trecho: 'Será exigido laboratório acreditado RBC para as calibrações dos instrumentos' } };
  const ded = { codigo: 'DEDICACAO_EXCLUSIVA', texto: 'Dedicação exclusiva.', fonte: { ref: 'A1', trecho: 'com dedicação exclusiva de mão de obra no hospital' } };
  const d = base(); d.capacidade.itens = [real('ALTA')]; d.travas = [rbcOk, ded];
  const vd = rodar(d);
  assert.equal(vd.ok, true, vd.problemas.join('; '));
  const caida = vd.saida.travas.find((t) => t.codigo === 'DEDICACAO_EXCLUSIVA');
  assert.ok(caida && caida.naoConferida && caida.chave, 'a trava caída continua, com chave para a Diretoria decidir');
  assert.equal(caida.fonte, null);
  assert.match(caida.texto, /^Não conferida — confirme no edital: a IA apontou esta trava, mas o trecho citado não conferiu com a fonte \(o trecho citado não está na fonte\)\.$/);
  assert.equal(vd.nf.classe, 'TRAVA_A_CONFIRMAR');
  assert.ok(vd.nf.nota > 0, 'trava da IA não zera sozinha');
  assert.ok(!vd.saida.afirmacoes.some((a) => a.caiu && /Dedicação exclusiva/.test(a.texto)), 'a trava caída não vira pendência "não conta na nota"');
  // triagem TRAVADA: a trava não conferida não satisfaz a regra (precisa de trava provada ou pendência "trava" da IA)
  const t = base(); t.capacidade.itens = [real('ALTA')]; t.travas = [rbcOk, ded];
  assert.equal(rodar(t, null, 'TRAVADA').ok, true, 'com a RBC provada, passa');
  const t2 = base(); t2.capacidade.itens = [real('ALTA')]; t2.travas = [ded]; t2.afirmacoes.push({ tipo: 'PENDENCIA', criterio: 'x', texto: 'Conferir a.' }, { tipo: 'PENDENCIA', criterio: 'x', texto: 'Conferir b.' });
  assert.match(rodar(t2, null, 'TRAVADA').problemas.join('\n'), /trava: a triagem por regras travou/);
});

test('revisão 501f6aa (3): objeto do ramo ("Manutenção preventiva e corretiva de autoclaves hospitalares") com NAO_ATENDE em tudo é recusado com o que cabe; fora do ramo pelo objeto só com item "não atende" da IA conferido', () => {
  const j = base(); j.capacidade.itens = [real('NAO_ATENDE')];
  const v = rodar(j);
  assert.equal(v.ok, false, 'antes: FORA automática, −30 pontos, candidata a descarte');
  assert.match(v.problemas[0], /^capacidade: o objeto tem serviços do catálogo \([^)]*MP_AUTOCLAVE_GRANDE[^)]*\): "não atende" em tudo não vale para este objeto/);
  const inv = base(); inv.capacidade.itens = [{ descricao: 'Autoclaves', grau: 'NAO_ATENDE', servico: '', fonte: { ref: 'A1', trecho: 'texto inventado que não existe no edital' } }];
  assert.equal(rodar(inv).ok, false);
  // fora do ramo de verdade: item "não atende" conferido → passa com a FORA do código; sem item conferido, recusa (o código não cita o objeto sozinho)
  const ADUANA = 'Contratação de serviços de despacho aduaneiro e desembaraço alfandegário de mercadorias importadas';
  const a = base(); a.afirmacoes[0].fonte.trecho = 'Contratação de serviços de despacho aduaneiro';
  a.capacidade.itens = [{ descricao: 'Despacho aduaneiro', grau: 'NAO_ATENDE', servico: '', fonte: { ref: 'CAMPO:objeto', trecho: 'serviços de despacho aduaneiro e desembaraço alfandegário' } }];
  const va = rodar(a, ADUANA);
  assert.equal(va.ok, true, va.problemas.join('; '));
  assert.deepEqual(local(va.saida.travas.map((t) => [t.codigo, t.origem])), [['FORA_DO_CATALOGO', 'SISTEMA']]);
  // hora técnica genérica ("instalação", "laudo") e "monitoramento" (não é monitor) não fazem o objeto ser do ramo (prova real: 8 casos)
  const SOM = 'Contratação de empresa para o fornecimento, instalação e entrega em pleno funcionamento de sistema de sonorização e monitoramento';
  const s = base(); s.afirmacoes[0].fonte.trecho = 'fornecimento, instalação e entrega em pleno funcionamento';
  s.capacidade.itens = [{ descricao: 'Sonorização', grau: 'NAO_ATENDE', servico: '', fonte: { ref: 'CAMPO:objeto', trecho: 'sistema de sonorização e monitoramento' } }];
  const vs = rodar(s, SOM);
  assert.equal(vs.ok, true, vs.problemas.join('; '));
  assert.equal(vs.saida.travas[0].codigo, 'FORA_DO_CATALOGO');
  const a2 = JSON.parse(JSON.stringify(a)); a2.capacidade.itens[0].fonte.trecho = 'despacho aduaneiro (...) mercadorias importadas';
  const va2 = rodar(a2, ADUANA);
  assert.equal(va2.ok, false);
  assert.match(va2.problemas.join('\n'), /^capacidade: nenhum item conferiu com trecho da fonte/m);
});

test('revisão 501f6aa (4): a pendência do que caiu não mostra texto com negação ou termo impeditivo; o motivo vem da mensagem da regra, nunca do trecho citado', () => {
  const j = base(); j.capacidade.itens = [real('ALTA'), { descricao: 'O edital não exige RBC', grau: 'BAIXA', servico: '', fonte: { ref: 'A1', trecho: 'inventado aqui agora sim' } }];
  j.afirmacoes.push({ tipo: 'FATO', criterio: 'documentacao', texto: 'O edital dispensa a acreditação RBC dos laboratórios.', fonte: { ref: 'A1', trecho: 'dispensa a acreditação RBC dos laboratórios' } });
  j.afirmacoes.push({ tipo: 'FATO', criterio: 'documentacao', texto: 'Exige atestado de capacidade técnica.', fonte: { ref: 'A1', trecho: 'atestado de capacidade técnica do licitante' } });
  const v = rodar(j);
  assert.equal(v.ok, true, v.problemas.join('; '));
  assert.deepEqual(local(v.saida.afirmacoes.filter((a) => a.caiu).map((a) => a.texto)), [
    'Não conferido (o trecho citado não está na fonte): um item com grau Baixa, que conta zero na capacidade. Não conta na nota; conferir no edital.',
    'Não conferido (o trecho citado não está na fonte): um fato da IA. Não conta na nota; conferir no edital.',
    'Não conferido (o trecho citado não está na fonte): um fato da IA. Não conta na nota; conferir no edital.']);
  // o motivo não casa com o trecho citado: trecho com "acreditação RBC" não vira "texto recusado"
  assert.equal(ctx.Lic_motivoCurto_('afirmação 4: o trecho "dispensa a acreditação RBC dos laboratórios" não está em A1 (copie literalmente do texto da fonte)'), 'o trecho citado não está na fonte');
  assert.equal(ctx.Lic_motivoCurto_('risco 1: o trecho "a IA não decide reticências" não está em A1 (copie literalmente do texto da fonte); o mais perto em A1 é "cita fabricante ou marca"'), 'o trecho citado não está na fonte');
  assert.equal(ctx.Lic_motivoCurto_('afirmação 2: não afirme nem prometa acreditação RBC (a Metrolabs é rastreável, não acreditada)'), 'texto recusado: frase de decisão, promessa de RBC, marca ou formatação');
  assert.equal(ctx.Lic_motivoCurto_('capacidade, item 1: trecho curto demais para conferir ("não está em reticências"); copie pelo menos 3 palavras seguidas da fonte'), 'trecho curto demais para conferir');
  assert.equal(ctx.Lic_motivoCurto_('trava 2: código fora da lista (NAO_ESTA_EM)'), 'código fora da lista');
  // texto curto e neutro continua aparecendo (ajuda a achar no edital)
  assert.equal(ctx.Lic_textoCaidoMostra_('Manutenção das lavadoras', montar().cv), 'Manutenção das lavadoras');
  for (const t of ['O edital não exige RBC', 'Sem exigência de vistoria', 'Exige registro no CREA', 'Pede atestado', 'Acreditação Inmetro', 'Salvo se aceitar rastreabilidade'])
    assert.equal(ctx.Lic_textoCaidoMostra_(t, montar().cv), '', t);
});

// revisão final de 501f6aa (o script ramo.cjs virou este teste): objeto do ramo com palavra genérica não vira fora do ramo
test('revisão 501f6aa (3b): objeto que pede serviço sobre equipamento, esterilização, laboratório ou câmara não vira FORA automática; compra, obra e despacho continuam', () => {
  const doRamo = [
    'Manutenção preventiva e corretiva de autoclaves hospitalares', 'Manutenção preventiva e corretiva de esterilizadores a vapor do hospital',
    'Manutenção preventiva e corretiva de termodesinfectoras da central de material', 'Manutenção preventiva e corretiva de lavadoras ultrassônicas da central de material',
    'Serviço de calibração de balanças antropométricas das unidades de saúde', 'Manutenção preventiva e corretiva de equipamentos médico-hospitalares da rede municipal',
    'Manutenção de equipamentos odontológicos e médico hospitalares com reposição de peças', 'Prestação de serviços de engenharia clínica para o parque de equipamentos médicos',
    'Calibração de termômetros e termo-higrômetros das salas de vacina', 'Qualificação térmica de câmaras frias de vacinas da rede de frio',
    'Serviço de validação do processo de esterilização da central de material esterilizado', 'Manutenção de seladoras e estufas de secagem do CME',
    'Calibração e manutenção de monitores multiparamétricos e desfibriladores', 'Inspeção de segurança de vasos de pressão conforme NR-13',
    'Calibração de manômetros e válvulas de segurança', 'Serviços de manutenção de esfigmomanômetros e balanças do Inmetro',
    'Calibração de instrumentos de medição dos laboratórios municipais', 'Manutenção preventiva e corretiva de equipamentos de esterilização',
    'Monitoramento de temperatura de câmaras de vacina com registradores'];
  const foraDoRamo = [
    'Contratação de serviços de despacho aduaneiro e desembaraço alfandegário de mercadorias importadas',
    'Contratação de empresa para o fornecimento, instalação e entrega em pleno funcionamento de sistema de sonorização e painel de LED',
    'Aquisição de equipamentos e acessórios oftalmológicos, incluindo a instalação, com os devidos laudos de calibração',
    'Contratação de empresa especializada para a prestação contínua de serviços de tratamento de água para terapia renal',
    'Fornecimento de medicamentos e produtos de uso veterinário pelo sistema de registro de preços',
    'Locação de veículos com motorista para a secretaria de saúde', 'Obra de reforma e ampliação da unidade básica de saúde'];
  const resp = (obj) => { const tr = obj.split(' ').slice(0, 8).join(' ');
    return { resumo: 'O objeto não é do catálogo. A nota é baixa.', capacidade: { justificativa: 'Fora do catálogo.', itens: [{ descricao: 'Objeto fora do catálogo', grau: 'NAO_ATENDE', servico: '', fonte: { ref: 'CAMPO:objeto', trecho: tr } }] },
      documentacao: { pontos: 5, justificativa: 'A conferir.', exigencias: [] }, riscos: [], travas: [], afirmacoes: [{ tipo: 'FATO', criterio: 'capacidade', texto: 'Objeto citado.', fonte: { ref: 'CAMPO:objeto', trecho: tr } }, { tipo: 'PENDENCIA', criterio: 'x', texto: 'Conferir.' }] }; };
  for (const o of doRamo) {
    const v = rodar(resp(o), o);
    assert.equal(v.ok, false, 'do ramo, não pode virar fora do ramo: ' + o);
    assert.match(v.problemas[0], /^capacidade: o objeto tem serviços do catálogo \(.+\): "não atende" em tudo não vale para este objeto/, o);
  }
  for (const o of foraDoRamo) {
    const v = rodar(resp(o), o);
    assert.equal(v.ok, true, o + ' → ' + v.problemas.join('; '));
    assert.equal(v.nf.classe, 'TRAVA_A_CONFIRMAR', o);
    assert.deepEqual(local(v.saida.travas.map((t) => t.codigo)), ['FORA_DO_CATALOGO'], o);
  }
});
