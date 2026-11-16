/**
 * Painel financeiro: NF-e de compra e NFS-e recebidas viram conta(s) a pagar no Omie (16/11/2026, especificação do Financeiro,
 * seção 3, caminho B "só financeiro", o recomendado; o caminho fiscal A fica para decisão do dono com o contador).
 *
 * Leitura do XML (sem DTD/entidades), uma nota por arquivo:
 * - NF-e modelo 55, finalidade normal, autorizada (cStat 100, chave igual à do protocolo), destinatário = OMIE_EMPRESA_CNPJ.
 *   Uma conta a pagar por duplicata (cobr/dup); sem duplicata, um título só (vencimento escolhido na tela); tPag 90 ou vNF 0 não
 *   gera título ("Registrada sem título").
 * - NFS-e ABRASF (CompNfse/Nfse/InfNfse) ou Padrão Nacional (NFSe/infNFSe), lidas pelo nome local do elemento. Tomador = empresa.
 *   Valor a pagar = líquido calculado (serviço - retenções federais - ISS retido - desconto incondicionado), nunca o bruto quando
 *   há retenção; diferença para o líquido do XML vai para conferência manual. O que não foi lido é digitado na tela, com motivo,
 *   e fica marcado (CAMPOS_MANUAIS). Os caminhos do Padrão Nacional e as variações de prefeitura estão "a confirmar" com XMLs reais.
 * Antes de lançar: tabela local pela chave, Recebimento de NF-e do Omie (ConsultarRecebimento) e contas a pagar do fornecedor
 * (ListarContasPagar) pelo número da nota e pelo código de integração. Código de integração determinístico por título:
 * "NFE-<chave>-<duplicata>" e "NFSE-<prestador>-<município>-<número>" (Nacional: "NFSE-<50 dígitos>").
 * Retenções da NFS-e: opção (ii) até a decisão do dono com o contador: valor do título = líquido e as retenções na observação.
 * Prévia + token + confirmação (caixa FIN_OMIE_LANCAR, sigilo). Títulos enviados um por vez; se um falhar, os anteriores ficam
 * registrados e a tela diz quantos faltam. Tabela FIN_OMIE_NOTAS_LANC (a FIN_OMIE_NOTAS antiga continua para a recepção documental).
 */
var OMIE_NOTA_PREFIXO = 'OMIE_NOTA_';
var OMIE_NOTA_ABA = 'FIN_OMIE_NOTAS_LANC';
var OMIE_NOTA_COLUNAS = ['ID', 'EM', 'CONTA_HASH', 'TIPO', 'CHAVE', 'NUMERO', 'EMITENTE_CNPJ', 'EMITENTE_NOME', 'EMISSAO', 'VALOR', 'STATUS', 'ARQUIVO_ID', 'XML_SHA256',
  'TITULOS_JSON', 'CAMPOS_MANUAIS', 'MOTIVO', 'CATEGORIA', 'LANCADA_POR', 'LANCADA_EM', 'ATUALIZADO_EM'];
// 16/11/2026: retenções da NFS-e configuráveis (OMIE_NFSE_RETENCOES em Chaves e senhas > Regras do Financeiro; SGO_Omie_Regras.js).
// OBSERVACAO (padrão): título pelo líquido, retenções na observação. CAMPOS_OMIE: título pelo valor do serviço e as retenções nos
// campos retem_* / valor_* da conta a pagar (a confirmar na primeira operação acompanhada que o Omie baixa pelo líquido).
function OmieNota_retencaoNosCampos_() { return typeof OmieRegras_retencoes_ === 'function' && OmieRegras_retencoes_() === 'CAMPOS_OMIE'; }
var OMIE_NOTA_CAMPOS_RETENCAO = { ir: ['retem_ir', 'valor_ir'], pis: ['retem_pis', 'valor_pis'], cofins: ['retem_cofins', 'valor_cofins'], csll: ['retem_csll', 'valor_csll'], iss: ['retem_iss', 'valor_iss'], inss: ['retem_inss', 'valor_inss'] };
function OmieNota_destinoAlerta_(l) {
  return l.tipo === 'compra' && typeof OmieRegras_destinoNfe_ === 'function' && OmieRegras_destinoNfe_() === 'FINANCEIRO_FISCAL'
    ? 'A configuração pede também o lançamento fiscal desta NF-e no Omie ("Financeiro e fiscal"), mas esse caminho ainda não existe no SGO+. Esta nota será lançada só no financeiro (contas a pagar). Combine com o contador como a nota entra no fiscal do Omie.' : '';
}
var OMIE_NOTA_XML_MAX = 1000000;

