/****************************************************
 * SGO+ LICITAÇÕES — DOCUMENTOS DE HABILITAÇÃO DA EMPRESA (02/11/2026)
 *
 * Fonte das regras: docs/LICITACOES_03_REGRAS_NEGOCIO_20261101.md, seção A4 (lista de 27 documentos, com grupo, validade e
 * observação) e docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md (decisões do dono). Manual: docs/MANUAL_MODULO_LICITACOES.md,
 * seção "Documentos de habilitação".
 *
 * Decisões do dono que este arquivo segue:
 *   - CNPJ participante: SEMPRE a matriz de Goiânia; porte EPP (LC 123/2006: empate ficto e regularidade fiscal e trabalhista
 *     tardia, art. 43: a certidão é apresentada mesmo com restrição e há 5 dias úteis, prorrogáveis, depois de declarada
 *     vencedora para regularizar). A regularidade tardia NÃO dispensa o documento: só muda o texto da pendência.
 *   - A Metrolabs NÃO é acreditada RBC (ISO/IEC 17025): as calibrações são rastreáveis. Exigência de acreditação aparece como
 *     "falta", com o motivo, até existir documento cadastrado.
 *   - Registro/autorização do Inmetro para BALANÇAS e ESFIGMOMANÔMETROS: o escopo exato (reparo, manutenção ou verificação)
 *     ainda depende do documento. Até lá, a exigência de Inmetro fica sempre "a conferir".
 *   - "Se não está no SGO+, não existe": o cadastro é ÚNICO. Os certificados dos padrões (item 23 do doc 03) NÃO são cadastrados
 *     aqui: vêm de CAD_PADROES (Metrologia › Padrões de referência), só leitura. O SGO+ não tinha outro cadastro de documentos da
 *     empresa (DOC_DOCUMENTOS é dos equipamentos dos clientes; Frota guarda documentos de veículo; a Conduta guarda manuais).
 *
 * Partes:
 *   1. CADASTRO (LIC_HAB_DOCUMENTOS, uma linha por documento com o estado atual; LIC_HAB_VERSOES, uma linha por versão com a
 *      fotografia, o arquivo daquela versão e o hash). Mudar um campo ou trocar o arquivo = versão nova, motivo obrigatório;
 *      nada é apagado (não existe ação de apagar; "retirar de uso" também é versão). Arquivo guardado RESTRITO pelo serviço de
 *      arquivos do SGO+ (Drive do servidor, compartilhamento privado), com o SHA-256 dos bytes; ao abrir, o SHA-256 é conferido.
 *   2. VENCIMENTOS: situação calculada no dia de Brasília (vigente, vence em até 30, 15 ou 7 dias, vencido, sem validade). Os
 *      alertas usam a infra da etapa 3 (LIC_ALERTAS, SGO_Licitacoes_Alertas.js): mesmos destinatários, ciência, Central de
 *      alertas e tetos. Um aviso por faixa e por versão do documento (sem repetir; a faixa que já passou não sai). 30 e 15 dias:
 *      SGO+ e e-mail. 7 dias e vencido: também o WhatsApp oficial pelo modelo sgo_licitacao_prazo (previsto no doc 01 para
 *      "documento vencendo"; nenhum modelo novo na Meta). Avisos de validade saem das 8h às 18h (Brasília).
 *   3. CRUZAMENTO COM O EDITAL (aba "Habilitação" da ficha): cada exigência do checklist "O que realmente precisamos" da leitura
 *      (temas de habilitação) e da análise (exigências de documentação) recebe a SUGESTÃO do documento que atende, por REGRA DE
 *      PALAVRAS do código (LICH_TIPOS[].termos e as palavras extras do documento), nunca pela IA. Situação: atende, vence antes
 *      da sessão, falta ou a conferir. A Diretoria marca "atende" ou "não atende" com motivo (LIC_HAB_CONFERENCIAS, uma linha por
 *      decisão; a última vale; o histórico fica). Falta, vence antes da sessão ou "não atende" = pendência no Hoje e no Painel.
 *   4. RELAÇÃO PARA CONFERÊNCIA (LIC_HAB_PACOTES): lista dos documentos daquela licitação, com validade e SHA-256, em A4 HTML.
 *      Cada relação gerada é uma versão imutável (hash). NADA é enviado a portal.
 *
 * Ações: Licitacoes_api(sessionId, 'habilitacao', { op, ... }); só Diretoria e Administrador (o servidor confere em toda chamada).
 * Nenhuma função devolve Date cru; datas em texto ISO ou 'aaaa-mm-dd' (dia de Brasília).
 ****************************************************/

var LICH_REGRAS = 'LIC-HABILITACAO-2026-11-02.1';
var LICH_ABAS = { DOCUMENTOS: 'LIC_HAB_DOCUMENTOS', VERSOES: 'LIC_HAB_VERSOES', CONFERENCIAS: 'LIC_HAB_CONFERENCIAS', PACOTES: 'LIC_HAB_PACOTES' };
var LICH_COLUNAS = {
  LIC_HAB_DOCUMENTOS: ['ID', 'CODIGO', 'TIPO', 'NOME', 'CATEGORIA', 'NUMERO', 'EMISSAO', 'VALIDADE', 'ORGAO_EMISSOR', 'LINK_VERIFICACAO', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME',
    'OBS', 'ESCOPO', 'PALAVRAS', 'CONTRATANTE', 'CONTRATANTE_CNPJ', 'OBJETO', 'PERIODO_INICIO', 'PERIODO_FIM', 'SERVICOS_JSON', 'CAT_ACERVO', 'OS_REFERENCIA',
    'ARQUIVO_ID', 'ARQUIVO_NOME', 'ARQUIVO_TIPO', 'ARQUIVO_TAMANHO', 'ARQUIVO_SHA256', 'ARQUIVO_EM', 'ATIVO', 'VERSAO', 'VERSAO_ID', 'MOTIVO',
    'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_POR_NOME', 'CRIADO_EM'],
  // UMA LINHA POR VERSÃO: a fotografia do documento (DADOS_JSON) e o arquivo daquela versão; nunca muda depois de gravada
  LIC_HAB_VERSOES: ['ID', 'DOCUMENTO_ID', 'CODIGO', 'VERSAO', 'DADOS_JSON', 'MUDOU', 'MOTIVO', 'ARQUIVO_ID', 'ARQUIVO_NOME', 'ARQUIVO_SHA256', 'VALIDADE', 'POR_ID', 'POR_NOME', 'EM', 'HASH'],
  // UMA LINHA POR DECISÃO da Diretoria sobre uma exigência do edital (a de maior VERSAO vale; as anteriores são o histórico)
  LIC_HAB_CONFERENCIAS: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'CHAVE', 'EXIGENCIA_REF', 'EXIGENCIA_TEXTO', 'DECISAO', 'DOCUMENTO_ID', 'DOCUMENTO_CODIGO', 'DOCUMENTO_VERSAO',
    'MOTIVO', 'VERSAO', 'POR_ID', 'POR_NOME', 'EM', 'HASH'],
  // UMA LINHA POR RELAÇÃO GERADA (versão por oportunidade), imutável
  LIC_HAB_PACOTES: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'VERSAO', 'SESSAO_DIA', 'SESSAO_FONTE', 'ITENS_JSON', 'PENDENCIAS', 'RESUMO', 'POR_ID', 'POR_NOME', 'EM', 'HASH']
};
var LICH_COLUNAS_TEXTO = {
  LIC_HAB_DOCUMENTOS: ['CODIGO', 'NUMERO', 'EMISSAO', 'VALIDADE', 'CONTRATANTE_CNPJ', 'PERIODO_INICIO', 'PERIODO_FIM', 'ARQUIVO_SHA256', 'ARQUIVO_EM', 'CAT_ACERVO'],
  LIC_HAB_VERSOES: ['VALIDADE', 'ARQUIVO_SHA256', 'HASH', 'EM'], LIC_HAB_CONFERENCIAS: ['CHAVE', 'HASH', 'EM'], LIC_HAB_PACOTES: ['SESSAO_DIA', 'HASH', 'EM']
};
var LICH_CATEGORIAS = { JURIDICA: 'Habilitação jurídica', FISCAL: 'Fiscal, social e trabalhista', ECONOMICA: 'Econômico-financeira', TECNICA: 'Qualificação técnica', DECLARACAO: 'Declarações' };
/** Regra de validade (doc 03: "validade nunca é presumida: o SGO+ grava a data impressa no documento ou a regra do emissor"). */
var LICH_REGRAS_VALIDADE = {
  DATA: 'Data impressa no documento', SEM: 'Sem validade: vale a versão vigente', CERTAME: 'Por certame: emitida para cada licitação', EMITIR: 'Emitir na data (sem validade impressa)',
  EDITAL: 'A do edital (ou a data impressa)', EXERCICIO: 'Por exercício (até o balanço seguinte ser exigível)'
};
var LICH_PASTA = 'Licitações - Documentos de habilitação (restrito)';
var LICH_MAX_BASE64 = 14 * 1024 * 1024;     // ~10 MB de arquivo, o mesmo limite dos anexos de Compras
var LICH_RX_ARQUIVO = /\.(pdf|png|jpe?g|webp)$/i;
var LICH_TIPOS_ABRIR = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
var LICH_FAIXAS = [{ dias: 30, codigo: 'VENCE_30' }, { dias: 15, codigo: 'VENCE_15' }, { dias: 7, codigo: 'VENCE_7' }];
var LICH_PROGRAMAR_MIN = 30;                 // a programação dos avisos roda no máximo a cada 30 min (a rodada é de 5 em 5)
var LICH_MAX_EXIGENCIAS = 120;
/** Palavras que indicam documento alternativo na mesma exigência (texto sem acento). */
var LICH_RX_ALTERNATIVA = /( ou | salvo | exceto | substitui| dispensad| facultad)/;

/**
 * Os 27 documentos do doc 03 (seção A4, na mesma ordem e com o mesmo número em "item") mais os que o dono citou (Inmetro, porte
 * EPP) e o alvará, e "Outro documento". termos: palavras e expressões SEM ACENTO que, no texto da exigência, indicam o documento
 * (regra do código; plural simples vale). Termo curto e ambíguo ("art", "cnpj" sozinho) fica de fora de propósito.
 */
