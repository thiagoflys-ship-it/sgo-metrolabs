/****************************************************
 * PROGRAMA DE CONDUTA, PONTUAÇÃO E BONIFICAÇÃO — SETUP
 *
 * Traduz a seção 9 do briefing (migrate/setup/rollback, padrão SQL) pro
 * modelo real do Portal (Google Sheets como banco, sem ORM):
 *  - Conduta_migrate_()  — cria/completa as abas próprias, idempotente
 *    (mesmo padrão de CertCal_garantirTabela_/garantirColuna_ usado por
 *    Auvo/CertCal/Qualidade — NUNCA usar setupSGO() aqui, ele limpa
 *    todas as abas que gerencia).
 *  - Conduta_setup_()    — roda a migração, carrega o seed (catálogo de
 *    86 ocorrências + 15 eventos positivos + 15 parâmetros + 14
 *    distâncias de referência do ANX-CAT-001 Rev.00), só se as tabelas
 *    de catálogo ainda estiverem vazias (não duplica em reexecução).
 *  - Conduta_rollback_() — remove só as abas qual_*, não toca em mais
 *    nada do Portal.
 *
 * 10 abas próprias, prefixo qual_ (evita colisão com QUALIDADE_* do
 * módulo de Pendências/Cobrança-Elogio do Auvo, que é outro módulo,
 * decisão confirmada com o usuário — ver plano de implementação):
 *  Catálogo (seed): qual_parametro, qual_ocorrencia_tipo,
 *    qual_evento_positivo_tipo, qual_distancia_referencia.
 *  Transacional: qual_ocorrencia, qual_evento_positivo, qual_missao,
 *    qual_ausencia, qual_fechamento, qual_relatorio.
 ****************************************************/

var CONDUTA_SHEETS = Object.freeze({
  PARAMETRO: 'qual_parametro',
  OCORRENCIA_TIPO: 'qual_ocorrencia_tipo',
  EVENTO_POSITIVO_TIPO: 'qual_evento_positivo_tipo',
  DISTANCIA_REFERENCIA: 'qual_distancia_referencia',
  OCORRENCIA: 'qual_ocorrencia',
  EVENTO_POSITIVO: 'qual_evento_positivo',
  MISSAO: 'qual_missao',
  AUSENCIA: 'qual_ausencia',
  FECHAMENTO: 'qual_fechamento',
  RELATORIO: 'qual_relatorio'
});

