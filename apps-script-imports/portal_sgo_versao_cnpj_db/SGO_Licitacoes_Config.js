/****************************************************
 * SGO+ LICITAÇÕES — CONFIGURAÇÃO, PERMISSÕES, ABAS E PORTAIS (etapa 1, 01/11/2026)
 *
 * Documentos de origem: docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md (requisitos e decisões do dono),
 * LICITACOES_01 (arquitetura), LICITACOES_02 (endereços e APIs validados), LICITACOES_03 (regras), LICITACOES_04 (telas).
 *
 * Divisão de trabalho:
 *   - o servidor próprio coleta o PNCP e o Compras.gov.br, deduplica, versiona e faz a triagem por regras nas tabelas
 *     lic_* (sgo_servidor/src/servicos/licitacoes); o legado lê pela global SGO_LICITACOES (operações "lic.*");
 *   - aqui ficam as abas LIC_* (o que a Diretoria vê e decide), as permissões, o cadastro dos 33 portais com a
 *     parametrização e o histórico com rastreabilidade (quem, quando, o quê, versão, fonte, hash).
 *
 * Permissão (decisão do dono, 01/11/2026): o módulo é da Diretoria. Só os perfis DIRETORIA e ADMIN (e o dono do
 * sistema) entram; os demais perfis não veem o menu e o servidor recusa toda chamada (Licitacoes_api).
 * Nada é apagado: a situação muda; parâmetros mudam com merge, versão e motivo.
 ****************************************************/

