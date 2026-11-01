/****************************************************
 * COMERCIAL — CATÁLOGO OFICIAL DA DIRETORIA (26 SERVIÇOS), REGRA DE PONTOS, PARÂMETROS TÉCNICOS E ESCOPO PARA A EXECUÇÃO (01/11/2026)
 *
 * Decisão do dono (01/11/2026): cadastrar os 26 serviços com os preços dele como catálogo oficial ("tabela oficial da Diretoria",
 * com versão e vigência), a regra de preço por pontos das calibrações (REG-CAL-001), os parâmetros técnicos pré-preenchidos de
 * cada serviço e o simulador de orçamento DENTRO da montagem de proposta que já existe (não é tela solta).
 *
 * O que este arquivo reaproveita (não é um sistema paralelo):
 *  - COM_PRODUTOS: os 26 entram como itens comuns do catálogo (TIPO SERVICO), com colunas novas: CATALOGO_OFICIAL (marca da
 *    tabela), CATALOGO_VERSAO, VIGENCIA_DESDE, REGRA_PRECO e PARAMETROS_JSON (a definição: regra, pontos padrão, receitas,
 *    campos técnicos e pendências). A ficha de custo (horas, padrões, consumíveis) é a mesma da tabela C1 (SGO_Comercial_Ficha.js).
 *  - A proposta (SGO_Comercial_Propostas.js): ao salvar, o item que vem de um serviço oficial passa por ComCat_aplicarNoItem_, que
 *    calcula o preço pela regra e grava no item uma CÓPIA CONGELADA (item.catalogo): código, nome, categoria, versão da tabela,
 *    preço-base, regra, pontos, receitas, parâmetros, quantidade, unitário e subtotal. Mudar o catálogo depois nunca altera a
 *    proposta salva. Proposta antiga (sem item.catalogo) continua igual.
 *  - Desconto, alçada, sobra mínima de 35% (Diretoria abaixo dela), viagem e checklist: os de sempre (nada muda aqui).
 *  - Reajuste de preço do oficial: lote de COM_REAJUSTES (vigência hoje ou agendada; "Desfazer o último reajuste" vale também).
 *  - Passagem aos setores: a atividade da Área técnica e o chamado da Assistência levam o escopo técnico de cada item.
 *
 * REGRAS DE PREÇO (por serviço, na definição):
 *  - PONTOS (REG-CAL-001): unitário = base × max(mínimo, pontos) ÷ mínimo (mínimo 3); subtotal = unitário × equipamentos, em
 *    CENTAVOS INTEIROS com a fração exata: subtotal = arredonda(base_centavos × max(3, n) × qtd ÷ 3), meio para cima.
 *  - GRANDEZAS (termo-higrômetro): cada grandeza tem o próprio mínimo de 3 pontos incluído; ponto além de 3 numa grandeza custa a
 *    fração configurada do preço-base (padrão 1/3). Temperatura e umidade nunca se somam como pontos da mesma grandeza.
 *  - FIXO: preço por equipamento e escopo (NR-13, válvula de segurança, manômetro e válvula de autoclave).
 *  - RECEITA (qualificações): o pacote-base inclui N receitas, processos ou condições. Acima disso, a conta proporcional só vale
 *    depois que a Diretoria aprovar a unidade faturável (receita.aprovada); até lá o preço fica o do pacote-base e o item fica
 *    marcado como "escopo adicional": a proposta só conclui com o motivo do ajuste (e o preço ajustado à mão, se for o caso).
 *  Sensor, ponto, ciclo, receita e equipamento são coisas diferentes: sensor nunca vira ponto faturável e receita nunca vira
 *  quantidade de equipamentos.
 *
 * IMPLANTAÇÃO (Comercial_catalogoOficial20261101, script _tools/servidor/catalogo_oficial_20261101.ts):
 *  - etapa CATALOGO: cria os 26 (casando pelo código: rodar de novo cria 0) e desativa os serviços da tabela C1 que repetem um
 *    dos 26 (ATIVO = NAO, histórico com o motivo; nunca apaga: propostas antigas apontam para eles).
 *  - etapa DESCRICOES (pedido do dono, 01/11/2026: "o que estiver sem descritivo tem que criar"): serviço ou produto ativo sem
 *    descrição (vazia ou só repetindo o nome) recebe a descrição padronizada da família; só o campo vazio, com a marca
 *    DESCRICAO_GERADA ("revisar") e histórico.
 *  Sempre prévia (nada gravado) e marca; aplicar exige a marca da prévia.
 *
 * Quem faz o quê (servidor confere): gestão comercial edita descrição, pontos padrão, receitas e ativa/desativa; só Diretoria e
 * Administrador mudam preço-base, regra e a aprovação da unidade faturável. Vendedor não altera item oficial.
 * O núcleo do cálculo (ComCatN_*) é o mesmo texto no servidor e na tela (JS_Comercial.html); o teste confere que são iguais.
 ****************************************************/

var COM_CAT_MARCA = 'Tabela oficial da Diretoria';
var COM_CAT_VERSAO = 'DIRETORIA-2026-11-01';
var COM_CAT_REGRAS = { PONTOS: 'Por pontos (REG-CAL-001)', GRANDEZAS: 'Por pontos em cada grandeza', FIXO: 'Preço fixo por equipamento', RECEITA: 'Pacote-base por receita, processo ou condição' };
var COM_CAT_UNIDADES_FAT = { RECEITA: 'receita', PROCESSO: 'processo', CICLO: 'ciclo', ENSAIO: 'ensaio', CONDICAO: 'condição', PONTO: 'ponto' };
var COM_CAT_MOTIVO_DESATIVAR = 'substituído pelo catálogo oficial de 01/11/2026';
var COM_CAT_DESCR_MARCA = 'Descrição criada em 01/11/2026, revisar';

// ------------------------------------------------------------
// NÚCLEO DO CÁLCULO (o mesmo texto está em JS_Comercial.html; tests/comercial-catalogo-oficial.test.cjs confere)
// ------------------------------------------------------------
// NUCLEO-CATALOGO-INICIO
var COMCATN_BAR = { 'bar': 1, 'kgf/cm²': 0.980665, 'mmHg': 0.00133322387415 };
var COMCATN_GRANDEZA_UN = { TEMPERATURA: ['°C'], UMIDADE: ['%UR'], ROTACAO: ['RPM'], PRESSAO: ['bar', 'kgf/cm²', 'mmHg'] };
function ComCatN_num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var s = String(v === null || v === undefined ? '' : v).replace(/[−‒–]/g, '-').replace(/\s/g, '');
  if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}
function ComCatN_unidade(u) {
  var x = String(u || '').toLowerCase().replace(/\s/g, '');
  if (x === 'bar') return 'bar';
  if (/^kgf(\/cm(2|²)?)?$/.test(x)) return 'kgf/cm²';
  if (x === 'mmhg') return 'mmHg';
  if (x === '°c' || x === 'ºc' || x === 'c') return '°C';
  if (x === '%ur' || x === '%' || x === 'ur') return '%UR';
  if (x === 'rpm') return 'RPM';
  return '';
}
function ComCatN_fmt(v) {
  var neg = v < 0, a = Math.abs(v), int = Math.floor(a + 1e-9), dec = Math.round((a - int) * 1000);
  if (dec >= 1000) { int++; dec = 0; }
  var s = String(int);
  if (int >= 1000) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var d = dec ? ',' + String(1000 + dec).slice(1).replace(/0+$/, '') : '';
  return (neg ? '-' : '') + s + d;
}
/** Um ponto escrito na tela ("2", "-10", "-500 mmHg", "1,5 bar", "ambiente"). null quando vazio; { ok: false, erro } quando não serve. */
function ComCatN_ponto(s, grandeza, unidadePadrao) {
  var t = String(s === null || s === undefined ? '' : s).trim();
  if (!t) return null;
  if (/^(ambiente|amb\.?|t\s*amb(iente)?|ur\s*amb(iente)?)$/i.test(t)) {
    if (grandeza !== 'TEMPERATURA' && grandeza !== 'UMIDADE') return { ok: false, erro: 'o ponto "' + t + '" (ambiente) só vale para temperatura ou umidade' };
    return { ok: true, texto: 'ambiente', valor: null, unidade: '', chave: 'AMB' };
  }
  var m = /^([-−‒–]?[\d.,]+)\s*(.*)$/.exec(t);
  var v = m ? ComCatN_num(m[1]) : NaN;
  if (!m || !isFinite(v)) return { ok: false, erro: '"' + t + '" não é um ponto: escreva o número e, se quiser, a unidade (por exemplo 2, -10 ou -500 mmHg)' };
  var aceitas = COMCATN_GRANDEZA_UN[grandeza] || [];
  var u = m[2] ? ComCatN_unidade(m[2]) : '';
  if (m[2] && !u) return { ok: false, erro: 'a unidade "' + m[2] + '" do ponto ' + t + ' não é conhecida (use ' + aceitas.join(', ') + ')' };
  if (!u) u = grandeza === 'PRESSAO' ? (unidadePadrao || 'bar') : aceitas[0];
  if (aceitas.indexOf(u) < 0) return { ok: false, erro: 'o ponto ' + t + ' está em ' + u + ', que não serve para esta grandeza (use ' + aceitas.join(', ') + ')' };
  var p = { ok: true, valor: v, unidade: u, texto: ComCatN_fmt(v) + (u === '%UR' ? '% UR' : ' ' + u) };
  if (grandeza === 'PRESSAO') {
    if (u === 'mmHg' && v > 0) return { ok: false, erro: 'o ponto ' + t + ' está em mmHg, unidade usada só para pressão negativa (vácuo): escreva com o sinal, por exemplo -500 mmHg, ou use bar ou kgf/cm² para pressão positiva' };
    p.emBar = v * COMCATN_BAR[u];
    p.chave = 'P' + Math.round(p.emBar * 1000000);
  } else p.chave = u + Math.round(v * 1000000);
  return p;
}
/** Meio para cima com inteiros (num e den positivos). */
function ComCatN_metade(num, den) { return Math.floor((2 * num + den) / (2 * den)); }
function ComCatN_vazio(v) { return v === null || v === undefined || (Array.isArray(v) ? !v.length : String(v).trim() === ''); }
/**
 * Preço e conferência de um item do catálogo oficial. def: a definição do serviço; sel: o que o comercial escolheu (variante,
 * unidade, pontos, grandezas, processos, parametros); qtd: equipamentos; baseC: preço-base em centavos.
 * { regra, erros[], avisos[], pendencias[], pontos[], grandezas[], processos[], n, cobrados, escopoAdicional, adicionais[],
 *   fatorNum, fatorDen, unitarioCentavos, subtotalCentavos }
 */