function OmieNota_s_(v, max) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200); }
function OmieNota_num_(v) { var t = String(v === null || v === undefined ? '' : v).trim(); if (!t) return NaN; var n = Number(t); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; }
function OmieNota_r2_(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function OmieNota_dataBr_(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function OmieNota_hojeBr_() { try { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy'); } catch (e) { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); } }
function OmieNota_ord_(br) { var m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? m[3] + m[2] + m[1] : ''; }
function OmieNota_empresa_() {
  var c = OmieCad_dig_(PropertiesService.getScriptProperties().getProperty('OMIE_EMPRESA_CNPJ'));
  if (!/^\d{14}$/.test(c)) OmieOps_erro_('Falta o CNPJ da empresa em Administração > Chaves e senhas > Omie ("CNPJ da empresa no Omie"). Sem ele o SGO+ não confere se a nota é da empresa. Nada foi lido; peça ao responsável pelo sistema para preencher.');
  return c;
}

// ---------------------------------------------------------------- leitura do XML (nome local, ignora namespace)
function OmieNota_raiz_(xml) {
  if (typeof xml !== 'string' || !xml.trim()) OmieOps_erro_('Escolha o arquivo XML da nota (o PDF não serve).');
  if (xml.length > OMIE_NOTA_XML_MAX) OmieOps_erro_('O XML passa de 1 MB. Confira se é o arquivo da nota (e não um pacote de notas).');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) OmieOps_erro_('XML com DTD ou entidades externas não é aceito (pode ser um arquivo adulterado).');
  try { return XmlService.parse(xml.replace(/^\uFEFF/, '')).getRootElement(); } catch (e) { OmieOps_erro_('O arquivo não é um XML válido. Baixe de novo o XML da nota.'); }
}
function OmieNota_nome_(n) { var s = String(n.getName()); return s.indexOf(':') >= 0 ? s.split(':').pop() : s; }
function OmieNota_filhos_(n, nome) { var c = n ? n.getChildren() : [], out = []; for (var i = 0; i < (c ? c.length : 0); i++) if (!nome || OmieNota_nome_(c[i]) === nome) out.push(c[i]); return out; }
function OmieNota_filho_(n, nome) { return OmieNota_filhos_(n, nome)[0] || null; }
function OmieNota_cam_(n, nomes) { for (var i = 0; n && i < nomes.length; i++) n = OmieNota_filho_(n, nomes[i]); return n || null; }
function OmieNota_txt_(n) { return n ? String(n.getText() || '').trim() : ''; }
function OmieNota_desc_(n, nome, lista) { lista = lista || []; OmieNota_filhos_(n).forEach(function (c) { if (OmieNota_nome_(c) === nome) lista.push(c); OmieNota_desc_(c, nome, lista); }); return lista; }
function OmieNota_prim_(n, nomes) { for (var i = 0; i < nomes.length; i++) { var l = OmieNota_desc_(n, nomes[i]); if (l.length) return l[0]; } return null; }
function OmieNota_ptxt_(n, nomes) { return OmieNota_txt_(OmieNota_prim_(n, nomes)); }
function OmieNota_attr_(n, nome) { try { var a = n && n.getAttribute(nome); return a ? String(a.getValue()) : ''; } catch (e) { return ''; } }

/** NF-e de compra (modelo 55). Erros públicos com o motivo e o que fazer. */
function OmieNota_lerNfe_(xml) {
  var raiz = OmieNota_raiz_(xml), nome = OmieNota_nome_(raiz);
  var nfe = nome === 'nfeProc' ? OmieNota_filho_(raiz, 'NFe') : nome === 'NFe' ? raiz : null;
  if (!nfe) OmieOps_erro_('Este arquivo não é o XML de uma NF-e (modelo 55). Se for uma nota de serviço, escolha "NFS-e" no tipo.');
  var inf = OmieNota_filho_(nfe, 'infNFe'), chave = OmieNota_attr_(inf, 'Id').replace(/^NFe/, '');
  if (!/^\d{44}$/.test(chave)) OmieOps_erro_('A chave de acesso da NF-e é inválida. Baixe de novo o XML no portal da SEFAZ ou peça ao fornecedor.');
  var prot = OmieNota_cam_(raiz, ['protNFe', 'infProt']);
  if (!prot || OmieNota_txt_(OmieNota_filho_(prot, 'cStat')) !== '100' || OmieNota_txt_(OmieNota_filho_(prot, 'chNFe')) !== chave) OmieOps_erro_('O XML não traz a autorização da SEFAZ (protocolo com situação 100). Peça ao fornecedor o XML "processado" (com o protocolo) ou baixe no portal da SEFAZ.');
  var ide = OmieNota_filho_(inf, 'ide'), t = function (n, k) { return OmieNota_txt_(OmieNota_filho_(n, k)); };
  if (t(ide, 'mod') !== '55') OmieOps_erro_('Só NF-e modelo 55 é lançada aqui.');
  var fin = t(ide, 'finNFe') || '1';
  if (fin !== '1') OmieOps_erro_({ '2': 'Esta é uma NF-e complementar', '3': 'Esta é uma NF-e de ajuste', '4': 'Esta é uma NF-e de devolução' }[fin] + ' (não é uma compra normal). Ela não vira conta a pagar pelo SGO+: confira com a contabilidade e trate no Omie.');
  var emp = OmieNota_empresa_(), dest = OmieNota_filho_(inf, 'dest');
  if (t(dest, 'CNPJ') !== emp) OmieOps_erro_('O destinatário desta NF-e não é a empresa (CNPJ diferente do configurado). Nota de outra empresa não é lançada. Confira o arquivo.');
  var emit = OmieNota_filho_(inf, 'emit'), end = OmieNota_filho_(emit, 'enderEmit');
  var tot = OmieNota_cam_(inf, ['total', 'ICMSTot']), cobr = OmieNota_filho_(inf, 'cobr'), fat = OmieNota_filho_(cobr, 'fat');
  var dups = OmieNota_filhos_(cobr, 'dup').map(function (d, i) { return { nDup: t(d, 'nDup') || String(i + 1), venc: OmieNota_dataBr_(t(d, 'dVenc')), valor: OmieNota_num_(t(d, 'vDup')) }; });
  var pag = OmieNota_filhos_(OmieNota_filho_(inf, 'pag'), 'detPag').map(function (d) { return { indPag: t(d, 'indPag'), tPag: t(d, 'tPag'), vPag: OmieNota_num_(t(d, 'vPag')) }; });
  var det = OmieNota_filhos_(inf, 'det');
  var l = { tipo: 'compra', chave: chave, numero: t(ide, 'nNF'), serie: t(ide, 'serie'), emissao: OmieNota_dataBr_(t(ide, 'dhEmi') || t(ide, 'dEmi')),
    emitente: { documento: t(emit, 'CNPJ') || t(emit, 'CPF'), cnpj: t(emit, 'CNPJ') || t(emit, 'CPF'), nome: OmieNota_s_(t(emit, 'xNome'), 120), razao: OmieNota_s_(t(emit, 'xNome'), 120), fantasia: OmieNota_s_(t(emit, 'xFant'), 100), ie: t(emit, 'IE'), crt: t(emit, 'CRT'),
      logradouro: t(end, 'xLgr'), numero: t(end, 'nro'), complemento: t(end, 'xCpl'), bairro: t(end, 'xBairro'), codMunicipio: t(end, 'cMun'), cidade: t(end, 'xMun'), uf: t(end, 'UF'), cep: t(end, 'CEP'), telefone: t(end, 'fone') },
    vNF: OmieNota_num_(t(tot, 'vNF')), fat: fat ? { nFat: t(fat, 'nFat'), vOrig: OmieNota_num_(t(fat, 'vOrig')), vDesc: OmieNota_num_(t(fat, 'vDesc')), vLiq: OmieNota_num_(t(fat, 'vLiq')) } : null,
    dups: dups, pag: pag, vTroco: OmieNota_num_(t(OmieNota_filho_(inf, 'pag'), 'vTroco')) || 0, itens: det.length,
    descricoes: det.slice(0, 5).map(function (d) { return OmieNota_s_(OmieNota_txt_(OmieNota_cam_(d, ['prod', 'xProd'])), 80); }), faltando: [], alertas: [] };
  if (!/^\d{11,14}$/.test(l.emitente.cnpj)) OmieOps_erro_('O XML não traz o CNPJ/CPF do emitente. Confira o arquivo.');
  if (!isFinite(l.vNF) || l.vNF < 0) OmieOps_erro_('O total da NF-e (vNF) não foi lido. Confira o arquivo.');
  if (dups.some(function (d) { return !d.venc || !isFinite(d.valor) || d.valor <= 0; })) OmieOps_erro_('Uma das duplicatas da nota está sem vencimento ou sem valor. Confira o XML com o fornecedor.');
  return l;
}

function OmieNota_campo_(v, lido) { return { v: v, lido: !!lido }; }
/** NFS-e ABRASF ou Padrão Nacional. Não lança erro por campo que falta: devolve a lista "faltando" para a conferência manual. */
function OmieNota_lerNfse_(xml) {
  var raiz = OmieNota_raiz_(xml), emp = OmieNota_empresa_();
  var abrasf = OmieNota_nome_(raiz) === 'InfNfse' ? [raiz] : OmieNota_desc_(raiz, 'InfNfse'), nacional = OmieNota_nome_(raiz) === 'infNFSe' ? [raiz] : OmieNota_desc_(raiz, 'infNFSe');
  if (abrasf.length + nacional.length > 1) OmieOps_erro_('Este arquivo tem mais de uma NFS-e (consulta da prefeitura com várias notas). Lance uma nota por vez: baixe o XML só da nota que você quer lançar.');
  var c = {}, l = { tipo: 'nfse', layout: abrasf.length ? 'ABRASF' : nacional.length ? 'NACIONAL' : 'DESCONHECIDO', campos: c, faltando: [], alertas: [] };
  var n = function (v) { var x = OmieNota_num_(v); return isFinite(x) ? x : 0; };
  if (l.layout === 'ABRASF') {
    var inf = abrasf[0], prest = OmieNota_prim_(inf, ['PrestadorServico', 'Prestador']), toma = OmieNota_prim_(inf, ['TomadorServico', 'Tomador']);
    var pDoc = OmieNota_ptxt_(prest, ['Cnpj', 'Cpf']), tDoc = OmieNota_ptxt_(toma, ['Cnpj', 'Cpf']);
    var mun = OmieNota_txt_(OmieNota_cam_(inf, ['OrgaoGerador', 'CodigoMunicipio'])) || OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'CodigoMunicipio']));
    var num = OmieNota_txt_(OmieNota_filho_(inf, 'Numero')), emi = OmieNota_txt_(OmieNota_filho_(inf, 'DataEmissao')) || OmieNota_ptxt_(inf, ['DataEmissao']);
    var serv = OmieNota_ptxt_(inf, ['ValorServicos']), issRet = OmieNota_ptxt_(inf, ['IssRetido']) === '1';
    c.numero = OmieNota_campo_(num, !!num); c.verificacao = OmieNota_campo_(OmieNota_txt_(OmieNota_filho_(inf, 'CodigoVerificacao')), true);
    c.emissao = OmieNota_campo_(OmieNota_dataBr_(emi), !!OmieNota_dataBr_(emi)); c.competencia = OmieNota_campo_(OmieNota_dataBr_(OmieNota_ptxt_(inf, ['Competencia'])), true);
    c.municipio = OmieNota_campo_(mun, /^\d{7}$/.test(mun)); c.prestadorCnpj = OmieNota_campo_(pDoc, /^\d{11,14}$/.test(pDoc));
    c.prestadorNome = OmieNota_campo_(OmieNota_s_(OmieNota_ptxt_(prest, ['RazaoSocial']), 120), !!OmieNota_ptxt_(prest, ['RazaoSocial'])); c.tomadorCnpj = OmieNota_campo_(tDoc, /^\d{11,14}$/.test(tDoc));
    c.servicos = OmieNota_campo_(OmieNota_num_(serv), isFinite(OmieNota_num_(serv)));
    c.ir = OmieNota_campo_(n(OmieNota_ptxt_(inf, ['ValorIr'])), true); c.pis = OmieNota_campo_(n(OmieNota_ptxt_(inf, ['ValorPis'])), true); c.cofins = OmieNota_campo_(n(OmieNota_ptxt_(inf, ['ValorCofins'])), true);
    c.inss = OmieNota_campo_(n(OmieNota_ptxt_(inf, ['ValorInss'])), true); c.csll = OmieNota_campo_(n(OmieNota_ptxt_(inf, ['ValorCsll'])), true);
    c.iss = OmieNota_campo_(issRet ? n(OmieNota_ptxt_(inf, ['ValorIssRetido']) || OmieNota_ptxt_(inf, ['ValorIss'])) : 0, true);
    c.desconto = OmieNota_campo_(n(OmieNota_ptxt_(inf, ['DescontoIncondicionado'])), true);
    l.liquidoXml = OmieNota_num_(OmieNota_ptxt_(inf, ['ValorLiquidoNfse']));
    l.endereco = { logradouro: OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'Endereco'])) || OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'Logradouro'])), numero: OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'Numero'])), bairro: OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'Bairro'])), uf: OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'Uf'])), cep: OmieNota_txt_(OmieNota_cam_(prest, ['Endereco', 'Cep'])), im: OmieNota_ptxt_(prest, ['InscricaoMunicipal']) };
  } else if (l.layout === 'NACIONAL') {
    var nf = nacional[0], id = OmieNota_attr_(nf, 'Id').replace(/^NFS/, ''), dps = OmieNota_cam_(nf, ['DPS', 'infDPS']);
    var em = OmieNota_filho_(nf, 'emit'), tm = OmieNota_filho_(dps, 'toma'), val = OmieNota_filho_(nf, 'valores'), trib = OmieNota_cam_(dps, ['valores', 'trib']);
    var tribFed = OmieNota_filho_(trib, 'tribFed'), pc = OmieNota_filho_(tribFed, 'piscofins'), ret = OmieNota_txt_(OmieNota_filho_(pc, 'tpRetPisCofins')) === '1';
    var emD = OmieNota_txt_(OmieNota_filho_(em, 'CNPJ')) || OmieNota_txt_(OmieNota_filho_(em, 'CPF')), tmD = OmieNota_txt_(OmieNota_filho_(tm, 'CNPJ')) || OmieNota_txt_(OmieNota_filho_(tm, 'CPF'));
    var nn = OmieNota_txt_(OmieNota_filho_(nf, 'nNFSe')), dh = OmieNota_txt_(OmieNota_filho_(nf, 'dhProc')) || OmieNota_txt_(OmieNota_filho_(dps, 'dhEmi'));
    var vs = OmieNota_num_(OmieNota_txt_(OmieNota_cam_(dps, ['valores', 'vServPrest', 'vServ'])));
    l.chaveNacional = /^\d{50}$/.test(id) ? id : '';
    c.numero = OmieNota_campo_(nn, !!nn); c.emissao = OmieNota_campo_(OmieNota_dataBr_(dh), !!OmieNota_dataBr_(dh)); c.competencia = OmieNota_campo_(OmieNota_dataBr_(OmieNota_txt_(OmieNota_filho_(dps, 'dCompet'))), true);
    var munN = OmieNota_txt_(OmieNota_filho_(nf, 'cLocIncid')) || OmieNota_txt_(OmieNota_filho_(dps, 'cLocEmi'));
    c.municipio = OmieNota_campo_(munN, /^\d{7}$/.test(munN) || !!l.chaveNacional);
    c.prestadorCnpj = OmieNota_campo_(emD, /^\d{11,14}$/.test(emD)); c.prestadorNome = OmieNota_campo_(OmieNota_s_(OmieNota_txt_(OmieNota_filho_(em, 'xNome')), 120), !!OmieNota_txt_(OmieNota_filho_(em, 'xNome')));
    c.tomadorCnpj = OmieNota_campo_(tmD, /^\d{11,14}$/.test(tmD)); c.servicos = OmieNota_campo_(vs, isFinite(vs));
    c.ir = OmieNota_campo_(n(OmieNota_txt_(OmieNota_filho_(tribFed, 'vRetIRRF'))), true); c.csll = OmieNota_campo_(n(OmieNota_txt_(OmieNota_filho_(tribFed, 'vRetCSLL'))), true);
    c.inss = OmieNota_campo_(n(OmieNota_txt_(OmieNota_filho_(tribFed, 'vRetCP'))), true);
    c.pis = OmieNota_campo_(ret ? n(OmieNota_txt_(OmieNota_filho_(pc, 'vPis'))) : 0, true); c.cofins = OmieNota_campo_(ret ? n(OmieNota_txt_(OmieNota_filho_(pc, 'vCofins'))) : 0, true);
    var issR = OmieNota_txt_(OmieNota_cam_(trib, ['tribMun', 'tpRetISSQN'])) === '2';
    c.iss = OmieNota_campo_(issR ? n(OmieNota_txt_(OmieNota_filho_(val, 'vISSQN'))) : 0, true);
    c.desconto = OmieNota_campo_(n(OmieNota_txt_(OmieNota_cam_(dps, ['valores', 'vDescCondIncond', 'vDescIncond']))), true);
    l.liquidoXml = OmieNota_num_(OmieNota_txt_(OmieNota_filho_(val, 'vLiq')));
    l.endereco = {};
  } else {
    ['numero', 'emissao', 'municipio', 'prestadorCnpj', 'prestadorNome', 'tomadorCnpj', 'servicos'].forEach(function (k) { c[k] = OmieNota_campo_('', false); });
    ['ir', 'pis', 'cofins', 'inss', 'csll', 'iss', 'desconto'].forEach(function (k) { c[k] = OmieNota_campo_(0, false); });
    c.verificacao = OmieNota_campo_('', true); c.competencia = OmieNota_campo_('', true);
    l.liquidoXml = NaN; l.endereco = {};
    l.alertas.push('O formato desta NFS-e não foi reconhecido (a prefeitura usa um layout próprio). Digite os dados como estão no PDF da nota e confira.');
  }
  if (c.tomadorCnpj.lido && c.tomadorCnpj.v !== emp) OmieOps_erro_('O tomador desta NFS-e não é a empresa (CNPJ diferente do configurado). Nota de serviço contratado por outra empresa não é lançada. Confira o arquivo.');
  OmieNota_completarNfse_(l);
  return l;
}
var OMIE_NOTA_ROTULOS = { numero: 'número da nota', emissao: 'data de emissão', municipio: 'código do município (7 números)', prestadorCnpj: 'CNPJ/CPF do prestador', prestadorNome: 'nome do prestador', tomadorCnpj: 'CNPJ do tomador', servicos: 'valor dos serviços',
  ir: 'IR retido', pis: 'PIS retido', cofins: 'COFINS retido', inss: 'INSS retido', csll: 'CSLL retido', iss: 'ISS retido', desconto: 'desconto incondicionado', liquido: 'valor líquido' };
