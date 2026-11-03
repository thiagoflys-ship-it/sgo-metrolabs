/****************************************************
 * SGO+ LICITAÇÕES — CONTRATOS CONQUISTADOS E INTEGRAÇÃO COM OS MÓDULOS (02/11/2026)
 *
 * Missão (docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md): "vitória vira contrato → contrato alimenta comercial, técnico,
 * laboratório, NR-13, estoque, logística, RH e financeiro"; "Módulo inexistente = dependência declarada, sem cadastro duplicado".
 * Manual: docs/MANUAL_MODULO_LICITACOES.md, seção "Contratos (tela Contratos e aba Contrato da ficha)", com o levantamento de
 * cada módulo do SGO+ (o que existe, onde, o que integra e o que fica como dependência declarada).
 *
 * CONTRATO (LIC_CONTRATOS, um por licitação; a ata de registro de preços conta como um registro, as ordens dela são entregas):
 *   - nasce do resultado HOMOLOGADO (LIC_DISPUTAS.CONTRATO_JSON pronto, SGO_Licitacoes_Disputa.js): itens ganhos, valor final e
 *     homologação vêm do resultado; a Diretoria completa o número, a vigência, o reajuste, a garantia, as entregas e as obrigações;
 *   - ou é REGISTRADO MANUALMENTE (resultado fora do SGO+, homologação pendente, disputa sem registro), com motivo de pelo menos
 *     20 letras e a fonte do resultado; os itens são digitados.
 *   A licitação vai para "Contrato" no Kanban pela mesma regra de passagem (motivo e LIC_HISTORICO, fonte "Contratos").
 * VERSÕES (LIC_CONTRATO_VERSOES): cada gravação é uma versão nova com a foto completa dos dados (DADOS_JSON), o motivo, o que mudou
 *   e o hash encadeado com a versão anterior. Correção de digitação, termo aditivo (número e fonte), apostilamento (reajuste) e
 *   encerramento são versões; nada é alterado nem apagado. Versão mexida fora do SGO+ para as gravações e diz o que fazer.
 * ARQUIVO (contrato assinado, termo aditivo): PDF ou imagem conferidos pela assinatura dos bytes (LicH_lerArquivo_), guardados
 *   RESTRITOS (LicDoc_restrito_ confere e, se não ficou restrito, manda para a lixeira e não grava) com o SHA-256; abrir confere o hash.
 * PRAZOS (LIC_EVENTOS, a mesma agenda das licitações): início, fim, renovação, reajustes (a cada 12 meses da data-base), validade da
 *   garantia, entregas e obrigações, natureza CONFIRMADO (digitado do contrato assinado). Versão nova muda o prazo por versão
 *   (o anterior fica RETIFICADO); marco que saiu fica CANCELADO com o motivo. Os alertas são os da etapa 3 (Diretoria de Licitações,
 *   WhatsApp só pelo modelo aprovado sgo_licitacao_prazo, ciência e escalonamento), com as antecedências de cada tipo nas regras.
 * INTEGRAÇÃO (sempre por ação explícita da Diretoria; nada é criado em outro módulo sozinho; tudo em LIC_CONTRATO_VINCULOS):
 *   - Clientes: o órgão é procurado no cadastro único (CAD_CLIENTES e CAD_UNIDADES) pelo CNPJ do PNCP; achou = "Vincular"; não achou =
 *     "Cadastrar o órgão" com os dados públicos do PNCP já preenchidos, pela mesma regra do cadastro (CadQ_salvarCliente_: cadastro
 *     completo e "Ciente"); o CNPJ nunca é duplicado (recusa antes e o cadastro confere de novo).
 *   - Comercial: "Registrar como ganha no Comercial" cria a oportunidade (origem "Licitação", ORIGEM_REF = o contrato) pelas regras do
 *     próprio Comercial (ComOpo_salvar_) e a marca como ganha (ComOpo_ganhar_). Nenhuma proposta do Comercial é criada (a proposta é
 *     a de Licitações). Perdidas ficam só em LIC_RESULTADOS (fonte única).
 *   - Agenda única (Minhas atividades, ATV_ATIVIDADES): "Levar à agenda única" lança uma atividade por marco futuro para o responsável.
 *   - Planejar execução: os serviços do contrato por área, pelo código do catálogo (CAL = Metrologia, QUA = Qualificação, NR13 = NR-13,
 *     o resto = Assistência; produto = Compras). Cria só a atividade de planejamento da área (Metrologia, Qualificação e NR-13 caem no
 *     Kanban do Cronograma de execução), com confirmação; nunca O.S., chamado, requisição nem certificado.
 *   - Financeiro: não há módulo de faturamento no SGO+: a previsão por entrega e por mês é só leitura aqui (dependência declarada).
 * Relatório A4 do contrato: SGO_Licitacoes_Relatorios.js (LicRel_gravar_, tipo CONTRATO), versão imutável com o SHA-256.
 * Ações: Licitacoes_api(sessionId, 'contratos', { op, ... }); só Diretoria e Administrador. Nenhuma função devolve Date cru.
 ****************************************************/

var LICC_REGRAS = 'LIC-CONTRATO-2026-11-02.1';
var LICC_ABAS = { CONTRATOS: 'LIC_CONTRATOS', VERSOES: 'LIC_CONTRATO_VERSOES', VINCULOS: 'LIC_CONTRATO_VINCULOS' };
var LICC_COLUNAS = {
  // UMA LINHA POR CONTRATO: o resumo da versão em vigor (o dado completo fica na versão)
  LIC_CONTRATOS: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'NUMERO', 'NUMERO_CONTRATO', 'TIPO', 'ORIGEM', 'DISPUTA_ID', 'SITUACAO', 'VERSAO', 'VERSAO_ID', 'VERSAO_HASH', 'ORGAO_NOME', 'ORGAO_CNPJ',
    'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'VALOR_TOTAL', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'CLIENTE_ID', 'CLIENTE_NOME', 'COMERCIAL_OPO_ID', 'COMERCIAL_OPO_CODIGO', 'CRIADO_POR_ID', 'CRIADO_POR_NOME',
    'CRIADO_EM', 'ATUALIZADO_EM', 'HASH'],
  // UMA LINHA POR VERSÃO; nunca muda depois de gravada (hash encadeado com a anterior)
  LIC_CONTRATO_VERSOES: ['ID', 'CONTRATO_ID', 'OPORTUNIDADE_ID', 'VERSAO', 'TIPO', 'ADITIVO_NUMERO', 'MOTIVO', 'FONTE', 'DADOS_JSON', 'DADOS_HASH', 'MUDOU', 'ARQUIVO_ID', 'ARQUIVO_NOME', 'ARQUIVO_TIPO',
    'ARQUIVO_TAMANHO', 'ARQUIVO_SHA256', 'POR_ID', 'POR_NOME', 'EM', 'HASH_ANTERIOR', 'HASH'],
  // UMA LINHA POR VÍNCULO COM OUTRO MÓDULO (cliente, Comercial, atividade, planejamento); nunca muda
  LIC_CONTRATO_VINCULOS: ['ID', 'CONTRATO_ID', 'OPORTUNIDADE_ID', 'MODULO', 'ACAO', 'CHAVE', 'REF_ID', 'REF_CODIGO', 'REF_TEXTO', 'MOTIVO', 'POR_ID', 'POR_NOME', 'EM', 'HASH']
};
var LICC_COLUNAS_TEXTO = {
  LIC_CONTRATOS: ['NUMERO', 'NUMERO_CONTRATO', 'ORGAO_CNPJ', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'VERSAO_HASH', 'CRIADO_EM', 'ATUALIZADO_EM', 'HASH'],
  LIC_CONTRATO_VERSOES: ['ADITIVO_NUMERO', 'DADOS_HASH', 'ARQUIVO_SHA256', 'EM', 'HASH_ANTERIOR', 'HASH'],
  LIC_CONTRATO_VINCULOS: ['CHAVE', 'REF_CODIGO', 'EM', 'HASH']
};
var LICC_TIPOS = { CONTRATO: 'Contrato', ATA: 'Ata de registro de preços' };
var LICC_VERSOES = { ORIGINAL: 'Registro do contrato', CORRECAO: 'Correção de digitação', ADITIVO: 'Termo aditivo', APOSTILAMENTO: 'Apostilamento (reajuste)', ENCERRAMENTO: 'Encerramento', REABERTURA: 'Reabertura (Administrador)' };
var LICC_SITUACOES = { VIGENTE: 'Vigente', ENCERRADO: 'Encerrado', RESCINDIDO: 'Rescindido' };
/** Lei 14.133/2021, art. 96, § 1º. */
var LICC_GARANTIAS = { CAUCAO: 'Caução em dinheiro', TITULO: 'Títulos da dívida pública', SEGURO: 'Seguro-garantia', FIANCA: 'Fiança bancária', CAPITALIZACAO: 'Título de capitalização' };
var LICC_A_VENCER_DIAS = 90;
var LICC_RENOVACAO_PADRAO_DIAS = 60;
var LICC_VIGENCIA_MAX_DIAS = 3653;          // 10 anos (Lei 14.133/2021, art. 107)
var LICC_ADITIVO_LIMITE = 0.25;             // acréscimo até 25% do valor inicial (Lei 14.133/2021, art. 125)
var LICC_PASTA = 'Licitações - Contratos (restrito)';
var LICC_DE_MANUAL = ['RADAR', 'ANALISE', 'DECISAO', 'PROPOSTA', 'RESULTADO'];
/** Áreas de execução pelo prefixo do código do catálogo oficial (SGO_Comercial_CatalogoOficial.js). */
var LICC_AREAS = {
  METROLOGIA: { nome: 'Metrologia (calibração)', modulo: 'cronograma_execucao', moduloNome: 'Cronograma de execução', onde: 'Cronograma de execução (Kanban da Técnica) e Minhas atividades',
    existe: 'Calibração e certificados (CertCal, CERT_CALIBRACAO), Cronograma de execução e Planejamento CME', depende: 'O certificado é emitido no CertCal depois da calibração; o SGO+ não cria calibração nem certificado a partir do contrato.' },
  QUALIFICACAO: { nome: 'Qualificação (autoclave, lavadora, estufa e outros)', modulo: 'cronograma_execucao', moduloNome: 'Cronograma de execução', onde: 'Cronograma de execução (Kanban da Técnica) e Minhas atividades',
    existe: 'Relatórios de qualificação (Autoclave, Lavadora, Estufa e banho, QUALIF_EMISSOES) e Cronograma de execução', depende: 'O relatório de qualificação é emitido no módulo do equipamento; o SGO+ não cria qualificação a partir do contrato.' },
  NR13: { nome: 'NR-13 (inspeção de vasos de pressão)', modulo: 'cronograma_execucao', moduloNome: 'Cronograma de execução', onde: 'Cronograma de execução (Kanban da Técnica) e Minhas atividades',
    existe: 'Laudos NR-13 (NR13_LAUDOS) e Cronograma de execução', depende: 'O laudo NR-13 é emitido no módulo NR-13; o SGO+ não cria laudo a partir do contrato.' },
  ASSISTENCIA: { nome: 'Assistência técnica e engenharia clínica', modulo: 'assistencia', moduloNome: 'Assistência técnica', onde: 'Minhas atividades (a Assistência abre o chamado e agenda a O.S.)',
    existe: 'Chamados e O.S. (ATEC_CHAMADOS, ATEC_OS)', depende: 'O chamado e a O.S. são abertos pela Assistência: a abertura automática existe só a partir de proposta do Comercial (Assistencia_doPedidoComercial_), não de contrato de licitação.' },
  COMPRAS: { nome: 'Estoque e Compras (produtos do contrato)', modulo: 'compras', moduloNome: 'Compras', onde: 'Minhas atividades (Compras abre a requisição com o número do contrato no vínculo)',
    existe: 'Requisições e pedidos de compra (CMP_REQUISICOES, CMP_PEDIDOS)', depende: 'A requisição é aberta em Compras: a abertura automática existe só a partir de proposta do Comercial (Compras_doPedidoComercial_).' }
};

/** Levantamento de 02/11/2026: o que fica como dependência declarada (o módulo não existe, ou existe sem forma segura de receber o contrato). */
var LICC_DEPENDENCIAS = [
  { modulo: 'Financeiro (faturamento, recebimentos, garantias)', texto: 'O SGO+ não tem módulo de faturamento nem de contas a receber (o Financeiro de hoje é o pagamento das compras, SGO_Compras_Financeiro.js). A previsão por entrega e por mês fica só para leitura no contrato; nenhum lançamento é feito.' },
  { modulo: 'Contratos de clientes', texto: 'Não há módulo de contratos fora de Licitações (a Assistência guarda só o prazo de atendimento por cliente, ATEC_CONFIG). O contrato de licitação fica em LIC_CONTRATOS, com versões e aditivos.' },
  { modulo: 'Assistência e engenharia clínica (O.S.)', texto: 'O chamado e a O.S. são abertos pela Assistência. "Planejar a execução" lança a atividade da área; a abertura automática só existe a partir de proposta do Comercial.' },
  { modulo: 'Metrologia, Qualificação e NR-13', texto: 'Certificados, relatórios de qualificação e laudos são emitidos nos módulos de cada serviço depois da execução. "Planejar a execução" lança a atividade no Cronograma de execução; nada é emitido a partir do contrato.' },
  { modulo: 'Estoque e Compras', texto: 'A requisição é aberta em Compras, com o número do contrato no vínculo; a abertura automática só existe a partir de proposta do Comercial.' },
  { modulo: 'RH (equipes, qualificações, documentos dos responsáveis técnicos)', texto: 'Usuários, ponto e Programa de conduta existem, mas sem alocação de equipe por contrato: a equipe é definida no planejamento da área. Os documentos de responsável técnico exigidos pelo edital ficam em Documentos de habilitação.' },
  { modulo: 'Logística e Veículos', texto: 'A Frota existe (veículos, abastecimento, manutenção), sem reserva por contrato: o deslocamento entra no planejamento da área e no Cronograma de execução.' },
  { modulo: 'Documentos e Qualidade', texto: 'O contrato assinado e os aditivos ficam guardados restritos em Licitações, com o SHA-256 e as versões; não vão sozinhos para Documentos (DOC_DOCUMENTOS).' },
  { modulo: 'Notificações', texto: 'Integrado: os prazos do contrato usam os alertas de Licitações (Central de alertas, e-mail e WhatsApp pelo modelo aprovado sgo_licitacao_prazo, ciência e escalonamento), só para a Diretoria de Licitações.' }
];

// ------------------------------------------------------------ abas e utilitários
function LicC_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICC_ABAS_OK_V1')) return; } catch (e) {}
  Object.keys(LICC_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LICC_COLUNAS[aba]);
    LICC_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LICC_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LICC_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
function LicC_txt_(v, max) { return LicD_txt_(v, max); }
function LicC_dia_(v) { return LicD_diaValido_(v); }
function LicC_br_(dia) { return LicD_dia_(dia); }
function LicC_moeda_(v) { return LicD_moeda_(v); }
function LicC_r2_(v) { return LicD_r2_(v); }
function LicC_hoje_() { return Lic_diaSp_(Lic_agora_()); }
function LicC_somarDias_(dia, n) { return Lic_somarDia_(dia, n); }
function LicC_diasEntre_(de, ate) { return Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5); }
/** Mesmo dia n anos depois (29/02 vira 28/02 no ano não bissexto). */
function LicC_somarAnos_(dia, n) {
  var a = Number(dia.slice(0, 4)) + n, m = dia.slice(5, 7), d = dia.slice(8, 10), t = a + '-' + m + '-' + d;
  return LicC_dia_(t) || (a + '-' + m + '-28');
}
function LicC_cnpj_(v) { var d = Lic_s_(v).replace(/\D/g, ''); try { if (typeof SGO_UTILS !== 'undefined' && SGO_UTILS.cnpjArmazenado) d = SGO_UTILS.cnpjArmazenado(v) || d; } catch (e) {} return d; }
function LicC_cnpjValido_(d) { try { return d.length === 14 && typeof SGO_UTILS !== 'undefined' && SGO_UTILS.isCnpj ? !!SGO_UTILS.isCnpj(d) : d.length === 14; } catch (e) { return false; } }
function LicC_cnpjTxt_(d) { return d && d.length === 14 ? d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12) + '-' + d.slice(12) : Lic_s_(d); }
/** Valor em reais digitado: a leitura estrita da disputa (vírgula para os centavos). '' = vazio. */
function LicC_reais_(v, rotulo, opcional) {
  if ((v === '' || v === null || v === undefined) && opcional) return '';
  var r = LicD_lerReais_(v);
  if (r.erro) throw new Error('Escreva ' + rotulo + ' em reais: ' + (r.erro === 'vazio' ? 'o campo está vazio' : r.erro) + '. Nada foi gravado');
  if (!(r.valor > 0) || r.valor > 1000000000) throw new Error('Escreva ' + rotulo + ' em reais, maior que zero (por exemplo 1.250,00). Nada foi gravado');
  return LicC_r2_(r.valor);
}
/** Quantidade digitada: número inteiro ou com vírgula (ponto só como milhar). */
function LicC_qtd_(v, rotulo) {
  var n = null;
  if (typeof v === 'number') n = isFinite(v) ? v : null;
  else {
    var s = Lic_s_(v).replace(/\s+/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d{1,4})?$/.test(s)) s = s.replace(/\./g, '');
    if (/^\d+(,\d{1,4})?$/.test(s)) n = Number(s.replace(',', '.'));
  }
  if (n === null || !(n > 0) || n > 10000000) throw new Error('Escreva ' + rotulo + ' como número maior que zero (por exemplo 100 ou 2,5). Nada foi gravado');
  return Math.round(n * 10000) / 10000;
}
function LicC_contratosDe_(oid) { return Lic_ler_(LICC_ABAS.CONTRATOS).filter(function (r) { return Lic_s_(r.OPORTUNIDADE_ID) === Lic_s_(oid); }); }
function LicC_versoesDe_(cid) { return Lic_ler_(LICC_ABAS.VERSOES).filter(function (v) { return Lic_s_(v.CONTRATO_ID) === Lic_s_(cid); }).sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); }); }
function LicC_vinculosDe_(cid) { return Lic_ler_(LICC_ABAS.VINCULOS).filter(function (v) { return Lic_s_(v.CONTRATO_ID) === Lic_s_(cid); }); }
function LicC_hashVersao_(v) {
  return Lic_hash_([Lic_s_(v.CONTRATO_ID), String(Number(v.VERSAO) || 0), Lic_up_(v.TIPO), Lic_s_(v.ADITIVO_NUMERO), Lic_s_(v.MOTIVO), Lic_s_(v.FONTE), Lic_s_(v.DADOS_HASH), Lic_s_(v.MUDOU),
    Lic_s_(v.ARQUIVO_ID), Lic_s_(v.ARQUIVO_SHA256), Lic_s_(v.POR_ID), Lic_s_(v.POR_NOME), Lic_s_(v.EM), Lic_s_(v.HASH_ANTERIOR)].join('|'));
}
function LicC_hashLinha_(r) {
  // revisão de 42a2c1f: o resumo que a lista mostra (número, valor, vigência, CNPJ) também entra no hash
  return Lic_hash_([Lic_s_(r.OPORTUNIDADE_ID), Lic_s_(r.NUMERO), String(Number(r.VERSAO) || 0), Lic_s_(r.VERSAO_ID), Lic_s_(r.VERSAO_HASH), Lic_up_(r.SITUACAO), Lic_s_(r.CLIENTE_ID), Lic_s_(r.COMERCIAL_OPO_ID),
    Lic_s_(r.CRIADO_POR_ID), Lic_s_(r.CRIADO_EM), Lic_s_(r.NUMERO_CONTRATO), LicD_h_(r.VALOR_TOTAL), Lic_s_(r.VIGENCIA_INICIO), Lic_s_(r.VIGENCIA_FIM), LicC_cnpj_(r.ORGAO_CNPJ)].join('|'));
}
function LicC_hashVinculo_(x) { return Lic_hash_([Lic_s_(x.CONTRATO_ID), Lic_up_(x.MODULO), Lic_up_(x.ACAO), Lic_s_(x.CHAVE), Lic_s_(x.REF_ID), Lic_s_(x.REF_TEXTO), Lic_s_(x.MOTIVO), Lic_s_(x.POR_ID), Lic_s_(x.EM)].join('|')); }
/** Cadeia das versões: cada versão confere com o próprio hash, com o hash dos dados e com a anterior; a linha aponta para a última. */
function LicC_cadeia_(r, versoes) {
  var ant = '', problema = '';
  versoes.some(function (v, i) {
    if (Number(v.VERSAO) !== i + 1) { problema = 'falta a versão ' + (i + 1) + ' (alguma linha foi apagada)'; return true; }
    if (Lic_hash_(Lic_s_(v.DADOS_JSON)) !== Lic_s_(v.DADOS_HASH)) { problema = 'os dados da versão ' + v.VERSAO + ' foram mudados'; return true; }
    if (LicC_hashVersao_(v) !== Lic_s_(v.HASH)) { problema = 'a versão ' + v.VERSAO + ' foi mudada'; return true; }
    if (Lic_s_(v.HASH_ANTERIOR) !== ant) { problema = 'a versão ' + v.VERSAO + ' não se liga à anterior'; return true; }
    ant = Lic_s_(v.HASH);
    return false;
  });
  var ult = versoes[versoes.length - 1];
  if (!problema && !ult) problema = 'o contrato não tem versão';
  if (!problema && (Number(r.VERSAO) !== Number(ult.VERSAO) || Lic_s_(r.VERSAO_HASH) !== Lic_s_(ult.HASH))) problema = 'o contrato não aponta para a última versão (versão ' + Lic_s_(r.VERSAO) + ' gravada, ' + ult.VERSAO + ' na lista)';
  if (!problema && LicC_hashLinha_(r) !== Lic_s_(r.HASH)) problema = 'o resumo do contrato foi mudado';
  return { integra: !problema, problema: problema };
}
function LicC_acharContrato_(oid) {
  var r = LicC_contratosDe_(oid)[0];
  if (!r) throw new Error('Não foi possível: esta licitação ainda não tem contrato registrado. Registre o contrato na ficha, aba Contrato');
  return r;
}

