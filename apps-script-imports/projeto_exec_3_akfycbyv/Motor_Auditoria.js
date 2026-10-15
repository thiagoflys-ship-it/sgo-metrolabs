/**
 * ============================================================
 * METROLABS — MOTOR DE AUDITORIA TÉCNICA
 * ARQUIVO: Motor_Auditoria.gs
 * VERSÃO: V2.0 PROFISSIONAL
 *
 * OBJETIVO:
 * - Auditar dados por perfil de equipamento.
 * - Impedir mistura de critérios.
 * - Gerar pendências, alertas, resumo técnico e conclusão-base.
 * - Trabalhar junto com Config.gs V2 Pesado e Documento.gs V2.
 *
 * REGRA:
 * Nada é genérico. Toda avaliação parte do perfil em CFG.PERFIS_EQUIPAMENTO.
 * ============================================================
 */

function auditarQualificacao(dados) {
  try {
    const validacao = validarPayloadAntesDeGerar(dados);

    if (!validacao.ok) {
      return {
        ok: false,
        mensagem: validacao.mensagem,
        erros: validacao.erros || []
      };
    }

    const payload = validacao.payload;
    const perfil = payload.perfil;

    const auditoria = criarAuditoriaBaseV2_(payload, perfil);

    switch (perfil.familia) {
      case "ESTERILIZACAO":
        auditarEsterilizacaoV2_(auditoria, payload, perfil);
        break;

      case "LAVAGEM_DESINFECCAO":
        auditarLavagemDesinfeccaoV2_(auditoria, payload, perfil);
        break;

      case "CADEIA_FRIA":
        auditarCadeiaFriaV2_(auditoria, payload, perfil);
        break;

      case "LABORATORIAL_GERAL":
        auditarEquipamentoGeralV2_(auditoria, payload, perfil);
        break;

      case "NR13":
        auditarNR13V2_(auditoria, payload, perfil);
        break;

      default:
        auditoria.alertas.push("Família técnica não reconhecida para auditoria especializada.");
    }

    consolidarAuditoriaV2_(auditoria, payload, perfil);

    return {
      ok: true,
      resultado: auditoria,
      auditoria: auditoria
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao auditar qualificação: " + obterMensagemErro_(e)
    };
  }
}

/**
 * ============================================================
 * BASE
 * ============================================================
 */

function criarAuditoriaBaseV2_(payload, perfil) {
  return {
    versaoMotor: "2.0",
    tipoCodigo: perfil.codigo,
    tipoEquipamento: perfil.nome,
    familia: perfil.familia,

    etapas: {
      qi: !!payload.escopo.qi,
      qo: !!payload.escopo.qo,
      qd: !!payload.escopo.qd,
      inspecao: !!payload.escopo.inspecao
    },

    statusQI: payload.escopo.qi ? "APROVADO" : "N/A",
    statusQO: payload.escopo.qo ? "APROVADO" : "N/A",
    statusQD: payload.escopo.qd ? "APROVADO" : "N/A",
    statusInspecao: payload.escopo.inspecao ? "APROVADO" : "N/A",

    statusFinalDeclarado: normalizarStatus_(payload.statusFinal || "Pendente"),
    statusFinal: normalizarStatus_(payload.statusFinal || "Pendente"),

    receitas: payload.receitas || [],
    ensaios: payload.ensaios || [],
    insumos: payload.insumos || [],
    nr13: payload.nr13 || {},

    normas: Array.isArray(perfil.normas) ? perfil.normas.slice() : [],
    criterios: perfil.criterios || {},
    textos: perfil.textos || {},

    pendencias: [],
    alertas: [],
    observacoesTecnicas: [],
    resumoTecnico: [],
    inconsistenciasBloqueantes: [],

    quadroResumo: {
      totalReceitas: 0,
      totalEnsaios: 0,
      totalInsumos: 0,
      totalPendencias: 0,
      totalAlertas: 0,
      totalBloqueios: 0,
      totalCiclosPrevistos: 0,
      totalCiclosDeclarados: 0,
      rotuloCiclos: "Ciclos / execuções previstos",
      rotuloInsumos: "Insumos / testes rastreáveis"
    },

    textoBaseConclusao: ""
  };
}

/**
 * ============================================================
 * ESTERILIZAÇÃO
 * ============================================================
 */