// ------------------------------------------------------------
// MIGRAÇÃO — cria as 9 abas sob demanda, idempotente
// ------------------------------------------------------------
function Conduta_migrate_() {
  CertCal_garantirTabela_(CONDUTA_SHEETS.PARAMETRO, [
    'ID', 'CHAVE', 'VALOR', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.OCORRENCIA_TIPO, [
    'ID', 'CODIGO', 'GRUPO', 'AREA', 'DESCRICAO', 'NIVEL', 'PESO_ICO',
    'CANCELA_BONUS', 'PONTOS_PLACAR', 'REINCIDIVEL', 'ATIVO', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO, [
    'ID', 'CODIGO', 'AREA', 'DESCRICAO', 'PONTOS_PLACAR', 'ATIVO', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.DISTANCIA_REFERENCIA, [
    'ID', 'DESTINO', 'KM_TRECHO', 'QUALIFICA', 'CLIENTE_ID', 'CNPJ', 'ORIGEM', 'CRIADO_EM'
  ]);

  // MISSAO_ID (opcional): vincula a ocorrência a uma missão específica —
  // usado no fechamento pra implementar a regra do briefing "incentivo
  // não é pago se há ocorrência do próprio executante ligada àquela
  // missão" (pseudocódigo seção 5, ocorrencia_do_executante_na_missao).
  CertCal_garantirTabela_(CONDUTA_SHEETS.OCORRENCIA, [
    'ID', 'TIPO_CODIGO', 'COLABORADOR_ID', 'FISCAL_ID', 'DATA_FATO', 'COMPETENCIA',
    'STATUS', 'NIVEL_APLICADO', 'PESO_APLICADO', 'REINCIDENCIA_DE_ID',
    'PRAZO_HOMOLOGACAO', 'HOMOLOGADA_EM', 'HOMOLOGADA_POR',
    'PRAZO_CONTESTACAO', 'CONTESTADA_EM', 'TEXTO_CONTESTACAO',
    'PRAZO_JULGAMENTO', 'JULGADA_EM', 'JULGADA_POR', 'TEXTO_JULGAMENTO',
    'PRAZO_RECURSO', 'RECURSO_EM', 'TEXTO_RECURSO',
    'FIRME_EM', 'ANULADA_EM', 'DESCARTADA_EM', 'FOTO_URL', 'FOTO_LEGENDA', 'MISSAO_ID', 'CRIADO_EM'
  ]);

  // Eventos positivos registrados (distinto do catálogo qual_evento_positivo_tipo):
  // sem homologação/contestação no briefing — registro direto (gestor ou
  // autorregistro), soma no placar individual do mês, nunca entra em D/ICO.
  CertCal_garantirTabela_(CONDUTA_SHEETS.EVENTO_POSITIVO, [
    'ID', 'TIPO_CODIGO', 'COLABORADOR_ID', 'DATA_FATO', 'COMPETENCIA',
    'REGISTRADO_POR', 'TIPO_ALVO', 'GRUPO_NOME', 'TEXTO_RECONHECIMENTO',
    'DESTINATARIOS_JSON', 'VISIBILIDADE', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.MISSAO, [
    'ID', 'COMPETENCIA', 'CLIENTE_ID', 'DESTINO', 'KM_TRECHO', 'QUALIFICA',
    'DATA', 'EXECUTANTE_1_ID', 'EXECUTANTE_2_ID', 'AUVO_TASK_ID',
    'REGISTRADO_POR', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.AUSENCIA, [
    'ID', 'COLABORADOR_ID', 'DATA_INICIO', 'DATA_FIM', 'TIPO', 'REGISTRADO_POR', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.FECHAMENTO, [
    'ID', 'COMPETENCIA', 'D', 'N', 'ICO', 'FAROL', 'TEM_GG', 'SOMBRA',
    'CONGELADO', 'RESULTADO_JSON', 'FECHADO_EM', 'FECHADO_POR', 'CRIADO_EM'
  ]);

  CertCal_garantirTabela_(CONDUTA_SHEETS.RELATORIO, [
    'ID', 'COMPETENCIA', 'HTML', 'CONTEXTO_JSON', 'GERADO_EM', 'TIPO',
    'PERIODO_INICIO', 'PERIODO_FIM', 'VISIBILIDADE', 'CRIADO_EM'
  ]);

  // Datas em texto (dd/mm/aaaa em telas, mas gravamos sempre ISO
  // yyyy-mm-dd nessas colunas) — trava formato pra evitar o Sheets
  // "ajudando" e convertendo string em Date sozinho (mesma armadilha já
  // documentada no CertCal, ver CertCal_forcarColunaTexto_).
  // FOTO_LEGENDA adicionada depois do 1o deploy em produção (2026-09-02)
  // — garante a coluna em instalações que já tinham a aba sem ela.
  CertCal_garantirColuna_(CONDUTA_SHEETS.OCORRENCIA, 'FOTO_LEGENDA');
  ['CLIENTE_ID','CNPJ','ORIGEM'].forEach(function(c){ CertCal_garantirColuna_(CONDUTA_SHEETS.DISTANCIA_REFERENCIA,c); });
  ['TIPO_ALVO','GRUPO_NOME','TEXTO_RECONHECIMENTO','DESTINATARIOS_JSON','VISIBILIDADE'].forEach(function(c){ CertCal_garantirColuna_(CONDUTA_SHEETS.EVENTO_POSITIVO,c); });
  ['TIPO','PERIODO_INICIO','PERIODO_FIM','VISIBILIDADE'].forEach(function(c){ CertCal_garantirColuna_(CONDUTA_SHEETS.RELATORIO,c); });

  // CORREÇÃO 2026-09-24 — a lista ganhou COMPETENCIA e as colunas de prazo.
  // 'YYYY-MM' também é "parecido com data" pro Sheets: ele convertia
  // '2026-09' no dia 01/09/2026, a leitura devolvia '2026-09-01T00:00:00'
  // e NENHUMA comparação por competência batia — o registro sumia do
  // contador, do placar, do farol e do fechamento sem dar erro nenhum.
  // (O código também normaliza na leitura, porque mudar o formato da
  // coluna NÃO converte o que já foi gravado como Date.)
  //
  // O bloco inteiro passou a rodar UMA vez por instalação, atrás de uma
  // flag em ScriptProperties. Motivo: Conduta_migrate_() roda no topo de
  // TODA chamada de API, e cada CertCal_forcarColunaTexto_ faz uma leitura
  // de getNumberFormat() no Sheets pra decidir se precisa agir. Eram 5
  // leituras por clique; com as 9 novas seriam 14 — exatamente o padrão
  // que já travou o módulo Frota sob uso concorrente (o incidente está
  // documentado no comentário do próprio helper). Com a flag, o custo em
  // regime é zero leitura de planilha.
  var propsFmt = PropertiesService.getScriptProperties();
  if (propsFmt.getProperty('CONDUTA_COLUNAS_TEXTO_V3') !== '1') {
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, 'DATA_FATO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.EVENTO_POSITIVO, 'DATA_FATO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.MISSAO, 'DATA');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.AUSENCIA, 'DATA_INICIO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.AUSENCIA, 'DATA_FIM');

    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, 'COMPETENCIA');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, 'PRAZO_HOMOLOGACAO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, 'PRAZO_CONTESTACAO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, 'PRAZO_RECURSO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, 'HOMOLOGADA_EM');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.EVENTO_POSITIVO, 'COMPETENCIA');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.MISSAO, 'COMPETENCIA');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.FECHAMENTO, 'COMPETENCIA');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.RELATORIO, 'COMPETENCIA');

    // Estas duas SÃO lidas e mostradas na tela ("Fechado em" / "Gerado em"):
    // sem proteção, o Sheets converte a string gravada e a coluna passa a
    // exibir 2026-09-24T00:00:00 em TODA linha, não só nas antigas.
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.FECHAMENTO, 'FECHADO_EM');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.RELATORIO, 'GERADO_EM');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.RELATORIO, 'PERIODO_INICIO');
    CertCal_forcarColunaTexto_(CONDUTA_SHEETS.RELATORIO, 'PERIODO_FIM');
    // Ainda não são comparadas como data, mas já ficam protegidas para não
    // nascerem quebradas quando forem.
    ['CONTESTADA_EM', 'JULGADA_EM', 'RECURSO_EM', 'PRAZO_JULGAMENTO'].forEach(function (c) {
      CertCal_forcarColunaTexto_(CONDUTA_SHEETS.OCORRENCIA, c);
    });

    propsFmt.setProperty('CONDUTA_COLUNAS_TEXTO_V3', '1');
  }
}

// ------------------------------------------------------------
// SEED — catálogo do ANX-CAT-001 Rev.00 (seed_programa.json), embutido
// pra não depender de leitura de arquivo externo em runtime.
// ------------------------------------------------------------

var CONDUTA_SEED_PARAMETROS = Object.freeze({
  K_SENSIBILIDADE: '5.0',
  ICO_VERDE_MIN: '85.0',
  ICO_AMARELO_MIN: '70.0',
  JANELA_REINCIDENCIA_DIAS: '90',
  MISSAO_KM_MINIMO: '200',
  VALOR_BONUS_COLETIVO: '300.0',
  VALOR_INCENTIVO_MISSAO: '300.0',
  PRAZO_REGISTRO_DIAS_UTEIS: '2',
  PRAZO_HOMOLOGACAO_DIAS_UTEIS: '3',
  PRAZO_CONTESTACAO_DIAS_UTEIS: '3',
  PRAZO_JULGAMENTO_DIAS_UTEIS: '5',
  PRAZO_RECURSO_DIAS_UTEIS: '2',
  PRAZO_FECHAMENTO_DIAS_UTEIS: '7',
  SEDE_ENDERECO: 'Rua C-155, 789, Setor Jardim America, Goiania/GO',
  MODO_SOMBRA_ATE: '2026-10-31'
});

// [codigo, grupo, area, descricao, nivel, peso_ico, cancela_bonus, pontos_placar, reincidivel]
var CONDUTA_SEED_OCORRENCIAS = Object.freeze([
  ['AMB-01', 'Ambiente', 'Todos', 'Luz acesa sem necessidade após o expediente', 'L', 2, false, -3, true],
  ['AMB-02', 'Ambiente', 'Todos', 'Ar-condicionado ligado com porta ou janela aberta', 'L', 2, false, -3, true],
  ['AMB-03', 'Ambiente', 'Todos', 'Torneira aberta / desperdício de água', 'L', 2, false, -3, true],
  ['AMB-04', 'Ambiente', 'Todos', 'Checklist de fechamento não preenchido', 'L', 2, false, -3, true],
  ['AMB-05', 'Ambiente', 'Todos', 'Porta ou portão deixado destrancado ao sair', 'M', 8, false, -10, true],
  ['AMB-06', 'Ambiente', 'Todos', 'Equipamento elétrico ligado no fim do expediente', 'L', 2, false, -3, true],
  ['COZ-01', 'Cozinha', 'Todos', 'Louça deixada na pia', 'L', 2, false, -3, true],
  ['COZ-02', 'Cozinha', 'Todos', 'Marmita ou alimento abandonado na geladeira', 'L', 2, false, -3, true],
  ['COZ-03', 'Cozinha', 'Todos', 'Lixo não descartado ao encher', 'L', 2, false, -3, true],
  ['COZ-04', 'Cozinha', 'Todos', 'Bancada da cozinha suja após o uso', 'L', 2, false, -3, true],
  ['COZ-05', 'Cozinha', 'Todos', 'Reincidência de cozinha em desordem no mesmo mês', 'LR', 5, false, -6, false],
  ['BAN-01', 'Banheiro', 'Todos', 'Banheiro deixado sujo após o uso', 'L', 2, false, -3, true],
  ['BAN-02', 'Banheiro', 'Todos', 'Falta de reposição não comunicada', 'L', 2, false, -2, true],
  ['BAN-03', 'Banheiro', 'Todos', 'Reincidência de banheiro em má condição', 'LR', 5, false, -6, false],
  ['OFI-01', 'Oficina', 'Tecnica', 'Bancada abandonada desorganizada', 'L', 2, false, -3, true],
  ['OFI-02', 'Oficina', 'Tecnica', 'Ferramenta fora do local definido', 'L', 2, false, -3, true],
  ['OFI-03', 'Oficina', 'Tecnica', 'Ferramenta não devolvida após o uso (mesmo dia)', 'L', 2, false, -3, true],
  ['OFI-04', 'Oficina', 'Tecnica', 'Ferramenta emprestada sem registro', 'M', 8, false, -10, true],
  ['OFI-05', 'Oficina', 'Tecnica', 'Ferramenta esquecida ou abandonada no cliente', 'M', 8, false, -12, true],
  ['OFI-06', 'Oficina', 'Tecnica', 'Guarda inadequada de ferramenta (exposta, úmida, suja)', 'M', 8, false, -10, true],
  ['OFI-07', 'Oficina', 'Tecnica', 'Ferramenta extraviada — não localizada', 'G', 30, false, -20, false],
  ['OFI-08', 'Oficina', 'Tecnica', 'Quebra de ferramenta por negligência', 'G', 30, false, -20, false],
  ['OFI-09', 'Oficina', 'Tecnica', 'Uso de ferramenta improvisada ou inadequada', 'M', 8, false, -10, true],
  ['OFI-10', 'Oficina', 'Tecnica', 'Desorganização recorrente da oficina', 'MR', 15, false, -10, false],
  ['MET-01', 'Metrologia', 'Metrologia', 'Dano em instrumento metrológico', 'GG', 0, true, -30, false],
  ['MET-02', 'Metrologia', 'Metrologia', 'Instrumento com calibração vencida usado em serviço', 'GG', 0, true, -30, false],
  ['MET-03', 'Metrologia', 'Metrologia', 'Instrumento guardado sem estojo ou proteção', 'M', 8, false, -10, true],
  ['MET-04', 'Metrologia', 'Metrologia', 'Certificado emitido com erro detectado pelo cliente', 'M', 8, false, -12, true],
  ['MET-05', 'Metrologia', 'Metrologia', 'Certificado sem validação da gestora', 'M', 8, false, -12, true],
  ['MET-06', 'Metrologia', 'Metrologia', 'Padrão usado sem verificação de validade', 'GG', 0, true, -30, false],
  ['MET-07', 'Metrologia', 'Metrologia', 'Dados brutos não arquivados', 'M', 8, false, -10, true],
  ['VEI-01', 'Veiculos', 'Todos', 'Veículo devolvido sujo internamente', 'L', 2, false, -3, true],
  ['VEI-02', 'Veiculos', 'Todos', 'Lixo deixado dentro do veículo', 'L', 2, false, -3, true],
  ['VEI-03', 'Veiculos', 'Todos', 'Veículo estacionado de forma irregular ou atrapalhando', 'L', 2, false, -3, true],
  ['VEI-04', 'Veiculos', 'Todos', 'Check de saída ou de retorno não realizado', 'M', 8, false, -8, true],
  ['VEI-05', 'Veiculos', 'Todos', 'Abastecimento sem comprovante', 'M', 8, false, -8, true],
  ['VEI-06', 'Veiculos', 'Todos', 'Multa de trânsito', 'G', 30, false, -25, false],
  ['VEI-07', 'Veiculos', 'Todos', 'Condutor de multa não informado no prazo legal', 'GG', 0, true, -30, false],
  ['VEI-08', 'Veiculos', 'Todos', 'Dano ao veículo por imprudência', 'GG', 0, true, -30, false],
  ['VEI-09', 'Veiculos', 'Todos', 'Uso pessoal não autorizado do veículo', 'GG', 0, true, -30, false],
  ['VEI-10', 'Veiculos', 'Todos', 'Dano não comunicado (descoberto depois)', 'GG', 0, true, -30, false],
  ['CAM-01', 'Campo', 'Tecnica', 'Ausência de evidência fotográfica mínima', 'M', 8, false, -10, true],
  ['CAM-02', 'Campo', 'Tecnica', 'Relatório inconsistente', 'M', 8, false, -10, true],
  ['CAM-03', 'Campo', 'Tecnica', 'Retorno Tipo A — retorno causado por erro da equipe', 'M', 8, false, -15, true],
  ['CAM-04', 'Campo', 'Tecnica', 'Incidente técnico durante a intervenção', 'G', 30, false, -20, false],
  ['CAM-05', 'Campo', 'Tecnica', 'Omissão de fato relevante', 'G', 30, false, -20, false],
  ['CAM-06', 'Campo', 'Tecnica', 'Intervenção sem diagnóstico prévio', 'M', 8, false, -12, true],
  ['CAM-07', 'Campo', 'Tecnica', 'Teste final não executado', 'M', 8, false, -12, true],
  ['CAM-08', 'Campo', 'Tecnica', 'Reclamação procedente do cliente', 'M', 8, false, -12, true],
  ['COM-01', 'Comercial', 'Comercial', 'Demanda não registrada em canal oficial', 'M', 8, false, -10, true],
  ['COM-02', 'Comercial', 'Comercial', 'Proposta enviada sem validação técnica do escopo', 'M', 8, false, -12, true],
  ['COM-03', 'Comercial', 'Comercial', 'Prazo técnico prometido sem validação', 'M', 8, false, -12, true],
  ['COM-04', 'Comercial', 'Comercial', 'Serviço executado sem aceite formal do cliente', 'M', 8, false, -12, true],
  ['COM-05', 'Comercial', 'Comercial', 'Erro de escopo que gera retrabalho técnico', 'M', 8, false, -12, true],
  ['COM-06', 'Comercial', 'Comercial', 'Promessa comercial fora da capacidade real', 'G', 30, false, -25, false],
  ['FIN-01', 'Financeiro', 'Financeiro', 'Faturamento sem origem rastreável', 'GG', 0, true, -25, false],
  ['FIN-02', 'Financeiro', 'Financeiro', 'Compra sem especificação formal da área técnica', 'M', 8, false, -12, true],
  ['FIN-03', 'Financeiro', 'Financeiro', 'Compra errada por falta de conferência', 'M', 8, false, -12, true],
  ['FIN-04', 'Financeiro', 'Financeiro', 'Nota fiscal com descritivo incompatível com o escopo', 'M', 8, false, -10, true],
  ['FIN-05', 'Financeiro', 'Financeiro', 'Título vencido sem ação de cobrança registrada', 'M', 8, false, -8, true],
  ['FIN-06', 'Financeiro', 'Financeiro', 'Pagamento em duplicidade', 'G', 30, false, -25, false],
  ['LOG-01', 'Logistica', 'Logistica', 'Recebimento sem conferência de integridade', 'M', 8, false, -10, true],
  ['LOG-02', 'Logistica', 'Logistica', 'Expedição sem rastreio ou comprovante', 'M', 8, false, -10, true],
  ['LOG-03', 'Logistica', 'Logistica', 'Item extraviado no estoque', 'G', 30, false, -20, false],
  ['LOG-04', 'Logistica', 'Logistica', 'Estoque desorganizado — item não localizável', 'M', 8, false, -8, true],
  ['LOG-05', 'Logistica', 'Logistica', 'Embalagem inadequada com dano no transporte', 'M', 8, false, -12, true],
  ['RH-01', 'Pessoas', 'RH', 'Atraso sem comunicação prévia', 'L', 2, false, -3, true],
  ['RH-02', 'Pessoas', 'RH', 'Atraso recorrente no mês', 'LR', 5, false, -8, false],
  ['RH-03', 'Pessoas', 'RH', 'Falta sem comunicação', 'M', 8, false, -10, true],
  ['RH-04', 'Pessoas', 'RH', 'Uso de celular incompatível com a função', 'L', 2, false, -3, true],
  ['RH-05', 'Pessoas', 'RH', 'Conduta desrespeitosa com colega ou cliente', 'GG', 0, true, -30, false],
  ['RH-06', 'Pessoas', 'RH', 'Treinamento obrigatório não realizado no prazo', 'M', 8, false, -8, true],
  ['SEG-01', 'Seguranca', 'Todos', 'EPI não utilizado em atividade que o exige', 'GG', 0, true, -25, false],
  ['SEG-02', 'Seguranca', 'Todos', 'Trabalho em altura ou espaço confinado sem permissão', 'GG', 0, true, -30, false],
  ['SEG-03', 'Seguranca', 'Todos', 'Acidente sem afastamento não comunicado', 'GG', 0, true, -30, false],
  ['QUA-01', 'Qualidade', 'Qualidade', 'Uso de modelo ou POP fora do padrão controlado', 'M', 8, false, -10, true],
  ['QUA-02', 'Qualidade', 'Qualidade', 'Documento emitido sem revisão da Qualidade', 'M', 8, false, -12, true],
  ['QUA-03', 'Qualidade', 'Qualidade', 'Registro não arquivado ou não recuperável', 'M', 8, false, -10, true],
  ['QUA-04', 'Qualidade', 'Qualidade', 'Documento enviado ao cliente com erro técnico', 'GG', 0, true, -25, false],
  ['QUA-05', 'Qualidade', 'Qualidade', 'Não conformidade reincidente sem ação corretiva', 'MR', 15, false, -15, false],
  ['SIS-01', 'Sistemas', 'Todos', 'Compartilhamento de credencial de acesso', 'G', 30, false, -25, false],
  ['SIS-02', 'Sistemas', 'Todos', 'Divulgação indevida de informação de cliente', 'GG', 0, true, -30, false],
  ['SIS-03', 'Sistemas', 'Todos', 'Uso de sistema da empresa para fim pessoal', 'M', 8, false, -8, true],
  ['OCU-01', 'Integridade', 'Todos', 'Ocultação de erro', 'GG', 0, true, -40, false],
  ['OCU-02', 'Integridade', 'Todos', 'Tentativa de reclassificar erro próprio como falha independente', 'GG', 0, true, -40, false],
  ['OCU-03', 'Integridade', 'Todos', 'Prestação de informação falsa em contestação', 'GG', 0, true, -40, false]
]);

// [codigo, area, descricao, pontos_placar]
var CONDUTA_SEED_EVENTOS_POSITIVOS = Object.freeze([
  ['POS-01', 'Todos', 'Serviço correto, organizado e sem retrabalho', 10],
  ['POS-02', 'Todos', 'Organização exemplar do ambiente ou do setor', 5],
  ['POS-03', 'Todos', 'Cuidado visível com ferramentas, instrumentos ou veículos', 5],
  ['POS-04', 'Todos', 'Ajuda objetiva à equipe sem depender de cobrança', 5],
  ['POS-05', 'Todos', 'Mês inteiro sem ocorrências negativas', 10],
  ['POS-06', 'Tecnica', 'Problema resolvido na primeira visita', 10],
  ['POS-07', 'Tecnica', 'Relatório completo e coerente', 5],
  ['POS-08', 'Tecnica', 'Evidência correta e suficiente', 5],
  ['POS-09', 'Todos', 'Cliente sem reclamação procedente', 5],
  ['POS-10', 'Todos', 'Conduta proativa e organizada', 5],
  ['POS-11', 'Todos', 'Identificou e comunicou falha antes de virar problema', 10],
  ['POS-12', 'Todos', 'Sugestão de melhoria implementada', 10],
  ['POS-13', 'Todos', 'Economia real gerada para a empresa', 10],
  ['POS-14', 'Todos', 'Treinou ou capacitou colega formalmente', 5],
  ['POS-15', 'Qualidade', 'Documento aprovado sem retrabalho na revisão', 5]
]);

// [destino, km_trecho, qualifica]
var CONDUTA_SEED_DISTANCIAS = Object.freeze([
  ['Anapolis/GO', 57, false],
  ['Luziania/GO', 175, false],
  ['Itumbiara/GO', 200, true],
  ['Brasilia/DF', 209, true],
  ['Rio Verde/GO', 228, true],
  ['Uruacu/GO', 240, true],
  ['Catalao/GO', 261, true],
  ['Uberlandia/MG', 340, true],
  ['Porangatu/GO', 340, true],
  ['Barretos/SP', 490, true],
  ['Palmas/TO', 870, true],
  ['Cuiaba/MT', 900, true],
  ['Sao Paulo/SP', 926, true],
  ['Rio de Janeiro/RJ', 1340, true]
]);

/**
 * Carrega o seed só se as tabelas de catálogo ainda estiverem vazias —
 * idempotente por checagem de conteúdo (não por flag), pra rodar de
 * novo com segurança sem duplicar linha.
 */
function Conduta_carregarSeed_() {
  if (SGO_DATA.getAll(CONDUTA_SHEETS.PARAMETRO).length === 0) {
    var parametros = Object.keys(CONDUTA_SEED_PARAMETROS).map(function (chave) {
      return { CHAVE: chave, VALOR: CONDUTA_SEED_PARAMETROS[chave] };
    });
    SGO_DATA.insertMany(CONDUTA_SHEETS.PARAMETRO, parametros);
  }

  if (SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).length === 0) {
    var ocorrencias = CONDUTA_SEED_OCORRENCIAS.map(function (linha) {
      return {
        CODIGO: linha[0], GRUPO: linha[1], AREA: linha[2], DESCRICAO: linha[3],
        NIVEL: linha[4], PESO_ICO: linha[5], CANCELA_BONUS: linha[6],
        PONTOS_PLACAR: linha[7], REINCIDIVEL: linha[8], ATIVO: true
      };
    });
    SGO_DATA.insertMany(CONDUTA_SHEETS.OCORRENCIA_TIPO, ocorrencias);
  }

  if (SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO).length === 0) {
    var eventos = CONDUTA_SEED_EVENTOS_POSITIVOS.map(function (linha) {
      return { CODIGO: linha[0], AREA: linha[1], DESCRICAO: linha[2], PONTOS_PLACAR: linha[3], ATIVO: true };
    });
    SGO_DATA.insertMany(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO, eventos);
  }

  if (SGO_DATA.getAll(CONDUTA_SHEETS.DISTANCIA_REFERENCIA).length === 0) {
    var distancias = CONDUTA_SEED_DISTANCIAS.map(function (linha) {
      return { DESTINO: linha[0], KM_TRECHO: linha[1], QUALIFICA: linha[2] };
    });
    SGO_DATA.insertMany(CONDUTA_SHEETS.DISTANCIA_REFERENCIA, distancias);
  }
}

