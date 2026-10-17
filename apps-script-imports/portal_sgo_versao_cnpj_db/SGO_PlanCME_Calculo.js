function PlanCME_calcularPlanejamento(dados) {
  try {
    PlanCME_validarEntradaCalculo_(dados);

    // Identificação do Tipo de Equipamento — ordem importa: o nome do
    // Formaldeído também contém a palavra "Vapor", então isVapor só pode
    // ser calculado por exclusão das famílias mais específicas.
    const tipoProcesso = dados.equipamento && dados.equipamento.tipoProcesso ? dados.equipamento.tipoProcesso : "";
    const isUltrassonica = tipoProcesso.includes("Ultrassônica");
    const isTermo = tipoProcesso.includes("Termodesinfectora");
    const isPeroxido = tipoProcesso.includes("Peróxido");
    const isFormaldeido = tipoProcesso.includes("Formaldeído");
    const isETO = tipoProcesso.includes("Etileno");
    const isVapor = !isUltrassonica && !isTermo && !isPeroxido && !isFormaldeido && !isETO;
    // Vapor, Peróxido, Formaldeído e ETO seguem o MESMO rito de QI/QO/QD
    // (NBR 16328 trata todos como "esterilizador"/autoclave) — só o
    // Bowie-Dick (abaixo) fica restrito ao Vapor.
    const isAutoclave = isVapor || isPeroxido || isFormaldeido || isETO;

    const volume = Number(dados.volume || 0);
    const sensores = PlanCME_calcularSensores_(volume, tipoProcesso);
    const margem = PlanCME_obterMargemSeguranca_();

    let baseBI = 0;
    let baseIQ = 0;
    let baseIQPrion = 0;
    let baseBD = 0;
    let baseCavitacao = 0;
    let baseLimpeza = 0;

    const detalhes = [];
    const ciclosDetalhados = [];

    const ciclos = Array.isArray(dados.ciclos)
      ? dados.ciclos.map(c => String(c || "").trim()).filter(Boolean)
      : [];

    const qtdCiclos = ciclos.length;

    if (dados.qi) {
      detalhes.push(
        "Qualificação de Instalação incluída com checklist técnico de inspeção da infraestrutura e do equipamento, sem consumo de insumos de teste no cálculo."
      );
    }

    if (dados.qo) {
      ciclos.forEach(nomeCiclo => {
        if (isUltrassonica) {
          // Lógica Lavadora Ultrassônica (QO - Ciclo Vazio)
          const repQO = 4; // 4 repetições
          const ptsCavitacao = PLANCME_CFG.CALCULO.LAVA_ULTR_PONTOS_BRASMEDICAL || 9;
          const cavitacaoCiclo = repQO * ptsCavitacao;
          
          baseCavitacao += cavitacaoCiclo;

          detalhes.push(
            "Qualificação de Operação da receita \"" + nomeCiclo + "\" calculada com " + repQO + " repetições em ciclo vazio, utilizando " + ptsCavitacao + " testes de cavitação por repetição (Mapeamento de Pontos)."
          );

          ciclosDetalhados.push({ etapa: "QO", nome: nomeCiclo, repeticoes: repQO, baseCavitacao: cavitacaoCiclo });

        } else if (isTermo) {
          // Lógica Termodesinfectora (QO)
          const repQO = 4; // Atualizado para 4 repetições
          const limpezaCiclo = repQO * sensores;
          
          baseLimpeza += limpezaCiclo;

          detalhes.push(
            "Qualificação de Operação da receita \"" + nomeCiclo + "\" calculada com " + repQO + " repetições, utilizando 1 indicador de limpeza por sensor em cada repetição."
          );

          ciclosDetalhados.push({ etapa: "QO", nome: nomeCiclo, repeticoes: repQO, baseLimpeza: limpezaCiclo });

        } else if (!dados.qd) {
          // Regime QI+QO SEM QD (comum em orçamentos que só contratam
          // instalação+operação, sem desempenho — ex.: mercado do Rio de
          // Janeiro) — critério técnico PRÓPRIO da Metrolabs (não
          // normativo, diferente do regime abaixo): um relatório de
          // qualificação não pode sair sem nenhum desafio microbiológico
          // documentado, então inclui-se 3 indicadores biológicos + 3
          // integradores químicos FIXOS por ciclo (posições conceituais
          // início/meio/fim da câmara), independente do número de
          // sensores calculado. Definido pelo usuário em 2026-07-26.
          // Quando QD é contratado, esse papel passa a ser do QD (1 por
          // sensor, ver bloco de QD abaixo) e o QO permanece zerado
          // (regra de 2026-07-25, inalterada nesse regime).
          const repeticoesQO = 3;
          const ehPrion = PlanCME_ehCicloPrion_(nomeCiclo);
          const biCicloQO = 3 * repeticoesQO;
          const iqCicloQO = ehPrion ? 0 : 3 * repeticoesQO;
          const iqPrionCicloQO = ehPrion ? 3 * repeticoesQO : 0;

          baseBI += biCicloQO;
          baseIQ += iqCicloQO;
          baseIQPrion += iqPrionCicloQO;

          detalhes.push(
            "Qualificação de Operação da receita \"" + nomeCiclo + "\" calculada com " + repeticoesQO + " repetições em ciclo vazio, incluindo 3 indicadores biológicos e 3 integradores químicos fixos por repetição (critério técnico próprio da Metrolabs para escopo sem Qualificação de Desempenho — ver Fundamentação Técnica do Escopo)."
          );

          ciclosDetalhados.push({ etapa: "QO", nome: nomeCiclo, ehPrion: ehPrion, repeticoes: repeticoesQO, baseBI: biCicloQO, baseIQ: iqCicloQO, baseIQPrion: iqPrionCicloQO });
        } else {
          // Lógica Autoclave (QO) com QD contratado — ciclo vazio: NBR
          // 16328:2024 (Anexos C.4/D.4, "ciclo em vazio") não exige
          // nenhum indicador biológico ou químico nessa etapa, só
          // sensores de temperatura (câmara vazia não representa desafio
          // microbiológico a vencer). Corrigido em 2026-07-25 — antes
          // calculava 3 BI + 3 IQ por repetição sem base normativa
          // nenhuma. Bowie-Dick (item separado, ver bloco dedicado
          // abaixo) é a única exigência real de QO pra Autoclave, e só
          // pra Vapor. O desafio microbiológico do escopo fica
          // concentrado no QD (1 por sensor, ver bloco abaixo).
          const repeticoesQO = 3;

          detalhes.push(
            "Qualificação de Operação da receita \"" + nomeCiclo + "\" calculada com " + repeticoesQO + " repetições em ciclo vazio, sem consumo de indicador biológico ou químico nesta etapa — conforme NBR 16328:2024, o ciclo em vazio avalia apenas a distribuição de temperatura do equipamento, sem desafio microbiológico. O desafio microbiológico do escopo contratado é integralmente coberto pela Qualificação de Desempenho."
          );

          ciclosDetalhados.push({ etapa: "QO", nome: nomeCiclo, repeticoes: repeticoesQO });
        }
      });
    }

    // Bowie-Dick é fisicamente específico de esterilização a VAPOR (detecta
    // ar residual/vazamento no ciclo de vácuo fracionado) — não existe
    // equivalente literal pra Peróxido/Formaldeído/ETO (esses processos
    // usam process challenge devices diferentes, não intercambiáveis).
    // Restrito a isVapor em 2026-07-25 (antes aplicava a todo isAutoclave,
    // incluindo Peróxido, o que não fazia sentido).
    if (dados.bowieDick && isVapor) {
      baseBD += Number(PLANCME_CFG.CALCULO.BOWIE_DICK_PADRAO || 1);
      detalhes.push("Teste Bowie-Dick incluído como item independente no planejamento (exigência de rotina para esterilização a vapor, RDC nº 15/2012, Art. 93).");
    }

    if (dados.qd) {
      ciclos.forEach(nomeCiclo => {
        if (isUltrassonica) {
          // Lógica Lavadora Ultrassônica (QD - Com Carga)
          const repQD = 4; // 4 repetições
          const ptsCavitacao = PLANCME_CFG.CALCULO.LAVA_ULTR_PONTOS_BRASMEDICAL || 9;
          const limpezaPorSensor = PLANCME_CFG.CALCULO.LAVA_ULTR_LIMPEZA_POR_SENSOR || 1;
          
          const cavitacaoCiclo = repQD * ptsCavitacao;
          const limpezaCiclo = repQD * (sensores * limpezaPorSensor);

          baseCavitacao += cavitacaoCiclo;
          baseLimpeza += limpezaCiclo;

          detalhes.push(
            "Qualificação de Desempenho da receita \"" + nomeCiclo + "\" calculada com " + repQD + " repetições com carga, utilizando " + ptsCavitacao + " testes de cavitação e " + limpezaPorSensor + " indicador de limpeza por sensor em cada repetição."
          );

          ciclosDetalhados.push({ etapa: "QD", nome: nomeCiclo, repeticoes: repQD, baseCavitacao: cavitacaoCiclo, baseLimpeza: limpezaCiclo });

        } else if (isTermo) {
          // Lógica Termodesinfectora (QD - Com Carga)
          const repQD = 4; // Atualizado para 4 repetições
          const limpezaCiclo = repQD * sensores;
          
          baseLimpeza += limpezaCiclo;

          detalhes.push(
            "Qualificação de Desempenho da receita \"" + nomeCiclo + "\" calculada com " + repQD + " repetições com carga, utilizando 1 indicador de limpeza por sensor em cada repetição."
          );

          ciclosDetalhados.push({ etapa: "QD", nome: nomeCiclo, repeticoes: repQD, baseLimpeza: limpezaCiclo });

        } else {
          // Lógica Autoclave (QD)
          const repeticoesQD = Number(PLANCME_CFG.CALCULO.REPETICOES_QD || 3);
          const ehPrion = PlanCME_ehCicloPrion_(nomeCiclo);
          const totalSensoresNoCiclo = sensores * repeticoesQD;

          const biCicloQD = totalSensoresNoCiclo;
          const iqCicloQD = ehPrion ? 0 : totalSensoresNoCiclo;
          const iqPrionCicloQD = ehPrion ? totalSensoresNoCiclo : 0;

          baseBI += biCicloQD;
          baseIQ += iqCicloQD;
          baseIQPrion += iqPrionCicloQD;

          if (ehPrion) {
            detalhes.push(
              "Qualificação de Desempenho da receita \"" + nomeCiclo + "\" calculada com " + repeticoesQD + " repetições, utilizando 1 indicador biológico por sensor e 1 integrador químico específico para Príons por sensor em cada repetição."
            );
          } else {
            detalhes.push(
              "Qualificação de Desempenho da receita \"" + nomeCiclo + "\" calculada com " + repeticoesQD + " repetições, utilizando 1 indicador biológico por sensor e 1 integrador químico por sensor em cada repetição."
            );
          }

          ciclosDetalhados.push({
            etapa: "QD", nome: nomeCiclo, ehPrion: ehPrion, repeticoes: repeticoesQD, baseBI: biCicloQD, baseIQ: iqCicloQD, baseIQPrion: iqPrionCicloQD
          });
        }
      });
    }

    const resultado = {
      sensores: sensores,
      baseBI: baseBI,
      baseIQ: baseIQ,
      baseIQPrion: baseIQPrion,
      baseBD: baseBD,
      baseCavitacao: baseCavitacao,
      baseLimpeza: baseLimpeza,

      totalBI: Math.ceil(baseBI * margem),
      totalIQ: Math.ceil(baseIQ * margem),
      totalIQPrion: Math.ceil(baseIQPrion * margem),
      totalBD: Math.ceil(baseBD * margem),
      totalCavitacao: Math.ceil(baseCavitacao * margem),
      totalLimpeza: Math.ceil(baseLimpeza * margem),

      margem: margem,
      detalhes: detalhes,
      ciclosDetalhados: ciclosDetalhados,
      checklistQI: dados.qi ? PlanCME_getChecklistQI_() : [],
      // Fundamentação determinística (nunca gerada por IA) — a IA só
      // escreve prosa em cima destas afirmações, nunca decide sozinha
      // qual é a base normativa de cada número.
      fundamentacao: PlanCME_montarFundamentacao_(tipoProcesso, volume, sensores, isVapor, isAutoclave, isTermo, isUltrassonica, !!dados.qo, !!dados.qd)
    };

    // Montagem dinâmica da lista de insumos com base no tipo de equipamento
    const insumosArray = [];

    if (isAutoclave) {
      insumosArray.push({ nome: PLANCME_CFG.INSUMOS.INDICADOR_BIOLOGICO, base: resultado.baseBI, total: resultado.totalBI });
      insumosArray.push({ nome: PLANCME_CFG.INSUMOS.INTEGRADOR_QUIMICO, base: resultado.baseIQ, total: resultado.totalIQ });
      insumosArray.push({ nome: PLANCME_CFG.INSUMOS.INTEGRADOR_PRION, base: resultado.baseIQPrion, total: resultado.totalIQPrion });
      // Bowie-Dick só aparece na tabela pra Vapor — não faz sentido
      // mostrar uma linha zerada de um teste que não existe pro
      // Peróxido/Formaldeído/ETO (diferente de BI/IQ/Prion, que zeram só
      // por escolha do operador ao não marcar QD, não por incompatibilidade
      // do equipamento).
      if (isVapor) {
        insumosArray.push({ nome: PLANCME_CFG.INSUMOS.BOWIE_DICK, base: resultado.baseBD, total: resultado.totalBD });
      }
    } else if (isUltrassonica) {
      insumosArray.push({ nome: PLANCME_CFG.INSUMOS.TESTE_CAVITACAO, base: resultado.baseCavitacao, total: resultado.totalCavitacao });
      insumosArray.push({ nome: PLANCME_CFG.INSUMOS.TESTE_LIMPEZA, base: resultado.baseLimpeza, total: resultado.totalLimpeza });
    } else if (isTermo) {
      insumosArray.push({ nome: PLANCME_CFG.INSUMOS.TESTE_LIMPEZA, base: resultado.baseLimpeza, total: resultado.totalLimpeza });
    }

    resultado.insumos = insumosArray;

    // IA chamada 1x só, aqui — o texto gerado (resultado.textosIA) viaja
    // junto no objeto "resultado" que o frontend guarda e reenvia pros 2
    // botões de gerar documento (Planejamento e Justificativa+ERU), que
    // NUNCA chamam a IA de novo. Isso garante que os 2 documentos nunca
    // descrevam o mesmo cálculo de forma divergente. Lança erro se
    // falhar — não existe "calcular sem fundamentação".
    try {
      resultado.textosIA = PlanCME_gerarJustificativasIA_(dados, resultado);
    } catch (eIA) {
      throw new Error("O planejamento não foi concluído porque a fundamentação técnica do documento é escrita pela IA. " + eIA.message);
    }

    return {
      ok: true,
      resultado: resultado
    };
  } catch (e) {
    return {
      ok: false,
      mensagem: e.message
    };
  }
}

