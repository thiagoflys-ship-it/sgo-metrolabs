// Relatório do ciclo da lavadora (31/10/2026). Pedido do dono: importar o arquivo .sgolav que a lavadora grava a cada
// ciclo e gerar o relatório A4 de uma folha, salvo, com a fita, gráfico, indicadores, conclusão (IA conferida ou regra) e
// a assinatura do responsável pelo local feita na tela; cliente só vê e gera para os equipamentos dele.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, fixture, montarSgolav, abrirSgolav } = require('./_lavciclo_ambiente.cjs');

const EXEMPLO = 'LOT-20261030-6222.sgolav';
const PNG = 'data:image/png;base64,' + Buffer.from('assinatura de teste em png').toString('base64');
const ler = (amb, conteudo) => amb.ctx.LavCicL_ler_(conteudo);

// ---------------------------------------------------------------- leitor
test('leitor: arquivo de exemplo (30/10/2026) com 14 fases, 16 eventos, acentos e horários certos', () => {
  const amb = ambiente();
  const r = ler(amb, fixture(EXEMPLO));
  assert.equal(r.ok, true, r.message);
  const c = r.ciclo;
  assert.equal(c.lote, 'LOT-20261030-6222');
  assert.equal(c.receita, 'INSTRUMENTAL PADRÃO');
  assert.equal(c.operador, 'MANUTENÇÃO');
  assert.equal(c.resultadoClasse, 'APROVADO');
  assert.equal(c.fases.length, 14);
  assert.equal(c.eventos.length, 16);
  assert.equal(c.eventos[6].texto, 'FIM DE FASE: ENXÁGUE: DREN');
  assert.equal(c.eventos[15].texto, 'CICLO CONCLUÍDO');
  assert.deepEqual([c.inicio.data, c.inicio.hora, c.fim.hora], ['30/10/2026', '18:42:04', '19:35:54']);
  assert.equal(c.fim.hora, '19:35:54', 'o término bate com o HORA do arquivo: o relógio da lavadora é gravado como UTC');
  assert.equal(c.duracaoSeg, 3230);
  assert.deepEqual([c.desinfeccao.nome, c.desinfeccao.duracaoSeg, c.desinfeccao.tempMax], ['DESINFETANDO', 960, 61.3]);
  assert.equal(c.tempFinal, 49.9);
  assert.equal(c.manutVencida, false);
  assert.equal(c.codFalha, 0);
  assert.equal(c.falha, '');
  assert.equal(c.codificacao, 'UTF-8');
  assert.equal(c.formato, 'COMPLETO');
  assert.equal(r.avisos.length, 0);
});

test('leitor: arquivo antigo (sem o 4º campo das fases, sem épocas e sem código de falha) e eventos na ordem certa', () => {
  const amb = ambiente();
  const r = ler(amb, fixture('LOT-19700101-0010.sgolav'));
  assert.equal(r.ok, true, r.message);
  const c = r.ciclo;
  assert.equal(c.formato, 'ANTIGO');
  assert.equal(c.fases.length, 8);
  assert.ok(c.fases.every((f) => f.inicioEpoch === null));
  assert.equal(c.inicio.estimado, true);
  assert.equal(c.fim.hora, '14:05:52');
  assert.equal(c.duracaoFonte, 'FASES');
  assert.match(c.eventos[0].texto, /CICLO INICIADO/, 'o firmware antigo gravava do mais novo para o mais velho');
  assert.match(c.eventos[c.eventos.length - 1].texto, /CICLO CONCLUÍDO/);
  assert.ok(r.avisos.some((a) => /revisão anterior do firmware/.test(a)));
});

test('leitor: temperatura INDISPONIVEL (fase e término) e início de fase INDISPONIVEL', () => {
  const amb = ambiente();
  const t = abrirSgolav(fixture(EXEMPLO)).replace('TEMPFINAL=49.9', 'TEMPFINAL=INDISPONIVEL').replace('FASE12=DESINFETANDO|960|61.3|1793387893', 'FASE12=DESINFETANDO|960|INDISPONIVEL|INDISPONIVEL');
  const r = ler(amb, montarSgolav(t));
  assert.equal(r.ok, true, r.message);
  assert.equal(r.ciclo.tempFinal, null);
  assert.equal(r.ciclo.fases[11].tempMax, null);
  assert.equal(r.ciclo.fases[11].inicioEpoch, null);
  assert.equal(r.ciclo.desinfeccao.tempMax, null);
  const html = amb.ctx.LavCicD_linhasFita_(r.ciclo).map((l) => l.t).join('\n');
  assert.match(html, /TEMP FINAL:\s+INDISPONIVEL/);
  assert.match(html, /DESINFETANDO\s+960s INDISP/);
});