var LICH_TIPOS = [
  { codigo: 'CONTRATO_SOCIAL', item: 1, nome: 'Contrato social consolidado e alterações', categoria: 'JURIDICA', validade: 'SEM', obs: 'Alerta quando houver alteração contratual.',
    termos: ['contrato social', 'ato constitutivo', 'estatuto social', 'registro comercial', 'requerimento de empresario', 'alteracao contratual', 'alteracoes contratuais', 'consolidacao contratual', 'contrato consolidado', 'documento constitutivo'] },
  { codigo: 'CNPJ', item: 2, nome: 'Comprovante de inscrição no CNPJ (matriz de Goiânia)', categoria: 'FISCAL', validade: 'EMITIR', fiscal: true, obs: 'Sempre a matriz de Goiânia (decisão do dono).',
    termos: ['inscricao no cnpj', 'cartao cnpj', 'cadastro nacional da pessoa juridica', 'cadastro nacional de pessoa juridica', 'cadastro nacional de pessoas juridicas', 'cadastro nacional das pessoas juridicas'] },
  { codigo: 'PROCURACAO', item: 3, nome: 'Documento do administrador e procuração do representante', categoria: 'JURIDICA', validade: 'DATA', obs: 'Uma por plataforma quando exigido.',
    termos: ['procuracao', 'instrumento de mandato', 'documento de identidade', 'carteira de identidade', 'representante legal', 'credenciamento do representante'] },
  { codigo: 'CERTIDAO_JUNTA', item: 4, nome: 'Certidão simplificada da Junta Comercial', categoria: 'JURIDICA', validade: 'EDITAL', obs: 'Muitos editais pedem emissão em até 30 ou 90 dias.',
    termos: ['certidao simplificada', 'junta comercial'] },
  { codigo: 'INSCRICAO_EST_MUN', item: 5, nome: 'Inscrição estadual e municipal', categoria: 'FISCAL', validade: 'EMITIR', fiscal: true,
    termos: ['inscricao estadual', 'inscricao municipal', 'cadastro de contribuintes', 'cadastro de contribuinte', 'cadastro estadual', 'cadastro municipal'] },
  { codigo: 'CND_FEDERAL', item: 6, nome: 'Certidão conjunta Receita Federal e PGFN', categoria: 'FISCAL', validade: 'DATA', fiscal: true,
    termos: ['fazenda nacional', 'receita federal', 'divida ativa da uniao', 'tributos federais', 'certidao conjunta', 'pgfn', 'seguridade social'] },
  { codigo: 'CND_ESTADUAL', item: 7, nome: 'Certidão de débitos estaduais (GO)', categoria: 'FISCAL', validade: 'DATA', fiscal: true,
    termos: ['fazenda estadual', 'debitos estaduais', 'tributos estaduais', 'fazenda publica estadual', 'receita estadual', 'fazenda estadual ou distrital'] },
  { codigo: 'CND_MUNICIPAL', item: 8, nome: 'Certidão de débitos municipais (Goiânia)', categoria: 'FISCAL', validade: 'DATA', fiscal: true,
    termos: ['fazenda municipal', 'debitos municipais', 'tributos municipais', 'fazenda publica municipal'] },
  { codigo: 'CRF_FGTS', item: 9, nome: 'Certificado de regularidade do FGTS (CRF)', categoria: 'FISCAL', validade: 'DATA', fiscal: true, obs: 'Validade curta: é o que mais vence.',
    termos: ['fgts', 'fundo de garantia', 'crf'] },
  { codigo: 'CNDT', item: 10, nome: 'Certidão negativa de débitos trabalhistas (CNDT)', categoria: 'FISCAL', validade: 'DATA', fiscal: true,
    termos: ['debitos trabalhistas', 'cndt', 'justica do trabalho', 'regularidade trabalhista'] },
  { codigo: 'DECL_MENOR', item: 11, nome: 'Declaração de não empregar menor (CF, art. 7º, XXXIII)', categoria: 'DECLARACAO', validade: 'CERTAME', obs: 'Modelo do SGO+, assinada pela Diretoria.',
    termos: ['menor de 18', 'menores de 18', 'menor de dezoito', 'menores de dezoito', 'menor de 16', 'menores de 16', 'menor de dezesseis', 'menores de dezesseis', 'trabalho noturno perigoso ou insalubre', 'xxxiii do art 7'] },
  { codigo: 'DECL_PCD', item: 12, nome: 'Declaração de reserva de cargos para PcD e reabilitados', categoria: 'DECLARACAO', validade: 'CERTAME',
    termos: ['pessoa com deficiencia', 'pessoas com deficiencia', 'reabilitado da previdencia', 'reabilitados da previdencia', 'reserva de cargos'] },
  { codigo: 'DECL_CUSTOS', item: 13, nome: 'Declaração de que a proposta cobre todos os custos trabalhistas', categoria: 'DECLARACAO', validade: 'CERTAME',
    termos: ['integralidade dos custos', 'custos trabalhistas', 'cobre todos os custos', 'compreendem a integralidade'] },
  { codigo: 'BALANCO', item: 14, nome: 'Balanço patrimonial, DRE e demonstrações dos 2 últimos exercícios', categoria: 'ECONOMICA', validade: 'EXERCICIO', obs: 'O contador informa a data.',
    termos: ['balanco patrimonial', 'demonstracoes contabeis', 'demonstracao contabil', 'demonstracao do resultado', 'demonstracoes financeiras', 'dre'] },
  { codigo: 'INDICES', item: 15, nome: 'Índices contábeis do edital e declaração do contador', categoria: 'ECONOMICA', validade: 'EXERCICIO',
    termos: ['indice de liquidez', 'indices de liquidez', 'liquidez geral', 'liquidez corrente', 'solvencia geral', 'indices contabeis', 'indice contabil'] },
  { codigo: 'CERT_FALENCIA', item: 16, nome: 'Certidão negativa de falência e recuperação judicial', categoria: 'ECONOMICA', validade: 'EDITAL',
    termos: ['falencia', 'recuperacao judicial', 'recuperacao extrajudicial', 'concordata'] },
  { codigo: 'CAPITAL_PL', item: 17, nome: 'Capital social ou patrimônio líquido', categoria: 'ECONOMICA', validade: 'EXERCICIO', obs: 'Para conferir o limite de 10% do valor estimado.',
    termos: ['patrimonio liquido', 'capital social minimo', 'capital minimo'] },
  { codigo: 'ATESTADO', item: 18, nome: 'Atestado de capacidade técnica', categoria: 'TECNICA', validade: 'SEM', atestado: true, obs: 'Por serviço, quantidade, contratante, período e responsável técnico.',
    termos: ['atestado', 'capacidade tecnica', 'capacidade tecnico operacional', 'capacitacao tecnico operacional', 'aptidao para o desempenho'] },
  { codigo: 'REGISTRO_CONSELHO', item: 19, nome: 'Certidão de registro e quitação da empresa no conselho profissional', categoria: 'TECNICA', validade: 'DATA', obs: 'Quando o objeto exigir.',
    termos: ['crea', 'conselho regional', 'conselho profissional', 'entidade profissional competente', 'certidao de registro e quitacao', 'cft', 'conselho federal dos tecnicos'] },
  { codigo: 'RESPONSAVEL_TECNICO', item: 20, nome: 'Responsável técnico: registro no conselho, acervo técnico (CAT) e vínculo', categoria: 'TECNICA', validade: 'DATA', dependencia: 'o cadastro de RH técnico ainda não existe no SGO+ (dependência 2 do doc 01)',
    termos: ['responsavel tecnico', 'acervo tecnico', 'certidao de acervo', 'profissional legalmente habilitado', 'vinculo profissional', 'quadro permanente', 'engenheiro mecanico', 'engenheiro'] },
  { codigo: 'ART', item: 21, nome: 'ART do serviço', categoria: 'TECNICA', validade: 'CERTAME', obs: 'Emitida na execução.',
    termos: ['anotacao de responsabilidade tecnica', 'termo de responsabilidade tecnica'] },
  { codigo: 'ACREDITACAO_RBC', item: 22, nome: 'Acreditação de laboratório (Cgcre/Inmetro, ABNT NBR ISO/IEC 17025) com escopo', categoria: 'TECNICA', validade: 'DATA', escopo: true,
    obs: 'Escopo por grandeza e faixa. A Metrolabs não é acreditada RBC (decisão do dono, 01/11/2026).',
    termos: ['acreditado', 'acreditada', 'acreditacao', '17025', 'cgcre', 'rbc'] },
  { codigo: 'CERT_PADROES', item: 23, nome: 'Certificados de calibração dos padrões (rastreabilidade)', categoria: 'TECNICA', validade: 'DATA', fonte: 'PADROES',
    obs: 'Já existe em Metrologia › Padrões de referência (CAD_PADROES): não é cadastrado aqui.',
    termos: ['rastreabilidade', 'rastreavel', 'rastreaveis', 'certificado de calibracao dos padroes', 'certificados de calibracao dos padroes', 'padroes de referencia', 'padrao de referencia', 'padroes utilizados'] },
  { codigo: 'RELACAO_EQUIPE', item: 24, nome: 'Relação de equipe, instalações e aparelhamento', categoria: 'TECNICA', validade: 'CERTAME',
    termos: ['aparelhamento', 'instalacoes e equipamentos', 'equipe tecnica', 'pessoal tecnico', 'indicacao das instalacoes', 'relacao explicita'] },
  { codigo: 'DECL_VISTORIA', item: 25, nome: 'Declaração de vistoria ou de conhecimento das condições locais', categoria: 'DECLARACAO', validade: 'CERTAME', obs: 'A vistoria pode ser substituída por declaração (art. 63, § 3º).',
    termos: ['vistoria', 'visita tecnica', 'condicoes locais', 'conhecimento das condicoes', 'pleno conhecimento'] },
  { codigo: 'COMPROMISSOS', item: 26, nome: 'Relação de compromissos assumidos', categoria: 'ECONOMICA', validade: 'CERTAME',
    termos: ['compromissos assumidos', 'relacao de compromissos'] },
  { codigo: 'CADASTRO_FORNECEDOR', item: 27, nome: 'Cadastros de fornecedor: SICAF, cadastros estaduais e das plataformas', categoria: 'FISCAL', validade: 'DATA',
    termos: ['sicaf', 'certificado de registro cadastral', 'registro cadastral', 'cadastro de fornecedores', 'cagef', 'caufesp'] },   // 'crc' fica de fora: também é o registro do contador no CRC
  { codigo: 'INMETRO', item: 0, nome: 'Registro ou autorização do Inmetro (balanças e esfigmomanômetros)', categoria: 'TECNICA', validade: 'DATA', escopo: true,
    obs: 'Escopo exato do registro a confirmar com o documento (reparo, manutenção ou verificação), decisão do dono de 01/11/2026.',
    termos: ['inmetro', 'permissionaria', 'oficina autorizada', 'empresa autorizada', 'oficina permissionaria', 'autorizada pelo inmetro', 'registrada no inmetro'] },
  { codigo: 'ENQUADRAMENTO_EPP', item: 0, nome: 'Comprovação do enquadramento como EPP (LC 123/2006)', categoria: 'JURIDICA', validade: 'EDITAL', obs: 'A matriz é EPP (decisão do dono, 01/11/2026).',
    termos: ['empresa de pequeno porte', 'enquadramento', 'lei complementar 123', 'lei complementar n 123', 'lc 123', 'microempresa'] },
  { codigo: 'ALVARA', item: 0, nome: 'Alvará de funcionamento ou licença sanitária', categoria: 'TECNICA', validade: 'DATA',
    termos: ['alvara', 'licenca de funcionamento', 'licenca sanitaria', 'vigilancia sanitaria'] },
  { codigo: 'OUTRO', item: 0, nome: 'Outro documento', categoria: '', validade: 'DATA', termos: [] }
];
/** Temas da leitura do edital (LIC_LEIT_TEMAS) que são de habilitação. */
var LICH_TEMAS_HAB = ['HAB_JURIDICA', 'HAB_FISCAL', 'HAB_ECONOMICA', 'QUALIFICACAO_TECNICA', 'ATESTADOS', 'EQUIPE_RT', 'RBC_INMETRO', 'VISITA_TECNICA'];
var LICH_SITUACOES = {
  VENCIDO: { nome: 'Vencido', cor: 'vermelho', ordem: 1 }, VENCE_7: { nome: 'Vence em até 7 dias', cor: 'vermelho', ordem: 2 }, VENCE_15: { nome: 'Vence em até 15 dias', cor: 'laranja', ordem: 3 },
  VENCE_30: { nome: 'Vence em até 30 dias', cor: 'laranja', ordem: 4 }, VIGENTE: { nome: 'Vigente', cor: 'verde', ordem: 5 }, SEM_VALIDADE: { nome: 'Sem validade', cor: 'cinza', ordem: 6 }
};
/** Situação de uma exigência do edital (sugestão do sistema ou decisão da Diretoria); peso = gravidade. */
var LICH_CRUZ = {
  FALTA: { nome: 'Falta', cor: 'vermelho', peso: 5, pendencia: true }, NAO_ATENDE: { nome: 'Não atende (Diretoria)', cor: 'vermelho', peso: 5, pendencia: true },
  VENCE_ANTES: { nome: 'Vence antes da sessão', cor: 'vermelho', peso: 4, pendencia: true }, A_CONFERIR: { nome: 'A conferir', cor: 'laranja', peso: 2 },
  ATENDE: { nome: 'Atende', cor: 'verde', peso: 1 }
};
/** Situações da oportunidade em que a habilitação é acompanhada (a partir da análise; o radar ainda não é decisão). */
var LICH_SITUACOES_OP = ['ANALISE', 'DECISAO', 'PROPOSTA', 'DISPUTA'];