var LIC_ABAS = { PORTAIS: 'LIC_PORTAIS', OPORTUNIDADES: 'LIC_OPORTUNIDADES', HISTORICO: 'LIC_HISTORICO', CONFIG: 'LIC_CONFIG', ANALISES: 'LIC_ANALISES' };
var LIC_COLUNAS = {
  LIC_PORTAIS: ['ID', 'CODIGO', 'NOME', 'CATEGORIA', 'URL', 'URL_API', 'DOCUMENTACAO', 'TIPO', 'AUTENTICACAO', 'CREDENCIAL_REF', 'SITUACAO', 'PRIORIDADE',
    'LIGADO', 'PALAVRAS_POSITIVAS', 'PALAVRAS_NEGATIVAS', 'UFS', 'VALOR_MINIMO', 'FREQUENCIA_MIN', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME',
    'PERMITE_CONSULTA', 'PERMITE_PROPOSTA', 'PERMITE_LANCES', 'COBERTO_PNCP', 'CAMINHO_ALTERNATIVO', 'ULTIMO_TESTE_EM', 'ULTIMO_TESTE_RESULTADO',
    'ULTIMA_SINCRONIA_EM', 'ULTIMO_SUCESSO_EM', 'OBS', 'VERSAO', 'MOTIVO', 'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  LIC_OPORTUNIDADES: ['ID', 'CODIGO', 'CHAVE_FONTE', 'NUMERO_CONTROLE_PNCP', 'ID_COMPRAS_GOV', 'PORTAL_ORIGEM', 'PORTAL_SESSAO', 'PORTAL_SESSAO_NOME',
    'ORGAO_CNPJ', 'ORGAO_NOME', 'UNIDADE_NOME', 'UF', 'MUNICIPIO', 'MODALIDADE', 'MODO_DISPUTA', 'AMPARO_LEGAL', 'LEI', 'SRP', 'OBJETO', 'VALOR_ESTIMADO',
    'ABERTURA_PROPOSTAS', 'ENCERRAMENTO_PROPOSTAS', 'ENCERRAMENTO_ISO', 'FUSO', 'FUSO_PRESUMIDO', 'FUSO_ALERTA', 'SITUACAO_FONTE', 'LINK_ORIGEM', 'LINK_PNCP',
    'TRIAGEM', 'TRIAGEM_MOTIVO', 'TRIAGEM_TRECHO', 'TRIAGEM_TERMO', 'TRIAGEM_FONTE_TRECHO', 'TRIAGEM_REGRA', 'TRIAGEM_VERSAO', 'SELOS_JSON', 'PENDENCIAS_JSON', 'PRIORIDADE_UF',
    'SITUACAO', 'SITUACAO_DESDE', 'DESCARTE_ORIGEM', 'DESCARTE_MOTIVO', 'DESCARTE_POR_ID', 'DESCARTE_POR_NOME', 'DESCARTE_EM', 'ANALISE_OBS',
    'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'VERSAO_FONTE', 'VERSAO_HASH', 'BRUTO_HASH', 'RETIFICADA_EM', 'ATUALIZACAO_FONTE', 'PRIMEIRA_COLETA_EM',
    'ULTIMA_SINCRONIA_EM', 'EXCLUIDO_EM', 'CRIADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM',
    // etapa 2 (02/11/2026): nota da última análise concluída e os arquivos do edital (SGO_Licitacoes_Analise.js)
    'NOTA', 'NOTA_CLASSE', 'NOTA_TRAVA', 'ANALISE_ID', 'ANALISE_VERSAO', 'ANALISE_EM', 'ANALISE_BASE_HASH', 'ANALISE_SITUACAO', 'ANALISE_ERRO', 'ARQUIVOS_BASE_HASH', 'ARQUIVOS_QTD', 'ARQUIVOS_EM',
    // regra de guarda (02/11/2026): a data de publicação na fonte conta os 2 anos da candidata intocada (SGO_Licitacoes_Guarda.js)
    'PUBLICACAO_EM'],
  LIC_HISTORICO: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'CODIGO', 'TIPO', 'DE', 'PARA', 'TEXTO', 'VERSAO', 'FONTE', 'HASH', 'USUARIO_ID', 'USUARIO_NOME', 'DATA'],
  LIC_CONFIG: ['ID', 'CHAVE', 'VALOR_JSON', 'VERSAO', 'MOTIVO', 'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  // etapa 2 (02/11/2026): UMA LINHA POR ANÁLISE (versão); nada é sobrescrito. CONCLUIDA, RECUSADA (verificador) ou ERRO (IA fora).
  LIC_ANALISES: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'VERSAO', 'SITUACAO', 'NOTA', 'SOMA', 'CLASSE', 'TRAVADA', 'RESUMO', 'CRITERIOS_JSON', 'ITENS_JSON', 'EXIGENCIAS_JSON', 'RISCOS_JSON',
    'TRAVAS_JSON', 'AFIRMACOES_JSON', 'ARQUIVOS_JSON', 'ARQUIVOS_BASE', 'BASE_HASH', 'FONTE_VERSAO', 'FONTE_HASH', 'PESOS_JSON', 'REGRAS', 'MODELO', 'TENTATIVAS', 'RECUSAS_JSON',
    'MOTIVO', 'ORIGEM_PEDIDO', 'PEDIDO_POR_ID', 'PEDIDO_POR_NOME', 'HASH', 'CRIADO_EM']
};
var LIC_COLUNAS_TEXTO = { LIC_OPORTUNIDADES: ['ORGAO_CNPJ', 'NUMERO_CONTROLE_PNCP', 'ID_COMPRAS_GOV', 'ABERTURA_PROPOSTAS', 'ENCERRAMENTO_PROPOSTAS', 'ATUALIZACAO_FONTE'] };

/** Situações no fluxo (o Kanban da etapa seguinte usa as mesmas; nesta etapa a tela mexe em RADAR, ANALISE e DESCARTADA). */
var LIC_SITUACOES = ['RADAR', 'ANALISE', 'DECISAO', 'PROPOSTA', 'DISPUTA', 'RESULTADO', 'CONTRATO', 'DESCARTADA'];
var LIC_SITUACAO_NOMES = { RADAR: 'No radar', ANALISE: 'Em análise', DECISAO: 'Decisão', PROPOSTA: 'Proposta', DISPUTA: 'Disputa', RESULTADO: 'Resultado', CONTRATO: 'Contrato', DESCARTADA: 'Descartada' };
/** Estados de um portal (missão, gerenciador de conectores). */
var LIC_SITUACOES_PORTAL = ['Não configurado', 'Aguardando documentação', 'Aguardando credenciais', 'Em desenvolvimento', 'Em teste', 'Operacional', 'Operacional com restrições', 'Falha', 'Suspenso'];
var LIC_TIPOS_PORTAL = { A: 'API pública', B: 'API autenticada', C: 'API comercial de parceiro', D: 'Consulta automatizada permitida', E: 'Operação manual assistida' };
var LIC_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
var LIC_FREQUENCIAS = [30, 60, 120, 240, 720, 1440];
var LIC_MSG_SEM_ACESSO = 'o módulo Licitações é da Diretoria e do Administrador (decisão do dono, 01/11/2026). Se você precisa acompanhar uma licitação, peça à Diretoria';