function ComCatN_calcular(def, sel, qtd, baseC) {
  def = def || {}; sel = sel || {};
  var r = { regra: def.regra || 'FIXO', erros: [], avisos: [], pendencias: [], pontos: [], grandezas: [], processos: [], n: 0, cobrados: null, escopoAdicional: false, adicionais: [], fatorNum: 1, fatorDen: 1 };
  var q = Number(qtd);
  if (!(q >= 1) || Math.floor(q) !== q) { r.erros.push('a quantidade de equipamentos precisa ser um número inteiro (1, 2, 3...)'); q = 1; }
  var par = sel.parametros || {};
  var vari = null;
  (def.variantes || []).forEach(function (v) { if (v.codigo === sel.variante) vari = v; });
  if (vari && vari.pendente) r.pendencias.push(vari.pendente);
  if (r.regra === 'PONTOS') {
    var m = Number(def.minimo) || 3, gr = def.grandeza || 'TEMPERATURA', un = '';
    if (gr === 'PRESSAO') {
      un = ComCatN_unidade(sel.unidade) || def.unidadePadrao || 'bar';
      if ((def.unidades || ['bar', 'kgf/cm²']).indexOf(un) < 0) r.erros.push('a unidade ' + un + ' não serve para este instrumento (use ' + (def.unidades || ['bar', 'kgf/cm²']).join(' ou ') + ')');
    }
    var fMin = ComCatN_num(par.faixaMin), fMax = ComCatN_num(par.faixaMax), conv = gr === 'PRESSAO' ? (COMCATN_BAR[un] || 1) : 1;
    var temFaixa = isFinite(fMin) && isFinite(fMax);
    if (temFaixa && fMin >= fMax) { r.erros.push('a faixa nominal do instrumento está invertida (mínimo ' + ComCatN_fmt(fMin) + ', máximo ' + ComCatN_fmt(fMax) + ')'); temFaixa = false; }
    var vistos = {};
    (sel.pontos || []).forEach(function (s) {
      var p = ComCatN_ponto(s, gr, un);
      if (!p) return;
      if (!p.ok) { r.erros.push(p.erro); return; }
      if (vistos[p.chave]) { r.avisos.push('o ponto ' + p.texto + ' apareceu mais de uma vez e conta uma vez só'); return; }
      if (def.sinal === 'NEGATIVO' && p.valor > 0) { r.erros.push('o ponto ' + p.texto + ' é pressão positiva, e este instrumento mede pressão negativa (vácuo): escreva o ponto com o sinal, por exemplo -400 mmHg'); return; }
      if (def.sinal === 'POSITIVO' && p.valor < 0) { r.erros.push('o ponto ' + p.texto + ' é pressão negativa, e o manômetro mede pressão positiva: para pressão negativa use o manovacuômetro ou o vacuômetro'); return; }
      if (temFaixa && p.valor !== null) {
        var vv = gr === 'PRESSAO' ? p.emBar : p.valor, lo = fMin * conv, hi = fMax * conv;
        if (vv < lo - 1e-9 || vv > hi + 1e-9) { r.erros.push('o ponto ' + p.texto + ' fica fora da faixa nominal do instrumento (' + ComCatN_fmt(fMin) + ' a ' + ComCatN_fmt(fMax) + (un ? ' ' + un : '') + '): ponto fora da faixa não é calibrado. Corrija o ponto ou a faixa'); return; }
      }
      vistos[p.chave] = 1; r.pontos.push(p);
    });
    r.n = r.pontos.length; r.cobrados = Math.max(m, r.n); r.fatorNum = r.cobrados; r.fatorDen = m;
    if (r.n < m) r.avisos.push((r.n ? r.n + (r.n === 1 ? ' ponto informado' : ' pontos informados') : 'nenhum ponto informado') + ': o preço é o do mínimo de ' + m + ' pontos por equipamento');
  } else if (r.regra === 'GRANDEZAS') {
    var mg = Number(def.minimo) || 3, ex = def.extra || { num: 1, den: 3 }, E = 0;
    (def.grandezas || []).forEach(function (g) {
      var lista = sel.grandezas && sel.grandezas[g.codigo] ? sel.grandezas[g.codigo] : (g.pontos || []), vis = {}, pts = [];
      lista.forEach(function (s) {
        var p = ComCatN_ponto(s, g.codigo, '');
        if (!p) return;
        if (!p.ok) { r.erros.push(g.nome + ': ' + p.erro); return; }
        if (vis[p.chave]) return;
        vis[p.chave] = 1; pts.push(p);
      });
      var extra = Math.max(0, pts.length - mg);
      E += extra;
      r.grandezas.push({ codigo: g.codigo, nome: g.nome, pontos: pts, n: pts.length, extra: extra });
      r.n += pts.length;
    });
    r.extras = E; r.cobrados = null;
    r.fatorNum = Number(ex.den) + E * Number(ex.num); r.fatorDen = Number(ex.den);
  } else if (r.regra === 'RECEITA') {
    var rc = def.receita || {}, inc = Number(vari && vari.incluidas) || Number(rc.incluidas) || 1;
    (sel.processos || []).forEach(function (p) { if (p && p.selecionado !== false && String(p.nome || '').trim()) r.processos.push(p); });
    r.n = r.processos.length; r.incluidas = inc;
    r.processos.forEach(function (p) { if (p.pendente) r.pendencias.push(p.nome + ': ' + p.pendente); });
    if (!r.n) r.pendencias.push('escolha ' + (def.receitaRotulo || 'a receita ou o processo') + ' do item');
    if (r.n > inc) {
      if (rc.aprovada) { r.fatorNum = r.n; r.fatorDen = inc; }
      else { r.escopoAdicional = true; r.adicionais.push(r.n + ' ' + (def.receitaRotulo || 'receitas') + ' (o pacote-base inclui ' + inc + ')'); }
    }
  }
  if (r.regra !== 'PONTOS' && def.pontosInformativos) {
    var visI = {};
    (sel.pontos || []).forEach(function (s) { var p = ComCatN_ponto(s, def.grandeza || 'PRESSAO', ComCatN_unidade(sel.unidade) || def.unidadePadrao || 'bar'); if (p && p.ok && !visI[p.chave]) { visI[p.chave] = 1; r.pontos.push(p); } else if (p && !p.ok) r.erros.push(p.erro); });
  }
  (def.campos || []).forEach(function (c) {
    var v = par[c.codigo];
    if (c.pendenteSeVazio && ComCatN_vazio(v)) r.pendencias.push(c.pendenteSeVazio);
    var vs = Array.isArray(v) ? v : (ComCatN_vazio(v) ? [] : [v]);
    (c.adicionais || []).forEach(function (a) { if (vs.indexOf(a) >= 0) { r.escopoAdicional = true; r.adicionais.push(c.nome + ': ' + a); } });
    if (c.tipo === 'numero' && !ComCatN_vazio(v) && !isFinite(ComCatN_num(v))) r.erros.push(c.nome + ' precisa ser um número (veio "' + String(v).slice(0, 20) + '")');
  });
  if (def.validarAjuste) {
    var pm = ComCatN_num(par.pmta), aj = ComCatN_num(par.pressaoAjuste);
    if (isFinite(pm) && isFinite(aj) && aj > pm + 1e-9) r.erros.push('a pressão de ajuste da válvula (' + ComCatN_fmt(aj) + ') ficou acima da PMTA do vaso (' + ComCatN_fmt(pm) + '): a válvula de segurança abre no máximo na PMTA. Confira os dados do vaso (prontuário) com a área técnica');
  }
  if (def.pendente) r.pendencias.push(def.pendente);
  var b = Math.max(0, Math.round(Number(baseC) || 0));
  r.unitarioCentavos = ComCatN_metade(b * r.fatorNum, r.fatorDen);
  r.subtotalCentavos = ComCatN_metade(b * r.fatorNum * q, r.fatorDen);
  return r;
}
// NUCLEO-CATALOGO-FIM

// ------------------------------------------------------------
// DEFINIÇÕES DOS 26 SERVIÇOS (o padrão do código; a gestão edita o que fica gravado em PARAMETROS_JSON)
// ------------------------------------------------------------
function ComCat_campo_(codigo, nome, o) { var c = { codigo: codigo, nome: nome, tipo: 'texto' }; Object.keys(o || {}).forEach(function (k) { c[k] = o[k]; }); return c; }
function ComCat_camposTermicos_(o) {
  o = o || {};
  return [
    ComCat_campo_('faixa', 'Faixa de operação do equipamento', { doc: true, padrao: o.faixa || '' }),
    ComCat_campo_('setpoint', 'Setpoint', { doc: true, padrao: o.setpoint || '' }),
    ComCat_campo_('limites', 'Limites mínimo e máximo aceitos'),
    ComCat_campo_('sensores', 'Quantidade de sensores (não é ponto faturável)', { tipo: 'numero' }),
    ComCat_campo_('localizacao', 'Localização dos sensores'),
    ComCat_campo_('tempo', 'Tempo de monitoramento', { doc: true }),
    ComCat_campo_('carga', 'Condição de carga', { tipo: 'opcao', opcoes: ['Sem carga', 'Com carga', 'Com e sem carga'], padrao: o.carga || 'Sem carga', adicionais: ['Com e sem carga'], doc: true,
      ajuda: 'O preço-base não inclui o ensaio com e sem carga: escolher "com e sem carga" é escopo adicional.' }),
    ComCat_campo_('ensaios', 'Ensaios contratados além do pacote-base', { tipo: 'multi', opcoes: ['Recuperação após abertura de porta', 'Falta de energia'], adicionais: ['Recuperação após abertura de porta', 'Falta de energia'], doc: true,
      ajuda: 'Só quando contratados: são escopo adicional.' }),
    ComCat_campo_('criterios', 'Critérios de aceitação'),
    ComCat_campo_('relatorio', 'Relatório', { padrao: 'Relatório técnico com os resultados e a análise' })
  ];
}
function ComCat_camposNr13_(o) {
  o = o || {};
  return [
    ComCat_campo_('identificacao', 'Identificação do vaso (TAG ou número)', { doc: true }),
    ComCat_campo_('fabricante', 'Fabricante do equipamento'), ComCat_campo_('modelo', 'Modelo'), ComCat_campo_('serie', 'Número de série'),
    ComCat_campo_('ano', 'Ano de fabricação'), ComCat_campo_('capacidade', 'Capacidade (volume)', { doc: true, padrao: o.capacidade || '' }),
    ComCat_campo_('unidadePressao', 'Unidade de pressão do vaso', { tipo: 'opcao', opcoes: ['bar', 'kgf/cm²'], padrao: 'kgf/cm²' }),
    ComCat_campo_('pmta', 'PMTA (pressão máxima de trabalho admissível)', { tipo: 'numero', doc: true }),
    ComCat_campo_('pressaoOperacional', 'Pressão de operação', { tipo: 'numero' }),
    ComCat_campo_('categoria', 'Categoria NR-13', { pendenteSeVazio: 'categoria NR-13 a confirmar pelo profissional habilitado (não presumir o enquadramento)' }),
    ComCat_campo_('pressaoAjuste', 'Pressão de ajuste da válvula de segurança', { tipo: 'numero', doc: true }),
    ComCat_campo_('tipoInspecao', 'Tipo de inspeção', { tipo: 'opcao', opcoes: ['Inicial', 'Periódica', 'Extraordinária'], padrao: 'Periódica', doc: true }),
    ComCat_campo_('documentacao', 'Documentação disponível', { tipo: 'opcao', opcoes: ['Prontuário completo', 'Prontuário incompleto', 'Sem prontuário'], padrao: '' , pendenteSeVazio: 'documentação do vaso (prontuário) a confirmar com o cliente' }),
    ComCat_campo_('ensaiosContratados', 'Ensaios contratados', { doc: true, padrao: o.ensaios || '' }),
    ComCat_campo_('testeHidrostatico', 'Teste hidrostático', { tipo: 'opcao', opcoes: ['Não incluído', 'Quando tecnicamente aplicável, avaliado na inspeção'], padrao: o.hidro || 'Não incluído', doc: true,
      adicionais: o.hidroAdicional === false ? [] : ['Quando tecnicamente aplicável, avaliado na inspeção'], ajuda: 'Nunca automático: depende da avaliação técnica na inspeção.' }),
    ComCat_campo_('profissional', 'Profissional habilitado'),
    ComCat_campo_('art', 'ART', { tipo: 'opcao', opcoes: ['Não incluída', 'Incluída'], padrao: o.art || 'Não incluída', doc: true, adicionais: o.art === 'Incluída' ? [] : ['Incluída'] }),
    ComCat_campo_('relatorio', 'Relatório', { padrao: 'Relatório de inspeção de segurança' })
  ];
}
function ComCat_camposValvula_() {
  return [
    ComCat_campo_('identificacaoValvula', 'Identificação da válvula (TAG ou número)', { doc: true }),
    ComCat_campo_('vaso', 'Vaso protegido (identificação)'),
    ComCat_campo_('unidadePressao', 'Unidade de pressão', { tipo: 'opcao', opcoes: ['bar', 'kgf/cm²'], padrao: 'kgf/cm²' }),
    ComCat_campo_('pmta', 'PMTA do vaso', { tipo: 'numero', doc: true }),
    ComCat_campo_('pressaoAjuste', 'Pressão de ajuste (conforme os dados do vaso)', { tipo: 'numero', doc: true, pendenteSeVazio: 'pressão de ajuste a definir com os dados do vaso (PMTA e prontuário): não é um valor fixo' }),
    ComCat_campo_('documentacao', 'Documentação do vaso', { tipo: 'opcao', opcoes: ['Prontuário completo', 'Prontuário incompleto', 'Sem prontuário'], padrao: '' })
  ];
}
function ComCat_proc_(codigo, nome, o) { var p = { codigo: codigo, nome: nome, padrao: true, temperatura: '', tempo: '', pressao: '', carga: '', sensores: '', ciclos: '', ensaios: '' }; Object.keys(o || {}).forEach(function (k) { p[k] = o[k]; }); return p; }
function ComCat_condicoes_(lista, pendente, unidade) {
  return lista.map(function (x, j) { return ComCat_proc_('C' + (j + 1), x + (unidade ? ' ' + unidade : ''), { temperatura: unidade === '°C' ? x + ' °C' : '', pendente: pendente || '' }); });
}