// ------------------------------------------------------------ utilitários
function LicH_tipo_(codigo) { var c = Lic_up_(codigo); return LICH_TIPOS.filter(function (t) { return t.codigo === c; })[0] || null; }
/** Texto livre gravado: corta e nunca começa com = + - @ (a célula não vira fórmula). */
function LicH_txt_(v, max) { return Lic_texto_(Lic_s_(v).replace(/^[=+\-@\s]+/, ''), max || 500); }
function LicH_norm_(t) {
  var s = Lic_s_(t).toLowerCase();
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}
/** O termo (já sem acento) aparece no texto normalizado como palavra ou expressão inteira, com o plural simples. */
function LicH_tem_(normPad, termo) {
  var t = LicH_norm_(termo);
  if (!t) return false;
  return normPad.indexOf(' ' + t + ' ') >= 0 || normPad.indexOf(' ' + t + 's ') >= 0 || normPad.indexOf(' ' + t + 'es ') >= 0;
}
function LicH_hex_(bytes) { return (bytes || []).map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }
function LicH_shaBytes_(bytes) { return LicH_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)); }
/** Dia de hoje em Brasília (aaaa-mm-dd). */
function LicH_hoje_(ms) {
  var iso = new Date(ms === undefined ? Date.now() : ms).toISOString();
  if (typeof Lic_diaSp_ === 'function') { var d = Lic_diaSp_(iso); if (d) return d; }
  return new Date(Date.parse(iso) - 3 * 3600e3).toISOString().slice(0, 10);
}
/** 'aaaa-mm-dd' válido ou '' (aceita também dd/mm/aaaa). */
function LicH_dia_(v) {
  var t = Lic_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t) || null;
  if (!m) { var b = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t); if (b) m = [t, b[3], b[2], b[1]]; }
  if (!m) return '';
  var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? m[1] + '-' + m[2] + '-' + m[3] : '';
}
function LicH_br_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(Lic_s_(dia)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function LicH_diasEntre_(de, ate) { return Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5); }
function LicH_brHora_(iso) {
  var ms = Date.parse(Lic_s_(iso)); if (!isFinite(ms)) return '';
  if (typeof Lic_brDiaHora_ === 'function') { var x = Lic_brDiaHora_(iso); if (x) return x; }
  var t = new Date(ms - 3 * 3600e3).toISOString(); return t.slice(8, 10) + '/' + t.slice(5, 7) + '/' + t.slice(0, 4) + ' ' + t.slice(11, 16);
}
/** Fim do dia de Brasília (23:59) em ISO: o último instante em que o documento ainda vale. */
function LicH_fimDoDia_(dia) { return new Date(Date.parse(dia + 'T23:59:00-03:00')).toISOString(); }
function LicH_esc_(v) { return Lic_s_(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

function LicH_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICH_ABAS_OK_V1')) return; } catch (e) {}
  Object.keys(LICH_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LICH_COLUNAS[aba]);
    LICH_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LICH_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LICH_ABAS_OK_V1', '1', 21600); } catch (e) {}
}

// ------------------------------------------------------------ 2. situação de validade
/**
 * Situação de um documento no dia de Brasília: { codigo, nome, cor, dias, texto }. Sem data de validade: SEM_VALIDADE com o
 * texto da regra (por certame, emitir na data, sem validade, a do edital) ou "validade não informada" quando a regra é a data
 * impressa e ela falta.
 */
function LicH_situacao_(doc, hoje) {
  hoje = hoje || LicH_hoje_();
  var t = LicH_tipo_(doc.TIPO) || LicH_tipo_('OUTRO'), val = LicH_dia_(doc.VALIDADE);
  if (!val) {
    var txt = t.validade === 'DATA' ? 'Validade não informada: escreva a data impressa no documento' : LICH_REGRAS_VALIDADE[t.validade] || 'Sem validade';
    return { codigo: 'SEM_VALIDADE', nome: LICH_SITUACOES.SEM_VALIDADE.nome, cor: t.validade === 'DATA' ? 'laranja' : 'cinza', dias: null, texto: txt, faltaData: t.validade === 'DATA' };
  }
  var dias = LicH_diasEntre_(hoje, val), cod = 'VIGENTE';
  if (dias < 0) cod = 'VENCIDO';
  else LICH_FAIXAS.forEach(function (f) { if (dias <= f.dias) cod = f.codigo; });
  var s = LICH_SITUACOES[cod];
  var texto = cod === 'VENCIDO' ? 'Venceu em ' + LicH_br_(val) + ' (há ' + (-dias) + (dias === -1 ? ' dia' : ' dias') + ')' : dias === 0 ? 'Vence hoje (' + LicH_br_(val) + ')' : 'Vale até ' + LicH_br_(val) + ' (' + dias + (dias === 1 ? ' dia' : ' dias') + ')';
  return { codigo: cod, nome: s.nome, cor: s.cor, dias: dias, texto: texto };
}
/** Faixa do aviso: 30, 15, 7 ou 0 (vencido); null = fora das faixas (vigente com mais de 30 dias ou sem validade). */
function LicH_faixa_(sit) {
  if (sit.codigo === 'VENCIDO') return 0;
  if (sit.codigo === 'VENCE_7') return 7;
  if (sit.codigo === 'VENCE_15') return 15;
  if (sit.codigo === 'VENCE_30') return 30;
  return null;
}

// ------------------------------------------------------------ leitura do cadastro
function LicH_documentos_() { return Lic_ler_(LICH_ABAS.DOCUMENTOS).filter(function (d) { return Lic_s_(d.CODIGO); }); }
function LicH_ativo_(d) { return Lic_up_(d.ATIVO) !== 'NAO'; }
function LicH_servicos_(d) { var s = Lic_json_(d.SERVICOS_JSON, []); return Array.isArray(s) ? s : []; }
function LicH_docTela_(d, hoje) {
  var t = LicH_tipo_(d.TIPO) || LicH_tipo_('OUTRO'), sit = LicH_situacao_(d, hoje);
  return {
    id: Lic_s_(d.ID), codigo: Lic_s_(d.CODIGO), tipo: t.codigo, tipoNome: t.nome, item: t.item, nome: Lic_s_(d.NOME), categoria: Lic_up_(d.CATEGORIA), categoriaNome: LICH_CATEGORIAS[Lic_up_(d.CATEGORIA)] || '',
    numero: Lic_s_(d.NUMERO), emissao: LicH_dia_(d.EMISSAO), validade: LicH_dia_(d.VALIDADE), regraValidade: LICH_REGRAS_VALIDADE[t.validade] || '', orgao: Lic_s_(d.ORGAO_EMISSOR),
    link: Lic_url_(d.LINK_VERIFICACAO), responsavelId: Lic_s_(d.RESPONSAVEL_ID), responsavel: Lic_s_(d.RESPONSAVEL_NOME), obs: Lic_s_(d.OBS), escopo: Lic_s_(d.ESCOPO), palavras: Lic_s_(d.PALAVRAS),
    contratante: Lic_s_(d.CONTRATANTE), contratanteCnpj: Lic_s_(d.CONTRATANTE_CNPJ), objeto: Lic_s_(d.OBJETO), periodoInicio: LicH_dia_(d.PERIODO_INICIO), periodoFim: LicH_dia_(d.PERIODO_FIM),
    servicos: LicH_servicos_(d), cat: Lic_s_(d.CAT_ACERVO), os: Lic_s_(d.OS_REFERENCIA), atestado: !!t.atestado,
    arquivo: Lic_s_(d.ARQUIVO_ID) ? { nome: Lic_s_(d.ARQUIVO_NOME), tipo: Lic_s_(d.ARQUIVO_TIPO), tamanho: Number(d.ARQUIVO_TAMANHO) || 0, sha256: Lic_s_(d.ARQUIVO_SHA256), em: Lic_s_(d.ARQUIVO_EM) } : null,
    ativo: LicH_ativo_(d), versao: Number(d.VERSAO) || 1, motivo: Lic_s_(d.MOTIVO), atualizadoPor: Lic_s_(d.ATUALIZADO_POR_NOME), atualizadoEm: Lic_s_(d.ATUALIZADO_EM),
    situacao: sit.codigo, situacaoNome: sit.nome, situacaoCor: sit.cor, situacaoTexto: sit.texto, dias: sit.dias, faltaData: !!sit.faltaData, dependencia: t.dependencia || ''
  };
}
/** Padrões de referência (CAD_PADROES, Metrologia): só leitura, para o item 23 (rastreabilidade). Nunca lança. */
function LicH_padroes_(hoje) {
  var r = { ativos: 0, vigentes: 0, vencidos: 0, semValidade: 0, proximo: '', lista: [], aviso: '' };
  try {
    var aba = typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_PADROES ? SGO_CFG.SHEETS.CAD_PADROES : 'CAD_PADROES';
    Lic_ler_(aba).forEach(function (p) {
      if (Lic_up_(p.STATUS) && Lic_up_(p.STATUS) !== 'ATIVO') return;
      r.ativos++;
      var v = LicH_dia_(p.VALIDADE);
      if (!v) r.semValidade++; else if (v < hoje) r.vencidos++; else { r.vigentes++; if (!r.proximo || v < r.proximo) r.proximo = v; }
      r.lista.push({ tag: Lic_s_(p.TAG), descricao: Lic_texto_(p.DESCRICAO, 160), certificado: Lic_s_(p.CERTIFICADO_NUMERO), validade: v });
    });
  } catch (e) { r.aviso = 'Não foi possível ler os Padrões de referência agora (' + Lic_s_(e && e.message) + ').'; }
  return r;
}

// ------------------------------------------------------------ 1. cadastro: tela, gravação com versão, arquivo restrito
function LicH_tela_(eu) {
  var hoje = LicH_hoje_(), docs = LicH_documentos_().map(function (d) { return LicH_docTela_(d, hoje); });
  docs.sort(function (a, b) { return (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1) || (LICH_SITUACOES[a.situacao].ordem - LICH_SITUACOES[b.situacao].ordem) || (a.codigo < b.codigo ? -1 : 1); });
  var cont = { total: 0, VENCIDO: 0, VENCE_7: 0, VENCE_15: 0, VENCE_30: 0, VIGENTE: 0, SEM_VALIDADE: 0, semArquivo: 0, inativos: 0 };
  var tiposCom = {};
  docs.forEach(function (d) { if (!d.ativo) { cont.inativos++; return; } cont.total++; cont[d.situacao]++; if (!d.arquivo) cont.semArquivo++; tiposCom[d.tipo] = true; });
  var padroes = LicH_padroes_(hoje);
  var faltam = LICH_TIPOS.filter(function (t) { return t.codigo !== 'OUTRO' && !tiposCom[t.codigo] && t.fonte !== 'PADROES'; }).map(function (t) { return { codigo: t.codigo, nome: t.nome, item: t.item, categoria: t.categoria, dependencia: t.dependencia || '' }; });
  return {
    hoje: hoje, documentos: docs, contagens: cont, padroes: padroes, faltamTipos: faltam, responsaveis: Lic_responsaveis_(), categorias: LICH_CATEGORIAS, regrasValidade: LICH_REGRAS_VALIDADE,
    tipos: LICH_TIPOS.map(function (t) { return { codigo: t.codigo, item: t.item, nome: t.nome, categoria: t.categoria, validade: t.validade, regraValidade: LICH_REGRAS_VALIDADE[t.validade], obs: t.obs || '', atestado: !!t.atestado, fonte: t.fonte || '', escopo: !!t.escopo, dependencia: t.dependencia || '' }; }),
    regras: LICH_REGRAS
  };
}
function LicH_acharDoc_(id) {
  var d = SGO_DATA.getById(LICH_ABAS.DOCUMENTOS, Lic_s_(id));
  if (!d || !Lic_s_(d.CODIGO)) throw new Error('Não foi possível: o documento não foi encontrado no cadastro de habilitação (pode ter sido trocado de aba). Atualize a tela e tente de novo');
  return d;
}
function LicH_proximoCodigo_(docs) {
  var props = PropertiesService.getScriptProperties(), seq = Number(props.getProperty('LICH_SEQ')) || 0;
  (docs || LicH_documentos_()).forEach(function (d) { var m = /^HAB-(\d+)$/.exec(Lic_s_(d.CODIGO)); if (m && Number(m[1]) > seq) seq = Number(m[1]); });
  seq++;
  props.setProperty('LICH_SEQ', String(seq));
  var n = String(seq); while (n.length < 4) n = '0' + n;
  return 'HAB-' + n;
}
/** Serviços do atestado: "serviço; quantidade; unidade" por linha (ou a lista já em objeto). Quantidade em número pt-BR. */
function LicH_servicosLimpos_(v) {
  var linhas = Array.isArray(v) ? v : Lic_s_(v).split(/\n+/);
  var out = [];
  linhas.forEach(function (x, i) {
    var o = x && typeof x === 'object' ? x : null, partes = o ? [o.servico, o.quantidade, o.unidade] : Lic_s_(x).split(';');
    var servico = LicH_txt_(partes[0], 200); if (!servico) return;
    var q = Lic_s_(partes[1]), qn = q === '' ? null : (typeof LicP_n_ === 'function' ? LicP_n_(q) : Lic_num_(q));
    if (q !== '' && (qn === null || qn < 0)) throw new Error('Escreva a quantidade do serviço "' + servico + '" (linha ' + (i + 1) + ') só com número (ex.: 120 ou 1.250,5). Nada foi alterado');
    out.push({ servico: servico, quantidade: qn, unidade: LicH_txt_(partes[2], 40) });
  });
  if (out.length > 60) throw new Error('O atestado aceita até 60 linhas de serviço. Junte as linhas parecidas. Nada foi alterado');
  return out;
}
/**
 * Confere e normaliza os campos enviados pela tela (só os que vieram). Devolve { campos, rotulos }. Lança com o que corrigir.
 * tipoFinal = o tipo do documento depois da gravação (para as regras do atestado e de "Outro").
 */
function LicH_camposLimpos_(c, atual) {
  var out = {}, rot = {};
  var tipoCod = c.tipo !== undefined ? Lic_up_(c.tipo) : Lic_up_(atual && atual.TIPO), t = LicH_tipo_(tipoCod);
  if (!t) throw new Error('Escolha o tipo do documento na lista. Nada foi alterado');
  if (t.fonte === 'PADROES') throw new Error('Os certificados de calibração dos padrões já ficam em Metrologia › Padrões de referência e são lidos de lá (sem cadastro paralelo). Nada foi alterado');
  var put = function (col, v, r) { out[col] = v; rot[col] = r; };
  if (c.tipo !== undefined) put('TIPO', t.codigo, 'Tipo');
  if (c.nome !== undefined || !atual) { var nome = LicH_txt_(c.nome !== undefined ? c.nome : t.nome, 200) || (t.codigo === 'OUTRO' ? '' : t.nome); if (!nome) throw new Error('Escreva o nome do documento (ex.: Certidão de regularidade do conselho). Nada foi alterado'); put('NOME', nome, 'Nome'); }
  var cat = c.categoria !== undefined ? Lic_up_(c.categoria) : (atual ? Lic_up_(atual.CATEGORIA) : '');
  if (t.categoria) cat = t.categoria;   // tipo da lista tem a categoria do doc 03; só "Outro documento" escolhe
  if (!LICH_CATEGORIAS[cat]) throw new Error('Escolha a categoria (jurídica, fiscal e trabalhista, econômico-financeira, técnica ou declarações). Nada foi alterado');
  if (c.categoria !== undefined || c.tipo !== undefined || !atual) put('CATEGORIA', cat, 'Categoria');
  if (c.numero !== undefined) put('NUMERO', LicH_txt_(c.numero, 120), 'Número');
  ['emissao', 'validade', 'periodoInicio', 'periodoFim'].forEach(function (k) {
    if (c[k] === undefined) return;
    var col = { emissao: 'EMISSAO', validade: 'VALIDADE', periodoInicio: 'PERIODO_INICIO', periodoFim: 'PERIODO_FIM' }[k], nomeK = { emissao: 'a data de emissão', validade: 'a validade', periodoInicio: 'o início do período', periodoFim: 'o fim do período' }[k];
    var v = Lic_s_(c[k]), dia = v ? LicH_dia_(v) : '';
    if (v && !dia) throw new Error('Escreva ' + nomeK + ' como data válida (dd/mm/aaaa). Nada foi alterado');
    put(col, dia, { EMISSAO: 'Emissão', VALIDADE: 'Validade', PERIODO_INICIO: 'Início do período', PERIODO_FIM: 'Fim do período' }[col]);
  });
  var emi = out.EMISSAO !== undefined ? out.EMISSAO : LicH_dia_(atual && atual.EMISSAO), val = out.VALIDADE !== undefined ? out.VALIDADE : LicH_dia_(atual && atual.VALIDADE);
  if (emi && emi > LicH_hoje_()) throw new Error('A data de emissão (' + LicH_br_(emi) + ') está no futuro. Confira no documento. Nada foi alterado');
  if (emi && val && val < emi) throw new Error('A validade (' + LicH_br_(val) + ') está antes da emissão (' + LicH_br_(emi) + '). Confira no documento. Nada foi alterado');
  var pi = out.PERIODO_INICIO !== undefined ? out.PERIODO_INICIO : LicH_dia_(atual && atual.PERIODO_INICIO), pf = out.PERIODO_FIM !== undefined ? out.PERIODO_FIM : LicH_dia_(atual && atual.PERIODO_FIM);
  if (pi && pf && pf < pi) throw new Error('O fim do período do atestado está antes do início. Nada foi alterado');
  if (c.orgao !== undefined) put('ORGAO_EMISSOR', LicH_txt_(c.orgao, 200), 'Órgão emissor');
  if (c.link !== undefined) {
    var l = Lic_s_(c.link);
    if (l && !Lic_url_(l)) throw new Error('O link de verificação precisa começar com http:// ou https:// (o endereço oficial do emissor, sem espaços). Nada foi alterado');
    put('LINK_VERIFICACAO', Lic_url_(l), 'Link de verificação');
  }
  if (c.responsavelId !== undefined) {
    var rid = Lic_s_(c.responsavelId), resp = Lic_responsaveis_().filter(function (u) { return u.id === rid; })[0];
    if (rid && !resp) throw new Error('Escolha o responsável na lista (Diretoria ou Administrador ativos). Nada foi alterado');
    put('RESPONSAVEL_ID', resp ? resp.id : '', 'Responsável'); out.RESPONSAVEL_NOME = resp ? resp.nome : '';
  }
  if (c.obs !== undefined) put('OBS', LicH_txt_(c.obs, 2000), 'Observações');
  if (c.escopo !== undefined) put('ESCOPO', LicH_txt_(c.escopo, 1000), 'Escopo');
  if (c.palavras !== undefined) put('PALAVRAS', Lic_lista_(c.palavras).map(function (p) { return LicH_txt_(p, 60); }).filter(function (p) { return LicH_norm_(p).length >= 3; }).slice(0, 30).join(', '), 'Palavras extras do cruzamento');
  if (c.contratante !== undefined) put('CONTRATANTE', LicH_txt_(c.contratante, 200), 'Contratante');
  if (c.contratanteCnpj !== undefined) {
    var cn = Lic_s_(c.contratanteCnpj).replace(/\D/g, '');
    if (cn && cn.length !== 14) throw new Error('Escreva o CNPJ do contratante com 14 números (ou deixe em branco). Nada foi alterado');
    put('CONTRATANTE_CNPJ', cn, 'CNPJ do contratante');
  }
  if (c.objeto !== undefined) put('OBJETO', LicH_txt_(c.objeto, 2000), 'Objeto');
  if (c.servicos !== undefined) put('SERVICOS_JSON', JSON.stringify(LicH_servicosLimpos_(c.servicos)), 'Serviços e quantidades');
  if (c.cat !== undefined) put('CAT_ACERVO', LicH_txt_(c.cat, 200), 'CAT ou acervo');
  if (c.os !== undefined) put('OS_REFERENCIA', LicH_txt_(c.os, 300), 'O.S. ou relatório que comprova');
  if (t.atestado) {
    var contr = out.CONTRATANTE !== undefined ? out.CONTRATANTE : Lic_s_(atual && atual.CONTRATANTE), obj = out.OBJETO !== undefined ? out.OBJETO : Lic_s_(atual && atual.OBJETO);
    if (!contr || !obj) throw new Error('No atestado de capacidade técnica, escreva o contratante e o objeto (são eles que casam com a exigência do edital). Nada foi alterado');
  }
  return { campos: out, rotulos: rot, tipo: t };
}
/** Arquivo enviado pela tela: confere extensão, tamanho e assinatura (os primeiros bytes) e guarda RESTRITO. */
function LicH_guardarArquivo_(arq, codigo, versao) {
  var nome = Lic_s_(arq && arq.nome), b64 = String((arq && arq.base64) || '').replace(/^data:[^,]+,/, '').replace(/\s/g, '');
  if (!nome || b64.length < 8) throw new Error('O arquivo veio vazio. Toque em "Escolher arquivo", selecione o PDF ou a foto do documento e tente de novo. Nada foi alterado');
  if (b64.length > LICH_MAX_BASE64) throw new Error('O arquivo passa de 10 MB. Salve o PDF em tamanho menor (ou a foto reduzida) e anexe de novo. Nada foi alterado');
  if (!LICH_RX_ARQUIVO.test(nome)) throw new Error('O arquivo do documento precisa ser PDF ou imagem (PNG, JPG ou WEBP). O arquivo é "' + Lic_texto_(nome, 80) + '". Nada foi alterado');
  var bytes = Utilities.base64Decode(b64), u = function (i) { return (bytes[i] || 0) & 255; };
  var ext = (/\.([a-z]+)$/i.exec(nome) || ['', ''])[1].toLowerCase(), mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  var assinatura = ext === 'pdf' ? (u(0) === 0x25 && u(1) === 0x50 && u(2) === 0x44 && u(3) === 0x46) : ext === 'png' ? (u(0) === 0x89 && u(1) === 0x50 && u(2) === 0x4e && u(3) === 0x47)
    : ext === 'webp' ? (u(0) === 0x52 && u(1) === 0x49 && u(2) === 0x46 && u(3) === 0x46 && u(8) === 0x57 && u(9) === 0x45) : (u(0) === 0xff && u(1) === 0xd8);
  if (!assinatura) throw new Error('O conteúdo do arquivo não é um ' + ext.toUpperCase() + ' de verdade (a extensão não confere com o arquivo). Gere o PDF de novo ou tire a foto de novo. Nada foi alterado');
  var sha = LicH_shaBytes_(bytes);
  var pasta = SGO_DocSalvar_pastaPersistente_('LIC_HAB_PASTA_ID', LICH_PASTA, '');
  var sub = typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(pasta, codigo) : pasta;
  var f = sub.createFile(Utilities.newBlob(bytes, mime, SGO_DocSalvar_sanitizarNome_(codigo + ' v' + versao + ' - ' + nome)));
  try { if (DriveApp.Access && DriveApp.Access.PRIVATE && f.setSharing) f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}
  return { id: Lic_s_(f.getId()), nome: Lic_texto_(nome, 200), tipo: mime, tamanho: bytes.length, sha256: sha };
}
function LicH_foto_(d) { var o = {}; LICH_COLUNAS.LIC_HAB_DOCUMENTOS.forEach(function (k) { if (k !== 'VERSAO_ID') o[k] = d[k] === undefined ? '' : d[k]; }); return o; }
function LicH_hashVersao_(v) { return Lic_hash_([Lic_s_(v.DOCUMENTO_ID), Number(v.VERSAO) || 0, Lic_s_(v.DADOS_JSON), Lic_s_(v.ARQUIVO_SHA256), Lic_s_(v.MOTIVO), Lic_s_(v.POR_ID), Lic_s_(v.EM)].join('|')); }
function LicH_gravarVersao_(d, mudou, motivo, eu, agora) {
  var v = { DOCUMENTO_ID: Lic_s_(d.ID), CODIGO: Lic_s_(d.CODIGO), VERSAO: Number(d.VERSAO) || 1, DADOS_JSON: JSON.stringify(LicH_foto_(d)), MUDOU: Lic_texto_(mudou, 4000), MOTIVO: Lic_texto_(motivo, 1000),
    ARQUIVO_ID: Lic_s_(d.ARQUIVO_ID), ARQUIVO_NOME: Lic_s_(d.ARQUIVO_NOME), ARQUIVO_SHA256: Lic_s_(d.ARQUIVO_SHA256), VALIDADE: LicH_dia_(d.VALIDADE), POR_ID: Lic_s_(eu.id), POR_NOME: Lic_s_(eu.nome), EM: agora };
  v.HASH = LicH_hashVersao_(v);
  var ins = SGO_DATA.insert(LICH_ABAS.VERSOES, v);
  return Lic_s_(ins && ins.ID);
}
function LicH_valorTxt_(col, v) {
  if (col === 'SERVICOS_JSON') { var s = Lic_json_(v, []); return Array.isArray(s) && s.length ? s.length + (s.length === 1 ? ' serviço' : ' serviços') : '(vazio)'; }
  if (/^(EMISSAO|VALIDADE|PERIODO_INICIO|PERIODO_FIM)$/.test(col)) return LicH_br_(LicH_dia_(v)) || '(vazio)';
  if (col === 'CATEGORIA') return LICH_CATEGORIAS[Lic_up_(v)] || Lic_s_(v);
  if (col === 'TIPO') { var t = LicH_tipo_(v); return t ? t.nome : Lic_s_(v); }
  return Lic_texto_(v, 160) || '(vazio)';
}
/**
 * Cadastrar (sem id) ou mudar (com id) um documento. d: { id?, campos: {...}, arquivo?: { nome, tipo, base64 }, motivo }.
 * Mudança: só o que veio e é diferente; versão + 1; motivo obrigatório (10 letras); arquivo novo = versão nova (o anterior fica
 * na versão anterior, nunca é apagado). Mesmo arquivo (mesmo SHA-256) não conta como mudança.
 */
function LicH_salvar_(eu, d) {
  var novo = !Lic_s_(d.id), motivo = Lic_texto_(d.motivo, 1000), c = d.campos || {};
  if (!novo && motivo.length < 10) throw new Error('Escreva o motivo da mudança (pelo menos 10 letras): ele fica no histórico do documento com o seu nome e a data. Nada foi alterado');
  var atual = novo ? null : LicH_acharDoc_(d.id);
  if (atual && !LicH_ativo_(atual) && !d.reativar) throw new Error('Este documento foi retirado de uso. Para mudar, toque em "Voltar a usar" (com o motivo) antes. Nada foi alterado');
  var lim = LicH_camposLimpos_(c, atual);
  var temArquivo = !!(d.arquivo && (d.arquivo.base64 || d.arquivo.nome));
  LICH_CACHE_AV = { ms: null, docs: null };   // o cache dos avisos não pode ver o documento antigo
  return Lic_comTrava_(function () {
    var agora = Lic_agora_();
    if (novo) {
      var docs = LicH_documentos_(), codigo = LicH_proximoCodigo_(docs);
      var reg = Object.assign({ CODIGO: codigo, TIPO: lim.tipo.codigo, ATIVO: 'SIM', VERSAO: 1, MOTIVO: motivo || 'Cadastro inicial', ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora, CRIADO_POR_NOME: eu.nome, CRIADO_EM: agora }, lim.campos);
      if (temArquivo) { var a = LicH_guardarArquivo_(d.arquivo, codigo, 1); Object.assign(reg, { ARQUIVO_ID: a.id, ARQUIVO_NOME: a.nome, ARQUIVO_TIPO: a.tipo, ARQUIVO_TAMANHO: a.tamanho, ARQUIVO_SHA256: a.sha256, ARQUIVO_EM: agora }); }
      var ins = SGO_DATA.insert(LICH_ABAS.DOCUMENTOS, reg);
      reg.ID = Lic_s_(ins && ins.ID);
      var vid = LicH_gravarVersao_(reg, 'Cadastro inicial' + (temArquivo ? ' com o arquivo "' + reg.ARQUIVO_NOME + '" (SHA-256 ' + reg.ARQUIVO_SHA256 + ')' : ' sem arquivo'), motivo || 'Cadastro inicial', eu, agora);
      SGO_DATA.update(LICH_ABAS.DOCUMENTOS, reg.ID, { VERSAO_ID: vid });
      Lic_historico_('HABILITACAO', reg.ID, codigo, 'DOCUMENTO_CADASTRADO', eu, { para: 'versão 1', texto: reg.NOME + (temArquivo ? ' · arquivo ' + reg.ARQUIVO_NOME : ' · sem arquivo') + (reg.VALIDADE ? ' · validade ' + LicH_br_(reg.VALIDADE) : ''), versao: 1, fonte: 'Tela Documentos de habilitação', hash: reg.ARQUIVO_SHA256 || '' });
      try { LicH_alertasProgramar_(new Date(), { forcar: true }); } catch (e) {}
      return { documento: LicH_docTela_(SGO_DATA.getById(LICH_ABAS.DOCUMENTOS, reg.ID) || reg), versao: 1, texto: 'Documento ' + codigo + ' cadastrado (versão 1)' + (temArquivo ? ', arquivo guardado com o SHA-256.' : '. Falta anexar o arquivo: sem ele, o documento conta como "falta" nas licitações.') };
    }
    var at = LicH_acharDoc_(d.id), mud = {}, difs = [];
    Object.keys(lim.campos).forEach(function (k) {
      if (k === 'RESPONSAVEL_NOME') return;
      if (Lic_s_(at[k]) !== Lic_s_(lim.campos[k])) { mud[k] = lim.campos[k]; difs.push(lim.rotulos[k] + ': ' + LicH_valorTxt_(k, at[k]) + ' → ' + LicH_valorTxt_(k, lim.campos[k])); }
    });
    if (mud.RESPONSAVEL_ID !== undefined) mud.RESPONSAVEL_NOME = lim.campos.RESPONSAVEL_NOME;
    if (d.reativar && !LicH_ativo_(at)) { mud.ATIVO = 'SIM'; difs.push('Situação: retirado de uso → em uso'); }
    if (d.retirar && LicH_ativo_(at)) { mud.ATIVO = 'NAO'; difs.push('Situação: em uso → retirado de uso'); }
    var versao = (Number(at.VERSAO) || 1) + 1;
    if (temArquivo) {
      var a2 = LicH_guardarArquivo_(d.arquivo, at.CODIGO, versao);
      if (a2.sha256 === Lic_s_(at.ARQUIVO_SHA256)) difs.push('Arquivo: o mesmo enviado de novo (SHA-256 igual), sem troca');
      else { Object.assign(mud, { ARQUIVO_ID: a2.id, ARQUIVO_NOME: a2.nome, ARQUIVO_TIPO: a2.tipo, ARQUIVO_TAMANHO: a2.tamanho, ARQUIVO_SHA256: a2.sha256, ARQUIVO_EM: agora }); difs.push('Arquivo: ' + (Lic_s_(at.ARQUIVO_NOME) || '(sem arquivo)') + ' → ' + a2.nome + ' (SHA-256 ' + a2.sha256 + '); o anterior continua guardado na versão ' + (Number(at.VERSAO) || 1)); }
    }
    if (!Object.keys(mud).length) return { documento: LicH_docTela_(at), semMudanca: true, texto: 'Nada mudou: os valores enviados são iguais aos atuais' + (temArquivo ? ' e o arquivo é o mesmo (SHA-256 igual)' : '') + '. Nenhuma versão nova foi criada.' };
    Object.assign(mud, { VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    SGO_DATA.update(LICH_ABAS.DOCUMENTOS, at.ID, mud);
    Object.keys(mud).forEach(function (k) { at[k] = mud[k]; });
    var vid2 = LicH_gravarVersao_(at, difs.join('; '), motivo, eu, agora);
    SGO_DATA.update(LICH_ABAS.DOCUMENTOS, at.ID, { VERSAO_ID: vid2 });
    Lic_historico_('HABILITACAO', at.ID, at.CODIGO, d.retirar ? 'DOCUMENTO_RETIRADO' : d.reativar ? 'DOCUMENTO_REATIVADO' : 'DOCUMENTO_VERSAO', eu, { de: 'versão ' + (versao - 1), para: 'versão ' + versao, texto: difs.join('; ') + '. Motivo: ' + motivo, versao: versao, fonte: 'Tela Documentos de habilitação', hash: Lic_s_(mud.ARQUIVO_SHA256) });
    // versão nova: os avisos da versão anterior que ainda esperam saem da fila (com o motivo); os sem ciência ficam concluídos
    LicH_encerrarAvisosDoc_(at, 'Documento ' + at.CODIGO + ' na versão ' + versao + ' (' + Lic_texto_(motivo, 120) + ').', agora);
    try { LicH_alertasProgramar_(new Date(), { forcar: true }); } catch (e) {}
    return { documento: LicH_docTela_(at), versao: versao, mudou: difs, texto: 'Gravado na versão ' + versao + '. A versão anterior continua no histórico' + (mud.ARQUIVO_ID ? ', com o arquivo anterior.' : '.') };
  });
}
function LicH_retirar_(eu, d) {
  if (Lic_texto_(d.motivo, 1000).length < 10) throw new Error('Escreva por que o documento sai de uso (pelo menos 10 letras). Ele não é apagado: fica no histórico e pode voltar a ser usado. Nada foi alterado');
  return LicH_salvar_(eu, { id: d.id, campos: {}, motivo: d.motivo, retirar: true });
}
function LicH_reativar_(eu, d) { return LicH_salvar_(eu, { id: d.id, campos: {}, motivo: d.motivo, reativar: true }); }
function LicH_versoes_(eu, d) {
  var doc = LicH_acharDoc_(d.id);
  var vs = Lic_ler_(LICH_ABAS.VERSOES).filter(function (v) { return Lic_s_(v.DOCUMENTO_ID) === Lic_s_(doc.ID); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); });
  return { documento: LicH_docTela_(doc), versoes: vs.map(function (v) {
    var dados = Lic_json_(v.DADOS_JSON, {});
    return { id: Lic_s_(v.ID), versao: Number(v.VERSAO) || 0, mudou: Lic_s_(v.MUDOU), motivo: Lic_s_(v.MOTIVO), por: Lic_s_(v.POR_NOME), em: Lic_s_(v.EM), validade: LicH_dia_(v.VALIDADE),
      arquivo: Lic_s_(v.ARQUIVO_ID) ? { nome: Lic_s_(v.ARQUIVO_NOME), sha256: Lic_s_(v.ARQUIVO_SHA256) } : null, integra: LicH_hashVersao_(v) === Lic_s_(v.HASH), hash: Lic_s_(v.HASH),
      numero: Lic_s_(dados.NUMERO), emissao: LicH_dia_(dados.EMISSAO), ativo: Lic_up_(dados.ATIVO) !== 'NAO' };
  }) };
}
/** Abrir ou baixar o arquivo de um documento (versão atual ou d.versaoId). O SHA-256 é conferido antes de entregar. */
function LicH_arquivo_(eu, d) {
  var doc = LicH_acharDoc_(d.id), alvo = { ARQUIVO_ID: doc.ARQUIVO_ID, ARQUIVO_NOME: doc.ARQUIVO_NOME, ARQUIVO_SHA256: doc.ARQUIVO_SHA256, VERSAO: doc.VERSAO };
  if (Lic_s_(d.versaoId)) {
    var v = SGO_DATA.getById(LICH_ABAS.VERSOES, Lic_s_(d.versaoId));
    if (!v || Lic_s_(v.DOCUMENTO_ID) !== Lic_s_(doc.ID)) throw new Error('Não foi possível abrir: esta versão não é deste documento. Atualize o histórico e tente de novo');
    alvo = { ARQUIVO_ID: v.ARQUIVO_ID, ARQUIVO_NOME: v.ARQUIVO_NOME, ARQUIVO_SHA256: v.ARQUIVO_SHA256, VERSAO: v.VERSAO };
  }
  if (!Lic_s_(alvo.ARQUIVO_ID)) throw new Error('Não foi possível abrir: ' + (Lic_s_(d.versaoId) ? 'esta versão' : 'o documento') + ' não tem arquivo anexado. Use "Editar" e anexe o PDF ou a foto do documento');
  var f; try { f = DriveApp.getFileById(Lic_s_(alvo.ARQUIVO_ID)); } catch (e) { throw new Error('Não foi possível abrir: o arquivo guardado não foi encontrado no serviço de arquivos do SGO+ (' + Lic_s_(e && e.message) + '). Avise o Administrador; nada foi alterado'); }
  var blob = f.getBlob(), bytes = blob.getBytes(), sha = LicH_shaBytes_(bytes);
  if (Lic_s_(alvo.ARQUIVO_SHA256) && sha !== Lic_s_(alvo.ARQUIVO_SHA256)) {
    Lic_historico_('HABILITACAO', doc.ID, doc.CODIGO, 'ARQUIVO_NAO_CONFERE', eu, { texto: 'SHA-256 do arquivo guardado (' + sha + ') diferente do registrado (' + Lic_s_(alvo.ARQUIVO_SHA256) + ') na versão ' + Lic_s_(alvo.VERSAO) + '. Arquivo não entregue.', versao: alvo.VERSAO, fonte: 'Serviço de arquivos do SGO+' });
    throw new Error('Não foi possível abrir: o arquivo guardado não confere com o SHA-256 registrado (pode ter sido alterado fora do SGO+). Nada foi entregue; avise o Administrador e anexe de novo o documento original');
  }
  var tipo = Lic_s_(blob.getContentType ? blob.getContentType() : '').toLowerCase() || 'application/pdf', seguro = LICH_TIPOS_ABRIR.indexOf(tipo) >= 0;
  Lic_historico_('HABILITACAO', doc.ID, doc.CODIGO, 'ARQUIVO_ABERTO', eu, { texto: (d.baixar ? 'Baixou' : 'Abriu') + ' o arquivo "' + Lic_s_(alvo.ARQUIVO_NOME) + '" da versão ' + Lic_s_(alvo.VERSAO) + ' (SHA-256 conferido).', versao: alvo.VERSAO, fonte: 'Serviço de arquivos do SGO+', hash: sha });
  return { nome: Lic_s_(alvo.ARQUIVO_NOME), tipo: seguro ? tipo : 'application/octet-stream', forcarBaixar: !seguro, base64: Utilities.base64Encode(bytes), sha256: sha, tamanho: bytes.length };
}

// ------------------------------------------------------------ 3. cruzamento com o edital
/** Tipos de documento que o texto da exigência pede, pela regra de palavras (nunca pela IA). Devolve códigos, sem repetição. */
function LicH_tiposDaExigencia_(texto, docs) {
  var n = LicH_norm_(texto), pad = ' ' + n + ' ', achou = [];
  LICH_TIPOS.forEach(function (t) { if (t.termos.some(function (x) { return LicH_tem_(pad, x); })) achou.push(t.codigo); });
  var rastreio = /rastreab|rastreav/.test(n), acreditacao = /acreditad|acreditac|17025|cgcre/.test(n);
  // "rastreável à RBC" é rastreabilidade (padrões), não acreditação; "acreditado pelo Inmetro" é acreditação, não o registro do Inmetro
  if (achou.indexOf('ACREDITACAO_RBC') >= 0 && rastreio && !acreditacao) achou.splice(achou.indexOf('ACREDITACAO_RBC'), 1);
  if (achou.indexOf('INMETRO') >= 0 && acreditacao) achou.splice(achou.indexOf('INMETRO'), 1);
  // palavras extras de cada documento (a Diretoria escreve no cadastro): o tipo daquele documento entra
  (docs || []).forEach(function (d) {
    if (!LicH_ativo_(d)) return;
    var ps = Lic_lista_(d.PALAVRAS);
    if (ps.some(function (p) { return LicH_tem_(pad, p); }) && achou.indexOf(Lic_up_(d.TIPO)) < 0) achou.push(Lic_up_(d.TIPO));
  });
  return achou;
}
/** Palavras de 4 letras ou mais em comum (atestado × exigência), sem as que não dizem nada. */
var LICH_PALAVRAS_VAZIAS = ' para pelo pela pelos pelas como mais menos sera serao deve devem devera deverao comprovar comprovacao atestado atestados capacidade tecnica tecnico emitido emitidos pessoa juridica direito publico privado licitante empresa servico servicos compativel compativeis caracteristicas quantidades prazos objeto desta deste nesta neste qual quais onde quando sendo seja sejam entre sobre ';
function LicH_comum_(a, b) {
  var vb = {}, out = [];
  LicH_norm_(b).split(' ').forEach(function (w) { if (w.length >= 4 && LICH_PALAVRAS_VAZIAS.indexOf(' ' + w + ' ') < 0) vb[w] = true; });
  LicH_norm_(a).split(' ').forEach(function (w) { if (w.length >= 4 && vb[w] && out.indexOf(w) < 0) out.push(w); });
  return out;
}
/** Estado de UM documento para a sessão: OK, VENCE_ANTES, VENCIDO, SEM_ARQUIVO, SEM_DATA, CERTAME, EMITIR. */
function LicH_estadoNaSessao_(d, sessaoDia, hoje) {
  var t = LicH_tipo_(d.TIPO) || LicH_tipo_('OUTRO'), val = LicH_dia_(d.VALIDADE);
  if (!Lic_s_(d.ARQUIVO_ID)) return { estado: 'SEM_ARQUIVO', texto: 'cadastrado sem arquivo (se não está no SGO+, não existe): anexe o documento' };
  if (val) {
    if (val < hoje) return { estado: 'VENCIDO', texto: 'venceu em ' + LicH_br_(val) };
    if (sessaoDia && val < sessaoDia) return { estado: 'VENCE_ANTES', texto: 'vale até ' + LicH_br_(val) + ', antes da sessão (' + LicH_br_(sessaoDia) + ')' };
    return { estado: 'OK', texto: 'vale até ' + LicH_br_(val) + (sessaoDia ? ', depois da sessão' : '') };
  }
  if (t.validade === 'DATA') return { estado: 'SEM_DATA', texto: 'validade não informada no cadastro: escreva a data impressa' };
  if (t.validade === 'CERTAME') return { estado: 'CERTAME', texto: 'emitida para cada certame: prepare a desta licitação (o cadastro guarda o modelo)' };
  if (t.validade === 'EMITIR') return { estado: 'EMITIR', texto: 'emitir na data (sem validade impressa)' };
  if (t.validade === 'EDITAL') return { estado: 'EMITIR', texto: 'confira no edital o prazo de emissão exigido' };
  if (t.validade === 'EXERCICIO') return { estado: 'EMITIR', texto: 'confira se é o exercício exigível na data da sessão' };
  return { estado: 'OK', texto: 'sem validade: vale a versão vigente' };
}
function LicH_docCurto_(d, est) {
  return { id: Lic_s_(d.ID), codigo: Lic_s_(d.CODIGO), nome: Lic_s_(d.NOME), numero: Lic_s_(d.NUMERO), emissao: LicH_dia_(d.EMISSAO), validade: LicH_dia_(d.VALIDADE), versao: Number(d.VERSAO) || 1,
    sha256: Lic_s_(d.ARQUIVO_SHA256), arquivo: Lic_s_(d.ARQUIVO_NOME), estado: est.estado, estadoTexto: est.texto };
}
var LICH_ORDEM_ESTADO = { OK: 1, CERTAME: 2, EMITIR: 3, SEM_DATA: 4, VENCE_ANTES: 5, VENCIDO: 6, SEM_ARQUIVO: 7 };
/** Situação de um tipo de documento para a exigência, com os documentos do cadastro que o atendem (o melhor primeiro). */
function LicH_avaliarTipo_(codigo, ctx, sessaoDia, texto) {
  var t = LicH_tipo_(codigo), r = { codigo: codigo, nome: t.nome, situacao: 'FALTA', texto: '', documentos: [] };
  if (t.fonte === 'PADROES') {
    var p = ctx.padroes;
    if (p.aviso) { r.situacao = 'A_CONFERIR'; r.texto = p.aviso; return r; }
    if (!p.ativos) { r.texto = 'Nenhum padrão ativo em Metrologia › Padrões de referência.'; return r; }
    var validos = p.lista.filter(function (x) { return x.validade && x.validade >= (sessaoDia || ctx.hoje); }).length;
    r.situacao = validos ? 'A_CONFERIR' : 'VENCE_ANTES';
    r.texto = p.ativos + ' padrões ativos em Padrões de referência; ' + validos + ' com o certificado válido ' + (sessaoDia ? 'na data da sessão (' + LicH_br_(sessaoDia) + ')' : 'hoje') + '. Confira se cobrem a grandeza e a faixa pedidas (o cadastro é o da Metrologia).';
    r.padroes = { ativos: p.ativos, validos: validos };
    return r;
  }
  var docs = ctx.docs.filter(function (d) { return LicH_ativo_(d) && Lic_up_(d.TIPO) === codigo; }).map(function (d) { var e = LicH_estadoNaSessao_(d, sessaoDia, ctx.hoje); var x = LicH_docCurto_(d, e); if (t.atestado) x.comum = LicH_comum_(texto, Lic_s_(d.OBJETO) + ' ' + LicH_servicos_(d).map(function (s) { return s.servico; }).join(' ')); return x; });
  docs.sort(function (a, b) { return (t.atestado ? (b.comum.length - a.comum.length) : 0) || (LICH_ORDEM_ESTADO[a.estado] - LICH_ORDEM_ESTADO[b.estado]) || (a.validade > b.validade ? -1 : 1); });
  r.documentos = docs.slice(0, t.atestado ? 5 : 3);
  if (!docs.length) {
    r.texto = codigo === 'ACREDITACAO_RBC' ? 'A Metrolabs não é acreditada RBC (ABNT NBR ISO/IEC 17025): as calibrações são rastreáveis (decisão do dono, 01/11/2026). Confira se o edital aceita rastreabilidade ou subcontratação de laboratório acreditado.'
      : 'Não há "' + t.nome + '" em uso no cadastro de habilitação.' + (t.dependencia ? ' Depende de outro módulo: ' + t.dependencia + '.' : '');
    return r;
  }
  var melhor = docs.slice().sort(function (a, b) { return LICH_ORDEM_ESTADO[a.estado] - LICH_ORDEM_ESTADO[b.estado]; })[0];
  if (melhor.estado === 'OK') {
    r.situacao = 'ATENDE'; r.texto = melhor.codigo + ' ' + melhor.estadoTexto + '.';
    if (t.atestado) { r.situacao = 'A_CONFERIR'; r.texto = docs.length + (docs.length === 1 ? ' atestado' : ' atestados') + ' no cadastro' + (docs[0].comum.length ? '; o que mais se parece com a exigência tem em comum: ' + docs[0].comum.slice(0, 8).join(', ') : '; nenhum tem palavra em comum com a exigência') + '. Confira as quantidades e a parcela de maior relevância (art. 67, §§ 1º e 2º).'; }
    else if (t.escopo) { r.situacao = 'A_CONFERIR'; r.texto = melhor.codigo + ' ' + melhor.estadoTexto + '. Confira se o escopo do documento cobre o que o edital pede' + (codigo === 'INMETRO' ? ' (balanças e esfigmomanômetros; o escopo exato depende do documento, decisão do dono de 01/11/2026)' : ' (grandeza e faixa)') + '.'; }
  } else if (melhor.estado === 'VENCE_ANTES' || melhor.estado === 'VENCIDO') {
    r.situacao = 'VENCE_ANTES'; r.texto = melhor.codigo + ' ' + melhor.estadoTexto + ': renove antes da sessão (documento vencido na data da sessão não se corrige depois, art. 64).';
    if (t.fiscal) r.texto += ' Como EPP, a regularidade fiscal e trabalhista pode ser apresentada com restrição e regularizada em 5 dias úteis depois de declarada vencedora, prorrogáveis (LC 123/2006, art. 43): o documento continua sendo exigido.';
  } else if (melhor.estado === 'SEM_ARQUIVO') { r.situacao = 'FALTA'; r.texto = melhor.codigo + ' ' + melhor.estadoTexto + '.'; }
  else { r.situacao = 'A_CONFERIR'; r.texto = melhor.codigo + ': ' + melhor.estadoTexto + '.'; }
  return r;
}
function LicH_chave_(texto) { return 'X' + Lic_hash_(LicH_norm_(texto)).slice(0, 20); }
/** Mesma regra de LicLeit_checklistDe_ (SGO_Licitacoes_Leitura.js), sobre linhas já lidas (o Painel conta várias oportunidades de uma vez). */
function LicH_checklistDe_(le, linhasPorChave) {
  var chave = Lic_s_(le.CHECKLIST_CHAVE);
  if (chave) {
    var qtd = Number(le.CHECKLIST_QTD) || 0, linhas = (linhasPorChave[chave] || []).slice().sort(function (a, b) { return (Number(a.ORDEM) || 0) - (Number(b.ORDEM) || 0); });
    var itens = [], ruim = linhas.length !== qtd;
    linhas.forEach(function (x, i) { if (Number(x.ORDEM) !== i + 1) ruim = true; var e = Lic_json_(x.ITEM_JSON, null); if (!e || typeof e !== 'object') ruim = true; else itens.push(e); });
    return ruim ? { itens: [], ilegivel: true } : { itens: itens, ilegivel: false };
  }
  if (Lic_s_(le.CHECKLIST_JSON) && typeof LicLeit_lerPartes_ === 'function') { var v = LicLeit_lerPartes_(le, 'CHECKLIST_JSON', null); return Array.isArray(v) ? { itens: v, ilegivel: false } : { itens: [], ilegivel: true }; }
  return { itens: [], ilegivel: false };
}
/**
 * Contexto de leitura (uma vez por chamada): documentos, padrões, leituras e checklists, análises, decisões e prazos. o.opIds limita.
 * Nunca lança por falta de uma aba (o módulo da leitura pode não existir no ambiente).
 */
function LicH_contexto_(o) {
  o = o || {};
  var hoje = LicH_hoje_(), so = o.opIds ? o.opIds.map(Lic_s_) : null, dentro = function (id) { return !so || so.indexOf(Lic_s_(id)) >= 0; };
  var ctx = { hoje: hoje, docs: LicH_documentos_(), padroes: LicH_padroes_(hoje), leituras: {}, checklist: {}, analises: {}, conferencias: {}, eventos: {} };
  var abaL = typeof LIC_LEIT_ABAS !== 'undefined' ? LIC_LEIT_ABAS : { LEITURAS: 'LIC_LEITURAS', CHECKLIST: 'LIC_LEITURA_CHECKLIST' };
  Lic_ler_(abaL.LEITURAS).forEach(function (x) { if (dentro(x.OPORTUNIDADE_ID)) (ctx.leituras[Lic_s_(x.OPORTUNIDADE_ID)] = ctx.leituras[Lic_s_(x.OPORTUNIDADE_ID)] || []).push(x); });
  Lic_ler_(abaL.CHECKLIST).forEach(function (x) { if (dentro(x.OPORTUNIDADE_ID)) (ctx.checklist[Lic_s_(x.CHAVE)] = ctx.checklist[Lic_s_(x.CHAVE)] || []).push(x); });
  Lic_ler_(LIC_ABAS.ANALISES).forEach(function (x) { if (dentro(x.OPORTUNIDADE_ID)) (ctx.analises[Lic_s_(x.OPORTUNIDADE_ID)] = ctx.analises[Lic_s_(x.OPORTUNIDADE_ID)] || []).push(x); });
  Lic_ler_(LICH_ABAS.CONFERENCIAS).forEach(function (x) { if (dentro(x.OPORTUNIDADE_ID)) (ctx.conferencias[Lic_s_(x.OPORTUNIDADE_ID)] = ctx.conferencias[Lic_s_(x.OPORTUNIDADE_ID)] || []).push(x); });
  Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (x) { if (dentro(x.OPORTUNIDADE_ID)) (ctx.eventos[Lic_s_(x.OPORTUNIDADE_ID)] = ctx.eventos[Lic_s_(x.OPORTUNIDADE_ID)] || []).push(x); });
  return ctx;
}
/** Data da sessão: a abertura da sessão pública da agenda (valendo); sem ela, o fim das propostas da fonte. { iso, dia, fonte, texto }. */
function LicH_sessao_(l, eventos) {
  var ev = (eventos || []).filter(function (e) { return Lic_s_(e.TIPO) === 'SESSAO_PUBLICA' && Lic_up_(e.SITUACAO) === 'ATIVO' && isFinite(Date.parse(Lic_s_(e.QUANDO_ISO))); })
    .sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0];
  if (ev) return { iso: Lic_s_(ev.QUANDO_ISO), dia: LicH_hoje_(Date.parse(ev.QUANDO_ISO)), fonte: 'Agenda: abertura da sessão pública (' + (Lic_up_(ev.NATUREZA) === 'CONFIRMADO' ? 'confirmada' : Lic_up_(ev.NATUREZA) === 'PREVISTO' ? 'pendente de confirmação' : 'calculada') + ')' };
  var enc = Lic_s_(l.ENCERRAMENTO_ISO);
  if (isFinite(Date.parse(enc))) return { iso: enc, dia: LicH_hoje_(Date.parse(enc)), fonte: 'Fonte (PNCP): fim do recebimento das propostas, horário de Brasília presumido' };
  return { iso: '', dia: '', fonte: 'sem data da sessão na agenda nem na fonte: a validade foi conferida com o dia de hoje' };
}
/** As exigências de habilitação desta oportunidade: checklist da leitura (temas de habilitação) e exigências da análise. */
function LicH_exigencias_(l, ctx) {
  var oid = Lic_s_(l.ID), out = [], vistos = {}, info = { leitura: null, analise: null, avisos: [] };
  var leits = (ctx.leituras[oid] || []).slice().sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); });
  var le = null, ck = null;
  for (var i = 0; i < leits.length; i++) { var c = LicH_checklistDe_(leits[i], ctx.checklist); if (c.ilegivel) { info.avisos.push('O checklist da leitura versão ' + Lic_s_(leits[i].VERSAO) + ' está ilegível (linhas faltando): foi ignorado.'); continue; } if (c.itens.length) { le = leits[i]; ck = c; break; } }
  if (le) {
    info.leitura = { versao: Number(le.VERSAO) || 0, situacao: Lic_up_(le.SITUACAO), em: Lic_s_(le.CONSOLIDACAO_EM) || Lic_s_(le.CRIADO_EM), atual: Lic_up_(le.SITUACAO) !== 'SUBSTITUIDA' };
    ck.itens.forEach(function (it) {
      var tema = Lic_s_(it.tema), frase = Lic_s_(it.trecho);
      if (!frase) return;
      var tipos = LicH_tiposDaExigencia_(frase, ctx.docs);
      if (LICH_TEMAS_HAB.indexOf(tema) < 0 && !(tema === 'A_CONFIRMAR' && tipos.length)) return;
      var ch = LicH_chave_(frase); if (vistos[ch]) return; vistos[ch] = true;
      out.push({ chave: ch, origem: 'LEITURA', ref: Lic_s_(it.id), tema: tema, temaNome: Lic_s_(it.temaNome) || tema, texto: Lic_texto_(frase, 1500), tipos: tipos,
        fontes: (it.fontes || []).slice(0, 4).map(function (f) { return { arquivo: Lic_s_(f.arquivo && (f.arquivo.titulo || f.arquivo.nome)), pagina: f.pagina, rotulo: Lic_s_(f.rotulo), linha: f.linha }; }),
        alerta: Lic_s_(it.alerta), pendenciaLeitura: Lic_s_(it.tipo) === 'PENDENCIA' });
    });
  }
  var an = (ctx.analises[oid] || []).filter(function (a) { return Lic_up_(a.SITUACAO) === 'CONCLUIDA'; }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0];
  if (an) {
    info.analise = { versao: Number(an.VERSAO) || 0, em: Lic_s_(an.CRIADO_EM) };
    var ja = out.map(function (x) { return LicH_norm_(x.texto); });
    (Lic_json_(an.EXIGENCIAS_JSON, []) || []).forEach(function (x, k) {
      var trecho = Lic_s_(x && x.fonte && x.fonte.trecho), texto = Lic_s_(x && x.texto), base = trecho || texto;
      if (!base) return;
      var nb = LicH_norm_(base);
      if (nb.length >= 20 && ja.some(function (j) { return j.indexOf(nb) >= 0 || (j.length >= 20 && nb.indexOf(j) >= 0); })) return;   // o mesmo trecho já veio da leitura
      var ch = LicH_chave_(base); if (vistos[ch]) return; vistos[ch] = true;
      out.push({ chave: ch, origem: 'ANALISE', ref: 'E' + (k + 1), tema: '', temaNome: 'Exigência da análise', texto: Lic_texto_(trecho || texto, 1500), resumo: trecho && texto !== trecho ? Lic_texto_(texto, 400) : '',
        tipos: LicH_tiposDaExigencia_(texto + ' ' + trecho, ctx.docs), fontes: [{ arquivo: Lic_s_(x.fonte && ((x.fonte.arquivo && (x.fonte.arquivo.titulo || x.fonte.arquivo.nome)) || x.fonte.rotulo || x.fonte.ref)), pagina: x.fonte && x.fonte.pagina, rotulo: Lic_s_(x.fonte && x.fonte.ref), linha: '' }], alerta: '', pendenciaLeitura: false });
    });
  }
  return { itens: out.slice(0, LICH_MAX_EXIGENCIAS), cortadas: Math.max(0, out.length - LICH_MAX_EXIGENCIAS), info: info };
}
/** Decisões da Diretoria por exigência: { chave: { atual, historico[] } } (a de maior versão vale). */
function LicH_decisoes_(lista) {
  var m = {};
  (lista || []).forEach(function (c) { var k = Lic_s_(c.CHAVE); (m[k] = m[k] || { historico: [] }).historico.push(c); });
  Object.keys(m).forEach(function (k) { m[k].historico.sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); }); m[k].atual = m[k].historico[0]; });
  return m;
}
function LicH_hashConf_(c) { return Lic_hash_([Lic_s_(c.OPORTUNIDADE_ID), Lic_s_(c.CHAVE), Lic_s_(c.DECISAO), Lic_s_(c.DOCUMENTO_ID), Lic_s_(c.DOCUMENTO_VERSAO), Lic_s_(c.MOTIVO), Number(c.VERSAO) || 0, Lic_s_(c.POR_ID), Lic_s_(c.EM)].join('|')); }
/** Cruzamento de UMA oportunidade (o que a aba mostra e o que o Hoje e o Painel contam). */
function LicH_cruzar_(l, ctx) {
  var oid = Lic_s_(l.ID), sessao = LicH_sessao_(l, ctx.eventos[oid]), ex = LicH_exigencias_(l, ctx), dec = LicH_decisoes_(ctx.conferencias[oid]);
  var cont = { total: 0, ATENDE: 0, VENCE_ANTES: 0, FALTA: 0, A_CONFERIR: 0, NAO_ATENDE: 0, pendencias: 0, manuais: 0 };
  var docsPorId = {}; ctx.docs.forEach(function (d) { docsPorId[Lic_s_(d.ID)] = d; });
  var itens = ex.itens.map(function (e) {
    var tipos = e.tipos.map(function (c) { return LicH_avaliarTipo_(c, ctx, sessao.dia, e.texto); });
    var sug = { situacao: 'A_CONFERIR', texto: '' };
    if (!tipos.length) sug.texto = 'O sistema não reconheceu, pelas palavras, qual documento atende esta exigência. A Diretoria confere e indica o documento ao marcar "atende".';
    else {
      var pior = tipos.slice().sort(function (a, b) { return LICH_CRUZ[b.situacao].peso - LICH_CRUZ[a.situacao].peso; })[0];
      var algumBom = tipos.some(function (t) { return t.situacao === 'ATENDE' || t.situacao === 'A_CONFERIR'; });
      sug.situacao = pior.situacao;
      sug.texto = tipos.length === 1 ? pior.texto : 'Pede ' + tipos.length + ' documentos; vale o pior deles: ' + pior.nome + ' (' + LICH_CRUZ[pior.situacao].nome.toLowerCase() + ').';
      // "ou", "salvo", "substituído", "dispensado": os documentos podem ser alternativos; com um que serve, a Diretoria confere
      if (tipos.length > 1 && LICH_CRUZ[pior.situacao].pendencia && algumBom && LICH_RX_ALTERNATIVA.test(' ' + LicH_norm_(e.texto) + ' ')) { sug.situacao = 'A_CONFERIR'; sug.texto = 'O texto cita documentos que podem ser alternativos (' + tipos.map(function (t) { return t.nome + ': ' + LICH_CRUZ[t.situacao].nome.toLowerCase(); }).join('; ') + '). Confira no edital se basta um deles.'; }
    }
    if ((e.pendenciaLeitura || e.alerta) && sug.situacao === 'ATENDE') { sug.situacao = 'A_CONFERIR'; sug.texto = 'O documento existe, mas a leitura marcou este trecho como pendência' + (e.alerta ? ' ("' + e.alerta + '" perto do trecho)' : '') + ': confirme no edital se a exigência vale.'; }
    var d = dec[e.chave], manual = null, efetivo = sug.situacao, efTexto = sug.texto;
    if (d && d.atual) {
      var a = d.atual, docA = Lic_s_(a.DOCUMENTO_ID) ? docsPorId[Lic_s_(a.DOCUMENTO_ID)] : null;
      manual = { decisao: Lic_up_(a.DECISAO), motivo: Lic_s_(a.MOTIVO), por: Lic_s_(a.POR_NOME), em: Lic_s_(a.EM), versao: Number(a.VERSAO) || 1, documentoId: Lic_s_(a.DOCUMENTO_ID), documentoCodigo: Lic_s_(a.DOCUMENTO_CODIGO), documentoVersao: Number(a.DOCUMENTO_VERSAO) || 0, integra: LicH_hashConf_(a) === Lic_s_(a.HASH) };
      if (manual.decisao === 'NAO_ATENDE') { efetivo = 'NAO_ATENDE'; efTexto = 'Marcado "não atende" por ' + manual.por + ': ' + manual.motivo; }
      else if (Lic_s_(a.DOCUMENTO_ID) && (!docA || !LicH_ativo_(docA))) { efetivo = 'A_CONFERIR'; efTexto = 'Marcado "atende" com o documento ' + manual.documentoCodigo + ', que saiu de uso: indique outro documento.'; }
      else if (docA) {
        var est = LicH_estadoNaSessao_(docA, sessao.dia, ctx.hoje);
        if (est.estado === 'VENCE_ANTES' || est.estado === 'VENCIDO') { efetivo = 'VENCE_ANTES'; efTexto = 'Marcado "atende" por ' + manual.por + ' com ' + manual.documentoCodigo + ', mas ele ' + est.texto + ': renove antes da sessão.'; }
        else if (est.estado === 'SEM_ARQUIVO') { efetivo = 'FALTA'; efTexto = 'Marcado "atende" com ' + manual.documentoCodigo + ', mas o documento está sem arquivo: anexe.'; }
        else { efetivo = 'ATENDE'; efTexto = 'Marcado "atende" por ' + manual.por + ' com ' + manual.documentoCodigo + (Number(docA.VERSAO) !== manual.documentoVersao ? ' (a decisão foi na versão ' + manual.documentoVersao + '; o documento está na versão ' + (Number(docA.VERSAO) || 1) + ')' : '') + ': ' + manual.motivo; }
      } else { efetivo = 'ATENDE'; efTexto = 'Marcado "atende" por ' + manual.por + ': ' + manual.motivo; }
      cont.manuais++;
    }
    cont.total++; cont[efetivo]++; if (LICH_CRUZ[efetivo].pendencia) cont.pendencias++;
    return Object.assign({}, e, { sugestao: sug, tiposAvaliados: tipos, manual: manual, efetivo: efetivo, efetivoNome: LICH_CRUZ[efetivo].nome, efetivoCor: LICH_CRUZ[efetivo].cor, efetivoTexto: efTexto, pendencia: !!LICH_CRUZ[efetivo].pendencia,
      historico: d ? d.historico.map(function (h) { return { decisao: Lic_up_(h.DECISAO), motivo: Lic_s_(h.MOTIVO), por: Lic_s_(h.POR_NOME), em: Lic_s_(h.EM), versao: Number(h.VERSAO) || 1, documento: Lic_s_(h.DOCUMENTO_CODIGO), hash: Lic_s_(h.HASH), integra: LicH_hashConf_(h) === Lic_s_(h.HASH) }; }) : [] });
  });
  return { sessao: sessao, itens: itens, contagens: cont, info: ex.info, cortadas: ex.cortadas };
}
function LicH_abaAcao_(eu, d) {
  var l = Lic_acharOp_(d.id), ctx = LicH_contexto_({ opIds: [l.ID] }), cr = LicH_cruzar_(l, ctx);
  var pacotes = Lic_ler_(LICH_ABAS.PACOTES).filter(function (p) { return Lic_s_(p.OPORTUNIDADE_ID) === Lic_s_(l.ID); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })
    .map(function (p) { return { id: Lic_s_(p.ID), versao: Number(p.VERSAO) || 0, em: Lic_s_(p.EM), por: Lic_s_(p.POR_NOME), pendencias: Number(p.PENDENCIAS) || 0, resumo: Lic_s_(p.RESUMO), hash: Lic_s_(p.HASH), integra: LicH_hashPacote_(p) === Lic_s_(p.HASH) }; });
  var docsUso = ctx.docs.filter(LicH_ativo_).map(function (x) { return { id: Lic_s_(x.ID), codigo: Lic_s_(x.CODIGO), nome: Lic_s_(x.NOME), tipo: Lic_up_(x.TIPO), validade: LicH_dia_(x.VALIDADE), temArquivo: !!Lic_s_(x.ARQUIVO_ID) }; })
    .sort(function (a, b) { return a.codigo < b.codigo ? -1 : 1; });
  return { op: { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_s_(l.ORGAO_NOME), situacao: Lic_s_(l.SITUACAO), acompanhada: LICH_SITUACOES_OP.indexOf(Lic_s_(l.SITUACAO)) >= 0 },
    habilitacao: Object.assign(cr, { pacotes: pacotes, documentos: docsUso, hoje: ctx.hoje, regras: LICH_REGRAS }) };
}
/** "Atende" / "Não atende" (Diretoria), com motivo e, no "atende", o documento (opcional). Uma linha nova por decisão. */
function LicH_conferir_(eu, d) {
  var decisao = Lic_up_(d.decisao), motivo = Lic_texto_(d.motivo, 1000);
  if (decisao !== 'ATENDE' && decisao !== 'NAO_ATENDE') throw new Error('Escolha "atende" ou "não atende". Nada foi alterado');
  if (motivo.length < 10) throw new Error('Escreva o motivo (pelo menos 10 letras): ele fica no histórico desta exigência com o seu nome e a data. Nada foi alterado');
  var l = Lic_acharOp_(d.id);
  return Lic_comTrava_(function () {
    var ctx = LicH_contexto_({ opIds: [l.ID] }), ex = LicH_exigencias_(l, ctx).itens.filter(function (e) { return e.chave === Lic_s_(d.chave); })[0];
    if (!ex) throw new Error('Não foi possível gravar: esta exigência não está mais na leitura ou na análise atual (o edital pode ter sido lido de novo). Atualize a aba e confira. Nada foi alterado');
    var doc = null;
    if (Lic_s_(d.documentoId)) {
      doc = ctx.docs.filter(function (x) { return Lic_s_(x.ID) === Lic_s_(d.documentoId); })[0];
      if (!doc || !LicH_ativo_(doc)) throw new Error('Escolha um documento em uso do cadastro de habilitação (ou nenhum). Nada foi alterado');
      if (decisao === 'NAO_ATENDE') doc = null;
    }
    var ant = LicH_decisoes_(ctx.conferencias[Lic_s_(l.ID)])[ex.chave], versao = ant ? (Number(ant.atual.VERSAO) || 1) + 1 : 1, agora = Lic_agora_();
    var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), CHAVE: ex.chave, EXIGENCIA_REF: ex.ref, EXIGENCIA_TEXTO: LicH_txt_(ex.texto, 1500), DECISAO: decisao,
      DOCUMENTO_ID: doc ? Lic_s_(doc.ID) : '', DOCUMENTO_CODIGO: doc ? Lic_s_(doc.CODIGO) : '', DOCUMENTO_VERSAO: doc ? Number(doc.VERSAO) || 1 : '', MOTIVO: motivo, VERSAO: versao, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora };
    reg.HASH = LicH_hashConf_(reg);
    SGO_DATA.insert(LICH_ABAS.CONFERENCIAS, reg);
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'HABILITACAO_CONFERENCIA', eu, { de: ant ? Lic_up_(ant.atual.DECISAO) : 'sugestão do sistema', para: decisao, texto: 'Exigência ' + ex.ref + ' ("' + Lic_texto_(ex.texto, 160) + '"): ' + (decisao === 'ATENDE' ? 'atende' : 'não atende') + (doc ? ' com ' + doc.CODIGO + ' versão ' + reg.DOCUMENTO_VERSAO : '') + '. Motivo: ' + motivo, versao: versao, fonte: 'Aba Habilitação', hash: reg.HASH });
    return { versao: versao, texto: 'Gravado: exigência ' + ex.ref + ' marcada "' + (decisao === 'ATENDE' ? 'atende' : 'não atende') + '" (versão ' + versao + ' da decisão). A anterior continua no histórico.' };
  });
}

