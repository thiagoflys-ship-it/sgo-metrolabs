/**
 * ============================================================
 * METROLABS — TESTES INTEGRADOS / SANIDADE DO SISTEMA
 * ARQUIVO: Testes.gs
 * VERSÃO: FINAL V1.0
 *
 * FUNÇÃO:
 * - Verificar se todos os módulos existem.
 * - Testar perfis de equipamento.
 * - Testar validação de payload.
 * - Testar auditoria sem gerar PDF.
 * - Testar IA com fallback/local.
 * - Testar banco/Drive configurados.
 *
 * COMO USAR:
 * 1. Cole este arquivo como Testes.gs.
 * 2. Execute: testarSistemaCompletoCartaConformidade()
 * 3. Veja o retorno no Apps Script.
 * ============================================================
 */

function testarSistemaCompletoCartaConformidade() {
  const resultado = {
    ok: true,
    data: Utilities.formatDate(new Date(), obterTimezoneTeste_(), "dd/MM/yyyy HH:mm:ss"),
    testes: []
  };

  function add(nome, ok, detalhe) {
    resultado.testes.push({
      teste: nome,
      ok: !!ok,
      detalhe: detalhe || ""
    });

    if (!ok) resultado.ok = false;
  }

  try {
    add("CFG carregado", typeof CFG !== "undefined", "Objeto CFG disponível.");
    add("Perfis carregados", CFG && CFG.PERFIS_EQUIPAMENTO && Object.keys(CFG.PERFIS_EQUIPAMENTO).length >= 10, "Total de perfis: " + Object.keys(CFG.PERFIS_EQUIPAMENTO || {}).length);
    add("Função doGet", typeof doGet === "function", "WebApp principal disponível.");
    add("Função include", typeof include === "function", "Inclusão HTML disponível.");
    add("Validação central", typeof validarPayloadAntesDeGerar === "function", "Função validarPayloadAntesDeGerar disponível.");
    add("Motor de auditoria", typeof auditarQualificacao === "function", "Função auditarQualificacao disponível.");
    add("Gerador de PDF", typeof gerarCartaConformidade === "function", "Função gerarCartaConformidade disponível.");
    add("IA contextual", typeof refinarPayloadConclusaoIA === "function", "Função refinarPayloadConclusaoIA disponível.");
    add("Consulta documental", typeof buscarDocumentoPorCodigo === "function", "Função buscarDocumentoPorCodigo disponível.");

    const props = PropertiesService.getScriptProperties();
    add("DB_ID configurado", !!props.getProperty("DB_ID"), props.getProperty("DB_ID") || "Execute setupMetrolabsCartaConformidadeV2().");
    add("PASTA_PDF_ID configurada", !!props.getProperty("PASTA_PDF_ID"), props.getProperty("PASTA_PDF_ID") || "Execute setupMetrolabsCartaConformidadeV2().");
    add("LOGO_ID configurado", !!(props.getProperty("LOGO_ID") || (CFG && CFG.LOGO_ID)), props.getProperty("LOGO_ID") || CFG.LOGO_ID || "Logo não configurada.");

    testarPayloadPorPerfil_(resultado, add);
    testarIaLocal_(resultado, add);

    return resultado;

  } catch (e) {
    resultado.ok = false;
    resultado.erro = e.message || String(e);
    return resultado;
  }
}

function testarPayloadPorPerfil_(resultado, add) {
  const tipos = [
    "AUTOCLAVE_VAPOR",
    "LAVADORA_ULTRASSONICA",
    "CAMARA_FRIA",
    "VASO_PRESSAO_NR13"
  ];

  tipos.forEach(function(tipo) {
    const payload = montarPayloadTestePorTipo_(tipo);

    const validacao = validarPayloadAntesDeGerar(payload);
    add("Validação payload " + tipo, validacao && validacao.ok, validacao && validacao.mensagem ? validacao.mensagem : "Payload validado.");

    if (validacao && validacao.ok) {
      const auditoria = auditarQualificacao(payload);
      add("Auditoria " + tipo, auditoria && auditoria.ok, auditoria && auditoria.mensagem ? auditoria.mensagem : "Auditoria executada.");
    }
  });
}

function montarPayloadTestePorTipo_(tipo) {
  const perfil = getPerfilEquipamento_(tipo);

  const base = {
    cliente: {
      cnpj: "32487278000121",
      razaoSocial: "Metrolabs Teste Interno",
      logradouro: "Rua de Teste",
      numero: "100",
      bairro: "Centro",
      cidade: "Goiânia",
      uf: "GO"
    },
    equipamento: {
      tipoCodigo: tipo,
      tipoNome: perfil.nome,
      marca: "Marca Teste",
      modelo: "Modelo Teste",
      numeroSerie: "SERIE-TESTE-" + tipo,
      tag: "TAG-TESTE",
      capacidadeLitros: "100",
      setor: "Setor Teste",
      localInstalacao: "Local Teste",
      faixaMin: "2",
      faixaMax: "8",
      pmta: "10 bar",
      volume: "100 L",
      categoriaNR13: "V"
    },
    escopo: {
      qi: !!perfil.usaQI,
      qo: !!perfil.usaQO,
      qd: !!perfil.usaQD,
      inspecao: !!perfil.usaInspecaoNR13
    },
    statusFinal: "Aprovado",
    textoConclusao: "",
    receitas: [],
    ensaios: [],
    insumos: [],
    nr13: { ensaios: [] }
  };

  if (perfil.usaReceitas) {
    base.receitas = [{ nome: (perfil.receitasPadrao && perfil.receitasPadrao[0]) || "Programa Teste" }];
  }

  if (perfil.usaInsumos) {
    base.insumos = (perfil.insumos || []).map(function(i) {
      return {
        codigo: i.codigo,
        nome: i.nome,
        lote: "LOTE-TESTE",
        validade: "12/2030",
        fabricante: "Fabricante Teste",
        resultado: "Aprovado"
      };
    });
  }

  if (perfil.usaEnsaiosTermicos || perfil.usaEnsaiosGerais) {
    base.ensaios = (perfil.ensaiosPadrao || ["Ensaio Teste"]).map(function(nome) {
      return {
        nome: nome,
        resultado: "Aprovado",
        tempMin: "2,5",
        tempMax: "7,2",
        excursao: "0",
        obs: "Ensaio de teste interno."
      };
    });
  }

  if (perfil.usaInspecaoNR13) {
    base.nr13 = {
      pmta: "10 bar",
      volume: "100 L",
      categoriaNR13: "V",
      ensaios: (perfil.ensaiosPadrao || ["Inspeção Visual"]).map(function(nome) {
        return {
          nome: nome,
          resultado: "Aprovado",
          pressaoTeste: "15 bar",
          tempoTeste: "30 min",
          obs: "Inspeção de teste interno."
        };
      })
    };
  }

  return base;
}

function testarIaLocal_(resultado, add) {
  try {
    const res = refinarTextoIA("equipamento aprovado no escopo avaliado.");
    add("IA/fallback local", res && res.ok && !!res.texto, res && res.texto ? res.texto.substring(0, 160) : "Falha na IA.");
  } catch (e) {
    add("IA/fallback local", false, e.message || String(e));
  }
}

function obterTimezoneTeste_() {
  try {
    return (CFG && CFG.APP && CFG.APP.TIMEZONE) || Session.getScriptTimeZone() || "America/Sao_Paulo";
  } catch (e) {
    return "America/Sao_Paulo";
  }
}