/** Os 26 serviços (preço-base exato do dono, 01/11/2026). ficha: horas e custos para a sobra (da C1 equivalente ou estimativa). */
function ComCat_definicoes_() {
  var TERM = 'Termômetro', PEND = 'sugestão pendente de aprovação técnica';
  var desc = {
    'CAL-001': 'Serviço de calibração da indicação de temperatura, contemplando os pontos contratados e emissão de certificado.',
    'CAL-002': 'Serviço de calibração de termômetro de penetração, nos pontos definidos, com emissão de certificado.',
    'CAL-003': 'Calibração das indicações de temperatura e umidade relativa, conforme pontos e condições contratados.',
    'CAL-004': 'Calibração da indicação de pressão, conforme faixa, unidade e pontos contratados.',
    'CAL-005': 'Calibração das indicações de pressão positiva e negativa, conforme pontos contratados.',
    'CAL-006': 'Calibração da indicação de pressão negativa, conforme pontos contratados.',
    'CAL-007': 'Calibração de sensor ou malha de medição de temperatura, conforme pontos contratados.',
    'CAL-008': 'Calibração da indicação de temperatura por infravermelho, conforme pontos e condições contratados.',
    'CAL-009': 'Verificação e ajuste da pressão de abertura conforme dados técnicos do vaso, com registro dos resultados.',
    'CAL-010': 'Calibração do manômetro e verificação da válvula de segurança conforme parâmetros contratados.',
    'CAL-011': 'Calibração dos parâmetros de rotação contratados, com emissão de certificado.',
    'QUA-001': 'Qualificação de desempenho de autoclave a vapor, contemplando os processos contratados, monitoramento dos parâmetros físicos e emissão de relatório técnico.',
    'QUA-002': 'Qualificação de desempenho, incluindo avaliação dos parâmetros térmicos dos ciclos contratados.',
    'QUA-003': 'Calibração e validação de funcionamento conforme condições e parâmetros especificados.',
    'QUA-004': 'Qualificação do processo de limpeza, incluindo ensaios de desempenho previstos no protocolo.',
    'QUA-005': 'Qualificação de desempenho dos ciclos de esterilização contratados.',
    'QUA-006': 'Qualificação térmica, incluindo avaliação de estabilidade e distribuição de temperatura.',
    'QUA-007': 'Qualificação térmica na faixa operacional contratada, incluindo monitoramento e análise dos resultados.',
    'QUA-008': 'Qualificação térmica, incluindo avaliação de estabilidade, uniformidade e distribuição de temperatura.',
    'QUA-009': 'Qualificação térmica e avaliação do controle de temperatura.',
    'QUA-010': 'Avaliação funcional e de desempenho conforme protocolo contratado.',
    'NR13-001': 'Inspeção de segurança NR-13 do vaso de pressão do compressor de ar, conforme o enquadramento do equipamento, com as verificações técnicas previstas e emissão de relatório.',
    'NR13-002': 'Inspeção de segurança NR-13 de autoclave de até 75 litros, conforme o enquadramento do equipamento, com as verificações técnicas previstas e emissão de relatório.',
    'NR13-003': 'Inspeção de segurança NR-13 de autoclave com os ensaios contratados, documentação técnica, teste hidrostático quando tecnicamente aplicável, calibração de válvulas conforme o escopo e emissão de ART.',
    'QUA-011': 'Qualificação de instalação, operação e desempenho, conforme etapas aplicáveis, com ensaios compatíveis com o processo e o fabricante.',
    'QUA-012': 'Qualificação de instalação, operação e desempenho de esterilizador VBTF, conforme etapas aplicáveis, incluindo parâmetros físicos e avaliação microbiológica prevista no protocolo.'
  };
  var etapas = ComCat_campo_('etapas', 'Etapas (conforme aplicabilidade)', { tipo: 'multi', opcoes: ['IQ (instalação)', 'OQ (operação)', 'PQ (desempenho)'], padrao: ['IQ (instalação)', 'OQ (operação)', 'PQ (desempenho)'], doc: true });
  var L = [
    { codigo: 'CAL-001', nome: 'Calibração de termômetro digital', categoria: 'Calibração', preco: 75.50, regra: 'PONTOS', grandeza: 'TEMPERATURA', minimo: 3,
      variantes: [{ codigo: 'SENSOR_INTERNO', nome: 'Com sensor interno', pontos: ['ambiente'] }, { codigo: 'SONDA_EXTERNA', nome: 'Com sonda externa', pontos: ['-10', '2', '8'] }], variantePadrao: 'SONDA_EXTERNA', c1: 'CAL_TERMOMETRO' },
    { codigo: 'CAL-002', nome: 'Calibração de termômetro tipo espeto', categoria: 'Calibração', preco: 75.00, regra: 'PONTOS', grandeza: 'TEMPERATURA', minimo: 3, pontos: ['10', '30', '50'], c1: 'CAL_TERMOMETRO' },
    { codigo: 'CAL-003', nome: 'Calibração de termo-higrômetro', categoria: 'Calibração', preco: 107.42, regra: 'GRANDEZAS', minimo: 3, extra: { num: 1, den: 3 },
      grandezas: [{ codigo: 'TEMPERATURA', nome: 'Temperatura', pontos: ['ambiente'] }, { codigo: 'UMIDADE', nome: 'Umidade relativa', pontos: ['ambiente'] }], c1: 'CAL_TERMOHIGROMETRO' },
    { codigo: 'CAL-004', nome: 'Calibração de manômetro', categoria: 'Calibração', preco: 150.00, regra: 'PONTOS', grandeza: 'PRESSAO', unidades: ['bar', 'kgf/cm²'], unidadePadrao: 'bar', sinal: 'POSITIVO', minimo: 3, pontos: ['1', '2', '3'], faixa: true, c1: 'CAL_MANOMETRO' },
    { codigo: 'CAL-005', nome: 'Calibração de manovacuômetro', categoria: 'Calibração', preco: 180.12, regra: 'PONTOS', grandeza: 'PRESSAO', unidades: ['bar', 'kgf/cm²', 'mmHg'], unidadePadrao: 'bar', minimo: 3, pontos: ['-500 mmHg', '1', '2', '3'], faixa: true, c1: 'CAL_MANOMETRO' },
    { codigo: 'CAL-006', nome: 'Calibração de vacuômetro', categoria: 'Calibração', preco: 150.09, regra: 'PONTOS', grandeza: 'PRESSAO', unidades: ['mmHg', 'bar', 'kgf/cm²'], unidadePadrao: 'mmHg', sinal: 'NEGATIVO', minimo: 3, pontos: [], sugestao: ['-200 mmHg', '-400 mmHg', '-600 mmHg'], faixa: true,
      pendente: 'pontos do vacuômetro pendentes de definição (sugestão -200, -400 e -600 mmHg, pendente de validação técnica)', c1: 'CAL_MANOMETRO' },
    { codigo: 'CAL-007', nome: 'Calibração de sensor de temperatura', categoria: 'Calibração', preco: 171.01, regra: 'PONTOS', grandeza: 'TEMPERATURA', minimo: 3,
      variantes: [{ codigo: 'REFRIGERACAO', nome: 'Refrigeração', pontos: ['-10', '2', '8'] }, { codigo: 'OUTRA', nome: 'Outra aplicação (definir os pontos)', pontos: [] }], variantePadrao: 'REFRIGERACAO', c1: 'CAL_DATALOGGER', estimativa: 'horas do registrador de temperatura da C1' },
    { codigo: 'CAL-008', nome: 'Calibração de pirômetro infravermelho', categoria: 'Calibração', preco: 95.00, regra: 'PONTOS', grandeza: 'TEMPERATURA', minimo: 3, pontos: ['10', '30', '50'], c1: 'CAL_TERMOMETRO', estimativa: 'mesmas horas da calibração de termômetro da C1' },
    { codigo: 'CAL-009', nome: 'Verificação e ajuste de válvula de segurança', categoria: 'Calibração', preco: 480.07, regra: 'FIXO', validarAjuste: true, campos: ComCat_camposValvula_(), c1: 'CAL_VALVULA_SEG' },
    { codigo: 'CAL-010', nome: 'Calibração de manômetro e válvula de autoclave', categoria: 'Calibração', preco: 580.93, regra: 'FIXO', grandeza: 'PRESSAO', unidades: ['bar', 'kgf/cm²'], unidadePadrao: 'bar', pontosInformativos: true, pontos: ['1', '2', '3'], validarAjuste: true,
      campos: ComCat_camposValvula_(), ficha: { horasTecnico: 1.5, horasEngenheiro: 0.65, padroes: 35, consumiveis: 0 }, estimativa: 'soma das horas da calibração de manômetro e da válvula de segurança da C1' },
    { codigo: 'QUA-001', nome: 'Qualificação de autoclave hospitalar a vapor', categoria: 'Qualificação', preco: 4870.00, regra: 'RECEITA', receita: { unidadeFaturavel: 'PROCESSO', incluidas: 3, aprovada: false }, receitaRotulo: 'processos',
      processos: [ComCat_proc_('BD', 'Bowie-Dick', { tipo: 'ENSAIO', ensaios: 'Ensaio de remoção de ar e penetração de vapor (não é ponto de temperatura)', ciclos: 'Conforme o protocolo' }),
        ComCat_proc_('121', '121 °C', { temperatura: '121 °C', tempo: 'Conforme o ciclo do equipamento', pressao: 'Conforme o ciclo do equipamento', carga: 'Conforme o protocolo', ciclos: 'Repetições definidas no protocolo' }),
        ComCat_proc_('134', '134 °C', { temperatura: '134 °C', tempo: 'Conforme o ciclo do equipamento', pressao: 'Conforme o ciclo do equipamento', carga: 'Conforme o protocolo', ciclos: 'Repetições definidas no protocolo' })],
      variantes: [{ codigo: 'HOSPITALAR', nome: 'Autoclave hospitalar', processos: ['BD', '121', '134'], incluidas: 3 }, { codigo: 'VERTICAL_75L', nome: 'Autoclave vertical de 75 L', processos: ['121'], incluidas: 1, parametros: { volume: '75 L' } }], variantePadrao: 'HOSPITALAR',
      campos: [ComCat_campo_('volume', 'Volume da câmara', { doc: true }), ComCat_campo_('sensores', 'Quantidade de sensores (não é ponto faturável)', { tipo: 'numero' })],
      avisos: ['Um ciclo por processo não é a qualificação completa: o protocolo define as repetições.', 'A inspeção NR-13 não está incluída: é o serviço NR13-002 ou NR13-003, à parte.'], c1: 'QT_AUTOCLAVE_GRANDE',
      estimativa: 'horas da qualificação de autoclave acima de 100 L da C1 (o escopo da C1 inclui a calibração da instrumentação: o custo real tende a ser menor)' },
    { codigo: 'QUA-002', nome: 'Qualificação de termodesinfectora', categoria: 'Qualificação', preco: 4798.00, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 2, aprovada: false }, receitaRotulo: 'condições',
      processos: ComCat_condicoes_(['85', '90'], 'temperatura padrão: ' + PEND, '°C'), campos: ComCat_camposTermicos_(), c1: 'QT_LAVADORA_TD' },
    { codigo: 'QUA-003', nome: 'Calibração e validação de gabinete de secagem', categoria: 'Qualificação', preco: 1200.00, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 3, aprovada: false }, receitaRotulo: 'condições',
      processos: ComCat_condicoes_(['50', '60', '70'], 'temperatura padrão: ' + PEND, '°C'), campos: ComCat_camposTermicos_(), c1: 'QT_SECADORA' },
    { codigo: 'QUA-004', nome: 'Qualificação de lavadora ultrassônica', categoria: 'Qualificação', preco: 1865.46, regra: 'RECEITA', receita: { unidadeFaturavel: 'CICLO', incluidas: 1, aprovada: false }, receitaRotulo: 'ciclos',
      processos: [ComCat_proc_('LIMPEZA', 'Ciclo de limpeza conforme o protocolo', { tempo: 'Conforme o protocolo', temperatura: 'Conforme o protocolo' })],
      campos: [ComCat_campo_('ensaiosUs', 'Ensaios previstos no protocolo', { tipo: 'multi', opcoes: ['Cavitação', 'Desempenho de limpeza', 'Tempo', 'Temperatura'], padrao: ['Cavitação', 'Desempenho de limpeza', 'Tempo', 'Temperatura'], doc: true }),
        ComCat_campo_('volumeCuba', 'Volume da cuba'), ComCat_campo_('relatorio', 'Relatório', { padrao: 'Relatório técnico com os resultados e a análise' })], c1: 'QT_LAVADORA_US' },
    { codigo: 'QUA-005', nome: 'Qualificação de autoclave odontológica', categoria: 'Qualificação', preco: 3500.75, regra: 'RECEITA', receita: { unidadeFaturavel: 'RECEITA', incluidas: 1, aprovada: false }, receitaRotulo: 'receitas', escolhaObrigatoria: true,
      processos: [ComCat_proc_('121', '121 °C', { temperatura: '121 °C', padrao: false, ciclos: 'Repetições definidas no protocolo' }), ComCat_proc_('134', '134 °C', { temperatura: '134 °C', padrao: false, ciclos: 'Repetições definidas no protocolo' })],
      campos: [ComCat_campo_('volume', 'Volume da câmara', { doc: true }), ComCat_campo_('sensores', 'Quantidade de sensores (não é ponto faturável)', { tipo: 'numero' })],
      avisos: ['Uma receita (121 °C ou 134 °C) no pacote-base; outra receita é escopo adicional.', 'A inspeção NR-13 não está incluída.'], c1: 'QT_AUTOCLAVE_BANCADA' },
    { codigo: 'QUA-006', nome: 'Qualificação de câmara de conservação', categoria: 'Qualificação', preco: 1845.96, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 1, aprovada: false }, receitaRotulo: 'condições',
      processos: [ComCat_proc_('C1', '2 a 8 °C', { temperatura: '2 a 8 °C' })], campos: ComCat_camposTermicos_({ faixa: '2 a 8 °C' }), avisos: ['O preço-base não inclui 24 h com e sem carga, a menos que esteja no escopo.'], c1: 'QT_CAMARA_CONSERVADORA' },
    { codigo: 'QUA-007', nome: 'Qualificação de ultrafreezer', categoria: 'Qualificação', preco: 2976.00, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 1, aprovada: false }, receitaRotulo: 'condições',
      processos: [ComCat_proc_('C1', '-80 °C', { temperatura: '-80 °C' })], campos: ComCat_camposTermicos_({ setpoint: '-80 °C' }), avisos: ['O preço-base não inclui 24 h com e sem carga, a menos que esteja no escopo.'], c1: 'QT_ULTRAFREEZER' },
    { codigo: 'QUA-008', nome: 'Qualificação de estufa', categoria: 'Qualificação', preco: 845.77, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 3, aprovada: false }, receitaRotulo: 'condições',
      processos: ComCat_condicoes_(['50', '100', '150'], 'temperatura padrão: ' + PEND, '°C'), campos: ComCat_camposTermicos_(), c1: 'QT_ESTUFA' },
    { codigo: 'QUA-009', nome: 'Qualificação de banho-maria', categoria: 'Qualificação', preco: 590.86, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 3, aprovada: false }, receitaRotulo: 'condições',
      processos: ComCat_condicoes_(['30', '37', '50'], 'temperatura padrão: ' + PEND, '°C'), campos: ComCat_camposTermicos_(), c1: 'QT_ESTUFA' },
    { codigo: 'QUA-010', nome: 'Qualificação de centrífuga', categoria: 'Qualificação', preco: 200.67, regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 3, aprovada: false }, receitaRotulo: 'condições',
      processos: [ComCat_proc_('C1', '1.500 RPM'), ComCat_proc_('C3', '3.000 RPM'), ComCat_proc_('C2', '2.250 RPM', { padrao: false, pendente: 'terceira condição a definir (2.250 RPM é sugestão pendente de validação técnica)' })], campos: [ComCat_campo_('relatorio', 'Relatório', { padrao: 'Relatório técnico com os resultados e a análise' })],
      ficha: { horasTecnico: 1.5, horasEngenheiro: 0.5, padroes: 20, consumiveis: 0 }, estimativa: 'o dobro das horas da calibração de centrífuga da C1' },
    { codigo: 'NR13-001', nome: 'Inspeção NR-13 de compressor de ar', categoria: 'NR-13', preco: 850.00, regra: 'FIXO', validarAjuste: true, campos: ComCat_camposNr13_({}),
      avisos: ['Enquadramento NR-13 efetivo do equipamento: não presumir.'], ficha: { horasTecnico: 3, horasEngenheiro: 2, padroes: 20, consumiveis: 0 }, estimativa: 'sem serviço equivalente na C1' },
    { codigo: 'NR13-002', nome: 'Inspeção NR-13 de autoclave pequena até 75 litros', categoria: 'NR-13', preco: 735.00, regra: 'FIXO', validarAjuste: true, campos: ComCat_camposNr13_({ capacidade: 'Até 75 L' }),
      avisos: ['Enquadramento NR-13 efetivo do equipamento: não presumir.'], ficha: { horasTecnico: 2.5, horasEngenheiro: 1.5, padroes: 20, consumiveis: 0 }, estimativa: 'sem serviço equivalente na C1' },
    { codigo: 'NR13-003', nome: 'Inspeção NR-13 de autoclave com ensaios e ART', categoria: 'NR-13', preco: 2933.33, regra: 'FIXO', validarAjuste: true,
      campos: ComCat_camposNr13_({ art: 'Incluída', hidro: 'Quando tecnicamente aplicável, avaliado na inspeção', hidroAdicional: false, ensaios: 'Conforme o escopo contratado' }),
      avisos: ['Teste hidrostático só quando tecnicamente aplicável (nunca automático).', 'Enquadramento NR-13 efetivo do equipamento: não presumir.'], ficha: { horasTecnico: 8, horasEngenheiro: 6, padroes: 60, consumiveis: 150 }, estimativa: 'sem serviço equivalente na C1 (inclui ART e ensaios)' },
    { codigo: 'QUA-011', nome: 'Qualificação de esterilizador por peróxido de hidrogênio (H₂O₂)', categoria: 'Qualificação', preco: 4865.88, regra: 'RECEITA', receita: { unidadeFaturavel: 'CICLO', incluidas: 1, aprovada: false }, receitaRotulo: 'ciclos',
      processos: [ComCat_proc_('CICLO', 'Ciclo padrão do equipamento', { temperatura: 'Conforme o fabricante', tempo: 'Conforme o fabricante', pressao: 'Pressão e vácuo conforme o fabricante', ciclos: 'Repetições definidas no protocolo' })],
      campos: [etapas, ComCat_campo_('fabricante', 'Fabricante do equipamento'), ComCat_campo_('modelo', 'Modelo'), ComCat_campo_('serie', 'Número de série'), ComCat_campo_('tecnologia', 'Tecnologia do equipamento'),
        ComCat_campo_('temperatura', 'Temperatura do ciclo', { tipo: 'opcao', opcoes: ['Conforme o fabricante', '55 °C (somente se compatível com o equipamento e o ciclo do fabricante)', '60 °C (somente se compatível com o equipamento e o ciclo do fabricante)'], padrao: 'Conforme o fabricante' }),
        ComCat_campo_('tempo', 'Tempo'), ComCat_campo_('pressaoVacuo', 'Pressão ou vácuo'), ComCat_campo_('indicadoresQuimicos', 'Indicadores químicos'), ComCat_campo_('indicadoresBiologicos', 'Indicadores biológicos'),
        ComCat_campo_('ciclos', 'Ciclos previstos'), ComCat_campo_('carga', 'Carga'), ComCat_campo_('requisitosFabricante', 'Requisitos do fabricante')],
      avisos: ['55 °C ou 60 °C só como opção condicionada à compatibilidade com o equipamento e o ciclo do fabricante: nunca obrigatória.'], c1: 'QT_AUTOCLAVE_BT' },
    { codigo: 'QUA-012', nome: 'Qualificação de esterilizador por formaldeído (VBTF)', categoria: 'Qualificação', preco: 5450.00, regra: 'RECEITA', receita: { unidadeFaturavel: 'RECEITA', incluidas: 1, aprovada: false }, receitaRotulo: 'receitas',
      processos: [ComCat_proc_('RECEITA', 'Receita do equipamento', { temperatura: '55 °C ou 60 °C conforme o ciclo validado do fabricante', ciclos: 'Repetições definidas no protocolo' })],
      campos: [etapas, ComCat_campo_('fabricante', 'Fabricante do equipamento'), ComCat_campo_('modelo', 'Modelo'),
        ComCat_campo_('temperatura', 'Temperatura da receita', { tipo: 'opcao', opcoes: ['55 °C (conforme o ciclo validado do fabricante)', '60 °C (conforme o ciclo validado do fabricante)'], padrao: '', pendenteSeVazio: 'temperatura da receita (55 °C ou 60 °C) a confirmar conforme o ciclo validado do fabricante', doc: true }),
        ComCat_campo_('vapor', 'Vapor'), ComCat_campo_('tempo', 'Tempo'), ComCat_campo_('pressao', 'Pressão'), ComCat_campo_('agente', 'Agente esterilizante'), ComCat_campo_('microbiologico', 'Desempenho microbiológico', { padrao: 'Conforme o protocolo' }),
        ComCat_campo_('ciclos', 'Ciclos previstos'), ComCat_campo_('carga', 'Carga'), ComCat_campo_('indicadores', 'Indicadores')], c1: 'QT_AUTOCLAVE_BT' }
  ];
  L.forEach(function (s) {
    s.descricao = desc[s.codigo];
    if (s.faixa) { s.campos = (s.campos || []).concat([ComCat_campo_('faixaMin', 'Faixa nominal do instrumento: mínimo', { tipo: 'numero', ajuda: 'Na unidade escolhida. Com a faixa informada, ponto fora dela é recusado.' }), ComCat_campo_('faixaMax', 'Faixa nominal do instrumento: máximo', { tipo: 'numero', doc: false })]); }
  });
  // CAL-011 (centrífuga, calibração): terceiro ponto sugerido
  L.splice(13, 0, { codigo: 'CAL-011', nome: 'Calibração de centrífuga', categoria: 'Calibração', preco: 194.23, regra: 'PONTOS', grandeza: 'ROTACAO', minimo: 3, pontos: ['1.500', '3.000'], sugestao: ['2.250'],
    pendente: 'terceiro ponto a definir (2.250 RPM é sugestão pendente de validação técnica)', descricao: 'Calibração dos parâmetros de rotação contratados, com emissão de certificado.', c1: 'CAL_CENTRIFUGA' });
  return L;
}
/** C1 que o catálogo oficial substitui (decisão do dono, 01/11/2026). CAL_DATALOGGER fica ativo (registrador não é só o sensor). */
var COM_CAT_SUBSTITUI = {
  CAL_TERMOMETRO: ['CAL-001', 'CAL-002'], CAL_TERMOHIGROMETRO: ['CAL-003'], CAL_MANOMETRO: ['CAL-004', 'CAL-005', 'CAL-006'], CAL_VALVULA_SEG: ['CAL-009'], CAL_CENTRIFUGA: ['CAL-011'],
  QT_AUTOCLAVE_GRANDE: ['QUA-001'], QT_LAVADORA_TD: ['QUA-002'], QT_SECADORA: ['QUA-003'], QT_LAVADORA_US: ['QUA-004'], QT_AUTOCLAVE_BANCADA: ['QUA-005'],
  QT_CAMARA_CONSERVADORA: ['QUA-006'], QT_ULTRAFREEZER: ['QUA-007'], QT_ESTUFA: ['QUA-008', 'QUA-009'], QT_AUTOCLAVE_BT: ['QUA-011', 'QUA-012']
};