// ------------------------------------------------------------ 4. relação de documentos para conferência (A4, sem envio)
function LicH_hashPacote_(p) { return Lic_hash_([Lic_s_(p.OPORTUNIDADE_ID), Number(p.VERSAO) || 0, Lic_s_(p.SESSAO_DIA), Lic_s_(p.ITENS_JSON), Lic_s_(p.POR_ID), Lic_s_(p.EM)].join('|')); }
function LicH_pacoteGerar_(eu, d) {
  var l = Lic_acharOp_(d.id);
  return Lic_comTrava_(function () {
    var ctx = LicH_contexto_({ opIds: [l.ID] }), cr = LicH_cruzar_(l, ctx), docsPorId = {};
    ctx.docs.forEach(function (x) { docsPorId[Lic_s_(x.ID)] = x; });
    if (!cr.itens.length) throw new Error('Não há exigências de habilitação lidas para esta licitação: faça a leitura do edital (aba "Leitura do edital") ou a análise antes de gerar a relação. Nada foi gravado');
    var itens = cr.itens.map(function (e) {
      var docs = [];
      if (e.manual && e.manual.documentoId && docsPorId[e.manual.documentoId]) { var dm = docsPorId[e.manual.documentoId]; docs.push(LicH_docCurto_(dm, LicH_estadoNaSessao_(dm, cr.sessao.dia, ctx.hoje))); }
      else e.tiposAvaliados.forEach(function (t) { if (t.documentos[0]) docs.push(t.documentos[0]); });
      return { ref: e.ref, origem: e.origem, texto: Lic_texto_(e.texto, 260), pagina: e.fontes[0] ? Lic_s_(e.fontes[0].rotulo || e.fontes[0].pagina) : '', situacao: e.efetivo, situacaoNome: e.efetivoNome, nota: Lic_texto_(e.efetivoTexto, 300),
        padroes: e.tiposAvaliados.filter(function (t) { return t.padroes; }).map(function (t) { return t.padroes; })[0] || null,
        documentos: docs.map(function (x) { return { codigo: x.codigo, nome: Lic_texto_(x.nome, 120), numero: x.numero, emissao: x.emissao, validade: x.validade, versao: x.versao, sha256: x.sha256, estado: x.estado }; }) };
    });
    var json = JSON.stringify(itens);
    if (json.length > 48000) { itens.forEach(function (i) { i.texto = Lic_texto_(i.texto, 120); i.nota = Lic_texto_(i.nota, 120); }); json = JSON.stringify(itens); }
    if (json.length > 48000) throw new Error('A relação passou do tamanho que cabe num registro (' + itens.length + ' exigências). Marque "não atende" ou confira as exigências repetidas e gere de novo. Nada foi gravado');
    var ant = Lic_ler_(LICH_ABAS.PACOTES).filter(function (p) { return Lic_s_(p.OPORTUNIDADE_ID) === Lic_s_(l.ID); }), versao = ant.reduce(function (m, p) { return Math.max(m, Number(p.VERSAO) || 0); }, 0) + 1, agora = Lic_agora_();
    var c = cr.contagens, resumo = c.total + ' exigências: ' + c.ATENDE + ' atendem, ' + c.A_CONFERIR + ' a conferir, ' + c.VENCE_ANTES + ' vencem antes da sessão, ' + c.FALTA + ' faltam, ' + c.NAO_ATENDE + ' não atendem';
    var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), VERSAO: versao, SESSAO_DIA: cr.sessao.dia, SESSAO_FONTE: Lic_texto_(cr.sessao.fonte, 300), ITENS_JSON: json, PENDENCIAS: c.pendencias, RESUMO: resumo, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora };
    reg.HASH = LicH_hashPacote_(reg);
    var ins = SGO_DATA.insert(LICH_ABAS.PACOTES, reg);
    reg.ID = Lic_s_(ins && ins.ID);
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'HABILITACAO_RELACAO', eu, { para: 'versão ' + versao, texto: 'Relação de documentos de habilitação gerada para conferência (nada foi enviado a portal). ' + resumo + '.', versao: versao, fonte: 'Aba Habilitação', hash: reg.HASH });
    return { pacote: { id: reg.ID, versao: versao, hash: reg.HASH }, html: LicH_pacoteHtml_(l, reg, itens, true), texto: 'Relação versão ' + versao + ' gerada (' + resumo + '). Ela não muda: para outra, gere de novo.' };
  });
}
function LicH_pacoteVer_(eu, d) {
  var l = Lic_acharOp_(d.id), p = SGO_DATA.getById(LICH_ABAS.PACOTES, Lic_s_(d.pacoteId));
  if (!p || Lic_s_(p.OPORTUNIDADE_ID) !== Lic_s_(l.ID)) throw new Error('Não foi possível abrir: esta relação não é desta licitação. Atualize a aba e tente de novo');
  var itens = Lic_json_(p.ITENS_JSON, []), integra = LicH_hashPacote_(p) === Lic_s_(p.HASH);
  return { html: LicH_pacoteHtml_(l, p, Array.isArray(itens) ? itens : [], integra), integra: integra };
}
/** A4 HTML da relação (sem script; todo texto escapado). */
function LicH_pacoteHtml_(l, p, itens, integra) {
  var e = LicH_esc_, sit = { ATENDE: 'Atende', A_CONFERIR: 'A conferir', VENCE_ANTES: 'Vence antes da sessão', FALTA: 'Falta', NAO_ATENDE: 'Não atende' };
  var linhas = itens.map(function (i) {
    var docs = (i.documentos || []).map(function (x) { return '<div class="doc"><b>' + e(x.codigo) + '</b> ' + e(x.nome) + (x.numero ? ' · nº ' + e(x.numero) : '') + ' · versão ' + e(x.versao) + '<br>Emissão ' + e(LicH_br_(x.emissao) || '—') + ' · validade ' + e(LicH_br_(x.validade) || 'sem data') + '<br><span class="h">SHA-256 ' + e(x.sha256 || 'sem arquivo') + '</span></div>'; }).join('');
    if (!docs && i.padroes) docs = '<div class="doc">Padrões de referência (Metrologia): ' + e(i.padroes.ativos) + ' ativos, ' + e(i.padroes.validos) + ' válidos na sessão</div>';
    return '<tr class="' + (i.situacao === 'ATENDE' ? '' : i.situacao === 'A_CONFERIR' ? 'conf' : 'pend') + '"><td><b>' + e(i.ref) + '</b>' + (i.pagina ? '<br><span class="m">' + e(i.pagina) + '</span>' : '') + '</td><td>' + e(i.texto) + '</td><td>' + (docs || '<span class="m">nenhum documento do cadastro</span>') + '</td><td><b>' + e(sit[i.situacao] || i.situacaoNome) + '</b><br><span class="m">' + e(i.nota) + '</span></td></tr>';
  }).join('');
  var pend = itens.filter(function (i) { return i.situacao === 'FALTA' || i.situacao === 'VENCE_ANTES' || i.situacao === 'NAO_ATENDE'; });
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + e('Relação de habilitação ' + l.CODIGO + ' v' + p.VERSAO) + '</title><style>' +
    '@page{size:A4;margin:14mm 12mm}*{box-sizing:border-box}body{margin:0;padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#1c1f1d;background:#fff}h1{font-size:15pt;margin:0 0 4px}h2{font-size:11.5pt;margin:14px 0 6px}' +
    'p{margin:3px 0;line-height:1.4}.m{color:#5b625d;font-size:8.5pt}.h{font-family:"Courier New",monospace;font-size:7.5pt;word-break:break-all}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #bfc5bf;padding:4px 5px;vertical-align:top;text-align:left;overflow-wrap:anywhere}' +
    'th{background:#eef0ed;font-size:9pt}col.a{width:9%}col.b{width:33%}col.c{width:34%}col.d{width:24%}tr.pend td{background:#fbeceb}tr.conf td{background:#fdf5e6}.doc{margin:0 0 4px}.aviso{border:1px solid #a3261b;color:#a3261b;padding:6px 8px;margin:8px 0}' +
    'footer{margin-top:14px;border-top:1px solid #bfc5bf;padding-top:6px}@media (max-width:600px){body{padding:8px;font-size:9.5pt}col.a{width:14%}}</style></head><body>' +
    '<h1>Relação de documentos de habilitação</h1><p><b>' + e(l.CODIGO) + '</b> · ' + e(l.ORGAO_NOME) + (l.MUNICIPIO || l.UF ? ' (' + e((l.MUNICIPIO ? l.MUNICIPIO + '/' : '') + l.UF) + ')' : '') + '</p>' +
    '<p>Processo: ' + e(l.NUMERO_CONTROLE_PNCP || '—') + ' · ' + e(l.MODALIDADE || '') + '</p><p>Licitante: Metrolabs, matriz de Goiânia (EPP). Sessão: ' + e(LicH_br_(p.SESSAO_DIA) || 'sem data') + ' (' + e(p.SESSAO_FONTE) + ')</p>' +
    '<p class="m">Relação interna para conferência. Nada foi enviado a portal. Cada documento com a versão do cadastro e o SHA-256 do arquivo guardado no SGO+.</p>' +
    (integra ? '' : '<div class="aviso">Atenção: o registro desta relação não confere com o hash gravado (pode ter sido alterado fora do SGO+).</div>') +
    '<h2>Exigências e documentos</h2><table><colgroup><col class="a"><col class="b"><col class="c"><col class="d"></colgroup><thead><tr><th>Item</th><th>Exigência (texto do edital)</th><th>Documento do cadastro</th><th>Situação na sessão</th></tr></thead><tbody>' + linhas + '</tbody></table>' +
    '<h2>Pendências (' + pend.length + ')</h2>' + (pend.length ? '<ul>' + pend.map(function (i) { return '<li><b>' + e(i.ref) + '</b> ' + e(sit[i.situacao]) + ': ' + e(i.nota) + '</li>'; }).join('') + '</ul>' : '<p>Nenhuma.</p>') +
    '<footer><p class="m">Gerada por ' + e(p.POR_NOME) + ' em ' + e(LicH_brHora_(p.EM)) + ' (Brasília) · versão ' + e(p.VERSAO) + ' · regras ' + e(LICH_REGRAS) + '</p><p class="m">SHA-256 deste registro: <span class="h">' + e(p.HASH) + '</span></p></footer></body></html>';
}