// ------------------------------------------------------------ dados do contrato (validação e diferenças)
var LICC_ROTULOS = { numeroContrato: 'Número', tipo: 'Tipo', assinatura: 'Assinatura', inicio: 'Início da vigência', fim: 'Fim da vigência', processo: 'Processo', itens: 'Itens', valorTotal: 'Valor total',
  reajusteIndice: 'Índice de reajuste', reajusteDataBase: 'Data-base do reajuste', reajusteFonte: 'Fonte do reajuste', garantiaTipo: 'Tipo de garantia', garantiaValor: 'Valor da garantia',
  garantiaValidade: 'Validade da garantia', garantiaFonte: 'Fonte da garantia', renovacaoPrevista: 'Renovação prevista', renovacaoDecidirAte: 'Decidir a renovação até', entregas: 'Entregas',
  obrigacoes: 'Obrigações', responsavelNome: 'Responsável', situacao: 'Situação', obs: 'Observações' };
var LICC_CAMPOS = ['numeroContrato', 'tipo', 'assinatura', 'inicio', 'fim', 'processo', 'itens', 'reajusteIndice', 'reajusteDataBase', 'reajusteFonte', 'garantiaTipo', 'garantiaValor', 'garantiaValidade',
  'garantiaFonte', 'renovacaoPrevista', 'renovacaoDecidirAte', 'entregas', 'obrigacoes', 'responsavelId', 'situacao', 'obs'];
function LicC_temCampo_(c, k) { return c && Object.prototype.hasOwnProperty.call(c, k) && c[k] !== undefined; }
/**
 * Junta o que veio (c, só os campos enviados mudam) com os dados atuais (base) e confere tudo. o.itensResultado: os itens ganhos
 * (contrato do resultado): item só dos ganhos, valor unitário o homologado, quantidade até a ganha. Devolve os dados completos.
 */
function LicC_limpar_(c, base, o) {
  o = o || {};
  var d = JSON.parse(JSON.stringify(base || {}));
  LICC_CAMPOS.forEach(function (k) { if (LicC_temCampo_(c, k)) d[k] = c[k]; });
  var out = { numeroContrato: LicC_txt_(d.numeroContrato, 60), tipo: Lic_up_(d.tipo) || 'CONTRATO', processo: LicC_txt_(d.processo, 120), orgaoNome: Lic_s_(d.orgaoNome), orgaoCnpj: Lic_s_(d.orgaoCnpj),
    uf: Lic_s_(d.uf), municipio: Lic_s_(d.municipio), proposta: Lic_s_(d.proposta), origem: d.origem || {} };
  if (out.numeroContrato.length < 2) throw new Error('Escreva o número do contrato ou da ata como está no documento assinado (por exemplo 012/2026). Nada foi gravado');
  if (!LICC_TIPOS[out.tipo]) throw new Error('Escolha o tipo: contrato ou ata de registro de preços. Nada foi gravado');
  [['assinatura', 'da assinatura', false], ['inicio', 'do início da vigência', true], ['fim', 'do fim da vigência', true]].forEach(function (p) {
    var v = Lic_s_(d[p[0]]);
    if (!v && !p[2]) { out[p[0]] = ''; return; }
    var dia = LicC_dia_(v);
    if (!dia) throw new Error('Escolha a data ' + p[1] + ' no calendário. Nada foi gravado');
    out[p[0]] = dia;
  });
  if (out.fim < out.inicio) throw new Error('O fim da vigência (' + LicC_br_(out.fim) + ') não pode ser antes do início (' + LicC_br_(out.inicio) + '): confira as datas no contrato. Nada foi gravado');
  if (LicC_diasEntre_(out.inicio, out.fim) > LICC_VIGENCIA_MAX_DIAS) throw new Error('A vigência passa de 10 anos (Lei 14.133/2021, art. 107): confira as datas no contrato. Nada foi gravado');
  // itens
  var itens = Array.isArray(d.itens) ? d.itens : [], vistos = {}, ganhos = {}, antes = {};
  // revisão de 42a2c1f: homologação e fonte de cada item vêm do resultado (contrato do resultado) ou ficam as da versão anterior quando a tela não manda
  ((base && base.itens) || []).forEach(function (b) { antes[Lic_s_(b.item)] = b; });
  (o.itensResultado || []).forEach(function (g) { ganhos[Lic_s_(g.item)] = g; });
  if (!itens.length) throw new Error('O contrato precisa de pelo menos um item (número do item, quantidade e valor unitário). Nada foi gravado');
  if (itens.length > 200) throw new Error('No máximo 200 itens por contrato. Nada foi gravado');
  out.itens = itens.map(function (i, n) {
    var num = LicC_txt_(i.item, 20) || String(n + 1);
    if (vistos[num]) throw new Error('Dois itens com o número ' + num + ': cada item aparece uma vez. Nada foi gravado');
    vistos[num] = true;
    var q = LicC_qtd_(i.quantidade, 'a quantidade do item ' + num), vu = typeof i.valorUnit === 'number' ? LicC_r2_(i.valorUnit) : LicC_reais_(i.valorUnit, 'o valor unitário do item ' + num);
    if (!(vu > 0)) throw new Error('Escreva o valor unitário do item ' + num + ' em reais, maior que zero. Nada foi gravado');
    var g = o.itensResultado ? ganhos[num] : null;
    if (o.itensResultado && !g) throw new Error('O item ' + num + ' não é um item ganho no resultado da disputa: o contrato do resultado só tem os itens ganhos. Nada foi gravado');
    if (g && Math.abs(vu - Number(g.valorFinal)) > 0.004) throw new Error('O valor unitário do item ' + num + ' (' + LicC_moeda_(vu) + ') é diferente do homologado no resultado (' + LicC_moeda_(g.valorFinal) + '). Registre como está o resultado e, se o contrato assinado diz outro valor, faça a correção depois, com o motivo. Nada foi gravado');
    if (g && q > Number(g.quantidade) + 1e-9) throw new Error('A quantidade do item ' + num + ' (' + LicP_qtd_(q) + ') passa da ganha no resultado (' + LicP_qtd_(g.quantidade) + '). Acréscimo é termo aditivo, depois de registrar. Nada foi gravado');
    var codigo = Lic_up_(i.codigo).slice(0, 20), nome = LicC_txt_(i.nome, 200), desc = LicC_txt_(i.descricao, 400);
    if (!nome && !desc && !codigo) throw new Error('Escreva o serviço do item ' + num + ' (código do catálogo ou descrição). Nada foi gravado');
    var bi = antes[num] || {}, hom = g && g.homologacao !== undefined ? g.homologacao : (i.homologacao !== undefined && i.homologacao !== null ? i.homologacao : bi.homologacao), fon = g && g.fonte !== undefined ? g.fonte : (i.fonte !== undefined && i.fonte !== null ? i.fonte : bi.fonte);
    return { item: num, codigo: codigo, nome: nome, descricao: desc, quantidade: q, valorUnit: vu, total: LicC_r2_(vu * q), homologacao: LicC_dia_(hom) || '', fonte: LicC_txt_(fon, 300) };
  });
  out.valorTotal = LicC_r2_(out.itens.reduce(function (s, i) { return s + i.total; }, 0));
  // reajuste
  out.reajusteIndice = LicC_txt_(d.reajusteIndice, 80);
  out.reajusteDataBase = Lic_s_(d.reajusteDataBase) ? LicC_dia_(d.reajusteDataBase) : '';
  if (Lic_s_(d.reajusteDataBase) && !out.reajusteDataBase) throw new Error('Escolha a data-base do reajuste no calendário. Nada foi gravado');
  out.reajusteFonte = LicC_txt_(d.reajusteFonte, 300);
  if (out.reajusteIndice || out.reajusteDataBase) {
    if (!out.reajusteIndice || !out.reajusteDataBase) throw new Error('No reajuste, escreva o índice (por exemplo IPCA) e a data-base (a data do orçamento ou a que o edital diz). Sem reajuste no edital, deixe os dois em branco. Nada foi gravado');
    if (out.reajusteFonte.length < 5) throw new Error('Escreva de onde vem o reajuste (por exemplo "cláusula 8 do contrato" ou "item 14 do edital"). Nada foi gravado');
  } else out.reajusteFonte = '';
  // garantia contratual
  out.garantiaTipo = Lic_up_(d.garantiaTipo);
  if (out.garantiaTipo) {
    if (!LICC_GARANTIAS[out.garantiaTipo]) throw new Error('Escolha o tipo de garantia na lista (caução, títulos, seguro-garantia, fiança ou título de capitalização). Nada foi gravado');
    out.garantiaValor = typeof d.garantiaValor === 'number' ? LicC_r2_(d.garantiaValor) : LicC_reais_(d.garantiaValor, 'o valor da garantia');
    out.garantiaValidade = LicC_dia_(d.garantiaValidade);
    if (!out.garantiaValidade) throw new Error('Escolha a validade da garantia no calendário (o fim da apólice, da fiança ou do prazo da caução). Nada foi gravado');
    out.garantiaFonte = LicC_txt_(d.garantiaFonte, 300);
    if (out.garantiaFonte.length < 5) throw new Error('Escreva de onde vem a garantia (por exemplo "cláusula 10 do contrato, 5% do valor"). Nada foi gravado');
  } else { out.garantiaValor = ''; out.garantiaValidade = ''; out.garantiaFonte = ''; }
  // renovação
  out.renovacaoPrevista = d.renovacaoPrevista === true || Lic_up_(d.renovacaoPrevista) === 'SIM';
  out.renovacaoDecidirAte = out.renovacaoPrevista && Lic_s_(d.renovacaoDecidirAte) ? LicC_dia_(d.renovacaoDecidirAte) : '';
  if (out.renovacaoPrevista && Lic_s_(d.renovacaoDecidirAte) && !out.renovacaoDecidirAte) throw new Error('Escolha no calendário até quando decidir a renovação. Nada foi gravado');
  if (out.renovacaoDecidirAte && out.renovacaoDecidirAte > out.fim) throw new Error('A decisão da renovação precisa ser antes do fim da vigência (a prorrogação é por aditivo antes do fim). Nada foi gravado');
  // entregas (prazo obrigatório) e obrigações (prazo opcional)
  var lista = function (v, rotulo, prazoObrig, comValor) {
    var l = Array.isArray(v) ? v : [];
    if (l.length > 60) throw new Error('No máximo 60 ' + rotulo + ' por contrato. Nada foi gravado');
    return l.map(function (x, n) {
      var desc = LicC_txt_(x.descricao, 300), p = Lic_s_(x.prazo) ? LicC_dia_(x.prazo) : '';
      if (desc.length < 3) throw new Error('Escreva a descrição da ' + rotulo.replace(/s$/, '') + ' ' + (n + 1) + ' (o que é entregue ou cumprido). Nada foi gravado');
      if (Lic_s_(x.prazo) && !p) throw new Error('Escolha o prazo da ' + rotulo.replace(/s$/, '') + ' ' + (n + 1) + ' no calendário. Nada foi gravado');
      if (prazoObrig && !p) throw new Error('Escolha o prazo da entrega ' + (n + 1) + ' ("' + desc + '"). Nada foi gravado');
      var y = { descricao: desc, prazo: p };
      if (comValor) y.valor = Lic_s_(x.valor) === '' || x.valor === null || x.valor === undefined ? '' : (typeof x.valor === 'number' ? LicC_r2_(x.valor) : LicC_reais_(x.valor, 'o valor da entrega ' + (n + 1)));
      return y;
    });
  };
  out.entregas = lista(d.entregas, 'entregas', true, true);
  out.obrigacoes = lista(d.obrigacoes, 'obrigações', false, false);
  // responsável (Diretoria de Licitações)
  // revisão de 42a2c1f: sem o campo enviado (encerramento, apostilamento), fica o responsável da versão anterior, mesmo que hoje esteja inativo
  var resp = !LicC_temCampo_(c, 'responsavelId') && base && Lic_s_(base.responsavelId) ? { id: Lic_s_(base.responsavelId), nome: Lic_s_(base.responsavelNome) } : Lic_responsaveis_().filter(function (u) { return u.id === Lic_s_(d.responsavelId); })[0];
  if (!resp) throw new Error('Escolha o responsável pelo contrato na lista (Diretoria ou Administrador ativos). Nada foi gravado');
  out.responsavelId = resp.id; out.responsavelNome = resp.nome;
  out.situacao = LICC_SITUACOES[Lic_up_(d.situacao)] ? Lic_up_(d.situacao) : 'VIGENTE';
  out.obs = LicC_txt_(d.obs, 1000);
  return out;
}
function LicC_valorTxt_(k, v) {
  if (k === 'itens') { var l = Array.isArray(v) ? v : []; return l.length + ' item(ns): ' + l.map(function (i) { return i.item + ' ' + LicP_qtd_(i.quantidade) + ' × ' + LicC_moeda_(i.valorUnit); }).join('; '); }
  if (k === 'entregas' || k === 'obrigacoes') { var e = Array.isArray(v) ? v : []; return e.length ? e.map(function (x) { return x.descricao + (x.prazo ? ' até ' + LicC_br_(x.prazo) : '') + (x.valor ? ' (' + LicC_moeda_(x.valor) + ')' : ''); }).join('; ') : '(nenhuma)'; }
  if (k === 'valorTotal' || k === 'garantiaValor') return v === '' || v === null || v === undefined ? '(vazio)' : LicC_moeda_(v);
  if (/^(assinatura|inicio|fim|reajusteDataBase|garantiaValidade|renovacaoDecidirAte)$/.test(k)) return LicC_br_(v) || '(vazio)';
  if (k === 'renovacaoPrevista') return v ? 'sim' : 'não';
  if (k === 'tipo') return LICC_TIPOS[v] || Lic_s_(v);
  if (k === 'garantiaTipo') return LICC_GARANTIAS[v] || '(sem garantia)';
  if (k === 'situacao') return LICC_SITUACOES[v] || Lic_s_(v);
  return Lic_texto_(v, 160) || '(vazio)';
}
/** O que mudou de a para b: ['Rótulo: de → para']. */
function LicC_diferencas_(a, b) {
  var out = [];
  Object.keys(LICC_ROTULOS).forEach(function (k) {
    if (JSON.stringify(a ? a[k] : undefined) === JSON.stringify(b[k])) return;
    if (!a && (b[k] === '' || b[k] === false || (Array.isArray(b[k]) && !b[k].length))) return;
    out.push(LICC_ROTULOS[k] + ': ' + (a ? LicC_valorTxt_(k, a[k]) : '(novo)') + ' → ' + LicC_valorTxt_(k, b[k]));
  });
  return out;
}

// ------------------------------------------------------------ arquivo do contrato (restrito, SHA-256)
function LicC_gravarArquivo_(lido, numero, versao) {
  var pasta = SGO_DocSalvar_pastaPersistente_('LIC_CTR_PASTA_ID', LICC_PASTA, '');
  var sub = typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(pasta, numero) : pasta, f;
  try { f = sub.createFile(Utilities.newBlob(lido.bytes, lido.tipo, SGO_DocSalvar_sanitizarNome_(numero + ' v' + versao + ' - ' + lido.arquivoNome))); LicDoc_restrito_(f); }
  catch (e) { throw new Error('Não foi possível guardar o arquivo do contrato no serviço de arquivos do SGO+ (' + Lic_s_(e && e.message) + '). Nada foi gravado: tente de novo em alguns minutos e avise o Administrador se repetir'); }
  return { id: Lic_s_(f.getId()), nome: lido.nome, tipo: lido.tipo, tamanho: lido.tamanho, sha256: lido.sha256 };
}
function LicC_ultimoArquivo_(versoes) { for (var i = versoes.length - 1; i >= 0; i--) if (Lic_s_(versoes[i].ARQUIVO_ID)) return versoes[i]; return null; }

