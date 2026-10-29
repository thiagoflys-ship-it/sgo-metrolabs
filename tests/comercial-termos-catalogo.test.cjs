// Comercial (28/10/2026, pedidos do dono): (1) as cláusulas que os vendedores colavam na descrição de cada orçamento do CRM
// viram a seção fixa "Termos e condições da contratação" (texto justificado, versão congelada no documento; a descrição fica
// em branco); (2) o item da proposta escolhe o produto do catálogo (preço de tabela, preço diferente registrado, item
// avulso possível); (3) catálogo único, sem duplicidade; (4) proposta enviada pelo WhatsApp oficial (Meta) com o PDF.
// Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

// texto do CRM como estava nas propostas importadas (tabulação depois do número, "foro da" quebrado, linhas finais próprias)
const CLAUSULAS_CRM = 'Observações\n1.\tDO OBJETO: Contratação de Comercialização de PRODUTOS E SERVIÇOS EM EQUIPAMENTOS MÉDICO-HOSPITALARES, conforme descrição, quantidade e valor acima.\n\n' +
  '2.\tDO PRAZO DE ENTREGA: Uma vez que todas as condições propícias para a realização da entrega estiverem plenamente atendidas, a CONTRATANTE compromete-se a concluir a entrega do(s) item(ns) conforme delineado neste Termo de Referência, dentro de um prazo de 10 a 30 dias, iniciando-se a contagem a partir da data de assinatura desta minuta.\n\n' +
  '3.\tDA FORMA DE RECEBIMENTO: O valor referente ao(s) item(ns) descrito(s) na cláusula 1 será faturado por meio de nota fiscal pela CONTRATADA, que se compromete a disponibilizá-lo dentro do prazo estipulado para pagamento, contendo o montante acordado e a data de vencimento correspondente.\n\n' +
  '4.\tDAS SANÇÕES Havendo inadimplemento do pagamento estabelecido na cláusula 1, incidirá uma multa de 30% (trinta por cento) sobre o valor total do contrato, acrescida de atualização pelo IGPDI-DI/FGV e juros moratórios de 1% (um por cento) ao mês, a partir da data do descumprimento. Além disso, a CONTRATADA reserva-se o direito de incluir o nome da CONTRATANTE em órgãos e/ou serviços de cadastro de proteção ao crédito (SPC/SERASA/PROTESTO), tornando o débito integralmente exigível, sem necessidade de qualquer outro ato ou notificação, sem prejuízo das perdas e danos decorrentes da negligência no cumprimento de suas obrigações. Caso requeira a intervenção do DEPARTAMENTO JURÍDICO da CONTRATADA, serão acrescidos honorários advocatícios à base de 20% (vinte por cento) sobre o valor total apurado, englobando, inclusive, multas, juros, atualização e correção monetária e custas judiciais, todos encargos devidos pela CONTRATANTE.\n\n' +
  '5.\tDA VALIDADE DE ASSINATURA ELETRÔNICA: Se necessário, as partes expressamente concordam em utilizar e reconhecem como válida a comprovação de autoria e integridade dos termos ora acordados, certificados por meio da plataforma DocuSign (www.docusign.com), por meio dos endereços eletrônicos das partes. A formalização das avenças na maneira supra acordada será suficiente para a validade e integral vinculação das partes ao presente instrumento, constituindo-o como título executivo extrajudicial, na forma da lei;\n\n' +
  '6.\tDA DESISTÊNCIA: Em caso de desistência por parte da contratante após a assinatura desta proposta, A contratante concorda em pagar uma multa no valor de 30% do total da proposta acordada, como compensação pelos custos administrativos e possíveis perdas incorridas pela parte contratada.\n\n' +
  '7.\tDA CONSTITUIÇÃO DO TÍTULO: Esta minuta CONSTITUI TÍTULO EXECUTIVO EXTRAJUDICIAL, nos termos do artigo 784, inciso III, do Código de Processo Civil em vigor.\n\n' +
  '8.\tDO FORO DE ELEIÇÃO: Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da\n Comarca de Goiânia, Goiás.\n' +
  'Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor, juntamente com 02 (duas) testemunhas.\n\n';

