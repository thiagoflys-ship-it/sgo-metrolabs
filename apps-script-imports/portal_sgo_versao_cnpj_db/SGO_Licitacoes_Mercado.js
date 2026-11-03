/****************************************************
 * SGO+ LICITAÇÕES — CADASTRO DE FORNECEDORES E CONCORRENTES E INTELIGÊNCIA DE MERCADO (03/11/2026)
 *
 * Última etapa do módulo (docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md: concorrentes, preços praticados, quem ganha em cada órgão).
 * Manual: docs/MANUAL_MODULO_LICITACOES.md, seção "Fornecedores, concorrentes e inteligência de mercado".
 *
 * DE ONDE VEM O DADO (três fontes; cada número da tela diz a fonte e o link):
 *   1. COLETOR: o servidor lê no PNCP os RESULTADOS (vencedor e preço homologado de cada item) das contratações do ramo encerradas
 *      (sgo_servidor/src/servicos/licitacoes/mercado.ts, no ritmo do coletor). LicM_sincronizar_ espelha em LIC_MERCADO_RESULTADOS
 *      (uma linha por item e resultado; versão nova da fonte atualiza a linha com o histórico de → para) e alimenta LIC_FORNECEDORES.
 *      O PNCP publica só o VENCEDOR de cada item: quem participou e perdeu não aparece por esta fonte.
 *   2. DISPUTA: o que a Diretoria registrou nas disputas da Metrolabs (SGO_Licitacoes_Disputa.js): o resultado de cada item (vencedor,
 *      CNPJ e valor final; o ganho é a própria Metrolabs) e os concorrentes digitados nos lances (só o nome: entram como participação).
 *      Lido na hora, sem cópia; o vencedor com CNPJ válido entra no cadastro.
 *   3. MANUAL: a Diretoria cadastra o fornecedor e registra um resultado ou participação que leu em ata (com a fonte, obrigatória).
 *
 * CADASTRO (LIC_FORNECEDORES, uma linha por CNPJ; nunca duplica): CNPJ validado e normalizado (14 posições, numérico ou alfanumérico),
 *   razão social, nome fantasia, UF, município e porte (quando a fonte traz). MESCLA: campo vazio é preenchido; campo igual não muda;
 *   valor DIFERENTE vindo de fonte NÃO sobrescreve: fica guardado como "variante" (com a origem e a data) e no histórico, e só a
 *   Diretoria troca, pela tela, com o motivo (de → para no LIC_HISTORICO). Nada é apagado. Nome de concorrente digitado na disputa sem
 *   CNPJ é ligado ao cadastro só por ação da Diretoria ("Ligar ao CNPJ", com o motivo).
 *
 * INTELIGÊNCIA (calculada pelo código, sem IA; nada é decidido aqui): por concorrente (participações conhecidas, vitórias, órgãos, UFs,
 *   desconto sobre o estimado, faixa de preço por tipo de serviço), por órgão (quem ganha e por quanto) e preço de referência por
 *   serviço e equipamento (mediana, quartis, n, período e as fontes com link). Amostra com menos de LICM_AMOSTRA_MIN preços diz
 *   "amostra pequena"; sem preço diz "sem dados" (nunca inventa número). Grupo = tipo de serviço + equipamento + unidade, pelo texto do
 *   item (regras fixas abaixo, nomes genéricos de equipamento). Período padrão: últimos 24 meses.
 * FICHA (aba Mercado, só a Diretoria): quem costuma ganhar NESTE órgão e NESTE tipo de objeto e o preço praticado comparado com a
 *   simulação salva (aba Preço). Pareceres (SGO_Licitacoes_Pareceres.js, LicPar_tela_): a pessoa do pedido vê o mercado conforme a área
 *   (Técnica e Comercial sem preço nenhum; Licitações e Financeira com o preço praticado e o da proposta).
 * Somente consulta: nada aqui cria registro em outro módulo. Ações: Licitacoes_api(sessionId, 'mercado', { op, ... }), só Diretoria e
 * Administrador (o servidor confere em toda chamada). Nenhuma função devolve Date cru.
 ****************************************************/

var LICM_REGRAS = 'LIC-MERCADO-2026-11-03.1';
var LICM_ABAS = { FORNECEDORES: 'LIC_FORNECEDORES', RESULTADOS: 'LIC_MERCADO_RESULTADOS' };
var LICM_COLUNAS = {
  // UMA LINHA POR CNPJ; campos mudam só por mescla (vazio preenchido) ou pela Diretoria com motivo; variantes e histórico guardam o resto
  LIC_FORNECEDORES: ['ID', 'CNPJ', 'RAZAO_SOCIAL', 'NOME_FANTASIA', 'UF', 'MUNICIPIO', 'PORTE', 'ORIGEM', 'ORIGENS_JSON', 'CAMPOS_JSON', 'VARIANTES_JSON', 'APELIDOS_JSON', 'OBS',
    'VERSAO', 'HASH', 'CRIADO_POR_NOME', 'CRIADO_EM', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM'],
  // UMA LINHA POR RESULTADO (item × sequencial da fonte, ou registro manual); a versão nova da fonte atualiza a linha (VERSAO, histórico)
  LIC_MERCADO_RESULTADOS: ['ID', 'CHAVE_RESULTADO', 'ORIGEM', 'PAPEL', 'CHAVE_FONTE', 'NUMERO_CONTROLE_PNCP', 'OPORTUNIDADE_ID', 'ORGAO_CNPJ', 'ORGAO_NOME', 'UF', 'MUNICIPIO', 'MODALIDADE',
    'OBJETO', 'ENCERRAMENTO_ISO', 'ITEM', 'ITEM_DESCRICAO', 'ITEM_TIPO', 'ITEM_QUANTIDADE', 'ITEM_UNIDADE', 'VALOR_UNIT_ESTIMADO', 'FORNECEDOR_CNPJ', 'FORNECEDOR_CNPJ_INFORMADO',
    'FORNECEDOR_NOME', 'FORNECEDOR_PORTE', 'FORNECEDOR_TIPO', 'ORDEM_CLASSIFICACAO', 'VALOR_UNIT_HOMOLOGADO', 'VALOR_TOTAL_HOMOLOGADO', 'QUANTIDADE_HOMOLOGADA', 'DESCONTO_FONTE_PCT', 'SITUACAO', 'DATA_RESULTADO',
    'FONTE', 'LINK', 'HASH_FONTE', 'SERVIDOR_ID', 'VERSAO', 'MOTIVO', 'POR_ID', 'POR_NOME', 'COLETADO_EM', 'SINCRONIZADO_EM', 'ANULADO_EM', 'ANULADO_POR_NOME', 'ANULADO_MOTIVO', 'HASH']
};
var LICM_COLUNAS_TEXTO = {
  LIC_FORNECEDORES: ['CNPJ', 'CRIADO_EM', 'ATUALIZADO_EM', 'HASH'],
  LIC_MERCADO_RESULTADOS: ['CHAVE_RESULTADO', 'NUMERO_CONTROLE_PNCP', 'ORGAO_CNPJ', 'ITEM', 'FORNECEDOR_CNPJ', 'FORNECEDOR_CNPJ_INFORMADO', 'DATA_RESULTADO', 'ENCERRAMENTO_ISO', 'HASH_FONTE',
    'SERVIDOR_ID', 'COLETADO_EM', 'SINCRONIZADO_EM', 'ANULADO_EM', 'HASH']
};
var LICM_CAMPOS = { RAZAO_SOCIAL: 'Razão social', NOME_FANTASIA: 'Nome fantasia', UF: 'UF', MUNICIPIO: 'Município', PORTE: 'Porte' };
var LICM_ORIGENS = { COLETOR: 'Resultado publicado no PNCP (coletor do servidor)', DISPUTA: 'Disputa da Metrolabs (registrada pela Diretoria)', MANUAL: 'Digitado pela Diretoria' };
var LICM_PAPEIS = { VENCEDOR: 'Vencedor do item', PARTICIPANTE: 'Participou (sem vitória)' };
var LICM_PORTES = { ME: 'ME', EPP: 'EPP', DEMAIS: 'Demais' };
var LICM_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
var LICM_AMOSTRA_MIN = 5;
var LICM_MESES_PADRAO = 24;
var LICM_MOTIVO_MIN = 10;
var LICM_LISTA_MAX = 100;
var LICM_PROPRIO = 'Metrolabs (nós)';
/** Tipo de serviço pelo texto do item (sem acento, minúsculo). A ordem decide: o primeiro que casa. */
var LICM_SERVICOS = [
  ['QUALIFICACAO', 'Qualificação ou validação', /qualifica|validacao|mapeamento termico/],
  ['INSPECAO_NR13', 'Inspeção NR-13', /\bnr ?-? ?13\b|vasos? de pressao|caldeira|valvulas? de seguranca/],
  ['SEGURANCA_ELETRICA', 'Ensaio de segurança elétrica', /seguranca eletrica/],
  ['CALIBRACAO', 'Calibração', /calibra|afericao|aferir/],
  ['MANUTENCAO', 'Manutenção preventiva ou corretiva', /manutenc/],
  ['OUTRO', 'Outro serviço', null]
];
/** Equipamento pelo texto do item: nomes genéricos (nunca fabricante nem modelo). */
var LICM_EQUIPAMENTOS = [
  ['AUTOCLAVE', 'autoclave', /autoclave/], ['TERMODESINFECTORA', 'termodesinfectora', /termodesinfect/], ['LAVADORA_ULTRASSONICA', 'lavadora ultrassônica', /ultrass?onic/],
  ['SELADORA', 'seladora', /seladora/], ['ESTUFA', 'estufa', /estufa/], ['BANHO_MARIA', 'banho-maria', /banho ?-? ?maria/], ['INCUBADORA', 'incubadora', /incubadora/],
  ['REFRIGERACAO', 'refrigerador, freezer ou câmara de conservação', /refrigerador|geladeira|freezer|camaras? (de )?(conservacao|fria)|camaras? refrigerad/],
  ['TERMO_HIGROMETRO', 'termo-higrômetro', /termo ?-? ?higr/], ['REGISTRADOR_TEMPERATURA', 'registrador de temperatura', /registrador(es)? de temperatura|data ?-? ?logger/],
  ['TERMOMETRO', 'termômetro', /termometr/], ['BALANCA', 'balança', /balanca/], ['ESFIGMOMANOMETRO', 'esfigmomanômetro', /esfigmo/], ['PIPETA', 'pipeta', /pipeta/],
  ['CENTRIFUGA', 'centrífuga', /centrifug/], ['CABINE', 'cabine de segurança biológica ou fluxo laminar', /cabine|fluxo laminar/], ['OSMOSE', 'osmose reversa', /osmose/],
  ['VASO_PRESSAO', 'vaso de pressão ou caldeira', /vasos? de pressao|caldeira/], ['DESFIBRILADOR', 'desfibrilador ou cardioversor', /desfibril|cardioversor/],
  ['MONITOR', 'monitor multiparamétrico', /monitor(es)? multipar/], ['BOMBA_INFUSAO', 'bomba de infusão', /bombas? de infusao/], ['VENTILADOR', 'ventilador pulmonar', /ventilador(es)? pulmon|respirador/],
  ['ELETROCARDIOGRAFO', 'eletrocardiógrafo', /eletrocardiograf/], ['BISTURI', 'bisturi elétrico', /bisturi/], ['OXIMETRO', 'oxímetro', /oximetr/], ['MANOMETRO', 'manômetro', /manometr/],
  ['CRONOMETRO', 'cronômetro', /cronometr/]
];

// ------------------------------------------------------------ abas e utilitários
function LicM_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICM_ABAS_OK_V2')) return; } catch (e) {}
  Object.keys(LICM_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LICM_COLUNAS[aba]);
    LICM_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LICM_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LICM_ABAS_OK_V2', '1', 21600); } catch (e) {}
}
function LicM_temColetor_() { return typeof SGO_LICITACOES !== 'undefined' && SGO_LICITACOES && typeof SGO_LICITACOES.mercadoListar === 'function'; }
function LicM_norm_(t) { var s = Lic_s_(t).toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {} return s.replace(/[^a-z0-9]+/g, ' ').trim(); }
/** Nome para comparar (sem acento, sem pontuação, sem LTDA/ME/EPP/SA/EIRELI no fim). */
function LicM_nomeChave_(t) { return LicM_norm_(LicM_semCpf_(t)).replace(/\b(ltda|me|epp|s a|sa|eireli|limitada|mei)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
/**
 * Revisão de 642380b (privacidade): sequência de CPF (11 dígitos, com ou sem pontuação) sai do nome do fornecedor, ao gravar E ao mostrar
 * (vale para o que já estava gravado). Empresário individual costuma vir com o CPF no nome; CNPJ (14 dígitos) e outros números ficam.
 */
function LicM_semCpf_(t) {
  return Lic_s_(t).replace(/(?<![\d.\/-])\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}(?![\d\/-])/g, ' ').replace(/\s*[-–]\s*$/, '').replace(/^\s*[-–]\s*/, '').replace(/\s{2,}/g, ' ').trim();
}
function LicM_txt_(v, max) { return Lic_texto_(Lic_s_(v).replace(/\r\n/g, '\n').replace(/^(?:[=+@\s]|-(?!\d))+/, ''), max || 1000); }
function LicM_n_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var t = Lic_s_(v).replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  var n = Number(t); return isFinite(n) ? n : null;
}
/** "R$ 1.234,56" (pt-BR). */
function LicM_moeda_(v) {
  if (v === null || v === undefined || !isFinite(Number(v))) return '—';
  var n = Math.round(Number(v) * 100) / 100, neg = n < 0, s = Math.abs(n).toFixed(2), p = s.split('.'), i = p[0], out = '';
  while (i.length > 3) { out = '.' + i.slice(-3) + out; i = i.slice(0, -3); }
  return (neg ? '-' : '') + 'R$ ' + i + out + ',' + p[1];
}
function LicM_pct_(v) { if (v === null || v === undefined || !isFinite(Number(v))) return '—'; return String(Math.round(Number(v) * 10) / 10).replace('.', ',') + '%'; }
function LicM_dia_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Lic_s_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function LicM_diaIso_(v) { var t = Lic_s_(v); if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10); var ms = Date.parse(t); return isFinite(ms) ? new Date(ms - 3 * 3600e3).toISOString().slice(0, 10) : ''; }
function LicM_hojeIso_() { return LicM_diaIso_(Lic_agora_()); }
/** Dia ISO de N meses atrás (o período da consulta). */
function LicM_desde_(meses) { var d = new Date(Date.parse(Lic_agora_()) - 3 * 3600e3); d.setUTCMonth(d.getUTCMonth() - meses); return d.toISOString().slice(0, 10); }
function LicM_meses_(v) { var n = Math.round(Number(v)); return [6, 12, 24, 36, 60].indexOf(n) >= 0 ? n : LICM_MESES_PADRAO; }