test('leitor: arquivo em Windows-1252 (acentos) é convertido', () => {
  const amb = ambiente();
  const t = abrirSgolav(fixture(EXEMPLO));
  const r = ler(amb, montarSgolav(t, 'latin1'));
  assert.equal(r.ok, true, r.message);
  assert.equal(r.ciclo.codificacao, 'WINDOWS-1252');
  assert.equal(r.ciclo.receita, 'INSTRUMENTAL PADRÃO');
  assert.equal(r.ciclo.operador, 'MANUTENÇÃO');
});

test('leitor: arquivo inválido, alterado, truncado ou de outro tipo é recusado com o quê, por quê e o que fazer', () => {
  const amb = ambiente();
  const exemplo = fixture(EXEMPLO);
  const casos = [
    ['', 'VAZIO'],
    ['Lote;Data\nLOT-1;30/10/2026\n', 'FORMATO'],
    ['SGOLAV1\n', 'VAZIO'],
    ['SGOLAV1\n!!!isto não é base64!!!\n', 'ALTERADO'],
    [exemplo.slice(0, exemplo.length - 300), 'ALTERADO'],
    [exemplo.replace(/^(SGOLAV1\r?\n)(.)(.)/, (m, a, x, y) => a + y + x), 'ALTERADO'],
    [montarSgolav(abrirSgolav(exemplo).replace('FASES=14', 'FASES=15')), 'ALTERADO'],
    [montarSgolav(abrirSgolav(exemplo).replace('EVENTOS=16', 'EVENTOS=12')), 'ALTERADO'],
    [montarSgolav(abrirSgolav(exemplo).replace('FASE3=AQUECENDO|225|', 'FASE3=AQUECENDO|duzentos|')), 'ALTERADO'],
    [montarSgolav(abrirSgolav(exemplo) + 'LOTE=LOT-OUTRO\n'), 'ALTERADO'],
    [montarSgolav(abrirSgolav(exemplo).replace(/^RESULTADO=.*\n/m, '')), 'ALTERADO']
  ];
  for (const [conteudo, codigo] of casos) {
    const r = ler(amb, conteudo);
    assert.equal(r.ok, false, 'devia recusar: ' + conteudo.slice(0, 40));
    assert.equal(r.codigo, codigo, r.message);
    assert.match(r.message, /Por quê: .+ O que fazer: /, r.message);
  }
});

test('leitor: campo futuro SERIE= que não bate com o equipamento é recusado; que bate passa; sem série no cadastro avisa', () => {
  const amb = ambiente();
  const t = abrirSgolav(fixture(EXEMPLO));
  const outro = ler(amb, montarSgolav('SERIE=XYZ-999\n' + t)).ciclo;
  assert.equal(outro.serie, 'XYZ-999');
  const eq = amb.tabelas.CAD_EQUIPAMENTOS[0];
  const r1 = amb.ctx.LavCicL_conferirEquipamento_(outro, eq);
  assert.equal(r1.ok, false);
  assert.match(r1.message, /outro equipamento.*Por quê: .*XYZ-999.*LUS0001.*O que fazer/);
  const certo = ler(amb, montarSgolav(t + 'SERIE=lus-0001\n')).ciclo;
  assert.equal(amb.ctx.LavCicL_conferirEquipamento_(certo, eq).ok, true, 'compara sem pontuação nem caixa');
  const porTag = ler(amb, montarSgolav(t + 'EQUIPAMENTO=LAV-01\n')).ciclo;
  assert.equal(amb.ctx.LavCicL_conferirEquipamento_(porTag, eq).ok, true);
  const semSerie = amb.ctx.LavCicL_conferirEquipamento_(outro, amb.tabelas.CAD_EQUIPAMENTOS[1]);
  assert.equal(semSerie.ok, true);
  assert.match(semSerie.aviso, /sem número de série/);
  // pela API: a importação é recusada e nada é gravado
  const g = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: 'LOT-20261030-6222.sgolav', texto: montarSgolav('SERIE=XYZ-999\n' + t) });
  assert.equal(g.ok, false);
  assert.match(g.message, /outro equipamento/);
  assert.equal((amb.tabelas.LAVCIC_RELATORIOS || []).length, 0);
});

test('leitor: os arquivos reais da lavadora (fixtures e, se existir no computador, o backup de 59 arquivos) são todos lidos', () => {
  const amb = ambiente();
  const pastas = [path.join(__dirname, 'fixtures/lavciclo'), 'C:/Users/venda/Documents/LAVADORA/REV20261026/SD_BACKUP_20261027_ORIGINAL/lavadora/export'].filter((p) => fs.existsSync(p));
  let n = 0;
  for (const p of pastas) for (const f of fs.readdirSync(p).filter((x) => x.endsWith('.sgolav'))) {
    const r = ler(amb, fs.readFileSync(path.join(p, f), 'latin1'));
    assert.equal(r.ok, true, f + ': ' + r.message);
    assert.equal(r.ciclo.lote + '.sgolav', f);
    n++;
  }
  assert.ok(n >= 5);
});