function proposta(amb, extra) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id: np.proposta.id, escopo: '',
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'A combinar', garantia: '90 dias' } }, extra || {})));
  return { oportunidade, id: np.proposta.id };
}
const textoDoc = (amb, htmlId) => amb.arquivos[htmlId].bytes.toString('utf8');

test('descrição antiga com as cláusulas do CRM: o bloco sai da descrição (sem apagar o banco) e o restante fica; texto diferente não é mexido', () => {
  const amb = ambiente();
  const sep = (t) => amb.ctx.ComP_separarTermosLegado_(t);
  const r = sep(CLAUSULAS_CRM + 'Condições: 30 DIAS BOLETO.\nFrete: CIF\nEntrega: 15 dias Úteis.');
  assert.equal(r.tinha, true);
  assert.equal(r.texto, 'Condições: 30 DIAS BOLETO.\nFrete: CIF\nEntrega: 15 dias Úteis.');
  const antes = sep('- AUTOCLAVE SEMI NOVA:\n -REVISADA\n -GARANTIA DE UM ANO\n\n' + CLAUSULAS_CRM.replace('Observações\n', '') + 'Condições: A VISTA.');
  assert.equal(antes.tinha, true);
  assert.equal(antes.texto, '- AUTOCLAVE SEMI NOVA:\n -REVISADA\n -GARANTIA DE UM ANO\n\nCondições: A VISTA.');
  // importação cortou em 4.000 letras: o trecho existente do bloco sai até o fim
  const cortado = sep('Escopo do serviço de qualificação conforme norma.\n\n' + CLAUSULAS_CRM.slice(0, 1500));
  assert.equal(cortado.tinha, true);
  assert.equal(cortado.texto, 'Escopo do serviço de qualificação conforme norma.');
  // só o texto em branco: vira descrição vazia
  assert.equal(sep(CLAUSULAS_CRM).texto, '');
  // texto próprio que cita "do objeto" não é tratado como as cláusulas
  const proprio = 'Do objeto: troca da placa de controle da autoclave, com teste funcional e relatório.';
  assert.deepEqual(JSON.parse(JSON.stringify(sep(proprio))), { texto: proprio, tinha: false });
  assert.equal(sep('').tinha, false);
});

test('documento A4: seção "Termos e condições da contratação" justificada, acima de Validade e aceite, com a frase de concordância e a versão; sem Condições/Frete/Entrega no texto fixo; não duplica a descrição antiga', () => {
  const amb = ambiente();
  const p = proposta(amb, { escopo: CLAUSULAS_CRM + 'Condições: 30 DIAS BOLETO.\nFrete: CIF\nEntrega: 30 dias Úteis.' });
  // proposta antiga (importada) com o bloco na descrição: a tela mostra só o restante e avisa
  const reg = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id);
  reg.ESCOPO = CLAUSULAS_CRM + 'Condições: 30 DIAS BOLETO.\nFrete: CIF\nEntrega: 30 dias Úteis.';
  const det2 = ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta;
  assert.equal(det2.escopoTermosLegado, true);
  assert.equal(det2.escopo, 'Condições: 30 DIAS BOLETO.\nFrete: CIF\nEntrega: 30 dias Úteis.');
  assert.match(reg.ESCOPO, /DO OBJETO/, 'abrir não altera o banco');
  assert.equal(det2.termos.versao, 1); assert.equal(det2.termos.congelado, false);
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  const html = textoDoc(amb, g.htmlId);
  const texto = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.equal((texto.match(/DO OBJETO/g) || []).length, 1, 'as cláusulas saem uma vez só');
  assert.match(html, /<h2 id="sec-\d+">\d+\. Termos e condições da contratação<\/h2>/);
  assert.match(html, /<p style="text-align:justify;margin:0 0 2.2mm"><b>1\. DO OBJETO:<\/b> Contratação de Comercialização/);
  assert.match(html, /<b>4\. DAS SANÇÕES<\/b> Havendo inadimplemento/);
  assert.match(texto, /IGPDI-DI\/FGV/); assert.match(texto, /plataforma DocuSign \(www\.docusign\.com\)/);
  assert.match(texto, /as partes elegem o foro da Comarca de Goiânia, Goiás\./, 'a quebra de linha do PDF colado foi corrigida');
  assert.match(texto, /juntamente com 02 \(duas\) testemunhas\. A aprovação desta proposta, por assinatura, por resposta por escrito ou por pedido de compra, implica a concordância integral com os termos e condições acima\./);
  assert.match(texto, /Termos e condições da contratação, versão 1\./);
  assert.ok(texto.indexOf('Termos e condições da contratação') < texto.indexOf('Validade e aceite'));
  const secTermos = texto.slice(texto.indexOf('Termos e condições da contratação'), texto.indexOf('Validade e aceite'));
  assert.doesNotMatch(secTermos, /Condições:|Frete:|Entrega:/, 'condições, frete e entrega não entram no texto fixo');
  assert.match(texto, /Escopo Condições: 30 DIAS BOLETO\. Frete: CIF Entrega: 30 dias Úteis\./, 'o restante da descrição antiga fica no escopo');
  const cong = JSON.parse(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id).CONGELADO_JSON);
  assert.equal(cong.termos.versao, 1);
  assert.match(cong.termos.texto, /^1\. DO OBJETO:/);
  // descrição em branco não impede concluir (era erro para serviço): vira alerta
  const p2 = proposta(ambiente());
  assert.ok(p2.id);
});