/**
 * Margem de segurança (multiplicador, ex.: 1,2 = +20%). (2026-10-16) Antes
 * lia só a propriedade "MARGEM_SEGURANCA", mas o setup grava
 * "PLANCME_MARGEM_SEGURANCA" — a gravada nunca era usada. Agora aceita as
 * duas (a antiga primeiro, por compatibilidade), tolera vírgula decimal e cai
 * no valor do config se o valor gravado for inválido (< 1 ou não numérico),
 * em vez de devolver totais NaN.
 */
function PlanCME_obterMargemSeguranca_() {
  const props = PropertiesService.getScriptProperties();
  const candidatos = [props.getProperty("MARGEM_SEGURANCA"), props.getProperty("PLANCME_MARGEM_SEGURANCA")];
  for (let i = 0; i < candidatos.length; i++) {
    const bruto = String(candidatos[i] == null ? "" : candidatos[i]).trim().replace(",", ".");
    if (!bruto) continue;
    const n = Number(bruto);
    if (isFinite(n) && n >= 1) return n;
  }
  return Number(PLANCME_CFG.CALCULO.MARGEM_SEGURANCA || 1.2);
}

function PlanCME_validarEntradaCalculo_(dados) {
  if (!dados) {
    throw new Error("Dados não recebidos para cálculo.");
  }

  if (!String((dados.cliente && dados.cliente.razaoSocial) || "").trim()) {
    throw new Error("Informe a razão social do cliente (etapa 1 - Dados do cliente) antes de calcular.");
  }

  const volume = Number(dados.volume || 0);
  if (!volume || volume <= 0) {
    throw new Error("Informe um volume válido da câmara (etapa 2 - Dados do equipamento), em litros, maior que zero.");
  }

  if (!dados.qi && !dados.qo && !dados.qd && !dados.bowieDick) {
    throw new Error(
      "Selecione ao menos um item: Qualificação de Instalação, Qualificação de Operação, Qualificação de Desempenho ou Bowie-Dick."
    );
  }

  if (dados.qd || dados.qo) {
    const ciclos = Array.isArray(dados.ciclos)
      ? dados.ciclos.map(c => String(c || "").trim()).filter(Boolean)
      : [];

    if (!ciclos.length) {
      throw new Error("Para as etapas selecionadas (Operação ou Desempenho), informe pelo menos uma receita.");
    }
  }
}