// ------------------------------------------------------------ resumo para o Hoje e o Painel (contagem com a fonte)
/** Nunca lança: falha vira { erro }. */
function LicH_resumo_() {
  try {
    LicH_garantirAbas_();
    var ops = Lic_ativas_().filter(function (l) { return LICH_SITUACOES_OP.indexOf(Lic_s_(l.SITUACAO)) >= 0; });
    var ctx = LicH_contexto_({ opIds: ops.map(function (l) { return l.ID; }) }), agora = Date.now();
    var d = { total: 0, VENCIDO: 0, VENCE_7: 0, VENCE_15: 0, VENCE_30: 0, semArquivo: 0, semData: 0 };
    ctx.docs.forEach(function (x) { if (!LicH_ativo_(x)) return; d.total++; var s = LicH_situacao_(x, ctx.hoje); if (d[s.codigo] !== undefined) d[s.codigo]++; if (!Lic_s_(x.ARQUIVO_ID)) d.semArquivo++; if (s.faltaData) d.semData++; });
    var lic = { pendencias: 0, falta: 0, venceAntes: 0, naoAtende: 0, aConferir: 0, comPendencia: 0, semExigencias: 0, acompanhadas: 0, ops: [] };
    ops.forEach(function (l) {
      var cr = LicH_cruzar_(l, ctx);
      if (cr.sessao.iso && Date.parse(cr.sessao.iso) < agora) return;   // sessão já passou: a habilitação daquela já foi
      lic.acompanhadas++;
      if (!cr.itens.length) { lic.semExigencias++; return; }
      var c = cr.contagens;
      lic.pendencias += c.pendencias; lic.falta += c.FALTA; lic.venceAntes += c.VENCE_ANTES; lic.naoAtende += c.NAO_ATENDE; lic.aConferir += c.A_CONFERIR;
      if (c.pendencias) { lic.comPendencia++; lic.ops.push({ id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 120), pendencias: c.pendencias, falta: c.FALTA, venceAntes: c.VENCE_ANTES, naoAtende: c.NAO_ATENDE, sessaoDia: cr.sessao.dia }); }
    });
    lic.ops.sort(function (a, b) { return (a.sessaoDia || '9999') < (b.sessaoDia || '9999') ? -1 : 1; });
    return { documentos: d, licitacoes: lic, hoje: ctx.hoje,
      fonteDocumentos: 'LIC_HAB_DOCUMENTOS (' + d.total + ' documentos em uso): situação pela validade no dia de hoje em Brasília (' + LicH_br_(ctx.hoje) + '); sem arquivo = documento cadastrado sem o PDF ou a foto.',
      fonteLicitacoes: 'Aba Habilitação de ' + lic.acompanhadas + ' licitações em análise, decisão, proposta ou disputa com a sessão por vir: exigências da leitura do edital (LIC_LEITURA_CHECKLIST, temas de habilitação) e da análise (LIC_ANALISES), cruzadas com LIC_HAB_DOCUMENTOS e as decisões da Diretoria (LIC_HAB_CONFERENCIAS). Pendência = falta, vence antes da sessão ou "não atende".' + (lic.semExigencias ? ' ' + lic.semExigencias + ' ainda sem leitura nem análise (sem exigências para cruzar).' : '') };
  } catch (e) { return { erro: 'Não foi possível contar a habilitação agora (' + Lic_s_(e && e.message) + ').' }; }
}