/**
 * CNPJ normalizado (14 posições, letras maiúsculas) ou '' quando não confere: numérico ou alfanumérico (letras nas 12 primeiras
 * posições, dígitos verificadores numéricos; valor de cada posição = código do caractere − 48). CNPJ numérico que perdeu zeros à
 * esquerda (planilha) é recuperado só quando o preenchimento passa nos dígitos (como SGO_UTILS.cnpjArmazenado).
 */
function LicM_cnpj_(v) {
  var t = Lic_up_(v).replace(/[.\-\/\s]/g, '');
  if (/^\d{1,13}$/.test(t)) { var c = t; while (c.length < 14) c = '0' + c; if (LicM_cnpjConfere_(c)) return c; return ''; }
  return LicM_cnpjConfere_(t) ? t : '';
}
function LicM_cnpjConfere_(t) {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(t) || /^(\d)\1{13}$/.test(t)) return false;
  var dv = function (base) { var s = 0, p = 2; for (var i = base.length - 1; i >= 0; i--) { s += (base.charCodeAt(i) - 48) * p; p = p === 9 ? 2 : p + 1; } var r = s % 11; return r < 2 ? 0 : 11 - r; };
  var d1 = dv(t.slice(0, 12)), d2 = dv(t.slice(0, 12) + d1);
  return Number(t.charAt(12)) === d1 && Number(t.charAt(13)) === d2;
}
function LicM_cnpjTxt_(c) { c = Lic_s_(c); return c.length === 14 ? c.slice(0, 2) + '.' + c.slice(2, 5) + '.' + c.slice(5, 8) + '/' + c.slice(8, 12) + '-' + c.slice(12) : c; }

/** Tipo de serviço e equipamento pelo texto: { servico, servicoNome, equipamento, equipamentoNome }. */
function LicM_classificar_(texto) {
  var t = LicM_norm_(texto), s = LICM_SERVICOS[LICM_SERVICOS.length - 1], e = null;
  for (var i = 0; i < LICM_SERVICOS.length; i++) if (LICM_SERVICOS[i][2] && LICM_SERVICOS[i][2].test(t)) { s = LICM_SERVICOS[i]; break; }
  for (var j = 0; j < LICM_EQUIPAMENTOS.length; j++) if (LICM_EQUIPAMENTOS[j][2].test(t)) { e = LICM_EQUIPAMENTOS[j]; break; }
  return { servico: s[0], servicoNome: s[1], equipamento: e ? e[0] : '', equipamentoNome: e ? e[1] : '' };
}
/** Unidade para o grupo do preço (preço por unidade não se compara com preço por lote ou por mês). */
function LicM_unidade_(u) {
  var t = LicM_norm_(u);
  if (!t || /^(un|und|unid|unidade|unidades|pc|pca|peca|pecas|equipamento|equipamentos|equip|item)\b/.test(t)) return 'unidade';
  if (/^(serv|sv|servico)/.test(t)) return 'serviço';
  if (/^(mes|mensal|meses)/.test(t)) return 'mês';
  if (/^(ano|anual)/.test(t)) return 'ano';
  if (/^(hora|h\b|hr)/.test(t)) return 'hora';
  if (/^(lote|global|conjunto|kit|cj|vb|verba)/.test(t)) return 'lote ou global';
  if (/^(ponto|pontos)/.test(t)) return 'ponto';
  return t.slice(0, 30);
}
function LicM_grupo_(c, unidade) { return c.servico + '|' + c.equipamento + '|' + unidade; }
function LicM_grupoNome_(c, unidade) { return c.servicoNome + (c.equipamentoNome ? ' de ' + c.equipamentoNome : '') + ' (por ' + unidade + ')'; }

/** Quantil com interpolação linear (o mesmo da planilha, QUARTIL.INC). ord: números em ordem crescente. */
function LicM_quantil_(ord, p) { if (!ord.length) return null; var h = (ord.length - 1) * p, i = Math.floor(h); return i + 1 < ord.length ? ord[i] + (h - i) * (ord[i + 1] - ord[i]) : ord[i]; }
/** { n, min, q1, mediana, q3, max, media, pequena, semDados, aviso }. Nunca inventa: sem valor, os números ficam null. */
function LicM_estatistica_(valores) {
  var v = (valores || []).map(Number).filter(function (x) { return isFinite(x) && x > 0; }).sort(function (a, b) { return a - b; });
  var r2 = function (x) { return x === null ? null : Math.round(x * 100) / 100; }, n = v.length;
  var s = { n: n, min: n ? v[0] : null, q1: r2(LicM_quantil_(v, 0.25)), mediana: r2(LicM_quantil_(v, 0.5)), q3: r2(LicM_quantil_(v, 0.75)), max: n ? v[n - 1] : null,
    media: n ? r2(v.reduce(function (a, b) { return a + b; }, 0) / n) : null, pequena: n > 0 && n < LICM_AMOSTRA_MIN, semDados: n === 0 };
  s.aviso = !n ? 'Sem dados: nenhum preço registrado para este grupo no período.' : n < LICM_AMOSTRA_MIN ? 'Amostra pequena (n = ' + n + '): use como indício, não como referência de preço.' : '';
  return s;
}
/** Estatística simples de percentuais (podem ser negativos: preço acima do estimado). */
function LicM_estatPct_(valores) {
  var v = (valores || []).filter(function (x) { return x !== null && isFinite(x); }).sort(function (a, b) { return a - b; }), n = v.length;
  return { n: n, media: n ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / n * 10) / 10 : null, mediana: n ? Math.round(LicM_quantil_(v, 0.5) * 10) / 10 : null, pequena: n > 0 && n < LICM_AMOSTRA_MIN };
}

// ------------------------------------------------------------ cadastro de fornecedores (mescla sem sobrescrever)
function LicM_hashFornecedor_(f) { return Lic_hash_([Lic_s_(f.CNPJ), Lic_s_(f.RAZAO_SOCIAL), Lic_s_(f.NOME_FANTASIA), Lic_s_(f.UF), Lic_s_(f.MUNICIPIO), Lic_s_(f.PORTE), String(Number(f.VERSAO) || 0), Lic_s_(f.ATUALIZADO_EM)].join('|')); }
function LicM_fornecedoresPorCnpj_() { var m = {}; Lic_ler_(LICM_ABAS.FORNECEDORES).forEach(function (f) { var c = LicM_cnpj_(f.CNPJ); if (c && !m[c]) m[c] = f; }); return m; }
/** Valor do campo para comparar (sem acento, sem pontuação; porte pelo código). */
function LicM_cmp_(campo, v) { return campo === 'PORTE' ? LicM_porte_(v) : campo === 'UF' ? Lic_up_(v) : LicM_nomeChave_(v); }
function LicM_porte_(v) { var t = LicM_norm_(v); if (!t) return ''; if (/^(me|micro)/.test(t)) return 'ME'; if (/^(epp|empresa de pequeno|pequeno)/.test(t)) return 'EPP'; if (/^(demais|outr|grande|medio)/.test(t)) return 'DEMAIS'; return ''; }
function LicM_limparCampo_(campo, v) {
  if (campo === 'UF') { var u = Lic_up_(v); return LICM_UFS.indexOf(u) >= 0 ? u : ''; }
  if (campo === 'PORTE') return LicM_porte_(v);
  return LicM_semCpf_(LicM_txt_(v, campo === 'MUNICIPIO' ? 120 : 300));
}
/**
 * Mescla o que uma fonte trouxe no cadastro (quem chama segura a trava). dados = { CNPJ, RAZAO_SOCIAL, ... }; o.origem COLETOR|DISPUTA|MANUAL;
 * o.ref (de onde: número de controle e item, código da licitação); o.em (data do fato); o.apelido (nome como foi digitado, para ligar).
 * Devolve { fornecedor, novo, mudou: [campos], variantes: [campos] }. Nunca troca um valor que já existe.
 */
function LicM_mesclar_(mapa, dados, o, eu) {
  var cnpj = LicM_cnpj_(dados.CNPJ);
  if (!cnpj) return null;
  var agora = Lic_agora_(), quem = eu || { id: '', nome: 'Sistema (' + (LICM_ORIGENS[o.origem] || o.origem) + ')' }, atual = mapa[cnpj], r = { novo: !atual, mudou: [], variantes: [] };
  var marca = { origem: o.origem, em: Lic_s_(o.em) || agora, ref: Lic_texto_(o.ref, 200) };
  var reg = atual ? Object.assign({}, atual) : { CNPJ: cnpj, ORIGEM: o.origem, ORIGENS_JSON: '{}', CAMPOS_JSON: '{}', VARIANTES_JSON: '[]', APELIDOS_JSON: '[]', VERSAO: 0, CRIADO_POR_NOME: quem.nome, CRIADO_EM: agora };
  var campos = Lic_json_(reg.CAMPOS_JSON, {}) || {}, variantes = Lic_json_(reg.VARIANTES_JSON, []) || [], origens = Lic_json_(reg.ORIGENS_JSON, {}) || {}, apelidos = Lic_json_(reg.APELIDOS_JSON, []) || [];
  Object.keys(LICM_CAMPOS).forEach(function (k) {
    var v = LicM_limparCampo_(k, dados[k]);
    if (!v) return;
    var a = Lic_s_(reg[k]);
    if (!a) { reg[k] = v; campos[k] = marca; r.mudou.push(k); return; }
    if (LicM_cmp_(k, a) === LicM_cmp_(k, v)) return;
    var ja = variantes.some(function (x) { return x.campo === k && LicM_cmp_(k, x.valor) === LicM_cmp_(k, v); });
    if (!ja) { variantes.push({ campo: k, valor: v, origem: marca.origem, em: marca.em, ref: marca.ref }); r.variantes.push(k); }
  });
  // de onde o fornecedor já veio: a primeira e a última data de cada origem (a mesma fonte lida de novo não muda nada)
  var antes = origens[o.origem], origAntes = JSON.stringify(origens);
  if (!antes) origens[o.origem] = { primeira: marca.em, ultima: marca.em, ref: marca.ref };
  else { if (Lic_s_(marca.em) < Lic_s_(antes.primeira)) antes.primeira = marca.em; if (Lic_s_(marca.em) > Lic_s_(antes.ultima)) { antes.ultima = marca.em; antes.ref = marca.ref; } }
  var ap = LicM_nomeChave_(o.apelido);
  var apNovo = ap && apelidos.indexOf(ap) < 0;
  if (apNovo) apelidos.push(ap);
  if (!r.novo && !r.mudou.length && !r.variantes.length && !apNovo) {
    // nada do cadastro mudou: no máximo as datas das origens (sem versão nova); igual, nada é gravado
    if (JSON.stringify(origens) !== origAntes) { SGO_DATA.update(LICM_ABAS.FORNECEDORES, atual.ID, { ORIGENS_JSON: JSON.stringify(origens) }); atual.ORIGENS_JSON = JSON.stringify(origens); }
    r.fornecedor = atual; return r;
  }
  reg.CAMPOS_JSON = JSON.stringify(campos); reg.VARIANTES_JSON = JSON.stringify(variantes); reg.ORIGENS_JSON = JSON.stringify(origens); reg.APELIDOS_JSON = JSON.stringify(apelidos);
  if (r.novo || r.mudou.length) { reg.VERSAO = (Number(reg.VERSAO) || 0) + 1; reg.ATUALIZADO_POR_NOME = quem.nome; reg.ATUALIZADO_EM = agora; }
  reg.HASH = LicM_hashFornecedor_(reg);
  if (r.novo) { var ins = SGO_DATA.insert(LICM_ABAS.FORNECEDORES, reg); reg.ID = ins && ins.ID ? ins.ID : reg.ID; }
  else { var mud = {}; Object.keys(reg).forEach(function (k) { if (Lic_s_(reg[k]) !== Lic_s_(atual[k])) mud[k] = reg[k]; }); SGO_DATA.update(LICM_ABAS.FORNECEDORES, atual.ID, mud); }
  mapa[cnpj] = reg;
  var fonte = LICM_ORIGENS[o.origem] || o.origem;
  if (r.novo) Lic_historico_('FORNECEDOR', reg.ID, cnpj, 'FORNECEDOR_NOVO', quem, { para: Lic_s_(reg.RAZAO_SOCIAL), texto: 'Fornecedor cadastrado pelo CNPJ ' + LicM_cnpjTxt_(cnpj) + ' (' + fonte + (marca.ref ? ', ' + marca.ref : '') + ').', versao: reg.VERSAO, fonte: fonte, hash: reg.HASH });
  else r.mudou.forEach(function (k) { Lic_historico_('FORNECEDOR', reg.ID, cnpj, 'FORNECEDOR_CAMPO', quem, { de: '', para: Lic_s_(reg[k]), texto: LICM_CAMPOS[k] + ' preenchido (estava vazio) por ' + fonte + (marca.ref ? ', ' + marca.ref : '') + '.', versao: reg.VERSAO, fonte: fonte }); });
  r.variantes.forEach(function (k) { var v = variantes.filter(function (x) { return x.campo === k; }).slice(-1)[0]; Lic_historico_('FORNECEDOR', reg.ID, cnpj, 'FORNECEDOR_VARIANTE', quem, { de: Lic_s_(reg[k]), para: v.valor, texto: LICM_CAMPOS[k] + ': ' + fonte + (marca.ref ? ' (' + marca.ref + ')' : '') + ' informou "' + v.valor + '", diferente do cadastro ("' + Lic_s_(reg[k]) + '"). O cadastro não muda sozinho: a Diretoria escolhe na tela, com o motivo.', fonte: fonte }); });
  if (apNovo && !r.novo) Lic_historico_('FORNECEDOR', reg.ID, cnpj, 'FORNECEDOR_APELIDO', quem, { para: Lic_s_(o.apelido), texto: 'Nome "' + Lic_s_(o.apelido) + '" ligado a este CNPJ (' + fonte + (marca.ref ? ', ' + marca.ref : '') + ').', fonte: fonte });
  r.fornecedor = reg;
  return r;
}

