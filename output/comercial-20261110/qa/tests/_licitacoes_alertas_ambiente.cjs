// Ambiente dos testes dos alertas de Licitações (etapa 3 e a revisão de 02/11/2026): código real do notificador, da matriz,
// do piloto e dos avisos da gestão (_matriz_ambiente.cjs) com as abas LIC_*; pessoas fictícias; e-mail e WhatsApp simulados.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ambiente: ambMatriz, pastaLegado } = require('./_matriz_ambiente.cjs');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

const USUARIOS = [
  { ID: 'u_cha', USUARIO: 'charles', NOME: 'CHARLES DIRETOR TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'charles@exemplo.test', CELULAR: '62999990021', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA' },
  { ID: 'u_thi', USUARIO: 'admin', NOME: 'THIAGO DONO TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'thiago@exemplo.test', CELULAR: '62999990022', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA' },
  { ID: 'u_gil', USUARIO: 'gil', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', CELULAR: '62999990023', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
  { ID: 'u_vera', USUARIO: 'vera', NOME: 'VERA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', CELULAR: '62999990024', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' }
];
const ARQ_LIC = ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Alertas.js', 'SGO_WhatsappPiloto.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js'];
const APROVADO = JSON.stringify({ em: '2026-10-20T10:00:00', modelos: { sgo_licitacao_prazo: 'APPROVED', sgo_gestao_acao: 'APPROVED' } });

const OP = (id, extra) => Object.assign({ ID: id, CODIGO: 'LIC-2026-' + id.slice(-4), CHAVE_FONTE: 'PNCP:' + id, SITUACAO: 'RADAR', TRIAGEM: 'CANDIDATA', LEI: '14133', MODALIDADE: 'Pregão - Eletrônico',
  PORTAL_SESSAO: 'PUB-002', PORTAL_ORIGEM: 'PNCP', UF: 'PR', MUNICIPIO: 'Cascavel', ORGAO_NOME: 'UNIVERSIDADE ESTADUAL DO OESTE DO PARANA', NUMERO_CONTROLE_PNCP: '78680337000770-1-000430/2026',
  OBJETO: 'Manutenção preventiva e corretiva com certificado de calibração de equipamentos de laboratório', VALOR_ESTIMADO: 98765.43, ABERTURA_PROPOSTAS: '2026-10-20T08:00:00',
  ENCERRAMENTO_PROPOSTAS: '2026-11-04T08:30:00', ENCERRAMENTO_ISO: '2026-11-04T11:30:00.000Z', FUSO_PRESUMIDO: 'SIM', VERSAO_FONTE: 1, VERSAO_HASH: 'h1', SITUACAO_FONTE: 'Divulgada no PNCP', AMPARO_LEGAL: 'Lei 14.133/2021, Art. 28, I' }, extra || {});
const IMBEL = () => OP('op_imbe', { SITUACAO: 'ANALISE', RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', LEI: '13303', AMPARO_LEGAL: 'Lei 13.303/2016, Art. 32, IV', PORTAL_SESSAO: 'PUB-004', PORTAL_SESSAO_NOME: 'BLL Compras',
  UF: 'RJ', MUNICIPIO: 'Magé', ORGAO_NOME: 'INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL', NUMERO_CONTROLE_PNCP: '00444232000139-1-001311/2026', ENCERRAMENTO_PROPOSTAS: '2026-11-13T08:00:00', ENCERRAMENTO_ISO: '2026-11-13T11:00:00.000Z' });

function ambiente(o) {
  o = o || {};
  const a = ambMatriz({ agora: Date.parse(o.agora || '2026-10-26T10:00:00-03:00'), extras: ARQ_LIC, tabelas: Object.assign({ CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)), NTF_GESTAO: [] }, o.tabelas || {}),
    props: Object.assign({ NTF_MODELOS_SITUACAO: o.semModelo ? JSON.stringify({ modelos: { sgo_gestao_acao: 'APPROVED' } }) : APROVADO }, o.props || {}) });
  a.ctx.Utilities.computeDigest = (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b));
  a.ctx.Utilities.DigestAlgorithm = { SHA_256: 'SHA_256' }; a.ctx.Utilities.Charset = { UTF_8: 'UTF-8' };
  const gatilho = { timeBased: () => gatilho, everyMinutes: () => gatilho, everyHours: () => gatilho, everyDays: () => gatilho, atHour: () => gatilho, nearMinute: () => gatilho, inTimezone: () => gatilho, onWeekDay: () => gatilho, create() {} };
  a.ctx.ScriptApp.newTrigger = () => gatilho;
  a.ctx.HtmlService = { createHtmlOutput: (h) => { const x = { html: h, setTitle: () => x, addMetaTag: () => x }; return x; } };
  Object.assign(a.sessoes, { s_cha: { userId: 'u_cha', usuario: 'charles', nome: 'CHARLES DIRETOR TESTE', perfil: 'DIRETORIA' }, s_thi: { userId: 'u_thi', usuario: 'admin', nome: 'THIAGO DONO TESTE', perfil: 'ADMIN' },
    s_gil: { userId: 'u_gil', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' }, s_vera: { userId: 'u_vera', usuario: 'vera', nome: 'VERA COMERCIAL TESTE', perfil: 'COMERCIAL' } });
  a.ctx.Lic_garantirAbas_();
  (o.ops || []).forEach((l) => a.tabelas.LIC_OPORTUNIDADES.push(l));
  a.api = (sid, acao, d) => a.ctx.Licitacoes_api(sid, acao, d || {});
  a.rodada = (iso) => { if (iso) a.mudar(iso); return a.ctx.Lic_alertasRodada_(); };
  a.ev = (opId, tipo, todas) => a.tabelas.LIC_EVENTOS.filter((e) => e.OPORTUNIDADE_ID === opId && (!tipo || e.TIPO === tipo) && (todas || e.SITUACAO !== 'RETIFICADO'));
  a.al = (f) => (a.tabelas.LIC_ALERTAS || []).filter((x) => Object.keys(f || {}).every((k) => (typeof f[k] === 'function' ? f[k](x[k]) : x[k] === f[k])));
  a.hist = (tipo) => (a.tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo);
  a.zap = (modelo) => a.whats.filter((w) => w.corpo.template && w.corpo.template.name === (modelo || 'sgo_licitacao_prazo'));
  return a;
}
const J = (x) => JSON.parse(JSON.stringify(x));
const brt = (iso) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16);


module.exports = { ambiente, OP, IMBEL, USUARIOS, J, brt, ler };