// ---------------------------------------------------------------- conferência, geração e lote repetido
test('conferir mostra lote, data, horário, receita e resultado sem gravar nada', () => {
  const amb = ambiente();
  const r = amb.api('s_tec', 'conferir', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual([r.conferencia.lote, r.conferencia.data, r.conferencia.horaInicio, r.conferencia.horaFim, r.conferencia.receita, r.conferencia.resultado],
    ['LOT-20261030-6222', '30/10/2026', '18:42', '19:35', 'INSTRUMENTAL PADRÃO', 'APROVADO']);
  assert.equal(r.duplicado, null);
  assert.equal((amb.tabelas.LAVCIC_RELATORIOS || []).length, 0);
  const csv = amb.api('s_tec', 'conferir', { equipamentoId: 'eq1', nomeArquivo: 'LOT-20261030-6222.csv', texto: 'a;b' });
  assert.equal(csv.ok, false);
  assert.match(csv.message, /só o \.sgolav/);
});

test('gerar: relatório A4 de uma folha com fita, gráfico, indicadores, conclusão por regra (sem chave) e dados do cadastro', () => {
  const amb = ambiente();
  const g = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(g.ok, true, g.message);
  assert.equal(g.relatorio.numero, 'RCL-2026-0001');
  assert.equal(g.relatorio.versao, 1);
  assert.equal(amb.chamadasIa.length, 0, 'sem chave, a IA nem é chamada');
  const linha = amb.tabelas.LAVCIC_RELATORIOS[0];
  assert.equal(linha.CONCLUSAO_ORIGEM, 'REGRA');
  assert.match(linha.CONCLUSAO_MOTIVO, /chave da IA não está cadastrada/);
  assert.equal(linha.SALVO, 'SIM');
  assert.equal(linha.CLIENTE_ID, 'c1');
  assert.equal(linha.PAGINAS, 1);
  const html = amb.arquivos[linha.HTML_ID].bytes.toString('utf8');
  // cadastro (nunca do arquivo)
  for (const t of ['HOSPITAL TESTE ALFA LTDA', '11.222.333/0001-81', 'Unidade Centro', 'CME', 'Lavadora ultrassônica', '<th>Fabricante</th><td>FABRICANTE TESTE</td>', 'LUS-60', 'LUS0001', 'Patrimônio PAT-778 · TAG LAV-01', '<th>Identificação</th>']) assert.ok(html.includes(t), 'falta ' + t);
  // fita reproduzida como o ticket do firmware
  for (const t of ['METROLABS', 'SGO+ MEDICAL WASHER', 'TÉRMINO DE CICLO', 'LOTE:          LOT-20261030-6222', 'INÍCIO:              30/10 18:42', 'DURAÇÃO:                00:53:50', 'TEMP FINAL:               49.9 C', '[ APROVADO ]', 'DESINFETANDO    960s  61.3C', 'ÚLTIMOS EVENTOS', '* FIM DE IMPRESSÃO *']) assert.ok(html.includes(t), 'fita sem ' + t);
  assert.ok(!html.includes('CICLO INICIADO: INSTRUMENTA'), 'como no papel, só os 8 últimos eventos');
  // gráfico, indicadores, conclusão e campo de aprovação
  assert.match(html, /<svg[^>]+Temperatura máxima por fase/);
  assert.match(html, /61,3 °C · 16 min 00 s/);
  for (const t of ['Desinfecção térmica: temperatura máxima', '16 min 00 s', '53 min 50 s', '49,9 °C', 'Em dia', 'Nenhuma']) assert.ok(html.includes(t), 'indicador sem ' + t);
  assert.match(html, /Sem valor de referência cadastrado para a receita INSTRUMENTAL PADRÃO/);
  assert.match(html, /Conclusão escrita por regra fixa do sistema/);
  assert.match(html, /foi concluído pela lavadora com o resultado APROVADO e sem registro de falha/);
  assert.match(html, /temperatura máxima registrada foi de 61,3 °C, com duração de 16 min 00 s/);
  assert.match(html, /Aguardando a assinatura do responsável pelo local/);
  assert.match(html, new RegExp('resumo SHA-256 ' + linha.ARQUIVO_SHA256));
  assert.ok(!/A0|NBR/.test(html.replace(/data:[^"')]+/g, '').replace(/<style>[\s\S]*?<\/style>/g, '')), 'sem critério normativo nem A0');
  // arquivo original guardado e restrito
  assert.match(amb.arquivos[linha.ARQUIVO_ID].compartilhamento, /^RESTRITO/);
  assert.equal(linha.HASH_DOCUMENTO.length, 64);
  // pasta: <CNPJ>/<TAG - tipo>/Relatórios de ciclo
  const pasta = amb.pastas[amb.arquivos[linha.PDF_ID].pasta];
  assert.equal(pasta.nome, 'Relatórios de ciclo');
  assert.equal(amb.pastas[pasta.pai].nome, 'LAV-01 - Lavadora ultrassônica');
  assert.equal(amb.pastas[amb.pastas[pasta.pai].pai].nome, '11222333000181');
});

test('o mesmo lote nunca é importado duas vezes para o mesmo equipamento: devolve o relatório que já existe', () => {
  const amb = ambiente();
  const a = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(a.ok, true);
  const c = amb.api('s_cli', 'conferir', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(c.duplicado.id, a.relatorio.id);
  const b = amb.api('s_dir', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO).replace(/\n/g, '\r\n') });
  assert.equal(b.ok, true);
  assert.equal(b.duplicado, true);
  assert.equal(b.relatorio.id, a.relatorio.id);
  assert.match(b.message, /já foi importado.*Por quê: .*O que fazer: abra o relatório que já existe/);
  assert.equal(amb.tabelas.LAVCIC_RELATORIOS.length, 1);
  // o mesmo lote em outro equipamento é outro relatório
  const outro = amb.api('s_dir', 'gerar', { equipamentoId: 'eq2', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(outro.ok, true);
  assert.notEqual(outro.duplicado, true);
});

test('ciclo cancelado também gera relatório, com a falha em destaque', () => {
  const amb = ambiente();
  const g = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: 'LOT-20261017-0074.sgolav', texto: fixture('LOT-20261017-0074.sgolav') });
  assert.equal(g.ok, true, g.message);
  const linha = amb.tabelas.LAVCIC_RELATORIOS[0];
  assert.equal(linha.RESULTADO_CLASSE, 'CANCELADO');
  const html = amb.arquivos[linha.HTML_ID].bytes.toString('utf8');
  assert.match(html, /<span class="val">CANCELADO<\/span><span class="mot">Falha: TIMEOUT DRENAGEM: OBSTRUÇÃO \(código 3\), na fase ENX-DRENA\. A carga não deve ser liberada/);
  assert.match(html, /class="resultado lc-res nok"/);
  assert.match(html, /CICLO CANCELADO/);
  assert.match(html, /A carga não deve ser liberada com base neste ciclo/);
  assert.match(linha.CONCLUSAO_TEXTO, /foi encerrado pela lavadora com o resultado CANCELADO\. A falha registrada foi "TIMEOUT DRENAGEM: OBSTRUÇÃO" \(código 3\), e a última fase registrada foi ENX-DRENA/);
  assert.match(html, /Cancelamento/);
});

// ---------------------------------------------------------------- conclusão pela IA, conferida
test('conclusão: sem chave usa a regra; IA que inventa número, troca o resultado ou cita norma é recusada; IA correta é usada', () => {
  const ok = 'O ciclo do lote LOT-20261030-6222, receita INSTRUMENTAL PADRÃO, foi realizado em 30/10/2026, das 18:42 às 19:35, e a lavadora registrou o resultado APROVADO, sem falha, com duração total de 53 min 50 s em 14 fases. Na desinfecção térmica, a temperatura máxima registrada foi de 61,3 °C por 16 min 00 s. O arquivo registra a temperatura máxima de cada fase, e não a curva contínua.';
  const casos = [
    [ok.replace('61,3 °C', '93,0 °C'), /número 93,0/],
    [ok.replace('APROVADO, sem falha', 'REPROVADO'), /resultado diferente|não disse/],
    [ok + ' O valor de A0 atendeu à norma.', /norma/],
    [ok.replace('61,3 °C por ', 'por '), /temperatura máxima da desinfecção/]
  ];
  for (const [resposta, motivo] of casos) {
    const amb = ambiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, respostaIa: resposta });
    const g = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
    assert.equal(g.ok, true);
    const l = amb.tabelas.LAVCIC_RELATORIOS[0];
    assert.equal(l.CONCLUSAO_ORIGEM, 'REGRA', resposta);
    assert.match(l.CONCLUSAO_MOTIVO, motivo);
    assert.match(g.html, /Conclusão escrita pela regra fixa do sistema \(o texto da IA foi recusado/);
  }
  const amb = ambiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, respostaIa: ok });
  const g = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  const l = amb.tabelas.LAVCIC_RELATORIOS[0];
  assert.equal(l.CONCLUSAO_ORIGEM, 'IA', l.CONCLUSAO_MOTIVO);
  assert.equal(amb.chamadasIa.length, 1);
  assert.match(JSON.stringify(amb.chamadasIa[0].corpo), /61,3 °C/, 'a IA recebe só os dados do arquivo');
  assert.match(amb.arquivos[l.HTML_ID].bytes.toString('utf8'), /Redação assistida por inteligência artificial a partir dos dados do arquivo e conferida/);
  // IA fora do ar: regra
  const fora = ambiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, falharIa: true });
  fora.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(fora.tabelas.LAVCIC_RELATORIOS[0].CONCLUSAO_ORIGEM, 'REGRA');
  assert.match(fora.tabelas.LAVCIC_RELATORIOS[0].CONCLUSAO_MOTIVO, /a IA não respondeu/);
});