// ------------------------------------------------------------ sincronização com o servidor (resultados do PNCP) e com as disputas
function LicM_hashResultado_(x) {
  return Lic_hash_([Lic_s_(x.CHAVE_RESULTADO), Lic_up_(x.ORIGEM), Lic_up_(x.PAPEL), Lic_s_(x.ORGAO_CNPJ), Lic_s_(x.ORGAO_NOME), Lic_s_(x.ITEM), Lic_s_(x.ITEM_DESCRICAO), Lic_s_(x.ITEM_UNIDADE),
    Lic_s_(x.VALOR_UNIT_ESTIMADO), Lic_s_(x.FORNECEDOR_CNPJ), Lic_s_(x.FORNECEDOR_NOME), Lic_s_(x.VALOR_UNIT_HOMOLOGADO), Lic_s_(x.VALOR_TOTAL_HOMOLOGADO), Lic_s_(x.SITUACAO), Lic_s_(x.DATA_RESULTADO),
    Lic_s_(x.FONTE), Lic_s_(x.LINK), Lic_s_(x.HASH_FONTE), Lic_s_(x.ORDEM_CLASSIFICACAO), String(Number(x.VERSAO) || 0), Lic_s_(x.POR_ID), Lic_s_(x.ANULADO_EM), Lic_s_(x.ANULADO_MOTIVO)].join('|'));
}
function LicM_v_(n) { return n === null || n === undefined || n === '' || !isFinite(Number(n)) ? '' : Number(n); }
/** Linha do espelho a partir do que o servidor devolve (servicos/licitacoes/mercado.ts, listar). */
function LicM_linhaDoServidor_(it, opsPorChave) {
  var c = it.contratacao || {}, i = it.item || {}, f = it.fornecedor || {}, op = opsPorChave[Lic_s_(it.chave)];
  return { CHAVE_RESULTADO: Lic_s_(it.chave) + '|' + Lic_s_(it.numeroItem) + '|' + Lic_s_(it.sequencial), ORIGEM: 'COLETOR', PAPEL: 'VENCEDOR', CHAVE_FONTE: Lic_s_(it.chave),
    NUMERO_CONTROLE_PNCP: Lic_s_(c.numeroControlePncp), OPORTUNIDADE_ID: op ? Lic_s_(op.ID) : '', ORGAO_CNPJ: Lic_s_(c.orgaoCnpj).replace(/\D/g, ''), ORGAO_NOME: Lic_texto_(c.orgaoNome, 300),
    UF: Lic_up_(c.uf), MUNICIPIO: Lic_texto_(c.municipio, 120), MODALIDADE: Lic_texto_(c.modalidadeNome, 80), OBJETO: Lic_texto_(c.objeto, 600), ENCERRAMENTO_ISO: Lic_s_(c.encerramentoEm),
    ITEM: Lic_s_(it.numeroItem), ITEM_DESCRICAO: Lic_texto_(i.descricao, 1000), ITEM_TIPO: Lic_up_(i.materialServico), ITEM_QUANTIDADE: LicM_v_(i.quantidade), ITEM_UNIDADE: Lic_texto_(i.unidade, 60),
    VALOR_UNIT_ESTIMADO: LicM_v_(i.valorUnitarioEstimado), FORNECEDOR_CNPJ: LicM_cnpj_(f.cnpj), FORNECEDOR_CNPJ_INFORMADO: Lic_texto_(f.cnpjInformado, 20), FORNECEDOR_NOME: LicM_semCpf_(Lic_texto_(f.nome, 300)),
    FORNECEDOR_PORTE: Lic_texto_(f.porte, 40), FORNECEDOR_TIPO: Lic_up_(f.tipoPessoa), VALOR_UNIT_HOMOLOGADO: LicM_v_(it.valorUnitarioHomologado), VALOR_TOTAL_HOMOLOGADO: LicM_v_(it.valorTotalHomologado),
    QUANTIDADE_HOMOLOGADA: LicM_v_(it.quantidadeHomologada), DESCONTO_FONTE_PCT: LicM_v_(it.percentualDesconto), ORDEM_CLASSIFICACAO: LicM_v_(it.ordemClassificacao), SITUACAO: Lic_texto_(it.situacao, 60), DATA_RESULTADO: Lic_s_(it.dataResultado).slice(0, 10),
    FONTE: 'PNCP, resultado do item ' + Lic_s_(it.numeroItem) + ' da contratação ' + Lic_s_(c.numeroControlePncp), LINK: Lic_url_(c.linkPncp) || Lic_url_(it.fonte && it.fonte.url), HASH_FONTE: Lic_s_(it.hash),
    SERVIDOR_ID: Lic_s_(it.id), COLETADO_EM: Lic_s_(it.coletadoEm) };
}
var LICM_CAMPOS_MUDANCA = { FORNECEDOR_NOME: 'Vencedor', FORNECEDOR_CNPJ: 'CNPJ do vencedor', VALOR_UNIT_HOMOLOGADO: 'Valor unitário homologado', VALOR_TOTAL_HOMOLOGADO: 'Valor total homologado', SITUACAO: 'Situação do resultado', DATA_RESULTADO: 'Data do resultado' };
/**
 * Traz do servidor os resultados novos (cursor LICM_SYNC_DESDE, como Lic_sincronizar_: a trava fica presa só durante uma página e o
 * cursor é gravado ao fim de cada página) e lê os vencedores das disputas. Idempotente. eu = quem pediu (tela) ou null (rotina).
 */
function LicM_sincronizar_(eu, o) {
  o = o || {};
  LicM_garantirAbas_();
  var props = PropertiesService.getScriptProperties(), r = { ok: true, lidos: 0, novos: 0, mudaram: 0, iguais: 0, fornecedoresNovos: 0, fornecedoresPreenchidos: 0, variantes: 0, semCnpj: 0, disputa: 0, paginas: 0, mais: false };
  var maxVoltas = Math.max(1, Math.min(25, Number(o.voltas) || 10)), sistema = { id: '', nome: 'Coletor de licitações (servidor)' };
  if (!LicM_temColetor_()) { r.coletor = false; r.motivo = LIC_MSG_SEM_COLETOR + '.'; }
  else for (var volta = 0; volta < maxVoltas; volta++) {
    var continuar = Lic_comTrava_(function () {
      var desde = Lic_s_(props.getProperty('LICM_SYNC_DESDE'));
      var pag = SGO_LICITACOES.mercadoListar({ desde: desde, limite: 200 }) || {}, itens = Array.isArray(pag.itens) ? pag.itens : [];
      if (!itens.length) return false;
      var linhas = {}, ops = {}, forn = LicM_fornecedoresPorCnpj_(), agora = Lic_agora_();
      Lic_ler_(LICM_ABAS.RESULTADOS).forEach(function (x) { linhas[Lic_s_(x.CHAVE_RESULTADO)] = x; });
      Lic_ativas_().forEach(function (l) { if (Lic_s_(l.CHAVE_FONTE)) ops[Lic_s_(l.CHAVE_FONTE)] = l; });
      itens.forEach(function (it) {
        r.lidos++;
        var n = LicM_linhaDoServidor_(it, ops), atual = linhas[n.CHAVE_RESULTADO];
        n.SINCRONIZADO_EM = agora;
        if (!atual) {
          n.VERSAO = 1; n.HASH = LicM_hashResultado_(n);
          var ins = SGO_DATA.insert(LICM_ABAS.RESULTADOS, n); n.ID = ins && ins.ID ? ins.ID : n.ID; linhas[n.CHAVE_RESULTADO] = n; r.novos++;
        } else if (Lic_s_(atual.HASH_FONTE) === n.HASH_FONTE) { r.iguais++; return; }
        else {
          // versão nova da fonte (resultado corrigido ou cancelado no PNCP): a linha acompanha a fonte; o que mudou vai para o histórico
          var difs = [];
          Object.keys(LICM_CAMPOS_MUDANCA).forEach(function (k) { if (Lic_s_(atual[k]) !== Lic_s_(n[k])) difs.push(LICM_CAMPOS_MUDANCA[k] + ': "' + Lic_s_(atual[k]) + '" → "' + Lic_s_(n[k]) + '"'); });
          n.VERSAO = (Number(atual.VERSAO) || 1) + 1; n.HASH = LicM_hashResultado_(n);
          SGO_DATA.update(LICM_ABAS.RESULTADOS, atual.ID, n); n.ID = atual.ID; linhas[n.CHAVE_RESULTADO] = n; r.mudaram++;
          Lic_historico_('MERCADO', atual.ID, n.NUMERO_CONTROLE_PNCP, 'MERCADO_RESULTADO_MUDOU', sistema, { de: 'versão ' + Lic_s_(atual.VERSAO), para: 'versão ' + n.VERSAO,
            texto: 'O PNCP mudou o resultado do item ' + n.ITEM + ' (' + n.ORGAO_NOME + '): ' + (difs.length ? difs.join('; ') : 'campo secundário') + '. A versão anterior continua guardada no servidor.', versao: n.VERSAO, fonte: n.FONTE, hash: n.HASH_FONTE });
        }
        if (!n.FORNECEDOR_CNPJ) { r.semCnpj++; return; }
        var m = LicM_mesclar_(forn, { CNPJ: n.FORNECEDOR_CNPJ, RAZAO_SOCIAL: n.FORNECEDOR_NOME, PORTE: n.FORNECEDOR_PORTE }, { origem: 'COLETOR', ref: n.NUMERO_CONTROLE_PNCP + ', item ' + n.ITEM, em: n.DATA_RESULTADO || n.COLETADO_EM }, null);
        if (m) { if (m.novo) r.fornecedoresNovos++; else if (m.mudou.length) r.fornecedoresPreenchidos++; r.variantes += m.variantes.length; }
      });
      var ate = pag.ate ? Lic_s_(pag.ate) : desde;
      props.setProperty('LICM_SYNC_DESDE', ate);
      r.paginas++;
      return !!pag.mais;
    });
    if (!continuar) break;
    if (volta === maxVoltas - 1) r.mais = true;
  }
  // vencedores das disputas da Metrolabs com CNPJ válido entram no cadastro (o nome digitado fica ligado ao CNPJ)
  try {
    Lic_comTrava_(function () {
      var forn = LicM_fornecedoresPorCnpj_();
      LicM_resultadosDisputa_().forEach(function (x) {
        var c = LicM_cnpj_(x.VENCEDOR_CNPJ);
        if (!c || Lic_up_(x.SITUACAO) === 'GANHO') return;
        var m = LicM_mesclar_(forn, { CNPJ: c, RAZAO_SOCIAL: x.VENCEDOR }, { origem: 'DISPUTA', ref: Lic_s_(x.CODIGO) + ', item ' + Lic_s_(x.ITEM), em: Lic_s_(x.EM), apelido: x.VENCEDOR }, null);
        if (m && (m.novo || m.mudou.length || m.variantes.length)) r.disputa++;
        if (m) { if (m.novo) r.fornecedoresNovos++; r.variantes += m.variantes.length; }
      });
    });
  } catch (e) { r.avisoDisputa = 'Os vencedores das disputas não foram lidos agora (' + Lic_s_(e && e.message) + '); a próxima sincronia tenta de novo.'; }
  r.em = Lic_agora_(); r.por = eu ? Lic_s_(eu.nome) : 'rotina do coletor';
  try { props.setProperty('LICM_ULTIMA_SINCRONIA', JSON.stringify(r)); } catch (e) {}
  return r;
}
/** O resultado que vale de cada item de cada disputa (a versão mais alta; com o hash conferido quando a Disputa está no ambiente). */
function LicM_resultadosDisputa_() {
  var aba = typeof LICD_ABAS !== 'undefined' ? LICD_ABAS.RESULTADOS : 'LIC_RESULTADOS', m = {};
  Lic_ler_(aba).forEach(function (x) {
    if (typeof LicD_hashResultado_ === 'function' && LicD_hashResultado_(x) !== Lic_s_(x.HASH)) return;
    var k = Lic_s_(x.DISPUTA_ID) + '|' + Lic_s_(x.ITEM);
    if (!m[k] || (Number(x.VERSAO) || 0) > (Number(m[k].VERSAO) || 0)) m[k] = x;
  });
  return Object.keys(m).map(function (k) { return m[k]; });
}