/**
 * Os 33 portais da missão com os endereços VALIDADOS em 01/11/2026 (doc 02, seção 2), o tipo de integração e a
 * situação inicial. PNCP e Compras.gov.br começam "Em teste": viram "Operacional" só depois de um teste real de
 * conexão bem-sucedido pela tela. Demais: conforme o doc 02 (tipo B aguardando a chave; tipo C aguardando documentação
 * ou contrato; tipo E sem API: publicação pelo PNCP, sessão e lances em operação manual assistida).
 * [codigo, nome, categoria, url, tipo, situacao, prioridade, urlApi, documentacao, autenticacao, cobertoPncp, caminhoAlternativo, obs]
 */
var LIC_PORTAIS_SEMENTE = [
  ['PUB-001', 'PNCP', 'PUB', 'https://pncp.gov.br', 'A', 'Em teste', 'P1', 'https://pncp.gov.br/api/consulta', 'https://pncp.gov.br/api/consulta/swagger-ui/index.html', 'Nenhuma para consulta (GET público)', 'É a própria fonte', '', 'Consulta provada em 01/11/2026 (publicação, propostas em aberto, detalhe). A API de itens e arquivos respondeu HTTP 503 no domingo; os itens vêm do Compras.gov.br. Limite medido: no máximo 1 chamada a cada 3 s.'],
  ['PUB-002', 'Compras.gov.br (dados abertos)', 'PUB', 'https://www.gov.br/compras', 'A', 'Em teste', 'P1', 'https://dadosabertos.compras.gov.br', 'https://dadosabertos.compras.gov.br/swagger-ui/index.html', 'Nenhuma para consulta; a sessão de disputa exige o login gov.br do representante', 'Sim', 'Sessão de disputa: operação manual no Compras.gov.br', 'Espelho do PNCP com atraso (30/10/2026: 47 pregões contra 316 no PNCP): serve de contingência e para os itens, nunca como radar principal.'],
  ['PUB-003', 'Portal de Compras Públicas', 'PUB', 'https://www.portaldecompraspublicas.com.br', 'B', 'Aguardando credenciais', 'P2', 'https://apipcp.portaldecompraspublicas.com.br', 'https://apipcp.portaldecompraspublicas.com.br/publico/apidoc/', 'Chave publicKey pedida por formulário (resposta em até 7 dias úteis); sem a chave a API responde HTTP 400', 'Sim (publicação); chat e disputa não', 'Publicação pelo PNCP; avisos por e-mail da plataforma até a chave chegar', 'Única plataforma de disputa encontrada com API que traz o chat do pregoeiro (obterChat).'],
  ['PUB-004', 'BLL Compras', 'PUB', 'https://bllcompras.com', 'E', 'Não configurado', 'P4', '', '', 'Login com reCAPTCHA', 'Sim (publicação); sessão não', 'Publicação pelo PNCP; e-mail de aviso da plataforma; operação manual assistida', 'API para fornecedor não encontrada.'],
  ['PUB-005', 'Licitanet', 'PUB', 'https://licitanet.com.br', 'E', 'Não configurado', 'P4', '', '', 'Login', 'Sim (publicação)', 'Publicação pelo PNCP; e-mail de aviso da plataforma; operação manual assistida', 'O site recusa acesso automatizado (HTTP 403).'],
  ['PUB-006', 'Licitações-e (Banco do Brasil)', 'PUB', 'https://www.licitacoes-e.com.br', 'E', 'Não configurado', 'P4', '', '', 'Login; desafio de segurança no endereço novo', 'Sim (publicação)', 'Publicação pelo PNCP; e-mail de aviso da plataforma; operação manual assistida', 'Endereço novo licitacoes-e2.bb.com.br protegido por desafio de segurança.'],
  ['PUB-007', 'BNC Compras', 'PUB', 'https://bnccompras.com', 'E', 'Não configurado', 'P4', '', '', 'Login com reCAPTCHA', 'Sim (publicação)', 'Publicação pelo PNCP; e-mail de aviso da plataforma; operação manual assistida', 'API para fornecedor não encontrada.'],
  ['PUB-008', 'BBMNET', 'PUB', 'https://bbmnet.com.br', 'E', 'Aguardando documentação', 'P3', '', '', 'Login', 'Sim (publicação)', 'Publicação pelo PNCP; perguntar à BBM se a API de ERP atende fornecedor', 'Endereço corrigido: o da lista original (www.bbmnetlicitacoes.com.br) respondia HTTP 404.'],
  ['PUB-009', 'Licitar Digital', 'PUB', 'https://www.licitardigital.com.br', 'E', 'Não configurado', 'P4', '', '', 'Login', 'Sim (publicação)', 'Publicação pelo PNCP; e-mail de aviso da plataforma; operação manual assistida', 'O site recusa acesso automatizado (HTTP 403).'],
  ['PUB-010', 'Compras BR', 'PUB', 'https://comprasbr.com.br', 'E', 'Não configurado', 'P4', '', '', 'Login', 'Sim (publicação)', 'Publicação pelo PNCP; e-mail de aviso da plataforma; operação manual assistida', 'Endereço validado (área do fornecedor em /fornecedor/).'],
  ['EST-001', 'Goiás (ComprasNet.GO / SISLOG)', 'EST', 'https://www.comprasnet.go.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro de fornecedor estadual', 'Sim', 'Publicação pelo PNCP; cadastro no ComprasNet.GO; e-mail de aviso', 'Editais de 2026 também indicam sislog.go.gov.br.'],
  ['EST-002', 'Rio de Janeiro (SIGA)', 'EST', 'https://www.compras.rj.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro estadual', 'Sim', 'Publicação pelo PNCP; e-mail de aviso; operação manual assistida', ''],
  ['EST-003', 'Minas Gerais (Portal de Compras MG)', 'EST', 'https://compras.mg.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro (CAGEF)', 'Sim', 'Publicação pelo PNCP; e-mail de aviso; operação manual assistida', ''],
  ['EST-004', 'São Paulo (BEC/SP e sucessores)', 'EST', 'https://www.bec.sp.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro CAUFESP', 'Sim', 'Publicação pelo PNCP; confirmar a plataforma vigente por órgão', 'Há órgãos paulistas usando o Compras.gov.br.'],
  ['EST-005', 'Rio Grande do Sul (CELIC)', 'EST', 'https://www.compras.rs.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro CELIC', 'Sim', 'Publicação pelo PNCP; e-mail de aviso; operação manual assistida', 'CELIC em https://www.celic.rs.gov.br.'],
  ['EST-006', 'Santa Catarina (e-LIC)', 'EST', 'https://e-lic.sc.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro estadual', 'Sim', 'Publicação pelo PNCP; confirmar a plataforma vigente por órgão', ''],
  ['EST-007', 'Mato Grosso (SIAG)', 'EST', 'https://portalaquisicoes.seplag.mt.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro estadual', 'Sim', 'Publicação pelo PNCP; e-mail de aviso; operação manual assistida', 'Fuso de Cuiabá: confirmar no edital se o horário é local.'],
  ['EST-008', 'Amazonas (e-Compras AM)', 'EST', 'https://www.e-compras.am.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro estadual', 'Sim', 'Publicação pelo PNCP; e-mail de aviso; operação manual assistida', 'Fuso de Manaus (UTC−4): confirmar no edital.'],
  ['EST-009', 'Pernambuco (PE-Integrado)', 'EST', 'https://www.peintegrado.pe.gov.br', 'E', 'Não configurado', 'P4', '', '', 'Cadastro estadual', 'Sim', 'Publicação pelo PNCP; e-mail de aviso; operação manual assistida', ''],
  ['SAU-001', 'Bionexo', 'SAU', 'https://bionexo.com', 'C', 'Aguardando documentação', 'P3', '', '', 'Credencial de integração fornecida pela plataforma', 'Não (compra privada)', 'Sem integração contratada, a cotação não chega ao SGO+: acompanhar no portal', 'Integração de ERP para responder cotações, com taxa. Depende de decisão da Diretoria.'],
  ['SAU-002', 'Apoio Cotações', 'SAU', 'https://www.apoiocotacoes.com.br', 'E', 'Não configurado', 'P3', '', '', 'Login', 'Não (compra privada)', 'Operação manual assistida no portal', 'Perguntar à plataforma se há integração para fornecedor.'],
  ['SAU-003', 'Huma', 'SAU', 'https://huma.com.br', 'E', 'Não configurado', 'P3', '', '', '—', 'Não (compra privada)', 'Operação manual assistida no portal', 'Nome ambíguo nas buscas: confirmar a plataforma com a Diretoria.'],
  ['SAU-004', 'GTPLAN', 'SAU', 'https://gtplan.net', 'C', 'Aguardando documentação', 'P3', '', '', '—', 'Não (compra privada)', 'Operação manual assistida no portal', 'Sem documentação pública de API.'],
  ['SAU-005', 'UNIDAS Saúde', 'SAU', 'https://www.portalunidas.com.br', 'E', 'Não configurado', 'P4', '', '', 'Login', 'Não (compra privada)', 'Operação manual assistida no portal', 'Pré-cadastro de fornecedor para autogestões associadas.'],
  ['SAU-006', 'SmartCompras', 'SAU', 'https://smartcompras.com.br', 'C', 'Aguardando documentação', 'P3', '', 'https://smartcompras.com.br/integracao', 'A combinar com a plataforma', 'Não (compra privada)', 'Operação manual assistida no portal', 'Página oficial de integração com ERP; pedir documentação e custo.'],
  ['SAU-007', 'GC Cotações', 'SAU', 'https://www.gccotacoes.com.br', 'E', 'Não configurado', 'P4', '', '', 'Login', 'Não (compra privada)', 'Operação manual assistida no portal', 'Custo zero para fornecedor, segundo o site.'],
  ['SAU-008', 'Gênesis Next', 'SAU', 'https://www.genesisnext.com.br', 'E', 'Não configurado', 'P4', '', '', '—', 'Não (compra privada)', 'Operação manual assistida no portal', ''],
  ['SAU-009', 'Compra Ágil', 'SAU', 'https://www.compragil.com.br', 'E', 'Não configurado', 'P4', '', '', '—', 'Não (compra privada)', 'Operação manual assistida no portal', ''],
  ['IND-001', 'Petronect', 'IND', 'https://www.petronect.com.br', 'C', 'Aguardando documentação', 'P3', '', '', 'Cadastro ativo e adesão à taxa de acesso', 'Não (Lei 13.303/2016, regulamento próprio)', 'Operação manual assistida no portal', 'API Store de oportunidades da Petrobras, com taxa de acesso.'],
  ['IND-002', 'Mercado Eletrônico', 'IND', 'https://www.mercadoeletronico.com', 'C', 'Aguardando documentação', 'P3', '', 'https://developer.me.com.br/', 'Chaves pelo portal de parceiros', 'Não (compra privada)', 'Operação manual assistida no portal', 'Confirmar se fornecedor recebe credencial.'],
  ['IND-003', 'SAP Ariba', 'IND', 'https://www.ariba.com', 'C', 'Não configurado', 'P3', '', '', 'Conta de fornecedor na rede da plataforma', 'Não (compra privada)', 'Conta gratuita de fornecedor recebe as publicações por e-mail', 'As APIs de compras são do lado do comprador.'],
  ['IND-004', 'Nimbi', 'IND', 'https://nimbi.com.br', 'C', 'Não configurado', 'P4', '', '', 'Credencial do comprador', 'Não (compra privada)', 'Cadastro de fornecedor nos portais dos compradores', 'API do lado comprador.'],
  ['IND-005', 'Senior Sistemas', 'IND', 'https://www.senior.com.br', 'E', 'Não configurado', 'P4', '', '', '—', 'Não (compra privada)', 'Cadastro de fornecedor nos clientes que usam o sistema', '']
];
/** Termos que a taxonomia do servidor já usa (só para mostrar na tela; quem decide é o servidor). */
var LIC_TERMOS_PADRAO = {
  positivos: 'calibração, aferição, metrologia, qualificação térmica e de equipamento, validação de processo de esterilização, mapeamento térmico, termodesinfectora, lavadora ultrassônica, autoclave, esterilização, seladora, NR-13, vaso de pressão, caldeira, válvula de segurança, engenharia clínica, registrador de temperatura, osmose reversa, termo-higrômetro, esfigmomanômetro, manutenção de equipamentos de saúde ou laboratório',
  negativos: 'castração e esterilização de animais, reagentes e soluções de calibração, borracharia e calibragem de pneus, embalagem para esterilização, terceirização da esterilização de materiais, vidraria calibrada, equipamento de pavimento, audiologia, nobreak, locação de equipamento, insumos para CME',
  travas: 'exige acreditação RBC (salvo quando opcional ou quando pede só certificado rastreável à RBC), dedicação exclusiva de mão de obra, software de gestão exigido, suspensa na fonte, exclusivo ME/EPP com a matriz fora do porte',
  produto: 'dois sinais juntos: objeto de aquisição ou fornecimento, itens de material, especificação construtiva, garantia de fábrica ou prazo de entrega, adesão a ata, lista de insumos, objeto sem serviço'
};

