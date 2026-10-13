/**
 * Lógica determinística de agrupamento do Cronograma de Execução.
 * Nada aqui chama IA — este arquivo só decide QUANTOS grupos, QUAIS
 * equipamentos entram em cada um e QUANDO cada grupo começa/termina.
 * A IA (SGO_CronExec_IA.js) só narra em cima do resultado daqui,
 * nunca inventa quantidade, composição ou data.
 */

/** Soma `n` dias úteis (pula sábado/domingo) a partir de `dataBase`. Feriados ficam fora do escopo da v1. */
function CronExec_somarDiasUteis_(dataBase, n) {
  const d = new Date(dataBase.getTime());
  let restantes = n;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const diaSemana = d.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return d;
}

/** Garante que `dataBase` em si caia num dia útil, avançando se cair em fim de semana. */
function CronExec_garantirDiaUtil_(dataBase) {
  const d = new Date(dataBase.getTime());
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
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
  const dataInicio1 = CronExec_garantirDiaUtil_(CronExec_parseDataISO_(params.dataInicioGrupo1));

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
    ? `o(s) primeiro(s) grupo(s) recebe(m) 1 unidade de cada um dos ${totalTipos} tipos distintos de equipamento, para que nenhum tipo fique totalmente indisponível ao mesmo tempo`
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
