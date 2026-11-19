/****************************************************
 * DOCUMENTOS ORGANIZADOS POR PASTA (17/11/2026) — ponto central do SGO+ para os documentos de cliente, unidade e equipamento.
 *
 * Pedido da Priscilla (repassado pelo dono): "quando abre no celular [pelo QR Code] não mostra a pasta organizada de POP e PGT;
 * o cliente quando abrir deve ver tudo de forma organizada; o prontuário não tem as pastas de ordem de serviço, qualificação e
 * outras; fazer que tudo isso se comunique e fale com o sistema inteiro."
 *
 * O que este arquivo faz (só leitura; nada é gravado, nenhum dado é migrado):
 *  1. CLASSIFICAÇÃO ÚNICA (Docs_classificar_): cada documento cai numa pasta padrão (DOCP_PASTAS) pelo módulo que o gerou
 *     (DOCP_MODULOS); sem módulo, pelo tipo registrado (DOCP_REGRAS); sem tipo reconhecido, pelo nome do arquivo; senão "Outros".
 *  2. ÍNDICE ÚNICO (Docs_indice_): junta, a cada leitura, os documentos de todos os módulos — Arquivo de documentos
 *     (DOC_DOCUMENTOS), certificados (CERT_CALIBRACAO), qualificações e relatórios de ensaio (QUALIF_EMISSOES), baixa temperatura
 *     (BT_ENSAIOS), NR-13 (NR13_LAUDOS), relatórios de O.S. (ATEC_OS e ATEC_RELATORIOS), relatórios de ciclo da lavadora
 *     (LAVCIC_RELATORIOS), relatórios A4 da Representação (REP_DOCUMENTOS), revisões emitidas (DOC_REVISOES: relatório de
 *     calibração, declarações, PGT/POP, registros operacionais, cronograma, planejamento do CME), as listas próprias do PGT/POP e
 *     dos Registros operacionais (planilhas do módulo) e os contratos de cliente (CLI_CONTRATOS, só para quem vê contratos).
 *     O mesmo arquivo registrado em dois lugares vira um documento só; revisões e versões do mesmo documento ficam agrupadas
 *     (a mais nova na frente, as anteriores guardadas embaixo, nada se perde). Documento novo de qualquer módulo aparece sozinho.
 *  3. O QUE CADA UM VÊ (Docs_visivel_): conta de cliente só o próprio cliente, só emitido (sem minuta, rascunho, suspenso ou
 *     inativo), sem as pastas internas (contratos e propostas) e sem a versão interna da Representação; no QR Code a lista é a
 *     do cliente também para a equipe (o PGT/POP suspenso aparece marcado só para a equipe). O link para a conta de cliente é
 *     sempre a rota do SGO+ (/arquivos/<id>), que passa pela trava do Portal do cliente (PortalCliente_arquivoPermitido_).
 *  4. CHAMADAS: documentosPastas(sessionId, { escopo: 'cliente'|'unidade'|'equipamento', id, via: 'ficha'|'qr'|'portal' })
 *     para as telas (QR Code / prontuário, ficha do cliente, da unidade e do equipamento, Arquivo de documentos do cliente);
 *     Docs_doCliente_, Docs_daUnidade_, Docs_doEquipamento_ e Docs_contagens_ para o servidor; Docs_arquivoDoCliente_ para a
 *     trava de arquivo; Docs_agruparLista_ para "Documentos gerados e envios" (SGO_EnviarDoc.js).
 *
 * Configuração (Script Property DOCP_CFG, JSON; sem ela valem os padrões abaixo):
 *  { "pastas": { "PGT_POP": { "nome": "PGT e POP", "clienteVe": true } },   nome da pasta e se o cliente vê (as internas nunca)
 *    "regras": [ { "contem": "LAUDO TECNICO", "pasta": "RELATORIOS_TECNICOS" } ],   regras extras pelo tipo/nome (vêm antes)
 *    "clienteAbreProntuario": true,       a conta de cliente abre os documentos emitidos do prontuário dela (trava de arquivo)
 *    (18/11/2026: "pastasDaUnidadeNoEquipamento" deixou de valer e é ignorada — o prontuário do equipamento só mostra o que é dele)
 *    "diasVencendo": 30 }
 * Nenhuma função devolve Date: datas são texto (aaaa-mm-dd e dd/mm/aaaa).
 *
 * 18/11/2026 — REGRA DO DONO (vazamento no QR Code): "nunca, jamais, dado de nenhum equipamento pode cruzar com outro; todo
 * equipamento só deve ter e abrir só o que é pertinente a ele; documentos gerados mais de uma vez não podem ser vistos: só o
 * último gerado, que é o oficial."
 *  1. Equipamento: só documentos cujo EQUIPAMENTO_ID é exatamente o dele. PGT, POP e registros operacionais são documentos da
 *     unidade (gerados pelo CNPJ, sem equipamento) e ficam nas pastas da unidade e do cliente, nunca no do equipamento.
 *     Unidade: só documentos ligados a ela (documento só do cliente aparece na pasta do cliente).
 *  2. Mesmo documento gerado mais de uma vez = mesma chave de versão DENTRO do mesmo vínculo (equipamento, ou unidade, ou cliente):
 *     certificado de calibração pela data da calibração + grandezas calibradas; relatórios de ensaio e de qualificação pelo
 *     número (espaços e acentos não contam); demais pelo número ou pelo nome. Antes a chave não tinha o vínculo e um documento
 *     de um equipamento podia virar "versão anterior" de outro equipamento com o mesmo número ("Ciclo 1 de 3").
 *  3. Em cada chave vale o último gerado. Os anteriores ficam no banco (nada é apagado), marcados "substituído", e só Admin e
 *     Diretoria os veem, na ficha da equipe. QR Code, Portal, conta de cliente e os demais perfis veem só o oficial.
 *  4. A situação SUBSTITUIDO gravada pelos módulos de ensaio (QUALIF_EMISSOES) e de revisões (DOC_REVISOES) era marcada só pelo
 *     número, sem olhar o equipamento ou o CNPJ: aqui ela é recalculada dentro do vínculo (a gravação também foi corrigida em
 *     SGO_QualifEmissao.js e SGO_DocRevisao.js para as emissões novas).
 *
 * 18/11/2026 — EXCLUIR DOCUMENTO DA PASTA (pedido do Matheus: "existem documentos cadastrados dentro de alguns clientes que não
 * pertencem a eles, e pode nos trazer problemas com fiscalização"): exclusão LÓGICA. Nada é apagado do banco nem do Drive: a
 * exclusão é uma linha na aba DOCP_EXCLUSOES (quem, quando, motivo obrigatório) e o índice deixa o documento de fora em todas as
 * telas (QR Code, pastas, fichas, Portal do cliente) e na trava de arquivo da conta de cliente. Quem exclui: caixa de Acessos
 * «Excluir documento da pasta» (DOCP_EXCLUIR; padrão: Administrador, Diretoria e gestores das áreas Técnica, Qualidade e
 * Comercial). Quem vê os excluídos e restaura: só Administrador e Diretoria (lista "Documentos excluídos" na própria ficha).
 * Chamada das telas: documentosPastasAcao(sessionId, 'excluir' | 'restaurar' | 'excluidos', dados).
 ****************************************************/

var DOCP_FUSO = 'America/Sao_Paulo';
var DOCP_PROP = 'DOCP_CFG';

/** Pastas padrão, na ordem em que aparecem. interna: nunca vai ao cliente nem ao QR Code. */
var DOCP_PASTAS = [
  { id: 'CALIBRACAO', nome: 'Certificados de calibração', icone: 'fa-certificate',
    descricao: 'Certificados de calibração emitidos pela Metrolabs e relatórios de calibração. O certificado traz os resultados, a incerteza de medição e a rastreabilidade aos padrões; a validade indica quando calibrar de novo.' },
  { id: 'QUALIFICACAO', nome: 'Qualificações (QI, QO, QD e térmica)', icone: 'fa-clipboard-check',
    descricao: 'Relatórios de qualificação de instalação, operação e desempenho e de qualificação térmica (autoclave, lavadora, estufa, banho-maria, cadeia de frio e esterilização a baixa temperatura). Vale o relatório vigente; as revisões anteriores ficam guardadas como substituídas.' },
  { id: 'RELATORIOS_TECNICOS', nome: 'Relatórios técnicos e de ciclos', icone: 'fa-chart-line',
    descricao: 'Relatórios de ensaio de ciclo, planilhas de dados dos ensaios, relatórios de ciclo da lavadora e outros relatórios técnicos de autoclave, lavadora, estufa e cadeia de frio.' },
  { id: 'OS', nome: 'Ordens de serviço e relatórios de atendimento', icone: 'fa-screwdriver-wrench',
    descricao: 'Relatórios das ordens de serviço encerradas, relatórios de atendimento e de ronda. Cada relatório registra a condição encontrada, o serviço executado, o teste funcional e a assinatura de quem acompanhou.' },
  { id: 'MANUTENCAO', nome: 'Manutenção preventiva e corretiva', icone: 'fa-wrench',
    descricao: 'Relatórios de manutenção preventiva e corretiva e o cronograma de execução dos serviços.' },
  { id: 'PGT_POP', nome: 'PGT e POP', icone: 'fa-book',
    descricao: 'Plano de Gerenciamento das Tecnologias em Saúde (PGT), Procedimentos Operacionais Padrão (POP) e o planejamento técnico do CME. São documentos da unidade e valem para todos os equipamentos dela.' },
  { id: 'REGISTROS', nome: 'Registros operacionais', icone: 'fa-table-list',
    descricao: 'Formulários de registro da rotina da unidade (controles diários, verificações e testes), gerados pelo módulo Registros operacionais.' },
  { id: 'NR13', nome: 'NR-13 (vasos de pressão)', icone: 'fa-gauge-high',
    descricao: 'Laudos de inspeção de segurança de vasos de pressão conforme a NR-13, com a data da próxima inspeção.' },
  { id: 'LAUDOS', nome: 'Laudos e declarações', icone: 'fa-file-signature',
    descricao: 'Declarações de execução de serviço, laudos técnicos e pareceres.' },
  { id: 'CONTRATOS', nome: 'Contratos e propostas', icone: 'fa-file-contract', interna: true,
    descricao: 'Contratos, propostas e orçamentos. Uso interno da Metrolabs: esta pasta não aparece para o cliente nem no QR Code.' },
  { id: 'OUTROS', nome: 'Outros documentos', icone: 'fa-folder',
    descricao: 'Documentos que não se encaixam nas pastas acima. Se um documento caiu aqui por engano, ajuste o tipo dele no Arquivo de documentos.' }
];

/** Módulo que gerou o documento -> pasta (vale antes do tipo e do nome). */
var DOCP_MODULOS = {
  CERTIFICADO_CALIBRACAO: 'CALIBRACAO', RELATORIO_CALIBRACAO: 'CALIBRACAO',
  AUTOCLAVE_OFICIAL: 'QUALIFICACAO', LAVADORA_OFICIAL: 'QUALIFICACAO', ESTUFA_OFICIAL: 'QUALIFICACAO', CADEIA_FRIO_OFICIAL: 'QUALIFICACAO',
  BAIXA_TEMPERATURA: 'QUALIFICACAO', DECLARACAO_QIQO: 'QUALIFICACAO',
  AUTOCLAVE: 'RELATORIOS_TECNICOS', AUTOCLAVE_DADOS: 'RELATORIOS_TECNICOS', LAVADORA: 'RELATORIOS_TECNICOS', LAVADORA_DADOS: 'RELATORIOS_TECNICOS',
  ESTUFA: 'RELATORIOS_TECNICOS', ESTUFA_DADOS: 'RELATORIOS_TECNICOS', CADEIA_FRIO: 'RELATORIOS_TECNICOS', CADEIA_FRIO_DADOS: 'RELATORIOS_TECNICOS',
  CICLO_LAVADORA: 'RELATORIOS_TECNICOS', INVENTARIO: 'RELATORIOS_TECNICOS',
  ORDEM_SERVICO: 'OS', REPRESENTACAO: 'OS', ATENDIMENTO: 'OS',
  CRONOGRAMA_EXECUCAO: 'MANUTENCAO',
  PGT_POP: 'PGT_POP', PLANEJAMENTO_CME: 'PGT_POP',
  REGISTROS_OPERACIONAIS: 'REGISTROS',
  NR13: 'NR13',
  DECLARACAO_EXECUCAO: 'LAUDOS',
  CONTRATO_CLIENTE: 'CONTRATOS'
};