/**
 * Quantidade de sensores de temperatura por tipo de equipamento.
 * - Autoclave (Vapor/Peróxido/Formaldeído/ETO): NBR 16328:2024 — até o
 *   limite de volume (54L) usa o mínimo pequeno (3), acima usa o mínimo
 *   grande (12). Corrigido em 2026-07-25 (antes era uma escala de 3
 *   faixas sem base normativa).
 * - Termodesinfectora: sempre 12, sem exceção de volume (NBR 16328:2024,
 *   Anexo D, normativo).
 * - Lavadora Ultrassônica: fórmula antiga preservada de propósito — vem
 *   de documentação do fabricante, NÃO é normativa, não mexer aqui.
 */
function PlanCME_calcularSensores_(volume, tipoProcesso) {
  const tipo = String(tipoProcesso || "");
  const isUltrassonica = tipo.includes("Ultrassônica");
  const isTermo = tipo.includes("Termodesinfectora");

  if (isUltrassonica) {
    if (volume <= 5) return 5;
    if (volume <= 20) return 9;
    return 12;
  }

  if (isTermo) {
    return Number(PLANCME_CFG.CALCULO.SENSORES_TERMODESINFECTORA || 12);
  }

  // Autoclave (Vapor, Peróxido, Formaldeído, ETO)
  const limite = Number(PLANCME_CFG.CALCULO.LIMITE_VOLUME_SENSOR_AUTOCLAVE || 54);
  return volume <= limite
    ? Number(PLANCME_CFG.CALCULO.SENSORES_AUTOCLAVE_PEQUENO || 3)
    : Number(PLANCME_CFG.CALCULO.SENSORES_AUTOCLAVE_GRANDE || 12);
}