// ------------------------------------------------------------ avisos (infra de alertas da etapa 3: LIC_ALERTAS)
/** Hora de soltar um aviso de validade: das 8h às 18h de Brasília (fora disso, às 8h do dia seguinte ou de hoje). */
function LicH_liberar_(agoraMs) {
  var brt = new Date(agoraMs - 3 * 3600e3), h = brt.getUTCHours(), dia = brt.toISOString().slice(0, 10);
  if (h >= 8 && h < 18) return new Date(agoraMs).toISOString();
  var alvo = h < 8 ? dia : new Date(Date.parse(dia + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10);
  return new Date(Date.parse(alvo + 'T08:00:00-03:00')).toISOString();
}
var LICH_CACHE_AV = { ms: null, docs: null };
function LicH_docsDoInstante_(ms) {
  if (LICH_CACHE_AV.ms !== ms || !LICH_CACHE_AV.docs) { var m = {}; LicH_documentos_().forEach(function (d) { m[Lic_s_(d.ID)] = d; }); LICH_CACHE_AV = { ms: ms, docs: m }; }
  return LICH_CACHE_AV.docs;
}
/**
 * Programa os avisos de habilitação (chamado pela rodada dos alertas e depois de cada gravação). Sem repetir: a chave leva o
 * documento, a VERSÃO e a faixa; só a faixa atual é criada (a que já passou não sai) e a programada que ficou para trás é
 * cancelada. Vence antes da sessão: um aviso por licitação, documento e versão. Falta: um por licitação e conjunto de faltas.
 */
function LicH_alertasProgramar_(quando, o) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  o = o || {};
  if (typeof Lic_alertasCfg_ !== 'function') return { semAlertas: true };
  var props = PropertiesService.getScriptProperties(), ult = Date.parse(Lic_s_(props.getProperty('LICH_PROGRAMADO_EM'))), agoraMs = quando.getTime();
  if (!o.forcar && isFinite(ult) && agoraMs - ult < LICH_PROGRAMAR_MIN * 60000 && agoraMs >= ult) return { pulado: 'programado há menos de ' + LICH_PROGRAMAR_MIN + ' minutos' };
  LicH_garantirAbas_();
  var cfg = Lic_alertasCfg_(), r = { criados: 0, cancelados: 0 };
  if (!cfg.ligado) return { desligado: true };
  var integ = Lic_integrantes_(cfg), agora = quando.toISOString(), hoje = LicH_hoje_(agoraMs);
  if (!integ.length) return { semDestinatarios: true };
  var ops = Lic_ativas_().filter(function (l) { return LICH_SITUACOES_OP.indexOf(Lic_s_(l.SITUACAO)) >= 0 && !Lic_opSemAlerta_(l, cfg); });
  var ctx = LicH_contexto_({ opIds: ops.map(function (l) { return l.ID; }) });
  var cruz = ops.map(function (l) { return { l: l, cr: LicH_cruzar_(l, ctx) }; });
  var res = Lic_comTrava_(function () {
    var linhas = Lic_ler_(LIC_ABAS.ALERTAS), porChave = {}, novos = [];
    linhas.forEach(function (a) { porChave[Lic_s_(a.CHAVE)] = a; });
    var nova = function (x) { if (porChave[x.CHAVE]) return; porChave[x.CHAVE] = x; novos.push(x); r.criados++; };
    var base = function (extra) { return Object.assign({ AVISO_ID: Lic_avisoId_(), TIPO: 'DOCUMENTO', CANAIS: '', SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ATUALIZADO_EM: agora, CRIADO_EM: agora }, extra); };
    // 1. validade de cada documento em uso: a faixa atual (30, 15, 7 ou vencido), por versão
    ctx.docs.forEach(function (d) {
      if (!LicH_ativo_(d)) return;
      var sit = LicH_situacao_(d, hoje), fx = LicH_faixa_(sit);
      // faixas da mesma versão que ficaram para trás e ainda não saíram: canceladas (vale o aviso mais recente)
      linhas.forEach(function (a) {
        var g = Lic_s_(a.GRUPO).split('|');
        if (g[0] !== 'D' || g[1] !== 'V' || g[2] !== Lic_s_(d.ID) || Lic_up_(a.SITUACAO) !== 'PROGRAMADO') return;
        if (fx === null || Number(g[4]) > fx || g[3] !== String(Number(d.VERSAO) || 1)) {
          SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: fx === null ? 'O documento não está mais perto de vencer (versão ' + (Number(d.VERSAO) || 1) + ').' : 'Passou para a faixa mais próxima do vencimento: vale o aviso mais recente.', ATUALIZADO_EM: agora });
          a.SITUACAO = 'CANCELADO'; r.cancelados++;
        }
      });
      if (fx === null) return;
      var resp = Lic_s_(d.RESPONSAVEL_ID), para = resp && integ.some(function (u) { return u.id === resp; }) ? integ.filter(function (u) { return u.id === resp; }) : integ;
      var grupo = 'D|V|' + Lic_s_(d.ID) + '|' + (Number(d.VERSAO) || 1) + '|' + fx, val = LicH_dia_(d.VALIDADE);
      para.forEach(function (u) {
        nova(base({ CHAVE: grupo + '|' + u.id, GRUPO: grupo, OPORTUNIDADE_ID: '', CODIGO: Lic_s_(d.CODIGO), EVENTO_ID: Lic_s_(d.ID), EVENTO_TIPO: 'HAB_VALIDADE', PAPEL: 'AVISO',
          ANTECEDENCIA_MIN: fx * 1440, ANTECEDENCIA: fx ? fx + ' dias' : 'vencido', NIVEL: fx <= 7 ? 'IMPORTANTE' : 'NORMAL', USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: fx <= 7 ? '' : 'email',
          TITULO: 'Habilitação ' + Lic_s_(d.CODIGO) + ': ' + Lic_texto_(d.NOME, 80) + ' · ' + LicH_situacao_(d, hoje).texto, TEXTO: '', ALVO_ISO: fx ? LicH_fimDoDia_(val) : '', LIBERAR_EM: LicH_liberar_(agoraMs) }));
      });
    });
    // 2. licitações acompanhadas: documento que vence antes da sessão e documentos que faltam
    cruz.forEach(function (x) {
      var l = x.l, cr = x.cr, sMs = Date.parse(cr.sessao.iso);
      if (!cr.itens.length || !isFinite(sMs) || sMs <= agoraMs) return;
      var tits = Lic_titulares_(l, cfg, integ), papel = tits.length > 1 ? 'TODOS' : 'TITULAR', perto = sMs - agoraMs <= 3 * 864e5, vistos = {};
      cr.itens.forEach(function (e) {
        if (e.efetivo !== 'VENCE_ANTES') return;
        var ds = e.manual && e.manual.documentoId ? [{ id: e.manual.documentoId }] : [];
        if (!ds.length) e.tiposAvaliados.forEach(function (t) { (t.documentos || []).forEach(function (dd) { if (dd.estado === 'VENCE_ANTES' || dd.estado === 'VENCIDO') ds.push(dd); }); });
        ds.forEach(function (dd) {
          var doc = ctx.docs.filter(function (z) { return Lic_s_(z.ID) === Lic_s_(dd.id); })[0];
          if (!doc || vistos[doc.ID]) return; vistos[doc.ID] = true;
          var grupo = 'D|S|' + Lic_s_(l.ID) + '|' + Lic_s_(doc.ID) + '|' + (Number(doc.VERSAO) || 1);
          tits.forEach(function (u) {
            nova(base({ CHAVE: grupo + '|' + u.id, GRUPO: grupo, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: Lic_s_(doc.ID), EVENTO_TIPO: 'HAB_SESSAO', PAPEL: papel,
              ANTECEDENCIA_MIN: 0, ANTECEDENCIA: 'vence antes da sessão', NIVEL: perto ? 'CRITICO' : 'IMPORTANTE', USUARIO_ID: u.id, USUARIO_NOME: u.nome,
              TITULO: 'Licitação ' + Lic_s_(l.CODIGO) + ': ' + Lic_s_(doc.CODIGO) + ' vence antes da sessão (' + LicH_br_(cr.sessao.dia) + ')', TEXTO: '', ALVO_ISO: cr.sessao.iso, LIBERAR_EM: perto ? agora : LicH_liberar_(agoraMs) }));
          });
        });
      });
      var faltas = cr.itens.filter(function (e) { return e.efetivo === 'FALTA' || e.efetivo === 'NAO_ATENDE'; });
      if (faltas.length) {
        // um aviso por licitação e data da sessão (a sessão mudou na fonte = aviso novo); falta resolvida ou nova não repete o aviso:
        // a lista atual fica na aba Habilitação e nas pendências do Hoje e do Painel
        var grupoF = 'D|F|' + Lic_s_(l.ID) + '|' + cr.sessao.dia;
        tits.forEach(function (u) {
          nova(base({ CHAVE: grupoF + '|' + u.id, GRUPO: grupoF, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: '', EVENTO_TIPO: 'HAB_FALTA', PAPEL: 'AVISO',
            ANTECEDENCIA_MIN: 0, ANTECEDENCIA: 'documento faltando', NIVEL: 'IMPORTANTE', USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: 'email',
            TITULO: 'Licitação ' + Lic_s_(l.CODIGO) + ': ' + faltas.length + (faltas.length === 1 ? ' documento de habilitação faltando' : ' documentos de habilitação faltando'),
            TEXTO: faltas.slice(0, 8).map(function (e) { return e.ref + ' ' + Lic_texto_(e.efetivoTexto, 160); }).join(' | '), ALVO_ISO: cr.sessao.iso, LIBERAR_EM: LicH_liberar_(agoraMs) }));
        });
      }
    });
    if (novos.length) { if (typeof SGO_DATA.insertMany === 'function') SGO_DATA.insertMany(LIC_ABAS.ALERTAS, novos); else novos.forEach(function (n) { SGO_DATA.insert(LIC_ABAS.ALERTAS, n); }); }
    return r;
  });
  props.setProperty('LICH_PROGRAMADO_EM', agora);
  return res;
}
/** Versão nova do documento: avisos de validade da versão anterior que esperam são cancelados; os sem ciência, concluídos. */
function LicH_encerrarAvisosDoc_(d, motivo, agora) {
  try {
    Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) {
      var g = Lic_s_(a.GRUPO).split('|');
      if (g[0] !== 'D' || g[1] !== 'V' || g[2] !== Lic_s_(d.ID) || g[3] === String(Number(d.VERSAO) || 1)) return;
      var s = Lic_up_(a.SITUACAO);
      if (s === 'PROGRAMADO') SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: Lic_texto_(motivo, 500), ATUALIZADO_EM: agora });
      else if (['ENVIADO', 'FALHOU', 'ESCALONADO', 'NO_RESUMO'].indexOf(s) >= 0 && !Lic_s_(a.CIENTE_EM)) SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CONCLUIDO', CONCLUIDO_EM: agora, ESCALONAR_EM: '', CANCELADO_MOTIVO: Lic_texto_('Concluído sem ciência: ' + motivo, 500), ATUALIZADO_EM: agora });
    });
  } catch (e) { console.error('Licitações, habilitação, avisos da versão anterior: ' + ((e && e.message) || e)); }
}
/** '' = o aviso de habilitação ainda vale; senão o motivo. Chamado por Lic_alertaSemValer_ (SGO_Licitacoes_Alertas.js). */
function LicH_alertaSemValer_(a, ops, cfg, agoraMs) {
  var g = Lic_s_(a.GRUPO).split('|'), docs = LicH_docsDoInstante_(agoraMs);
  if (g[0] !== 'D') return 'Aviso de habilitação sem grupo reconhecido.';
  if (g[1] === 'V') {
    var d = docs[g[2]];
    if (!d || !LicH_ativo_(d)) return 'O documento saiu de uso.';
    if (String(Number(d.VERSAO) || 1) !== g[3]) return 'O documento tem versão nova (' + (Number(d.VERSAO) || 1) + ').';
    var fx = LicH_faixa_(LicH_situacao_(d, LicH_hoje_(agoraMs)));
    if (fx === null) return 'O documento não está mais perto de vencer.';
    if (Lic_up_(a.SITUACAO) === 'PROGRAMADO' && fx < Number(g[4])) return 'Passou para a faixa mais próxima do vencimento: vale o aviso mais recente.';
    return '';
  }
  var l = ops[Lic_s_(a.OPORTUNIDADE_ID)], m = Lic_opSemAlerta_(l, cfg);
  if (m) return 'Sem alerta: oportunidade ' + m + '.';
  if (LICH_SITUACOES_OP.indexOf(Lic_s_(l.SITUACAO)) < 0) return 'A licitação não está mais em análise, decisão, proposta ou disputa.';
  var s = LicH_sessao_(l, typeof Lic_eventosDe_ === 'function' ? Lic_eventosDe_(l.ID) : []);
  if (!s.iso || Date.parse(s.iso) <= agoraMs) return 'A sessão já passou.';
  if (g[1] === 'S') {
    var doc = docs[g[3]];
    if (!doc || !LicH_ativo_(doc)) return 'O documento saiu de uso.';
    if (String(Number(doc.VERSAO) || 1) !== g[4]) return 'O documento tem versão nova (' + (Number(doc.VERSAO) || 1) + ').';
    var val = LicH_dia_(doc.VALIDADE);
    if (val && val >= s.dia) return 'O documento vale até a sessão.';
  }
  return '';
}
/** Texto do aviso de habilitação: { titulo, texto (e-mail), params (os 9 do modelo sgo_licitacao_prazo) }. Chamado por Lic_alertaConteudo_. */
function LicH_alertaConteudo_(a, l, quando) {
  var agoraMs = (quando instanceof Date ? quando : new Date()).getTime(), nivel = LIC_NIVEIS[Lic_up_(a.NIVEL)] || 'normal', tipo = Lic_s_(a.EVENTO_TIPO);
  var d = Lic_s_(a.EVENTO_ID) ? SGO_DATA.getById(LICH_ABAS.DOCUMENTOS, Lic_s_(a.EVENTO_ID)) : null, hoje = LicH_hoje_(agoraMs);
  var sit = d ? LicH_situacao_(d, hoje) : null, esc = Lic_s_(a.PAPEL) === 'ESCALONAMENTO', reenvio = Lic_s_(a.PAPEL) === 'REENVIO';
  var docTxt = d ? Lic_s_(d.CODIGO) + ' · ' + Lic_s_(d.NOME) : 'documento de habilitação', acao, titulo, linhas, params;
  var ciencia = 'Confirmar ciência (registra que você viu este aviso; não conclui a tarefa): ' + Lic_linkCiencia_(a.AVISO_ID, 'e');
  if (tipo === 'HAB_VALIDADE') {
    acao = 'renovar o documento e cadastrar a versão nova em Licitações › Documentos de habilitação';
    titulo = 'Habilitação ' + (d ? Lic_s_(d.CODIGO) : '') + ': ' + (d ? Lic_texto_(d.NOME, 80) : 'documento') + ' · ' + (sit ? sit.texto : '');
    linhas = ['METROLABS · AVISO DE DOCUMENTO DE HABILITAÇÃO (' + nivel + ')', '', 'Documento: ' + docTxt, 'Número: ' + (d && Lic_s_(d.NUMERO) || 'não informado'), 'Emissor: ' + (d && Lic_s_(d.ORGAO_EMISSOR) || 'não informado'),
      'Validade: ' + (d && LicH_br_(LicH_dia_(d.VALIDADE)) || 'sem data'), 'Situação: ' + (sit ? sit.texto : '-'), 'Responsável: ' + (d && Lic_s_(d.RESPONSAVEL_NOME) || 'Diretoria de Licitações'), 'Ação necessária: ' + acao];
    params = [nivel, (d && Lic_s_(d.ORGAO_EMISSOR)) || 'Metrolabs (habilitação)', 'Documento de habilitação ' + (d ? Lic_s_(d.CODIGO) : ''), d ? Lic_texto_(d.NOME, 140) : '-', 'Validade do documento',
      (d && LicH_br_(LicH_dia_(d.VALIDADE))) || 'sem data', sit ? sit.texto : '-', acao, Lic_linkAviso_(a.AVISO_ID) || '@LINK'];
  } else {
    var orgao = Lic_s_(l && l.ORGAO_NOME) || 'Órgão não informado', local = l ? (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF) : '';
    var processo = (Lic_s_(l && l.NUMERO_CONTROLE_PNCP) || Lic_s_(a.CODIGO)) + (l && Lic_s_(l.MODALIDADE) ? ' (' + Lic_s_(l.MODALIDADE) + ')' : '');
    var alvoMs = Date.parse(Lic_s_(a.ALVO_ISO)), quandoTxt = LicH_brHora_(a.ALVO_ISO) + ' (horário de Brasília)', restante = typeof Lic_tempoRestante_ === 'function' ? Lic_tempoRestante_(alvoMs - agoraMs) : '';
    var falta = tipo === 'HAB_FALTA';
    acao = falta ? 'providenciar e cadastrar os documentos que faltam (aba Habilitação da licitação)' : 'renovar ' + (d ? Lic_s_(d.CODIGO) : 'o documento') + ' antes da sessão e cadastrar a versão nova';
    if (esc) acao = 'sem ciência de ' + Lic_s_(a.ESCALONADO_PARA || 'quem recebeu primeiro') + ': confirme a ciência e ' + acao;
    if (reenvio) acao = 'lembrete (sem ciência): ' + acao;
    titulo = (esc ? 'Sem ciência · ' : reenvio ? 'Lembrete · ' : '') + (Lic_s_(a.TITULO) || ('Licitação ' + Lic_s_(a.CODIGO) + ': habilitação'));
    linhas = ['METROLABS · ALERTA DE LICITAÇÃO, HABILITAÇÃO (' + nivel + ')', '', 'Órgão: ' + orgao + (local ? ' (' + local + ')' : ''), 'Processo: ' + processo, 'Sessão: ' + quandoTxt, 'Tempo restante: ' + restante,
      falta ? 'Faltam: ' + Lic_s_(a.TEXTO) : 'Documento: ' + docTxt + ' (validade ' + (d && LicH_br_(LicH_dia_(d.VALIDADE)) || 'sem data') + ')', 'Ação necessária: ' + acao];
    params = [nivel, orgao + (local ? ' (' + local + ')' : ''), processo, falta ? 'Documentos de habilitação faltando' : Lic_texto_(docTxt, 140), falta ? 'Habilitação incompleta' : 'Documento vence antes da sessão', quandoTxt, restante, acao, Lic_linkAviso_(a.AVISO_ID) || '@LINK'];
  }
  var texto = linhas.concat(['', ciencia, '', 'O botão abaixo abre o SGO+, com login. Aviso da Diretoria de Licitações; a renovação é registrada no cadastro de habilitação, com versão e histórico.']).join('\n');
  return { titulo: titulo, texto: texto, params: params };
}