// ------------------------------------------------------------ observações (as três fontes num formato só)
/**
 * Todas as observações do período: [{ origem, papel, contratacao, oportunidadeId, orgaoChave, orgaoNome, orgaoCnpj, uf, item, descricao,
 * unidade, estimado, valor, total, fornecedorChave, fornecedorCnpj, fornecedorNome, pf, proprio, data, link, fonte, grupo, classe, desconto }].
 * Resultado cancelado ou anulado e linha alterada fora do SGO+ ficam de fora (contadas em ctx.fora).
 */
function LicM_observacoes_(o) {
  o = o || {};
  var desde = LicM_desde_(LicM_meses_(o.meses)), out = [], fora = { cancelados: 0, alterados: 0, antigos: 0, duplicados: 0 }, vistos = {};
  var forn = LicM_fornecedoresPorCnpj_(), apelidos = {};
  Object.keys(forn).forEach(function (c) { (Lic_json_(forn[c].APELIDOS_JSON, []) || []).forEach(function (a) { if (a && !apelidos[a]) apelidos[a] = c; }); });
  var nomeDe = function (cnpj, nome) { var f = cnpj && forn[cnpj]; return LicM_semCpf_(f && Lic_s_(f.RAZAO_SOCIAL) ? f.RAZAO_SOCIAL : nome); };
  var ops = {}; Lic_ler_(LIC_ABAS.OPORTUNIDADES).forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var add = function (x) {
    x.data = LicM_diaIso_(x.data);
    if (x.data && x.data < desde) { fora.antigos++; return; }
    // o texto do item decide; só quando ele não diz o serviço ("Termômetro digital"), o objeto da contratação completa (o equipamento continua o do item)
    var cl = LicM_classificar_(x.descricao), un = LicM_unidade_(x.unidade);
    if (cl.servico === 'OUTRO' && x.objeto) { var co = LicM_classificar_(x.descricao + ' ' + x.objeto); cl = { servico: co.servico, servicoNome: co.servicoNome, equipamento: cl.equipamento || co.equipamento, equipamentoNome: cl.equipamentoNome || co.equipamentoNome }; }
    x.classe = cl; x.unidadeGrupo = un; x.grupo = LicM_grupo_(cl, un); x.grupoNome = LicM_grupoNome_(cl, un);
    x.orgaoChave = x.orgaoCnpj ? 'CNPJ:' + x.orgaoCnpj : 'NOME:' + LicM_nomeChave_(x.orgaoNome);
    x.fornecedorChave = x.proprio ? 'PROPRIO' : x.fornecedorCnpj ? 'CNPJ:' + x.fornecedorCnpj : x.pf ? 'PF' : 'NOME:' + LicM_nomeChave_(x.fornecedorNome);
    x.desconto = x.estimado > 0 && x.valor > 0 && x.papel === 'VENCEDOR' ? Math.round((1 - x.valor / x.estimado) * 1000) / 10 : null;
    out.push(x);
  };
  // 1 e 3. espelho do PNCP e registros manuais. Revisão de 642380b: (a) registro de preços: do PNCP, vence o item só a ordem de
  // classificação 1, ou o único resultado não cancelado do item; os demais entram como participação ("cadastro de reserva"); (b) o
  // registro manual do mesmo item que o PNCP já trouxe não entra duas vezes (vale o PNCP, como nas disputas)
  var validas = [], porItem = {}, doPncp = {};
  Lic_ler_(LICM_ABAS.RESULTADOS).forEach(function (r) {
    if (LicM_hashResultado_(r) !== Lic_s_(r.HASH)) { fora.alterados++; return; }
    if (Lic_s_(r.ANULADO_EM) || /cancelad/i.test(Lic_s_(r.SITUACAO))) { fora.cancelados++; return; }
    validas.push(r);
    if (Lic_up_(r.ORIGEM) !== 'MANUAL') { var k = Lic_s_(r.CHAVE_FONTE) + '|' + Lic_s_(r.ITEM); porItem[k] = (porItem[k] || 0) + 1; doPncp[k] = true; }
  });
  validas.sort(function (a, b) { return (Lic_up_(a.ORIGEM) === 'MANUAL' ? 1 : 0) - (Lic_up_(b.ORIGEM) === 'MANUAL' ? 1 : 0); });
  validas.forEach(function (r) {
    var cnpj = LicM_cnpj_(r.FORNECEDOR_CNPJ), pf = Lic_up_(r.FORNECEDOR_TIPO) === 'PF', k = Lic_s_(r.CHAVE_FONTE) + '|' + Lic_s_(r.ITEM), manual = Lic_up_(r.ORIGEM) === 'MANUAL';
    var papel = Lic_up_(r.PAPEL) || 'VENCEDOR', reserva = false;
    if (manual && papel === 'VENCEDOR' && Lic_s_(r.CHAVE_FONTE) && doPncp[k]) { fora.duplicados++; return; }
    if (!manual && porItem[k] > 1 && Number(r.ORDEM_CLASSIFICACAO) !== 1) { papel = 'PARTICIPANTE'; reserva = true; }
    vistos[k] = true;
    add({ origem: Lic_up_(r.ORIGEM) || 'COLETOR', papel: papel, reserva: reserva, ordem: LicM_n_(r.ORDEM_CLASSIFICACAO), contratacao: Lic_s_(r.CHAVE_FONTE) || ('MANUAL:' + Lic_s_(r.ID)), oportunidadeId: Lic_s_(r.OPORTUNIDADE_ID),
      orgaoCnpj: Lic_s_(r.ORGAO_CNPJ).replace(/\D/g, ''), orgaoNome: Lic_s_(r.ORGAO_NOME), uf: Lic_up_(r.UF), objeto: Lic_s_(r.OBJETO), item: Lic_s_(r.ITEM), descricao: Lic_s_(r.ITEM_DESCRICAO), unidade: Lic_s_(r.ITEM_UNIDADE),
      estimado: LicM_n_(r.VALOR_UNIT_ESTIMADO), valor: LicM_n_(r.VALOR_UNIT_HOMOLOGADO), total: LicM_n_(r.VALOR_TOTAL_HOMOLOGADO), fornecedorCnpj: cnpj, fornecedorNome: pf ? 'Pessoa física' : nomeDe(cnpj, r.FORNECEDOR_NOME),
      pf: pf, proprio: false, data: Lic_s_(r.DATA_RESULTADO) || Lic_s_(r.ENCERRAMENTO_ISO) || Lic_s_(r.COLETADO_EM), link: Lic_url_(r.LINK), fonte: Lic_s_(r.FONTE), numeroControle: Lic_s_(r.NUMERO_CONTROLE_PNCP) });
  });
  // 2. disputas da Metrolabs: o resultado que vale de cada item (quando o PNCP já tem o mesmo item, vale o PNCP) e os concorrentes dos lances
  var disputas = {}, abaD = typeof LICD_ABAS !== 'undefined' ? LICD_ABAS.DISPUTAS : 'LIC_DISPUTAS';
  Lic_ler_(abaD).forEach(function (d) { disputas[Lic_s_(d.ID)] = d; });
  var baseItem = function (d, item) { var b = Lic_json_(d && d.BASE_JSON, {}) || {}; return (b.itens || []).filter(function (x) { return Lic_s_(x.item) === Lic_s_(item); })[0] || {}; };
  LicM_resultadosDisputa_().forEach(function (x) {
    var sit = Lic_up_(x.SITUACAO), l = ops[Lic_s_(x.OPORTUNIDADE_ID)] || {}, d = disputas[Lic_s_(x.DISPUTA_ID)], bi = baseItem(d, x.ITEM);
    if (sit !== 'GANHO' && sit !== 'PERDIDO') return;
    if (vistos[Lic_s_(l.CHAVE_FONTE) + '|' + Lic_s_(x.ITEM)]) return;
    var proprio = sit === 'GANHO', cnpj = proprio ? '' : LicM_cnpj_(x.VENCEDOR_CNPJ), nome = proprio ? LICM_PROPRIO : Lic_s_(x.VENCEDOR);
    if (!proprio && !cnpj && !nome) return;
    if (!cnpj && !proprio && apelidos[LicM_nomeChave_(nome)]) cnpj = apelidos[LicM_nomeChave_(nome)];
    add({ origem: 'DISPUTA', papel: 'VENCEDOR', contratacao: Lic_s_(l.CHAVE_FONTE) || ('OP:' + Lic_s_(x.OPORTUNIDADE_ID)), oportunidadeId: Lic_s_(x.OPORTUNIDADE_ID), orgaoCnpj: Lic_s_(l.ORGAO_CNPJ).replace(/\D/g, ''),
      orgaoNome: Lic_s_(l.ORGAO_NOME), uf: Lic_up_(l.UF), objeto: Lic_s_(l.OBJETO), item: Lic_s_(x.ITEM), descricao: Lic_s_(bi.descricao) || Lic_s_(bi.nome), unidade: 'unidade', estimado: LicM_n_(bi.precoEdital),
      valor: LicM_n_(x.VALOR_FINAL), total: LicM_n_(x.VALOR_TOTAL), fornecedorCnpj: cnpj, fornecedorNome: proprio ? LICM_PROPRIO : nomeDe(cnpj, nome), pf: false, proprio: proprio,
      data: Lic_s_(x.HOMOLOGACAO_EM) || Lic_s_(x.ADJUDICACAO_EM) || Lic_s_(x.EM), link: Lic_url_(l.LINK_PNCP), fonte: 'Disputa ' + Lic_s_(x.CODIGO) + ', resultado do item ' + Lic_s_(x.ITEM) + ' (' + Lic_s_(x.FONTE) + ')',
      numeroControle: Lic_s_(l.NUMERO_CONTROLE_PNCP) });
  });
  var abaL = typeof LICD_ABAS !== 'undefined' ? LICD_ABAS.LANCES : 'LIC_DISPUTA_LANCES', part = {};
  Lic_ler_(abaL).forEach(function (x) {
    if (Lic_up_(x.AUTOR) !== 'CONCORRENTE' || !Lic_s_(x.CONCORRENTE)) return;
    var k = Lic_s_(x.DISPUTA_ID) + '|' + LicM_nomeChave_(x.CONCORRENTE);
    if (!part[k]) part[k] = x;
  });
  Object.keys(part).forEach(function (k) {
    var x = part[k], d = disputas[Lic_s_(x.DISPUTA_ID)] || {}, l = ops[Lic_s_(x.OPORTUNIDADE_ID)] || {}, cnpj = apelidos[LicM_nomeChave_(x.CONCORRENTE)] || '';
    add({ origem: 'DISPUTA', papel: 'PARTICIPANTE', contratacao: Lic_s_(l.CHAVE_FONTE) || ('OP:' + Lic_s_(x.OPORTUNIDADE_ID)), oportunidadeId: Lic_s_(x.OPORTUNIDADE_ID), orgaoCnpj: Lic_s_(l.ORGAO_CNPJ).replace(/\D/g, ''),
      orgaoNome: Lic_s_(l.ORGAO_NOME), uf: Lic_up_(l.UF), objeto: Lic_s_(l.OBJETO), item: Lic_s_(x.ITEM), descricao: Lic_s_(baseItem(d, x.ITEM).descricao), unidade: 'unidade', estimado: null, valor: null, total: null,
      fornecedorCnpj: cnpj, fornecedorNome: nomeDe(cnpj, x.CONCORRENTE), apelido: LicM_semCpf_(x.CONCORRENTE), pf: false, proprio: false, data: Lic_s_(x.QUANDO), link: Lic_url_(l.LINK_PNCP),
      fonte: 'Disputa ' + Lic_s_(x.CODIGO) + ': lance do concorrente digitado pela Diretoria', numeroControle: Lic_s_(l.NUMERO_CONTROLE_PNCP) });
  });
  return { obs: out, fora: fora, desde: desde, meses: LicM_meses_(o.meses), fornecedores: forn };
}
/** Só as que entram no preço (vencedor, com valor). */
function LicM_comPreco_(obs) { return obs.filter(function (x) { return x.papel === 'VENCEDOR' && x.valor > 0; }); }
function LicM_fonteTela_(x) { return { origem: x.origem, origemNome: LICM_ORIGENS[x.origem] || x.origem, orgao: x.orgaoNome, uf: x.uf, item: x.item, descricao: Lic_texto_(x.descricao, 200), fornecedor: x.fornecedorNome, valor: x.valor, data: x.data, dataTxt: LicM_dia_(x.data), link: x.link, fonte: x.fonte, numeroControle: x.numeroControle }; }
function LicM_contar_(lista, chave, nome) {
  var m = {}; lista.forEach(function (x) { var k = chave(x); if (!k) return; m[k] = m[k] || { chave: k, nome: nome(x), n: 0 }; m[k].n++; });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'); });
}
function LicM_distintas_(lista) { var m = {}; lista.forEach(function (x) { m[x.contratacao] = true; }); return Object.keys(m).length; }