// ------------------------------------------------------------ prazos do contrato na agenda (LIC_EVENTOS)
function LicC_prefixo_(r) { return Lic_s_(r.OPORTUNIDADE_ID) + '|CTR|' + Lic_s_(r.ID) + '|'; }
/** Os marcos que o contrato dá agora (sem gravar): { chave, tipo, nome, dia, regra }. Encerrado ou rescindido: nenhum. */
function LicC_marcos_(r, d) {
  var out = [], num = Lic_s_(d.numeroContrato), pre = LicC_prefixo_(r);
  if (d.situacao !== 'VIGENTE') return out;
  var poe = function (k, tipo, nome, dia, regra) { if (dia) out.push({ chave: pre + k, tipo: tipo, nome: Lic_texto_(nome, 200), dia: dia, regra: regra || '' }); };
  poe('INICIO', 'CONTRATO_INICIO', 'Início da vigência do contrato ' + num, d.inicio);
  poe('FIM', 'CONTRATO_FIM', 'Fim da vigência do contrato ' + num, d.fim, 'Prorrogação só por termo aditivo assinado antes do fim (Lei 14.133/2021, arts. 106 e 107).');
  if (d.renovacaoPrevista) {
    var dr = d.renovacaoDecidirAte || LicC_somarDias_(d.fim, -LICC_RENOVACAO_PADRAO_DIAS);
    if (dr < d.inicio) dr = d.inicio;
    poe('RENOVACAO', 'CONTRATO_RENOVACAO', 'Decidir a renovação do contrato ' + num, dr, d.renovacaoDecidirAte ? '' : 'Data padrão do SGO+: ' + LICC_RENOVACAO_PADRAO_DIAS + ' dias antes do fim da vigência. Ajuste no contrato ("Decidir a renovação até").');
  }
  if (d.reajusteDataBase) {
    for (var k = 1, n = 0; k <= 10; k++) {
      var dia = LicC_somarAnos_(d.reajusteDataBase, k);
      if (dia > d.fim) break;
      if (dia <= d.inicio) continue;
      n++;
      poe('REAJUSTE#' + n, 'CONTRATO_REAJUSTE', 'Reajuste (' + d.reajusteIndice + ') do contrato ' + num + ' (' + n + 'º ano da data-base)', dia,
        'Reajuste a cada 12 meses da data-base (Lei 14.133/2021, art. 25, § 7º, e art. 92, § 3º): o pedido é da Metrolabs; confira o índice e a cláusula (' + d.reajusteFonte + ').');
    }
  }
  if (d.garantiaTipo) poe('GARANTIA', 'CONTRATO_GARANTIA', 'Validade da garantia (' + (LICC_GARANTIAS[d.garantiaTipo] || d.garantiaTipo).toLowerCase() + ') do contrato ' + num, d.garantiaValidade, 'Renove ou peça a liberação antes do fim (' + d.garantiaFonte + ').');
  (d.entregas || []).forEach(function (e, i) { poe('ENTREGA#' + (i + 1), 'CONTRATO_ENTREGA', 'Entrega do contrato ' + num + ': ' + e.descricao, e.prazo); });
  (d.obrigacoes || []).forEach(function (e, i) { if (e.prazo) poe('OBRIGACAO#' + (i + 1), 'CONTRATO_OBRIGACAO', 'Obrigação do contrato ' + num + ': ' + e.descricao, e.prazo); });
  return out;
}
function LicC_eventoLinha_(l, m, versao, anterior, motivo, eu, ref, agora) {
  var t = LIC_EVENTO_TIPOS[m.tipo] || { nivel: 'NORMAL' };
  var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), CHAVE: m.chave, TIPO: m.tipo, NOME: m.nome, NATUREZA: 'CONFIRMADO', SITUACAO: 'ATIVO', QUANDO_ISO: Lic_isoLocal_(m.dia, '23:59'),
    QUANDO_TEXTO: m.dia, DIA_TODO: 'SIM', FUSO: 'America/Sao_Paulo', FUSO_PRESUMIDO: 'NAO', LIMITE_INTERNO_ISO: Lic_isoLocal_(m.dia, '09:00'), NIVEL: t.nivel, FONTE: 'CONTRATO',
    FONTE_REF: Lic_texto_(ref.texto, 400), REGRA: Lic_texto_(m.regra, 900), OBS: 'Data do contrato assinado, digitada pela Diretoria. Limite interno dos alertas: ' + LicC_br_(m.dia) + ' 09:00.', BASE_ISO: '',
    VERSAO: versao, SUBSTITUI_ID: anterior ? Lic_s_(anterior.ID) : '', SUBSTITUIDO_POR_ID: '', MOTIVO_MUDANCA: Lic_texto_(motivo, 600), VERSAO_FONTE: Number(l.VERSAO_FONTE) || 1, FONTE_HASH: Lic_s_(ref.hash),
    CONFIRMADO_POR_ID: eu.id, CONFIRMADO_POR_NOME: eu.nome, CONFIRMADO_EM: agora, CONFIRMACAO_ONDE: Lic_texto_(ref.texto, 300), ATUALIZADO_EM: agora, CRIADO_EM: agora };
  reg.HASH = Lic_hash_([reg.CHAVE, reg.VERSAO, reg.NATUREZA, reg.QUANDO_ISO, reg.LIMITE_INTERNO_ISO, reg.FONTE, reg.FONTE_REF, reg.CONFIRMADO_POR_ID, reg.CRIADO_EM].join('|'));
  var ins = SGO_DATA.insert(LIC_ABAS.EVENTOS, reg);
  reg.ID = ins && ins.ID ? ins.ID : reg.ID;
  return reg;
}
/**
 * Prazos do contrato contra os que estão valendo (por CHAVE): novo = linha nova; data ou nome mudou = versão nova (a anterior fica
 * RETIFICADO); marco que saiu = CANCELADO com o motivo. Quem chama segura a trava. { criados, retificados, cancelados, fora, novos }.
 */