test('conclusão por regra com referência da receita (a confirmar) e manutenção vencida', () => {
  const amb = ambiente();
  const sal = amb.api('s_met', 'referencias', { salvar: { receita: 'instrumental padrão', tempMin: '60', tempoMinMin: '10', motivo: 'parâmetro do ensaio de qualificação de teste' } });
  assert.equal(sal.ok, true, sal.message);
  const t = abrirSgolav(fixture(EXEMPLO)).replace('MANUTVENCIDA=NAO', 'MANUTVENCIDA=SIM');
  amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: montarSgolav(t) });
  const l = amb.tabelas.LAVCIC_RELATORIOS[0];
  const html = amb.arquivos[l.HTML_ID].bytes.toString('utf8');
  assert.match(html, /Referência cadastrada para a receita INSTRUMENTAL PADRÃO: temperatura máxima na desinfecção de pelo menos 60,0 °C e duração da desinfecção de pelo menos 10 min 00 s \(a confirmar pelo responsável técnico\)/);
  assert.match(html, /a temperatura máxima atingiu o valor de referência de 60,0 °C e a duração atendeu ao tempo de referência de 10 min 00 s/);
  assert.match(html, /\[ MANUTENÇÃO VENCIDA \]/);
  assert.match(html, /indicava manutenção preventiva vencida/);
  assert.match(html, /referência 60,0 °C/, 'linha da referência no gráfico');
  // técnico e cliente não cadastram referência
  assert.equal(amb.api('s_tec', 'referencias', { salvar: { receita: 'X', tempMin: '60', motivo: 'motivo qualquer de teste' } }).ok, false);
  assert.equal(amb.api('s_cli', 'referencias', { salvar: { receita: 'X', tempMin: '60', motivo: 'motivo qualquer de teste' } }).ok, false);
});