/**
 * Serviços da C1 que continuam ativos e recebem parâmetros técnicos padrão (sem entrar na tabela oficial): o preço é o do item
 * (PRECO) e o reajuste segue o de sempre. Decisão do dono (01/11/2026): o freezer não tem código entre os 26 e fica com 0 °C e -10 °C.
 */
function ComCat_extras_() {
  return [{ c1: 'QT_FREEZER', regra: 'RECEITA', receita: { unidadeFaturavel: 'CONDICAO', incluidas: 2, aprovada: false }, receitaRotulo: 'condições',
    processos: [ComCat_proc_('C1', '0 °C', { temperatura: '0 °C' }), ComCat_proc_('C2', '-10 °C', { temperatura: '-10 °C' })], campos: ComCat_camposTermicos_(),
    avisos: ['O preço-base não inclui 24 h com e sem carga, a menos que esteja no escopo.'] }];
}
/** Item com regra de preço e parâmetros técnicos: os 26 oficiais e os extras da C1 que receberam a definição. */
function ComCat_temRegra_(p) { return ComCat_ehOficial_(p) || (!!p && !!COM_CAT_REGRAS[Com_up_(p.REGRA_PRECO)] && Com_s_(p.PARAMETROS_JSON) !== ''); }
/** Definição do código (padrão) pelo código do serviço; null se não for um dos 26. */
function ComCat_defCodigo_(codigo) { var c = Com_up_(codigo); return ComCat_definicoes_().filter(function (s) { return s.codigo === c; })[0] || null; }
/** Ficha de custo do serviço: a explícita ou a da C1 equivalente. { horasTecnico, horasEngenheiro, padroes, consumiveis, fonte, estimativa } */
function ComCat_ficha_(s) {
  var f = s.ficha ? Com_copia_(s.ficha) : null, c1 = s.c1 && typeof ComF_tabelaC1_ === 'function' ? ComF_tabelaC1_(s.c1) : null;
  if (!f && c1) f = { horasTecnico: c1.horasTecnico, horasEngenheiro: c1.horasEngenheiro, padroes: c1.padroes, consumiveis: c1.consumiveis };
  if (!f) f = { horasTecnico: 0, horasEngenheiro: 0, padroes: 0, consumiveis: 0 };
  f.fonte = s.ficha ? 'estimativa' : (c1 ? 'C1:' + s.c1 : 'sem ficha');
  f.estimativa = s.estimativa || '';
  f.c1 = c1;
  return f;
}
/** Definição gravada no item do catálogo (sem a descrição, que fica em DESCRICAO), sem o que é só da implantação. */
function ComCat_defParaGravar_(s) { var d = Com_copia_(s); delete d.descricao; delete d.ficha; delete d.estimativa; delete d.preco; delete d.nome; delete d.categoria; return d; }