function LicC_agendaSincronizar_(eu, l, r, d, ref, motivo, agora) {
  var pre = LicC_prefixo_(r), res = { criados: 0, retificados: 0, cancelados: 0, fora: [], novos: [], textos: [], mudados: [], saidos: [] };
  var existentes = Lic_eventosDe_(l.ID).filter(function (e) { return Lic_s_(e.CHAVE).indexOf(pre) === 0; }), valendo = {}, vmax = {};
  existentes.forEach(function (e) { var k = Lic_s_(e.CHAVE); vmax[k] = Math.max(vmax[k] || 0, Number(e.VERSAO) || 0); if (Lic_eventoValendo_(e)) valendo[k] = e; });
  var vistos = {};
  LicC_marcos_(r, d).forEach(function (m) {
    vistos[m.chave] = true;
    var at = valendo[m.chave], iso = Lic_isoLocal_(m.dia, '23:59');
    if (at && Lic_s_(at.QUANDO_ISO) === iso && Lic_s_(at.NOME) === m.nome) { SGO_DATA.update(LIC_ABAS.EVENTOS, at.ID, { FONTE_REF: Lic_texto_(ref.texto, 400), REGRA: Lic_texto_(m.regra, 900), FONTE_HASH: Lic_s_(ref.hash), ATUALIZADO_EM: agora }); return; }
    var mot = at ? motivo + ': ' + Lic_s_(at.NOME) + ' de ' + Lic_eventoQuandoTxt_(at) + ' para ' + Lic_brDia_(m.dia) + ' (dia todo).' : '';
    var nova = LicC_eventoLinha_(l, m, (vmax[m.chave] || 0) + 1, at || null, mot, eu, ref, agora);
    if (at) { SGO_DATA.update(LIC_ABAS.EVENTOS, at.ID, { SITUACAO: 'RETIFICADO', SUBSTITUIDO_POR_ID: nova.ID, MOTIVO_MUDANCA: mot, ATUALIZADO_EM: agora }); res.retificados++; res.fora.push(Lic_s_(at.ID)); res.textos.push(mot); if (Lic_s_(at.QUANDO_ISO) !== iso) res.mudados.push({ chave: m.chave, dia: m.dia, nome: m.nome }); }
    else { res.criados++; res.textos.push(m.nome + ' em ' + Lic_brDia_(m.dia)); }
    res.novos.push(Lic_s_(nova.ID));
  });
  Object.keys(valendo).forEach(function (k) {
    if (vistos[k]) return;
    var e = valendo[k], mot = d.situacao !== 'VIGENTE' ? 'Contrato ' + (LICC_SITUACOES[d.situacao] || d.situacao).toLowerCase() + ' (' + motivo + '): o prazo deixou de valer.' : 'O marco saiu do contrato (' + motivo + ').';
    SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { SITUACAO: 'CANCELADO', MOTIVO_MUDANCA: Lic_texto_(mot, 600), ATUALIZADO_EM: agora });
    res.cancelados++; res.fora.push(Lic_s_(e.ID)); res.textos.push(Lic_s_(e.NOME) + ': cancelado'); res.saidos.push({ chave: k, nome: Lic_s_(e.NOME) });
  });
  if (res.criados || res.retificados || res.cancelados) Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'AGENDA_CONTRATO', eu, { de: '', para: res.criados + ' novo(s), ' + res.retificados + ' alterado(s), ' + res.cancelados + ' cancelado(s)',
    texto: 'Prazos do contrato na agenda: ' + res.textos.join('; ') + '.', versao: ref.versao, fonte: 'Contratos', hash: Lic_s_(ref.hash) });
  return res;
}
/** Depois da trava: os alertas acompanham (cancela os dos prazos que saíram, programa os novos). Falha aqui não desfaz a gravação. */
function LicC_alertasDepois_(oid, ag, motivo) {
  try { var l = Lic_acharOp_(oid); if (typeof Lic_alertasAposAgenda_ === 'function') Lic_alertasAposAgenda_(l, { fora: ag.fora, novos: ag.novos, mudancas: [], motivoFora: motivo }); }
  catch (e) { console.error('Licitações, alertas do contrato: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------ previsão de faturamento (só leitura; não há módulo de faturamento)
var LICC_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function LicC_mesTxt_(m) { return LICC_MESES[Number(m.slice(5, 7)) - 1] + '/' + m.slice(0, 4); }
/**
 * Por entrega (as entregas com valor, somadas por mês do prazo) ou, sem entrega com valor, estimativa linear (valor total dividido
 * pelos meses da vigência). Nunca vira lançamento: é a previsão que a Diretoria leva ao Financeiro.
 */
function LicC_previsao_(d) {
  var comValor = (d.entregas || []).filter(function (e) { return Number(e.valor) > 0; }), meses = {}, ordem = [], base, aviso = '';
  var poe = function (m, v, txt) { if (!meses[m]) { meses[m] = { mes: m, rotulo: LicC_mesTxt_(m), valor: 0, itens: [] }; ordem.push(m); } meses[m].valor = LicC_r2_(meses[m].valor + v); if (txt) meses[m].itens.push(txt); };
  if (comValor.length) {
    base = 'ENTREGAS';
    comValor.forEach(function (e) { poe(e.prazo.slice(0, 7), Number(e.valor), e.descricao + ' (' + LicC_moeda_(e.valor) + ')'); });
    var soma = LicC_r2_(comValor.reduce(function (s, e) { return s + Number(e.valor); }, 0));
    if (Math.abs(soma - d.valorTotal) > 0.004) aviso = 'A soma das entregas com valor (' + LicC_moeda_(soma) + ') é diferente do valor total do contrato (' + LicC_moeda_(d.valorTotal) + '): confira as entregas.';
  } else {
    base = 'LINEAR';
    var m = d.inicio.slice(0, 7), fim = d.fim.slice(0, 7), lista = [];
    for (var i = 0; i < 130 && m <= fim; i++) { lista.push(m); var a = Number(m.slice(0, 4)), mm = Number(m.slice(5, 7)) + 1; if (mm > 12) { mm = 1; a++; } m = a + '-' + ('0' + mm).slice(-2); }
    var parte = LicC_r2_(d.valorTotal / lista.length), resto = LicC_r2_(d.valorTotal - parte * (lista.length - 1));
    lista.forEach(function (x, k) { poe(x, k === lista.length - 1 ? resto : parte, ''); });
    aviso = 'Estimativa linear: sem entregas com valor, o valor total foi dividido pelos ' + lista.length + ' mês(es) da vigência. Cadastre as entregas com valor para a previsão por entrega.';
  }
  ordem.sort();
  return { base: base, baseNome: base === 'ENTREGAS' ? 'Por entrega' : 'Estimativa linear', meses: ordem.map(function (k) { return meses[k]; }), total: LicC_r2_(ordem.reduce(function (s, k) { return s + meses[k].valor; }, 0)), aviso: aviso,
    dependencia: 'O SGO+ não tem módulo de faturamento nem de contas a receber: esta previsão é só leitura (não vira lançamento). Leve ao Financeiro; quando houver o módulo, ela entra lá com o vínculo do contrato.' };
}

// ------------------------------------------------------------ leitura para as telas
function LicC_situacaoTela_(d, hoje) {
  if (d.situacao === 'ENCERRADO' || d.situacao === 'RESCINDIDO') return { codigo: d.situacao, nome: LICC_SITUACOES[d.situacao], cor: 'cinza', dias: null };
  var dias = LicC_diasEntre_(hoje, d.fim);
  if (hoje < d.inicio) return { codigo: 'AGUARDANDO', nome: 'Começa em ' + LicC_br_(d.inicio), cor: 'azul', dias: dias };
  if (dias < 0) return { codigo: 'VENCIDO', nome: 'Vigência terminou em ' + LicC_br_(d.fim) + ': registre o aditivo ou o encerramento', cor: 'vermelho', dias: dias };
  if (dias <= LICC_A_VENCER_DIAS) return { codigo: 'A_VENCER', nome: 'Vence em ' + dias + ' dia(s)', cor: 'laranja', dias: dias };
  return { codigo: 'VIGENTE', nome: 'Vigente até ' + LicC_br_(d.fim), cor: 'verde', dias: dias };
}
function LicC_versaoTela_(v) {
  return { id: Lic_s_(v.ID), versao: Number(v.VERSAO) || 0, tipo: Lic_up_(v.TIPO), tipoNome: LICC_VERSOES[Lic_up_(v.TIPO)] || Lic_s_(v.TIPO), aditivo: Lic_s_(v.ADITIVO_NUMERO), motivo: Lic_s_(v.MOTIVO), fonte: Lic_s_(v.FONTE),
    mudou: Lic_s_(v.MUDOU), arquivo: Lic_s_(v.ARQUIVO_ID) ? { nome: Lic_s_(v.ARQUIVO_NOME), sha256: Lic_s_(v.ARQUIVO_SHA256), tamanho: Number(v.ARQUIVO_TAMANHO) || 0 } : null, por: Lic_s_(v.POR_NOME), em: Lic_s_(v.EM),
    emBr: LicD_br_(v.EM), hash: Lic_s_(v.HASH), integra: LicC_hashVersao_(v) === Lic_s_(v.HASH) && Lic_hash_(Lic_s_(v.DADOS_JSON)) === Lic_s_(v.DADOS_HASH) };
}
function LicC_vinculoTela_(x) { return { id: Lic_s_(x.ID), modulo: Lic_up_(x.MODULO), acao: Lic_up_(x.ACAO), chave: Lic_s_(x.CHAVE), refId: Lic_s_(x.REF_ID), refCodigo: Lic_s_(x.REF_CODIGO), texto: Lic_s_(x.REF_TEXTO), motivo: Lic_s_(x.MOTIVO), por: Lic_s_(x.POR_NOME), em: Lic_s_(x.EM), emBr: LicD_br_(x.EM), integra: LicC_hashVinculo_(x) === Lic_s_(x.HASH) }; }
/** Contrato completo para a ficha e para o relatório. */
function LicC_montar_(r, o) {
  o = o || {};
  var versoes = LicC_versoesDe_(r.ID), cad = LicC_cadeia_(r, versoes), ult = versoes[versoes.length - 1], d = ult ? Lic_json_(ult.DADOS_JSON, {}) : {}, hoje = LicC_hoje_();
  var pre = LicC_prefixo_(r), agoraMs = Date.now(), evs = Lic_eventosDe_(r.OPORTUNIDADE_ID).filter(function (e) { return Lic_s_(e.CHAVE).indexOf(pre) === 0; });
  var porId = {}; evs.forEach(function (e) { porId[Lic_s_(e.ID)] = e; });
  var alertas = typeof Lic_alertasDaOp_ === 'function' && !o.semAlertas ? Lic_alertasDaOp_(r.OPORTUNIDADE_ID) : [];
  var eventos = evs.filter(function (e) { return Lic_up_(e.SITUACAO) !== 'RETIFICADO'; }).map(function (e) { var x = Lic_eventoParaTela_(e, agoraMs, porId); x.alertas = alertas.filter(function (a) { return a.eventoId === x.id; }).length; return x; })
    .sort(function (a, b) { return a.quandoIso < b.quandoIso ? -1 : a.quandoIso > b.quandoIso ? 1 : 0; });
  var vinc = LicC_vinculosDe_(r.ID).map(LicC_vinculoTela_).sort(function (a, b) { return a.em < b.em ? -1 : 1; });
  var arq = LicC_ultimoArquivo_(versoes);
  return { id: Lic_s_(r.ID), opId: Lic_s_(r.OPORTUNIDADE_ID), codigo: Lic_s_(r.CODIGO), numero: Lic_s_(r.NUMERO), numeroContrato: Lic_s_(d.numeroContrato), tipo: Lic_up_(d.tipo), tipoNome: LICC_TIPOS[Lic_up_(d.tipo)] || '',
    origem: Lic_up_(r.ORIGEM), origemNome: Lic_up_(r.ORIGEM) === 'RESULTADO' ? 'Resultado homologado da disputa' : 'Registro manual', disputaId: Lic_s_(r.DISPUTA_ID), situacao: Lic_up_(d.situacao), situacaoTela: LicC_situacaoTela_(d, hoje),
    versao: Number(r.VERSAO) || 0, dados: d, versoes: versoes.map(LicC_versaoTela_).reverse(), cadeia: cad, eventos: eventos, previsao: d.itens ? LicC_previsao_(d) : null,
    vinculos: vinc, cliente: Lic_s_(r.CLIENTE_ID) ? { id: Lic_s_(r.CLIENTE_ID), nome: Lic_s_(r.CLIENTE_NOME) } : null, comercial: Lic_s_(r.COMERCIAL_OPO_ID) ? { id: Lic_s_(r.COMERCIAL_OPO_ID), codigo: Lic_s_(r.COMERCIAL_OPO_CODIGO) } : null,
    arquivo: arq ? { versao: Number(arq.VERSAO) || 0, nome: Lic_s_(arq.ARQUIVO_NOME), sha256: Lic_s_(arq.ARQUIVO_SHA256), versaoId: Lic_s_(arq.ID) } : null, criadoPor: Lic_s_(r.CRIADO_POR_NOME), criadoEm: Lic_s_(r.CRIADO_EM), hash: Lic_s_(r.HASH) };
}
/** O que o resultado da disputa permite (sem gravar): { pode, bloqueios, base (dados de partida), contrato (CONTRATO_JSON) }. */
function LicC_previaResultado_(l) {
  var r = { pode: false, bloqueios: [], base: null, contrato: null, disputaId: '' };
  if (Lic_s_(l.SITUACAO) !== 'RESULTADO') { r.bloqueios.push(Lic_s_(l.SITUACAO) === 'DISPUTA' ? 'A disputa está aberta: registre o resultado de cada item e toque em "Concluir o resultado" na aba Disputa.' : 'O contrato do resultado sai de uma licitação em "Resultado" (disputa concluída na aba Disputa). Sem a disputa no SGO+, use o registro manual, com o motivo.'); }
  var dsp = typeof LicD_disputasDe_ === 'function' ? LicD_disputasDe_(l.ID)[0] : null;
  if (!dsp) { r.bloqueios.push('Esta licitação não tem disputa registrada no SGO+: use o registro manual (itens digitados do resultado publicado, com a fonte e o motivo).'); return r; }
  r.disputaId = Lic_s_(dsp.ID);
  if (Lic_up_(dsp.SITUACAO) !== 'RESULTADO') { if (!r.bloqueios.length) r.bloqueios.push('A disputa ainda não tem o resultado concluído (aba Disputa).'); return r; }
  if (typeof LicD_integra_ === 'function' && !LicD_integra_(dsp)) r.bloqueios.push('Os dados da disputa não conferem com o hash gravado (alterados fora do SGO+): avise o Administrador; enquanto isso, use o registro manual com o motivo.');
  var c = Lic_json_(dsp.CONTRATO_JSON, null);
  if (!c || !(c.itens || []).length) { r.bloqueios.push('O resultado não tem item ganho: não há contrato.'); return r; }
  r.contrato = c;
  if (!c.pronto) r.bloqueios.push('O resultado ainda não está pronto para o contrato: ' + c.aviso + ((c.pendentes || []).length ? ' Itens pendentes: ' + c.pendentes.map(function (p) { return p.item + ' (' + p.situacao + ')'; }).join(', ') + '.' : '') + ' Registre a homologação na aba Disputa ou use o registro manual, com o motivo.');
  r.base = { numeroContrato: '', tipo: Lic_s_(l.SRP) === 'SIM' ? 'ATA' : 'CONTRATO', processo: Lic_s_(c.processo), orgaoNome: Lic_s_(c.orgao), orgaoCnpj: Lic_s_(c.orgaoCnpj), uf: Lic_s_(c.uf), municipio: Lic_s_(c.municipio), proposta: Lic_s_(c.proposta),
    itens: c.itens.map(function (i) { return { item: Lic_s_(i.item), codigo: Lic_up_(i.codigo), nome: Lic_s_(i.nome), descricao: Lic_s_(i.descricao), quantidade: Number(i.quantidade) || 0, valorUnit: Number(i.valorFinal) || 0, homologacao: Lic_s_(i.homologacao), fonte: Lic_s_(i.fonte) }; }),
    origem: { tipo: 'RESULTADO', disputaId: Lic_s_(dsp.ID), homologadoEm: Lic_s_(c.homologadoEm), regras: Lic_s_(c.regras), total: Number(c.total) || 0 } };
  r.itensResultado = c.itens.map(function (i) { return { item: Lic_s_(i.item), valorFinal: Number(i.valorFinal) || 0, quantidade: Number(i.quantidade) || 0, homologacao: Lic_s_(i.homologacao), fonte: Lic_s_(i.fonte) }; });
  r.pode = !r.bloqueios.length;
  return r;
}
function LicC_previaManual_(l) {
  var s = Lic_s_(l.SITUACAO), b = [];
  if (s === 'DESCARTADA') b.push('A licitação está descartada: reabra antes (volta para o Radar, com o motivo).');
  else if (s === 'DISPUTA') b.push('A disputa está aberta: conclua o resultado na aba Disputa antes de registrar o contrato.');
  else if (LICC_DE_MANUAL.indexOf(s) < 0) b.push('A licitação está em "' + (LIC_SITUACAO_NOMES[s] || s) + '".');
  return { pode: !b.length, bloqueios: b, base: { numeroContrato: '', tipo: Lic_s_(l.SRP) === 'SIM' ? 'ATA' : 'CONTRATO', processo: Lic_s_(l.NUMERO_CONTROLE_PNCP), orgaoNome: Lic_s_(l.ORGAO_NOME), orgaoCnpj: Lic_s_(l.ORGAO_CNPJ), uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), itens: [] } };
}
/** Aba Contrato da ficha: a prévia (sem contrato) ou o contrato com as integrações. */
function LicC_tela_(eu, d) {
  var l = Lic_acharOp_(d.id), r = LicC_contratosDe_(l.ID)[0];
  var base = { aviso: 'Nada é criado em outro módulo sem você tocar no botão e confirmar. Cada ação fica no histórico e na lista de vínculos do contrato.', responsaveis: Lic_responsaveis_(), tipos: LICC_TIPOS, garantias: LICC_GARANTIAS, versoesTipos: LICC_VERSOES, dependencias: LICC_DEPENDENCIAS, eu: { id: eu.id, nome: eu.nome, perfil: eu.perfil } };
  if (!r) return Object.assign(base, { previa: { resultado: LicC_previaResultado_(l), manual: LicC_previaManual_(l), situacaoOp: Lic_s_(l.SITUACAO), situacaoOpNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || '' }, contrato: null });
  var m = LicC_montar_(r);
  return Object.assign(base, { contrato: m, integracao: { cliente: LicC_clienteTela_(l, r), comercial: LicC_comercialTela_(l, r), execucao: LicC_execucaoTela_(r, m.dados), agendaUnica: LicC_agendaUnicaTela_(r, m) } });
}
/** Tela "Contratos" (menu): lista com a vigência, os que vencem e os resultados prontos para virar contrato. d = { busca, situacao }. */
function LicC_lista_(eu, d) {
  d = d || {};
  var hoje = LicC_hoje_(), ops = {}, busca = Lic_s_(d.busca).toLowerCase(), filtro = Lic_up_(d.situacao), cont = { vigentes: 0, aVencer: 0, vencidos: 0, aguardando: 0, encerrados: 0, valorVigente: 0, total: 0 };
  Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var lista = Lic_ler_(LICC_ABAS.CONTRATOS).filter(function (r) { return ops[Lic_s_(r.OPORTUNIDADE_ID)]; }).map(function (r) {
    var d0 = { situacao: Lic_up_(r.SITUACAO) || 'VIGENTE', inicio: Lic_s_(r.VIGENCIA_INICIO), fim: Lic_s_(r.VIGENCIA_FIM) }, st = LicC_situacaoTela_(d0, hoje), l = ops[Lic_s_(r.OPORTUNIDADE_ID)];
    return { id: Lic_s_(r.ID), opId: Lic_s_(r.OPORTUNIDADE_ID), codigo: Lic_s_(r.CODIGO), numero: Lic_s_(r.NUMERO), numeroContrato: Lic_s_(r.NUMERO_CONTRATO), tipoNome: LICC_TIPOS[Lic_up_(r.TIPO)] || '', orgao: Lic_s_(r.ORGAO_NOME), uf: Lic_s_(l.UF),
      inicio: d0.inicio, fim: d0.fim, valor: Number(r.VALOR_TOTAL) || 0, situacao: st, versao: Number(r.VERSAO) || 0, responsavel: Lic_s_(r.RESPONSAVEL_NOME), cliente: Lic_s_(r.CLIENTE_NOME), comercial: Lic_s_(r.COMERCIAL_OPO_CODIGO),
      integra: LicC_hashLinha_(r) === Lic_s_(r.HASH) };
  });
  lista.forEach(function (x) {
    cont.total++;
    var c = x.situacao.codigo;
    if (c === 'VIGENTE') cont.vigentes++; else if (c === 'A_VENCER') { cont.aVencer++; cont.vigentes++; } else if (c === 'VENCIDO') cont.vencidos++; else if (c === 'AGUARDANDO') cont.aguardando++; else cont.encerrados++;
    if (c === 'VIGENTE' || c === 'A_VENCER' || c === 'AGUARDANDO') cont.valorVigente = LicC_r2_(cont.valorVigente + x.valor);
  });
  var filtrada = lista.filter(function (x) {
    if (busca && [x.codigo, x.numero, x.numeroContrato, x.orgao, x.cliente].join(' ').toLowerCase().indexOf(busca) < 0) return false;
    if (filtro === 'A_VENCER' && x.situacao.codigo !== 'A_VENCER') return false;
    if (filtro === 'VIGENTE' && ['VIGENTE', 'A_VENCER', 'AGUARDANDO'].indexOf(x.situacao.codigo) < 0) return false;
    if (filtro === 'VENCIDO' && x.situacao.codigo !== 'VENCIDO') return false;
    if (filtro === 'ENCERRADO' && ['ENCERRADO', 'RESCINDIDO'].indexOf(x.situacao.codigo) < 0) return false;
    return true;
  }).sort(function (a, b) { var ea = a.situacao.dias === null ? 99999 : a.situacao.dias, eb = b.situacao.dias === null ? 99999 : b.situacao.dias; return ea - eb; });
  var comContrato = {}; lista.forEach(function (x) { comContrato[x.opId] = true; });
  var prontos = Object.keys(ops).filter(function (k) { return Lic_s_(ops[k].SITUACAO) === 'RESULTADO' && !comContrato[k]; }).map(function (k) {
    var l = ops[k], p = LicC_previaResultado_(l);
    return { opId: k, codigo: Lic_s_(l.CODIGO), orgao: Lic_s_(l.ORGAO_NOME), uf: Lic_s_(l.UF), pronto: p.pode, itens: p.contrato ? p.contrato.itens.length : 0, total: p.contrato ? Number(p.contrato.total) || 0 : 0, porque: p.bloqueios[0] || '' };
  });
  return { contratos: filtrada, total: lista.length, contagens: cont, prontos: prontos, aVencerDias: LICC_A_VENCER_DIAS, hoje: hoje, regras: LICC_REGRAS };
}

// ------------------------------------------------------------ registrar o contrato (versão 1) e as versões seguintes
function LicC_ref_(r, versao, hash, numeroContrato) { return { texto: 'Contrato ' + numeroContrato + ' (' + Lic_s_(r.NUMERO) + '), versão ' + versao, hash: hash, versao: 'contrato · versão ' + versao }; }
function LicC_resumoLinha_(d) { return { NUMERO_CONTRATO: d.numeroContrato, TIPO: d.tipo, SITUACAO: d.situacao, ORGAO_NOME: d.orgaoNome, ORGAO_CNPJ: d.orgaoCnpj, VIGENCIA_INICIO: d.inicio, VIGENCIA_FIM: d.fim, VALOR_TOTAL: d.valorTotal, RESPONSAVEL_ID: d.responsavelId, RESPONSAVEL_NOME: d.responsavelNome }; }
function LicC_gravarVersao_(eu, r, tipo, d, campos, agora) {
  var dj = JSON.stringify(d), v = Object.assign({ CONTRATO_ID: Lic_s_(r.ID), OPORTUNIDADE_ID: Lic_s_(r.OPORTUNIDADE_ID), TIPO: tipo, DADOS_JSON: dj, DADOS_HASH: Lic_hash_(dj), POR_ID: eu.id, POR_NOME: eu.nome, EM: agora,
    ADITIVO_NUMERO: '', FONTE: '', MUDOU: '', ARQUIVO_ID: '', ARQUIVO_NOME: '', ARQUIVO_TIPO: '', ARQUIVO_TAMANHO: '', ARQUIVO_SHA256: '' }, campos);
  v.HASH = LicC_hashVersao_(v);
  var ins = SGO_DATA.insert(LICC_ABAS.VERSOES, v);
  v.ID = Lic_s_(ins && ins.ID);
  return v;
}
/**
 * Registrar o contrato. d = { id (licitação), origem: RESULTADO | MANUAL, motivo, fonte (manual: de onde veio o resultado), campos: { numeroContrato,
 * tipo, assinatura, inicio, fim, itens (manual; no resultado, opcional para quantidade menor), reajuste..., garantia..., renovacao..., entregas, obrigacoes,
 * responsavelId, obs }, arquivo: { nome, base64 } (contrato assinado, opcional) }.
 */
function LicC_criar_(eu, d) {
  var origem = Lic_up_(d.origem) === 'MANUAL' ? 'MANUAL' : 'RESULTADO', motivo = LicD_txt_(d.motivo, 1000), fonte = LicD_txt_(d.fonte, 300);
  if (origem === 'MANUAL' && motivo.length < 20) throw new Error('No registro manual, escreva o motivo com pelo menos 20 letras (por que o contrato não sai do resultado da disputa no SGO+). Nada foi gravado');
  if (motivo.length < 10) throw new Error('Escreva o motivo do registro do contrato (pelo menos 10 letras): fica no histórico com o seu nome e a hora. Nada foi gravado');
  if (origem === 'MANUAL' && fonte.length < 5) throw new Error('No registro manual, escreva a fonte do resultado (por exemplo "termo de homologação publicado no PNCP em 20/11/2026"). Nada foi gravado');
  var campos = Object.assign({}, d.campos || {});
  if (!Lic_s_(campos.responsavelId)) campos.responsavelId = eu.id;
  var lido = d.arquivo && (d.arquivo.base64 || d.arquivo.nome) ? LicH_lerArquivo_(d.arquivo) : null;
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), agora = Lic_agora_(), sit = Lic_s_(l.SITUACAO);
    if (LicC_contratosDe_(l.ID).length) throw new Error('Esta licitação já tem contrato registrado: mudanças são versões novas (correção, aditivo, apostilamento ou encerramento) na aba Contrato. Nada foi gravado');
    var dados, disputaId = '';
    if (origem === 'RESULTADO') {
      var p = LicC_previaResultado_(l);
      if (!p.pode) throw new Error('Não foi possível registrar pelo resultado: ' + p.bloqueios.join(' ').replace(/[.\s]+$/, '') + '. Nada foi gravado');
      disputaId = p.disputaId;
      dados = LicC_limpar_(campos, p.base, { itensResultado: p.itensResultado });
      dados.origem = p.base.origem;
    } else {
      var pm = LicC_previaManual_(l);
      if (!pm.pode) throw new Error('Não foi possível registrar: ' + pm.bloqueios.join(' ').replace(/[.\s]+$/, '') + '. Nada foi gravado');
      dados = LicC_limpar_(campos, pm.base);
      dados.origem = { tipo: 'MANUAL', motivo: motivo, fonte: fonte };
    }
    var numero = Lic_s_(l.CODIGO) + '-CT';
    // o arquivo vai primeiro: se ele não ficar guardado e restrito, nada é gravado (nem a linha do contrato)
    var arq = lido ? LicC_gravarArquivo_(lido, numero, 1) : null;
    var row =Object.assign({ OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), NUMERO: numero, ORIGEM: origem, DISPUTA_ID: disputaId, VERSAO: 1, VERSAO_ID: '', VERSAO_HASH: '', CLIENTE_ID: '', CLIENTE_NOME: '',
      COMERCIAL_OPO_ID: '', COMERCIAL_OPO_CODIGO: '', CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, CRIADO_EM: agora, ATUALIZADO_EM: agora, HASH: '' }, LicC_resumoLinha_(dados));
    var ins = SGO_DATA.insert(LICC_ABAS.CONTRATOS, row); row.ID = Lic_s_(ins && ins.ID);
    var v = LicC_gravarVersao_(eu, row, 'ORIGINAL', dados, { VERSAO: 1, MOTIVO: motivo, FONTE: origem === 'MANUAL' ? fonte : 'Resultado homologado (LIC_DISPUTAS.CONTRATO_JSON, ' + Lic_s_(dados.origem.regras) + ')',
      MUDOU: 'Registro inicial: ' + LicC_diferencas_(null, dados).join('; '), ARQUIVO_ID: arq ? arq.id : '', ARQUIVO_NOME: arq ? arq.nome : '', ARQUIVO_TIPO: arq ? arq.tipo : '', ARQUIVO_TAMANHO: arq ? arq.tamanho : '', ARQUIVO_SHA256: arq ? arq.sha256 : '', HASH_ANTERIOR: '' }, agora);
    row.VERSAO_ID = v.ID; row.VERSAO_HASH = v.HASH; row.HASH = LicC_hashLinha_(row);
    SGO_DATA.update(LICC_ABAS.CONTRATOS, row.ID, { VERSAO_ID: row.VERSAO_ID, VERSAO_HASH: row.VERSAO_HASH, HASH: row.HASH });
    var texto = 'Contrato registrado (' + (origem === 'RESULTADO' ? 'resultado homologado' : 'registro manual; fonte: ' + fonte) + '): ' + LICC_TIPOS[dados.tipo].toLowerCase() + ' ' + dados.numeroContrato + ', vigência ' + LicC_br_(dados.inicio) + ' a ' + LicC_br_(dados.fim) +
      ', ' + dados.itens.length + ' item(ns), total ' + LicC_moeda_(dados.valorTotal) + (arq ? ', arquivo "' + arq.nome + '" (SHA-256 ' + arq.sha256 + ')' : ', sem o arquivo assinado') + '. Motivo: ' + motivo;
    var mud = Lic_mudarSituacaoSemTrava_(eu, { id: l.ID, textoHistorico: texto, fonte: 'Contratos' }, [sit], 'CONTRATO', 'CONTRATO_REGISTRADO', {}, 'registrar o contrato');
    var ag = LicC_agendaSincronizar_(eu, l, row, dados, LicC_ref_(row, 1, v.HASH, dados.numeroContrato), 'Contrato registrado', agora);
    return { id: row.ID, opId: Lic_s_(l.ID), numero: numero, ag: ag, hash: mud.hash, texto: texto, semArquivo: !arq };
  });
  try { if (typeof Lic_agendaAposSituacao_ === 'function') Lic_agendaAposSituacao_(r.opId); } catch (e) {}
  if (r.ag.fora.length) LicC_alertasDepois_(r.opId, r.ag, 'Contrato registrado.');
  return { contratoId: r.id, numero: r.numero, texto: 'Contrato ' + r.numero + ' registrado (versão 1). A licitação foi para "Contrato" no Kanban; ' + (r.ag.criados ? r.ag.criados + ' prazo(s) do contrato entraram na agenda, com os alertas da Diretoria' : 'nenhum prazo futuro na agenda') + '.' +
    (r.semArquivo ? ' Falta anexar o contrato assinado (versão de correção com o arquivo).' : '') };
}
/**
 * Versão nova. d = { id (licitação), tipo: CORRECAO | ADITIVO | APOSTILAMENTO | ENCERRAMENTO, aditivoNumero (aditivo), motivo, fonte (aditivo e
 * apostilamento), campos (só o que muda; no encerramento, situacao ENCERRADO ou RESCINDIDO), arquivo (termo aditivo, contrato assinado) }.
 */