// ---------------------------------------------------------------- assinatura na tela, trava e nova versão
test('assinatura: grava imagem, nome, cargo, data, hora, usuário e hash; depois trava; correção só por nova versão com motivo', () => {
  const amb = ambiente();
  const g = amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  const id = g.relatorio.id;
  const falta = amb.api('s_cli', 'assinar', { id, nome: 'Ma', cargo: '', imagem: '', conferi: false });
  assert.equal(falta.ok, false);
  assert.deepEqual(falta.faltam.map((f) => f.campo), ['nome', 'cargo', 'assinatura', 'conferi']);
  const antes = amb.tabelas.LAVCIC_RELATORIOS[0];
  const hashAntes = antes.HASH_DOCUMENTO, htmlAntes = antes.HTML_ID;
  const a = amb.api('s_cli', 'assinar', { id, nome: 'Maria Cliente Alfa', cargo: 'Enfermeira responsável pela CME', imagem: PNG, conferi: true });
  assert.equal(a.ok, true, a.message);
  const l = amb.tabelas.LAVCIC_RELATORIOS[0];
  assert.equal(l.ASSINADO, 'SIM');
  assert.equal(l.ASSINANTE_NOME, 'Maria Cliente Alfa');
  assert.equal(l.ASSINANTE_CARGO, 'Enfermeira responsável pela CME');
  assert.equal(l.ASSINADO_EM, '2026-10-31T10:00:00');
  assert.equal(l.ASSINADO_POR_ID, 'u_cli');
  assert.equal(l.HTML_ID_SEM_ASSINATURA, htmlAntes, 'o documento sem assinatura continua guardado');
  assert.match(amb.arquivos[l.ASSINATURA_ID].compartilhamento, /^RESTRITO/);
  assert.equal(l.ASSINATURA_SHA256.length, 64);
  const html = amb.arquivos[l.HTML_ID].bytes.toString('utf8');
  assert.ok(html.includes('<img src="' + PNG + '"'), 'a imagem da assinatura vai no documento');
  for (const t of ['Maria Cliente Alfa', 'Enfermeira responsável pela CME', '31/10/2026 às 10:00', 'MARIA CLIENTE ALFA TESTE (maria@alfa.exemplo.test)', hashAntes]) assert.ok(html.includes(t), 'documento assinado sem ' + t);
  assert.ok(!html.includes('Aguardando a assinatura'));
  // travado
  const de2 = amb.api('s_dir', 'assinar', { id, nome: 'Outra Pessoa', cargo: 'Gerente', imagem: PNG, conferi: true });
  assert.equal(de2.ok, false);
  assert.match(de2.message, /já foi assinado por Maria Cliente Alfa.*Por quê: depois de assinado, o documento fica travado.*O que fazer: .*nova versão/);
  // cliente não gera nova versão; equipe interna gera, com motivo
  assert.equal(amb.api('s_cli', 'novaVersao', { id, motivo: 'quero corrigir o setor da máquina' }).ok, false);
  const sem = amb.api('s_tec', 'novaVersao', { id, motivo: 'curto' });
  assert.equal(sem.ok, false);
  assert.equal(sem.faltam[0].campo, 'motivo');
  amb.tabelas.CAD_EQUIPAMENTOS[0].SETOR = 'CME - Expurgo';
  const nv = amb.api('s_tec', 'novaVersao', { id, motivo: 'setor da máquina corrigido no cadastro' });
  assert.equal(nv.ok, true, nv.message);
  assert.equal(nv.relatorio.versao, 2);
  assert.equal(nv.relatorio.numero, 'RCL-2026-0001');
  const [v1, v2] = amb.tabelas.LAVCIC_RELATORIOS;
  assert.equal(v1.SITUACAO, 'SUBSTITUIDO');
  assert.equal(v1.SUBSTITUIDO_POR_ID, v2.ID);
  assert.equal(v1.ASSINADO, 'SIM', 'a anterior continua como estava');
  assert.equal(v2.ASSINADO, '');
  const h2 = amb.arquivos[v2.HTML_ID].bytes.toString('utf8');
  assert.match(h2, /Versão 2, substitui a versão 1 \(motivo: setor da máquina corrigido no cadastro\)/);
  assert.match(h2, /Revisão 01/);
  assert.match(h2, /CME - Expurgo/);
  // a versão substituída não é assinada; a nova é
  assert.match(amb.api('s_cli', 'assinar', { id: v1.ID, nome: 'Maria Cliente Alfa', cargo: 'Enfermeira', imagem: PNG, conferi: true }).message, /substituída/);
  assert.equal(amb.api('s_cli', 'assinar', { id: v2.ID, nome: 'Maria Cliente Alfa', cargo: 'Enfermeira', imagem: PNG, conferi: true }).ok, true);
  // a lista mostra só a versão em vigor; o lote continua sem duplicar
  const lista = amb.api('s_dir', 'listar', {});
  assert.equal(lista.total, 1);
  assert.equal(lista.relatorios[0].versao, 2);
  const ab = amb.api('s_dir', 'abrir', { id: v2.ID });
  assert.equal(ab.relatorio.versoes.length, 2);
  assert.ok(ab.relatorio.historico.some((h) => h.tipo === 'ASSINADO'));
  assert.equal(amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) }).relatorio.id, v2.ID);
});

