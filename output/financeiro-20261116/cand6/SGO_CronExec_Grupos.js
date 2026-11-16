/**
 * Lógica determinística de agrupamento do Cronograma de Execução.
 * Nada aqui chama IA — este arquivo só decide QUANTOS grupos, QUAIS
 * equipamentos entram em cada um e QUANDO cada grupo começa/termina.
 * A IA (SGO_CronExec_IA.js) só narra em cima do resultado daqui,
 * nunca inventa quantidade, composição ou data.
 */

/**
 * Feriados nacionais (Lei 662/1949, Lei 6.802/1980, Lei 14.759/2023 e
 * Sexta-feira da Paixão, móvel pela Páscoa). Feriados estaduais e
 * municipais não entram: o operador ajusta a data do grupo na tela.
 */
function CronExec_pascoa_(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function CronExec_ehFeriadoNacional_(d) {
  const md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
  if (fixos.indexOf(md) >= 0) return true;
  if (md === '11-20' && d.getFullYear() >= 2024) return true; // Consciência Negra (Lei 14.759/2023)
  const sextaSanta = CronExec_pascoa_(d.getFullYear());
  sextaSanta.setDate(sextaSanta.getDate() - 2);
  return d.getMonth() === sextaSanta.getMonth() && d.getDate() === sextaSanta.getDate();
}

function CronExec_ehDiaUtil_(d) {
  const diaSemana = d.getDay(); // 0 = domingo, 6 = sábado
  return diaSemana !== 0 && diaSemana !== 6 && !CronExec_ehFeriadoNacional_(d);
}

/** Soma `n` dias úteis (pula sábado, domingo e feriado nacional) a partir de `dataBase`. */
function CronExec_somarDiasUteis_(dataBase, n) {
  const d = new Date(dataBase.getTime());
  let restantes = n;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    if (CronExec_ehDiaUtil_(d)) restantes--;
  }
  return d;
}