function LicC_versao_(eu, d) {
  var tipo = Lic_up_(d.tipo), motivo = LicD_motivo_(d.motivo, 'da versão nova do contrato'), fonte = LicD_txt_(d.fonte, 300), aditivo = LicD_txt_(d.aditivoNumero, 40);
  if (!LICC_VERSOES[tipo] || tipo === 'ORIGINAL') throw new Error('Escolha o tipo da versão: correção de digitação, termo aditivo, apostilamento (reajuste) ou encerramento. Nada foi gravado');
  // revisão de 42a2c1f: reabrir contrato encerrado ou rescindido é só do Administrador, com motivo de 20 letras e a fonte; vira versão nova
  if (tipo === 'REABERTURA' && Lic_up_(eu.perfil) !== 'ADMIN') throw new Error('Não foi possível: só o Administrador reabre um contrato encerrado ou rescindido (por exemplo, encerramento registrado por engano). Peça ao Administrador. Nada foi gravado');
  if (tipo === 'REABERTURA' && motivo.length < 20) throw new Error('Escreva o motivo da reabertura com pelo menos 20 letras (o que foi conferido). Nada foi gravado');
  if (tipo === 'ADITIVO' && aditivo.length < 1) throw new Error('Escreva o número do termo aditivo (por exemplo 1º termo aditivo). Nada foi gravado');
  if ((tipo === 'ADITIVO' || tipo === 'APOSTILAMENTO' || tipo === 'ENCERRAMENTO' || tipo === 'REABERTURA') && fonte.length < 5) throw new Error('Escreva a fonte (por exemplo "termo aditivo publicado no PNCP em 10/03/2027" ou "termo de encerramento"). Nada foi gravado');
  var campos = Object.assign({}, d.campos || {});
  if (tipo === 'ENCERRAMENTO') {
    var s = Lic_up_(campos.situacao);
    if (s !== 'ENCERRADO' && s !== 'RESCINDIDO') throw new Error('No encerramento, escolha: encerrado (cumprido) ou rescindido. Nada foi gravado');
    campos = { situacao: s, obs: campos.obs };
    if (campos.obs === undefined) delete campos.obs;
  } else if (tipo === 'REABERTURA') campos = { situacao: 'VIGENTE' };
  else delete campos.situacao;
  var lido = d.arquivo && (d.arquivo.base64 || d.arquivo.nome) ? LicH_lerArquivo_(d.arquivo) : null;
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), row = LicC_acharContrato_(l.ID), versoes = LicC_versoesDe_(row.ID), cad = LicC_cadeia_(row, versoes), agora = Lic_agora_();
    if (!cad.integra) throw new Error('Não foi possível: o registro do contrato foi alterado fora do SGO+ (' + cad.problema + '). Nada foi gravado; avise o Administrador para conferir a planilha');
    var ult = versoes[versoes.length - 1], antes = Lic_json_(ult.DADOS_JSON, {});
    if (tipo === 'REABERTURA' && antes.situacao === 'VIGENTE') throw new Error('O contrato já está vigente: não há o que reabrir. Nada foi gravado');
    if (antes.situacao !== 'VIGENTE' && tipo !== 'CORRECAO' && tipo !== 'REABERTURA') throw new Error('O contrato está ' + (LICC_SITUACOES[antes.situacao] || antes.situacao).toLowerCase() + ': só cabe correção de digitação' + (Lic_up_(eu.perfil) === 'ADMIN' ? ' ou a reabertura (Administrador)' : '; se o encerramento foi registrado por engano, peça ao Administrador a reabertura') + '. Nada foi gravado');
    if (tipo === 'APOSTILAMENTO' && Object.keys(campos).some(function (k) { return ['itens', 'reajusteIndice', 'reajusteDataBase', 'reajusteFonte', 'obs'].indexOf(k) < 0; })) throw new Error('O apostilamento registra o reajuste (valores dos itens, índice e data-base). Prazo, quantidade nova ou garantia são termo aditivo. Nada foi gravado');
    var novo = LicC_limpar_(campos, antes);
    novo.origem = antes.origem;
    var difs = LicC_diferencas_(antes, novo), avisos = [];
    var trocaArq = !!lido && (!LicC_ultimoArquivo_(versoes) || lido.sha256 !== Lic_s_(LicC_ultimoArquivo_(versoes).ARQUIVO_SHA256));
    if (lido && !trocaArq) difs.push('Arquivo: o mesmo enviado de novo (SHA-256 igual), sem troca');
    if (!difs.length || (difs.length === 1 && lido && !trocaArq)) return { semMudanca: true };
    var v1 = Lic_json_(versoes[0].DADOS_JSON, {}), inicial = Number(v1.valorTotal) || 0;
    if (tipo === 'ADITIVO' && inicial > 0 && novo.valorTotal > inicial * (1 + LICC_ADITIVO_LIMITE) + 0.004) avisos.push('Valor total ' + LicC_moeda_(novo.valorTotal) + ' passa de 25% acima do valor inicial (' + LicC_moeda_(inicial) + '): confira o limite de acréscimo (Lei 14.133/2021, art. 125)');
    if (tipo === 'CORRECAO' && Lic_up_(row.ORIGEM) === 'RESULTADO') {
      var hom = {}; (v1.itens || []).forEach(function (i) { hom[i.item] = i.valorUnit; });
      novo.itens.forEach(function (i) { if (hom[i.item] !== undefined && Math.abs(hom[i.item] - i.valorUnit) > 0.004) avisos.push('Item ' + i.item + ': valor unitário ' + LicC_moeda_(i.valorUnit) + ' diferente do homologado (' + LicC_moeda_(hom[i.item]) + ')'); });
    }
    var versao = (Number(ult.VERSAO) || 0) + 1, arq = trocaArq ? LicC_gravarArquivo_(lido, row.NUMERO, versao) : null;
    if (arq) difs.push('Arquivo: ' + arq.nome + ' (SHA-256 ' + arq.sha256 + ')' + (LicC_ultimoArquivo_(versoes) ? '; o anterior continua guardado na versão ' + LicC_ultimoArquivo_(versoes).VERSAO : ''));
    var mudou = difs.join('; ') + (avisos.length ? '. Avisos: ' + avisos.join('; ') : '');
    var v = LicC_gravarVersao_(eu, row, tipo, novo, { VERSAO: versao, ADITIVO_NUMERO: tipo === 'ADITIVO' ? aditivo : '', MOTIVO: motivo, FONTE: fonte, MUDOU: Lic_texto_(mudou, 6000), ARQUIVO_ID: arq ? arq.id : '', ARQUIVO_NOME: arq ? arq.nome : '',
      ARQUIVO_TIPO: arq ? arq.tipo : '', ARQUIVO_TAMANHO: arq ? arq.tamanho : '', ARQUIVO_SHA256: arq ? arq.sha256 : '', HASH_ANTERIOR: Lic_s_(ult.HASH) }, agora);
    var mudRow = Object.assign(LicC_resumoLinha_(novo), { VERSAO: versao, VERSAO_ID: v.ID, VERSAO_HASH: v.HASH, ATUALIZADO_EM: agora });
    Object.assign(row, mudRow); mudRow.HASH = row.HASH = LicC_hashLinha_(row);
    SGO_DATA.update(LICC_ABAS.CONTRATOS, row.ID, mudRow);
    var nomeV = tipo === 'ADITIVO' ? (/aditivo/i.test(aditivo) ? aditivo.charAt(0).toUpperCase() + aditivo.slice(1) : 'Termo aditivo ' + aditivo) : LICC_VERSOES[tipo];
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'CONTRATO_VERSAO', eu, { de: 'versão ' + (versao - 1), para: 'versão ' + versao + ' (' + nomeV + ')', texto: nomeV + ' do contrato ' + novo.numeroContrato + ': ' + mudou + '. Motivo: ' + motivo + (fonte ? '. Fonte: ' + fonte : ''),
      versao: 'contrato · versão ' + versao, fonte: 'Contratos', hash: v.HASH });
    var ag = LicC_agendaSincronizar_(eu, l, row, novo, LicC_ref_(row, versao, v.HASH, novo.numeroContrato), nomeV + ' (versão ' + versao + ')', agora);
    return { versao: versao, nome: nomeV, mudou: difs, avisos: avisos, ag: ag, opId: Lic_s_(l.ID), encerrado: novo.situacao !== 'VIGENTE' };
  });
  if (r.semMudanca) return { semMudanca: true, texto: 'Nada mudou: os valores enviados são iguais aos da versão em vigor' + (lido ? ' e o arquivo é o mesmo (SHA-256 igual)' : '') + '. Nenhuma versão nova foi criada.' };
  if (r.ag.fora.length || r.ag.novos.length) LicC_alertasDepois_(r.opId, r.ag, r.nome + ' (versão ' + r.versao + '): os alertas seguem os prazos novos.');
  // revisão de 42a2c1f (ALTA 1): Minhas atividades acompanham (replanejar ou cancelar pela API do próprio módulo, com o motivo)
  var at = LicC_atividadesAcompanhar_(eu, r.opId, r.ag, r.nome + ' (versão ' + r.versao + ')', r.encerrado);
  return { versao: r.versao, mudou: r.mudou, avisos: r.avisos, atividades: at, texto: r.nome + ' gravado como versão ' + r.versao + '. A versão anterior continua no histórico.' + (r.ag.criados + r.ag.retificados + r.ag.cancelados ? ' Agenda: ' + r.ag.criados + ' prazo(s) novo(s), ' + r.ag.retificados + ' alterado(s), ' + r.ag.cancelados + ' cancelado(s).' : '') + LicC_atividadesTexto_(at) + (r.avisos.length ? ' Atenção: ' + r.avisos.join('; ') + '.' : '') };
}
/** Abrir ou baixar o arquivo de uma versão (a última com arquivo, ou d.versaoId). O SHA-256 é conferido antes de entregar. */
function LicC_arquivo_(eu, d) {
  var l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID), versoes = LicC_versoesDe_(r.ID);
  var v = Lic_s_(d.versaoId) ? versoes.filter(function (x) { return Lic_s_(x.ID) === Lic_s_(d.versaoId); })[0] : LicC_ultimoArquivo_(versoes);
  if (!v || !Lic_s_(v.ARQUIVO_ID)) throw new Error('Não foi possível abrir: ' + (Lic_s_(d.versaoId) ? 'esta versão' : 'o contrato') + ' não tem arquivo anexado. Anexe o contrato assinado numa versão de correção');
  var f; try { f = DriveApp.getFileById(Lic_s_(v.ARQUIVO_ID)); } catch (e) { throw new Error('Não foi possível abrir: o arquivo guardado não foi encontrado no serviço de arquivos do SGO+ (' + Lic_s_(e && e.message) + '). Avise o Administrador; nada foi alterado'); }
  var blob = f.getBlob(), bytes = blob.getBytes(), sha = LicH_shaBytes_(bytes);
  if (sha !== Lic_s_(v.ARQUIVO_SHA256)) {
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'CONTRATO_ARQUIVO_NAO_CONFERE', eu, { texto: 'SHA-256 do arquivo guardado (' + sha + ') diferente do registrado (' + Lic_s_(v.ARQUIVO_SHA256) + ') na versão ' + v.VERSAO + ' do contrato. Arquivo não entregue.', versao: 'contrato · versão ' + v.VERSAO, fonte: 'Contratos' });
    throw new Error('Não foi possível abrir: o arquivo guardado não confere com o SHA-256 registrado (pode ter sido alterado fora do SGO+). Nada foi entregue; avise o Administrador e anexe de novo o documento original');
  }
  var tipo = Lic_s_(blob.getContentType ? blob.getContentType() : '').toLowerCase() || 'application/pdf', seguro = LICH_TIPOS_ABRIR.indexOf(tipo) >= 0;
  Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'CONTRATO_ARQUIVO_ABERTO', eu, { texto: (d.baixar ? 'Baixou' : 'Abriu') + ' o arquivo "' + Lic_s_(v.ARQUIVO_NOME) + '" da versão ' + v.VERSAO + ' do contrato (SHA-256 conferido).', versao: 'contrato · versão ' + v.VERSAO, fonte: 'Contratos', hash: sha });
  return { nome: Lic_s_(v.ARQUIVO_NOME), tipo: seguro ? tipo : 'application/octet-stream', forcarBaixar: !seguro, base64: Utilities.base64Encode(bytes), sha256: sha, tamanho: bytes.length };
}

// ------------------------------------------------------------ vínculos com outros módulos (sempre ação explícita da Diretoria)
/**
 * Revisão de 42a2c1f: toda criação em outro módulo RESERVA a chave em LIC_CONTRATO_VINCULOS sob a trava antes de chamar o módulo
 * (ACAO RESERVA); deu certo = a reserva vira o vínculo (ACAO final, REF_ID, hash refeito); deu errado = RESERVA_DESFEITA com o erro.
 * Duas pessoas (ou dois toques) ao mesmo tempo: a segunda vê a reserva e é recusada com o que fazer. Reserva com mais de
 * LICC_RESERVA_MIN minutos (execução cortada no meio) deixa de valer. Fora a reserva, os vínculos nunca mudam: replanejar e cancelar
 * são linhas novas; vale a mais nova de cada módulo e chave.
 */
var LICC_RESERVA_MIN = 10;
function LicC_vincular_(eu, r, l, modulo, acao, chave, ref, motivo, agora) {
  var x = { CONTRATO_ID: Lic_s_(r.ID), OPORTUNIDADE_ID: Lic_s_(r.OPORTUNIDADE_ID), MODULO: modulo, ACAO: acao, CHAVE: Lic_texto_(chave, 200), REF_ID: Lic_s_(ref.id), REF_CODIGO: Lic_texto_(ref.codigo, 80), REF_TEXTO: Lic_texto_(ref.texto, 1000),
    MOTIVO: Lic_texto_(motivo, 1000), POR_ID: eu.id, POR_NOME: eu.nome, EM: agora };
  x.HASH = LicC_hashVinculo_(x);
  var ins = SGO_DATA.insert(LICC_ABAS.VINCULOS, x); x.ID = Lic_s_(ins && ins.ID);
  if (acao !== 'RESERVA') Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'CONTRATO_VINCULO', eu, { de: modulo, para: acao + (ref.codigo ? ' ' + ref.codigo : ''), texto: 'Contrato ' + Lic_s_(r.NUMERO) + ' · ' + ref.texto + (motivo ? '. Motivo: ' + motivo : ''), versao: LICC_REGRAS, fonte: 'Contratos', hash: x.HASH });
  return x;
}
/** O vínculo que vale para o módulo e a chave: o mais novo, sem as reservas desfeitas nem as vencidas. null = nenhum. */
function LicC_vinculoAtual_(lista, modulo, chave, agoraMs) {
  var at = null, ms = agoraMs || Date.now();
  (lista || []).forEach(function (v) {
    if (Lic_up_(v.MODULO) !== modulo || Lic_s_(v.CHAVE) !== chave) return;
    var a = Lic_up_(v.ACAO);
    if (a === 'RESERVA_DESFEITA') return;
    if (a === 'RESERVA' && ms - Date.parse(Lic_s_(v.EM)) > LICC_RESERVA_MIN * 60000) return;
    if (!at || Lic_s_(v.EM) >= Lic_s_(at.EM)) at = v;
  });
  return at;
}
/** Sob a trava de quem chama: grava a reserva da chave. */
function LicC_reservar_(eu, r, l, modulo, chave, texto) { return LicC_vincular_(eu, r, l, modulo, 'RESERVA', chave, { id: '', codigo: '', texto: texto || 'Reserva enquanto o outro módulo grava' }, '', Lic_agora_()); }
/** A reserva vira o vínculo (com trava própria). */
function LicC_fecharReserva_(eu, l, r, res, acao, ref, motivo) {
  return Lic_comTrava_(function () { return LicC_fecharReservaSemTrava_(eu, l, r, res, acao, ref, motivo); });
}
/**
 * Marca da reserva no texto da atividade criada em Minhas atividades (03/11/2026, revisão independente): se a execução cair entre
 * criar a atividade e fechar a reserva, a reserva vence em LICC_RESERVA_MIN minutos e, antes de criar de novo, o SGO+ procura a
 * atividade com esta marca (LicC_recuperarReserva_) em vez de lançar outra igual.
 */
function LicC_marcaReserva_(res) { return '[Ref. Licitações: reserva ' + Lic_s_(res && res.ID) + ']'; }
/**
 * Sob a trava de quem chama: reserva VENCIDA (nunca fechada) do módulo e da chave cuja atividade foi criada em Minhas atividades
 * (achada pela marca). { res, atividade } ou null. Sem Minhas atividades ou sem reserva vencida: null, sem ler a aba.
 */
function LicC_recuperarReserva_(lista, modulo, chave, agoraMs, cacheAtv) {
  var ms = agoraMs || Date.now();
  var vencidas = (lista || []).filter(function (v) { return Lic_up_(v.MODULO) === modulo && Lic_s_(v.CHAVE) === chave && Lic_up_(v.ACAO) === 'RESERVA' && ms - Date.parse(Lic_s_(v.EM)) > LICC_RESERVA_MIN * 60000; });
  if (!vencidas.length || typeof Atividades_abas_ !== 'function') return null;
  if (!cacheAtv.lista) { try { cacheAtv.lista = SGO_DATA.getAll(Atividades_abas_().ATIVIDADES) || []; } catch (e) { cacheAtv.lista = []; } }
  for (var i = vencidas.length - 1; i >= 0; i--) {
    var marca = LicC_marcaReserva_(vencidas[i]);
    var a = cacheAtv.lista.filter(function (x) { return Lic_s_(x.DESCRICAO).indexOf(marca) >= 0 && Lic_s_(x.SITUACAO) !== 'Cancelada'; })[0];
    if (a) return { res: vencidas[i], atividade: a };
  }
  return null;
}
function LicC_fecharReservaSemTrava_(eu, l, r, res, acao, ref, motivo) {
  var agora = Lic_agora_(), x = { CONTRATO_ID: Lic_s_(r.ID), OPORTUNIDADE_ID: Lic_s_(r.OPORTUNIDADE_ID), MODULO: Lic_s_(res.MODULO), ACAO: acao, CHAVE: Lic_s_(res.CHAVE), REF_ID: Lic_s_(ref.id), REF_CODIGO: Lic_texto_(ref.codigo, 80),
    REF_TEXTO: Lic_texto_(ref.texto, 1000), MOTIVO: Lic_texto_(motivo, 1000), POR_ID: eu.id, POR_NOME: eu.nome, EM: agora };
  x.HASH = LicC_hashVinculo_(x);
  SGO_DATA.update(LICC_ABAS.VINCULOS, res.ID, x);
  Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'CONTRATO_VINCULO', eu, { de: x.MODULO, para: acao + (x.REF_CODIGO ? ' ' + x.REF_CODIGO : ''), texto: 'Contrato ' + Lic_s_(r.NUMERO) + ' · ' + x.REF_TEXTO + (x.MOTIVO ? '. Motivo: ' + x.MOTIVO : ''), versao: LICC_REGRAS, fonte: 'Contratos', hash: x.HASH });
  return x;
}
/** A criação no outro módulo falhou: a reserva é desfeita, com o erro (a chave fica livre para tentar de novo). Nunca lança. */
function LicC_desfazerReserva_(eu, res, erro) {
  try {
    Lic_comTrava_(function () {
      var x = SGO_DATA.getById(LICC_ABAS.VINCULOS, res.ID) || res;
      var m = { ACAO: 'RESERVA_DESFEITA', MOTIVO: Lic_texto_('Não gravou no outro módulo: ' + Lic_s_(erro), 1000), EM: Lic_agora_() };
      m.HASH = LicC_hashVinculo_(Object.assign({}, x, m));
      SGO_DATA.update(LICC_ABAS.VINCULOS, res.ID, m);
    });
  } catch (e) { console.error('Licitações, reserva do contrato: ' + ((e && e.message) || e)); }
}
function LicC_sessao_(eu) { if (!eu || !eu.sessao) throw new Error('Não foi possível: a sessão não chegou a esta ação. Atualize a página (F5) e tente de novo; nada foi criado'); return eu.sessao; }
/** Prazo de atividade que não nasce atrasada: dia de hoje ou já passado vai para o próximo dia útil. { dia, ajustado }. */
function LicC_prazoAtividade_(dia) {
  var hoje = LicC_hoje_();
  if (dia > hoje) return { dia: dia, ajustado: false };
  return { dia: Lic_diasUteisDepois_(hoje, 1).dia, ajustado: true };
}
function LicC_atividade_(id) { try { return typeof Atividades_abas_ === 'function' && id ? SGO_DATA.getById(Atividades_abas_().ATIVIDADES, id) : null; } catch (e) { return null; } }
function LicC_atividadeAberta_(a) { return !!a && Lic_s_(a.SITUACAO) !== 'Concluída' && Lic_s_(a.SITUACAO) !== 'Cancelada'; }