/**
 * Tipo registrado (ou, sem tipo reconhecido, o nome do arquivo) -> pasta. Texto comparado sem acento e em maiúsculas.
 * A ordem importa: "Laudo NR-13" vai para NR-13 antes de "Laudos"; "Relatórios de qualificação" antes de "calibração".
 */
var DOCP_REGRAS = [
  [/^5\.|CONTRAT|PROPOSTA|ORCAMENTO|NOTA FISCAL/, 'CONTRATOS'],
  [/NR.?13|VASO.? DE PRESS|CALDEIRA/, 'NR13'],
  [/QUALIFICA|\bQIQOQD\b|\bQI\b|\bQO\b|\bQD\b|MAPEAMENTO TERM/, 'QUALIFICACAO'],
  [/^2\.|CALIBRA|CERTIFICADO/, 'CALIBRACAO'],
  [/^4\.|ORDE(M|NS) DE SERVI|ATENDIMENTO|RONDA|\bO\.?S\.?[ -]?\d/, 'OS'],
  [/^1\.|MANUTEN|PREVENTIV|CORRETIV|CRONOGRAMA/, 'MANUTENCAO'],
  [/(^|[^A-Z])PGTS?([^A-Z]|$)|(^|[^A-Z])POPS?([^A-Z]|$)|(^|[^A-Z])POP ?\d|PLANO DE GERENCIAMENTO|PROCEDIMENTO OPERACIONAL|PLANEJAMENTO (TECNICO )?D[OA] CME/, 'PGT_POP'],
  [/REGISTROS? OPERACION/, 'REGISTROS'],
  [/ENSAIO|CICLO|BOWIE|LEAK|TERMOMETRI|RELATORIO TECNICO|INVENTARIO|PLANILHA DE DADOS/, 'RELATORIOS_TECNICOS'],
  [/LAUDO|DECLARA|ATESTADO|PARECER/, 'LAUDOS']
];

/** Origens que a trava de arquivo do Portal do cliente já reconhece sozinha (PCL_REGRAS_ARQUIVO, LavCiclo e Representação). */
var DOCP_ORIGENS_TRAVA = { ARQUIVO: true, ATEC_OS: true, ATEC_RELATORIOS: true, LAVCIC: true, REP_DOCUMENTOS: true };
var DOCP_ORIGEM_NOMES = {
  ARQUIVO: 'Arquivo de documentos', CERT_CALIBRACAO: 'Certificado de calibração', QUALIF_EMISSOES: 'Relatórios de autoclave, lavadora, estufa e cadeia de frio',
  BT_ENSAIOS: 'Esterilização a baixa temperatura', NR13_LAUDOS: 'NR-13', ATEC_OS: 'Assistência técnica', ATEC_RELATORIOS: 'Assistência técnica',
  LAVCIC: 'Relatório de ciclo da lavadora', REP_DOCUMENTOS: 'Atendimento', DOC_REVISOES: 'Documento emitido', PGTPOP_LISTA: 'PGT e POP',
  REGOP_LISTA: 'Registros operacionais', CLI_CONTRATOS: 'Contrato do cliente'
};
var DOCP_PERFIS_EQUIPE_QR = ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA'];
/** 18/11/2026: exclusão lógica de documento da pasta (aba própria; nada é apagado). */
var DOCP_ABA_EXCLUSOES = 'DOCP_EXCLUSOES';
var DOCP_COLUNAS_EXCLUSOES = ['ID', 'CHAVE', 'ARQUIVO_ID', 'ORIGEM', 'TITULO', 'PASTA', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'SITUACAO', 'MOTIVO', 'POR_ID', 'POR_NOME', 'EM',
  'RESTAURADO_MOTIVO', 'RESTAURADO_POR_ID', 'RESTAURADO_POR_NOME', 'RESTAURADO_EM', 'CRIADO_EM'];
var DOCP_MOTIVO_MIN = 10;
/** Caixa de Acessos (registrada pelo próprio módulo, como as do Portal do cliente). */
var DOCP_PODERES_ITENS = [
  ['DOCP_EXCLUIR', 'Documentos por pasta', 'Excluir documento da pasta', 'Mostra o botão "Excluir" em cada documento das pastas (ficha do equipamento, da unidade e do cliente) e tira da lista o documento que não pertence àquele equipamento ou cliente, com motivo obrigatório. A exclusão é lógica: nada é apagado do banco nem do arquivo; o documento some do QR Code, das pastas, das fichas e do Portal do cliente, e só Administrador e Diretoria veem a lista de excluídos e restauram. Padrão: Administrador, Diretoria e gestores das áreas Técnica, Qualidade e Comercial.', 'operar', 15]
];
var DOCP_PODERES_PADRAO = {
  DOCP_EXCLUIR: function (eu, c) {
    if (c && (c.admin || c.diretoria)) return true;
    var area = Docs_up_(eu && eu.area);
    if (c && c.p === 'GESTOR' && ['TECNICA', 'QUALIDADE', 'COMERCIAL'].indexOf(area) >= 0) return true;
    try { return !!(c && typeof c.com === 'function' && c.com() && c.com().gestao); } catch (e) { return false; }
  }
};
var SGO_PODERES_MODULOS = (typeof SGO_PODERES_MODULOS !== 'undefined' && SGO_PODERES_MODULOS) || [];
DOCP_PODERES_ITENS.forEach(function (it) {
  if (SGO_PODERES_MODULOS.some(function (m) { return m && m.item && m.item[0] === it[0]; })) return;
  SGO_PODERES_MODULOS.push({ item: it, padrao: DOCP_PODERES_PADRAO[it[0]], ligado: true });
});

/** 18/11/2026: pastas de documentos da unidade (gerados pelo CNPJ): não aparecem vazias no prontuário do equipamento. */
var DOCP_PASTAS_DA_UNIDADE = { PGT_POP: true, REGISTROS: true };

/* ============================================================ utilidades */

function Docs_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Docs_up_(v) { return Docs_s_(v).toUpperCase(); }
function Docs_norm_(v) { return Docs_s_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function Docs_digitos_(v) { return Docs_s_(v).replace(/\D/g, ''); }
function Docs_ler_(aba) { try { return (typeof SGO_DATA !== 'undefined' && SGO_DATA.getAll(aba)) || []; } catch (e) { return []; } }
function Docs_aba_(chave, padrao) { try { if (typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS[chave]) return SGO_CFG.SHEETS[chave]; } catch (e) {} return padrao || chave; }

/** Código do arquivo a partir do link (/arquivos/<id>, /d/<id>, ?id=<id>) ou do próprio código. */
function Docs_idDoLink_(v) {
  var s = Docs_s_(v);
  if (!s) return '';
  var m = /(?:^|\/)arquivos\/([A-Za-z0-9_-]{4,})/.exec(s) || /\/d\/([A-Za-z0-9_-]{6,})/.exec(s) || /[?&]id=([A-Za-z0-9_-]{6,})/.exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{4,}$/.test(s) ? s : '';
}

/** Data em texto ordenável: "aaaa-mm-ddTHH:MM:SS" (ou só "aaaa-mm-dd"). Aceita Date, dd/mm/aaaa [HH:MM[:SS]] e ISO. */
function Docs_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    try { return Utilities.formatDate(v, DOCP_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); } catch (e) { return v.toISOString().slice(0, 19); }
  }
  var s = Docs_s_(v), m;
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) return m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00') : '');
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00') : '');
  return '';
}
function Docs_dia_(v) { return Docs_iso_(v).slice(0, 10); }
function Docs_br_(v) { var d = Docs_dia_(v); return d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : ''; }
function Docs_hoje_() {
  try { return Utilities.formatDate(new Date(), DOCP_FUSO, 'yyyy-MM-dd'); } catch (e) { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
}
function Docs_diasAte_(dia, hoje) {
  var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hoje || ''), b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia || '');
  if (!a || !b) return null;
  return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 86400000);
}
function Docs_somarMeses_(dia, meses) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia || '');
  if (!m) return '';
  var d = new Date(Date.UTC(+m[1], +m[2] - 1 + Number(meses || 0), +m[3]));
  return d.toISOString().slice(0, 10);
}
function Docs_semExt_(nome) { return Docs_s_(nome).replace(/\.(pdf|html?|docx?|xlsx?|png|jpe?g)$/i, ''); }
/** Rótulo do tipo do Arquivo de documentos sem a numeração ("2. CERTIFICADOS DE CALIBRAÇÃO" -> "Certificados de calibração"). */
function Docs_rotuloTipo_(v) {
  var s = Docs_s_(v).replace(/^\s*\d+\.\s*/, '');
  if (!s) return '';
  s = s.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** Chave de versão pelo nome: tira extensão, "Rev. 01", "_v2", carimbo de data e hora. */
function Docs_chaveNome_(nome) {
  return Docs_norm_(Docs_semExt_(nome))
    .replace(/[\s_.-]*\bREV(ISAO)?\.?\s*\d+\b/g, ' ').replace(/[\s_-]*\bV\d+\b/g, ' ').replace(/_V\d+\b/g, ' ')
    .replace(/\b\d{8}[_-]?\d{4,6}\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}(T[\d:]+)?\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ').trim();
}

/** 18/11/2026: número como chave de versão — sem acento, maiúsculo, espaços repetidos contam como um ("Ciclo 4  de 4" = "Ciclo 4 de 4"). */
function Docs_numChave_(v) { return Docs_norm_(v).replace(/\s+/g, ' ').trim(); }

/** 18/11/2026: grandezas calibradas no certificado (títulos dos blocos do DADOS_JSON), para separar certificados do mesmo dia
 *  que são de instrumentos diferentes do mesmo equipamento (manômetro da câmara interna e o da geradora, por exemplo). */
function Docs_blocosCert_(dadosJson) {
  try {
    var d = typeof dadosJson === 'string' ? JSON.parse(dadosJson || '{}') : (dadosJson || {});
    return (Array.isArray(d.blocos) ? d.blocos : []).map(function (b) { return Docs_numChave_(b && b.titulo); }).filter(Boolean).sort().join('+');
  } catch (e) { return ''; }
}

/* ============================================================ configuração */

function Docs_cfg_() {
  var c = {};
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty(DOCP_PROP) || '{}') || {}; } catch (e) { c = {}; }
  var pastas = {};
  DOCP_PASTAS.forEach(function (p) {
    var o = (c.pastas && c.pastas[p.id]) || {};
    pastas[p.id] = { id: p.id, nome: Docs_s_(o.nome) || p.nome, icone: p.icone, descricao: p.descricao, interna: !!p.interna, clienteVe: !p.interna && o.clienteVe !== false };
  });
  var regras = (Array.isArray(c.regras) ? c.regras : []).filter(function (r) { return r && Docs_s_(r.contem).length >= 3 && pastas[Docs_up_(r.pasta)]; })
    .map(function (r) { return { contem: Docs_norm_(r.contem), pasta: Docs_up_(r.pasta) }; });
  // 18/11/2026: documento da unidade não entra mais no prontuário do equipamento (regra do dono); a chave antiga é ignorada
  var daUnidade = [];
  var dias = Math.round(Number(c.diasVencendo));
  return { pastas: pastas, regras: regras, clienteAbreProntuario: c.clienteAbreProntuario !== false, pastasDaUnidadeNoEquipamento: daUnidade, diasVencendo: dias >= 1 && dias <= 180 ? dias : 30 };
}