/**
 * Setup completo: migra o schema e carrega o seed. Chamado sob demanda
 * (primeira chamada de API do módulo), nunca via setupSGO() global.
 */
function Conduta_setup_() {
  Conduta_migrate_();
  Conduta_carregarSeed_();
}

/**
 * Remove só as 9 abas qual_* — não toca em nenhuma outra aba do Portal.
 * Uso excepcional (reset de ambiente de teste); nunca chamado
 * automaticamente por nenhum fluxo do módulo.
 */
function Conduta_rollback_() {
  var ss = SGO_DATA.getDB();
  Object.keys(CONDUTA_SHEETS).forEach(function (chave) {
    var nomeAba = CONDUTA_SHEETS[chave];
    var sheet = ss.getSheetByName(nomeAba);
    if (sheet) ss.deleteSheet(sheet);
    delete SGO_DATA._headersCache[nomeAba];
    delete SGO_DATA._headerMapCache[nomeAba];
  });
}

/**
 * Lê os parâmetros do programa como um objeto {CHAVE: valor} já
 * convertido pro tipo certo (número quando aplicável) — usado pelo
 * motor de fechamento em vez de espalhar SGO_DATA.getAll por todo lado.
 */
function Conduta_obterParametros_() {
  var linhas = SGO_DATA.getAll(CONDUTA_SHEETS.PARAMETRO);
  var mapa = {};
  linhas.forEach(function (l) {
    var chave = String(l.CHAVE || '').trim();
    if (!chave) return;
    mapa[chave] = l.VALOR;
  });
  return mapa;
}