test('versão dos termos: só Diretoria e Administrador mudam; proposta enviada guarda a versão do documento; a nova revisão usa a vigente; aprovação registrada diz a versão', () => {
  const amb = ambiente();
  const p = proposta(amb, { escopo: 'Qualificação térmica completa da autoclave da CME, com relatório.' });
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: p.id, como: 'Entregue em mãos na reunião com a CME' }));
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === p.id && h.TIPO === 'ENVIADA' && /Termos e condições da contratação enviados no documento: versão 1\./.test(h.TEXTO)));
  const met = ok(amb.api('s_gaspar', 'metodologia', {}));
  assert.equal(met.podeEditarTermos, false, 'gestor comercial não muda as cláusulas');
  assert.equal(met.termos.versao, 1);
  const nova = JSON.parse(JSON.stringify(met.metodologia));
  nova.proposta.termos = nova.proposta.termos.replace('Comarca de Goiânia, Goiás', 'Comarca de Anápolis, Goiás');
  const neg = amb.api('s_gaspar', 'metodologia', { salvar: nova, motivo: 'Troca do foro de eleição' });
  assert.equal(neg.ok, false);
  assert.match(neg.message, /só são alterados pela Diretoria ou pelo Administrador/);
  // o gestor salva o resto sem mexer nos termos
  const outra = JSON.parse(JSON.stringify(met.metodologia)); outra.proposta.validadeDias = 20;
  ok(amb.api('s_gaspar', 'metodologia', { salvar: outra, motivo: 'Validade padrão de 20 dias' }));
  assert.equal(amb.ctx.Com_termosVigentes_().versao, 1, 'gravar a metodologia sem mudar o texto não cria versão dos termos');
  const r = ok(amb.api('s_dora', 'metodologia', { salvar: nova, motivo: 'Troca do foro de eleição' }));
  assert.equal(r.termos.versao, 2);
  assert.equal(amb.api('s_dora', 'metodologia', { salvar: Object.assign(JSON.parse(JSON.stringify(nova)), { proposta: Object.assign({}, nova.proposta, { termos: 'curto' }) }), motivo: 'Teste de texto curto' }).ok, false);
  // a enviada continua com a versão 1 (texto de Goiânia)
  const det = ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta;
  assert.equal(det.termos.versao, 1); assert.equal(det.termos.congelado, true); assert.match(det.termos.texto, /Goiânia/);
  // aprovação registrada pelo vendedor: histórico com quem, o meio e a versão
  ok(amb.api('s_vera', 'respostaCliente', { id: p.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail pela coordenação', arquivo: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') } }));
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === p.id && h.TIPO === 'APROVADA' && /Aprovado por fora \(registro de VERA VENDEDORA TESTE\): termos e condições da contratação da versão 1 enviados no documento\./.test(h.TEXTO)));
  // proposta nova gera com a versão 2
  const p2 = proposta(amb, { escopo: '' });
  ok(amb.api('s_vera', 'concluirProposta', { id: p2.id }));
  const g2 = ok(amb.api('s_vera', 'gerarDocumento', { id: p2.id }));
  const t2 = textoDoc(amb, g2.htmlId);
  assert.match(t2, /Comarca de Anápolis, Goiás/); assert.match(t2, /versão 2\./);
});