/* ============================================================ classificação */

/**
 * Pasta de um documento. d: { modulo, tipo, nome }. Ordem: regra extra da configuração (tipo ou nome), módulo que gerou,
 * tipo registrado, nome do arquivo; sem nada reconhecido, "OUTROS". cfg é opcional (sem ela, lê a configuração).
 */
function Docs_classificar_(d, cfg) {
  d = d || {};
  cfg = cfg || Docs_cfg_();
  var tipo = Docs_norm_(d.tipo), nome = Docs_norm_(Docs_semExt_(d.nome)), mod = Docs_up_(d.modulo);
  for (var i = 0; i < cfg.regras.length; i++) if (tipo.indexOf(cfg.regras[i].contem) >= 0 || nome.indexOf(cfg.regras[i].contem) >= 0) return cfg.regras[i].pasta;
  if (mod && DOCP_MODULOS[mod]) return DOCP_MODULOS[mod];
  var porTexto = function (t) {
    if (!t) return '';
    for (var k = 0; k < DOCP_REGRAS.length; k++) if (DOCP_REGRAS[k][0].test(t)) return DOCP_REGRAS[k][1];
    return '';
  };
  var t = tipo && !/^OUTROS( DOCUMENTOS)?$|^DOCUMENTO$/.test(tipo) ? porTexto(tipo) : '';
  if (t) return t;
  // pelo nome do arquivo, sem a numeração das categorias (ela só vale no tipo registrado)
  var n = porTexto(nome.replace(/^\s*\d+\.\s*/, ''));
  return n || 'OUTROS';
}

/* ============================================================ índice (leitura de todos os módulos) */

/** Cadastros que o índice usa para ligar documento a cliente, unidade e equipamento. */
function Docs_cadastros_() {
  var C = Docs_ler_(Docs_aba_('CAD_CLIENTES')), U = Docs_ler_(Docs_aba_('CAD_UNIDADES')), E = Docs_ler_(Docs_aba_('CAD_EQUIPAMENTOS'));
  var mC = {}, mU = {}, mE = {}, porCnpj = {};
  C.forEach(function (c) { mC[Docs_s_(c.ID)] = c; var d = Docs_digitos_(c.CNPJ); if (d.length === 14 && !porCnpj[d]) porCnpj[d] = { clienteId: Docs_s_(c.ID), unidadeId: '' }; });
  U.forEach(function (u) {
    mU[Docs_s_(u.ID)] = u;
    var d = Docs_digitos_(u.CNPJ_UNIDADE);
    if (d.length !== 14) return;
    var ja = porCnpj[d];
    // CNPJ da unidade igual ao do cliente (unidade principal): o documento é do cliente e da unidade principal
    if (!ja) porCnpj[d] = { clienteId: Docs_s_(u.CLIENTE_ID), unidadeId: Docs_s_(u.ID) };
    else if (ja.clienteId === Docs_s_(u.CLIENTE_ID) && !ja.unidadeId) ja.unidadeId = Docs_s_(u.ID);
    else if (ja.clienteId === Docs_s_(u.CLIENTE_ID) && ja.unidadeId !== Docs_s_(u.ID)) ja.unidadeId = '';
  });
  E.forEach(function (e) { mE[Docs_s_(e.ID)] = e; });
  return { mC: mC, mU: mU, mE: mE, porCnpj: porCnpj };
}

/** Lê uma planilha própria de módulo (PGT/POP, Registros operacionais) sem criar nada: sem a propriedade, devolve []. */
function Docs_planilhaModulo_(prop, aba) {
  try {
    var id = PropertiesService.getScriptProperties().getProperty(prop);
    if (!id || typeof SpreadsheetApp === 'undefined') return [];
    var sh = SpreadsheetApp.openById(id).getSheetByName(aba);
    if (!sh) return [];
    var v = sh.getDataRange().getValues();
    if (!v || v.length < 2) return [];
    var cab = v[0].map(function (x) { return Docs_up_(x); });
    return v.slice(1).map(function (l) { var o = {}; cab.forEach(function (c, k) { if (c) o[c] = l[k]; }); return o; });
  } catch (e) { return []; }
}

function Docs_pgtSuspenso_(data) {
  try { return typeof PgtPop_documentoSuspenso_ === 'function' ? !!PgtPop_documentoSuspenso_(data) : false; } catch (e) { return false; }
}