/** Recalcula faltando, líquido, chave e o resumo do emitente depois da leitura ou da conferência manual. */
function OmieNota_completarNfse_(l) {
  var c = l.campos;
  l.faltando = Object.keys(OMIE_NOTA_ROTULOS).filter(function (k) { return c[k] && !c[k].lido; }).map(function (k) { return OMIE_NOTA_ROTULOS[k]; });
  l.retencoes = { ir: OmieNota_r2_(c.ir.v), pis: OmieNota_r2_(c.pis.v), cofins: OmieNota_r2_(c.cofins.v), inss: OmieNota_r2_(c.inss.v), csll: OmieNota_r2_(c.csll.v), iss: OmieNota_r2_(c.iss.v) };
  var totalRet = OmieNota_r2_(l.retencoes.ir + l.retencoes.pis + l.retencoes.cofins + l.retencoes.inss + l.retencoes.csll + l.retencoes.iss);
  l.totalRetencoes = totalRet;
  l.liquidoCalculado = isFinite(Number(c.servicos.v)) && c.servicos.lido ? OmieNota_r2_(Number(c.servicos.v) - totalRet - OmieNota_r2_(c.desconto.v)) : NaN;
  l.diferenca = isFinite(l.liquidoXml) && isFinite(l.liquidoCalculado) && Math.abs(l.liquidoXml - l.liquidoCalculado) > 0.01;
  if (l.diferenca && !l.liquidoConferido) { if (l.faltando.indexOf(OMIE_NOTA_ROTULOS.liquido) < 0) l.faltando.push(OMIE_NOTA_ROTULOS.liquido); }
  l.liquido = l.liquidoConferido ? l.liquidoConferido : l.liquidoCalculado;
  l.numero = OmieNota_s_(c.numero.v, 30); l.emissao = c.emissao.v;
  var doc = OmieCad_dig_(c.prestadorCnpj.v), mun = OmieCad_dig_(c.municipio.v);
  l.emitente = { documento: doc, cnpj: doc, nome: OmieNota_s_(c.prestadorNome.v, 120), razao: OmieNota_s_(c.prestadorNome.v, 120), codMunicipio: /^\d{7}$/.test(mun) ? mun : '',
    logradouro: (l.endereco || {}).logradouro || '', numero: (l.endereco || {}).numero || '', bairro: (l.endereco || {}).bairro || '', uf: (l.endereco || {}).uf || '', cep: (l.endereco || {}).cep || '', im: (l.endereco || {}).im || '' };
  var numChave = String(l.numero).replace(/[^0-9A-Za-z]/g, '').slice(0, 20);
  l.chave = l.chaveNacional ? 'NFSE-' + l.chaveNacional : (/^\d{11,14}$/.test(doc) && /^\d{7}$/.test(mun) && numChave ? 'NFSE-' + doc + '-' + mun + '-' + numChave : '');
  l.vNF = l.liquido;
  return l;
}
/** Aplica o que a pessoa digitou SÓ nos campos não lidos (o lido do XML não é trocado). Devolve a lista dos campos digitados. */
function OmieNota_aplicarManual_(l, manual) {
  manual = manual || {}; var c = l.campos, usados = [], emp = OmieNota_empresa_();
  Object.keys(OMIE_NOTA_ROTULOS).forEach(function (k) {
    if (k === 'liquido') return;
    if (!c[k] || c[k].lido) return;
    var bruto = manual[k];
    if (bruto === undefined || bruto === null || String(bruto).trim() === '') return;
    var v = String(bruto).trim();
    if (k === 'numero') { v = OmieNota_s_(v, 30); if (!/^[0-9A-Za-z.\-\/]{1,30}$/.test(v)) OmieOps_erro_('Número da nota inválido.'); }
    else if (k === 'emissao') { v = OmieOps_data_(v); }
    else if (k === 'municipio') { v = OmieCad_dig_(v); if (!/^\d{7}$/.test(v)) OmieOps_erro_('O código do município tem 7 números (código IBGE, está no PDF da nota ou no site do IBGE).'); }
    else if (k === 'prestadorCnpj' || k === 'tomadorCnpj') { v = OmieCad_dig_(v); if (!OmieCad_docOk_(v)) OmieOps_erro_('O ' + OMIE_NOTA_ROTULOS[k] + ' digitado não confere (dígitos verificadores).'); if (k === 'tomadorCnpj' && v !== emp) OmieOps_erro_('O tomador digitado não é a empresa. Nota de serviço contratado por outra empresa não é lançada.'); }
    else if (k === 'prestadorNome') { v = OmieNota_s_(v, 120); if (v.length < 3) OmieOps_erro_('Digite o nome do prestador.'); }
    else { v = OmieOps_num_(String(v).replace(/\./g, '').replace(',', '.'), OMIE_NOTA_ROTULOS[k], true); }
    c[k] = { v: v, lido: true, manual: true }; usados.push(k);
  });
  if (l.diferenca && manual.liquido !== undefined && String(manual.liquido).trim() !== '') {
    l.liquidoConferido = OmieOps_num_(String(manual.liquido).replace(/\./g, '').replace(',', '.'), 'o valor líquido conferido'); usados.push('liquido');
  }
  OmieNota_completarNfse_(l);
  return usados;
}
/** Leitura para o cadastro do fornecedor (SGO_Omie_Cadastro.js). NFS-e sem o CNPJ do prestador não serve para cadastrar. */
function OmieNota_lerQualquer_(xml, tipo) {
  var l = tipo === 'nfse' ? OmieNota_lerNfse_(xml) : OmieNota_lerNfe_(xml);
  if (!/^\d{11,14}$/.test(OmieCad_dig_(l.emitente.cnpj))) OmieOps_erro_('O CNPJ do prestador não foi lido do XML. Cadastre pelo botão "Cadastrar no Omie" da busca, digitando os dados.');
  return l;
}