test('item da proposta escolhe do catálogo: preço de tabela guardado, preço diferente registrado no histórico, avulso continua possível; alertas da gestora; descrição em branco não impede concluir', () => {
  const amb = ambiente();
  const prod = ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'FONTE-9V', nome: 'Fonte chaveada 9V 2A', tipo: 'PRODUTO', unidade: 'un', preco: '55,00', custo: '29,90' })).produto;
  const cat = ok(amb.api('s_vera', 'catalogo', { busca: 'fonte 9v', situacao: 'ATIVOS', limite: 8 }));
  assert.equal(cat.produtos[0].id, prod.id);
  assert.equal(cat.produtos[0].custo, undefined, 'vendedor não vê o custo');
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const s = ok(amb.api('s_vera', 'salvarProposta', { id: np.proposta.id, escopo: '', condicoes: { pagamento: 'Boleto', prazoExecucao: '10 dias' },
    itens: [{ produtoId: prod.id, descricao: 'Fonte chaveada 9V 2A', quantidade: 2, unidade: 'un', precoUnitario: '60,00' },
      { descricao: 'Instalação no local', tipo: 'SERVICO', quantidade: 1, precoUnitario: '150,00' }] }));
  const itens = JSON.parse(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === np.proposta.id).ITENS_JSON);
  assert.equal(itens[0].codigo, 'FONTE-9V'); assert.equal(itens[0].precoTabela, 55); assert.equal(itens[0].precoDiferente, true);
  assert.equal(itens[1].produtoId, ''); assert.equal(itens[1].precoDiferente, false);
  assert.equal(s.proposta.itens[0].precoDiferente, true);
  const h = amb.tabelas.COM_HISTORICO.filter((x) => x.ENTIDADE_ID === np.proposta.id && x.TIPO === 'RASCUNHO').pop();
  assert.match(h.TEXTO, /Preço diferente do catálogo: FONTE-9V \(tabela R\$ 55,00, proposta R\$ 60,00\)\./);
  assert.match(h.TEXTO, /1 item avulso \(fora do catálogo\)\./);
  const rev = amb.ctx.ComG_revisarPropostaRegras_(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === np.proposta.id));
  assert.deepEqual(Array.from(rev.erros), []);
  assert.ok(rev.alertas.some((a) => /descrição \(escopo\) está em branco/.test(a)), rev.alertas.join(' | '));
  assert.ok(rev.alertas.some((a) => /1 item avulso \(fora do catálogo de Produtos e serviços\): confira a descrição e o preço \(Instalação no local\)/.test(a)));
  assert.ok(rev.alertas.some((a) => /preço acima da tabela do catálogo em FONTE-9V/.test(a)));
  ok(amb.api('s_vera', 'concluirProposta', { id: np.proposta.id }));
  // abaixo da tabela conta como desconto na política (limite 15%): 40,00 sobre 55,00 = 27%
  const np2 = ok(amb.api('s_vera', 'novaRevisao', { id: np.proposta.id })).proposta;
  const s2 = ok(amb.api('s_vera', 'salvarProposta', { id: np2.id, itens: [{ produtoId: prod.id, descricao: 'Fonte chaveada 9V 2A', quantidade: 1, precoUnitario: '40,00' }], condicoes: { pagamento: 'Boleto', prazoExecucao: '10 dias' } }));
  assert.equal(s2.politica.dentro, false);
  // tela: a escolha do catálogo no próprio item (busca enquanto digita) e o "Tornar avulso"
  const js = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8');
  assert.match(js, /function Comercial_ligarBuscaItem_\(inp, k\)/);
  assert.match(js, /Com_chamar_\("catalogo", \{ busca: q, situacao: "ATIVOS", limite: 8 \}/);
  assert.match(js, /data-avulso=/);
  assert.match(js, /Abaixo da tabela \(/);
});