/** Documentos brutos de todas as fontes (cada um com origem, módulo, vínculos, datas, situação e arquivo). */
function Docs_coletar_(opcoes) {
  var o = opcoes || {}, saida = [];
  var add = function (x) { if (x && !/^SIM-\d{4}-/.test(Docs_s_(x.numero))) saida.push(x); };

  // 1. Arquivo de documentos (DOC_DOCUMENTOS): todos os módulos que registram e os documentos enviados à mão.
  Docs_ler_(Docs_aba_('DOC_DOCUMENTOS')).forEach(function (d) {
    var st = Docs_up_(d.STATUS || 'ATIVO');
    add({ origem: 'ARQUIVO', modulo: '', tipo: Docs_rotuloTipo_(d.TIPO_DOCUMENTO), tipoBruto: Docs_s_(d.TIPO_DOCUMENTO), titulo: Docs_semExt_(d.NOME_ARQUIVO) || 'Documento sem nome',
      nome: Docs_s_(d.NOME_ARQUIVO), numero: '', revisao: '', clienteId: Docs_s_(d.CLIENTE_ID), unidadeId: Docs_s_(d.UNIDADE_ID), equipamentoId: Docs_s_(d.EQUIPAMENTO_ID),
      emitidoIso: Docs_iso_(d.DATA_EMISSAO) || Docs_iso_(d.CRIADO_EM), geradoIso: Docs_iso_(d.CRIADO_EM), validadeIso: Docs_dia_(d.DATA_VENCIMENTO), situacao: st === 'INATIVO' ? 'INATIVO' : 'VIGENTE',
      arquivoId: Docs_idDoLink_(d.LINK_ARQUIVO), link: Docs_s_(d.LINK_ARQUIVO), docDocumentoId: Docs_s_(d.ID), publico: true,
      // 18/11/2026 (Portal do cliente, etapa 3): '' segue a regra do tipo; OCULTO esconde do cliente (lista e arquivo); VISIVEL libera um a um
      portal: Docs_up_(d.PORTAL),
      chave: 'N:' + Docs_s_(d.EQUIPAMENTO_ID || d.UNIDADE_ID) + ':' + Docs_chaveNome_(d.NOME_ARQUIVO) });
  });

  // 2. Certificados de calibração (CERT_CALIBRACAO): número, validade e revisão substituída.
  Docs_ler_(Docs_aba_('CERT_CALIBRACAO')).forEach(function (r) {
    var st = Docs_up_(r.STATUS);
    if (/CANCEL|EXCLU|INATIV|RASCUNHO/.test(st)) return;
    var num = Docs_s_(r.NUMERO_CERTIFICADO), link = Docs_s_(r.LINK_PDF_CERTIFICADO);
    if (!link && !num) return;
    // 18/11/2026: o mesmo certificado gerado várias vezes (mesmo equipamento, mesma data de calibração, mesmas grandezas) tem
    // números diferentes; a chave de versão é a calibração, não o número. Sem data de calibração, vale o número (como antes).
    var dcal = Docs_dia_(r.DATA_CALIBRACAO);
    add({ origem: 'CERT_CALIBRACAO', modulo: 'CERTIFICADO_CALIBRACAO', tipo: 'Certificado de calibração', titulo: 'Certificado de calibração' + (num ? ' nº ' + num : ''), nome: '', numero: num, revisao: '',
      clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: '', equipamentoId: Docs_s_(r.EQUIPAMENTO_ID), emitidoIso: Docs_iso_(r.DATA_EMISSAO) || Docs_iso_(r.DATA_CALIBRACAO) || Docs_iso_(r.CRIADO_EM),
      geradoIso: Docs_iso_(r.CRIADO_EM), validadeIso: Docs_dia_(r.DATA_VALIDADE), situacao: st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : 'VIGENTE', arquivoId: Docs_idDoLink_(link), link: link, publico: true,
      chave: dcal ? 'CERTCAL:' + dcal + ':' + Docs_blocosCert_(r.DADOS_JSON) : 'CERT:' + (num || link) });
  });

  // 3. Relatórios de autoclave, lavadora, estufa e cadeia de frio (QUALIF_EMISSOES): qualificação (_OFICIAL), ensaio e planilha de dados.
  var qe = [];
  try { qe = typeof SGO_QE_lerTudo_ === 'function' ? SGO_QE_lerTudo_() : Docs_ler_('QUALIF_EMISSOES'); } catch (e) { qe = []; }
  qe.forEach(function (r) {
    var st = Docs_up_(r.STATUS), mod = Docs_up_(r.MODULO);
    var sit = st === 'EMITIDO' ? 'VIGENTE' : st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : (st === 'AGUARDANDO_APROVACAO' || st === 'DEVOLVIDO') ? 'MINUTA' : '';
    if (!sit) return;
    var info = (typeof SGO_QEQ_MODULOS !== 'undefined' && SGO_QEQ_MODULOS[mod]) || null;
    var titulo = (info && info.titulo) || (typeof SGO_DOCREV_MODULOS !== 'undefined' && SGO_DOCREV_MODULOS[mod]) || 'Relatório técnico';
    var rev = Docs_s_(r.REVISAO);
    add({ origem: 'QUALIF_EMISSOES', modulo: mod, tipo: titulo.replace(/ — .*$/, ''), titulo: titulo + (Docs_s_(r.NUMERO) ? ' nº ' + Docs_s_(r.NUMERO) : '') + (Number(rev) > 0 ? ' · Rev. ' + ('0' + rev).slice(-2) : ''),
      nome: '', numero: Docs_s_(r.NUMERO), revisao: rev, clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: Docs_s_(r.UNIDADE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID), cnpj: Docs_digitos_(r.CNPJ),
      emitidoIso: Docs_iso_(r.APROVADO_EM) || Docs_iso_(r.ENVIADO_EM), geradoIso: Docs_iso_(r.APROVADO_EM) || Docs_iso_(r.ATUALIZADO_EM), validadeIso: Docs_dia_(r.VALIDADE_ATE), situacao: sit,
      // 18/11/2026: SUBSTITUIDO aqui foi marcado pelo número, sem olhar o equipamento: o índice recalcula dentro do vínculo
      porNumero: sit === 'SUBSTITUIDO',
      arquivoId: sit === 'MINUTA' ? '' : (Docs_s_(r.PDF_ID) || Docs_s_(r.HTML_ID)), link: '', publico: true, chave: 'QE:' + mod + ':' + (Docs_numChave_(r.NUMERO) || Docs_s_(r.ID)) });
  });

  // 4. Esterilização a baixa temperatura (BT_ENSAIOS): validade de 12 meses a partir da emissão (regra do módulo).
  var mesesBt = (typeof BAIXATEMP_CFG !== 'undefined' && Number(BAIXATEMP_CFG.VALIDADE_DOCUMENTO_MESES)) || 12;
  Docs_ler_((typeof BAIXATEMP_CFG !== 'undefined' && BAIXATEMP_CFG.ABA_ENSAIOS) || 'BT_ENSAIOS').forEach(function (r) {
    var st = Docs_up_(r.STATUS);
    var sit = st === 'EMITIDO' ? 'VIGENTE' : st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : (st === 'EM_REVISAO' || st === 'APROVADO') ? 'MINUTA' : '';
    if (!sit) return;
    var emit = Docs_iso_(r.EMITIDO_EM), rev = Docs_s_(r.REVISAO);
    add({ origem: 'BT_ENSAIOS', modulo: 'BAIXA_TEMPERATURA', tipo: 'Relatório de qualificação', titulo: 'Relatório de qualificação — esterilizador a baixa temperatura' + (Docs_s_(r.NUMERO) ? ' nº ' + Docs_s_(r.NUMERO) : '') + (Number(rev) > 0 ? ' · Rev. ' + ('0' + rev).slice(-2) : ''),
      nome: '', numero: Docs_s_(r.NUMERO), revisao: rev, clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: Docs_s_(r.UNIDADE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID), cnpj: Docs_digitos_(r.CNPJ),
      emitidoIso: emit, geradoIso: emit || Docs_iso_(r.ATUALIZADO_EM), validadeIso: sit === 'MINUTA' ? '' : Docs_somarMeses_(emit, mesesBt), situacao: sit,
      arquivoId: sit === 'MINUTA' ? '' : (Docs_s_(r.PDF_ID) || Docs_idDoLink_(r.LINK_PDF)), link: sit === 'MINUTA' ? '' : Docs_s_(r.LINK_PDF), publico: true, chave: 'BT:' + Docs_s_(r.NUMERO || r.ID) });
  });

  // 5. NR-13 (NR13_LAUDOS): laudo emitido, com a próxima inspeção como vencimento.
  Docs_ler_((typeof NR13_SHEET !== 'undefined' && NR13_SHEET) || 'NR13_LAUDOS').forEach(function (r) {
    var st = Docs_up_(r.STATUS);
    if (st !== 'EMITIDO' && st !== 'SUBSTITUIDO') return;
    var num = Docs_s_(r.NUMERO_LAUDO);
    add({ origem: 'NR13_LAUDOS', modulo: 'NR13', tipo: 'Laudo de inspeção NR-13', titulo: 'Laudo de inspeção NR-13' + (num ? ' nº ' + num : ''), nome: '', numero: num, revisao: '',
      clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: Docs_s_(r.UNIDADE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID), emitidoIso: Docs_iso_(r.EMITIDO_EM) || Docs_iso_(r.CRIADO_EM), geradoIso: Docs_iso_(r.CRIADO_EM),
      validadeIso: Docs_dia_(r.DATA_PROXIMA_INSPECAO), situacao: st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : 'VIGENTE', arquivoId: Docs_idDoLink_(r.LINK_PDF), link: Docs_s_(r.LINK_PDF), publico: true, chave: 'NR13:' + (num || r.ID) });
  });

  // 6. Assistência técnica: relatório da O.S. encerrada (ATEC_OS) e as versões emitidas dele (ATEC_RELATORIOS).
  var abaOs = (typeof AST_ABAS !== 'undefined' && AST_ABAS.OS) || 'ATEC_OS', abaRel = (typeof AST_ABAS !== 'undefined' && AST_ABAS.RELATORIOS) || 'ATEC_RELATORIOS';
  var osPorId = {};
  Docs_ler_(abaOs).forEach(function (r) {
    if (Docs_s_(r.EXCLUIDO_EM)) return;
    osPorId[Docs_s_(r.ID)] = r;
    var arq = Docs_s_(r.RELATORIO_PDF_ID) || Docs_idDoLink_(r.RELATORIO_PDF_URL);
    if (Docs_up_(r.SITUACAO) !== 'ENCERRADA' || !arq) return;
    var num = Docs_s_(r.NUMERO);
    add({ origem: 'ATEC_OS', modulo: 'ORDEM_SERVICO', tipo: 'Relatório de atendimento técnico', titulo: 'Relatório de atendimento — O.S. ' + num + (Docs_s_(r.TIPO_NOME) ? ' · ' + Docs_s_(r.TIPO_NOME) : ''),
      nome: '', numero: num, revisao: '', clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: Docs_s_(r.UNIDADE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID),
      emitidoIso: Docs_iso_(r.RELATORIO_EM) || Docs_iso_(r.CONCLUIU_EM) || Docs_iso_(r.AGENDADO_PARA), validadeIso: '', situacao: 'VIGENTE', arquivoId: arq, link: Docs_s_(r.RELATORIO_PDF_URL), publico: true, chave: 'OS:' + num });
  });
  Docs_ler_(abaRel).forEach(function (r) {
    var os = osPorId[Docs_s_(r.OS_ID)];
    if (!os || Docs_up_(os.SITUACAO) !== 'ENCERRADA' || Docs_up_(r.RASCUNHO) === 'SIM' || /interna/i.test(Docs_s_(r.MOTIVO))) return;
    var arq = Docs_s_(r.PDF_ID) || Docs_idDoLink_(r.PDF_URL);
    if (!arq) return;
    var num = Docs_s_(r.OS_NUMERO || os.NUMERO), rev = Docs_s_(r.REVISAO || r.VERSAO);
    add({ origem: 'ATEC_RELATORIOS', modulo: 'ORDEM_SERVICO', tipo: 'Relatório de atendimento técnico', titulo: 'Relatório de atendimento — O.S. ' + num + (Number(rev) > 0 ? ' · Rev. ' + ('0' + rev).slice(-2) : ''),
      nome: '', numero: num, revisao: rev, clienteId: Docs_s_(os.CLIENTE_ID), unidadeId: Docs_s_(os.UNIDADE_ID), equipamentoId: Docs_s_(os.EQUIPAMENTO_ID),
      emitidoIso: Docs_iso_(r.EMITIDO_EM) || Docs_iso_(r.CRIADO_EM), validadeIso: '', situacao: 'VIGENTE', arquivoId: arq, link: Docs_s_(r.PDF_URL), publico: true, chave: 'OS:' + num });
  });

  // 7. Relatórios de ciclo da lavadora (LAVCIC_RELATORIOS).
  Docs_ler_((typeof LAVCIC_ABAS !== 'undefined' && LAVCIC_ABAS.RELATORIOS) || 'LAVCIC_RELATORIOS').forEach(function (r) {
    var st = Docs_up_(r.SITUACAO || 'ATIVO');
    if (st !== 'ATIVO' && st !== 'SUBSTITUIDO') return;
    var arq = Docs_s_(r.PDF_ID) || Docs_idDoLink_(r.PDF_URL) || Docs_s_(r.HTML_ID);
    if (!arq) return;
    var num = Docs_s_(r.NUMERO);
    add({ origem: 'LAVCIC', modulo: 'CICLO_LAVADORA', tipo: 'Relatório de ciclo da lavadora', titulo: 'Relatório de ciclo da lavadora' + (num ? ' nº ' + num : '') + (Docs_s_(r.LOTE) ? ' · lote ' + Docs_s_(r.LOTE) : ''),
      nome: '', numero: num, revisao: Docs_s_(r.VERSAO), clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: Docs_s_(r.UNIDADE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID),
      emitidoIso: Docs_iso_(r.EMITIDO_EM) || Docs_iso_(r.DATA_CICLO), validadeIso: '', situacao: st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : 'VIGENTE', arquivoId: arq, link: Docs_s_(r.PDF_URL), publico: true, chave: 'LAVCIC:' + (num || r.ID) });
  });

  // 8. Relatórios A4 da Representação (REP_DOCUMENTOS): a versão do cliente vai ao cliente; a interna, só à equipe.
  Docs_ler_('REP_DOCUMENTOS').forEach(function (r) {
    if (Docs_s_(r.DESLIGADO_EM)) return;
    var arq = Docs_s_(r.PDF_ID) || Docs_s_(r.HTML_ID);
    if (!arq) return;
    var cli = Docs_up_(r.PUBLICO) === 'CLIENTE', tb = Docs_up_(r.TIPO);
    var tipo = /PERIODO/.test(tb) ? 'Relatório do período' : /TERMO/.test(tb) ? 'Termo do atendimento' : /DOSSIE/.test(tb) ? 'Dossiê do atendimento' : 'Relatório de atendimento';
    add({ origem: 'REP_DOCUMENTOS', modulo: 'REPRESENTACAO', tipo: tipo, titulo: tipo + (Docs_s_(r.NUMERO) ? ' nº ' + Docs_s_(r.NUMERO) : '') + (cli ? '' : ' (versão interna)'),
      nome: '', numero: Docs_s_(r.NUMERO), revisao: Docs_s_(r.VERSAO), clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: Docs_s_(r.UNIDADE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID),
      emitidoIso: Docs_iso_(r.EM) || Docs_iso_(r.CRIADO_EM), validadeIso: '', situacao: 'VIGENTE', arquivoId: arq, link: '', publico: cli, chave: 'REP:' + Docs_up_(r.TIPO) + ':' + Docs_s_(r.NUMERO || r.ID) + ':' + Docs_up_(r.PUBLICO) });
  });

  // 9. Revisões emitidas (DOC_REVISOES) dos módulos sem tabela própria: relatório de calibração, declarações, PGT/POP, registros
  //    operacionais, cronograma e planejamento do CME. Ligadas ao cliente pelo equipamento ou pelo CNPJ.
  var comTabela = { CERTIFICADO_CALIBRACAO: 1, NR13: 1, BAIXA_TEMPERATURA: 1, ORDEM_SERVICO: 1, AUTOCLAVE: 1, AUTOCLAVE_DADOS: 1, LAVADORA: 1, LAVADORA_DADOS: 1,
    ESTUFA: 1, ESTUFA_DADOS: 1, CADEIA_FRIO: 1, CADEIA_FRIO_DADOS: 1 };
  var revs = [];
  try { revs = typeof SGO_DocRev_lerControle_ === 'function' ? SGO_DocRev_lerControle_() : []; } catch (e) { revs = []; }
  revs.forEach(function (r) {
    var mod = Docs_up_(r.MODULO), st = Docs_up_(r.STATUS);
    if (comTabela[mod] || (st !== 'EMITIDO' && st !== 'SUBSTITUIDO')) return;
    var arq = Docs_s_(r.PDF_ID) || Docs_idDoLink_(r.PDF_URL) || Docs_s_(r.HTML_ID) || Docs_idDoLink_(r.HTML_URL);
    if (!arq) return;
    var nomeMod = (typeof SGO_DOCREV_MODULOS !== 'undefined' && SGO_DOCREV_MODULOS[mod]) || 'Documento';
    var suspenso = mod === 'PGT_POP' && Docs_pgtSuspenso_(r.EMITIDO_EM);
    var rev = Docs_s_(r.REVISAO);
    add({ origem: 'DOC_REVISOES', modulo: mod, tipo: nomeMod, titulo: (Docs_s_(r.TITULO) || nomeMod) + (Docs_s_(r.NUMERO) && Docs_s_(r.TITULO).indexOf(Docs_s_(r.NUMERO)) < 0 ? ' nº ' + Docs_s_(r.NUMERO) : '') + (Number(rev) > 0 ? ' · Rev. ' + ('0' + rev).slice(-2) : ''),
      nome: '', numero: Docs_s_(r.NUMERO), revisao: rev, clienteId: '', unidadeId: '', equipamentoId: Docs_s_(r.EQUIPAMENTO_ID), cnpj: Docs_digitos_(r.CNPJ),
      emitidoIso: Docs_iso_(r.EMITIDO_EM), geradoIso: Docs_iso_(r.EMITIDO_EM), validadeIso: '', situacao: st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : suspenso ? 'SUSPENSO' : 'VIGENTE',
      // 18/11/2026: SUBSTITUIDO marcado só pelo número (o POP003 de um cliente substituía o POP003 de outro): recalculado no índice
      porNumero: st === 'SUBSTITUIDO', suspenso: suspenso,
      arquivoId: arq, link: Docs_s_(r.PDF_URL), publico: true, chave: 'REV:' + mod + ':' + (Docs_numChave_(r.NUMERO) || Docs_s_(r.ID)) });
  });

  // 10. Listas próprias do PGT/POP e dos Registros operacionais (planilha de cada módulo, pelo CNPJ). Só lê; não cria planilha.
  if (!o.semPlanilhasModulo) {
    var abaPgt = (typeof PGTPOP_CFG !== 'undefined' && PGTPOP_CFG.PLANILHA && PGTPOP_CFG.PLANILHA.ABAS && PGTPOP_CFG.PLANILHA.ABAS.DOCUMENTOS) || 'MOV_DOCUMENTOS';
    Docs_planilhaModulo_('PGTPOP_DB_ID', abaPgt).forEach(function (r) {
      var nome = Docs_s_(r.NOME_ARQUIVO), arq = Docs_idDoLink_(r.URL);
      if (!arq) return;
      var tipo = Docs_up_(r.TIPO_DOCUMENTO) === 'PGT' ? 'PGT' : 'POP';
      add({ origem: 'PGTPOP_LISTA', modulo: 'PGT_POP', tipo: tipo === 'PGT' ? 'Plano de Gerenciamento das Tecnologias em Saúde (PGT)' : 'Procedimento Operacional Padrão (POP)', titulo: Docs_semExt_(nome) || tipo,
        nome: nome, numero: '', revisao: '', clienteId: '', unidadeId: '', equipamentoId: '', cnpj: Docs_digitos_(r.CNPJ), emitidoIso: Docs_iso_(r.DATA), validadeIso: '',
        situacao: Docs_pgtSuspenso_(r.DATA) ? 'SUSPENSO' : 'VIGENTE', arquivoId: arq, link: Docs_s_(r.URL), publico: true, chave: 'PGT:' + Docs_digitos_(r.CNPJ) + ':' + Docs_chaveNome_(nome) });
    });
    var abaReg = (typeof REGOP_CFG !== 'undefined' && REGOP_CFG.PLANILHA && REGOP_CFG.PLANILHA.ABAS && REGOP_CFG.PLANILHA.ABAS.DOCUMENTOS) || 'MOV_DOCUMENTOS';
    Docs_planilhaModulo_('REGOP_DB_ID', abaReg).forEach(function (r) {
      var nome = Docs_s_(r.NOME_ARQUIVO), arq = Docs_idDoLink_(r.URL);
      if (!arq) return;
      add({ origem: 'REGOP_LISTA', modulo: 'REGISTROS_OPERACIONAIS', tipo: 'Registro operacional', titulo: Docs_semExt_(nome) || 'Registro operacional', nome: nome, numero: '', revisao: '',
        clienteId: '', unidadeId: '', equipamentoId: '', cnpj: Docs_digitos_(r.CNPJ), emitidoIso: Docs_iso_(r.DATA), validadeIso: '', situacao: 'VIGENTE', arquivoId: arq, link: Docs_s_(r.URL),
        publico: true, chave: 'REG:' + Docs_digitos_(r.CNPJ) + ':' + Docs_chaveNome_(nome) });
    });
  }

  // 11. Contratos de cliente com o PDF assinado (CLI_CONTRATOS): pasta interna, só para quem vê contratos (sem valores).
  if (o.comContratos) {
    Docs_ler_((typeof PCL_ABAS !== 'undefined' && PCL_ABAS.CONTRATOS) || 'CLI_CONTRATOS').forEach(function (r) {
      var arq = Docs_s_(r.ARQUIVO_ID);
      if (!arq || Docs_up_(r.PARTE_TIPO) === 'REPRESENTADA') return;
      var enc = Docs_up_(r.SITUACAO) === 'ENCERRADO';
      add({ origem: 'CLI_CONTRATOS', modulo: 'CONTRATO_CLIENTE', tipo: 'Contrato do cliente', titulo: 'Contrato' + (Docs_s_(r.NUMERO) ? ' nº ' + Docs_s_(r.NUMERO) : '') + (Number(r.VERSAO) > 1 ? ' · versão ' + Docs_s_(r.VERSAO) : ''),
        nome: '', numero: Docs_s_(r.NUMERO), revisao: Docs_s_(r.VERSAO), clienteId: Docs_s_(r.CLIENTE_ID), unidadeId: '', equipamentoId: '', emitidoIso: Docs_iso_(r.ATUALIZADO_EM) || Docs_iso_(r.CRIADO_EM),
        validadeIso: enc ? '' : Docs_dia_(r.VIGENCIA_FIM), situacao: enc ? 'ENCERRADO' : 'VIGENTE', arquivoId: arq, link: '', publico: false, chave: 'CTR:' + Docs_s_(r.ID) });
    });
  }
  return saida;
}