// --- Clientes (cadastro único): localizar pelo CNPJ do PNCP, vincular ou cadastrar (nunca duplicar o CNPJ)
var LICC_MSG_INATIVO = 'está inativo no cadastro: reative em Cadastros › Clientes (abra o cliente e toque em "Reativar") e volte aqui para vincular';
function LicC_clientesPorCnpj_(cnpj) {
  if (!cnpj) return [];
  var out = [], vistos = {};
  Lic_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { if (LicC_cnpj_(c.CNPJ) === cnpj && !Lic_s_(c.JUNTADO_COM_ID)) { vistos[Lic_s_(c.ID)] = true; out.push({ id: Lic_s_(c.ID), razao: Lic_s_(c.RAZAO_SOCIAL), fantasia: Lic_s_(c.NOME_FANTASIA), cnpj: LicC_cnpjTxt_(cnpj), status: Lic_up_(c.STATUS) || 'ATIVO', onde: 'Cliente' }); } });
  var cli = {}; Lic_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { cli[Lic_s_(c.ID)] = c; });
  Lic_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function (u) {
    if (LicC_cnpj_(u.CNPJ_UNIDADE) !== cnpj || vistos[Lic_s_(u.CLIENTE_ID)]) return;
    var c = cli[Lic_s_(u.CLIENTE_ID)]; if (!c) return;
    vistos[Lic_s_(c.ID)] = true;
    out.push({ id: Lic_s_(c.ID), razao: Lic_s_(c.RAZAO_SOCIAL), fantasia: Lic_s_(c.NOME_FANTASIA), cnpj: LicC_cnpjTxt_(LicC_cnpj_(c.CNPJ)), status: Lic_up_(c.STATUS) || 'ATIVO', onde: 'Unidade "' + Lic_s_(u.NOME_UNIDADE) + '" com este CNPJ' });
  });
  out.forEach(function (x) { if (x.status === 'INATIVO') x.orientacao = 'O cliente ' + (x.fantasia || x.razao) + ' ' + LICC_MSG_INATIVO + '.'; });
  return out;
}
function LicC_clienteTela_(l, r) {
  var cnpj = LicC_cnpj_(r.ORGAO_CNPJ || l.ORGAO_CNPJ), ok = LicC_cnpjValido_(cnpj), encontrados = ok ? LicC_clientesPorCnpj_(cnpj) : [];
  return { vinculado: Lic_s_(r.CLIENTE_ID) ? { id: Lic_s_(r.CLIENTE_ID), nome: Lic_s_(r.CLIENTE_NOME) } : null, cnpj: LicC_cnpjTxt_(cnpj), cnpjValido: ok, encontrados: encontrados,
    podeCriar: ok && !encontrados.length && !Lic_s_(r.CLIENTE_ID), ciente: typeof CADQ_CIENTE !== 'undefined' ? CADQ_CIENTE : 'Ciente — os dados foram conferidos',
    sugestao: { RAZAO_SOCIAL: Lic_up_(l.ORGAO_NOME), CNPJ: cnpj, UF: Lic_up_(l.UF), CIDADE: Lic_up_(l.MUNICIPIO) },
    fontePublica: 'PNCP: órgão ' + Lic_s_(l.ORGAO_NOME) + ', CNPJ ' + LicC_cnpjTxt_(cnpj) + ', ' + (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF) + ' (processo ' + Lic_s_(l.NUMERO_CONTROLE_PNCP) + ')',
    semCnpj: !ok ? 'O CNPJ do órgão no PNCP está vazio ou inválido ("' + Lic_s_(r.ORGAO_CNPJ || l.ORGAO_CNPJ) + '"): procure o cliente pelo nome em Cadastros > Clientes e vincule escolhendo da lista, com o motivo.' : '' };
}
/** Vincular a um cliente do cadastro. d = { id, clienteId, motivo }. CNPJ diferente do órgão só com o motivo. */
function LicC_clienteVincular_(eu, d) {
  var motivo = LicD_txt_(d.motivo, 1000);
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID), agora = Lic_agora_();
    if (Lic_s_(r.CLIENTE_ID)) throw new Error('O contrato já está vinculado ao cliente ' + Lic_s_(r.CLIENTE_NOME) + '. Nada foi alterado');
    var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Lic_s_(d.clienteId));
    if (!c) throw new Error('Não foi possível vincular: o cliente não foi encontrado no cadastro (pode ter sido juntado a outro). Atualize e escolha de novo. Nada foi alterado');
    if (Lic_up_(c.STATUS) === 'INATIVO') throw new Error('Não foi possível vincular: o cliente ' + (Lic_s_(c.NOME_FANTASIA) || Lic_s_(c.RAZAO_SOCIAL)) + ' ' + LICC_MSG_INATIVO + '. Nada foi alterado');
    var cnpj = LicC_cnpj_(r.ORGAO_CNPJ || l.ORGAO_CNPJ), mesmo = LicC_clientesPorCnpj_(cnpj).some(function (x) { return x.id === Lic_s_(c.ID); });
    if (!mesmo && motivo.length < 10) throw new Error('O CNPJ deste cliente não é o do órgão no PNCP (' + LicC_cnpjTxt_(cnpj) + '): para vincular mesmo assim, escreva o motivo (pelo menos 10 letras). Nada foi alterado');
    var nome = Lic_s_(c.NOME_FANTASIA) || Lic_s_(c.RAZAO_SOCIAL);
    var ux = { CLIENTE_ID: Lic_s_(c.ID), CLIENTE_NOME: nome, ATUALIZADO_EM: agora }; Object.assign(r, ux); ux.HASH = r.HASH = LicC_hashLinha_(r);
    SGO_DATA.update(LICC_ABAS.CONTRATOS, r.ID, ux);
    LicC_vincular_(eu, r, l, 'CLIENTES', 'VINCULADO', 'CLIENTE', { id: c.ID, codigo: LicC_cnpjTxt_(LicC_cnpj_(c.CNPJ)), texto: 'Vinculado ao cliente ' + nome + (mesmo ? ' (mesmo CNPJ do órgão no PNCP)' : ' (CNPJ diferente do órgão, com o motivo)') }, motivo, agora);
    return { texto: 'Contrato vinculado ao cliente ' + nome + ' do cadastro único.' };
  });
}
/**
 * Cadastrar o órgão como cliente (ação explícita): d = { id, cliente: { campos do cadastro, CIENTE } }. O CNPJ é o do órgão no PNCP (não muda);
 * se já houver cliente ou unidade com ele, recusa e manda vincular (ou reativar). O cadastro segue a regra de Cadastros > Clientes (completo e "Ciente").
 */
function LicC_clienteCriar_(eu, d) {
  var sid = LicC_sessao_(eu), l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID);
  if (Lic_s_(r.CLIENTE_ID)) throw new Error('O contrato já está vinculado ao cliente ' + Lic_s_(r.CLIENTE_NOME) + '. Nada foi criado');
  var cnpj = LicC_cnpj_(r.ORGAO_CNPJ || l.ORGAO_CNPJ);
  if (!LicC_cnpjValido_(cnpj)) throw new Error('Não foi possível cadastrar: o CNPJ do órgão no PNCP está vazio ou inválido. Cadastre em Cadastros > Clientes e depois vincule. Nada foi criado');
  var ja = LicC_clientesPorCnpj_(cnpj);
  if (ja.length) throw new Error('Já existe no cadastro o CNPJ ' + LicC_cnpjTxt_(cnpj) + ' (' + ja.map(function (x) { return (x.fantasia || x.razao) + (x.status === 'INATIVO' ? ', inativo' : ''); }).join('; ') + '): ' +
    (ja.every(function (x) { return x.status === 'INATIVO'; }) ? 'o cliente ' + LICC_MSG_INATIVO : 'vincule a ele em vez de cadastrar de novo') + '. Nada foi criado');
  var p = Object.assign({}, d.cliente || {}, { CNPJ: cnpj, CPF: '', ORIGEM_TELA: 'Licitações › Contratos (dados públicos do PNCP conferidos pela Diretoria)' });
  if (typeof CadQ_salvarCliente_ !== 'function' && typeof clientesCriar !== 'function') throw new Error('Não foi possível cadastrar: o cadastro de clientes não está disponível neste ambiente. Nada foi criado');
  var res = typeof CadQ_salvarCliente_ === 'function' ? CadQ_salvarCliente_(sid, '', p) : clientesCriar(sid, p);
  if (!res || !res.success) return { criado: false, faltam: (res && res.faltam) || [], texto: Lic_s_(res && res.message) || 'O cadastro de clientes não respondeu. Nada foi criado.' };
  var cid = Lic_s_(res.item && res.item.ID);
  var x = Lic_comTrava_(function () {
    var r2 = LicC_acharContrato_(l.ID), agora = Lic_agora_(), c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, cid) || {}, nome = Lic_s_(c.NOME_FANTASIA) || Lic_s_(c.RAZAO_SOCIAL) || Lic_s_(p.RAZAO_SOCIAL);
    var ux = { CLIENTE_ID: cid, CLIENTE_NOME: nome, ATUALIZADO_EM: agora }; Object.assign(r2, ux); ux.HASH = r2.HASH = LicC_hashLinha_(r2);
    SGO_DATA.update(LICC_ABAS.CONTRATOS, r2.ID, ux);
    LicC_vincular_(eu, r2, l, 'CLIENTES', 'CRIADO', 'CLIENTE', { id: cid, codigo: LicC_cnpjTxt_(cnpj), texto: 'Órgão cadastrado como cliente (' + nome + ') com os dados públicos do PNCP conferidos e completados pela Diretoria, e vinculado ao contrato' }, '', agora);
    return nome;
  });
  return { criado: true, clienteId: cid, texto: 'Cliente ' + x + ' cadastrado (Cadastros > Clientes, com a unidade principal) e vinculado ao contrato.' };
}

// --- Comercial: oportunidade ganha (origem "Licitação"), sem proposta duplicada
function LicC_refComercial_(r) { return 'LIC-CONTRATO:' + Lic_s_(r.NUMERO); }
function LicC_opoDaRef_(r) { return Lic_ler_(COM_ABAS.OPORTUNIDADES).filter(function (o) { return Lic_s_(o.ORIGEM_REF) === LicC_refComercial_(r); })[0] || null; }
var LICC_COM_SIT = { ABERTA: 'aberta', GANHA: 'ganha', PERDIDA: 'perdida' };
function LicC_comercialTela_(l, r) {
  var out = { disponivel: typeof ComOpo_salvar_ === 'function' && typeof ComOpo_ganhar_ === 'function', vinculado: Lic_s_(r.COMERCIAL_OPO_ID) ? { id: Lic_s_(r.COMERCIAL_OPO_ID), codigo: Lic_s_(r.COMERCIAL_OPO_CODIGO) } : null, unidades: [], contatos: [], porque: '' };
  if (!out.disponivel) { out.porque = 'O Comercial não está disponível neste ambiente.'; return out; }
  if (out.vinculado) return out;
  var ex = typeof COM_ABAS !== 'undefined' ? LicC_opoDaRef_(r) : null;
  if (ex) {
    var s = Lic_up_(ex.SITUACAO || 'ABERTA');
    out.jaExiste = { id: Lic_s_(ex.ID), codigo: Lic_s_(ex.CODIGO), situacao: s };
    out.porque = s === 'GANHA' || s === 'ABERTA' ? 'Já existe a oportunidade ' + Lic_s_(ex.CODIGO) + ' do Comercial para este contrato (' + LICC_COM_SIT[s] + '): toque em "Vincular a existente"' + (s === 'ABERTA' ? ' (ela é marcada como ganha).' : '.')
      : 'A oportunidade ' + Lic_s_(ex.CODIGO) + ' do Comercial para este contrato está ' + (LICC_COM_SIT[s] || s.toLowerCase()) + ': peça à gestão comercial a reabertura (Comercial › Oportunidades › ' + Lic_s_(ex.CODIGO) + ' › "Pedir reabertura") e volte aqui.';
    out.podeVincular = s === 'GANHA' || s === 'ABERTA';
    return out;
  }
  if (!Lic_s_(r.CLIENTE_ID)) { out.porque = 'Vincule (ou cadastre) primeiro o cliente do contrato: a oportunidade do Comercial é sempre de um cliente do cadastro único.'; return out; }
  out.unidades = Lic_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Lic_s_(u.CLIENTE_ID) === Lic_s_(r.CLIENTE_ID) && Lic_up_(u.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (u) { return { id: Lic_s_(u.ID), nome: Lic_s_(u.NOME_UNIDADE) }; });
  out.contatos = typeof COM_ABAS !== 'undefined' ? Lic_ler_(COM_ABAS.CONTATOS).filter(function (c) { return Lic_s_(c.CLIENTE_ID) === Lic_s_(r.CLIENTE_ID) && Lic_up_(c.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (c) { return { id: Lic_s_(c.ID), nome: Lic_s_(c.NOME), cargo: Lic_s_(c.CARGO), unidadeId: Lic_s_(c.UNIDADE_ID) }; }) : [];
  if (!out.contatos.length) out.porque = 'O cliente não tem contato no Comercial: cadastre o contato do órgão (gestor ou fiscal do contrato) em Comercial > Contatos e volte aqui.';
  return out;
}
/**
 * Registrar como ganha no Comercial. d = { id, unidadeId, contatoId, motivo } ou, com a oportunidade que já existe para o contrato,
 * { id, vincularId }. Revisão de 42a2c1f: sob a trava, confere ORIGEM_REF de novo e grava a reserva antes de criar; a que já existe é
 * marcada como ganha se estiver aberta; perdida ou cancelada é recusada com o caminho (reabertura no Comercial).
 */
function LicC_comercialRegistrar_(eu, d) {
  var sid = LicC_sessao_(eu), motivo = LicD_txt_(d.motivo, 1000);
  if (typeof ComOpo_salvar_ !== 'function' || typeof ComOpo_ganhar_ !== 'function' || typeof Com_eu_ !== 'function') throw new Error('Não foi possível: o Comercial não está disponível neste ambiente. Nada foi criado');
  var p = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID);
    if (Lic_s_(r.COMERCIAL_OPO_ID)) throw new Error('O contrato já está no Comercial (' + Lic_s_(r.COMERCIAL_OPO_CODIGO) + '). Nada foi criado');
    var at = LicC_vinculoAtual_(LicC_vinculosDe_(r.ID), 'COMERCIAL', 'OPORTUNIDADE');
    if (at && Lic_up_(at.ACAO) === 'RESERVA') throw new Error('Não foi possível agora: ' + Lic_s_(at.POR_NOME) + ' está registrando este contrato no Comercial neste momento. Espere um minuto e toque em "Atualizar"; nada foi criado');
    var ex = LicC_opoDaRef_(r);
    if (ex) {
      var s = Lic_up_(ex.SITUACAO || 'ABERTA');
      if (Lic_s_(d.vincularId) !== Lic_s_(ex.ID)) throw new Error('Já existe a oportunidade ' + Lic_s_(ex.CODIGO) + ' do Comercial para este contrato: vincule a ela (toque em "Vincular a existente"); nada de duplicar. Nada foi criado');
      if (s !== 'ABERTA' && s !== 'GANHA') throw new Error('A oportunidade ' + Lic_s_(ex.CODIGO) + ' do Comercial está ' + (LICC_COM_SIT[s] || s.toLowerCase()) + ': o contrato não é ligado a oportunidade perdida ou cancelada. Peça à gestão comercial a reabertura (Comercial › Oportunidades › ' + Lic_s_(ex.CODIGO) + ' › "Pedir reabertura") e volte aqui. Nada foi vinculado');
    } else if (!Lic_s_(r.CLIENTE_ID)) throw new Error('Vincule (ou cadastre) primeiro o cliente do contrato. Nada foi criado');
    var res = LicC_reservar_(eu, r, l, 'COMERCIAL', 'OPORTUNIDADE', 'Registro no Comercial em andamento');
    return { l: l, r: r, ex: ex, res: res };
  });
  var l = p.l, r = p.r, opo, acao, criou = false, ceu;
  try {
    ceu = Com_eu_(sid);
    if (p.ex) {
      opo = p.ex;
      if (Lic_up_(opo.SITUACAO || 'ABERTA') === 'ABERTA') { ComOpo_ganhar_(ceu, { id: Lic_s_(opo.ID), texto: 'Licitação ganha e contrato assinado (Licitações › Contratos, ' + Lic_s_(r.NUMERO) + ').' + (motivo ? ' ' + motivo : '') }); acao = 'GANHA'; }
      else acao = 'VINCULADA';
    } else {
      var dd = LicC_montar_(r, { semAlertas: true }).dados;
      var amanha = typeof Com_somarDiasUteis_ === 'function' && typeof Com_hoje_ === 'function' ? Com_somarDiasUteis_(Com_hoje_(), 1) : LicC_somarDias_(LicC_hoje_(), 1);
      var sv = ComOpo_salvar_(ceu, sid, { titulo: 'Contrato de licitação ' + dd.numeroContrato + ' · ' + Lic_texto_(l.ORGAO_NOME, 120), clienteId: Lic_s_(r.CLIENTE_ID), unidadeId: Lic_s_(d.unidadeId), contatoId: Lic_s_(d.contatoId), funil: 'ENGENHARIA', etapa: 'ENG_5',
        origem: 'Licitação', origemRef: LicC_refComercial_(r), valor: dd.valorTotal, chance: 'ALTA', previsao: dd.inicio, observacoes: 'Licitação ' + Lic_s_(l.CODIGO) + ' (' + Lic_s_(l.NUMERO_CONTROLE_PNCP) + '), contrato ' + dd.numeroContrato + ' (' + Lic_s_(r.NUMERO) + '), vigência ' + LicC_br_(dd.inicio) + ' a ' + LicC_br_(dd.fim) + '. A proposta é a de Licitações (não há proposta no Comercial). Itens: ' + dd.itens.map(function (i) { return i.item + ' ' + (i.codigo || i.nome); }).join('; ') + '.',
        proxima: { acao: 'Acompanhar o início do contrato de licitação ' + dd.numeroContrato, data: amanha, hora: '09:00', tipo: 'EMAIL' } });
      opo = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Lic_s_(sv.oportunidade && sv.oportunidade.id)) || { ID: Lic_s_(sv.oportunidade && sv.oportunidade.id), CODIGO: Lic_s_(sv.oportunidade && sv.oportunidade.codigo) };
      criou = true;
      ComOpo_ganhar_(ceu, { id: Lic_s_(opo.ID), texto: 'Licitação ganha e contrato assinado: ' + dd.numeroContrato + ' (Licitações › Contratos, ' + Lic_s_(r.NUMERO) + ').' + (motivo ? ' ' + motivo : '') });
      acao = 'GANHA';
    }
  } catch (e) {
    var msg = Lic_s_(e && e.message).replace(/[.\s]+$/, '');
    LicC_desfazerReserva_(eu, p.res, msg);
    if (criou) throw new Error('A oportunidade ' + Lic_s_(opo.CODIGO) + ' foi criada no Comercial, mas não foi marcada como ganha (' + msg + '). Toque em "Atualizar" e depois em "Vincular a existente" para concluir; nada foi duplicado');
    throw new Error(msg + '. Nada foi vinculado');
  }
  var cod = Lic_s_(opo.CODIGO);
  LicC_fecharReserva_(eu, l, r, p.res, acao, { id: opo.ID, codigo: cod, texto: criou ? 'Oportunidade ' + cod + ' criada no Comercial (origem Licitação) e marcada como ganha' : 'Vinculado à oportunidade ' + cod + ' que já existia no Comercial' + (acao === 'GANHA' ? ', marcada como ganha agora' : ' (já estava ganha)') }, motivo);
  Lic_comTrava_(function () {
    var r2 = LicC_acharContrato_(l.ID), ux = { COMERCIAL_OPO_ID: Lic_s_(opo.ID), COMERCIAL_OPO_CODIGO: cod, ATUALIZADO_EM: Lic_agora_() }; Object.assign(r2, ux); ux.HASH = r2.HASH = LicC_hashLinha_(r2);
    SGO_DATA.update(LICC_ABAS.CONTRATOS, r2.ID, ux);
  });
  return { codigo: cod, texto: criou ? 'Oportunidade ' + cod + ' registrada como ganha no Comercial (origem "Licitação"), vinculada ao contrato. Nenhuma proposta foi criada no Comercial.' : 'Contrato vinculado à oportunidade ' + cod + ' do Comercial' + (acao === 'GANHA' ? ', marcada como ganha.' : '.') };
}