function auditarEsterilizacaoV2_(auditoria, payload, perfil) {
  auditoria.observacoesTecnicas.push(perfil.textos.qi || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qo || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qd || "");
  auditoria.observacoesTecnicas.push(perfil.textos.rastreabilidade || "");

  if ((payload.escopo.qo || payload.escopo.qd) && !payload.receitas.length) {
    auditoria.pendencias.push("Não foram informadas receitas/programas para QO/QD de esterilização.");
  }

  if (payload.ensaios && payload.ensaios.length) {
    auditoria.alertas.push("Foram recebidos ensaios térmicos/gerais em perfil de esterilização. Verifique se essas informações deveriam estar em ciclos/receitas ou dados analíticos do relatório completo.");
  }

  auditarInsumosObrigatoriosV2_(auditoria, payload, perfil);

  if (perfil.codigo === "AUTOCLAVE_VAPOR") auditarAutoclaveVaporV2_(auditoria, payload, perfil);
  if (perfil.codigo === "AUTOCLAVE_PEROXIDO") auditarAutoclavePeroxidoV2_(auditoria, payload, perfil);
  if (perfil.codigo === "AUTOCLAVE_ETO") auditarAutoclaveETOV2_(auditoria, payload, perfil);

  calcularCiclosPrevistosV2_(auditoria, payload, perfil);
}

function auditarAutoclaveVaporV2_(auditoria, payload, perfil) {
  const receitas = normalizarReceitasAuditoriaV2_(payload.receitas);

  if (receitas.indexOf("PRIONS") >= 0) {
    const temIQPrions = localizarInsumoPorCodigoOuNomeV2_(payload.insumos, "IQ_PRIONS", "PRIONS");
    if (!temIQPrions) {
      auditoria.pendencias.push("Receita Príons selecionada sem rastreabilidade do integrador químico específico para Príons.");
    }

    const temIQComumComoPrions = localizarInsumoPorCodigoOuNomeV2_(payload.insumos, "IQ", "INTEGRADOR QUIMICO");
    if (temIQComumComoPrions && !temIQPrions) {
      auditoria.alertas.push("Para receita Príons, integrador químico comum não substitui integrador específico para Príons.");
    }
  }

  if (receitas.indexOf("BOWIE DICK") >= 0 || receitas.indexOf("BOWIE-DICK") >= 0) {
    const temBowie = localizarInsumoPorCodigoOuNomeV2_(payload.insumos, "BOWIE_DICK", "BOWIE");
    if (!temBowie) {
      auditoria.pendencias.push("Receita Bowie-Dick selecionada sem rastreabilidade do teste Bowie-Dick.");
    }
  }

  auditoria.resumoTecnico.push("A autoclave a vapor foi auditada com separação entre instalação, operação, desempenho, receitas convencionais, Bowie-Dick, Príons e rastreabilidade de indicadores aplicáveis.");
}

function auditarAutoclavePeroxidoV2_(auditoria, payload, perfil) {
  const receitas = normalizarReceitasAuditoriaV2_(payload.receitas);

  if (receitas.indexOf("BOWIE DICK") >= 0 || receitas.indexOf("BOWIE-DICK") >= 0) {
    auditoria.inconsistenciasBloqueantes.push("Bowie-Dick não pertence ao perfil de autoclave de peróxido de hidrogênio.");
  }

  if (!payload.equipamento.capacidadeLitros && !payload.equipamento.volume) {
    auditoria.alertas.push("Capacidade do equipamento não informada. Recomenda-se registrar volume/capacidade para análise de carga e compatibilidade.");
  }

  auditoria.resumoTecnico.push("A autoclave de peróxido foi auditada com foco em baixa temperatura, compatibilidade de carga, lúmens, rastreabilidade de indicadores e exclusão de critérios de vapor.");
}

function auditarAutoclaveETOV2_(auditoria, payload, perfil) {
  if (!payload.equipamento.tipoGas) {
    auditoria.alertas.push("Tipo/composição do gás ETO não informado.");
  }

  if (!payload.equipamento.sistemaExaustao) {
    auditoria.alertas.push("Sistema de exaustão/abatimento não informado para processo ETO.");
  }

  auditoria.resumoTecnico.push("A autoclave ETO foi auditada considerando variáveis críticas de gás, vácuo, umidade, exposição, remoção/aeração e segurança operacional.");
}

/**
 * ============================================================
 * LAVAGEM / DESINFECÇÃO
 * ============================================================
 */

