// Cadeia de frio e Estufa/Banho-maria (29/10/2026, arquivo "TESTES FRIGOBAR SF.xlsx" da equipe): a coluna HORA foi
// preenchida arrastando no Excel (+1 min por linha) e passou de 24:00 depois da meia-noite (1,0007 = 24:01). O leitor
// tratava esse número como data de 1900 e parava em "Data Excel fora do intervalo aceito na célula B548". Célula com
// formato só de hora vale a hora do dia; a data vem da coluna DATA. Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./_cadeiafrio_ambiente.cjs');
const E = require('./_estufa_ambiente.cjs');

/** XmlService mínimo (parse, getRootElement, getChild/getChildren/getAttribute/getText/getName) para o XML simples do teste. */
function xmlService() {
  function parse(s) {
    const raiz = { filhos: [] }, pilha = [raiz], re = /<(\/?)([\w:]+)((?:\s+[\w:]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
    let m;
    while ((m = re.exec(s))) {
      if (m[5] !== undefined) { pilha[pilha.length - 1].texto += m[5]; continue; }
      if (m[1]) { pilha.pop(); continue; }
      const attrs = {}; m[3].replace(/([\w:]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
      const no = { nome: m[2], attrs, filhos: [], texto: '' };
      pilha[pilha.length - 1].filhos.push(no);
      if (!m[4]) pilha.push(no);
    }
    return raiz.filhos[0];
  }
  const local = n => n.split(':').pop();
  function el(no) {
    return {
      getName: () => local(no.nome),
      getText: () => no.texto,
      getAttribute: (n, ns) => { const k = Object.keys(no.attrs).find(x => local(x) === n && (ns ? x.includes(':') : !x.includes(':'))); return k ? { getValue: () => no.attrs[k] } : null; },
      getChildren: n => no.filhos.filter(f => !n || local(f.nome) === n).map(el),
      getChild: n => { const f = no.filhos.find(x => local(x.nome) === n); return f ? el(f) : null; }
    };
  }
  return { getNamespace: uri => ({ uri }), parse: s => ({ getRootElement: () => el(parse(s)) }) };
}

/** "Blob" do XLSX: as partes do pacote já separadas (o Utilities.unzip do teste só as devolve). */
function blobDe(partes) {
  return { _partes: partes, copyBlob() { return this; }, setContentType() { return this; } };
}

/** XLSX de uma aba: DATA (formato 14) | HORA (formato próprio "[$-F400]h:mm:ss\ AM/PM", como no arquivo real) | ST-01 (C). */
function xlsxHoraArrastada() {
  const linhas = ['<row r="1"><c r="A1" t="inlineStr"><is><t>DATA</t></is></c><c r="B1" t="inlineStr"><is><t>HORA</t></is></c><c r="C1" t="inlineStr"><is><t>ST-01 (C)</t></is></c></row>'];
  const dia0 = 46317, h0 = 23 * 60 + 58; // 21/10/2026 23:58
  for (let k = 0; k < 6; k++) {
    const min = h0 + k, r = k + 2, dia = dia0 + Math.floor(min / 1440);
    linhas.push('<row r="' + r + '"><c r="A' + r + '" s="1"><v>' + dia + '</v></c><c r="B' + r + '" s="2"><v>' + (min / 1440) + '</v></c><c r="C' + r + '"><v>' + (4 + k / 10) + '</v></c></row>');
  }
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  return blobDe({
    'xl/workbook.xml': ('<workbook ' + ns + '><sheets><sheet name="ENSAIO 24H" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': ('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/styles.xml': ('<styleSheet ' + ns + '><numFmts count="1"><numFmt numFmtId="165" formatCode="[$-F400]h:mm:ss\\ AM/PM"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="165"/></cellXfs></styleSheet>'),
    'xl/worksheets/sheet1.xml': ('<worksheet ' + ns + '><sheetData>' + linhas.join('') + '</sheetData></worksheet>')
  });
}

function preparar(env) {
  env.ctx.XmlService = xmlService();
  env.ctx.Utilities.unzip = b => Object.entries(b._partes).map(([n, t]) => ({ getName: () => n, getDataAsString: () => t }));
}

test('Cadeia de frio: hora que passou de 24:00 vira a hora do dia, sem erro de data', () => {
  const env = C.criarAmbiente(); preparar(env);
  const m = env.fn('CadeiaFrioRel_lerXlsxOriginal_')(xlsxHoraArrastada());
  assert.deepEqual(m.slice(1).map(r => r[1]), ['23:58:00', '23:59:00', '00:00:00', '00:01:00', '00:02:00', '00:03:00']);
  assert.notEqual(m[3][0], m[2][0], 'a data da coluna DATA vira na meia-noite');
  assert.equal(m[4][0], m[3][0]);
});

test('Estufa/Banho-maria: a mesma planilha é lida sem erro', () => {
  const env = E.criarAmbiente(); preparar(env);
  const m = env.fn('EstufaBanhoRel_lerXlsxOriginal_')(xlsxHoraArrastada());
  assert.deepEqual(m.slice(1).map(r => r[1]), ['23:58:00', '23:59:00', '00:00:00', '00:01:00', '00:02:00', '00:03:00']);
});

// Mesmo arquivo: as abas PORTA ABERTA e Queda de Energia são cópias de trechos da ENSAIO 24H (mesmos horários e leituras).
const dd = x => String(x).padStart(2, '0');
function abaMin(nome, inicio, n, temp) {
  const m = [['DATA', 'HORA', 'ST-01 (C)']];
  for (let k = 0; k < n; k++) {
    const d = new Date(inicio.getTime() + k * 60000);
    m.push([dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(), dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':00', String(temp(d))]);
  }
  return { nome, matrix: m, displayMatrix: m };
}
const T0 = new Date(2026, 9, 22, 14, 55, 0), PORTA = new Date(2026, 9, 23, 14, 30, 0), ENERGIA = new Date(2026, 9, 23, 15, 20, 0);
const temp = d => (4 + (d.getMinutes() % 7) / 10).toFixed(1);
function ambienteComAbas(abas) {
  const env = C.criarAmbiente();
  env.ctx.__ABAS_TESTE = abas;
  env.run('CadeiaFrioRel_lerDadosEntradaRich_ = function (p) { var a = __ABAS_TESTE.map(function (x) { var t = CadeiaFrioRel_prepararTabelaDatas_(x.matrix, x.displayMatrix); return { nome: x.nome, matrix: t.matrix, displayMatrix: t.displayMatrix }; });' +
    ' return { matrix: a[0].matrix, displayMatrix: a[0].displayMatrix, diagnostico: {}, abas: p.permitirVariasAbas && a.length > 1 ? a : null }; };');
  return env;
}
const payload = () => C.payload({
  modoEntrada: 'FILE_ID', fileId: 'arquivo-teste', nSensores: 1, dateStyle: 'AUTO',
  estudos: {
    distribuicao: { tipo: 'DISTRIBUICAO_VAZIO', inicio: '22/10/2026 14:55:00', fim: '23/10/2026 14:55:00' },
    aberturaPorta: { habilitado: true, tipoAbertura: 'TOTAL', inicioEvento: '23/10/2026 14:30:00', fimEvento: '23/10/2026 14:31:00' },
    quedaEnergia: { habilitado: true, inicioEvento: '23/10/2026 15:20:00', fimEvento: '' }
  }
});

test('aba que é cópia de um trecho da aba de 24 h é aceita e os estudos usam as mesmas leituras', () => {
  const env = ambienteComAbas([abaMin('ENSAIO 24H', T0, 1497, temp), abaMin('PORTA ABERTA', PORTA, 31, temp), abaMin('Queda de Energia', ENERGIA, 31, temp)]);
  const r = env.fn('CadeiaFrioRel_cfExecutarAnaliseCompleta_')(payload());
  assert.equal(r.dadosCompletos.length, 1497, 'sem leitura repetida');
  const porTipo = {};
  r.analises.forEach(a => { porTipo[a.tipoEstudo] = a; });
  assert.equal(porTipo.ABERTURA_PORTA.tempoInicioEvento, '23/10/2026 14:30:00');
  assert.equal(porTipo.QUEDA_ENERGIA.tempoInicioEvento, '23/10/2026 15:20:00');
});

test('aba no mesmo período com uma leitura diferente continua recusada', () => {
  const env = ambienteComAbas([abaMin('ENSAIO 24H', T0, 1497, temp), abaMin('PORTA ABERTA', PORTA, 31, d => (d.getMinutes() === 40 ? '9.9' : temp(d)))]);
  assert.throws(() => env.fn('CadeiaFrioRel_cfExecutarAnaliseCompleta_')(payload()), /"ENSAIO 24H".*"PORTA ABERTA".*mesmo período/);
});