// --- Agenda única (Minhas atividades): uma atividade por marco futuro, para o responsável
var LICC_PRIORIDADE_MARCO = { CONTRATO_FIM: 'Alta', CONTRATO_RENOVACAO: 'Alta', CONTRATO_GARANTIA: 'Alta', CONTRATO_REAJUSTE: 'Normal', CONTRATO_INICIO: 'Normal', CONTRATO_ENTREGA: 'Normal', CONTRATO_OBRIGACAO: 'Normal' };
/** Vínculo ATIVIDADES de um marco (CHAVE = a chave do prazo; REF_CODIGO = o dia do marco quando a atividade foi lançada ou replanejada). */
function LicC_agendaUnicaTela_(r, m) {
  var hoje = LicC_hoje_(), chaves = {}, lista = LicC_vinculosDe_(r.ID);
  Lic_eventosDe_(r.OPORTUNIDADE_ID).forEach(function (x) { chaves[Lic_s_(x.ID)] = x; });
  var marcos = m.eventos.filter(function (e) { return e.situacao === 'ATIVO'; }).map(function (e) {
    var ev = chaves[e.id] || {}, ch = Lic_s_(ev.CHAVE), v = LicC_vinculoAtual_(lista, 'ATIVIDADES', ch), a = v ? Lic_up_(v.ACAO) : '';
    var atv = a === 'ATIVIDADE' || a === 'REPLANEJADA' ? { id: Lic_s_(v.REF_ID), dia: Lic_s_(v.REF_CODIGO), desatualizada: Lic_s_(v.REF_CODIGO) !== e.dia } : null, anterior = null;
    // 03/11/2026 (revisão independente): a atividade foi concluída (ou cancelada) ANTES de um aditivo mudar a data: ela não se
    // ajusta mais; o marco volta a "a levar", com a explicação (nunca "ajuste em Minhas atividades" para atividade concluída)
    if (atv && atv.desatualizada) {
      var reg = LicC_atividade_(atv.id);
      if (reg && !LicC_atividadeAberta_(reg)) { anterior = { id: atv.id, dia: atv.dia, situacao: Lic_s_(reg.SITUACAO), texto: 'a atividade anterior (prazo ' + LicC_br_(atv.dia) + ') foi ' + (Lic_s_(reg.SITUACAO) === 'Concluída' ? 'concluída' : 'cancelada') + ' antes da mudança da data' }; atv = null; }
    }
    return { eventoId: e.id, chave: ch, nome: e.nome, dia: e.dia, passou: e.dia < hoje, emAndamento: a === 'RESERVA', atividade: atv, anterior: anterior };
  });
  return { disponivel: typeof Atividades_apiCriar === 'function', responsavel: Lic_s_(m.dados.responsavelNome), marcos: marcos, aLevar: marcos.filter(function (x) { return !x.passou && !x.atividade && !x.emAndamento; }).length };
}
/**
 * Levar os marcos futuros à agenda única (Minhas atividades), para o responsável. d = { id, confirmar: true }. Revisão de 42a2c1f: cada
 * marco é reservado sob a trava antes de criar (dois toques ao mesmo tempo não repetem); falhou = a reserva é desfeita. Marco de hoje
 * vai para o próximo dia útil (a atividade não nasce atrasada).
 */
function LicC_agendaUnica_(eu, d) {
  var sid = LicC_sessao_(eu);
  if (typeof Atividades_apiCriar !== 'function') throw new Error('Não foi possível: Minhas atividades não está disponível neste ambiente. Nada foi criado');
  var p = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID), m = LicC_montar_(r, { semAlertas: true }), t = LicC_agendaUnicaTela_(r, m);
    if (m.dados.situacao !== 'VIGENTE') throw new Error('O contrato está ' + (LICC_SITUACOES[m.dados.situacao] || m.dados.situacao).toLowerCase() + ': não há prazo para levar à agenda única. Nada foi criado');
    if (d.confirmar !== true) throw new Error('Confirme na janela: o SGO+ lança ' + t.aLevar + ' atividade(s) em Minhas atividades para ' + t.responsavel + '. Nada foi criado');
    // 03/11/2026: reserva vencida (a execução caiu depois de criar a atividade): a atividade com a marca da reserva é recuperada
    var lista = LicC_vinculosDe_(r.ID), cacheAtv = {}, recuperadas = [], lev = [];
    t.marcos.filter(function (mc) { return !mc.passou && !mc.atividade && !mc.emAndamento; }).forEach(function (mc) {
      var rec = mc.anterior ? null : LicC_recuperarReserva_(lista, 'ATIVIDADES', mc.chave, null, cacheAtv);
      if (rec) {
        LicC_fecharReservaSemTrava_(eu, l, r, rec.res, 'ATIVIDADE', { id: Lic_s_(rec.atividade.ID), codigo: mc.dia, texto: 'Atividade em Minhas atividades: ' + mc.nome + ' (recuperada pela marca da reserva; a gravação anterior foi interrompida)' }, '');
        recuperadas.push(mc.nome); return;
      }
      lev.push({ mc: mc, res: LicC_reservar_(eu, r, l, 'ATIVIDADES', mc.chave, 'Atividade em lançamento: ' + mc.nome) });
    });
    return { l: l, r: r, m: m, t: t, lev: lev, recuperadas: recuperadas };
  });
  var l = p.l, r = p.r, m = p.m, t = p.t, criadas = [], erros = [], ajustadas = [], relancadas = [], semVinculo = [];
  p.lev.forEach(function (x) {
    var mc = x.mc, ev = SGO_DATA.getById(LIC_ABAS.EVENTOS, mc.eventoId) || {}, pz = LicC_prazoAtividade_(mc.dia), res = null;
    try {
      res = Atividades_apiCriar(sid, { titulo: Lic_texto_(mc.nome, 200), descricao: 'Contrato ' + m.dados.numeroContrato + ' (' + m.numero + ') da licitação ' + Lic_s_(l.CODIGO) + ' · ' + Lic_texto_(l.ORGAO_NOME, 150) + '.\n' + (Lic_s_(ev.REGRA) ? Lic_s_(ev.REGRA) + '\n' : '') +
        (pz.ajustado ? 'O marco é em ' + LicC_br_(mc.dia) + '; a atividade ficou para o próximo dia útil para não nascer atrasada.\n' : '') + 'O prazo também está na agenda de Licitações, com os alertas da Diretoria. Detalhes: Licitações › Contratos › ' + m.numero + '.' +
        (mc.anterior ? '\nA atividade anterior deste marco (prazo ' + LicC_br_(mc.anterior.dia) + ') foi ' + (mc.anterior.situacao === 'Concluída' ? 'concluída' : 'cancelada') + ' antes de a data mudar.' : '') + '\n' + LicC_marcaReserva_(x.res),
        prazo: pz.dia + 'T09:00', prioridade: LICC_PRIORIDADE_MARCO[Lic_s_(ev.TIPO)] || 'Normal', responsavelId: Lic_s_(m.dados.responsavelId), modulo: 'licitacoes', moduloNome: 'Licitações › Contratos', clienteId: Lic_s_(r.CLIENTE_ID),
        porQue: 'Prazo do contrato de licitação ' + m.dados.numeroContrato + '.', onde: 'Licitações › Contratos › ' + m.numero, como: 'Conferir no contrato assinado e registrar o que foi feito.', restrita: 'SIM' });
    } catch (e) { res = { ok: false, message: Lic_s_(e && e.message) }; }
    if (!res || !res.ok || !res.item) { erros.push(mc.nome + ': ' + Lic_s_(res && res.message)); LicC_desfazerReserva_(eu, x.res, res && res.message); return; }
    var id = Lic_s_(res.item.ID || res.item.id);
    // 03/11/2026: a atividade já existe; se o vínculo não gravar agora (trava ocupada), a reserva vence e a próxima vez a recupera pela marca
    try { LicC_fecharReserva_(eu, l, r, x.res, 'ATIVIDADE', { id: id, codigo: mc.dia, texto: 'Atividade em Minhas atividades: ' + mc.nome + ' (prazo ' + LicC_br_(pz.dia) + (pz.ajustado ? ', próximo dia útil' : '') + ', ' + m.dados.responsavelNome + ')' + (mc.anterior ? '; ' + mc.anterior.texto : '') }, ''); }
    catch (eF) { semVinculo.push(mc.nome + ': a atividade foi lançada em Minhas atividades, mas o vínculo com o contrato não gravou agora (' + Lic_s_(eF && eF.message).replace(/[.\s]+$/, '') + '). Não lance outra: daqui a ' + LICC_RESERVA_MIN + ' minutos toque de novo em "Levar à agenda única" e o SGO+ reconhece a atividade pela marca'); }
    criadas.push(id); if (pz.ajustado) ajustadas.push(mc.nome); if (mc.anterior) relancadas.push(mc.nome + ' (' + mc.anterior.texto + ')');
  });
  var desat = t.marcos.filter(function (x) { return x.atividade && x.atividade.desatualizada; });
  return { criadas: criadas.length, erros: erros.concat(semVinculo), texto: (criadas.length ? criadas.length + ' atividade(s) lançada(s) em Minhas atividades para ' + t.responsavel + '.' : 'Nenhuma atividade nova (os marcos futuros já estão na agenda única).') +
    (relancadas.length ? ' Lançada(s) de novo com a data nova: ' + relancadas.join('; ') + '.' : '') + (p.recuperadas.length ? ' Recuperada(s) pela marca da reserva (já estavam em Minhas atividades; nada repetido): ' + p.recuperadas.join('; ') + '.' : '') +
    (ajustadas.length ? ' Para o próximo dia útil (o marco é hoje): ' + ajustadas.join('; ') + '.' : '') + (erros.length ? ' Não lançadas (tente de novo): ' + erros.join('; ') + '.' : '') + (semVinculo.length ? ' Atenção: ' + semVinculo.join('; ') + '.' : '') +
    (desat.length ? ' Atividade(s) com o prazo antigo: ' + desat.map(function (x) { return x.nome + ' (agora ' + LicC_br_(x.dia) + ')'; }).join('; ') + '. Ajuste o prazo em Minhas atividades.' : '') };
}
/**
 * Revisão de 42a2c1f (ALTA 1): depois de uma versão do contrato, as atividades ligadas acompanham, pela própria API de Minhas atividades
 * (com a sessão de quem gravou): marco com data nova = atividade replanejada (próximo dia útil se a data nova já chegou); marco que saiu
 * ou contrato encerrado = atividade cancelada com o motivo; no encerramento, o planejamento da execução aberto também é cancelado.
 * Atividade já concluída ou cancelada não é mexida. Falha fica no texto da resposta (e a tela mostra o que fazer). Nunca lança.
 */
function LicC_atividadesAcompanhar_(eu, oid, ag, motivo, encerrado) {
  var out = { replanejadas: [], canceladas: [], erros: [], concluidas: [] };
  if (!eu || !eu.sessao || typeof Atividades_apiMudarSituacao !== 'function') return out;
  try {
    var l = Lic_acharOp_(oid), r = LicC_acharContrato_(l.ID), lista = LicC_vinculosDe_(r.ID), novos = [];
    var cancelar = function (v, modulo, nome) {
      var a = LicC_atividade_(v.REF_ID);
      if (!LicC_atividadeAberta_(a)) return;
      var res = Atividades_apiMudarSituacao(eu.sessao, { id: Lic_s_(v.REF_ID), situacao: 'Cancelada', motivo: Lic_texto_('Contrato ' + Lic_s_(r.NUMERO) + ': ' + motivo, 1500) });
      if (!res || !res.ok) { out.erros.push(nome + ': ' + Lic_s_(res && res.message)); return; }
      out.canceladas.push(nome); novos.push([modulo, 'CANCELADA', Lic_s_(v.CHAVE), { id: v.REF_ID, codigo: Lic_s_(v.REF_CODIGO), texto: 'Atividade cancelada em Minhas atividades (' + nome + '): ' + motivo }]);
    };
    (ag.mudados || []).forEach(function (x) {
      var v = LicC_vinculoAtual_(lista, 'ATIVIDADES', x.chave), a = v ? Lic_up_(v.ACAO) : '';
      if ((a !== 'ATIVIDADE' && a !== 'REPLANEJADA') || Lic_s_(v.REF_CODIGO) === x.dia) return;
      var atA = LicC_atividade_(v.REF_ID);
      // 03/11/2026: concluída (ou cancelada) antes da mudança: não se mexe nela; o marco volta a "a levar" na Agenda única do contrato
      if (!LicC_atividadeAberta_(atA)) { if (atA) out.concluidas.push(x.nome + ' (a atividade foi ' + (Lic_s_(atA.SITUACAO) === 'Concluída' ? 'concluída' : 'cancelada') + ' antes da mudança; o marco, agora em ' + LicC_br_(x.dia) + ', volta a "a levar" na Agenda única do contrato)'); return; }
      var pz = LicC_prazoAtividade_(x.dia), res = Atividades_apiEditar(eu.sessao, { id: Lic_s_(v.REF_ID), prazo: pz.dia + 'T09:00', titulo: Lic_texto_(x.nome, 200) });
      if (!res || !res.ok) { out.erros.push(x.nome + ': ' + Lic_s_(res && res.message)); return; }
      out.replanejadas.push(x.nome + ' para ' + LicC_br_(pz.dia));
      novos.push(['ATIVIDADES', 'REPLANEJADA', x.chave, { id: v.REF_ID, codigo: x.dia, texto: 'Atividade replanejada em Minhas atividades: ' + x.nome + ' (prazo ' + LicC_br_(pz.dia) + '): ' + motivo }]);
    });
    (ag.saidos || []).forEach(function (x) { var v = LicC_vinculoAtual_(lista, 'ATIVIDADES', x.chave); if (v && /^(ATIVIDADE|REPLANEJADA)$/.test(Lic_up_(v.ACAO))) cancelar(v, 'ATIVIDADES', x.nome); });
    if (encerrado) Object.keys(LICC_AREAS).forEach(function (area) { var v = LicC_vinculoAtual_(lista, 'EXECUCAO', area); if (v && Lic_up_(v.ACAO) === 'PLANEJAMENTO') cancelar(v, 'EXECUCAO', 'planejamento de ' + LICC_AREAS[area].nome); });
    if (novos.length) Lic_comTrava_(function () { var agora = Lic_agora_(); novos.forEach(function (n) { LicC_vincular_(eu, r, l, n[0], n[1], n[2], n[3], motivo, agora); }); });
  } catch (e) { out.erros.push(Lic_s_(e && e.message)); }
  return out;
}
function LicC_atividadesTexto_(x) {
  return ((x.concluidas || []).length ? ' Data nova em marco com atividade já fechada: ' + x.concluidas.join('; ') + '.' : '') + (x.replanejadas.length ? ' Minhas atividades replanejadas: ' + x.replanejadas.join('; ') + '.' : '') + (x.canceladas.length ? ' Minhas atividades canceladas: ' + x.canceladas.join('; ') + '.' : '') +
    (x.erros.length ? ' Não foi possível acompanhar em Minhas atividades (ajuste lá): ' + x.erros.join('; ') + '.' : '');
}

