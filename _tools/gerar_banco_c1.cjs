// Gera apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Comercial_BancoC1.js a partir dos JSONs da C1 (Comercial C3, 01/11/2026):
//   docs/COMERCIAL_C1_PRECOS_MERCADO.json      -> LICITACAO (só os itens comparáveis por unidade; o resto é lote, global ou mensal)
//   docs/COMERCIAL_C1_HISTORICO_PROPOSTAS.json -> CRM (CRM antigo, 2025-26) e PROPOSTA_METROLABS (Drive 2018-23, só valor unitário
//                                                 de serviço da tabela C1, confiança baixa)
// É a carga inicial do Banco de preços (SGO_Comercial_BancoPrecos.js › ComBP_previaCarga_ / ComBP_carregar_), idempotente pela CHAVE.
// Revisão 01/11/2026: os dados ficam dentro da função ComBP_dadosC1_(), montados só quando a prévia ou a carga a chamam. Antes eram a
// global COM_BANCO_C1, montada em toda execução do Apps Script e em cada contexto de cada worker do servidor.
// Sem dados pessoais: os JSONs da C1 já vêm sem nome de pessoa, telefone, e-mail ou CPF; o cliente das linhas do Drive (texto lido
// por regra, às vezes com o título da proposta) não entra.
// Uso: node _tools/gerar_banco_c1.cjs            (grava)
//      node _tools/gerar_banco_c1.cjs --conferir (sai com código 1 se o arquivo gravado não bate com os JSONs)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.join(__dirname, '..');
const ler = (f) => JSON.parse(fs.readFileSync(path.join(raiz, 'docs', f), 'utf8'));
const mercado = ler('COMERCIAL_C1_PRECOS_MERCADO.json');
const historico = ler('COMERCIAL_C1_HISTORICO_PROPOSTAS.json');
const destino = path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Comercial_BancoC1.js');

const COLUNAS = ['chave', 'tipo', 'item', 'descricao', 'unidade', 'valor', 'quantidade', 'data', 'cidade', 'uf', 'cliente', 'origem', 'resultado', 'concorrente', 'valorVencedor', 'custo', 'link', 'fonte', 'confianca'];
const txt = (v, max) => { const s = v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim(); return max && s.length > max ? s.slice(0, max - 1).trim() + '…' : s; };
const num = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : null);
const linhas = [], chaves = new Set(), fora = { mercadoNaoComparavel: 0, mercadoSemValor: 0, crmSemPreco: 0, crmDeslocamento: 0, driveNaoUnitario: 0, driveSemServico: 0, repetidas: 0 };
const pôr = (o) => {
  if (chaves.has(o.chave)) { fora.repetidas++; return; }
  chaves.add(o.chave);
  linhas.push(COLUNAS.map((c) => (o[c] === undefined ? null : o[c])));
};

mercado.precos.forEach((p) => {
  if (!p.comparavel_unitario) { fora.mercadoNaoComparavel++; return; }
  const hom = num(p.valor_unitario_homologado), est = num(p.valor_unitario_estimado), valor = hom !== null ? hom : est;
  if (!(valor > 0)) { fora.mercadoSemValor++; return; }
  pôr({ chave: 'PNCP:' + txt(p.link) + '#' + txt(p.numero_item), tipo: 'SERVICO', item: p.servico_tabela_c1 || '', descricao: txt(p.descricao_item, 220), unidade: txt(p.unidade, 20),
    valor, quantidade: num(p.quantidade) || 1, data: txt(p.data).slice(0, 10), cidade: txt(p.municipio, 80), uf: txt(p.uf, 2), cliente: txt(p.orgao, 120), origem: 'LICITACAO', resultado: 'REFERENCIA',
    concorrente: txt(p.fornecedor_vencedor, 120), valorVencedor: hom, custo: null, link: txt(p.link, 300),
    fonte: txt('PNCP · ' + [p.modalidade, p.numero_processo].filter(Boolean).join(' ') + ', item ' + p.numero_item + (hom === null ? ' · valor estimado (sem homologação)' : ' · valor homologado'), 200), confianca: hom !== null ? 'ALTA' : 'MEDIA' });
});