test('catálogo único: nome repetido de item ativo é recusado com o caminho; "Possíveis duplicados" mostra os repetidos do CRM; o repetido antigo continua editável', () => {
  const amb = ambiente({ tabelas: { COM_PRODUTOS: [
    { ID: 'p1', CODIGO: 'CRM-AE38B801', NOME: 'ANEL DE VEDAÇÃO PARA AUTOCLAVE', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 350, CUSTO: '', ATIVO: 'SIM', ATUALIZADO_POR_NOME: 'Importação do CRM', ATUALIZADO_EM: '2026-10-26T12:28' },
    { ID: 'p2', CODIGO: 'CRM-08F31DF6', NOME: 'Anel de vedação para autoclave', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 350, CUSTO: '', ATIVO: 'SIM', ATUALIZADO_POR_NOME: 'Importação do CRM' },
    { ID: 'p3', CODIGO: 'QT-AC', NOME: 'Qualificação térmica de autoclave', TIPO: 'SERVICO', UNIDADE_MEDIDA: 'un.', PRECO: 4500, CUSTO: '', ATIVO: 'SIM' },
    { ID: 'p4', CODIGO: 'QT-AC-OLD', NOME: 'Qualificação térmica de autoclave', TIPO: 'SERVICO', UNIDADE_MEDIDA: 'un.', PRECO: 4000, CUSTO: '', ATIVO: 'NAO' }
  ] } });
  const novo = amb.api('s_gaspar', 'salvarProduto', { codigo: 'ANEL-01', nome: 'Anel de Vedação para Autoclave', tipo: 'PRODUTO', preco: '360,00' });
  assert.equal(novo.ok, false);
  assert.match(novo.message, /já existe o item ativo "ANEL DE VEDAÇÃO PARA AUTOCLAVE" \(código CRM-AE38B801, R\$ 350,00\)\. O catálogo é um cadastro único: edite aquele item/);
  const ren = amb.api('s_gaspar', 'salvarProduto', { id: 'p3', codigo: 'QT-AC', nome: 'Anel de vedação para autoclave', tipo: 'SERVICO', preco: '4.500,00' });
  assert.equal(ren.ok, false, 'renomear para o nome de outro item ativo também é recusado');
  // o arquivado não conta; o repetido antigo do CRM continua editável sem trocar o nome
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'QT-AC-2', nome: 'Qualificação térmica de autoclave vertical', tipo: 'SERVICO', preco: '5.000,00' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { id: 'p2', codigo: 'CRM-08F31DF6', nome: 'Anel de vedação para autoclave', tipo: 'PRODUTO', preco: '355,00' }));
  const dup = ok(amb.api('s_gaspar', 'catalogo', { incluirArquivados: true, situacao: 'DUPLICADOS' }));
  assert.deepEqual(dup.produtos.map((p) => p.codigo).sort(), ['CRM-08F31DF6', 'CRM-AE38B801']);
  assert.equal(dup.duplicados, 1);
  const todos = ok(amb.api('s_gaspar', 'catalogo', { incluirArquivados: true }));
  assert.equal(todos.produtos.find((p) => p.id === 'p1').duplicado, true);
  assert.equal(todos.produtos.find((p) => p.id === 'p1').origem, 'CRM');
  assert.equal(todos.produtos.find((p) => p.id === 'p1').atualizadoEm, '26/10/2026 12:28');
  // arquivar o que sobra resolve
  ok(amb.api('s_gaspar', 'arquivarProduto', { id: 'p2', motivo: 'Repetido do CRM' }));
  assert.equal(ok(amb.api('s_gaspar', 'catalogo', { incluirArquivados: true, situacao: 'DUPLICADOS' })).produtos.length, 0);
  // vendedor não usa o filtro de duplicados (vê os ativos)
  const v = ok(amb.api('s_vera', 'catalogo', { situacao: 'DUPLICADOS' }));
  assert.ok(v.produtos.every((p) => p.ativo) && v.duplicados === 0);
});