// ------------------------------------------------------------ utilitários
function Lic_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Lic_up_(v) { return Lic_s_(v).toUpperCase(); }
function Lic_agora_() { return new Date().toISOString(); }
function Lic_texto_(v, max) { var t = Lic_s_(v); return max && t.length > max ? t.slice(0, max) : t; }
function Lic_json_(v, padrao) { if (v && typeof v === 'object') return v; try { var x = JSON.parse(Lic_s_(v) || 'null'); return x === null ? padrao : x; } catch (e) { return padrao; } }
function Lic_num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var t = Lic_s_(v).replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  var n = Number(t);
  return isFinite(n) ? n : null;
}
function Lic_hash_(texto) {
  try {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8);
    return b.map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
  } catch (e) { return ''; }
}
function Lic_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}
/** Endereço externo (vem do PNCP, dado do órgão): só http/https, sem espaço nem aspas; o resto vira '' (nunca vai a um href). */
function Lic_url_(v) { var t = Lic_s_(v); return /^https?:\/\/[^\s"'<>`]+$/i.test(t) ? t : ''; }
function Lic_lista_(v) {
  return (Array.isArray(v) ? v : Lic_s_(v).split(/[,;\n]+/)).map(function (x) { return Lic_s_(x); }).filter(Boolean);
}

/** Abas do módulo (no banco principal, como o Comercial). Colunas novas entram por merge; nada é apagado. */
function Lic_garantirAbas_() {
  var cache = null;
  // V2 (02/11/2026): aba LIC_ANALISES e as colunas da nota em LIC_OPORTUNIDADES (entram por merge; nada é apagado)
  try { cache = CacheService.getScriptCache(); if (cache.get('LIC_ABAS_OK_V2')) return; } catch (e) {}
  Object.keys(LIC_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LIC_COLUNAS[aba]);
    LIC_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LIC_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  Lic_garantirPortais_();
  try { if (cache) cache.put('LIC_ABAS_OK_V2', '1', 21600); } catch (e) {}
}

/** Os 33 portais: insere só os códigos que faltam (portal já cadastrado nunca é sobrescrito). */
function Lic_garantirPortais_() {
  var existentes = {};
  Lic_ler_(LIC_ABAS.PORTAIS).forEach(function (p) { existentes[Lic_up_(p.CODIGO)] = true; });
  var agora = Lic_agora_(), novos = [];
  LIC_PORTAIS_SEMENTE.forEach(function (s) {
    if (existentes[s[0]]) return;
    var api = s[4] === 'A';
    novos.push({ CODIGO: s[0], NOME: s[1], CATEGORIA: s[2], URL: s[3], TIPO: s[4], SITUACAO: s[5], PRIORIDADE: s[6], URL_API: s[7], DOCUMENTACAO: s[8], AUTENTICACAO: s[9],
      COBERTO_PNCP: s[10], CAMINHO_ALTERNATIVO: s[11], OBS: s[12], CREDENCIAL_REF: s[0] === 'PUB-003' ? 'LIC_PCP_PUBLICKEY' : '',
      LIGADO: api ? 'SIM' : 'NAO', PALAVRAS_POSITIVAS: '', PALAVRAS_NEGATIVAS: '', UFS: '', VALOR_MINIMO: 0, FREQUENCIA_MIN: api ? 120 : '',
      PERMITE_CONSULTA: api || s[4] === 'B' ? 'SIM' : 'NAO', PERMITE_PROPOSTA: 'NAO', PERMITE_LANCES: 'NAO',
      VERSAO: 1, MOTIVO: 'Cadastro inicial (missão da Diretoria e endereços validados em 01/11/2026)', ATUALIZADO_POR_NOME: 'Sistema', ATUALIZADO_EM: agora, CRIADO_EM: agora });
  });
  if (novos.length) {
    if (typeof SGO_DATA.insertMany === 'function') SGO_DATA.insertMany(LIC_ABAS.PORTAIS, novos);
    else novos.forEach(function (n) { SGO_DATA.insert(LIC_ABAS.PORTAIS, n); });
  }
  return novos.length;
}

// ------------------------------------------------------------ permissões
function Lic_ehDono_(login) { try { return typeof Com_ehDono_ === 'function' && !!Com_ehDono_(login); } catch (e) { return false; } }

/** Nível: GESTAO (Diretoria, Administrador e o dono) ou NENHUM. Sem nível intermediário nesta etapa. */
function Lic_nivelDe_(u) {
  var perfil = Lic_up_(u && u.perfil);
  var gestao = perfil === 'ADMIN' || perfil === 'DIRETORIA' || (perfil !== 'CLIENTE' && perfil !== 'REPRESENTADA' && Lic_ehDono_(u && u.login));
  return { nivel: gestao ? 'GESTAO' : 'NENHUM', gestao: gestao };
}

/** Quem está chamando (sessão), com o nível no módulo. Não lança por falta de acesso: quem chama decide. */
function Lic_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var eu = { id: Lic_s_(s.userId), nome: Lic_s_(s.nome) || Lic_s_(s.usuario), login: Lic_s_(s.usuario), perfil: Lic_up_(s.perfil) };
  var n = Lic_nivelDe_(eu);
  eu.nivel = n.nivel; eu.gestao = n.gestao;
  return eu;
}
function Lic_exigir_(eu, acao) {
  if (eu && eu.gestao) return eu;
  throw new Error('Não foi possível ' + acao + ': ' + LIC_MSG_SEM_ACESSO);
}

/** Diretoria e Administrador ativos (responsáveis possíveis por portal e por oportunidade). */
function Lic_responsaveis_() {
  return Lic_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    var p = Lic_up_(u.PERFIL), st = Lic_up_(u.STATUS);
    return (p === 'DIRETORIA' || p === 'ADMIN') && (!st || st === 'ATIVO');
  }).map(function (u) { return { id: Lic_s_(u.ID), nome: Lic_s_(u.NOME) || Lic_s_(u.USUARIO), perfil: Lic_up_(u.PERFIL) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

// ------------------------------------------------------------ histórico (rastreabilidade)
/**
 * Uma linha por fato: quem, quando, o quê (tipo, de, para, texto), versão, fonte e hash. O hash é o da versão da fonte
 * quando o fato vem do coletor; nos atos de pessoas é o SHA-256 do próprio registro (prova de que não foi alterado).
 */
function Lic_historico_(entidade, id, codigo, tipo, eu, extra) {
  var e = extra || {}, data = Lic_agora_();
  var reg = { ENTIDADE: entidade, ENTIDADE_ID: Lic_s_(id), CODIGO: Lic_s_(codigo), TIPO: tipo, DE: Lic_texto_(e.de, 500), PARA: Lic_texto_(e.para, 500), TEXTO: Lic_texto_(e.texto, 4000),
    VERSAO: Lic_s_(e.versao), FONTE: Lic_texto_(e.fonte, 300), USUARIO_ID: Lic_s_(eu && eu.id), USUARIO_NOME: Lic_s_(eu && eu.nome) || 'Sistema', DATA: data };
  reg.HASH = Lic_s_(e.hash) || Lic_hash_([reg.ENTIDADE, reg.ENTIDADE_ID, reg.TIPO, reg.DE, reg.PARA, reg.TEXTO, reg.VERSAO, reg.FONTE, reg.USUARIO_ID, reg.DATA].join('|'));
  try { SGO_DATA.insert(LIC_ABAS.HISTORICO, reg); } catch (x) { console.error('Licitações, histórico: ' + ((x && x.message) || x)); }
  return reg;
}

// ------------------------------------------------------------ configuração do radar e do coletor
var LIC_CFG_PADRAO = { coletorLigado: false, porte: 'EPP' };
function Lic_cfgLinha_() { return Lic_ler_(LIC_ABAS.CONFIG).filter(function (c) { return Lic_s_(c.CHAVE) === 'RADAR'; })[0] || null; }
function Lic_cfg_() {
  var l = Lic_cfgLinha_(), v = l ? Lic_json_(l.VALOR_JSON, {}) : {};
  var c = Object.assign({}, LIC_CFG_PADRAO, v);
  // sem versão salva pela tela, vale a propriedade (o dono pode ligar o coletor direto, por script)
  if (!l) { try { c.coletorLigado = Lic_s_(PropertiesService.getScriptProperties().getProperty('LIC_COLETOR_LIGADO')) === '1'; } catch (e) {} }
  c.versao = l ? Number(l.VERSAO) || 1 : 0;
  c.motivo = l ? Lic_s_(l.MOTIVO) : '';
  c.atualizadoPor = l ? Lic_s_(l.ATUALIZADO_POR_NOME) : '';
  c.atualizadoEm = l ? Lic_s_(l.ATUALIZADO_EM) : '';
  return c;
}

/**
 * Entrega ao servidor o que ele usa (propriedades do script): LIC_COLETOR_LIGADO ("1"/"0") e LIC_CFG_COLETOR (porte e os
 * parâmetros do PNCP e do Compras.gov.br). Chamado depois de toda mudança de parâmetro. Nada de segredo aqui: a
 * credencial é só o NOME da chave, e o PNCP e o Compras.gov.br não precisam de credencial.
 */
function Lic_publicarCfgColetor_() {
  var cfg = Lic_cfg_(), portais = {};
  Lic_ler_(LIC_ABAS.PORTAIS).forEach(function (p) {
    var cod = Lic_up_(p.CODIGO);
    if (cod !== 'PUB-001' && cod !== 'PUB-002') return;
    portais[cod] = { ligado: Lic_up_(p.LIGADO) === 'SIM', frequenciaMin: Number(p.FREQUENCIA_MIN) || 120, positivas: Lic_lista_(p.PALAVRAS_POSITIVAS),
      negativas: Lic_lista_(p.PALAVRAS_NEGATIVAS), ufs: Lic_lista_(p.UFS).map(Lic_up_), valorMinimo: Lic_num_(p.VALOR_MINIMO) || 0 };
  });
  var valor = { versao: cfg.versao, porte: cfg.porte, portais: portais };
  var props = PropertiesService.getScriptProperties();
  props.setProperty('LIC_CFG_COLETOR', JSON.stringify(valor));
  if (cfg.versao) props.setProperty('LIC_COLETOR_LIGADO', cfg.coletorLigado ? '1' : '0');   // sem versão salva pela tela, a chave fica como está
  return valor;
}