/** Prioridade quando o mesmo arquivo aparece em mais de uma fonte (a tabela do módulo sabe mais: número, validade, revisão). */
var DOCP_PRIORIDADE = { CERT_CALIBRACAO: 1, QUALIF_EMISSOES: 1, BT_ENSAIOS: 1, NR13_LAUDOS: 1, ATEC_OS: 1, LAVCIC: 1, REP_DOCUMENTOS: 1, CLI_CONTRATOS: 1,
  ATEC_RELATORIOS: 2, DOC_REVISOES: 2, ARQUIVO: 3, PGTPOP_LISTA: 4, REGOP_LISTA: 4 };

/**
 * Índice: documentos ligados ao cadastro, sem repetição do mesmo arquivo, com a pasta de cada um.
 * Devolve { itens, cad, cfg }. Cada item: os campos de Docs_coletar_ + pasta, origens (todas as fontes do mesmo arquivo), repeticoes.
 */
function Docs_indice_(opcoes) {
  var cfg = Docs_cfg_(), cad = Docs_cadastros_();
  var brutos = Docs_coletar_(opcoes);
  // liga ao cadastro: equipamento -> unidade e cliente; CNPJ -> cliente (e a unidade, quando o CNPJ é dela)
  brutos.forEach(function (x) {
    var eq = x.equipamentoId ? cad.mE[x.equipamentoId] : null;
    if (x.equipamentoId && !eq) x.equipamentoId = '';
    if (eq) { if (!x.clienteId) x.clienteId = Docs_s_(eq.CLIENTE_ID); if (!x.unidadeId) x.unidadeId = Docs_s_(eq.UNIDADE_ID); }
    if (!x.clienteId && x.cnpj && cad.porCnpj[x.cnpj]) { x.clienteId = cad.porCnpj[x.cnpj].clienteId; if (!x.unidadeId) x.unidadeId = cad.porCnpj[x.cnpj].unidadeId; }
    else if (x.clienteId && !x.unidadeId && x.cnpj && cad.porCnpj[x.cnpj] && cad.porCnpj[x.cnpj].clienteId === x.clienteId) x.unidadeId = cad.porCnpj[x.cnpj].unidadeId;
    if (x.unidadeId && !cad.mU[x.unidadeId]) x.unidadeId = '';
  });
  // um arquivo, um documento: junta as fontes do mesmo arquivo (a de maior prioridade vale; as outras completam o que falta)
  brutos.sort(function (a, b) { return (DOCP_PRIORIDADE[a.origem] || 9) - (DOCP_PRIORIDADE[b.origem] || 9); });
  var porArquivo = {}, itens = [];
  brutos.forEach(function (x) {
    if (!x.clienteId) return;
    var k = x.arquivoId ? x.clienteId + '|' + x.arquivoId : '';
    var ja = k ? porArquivo[k] : null;
    if (ja) {
      ja.origens[x.origem] = true;
      ja.repeticoes++;
      if (!ja.validadeIso && x.validadeIso) ja.validadeIso = x.validadeIso;
      if (!ja.geradoIso && x.geradoIso) ja.geradoIso = x.geradoIso;
      if (!ja.equipamentoId && x.equipamentoId) { ja.equipamentoId = x.equipamentoId; ja.unidadeId = ja.unidadeId || x.unidadeId; }
      if (!ja.unidadeId && x.unidadeId) ja.unidadeId = x.unidadeId;
      if (!ja.docDocumentoId && x.docDocumentoId) ja.docDocumentoId = x.docDocumentoId;
      // 18/11/2026 (Portal do cliente, etapa 3): a marca do Arquivo de documentos vale para o mesmo arquivo vindo de outro módulo; OCULTO prevalece
      if (x.portal === 'OCULTO' || (!ja.portal && x.portal)) ja.portal = x.portal;
      if (!ja.link && x.link) ja.link = x.link;
      if (ja.situacao === 'INATIVO' && x.situacao !== 'INATIVO') ja.situacao = x.situacao;
      return;
    }
    x.origens = {}; x.origens[x.origem] = true; x.repeticoes = 0;
    x.pasta = Docs_classificar_({ modulo: x.modulo, tipo: x.tipoBruto || x.tipo, nome: x.nome || x.titulo }, cfg);
    if (k) porArquivo[k] = x;
    itens.push(x);
  });
  itens.forEach(function (x) { x.chave = Docs_vinculo_(x) + '|' + Docs_s_(x.chave || (x.origem + ':' + (x.arquivoId || x.titulo))); x.kExcl = Docs_chaveExcl_(x); });
  // 18/11/2026: documento excluído da pasta (exclusão lógica) sai antes das versões: ele não pertence àquele equipamento ou cliente
  var exc = Docs_exclusoes_(), excluidos = [];
  itens = itens.filter(function (x) {
    var e = exc[x.kExcl];
    if (!e) return true;
    x.exclusao = { id: Docs_s_(e.ID), motivo: Docs_s_(e.MOTIVO), porNome: Docs_s_(e.POR_NOME), em: Docs_s_(e.EM) };
    excluidos.push(x);
    return false;
  });
  Docs_resolverVersoes_(itens);
  return { itens: itens, excluidos: excluidos, cad: cad, cfg: cfg };
}

/** 18/11/2026: chave da exclusão — o arquivo (vale para todas as fontes do mesmo arquivo); sem arquivo, a chave de versão. */
function Docs_chaveExcl_(x) { return x.arquivoId ? 'A:' + x.arquivoId : 'K:' + Docs_s_(x.chave); }
/** Exclusões em vigor: { chave: linha } (a mais recente de cada chave; restaurada não conta). Aba ausente = nenhuma. */
function Docs_exclusoes_() {
  var m = {};
  Docs_ler_(DOCP_ABA_EXCLUSOES).slice().sort(function (a, b) { return Docs_s_(a.EM).localeCompare(Docs_s_(b.EM)); }).forEach(function (r) {
    var k = Docs_s_(r.CHAVE);
    if (!k) return;
    if (Docs_up_(r.SITUACAO) === 'EXCLUIDO') m[k] = r; else delete m[k];
  });
  return m;
}
/** O arquivo foi excluído da pasta? (trava de arquivo e listas antigas da conta de cliente) */
function Docs_arquivoExcluido_(arquivoId) { var id = Docs_s_(arquivoId); return !!id && !!Docs_exclusoes_()['A:' + id]; }

/** 18/11/2026: vínculo do documento para a chave de versão — o equipamento; sem equipamento, a unidade; sem unidade, o cliente. */
function Docs_vinculo_(x) { return x.equipamentoId ? 'E:' + x.equipamentoId : x.unidadeId ? 'U:' + x.unidadeId : 'C:' + x.clienteId; }
/** Ordem de geração (o mais novo primeiro): quando foi gerado, quando foi emitido, revisão, número. */
function Docs_maisNovo_(a, b) {
  var qa = Docs_s_(a.geradoIso || a.emitidoIso || a.quandoIso || a.quando), qb = Docs_s_(b.geradoIso || b.emitidoIso || b.quandoIso || b.quando);
  return qb.localeCompare(qa) || Docs_s_(b.emitidoIso).localeCompare(Docs_s_(a.emitidoIso)) || (Number(b.revisao) || 0) - (Number(a.revisao) || 0) || Docs_s_(b.numero).localeCompare(Docs_s_(a.numero));
}
/** Peso da situação na escolha do oficial: vigente (ou SUBSTITUIDO só pelo número) antes de substituído pelo módulo, e este antes de inativo. */
function Docs_pesoSituacao_(x) {
  if (x.situacao === 'INATIVO') return 3;
  if (x.situacao === 'SUBSTITUIDO' && !x.porNumero) return 2;
  return 0;
}