/**
 * Monta as afirmações de fundamentação normativa/protocolo, uma vez só,
 * de forma determinística — a IA (IA.js) usa isso como fato dado, nunca
 * decide sozinha qual norma cita ou se algo é normativo/recomendação/
 * critério próprio. Evita a IA "inventar" artigo ou natureza jurídica da
 * exigência.
 */
function PlanCME_montarFundamentacao_(tipoProcesso, volume, sensores, isVapor, isAutoclave, isTermo, isUltrassonica, temQO, temQD) {
  const limite = Number(PLANCME_CFG.CALCULO.LIMITE_VOLUME_SENSOR_AUTOCLAVE || 54);

  let basisSensores = "";
  let basisIndicadores = "";
  let basisBowieDick = "";

  if (isAutoclave) {
    basisSensores = "ABNT NBR 16328:2024 — volume da câmara (" + PlanCME_formatarNumeroBr_(volume) + " L) " +
      (volume <= limite ? ("≤ " + limite + " L, exige mínimo de 3 sensores de temperatura") : ("> " + limite + " L, exige mínimo de 12 sensores de temperatura")) +
      ". Resultado deste planejamento: " + sensores + " sensores.";
    if (temQO && !temQD) {
      // Regime QI+QO sem QD (2026-07-26): distinto do regime abaixo — os
      // indicadores não são "1 por sensor" (isso é exclusividade do QD),
      // são 3 BI + 3 IQ FIXOS por repetição, critério técnico PRÓPRIO da
      // Metrolabs (nunca normativo), aplicado só porque o escopo
      // contratado não inclui QD e um relatório de qualificação não pode
      // sair sem nenhum desafio microbiológico documentado.
      basisIndicadores = "CRITÉRIO TÉCNICO PRÓPRIO DA METROLABS (não normativo): como o escopo contratado inclui Qualificação de Instalação e Operação mas NÃO inclui Qualificação de Desempenho, a Metrolabs, por critério técnico próprio, inclui na Qualificação de Operação 3 indicadores biológicos e 3 integradores químicos fixos por repetição (posições de início, meio e fim da câmara), sempre em CONJUNTO — cada uma das 3 posições recebe os dois indicadores juntos, nunca um sem o outro — para que o relatório de qualificação não seja emitido sem nenhum desafio microbiológico documentado. Esta quantidade fixa (3+3) não decorre de contagem de sensores nem é uma exigência normativa: é uma salvaguarda técnica da Metrolabs para esse cenário específico de escopo reduzido. Caso o cliente contrate futuramente a Qualificação de Desempenho, o desafio microbiológico completo passa a ser feito por sensor nessa etapa, e este item de 3+3 deixa de se aplicar.";
    } else {
      // Reescrito em 2026-07-28 após correção direta do usuário: o
      // indicador biológico NÃO é critério técnico próprio da Metrolabs
      // — é exigência normativa tão indiscutível quanto o integrador
      // químico ("um por sensor e pronto"). A versão anterior (2026-07-26)
      // classificava o indicador biológico como "critério próprio", o que
      // estava ERRADO — mantida só a distinção correta e já validada
      // sobre o que CADA UM comprova (o químico verifica condição física
      // de exposição, não prova esterilização sozinho; o biológico
      // comprova a eficácia microbiológica) e a simultaneidade (sempre
      // juntos, na mesma posição, nunca como alternativas).
      basisIndicadores = "ABNT NBR 16328:2024, Anexo C, item C.5: exigência NORMATIVA, no estudo de penetração de temperatura em ciclos com carga (QD), o uso de 1 integrador químico por sensor E de 1 indicador biológico por sensor, sempre na MESMA posição e ao MESMO TEMPO — nunca como alternativas ou opções separadas. NENHUM dos dois é critério técnico próprio da Metrolabs: ambos são exigência normativa direta, tão indiscutível um quanto o outro. A diferença entre eles é o que cada um comprova, não a origem: o integrador químico verifica se as condições FÍSICAS de exposição (tempo, temperatura, presença de vapor saturado) foram atingidas naquele ponto, mas NÃO comprova, sozinho, a esterilização microbiológica; é o indicador biológico que comprova a eficácia microbiológica (morte de esporos-teste) no mesmo ponto. No ciclo em vazio (QO), a norma não exige nenhum indicador biológico ou químico — só sensores de temperatura.";
    }
    if (isVapor) {
      // Reescrito em 2026-07-26 (achado real: contradição normativo-vs-
      // própria no mesmo parágrafo) e de novo em 2026-07-28 (achado real
      // 2: quando o Bowie-Dick é contratado SEM Qualificação de Operação
      // — caso real de cliente que só compra QD+Bowie-Dick — a frase
      // antiga "incluída na Qualificação de Operação" (afirmada sem
      // condição) fazia a IA escrever, dentro da própria Fundamentação de
      // QD, que o Bowie-Dick "é parte integrante da Qualificação de
      // Operação" — uma seção que nem existe nesse documento, contradição
      // real). Texto abaixo agora deixa a exigência normativa
      // independente de qual etapa foi contratada.
      basisBowieDick = "RDC nº 15/2012 (Anvisa), Art. 93 — exigência NORMATIVA de teste de rotina para esterilização a vapor. Este teste é INTEGRALMENTE normativo — não é critério técnico próprio da Metrolabs, e não deve ser descrito ou reclassificado como tal em nenhum trecho do texto. É um item independente do planejamento: tradicionalmente executado junto à Qualificação de Operação quando essa etapa também é contratada, mas sua exigência normativa não depende disso — se o escopo contratado não incluir Qualificação de Operação, o Bowie-Dick continua sendo exigido do mesmo jeito, e o texto NUNCA deve afirmar que ele é \"parte\" ou está \"incluído\" numa etapa (QI/QO/QD) que não faz parte do escopo contratado. Não se aplica a Peróxido de Hidrogênio, Formaldeído ou Óxido de Etileno — esses processos não usam vapor saturado sob vácuo fracionado, e o Bowie-Dick não tem equivalente físico direto nesses métodos.";
    }
  } else if (isTermo) {
    // Reescrito em 2026-07-26 (auditoria de consistência entre todos os
    // equipamentos, achado real): a frase "critério técnico consolidado
    // de mercado" não correspondia a nenhuma das 3 categorias que a IA é
    // instruída a usar (normativa/protocolo do fabricante/critério
    // próprio da Metrolabs) — risco da IA inventar uma 4ª categoria não
    // autorizada. Reclassificado explicitamente como categoria única:
    // critério técnico PRÓPRIO da Metrolabs.
    basisSensores = "ABNT NBR 16328:2024, Anexo D (normativo) — mínimo de 12 sensores de temperatura, sem exceção por volume da câmara.";
    basisIndicadores = "ABNT NBR ISO 15883-1 (base normativa da termodesinfecção): exigência NORMATIVA de que o desempenho seja comprovado pelo parâmetro físico de letalidade térmica (valor A0) — a norma não emprega indicador biológico nesse método. O indicador de limpeza (resíduo orgânico) por sensor, em cada repetição, NÃO é exigência normativa nem protocolo de um fabricante específico: é adotado pela Metrolabs como critério técnico PRÓPRIO (prática consolidada de mercado para termodesinfecção) para verificação quantitativa da eficácia de lavagem, e não deve ser descrito como exigência normativa.";
  } else if (isUltrassonica) {
    // Parâmetros genéricos abaixo confirmados em 2026-07-25 contra
    // documentação real de fabricante (arquivada internamente, NUNCA
    // citar o nome da marca no texto gerado — ver
    // docs/REFERENCIA_SANDERS_QIQO_LAVADORA_SW_20260725.md e
    // feedback_nunca_citar_fabricante_especifico na memória do projeto).
    basisSensores = "Quantidade de pontos de verificação definida por protocolo técnico do fabricante do equipamento (o Anexo J da NBR 16328:2024, que trata de lavadoras ultrassônicas, é INFORMATIVO — não normativo — e não fixa uma quantidade obrigatória).";
    // Reescrito em 2026-07-26 (mesma auditoria): a frase antiga descrevia
    // o MESMO item (teste de cavitação/indicador de limpeza) como
    // "protocolo técnico do fabricante" E, na sequência, "critério próprio
    // documentado pela Metrolabs" — a mesma dupla-classificação que
    // causou a contradição real do Bowie-Dick (ver Calculo.js, branch
    // isVapor). Corrigido pra classificação ÚNICA: é protocolo do
    // fabricante, ponto — a Metrolabs segue o que o fabricante determina,
    // não decide os parâmetros por conta própria.
    basisIndicadores = "Teste de cavitação e indicador de limpeza conforme protocolo técnico do FABRICANTE do equipamento — classificação ÚNICA: protocolo do fabricante, não normativo (o Anexo J da NBR 16328:2024 é INFORMATIVO e não fixa nada obrigatório) e NÃO é critério próprio da Metrolabs — a Metrolabs segue o que o fabricante determina, não decide os parâmetros por conta própria. Parâmetros típicos desse tipo de protocolo (genéricos, sem vínculo a uma marca específica, todos atribuídos ao fabricante): a temperatura do ciclo de teste deve ficar dentro de uma tolerância estreita da temperatura programada (tipicamente ±2°C); a intensidade de cavitação é avaliada por pontos de medição distribuídos numa área de varredura definida pelo fabricante, com critério de aceitação de valor médio mínimo e de valor mínimo por ponto individual; quando o método de verificação usa indicador químico de cavitação (ampola), o próprio fabricante recomenda repetir o teste (tipicamente 3 vezes) antes de confirmar uma falha, dada a variabilidade conhecida desse tipo de indicador entre lotes.";
  }

  return {
    basisSensores: basisSensores,
    basisIndicadores: basisIndicadores,
    basisBowieDick: basisBowieDick
  };
}

function PlanCME_ehCicloPrion_(nomeCiclo) {
  const texto = PlanCME_normalizarTexto_(nomeCiclo);
  return texto.includes("prion");
}

function PlanCME_normalizarTexto_(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function PlanCME_getChecklistQI_() {
  return [
    "Verificar alimentação elétrica compatível com a placa do equipamento.",
    "Verificar aterramento e condições de segurança elétrica.",
    "Verificar ponto de drenagem e escoamento.",
    "Verificar utilidades aplicáveis e integridade das conexões.",
    "Verificar posicionamento físico e espaço operacional.",
    "Verificar integridade externa do equipamento.",
    "Verificar identificação, placa, modelo e número de série.",
    "Verificar alarmes, travas e condições gerais de operação.",
    "Verificar documentação técnica disponível no local."
  ];
}