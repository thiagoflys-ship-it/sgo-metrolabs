// Esterilização a baixa temperatura — leitura dos arquivos do registrador (21/10/2026). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_baixatemp_ambiente.cjs');

const amb = A.criarAmbiente();
const P = amb.ctx;
const j = (x) => JSON.parse(JSON.stringify(x));

function ler(texto, mapaExtra) {
  const m = P.BaixaTempParser_textoParaMatriz_(texto);
  const prop = P.BaixaTempParser_proporMapa_(m.matriz, m.decimalVirgula);
  const mapa = P.BaixaTempParser_mapaDeColunas_(prop.colunas);
  return { m, prop, s: P.BaixaTempParser_normalizar_(m.matriz, Object.assign(mapa, mapaExtra || {}), Object.assign({ linhaCabecalho: prop.linhaCabecalho, decimalVirgula: m.decimalVirgula }, mapaExtra && mapaExtra._op || {})) };
}

test('números pt-BR e internacionais', () => {
  assert.equal(P.BaixaTempParser_numero_('50,25'), 50.25);
  assert.equal(P.BaixaTempParser_numero_('1.013,25'), 1013.25);
  assert.equal(P.BaixaTempParser_numero_('1,013.25'), 1013.25);
  assert.equal(P.BaixaTempParser_numero_('0.4'), 0.4);
  assert.equal(P.BaixaTempParser_numero_('-3'), -3);
  assert.equal(P.BaixaTempParser_numero_('abc'), null);
  assert.equal(P.BaixaTempParser_numero_(''), null);
  assert.equal(P.BaixaTempParser_numero_('12,5 °C'), 12.5);
});

test('CSV com ponto e vírgula: cabeçalho, papéis, data e hora separadas, pressão em mbar', () => {
  const { prop, s } = ler(A.cicloPeroxido());
  assert.deepEqual(j(prop.colunas.map((c) => c.papel)), ['DATA', 'HORA', 'TEMPERATURA', 'TEMPERATURA', 'TEMPERATURA', 'PRESSAO']);
  assert.equal(prop.colunas[5].unidade, 'MBAR');
  assert.equal(s.erros.length, 0);
  assert.equal(s.tempos.length, 56);
  assert.equal(P.BaixaTempParser_fmtDataHora_(s.tempos[0]), '20/10/2026 10:00:00');
  assert.equal(P.BaixaTempParser_fmtHora_(s.tempos[55]), '10:27:30');
  assert.equal(s.temperaturas[1][20], 50.5);
  assert.equal(s.pressao[12], 0.5);
  assert.equal(P.BaixaTempParser_intervaloTipico_(s.tempos), 30);
});

test('pressão em kPa convertida para mbar; data e hora na mesma coluna; sensores ST-01', () => {
  const { prop, s } = ler(A.cicloFormaldeido());
  assert.equal(prop.colunas[0].papel, 'DATAHORA');
  assert.equal(prop.colunas[1].nome, 'ST-01');
  assert.equal(prop.colunas[5].unidade, 'KPA');
  assert.equal(s.pressao[0], 1013);      // 101,3 kPa × 10
  assert.equal(s.pressao[4], 50);        // 5 kPa
  assert.equal(s.nomes.join(','), 'ST-01,ST-02,ST-03,ST-04');
});

test('data americana detectada pelos valores; separador vírgula com ponto decimal', () => {
  const txt = ['Date,Time,T1,T2', '10/13/2026,23:59:30,50.1,50.2', '10/13/2026,23:59:45,50.3,50.4', '10/14/2026,00:00:00,50.5,50.6'].join('\n');
  const { s } = ler(txt);
  assert.equal(s.estiloData, 'US');
  assert.equal(P.BaixaTempParser_fmtDataHora_(s.tempos[2]), '14/10/2026 00:00:00');
  assert.equal(s.temperaturas[0][1], 50.3);
});

test('só a hora (com milissegundos e virada da meia-noite): usa a data do ciclo; sem data, trava com a instrução', () => {
  const txt = ['Horário;T1', '23:59:30:000;50,0', '23:59:45:500;50,1', '00:00:00:000;50,2'].join('\n');
  const m = P.BaixaTempParser_textoParaMatriz_(txt);
  const prop = P.BaixaTempParser_proporMapa_(m.matriz, true);
  assert.equal(prop.colunas[0].papel, 'HORA');
  const mapa = P.BaixaTempParser_mapaDeColunas_(prop.colunas);
  const sem = P.BaixaTempParser_normalizar_(m.matriz, mapa, { linhaCabecalho: prop.linhaCabecalho, decimalVirgula: true });
  assert.match(sem.erros[0], /Data do ciclo/);
  const s = P.BaixaTempParser_normalizar_(m.matriz, mapa, { linhaCabecalho: prop.linhaCabecalho, decimalVirgula: true, dataBase: '13/10/2026' });
  assert.equal(P.BaixaTempParser_fmtDataHora_(s.tempos[2]), '14/10/2026 00:00:00');
  assert.equal(s.tempos[1] - s.tempos[0], 15500);
});