/**
 * 18/11/2026: em cada chave de versão (dentro do mesmo vínculo) só o último gerado é o oficial; os outros passam a SUBSTITUIDO
 * (substituidoPor = título do oficial). Minuta não entra (fica à parte, só para a equipe). Nada é apagado. Muda os itens no lugar.
 */
function Docs_resolverVersoes_(itens) {
  var grupos = {};
  itens.forEach(function (x) {
    if (x.situacao === 'MINUTA') return;
    (grupos[x.chave] = grupos[x.chave] || []).push(x);
  });
  Object.keys(grupos).forEach(function (k) {
    var g = grupos[k].slice().sort(function (a, b) { return Docs_pesoSituacao_(a) - Docs_pesoSituacao_(b) || Docs_maisNovo_(a, b); });
    var oficial = g[0];
    if (oficial.porNumero && oficial.situacao === 'SUBSTITUIDO') oficial.situacao = oficial.suspenso ? 'SUSPENSO' : 'VIGENTE';
    g.slice(1).forEach(function (x) {
      if (x.situacao === 'VIGENTE' || x.situacao === 'SUSPENSO' || x.situacao === 'ENCERRADO') x.situacao = 'SUBSTITUIDO';
      x.substituidoPor = oficial.titulo;
    });
  });
}

/* ============================================================ quem vê o quê */

/** Quem está olhando: { cliente, cid, equipe, via, podeContratos, perfil, sessao }. */
function Docs_leitor_(sessao, via) {
  var perfil = Docs_up_(sessao && sessao.perfil), cliente = perfil === 'CLIENTE';
  var podeContratos = false;
  if (!cliente) {
    try {
      if (typeof SGO_pode_ === 'function') podeContratos = !!SGO_pode_(sessao, 'PORTAL_CLIENTE_CONTRATOS_VER');
      else podeContratos = ['ADMIN', 'DIRETORIA', 'GESTOR'].indexOf(perfil) >= 0;
    } catch (e) { podeContratos = false; }
  }
  // 18/11/2026 (Portal do cliente, etapa 1): papel e unidades da conta de cliente (Solicitante e Consulta veem só as unidades marcadas)
  var pclEsc = null;
  if (cliente && typeof PCl_escopo_ === 'function') { try { if (typeof PCl_memoLimpar_ === 'function') PCl_memoLimpar_(); pclEsc = PCl_escopo_(sessao && sessao.userId); } catch (e) { pclEsc = null; } }
  return { cliente: cliente, cid: Docs_s_(sessao && sessao.clienteId), perfil: perfil, via: Docs_s_(via).toLowerCase() || 'ficha', podeContratos: podeContratos, sessao: sessao, pclEsc: pclEsc && !pclEsc.todas ? pclEsc : null };
}
/** 18/11/2026: o documento está nas unidades da conta de cliente? (sem unidade no documento, vale a do equipamento) */
function Docs_naUnidadeDoLeitor_(it, v) {
  if (!v || !v.pclEsc || typeof PCl_escopoUnidade_ !== 'function') return true;
  var un = Docs_s_(it.unidadeId) || (typeof PClA_unidadeDoEquip_ === 'function' ? PClA_unidadeDoEquip_(it.equipamentoId) : '');
  return PCl_escopoUnidade_(v.pclEsc, un);
}

/** O documento aparece para este leitor? (pasta interna, minuta, suspenso, inativo, versão interna, cliente de outro) */
function Docs_visivel_(it, v, cfg) {
  var p = cfg.pastas[it.pasta] || cfg.pastas.OUTROS;
  var publica = v.cliente || v.via === 'qr' || v.via === 'portal';
  if (v.cliente && it.clienteId !== v.cid) return false;
  if (v.cliente && !Docs_naUnidadeDoLeitor_(it, v)) return false;
  if (publica) {
    if (p.interna || !p.clienteVe || !it.publico) return false;
    // 18/11/2026 (Portal do cliente, etapa 3): documento marcado OCULTO no portal não vai ao cliente nem ao QR Code (a ficha da equipe continua mostrando)
    if (it.portal === 'OCULTO') return false;
    if (it.situacao === 'MINUTA' || it.situacao === 'INATIVO') return false;
    if (v.cliente && (it.situacao === 'SUSPENSO' || !it.arquivoId)) return false;
    return true;
  }
  return true;
}