// ---------------------------------------------------------------- tabela local
function OmieNota_garantirAba_() { try { if (typeof CertCal_garantirTabela_ === 'function') CertCal_garantirTabela_(OMIE_NOTA_ABA, OMIE_NOTA_COLUNAS); } catch (e) {} }
function OmieNota_linhas_() { try { return SGO_DATA.getAll(OMIE_NOTA_ABA) || []; } catch (e) { return []; } }
function OmieNota_conta_() { return OmieOps_empresa_(); }
function OmieNota_registro_(chave) { var conta = OmieNota_conta_(); return OmieNota_linhas_().filter(function (r) { return String(r.CHAVE) === chave && String(r.CONTA_HASH) === conta; })[0] || null; }
function OmieNota_titulosFeitos_(reg) { try { return JSON.parse(String(reg && reg.TITULOS_JSON || '[]')) || []; } catch (e) { return []; } }

// ---------------------------------------------------------------- conferências no Omie
function OmieNota_fornecedor_(doc) {
  var a = OmieCad_procurar_(doc, false);
  if (a.ativos.length === 1) { var f = a.ativos[0]; return { situacao: 'ok', codigo: f.codigo, nome: f.nome, temTag: f.tags.map(function (x) { return x.toLowerCase(); }).indexOf('fornecedor') >= 0 }; }
  if (a.ativos.length > 1) return { situacao: 'varios', texto: 'Há ' + a.ativos.length + ' cadastros ativos no Omie com este CNPJ. Unifique no Omie (deixe um ativo) antes de lançar.' };
  if (a.inativos) return { situacao: 'inativo', texto: 'O fornecedor está cadastrado no Omie, mas inativo. Reative no Omie (Clientes e Fornecedores) antes de lançar.' };
  return { situacao: 'nenhum', texto: 'O fornecedor não está cadastrado no Omie. Toque em "Cadastrar no Omie": os dados vêm da própria nota.' };
}
/** Duplicidade no Omie. refs: códigos de integração deste lançamento. Devolve { bloqueios, alertas, jaNoOmie: {ref: codigo} } */
function OmieNota_duplicidade_(l, forn, refs) {
  var out = { bloqueios: [], alertas: [], jaNoOmie: {} };
  if (l.tipo === 'compra') {
    try {
      var rec = Omie_requisitar_('produtos/recebimentonfe/', 'ConsultarRecebimento', { cChaveNfe: l.chave }) || {};
      var tit = ((rec.parcelas && rec.parcelas.parcelasLista) || []).filter(function (p) { return Number(p.nIdTitulo) > 0; });
      if (tit.length) out.bloqueios.push('Esta nota já está no Omie (Recebimento de NF-e) com ' + tit.length + ' título(s) gerado(s). Não lance de novo: confira em Contas a pagar no Omie.');
      else if (Object.keys(rec).length) out.alertas.push('A nota está no Omie aguardando a conclusão do Recebimento de NF-e. Se concluírem lá, os títulos serão gerados em dobro: combine com quem faz o recebimento no Omie.');
    } catch (e) {
      if (e && e.omieRecusado) out.alertas.push('O Recebimento de NF-e do Omie não tem esta nota (ou a conta não usa esse recurso; a confirmar na primeira operação).');
      else out.bloqueios.push('Não foi possível conferir no Omie se esta nota já está no Recebimento de NF-e. Nada foi preparado; tente de novo em 1 minuto.');
    }
  }
  if (forn && forn.situacao === 'ok') {
    try {
      var lista = (Omie_requisitar_('financas/contapagar/', 'ListarContasPagar', OmieNota_paramListar_(l, forn.codigo)) || {}).conta_pagar_cadastro || [];
      lista.forEach(function (t) {
        var ref = String(t.codigo_lancamento_integracao || '');
        if (refs.indexOf(ref) >= 0) { out.jaNoOmie[ref] = Number(t.codigo_lancamento_omie) || 0; return; }
        if ((l.tipo === 'compra' && String(t.chave_nfe || '') === l.chave) || (String(t.numero_documento_fiscal || '') === String(l.numero) && String(l.numero))) {
          out.bloqueios.push('Já existe no Omie uma conta a pagar deste fornecedor com a nota ' + l.numero + ' (lançada fora do SGO+, documento ' + OmieNota_s_(t.numero_documento || t.numero_documento_fiscal, 30) + '). Não lance de novo.');
        }
      });
    } catch (e) {
      if (e && e.omieRecusado) out.alertas.push('O Omie não aceitou a consulta das contas a pagar do fornecedor (' + OmieNota_s_(e.message, 120) + '); a conferência de duplicidade ficou só pela nota.');
      else out.bloqueios.push('Não foi possível conferir as contas a pagar do fornecedor no Omie. Nada foi preparado; tente de novo em 1 minuto.');
    }
  }
  out.bloqueios = out.bloqueios.filter(function (x, i, a) { return a.indexOf(x) === i; });
  return out;
}
/** Contas a pagar do fornecedor emitidas no dia da nota (a mesma consulta na leitura, na prévia e depois de lançar). */
function OmieNota_paramListar_(l, codigoFornecedor) {
  var p = { pagina: 1, registros_por_pagina: 100, apenas_importado_api: 'N', filtrar_cliente: codigoFornecedor };
  if (l.emissao) { p.filtrar_por_emissao_de = l.emissao; p.filtrar_por_emissao_ate = l.emissao; }
  return p;
}
function OmieNota_sugestaoCategoria_(doc) {
  var l = OmieNota_linhas_().filter(function (r) { return OmieCad_dig_(r.EMITENTE_CNPJ) === doc && OmieNota_s_(r.CATEGORIA); });
  return l.length ? OmieNota_s_(l[l.length - 1].CATEGORIA, 20) : '';
}