test('envio da proposta pelo WhatsApp oficial (Meta): PDF para a Meta (/media) e o modelo sgo_documento_cliente com o PDF no cabeçalho; texto fixo; a proposta vira enviada', () => {
  const amb = ambiente({ props: { WHATSAPP_PROVEDOR: 'meta', META_WA_TOKEN: 'TOKEN-META-TESTE', META_WA_PHONE_ID: '123456' } });
  const pedidos = [];
  amb.ctx.UrlFetchApp = { fetch: (url, op) => {
    const bruto = op && op.payload;
    pedidos.push({ url, op, texto: Array.isArray(bruto) ? Buffer.from(bruto.map((b) => b & 255)).toString('latin1') : String(bruto || '') });
    if (/\/media$/.test(url)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ id: 'MIDIA-1' }) };
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.DOC1' }] }) };
  } };
  const p = proposta(amb, { escopo: 'Qualificação térmica completa da autoclave da CME, com relatório.' });
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  const g0 = ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  // o Drive simulado deste ambiente usa ids curtos e não tem tamanho nem data: completa para a janela Enviar documento
  const pdfId = 'arquivoPdfMeta1';
  amb.arquivos[pdfId] = Object.assign(amb.arquivos[g0.pdfId], { id: pdfId });
  amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id).PDF_ID = pdfId;
  const porId = amb.ctx.DriveApp.getFileById;
  amb.ctx.DriveApp.getFileById = (id) => Object.assign(porId(id), { getSize: () => amb.arquivos[id].bytes.length, getDateCreated: () => new Date() });
  const g = { pdfId };
  const prep = amb.ctx.EnviarDoc_apiPreparar('s_vera', { arquivoId: g.pdfId });
  assert.equal(prep.ok, true, prep.message);
  assert.equal(prep.canais.whatsapp.ok, true); assert.equal(prep.canais.whatsapp.provedor, 'meta');
  assert.match(prep.textos.whatsappModelo, /^Olá, \{nome\}\. A Metrolabs enviou o documento em anexo: .*PROP-2026-0001.*\n\nEm caso de dúvida, responda esta mensagem ou fale com Vera \(vera@exemplo\.test\)\.\n\nMetrolabs — SGO\+$/);
  assert.match(prep.textos.email, /termos e condições da contratação/);
  const r = amb.ctx.EnviarDoc_apiEnviar('s_vera', { pedidoId: 'pedido-meta-0001', arquivoId: g.pdfId, canais: { whatsapp: true }, destinatarios: [{ nome: 'ANA ENFERMEIRA', celular: '(62) 99999-0101' }], mensagemWhatsapp: 'texto livre que não vale para o modelo' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.enviados, 1, JSON.stringify(r.itens));
  const media = pedidos.find((x) => /graph\.facebook\.com\/v21\.0\/123456\/media$/.test(x.url));
  assert.ok(media, 'o PDF foi para a Meta');
  assert.match(media.op.contentType, /^multipart\/form-data; boundary=/);
  assert.equal(media.op.headers.Authorization, 'Bearer TOKEN-META-TESTE');
  assert.match(media.texto, /name="messaging_product"\r\n\r\nwhatsapp\r\n/);
  assert.match(media.texto, /name="file"; filename="Proposta comercial - PROP-2026-0001[^"]*\.pdf"\r\nContent-Type: application\/pdf\r\n\r\n%PDF/);
  const msg = pedidos.find((x) => /\/messages$/.test(x.url));
  const corpo = JSON.parse(msg.op.payload);
  assert.equal(corpo.to, '5562999990101');
  assert.equal(corpo.template.name, 'sgo_documento_cliente');
  assert.deepEqual(corpo.template.components[0], { type: 'header', parameters: [{ type: 'document', document: { id: 'MIDIA-1', filename: media.texto.match(/filename="([^"]+)"/)[1] } }] });
  assert.equal(corpo.template.components[1].parameters[0].text, 'Ana');
  assert.match(corpo.template.components[1].parameters[1].text, /PROP-2026-0001/);
  const linha = amb.tabelas.DOC_ENVIOS[0];
  assert.equal(linha.MODO, 'META'); assert.equal(linha.SITUACAO, 'ENVIADO'); assert.equal(linha.PROVEDOR_ID, 'wamid.DOC1');
  assert.match(linha.MENSAGEM, /^Olá, Ana\. A Metrolabs enviou o documento em anexo/);
  assert.doesNotMatch(JSON.stringify(amb.tabelas.DOC_ENVIOS), /TOKEN-META-TESTE/);
  // o registro do envio marca a proposta como enviada (mesmo caminho do e-mail)
  assert.equal(ok(amb.api('s_vera', 'sincronizarEnvios')).atualizadas, 1);
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id).SITUACAO, 'ENVIADA');
  // modelo ainda não aprovado (situação lida): a janela mostra o porquê; e a recusa da Meta vira o caminho
  amb.props.NTF_MODELOS_SITUACAO = JSON.stringify({ modelos: { sgo_documento_cliente: 'PENDING' } });
  amb.ctx.SGO_waModeloSituacao_ = (n) => JSON.parse(amb.props.NTF_MODELOS_SITUACAO).modelos[n] || '';
  const c = amb.ctx.EnviarDoc_canais_({ nome: 'Vera' }).whatsapp;
  assert.equal(c.ok, false); assert.equal(c.motivo, 'MODELO'); assert.match(c.texto, /não está aprovado na Meta \(situação: PENDING\)/); assert.match(c.texto, /envie por e-mail/);
  amb.ctx.UrlFetchApp = { fetch: (url) => (/\/media$/.test(url) ? { getResponseCode: () => 200, getContentText: () => '{"id":"M2"}' } : { getResponseCode: () => 404, getContentText: () => JSON.stringify({ error: { message: 'Template name does not exist in the translation', code: 132001 } }) }) };
  const x = amb.ctx.EnviarDoc_metaDocumento_('62999990101', { nome: 'a.pdf', mime: 'application/pdf', blob: amb.ctx.Utilities.newBlob('%PDF teste', 'application/pdf', 'a.pdf') }, ['Ana', 'Doc', 'Vera']);
  assert.equal(x.ok, false); assert.match(x.motivo, /ainda não está aprovado na Meta/); assert.match(x.motivo, /Envie por e-mail/);
});

test('cadastro do modelo com PDF no cabeçalho, ajuda e manuais atualizados (sem Z-API na janela de envio)', () => {
  const amb = ambiente();
  const def = amb.ctx.NTF_MODELOS_META.sgo_documento_cliente;
  assert.deepEqual(Array.from(amb.ctx.Notificar_validarModeloMeta_('sgo_documento_cliente', def)), []);
  assert.throws(() => amb.ctx.Notificar_corpoCadastroMeta_('sgo_documento_cliente'), /PDF de exemplo/);
  const cad = amb.ctx.Notificar_corpoCadastroMeta_('sgo_documento_cliente', { handleExemplo: '4::aGFuZGxl' });
  assert.deepEqual(JSON.parse(JSON.stringify(cad.components[0])), { type: 'HEADER', format: 'DOCUMENT', example: { header_handle: ['4::aGFuZGxl'] } });
  assert.equal(cad.category, 'UTILITY');
  assert.throws(() => amb.ctx.Notificar_montarPedidoMeta_('1', '5562999990101', 'sgo_documento_cliente', ['Ana', 'Doc', 'Vera'], ''), /arquivo não foi enviado à Meta/);
  const chaves = fs.readFileSync(path.join(pasta, 'SGO_Chaves.js'), 'utf8');
  assert.match(chaves, /function Chaves_metaHandleExemplo_\(cred\)/);
  const ajudaEnv = fs.readFileSync(path.join(pasta, 'SGO_EnviarDoc_Ajuda.js'), 'utf8');
  assert.doesNotMatch(ajudaEnv, /Z-API|base64/i, 'a ajuda da janela não fala mais em Z-API');
  assert.match(ajudaEnv, /WhatsApp oficial/);
  const manEnv = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_ENVIAR_DOCUMENTO.md'), 'utf8');
  assert.doesNotMatch(manEnv, /Z-API|base64/i);
  const ajuda = fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /Termos e condições da contratação/); assert.match(ajuda, /Tornar avulso/); assert.match(ajuda, /Possíveis duplicados/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  assert.match(man, /Termos e condições da contratação/); assert.match(man, /Possíveis duplicados/); assert.match(man, /WhatsApp oficial/);
  const base = fs.readFileSync(path.join(pasta, 'SGO_AssistenteManuais.js'), 'utf8');
  assert.match(base, /Termos e condições da contratação/, 'base do assistente regenerada');
});