function ComCat_ehOficial_(p) { return !!p && Com_s_(p.CATALOGO_OFICIAL) !== ''; }
function ComCat_def_(p) {
  var d = Com_json_(p && p.PARAMETROS_JSON, null);
  if (!d || typeof d !== 'object') { var c = ComCat_defCodigo_(p && p.CODIGO); d = c ? ComCat_defParaGravar_(c) : { regra: 'FIXO' }; }
  d.regra = COM_CAT_REGRAS[Com_up_(d.regra)] ? Com_up_(d.regra) : (COM_CAT_REGRAS[Com_up_(p && p.REGRA_PRECO)] ? Com_up_(p.REGRA_PRECO) : 'FIXO');
  return d;
}
function ComCat_podeMudarPreco_(eu) { return !!(eu && (eu.diretoria || eu.perfil === 'ADMIN')); }

/** Escolha padrão do serviço (o que vem pré-preenchido no item). */
function ComCat_padrao_(def) {
  var sel = { variante: '', unidade: def.unidadePadrao || '', pontos: [], grandezas: {}, processos: [], parametros: {}, motivoAjuste: '' };
  var vari = null;
  if ((def.variantes || []).length) { vari = def.variantes.filter(function (v) { return v.codigo === def.variantePadrao; })[0] || def.variantes[0]; sel.variante = vari.codigo; }
  sel.pontos = (vari && vari.pontos ? vari.pontos : def.pontos || []).slice();
  (def.grandezas || []).forEach(function (g) { sel.grandezas[g.codigo] = (g.pontos || []).slice(); });
  sel.processos = (def.processos || []).map(function (p) { var c = Com_copia_(p); c.selecionado = vari && vari.processos ? vari.processos.indexOf(p.codigo) >= 0 : p.padrao !== false; return c; });
  (def.campos || []).forEach(function (c) { if (c.padrao !== undefined && c.padrao !== '') sel.parametros[c.codigo] = Com_copia_(c.padrao); });
  if (vari && vari.parametros) Object.keys(vari.parametros).forEach(function (k) { sel.parametros[k] = vari.parametros[k]; });
  return sel;
}

/** Confere e limpa a escolha que veio da tela (tamanhos, campos conhecidos). Sem escolha: o padrão. */
function ComCat_normalizarSel_(def, s) {
  if (!s || typeof s !== 'object') return ComCat_padrao_(def);
  var t = function (v, n) { return Com_texto_(v, n || 120); };
  var sel = { variante: '', unidade: t(s.unidade, 12), pontos: [], grandezas: {}, processos: [], parametros: {}, motivoAjuste: t(s.motivoAjuste, 500) };
  if ((def.variantes || []).some(function (v) { return v.codigo === Com_s_(s.variante); })) sel.variante = Com_s_(s.variante);
  else if ((def.variantes || []).length) sel.variante = (def.variantes.filter(function (v) { return v.codigo === def.variantePadrao; })[0] || def.variantes[0]).codigo;
  var lista = function (l) { return (Array.isArray(l) ? l : Com_s_(l).split(/[;\n]/)).map(function (x) { return t(x, 30); }).filter(Boolean).slice(0, 30); };
  sel.pontos = lista(s.pontos);
  (def.grandezas || []).forEach(function (g) { sel.grandezas[g.codigo] = s.grandezas && s.grandezas[g.codigo] !== undefined ? lista(s.grandezas[g.codigo]) : (g.pontos || []).slice(); });
  var chaves = ['temperatura', 'tempo', 'pressao', 'carga', 'sensores', 'ciclos', 'ensaios'];
  sel.processos = (Array.isArray(s.processos) ? s.processos : []).slice(0, 12).map(function (p) {
    var o = { codigo: t(p && p.codigo, 20), nome: t(p && p.nome, 80), tipo: t(p && p.tipo, 20), selecionado: !(p && (p.selecionado === false || p.selecionado === 'false')), pendente: '' };
    chaves.forEach(function (k) { o[k] = t(p && p[k], 160); });
    var orig = (def.processos || []).filter(function (x) { return x.codigo === o.codigo; })[0];
    if (orig && orig.pendente && Com_normBusca_(orig.nome) === Com_normBusca_(o.nome)) o.pendente = orig.pendente;
    return o;
  }).filter(function (p) { return p.nome; });
  if (!Array.isArray(s.processos) && (def.processos || []).length) sel.processos = ComCat_padrao_(def).processos;
  // campo que não veio recebe o padrão (e o da variante); campo que veio vazio fica vazio (o comercial limpou de propósito)
  var par = s.parametros && typeof s.parametros === 'object' ? s.parametros : {}, pad = ComCat_padrao_(Object.assign({}, def, { variantePadrao: sel.variante || def.variantePadrao })).parametros;
  (def.campos || []).forEach(function (c) {
    var v = Object.prototype.hasOwnProperty.call(par, c.codigo) ? par[c.codigo] : pad[c.codigo];
    if (v === undefined || v === null) return;
    if (c.tipo === 'multi') { var l = (Array.isArray(v) ? v : [v]).map(Com_s_).filter(function (x) { return (c.opcoes || []).indexOf(x) >= 0; }); sel.parametros[c.codigo] = l; return; }
    var x = t(v, 300);
    if (c.tipo === 'opcao' && x && (c.opcoes || []).indexOf(x) < 0) throw new Error('Não foi possível salvar a proposta: "' + x.slice(0, 60) + '" não é uma opção de ' + c.nome + ' (use ' + (c.opcoes || []).join(', ') + ')');
    sel.parametros[c.codigo] = x;
  });
  return sel;
}

// ------------------------------------------------------------
// TEXTOS: descrição que vai para a proposta e escopo técnico para a execução
// ------------------------------------------------------------
function ComCat_juntar_(l) { return l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }
function ComCat_nomeVariante_(def, sel) { var v = (def.variantes || []).filter(function (x) { return x.codigo === sel.variante; })[0]; return v ? v.nome : ''; }
/** Descrição comercial do item: o texto padrão do serviço + os parâmetros escolhidos (sem prometer o que não está no escopo). */
function ComCat_descricao_(base, def, sel, r) {
  var partes = [Com_s_(base)], vn = ComCat_nomeVariante_(def, sel);
  if (r.regra === 'PONTOS') {
    partes.push(r.pontos.length ? 'Pontos contratados: ' + ComCat_juntar_(r.pontos.map(function (p) { return p.texto; })) + (vn ? ' (' + vn.toLowerCase() + ')' : '') + '.' : 'Pontos a definir' + (vn ? ' (' + vn.toLowerCase() + ')' : '') + '.');
  } else if (r.regra === 'GRANDEZAS') {
    partes.push(r.grandezas.map(function (g) { return g.nome + ': ' + (g.pontos.length ? ComCat_juntar_(g.pontos.map(function (p) { return p.texto; })) : 'a definir'); }).join('; ') + '.');
  } else if (r.regra === 'RECEITA') {
    if (vn) partes.push(vn + '.');
    if (r.processos.length) partes.push(Com_s_(def.receitaRotulo || 'processos').replace(/^./, function (c) { return c.toUpperCase(); }) + ' contratados: ' + ComCat_juntar_(r.processos.map(function (p) { return p.nome + (p.tipo === 'ENSAIO' && p.ensaios ? ' (' + p.ensaios.replace(/\s*\(.*\)$/, '').toLowerCase() + ')' : ''); })) + '.');
  } else if (r.pontos.length) partes.push('Pontos do manômetro: ' + ComCat_juntar_(r.pontos.map(function (p) { return p.texto; })) + '.');
  var par = sel.parametros || {}, docs = [];
  (def.campos || []).forEach(function (c) {
    var v = par[c.codigo];
    if (!c.doc || ComCatN_vazio(v)) return;
    if (c.codigo === 'testeHidrostatico' && v === 'Não incluído') return;
    if (c.codigo === 'art' && v === 'Não incluída') return;
    if (c.codigo === 'carga' && v === 'Sem carga' && r.regra === 'RECEITA') return;
    var unidade = (c.codigo === 'pmta' || c.codigo === 'pressaoAjuste') && par.unidadePressao ? ' ' + par.unidadePressao : '';
    docs.push(c.nome + ': ' + (Array.isArray(v) ? ComCat_juntar_(v) : v) + unidade);
  });
  if (docs.length) partes.push(docs.join('; ') + '.');
  if (def.grandeza === 'PRESSAO' && sel.unidade && r.regra === 'PONTOS') partes.push('Unidade: ' + (ComCatN_unidade(sel.unidade) || sel.unidade) + '.');
  return Com_texto_(partes.filter(Boolean).join(' '), 800);
}
/** Escopo técnico de um item da proposta para a execução (sem valores). '' quando o item não é do catálogo oficial. */
function ComCat_escopoTexto_(i) {
  var c = i && i.catalogo;
  if (!c || !c.def) return '';
  var def = c.def, sel = c.sel || {}, r = ComCatN_calcular(def, sel, Number(i.quantidade) || 1, 0), l = [];
  var vn = ComCat_nomeVariante_(def, sel);
  if (vn) l.push('variante: ' + vn);
  if (r.pontos.length) l.push((r.regra === 'PONTOS' ? 'pontos' : 'pontos do manômetro') + ': ' + r.pontos.map(function (p) { return p.texto; }).join('; '));
  r.grandezas.forEach(function (g) { l.push(g.nome.toLowerCase() + ': ' + (g.pontos.map(function (p) { return p.texto; }).join('; ') || 'a definir')); });
  r.processos.forEach(function (p) { l.push((def.receitaRotulo ? def.receitaRotulo.replace(/s$/, '') : 'processo') + ' ' + p.nome + ['temperatura', 'tempo', 'pressao', 'carga', 'sensores', 'ciclos', 'ensaios'].map(function (k) { return p[k] ? ' · ' + k + ' ' + p[k] : ''; }).join('')); });
  (def.campos || []).forEach(function (cp) { var v = (sel.parametros || {})[cp.codigo]; if (!ComCatN_vazio(v)) l.push(cp.nome.toLowerCase() + ': ' + (Array.isArray(v) ? v.join(', ') : v)); });
  if (c.escopoAdicional) l.push('ESCOPO ADICIONAL ao pacote-base' + (c.motivoAjuste ? ' (' + c.motivoAjuste + ')' : ''));
  if ((c.pendencias || []).length) l.push('pendente de aprovação técnica: ' + c.pendencias.join('; '));
  (def.avisos || []).forEach(function (a) { l.push(a); });
  return 'versão da tabela ' + Com_s_(c.versaoTabela) + '; ' + l.join('; ');
}

// ------------------------------------------------------------
// ITEM DA PROPOSTA (chamado por ComP_itensDaTela_)
// ------------------------------------------------------------
/**
 * Item de um serviço oficial: preço pela regra (centavos exatos), descrição gerada e a cópia congelada. ant: o mesmo item na
 * gravação anterior desta proposta (a cópia congelada dele vale: preço-base, versão e definição da época). Lança com o que fazer.
 */
