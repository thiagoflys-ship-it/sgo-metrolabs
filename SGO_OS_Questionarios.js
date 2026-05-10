// Caminho: Backend/SGO_OS_Questionarios.js

/* ================================================================
   SGO_OS_Questionarios.js
   API pública para gestão de questionários dinâmicos de OS.
   A lógica interna está em SGO_OS_Checklist.js (SGO_OS_CHECKLIST).
================================================================= */

/* --- 1. Modelos ------------------------------------------------ */
function checklistModelosListar(sessionId, filtros) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.listarModelos(sessionId, filtros)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistModeloCriar(sessionId, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.criarModelo(sessionId, payload)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistModeloAtualizar(sessionId, id, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.atualizarModelo(sessionId, id, payload)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistModeloInativar(sessionId, id) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.inativarModelo(sessionId, id)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistModeloClonar(sessionId, id) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.clonarModelo(sessionId, id)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistModeloObterCompleto(sessionId, id) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.obterModeloCompleto(sessionId, id)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistModeloPorTipoOSTipoEquipamento(sessionId, tipoOs, tipoEquipamento) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.modeloPorTipoOSTipoEquipamento(sessionId, tipoOs, tipoEquipamento)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

/* --- 2. Perguntas ---------------------------------------------- */
function checklistPerguntaCriar(sessionId, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.criarPergunta(sessionId, payload)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistPerguntaAtualizar(sessionId, id, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.atualizarPergunta(sessionId, id, payload)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistPerguntaExcluir(sessionId, id) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.excluirPergunta(sessionId, id)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

/* --- 3. Respostas ---------------------------------------------- */
function checklistRespostasSalvar(sessionId, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.salvarRespostas(sessionId, payload)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function checklistRespostasListarPorOS(sessionId, osId) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.listarRespostasPorOS(sessionId, osId)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

/* --- 4. Validação ---------------------------------------------- */
function checklistValidarObrigatorios(sessionId, osId) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.validarObrigatorios(sessionId, osId)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}`, pendencias: [e.message] };
  }
}

/* --- 5. Seed ---------------------------------------------------- */
function checklistSeedQuestionariosIniciais(sessionId) {
  try {
    exigirSessao(sessionId);

    const existentes = SGO_OS_CHECKLIST.listarModelos(sessionId, {});
    const nomesExistentes = (existentes.items || []).map(m => SGO_UTILS.safeUpper(SGO_UTILS.safe(m.NOME)));

    const log = [];

    /* =====================================================
       A) ATENDIMENTO CORRETIVO GERAL
       TIPO_OS: MANUTENCAO_CORRETIVA | TIPO_EQUIPAMENTO: GERAL
    ====================================================== */
    if (nomesExistentes.indexOf("ATENDIMENTO CORRETIVO GERAL") < 0) {
      const modeloA = SGO_OS_CHECKLIST.criarModelo(sessionId, {
        NOME: "ATENDIMENTO CORRETIVO GERAL",
        TIPO_OS: "MANUTENCAO_CORRETIVA",
        TIPO_EQUIPAMENTO: "GERAL",
        DESCRICAO: "Checklist padrao para atendimento corretivo em qualquer equipamento.",
        VERSAO: "1",
        STATUS: "ATIVO",
        EXIGE_FOTO: "S",
        EXIGE_ASSINATURA: "S",
        BLOQUEIA_SE_NAO_CONFORME: "N",
        PERMITE_CONCLUIR_SEM_QUESTIONARIO: "N"
      });

      if (modeloA.success) {
        const midA = modeloA.item.ID;
        const perguntasA = [
          { SECAO: "Identificacao", ORDEM: "1", PERGUNTA: "Foto da plaqueta do equipamento",  TIPO_RESPOSTA: "FOTO",        OBRIGATORIO: "S", EXIGE_FOTO_SE_NAO_OK: "S" },
          { SECAO: "Execucao",      ORDEM: "2", PERGUNTA: "Relato do servico executado",      TIPO_RESPOSTA: "TEXTO_LONGO", OBRIGATORIO: "S" },
          { SECAO: "Resultado",     ORDEM: "3", PERGUNTA: "Equipamento voltou a funcionar?",  TIPO_RESPOSTA: "SIM_NAO",     OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S", BLOQUEIA_CONCLUSAO: "N" },
          { SECAO: "Resultado",     ORDEM: "4", PERGUNTA: "Necessita orcamento?",             TIPO_RESPOSTA: "SIM_NAO",     OBRIGATORIO: "S" },
          { SECAO: "Resultado",     ORDEM: "5", PERGUNTA: "Necessita retorno?",               TIPO_RESPOSTA: "SIM_NAO",     OBRIGATORIO: "S" },
          { SECAO: "Encerramento",  ORDEM: "6", PERGUNTA: "Assinatura do cliente",            TIPO_RESPOSTA: "ASSINATURA",  OBRIGATORIO: "S" }
        ];
        
        perguntasA.forEach(p => {
          SGO_OS_CHECKLIST.criarPergunta(sessionId, Object.assign({ MODELO_ID: midA }, p));
        });
        
        log.push(`ATENDIMENTO CORRETIVO GERAL: criado com ${perguntasA.length} perguntas. ID=${midA}`);
      } else {
        log.push(`ATENDIMENTO CORRETIVO GERAL: falha — ${modeloA.message}`);
      }
    } else {
      log.push("ATENDIMENTO CORRETIVO GERAL: ja existe, ignorado.");
    }

    /* =====================================================
       B) MANUTENCAO PREVENTIVA AUTOCLAVE
       TIPO_OS: MANUTENCAO_PREVENTIVA | TIPO_EQUIPAMENTO: AUTOCLAVE
    ====================================================== */
    if (nomesExistentes.indexOf("MANUTENCAO PREVENTIVA AUTOCLAVE") < 0) {
      const modeloB = SGO_OS_CHECKLIST.criarModelo(sessionId, {
        NOME: "MANUTENCAO PREVENTIVA AUTOCLAVE",
        TIPO_OS: "MANUTENCAO_PREVENTIVA",
        TIPO_EQUIPAMENTO: "AUTOCLAVE",
        DESCRICAO: "Checklist completo de manutencao preventiva para autoclave.",
        VERSAO: "1",
        STATUS: "ATIVO",
        EXIGE_FOTO: "S",
        EXIGE_ASSINATURA: "S",
        BLOQUEIA_SE_NAO_CONFORME: "N",
        PERMITE_CONCLUIR_SEM_QUESTIONARIO: "N"
      });

      if (modeloB.success) {
        const midB = modeloB.item.ID;
        const perguntasB = [
          { SECAO: "Identificacao",     ORDEM: "1",  PERGUNTA: "Foto da plaqueta",                                      TIPO_RESPOSTA: "FOTO",                     OBRIGATORIO: "S", EXIGE_FOTO_SE_NAO_OK: "S" },
          { SECAO: "Inspecao Visual",   ORDEM: "2",  PERGUNTA: "Limpeza geral interna e externa do equipamento",        TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Inspecao Visual",   ORDEM: "3",  PERGUNTA: "Condicoes do painel e etiquetas de identificacao",      TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Inspecao Eletrica", ORDEM: "4",  PERGUNTA: "Verificacao de cabos, conectores e terminais",          TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Instrumentacao",    ORDEM: "5",  PERGUNTA: "Teste dos sensores de temperatura e pressao",           TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Mecanica",          ORDEM: "6",  PERGUNTA: "Inspecao da guarnicao da porta",                        TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Mecanica",          ORDEM: "7",  PERGUNTA: "Estado e lubrificacao do mecanismo de travamento",      TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Vapor e Fluidos",   ORDEM: "8",  PERGUNTA: "Verificacao de vazamentos de vapor e ar comprimido",    TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Vapor e Fluidos",   ORDEM: "9",  PERGUNTA: "Integridade das mangueiras e conexoes",                 TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Vapor e Fluidos",   ORDEM: "10", PERGUNTA: "Inspecao das valvulas solenoides",                      TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Gerador de Vapor",  ORDEM: "11", PERGUNTA: "Inspecao do sensor de nivel do gerador de vapor",       TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Teste Final",       ORDEM: "12", PERGUNTA: "Teste funcional final",                                 TIPO_RESPOSTA: "CONFORME_NAO_CONFORME_NA", OBRIGATORIO: "S", EXIGE_OBSERVACAO_SE_NAO_OK: "S" },
          { SECAO: "Encerramento",      ORDEM: "13", PERGUNTA: "Relato do servico executado",                           TIPO_RESPOSTA: "TEXTO_LONGO",              OBRIGATORIO: "S" },
          { SECAO: "Encerramento",      ORDEM: "14", PERGUNTA: "Assinatura do cliente",                                 TIPO_RESPOSTA: "ASSINATURA",               OBRIGATORIO: "S" }
        ];
        
        perguntasB.forEach(p => {
          SGO_OS_CHECKLIST.criarPergunta(sessionId, Object.assign({ MODELO_ID: midB }, p));
        });
        
        log.push(`MANUTENCAO PREVENTIVA AUTOCLAVE: criado com ${perguntasB.length} perguntas. ID=${midB}`);
      } else {
        log.push(`MANUTENCAO PREVENTIVA AUTOCLAVE: falha — ${modeloB.message}`);
      }
    } else {
      log.push("MANUTENCAO PREVENTIVA AUTOCLAVE: ja existe, ignorado.");
    }

    log.forEach(l => Logger.log(`[SEED] ${l}`));
    return { success: true, log: log };

  } catch (e) {
    Logger.log(`[SEED] Erro: ${e.message}`);
    return { success: false, message: `Erro no seed: ${e.message}` };
  }
}

/* --- 6. Aliases legados (compatibilidade com JS_OS.html existente) --- */
function osChecklistListarTemplates(sessionId, tipoOs) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.listarTemplates(sessionId, tipoOs)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function osChecklistSalvarTemplate(sessionId, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_OS_CHECKLIST.salvarTemplate(sessionId, payload)));
  } catch (e) {
    return { success: false, message: `Erro: ${e.message}` };
  }
}

function osChecklistListarRespostas(sessionId, osId) {
  return checklistRespostasListarPorOS(sessionId, osId);
}

function osChecklistSalvarRespostas(sessionId, osId, respostas) {
  return checklistRespostasSalvar(sessionId, { OS_ID: osId, RESPOSTAS: respostas });
}

/* ================================================================
   FUNÇÃO TEMPORÁRIA DE TESTE — remover após validação
================================================================= */
function testeSeedQuestionariosOS() {
  const USUARIO = "COLOCAR_USUARIO_AQUI";
  const SENHA   = "COLOCAR_SENHA_AQUI";

  Logger.log("=== testeSeedQuestionariosOS ===");

  const auth = login(USUARIO, SENHA);
  if (!auth || !auth.success) {
    Logger.log(`ERRO no login: ${auth ? auth.message : "resposta nula"}`);
    return;
  }

  Logger.log(`Login OK. Usuario: ${auth.usuario} | Perfil: ${auth.perfil}`);

  const resultado = checklistSeedQuestionariosIniciais(auth.sessionId);

  Logger.log(`success: ${resultado.success}`);
  if (resultado.message) Logger.log(`message: ${resultado.message}`);

  (resultado.log || []).forEach(linha => {
    Logger.log(`  >> ${linha}`);
  });

  Logger.log("=== fim ===");
}