historico.linhas.forEach((l) => {
  if (/^CRM/.test(l.origem)) {
    if (l.servico_codigo === 'DESLOCAMENTO') { fora.crmDeslocamento++; return; }
    const v = num(l.preco_unitario);
    if (!(v > 0)) { fora.crmSemPreco++; return; }
    const res = { ganho: 'GANHO', perdido: 'PERDIDO', aberto: 'EM_ABERTO' }[l.situacao_negocio] || 'EM_ABERTO';
    pôr({ chave: 'CRM:' + l.id, tipo: l.tipo_item === 'produto' ? 'PRODUTO' : 'SERVICO', item: l.servico_tabela_c1 || '', descricao: txt(l.descricao, 220), unidade: '', valor: v, quantidade: num(l.quantidade) || 1,
      data: txt(l.data).slice(0, 10), cidade: txt(l.cidade, 80), uf: txt(l.uf, 2), cliente: txt(l.cliente, 120), origem: 'CRM', resultado: res, concorrente: '', valorVencedor: null,
      custo: num(l.custo_unitario_cadastrado) > 0 ? num(l.custo_unitario_cadastrado) : null, link: '', fonte: txt('CRM antigo · ' + l.proposta, 120), confianca: 'ALTA' });
    return;
  }
  if (l.tipo_valor !== 'unitario' || !(num(l.preco_unitario) > 0)) { fora.driveNaoUnitario++; return; }
  if (!l.servico_tabela_c1) { fora.driveSemServico++; return; }
  pôr({ chave: 'DRV:' + l.id, tipo: 'SERVICO', item: l.servico_tabela_c1, descricao: txt(l.descricao, 220), unidade: '', valor: num(l.preco_unitario), quantidade: num(l.quantidade) || 1,
    data: txt(l.data).slice(0, 10), cidade: txt(l.cidade, 80), uf: txt(l.uf, 2), cliente: '', origem: 'PROPOSTA_METROLABS', resultado: 'REFERENCIA', concorrente: '', valorVencedor: null, custo: null,
    link: '', fonte: 'Proposta antiga da Metrolabs (arquivo do Drive, valor lido por regra; conferir)', confianca: 'BAIXA' });
});

const contagem = {};
linhas.forEach((r) => { const k = r[COLUNAS.indexOf('origem')]; contagem[k] = (contagem[k] || 0) + 1; });
const texto = '/****************************************************\n' +
  ' * COMERCIAL C3 — CARGA INICIAL DO BANCO DE PREÇOS (gerado; não editar à mão)\n' +
  ' *\n' +
  ' * Gerado por _tools/gerar_banco_c1.cjs a partir de docs/COMERCIAL_C1_PRECOS_MERCADO.json e docs/COMERCIAL_C1_HISTORICO_PROPOSTAS.json\n' +
  ' * (' + mercado.meta.gerado_em + '). ' + linhas.length + ' preços: ' + Object.keys(contagem).map((k) => k + ' ' + contagem[k]).join(', ') + '.\n' +
  ' * A gestão carrega em Comercial > Banco de preços > "Carga inicial (C1)", com prévia; a carga é idempotente (CHAVE).\n' +
  ' * Ficaram de fora: ' + Object.keys(fora).map((k) => k + ' ' + fora[k]).join(', ') + '.\n' +
  ' ****************************************************/\n\n' +
  '// Os dados só são montados quando a prévia ou a carga chamam esta função: nada roda ao carregar o projeto.\n' +
  'function ComBP_dadosC1_() {\n return {\n versao: ' + JSON.stringify('C1-' + mercado.meta.gerado_em) + ',\n fora: ' + JSON.stringify(fora) + ',\n colunas: ' + JSON.stringify(COLUNAS) + ',\n linhas: [\n' +
  linhas.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n };\n}\n';
if (process.argv.includes('--conferir')) {
  const atual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') : '';
  if (atual !== texto) { console.error('SGO_Comercial_BancoC1.js desatualizado: rode node _tools/gerar_banco_c1.cjs'); process.exit(1); }
  console.log('SGO_Comercial_BancoC1.js confere com os JSONs (' + linhas.length + ' preços).');
} else {
  fs.writeFileSync(destino, texto, 'utf8');
  console.log('Gravado ' + destino + ' (' + linhas.length + ' preços; ' + JSON.stringify(contagem) + '; fora ' + JSON.stringify(fora) + ').');
}