// ------------------------------------------------------------ agregações
/** Por concorrente (sem a Metrolabs e sem pessoa física): participações conhecidas, vitórias, órgãos, UFs, desconto e faixa por serviço. */
function LicM_porFornecedor_(obs, cadastro) {
  var grupos = {};
  obs.forEach(function (x) { if (x.proprio || x.pf) return; (grupos[x.fornecedorChave] = grupos[x.fornecedorChave] || []).push(x); });
  return Object.keys(grupos).map(function (k) {
    var l = grupos[k], venc = l.filter(function (x) { return x.papel === 'VENCEDOR'; }), cnpj = l[0].fornecedorCnpj, cad = cnpj && cadastro[cnpj];
    var porServ = {};
    LicM_comPreco_(venc).forEach(function (x) { (porServ[x.grupo] = porServ[x.grupo] || { grupo: x.grupo, nome: x.grupoNome, valores: [] }).valores.push(x.valor); });
    var datas = l.map(function (x) { return x.data; }).filter(Boolean).sort();
    return { chave: k, cnpj: cnpj, cnpjTxt: LicM_cnpjTxt_(cnpj), nome: LicM_semCpf_(cad && Lic_s_(cad.RAZAO_SOCIAL) ? cad.RAZAO_SOCIAL : l[0].fornecedorNome), cadastrado: !!cad, porte: cad ? LICM_PORTES[Lic_s_(cad.PORTE)] || '' : '',
      participacoes: LicM_distintas_(l), vitorias: LicM_distintas_(venc), itensGanhos: venc.length,
      valorGanho: Math.round(venc.reduce(function (a, x) { return a + (x.total > 0 ? x.total : 0); }, 0) * 100) / 100,
      orgaos: LicM_contar_(venc.length ? venc : l, function (x) { return x.orgaoChave; }, function (x) { return x.orgaoNome; }).slice(0, 8),
      ufs: LicM_contar_(l, function (x) { return x.uf; }, function (x) { return x.uf; }),
      desconto: LicM_estatPct_(venc.map(function (x) { return x.desconto; })),
      faixas: Object.keys(porServ).map(function (g) { var s = LicM_estatistica_(porServ[g].valores); return { grupo: g, nome: porServ[g].nome, n: s.n, min: s.min, mediana: s.mediana, max: s.max, pequena: s.pequena }; })
        .sort(function (a, b) { return b.n - a.n; }),
      origens: LicM_contar_(l, function (x) { return x.origem; }, function (x) { return LICM_ORIGENS[x.origem] || x.origem; }),
      semCnpj: !cnpj, apelido: !cnpj ? (l[0].apelido || l[0].fornecedorNome) : '', primeira: datas[0] || '', ultima: datas[datas.length - 1] || '' };
  }).sort(function (a, b) { return b.vitorias - a.vitorias || b.participacoes - a.participacoes || a.nome.localeCompare(b.nome, 'pt-BR'); });
}
/** Por órgão: quantas contratações com resultado e quem ganha (vitórias, itens, valor e desconto). */
function LicM_porOrgao_(obs) {
  var grupos = {};
  obs.forEach(function (x) { if (x.papel !== 'VENCEDOR') return; (grupos[x.orgaoChave] = grupos[x.orgaoChave] || []).push(x); });
  return Object.keys(grupos).map(function (k) {
    var l = grupos[k], porF = {};
    l.forEach(function (x) { var f = porF[x.fornecedorChave] = porF[x.fornecedorChave] || { chave: x.fornecedorChave, nome: x.fornecedorNome, cnpj: x.fornecedorCnpj, proprio: x.proprio, pf: x.pf, lista: [] }; f.lista.push(x); });
    var venc = Object.keys(porF).map(function (f) {
      var g = porF[f];
      return { chave: g.chave, nome: g.nome, cnpj: g.cnpj, cnpjTxt: LicM_cnpjTxt_(g.cnpj), proprio: g.proprio, pf: g.pf, vitorias: LicM_distintas_(g.lista), itens: g.lista.length,
        valor: Math.round(g.lista.reduce(function (a, x) { return a + (x.total > 0 ? x.total : 0); }, 0) * 100) / 100, desconto: LicM_estatPct_(g.lista.map(function (x) { return x.desconto; })) };
    }).sort(function (a, b) { return b.vitorias - a.vitorias || b.itens - a.itens || a.nome.localeCompare(b.nome, 'pt-BR'); });
    var datas = l.map(function (x) { return x.data; }).filter(Boolean).sort();
    return { chave: k, nome: l[0].orgaoNome, cnpj: l[0].orgaoCnpj, cnpjTxt: LicM_cnpjTxt_(l[0].orgaoCnpj), uf: l[0].uf, contratacoes: LicM_distintas_(l), itens: l.length, vencedores: venc,
      desconto: LicM_estatPct_(l.map(function (x) { return x.desconto; })), primeira: datas[0] || '', ultima: datas[datas.length - 1] || '' };
  }).sort(function (a, b) { return b.contratacoes - a.contratacoes || a.nome.localeCompare(b.nome, 'pt-BR'); });
}
/** Preço de referência por grupo (serviço + equipamento + unidade): estatística, período, desconto e as fontes com link. */
function LicM_referencias_(obs) {
  var g = {};
  LicM_comPreco_(obs).forEach(function (x) { (g[x.grupo] = g[x.grupo] || { grupo: x.grupo, nome: x.grupoNome, classe: x.classe, unidade: x.unidadeGrupo, lista: [] }).lista.push(x); });
  return Object.keys(g).map(function (k) {
    var x = g[k], s = LicM_estatistica_(x.lista.map(function (o) { return o.valor; })), datas = x.lista.map(function (o) { return o.data; }).filter(Boolean).sort();
    var fontes = x.lista.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).slice(0, 15).map(LicM_fonteTela_);
    return { grupo: k, nome: x.nome, servico: x.classe.servico, servicoNome: x.classe.servicoNome, equipamento: x.classe.equipamento, equipamentoNome: x.classe.equipamentoNome, unidade: x.unidade,
      estat: s, periodo: { de: datas[0] || '', ate: datas[datas.length - 1] || '', deTxt: LicM_dia_(datas[0]), ateTxt: LicM_dia_(datas[datas.length - 1]) },
      desconto: LicM_estatPct_(x.lista.map(function (o) { return o.desconto; })), contratacoes: LicM_distintas_(x.lista), fontes: fontes,
      origens: LicM_contar_(x.lista, function (o) { return o.origem; }, function (o) { return LICM_ORIGENS[o.origem] || o.origem; }) };
  }).sort(function (a, b) { return b.estat.n - a.estat.n || a.nome.localeCompare(b.nome, 'pt-BR'); });
}
/** Onde fica um preço na amostra: abaixo do 1º quartil, entre os quartis ou acima do 3º; diferença para a mediana. */
function LicM_comparar_(preco, s) {
  if (!(preco > 0) || !s || s.semDados) return null;
  var dif = Math.round((preco / s.mediana - 1) * 1000) / 10;
  var pos = preco < s.q1 - 0.004 ? 'ABAIXO' : preco > s.q3 + 0.004 ? 'ACIMA' : 'DENTRO';
  return { preco: preco, difMedianaPct: dif, posicao: pos, texto: (pos === 'ABAIXO' ? 'abaixo do 1º quartil (' + LicM_moeda_(s.q1) + ')' : pos === 'ACIMA' ? 'acima do 3º quartil (' + LicM_moeda_(s.q3) + ')' : 'entre o 1º e o 3º quartil') +
    ', ' + (dif === 0 ? 'igual à mediana' : LicM_pct_(Math.abs(dif)) + (dif > 0 ? ' acima' : ' abaixo') + ' da mediana (' + LicM_moeda_(s.mediana) + ')') + (s.pequena ? '; amostra pequena (n = ' + s.n + ')' : '') };
}

// ------------------------------------------------------------ telas (Inteligência de mercado)
function LicM_situacaoColeta_() {
  var u = Lic_json_(PropertiesService.getScriptProperties().getProperty('LICM_ULTIMA_SINCRONIA'), null);
  var srv = null, erro = '';
  if (LicM_temColetor_() && typeof SGO_LICITACOES.mercadoSituacao === 'function') { try { srv = SGO_LICITACOES.mercadoSituacao({}); } catch (e) { erro = Lic_s_(e && e.message); } }
  return { coletor: LicM_temColetor_(), servidor: srv, erroServidor: erro, ultima: u ? { em: Lic_s_(u.em), emTxt: Lic_brDiaHora_(u.em), por: Lic_s_(u.por), novos: Number(u.novos) || 0, mudaram: Number(u.mudaram) || 0, lidos: Number(u.lidos) || 0 } : null,
    semColetorTxt: LicM_temColetor_() ? '' : LIC_MSG_SEM_COLETOR + '. Os resultados das disputas da Metrolabs e os registros manuais continuam valendo.' };
}
/** Visão geral: contagens, a situação da coleta e os concorrentes das disputas ainda sem CNPJ. */
function LicM_tela_(eu, d) {
  var ctx = LicM_observacoes_({ meses: d.meses }), obs = ctx.obs, conc = LicM_porFornecedor_(obs, ctx.fornecedores);
  var semCnpj = conc.filter(function (c) { return c.semCnpj; }).map(function (c) { return { nome: c.apelido || c.nome, participacoes: c.participacoes, vitorias: c.vitorias }; });
  return { regras: LICM_REGRAS, meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), amostraMin: LICM_AMOSTRA_MIN, coleta: LicM_situacaoColeta_(),
    contagens: { observacoes: obs.length, comPreco: LicM_comPreco_(obs).length, contratacoes: LicM_distintas_(obs), concorrentes: conc.length, orgaos: LicM_porOrgao_(obs).length,
      cadastrados: Object.keys(ctx.fornecedores).length, porOrigem: LicM_contar_(obs, function (x) { return x.origem; }, function (x) { return LICM_ORIGENS[x.origem] || x.origem; }) },
    fora: ctx.fora, semCnpj: semCnpj.slice(0, 50), servicos: LICM_SERVICOS.map(function (s) { return { codigo: s[0], nome: s[1] }; }), equipamentos: LICM_EQUIPAMENTOS.map(function (e) { return { codigo: e[0], nome: e[1] }; }) };
}
function LicM_busca_(lista, busca, campos) {
  var b = LicM_norm_(busca); if (!b) return lista;
  return lista.filter(function (x) { return campos.some(function (c) { return LicM_norm_(x[c]).indexOf(b) >= 0 || Lic_s_(x[c]).replace(/\D/g, '').indexOf(b.replace(/\D/g, '') || '#') >= 0; }); });
}
function LicM_concorrentes_(eu, d) {
  var ctx = LicM_observacoes_({ meses: d.meses }), l = LicM_busca_(LicM_porFornecedor_(ctx.obs, ctx.fornecedores), d.busca, ['nome', 'cnpj', 'apelido']);
  return { meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), total: l.length, lista: l.slice(0, LICM_LISTA_MAX), cortada: l.length > LICM_LISTA_MAX };
}
function LicM_concorrente_(eu, d) {
  var ctx = LicM_observacoes_({ meses: d.meses }), k = Lic_s_(d.chave), c = LicM_porFornecedor_(ctx.obs, ctx.fornecedores).filter(function (x) { return x.chave === k; })[0];
  if (!c) throw new Error('Não foi possível abrir: este concorrente não tem registro no período (' + ctx.meses + ' meses). Aumente o período ou volte à lista');
  var l = ctx.obs.filter(function (x) { return x.fornecedorChave === k; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  return { meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), concorrente: c, registros: l.slice(0, 200).map(function (x) { var t = LicM_fonteTela_(x); t.papel = x.papel; t.papelNome = x.reserva ? 'Cadastro de reserva (registro de preços, ordem ' + (x.ordem || '—') + ')' : LICM_PAPEIS[x.papel]; t.desconto = x.desconto; t.grupoNome = x.grupoNome; return t; }),
    fornecedor: c.cnpj && ctx.fornecedores[c.cnpj] ? LicM_fornecedorTela_(ctx.fornecedores[c.cnpj]) : null };
}
function LicM_orgaos_(eu, d) {
  var ctx = LicM_observacoes_({ meses: d.meses }), l = LicM_busca_(LicM_porOrgao_(ctx.obs), d.busca, ['nome', 'cnpj', 'uf']);
  return { meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), total: l.length, lista: l.slice(0, LICM_LISTA_MAX).map(function (o) { var x = Object.assign({}, o); x.vencedores = o.vencedores.slice(0, 3); x.totalVencedores = o.vencedores.length; return x; }), cortada: l.length > LICM_LISTA_MAX };
}
function LicM_orgao_(eu, d) {
  var ctx = LicM_observacoes_({ meses: d.meses }), k = Lic_s_(d.chave), o = LicM_porOrgao_(ctx.obs).filter(function (x) { return x.chave === k; })[0];
  if (!o) throw new Error('Não foi possível abrir: este órgão não tem resultado no período (' + ctx.meses + ' meses). Aumente o período ou volte à lista');
  var l = ctx.obs.filter(function (x) { return x.orgaoChave === k && x.papel === 'VENCEDOR'; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  return { meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), orgao: o, registros: l.slice(0, 200).map(function (x) { var t = LicM_fonteTela_(x); t.desconto = x.desconto; t.grupoNome = x.grupoNome; return t; }) };
}
function LicM_referencia_(eu, d) {
  var ctx = LicM_observacoes_({ meses: d.meses }), l = LicM_referencias_(ctx.obs);
  if (Lic_s_(d.servico)) l = l.filter(function (x) { return x.servico === Lic_up_(d.servico); });
  if (Lic_s_(d.equipamento)) l = l.filter(function (x) { return x.equipamento === Lic_up_(d.equipamento); });
  l = LicM_busca_(l, d.busca, ['nome']);
  return { meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), amostraMin: LICM_AMOSTRA_MIN, total: l.length, lista: l.slice(0, LICM_LISTA_MAX), cortada: l.length > LICM_LISTA_MAX };
}