// ------------------------------------------------------------ ações (Licitacoes_api, 'habilitacao', { op })
var LICH_OPS = {
  tela: function (eu) { return LicH_tela_(eu); },
  salvar: function (eu, d) { return LicH_salvar_(eu, d); },
  retirar: function (eu, d) { return LicH_retirar_(eu, d); },
  reativar: function (eu, d) { return LicH_reativar_(eu, d); },
  versoes: function (eu, d) { return LicH_versoes_(eu, d); },
  arquivo: function (eu, d) { return LicH_arquivo_(eu, d); },
  aba: function (eu, d) { return LicH_abaAcao_(eu, d); },
  conferir: function (eu, d) { return LicH_conferir_(eu, d); },
  pacoteGerar: function (eu, d) { return LicH_pacoteGerar_(eu, d); },
  pacoteVer: function (eu, d) { return LicH_pacoteVer_(eu, d); }
};
function LicH_acao_(eu, d) {
  Lic_exigir_(eu, 'usar os documentos de habilitação');
  var fn = LICH_OPS[Lic_s_(d && d.op)];
  if (!fn) throw new Error('Não foi possível: ação de habilitação desconhecida (' + Lic_s_(d && d.op) + '). Atualize a página (F5) e tente de novo');
  LicH_garantirAbas_();
  return fn(eu, d || {});
}