// --- Planejar execução: serviços por área (código do catálogo), atividade de planejamento da área com confirmação
function LicC_areaDe_(i) {
  var c = Lic_up_(i.codigo);
  if (/^CAL-/.test(c)) return 'METROLOGIA';
  if (/^QUA-/.test(c)) return 'QUALIFICACAO';
  if (/^NR13-/.test(c)) return 'NR13';
  try { if (c && typeof LicP_produtos_ === 'function') { var pr = LicP_produtos_(), p = pr && pr.cod ? pr.cod[c] : null; if (p && /PRODUTO/i.test(Lic_s_(p.TIPO || p.tipo))) return 'COMPRAS'; } } catch (e) {}
  return 'ASSISTENCIA';
}
function LicC_execucaoTela_(r, d) {
  var grupos = {}, lista = LicC_vinculosDe_(r.ID);
  (d.itens || []).forEach(function (i) { var a = LicC_areaDe_(i); (grupos[a] = grupos[a] || []).push({ item: i.item, codigo: i.codigo, nome: i.nome || i.descricao, quantidade: i.quantidade }); });
  var usuarios = (typeof Atividades_usuariosAtivos_ === 'function' ? Atividades_usuariosAtivos_() : []).filter(function (u) { return !u.dono; }).map(function (u) { return { id: u.id, nome: u.nome, perfil: u.perfil }; });
  return { disponivel: typeof Atividades_apiCriar === 'function', usuarios: usuarios, grupos: Object.keys(LICC_AREAS).filter(function (a) { return grupos[a]; }).map(function (a) {
    var x = LICC_AREAS[a], v = LicC_vinculoAtual_(lista, 'EXECUCAO', a), ac = v ? Lic_up_(v.ACAO) : '';
    return { area: a, nome: x.nome, existe: x.existe, onde: x.onde, dependencia: x.depende, itens: grupos[a], criado: ac === 'PLANEJAMENTO' ? LicC_vinculoTela_(v) : null, emAndamento: ac === 'RESERVA', cancelado: ac === 'CANCELADA' ? LicC_vinculoTela_(v) : null };
  }), aviso: 'O SGO+ não cria O.S., chamado, requisição, calibração, qualificação nem laudo a partir do contrato. "Criar o planejamento" lança uma atividade para a área planejar a execução (sem valores), com os itens, as quantidades e as entregas.' };
}
/** d = { id, area, responsavelId, prazo (aaaa-mm-dd, de amanhã em diante; padrão o início do contrato ou 2 dias úteis), obs, confirmar: true }. Uma por área. */
function LicC_execucaoCriar_(eu, d) {
  var sid = LicC_sessao_(eu), area = Lic_up_(d.area), x = LICC_AREAS[area];
  if (!x) throw new Error('Escolha a área na lista. Nada foi criado');
  if (d.confirmar !== true) throw new Error('Confirme na janela antes de criar o planejamento. Nada foi criado');
  if (typeof Atividades_apiCriar !== 'function') throw new Error('Não foi possível: Minhas atividades não está disponível neste ambiente. Nada foi criado');
  if (!Lic_s_(d.responsavelId)) throw new Error('Escolha quem planeja a execução de ' + x.nome + ' (responsável da área). Nada foi criado');
  var hoje = LicC_hoje_(), pzDig = Lic_s_(d.prazo) ? LicC_dia_(d.prazo) : '';
  if (Lic_s_(d.prazo) && !pzDig) throw new Error('Escolha o prazo do planejamento no calendário. Nada foi criado');
  if (pzDig && pzDig <= hoje) throw new Error('O prazo do planejamento (' + LicC_br_(pzDig) + ') precisa ser de amanhã em diante: a atividade não pode nascer atrasada. Escolha outra data (ou deixe vazio para o início do contrato). Nada foi criado');
  var p = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID), m = LicC_montar_(r, { semAlertas: true }), t = LicC_execucaoTela_(r, m.dados), g = t.grupos.filter(function (y) { return y.area === area; })[0];
    if (m.dados.situacao !== 'VIGENTE') throw new Error('O contrato está ' + (LICC_SITUACOES[m.dados.situacao] || m.dados.situacao).toLowerCase() + ': não há execução para planejar. Nada foi criado');
    if (!g) throw new Error('O contrato não tem item da área ' + x.nome + '. Nada foi criado');
    if (g.criado) throw new Error('O planejamento de ' + x.nome + ' já foi criado em ' + g.criado.emBr + ' por ' + g.criado.por + ' (atividade ' + g.criado.refId + '). Nada foi criado');
    if (g.emAndamento) throw new Error('O planejamento de ' + x.nome + ' está sendo lançado agora por outra pessoa. Espere um minuto e toque em "Atualizar"; nada foi criado');
    // 03/11/2026: reserva vencida com a atividade já criada (achada pela marca): refaz o vínculo em vez de lançar outra
    var rec = LicC_recuperarReserva_(LicC_vinculosDe_(r.ID), 'EXECUCAO', area, null, {});
    if (rec) {
      LicC_fecharReservaSemTrava_(eu, l, r, rec.res, 'PLANEJAMENTO', { id: Lic_s_(rec.atividade.ID), codigo: Lic_s_(rec.atividade.PRAZO).slice(0, 10), texto: 'Planejamento de ' + x.nome + ' em ' + x.moduloNome + ' (recuperado pela marca da reserva; a gravação anterior foi interrompida)' }, '');
      return { recuperada: Lic_s_(rec.atividade.ID) };
    }
    return { l: l, r: r, m: m, t: t, g: g, res: LicC_reservar_(eu, r, l, 'EXECUCAO', area, 'Planejamento em lançamento: ' + x.nome) };
  });
  if (p.recuperada) return { atividadeId: p.recuperada, recuperada: true, texto: 'O planejamento de ' + x.nome + ' já estava em Minhas atividades (atividade ' + p.recuperada + '; a gravação anterior foi interrompida antes de ligar ao contrato). O vínculo foi refeito; nada foi repetido.' };
  var l = p.l, r = p.r, m = p.m, g = p.g;
  var prazo = pzDig || (m.dados.inicio > hoje ? m.dados.inicio : Lic_diasUteisDepois_(hoje, 2).dia);
  var entregas = (m.dados.entregas || []).map(function (e) { return '- ' + e.descricao + ' até ' + LicC_br_(e.prazo); }).join('\n');
  var desc = 'Planejar a execução do contrato de licitação ' + m.dados.numeroContrato + ' (' + m.numero + ') · ' + Lic_texto_(l.ORGAO_NOME, 150) + (Lic_s_(r.CLIENTE_NOME) ? ' (cliente ' + Lic_s_(r.CLIENTE_NOME) + ')' : '') + '.\n' +
    'Vigência: ' + LicC_br_(m.dados.inicio) + ' a ' + LicC_br_(m.dados.fim) + '.\n\nItens desta área:\n' + g.itens.map(function (i) { return '- Item ' + i.item + ': ' + LicP_qtd_(i.quantidade) + ' · ' + (i.codigo ? i.codigo + ' ' : '') + Lic_texto_(i.nome, 160); }).join('\n') +
    (entregas ? '\n\nEntregas do contrato:\n' + entregas : '') + '\n\nOnde executar: ' + x.onde + '. ' + x.depende + (Lic_s_(d.obs) ? '\n\nObservação da Diretoria: ' + LicD_txt_(d.obs, 800) : '') + '\n\nAo concluir, conte o que foi planejado (O.S., cronograma, equipe).';
  desc = Lic_texto_(desc, 3990 - 60) + '\n' + LicC_marcaReserva_(p.res);
  var res;
  try {
    res = Atividades_apiCriar(sid, { titulo: Lic_texto_('Planejar execução · ' + x.nome + ' · contrato ' + m.dados.numeroContrato, 200), descricao: Lic_texto_(desc, 3990), prazo: prazo + 'T17:00', prioridade: 'Alta', responsavelId: Lic_s_(d.responsavelId),
      modulo: x.modulo, moduloNome: x.moduloNome, clienteId: Lic_s_(r.CLIENTE_ID), porQue: 'Contrato de licitação assinado: a área planeja a execução.', onde: x.onde, como: 'Conferir os itens e as entregas e montar o cronograma.', restrita: x.modulo === 'cronograma_execucao' ? '' : 'SIM' });
  } catch (e) { res = { ok: false, message: Lic_s_(e && e.message) }; }
  if (!res || !res.ok || !res.item) { var em = Lic_s_(res && res.message).replace(/[.\s]+$/, '') || 'Minhas atividades não respondeu'; LicC_desfazerReserva_(eu, p.res, em); throw new Error(em + '. Nada foi criado'); }
  var aid = Lic_s_(res.item.ID || res.item.id), resp = (p.t.usuarios.filter(function (u) { return u.id === Lic_s_(d.responsavelId); })[0] || {}).nome || '';
  try { LicC_fecharReserva_(eu, l, r, p.res, 'PLANEJAMENTO', { id: aid, codigo: prazo, texto: 'Planejamento de ' + x.nome + ' lançado em ' + x.moduloNome + ' (prazo ' + LicC_br_(prazo) + (resp ? ', ' + resp : '') + '): ' + g.itens.length + ' item(ns)' }, LicD_txt_(d.obs, 800)); }
  catch (eF) { throw new Error('O planejamento de ' + x.nome + ' foi lançado em Minhas atividades (atividade ' + aid + '), mas o vínculo com o contrato não gravou agora (' + Lic_s_(eF && eF.message).replace(/[.\s]+$/, '') + '). Não lance outro: daqui a ' + LICC_RESERVA_MIN + ' minutos toque de novo em "Criar o planejamento" e o SGO+ reconhece a atividade pela marca'); }
  return { atividadeId: aid, texto: 'Planejamento de ' + x.nome + ' lançado (' + x.onde + '), com prazo ' + LicC_br_(prazo) + '. Nenhuma O.S. foi criada.' };
}

// ------------------------------------------------------------ relatório A4 do contrato (SGO_Licitacoes_Relatorios.js)
function LicC_relatorioHtml_(l, m, o) {
  var esc = RelA4_esc_, F = typeof LicRel_fonte_ === 'function' ? LicRel_fonte_ : function (t) { return '<p class="nota"><b>Fonte:</b> ' + esc(t) + '</p>'; }, d = m.dados, corpo = '';
  corpo += RelA4_secao_('Identificação', RelA4_identificacao_([['Contrato', d.numeroContrato + ' (' + m.tipoNome + ')'], ['Registro no SGO+', m.numero + ' · versão ' + m.versao], ['Licitação', Lic_s_(l.CODIGO)], ['Processo (PNCP)', Lic_s_(l.NUMERO_CONTROLE_PNCP) || '—'],
    ['Órgão', [d.orgaoNome, d.orgaoCnpj ? 'CNPJ ' + LicC_cnpjTxt_(LicC_cnpj_(d.orgaoCnpj)) : ''].filter(Boolean).join(' · ') || '—', { largo: true }], ['Situação', m.situacaoTela.nome], ['Assinatura', LicC_br_(d.assinatura) || '—'],
    ['Vigência', LicC_br_(d.inicio) + ' a ' + LicC_br_(d.fim)], ['Valor total', LicC_moeda_(d.valorTotal)], ['Responsável', d.responsavelNome], ['Origem', m.origemNome + (d.origem && d.origem.homologadoEm ? ' (homologação ' + LicC_br_(d.origem.homologadoEm) + ')' : '')],
    ['Cliente no cadastro', m.cliente ? m.cliente.nome : 'não vinculado'], ['Comercial', m.comercial ? m.comercial.codigo : 'não registrado']]) +
    (m.cadeia.integra ? '' : RelA4_caixa_('O registro do contrato não confere com o hash gravado (' + m.cadeia.problema + ').', 'critico')) +
    F('LIC_CONTRATOS (registro ' + m.hash.slice(0, 16) + ') e LIC_CONTRATO_VERSOES versão ' + m.versao + '.' + (m.origem === 'RESULTADO' ? ' Itens e valores do resultado homologado (LIC_DISPUTAS.CONTRATO_JSON).' : ' Registro manual: ' + Lic_s_(d.origem && d.origem.fonte) + '.')));
  corpo += RelA4_secao_('Itens e valores', RelA4_tabela_([{ t: 'Item', cen: true, w: '11mm' }, { t: 'Serviço' }, { t: 'Qtd.', num: true }, { t: 'Valor unitário', num: true }, { t: 'Total', num: true }],
    d.itens.map(function (i) { return [i.item, { html: '<b>' + esc(i.codigo || '—') + '</b><span class="sub">' + esc(Lic_texto_(i.nome || i.descricao, 200)) + '</span>' }, LicP_qtd_(i.quantidade), LicC_moeda_(i.valorUnit), LicC_moeda_(i.total)]; }).concat([['', { html: '<b>Total</b>' }, '', '', LicC_moeda_(d.valorTotal)]]),
    { legenda: 'Itens do contrato (versão ' + m.versao + ')', vazio: 'Sem itens.' }) + F('Dados digitados do contrato assinado pela Diretoria' + (m.origem === 'RESULTADO' ? '; valor unitário do resultado homologado, com a fonte de cada item no registro.' : '.')));
  var cond = [['Reajuste', d.reajusteIndice ? d.reajusteIndice + ', data-base ' + LicC_br_(d.reajusteDataBase) + ' (' + d.reajusteFonte + ')' : 'não previsto'],
    ['Garantia', d.garantiaTipo ? LICC_GARANTIAS[d.garantiaTipo] + ', ' + LicC_moeda_(d.garantiaValor) + ', validade ' + LicC_br_(d.garantiaValidade) + ' (' + d.garantiaFonte + ')' : 'não exigida'],
    ['Renovação', d.renovacaoPrevista ? 'prevista; decidir até ' + LicC_br_(d.renovacaoDecidirAte || LicC_somarDias_(d.fim, -LICC_RENOVACAO_PADRAO_DIAS)) : 'não prevista'], ['Observações', d.obs || '—']];
  corpo += RelA4_secao_('Condições', RelA4_tabela_([{ t: 'Condição', w: '35mm' }, { t: 'Como está no contrato' }], cond, { legenda: 'Reajuste, garantia e renovação' }) +
    RelA4_tabela_([{ t: 'Entrega ou obrigação' }, { t: 'Prazo' }, { t: 'Valor', num: true }], (d.entregas || []).map(function (e) { return ['Entrega: ' + e.descricao, LicC_br_(e.prazo), e.valor ? LicC_moeda_(e.valor) : '—']; })
      .concat((d.obrigacoes || []).map(function (e) { return ['Obrigação: ' + e.descricao, LicC_br_(e.prazo) || 'sem prazo', '—']; })), { legenda: 'Entregas e obrigações', vazio: 'Nenhuma entrega ou obrigação registrada.', compacta: true }) + F('LIC_CONTRATO_VERSOES versão ' + m.versao + ' (DADOS_JSON).'));
  corpo += RelA4_secao_('Prazos na agenda', RelA4_tabela_([{ t: 'Prazo' }, { t: 'Quando' }, { t: 'Situação' }, { t: 'Versão', cen: true }], m.eventos.map(function (e) { return [e.nome, e.quandoTxt, e.situacaoNome, String(e.versao)]; }),
    { legenda: 'Marcos do contrato (início, entregas, reajuste, garantia, renovação e fim)', vazio: 'Nenhum prazo na agenda.', compacta: true }) + F('LIC_EVENTOS (fonte CONTRATO), com os alertas da Diretoria de Licitações (LIC_ALERTAS).'));
  var pv = m.previsao;
  corpo += RelA4_secao_('Previsão de faturamento', RelA4_tabela_([{ t: 'Mês' }, { t: 'Entregas' }, { t: 'Valor previsto', num: true }], pv.meses.map(function (x) { return [x.rotulo, x.itens.join('; ') || '—', LicC_moeda_(x.valor)]; }).concat([['Total', '', LicC_moeda_(pv.total)]]),
    { legenda: pv.baseNome, vazio: 'Sem previsão.', compacta: true }) + (pv.aviso ? RelA4_caixa_(pv.aviso, 'aviso') : '') + F(pv.dependencia));
  corpo += RelA4_secao_('Integração com os módulos', RelA4_tabela_([{ t: 'Módulo' }, { t: 'O que foi feito' }, { t: 'Quem e quando' }], m.vinculos.map(function (v) { return [v.modulo, v.texto + (v.motivo ? ' (motivo: ' + v.motivo + ')' : ''), v.por + ' · ' + v.emBr]; }),
    { legenda: 'Ações da Diretoria em outros módulos (nenhuma é automática)', vazio: 'Nenhum vínculo com outro módulo ainda.', compacta: true }) + F('LIC_CONTRATO_VINCULOS (uma linha por ação, com o hash).'));
  corpo += RelA4_secao_('Versões', RelA4_tabela_([{ t: 'Versão', cen: true, w: '14mm' }, { t: 'Tipo' }, { t: 'O que mudou' }, { t: 'Motivo e fonte' }, { t: 'Quem e quando' }, { t: 'Arquivo (SHA-256)' }],
    m.versoes.slice().reverse().map(function (v) { return [String(v.versao), v.tipoNome + (v.aditivo ? ' ' + v.aditivo : ''), Lic_texto_(v.mudou, 600), v.motivo + (v.fonte ? ' · ' + v.fonte : ''), v.por + ' · ' + v.emBr, v.arquivo ? v.arquivo.nome + ' · ' + v.arquivo.sha256.slice(0, 16) + '…' : '—']; }),
    { legenda: 'Histórico de versões (nada é apagado)', compacta: true }) + (m.cadeia.integra ? '<p>' + esc('Cadeia de versões conferida: ' + m.versoes.length + ' versão(ões), cada uma ligada à anterior pelo hash.') + '</p>' : '') + F('LIC_CONTRATO_VERSOES (hash encadeado).'));
  return RelA4_documento_({ titulo: 'Relatório do contrato', subtitulo: [d.numeroContrato, Lic_s_(l.ORGAO_NOME)].filter(Boolean).join(' · '), tituloCurto: 'Relatório de contrato', tituloArquivo: 'Relatorio de contrato', numero: o.numero, revisao: Math.max(0, (o.versao || 1) - 1),
    identificacao: m.numero, rotuloIdentificacao: 'Contrato', emitidoPor: o.por, ficha: [['Regras', LICC_REGRAS]], corpo: corpo, capa: false, sumario: false });
}
function LicC_relatorio_(eu, d) {
  if (typeof LicRel_gravar_ !== 'function') throw new Error('Não foi possível: os relatórios em A4 não estão disponíveis neste ambiente');
  try { LicRel_garantirAbas_(); } catch (e) {}
  var l = Lic_acharOp_(d.id), r = LicC_acharContrato_(l.ID), m = LicC_montar_(r, { semAlertas: true });
  var resumo = 'Contrato ' + m.dados.numeroContrato + ' versão ' + m.versao + '; ' + m.dados.itens.length + ' item(ns), total ' + LicC_moeda_(m.dados.valorTotal) + '; vigência ' + LicC_br_(m.dados.inicio) + ' a ' + LicC_br_(m.dados.fim) + '; ' + m.eventos.length + ' prazo(s); ' + m.vinculos.length + ' vínculo(s)' + (m.cadeia.integra ? '' : ' (registro alterado fora do SGO+)') + '.';
  return LicRel_gravar_(eu, 'CONTRATO', 'CTR:' + Lic_s_(r.ID), { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), PERIODO_DE: '', PERIODO_ATE: '' }, function (o) { return LicC_relatorioHtml_(l, m, o); }, m, resumo, 'Relatório do contrato ' + m.numero,
    function (reg) { Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'RELATORIO_GERADO', eu, { para: reg.NUMERO, texto: 'Relatório do contrato gerado em A4 e guardado (SHA-256 ' + reg.HTML_SHA256 + '). ' + resumo, versao: 'relatório ' + reg.VERSAO + ' · ' + LICC_REGRAS, fonte: 'Contratos', hash: reg.HASH }); });
}

// ------------------------------------------------------------ ações (Licitacoes_api 'contratos', { op })
var LICC_OPS = {
  lista: function (eu, d) { return LicC_lista_(eu, d); },
  tela: function (eu, d) { return LicC_tela_(eu, d); },
  criar: function (eu, d) { return LicC_criar_(eu, d); },
  versao: function (eu, d) { return LicC_versao_(eu, d); },
  arquivo: function (eu, d) { return LicC_arquivo_(eu, d); },
  clienteVincular: function (eu, d) { return LicC_clienteVincular_(eu, d); },
  clienteCriar: function (eu, d) { return LicC_clienteCriar_(eu, d); },
  comercial: function (eu, d) { return LicC_comercialRegistrar_(eu, d); },
  agendaUnica: function (eu, d) { return LicC_agendaUnica_(eu, d); },
  execucao: function (eu, d) { return LicC_execucaoCriar_(eu, d); },
  relatorio: function (eu, d) { return LicC_relatorio_(eu, d); }
};
/** Licitacoes_api já conferiu a sessão e a permissão (Diretoria e Administrador). */
function LicC_acao_(eu, d) {
  Lic_exigir_(eu, 'usar os contratos de licitação');
  var op = Lic_s_(d && d.op), fn = Object.prototype.hasOwnProperty.call(LICC_OPS, op) ? LICC_OPS[op] : null;
  if (!fn) throw new Error('Não foi possível: ação de contrato desconhecida (' + Lic_s_(d && d.op) + '). Atualize a página (F5) e tente de novo');
  LicC_garantirAbas_();
  try { if (typeof LicD_garantirAbas_ === 'function') LicD_garantirAbas_(); } catch (e) {}
  return fn(eu, d || {});
}