function auditarLavagemDesinfeccaoV2_(auditoria, payload, perfil) {
  auditoria.observacoesTecnicas.push(perfil.textos.qi || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qo || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qd || "");
  auditoria.observacoesTecnicas.push(perfil.textos.rastreabilidade || "");

  if ((payload.escopo.qo || payload.escopo.qd) && !payload.receitas.length) {
    auditoria.pendencias.push("Não foram informados programas/receitas para o equipamento de lavagem/desinfecção.");
  }

  if (payload.insumos && payload.insumos.length) {
    payload.insumos.forEach(function(i) {
      const nome = normalizarChave_(i.nome || i.codigo || "");
      if (nome.indexOf("BIOLOGICO") >= 0 || nome === "BI" || nome.indexOf("BOWIE") >= 0 || nome.indexOf("PRIONS") >= 0) {
        auditoria.inconsistenciasBloqueantes.push("Foi informado insumo de esterilização em equipamento de lavagem/desinfecção: " + (i.nome || i.codigo) + ".");
      }
    });
  }

  auditarInsumosObrigatoriosV2_(auditoria, payload, perfil);
  calcularCiclosPrevistosV2_(auditoria, payload, perfil);

  if (perfil.codigo === "LAVADORA_ULTRASSONICA") {
    auditoria.resumoTecnico.push("A lavadora ultrassônica foi auditada com foco em limpeza, cavitação, canulados, fluxo, programa e testes de limpeza, sem aplicação de critérios de esterilização.");
  }

  if (perfil.codigo === "TERMODESINFECTORA") {
    auditoria.resumoTecnico.push("A termodesinfectora foi auditada com foco em lavagem, enxágue, desinfecção, secagem, A0 quando aplicável e rastreabilidade de testes de limpeza.");
  }
}

/**
 * ============================================================
 * CADEIA FRIA / TÉRMICOS
 * ============================================================
 */

function auditarCadeiaFriaV2_(auditoria, payload, perfil) {
  auditoria.observacoesTecnicas.push(perfil.textos.qi || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qd || "");
  auditoria.observacoesTecnicas.push(perfil.textos.rastreabilidade || "");

  if (payload.receitas && payload.receitas.length) {
    auditoria.inconsistenciasBloqueantes.push("Receitas/ciclos foram informados para equipamento de cadeia fria, mas este perfil utiliza ensaios térmicos, não receitas de processo.");
  }

  if (payload.insumos && payload.insumos.length) {
    auditoria.inconsistenciasBloqueantes.push("Insumos de processo foram informados para cadeia fria, mas este perfil não utiliza BI, IQ, Bowie-Dick, Príons ou integradores.");
  }

  if (!payload.ensaios || !payload.ensaios.length) {
    auditoria.pendencias.push("Nenhum ensaio térmico foi informado para o equipamento selecionado.");
  }

  if (!payload.equipamento.faixaMin || !payload.equipamento.faixaMax) {
    auditoria.alertas.push("Faixa térmica mínima/máxima não informada. Recomenda-se registrar critério de aceitação no relatório final.");
  }

  (payload.ensaios || []).forEach(function(e) {
    if (!e.resultado) auditoria.alertas.push("Ensaio térmico sem resultado declarado: " + e.nome + ".");
    if (e.resultado && normalizarChave_(e.resultado).indexOf("REPROV") >= 0) {
      auditoria.pendencias.push("Ensaio térmico reprovado ou declarado como não conforme: " + e.nome + ".");
    }
  });

  auditoria.resumoTecnico.push("O equipamento de cadeia fria foi auditado por estabilidade, faixa térmica, excursões, recuperação, documentação e rastreabilidade metrológica.");
}

/**
 * ============================================================
 * EQUIPAMENTOS GERAIS
 * ============================================================
 */

function auditarEquipamentoGeralV2_(auditoria, payload, perfil) {
  auditoria.observacoesTecnicas.push(perfil.textos.qi || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qo || "");
  auditoria.observacoesTecnicas.push(perfil.textos.qd || "");
  auditoria.observacoesTecnicas.push(perfil.textos.rastreabilidade || "");

  if (payload.receitas && payload.receitas.length) {
    auditoria.inconsistenciasBloqueantes.push("Receitas/ciclos foram informados para equipamento geral, mas este perfil utiliza ensaios funcionais ou térmicos específicos.");
  }

  if (payload.insumos && payload.insumos.length) {
    auditoria.inconsistenciasBloqueantes.push("Insumos foram informados para equipamento geral, mas este perfil não utiliza BI, IQ, Bowie-Dick, Príons ou integradores.");
  }

  if (!payload.ensaios || !payload.ensaios.length) {
    auditoria.pendencias.push("Nenhum ensaio funcional foi informado para o equipamento selecionado.");
  }

  (payload.ensaios || []).forEach(function(e) {
    if (!e.resultado) auditoria.alertas.push("Ensaio funcional sem resultado declarado: " + e.nome + ".");
    if (e.resultado && normalizarChave_(e.resultado).indexOf("REPROV") >= 0) {
      auditoria.pendencias.push("Ensaio funcional reprovado ou declarado como não conforme: " + e.nome + ".");
    }
  });

  auditoria.resumoTecnico.push("O equipamento foi auditado por critérios funcionais próprios, sem aplicação indevida de indicadores ou lógicas de esterilização.");
}