// ---------------------------------------------------------------- montagem dos títulos
function OmieNota_ler_(p) {
  var tipo = p.tipo === 'nfse' ? 'nfse' : p.tipo === 'compra' ? 'compra' : '';
  if (!tipo) OmieOps_erro_('Escolha o tipo da nota: NF-e de compra ou NFS-e.');
  var l = tipo === 'compra' ? OmieNota_lerNfe_(p.xml) : OmieNota_lerNfse_(p.xml);
  l.manuais = tipo === 'nfse' ? OmieNota_aplicarManual_(l, p.manual) : [];
  if (l.manuais.length && OmieNota_s_(p.motivoManual).length < 10) l.faltaMotivoManual = true;
  return l;
}
function OmieNota_refs_(l, n) {
  if (l.tipo === 'nfse') return [l.chave.slice(0, 60)];
  var refs = [];
  for (var i = 0; i < n; i++) {
    var d = l.dups[i], nd = d ? String(d.nDup).replace(/[^0-9A-Za-z]/g, '') : '';
    refs.push(('NFE-' + l.chave + '-' + (nd && nd.length <= 11 ? nd : ('00' + (i + 1)).slice(-3))).slice(0, 60));
  }
  return refs;
}
/** Títulos a lançar. Sem duplicata: um título com o vencimento da tela. tPag 90 ou vNF 0: nenhum (Registrada sem título). */
function OmieNota_titulos_(l, p, alertas) {
  if (l.tipo === 'compra') {
    var semPag = l.pag.length && l.pag.every(function (x) { return x.tPag === '90'; });
    if (semPag || !(l.vNF > 0)) return { semTitulo: true, motivo: semPag ? 'Nota sem pagamento (forma 90: remessa, bonificação ou demonstração).' : 'Nota com valor total zero.', lista: [] };
    var lista;
    if (l.dups.length) {
      lista = l.dups.map(function (d) { return { venc: d.venc, valor: d.valor }; });
      var soma = OmieNota_r2_(lista.reduce(function (s, x) { return s + x.valor; }, 0)), alvo = l.fat && isFinite(l.fat.vLiq) ? l.fat.vLiq : l.vNF;
      if (Math.abs(soma - alvo) > 0.01) {
        if (OmieNota_s_(p.motivoDiferenca).length < 10) OmieOps_erro_('A soma das parcelas (' + OmieOps_moeda_(soma) + ') é diferente do total a pagar da nota (' + OmieOps_moeda_(alvo) + '). Explique o motivo no campo "Motivo da diferença" (pelo menos 10 letras) e confira de novo.');
        alertas.push('Soma das parcelas diferente do total da nota: ' + OmieOps_moeda_(soma) + ' × ' + OmieOps_moeda_(alvo) + '. Motivo: ' + OmieNota_s_(p.motivoDiferenca, 200));
      }
    } else {
      var aVista = l.pag.some(function (x) { return x.indPag === '0'; });
      var venc = p.vencimento ? OmieOps_data_(p.vencimento) : (aVista ? l.emissao : '');
      if (!venc) OmieOps_erro_('Esta nota não traz parcelas. Informe o vencimento (a data do boleto ou a combinada com o fornecedor) e confira de novo.');
      var vpag = OmieNota_r2_(l.pag.reduce(function (s, x) { return s + (isFinite(x.vPag) ? x.vPag : 0); }, 0) - (l.vTroco || 0));
      lista = [{ venc: venc, valor: vpag > 0 && Math.abs(vpag - l.vNF) > 0.01 ? vpag : l.vNF }];
    }
    return { semTitulo: false, lista: lista };
  }
  if (!p.vencimento) OmieOps_erro_('A NFS-e não traz vencimento. Informe a data do boleto ou a combinada com o prestador e confira de novo.');
  if (!(l.liquido > 0)) OmieOps_erro_('O valor líquido a pagar desta NFS-e ficou zero ou negativo. Confira os valores e as retenções.');
  return { semTitulo: false, lista: [{ venc: OmieOps_data_(p.vencimento), valor: l.liquido }] };
}
function OmieNota_obs_(l, i, n, eu) {
  var partes = [OmieNota_s_(l.emitente.nome, 60), (l.tipo === 'compra' ? 'NF ' + l.numero + (l.serie ? ' série ' + l.serie : '') : 'NFS-e ' + l.numero), 'parcela ' + (i + 1) + '/' + n];
  if (l.tipo === 'nfse' && l.totalRetencoes > 0) {
    var r = l.retencoes, nomes = { ir: 'IR', pis: 'PIS', cofins: 'COFINS', inss: 'INSS', csll: 'CSLL', iss: 'ISS' };
    partes.push('Serviço ' + OmieOps_moeda_(l.campos.servicos.v) + '; retenções ' + Object.keys(nomes).filter(function (k) { return r[k] > 0; }).map(function (k) { return nomes[k] + ' ' + OmieOps_moeda_(r[k]); }).join(', ') + (OmieNota_retencaoNosCampos_() ? '; retenções também nos campos de impostos retidos do Omie' : '; título pelo líquido'));
  }
  partes.push('lançada pelo SGO+ (' + OmieNota_s_(eu.nome || eu.usuario, 60) + ')');
  return partes.map(OmieOps_obs_).join(' | ').slice(0, 1000); // cada parte sem | nem quebra; as partes separadas por | (M4)
}