// ------------------------------------------------------------ ficha da oportunidade (aba Mercado) e pareceres
function LicM_simulacao_(oid) {
  var aba = typeof LICP_ABAS !== 'undefined' ? LICP_ABAS.SIMULACOES : 'LIC_SIMULACOES';
  return Lic_ler_(aba).filter(function (s) { return Lic_s_(s.OPORTUNIDADE_ID) === Lic_s_(oid); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0] || null;
}
/** Todos os tipos de serviço e equipamentos citados num texto (o objeto pode citar vários): { servicos: [códigos], equipamentos: [códigos] }. */
function LicM_tiposDoTexto_(texto) {
  var t = LicM_norm_(texto), sv = [], eq = [];
  LICM_SERVICOS.forEach(function (x) { if (x[2] && x[2].test(t)) sv.push(x[0]); });
  LICM_EQUIPAMENTOS.forEach(function (x) { if (x[2].test(t)) eq.push(x[0]); });
  return { servicos: sv, equipamentos: eq };
}
function LicM_nomeServico_(c) { return (LICM_SERVICOS.filter(function (x) { return x[0] === c; })[0] || [c, c])[1]; }
function LicM_nomeEquip_(c) { return (LICM_EQUIPAMENTOS.filter(function (x) { return x[0] === c; })[0] || [c, c])[1]; }
/**
 * O mercado de uma oportunidade: quem ganha neste órgão, quem ganha neste tipo de objeto (os serviços e os equipamentos citados no objeto
 * e nos itens da simulação; o objeto pode citar vários, então o tipo é "um destes serviços com um destes equipamentos"), o preço praticado
 * por item (comparado com a simulação salva) e os resultados desta própria licitação, se já saíram.
 * nivel: COMPLETO (Diretoria, Financeira), PROPOSTA (Licitações) ou NENHUM (Técnica e Comercial: sem valor nenhum, nem a chave do campo).
 */
function LicM_mercadoDaOp_(l, nivel, meses) {
  var ctx = LicM_observacoes_({ meses: meses }), obs = ctx.obs, comPreco = nivel !== 'NENHUM';
  var orgaoChave = Lic_s_(l.ORGAO_CNPJ).replace(/\D/g, '') ? 'CNPJ:' + Lic_s_(l.ORGAO_CNPJ).replace(/\D/g, '') : 'NOME:' + LicM_nomeChave_(l.ORGAO_NOME);
  var sim = LicM_simulacao_(l.ID), res = sim ? Lic_json_(sim.RESULTADO_JSON, {}) || {} : {}, itensSim = Array.isArray(res.itens) ? res.itens : [];
  var sv = {}, eq = {}, juntar = function (t) { var x = LicM_tiposDoTexto_(t); x.servicos.forEach(function (c) { sv[c] = true; }); x.equipamentos.forEach(function (c) { eq[c] = true; }); };
  juntar(l.OBJETO); itensSim.forEach(function (it) { juntar(Lic_s_(it.descricao) + ' ' + Lic_s_(it.nome)); });
  var servicos = Object.keys(sv), equips = Object.keys(eq);
  var doTipo = obs.filter(function (x) { return x.papel === 'VENCEDOR' && servicos.indexOf(x.classe.servico) >= 0 && (!equips.length || equips.indexOf(x.classe.equipamento) >= 0); });
  // sem preço (Técnica e Comercial): só nomes e contagens; os campos de valor nem vão
  var limpar = function (v) { var x = Object.assign({}, v); if (!comPreco) { delete x.valor; delete x.desconto; } return x; };
  var resumo = function (o, extra) { if (!o) return null; var x = Object.assign({ contratacoes: o.contratacoes, itens: o.itens, vencedores: o.vencedores.slice(0, 10).map(limpar) }, extra || {}); if (comPreco) x.desconto = o.desconto; return x; };
  var orgao = LicM_porOrgao_(obs.filter(function (x) { return x.orgaoChave === orgaoChave; }))[0] || null;
  var rankTipo = LicM_porOrgao_(doTipo.map(function (x) { var y = Object.assign({}, x); y.orgaoChave = 'TIPO'; return y; }))[0] || null;
  var r = { meses: ctx.meses, desdeTxt: LicM_dia_(ctx.desde), nivelPreco: nivel, amostraMin: LICM_AMOSTRA_MIN,
    orgao: resumo(orgao, orgao ? { nome: orgao.nome, ultimaTxt: LicM_dia_(orgao.ultima) } : null),
    tipos: { servicos: servicos.map(LicM_nomeServico_), equipamentos: equips.map(LicM_nomeEquip_) },
    tipo: resumo(rankTipo, { mesmaUf: doTipo.filter(function (x) { return x.uf && x.uf === Lic_up_(l.UF); }).length, uf: Lic_up_(l.UF) }) };
  // resultados desta mesma licitação (quando o PNCP já publicou)
  r.estaLicitacao = obs.filter(function (x) { return x.contratacao === Lic_s_(l.CHAVE_FONTE) && x.papel === 'VENCEDOR'; }).map(function (x) { var t = LicM_fonteTela_(x); if (!comPreco) delete t.valor; return t; });
  if (!comPreco) return r;
  // preço praticado por item da simulação; sem simulação, os grupos de mercado dos serviços e equipamentos do objeto (por unidade)
  var refsL = LicM_referencias_(obs), refs = {}; refsL.forEach(function (g) { refs[g.grupo] = g; });
  var refTela = function (g) { return g ? { grupo: g.grupo, nome: g.nome, estat: g.estat, periodo: g.periodo, contratacoes: g.contratacoes, fontes: g.fontes.slice(0, 6) } : null; };
  r.temSimulacao = !!sim; r.simVersao = sim ? Number(sim.VERSAO) || 0 : 0;
  if (sim) r.precos = itensSim.map(function (it) {
    var c = LicM_classificar_(Lic_s_(it.descricao) + ' ' + Lic_s_(it.nome)), g = refs[LicM_grupo_(c, 'unidade')] || null, nome = LicM_grupoNome_(c, 'unidade');
    return { numero: Lic_s_(it.numero || it.n), descricao: Lic_texto_(it.descricao, 200), servicoTabela: Lic_s_(it.nome), grupoNome: nome, referencia: refTela(g),
      aviso: g ? g.estat.aviso : 'Sem dados: nenhum preço de "' + nome + '" no período. Não há como comparar este item.',
      precoProposta: LicM_n_(it.precoProposta), precoEdital: LicM_n_(it.precoEdital), proposta: g ? LicM_comparar_(LicM_n_(it.precoProposta), g.estat) : null, edital: g ? LicM_comparar_(LicM_n_(it.precoEdital), g.estat) : null };
  });
  else r.precos = refsL.filter(function (g) { return g.unidade === 'unidade' && servicos.indexOf(g.servico) >= 0 && (!equips.length || equips.indexOf(g.equipamento) >= 0); })
    .map(function (g) { return { numero: '', descricao: '', grupoNome: g.nome, referencia: refTela(g), aviso: g.estat.aviso }; });
  return r;
}
function LicM_ficha_(eu, d) {
  var l = Lic_acharOp_(d.id), r = LicM_mercadoDaOp_(l, 'COMPLETO', d.meses);
  r.op = { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_s_(l.ORGAO_NOME), uf: Lic_s_(l.UF), chave: Lic_s_(l.CHAVE_FONTE), encerramentoTxt: Lic_brDiaHora_(l.ENCERRAMENTO_ISO), encerrou: Date.parse(Lic_s_(l.ENCERRAMENTO_ISO)) < Date.now() };
  r.coleta = { coletor: LicM_temColetor_(), podePedir: LicM_temColetor_() && /^PNCP:/.test(Lic_s_(l.CHAVE_FONTE)) && typeof SGO_LICITACOES.mercadoPedir === 'function', situacao: null };
  if (r.coleta.coletor && typeof SGO_LICITACOES.mercadoSituacao === 'function' && Lic_s_(l.CHAVE_FONTE)) { try { r.coleta.situacao = SGO_LICITACOES.mercadoSituacao({ chave: Lic_s_(l.CHAVE_FONTE) }); } catch (e) { r.coleta.erro = Lic_s_(e && e.message); } }
  return r;
}
/** Para a tela do pedido de parecer (LicPar_tela_): o mercado com o preço conforme a área. Nunca lança (o parecer não depende disto). */
function LicM_paraParecer_(l, nivelPreco) {
  try { return LicM_mercadoDaOp_(l, nivelPreco === 'COMPLETO' || nivelPreco === 'PROPOSTA' ? nivelPreco : 'NENHUM'); }
  catch (e) { return { erro: 'Não foi possível montar o mercado agora (' + Lic_s_(e && e.message) + ').' }; }
}
/** "Buscar resultados desta licitação no PNCP": pedido ao servidor (a contratação passa na frente da fila). */
function LicM_pedirResultados_(eu, d) {
  var l = Lic_acharOp_(d.id);
  if (!LicM_temColetor_() || typeof SGO_LICITACOES.mercadoPedir !== 'function') throw new Error('Não foi possível pedir: ' + LIC_MSG_SEM_COLETOR);
  if (!/^PNCP:/.test(Lic_s_(l.CHAVE_FONTE))) throw new Error('Não foi possível pedir: esta licitação não veio do PNCP, então não há resultado publicado lá para ler. Registre o resultado lido na ata em Inteligência de mercado › Registrar resultado');
  var r = SGO_LICITACOES.mercadoPedir({ chave: Lic_s_(l.CHAVE_FONTE), quem: eu.nome }) || {};
  if (!r.ok) throw new Error('Não foi possível pedir: ' + Lic_s_(r.motivo || 'o servidor recusou') + '. Nada foi alterado');
  Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'MERCADO_PEDIDO', eu, { texto: 'Pedido ao coletor: ler no PNCP os resultados (vencedor e preço de cada item) desta licitação. Sai na próxima rodada do coletor (até 2 horas) ou no "Coletar agora".', fonte: 'Aba Mercado da ficha' });
  return { texto: 'Pedido registrado: o coletor lê os resultados desta licitação no PNCP na próxima rodada (até 2 horas; "Coletar agora" em Portais e configurações adianta). Se o órgão ainda não publicou, o coletor confere de novo a cada 7 dias.' };
}