/** Garante que `dataBase` em si caia num dia útil, avançando se cair em fim de semana ou feriado nacional. */
function CronExec_garantirDiaUtil_(dataBase) {
  const d = new Date(dataBase.getTime());
  while (!CronExec_ehDiaUtil_(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** true se `s` for uma data real no formato aaaa-mm-dd (o que o campo de data da tela envia). */
function CronExec_dataIsoValida_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

function CronExec_formatarDataISO_(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function CronExec_parseDataISO_(s) {
  const [yyyy, mm, dd] = String(s).split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/**
 * Sugere o agrupamento de equipamentos em grupos com datas.
 *
 * @param {Array<{id:string, tipo:string, marca:string, modelo:string, quantidade:number}>} equipamentos
 * @param {{limiarUnidadeUnicoGrupo:number, maxUnidadesPorGrupo:number, dataInicioGrupo1:string, diasUteisPorGrupo:number, gapDiasUteisEntreGrupos:number}} params
 */
function CronExec_sugerirGrupos_(equipamentos, params) {
  const lista = (equipamentos || []).filter(e => e && Number(e.quantidade) > 0);
  const totalUnidades = lista.reduce((soma, e) => soma + Number(e.quantidade), 0);
  const totalTipos = lista.length;

  const maxPorGrupo = Math.max(1, Number(params.maxUnidadesPorGrupo) || 1);
  const diasUteisPorGrupo = Math.max(1, Number(params.diasUteisPorGrupo) || 1);
  const gapDiasUteis = Math.max(0, Number(params.gapDiasUteisEntreGrupos) || 0);
  const limiarUnico = Math.max(0, Number(params.limiarUnidadeUnicoGrupo) || 0);
  if (!CronExec_dataIsoValida_(params.dataInicioGrupo1)) {
    throw new Error('Informe uma data de início do Grupo 1 válida (campo "Data de início do Grupo 1", na etapa 3).');
  }
  const dataInicio1 =CronExec_garantirDiaUtil_(CronExec_parseDataISO_(params.dataInicioGrupo1));

  if (totalUnidades === 0) {
    return { modoUnico: true, totalUnidades: 0, totalGrupos: 0, grupos: [], fundamentacao: { estrategia: '' } };
  }

  // ---- 1. Job pequeno não força divisão ----
  if (totalUnidades <= limiarUnico) {
    const dataFim = CronExec_somarDiasUteis_(dataInicio1, diasUteisPorGrupo - 1);
    return {
      modoUnico: true,
      totalUnidades,
      totalGrupos: 1,
      grupos: [{
        ordinal: 1,
        dataInicio: CronExec_formatarDataISO_(dataInicio1),
        dataFim: CronExec_formatarDataISO_(dataFim),
        itens: lista.map(e => ({ equipamentoId: e.id, tipo: e.tipo, marca: e.marca, modelo: e.modelo, quantidade: Number(e.quantidade) }))
      }],
      fundamentacao: {
        estrategia: `Como o total de unidades (${totalUnidades}) está dentro do limite de ${limiarUnico} definido para grupo único, todo o escopo foi mantido em um único grupo, sem necessidade de escalonamento por data.`
      }
    };
  }

  // ---- 2. Fase de cobertura: 1 unidade de cada tipo distinto por vez,
  //         respeitando a ordem de entrada do técnico ----
  const restante = {};
  lista.forEach(e => { restante[e.id] = Number(e.quantidade); });

  const filaCobertura = lista.map(e => e.id);
  const gruposBrutos = [];
  while (filaCobertura.length > 0) {
    const grupo = [];
    let capacidade = maxPorGrupo;
    while (filaCobertura.length > 0 && capacidade > 0) {
      const id = filaCobertura.shift();
      grupo.push({ equipamentoId: id, quantidade: 1 });
      restante[id] -= 1;
      capacidade -= 1;
    }
    gruposBrutos.push(grupo);
  }

  // ---- 3. Fase de sobra: empacota as unidades duplicadas restantes,
  //         na mesma ordem de entrada ----
  const idsComSobra = lista.map(e => e.id).filter(id => restante[id] > 0);
  let grupoAtual = [];
  let capacidadeAtual = maxPorGrupo;
  idsComSobra.forEach(id => {
    while (restante[id] > 0) {
      if (capacidadeAtual === 0) {
        gruposBrutos.push(grupoAtual);
        grupoAtual = [];
        capacidadeAtual = maxPorGrupo;
      }
      const leva = Math.min(restante[id], capacidadeAtual);
      grupoAtual.push({ equipamentoId: id, quantidade: leva });
      restante[id] -= leva;
      capacidadeAtual -= leva;
    }
  });
  if (grupoAtual.length > 0) gruposBrutos.push(grupoAtual);

  // ---- 4. Consolida duplicatas dentro do mesmo grupo e atribui datas ----
  const porId = {};
  lista.forEach(e => { porId[e.id] = e; });

  let cursor = dataInicio1;
  const grupos = gruposBrutos.map((grupo, idx) => {
    const consolidado = {};
    grupo.forEach(item => {
      consolidado[item.equipamentoId] = (consolidado[item.equipamentoId] || 0) + item.quantidade;
    });
    const itens = Object.keys(consolidado).map(id => ({
      equipamentoId: id,
      tipo: porId[id].tipo,
      marca: porId[id].marca,
      modelo: porId[id].modelo,
      quantidade: consolidado[id]
    }));

    const dataInicioGrupo = cursor;
    const dataFimGrupo = CronExec_somarDiasUteis_(dataInicioGrupo, diasUteisPorGrupo - 1);
    cursor = CronExec_somarDiasUteis_(dataFimGrupo, 1 + gapDiasUteis);

    return {
      ordinal: idx + 1,
      dataInicio: CronExec_formatarDataISO_(dataInicioGrupo),
      dataFim: CronExec_formatarDataISO_(dataFimGrupo),
      itens
    };
  });

  const fraseCobertura = totalTipos > 1
    ? `os primeiros grupos recebem uma unidade de cada um dos ${totalTipos} tipos de equipamento, para que nenhum tipo fique totalmente indisponível ao mesmo tempo`
    : `como há apenas 1 tipo de equipamento, a divisão em grupos segue só o limite de unidades por grupo`;

  return {
    modoUnico: false,
    totalUnidades,
    totalGrupos: grupos.length,
    grupos,
    fundamentacao: {
      estrategia: `O total de ${totalUnidades} unidades ultrapassa o limite de ${limiarUnico} para grupo único, então o escopo foi dividido em ${grupos.length} grupos de até ${maxPorGrupo} unidades cada: ${fraseCobertura}; os grupos seguintes absorvem as unidades duplicadas restantes, sempre respeitando a ordem em que os equipamentos foram informados.`
    }
  };
}