/** Leitura da nota, sem gravar: o que foi lido, o fornecedor no Omie, alertas e bloqueios. payload: { xml, tipo, manual } */
function OmieNota_apiLer(sessionId, payload) {
  return OmieOps_resposta_(function () {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'conferir a nota recebida');
    var p = payload || {}, l = OmieNota_ler_(p), alertas = l.alertas.slice(), bloqueios = [], forn = null, reg = null;
    var doc = OmieCad_dig_(l.emitente.cnpj);
    if (/^\d{11,14}$/.test(doc)) forn = OmieNota_fornecedor_(doc);
    if (l.chave) {
      reg = OmieNota_registro_(l.chave);
      if (reg && /^(LANCADA|SEM_TITULO)$/.test(String(reg.STATUS))) bloqueios.push('Esta nota já foi ' + (String(reg.STATUS) === 'SEM_TITULO' ? 'registrada sem título' : 'lançada') + ' pelo SGO+ em ' + OmieNota_s_(reg.LANCADA_EM, 20) + ' por ' + OmieNota_s_(reg.LANCADA_POR, 60) + '. Não lance de novo.');
    }
    if (l.chave && forn && !bloqueios.length) {
      var n = l.tipo === 'compra' ? Math.max(1, l.dups.length) : 1, dup = OmieNota_duplicidade_(l, forn, OmieNota_refs_(l, n));
      bloqueios = bloqueios.concat(dup.bloqueios); alertas = alertas.concat(dup.alertas);
    }
    alertas.push('A autenticidade e a situação atual da nota (cancelada depois de autorizada) não são verificadas na SEFAZ ou na prefeitura.');
    var destino = OmieNota_destinoAlerta_(l); if (destino) alertas.unshift(destino);
    // 16/11/2026: categoria sugerida pelo de-para das Regras do Financeiro; sem regra, a última usada para o mesmo fornecedor
    var sug = typeof OmieRegras_sugerir_ === 'function' ? OmieRegras_sugerir_(l.tipo === 'compra' ? 'NFE_COMPRA' : 'NFSE', doc) : null;
    return { leitura: OmieNota_tela_(l), fornecedor: forn, alertas: alertas, bloqueios: bloqueios, categoriaSugerida: sug ? sug.categoria : (/^\d{11,14}$/.test(doc) ? OmieNota_sugestaoCategoria_(doc) : ''),
      categoriaOrigem: sug ? sug.origem : '', destinoFiscal: !!destino, retencaoNosCampos: l.tipo === 'nfse' && OmieNota_retencaoNosCampos_(),
      parcial: !!(reg && String(reg.STATUS) === 'LANCADA_PARCIAL'), feitos: reg ? OmieNota_titulosFeitos_(reg).length : 0 };
  });
}
/** O que a tela mostra da leitura: textos e números (nada de Date cru, nada do XML). */
function OmieNota_tela_(l) {
  var t = { tipo: l.tipo, chave: l.chave, numero: l.numero, serie: l.serie || '', emissao: l.emissao, emitente: { cnpj: OmieCad_docFmt_(l.emitente.cnpj), nome: l.emitente.nome }, faltando: l.faltando, manuais: l.manuais || [] };
  if (l.tipo === 'compra') {
    t.total = l.vNF; t.fatura = l.fat ? { liquido: l.fat.vLiq, desconto: l.fat.vDesc } : null; t.parcelas = l.dups.map(function (d) { return { numero: d.nDup, vencimento: d.venc, valor: d.valor }; });
    t.semParcela = !l.dups.length; t.aVista = l.pag.some(function (x) { return x.indPag === '0'; }); t.itens = l.itens; t.descricoes = l.descricoes;
    t.semPagamento = l.pag.length > 0 && l.pag.every(function (x) { return x.tPag === '90'; });
  } else {
    t.layout = l.layout; t.campos = {};
    Object.keys(OMIE_NOTA_ROTULOS).forEach(function (k) { if (l.campos[k]) t.campos[k] = { valor: l.campos[k].v, lido: !!l.campos[k].lido, manual: !!l.campos[k].manual, rotulo: OMIE_NOTA_ROTULOS[k] }; });
    t.retencoes = l.retencoes; t.totalRetencoes = l.totalRetencoes; t.liquidoCalculado = isFinite(l.liquidoCalculado) ? l.liquidoCalculado : null;
    t.liquidoXml = isFinite(l.liquidoXml) ? l.liquidoXml : null; t.diferenca = !!l.diferenca; t.liquido = isFinite(l.liquido) ? l.liquido : null;
  }
  return t;
}

