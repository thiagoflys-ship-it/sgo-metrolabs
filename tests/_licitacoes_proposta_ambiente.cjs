// Ambiente dos testes da proposta em A4 e dos relatórios de Licitações (02/11/2026): o Comercial real com o catálogo oficial
// implantado e a tabela de preços de licitação importada (tests/_licitacoes_precos_ambiente.cjs), mais a leitura do edital, a
// habilitação, a proposta e os relatórios no mesmo contexto. Drive em memória (do ambiente do Comercial); a IA é simulada por uma
// função (prompt) => texto, ou desligada (sem a chave). Só dados de teste.
'use strict';
const vm = require('node:vm');
const { ambientePrecos } = require('./_licitacoes_precos_ambiente.cjs');

const OPS = [{ ID: 'op1', CODIGO: 'LIC-2026-0001', UF: 'GO', MUNICIPIO: 'Rio Verde', VALOR_ESTIMADO: 20000, ORGAO_NOME: 'HOSPITAL MUNICIPAL TESTE', NUMERO_CONTROLE_PNCP: '11222333000181-1-000010/2026', MODALIDADE: 'Pregão - Eletrônico',
  OBJETO: 'Contratação de empresa para calibração de termômetros digitais com emissão de certificado', ENCERRAMENTO_PROPOSTAS: '2026-11-20T09:00:00', ENCERRAMENTO_ISO: '2026-11-20T12:00:00.000Z', PRIMEIRA_COLETA_EM: '2026-10-20T13:00:00.000Z', NOTA: 72, NOTA_CLASSE: 'MEDIA' },
{ ID: 'op2', CODIGO: 'LIC-2026-0002', UF: 'RJ', MUNICIPIO: 'Niterói', VALOR_ESTIMADO: 50000, ORGAO_NOME: 'UNIVERSIDADE TESTE', OBJETO: 'Qualificação de autoclaves', PRIMEIRA_COLETA_EM: '2026-09-01T13:00:00.000Z', ENCERRAMENTO_ISO: '2026-10-25T12:00:00.000Z' }];

/** Checklist consolidado da leitura (uma linha por item), como o SGO_Licitacoes_Leitura.js grava. */
function comLeitura(a, oid, itens) {
  a.tabelas.LIC_LEITURAS = a.tabelas.LIC_LEITURAS || [];
  a.tabelas.LIC_LEITURA_CHECKLIST = a.tabelas.LIC_LEITURA_CHECKLIST || [];
  const chave = 'K' + oid;
  a.tabelas.LIC_LEITURAS.push({ ID: 'le_' + oid, OPORTUNIDADE_ID: oid, VERSAO: 1, SITUACAO: 'CONCLUIDA', CHECKLIST_CHAVE: chave, CHECKLIST_QTD: itens.length, HASH: 'L' + 'a'.repeat(40), CONSOLIDACAO_EM: '2026-11-01T12:00:00.000Z',
    COBERTURA_JSON: JSON.stringify({ total: { texto: 'Lidas 12 de 12 página(s) com texto (3 de 3 bloco(s)) em 1 arquivo(s).' } }) });
  itens.forEach((it, i) => a.tabelas.LIC_LEITURA_CHECKLIST.push({ ID: 'ck' + oid + i, LEITURA_ID: 'le_' + oid, OPORTUNIDADE_ID: oid, CHAVE: chave, ORDEM: i + 1, ITEM_ID: 'I' + (i + 1), TEMA: it.tema,
    ITEM_JSON: JSON.stringify({ id: 'I' + (i + 1), tema: it.tema, temaNome: it.temaNome || it.tema, trecho: it.trecho, tipo: it.tipo || 'EXIGENCIA', alerta: '', fontes: [{ ref: 'A1', arquivo: { nome: 'edital.pdf', titulo: 'Edital' }, pagina: it.pagina || 3, rotulo: 'página ' + (it.pagina || 3), linha: 4 }] }) }));
}

function ambienteProposta(o) {
  o = o || {};
  const a = ambientePrecos({ oportunidades: o.oportunidades || OPS });
  for (const f of ['SGO_Licitacoes_Leitura.js', 'SGO_Licitacoes_Habilitacao.js', 'SGO_Licitacoes_Proposta.js', 'SGO_Licitacoes_Relatorios.js']) vm.runInContext(a.ler(f), a.ctx, { filename: f });
  const ok = (r) => { if (!r.ok) throw new Error(r.message); return r; };
  const pv = ok(a.lic('s_dora', 'importarPrevia')); ok(a.lic('s_dora', 'importar', { marca: pv.marca, motivo: 'Ponto de partida da tabela' }));
  a.prompts = [];
  a.iaTexto = o.ia || null;
  a.ligarIA = (fn) => {
    a.iaTexto = fn; a.props.GEMINI_API_KEY = 'chave-de-teste';
    a.ctx.UrlFetchApp = { fetch: (url, op) => { const p = JSON.parse(op.payload).contents[0].parts[0].text; a.prompts.push(p); const texto = typeof a.iaTexto === 'function' ? a.iaTexto(p, a.prompts.length) : ''; return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) }; } };
  };
  if (o.ia) a.ligarIA(o.ia);
  a.prop = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'proposta', Object.assign({ op }, d || {}));
  a.rel = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'relatorios', Object.assign({ op }, d || {}));
  a.simular = (oid, itens, motivo) => ok(a.lic('s_dora', 'simulacaoSalvar', { id: oid, motivo: motivo || 'Simulação para a proposta', entrada: { itens, execucao: { uf: 'GO', municipio: 'Rio Verde', tecnicos: 1, engenheiros: 0, viagens: 1, dias: 2, noites: 1, pedagio: '0', transporte: 'VEICULO_EMPRESA' } } }));
  a.comLeitura = (oid, itens) => comLeitura(a, oid, itens);
  return a;
}
module.exports = { ambienteProposta, OPS };