/**
 * ============================================================
 * NR-13
 * ============================================================
 */

function auditarNR13V2_(auditoria, payload, perfil) {
  auditoria.observacoesTecnicas.push(perfil.textos.escopo || "");
  auditoria.observacoesTecnicas.push(perfil.textos.metodologia || "");
  auditoria.observacoesTecnicas.push(perfil.textos.rastreabilidade || "");

  if (payload.receitas && payload.receitas.length) {
    auditoria.inconsistenciasBloqueantes.push("Receitas/ciclos foram informados para NR-13, mas vaso de pressão utiliza inspeção técnica e ensaios próprios.");
  }

  if (payload.insumos && payload.insumos.length) {
    auditoria.inconsistenciasBloqueantes.push("Insumos foram informados para NR-13, mas vaso de pressão não utiliza BI, IQ, Bowie-Dick, Príons ou integradores.");
  }

  if (!payload.nr13 || !payload.nr13.ensaios || !payload.nr13.ensaios.length) {
    auditoria.pendencias.push("Nenhuma inspeção ou ensaio NR-13 foi informado.");
  }

  if (!payload.equipamento.pmta && !(payload.nr13 && payload.nr13.pmta)) {
    auditoria.alertas.push("PMTA não informada.");
  }

  if (!payload.equipamento.categoriaNR13 && !(payload.nr13 && payload.nr13.categoriaNR13)) {
    auditoria.alertas.push("Categoria NR-13 não informada.");
  }

  (payload.nr13.ensaios || []).forEach(function(e) {
    if (!e.resultado) auditoria.alertas.push("Inspeção/ensaio NR-13 sem resultado declarado: " + e.nome + ".");
    if (e.resultado && normalizarChave_(e.resultado).indexOf("REPROV") >= 0) {
      auditoria.pendencias.push("Inspeção/ensaio NR-13 reprovado ou declarado como não conforme: " + e.nome + ".");
    }
  });

  auditoria.resumoTecnico.push("O vaso de pressão foi auditado por critérios NR-13, incluindo PMTA, integridade, acessórios de segurança, documentação e ensaios aplicáveis.");
}

/**
 * ============================================================
 * INSUMOS / CICLOS
 * ============================================================
 */

function auditarInsumosObrigatoriosV2_(auditoria, payload, perfil) {
  if (!perfil.usaInsumos) return;

  if (!(payload.escopo.qo || payload.escopo.qd || payload.escopo.inspecao)) return;

  const obrigatorios = obterInsumosObrigatoriosParaPayload_(payload);

  obrigatorios.forEach(function(insumoPerfil) {
    const achado = localizarInsumoPayloadV2_(payload.insumos || [], insumoPerfil);

    if (!achado) {
      auditoria.pendencias.push("Ausência de rastreabilidade para " + insumoPerfil.nome + ".");
      return;
    }

    if (!achado.lote) auditoria.pendencias.push("Lote não informado para " + insumoPerfil.nome + ".");
    if (!achado.validade) auditoria.pendencias.push("Validade não informada para " + insumoPerfil.nome + ".");
  });
}

function calcularCiclosPrevistosV2_(auditoria, payload, perfil) {
  const totalReceitas = (payload.receitas || []).length;
  let total = 0;

  if (payload.escopo.qo) {
    total += totalReceitas * Number((perfil.criterios && perfil.criterios.qoCiclosVaziosPorReceita) || 0);
  }

  if (payload.escopo.qd) {
    total += totalReceitas * Number((perfil.criterios && perfil.criterios.qdCiclosComCargaPorReceita) || 0);
  }

  auditoria.quadroResumo.totalCiclosPrevistos = total;
  auditoria.quadroResumo.totalCiclosDeclarados = totalReceitas;
}

/**
 * ============================================================
 * CONSOLIDAÇÃO
 * ============================================================
 */