/** Prévia do lançamento. payload: { xml, tipo, categoria, contaId, vencimento, manual, motivoManual, motivoDiferenca } */
function OmieNota_apiPrevia(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'preparar o lançamento da nota'), p = payload || {}, empresa = OmieOps_empresa_();
    var l = OmieNota_ler_(p), alertas = [];
    if (l.faltando.length) OmieOps_erro_('Falta conferir: ' + l.faltando.join(', ') + '. Digite esses dados como estão no PDF da nota e confira de novo.');
    if (l.faltaMotivoManual) OmieOps_erro_('Você digitou dados que não vieram do XML. Escreva o motivo (pelo menos 10 letras), por exemplo "prefeitura usa layout próprio; dados conferidos no PDF".');
    if (!l.chave) OmieOps_erro_('Não foi possível montar a identificação única desta nota (prestador, município e número). Confira esses campos.');
    var doc = OmieCad_dig_(l.emitente.cnpj), forn = OmieNota_fornecedor_(doc);
    if (forn.situacao !== 'ok') OmieOps_erro_(forn.texto);
    var reg = OmieNota_registro_(l.chave);
    if (reg && /^(LANCADA|SEM_TITULO)$/.test(String(reg.STATUS))) OmieOps_erro_('Esta nota já foi lançada pelo SGO+. Nada foi preparado.');
    var tt = OmieNota_titulos_(l, p, alertas), n = tt.lista.length, refs = OmieNota_refs_(l, Math.max(1, n)), feitos = OmieNota_titulosFeitos_(reg).map(function (x) { return x.ref; });
    var dup = tt.semTitulo ? { bloqueios: [], alertas: [], jaNoOmie: {} } : OmieNota_duplicidade_(l, forn, refs);
    if (dup.bloqueios.length) OmieOps_erro_(dup.bloqueios.join(' '));
    alertas = alertas.concat(dup.alertas);
    var cat = null, conta = null, titulos = [];
    if (!tt.semTitulo) {
      var codCat = OmieNota_s_(p.categoria, 20), contaId = OmieOps_id_(p.contaId);
      if (!codCat) OmieOps_erro_('Escolha a categoria da despesa (só aparecem categorias de despesa).');
      cat = Omie_requisitar_('geral/categorias/', 'ConsultarCategoria', { codigo: codCat }); OmieOps_conferirCategoria_(cat, 'pagar', codCat);
      conta = Omie_requisitar_('geral/contacorrente/', 'ConsultarContaCorrente', { nCodCC: contaId });
      if (!conta || !OmieNota_s_(conta.descricao)) OmieOps_erro_('Não foi possível conferir a conta corrente escolhida. Atualize a lista e escolha de novo.');
      var hoje = OmieNota_ord_(OmieNota_hojeBr_()), vencidas = 0;
      tt.lista.forEach(function (x, i) {
        var ref = refs[i], parcela = ('00' + (i + 1)).slice(-3) + '/' + ('00' + n).slice(-3);
        if (OmieNota_ord_(x.venc) < hoje) vencidas++;
        var param = { codigo_lancamento_integracao: ref, codigo_cliente_fornecedor: forn.codigo, codigo_categoria: codCat, id_conta_corrente: contaId, data_vencimento: x.venc, data_previsao: x.venc,
          valor_documento: OmieNota_r2_(x.valor), numero_documento_fiscal: OmieNota_s_(l.numero, 20), numero_documento: OmieNota_s_((l.tipo === 'compra' ? 'NF ' + l.numero + (l.serie ? '/' + l.serie : '') : 'NFS-e ' + l.numero), 20),
          numero_parcela: parcela, data_emissao: l.emissao || OmieNota_hojeBr_(), observacao: OmieNota_obs_(l, i, n, eu) };
        if (l.tipo === 'compra') param.chave_nfe = l.chave;
        if (l.tipo === 'nfse' && OmieNota_retencaoNosCampos_()) {
          // opção (i): o título leva o valor do serviço (menos o desconto incondicionado) e cada retenção no campo próprio do Omie
          param.valor_documento = OmieNota_r2_(Number(l.campos.servicos.v) - OmieNota_r2_(l.campos.desconto.v));
          Object.keys(OMIE_NOTA_CAMPOS_RETENCAO).forEach(function (k) { if (l.retencoes[k] > 0) { param[OMIE_NOTA_CAMPOS_RETENCAO[k][0]] = 'S'; param[OMIE_NOTA_CAMPOS_RETENCAO[k][1]] = l.retencoes[k]; } });
        }
        titulos.push({ ref: ref, parcela: parcela, venc: x.venc, valor: param.valor_documento, param: param, jaNoOmie: dup.jaNoOmie[ref] || 0, feito: feitos.indexOf(ref) >= 0 });
      });
      if (vencidas) alertas.push(vencidas + ' parcela(s) com vencimento antes de hoje. O Omie pode recusar vencimento no passado (a confirmar na primeira operação); se recusar, nada é feito e a tela mostra o motivo.');
    }
    var destinoAl = OmieNota_destinoAlerta_(l); if (destinoAl) alertas.unshift(destinoAl);
    var token = Utilities.getUuid(), agora = Date.now();
    var op = { tipo: l.tipo, chave: l.chave, numero: l.numero, emissao: l.emissao, emitente: { cnpj: doc, nome: l.emitente.nome }, valor: l.tipo === 'compra' ? l.vNF : l.liquido, semTitulo: tt.semTitulo, motivoSemTitulo: tt.motivo || '',
      categoria: cat ? OmieNota_s_(p.categoria, 20) : '', categoriaNome: cat ? OmieNota_s_(cat.descricao, 80) : '', contaNome: conta ? OmieNota_s_(conta.descricao, 80) : '', titulos: titulos, manuais: l.manuais,
      motivo: OmieNota_s_([p.motivoManual, p.motivoDiferenca].filter(Boolean).join(' · '), 300), xmlSha: OmieOps_hash_(p.xml), vinculo: OmieOps_vinculo_(sessionId, eu), empresa: empresa, expira: agora + 10 * 60000, estado: 'pendente' };
    var resumo = [['Nota', (l.tipo === 'compra' ? 'NF-e ' + l.numero + (l.serie ? ' série ' + l.serie : '') : 'NFS-e ' + l.numero) + ' · emitida em ' + (l.emissao || 'data não lida')], ['Fornecedor', forn.nome + ' · ' + OmieCad_docFmt_(doc) + (forn.temTag ? '' : ' (no Omie sem a tag Fornecedor)')]];
    if (l.tipo === 'nfse' && OmieNota_retencaoNosCampos_()) resumo.push(['Valor dos serviços', OmieOps_moeda_(l.campos.servicos.v)], ['Retenções', OmieOps_moeda_(l.totalRetencoes) + ' nos campos de impostos retidos do Omie (configuração "Retenções nos campos do Omie"; a confirmar na primeira operação acompanhada que o Omie baixa pelo líquido)'], ['Valor do título no Omie', OmieOps_moeda_(titulos.length ? titulos[0].valor : 0) + ' (o valor a pagar ao prestador continua sendo o líquido: ' + OmieOps_moeda_(l.liquido) + ')']);
    else if (l.tipo === 'nfse') resumo.push(['Valor dos serviços', OmieOps_moeda_(l.campos.servicos.v)], ['Retenções', OmieOps_moeda_(l.totalRetencoes) + ' (ficam na observação do título, conforme as Regras do Financeiro)'], ['Valor a pagar (líquido)', OmieOps_moeda_(l.liquido)]);
    else resumo.push(['Total da nota', OmieOps_moeda_(l.vNF)]);
    if (tt.semTitulo) resumo.push(['Lançamento', 'Nenhum título será criado no Omie. ' + tt.motivo + ' A nota fica registrada no SGO+ como "Registrada sem título".']);
    else resumo.push(['Categoria', op.categoriaNome], ['Conta corrente', op.contaNome], ['Títulos', titulos.length + ' conta(s) a pagar' + (titulos.some(function (x) { return x.jaNoOmie || x.feito; }) ? ' (as já lançadas não são enviadas de novo)' : '')]);
    if (l.manuais.length) resumo.push(['Digitado na conferência', l.manuais.map(function (k) { return OMIE_NOTA_ROTULOS[k]; }).join(', ')]);
    // 16/11/2026: alçadas (Regras do Financeiro) pelo total que será lançado agora
    var totalAgora = titulos.filter(function (x) { return !(x.jaNoOmie || x.feito); }).reduce(function (s, x) { return s + x.valor; }, 0);
    if (!tt.semTitulo && totalAgora > 0 && typeof OmieRegras_alcada_ === 'function') op.alcada = OmieRegras_alcada_(totalAgora, eu, resumo);
    if (typeof OmieRegras_expira_ === 'function') op.expira = OmieRegras_expira_(op, agora);
    op.resumo = resumo;
    var props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      (props.getKeys ? props.getKeys() : []).filter(function (k) { return k.indexOf(OMIE_NOTA_PREFIXO) === 0; }).forEach(function (k) { try { var j = JSON.parse(props.getProperty(k)); if (j.expira < agora - 24 * 3600000) props.deleteProperty(k); } catch (e) {} });
      props.setProperty(OMIE_NOTA_PREFIXO + token, JSON.stringify(op));
    } finally { lock.releaseLock(); }
    return { token: token, resumo: resumo, alertas: alertas, semTitulo: tt.semTitulo, titulos: titulos.map(function (x) { return { parcela: x.parcela, vencimento: x.venc, valor: x.valor, referencia: x.ref, jaNoOmie: !!(x.jaNoOmie || x.feito) }; }),
      expiraEm: typeof OmieRegras_expiraTexto_ === 'function' ? OmieRegras_expiraTexto_(op) : '10 minutos', alcada: typeof OmieRegras_alcadaTela_ === 'function' ? OmieRegras_alcadaTela_(op) : null };
  });
}
function OmieNota_gravar_(reg, dados) {
  OmieNota_garantirAba_();
  dados.ATUALIZADO_EM = new Date().toISOString();
  if (reg && reg.ID) { SGO_DATA.update(OMIE_NOTA_ABA, reg.ID, dados); return Object.assign({}, reg, dados); }
  dados.ID = Utilities.getUuid(); dados.EM = new Date().toISOString();
  return SGO_DATA.insert(OMIE_NOTA_ABA, dados) || dados;
}
/** Confirmação. payload: { token, xml } (o XML volta e é conferido pelo SHA-256 da prévia). */
function OmieNota_apiConfirmar(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'lançar a nota no Omie'), p = payload || {}, token = OmieNota_s_(p.token, 80);
    if (!/^[a-zA-Z0-9-]{10,80}$/.test(token)) OmieOps_erro_('A prévia não é válida. Confira de novo.');
    var props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var raw = props.getProperty(OMIE_NOTA_PREFIXO + token), op = raw ? JSON.parse(raw) : null;
      if (!op || op.vinculo !== OmieOps_vinculo_(sessionId, eu)) OmieOps_erro_('Esta prévia não pertence à sua sessão. Confira de novo.');
      if (op.empresa !== OmieOps_empresa_()) OmieOps_erro_('A conexão Omie mudou desde a prévia. Confira de novo.');
      if (op.estado === 'concluida') return { jaConfirmada: true, mensagem: 'Esta nota já foi lançada.' };
      if (op.estado !== 'pendente') OmieOps_erro_('O envio anterior ficou sem resposta do Omie. Confira as contas a pagar do fornecedor no Omie e depois confira uma nova prévia: as parcelas que já estiverem no Omie não são enviadas de novo.');
      if (op.expira < Date.now()) OmieOps_erro_('A prévia expirou. Confira de novo.');
      if (typeof p.xml !== 'string' || OmieOps_hash_(p.xml) !== op.xmlSha) OmieOps_erro_('O arquivo não é o mesmo da prévia. Escolha o XML de novo e confira outra prévia.');
      if (typeof OmieRegras_conferirAlcada_ === 'function') OmieRegras_conferirAlcada_(op, p); // 16/11/2026: alçadas
      if (!op.semTitulo) Omie_exigirGravacao_();
      var reg = OmieNota_registro_(op.chave);
      if (reg && /^(LANCADA|SEM_TITULO)$/.test(String(reg.STATUS))) { op.estado = 'concluida'; props.setProperty(OMIE_NOTA_PREFIXO + token, JSON.stringify(op)); return { jaConfirmada: true, mensagem: 'Esta nota já foi lançada pelo SGO+.' }; }
      var arquivoId = reg && reg.ARQUIVO_ID ? String(reg.ARQUIVO_ID) : (typeof OmieFat_salvarXml_ === 'function' ? OmieFat_salvarXml_(p.xml, op.tipo + '-' + op.numero + '-' + op.emitente.cnpj) : '');
      var base = { CONTA_HASH: op.empresa, TIPO: op.tipo, CHAVE: op.chave, NUMERO: "'" + String(op.numero), EMITENTE_CNPJ: "'" + op.emitente.cnpj, EMITENTE_NOME: op.emitente.nome, EMISSAO: op.emissao, VALOR: op.valor,
        ARQUIVO_ID: arquivoId, XML_SHA256: op.xmlSha, CAMPOS_MANUAIS: (op.manuais || []).join(', '), MOTIVO: op.motivo, CATEGORIA: op.categoria };
      var quem = OmieNota_s_(eu.nome || eu.usuario, 80) + (eu.usuario ? ' (' + OmieNota_s_(eu.usuario, 40) + ')' : '');
      if (op.semTitulo) {
        base.STATUS = 'SEM_TITULO'; base.MOTIVO = OmieNota_s_(op.motivoSemTitulo + (op.motivo ? ' · ' + op.motivo : ''), 300); base.TITULOS_JSON = '[]'; base.LANCADA_POR = quem; base.LANCADA_EM = OmieNota_hojeBr_();
        OmieNota_gravar_(reg, base); op.estado = 'concluida'; props.setProperty(OMIE_NOTA_PREFIXO + token, JSON.stringify(op));
        if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, 'NOTA_REGISTRADA', 'OmieNota_apiConfirmar', 'Nota ' + op.tipo + ' ' + op.numero + ' registrada sem título');
        return { status: 'SEM_TITULO', mensagem: 'Nota registrada sem título (nada foi enviado ao Omie). ' + op.motivoSemTitulo, lancados: [] };
      }
      var feitos = OmieNota_titulosFeitos_(reg), refsFeitas = feitos.map(function (x) { return x.ref; }), problema = '', incerto = false, recusa = false;
      op.estado = 'enviando'; props.setProperty(OMIE_NOTA_PREFIXO + token, JSON.stringify(op));
      for (var i = 0; i < op.titulos.length; i++) {
        var t = op.titulos[i];
        if (refsFeitas.indexOf(t.ref) >= 0) continue;
        if (t.jaNoOmie) { feitos.push({ ref: t.ref, parcela: t.parcela, vencimento: t.venc, valor: t.valor, codigo: t.jaNoOmie, origem: 'já estava no Omie' }); continue; }
        try {
          var r = Omie_requisitar_('financas/contapagar/', 'IncluirContaPagar', t.param);
          var st = r && (r.codigo_status !== undefined ? r.codigo_status : r.cCodStatus);
          if (st !== undefined && !/^0+$/.test(String(st))) { var er = new Error('O Omie recusou a parcela ' + t.parcela + (r.descricao_status ? ': ' + OmieNota_s_(r.descricao_status, 200) : '')); er.omieRecusado = true; er.omieOpsPublica = true; throw er; }
          feitos.push({ ref: t.ref, parcela: t.parcela, vencimento: t.venc, valor: t.valor, codigo: Number(r && r.codigo_lancamento_omie) || 0 });
        } catch (e) {
          if (e && (e.omieRecusado || e.omieNaoExecutado)) { recusa = true; problema = 'Parcela ' + t.parcela + ': ' + (e.message || 'recusada') + '. Nada foi feito nesta parcela.'; }
          else { incerto = true; problema = 'Parcela ' + t.parcela + ': o Omie não confirmou o envio (pode ter sido feito). Confira as contas a pagar do fornecedor no Omie antes de tentar de novo; a nova prévia reconhece pela referência o que já entrou.'; }
          break;
        }
      }
      if (op.titulos.length && typeof Omie_esquecerLeitura_ === 'function') Omie_esquecerLeitura_('financas/contapagar/', 'ListarContasPagar', OmieNota_paramListar_({ emissao: op.emissao }, op.titulos[0].param.codigo_cliente_fornecedor));
      var total = op.titulos.length, n = feitos.length;
      base.TITULOS_JSON = JSON.stringify(feitos); base.STATUS = n >= total ? 'LANCADA' : n > 0 ? 'LANCADA_PARCIAL' : 'RECEBIDA';
      if (problema) base.MOTIVO = OmieNota_s_((op.motivo ? op.motivo + ' · ' : '') + problema, 300);
      if (n) { base.LANCADA_POR = quem; base.LANCADA_EM = OmieNota_hojeBr_(); }
      OmieNota_gravar_(reg, base);
      op.estado = n >= total ? 'concluida' : incerto ? 'incerta' : 'pendente'; props.setProperty(OMIE_NOTA_PREFIXO + token, JSON.stringify(op));
      var det = 'Nota ' + op.tipo + ' ' + op.numero + ' · ' + n + ' de ' + total + ' título(s) no Omie' + (incerto ? ' · envio incerto' : recusa ? ' · recusa do Omie' : '');
      if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, 'NOTA_LANCADA', 'OmieNota_apiConfirmar', det);
      try { SGO_DATA.log('OMIE_NOTA_LANCADA', String(eu.usuario || eu.userId || ''), det, 'FINANCEIRO'); } catch (e) {}
      var lancados = feitos.map(function (x) { return { parcela: x.parcela, vencimento: x.vencimento, valor: x.valor, codigo: Number(x.codigo) || 0 }; });
      if (n >= total) return { status: 'LANCADA', mensagem: 'Nota lançada no Omie: ' + total + ' conta(s) a pagar.', lancados: lancados };
      var e2 = new Error(n + ' de ' + total + ' parcela(s) lançada(s). ' + problema + (recusa ? ' Corrija o que o Omie apontou e confira de novo: as parcelas já lançadas não são repetidas.' : '')); e2.omieOpsPublica = true; throw e2;
    } finally { lock.releaseLock(); }
  });
}
/** Últimas notas lançadas pelo SGO+ (sem o XML). */
function OmieNota_apiHistorico(sessionId) {
  return OmieOps_resposta_(function () {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'ver as notas lançadas');
    var conta = OmieNota_conta_(), nomes = { RECEBIDA: 'Recebida (nada lançado)', LANCADA: 'Lançada', LANCADA_PARCIAL: 'Lançada em parte', SEM_TITULO: 'Registrada sem título', DESCARTADA: 'Descartada' };
    var l = OmieNota_linhas_().filter(function (r) { return String(r.CONTA_HASH) === conta; }).slice(-50).reverse().map(function (r) {
      var tit = OmieNota_titulosFeitos_(r);
      return { tipo: String(r.TIPO) === 'nfse' ? 'NFS-e' : 'NF-e', numero: OmieNota_s_(r.NUMERO, 30).replace(/^'/, ''), emitente: OmieNota_s_(r.EMITENTE_NOME, 80), valor: Number(r.VALOR) || 0,
        situacao: nomes[String(r.STATUS)] || OmieNota_s_(r.STATUS, 30), lancadaEm: OmieNota_s_(r.LANCADA_EM, 20), por: OmieNota_s_(r.LANCADA_POR, 80), titulos: tit.map(function (x) { return { parcela: x.parcela, codigo: Number(x.codigo) || 0 }; }), manuais: OmieNota_s_(r.CAMPOS_MANUAIS, 200) };
    });
    return { itens: l };
  });
}
