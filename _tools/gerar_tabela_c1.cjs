// Gera apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Comercial_TabelaC1.js a partir de docs/COMERCIAL_C1_TABELA_SERVICOS.json
// (Comercial C2, 01/11/2026). Só os campos que o catálogo usa: ficha de custo, preços da C1, mercado público e histórico da Metrolabs.
// Uso: node _tools/gerar_tabela_c1.cjs            (grava)
//      node _tools/gerar_tabela_c1.cjs --conferir (sai com código 1 se o arquivo gravado não bate com o JSON)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.join(__dirname, '..');
const origem = JSON.parse(fs.readFileSync(path.join(raiz, 'docs/COMERCIAL_C1_TABELA_SERVICOS.json'), 'utf8'));
const destino = path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Comercial_TabelaC1.js');
const resumo = (x) => (x && x.n ? { n: x.n, min: x.min, mediana: x.mediana, max: x.max } : null);
const unidade = (u) => /equipamento/.test(u) ? 'equip.' : /ambiente/.test(u) ? 'ambiente' : /caixa/.test(u) ? 'caixa' : /instrumento/.test(u) ? 'instr.' : /válvula/.test(u) ? 'válvula' : /visita/.test(u) ? 'visita' : /hora/.test(u) ? 'hora' : 'un.';
const regra = (s) => /piso de 120% do freezer/.test(s.fonte_preco) ? { tipo: 'PISO_RELATIVO', base: 'QT_FREEZER', fator: 1.2 }
  : /R\$ 190 por hora/.test(s.fonte_preco) ? { tipo: 'HORA_AVULSA' } : /mercado \+ histórico/.test(s.fonte_preco) ? { tipo: 'MERCADO_HISTORICO' } : { tipo: 'CONTA' };
const servicos = origem.servicos.map((s) => ({
  codigo: s.codigo, nome: s.nome, grupo: s.grupo, unidade: unidade(s.unidade), unidadeTexto: s.unidade, escopo: s.escopo,
  horasTecnico: s.horas.tecnico, horasEngenheiro: s.horas.engenheiro, padroes: s.padroes_rateio, consumiveis: s.consumiveis_art,
  c1: { custo: s.custo.total, precoConta: s.preco_pela_conta, precoNormal: s.preco_normal, precoMinimo: s.preco_minimo, precoUrgente: s.preco_urgente },
  regra: regra(s), fonte: s.fonte_preco, alertas: s.alertas || [],
  // 01/11/2026 (decisão do dono): valor da planilha de 30/10/2026 (sem imposto) e o preço de referência da decisão
  planilha: s.planilha_30_10 ? { valor: s.planilha_30_10.valor, referencia: s.planilha_30_10.referencia } : null,
  decisao: s.decisao_dono_20261101 ? { precoNovo: s.decisao_dono_20261101.preco_novo, fonte: s.decisao_dono_20261101.fonte, custo: s.decisao_dono_20261101.custo.total } : null,
  historico: { crm: resumo(s.historico_metrolabs.crm_2025_2026), ganhos: resumo(s.historico_metrolabs.crm_ganhos), drive: resumo(s.historico_metrolabs.drive_2018_2023), custoCrm: resumo(s.historico_metrolabs.custo_cadastrado_crm) },
  mercado: s.mercado_publico && s.mercado_publico.n ? { n: s.mercado_publico.n, min: s.mercado_publico.min, mediana: s.mercado_publico.mediana, max: s.mercado_publico.max, orgaos: s.mercado_publico.orgaos || null, q1: s.mercado_publico.q1 || null, q3: s.mercado_publico.q3 || null } : null,
  mercadoCentroOeste: resumo(s.mercado_centro_oeste)
}));
const texto = '/****************************************************\n' +
  ' * COMERCIAL C2 — TABELA DE PREÇOS DA C1 (gerado; não editar à mão)\n' +
  ' *\n' +
  ' * Gerado por _tools/gerar_tabela_c1.cjs a partir de docs/COMERCIAL_C1_TABELA_SERVICOS.json (' + origem.meta.gerado_em + ').\n' +
  ' * São os ' + servicos.length + ' serviços que a gestão importa para o catálogo em Produtos e serviços > "Importar tabela de preços C1"\n' +
  ' * (SGO_Comercial_Ficha.js): horas por função, padrões, consumíveis, os preços da C1, o mercado público (PNCP) e o histórico\n' +
  ' * da Metrolabs (CRM 2025-26 e Drive 2018-23). Os preços valem como referência: o sistema recalcula pela política em vigor.\n' +
  ' * 01/11/2026 (decisão do dono): "planilha" é o valor equivalente da planilha de 30/10/2026 (sem imposto) e "decisao" o preço de\n' +
  ' * referência (o maior entre a tabela, a planilha com o imposto por fora e a conta com a sobra de 35%), de _tools/precos_decisao_20261101.py.\n' +
  ' ****************************************************/\n\n' +
  'var COM_TABELA_C1 = ' + JSON.stringify({ versao: 'C1-' + origem.meta.gerado_em, servicos }, null, 1) + ';\n';
if (process.argv.includes('--conferir')) {
  const atual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') : '';
  if (atual !== texto) { console.error('SGO_Comercial_TabelaC1.js desatualizado: rode node _tools/gerar_tabela_c1.cjs'); process.exit(1); }
  console.log('SGO_Comercial_TabelaC1.js confere com o JSON (' + servicos.length + ' serviços).');
} else {
  fs.writeFileSync(destino, texto, 'utf8');
  console.log('Gravado ' + destino + ' (' + servicos.length + ' serviços).');
}