/** Link para abrir: conta de cliente sempre pela rota do SGO+ (/arquivos/<id>, trava do portal); equipe, o link registrado. */
function Docs_url_(it, v) {
  if (!it.arquivoId && !it.link) return '';
  if (v.cliente) return it.arquivoId ? '/arquivos/' + it.arquivoId : '';
  if (it.link && (/^\/arquivos\//.test(it.link) || /^https?:\/\//i.test(it.link))) return it.link;
  return it.arquivoId ? '/arquivos/' + it.arquivoId : '';
}

function Docs_situacaoTexto_(s) {
  return { VIGENTE: 'Vigente', SUBSTITUIDO: 'Versão anterior (substituída)', MINUTA: 'Aguardando aprovação do responsável técnico (não vai ao cliente)', INATIVO: 'Inativo no Arquivo de documentos',
    SUSPENSO: 'Suspenso: será refeito pela geração revisada (não entregue ao cliente)', ENCERRADO: 'Contrato encerrado' }[s] || '';
}

/** Vencimento do documento vigente: vencido | vencendo (0 = vence hoje) | em_dia | sem_vencimento, com o texto pronto. */
function Docs_vencimento_(validadeIso, hoje, diasVencendo) {
  var dias = Docs_diasAte_(validadeIso, hoje), br = Docs_br_(validadeIso);
  if (dias === null) return { s: 'sem_vencimento', dias: null, texto: 'Sem vencimento' };
  if (dias < 0) return { s: 'vencido', dias: dias, texto: 'Vencido há ' + (-dias) + (dias === -1 ? ' dia' : ' dias') + ' (' + br + ')' };
  if (dias === 0) return { s: 'vencendo', dias: 0, texto: 'Vence hoje (' + br + ')' };
  if (dias <= diasVencendo) return { s: 'vencendo', dias: dias, texto: 'Vence em ' + dias + (dias === 1 ? ' dia' : ' dias') + ' (' + br + ')' };
  return { s: 'em_dia', dias: dias, texto: 'Válido até ' + br };
}

/* ============================================================ agrupamento por pasta e por versão */

/**
 * Agrupa itens já filtrados: pasta -> documento (a versão mais nova na frente; as outras em "anteriores").
 * Serve também para listas de outras telas (SGO_EnviarDoc.js): cada item precisa de pasta, chave e quandoIso (ou emitidoIso).
 * Devolve [{ id, nome, icone, descricao, interna, total, vencidos, vencendo, itens: [item + anteriores] }] na ordem das pastas.
 */
function Docs_agruparLista_(lista, cfg, opcoes) {
  cfg = cfg || Docs_cfg_();
  var o = opcoes || {};
  var porPasta = {};
  (lista || []).forEach(function (it) {
    var pid = cfg.pastas[it.pasta] ? it.pasta : 'OUTROS';
    var grupos = porPasta[pid] || (porPasta[pid] = {});
    var k = it.chave || it.chaveVersao || it.k || Math.random().toString(36);
    // 18/11/2026: minuta aguardando aprovação fica à parte (nunca esconde o documento oficial nem vira "versão anterior")
    if (it.situacao === 'MINUTA') k += '#MINUTA#' + (it.k || Math.random().toString(36));
    (grupos[k] = grupos[k] || []).push(it);
  });
  var quando = function (x) { return Docs_s_(x.emitidoIso || x.quandoIso || x.quando); };
  return DOCP_PASTAS.filter(function (p) { return !o.soComItens || porPasta[p.id]; }).map(function (p) {
    var cp = cfg.pastas[p.id], itens = [];
    Object.keys(porPasta[p.id] || {}).forEach(function (k) {
      var g = porPasta[p.id][k].slice().sort(function (a, b) {
        return (a.situacao === 'INATIVO') - (b.situacao === 'INATIVO') || Docs_maisNovo_(a, b);
      });
      var principal = g.filter(function (x) { return x.situacao !== 'SUBSTITUIDO' && x.situacao !== 'INATIVO'; })[0] || g[0];
      var resto = g.filter(function (x) { return x !== principal; });
      principal.anteriores = resto.map(function (x) { if (x.situacao === 'VIGENTE') { x.situacao = 'SUBSTITUIDO'; x.situacaoTexto = Docs_situacaoTexto_('SUBSTITUIDO'); } return x; });
      itens.push(principal);
    });
    itens.sort(function (a, b) { return (a.situacao === 'INATIVO') - (b.situacao === 'INATIVO') || quando(b).localeCompare(quando(a)); });
    var venc = itens.filter(function (x) { return x.venc && x.venc.s === 'vencido'; }).length, vendo = itens.filter(function (x) { return x.venc && x.venc.s === 'vencendo'; }).length;
    return { id: p.id, nome: cp.nome, icone: p.icone, descricao: p.descricao, interna: !!p.interna, total: itens.filter(function (x) { return x.situacao !== 'INATIVO'; }).length, vencidos: venc, vencendo: vendo, itens: itens };
  });
}

/** Item que vai à tela (sem campos internos para a conta de cliente). */
function Docs_itemTela_(it, v, cad, hoje, cfg) {
  var eq = it.equipamentoId ? cad.mE[it.equipamentoId] : null, un = it.unidadeId ? cad.mU[it.unidadeId] : null;
  var url = Docs_url_(it, v);
  var abre = !!url && (!v.cliente || Object.keys(it.origens || {}).some(function (k) { return DOCP_ORIGENS_TRAVA[k]; }) || cfg.clienteAbreProntuario);
  var out = {
    k: it.origem + ':' + (it.arquivoId || it.chave), chave: it.chave, pasta: it.pasta, titulo: it.titulo, tipo: it.tipo, numero: it.numero, revisao: it.revisao,
    unidadeId: it.unidadeId, unidadeNome: un ? Docs_s_(un.NOME_UNIDADE) : '', equipamentoId: it.equipamentoId,
    equipamentoNome: eq ? [Docs_s_(eq.TAG), Docs_s_(eq.TIPO)].filter(Boolean).join(' · ') : '',
    emitidoIso: Docs_dia_(it.emitidoIso), emitido: Docs_br_(it.emitidoIso), geradoIso: Docs_s_(it.geradoIso), validadeIso: it.validadeIso, validade: Docs_br_(it.validadeIso),
    venc: it.situacao === 'VIGENTE' ? Docs_vencimento_(it.validadeIso, hoje, cfg.diasVencendo) : null,
    situacao: it.situacao, situacaoTexto: Docs_situacaoTexto_(it.situacao), url: abre ? url : '', podeAbrir: abre,
    semAbrirTexto: abre ? '' : (v.cliente ? 'O arquivo deste documento ainda não está liberado para abrir pelo portal. Peça a cópia à Metrolabs pela conversa geral.'
      : it.situacao === 'MINUTA' ? 'Minuta aguardando a aprovação do responsável técnico: a prévia fica na tela do módulo, em "Aguardando aprovação". Depois de aprovada, ela aparece aqui com o arquivo.'
      : 'Documento sem arquivo: abra o registro no Arquivo de documentos, toque em Editar e anexe o arquivo.'),
    origemNome: DOCP_ORIGEM_NOMES[it.origem] || ''
  };
  if (!v.cliente) { out.arquivoId = it.arquivoId; out.docDocumentoId = it.docDocumentoId || ''; out.repeticoes = it.repeticoes || 0; out.portal = it.portal || ''; out.substituidoPor = it.situacao === 'SUBSTITUIDO' ? Docs_s_(it.substituidoPor) : ''; out.kExcl = Docs_s_(it.kExcl); }
  return out;
}

/* ============================================================ consultas por cliente, unidade e equipamento */

/**
 * Documentos de um escopo para um leitor. escopo: 'cliente' | 'unidade' | 'equipamento'. Devolve a resposta da tela:
 * { pastas, total, vencidos, vencendo, porEquipamento, porUnidade, unidades, equipamentos, alvo }.
 */
function Docs_montar_(v, escopo, id, opcoes) {
  var o = opcoes || {};
  var idx = Docs_indice_({ comContratos: !v.cliente && v.podeContratos && v.via === 'ficha' && escopo !== 'equipamento', semPlanilhasModulo: !!o.semPlanilhasModulo });
  var cad = idx.cad, cfg = idx.cfg, hoje = Docs_hoje_();
  var alvo = null, clienteId = '', unidadeId = '', eq = null;
  if (escopo === 'cliente') { alvo = cad.mC[id]; clienteId = id; }
  else if (escopo === 'unidade') { alvo = cad.mU[id]; unidadeId = id; clienteId = alvo ? Docs_s_(alvo.CLIENTE_ID) : ''; }
  else if (escopo === 'equipamento') { eq = alvo = cad.mE[id]; clienteId = alvo ? Docs_s_(alvo.CLIENTE_ID) : ''; unidadeId = alvo ? Docs_s_(alvo.UNIDADE_ID) : ''; }
  if (!alvo) throw new Error(escopo === 'equipamento' ? 'Equipamento não encontrado no cadastro. Atualize a lista e tente de novo.' : escopo === 'unidade' ? 'Unidade não encontrada no cadastro. Atualize a lista e tente de novo.' : 'Cliente não encontrado no cadastro. Atualize a lista e tente de novo.');
  // 18/11/2026 (Portal do cliente, etapa 1): unidade ou equipamento fora das unidades da pessoa = a mesma resposta de inexistente
  if (v.cliente && v.pclEsc && escopo !== 'cliente' && clienteId === v.cid && !PCl_escopoUnidade_(v.pclEsc, escopo === 'unidade' ? id : unidadeId)) {
    if (typeof PClA_recusaEscopo_ === 'function') PClA_recusaEscopo_(v.pclEsc, escopo === 'unidade' ? 'UNIDADE' : 'EQUIPAMENTO', id);
    throw new Error(escopo === 'equipamento' ? 'Equipamento não encontrado no cadastro. Atualize a lista e tente de novo.' : 'Unidade não encontrada no cadastro. Atualize a lista e tente de novo.');
  }
  if (v.cliente && clienteId !== v.cid) throw new Error('Acesso negado: este cadastro não pertence à sua empresa. Por quê: cada empresa vê só os próprios documentos. O que fazer: confira se entrou com o login da sua empresa; se o QR Code está num equipamento seu, avise a Metrolabs.');
  // 18/11/2026 (regra do dono): versão substituída (documento gerado de novo) só para Admin e Diretoria, na ficha da equipe
  var veSubst = Docs_veSubstituidos_(v), ocultos = 0;
  var lista = [];
  idx.itens.forEach(function (it) {
    if (it.clienteId !== clienteId || !Docs_visivel_(it, v, cfg)) return;
    // 18/11/2026: vínculo exato. Equipamento: só o que tem o ID dele (PGT, POP e registros da unidade não entram).
    // Unidade: só o que está ligado a ela (documento só do cliente fica na pasta do cliente).
    if (escopo === 'equipamento' && it.equipamentoId !== id) return;
    if (escopo === 'unidade' && it.unidadeId !== unidadeId) return;
    if (it.situacao === 'SUBSTITUIDO' && !veSubst) { ocultos++; return; }
    lista.push(it);
  });
  var telas = lista.map(function (it) { var t = Docs_itemTela_(it, v, cad, hoje, cfg); return t; });
  // pasta interna (contratos e propostas): só na ficha da equipe; o cliente e o QR Code nunca a recebem
  var pastas = Docs_agruparLista_(telas, cfg).filter(function (p) { var cp = cfg.pastas[p.id]; return !(p.interna && (v.cliente || v.via !== 'ficha')) && !((v.cliente || v.via !== 'ficha') && !cp.clienteVe); })
    // 18/11/2026: PGT, POP e registros operacionais são da unidade; no equipamento a pasta só aparece se houver documento com o ID dele
    .filter(function (p) { return !(escopo === 'equipamento' && DOCP_PASTAS_DA_UNIDADE[p.id] && !p.itens.length); });
  var porEquipamento = {}, porUnidade = {}, total = 0, vencidos = 0, vencendo = 0;
  pastas.forEach(function (p) {
    total += p.total; vencidos += p.vencidos; vencendo += p.vencendo;
    p.itens.forEach(function (it) {
      if (it.situacao === 'INATIVO') return;
      if (it.equipamentoId) porEquipamento[it.equipamentoId] = (porEquipamento[it.equipamentoId] || 0) + 1;
      if (it.unidadeId) porUnidade[it.unidadeId] = (porUnidade[it.unidadeId] || 0) + 1;
    });
  });
  var unidades = [], equipamentos = [];
  if (escopo !== 'equipamento') {
    Object.keys(cad.mU).forEach(function (uid) { var u = cad.mU[uid]; if (Docs_s_(u.CLIENTE_ID) === clienteId && (escopo === 'cliente' || uid === unidadeId)) unidades.push({ id: uid, nome: Docs_s_(u.NOME_UNIDADE) || 'Unidade sem nome', qtd: porUnidade[uid] || 0 }); });
    Object.keys(porEquipamento).forEach(function (eid) { var e = cad.mE[eid]; if (e) equipamentos.push({ id: eid, nome: [Docs_s_(e.TAG), Docs_s_(e.TIPO)].filter(Boolean).join(' · ') || 'Equipamento sem identificação', unidadeId: Docs_s_(e.UNIDADE_ID), qtd: porEquipamento[eid] }); });
    unidades.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    equipamentos.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  }
  var nomeAlvo = escopo === 'cliente' ? (Docs_s_(alvo.NOME_FANTASIA) || Docs_s_(alvo.RAZAO_SOCIAL)) : escopo === 'unidade' ? Docs_s_(alvo.NOME_UNIDADE) : [Docs_s_(alvo.TAG), Docs_s_(alvo.TIPO)].filter(Boolean).join(' · ');
  return { success: true, escopo: escopo, id: id, via: v.via, cliente: v.cliente, alvo: { id: id, nome: nomeAlvo }, hoje: Docs_br_(hoje), diasVencendo: cfg.diasVencendo,
    pastas: pastas, total: total, vencidos: vencidos, vencendo: vencendo, porEquipamento: porEquipamento, porUnidade: porUnidade, unidades: unidades, equipamentos: equipamentos,
    substituidosVisiveis: veSubst, substituidosOcultos: v.cliente ? 0 : ocultos,
    // 18/11/2026: excluir documento da pasta (só na ficha da equipe) e a lista de excluídos (só Administrador e Diretoria)
    clienteNome: cad.mC[clienteId] ? (Docs_s_(cad.mC[clienteId].NOME_FANTASIA) || Docs_s_(cad.mC[clienteId].RAZAO_SOCIAL)) : '',
    podeExcluir: !v.cliente && v.via === 'ficha' && Docs_podeExcluir_(v.sessao),
    veExcluidos: Docs_veExcluidos_(v),
    excluidos: Docs_veExcluidos_(v) ? (idx.excluidos || []).filter(function (it) {
      if (it.clienteId !== clienteId) return false;
      if (escopo === 'equipamento') return it.equipamentoId === id;
      if (escopo === 'unidade') return it.unidadeId === unidadeId;
      return true;
    }).map(function (it) {
      var e = it.equipamentoId ? cad.mE[it.equipamentoId] : null;
      return { id: it.exclusao.id, titulo: it.titulo, pasta: (cfg.pastas[it.pasta] || cfg.pastas.OUTROS).nome, equipamentoNome: e ? [Docs_s_(e.TAG), Docs_s_(e.TIPO)].filter(Boolean).join(' · ') : '',
        emitido: Docs_br_(it.emitidoIso), motivo: it.exclusao.motivo, porNome: it.exclusao.porNome, em: Docs_br_(it.exclusao.em) + (Docs_iso_(it.exclusao.em).length > 10 ? ' ' + Docs_iso_(it.exclusao.em).slice(11, 16) : ''), url: Docs_url_(it, v) };
    }) : [] };
}

/** 18/11/2026: pode excluir documento da pasta? Caixa DOCP_EXCLUIR; sem o catálogo de caixas, Administrador e Diretoria. */
function Docs_podeExcluir_(sessao) {
  var p = Docs_up_(sessao && sessao.perfil);
  if (!sessao || p === 'CLIENTE' || p === 'REPRESENTADA') return false;
  try { if (typeof SGO_pode_ === 'function') return !!SGO_pode_(sessao, 'DOCP_EXCLUIR'); } catch (e) {}
  return p === 'ADMIN' || p === 'DIRETORIA';
}
/** Só Administrador e Diretoria veem a lista de excluídos e restauram (na ficha da equipe). */
function Docs_veExcluidos_(v) { return !!v && !v.cliente && v.via === 'ficha' && (v.perfil === 'ADMIN' || v.perfil === 'DIRETORIA'); }

function Docs_garantirAbaExclusoes_() {
  if (typeof CertCal_garantirTabela_ !== 'function') return;
  CertCal_garantirTabela_(DOCP_ABA_EXCLUSOES, DOCP_COLUNAS_EXCLUSOES);
  if (typeof CertCal_garantirColuna_ === 'function') DOCP_COLUNAS_EXCLUSOES.forEach(function (c) { CertCal_garantirColuna_(DOCP_ABA_EXCLUSOES, c); });
}
function Docs_agora_() { try { return Utilities.formatDate(new Date(), DOCP_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); } catch (e) { return new Date().toISOString().slice(0, 19); } }

/**
 * 18/11/2026: excluir, restaurar e listar documentos excluídos das pastas. Exclusão lógica: só grava a linha em DOCP_EXCLUSOES.
 * acao 'excluir': dados { k (chave do documento na lista), motivo }; 'restaurar': dados { id, motivo }; 'excluidos': dados { clienteId }.
 */
function documentosPastasAcao(sessionId, acao, dados) {
  try {
    var sessao = exigirSessao(String(sessionId || ''));
    var d = dados || {}, a = Docs_s_(acao).toLowerCase(), perfil = Docs_up_(sessao.perfil);
    var quem = Docs_s_(sessao.nome || sessao.usuario), quemId = Docs_s_(sessao.userId);
    if (perfil === 'CLIENTE' || perfil === 'REPRESENTADA') return { success: false, message: 'Acesso negado: excluir ou restaurar documento das pastas é da equipe da Metrolabs. Por quê: a conta de fora só consulta os próprios documentos. O que fazer: se um documento não é da sua empresa, avise a Metrolabs pela conversa geral.' };
    var motivo = Docs_s_(d.motivo).replace(/\s+/g, ' ');
    if (a === 'excluir') {
      if (!Docs_podeExcluir_(sessao)) return { success: false, message: 'Acesso negado: você não tem a caixa «Excluir documento da pasta». Por quê: tirar um documento do prontuário muda o que o cliente e a fiscalização veem. O que fazer: peça ao Administrador para liberar a caixa em Administração > Acessos, ou peça a quem tem a caixa para excluir.' };
      if (motivo.length < DOCP_MOTIVO_MIN) return { success: false, campo: 'motivo', message: 'Falta o motivo: escreva por que o documento sai desta pasta (pelo menos ' + DOCP_MOTIVO_MIN + ' letras), por exemplo "certificado de outro cliente, registrado por engano". Por quê: a exclusão fica registrada para auditoria.' };
      var k = Docs_s_(d.k);
      var idx = Docs_indice_({});
      var it = idx.itens.filter(function (x) { return x.kExcl === k; })[0];
      if (!it) {
        if ((idx.excluidos || []).some(function (x) { return x.kExcl === k; })) return { success: false, message: 'Este documento já está excluído da pasta. O que fazer: atualize a lista (F5). Para trazer de volta, peça ao Administrador ou à Diretoria (lista "Documentos excluídos").' };
        return { success: false, message: 'Documento não encontrado na lista. Por quê: ele pode ter mudado depois que a tela abriu. O que fazer: atualize a lista (F5) e tente de novo.' };
      }
      Docs_garantirAbaExclusoes_();
      var agora = Docs_agora_();
      SGO_DATA.insert(DOCP_ABA_EXCLUSOES, { ID: 'DX-' + (typeof Utilities !== 'undefined' && Utilities.getUuid ? Utilities.getUuid().slice(0, 8).toUpperCase() : Date.now().toString(36)), CHAVE: k, ARQUIVO_ID: Docs_s_(it.arquivoId),
        ORIGEM: Object.keys(it.origens || {}).join(',') || it.origem, TITULO: Docs_s_(it.titulo).slice(0, 300), PASTA: it.pasta, CLIENTE_ID: it.clienteId, UNIDADE_ID: it.unidadeId, EQUIPAMENTO_ID: it.equipamentoId,
        SITUACAO: 'EXCLUIDO', MOTIVO: motivo.slice(0, 1000), POR_ID: quemId, POR_NOME: quem, EM: agora, CRIADO_EM: agora });
      try { SGO_DATA.log('DOCUMENTO_EXCLUIDO_PASTA', quem, it.titulo + ' (' + k + ') do cliente ' + it.clienteId + (it.equipamentoId ? ', equipamento ' + it.equipamentoId : '') + '. Motivo: ' + motivo, 'DOCUMENTOS'); } catch (eL) {}
      try { if (typeof PCl_memoLimpar_ === 'function') PCl_memoLimpar_(); } catch (eM) {}
      return { success: true, message: 'Excluído da pasta: «' + it.titulo + '». Ele saiu do QR Code, das pastas, das fichas e do Portal do cliente. Nada foi apagado: o Administrador e a Diretoria veem o documento em "Documentos excluídos" e podem restaurar.' };
    }
    if (a === 'restaurar' || a === 'excluidos') {
      if (perfil !== 'ADMIN' && perfil !== 'DIRETORIA') return { success: false, message: 'Acesso negado: só o Administrador e a Diretoria veem os documentos excluídos e restauram. Por quê: a exclusão foi feita para proteger o cliente e a fiscalização. O que fazer: peça ao Administrador ou à Diretoria.' };
      if (a === 'excluidos') {
        var cid = Docs_s_(d.clienteId);
        var lin = Docs_ler_(DOCP_ABA_EXCLUSOES).filter(function (r) { return !cid || Docs_s_(r.CLIENTE_ID) === cid; }).map(function (r) {
          return { id: Docs_s_(r.ID), titulo: Docs_s_(r.TITULO), clienteId: Docs_s_(r.CLIENTE_ID), equipamentoId: Docs_s_(r.EQUIPAMENTO_ID), situacao: Docs_up_(r.SITUACAO), motivo: Docs_s_(r.MOTIVO), porNome: Docs_s_(r.POR_NOME), em: Docs_s_(r.EM),
            restauradoMotivo: Docs_s_(r.RESTAURADO_MOTIVO), restauradoPorNome: Docs_s_(r.RESTAURADO_POR_NOME), restauradoEm: Docs_s_(r.RESTAURADO_EM) };
        }).sort(function (x, y) { return y.em.localeCompare(x.em); });
        return { success: true, excluidos: lin };
      }
      if (motivo.length < DOCP_MOTIVO_MIN) return { success: false, campo: 'motivo', message: 'Falta o motivo: escreva por que o documento volta para a pasta (pelo menos ' + DOCP_MOTIVO_MIN + ' letras). Por quê: a restauração fica registrada para auditoria.' };
      var linha = Docs_ler_(DOCP_ABA_EXCLUSOES).filter(function (r) { return Docs_s_(r.ID) === Docs_s_(d.id); })[0];
      if (!linha || Docs_up_(linha.SITUACAO) !== 'EXCLUIDO') return { success: false, message: 'Exclusão não encontrada ou já restaurada. O que fazer: atualize a lista (F5).' };
      SGO_DATA.update(DOCP_ABA_EXCLUSOES, Docs_s_(linha.ID), { SITUACAO: 'RESTAURADO', RESTAURADO_MOTIVO: motivo.slice(0, 1000), RESTAURADO_POR_ID: quemId, RESTAURADO_POR_NOME: quem, RESTAURADO_EM: Docs_agora_() });
      try { SGO_DATA.log('DOCUMENTO_RESTAURADO_PASTA', quem, Docs_s_(linha.TITULO) + ' (' + Docs_s_(linha.CHAVE) + '). Motivo: ' + motivo, 'DOCUMENTOS'); } catch (eL2) {}
      try { if (typeof PCl_memoLimpar_ === 'function') PCl_memoLimpar_(); } catch (eM2) {}
      return { success: true, message: 'Restaurado: «' + Docs_s_(linha.TITULO) + '» voltou para a pasta e aparece de novo onde aparecia antes.' };
    }
    return { success: false, message: 'Pedido desconhecido. O que fazer: atualize a página (F5) e tente de novo.' };
  } catch (e) {
    return { success: false, message: typeof SGO_textoFalhaOperador_ === 'function' ? SGO_textoFalhaOperador_('excluir ou restaurar o documento da pasta', e) : String((e && e.message) || e) };
  }
}

/** 18/11/2026: quem vê as versões substituídas (documentos gerados de novo): só Admin e Diretoria, na ficha da equipe. */
function Docs_veSubstituidos_(v) { return !!v && !v.cliente && v.via === 'ficha' && (v.perfil === 'ADMIN' || v.perfil === 'DIRETORIA'); }

/** Histórico de atendimentos do equipamento sem relatório em PDF no SGO+ (Auvo e acervo): só a equipe, fora da contagem. */
function Docs_atendimentosSemPdf_(sessao, equipId) {
  if (typeof SGO_Atendimentos_doEquipamento_ !== 'function') return [];
  try {
    return (SGO_Atendimentos_doEquipamento_(equipId, { limite: 60, sessao: sessao }) || []).filter(function (a) { return a && a.origem !== 'SGO'; }).map(function (a) {
      return { data: Docs_br_(a.data), tipo: Docs_s_(a.tipo), numero: Docs_s_(a.numero), origemNome: Docs_s_(a.origemNome), tecnico: Docs_s_(a.tecnico), finalizada: !!a.finalizada, relatorioUrl: Docs_s_(a.relatorioUrl) };
    });
  } catch (e) { return []; }
}

function Docs_doCliente_(sessao, clienteId, via) { return Docs_montar_(Docs_leitor_(sessao, via), 'cliente', Docs_s_(clienteId)); }
function Docs_daUnidade_(sessao, unidadeId, via) { return Docs_montar_(Docs_leitor_(sessao, via), 'unidade', Docs_s_(unidadeId)); }
function Docs_doEquipamento_(sessao, equipamentoId, via) { return Docs_montar_(Docs_leitor_(sessao, via), 'equipamento', Docs_s_(equipamentoId)); }

/** Contagem por equipamento e unidade de um cliente (árvore da ficha do cliente). Sem as planilhas próprias de módulo (mais leve). */
function Docs_contagens_(sessao, clienteId) {
  var r = Docs_montar_(Docs_leitor_(sessao, 'ficha'), 'cliente', Docs_s_(clienteId), { semPlanilhasModulo: true });
  return { total: r.total, vencidos: r.vencidos, vencendo: r.vencendo, porEquipamento: r.porEquipamento, porUnidade: r.porUnidade };
}

/**
 * Trava de arquivo do Portal do cliente (SGO_PortalCliente_Seguranca.js): o arquivo é de um documento emitido do prontuário do
 * próprio cliente (pastas liberadas ao cliente, sem minuta, suspenso, inativo ou versão interna)? Desligável em DOCP_CFG.
 */
function Docs_arquivoDoCliente_(clienteId, arquivoId) {
  var cid = Docs_s_(clienteId), id = Docs_s_(arquivoId);
  if (!cid || !id) return false;
  var idx = Docs_indice_({});
  if (!idx.cfg.clienteAbreProntuario) return false;
  var v = { cliente: true, cid: cid, via: 'portal', podeContratos: false };
  return idx.itens.some(function (it) { return it.arquivoId === id && it.clienteId === cid && Docs_visivel_(it, v, idx.cfg); });
}

/* ============================================================ chamada das telas */

/**
 * documentosPastas(sessionId, { escopo, id, via }). via: 'ficha' (Cadastros), 'qr' (QR Code / prontuário no celular) ou 'portal'
 * (Arquivo de documentos da conta de cliente). Conta de cliente: só o próprio cliente. QR Code: as mesmas contas que abrem o
 * equipamento pelo QR (cliente dono e a equipe técnica). Fica registrado quem viu pelo QR Code.
 */
function documentosPastas(sessionId, params) {
  try {
    var sessao = exigirSessao(String(sessionId || ''));
    var p = params || {};
    var escopo = Docs_s_(p.escopo).toLowerCase(), id = Docs_s_(p.id);
    var v = Docs_leitor_(sessao, p.via);
    if (v.cliente && escopo === 'cliente' && !id) id = v.cid; // Arquivo de documentos da conta de cliente: a própria empresa
    if (['cliente', 'unidade', 'equipamento'].indexOf(escopo) < 0 || !id) throw new Error('Pedido incompleto: falta dizer de qual cliente, unidade ou equipamento são os documentos. Atualize a página (F5) e tente de novo.');
    if (v.cliente && v.via === 'ficha') v.via = 'portal';
    if (!v.cliente && v.via === 'qr' && DOCP_PERFIS_EQUIPE_QR.indexOf(v.perfil) < 0) {
      return { success: false, message: 'Acesso negado: seu perfil não abre o prontuário do equipamento pelo QR Code. Por quê: pelo QR Code abrem o cliente dono do equipamento e a equipe técnica. O que fazer: consulte os documentos em Cadastros › Equipamentos, ou peça o acesso à gestão.' };
    }
    var r = Docs_montar_(v, escopo, id);
    if (escopo === 'equipamento' && !v.cliente && v.via === 'ficha') r.atendimentos = Docs_atendimentosSemPdf_(sessao, id);
    if (escopo === 'equipamento' && typeof SGO_QEQ_situacao_ === 'function' && typeof SGO_QEQ_todosItens_ === 'function') {
      try { r.qualificacao = SGO_QEQ_situacao_((SGO_QEQ_todosItens_()[id] || []).filter(function (i) { return i.situacao !== 'MINUTA'; })); } catch (eQ) { r.qualificacao = null; }
    }
    if (v.via === 'qr') {
      try { SGO_DATA.log('QRCODE_DOCUMENTOS_VISTA', Docs_s_(sessao.usuario || sessao.nome), 'Equipamento ' + id + ' (perfil ' + v.perfil + '): ' + r.total + ' documento(s) em ' + r.pastas.filter(function (x) { return x.total; }).length + ' pasta(s).', 'QRCODE'); } catch (eL) {}
    }
    return JSON.parse(JSON.stringify(r));
  } catch (e) {
    var msg = String((e && e.message) || e);
    if (/^(Acesso negado|Pedido incompleto|Equipamento não encontrado|Unidade não encontrada|Cliente não encontrado)/.test(msg)) return { success: false, message: msg };
    return { success: false, message: typeof SGO_textoFalhaOperador_ === 'function' ? SGO_textoFalhaOperador_('carregar os documentos por pasta', e) : msg };
  }
}