// ------------------------------------------------------------ cadastro: telas e ações da Diretoria
function LicM_fornecedorTela_(f) {
  var campos = Lic_json_(f.CAMPOS_JSON, {}) || {}, origens = Lic_json_(f.ORIGENS_JSON, {}) || {};
  return { id: Lic_s_(f.ID), cnpj: Lic_s_(f.CNPJ), cnpjTxt: LicM_cnpjTxt_(f.CNPJ), razaoSocial: LicM_semCpf_(f.RAZAO_SOCIAL), nomeFantasia: LicM_semCpf_(f.NOME_FANTASIA), uf: Lic_s_(f.UF), municipio: Lic_s_(f.MUNICIPIO),
    porte: Lic_s_(f.PORTE), porteNome: LICM_PORTES[Lic_s_(f.PORTE)] || '', obs: Lic_s_(f.OBS), versao: Number(f.VERSAO) || 0, integra: LicM_hashFornecedor_(f) === Lic_s_(f.HASH),
    campos: Object.keys(LICM_CAMPOS).map(function (k) { var c = campos[k] || null; return { campo: k, nome: LICM_CAMPOS[k], valor: LicM_semCpf_(f[k]), origem: c ? c.origem : '', origemNome: c ? LICM_ORIGENS[c.origem] || c.origem : '', emTxt: c ? LicM_dia_(LicM_diaIso_(c.em)) : '', ref: c ? Lic_s_(c.ref) : '' }; }),
    variantes: (Lic_json_(f.VARIANTES_JSON, []) || []).filter(function (v) { return LicM_cmp_(v.campo, v.valor) !== LicM_cmp_(v.campo, f[v.campo]); }).map(function (v) { return { campo: v.campo, nome: LICM_CAMPOS[v.campo] || v.campo, valor: LicM_semCpf_(v.valor), origemNome: LICM_ORIGENS[v.origem] || v.origem, emTxt: LicM_dia_(LicM_diaIso_(v.em)), ref: Lic_s_(v.ref) }; }),
    origens: Object.keys(origens).map(function (k) { var o = origens[k]; return { origem: k, nome: LICM_ORIGENS[k] || k, primeiraTxt: LicM_dia_(LicM_diaIso_(o.primeira)), ultimaTxt: LicM_dia_(LicM_diaIso_(o.ultima)) }; }),
    apelidos: (Lic_json_(f.APELIDOS_JSON, []) || []).map(LicM_semCpf_), criadoEm: Lic_brDiaHora_(f.CRIADO_EM), criadoPor: Lic_s_(f.CRIADO_POR_NOME), atualizadoEm: Lic_brDiaHora_(f.ATUALIZADO_EM), atualizadoPor: Lic_s_(f.ATUALIZADO_POR_NOME) };
}
function LicM_fornecedores_(eu, d) {
  var l = Lic_ler_(LICM_ABAS.FORNECEDORES).map(LicM_fornecedorTela_).sort(function (a, b) { return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR'); });
  l = LicM_busca_(l, d.busca, ['razaoSocial', 'nomeFantasia', 'cnpj']);
  return { total: l.length, lista: l.slice(0, LICM_LISTA_MAX).map(function (f) { return { id: f.id, cnpjTxt: f.cnpjTxt, cnpj: f.cnpj, razaoSocial: f.razaoSocial, uf: f.uf, porteNome: f.porteNome, variantes: f.variantes.length, origens: f.origens.map(function (o) { return o.nome; }), integra: f.integra }; }), cortada: l.length > LICM_LISTA_MAX,
    portes: LICM_PORTES, ufs: LICM_UFS, campos: LICM_CAMPOS, motivoMin: LICM_MOTIVO_MIN };
}
function LicM_fornecedor_(eu, d) {
  var c = LicM_cnpj_(d.cnpj), f = c ? LicM_fornecedoresPorCnpj_()[c] : null;
  if (!f) throw new Error('Não foi possível abrir: o CNPJ ' + (c ? LicM_cnpjTxt_(c) : Lic_s_(d.cnpj)) + ' não está no cadastro de fornecedores e concorrentes. Cadastre em "Novo fornecedor"');
  var hist = Lic_ler_(LIC_ABAS.HISTORICO).filter(function (h) { return Lic_s_(h.ENTIDADE) === 'FORNECEDOR' && Lic_s_(h.ENTIDADE_ID) === Lic_s_(f.ID); }).sort(function (a, b) { return Lic_s_(b.DATA) < Lic_s_(a.DATA) ? -1 : 1; }).slice(0, 60)
    .map(function (h) { return { tipo: Lic_s_(h.TIPO), de: LicM_semCpf_(h.DE), para: LicM_semCpf_(h.PARA), texto: LicM_semCpf_(h.TEXTO), por: Lic_s_(h.USUARIO_NOME), emTxt: Lic_brDiaHora_(h.DATA) }; });
  return { fornecedor: LicM_fornecedorTela_(f), historico: hist, portes: LICM_PORTES, ufs: LICM_UFS, motivoMin: LICM_MOTIVO_MIN };
}
function LicM_motivo_(v, oQue) { var m = LicM_txt_(v, 1000); if (m.length < LICM_MOTIVO_MIN) throw new Error('Escreva o motivo ' + oQue + ' (pelo menos ' + LICM_MOTIVO_MIN + ' letras): ele fica no histórico, com o seu nome e a hora. Nada foi gravado'); return m; }
/** Revisão de 642380b: o CNPJ DIGITADO tem de ter as 14 posições; completar com zeros à esquerda só ao ler da planilha (LicM_cnpj_). */
function LicM_cnpjDigitado_(v) {
  var t = Lic_up_(v).replace(/[.\-\/\s]/g, '');
  if (t.length !== 14) throw new Error('Escreva o CNPJ com as 14 posições (por exemplo 11.222.333/0001-81): o número digitado tem ' + t.length + '. Confira no cartão CNPJ. Nada foi gravado');
  var c = LicM_cnpjConfere_(t) ? t : '';
  if (!c) throw new Error('Escreva um CNPJ válido (14 posições, por exemplo 11.222.333/0001-81): o número digitado não confere nos dígitos verificadores. Confira no cartão CNPJ. Nada foi gravado');
  return c;
}
/**
 * Cadastrar ou mudar um fornecedor: d = { cnpj, campos: { RAZAO_SOCIAL, NOME_FANTASIA, UF, MUNICIPIO, PORTE }, obs, motivo }. A Diretoria muda
 * o campo que escolheu (de → para no histórico, com o motivo); campo em branco não apaga o que existe. CNPJ nunca duplica.
 */
function LicM_fornecedorSalvar_(eu, d) {
  var cnpj = LicM_cnpjDigitado_(d.cnpj), motivo = LicM_motivo_(d.motivo, 'do cadastro ou da mudança'), entrada = d.campos || {};
  var limpos = {}, erros = [];
  Object.keys(LICM_CAMPOS).forEach(function (k) {
    var bruto = Lic_s_(entrada[k]); if (!bruto) return;
    var v = LicM_limparCampo_(k, bruto);
    if (!v) erros.push(k === 'UF' ? 'a UF "' + bruto + '" não existe (use a sigla, por exemplo GO)' : k === 'PORTE' ? 'o porte "' + bruto + '" não é ME, EPP nem Demais' : LICM_CAMPOS[k] + ' vazio');
    else limpos[k] = v;
  });
  if (erros.length) throw new Error('Confira: ' + erros.join('; ') + '. Nada foi gravado');
  return Lic_comTrava_(function () {
    var mapa = LicM_fornecedoresPorCnpj_(), atual = mapa[cnpj], agora = Lic_agora_();
    if (!atual) {
      if (LicM_letras_(limpos.RAZAO_SOCIAL) < 3) throw new Error('Escreva a razão social (como no cartão CNPJ) para cadastrar o fornecedor ' + LicM_cnpjTxt_(cnpj) + '. Nada foi gravado');
      var m = LicM_mesclar_(mapa, Object.assign({ CNPJ: cnpj }, limpos), { origem: 'MANUAL', ref: 'Cadastro pela Diretoria: ' + motivo, em: agora }, eu);
      if (Lic_s_(d.obs)) SGO_DATA.update(LICM_ABAS.FORNECEDORES, m.fornecedor.ID, { OBS: LicM_txt_(d.obs, 1000) });
      return { novo: true, fornecedor: LicM_fornecedorTela_(LicM_fornecedoresPorCnpj_()[cnpj]), texto: 'Fornecedor ' + LicM_cnpjTxt_(cnpj) + ' cadastrado.' };
    }
    var mud = {}, campos = Lic_json_(atual.CAMPOS_JSON, {}) || {}, difs = [];
    Object.keys(limpos).forEach(function (k) {
      if (Lic_s_(atual[k]) === limpos[k]) return;
      mud[k] = limpos[k]; difs.push(k);
      campos[k] = { origem: 'MANUAL', em: agora, ref: 'Diretoria: ' + motivo };
    });
    var obs = d.obs === undefined ? null : LicM_txt_(d.obs, 1000);
    if (obs !== null && obs !== Lic_s_(atual.OBS)) mud.OBS = obs;
    if (!Object.keys(mud).length) return { semMudanca: true, fornecedor: LicM_fornecedorTela_(atual), texto: 'Nada mudou: os campos enviados são iguais ao cadastro.' };
    var reg = Object.assign({}, atual, mud);
    if (difs.length) { reg.VERSAO = (Number(atual.VERSAO) || 0) + 1; reg.ATUALIZADO_POR_NOME = eu.nome; reg.ATUALIZADO_EM = agora; reg.CAMPOS_JSON = JSON.stringify(campos); }
    reg.HASH = LicM_hashFornecedor_(reg);
    var gravar = {}; Object.keys(reg).forEach(function (k) { if (Lic_s_(reg[k]) !== Lic_s_(atual[k])) gravar[k] = reg[k]; });
    SGO_DATA.update(LICM_ABAS.FORNECEDORES, atual.ID, gravar);
    difs.forEach(function (k) { Lic_historico_('FORNECEDOR', atual.ID, cnpj, 'FORNECEDOR_CAMPO', eu, { de: Lic_s_(atual[k]), para: mud[k], texto: LICM_CAMPOS[k] + ' mudado pela Diretoria. Motivo: ' + motivo, versao: reg.VERSAO, fonte: 'Inteligência de mercado › Cadastro' }); });
    if (mud.OBS !== undefined) Lic_historico_('FORNECEDOR', atual.ID, cnpj, 'FORNECEDOR_OBS', eu, { de: Lic_texto_(atual.OBS, 300), para: Lic_texto_(mud.OBS, 300), texto: 'Observação mudada. Motivo: ' + motivo, fonte: 'Inteligência de mercado › Cadastro' });
    return { fornecedor: LicM_fornecedorTela_(reg), texto: difs.length ? 'Cadastro salvo como versão ' + reg.VERSAO + ' (' + difs.map(function (k) { return LICM_CAMPOS[k]; }).join(', ') + ').' : 'Observação salva.' };
  });
}
function LicM_letras_(t) { return Lic_s_(t).replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length; }
/** Ligar o nome digitado na disputa a um CNPJ (ação da Diretoria): d = { nome, cnpj, razaoSocial?, motivo }. */
function LicM_vincular_(eu, d) {
  var nome = LicM_txt_(d.nome, 200), cnpj = LicM_cnpjDigitado_(d.cnpj), motivo = LicM_motivo_(d.motivo, 'da ligação do nome ao CNPJ');
  if (!LicM_nomeChave_(nome)) throw new Error('Escolha na lista o nome do concorrente (como foi digitado na disputa). Nada foi gravado');
  return Lic_comTrava_(function () {
    var mapa = LicM_fornecedoresPorCnpj_(), outro = null;
    Object.keys(mapa).forEach(function (c) { if (c !== cnpj && (Lic_json_(mapa[c].APELIDOS_JSON, []) || []).indexOf(LicM_nomeChave_(nome)) >= 0) outro = mapa[c]; });
    if (outro) throw new Error('O nome "' + nome + '" já está ligado ao CNPJ ' + LicM_cnpjTxt_(outro.CNPJ) + ' (' + Lic_s_(outro.RAZAO_SOCIAL) + '). Um nome liga a um CNPJ só; confira na ficha do fornecedor. Nada foi gravado');
    var m = LicM_mesclar_(mapa, { CNPJ: cnpj, RAZAO_SOCIAL: LicM_txt_(d.razaoSocial, 300) || nome }, { origem: 'MANUAL', ref: 'Nome da disputa ligado pela Diretoria: ' + motivo, apelido: nome, em: Lic_agora_() }, eu);
    return { fornecedor: LicM_fornecedorTela_(m.fornecedor), texto: 'O nome "' + nome + '" agora conta para ' + LicM_cnpjTxt_(cnpj) + (m.novo ? ' (fornecedor cadastrado).' : '.') };
  });
}
/**
 * Registrar um resultado ou participação lido em ata: d = { orgaoNome, orgaoCnpj?, uf, numeroControle?, oportunidadeId?, item, descricao, unidade,
 * quantidade?, estimado?, papel: VENCEDOR|PARTICIPANTE, cnpj, nome?, valor (obrigatório para vencedor), data, fonte, link?, motivo }.
 */
function LicM_resultadoManual_(eu, d) {
  var papel = Lic_up_(d.papel) === 'PARTICIPANTE' ? 'PARTICIPANTE' : Lic_up_(d.papel) === 'VENCEDOR' ? 'VENCEDOR' : '';
  if (!papel) throw new Error('Escolha se o fornecedor venceu o item ou só participou. Nada foi gravado');
  var cnpj = LicM_cnpjDigitado_(d.cnpj), fonte = LicM_txt_(d.fonte, 500), link = Lic_s_(d.link), motivo = LicM_motivo_(d.motivo, 'do registro');
  if (fonte.length < 10) throw new Error('Escreva a fonte (pelo menos 10 letras: por exemplo "ata da sessão de 10/10/2026, página 3"): todo número da inteligência de mercado mostra de onde veio. Nada foi gravado');
  if (link && !Lic_url_(link)) throw new Error('O link da fonte tem de começar com http:// ou https:// (ou deixe em branco). Nada foi gravado');
  var l = Lic_s_(d.oportunidadeId) ? Lic_acharOp_(d.oportunidadeId) : null;
  var orgao = LicM_txt_(d.orgaoNome, 300) || (l ? Lic_s_(l.ORGAO_NOME) : ''), uf = Lic_up_(d.uf) || (l ? Lic_up_(l.UF) : '');
  if (LicM_nomeChave_(orgao).length < 3) throw new Error('Escreva o órgão (ou escolha a licitação). Nada foi gravado');
  if (uf && LICM_UFS.indexOf(uf) < 0) throw new Error('A UF "' + uf + '" não existe (use a sigla, por exemplo GO). Nada foi gravado');
  var desc = LicM_txt_(d.descricao, 1000);
  if (LicM_nomeChave_(desc).length < 5) throw new Error('Descreva o item (o serviço e o equipamento, como no edital): é o que agrupa o preço de referência. Nada foi gravado');
  var valor = d.valor === '' || d.valor === undefined || d.valor === null ? null : LicM_n_(d.valor), est = d.estimado === '' || d.estimado === undefined || d.estimado === null ? null : LicM_n_(d.estimado), qtd = Lic_s_(d.quantidade) ? LicM_n_(d.quantidade) : null;
  if (papel === 'VENCEDOR' && !(valor > 0)) throw new Error('Escreva o valor unitário que venceu, em reais (por exemplo 185,40). Nada foi gravado');
  if ((valor !== null && !(valor > 0)) || (est !== null && !(est > 0)) || (qtd !== null && !(qtd > 0))) throw new Error('Os valores e a quantidade têm de ser números maiores que zero (por exemplo 185,40). Nada foi gravado');
  var dia = LicM_diaIso_(d.data);
  if (!dia || dia > LicM_hojeIso_()) throw new Error('Escolha a data do resultado (não pode ser no futuro). Nada foi gravado');
  var orgCnpj = Lic_s_(d.orgaoCnpj) ? (function () { var t = Lic_up_(d.orgaoCnpj).replace(/[.\-\/\s]/g, ''); return t.length === 14 && LicM_cnpjConfere_(t) ? t : ''; })() : (l ? Lic_s_(l.ORGAO_CNPJ).replace(/\D/g, '') : '');
  if (Lic_s_(d.orgaoCnpj) && !orgCnpj) throw new Error('O CNPJ do órgão não confere nos dígitos verificadores (ou deixe em branco). Nada foi gravado');
  return Lic_comTrava_(function () {
    var mapa = LicM_fornecedoresPorCnpj_(), agora = Lic_agora_(), f = mapa[cnpj];
    var nome = LicM_semCpf_(LicM_txt_(d.nome, 300)) || (f ? LicM_semCpf_(f.RAZAO_SOCIAL) : '');
    if (LicM_nomeChave_(nome).length < 3) throw new Error('Escreva a razão social do fornecedor ' + LicM_cnpjTxt_(cnpj) + ' (ele ainda não está no cadastro). Nada foi gravado');
    var reg = { CHAVE_RESULTADO: 'MANUAL|' + Lic_hash_([cnpj, orgao, desc, String(valor), dia, agora, eu.id].join('|')).slice(0, 24), ORIGEM: 'MANUAL', PAPEL: papel, CHAVE_FONTE: l ? Lic_s_(l.CHAVE_FONTE) : '',
      NUMERO_CONTROLE_PNCP: LicM_txt_(d.numeroControle, 60) || (l ? Lic_s_(l.NUMERO_CONTROLE_PNCP) : ''), OPORTUNIDADE_ID: l ? Lic_s_(l.ID) : '', ORGAO_CNPJ: orgCnpj, ORGAO_NOME: orgao, UF: uf, MUNICIPIO: l ? Lic_s_(l.MUNICIPIO) : '',
      OBJETO: l ? Lic_texto_(l.OBJETO, 600) : '', ITEM: LicM_txt_(d.item, 20), ITEM_DESCRICAO: desc, ITEM_UNIDADE: LicM_txt_(d.unidade, 60) || 'unidade', ITEM_QUANTIDADE: qtd === null ? '' : qtd, VALOR_UNIT_ESTIMADO: est === null ? '' : est,
      FORNECEDOR_CNPJ: cnpj, FORNECEDOR_NOME: nome, FORNECEDOR_TIPO: 'PJ', VALOR_UNIT_HOMOLOGADO: valor === null ? '' : valor, VALOR_TOTAL_HOMOLOGADO: valor !== null && qtd !== null ? Math.round(valor * qtd * 100) / 100 : '',
      SITUACAO: 'Registrado pela Diretoria', DATA_RESULTADO: dia, FONTE: fonte, LINK: Lic_url_(link), VERSAO: 1, MOTIVO: motivo, POR_ID: eu.id, POR_NOME: eu.nome, COLETADO_EM: agora };
    reg.HASH = LicM_hashResultado_(reg);
    var ins = SGO_DATA.insert(LICM_ABAS.RESULTADOS, reg); reg.ID = ins && ins.ID ? ins.ID : reg.ID;
    LicM_mesclar_(mapa, { CNPJ: cnpj, RAZAO_SOCIAL: nome }, { origem: 'MANUAL', ref: 'Resultado registrado: ' + fonte, em: dia }, eu);
    Lic_historico_('MERCADO', reg.ID, reg.NUMERO_CONTROLE_PNCP, 'MERCADO_RESULTADO_MANUAL', eu, { para: nome, texto: LICM_PAPEIS[papel] + ': ' + nome + ' (' + LicM_cnpjTxt_(cnpj) + ') em ' + orgao + (valor !== null ? ', ' + LicM_moeda_(valor) + ' por ' + reg.ITEM_UNIDADE : '') + '. Fonte: ' + fonte + '. Motivo: ' + motivo, fonte: fonte, hash: reg.HASH });
    return { id: Lic_s_(reg.ID), texto: 'Registro salvo: entra na inteligência de mercado com a fonte "' + fonte + '".' };
  });
}
/** Anular um registro manual (nada é apagado): d = { id, motivo }. Resultado do PNCP não se anula aqui (a fonte é o PNCP). */
function LicM_resultadoAnular_(eu, d) {
  var motivo = LicM_motivo_(d.motivo, 'da anulação');
  return Lic_comTrava_(function () {
    var r = SGO_DATA.getById(LICM_ABAS.RESULTADOS, Lic_s_(d.id));
    if (!r) throw new Error('Não foi possível anular: o registro não foi encontrado. Atualize a tela');
    if (Lic_up_(r.ORIGEM) !== 'MANUAL') throw new Error('Só o registro digitado pela Diretoria pode ser anulado. O resultado que veio do PNCP acompanha a fonte: se estiver errado lá, o órgão corrige e o coletor traz a versão nova');
    if (Lic_s_(r.ANULADO_EM)) throw new Error('Este registro já foi anulado em ' + Lic_brDiaHora_(r.ANULADO_EM) + ' por ' + Lic_s_(r.ANULADO_POR_NOME) + '. Nada foi alterado');
    var mud = { ANULADO_EM: Lic_agora_(), ANULADO_POR_NOME: eu.nome, ANULADO_MOTIVO: motivo };
    mud.HASH = LicM_hashResultado_(Object.assign({}, r, mud));
    SGO_DATA.update(LICM_ABAS.RESULTADOS, r.ID, mud);
    Lic_historico_('MERCADO', r.ID, r.NUMERO_CONTROLE_PNCP, 'MERCADO_RESULTADO_ANULADO', eu, { de: Lic_s_(r.FORNECEDOR_NOME), texto: 'Registro manual anulado (fica guardado, fora das contas). Motivo: ' + motivo, fonte: Lic_s_(r.FONTE) });
    return { texto: 'Registro anulado: sai das contas e continua guardado no histórico.' };
  });
}
function LicM_registrosManuais_(eu) {
  return { lista: Lic_ler_(LICM_ABAS.RESULTADOS).filter(function (r) { return Lic_up_(r.ORIGEM) === 'MANUAL'; }).sort(function (a, b) { return Lic_s_(b.COLETADO_EM) < Lic_s_(a.COLETADO_EM) ? -1 : 1; }).slice(0, 100)
    .map(function (r) { return { id: Lic_s_(r.ID), papelNome: LICM_PAPEIS[Lic_up_(r.PAPEL)] || '', orgao: Lic_s_(r.ORGAO_NOME), uf: Lic_s_(r.UF), descricao: Lic_texto_(r.ITEM_DESCRICAO, 200), fornecedor: LicM_semCpf_(r.FORNECEDOR_NOME), cnpjTxt: LicM_cnpjTxt_(r.FORNECEDOR_CNPJ),
      valor: LicM_n_(r.VALOR_UNIT_HOMOLOGADO), unidade: Lic_s_(r.ITEM_UNIDADE), dataTxt: LicM_dia_(r.DATA_RESULTADO), fonte: Lic_s_(r.FONTE), link: Lic_url_(r.LINK), por: Lic_s_(r.POR_NOME), anulado: !!Lic_s_(r.ANULADO_EM), anuladoMotivo: Lic_s_(r.ANULADO_MOTIVO), integra: LicM_hashResultado_(r) === Lic_s_(r.HASH) }; }),
    oportunidades: Lic_ativas_().sort(function (a, b) { return Lic_s_(b.CODIGO) < Lic_s_(a.CODIGO) ? -1 : 1; }).slice(0, 300).map(function (l) { return { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 120), uf: Lic_s_(l.UF) }; }),
    ufs: LICM_UFS, motivoMin: LICM_MOTIVO_MIN };
}

// ------------------------------------------------------------ entrada (Licitacoes_api, ação "mercado")
var LICM_OPS = {
  tela: function (eu, d) { return LicM_tela_(eu, d); },
  concorrentes: function (eu, d) { return LicM_concorrentes_(eu, d); },
  concorrente: function (eu, d) { return LicM_concorrente_(eu, d); },
  orgaos: function (eu, d) { return LicM_orgaos_(eu, d); },
  orgao: function (eu, d) { return LicM_orgao_(eu, d); },
  referencia: function (eu, d) { return LicM_referencia_(eu, d); },
  ficha: function (eu, d) { return LicM_ficha_(eu, d); },
  fornecedores: function (eu, d) { return LicM_fornecedores_(eu, d); },
  fornecedor: function (eu, d) { return LicM_fornecedor_(eu, d); },
  fornecedorSalvar: function (eu, d) { return LicM_fornecedorSalvar_(eu, d); },
  vincular: function (eu, d) { return LicM_vincular_(eu, d); },
  manuais: function (eu) { return LicM_registrosManuais_(eu); },
  resultadoManual: function (eu, d) { return LicM_resultadoManual_(eu, d); },
  resultadoAnular: function (eu, d) { return LicM_resultadoAnular_(eu, d); },
  pedirResultados: function (eu, d) { return LicM_pedirResultados_(eu, d); },
  sincronizar: function (eu) { var r = LicM_sincronizar_(eu, { voltas: 5 }); return { sincronia: r, texto: (r.coletor === false ? 'Sem o coletor neste ambiente: ' : 'Sincronia feita: ') + r.novos + ' resultado(s) novo(s), ' + r.mudaram + ' mudado(s) na fonte, ' + r.fornecedoresNovos + ' fornecedor(es) novo(s), ' + r.variantes + ' variante(s) para conferir' + (r.mais ? '; ainda há mais (toque de novo)' : '') + '.' }; }
};
/** Todas as operações exigem a Diretoria ou o Administrador (o servidor confere em toda chamada). */
function LicM_acao_(eu, d) {
  var op = Lic_s_(d && d.op), fn = Object.prototype.hasOwnProperty.call(LICM_OPS, op) ? LICM_OPS[op] : null;
  if (!fn) throw new Error('Não foi possível: operação da inteligência de mercado desconhecida (' + op + '). Atualize a página (F5) e tente de novo');
  Lic_exigir_(eu, 'usar a inteligência de mercado');
  LicM_garantirAbas_();
  return fn(eu, d || {});
}