test('tempo decorrido em segundos com hora de início', () => {
  const txt = ['Tempo (s);Temp 1;Temp 2', '0;50,0;50,1', '30;50,2;50,3', '60;50,4;50,5'].join('\n');
  const m = P.BaixaTempParser_textoParaMatriz_(txt);
  const prop = P.BaixaTempParser_proporMapa_(m.matriz, true);
  assert.equal(prop.colunas[0].papel, 'DECORRIDO');
  const s = P.BaixaTempParser_normalizar_(m.matriz, P.BaixaTempParser_mapaDeColunas_(prop.colunas), { linhaCabecalho: prop.linhaCabecalho, decimalVirgula: true, dataBase: '20/10/2026', horaBase: '09:00:00' });
  assert.equal(P.BaixaTempParser_fmtHora_(s.tempos[2]), '09:01:00');
});

test('linhas de metadados antes do cabeçalho, horários repetidos, fora de ordem e sensor desconectado', () => {
  const txt = ['Registrador: modelo de teste', 'Exportado em 20/10/2026', 'Data;Hora;T1;T2',
    '20/10/2026;10:00:30;50,0;50,1', '20/10/2026;10:00:00;49,9;50,0', '20/10/2026;10:00:30;51,0;51,0', '20/10/2026;10:01:00;-200;50,2', 'Mínimo;;49,9;50,0'].join('\n');
  const { prop, s } = ler(txt);
  assert.equal(prop.linhaCabecalho, 2);
  assert.equal(s.tempos.length, 3);
  assert.ok(s.foraDeOrdem);
  assert.equal(s.duplicadas, 1);
  assert.equal(s.temperaturas[0][2], null); // −200 °C: fora da faixa física, sem valor
  assert.ok(s.avisos.some((a) => /ordenadas/.test(a)));
  assert.ok(s.avisos.some((a) => /horário repetido/.test(a)));
});

test('arquivo por sensor: união pelo horário com tolerância de meio intervalo', () => {
  const a = ler(['Data;Hora;Sensor 1;Pressão (kPa)', '20/10/2026;10:00:00;50,0;1,0', '20/10/2026;10:00:30;50,1;1,1', '20/10/2026;10:01:00;50,2;1,2'].join('\n')).s;
  const b = ler(['Data;Hora;Sensor 1', '20/10/2026;10:00:05;49,0', '20/10/2026;10:00:31;49,1', '20/10/2026;10:01:40;49,2'].join('\n')).s;
  const u = P.BaixaTempParser_unir_([b, a]);
  assert.equal(u.tempos.length, 3);                 // grade do arquivo com pressão
  assert.equal(u.temperaturas.length, 2);
  assert.deepEqual(j(u.temperaturas[0]), [49, 49.1, null]); // 10:01:40 está a 40 s da grade (tolerância 15 s)
  assert.deepEqual(j(u.temperaturas[1]), [50, 50.1, 50.2]);
  assert.equal(u.pressao[1], 11);
  assert.ok(u.avisos.some((x) => /sem valor/.test(x) || /correspondente/.test(x)));
});

test('planilha (valores do Sheets): Date na coluna de data e hora, número na temperatura', () => {
  const m = [['Data e hora', 'T1', 'T2'], [new Date(2026, 9, 20, 10, 0, 0), 50.1, 50.2], [new Date(2026, 9, 20, 10, 0, 30), 50.3, 50.4]];
  const prop = P.BaixaTempParser_proporMapa_(m, true);
  assert.equal(prop.colunas[0].papel, 'DATAHORA');
  const s = P.BaixaTempParser_normalizar_(m, P.BaixaTempParser_mapaDeColunas_(prop.colunas), { linhaCabecalho: 0, decimalVirgula: true });
  assert.equal(P.BaixaTempParser_fmtDataHora_(s.tempos[1]), '20/10/2026 10:00:30');
  assert.equal(s.temperaturas[1][1], 50.4);
});

test('sem coluna de horário ou de temperatura: erro com a instrução', () => {
  const m = [['A', 'B'], ['x', 'y'], ['z', 'w']];
  const s = P.BaixaTempParser_normalizar_(m, { data: -1, hora: -1, datahora: -1, decorrido: -1, temperaturas: [], pressao: -1, umidade: -1, concentracao: -1 }, { linhaCabecalho: 0 });
  assert.equal(s.erros.length, 2);
  assert.match(s.erros[0], /marque a coluna do horário/);
});

test('lacunas: intervalo maior que 3 vezes o típico', () => {
  const t0 = Date.UTC(2026, 9, 20, 10, 0, 0);
  const tempos = [0, 30, 60, 90, 300, 330].map((x) => t0 + x * 1000);
  const l = P.BaixaTempParser_lacunas_(tempos);
  assert.equal(l.intervaloTipicoS, 30);
  assert.equal(l.lacunas.length, 1);
  assert.equal(Math.round(l.fracao * 1000) / 1000, Math.round((210 - 30) / 330 * 1000) / 1000);
});
