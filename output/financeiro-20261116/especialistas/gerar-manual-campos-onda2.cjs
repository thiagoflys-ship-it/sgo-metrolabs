// Gera a seção "O que preencher em cada campo" do manual a partir de JS_Omie_Ajuda.html (os mesmos textos da tela).
// 16/11/2026 (Onda 2): cópia de output/financeiro-20261116/gerar-manual-campos.cjs com a aba Indicadores (NOMES e grupo).
// Uso: node gerar-manual-campos-onda2.cjs <JS_Omie_Ajuda.html> <manual.md>
'use strict';
const fs = require('fs'), vm = require('vm');
const [arq, manual] = process.argv.slice(2);
const src = fs.readFileSync(arq, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx = { document: undefined, MutationObserver: undefined, setTimeout }; vm.createContext(ctx);
vm.runInContext(src.replace('if (!OmieAj_ligar_()', 'if (false && !OmieAj_ligar_()') + '\n;this.__D = OMIE_DICAS; this.__G = OMIE_GUIAS;', ctx);
const D = ctx.__D, G = ctx.__G;
const NOMES = { resumo: 'Visão geral', contas: 'Contas a pagar e receber', cliente: 'Ficha do cliente', pedidos: 'Pedidos aprovados', lancamentos: 'Lançamentos e baixas', cobrancas: 'Cobranças', conciliacao: 'Conciliação bancária', produtos: 'Faturamento de produtos', servicos: 'Faturamento de serviços', notas: 'Importação de notas', fluxo: 'Fluxo de caixa', resultado: 'Resultado do mês', provisoes: 'Provisões', comissoes: 'Comissões', regras: 'Regras do Financeiro', indicadores: 'Indicadores', sigilo: 'Sigilo e acessos' };
const grupo = (titulo, chaves) => '### ' + titulo + '\n\n' + chaves.filter((k) => D[k]).map((k) => '- ' + D[k].replace(/^([^:]{2,40}):/, '**$1:**')).join('\n') + '\n';
let md = '## 10. Como fazer em cada aba\n\nNo topo de cada aba há o quadro **"Como fazer nesta aba"**, aberto na primeira vez (feche quando já souber; o painel lembra). O conteúdo é este:\n\n';
for (const k of Object.keys(G)) md += '**' + NOMES[k] + '.** ' + G[k][0] + '\n\n' + G[k][1].map((p, i) => (i + 1) + '. ' + p).join('\n') + '\n\n';
md += '## 11. O que preencher em cada campo\n\nEmbaixo de cada campo do painel aparece a explicação abaixo (nas barras de filtro, numa linha logo abaixo da barra).\n\n';
md += grupo('Filtros e buscas', ['omieTipo', 'omieSituacao', 'omieGestInicio', 'omieGestFim', 'omieGestConta', 'omieGestMes', 'omieGestOrigem', 'omieAgDias', 'omieAgNat', 'omieResMes', 'omieCliBusca', 'omiePedBusca']) + '\n';
md += '### Novo lançamento e edição (Lançamentos e baixas)\n\n' + ['receber:pessoaId', 'pagar:pessoaId', 'omieCadBusca', 'documento', 'valor', 'vencimento', 'receber:categoria', 'pagar:categoria', 'categoria', 'contaId', 'referencia', 'previsao', 'emissao', 'observacao'].map((k) => '- ' + (k === 'receber:pessoaId' || k === 'pagar:pessoaId' ? D[k].replace(/^([^:]{2,40}):/, '**$1:**') : k === 'referencia' ? '**Referência única do lançamento:** ' + D[k] : k === 'documento' ? '**Documento:** ' + D[k] : D[k].replace(/^([^:]{2,40}):/, '**$1:**'))).join('\n') + '\n\n';
md += grupo('Registrar baixa', ['ops-baixar:contaId', 'ops-baixar:valor', 'ops-baixar:data', 'ops-baixar:desconto', 'ops-baixar:juros', 'ops-baixar:multa', 'ops-baixar:observacao']) + '\n';
md += grupo('Envios a conferir no Omie', ['incertoMotivo']) + '\n';
md += grupo('Cadastrar cliente ou fornecedor no Omie', Object.keys(D).filter((k) => /^cad:/.test(k))) + '\n';
md += grupo('Boletos', ['ops-prorrogarBoleto:vencimento']) + '\n';
md += grupo('Conciliação bancária', ['omieConcConta', 'omieConcInicio', 'omieConcFim', 'omieConcFormato', 'omieConcArquivo']) + '\n';
md += grupo('Faturamento e notas', ['omieFatEtapa', 'omieFatTipo', 'omieFatArquivo', 'omieFatAceite']) + '\n';
md += grupo('Lançar nota recebida no Omie (conta a pagar)', Object.keys(D).filter((k) => /^(nota|nfse):/.test(k))) + '\n';
md += grupo('Provisões internas', ['prov:tipo', 'prov:descricao', 'prov:valor', 'prov:vencimento']) + '\n';
md += grupo('Regras do Financeiro (de-para, aprovação e segunda confirmação)', ['regraTipo', 'regraCnpj', 'regraCategoria', 'regraMotivo', 'aprovMotivo', 'valorConfirmado']) + '\n';
md += grupo('Indicadores', ['finIndComparar']) + '\n';
md += grupo('Sigilo e acessos', ['omieSigMotivo']);
let m = fs.readFileSync(manual, 'utf8');
const ini = m.indexOf('## 10. Como fazer em cada aba'), fimDiv = m.lastIndexOf('</div>');
if (ini >= 0) m = m.slice(0, ini) + m.slice(fimDiv);
const pos = m.lastIndexOf('</div>');
m = m.slice(0, pos) + md + '\n' + m.slice(pos);
fs.writeFileSync(manual, m);
console.log('ok', Object.keys(D).length, 'campos,', Object.keys(G).length, 'abas');