function ComCat_aplicarNoItem_(item, i, p, ant, k, pol, pz) {
  var antCat = ant && ant.catalogo && ant.catalogo.def ? ant.catalogo : null;
  var def = antCat ? antCat.def : ComCat_def_(p);
  var base = antCat ? Number(antCat.precoBase) || 0 : Number(p.PRECO) || 0;
  var selTela = i && i.catalogo && i.catalogo.sel ? i.catalogo.sel : (antCat ? antCat.sel : null);
  var sel = ComCat_normalizarSel_(def, selTela);
  var r = ComCatN_calcular(def, sel, item.quantidade, Math.round(base * 100));
  if (r.erros.length) throw new Error('Não foi possível salvar a proposta: no item ' + (k + 1) + ' (' + Com_s_(p.CODIGO) + ', ' + Com_s_(p.NOME) + '), ' + r.erros.join('; ') + '. Corrija os parâmetros técnicos do item e salve de novo');
  var exato = r.subtotalCentavos / 100 / item.quantidade;
  var fat = pol ? ComPr_fatorFaixa_(pol, item.faixa || (pz && pz.faixa), pz && pz.licitacao) : 1;
  item.precoTabelaNormal = exato;
  item.precoTabela = fat === 1 ? exato : ComPr_arredondarTabela_(exato * fat);
  // primeira vez do serviço na proposta sem os parâmetros da tela (Orçamentista, item escolhido por outra tela): vale o preço de tabela
  var primeira = !antCat && !(i && i.catalogo && i.catalogo.sel), pu = Com_num_(i && i.precoUnitario);
  item.precoUnitario = primeira || Com_s_(i && i.precoUnitario) === '' || !(pu >= 0) || Math.abs(pu - item.precoTabela) < 0.006 ? item.precoTabela : Com_r2_(pu);
  item.precoDiferente = Math.abs(item.precoUnitario - item.precoTabela) > 0.004;
  item.detalhe = ComCat_descricao_(antCat ? antCat.descricaoBase : (Com_s_(p.DESCRICAO) || ComCat_defCodigo_(p.CODIGO) && ComCat_defCodigo_(p.CODIGO).descricao || ''), def, sel, r);
  item.catalogo = { codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), categoria: Com_s_(p.CATEGORIA), versaoTabela: antCat ? antCat.versaoTabela : (ComCat_ehOficial_(p) ? Com_s_(p.CATALOGO_VERSAO) || COM_CAT_VERSAO : 'catálogo (parâmetros padrão, fora da tabela oficial)'), oficial: antCat ? antCat.oficial !== false : ComCat_ehOficial_(p),
    vigencia: antCat ? antCat.vigencia : Com_dia_(p.VIGENCIA_DESDE), precoBase: base, regra: def.regra, regraNome: COM_CAT_REGRAS[def.regra], descricaoBase: antCat ? antCat.descricaoBase : Com_s_(p.DESCRICAO),
    def: def, sel: sel, n: r.n, pontosCobrados: r.cobrados, extras: r.extras === undefined ? null : r.extras, unitarioCentavos: r.unitarioCentavos, subtotalCentavos: r.subtotalCentavos,
    pendencias: r.pendencias, avisos: r.avisos, escopoAdicional: r.escopoAdicional, adicionais: r.adicionais, motivoAjuste: sel.motivoAjuste, congeladoEm: antCat ? antCat.congeladoEm : Com_agora_() };
  return item;
}

/** O que impede concluir a proposta por causa dos itens oficiais (escopo adicional sem motivo, receita não escolhida). */
function ComCat_errosConcluir_(itens) {
  var l = [];
  (itens || []).forEach(function (i, k) {
    var c = i && i.catalogo;
    if (!c || !c.def) return;
    var nome = 'item ' + (k + 1) + ' (' + c.codigo + ')';
    if (c.escopoAdicional && Com_s_(c.motivoAjuste).length < 10) l.push(nome + ' tem escopo além do pacote-base (' + (c.adicionais || []).join('; ') + '): a regra dessa cobrança ainda não foi aprovada pela Diretoria, então ajuste o preço do item à mão se for o caso e escreva o motivo do ajuste nos parâmetros técnicos (pelo menos 10 letras)');
    if (c.def.escolhaObrigatoria && !(c.sel && (c.sel.processos || []).some(function (p) { return p.selecionado !== false; }))) l.push(nome + ': escolha a receita (' + (c.def.processos || []).map(function (p) { return p.nome; }).join(' ou ') + ') nos parâmetros técnicos');
  });
  return l;
}

// ------------------------------------------------------------
// TELA DO CATÁLOGO OFICIAL (gestão) E SOBRA DOS 26
// ------------------------------------------------------------
/** Parte do item do catálogo para a tela (todos os níveis veem a definição; não leva custo). */
function ComCat_paraTela_(p) {
  if (!ComCat_temRegra_(p)) return null;
  var def = ComCat_def_(p);
  return { oficial: ComCat_ehOficial_(p), marca: Com_s_(p.CATALOGO_OFICIAL), versao: Com_s_(p.CATALOGO_VERSAO), vigencia: Com_brDia_(p.VIGENCIA_DESDE), regra: def.regra, regraNome: COM_CAT_REGRAS[def.regra], def: def, padrao: ComCat_padrao_(def) };
}

/** Sobra de cada serviço oficial pela ficha (custo da C1 equivalente), com os impostos de serviço de Goiânia e a comissão. */
function ComCat_sobra_(eu) {
  if (!eu.gestao) Com_exigir_(eu, 'GESTAO', 'ver a sobra do catálogo oficial');
  var pol = ComPr_polUnidade_(ComPr_politica_(), 'GO'), produtos = {};
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { if (ComCat_ehOficial_(p)) produtos[Com_up_(p.CODIGO)] = p; });
  var imp = Number(pol.impostosServicoPct) || 0, com = Number(pol.comissaoPct) || 0, mn = Number(pol.margemMinPct) || 0;
  var linhas = ComCat_definicoes_().map(function (s) {
    var p = produtos[s.codigo], f = ComCat_ficha_(s), fonte = f.fonte, est = f.estimativa;
    if (p && typeof ComF_temFicha_ === 'function' && ComF_temFicha_(p) && Com_s_(p.FICHA_EM) && Com_s_(p.FICHA_POR_NOME) && !/implanta[çc][ãa]o/i.test(Com_s_(p.FICHA_POR_NOME))) { f = ComF_fichaDe_(p); fonte = 'ficha salva pela gestão'; est = ''; }
    var c = ComF_calcular_({ horasTecnico: f.horasTecnico, horasEngenheiro: f.horasEngenheiro, padroes: f.padroes, consumiveis: f.consumiveis }, pol);
    var preco = p ? Number(p.PRECO) || 0 : s.preco, impV = Com_r2_(preco * imp / 100), comV = Com_r2_(preco * com / 100), sobra = Com_r2_(preco - impV - comV - c.custo);
    var pct = preco > 0 ? Math.round(sobra / preco * 10000) / 100 : null;
    return { codigo: s.codigo, nome: s.nome, preco: preco, precoTxt: Com_moeda_(preco), custo: c.custo, custoTxt: Com_moeda_(c.custo), impostos: impV, impostosTxt: Com_moeda_(impV), comissao: comV, comissaoTxt: Com_moeda_(comV),
      sobra: sobra, sobraTxt: Com_moeda_(sobra), sobraPct: pct, sobraPctTxt: pct === null ? '—' : Com_pct_(pct, 1), abaixoMin: pct !== null && pct < mn - 1e-9, fonte: fonte, estimativa: est,
      horasTxt: ComPr_qtd_(c.horasTecnico) + ' h técnico + ' + ComPr_qtd_(c.horasEngenheiro) + ' h engenheiro', implantado: !!p };
  });
  return { linhas: linhas, impostosPct: imp, comissaoPct: com, margemMinPct: mn, bonusHora: ComPr_bonusHora_(pol).porHora, custoHora: pol.custoHora, custoFixoPct: pol.custoFixoPct, unidade: pol.unidadeNome,
    abaixo: linhas.filter(function (l) { return l.abaixoMin; }).length };
}

/** Tela "Catálogo oficial" (gestão): os 26 com regra, versão, vigência e, para a gestão, a sobra. */
function ComCat_tela_(eu) {
  Com_exigir_(eu, 'GESTAO', 'abrir o catálogo oficial');
  var produtos = {};
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { if (ComCat_ehOficial_(p)) produtos[Com_up_(p.CODIGO)] = p; });
  var sobra = ComCat_sobra_(eu), porCod = {};
  sobra.linhas.forEach(function (l) { porCod[l.codigo] = l; });
  var itens = ComCat_definicoes_().map(function (s) {
    var p = produtos[s.codigo], def = p ? ComCat_def_(p) : ComCat_defParaGravar_(s);
    return { codigo: s.codigo, nome: p ? Com_s_(p.NOME) : s.nome, id: p ? Com_s_(p.ID) : '', implantado: !!p, ativo: p ? Com_up_(p.ATIVO || 'SIM') !== 'NAO' : false, preco: p ? Number(p.PRECO) || 0 : s.preco,
      precoTxt: Com_moeda_(p ? p.PRECO : s.preco), precoTabelaDono: s.preco, descricao: p ? Com_s_(p.DESCRICAO) : s.descricao, versao: p ? Com_s_(p.CATALOGO_VERSAO) : COM_CAT_VERSAO, vigencia: p ? Com_brDia_(p.VIGENCIA_DESDE) : '',
      regra: def.regra, regraNome: COM_CAT_REGRAS[def.regra], def: def, sobra: porCod[s.codigo] };
  });
  return { itens: itens, sobra: sobra, implantados: itens.filter(function (x) { return x.implantado; }).length, podeMudarPreco: ComCat_podeMudarPreco_(eu), regras: COM_CAT_REGRAS, unidadesFaturaveis: COM_CAT_UNIDADES_FAT, marca: COM_CAT_MARCA };
}

/**
 * Gestão altera um serviço oficial. d: { id, descricao, pontos, processos (nomes, um por linha), ativo, motivo,
 *   preco, vigencia, regra, receita: { unidadeFaturavel, incluidas, aprovada } } — preço, regra e receita só Diretoria/Administrador.
 * Preço-base: lote de reajuste de um item (COM_REAJUSTES), hoje ou agendado; a versão da tabela do item passa a DIRETORIA-<data>.
 */