// ---------------------------------------------------------------- acesso do cliente
test('cliente vê e gera só para os equipamentos dele, também na rota /arquivos', () => {
  const amb = ambiente();
  const gAlfa = amb.api('s_cli', 'gerar', { equipamentoId: 'eq1', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(gAlfa.ok, true, gAlfa.message);
  const gBeta = amb.api('s_tec', 'gerar', { equipamentoId: 'eq2', nomeArquivo: 'LOT-20261017-0077.sgolav', texto: fixture('LOT-20261017-0077.sgolav') });
  assert.equal(gBeta.ok, true, gBeta.message);
  // lista de equipamentos e de relatórios
  const iniAlfa = amb.api('s_cli', 'iniciar');
  assert.deepEqual(iniAlfa.equipamentos.map((e) => e.id), ['eq1'], 'só a lavadora dele (a autoclave não entra)');
  assert.equal(iniAlfa.eu.clienteNome, 'Hospital Teste Alfa');
  assert.equal(iniAlfa.equipamentos[0].podeCompletar, false);
  assert.deepEqual(amb.api('s_cli', 'listar', {}).relatorios.map((r) => r.lote), ['LOT-20261030-6222']);
  assert.deepEqual(amb.api('s_cli2', 'listar', {}).relatorios.map((r) => r.lote), ['LOT-20261017-0077']);
  assert.equal(amb.api('s_dir', 'listar', {}).total, 2);
  assert.equal(amb.api('s_com', 'listar', {}).total, 2, 'equipe interna vê todos');
  // equipamento e relatório de outro cliente: recusa
  for (const [acao, dados] of [['equipamento', { id: 'eq2' }], ['conferir', { equipamentoId: 'eq2', texto: fixture(EXEMPLO), nomeArquivo: EXEMPLO }], ['gerar', { equipamentoId: 'eq2', texto: fixture('LOT-20261017-0074.sgolav'), nomeArquivo: 'LOT-20261017-0074.sgolav' }], ['abrir', { id: gBeta.relatorio.id }], ['assinar', { id: gBeta.relatorio.id, nome: 'Maria', cargo: 'Enfermeira', imagem: PNG, conferi: true }]]) {
    const r = amb.api('s_cli', acao, dados);
    assert.equal(r.ok, false, acao);
    assert.match(r.message, /não pertence à sua empresa|não é de um equipamento da sua empresa/, acao + ': ' + r.message);
  }
  // rota /arquivos: HTML e PDF dos relatórios dele sim; dos outros não; o .sgolav e a assinatura nunca
  const [la, lb] = amb.tabelas.LAVCIC_RELATORIOS;
  const perm = (sid, id) => amb.ctx.Representacao_arquivoClientePermitido_(sid, id);
  assert.equal(perm('s_cli', la.HTML_ID), true);
  assert.equal(perm('s_cli', la.PDF_ID), true);
  assert.equal(perm('s_cli', lb.HTML_ID), false);
  assert.equal(perm('s_cli', lb.PDF_ID), false);
  assert.equal(perm('s_cli2', lb.PDF_ID), true);
  assert.equal(perm('s_cli', la.ARQUIVO_ID), false);
  assert.equal(amb.ctx.LavCic_arquivoClientePermitido_('s_cli', 'arquivo-que-nao-e-do-modulo'), null, 'arquivo de outro módulo segue a regra de sempre');
  // sem vínculo de cliente e representada: sem acesso, com o motivo
  const sem = amb.api('s_semcli', 'iniciar');
  assert.equal(sem.ok, false);
  assert.match(sem.message, /não está ligado a nenhum cliente.*Por quê: .*O que fazer: /);
  assert.equal(amb.api('s_rep', 'iniciar').ok, false);
});

test('cadastro incompleto: o relatório sai e a tela diz o que falta, com o atalho só para quem pode completar', () => {
  const amb = ambiente();
  const c = amb.api('s_cli2', 'conferir', { equipamentoId: 'eq2', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(c.ok, true);
  assert.deepEqual(c.faltam, ['CNPJ do cliente', 'unidade', 'setor onde está instalado', 'fabricante', 'modelo', 'número de série']);
  assert.equal(c.podeCompletar, false);
  const t = amb.api('s_tec', 'conferir', { equipamentoId: 'eq2', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(t.podeCompletar, true);
  const g = amb.api('s_cli2', 'gerar', { equipamentoId: 'eq2', nomeArquivo: EXEMPLO, texto: fixture(EXEMPLO) });
  assert.equal(g.ok, true);
  assert.match(g.message, /O cadastro do equipamento está sem CNPJ do cliente, unidade/);
  assert.match(g.html, /O cadastro do equipamento está sem: .*gere uma nova versão/);
  const html = amb.arquivos[amb.tabelas.LAVCIC_RELATORIOS[0].HTML_ID].bytes.toString('utf8');
  assert.match(html, /<th>Nº de série<\/th><td>—<\/td>/);
  assert.ok(!/aviso-tela/.test(html.replace(/\.aviso-tela[^{]*\{[^}]*\}/g, '')), 'a faixa de aviso é só de tela, não vai para o arquivo');
});

test('lista com busca por lote, período, resultado e assinatura; nenhum Date cru no retorno', () => {
  const amb = ambiente();
  for (const f of ['LOT-20261030-6222.sgolav', 'LOT-20261017-0074.sgolav', 'LOT-20261017-0077.sgolav', 'LOT-20260928-0060.sgolav']) amb.api('s_tec', 'gerar', { equipamentoId: 'eq1', nomeArquivo: f, texto: fixture(f) });
  const t = (d) => amb.api('s_dir', 'listar', d).relatorios.map((r) => r.lote);
  assert.deepEqual(t({}), ['LOT-20261030-6222', 'LOT-20261017-0077', 'LOT-20261017-0074', 'LOT-20260928-0060']);
  assert.deepEqual(t({ busca: '0074' }), ['LOT-20261017-0074']);
  assert.deepEqual(t({ de: '2026-10-01', ate: '2026-10-20' }), ['LOT-20261017-0077', 'LOT-20261017-0074']);
  assert.deepEqual(t({ resultado: 'CANCELADO' }), ['LOT-20261017-0074', 'LOT-20260928-0060']);
  assert.deepEqual(t({ assinatura: 'SIM' }), []);
  const l = amb.api('s_dir', 'listar', {});
  assert.deepEqual(l.resumo, { aprovados: 2, naoAprovados: 2, semAssinatura: 4 });
  const semDate = (o) => JSON.stringify(o) === JSON.stringify(JSON.parse(JSON.stringify(o)));
  assert.ok(semDate(l));
  const ini = amb.api('s_dir', 'iniciar');
  assert.equal(ini.equipamentos.find((e) => e.id === 'eq1').relatorios, 4);
  assert.equal(ini.equipamentos.find((e) => e.id === 'eq1').ultimo.lote, 'LOT-20261030-6222');
});

// ---------------------------------------------------------------- cadastro do equipamento (31/10/2026)
// Conferência pedida pela coordenação: a lavadora real cadastrada em produção parecia ter os valores deslocados de coluna.
// Lido o banco (só leitura): o registro está certo na planilha do SGO+; o cabeçalho "TIPO, MARCA, MODELO, SERIE, VOLUME,
// BOMBA_VACUO..." é de outra planilha (METROLABS_CME_DB). Este teste trava a regra: o formulário manda chaves com o nome
// das colunas de CAD_EQUIPAMENTOS e o SGO_DATA grava por nome de cabeçalho, nunca por posição.
test('cadastro de equipamento: o formulário só envia colunas de CAD_EQUIPAMENTOS e a gravação é por nome do cabeçalho', () => {
  const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const tela = fs.readFileSync(path.join(pasta, 'JS_Equipamentos.html'), 'utf8');
  const m = /function Equipamentos_salvar_\(id\) \{[\s\S]*?var p = \{([\s\S]*?)\};/.exec(tela);
  assert.ok(m, 'Equipamentos_salvar_ não encontrado');
  const chaves = [...m[1].matchAll(/([A-Z_]+):\s*getValue_\("([a-z_]+)"\)/g)].map((x) => ({ coluna: x[1], campo: x[2] }));
  assert.ok(chaves.length >= 10);
  const setup = fs.readFileSync(path.join(pasta, 'SGO_Setup.js'), 'utf8');
  const bloco = /setupTabela\(SGO_CFG\.SHEETS\.CAD_EQUIPAMENTOS, \[([\s\S]*?)\]\);/.exec(setup)[1];
  const colunas = [...bloco.matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]);
  for (const k of chaves) assert.ok(colunas.includes(k.coluna), 'o campo ' + k.campo + ' grava em ' + k.coluna + ', que não é coluna de CAD_EQUIPAMENTOS');
  const pares = { eqp_tipo: 'TIPO', eqp_tag: 'TAG', eqp_serie: 'SERIE', eqp_fabricante: 'FABRICANTE', eqp_modelo: 'MODELO', eqp_setor: 'SETOR', eqp_patrimonio: 'PATRIMONIO', eqp_capacidade: 'CAPACIDADE' };
  for (const [campo, coluna] of Object.entries(pares)) assert.equal(chaves.find((k) => k.campo === campo).coluna, coluna, 'rótulo e coluna não batem: ' + campo);
  // SGO_DATA.insert monta a linha pelos nomes do cabeçalho (qualquer ordem de colunas na aba)
  const dados = fs.readFileSync(path.join(pasta, 'SGO_Data.js'), 'utf8');
  assert.match(dados, /insert\(nome, obj\) \{[\s\S]*?const row = headers\.map\(function\(h\) \{\s*return normalizado\[h\];/);
  // e o relatório do ciclo lê os campos certos do cadastro, com a lavadora real de produção (cabeçalho em outra ordem não importa)
  const amb = ambiente({ tabelas: { CAD_EQUIPAMENTOS: [{ ID: '380fdff0-e6e4-493a-89c8-eed7c40cdc0a', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'LAVADORA ULTRASSÔNICA', FABRICANTE: 'MEDISAFE', MODELO: 'MED11131', SERIE: '04131027801', TAG: 'LAV-01', SETOR: 'CME', PATRIMONIO: '0023', CAPACIDADE: '70 LITROS', STATUS: 'ATIVO' }] } });
  const c = amb.ctx.LavCic_cadastro_(amb.tabelas.CAD_EQUIPAMENTOS[0]);
  assert.deepEqual(JSON.parse(JSON.stringify([c.cad.equipamento, c.cad.fabricante, c.cad.modelo, c.cad.serie, c.cad.patrimonio, c.cad.tag, c.cad.setor])), ['LAVADORA ULTRASSÔNICA', 'MEDISAFE', 'MED11131', '04131027801', '0023', 'LAV-01', 'CME']);
  assert.equal(c.faltam.length, 0);
  // CNPJ só com dígitos sai com a máscara; a cidade não se repete quando o endereço já a traz
  amb.tabelas.CAD_CLIENTES[0].CNPJ = '19324171000447';
  amb.tabelas.CAD_UNIDADES[0].ENDERECO = 'RUA UM, GOIÂNIA - GO, 75380-000';
  const c2 = amb.ctx.LavCic_cadastro_(amb.tabelas.CAD_EQUIPAMENTOS[0]);
  assert.equal(c2.cad.cnpj, '19.324.171/0004-47');
  assert.equal(c2.cad.unidade, 'Unidade Centro · RUA UM, GOIÂNIA - GO, 75380-000');
});