function consolidarAuditoriaV2_(auditoria, payload, perfil) {
  auditoria.pendencias = deduplicarListaAuditoriaV2_(auditoria.pendencias);
  auditoria.alertas = deduplicarListaAuditoriaV2_(auditoria.alertas);
  auditoria.inconsistenciasBloqueantes = deduplicarListaAuditoriaV2_(auditoria.inconsistenciasBloqueantes);
  auditoria.observacoesTecnicas = deduplicarListaAuditoriaV2_(auditoria.observacoesTecnicas).filter(Boolean);
  auditoria.resumoTecnico = deduplicarListaAuditoriaV2_(auditoria.resumoTecnico).filter(Boolean);

  auditoria.quadroResumo.totalReceitas = (payload.receitas || []).length;
  auditoria.quadroResumo.totalEnsaios =
    (payload.ensaios || []).length +
    ((payload.nr13 && payload.nr13.ensaios) ? payload.nr13.ensaios.length : 0);

  auditoria.quadroResumo.totalInsumos = (payload.insumos || []).length;
  auditoria.quadroResumo.totalPendencias = auditoria.pendencias.length;
  auditoria.quadroResumo.totalAlertas = auditoria.alertas.length;
  auditoria.quadroResumo.totalBloqueios = auditoria.inconsistenciasBloqueantes.length;

  if (auditoria.inconsistenciasBloqueantes.length) {
    auditoria.statusFinal = "Reprovado";
  } else if (auditoria.pendencias.length && auditoria.statusFinal === "Aprovado") {
    auditoria.statusFinal = "Aprovado com Ressalvas";
  }

  auditoria.textoBaseConclusao = montarConclusaoBaseAuditoriaV2_(auditoria, payload, perfil);
}

function montarConclusaoBaseAuditoriaV2_(auditoria, payload, perfil) {
  const textos = perfil.textos || {};
  const status = normalizarChave_(auditoria.statusFinal);
  const partes = [];

  if (status === "APROVADO") {
    partes.push(textos.conclusaoAprovado || "O equipamento apresentou conformidade preliminar com o escopo avaliado.");
  } else if (status === "APROVADO COM RESSALVAS") {
    partes.push(textos.conclusaoRessalvas || "O equipamento apresentou conformidade preliminar com ressalvas.");
  } else if (status === "REPROVADO") {
    partes.push(textos.conclusaoReprovado || "O equipamento não apresentou evidências suficientes de conformidade.");
  } else {
    partes.push("O equipamento permanece com conclusão pendente até a consolidação completa das evidências técnicas.");
  }

  if (auditoria.inconsistenciasBloqueantes.length) {
    partes.push("Foram identificadas inconsistências bloqueantes que impedem a emissão sem correção ou revisão do escopo.");
  }

  if (auditoria.pendencias.length) {
    partes.push("Existem pendências técnicas ou documentais que devem ser tratadas para fortalecimento da evidência final.");
  }

  if (auditoria.alertas.length) {
    partes.push("Também foram registrados alertas técnicos que devem ser analisados quanto ao impacto no uso, segurança e rastreabilidade.");
  }

  if (perfil.normas && perfil.normas.length) {
    partes.push("A interpretação foi realizada conforme referências específicas do perfil " + perfil.nome + ", evitando aplicação indevida de critérios pertencentes a outros equipamentos.");
  }

  return partes.join(" ");
}

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function normalizarReceitasAuditoriaV2_(receitas) {
  return (receitas || []).map(function(r) {
    return normalizarChave_(r.nome || r || "");
  });
}

function localizarInsumoPayloadV2_(insumos, insumoPerfil) {
  const codigo = normalizarChave_(insumoPerfil.codigo || "");
  const nome = normalizarChave_(insumoPerfil.nome || "");

  return (insumos || []).find(function(i) {
    return normalizarChave_(i.codigo || "") === codigo ||
           normalizarChave_(i.nome || "") === nome;
  }) || null;
}

function localizarInsumoPorCodigoOuNomeV2_(insumos, codigoBusca, nomeBusca) {
  const cod = normalizarChave_(codigoBusca || "");
  const nome = normalizarChave_(nomeBusca || "");

  return (insumos || []).find(function(i) {
    const ic = normalizarChave_(i.codigo || "");
    const inome = normalizarChave_(i.nome || "");
    return (cod && ic === cod) || (nome && inome.indexOf(nome) >= 0);
  }) || null;
}

function deduplicarListaAuditoriaV2_(lista) {
  const seen = {};
  return (lista || []).filter(function(item) {
    const k = normalizarChave_(item);
    if (!k || seen[k]) return false;
    seen[k] = true;
    return true;
  });
}