function ComCat_salvar_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'alterar o catálogo oficial');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o motivo da mudança (pelo menos 10 letras). Ele fica no histórico do serviço com o seu nome');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.id));
    if (!p || !ComCat_ehOficial_(p)) throw new Error('Não foi possível salvar: o serviço não é da tabela oficial (ou não existe mais). Atualize a tela');
    var def = ComCat_def_(p), campos = {}, mudou = [], agora = Com_agora_(), hoje = Com_hoje_();
    var precoNovo = d.preco === undefined || d.preco === null || Com_s_(d.preco) === '' ? null : Com_num_(d.preco);
    var mexePreco = precoNovo !== null && Math.abs(precoNovo - (Number(p.PRECO) || 0)) > 0.004;
    var regraNova = Com_up_(d.regra), mexeRegra = !!regraNova && regraNova !== def.regra;
    var rcNova = d.receita && typeof d.receita === 'object' ? d.receita : null, rcAtual = def.receita || {};
    var mexeReceita = !!rcNova && (Com_up_(rcNova.unidadeFaturavel || rcAtual.unidadeFaturavel) !== Com_up_(rcAtual.unidadeFaturavel) || (Number(rcNova.incluidas) || rcAtual.incluidas) !== rcAtual.incluidas || !!rcNova.aprovada !== !!rcAtual.aprovada);
    if ((mexePreco || mexeRegra || mexeReceita) && !ComCat_podeMudarPreco_(eu)) throw new Error('Não foi possível salvar: ' + (mexePreco ? 'o preço-base' : mexeRegra ? 'a regra de preço' : 'a unidade faturável das receitas') + ' da tabela oficial só a Diretoria ou o Administrador mudam. Você pode mudar a descrição, os pontos padrão, as receitas padrão e ativar ou desativar; nada foi gravado');
    if (d.descricao !== undefined && Com_texto_(d.descricao, 2000) !== Com_s_(p.DESCRICAO)) {
      if (Com_texto_(d.descricao, 2000).length < 20) throw new Error('Não foi possível salvar: a descrição comercial ficou curta demais (menos de 20 letras). Escreva o que o serviço entrega');
      campos.DESCRICAO = Com_texto_(d.descricao, 2000); campos.DESCRICAO_GERADA = ''; mudou.push('descrição');
    }
    var defNova = Com_copia_(def);
    if (d.pontos !== undefined && def.regra === 'PONTOS' && !(def.variantes || []).length) {
      var pts = (Array.isArray(d.pontos) ? d.pontos : Com_s_(d.pontos).split(/[;\n]/)).map(function (x) { return Com_texto_(x, 30); }).filter(Boolean).slice(0, 30);
      var chk = ComCatN_calcular(Object.assign({}, def, { faixa: false }), { pontos: pts, unidade: def.unidadePadrao }, 1, 100);
      if (chk.erros.length) throw new Error('Não foi possível salvar os pontos padrão: ' + chk.erros.join('; '));
      if (JSON.stringify(pts) !== JSON.stringify(def.pontos || [])) { defNova.pontos = pts; mudou.push('pontos padrão'); }
    }
    if (d.processos !== undefined && (def.processos || []).length) {
      var nomes = (Array.isArray(d.processos) ? d.processos : Com_s_(d.processos).split(/\n/)).map(function (x) { return Com_texto_(x, 80); }).filter(Boolean).slice(0, 12);
      if (!nomes.length) throw new Error('Não foi possível salvar: deixe pelo menos uma receita, processo ou condição padrão');
      if (JSON.stringify(nomes) !== JSON.stringify(def.processos.map(function (x) { return x.nome; }))) {
        defNova.processos = nomes.map(function (n, j) { var antes = def.processos.filter(function (x) { return Com_normBusca_(x.nome) === Com_normBusca_(n); })[0]; return antes ? antes : ComCat_proc_('P' + (j + 1), n, {}); });
        (defNova.variantes || []).forEach(function (v) { if (v.processos) v.processos = v.processos.filter(function (c) { return defNova.processos.some(function (x) { return x.codigo === c; }); }); });
        mudou.push('receitas padrão');
      }
    }
    if (mexeRegra) { if (!COM_CAT_REGRAS[regraNova]) throw new Error('Não foi possível salvar: a regra "' + regraNova + '" não existe. Escolha ' + Object.keys(COM_CAT_REGRAS).map(function (k) { return COM_CAT_REGRAS[k]; }).join(', ')); defNova.regra = regraNova; campos.REGRA_PRECO = regraNova; mudou.push('regra (' + COM_CAT_REGRAS[def.regra] + ' → ' + COM_CAT_REGRAS[regraNova] + ')'); }
    if (mexeReceita) {
      var uf = Com_up_(rcNova.unidadeFaturavel || rcAtual.unidadeFaturavel);
      if (!COM_CAT_UNIDADES_FAT[uf]) throw new Error('Não foi possível salvar: escolha a unidade faturável (receita, processo, ciclo, ensaio, condição ou ponto)');
      var inc = Math.floor(Number(rcNova.incluidas) || rcAtual.incluidas || 1);
      if (!(inc >= 1 && inc <= 20)) throw new Error('Não foi possível salvar: o número de unidades incluídas no pacote-base fica entre 1 e 20');
      defNova.receita = { unidadeFaturavel: uf, incluidas: inc, aprovada: !!rcNova.aprovada, aprovadaPor: rcNova.aprovada ? eu.nome : '', aprovadaEm: rcNova.aprovada ? agora : '' };
      mudou.push('unidade faturável (' + COM_CAT_UNIDADES_FAT[uf] + ', ' + inc + ' no pacote-base, ' + (rcNova.aprovada ? 'cobrança proporcional aprovada' : 'sem aprovação: escopo adicional pede ajuste com motivo') + ')');
    }
    if (JSON.stringify(defNova) !== JSON.stringify(def)) campos.PARAMETROS_JSON = JSON.stringify(defNova);
    var ativo = d.ativo === undefined ? null : !(d.ativo === false || Com_up_(d.ativo) === 'NAO');
    if (ativo !== null && ativo !== (Com_up_(p.ATIVO || 'SIM') !== 'NAO')) { campos.ATIVO = ativo ? 'SIM' : 'NAO'; mudou.push(ativo ? 'reativado' : 'desativado'); }
    var reaj = null;
    if (mexePreco) {
      if (!(precoNovo > 0)) throw new Error('Não foi possível salvar: o preço-base precisa ser maior que zero (por exemplo 75,50)');
      var vig = Com_dia_(d.vigencia) || hoje;
      if (vig < hoje) throw new Error('Não foi possível salvar: a vigência do preço (' + Com_brDia_(vig) + ') não pode ser no passado. Use hoje para valer agora ou uma data futura para agendar');
      var antes = Com_r2_(Number(p.PRECO) || 0), novo = Com_r2_(precoNovo), agendar = vig > hoje, lote = Com_proximoNumero_('RJ', COM_ABAS.REAJUSTES, 'LOTE');
      SGO_DATA.insert(COM_ABAS.REAJUSTES, { LOTE: lote, PRODUTO_ID: p.ID, CODIGO: Com_s_(p.CODIGO), NOME: Com_s_(p.NOME), PRECO_ANTERIOR: antes, PRECO_NOVO: novo, PRECO_DESDE_ANTERIOR: Com_s_(p.PRECO_DESDE),
        PERCENTUAL: antes > 0 ? Math.round((novo / antes - 1) * 1000000) / 10000 : 0, ARREDONDAR_PARA: 0.01, INDICE: COM_CAT_MARCA, VIGENCIA: vig, MOTIVO: motivo, SITUACAO: agendar ? 'AGENDADO' : 'APLICADO',
        USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: agora, APLICADO_EM: agendar ? '' : agora });
      if (!agendar) { campos.PRECO = novo; campos.PRECO_DESDE = vig; campos.VIGENCIA_DESDE = vig; campos.CATALOGO_VERSAO = ComCat_proximaVersao_(p, vig); }
      reaj = { lote: lote, agendar: agendar, vig: vig, antes: antes, novo: novo };
      mudou.push('preço-base ' + Com_moeda_(antes) + ' → ' + Com_moeda_(novo) + (agendar ? ' a partir de ' + Com_brDia_(vig) : ''));
    }
    if (!mudou.length) return { message: 'Nada mudou no serviço ' + Com_s_(p.CODIGO) + '.' };
    campos.ATUALIZADO_POR_NOME = eu.nome; campos.ATUALIZADO_EM = agora;
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, campos);
    Com_historico_('PRODUTO', p.ID, reaj ? 'PRECO_OFICIAL' : 'EDICAO', eu, { de: reaj ? Com_moeda_(reaj.antes) : '', para: reaj ? Com_moeda_(reaj.novo) : '', texto: COM_CAT_MARCA + ', ' + Com_s_(p.CODIGO) + ': ' + mudou.join('; ') + '. Motivo: ' + motivo + (reaj ? ' (lote ' + reaj.lote + ')' : '') });
    return { message: 'Serviço ' + Com_s_(p.CODIGO) + ' salvo: ' + mudou.join('; ') + '.' + (reaj ? (reaj.agendar ? ' O preço novo vale a partir de ' + Com_brDia_(reaj.vig) + ' (a rotina aplica no dia).' : ' As propostas já salvas guardam o preço da época; as novas usam o preço novo.') : '') };
  });
}
function ComCat_proximaVersao_(p, dia) {
  var base = 'DIRETORIA-' + dia, atual = Com_s_(p.CATALOGO_VERSAO);
  if (atual.indexOf(base) !== 0) return base;
  var m = /-(\d+)$/.exec(atual.slice(base.length));
  return base + '-' + ((m ? Number(m[1]) : 1) + 1);
}

// ------------------------------------------------------------
// IMPLANTAÇÃO: CATÁLOGO (cria os 26, desativa os C1 repetidos)
// ------------------------------------------------------------
function ComCat_exigirImplantar_(eu, acao) { if (!ComCat_podeMudarPreco_(eu)) throw new Error('Não foi possível ' + acao + ': implantar o catálogo oficial é da Diretoria (ou do Administrador). Peça à Diretoria'); }
/** Código C1 do item do catálogo ('' se não veio da C1): pela chave da importação ou pelo código que a importação dá. */
function ComCat_c1Do_(p) {
  var t = Com_up_(p.TABELA_CODIGO).replace(/^C1:/, '');
  if (t) return t;
  var c = Com_up_(p.CODIGO).replace(/-C1$/, '').replace(/-/g, '_');
  return COM_CAT_SUBSTITUI[c] || ComCat_extras_().some(function (x) { return x.c1 === c; }) ? c : '';
}
function ComCat_previaCatalogo_(eu) {
  ComCat_exigirImplantar_(eu, 'ver a prévia do catálogo oficial');
  var produtos = Com_ler_(COM_ABAS.PRODUTOS), porCod = {}, criar = [], existem = [], conflitos = [], desativar = [];
  produtos.forEach(function (p) { porCod[Com_up_(p.CODIGO)] = p; });
  ComCat_definicoes_().forEach(function (s) {
    var p = porCod[s.codigo];
    if (!p) { criar.push({ codigo: s.codigo, nome: s.nome, precoTxt: Com_moeda_(s.preco), regraNome: COM_CAT_REGRAS[s.regra] }); return; }
    if (ComCat_ehOficial_(p)) { existem.push({ codigo: s.codigo, nome: Com_s_(p.NOME), precoTxt: Com_moeda_(p.PRECO), difere: Math.abs((Number(p.PRECO) || 0) - s.preco) > 0.004 }); return; }
    conflitos.push({ codigo: s.codigo, nome: s.nome, existente: Com_s_(p.NOME), id: Com_s_(p.ID) });
  });
  produtos.forEach(function (p) {
    if (ComCat_ehOficial_(p) || Com_up_(p.ATIVO || 'SIM') === 'NAO') return;
    var c1 = ComCat_c1Do_(p);
    if (!c1 || !COM_CAT_SUBSTITUI[c1]) return;
    desativar.push({ id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), c1: c1, por: COM_CAT_SUBSTITUI[c1], precoTxt: Com_moeda_(p.PRECO) });
  });
  // extras: serviço da C1 que continua ativo e recebe os parâmetros padrão (só quando ainda não tem regra: nunca sobrescreve)
  var parametrizar = [];
  produtos.forEach(function (p) {
    if (ComCat_ehOficial_(p) || Com_up_(p.ATIVO || 'SIM') === 'NAO' || Com_s_(p.PARAMETROS_JSON) !== '' || Com_s_(p.REGRA_PRECO) !== '') return;
    var c1 = ComCat_c1Do_(p), ex = ComCat_extras_().filter(function (x) { return x.c1 === c1; })[0];
    if (ex) parametrizar.push({ id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), c1: c1, condicoes: ex.processos.map(function (x) { return x.nome; }).join(' e ') });
  });
  var marca = Com_marca_(JSON.stringify({ c: criar.map(function (x) { return x.codigo; }), e: existem.map(function (x) { return x.codigo; }), x: conflitos.map(function (x) { return x.id; }), d: desativar.map(function (x) { return x.id; }), p: parametrizar.map(function (x) { return x.id; }) })).slice(0, 32);
  return { etapa: 'CATALOGO', criar: criar, existem: existem, conflitos: conflitos, desativar: desativar, parametrizar: parametrizar, qtdCriar: criar.length, qtdDesativar: desativar.length, marca: marca, versao: COM_CAT_VERSAO,
    mantidos: 'CAL_DATALOGGER (registrador de temperatura) e os demais serviços da C1 sem equivalente continuam ativos' };
}
function ComCat_aplicarCatalogo_(eu, d) {
  ComCat_exigirImplantar_(eu, 'implantar o catálogo oficial');
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var prev = ComCat_previaCatalogo_(eu);
    if (Com_s_(d.marca) !== prev.marca) throw new Error('Não foi possível implantar: o catálogo mudou desde a prévia (item novo, editado ou já implantado). Veja a prévia de novo e confira antes de aplicar. Nada foi gravado');
    var agora = Com_agora_(), hoje = Com_hoje_(), criados = [], desativados = [];
    var defs = {};
    ComCat_definicoes_().forEach(function (s) { defs[s.codigo] = s; });
    prev.criar.forEach(function (x) {
      var s = defs[x.codigo], f = ComCat_ficha_(s), ref = { fonte: 'catálogo oficial de 01/11/2026; ficha de custo ' + (f.fonte === 'estimativa' ? 'estimada (' + f.estimativa + ')' : 'da ' + f.fonte + (f.estimativa ? ' (' + f.estimativa + ')' : '')), estimativa: f.fonte === 'estimativa' || !!f.estimativa };
      if (f.c1) { ref.mercado = f.c1.mercado || null; ref.mercadoCentroOeste = f.c1.mercadoCentroOeste || null; ref.historico = f.c1.historico || null; ref.unidadeTexto = 'por equipamento'; }
      var reg = SGO_DATA.insert(COM_ABAS.PRODUTOS, { CODIGO: s.codigo, NOME: s.nome, TIPO: 'SERVICO', CATEGORIA: s.categoria, UNIDADE_MEDIDA: 'equip.', DESCRICAO: s.descricao, PRECO: s.preco, CUSTO: '', ATIVO: 'SIM', PRECO_DESDE: hoje,
        CATALOGO_OFICIAL: COM_CAT_MARCA, CATALOGO_VERSAO: COM_CAT_VERSAO, VIGENCIA_DESDE: hoje, REGRA_PRECO: s.regra, PARAMETROS_JSON: JSON.stringify(ComCat_defParaGravar_(s)),
        HORAS_TECNICO: f.horasTecnico, HORAS_ENGENHEIRO: f.horasEngenheiro, PADROES_CUSTO: f.padroes, CONSUMIVEIS_CUSTO: f.consumiveis, REFERENCIA_JSON: JSON.stringify(ref), FICHA_EM: agora, FICHA_POR_NOME: 'implantação do catálogo oficial',
        ATUALIZADO_POR_NOME: eu.nome + ' (catálogo oficial)', ATUALIZADO_EM: agora });
      Com_historico_('PRODUTO', reg.ID, 'CRIACAO', eu, { para: Com_moeda_(s.preco), texto: s.nome + ' (' + s.codigo + ') cadastrado da ' + COM_CAT_MARCA + ' (' + COM_CAT_VERSAO + '), preço-base ' + Com_moeda_(s.preco) + ', regra: ' + COM_CAT_REGRAS[s.regra] + '.' });
      criados.push(s.codigo);
    });
    prev.desativar.forEach(function (x) {
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, x.id);
      if (!p || Com_up_(p.ATIVO || 'SIM') === 'NAO') return;
      var motivo = COM_CAT_MOTIVO_DESATIVAR + ': ' + x.por.join(', ');
      SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { ATIVO: 'NAO', ATUALIZADO_POR_NOME: eu.nome + ' (catálogo oficial)', ATUALIZADO_EM: agora });
      Com_historico_('PRODUTO', p.ID, 'ARQUIVADO', eu, { texto: 'Desativado (nunca apagado; as propostas antigas continuam apontando para ele): ' + motivo + '.' });
      desativados.push(x.codigo + ' → ' + x.por.join('/'));
    });
    var parametrizados = [];
    prev.parametrizar.forEach(function (x) {
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, x.id), ex = ComCat_extras_().filter(function (e) { return e.c1 === x.c1; })[0];
      if (!p || !ex || Com_s_(p.PARAMETROS_JSON) !== '' || Com_s_(p.REGRA_PRECO) !== '') return;
      var dx = Com_copia_(ex); delete dx.c1;
      SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { REGRA_PRECO: dx.regra, PARAMETROS_JSON: JSON.stringify(dx), ATUALIZADO_POR_NOME: eu.nome + ' (catálogo oficial)', ATUALIZADO_EM: agora });
      Com_historico_('PRODUTO', p.ID, 'EDICAO', eu, { texto: 'Parâmetros técnicos padrão (decisão do dono de 01/11/2026): condições ' + x.condicoes + '. O preço e o restante do item ficaram como estavam.' });
      parametrizados.push(x.codigo);
    });
    Com_historico_('CATALOGO', 'CATALOGO_OFICIAL', 'IMPLANTACAO', eu, { texto: COM_CAT_MARCA + ' (' + COM_CAT_VERSAO + '): ' + criados.length + ' criados, ' + prev.existem.length + ' já existiam, ' + prev.conflitos.length + ' com código em uso por outro item, ' + desativados.length + ' serviços da C1 desativados (' + desativados.join('; ') + ')' + (parametrizados.length ? '; parâmetros padrão em ' + parametrizados.join(', ') : '') + '.' });
    return { criados: criados.length, jaExistiam: prev.existem.length, conflitos: prev.conflitos.length, desativados: desativados.length, parametrizados: parametrizados.length,
      message: 'Catálogo oficial: ' + Com_plural_(criados.length, 'serviço criado', 'serviços criados') + (prev.existem.length ? ', ' + Com_plural_(prev.existem.length, 'já existia', 'já existiam') + ' (não duplicou)' : '') + ', ' + Com_plural_(desativados.length, 'serviço da C1 desativado', 'serviços da C1 desativados') + ' (com histórico; nada apagado).' + (prev.conflitos.length ? ' Atenção: ' + prev.conflitos.map(function (c) { return c.codigo + ' já é o código de "' + c.existente + '"'; }).join('; ') + ': esses não foram criados; troque o código do item antigo e rode de novo.' : '') };
  });
}

