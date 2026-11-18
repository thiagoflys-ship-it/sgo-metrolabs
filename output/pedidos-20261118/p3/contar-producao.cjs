// 18/11/2026 (pacote 3, item 9): conta, com o código real da cópia em DEST, os itens do alerta de prazo (ast_sla) e de O.S. aberta no
// Auvo (auvo_os_aberta) sobre uma foto das abas da produção (lida com default_transaction_read_only=on). Não grava nada em lugar nenhum.
// Uso: DEST=<cópia> node --require ./output/lote-20261111n/fontes.cjs output/pedidos-20261118/p3/contar-producao.cjs <tabelas.json> <instante ISO>
'use strict';
const fs = require('node:fs');
const { ambiente } = require('../../../tests/_assistencia_ambiente.cjs');
const bruto = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const instante = process.argv[3];
const reviver = (v) => (v && typeof v === 'object' && v.$d ? new Date(v.$d) : v);
const tabelas = {};
for (const aba in bruto) {
  const planilhas = Object.keys(bruto[aba]).sort((a, b) => bruto[aba][b].length - bruto[aba][a].length);
  tabelas[aba] = bruto[aba][planilhas[0]].map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, reviver(v)])));   // banco principal
}
tabelas.ATV_HISTORICO = []; tabelas.ATV_AVISOS = [];
const amb = ambiente({ agora: Date.parse(instante), tabelas, assColabDesde: null, resultadoDesde: null });
const ctx = amb.ctx.Pend_contextoInterno_();
const itens = amb.ctx.Pend_calcular_(ctx).itens;
const ch = {}; tabelas.ATEC_CHAMADOS.forEach((c) => { ch['AST:SLA:' + c.ID] = c; });
const sla = itens.filter((i) => i.tipo === 'ast_sla');
const auvo = itens.filter((i) => i.tipo === 'auvo_os_aberta');
const reag = sla.filter((i) => { const c = ch[i.id]; return c && c.SITUACAO === 'AGENDADO' && new Date(String(c.AGENDADO_PARA) + '-03:00').getTime() > Date.parse(instante); });
console.log(JSON.stringify({
  dest: process.env.DEST, instante,
  ast_sla: sla.length, ast_sla_estourado: sla.filter((i) => /estourado/.test(i.titulo)).length,
  ast_sla_com_visita_futura: reag.length, chamados_com_visita_futura: reag.map((i) => ch[i.id].NUMERO + ' (prazo ' + String(ch[i.id].PRAZO_ATENDIMENTO_EM).slice(0, 16) + ', visita ' + String(ch[i.id].AGENDADO_PARA).slice(0, 16) + ')'),
  titulos_ast_sla: sla.map((i) => i.titulo.replace(/\(.*?\)/, '(…)')),
  auvo_os_aberta: auvo.length
}, null, 1));
