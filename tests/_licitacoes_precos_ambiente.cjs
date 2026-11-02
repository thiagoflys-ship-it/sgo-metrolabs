// Ambiente dos testes da tabela de preços e do simulador de Licitações (02/11/2026): o Comercial real (tests/_comercial_ambiente.cjs,
// com a tabela C1 e o catálogo oficial implantados) e os arquivos de Licitações no mesmo contexto, como no SGO+. O coletor do
// servidor (SGO_LICITACOES) é simulado. Só dados de teste.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente } = require('./_comercial_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

function ambientePrecos(o) {
  o = o || {};
  const amb = ambiente({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228 }, { ID: 'd2', DESTINO: 'Anápolis/GO', KM_TRECHO: 55 }] } });
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200, VALOR_BONUS_COLETIVO: 300 });
  const itensFonte = o.itensFonte || [];
  amb.ctx.SGO_LICITACOES = { listar: () => ({ itens: [], ate: '', mais: false }), obter: () => ({ atual: null, versoes: [], itens: itensFonte }), situacao: () => ({}) };
  for (const f of ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Precos.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_Ajuda_LicitacoesPrecos.js']) vm.runInContext(ler(f), amb.ctx, { filename: f });
  if (o.catalogo !== false) {
    const ok = (r) => { if (!r.ok) throw new Error(r.message); return r; };
    const pv = ok(amb.api('s_dora', 'importarC1Previa')); ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
    const p = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO' }); if (!p.ok) throw new Error(p.message);
    const a = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO', aplicar: true, marca: p.marca }); if (!a.ok) throw new Error(a.message);
  }
  amb.tabelas.LIC_OPORTUNIDADES = (o.oportunidades || []).map((x) => Object.assign({ SITUACAO: 'ANALISE', VERSAO_FONTE: 1, VERSAO_HASH: 'h1' }, x));
  const lic = (sid, op, d) => amb.ctx.Licitacoes_api(sid, 'precos', Object.assign({ op }, d || {}));
  return Object.assign(amb, { lic, ler });
}
module.exports = { ambientePrecos };