// ------------------------------------------------------------
// IMPLANTAÇÃO: DESCRIÇÕES (o que estiver sem descritivo ganha a descrição padronizada da família)
// ------------------------------------------------------------
var COM_CAT_FAMILIAS = [
  { codigo: 'NR13', re: /\bnr\s*-?\s*13\b|vaso(s)? de press[aã]o|inspe[cç][aã]o de seguran[cç]a/, texto: 'Inspeção de segurança de vaso de pressão conforme a NR-13 e o enquadramento do equipamento, com as verificações técnicas do escopo contratado e emissão de relatório.' },
  { codigo: 'CALIBRACAO', re: /calibra/, texto: 'Serviço de calibração do instrumento ou equipamento descrito no item, conforme os pontos e as condições contratados, com emissão de certificado de calibração.' },
  { codigo: 'QUALIFICACAO', re: /qualifica|valida[cç][aã]o|mapeamento t[eé]rmico/, texto: 'Qualificação do equipamento descrito no item, conforme as etapas, os parâmetros e o escopo contratados, com emissão de relatório técnico.' },
  { codigo: 'PREVENTIVA', re: /preventiv/, texto: 'Manutenção preventiva do equipamento descrito no item, conforme o plano de manutenção e o escopo contratado, com registro em ordem de serviço.' },
  { codigo: 'CORRETIVA', re: /corretiv|reparo|conserto|manuten[cç][aã]o/, texto: 'Manutenção corretiva do equipamento descrito no item: diagnóstico e execução dos reparos do escopo contratado, com registro em ordem de serviço. Peças e materiais não descritos são orçados à parte.' },
  { codigo: 'HORA', re: /hora(s)? t[eé]cnica|hora de (t[eé]cnico|engenheiro)|\bhora\b/, texto: 'Hora técnica para atendimento conforme o escopo contratado (diagnóstico, instalação, acompanhamento ou suporte), com registro em ordem de serviço.' },
  { codigo: 'TREINAMENTO', re: /treinamento|capacita[cç]/, texto: 'Treinamento da equipe do cliente sobre o tema descrito no item, com conteúdo e carga horária conforme o escopo contratado e registro de participação.' },
  { codigo: 'INSTALACAO', re: /instala[cç]|montagem|start ?up/, texto: 'Instalação do equipamento descrito no item, conforme o escopo contratado, com registro em ordem de serviço.' },
  { codigo: 'LAUDO', re: /laudo|parecer|consultoria|assessoria|projeto/, texto: 'Elaboração de laudo ou parecer técnico sobre o objeto descrito no item, conforme o escopo contratado.' },
  { codigo: 'LOCACAO', re: /loca[cç][aã]o|aluguel/, texto: 'Locação do equipamento descrito no item pelo período e nas condições contratados.' },
  { codigo: 'CONTRATO', re: /contrato/, texto: 'Prestação de serviços conforme o escopo, a periodicidade e a vigência contratados.' }
];
var COM_CAT_FAMILIA_PADRAO = { codigo: 'SERVICO', texto: 'Serviço técnico descrito no item, executado conforme o escopo contratado, com registro do atendimento.' };
/** Descrição vazia ou só repetindo o nome (sem acento, maiúscula e pontuação). */
function ComCat_semDescricao_(p) { var d = Com_normBusca_(p.DESCRICAO); return !d || d === Com_normBusca_(p.NOME) || d === Com_normBusca_(Com_s_(p.CODIGO) + ' ' + Com_s_(p.NOME)); }
function ComCat_familia_(p) {
  var n = Com_normBusca_(Com_s_(p.NOME) + ' ' + Com_s_(p.CATEGORIA));
  if (Com_up_(p.TIPO) === 'CONTRATO') return COM_CAT_FAMILIAS.filter(function (f) { return f.codigo === 'CONTRATO'; })[0];
  return COM_CAT_FAMILIAS.filter(function (f) { return f.re.test(n); })[0] || COM_CAT_FAMILIA_PADRAO;
}
function ComCat_unidadeTexto_(u) {
  var x = Com_normBusca_(u);
  var mapa = { 'un': 'unidade', 'und': 'unidade', 'unid': 'unidade', 'unidade': 'unidade', 'pc': 'peça', 'pca': 'peça', 'peca': 'peça', 'pcs': 'peça', 'cx': 'caixa', 'caixa': 'caixa', 'kit': 'kit', 'jg': 'jogo', 'jogo': 'jogo',
    'm': 'metro', 'mt': 'metro', 'metro': 'metro', 'kg': 'quilo', 'l': 'litro', 'lt': 'litro', 'litro': 'litro', 'par': 'par', 'rl': 'rolo', 'rolo': 'rolo', 'pct': 'pacote', 'pacote': 'pacote', 'fr': 'frasco', 'frasco': 'frasco', 'gl': 'galão', 'galao': 'galão' };
  return mapa[x] || Com_s_(u) || 'unidade';
}
/** Descrição gerada: serviço pela família; produto só com o nome, a categoria e a unidade (nada de especificação inventada). */
function ComCat_descricaoGerada_(p) {
  if (Com_up_(p.TIPO) === 'PRODUTO') {
    var cat = Com_normBusca_(p.CATEGORIA) + ' ' + Com_normBusca_(p.NOME);
    var tipo = /\bpeca|reposi|refil|placa|sensor|valvula|vedacao|gaxeta|resistencia|fusivel/.test(cat) ? 'Peça de reposição' : /acessor/.test(cat) ? 'Acessório' : /insumo|consum|indicador|fita|papel|embalagem/.test(cat) ? 'Insumo' : /instrumento|termometro|manometro|data ?logger|registrador/.test(cat) ? 'Instrumento' : 'Produto';
    var nome = Com_s_(p.NOME).replace(/\s+/g, ' ').replace(/[.\s]+$/, '');
    return tipo + ': ' + nome + '. Fornecimento por ' + ComCat_unidadeTexto_(p.UNIDADE_MEDIDA) + '.';
  }
  return ComCat_familia_(p).texto;
}
function ComCat_previaDescricoes_(eu) {
  ComCat_exigirImplantar_(eu, 'ver a prévia das descrições');
  var linhas = [], servicos = 0, produtos = 0;
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) {
    if (Com_up_(p.ATIVO || 'SIM') === 'NAO' || !Com_s_(p.NOME) || !ComCat_semDescricao_(p)) return;
    var prod = Com_up_(p.TIPO) === 'PRODUTO';
    if (prod) produtos++; else servicos++;
    linhas.push({ id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), tipoNome: COM_TIPOS_ITEM[Com_up_(p.TIPO)] || 'Serviço', familia: prod ? 'PRODUTO' : ComCat_familia_(p).codigo, descricaoAtual: Com_s_(p.DESCRICAO), nova: ComCat_descricaoGerada_(p) });
  });
  var marca = Com_marca_(JSON.stringify(linhas.map(function (l) { return [l.id, l.descricaoAtual]; }))).slice(0, 32);
  return { etapa: 'DESCRICOES', linhas: linhas, qtd: linhas.length, servicos: servicos, produtos: produtos, exemplos: linhas.slice(0, 10), marca: marca };
}
function ComCat_aplicarDescricoes_(eu, d) {
  ComCat_exigirImplantar_(eu, 'gravar as descrições');
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var prev = ComCat_previaDescricoes_(eu);
    if (Com_s_(d.marca) !== prev.marca) throw new Error('Não foi possível gravar as descrições: o catálogo mudou desde a prévia. Veja a prévia de novo e confira antes de aplicar. Nada foi gravado');
    var agora = Com_agora_(), n = 0;
    prev.linhas.forEach(function (l) {
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, l.id);
      if (!p || !ComCat_semDescricao_(p)) return; // merge: só o campo vazio (ou que só repetia o nome)
      SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { DESCRICAO: l.nova, DESCRICAO_GERADA: COM_CAT_DESCR_MARCA, ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: eu.nome + ' (descrição padronizada)' });
      Com_historico_('PRODUTO', p.ID, 'EDICAO', eu, { texto: COM_CAT_DESCR_MARCA + ' (família ' + l.familia.toLowerCase() + '): "' + l.nova + '"' + (l.descricaoAtual ? '. Antes: "' + l.descricaoAtual + '"' : '') + '.' });
      n++;
    });
    Com_historico_('CATALOGO', 'DESCRICOES', 'IMPLANTACAO', eu, { texto: 'Descrições padronizadas criadas em ' + n + ' itens sem descritivo (' + prev.servicos + ' serviços e contratos, ' + prev.produtos + ' produtos na prévia). Marca "' + COM_CAT_DESCR_MARCA + '".' });
    return { gravados: n, message: 'Descrições criadas em ' + Com_plural_(n, 'item', 'itens') + ' (só onde estava vazio). Cada um ficou marcado "descrição gerada, revisar" para a gestão conferir em Produtos e serviços.' };
  });
}

/**
 * Para rodar no servidor sem tela (origem "editor"): prévia por padrão; aplicar exige aplicar: true e a marca da prévia.
 * o: { etapa: 'CATALOGO' | 'DESCRICOES', aplicar, marca }. Devolve o resultado (nunca lança).
 */
function Comercial_catalogoOficial20261101(o) {
  o = o || {};
  try {
    var eu = { id: 'SISTEMA', nome: 'Rotina do servidor (catálogo oficial 01/11/2026)', login: 'sistema', perfil: 'ADMIN', diretoria: true, gestao: true, catalogo: true, veCusto: true, nivel: 'GESTAO' };
    var etapa = Com_up_(o.etapa) || 'CATALOGO';
    if (etapa !== 'CATALOGO' && etapa !== 'DESCRICOES') return { ok: false, message: 'Use a etapa CATALOGO ou DESCRICOES' };
    Com_garantirAbas_();
    var r = etapa === 'DESCRICOES' ? (o.aplicar === true ? ComCat_aplicarDescricoes_(eu, o) : ComCat_previaDescricoes_(eu)) : (o.aplicar === true ? ComCat_aplicarCatalogo_(eu, o) : ComCat_previaCatalogo_(eu));
    if (etapa === 'CATALOGO' && o.aplicar !== true) r.sobra = ComCat_sobra_(eu).linhas;
    return JSON.parse(JSON.stringify(Object.assign({ ok: true, etapa: etapa, aplicado: o.aplicar === true }, r)));
  } catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
}
